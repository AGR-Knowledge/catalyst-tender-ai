# 026 — Validated tenders join DG1, and the last focus and graph fixes

Status: DONE — awaiting review (2026-09-27) · Depends on: wave 7 (commit de3b8ec) · Runs alone (one session)

## Goal
Four tenders are routed to validation by intake: Batinah T-2026-042 and T-2026-041, Najd T-2026-120, and Qurain T-2026-072. Once the Coordinator confirms their fields, they join DG1 decisions and read "1 · Intake · Awaiting DG1" with their Bid Manager. Today, three screens disagree about them:
- the DG1 evidence pack reads "Waiting for DG1 · 21 h 41 m left of 24 h" (T-2026-042), counting from logging;
- DG1 decisions lists none of them ("Nothing is waiting for DG1" in Batinah);
- after validation, the header reads "Screened · With Shamsa Al-Hinai", and the dashboards show no DG1 gate.

This plan also closes three small leftovers from wave 7:
- keyboard focus after Cancel in a queue card's form, after a DG1 Re-open, and after a drawer opened from another page closes;
- a step entered live missing the stage graph's last point.

These pieces touch the same Stage 1 files, so they are one plan for one session.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Fix, don't build:** one rule, one applier change, one header state, focus handling and a window bound. No new screens, capabilities, `done` keys, libraries or seed data.
- **Keep seed readings still.** At seed, no tender, list, tile or dashboard changes. The change shows only after a demo action. The five tenants' dev-check counts must be the same before your new rows.
- If a dev-check target moves, record old → new under Deviations, with why. The only move this plan expects is a DG1 record's opening for these four tenders (see 1.4).
- **Stay in your files** (Scope). If a fix needs another file, stop and ask.

## Context
- **Why:** the wave 7 review (`app/plans/README.md`, "Wave 7 review of 025a and 025b", Open list) and 025b's report (`app/plans/025b-validated-step.md`, Blockers 1 and 2, Deviations).
- **The two data sources for Stage 1:**
  - The register (`data/gcc/tenants/*.ts`) gives `intake: { loggedAt, disposition }`.
    - Every tender at Stage 1 · validating is either `shortlisted` (the hero in each tenant, Corniche T-2026-061) or `needs-validation` (the four above).
    - No other tender is `needs-validation` (Batinah about 135 and 158, Najd about 391, Qurain about 179).
  - The lifecycle (`data/gcc/lifecycle/live/*.ts`) gives `facts.dg1Due` only for the shortlisted ones. The due is `loggedAt` + 24 h: the hero in Najd is `2026-03-09T07:44`, and T-2026-061 is `2026-03-09T07:52`.
- **Who reads what:**
  - `dg1Queue(tenant, done)` (`domain/gcc/dg1/record.ts` about 128) lists only `shortlisted` tenders, due `loggedAt` + `DG1_SLA_HOURS`.
  - The DG1 pack header (`pages/gcc/s1/Dg1.tsx` about 271–290) shows "Waiting for DG1" and an `SlaClock` from `loggedAt` for any tender with no decision, listed or not.
  - `openGate` (`domain/gcc/lifecycle.ts` about 244–252) opens DG1 from `facts.dg1Due` when present, else from the awaiting-dg1 step's time. The dashboards, the tracker, "Needs your action" and the Stage 1 "DG1 due" column read it.
- **`05-validated.apply.ts`** (plan 025b):
  - It moves a validating tender to awaiting-dg1 when it has `dg1Due` or is in `dg1Queue(tenant, {})`, else to screened.
  - For a tender without `dg1Due`, it stands down once a `dg1:`, `dg1-hold:` or `dg1-reopen:` key exists. So after a Hold or a Re-open on one of the four, the tender reads Validating again.
  - `validatedOf(tenant, id, done)` (`domain/gcc/s1/validation.ts`) returns non-null when no blocking item is open and at least one item is resolved.
- **`10-dg1.apply.ts`'s `seedOpenedAt`** (about 37) reads `openGate(l)?.openedAt`, else the awaiting-dg1 step, else the current step.
  - Today T-2026-042's record opens at its validating step, 07:35 (`intakeSteps` puts validating 6 minutes before logging).
  - The pack's clock counts from `loggedAt`, 07:41.
