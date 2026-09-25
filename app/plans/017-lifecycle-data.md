# 017 — Tender lifecycles, Stage 4–9 register and dated history

Status: READY after 004 is DONE · Depends on: 004 (types, registers, history); 006 Phase 1 (`domain/gcc/viewmodels.ts`) for Phase 5 only · Can run in parallel with: 006

## Goal
Every GCC tender has a **lifecycle**: when it entered each stage and step, who had it, each gate decision (on time or not), its submission and its result. So:
- the period filter (Today … 12 months) gives real, different numbers;
- the graph can say how many tenders were in each stage on any date;
- the tracker can show "passed, current, not reached" with names and dates.

The five tenants gain their **Stage 4–9 register** (dashboards.md §12.2 and §12.5), with the step facts the stage dashboards need. A dated history is also generated around plan 004's records so that, for Najd, **every flow in dashboards.md §12.3 lands exactly**.

The plan ends with the **data port**. It implements `DataPort` from plan 006: the table rows and the tracker view model. After this, dashboards render real tenders.

## Context
- **Why:** [dashboards.md](../../docs/07-product-design/agr-product-definition/dashboards.md):
  - §12 (all of it);
  - §2 (windows);
  - §5 (health vocabulary);
  - §7 (tracker);
  - §8.2 (steps);
  - §9 (DG2 against the majority, DG3).
- **Also read:**
  - gcc-demo-data §2 (tenants, teams, people), §5 (registers and story) and §5.1 "History", including its correction note;
  - plan 004's Execution report (what was actually built, the IDs used and any deviations).
- **Current behaviour (after 004):**
  - `src/data/gcc/types.ts` has `GccTender` with `stage: 'S1' | 'S2' | 'S3' | 'DG2' | 'later' | 'closed'`, `Dg1Record`, `Dg2History`, `BidOutcome` and `TenantData`, whose `history` holds `outcomes`, `dg1` and `dg2`.
  - The tenant files `src/data/gcc/tenants/*.ts` hold registers and history. Najd has 33 outcomes, 46 DG1 records (90 days) and 18 DG2 records.
  - Rows for Stages 4–9 don't exist, except T-2026-088 ("later") and T-2026-079.
  - DG3, submissions and stage logs don't exist.
  - **Verify all of this against the real files before you start.** 004 may have deviated; its report says how.
- **Why generate rather than hand-type 2,000 records:** a real tendering register has a year of history. Only a small part of it is story-critical (dashboards.md §12.2–12.4), so those parts are hand-authored and fixed. The rest is generated deterministically **at module load** (a seeded PRNG, no `Date.now()`, no `Math.random()`), so every load gives the same data. Everything the dashboards show is derived from the records, never from the target counts. The targets exist only to steer generation and to be checked.

## Scope
**Files to create:**
- **Lifecycle data:**
  - `src/data/gcc/lifecycle/types.ts`;
  - `src/data/gcc/lifecycle/pools.ts` (fictional title parts, issuers and value ranges per tenant);
  - `src/data/gcc/lifecycle/targets.ts` (flow targets per tenant, from dashboards.md §12.3 and §12.5);
  - `src/data/gcc/lifecycle/live/najd.ts`, `corniche.ts`, `dafna.ts`, `batinah.ts`, `qurain.ts` (hand-authored live and recently closed lifecycles with step facts);
  - `src/data/gcc/lifecycle/generate.ts` (the deterministic history generator);
  - `src/data/gcc/lifecycle/index.ts` (`LIFECYCLES: Record<GccKey, Lifecycle[]>`, `INTAKE_DAILY`).
