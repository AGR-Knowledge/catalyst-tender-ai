import type { Tone } from '@/data/types';
import type { Lifecycle, S4Facts } from '@/data/gcc/lifecycle';
import { NEAR_WD, RATE_BANDS, TURNAROUND_HOURS } from '@/data/gcc/targets';
import type { KpiCtx, KpiDef, KpiResult } from './types';
import { dayText, dueInWindow, hoursShort, idsDrill, liveIn, nearestRank, onTimeRate, qOf, tileLabel, turnaround, wdText, wdTo } from './stages';

/**
 * Stage 4 · Planning (plan 013 Phase 2.4, dashboards.md §10.7 and §11.2).
 * SRC-9 (Long-lead at risk) is defined with Stage 2 and counted over this
 * dashboard's stage. ⓘ texts are dashboards.md §11.2, verbatim.
 */

type S4 = { l: Lifecycle; f: S4Facts };

export const s4Of = (ctx: KpiCtx): S4[] => liveIn(ctx, 4).flatMap((l) => (l.facts?.stage === 4 ? [{ l, f: l.facts }] : []));

/** Baselines not yet released that are due within 5 working days, or past. */
export const baselinesDue = (ctx: KpiCtx) => s4Of(ctx)
  .filter((x) => x.l.log[x.l.log.length - 1].step !== 'released')
  .map((x) => ({ ...x, wd: wdTo(ctx.tenant, x.l, x.f.baselineDue) }))
  .filter((x) => x.wd <= NEAR_WD)
  .sort((a, b) => a.f.baselineDue.localeCompare(b.f.baselineDue));

export const overTime = (ctx: KpiCtx) => s4Of(ctx).filter((x) => x.f.durationPlannedM > x.f.durationRequiredM)
  .sort((a, b) => (b.f.durationPlannedM - b.f.durationRequiredM) - (a.f.durationPlannedM - a.f.durationRequiredM));

/** Stage 4–8 tenders whose peak key resources overlap another bid's (the Stage 4 facts carry the clash). */
const clashes = (ctx: KpiCtx) => qOf(ctx).live().flatMap((l) => (l.facts?.stage === 4 && l.facts.clashWith ? [{ l, with: l.facts.clashWith }] : []));

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a: about 24 characters), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 24) ?? options[options.length - 1];

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
    id: 'PLN-1', label: 'Baselines due', kind: 'state',
    info: {
      means: 'Programmes that must be released soon so pricing and the proposal can use them',
      counted: `Stage 4 tenders whose baseline release date is ${NEAR_WD} working days away or less, or past.`,
      target: `Orange within ${NEAR_WD} working days; red once past`, source: 'Programme baselines',
    },
    compute(ctx) {
      const list = baselinesDue(ctx);
      if (!list.length) return { display: '0', sub: 'No baseline due this week', detail: 'None due this week', ref: { k: 'Next', v: 'None' }, tone: 'green' };
      const first = list[0];
      const tone: Tone = list.some((x) => x.wd < 0) ? 'red' : 'orange';
      return { display: String(list.length), sub: `First: ${first.l.tenderId} · ${dayText(first.f.baselineDue)} · ${wdText(first.wd)}`, ...dueSplit(first.l.tenderId, first.f.baselineDue, first.wd), tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Baselines due'), baselinesDue(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PLN-2', label: 'Programme over time', kind: 'state',
    info: {
      means: 'Our programme is longer than the employer allows. Either re-sequence, or the bid needs a qualification the committee has seen',
      counted: "Stage 4 tenders whose planned duration is longer than the employer's required duration.",
      target: '0 green; any red', source: 'Programme baselines',
    },
    compute(ctx) {
      const list = overTime(ctx);
      if (!list.length) return { display: '0', sub: 'Every programme fits the time allowed', detail: 'All fit the time allowed', ref: { k: 'Worst', v: 'None' }, tone: 'green' };
      const w = list[0];
      return { display: String(list.length), sub: `${w.l.tenderId}: ${w.f.durationPlannedM} vs ${w.f.durationRequiredM} months`, detail: `${w.f.durationPlannedM} vs ${w.f.durationRequiredM} months`, ref: { k: 'Worst', v: w.l.tenderId }, tone: 'red' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Programme over time'), overTime(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PLN-4', label: 'Resource clashes', kind: 'state',
    info: {
      means: 'Two bids planning on the same people or plant at the same time. One of the programmes will not hold',
      counted: 'Stage 4–8 tenders whose peak key resources (named people, cranes, TBMs) overlap with another bid or a live project in the same weeks.',
      target: '0 green; any orange', source: 'Resource-loaded programmes',
    },
    compute(ctx) {
      const list = clashes(ctx);
      if (!list.length) return { display: '0', sub: 'No two bids need the same people or plant', detail: 'No two bids clash', ref: { k: 'Target', v: '0' }, tone: 'green' };
      return { display: String(list.length), sub: `${list[0].l.tenderId} with ${list[0].with}`, detail: fit(`${list[0].l.tenderId} with ${list[0].with}`, `With ${list[0].with}`), ref: { k: 'Target', v: '0' }, tone: 'orange' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Resource clashes'), clashes(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PLN-5', label: 'Re-plans', kind: 'flow',
    info: {
      means: 'How often the programme had to change, and how fast we turned it round',
      counted: 'Re-plans triggered in the period (addendum, quote lead time, scope change), with the 90th percentile turnaround.',
      target: `p90 turnaround ${TURNAROUND_HOURS.replan} h or less`, source: 'Programme change log',
    },
    compute: (ctx) => ({ ...turnaround(ctx, 'replan', TURNAROUND_HOURS.replan, 're-plan'), ...turnSplit(ctx, 'replan', TURNAROUND_HOURS.replan, 'No programme changes') }),
    drill: (ctx) => idsDrill(`From tile: Re-plans · ${ctx.window.label}`, qOf(ctx).workEventsIn(ctx.window, 'replan').map((x) => x.l.tenderId)),
  },
  {
    id: 'PLN-6', label: 'M2 on time', kind: 'flow',
    info: {
      means: 'M2 is the checkpoint where the programme and the price agree. A late M2 means pricing on an old programme',
      counted: 'M2 reconciliations due in the period that were completed by their planned date ÷ M2 reconciliations due in the period.',
      target: '100% green; 80% or more orange', source: 'M2 reconciliation records',
    },
    compute: (ctx) => {
      const r = onTimeRate(dueInWindow(ctx, 'm2'), 'No M2 due in this period', RATE_BANDS['PLN-6'], 'by their date');
      return { ...r, detail: r.sub ?? 'No M2 checkpoint due', ref: { k: 'Target', v: `${RATE_BANDS['PLN-6'].green}%` } };
    },
    drill: (ctx) => idsDrill(`From tile: M2 due · ${ctx.window.label}`, dueInWindow(ctx, 'm2').map((x) => x.l.tenderId), { order: dueInWindow(ctx, 'm2').filter((x) => !x.onTime).map((x) => x.l.tenderId) }),
  },
];

