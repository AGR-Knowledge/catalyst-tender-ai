# 030 — Tender library and the file viewer

Status: READY · Depends on: wave 9b (committed `3a00f3f`) and the wave 10 contract (`.eq-row` in `styles/components.css`) · Can run in parallel with: 029, 031, 032 (031's documents step waits for this plan's Phase 1)

## Goal
Every tender has a library: the files it arrived as (the notice, the booklet, the BOQ, the addenda, each copy from each source) and everything made for it (queries, RFQs and quotes, the DG packs and records, our proposal, the result letter), in folders and sub-folders. Each file shows its name, where it came from, when and from whom. **View** opens it in an iframe in a panel on the right. People can add their own files, such as the proposal, to any folder. A company-wide **Tender library** page brings every tender's library together in one place.

## Context
- **Why:** the user's review, 2026-09-29:
  - "Tender documents: I am not able to see the PDF these tenders were picked up from. I should see the file name, source etc., and when I click View it should open in an iframe on the right-hand side."
  - "For every tender there can be multiple files or input sources. We need a tender library where all the input files are, and where we can store our proposal or other data, so all the data is in one place. If there are too many files, use sub-folders for a hierarchy."
- **Current behaviour:**
  - `pages/gcc/workspace/tabs/documents.tab.tsx` (plan 007b, 012) shows a "Tender documents" card only when the demo holds a document (`docOf` → `documentFor` in `domain/gcc/documents.ts`). The document is held only for the hero (T-2026-118, every tenant), T-2026-061 (Corniche), T-2026-042 (Batinah, Arabic), and three real sample documents (`GCC_DOC_FILES` in `data/extracted/gcc/index.ts`). For every other tender, e.g. Najd's T-2026-128 ("Scanned drop · Letter"), it says "The demo holds no copy of this tender's documents." It also shows a "Received from" list (the captured notice, `intakeToday` events, demo uploads), "Intake steps" (`IntakeSteps`) and one card per addendum (`addendaFor`) with its diff.
  - "Open the document" opens the booklet in the pdf.js viewer (`components/tender/SourceHost.tsx` → `components/intake/PdfViewer`), a right-hand drawer that highlights a value at a page. **That viewer stays for `SourceChip` citations** (a value at its page). This plan adds a separate viewer for whole files.
  - The workspace also opens tenders that exist only as lifecycles (the generated 12-month history, Stages 4–9): `port.rows(tenant, { kind: 'all' }, person, 'all', done)` in `Workspace.tsx`. They have no register row, so the library must work from the lifecycle alone (`queriesFor({ tenant, viewer, done }).one(id)`: title, sector, value, stages, gates, submission, result).
  - The Indian preview has a legacy `/library` route ("Artefacts library", `App.tsx:139`, `LegacyOnly`). GCC routes come from `pages/gcc/screens.ts`. A path both worlds use goes in `LEGACY_AT` in `App.tsx`, as `/suppliers` does.