- **Queries and port:**
  - `src/domain/gcc/lifecycle.ts` (queries);
  - `src/domain/gcc/lifecycle.port.ts` (the `DataPort` implementation; picked up by 006's `port.ts` glob).
- **Dev check:** `src/pages/gcc/dev-checks/40-lifecycle.tsx`.

**Files to change:**
- `src/data/gcc/types.ts`: only to add what this plan needs (e.g. `'S4' … 'S9'` where `GccTender.stage` must express them). Prefer deriving the stage from the lifecycle and marking `GccTender.stage` as legacy in a comment.
- `src/data/gcc/tenants/*.ts`: fold `history` into lifecycles (Phase 3.4); fix the sector names on rows if they don't use the tenant's sector names.
- `src/data/gcc/index.ts`: export the lifecycle access if 004's index is the public entry.
- `src/pages/gcc/dev-checks/30-seed.tsx`: only if a history count it prints moves to the lifecycle source.

**Out of scope** (stop and ask):
- KPI definitions, dashboards, action sources and columns (015, 013).
- Detailed RFQs, quotes and packs (008, 009): Stage 2 and 3 step facts are interim summaries.
- Changing plan 004's hero tender data, fit inputs or credentials.
- Any UI beyond the dev-check panel.

## Steps

### Phase 0 — Read and reconcile
- [x] 0.1 Read 004's tenant files and Execution report. List in this plan's report the IDs and dates of 004's register rows and history records, per tenant, and anything that contradicts dashboards.md §12. Examples: an ID already used by one of the new rows, or DG1 dates that make the 7-day and 30-day targets impossible.
- [x] 0.2 Where 004's dated records conflict with a §12.3 anchor, **the anchor wins**. You may re-date 004's generated history records (not its story rows in gcc-demo-data §5.1) to fit, keeping their 90-day and 12-month totals. Record every re-dating.

### Phase 1 — Types
- [x] 1.1 `lifecycle/types.ts`:

  ```ts
  export type StageN = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  export interface StageEntry { stage: StageN; step: string; at: string; ownerId: string | null }   // an entry into a stage/step; ISO local date-time
  export interface GateRecord {
    gate: 'DG1' | 'DG2' | 'DG3'; decision: 'pursue' | 'discard' | 'hold' | 'bid' | 'no-bid' | 'approved' | 'rejected';
    at: string; byId: string; openedAt: string; slaHours: number; onTime: boolean;
    reasonCodes: string[]; againstMajority?: boolean; reopened?: string; note?: string;
  }
  export interface Submission { at: string; deadline: string; onTime: boolean; portal: string; receipt?: string }
  export interface Result { at: string; result: 'won' | 'lost' | 'withdrawn' | 'cancelled'; rank?: [number, number]; gapToWinnerPct?: number;
                            lossReason?: 'price' | 'technical' | 'local-content' | 'pq' | 'other'; predictedWin?: number; value?: Money }
  export type WorkEvent = { kind: 'replan' | 'reprice'; at: string; turnaroundH: number; trigger: string }
                        | { kind: 'm2'; at: string; due: string } | { kind: 'review'; at: string; due: string }
                        | { kind: 'lessons'; at: string } | { kind: 'handover'; at: string };
  export interface Lifecycle {
    tenderId: string; title: string; shortTitle: string; issuer: string; city: string; country: string; sector: string;
    value: { amount: number; ccy: Ccy; basis: 'published' | 'estimate' | 'not-stated' };
    teamId: string; bidManagerId: string | null;
    source: { sourceId: string; ref: string; url?: string; documentHref?: string };
    capturedAt: string; submissionDeadline?: { date: string; time: string };
    log: StageEntry[];            // ordered; the last entry is the current stage/step for live tenders
    gates: GateRecord[]; submission?: Submission; result?: Result; closedAt?: string;
    closedAs?: 'discarded' | 'no-bid' | 'rejected' | 'withdrawn' | 'won' | 'lost';
    events: WorkEvent[];
    facts?: StepFacts;            // live tenders only: the current step's numbers
    origin: 'story' | 'live' | 'generated';   // story = gcc-demo-data §5.1 rows; live = this plan's hand-authored rows
  }
  ```
- [x] 1.2 `StepFacts`: a discriminated union by stage, exactly these fields. The stage dashboards (013) read them; plans 007–009 later replace the Stage 1–3 ones with derivations.
  - **`s1`:** `{ eligibility: { pass; atRisk; fail }; documents: 'downloaded' | { fee: Money; purchaseBy: string; requestedById?: string; requestedAt?: string }; language: 'EN' | 'AR' | 'EN+AR'; dg1Due?: string }`. T-2026-122's purchase was requested by `najd.coord` at `2026-03-08T08:05` and waits for the Head of Tendering's approval (dashboards.md §12.4 item 3). Fields to check come from 004's `validations`; don't copy them.
  - **`s2`:** `{ packages: { total; covered }; rfqs: { sent; total; overdue; escalated; answeredOnTime; dueSoFar }; toLevel: number; notCoveredPct: number; repliesDue: string; clarifications: { open; stale }; bestFitApproved: number }`.
  - **`s3`:** `{ pack: 'preparation' | 'issued'; issuedAt?: string; inputs: { requested; outstanding; late; items: { id; what; section; ownerId; requestedById; requestedAt; due; submittedAt?: string }[] }; stale?: { since: string; reason: string }; positions: { recorded: number; of: 5; bySeat: Partial<Record<Seat, { stance: 'support' | 'conditions' | 'oppose' | 'abstain'; at: string; comment?: string }>> }; win: { p; band }; marginRange: [number, number]; facilityAfter: Money; weightedValue?: Money }`.
  - **Amendment (orchestrator, 2026-09-25, before Phase 1 was built): `s3.positions.bySeat`.** Plan 015's `dg2.position` action needs to know *which* seats have a position, not only how many. `Seat` comes from `data/people.ts` (006 renames `chair` to `ceo`). `recorded` must equal the number of `bySeat` entries (assert it in the 40-lifecycle check). T-2026-097 in Najd: `cfo` `{ stance: 'conditions', at: '2026-03-07T18:40', comment: 'Keep the bid bond within the facility; minimum margin 9%' }` and `technical` `{ stance: 'support', at: '2026-03-08T08:15' }` (gcc-demo-data §8). Other tenders at DG2 in other tenants: pick seats to match their `recorded` count. Plan 009a later derives this from its own positions record and checks that the two agree.
  - **`s4`:** `{ durationPlannedM; durationRequiredM; floatDays; longLeadAtRisk; peakManpower; baselineDue: string; m2Due: string; clashWith?: string }`.
  - **`s5`:** `{ estPrice: Money; baseMarginPct; minMarginPct; sourcedPct; estimatedPct; financeCheck: 'pending' | 'confirmed'; priceDue: string; m2Due: string }`.
  - **`s6`:** `{ sections: { locked; total; late }; simScore; passMark; smeOverdue; redTeamAt?: string; reusePct }`.
  - **`s7`:** `{ requirements: { evidenced; total }; mandatoryGaps; redlinesOpen; risksWithoutOwner; dg3IssuedAt?: string }`.
  - **`s8`:** `{ packageReadyPct; signaturesPending; bond: { amount: Money; validTo: string; requiredTo: string; issued: boolean }; openingDate: string; expectedAwardBy?: string }`. Deadline and portal are on the lifecycle and submission.
  - **`s9`:** `{ handoverAt?: string; debriefAt?: string; lessons: boolean }`. The result itself is on `result`.

### Phase 2 — Hand-authored lifecycles
- [x] 2.1 `live/najd.ts`: every row in dashboards.md §12.2 and every recently closed tender listed there. Rows of gcc-demo-data §5.1 get lifecycles consistent with 004's register (same IDs, titles, values, dates, people).
  - [x] 2.1.1 **Values and dates exactly** as in §12.2–12.4. Examples:
    - T-2025-305: DG3 pack issued `2026-03-07T16:00`, SLA 48 h;
    - T-2026-097: pack issued `2026-03-07T14:10`, positions 2 of 5, stale since `2026-03-08T09:12` (Addendum 2);
    - T-2025-298: deadline Thu 12 Mar 10:00, bond SAR 2.3 M valid to 10 Jun;
    - T-2025-270: lost Thu 5 Mar, price, rank [2, 6], gap 6.8%.
  - [x] 2.1.2 **Stage logs** for each row, from capture to now. Durations should be plausible:
    - Stage 1 1–5 days; DG1 within 24 h (except T-2026-107, 27 h);
    - Stage 2 10–20 days; Stage 3 3–8 days;
    - Stages 4–7 20–45 days in total; DG3 1–3 days before submission.

    **Owners are the stage owners from dashboards.md §8.1** (people ids from plan 003 and 006: `najd.coord`, `najd.proc`, `najd.plan`, `najd.comm`, `najd.prop`, `najd.comp`, `najd.bid`, `najd.dir`). At DG2 and DG3 the owner is `najd.hot`.
  - [x] 2.1.3 **Step facts** for every live row, as in §12.2. T-2026-101's inputs are two items: "Facility headroom and bond capacity" (owner `najd.fin`, due Sat 7 Mar 17:00, not submitted: **late**) and "Top five contract risks" (owner `najd.comp`, due today 17:00). T-2026-097's inputs are all submitted, Finance's on Thu 5 Mar 15:20. **Stage 2 facts** (they give the catalogue's §5.3 readings):
    - T-2026-104: packages 11, covered 7; RFQs sent 33 of 33; overdue 4, escalated 2; answered on time 22 of 31 due so far (71%); to level 5; clarifications open 4, stale 0; not covered 3.1%.
    - T-2026-109: packages 9, covered 0; RFQs sent 27 of 27; due so far 0; clarifications open 2, stale 0; replies due Sun 15 Mar.

    **Stage 8 facts:**
    - T-2025-298: package ready 88%.
    - T-2026-079: `expectedAwardBy` Thu 5 Mar, so its result is overdue (RES-1).
    - T-2025-291 and T-2025-284: expected in April. For Stage 1 rows, use the 004 story (hero: 2 blocking fields; T-2026-117 DG1 due 16:10; T-2026-122 notice only, SAR 3,000, purchase by Tue 10 Mar).
  - [x] 2.1.4 **`events`:** for Najd live tenders in Stages 4–6, add a few dated re-plans, re-prices, M2 and reviews, so PLN-5, PLN-6, PRC-5 and PRP-5 read sensibly in 7 days and 30 days. For example:
    - one re-plan on T-2025-336 on Tue 3 Mar, turnaround 3.5 h, trigger "Quote lead time";
    - one re-price on T-2025-322 on 1 Mar, 1.5 h, "Addendum 1";
    - a red-team review on T-2026-088 due Tue 10 Mar, not yet held.

    List them in the report.
