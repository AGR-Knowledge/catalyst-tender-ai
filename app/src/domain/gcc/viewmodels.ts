import type { Tone } from '@/data/types';
import type { Ccy } from '@/data/gcc/fx';
import type { Person } from '@/data/people';

/**
 * The view-model contract between the GCC data (plan 017's lifecycles, via the
 * `DataPort`), the registries (plans 015 and 013) and the dashboard kit
 * (plan 006, dashboards.md §1–§7). Components render these shapes and never
 * compute a KPI; pages build them through `dashboards/build.ts`.
 *
 * Adding a field is fine. Renaming or removing one breaks 013, 015 and 017.
 */

export type Health = 'on-track' | 'at-risk' | 'overdue' | 'blocked'
  | 'won' | 'lost' | 'discarded' | 'no-bid' | 'rejected' | 'withdrawn';
export type GateKey = 'DG1' | 'DG2' | 'DG3';
export interface MoneyVM { amount: number; ccy: Ccy; original?: { amount: number; ccy: Ccy } }

/** One table row. `facts` holds stage-specific column values keyed by column id. */
export interface TenderRowVM {
  id: string; shortTitle: string; issuer: string; city: string; country: string; sector: string;
  stage: number;            // 1–9
  step: string;             // step key from data/gcc/stages.ts
  ownerId: string | null; ownerName: string | null; ownerRole: string | null;
  teamName: string | null;
  value: MoneyVM | null; valueBasis: 'published' | 'estimate' | 'not-stated';
  submission: { date: string; time?: string } | null;           // tenant-local ISO date
  nextGate: { gate: GateKey; slaEnd?: string; label: string } | null;
  health: Health;
  source: { name: string; ref: string; url?: string; capturedAt: string; documentHref?: string };
  capturedAt: string; lastActivityAt: string;
  fit: number | null; win: { p: number; band: number } | null;
  live: boolean; closedAt?: string;
  bidManagerId: string | null;
  facts: Record<string, string | number | boolean | null>;
}

export type RowScope = { kind: 'all' } | { kind: 'assigned'; personId: string } | { kind: 'stage'; stage: number };

export interface TrackerNodeVM {
  key: string; kind: 'stage' | 'gate'; label: string; stage?: number; gate?: GateKey;
  status: 'done' | 'current' | 'not-reached' | 'stopped';
  from?: string; to?: string; days?: number; ownerInitials?: string;
  decision?: { label: string; tone: Tone; byName: string; at: string; onTime: boolean; lateBy?: string };
  note?: string;
}
export interface TrackerVM {
  tenderId: string; title: string; value: MoneyVM | null; health: Health;
  nodes: TrackerNodeVM[];
  now: { stageLabel: string; stepLabel: string; withName: string | null; withRole: string | null;
         team: string | null; status: string; next: string; blocker: string | null } | null;
  outcome?: string;   // for closed tenders: "Discarded at DG1 · below the value band · 3 Mar"
}

export interface DataPort {
  /** `done` is the tenant's demo state (`store.done`): pass it, so actions taken in the demo show (plan 021 applies it). */
  rows(tenant: string, scope: RowScope, viewer: Person, status: 'live' | 'closed' | 'all', done?: Readonly<Record<string, string>>): TenderRowVM[];
  tracker(tenant: string, tenderId: string, viewer: Person, done?: Readonly<Record<string, string>>): TrackerVM | null;
}

/* ---------------------------------------------------------------- dashboard zones */

export type TableStatus = 'live' | 'closed' | 'all';

/**
 * A table filter set by a tile, a flow part or a graph point (dashboards.md §1 Z3, §3, §6).
 * The table shows it as one removable chip ("From tile: DG1 discarded · 30 days").
 * Every set field narrows the rows; `status` overrides the Status filter while the chip is on.
 */
export interface TableFilterVM {
  label: string;
  ids?: string[];
  stages?: number[];
  steps?: string[];
  health?: Health[];
  status?: TableStatus;
  /** These ids first, in this order (e.g. "late first"), ahead of the sort. */
  order?: string[];
  /** Select this row, which opens its tracker. */
  select?: string;
}

/** Where a click goes: the table with a filter, or another screen. */
export type DrillVM =
  | ({ kind: 'table' } & TableFilterVM)
  | { kind: 'route'; to: string; label?: string };

/** The ⓘ popover (dashboards.md §3): what it means · how it's counted · period · target · source. */
export interface InfoVM {
  label: string;
  means: string;
  counted: string;
  /** "30 days · Sat 7 Feb – Sun 8 Mar 2026", or for a state KPI "Now · change since Sat 7 Feb". */
  period: string;
  target?: string;
  source: string;
  smallSample?: boolean;
}

/** One KPI tile (dashboards.md §3). */
export interface TileVM {
  id: string;
  label: string;
  /** The main value, already formatted (money through `domain/money.ts`, dates through `domain/calendar.ts`). */
  display: string;
  sub?: string;
  tone?: Tone;
  /** "Finance", when the thing measured waits on someone else. */
  ownerTag?: string;
  /** The viewer may not see the value; `by` names who can. The tile keeps its place. */
  masked?: { by: string };
  smallSample?: boolean;
  info: InfoVM;
  drill: DrillVM | null;
  /** Not registered yet: the tile says so (dev) instead of crashing. */
  missing?: boolean;
}

