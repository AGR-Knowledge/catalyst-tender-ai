# 008b — Stage 2 screens and the Supplier Portal

Status: READY · Depends on: 008a, 019, 021 (all in `gcc-demo`) · Can run in parallel with: 007b, 009b, 011, 022, 023

## Goal
Demo script B, "Quotes without chasing" (s1-s3-demo-spec §17), runs by clicking. After DG1 Pursue, the Procurement Lead approves the **packages** (the coverage bar and the 30% cap), approves **shortlists** (screening blocks a supplier, with the reason), sends **RFQs** with only the matched BOQ lines and watches the **24-hour RFQ clock**, sees the **package board** and nudges, **levels** quotes (currency, VAT, ex-works, validity, exclusions, each change traced), picks a **best-fit mix** with an override and a reason, and opens the **Supplier Portal preview** as the supplier. It works on the hero, on the seeded Stage 2 tenders (T-2026-104 Jubail has quotes to level at seed), and on 022's and 023's tenders when they land.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Screens only, on 008a's rules.** Every value comes from `domain/gcc/s2`. No new rules. If a value is missing, show less and note it.
- **One labelled demo aid:** "Simulate supplier replies" (a `DemoTag`ged button on the RFQ tracking view) submits the scripted replies (below), because nobody replies to a demo. Plan 014's "Advance agent work" will call the same function.
- **Polish the path of script B.** Keep the dev check to about 10 rows.
- **Always pass `state.done`** to every query and memo.

## Context
- **Why:** s1-s3-demo-spec §8.1–§8.10 and §17 script B; §5 (override with a reason; the agent never issues a commitment or PO); ui-direction §6.2 (CoverageBar, ThresholdBar), §7.5 (masking), §13; kpi-and-screen-catalogue §D (screen header strips and rights); roles-and-access §9 (who sees quotes: `see.quotes`).
- **Hooks you call** (plan 021 review, file:line as of commit `5e71914`):
  - Packaging: `packagesFor`, `packagingFor` (`s2/packaging.ts:95,117`), `packagingWrite(tenderId, byId, opts…)` `:126` writes `pkg:`; `coverageBar`, `notCovered`, `packageCoverage`, `acceptedGap`, `gapWrite` (`s2/coverage.ts`); `longLeadAtRisk`; `kickoffFor` (`s2/kickoff.ts:45`, the Pursue checklist).
  - Shortlists: `rankedCandidates`, `recommendedShortlist` `s2/shortlist.ts:144`, `approvedShortlist`, `screeningOf`, `heldByScreening`, `shortlistWrite` `:191` writes `shortlist:{TID}:{pkg}`.
  - RFQs: `rfqDraft(tenant, tenderId, pkgId, done)` `s2/rfq.ts:151`, `rfqLines`, `rfqTerms`, `rfqWrite(tenant, tenderId, pkgId, supplierIds, byId, done, at?)` `:180` writes `rfq-sent:{TID}:{pkg}[:n]`; `rfqClock`, `rfqIssueLag`, `rfqsFor`, `quotesFor`.
  - Tracking: `packageBoard` `s2/tracking.ts:100`, `supplierMatrix` `:146`, `reminderPlan`, `rfqStatus`, `rfqCounts`; nudges write `K.nudged(rfqId)`.
  - Levelling: `levelQuote`, `levelledFor`, `toLevel`, `sideBySide` (`s2/levelling.ts`), and **`levelWrite(tenant, tenderId, quoteId, adjKey, state, byId, done, amount?, note?, adjustment?, at)`** `:207` (the full order, changed by plan 021) writes `lev:{quoteId}:{adj}`.
  - Best fit: `packageScores`, `mixOptions` `s2/bestfit.ts:146`, `mixFor`, `mixWrite` `:177` writes `mix:{TID}`.
  - Clarifications: `clarificationsFor`, `openClarifications`, `clarificationWrite` (`s2/clarifications.ts`).
  - Supplier Portal: `supplierRfqs(tenant, personId, done)` `s2/portal.ts:40`, `supplierView` `:79`, `supplierQuoteWrite(rfqId, input, personId, at?)` `:127` writes `sq:{rfqId}`. The supplier persona exists in every GCC tenant (`role: 'supplier'`, `data/people.ts`).
  - Reads: `pursueOf` `s2/context.ts:127`, `liveS2Tenders`, `s2TenderOf`, `boqTotal`.
  - **Scripted replies** (orchestrator contract): `src/data/gcc/s2/replies.ts`, `SCRIPTED_REPLIES` and `repliesFor(tenant, tenderId, packageId)`. You add the hero's; plans 022 and 023 add their tenders' in parallel.
  - Workspace tab contract and kit: as plan 007b lists (`pages/gcc/workspace/tabs/types.ts`; `ctx.check(cap)` for the refusal sentence; `components/tender/*`). Reserved tab: `sourcing` (70).
  - Screens map: `pages/gcc/screens.ts`, entries `/sourcing`, `/levelling`, `/suppliers`.

