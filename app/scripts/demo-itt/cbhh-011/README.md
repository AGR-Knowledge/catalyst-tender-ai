# Second demo tender document (synthetic): CBHH/PRJ/2026/011

This folder generates **Vol. 1 of the second demo tender**, T-2026-061 (plan 022). It is a 20-page, English, UAE-style Invitation to Tender for a fictional hospital MEP works package in Abu Dhabi, and it is Corniche's tender only. It is a dev-only tool, and its output is committed:

- `public/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf`: the document. In dev it is served at `/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf`.
- `public/bids/gcc/CBHH-PRJ-2026-011-BOQ.csv`: the Vol. 2 extract, with the eight employer work packages and five representative lines each (`item,package,description,unit,qty`). It has no prices.

The content follows gcc-demo-data **§4A** and its page map. The extraction record `src/data/extracted/gcc/cbhh-011.ts` cites the same pages. Everything in the document is fictional: the employer, the hospital, the reference and the contacts. Every page carries the watermark "Synthetic document for demonstration".

## Rebuild

```bash
npm --prefix app run demo-itt:cbhh   # build, then verify; exits non-zero on any failure
```

You need the same tools as `scripts/hero-itt`: Google Chrome at `/Applications/Google Chrome.app` (or set `CHROME_PATH`), poppler (`pdftotext`, `pdfinfo`, `pdftoppm`) and Node 18 or later. There are no npm dependencies. `build.mjs` works as the hero's does: it measures page fill first, then prints with headless Chrome. The traps are listed in `scripts/hero-itt/README.md`. Unlike the hero's, it then pins the PDF's CreationDate and ModDate to `PDF_DATE` in `content.mjs` (the issue date, Sun 8 Mar 2026, 07:00 GST), so a rebuild of unchanged content writes the same bytes and the file is never dated after the demo's "today".

| File | Role |
| --- | --- |
| `content.mjs` | Everything printed: `PAGES` (20 page objects of blocks), `META`, `PARTS` and `BILLS`. Also the checks' data: `ANCHORS`, `EXCLUSIVE` and `NEVER` |
| `template.mjs` | The hero's template with a blue accent, its own device and cover labels. Sub-clause numbers ("4.4", "14.2") print without a trailing full stop |
| `build.mjs` | Checks the content's shape: 20 pages, instructions to tenderers 1–18, and work package lines summing to 186. Measures fill, prints, checks the page count and size, and writes the CSV |
| `verify.mjs` | Reads the PDF with `pdftotext` and prints a pass/fail table. Renders pages 1, 6, 11, 14 and 19 to PNG in `.out/` |

## Rules for editing the content
1. **Keep every `ANCHORS` text verbatim on its page.** The app opens the PDF at these pages when a user clicks an extracted value. Wrap an anchor in a table cell in `nw()`.
2. **Each side of a conflict stays on one page** (`EXCLUSIVE`):
   - the bond validity: "remain valid for one hundred and twenty (120) days" (p. 6) against "(150) days" (p. 19, Annex C);
   - the chiller capacity: "1,500 TR" (p. 11) against "1,750 TR" (p. 14).
3. **Never write that an Arabic text prevails** (`NEVER`). This tender is governed by its English text (clause 7.2 on p. 5, and Sub-Clause 1.4 on p. 8), so the "Arabic prevails" flag must not be raised on it.
4. **Keep the catches as they are:**
   - Don't give a date for the answers to questions (clause 5.3 on p. 4: "issued to all tenderers as a circular").
   - Don't name the emirate of the chamber of commerce (Q-03 on p. 15).
   - Keep the medical gas installer "approved for medical gas pipeline systems", working to HTM 02-01 or NFPA 99 (p. 13 and Q-09 on p. 15).
5. **No prices in the BOQ pages** (pp. 16–17). The verify step fails if "AED", "Rate" or "Amount" appears there.

## Page map (as built)

| Page | Content | Anchors checked by verify |
| --- | --- | --- |
| 1 | Cover | `CBHH/PRJ/2026/011` |
| 2 | Contents (page numbers derived), tender documents | |
| 3 | Section 1: invitation and timetable | site visit Wed 11 Mar 10:00 · questions by Thu 19 Mar · submission Tue 21 Apr 14:00 |
| 4 | ITT 1–5: definitions, eligibility (no JV; named specialists), site visit, clarifications | `issued to all tenderers as a circular` (**catch 3**) |
| 5 | ITT 6–10: circulars, **language (English governs)**, currency and VAT, validity 120 days, alternatives | `VAT at 5%` · `120 days from the Tender Submission Date` |
| 6 | ITT 11–13: tender composition, **tender bond AED 2,000,000, valid 120 days**, submission | **catch 1**, first side |
| 7 | ITT 14–18: opening Tue 21 Apr 15:00, evaluation (pass mark 70; ICV 25% of the commercial score), award, performance security | |
| 8 | Particular Conditions 1.4, 1.5, 4.2 (performance 10%), 4.4 (subcontracting cap 35%), 4.6 | |
| 9 | Particular Conditions 8.2 (26 months), 8.8 (0.1% a day, capped at 10%), 11.3 (24 months), 14.2 (advance 10%), 14.3 (retention), 14.7 (60 days), 14.9, 18 | |
| 10 | Section 4: the project (220 beds), the package, interfaces | |
| 11 | 4.4 HVAC: **3 × 1,500 TR chillers** | **catch 2**, first side |
| 12 | 4.5–4.7: electrical, plumbing and water treatment, fire (Civil Defence) | |
| 13 | 4.8 medical gas (**an approved installer, HTM 02-01 or NFPA 99**), 4.9 ELV, BMS and nurse call, 4.10 testing and commissioning | **catch 4** |
| 14 | Section 5: equipment schedule, **CH-01 to 03 at 1,750 TR each** | **catch 2**, second side |
| 15 | Section 6: qualification requirements Q-01 to Q-10 | `Chamber of Commerce and Industry` (**catch 5**) |
| 16–17 | Vol. 2 BOQ summary: line items by work package (186 in all), then five representative lines each | |
| 18 | Vol. 3 drawings list | |
| 19 | Annex C Form of Tender Bond: **valid 150 days** | **catch 1**, second side |
| 20 | Annex D Form of Tender | |
