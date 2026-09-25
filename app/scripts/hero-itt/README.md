# Hero tender booklet (synthetic)

This folder generates **Vol. 1 of the hero tender**, ECWS/PRJ/2026/0147. It is a 48-page, Saudi-style Terms and Specifications Booklet for a fictional sewage treatment plant (STP) expansion. It is a dev-only tool, and its output is committed:

- `public/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf`: the booklet. In dev it is served at `/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf`.
- `public/bids/gcc/ECWS-PRJ-2026-0147-BOQ.csv`: the Vol. 2 extract, with the 11 bills and their representative lines (`item,bill,description,unit,qty`). It has no prices.

The content follows gcc-demo-data §4 and its **page map (§4.9)**. Plan 004 seeds the matching extraction record from the same page map. Everything in the booklet is fictional: the issuer, the project, the reference and the contacts. Every page carries the watermark "Synthetic document for demonstration".

## Rebuild

```bash
npm --prefix app run hero-itt     # build, then verify; exits non-zero on any failure
```

What you need: Google Chrome at `/Applications/Google Chrome.app` (or set `CHROME_PATH`), poppler (`pdftotext`, `pdfinfo`, `pdftoppm`), and Node 18 or later. There are no npm dependencies.

| File | Role |
| --- | --- |
| `content.mjs` | Everything printed: `PAGES` (48 page objects of blocks), `META`, `PARTS`, `BILLS`, and the checks' data: `ANCHORS` and `EXCLUSIVE` |
| `template.mjs` | HTML and print CSS: A4, margin-box header and footer, watermark, cover, block renderers |
| `build.mjs` | Checks the content's shape, measures page fill, prints with headless Chrome, checks the page count and size, writes the CSV |
| `verify.mjs` | Reads the PDF with `pdftotext` and prints a pass/fail table. Renders pages 1, 4, 12, 35 and 38 to PNG in `.out/` |

`.out/` holds the build's working files (printed HTML, measuring page, PNG previews) and is not committed.

### How the build works, and the traps it avoids
- **Measuring first.** `build.mjs` first lays the pages out on screen at the printable width (174 × 255 mm) and prints each page's fill. It fails if a page is over 98.5% (it would overflow in print) or if anything is wider than the page. A final check is that Chrome must print exactly 48 pages. **Fix an overflow by trimming text, never by shrinking fonts:** body text is 12pt and tables are 9.5pt.
- **The measurement depends on the fonts.** With Times New Roman and Arial, the screen measurement matches the print within 2% of the page, and errs on the full side. With Georgia, the screen came out up to a quarter taller than the print, because screen and print glyph widths differ. After a font change, compare the build's fill figures with the printed fill that `verify.mjs` reports.
- **Headless Chrome on macOS doesn't exit** after `--print-to-pdf` or `--dump-dom`. The build waits for Chrome's "written" signal, then stops it, with a 90-second timeout. Each run uses a throwaway profile under `.out/`.

## Rules for editing the content
1. **Keep every `ANCHORS` text verbatim on its page.** Plan 007 opens the PDF at these pages when a user clicks an extracted value. Anchors may wrap in running text. In **table cells** wrap them in `nw()`, because `pdftotext -layout` interleaves the wrapped lines of neighbouring cells.
2. **Never write the abbreviation for value added tax, or the words "value added", anywhere.** This is seeded flaw 6, and verify fails if either appears. For that reason, the PQ-08 line on p. 38 reads "Tax registration … Zakat, Tax and Customs Authority".
3. The `EXCLUSIVE` texts must stay on one page, so each side of a seeded conflict has exactly one page: `1% of the total bid value` (p. 12), `2% of the total bid value` (p. 35), `18 km` (p. 47), `[ %]` (p. 19), `Annex (8)` (p. 8) and `ISO 90001` (p. 40).
4. Don't define which financial years "the last three (3) financial years" means (flaw 8), and don't give an answer date in the timetable (flaw 3).
5. Clauses run §1–§89 in the model booklet's order, and the build checks this. No prices appear in the BOQ pages.

## Page map (as built)