## Scope
**Files to create:**
- `src/pages/gcc/s2/`: `Sourcing.tsx` (packages, shortlists, RFQs and the clock, per tender; a tender picker for the Procurement Lead's live Stage 2 tenders), `Levelling.tsx`, `Suppliers.tsx`, `RfqDraft.tsx`, `PackageBoard.tsx`, `BestFit.tsx`, `simulate.ts` (the scripted-reply writer), `s2.css`, and view-model helpers in `src/pages/gcc/s2/vm/*.ts` if needed.
- `src/pages/gcc/supplier/`: `SupplierPortal.tsx` (its own light shell: the inviting company's branding, "Supplier Portal preview"), `QuoteForm.tsx`.
- `src/pages/gcc/workspace/tabs/sourcing.tab.tsx` (70).
- `src/pages/gcc/dev-checks/85-stage2-screens.tsx`.

**Files to change (only these lines):**
- `src/pages/gcc/screens.ts`: your three entries. 007b, 009b and 011 edit theirs at the same time: re-read right before editing.
- `src/App.tsx`: one route, `supplier-portal` → `SupplierPortal` (and `/` redirects there when the current person has `role === 'supplier'`). 011 adds its platform route at the same time: re-read right before editing, add lines, move nothing.
- `src/data/gcc/s2/replies.ts`: append the hero's replies to each tenant's list where the hero can be pursued (Najd, Dafna and Qurain at least), three per package for four packages, with the traps: EUR ex-works, VAT included, 60-day validity against 120 required, "excludes installation supervision", one decline with a reason.
- `src/domain/gcc/s2/rfq.ts`: `portalQuote` reads `vatInclusive` and `incoterm` from the submitted value when present (defaults unchanged). `src/domain/gcc/s2/done.ts`: those two optional fields on `SupplierQuoteValue`. Nothing else.
- `src/domain/gcc/s2/{bestfit,packaging,coverage}.ts`: the one-line `pursueOf` guard on `mixWrite`, `packagingWrite` and `gapWrite` (plan 021 4.4 missed them), so a write is refused once DG1 is re-opened.
- `src/components/tender/CoverageBar.tsx` (019's): an optional cap marker (the 30% cap), backward compatible.

**Out of scope** (stop and ask): Stage 1 and Stage 3 screens; internal inputs (009b's Inputs tab); new rules, capabilities or libraries; any PO or commitment (the UI says the agent never issues one); the Indian preview.

## Steps

### Phase 1 — Kick-off and packaging (spec §8.1–§8.2)
- [ ] 1.1 After Pursue, the Sourcing tab and `/sourcing` show the **kick-off checklist** (`kickoffFor`): packaging, shortlists, RFQs with the clock, inputs to request (links to 009b's Inputs tab when it exists; `ctx.hasTab('inputs')`).
- [ ] 1.2 **Packages:** one row per package (discipline, BOQ lines and value share, make or buy, estimated value, long-lead flag and lead time, the client's approved-vendor list, local-content relevance). The **coverage bar** with the 30% cap marker. Approve, split or merge (`packagingWrite`); the Bid Manager can comment.

### Phase 2 — Shortlists and RFQs (spec §8.3–§8.4)
- [ ] 2.1 **Shortlist per package:** the recommended list (4–6) with a reason per supplier; signals (trades, client AVL, ICV score, PQ status, screening with its date, past performance, load, location, response history); approve or override with a reason. **The guardrail:** a supplier whose screening isn't current is greyed out with the reason ("Sanctions screening match: cannot be sent an RFQ"); it can't be selected.
- [ ] 2.2 **RFQ draft:** scope extract, **only the matched BOQ lines** (no rates), drawings, technical requirements, the commercial terms (currency, price excluding VAT with VAT stated, Incoterms, validity ≥ bid validity plus margin, payment, lead time, deviations and exclusions schedule), line or package level, reply-by, clarification channel. Send (`rfqWrite`), with the audit entry.
- [ ] 2.3 **The RFQ clock:** "RFQs issued within 24 h of DG1", live, on the Sourcing desk and the tab.

### Phase 3 — Tracking, replies and clarifications (spec §8.5, §8.8)
- [ ] 3.1 **Package board** (Issued → Acknowledged → Quoted → Levelled → Buyer approved) and the **per-supplier matrix** (sent, opened, acknowledged, declined with reason, quoted, clarification open); reminders (3 days before, then daily) and escalation copy; **Nudge** (audit entry, counted); reserve suppliers for non-responders.
- [ ] 3.2 **Simulate supplier replies** (`DemoTag`, "Demo: suppliers reply now"): for the sent RFQs of this tender, submit the scripted replies through `supplierQuoteWrite` (declines as declines), stamped at their `afterMinutes`. The board and the levelling queue update at once; Reset clears them.
- [ ] 3.3 **Clarifications log:** question, package, raised by, owner, due, answer, status; "0 stale beyond SLA" is the exit rule; answer (`clarificationWrite`).

### Phase 4 — Levelling and best fit (spec §8.6–§8.7)
- [ ] 4.1 `/levelling`: quotes to level across the viewer's tenders, oldest first. For one quote: **original against levelled, side by side**, with a trace per adjustment (currency with rate and date, VAT, delivery to site, validity, exclusions with the allowance marked estimated, deviations with a non-compliant flag that stops it counting, payment terms, lead time against the programme need). Confirm or change each adjustment (`levelWrite`). Coverage: packages with ≥ 3 compliant levelled quotes.
- [ ] 4.2 **Best fit:** per-package scores (tenant weights; screening as pass/fail); the options Lowest cost · **Balanced (recommended)** · Lowest risk with total levelled cost, ICV share, risk notes and schedule fit; approve a mix, or override a package with a reason (`OverrideModal`); the audit reads "Override recorded for P-05: rank 2, … selected on delivery record". The line "The agent never issues a commitment or PO" is on the screen.
- [ ] 4.3 **Masking:** quote amounts and levelled prices are masked for viewers without `see.quotes` (`Masked` with who can see them); margin never appears here.

### Phase 5 — Suppliers, Supplier Portal, dev check
- [ ] 5.1 `/suppliers`: the supplier master (AG Grid) with trades, AVL, ICV, screening status and date, performance; filters. Plain is fine.
- [ ] 5.2 **Supplier Portal preview** ("Open as supplier (preview)" from an RFQ, or switching to the supplier persona): the inviting company's branding, the package scope, **only their BOQ lines**, reply-by, documents; submit a quote (line or package level, upload the PDF name, deviations, exclusions) through `supplierQuoteWrite`; ask a clarification. They never see other suppliers, other quotes or the tender's value. A clear "Back to {tenant}" for the presenter.
- [ ] 5.3 `85-stage2-screens.tsx`, about 10 rows: packages and coverage render for the hero after Pursue; a screened-out supplier can't be sent an RFQ; the RFQ draft holds only matched lines; simulated replies create quotes; a levelled EUR ex-works quote shows the currency and delivery adjustments; the override needs a reason; quotes masked for a viewer without `see.quotes`; the supplier view has no other supplier's data; writes refused after DG1 re-open.
- [ ] 5.4 1440 and 1280, light and dark, keyboard, no console errors.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] Script B as Joseph (Najd Procurement Lead) after a DG1 Pursue of the hero: packages approved → shortlists (Tarvessa refused with the screening reason) → RFQs sent inside the clock → simulate replies → nudge a late one → level an EUR ex-works quote and a VAT-inclusive one → gap accepted on one package → Balanced mix with an override on P-05 and its reason → Supplier Portal preview as the supplier.
- [ ] T-2026-104 (seeded Stage 2) levels without any demo action.
- [ ] View as is read only. Faisal sees everything; the Bid Manager sees his tenders; a viewer without `see.quotes` sees no amounts.
- [ ] Reset demo returns every screen to the seed.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
