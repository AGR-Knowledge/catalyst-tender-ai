import type { Tone } from '@/data/types';
import type { Person } from '@/data/people';
import type { Capability } from '@/data/access';
import type { PeriodWindow } from '../period';
import type { DrillVM, RowScope } from '../viewmodels';

/**
 * The KPI registry's contract (dashboards.md §3, catalogue §0.3). Every KPI is
 * defined once, in a `*.kpi.ts` file next to this one that exports `KPIS`.
 * Dashboards name KPIs by id; `dashboards/build.ts` computes and masks them.
 */

/** Flow KPIs count events in the window; state KPIs are a value now (dashboards.md §2). */
export type KpiKind = 'flow' | 'state';

/** The ⓘ text, in plain UK English: what it means, how it's counted, the target, the source. */
export interface KpiInfo { means: string; counted: string; target?: string; source: string }

export interface KpiCtx {
  tenant: string;
  /** Who the dashboard is for: the viewed person during View as. */
  viewer: Person;
  /** View as is on: everything is read only. */
  viewAs: boolean;
  window: PeriodWindow;
  prev: PeriodWindow;
  /** The tenant's demo actions (`store.done`). */
  done: Record<string, string>;
  /** The dashboard's scope: all tenders, the viewer's assigned tenders, or one stage. */
  scope: RowScope;
  /** The demo clock, `YYYY-MM-DDTHH:MM` tenant local. */
  now: string;
  /** The dashboard being built, e.g. 'portfolio.hot' or 'stage.2'. */
  dashboard: string;
}

export interface KpiResult {
  display: string;
  sub?: string;
  tone?: Tone;
  n?: number;
  masked?: { by: string };
  ownerTag?: string;
  smallSample?: boolean;
  /** Overrides the label for this reading, e.g. "My live bids" in the Bid Manager's scope. */
  label?: string;
}

export interface KpiDef {
  id: string;
  label: string;
  /** The label when the period is Today, e.g. "Captured today". */
  labelToday?: string;
  kind: KpiKind;
  info: KpiInfo;
  /** The viewer needs this to see the value; without it the tile shows `Masked`. */
  cap?: Capability;
  compute(ctx: KpiCtx): KpiResult;
  drill?(ctx: KpiCtx): DrillVM | null;
}
