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
- [x] 1.1 After Pursue, the Sourcing tab and `/sourcing` show the **kick-off checklist** (`kickoffFor`): packaging, shortlists, RFQs with the clock, inputs to request (links to 009b's Inputs tab when it exists; `ctx.hasTab('inputs')`).
- [x] 1.2 **Packages:** one row per package (discipline, BOQ lines and value share, make or buy, estimated value, long-lead flag and lead time, the client's approved-vendor list, local-content relevance). The **coverage bar** with the 30% cap marker. Approve, split or merge (`packagingWrite`); the Bid Manager can comment.

### Phase 2 — Shortlists and RFQs (spec §8.3–§8.4)
- [x] 2.1 **Shortlist per package:** the recommended list (4–6) with a reason per supplier; signals (trades, client AVL, ICV score, PQ status, screening with its date, past performance, load, location, response history); approve or override with a reason. **The guardrail:** a supplier whose screening isn't current is greyed out with the reason ("Sanctions screening match: cannot be sent an RFQ"); it can't be selected.
- [x] 2.2 **RFQ draft:** scope extract, **only the matched BOQ lines** (no rates), drawings, technical requirements, the commercial terms (currency, price excluding VAT with VAT stated, Incoterms, validity ≥ bid validity plus margin, payment, lead time, deviations and exclusions schedule), line or package level, reply-by, clarification channel. Send (`rfqWrite`), with the audit entry.
- [x] 2.3 **The RFQ clock:** "RFQs issued within 24 h of DG1", live, on the Sourcing desk and the tab.

### Phase 3 — Tracking, replies and clarifications (spec §8.5, §8.8)
- [x] 3.1 **Package board** (Issued → Acknowledged → Quoted → Levelled → Buyer approved) and the **per-supplier matrix** (sent, opened, acknowledged, declined with reason, quoted, clarification open); reminders (3 days before, then daily) and escalation copy; **Nudge** (audit entry, counted); reserve suppliers for non-responders.
- [x] 3.2 **Simulate supplier replies** (`DemoTag`, "Demo: suppliers reply now"): for the sent RFQs of this tender, submit the scripted replies through `supplierQuoteWrite` (declines as declines), stamped at their `afterMinutes`. The board and the levelling queue update at once; Reset clears them.
- [x] 3.3 **Clarifications log:** question, package, raised by, owner, due, answer, status; "0 stale beyond SLA" is the exit rule; answer (`clarificationWrite`).

### Phase 4 — Levelling and best fit (spec §8.6–§8.7)
- [x] 4.1 `/levelling`: quotes to level across the viewer's tenders, oldest first. For one quote: **original against levelled, side by side**, with a trace per adjustment (currency with rate and date, VAT, delivery to site, validity, exclusions with the allowance marked estimated, deviations with a non-compliant flag that stops it counting, payment terms, lead time against the programme need). Confirm or change each adjustment (`levelWrite`). Coverage: packages with ≥ 3 compliant levelled quotes.
- [x] 4.2 **Best fit:** per-package scores (tenant weights; screening as pass/fail); the options Lowest cost · **Balanced (recommended)** · Lowest risk with total levelled cost, ICV share, risk notes and schedule fit; approve a mix, or override a package with a reason (`OverrideModal`); the audit reads "Override recorded for P-05: rank 2, … selected on delivery record". The line "The agent never issues a commitment or PO" is on the screen.
- [x] 4.3 **Masking:** quote amounts and levelled prices are masked for viewers without `see.quotes` (`Masked` with who can see them); margin never appears here.

### Phase 5 — Suppliers, Supplier Portal, dev check
- [x] 5.1 `/suppliers`: the supplier master (AG Grid) with trades, AVL, ICV, screening status and date, performance; filters. Plain is fine.
- [x] 5.2 **Supplier Portal preview** ("Open as supplier (preview)" from an RFQ, or switching to the supplier persona): the inviting company's branding, the package scope, **only their BOQ lines**, reply-by, documents; submit a quote (line or package level, upload the PDF name, deviations, exclusions) through `supplierQuoteWrite`; ask a clarification. They never see other suppliers, other quotes or the tender's value. A clear "Back to {tenant}" for the presenter.
- [x] 5.3 `85-stage2-screens.tsx`, about 10 rows: packages and coverage render for the hero after Pursue; a screened-out supplier can't be sent an RFQ; the RFQ draft holds only matched lines; simulated replies create quotes; a levelled EUR ex-works quote shows the currency and delivery adjustments; the override needs a reason; quotes masked for a viewer without `see.quotes`; the supplier view has no other supplier's data; writes refused after DG1 re-open.
- [x] 5.4 1440 and 1280, light and dark, keyboard, no console errors.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] Script B as Joseph (Najd Procurement Lead) after a DG1 Pursue of the hero: packages approved → shortlists (Tarvessa refused with the screening reason) → RFQs sent inside the clock → simulate replies → nudge a late one → level an EUR ex-works quote and a VAT-inclusive one → gap accepted on one package → Balanced mix with an override on P-05 and its reason → Supplier Portal preview as the supplier.
- [x] T-2026-104 (seeded Stage 2) levels without any demo action.
- [x] View as is read only. Faisal sees everything; the Bid Manager sees his tenders; a viewer without `see.quotes` sees no amounts.
- [x] Reset demo returns every screen to the seed.

## Execution report
(Filled in by the executor, 2026-09-26.)
- **Changed files:**
  - Created: `pages/gcc/s2/`:
    - `Sourcing.tsx` (the desk, tender picker and KPI strip);
    - `Packages.tsx`, `Shortlists.tsx`, `RfqDraft.tsx`, `PackageBoard.tsx`, `Clarifications.tsx`;
    - `Levelling.tsx`, `LevelQuote.tsx`, `Coverage.tsx`, `BestFit.tsx`, `Suppliers.tsx`;
    - `S2Grid.tsx` (the AG Grid wrapper), `ui.tsx` (small shared pieces), `portalLink.ts`, `simulate.ts`, `vm/desk.ts`, `s2.css`.
  - Created: `pages/gcc/supplier/SupplierPortal.tsx`, `QuoteForm.tsx`, `portal.css`; `workspace/tabs/sourcing.tab.tsx`; `dev-checks/85-stage2-screens.tsx`.
  - Changed:
    - `screens.ts`: three entries built;
    - `App.tsx`: the `supplier-portal` route outside the shell, and `/` redirects a person holding `portal.rfq` there;
    - `data/gcc/s2/replies.ts`: the hero's replies for Najd (13), Dafna (10) and Qurain (12); Corniche and Batinah stay empty;
    - `domain/gcc/s2/done.ts` and `rfq.ts`: `vatInclusive` and `incoterm`, plus `declined` (see Deviations);
    - `portal.ts`: the decline's audit line;
    - the three pursue guards in `bestfit.ts`, `packaging.ts` and `coverage.ts`: an optional trailing `guard` argument on `packagingWrite` and `gapWrite`, so existing callers are unchanged;
    - `CoverageBar.tsx` and `tender.css`: an optional `marker` prop.
- **Verification:**
  - Checks:
    - `npm run typecheck` is clean for the whole app, and `npm run build` passes; the chunk-size warning was there before.
    - `/dev/checks` shows 008b's 11 rows passing in all five tenants. The other panels (019, 011, 007b, 009b, 009a) pass there too.
  - Script B was clicked through in a headless browser on port 5182, as Joseph Mathew (`najd.proc`), after a DG1 Pursue of the hero. 007b's `/dg1` was not built, so the Pursue was seeded into `ctai.demo.v2` with `dg1Write`.
    - packages approved;
    - P-08 has Tarvessa greyed with "Sanctions screening match: cannot be sent an RFQ", and its checkbox is disabled;
    - all 11 shortlists approved; all 11 RFQs sent (the clock reads "all 11 packages issued");
    - "Demo: suppliers reply now" brings 11 quotes and 2 declines, and P-05 is covered on arrival;
    - Gulf Process on P-02 nudged (counted, audited, and a second nudge refused);
    - Tamarisk's VAT confirmed, and Rhein Aqua's currency, delivery and exclusion adjustments confirmed;
    - the gap on P-03 accepted with reason codes;
    - Balanced mix with the P-05 override (Khuzama, delivery record). The audit reads "Override recorded for P-05: rank 2, Khuzama Air Treatment, selected on delivery record.";
    - "Open as supplier (preview)" opens the portal as Ahmed Saleh. It shows no other supplier's names, estimates or rates. The quote was sent with the sample file, then "Back to Najd": the quote is in the levelling queue.
  - Other checks in the browser:
    - T-2026-104 levels at seed (5 to level, 7 of 11 covered), and one of its clarifications was answered;
    - the Bid Manager and the CEO see "Masked for your role" on every amount, and no enabled action;
    - View as Joseph (from Faisal) disables every action with the sentence;
    - the workspace Sourcing tab (badge 2/11); `/suppliers` (search, filters, detail);
    - Reset this company and Reset all companies return to seed: no keys, the hero is not being sourced, no Sourcing tab.
  - Also: 1440 and 1280, light and dark, with no horizontal overflow; keyboard (sections, lists, grid arrows with Enter and Esc, modal focus and Esc). No console errors or warnings on any of it, only React Router's future-flag notices.
- **Deviations from plan:**
  - A decline needed a record. `SupplierQuoteValue` gained an optional `declined` (the reason), and `rfqsFor`/`quotesFor` treat it as a decline, not a quote. The step names only `vatInclusive` and `incoterm`.
  - `packagingWrite` and `gapWrite` take the guard as an optional last argument (`{ tenant, done }`), because neither had `tenant` or `done`. `mixWrite` has them, so its guard is the one line.
  - Masking: without `see.quotes`, every quote amount is masked, including levelled totals and mix totals. The Bid Manager (`see.quotes.summary`) and the CEO keep counts, states, ranks, scores and picks. The catalogue's "levelled summaries" could mean more than that: see Blockers.
  - Plain tables, not AG Grid, for document-like views: the RFQ's BOQ extract, the side-by-side, the package comparison and the mix. AG Grid is used for the RFQ matrix and the supplier master.
  - The Bid Manager's package comments are audit entries ("Packaging comment"), not a thread.
- **Blockers / questions:**
  - The supplier's "Ask a question" in the portal is shown disabled with a sentence: there is no domain write for a supplier-raised clarification. Add one in 008a's rules, or keep it read-only for the demo?
  - Should `see.quotes.summary` (the Bid Manager) show levelled totals per package and the mix total, keeping only suppliers' original prices masked?
- **Follow-ups noticed (not done):**
  - `domain/gcc/s2/kickoff.ts`: the fixed demo clock makes the RFQ step read "11 of 11 packages issued, 0 m after DG1". Something like "within the hour of DG1" would read better (008a or 016).
  - Simulated replies are stamped `sentAt + afterMinutes`, so they land after the fixed 10:00 "now" (for example "received 10:26"). 014's presenter clock could move "now" past them.
  - 019's audit timeline filters `target === tenderId`, so Stage 2 entries targeted at RFQ, quote or package ids don't appear in the workspace's Decisions & audit tab. The Sourcing desk's own activity card shows them.
  - The side-by-side's "Received" row has an empty Levelled cell (from `sideBySide`).
