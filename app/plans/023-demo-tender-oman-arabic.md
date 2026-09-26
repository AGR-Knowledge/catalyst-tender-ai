# 023 — Third demo tender: Sohar–Buraimi road dualling (Arabic, Oman)

Status: READY · Depends on: 017, 007a, 008a, 009a, 019, 021 (all in `gcc-demo`) · Can run in parallel with: 007b, 008b, 009b, 011, 022 · Plan 012 (Arabic intake screens) builds on it

## Goal
A presenter can run demo scripts A–C, and the Arabic script E (s1-s3-demo-spec §12, §17), on a **third GCC tender that is written in Arabic**: **T-2026-042, the Sohar–Buraimi road dualling, in Batinah Waypoint Roads (Oman)**. It has a synthetic Arabic tender document with a few scanned pages, an extraction record whose every value carries its Arabic source and page, its own catches, an eligibility answer against Batinah's vault, packages, quotes and a bid pack. Batinah discards the hero; this gives Batinah a Pursue story, and an Omani prospect an Omani tender.

The user asked (2026-09-26) for at least three demo tenders, all from the GCC, one in Arabic: the hero (KSA, English), plan 022's (UAE, English) and this one. It replaces the scanned **Lebanese** roads tender that gcc-demo-data §9 planned for script E: the demo path is now GCC only.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Data only.** No new rules, no screens, no domain edits. The Stage 1–3 rules are data-driven per tender; the screens that 007b, 008b and 009b build in parallel pick this tender up. Plan 012 later adds the bilingual display (Arabic beside English, "Read in English"); this plan supplies what it will show.
- **The UI stays English and left-to-right.** Only the document is Arabic.
- **The document is short:** about 18 A4 pages, of which **3 are scanned images** (no text layer).
- **Keep the dev check small:** about 8 rows.
- **Najd's readings must not move.** This tender lives in Batinah only. Batinah's readings may change; update Batinah's targets where they are set.