- **Checked by the orchestrator:** a same-origin PDF in an `<iframe>` renders in the in-app browser pane (Chromium's own PDF viewer). `#page=1&navpanes=0&view=FitH` opens it at page 1 without the thumbnail pane.
- Read first: `/CLAUDE.md`, `app/plans/README.md` (architecture decisions; the wave 10 section), `docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md` §4.1 (workspace), §6.2 (intake steps), §6.8 (one tender, one ID: every copy listed, not logged twice), `roles-and-access.md` (masking), `ui-direction.md` (copy rules; status as words). User's UI taste: no coloured stripes; status is a word in a pill; every row of a list has the same anatomy; every colour has a stated meaning.

## Design

### The folder tree (fixed order; numbered like a real document system)
A folder with no file is left out, except **05 Our proposal**, which always shows so people can add to it.

| Folder | Holds (only what the data supports) | Source shown on each file |
| --- | --- | --- |
| **01 Tender documents** | The notice or invitation as it was captured (every tender has one). The booklet or ITT, where the demo holds it (the real PDF). The BOQ, where held (`public/bids/gcc/*-BOQ.csv`). Sub-folder **Addenda** (one file per addendum, `addendaFor`). Sub-folder **Received copies**: each further copy of a document that arrived (`intakeToday` events, demo uploads), each tagged "Duplicate of …" where intake linked it | The channel it came from: the portal (Etimad, Tanafos …), email, scanned drop, upload by a named person; with the time received |
| **02 Correspondence** | Clarification queries drafted, sent and answered (`domain/gcc/s1/queries`), with the authority's reply where the data has one; the booklet purchase receipt where the booklet was bought (`intake.purchasedAt`, `documentFee`) | "Sent by …" or "From the authority" |
| **03 Bid decision** | Sub-folders **DG1**, **DG2**, **DG3**, only for gates the tender has reached: the DG1 evidence pack and the DG1 record; the Bid / No-Bid pack (each issued version, `packVersionsFor`), the DG2 record and, for a No-Bid, the decline letter; the DG3 record | "Generated by the … agent" or "Recorded by …" |
| **04 Suppliers and quotes** | One sub-folder per package (`s2TenderOf(...).packages`): the RFQ as sent, and each quote received (`rfqsFor`, replies) | "Sent to …" or "From …, via the Supplier Portal" |
| **05 Our proposal** | Sub-folders **Technical**, **Commercial**, **Forms and bonds**. For a tender at Stage 6 or later (from its lifecycle), its proposal files (technical proposal, commercial proposal, bid bond, forms). Plus any file a person adds | "Prepared by …" or "Added by …" |
| **06 Company evidence** | The vault credentials this tender's eligibility check used (CR, classification, ISO certificates, audited accounts: `eligibilityFor` lines → credential ids), each linking to Company › Credentials | "From the credentials vault" |
| **07 Result** | The award letter or the regret letter, when the lifecycle has a result | "From the authority" |

File names look like a real contractor's files, e.g. `SRRWD-2026-128 Letter of invitation.pdf`, `ECWS-PRJ-2026-0147 Booklet Vol 1.pdf`, `Addendum 02.pdf`, `RFQ P-03 Process mechanical.pdf`, `Quote P-03 Rhein Aqua Systems.pdf`, `DG2 Bid-No-Bid pack v2.pdf`. They are built by a rule from data (the tender's reference, the package, the supplier), never typed per tender.

