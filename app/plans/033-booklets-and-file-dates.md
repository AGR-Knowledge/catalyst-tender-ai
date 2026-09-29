# 033 — Every pursued tender has its booklet; file dates say what they are

Status: DONE (2026-09-29, reviewed) · Depends on: wave 10 (committed `4d3f6ee`) · Can run in parallel with: 034 (no shared file)

## Goal
Every tender we decided to pursue shows its tender booklet in the Library. Where the demo holds the real PDF it opens as today. Otherwise it opens as a watermarked booklet extract built from the tender's data. Every file's date says whether it was received, sent or made. Three small leftovers from the wave 10 review are closed: the supplier profile's crumb, the grid's header tooltips and the Load column's explanation.

## Context
- **Why:** from the wave 10 review (orchestrator, 2026-09-29), after the user asked for "the pdf from where these tenders were picked up" on every tender (plan 030):
  - T-2026-097 (Najd, Stage 3, Bid decision) has only its notice in `01 Tender documents`, although we bought and read its booklet months ago;
  - the "Received" column labels files we made or sent (our proposal, the DG packs, queries) as received;
  - 031 dropped the grid's header tooltip, because AG Grid's `TooltipModule` isn't registered;
  - the supplier profile's crumb reads "‹ Suppliers │ Supplier", and the second word adds nothing.
- **Current behaviour:**
  - `domain/gcc/library/documents.ts`:
    - `heldFiles(c)` adds the booklet (`kind: 'booklet'`, `view: { kind: 'url' }`) and its BOQ CSV only when `c.doc` (`documentFor(tenant, id)`) exists, which is only for the tenders with a PDF in `public/bids/gcc/`;
    - the notice facsimile is `noticeSpec`, built with `facsimileHtml` (`facsimile.ts`), with its pages from `pagesOf(spec)`;
    - the booklet purchase receipt (02 Correspondence) is dated `t.intake.purchasedAt`.
  - `LibCtx` (`context.ts`) gives each builder the lifecycle `l`, the register row `t` (live tenders only), the held document `doc`, the reference, the issuer and `can()`.
  - `LibraryFileVM` (`types.ts`) has `receivedAt`, `source`, `by`, `tags`, `extent`, `view`. Two places show `receivedAt`:
    - the file list's column "Received" (`pages/gcc/library/LibraryBrowser.tsx:~101`, `whenCell`);
    - the viewer header line "… · Received {when} · By …" (`components/tender/FileViewer.tsx:~211`).
  - Folder builders: `documents.ts` (01, 02), `decision.ts` (03), `sourcing.ts` (04), `proposal.ts` (05, 06, 07), `uploads.ts` (added files).
  - Grid modules are listed in `components/dashboard/grid/agGrid.ts` (`GRID_MODULES`, AG Grid Community v36 modules); `TooltipModule` is not among them.
  - `pages/gcc/suppliers/SupplierProfile.tsx:~116`, `BackBar`, renders "Suppliers │ Supplier". The supplier's name, standing and pills are already in the header below it.
  - `pages/gcc/suppliers/Suppliers.tsx`: the Load cell is two lines ("Medium" over "2 with us", decision B5 of plan 031). "Load" means the supplier's whole order book, across all its clients (decision B1). Only the ⓘ on the profile says so.
- Read first: `/CLAUDE.md`; `app/plans/README.md` (architecture decisions, the wave 10 and 10b sections); plan 030's Design (folders, facsimiles, masking); `docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md` §4.1 (the Library tab). User's UI taste:
  - every row has the same anatomy;
  - never show a thing twice;
  - status is a word, never a coloured stripe.

## Design

### 1. The booklet extract
- **Which tenders:** every tender with no held document (`!c.doc`) whose lifecycle has a DG1 **Pursue**, live or closed. That covers every tender that reached Stage 2, and every result in the history. A tender discarded or held at DG1 keeps only its notice: we never bought its booklet.
- **The file row** (in `01 Tender documents`, after the notice, where the held booklet sits today):
  - name: `fileName(c.prefix, 'Tender booklet (extract)')`, e.g. `WCWS-PRJ-2026-0009 Tender booklet (extract).pdf`;
  - title: "Tender booklet (extract)"; type PDF;
  - source: the tender's own source (portal, email or scan);
  - date received: `t.intake.purchasedAt` where the booklet was bought (it must equal or follow the receipt in 02); otherwise the DG1 Pursue time plus two working hours, snapped to working hours with `domain/calendar.ts`;
  - by: the issuer; extent: the extract's own page count (`pagesOf`); tags: "Extract".
  - An Arabic tender (`lang: 'ar'`) gets the "AR" badge and a line in the extract pointing to the Arabic original, as the notice does.
