# 025a — Records on the demo clock, and focus after a gate decision

Status: READY · Depends on: wave 6 (commit after ed0fba0) · Can run in parallel with: 025b

## Goal
Every record a prospect reads carries the same time as its audit entry. Today, "RFQs sent Sun 8 Mar, 10:00" sits beside an audit log reading 10:06; after this plan both read 10:06. After a DG2 or DG3 decision, keyboard focus lands on the new record instead of falling to the top of the page.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Fix, don't build:** no new screens, capabilities, `done` keys or libraries.
- **Keep seed readings still:**
  - every writer keeps its current default time, so dev checks and presets that call it without a time read exactly as before;
  - only the screens pass the new time.
- **Stay in your files** (Scope). Plan 025b runs at the same time and owns Stage 1, the lifecycle appliers and dev checks 40–76. If a fix needs another file, stop and ask.
- If a dev-check target moves, record old → new under Deviations, with why.

## Context
- **Why:** 016c finding 10 (`app/plans/016c-script-qa.md`, Findings row 10), listed in the runbook's known limits. A sharp prospect notices a record at 10:00 beside an audit log at 10:06.
- **How DG1 already does it:**
  - `pages/gcc/s1/vm/useS1.ts` about 35–39: `nextAt()` returns the time the next audit entry will carry, a minute after the last, from 10:00. The DG1 screens pass it to their writers.
  - The store stamps audit entries the same way: `state/store.tsx` about 202–207, `appendAudit` → `nextAuditAt(list)`.
  - `components/layout/DemoMenu.tsx` about 100 has its own copy of `nextAt`.
- **How the others stamp today:**
  - `domain/gcc/s2/**` writers default `at = NOW`;
  - `domain/gcc/s3`, `dg2` and `dg3` writers stamp `nowIso()`, which is always `DEMO_NOW` (`domain/gcc/s3/done.ts:22`).
- **The writers**, as read on 2026-09-27 (re-read each file before editing):
  - **Stage 2:**
    - `packaging.ts` about 126 `packagingWrite`;
    - `coverage.ts` about 157 `gapWrite`;
    - `shortlist.ts` about 191 `shortlistWrite`;
    - `rfq.ts` about 183 `rfqWrite`;
    - `levelling.ts` about 207 `levelWrite`;
    - `bestfit.ts` about 177 `mixWrite`;
    - `clarifications.ts` about 44 `clarificationWrite`;
    - `portal.ts` about 128 `supplierQuoteWrite`.
  - **Stage 3:**
    - `versions.ts` about 119 `packRerunWrite` (stamp at about 125);
    - `pack.ts` about 482 `packIssueWrite` (489) and about 506 `packNoteWrite` (511);
    - `inputs.ts` about 169 `inputRequestWrite` (174) and about 182 `inputSubmitWrite` (186).
  - **DG2:**
    - `positions.ts` about 138 `positionWrite` (156);
    - `decision.ts` about 165 `dg2Write` (190);
    - `conditions.ts` about 76 `conditionCloseWrite` (79);
    - `letter.ts` about 47 `letterWrite` (48);
    - `reopen.ts` about 56 `reopenRequestWrite` (63) and about 72 `reopenApproveWrite` (76).
  - **DG3:** `decision.ts` about 152 `dg3Write` (172), 194 `dg3SendBackWrite` (204), 222 `dg3ReissueWrite` (229) and 243 `dg3ReopenWrite` (249).
- **Their call sites:**
  - `pages/gcc/s2/`: `BestFit`, `Clarifications`, `Coverage`, `LevelQuote`, `PackageBoard`, `Packages`, `RfqDraft`, `Shortlists`;
  - `pages/gcc/s3/`: `InputForm`, `Pack`;
  - `pages/gcc/dg2/`: `Conditions`, `DecisionBar`, `DeclineLetter`, `PositionForm`, `Reopen`;
  - `pages/gcc/dg3/`: `DecisionPanel`, `Reopen`, `SendBack`;
  - `pages/gcc/supplier/SupplierPortal.tsx`;
  - `pages/gcc/workspace/tabs/inputs.tab.tsx`.
- **Keyboard focus:** 016c findings 27 (DG3) and the DG2 equivalent. After Approve submission, or a DG2 decision, the decision bar gives way to the record and focus falls to the page.

