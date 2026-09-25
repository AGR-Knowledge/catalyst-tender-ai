# 006 — Shell, sidebar and dashboard kit

Status: READY after 004 and 005 are DONE · Depends on: 002, 003, 004 (types), 005 (package.json) · Can run in parallel with: 017 (they own different files)

## Goal
Every GCC person lands on a dashboard page with the same six zones:
- a header with the period filter;
- six KPI tiles, each with an ⓘ that explains it;
- a flow strip;
- Needs your action;
- a Table | Graph main view;
- a tender tracker under the table.

The sidebar shows Dashboard, the nine numbered stages the person may open, Company, and Administration and Settings pinned at the bottom.

This plan builds the **frame and the kit**, not the numbers. The zones are generic components fed by view models, and a registry lets later plans plug in KPIs, flows, action sources, graph metrics, table columns and dashboard definitions **without editing each other's files**. Real data arrives with 017, and the real dashboards with 015 and 013.

It also applies the gate-authority change: the Head of Tendering approves DG2 and DG3. It adds the Proposal Manager persona.

## Context
- **Why:** [dashboards.md](../../docs/07-product-design/agr-product-definition/dashboards.md). **Read all of it first.** This plan implements:
  - §1 layout, §2 period, §3 tiles and ⓘ, §4 actions, §5 table, §6 graph, §7 tracker (components only);
  - §8 sidebar, names and steps;
  - §9 capability changes;
  - §12.6 people.
- **Also read:** ui-direction §3 (tokens), §7 (money, dates, status), §9 (accessibility), §10 (copy); roles-and-access R8–R11.
- **Current behaviour:**
  - `src/App.tsx`: GCC tenants get `GccPending` at `/` and `/dashboard/:role`. Legacy routes are wrapped in `LegacyOnly`.
  - `src/components/layout/Sidebar.tsx`: the GCC branch (`gcc ? … : …`, around lines 138 and 197) renders one "Home" item.
  - `src/data/access.ts`:
    - `NAV_GCC` (line ~377) groups: My desk, Pipeline, Calendar, Discover & qualify, Source, Decide, Company, Administration, Settings;
    - `navFor()` filters it with `can()`;
    - `GRANTS` (line ~190) gives `exec` `dg2.decide` at seat scope;
    - the `can()` reason for `dg2.decide` is "Only the committee chair records the decision" (lines ~310 and ~347).
  - `src/data/people.ts`:
    - `Seat = 'chair' | …`; `exec` has `seat: 'chair'` (lines ~110 and ~137);
    - `SEATS`, `SEAT_LABEL`, `committeeOf()` and the role-line helper (line ~181) mention the chair;
    - there is no Proposal Manager in GCC tenants;
    - Sector Head sectors are short names ("Water").
  - **Tables:** `components/ui/DataTable.tsx` is our own. **Charts:** `components/ui/Charts.tsx` has only a histogram. No table or chart library is installed.
- **New libraries** (approved by the orchestrator, dashboards.md DB-12). Versions checked on 2026-09-25:
  - `ag-grid-community` and `ag-grid-react` 36.x: MIT. **Community modules only.**
  - `recharts` 3.x: MIT; needs peer `react-is`.

## Scope
**Files to create:**
- **Data:** `src/data/gcc/stages.ts` and `src/data/gcc/targets.ts`.
- **View models and ports:** `src/domain/gcc/viewmodels.ts` (the view-model contract; **017 depends on it**, so create it first) and `src/domain/gcc/port.ts` (the data-port loader).
- **Period:** `src/domain/gcc/period.ts`.
- **Registries:**
  - `src/domain/gcc/kpi/types.ts`, `src/domain/gcc/kpi/index.ts`;
  - `src/domain/gcc/flows/types.ts`, `src/domain/gcc/flows/index.ts`;
  - `src/domain/gcc/actions/types.ts`, `src/domain/gcc/actions/index.ts`;
  - `src/domain/gcc/metrics/types.ts`, `src/domain/gcc/metrics/index.ts`;
  - `src/domain/gcc/dashboards/types.ts`, `src/domain/gcc/dashboards/index.ts`, `src/domain/gcc/dashboards/build.ts`, `src/domain/gcc/dashboards/home.ts`.
- **Dashboard components:**
  - `src/components/dashboard/DashboardPage.tsx`, `PeriodFilter.tsx`, `KpiTile.tsx`, `InfoTip.tsx`, `FlowStrip.tsx`, `ActionList.tsx`, `ViewToggle.tsx`, `TenderTracker.tsx`, `dashboard.css`;
  - grid: `src/components/dashboard/grid/agGrid.ts` (module registration), `gridTheme.ts`, `TenderGrid.tsx`;
  - columns: `src/components/dashboard/columns/types.ts`, `index.ts`, `base.cols.tsx`;
  - chart: `src/components/dashboard/chart/StageChart.tsx`.
- **Tender kit:** `src/components/tender/Money.tsx`, `When.tsx`, `SlaClock.tsx`, `GateChip.tsx`, `StatusPill.tsx`, `Masked.tsx`, `DemoTag.tsx`, `EmptyState.tsx`.
- **Pages:**
  - `src/pages/gcc/DashboardRoute.tsx`, `StageRoute.tsx`, `ComingNext.tsx`, `TenderSummary.tsx`;
  - `src/pages/gcc/screens.ts`: the screen map (below, 8.1) and `isScreenBuilt(path)`;
  - `src/domain/gcc/gateChips.ts`: `useGateChipState(gate)` (8.4).
  - `src/pages/gcc/dev/KitPreview.tsx` and `src/pages/gcc/dev/fixtures.ts` (dev only).