- [x] 2.2 `live/corniche.ts`, `dafna.ts`, `batinah.ts`, `qurain.ts`:
  - [x] 2.2.1 **Counts:** 004's Stage 1–3 rows plus new Stage 4–9 rows so the live counts equal dashboards.md §12.5.
  - [x] 2.2.2 **Rows:** fictional titles in the tenant's sectors and country, values in the tenant's value band (004 `fit.band`) and currency, owners from the tenant's people. Use these as the new rows (edit freely for plausibility; keep them fictional; place names are fine, and no real company or project names):
    - **Corniche (AED):**
      - S4 Al Reem mixed-use tower MEP (145 M);
      - S5 logistics district cooling plant, Dubai (210 M);
      - S6 Sharjah hospital MEP package (118 M);
      - S7 Abu Dhabi school cluster MEP (64 M, DG3 pack issued Sat 7 Mar 12:00);
      - S8 Deira hotel fit-out (52 M, signatures) and Ajman university MEP (96 M, awaiting result);
      - S9 Al Ain mall MEP (lost, price).
    - **Dafna (QAR):**
      - S4 Al Khor utility corridor, Package 2 (180 M);
      - S5 Umm Salal pump station upgrade (75 M);
      - S6 Mesaieed stormwater outfall (220 M);
      - S7 Al Rayyan sewer rehabilitation (95 M, DG3 pack issued Sat 7 Mar 15:30);
      - S8 Doha industrial area utilities (140 M, assembling) and drainage tunnel shafts (60 M, awaiting result);
      - S9 Lusail utility spur (won).
    - **Batinah (OMR):**
      - S4 Sur coastal road widening (18 M);
      - S5 Nizwa interchange bridges (12 M);
      - S6 Ibri bypass earthworks (9 M);
      - S7 Duqm port access road (22 M, DG3 pack issued Sun 8 Mar 08:30);
      - S8 Barka link road dualling (15 M, signatures) and Rustaq wadi crossing bridges (7 M, awaiting result);
      - S9 Sohar industrial roads (won).
    - **Qurain (KWD):**
      - S4 Jahra water network extension (14 M);
      - S5 Ahmadi pumping station upgrade (9 M);
      - S6 Subiya water transmission line (22 M);
      - S7 oil-field water injection pipeline, Wafra (11 M, DG3 pack issued Sat 7 Mar 17:00);
      - S8 Mutlaa stormwater network (16 M), Kabd sewage treatment rehabilitation (12 M) and Khairan residential water network (18 M; one assembling, two awaiting result);
      - S9 Shuwaikh water storage tanks (won).
  - [x] 2.2.3 **Every tenant**, per dashboards.md §12.5:
    - its Stage 7 tender has a DG3 pack waiting for its Head of Tendering;
    - at least one DG1 decision in the last 7 days;
    - at least one result in the last 30 days.
  - [x] 2.2.4 **Dates and working days follow each tenant's calendar** (`domain/calendar.ts`): UAE, Qatar, Oman and Kuwait have Fri–Sat or Sat–Sun weekends, as 002 defines. Submission deadlines never fall on a weekend or an expected closure.