## Context
- **Why:** gcc-demo-data §2.5 (Batinah), §4 (how the hero is built), §9 (real documents, the Arabic bonus), s1-s3-demo-spec §12 (Arabic tenders) and §17 script E.
- **The row already exists:** `src/data/gcc/tenants/batinah.ts` (`id: 'T-2026-042'`, "Sohar–Buraimi road dualling", issuer "Interior Links Roads Authority" (fictional), OMR 32 M estimate, band 28–36 M, questions Tue 24 Mar, submission Sun 26 Apr 2026 12:00, Stage 1 "Validated; waiting for DG1", Bid Manager `batinah.bid`). Its lifecycle story is in `src/data/gcc/lifecycle/live/batinah.ts` (`K.story('T-2026-042', …)`, `s1(6, 0, 0, 'EN', …)`). **Keep the ID, value, band, questions and submission dates and owner.** Change the language to Arabic and the Stage 1 step (see 2.3).
- **Patterns to copy, read these real files first:** as plan 022 lists (hero data in `src/data/gcc/hero.ts`; Najd's `T117_REQUIREMENTS`; `CORNICHE_T044` in `s2/tenders/others.ts`; `T-2026-029` in `s3/*`; `scripts/hero-itt/` and its README). Plus the Arabic record that exists: `src/data/extracted/gcc/kw-cctld.ts` and its type `ExtractedTenderAr` in `src/data/extracted/gcc/types-ar.ts` (every item carries `source`, the Arabic snippet it was read from).
- **The document contract (orchestrator, 2026-09-26):** `src/domain/gcc/documents.ts`, `documentFor(tenant, tenderId)`, resolves the row's `docKey` through `GCC_EXTRACTED` and `GCC_DOC_FILES` in `src/data/extracted/gcc/index.ts`. `isArabicRecord` is true when `language === 'Arabic'`; `isGccRecord` is true when the record has `groups` and `conflicts`. **This record must satisfy both:** add a type `ExtractedTenderGccAr` in `types-ar.ts`: `ExtractedTenderAr & { groups: Record<GccFieldGroup, (ExtractField & { source: string })[]>; conflicts: ValidationItem[] }`.

## The tender (facts; the booklet and the seed both follow these)
Everything is fictional except public bodies named generically. No real company is named or scored.

| Field | Value |
| --- | --- |
| TID | T-2026-042 (Batinah only) |
| Title (English reading) | Dualisation of the Sohar–Buraimi road, section 2 (38 km), with two bridges, drainage and street lighting |
| Title (Arabic, as printed) | ازدواجية طريق صحار – البريمي، القطاع الثاني (38 كم)، مع جسرين وأعمال تصريف مياه الأمطار والإنارة |
| Issuer | Interior Links Roads Authority, هيئة طرق الربط الداخلي (fictional, keep) |
| Reference | ILRA/RD/2026/042 (Latin characters in the document too, so it can be matched) |
| Portal | Tender Board e-tendering (keep the row's `sourceDetail`) |
| Procurement | Open public tender; technical and financial envelopes |
| Contract | Re-measured unit-rate construction contract; 30 months; 12 months maintenance |
| Estimate | Not published. Platform estimate **OMR 32 M** (band 28–36 M) (keep) |
| Language | **Arabic only.** The document requires the bid in Arabic. The flag reads "Arabic-only document: the English values are a reading aid; the bid must be submitted in Arabic" |
| Scanned pages | 3 of about 18: the BOQ summary table, the stamped site-visit certificate, the signed Form of Bid Bond |

**Key dates** (Gulf Standard Time +4, Oman; weekend Fri–Sat; the calendar's Eid closure applies):
- Published Sun 8 Mar 2026 (keep);
- Site visit Sun 15 Mar 2026, 09:00, from the Sohar interchange;
- Questions deadline Tue 24 Mar 2026 (keep);
- Answers due within 7 days of the questions deadline;
- Submission **Sun 26 Apr 2026, 12:00** (keep);
- Bid validity 90 days from opening.

**Commercial terms:**
- Bid bond **1% of the bid value** in the instructions, but **OMR 300,000** on the scanned Form of Bid Bond. That is conflict 1 (blocking DG1; 1% of the estimate is about OMR 320,000, so the two disagree).
- Performance bond 5% [A]; advance payment 10% against an equal guarantee; retention 5%.
- Delay damages 0.05% per day, capped at 10%.
- At least **10% of the contract value subcontracted to registered small and medium enterprises** [A]; an Omanisation plan with the bid.
- Prices in OMR; 5% VAT separately.

**Deliberate catches (the extraction must find them):**
1. Bid bond 1% vs OMR 300,000 (instructions page vs the scanned bond form): **blocking** validation item; a query is drafted.
2. Section length **38 km** in the scope vs **36.5 km** in the drawings list: non-blocking; a query is drafted.
3. The BOQ summary is a scanned table with Eastern Arabic digits and a stamp over two quantities: those fields read **low confidence**, with the reason ("scanned table; a stamp covers the figures").
4. The SME subcontracting share is stated without saying whether it counts the value or the number of subcontracts: an **interpretation** line.
5. Bridges: "at least one bridge with a span of 60 m or more in the last 10 years". Batinah's record has 45 m and 52 m spans: **at risk**, unless a partner or a named subcontractor provides it (don't make it a fail: the tender must stay a Pursue).

**Eligibility lines against Batinah's vault** (about 9): commercial registration; Tender Board registration, roads and bridges, Excellent grade; chamber membership; Omanisation compliance certificate; ISO; approved contractor on the national roads programme; two dual-carriageway projects of OMR 10 M or more in 10 years (add synthetic ones to Batinah's `SimilarProject`s if missing); bridge span (at risk); SME share (interpretation); average turnover of OMR 20 M or more. Target: **7 met · 1 at risk · 1 interpretation · 0 fail → eligible**. Where a line doesn't come out as intended, **change the requirement, not the vault**, except the added projects.

**Fit and recommendation:** Batinah's fit model (Pursue at 75, conditions from 55). Target weighted fit **about 81**, verdict **Pursue**, with "What would change it": resolve the bond conflict with the employer; name a bridge subcontractor with a 60 m span.

**Stage 2** (after DG1 Pursue): 6 packages in OMR, summing to the BOQ total:
- Asphalt and bitumen supply;
- Aggregates (quarry supply);
- Precast box culverts and drainage pipes;
- Bridge bearings and expansion joints (imported; the quote comes in EUR, ex-works);
- Street lighting: poles and LED luminaires (one quote in USD, one without VAT stated);
- Road markings, signage and safety barriers.

Earthworks and paving are in-house (not packaged). Shortlists from Batinah's supplier master (add fictional suppliers only where a package has fewer than three). Seed quotes for two packages (bridge bearings, street lighting), three each, with the levelling traps, exactly as plan 022 does and in the form 008a's rules expect.

**Stage 3:** a pack with win probability **61 ± 7**, three fictional Omani competitors, a margin range, facility headroom after the bond, the roads team's load, and contributor inputs. The committee (above the OMR 4 M referral threshold) votes; the demo outcome is **Bid with conditions** (confirm the bond with the employer).

## Scope
**Files to create:**
- `app/scripts/demo-itt/ilra-042/` (`content.mjs`, `build.mjs`, `verify.mjs`, `README.md`). Reuse the hero's approach; don't edit `scripts/hero-itt/`.
- `app/public/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf` (ASCII file name) and `ILRA-RD-2026-042-BOQ.csv` (Arabic descriptions with an English column; no prices).
- `app/src/data/extracted/gcc/ilra-042.ts`: the record (`ExtractedTenderGccAr`), and the type in `types-ar.ts`.
- New data files as needed, named for the tender, e.g. `app/src/data/gcc/s2/tenders/batinah-042.ts`.

**Files to change:**
- `app/package.json`: one script line, `"demo-itt:ilra": "node scripts/demo-itt/ilra-042/build.mjs && node scripts/demo-itt/ilra-042/verify.mjs"`. No dependencies.
- `app/src/data/extracted/gcc/index.ts`: one entry each in `GCC_EXTRACTED` and `GCC_DOC_FILES` (plan 022 adds its own lines; re-read right before editing).
- `app/src/data/gcc/tenants/batinah.ts`: the T-2026-042 row only, plus up to two `SimilarProject`s and any fictional supplier the facts need.
- `app/src/data/gcc/lifecycle/live/batinah.ts`: the T-2026-042 story only (language `'AR'`, step, facts, `documentHref`).
- `app/src/data/gcc/s1/{queries,bonds,effort}.ts`, `s2/tenders/*` index or export list, `s2/suppliers/batinah.ts`, `s3/{packs,inputs,win,competitors}.ts`: **append** Batinah T-2026-042 entries only. Plan 022 appends Corniche entries to the same files at the same time: re-read right before editing; never reorder or reformat other entries.
- Dev-check target constants for **Batinah** in existing panels, where your data moves a Batinah reading, each with a comment "plan 023".
- `docs/07-product-design/agr-product-definition/gcc-demo-data.md`: add **§4B "Third demo tender: Sohar–Buraimi road dualling (Batinah, Arabic)"** with the facts, catches, expected eligibility, packages and the page map as built; in §9, mark the scanned Lebanese roads tender "replaced by §4B for script E" and the Batinah line in §2.5 accordingly. Under about 80 lines.

**Out of scope** (stop and ask): any file under `src/domain/`, `src/pages/`, `src/components/`; other tenants' data; the hero's data; the Lebanese or Jordanian records (leave them as they are); fonts or new libraries (plan 012 adds the Arabic UI font; the PDF uses a system Arabic font through Chrome); new `done` keys; changing a signature. If a rule is hero-only and blocks this tender, write it under Blockers and use the package-level data the rule supports.

## Steps

### Phase 1 — The Arabic tender document
- [ ] 1.1 Write `content.mjs`: about 18 pages in Arabic, right to left, A4, in the order of an Omani public tender document: cover; invitation; instructions to bidders (bond 1%, validity, questions, site visit, submission in Arabic, evaluation); general and particular conditions (bonds, damages, payment, retention, SME share, Omanisation); scope of works (38 km, two bridges); technical requirements; qualification requirements (the ~9 lines); drawings list (36.5 km); **scanned:** BOQ summary, site-visit certificate, Form of Bid Bond (OMR 300,000); Form of Bid.
  - [ ] 1.1.1 Plain, formal Modern Standard Arabic, as a real Omani document would read. Numbers in the text pages use Western digits; the scanned BOQ uses Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩).
  - [ ] 1.1.2 Every page carries a watermark, in Arabic and English: "مستند اصطناعي لأغراض العرض / Synthetic document for demonstration".
  - [ ] 1.1.3 The reference `ILRA/RD/2026/042` appears in Latin characters in the header of every page.
