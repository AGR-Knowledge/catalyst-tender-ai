import type { Lifecycle, StepFacts } from '@/data/gcc/lifecycle';
import { NOW, hoursBetween } from '@/data/gcc/lifecycle/chain';
import { stageOf, stepLabel } from '@/data/gcc/stages';
import { queueFor } from '../s1';
import { stageAt, currentOf } from '../lifecycle';
import { inWindow, type PeriodWindow } from '../period';
import type { KpiCtx } from '../kpi/types';
import type { DrillVM } from '../viewmodels';
import { ccyOf, liveIn, moneyText, qOf, round1, scopeStage, staysOf, valueOf, type Stay } from '../kpi/stages';
import type { MetricDef, MetricResult } from './types';
import { NO_WIN_YET, shortMoney, weigh, weighedText, weightedNotes, weightedOffered } from './weighted';

/**
 * Graph metrics across the steps of one stage (plan 013 Phase 1.2,
 * dashboards.md §6 and §10.4–10.12). The stage is the dashboard's scope.
 * State metrics compare with the same measure at the start of the window;
 * flow metrics with the previous window. Metrics built on step facts exist
 * only now, so they have no comparison.
 */

type Win = Pick<PeriodWindow, 'from' | 'to'>;

const stageN = (ctx: KpiCtx) => scopeStage(ctx) ?? 0;

/** Per step key: the tenders counted, from a picker over live tenders at their current step. */
function byStep<T>(keys: string[], items: T[], keyOf: (t: T) => string | null): T[][] {
  return keys.map((k) => items.filter((t) => keyOf(t) === k));
}

/** Tenders at each step at the start of the window, from their logs. */
function atStart(ctx: KpiCtx, keys: string[]): Lifecycle[][] {
  const n = stageN(ctx);
  const all = qOf(ctx).all();
  return byStep(keys, all, (l) => {
    const at = stageAt(l, ctx.window.from);
    return at && at.stage === n ? at.step : null;
  });
}

const nowByStep = (ctx: KpiCtx, keys: string[]) => byStep(keys, liveIn(ctx, stageN(ctx)), (l) => currentOf(l).step);

/** Stays in each step of the stage that pass the test (overlap the window, or end in it). */
function staysIn(ctx: KpiCtx, keys: string[], pick: (s: Stay) => boolean): Stay[][] {
  const n = stageN(ctx);
  const stays = qOf(ctx).all().flatMap(staysOf).filter((s) => s.stage === n && pick(s));
  return byStep(keys, stays, (s) => s.step);
}

const overlaps = (w: Win) => (s: Stay) => s.from <= w.to && (s.to ?? NOW) >= w.from;
const leftIn = (w: Win) => (s: Stay) => !!s.to && inWindow(s.to, w);

const uniqueTenders = (stays: Stay[]) => [...new Set(stays.map((s) => s.l.tenderId))];

function idsDrills(ctx: KpiCtx, keys: string[], lists: string[][], what: string): (DrillVM | null)[] {
  const n = stageN(ctx);
  return keys.map((k, i) => (lists[i].length
    ? { kind: 'table', label: `From graph: ${stepLabel(n, k)} · ${what} · ${ctx.window.label}`, ids: lists[i], status: 'all' }
    : null));
}

const count = (ctx: KpiCtx, keys: string[]): MetricResult => ({
  values: nowByStep(ctx, keys).map((l) => l.length),
  compare: atStart(ctx, keys).map((l) => l.length),
});

function value(ctx: KpiCtx, keys: string[]): MetricResult {
  const sum = (ls: Lifecycle[]) => ls.reduce((s, l) => s + valueOf(ctx.tenant, l), 0);
  const now = nowByStep(ctx, keys);
  const start = atStart(ctx, keys);
  return {
    values: now.map(sum), compare: start.map(sum),
    displays: now.map((ls) => moneyText(ctx.tenant, sum(ls))), compareDisplays: start.map((ls) => moneyText(ctx.tenant, sum(ls))),
    shortDisplays: now.map((ls) => shortMoney(sum(ls), ccyOf(ctx.tenant))),
    unit: ccyOf(ctx.tenant),
    counts: now.map((ls) => ls.length),
  };
}

function inPeriod(ctx: KpiCtx, keys: string[]): MetricResult {
  const now = staysIn(ctx, keys, overlaps(ctx.window)).map(uniqueTenders);
  const prev = staysIn(ctx, keys, overlaps(ctx.prev)).map(uniqueTenders);
  return { values: now.map((x) => x.length), compare: prev.map((x) => x.length), drills: idsDrills(ctx, keys, now, 'in the period') };
}

