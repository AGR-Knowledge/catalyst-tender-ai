import type { Tone } from '@/data/types';
import type { Lifecycle, S5Facts } from '@/data/gcc/lifecycle';
import { ESTIMATED_SHARE_BAND, NEAR_WD, RATE_BANDS, TURNAROUND_HOURS } from '@/data/gcc/targets';
import { currentOf, tenderCtx } from '../lifecycle';
import { can } from '@/data/access';
import type { KpiCtx, KpiDef } from './types';
import { dayText, idsDrill, liveIn, qOf, rateTone, round1, tileLabel, turnaround, valueOf, wdText, wdTo } from './stages';

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

export const KPIS: KpiDef[] = [
  {
    id: 'PRC-1', label: 'Prices due', kind: 'state',
    info: {
      means: 'Prices that must be approved soon to hold the submission date',
      counted: `Stage 5 tenders whose price approval is due within ${NEAR_WD} working days, or past.`,
      target: `Orange within ${NEAR_WD} working days; red once past`, source: 'Price approval dates',
    },
    compute(ctx) {
      const list = pricesDue(ctx);
      if (!list.length) return { display: '0', sub: 'No price due this week', tone: 'green' };
      const first = list[0];
      const tone: Tone = list.some((x) => x.wd < 0) ? 'red' : 'orange';
      return { display: String(list.length), sub: `First: ${first.l.tenderId} · ${dayText(first.f.priceDue)} · ${wdText(first.wd)}`, tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Prices due'), pricesDue(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-2', label: 'Cost lines sourced', kind: 'state',
    info: {
      means: 'How much of the price rests on real quotes or proven rates rather than guesses',
      counted: 'Share of BOQ value priced from a levelled quote or a rate-library norm, across Stage 5 tenders, weighted by tender value.',
      target: '95% or more green; 85% or more orange', source: 'Cost build-up',
    },
    compute(ctx) {
      const rows = s5Of(ctx);
      if (!rows.length) return { display: 'No prices in build-up' };
      const pct = weightedShare(ctx, rows, (f) => f.sourcedPct);
      const low = [...rows].sort((a, b) => a.f.sourcedPct - b.f.sourcedPct)[0];
      return { display: `${Math.round(pct)}%`, sub: `Lowest: ${low.l.tenderId}, ${low.f.sourcedPct}%`, tone: rateTone(pct, RATE_BANDS['PRC-2']) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Cost lines sourced'), s5Of(ctx).filter((x) => x.f.sourcedPct < RATE_BANDS['PRC-2'].green).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-3', label: 'Below minimum margin', kind: 'state', cap: 'see.margin',
    info: {
      means: 'Bids priced under the margin the committee set. They need a decision, not a quiet submission',
      counted: 'Stage 5 tenders whose base-scenario margin is below the DG2 condition or the tenant floor. The sub-line shows the worst.',
      target: '0 green; any red', source: 'Pricing scenarios and DG2 conditions',
    },
    compute(ctx) {
      const list = belowMargin(ctx);
      if (!list.length) return { display: '0', sub: 'Every price clears its minimum', tone: 'green' };
      const w = list[0];
      return { display: String(list.length), sub: `${w.l.tenderId}: ${pct1(w.f.baseMarginPct)} vs ${pct1(w.f.minMarginPct)}`, tone: 'red' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Below minimum margin'), belowMargin(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-4', label: 'Estimated share', kind: 'state',
    info: {
      means: 'The part of the price nobody has quoted yet',
      counted: 'Share of BOQ value on estimated rates (no quote, no norm), across Stage 5 tenders, weighted by tender value.',
      target: `${ESTIMATED_SHARE_BAND.green}% or less green; ${ESTIMATED_SHARE_BAND.orange}% or less orange`, source: 'Cost build-up',
    },
    compute(ctx) {
      const rows = s5Of(ctx);
      if (!rows.length) return { display: 'No prices in build-up' };
      const pct = weightedShare(ctx, rows, (f) => f.estimatedPct);
      const high = [...rows].sort((a, b) => b.f.estimatedPct - a.f.estimatedPct)[0];
      const tone: Tone = pct <= ESTIMATED_SHARE_BAND.green ? 'green' : pct <= ESTIMATED_SHARE_BAND.orange ? 'orange' : 'red';
      return { display: `${pct}%`, sub: `Highest: ${high.l.tenderId}, ${high.f.estimatedPct}%`, tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Estimated share'), s5Of(ctx).filter((x) => x.f.estimatedPct > ESTIMATED_SHARE_BAND.green).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-5', label: 'Re-prices', kind: 'flow',
    info: {
      means: 'How often the price had to move, and how quickly we moved it',
      counted: 'Re-prices triggered in the period (addendum, FX, quote change), with the 90th percentile turnaround.',
      target: `p90 turnaround ${TURNAROUND_HOURS.reprice} h or less`, source: 'Pricing change log',
    },
    compute: (ctx) => turnaround(ctx, 'reprice', TURNAROUND_HOURS.reprice, 're-price'),
    drill: (ctx) => idsDrill(`From tile: Re-prices · ${ctx.window.label}`, qOf(ctx).workEventsIn(ctx.window, 'reprice').map((x) => x.l.tenderId)),
  },
  {
    id: 'PRC-6', label: 'Finance checks pending', kind: 'state',
    info: {
      means: "Prices that can't be approved until Finance confirms the costs only they know",
      counted: 'Stage 5 tenders at the finance check, waiting on Finance to confirm bonds, insurances and head-office recovery.',
      target: '0 green; any orange', source: 'Finance confirmations',
    },
    compute(ctx) {
      const list = financePending(ctx);
      if (!list.length) return { display: '0', sub: 'Nothing waiting on Finance', tone: 'green' };
      return { display: String(list.length), sub: `${list[0].l.tenderId} · price due ${dayText(list[0].f.priceDue)}`, tone: 'orange', ownerTag: 'Finance' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Finance checks pending'), financePending(ctx).map((x) => x.l.tenderId)),
  },
];