- [ ] 1.2 **The scanned pages:** render those three pages to PNG (`pdftoppm`), make them look scanned (slight rotation, grey paper, softer contrast, a stamp over two BOQ quantities; CSS filters on an `<img>` are enough), and put them back as full-page images, so they have **no text layer**.
- [ ] 1.3 Build and verify (`npm --prefix app run demo-itt:ilra`): exact page count; the scanned pages yield no text from `pdftotext`; every text-page anchor on its page (match on digits, the reference and Latin tokens where Arabic shaping makes `pdftotext` output unreliable, and say so in the README); the watermark on every page; no prices. Render the cover, one text page and one scanned page to PNG and look at them.
- [ ] 1.4 The BOQ CSV: about 35 lines across the 6 packages plus earthworks and paving, with `description_ar` and `description_en` columns.

### Phase 2 — Stage 1 data
- [ ] 2.1 The record `ilra-042.ts` (`ExtractedTenderGccAr`, `language: 'Arabic'`, `scanned: true`): every field has the English value, its Arabic `source` snippet and its page; OCR'd fields are `low` confidence with the reason in `note`; the two conflicts (conflict 1 `blocksDg1: true`); the flags (Arabic-only document; SME share; scanned pages). A short English summary for plan 012's "Read in English" goes in `summary`. Register it in `index.ts`.
- [ ] 2.2 The register row: `docKey: 'ilra-042'`, `requirements` (the ~9 lines, each with its page), `validations`, key dates (site visit, answers, validity).
- [ ] 2.3 The lifecycle story: language `'AR'`; Stage 1, step **validating**, with the two validation items open; captured 07:30 and logged 07:41 as today; `documentHref` to the PDF. Update the Batinah targets this moves.
- [ ] 2.4 Queries: three drafted, in English with the Arabic clause reference (bond amount; section length; SME share basis), plus bond and effort records.
- [ ] 2.5 **Check:** in the browser, as Batinah's Head of Tendering, `/tenders/T-2026-042` shows the document in the rail's source chips (the PDF opens at the cited page), the recommendation reads Pursue with its conditions, and the eligibility counts read 7 · 1 · 1 · 0.

