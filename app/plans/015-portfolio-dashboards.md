# 015 — Portfolio dashboards: Head of Tendering, CEO, Bid Manager

Status: DONE (2026-09-26, accepted by the orchestrator; see the wave 3 review in README.md) · Depends on: 006 (kit, registries, routes), 017 (lifecycles, port) · Can run in parallel with: 013, 019, 021

## Review notes (2026-09-26)
- **Starts only after plan 020 lanes A and B are DONE.**
- **Delivery load (Phase 1, DEC-5):**
  - Corniche is pinned at 55% now, +7 if its Stage 3 tender is won; Qurain at 66%, +12. 009a's pack uses the same figures.
  - 015's dev check must assert that its delivery-load figures equal 009a's `PackSnapshot.portfolio`.
  - The safe level (Najd 70%) is read from the tenant seed (`fit.safeDeliveryPct`), not typed again.
- **Restricted tenders:** tiles, flows and graph counts hide restricted tenders from people not cleared. Najd Stage 1 reads 12 for Faisal and 11 for Aisha. Use `visibleOf` and `visible` from `domain/gcc/lifecycle.port.ts` (added by 020 lane B) for every count, not only table rows.
- **Action sources:** until 020 lane A1 is in, give each action source a view capability as its `cap`. Once A1 is in, write capabilities work under View as.
- **Average days in stage:** don't quote targets for Stage 2. Najd's Stage 2 runs long by design (dashboards.md §12.2).
- **(added 2026-09-26, after plan 020)** Plan 020 is DONE and committed. **Call every lifecycle query through `queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done })`** (exported from `domain/gcc/lifecycle.port.ts`), never unbound: it always passes the viewer (so restricted T-2026-121 never leaks into a count) and the demo state. Plan 021, running in parallel, makes demo actions (DG1 Pursue, RFQs sent, DG2 approval …) flow through it, so your tiles move when the presenter clicks, with no change on your side. Pass `ctx.done` to `port.rows(...)` too. Dev-check rows that assert seed targets pass `done: {}`.
- **(added 2026-09-26)** Plans 019 (Tender Workspace) and 021 (demo state, rule fixes) run in parallel with this one. Don't edit `domain/gcc/lifecycle*.ts`, `dashboards/build.ts`, `DashboardRoute.tsx`, `App.tsx` or `components/tender/**`. If you need a change there, write a Blocker.
- **(added 2026-09-26) Demo-grade:** this is a sales demo. Hit the target readings exactly, but keep the dev check to the targets and a few masking and visibility rows, not an exhaustive suite. Spend the time on what the prospect sees: the ⓘ texts, the tile subs, the action rows' wording.

## Goal
The Head of Tendering opens the app on **their dashboard**. It has:
- a period filter;
- six tiles, each explaining itself on hover:
  1. Live pipeline
  2. Average ticket size
  3. Win / loss
  4. Decisions on time
  5. Credentials at risk
  6. Bid-team load
- the DG1 → DG2 → DG3 → Submitted → Results funnel;
- the approvals and escalations that need them;
- every tender, end to end, in a sortable, filterable table, or as a line graph across the nine stages.

Clicking a stage in the graph opens that stage's dashboard. Clicking a tender opens its tracker.

The CEO gets the same page with the CEO's tiles and read-only rights. The Bid Manager gets it scoped to their own tenders.

Every number is derived from the data (017's lifecycles, 004's company data) and changes with the period.

## Context
- **Why:** [dashboards.md](../../docs/07-product-design/agr-product-definition/dashboards.md):
  - §10.1–10.3 (the three dashboards);
  - §11.1 (PF KPIs) and §11.9 (ⓘ texts);
  - §4 (action rows);
  - §6 (graph metrics);
  - §12.3–12.4 (**target readings: Najd must land exactly**).
- **Also read:** kpi-and-screen-catalogue §A for SCR-1, SCR-5, SCR-6, CAP-1, DEC-4, DEC-5, DEC-6, DEC-7 and OUT-3, which this plan also defines.
- **After 006 and 017, the code has:**
  - **Registries**, collected by `import.meta.glob` (see 006 Phase 5):
    - `domain/gcc/kpi/*.kpi.ts`;
    - `flows/*.flow.ts`;
    - `actions/*.actions.ts`;
    - `metrics/*.metric.ts`;
    - `dashboards/*.dash.ts`;
    - `components/dashboard/columns/*.cols.tsx`.
  - **Pieces:** `buildDashboard`, `DashboardPage`, `usePeriod`, `homeDashboardKey`.
  - **Queries and port:** 017's queries (`gateEventsIn`, `submissionsIn`, `resultsIn`, `capturesIn`, `liveOf`, `healthOf`, `openGate`, `stageAt`) and the port (rows, tracker).
  - **Hook:** `useGateChipState` in `domain/gcc/gateChips.ts`, returning `'open'`.
  - **Screen map:** `pages/gcc/screens.ts` (`isScreenBuilt`).

  **Read the real files first**: 006 and 017 may have deviated, and their reports say how.
