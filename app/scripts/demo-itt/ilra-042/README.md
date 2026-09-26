# Third demo tender: Arabic document ILRA/RD/2026/042 (synthetic)

This folder generates the tender document of **T-2026-042, the Sohar–Buraimi road dualling** (plan 023; gcc-demo-data §4B). It is an 18-page Omani public tender document in formal Arabic, right to left, for a fictional issuer, the Interior Links Roads Authority (هيئة طرق الربط الداخلي). Three of its pages are scanned images with no text layer. It is a dev-only tool, and its output is committed:

- `public/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf`: the document, served in dev at `/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf`.
- `public/bids/gcc/ILRA-RD-2026-042-BOQ.csv`: 38 representative BOQ lines in 7 bills (`item,bill,description_ar,description_en,unit,unit_en,qty,package`), UTF-8 with a byte-order mark. It has no prices. `package` is Batinah's procurement package (P-01…P-06) or `in-house`.

Everything is fictional: the issuer, the project, the reference, the people and the emblem. Real places (Sohar, Wadi Al Jizzi, North Al Batinah) and public bodies (the Tender Board, the Ministry of Labour, the Oman Chamber) are named generically, as a real document would. Every page carries the watermark "مستند اصطناعي لأغراض العرض / Synthetic document for demonstration".

## Rebuild

```bash
npm --prefix app run demo-itt:ilra     # build, then verify; exits non-zero on any failure
```

What you need: Google Chrome at `/Applications/Google Chrome.app` (or set `CHROME_PATH`), poppler (`pdftotext`, `pdfinfo`, `pdftoppm`, `pdfimages`), and Node 18 or later. There are no npm dependencies and no Arabic web font: Chrome uses the system's Times New Roman and Arial, which carry Arabic glyphs on macOS.

| File | Role |
| --- | --- |
| `content.mjs` | Everything printed: `PAGES` (18 page objects of blocks), `META`, `PARTS`, `BILLS`, `BOQ`, and the checks' data: `ANCHORS`, `EXCLUSIVE`, `ALLOWED_AMOUNTS` |
| `template.mjs` | HTML and print CSS: A4, right to left, margin-box header and footer, per-page watermark, cover, block renderers, and the three scanned sheets |
| `build.mjs` | Checks the content's shape, measures page fill, prints and rasterises the scanned sheets, prints the document, checks the page count and size, writes the CSV |
| `verify.mjs` | Reads the PDF with poppler and prints a pass/fail table (46 checks, including the pinned metadata dates). Checks the extraction record's Arabic sources once `src/data/extracted/gcc/ilra-042.ts` exists. Renders pages 1, 5, 13, 15 and 17 to PNG in `.out/` |

`.out/` holds the working files (measuring page, scan sheets and their JPEGs, printed HTML, PNG previews) and is not committed.

## How the build works
1. **Measure.** Lays every page out on screen at the printable width (174 × 255 mm) and fails if one is over 98.5% full or anything is wider than its box. Fix an overflow by trimming text, never by shrinking fonts: body text is 12.5 pt with 1.5 leading, tables 10 pt.
2. **Scan pass.** Prints only pages 15–17 as full-bleed photocopied sheets: grey paper with a darker edge, the copy rotated by 0.3–0.45° and softened (`filter: blur() contrast()`), speckles and copier streaks, the tender committee's stamp (the approval of each form, dated 08/03/2026), the committee's signature on the bond form, and a hand-numbered page. The forms' own signature, seal and name fields are left blank for the bidder and the bank. Then `pdftoppm -jpeg -gray -r 110` rasterises each sheet. The look is drawn before rasterising, not with CSS filters on the `<img>` afterwards, so that Chrome embeds the JPEGs as they are and the PDF stays under 1 MB.
3. **Print pass.** Prints the document with the three JPEGs as full-page images on a named page with no margins, so they have **no text layer**, no header and no footer. Chrome must print exactly 18 pages.
4. **Pinned dates.** The PDF's CreationDate and ModDate are rewritten to `PDF_DATE` in `content.mjs` (the issue date, Sun 8 Mar 2026, 07:00 GST). Chrome's stamp has the same length, so the offsets stay valid, a rebuild of unchanged content writes the same bytes, and the file is never dated after the demo's "today".

### Traps this avoids
- **Fonts.** Times New Roman (body) and Arial (headings, tables) come back from `pdftotext` in logical order. Geeza Pro and Al Nile came back with broken ligatures.
- **What pdftotext does to Arabic,** which `verify.mjs` normalises on both sides before comparing: it adds bidi control marks; it returns every lam-alef ligature reversed ("لا" as "ال"); it returns Arial's rial ligature "ريال" as "لاير"; and it moves the digits and signs of a number in brackets ("(1%)" comes back as "( )%1"). So an anchor is matched in two parts: the Arabic words in order, with digits, Latin and punctuation removed; and its numbers, the reference and other Latin tokens, each of which must be on the page. Diacritics and tatweel are stripped.
- **The watermark is one element per page, not `position: fixed`,** which would also print over the scanned images and give them a text layer. On the scanned pages it is inside the image; verify checks it on the scan sheets before rasterising. Rotated Arabic comes back too scattered to match, so verify checks the English line's letters in the diagonal text (as the hero's verify does), and the Arabic line is in the same element.
- **Headless Chrome on macOS doesn't exit** after printing. The build waits for the "written" signal, stops it, and gives up after 90 seconds. Each run uses a throwaway profile in `.out/`.

