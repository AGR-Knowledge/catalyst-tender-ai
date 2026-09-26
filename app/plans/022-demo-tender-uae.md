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
- [x] 1.1 Write `content.mjs`: about 20 pages, English, A4, in the order of a UAE government ITT: cover; invitation; instructions to tenderers (bond, validity, questions, submission, evaluation with the ICV weight); conditions of contract, particular conditions (bonds, damages, payment, retention, **English governs**); scope of MEP works (chiller plant 3 × 1,500 TR); equipment schedule (3 × 1,750 TR); medical gas section; qualification requirements (the ~10 lines above); BOQ summary by package (quantities and units, **no prices**); drawings list; Annex C Form of Tender Bond (150 days); Form of Tender.
  - [x] 1.1.1 Every page carries the watermark "Synthetic document for demonstration" and a header with the reference.
  - [x] 1.1.2 `ANCHORS`: each cited value, verbatim, with its page. `EXCLUSIVE`: each side of the two conflicts appears on one page only.
- [x] 1.2 Build and verify (`npm --prefix app run demo-itt:cbhh`): exact page count, every anchor on its page, no prices, the watermark on every page. Render the cover and the two conflict pages to PNG in `.out/` and look at them.
- [x] 1.3 Write the BOQ CSV (`item,package,description,unit,qty`), about 40 representative lines across the 7 packages.

### Phase 2 — Stage 1 data
- [x] 2.1 The extraction record `cbhh-011.ts` (`ExtractedTenderGcc`): identity, commercial, guarantees, time, evaluation, submission and risk groups, each field with its page and confidence; the two conflicts as `ValidationItem`s (conflict 1 `blocksDg1: true`); the flags (no answer date; ICV weight; medical gas). `fileNames` holds the PDF's name. Register it in `index.ts`.
- [x] 2.2 The register row: `docKey: 'cbhh-011'`, `requirements` (the ~10 lines, each with its page), `validations`, key dates (add site visit, answers "not stated", validity).
- [x] 2.3 The lifecycle story: the tender now sits at Stage 1, step **validating**, with the two validation items open, captured 07:40 and logged 07:52 as today; `documentHref` points to the PDF. Update the Corniche targets this moves.
- [x] 2.4 Queries: three drafted (bond validity; chiller capacity; chamber emirate), plus bond and effort records like the hero's.
- [x] 2.5 **Check:** in the browser, as Corniche's Head of Tendering, `/tenders/T-2026-061` shows the document in the rail's source chips (open the PDF at a cited page), the recommendation reads Pursue with the conditions, and the eligibility counts read 8 · 1 · 1 · 0.

