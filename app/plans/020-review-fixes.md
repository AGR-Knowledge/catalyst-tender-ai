# 020 — Review fixes for 006, 017, 007a, 008a and 009a

Status: DONE (2026-09-26, accepted after review; see the end) · Depends on: 006, 017, 007a, 008a, 009a · Can run in parallel with: nothing else; its five lanes ran in parallel with each other

| Lane | Owner (files) | Status |
| --- | --- | --- |
| A | Shell, kit and access (006's files) | DONE — awaiting review (2026-09-26) |
| B | Lifecycles, port and **all** of 004's tenant seed files | DONE — awaiting review (2026-09-26) |
| C | Stage 1 and DG1 rules (007a's folders) | DONE — awaiting review (2026-09-26) |
| D | Stage 2 rules (008a's folders) | DONE — awaiting review (2026-09-26) |
| E | Stage 3 and DG2 rules (009a's folders) | DONE — awaiting review (2026-09-26) |

Each executor sets **its own lane's** row above to `IN PROGRESS (executor, date)` and later `DONE — awaiting review (date)`, and leaves the README index row alone (the orchestrator updates it).

## Goal
The five plans reviewed on 2026-09-26 are correct before any screen is built on them. Masked people never see margin, win probability or price. The same tender never disagrees between two modules. Every action records who and why. Access lets stage owners see their stage's tenders.

## Context
- Five review sessions and one cross-plan audit ran on 2026-09-26. All five plans were **accepted with fixes**; this plan is the fix list. Every item below names the file and line the reviewer found; line numbers may have drifted by a few lines.
- Already done by the orchestrator (don't redo):
  - Win bands aligned with 009a's rule: `live/najd.ts:179` 47 ± 12, `live/corniche.ts:62` 44 ± 8, `live/qurain.ts:74` 52 ± 8. All dev-check panels pass in all five tenants.
  - Real contact names replaced with role titles in `data/extracted/gcc/wadi-zarqa.ts` and `cdr-jezzine.ts`; the named e-mail removed.
  - Five supplier names renamed everywhere: Tarvessa Trading FZE (was Borealis, id `tarvessa`), Aldervane Pumps (`aldervane`), Odrana Odour Control FZCO (`odrana`), Ellanby Instrumentation Ltd (`ellanby`), Ventalba Ventilation S.L. (`ventalba-vent`).
  - Commit `447d731` on `gcc-demo` holds everything up to here.
- The orchestrator also edits the docs and plan texts in parallel (gcc-demo-data §4.7 and §5, dashboards.md §12, ui-direction §7.3, plans 006/007a/008a/009a/013/015/017 text). **Lanes don't edit docs or other plans' text**; put doc mismatches you find under Follow-ups.

## Scope
- **Lane A** may change: `src/data/access.ts`, `src/App.tsx`, `src/pages/gcc/screens.ts`, `src/components/dashboard/**`, `src/domain/gcc/dashboards/**`, `src/pages/gcc/ComingNext.tsx`, `src/pages/gcc/DashboardRoute.tsx`, `src/pages/gcc/TenderSummary.tsx`, `src/components/layout/Sidebar.tsx` and the nav model, dashboard CSS, and `dev-checks/20-people.tsx`.
- **Lane B** may change: `src/data/gcc/lifecycle/**`, `src/domain/gcc/lifecycle.ts`, `src/domain/gcc/lifecycle.port.ts`, `src/data/gcc/build.ts`, `src/data/gcc/index.ts`, **every file in `src/data/gcc/tenants/`**, `dev-checks/30-seed.tsx`, `dev-checks/40-lifecycle.tsx`, and one new column-registry file for lifecycle fact headers.
- **Lane C** may change: `src/data/gcc/s1/**`, `src/domain/gcc/s1/**`, `src/domain/gcc/dg1/**`, `dev-checks/70-stage1.tsx`, and `src/domain/money.ts` for C8 only (backward-compatible option, plus one case in the formats dev check).
- **Lane D** may change: `src/data/gcc/s2/**`, `src/domain/gcc/s2/**`, `dev-checks/80-stage2.tsx`.
- **Lane E** may change: `src/data/gcc/s3/**`, `src/domain/gcc/s3/**`, `src/domain/gcc/dg2/**`, `dev-checks/90-stage3.tsx`.
- **Out of scope for every lane:** docs, other plans, `people.ts`, the store, Indian (`gen-in`) files, new libraries, new roles or capabilities. A lane that needs a change in another lane's file writes it under its Blockers, tells the user, and carries on with the rest.
- **Waits between lanes** (the only ones):
  - C10 waits for B10 (seed turnover dates). B writes "B10 landed" in its lane log below when done.
  - E11 waits for C9 (bond rows). C writes "C9 landed".
  - E13's dev-check row waits for B13 (WCWS lifecycles). B writes "B13 landed".
  - D3's comparison rows pass only once B15 lands; D may finish first and re-run after.
  - Plans 015 and 013 start only after lanes A and B are DONE.

## Steps

### Lane A — Shell, kit and access
- [x] A1 **View as hides action rows** (`domain/gcc/dashboards/build.ts:110`). `can(viewer, src.cap, { viewAs })` refuses every write capability during View as, so action sources with a write `cap` (e.g. `dg1.decide`) vanish and the panel reads "Nothing needs you right now."
  - [x] A1.1 Check `src.cap` for the viewed person without `viewAs`; let the existing read-only branch (~line 114) disable in-place rows. (acceptance: viewing as Omar shows his DG1 action rows, disabled for writing)
- [x] A2 **Columns menu forgets ticks** (`components/dashboard/grid/TenderGrid.tsx:349`).
  - [x] A2.1 Make `defaultColDef` and `rowSelection` module constants; memoise `getRowId`.
  - [x] A2.2 Column `hide` = `!columns.includes(id) && !shown.includes(id)` (~lines 198, 203); column widths survive re-render.
  - [x] A2.3 Browser: tick Country, click a row, type in search: Country stays; a resized column keeps its width.
- [x] A3 **Stage owners see every tender in the company** (answer to 006's question b: yes, with masking). In `data/access.ts` (~195 and 246–251):
  - [x] A3.1 `const STAGE_OWNER: Grants = { ...CONTRIBUTOR, 'tender.view': 'tenant', 'stage.view': 'tenant' };` for Planning, Compliance and the Project Director.
  - [x] A3.2 Commercial Manager: `'tender.view'` and `'levelling.view'` at `tenant`; `'pack.view': 'invited'`; `'input.respond': 'own'`; `'stage.view': 'tenant'`; `'see.margin'` and `'see.quotes'` at `tenant`.
  - [x] A3.3 Unchanged: `pack.view` stays `invited` for the others; `cleared` and `see.restricted` stay with hot and exec only. The restricted check in `can()` (~372) still runs before scope.
  - [x] A3.4 Dev checks: plan → `tender.view` on a Stage 4 tender with no invites is allowed; plan → `tender.view` on restricted T-2026-121 is refused; comm → `see.margin` on a Stage 5 tender is allowed; proc → `see.margin` still refused.
- [x] A4 **No internal plan numbers in production copy.** `ComingNext.tsx:19` ("Screen arrives with plan 007.") and `DashboardRoute.tsx:28–30` ("…arrives with plan 011", "works in its own shell") ship in `dist`.
  - [x] A4.1 Production text: "This screen isn't part of the demo yet." and, for the operator console, "The Catalyst operator console isn't part of this demo yet."
  - [x] A4.2 In dev builds only, append the plan number in muted text. (acceptance: `grep -c "plan 0" dist/assets/*.js` finds none of these strings)
- [x] A5 **Commercial Manager keeps Stage 2's levelling screen** (dashboards.md §8.3). `navFor` drops a stage group when the stage itself isn't viewable; keep a group whose child passes, with a header that isn't a link. Update the self-check table (`access.ts:484–499`).
- [x] A6 Small copy and layout fixes:
  - [x] A6.1 `InfoTip.tsx:27`: "fewer than five" comes from `MIN_N`.
  - [x] A6.2 `FlowStrip.tsx:17` and the missing-tile state: show `notDefinedText`, never a raw id like "PF-5".
  - [x] A6.3 `.db-main` gets a minimum height so Table ↔ Graph toggling doesn't make the page jump (dashboards §1 Z5).
- [x] A7 **Routes from `SCREENS`.** `App.tsx:87` repeats the path list from `pages/gcc/screens.ts`; build the GCC routes from `SCREENS` so later lanes add a screen in one place.
- [x] A8 **Entry chunk: accepted as is** (answer to question a; Najd is the default tenant, so any split slows the prospect's first paint). No code change. Record it in the execution report.
- [x] A9 **`TenderSummary` never shows a raw fact key** (e.g. `prepWd`): fall back to a humanised label when no column is registered (lane B registers headers for its keys in B18).

### Lane B — Lifecycles, port and seed
- [x] B1 **Mask win probability and positions** (roles-and-access §9: Head of Tendering, CEO, committee members, Bid Manager on own tenders). In `domain/gcc/lifecycle.port.ts`, gate on the existing `see.positions` capability (don't add capabilities):
  - [x] B1.1 Row fields `winP`, `winBand`, `positionsRecorded`, `quorum`, `weightedValue` (~118–123); top-level `win` (~188); the tracker status line's win and positions (~275–279).
  - [x] B1.2 Harness or dev check: Coordinator, Procurement, Proposal and Planning see none of them; Faisal (hot) and the Bid Manager on his own tender see them.
- [x] B2 **Mask estimated price** under the margin mask: `estPrice` (~128–134) and "Estimated price SAR 210.0 M" in the status line (~282).
- [x] B3 **One visibility check for everyone.** Export `tenderCtx` and `visible` from the port, and add `visibleOf(tenant, viewer)`. `liveOf`, `gateEventsIn` and `capturesIn` accept an optional viewer and exclude restricted T-2026-121 for people not cleared. (acceptance: Najd Stage 1 counts 12 for Faisal, 11 for Aisha, through every query, not just table rows)
- [x] B4 **T-2026-097's reference is `WCWS/PRJ/2026/0009`** (004's IN-0308-09 and 007a's Addendum 2).
  - [x] B4.1 `lifecycle/pools.ts:187` `acronymOf`: drop "Company", "Co." and "Co" before taking initials (WCWSC → WCWS, CCWSC → CCWS, NCWSC → NCWS).
  - [x] B4.2 `live/common.ts:57–58` `refFor`: prefer an explicit ref from 004's data (intake or addendum event base ref, `ref.replace(/,\s*Addendum \d+$/, '')`) before generating one.
  - [x] B4.3 Generated references must not reuse the TID's number (CCWS/PRJ/2025/0262 next to T-2025-262 looks staged): derive the serial deterministically from the TID (e.g. a seeded offset) and never change a reference 004 authored.
- [x] B5 Win bands: already done by the orchestrator (see Context). Tick it.
- [x] B6 Hero documents-in time: `live/najd.ts:101` uses 07:31 (the purchase approval); documents-in is **07:33**, per the seed intake event and gcc-demo-data §5.1.
- [x] B7 **T-2026-079 is submitted on Thu 19 Feb 2026**, not Sun 22 Feb (Founding Day, a KSA closure). Update the facility label at `tenants/najd.ts:~860`. (acceptance: every 40-lifecycle window count unchanged; DG3→submission 3 days)
- [x] B8 **No deadlines in the expected Eid closure:** Najd T-2026-128 (26 Mar) and Corniche T-2026-063 (22 Mar) move to the first working day that `domain/calendar.ts` doesn't flag for their country. Re-run 70-stage1 and 40-lifecycle.
- [x] B9 **Seed reasons that contradict the derived numbers:**
  - [x] B9.1 `tenants/qurain.ts:125`: replace "Headroom barely covers the bid bond; a performance bond would not fit" with a sentence that matches the facility rule: the bid bond fits, but the performance and advance-payment guarantees together would exceed headroom if won and the 10% advance is taken.
  - [x] B9.2 `tenants/batinah.ts:106`: "large share of headroom" is 8.7%; reword to match.
- [x] B10 **Turnover lines tell one clean story** (answer to 007a's question a):
  - [x] B10.1 Qurain: move Qurain Meridian Arabia's FY2025 `auditDate` (`tenants/qurain.ts:~267`) after 10 May, so PQ-11 reads a clean "Pass (SAR 1.35 bn)". The fit score stays 10.
  - [x] B10.2 Corniche: move Corniche's FY2025 `auditDate` (`tenants/corniche.ts:~198`) after the opening date, so PQ-11 shows a single reading: fail, average about SAR 1.12 bn against 1.2 bn. The factor stays 2.
  - [x] B10.3 Write "B10 landed" in the lane log.
- [x] B11 **Issued Stage 8 bid bonds count against the facility.** `live/najd.ts:284` (T-2025-298, SAR 2.3 M) and `live/qurain.ts:121,131` (KWD 0.32 M, 0.24 M) are issued but not in `facility.committed` (`tenants/najd.ts:~859`, `tenants/qurain.ts:~309`). Add them as committed lines and raise the facility limit by the same amounts, so headroom stays **SAR 96.0 M** and **KWD 3.1 M** (30-seed targets unchanged).
- [x] B12 **Eligibility counts come from 007a.** The port and tracker use `eligibilityFor` (007a) for any tender that has `requirements`; 017's hard-coded counts remain only for tenders without them. Add an `interpretation` count to the eligibility fact type. Add a 40-lifecycle row asserting agreement for every tender with requirements. (Today: Najd hero 13 met · 2 at risk · 1 interpretation, not 14/2/0; Corniche and Batinah heroes 2 pass · 13 fail · 1 n/a, not 5/0/11.)
- [x] B13 **WCWS history:** re-issue T-2025-002, T-2025-024 and T-2025-438 to other issuers, so no lifecycle contradicts 009a's "2 awards from 3 bids since 2022" (lane E stores those award records). Window totals unchanged. Write "B13 landed".
- [x] B14 T-2026-101 (SAR 140 M) sits below Najd's SAR 150–800 M band: reword `tenants/najd.ts:~639` "Inside the value band" to "Just below the value band"; keep the score.
- [x] B15 **Replies due** (answer to 008a's question a: the next reply date still ahead, after extensions): T-104 → `2026-03-10`, Batinah T-2026-027 → `2026-03-12`. The other five already match.
- [x] B16 Record in the execution report: Batinah Stage 1 is 3 until plan 012 adds the scanned tender; Corniche and Batinah have no pre-submission Stage 8 row (accepted); T-2026-097 has been in Stage 3 for 17 days, not 9.
- [x] B17 The tracker's stale sentence (`live/najd.ts:194`) uses 009a's freshness text rather than its own wording (import from `domain/gcc/s3`).
- [x] B18 Register a column header for every step-fact key the lifecycles emit, in one new registry file, so `TenderSummary` shows words, not keys.

### Lane C — Stage 1 and DG1 rules
- [x] C1 **Local content line** (`domain/gcc/s1/eligibility.ts:534`): PQ-15 defaults to the tender's country, `r.country ?? countryCodeOf(ctx.t.country)`, so Corniche's UAE In-Country Value certificate no longer counts as a KSA baseline.
- [x] C2 **Radar copy by source kind** (`domain/gcc/s1/intake.ts:180–181`): the "Assisted: an operator completes the portal login…" text for portal kinds only; no "login needed" for the scanned drop or manual upload.
- [x] C3 **DG1 lock** (`dg1/pack.ts:115`) depends on `blocking.count` only; the coordinator nudge is optional.
- [x] C4 **JV recommendation enforced:** `validateDg1` refuses Pursue with a prime strategy on a "JV needed" recommendation unless a JV strategy is recorded or a reason is given (Dafna's path is "Pursue with the JV scenario recorded").
- [x] C5 **Discard on a PQ fail isn't blocked by open fields:** when the recommendation is a PQ-fail discard, Discard is allowed while blocking fields are open (no open field can change a PQ fail). Pursue stays locked.
- [x] C6 Export `rollupReason(code)` mapping `pq-fail-*` sub-codes to `pq-fail`, for DEC-10 and 017's targets.
- [x] C7 `eligibilityFor` returns an error result for an unknown `scenario.partnerId` instead of ignoring it.
- [x] C8 **One money format per sentence** (`fit.ts:159–161`): Qurain's facility line mixes "KWD 785,920" with "KWD 1.96 M". Show both in millions to 2 dp ("KWD 0.79 M", "KWD 1.96 M"). If `domain/money.ts` has no forced-millions option, add a backward-compatible one and one case in the formats dev check.
- [x] C9 **Bid bonds for the Stage 3 tenders:** add `s1/bonds.ts` rows for T-2026-097, T-2026-101, T-2026-029 and T-2026-049 at **2%**, validity **120 days** (009a's values). One validity rule: the tender's stated validity; 90 days only when unstated. Write "C9 landed".
- [x] C10 *(after B10)* Update 70-stage1's expected texts: Qurain PQ-11 a clean pass and no turnover line in "what would change it"; Corniche PQ-11 one fail reading (about SAR 1.12 bn). Facility wording: "if won and the 10% advance is taken".
- [x] C11 **Label the two capacity windows** in the view models: the pack's capacity uses the window to submission (61% → 79%), and triage and CAP-1 use the next 4 weeks (78% → 96%). Add a `windowLabel` so 007b can show which is which.

### Lane D — Stage 2 rules
- [x] D1 **Removal reasons only for suppliers that can be sent to** (`domain/gcc/s2/shortlist.ts:199–201`). Approving a shortlist without the blocked Tarvessa Trading FZE needs no reason; a blocked supplier can never reach an approved shortlist.
- [x] D2 **Levelling changes need a note** (`levelling.ts:205` `levelWrite`): return `{ error }` when rejecting the agent's adjustment, or changing its amount, without a note (CLAUDE.md rule 8).
- [x] D3 **Replies due = the next reply date still ahead**, after extensions; fall back to the original date when none is ahead. Update the 017 comparison rows (they pass once B15 lands). (acceptance: T-104 "replies due Tue 10 Mar · 4 overdue"; Batinah "Thu 12 Mar")
- [x] D4 **A DG1 re-open takes the tender out of Stage 2:** `s2/context.ts:117–135` (`pursueOf`, `liveS2Tenders`) use 007a's `dg1RecordFor(...).current` instead of reading `dg1:` keys directly.
- [x] D5 Fix the stale comments "overdue since 4 Mar" (`suppliers/najd.ts:151`, `:179`): the reply date was Thu 5 Mar 17:00, escalation Sun 8 Mar 08:00.
- [x] D6 **Extension reasons as data:** add `extensionReason` to `Rfq`; fill it for Batinah's Addendum 1 and Karst's weekend request; tie the P-03 extension to CL-104-04 (filter design flow), not VAL-104-1 (`tenders/najd.ts:23–25`).
- [x] D7 Vary the times of the "overdue, not escalated" RFQs so they don't all fall due at exactly Sun 8 Mar 09:00 (keep them before 10:00 today and not yet escalated).
- [x] D8 `80-stage2.tsx` (~160): the 017 comparison sets `rfqs.total = c.sent`, so it can't fail. Compare against the rules' own total.
- [x] D9 `kickoff.ts:49`: use the procurement owner in 007a's `Dg1Decision.team.proc` when present, else `${tenant}.proc`.
- [x] D10 `benchmarks.ts:46–47`: cite ui-direction §7.3 for the escalation rule (the orchestrator writes it there on 2026-09-26: overdue at the reply time, reminder sent; escalated at 08:00 the next working day).
- [x] D11 Label wording: keep "Design basis (design and build)" (`kickoff.ts:25`); lane E aligns to it.

### Lane E — Stage 3 and DG2 rules
- [x] E1 **Margin leaks to masked viewers (must).**
  - [x] E1.1 `domain/gcc/s3/pack.ts:359`: when `canSeeMargin` is false, section 9.9's items drop `fields` (the Commercial input's `margin`).
  - [x] E1.2 `pack.ts:361–364` via `freshness.ts:36/116`: drop `patch.margin` from `sections['9.10'].body.freshness.versions[].effects[]` for masked viewers.
  - [x] E1.3 Extend the dev check's "no digits" test from 9.7 to the **whole** masked pack (serialise it and search for margin, win and price values).
- [x] E2 Stale-pack copy (`dg2/decision.ts:56`) says "(or approve with a reason)" but the rule (`:166`) asks only for the acknowledgement. Change the copy to the acknowledgement.
- [x] E3 **Condition ids are round-scoped** (`dg2/conditions.ts:33`): `{TID}-R{round}-C{n}`, so round 2's closed C1 doesn't close round 3's C1.
- [x] E4 **Letters are round-scoped** (`dg2/record.ts:80,107`): put the round on `dg2-letter:` and filter by it; an old No-Bid letter no longer shows after re-open → Bid.
- [x] E5 **Re-open history** (`dg2/reopen.ts:81`): store each re-open's reason and trigger with its entry in `previous[]`.
- [x] E6 **Key staff from 007a** (`data/gcc/s3/inputs.ts:208–223, 253–266`): use `data/gcc/s1/personnel.ts` (Hassan Al-Zahrani, Dr Samir Nassar, Fahd Al-Rashid, Rajesh Iyer); no "Ramesh Iyer".
- [x] E7 Label `inputs.ts:128`: "Design basis (design and build)", matching 008a.
- [x] E8 **Provisional facility figure:** add `facilityAfterBasis: 'finance' | 'bank-facility'` (or a provisional flag) to `PackSummary`, so T-2026-101's "SAR 93.2 M" says Finance hasn't confirmed it.
- [x] E9 **"No input requested" state:** a section with no request (Qurain T-2026-049's 9.6) is not "current"; the +12 delivery impact in 9.4 without a Planning input is marked as an estimate.
- [x] E10 **Validation state from 007a** (`s3/pack.ts:196`): use 007a's `validationsOf` state, not "any `val:` key is resolved", so a sent-back flag stays in the pack's risk list.
- [x] E11 *(after C9)* **Bid bond from 007a:** read `bidBondFor` (percentage and validity) instead of `s3/packs.ts:20/78/94`.
- [x] E12 **No retyped seed facts:** the safe delivery level of 70 (`packs.ts:12–17`) and the facility numbers (`inputs.ts:165`) are read from `data/gcc/tenants/*`.
- [x] E13 **WCWS client history as data:** store Najd's WCWS award records (2 awards from 3 bids, 2022–2024, synthetic project names) in `data/gcc/s3`; `win.ts:15` and `packs.ts:41` cite them. *(after B13)* Add a dev-check row: no WCWS lifecycle result in the window contradicts them.
- [x] E14 T-2026-101's value driver (`s3/win.ts:37`): "Mid-band value" → "Value near the band's lower edge"; score unchanged.
- [x] E15 **Letter signature** (`dg2/letter.ts:36`): sign with the tenant's display name (`tenant.name`, e.g. "For and on behalf of Najd Arcline Contracting Co.").
- [x] E16 Log as deviations in this plan's Lane E report (not in 009a's file, which the orchestrator is editing): `planning.deliveryImpact` and the legal `category`/`rating`/`mitigation` fields (beyond catalogue §C.6, needed by steps 7.2.4 and 7.2.6).

## Data and derivation
- New `done` keys: none. Changed shapes: E3 condition ids and E4 `dg2-letter:` gain the round. Reset demo still clears everything.
- New exports other plans rely on: `tenderCtx`, `visible`, `visibleOf` (B3); `rollupReason` (C6); `windowLabel` on capacity VMs (C11); `facilityAfterBasis` (E8); `extensionReason` (D6).

## Acceptance checks (each lane, for its own panels)
- [ ] typecheck and build pass.
- [ ] `/dev/checks` in all five GCC tenants: every panel passes (30, 40, 70, 80 and 90, formats, people), with no console errors.
- [ ] Reset demo returns to the seed state.
- [ ] gen-in's home and sidebar are unchanged.
- [ ] No `Date.now`, `Math.random` or argument-less `new Date()` in the changed folders; no role checks outside `access.ts`; no numbers typed into pages.

## Lane log
(Each lane writes one-line hand-offs here: "B10 landed", "C9 landed", "B13 landed".)
- B10 landed (2026-09-26): Qurain Meridian Arabia's FY2025 audit is now Sun 24 May and Corniche's is Tue 19 May, both after the hero opens on 10 May. PQ-11 reads the FY2022–FY2024 accounts only: Qurain "Pass" at SAR 1.35 bn, Corniche "fail" at SAR 1.12 bn against 1.2 bn.
- B13 landed (2026-09-26): no Najd lifecycle submits a bid to WCWS or has a result from it. T-2025-438 is now issued by Western Region Municipal Projects Office. T-2025-002 and T-2025-024 are now Southern Cities Water Services Company, because folded and generated bids skip `POOLS.najd.authoredClients`. Window totals are unchanged.
- C9 landed (2026-09-26): `bidBondFor(tenant, tid, done)` now covers T-2026-097, T-2026-101, T-2026-029 and T-2026-049 at 2%. Validity comes from `validTo`, `validityDays` and `validityText`, with 120 days for the two Najd tenders and 90 days for Corniche and Qurain, which are 009a's own values.

## Execution report
(One sub-section per lane: changed files, verification, deviations, blockers, follow-ups.)

### Lane C (executor, 2026-09-26)

**Changed files.** Only Lane C's files were changed:
- `src/data/gcc/s1/bonds.ts` and `types.ts`: four Stage 3 bond rows (C9); `BondTerms` gains `bidValidityDays` and `source`.
- `src/domain/gcc/s1/eligibility.ts`:
  - C1: PQ-15 counts a certificate only in the tender's country. Corniche now reads "In-Country Value (ICV) certificate (UAE) does not count in KSA; a Saudi local content baseline certificate is required."
  - C7: `EligibilityResult.error`.
- `src/domain/gcc/s1/intake.ts` (C2): `loginNeeded` and the assisted text apply to `portal` and `client-portal` only.
- `src/domain/gcc/s1/bond.ts` (C9): one validity rule, `validityOf()`. `BidBond` gains `validityDays`, `validityBasis`, `validityText`, `source` and `advancePct`.
- `src/domain/gcc/s1/fit.ts` (C8, C10): the facility line gives every amount in millions to 2 dp and ends "if won and the 10% advance is taken".
- `src/domain/gcc/s1/triage.ts` (C11): adds `windowLabel`, `nextWeeksLabel` and `toSubmissionLabel`.
- `src/domain/gcc/s1/index.ts`: exports.
- `src/domain/gcc/dg1/pack.ts`:
  - C3: the lock comes from `blocking.count`; `nudge` is optional.
  - C5: `locked.discardAllowed`, and the export `isPqFailDiscard`.
  - C11: `capacity.windowLabel`.
- `src/domain/gcc/dg1/decision.ts`:
  - C4: the JV rule, plus a check that the JV partner is on the list.
  - C5: Discard is allowed while locked on a PQ-fail discard. `snapshot.validationsOpen` is now a `number`, and the audit says how many fields were still open.
  - C6: `rollupReason`.
- `src/domain/gcc/dg1/index.ts`: exports.
- `src/domain/money.ts` (C8): a backward-compatible `millions` option. `src/pages/gcc/dev-checks/10-formats.tsx`: one case, "KWD 0.79 M".
- `src/pages/gcc/dev-checks/70-stage1.tsx`: a new "Plan 020 fixes" section (18 rows), 3 new PQ-11 rows for C10, and the updated Qurain facility and PQ-11 targets.

**Verification.**
- **Typecheck:** no errors in Lane C's files. `tsc -b` still reports errors in other lanes' files that were mid-edit, and I didn't touch them: `s3/pack.ts` and `s3/inputs.ts` (E), `dashboards/build.ts` (A), `lifecycle.port.ts` (B).
- **Build:** `vite build` into a scratch folder builds cleanly. `npm run build` stops at those `tsc` errors.
- **`/dev/checks`** in headless Chrome, each tenant from a fresh store, own dev server on port 5181:

  | Tenant | Result |
  | --- | --- |
  | Corniche | every panel passes; 70-stage1 all 71 targets met |
  | Dafna | every panel passes; 70-stage1 all 71 targets met |
  | Batinah | every panel passes; 70-stage1 all 71 targets met |
  | Qurain | every panel passes; 70-stage1 all 71 targets met |
  | Najd | page crashed by lane B's 40-lifecycle panel (`reading 'pass'`, their B12 edit in progress) |

  - The four tenants that loaded had no console errors, and 10-formats shows all 17 checks passing.
  - For Najd I server-rendered the 70-stage1 and 10-formats panels on their own through Vite's SSR loader: all 124 targets met, and all 17 format checks pass.
  - **Najd needs one browser re-run once lane B's file compiles.**
- **gen-in:** opens on `/dashboard/bid` with no console errors.
- **Readings:**
  - DG1 pack capacity: "Today to submission (8 Mar – 10 May): 61% → 79%".
  - Triage: "Next 4 weeks (8 Mar – 4 Apr): 78% → 96% with the hero".
  - Qurain facility line: "headroom KWD 3.10 M against the KWD 0.79 M bid bond, then a KWD 1.96 M performance bond and a KWD 3.93 M advance payment guarantee if won and the 10% advance is taken".
- **Grep:** no `Date.now`, `Math.random` or bare `new Date()` in the changed folders, and no role checks.
- **Reset demo:** no new `done` keys. The checks use an in-memory `done` only.

**Deviations.**
1. **C9 validity: 009a's per-tender values, not 120 days for all four.** 009a's packs state 120 days for the two Najd tenders (T-2026-097, T-2026-101), but 90 days for Corniche T-2026-029 and Qurain T-2026-049 (`s3/packs.ts:78, 94`). I kept those, so lane E's pack doesn't change when E11 reads from 007a.
   - Validity rule, in order: the `bond-validity-end` key date; else `bidValidityDays` from opening; else the `validity-end` key date; else 90 days from opening, with `validityBasis: 'unstated'`.
   - If all four should be 120 days, change the two rows in `s1/bonds.ts`.
2. **C9 side effect:** Qurain T-2026-049 now gets a facility line in `fitFor().wouldChange`. The bond is KWD 0.44 M; if won, the guarantees would be KWD 3.30 M against KWD 2.66 M of headroom after the bid bond. That agrees with 009a's rationale.
3. **C2:** mailboxes no longer show "login needed" either. A mailbox has no portal login.
4. **C4:** the JV message appears only when no note is given and the pursuit isn't already overriding a Recommend discard (that path already requires a note), so a person never sees two errors for one fix. I also check that a JV strategy's `partnerId` is on the tenant's partner list, so C4 can't be bypassed with an unknown id.
5. **C5:** "PQ-fail discard" means the recommendation is Recommend discard and eligibility is not-eligible. That covers Corniche (capped `pq-fail`) and Batinah (score 38, not capped).
6. **C7:** an unknown partner returns `{ lines: [], counts all 0, verdict: 'not-eligible', asJv: true, error, text: error }`. It never falls back to checking the bidder alone.
7. **C8:** the headroom in that sentence also moves to 2 dp ("KWD 3.10 M"), so the whole sentence has one format.
8. **C10** was done against the seed as it stands (Corniche FY2025 audit 19 May, Qurain Meridian Arabia 24 May, both after opening). **Lane B had not yet written "B10 landed"** when I finished. If B changes those dates again, the three C10 rows will show it.

**Blockers.** None. Lane E: C9 has landed (see the lane log), so E11 can go ahead.

**Follow-ups (not done).**
- A Najd browser re-run of `/dev/checks` once lane B's `lifecycle.port.ts` and 40-lifecycle compile.
- 007b's DG1 form should read:
  - `locked.discardAllowed`, to keep Discard enabled;
  - `locked.nudge`, which may now be absent;
  - `capacity.windowLabel`.
- `/dev/checks` has no error boundary, so one crashing panel blanks every other panel. Worth wrapping each panel (plan 006's `GccPending`; not a Lane C file).

### Lane D — Stage 2 rules (executor, 2026-09-26)

**Changed files** (all within lane D's scope):
- `src/domain/gcc/s2/shortlist.ts`: D1. A removal reason is needed only for a sendable recommended supplier. A blocked supplier (sanctions match or anti-bribery flag) is refused on any shortlist.
- `src/domain/gcc/s2/rfq.ts`: `rfqWrite` checks screening before shortlist membership (see deviation 1).
- `src/domain/gcc/s2/levelling.ts`: D2. `levelWrite` returns `S2WriteResult` and refuses a rejection, or an amount that differs from the agent's figure, without a note. The note is trimmed, and the audit mentions an amount change only when there is one.
- `src/domain/gcc/s2/tracking.ts`: D3 (`repliesDue` = the next reply date still ahead, else the issued date; also returns `issuedReplyBy` and `nextReplyBy`); D8 (`total`); D10 (header comment).
- `src/domain/gcc/s2/context.ts`: D4. `pursueOf` and `liveS2Tenders` read 007a's `dg1RecordFor(...).current`. `Pursue` gains `procId` from the decision's `team.proc`.
- `src/domain/gcc/s2/kickoff.ts`: D9. The owner is `p.procId`, else `${tenant}.proc`.
- `src/domain/gcc/s2/done.ts`: removed `Dg1DecisionRead`, which nothing reads any more. `K.dg1` stays, with a comment.
- `src/data/gcc/s2/types.ts`, `src/data/gcc/s2/tenders/build.ts`: D6. `Rfq.extensionReason`, passed through by the builder.
- `src/data/gcc/s2/tenders/najd.ts`: D5, D6, D7, and the header comments.
- `src/data/gcc/s2/tenders/others.ts`: D6 and D7. The header table and "Replies due" text are updated (T-2026-027 now reads Thu 12 Mar).
- `src/data/gcc/s2/benchmarks.ts`: D10. `ESCALATION_TIME` cites ui-direction §7.3 "Escalation", decided 2026-09-26.
- `src/pages/gcc/dev-checks/80-stage2.tsx`: D8 compares `rfqs.total` with the rules' `total`. New rows:
  - D1: hero P-09 approved without Tarvessa and with no reason; approval refused when a sendable supplier is left out with no reason; Flow 4 "shortlist a blocked supplier" refused.
  - D2: three levelling-note rows, targeted in every tenant.
  - D3: replies due for T-104 and T-2026-027.
  - D4: Flow 7, a DG1 re-open via 007a's `dg1Reopen`.
  - D9: Flow 8, a pursue that names a Procurement owner.
  - D6: every extended RFQ states why (every tenant).
  - Info rows for the extension reasons and the overdue, not escalated reply times.
- D11: no change. The label stays "Design basis (design and build)".

**Verification:**
- `npm run typecheck` and `npm run build` pass.
- Headless Chrome on a dev server of my own (port 5180), fresh profile, `/dev/checks` in each tenant. The Stage 2 panel reads:
  - "All 52 targets met" in Najd;
  - "All 9" in Corniche and Dafna;
  - "All 13" in Batinah and Qurain.
- The 017 comparison rows pass for all seven Stage 2 tenders. B15 was already in 017's data when I ran, so T-104 reads Tue 10 Mar and T-2026-027 reads Thu 12 Mar.
- T-104 reads "Tue 10 Mar 2026 · 4 overdue". Overdue and escalated counts are unchanged in every tenant, and the determinism row is equal.
- The Indian tenant's home renders its legacy sidebar with no console errors.
- Settings → Reset clears a seeded `lev:` key. Lane D adds no `done` keys, and the dev check writes to in-memory objects only.
- No `Date.now`, `Math.random` or argument-less `new Date()` in the changed folders, and no role checks.
- Console: no errors from Stage 2 code. Two errors came from other lanes' files while they were being edited: `90-stage3` → `s3/pack.ts` "waitingOn is not defined" (lane E) and `40-lifecycle` "reading 'pass'" (lane B). Nothing outside `80-stage2.tsx` imports `domain/gcc/s2`.

**Deviations:**
1. D1: `rfqWrite` now checks screening before shortlist membership. Sending to Tarvessa now reads "Sanctions screening match: cannot be sent an RFQ" instead of "add it with a reason first", which the new rule no longer allows. A supplier whose screening is merely *due* can still stay on a shortlist (held by screening, SRC-8), and leaving one out needs no reason.
2. D8: "the rules' own total" is every RFQ record the tender has, seeded or sent in the demo, including any dated after now. `sent` counts those sent by now. It is the only RFQ total the rules define, and it gives 017's 33, 27, 21, 36, 30, 30 and 24.
3. D6: `extensionReason` is filled for **every** extended RFQ, not only the three named, and the dev check asserts it in every tenant. The additions:
   - T-104 P-04: VAL-104-1, plus Salwa's extra two days;
   - Dafna T-2026-019 P-03: lateral connection schedule reissued on Tue 3 Mar;
   - Qurain T-2026-058: Taihu and Fahaheel, both weekend requests from the supplier.

   The Dafna and Qurain reasons are new synthetic facts.
4. D7: the new reply times:
   - Najd P-03 09:30, P-04 08:00;
   - Dafna P-03 08:30;
   - Batinah Karst unchanged at 09:00 (the weekend request);
   - Qurain Taihu 08:00, Fahaheel 09:30.

   The SRC-11 nudge count falls slightly because a reply time before 09:00 skips that morning's reminder. That row is information only, with no target.
5. D5: the stale comments were in `tenders/najd.ts` (~151, ~179), not `suppliers/najd.ts`.

**Blockers:** none.

**Follow-ups (not done):**
- `tracking.ts` `reminderPlan` still names `${tenant}.proc` in the escalation line. It could follow the DG1 team's Procurement owner, as the kick-off now does (D9).
- dashboards.md's Stage 2 column example "RFQs sent (9 / 9)" reads as packages issued. 017's facts and the tracker line count RFQs (27 of 27). The doc wording needs aligning.
- Plan 008a's deviation 18 (replies due = the issued date) is superseded by D3.

### Lane E — Stage 3 and DG2 rules (executor, 2026-09-26)

**Changed files** (all in Lane E's scope):
- `src/data/gcc/s3/clients.ts` (new, E13): `CLIENT_BIDS`, Najd's three decided WCWS bids from 2022 to 2024 (two won), with synthetic project names.
- `src/data/gcc/s3/types.ts`:
  - `ClientBid`, and `cites` on win-model drivers;
  - `WinTheme` (a string, or `{ text, cites }`);
  - `PackSnapshot.bonds` is now `{ retentionPct }` only (E11).
- `src/data/gcc/s3/index.ts`: exports `CLIENT_BIDS`; `s3Data().clientBids`.
- `src/data/gcc/s3/win.ts`:
  - E13: T-2026-097's client driver cites the three records, with the source "Client history: award records".
  - E14: T-2026-101 reads "Value near the band's lower edge", still 4 points.
- `src/data/gcc/s3/packs.ts`:
  - E12: `safePct` comes from each tenant's `fit.safeDeliveryPct`.
  - E11: the bond terms are removed, and only retention stays.
  - E13: the WCWS win theme cites the two awards.
- `src/data/gcc/s3/inputs.ts`:
  - E6: key staff and HR availability are built from `data/gcc/s1/personnel.ts` by id. The names are Hassan Al-Zahrani, Dr Samir Nassar, Fahd Al-Rashid and Rajesh Iyer on T-2026-097, and Yusuf Al-Harthi and Dr Samir Nassar on T-2026-101. "Ramesh Iyer" is gone.
  - E7: "Design basis (design and build)".
  - E12: the Finance inputs of T-2026-097 and T-2026-049 quote `NAJD.facility` and `QURAIN.facility` (limit, utilised, Σ committed, headroom, as of), so they follow lane B's B11.
- `src/domain/gcc/s3/pack.ts`:
  - E1: masking. See deviation 1.
  - E8: `facilityAfterBasis`.
  - E9: `'not-requested'`, and the delivery-load estimate.
  - E10: `extractionFlagsFor`, which uses 007a's `validationsOf`.
  - E11: the bond comes from `bidBondFor` and 007a's bond terms.
  - E13: win themes carry `cites`.
- `src/domain/gcc/s3/win.ts` (E13): `ClientBidVM`, `clientBidsOf`, `clientHistoryText`, and `WinDriverVM.cites`.
- `src/domain/gcc/dg2/keys.ts`:
  - `ReopenEntry` (E5);
  - `letterKey()` and `LetterValue.round` (E4);
  - `conditionId()` (E3).
- `src/domain/gcc/dg2/conditions.ts` (E3): ids are `{TID}-R{round}-C{n}`, and `conditionCloseWrite` parses that form.
- `src/domain/gcc/dg2/letter.ts`:
  - E4: `letterWrite(tenderId, round, text, sent, byId)` writes `dg2-letter:{TID}:R{round}`.
  - E15: the letter signs with `tenant.name`.
- `src/domain/gcc/dg2/decision.ts`:
  - E2: `STALE_WARNING` asks for the acknowledgement only.
  - E4: the letter is drafted for `state.round`.
- `src/domain/gcc/dg2/reopen.ts` (E5): each approval appends a `ReopenEntry`: the decision, reason, trigger, requester, request time, approver and time.
- `src/domain/gcc/dg2/record.ts`:
  - E4: `letter` is the current round's only.
  - E5: `reopens[]` carries each re-open's reason, trigger, requester, approver and that round's letter.
- `src/pages/gcc/dev-checks/90-stage3.tsx`: new rows for E1–E15 (below), and the determinism grep now also catches a bare `new Date()`.

**Verification.**
- `npm run typecheck` (`tsc -b`) and `npm run build` both pass. The only warning is the known chunk-size one (A8).
- `/dev/checks` was run in headless Chrome over the DevTools protocol, one tenant at a time, on the shared dev server (5173). **Every panel passes in all five tenants, with no console errors.** Stage 3 panel results:

  | Tenant | Stage 3 targets met |
  | --- | --- |
  | Najd | 96 of 96 |
  | Corniche | 16 of 16 |
  | Dafna | 4 of 4 |
  | Batinah | 4 of 4 |
  | Qurain | 18 of 18 |

  Formats, people, 30, 40, 70 and 80 also pass everywhere.
- New rows, all passing:
  - **E1:**
    - "Masked pack: no margin, win or price values" for every Stage 3 tender, and for T-2026-097 after a re-run, when the v2 margin patch sits in 9.10's versions. The pack is serialised whole and searched for the margin ranges (text, arrays, decimals and any `"margin":[`), the win text, `p`, drivers, the positions count, the weighted value, and a Commercial estimate's cost.
    - A Commercial Manager row: margin shown, while win, positions and the weighted value are masked.
  - **E2:** the stale warning names the acknowledgement and doesn't mention a reason.
  - **E3 (Flow 9):** round 1's C1 is closed; after a re-open and a new Bid, `T-2026-097-R2-C1` and `-R2-C2` are open.
  - **E4 (Flow 7):** after the re-open, no letter is shown and the round 1 letter is kept with its re-open entry. After the Bid in round 2, there is still no letter.
  - **E5 (Flow 7, two re-opens):** each keeps its own trigger and reason.
  - **E6:** every key-staff and HR name is on 007a's personnel record, with the same available-from date.
  - **E7:** all six kick-off labels match 008a's `KICKOFF_INPUTS`.
  - **E8:** T-2026-101 reads "SAR 93.2 M · bank-facility · Provisional: Finance has not confirmed headroom for this bid yet"; T-2026-097 reads "finance".
  - **E9:**
    - "not-requested" sections are Corniche T-2026-029 9.6, and Qurain T-2026-049 9.4 and 9.6; the Najd tenders have none.
    - Qurain's delivery load reads "… (104%). +12 for this bid is an estimate: no Planning input".
  - **E10:** on T-2026-104 (VAL-104-1) the flag stays open, stays in the pack's risks after a send-back (`flagState: 'sent-back'`), and leaves once it is picked.
  - **E11:** each tender's pack rate and validity agree with `bidBondFor`. T-2026-097 reads "SAR 7.1 M (2% of the estimate), valid 120 days".
  - **E12:** the Finance input equals 004's facility for T-2026-097 and T-2026-049, and the safe level equals the fit model.
  - **E13:**
    - the client driver's text equals `clientHistoryText` of its records;
    - the records name the register's issuer;
    - no WCWS lifecycle in the window has a submission or a decided result (the same rule as lane B's B13 row, which also passes);
    - the win theme cites 2022 and 2024.
  - **E15:** the letter's last line is "For and on behalf of Najd Arcline Contracting Co.".
- The existing 009a targets are unchanged and pass: 58 ± 8, 101%, SAR 88.9 M, SAR 205,900,000, flows 1–8, and the 017 agreement rows in every tenant.
- **gen-in:** the home page (Bid Cockpit) and sidebar load unchanged, with no console errors.
- **Grep:** no `Date.now`, `Math.random` or bare `new Date()` in the changed folders, and no role checks. The one `firstWithRole(tenant, 'hot')` predates this plan: it looks up the escalation contact and grants nothing.
- **Reset demo:** no new `done` prefixes. `dg2-letter:` and condition ids only gain the round, and Reset clears the whole `done` map as before. No screen writes these keys yet (009b builds them); the dev check works on an in-memory `done`.

**Deviations.**
1. **E1 masks win probability and positions too, not only margin.**
   - `PackViewer` gains an optional `canSeePositions`, which the page takes from `see.positions`. When it is absent it follows `canSeeMargin`, since everyone masked from margin is also masked from positions and win (roles-and-access §9).
   - Masked viewers get:
     - 9.1 as `{ masked: true, text }`;
     - no `win` on 9.4's `ifWon[]`;
     - `summary.win` and `summary.positions` = "Masked for your role";
     - `weightedValue: null`.
   - This makes E1.3's "win values" search meaningful, and matches lane B's B1. The Commercial Manager passes `{ canSeeMargin: true, canSeePositions: false }`.
   - Also in E1: 9.9 drops `fields` from **every** item, not only the Commercial input's, and 9.10 drops `marginNote` along with `margin`. The sections above already show masked viewers what they may see.
2. **E8:** `PackVM.facilityAfterBasis` was a sentence. It is now `'finance' | 'bank-facility'`, and the sentence moved to `facilityAfterSource`. `PackSummary` gains `facilityAfterBasis` and `facilityAfterNote` (`PROVISIONAL_FACILITY_TEXT`). Nothing outside Lane E read the old field.
3. **E9:**
   - `SectionFreshness` gains `'not-requested'`. The order is: waiting, then not-requested (none of the section's inputs requested), then stale, then current.
   - A section with only some of its inputs requested stays current or stale, and lists the missing ones in `notRequested`, with the text "No input requested: …". Corniche T-2026-029's 9.4 has no Project Director or HR input.
   - Every `ifWon` entry carries `estimate` and `addText` ("+12 (estimate)").
4. **E11 goes further than rate and validity.** C9 also moved performance %, advance % and the source into 007a's bond rows, so the pack reads those from `s1Data(tenant).bonds` too, and `PackSnapshot.bonds` keeps only `retentionPct`. As a result, `Section95.bidBond.validityDays` is `number | null` and gains `validityText`, and `ifWon.advanceGuarantee` is optional (only when the tender offers an advance). The bond amount is still the tender value × 007a's rate, in the tender's currency, so `facilityAfter` agrees with 017.
5. **E3 and E4 change done-key shapes** that 009a's done-key table (lines 73–74) still shows the old way: `dg2-letter:{TID}:R{round}` (the value gains `round`), and `cond:{TID}-R{round}-C{n}`. `letterKey()` and `conditionId()` are exported so 009b builds the keys in one place.
6. **E5:** `ReopenValue.previous` is now `ReopenEntry[]`, and `ReopenState.previous` is typed the same way. The top-level `reason`, `trigger` and `requestedById` stay as the latest re-open's.
7. **E6, story changes:**
   - On T-2026-097 the Project Director now names four key staff, one per PQ-13 role, instead of three. The feasibility note reads "Confirm the process lead before submission, as the Abha STP bid names the same person; …" because Dr Samir Nassar is named on both bids. Rajesh Iyer is "Available from 1 April", as in 007a.
   - T-2026-101's Project Manager is Yusuf Al-Harthi (Deputy Project Manager on record, available now), replacing "Hamza Al-Qarni", who isn't in 007a.
8. **E13:**
   - The driver's `why` text stays in the data, and the dev check asserts it equals the phrase derived from the records.
   - The WCWS row also counts submitted bids, as lane B's B13 row does, not only decided results.
   - B13 isn't marked "landed" in the lane log yet, but lane B's own B13 row and mine both pass on the current seed.
9. **E16 (logged, as asked):** two sets of 009a input fields go beyond catalogue §C.6:
   - `planning.deliveryImpact` (the points of delivery capacity added if won), needed by step 7.2.4 (9.4);
   - the Legal risk items' `category`, `rating` and `mitigation`, needed by step 7.2.6 (9.6).
   009a also added Finance's `bondCharges` (its deviation 2).
10. **E2 copy:** `Pack is stale: re-run and issue it first, or tick "I have seen that the pack is stale" to decide on it as it stands`.

**Blockers.** None.

**Follow-ups (not done).**
- **Margin in DG2 conditions:** the CFO's seeded condition "Minimum margin 9%" becomes a tracked condition, and `conditionsFor` has no viewer mask. When 009b or 013 show conditions to people without `see.margin` (for example Planning at Stage 4), mask or reword conditions that state a margin.
- **Docs, for the orchestrator:** 009a's done-key table needs the E3 and E4 key shapes. (No doc names the old key staff, so nothing else to change.)
- **E12, partly done:** `currentPct` in the packs' portfolio (58, 55, 66) is still typed. The comment ties it to plan 015's `DELIVERY_LOAD`, which doesn't exist yet. Plan 015 should own it, and the packs should read it.
- **009b** should read:
  - `PackViewer.canSeePositions` from `see.positions`;
  - `isMasked()` for 9.1;
  - `summary.facilityAfterNote`;
  - `section.notRequestedText`;
  - `ifWon[].estimate`;
  - `reopens[]` for the re-open history;
  - `RiskVM.flagState` to show "sent back" on extraction flags.

### Lane A — Shell, kit and access (executor, 2026-09-26)

**Changed files** (all within lane A's scope):
- `src/data/access.ts`:
  - A3: `STAGE_OWNER` gains `tender.view: 'tenant'`. The Commercial Manager's grants are exactly as in A3.2.
  - A5: `GccNavItem.labelOnly`; `navFor` keeps a stage outside the role when a screen under it is granted company-wide. The self-check table has its own `comm` row.
- `src/components/layout/Sidebar.tsx` (A5): a `labelOnly` stage renders like a home stage. The header is a plain label, the chevron still folds it, and it starts open.
- `src/domain/gcc/dashboards/build.ts`:
  - A1: one helper, `holds(ctx, cap)`, asks the viewed person without View as. It is used for action sources, tiles and graph metrics. The existing read-only branch still disables in-place rows. `actionRows(sources, ctx)` is exported for the dev check.
  - A6.2: a missing tile or flow carries `notDefinedText(id)` as its label, never the raw id.
- `src/components/dashboard/grid/TenderGrid.tsx` (A2):
  - `DEFAULT_COL_DEF`, `ROW_SELECTION`, the container style and `isExternalFilterPresent` are module constants. `getRowId` and `doesExternalFilterPass` are memoised.
  - Every column's `hide` is `!columns.includes(id) && !shown.includes(id)`.
  - Widths and flex are passed as `initialWidth` and `initialFlex`, and `maintainColumnOrder` is on.
  - The reset effect is keyed by the column ids, not by the array's identity.
- `src/components/dashboard/DashboardPage.tsx`, `dashboard.css`, `chart/StageChart.tsx` (A6.3): see deviation 4.
- `src/components/dashboard/KpiTile.tsx`, `FlowStrip.tsx` (A6.2): a missing tile shows one line; a missing flow shows only its header.
- `src/components/dashboard/InfoTip.tsx` (A6.1): "fewer than five" is built from `MIN_N`.
- `src/pages/gcc/screens.ts`, `src/App.tsx` (A7):
  - `ScreenInfo.page` is an optional lazy loader.
  - `App` makes one route per `SCREENS` entry. A built screen with a `page` renders behind its `cap` (`GuardCap`); any other screen renders `ComingNext`.
  - `/suppliers` keeps the Indian preview's page through `LEGACY_AT`. The `GCC_SCREENS` list and the `admin/*` route are gone.
- `src/pages/gcc/ComingNext.tsx`, `src/pages/gcc/DashboardRoute.tsx` (A4): the new production copy. The plan number shows only in dev builds, in muted text (`t-muted`).
- `src/pages/gcc/TenderSummary.tsx` (A9): `factLabel(key)`, used when no column header is registered.
- `src/pages/gcc/dev-checks/20-people.tsx`:
  - A3.4: four `can()` rows on the tenant's real tenders, falling back to a sample tender where the tenant has none.
  - A1: three View as rows, using `actionRows` on a DG1 source with one in-place row.
  - A5: two sidebar rows.

**Verification:**
- `npm run typecheck` and `npm run build` pass for the whole project (run after the other lanes' files compiled).
- `/dev/checks` in headless Chrome, with a fresh profile and each tenant as its Head of Tendering: every panel passes in all five tenants, with 0 console errors.
  - People and permissions: 17 of 17 in each tenant.
  - The Najd rows use T-2025-336 (Stage 4), T-2026-121 (restricted) and T-2025-322 (Stage 5).
  - My first run was blanked by lane B's 40-lifecycle panel, which was mid-edit; the re-run passed.
- Click-through at 1440 px, 0 console errors throughout:
  - **Sidebar, Najd:**
    - comm: `2 Sourcing` as a plain label over `Quote levelling`, then `5 Pricing`. Clicking it opens the levelling placeholder and highlights the entry.
    - plan: `4` only, with no Stage 3 label.
    - hot, proc, coord and fin: unchanged.
    - Through the real View as menu, viewing as Tarek Haddad shows the same rail; viewing as Omar Siddiqui shows stages 1–8 with their screens.
  - **Not-built screens:**
    - `/levelling` for plan is refused by the guard.
    - `/admin/users` and `/suppliers` show "…This screen isn’t part of the demo yet." with "Plan 010" or "Plan 008" in dev. `/admin/nope` is a 404.
    - The supplier and operator homes show the new titles.
  - **A2, on `/dev/kit`:**
    - Ticked Country, clicked a row (the tracker opened) and searched "water": Country stayed, and the menu kept its tick.
    - Resized "With" from 190 to 250 px: it kept 250 through the row click, the search and a Table → Graph → Table round trip.
  - **A6.3:** at 1440 and 1280 the box is 540 px in Table, in Graph and back in Table, and the page height is unchanged (4879 px). The graph plot fills 489 px. Screenshots checked.
  - **A9:** `/tenders/T-2026-097`, `T-2026-104` and `T-2026-118` show words for every fact. Lane B's B18 headers had landed; the fallback was checked on sample keys (`prepWd` → "Prep (working days)", `rfqsAnsweredOnTime` → "RFQs answered on time", `dg1Due` → "DG1 due").
  - **gen-in:** opens on `/dashboard/bid` with its legacy rail (Bid Cockpit tree, Pipeline, Workflow …), unchanged.
- **A4 grep:** `grep -c "plan 0" dist/assets/*.js` finds none in any file. "arrives with plan", "in its own shell", "Not defined yet" and "Plans 015 and 013" don't occur in `dist`.
- **Reset demo:** with a seeded `dg1:` key, Settings → Reset → "Reset this company" empties `doneBy`, with no errors. Lane A adds no `done` keys.
- No `Date.now`, `Math.random` or argument-less `new Date()` in the changed files. No new role checks: the rail's company-wide rule reads `GRANTS` inside `access.ts`.
- **A8, recorded:** the entry chunk is accepted as is. The build still warns: entry `index` is 554 kB (172 kB gzip); the lazy `DashboardRoute` chunk is 954 kB.

**Deviations:**
1. **A1 also covers tiles and graph metrics.** They had the same `can(…, { viewAs })` call. Read capabilities give the same answer either way, and a write capability on a tile would have shown "Masked for your role" under View as.
2. **A2 went a little further than the two constants.** New callbacks for the external filter made AG Grid re-filter on every render. A width in the column definition is re-applied each time the definitions are passed (AG Grid 36 `reapplyColDef`), so widths moved to `initialWidth`. `toggleCol` no longer calls `setColumnsVisible`: the definitions carry visibility.
3. **A5 keeps a stage only for a screen granted at `tenant` scope.** At list level, `invited` scopes pass. So "a child passes" would have given every contributor holding `pack.view: 'invited'` a "3 Bid decision" label: Planning, Pricing, Proposal, Compliance, Project Director and Finance. Screens reached only by invitation open from the tender.
4. **A6.3 is not only a minimum height.** A tenders table's toolbar wraps to two rows at both 1440 and 1280 (six filter menus), and the grid has a 10 px scrollbar strip. That makes the Table 540 px against the Graph's 491, so a fixed minimum can't match every dashboard, or a table with filter chips.
   - The table now stays mounted under the graph (`visibility: hidden`, so it can't be tabbed to or clicked) and sets the box's height. The graph lies over it and fills it (`PLOT_H` is `'100%'`, and `.sc-plot` is at least 440 px).
   - `.db-main`'s minimum is now the graph alone: 48 + 1 + 440 + 2 = 491 px.
   - Side effect: the table's search, filters and ticked columns survive a Graph round trip. Before, they were lost because the grid unmounted.
5. **A4, the supplier's copy.** The plan gave only the operator's text, so the supplier reads "The Supplier Portal isn’t part of this demo yet." Both use a curly apostrophe, like the rest of `screens.ts`.
6. **A6.2:** the missing tile drops its label row, and the missing flow drops its body. Otherwise "Not available yet" would show twice.
7. **A6.1:** a small word table sits in `InfoTip.tsx`. The same list exists in `domain/gcc/s1/common.ts` (lane C's), which I didn't import into the kit.

**Blockers:** none.

**Follow-ups (not done):**
- Under View as, **My requests disappears** from the rail: its capability, `input.respond`, is a write, and `navFor(person, viewAs)` refuses writes. It is the same kind of bug as A1, but `navFor`'s `viewAs` parameter looks deliberate (plan 003), so the orchestrator decides.
- In the **collapsed rail**, a label-only stage can't reach its screens, because trees don't open in mini mode. The same was already true of a home stage with screens (the Coordinator's Stage 1).
- dashboards.md §1 Z5 says "toolbar 48 px plus 440 px". The tenders toolbar is 88 px at 1440; the doc could say the table sets the box's height and the graph fills it.
- `/dev/checks` has no error boundary, so one panel mid-edit blanks all the others (lane C noted it too).
- The number-to-word list now exists twice (`InfoTip.tsx`, `s1/common.ts`). It could move to a shared format helper.

### Lane B — Lifecycles, port and seed (executor, 2026-09-26)

**Changed files** (all within lane B's scope):
- `src/domain/gcc/lifecycle.port.ts`:
  - B1, B2: one `sightOf(tenant, l, viewer)` reads `see.margin`, `see.positions` and the quote capabilities.
    - Without `see.positions`: `winP`, `winBand`, `positionsRecorded`, `quorum` and `weightedValue` are masked, and the row's `win` is null.
    - Without `see.margin`: `estPrice` is masked with the margins.
    - The status line drops the masked parts and says what is masked, e.g. "Win probability, committee positions and margin: masked for your role" and "Estimated price and margin: masked for your role".
  - B3: re-exports `tenderCtx`, `visible` and `visibleOf` from `lifecycle.ts`.
  - B12: Stage 1 facts come from `eligibilityOf`, with a new `eligInterpretation` key. The status line reads "Eligibility 13 pass · 2 at risk · 1 interpretation · 0 fail", and "interpretation" appears only when there is one.
  - B17: the Stage 3 `pack` fact uses `staleOf`.
- `src/domain/gcc/lifecycle.ts`:
  - B3: `tenderCtx`, `visible(tenant, l, viewer)` and `visibleOf(tenant, viewer)` now live here, next to the queries.
    - Every lifecycle query takes an optional viewer: `lifecyclesOf`, `liveOf`, `closedOf`, `gateEventsIn`, `submissionsIn`, `resultsIn`, `workEventsIn` and `capturesIn`.
    - `lifecycle(tenant, id)` stays unfiltered.
  - B12: `eligibilityOf(tenant, l)` calls 007a's `eligibilityFor` for a tender with requirements, and falls back to the stored counts only for tenders without requirements.
  - B17: `staleOf(tenant, l)` gives 009a's `freshnessFor` reason, or the stored facts where 009a has no pack. `healthOf` uses both helpers.
- `src/data/gcc/lifecycle/types.ts` (B12): `S1Facts.eligibility` is optional and gains `interpretation`.
- `src/data/gcc/lifecycle/pools.ts`:
  - B4.1: `acronymOf` drops "Company" and "Co." (WCWS, CCWS, NCWS).
  - B13: `TenantPool.authoredClients`, and Najd lists WCWS.
- `src/data/gcc/lifecycle/fold.ts`, `generate.ts` (B13, B4): `issuerFor` skips `authoredClients` for bids (the number of RNG draws is unchanged), and final specs use the new `refFor`.
- `src/data/gcc/lifecycle/live/common.ts`:
  - B4.2: `authoredRef(seed, id)` takes 004's intake or addendum base reference.
  - B4.3: `refFor(issuer, id, seed?)` prefers that reference. Otherwise it generates a serial of the TID number + 17 + (hash of the acronym and year mod 283).
  - B12: `s1Derived(language, extra)` makes Stage 1 facts with no stored counts.
- `src/data/gcc/lifecycle/live/najd.ts`:
  - B6: hero documents-in is 07:33.
  - B7: T-2026-079 submitted Thu 19 Feb 09:10, opening 19 Feb, bid bond valid and required to 20 May.
  - B15: T-2026-104 replies due 10 Mar.
  - B12: the hero, T-2026-117 and T-2026-119 use `s1Derived`.
- `live/batinah.ts`: B15 (T-2026-027 replies due 12 Mar); B12 (hero).
- `live/corniche.ts`, `live/dafna.ts`, `live/qurain.ts`: B12 (heroes).
- `src/data/gcc/tenants/najd.ts`:
  - B7: T-2026-079's stage note, key dates, validity end, water-team commitment and facility label.
  - B8: T-2026-128 submission Sun 29 Mar.
  - B11: facility limit SAR 602.3 M, and a committed line for T-2025-298's SAR 2.3 M bid bond.
  - B13: T-2025-438 issued by Western Region Municipal Projects Office.
  - B14: T-2026-101 "Just below the value band".
- `tenants/qurain.ts`:
  - B9.1: hero facility reason.
  - B10.1: Qurain Meridian Arabia FY2025 audit Sun 24 May.
  - B11: limit KWD 28.56 M, and committed lines for T-2025-418 (KWD 0.32 M) and T-2025-431 (KWD 0.24 M).
- `tenants/corniche.ts`:
  - B8: T-2026-063 submission Tue 24 Mar.
  - B10.2: FY2025 audit Tue 19 May.
  - The committed lines gain their `tenderId`s (see deviation 6).
- `tenants/batinah.ts`: B9.2, the hero facility reason ("at under a tenth of headroom"). The committed lines gain their `tenderId`s.
- **New** `src/components/dashboard/columns/lifecycle.cols.tsx` (B18): 91 columns, one per fact key the port emits, headed per dashboards.md §10. Each renders as a count, %, money in the tenant's currency, date, date and time, text or Yes/No, with `<Masked />` for masked facts.
- `src/pages/gcc/dev-checks/40-lifecycle.tsx`: new rows for B1/B2 masking, B3 visibility, B4, B6, B7, B8, B11, B12, B13, B17 and B18, plus working-day submissions. They replace the old "Stage 1 for people not cleared" row.
- `src/pages/gcc/dev-checks/30-seed.tsx` (B10): the row "Bidder FY2025 audited after the hero opens".

**Verification:**
- `npm run typecheck` and `npm run build` pass on the shared tree after all five lanes. The chunk-size warning was already there.
- `/dev/checks` in headless Chrome, with a fresh profile and each tenant's Head of Tendering: every panel passes in all five tenants.
  - Najd: seed 18, lifecycles 124, Stage 1 124, Stage 2 52, Stage 3 96, formats 17, people 17.
  - Corniche 34, Dafna 32, Batinah 32 and Qurain 34 lifecycle checks, with every other panel passing.
  - Console: only the two existing React Router future-flag warnings.
- **Masking (B1, B2)** in the dev check and the browser:
  - Coordinator, Procurement, Proposal and Planning see no win, positions, quorum or weighted value on T-2026-097, and no estimated price on T-2025-322.
  - Faisal (hot) and the Bid Manager on his own tender see them.
  - `/tenders/T-2026-097`: masked for the Coordinator, shown for the Head of Tendering.
  - `/tenders/T-2025-322`: price masked for Procurement.
  - `/tenders/T-2026-121` for the Coordinator: "No tender … here."
- **Visibility (B3):** Najd Stage 1 is 12 for Faisal and 11 for Aisha, through `liveOf`, the port's rows and `visibleOf` alike. Today's captures skip T-2026-121 for people not cleared.
- **B12 eligibility** from 007a:
  - Najd hero 13 pass · 2 at risk · 1 interpretation · 0 fail.
  - T-2026-119 1 · 0 · 0 · 2, blocked with "2 lines fail".
  - Corniche and Batinah heroes 3 · 0 · 0 · 13, after lane C's C1.
  - Dafna 12 · 0 · 0 · 4; Qurain 16 · 0 · 0 · 0.
  - The dev check asserts the port equals `eligibilityFor` for every tender with requirements, and that none stores its own counts.
- **Seed:**
  - Headroom stays SAR 96.0 M and KWD 3.1 M, and the 30-seed targets are unchanged.
  - Qurain PQ-11 reads "Pass (SAR 1.35 bn)"; Corniche PQ-11 reads a single fail at SAR 1.12 bn.
  - Every 40-lifecycle window count is unchanged; DG3 → submission for T-2026-079 is 3 days.
  - No live deadline falls in an expected Eid closure; every submission is on a working day.
- **Dashboards:** they load with no errors as Najd hot, bid, coord, proc, plan, comm and prop, and as corniche.hot, qurain.coord, batinah.hot and dafna.hot.
- **gen-in:** the Bid Cockpit and legacy rail load, unchanged.
- **Reset demo:** lane B adds no `done` keys, so Reset is unaffected.
- **Greps:** no `Date.now`, `Math.random` or argument-less `new Date()` in the changed files; the only hit is a comment in `rng.ts`. No role checks were added.

**Deviations:**
1. `predictedWin` on a result is masked under `see.positions` too, because it is the win probability recorded at DG2.
2. The optional viewer goes on every lifecycle query, not just `liveOf`, `gateEventsIn` and `capturesIn`, so no count can leak through a query that was left out.
3. B12:
   - `S1Facts.eligibility` is optional, and the stored counts are removed for tenders with requirements, so they can't drift from 007a.
   - B12 and B17 are computed in `domain/gcc/lifecycle.ts`, not in the data layer. The data layer can't import 007a or 009a (`data/gcc` → lifecycle → live would be a cycle).
   - The new fact key is `eligInterpretation`.
4. B13 adds a pool field, `authoredClients`, rather than editing the folded and generated rows one by one.
5. B7: T-2026-079's validity end and bid bond move to 20 May, keeping 90 days from the new submission date.
6. B11: the existing committed lines in Corniche and Batinah gain their `tenderId`s, so the new dev-check row can match issued Stage 8 bonds to committed lines in every tenant.
7. B18: the registry file is `lifecycle.cols.tsx`, which the existing `columns/*.cols.tsx` glob picks up.

**B16, recorded:**
- Batinah Stage 1 is 3 until plan 012 adds the scanned tender.
- Corniche and Batinah have no pre-submission Stage 8 row (accepted).
- T-2026-097 has been in Stage 3 for 17 days, not 9.

**Blockers (other lanes' files; not changed):**
- **Lane A** (`src/pages/gcc/TenderSummary.tsx:100`, `src/components/dashboard/columns/base.cols.tsx:203`): when win is masked, `row.win` is null, so both show "From Stage 3" on a Stage 3 tender. That doesn't leak the number, but it misleads. They should show `<Masked />` when `facts['winP.masked']` is set.
- **Lane C** (`src/data/gcc/s1/effort.ts:24,29`): the effort windows still end T-2026-128 on 26 Mar and T-2026-063 on 22 Mar. They should end on 29 Mar and 24 Mar to match B8.
- Lane C asked for a Najd browser re-run after B10: done, and all 124 Stage 1 targets pass.

**Follow-ups (not done):**
- Docs:
  - gcc-demo-data §2.2: Najd limit SAR 600 M → 602.3 M, committed 94 M → 96.3 M.
  - gcc-demo-data §2.6: Qurain limit KWD 28 M → 28.56 M, committed 2.1 M across four bids.
  - The docs still say T-2026-079 was submitted on 22 Feb.
- Batinah's questions date, 22 Mar, falls inside the expected Oman Eid closure.
- Stage 8 `bondAmount` implies the price (bond % × price) and isn't masked. The orchestrator should decide.
- `capturesIn` filters today's intake events and screenings by viewer, but its daily history is not scoped.
- The port reads `eligibilityFor` and `freshnessFor` against the seed (`done` = {}). Demo actions reach the rows only through `withDemoState`.
- T-2025-002 "Madinah district water reservoirs" is now issued by Southern Cities Water Services Company, which doesn't match its location. A Madinah-area client in Najd's pool would fix it.

## Orchestrator review (2026-09-26): accepted

**Verified by the orchestrator:**
- `npm run typecheck` and `npm run build` pass (only the known chunk-size warning, A8).
- `/dev/checks` in all five tenants, fresh store, 0 console errors, every panel passing:

  | Tenant | Formats | People | Seed | Lifecycles | Stage 1 | Stage 2 | Stage 3 |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Najd | 17 | 17 | 18 | 124 | 124 | 52 | 96 |
  | Corniche | 17 | 17 | 4 | 34 | 71 | 9 | 16 |
  | Dafna | 17 | 17 | 3 | 32 | 71 | 9 | 4 |
  | Batinah | 17 | 17 | 2 | 32 | 71 | 13 | 4 |
  | Qurain | 17 | 17 | 6 | 34 | 71 | 13 | 18 |

- Two read-only review agents checked every item against the diff. All 66 items (A1–A9, B1–B18, C1–C11, D1–D11, E1–E16) are implemented. Every lane deviation is accepted, including A5 (a stage is kept only for a company-wide screen), A6.3 (the table sets the box's height), C9 (90 days for T-2026-029 and T-2026-049), D6 (new synthetic extension reasons) and E1 (win and positions masked with margin).
- The confidentiality scan finds nothing new: no docs outside 07, no prices or costs, and no new company or person names (every name in the diff was already in commit 447d731).

**Fixed by the orchestrator before commit** (small, cross-lane):
- **Masking:**
  - The tracker's blocker line no longer shows margin figures to people without `see.margin`: `HealthVM.maskedReason` reads "Margin below the minimum (figures masked for your role)".
  - The Stage 8 bid bond amount is masked with margin (it's a share of the bid price) in the row facts and the status line.
  - The six Stage 5 `estPrice` seeds equalled the visible tender value, so the price mask hid nothing. They now differ from the value: Najd 203.6 and 66.1, Corniche 204.8, Dafna 72.4, Batinah 11.7, Qurain 9.3.
  - `WinCell` (`columns/base.cols.tsx`), also used by `TenderSummary`, shows `Masked`, "From Stage 3" (before Stage 3) or "Recorded at DG2" (after).
- **View as keeps My requests:** `navFor(person)` no longer takes `viewAs`; the rail lists what the viewed person can open, and the pages stay read only. (Lane A follow-up.)
- **Dates:** `s1/effort.ts` ends T-2026-128 on 29 Mar and T-2026-063 on 24 Mar (B8). Batinah T-2026-042's questions date moves from 22 Mar (inside the Gulf Eid closure) to Tue 24 Mar. The kit fixture's T-2026-079 is submitted 19 Feb 09:10.
- **Story:** history row O-25-20 (T-2025-002) is now "Jazan district water reservoirs", matching its issuer, Southern Cities Water Services Company.
- **Dev checks:** one error boundary per panel (`GccPending.tsx`), so a panel mid-edit no longer blanks the page.
- **Contracts for the next wave:**
  - `domain/gcc/requestKeys.ts` (request keys shared by 019 and 013);
  - every lifecycle query and `DataPort.rows`/`.tracker` take an optional `done`, and the bound helper `queriesFor(ctx)` (for 015, 013, 019; 021 makes `done` effective).
- **Docs:** gcc-demo-data §2.2 and §2.6 (facility limits and committed lines), dashboards.md §1 Z5 (the box height rule), 009a's done-key table (E3, E4), 008a deviation 18 (superseded), 017 deviation 6 (fixed).

**Decisions:**
- **C9:** keep 009a's per-tender validity (120 days for the Najd pair, 90 for Corniche and Qurain).
- **Bid bond amount:** masked with margin (above).
- **Madinah issuer:** retitle the history row rather than add a client (above).

**Moved to plan 021** (demo state and rule fixes): `withDemoState` and seed-only caches; DG1 rounds (re-open then the same decision stayed "cleared"); the JV partner must clear the PQ; the PQ-fail discard audit text; Stage 2 writes need a live pursue; a reply due at exactly 10:00; DG2 conditions masked; `canSeePositions` required; other tenders' win in 9.4; one mask for pack versions; the radar and the dashboard agree on today's captures.

**Moved to plan 019** (Tender Workspace): `TenderSummary` printed raw fact values (it's replaced, and facts render through their column renderers); the kit's number-to-word list duplication is left as is.

**Left as is (accepted):** the collapsed rail can't reach a label-only stage's screens (polish in 016); 9.8's wording hints without figures; typed copies guarded by dev checks (the WCWS name, "2 awards from 3 bids", the HR availability strings); `capturesIn`'s daily history isn't scoped by viewer (counts only, no tenders).
