# 018 — DG3 approval (the Head of Tendering's final gate)

Status: READY · Depends on: 006, 013, 015, 017, 009b (all in `gcc-demo`) · Can run in parallel with: 010, 012, 014

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
- [ ] 1.1 `data/gcc/dg3/types.ts`: `Dg3Evidence { tenant; tenderId; finalPrice: Money; marginPct: number; dg2Conditions: { text: string; kind: 'min-margin' | 'other'; minPct?: number }[]; bond: { amount: Money; validTo: string; requiredTo: string; basis: string; page?: number }; deviations: { clause: string; text: string; position: 'accepted' | 'qualified' | 'rejected' }[]; risks: { text: string; ownerId: string | null; rating: 'high' | 'medium' | 'low' }[]; signatories: { label: string; personId: string; ready: boolean; note?: string }[]; portal: string }`.
- [ ] 1.2 `data/gcc/dg3/evidence.ts`: one record per DG3 tender listed in Context, synthetic and consistent with the tender's lifecycle row (currency, value, submission deadline):
  - [ ] 1.2.1 **Najd T-2025-305 is clean** (dashboards.md §12.4 says "evidence complete"): final price about 1% under the SAR 150 M estimate, margin 10.2% against a DG2 condition "Minimum margin 9%"; initial guarantee 2% valid to a week after the date it must hold (90 days from opening), Etimad; two deviations (one qualified, one accepted); three risks, all owned; two signatories ready (the CEO under the power of attorney, the Bid Manager for the forms).
  - [ ] 1.2.2 **Qurain's DG3 tender carries the catch:** the bank guarantee is valid to 3 days **before** `requiredTo`. Everything else is clean.
  - [ ] 1.2.3 Corniche, Dafna and Batinah are clean, each with its own portal (the tenant's `sources` names the portals) and currency.
  - (acceptance: every `ownerId` and `personId` resolves in the same tenant; `requiredTo` follows the tender's stated rule; the `risksWithoutOwner` and `mandatoryGaps` of each S7 row agree with the evidence, which is 0 for all five.)
- [ ] 1.3 `domain/gcc/dg3/evidence.ts`: `evaluateDg3` returns check lines, each `{ key, label, state: 'pass' | 'fail' | 'info', text, blocking }`:
  - requirements evidenced and mandatory gaps, from `S7Facts` ("146 of 146 evidenced · 0 mandatory gaps"), blocking if gaps > 0;
  - each DG2 condition: `min-margin` compares `marginPct` ("Minimum margin 9%: met, 10.2%"), blocking if below;
  - the final price, as information;
  - the initial guarantee: amount against the requirement, and `validTo` against `requiredTo` ("Valid to 20 Jun, required to 13 Jun: met" / "Valid to 7 Jun, required to 10 Jun: 3 days short"), blocking if short;
  - deviations: counts by position, blocking only if one is `rejected`;
  - top risks: owned count, blocking if any has no owner;
  - signatories: "2 of 2 ready", blocking if any is not ready;
  - portal and deadline: "Etimad · Sun 15 Mar, 10:00 (in 7 days)", via `domain/calendar.ts`, never typed.
  - `ready` = no blocking line fails. Money through `domain/money.ts`.
- [ ] 1.4 **Masking:** the final price, the margin and the margin condition are masked without `see.margin` (use `Masked` and 009b's `MASKED_MARGIN_CONDITION` wording). A masked line still shows pass or fail: "Minimum margin condition: met (figures masked for your role)".

### Phase 2 — Decision rules and the applier
- [ ] 2.1 Done keys (`domain/gcc/dg3/keys.ts`), one round at a time, never deleted (DG2's round rule):
  - `dg3:{TID}` → `{ decision: 'approved' | 'rejected', at, byId, reasonCodes, note?, round, evidenceSnapshot: { key, state, text }[] }`;
  - `dg3-back:{TID}:{round}` → `{ note, at, byId }` (sent back to Compliance), plus a `request:{TID}:{comp id}:dg3-back` through `requestWrite`, so it appears in the Compliance Lead's My requests;
  - `dg3-reissue:{TID}:{round}` → `{ at, byId, fixed?: 'bond-validity' }` (Compliance re-issues the pack; the clock restarts; round + 1);
  - `dg3-reopen:{TID}` → `{ reason, at, byId, round }` (Head of Tendering only; the earlier decision stays on record, marked re-opened).
- [ ] 2.2 `dg3Write` refuses:
  - without `dg3.decide` (the reason from `access.ts`);
  - Approve while a blocking line fails ("Approval needs every blocking check to pass: send it back to Compliance");
  - Reject without a reason code;
  - a second decision in the same round.

  Reject reasons (`DG3_REJECT_REASONS`): margin below the DG2 minimum · mandatory requirement not evidenced · guarantee not valid · unacceptable deviation · signatory not ready · other (a note is required).
- [ ] 2.3 Re-issue fixes the catch in the demo: after `dg3-reissue` with `fixed: 'bond-validity'`, the evidence reads `validTo` as a week after `requiredTo` (the bank extended it), and the line passes. Label the control "Demo: the bank extended the guarantee" on the Compliance side.
- [ ] 2.4 `50-dg3.apply.ts`:
  - approved: a `GateRecord` `{ gate: 'DG3', decision: 'approved', openedAt: dg3IssuedAt (or the last re-issue), slaHours: 48, onTime, reasonCodes: [] }` and a Stage 8 `assembling` step owned by the Bid Manager; drop the S7 facts, as `40-dg2.apply.ts` drops S3's;
  - rejected: the gate record and `closedAt`, `closedAs: 'rejected'`, `closedNote: 'Rejected at DG3: {reason}'` (the wording of `generate.ts:277`);
  - a re-open: the earlier decision stays as a gate record marked `reopened`, and the tender is back at `dg3-issued`;
  - send-back and re-issue move no stage, but a re-issue moves the gate's `openedAt`, so the 48 h clock restarts.
  - Only tenders at DG3 in the seed. Pure and idempotent (see `demo/types.ts`).
- [ ] 2.5 `dg3RecordFor`: the decision in force, earlier rounds, send-backs and re-issues in order, each with who and when, for the record panel and the audit.

### Phase 3 — Screens
- [ ] 3.1 `/dg3` queue: every tender at DG3 in scope, with the 48 h `SlaClock`, the readiness ("Ready", "1 check fails", "Sent back to Compliance", "Decided: approved"), the Bid Manager, and the submission deadline. The empty state: "No bid is waiting for DG3."
- [ ] 3.2 `/dg3?tender=T` gate (ui-direction §5 archetype D):
  - left: the evidence lines (1.3), failing lines first, each with a plain sentence and, where relevant, the owner;
  - right: the status, the clock, the decision (Approve submission · Reject with `ReasonCodePicker` · a note), the record preview ("Approved by Faisal Al-Harbi, Sun 8 Mar 10:0X. Evidence: 7 checks passed"), and **Send back to Compliance** with a required note.
- [ ] 3.3 Approve is disabled while a blocking line fails, and the disabled button says why. After a decision the panel shows the record, with no Undo; **Re-open** (Head of Tendering, a reason required) sits under the record.
- [ ] 3.4 **The Compliance side:** as `{tenant}.comp`, the gate shows the evidence read-only, and after a send-back "Re-issue the DG3 pack" (with the demo control from 2.3 for the guarantee). The request appears in their My requests; its action opens `/dg3?tender=T`.
- [ ] 3.5 Other roles with `dg3.view` read the gate with no decision controls, and a line saying who decides.
- [ ] 3.6 Every write goes through `mark()` with an audit entry ("DG3 approved", "DG3 rejected: guarantee not valid", "DG3 sent back to Compliance", "DG3 pack re-issued", "DG3 re-opened"), stamped by the demo clock (`nextAuditAt`, as 009b does).

### Phase 4 — Dev check and polish
- [ ] 4.1 `97-dg3.tsx`, about 12 rows:
  - Najd's T-2025-305 is ready, with 7 lines passing;
  - Qurain's tender fails the guarantee line only, and Approve is refused;
  - `evaluateDg3` fails a hand-built case with margin below the minimum;
  - `dg3Write` refuses without `dg3.decide`, and a Reject without a reason;
  - an approve moves the lifecycle to Stage 8 `assembling`; a reject closes it as `rejected`;
  - a send-back writes the request to `{tenant}.comp`;
  - a re-issue with the fix makes Qurain ready and restarts the clock;
  - the price and margin are masked for a role without `see.margin`.
- [ ] 4.2 1440 and 1280, light and dark, no console errors; the keyboard reaches every control.

## Data and derivation
- Facts: `src/data/gcc/dg3/evidence.ts` only. Derivations: `src/domain/gcc/dg3/*`.
- Done keys: `dg3:`, `dg3-back:`, `dg3-reissue:`, `dg3-reopen:` and one `request:…:dg3-back` per send-back. All live in the tenant's `done`, so **Reset demo** clears them. Check that it does.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] As Faisal (Najd Head of Tendering): the first action row opens `/dg3?tender=T-2025-305`; every line passes; **Approve submission** records the decision; the row leaves "Needs your action"; CMP-5 goes from 1 to 0; the tender tracker shows Stage 8 · Assembling; the record shows who, when and the evidence seen. Re-open with a reason brings it back.
- [ ] As Qurain's Head of Tendering: the gate shows "Valid to …, required to …: 3 days short"; Approve is disabled and says why; **Send back to Compliance** with a note; as Qurain's Compliance Lead the request is in My requests; re-issue with the demo control; back as the Head of Tendering, all lines pass, the clock restarted, Approve works.
- [ ] As Najd's Compliance Lead or Bid Manager: the gate is read-only; the margin is masked where the role lacks `see.margin`.
- [ ] The dashboard row, CMP-5 and the gate never disagree about readiness.
- [ ] Reset demo returns every tenant to one tender waiting at DG3.
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
