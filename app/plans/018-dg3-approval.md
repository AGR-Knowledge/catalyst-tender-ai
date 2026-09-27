# 018 — DG3 approval (the Head of Tendering's final gate)

Status: DONE (2026-09-27, reviewed) · Depends on: 006, 013, 015, 017, 009b (all in `gcc-demo`) · Can run in parallel with: 010, 012, 014

## Goal
The Head of Tendering's first action row on Najd's dashboard is "DG3 approval · T-2025-305 Yanbu STP expansion · ready (evidence complete) · 30 h left of 48 h" (dashboards.md §12.4). Today "Open DG3" falls back to the tender page. After this plan it opens a **simple gate screen**: the evidence on the left (requirements evidenced, the final price and margin against the DG2 conditions, the initial guarantee against the requirement, deviations, top risks with owners, signatories, portal and deadline) and the decision on the right (**Approve submission · Reject**, with **Send back to Compliance** as an action). One click records who, when, what was seen and why, and moves the tender to Stage 8. In one tenant (Qurain) the final check catches a bank guarantee that expires before the tender requires. That is the pain a prospect recognises: the last check before submission catches what a busy team missed.

## Demo-grade rules (read first)
This is a **sales demo**, not the product: build what a prospect sees, and keep the checks small.
- **One screen, one flow.** The queue at `/dg3`, the gate at `/dg3?tender=T`, and the send-back loop. No Stage 7 working screens (matrix, redlines): the evidence is seeded facts.
- **The evidence is data.** Synthetic facts per DG3 tender live in `src/data/gcc/dg3/`; every check line is derived in `src/domain/gcc/dg3/`. Pages type no number.
- **Follow the DG2 pattern.** 009a's `domain/gcc/dg2` (keys, `dg2Write`, `dg2RecordFor`, re-open) and 009b's `pages/gcc/dg2` (queue, gate, `DecisionBar`, `Reopen`) are the models. Reuse `components/tender/*` (`StatusPill`, `SlaClock`, `ReasonCodePicker`, `Callout`, `Masked`, `AuditEntry`, `When`, `Money`) and don't fork them.
- **Keep the dev check small:** about 12 rows.

## Context
- **Why:** dashboards.md §9 (gate authority: DG3 is decided by the Head of Tendering; the Compliance / Legal Lead issues the DG3 pack; "Send back to Compliance" with a note is an action, not a decision; SLA 48 h from pack issue; the DG3 screen's evidence and decision lists), §10.10 (Stage 7 dashboard: CMP-5 DG3 waiting), §12.4 (Najd's first action row). Rule 8 in CLAUDE.md: people decide, and every decision records who, when and why.
- **Today:**
  - Capabilities exist in `src/data/access.ts`: `dg3.view`, `dg3.issue`, `dg3.decide` (:175, :217–260; `hot` decides, `comp` issues, `bid` and others view), with the reasons "Only the Head of Tendering approves DG3" and "Only Compliance issues the DG3 pack" (:361–362). The sidebar item `DG3 approvals` → `/dg3` (:457).
  - `src/pages/gcc/screens.ts:37`: `'/dg3'` is listed with `built: false`, so the page shows the "coming next" screen, and `route('/dg3', …)` in `domain/gcc/actions/portfolio.actions.ts:199` falls back to the tender page.
  - One tender per tenant waits at DG3 in the seed (`now: { stage: 7, step: 'dg3-issued' }`, `facts.stage === 7` with `dg3IssuedAt`):
    - Najd `T-2025-305` Yanbu STP expansion (`data/gcc/lifecycle/live/najd.ts:268`, SAR 150 M, pack issued Sat 7 Mar 16:00, submission Sun 15 Mar 10:00);
    - Corniche (`live/corniche.ts:95`), Dafna (`live/dafna.ts:71`), Batinah (`live/batinah.ts:77`), Qurain (`live/qurain.ts:107`).
  - `S7Facts` (`data/gcc/lifecycle/types.ts:169`): `requirements { evidenced, total }`, `mandatoryGaps`, `redlinesOpen`, `risksWithoutOwner`, `dg3IssuedAt`.
  - The action row `dg3.approve` (`portfolio.actions.ts:253–272`) and `dg3Open` (:115) read the open gate from the lifecycle; its text says "evidence complete" from `mandatoryGaps` only. CMP-5 (`kpi/stage7.kpi.ts:22`, :103) counts the same.
  - Gate SLA: `GATE_SLA_HOURS.DG3 = 48` (`data/gcc/targets.ts:11`). Generated history already writes DG3 records (`data/gcc/lifecycle/generate.ts:273`: `decision: 'approved' | 'rejected'`, reason `margin-below-minimum`, closed as `rejected`).
  - Demo appliers fold demo decisions into lifecycles: `domain/gcc/demo/10-dg1.apply.ts` … `40-dg2.apply.ts` (read `40-dg2.apply.ts` first; it is the model). Files run in name order; `90-invited.apply.ts` must stay last.
  - Requests between people: `domain/gcc/requestKeys.ts` (`requestWrite(tenderId, toId, topic, value)`); My requests (`domain/gcc/requests.ts`) lists them for the recipient with no change.
  - People: the Compliance / Legal Lead is `{tenant}.comp` (Najd: Lina Barakat); the Head of Tendering `{tenant}.hot` (Najd: Faisal Al-Harbi).

