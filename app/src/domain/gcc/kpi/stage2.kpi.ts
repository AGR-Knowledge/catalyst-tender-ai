import type { Tone } from '@/data/types';
import type { Lifecycle, S2Facts, S4Facts } from '@/data/gcc/lifecycle';
import { hoursBetween, plusHours } from '@/data/gcc/lifecycle/chain';
import { standingGate } from '@/domain/gcc/lifecycle';
import { TURNAROUND_HOURS } from '@/data/gcc/targets';
import { slaState } from '../clock';
import { inWindow } from '../period';
import { atOrPast, entriesInto, idsDrill, isSmall, liveIn, pctOf, plural, qOf, rateTone, scopeStage, STAGE_BANDS, tileLabel } from './stages';
import type { KpiCtx, KpiDef } from './types';

/**
 * Stage 2 · Sourcing (plan 013 Phase 2.2, dashboards.md §10.5), from 017's
 * Stage 2 step facts (interim summaries until plan 008b derives them from the
 * RFQ records). SRC-9 lives here too and is counted over the dashboard's own
 * stage, so Stage 4 reuses it. ⓘ texts: plain English, rewritten in plan 040.
 */

type S2 = { l: Lifecycle; f: S2Facts };

export const s2Of = (ctx: KpiCtx): S2[] => liveIn(ctx, 2).flatMap((l) => (l.facts?.stage === 2 ? [{ l, f: l.facts }] : []));

/** The DG1 Pursue that stands now: a re-opened one doesn't (`standingGate`). */
const pursueOf = (l: Lifecycle) => { const g = standingGate(l, 'DG1'); return g?.decision === 'pursue' ? g : undefined; };

/** Live tenders pursued less than 24 h ago whose RFQs are not all out yet: the clock is running. */
export function clockRunning(ctx: KpiCtx) {
  const limit = TURNAROUND_HOURS.rfqsAfterDg1;
  return liveIn(ctx, 2)
    .flatMap((l) => {
      const p = pursueOf(l);
      return p && hoursBetween(p.at, ctx.now) < limit && !atOrPast(l, 2, 'rfqs-out') ? [{ l, start: p.at, end: plusHours(p.at, limit) }] : [];
    })
    .sort((a, b) => a.end.localeCompare(b.end));
}

/** Tenders whose RFQs went out in the window, and whether that was within 24 h of Pursue. */
function sentIn(ctx: KpiCtx) {
  return qOf(ctx).all().flatMap((l) => {
    const p = pursueOf(l);
    const e = entriesInto(l, 2, 'rfqs-out').find((x) => inWindow(x.at, ctx.window));
    return p && e ? [{ l, onTime: hoursBetween(p.at, e.at) <= TURNAROUND_HOURS.rfqsAfterDg1 }] : [];
  });
}

const ids = (xs: { l: Lifecycle }[]) => xs.map((x) => x.l.tenderId);

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a: about 24 characters), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 24) ?? options[options.length - 1];

/** "On T-2026-104", "Across 3 tenders": a lower-case sub-line clause as a line of its own. */
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