- **KPI ownership** (each ID is defined once; a duplicate throws in dev):
  - **This plan defines:** PF-1 … PF-6, SCR-1, SCR-5, SCR-6, CAP-1, DEC-4, DEC-5, DEC-6, DEC-7, OUT-3.
  - **Plan 013 defines the rest.** Its Stage 3 and Stage 9 dashboards reuse DEC-4 … DEC-7 and OUT-3 from here.

## Scope
**Files to create:**
- **Data:** `src/data/gcc/portfolio.ts`: per-tenant targets and delivery load (Phase 1).
- **KPIs, flows, actions, metrics:**
  - `src/domain/gcc/kpi/portfolio.kpi.ts`;
  - `src/domain/gcc/flows/portfolio.flow.ts`;
  - `src/domain/gcc/actions/portfolio.actions.ts`;
  - `src/domain/gcc/metrics/stages.metric.ts`.
- **Dashboards:** `src/domain/gcc/dashboards/portfolio.dash.ts`.
- **Dev check:** `src/pages/gcc/dev-checks/50-portfolio.tsx`.

**Files to change:**
- `src/domain/gcc/gateChips.ts`: real "waiting on me" and "breached" states (Phase 6).

**Out of scope** (stop and ask):
- Stage dashboards and My requests (013).
- The DG2 and DG3 gate screens themselves (009, 018). Their action rows route to "Open tender" until `isScreenBuilt('/dg2')` or `('/dg3')` is true.
- New columns: the portfolio uses 006's base columns only.
- Editing 006's components. If one doesn't fit, write a Blocker.

## Steps

### Phase 1 — Portfolio facts
- [x] 1.1 `data/gcc/portfolio.ts`. These are facts the dashboards need that 004 and 017 don't carry:
  - `TENANT_TARGETS: Record<GccKey, { hitRatePct: number; orderIntakeAnnual: Money }>`:

    | Tenant | Target hit rate | Annual order intake |
    | --- | --- | --- |
    | Najd | 25% | SAR 2.0 bn |
    | Corniche | 25% | AED 0.9 bn |
    | Dafna | 25% | QAR 0.8 bn |
    | Batinah | 30% | OMR 80 M |
    | Qurain | 25% | KWD 110 M |

  - `DELIVERY_LOAD: Record<GccKey, { asOf: string; currentPct: number; ifWon: { tenderId: string; addPct: number }[] }>`: the delivery load of awarded work against the safe-delivery threshold, which is 004's `fit.safeDeliveryPct`.
    - Najd: current 58%; T-2026-097 +9, T-2026-101 +4.
    - Qurain: current 66%; its Stage 3 tender +12.
    - The others: current 50–60%, and their Stage 3 tenders (if any) +5–10.
    - `asOf` is `'2026-03-05'`.
- [x] 1.2 Record the resulting DEC-5 readings in the report. Najd: (58 + 9 + 4) ÷ 70 = **101% (orange)**.

