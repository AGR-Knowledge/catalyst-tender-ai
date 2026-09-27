# 025b — A tender moves on once its fields are validated, and focus in Stage 1

Status: DONE — awaiting review (2026-09-27) · Depends on: wave 6 (commit after ed0fba0) · Can run in parallel with: 025a

## Goal
When the Tender Coordinator resolves a tender's last blocking field, the tender moves on at once. The hero reads "1 · Intake · Awaiting DG1", with its Bid Manager, on the workspace header, the Stage 1 dashboard and the tracker. Today it stays "Validating", with the Coordinator, until DG1 is recorded (script A, steps 2 → 6).

Keyboard focus also stays in place after a queue card is resolved and after DG1 is recorded.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Fix, don't build:** one new applier and focus handling. No new screens, capabilities, `done` keys or libraries.
- **Keep seed readings still:**
  - at seed nothing moves; the change shows only after a demo action;
  - the DG1 due time and SLA of every tender must not move.
- **Stay in your files** (Scope). Plan 025a runs at the same time and owns Stage 2, Stage 3, DG2, DG3, `state/store.tsx`, `useS1.ts`, and dev checks 80–99. If a fix needs another file, stop and ask.
- If a dev-check target moves, record old → new under Deviations, with why.

## Context
- **Why:** 016c finding 1 (`app/plans/016c-script-qa.md`, Findings row 1), listed in the runbook's known limits. After the Coordinator resolves both fields, the prospect is told "the DG1 pack is ready", yet the tender still reads "Validating" with the Coordinator.
- **The steps** (`data/gcc/stages.ts` about 31–37): captured, documents-in, validating, screened, awaiting-dg1.
  - Owners come from `data/gcc/lifecycle/chain.ts`: awaiting-dg1 is the Bid Manager's (about 123).
- **Seeded at validating** (`now: { stage: 1, step: 'validating' }`):
  - the hero in each tenant: `data/gcc/lifecycle/live/najd.ts` about 97, `corniche.ts` about 20, `dafna.ts` about 19, `qurain.ts` about 34, and Batinah's;
  - Corniche T-2026-061 (`corniche.ts` about 28);
  - Batinah T-2026-041 and T-2026-042 (`batinah.ts` about 27 and 33);
  - Najd T-2026-120 (`najd.ts` about 115).
- **Resolving a field:**
  - the intake queue (`pages/gcc/s1/IntakeQueue.tsx`, `parts/ValidationCard.tsx`) writes `val:{validationId}` through `domain/gcc/s1/validation.ts`;
  - `blockingOpen(tenant, tenderId, done)` (`validation.ts` about 142) counts the blocking items still open.
- **The DG1 gate** (`domain/gcc/lifecycle.ts` about 244–252, `openGate`): it opens from `facts.dg1Due` when the facts give one, else from the awaiting-dg1 step's time.
  - So for a tender with `dg1Due` (the hero), a new awaiting-dg1 entry doesn't move the gate. For a tender without one, it would open the gate later. Check which tenders have `dg1Due`, and keep every gate where it is.
- **Appliers** (`domain/gcc/demo/*.apply.ts`, contract in `types.ts`) run in file-name order: 10-dg1, 20-stage2, 25-stage3-entry, 30-stage3, 40-dg2, 50-dg3, 90-invited.
  - 10-dg1 applies to a tender in Stage 1 with no DG1 on record.
  - Its `seedOpenedAt` (about 37) reads `openGate` first.
- **Keyboard focus:**
  - 016c finding 8: resolving a field removes its card, and focus falls to the page;
  - after DG1's Confirm (`parts/Dg1Form.tsx` → `parts/Dg1Record.tsx`), the same.