/** Mean time spent in each step by the tenders that left it in the window. */
function average(ctx: KpiCtx, keys: string[], unitH: number, unit: string, unitName: string): MetricResult {
  const mean = (stays: Stay[]) => (stays.length ? round1(stays.reduce((s, x) => s + hoursBetween(x.from, x.to!), 0) / stays.length / unitH) : null);
  const now = staysIn(ctx, keys, leftIn(ctx.window));
  const prev = staysIn(ctx, keys, leftIn(ctx.prev));
  const text = (v: number | null) => (v === null ? 'None left the step' : `${v.toLocaleString('en-GB')} ${unit}`);
  const values = now.map(mean);
  const compare = prev.map(mean);
  return {
    values, compare, displays: values.map(text), compareDisplays: compare.map(text), counts: now.map((s) => s.length),
    shortDisplays: values.map((v) => (v === null ? '' : v.toLocaleString('en-GB'))), unit: unitName,
    drills: idsDrills(ctx, keys, now.map(uniqueTenders), 'left the step'),
  };
}

/** A step fact summed over live tenders at each step (facts exist only now: no comparison). */
function factSum(pick: (f: StepFacts, l: Lifecycle, ctx: KpiCtx) => number) {
  return (ctx: KpiCtx, keys: string[]): MetricResult => ({
    values: nowByStep(ctx, keys).map((ls) => ls.reduce((s, l) => s + (l.facts ? pick(l.facts, l, ctx) : 0), 0)),
    compare: null,
  });
}

/** Open intake-queue items (007a), for live tenders at each Stage 1 step. */
function fieldsToCheck(ctx: KpiCtx, keys: string[]): MetricResult {
  const open = new Map<string, number>();
  for (const g of queueFor(ctx.tenant, ctx.done as Record<string, string>)) open.set(g.tenderId, g.items.length);
  return { values: nowByStep(ctx, keys).map((ls) => ls.reduce((s, l) => s + (open.get(l.tenderId) ?? 0), 0)), compare: null };
}

/**
 * Value × win probability by step, DEC-4's rule (`weighted.ts`): bids whose
 * pack is not issued yet have no probability and draw no bar; tenders whose
 * probability this viewer may not see are left out, and the chart says how many.
 */
function weighted(ctx: KpiCtx, keys: string[]): MetricResult {
  const points = nowByStep(ctx, keys).map((ls) => weigh(ctx, ls, (l) => valueOf(ctx.tenant, l)));
  const none = points.every((w) => w.counted + w.masked === 0);
  return {
    values: points.map((w) => w.value),
    compare: null,
    displays: points.map((w) => weighedText(w, (v) => moneyText(ctx.tenant, v))),
    shortDisplays: points.map((w) => (w.value === null ? '' : shortMoney(w.value, ccyOf(ctx.tenant)))),
    counts: points.map((w) => w.counted),
    unit: ccyOf(ctx.tenant),
    notes: weightedNotes(points, none ? NO_WIN_YET : 'Bids whose pack is not issued yet have no win probability, so their steps show no bar.'),
  };
}

const steps = (id: string, label: string, kind: MetricDef['kind'], compute: MetricDef['compute'], extra: Partial<MetricDef> = {}): MetricDef => ({
  id, label, kind, axis: 'steps', compute, ...extra,
});

export const METRICS: MetricDef[] = [
  steps('steps.count', 'Tenders now', 'state', count, { measure: 'tenders' }),
  steps('steps.value', 'Value now', 'state', value, { measure: 'value' }),
  steps('steps.inPeriod', 'Tenders in the period', 'flow', inPeriod),
  steps('steps.avgDays', 'Average days in step', 'flow', (ctx, keys) => average(ctx, keys, 24, 'days', 'days')),
  steps('steps.avgHours', 'Average hours in step', 'flow', (ctx, keys) => average(ctx, keys, 1, 'h', 'hours')),
  steps('s1.fieldsToCheck', 'Fields to check now', 'state', fieldsToCheck),
  steps('s2.notCovered', 'Packages not covered now', 'state', factSum((f) => (f.stage === 2 ? f.packages.total - f.packages.covered : 0))),
  steps('s2.overdueRfqs', 'Overdue RFQs now', 'state', factSum((f) => (f.stage === 2 ? f.rfqs.overdue : 0))),
  steps('s3.weighted', 'Weighted value now', 'state', weighted, {
    cap: 'see.positions', measure: 'weighted', offered: (ctx) => weightedOffered(ctx, liveIn(ctx, stageN(ctx))),
  }),
  steps('s6.lateSections', 'Late sections now', 'state', factSum((f) => (f.stage === 6 ? f.sections.late : 0))),
  steps('s7.gaps', 'Mandatory gaps now', 'state', factSum((f) => (f.stage === 7 ? f.mandatoryGaps : 0))),
];

/** Every step key of a stage, for the dev check. */
export const stepKeysOf = (n: number) => stageOf(n)?.steps.map((s) => s.key) ?? [];
