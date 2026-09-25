import type { KpiCtx } from '../kpi/types';
import type { FilterKey, RowScope, SortPreset, TableStatus } from '../viewmodels';

export type { FilterKey, SortPreset } from '../viewmodels';

/**
 * A dashboard is a composition of registry ids (dashboards.md §1, §10). Each
 * `*.dash.ts` exports `DASHBOARDS: DashboardSpec[]`. The layout is the same for
 * every role; only these ids differ.
 */
export interface DashboardSpec {
  key: string;                          // 'portfolio.hot' | 'portfolio.exec' | 'portfolio.bid' | 'stage.1' … 'stage.9' | 'requests'
  title(ctx: KpiCtx): string; subtitle(ctx: KpiCtx): string;
  tiles: string[];                      // KPI ids: 6 (4 for 'requests')
  flow: string | null;
  actions: string[];
  table: { kind?: 'tenders' | 'requests';   // default 'tenders'
           scope(ctx: KpiCtx): RowScope; rows?(ctx: KpiCtx): { id: string }[];   // `rows` is used when kind is 'requests'
           columns: string[]; optional?: string[]; defaultSort: SortPreset; filters: FilterKey[]; statusDefault?: TableStatus };
  graph: null | { axis: 'stages' } | { axis: 'steps'; stage: number };
  metrics: string[]; defaultMetric: string;
}
