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
 * stage, so Stage 4 reuses it. ⓘ texts are dashboards.md §11.9, verbatim.
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

export const KPIS: KpiDef[] = [
  {
    // Flow: with no clock running it reads the period's trailing rate.
    id: 'SRC-1', label: 'RFQ clock', kind: 'flow',
    info: {
      means: 'Time left to send every RFQ for tenders pursued in the last 24 hours, against the 24 h target',
      counted: 'While a tender pursued in the last 24 hours still has RFQs to send, the time left on the first. Otherwise the share of tenders whose RFQs went out within 24 h of Pursue, in the period.',
      target: '100% within 24 h. Orange under 6 h left with RFQs unsent; red once breached', source: 'DG1 times and RFQ send times',
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
        };
      }
      const sent = sentIn(ctx);
      if (!sent.length) return { display: 'No RFQs sent in this period', sub: 'No tender is on the 24 h clock now' };
      const on = sent.filter((x) => x.onTime).length;
      const pct = pctOf(on, sent.length);
      return {
        display: `${pct}%`, sub: `RFQs within 24 h of DG1 · ${on} of ${sent.length}`, n: sent.length,
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
      means: 'Packages with at least three compliant, levelled quotes (or an accepted gap). Only comparable quotes count',
      counted: 'Covered packages ÷ packages, across live Stage 2 tenders whose quotes have started to come in. The sub-line names the least covered.',
      target: '100% green; 70% or more orange; under 70% red', source: 'Packages, quotes and levelling results',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const quoted = all.filter((x) => atOrPast(x.l, 2, 'quotes-in'));
      const waiting = all.length - quoted.length;
      const more = waiting ? ` · ${waiting} awaiting quotes` : '';
      if (!quoted.length) return { display: all.length ? 'No quotes in yet' : 'No tenders in sourcing', sub: all.length ? `${plural(all.length, 'tender')} with RFQs out` : undefined };
      const covered = quoted.reduce((s, x) => s + x.f.packages.covered, 0);
      const total = quoted.reduce((s, x) => s + x.f.packages.total, 0);
      const least = [...quoted].sort((a, b) => a.f.packages.covered / a.f.packages.total - b.f.packages.covered / b.f.packages.total)[0];
      const pct = pctOf(covered, total);
      return { display: `${pct}%`, sub: `${least.l.tenderId}: ${least.f.packages.covered} of ${least.f.packages.total}${more}`, tone: rateTone(pct, STAGE_BANDS.covered) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Packages covered'), ids(s2Of(ctx).filter((x) => x.f.packages.covered < x.f.packages.total && atOrPast(x.l, 2, 'quotes-in')))),
  },
  {
    id: 'SRC-3', label: 'Replies on time', kind: 'state',
    info: {
      means: 'RFQs answered, with a quote or a decline, by their reply date',
      counted: 'RFQs answered by their reply date ÷ RFQs whose reply date has passed, on live Stage 2 tenders.',
      target: '80% or more green; 60% or more orange', source: 'RFQ records',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const due = all.reduce((s, x) => s + x.f.rfqs.dueSoFar, 0);
      if (!due) return { display: 'No replies due yet', sub: all.length ? 'Reply dates are still ahead' : undefined };
      const on = all.reduce((s, x) => s + x.f.rfqs.answeredOnTime, 0);
      const pct = pctOf(on, due);
      return { display: `${pct}%`, sub: `${on} of ${due} replies by their date`, tone: rateTone(pct, STAGE_BANDS.repliesOnTime), n: due };
    },
  },
  {
    id: 'SRC-4', label: 'Overdue RFQs', kind: 'state',
    info: {
      means: 'RFQs past their reply date with no answer. The agent chases; escalated ones need you',
      counted: 'RFQs on live Stage 2 tenders past their reply date without a quote or a decline. Escalated ones are in the sub-line.',
      target: '0 green; any escalated red', source: 'RFQ records',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const overdue = all.reduce((s, x) => s + x.f.rfqs.overdue, 0);
      const escalated = all.reduce((s, x) => s + x.f.rfqs.escalated, 0);
      const tone: Tone = !overdue ? 'green' : escalated ? 'red' : 'orange';
      return { display: String(overdue), sub: `${escalated} escalated`, tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Overdue RFQs'), ids(s2Of(ctx).filter((x) => x.f.rfqs.overdue > 0))),
  },
  {
    id: 'SRC-5', label: 'Open clarifications', kind: 'state',
    info: {
      means: 'Supplier questions not yet answered. Stale ones hold up quotes',
      counted: 'Supplier clarifications not yet answered on live Stage 2 tenders. Stale means past the answer SLA.',
      target: '0 stale green; any stale red', source: 'Clarification log',
    },
    compute(ctx) {
      const all = s2Of(ctx);
      const open = all.reduce((s, x) => s + x.f.clarifications.open, 0);
      const stale = all.reduce((s, x) => s + x.f.clarifications.stale, 0);
      return { display: String(open), sub: `${stale} stale`, tone: stale ? 'red' : 'green' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Open clarifications'), ids(s2Of(ctx).filter((x) => x.f.clarifications.open > 0))),
  },
  {
    id: 'SRC-6', label: 'To level', kind: 'state',
    info: {
      means: 'Quotes with adjustments (currency, VAT, delivery terms, exclusions) that a buyer must confirm before they count',
      counted: 'Quotes on live Stage 2 tenders whose adjustments the agent proposed and a buyer has not yet confirmed.',
      target: 'None (information)', source: 'Levelling records',
    },
    compute(ctx) {
      const withQuotes = s2Of(ctx).filter((x) => x.f.toLevel > 0);
      const n = withQuotes.reduce((s, x) => s + x.f.toLevel, 0);
      if (!n) return { display: '0', sub: 'Every quote is confirmed' };
      return { display: String(n), sub: withQuotes.length === 1 ? `on ${withQuotes[0].l.tenderId}` : `across ${plural(withQuotes.length, 'tender')}` };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'To level'), ids(s2Of(ctx).filter((x) => x.f.toLevel > 0))),
  },
  {
    id: 'SRC-9', label: 'Long-lead at risk', kind: 'state',
    info: {
      means: "Packages where the best compliant quote can't deliver in time for the programme",
      counted: "Packages whose best compliant quote's lead time is later than the programme needs, across the live tenders of this dashboard's stage.",
      target: '0 green; any red', source: 'Levelled quotes and package need-by dates',
    },
    compute(ctx) {
      const n = scopeStage(ctx) ?? 4;
      const rows = liveIn(ctx, n).flatMap((l) => (l.facts?.stage === 4 ? [{ l, f: l.facts as S4Facts }] : []));
      const total = rows.reduce((s, x) => s + x.f.longLeadAtRisk, 0);
      if (!total) return { display: '0', sub: rows.length ? 'Every package can arrive in time' : 'No programmes in this stage', tone: 'green' };
      const worst = [...rows].sort((a, b) => b.f.longLeadAtRisk - a.f.longLeadAtRisk)[0];
      return { display: String(total), sub: `Most: ${worst.l.tenderId}, ${plural(worst.f.longLeadAtRisk, 'package')}`, tone: 'red' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Long-lead at risk'), liveIn(ctx, scopeStage(ctx) ?? 4).filter((l) => l.facts?.stage === 4 && l.facts.longLeadAtRisk > 0).map((l) => l.tenderId)),
  },
];