### Phase 3 — Stage 2 and Stage 3 data
- [x] 3.1 Seven packages, shortlists and the scripted replies (see the facts). **Check:** after writing the demo keys for DG1 Pursue (as plan 021's dev check does), Corniche's Stage 2 dashboard lists T-2026-061 with 7 packages.
- [x] 3.2 The Stage 3 pack inputs, win probability, competitors and contributor inputs. **Check:** `packFor` for T-2026-061 returns every section without a "not available" gap, and margin is masked for Corniche's Procurement Lead.

### Phase 4 — Docs and dev check
- [x] 4.1 gcc-demo-data §4A and the §9 row, with the page map as built.
- [x] 4.2 About 8 dev-check rows for T-2026-061 (document resolves; 2 conflicts, 1 blocking; eligibility 8/1/1/0; verdict Pursue; no M-8 flag; 7 packages; pack complete; margin masked for Procurement).

## Acceptance checks
- [x] typecheck and build pass; `npm --prefix app run demo-itt:cbhh` passes; the hero's `npm --prefix app run hero-itt` still passes.
- [x] `/dev/checks` passes in all five tenants; **Najd's, Dafna's, Batinah's and Qurain's readings are unchanged**.
- [x] In Corniche, as the Head of Tendering and the Bid Manager: the tender opens, cited pages open in the PDF viewer with the value highlighted, the recommendation shows Pursue with its reasons, and Reset demo returns the tender to Stage 1.
- [x] As Corniche's Procurement Lead: margin and price are masked on the tender and on every dashboard.
- [x] No real company, person or price in any tracked file; the PDF has the watermark on every page.

## Execution report
(Filled in by the executor, 2026-09-26.)

- **Changed files**
  - Created:
    - `app/scripts/demo-itt/cbhh-011/`: `content.mjs`, `template.mjs` (copied from the hero, clause numbers with a dot kept as is), `build.mjs`, `verify.mjs`, `README.md` (page map as built);
    - `app/public/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf` (20 pp) and `CBHH-PRJ-2026-011-BOQ.csv` (40 lines, no prices);
    - `app/src/data/extracted/gcc/cbhh-011.ts`;
    - `app/src/data/gcc/s2/tenders/corniche-061.ts`;
    - `app/src/pages/gcc/dev-checks/71-tender-061.tsx` (10 rows).
  - Data (Corniche T-2026-061 entries appended):
    - `app/package.json` (the `demo-itt:cbhh` line only);
    - `data/extracted/gcc/index.ts`;
    - `data/gcc/tenants/corniche.ts`: T-061 row, fit and client reasons, `corniche-p3.fields`, new project `corniche-p5`, IN-0308-01 `ref`;
    - `data/gcc/lifecycle/live/corniche.ts`;
    - `data/gcc/s1/{bonds,queries,personnel}.ts` (personnel: new `corniche-kp-5`; `effort.ts` unchanged, the existing row covers it);
    - `data/gcc/s2/{types,replies}.ts`, `s2/suppliers/corniche.ts` (13 suppliers), `s2/tenders/others.ts`;
    - `data/gcc/s3/{clients,competitors,win,packs,inputs}.ts`;
    - `data/gcc/portfolio.ts`.
  - Rules (under the approved extension):
    - `data/gcc/types.ts` and `data/gcc/s1/types.ts`;
    - `domain/gcc/s1/{eligibility,bond,fit}.ts` and `domain/gcc/s3/pack.ts`.
  - Dev-check targets: `pages/gcc/dev-checks/90-stage3.tsx:46`.
  - Docs: `docs/07-product-design/agr-product-definition/gcc-demo-data.md` (§4A, 60 lines, and one §9 row).

- **Verification**
  - `typecheck` and `build` pass. `demo-itt:cbhh` passes 64 of 64 checks (anchors, one-page conflict sides, no prices, watermark, header and footer, line pitch; PNGs of pp. 1, 6, 11, 14, 19 checked). `hero-itt` still passes 57 of 57 (it rewrites the hero PDF's bytes, so I restored it with `git checkout`).
  - `/dev/checks` passes in all five tenants with no console errors: najd 664, corniche 256, dafna 238, batinah 245, qurain 261. The new panel shows 10 of 10 in every tenant.
  - Before and after snapshots of every tender's readings:
    - Najd, Dafna and Qurain: identical.
    - Corniche: only T-2026-061. That includes its triage row (bond AED 2.0 M fixed, where the old 2% gave AED 3.7 M), the running totals of the two rows after it, and the all-bonds figure (AED 13.9 M to 12.2 M, 9% to 8%). This is condition 5.
    - Batinah: only T-2026-042 (plan 023's).
  - Browser, Corniche, Head of Tendering and Bid Manager, `/tenders/T-2026-061`:
    - reads "1 · Intake · Validating", Pursue with its reasons, eligibility 8 · 1 · 1 · 0;
    - source chips open the PDF viewer ("Tender document CBHH/PRJ/2026/011") at the cited page with the value highlighted (p. 6: "2 matches on page 6"); 64 of 65 Requirements chips open. The 65th is the fit model's calculation chip, which cites no page.
  - Flow through the rules (DG1 to Stage 2):
    - DG1 is locked until VAL-061-1 is resolved; resolving sets the bond validity (120 or 150 days).
    - After Pursue: 7 packages, subcontracting 21.9% of the 35% cap, recommended shortlists include the reply suppliers, and 6 scripted replies arrive.
    - Levelling shows the currency, EXW freight and duty, VAT 5% removed, short validity and the exclusions.
    - The Stage 2 dashboard lists T-2026-061 ("Packaging 0 / 7"). `/levelling` and `/sourcing` render with no errors.
  - `packFor`: all 10 sections current with bodies, reading "Bid with conditions · 52 ± 8 · AED 185.0 M · 8.0–11.0% · AED 157.6 M after the bond". The bond agrees between 007a and the pack.
  - As the Procurement Lead: win, margin and positions are masked in the pack, and the tender's Bid / No-Bid tab reads "masked for your role". `/`, `/stages/1`, `/stages/2`, `/stages/3` and `/packs` show no margin and no T-2026-061.
  - Reset demo clears every Corniche key, and T-2026-061 returns to Stage 1.
  - Names: I web-searched each invented company name. Five were close to real firms, so I renamed them to coinages: a medical gas supplier (now Thalmira), two competitors (now Tessaline MEP Contracting and Brevanne Engineering Services (Gulf)) and a vault client (now Quellmar Health Developments). The plan's "Crescent Bay" is not an exact match, but a US real-estate firm "Crescent Bay Holdings" exists (see Follow-ups).

- **Deviations from plan**
  - Rule extension, approved by the user on 2026-09-26 with six conditions. All new fields are optional, and every other tender's readings are unchanged (snapshots above). New fields and rules:
    - `data/gcc/types.ts:94` `SimilarProject.fields`; `:96` `SimilarProject.measures`; `:206` `PqRequirement.threshold.issuer`; `:213` `PqRequirement.reading`; `:218` `PqRequirement.specialist`; `:220` `PqRequirement.roles`; `:224` new `KeyRoleSpec` (`:3` imports `KeyPerson`).
    - `data/gcc/s1/types.ts:65` `KeyPerson.sectors`; `:120` `BondTerms.bidAmount`; `:128` `BondTerms.bidValidityValidationId`.
    - `data/gcc/s2/types.ts:30` new trade `'medical-gas'`.
    - `domain/gcc/s1/eligibility.ts`:
      - `:82`, `:89` `'lc-baseline'` read as a certificate;
      - `:216–241` certificate issuer filter; `:280–282` classification issuer filter;
      - `:312` `valueCcy` and `:323–337` experience by contract value or `measures`; `:345` `bestShort`;
      - `:389–392` no "JV partner needed" when a specialist can meet the line;
      - `:550` `rolesOf`, `:557` `sectorYearsOf`, `:561–575` personnel by role and sector;
      - `:628` `UNASSESSED`, `:630` `assessed`, `:654` `qualified` (`specialist` becomes at-risk and `reading` becomes interpretation).
      - EligibilityLine, EligibilityResult, LineState and LineAction are unchanged.
    - `domain/gcc/s1/bond.ts:27` `daysOf`; `:60` `BidBond.fixed`; `:129–173` fixed amount (headroom, text, rate as a share of the estimate); `:184` `validityConflict`.
    - `domain/gcc/s3/pack.ts:350–351`, `:373` a fixed bond in the pack.
    - `domain/gcc/s1/fit.ts:172–175` a "name the specialist" item in `wouldChange`.
  - The win band is ± 8, not ± 9: 12 comparables give ± 8, and the band rule has no ± 9 step.
  - No "answers" key date: a `KeyDate` needs a date. The extraction reads "Not stated" (p. 4) and raises a flag.
  - The chiller conflict is on pp. 11 and 14, and Annex C on p. 19 (the plan said about 9 and 18). The page map as built is in §4A.5 and the generator's README.
  - 13 new suppliers (the plan did not give a number), so the recommended shortlists have 3 or more per package. P-02 has 2 extra AHU makers, because the 3 existing HVAC suppliers are contractors.
  - Vault additions: project `corniche-p3` tagged "healthcare MEP", new project `corniche-p5`, new key person `corniche-kp-5` (so Q-07 and Q-10 are met).
  - `data/gcc/portfolio.ts:44` and T-2026-029's pack (`s3/packs.ts:30`, shared `CORNICHE_PORTFOLIO`) now carry T-2026-061's +8%. Dev check 50 requires every pack's portfolio to equal `DELIVERY_LOAD`. DEC-5 at seed is unchanged, because it counts only tenders at Stage 3. Corniche only.
  - The evidence-count target (`90-stage3.tsx:46`, 12 to 24) sits in Najd's block. It counts every tenant's evidence (7 from this plan, 5 from 023). No Najd reading moved.
  - The dev check is a new panel file (`71-tender-061.tsx`, 10 rows) rather than rows in an existing panel, as plan 023 did.

- **Blockers / questions** (decision for the user and orchestrator)
  - **The T-2026-061 pack is seeded but the tender stays at Stage 1.** No demo action moves a tender into Stage 3, so the Stage 3 pack, inputs and win model are seeded, timestamped 08:05 to 09:45 on 8 Mar. They are visible while the tender is at Stage 1:
    - `/packs` for the Head of Tendering and the Bid Manager (`pages/gcc/s3/Packs.tsx:70`);
    - the tender's Inputs tab (`inputs.tab.tsx:175`);
    - the Bid / No-Bid tab (`bid-decision.tab.tsx`, `shows()`).
  - A prospect could see a finished pack for a tender that has not yet passed DG1. Options:
    - (a) gate seeded packs on the tender's stage or a demo key (a rule change owned by 009b or the orchestrator);
    - (b) drop the T-2026-061 `PackVersion` and inputs until a "move to Stage 3" demo action exists;
    - (c) accept it for now.
  - I have left it as is.

- **Follow-ups noticed (not done)**
  - The pack's 9.3 counts interpretation lines as "at risk" (`s3/pack.ts:290`), so it reads "8 of 10 met, 2 at risk" while Stage 1 reads "1 at risk · 1 interpretation". The counts agree and only the wording differs. It applies to every tender (009a's rule).
  - `credName` prints "MEP, first grade, Grade 1" for a classification with both a field and a grade.
  - The evidence-count target couples every plan that adds evidence; count T-2026-097's cited evidence only.
  - Q-07 onwards default to `validAt` opening, so Stage 1 checks them at the opening date. That is harmless here but worth a look for plan 023.
  - "Crescent Bay" (the plan's name): a US real-estate firm "Crescent Bay Holdings" exists. Not an exact match and a different sector and country; keep or rename.
  - Pages 18 to 20 are sparse, as real drawing lists and forms are.
  - Every `hero-itt` run changes the committed hero PDF, because the file stores the build time (12 bytes: `CreationDate` and `ModDate`). I restored it twice with `git checkout`; the second time another session had run it. A fixed date in the hero's `build.mjs` would stop this.