| Page | Content | Clauses | Anchors checked by verify |
| --- | --- | --- | --- |
| 1 | Cover: issuer, title, reference, Sunday 8 March 2026 / 19 Ramadan 1447 H (approx.) | | |
| 2 | Contents (page numbers derived) and tender documents | | |
| 3 | Part 1: definitions, about the tender, document fee (SAR 5,000 via SADAD) | §1–3 | |
| 4 | Timetable, eligibility, required certificates (PQ-01…07), representative, delivery address, governing law | §4–9 | questions 18 Mar · submission 10 May 10:00 · site visit 17 Mar 10:00 · "valid on the date of bid opening" |
| 5–8 | Part 2: general provisions | §10–26 | p. 6 `25%` (§19) · p. 7 `30% of the contract value` (§23), `certified by the Chamber of Commerce` (§22) · p. 8 `Annex (8)` (§24, **flaw 4**) |
| 9 | Language, currency | §27–28 | `the Arabic text shall prevail` (§27.4) |
| 10 | Validity, notices, **questions (§33)**, site visit | §29–34 | `90 days from the date of bid opening` · `within seven (7) days from that date` (**flaw 3**) |
| 11 | Technical and financial files, pricing, **taxes (§39)** | §35–39 | `inclusive of all taxes, fees and expenses` (**flaw 6**) |
| 12 | Guarantees, **initial guarantee 1% (§41)** | §40–44 | `Initial guarantee: 1% of the total bid value` (**flaw 1**) |
| 13–14 | Part 4: submission, late bids, validity extension, withdrawal, opening | §45–49 | |
| 15–17 | Part 5: evaluation, LC financial formula, correction, examination, results, standstill | §50–55 | |
| 18 | Award, **final guarantee (§57)**, signature | §56–58 | `5% of the contract value` · `fifteen (15) working days` |
| 19 | Penalties, **delay cap "[ %]" (§60)**, LC penalties, total cap, insurance | §59–63 | `shall not exceed [ %]` (**flaw 2**) · `20% of the contract value` |
| 20–27 | Part 7 §64 scope: background and design basis (20), scope summary (21), liquid line (22), **TSE pipeline 16 km (23)**, sludge and odour (24), electrical and SCADA (25), tie-ins to the live plant (26), engineering to handover (27) | §64 | p. 23 `TSE transmission pipeline, DN1000 GRP, approximately 16 km` (**flaw 7**) |
| 28–29 | Programme (30 months, milestones), staffing table, place of works, training, BOQ clause | §65–68 | |
| 30–32 | Part 8: specifications (labour, materials, equipment, methods, quality, safety) | §69–74 | |
| 33 | Part 9: local content | §75–76 | `minimum local content of 40%` · `Annex (10)` |
| 34 | Part 10: economic participation (SAR 100 M imports threshold) | none | |
| 35 | Part 11: **initial guarantee 2% (§77)** | §77–79 | `The initial guarantee shall be 2% of the total bid value` (**flaw 1**) |
| 36 | Advance payment, retention and final invoice | §80–83 | `advance payment not exceeding 10%` · `final invoice` |
| 37 | O&M option, maintenance period, key personnel, site rules | §84–89 | |
| 38 | Annex (4): classification, tax registration, STP experience, O&M (PQ-05, 08, 09, 10) | | `Water and Sewage Works, Grade 1` · `two (2) completed sewage treatment plants` · `100,000 m3/day` |
| 39 | Annex (4): turnover and financial position (PQ-11, 12) | | `last three (3) financial years` (**flaw 8**) · `SAR 1,200,000,000` |
| 40 | Annex (4): key personnel and ISO (PQ-13, 14) | | `ISO 90001` (**flaw 5**) |
| 41 | Annex (4): local content (PQ-15), general rules, declaration | | |
| 42 | Annex (5): evaluation criteria and weights | | `pass mark of 70` |
| 43–46 | BOQ summary by bill (quantities only) | | 11 bill titles with line counts, total 236 |
| 47 | Annex (6): drawings list | | `TSE Transmission Line, 18 km` (drawing P-201, **flaw 7**) |
| 48 | Annex (1): Bid Letter form | | `Bid Letter` |

## BOQ: the contract with plan 004 (`HERO_BILLS` / `HERO_LINES`)

Bill titles are the gcc-demo-data §4.8 titles, verbatim. Line counts sum to **236**. The representative lines are in `BILLS` in `content.mjs` and in the CSV. They carry quantities and units only; plan 004 adds its estimate rates.

| Bill | Title | Lines | Representative items |
| --- | --- | --- | --- |
| 1 | General and preliminaries | 18 | 1.01, 1.04, 1.07, 1.10, 1.13, 1.16 |
| 2 | Civil and structural (bioreactors, clarifiers, buildings) | 52 | 2.04, 2.09, 2.11, 2.17, 2.26, 2.41 |
| 3 | Process mechanical equipment (screens, grit, blowers, clarifier mechanisms) | 34 | 3.02, 3.06, 3.10, 3.14, 3.21, 3.27 |
| 4 | Tertiary filtration and UV disinfection | 14 | 4.02, 4.06, 4.09, 4.12 |
| 5 | Sludge thickening and dewatering | 15 | 5.02, 5.05, 5.09, 5.12 |
| 6 | Odour control | 9 | 6.02, 6.04, 6.06 |
| 7 | Electrical: 33/11 kV substation, transformers, MCCs, cabling | 30 | 7.01, 7.03, 7.07, 7.12, 7.19 (LV cables, mandatory list), 7.24 |
| 8 | Instrumentation, control and SCADA | 20 | 8.02, 8.05, 8.09, 8.13 (includes the central control centre link), 8.16 |
| 9 | Yard piping, valves and penstocks | 22 | 9.03, 9.08 (valves, mandatory list), 9.12, 9.17 |
| 10 | TSE pipeline (DN1000 GRP, 16 km) and TSE pump station | 14 | 10.02 (GRP pipes, mandatory list, 16,050 m), 10.04, 10.07, 10.10, 10.12 |
| 11 | Piling, dewatering and shoring | 8 | 11.02, 11.05, 11.07 |

## Where the booklet words a fact differently from gcc-demo-data
- **PQ-08 "VAT registration"** is worded in the booklet as "Tax registration … Zakat, Tax and Customs Authority" (p. 38), so that flaw 6 holds everywhere. The app may keep its own label.
- **Part 11 clause order.** The model booklet's §77–89 are example special conditions that the entity replaces. Here §77 is the initial guarantee (2%), §80 is the advance payment, §81 the retention and final invoice, §84 the O&M option, §85 the maintenance period and §86 key personnel. The template's own examples (manuals, site precautions, as-built documents, payment conditions, form EXP-KD0-GL-000004, safety plan) fill the remaining numbers.
- **The booklet's own numbering in Annex (4).** It numbers its criteria 1–9, not PQ-05…PQ-15: 1 classification (PQ-05), 2 tax registration (PQ-08), 3 similar experience (PQ-09), 4 O&M (PQ-10), 5 turnover (PQ-11), 6 financial position (PQ-12), 7 key personnel (PQ-13), 8 management systems (PQ-14), 9 local content (PQ-15). PQ-01…07 are the §6 certificates on p. 4, and PQ-16 is §22 on p. 7.
