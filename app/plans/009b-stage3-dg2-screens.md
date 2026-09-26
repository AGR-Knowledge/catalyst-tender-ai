# 009b — Stage 3 bid pack, DG2 and the contributor forms

Status: READY · Depends on: 009a, 019, 021 (all in `gcc-demo`) · Can run in parallel with: 007b, 008b, 011, 022, 023

## Goal
Demo script C, "The committee decides" (s1-s3-demo-spec §17, as changed by dashboards.md §9), runs by clicking. The Bid Manager opens the **Bid / No-Bid pack** (win probability 58 ± 8 with its drivers, cited competitors, eligibility, capacity clash, facility headroom, risks, margin range, recommendation, inputs, freshness); a stale pack is **re-run**; the pack is **issued**, which starts the 24-hour DG2 clock; members (CFO, Technical Director, CEO…) **record positions** with comments and conditions; at quorum (3 of 5) the **Head of Tendering approves** Bid with conditions (a reason is required against the majority); the conditions become tracked items and the tender moves to Stage 4. No-Bid drafts the **decline letter**. Contributors fill their **pack inputs** from My requests. Margin and positions are masked for people not cleared. It works on T-2026-097 (seeded at DG2, pack stale after Addendum 2), on the hero after Stage 2, and on 022's and 023's tenders.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Screens only, on 009a's rules.** Every value comes from `domain/gcc/s3` and `domain/gcc/dg2`. No new rules. If a value is missing, show less and note it.
- **Polish the pack's first screen and the members panel**: that is where the CEO in the audience looks.
- **Keep the dev check small:** about 10 rows.
- **Always pass `state.done`**, and pass the viewer's sight (`{ canSeeMargin, canSeePositions }`) to every pack and DG2 read.