- [x] 2.3 **Source URLs** for synthetic tenders use `.example` hosts only, per the tenant's portal:
  - `https://etimad.example/…`;
  - `https://tejari.example/…` for UAE;
  - `https://monaqasat.example/…` for Qatar;
  - `https://tenderboard.example/…` for Oman;
  - `https://capt.example/…` for Kuwait.

  The hero and the three real documents set `documentHref` to their PDF in `public/bids/`. **Never write a real portal hostname into a URL field.**

### Phase 3 — Generated history
- [x] 3.1 `lifecycle/targets.ts`: `FLOW_TARGETS`:
  - **Najd:** the full table of dashboards.md §12.3, for each of today, 7d, 30d, 90d and 12m: captured; DG1 by decision and on time; DG2 by decision and on time; DG3 by decision and on time; submitted; average ticket in SAR; results won and lost.
  - **B–E:** the 12-month totals of §12.5 only.

  Also `RESULT_SPLITS` for Najd:
  - won by sector (Water 7, Roads 2);
  - loss reasons (price 13, technical 5, local-content 3, pq 1, other 2);
  - calibration bands (> 70: 3 bids, 2 won; 50–70: 7, 4; 30–50: 10, 3; < 30: 13, 0);
  - DG2: 2 against the majority and 2 re-opened;
  - DG1: 4 overrides, 3 of them "client relationship"; discard reasons out-of-scope 11, below-value 6, pq-fail 5, insufficient-time 4, capacity 3 (90 days).
- [x] 3.2 `lifecycle/pools.ts`: per tenant, lists to build fictional titles from:
  - 20+ city and district names in the tenant's countries;
  - 12+ work types per sector;
  - 6+ **fictional** issuer names ("Eastern Cities Water Services Company" is the hero's; invent others in the same style, never a real authority or company);
  - value ranges per sector in tenant currency.
- [x] 3.3 `lifecycle/generate.ts`: `generateHistory(tenant, fixed: Lifecycle[], targets, pools, seed): Lifecycle[]`. It is deterministic: mulberry32 seeded from the tenant key.
  - [x] 3.3.1 **Chain shapes:**
    - (a) DG1 discard or hold only;
    - (b) pursue → withdrawn in Stage 2 or 3;
    - (c) pursue → DG2 no-bid;
    - (d) pursue → DG2 bid → DG3 rejected;
    - (e) pursue → bid → approved → submitted → won or lost.

    Each chain has a full stage log **at step level** (every step of every stage it passed, with owners), gate records with `openedAt`, `slaHours` and `onTime`, and `closedAt`/`closedAs`.

    Stage 2 step timing: a chain enters `rfqs-out` within 24 h of its DG1 pursue in at least 95% of chains, and in 100% of Najd's chains in the last 90 days (SRC-1's trailing reading).

    Chains that pass Stages 4–6 also get work events: a re-plan in about 40% of them (turnaround 1–6 h), a re-price in about 50% (0.5–4 h), an M2 each (about 85% on time), and a red-team review each (about 90% held by their due date). Results get a `lessons` event within 14 days for about 85% of them, and wins get a `handover` event within 10 days.
  - [x] 3.3.2 **Placement:**
    - Split each window into disjoint bands: today · the rest of 7 days · the rest of 30 · the rest of 90 · the rest of 12 months · before (backfill).
    - Band quotas are differences of the window targets, after subtracting the fixed records (story and live) that fall in each band.
    - Build type (e) chains **backwards from their result dates** first, since results are the most constrained. Then add (a)–(d) to fill the DG1, DG2 and DG3 quotas.
    - Shift durations within their ranges until every band quota is met exactly. Chains whose early events fall before the 12-month window are allowed (backfill).
    - Only working days of the tenant's calendar, and working hours 08:00–17:00 local, except where a story row says otherwise.
  - [x] 3.3.3 **Values:** from pools, adjusted so Najd's average ticket per window equals §12.3 exactly. The average is computed on submissions in the window, rounded to 0.1 M in display. Store amounts in major units.
  - [x] 3.3.4 **Splits:** apply `RESULT_SPLITS` (sector, loss reason, predicted-win band, against-majority, re-opened, overrides, discard reasons) to the generated plus fixed records, so the totals match.
  - [x] 3.3.5 **Tenant B–E totals:** meet the 12-month totals exactly. Spread them plausibly across bands, with more activity on working days and none on expected closures.
  - [x] 3.3.6 **Capture volumes:** `INTAKE_DAILY: Record<GccKey, { date: string; bySource: Record<string, number>; linked: number; logged: number; screened: number; minutes: number[]; missed: number }[]>` for the 365 days **before** today. `minutes` holds intake-to-logged minutes, one per logged notice, so INT-2's p90 over any window is exact. `missed` is the daily reconciliation result: Najd has one missed notice on a working day in October 2025 and none since; the others have none. Today's captures come from 004's `intakeToday` events, so they are counted once. For Najd, the sums per window equal the "Notices captured" row of §12.3 (today 11 from events; 7 days = 11 + 33 daily; and so on). Weekends and closures have lower volumes.
- [x] 3.4 **Fold 004's history into lifecycles.**
  - Every `Dg1Record`, `Dg2History` and `BidOutcome` of 004 becomes a gate record or result on a lifecycle (existing tender IDs where they exist; otherwise a generated tender that carries it).
  - Then either:
    - (a) remove the `history` arrays and give `TenantData.history` getters derived from lifecycles; or
    - (b) keep them as **derived exports** (`history.dg1 = dg1RecordsFrom(LIFECYCLES)`).

  **The same decision is never stored twice.** DG2 moves from 18 to the new totals, and "chairVsMajority" becomes `againstMajority`. Update `30-seed.tsx` if what it prints changes.

