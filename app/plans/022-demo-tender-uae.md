# 022 — Second demo tender: Abu Dhabi hospital MEP (English, UAE)

Status: READY · Depends on: 017, 007a, 008a, 009a, 019, 021 (all in `gcc-demo`) · Can run in parallel with: 007b, 008b, 009b, 011, 023

## Goal
A presenter can run demo scripts A–C (s1-s3-demo-spec §17) on a **second GCC tender** as well as the hero: **T-2026-061, the Abu Dhabi hospital MEP package, in Corniche Lattice MEP (UAE)**. It has its own synthetic tender document (a PDF whose pages the platform cites), its own extraction catches, its own eligibility answer against Corniche's vault, its own packages, quotes and bid pack. Corniche discards the hero; this gives Corniche a Pursue story, and a UAE prospect a UAE tender.

The user asked (2026-09-26) for at least three demo tenders, all from the GCC, one in Arabic: the hero (KSA, English), this one (UAE, English) and plan 023's (Oman, Arabic).

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Data only.** No new rules, no new screens, no domain edits. The Stage 1–3 rules (007a, 008a, 009a) are data-driven per tender: give this tender the same kinds of records other tenders already have, and the screens that 007b, 008b and 009b are building in parallel pick it up.
- **Depth where the demo looks:** the document, the extracted fields with pages, two conflicts, the eligibility lines, the recommendation, 6–7 packages with quotes on two of them, and a Stage 3 pack. No more.
- **The document is short:** about 20 A4 pages, not the hero's 48.
- **Keep the dev check small:** add about 8 rows to an existing panel's Corniche section, or one small panel.
- **Najd's readings must not move.** This tender lives in Corniche only. Corniche's readings may change; update Corniche's targets where they are set.

## Context
- **Why:** gcc-demo-data §2.3 (Corniche), §4 (how the hero is built: follow the same pattern at smaller size), s1-s3-demo-spec §6–§10 and §17.
- **The row already exists:** `src/data/gcc/tenants/corniche.ts` (`id: 'T-2026-061'`, AED 185 M estimate, band 165–205 M, submission Tue 21 Apr 2026 14:00, Stage 1 "Validated; waiting for DG1", Bid Manager `corniche.bid`). Its lifecycle story is in `src/data/gcc/lifecycle/live/corniche.ts` (`K.story('T-2026-061', …)`, step `awaiting-dg1`, `s1(6, 0, 0, 'EN', …)`). **Keep the ID, value, band, submission date and owner.** You may change the Stage 1 step and facts (see 3.1).
- **Patterns to copy, read these real files first:**
  - the hero: `src/data/gcc/hero.ts` (`HERO_EXTRACTED` of type `ExtractedTenderGcc`, `HERO_REQUIREMENTS`, `heroConflicts`, `HERO_KEY_DATES`);
  - another tender's Stage 1 data: Najd's `T117_REQUIREMENTS` / `T119_REQUIREMENTS` in `src/data/gcc/tenants/najd.ts`;
  - Stage 2 for a non-hero tender: `CORNICHE_T044` in `src/data/gcc/s2/tenders/others.ts`, and `src/data/gcc/s2/suppliers/corniche.ts`;
  - Stage 3 for a non-hero tender: `T-2026-029` in `src/data/gcc/s3/{packs,inputs,win}.ts`, `competitors.ts`;
  - the queries: `src/data/gcc/s1/queries.ts`; bonds `s1/bonds.ts`; effort `s1/effort.ts`;
  - the booklet generator: `scripts/hero-itt/` (read its README: fonts, page-fill measuring, the headless Chrome trap).
- **The document contract (orchestrator, 2026-09-26):** `src/domain/gcc/documents.ts`, `documentFor(tenant, tenderId)`. It resolves a register row's `docKey` to a record in `GCC_EXTRACTED` and a file in `GCC_DOC_FILES` (`src/data/extracted/gcc/index.ts`). **Register your document there and nowhere else.** 007b's Documents and Requirements tabs read it through `documentFor`. Use the `ExtractedTenderGcc` shape (groups and conflicts), like the hero, so the Requirements tab shows the field groups.

## The tender (facts; the booklet and the seed both follow these)
Everything is fictional except public regulators and programmes named generically. No real company is named or scored.