## Context
- **Why:** s1-s3-demo-spec §9 (the pack, sections 9.1–9.10), §10 (DG2) as changed by dashboards.md §9 and roles-and-access R8 (members record positions; **the Head of Tendering approves**; the CEO is a member; quorum 3 of 5), §8.9 (internal inputs), §17 script C; kpi-and-screen-catalogue §C.6 (the contributor input forms); ui-direction §6.2 (MembersPanel), §7.5 (masking), §13.
- **Hooks you call** (plan 021 review, file:line as of commit `5e71914`):
  - Pack: `packFor(tenant, tenderId, done, { canSeeMargin, canSeePositions })` `s3/pack.ts:255`; `issueBlockers` `:473`; `packIssueWrite(tenant, tenderId, done, byId, reason?)` `:478`; `packNoteWrite` `:502` (the presenter's note; numbers stay locked); `lensFor(seat)` `:513` (which section a member opens first); `freshnessFor` (`s3/freshness.ts:54`); `packVersionsFor`, `compareVersions`, `packRerunWrite(tenant, tenderId, done, byId)` (`s3/versions.ts`); `winFor`, `calibrationFor` (`s3/win.ts`); `competitorsFor` (`s3/competitors.ts`); `extractionFlagsFor`.
  - Inputs: `inputsFor(tenant, tenderId, done)` `s3/inputs.ts:55`; `inputFields`, `validateInput`, `inputRequestWrite(tenderId, key, toId, due, byId…)` `:167`, `inputSubmitWrite(tenderId, key, fields, byId…)` `:180`, `nudgeWrite` `:193`, `myRequests` `:216`.
  - DG2: `positionsFor(tenant, tenderId, done)` `dg2/positions.ts:72`, `positionWrite(tenderId, seat, input, byId, recordedById?)` `:138` writes `dg2-pos:{TID}:{seat}` (margin conditions go in `marginConditions`); `decisionState(tenant, tenderId, done)` `dg2/decision.ts:89`, then `dg2Write(input, byId, state)` `:165` writes `dg2:{TID}` (and the `dg2-letter` key for a No-Bid); `dg2RecordFor(tenant, tenderId, done, { canSeeMargin, canSeePositions })` `dg2/record.ts:75` (**pass both**: without `canSeePositions` it returns positions); `conditionsFor`, `conditionCloseWrite` (`dg2/conditions.ts`); `declineLetter`, `letterWrite` (`dg2/letter.ts`); `reopenState`, `reopenRequestWrite`, `reopenApproveWrite` (`dg2/reopen.ts`).
  - **Audit masking** (orchestrator contract): an audit event whose `detail` states a position, a margin figure or a quote sets `sensitive: 'positions' | 'margin' | 'quotes'` (`AuditEvent` in `state/store.tsx`); the workspace timeline masks it. Set it on every position, condition and margin audit entry you write.
  - Workspace tab contract and kit: as plan 007b lists (`ctx.check(cap)` for the refusal sentence; `RecommendationCard`, `OverrideModal`, `ReasonCodePicker`, `Callout` (`stale` variant for a stale pack), `SourceChip`, `ThresholdBar`, `RequestButton`, `AuditEntry`, `Masked`, `SlaClock`). Reserved tabs: `inputs` (80), `bid-decision` (90).
  - Screens map: `pages/gcc/screens.ts`, entries `/packs`, `/dg2`.

## Scope
**Files to create:**
- `src/pages/gcc/s3/`: `Packs.tsx` (the list, with freshness and inputs outstanding), `Pack.tsx` (one pack: a sticky summary and sections 9.1–9.10), `sections/*.tsx` (one per section), `InputForm.tsx` (the contributor forms, catalogue §C.6: Commercial margin range, Planning programme and delivery impact, Compliance top risks and redline stance, PD delivery feasibility, Finance facility headroom and working capital, HR key-personnel availability), `s3.css`.
- `src/pages/gcc/dg2/`: `Dg2.tsx` (the queue with SLA clocks, and one tender's gate: the pack summary on the left, the members panel on the right, the decision bar), `PositionForm.tsx`, `DecisionBar.tsx`, `DeclineLetter.tsx`, `Conditions.tsx`.
- `src/components/tender/MembersPanel.tsx`: avatar, name, seat, position chip, comment and time; "Record my position" for the signed-in member only; "recorded by secretary" when the Head of Tendering records for a member; conflicts declared. Shown on `/dev/kit` (add one section to `KitPreview.tsx`).
- `src/pages/gcc/workspace/tabs/inputs.tab.tsx` (80) and `bid-decision.tab.tsx` (90).
- `src/pages/gcc/dev-checks/95-stage3-screens.tsx`.

**Files to change (only these lines):**
- `src/pages/gcc/screens.ts`: your two entries (007b, 008b and 011 edit theirs at the same time: re-read right before editing).
- `src/domain/gcc/actions/requests.actions.ts` (013's): a pack-input request opens `/tenders/{TID}?tab=inputs&input={key}` instead of the tender's overview. One function.
- `src/pages/gcc/dev/KitPreview.tsx`: one section for `MembersPanel`.

**Out of scope** (stop and ask): Stage 1 and 2 screens; DG3 (plan 018); Stage 4–9 working screens; new rules, capabilities or libraries; the Indian preview.

## Steps

### Phase 1 — The pack (spec §9)
- [x] 1.1 `/packs` and the **Bid / No-Bid** tab (90): one scrollable page, a sticky summary (verdict, win probability with its band, value, the DG2 clock once issued, freshness), and sections 9.1–9.10, each with its source and freshness:
  - [x] 1.1.1 9.1 win probability with the driver table, the calibration note, the low-data warning, "what would move it";
  - [x] 1.1.2 9.2 competitors, **every claim cited** (no source, no claim);
  - [x] 1.1.3 9.3 eligibility and JV; 9.4 resource and capacity with the portfolio roll-up against the safe-delivery threshold (`ThresholdBar`); 9.5 financial exposure with the facility (Finance's timestamp); 9.6 top five risks with sources; 9.7 the margin range (**masked** without `see.margin`); 9.8 the recommendation (`RecommendationCard`; the Bid Manager edits the presenter's note, the numbers are locked); 9.9 inputs status with Nudge; 9.10 freshness.
- [x] 1.2 **Stale and re-run:** "Pack generated 07 Mar 14:10. Stale: Addendum 2 received 08 Mar 09:12 changes 2 packages." (`Callout` stale) → **Re-run** keeps the previous version for comparison (`compareVersions`).
- [x] 1.3 **Issue pack to committee:** blocked while `issueBlockers` lists missing inputs (the reason shown); on issue, the DG2 clock starts and members are notified (audit entry, toast). The pack opens at `lensFor(seat)` for a member.

### Phase 2 — Inputs (spec §8.9, catalogue §C.6)
- [x] 2.1 The **Inputs** tab (80): each input with owner, due, status (requested, late, submitted, accepted), Request (`inputRequestWrite`, which the owner sees in My requests) and Nudge.
- [x] 2.2 `InputForm`: the form for the viewer's own input, opened from My requests (`?tab=inputs&input={key}`), validated with `validateInput`, submitted with `inputSubmitWrite`; a submitted input updates the pack's sections at once. Only the owner submits (`ctx.check('input.respond', { ownerId })`); others read.

### Phase 3 — DG2 (spec §10, dashboards.md §9)
- [x] 3.1 `/dg2` and `/dg2?tender=T`: the queue with the 24-hour SLA and quorum state; one tender's gate with the pack summary, the **members panel** and the decision bar.
- [x] 3.2 **Record my position** (members only, the signed-in person's own seat): Support · Support with conditions · Oppose · Abstain; a comment is required unless Support; conditions as free text, each a tracked item, with margin conditions marked (`marginConditions`); declare a conflict of interest and abstain. The Head of Tendering may record for a member in a live meeting ("recorded by secretary"). Audit entries set `sensitive: 'positions'` (or `'margin'` for a margin condition).
- [x] 3.3 **The decision bar** (the Head of Tendering only): disabled until quorum, with the reason; Bid (with conditions) or No-Bid (reason codes as DG1 plus price competitiveness, win probability too low, capacity conflict); a reason is required when the decision goes against the majority, and the record shows "Approval differs from majority". Confirm shows the effects first.
- [x] 3.4 **Outcomes:** Bid → conditions copied to tracked items (`Conditions.tsx`; close one with `conditionCloseWrite`), the tender moves to Stage 4 on every screen, Planning and Commercial notified, and the completion card "Decision recorded. Planning and Commercial have been asked to start baselines." No-Bid → the **decline letter** drafted (`declineLetter`), the Bid Manager reviews and sends (`letterWrite`), lessons captured.
- [x] 3.5 **Re-open:** a request with a reason and trigger, approved by the Head of Tendering (`reopenRequestWrite`, `reopenApproveWrite`); positions are kept and marked "before re-open".
- [x] 3.6 **Masking:** read `dg2RecordFor` with `{ canSeeMargin, canSeePositions }`. Without `see.positions`: no positions, counts, majority or "against the majority" anywhere, only "With the committee" and the outcome. Without `see.margin`: margin conditions and comments read masked.

### Phase 4 — Dev check and polish
- [x] 4.1 `95-stage3-screens.tsx`, about 10 rows: T-2026-097's pack reads stale and re-runs to a new version; issue is blocked while inputs are missing; a member records a position with a condition; the decision bar is disabled below quorum; Bid against the majority needs a reason; Bid moves the tender to Stage 4; No-Bid drafts the letter; a Procurement Lead sees no positions and no margin; a pack input from My requests opens the form.
- [x] 4.2 1440 and 1280, light and dark, keyboard, no console errors.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] Script C in Najd on T-2026-097: Omar opens the stale pack → Re-run → Issue → switch to Khalid (CFO): Support with conditions ("Keep the bid bond within the facility"; a margin condition) → the Technical Director has already supported → the CEO supports → quorum 3 of 5 → Faisal approves Bid with conditions → conditions tracked, tender at Stage 4 on the dashboards and the tracker, audit complete.
- [x] Switch to Joseph (Procurement Lead): positions and margin masked everywhere; Tarek (Commercial Manager): margin visible, positions masked.
- [x] A contributor (e.g. Finance) opens their pack input from My requests, submits it, and the pack's section updates.
- [x] View as is read only. Reset demo returns every screen to the seed.

## Execution report
(Filled in by the executor, 2026-09-26.)
- Changed files:
  - New, the pack: `pages/gcc/s3/Packs.tsx` (the `/packs` list and one pack), `Pack.tsx` (`PackView` in page, tab and gate modes: sticky summary, section nav, stale / behind / issue callouts, Re-run, Issue, Open DG2), `sections/Section.tsx`, `Win.tsx` (9.1), `Competitors.tsx` (9.2, 9.3), `Capacity.tsx` (9.4), `Financial.tsx` (9.5), `Risks.tsx` (9.6, 9.7), `Recommendation.tsx` (9.8, the presenter's note), `Inputs.tsx` (9.9, 9.10), `InputForm.tsx`, `Confirm.tsx` (the confirm modal with effects), `sight.ts` (a tender's access and sight for the gate page), `s3.css`.
  - New, DG2: `pages/gcc/dg2/Dg2.tsx` (the queue and one gate), `members.ts` (the members panel view model), `PositionForm.tsx`, `DecisionBar.tsx`, `Conditions.tsx`, `DeclineLetter.tsx`, `Reopen.tsx`, `dg2.css`.
  - New, shared: `components/tender/MembersPanel.tsx` and `members-panel.css`.
  - New, workspace tabs: `pages/gcc/workspace/tabs/inputs.tab.tsx` (80) and `bid-decision.tab.tsx` (90).
  - New, dev check: `pages/gcc/dev-checks/95-stage3-screens.tsx` (12 rows).
  - Shared edits, lines added only: `pages/gcc/screens.ts` (`/packs` and `/dg2` built, with their pages); `domain/gcc/actions/requests.actions.ts` (`primaryOf`: a pack input routes to `/tenders/{TID}?tab=inputs&input={key}`); `pages/gcc/dev/KitPreview.tsx` (a Members panel card: the CFO's view and the masked view on T-2026-097).
- Verification:
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass (the chunk-size warning was already there).
  - `/dev/checks` in all five GCC tenants: 0 failures, the 009b panel 12 of 12, no console errors.
  - Script C in Najd on T-2026-097, in the browser: Omar opens the stale pack → Re-run (v2, v1 kept for comparison) → Issue (effects shown; the clock stays from the first issue) → Khalid records Support with conditions, with a margin condition → the Technical Director's seeded Support → the CEO supports → 3 of 5, quorum met → Faisal approves Bid with conditions → the conditions are tracked on the Bid / No-Bid tab, the tender reads "4 · Planning" on the workspace header, the dashboard and the tracker, and the audit trail is complete (position and decision entries marked `positions`).
  - Masking: as Joseph (Procurement Lead) the pack, Bid / No-Bid tab and audit show no positions, counts, majority or margin, and `/dg2` is refused. As Tarek (Commercial Manager), margin shows and win and positions are masked, including "From the CFO" on conditions.
  - Finance: My requests → Open form → `/tenders/T-2026-101?tab=inputs&input=finance` → submit → 9.5 on T-2026-101 is current at once, and Issue then waits on one input.
  - No-Bid against the majority needs a reason and is flagged, the letter is drafted and marked sent, lessons are recorded, and re-open is requested and approved (positions kept, flagged "Before the re-open").
  - 1440 and 1280, light and dark: no horizontal overflow, no console errors. Keyboard: the position form and approval modal open with focus inside, Esc closes them and focus returns to the trigger.
  - View as (Faisal as Khalid) is read only: the actions are disabled and the note reads "Read only". Settings → Reset demo returns T-2026-097 to v1 stale at 2 of 5, with no done keys and no audit entries left.
- Deviations from plan:
  - Extra files, all in this plan's folders: `s3/sight.ts`, `s3/Confirm.tsx`, `dg2/members.ts`, `dg2/Reopen.tsx`, `dg2/dg2.css`, and `components/tender/members-panel.css`.
  - The breakdown tables inside the pack (9.1 drivers, 9.4 load, 9.10 compare) are plain `<table>`s. The two lists (`/packs`, the DG2 queue) use `DataTable`.
  - Competitor evidence uses `SourceChip` kind `project` with the evidence id as its label, because there is no `evidence` kind.
  - Closing a condition and sending the decline letter are checked on `pack.issue` (the Bid Manager), with `dg2.decide` as the fallback for closing. There is no dedicated capability.
  - A position's audit entry is always `positions`, even when it holds a margin condition. Every `see.positions` holder also has `see.margin`, so `positions` is the stricter mask. Closing a condition that states a margin figure is marked `margin`.
  - "Issue anyway, with a reason" is offered while inputs are outstanding, following 009a's issue rule.
  - The input form offers "Start from your answer on {other tender}" where the owner has answered the same input elsewhere.
  - The Head of Tendering's "Record as secretary" shows only on seats with no position yet.
  - The inputs table takes its status from 013's `requestsFor`.
  - In the `/packs` list the stale pill reads "Stale", with "since …" beside it, so it fits the column at 1280.
- Blockers / questions:
  - None blocking.
  - For the orchestrator: should closing a DG2 condition and sending the decline letter get their own capability, rather than riding on `pack.issue`?
  - For the orchestrator: should the secretary be able to overwrite a position a member has already recorded? It can't today.
- Follow-ups noticed (not done):
  - My requests: only the row's action button routes a pack input to the form. A click on the row still opens the request drawer.
  - `SourceChip` could have an `evidence` kind for competitor evidence.
  - 009a's 9.4 portfolio text ends "against a safe level of 70% (101%)" (`domain/gcc/s3/pack.ts`). It would read better as "(101% of the safe level)".
  - The long source chips in the 9.1 driver table are cut off at the column edge at 1280.
  - The position segments move with Tab, not the arrow keys. A roving tabindex would match the ARIA radio pattern.
  - The workspace rail header (019) shows a green rule through its heading. Noticed only; I didn't touch it.