### Phase 2 — KPIs (`portfolio.kpi.ts`)
Each entry carries `id`, `label`, `kind`, `info` (verbatim from dashboards.md §11.1 and §11.9, or from the catalogue's "Why" for SCR/DEC/CAP/OUT where §11.9 has it), `cap` if masked, `compute` and `drill`.

**Scope rule.** Compute over `ctx.scope`: `all` for the Head of Tendering and the CEO; `assigned` for the Bid Manager, filtering lifecycles by `bidManagerId`.

- [x] 2.1 **PF-1 Live pipeline** (state).
  - Live lifecycles whose current stage is 2–8 → count and Σ value in tenant currency (`convert` for other currencies).
  - Display `Money` compact (e.g. "SAR 3.09 bn").
  - Sub: "{count} tenders · {in} in, {out} out since {window.startText}". *In* means pursued at DG1 in the window. *Out* means a no-bid, a DG3 rejection, a withdrawal or a result in the window.
  - For the Bid Manager the label is "My live bids".
  - Drill: table, stages 2–8, Live.
- [x] 2.2 **PF-2 Average ticket size** (flow).
  - The mean value of `submissionsIn(window)`.
  - Sub: "{n} bids · largest {max}".
  - n = 0 → display "No bids submitted in this period" and no tone.
  - Drill: table, `ids` = those tenders, status All.
- [x] 2.3 **PF-3 Win / loss** (flow).
  - `resultsIn(window)` → won and lost (withdrawn and cancelled excluded).
  - Display "{won} won · {lost} lost".
  - Sub: "Win rate {p}% (n = {n}) · {value won} won".
  - Tone vs `TENANT_TARGETS.hitRatePct` only when n ≥ `MIN_N`; otherwise neutral, with `smallSample: true`.
  - n = 0 → "No results in this period".
  - Drill: table, those tenders.
- [x] 2.4 **PF-4 Decisions on time** (flow).
  - `gateEventsIn(window)` for DG1, DG2 and DG3 → on time ÷ total.
  - Display "{pct}%".
  - Sub: "{on} of {total} · {late} late: {gate} on {TID} ({lateBy})", naming the first late one; "all on time" when none are late.
  - Bands from `data/gcc/targets.ts`.
  - n = 0 → "No decisions in this period".
  - Drill: table, those tenders, late first.
- [x] 2.5 **PF-6 Next submission** (state; the Bid Manager's scope).
  - The nearest `submissionDeadline` among live assigned tenders not yet submitted.
  - Display `When` short ("Thu 12 Mar, 10:00").
  - Sub: "{TID} · {n} working days · next: {TID2} {date}".
  - Tone orange ≤ 5 working days; red ≤ 2 working days with SUB-3 below 100% or signatures pending.
  - Drill: the tracker for that tender (`kind: 'table'` with `ids: [id]` and a select).
- [x] 2.6 **SCR-6 Credentials at risk** (state), labelled "Credentials at risk".
  - 004 credentials whose `validTo` falls before the opening date (or the validity end, per the PQ line's `validAt`) of **any live bid**.
  - Opening dates come from 004 key dates for Stage 1–3 tenders and from `s8.openingDate` or the submission deadline for later ones.
  - Display the count.
  - Sub: the first one ("Zakat 30 Apr · before T-2026-118 opens 10 May"), and the owner tag.
  - Drill: route `/company` (ComingNext until plan 010).
  - **Najd = 2.**
- [x] 2.7 **CAP-1 Bid-team load** (state).
  - For each 004 `Team`: committed hours in the next 4 weeks ÷ available hours. Show the busiest team.
  - Sub: "{team}, next 4 weeks · {pct with hero}% if T-2026-118 is pursued", only while the hero has no DG1 record.
  - **Najd = 78%, 96% with the hero; Qurain's water team = 118% in April**, per gcc-demo-data. If 004's data can't produce these, write a Blocker. Don't adjust the maths to force them.
- [x] 2.8 **SCR-1 DG1 due** (state).
  - Live tenders at step `awaiting-dg1`, or in Stage 1 with no DG1 record and a DG1 SLA end.
  - Sub: "first in {time}" via `SlaClock` text.
  - **Najd (Bid Manager scope, assigned to Omar) = 2, first in 6 h 10 m.**
- [x] 2.9 **SCR-5 Eligibility risks** (state).
  - Live Stage 1–3 tenders whose `s1.eligibility` has fail > 0 or atRisk > 0.
  - Sub: the most urgent. For Stage 2–3 tenders without `s1` facts, count them only if 017 left an eligibility summary; otherwise note it in the report.
  - **Najd = 3.**
- [x] 2.10 **DEC-4 Weighted pipeline** (state).
  - Σ value × `s3.win.p` over live Stage 3 tenders with an issued pack or a win estimate.
  - Sub: "{n} bids · unweighted {Σ value}".
  - **Najd = SAR 206 M** (0.58 × 355; T-2026-101 has no estimate yet). If 017 gave T-2026-101 a win estimate, count only issued packs and record it.
- [x] 2.11 **DEC-5 Capacity if won** (state).
  - (`currentPct` + Σ `addPct` for live Stage 3 tenders) ÷ `safeDeliveryPct`.
  - Tone: ≤ 100% green; ≤ 115% orange; else red.
  - Sub: "{load}% of capacity vs safe {safe}% · as of {asOf}".
- [x] 2.12 **DEC-6 Facility headroom** (state).
  - 004 `facility`: limit − utilised − Σ committed.
  - Sub: "after T-2026-097: {headroom − its bond}" when a DG2 pack is open, and "Finance, as of {asOf}".
  - Mask with `cap` so that people without `see.margin`, and who aren't Finance or the CFO, see a value band only. Follow roles-and-access §9; if unclear, show the value to `hot`, `exec`, `member`, `fin` and `bid`.
  - **Najd = SAR 96 M.**
- [x] 2.13 **DEC-7 Inputs outstanding** (state).
  - `s3.inputs.items` not submitted, in scope.
  - Sub: "{late} late · {first late: what · owner}".
  - **Najd = 2, 1 late (Finance, facility).**
- [x] 2.14 **OUT-3 Value won** (flow).
  - Σ value of results won in the window.
  - Sub: "vs {target pro-rated to the window}". The pro-rated target is `orderIntakeAnnual × days ÷ 365`.
  - Tone: ≥ 100% green; ≥ 70% orange; else red. Neutral when the window is Today or 7 days (too short to judge).
- [x] 2.15 **Masking.** Every KPI whose value is margin or quote-derived declares `cap`. The builder masks it.

### Phase 3 — The funnel (`portfolio.flow.ts`)
- [x] 3.1 **PF-5 Decision funnel** over `ctx.scope`, in the window:
  1. Captured (`capturesIn`; the Bid Manager's scope omits this step);
  2. DG1: pursued · discarded · held;
  3. DG2: bid · no-bid;
  4. DG3: approved · rejected;
  5. Submitted;
  6. Results: won · lost.

  Each part carries a drill: table, `ids` = those tenders, status All, label "From funnel: DG1 discarded · 30 days".

  The ⓘ is verbatim from dashboards.md §11.1.

### Phase 4 — Action sources (`portfolio.actions.ts`)
Each source returns `ActionVM[]` for the viewer, following dashboards.md §4 and §12.4.

**Route actions** use `isScreenBuilt(path)`. When the screen is built, the button says "Open DG3" and goes to `/dg3?tender=ID`. Otherwise it says "Open tender" and goes to `/tenders/ID`.

- [x] 4.1 **`dg3.approve`** (Head of Tendering): Stage 7 tenders at step `dg3-issued` with no DG3 record.
  - What: "Ready for your approval" or "Evidence incomplete: {n} gaps".
  - Due: `SlaClock` from `dg3IssuedAt` + 48 h.
- [x] 4.2 **`dg2.approve`** (Head of Tendering): Stage 3 tenders with an issued pack and no DG2 record.
  - What: "{recorded} of 5 positions · quorum needs 3", or "Quorum met: ready for your approval".
  - Adds "pack stale ({reason})" when `s3.stale`.
  - Due: `SlaClock` from `issuedAt` + 24 h.
- [x] 4.3 **`dg2.position`** (CEO and members, but only on the portfolio for the CEO): the same tenders where the viewer's seat has no entry in `s3.positions.bySeat` (017 amendment).
  - What: "Your position is needed".
  - Route: "Open DG2" or "Open tender".
- [x] 4.4 **`booklet.approve`** (Head of Tendering): Stage 1 tenders with `s1.documents.requestedById` and no approval in `done`.
  - In place: markKey `booklet-approved:{TID}`.
  - Audit: "Approved booklet purchase {fee} for {TID}".
  - Toast: "Purchase approved. {requester} can buy the booklet on {portal}."
  - Done label: "Approved {time}".
- [x] 4.5 **`renewal.request`** (Head of Tendering; also the Bid Manager for their tenders): one row per SCR-6 credential.
  - In place: markKey `renewal-requested:{credId}`.
  - Toast: "Renewal requested from {owner}. It is in their requests."
  - 013's My requests reads these keys.
- [x] 4.6 **`input.nudge`** (Head of Tendering; the Bid Manager for their tenders): late `s3.inputs.items`.
  - In place: markKey `nudged:{itemId}`.
  - Toast: "{owner} has been reminded. The reminder is in the audit log."
- [x] 4.7 **`dg1.oversight`** (Head of Tendering): DG1 due within 6 h, or breached, on any tender.
  - Waiting on the Bid Manager.
  - The Head of Tendering's button is "Record as delegate" (R7) → "Open DG1" or "Open tender".
- [x] 4.8 **`dg1.decide`** (Bid Manager): SCR-1's tenders, assigned.
- [x] 4.9 **`pack.issue`**, **`pack.stale`**, **`submission.due`** (Bid Manager): from `s3` and `s8` facts on assigned tenders, per dashboards.md §10.3.
- [x] 4.10 **Urgency order:**
  1. breached SLAs;
  2. hard blocks;
  3. time left (smallest first);
  4. value (largest first).

  **Najd, as the Head of Tendering, must list exactly dashboards.md §12.4 items 1–5 in that order, with 7 in "Show all".**

### Phase 5 — Graph metrics (`stages.metric.ts`)
- [x] 5.1 Axis `stages`, with keys `1`…`9` and labels from `stageLabel`:
  - `stages.count` (Tenders now, state);
  - `stages.value` (Value now, state, tenant currency);
  - `stages.inPeriod` (flow: tenders whose log places them in the stage at any time in the window, via `stageAt` sampling or interval overlap);
  - `stages.atRisk` (state: health at-risk, overdue or blocked);
  - `stages.avgDays` (flow: tenders that left the stage in the window, mean days in it).
- [x] 5.2 **Comparison:**
  - state metrics compare with the same measure **at `window.from`** (use `stageAt(l, window.from)`, counting only tenders live at that moment);
  - flow metrics compare with the previous window.
- [x] 5.3 **Gate markers:** after 1 (DG1), 3 (DG2) and 7 (DG3).
- [x] 5.4 **Point drill:** `route /stages/{n}` when `can(viewer, 'stage.view', { stage: n })`, else `table` with stage n.
- [x] 5.5 **Summary text for `aria-label`:** "Tenders now by stage: 1 Intake 12, 2 Sourcing 2, …".

### Phase 6 — Gate chips (`gateChips.ts`)
- [x] 6.1 `useGateChipState(gate)` for the current viewer returns:
  - **`'breached'`** if any tender waiting on the viewer at that gate is past its SLA;
  - **`'waiting-on-me'`** if any is waiting on the viewer;
  - **`'open'`** otherwise.

  Who waits at each gate:
  - DG1 waits on the assigned Bid Manager, or on the Head of Tendering for oversight within 6 h;
  - DG2 waits on the Head of Tendering once quorum is met, and on members without a position;
  - DG3 waits on the Head of Tendering.

  Use the same queries as the action sources; don't duplicate the logic. Export a shared helper from `portfolio.actions.ts` if needed.

### Phase 7 — Dashboard definitions (`portfolio.dash.ts`)
- [x] 7.1 **`portfolio.hot`**, exactly dashboards.md §10.1:
  - title "Dashboard"; subtitle "{name} · {tenant} · As of {whenText}";
  - tiles PF-1, PF-2, PF-3, PF-4, SCR-6, CAP-1;
  - flow PF-5;
  - actions: dg3.approve, dg2.approve, booklet.approve, dg1.oversight, renewal.request, input.nudge;
  - table: scope all; columns `tid`, `tender`, `stage`, `owner`, `team`, `value`, `due`, `nextGate`, `health`, `source`; optional `captured`, `country`, `sector`, `fit`, `win`, `lastActivity`; sort `newest`; filters stage, status, sector, country, owner, health; status Live;
  - graph: stages; metrics count, value, inPeriod, atRisk, avgDays; default count.
- [x] 7.2 **`portfolio.exec`**, per §10.2:
  - tiles PF-1, PF-3, OUT-3, DEC-4, DEC-6, DEC-5;
  - actions: dg2.position, plus the Head of Tendering's sources shown as "Waiting on …" (read only, with a disabled reason "The Head of Tendering approves");
  - table and graph as for the Head of Tendering.
- [x] 7.3 **`portfolio.bid`**, per §10.3:
  - tiles SCR-1, PF-1 (assigned), SCR-5, DEC-7, PF-6, PF-4 (assigned);
  - flow PF-5 (assigned);
  - actions: dg1.decide, pack.issue, pack.stale, submission.due, renewal.request (theirs), input.nudge (theirs);
  - table: scope assigned, with `win` added to the defaults;
  - graph: stages. The drill opens stages 1–8 and filters stage 9.

### Phase 8 — Dev check and target readings
- [x] 8.1 `dev-checks/50-portfolio.tsx`: for the active tenant and every period, print each tile's display and sub, the funnel parts, the action list (type, TID, what) and the graph points.
  - **For Najd**, show target vs got with ✓/✗ for §12.3 (the PF-2, PF-3, PF-4 and funnel rows) and §12.4 (the action order).
  - Also print PF-1 = "15 tenders · SAR 3.09 bn", SCR-6 = 2, CAP-1 = 78%, DEC-4 = SAR 206 M, DEC-6 = SAR 96 M, DEC-7 = 2 (1 late) and DEC-5 = 101%.
- [x] 8.2 **Every ✗ is either fixed in the KPI maths or explained in the report** (e.g. a 017 data gap). Never type a value to make a check pass.

## Data and derivation
- **New facts:** `data/gcc/portfolio.ts` (targets and delivery load).
- **Derived:** everything else, from 004 (credentials, teams, facility, validations), 017 (lifecycles, captures, facts) and demo state.
- **New `mark()` keys:** `booklet-approved:{TID}`, `renewal-requested:{credId}`, `nudged:{itemId}`. Each is audited, survives a reload, and is cleared by Reset (this company).
- **Demo-state effects on KPIs** (e.g. an approved booklet purchase removing the action row): the action source reads `done`. KPIs change only where the underlying fact changes; approving a purchase doesn't change INT-10 until the booklet is bought (plan 007).

## Acceptance checks
- [x] typecheck and build pass; no console errors.
- [x] **Najd as Faisal Al-Harbi, 30 days (the default):**
  - PF-1 "SAR 3.09 bn · 15 tenders · 4 in, 5 out since Sat 7 Feb";
  - PF-2 "SAR 262.0 M · 3 bids · largest SAR 310.0 M";
  - PF-3 "1 won · 2 lost", neutral, "Win rate 33% (n = 3)";
  - PF-4 "95% · 20 of 21 · 1 late: DG1 on T-2026-107 (3 h)";
  - SCR-6 2; CAP-1 78% (96% with the hero).
  - Funnel: Captured 176 → DG1 4 · 7 · 1 → DG2 4 · 1 → DG3 4 · 0 → Submitted 3 → 1 won · 2 lost.
  - Actions: §12.4 items 1–5, with 7 in "Show all".
  - Table: 29 live rows by default (the Head of Tendering is cleared for the restricted lane; people who aren't see 28), sorted newest first; Status "All" adds closed tenders.
  - Graph: 12 · 2 · 2 · 2 · 2 · 2 · 1 · 4 · 2 (Stage 1 = 12, decided 2026-09-25; see dashboards.md §12.2).
- [x] **Switching the period** to Today, 7 days, 90 days and 12 months changes the tiles, funnel and graph to the §12.3 values. Needs your action and the table don't change.
- [x] **Every ⓘ** shows its text and the window range.
- [x] **Clicks:**
  - a funnel number switches to the Table with a removable chip and exactly those tenders;
  - a tile with a drill does the same;
  - SCR-6 goes to `/company`;
  - a graph point on "2 Sourcing" opens `/stages/2?period=30d`, with the breadcrumb and "Back to my dashboard" (the stage dashboard itself is 013's; until then it shows "not built yet").
- [x] **Approve purchase** on T-2026-122:
  - the row shows "Approved 10:00";
  - the audit log (the `20-people` dev check shows the last five) has the entry;
  - it survives a reload;
  - Reset (this company) clears it.
- [x] **Other personas:**
  - **Khalid Al-Mutairi (CFO)** doesn't get this page (his home is Stage 3).
  - **Eng. Abdulaziz Al-Dosari (CEO)** sees §10.2's tiles; approve buttons are disabled with "The Head of Tendering approves"; his own DG2 position row is there if the story leaves his seat empty.
  - **Omar Siddiqui** sees only his tenders; PF-6 "Thu 12 Mar, 10:00 · T-2025-298 · 4 working days".
- [x] **Other tenants:** each tenant's Head of Tendering sees a DG3 approval in Needs your action, a non-empty funnel at 30 days and at least one result.
- [x] **Layout:** light and dark, at 1440 and 1280; no horizontal page scroll.
- [x] **Sidebar gate chips:**
  - DG3 is orange for Faisal (waiting on him).
  - DG2 stays outline for Faisal: quorum isn't met, so it waits on the members, not on him.
  - As Saad Al-Shehri (Operations Director, no position yet), DG2 is orange.
  - As Khalid Al-Mutairi (CFO, position recorded), DG2 is outline.

## Execution report
(Filled in by the executor, 2026-09-26.)

### Changed files
- **New:**
  - `src/data/gcc/portfolio.ts`: `TENANT_TARGETS`, `DELIVERY_LOAD` (all `asOf` 2026-03-05) and `PORTFOLIO_BANDS`;
  - `src/domain/gcc/kpi/portfolio.kpi.ts`: PF-1, PF-2, PF-3, PF-4, PF-6, SCR-1, SCR-5, SCR-6, CAP-1, DEC-4, DEC-5, DEC-6, DEC-7, OUT-3;
  - `src/domain/gcc/flows/portfolio.flow.ts`: PF-5;
  - `src/domain/gcc/actions/portfolio.actions.ts`: the 11 action sources, the urgency order and the gate-chip rules (`gateChipState`, `chipCtx`);
  - `src/domain/gcc/metrics/stages.metric.ts`: the five stage metrics;
  - `src/domain/gcc/dashboards/portfolio.dash.ts`: `portfolio.hot`, `portfolio.exec`, `portfolio.bid`;
  - `src/pages/gcc/dev-checks/50-portfolio.tsx`.
- **Changed:**
  - `src/domain/gcc/gateChips.ts`: real states, read from the action rules;
  - `plans/README.md`: row 015 only.
- Every lifecycle query goes through `queriesFor({ tenant, viewer, done })`. Rows that assert seed targets pass `done: {}`.

### DEC-5 readings (1.2)
| Tenant | Reading | Tone |
| --- | --- | --- |
| Najd | (58 + 9 + 4) ÷ 70 = 101% | orange |
| Corniche | (55 + 7) ÷ 75 = 83% | green |
| Dafna | 74% | green |
| Batinah | 81% | green |
| Qurain | (66 + 12) ÷ 75 = 104% | orange |

The dev check asserts that every tenant's delivery load equals 009a's `PackSnapshot.portfolio`.

### Verification
- **Typecheck (`npx tsc -b`):** none of this plan's files has an error. The last run's only error was `src/pages/gcc/dev-checks/70-stage1.tsx(388,5)` TS2532, in a file a parallel session changed at 10:29; I didn't touch it. An earlier run's only error, 013's `metrics/steps.metric.ts`, has since gone.
- **Build (`vite build`):** passes. The gate-chip rules load as their own chunk (`portfolio.actions-*.js`, 15 kB).
- **/dev/checks → Portfolio dashboards,** run headless (Vite SSR) and in the browser on :5181:
  - Najd: all 82 targets met. They cover §12.3 tiles and funnel in all five periods; §12.4 order 1–5 with Show all (7); table 29 rows, 28 for someone not cleared; the graph; Stage 1 reading 12 or 11 by clearance; the CEO, Bid Manager and Procurement readings and masking; the gate chips by role; and that Needs your action and the table don't change with the period.
  - Corniche, Dafna, Batinah, Qurain: all 6 targets met each.
- **Click-through on :5181** (own Chrome profile; Reset only there):
  - **Faisal:**
    - tiles, funnel and actions in every period;
    - every ⓘ shows its text and the window;
    - funnel and tile drills open the table with a chip and exactly those tenders;
    - SCR-6 opens `/company`;
    - the graph's aria summary reads "Tenders now by stage: 1 Intake 12, 2 Sourcing 2, …";
    - the "2 Sourcing" point opens `/stages/2?period=30d` with the breadcrumb and "Back to my dashboard".
  - **Approve purchase on T-2026-122:**
    - the row shows "Approved 10:00" and the toast appears;
    - the done key and the audit entry are written, and /dev/checks shows the audit entry;
    - after a reload the row has gone;
    - Settings → Reset this company brings back all 7 items.
  - **CEO:**
    - the §10.2 tiles read PF-1, PF-3, "SAR 142.0 M · 1 win · 86% of the SAR 164.4 M target", SAR 205.9 M, SAR 96.0 M and 101%;
    - the Head of Tendering's rows are disabled with "The Head of Tendering approves";
    - his own DG2 position row on T-2026-097 is enabled.
  - **Omar:** 28 rows, only his tenders; PF-6 reads "Thu 12 Mar, 10:00 · T-2025-298 · 4 working days".
  - **Khalid:** home is the Stage 3 dashboard.
  - **Gate chips:**

    | Viewer | DG1 | DG2 | DG3 |
    | --- | --- | --- | --- |
    | Faisal | outline | outline | orange |
    | Omar | orange | | |
    | Saad | | orange | |
    | Khalid | | outline | |

  - **Layout:** 1280 and 1440, light and dark, with no horizontal scroll and no tile sub-line clipped.
  - **Console:** only React Router's v7 future-flag warnings, which were there before.

### Deviations from plan
1. **PF-1 reads "4 in, 9 out since Sat 7 Feb", not "5 out".**
   - 017's seed closes four more tenders inside the 30-day window: T-2026-046, -058 and -066 withdrawn, and T-2025-438 cancelled.
   - The count balances: pipeline at the start + in − out = pipeline now.
   - Stage 1 holds that 017 closes as "withdrawn" are left out, because they never entered the pipeline.
   - See the decision under Blockers.
2. **Urgency order.** Pure "time left" can't land §12.4, so the order is:
   1. breached;
   2. hard block;
   3. the viewer's own items before items waiting on someone else;
   4. the first item of each type before repeats;
   5. §10.1 type order;
   6. time left;
   7. value.
3. **`dg1.oversight`** lists DG1s that are breached, due today (T-2026-117 at 6 h 10 m sits just outside "within 6 h"), or have no Bid Manager. Faisal's DG1 chip turns orange only when a DG1 is breached, has ≤ 25% of its SLA left, or has no Bid Manager, so it stays outline today.
4. **Tile sub-lines shortened to fit the kit's two-line clamp** with six tiles across:
   - CAP-1: "Water team, next 4 weeks · 96% with T-2026-118". When a team peaks over 100%, the clause is "peaks at X% in Month" instead (Qurain: 88%, peaks at 118% in April).
   - OUT-3: "1 win · 86% of the SAR 164.4 M target". The pro-rated window is in the ⓘ.
   - DEC-6: "SAR 88.9 M after T-2026-097 · as of Thu 5 Mar", with "Finance" as the owner tag, as SCR-6 does.
5. **DEC-4 reads SAR 205.9 M.** 0.58 × 355 = 205.9; the plan's 206 M is rounded. Only issued packs are counted, because 017 gave T-2026-101 a win estimate. `cap: 'see.positions'`.
6. **DEC-6 uses `cap: 'company.view'`.** roles-and-access doesn't tie the facility to `see.margin`. Anyone without that capability sees the builder's masked tile, not a value band.
7. **PF-4** names the *latest* late decision when there are several. For Today, the wording is "No decisions yet today"; PF-2 and PF-3 likewise ("No bids submitted today", "No results yet today").
8. **SCR-6** is orange, and turns red once a credential has expired.
9. **New bands in `PORTFOLIO_BANDS`** where the docs give only part of a rule. These are my demo defaults:
   - PF-3 is orange from 75% of the target hit rate;
   - DEC-6 is orange below 10% of the limit;
   - team load 85 / 100; capacity if won 100 / 115; value won 100 / 70.
10. **Action rows:**
    - Renewal and nudge buttons need `input.request`; everyone else sees the row with a disabled reason.
    - An in-place row shows its done label ("Approved 10:00") and drops off after a reload, because the source reads `done`.
    - `booklet-approved:{TID}` stores `{ at, byId }` as JSON, not 'yes'.
    - `submission.due` also lists Stage 7 bids within 5 working days that are waiting for DG3.
11. **Funnel "Captured"** opens `/radar` when the viewer may see it, rather than the table: notices aren't tenders yet.
12. **`stages.atRisk`** has no comparison: health is known only for now.
13. **Scope:** only `assigned` narrows the KPIs; a `stage` scope doesn't. Note for 013.
14. **`gateChips.ts`** loads the rules with a dynamic import, so the GCC lifecycles stay out of the main bundle. Chips show outline for the first render.

### Blockers / questions
- **Decision needed:** PF-1 reads "9 out", not the example's "5 out" (deviation 1). Either accept 9, or have 017 move the three withdrawals and the cancellation outside the window.
- **Kit CSS (006's file, not edited):** `.kt-label { overflow-wrap: anywhere }` in `components/dashboard/dashboard.css` breaks a tile label mid-word when an owner tag sits beside it: "Credentials at risk" beside "Finance", six tiles across at 1440. A one-line fix is `overflow-wrap: break-word`.
- **Typecheck at close:** `dev-checks/70-stage1.tsx(388,5)`, a parallel session's file (see Verification).

### Follow-ups noticed (not done)
- `domain/gcc/actions/portfolio.actions.ts` imports `isScreenBuilt` from `pages/gcc/screens`, so the domain layer depends on pages. The screen map could move to `data/` or `domain/`.
- 017 closes Stage 1 holds as "withdrawn". A separate closure reason would let PF-1 drop its special case.
- The kit CSS fix above.