| Field | Value |
| --- | --- |
| TID | T-2026-061 (Corniche only) |
| Title | MEP works package for the 220-bed Crescent Bay Specialist Hospital, Abu Dhabi |
| Short title | Abu Dhabi hospital MEP (keep) |
| Issuer | Crescent Bay Health Holding (fictional, keep), acting through its project manager |
| Reference | CBHH/PRJ/2026/011 |
| Portal | The Abu Dhabi government procurement portal (keep the row's `sourceDetail`) |
| Procurement | Open tender, single envelope with separate technical and commercial volumes |
| Contract | Measured MEP package contract (FIDIC 2017-style conditions, amended); the main civil contractor is separate; MEP contractor gives interface and commissioning support |
| Duration | 26 months, then 24 months defects liability |
| Estimate | Not published. Platform estimate **AED 185 M** (band 165–205 M) from the BOQ summary × Corniche benchmark rates (keep the row's value) |
| Language | English. The conditions say **English governs**; there is no "Arabic prevails" clause. (The platform must not raise the M-8 flag here: that proves the flag is read, not assumed.) |
| Documents | Vol. 1 Instructions and conditions (the PDF, about 20 pp) · Vol. 2 BOQ summary (a CSV extract, no prices) · Vol. 3 drawings list (a page in the PDF) |

**Key dates** (Gulf Standard Time; UAE weekend Sat–Sun; Eid al-Fitr closure expected 20–23 Mar, as the calendar already has it):
- Published Sun 8 Mar 2026 (keep);
- Site visit Wed 11 Mar 2026, 10:00, hospital site gate (optional);
- Questions deadline Thu 19 Mar 2026 (keep);
- Answers: "issued as a circular" with **no date** (flaw 3);
- Submission **Tue 21 Apr 2026, 14:00** (keep);
- Bid validity 120 days from submission → Wed 19 Aug 2026.

**Commercial terms:**
- Tender bond **AED 2,000,000 (fixed)**, an unconditional bank guarantee from a UAE bank. Validity: **120 days** in the instructions (clause 12.2) but **150 days** in the Form of Tender Bond (Annex C). That is conflict 1 (blocking DG1).
- Performance bond 10%; advance payment up to 10% against an equal guarantee; retention 10%, half released at taking-over.
- Delay damages 0.1% of the contract price per day, capped at 10%.
- Payment within 60 days of certification. Prices in AED; 5% UAE VAT shown separately.
- In-Country Value (ICV): a valid ICV certificate is required; the ICV score carries **25% of the commercial evaluation** (an assumption, mark it [A] in the doc).

**Deliberate catches (the extraction must find them):**
1. Tender bond validity 120 vs 150 days (clause 12.2, p. ~6, vs Annex C, p. ~18): **blocking** validation item; a query is drafted.
2. Chiller plant: **3 × 1,500 TR** in the scope (p. ~9) vs **3 × 1,750 TR** in the equipment schedule (p. ~14): non-blocking validation item; a query is drafted.
3. Answers to questions have no date: the field reads "Not stated", with a flag.
4. Medical gas pipeline systems must be installed by an installer certified to the stated medical-gas standard. Corniche has no certified installer in-house: the eligibility line is "met through a named specialist subcontractor" (at risk until one is named).
5. "Chamber of commerce membership" without saying which emirate. Corniche holds Dubai Chamber only: an **interpretation** line, and a query.

**Eligibility lines against Corniche's vault** (about 10). Build them so the result is: **8 met · 1 at risk (medical gas) · 1 interpretation (chamber) · 0 fail → eligible**. Lines: trade licence; Abu Dhabi contractor classification (MEP, first grade); chamber membership (interpretation); Civil Defence approved fire and life safety contractor; ICV certificate valid at submission; ISO 9001/14001/45001; at least two hospital or healthcare MEP projects of AED 100 M or more completed in the last 7 years (add up to two synthetic projects to Corniche's `SimilarProject`s if the seed lacks them); average turnover over three years of AED 400 M or more; medical gas installer (at risk); key personnel (a project manager with 15 years, 10 in healthcare). Where a line doesn't come out as intended, **change the requirement, not the vault** (the vault feeds other tenders' readings), except the added projects.

**Fit and recommendation:** Corniche's fit model (gcc-demo-data §2.1; Pursue at 65, conditions from 45). Target weighted fit **about 74**, verdict **Pursue**, with "What would change it": name the medical-gas subcontractor; confirm the chamber reading. Keep the row's nine fit reasons unless they contradict the facts above.

