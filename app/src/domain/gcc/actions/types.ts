import type { Capability } from '@/data/access';
import type { KpiCtx } from '../kpi/types';
import type { ActionVM } from '../viewmodels';

/**
 * A source of "Needs your action" rows (dashboards.md §4). Each `*.actions.ts`
 * exports `ACTION_SOURCES: ActionSource[]`. Rows are viewer-aware: the owner
 * sees their own, the Head of Tendering sees everything with `waitingOn` set.
 */
export interface ActionSource {
  id: string;
  /** Only viewers who hold this (at list level) see the source's rows. */
  cap?: Capability;
  rows(ctx: KpiCtx): ActionVM[];
  /** The next due item, for the empty state: "Next: DG1 on T-2026-118, due Mon 9 Mar 07:44". */
  next?(ctx: KpiCtx): string | null;
}