- **Focus:**
  - `parts/ValidationCard.tsx`: Cancel in the Correct and Send back forms (about 145 and 153) calls `setMode(null)` and focus falls to the page.
  - `parts/Dg1Record.tsx`: "Re-open DG1" (about 80) replaces the record with the form. `parts/Dg1Form.tsx` already focuses its "Record DG1" heading after a Hold (about 75–77, 137).
  - 016c finding 9 (`app/plans/016c-script-qa.md`, row 9): My requests › "Open credentials" navigates to `/company?tab=credentials&cred={id}` (`domain/gcc/actions/requests.actions.ts` about 21; `pages/gcc/company/Credentials.tsx` about 168 opens the drawer).
    - On Esc, `useOverlayBehaviour` (`components/overlays/Frames.tsx` about 16 and 38) restores focus to the element focused at open. That element was on the previous page, so focus falls to the page.
- **Graph bound:**
  - `inWindow` (`domain/gcc/period.ts`) lets a window that ends at the demo clock run to `DEMO_MINUTES_END` (11:59), for live actions stamped 10:01, 10:02 and so on.
  - `metrics/stages.metric.ts` (about 41 and 134) and `metrics/steps.metric.ts` (about 49) compare with `w.to` directly, so a stage or step entered live misses the graph's last point.

## Scope
- **Files to create or change:**
  - `domain/gcc/dg1/record.ts`: a helper and `dg1Queue`;
  - `domain/gcc/demo/05-validated.apply.ts`; `10-dg1.apply.ts` only if 1.4 needs it;
  - `pages/gcc/s1/Dg1.tsx` (header), `parts/Dg1Form.tsx`, `parts/Dg1Record.tsx`, `parts/ValidationCard.tsx`;
  - `components/overlays/Frames.tsx` and `pages/gcc/company/Credentials.tsx` (finding 9 only);
  - `domain/gcc/period.ts` (a `windowEnd` helper), `domain/gcc/metrics/stages.metric.ts`, `steps.metric.ts`;
  - dev checks that need a target update (40, 45, 46, 50, 60, 70, 71, 72, 75, 76, 99), and a new `77-dg1-routed.tsx`.
- **Out of scope:**
  - seed data (`data/**`), including dispositions and `dg1Due`;
  - the DG1 form's locks: a tender with no blocking field may still record DG1 from its pack before it joins the list, as today;
  - presets (`domain/gcc/demo/presets/**`);
  - `openGate`;
  - the runbook and the spec (the orchestrator updates them after review).

## Steps
### Phase 1 — Tenders routed to validation join DG1
- [x] 1.1 **One rule, one place.** Add `waitsForDg1(tenant, tenderId, done)` to `domain/gcc/dg1/record.ts`. It is true when the register tender has `intake.loggedAt` and either:
  - intake shortlisted it; or
  - intake routed it to validation (`needs-validation`) and `validatedOf(tenant, tenderId, done)` is non-null.
  - It reads only the register and `done`, never a lifecycle query, because `05-validated` calls it while lifecycles are built.
