import type { Tone } from '@/data/types';
import type { Lifecycle, S5Facts } from '@/data/gcc/lifecycle';
import { ESTIMATED_SHARE_BAND, NEAR_WD, RATE_BANDS, TURNAROUND_HOURS } from '@/data/gcc/targets';
import { currentOf, tenderCtx } from '../lifecycle';
import { can } from '@/data/access';
import type { KpiCtx, KpiDef, KpiResult } from './types';
import { dayText, hoursShort, idsDrill, liveIn, nearestRank, plural, qOf, rateTone, round1, tileLabel, turnaround, valueOf, wdText, wdTo } from './stages';

/**
 * Stage 5 · Pricing (plan 013 Phase 2.5, dashboards.md §10.8 and §11.3).
 * Shares of BOQ value are weighted by each tender's value in the tenant
 * currency. PRC-3 reveals margins, so it is masked without `see.margin`.
 */

type S5 = { l: Lifecycle; f: S5Facts };

export const s5Of = (ctx: KpiCtx): S5[] => liveIn(ctx, 5).flatMap((l) => (l.facts?.stage === 5 ? [{ l, f: l.facts }] : []));

export const pricesDue = (ctx: KpiCtx) => s5Of(ctx)
  .filter((x) => currentOf(x.l).step !== 'price-approved')
  .map((x) => ({ ...x, wd: wdTo(ctx.tenant, x.l, x.f.priceDue) }))
  .filter((x) => x.wd <= NEAR_WD)
  .sort((a, b) => a.f.priceDue.localeCompare(b.f.priceDue));

/** Margin is checked tender by tender: the tile's `cap` alone passes a Bid Manager for every tender. */
export const belowMargin = (ctx: KpiCtx) => s5Of(ctx).filter((x) => x.f.baseMarginPct < x.f.minMarginPct && can(ctx.viewer, 'see.margin', tenderCtx(ctx.tenant, x.l)).ok)
  .sort((a, b) => (a.f.baseMarginPct - a.f.minMarginPct) - (b.f.baseMarginPct - b.f.minMarginPct));

/** Waiting on Finance: at the finance-check step with the check still pending. */
export const financePending = (ctx: KpiCtx) => s5Of(ctx).filter((x) => currentOf(x.l).step === 'finance-check' && x.f.financeCheck === 'pending');

/** Σ share × value ÷ Σ value. */
function weightedShare(ctx: KpiCtx, rows: S5[], pick: (f: S5Facts) => number): number {
  const total = rows.reduce((s, x) => s + valueOf(ctx.tenant, x.l), 0);
  return total ? round1(rows.reduce((s, x) => s + pick(x.f) * valueOf(ctx.tenant, x.l), 0) / total) : 0;
}

const pct1 = (n: number) => `${n.toFixed(1)}%`;

/** "12 Mar": a reference line's date, without the weekday. */
const dm = (iso: string) => dayText(iso).replace(/^\w{3} /, '');

/** A due date's tile lines: the first tender and its date, then the working days left (or how late the worst is). */
const dueSplit = (tenderId: string, due: string, wd: number): Pick<KpiResult, 'detail' | 'ref'> => ({
  detail: `${tenderId} · ${dm(due)}`,
  ref: wd < 0 ? { k: 'Worst', v: wdText(wd) } : { k: 'Time left', v: wdText(wd) },
});

/** A turnaround tile's lines (`turnaround` in ./stages): the p90 in the period, against its target, which stays with none in the period. */
function turnSplit(ctx: KpiCtx, kind: 'replan' | 'reprice', target: number, none: string): Pick<KpiResult, 'detail' | 'ref'> {
  const list = qOf(ctx).workEventsIn(ctx.window, kind);
  const p90 = nearestRank(list.map((x) => x.e.turnaroundH), 90);
  return { detail: p90 === null ? none : `p90 turnaround ${hoursShort(p90)}`, ref: { k: 'Target', v: hoursShort(target) } };
}

