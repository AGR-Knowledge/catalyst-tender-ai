# 025a — Records on the demo clock, and focus after a gate decision

Status: DONE — awaiting review (2026-09-27) · Depends on: wave 6 (commit after ed0fba0) · Can run in parallel with: 025b

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
- [x] 1.1 Add `nextAt(): string` to the store API.
  - It returns the time the active tenant's next audit entry will carry (`nextAuditAt`).
  - Point `useS1`'s `nextAt` and DemoMenu's at it.
  - (acceptance: DG1 still records at the audit entry's minute, as today.)

### Phase 2 — Writers take a time
- [x] 2.1 Give each writer above an optional time, keeping its current default:
  - the Stage 2 writers already take `at = NOW`;
  - for the others, add `at = nowIso()` as the last parameter, or in the existing options object;
  - only the **stamp** uses it. Readings of "now" (SLA left, late, overdue) stay on `NOW`/`DEMO_NOW`.
- [x] 2.2 Each call site passes `nextAt()` from the store.
  - When one action writes a record and then logs its audit entry, the record takes the `nextAt()` read *before* the entry is logged, so the two match.
- [x] 2.3 Check the rules that compare times still hold, now that demo times run past 10:00. For each, note what you checked:
  - an input accepted only if the pack was issued after it (`domain/gcc/requests.ts` about 83);
  - DG2 decided after the positions;
  - DG3 re-issue after send-back;
  - `later()` in the appliers (read only; they are 025b's files);
  - "Sent … ago" and "just now" texts: `agoText(iso, now)` with a time after `DEMO_NOW` must not read "in 6 minutes". Use whatever the DG1 record does today.
  - (acceptance: no record reads a future time, and the RFQ clock still reads "within 24 h of DG1".)
  - What was checked (2026-09-27):
    - input accepted only if the pack was issued after it (`requests.ts` about 83, `issuedAt > submittedAt`): by reading the rule, with the browser run's times (T-2026-101 input 10:16, first issue 10:19). Seeded inputs read as before. Before, a live input and a live issue were both 10:00, so `10:00 > 10:00` never accepted it; now it can;
    - DG2 decided after the positions: no rule compares the two. In the browser positions 10:05, 10:07, 10:09 and the decision 10:11; "after the SLA" (`decision.at > slaDue`) still reads on time (SLA to 8 Mar 14:10);
    - DG3 re-issue after send-back: rounds are counted from keys, not times; `openedAtOf` takes the re-issue's time (10:03 in the browser run), and the clock now counts from it (`countsFrom`);
    - `later()` in the appliers (read only): it takes the later of the demo time and the step before, so steps stay in order as demo times run forward (workspace: Shortlisting 10:06, RFQs out 10:07);
    - relative texts: the DG1 record uses absolute times, and none of 025a's screens use `agoText`. The one exposure, the grid's Last activity, reads "just now" (user decision, `agoText`);
    - also found: pack freshness (`freshness.ts`, `v.at > gen`). An input submitted after a re-run now marks the pack stale; before, both at 10:00 read fresh;
    - acceptance: every record carries its audit entry's minute; the RFQ clock read "24 h left, due Mon 9 Mar 10:04" after a live DG1 at 10:04, and dev check 99 reads the issue lag 23 m, within 24 h.

### Phase 3 — Focus after a gate decision
- [x] 3.1 After **Approve submission**, **Reject** or **Send back** on `/dg3` (`DecisionPanel.tsx`, `SendBack.tsx`), focus moves to the heading of the record or state that replaces the bar: `tabIndex={-1}`, then focus it once it mounts.
- [x] 3.2 The same after the DG2 decision's Confirm (`DecisionBar.tsx`).
  - (acceptance: keyboard only, at 1280 dark: after Confirm, Tab continues from the record, not from the top of the page.)

### Phase 4 — Checks
- [x] 4.1 New `pages/gcc/dev-checks/99-demo-clock.tsx`:
  - one writer per stage (Stage 2, Stage 3, DG2, DG3) called with a given time stamps that time;
  - called without one, it stamps as before;
  - the store's `nextAt` for an audit list ending at 10:05 returns 10:06, and 10:00 for an empty one.
- [x] 4.2 `/dev/checks` in all five tenants: no failing row, and existing counts unchanged (Najd 729, Corniche 320, Dafna 301, Batinah 309, Qurain 324), plus your new rows.
  - The counts may also change from plan 025b's rows. Report both your rows and the totals you saw.

## Data and derivation
No new facts, `done` keys or values. Existing values carry a later `at`. Reset demo clears them as before.

## Acceptance checks
- [x] Typecheck and build pass.
- [x] Script B, as `najd.proc` from Reset all:
  - approve a shortlist and send its RFQs on the hero;
  - the RFQ card's "Sent" time equals the minute of its entry in Decisions & audit and in Administration › Audit log.
- [x] Script C: each DG2 position's time and "Decided …" equal their audit entries' minutes.
  - Do this from "Start: DG2 committee", as the CFO, the Technical Director and the CEO, then as `najd.hot`.
- [x] DG3, as `najd.hot` on T-2025-305: "Decided …" equals its audit entry.
- [x] Qurain T-2025-428: the send-back and the re-issue each carry their audit entry's minute.
- [x] Keyboard focus lands on the new record after the DG2 and DG3 decisions (Phase 3).
- [x] Reset demo returns to seed. No console errors. Checked at 1440 light and 1280 dark.

## Execution report
- Changed files:
  - Clock: `state/store.tsx` (`nextAt(after?)` on the API; `nextAuditAt` exported for the dev check), `pages/gcc/s1/vm/useS1.ts` (its `nextAt` calls the store's), `components/layout/DemoMenu.tsx` (uses the store's).
  - Writers, each with an optional time and its default unchanged: `domain/gcc/s3/{versions,pack,inputs}.ts`, `dg2/{positions,decision,conditions,letter,reopen}.ts`, `dg3/decision.ts`. The Stage 2 writers already took `at`.
  - Stage 2 readings: `s2/rfq.ts` (`sentBy`, `rfqClock`), `s2/tracking.ts` (board, supplier matrix, SRC-3/4 list, `rfqCounts`, SRC-11), `s2/portal.ts` (`supplierRfqs`).
  - DG2 and DG3 clocks: `dg2/decision.ts`, `dg3/decision.ts` (`countsFrom`).
  - Shared, approved by the user: `domain/gcc/period.ts` (`DEMO_MINUTES_END`, `inWindow`), `lifecycle.port.ts` (`lastActivityOf`), `clock.ts` (`countsFrom`, `slaState`, `agoText`), `lifecycle.ts` (`gateFrom` only, plus its import).
  - Call sites: `pages/gcc/s2/{BestFit,Clarifications,Coverage,LevelQuote,PackageBoard,Packages,RfqDraft,Shortlists}.tsx`, `s2/vm/desk.ts` (`nextAt` on `DeskCtx`), `s3/{InputForm,Pack}.tsx`, `dg2/{Conditions,DecisionBar,DeclineLetter,PositionForm,Reopen}.tsx`, `dg3/{DecisionPanel,Reopen,SendBack}.tsx`, `supplier/SupplierPortal.tsx`, `workspace/tabs/inputs.tab.tsx`.
  - Focus: `dg2/Dg2.tsx`, `dg2/DecisionBar.tsx`, `dg3/Dg3.tsx`, `dg3/DecisionPanel.tsx`, `dg3/SendBack.tsx`.
  - New: `pages/gcc/dev-checks/99-demo-clock.tsx` (15 rows). Dev checks 50, 80, 85, 90, 95 and 97 needed no change.
- Verification:
  - Typecheck and build pass (the build's chunk-size warning was there before).
  - `/dev/checks`, all five tenants, headless Chromium on port 5191, every row scraped and compared with a baseline taken before any change:
    - baseline: Najd 729, Corniche 320, Dafna 301, Batinah 309, Qurain 324, nothing failing;
    - after: 772, 363, 344, 352, 367, nothing failing, no console errors. That is the baseline plus 025b's panel 76 (28 rows) plus 99 (15 rows). Every existing row reads exactly as at baseline, apart from the lifecycle panel's timing row (27–30 ms).
  - Browser, headless Chromium, 1440 × 900 light unless stated, no console errors in any run:
    - Script B: "Start: DG1 due"; Omar records Pursue (10:04); Joseph approves packaging (10:06), the P-01 shortlist (10:07) and sends its RFQs. The RFQ card reads "Sent Sun 8 Mar, 10:08 AST" for all four suppliers, and so does the Tracking tab; Decisions & audit and Administration › Audit log both read "RFQs sent" at 10:08. The RFQ clock read "24 h left, due Mon 9 Mar 10:04".
    - Script C: "Start: DG2 committee"; CFO 10:05, Technical Director 10:07, CEO 10:09; Faisal approves Bid: record "08 Mar 10:11", header "Decided 08 Mar 10:11". Audit: three "DG2 position recorded" at 10:05, 10:07, 10:09 and "DG2 approved: Bid" at 10:11.
    - DG3, Najd T-2025-305, after Reset all: "Decided Sun 8 Mar 10:00", audit "DG3 approved" 10:00 (the first entry after the reset).
    - Qurain T-2025-428: send-back 10:01, re-issue by Nour with the bank extension 10:03, approval 10:05, each equal to its audit entry. After the re-issue the clock reads "48 h left of 48 h · from round 2, Sun 8 Mar 10:03".
    - Stage 3, Najd T-2026-101: Lina submits the legal input ("Submitted 08 Mar 10:16"); Omar re-runs ("generated 08 Mar 10:18") and issues with a reason ("issued 08 Mar 10:19"); audit 10:16, 10:18, 10:19. DG2 clock "24 h left of 24 h · from the first issue, 08 Mar 10:19".
    - Supplier Portal, after "Start: RFQs out": Ahmed Saleh declines hero P-02; record and audit entry both 10:28; the board reads "4 RFQs · 0 quotes · 1 declined".
    - Keyboard only, 1280 × 800 dark: DG2 Approve Bid, Enter, Tab to the confirm, Enter: focus on "Bid, approved by Faisal Al-Harbi", in view; Tab goes to the conditions' Close buttons. DG3 approval: focus on "Approved for submission, by Faisal Al-Harbi"; Tab goes to "Evidence as seen at the decision". Qurain send-back: focus on "Sent back to Compliance"; Tab goes to "Reject". Focus is still there 1.2 s later, after the dialog's exit.
    - Reset all leaves `done` and the audit trail empty; the dev checks read the seed.
- Deviations from plan:
  - **Scope widened by three user decisions** (see Blockers): `inWindow` and `DEMO_MINUTES_END` (11:59) in `period.ts`; `lastActivityOf`; `agoText`; `countsFrom` in `clock.ts`, used by `slaState` and `gateFrom`. Seed readings don't move: 99's seed row finds 0 of 20,857 seeded date-times after 10:00 up to 11:59 in any tenant, and every existing dev-check row is unchanged.
  - **`agoText` callers checked:** `components/dashboard/columns/base.cols.tsx` (Last activity: `lastActivityAt`, which `lastActivityOf` never takes past `DEMO_MINUTES_END`) and `pages/gcc/admin/Sources.tsx` (`lastPoll`: all seeded at or before 10:00, and nothing in the demo writes it). Neither passes a scheduled future time; both left as they are.
  - **Stage 2 "has it happened" rule, `sentBy`:** an RFQ sent in the demo counts as sent at the demo clock whatever minute it carries; seeded RFQs as before. Without it, RFQs stamped 10:06 fall out of `rfqCounts` ("0 of 8 sent"), the board, the supplier matrix, the portal and the RFQ clock. SRC-11 (`buyerTimeSaved`) likewise counts every quote received in the Supplier Portal during the demo. Side effect: simulated replies (sent time + 22–118 min, so after 10:00) now count as parsed quotes in SRC-11, where before they didn't. No dev-check target moved.
  - DG2 and DG3 screens' own clocks use `countsFrom`, so a pack issued or a DG3 round re-issued live reads its full 24 h or 48 h.
  - The store's `nextAt` takes an optional look-ahead, `nextAt(after = 0)`, for actions that log several entries at once (Approve all shortlists, Send all RFQs, Confirm all adjustments, the reserve send). Called without it, it is the planned `nextAt(): string`.
  - `dg2Write`'s time is `stamp?` rather than `at = nowIso()`: a No-Bid's letter draft is logged after the decision, so it takes the next minute; with no time given, both keep demo now as before.
  - Also stamped, though not in the plan's list: the Stage 2 nudge (`nudgeWrite` in `pages/gcc/s2/vm/desk.ts`), whose "latest by … {time}" shows beside its entry. Previews and probes pass `nextAt()` too, and the DG3 inline preview line shows it instead of `nowIso()`, so previews match the record.
  - Focus scrolls the heading into view (`preventScroll: false`): the record appears at the top of the decision column while the bar was at the bottom, and with `preventScroll` the focused heading was off-screen at 1280.
  - Script B ran from "Start: DG1 due" (which resets Najd first) rather than a bare Reset all: the hero must be pursued before a shortlist exists. DG1 itself was clicked.
  - **Dev-check targets moved: none.** No target in 40, 45, 50, 60, 70, 80, 85, 90, 95 or 97 changed.
- Blockers / questions:
  - **Period windows end at exactly 10:00 (2026-09-27, asked).** `domain/gcc/period.ts` ends every window at `DEMO_NOW`, and `inWindow` includes a moment only if it is ≤ 10:00. Checked with the real modules: the hero's DG1 Pursue stamped 10:03 (what the DG1 screen already writes) is in no window, not Today and not 30 days; stamped 10:00 it is in both. So today a DG1 recorded live already drops out of `gateEventsIn` (PF-4 "Decisions on time", PF-1 pipeline in, the portfolio and stage flows). Moving Stage 2, Stage 3, DG2 and DG3 records to the audit minute would do the same to them: the DG2 and DG3 gate records, the Stage 2 step entries (`stage2.kpi.ts` "RFQs out", `stages.flow.ts`, `steps.metric.ts`), and `lastActivityOf` in `lifecycle.port.ts` (filters `t <= NOW`). Neither file is in 025a's scope.
  - **Answer (user, 2026-09-27):** widen the windows. 025a may edit `inWindow` in `domain/gcc/period.ts` and `lastActivityOf` in `domain/gcc/lifecycle.port.ts` so that a window ending at the demo clock also counts demo-day moments up to 11:59; prove the five tenants' dev-check counts don't move, and report it as a deviation.
    - Conditions: only a window that ends at the demo clock gets the later end (its start and every other bound stay); the new end is a named constant with a comment saying why; a 99-demo-clock row proves nothing seeded falls between 10:00 and the new end in any tenant; a row shows a DG1 Pursue recorded live at 10:03 counts in the 30-day window and in "Decisions on time"; seed readings don't move (the five tenants' counts stay the same before the new rows). `period.ts`, `lastActivityOf` and dev check 50 are now 025a's (README, Wave 7). If a target moves in dev checks 40, 45, 60 or 70 (025b's), stop and tell the user rather than edit them.
  - **"Last activity" would read "in 6 m" (2026-09-27, asked).** Widening `lastActivityOf` feeds the grid's Last activity cell (`base.cols.tsx`, `agoText(lastActivityAt)`), and `agoText` reads any time after 10:00 as the future.
  - **Answer (user, 2026-09-27):** fix it in `agoText` (`domain/gcc/clock.ts`, agoText only, now 025a's). Only times after the demo clock and no later than `DEMO_MINUTES_END` read "just now"; past times and times after `DEMO_MINUTES_END` keep their text. Check every `agoText` caller for a scheduled future time on demo day; list them under Deviations. Add a 99 row: a tender acted on live at 10:06 reads "just now" in Last activity, with the tooltip 10:06.
  - **Gates opened live over-read (2026-09-27, asked).** `gateFrom` (`lifecycle.ts`) and `slaState` (`clock.ts`) count time left from 10:00, so a gate or clock started live reads more than its limit: Qurain's DG3 re-issue at 10:12 would read "DG3 open · 48 h 12 m left" and "48 h 12 m left of 48 h".
  - **Answer (user, 2026-09-27):** clamp both, one line each: when the start is after 10:00 and no later than `DEMO_MINUTES_END`, time left counts from the start. Seeds must not move.
    - Conditions: one helper in `clock.ts` (the later of the demo clock and a start within the demo's minutes), used by both `gateFrom` and `slaState`; only time left and the tone or breach state derived from it change (`openedAt`, `slaEnd` and a decision's on-time result keep their true times); in `lifecycle.ts` only `gateFrom` is 025a's (not `openGate`); 99 rows for Qurain's DG3 re-issue at 10:12 ("48 h left of 48 h") and a live pack issue ("24 h left of 24 h"); seed counts don't move.
  - In scope and fixable here: Stage 2's "has it happened" filters (`sentAt <= now` in `tracking.ts`, `portal.ts`, `rfqClock`) and the DG2/DG3 SLA clocks, which would read more than their SLA once they open after 10:00.
- Follow-ups noticed (not done):
  - Presets (025b's, out of scope) still stamp their records 10:00 while their audit entries run from 10:01: "Start: DG2 committee" shows "v2 generated 08 Mar 10:00 · issued 08 Mar 10:00" beside entries at 10:01 and 10:02; "Start: RFQs out" RFQs read "Sent 10:00". `recipe.ts` already has `r.nextAt()` for the preset writers to pass.
  - `stages.metric.ts` and `steps.metric.ts` compare stays with `w.to` directly, so a step entered live after 10:00 misses the stage graph's last point. Left, as asked (other bounds unchanged).
  - `isPast` in `domain/gcc/s2/context.ts` is unused.
  - Runbook: finding 10's known limit can go. A DG1 recorded live now also counts in the period tiles and flows, which it did not before this plan.