## Rules for editing the content
1. **Text pages use Western digits; the three scanned pages use Eastern Arabic digits** (`ea()` in `template.mjs`, which also uses the Arabic thousands separator ٬).
2. **Keep every `ANCHORS` phrase and token on its page.** The record's page chips open the PDF at these pages. `EXCLUSIVE` keeps each side of a catch on one page: `1%` only on p. 5, `36.5` only on p. 14.
3. **No prices.** Verify fails if any amount in rials appears other than the two qualification thresholds (OMR 10,000,000 and 20,000,000, p. 13) and the bond form's fixed OMR 300,000 (p. 17), and it must see those three to pass. The BOQ pages and the CSV carry quantities only.
4. **Keep the record's quotes in step.** Every `source` in `src/data/extracted/gcc/ilra-042.ts` is checked against the page it cites: text pages through `pdftotext`, scanned pages against the sheet's own text (what OCR would read). Write each record entry on one line, with `page:` before `source:`.
5. Clauses run 1–40 in order, and the build checks this.

## Page map (as built)

| Page | Content | Clauses | Catches and key facts |
| --- | --- | --- | --- |
| 1 | Cover: Sultanate of Oman, the Authority, "general tender documents", the reference, title, Sun 8 Mar 2026 / 19 Ramadan 1447 H (approx.), two envelopes, Sohar | | |
| 2 | Invitation: eligibility, key data, timetable (site visit 15 Mar 09:00; questions 24 Mar; submission 26 Apr 12:00; opening 12:30) | | |
| 3 | Contents, tender documents, order of precedence | | |
| 4 | Instructions: definitions, subject, eligibility, documents, questions, site visit | 1–6 | Answers within 7 days of the questions deadline |
| 5 | Language (Arabic prevails; Arabic-only bids), currency, prices and VAT 5%, validity 90 days, Omanisation plan, **bid bond 1%** | 7–12 | **Catch 1** (instructions side) |
| 6 | Envelopes, submission, late bids, opening, evaluation (70 of 100 to pass; 30/30/20/20), award | 13–18 | |
| 7 | Performance bond 5%, advance 10% against an equal guarantee, payment 56 days, retention 5%, 30 months + 12 | 19–23 | |
| 8 | Delay damages 0.05% a day capped at 10%, subcontracting, **SMEs "at least 10% of the contract"**, Omanisation, insurance, fixed prices, law | 24–30 | **Catch 4** (value or number of subcontracts?) |
| 9 | Scope: km 24+000 to 62+000, **38 km**, two bridges (Wadi Al Jizzi, 192 m: a 64 m main span and four 32 m approach spans; km 41 overpass, 2 × 34 m), drainage, lighting, markings, traffic | 31 | **Catch 2** (scope side) |
| 10–11 | Technical requirements: earthworks, pavement layers, aggregates, drainage, bridges (an in-situ post-tensioned box girder for the 64 m main span, precast prestressed beams for the approach spans and the overpass; bearings and joints from approved makers), lighting, markings, QHSE | 32–40 | |
| 12 | Qualification (1): rows 1–5 (CR, Tender Board roads and bridges Excellent, chamber, ISO 9001/14001/45001, approved national roads programme contractor), other documents (Omanisation certificate…) | | |
| 13 | Qualification (2): rows 6–9 (two dual-carriageway contracts of OMR 10 M or more in 10 years; **a bridge with a 60 m span, or a named specialist subcontractor**; SME 10%; average turnover OMR 20 M or more over 3 years), joint ventures, declaration | | **Catch 5** |
| 14 | Annex 1: drawings list, 179 sheets; G-001 "general layout, **36.5 km**" | | **Catch 2** (drawings side) |
| 15 | **Scanned.** Annex 2: BOQ summary, 20 lines in 7 bills, Eastern Arabic digits; the stamp covers the quantities of 4.02 (box culverts) and 4.05 (pipes) | | **Catch 3** |
| 16 | **Scanned.** Annex 3: site-visit certificate form, blank, with the committee's approval stamp (08/03/2026) | | |
| 17 | **Scanned.** Annex 4: Form of Bid Bond, "an amount not exceeding (٣٠٠٬٠٠٠) three hundred thousand Omani rials", valid 28 days past the bid's validity; the bank's fields blank, with the committee's approval stamp | | **Catch 1** (form side) |
| 18 | Annex 5: Form of Bid ("the Arabic text is the authoritative text") | | |

## BOQ and packages (the contract with the Stage 2 data)
`BOQ` in `content.mjs` is the one list behind the scanned summary (lines marked `summary`) and the CSV (all 38 lines). The detailed BOQ has 214 lines (`BOQ_TOTAL_LINES`), priced by bidders in the electronic file.

| Package | Lines |
| --- | --- |
| P-01 Asphalt and bitumen supply | 3.06, 3.08, 3.10 |
| P-02 Aggregates (quarry supply) | 3.01, 3.03, 3.05 |
| P-03 Precast box culverts and drainage pipes | 4.02, 4.03, 4.05 |
| P-04 Bridge bearings and expansion joints | 5.12, 5.13, 5.14 |
| P-05 Street lighting: poles and LED luminaires | 6.01, 6.03, 6.05 |
| P-06 Road markings, signage and safety barriers | 7.01, 7.02, 7.04, 7.05, 7.06, 7.08 |
| In-house | Bill 1, Bill 2 (earthworks), laying of paving (3.12, 3.14), installation of drainage (4.08, 4.10), bridge structure (5.03, 5.06, 5.07, 5.09), cabling (6.06) |