- **The extract** (`facsimileHtml`, the same letterhead, watermark and scanned look as the notice). Its sections all come from data. A section with no data is left out, never filled with made-up text.
  1. Cover: issuer, "Tender booklet", title, reference, procurement type, country and city, and the issue date (the notice's publication date).
  2. Contents: the booklet's parts as a list. Instructions to tenderers; Conditions of contract; Scope of works; Bill of quantities; Forms and bonds. It carries no page numbers, because the extract isn't the whole booklet.
  3. Instructions to tenderers: key dates (`t.keyDates`, or the lifecycle's submission deadline), where and how to submit (the portal's name from the source), the document fee where the data has one (`t.documentFee`), and the validity and bid bond lines where the requirements hold them.
  4. Eligibility and requirements: a table of the register row's requirements (`t.requirements`: field, value, page) where the tender has them.
  5. Scope of works: sector, the title's work type, and the value basis. Say "Estimated value" only where `value.basis === 'published'`, as the notice does; otherwise leave the value out.
  6. A closing note: "Extract prepared from the tender record for this demonstration. The full booklet has {n} pages". Use the page count only where the data has it; otherwise leave the second sentence out.
- **Masking:** none beyond today's. The booklet is the employer's document and every viewer of the tender may read it, as the held booklet is today.
- **The BOQ:** unchanged. A tender without a held BOQ CSV shows no BOQ file: this plan adds no generated BOQ.

### 2. What a file's date means
- `LibraryFileVM` gains `dated: 'received' | 'sent' | 'made'`, set by each builder:
  - received: the notice, booklets, addenda, received copies, the employer's replies and letters, the portal's submission receipt, the award or regret letter, supplier quotes and declines;
  - sent: queries we sent, RFQs we sent, anything else that left the company;
  - made: DG packs and records, proposal drafts, evidence files, files people add in the demo.
- The file list's column header becomes **Date**, and each cell keeps its date and time.
- The viewer's header line reads "Received {when}", "Sent {when}" or "Made {when}" by `dated`.
- The `/library` search results use the same column.
- No file is re-dated: only the word changes.

### 3. The supplier profile's crumb
- `BackBar` shows "‹ Suppliers" only; the "│ Supplier" part goes. The header below already names the supplier.

### 4. Header tooltips on grids
- Add `TooltipModule` to `GRID_MODULES` in `components/dashboard/grid/agGrid.ts`, with a one-line comment in the file's style. It is part of AG Grid Community, the library we already use, so no new library comes in.
- On the Suppliers master, give the Load column `headerTooltip: 'The supplier’s whole order book, across all its clients. The second line is its jobs for us now.'` and On time `headerTooltip: 'Share of deliveries on time in the last 12 months. The second line is NCRs raised in the same 12 months.'`.
- Check that no other grid's markup changes and that the development console shows no AG Grid error about tooltips.

## Scope
- **Files:**
  - `domain/gcc/library/**`;
  - `pages/gcc/library/LibraryBrowser.tsx` (and `Library.tsx` where the search grid reads the column);
  - `components/tender/FileViewer.tsx`: the header line only;
  - `components/dashboard/grid/agGrid.ts`: one module;
  - `pages/gcc/suppliers/SupplierProfile.tsx`: `BackBar` only;
  - `pages/gcc/suppliers/Suppliers.tsx`: two `headerTooltip`s only;
  - `pages/gcc/dev-checks/56-library.tsx`: new rows;
  - this plan and its README row.
- **Out of scope:**
  - any change to the lifecycles, tenants or generated history (plan 034 owns `data/gcc/lifecycle/**`, `data/gcc/tenants/**`, `data/gcc/portfolio.ts` and `data/tenants.ts`);
  - a generated BOQ;
  - new PDFs in `public/`;
  - the pdf.js citation viewer.

## Steps
### Phase 1 — The booklet extract
- [x] 1.1 In `documents.ts`, add `bookletSpec(c)`, built from data only (Design §1): cover, contents, instructions, requirements, scope and the closing note. Leave out any section with no data.
- [x] 1.2 Add the extract row in `01 Tender documents` for every tender with no held document and a DG1 Pursue, dated as Design §1 says. Tag it "Extract".
  - [x] 1.2.1 Its date equals or follows the booklet receipt in 02 wherever both exist.
  - [x] 1.2.2 A discarded or held tender has no extract.
- [x] 1.3 Arabic tenders: "AR" badge, and the line pointing to the Arabic original.
- [x] 1.4 Verify it on:
  - T-2026-097 (Najd, Stage 3);
  - T-2026-104 (Najd, Stage 2);
  - a lost history tender (T-2025-270);
  - a won one (T-2025-262);
  - a Corniche and a Qurain tender;
  - the hero, which still shows its real PDF and no extract;
  - T-2026-128 (Stage 1, no DG1 yet), which shows no extract.

### Phase 2 — Dates that say what they are
- [x] 2.1 Add `dated` to `LibraryFileVM`, and set it in every builder (Design §2).
- [x] 2.2 The column header becomes Date, and the viewer line uses the right word.
- [x] 2.3 Check one file of each kind in the viewer: a notice, a query sent, a DG2 pack, a quote, an added file.

### Phase 3 — Small leftovers
- [x] 3.1 The profile's crumb: "‹ Suppliers" only.
- [x] 3.2 `TooltipModule` in `GRID_MODULES`; the two header tooltips on the Suppliers master. Hovering Load and On time shows them, with no console error.

### Phase 4 — Checks
- [x] 4.1 Add rows to `56-library.tsx`, each across the five tenants:
  - every tender with a DG1 Pursue and no held document has exactly one booklet extract in 01;
  - no tender without a Pursue has one;
  - the extract's date equals or follows the booklet receipt where both exist;
  - every file has a `dated` word;
  - no two files in one tender share a name.
- [x] 4.2 Typecheck and build pass. `/dev/checks` has no failing row in any tenant, and you report the counts.
- [x] 4.3 Click through at 1280 and 1440, light and dark, with no console errors:
  - as the Head of Tendering, the Tender Coordinator and the Procurement Lead in Najd;
  - T-2026-061 in Corniche;
  - T-2026-042 in Batinah (Arabic).
- [x] 4.4 Reset demo returns every library to its seed state (this plan adds no demo state).

## Data and derivation
- Every value in an extract comes from `src/data` through the builders, never typed into a page (app rule 1).
- The extract is built only when viewed (`facsimileFile(spec, pages)`), as the notice is, so `/library`'s counts stay cheap.

## Acceptance checks
- T-2026-097's Library shows the notice and "Tender booklet (extract)" in `01 Tender documents`. The extract opens in the right-hand panel with its watermark, and shows the tender's reference, key dates and requirements.
- Every pursued tender in every tenant has a booklet: the real PDF where the demo holds it, the extract otherwise. No discarded tender has one.
- The file list's date column reads "Date". The viewer says Received, Sent or Made, and our own DG2 pack reads "Made …".
- The supplier profile's crumb reads "‹ Suppliers".
- Hovering the Suppliers master's Load header explains that it is the whole order book.
- Typecheck, build and every dev check pass.

## Execution report
(Filled in by the executor, 2026-09-29.)

- **Changed files:**
  - `domain/gcc/library/types.ts`: `FileDated` ('received' | 'sent' | 'made'), `DATED_WORD`, and `LibraryFileVM.dated`.
  - `domain/gcc/library/context.ts`: `fileOf` requires `dated`, so every builder states it.
  - `domain/gcc/library/documents.ts`:
    - `dg1PursueOf`, `plusWorkingHours`, `bookletAt`, `bookletSpec` and the extract row (`bookletExtract`, kind `booklet-extract`, tag "Extract"), placed after the notice;
    - `issuedOf`, `whereOf` and `keyDateText`, now shared with the notice (its output is unchanged);
    - `dated` on every 01 and 02 file.
  - `domain/gcc/library/{decision,sourcing,proposal,index}.ts`: `dated` on every file. `index.ts` also re-exports `FileDated` and `DATED_WORD`.
  - `components/tender/FileViewer.tsx`: the header line only ("Received / Sent / Made {when}").
  - `pages/gcc/library/LibraryBrowser.tsx`: the column header reads "Date". `/library`'s search uses the same `FileGrid`, so `Library.tsx` is unchanged.
  - `components/dashboard/grid/agGrid.ts`: `TooltipModule`, with a one-line comment.
  - `pages/gcc/suppliers/SupplierProfile.tsx`: `BackBar` shows "‹ Suppliers" only.
  - `pages/gcc/suppliers/Suppliers.tsx`: the `headerTooltip`s on Load and On time, with the plan's wording.
  - `pages/gcc/dev-checks/56-library.tsx`: rows 13–18, and the title "(plans 030, 033)".
- **Verification:**
  - `npm --prefix app run typecheck` and `run build` pass. The build's chunk-size warning predates this plan.
  - `/dev/checks`, every tenant, headless Chromium against the running dev server:
    - no failing row and no crashed panel;
    - "✓ Pass" rows: Najd 952 (wave 10's 946 plus 6), Corniche 543, Dafna 524, Batinah 532 (526 plus 6), Qurain 547;
    - the Tender library panel passes 18 of 18 in each tenant.
    - Plan 034 is editing data in the same checkout, so its own panel's counts may move.
  - Extracts on the seed, pursued at DG1 without a held PDF: Najd 72, Corniche 49, Dafna 38, Batinah 53, Qurain 66. Each tender has exactly one, and no other tender has one.
    - The only seeded tender that bought its booklet, T-2026-109, dates its extract 3 Mar 11:14, the same minute as its purchase receipt.
    - Every file has a `dated` word. In Najd: 349 received, 193 sent, 650 made.
    - No two files in one tender share a name.
  - Step 1.4, in the browser at 1440 light as the Head of Tendering:
    - T-2026-097: its 01 shows the notice (11 Jan 08:40) and the extract (11 Jan 12:30, 2 pages). The extract shows the letterhead, "Tender booklet", the reference, the procurement type, the location, the contents, the submission and opening dates, "Electronically, through Etimad", "Bid bond 2% of the tender price, valid for 120 days from bid opening", the scope and the watermark on both pages.
    - T-2026-104 (26 Feb 11:50), T-2025-270, lost (29 Oct 2025 13:00), and T-2025-262, won (20 Oct 2025 12:00), each have an extract.
    - Corniche T-2026-029 (28 Jan 13:40, beside its invitation email) and Qurain T-2026-058 (10 Feb 14:00) each have an extract.
    - The hero, T-2026-061 and T-2026-042 show their real PDF and BOQ, with no extract.
    - T-2026-128 shows its letter only.
  - The Arabic case, step 1.3: no seeded tender that needs an extract is Arabic. A DG1 Pursue recorded on T-2026-128 (an Arabic scanned letter) gives an extract tagged AR, with "Read from the Arabic original by the Intake & Extraction agent. The Arabic text prevails." Row 18 of the check covers this.
  - Step 2.3, the viewer lines:
    - notice: "Etimad · Received Thu 16 Oct 2025 10:00";
    - DG2 pack: "… · Made Tue 11 Nov 2025 16:00";
    - quote: "Received Tue 3 Mar 11:20";
    - RFQ: "Sent Thu 26 Feb 14:10";
    - proposal as submitted: "Sent Tue 16 Dec 2025 09:30";
    - award: "Received Tue 24 Feb 11:00";
    - hero Query 01, sent in the demo: "Sent Sun 8 Mar 10:04"; a draft query: "Made Sun 8 Mar 07:44";
    - a file added through Add file: "Made Sun 8 Mar 10:00".
  - Phase 3:
    - the profile's top bar reads "Suppliers" only;
    - hovering the master's Load and On time headers shows the two tooltips;
    - no other grid sets a tooltip prop, so no other grid changes;
    - no console error or warning from AG Grid.
  - Step 4.3: at 1280 and 1440, light and dark, as Najd's Head of Tendering, Tender Coordinator and Procurement Lead, Corniche's Head of Tendering on T-2026-061, and Batinah's on T-2026-042 (Arabic). For each I checked the Library tab (header Date), the file viewer on the booklet and a `/library` search for "booklet". There were no console errors and no sideways page scroll. The facsimile stays white paper in dark mode.
  - Step 4.4: adding a file raises `/library` from 1,192 to 1,193 files, and the file is still there after a reload. Settings › Reset demo › Reset this company returns it to 1,192. The extract adds no demo state.
- **Deviations from plan:**
  1. **`dated` is optional on `LibraryFileVM`** and required through `fileOf`. Plan 031's `supplierDocumentsFor` (`domain/gcc/suppliers/documents.ts`, outside this plan) builds the same shape. A file without `dated` reads "Received", which is right for a supplier's own certificate.
  2. The extract's `kind` is `booklet-extract`, not `booklet`. Read in English (`bookletExtra.tsx`) and check 3 stay on held PDFs only.
  3. The requirements table's last column is headed "Booklet page": its pages are the full booklet's, not the extract's.
  4. **The closing note never carries the page count.** No data holds the full booklet's page count for a tender without a held PDF.
  5. **The Instructions section:**
     - "Where to submit" appears only when the source is a portal. Mailbox and scan sources have no data on how to submit.
     - It doesn't read `submission.portal`: some history submissions name our own mailbox.
     - The key dates leave out Published, which is on the cover, and the two validity dates.
     - Bid validity is read from the `validity-end` key date.
     - The bid bond line is read from the tender's bond terms (`s1Data(tenant).bonds`: rate or fixed amount, validity days, or the `bond-validity-end` date). It doesn't use `bidBondFor`, whose wording is our reading of the terms, with page chips and conflict notes.
  6. **Work type:** the title after the city ("Madinah WTP expansion" gives "WTP expansion"). Otherwise, the longest work type from the sector's pool that the title contains. `POOLS` is imported read-only from 034's `pools.ts`.
  7. **Which Pursue counts:** the first DG1 Pursue record. A Pursue re-opened later still has its booklet: we already hold it.
  8. **The working-hours rule:** 08:00 to 17:00, as `lifecycle/fold.ts` keeps them, in the company's calendar (`profileOf(tenant).countryCode`). The helper `plusWorkingHours` is in `documents.ts` and uses `isWorkingDay` and `addDays` from `domain/calendar.ts`. `calendar.ts` has no hours helper, and it isn't in this plan's files.
  9. **Dated words where the plan left a choice:**
     - query drafts and approved queries: Made;
     - uploaded copies of a received document: Received;
     - the DG2 decline letter: Sent, unless it is an unsent draft in the demo;
     - proposal files, the form of tender and the bid bond: Sent once submitted, Made before.
  10. The check has six new rows, not five. Row 18 proves the live path: a DG1 Pursue recorded in the demo adds the extract, and the Arabic case.
- **Blockers / questions:**
  - **Q1. The extract's date after a Pursue recorded live in the demo.** The plan's rule is the Pursue plus two working hours. A Pursue at 10:20 on demo day gives "Received Sun 8 Mar 12:20" while the demo clock reads 10:20. In Corniche, where Sunday is a weekend day, it gives "Mon 9 Mar 10:00". No seeded file is affected: no seeded DG1 Pursue falls on 8 Mar. Recommendation: a Pursue recorded at or after the demo clock dates its booklet at the Pursue's own minute (downloaded straight away). That is a one-line change in `bookletAt`. The plan's rule is implemented as written until you decide.
    - **Decided (orchestrator, 2026-09-29): as recommended.** A Pursue on demo day dates the booklet at its own minute (`bookletAt` in `documents.ts`). Dev check 56 row 18 asserts the extract is never dated after the Pursue (T-2026-117: 2026-03-08T10:20).
- **Follow-ups noticed (not done):**
  - The `.spf-crumb` rule in `pages/gcc/suppliers/profile.css` is now unused.
  - `supplierDocumentsFor` (plan 031) could set `dated: 'received'` explicitly.
  - `whenCell` (`LibraryBrowser.tsx`) and `whenText` (`FileViewer.tsx`) are the same function, and that duplication predates this plan.
  - s1-s3-demo-spec §4.1 could mention the booklet extract and the Date column.