## Scope
- **Files to change:**
  - `state/store.tsx`: add `nextAt()` to the `useDemo()` API, with the same rule as `nextAuditAt` for the active tenant;
  - `pages/gcc/s1/vm/useS1.ts`: its `nextAt` may call the store's, keeping its signature. This is the only Stage 1 file you may touch;
  - `components/layout/DemoMenu.tsx`: its local `nextAt` may call the store's (one line);
  - the writers above in `domain/gcc/s2`, `s3`, `dg2` and `dg3`, and their call sites listed above;
  - dev checks `80-stage2`, `85-stage2-screens`, `90-stage3`, `95-stage3-screens`, `97-dg3`, and a new `99-demo-clock.tsx`.
- **Out of scope:**
  - Stage 1, DG1, the lifecycle appliers (`domain/gcc/demo/*.apply.ts`), presets (`domain/gcc/demo/presets/**`) and dev checks 40–76 (plan 025b);
  - the runbook and the spec (the orchestrator updates them after review).

## Steps
### Phase 1 — One clock
- [ ] 1.1 Add `nextAt(): string` to the store API.
  - It returns the time the active tenant's next audit entry will carry (`nextAuditAt`).
  - Point `useS1`'s `nextAt` and DemoMenu's at it.
  - (acceptance: DG1 still records at the audit entry's minute, as today.)

### Phase 2 — Writers take a time
- [ ] 2.1 Give each writer above an optional time, keeping its current default:
  - the Stage 2 writers already take `at = NOW`;
  - for the others, add `at = nowIso()` as the last parameter, or in the existing options object;
  - only the **stamp** uses it. Readings of "now" (SLA left, late, overdue) stay on `NOW`/`DEMO_NOW`.
- [ ] 2.2 Each call site passes `nextAt()` from the store.
  - When one action writes a record and then logs its audit entry, the record takes the `nextAt()` read *before* the entry is logged, so the two match.
- [ ] 2.3 Check the rules that compare times still hold, now that demo times run past 10:00. For each, note what you checked:
  - an input accepted only if the pack was issued after it (`domain/gcc/requests.ts` about 83);
  - DG2 decided after the positions;
  - DG3 re-issue after send-back;
  - `later()` in the appliers (read only; they are 025b's files);
  - "Sent … ago" and "just now" texts: `agoText(iso, now)` with a time after `DEMO_NOW` must not read "in 6 minutes". Use whatever the DG1 record does today.
  - (acceptance: no record reads a future time, and the RFQ clock still reads "within 24 h of DG1".)

### Phase 3 — Focus after a gate decision
- [ ] 3.1 After **Approve submission**, **Reject** or **Send back** on `/dg3` (`DecisionPanel.tsx`, `SendBack.tsx`), focus moves to the heading of the record or state that replaces the bar: `tabIndex={-1}`, then focus it once it mounts.
- [ ] 3.2 The same after the DG2 decision's Confirm (`DecisionBar.tsx`).
  - (acceptance: keyboard only, at 1280 dark: after Confirm, Tab continues from the record, not from the top of the page.)

### Phase 4 — Checks
- [ ] 4.1 New `pages/gcc/dev-checks/99-demo-clock.tsx`:
  - one writer per stage (Stage 2, Stage 3, DG2, DG3) called with a given time stamps that time;
  - called without one, it stamps as before;
  - the store's `nextAt` for an audit list ending at 10:05 returns 10:06, and 10:00 for an empty one.
- [ ] 4.2 `/dev/checks` in all five tenants: no failing row, and existing counts unchanged (Najd 729, Corniche 320, Dafna 301, Batinah 309, Qurain 324), plus your new rows.
  - The counts may also change from plan 025b's rows. Report both your rows and the totals you saw.

## Data and derivation
No new facts, `done` keys or values. Existing values carry a later `at`. Reset demo clears them as before.

## Acceptance checks
- [ ] Typecheck and build pass.
- [ ] Script B, as `najd.proc` from Reset all:
  - approve a shortlist and send its RFQs on the hero;
  - the RFQ card's "Sent" time equals the minute of its entry in Decisions & audit and in Administration › Audit log.
- [ ] Script C: each DG2 position's time and "Decided …" equal their audit entries' minutes.
  - Do this from "Start: DG2 committee", as the CFO, the Technical Director and the CEO, then as `najd.hot`.
- [ ] DG3, as `najd.hot` on T-2025-305: "Decided …" equals its audit entry.
- [ ] Qurain T-2025-428: the send-back and the re-issue each carry their audit entry's minute.
- [ ] Keyboard focus lands on the new record after the DG2 and DG3 decisions (Phase 3).
- [ ] Reset demo returns to seed. No console errors. Checked at 1440 light and 1280 dark.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