**Stage 2** (demo path after DG1 Pursue): 7 packages built from the BOQ summary, values summing to the BOQ total, in AED:
- Chillers and cooling towers (long lead, 30 weeks; the quote comes in EUR, ex-works);
- Air handling units and fan coil units;
- Medical gas pipeline system (specialist; mandatory approved list);
- LV switchgear, standby generators and UPS;
- Fire fighting and fire alarm (Civil Defence approved list only);
- Plumbing, drainage and water treatment;
- ELV, BMS and nurse call (in-house design, supply only).

Shortlists from Corniche's supplier master (add fictional suppliers only where a package has fewer than three). Seed **no RFQs and no quotes**: the demo sends the RFQs, and the replies arrive through **scripted replies** (`src/data/gcc/s2/replies.ts`, an orchestrator contract; plan 008b's labelled "Simulate supplier replies" control submits them through the Supplier Portal write). Add three replies each for two packages (chillers, AHUs) to Corniche's list, with the levelling traps: one EUR ex-works (`incoterm: 'EXW'`), one with VAT included (`vatInclusive: true`), one with a 30-day validity, and one exclusion.

**Stage 3** (after the demo's Stage 2): a pack with win probability **52 ± 9**, three fictional competitors (UAE MEP contractors; names never real), a margin range, facility headroom after the bond, the Buildings MEP team's load, and contributor inputs from Corniche's Commercial Manager, Planning Manager and Finance. The committee (above the AED 40 M referral threshold) votes; the demo outcome is **Bid**.

## Scope
**Files to create:**
- `app/scripts/demo-itt/cbhh-011/` (`content.mjs`, `build.mjs`, `verify.mjs`, `README.md`). Import the hero's `template.mjs` and helpers from `../../hero-itt/` read-only, or copy what you need; don't edit `scripts/hero-itt/`.
- `app/public/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf` and `CBHH-PRJ-2026-011-BOQ.csv` (no prices).
- `app/src/data/extracted/gcc/cbhh-011.ts`: the extraction record (`ExtractedTenderGcc`).
- New data files as needed, named for the tender, e.g. `app/src/data/gcc/s2/tenders/corniche-061.ts`.

**Files to change:**
- `app/package.json`: one script line, `"demo-itt:cbhh": "node scripts/demo-itt/cbhh-011/build.mjs && node scripts/demo-itt/cbhh-011/verify.mjs"`. No dependencies.
- `app/src/data/extracted/gcc/index.ts`: one entry each in `GCC_EXTRACTED` and `GCC_DOC_FILES` (plan 023 adds its own lines; re-read the file right before editing).
- `app/src/data/gcc/tenants/corniche.ts`: the T-2026-061 row only (`docKey`, `requirements`, `validations`, key dates, fit reasons if needed), plus up to two `SimilarProject`s and any fictional partner or supplier the facts need.
- `app/src/data/gcc/lifecycle/live/corniche.ts`: the T-2026-061 story only (step, facts, `documentHref` via `sourceOf`).
- `app/src/data/gcc/s2/replies.ts`: append Corniche's T-2026-061 replies to `SCRIPTED_REPLIES.corniche`.
- `app/src/data/gcc/s1/{queries,bonds,effort}.ts`, `s2/tenders/*` index or `others.ts` export list, `s2/suppliers/corniche.ts`, `s3/{packs,inputs,win,competitors}.ts`: **append** Corniche T-2026-061 entries only. Plan 023 appends Batinah entries to the same files at the same time: re-read each file right before editing, and never reorder or reformat other entries.
- Dev-check target constants for **Corniche** in existing panels (`40-lifecycle`, `50-portfolio`, `60-stages`, `70-stage1`, `80-stage2`, `90-stage3`) where your data moves a Corniche reading. Change the number and add a one-line comment "plan 022". Touch no other tenant's targets.
- `docs/07-product-design/agr-product-definition/gcc-demo-data.md`: add **§4A "Second demo tender: Abu Dhabi hospital MEP (Corniche)"** with the facts table, key dates, catches, expected eligibility, packages and the **page map as built** (the page of every cited value). Also add one row to §9's table noting it. Keep it under about 80 lines.

**Out of scope** (stop and ask): any file under `src/domain/`, `src/pages/`, `src/components/`; Najd, Dafna, Batinah or Qurain data; the hero's data; new `done` keys; new libraries; changing a signature. If a rule turns out to be hero-only and blocks this tender (for example Stage 2 line-level RFQs), don't edit the rule: write it under Blockers with the file and line, give this tender the package-level data that the rule does support, and carry on.

## Steps

### Phase 1 — The tender document
- [ ] 1.1 Write `content.mjs`: about 20 pages, English, A4, in the order of a UAE government ITT: cover; invitation; instructions to tenderers (bond, validity, questions, submission, evaluation with the ICV weight); conditions of contract, particular conditions (bonds, damages, payment, retention, **English governs**); scope of MEP works (chiller plant 3 × 1,500 TR); equipment schedule (3 × 1,750 TR); medical gas section; qualification requirements (the ~10 lines above); BOQ summary by package (quantities and units, **no prices**); drawings list; Annex C Form of Tender Bond (150 days); Form of Tender.
  - [ ] 1.1.1 Every page carries the watermark "Synthetic document for demonstration" and a header with the reference.
  - [ ] 1.1.2 `ANCHORS`: each cited value, verbatim, with its page. `EXCLUSIVE`: each side of the two conflicts appears on one page only.
- [ ] 1.2 Build and verify (`npm --prefix app run demo-itt:cbhh`): exact page count, every anchor on its page, no prices, the watermark on every page. Render the cover and the two conflict pages to PNG in `.out/` and look at them.
- [ ] 1.3 Write the BOQ CSV (`item,package,description,unit,qty`), about 40 representative lines across the 7 packages.

### Phase 2 — Stage 1 data
- [ ] 2.1 The extraction record `cbhh-011.ts` (`ExtractedTenderGcc`): identity, commercial, guarantees, time, evaluation, submission and risk groups, each field with its page and confidence; the two conflicts as `ValidationItem`s (conflict 1 `blocksDg1: true`); the flags (no answer date; ICV weight; medical gas). `fileNames` holds the PDF's name. Register it in `index.ts`.
- [ ] 2.2 The register row: `docKey: 'cbhh-011'`, `requirements` (the ~10 lines, each with its page), `validations`, key dates (add site visit, answers "not stated", validity).
- [ ] 2.3 The lifecycle story: the tender now sits at Stage 1, step **validating**, with the two validation items open, captured 07:40 and logged 07:52 as today; `documentHref` points to the PDF. Update the Corniche targets this moves.
- [ ] 2.4 Queries: three drafted (bond validity; chiller capacity; chamber emirate), plus bond and effort records like the hero's.
- [ ] 2.5 **Check:** in the browser, as Corniche's Head of Tendering, `/tenders/T-2026-061` shows the document in the rail's source chips (open the PDF at a cited page), the recommendation reads Pursue with the conditions, and the eligibility counts read 8 · 1 · 1 · 0.

### Phase 3 — Stage 2 and Stage 3 data
- [ ] 3.1 Seven packages, shortlists and the scripted replies (see the facts). **Check:** after writing the demo keys for DG1 Pursue (as plan 021's dev check does), Corniche's Stage 2 dashboard lists T-2026-061 with 7 packages.
- [ ] 3.2 The Stage 3 pack inputs, win probability, competitors and contributor inputs. **Check:** `packFor` for T-2026-061 returns every section without a "not available" gap, and margin is masked for Corniche's Procurement Lead.

### Phase 4 — Docs and dev check
- [ ] 4.1 gcc-demo-data §4A and the §9 row, with the page map as built.
- [ ] 4.2 About 8 dev-check rows for T-2026-061 (document resolves; 2 conflicts, 1 blocking; eligibility 8/1/1/0; verdict Pursue; no M-8 flag; 7 packages; pack complete; margin masked for Procurement).

## Acceptance checks
- [ ] typecheck and build pass; `npm --prefix app run demo-itt:cbhh` passes; the hero's `npm --prefix app run hero-itt` still passes.
- [ ] `/dev/checks` passes in all five tenants; **Najd's, Dafna's, Batinah's and Qurain's readings are unchanged**.
- [ ] In Corniche, as the Head of Tendering and the Bid Manager: the tender opens, cited pages open in the PDF viewer with the value highlighted, the recommendation shows Pursue with its reasons, and Reset demo returns the tender to Stage 1.
- [ ] As Corniche's Procurement Lead: margin and price are masked on the tender and on every dashboard.
- [ ] No real company, person or price in any tracked file; the PDF has the watermark on every page.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
