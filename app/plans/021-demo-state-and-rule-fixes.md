# 021 — Demo actions reach every screen, and rule fixes from the 020 review

Status: READY · Depends on: 017, 007a, 008a, 009a, 020 (all in `gcc-demo`) · Can run in parallel with: 015, 013 and 019

## Goal
When a presenter records something in the demo (DG1 Pursue on the hero, RFQs sent, the pack issued, a committee position, the DG2 approval), **every dashboard, tracker and table shows it at once**, and Reset demo takes it back. Today the lifecycles ignore demo actions (`withDemoState` is a stub), so the Stage 1 screen and the dashboards would disagree the moment someone clicks. That breaks the app's first rule, "the same tender must never disagree between two screens".

The plan also closes the rule bugs the 2026-09-26 review of plan 020 found in Stages 1–3.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Apply only what the demo scripts do** (s1-s3-demo-spec §17 A–C): DG1 (Pursue, Discard, Hold, re-open), Stage 2 progress (packaging, shortlist, RFQs sent, levelling, best-fit mix), Stage 3 (inputs, pack issued, positions, DG2 approval, No-Bid, re-open). Don't model Stages 4–9 actions; there are no screens for them.
- **Keep the new dev check to about 15 rows**: one per applier and one per script path.
- No new facts, no new capabilities, no new libraries.

## Context
- **Why:** CLAUDE.md rule 1 (one derivation, no disagreement between screens) and rule 3 (demo state survives a reload and is cleared by Reset). Plans 007b, 008b and 009b will build the screens that write these keys; this plan makes sure what they write shows everywhere.
- **Already in the code** (orchestrator, 2026-09-26):
  - Every lifecycle query in `domain/gcc/lifecycle.ts` takes an optional last argument `done`, passed down to `allOf(tenant, _done)`, which **ignores it today**.
  - `queriesFor({ tenant, viewer, done })` binds the queries. Plans 015, 013 and 019 (running in parallel) call queries through it.
  - `DataPort.rows(..., done?)` and `.tracker(..., done?)` accept it and pass it to the queries.
  - **Your job is to make `allOf(tenant, done)` return the merged lifecycles.** Signatures stay as they are, so the parallel plans need no change.
- **Read first:**
  - `data/gcc/lifecycle/index.ts`: `withDemoState(l, done)`, the stub;
  - `data/gcc/lifecycle/types.ts`: `Lifecycle`, `StageEntry`, `GateRecord`, `StepFacts`;
  - `domain/gcc/lifecycle.ts`: `allOf`, `eligibilityOf` and `staleOf`, whose module caches are keyed by tender only and read the seed (`{}`);
  - the done-key tables in plans 007a, 008a (`## Done-key conventions`) and 009a, and each module's own readers: `dg1RecordFor` (007a), `pursueOf`, `sentBatches`, `rfqCounts` (008a), `packVersionsFor`, `dg2RecordFor`, `reopenStateFor` (009a);
  - `data/gcc/stages.ts`: the step keys of Stages 1–4.
- **The layering constraint** (lane B, 020): `data/gcc/**` can't import `domain/gcc/s1|s2|s3|dg1|dg2` (import cycle). So the appliers live in `domain/`, and `allOf` in `domain/gcc/lifecycle.ts` calls them. `withDemoState` in the data layer stays a no-op or is removed; say which in the report.

## Scope
**Files to create:**
- `src/domain/gcc/demo/types.ts`: `Applier = { id: string; apply(tenant: string, l: Lifecycle, done: DemoDone): Lifecycle }` (pure, returns a new object when it changes anything).
- `src/domain/gcc/demo/index.ts`: collect `./*.apply.ts` with `import.meta.glob({ eager: true })` in file-name order.
- `src/domain/gcc/demo/10-dg1.apply.ts`, `20-stage2.apply.ts`, `30-stage3.apply.ts`, `40-dg2.apply.ts`.
- `src/pages/gcc/dev-checks/45-demo-state.tsx`.