**Files to change:**
- `app/package.json` and `app/package-lock.json`: the four dependencies, through `npm install`.
- `src/App.tsx`: GCC routes.
- `src/components/layout/Sidebar.tsx`: the GCC branch only.
- `src/data/access.ts`: `Capability`, `GRANTS`, `STAGE_ACCESS`, `can()` for `stage.view`, gate reasons, `NAV_GCC`, `navFor`.
- `src/data/people.ts`: seat `ceo`, `prop` people, sector names, hints, helpers.
- `src/data/roles.ts`: only if the `prop` role label needs a GCC title.
- `src/pages/gcc/GccPending.tsx`: title and foot text only, now that it lives at `/dev/checks`.
- `src/pages/gcc/dev-checks/20-people.tsx`: update the `can()` spot checks for R8/R9 (see 3.6).
- `src/styles/layout.css`: sidebar stage groups and the pinned bottom group.

**Out of scope** (stop and ask):
- Lifecycle data, stage logs, history, the Stage 4–9 register (plan 017).
- Any real KPI maths, action source, dashboard definition or column beyond the shared base columns (plans 015 and 013).
- Working screens: radar, queue, DG1/DG2/DG3 screens, sourcing, packs, calendar, company, administration. They stay `ComingNext` placeholders.
- Tender-kit components not listed above (RecommendationCard, SourceChip, Sheet, Callout …): plan 019.
- Any change to the Indian tenant's screens.
- AG Grid **Enterprise** modules. Never import `ag-grid-enterprise`.

## Steps

### Phase 0 — Preflight
- [x] 0.1 Confirm 004 and 005 are `DONE` in `app/plans/README.md`. If either is still `IN PROGRESS`, stop: 005 edits `package.json`, and 004 owns `src/data/gcc/**` until it is done.
- [x] 0.2 `npm --prefix app install ag-grid-community@^36 ag-grid-react@^36 recharts@^3 react-is@^18`.
  - Check that `package.json` gains exactly these four entries under `dependencies`, and that 005's `hero-itt` script line is still there.
  - Run `npm --prefix app run typecheck`.

### Phase 1 — The contract (do this first; plan 017 waits on 1.1)
- [x] 1.1 `src/domain/gcc/viewmodels.ts`: create **exactly** these exported types. You may add fields later if needed; renaming or removing one needs a note in the Execution report, because 017, 015 and 013 code against them.

  ```ts
  import type { Tone } from '@/data/types';
  import type { Ccy } from '@/data/gcc/fx';
  import type { Person } from '@/data/people';

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
    rows(tenant: string, scope: RowScope, viewer: Person, status: 'live' | 'closed' | 'all'): TenderRowVM[];
    tracker(tenant: string, tenderId: string, viewer: Person): TrackerVM | null;
  }
  ```
- [x] 1.2 `src/domain/gcc/port.ts`:
  - `const mods = import.meta.glob<{ port: DataPort }>('./*.port.ts', { eager: true })`;
  - `export function dataPort(): DataPort | null` returns the first module's `port`, or null.

  Plan 017 adds `lifecycle.port.ts`. Pages must handle null (§5.4).

### Phase 2 — Stage data and targets
- [x] 2.1 `src/data/gcc/stages.ts`:
  - `GCC_STAGES: { n; short; full; ownerRole: RoleKey; gateAfter?: GateKey; steps: { key; label }[] }[]`, exactly dashboards.md §8.1 and §8.2 (short names Intake · Sourcing · Bid decision · Planning · Pricing · Proposal · Compliance · Submission · Results);
  - step keys in kebab case (`'awaiting-dg1'`, `'rfqs-out'`, `'m2'`, `'dg3-issued'`, `'awaiting-result'` …);
  - helpers `stageOf(n)`, `stepLabel(stage, key)`, `stageLabel(n)` ("2 · Sourcing").
- [x] 2.2 `src/data/gcc/targets.ts`: the demo defaults behind every tone, as data. Later plans read them; Administration (plan 010) will edit them. For example:
  - `GATE_SLA_HOURS = { DG1: 24, DG2: 24, DG3: 48 }`;
  - `NEAR_WD = 5` (the "within 5 working days" rule);
  - the PF-4 bands (100 / 90);
  - the small-sample limit `MIN_N = 5`.

  Put **only** thresholds that dashboards.md names. No KPI values.

### Phase 3 — Access, people, navigation
- [x] 3.1 `people.ts`:
  - [x] 3.1.1 `Seat`: replace `'chair'` with `'ceo'`. `SEATS = ['ceo', 'cfo', 'technical', 'operations', 'sector']`; `SEAT_LABEL.ceo = 'CEO'`.
  - [x] 3.1.2 `exec`: title "Chief Executive Officer", seat `ceo`, hint "Records a DG2 position as a committee member. The Head of Tendering gives the final approval". Keep `cleared: true`.
  - [x] 3.1.3 `hot` hint: "Runs the tendering department: every tender, the final DG2 and DG3 approvals, the workspace settings, and View as anyone".
  - [x] 3.1.4 Add `prop` per GCC tenant (dashboards.md §12.6): group Contributors, title "Proposal Manager", hint "Owns Stage 6: proposal sections, SME writing and the technical score". The switcher then lists 17 people per tenant.
  - [x] 3.1.5 Sector Head `sector` values use the tenant's sector names:
    - Najd "Water and wastewater";
    - Corniche "Buildings MEP";
    - Dafna "Utility networks";
    - Batinah "Roads";
    - Qurain "Water".
  - [x] 3.1.6 `dir` title: "Project Director". The hint mentions Stage 9 results and handover, and pack inputs on delivery.
  - [x] 3.1.7 Update `committeeOf()`, the role-line helper and every "chair" wording. A committee member's line reads "CEO · Bid Committee".
- [x] 3.2 `access.ts` capabilities: add `'portfolio.view' | 'stage.view' | 'dg3.view' | 'dg3.issue' | 'dg3.decide'` to `Capability`, and `stage?: number` to the `can()` context.
- [x] 3.3 `STAGE_ACCESS: Record<RoleKey, number[]>`, exactly dashboards.md §8.3. Roles not listed get `[]`.
  - `can(person, 'stage.view', { stage })` is ok when the person's role lists the stage.
  - Otherwise the reason is "Stage {n} is outside your role".
  - Without `ctx.stage`, it is ok if the role lists any stage (for nav).