## Scope
**Files to create:**
- `src/data/gcc/dg3/evidence.ts` (+ `types.ts`, `index.ts`): one `Dg3Evidence` per DG3 tender per tenant (below).
- `src/domain/gcc/dg3/`: `keys.ts` (done-key values), `evidence.ts` (`dg3EvidenceFor`, and a pure `evaluateDg3(evidence, facts, tender)` the dev check can call with a hand-built case), `decision.ts` (`dg3State`, `dg3Write`, `dg3SendBackWrite`, `dg3ReissueWrite`, `dg3ReopenWrite`, `DG3_REJECT_REASONS`), `record.ts` (`dg3RecordFor`: who, when, what was seen, why, rounds), `index.ts`.
- `src/domain/gcc/demo/50-dg3.apply.ts`: the DG3 applier.
- `src/pages/gcc/dg3/`: `Dg3.tsx` (queue and gate), `Evidence.tsx`, `DecisionPanel.tsx`, `SendBack.tsx`, `Reopen.tsx`, `dg3.css`.
- `src/pages/gcc/dev-checks/97-dg3.tsx`.

**Files to change (only these lines):**
- `src/pages/gcc/screens.ts`: the `'/dg3'` entry only: `built: true` and `page: () => import('./dg3/Dg3')`. Re-read the file right before editing (plan 010 edits its own entries at the same time).
- `src/domain/gcc/actions/portfolio.actions.ts`: in `dg3Approve.rows` only, the `what` text reads the readiness from `dg3EvidenceFor` (so the dashboard and the gate never disagree: "Ready for your approval: evidence complete" or "1 check fails: initial guarantee validity"), and a sent-back tender reads "Sent back to Compliance · {first name}". Touch nothing else in the file.
- `src/domain/gcc/kpi/stage7.kpi.ts`: only if CMP-5's sub-line must say "sent back" for a sent-back tender. Say so in the report.

