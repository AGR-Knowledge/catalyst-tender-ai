# 025b — A tender moves on once its fields are validated, and focus in Stage 1

Status: READY · Depends on: wave 6 (commit after ed0fba0) · Can run in parallel with: 025a

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
- [ ] 1.1 `05-validated.apply.ts` (runs before `10-dg1`). For a live tender currently at Stage 1 · validating, with at least one of its own validation items resolved in `done` and `blockingOpen(…).count === 0`:
  - append `{ stage: 1, step, at, ownerId }` to its log, where:
    - `step` is `awaiting-dg1` when the tender waits for DG1 (it has `dg1Due`, or is in the tenant's DG1 queue), else `screened`;
    - `at` is the latest resolution time among its blocking items (from the `val:` value), `later()` than the current step. A value without a time (dev checks write `'1'`) uses the current step's time;
    - `ownerId` follows `chain.ts`'s owner rule for that step (awaiting-dg1: the Bid Manager).
  - The applier is pure and idempotent, and returns `l` unchanged otherwise.
  - (acceptance: at seed, no tender's lifecycle changes; `/dev/checks` counts unchanged before your new rows.)
- [ ] 1.2 **The DG1 gate doesn't move.** For each tender above, in every tenant where it exists, the DG1 due time, the "Decisions on time" tile and `10-dg1`'s on-time result are the same before and after resolving its fields.
  - If a tender without `dg1Due` would open its gate later, keep the gate's opening where the seed had it, and say how under Deviations.
- [ ] 1.3 **Everything that reads the step follows**, with no other change:
  - the workspace header ("1 · Intake · Awaiting DG1 · With Omar Siddiqui, Bid Manager");
  - the Stage 1 dashboard's step counts and the tender tracker;
  - the Rail;
  - the DG1 decisions list and Needs your action, where the DG1 row still waits on the Bid Manager.
- [ ] 1.4 **Later actions still work:**
  - DG1 Pursue (Stage 2 at Packaging), Discard, Hold and Re-open;
  - "Advance to Stage 3" for T-2026-061 and T-2026-042;
  - "Start: DG1 due", which resolves the hero's two fields: its toast must still be true.

### Phase 2 — Focus in Stage 1
- [ ] 2.1 **Intake queue:** after a card is resolved, focus moves to the next card's first control, else to the group or page heading (`tabIndex={-1}`).
- [ ] 2.2 **DG1:** after Confirm, focus moves to the record's heading.
  - (acceptance: keyboard only, at 1280 dark: resolve both hero fields, then record DG1. Tab continues from where you were each time.)

### Phase 3 — Checks
- [ ] 3.1 New `pages/gcc/dev-checks/76-validated.tsx`. For the hero in Najd:
  - seed: validating;
  - one blocking field resolved: still validating;
  - both resolved: awaiting-dg1, owned by the Bid Manager, at the later resolution's time;
  - DG1 due unchanged;
  - after DG1 Pursue: Stage 2 · packaging, as today.
  - The same for T-2026-061 (Corniche) and T-2026-042 (Batinah).
- [ ] 3.2 `/dev/checks` in all five tenants: no failing row. Existing counts are unchanged (Najd 729, Corniche 320, Dafna 301, Batinah 309, Qurain 324) plus your new rows.
  - Plan 025a adds rows too: report yours and the totals you saw.

## Data and derivation
No new facts or `done` keys. The applier derives a log entry from existing `val:` keys, so Reset demo clears it with them.

## Acceptance checks
- [ ] Typecheck and build pass.
- [ ] Script A in Najd, from "Start: morning intake":
  - as `najd.coord`, resolve both hero fields;
  - the header reads "1 · Intake · Awaiting DG1" with Omar Siddiqui;
  - as `najd.hot`, the Stage 1 dashboard counts it at Awaiting DG1, and `/dg1` shows the same DG1 due as before;
  - record Pursue: Stage 2, as today.
- [ ] The same in Corniche for T-2026-061 (then "Advance to Stage 3"), and in Batinah for T-2026-042.
- [ ] Keyboard focus as in Phase 2.
- [ ] Reset demo returns to seed. No console errors. Checked at 1440 light and 1280 dark.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
