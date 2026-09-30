# 037 — The Debriefs archive and the Bid record

Status: DONE (2026-09-30, reviewed) · Depends on: the wave 11 contract (below); 035 for real data (build against the stubs, verify once 035's Phase 4 is ticked) · Can run in parallel with: 035, 036

## Goal
A company-wide **Debriefs** page lets the Head of Tendering, the CEO and the committee look across every bid that ended. For a chosen period, sector and ending, it shows:
- why we win and why we lose;
- what else decided it;
- who beats us, and why bids stopped;
- what we keep learning, by area.

Every count opens the list of debriefs behind it, and the list downloads as a CSV for the KPI team. Company › Bid record's "Why we lost" gains a line from the debriefs, with a link to the archive.

## Context
- **Why:** the user's request of 2026-09-30. The Project Director's debrief at the end of each tender builds "an archival data layer … historical analysis of each tender", so "the KPI team" has data to look at. User decisions:
  - there is a new archive page, and Bid record's "Why we lost" also reads the debriefs;
  - there is no new role, so the Head of Tendering and the CEO are the readers.
- **The wave 11 contract** (written by the orchestrator; typecheck passes). **Import only from `@/domain/gcc/debriefs`**:
  - `archiveFor(ctx: DebriefCtx, filters: ArchiveFilters): ArchiveVM`: `filters` is `{ period: '30d' | '90d' | '12m'; sector?; group?: 'won' | 'lost' | 'stopped' }`;
  - `ArchiveVM` gives:
    - `sectors`;
    - `totals` (endings, won, lost, stopped, accepted, submitted, sentBack, due, overdue);
    - `winReasons`;
    - `lossReasons` (with `place`, `placeN`, `topFactor`);
    - `factors` (wins vs losses);
    - `rivals`;
    - `stopped` (by kind, with reasons);
    - `stoppedEarlier`;
    - `lessonAreas` (with the latest two lessons);
    - `rows: ArchiveRow[]`, already masked for the viewer.
  - Every `CountRow` has `tenderIds` for filtering the table.
  - The vocabulary (`ENDINGS`, `ENDING_GROUPS`, `DEBRIEF_STATUSES`, `LOSS_LABEL`, `labelOf` …); the types in `domain/gcc/debriefs/types.ts`.
  - KPI tiles **DBR-1 to DBR-6** (plan 035's `domain/gcc/kpi/debrief.kpi.ts`): Endings, Debriefs accepted, Awaiting sign-off, Debriefs overdue, Why we win, Who beats us. Read them with `registryTile(id, ctx, here)` (`pages/gcc/s1/vm/tiles.ts`); a missing id returns null.
  - **Until 035 lands:** `archiveFor` returns an empty VM and the DBR tiles don't exist. Build against the types, with the empty states. Do the real click-through once 035 has ticked Phase 4 (read `app/plans/035-debrief-records.md`). Never edit 035's files.
  - The capability `debrief.view` (`data/access.ts`): `hot`, `exec`, `member`, `dir` tenant-wide, and `bid` on assigned tenders. `archiveFor` already scopes the rows to the viewer.
- **Current behaviour:**
  - **Sidebar:** `NAV_GCC` (`data/access.ts:461-491`), top group Dashboard, Calendar, Tender library, My requests. Icons are `GCC_ICON` (`components/layout/Sidebar.tsx:93-96`, lucide-react). `navFor` filters by `can`.
  - **Screens:**
    - `pages/gcc/screens.ts` (`SCREENS`: `{ name, line, plan, built, cap, page }`; `screenHead`);
    - `App.tsx` builds a guarded route per entry (`screenRoutes()`, 100-124);
    - the `/library` entry (plan 030) is the model.
  - **The Bid record** (plan 032):
    - `pages/gcc/company/Record.tsx`;
    - the cards in `pages/gcc/company/record/Cards.tsx` (`LossCard` 93-126: per reason, the count, share, bar, "Our place X of Y (n = …)" and the gap, masked without `see.margin`);
    - the grid in `record/RecordGrid.tsx` (a fixed-height AG Grid, 10 rows, then it scrolls);
    - `domain/gcc/company/record.ts`: `lossesOf` 418-442, `LOSS_ORDER`/`LOSS_LABEL` 60-63, `statusOf` 535-541, and the row reason 552-555.
    - Colours, fixed and stated: Won `--green`, Lost `--ink-4`, Withdrawn or cancelled hatched `--line-strong`, and a single series `--blue`. The legend and "How to read this" ⓘ are on the tab.
    - Clicking a tile, bar or row filters the table with a removable chip, and scrolls to it.
  - **Tiles:** `kpiCtxOf(base, period, dashboard)`, `registryTile`, `valueTile` (`pages/gcc/s1/vm/tiles.ts`); the strip is `pages/gcc/s1/parts/Strip.tsx`. Periods come from `domain/gcc/period.ts` (`windowOf`, labels "30 days", "90 days", "12 months").
  - **AG Grid:** Community modules only, registered in `components/dashboard/grid/agGrid.ts` (`GRID_MODULES`). CSV export is `CsvExportModule`, which is **Community**.
  - `.eq-row` / `.eq-scroll` (`styles/components.css:43-57`): cards side by side share one width and height; a long one scrolls inside with its head fixed.
- **Read first:**
  - `/CLAUDE.md`, `app/plans/README.md` (the wave 11 section), plan 035's Design (what each count means);
  - plan 032 (the Bid record's design and its deviations);
  - `dashboards.md` §2 (periods), §3 (tiles), §5 (tables), §8.1 (sidebar);
  - `kpi-and-screen-catalogue.md` §A.5 and §D;
  - `ui-direction.md` §5, §7, §10.
  - **The user's UI taste:**
    - no coloured stripes;
    - status is a word in a pill;
    - every row of a kind has the same rows of text (never an empty row that keeps its space);
    - cards side by side share width and height;
    - never show the same thing twice on one screen;
    - fixed colours, each with a stated meaning, said on screen (a legend, or "How to read this").

## Design

### `/debriefs`, "Debriefs", sidebar top group after Tender library, `cap: 'debrief.view'`
```
Debriefs                                            30 days | 90 days | 12 months     ⓘ How to read this
Every bid that ended, why, and what we learned. Recorded by the Project Director, accepted by the Head of Tendering.
Sector: All · Water and wastewater · Utility networks · …        Ending: All · Won · Lost · Stopped

Tiles (Strip, 6): DBR-1 Endings │ DBR-2 Debriefs accepted │ DBR-3 Awaiting sign-off │ DBR-4 Debriefs overdue │ DBR-5 Why we win │ DBR-6 Who beats us

.eq-row 2:  Why we win                         │ Why we lose
            main reason · count · share · bar  │ main reason · count · share · bar · "Our place 2 of 6 (n = 9)"
                                               │   · "Top factor · Supplier quotes (4)"
.eq-row 2:  What decided it                    │ Who beat us
            factor · in wins ▮▮ (green)        │ rival · beat us n times · sectors · our median place
                     in losses ▮▮▮ (grey)      │
.eq-row 2:  Why bids stopped                   │ Lessons by area
            Cancelled by the employer 3        │ area · n lessons
              · Budget withdrawn 2 · …         │   "…the latest lesson…" T-2025-255 · Mohammed Al-Ghamdi · 1 Mar
            Withdrawn 1 · No-Bid 4 · Rejected 1│   "…" (the second latest)
            Should we have stopped earlier?    │
              Yes, at DG1 2 · … (a small bar)  │

Every debrief (AG Grid, 10 rows then it scrolls)                         [chip: From "Price" ×]  [Download CSV]
Tender │ Employer │ Sector │ Ending │ Ended │ Main reason │ What else │ Winner / closest rival │ Our place │ Lessons │ Bid again │ Status │ Recorded by │ Accepted
```
- **Filters:**
  - the period chips set the window for the whole page. The default is **12 months**, kept in `?period=`, never the dashboards' stored period;
  - the sector and ending chips narrow the cards and the table;
  - the tiles read the period only. The ⓘ says so ("The tiles count the whole company for the period; the chips narrow the cards and the list").
- **Every count is a filter:** a bar, a list row, a rival, a lesson area or a tile's drill sets the table's filter to its `tenderIds`. The filter shows as a removable chip naming what was clicked; the table scrolls into view, and focus moves to the chip's clear button (as the Bid record does).
- **A table row** opens `/tenders/{TID}?tab=debrief` (plan 036's tab).
- **Cells:**
  - Status is a pill (Accepted green · Submitted neutral · Sent back orange · Due neutral · Overdue orange), from `row.statusTone`;
  - Ending is a word;
  - Lessons shows the count, with the first lesson in the cell's title;
  - dates go through `When`;
  - people's names come through `personById`.
- **Download CSV:**
  - `api.exportDataAsCsv` with the columns as shown, the text values (no HTML) and dates as `YYYY-MM-DD`;
  - one extra column, "Lessons (text)", with every lesson as "Area: text", joined by " | ";
  - file name `debriefs-{tenant}-{period}.csv` (no personal data in it);
  - a cell the viewer can't read exports as "Masked";
  - the button reads "Download CSV · {n} rows".
- **Colours** (a legend on each chart, a screen-reader table beside each chart as `StageChart` does, never the tenant's accent):
  - Won `--green`;
  - Lost `--ink-4`;
  - Stopped hatched `--line-strong`;
  - a single series `--blue`.
- **Row anatomy:**
  - every reason row: label · count · share · bar;
  - every loss row also has the place line and the factor line. "Place not published" or "No debriefs yet" where empty, so no row is shorter;
  - every rival row: name · beat us n · sectors · place.
- **Empty states:**
  - "No bids ended in this period";
  - "No accepted debriefs yet": the reasons cards read accepted debriefs only, and the ⓘ says so.

### Company › Bid record
- **"Why we lost" (`LossCard`):**
  - every reason row gains one line, "Top factor · {label} ({n})" from `archiveFor(ctx, { period: '12m' }).lossReasons` (matched by reason id), or "No debriefs yet";
  - for a viewer without `debrief.view`, the line reads `<Masked />`, so every row keeps the same rows;
  - the card foot reads "From {n} accepted debriefs · Open Debriefs →" (the link needs `debrief.view`; otherwise only the count).
- **The results table:** a **Debrief** column holds the status pill of `archiveFor(…).rows` by tender (a dash for tenders that haven't ended), masked without `debrief.view`.
- **`record.ts`:**
  - `LOSS_LABEL` is imported from the vocabulary. Keep `record.ts` exporting `LOSS_LABEL` (a re-export), since other files may import it from there;
  - the 12-month losses in Bid record and the lost count in the archive at 12 months are the same tenders. A dev check proves it.

## Scope
- **Files to create:**
  - `pages/gcc/debriefs/Debriefs.tsx`, plus parts under `pages/gcc/debriefs/parts/` (cards, charts, grid) and `debriefs.css`;
  - `pages/gcc/dev-checks/81-debrief-archive.tsx` (about 8 rows).
- **Files to change:**
  - `pages/gcc/screens.ts`: the `/debriefs` entry (re-read before editing; one entry);
  - `data/access.ts`: **one `NAV_GCC` item** in the top group, after `library`: `{ key: 'debriefs', label: 'Debriefs', path: '/debriefs', cap: 'debrief.view' }`. Also one line in the sidebar self-check comment under it. Nothing else in the file; the orchestrator already added the capabilities;
  - `components/layout/Sidebar.tsx`: one `GCC_ICON` entry (a lucide-react icon already in the package, e.g. `ClipboardList`);
  - `components/dashboard/grid/agGrid.ts`: add `CsvExportModule` to `GRID_MODULES` with its comment;
  - `domain/gcc/company/record.ts`, `pages/gcc/company/record/Cards.tsx`, `pages/gcc/company/Record.tsx` (and `record/RecordGrid.tsx` for the column);
  - `pages/gcc/dev-checks/66-company.tsx`, only if a pin moves (list it);
  - docs:
    - s1-s3-demo-spec **§20.4** (replace the placeholder);
    - `kpi-and-screen-catalogue.md`: a screen entry for Debriefs (who sees it, what it answers), in the screens part and not §A.5, which is 035's;
    - `dashboards.md` §8.1: the sidebar gains Debriefs;
  - this plan's row in `app/plans/README.md`.
- **Out of scope** (stop and ask):
  - `domain/gcc/debriefs/**`, `data/gcc/debriefs/**`, the KPIs, actions and dashboards (plan 035);
  - the rest of `data/access.ts`;
  - `pages/gcc/workspace/**` and `domain/gcc/library/**` (plan 036);
  - the lifecycles;
  - new libraries (Recharts and AG Grid Community are approved; nothing else);
  - `tokens.css`.

## Demo-grade rules
- Build what the prospect sees and clicks: the cards, the filters, the drill into the list, the CSV.
- Add no rule. Every number comes from `archiveFor` or a DBR tile.
- The dev check is about 8 rows.
- Polish Najd first, then check that the other four read sensibly (their currencies, sectors and rivals).
- **Non-negotiables:**
  - the archive, the Bid record, Stage 9 and the tender's Debrief tab never disagree about a tender;
  - masking and scope come from `can()`;
  - Reset returns the seed.

## Steps

### Phase 1 — The route and the sidebar
- [x] 1.1 The `/debriefs` entry in `screens.ts` (`built: true`, `cap: 'debrief.view'`, `page`, the head line), the `NAV_GCC` item, and the icon. Acceptance:
  - the Head of Tendering, CEO, a committee member, the Project Director and a Bid Manager see "Debriefs" under Tender library;
  - the Tender Coordinator, Procurement, Finance and HR don't.
  - A direct URL for them shows "This page isn't part of your role".

### Phase 2 — The page
- [x] 2.1 Head: title, one-line rule, period chips (`?period=`, 12 months by default), sector and ending chips, and "How to read this" ⓘ (the colours, the window, that the reasons count accepted debriefs, that the tiles ignore the chips).
- [x] 2.2 Tiles: DBR-1 to DBR-6 through `registryTile`, with `kpiCtxOf` at the page's period; their drills filter the table.
- [x] 2.3 The three `.eq-row` rows as the Design has them, with `.eq-scroll` bodies and the fixed row anatomy.
  - [x] 2.3.1 Charts in Recharts: the stated colours, a legend and a screen-reader table.
  - [x] 2.3.2 Every count sets the table's filter chip and scrolls to it.
- [x] 2.4 The table (the `RecordGrid` pattern: fixed height, 10 rows, then it scrolls) with the Design's columns; a row opens the Debrief tab.
- [x] 2.5 Download CSV (`CsvExportModule`), with the rows as filtered, text only, masked cells "Masked", and the file name without personal data.
- [x] 2.6 Acceptance in Najd as Faisal Al-Harbi (Head of Tendering), at 12 months:
  - the tiles add up (Endings = won + lost + stopped in DBR-1's detail);
  - "Why we lose" counts sum to the accepted lost debriefs;
  - a click on the top rival lists its losses;
  - the CSV opens in a spreadsheet with the same rows.

### Phase 3 — Bid record
- [x] 3.1 The "Top factor" line on every "Why we lost" row (`<Masked />` without `debrief.view`); the card foot with the count and the link.
- [x] 3.2 The Debrief status column in the results table.
- [x] 3.3 `LOSS_LABEL` imported from the vocabulary, with `record.ts` re-exporting it.
- [x] 3.4 Acceptance: the Bid record's 12-month losses equal the archive's lost count at 12 months; the Tender Coordinator sees the masked line; Finance sees what it saw before, plus masked lines.

### Phase 4 — Checks, the live round trip and docs
- [x] 4.1 `dev-checks/81-debrief-archive.tsx`, about 8 rows across the five tenants:
  1. the archive's won and lost counts at 12 months equal the Bid record's won and lost at 12 months (PF-3) for the Head of Tendering. Stopped differs by design: the Bid record's declines include DG1 discards, which aren't bids;
  2. `rows.length` = DBR-1 at the same period;
  3. every breakdown sums to its total;
  4. the Bid record's top factor per reason = the archive's;
  5. the CSV column list = the grid's columns + "Lessons (text)";
  6. a Bid Manager's rows are only their assigned tenders;
  7. the Tender Coordinator can't open `/debriefs` (`can`);
  8. the sidebar entry sits after Tender library.
- [x] 4.2 The live round trip, once 035 and 036 have landed (your own tab):
  - accept T-2025-270's debrief as in plan 036 step 3.3;
  - `/debriefs` counts it (DBR-2 up by one; its rival's count up by one if named);
  - the Bid record's line agrees;
  - Reset returns them.
- [x] 4.3 Browser at 1440 and 1280, light and dark, keyboard (chips, table, CSV button), no console errors. Najd, then Corniche (AED, UAE rivals) and Qurain (KWD, the new Kuwaiti rivals).
- [x] 4.4 Docs: spec §20.4, the catalogue screen entry, dashboards.md §8.1.
- [x] 4.5 typecheck and build pass; `/dev/checks` has no failing row in any tenant.

## Data and derivation
- **No new facts, no new `done` keys.** Everything comes from `archiveFor` and the DBR tiles (plan 035).

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants
- [x] `/debriefs` shows the six tiles, the six cards and the list, for 30 days, 90 days and 12 months, narrowed by sector and ending
- [x] Every count filters the list; a row opens the tender's Debrief tab; the CSV downloads the filtered rows
- [x] Bid record's "Why we lost" shows a top factor on every row and links to Debriefs; the results table shows each tender's debrief status
- [x] The same tender reads the same in the archive, the Bid record, Stage 9 and the Debrief tab
- [x] Access and masking correct for the Head of Tendering, CEO, committee, Project Director, Bid Manager, Tender Coordinator
- [x] Reset returns the seed; no hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor, 2026-09-30.)

- **Changed files:**
  - New:
    - `app/src/pages/gcc/debriefs/Debriefs.tsx` (the page: period, sector and ending chips, "How to read this", DBR-1 to DBR-6, three `.eq-row` rows, the table with Download CSV);
    - `pages/gcc/debriefs/parts/Cards.tsx` (Why we win, Why we lose, Who beat us, Why bids stopped, Lessons by area);
    - `pages/gcc/debriefs/parts/FactorChart.tsx` (What decided it, Recharts, with a legend and a screen-reader table);
    - `pages/gcc/debriefs/parts/columns.tsx` (one list of columns for the grid and the CSV);
    - `pages/gcc/debriefs/debriefs.css`;
    - `pages/gcc/dev-checks/81-debrief-archive.tsx` (8 rows).
  - Changed:
    - `pages/gcc/screens.ts`: the `/debriefs` entry;
    - `data/access.ts`: one `NAV_GCC` item after `library`, and one self-check comment line;
    - `components/layout/Sidebar.tsx`: the `debriefs` icon (`ClipboardList`) and its import;
    - `components/dashboard/grid/agGrid.ts`: `CsvExportModule` with its comment;
    - `domain/gcc/company/record.ts`:
      - `LOSS_LABEL` and `LOSS_ORDER` come from the vocabulary, and `LOSS_LABEL` is re-exported;
      - `LossRowVM.topFactor`, `LossesVM.debriefs`, `RecordRowVM.debrief` and `maskedBy.debrief`, all read from `archiveFor(…, { period: '12m', sector })`;
    - `pages/gcc/company/Record.tsx`: the Debrief column after Result, and `LossCard`'s new props;
    - `pages/gcc/company/record/Cards.tsx`: the Top factor line on every loss row, and the card foot;
    - `pages/gcc/company/record/RecordGrid.tsx`: optional `idOf` and `onReady`;
    - `pages/gcc/company/company.css`: two rules;
    - docs: `s1-s3-demo-spec.md` §20.4; `kpi-and-screen-catalogue.md` §D (a Debriefs row and a paragraph); `dashboards.md` §8.3 (the sidebar tree and a rule);
    - this plan's row in `app/plans/README.md`.
  - `dev-checks/66-company.tsx` is unchanged: no pin moved.
- **Verification:**
  - `npm --prefix app run typecheck` and `build` pass. The only build warning is the old circular-chunk one on `domain/gcc/s1`.
  - `/dev/checks`: every checking panel (33) passes in all five companies, and 81 passes 8 of 8 in each.
  - Browser: headless Chromium, driven by scratch scripts outside the repo (Playwright from the local npx cache, nothing installed), on my own dev server (port 5177) with a fresh demo state per run.
    - **Access:**
      - the Head of Tendering, CEO, committee member (CFO), Project Director and Bid Manager see Debriefs straight after Tender library;
      - the Tender Coordinator, Procurement, Finance and HR don't, and the direct URL reads "This page isn't part of your role".
    - **Najd, 12 months, Faisal Al-Harbi:**
      - the tiles add up: Endings 57 = 9 won + 24 lost + 24 stopped;
      - Debriefs accepted is 46 of 57, and the CSV has 46 Accepted, 2 Submitted (= Awaiting sign-off) and 5 Overdue (= Debriefs overdue);
      - Why we lose counts 21 accepted lost debriefs, the same as "Who beats us · 6 of 21 losses";
      - Hijr Al-Watan (beat us 6 times) lists 6 debriefs, and the CSV downloads those 6 rows. The file opens as 57 × 15 when unfiltered (Python `csv`), with no HTML and dates as `YYYY-MM-DD`;
      - every tile's drill filters the table, at 30 days and 12 months;
      - a row opens `/tenders/{TID}?tab=debrief`.
    - **Keyboard:**
      - the arrow keys move the period (`?period=90d`, then back to the bare URL);
      - Enter on a chip or a count moves focus to the chip's clear button; Shift+Tab reaches Download CSV;
      - Up and Down step through the factor chart, and Enter lists a factor;
      - Enter on a grid cell opens the tender.
    - **Bid record:**
      - every Why we lost row has its Top factor line;
      - the foot reads "From 21 accepted debriefs · Open Debriefs →";
      - the Debrief column reads T-2025-270 Due, T-2025-262 Due, T-2025-255 Accepted and T-2025-438 Submitted;
      - the Tender Coordinator sees every Top factor and every Debrief cell as "Masked for your role", with no link.
    - **The live round trip (4.2):**
      - the Project Director submits T-2025-270 with "Fill in an example": Awaiting sign-off goes from 2 to 3;
      - Faisal accepts it:
        - Debriefs accepted goes from 46 to 47 of 57;
        - Al-Masar goes from "beat us 5 times" to 6;
        - Why we lose Price goes from 11 to 12, with its top factor from Price level (9) to (10);
        - the Bid record's Price line reads Price level (10), its foot reads 22, and T-2025-270's Debrief cell reads Accepted.
      - Settings › Reset this company returns every one of these to the seed.
    - **Layouts:**
      - 1440 and 1280, light and dark, in Najd, Corniche (UAE rivals) and Qurain (the new Kuwaiti rivals), with Dafna and Batinah read as text;
      - no sideways page scroll, and the six cards share one size (547 × 440 at 1440, 467 × 440 at 1280);
      - no console errors (only React Router's future-flag warnings, which were already there).
    - **The same tender across screens:** T-2025-270 reads Due in the archive, the Bid record and its Debrief tab ("Due by Thu 19 Mar"), and is on Stage 9.
- **Deviations from plan:**
  1. The sidebar is dashboards.md **§8.3**; §8.1 is the short-names table. I edited §8.3 and added Tender library to its tree, where it was missing.
  2. `company.css` gains two rules (the Top factor line and the foot); the plan lists the page files but not their stylesheet.
  3. `RecordGrid` gains optional `idOf` and `onReady`, so the Debriefs table reuses it and reaches `exportDataAsCsv`. The Bid record's use is unchanged.
  4. **The Bid record's foot for a viewer without `debrief.view`** reads "Top factors come from accepted debriefs · Masked for your role", not a count. `archiveFor` holds nothing for such a viewer, so the count would read 0.
     - A Bid Manager who doesn't own every loss reads "… on your tenders". In the seed, Najd's one Bid Manager owns all of them.
  5. **Colours:** the archive's bars take the colour of the ending they count: Why we win green; Why we lose and Who beat us grey; the stopped kinds hatched. Blue is for counts across endings (lessons, the stopped-earlier answers).
     - Each card's head carries its key, and "How to read this" states all four.
     - The Bid record keeps its own blue bars.
  6. The stopped key reads "Neither won nor lost", not "stopped before a result": a tender cancelled after opening has a result.
  7. The table head shows no row count, because Download CSV · {n} rows already says it (never twice on one screen).
  8. **Tile drills** list the company's debriefs for the period whatever the chips. With a chip set, the table chip says "whole company".
     - Below 12 months, a tile's list reads from the 12-month rows, since Awaiting sign-off is a state.
     - The chip drops the KPIs' "From tile:" prefix, because it already says From "…".
  9. **Factor chart keyboard:** Recharts steps a vertical chart with Left and Right, reversed, so Up and Down are mapped onto them. Enter lists the factor's wins and losses together; a bar click lists one series.
  10. **CSV columns:**
      - Tender exports as "T-… · title", one column as shown;
      - Recorded by exports the name and Accepted the date. The second line in those cells (the submission date, the acceptor) is for display only.
  11. **Masking:** 035 scopes rows rather than masking cells, so no seeded cell exports "Masked". The path exists, for a value `'masked'`.
  12. Why we lose always shows "(n = …)" after our place, as the Design writes it. The Bid record keeps its own rule (n only when fewer than the count).
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - 035's tiles cut two lines at 1440: DBR-1's detail ("6 won · 16 lost · 19 stop…") and DBR-6's ref ("Sectors · Buildings MEP, Fi…"), in Corniche and Qurain.
  - Qurain's Lessons by area shows two identical Bid decision lessons (T-2025-249 and T-2025-231). 035's templates repeat.
  - `ArchiveRow.title` is the full title, while the Bid record lists the short title for the same tender.
  - Clearing the table's chip leaves focus on the page, as on the Bid record.
  - Finance has no tenders in the Bid record (only invited ones), so its masked lines can't be shown with the seed. The Tender Coordinator shows them.
