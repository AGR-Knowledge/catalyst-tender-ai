import type { Lifecycle } from '@/data/gcc/lifecycle';
import { convert, money } from '@/domain/money';
import { minutesBetween } from '../clock';
import { currentOf, healthOf, queriesFor, stageAt } from '../lifecycle';
import type { PeriodWindow } from '../period';
import { inScope, tenantCcy } from '../actions/portfolio.actions';
import type { KpiCtx } from '../kpi/types';
import type { MetricDef, MetricResult } from './types';

/**
 * The portfolio graph's y-axis metrics over the nine stages (plan 015 Phase 5,
 * dashboards.md §6): tenders now, value now, tenders in the period, at risk
 * now and average days in stage. State metrics compare with the same measure
 * at the start of the window; flow metrics with the previous window. Point
 * clicks use the builder's default: the stage's dashboard when the viewer may
 * open it, else the table filtered to that stage.
 */

type Win = Pick<PeriodWindow, 'from' | 'to'>;

const inScopeOf = (ctx: KpiCtx) => queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done }).all().filter((l) => inScope(l, ctx.scope));
const liveNow = (ctx: KpiCtx) => inScopeOf(ctx).filter((l) => !l.closedAt);
const stageNow = (l: Lifecycle) => currentOf(l).stage;

/** Where each tender was at a moment, for tenders live then (captured and not yet closed). */
const liveAt = (ctx: KpiCtx, iso: string) => inScopeOf(ctx).flatMap((l) => {
  const s = stageAt(l, iso);
  return s ? [{ l, stage: s.stage }] : [];
});

/** The span a tender spent in a stage: from its first entry to its first entry into a later stage, or its closing. Open while it is still there. */
function spanIn(l: Lifecycle, n: number): { from: string; to: string | null } | null {
  const i = l.log.findIndex((e) => e.stage === n);
  if (i < 0) return null;
  const next = l.log.slice(i + 1).find((e) => e.stage > n);
  return { from: l.log[i].at, to: next?.at ?? l.closedAt ?? null };
}

const overlaps = (s: { from: string; to: string | null }, w: Win) => s.from <= w.to && (s.to === null || s.to >= w.from);

const perStage = (keys: string[], f: (n: number) => number | null) => keys.map((k) => f(Number(k)));

const round1 = (n: number) => Math.round(n * 10) / 10;

const TENDERS_NOW: MetricDef = {
  id: 'stages.count', label: 'Tenders now', kind: 'state', axis: 'stages',
  compute(ctx, keys): MetricResult {
    const now = liveNow(ctx);
    const then = liveAt(ctx, ctx.window.from);
    return {
      values: perStage(keys, (n) => now.filter((l) => stageNow(l) === n).length),
      compare: perStage(keys, (n) => then.filter((x) => x.stage === n).length),
    };
  },
};

const VALUE_NOW: MetricDef = {
  id: 'stages.value', label: 'Value now', kind: 'state', axis: 'stages',
  compute(ctx, keys): MetricResult {
    const ccy = tenantCcy(ctx.tenant);
    const sum = (ls: Lifecycle[]) => ls.reduce((s, l) => s + convert(l.value.amount, l.value.ccy, ccy), 0);
    const now = liveNow(ctx);
    const then = liveAt(ctx, ctx.window.from);
    const values = perStage(keys, (n) => sum(now.filter((l) => stageNow(l) === n)));
    const compare = perStage(keys, (n) => sum(then.filter((x) => x.stage === n).map((x) => x.l)));
    return {
      values, compare,
      displays: values.map((v) => money(v ?? 0, ccy)),
      compareDisplays: compare.map((v) => money(v ?? 0, ccy)),
      counts: perStage(keys, (n) => now.filter((l) => stageNow(l) === n).length) as number[],
    };
  },
};

const IN_PERIOD: MetricDef = {
  id: 'stages.inPeriod', label: 'Tenders in the period', kind: 'flow', axis: 'stages',
  compute(ctx, keys): MetricResult {
    const all = inScopeOf(ctx);
    const count = (w: Win) => perStage(keys, (n) => all.filter((l) => {
      const s = spanIn(l, n);
      return !!s && overlaps(s, w);
    }).length);
    return { values: count(ctx.window), compare: count(ctx.prev) };
  },
};

const AT_RISK: MetricDef = {
  id: 'stages.atRisk', label: 'At risk or overdue now', kind: 'state', axis: 'stages',
  compute(ctx, keys): MetricResult {
    const now = liveNow(ctx).filter((l) => ['at-risk', 'overdue', 'blocked'].includes(healthOf(l, ctx.tenant).health));
    // Health is read from the current step's facts, which the lifecycles keep for now only: no comparison.
    return { values: perStage(keys, (n) => now.filter((l) => stageNow(l) === n).length), compare: null };
  },
};

const AVG_DAYS: MetricDef = {
  id: 'stages.avgDays', label: 'Average days in stage', kind: 'flow', axis: 'stages',
  compute(ctx, keys): MetricResult {
    const all = inScopeOf(ctx);
    const mean = (w: Win) => perStage(keys, (n) => {
      const days = all.flatMap((l) => {
        const s = spanIn(l, n);
        return s?.to && s.to >= w.from && s.to <= w.to ? [minutesBetween(s.from, s.to) / 1440] : [];
      });
      return days.length ? round1(days.reduce((a, b) => a + b, 0) / days.length) : null;
    });
    const values = mean(ctx.window);
    const compare = mean(ctx.prev);
    const text = (v: number | null) => (v === null ? 'None left the stage' : `${v.toLocaleString('en-GB')} days`);
    return { values, compare, displays: values.map(text), compareDisplays: compare.map(text) };
  },
};

export const METRICS: MetricDef[] = [TENDERS_NOW, VALUE_NOW, IN_PERIOD, AT_RISK, AVG_DAYS];