- [x] 3.4 `GRANTS` changes, exactly dashboards.md §9:
  - **`hot`:** + `dg2.decide`, `dg3.decide`, `dg3.view`, `reopen.approve`, `portfolio.view`, `stage.view` (tenant); keeps `dg2.secretary`.
  - **`exec`:** − `dg2.decide`, − `reopen.approve`; keeps `dg2.position` (seat); + `portfolio.view`, `stage.view` (tenant); gains no write rights.
  - **`comp`:** + `dg3.issue`, `dg3.view`.
  - **`bid`:** + `portfolio.view` (assigned), `stage.view`, `dg3.view`.
  - **`fin`, `hr`:** + `company.view` (tenant).
  - **`prop`:** + `tender.view` (tenant), `pack.view` (invited), `stage.view`, `input.respond` (own).
  - **`plan`, `comm`, `comp`, `dir`:** + `stage.view`.
- [x] 3.5 Reasons:
  - `dg2.decide` → "Only the Head of Tendering approves DG2";
  - `dg3.decide` → "Only the Head of Tendering approves DG3";
  - `dg3.issue` → "Only Compliance issues the DG3 pack".

  Remove the seat check that required `chair` for `dg2.decide`.
- [x] 3.6 `dev-checks/20-people.tsx`: update the spot checks.
  - `hot → dg2.decide` ok;
  - `exec → dg2.decide` denied ("Only the Head of Tendering approves DG2");
  - `member.cfo → dg2.position` ok;
  - `proc → stage.view {stage: 3}` denied;
  - `hot → dg3.decide` ok.
- [x] 3.7 `NAV_GCC` rebuilt to dashboards.md §8.3. Items have `path`, `cap`, and optional `gate` and `stage`:
  - **top group:**
    - Dashboard `/` (no cap);
    - Calendar `/calendar` (`tender.view`);
    - My requests `/requests` (`input.respond`);
  - **section "Stages":** nine stage groups, each `{ stage: n, label: '{n} {short}', path: '/stages/{n}', cap: 'stage.view' }`, with children:
    - 1: radar `/radar`, intake-queue `/intake-queue`, screening `/screening`, dg1 `/dg1` (gate DG1);
    - 2: sourcing `/sourcing`, levelling `/levelling`, suppliers `/suppliers`;
    - 3: packs `/packs`, dg2 `/dg2` ("DG2 approvals", gate DG2);
    - 7: dg3 `/dg3` ("DG3 approvals", cap `dg3.view`, gate DG3);
    - 4, 5, 6, 8 and 9 have no children;
  - **Company** `/company` (`company.view`);
  - **bottom group** (`pinned: 'bottom'`): Administration `/admin` with the seven children as today, and Settings `/settings`.

  **Drop Pipeline and "My desk".**
- [x] 3.8 `navFor(person, viewAs)`: keep the signature. Stage groups are filtered by `can(person, 'stage.view', { stage: n })`, and children by their own cap. Update the self-check comment table to the new structure.

### Phase 4 — Period engine
- [x] 4.1 `domain/gcc/period.ts`:
  - `PeriodKey = 'today' | '7d' | '30d' | '90d' | '12m'`;
  - `PERIODS` with labels "Today", "7 days", "30 days", "90 days", "12 months";
  - `DEFAULT_PERIOD = '30d'`.
- [x] 4.2 `windowOf(key, tenant): PeriodWindow` and `previousOf(window)`, exactly dashboards.md §2, built on `DEMO_TODAY` and `DEMO_TIME`:
  - `PeriodWindow = { key; from: string; to: string; label: string; rangeText: string; startText: string }`, with ISO local date-times and `rangeText` like "Sat 7 Feb – Sun 8 Mar 2026";
  - `inWindow(isoDateTime, w)` is inclusive of `from` and `to`.

  Use `domain/calendar.ts` for date arithmetic and text. Don't reimplement it.
- [x] 4.3 `usePeriod()`:
  - reads `?period=` from the URL, else `localStorage['ctai.period']` (try/catch), else the default;
  - `setPeriod(key)` writes both, replacing the URL param;
  - returns `{ key, window, prev, setPeriod }`.
- [x] 4.4 A dev check: add rows to `KitPreview` (Phase 8) printing all five windows and their previous windows for Najd. They must match the table in dashboards.md §2.

### Phase 5 — Registries and the dashboard builder
- [x] 5.1 `kpi/types.ts`:

  ```ts
  export type KpiKind = 'flow' | 'state';
  export interface KpiInfo { means: string; counted: string; target?: string; source: string }
  export interface KpiCtx { tenant: string; viewer: Person; viewAs: boolean; window: PeriodWindow; prev: PeriodWindow; done: Record<string, string>; scope: RowScope }
  export interface KpiResult { display: string; sub?: string; tone?: Tone; n?: number; masked?: { by: string }; ownerTag?: string; smallSample?: boolean }
  export interface KpiDef { id: string; label: string; labelToday?: string; kind: KpiKind; info: KpiInfo; cap?: Capability; compute(ctx: KpiCtx): KpiResult; drill?(ctx: KpiCtx): DrillVM | null }
  ```
  `kpi/index.ts`:
  - collects `import.meta.glob('./*.kpi.ts', { eager: true })`, where every module exports `KPIS: KpiDef[]`;
  - exposes `kpi(id)`;
  - **throws in dev** on a duplicate ID.
- [x] 5.2 The same pattern for:
  - `flows/` (`*.flow.ts` exporting `FLOWS: FlowDef[]`, where `FlowDef.compute(ctx) → FlowVM`);
  - `actions/` (`*.actions.ts` exporting `ACTION_SOURCES: ActionSource[]`, where `ActionSource.rows(ctx) → ActionVM[]`);
  - `metrics/` (`*.metric.ts` exporting `METRICS: MetricDef[]`, where `MetricDef = { id, label, kind, axis: 'stages' | 'steps', compute(ctx, axisKeys) → { values, compare, displays } }`).

  Put `DrillVM`, `FlowVM`, `ActionVM`, `TileVM` and `GraphVM` in `viewmodels.ts`, shaped as dashboards.md §1–§6 describe:
  - `ActionVM.primary` is either `{ kind: 'route', label, to }` or `{ kind: 'inplace', label, doneLabel, markKey, audit, toast }`;
  - `ActionVM.waitingOn?: { name, role }` and `disabledReason?: string`;
  - `ActionVM.urgency`: a number, lower first.