### Each file (one row anatomy everywhere)
`[icon] Name · type tag (PDF / CSV / Letter / Email) · language tag if AR · "Scanned (OCR)" tag if scanned` │ `Source` │ `Received` (date and time in the tenant's zone, `domain/calendar.ts`) │ `By` │ `Pages or rows` │ `View`

### What View shows (the file viewer, right-hand panel)
- **A file the demo holds** (the booklets, the real sample PDFs): the PDF in an `<iframe src="…#page=1&navpanes=0&view=FitH">`, the browser's own viewer. A BOQ CSV is shown as a plain table.
- **Every other file** is a **document facsimile**: an A4-looking page, built as an HTML string from the tender's data and shown in `<iframe srcDoc=… sandbox="">`. It has the issuer's letterhead (name only, no real logo), the reference, date, addressee and body sections, and the watermark "Synthetic document for demonstration" (as the hero booklet has). A scanned source (a scanned drop, or `scanned: true`) gets a light grey paper and a small "Scanned copy" stamp. An Arabic source is `dir="rtl"`. Its numbers and dates come from `src/data` through the builder, never typed into a page (app rule 1).
- **A file someone added in the demo:** in the same session, the real file (object URL; PDF or image in the iframe, anything else as a details card). After a reload, a card: "Added by {name}, {when}. The demo keeps the file's name and details, not its content."
- The panel: a fixed right-hand sheet, width `min(62vw, 980px)` (min 520 px, full width under 760 px), over a scrim, as the pdf.js drawer does. Its header shows the file name, the folder path (breadcrumb), the source · received · by line, the tags, **Previous / Next** (through the files of the current list), **Open in new tab** (held files and same-session uploads only) and **Close**. Esc closes, focus goes to Close on open and back to the file's row on close, and Tab stays inside.

### Where it appears
1. **The workspace tab `documents`** is relabelled **Library** (id and order unchanged, so every `?tab=documents` link still lands). It always shows (every tender has at least its notice). Layout inside the tab: a toolbar (search in this tender's files, "N files in M folders", **Add file**), then the folder tree on the left (≈ 220 px, expandable, counts per folder) and the file list on the right. Under 1100 px the tree becomes a breadcrumb and a folder list. **Kept under the library, unchanged:** the Intake steps card and the addendum diff cards (script value). The booklet's **Read in English** (Arabic, plan 012) and OCR tag move to the booklet's row and to the viewer header. The old "Tender documents" and "Received from" cards go, because the library now carries both.
2. **A company-wide page `/library`, "Tender library"**, in the sidebar's top group after Calendar (`cap: 'tender.view'`). On the left, every tender the viewer can open, as top-level folders (search by ID or title; filter by stage), with file counts. On the right, the selected tender's library (the same browser component). A search across all file names ("addendum", "booklet", a supplier's name) lists matches with their tender and folder path. The selection and search live in the URL (`?tender=`, `?q=`).

### Masking (all through `can()`; no role checks in pages)
- Quotes in **04 Suppliers and quotes**: listed for holders of `levelling.view` or `sourcing.view`. The quote facsimile shows prices only with `see.quotes`. With `see.quotes.summary` it shows the levelled total and masks the supplier's original prices (as `access.ts` labels that capability). Without either capability, the folder shows its count and `<Masked by={holdersOf(...)} />`.
- **Commercial** proposal files: prices only with `see.margin`; otherwise the file is listed and its facsimile masks the figures.
- DG2 committee positions in a DG2 record: `see.positions`.
- Restricted tenders are already absent for people without `see.restricted` (the port's rows); the `/library` page lists only rows the port returns.

### Adding a file (demo state)
- **Add file** (toolbar, and on each folder's header) opens the browser's file picker and a small modal to choose the folder (the current folder by default, any sub-folder the viewer can see). Anyone who can open the tender may add a file; there is no new capability.
- It writes through `mark()` into `store.done`: key `lib-file:{tenderId}:{folderId}:{file name, lower case}`, value JSON `{ name, size, type, at, byId }`, with a toast "Added {name} to {folder}". The same name in the same folder is recorded as a new version ("v2"), not a duplicate row.
- The file's content stays only in memory (a module-level `Map` of object URLs) for the session. Reset demo clears the keys. The audit trail records the action where `mark()` already does.

## Scope
- **Files to create:**
  - `components/tender/FileViewer.tsx` and `components/tender/file-viewer.css`: the right-hand panel, controlled (`file`, `files`, `onIndex`, `onClose`), rendered in a portal, no host needed. **Plan 031 imports it**, so keep this API: `FileViewer({ file: LibraryFileVM | null, files: LibraryFileVM[], onIndex(i: number): void, onClose(): void })`;
  - `domain/gcc/library/` (`types.ts`, `index.ts` `libraryFor(ctx, tenderId)`, `folders.ts`, `names.ts`, `facsimile.ts` with `facsimileHtml(spec)`, `csv.ts`, `uploads.ts`);
  - `pages/gcc/library/` (`LibraryBrowser.tsx` shared by the tab and the page, `Library.tsx` for `/library`, `AddFileModal.tsx`, `library.css`);
  - `pages/gcc/dev-checks/56-library.tsx`.
- **Files to change:**
  - `pages/gcc/workspace/tabs/documents.tab.tsx` (the Library tab);
  - `pages/gcc/workspace/tabs/index.ts`: the `documents` row's label in `RESERVED_TABS` and the comment table only;
  - `data/access.ts`: one `NAV_GCC` entry (`{ key: 'library', label: 'Tender library', path: '/library', cap: 'tender.view' }` after Calendar);
  - `components/layout/Sidebar.tsx`: one `GCC_ICON` entry (a lucide folder icon);
  - `pages/gcc/screens.ts`: one `/library` entry (plan `030`, built);
  - `App.tsx`: move the legacy `library` route into `LEGACY_AT` (as `/suppliers`), so the GCC screen serves a GCC tenant and the Indian preview keeps its page. Re-read `App.tsx` right before editing: plan 031 adds one route in the same file;
  - `pages/gcc/dev/KitPreview.tsx`: one section showing `FileViewer` with a facsimile and a held PDF;
  - this plan's row in `app/plans/README.md`.
- **Out of scope** (stop and ask before touching):
  - `Workspace.tsx`, `WorkspaceHeader.tsx`, `workspace.css`, the other tabs, `TenderTracker` (plan 029);
  - `pages/gcc/suppliers/**` and `pages/gcc/company/**` (plans 031, 032);
  - `SourceHost`, `PdfViewer` and `SourceChip` (the citation viewer stays as it is);
  - `pages/gcc/s1/s1.css` (leave the now-unused `.doc*` rules; note them as a follow-up);
  - new libraries; generating new PDF files; new capabilities or roles; the lifecycle generator and any existing fact in `src/data/`.

## Demo-grade rules
- Build what the prospect sees and clicks: the folders, the file rows, View, Add file.
- Add no new facts: every file is derived from data the demo already has. The only new state is the `lib-file:` keys.
- Keep dev checks to about 12 rows. Polish the viewer and the hero's library first (script A is shown on the hero).
- Keep the non-negotiables: the same tender never disagrees between screens (the library's addenda, RFQs and quotes match the Documents badge, the Sourcing tab and Quote levelling), masking stays correct, Reset works.
- GCC code never imports Indian data modules (`data/tenders.ts`, `data/workspace.ts` …).

## Steps

### Phase 1 — The viewer and the facsimile (do this first: plan 031 waits for `FileViewer`)
- [ ] 1.1 `domain/gcc/library/types.ts`: `LibraryFileVM` (id, name, title, type tag, lang, scanned, source `{ channel, label }`, receivedAt, by, pages or rows, tags, masked, `view: { kind: 'url'; src } | { kind: 'html'; html(): string } | { kind: 'csv'; src } | { kind: 'added'; … }`, optional `link` to a screen) and `LibraryFolderVM` (id, name, path, files, folders, masked).
- [ ] 1.2 `facsimile.ts`: `facsimileHtml(spec)` returns one self-contained HTML document with inline CSS: an A4 page (or pages) on a grey ground, a serif body (Times New Roman, as the hero booklet uses), a letterhead band with the issuer's name, a reference and date line, an optional addressee, body sections (heading, paragraphs, key-value rows, a table), a footer, and the diagonal watermark "Synthetic document for demonstration". It has a `scanned` look and `dir="rtl"` for Arabic, using system Arabic fonts (no network), and no script.
  - [ ] 1.2.1 Acceptance: the HTML contains no `<script>`; it renders in `<iframe sandbox="">`; the text is selectable; the watermark shows on every page.
- [ ] 1.3 `csv.ts`: a BOQ CSV as an HTML table (header row, numbers right-aligned, no prices: the CSVs have none).
- [ ] 1.4 `components/tender/FileViewer.tsx` and `file-viewer.css`, as in Design, reusing the drawer motion tokens (`tokens.css`) and the scrim. Acceptance:
  - [ ] 1.4.1 The hero's booklet opens at page 1 in the iframe with no thumbnail pane; a facsimile opens in a sandboxed iframe; a BOQ opens as a table.
  - [ ] 1.4.2 Previous / Next step through the list the viewer was opened from; the header updates; Esc and Close return focus to the row; Tab stays inside the panel.
  - [ ] 1.4.3 Light and dark: the panel follows the theme; the facsimile page stays white paper (a document), on the theme's sunken ground.
- [ ] 1.5 A `KitPreview` section shows the viewer with a facsimile and the hero's booklet.

### Phase 2 — The library model
- [ ] 2.1 `libraryFor({ tenant, viewer, done }, tenderId): { folders, files: LibraryFileVM[], count }`, reading only existing functions: `documentFor`, the register row (`gccData(tenant).register`), `dataOf(tenant).intakeToday` and `sources`, `uploadsOf`, `addendaFor`, the Stage 1 queries, `eligibilityFor` and the vault, `s2TenderOf` / `rfqsFor` and replies, `packVersionsFor`, `dg2RecordFor`, the DG1 and DG3 records, and the lifecycle (`queriesFor(...).one(id)`) for gates, submission and result.
  - [ ] 2.1.1 **01 Tender documents** for every tender. The notice facsimile states: issuer, title, reference, procurement type, country and city, key dates (`keyDates`), document fee and how to obtain the booklet where the data has one. A scanned-drop source ("Scanned drop · Letter", e.g. T-2026-128) is a scanned letter of invitation. An email source is an email facsimile (From, To, Subject, Received, attachment line).
  - [ ] 2.1.2 A lifecycle-only tender (history, Stages 4–9) gets its notice from the lifecycle's title, sector, issuer if present, and value basis. Where a field is missing, the facsimile leaves the line out; it never shows "undefined".
  - [ ] 2.1.3 Folders 02–07 per the Design table, only from data that exists. A folder with no file is absent (05 excepted).
  - [ ] 2.1.4 `names.ts`: file names by rule, unique within a folder (a second file of the same name gets " (2)").
  - [ ] 2.1.5 Masking per Design, through `can(viewer, cap, ctx)`.
- [ ] 2.2 `uploads.ts`: read and write the `lib-file:` keys, with versions; the in-memory object URL map.
- [ ] 2.3 Agreement: the library's addenda equal `addendaFor(...)`; its RFQ and quote files equal the Sourcing tab's RFQs and replies for the same `done`; its DG files appear only for gates the tracker shows as reached.

### Phase 3 — The Library tab
- [ ] 3.1 `LibraryBrowser.tsx`: toolbar (search, counts, Add file), folder tree with counts (expand and collapse; the path in the URL as `?folder=`), and the file list in the Design's row anatomy. Tree items are buttons with `aria-expanded`; the list is a table with a caption, or AG Grid if a folder can hold more than five rows (architecture decision 8).
  - [ ] 3.1.1 Clicking a row, or its View button, opens the `FileViewer`; Enter on a focused row does the same.
  - [ ] 3.1.2 Search filters across the tender's folders and shows each match's folder path.
- [ ] 3.2 `documents.tab.tsx`: label **Library**, `shows: () => true`; the badge stays (the latest addendum). Render `LibraryBrowser`, then the Intake steps card and the addendum cards as today. The booklet row carries Read in English (Arabic) and the OCR tag.
- [ ] 3.3 Acceptance, as the Head of Tendering in Najd:
  - [ ] 3.3.1 T-2026-128: 01 holds the scanned letter of invitation from the scanned drop, with its received time. View shows the scanned facsimile on the right.
  - [ ] 3.3.2 Hero T-2026-118: the booklet PDF, the BOQ, the addenda sub-folder (count = the tab's "Add. n" badge), received copies, correspondence, company evidence.
  - [ ] 3.3.3 T-2026-097 (Stage 3): 04 has one sub-folder per package with RFQs and quotes; 03 › DG2 has the pack versions.
  - [ ] 3.3.4 A Stage 8 or 9 tender from the home dashboard: 05 Our proposal holds its proposal files, and 07 the result letter.

### Phase 4 — Adding a file
- [ ] 4.1 `AddFileModal.tsx`: file picker, folder select, Add; `mark()` write and toast; focus returns to Add file.
- [ ] 4.2 The added file appears in its folder at once, tagged "Added by {name}", and shows in the viewer (session) or as the details card (after reload).
- [ ] 4.3 Acceptance: add `Technical proposal draft.pdf` to 05 › Technical on the hero; reload: still listed; Settings → Reset demo: gone.

### Phase 5 — The Tender library page
- [ ] 5.1 `Library.tsx` at `/library`: tender list on the left (search, stage filter, counts), the selected tender's `LibraryBrowser` on the right, and the cross-tender file search. The selection and search live in the URL.
  - [ ] 5.1.1 The tender list reads `port.rows(tenant, { kind: 'all' }, person, 'all', done)`. It computes file counts cheaply (folder counts only) and builds the full library only for the selected tender.
  - [ ] 5.1.2 Each tender header has "Open tender" (to `/tenders/:id?tab=documents`).
- [ ] 5.2 The nav entry, the sidebar icon, the `screens.ts` entry and the `LEGACY_AT` move in `App.tsx`. Acceptance: in a GCC tenant `/library` shows the Tender library; in the Indian tenant (`gen-in`) `/library` still shows the legacy Artefacts library.
- [ ] 5.3 Where the two panes sit side by side, they follow the wave 10 rule: the tender list and the library share the row's height and scroll inside (use `.eq-row` or the same pattern for a list and a browser).

### Phase 6 — Checks
- [ ] 6.1 `dev-checks/56-library.tsx`, about 12 rows per tenant:
  - every register tender has at least one file in 01;
  - the hero's addenda count equals `addendaFor`;
  - T-2026-061 and T-2026-042 have their held PDF and BOQ;
  - T-2026-042's booklet is tagged Arabic and scanned, with its OCR pages;
  - the RFQ files on T-2026-097 equal `rfqsFor`;
  - the quotes folder is masked for the Tender Coordinator;
  - no two files in one folder share a name;
  - every facsimile contains the watermark and no `<script>`;
  - an upload write reads back, and a second write is v2;
  - no folder is empty except 05.
- [ ] 6.2 typecheck and build pass; `/dev/checks` has no failing row in any tenant.
- [ ] 6.3 Browser (your own tab; reset the demo in that tab only), at 1280 and 1440, light and dark, no console errors:
  - [ ] 6.3.1 Najd as the Head of Tendering, the Tender Coordinator (quotes masked), the Procurement Lead and a committee member (see the quote files with `see.quotes.summary` masking);
  - [ ] 6.3.2 Corniche (T-2026-061), Batinah (T-2026-042, the Arabic booklet with Read in English);
  - [ ] 6.3.3 `/library` in Najd and Qurain; `/library` in the Indian tenant still shows the legacy page.
- [ ] 6.4 Reset demo clears added files and returns the library to its seed state.

## Data and derivation
- No new facts. Everything is derived in `domain/gcc/library/**` from existing data and domain functions.
- New demo state: `lib-file:{tenderId}:{folderId}:{name}` keys in `store.done`, written through `mark()`, persisted in `ctai.demo.v2`, cleared by Reset demo.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants
- [ ] Every tender's Library tab shows at least its notice with name, source, received and by, and View opens it in an iframe on the right
- [ ] Held PDFs open in the browser's viewer; every other file opens as a watermarked facsimile built from data
- [ ] Sub-folders appear where a folder holds a group (addenda, packages, gates, proposal parts)
- [ ] Add file persists over a reload and Reset demo clears it
- [ ] `/library` lists every visible tender's library, with a cross-tender search; the Indian preview's `/library` is unchanged
- [ ] Masking of quotes, commercial figures and positions is correct for the Tender Coordinator, a committee member and the Procurement Lead
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
