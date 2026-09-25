import type { KpiCtx, KpiInfo } from '../kpi/types';
import type { FlowVM } from '../viewmodels';

/**
 * A flow strip (dashboards.md §1 Z3): the role's funnel for the window. Each
 * `*.flow.ts` exports `FLOWS: FlowDef[]`. Every number carries a drill.
 */
export interface FlowDef {
  id: string;
  label: string;
  info: KpiInfo;
  compute(ctx: KpiCtx): FlowVM;
}