/** One number in the flow strip: "4 pursued". */
export interface FlowPartVM { key: string; count: number; label: string; tone?: Tone; drill: DrillVM | null }
/** One step of the strip: "DG1" with its parts, or "Captured" with one part. */
export interface FlowStepVM { key: string; label: string; parts: FlowPartVM[] }
/** What a flow definition computes for the window. */
export interface FlowVM { steps: FlowStepVM[] }
/** The Z3 zone as rendered. */
export interface FlowZoneVM extends FlowVM { id: string; label: string; info: InfoVM; missing?: boolean }

export type ActionDue =
  | { kind: 'sla'; start: string; end: string }
  | { kind: 'date'; date: string; time?: string }
  | { kind: 'text'; text: string; tone?: Tone };

export type ActionPrimary =
  | { kind: 'route'; label: string; to: string }
  | {
    kind: 'inplace';
    label: string;
    /** Shown after the action, until reload. `{time}` becomes the demo-clock time of the audit entry: "Approved {time}". */
    doneLabel: string;
    markKey: string;
    /** Value stored in `done` (default 'yes'). */
    markValue?: string;
    audit: { action: string; target?: string; detail?: string };
    toast: string;
  };

/** One row of "Needs your action" (dashboards.md §4). */
export interface ActionVM {
  /** Unique across the dashboard, e.g. 'dg3.approve:T-2025-305'. */
  id: string;
  /** The action source id. */
  source: string;
  /** Type chip: "DG3 approval", "Booklet purchase". */
  type: string;
  typeTone?: Tone;
  tenderId?: string;
  shortTitle?: string;
  /** What is needed, in one line. */
  what: string;
  due?: ActionDue;
  /** Set when the viewer isn't the one it waits on. */
  waitingOn?: { name: string; role: string };
  primary: ActionPrimary;
  /** The button is disabled, and this sentence says why beside it. */
  disabledReason?: string;
  /** Lower first: breached SLAs and hard blocks, then time left, then value. */
  urgency: number;
}

export interface ActionsZoneVM {
  /** "Needs your action", or "Waiting in Sourcing" on someone else's stage dashboard. */
  title: string;
  rows: ActionVM[];
  /** Empty state's second line: "Next: DG1 on T-2026-118, due Mon 9 Mar 07:44". */
  nextText?: string;
  /** Action source ids that aren't registered yet. */
  missing: string[];
}

/** One point on the graph's x-axis. */
export interface GraphPointVM {
  key: string;
  label: string;
  value: number | null;
  compare: number | null;
  display: string;
  compareDisplay?: string;
  /** Tender count behind a value metric, for the tooltip. */
  count?: number;
  drill: DrillVM | null;
  /** "Click to open Sourcing" or "Click to see these tenders". */
  hint: string;
}

export interface GraphVM {
  metric: string;
  metricLabel: string;
  kind: 'flow' | 'state';
  axis: 'stages' | 'steps';
  points: GraphPointVM[];
  /** "At the start of the window (Sat 7 Feb)" or "Previous 30 days (8 Jan – 6 Feb)"; null when there is no comparison. */
  compareLabel: string | null;
  /** Gate markers between points: after the point with key `after`. */
  markers: { after: string; label: string }[];
  metrics: { id: string; label: string }[];
  /** For `aria-label`: "Tenders now by stage: 1 Intake 5, 2 Sourcing 2, …". */
  summary: string;
  empty: boolean;
  missing?: boolean;
}

/** The minimum a My requests row carries (plan 013's `Request`), for the sort presets. */
export interface RequestRowVM { id: string; requestedAt: string; due: string | null }

export type SortPreset = 'newest' | 'value' | 'due';
export type FilterKey = 'stage' | 'status' | 'sector' | 'country' | 'owner' | 'health' | 'step';

export interface TableZoneVM {
  kind: 'tenders' | 'requests';
  /** Tender rows (all statuses; the table filters by status), or request rows. Null when no data port is loaded. */
  rows: { id: string }[] | null;
  columns: string[];
  optional: string[];
  defaultSort: SortPreset;
  filters: FilterKey[];
  statusDefault: TableStatus;
  /** Shown when the default view has no rows and no filter is set; the grid's generic text otherwise. */
  empty?: { title: string; body?: string };
}

/** A whole dashboard, Z1–Z6 (dashboards.md §1). */
export interface DashboardVM {
  key: string;
  title: string;
  subtitle: string;
  /** This is the viewer's own home. */
  isHome: boolean;
  /** Someone else's dashboard: the breadcrumb, and "{owner}'s dashboard ({role}). Actions follow your own rights." */
  crumbs: { label: string; to?: string }[];
  viewerNote?: string;
  tiles: TileVM[];
  flow: FlowZoneVM | null;
  actions: ActionsZoneVM;
  table: TableZoneVM;
  graph: GraphVM | null;
  /** The tracker for a selected row (Z6). */
  trackerFor(id: string): TrackerVM | null;
  /** Registry ids the spec names that aren't registered yet. */
  missing: string[];
}