### Phase 4 — Queries (`domain/gcc/lifecycle.ts`)
- [x] 4.1 `lifecyclesOf(tenant)`, `lifecycle(tenant, id)`, `liveOf(tenant)` (no `closedAt`) and `closedOf(tenant)`.
- [x] 4.2 `stageAt(l, iso): { stage; step } | null` (from the log; null before capture or after close). `currentOf(l)` is the last log entry.
- [x] 4.3 `gateEventsIn(tenant, window, gate?)`, `submissionsIn`, `resultsIn`, `capturesIn(tenant, window)` (daily plus today's events) and `workEventsIn(tenant, window, kind)`. They all use 006's `inWindow`.
- [x] 4.4 `openGate(l, now)`: the open gate with `openedAt`, `slaEnd` and `onTime` so far. It covers:
  - DG1 due (from the last Stage 1 "awaiting-dg1" entry);
  - DG2 (pack issued, from `facts.s3.issuedAt`);
  - DG3 (from `facts.s7.dg3IssuedAt`).
- [x] 4.5 `healthOf(l, now)`, exactly dashboards.md §5:
  - **Closed states** from `closedAs`.
  - **Blocked:**
    - `s1.eligibility.fail > 0`; or
    - `s7.mandatoryGaps > 0` with the deadline ≤ 5 working days away (`targets.NEAR_WD`); or
    - `s8.bond.issued === false` or `validTo < requiredTo`, with the deadline ≤ 5 working days away.
  - **Overdue:**
    - an open gate past its SLA;
    - `s4.baselineDue`, `s5.priceDue` or the deadline in the past;
    - `s2.rfqs.escalated > 0`.
  - **At risk:**
    - an open gate with < 25% of its SLA left;
    - `s3.inputs.late > 0`, `s3.stale`;
    - `s5.baseMarginPct < s5.minMarginPct`;
    - `s6.simScore < s6.passMark`, `s6.sections.late > 0`;
    - `s4.durationPlannedM > s4.durationRequiredM`.
  - **Otherwise On track.**
  - The report lists the health of every Najd live row. It must read sensibly: e.g. T-2026-097 At risk (stale, 4 h 10 m left); T-2025-329 At risk (margin); T-2025-317 At risk (pass mark).
- [x] 4.6 `teamOf(tenant, teamId)` returns the 004 `Team`, and `personName(id)` comes from plan 003.

### Phase 5 — The data port (needs 006 Phase 1)
- [x] 5.1 If `src/domain/gcc/viewmodels.ts` doesn't exist yet, **stop and set this plan to `BLOCKED (waiting on 006 Phase 1)`**. Phases 1–4 are complete by then.
- [x] 5.2 `rowFor(l, tenant, viewer): TenderRowVM`:
  - `stage` and `step` from `currentOf`;
  - the owner is the person on the current log entry (or `hot` at an open DG2 or DG3);
  - team name;
  - value as `MoneyVM` in tenant currency (convert with `domain/money.ts` if the tender currency differs, keeping `original`);
  - `nextGate` from `openGate`, or the next gate ahead;
  - health, source and fit (004's weighted fit for Stage 1–3 tenders; null later);
  - `win` from `s3.win` when present;
  - `lastActivityAt` is the latest of the log, gates and events;
  - `facts` flattened for columns: numbers and short strings, keyed by the column IDs plan 013 will use (list the keys in the report);
  - **masking:** margin facts are replaced with `null` plus a masked marker when `!can(viewer, 'see.margin')`, and quotes are summarised when the viewer has only `see.quotes.summary`.
- [x] 5.3 `trackerFor(l, tenant, viewer): TrackerVM`, exactly dashboards.md §7:
  - nodes S1 · DG1 · S2 · S3 · DG2 · S4 · S5 · S6 · S7 · DG3 · S8 · S9, with status, dates, days and owner initials;
  - gate decisions with who and when, plus "on time" or "late by …";
  - the Now card (stage and step labels from `data/gcc/stages.ts`; a status line built from facts; next steps; blocker from the health reason);
  - `outcome` for closed tenders.
- [x] 5.4 `lifecycle.port.ts`: `export const port: DataPort = { rows(tenant, scope, viewer, status) {…}, tracker(tenant, id, viewer) {…} }`.
  - Scope `all`: every tender in the tenant.
  - `assigned`: `bidManagerId === personId`.
  - `stage`: current stage n, live only unless status says otherwise.
  - `rows` also filters by `can(viewer, 'tender.view', { tender })`, so restricted tenders stay hidden from people who aren't cleared.

### Phase 6 — Dev check
- [x] 6.1 `dev-checks/40-lifecycle.tsx`, for the active tenant:
  - live count by stage (vs §12.2 and §12.5);
  - for Najd, a table of **every flow in §12.3 × every window**, with target, got and ✓/✗;
  - for B–E, the 12-month totals;
  - `RESULT_SPLITS` checks;
  - Najd's live rows with health and the reason;
  - one tracker per stage rendered as text (the node list), plus T-2026-112 (discarded) and T-2025-262 (won).
- [x] 6.2 A determinism check: generate twice in the panel and compare a hash of the output. They must be equal.

## Data and derivation
- **New facts:** lifecycles (story, live and generated), step facts, work events, `INTAKE_DAILY`, flow targets (used only by the generator and the dev check), title pools.
- **Derived:** stage at a date, events in a window, health, open gate, rows, tracker.
- **No `mark()` keys**: this plan adds data, not actions.
- **Demo state:** gates recorded later in the demo (DG1 Pursue on the hero, DG2 approve …) will come from `done` in plans 007–018. Their queries must then read `done` on top of the lifecycle. Leave a clearly named hook point, `withDemoState(l, done)`, returning `l` unchanged for now, and document it.

## Acceptance checks
- [x] typecheck and build pass. Module-load time of the lifecycle index stays under 50 ms in dev (log it once).
- [x] The `40-lifecycle` panel is **all ✓** for Najd on every window and for B–E on the 12-month totals. Determinism is ✓.
- [x] Najd live counts: S1 12 (11 for people not cleared for the restricted lane) · S2 2 · S3 2 · S4 2 · S5 2 · S6 2 · S7 1 · S8 4 · S9 2. Stages 2–8 total 15 tenders, SAR 3.09 bn. (S1 changed from 5 to 12 by the orchestrator on 2026-09-25, answering the executor's question: every Stage 1 register row gets a lifecycle.)
- [x] 30 days, Najd:
  - DG1 12 (4 · 7 · 1), 11 on time;
  - DG2 5 (4 · 1);
  - DG3 4 (4 · 0);
  - submitted 3, average SAR 262.0 M;
  - results 1 won and 2 lost;
  - decisions on time 20 of 21.
- [x] Every tenant has a DG3 pack waiting, a DG1 in the last 7 days and a result in the last 30 days.
- [x] No `.example`-less URL, and no real portal hostname, in any lifecycle. Search the source for `http` and list the hosts in the report.
- [x] Plan 004's `30-seed` panel still passes, or its report notes exactly what moved to lifecycles and why.
- [x] Reset demo is unaffected (no new state).

## Execution report
Executor, 2026-09-25/26. Not committed (shared checkout).

### Changed files
- **Created, data** (`src/data/gcc/lifecycle/`):
  - `types.ts`, `pools.ts`, `targets.ts` (with `WINDOW_FROM`, `LIVE_TARGETS`, `NAJD_PIPELINE`), `index.ts`;
  - `live/najd.ts`, `live/corniche.ts`, `live/dafna.ts`, `live/batinah.ts`, `live/qurain.ts`;
  - `generate.ts`;
  - helper files the plan did not list:
    - `chain.ts`: builds a step-level log from key moments; also integer date arithmetic;
    - `live/common.ts`: register-row and record helpers;
    - `fold.ts`: plan 004's records become chain drafts;
    - `count.ts`: flow counts;
    - `rng.ts`: FNV-1a + mulberry32;
    - `intake.ts`: `INTAKE_DAILY`;
    - `history.ts`: the derived `TenantData.history`.
- **Created, domain:** `src/domain/gcc/lifecycle.ts` (queries) and `src/domain/gcc/lifecycle.port.ts` (`port: DataPort`).
- **Created, dev check:** `src/pages/gcc/dev-checks/40-lifecycle.tsx`.
- **Changed:**
  - `src/data/gcc/types.ts`:
    - `GccStage` marked legacy;
    - `Dg2History.chairVsMajority` renamed `againstMajority`;
    - new `TenantHistory` and `TenantSeed` (the authored file with `historySeed`).
  - `src/data/gcc/build.ts`: the rename only (needed for typecheck).
  - `src/data/gcc/tenants/*.ts`: typed `TenantSeed`, `history` becomes `historySeed`; Najd's data changes listed below.
  - `src/data/gcc/index.ts`: `GCC_DATA[*].history` is derived from the lifecycles (option (b)); re-exports `LIFECYCLES`, `INTAKE_DAILY` and `withDemoState`.
  - `src/pages/gcc/dev-checks/30-seed.tsx`: prints "against majority"; DG2 now reads 54 decisions · 51 on time · 2 against majority · 2 re-opened.

### What 004 had, and every re-dating (Phases 0 and 3.4)
**Najd outcomes:**
- **Merged into hand-authored rows:**
  - O-25-02 and DG2 T-2025-219 → T-2025-262 (won);
  - O-25-15 → T-2025-270;
  - O-25-16 → T-2025-255.
- **Sector names:** "Water" became the tenant's own sector name, "Water and wastewater" (`data/tenants.ts`). T-2025-270 is "Water and wastewater", keeping 004's split: 21 decided Water bids, 7 won.
- **Order:** sorted by result date.
- **Re-dated (submitted → result):**
  - O-25-01: result 3 Feb 2026;
  - O-25-25: result 5 Feb;
  - O-25-31: 11 Dec 2025 → 28 Jan;
  - O-25-29: 9 Dec 2025 → 2 Feb;
  - O-25-13: 14 Dec 2025 → 4 Feb;
  - O-25-05: result 3 Dec 2025;
  - O-25-07: result 26 Nov 2025;
  - O-25-30: 9 Mar → 18 May 2025. It supplies the one submission whose DG3 falls before the 12 months, so DG3 is 38 approved against 38 submitted.
  - O-25-20: 12 Mar → 28 May;
  - O-25-06: 16 Mar → 8 Jun;
  - O-25-11: 18 Mar → 17 Jun;
  - O-25-23: 23 Mar → 29 Jun;
  - O-25-26: 26 Mar → 9 Jul.
- **Weekend submissions moved to the Thursday before** (Fri–Sat is the SA weekend):
  - O-25-14 and O-25-21 → 10 Apr;
  - O-25-33 → 17 Apr;
  - O-25-08 → 24 Apr;
  - O-25-04 → 5 Jun;
  - O-25-17 and O-25-05 → 18 Sep;
  - O-25-19 → 9 Oct 2025.
- **Values:** the 26 bids submitted before 9 Dec 2025 were scaled so the 12-month average ticket is SAR 214.0 M. The pre-90-day total is 5,963 M, including T-2025-412 and T-2025-438. O-25-01 (700 M), O-25-31, O-25-29 and O-25-13 are unchanged.

**Najd DG1 records** (re-dated so every record fits its window):
- 391 → 20 Nov 09:15
- 412 → 13 Oct 10:40
- 438 → 22 Oct 12:05
- 101 → 12 Feb 13:05
- 058 → 4 Feb 09:40
- 066 → 1 Feb 12:20
- 042 → 5 Feb 10:23
- 083 → 3 Feb 14:05
- 090 → 29 Jan 10:22
- 092 → 1 Feb 13:39
- 063 → 19 Feb 15:31

T-2026-049 (the late discard) was removed: T-2026-107, §12.2's one late decision, carries it.

**Najd DG2 records** (re-dated):
- 162 → 20 Mar 2025
- 177 → 10 Nov
- 190 → 8 May
- 251 → 24 Aug
- 290 → 16 Oct
- 331 → 20 Oct
- 412 → 9 Nov
- 438 → 17 Nov
- 088 → 2 Feb 2026

The generator moved one derived DG2 (O-25-14's) to before 9 Mar 2025.

**Najd register:**
- **Values, with their bands:**
  - 109: 260 M [230, 290]
  - 104: 175 M [155, 195]
  - 101: 140 M [125, 155]
  - 088: 420 M [370, 470]
  - 079: 310 M [280, 340]
- **101:** published 11 Feb; captured 13:30, logged 13:42.
- **412:** closed (submitted 7 Dec, cancelled after opening).
- **438:** closed (submitted 8 Dec, budget withdrawn).
- **Teams:** the Water team's 101 commitment now starts 12 Feb; the networks team's 412 commitment was removed.
- **Facility lines:**
  - 6.2 M now points to T-2025-284;
  - 9.4 M now points to T-2025-291;
  - the Al-Kharj label reads "awarded 3 Feb, awaiting signature".

**Other tenants' DG1 records:**
- Dafna T-2025-422 → 29 Dec 09:00;
- Qurain T-2025-405 → 30 Dec 09:00.

### Najd health (every live row, dashboards.md §5)
- **On track:**
  - 262, 270, 284, 291, 298, 322, 341, 079, 109;
  - 305 (DG3, 30 h left);
  - 117 (DG1 due 16:10, 6 h 10 m left);
  - 118, the hero (DG1 due Mon 07:44);
  - 121–128.
- **At risk:**
  - T-2026-097: "DG2: 4 h 10 m left; pack stale since 09:12 (Addendum 2 …)";
  - T-2025-329: "Margin 7.8% below the 9% minimum";
  - T-2025-336: "Programme 20 months against 18 required";
  - T-2025-317: "Simulated score 68 below the pass mark 70; 2 sections late";
  - T-2026-088: "1 section late";
  - T-2026-101: "1 input late".
- **Overdue:**
  - T-2026-104: "2 overdue RFQs escalated";
  - T-2026-120: "Submission deadline passed". This is the real sample document, past-dated; 004 says "Treat as newly published".
- **Blocked:** T-2026-119, "Eligibility: 3 lines fail" (a low-fit notice).

### Events on Najd live rows (2.1.4)
- **T-2025-336:** re-plan Tue 3 Mar 09:30, 3.5 h, "Quote lead time".
- **T-2025-322:**
  - re-plan 16 Feb, 2 h, "Site visit findings";
  - M2 19 Feb, on time;
  - re-price 1 Mar 11:30, 1.5 h, "Addendum 1".
- **T-2026-088:**
  - M2 10 Feb, on time;
  - re-price 19 Feb, 2.5 h, "Addendum 1";
  - red-team review due Tue 10 Mar, not yet held.
- **T-2025-317:** M2 12 Feb; review due 24 Mar.
- **T-2025-329:** M2 24 Feb.
- **Stage 7–9 rows** (262, 270, 284, 291, 298, 305, 079): an M2 and a review each; T-2025-270 also has a re-plan.

### Port facts keys (for plan 013's column registry)
- **Stage 1:** fieldsToCheck, fieldsBlocking, eligPass, eligAtRisk, eligFail, documents, documentFee, purchaseBy, language, dg1Due.
- **Stage 2:** packagesCovered, packagesTotal, rfqsSent, rfqsTotal, rfqsOverdue, rfqsEscalated, rfqsAnsweredOnTime, rfqsDueSoFar, toLevel, notCoveredPct, repliesDue, clarificationsOpen, clarificationsStale, bestFitApproved.
- **Stage 3:** pack, packIssuedAt, inputsRequested, inputsOutstanding, inputsLate, positionsRecorded, positionsOf, quorum, winP, winBand, marginMin, marginMax, facilityAfter, weightedValue, dg2SlaEnd.
- **Stage 4:** durationPlannedM, durationRequiredM, floatDays, longLeadAtRisk, peakManpower, baselineDue, m2Due, clashWith.
- **Stage 5:** estPrice, baseMarginPct, minMarginPct, sourcedPct, estimatedPct, financeCheck, priceDue, m2Due.
- **Stage 6:** sectionsLocked, sectionsTotal, sectionsLate, simScore, passMark, smeOverdue, redTeamAt, reusePct.
- **Stage 7:** evidenced, requirements, evidencedPct, mandatoryGaps, redlinesOpen, risksWithoutOwner, dg3IssuedAt, dg3SlaEnd.
- **Stage 8:** packageReadyPct, signaturesPending, bondAmount, bondValidTo, bondRequiredTo, bondIssued, openingDate, expectedAwardBy.
- **Stage 9:** handoverAt, debriefAt.
- **Any submitted tender:** portal, receipt, submittedAt.
- **Any tender with a result:** result, rankPlace, rankOf, gapToWinnerPct, lossReason, predictedWin, lessons.
- **Masking:** a masked key is `null`, with `<key>.masked: true`.
  - Margin keys (marginMin, marginMax, baseMarginPct, minMarginPct) are masked without `see.margin`.
  - Quote keys (toLevel, notCoveredPct, bestFitApproved) are masked without either `see.quotes` or `see.quotes.summary`. The facts hold counts only, so a summary-only viewer sees them as they are.

### Hosts
- Every notice URL is built as `https://{host}/tenders/{ref}`. There are no URL literals in the source.
- Hosts per tenant:
  - Najd: etimad.example, nwu-suppliers.example, industrial-utilities.example, ep-municipal.example;
  - Corniche: tejari.example, etimad.example;
  - Dafna: monaqasat.example, etimad.example;
  - Batinah: tenderboard.example;
  - Qurain: capt.example, og-vendors.example, etimad.example.
- The dev check asserts `.example` only.

### Verification
- **typecheck and build:** both pass. The chunk-size warning from the build was already there.
- **Node harness** (the index bundled with esbuild in the scratchpad):
  - every chain builds;
  - Najd hits every §12.3 flow in every window, including captured 11/44/176/520/2,080 and the average ticket 290.0/262.0/241.0/214.0;
  - the other four tenants hit their 12-month totals;
  - live counts are all equal to §12.2 and §12.5;
  - PF-1 is 15 tenders, SAR 3,094 M;
  - `RESULT_SPLITS` are exact;
  - RFQs go out within 24 h in 100% of chains;
  - every gate opening, decision, submission and result is on a working day, 08:00–17:00. The only exceptions are the story rows T-2026-079 and T-2026-107 (Founding Day, as §12.2 says), and the Corniche Sunday captures from plan 004;
  - determinism holds.
- **Browser:** headless Chrome over CDP, against my dev server on 5175.
  - `/dev/checks` as each tenant's Head of Tendering:
    - 40-lifecycle: Najd 100 of 100 ✓, Corniche 26 ✓, Dafna 25 ✓, Batinah 25 ✓, Qurain 26 ✓;
    - 30-seed: all targets met in every tenant;
    - load time logged at 22–34 ms (target under 50 ms).
  - Real trackers render in 006's `TenderTracker`.
  - `/dashboard` renders with no console errors as najd.hot, bid, proc, coord and exec, and as corniche.hot. It says "not built yet", which is for 015 and 013.
  - `/tenders/T-2026-097` renders from the port.
  - Console: the only messages are the two React Router future-flag warnings that were already there.
- **Masking**, checked with the harness:
  - Procurement sees margin facts masked;
  - people not cleared see 28 live rows and 11 in Stage 1;
  - contributors see only the tenders they are invited to.
- **Reset demo:** unaffected; this plan adds no `mark()` keys.

### Deviations from plan
1. **Types:**
   - `origin` adds `'history'` (a lifecycle built from a plan 004 record);
   - `GateRecord.recommendation` is added, for DG1 overrides;
   - `Lifecycle` adds `clientType?`, `closedNote?` and `restricted?`;
   - `m2` and `review` events have an optional `at`, for "due, not yet held";
   - `IntakeDay` is added.
2. **`generateHistory` signature:** it takes `{ tenant, seed, fixed, drafts, targets, againstMajority12m?, submissionsFixed? }` and returns `{ lifecycles, generated, notes }`. It reads the pools itself, and the seed is the tenant key. Before generating, it evens out the work-event shares over folded and generated bids.
3. **T-2026-101 has six input items,** one per pack section. The plan named two; both are as specified (Finance's late, Legal's due today 17:00).
4. **T-2026-122's booklet request is at 08:41, not 08:05:** the notice was captured at 08:34.
5. **Durations outside §2.1.2 ranges, where anchors fix them:**
   - Stage 2 is 29–77 days on 341, 336, 329, 322, 317, 305, 298, 291, 284 and 097. Plan 004's DG1 dates in Nov–Jan sit against §12.3's DG2 anchors in Jan–Mar.
   - Stage 3 is 9 days on several rows.
   - DG3 is 4–6 days before submission on 079, 284, 291, 270, 412 and 438 (the §12.3 DG3 and submission anchors).
6. **T-2026-079 is submitted on 22 Feb**, which is Founding Day (an SA closure), because §12.3 anchors it there.
7. **Other tenants:** some new rows were renamed for plausibility, and their Stage 8 rows reuse plan 004's register rows rather than the plan's titles.
8. **Health working days:** counted in the tender's country's calendar, falling back to the tenant's.

### Blockers / questions
None.

### Follow-ups noticed (not done)
1. **Plan 009a, `pages/gcc/dev-checks/90-stage3.tsx:116`:** it filters `o.sector === 'Water'`. Najd's outcomes now use the tenant's sector name, "Water and wastewater", so two checks fail (water hit rate `NaN% (0 of 0)`). By sector family, as 007a's `fit.ts` compares, it is 33% (7 of 21), exactly 009a's value. The fix is one line in 009a's file.
2. **Plan 008a, 80-stage2 on Qurain:** "Supplier master size 12–16, at least one due" fails. This is 008a's supplier data and is unrelated to lifecycles.
3. **Changed plan 004 data read by 007a, 008a and 009a:** register values (109, 104, 101, 088, 079), the derived history, and the Water rename. 70-stage1 and 80-stage2 pass for Najd.
4. **T-2026-101:** its value (140 M) is below its band, yet the fit reason says "inside". This is plan 004's fit input.
5. **Bid bonds:** the bond percentages are inconsistent, and the bonds for T-2025-298 and Qurain's Stage 8 rows are not on the facility's committed lines.
6. **2025 public holidays** are missing from `data/gcc/calendar.ts` (plan 002). Generated 2025 dates avoid weekends only.
7. **T-2026-079:** its `expectedAwardBy` (5 Mar) has passed. §5 health has no "result overdue", so it shows On track; RES-1 will flag it.
8. **The shell header** (`components/layout/Header.tsx`) titles GCC `/dashboard` "Not found".
9. **Demo actions:** when 007a's "Treat as newly published" and the DG1, DG2 and DG3 actions land, they should apply through `withDemoState` (`lifecycle/index.ts`).
