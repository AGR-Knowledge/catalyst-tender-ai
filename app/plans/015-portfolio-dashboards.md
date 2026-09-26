# 015 — Portfolio dashboards: Head of Tendering, CEO, Bid Manager

Status: READY (2026-09-26) · Depends on: 006 (kit, registries, routes), 017 (lifecycles, port) · Can run in parallel with: 013, 019, 021

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
- [ ] 1.1 `data/gcc/portfolio.ts`. These are facts the dashboards need that 004 and 017 don't carry:
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
- [ ] 1.2 Record the resulting DEC-5 readings in the report. Najd: (58 + 9 + 4) ÷ 70 = **101% (orange)**.

### Phase 2 — KPIs (`portfolio.kpi.ts`)
Each entry carries `id`, `label`, `kind`, `info` (verbatim from dashboards.md §11.1 and §11.9, or from the catalogue's "Why" for SCR/DEC/CAP/OUT where §11.9 has it), `cap` if masked, `compute` and `drill`.

**Scope rule.** Compute over `ctx.scope`: `all` for the Head of Tendering and the CEO; `assigned` for the Bid Manager, filtering lifecycles by `bidManagerId`.

- [ ] 2.1 **PF-1 Live pipeline** (state).
  - Live lifecycles whose current stage is 2–8 → count and Σ value in tenant currency (`convert` for other currencies).
  - Display `Money` compact (e.g. "SAR 3.09 bn").
  - Sub: "{count} tenders · {in} in, {out} out since {window.startText}". *In* means pursued at DG1 in the window. *Out* means a no-bid, a DG3 rejection, a withdrawal or a result in the window.
  - For the Bid Manager the label is "My live bids".
  - Drill: table, stages 2–8, Live.
- [ ] 2.2 **PF-2 Average ticket size** (flow).
  - The mean value of `submissionsIn(window)`.
  - Sub: "{n} bids · largest {max}".
  - n = 0 → display "No bids submitted in this period" and no tone.
  - Drill: table, `ids` = those tenders, status All.
- [ ] 2.3 **PF-3 Win / loss** (flow).
  - `resultsIn(window)` → won and lost (withdrawn and cancelled excluded).
  - Display "{won} won · {lost} lost".
  - Sub: "Win rate {p}% (n = {n}) · {value won} won".
  - Tone vs `TENANT_TARGETS.hitRatePct` only when n ≥ `MIN_N`; otherwise neutral, with `smallSample: true`.
  - n = 0 → "No results in this period".
  - Drill: table, those tenders.
- [ ] 2.4 **PF-4 Decisions on time** (flow).
  - `gateEventsIn(window)` for DG1, DG2 and DG3 → on time ÷ total.
  - Display "{pct}%".
  - Sub: "{on} of {total} · {late} late: {gate} on {TID} ({lateBy})", naming the first late one; "all on time" when none are late.
  - Bands from `data/gcc/targets.ts`.
  - n = 0 → "No decisions in this period".
  - Drill: table, those tenders, late first.
- [ ] 2.5 **PF-6 Next submission** (state; the Bid Manager's scope).
  - The nearest `submissionDeadline` among live assigned tenders not yet submitted.
  - Display `When` short ("Thu 12 Mar, 10:00").
  - Sub: "{TID} · {n} working days · next: {TID2} {date}".
  - Tone orange ≤ 5 working days; red ≤ 2 working days with SUB-3 below 100% or signatures pending.
  - Drill: the tracker for that tender (`kind: 'table'` with `ids: [id]` and a select).
- [ ] 2.6 **SCR-6 Credentials at risk** (state), labelled "Credentials at risk".
  - 004 credentials whose `validTo` falls before the opening date (or the validity end, per the PQ line's `validAt`) of **any live bid**.
  - Opening dates come from 004 key dates for Stage 1–3 tenders and from `s8.openingDate` or the submission deadline for later ones.
  - Display the count.
  - Sub: the first one ("Zakat 30 Apr · before T-2026-118 opens 10 May"), and the owner tag.
  - Drill: route `/company` (ComingNext until plan 010).
  - **Najd = 2.**
- [ ] 2.7 **CAP-1 Bid-team load** (state).
  - For each 004 `Team`: committed hours in the next 4 weeks ÷ available hours. Show the busiest team.
  - Sub: "{team}, next 4 weeks · {pct with hero}% if T-2026-118 is pursued", only while the hero has no DG1 record.
  - **Najd = 78%, 96% with the hero; Qurain's water team = 118% in April**, per gcc-demo-data. If 004's data can't produce these, write a Blocker. Don't adjust the maths to force them.
- [ ] 2.8 **SCR-1 DG1 due** (state).
  - Live tenders at step `awaiting-dg1`, or in Stage 1 with no DG1 record and a DG1 SLA end.
  - Sub: "first in {time}" via `SlaClock` text.
  - **Najd (Bid Manager scope, assigned to Omar) = 2, first in 6 h 10 m.**
- [ ] 2.9 **SCR-5 Eligibility risks** (state).
  - Live Stage 1–3 tenders whose `s1.eligibility` has fail > 0 or atRisk > 0.
  - Sub: the most urgent. For Stage 2–3 tenders without `s1` facts, count them only if 017 left an eligibility summary; otherwise note it in the report.
  - **Najd = 3.**
- [ ] 2.10 **DEC-4 Weighted pipeline** (state).
  - Σ value × `s3.win.p` over live Stage 3 tenders with an issued pack or a win estimate.
  - Sub: "{n} bids · unweighted {Σ value}".
  - **Najd = SAR 206 M** (0.58 × 355; T-2026-101 has no estimate yet). If 017 gave T-2026-101 a win estimate, count only issued packs and record it.
- [ ] 2.11 **DEC-5 Capacity if won** (state).
  - (`currentPct` + Σ `addPct` for live Stage 3 tenders) ÷ `safeDeliveryPct`.
  - Tone: ≤ 100% green; ≤ 115% orange; else red.
  - Sub: "{load}% of capacity vs safe {safe}% · as of {asOf}".
- [ ] 2.12 **DEC-6 Facility headroom** (state).
  - 004 `facility`: limit − utilised − Σ committed.
  - Sub: "after T-2026-097: {headroom − its bond}" when a DG2 pack is open, and "Finance, as of {asOf}".
  - Mask with `cap` so that people without `see.margin`, and who aren't Finance or the CFO, see a value band only. Follow roles-and-access §9; if unclear, show the value to `hot`, `exec`, `member`, `fin` and `bid`.
  - **Najd = SAR 96 M.**
- [ ] 2.13 **DEC-7 Inputs outstanding** (state).
  - `s3.inputs.items` not submitted, in scope.
  - Sub: "{late} late · {first late: what · owner}".
  - **Najd = 2, 1 late (Finance, facility).**
- [ ] 2.14 **OUT-3 Value won** (flow).
  - Σ value of results won in the window.
  - Sub: "vs {target pro-rated to the window}". The pro-rated target is `orderIntakeAnnual × days ÷ 365`.
  - Tone: ≥ 100% green; ≥ 70% orange; else red. Neutral when the window is Today or 7 days (too short to judge).
- [ ] 2.15 **Masking.** Every KPI whose value is margin or quote-derived declares `cap`. The builder masks it.

### Phase 3 — The funnel (`portfolio.flow.ts`)
- [ ] 3.1 **PF-5 Decision funnel** over `ctx.scope`, in the window:
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

- [ ] 4.1 **`dg3.approve`** (Head of Tendering): Stage 7 tenders at step `dg3-issued` with no DG3 record.
  - What: "Ready for your approval" or "Evidence incomplete: {n} gaps".
  - Due: `SlaClock` from `dg3IssuedAt` + 48 h.
- [ ] 4.2 **`dg2.approve`** (Head of Tendering): Stage 3 tenders with an issued pack and no DG2 record.
  - What: "{recorded} of 5 positions · quorum needs 3", or "Quorum met: ready for your approval".
  - Adds "pack stale ({reason})" when `s3.stale`.
  - Due: `SlaClock` from `issuedAt` + 24 h.
- [ ] 4.3 **`dg2.position`** (CEO and members, but only on the portfolio for the CEO): the same tenders where the viewer's seat has no entry in `s3.positions.bySeat` (017 amendment).
  - What: "Your position is needed".
  - Route: "Open DG2" or "Open tender".
- [ ] 4.4 **`booklet.approve`** (Head of Tendering): Stage 1 tenders with `s1.documents.requestedById` and no approval in `done`.
  - In place: markKey `booklet-approved:{TID}`.
  - Audit: "Approved booklet purchase {fee} for {TID}".
  - Toast: "Purchase approved. {requester} can buy the booklet on {portal}."
  - Done label: "Approved {time}".
- [ ] 4.5 **`renewal.request`** (Head of Tendering; also the Bid Manager for their tenders): one row per SCR-6 credential.
  - In place: markKey `renewal-requested:{credId}`.
  - Toast: "Renewal requested from {owner}. It is in their requests."
  - 013's My requests reads these keys.
- [ ] 4.6 **`input.nudge`** (Head of Tendering; the Bid Manager for their tenders): late `s3.inputs.items`.
  - In place: markKey `nudged:{itemId}`.
  - Toast: "{owner} has been reminded. The reminder is in the audit log."
- [ ] 4.7 **`dg1.oversight`** (Head of Tendering): DG1 due within 6 h, or breached, on any tender.
  - Waiting on the Bid Manager.
  - The Head of Tendering's button is "Record as delegate" (R7) → "Open DG1" or "Open tender".
- [ ] 4.8 **`dg1.decide`** (Bid Manager): SCR-1's tenders, assigned.
- [ ] 4.9 **`pack.issue`**, **`pack.stale`**, **`submission.due`** (Bid Manager): from `s3` and `s8` facts on assigned tenders, per dashboards.md §10.3.
- [ ] 4.10 **Urgency order:**
  1. breached SLAs;
  2. hard blocks;
  3. time left (smallest first);
  4. value (largest first).

  **Najd, as the Head of Tendering, must list exactly dashboards.md §12.4 items 1–5 in that order, with 7 in "Show all".**

### Phase 5 — Graph metrics (`stages.metric.ts`)
- [ ] 5.1 Axis `stages`, with keys `1`…`9` and labels from `stageLabel`:
  - `stages.count` (Tenders now, state);
  - `stages.value` (Value now, state, tenant currency);
  - `stages.inPeriod` (flow: tenders whose log places them in the stage at any time in the window, via `stageAt` sampling or interval overlap);
  - `stages.atRisk` (state: health at-risk, overdue or blocked);
  - `stages.avgDays` (flow: tenders that left the stage in the window, mean days in it).
- [ ] 5.2 **Comparison:**
  - state metrics compare with the same measure **at `window.from`** (use `stageAt(l, window.from)`, counting only tenders live at that moment);
  - flow metrics compare with the previous window.
- [ ] 5.3 **Gate markers:** after 1 (DG1), 3 (DG2) and 7 (DG3).
- [ ] 5.4 **Point drill:** `route /stages/{n}` when `can(viewer, 'stage.view', { stage: n })`, else `table` with stage n.
- [ ] 5.5 **Summary text for `aria-label`:** "Tenders now by stage: 1 Intake 12, 2 Sourcing 2, …".

### Phase 6 — Gate chips (`gateChips.ts`)
- [ ] 6.1 `useGateChipState(gate)` for the current viewer returns:
  - **`'breached'`** if any tender waiting on the viewer at that gate is past its SLA;
  - **`'waiting-on-me'`** if any is waiting on the viewer;
  - **`'open'`** otherwise.

  Who waits at each gate:
  - DG1 waits on the assigned Bid Manager, or on the Head of Tendering for oversight within 6 h;
  - DG2 waits on the Head of Tendering once quorum is met, and on members without a position;
  - DG3 waits on the Head of Tendering.

  Use the same queries as the action sources; don't duplicate the logic. Export a shared helper from `portfolio.actions.ts` if needed.

### Phase 7 — Dashboard definitions (`portfolio.dash.ts`)
- [ ] 7.1 **`portfolio.hot`**, exactly dashboards.md §10.1:
  - title "Dashboard"; subtitle "{name} · {tenant} · As of {whenText}";
  - tiles PF-1, PF-2, PF-3, PF-4, SCR-6, CAP-1;
  - flow PF-5;
  - actions: dg3.approve, dg2.approve, booklet.approve, dg1.oversight, renewal.request, input.nudge;
  - table: scope all; columns `tid`, `tender`, `stage`, `owner`, `team`, `value`, `due`, `nextGate`, `health`, `source`; optional `captured`, `country`, `sector`, `fit`, `win`, `lastActivity`; sort `newest`; filters stage, status, sector, country, owner, health; status Live;
  - graph: stages; metrics count, value, inPeriod, atRisk, avgDays; default count.
- [ ] 7.2 **`portfolio.exec`**, per §10.2:
  - tiles PF-1, PF-3, OUT-3, DEC-4, DEC-6, DEC-5;
  - actions: dg2.position, plus the Head of Tendering's sources shown as "Waiting on …" (read only, with a disabled reason "The Head of Tendering approves");
  - table and graph as for the Head of Tendering.
- [ ] 7.3 **`portfolio.bid`**, per §10.3:
  - tiles SCR-1, PF-1 (assigned), SCR-5, DEC-7, PF-6, PF-4 (assigned);
  - flow PF-5 (assigned);
  - actions: dg1.decide, pack.issue, pack.stale, submission.due, renewal.request (theirs), input.nudge (theirs);
  - table: scope assigned, with `win` added to the defaults;
  - graph: stages. The drill opens stages 1–8 and filters stage 9.

### Phase 8 — Dev check and target readings
- [ ] 8.1 `dev-checks/50-portfolio.tsx`: for the active tenant and every period, print each tile's display and sub, the funnel parts, the action list (type, TID, what) and the graph points.
  - **For Najd**, show target vs got with ✓/✗ for §12.3 (the PF-2, PF-3, PF-4 and funnel rows) and §12.4 (the action order).
  - Also print PF-1 = "15 tenders · SAR 3.09 bn", SCR-6 = 2, CAP-1 = 78%, DEC-4 = SAR 206 M, DEC-6 = SAR 96 M, DEC-7 = 2 (1 late) and DEC-5 = 101%.
- [ ] 8.2 **Every ✗ is either fixed in the KPI maths or explained in the report** (e.g. a 017 data gap). Never type a value to make a check pass.

## Data and derivation
- **New facts:** `data/gcc/portfolio.ts` (targets and delivery load).
- **Derived:** everything else, from 004 (credentials, teams, facility, validations), 017 (lifecycles, captures, facts) and demo state.
- **New `mark()` keys:** `booklet-approved:{TID}`, `renewal-requested:{credId}`, `nudged:{itemId}`. Each is audited, survives a reload, and is cleared by Reset (this company).
- **Demo-state effects on KPIs** (e.g. an approved booklet purchase removing the action row): the action source reads `done`. KPIs change only where the underlying fact changes; approving a purchase doesn't change INT-10 until the booklet is bought (plan 007).

## Acceptance checks
- [ ] typecheck and build pass; no console errors.
- [ ] **Najd as Faisal Al-Harbi, 30 days (the default):**
  - PF-1 "SAR 3.09 bn · 15 tenders · 4 in, 5 out since Sat 7 Feb";
  - PF-2 "SAR 262.0 M · 3 bids · largest SAR 310.0 M";
  - PF-3 "1 won · 2 lost", neutral, "Win rate 33% (n = 3)";
  - PF-4 "95% · 20 of 21 · 1 late: DG1 on T-2026-107 (3 h)";
  - SCR-6 2; CAP-1 78% (96% with the hero).
  - Funnel: Captured 176 → DG1 4 · 7 · 1 → DG2 4 · 1 → DG3 4 · 0 → Submitted 3 → 1 won · 2 lost.
  - Actions: §12.4 items 1–5, with 7 in "Show all".
  - Table: 29 live rows by default (the Head of Tendering is cleared for the restricted lane; people who aren't see 28), sorted newest first; Status "All" adds closed tenders.
  - Graph: 12 · 2 · 2 · 2 · 2 · 2 · 1 · 4 · 2 (Stage 1 = 12, decided 2026-09-25; see dashboards.md §12.2).
- [ ] **Switching the period** to Today, 7 days, 90 days and 12 months changes the tiles, funnel and graph to the §12.3 values. Needs your action and the table don't change.
- [ ] **Every ⓘ** shows its text and the window range.
- [ ] **Clicks:**
  - a funnel number switches to the Table with a removable chip and exactly those tenders;
  - a tile with a drill does the same;
  - SCR-6 goes to `/company`;
  - a graph point on "2 Sourcing" opens `/stages/2?period=30d`, with the breadcrumb and "Back to my dashboard" (the stage dashboard itself is 013's; until then it shows "not built yet").
- [ ] **Approve purchase** on T-2026-122:
  - the row shows "Approved 10:00";
  - the audit log (the `20-people` dev check shows the last five) has the entry;
  - it survives a reload;
  - Reset (this company) clears it.
- [ ] **Other personas:**
  - **Khalid Al-Mutairi (CFO)** doesn't get this page (his home is Stage 3).
  - **Eng. Abdulaziz Al-Dosari (CEO)** sees §10.2's tiles; approve buttons are disabled with "The Head of Tendering approves"; his own DG2 position row is there if the story leaves his seat empty.
  - **Omar Siddiqui** sees only his tenders; PF-6 "Thu 12 Mar, 10:00 · T-2025-298 · 4 working days".
- [ ] **Other tenants:** each tenant's Head of Tendering sees a DG3 approval in Needs your action, a non-empty funnel at 30 days and at least one result.
- [ ] **Layout:** light and dark, at 1440 and 1280; no horizontal page scroll.
- [ ] **Sidebar gate chips:**
  - DG3 is orange for Faisal (waiting on him).
  - DG2 stays outline for Faisal: quorum isn't met, so it waits on the members, not on him.
  - As Saad Al-Shehri (Operations Director, no position yet), DG2 is orange.
  - As Khalid Al-Mutairi (CFO, position recorded), DG2 is outline.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
