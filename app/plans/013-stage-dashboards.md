# 013 — Stage dashboards (Stages 1–9) and My requests

Status: READY after 006 and 017 are DONE · Depends on: 006 (kit, registries, routes), 017 (lifecycles, facts, port) · Can run in parallel with: 015

## Goal
Every stage has **one dashboard**, used by its owner as their home and opened by the Head of Tendering from the graph. It is the same page for both: "if the tender committee is looking at Stage 3, and the Head of Tendering clicks Stage 3, they both see the same dashboard". The same page also serves the CEO and the Bid Manager where their rights allow.

Each stage dashboard has the six zones of the shared layout, filled for that stage:
- six KPIs that pass the "would you act differently?" test, each with an ⓘ;
- a flow strip of how tenders moved through the stage's steps in the period;
- Needs your action for that stage;
- a table of the stage's tenders with its own columns;
- a graph across the stage's steps.

Finance and HR get **My requests** in the same layout (four tiles, no graph).

## Context
- **Why:** [dashboards.md](../../docs/07-product-design/agr-product-definition/dashboards.md):
  - §10.4–10.13 (every stage dashboard and My requests);
  - §11.2–11.9 (KPI definitions and ⓘ texts);
  - §1 Z3 (the stage flow rule) and Z4 (viewer-aware actions);
  - §8.2 (steps).
- **Also read:**
  - kpi-and-screen-catalogue §A, for the INT, SRC, DEC, OUT and CAP definitions reused here;
  - §C, for each role's question, needs-you-now and rights (still valid);
  - gcc-demo-data §5.3 (**Stage 1–3 target readings for Najd**).