- [x] 1.2 **`dg1Queue` uses it**, with its `done`, in place of the `shortlisted` test. Due stays `loggedAt` + `DG1_SLA_HOURS`.
  - (acceptance: at seed, every tenant's DG1 list is unchanged, with Batinah still empty. After T-2026-042's bid bond is confirmed, Batinah's list shows it, due Mon 9 Mar 07:41, "Ready to decide".)
- [x] 1.3 **`05-validated` follows the same rule:**
  - the step is awaiting-dg1 when `waitsForDg1(tenant, id, done)`, else screened;
  - when the tender's Stage 1 facts have no `dg1Due`, set `facts.dg1Due` to `loggedAt` + the DG1 SLA, so `openGate` opens the gate where the list and the pack count from;
  - remove the stand-down on DG1 keys.
  - (acceptance: all four tenders move to "1 · Intake · Awaiting DG1" with their Bid Manager (T-2026-042 with Imran Sheikh). Their dashboards, tracker, "Needs your action" and Stage 1 "DG1 due" column show the same due as `/dg1`.)
- [x] 1.4 **DG1 paths on the four tenders:**
  - Pursue (Stage 2 at Packaging), Discard, Hold, and Pursue then Re-open all work;
  - after a Hold or a Re-open, the tender stays at Awaiting DG1;
  - the DG1 record opens at `loggedAt` (T-2026-042: 07:41, was 07:35). Record this move under Deviations;
  - on-time results stay as they were;
  - "Advance to Stage 3" still works for T-2026-042.
  - The hero (all five tenants) and T-2026-061 read exactly as today, before and after DG1.
- [x] 1.5 **The pack header agrees before validation.** When the tender has no decision and `waitsForDg1` is false:
  - the status reads "Validating" (the tone of "Waiting for DG1" or quieter), with no `SlaClock`;
  - one line reads "Joins DG1 decisions once its fields are confirmed."
  - Once it waits, the header is as today.
  - (acceptance: at seed, `/dg1?tender=T-2026-042` reads Validating with no clock. After the bid bond is confirmed it reads "Waiting for DG1 · 21 h 41 m left of 24 h", the same as the list.)

### Phase 2 — Focus
- [x] 2.1 **Queue card:** Cancel in the Correct or Send back form returns focus to the button that opened the form.
- [x] 2.2 **DG1 Re-open:** after "Re-open DG1", the form replaces the record and its "Record DG1" heading takes focus, as after a Hold.
- [x] 2.3 **A drawer opened from another page (finding 9):**
  - When the element focused at open is gone or is `body`, closing the drawer puts focus on a sensible control on the page. For the credential drawer, that is the credential's row or its open control on the Credentials tab.
  - Drawers opened by a click still return focus to that control, as today.
  - Keep the change small: an optional fallback in `useOverlayBehaviour`, and the target in `Credentials.tsx`.
  - (acceptance: keyboard only, at 1280 dark:
    - as `najd.coord`, open Correct on a hero card, then Cancel: focus is back on Correct;
    - as `najd.bid`, re-open a recorded DG1: focus is on "Record DG1";
    - as `najd.fin`, My requests › Open credentials, then Esc: focus is on that credential's row, and Tab moves on from it.)

### Phase 3 — The stage graph's last point
- [x] 3.1 Export `windowEnd(w)` from `domain/gcc/period.ts`: `DEMO_MINUTES_END` for a window that ends at the demo clock, else `w.to`. `inWindow` uses it, with no change in behaviour.
- [x] 3.2 Use `windowEnd(w)` in place of `w.to` in `stages.metric.ts` (about 41 and 134) and `steps.metric.ts` (about 49). Change no other bound.
  - (acceptance: seed readings don't move, per dev check 99's seed row. The hero pursued live at 10:03 counts in Stage 2 at the 30-day graph's last point.)

### Phase 4 — Checks
- [x] 4.1 New `pages/gcc/dev-checks/77-dg1-routed.tsx`:
  - at seed, in all five tenants: `dg1Queue` is unchanged, and none of the four waits for DG1;
  - for each of the four, with one of its items resolved (T-2026-042: the bid bond):
    - it waits for DG1;
    - it is in the queue, due `loggedAt` + 24 h;
    - its lifecycle is at awaiting-dg1, owned by its Bid Manager;
    - `openGate` opens at `loggedAt`, with the same end as the queue's due;
  - T-2026-042 after Hold, and after Pursue then Re-open: still awaiting-dg1;
  - T-2026-042 after Pursue: Stage 2, record opened 07:41, on time;
  - `windowEnd`: the 30-day window ends 11:59; a window ending elsewhere keeps its end;
  - the hero pursued live at 10:03 counts in Stage 2 at the 30-day graph's last point.
- [x] 4.2 `/dev/checks` in all five tenants: no failing row. Before your new rows, counts are unchanged: Najd 772, Corniche 363, Dafna 344, Batinah 352, Qurain 367. Report the totals you saw.

## Data and derivation
- No new facts or `done` keys.
- The DG1 due of a validated tender comes from its register `loggedAt` and the DG1 SLA, the same formula `dg1Queue` uses. The applier derives it from existing `val:` keys, so Reset demo clears it with them.

## Acceptance checks
- [x] Typecheck and build pass.
- [x] Batinah, from Reset:
  - as `batinah.coord`, Intake queue › T-2026-042 › Bid bond amount: pick a value. The header reads "1 · Intake · Awaiting DG1" with Imran Sheikh;
  - as `batinah.bid`, DG1 decisions lists T-2026-042 with the same due as its pack and its dashboard row. Pursue works, then Demo › Advance T-2026-042 to Stage 3.
- [x] Najd T-2026-120 and Qurain T-2026-072: resolve one item; each is on its DG1 list with its Bid Manager.
- [x] Script A in Najd and Corniche T-2026-061 read exactly as after wave 7.
- [x] Focus as in Phase 2.
- [x] Reset demo returns everything to seed. No console errors. Checked at 1440 light and 1280 dark. Use your own dev server on port 5193.

## Execution report
(Filled in by the executor, 2026-09-27.)
- Changed files (all under `app/src/`):
  - `domain/gcc/dg1/record.ts`:
    - `waitsForDg1(tenant, id, done)` (1.1);
    - `dg1Queue` filters on it (1.2);
    - `dg1PackStatus(tenant, id, done)`, the pack header's status (1.5; see Deviations 3).
  - `domain/gcc/demo/05-validated.apply.ts`:
    - the next step follows `waitsForDg1`;
    - when the tender waits for DG1 and its Stage 1 facts have no `dg1Due`, it sets `dg1Due` = logging + `DG1_SLA_HOURS`;
    - the stand-down on DG1 keys is removed (1.3).
    - `10-dg1.apply.ts` is unchanged: `05` runs first, and `seedOpenedAt` already reads `openGate`.
  - `pages/gcc/s1/Dg1.tsx`:
    - the header comes from `dg1PackStatus`: a clock when there is one, else the "Joins DG1 decisions…" line (1.5);
    - a one-shot `reopened` flag is passed to the form (2.2).
  - `pages/gcc/s1/parts/Dg1Form.tsx`: a `focusHead` prop focuses the "Record DG1" heading on mount after a re-open (2.2).
  - `pages/gcc/s1/parts/Dg1Record.tsx`: an `onReopened` prop (2.2).
  - `pages/gcc/s1/parts/ValidationCard.tsx`: Cancel in the Correct and Send back forms returns focus to the button that opened the form (2.1).
  - `components/tender/Sheet.tsx` (approved in place of `Frames.tsx`): an optional `returnFocus(id)` prop, used only when the opener is gone (2.3; see Deviations 4).
  - `pages/gcc/company/Credentials.tsx`: passes the credential's first grid cell as `returnFocus` (2.3).
  - `domain/gcc/period.ts`: `windowEnd(w)`, which `inWindow` now uses, with no change in behaviour (3.1).
  - `domain/gcc/metrics/stages.metric.ts` (the `overlaps` start bound, and the `AVG_DAYS` end bound) and `steps.metric.ts` (the `overlaps` start bound): `windowEnd(w)` in place of `w.to` (3.2).
  - `pages/gcc/dev-checks/76-validated.tsx`: six targets, two texts shown on a mismatch, one row renamed, and comments (Deviations 1).
  - `pages/gcc/dev-checks/77-dg1-routed.tsx`: new, 33 rows (4.1).
  - `plans/026-dg1-after-validation.md` and my row in `plans/README.md`.
- Verification:
  - **Dev checks.**
    - Baseline before any change: Najd 772, Corniche 363, Dafna 344, Batinah 352 and Qurain 367, with 0 failing.
    - After: 805, 396, 377, 385 and 400, with 0 failing and no console errors. That is the baseline plus 77's 33 rows.
    - In the other panels, only 76's six targets moved (Deviations 1). The lifecycles panel changed only its timing line, and 99's seed row is unchanged.
  - **Mutation test.** With `w.to` put back in the two metrics, 77's two graph rows fail ("Stage 2 12 → 12", "Packaging 4 → 4"). I restored the code afterwards.
  - **`npm run typecheck` and `npm run build`** pass. The only build warning is the existing chunk-size one.
  - **Browser.** My own dev server on 5193 and my own tab, with no console errors on any run.
    - **Batinah from Reset, 1440 light:**
      - Shamsa Al-Hinai confirms the bid bond with "Use …". The workspace header reads "1 · Intake · Awaiting DG1", with Imran Sheikh, and DG1 is due Mon 9 Mar 07:41.
      - As Imran Sheikh, every screen reads "21 h 41 m left of 24 h":
        - DG1 decisions lists T-2026-042 as "Ready to decide". The DG1 due tile reads 1, "first in 21 h 41 m";
        - the pack reads "Waiting for DG1";
        - his home tracker row reads "1 · Intake · Awaiting DG1", and Needs your action reads the same time left;
        - as Said Al-Balushi (Head of Tendering), the Stage 1 dashboard's DG1 due column.
      - Pursue puts focus on "DG1 decision", and the tender is at "2 · Sourcing · Packaging". Demo › Advance T-2026-042 to Stage 3 lands on its Bid / No-Bid pack.
    - **One item resolved on each of the others:**
      - Najd T-2026-120: Aisha Al-Qahtani resolves it, and it goes to Omar Siddiqui;
      - Qurain T-2026-072: Grace Pereira resolves it, and it goes to Tariq Mahmood;
      - Batinah T-2026-041: Shamsa Al-Hinai resolves it, and it goes to Imran Sheikh.
      - Each is at Awaiting DG1 with its Bid Manager and on its DG1 list, with the same time left as its pack.
    - **DG1 paths:**
      - Hold on T-2026-041: it stays at Awaiting DG1, and its list row reads "On hold";
      - Pursue on T-2026-120: Stage 2 · Packaging;
      - Re-open on T-2026-120: Awaiting DG1, and its list row reads "Re-opened";
      - Discard on T-2026-072: the pack reads "Discarded".
    - **Unchanged screens:**
      - Script A in Najd: at seed, Validating with 21 h 44 m left. Once both fields are resolved, Awaiting DG1 with Omar Siddiqui and still 21 h 44 m. Pursue puts focus on "DG1 decision".
      - Corniche T-2026-061: Awaiting DG1 with Sameer Qureshi, 21 h 52 m left.
      - Both read as after wave 7.
    - **1.5:** at seed, the four packs read "Validating · Joins DG1 decisions once its fields are confirmed." with no clock. The Batinah hero, the low-fit and restricted packs, the Najd hero and T-2026-061 keep their header. I checked the header at 1440 light and 1280 dark, with no horizontal scroll.
    - **Keyboard only, 1280 dark:**
      - as `najd.coord`: Correct, then Cancel, puts focus on Correct, and Tab moves on to Mark not stated. Send back, then Cancel, puts focus on Send back to agent;
      - as `najd.bid`: Re-open with a reason, type the reason, then Re-open DG1. Focus is on "Record DG1", in view, and Tab moves on to Pursue;
      - as `najd.fin`, after Faisal requested the Zakat renewal: My requests › Open credentials, then Esc. Focus is on the Zakat credential's row, and Tab moves on to its Issuer, then its Valid to cell.
    - **Reset:** Settings › Reset demo › Reset all companies empties the stored actions. The four read Validating again, Batinah's DG1 list reads "Nothing is waiting for DG1", and the heroes and T-2026-061 read as at seed.
- Deviations from plan:
  1. **Dev check 76: six targets moved.** All are T-2026-042 after its bid bond is resolved; the seed rows are unchanged.
     - "every blocking field resolved": "Stage 1 · Screened · Shamsa Al-Hinai · at the later resolution" → "Stage 1 · Awaiting DG1 · Imran Sheikh · at the later resolution". It now waits for DG1 (1.3).
     - "DG1 due": "none before or after · not in the DG1 list" → "none → Mon 9 Mar 07:41 · the DG1 list agrees". The row's text for a changed due now names the time and whether the list agrees, like its other branch. It used to print "none → 2026-03-09T07:41".
     - "Stage 1 dashboard": "Screened 1 → 2" → "Awaiting DG1 0 → 1".
     - "after DG1 Pursue": "DG1 opened Sun 8 Mar 07:35, on time" → "DG1 opened Sun 8 Mar 07:41, on time". This is the move the plan expects (1.4).
     - "DG1 record as without the move": "same opening, same on-time result" → "opened Sun 8 Mar 07:41, not Sun 8 Mar 07:35 · same on-time result". The row compares with the same Pursue without the `val:` keys, which opens at the seed's validating step. Its mismatch text is now in words.
     - "Hold on a tender without a DG1 due time" is renamed "Hold on a tender with no DG1 due time in the seed": "Stage 1 · Validating · Hold opened Sun 8 Mar 07:35" → "Stage 1 · Awaiting DG1 · Hold opened Sun 8 Mar 07:41". The stand-down is gone.
     - No other target moved, in any panel or tenant.
  2. **The DG1 record's opening moves from the validating step to logging for all four.** Every result stays on time.

     | Tender | Validating step (before) | Logging (now) |
     | --- | --- | --- |
     | T-2026-042 | 07:35 | 07:41 |
     | T-2026-041 | 08:46 | 08:52 |
     | T-2026-120 | 08:07 | 08:13 |
     | T-2026-072 | 08:55 | 09:01 |

  3. **1.5 applies only to the routed tenders (approved).** The test is the `needs-validation` disposition and `waitsForDg1`. The rule is a second helper in `record.ts`, `dg1PackStatus`, so the page and dev check 77 read one rule; the plan named one helper. Its tone is grey, quieter than "Waiting for DG1".
  4. **2.3 uses `Sheet.tsx`, not `Frames.tsx` (approved).** `Frames.tsx` is unchanged.
     - An opener inside the sheet itself also counts as gone. In dev, React StrictMode runs the sheet's open effect twice. For a sheet that is open on arrival, the second run captured the sheet's own Close button as the opener. On close, that button was still mounted (the exit animation) and took focus, so focus fell to `body` and the fallback never ran. In a production build the opener is `body`, so the same rule applies.
     - **A/B against HEAD's `Sheet.tsx`, 1280 dark:** Radar and Screening, each opened by a click on a row, return focus to the clicked cell after Esc, and after ↓ then Close. The results are identical with both versions. A credential opened from the grid by Enter returns focus to that cell, as before.
  5. **2.2 focuses with `preventScroll: false`.** The form replaces the record at the top of the column, and at 1280 the heading can be above the view. The Hold heading keeps its own focus and scroll as before.
  6. **`05` and 77 import `waitsForDg1` and `dg1PackStatus` from `@/domain/gcc/dg1/record`.** They don't use the `dg1/index.ts` barrel, which isn't in Scope.
- Blockers / questions:
  1. **1.5 applies to more than the four tenders.** "When the tender has no decision and `waitsForDg1` is false" also covers the low-fit and restricted tenders. At seed their DG1 packs read "Waiting for DG1" with a clock: the Batinah hero (23 h 19 m left), Najd T-2026-119 and T-2026-121, Corniche T-2026-063 and Qurain T-2026-071. Read literally, they would change to "Validating · Joins DG1 decisions once its fields are confirmed". That is wrong for them (they aren't validating and never join the list), and it changes the Batinah hero, which 1.4 says must read as today. Proposed: apply 1.5 only to a tender that intake routed to validation (`needs-validation`) and that doesn't wait for DG1 yet. Every other pack header stays as today.
     - **Answered (user, 2026-09-27): only the routed ones.** Done that way.
  2. **2.3 needs a file outside Scope.** The credential "drawer" is the triage `Sheet` (`components/tender/Sheet.tsx`, 43–50): it keeps its own `opener` ref and refocuses it on close. It doesn't use `useOverlayBehaviour` in `Frames.tsx`, so a fallback there wouldn't reach it. Proposed: an optional `returnFocus` prop on `Sheet` (a fallback for when the opener is gone or is `body`), and `Credentials.tsx` passes the credential's grid row. `Frames.tsx` stays unchanged.
     - **Answered (user, 2026-09-27): allow `Sheet.tsx`.** Done that way.
- Follow-ups noticed (not done):
  1. **Undecided tenders whose DG1 pack shows a clock but that aren't in DG1 decisions** (at seed; unchanged, per the answer to question 1):
     - Najd: T-2026-119 (low-fit), T-2026-121 (restricted), and T-2026-123 to T-2026-128 (low-fit, six tenders);
     - Corniche: T-2026-063 (low-fit);
     - Batinah: T-2026-118, the hero (low-fit);
     - Qurain: T-2026-071 (low-fit).
     - Also Najd T-2026-122 (notice-only, never logged): its pack reads "Waiting for DG1" with no clock, and it isn't listed.
  2. **Runbook (for the orchestrator):**
     - Stage 3 entry, Batinah, step 1: T-2026-042 now moves to "1 · Intake · Awaiting DG1" with Imran Sheikh, not Screened.
     - Step 2: it is listed under DG1 decisions.
     - These known limits can go: the pack reading "Waiting for DG1" while DG1 decisions lists nothing; "Don't Hold or Re-open DG1 on a tender whose fields were just confirmed…"; and the keyboard limit (Cancel and DG1 Re-open). 016c finding 9 is fixed.
  3. **T-2026-041, T-2026-120 and T-2026-072 have no field that blocks DG1.** Their DG1 form stays usable before validation, as today (out of Scope). There:
     - a decision recorded before any item is resolved opens its DG1 record at the validating step, not at logging;
     - after a Hold, the form reads "The DG1 time limit keeps running: due …" while the header reads Validating with no clock.
  4. **`05-validated`'s Screened branch can't be reached with the seed.** Every tender at Validating is shortlisted or routed to validation, so each waits for DG1 once validated. 76's Screened wording was replaced.