- [x] 5.3 `columns/types.ts` and `columns/index.ts`:
  - a column registry: `*.cols.tsx` modules export `COLUMNS: ColumnDef[]`, where `ColumnDef = { id, header, build(): AgColDef<TenderRowVM> }`;
  - `base.cols.tsx` defines the shared columns of dashboards.md §5: `tid`, `tender`, `stage`, `owner`, `team`, `value`, `due`, `nextGate`, `health`, `source`, `captured`, `country`, `sector`, `fit`, `win`, `lastActivity`;
  - renderers use the tender-kit components (Phase 6);
  - value getters give AG Grid sortable raw values: amounts in tenant currency, ISO dates, fit numbers.
- [x] 5.4 `dashboards/types.ts`:

  ```ts
  export type SortPreset = 'newest' | 'value' | 'due';
  export type FilterKey = 'stage' | 'status' | 'sector' | 'country' | 'owner' | 'health' | 'step';
  export interface DashboardSpec {
    key: string;                          // 'portfolio.hot' | 'portfolio.exec' | 'portfolio.bid' | 'stage.1' … 'stage.9' | 'requests'
    title(ctx: KpiCtx): string; subtitle(ctx: KpiCtx): string;
    tiles: string[];                      // KPI ids: 6 (4 for 'requests')
    flow: string | null;
    actions: string[];
    table: { kind?: 'tenders' | 'requests';   // default 'tenders'
             scope(ctx: KpiCtx): RowScope; rows?(ctx: KpiCtx): { id: string }[];   // `rows` is used when kind is 'requests'
             columns: string[]; optional?: string[]; defaultSort: SortPreset; filters: FilterKey[]; statusDefault?: 'live' | 'closed' | 'all' };
    graph: null | { axis: 'stages' } | { axis: 'steps'; stage: number };
    metrics: string[]; defaultMetric: string;
  }
  ```

  `dashboards/index.ts` collects `./*.dash.ts` (each exports `DASHBOARDS: DashboardSpec[]`).
- [x] 5.5 `dashboards/home.ts`:
  - `homeDashboardKey(person)`, exactly dashboards.md §8.3: hot → `portfolio.hot`; exec → `portfolio.exec`; bid → `portfolio.bid`; coord → `stage.1`; proc → `stage.2`; member → `stage.3`; plan → `stage.4`; comm → `stage.5`; prop → `stage.6`; comp → `stage.7`; dir → `stage.9`; fin, hr → `requests`; supplier, platform → `null`;
  - `stageDashboardKey(n) = 'stage.' + n`.
- [x] 5.6 `dashboards/build.ts`: `buildDashboard(spec, ctx, port): DashboardVM`. It:
  - resolves every id through the registries;
  - applies masking: a KPI with `cap` the viewer lacks → `masked`;
  - fills each tile's `info.period` with `window.rangeText`;
  - collects and sorts the action rows by `urgency`, filtered to what the viewer may see;
  - gets rows via `port.rows(...)`;
  - builds the graph from the chosen metric.

  An id that isn't registered yet renders a tile or zone saying "Not defined yet: {id}" (dev only). **The build doesn't crash.**

### Phase 6 — Tender kit (small, shared)
- [x] 6.1 **`Money`:** `{ value: MoneyVM; full?: boolean }`. It renders through `domain/money.ts`. With `original`, hover and focus show the original amount and `rateNote()`.
- [x] 6.2 **`When`:** `{ date; time?; tz?; countdown?: boolean }`. It renders `whenText`, and with `countdown`, `countdownText` ("in 63 days · 39 working days") for the active tenant's country.
- [x] 6.3 **`SlaClock`:** `{ start; end }`, against the demo clock.
  - Tone: green above 50%, orange at or below 25%, red when breached.
  - Text: "9 h 40 m left of 24 h" or "Late by 3 h".
- [x] 6.4 **`GateChip`:** `{ gate; state: 'open' | 'waiting-on-me' | 'breached' | 'decided' }`.
- [x] 6.5 **`StatusPill`:** the health vocabulary of dashboards.md §5 (labels and tones), plus a generic `{ label; tone }` form.
- [x] 6.6 **`Masked`:** "Masked for your role", with a lock icon and a tooltip naming who can see it. It is never a blank.
- [x] 6.7 **`DemoTag`**, and **`EmptyState`** `{ title; body?; action? }`.

### Phase 7 — Dashboard components
- [x] 7.1 **`PeriodFilter`:** a segmented control (`role="radiogroup"`) over `PERIODS`, with the window's `rangeText` as a caption under it.
- [x] 7.2 **`InfoTip`:** a button with the lucide `Info` icon (16 px) and an accessible name "About {label}". It opens a popover on hover, on focus, and on tap for touch; Esc closes it. The popover uses the existing popover styles, max width 320 px, and shows the dashboards.md §3 layout: What it means · How it's counted · Period · Target · Source.
- [x] 7.3 **`KpiTile`:** `TileVM` → the dashboards.md §3 anatomy.
  - Clickable only when it has a `drill`; then it is a button, not a div.
  - `masked` renders `Masked`; `smallSample` adds "Small sample" in the ⓘ.
  - The tile grid is six across at ≥ 1440 px, 3 × 2 at ≥ 1100 px and 2 × 3 below.
