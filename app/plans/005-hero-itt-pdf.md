# 005 — Hero tender booklet PDF

Status: DONE (2026-09-25) · Depends on: none (content comes from gcc-demo-data §4) · Can run in parallel with: 002, 003, 004. **Parallel run:** read "Running wave 1 in parallel" in `app/plans/README.md` first.

## Goal
The demo has a real-looking, 48-page Saudi-style tender booklet PDF for the synthetic hero tender. A presenter can upload it, or show it "captured from Etimad". Clicking any extracted value in the app opens the PDF at the right page, where the value really is, with seeded flaws a sharp tendering engineer would spot.

## Context
- **Why:**
  - s1-s3-demo-spec §17 script A (portal to Pursue) and M-1/M-2;
  - gcc-demo-data §4 (hero identity, dates, terms, PQ lines, seeded flaws §4.6, BOQ §4.8, **page map §4.9**).

  The real Middle East samples are past-dated, and one is only a PQ document, so the scripted story runs on this synthetic booklet.
- **Structure source:** the Saudi Ministry of Finance model booklet for general construction works. A clause-by-clause outline in English is in `docs/08-sample-tenders/middle-east/research/ksa-booklet-outline.md` (local, gitignored). Use it for headings and wording style. **Paraphrase; don't copy long passages.**
- **Tools available on this machine:** Google Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headless `--print-to-pdf`) and poppler (`pdftotext`, `pdftoppm`). Node ≥ 18. **No new npm dependencies.**

## Scope
**Files to create:**
- `app/scripts/hero-itt/content.mjs`: structured content, page by page.
- `app/scripts/hero-itt/template.mjs`: HTML and print CSS.
- `app/scripts/hero-itt/build.mjs`: writes the HTML to a temp file and runs headless Chrome to print the PDF.
- `app/scripts/hero-itt/verify.mjs`: checks page anchors with `pdftotext`.
- `app/scripts/hero-itt/README.md`: how to rebuild.
- `app/public/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf`: the output, committed.
- `app/public/bids/gcc/ECWS-PRJ-2026-0147-BOQ.csv`: Vol. 2, bill summary with the representative lines (optional; see 3.3).

**Files to change:** `app/package.json`: add scripts `"hero-itt": "node scripts/hero-itt/build.mjs && node scripts/hero-itt/verify.mjs"`. No dependency changes.

**Out of scope:**
- Any `src/` change: upload recognition is plan 007; the data record is plan 004.
- Arabic body text: the booklet is English, and states that Arabic prevails.
- Real logos.
- Anything that implies a real issuer.

## Steps

### Phase 1 — Content (`content.mjs`)
- [x] 1.1 Export `PAGES`: an array of 48 page objects `{ n, part, blocks: [...] }`, where blocks are headings, paragraphs, numbered clauses, tables and key–value lists. Follow gcc-demo-data **§4.9 exactly**. Every page must have enough text to look real (roughly 250–450 words, or a full table).
- [x] 1.2 Cover (p. 1):
  - "Kingdom of Saudi Arabia" line;
  - issuer **Eastern Cities Water Services Company (ECWS)**, Projects Department;
  - the tender title;
  - reference **ECWS/PRJ/2026/0147**;
  - issue date **Sunday 8 March 2026**, with the Hijri date shown as "corresponding to 19 Ramadan 1447 H (approx.)";
  - "Terms and Specifications Booklet: General Construction Works".