### Phase 3 — Stage 2 and Stage 3 data
- [ ] 3.1 Six packages, shortlists and the seeded quotes. **Check:** after the demo keys for DG1 Pursue, Batinah's Stage 2 dashboard lists T-2026-042 with 6 packages.
- [ ] 3.2 The Stage 3 pack inputs, win probability, competitors and contributor inputs. **Check:** `packFor` for T-2026-042 has no gaps, and margin is masked for Batinah's Procurement Lead.

### Phase 4 — Docs and dev check
- [ ] 4.1 gcc-demo-data §4B, and the §2.5 and §9 edits.
- [ ] 4.2 About 8 dev-check rows (document resolves and is Arabic; 3 scanned pages; OCR'd fields low confidence with reasons; 2 conflicts, 1 blocking; eligibility 7/1/1/0; verdict Pursue; 6 packages; margin masked for Procurement).

## Acceptance checks
- [ ] typecheck and build pass; `npm --prefix app run demo-itt:ilra` passes; `hero-itt` still passes.
- [ ] `/dev/checks` passes in all five tenants; **Najd's, Corniche's, Dafna's and Qurain's readings are unchanged** (Corniche may move only through plan 022).
- [ ] In Batinah, as the Head of Tendering and the Bid Manager: the tender opens; cited pages open in the PDF viewer (the scanned pages too); the recommendation shows Pursue with its reasons; Reset demo returns the tender to Stage 1.
- [ ] As Batinah's Procurement Lead: margin and price are masked.
- [ ] The Arabic reads as a native, formal document (have a second look at the cover and the instructions page as images). No real company, person or price in any tracked file.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