export const KPIS: KpiDef[] = [
  {
    id: 'PRC-1', label: 'Prices due', kind: 'state',
    info: {
      means: 'Prices that must be approved soon to keep the submission date.',
      counted: `Tenders in Pricing whose price approval is due within ${NEAR_WD} working days, or is past.`,
      target: 'None late',
      source: 'Price approval dates',
    },
    compute(ctx) {
      const list = pricesDue(ctx);
      if (!list.length) return { display: '0', sub: 'No price due this week', detail: 'No price due this week', ref: { k: 'Next', v: 'None' }, tone: 'green' };
      const first = list[0];
      const tone: Tone = list.some((x) => x.wd < 0) ? 'red' : 'orange';
      return { display: String(list.length), sub: `First: ${first.l.tenderId} · ${dayText(first.f.priceDue)} · ${wdText(first.wd)}`, ...dueSplit(first.l.tenderId, first.f.priceDue, first.wd), tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Prices due'), pricesDue(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-2', label: 'Cost lines sourced', kind: 'state',
    info: {
      means: 'How much of the price rests on real quotes or proven rates rather than estimates.',
      counted: 'The share of the bill of quantities, by value, priced from a quote or a proven rate, across tenders in Pricing.',
      target: `${RATE_BANDS['PRC-2'].green}% or more`,
      source: 'Cost build-up',
    },
    compute(ctx) {
      const rows = s5Of(ctx);
      if (!rows.length) return { display: 'No prices in build-up', detail: 'No bids in pricing', ref: { k: 'Worst', v: 'None' } };
      const pct = weightedShare(ctx, rows, (f) => f.sourcedPct);
      const low = [...rows].sort((a, b) => a.f.sourcedPct - b.f.sourcedPct)[0];
      return { display: `${Math.round(pct)}%`, sub: `Lowest: ${low.l.tenderId}, ${low.f.sourcedPct}%`, detail: `Across ${plural(rows.length, 'tender')}`, ref: { k: 'Worst', v: `${low.l.tenderId}, ${low.f.sourcedPct}%` }, tone: rateTone(pct, RATE_BANDS['PRC-2']) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Cost lines sourced'), s5Of(ctx).filter((x) => x.f.sourcedPct < RATE_BANDS['PRC-2'].green).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-3', label: 'Below minimum margin', kind: 'state', cap: 'see.margin',
    info: {
      means: 'Bids priced under the margin the committee set. They need a decision, not a quiet submission.',
      counted: 'Tenders in Pricing whose base price gives a margin below the DG2 condition or the company floor.',
      target: 'None',
      source: 'Price scenarios and DG2 conditions',
    },
    compute(ctx) {
      const list = belowMargin(ctx);
      if (!list.length) return { display: '0', sub: 'Every price clears its minimum', detail: 'All clear their minimum', ref: { k: 'Worst', v: 'None' }, tone: 'green' };
      const w = list[0];
      return { display: String(list.length), sub: `${w.l.tenderId}: ${pct1(w.f.baseMarginPct)} vs ${pct1(w.f.minMarginPct)}`, detail: `${pct1(w.f.baseMarginPct)} vs ${pct1(w.f.minMarginPct)} minimum`, ref: { k: 'Worst', v: w.l.tenderId }, tone: 'red' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Below minimum margin'), belowMargin(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-4', label: 'Estimated share', kind: 'state',
    info: {
      means: 'The part of the price nobody has quoted yet. The bigger it is, the bigger the guess.',
      counted: 'The share of the bill of quantities, by value, on estimated rates with neither a quote nor a proven rate, across tenders in Pricing.',
      target: `${ESTIMATED_SHARE_BAND.green}% or less`,
      source: 'Cost build-up',
    },
    compute(ctx) {
      const rows = s5Of(ctx);
      if (!rows.length) return { display: 'No prices in build-up', detail: 'No bids in pricing', ref: { k: 'Worst', v: 'None' } };
      const pct = weightedShare(ctx, rows, (f) => f.estimatedPct);
      const high = [...rows].sort((a, b) => b.f.estimatedPct - a.f.estimatedPct)[0];
      const tone: Tone = pct <= ESTIMATED_SHARE_BAND.green ? 'green' : pct <= ESTIMATED_SHARE_BAND.orange ? 'orange' : 'red';
      return { display: `${pct}%`, sub: `Highest: ${high.l.tenderId}, ${high.f.estimatedPct}%`, detail: `Across ${plural(rows.length, 'tender')}`, ref: { k: 'Worst', v: `${high.l.tenderId}, ${high.f.estimatedPct}%` }, tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Estimated share'), s5Of(ctx).filter((x) => x.f.estimatedPct > ESTIMATED_SHARE_BAND.green).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-5', label: 'Re-prices', kind: 'flow',
    info: {
      means: 'How often a price had to move, and how quickly we moved it.',
      counted: 'Price changes started in the period (an addendum, an exchange rate, a quote change), and the turnaround of the slowest one in ten.',
      target: `Turned round in ${TURNAROUND_HOURS.reprice} hours or less`,
      source: 'Pricing change log',
    },
    compute: (ctx) => ({ ...turnaround(ctx, 'reprice', TURNAROUND_HOURS.reprice, 're-price'), ...turnSplit(ctx, 'reprice', TURNAROUND_HOURS.reprice, 'No price changes') }),
    drill: (ctx) => idsDrill(`From tile: Re-prices · ${ctx.window.label}`, qOf(ctx).workEventsIn(ctx.window, 'reprice').map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-6', label: 'Finance checks pending', kind: 'state',
    info: {
      means: 'Prices that cannot be approved until Finance confirms the costs only Finance knows.',
      counted: 'Tenders in Pricing waiting for Finance to confirm bonds, insurance and head-office costs.',
      target: 'None waiting',
      source: 'Finance confirmations',
    },
    compute(ctx) {
      const list = financePending(ctx);
      if (!list.length) return { display: '0', sub: 'Nothing waiting on Finance', detail: 'None waiting on Finance', ref: { k: 'Target', v: '0' }, tone: 'green' };
      return { display: String(list.length), sub: `${list[0].l.tenderId} · price due ${dayText(list[0].f.priceDue)}`, detail: `${list[0].l.tenderId} · due ${dm(list[0].f.priceDue)}`, ref: { k: 'Target', v: '0' }, tone: 'orange', ownerTag: 'Finance' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Finance checks pending'), financePending(ctx).map((x) => x.l.tenderId)),
  },
];