- [x] 1.3 Put these **anchor facts** on exactly these pages (verify.mjs checks them):

  | Page | Anchor text (must appear verbatim) |
  | --- | --- |
  | 4 | `Deadline for questions: Wednesday 18 March 2026` · `Bid submission deadline: Sunday 10 May 2026, 10:00` · `Site visit: Tuesday 17 March 2026, 10:00` · `valid on the date of bid opening` |
  | 6 | `25%` (abnormally low bids) |
  | 7 | `30% of the contract value` (subcontracting) · `certified by the Chamber of Commerce` |
  | 8 | `Annex (8)` (the wrong annex reference, flaw 4) |
  | 9 | `the Arabic text shall prevail` |
  | 10 | `90 days from the date of bid opening` |
  | 11 | `inclusive of all taxes, fees and expenses` (VAT not named: flaw 6. **Do not write "VAT" anywhere in the booklet.**) |
  | 12 | `Initial guarantee: 1% of the total bid value` (flaw 1, first half) |
  | 18 | `5% of the contract value` · `fifteen (15) working days` |
  | 19 | `shall not exceed [ %]` (flaw 2) · `20% of the contract value` |
  | 23 | `TSE transmission pipeline, DN1000 GRP, approximately 16 km` (flaw 7, first half) |
  | 33 | `minimum local content of 40%` · `Annex (10)` |
  | 35 | `The initial guarantee shall be 2% of the total bid value` (flaw 1, second half) |
  | 36 | `advance payment not exceeding 10%` · `final invoice` |
  | 38 | `Water and Sewage Works, Grade 1` · `two (2) completed sewage treatment plants` · `100,000 m3/day` |
  | 39 | `last three (3) financial years` · `SAR 1,200,000,000` (flaw 8: the ambiguity stays; don't define which years) |
  | 40 | `ISO 90001` (flaw 5) |
  | 42 | `pass mark of 70` |
  | 43–46 | the 11 bill titles from §4.8 and a line count per bill summing to `236` |
  | 47 | `TSE Transmission Line, 18 km` (drawing title; flaw 7, second half) |
  | 48 | `Bid Letter` form |

- [x] 1.4 Clause 33 wording (the questions clause) must keep the ambiguity of flaw 3: answers are issued "within seven (7) days from that date", with no referent for "that date".
- [x] 1.5 BOQ summary pages (43–46): show quantities and units, **no prices**. The representative lines may mirror plan 004's `HERO_LINES` items and descriptions. If plan 004 hasn't landed, author them and list them in the README so 004 can align. The shares and line counts are the contract between the two plans.
- [x] 1.6 Tone: formal procurement English, paraphrasing the model booklet. Numbered clauses §1–§89 in the same order as the outline. Tables for the timetable (§4), required certificates (§6), PQ criteria (Annex 4) and evaluation weights (Annex 5).

### Phase 2 — Template and build
- [x] 2.1 `template.mjs`:
  - A4 pages; `@page { size: A4; margin: 20mm 18mm 22mm }`; one `<section class="page">` per page object with `break-after: page`;
  - a header on every page except the cover: "ECWS · Terms and Specifications Booklet · ECWS/PRJ/2026/0147";
  - a footer "Page N of 48";
  - a diagonal, light-grey watermark on every page: **"Synthetic document for demonstration"**;
  - serif body (Georgia or Times), sans headings;
  - one issuer device on the cover: a simple SVG drop-and-wave mark in green, clearly not a real logo.
- [x] 2.2 Pages must not overflow. `build.mjs` fails if Chrome produces a page count other than 48: check with `pdfinfo` or by counting `\f` in `pdftotext` output. Fix overflows by trimming text, never by shrinking fonts below 9.5pt.
- [x] 2.3 `build.mjs`: writes `scripts/hero-itt/.out/booklet.html`, runs Chrome with `--headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=<out>`, and writes the PDF to `public/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf`. It prints the file size, which must stay under 1.5 MB. Add `.out/` to `app/.gitignore` (or to `scripts/hero-itt/.gitignore`).

### Phase 3 — Verification
- [x] 3.1 `verify.mjs`:
  - runs `pdftotext -layout` per page (`-f N -l N`);
  - asserts every anchor in 1.3 is on its page (whitespace-normalised);
  - asserts the word "VAT" appears **nowhere**;
  - prints a pass/fail table.
- [x] 3.2 Render pages 1, 4, 12, 35 and 38 to PNG with `pdftoppm -r 60` into `.out/` and eyeball them for layout. Mention them in the Execution report; don't commit the PNGs.
- [x] 3.3 Optional: `ECWS-PRJ-2026-0147-BOQ.csv` with columns `item,bill,description,unit,qty`: the 11 bills plus the representative lines, no prices.

## Data and derivation
There are no app data or state changes. The PDF is a static asset that plan 007 links to. Plan 004 holds the matching extraction record, and both follow gcc-demo-data §4.9.

## Acceptance checks
- [x] `npm --prefix app run hero-itt` builds and verifies with every anchor passing, 48 pages, and no "VAT".
- [x] `npm --prefix app run build` still passes. The PDF is served at `/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf` in dev.
- [x] Opening the PDF in Chrome: the watermark is on every page, and the cover looks like a government booklet, not a web page.
- [x] No real company, real person or real logo. The issuer is the fictional ECWS.

## Execution report
Executor, 2026-09-25. Worked in the main checkout, and touched only this plan's files.

- **Changed files:**
  - New, in `app/scripts/hero-itt/`: `content.mjs`, `template.mjs`, `build.mjs`, `verify.mjs`, `README.md`, and `.gitignore` (ignores `.out/`).
  - New, in `app/public/bids/gcc/`: `ECWS-PRJ-2026-0147-booklet.pdf` (48 pages, 1,169 KB) and `ECWS-PRJ-2026-0147-BOQ.csv` (step 3.3 done).
  - Changed: `app/package.json`, with the one `hero-itt` script line. There are no dependency changes.
  - Changed: this plan, and 005's row in `app/plans/README.md`.
- **Verification:**
  - `npm --prefix app run hero-itt` exits 0 with **57/57 checks passing**:
    - every 1.3 anchor on its page, plus the flaw 3 wording on p. 10;
    - six one-page-only texts: 1% on p. 12, 2% on p. 35, 18 km on p. 47, `[ %]` on p. 19, `Annex (8)` on p. 8, `ISO 90001` on p. 40;
    - the 11 bill titles and line counts, with total 236;
    - no "VAT" and no "value added" anywhere;
    - the header on pp. 2–48 only, and "Page N of 48" and the watermark on every page;
    - 48 pages, and body text printed at its true size.
  - The build also checks that clauses run §1–§89 in order. It measures each page's fill before printing and fails on overflow or on anything wider than the page.
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass. The chunk-size warning was there before. The build copies the PDF to `dist/bids/gcc/`.
  - Dev server on :5173: `GET /bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf` returns 200, `application/pdf`, full size.
  - Step 3.2: pages 1, 4, 12, 35 and 38 are rendered to `scripts/hero-itt/.out/` on every verify run. I eyeballed them, and all 48 pages on contact sheets:
    - the cover reads as a government booklet (framed, issuer device, reference and date table);
    - the diagonal watermark is on every page;
    - there are no overflows or clipped cells.
  - Every page is between 67% and 96% full in print.
- **Deviations from plan:**
  1. **Typography.** The body is Times New Roman at 12pt, which the plan allows ("Georgia or Times"); tables are Arial 9.5pt and headings sans. I first used Georgia, but its old-style figures looked bookish in dates and tables. Georgia also made the screen measuring pass over-read page fill by up to a quarter; with Times and Arial the measurement matches the print within 2%.
  2. **Header and footer are CSS `@page` margin boxes**, which Chrome 131 and later supports. They are not elements in the page. The footer is on the cover too: the plan exempted only the header.
  3. **Extra build machinery**, all inside plan files:
     - a screen measuring pass (`--dump-dom`) that names the page that would overflow;
     - a watchdog that stops headless Chrome once it reports the file written. On this Mac it never exits after `--print-to-pdf` or `--dump-dom`.
  4. **verify reads anchors with `pdftotext -layout -nodiag`.** Without `-nodiag`, the diagonal watermark scatters letters through the text. The watermark itself is checked by comparing the letters with and without diagonal text.
  5. **PQ-08 "VAT registration"** reads in the booklet as "Tax registration … Zakat, Tax and Customs Authority" (Annex (4) criterion 2, p. 38). This keeps the "no VAT anywhere" rule and flaw 6. The app can keep its own label.
  6. **Part 11 (§77–§89).** The model booklet's special conditions are examples the entity replaces. Here:
     - §77 is the 2% guarantee;
     - §80 the advance payment, and §81 the retention and final invoice;
     - §84 the O&M option, §85 the maintenance period, and §86 key personnel;
     - the template's own examples fill the remaining numbers.
  7. **Annex (4) uses the booklet's own criterion numbers, 1–9**, not the app's PQ IDs. The mapping is in the hero-itt README.
  8. **Clause placement not fixed by §4.9:** §33 (flaw 3) is on p. 10. The BOQ representative lines are on pp. 44–46 (Bills 1–3, 4–7 and 8–11) after the p. 43 summary.
  9. **Additions:**
     - a one-line fictional-document disclaimer at the foot of the cover;
     - blank forms in Annex (4), for reference projects, financial information and key personnel, as real annexes carry them;
     - a staffing table (Table 7.1) on p. 29, per §4.9 "labour table".
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - **Plan 004:**
    - use the bill titles, line counts and representative items in `scripts/hero-itt/README.md` (or `BILLS` in `content.mjs`) for `HERO_BILLS` and `HERO_LINES`; 004 hadn't written them when this ran;
    - page refs that §4.9 leaves open: §33 answer period p. 10, §39 taxes p. 11, §57 final guarantee p. 18, §60 cap p. 19, and §34 site visit p. 10 (the timetable row is p. 4);
    - `HERO_CONFLICTS` pages as planned: 12/35 and 23/47.
  - **Plan 007:** open pages with `#page=N`.
  - **Plan 004 or 007:** gcc-demo-data §4.1 lists Vol. 2 as an XLSX. Only the CSV extract exists. If the demo needs a downloadable Vol. 2, that is new work (it would need an XLSX writer, which means a new dependency or a script outside this plan).
  - **PDF size:** 1.17 MB, under the 1.5 MB limit. Chrome embeds several subsets of each font; merging them would need a tool not on this machine (qpdf or Ghostscript).
