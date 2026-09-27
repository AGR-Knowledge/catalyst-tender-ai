# 026 — Validated tenders join DG1, and the last focus and graph fixes

Status: READY · Depends on: wave 7 (commit de3b8ec) · Runs alone (one session)

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
- [ ] 1.1 **One rule, one place.** Add `waitsForDg1(tenant, tenderId, done)` to `domain/gcc/dg1/record.ts`. It is true when the register tender has `intake.loggedAt` and either:
  - intake shortlisted it; or
  - intake routed it to validation (`needs-validation`) and `validatedOf(tenant, tenderId, done)` is non-null.
  - It reads only the register and `done`, never a lifecycle query, because `05-validated` calls it while lifecycles are built.
- [ ] 1.2 **`dg1Queue` uses it**, with its `done`, in place of the `shortlisted` test. Due stays `loggedAt` + `DG1_SLA_HOURS`.
  - (acceptance: at seed, every tenant's DG1 list is unchanged, with Batinah still empty. After T-2026-042's bid bond is confirmed, Batinah's list shows it, due Mon 9 Mar 07:41, "Ready to decide".)
- [ ] 1.3 **`05-validated` follows the same rule:**
  - the step is awaiting-dg1 when `waitsForDg1(tenant, id, done)`, else screened;
  - when the tender's Stage 1 facts have no `dg1Due`, set `facts.dg1Due` to `loggedAt` + the DG1 SLA, so `openGate` opens the gate where the list and the pack count from;
  - remove the stand-down on DG1 keys.
  - (acceptance: all four tenders move to "1 · Intake · Awaiting DG1" with their Bid Manager (T-2026-042 with Imran Sheikh). Their dashboards, tracker, "Needs your action" and Stage 1 "DG1 due" column show the same due as `/dg1`.)
- [ ] 1.4 **DG1 paths on the four tenders:**
  - Pursue (Stage 2 at Packaging), Discard, Hold, and Pursue then Re-open all work;
  - after a Hold or a Re-open, the tender stays at Awaiting DG1;
  - the DG1 record opens at `loggedAt` (T-2026-042: 07:41, was 07:35). Record this move under Deviations;
  - on-time results stay as they were;
  - "Advance to Stage 3" still works for T-2026-042.
  - The hero (all five tenants) and T-2026-061 read exactly as today, before and after DG1.
- [ ] 1.5 **The pack header agrees before validation.** When the tender has no decision and `waitsForDg1` is false:
  - the status reads "Validating" (the tone of "Waiting for DG1" or quieter), with no `SlaClock`;
  - one line reads "Joins DG1 decisions once its fields are confirmed."
  - Once it waits, the header is as today.
  - (acceptance: at seed, `/dg1?tender=T-2026-042` reads Validating with no clock. After the bid bond is confirmed it reads "Waiting for DG1 · 21 h 41 m left of 24 h", the same as the list.)

### Phase 2 — Focus
- [ ] 2.1 **Queue card:** Cancel in the Correct or Send back form returns focus to the button that opened the form.
- [ ] 2.2 **DG1 Re-open:** after "Re-open DG1", the form replaces the record and its "Record DG1" heading takes focus, as after a Hold.
- [ ] 2.3 **A drawer opened from another page (finding 9):**
  - When the element focused at open is gone or is `body`, closing the drawer puts focus on a sensible control on the page. For the credential drawer, that is the credential's row or its open control on the Credentials tab.
  - Drawers opened by a click still return focus to that control, as today.
  - Keep the change small: an optional fallback in `useOverlayBehaviour`, and the target in `Credentials.tsx`.
  - (acceptance: keyboard only, at 1280 dark:
    - as `najd.coord`, open Correct on a hero card, then Cancel: focus is back on Correct;
    - as `najd.bid`, re-open a recorded DG1: focus is on "Record DG1";
    - as `najd.fin`, My requests › Open credentials, then Esc: focus is on that credential's row, and Tab moves on from it.)

### Phase 3 — The stage graph's last point
- [ ] 3.1 Export `windowEnd(w)` from `domain/gcc/period.ts`: `DEMO_MINUTES_END` for a window that ends at the demo clock, else `w.to`. `inWindow` uses it, with no change in behaviour.
- [ ] 3.2 Use `windowEnd(w)` in place of `w.to` in `stages.metric.ts` (about 41 and 134) and `steps.metric.ts` (about 49). Change no other bound.
  - (acceptance: seed readings don't move, per dev check 99's seed row. The hero pursued live at 10:03 counts in Stage 2 at the 30-day graph's last point.)

### Phase 4 — Checks
- [ ] 4.1 New `pages/gcc/dev-checks/77-dg1-routed.tsx`:
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
- [ ] 4.2 `/dev/checks` in all five tenants: no failing row. Before your new rows, counts are unchanged: Najd 772, Corniche 363, Dafna 344, Batinah 352, Qurain 367. Report the totals you saw.

## Data and derivation
- No new facts or `done` keys.
- The DG1 due of a validated tender comes from its register `loggedAt` and the DG1 SLA, the same formula `dg1Queue` uses. The applier derives it from existing `val:` keys, so Reset demo clears it with them.

## Acceptance checks
- [ ] Typecheck and build pass.
- [ ] Batinah, from Reset:
  - as `batinah.coord`, Intake queue › T-2026-042 › Bid bond amount: pick a value. The header reads "1 · Intake · Awaiting DG1" with Imran Sheikh;
  - as `batinah.bid`, DG1 decisions lists T-2026-042 with the same due as its pack and its dashboard row. Pursue works, then Demo › Advance T-2026-042 to Stage 3.
- [ ] Najd T-2026-120 and Qurain T-2026-072: resolve one item; each is on its DG1 list with its Bid Manager.
- [ ] Script A in Najd and Corniche T-2026-061 read exactly as after wave 7.
- [ ] Focus as in Phase 2.
- [ ] Reset demo returns everything to seed. No console errors. Checked at 1440 light and 1280 dark. Use your own dev server on port 5193.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