## Scope
- **Files to create or change:**
  - new `domain/gcc/demo/05-validated.apply.ts`;
  - `domain/gcc/s1/validation.ts`: a read-only helper, if needed (for example the latest resolution time of a tender's blocking items);
  - `pages/gcc/s1/IntakeQueue.tsx`, `parts/ValidationCard.tsx`, `parts/Dg1Form.tsx`, `parts/Dg1Record.tsx` and, if focus needs it, `Dg1.tsx`;
  - dev checks `40-lifecycle`, `45-demo-state`, `46-presenter`, `60-stages`, `70-stage1`, `71-tender-061`, `72-tender-042`, `75-stage1-screens`, and a new `76-validated.tsx`.
- **Out of scope:**
  - seed data (`data/**`);
  - `pages/gcc/s1/UploadGcc.tsx` and `parts/KeyDateList.tsx` (the orchestrator changed them);
  - presets' recipes (`domain/gcc/demo/presets/**`): if a preset's toast becomes wrong, stop and ask;
  - everything plan 025a owns;
  - the runbook and the spec (the orchestrator updates them after review).

## Steps
### Phase 1 — The applier
- [x] 1.1 `05-validated.apply.ts` (runs before `10-dg1`). For a live tender currently at Stage 1 · validating, with at least one of its own validation items resolved in `done` and `blockingOpen(…).count === 0`:
  - append `{ stage: 1, step, at, ownerId }` to its log, where:
    - `step` is `awaiting-dg1` when the tender waits for DG1 (it has `dg1Due`, or is in the tenant's DG1 queue), else `screened`;
    - `at` is the latest resolution time among its blocking items (from the `val:` value), `later()` than the current step. A value without a time (dev checks write `'1'`) uses the current step's time;
    - `ownerId` follows `chain.ts`'s owner rule for that step (awaiting-dg1: the Bid Manager).
  - The applier is pure and idempotent, and returns `l` unchanged otherwise.
  - (acceptance: at seed, no tender's lifecycle changes; `/dev/checks` counts unchanged before your new rows.)
- [x] 1.2 **The DG1 gate doesn't move.** For each tender above, in every tenant where it exists, the DG1 due time, the "Decisions on time" tile and `10-dg1`'s on-time result are the same before and after resolving its fields.
  - If a tender without `dg1Due` would open its gate later, keep the gate's opening where the seed had it, and say how under Deviations.
- [x] 1.3 **Everything that reads the step follows**, with no other change:
  - the workspace header ("1 · Intake · Awaiting DG1 · With Omar Siddiqui, Bid Manager");
  - the Stage 1 dashboard's step counts and the tender tracker;
  - the Rail;
  - the DG1 decisions list and Needs your action, where the DG1 row still waits on the Bid Manager.
- [x] 1.4 **Later actions still work:**
  - DG1 Pursue (Stage 2 at Packaging), Discard, Hold and Re-open;
  - "Advance to Stage 3" for T-2026-061 and T-2026-042;
  - "Start: DG1 due", which resolves the hero's two fields: its toast must still be true.

### Phase 2 — Focus in Stage 1
- [x] 2.1 **Intake queue:** after a card is resolved, focus moves to the next card's first control, else to the group or page heading (`tabIndex={-1}`).
- [x] 2.2 **DG1:** after Confirm, focus moves to the record's heading.
  - (acceptance: keyboard only, at 1280 dark: resolve both hero fields, then record DG1. Tab continues from where you were each time.)

### Phase 3 — Checks
- [x] 3.1 New `pages/gcc/dev-checks/76-validated.tsx`. For the hero in Najd:
  - seed: validating;
  - one blocking field resolved: still validating;
  - both resolved: awaiting-dg1, owned by the Bid Manager, at the later resolution's time;
  - DG1 due unchanged;
  - after DG1 Pursue: Stage 2 · packaging, as today.
  - The same for T-2026-061 (Corniche) and T-2026-042 (Batinah).
- [x] 3.2 `/dev/checks` in all five tenants: no failing row. Existing counts are unchanged (Najd 729, Corniche 320, Dafna 301, Batinah 309, Qurain 324) plus your new rows.
  - Plan 025a adds rows too: report yours and the totals you saw.

## Data and derivation
No new facts or `done` keys. The applier derives a log entry from existing `val:` keys, so Reset demo clears it with them.

## Acceptance checks
- [x] Typecheck and build pass.
- [x] Script A in Najd, from "Start: morning intake":
  - as `najd.coord`, resolve both hero fields;
  - the header reads "1 · Intake · Awaiting DG1" with Omar Siddiqui;
  - as `najd.hot`, the Stage 1 dashboard counts it at Awaiting DG1, and `/dg1` shows the same DG1 due as before;
  - record Pursue: Stage 2, as today.
- [x] The same in Corniche for T-2026-061 (then "Advance to Stage 3"), and in Batinah for T-2026-042.
- [x] Keyboard focus as in Phase 2.
- [x] Reset demo returns to seed. No console errors. Checked at 1440 light and 1280 dark.

## Execution report
(Filled in by the executor, 2026-09-27.)
- **Changed files:**
  - new `domain/gcc/demo/05-validated.apply.ts`: the applier (runs before `10-dg1`);
  - `domain/gcc/s1/validation.ts`: new read-only `validatedOf(tenant, tenderId, done)`. It is imported straight from the module, since `s1/index.ts` is not in scope;
  - `pages/gcc/s1/IntakeQueue.tsx`: focus after an action on a card; the group card gets an `id` and its heading span gets `tabIndex={-1}`;
  - `pages/gcc/s1/parts/ValidationCard.tsx`: an `onActed` callback and a `data-vq` attribute;
  - `pages/gcc/s1/Dg1.tsx`: passes "just recorded" from the form to the record;
  - `pages/gcc/s1/parts/Dg1Record.tsx`: the heading takes focus after Confirm;
  - `pages/gcc/s1/parts/Dg1Form.tsx`: an `onRecorded` callback; after a Hold (the form stays), its own heading takes focus;
  - new `pages/gcc/dev-checks/76-validated.tsx`: 28 rows;
  - dev checks 40, 45, 46, 60, 70, 71, 72 and 75 did not need changes.
- **How the applier works:**
  - It acts on a live tender at Stage 1 · Validating when `validatedOf` says no blocking item is open and at least one of its own items is resolved.
  - It appends one log entry:
    - Awaiting DG1, owned by `bidManagerId`, when the tender has `dg1Due` or sits in `dg1Queue(tenant, {})`;
    - otherwise Screened, owned by `{tenant}.coord`, following `chain.ts`'s `stepOwnerRole`.
  - The entry's time is the latest resolution time, `later()` than the current step. A value with no time (`'1'`) uses the current step's time.
  - Which tenders go where (every tenant checked):
    - Awaiting DG1: the hero in Najd, Corniche and Dafna, and Corniche's T-2026-061. All have `dg1Due` and are in the DG1 queue.
    - Screened: Batinah's T-2026-042 and T-2026-041, Najd's T-2026-120 and Qurain's T-2026-072. None has `dg1Due` or is in the queue.
    - No tender is in the DG1 queue without `dg1Due`.
- **Verification:**
  - **Build:** `npm --prefix app run typecheck` and `run build` pass (the chunk-size warning is as before).
  - **Harness:**
    - Playwright (headless Chromium) on my own dev server, port 5192, reading rendered text, `document.activeElement` and the console. Screenshots were checked by eye for focus rings in dark mode.
    - A Node probe through Vite's SSR loader runs the rules directly.
  - **Probe of every validating tender:**
    - These leave every tender where it is: the seed; an unrelated `done` key; one of the hero's two blocking fields; a field sent back.
    - Every blocking field resolved moves the tender as above. The DG1 gate (`openGate` opening and end) is identical before and after.
    - DG1 Pursue, Hold, Discard and Pursue-then-Re-open all work. Each DG1 record keeps the seed's opening and on-time result:
      - hero Najd 07:44, Corniche 09:04, Dafna 08:26;
      - T-2026-061 07:52;
      - T-2026-042 07:35, T-2026-041 08:46, T-2026-120 08:07, T-2026-072 08:55.
  - **Script A in Najd, from the seed** ("Start: morning intake" writes nothing, per check 46), at 1440 light and 1280 dark, keyboard only for the queue and DG1:
    - As `najd.coord`, both hero fields resolved with Enter. After the first, focus goes to the next card's first control (its page chip). After the second, it goes to the group heading. Tab continues to "Open tender".
    - The header goes from "1 · Intake · Validating · With Aisha Al-Qahtani" to "1 · Intake · Awaiting DG1 · With Omar Siddiqui, Bid Manager".
    - Other screens that follow:
      - the workspace tracker: "Now: 1 · Intake · Awaiting DG1 · With Omar Siddiqui";
      - "Where it stands";
      - the Rail: the "Resolve 2 fields" line goes and confidence rises to High;
      - the Stage 1 dashboard row reads "1 · Intake Awaiting DG1"; the flow's Awaiting DG1 box counts it (check 76);
      - `/dg1` shows the same "21 h 44 m left of 24 h", now "Ready to decide";
      - the Bid Manager's "Needs your action" DG1 row still waits on the Bid Manager, now "the evidence pack is ready", same time left. The Head of Tendering's list is unchanged.
    - As `najd.bid`: Pursue → Review → Confirm by keyboard. Focus goes to the "DG1 decision" heading (ring visible, page at the top); Tab continues to "Decisions & audit". The header reads "2 · Sourcing · Packaging · With Joseph Mathew".
  - **Corniche T-2026-061** (1440 light and 1280 dark):
    - Resolving the blocking field moves it to Awaiting DG1 with Sameer Qureshi; focus goes to the remaining card.
    - `/dg1` due is unchanged (21 h 52 m left).
    - Pursue by Rania Khoury as delegate, with a note, leads to Stage 2. Demo › Advance T-2026-061 to Stage 3 gives "3 · Bid decision · Pack in preparation", with its toast.
  - **Batinah T-2026-042** (1440 light and 1280 dark):
    - Resolving the blocking field moves it to "1 · Intake · Screened" with Shamsa Al-Hinai (see Blockers / questions).
    - DG1 Pursue by Imran Sheikh leads to Stage 2; Advance leads to Stage 3.
  - **Other checks at 1280 dark, Najd:**
    - Send back: the card stays open and focus returns to its first control.
    - "Start: DG1 due": the toast is still true ("2 fields that blocked DG1 are resolved, so the hero's DG1 pack is ready…") and the hero now reads Awaiting DG1 with Omar.
    - Hold: the form stays and focus goes to its "Record DG1" heading; the header keeps Awaiting DG1.
    - Profile › Reset demo › Reset all companies: the hero is back at Validating with Aisha, and stored `doneBy` is `{}`.
  - **Console:** no errors in any run. The only messages are React Router's existing future-flag warnings.
  - **`/dev/checks`, all five tenants: no failing row.**
    - Totals: Najd 757, Corniche 348, Dafna 329, Batinah 337, Qurain 352. Each is the plan's count plus my 28 rows; 025a had added no rows when I ran it.
    - The text of every other panel is identical to the baseline I captured before any change.
- **Deviations from plan:**
  - **No dev-check target moved.**
  - **How the gate stays for a tender without `dg1Due`** (1.2):
    - `10-dg1`'s `seedOpenedAt` falls back to the step the tender waits at. After the move, that would be the resolution time rather than the seed's Validating time.
    - So the applier stands down for a tender without `dg1Due` once a `dg1:`, `dg1-hold:` or `dg1-reopen:` key is on record for it. `10-dg1` then reads the seed's step, and the record opens exactly where it did (T-2026-042: 07:35).
    - With `dg1Due`, `openGate` reads the due time, so the hero and T-2026-061 keep their entry through every DG1 path.
    - Side effect: after a Hold or a Re-open on T-2026-042, 041, 120 or 072, the tender reads Validating again, as it did before this plan. No script does that.
  - **Entry time for a tender with no blocking items** (T-2026-120, 041, 072): the latest resolution among its resolved items. The plan names only blocking items.
  - **Screened on the first resolution:** such a tender moves as soon as one of its items is resolved, even with another non-blocking item still open. That is rule 1.1 as written (no blocking item open, one resolved).
- **Blockers / questions:**
  1. **T-2026-042 reads "Screened · With Shamsa Al-Hinai", not "Awaiting DG1 · With Imran Sheikh".**
     - Rule 1.1 sends it to Screened: it has no `dg1Due`, and intake routed it to validation, not to the DG1 queue.
     - The acceptance's "the same … in Batinah for T-2026-042" could be read as Awaiting DG1. Meanwhile the queue's callout says "The Bid Manager can record DG1 now".
     - If you want Awaiting DG1 for it, the change in `05-validated` is small. But its dashboards would then show a DG1 gate where the seed shows none, unless its facts gain a DG1 due time (logged + 24 h, what `/dg1?tender=` already shows). That touches the "no DG1 due time may move" rule, so it is your call.
  2. **Runbook, not mine to change:** "DG1 decisions › T-2026-042" can't be followed from the list. T-2026-042 is not in the DG1 list, before or after this plan; the presenter reaches it through the queue's "Open the DG1 pack".
- **Follow-ups noticed (not done):**
  - Focus still falls to the page after Cancel in a card's Correct or Send back form, and after DG1 Re-open (the form replaces the record).
  - The Stage 1 flow's Screened box doesn't count the hero, which goes straight from Validating to Awaiting DG1. The flow's note says the counts need not add up.
  - `domain/gcc/demo/index.ts`'s comment lists the appliers from DG1 onwards; `05-validated` now runs first (not my file).
  - The better fix for the stand-down above is in `10-dg1.apply.ts`: read the step before a validated entry in `seedOpenedAt`.
