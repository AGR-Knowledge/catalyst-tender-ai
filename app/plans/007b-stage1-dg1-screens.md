# 007b — Stage 1 and DG1 screens

Status: READY · Depends on: 007a, 019, 021 (all in `gcc-demo`) · Can run in parallel with: 008b, 009b, 011, 022, 023 · Plan 012 (Arabic) builds on it

## Goal
Demo script A runs end to end by clicking (s1-s3-demo-spec §17): the Coordinator's **radar** shows this morning's captures and source health; the hero's **intake steps** play out; the **intake queue** shows the two fields the agent would not accept alone, including the 1% vs 2% bond conflict with both pages; the workspace's **Requirements**, **Eligibility & fit** (Zakat and GOSI at risk, the turnover interpretation), **Key dates** (Ramadan and Eid flags) and **Queries** tabs are filled; the Bid Manager opens the **DG1 evidence pack**, sees it locked while blocking fields are open, and records **Pursue** with the team, which starts the RFQ clock. Discard (with reason codes), Hold and Re-open work too. It works for every tender with data, including the two new demo tenders (plans 022 and 023) as they land.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Screens only, on 007a's rules.** Every value comes from `domain/gcc/s1`, `domain/gcc/dg1`, the port and the lifecycle queries. No new rules. If a value is missing, show less and note it under Follow-ups.
- **Polish the path of script A** (radar → queue → requirements → eligibility → DG1). Other screens can be plainer.
- **Keep the dev check small:** about 10 rows.
- **Always pass `state.done`** (and the viewer) to every query and memo; a demo action must show on every screen at once (plan 021).