**Files to change:**
- `src/domain/gcc/lifecycle.ts`: `allOf` applies the appliers, memoised per tenant on the `done` object's identity (a `WeakMap<DemoDone, Lifecycle[]>` per tenant). `eligibilityOf` and `staleOf` take `done` and key their caches on it.
- `src/domain/gcc/lifecycle.port.ts`: pass `done` into `eligibilityOf`, `staleOf` and the fit and facts it reads.
- `src/data/gcc/lifecycle/index.ts`: the stub (keep it as a documented no-op, or remove it with its re-export in `data/gcc/index.ts`).
- `src/domain/gcc/dashboards/build.ts` (006's): the one call to `port.rows(...)` passes `ctx.done`. Touch nothing else there.
- `src/pages/gcc/DashboardRoute.tsx` (006's): make sure the dashboard is rebuilt when `state.done` changes (it's in `KpiCtx`; check the memo's dependencies).
- **Rule fixes (Phase 4):** `src/domain/gcc/dg1/**`, `src/domain/gcc/s1/intake.ts`, `src/domain/gcc/s2/**`, `src/domain/gcc/s3/**`, `src/domain/gcc/dg2/**`, and their dev checks (`70-stage1.tsx`, `80-stage2.tsx`, `90-stage3.tsx`, `40-lifecycle.tsx`).

**Out of scope** (stop and ask):
- Any screen, any registry file (KPIs, flows, actions, metrics, columns, dashboards), `components/**`, `App.tsx`, `pages/gcc/workspace/**`. Plans 015, 013 and 019 own those right now.
- Seed data (`data/gcc/**` other than the stub), `access.ts`, `people.ts`, the store.
- Changing a query's signature. They're fixed; the parallel plans are coding against them.

## Steps

### Phase 1 — The applier pipeline
- [ ] 1.1 `demo/types.ts` and `demo/index.ts` as above.
- [ ] 1.2 `allOf(tenant, done)`: with no `done`, or an empty one, return the seed array itself (the same object, so seed readings and the existing dev checks are untouched). Otherwise map every lifecycle through the appliers in order, memoised on `done`'s identity.
- [ ] 1.3 Keep every applier **idempotent and order-safe**: it reads only its own keys, starts from the lifecycle it's given, and never mutates it.
- [ ] 1.4 The demo clock doesn't move (`nowIso()` is Sun 8 Mar 10:00). A demo action's time is the value's own `at`. When two actions share a time, order them by their natural sequence (DG1 before RFQs), not by time alone.

### Phase 2 — Appliers
- [ ] 2.1 **`10-dg1.apply.ts`**, from 007a's `dg1RecordFor(tenant, id, done).current` (after the round fix, 4.1):
  - **Pursue:** add a `GateRecord` (DG1, `pursue`, by, at, reasons, on time against the SLA), close the Stage 1 log entry, and add a Stage 2 entry at the first Stage 2 step at the decision time, with the DG1 team's Procurement owner. Stage 2 facts come from 20-stage2.
  - **Discard:** the gate record, plus `closedAt`, `closedAs: 'discarded'` and the reason as `closedNote`, in the tracker's words.
  - **Hold:** the gate record only; the tender stays in Stage 1.
  - **Re-opened:** the current record is gone (007a says so), so the demo's gate and moves disappear and the tender is back awaiting DG1. Earlier rounds stay in the history as closed gate records if 007a keeps them; show them in the tracker as "re-opened".
- [ ] 2.2 **`20-stage2.apply.ts`**, for tenders in Stage 2 after 2.1 (seeded, or pursued in the demo):
  - the step follows the furthest recorded action: `pkg:` → shortlisting; `shortlist:` → RFQs; `rfq-sent:` → the replies step; any `lev:` → levelling; `mix:` → the last Stage 2 step (use the real step keys from `data/gcc/stages.ts`);
  - `facts.s2` (packages, covered, RFQs sent, due, overdue, escalated, to level, not covered %, replies due) come from 008a's own counts with `done` (`rfqCounts`, `coverageOf`, whatever 008a exports). **They must equal what 008a's rules say**: that's the one-derivation rule.
- [ ] 2.3 **`30-stage3.apply.ts`**, for Stage 3 tenders:
  - inputs submitted or late, from 009a's inputs with `done`;
  - pack issued (`packVersionsFor`): the step moves to the committee step, and `packIssuedAt` is set;
  - positions recorded (`bySeat`) from 009a's positions with `done`;
  - stale or fresh from `staleOf(tenant, l, done)`.
- [ ] 2.4 **`40-dg2.apply.ts`**, from 009a's `dg2RecordFor(tenant, id, done)`:
  - **Bid** or **Bid with conditions** approved by the Head of Tendering: the DG2 gate record (with the conditions count), and Stage 4 entered at its first step;
  - **No-Bid:** closed, `closedAs: 'no-bid'`;
  - **Re-open** (approved): back to Stage 3, with the round's record kept.
- [ ] 2.5 **Stage 1 facts with `done`:** `eligibilityOf(tenant, l, done)` (a renewed credential changes the counts), the open validations count (`val:` keys, through 007a's `validationsOf`), and the booklet purchase if 007a records one.

### Phase 3 — Everything reads the merged state
- [ ] 3.1 `build.ts` passes `ctx.done` to `port.rows`, and the dashboard memo depends on `state.done`.
- [ ] 3.2 A grep in the report: every `lifecyclesOf`, `liveOf`, `gateEventsIn` (…) call outside `lifecycle.ts` passes `done`, or goes through `queriesFor`. Dev checks that assert seed values pass `{}` explicitly. List any caller you couldn't change because another plan owns it (015, 013 and 019 are told to use `queriesFor`).

### Phase 4 — Rule fixes (from the 020 review)
- [ ] 4.1 **DG1 rounds** (`dg1/record.ts:~61`, MED). A re-open is matched to the decision it cleared by comparing whole records, and the demo clock never moves. So Pursue → Re-open → Pursue with the same team writes an identical record that counts as already cleared: the tender stays in the DG1 queue and never returns to Stage 2. **Fix:** add `round` to `Dg1Decision` (as DG2 has), write it on every decision, and compare rounds. (acceptance: a dev-check flow Pursue → Re-open → Pursue ends in Stage 2; Discard → Re-open → Discard ends discarded.)
- [ ] 4.2 **JV partner must clear the PQ** (`dg1/decision.ts:~108`). Pursue with a JV strategy passes without a note only when the partner is the recommendation's `jvPartner`, or `eligibilityFor` with that scenario has no fail. Otherwise it asks for a note.
- [ ] 4.3 **PQ-fail discard audit text** (`dg1/decision.ts:~229`): say "the open fields cannot change a PQ fail" only when a `pq-fail*` reason is chosen.
- [ ] 4.4 **Stage 2 writes need a live pursue** (`s2/rfq.ts:~180`, `shortlist.ts:~191`, `levelling.ts:~206`): return `{ error: 'This tender is no longer pursued (DG1 was re-opened).' }` when `pursueOf` is null.
- [ ] 4.5 **Reply due at exactly 10:00** (`s2/tracking.ts:~185` against `:25`): "ahead" is `>= now`, so an RFQ due at 10:00 is ahead, not lost between overdue and ahead.
- [ ] 4.6 **DG2 conditions masked** (`dg2/conditions.ts:30,48`, `dg2/record.ts:105`, MED). `conditionsFor`, `conditionsOpen` and `dg2RecordFor` take an optional viewer, `{ canSeeMargin }`. A condition that states a margin (seeded: the CFO's "Minimum margin 9%") reads "Minimum margin condition (figure masked for your role)" for masked viewers. Mark the condition as margin in the data it's derived from, not by matching text. Add a masked row to 90-stage3.
- [ ] 4.7 **`canSeePositions` is required** on `PackViewer` (`s3/pack.ts:32`), so a page can't forget it and show the Commercial Manager win probability.
- [ ] 4.8 **Other tenders' win in 9.4** (`s3/pack.ts:~318`): check `see.positions` per tender (the tender's own `can()` context), or drop other tenders' win from `ifWon[]`.
- [ ] 4.9 **One mask for pack versions** (`s3/versions.ts:~87` against `pack.ts:~254`): the compare view and `maskFreshness` use one shared function, which masks 9.7 margin changes and 9.1 win changes alike.
- [ ] 4.10 **Radar and dashboard agree on today's captures** (`s1/intake.ts:~212`). The rule (plan 020 B3): people not cleared never count the restricted tender. `radarFor` takes an optional viewer and leaves it out of counts and rows for them, the same as `capturesIn(…, viewer)`. Add a 70-stage1 row: the Coordinator's radar count equals her `capturesIn` count.

### Phase 5 — Dev check (`45-demo-state.tsx`, about 15 rows)
Each row builds an in-memory `done` with the real write helpers (`dg1Write`, 008a's writes, `packIssueWrite`, the DG2 writes), then reads through `queriesFor({ tenant, viewer, done })` and `dataPort().rows(..., done)`:
- [ ] 5.1 **Script A:** DG1 Pursue on the hero (Najd `HERO_ID`) → its row is in Stage 2 at the first step; Stage 1 live count 12 → 11 and Stage 2 +1 for Faisal; the tracker shows the DG1 chip "Pursue · {the hero's Bid Manager} · 8 Mar 10:00 · on time"; `gateEventsIn(today, 'DG1')` includes it.
- [ ] 5.2 Pursue → Re-open → the hero is back in Stage 1; → Pursue again → Stage 2 (4.1).
- [ ] 5.3 Discard on a low-fit tender → closed as discarded, and the stage counts move.
- [ ] 5.4 **Script B:** on the hero after Pursue, `pkg:` then `shortlist:` then `rfq-sent:` → the step moves each time, and `facts.s2.rfqs.sent` equals 008a's own count.
- [ ] 5.5 **Script C:** T-2026-097: re-run and issue the pack → fresh; a third and fourth position recorded → positions 4 of 5; the Head of Tendering approves Bid with conditions → the row is in Stage 4, and `gateEventsIn(today, 'DG2')` includes it.
- [ ] 5.6 No-Bid on T-2026-101 → closed as no-bid.
- [ ] 5.7 Masking holds on merged state: after 5.5, the Procurement Lead's row for T-2026-097 has no win, positions or price.
- [ ] 5.8 Reset: with `done = {}`, every seed reading is back (compare the Najd stage counts with the seed's).
- [ ] 5.9 Determinism: applying the same `done` twice gives equal results, and the memo returns the same array for the same `done` object.

## Data and derivation
- **No new facts and no new `done` keys**, except `round` inside `dg1:` values (4.1). Old values without `round` read as round 1.
- **Reset** clears everything as before: `done` is emptied, and `allOf(tenant, {})` returns the seed.

## Acceptance checks
- [ ] typecheck and build pass.
- [ ] `/dev/checks` in all five GCC tenants: every panel passes (formats, people, 30, 40, 45, 70, 80, 90, and 50 and 60 if 015 and 013 have landed), with no console errors. **Seed readings are unchanged.**
- [ ] In the browser, as Najd's Head of Tendering: write a DG1 Pursue for the hero from the browser console using `dg1Write` and `mark` (there's no DG1 screen yet), reload, and see the hero move from Stage 1 to Stage 2 on the dashboard table and tracker. Settings → Reset demo moves it back.
- [ ] gen-in unchanged.
- [ ] No `Date.now`, `Math.random` or bare `new Date()`; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