- [x] 7.4 **`FlowStrip`:** `FlowVM` → steps with arrows. Each part is a link-button with its count and label ("4 pursued"), and the whole strip has an `InfoTip`. It fits in 7/12 of the width at 1440 px without wrapping, and wraps to two lines below that.
- [x] 7.5 **`ActionList`:** title (viewer-aware), five rows, "Show all (n)", and the empty state with `nextText`.
  - Each row: type chip · TID and short title · what · due (`SlaClock` or `When`) · waiting-on name (when the viewer isn't the owner) · primary button.
  - A disabled button shows `disabledReason` in text next to it.
  - **In-place actions:**
    - call `mark(markKey, …)`, then `logAudit(...)`, then `toast(...)`;
    - afterwards the row shows `doneLabel` ("Approved 10:02") and stays until reload;
    - reload and Reset behave as the store does.
- [x] 7.6 **`ViewToggle`:** `Table | Graph` (radiogroup). `localStorage['ctai.mainview']` in a try/catch, default Table. It is hidden when the spec has no graph.
- [x] 7.7 **`TenderGrid`** (`grid/`):
  - [x] 7.7.1 `agGrid.ts`: register only the Community modules we use:
    - client-side row model;
    - text, number and date filters;
    - external filter;
    - row selection;
    - column auto-size;
    - cell style;
    - pinned columns if they need a module;
    - `ValidationModule` in dev only.

    Record the list in the report. `AllCommunityModule` is acceptable if the specific list gets messy, but note the bundle difference.
  - [x] 7.7.2 `gridTheme.ts`: `themeQuartz.withParams(...)` with the token map in dashboards.md §5.
    - **Verify** that `var(--token)` values work for colours in light and dark and under each tenant brand.
    - If any param doesn't accept `var()`, resolve from `getComputedStyle(document.documentElement)` on mount and when the theme or `data-tenant` changes (use a `MutationObserver` on `<html>` attributes).
  - [x] 7.7.3 `TenderGrid` is generic over a row with an `id`. Tender rows are the default. With `kind: 'requests'`, it takes rows from the spec's `rows(ctx)`, uses only columns registered with `appliesTo: 'request'` (add `appliesTo: 'tender' | 'request'` to `ColumnDef`, default `'tender'`), hides the stage, status and health filters, and never opens the tracker. The sort presets map to requested date (newest), none (value, so hide it) and due (due soonest). Plan 013 uses this for My requests.
  - [x] 7.7.4 `TenderGrid` props: `{ rows: TenderRowVM[]; columns: string[]; optional?: string[]; defaultSort: SortPreset; filters: FilterKey[]; statusDefault; selectedId; onSelect(id|null); onOpen(id); externalFilter?: TableFilterVM }`. It has:
    - **Box:** exactly 488 px (a 48 px toolbar plus a 440 px grid); rows scroll inside; sticky header.
    - **Pinned columns:** `tid` and `tender` pinned left.
    - **Toolbar:** Sort select (the three presets); Search (the quick filter); filter chip dropdowns with count badges (external filter); active chips with "Clear all"; "Columns" (a checkbox popover over `optional`, calling `setColumnsVisible`); "n of m".
    - **Never unsorted:**
      - on `sortChanged` with no sort model, re-apply the preset;
      - a header sort shows "Sort: {header}" in the select.
    - **Selection:** row click, Enter or Space selects and calls `onSelect`; clicking the selected row again deselects; double-click calls `onOpen`.
    - **`externalFilter`** (from a tile or flow drill) shows as a chip, e.g. "From tile: DG1 discarded · 30 days", which can be removed.
    - **Empty:** `EmptyState` "No tenders match these filters." with Clear all.
    - **Keyboard:** AG Grid's grid navigation, plus Enter to select and Esc to deselect.
- [x] 7.8 **`StageChart`** (`chart/`):
  - **Props:** `GraphVM` + `onPoint(key)` + `metric` + `setMetric`.
  - **Toolbar:** metric select, `Line | Bar`, a "Compare" checkbox (default on).
  - **Axes and series:**
    - Recharts `ResponsiveContainer` at 440 px high;
    - the x-axis shows the point labels;
    - gate markers are `ReferenceLine`s between points, with labels;
    - the comparison series is dashed at 50%.
  - **Tooltip:** name, value, comparison, and the click hint.
  - **Clicks:** on a dot or bar, and Enter on a keyboard-focused point, call `onPoint`.
  - **Accessibility:** `role="img"` with `GraphVM.summary`, plus a visually hidden data table.
  - **Colours:** CSS variables only.
- [x] 7.9 **`TenderTracker`:** `TrackerVM` → the dashboards.md §7 layout.
  - Nodes run across the width (they scroll horizontally inside the card below 1100 px).
  - The Now card has "Open tender" (→ `/tenders/:id`).
  - Close is × or Esc; on open, focus moves to the tracker heading.
  - Closed tenders show `outcome` and grey the nodes after the stop.
- [x] 7.10 **`DashboardPage`:** `DashboardVM` → Z1–Z6.
  - **Z1:** the breadcrumb and "Back to my dashboard" when the page isn't the viewer's home.
  - **Flow and tile drills:** tile and flow drills with `kind: 'table'` switch the view to Table, set `externalFilter`, and scroll the main view into view; `kind: 'route'` navigates.
  - **Graph points:** navigate or filter according to the point's `drill`.
  - **Z6** renders under the main view only in Table view, when a row is selected, via `vm.trackerFor(id)`.
  - **Layout:** Z3 and Z4 side by side (7/12 and 5/12) at ≥ 1440 px, 6/6 at ≥ 1100 px, stacked below with Z4 first.
- [x] 7.11 `dashboard.css`:
  - all sizes and colours from tokens;
  - checked in light and dark and in every tenant brand;
  - no horizontal page scroll at 1280 px.

### Phase 8 — Routes, sidebar, placeholders
- [x] 8.1 `App.tsx`, for the GCC world only (keep every legacy route and `LegacyOnly` as they are):
  - `/` → `DashboardRoute`, which uses `homeDashboardKey(person)`, looks up the spec, and renders `DashboardPage` with `buildDashboard`;
  - `/stages/:n` → `StageRoute`: `can(person, 'stage.view', { stage })`, or the restricted page with the reason (use plan 003's `GuardCap`);
  - `/tenders/:id` → `TenderSummary`;
  - `/requests` → `DashboardRoute` with the fixed key `requests` (plan 013 registers that spec, so it needs no route change);
  - `/calendar`, `/radar`, `/intake-queue`, `/screening`, `/dg1`, `/sourcing`, `/levelling`, `/suppliers`, `/packs`, `/dg2`, `/dg3`, `/company`, `/admin/*` → `ComingNext`, each with its name and one line from the screen map in `screens.ts` ("DG3 approvals: final bid approval by the Head of Tendering. Screen arrives with plan 018."). `screens.ts` exports `SCREENS: Record<path, { name; line; built: boolean }>` and `isScreenBuilt(path)`. Action sources (015, 013) use it to choose between "Open DG3" and "Open tender". Each later plan that builds a screen flips its `built` to true;
  - `/dev/checks` → `GccPending` and `/dev/kit` → `KitPreview`, **only when `import.meta.env.DEV`**;
  - `/dashboard/:role` for a GCC tenant → redirect to `/`.
  - Lazy-load `DashboardPage`, `KitPreview` and `TenderSummary` (`React.lazy`), so AG Grid and Recharts are in their own chunk and the legacy app doesn't load them.
- [x] 8.2 **No spec registered for the home key** (until 015 and 013 land): the route shows `EmptyState` "This dashboard is not built yet." with a link to `/dev/kit` in dev. **No port** (until 017): `DashboardPage` still renders tiles and actions, and the table shows "Tender data is not loaded yet."
- [x] 8.3 `TenderSummary`:
  - header: TID, title, value, stage chip, health;
  - the `TenderTracker` from `port.tracker`, always open;
  - a facts list from the row (`facts`) as `KV`s;
  - "Back".

  With no port it shows `EmptyState`. This is the target of "Open tender" until plan 019's Tender Workspace.
- [x] 8.4 `Sidebar.tsx`, GCC branch:
  - render `navFor(person, viewAs)` with the §8.3 structure;
  - the "Stages" section label;
  - stage headers are links to `/stages/n`, except when `stageDashboardKey(n) === homeDashboardKey(person)` (then a plain label);
  - expand and collapse with a chevron button (`aria-expanded`), remembered in `localStorage['ctai.nav.open']` in a try/catch; the group of the current route is always open;
  - gate chips via `GateChip`, with the state from `useGateChipState(gate)` in `src/domain/gcc/gateChips.ts`. It returns `'open'` for now; plan 015 fills it in;
  - the bottom group pinned with a divider;
  - "My requests" is hidden when the person's home is already `requests` (Finance, HR), for the same reason as the stage-header rule;
  - the mini rail keeps working, with the bottom group at the bottom and stage numbers as rail icons ("1" … "9" in a small circle, tooltip = name).
- [x] 8.5 `KitPreview` (dev only): every component with fixtures from `dev/fixtures.ts`:
  - 6 tiles (one masked, one small-sample, one without a drill);
  - a flow;
  - 7 actions (in place, route, disabled with reason, waiting-on);
  - 30 grid rows across all stages and health states;
  - a stages graph and a steps graph;
  - a tracker for a live, a won and a discarded tender;
  - the period windows table (4.4).

  Fixtures use the Najd names from gcc-demo-data and dashboards.md §12, and are **clearly fixtures** (a banner "Kit preview · fixture data").

## Data and derivation
- **New facts:** `data/gcc/stages.ts` (stage names and steps); `data/gcc/targets.ts` (thresholds only); people changes.
- **State:**
  - `mark()` keys are used only by the in-place actions, whose keys come from later plans' action sources.
  - `localStorage` holds per-viewer conveniences only (`ctai.period`, `ctai.mainview`, `ctai.nav.open`), all in try/catch, and the app works without them.
  - Reset demo clears nothing new in this plan.
- **No numbers are typed into pages.** Tiles show what registries compute; the kit preview uses a fixture file.

## Acceptance checks
- [ ] typecheck and build pass. Record the chunk sizes: the legacy entry chunk grows by < 10 kB, and AG Grid and Recharts sit in a lazy chunk.
- [x] `/dev/kit` in light and dark, at 1440 and 1280, for Najd and Qurain:
  - every zone renders;
  - the ⓘ opens on hover and keyboard focus and closes on Esc;
  - the grid shows 10 rows with inner scroll, stays sorted after clearing a header sort, filters by chip, and shows "n of m";
  - a row click opens the tracker below, and Esc closes it;
  - the graph switches Line and Bar and the metric, and a point click logs the key;
  - the toggle is remembered after reload;
  - no console errors.
- [x] **Sidebar:**
  - As Faisal Al-Harbi (Najd): Dashboard, Calendar, Stages 1–9 (1, 2, 3 and 7 expandable), Company; Administration and Settings at the bottom.
  - As Joseph Mathew: Dashboard, Calendar, stage 2 as a plain label with its three screens, Company, Settings.
  - As Khalid Al-Mutairi (CFO): Dashboard, Calendar, stage 3 as a label with Bid packs and DG2 approvals, Company, Settings.
  - As Sultan Al-Anazi (Finance): Dashboard (his requests), Calendar, Company, Settings. No stages, and no separate My requests item.
  - The mini rail works.
- [x] `/stages/3` as Joseph Mathew shows the restricted page with "Stage 3 is outside your role"; as Faisal it shows the "not built yet" state (until 013).
- [x] The `20-people` dev check shows the new spot checks passing. The persona switcher shows 17 people per GCC tenant, with Rami Aziz under Contributors.
- [x] `gen-in`: the sidebar, routes and dashboards are unchanged. Click every top-level legacy item.
- [x] Reset demo returns the app to its seed state; no new keys survive it.

## Execution report
(Filled in by the executor, 2026-09-25.)

- **Changed files:**
  - **Dependencies:** `package.json` and `package-lock.json` gain exactly `ag-grid-community ^36.2.0`, `ag-grid-react ^36.2.0`, `recharts ^3.10.1` and `react-is ^18.3.1` (Community only; no ag-grid-enterprise).
  - **New, contract:**
    - `src/domain/gcc/viewmodels.ts`, `port.ts`.
  - **New, data:**
    - `src/data/gcc/stages.ts`, `targets.ts`.
  - **New, domain:**
    - `src/domain/gcc/period.ts`, `clock.ts`, `registry.ts`, `gateChips.ts`;
    - `kpi/`, `flows/`, `actions/`, `metrics/` (each `types.ts` and `index.ts`);
    - `dashboards/types.ts`, `index.ts`, `home.ts`, `build.ts`.
  - **New, components:**
    - `src/components/tender/`: `Tip`, `Money`, `When`, `SlaClock`, `GateChip`, `StatusPill`, `Masked`, `DemoTag`, `EmptyState`, `tender.css`;
    - `src/components/dashboard/`: `InfoTip`, `PeriodFilter`, `ViewToggle`, `KpiTile`, `FlowStrip`, `ActionList`, `TenderTracker`, `DashboardPage`, `dashboard.css`;
    - `grid/`: `agGrid.ts`, `gridTheme.ts`, `TenderGrid.tsx`;
    - `columns/`: `types.ts`, `index.ts`, `base.cols.tsx`;
    - `chart/StageChart.tsx`.
  - **New, pages:**
    - `src/pages/gcc/`: `screens.ts`, `DashboardRoute.tsx`, `StageRoute.tsx`, `ComingNext.tsx`, `TenderSummary.tsx`;
    - `dev/fixtures.ts`, `dev/KitPreview.tsx`.
  - **Edited:**
    - `src/data/people.ts`, `src/data/access.ts`, `src/pages/gcc/dev-checks/20-people.tsx`, `src/pages/gcc/GccPending.tsx` (comment and footer text for `/dev/checks`);
    - `src/App.tsx`;
    - `src/components/layout/Sidebar.tsx` (GCC branch), `src/styles/layout.css` (GCC rail rules);
    - `src/pages/Restricted.tsx` and `src/components/layout/Header.tsx` (see Deviations).
- **Verification:**
  - **How:** headless Chrome driven over the DevTools protocol (no libraries) against `npm run dev`, with an isolated browser profile, so my demo state and resets touched no other session. Screens were checked by screenshot as well as by DOM queries.
  - **Typecheck:** `tsc -b` is clean for every plan-006 file. It currently fails only in `src/data/gcc/lifecycle/chain.ts` (plan 017, being edited in parallel: `againstMajority` and a stage-3 comparison). Per the wave rules I left it alone.
  - **Bundle:** `vite build` succeeds.
    - **Chunks:** entry `index` 553.9 kB (171.6 kB gzip); `DashboardRoute` 953.9 kB (AG Grid, lazy); `StageChart` 394.3 kB (Recharts, lazy, loads only when the Graph opens); `dashboard` 151.7 kB (shared kit, lazy); `TenderSummary` 3.2 kB; `StageRoute` 0.4 kB.
    - **Dev pages:** no dev-page code or text is in `dist`. The `/dev/*` titles in `screens.ts` are gated on `import.meta.env.DEV`.
  - **Entry chunk growth (acceptance check left unticked):**
    - HEAD builds to 500.3 kB, so the entry grows by 53.6 kB for all of wave 1 together.
    - Measured per module (minified with esbuild), plan 006's share is about 20 kB: `screens.ts` 3.6 kB, `data/gcc/stages.ts` 3.1 kB, the GCC rail in `Sidebar.tsx` about 4 kB, the nav and stage-access model in `access.ts` about 3.5 kB, the GCC routes in `App.tsx` about 2 kB, `ComingNext`, `GateChip`, `EmptyState`, `home.ts` and `gateChips.ts` 1.8 kB together, plus hints, the Header title and one icon, about 1.5 kB.
    - That is over the < 10 kB target. See Blockers.
  - **`/dev/kit`, checked for Najd and Qurain, light and dark, at 1440 and 1280:**
    - every zone renders, with no horizontal page scroll;
    - tiles are six across at 1440 and 3 × 2 at 1280, with no value cut;
    - the ⓘ opens on hover and on keyboard focus and closes on Esc;
    - the grid body shows 10.0 rows with inner scroll;
    - **sort:** clearing a header sort (asc → desc → none) returns to "Sort: Newest first" with the same first rows, and a header sort shows "Sort: Value";
    - **filters:** the Live pipeline tile gives the chip "From tile: Live pipeline · 30 days" and 15 of 22; the Stage facet gives 5 of 22; Clear all gives 22 of 22;
    - a row click opens the tracker below, and Esc closes it and clears the selection;
    - **graph:** it switches Line and Bar (18 bars) and the metric (legend "Value now");
    - **point clicks:** a stages-graph point drills to the Table with "From graph: 2 Sourcing · 30 days" (2 of 22); a steps-graph point logs "rfqs-out";
    - the Table/Graph toggle is remembered after reload;
    - "Approve purchase" and "Nudge" show "Approved 10:00", write `done` and the audit log, and toast;
    - the disabled "Approve Bid" shows its reason, and both waiting-on rows show;
    - all five period windows and their previous windows match dashboards.md §2 (table on the page).
  - **Sidebars:**
    - **Faisal Al-Harbi:** Dashboard, Calendar, Stages 1–9 (1, 2, 3 and 7 expand), Company; Administration (7 pages) and Settings pinned at the bottom.
    - **Joseph Mathew:** stage 2 as a plain label, open, with its three screens; Company; Settings.
    - **Khalid Al-Mutairi:** stage 3 as a label with Bid packs and DG2 approvals.
    - **Sultan Al-Anazi:** Dashboard, Calendar, Company, Settings; no stages and no My requests.
    - **Also checked:** the CEO, coord, plan, comp and hr all match the self-check table in `access.ts`.
    - **Behaviour:** a chevron (`aria-expanded`) opens and folds a group and is remembered after reload (`ctai.nav.open`); folded groups are `inert`. Arriving on `/radar`, `/dg3` or `/admin/audit` opens the group that holds it. Gate chips show beside DG1, DG2 and DG3.
    - **Mini rail:** number circles 1–9 with the stage name as tooltip; Administration and Settings stay at the bottom; gate chips are hidden.
  - **Routes:**
    - `/stages/3` as Joseph shows "Stage 3 is outside your role"; `/dg2` as Joseph shows "The DG2 committee is outside your role";
    - `/stages/2`, `/stages/3`, `/` and `/requests` show "This dashboard is not built yet." (no specs until 015 and 013);
    - `/tenders/T-2026-118` shows "Tender data is not loaded yet." (no port until 017);
    - `ComingNext` pages show their name and line; `/dashboard/hot` and `/pipeline` redirect to `/` for a GCC tenant.
  - **Dev checks:** "People and permissions: all 8 checks pass", and every other card passes.
  - **Persona switcher:** 17 people in each of the five GCC tenants (4 · 5 · 6 · 1 · 1), with each tenant's Proposal Manager under Contributors (Rami Aziz for Najd).
  - **gen-in:** for all eight legacy personas, the sidebar items and all 47 top-level clicks (path and page title) are identical to a build of HEAD served alongside, with no console errors.
  - **Reset demo:** "Reset this company" clears the kit's `done` keys and audit entries, and localStorage holds the same keys before and after (`ctai.demo.v2`, `ctai.theme`).
  - **Console:** no errors or warnings on any checked page other than React Router's existing v7 future-flag warnings.
- **Deviations from plan:**
  - **Files not in the plan's list:**
    - `domain/gcc/registry.ts`: one `collect()` for all six registries (a duplicate id throws in dev);
    - `domain/gcc/clock.ts`: the demo clock, `slaState`, durations;
    - `components/tender/Tip.tsx`: one portal popover used by the ⓘ, Money, Masked, facet menus and Source;
    - `components/tender/tender.css`.
  - **`Restricted.tsx`:** `GuardCap` takes an optional `ctx` (for `{ stage }`), and the copy reads "This page isn't part of your role" and "Go to my dashboard".
  - **`Header.tsx`:** the GCC title and sub-line come from `screenHead(pathname)`. Before this, every GCC route except `/` and Settings was titled "Not found". Z1's title therefore sits in the top bar; the page's own Z1 carries the breadcrumb, sub-line and period.
  - **`access.ts`:** `stage.view` is granted to coord, proc and member (their `STAGE_ACCESS` needs it). The comm, plan, comp and dir hints now say which stage they own and what pack inputs they answer.
  - **AG Grid modules:**
    - `TextFilterModule` dropped (the text search is ours);
    - `ColumnApiModule`, `RowApiModule` and `ScrollApiModule` added (needed by `applyColumnState`, `setColumnsVisible`, `getRowNode` and `ensureNodeVisible`);
    - sorting and pinning are core in v36, so there is no module to register;
    - `ValidationModule` is dev only.
  - **Grid theme:** `wrapperBorderRadius 0` (the card has the radius); axis and tick text use `--ink-3`, not `--ink-4`, for contrast.
  - **Grid rows:** 40 px everywhere with a compact two-line Tender cell, so 10 rows show (§6 allows 48 px and 8½ rows).
  - **Grid size:** the body is a fixed 440 px plus the horizontal scrollbar, and the toolbar and chips sit above it. At 1440 the toolbar wraps to two lines, and the fixed 488 px box had cut the grid to 8.7 rows.
  - **Types:** the view models gained `TableStatus`, `TableFilterVM`, `DrillVM`, `InfoVM`, the tile, flow, action and graph zone types, `SortPreset` and `FilterKey`. Nothing in the listed contract was renamed.
  - **Tile values:** they step down a size by length (`md`, `sm`, `xs`), so "SAR 3.09 bn" and "1 won · 2 lost" fit six across. Labels wrap rather than cut beside an owner tag, and the masked value uses the body font.
  - **Flow strip:** under about 600 px (6/12 at 1280) it lays out as two rows of three steps (container query), instead of wrapping "Results" onto a line of its own.
  - **Sidebar, current route:** the group holding the current route opens when you arrive on it, but you can still fold it. The chevron on that group is never a dead control.
- **Blockers / questions:**
  1. **Entry chunk size (acceptance check left open).** Plan 006 adds about 20 kB minified (about 7 kB gzip) to the legacy entry, against a < 10 kB target.
     - **What it is:** shell data the rail and header need synchronously: stage names and all 35 step labels, the screen map, the nav model, and the GCC rail.
     - **Option A:** split the step lists out of `data/gcc/stages.ts` into a module that only dashboards import (saves about 2 kB). This changes a module that 015 and 017 import.
     - **Option B:** lazy-load the GCC rail and header titles behind the world check (saves most of it, at the cost of a one-frame rail swap on the first GCC load).
     - **Option C:** accept the size.
     - Which do you want?
  2. **Stage owners' row scope.** plan, comm, comp and dir have `tender.view` at `invited` scope, but dashboards.md §8.3 says a stage owner sees every tender in their stage. 017's port filters rows by `tender.view`, so their stage tables may show only tenders they were invited to. I suggest `tender.view: 'tenant'` for them (as for prop). Not changed.
- **Follow-ups noticed (not done):**
  - `--orange` as text on `--orange-soft` is below 4.5:1 in light mode (SLA "4 h 10 m left", tile values). A darker `--orange-ink` token for text would fix it.
  - GCC search and upload are still hidden in the Header (plans 007 and 019).
  - The sidebar footer still shows the legacy "10 agents running" line for GCC tenants.
  - For 017:
    - the Due cell reads `facts.prepWd` (working days needed to prepare) when present, else `NEAR_WD`;
    - a masked fact is `facts[key] = null` plus `facts[key + '.masked'] = true`.
  - `chairVsMajority` in `data/gcc/types.ts` and `build.ts` (004/017) still says "chair"; 017 looks to be renaming it to `againstMajority`.
  - `boq.css` defines a global `.c-sub` (a cyan background). The kit's classes were renamed `tk-*` to avoid it; the legacy `c-*` names are a clash risk for later plans.
