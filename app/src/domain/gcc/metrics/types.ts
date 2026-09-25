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
  /** One per axis key, in order. */
  values: (number | null)[];
  /** State metrics: the same measure at `window.from`. Flow metrics: the previous window. Null = no comparison. */
  compare?: (number | null)[] | null;
  /** Formatted values ("SAR 260.0 M"); default is the number. */
  displays?: string[];
  compareDisplays?: string[];
  /** Tenders behind each value, for value metrics' tooltips. */
  counts?: number[];
  /** Per-point drill; default: open the stage dashboard if the viewer may, else filter the table. */
  drills?: (DrillVM | null)[];
}

export interface MetricDef {
  id: string;
  label: string;
  kind: KpiKind;
  axis: 'stages' | 'steps';
  cap?: Capability;
  compute(ctx: KpiCtx, axisKeys: string[]): MetricResult;
}