**Out of scope** (stop and ask): Stage 7 working screens (compliance matrix, redlines, the DG3 pack builder); Stage 8 screens; a workspace tab for DG3 (the rail's gate chip already shows the gate); any change to DG1 or DG2 code; new capabilities or roles in `access.ts`; the dashboard kit (`components/dashboard/**`, owned by the orchestrator); new libraries.

## Steps

### Phase 1 — Evidence data and rules
- [x] 1.1 `data/gcc/dg3/types.ts`: `Dg3Evidence { tenant; tenderId; finalPrice: Money; marginPct: number; dg2Conditions: { text: string; kind: 'min-margin' | 'other'; minPct?: number }[]; bond: { amount: Money; validTo: string; requiredTo: string; basis: string; page?: number }; deviations: { clause: string; text: string; position: 'accepted' | 'qualified' | 'rejected' }[]; risks: { text: string; ownerId: string | null; rating: 'high' | 'medium' | 'low' }[]; signatories: { label: string; personId: string; ready: boolean; note?: string }[]; portal: string }`.
- [x] 1.2 `data/gcc/dg3/evidence.ts`: one record per DG3 tender listed in Context, synthetic and consistent with the tender's lifecycle row (currency, value, submission deadline):
  - [x] 1.2.1 **Najd T-2025-305 is clean** (dashboards.md §12.4 says "evidence complete"): final price about 1% under the SAR 150 M estimate, margin 10.2% against a DG2 condition "Minimum margin 9%"; initial guarantee 2% valid to a week after the date it must hold (90 days from opening), Etimad; two deviations (one qualified, one accepted); three risks, all owned; two signatories ready (the CEO under the power of attorney, the Bid Manager for the forms).
  - [x] 1.2.2 **Qurain's DG3 tender carries the catch:** the bank guarantee is valid to 3 days **before** `requiredTo`. Everything else is clean.
  - [x] 1.2.3 Corniche, Dafna and Batinah are clean, each with its own portal (the tenant's `sources` names the portals) and currency.
  - (acceptance: every `ownerId` and `personId` resolves in the same tenant; `requiredTo` follows the tender's stated rule; the `risksWithoutOwner` and `mandatoryGaps` of each S7 row agree with the evidence, which is 0 for all five.)
- [x] 1.3 `domain/gcc/dg3/evidence.ts`: `evaluateDg3` returns check lines, each `{ key, label, state: 'pass' | 'fail' | 'info', text, blocking }`:
  - requirements evidenced and mandatory gaps, from `S7Facts` ("146 of 146 evidenced · 0 mandatory gaps"), blocking if gaps > 0;
  - each DG2 condition: `min-margin` compares `marginPct` ("Minimum margin 9%: met, 10.2%"), blocking if below;
  - the final price, as information;
  - the initial guarantee: amount against the requirement, and `validTo` against `requiredTo` ("Valid to 20 Jun, required to 13 Jun: met" / "Valid to 7 Jun, required to 10 Jun: 3 days short"), blocking if short;
  - deviations: counts by position, blocking only if one is `rejected`;
  - top risks: owned count, blocking if any has no owner;
  - signatories: "2 of 2 ready", blocking if any is not ready;
  - portal and deadline: "Etimad · Sun 15 Mar, 10:00 (in 7 days)", via `domain/calendar.ts`, never typed.
  - `ready` = no blocking line fails. Money through `domain/money.ts`.
- [x] 1.4 **Masking:** the final price, the margin and the margin condition are masked without `see.margin` (use `Masked` and 009b's `MASKED_MARGIN_CONDITION` wording). A masked line still shows pass or fail: "Minimum margin condition: met (figures masked for your role)".

### Phase 2 — Decision rules and the applier
- [x] 2.1 Done keys (`domain/gcc/dg3/keys.ts`), one round at a time, never deleted (DG2's round rule):
  - `dg3:{TID}` → `{ decision: 'approved' | 'rejected', at, byId, reasonCodes, note?, round, evidenceSnapshot: { key, state, text }[] }`;
  - `dg3-back:{TID}:{round}` → `{ note, at, byId }` (sent back to Compliance), plus a `request:{TID}:{comp id}:dg3-back` through `requestWrite`, so it appears in the Compliance Lead's My requests;
  - `dg3-reissue:{TID}:{round}` → `{ at, byId, fixed?: 'bond-validity' }` (Compliance re-issues the pack; the clock restarts; round + 1);
  - `dg3-reopen:{TID}` → `{ reason, at, byId, round }` (Head of Tendering only; the earlier decision stays on record, marked re-opened).
- [x] 2.2 `dg3Write` refuses:
  - without `dg3.decide` (the reason from `access.ts`);
  - Approve while a blocking line fails ("Approval needs every blocking check to pass: send it back to Compliance");
  - Reject without a reason code;
  - a second decision in the same round.

  Reject reasons (`DG3_REJECT_REASONS`): margin below the DG2 minimum · mandatory requirement not evidenced · guarantee not valid · unacceptable deviation · signatory not ready · other (a note is required).
- [x] 2.3 Re-issue fixes the catch in the demo: after `dg3-reissue` with `fixed: 'bond-validity'`, the evidence reads `validTo` as a week after `requiredTo` (the bank extended it), and the line passes. Label the control "Demo: the bank extended the guarantee" on the Compliance side.
- [x] 2.4 `50-dg3.apply.ts`:
  - approved: a `GateRecord` `{ gate: 'DG3', decision: 'approved', openedAt: dg3IssuedAt (or the last re-issue), slaHours: 48, onTime, reasonCodes: [] }` and a Stage 8 `assembling` step owned by the Bid Manager; drop the S7 facts, as `40-dg2.apply.ts` drops S3's;
  - rejected: the gate record and `closedAt`, `closedAs: 'rejected'`, `closedNote: 'Rejected at DG3: {reason}'` (the wording of `generate.ts:277`);
  - a re-open: the earlier decision stays as a gate record marked `reopened`, and the tender is back at `dg3-issued`;
  - send-back and re-issue move no stage, but a re-issue moves the gate's `openedAt`, so the 48 h clock restarts.
  - Only tenders at DG3 in the seed. Pure and idempotent (see `demo/types.ts`).
- [x] 2.5 `dg3RecordFor`: the decision in force, earlier rounds, send-backs and re-issues in order, each with who and when, for the record panel and the audit.

### Phase 3 — Screens
- [x] 3.1 `/dg3` queue: every tender at DG3 in scope, with the 48 h `SlaClock`, the readiness ("Ready", "1 check fails", "Sent back to Compliance", "Decided: approved"), the Bid Manager, and the submission deadline. The empty state: "No bid is waiting for DG3."
- [x] 3.2 `/dg3?tender=T` gate (ui-direction §5 archetype D):
  - left: the evidence lines (1.3), failing lines first, each with a plain sentence and, where relevant, the owner;
  - right: the status, the clock, the decision (Approve submission · Reject with `ReasonCodePicker` · a note), the record preview ("Approved by Faisal Al-Harbi, Sun 8 Mar 10:0X. Evidence: 7 checks passed"), and **Send back to Compliance** with a required note.
- [x] 3.3 Approve is disabled while a blocking line fails, and the disabled button says why. After a decision the panel shows the record, with no Undo; **Re-open** (Head of Tendering, a reason required) sits under the record.
- [x] 3.4 **The Compliance side:** as `{tenant}.comp`, the gate shows the evidence read-only, and after a send-back "Re-issue the DG3 pack" (with the demo control from 2.3 for the guarantee). The request appears in their My requests; its action opens `/dg3?tender=T`.
- [x] 3.5 Other roles with `dg3.view` read the gate with no decision controls, and a line saying who decides.
- [x] 3.6 Every write goes through `mark()` with an audit entry ("DG3 approved", "DG3 rejected: guarantee not valid", "DG3 sent back to Compliance", "DG3 pack re-issued", "DG3 re-opened"), stamped by the demo clock (`nextAuditAt`, as 009b does).

### Phase 4 — Dev check and polish
- [x] 4.1 `97-dg3.tsx`, about 12 rows:
  - Najd's T-2025-305 is ready, with 7 lines passing;
  - Qurain's tender fails the guarantee line only, and Approve is refused;
  - `evaluateDg3` fails a hand-built case with margin below the minimum;
  - `dg3Write` refuses without `dg3.decide`, and a Reject without a reason;
  - an approve moves the lifecycle to Stage 8 `assembling`; a reject closes it as `rejected`;
  - a send-back writes the request to `{tenant}.comp`;
  - a re-issue with the fix makes Qurain ready and restarts the clock;
  - the price and margin are masked for a role without `see.margin`.
- [x] 4.2 1440 and 1280, light and dark, no console errors; the keyboard reaches every control.

## Data and derivation
- Facts: `src/data/gcc/dg3/evidence.ts` only. Derivations: `src/domain/gcc/dg3/*`.
- Done keys: `dg3:`, `dg3-back:`, `dg3-reissue:`, `dg3-reopen:` and one `request:…:dg3-back` per send-back. All live in the tenant's `done`, so **Reset demo** clears them. Check that it does.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] As Faisal (Najd Head of Tendering): the first action row opens `/dg3?tender=T-2025-305`; every line passes; **Approve submission** records the decision; the row leaves "Needs your action"; CMP-5 goes from 1 to 0; the tender tracker shows Stage 8 · Assembling; the record shows who, when and the evidence seen. Re-open with a reason brings it back.
- [x] As Qurain's Head of Tendering: the gate shows "Valid to …, required to …: 3 days short"; Approve is disabled and says why; **Send back to Compliance** with a note; as Qurain's Compliance Lead the request is in My requests; re-issue with the demo control; back as the Head of Tendering, all lines pass, the clock restarted, Approve works.
- [x] As Najd's Compliance Lead or Bid Manager: the gate is read-only; the margin is masked where the role lacks `see.margin`.
- [x] The dashboard row, CMP-5 and the gate never disagree about readiness.
- [x] Reset demo returns every tenant to one tender waiting at DG3.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-27.)
- **Changed files:**
  - New: `src/data/gcc/dg3/{types,evidence,index}.ts`; `src/domain/gcc/dg3/{keys,evidence,decision,record,index}.ts`; `src/domain/gcc/demo/50-dg3.apply.ts`; `src/pages/gcc/dg3/{Dg3,Evidence,DecisionPanel,SendBack,Reopen}.tsx` and `dg3.css`; `src/pages/gcc/dev-checks/97-dg3.tsx`.
  - Changed: `src/pages/gcc/screens.ts` (the `/dg3` entry only: `built: true`, `page`); `src/domain/gcc/actions/portfolio.actions.ts` (one import line, and in `dg3Approve.rows` the `what` now reads `dg3Readiness(dg3State(…))`, with the old text as fallback for a tender without a DG3 pack).
  - Changed with the user's approval (Q1, Q2 below): `src/domain/gcc/actions/requests.actions.ts` (one import and one `primaryOf` branch: a `dg3-back` request → "Open DG3", `/dg3?tender=T`, placed after 010's renewal and 009b's pack-input branches); `src/domain/gcc/requests.ts` (one import pair and one branch beside `dg1-hold`: a `dg3-back` request closes once the pack is re-issued or DG3 is decided).
  - Not changed: `kpi/stage7.kpi.ts`. CMP-5 counts open DG3 gates and shows the time left; it states no readiness, so it can't disagree with the gate. A sent-back pack is still an open gate and still counts.
- **Verification** (own dev server on 5184, headless Chromium from the cached Playwright, a fresh browser profile per run):
  - `/dev/checks`: DG3 14 of 14 pass in all five tenants; every other panel passes; no console errors.
  - Faisal (Najd): first row "DG3 approval · T-2025-305 · Ready for your approval: evidence complete · 30 h left of 48 h · Open DG3" opens `/dg3?tender=T-2025-305`; 7 pass, 1 for information; Approve (confirm step with effects and record preview) records it. The row leaves, CMP-5 goes 1 → 0, the DG3 chip goes to outline, and the workspace header reads "8 · Submission · Assembling". The record reads "Approved for submission, by Faisal Al-Harbi · Sun 8 Mar 10:00 · round 1. Evidence: 7 checks passed, 1 for information", with the evidence as seen and the history. Re-open with a reason: back at DG3, round 2, "48 h left of 48 h", CMP-5 back to 1.
  - Qurain: row "1 check fails: initial guarantee validity"; gate "Valid to Sun 7 Jun, required to Wed 10 Jun: 3 days short"; Approve disabled, saying why. Send back (note prefilled from the failing line, with no figures) → row "Sent back to Compliance · Nour". As Nour: the request is in My requests; the gate is read-only with price, margin and guarantee amount masked; re-issue with "Demo: the bank extended the guarantee" (checked by default when validity fails). As Bader: "All 7 checks pass", "48 h left of 48 h · from round 2", Approve works.
  - Najd read-only: Lina (Compliance) sees no decision controls and three masked chips; Omar (assigned Bid Manager) sees the figures; Aisha (Tender Coordinator, no `dg3.view`) gets "DG3 approvals is for the Head of Tendering, the Bid Manager and the Compliance / Legal Lead". Reject: "Pick at least one reason to reject", then "Write a note: the reason is Other"; it closes the tender as rejected; the queue shows "No bid is waiting for DG3."; the audit log has the entry.
  - Settings → Reset this company (on 5184 only): `done` is `{}`, one bid waits at DG3, CMP-5 is 1. Dev check 14 confirms every DG3 key is in the tenant's own `done`.
  - Corniche, Dafna, Batinah: the row, queue and gate all read Ready, with their own portal, time zone and deadline.
  - 1280 and 1440, light and dark: no horizontal overflow, no console errors. The keyboard reaches both crumbs, Approve, Reject and Send back; the modal takes focus and Escape closes it.
  - `npm run typecheck` and `npm run build` pass, once plan 010's `company/` files landed (before that, its in-progress files were the only errors).
  - After Q1 and Q2: as Nour, the My requests row reads "Re-issue the DG3 pack: The initial guarantee is valid to Sun 7 Jun; the tender needs it to Wed 10 Jun (3 days short). Ask the bank to extend it · asked by Bader Al-Mutawa · Open DG3", and clicking it lands on `/dg3?tender=T-2025-428`. After the re-issue the row is gone. Dev checks 10 and 11 cover both.
- **Deviations from plan:**
  1. Types: `Dg3Bond` adds `requiredPct`, `validityDays` and an optional `note`, so the amount and `requiredTo` are derived and checked rather than typed. `portal` is the tenant source id (the name is read from `sources`). `Dg3Line` adds `short` (for the dashboard row), `mask` (the part a viewer without margin sees, and the chip's words), `ask` (the send-back sentence) and `items`. The snapshot lines carry `label` and `maskedText`.
  2. **The guarantee amount is masked too** without `see.margin`: it is a stated share of the price, so it would give the price away. The validity always shows, which is the catch Compliance must see.
  3. The send-back note starts from each failing line's `ask`, which carries no figures, because the note goes to Compliance, who lack `see.margin`. The first draft copied the amount; I caught it in the browser and fixed it.
  4. Reject is allowed while the pack is back with Compliance; Approve waits for the re-issue ("The pack is back with Compliance: approve once it is re-issued").
  5. A re-open also starts a new round with a fresh 48 h clock (from the re-open), as a re-issue does.
  6. Stored times use the demo clock (`nowIso()`, 10:00), as 009b's values do; audit entries get the store's `nextAuditAt` minute. The record therefore says 10:00 while its audit entry may say 10:03. It is the same as DG2.
  7. Approve and Reject open a confirm step (effects, optional note or reason codes, record preview), as DG2 does; the panel also shows the preview inline before any click.
  8. Seed choices: Corniche's bond is 5% for 120 days, matching Corniche's own Stage 8 bonds on the same portal. Qurain's catch is explained in the data: the bank issued the guarantee against the original closing date (Mon 9 Mar) before Addendum 1 moved it to Thu 12 Mar.
  9. The dev check has 14 rows (the plan says about 12). Decision audit entries with a note carry `sensitive: 'margin'`, since the note may state a figure.
- **Blockers / questions** (both answered by the user, 2026-09-27, and done):
  - **Q1.** The send-back request's action in My requests opened the tender, not `/dg3?tender=T`, because the route is chosen in `requests.actions.ts` (010's this wave). **Approved:** one `primaryOf` branch for `dg3-back` → "Open DG3".
  - **Q2.** After the re-issue the request stayed "open", because `requests.ts` had no closing rule for it (it has one for `dg1-hold`). **Approved:** one branch that drops it once `dg3State(…).sentBack` is null.
- **Follow-ups noticed (not done):**
  - While a pack is back with Compliance, the sidebar DG3 chip stays "waiting on me" for the Head of Tendering (`gateChipState`, outside my lines).
  - Approval drops the S7 facts (as the plan says), so an approved-in-demo tender has no S8 facts. Stage 8 tiles that read facts (bond, signatures) won't count it; the DG3 evidence (bond, opening) could seed them.
  - The top bar truncates "Final bid approval by the Head of Tendering." at 1280 (shared header).