- **After 006 and 017, the code has:** the registries, `buildDashboard`, `DashboardPage`, `usePeriod`, the `/stages/:n` and `/requests` routes, 017's lifecycle queries, the facts, the port, and `isScreenBuilt`. 017's report lists the `row.facts` keys it produces. **Read the real files first.**
- **KPI ownership** (each ID is defined once):
  - **Plan 015 defines:** PF-*, SCR-1, SCR-5, SCR-6, CAP-1, DEC-4, DEC-5, DEC-6, DEC-7, OUT-3.
  - **This plan defines:** INT-1, INT-2, INT-3, INT-4, INT-5, INT-10; SRC-1 … SRC-6, SRC-9; DEC-1, DEC-8; OUT-1, OUT-6; all PLN, PRC, PRP, CMP, SUB, RES and REQ.

  Until 015 lands, the tiles that use its IDs show "Not defined yet" (006's builder). **Final acceptance runs after both plans are done.**
- **Action sources** are referenced by id across dashboards. This plan reuses 015's `booklet.approve`, `dg1.decide`, `dg1.oversight`, `dg2.approve`, `dg2.position`, `dg3.approve`, `pack.issue`, `pack.stale`, `input.nudge`, `renewal.request` and `submission.due`, and doesn't redefine them.

## Scope
**Files to create:**
- **KPIs:** `src/domain/gcc/kpi/stage1.kpi.ts` … `stage9.kpi.ts` (one per stage) and `requests.kpi.ts`.
- **Flows:** `src/domain/gcc/flows/stages.flow.ts` (the generic stage flow, plus the requests flow).
- **Actions:** `src/domain/gcc/actions/stages.actions.ts` (stage-specific sources not in 015) and `src/domain/gcc/actions/requests.actions.ts`.
- **Metrics:** `src/domain/gcc/metrics/steps.metric.ts`.
- **Columns:** `src/components/dashboard/columns/stages.cols.tsx` and `requests.cols.tsx`.
- **Dashboards:** `src/domain/gcc/dashboards/stages.dash.ts` and `requests.dash.ts`.
- **Requests:** `src/domain/gcc/requests.ts` (requests to a person, derived; see Phase 5).
- **Dev check:** `src/pages/gcc/dev-checks/60-stages.tsx`.

**Files to change:** none outside the list.

**Out of scope** (stop and ask):
- Portfolio dashboards (015).
- Working screens and gate screens (007–011, 018).
- The contributor input forms (the pack-input forms of catalogue §C.6). They belong with the pack in plan 009. Until then a request row opens "Open tender".
- New data facts. If a KPI needs a fact 017 didn't provide, write a Blocker. Don't add data here.

## Steps

### Phase 1 — The generic stage pieces
- [ ] 1.1 **`stages.flow.ts`:** `stageFlow(n)` builds a `FlowDef` with id `flow.stage.{n}`:
  - **Steps:** for each step of `GCC_STAGES[n].steps`, the number of tenders whose log has an entry into that step inside the window.
  - **After the steps:**
    - for stages ending in a gate (1 → DG1, 3 → DG2, 7 → DG3), that gate's decisions in the window;
    - otherwise "Moved on" (an entry into stage n+1 in the window, or a result for stage 8) and "Stopped" (closed while in stage n, in the window).
  - **Stage 1** starts with "Captured" (`capturesIn`) and "Linked" (017's `INTAKE_DAILY.linked` plus today's duplicate and addendum events) before its steps.
  - **Drills:** each part's drill is `table` with `ids` = those tenders and status All. Captured and Linked have no drill, because they are notices rather than tenders.
  - **ⓘ:** "How tenders moved through {stage name} in this period: how many entered each step, then moved on or stopped. Counted from each tender's stage history."
- [ ] 1.2 **`steps.metric.ts`**, axis `steps` (keys are the step keys of the stage). Generic metrics:
  - `steps.count` (Tenders now): live tenders whose current step is that step;
  - `steps.value` (Value now);
  - `steps.inPeriod`: in the step at any time in the window;
  - `steps.avgDays`: mean time in the step, for tenders that left it in the window. Stage 1 uses hours ("Average hours in step").

  Stage-specific metrics, each summing the named fact over live tenders per step:
  - `s1.fieldsToCheck` (open 004 validations);
  - `s2.notCovered` (packages not covered: total − covered);
  - `s2.overdueRfqs`;
  - `s3.weighted` (value × win p);
  - `s6.lateSections`;
  - `s7.gaps`.

  **Comparison** as in 015: state metrics at `window.from`, flow metrics against the previous window.

  **Point drill:** `table` filtered to that step. **Summary text** for `aria-label`.

### Phase 2 — KPIs, stage by stage
Every KPI has `info` verbatim from dashboards.md §11 (or §11.9 for reused IDs), and `kind` as stated there. Compute over **live tenders in the stage** (tenant scope), unless the entry says otherwise. Money goes through `Money`, dates through `When`, time left through `SlaClock` text.

- [ ] 2.1 **`stage1.kpi.ts`** (dashboards.md §10.4):
  - [ ] 2.1.1 **INT-1 Captured** (flow): `capturesIn(window)`. Sub: split by source kind ("Etimad 7 · portals 1 · email 2 · scanned 1"). The label becomes "Captured today" when the period is Today.
  - [ ] 2.1.2 **INT-2 Intake to logged** (flow): p90 of intake-to-logged minutes in the window. Use today's 004 events (`loggedAt − receivedAt`) plus `INTAKE_DAILY.minutes`. Sub: "worst {max} min". Tone ≤ 15 green, ≤ 20 orange, else red.
  - [ ] 2.1.3 **INT-3 Missed tenders** (flow): Σ `missed` over the window, plus today's reconciliation. Sub: "last reconciled {time} · {n} sources".
  - [ ] 2.1.4 **INT-4 Sources healthy** (state): 004 `sources` that are healthy ÷ all. Sub: the worst one with its note.
  - [ ] 2.1.5 **INT-5 Fields to check** (state): open 004 validations on live Stage 1 tenders. Sub: "{n} block DG1 · oldest {age}". The age runs from `raisedAt` to the demo clock.
  - [ ] 2.1.6 **INT-10 Documents to buy** (state): live Stage 1 tenders with `s1.documents` of the fee form. Sub: "{TID} · {fee} · closes {purchaseBy}". If `done['booklet-approved:{TID}']` is set, add "· approved, to buy".
- [ ] 2.2 **`stage2.kpi.ts`** (§10.5). SRC-1 … SRC-6 from `s2` facts and the log:
  - **SRC-1 RFQ clock:**
    - **Live:** tenders pursued less than 24 h ago that aren't at `rfqs-out`, shown as time left.
    - **When there are none,** show the trailing form: "RFQs within 24 h of DG1: {pct}", meaning tenders that entered `rfqs-out` in the window within 24 h of their DG1 pursue.
  - **SRC-2 Packages covered:** Σ covered ÷ Σ total. Sub: the least-covered tender ("T-2026-104: 7 of 11").
  - **SRC-3 Replies on time** (state): Σ answeredOnTime ÷ Σ dueSoFar.
  - **SRC-4 Overdue RFQs:** Σ overdue. Sub: "{escalated} escalated".
  - **SRC-5 Open clarifications:** Σ open. Sub: "{stale} stale".
  - **SRC-6 To level:** Σ toLevel.

  **SRC-9 Long-lead at risk** lives here too (reused by Stage 4): Σ `s4.longLeadAtRisk` over Stage 4 tenders when used on the Stage 4 dashboard. Give it a `scopeStage` parameter, or define it over the dashboard's stage via `ctx.scope`.
- [ ] 2.3 **`stage3.kpi.ts`** (§10.6):
  - **DEC-1 Awaiting DG2:** issued packs with no DG2. Sub: "{recorded} of 5 positions · quorum 3 · {time left}".
  - **DEC-8 Stale packs:** `s3.stale` count. Sub: the reason.

  DEC-4 … DEC-7 come from 015.
- [ ] 2.4 **`stage4.kpi.ts`** (§10.7, §11.2):
  - **PLN-1:** tenders not yet at `released` whose `baselineDue` is ≤ `NEAR_WD` working days away or past;
  - **PLN-2:** planned duration > required duration;
  - **PLN-4:** tenders with `clashWith`;
  - **PLN-5** (flow): `workEventsIn(window, 'replan')`. Sub: "p90 {h} h vs 4 h";
  - **PLN-6** (flow): M2 events due in the window, completed by their due date ÷ due.
- [ ] 2.5 **`stage5.kpi.ts`** (§11.3):
  - **PRC-1:** tenders not yet `price-approved` with `priceDue` ≤ 5 working days away or past;
  - **PRC-2** and **PRC-4:** value-weighted `sourcedPct` and `estimatedPct` across Stage 5 tenders (weight = the tender value in tenant currency). Sub: the lowest (PRC-2) or the highest (PRC-4) tender;
  - **PRC-3:** `baseMarginPct < minMarginPct`. **Masked** (`see.margin`);
  - **PRC-5** (flow): re-prices, with p90 vs 2 h;
  - **PRC-6:** `financeCheck === 'pending'`.
- [ ] 2.6 **`stage6.kpi.ts`** (§11.4):
  - **PRP-1:** Σ late sections;
  - **PRP-2:** Σ locked ÷ Σ total. Sub: least advanced, with working days to its deadline;
  - **PRP-3:** `simScore < passMark`;
  - **PRP-4:** Σ `smeOverdue`;
  - **PRP-5** (flow): review events due in the window, held by their due date ÷ due;
  - **PRP-6:** value-weighted `reusePct`.
- [ ] 2.7 **`stage7.kpi.ts`** (§11.5):
  - **CMP-1:** Σ `mandatoryGaps`;
  - **CMP-2:** Σ evidenced ÷ Σ total;
  - **CMP-3:** Σ `redlinesOpen`;
  - **CMP-4:** Σ `risksWithoutOwner`;
  - **CMP-5:** open DG3 (from `openGate`). Sub: SLA left;
  - **CMP-6** (flow): DG3 gate events on time ÷ all, in the window.
- [ ] 2.8 **`stage8.kpi.ts`** (§11.6):
  - **SUB-1:** deadlines within 14 days (not yet submitted);
  - **SUB-2** (flow): `submissionsIn(window)`, on time ÷ all;
  - **SUB-3:** for bids due within 5 working days, the mean `packageReadyPct`, or the least ready as the sub;
  - **SUB-4:** Σ `signaturesPending` on bids due within 5 working days;
  - **SUB-5:** submitted and no result: count and Σ value. Sub: the oldest, in days since submission;
  - **SUB-6:** bids due within 14 days with `bond.issued === false` or `validTo < requiredTo`.
- [ ] 2.9 **`stage9.kpi.ts`** (§11.7):
  - **OUT-1 Hit rate** (flow, with n, small-sample rule as PF-3);
  - **OUT-6 Why we lose** (flow): the top loss reason in the window, with counts ("Price 1 · Technical 1"). A tie shows both;
  - **RES-1:** awaiting-result tenders whose `expectedAwardBy` is in the past;
  - **RES-2:** won tenders with no `handover` event. Sub: days since award;
  - **RES-3** (flow): results in the window with a `lessons` event ÷ results in the window.

  OUT-3 comes from 015.
- [ ] 2.10 **Masking:** every KPI that reveals margin or quotes declares `cap`.

### Phase 3 — Stage action sources (`stages.actions.ts`)
Route actions use `isScreenBuilt` exactly as 015 does ("Open …" when the screen is built, otherwise "Open tender").

**Every row sets `waitingOn`** to the stage owner (or the named person), so the Head of Tendering sees "Waiting in {stage}" rows with names. The owner's view shows them as their own.

- [ ] 3.1 **Stage 1:**
  - `validation.check`: open 004 validations, blocking first. Route `/intake-queue`.
  - `addendum.confirm`: today's 004 intake events with disposition `addendum`. For example, "Addendum 2 for T-2026-097 received 09:12: confirm the link". Route `/radar`.
  - `booklet.status` (Coordinator view): purchase requests waiting on the Head of Tendering. Informational, with the disabled reason "Waiting for Faisal Al-Harbi's approval".
  - Reuse `booklet.approve` (015) for the Head of Tendering, and `dg1.decide` (015) for the Bid Manager.
- [ ] 3.2 **Stage 2:**
  - `rfq.send`: tenders pursued less than 24 h ago that aren't at `rfqs-out`;
  - `rfq.escalations`: escalated overdue RFQs, per tender ("2 non-responders escalated on T-2026-104");
  - `levelling.confirm`: `toLevel` > 0;
  - `clarifications.stale`: stale > 0.

  Routes `/sourcing` and `/levelling`.
- [ ] 3.3 **Stage 3:** reuse `dg2.approve`, `dg2.position`, `pack.issue`, `pack.stale` and `input.nudge` (015).
- [ ] 3.4 **Stages 4–6** (no working screens, so the button is "Open tender"):
  - `baseline.due` (PLN-1 tenders);
  - `programme.overrun` (PLN-2);
  - `replan.open` (a re-plan event in the last 24 h with a turnaround still open, if 017 models it; otherwise skip and note it);
  - `price.due` (PRC-1);
  - `margin.below` (PRC-3, masked for roles without `see.margin`: the row says "A price needs a margin decision");
  - `finance.pending` (PRC-6);
  - `sections.late` (PRP-1);
  - `score.below` (PRP-3);
  - `review.due` (a review event due within 5 working days and not held).
- [ ] 3.5 **Stage 7:**
  - `gaps.open` (CMP-1 > 0);
  - `redlines.open`;
  - `dg3.issue` (tenders at `redlines` with no gaps, ready for the DG3 pack; Compliance only);
  - reuse `dg3.approve` (015) for the Head of Tendering.
- [ ] 3.6 **Stage 8:**
  - reuse `submission.due` (015);
  - `signatures.pending`;
  - `bond.issue` (SUB-6 tenders).
- [ ] 3.7 **Stage 9:**
  - `handover.start` (RES-2);
  - `debrief.hold` (lost in the last 30 days with no `debriefAt`);
  - `lessons.record` (results with no `lessons` event after 14 days);
  - `result.chase` (RES-1: "Result expected by Thu 5 Mar. Worth a call to the employer.").

### Phase 4 — Columns (`stages.cols.tsx`)
- [ ] 4.1 One column per stage-specific header in dashboards.md §10.4–10.12. Each reads a `row.facts` key from 017; list the mapping in the report. Formatting:
  - counts "7 / 11";
  - percentages "88%";
  - money via `Money`;
  - dates via `When`;
  - SLAs via `SlaClock`;
  - state words via `StatusPill`;
  - **masked** facts via `Masked`.
- [ ] 4.2 Column ids are prefixed by stage (`s1.fields`, `s2.covered`, `s3.positions`, `s4.duration`, `s5.margin`, `s6.sections`, `s7.gaps`, `s8.deadline`, `s9.result` …).
  - Value getters return sortable raw values.
  - Headers match dashboards.md exactly.

### Phase 5 — My requests
- [ ] 5.1 **`domain/gcc/requests.ts`:** `requestsFor(tenant, personId, done)` returns `Request[]`, where `Request = { id; tenderId; what; section; requestedById; requestedAt; due; status: 'open' | 'late' | 'submitted' | 'accepted'; submittedAt? }`. Its sources:
  - 017's `s3.inputs.items` where `ownerId === personId`:
    - submitted → `submitted`;
    - submitted, and the pack was later issued → `accepted`;
    - otherwise `open`, or `late` if past due;
  - renewal requests from `done['renewal-requested:{credId}']` (015's in-place action), for credentials whose `ownerId === personId`:
    - what: "Renew {credential}";
    - section: "Company credentials";
    - requested by the Head of Tendering;
    - due: 10 working days before the affected bid's opening.
- [ ] 5.2 **`requests.kpi.ts`:** REQ-1 open (open + late); REQ-2 due in 48 h; REQ-3 late; REQ-4 submitted in the window (flow).
- [ ] 5.3 **`requests.flow.ts` part of `stages.flow.ts`:** Requested → Submitted → Accepted, in the window.
- [ ] 5.4 **`requests.actions.ts`:** each open request is a row: "{what} for {TID}" · due · "Open tender". It becomes "Open form" when plan 009 builds the forms.
- [ ] 5.5 **The requests table** uses 006's `table.kind: 'requests'` with `rows(ctx) = requestsFor(...)`. `requests.cols.tsx` registers the request columns with `appliesTo: 'request'`: Tender · What's asked · For · Requested by · Due · Status. If 006 deviated and this extension point is missing, stop and write a Blocker.
- [ ] 5.6 **`requests.dash.ts`:**
  - key `requests`;
  - four tiles;
  - flow `flow.requests`;
  - actions `request.open`;
  - no graph.

### Phase 6 — Dashboard definitions (`stages.dash.ts`)
- [ ] 6.1 **`stage.1` … `stage.9`**, exactly dashboards.md §10.4–10.12:
  - tiles in the listed order;
  - flow `flow.stage.{n}`;
  - actions as Phase 3;
  - table: scope `{ kind: 'stage', stage: n }`, the listed columns, default sort as listed, filters `step`, `health`, `owner` (plus `status` on stage 9);
  - graph: `{ axis: 'steps', stage: n }` with the listed metrics.
- [ ] 6.2 **Titles and subtitles:**
  - Title: "Stage {n} · {short}". On the owner's home the title is still "Stage {n} · {short}", and the Dashboard nav item is active.
  - Subtitle: "{full name} · {owner name}, {owner role}" (e.g. "Subcontractor & Internal Input Orchestration · Joseph Mathew, Procurement Lead").
  - 006's breadcrumb and "Actions follow your own rights" line appear when the viewer isn't the owner.
- [ ] 6.3 **Stage 8's owner** is the Bid Manager, but Stage 8 isn't their home. Their sidebar entry "8 Submission" links to it.

### Phase 7 — Dev check and readings
- [ ] 7.1 `dev-checks/60-stages.tsx`: for the active tenant, a selector for stage 1–9 or requests, and every period. It prints each tile (display and sub), the flow parts, the action rows, the graph points and the first five table rows.
- [ ] 7.2 **Najd target readings** (✓/✗):
  - **Stage 1 (Today):** INT-1 11 (Etimad 7 · portals 1 · email 2 · scanned 1); INT-2 p90 11 min, worst 14; INT-3 0 (reconciled 06:00, 9 sources); INT-4 8 of 9 (Etimad credentials expire Fri 13 Mar); INT-5 6 (2 block DG1, oldest 2 h 16 m); INT-10 1 (T-2026-122, SAR 3,000, closes Tue 10 Mar).
  - **Stage 2:** SRC-1 trailing 100%; SRC-2 7 of 11 (T-2026-104) in the sub; SRC-3 71%; SRC-4 4 (2 escalated); SRC-5 6 (0 stale); SRC-6 5.
  - **Stage 3:** DEC-1 1 (2 of 5 · quorum 3 · 4 h 10 m); DEC-8 1 (Addendum 2).
  - **Stage 5:** PRC-3 1 (T-2025-329, 7.8% vs 9.0%); PRC-6 1.
  - **Stage 6:** PRP-3 1 (T-2025-317, 68 vs 70); PRP-1 3.
  - **Stage 7:** CMP-5 1 (T-2025-305, 30 h left); CMP-1 0.
  - **Stage 8:** SUB-1 1 (T-2025-298, Thu 12 Mar 10:00, 4 working days); SUB-5 3 (SAR 786.0 M, oldest T-2025-284 · 21 days).
  - **Stage 9 (30 days):** OUT-1 "1 won · 2 lost"; RES-1 1 (T-2026-079); RES-2 1 (T-2025-262, 12 days); RES-3 1 of 3.
  - **My requests** (Sultan Al-Anazi, 30 days): REQ-1 1; REQ-3 1 (the T-2026-101 facility input); REQ-4 1 (the T-2026-097 finance input, 5 Mar).

  Stage 4 readings and the remaining Stage 5–6 readings are whatever the data gives. **List them in the report** and confirm they read sensibly (e.g. PRC-2 about 90% orange, PRC-4 about 5.6% orange).
- [ ] 7.3 **Every ✗ is fixed in the maths, or explained** (a data gap, as a Blocker for the orchestrator). Never type a value.

## Data and derivation
- **No new facts.** Everything derives from 004 (sources, validations, intake events, credentials), 017 (lifecycles, facts, events, daily intake) and demo state (`done` keys from 015's in-place actions).
- **No new `mark()` keys** in this plan: its action rows route, or reuse 015's in-place actions.

## Acceptance checks
Run these after both 013 and 015 are DONE.
- [ ] typecheck and build pass; no console errors on any stage dashboard, as any persona.
- [ ] **Same page, two viewers:**
  - As Joseph Mathew, `/` shows Stage 2 · Sourcing with "Needs your action".
  - As Faisal Al-Harbi, clicking "2 Sourcing" in his graph opens `/stages/2?period=30d` with **the same tiles, flow, table rows and graph**. The action zone is titled "Waiting in Sourcing", with names. There's a breadcrumb and "Back to my dashboard".
  - Also check Stage 3 as Khalid Al-Mutairi (CFO, his home) against Faisal's view of Stage 3.
- [ ] **Masking on the same page:** on Stage 5, Faisal sees base margins, and a Procurement Lead can't open Stage 5 at all ("Stage 5 is outside your role"). On Stage 3, the margin range column is masked for the Bid Manager if the tenant setting says so; otherwise it is visible (roles-and-access §9).
- [ ] **Every stage dashboard at every period:** tiles, flow, graph and table render. Periods change the flow and graph and the flow-kind tiles; state tiles change only their "since" sub-line.
- [ ] **Clicks:**
  - a step in the graph switches to the Table filtered to that step;
  - a row click opens the tracker;
  - "Open tender" opens `/tenders/:id`.
- [ ] **Stage 7 as Faisal:** the DG3 approval row appears (015's source), and the sidebar's DG3 chip is orange.
- [ ] **My requests as Sultan Al-Anazi:**
  - four tiles and the request table, with no toggle;
  - after Faisal clicks "Request renewal" for Zakat on his dashboard, switch to Sultan: the renewal request appears; it survives a reload, and Reset clears it.
- [ ] **Other tenants:** each stage dashboard renders for Corniche, Dafna, Batinah and Qurain with non-empty data where their register has tenders. Where a stage is empty, `EmptyState` says why: "No tenders are in Stage 3 now. Tenders arrive here after sourcing."
- [ ] **Layout:** light and dark, at 1440 and 1280.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