export const KPIS: KpiDef[] = [
  {
    // Flow: with no clock running it reads the period's trailing rate.
    id: 'SRC-1', label: 'RFQ clock', kind: 'flow',
    info: {
      means: `Whether quote requests go to suppliers within ${TURNAROUND_HOURS.rfqsAfterDg1} hours of deciding to pursue. Late requests mean late quotes and a guessed price.`,
      counted: `For a tender pursued in the last ${TURNAROUND_HOURS.rfqsAfterDg1} hours with requests still unsent, the time left; otherwise the share of tenders whose requests all went out in time.`,
      target: `All within ${TURNAROUND_HOURS.rfqsAfterDg1} hours`,
      source: 'Pursue decisions and quote requests',
    },
    compute(ctx) {
      const live = clockRunning(ctx);
      if (live.length) {
        const first = live[0];
        const s = slaState(first.start, first.end, ctx.now);
        const f = first.l.facts?.stage === 2 ? first.l.facts : null;
        return {
          display: s.breached ? s.text : s.text.replace(/ of .*$/, ''), tone: s.tone,
          sub: `${first.l.tenderId} · ${f?.rfqs.total ? `${f.rfqs.sent} of ${f.rfqs.total} RFQs sent` : 'packages being set up'}${live.length > 1 ? ` · ${live.length - 1} more running` : ''}`,
          detail: f?.rfqs.total ? `${f.rfqs.sent} of ${f.rfqs.total} RFQs sent` : 'Packages being set up',
          ref: { k: 'Next', v: first.l.tenderId },
        };
      }
      const sent = sentIn(ctx);
      // The target is every tender's RFQs out within 24 h: the same line whether or not any went out.
      const target = { k: 'Target', v: '100%' };
      if (!sent.length) return { display: 'No RFQs sent in this period', sub: 'No tender is on the 24 h clock now', detail: 'None on the 24 h clock', ref: target };
      const on = sent.filter((x) => x.onTime).length;
      const pct = pctOf(on, sent.length);
      return {
        display: `${pct}%`, sub: `RFQs within 24 h of DG1 · ${on} of ${sent.length}`, detail: `${on} of ${sent.length} within 24 h`, ref: target, n: sent.length,
        ...(isSmall(sent.length) ? { smallSample: true } : { tone: pct === 100 ? 'green' as const : 'orange' as const }),
      };
    },
    drill: (ctx) => {
      const live = clockRunning(ctx);
      return live.length ? idsDrill(tileLabel(ctx, 'RFQ clock running'), ids(live)) : idsDrill(`From tile: RFQs sent · ${ctx.window.label}`, ids(sentIn(ctx)));
    },
  },
  {
    id: 'SRC-2', label: 'Packages covered', kind: 'state',
    info: {
      means: 'Work packages with at least three comparable quotes, or an accepted gap. Without them the price rests on guesses.',
      counted: 'Covered packages out of all packages, on tenders in Sourcing whose quotes have started to arrive.',
      target: 'Every package',
      source: 'Packages and quotes',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const quoted = all.filter((x) => atOrPast(x.l, 2, 'quotes-in'));
      const waiting = all.length - quoted.length;
      const more = waiting ? ` · ${waiting} awaiting quotes` : '';
      if (!quoted.length) {
        return {
          display: all.length ? 'No quotes in yet' : 'No tenders in sourcing', ref: { k: 'Worst', v: 'None' },
          ...(all.length ? { sub: `${plural(all.length, 'tender')} with RFQs out`, detail: `${plural(all.length, 'tender')} with RFQs out` } : { detail: 'No packages to cover' }),
        };
      }
      const covered = quoted.reduce((s, x) => s + x.f.packages.covered, 0);
      const total = quoted.reduce((s, x) => s + x.f.packages.total, 0);
      const least = [...quoted].sort((a, b) => a.f.packages.covered / a.f.packages.total - b.f.packages.covered / b.f.packages.total)[0];
      const pct = pctOf(covered, total);
      return {
        display: `${pct}%`, sub: `${least.l.tenderId}: ${least.f.packages.covered} of ${least.f.packages.total}${more}`, tone: rateTone(pct, STAGE_BANDS.covered),
        detail: fit(`${covered} of ${total} packages${more}`, `${covered} of ${total} packages`),
        ref: { k: 'Worst', v: `${least.l.tenderId}, ${least.f.packages.covered} of ${least.f.packages.total}` },
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Packages covered'), ids(s2Of(ctx).filter((x) => x.f.packages.covered < x.f.packages.total && atOrPast(x.l, 2, 'quotes-in')))),
  },
  {
    id: 'SRC-3', label: 'Replies on time', kind: 'state',
    info: {
      means: 'How reliably suppliers answer our quote requests by the reply date.',
      counted: 'Requests answered with a quote or a decline by their reply date, out of those whose reply date has passed.',
      target: `${STAGE_BANDS.repliesOnTime.green}% or more`,
      source: 'Quote requests',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const due = all.reduce((s, x) => s + x.f.rfqs.dueSoFar, 0);
      const ref = { k: 'Target', v: `${STAGE_BANDS.repliesOnTime.green}%` };
      if (!due) return { display: 'No replies due yet', ref, ...(all.length ? { sub: 'Reply dates are still ahead', detail: 'Reply dates still ahead' } : { detail: 'No tenders in sourcing' }) };
      const on = all.reduce((s, x) => s + x.f.rfqs.answeredOnTime, 0);
      const pct = pctOf(on, due);
      return { display: `${pct}%`, sub: `${on} of ${due} replies by their date`, detail: fit(`${on} of ${due} replies by their date`, `${on} of ${due} by their date`), ref, tone: rateTone(pct, STAGE_BANDS.repliesOnTime), n: due };
    },
  },
  {
    id: 'SRC-4', label: 'Overdue RFQs', kind: 'state',
    info: {
      means: 'Quote requests past their reply date with no answer. The AI chases them; the ones it escalates need you.',
      counted: 'Requests on tenders in Sourcing past their reply date with neither a quote nor a decline.',
      target: 'None escalated',
      source: 'Quote requests',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const overdue = all.reduce((s, x) => s + x.f.rfqs.overdue, 0);
      const escalated = all.reduce((s, x) => s + x.f.rfqs.escalated, 0);
      const tone: Tone = !overdue ? 'green' : escalated ? 'red' : 'orange';
      return { display: String(overdue), sub: `${escalated} escalated`, detail: `${escalated} escalated`, ref: { k: 'Target', v: '0' }, tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Overdue RFQs'), ids(s2Of(ctx).filter((x) => x.f.rfqs.overdue > 0))),
  },
  {
    id: 'SRC-5', label: 'Open clarifications', kind: 'state',
    info: {
      means: 'Supplier questions we have not answered yet. An old one holds up a quote.',
      counted: 'Supplier questions not yet answered on tenders in Sourcing; old means past the time limit for an answer.',
      target: 'None old',
      source: 'Clarification log',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const open = all.reduce((s, x) => s + x.f.clarifications.open, 0);
      const stale = all.reduce((s, x) => s + x.f.clarifications.stale, 0);
      return { display: String(open), sub: `${stale} stale`, detail: `${stale} stale`, ref: { k: 'Target', v: '0 stale' }, tone: stale ? 'red' : 'green' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Open clarifications'), ids(s2Of(ctx).filter((x) => x.f.clarifications.open > 0))),
  },
  {
    id: 'SRC-6', label: 'To level', kind: 'state',
    info: {
      means: 'Quotes with adjustments (currency, VAT, delivery terms, exclusions) that a buyer must confirm before they can be compared.',
      counted: 'Quotes on tenders in Sourcing whose adjustments the AI proposed and no buyer has confirmed yet.',
      target: 'No target',
      source: 'Quote levelling',
    },
    compute(ctx) {
      const withQuotes = s2Of(ctx).filter((x) => x.f.toLevel > 0);
      const n = withQuotes.reduce((s, x) => s + x.f.toLevel, 0);
      // Information: the agent proposes each adjustment and a buyer confirms it (the ⓘ), so the line says who they wait on.
      if (!n) return { display: '0', sub: 'Every quote is confirmed', detail: 'Every quote is confirmed', ref: { k: 'Waiting on', v: 'None' } };
      const sub = withQuotes.length === 1 ? `on ${withQuotes[0].l.tenderId}` : `across ${plural(withQuotes.length, 'tender')}`;
      return { display: String(n), sub, detail: cap(sub), ref: { k: 'Waiting on', v: 'A buyer' } };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'To level'), ids(s2Of(ctx).filter((x) => x.f.toLevel > 0))),
  },
  {
    id: 'SRC-9', label: 'Long-lead at risk', kind: 'state',
    info: {
      means: 'Packages where even the best quote cannot deliver in time for the programme.',
      counted: 'Packages whose best compliant quote delivers later than the programme needs it, on this dashboard’s live tenders.',
      target: 'None',
      source: 'Quotes and programme dates',
    },
    compute(ctx) {
      const n = scopeStage(ctx) ?? 4;
      const rows = liveIn(ctx, n).flatMap((l) => (l.facts?.stage === 4 ? [{ l, f: l.facts as S4Facts }] : []));
      const total = rows.reduce((s, x) => s + x.f.longLeadAtRisk, 0);
      if (!total) {
        const sub = rows.length ? 'Every package can arrive in time' : 'No programmes in this stage';
        return { display: '0', sub, detail: fit(sub, rows.length ? 'All arrive in time' : 'No programmes here'), ref: { k: 'Worst', v: 'None' }, tone: 'green' };
      }
      const worst = [...rows].sort((a, b) => b.f.longLeadAtRisk - a.f.longLeadAtRisk)[0];
      const affected = rows.filter((x) => x.f.longLeadAtRisk > 0).length;
      return {
        display: String(total), sub: `Most: ${worst.l.tenderId}, ${plural(worst.f.longLeadAtRisk, 'package')}`, tone: 'red',
        detail: `Across ${plural(affected, 'tender')}`, ref: { k: 'Worst', v: `${worst.l.tenderId}, ${worst.f.longLeadAtRisk}` },
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Long-lead at risk'), liveIn(ctx, scopeStage(ctx) ?? 4).filter((l) => l.facts?.stage === 4 && l.facts.longLeadAtRisk > 0).map((l) => l.tenderId)),
  },
];
