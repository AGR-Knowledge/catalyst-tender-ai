import type { Capability } from '@/data/access';
import type { KpiCtx, KpiKind } from '../kpi/types';
import type { DrillVM } from '../viewmodels';

/**
 * A graph metric (dashboards.md §6): one value per point of the x-axis. The
 * axis is the nine stages (portfolio) or the steps of one stage (stage
 * dashboards; the stage is `ctx.scope.stage`). Each `*.metric.ts` exports
 * `METRICS: MetricDef[]`.
 */
export interface MetricResult {
  /** One per axis key, in order. Null draws no bar. */
  values: (number | null)[];
  /** State metrics: the same measure at `window.from`. Flow metrics: the previous window. Null = no comparison. */
  compare?: (number | null)[] | null;
  /** Formatted values ("SAR 260.0 M"); default is the number. */
  displays?: string[];
  compareDisplays?: string[];
  /** The label above each bar, shorter than `displays` ("SAR 260 M"); default is the display. */
  shortDisplays?: string[];
  /** Tenders behind each value, for value metrics' tooltips. */
  counts?: number[];
  /** Per-point drill; default: open the stage dashboard if the viewer may, else filter the table. */
  drills?: (DrillVM | null)[];
  /** One-line notes under the chart: why some points have no bar, what was left out for this viewer. */
  notes?: string[];
  /** The unit of the values ("SAR"), shown once in the legend so the bar labels can stay short. */
  unit?: string;
  /** A target line, only where a target for this measure is defined in `src/data`. */
  target?: { value: number; display: string; label: string };
}

/** The three measures the graph offers as buttons (dashboards.md §6, 2026-09-26); every other metric sits under More. */
export type Measure = 'tenders' | 'value' | 'weighted';

export interface MetricDef {
  id: string;
  label: string;
  kind: KpiKind;
  axis: 'stages' | 'steps';
  cap?: Capability;
  /** Which measure button this metric is, if any. */
  measure?: Measure;
  /** False when this viewer would see nothing of it (every value masked): the graph leaves it out. */
  offered?(ctx: KpiCtx, axisKeys: string[]): boolean;
  compute(ctx: KpiCtx, axisKeys: string[]): MetricResult;
}