## Context
- **Why:** s1-s3-demo-spec §6.1–§6.10 and §7 (the behaviour, screen by screen), §5 (recommendation card, override with a reason, provenance, nudges, audit), §17 script A; ui-direction §5–§7 and §13 (definition of done for a screen); kpi-and-screen-catalogue §D (each screen's header strip and rights); dashboards.md §4 (action rows route to built screens).
- **Hooks you call** (plan 021 review, file:line as of commit `5e71914`):
  - DG1: `dg1PackFor(tenant, id, done)` `domain/gcc/dg1/pack.ts:88`; `validateDg1(input, pack, done)` `dg1/decision.ts:105`; `dg1Write(input, byId, pack, done)` `:177` writes `dg1:{TID}` (Pursue or Discard, with `round`) or `dg1-hold:{TID}`; `dg1Reopen(tenant, id, reason, byId, done)` `:259` writes `dg1-reopen:{TID}`; `dg1RecordFor` `dg1/record.ts:70`; `dg1Queue` `:128`. **Always pass `done`** (the defaults of `{}` check against the seed).
  - Validation: `validationAction` `s1/validation.ts:104` writes `val:{id}`; `blockingOpen` `:142`; `validationsOf`, `queueStats`.
  - Radar and intake: `radarFor(tenant, cleared, done, viewer)` `s1/intake.ts:184` (**pass `viewer`**, or the restricted capture counts); `pipelineFor`; `recogniseUpload(fileName, tenant)`; `triageFor`.
  - Eligibility and fit: `eligibilityFor(tenant, id, done, scenario?)` `s1/eligibility.ts:631`; `fitFor`, `recommendationFor` (`s1/fit.ts`); `keyDatesFor` (`s1/dates.ts`); `addendaFor`, `latestAddendumBadge` (`s1/addenda.ts`); queries (`s1/queries.ts`); bonds (`s1/bond.ts`).
  - **Documents:** `documentFor(tenant, tenderId)` in `domain/gcc/documents.ts` (orchestrator contract): the hero's booklet, the demo tenders' PDFs (022, 023) and the real samples. `isGccRecord(record)` tells you whether it has field groups and conflicts; `isArabicRecord(record)` whether every item carries its Arabic `source` (plan 012 shows it bilingually; you show the English value and a `LangBadge`).
  - The workspace tab contract: `pages/gcc/workspace/tabs/types.ts` (`WorkspaceTabDef`: `id, label, order, plan, shows(ctx), cap?, badge?(ctx), Panel`; `WorkspaceCtx`: `tenant, tenderId, row, tracker, viewer, viewAs, done, audit, now, can, check, openTab, hasTab`). Reserved ids and orders in `tabs/index.ts`. `ctx.check(cap, extra?)` returns `{ ok, reason }`: a disabled button always says why.
  - Kit (`components/tender/`): `RecommendationCard`, `OverrideModal`, `ReasonCodePicker`, `SourceChip` + `SourceHost` (a page outside the workspace mounts its own `<SourceHost>`), `Callout`, `Sheet` (triage), `EligibilityLine`, `ThresholdBar`, `RequestButton`, `AuditEntry`, `LangBadge`, `Tabs`, plus 006's `Money`, `When`, `Masked`, `StatusPill`, `GateChip`, `SlaClock`, `Tip`, `EmptyState`, `DemoTag`. AG Grid (`components/dashboard/grid/TenderGrid.tsx` patterns) for any table over five rows.
  - Screens map: `pages/gcc/screens.ts`. Flip `built: true` and add `page` for `/radar`, `/intake-queue`, `/screening`, `/dg1`, `/calendar`. `App.tsx` makes the routes from the map; action rows then route to `/{screen}?tender={TID}` automatically.
  - Audit: write through the store's `audit` action (with `target: tenderId`); the workspace timeline reads it.

## Scope
**Files to create:**
- `src/pages/gcc/s1/`: `Radar.tsx`, `IntakeQueue.tsx`, `Screening.tsx` (with the triage `Sheet`), `Dg1.tsx` (queue and the evidence pack with the decision form), `Calendar.tsx`, `IntakeSteps.tsx`, `UploadGcc.tsx`, `s1.css`, and view-model helpers in `src/pages/gcc/s1/vm/*.ts` if a screen needs to shape data (no rules there).
- `src/pages/gcc/workspace/tabs/`: `documents.tab.tsx` (20), `requirements.tab.tsx` (30), `eligibility.tab.tsx` (40), `dates.tab.tsx` (50), `queries.tab.tsx` (60).
- `src/pages/gcc/dev-checks/75-stage1-screens.tsx`.

**Files to change (only these lines):**
- `src/pages/gcc/screens.ts`: your five entries (`built`, `page`). 008b, 009b and 011 edit their own entries at the same time: re-read right before editing.
- `src/components/layout/Header.tsx`: render `<UploadGcc />` for GCC tenants where `{!gcc && <UploadButton />}` sits. One line.
- `src/domain/gcc/workspace/rail.ts` (019's): when a DG1 record **overrides** the recommendation, keep the recommendation card visible beside the decision (spec §5.2: both stay visible). Nothing else in that file.
- `src/components/tender/SourceChip.tsx` (019's): accept a `doc` per source, so an `addendum` chip opens the addendum's file rather than the booklet; and `EligibilityLine.tsx`: highlight `termsOf(line.text)` instead of the whole requirement text. Backward compatible.
- Bug fixes in `domain/gcc/s1/**` or `dg1/**` **only** if a screen can't work without one; one line each, listed in the report. Plans 022 and 023 add data in parallel; don't edit `data/**`.

**Out of scope** (stop and ask): Stage 2 or 3 screens; Arabic display (`BilingualValue`, "Read in English": plan 012); Administration (fit model, sources: plan 010); new rules, roles, capabilities or libraries; the Indian preview.

## Steps

### Phase 1 — Radar and intake (spec §6.1–§6.2)
- [ ] 1.1 `/radar` for the Coordinator (and the Head of Tendering): the connectors panel (status, mode, last poll, new today, login needed; assisted mode says the platform never solves CAPTCHAs); today's captures (AG Grid: time, source, reference, title, authority, country, value in the tenant currency, due, language, document type, fit, disposition; filters); the reconciliation card; the restricted lane as a **count only** for people not cleared. Header strip: INT-1, INT-4, INT-3, INT-9, INT-8 (reuse the KPI registry through the dashboard kit's tile component, not new computations).
- [ ] 1.2 `IntakeSteps`: the nine-step list for one document (received → classified → sensitivity → language → OCR when scanned → fields → register check → screened → logged), timed, with intake-to-logged against the 15-minute target. Shown on the radar row's sheet and on the Documents tab.
- [ ] 1.3 `UploadGcc`: upload a file; `recogniseUpload(name, tenant)` matches the hero booklet (and 022/023's PDFs once registered) and opens that tender; an unknown file stops after the page read and lands in the Coordinator queue, as the legacy upload does; a re-upload is flagged as a duplicate. Labelled as the demo's recognition, never as live extraction.

### Phase 2 — Intake queue (spec §6.3)
- [ ] 2.1 `/intake-queue`: items grouped by tender, blocking DG1 first; each shows the field, value, confidence and why it's low, the source snippet with a page chip, and **Accept · Correct · Mark not stated · Send back to agent**. Send back keeps the item open (the legacy bug must not come back). Header: open fields, oldest age, auto-accept rate.
- [ ] 2.2 **The conflict pattern:** two values, each with its page chip; the agent refuses to choose; the Coordinator picks one and may draft a query (§6.10). The hero's 1% (p. 12) vs 2% (p. 35) is the showcase: polish it.

### Phase 3 — Workspace tabs (spec §6.4–§6.8, §6.10)
- [ ] 3.1 **Documents** (20): the document from `documentFor` (file, pages, language badge, scanned flag, received from which sources), the intake steps, addenda with their diff (dates, BOQ lines, clauses changed) and the "pack stale" effect; duplicates resolved to one TID list both sources.
- [ ] 3.2 **Requirements** (30): the field groups (identity, commercial, guarantees, time, evaluation, submission, risk) with value, confidence, page chip and note; the flags with severity. Records without groups (the real samples) show their flat lists.
- [ ] 3.3 **Eligibility & fit** (40): one `EligibilityLine` per PQ requirement (pass, at risk, interpretation, fail, not stated) with evidence and dates checked **against bid opening**; the roll-up sentence; the **JV scenario** toggle (partner list; re-runs the check); actions **Request renewal** (writes a request through `RequestButton`, so the owner sees it in My requests), **Draft query**, **Add evidence** (demo: a toast). The fit breakdown (score, verdict, confidence, strengths, concerns, what would sharpen it, comparable past bids), collapsed by default.
- [ ] 3.4 **Key dates** (50): typed dates with local time, days and working days remaining, and the calendar flags (Ramadan hours, Eid closure, bond validity with bank lead time). Use `countdownText` wherever a countdown shows, so the header and the tab agree.
- [ ] 3.5 **Queries** (60): drafts with clause and page; edit, approve and "send" (demo: marked sent via the portal; audit entry); the countdown to the clarification deadline.
- [ ] 3.6 Each tab's `shows(ctx)` is false where it has nothing (spec §2.1: never an empty tab).

### Phase 4 — Screening and DG1 (spec §6.9, §7)
- [ ] 4.1 `/screening`: tenders awaiting DG1 with eligibility and fit; the **triage** sheet for tenders that landed together (fit, value, effort, bond, cumulative team load and facility use; "Pursuing all three would use 112% of the Water team's bid capacity in March"; no ranking of people's priorities).
- [ ] 4.2 `/dg1` and `/dg1?tender=T`: the DG1 queue with SLA clocks, and the **evidence pack** (spec §7 items 1–8: recommendation card, tender at a glance with preparation time, eligibility roll-up expanded, fit collapsed, capacity, bond against facility headroom with Finance's timestamp, comparables, open validations and queries).
- [ ] 4.3 **The lock:** while a field marked "blocks DG1" is open, the form is disabled with "2 fields still being validated by Aisha Al-Qahtani" and a **Nudge** button (audit entry, toast).
- [ ] 4.4 **The decision form:** Pursue (team pre-filled from sector defaults; prime or JV with the partner; milestones; note required when overriding a Discard recommendation) → effects list before confirming (stage moves, team notified, RFQ clock started); Discard (reason codes required, `ReasonCodePicker`); Hold (who, what, by when; the SLA keeps running). Validation messages from `validateDg1`. The recorder is the assigned Bid Manager, or the Head of Tendering as a recorded delegate with a reason (`can()` says which).
- [ ] 4.5 **Re-open** (with a reason) only on decisions recorded in the demo (`dg1RecordFor(...).source === 'demo'`); seed decisions show as recorded history.
- [ ] 4.6 After Pursue, the hero reads "2 · Sourcing · Packaging" on the dashboards, the tracker and the workspace at once, and Reset returns it to Stage 1.

### Phase 5 — Calendar, dev check, polish
- [ ] 5.1 `/calendar`: an agenda of the next four weeks across the viewer's tenders (key dates and gate SLAs), grouped by week, in the authority's time zone, with the calendar flags. Plain is fine.
- [ ] 5.2 `75-stage1-screens.tsx`, about 10 rows: each built screen renders for its roles; the hero's queue has 2 items, one blocking; DG1 is locked until they're resolved; Pursue moves the hero to Stage 2; Discard needs a reason; Re-open is offered only on a demo decision; tabs absent where empty.
- [ ] 5.3 1440 and 1280, light and dark, keyboard (tab order, Esc closes sheets and viewers), no console errors.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] Script A as Aisha (Coordinator) then Omar (Bid Manager) in Najd: radar → hero → queue (resolve the conflict, pick 1%, draft the query) → Requirements → Eligibility (Zakat and GOSI at risk, the turnover interpretation, Request renewal reaches Sultan's My requests) → Key dates (Ramadan and Eid flags) → DG1 locked, then unlocked → Pursue with team → RFQ clock on Joseph's Stage 2 dashboard.
- [ ] In Corniche and Batinah the hero reads Recommend discard, and Discard records reason codes; in Dafna the JV scenario clears the four failing lines; in Qurain, Hold asks Finance.
- [ ] View as is read only everywhere (buttons disabled with the reason). Joseph (Procurement Lead) can't open DG1 and sees no margin. Aisha doesn't see T-2026-121.
- [ ] Reset demo returns every screen to the seed.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
