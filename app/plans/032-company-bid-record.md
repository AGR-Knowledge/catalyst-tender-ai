# 032 — Company profile: the bid record

Status: DONE — awaiting review (2026-09-29) · Depends on: wave 9b (committed `3a00f3f`) and the wave 10 contract (`.eq-row` in `styles/components.css`) · Can run in parallel with: 029, 030, 031

## Goal
The company profile shows the company's record as a bidder: how many tenders it bid, won and lost, of what kind (sector, client, country, size), why it lost and how close it came, what it chose not to bid, and how that has moved over five years. The last 12 months are tender by tender and agree with the dashboards; the earlier years are the company's annual record.

## Context
- **Why:** the user's review, 2026-09-29: "Company profile: can we show more in depth: how many tenders won, of what kind, what was lost, etc."
- **Current behaviour** (plans 010, 027c):
  - `pages/gcc/company/Company.tsx` at `/company` has tabs Overview, Credentials, Projects, Financials, and Teams and partners (`?tab=`).
  - `Overview.tsx` has the identity card and registrations, key figures, "Turnover by year" bars, and the "Project record" (completed projects by sector and role, the most recent three), composed in `domain/gcc/company/overview.ts`. Its two-column row is `.co-ov-cols` (`minmax(0, 5fr) minmax(0, 7fr)` in `company.css`), so the two cards differ in width. `.co-facility`, `.co-teams` and `.co-rec-lists` are rows of cards or lists with `align-items: start`.
  - Nothing on Company shows bid results. The dashboards do: the portfolio KPI **PF-3 "Win / loss"** (`domain/gcc/kpi/portfolio.kpi.ts:~152`) counts `Q(ctx).resultsIn(ctx.window)` (lifecycle results won or lost in the window), with the value won and the target. Submissions are `Q(ctx).submissionsIn(window)`. The decision funnel is `domain/gcc/flows/portfolio.flow.ts`.
  - Each lifecycle (`data/gcc/lifecycle/types.ts`) carries `issuer`, `country`, `city`, `sector`, `value`, `clientType`, `gates` (with DG1 and DG2 decisions and reason codes), `submission`, `result` (`won | lost | withdrawn | cancelled`, `rank` [place, bidders], `gapToWinnerPct`, `lossReason` price, technical, local-content, pq or other, `predictedWin`, `value`) and `closedAs` (`discarded | no-bid | rejected | withdrawn | won | lost`). The generated history covers the 12 months to demo day (8 Mar 2026). `calibrationFor(outcomes)` in `domain/gcc/s3/win.ts` compares predicted win % with results (OUT-4).
  - Tile helpers: `kpiCtxOf`, `registryTile` and `valueTile` in `pages/gcc/s1/vm/tiles.ts`; the strip is `pages/gcc/s1/parts/Strip.tsx` (as `Suppliers.tsx` uses them).
  - Reason labels: `DG1_DISCARD_REASONS`, `NO_BID_REASONS`, `reasonLabel` in `domain/gcc/dg2/decision.ts`.
- Read first: `/CLAUDE.md`, `app/plans/README.md` (architecture decisions; the wave 10 section), `docs/07-product-design/agr-product-definition/kpi-and-screen-catalogue.md` §D (Company) and the OUT KPIs, `dashboards.md` §2 (period windows), §3 (tiles) and §8.3 (Company), `gcc-demo-data.md` (tenant profiles, history). User's UI taste: no coloured stripes; status is a word in a pill; every card or row has the same rows of text; data colours are fixed and each has a stated meaning, said on screen (a legend or a "How to read this" ⓘ); graph bars `--blue`.

## Design

### A new tab: **Bid record** (`?tab=record`), second after Overview
```
Tiles (Strip, 6; each with one detail and one reference line):
  Bids submitted (12 m) │ Win / loss (PF-3 at 12 m, the registered KPI) │ Value won │ Win rate by value │ Chose not to bid │ Forecast accuracy

Row (.eq-row, 2): Five-year record (bars per rolling year: won │ lost │ withdrawn; win rate line) │ From captured to won (12 m: captured → pursued → submitted → won)
Row (.eq-row, 3): By sector │ By client type │ By country            (each: bids, won, lost, win rate; bars)
Row (.eq-row, 2): By size of bid (value bands in the company currency) │ Top clients (bids, won, win rate)
Row (.eq-row, 2): Why we lost (loss reasons: count, share, and our place / gap to winner) │ What we chose not to bid (DG1 discards and DG2 no-bids, by reason)
Card: Results, last 12 months (AG Grid: tender → workspace, client, sector, country, value, submitted, decided, result, our place, gap to winner, reason, predicted win)
```
- **Colours, fixed and stated** (a legend on each chart and a "How to read this" ⓘ on the tab): **Won** `--green`, **Lost** `--ink-4` (grey: a result, not an alarm), **Withdrawn** a hatched `--line-strong`. Single-series bars (counts, values) use `--blue`. Never the tenant's accent.
- **Filters:** the whole tab reads one period, **Last 12 months** (the tender-level sections). The Five-year record always shows five rolling years. A sector filter chip row narrows the tender-level sections and the table together.
- Every count opens the table filtered to it (a click on a bar, a row or a tile sets the filter). The table's tender opens `/tenders/:id`.

### Where the numbers come from (one source each; the same tender never disagrees)
- **Last 12 months** = the rolling year ending on demo day, **derived only** from lifecycles through `queriesFor({ tenant, viewer, done })`: `submissionsIn(w)`, `resultsIn(w)`, and gate events and `closedAs` for declines, with the same 12-month window as the dashboards' period (`domain/gcc/period.ts`).
  - Its Win / loss tile **is** `registryTile('PF-3', ctx12m, here)`, so it equals the home dashboard's tile at 12 months.
  - Bids submitted equals the count behind `submissionsIn` at 12 months, as the portfolio reads it.
- **The four earlier rolling years** (Mar 2021 – Mar 2025, each ending 8 Mar) are a new **annual seed** per tenant, with no tender rows: submitted, won, lost, withdrawn, value submitted, value won, and won and submitted by sector. The last 12 months are never seeded; they are the first bar, derived.
- **Seed plausibility** (dev check): each earlier year's value won is 40–160% of the turnover of the financial year it mostly covers (Company › Financials), and each year's sectors are among the company's sectors (the identity card). Won + lost + withdrawn = submitted.
- **Masking** (through `can()`): the gap to the winner and the predicted win % need `see.margin`; without it the cell reads `<Masked />`. Values of bids are the tenders' published or estimated values, shown to every `company.view` holder, as the tender pages show them. Restricted tenders appear only for `see.restricted` holders (the lifecycle queries already filter by viewer; counts follow the same rows).

### Overview gets a summary, and the equal-row rule
- A **Bid record** card on Overview (last 12 months: submitted, won, lost, win rate, value won, and the largest win, with **Bid record →**), beside the Project record, in an `.eq-row`.
- `.co-ov-cols` (5fr / 7fr) becomes an `.eq-row`. So do `.co-facility`, `.co-teams`, and every other place in Company's tabs where two or more cards sit in one row. Each card's body becomes an `.eq-scroll`. Lists inside one card (`.co-rec-lists`, `.co-recent`) are not cards: leave them.

## Scope
- **Files to create:**
  - `data/gcc/company/bidRecord.ts` (the annual seed per tenant, `BID_RECORD_YEARS: Record<GccTenantKey, BidYearSeed[]>`), or one file per tenant under `data/gcc/company/bid-record/`;
  - `domain/gcc/company/record.ts` (`bidRecordFor(tenant, done, viewer, filters)`: tiles' inputs, the breakdowns, the table rows, the five-year series);
  - `pages/gcc/company/Record.tsx` and any chart parts under `pages/gcc/company/record/`.
- **Files to change:**
  - `pages/gcc/company/Company.tsx` (the tab), `Overview.tsx`, `company.css`, and the other Company tabs only for the equal-row change;
  - `domain/gcc/company/overview.ts` (the summary card's view model), `domain/gcc/company/index.ts` (export only; **keep every existing export**: plan 031 imports `profileFor`);
  - `pages/gcc/dev-checks/66-company.tsx` (new rows; existing targets unchanged);
  - `pages/gcc/screens.ts` only if the `/company` entry's line must mention the bid record (one line; re-read before editing, plan 030 adds an entry);
  - this plan's row in `app/plans/README.md`.
- **Out of scope** (stop and ask before touching):
  - the lifecycles and their generator (`data/gcc/lifecycle/**`), `lifecycle.port.ts`, the KPI registry (`domain/gcc/kpi/**`: reuse PF-3; don't edit it), the flows;
  - `pages/gcc/suppliers/**`, the library, the workspace (plans 029–031);
  - `access.ts` (no new capability), new libraries (charts are Recharts, already approved);
  - any existing fact in `src/data/`.

## Demo-grade rules
- Build what the prospect sees and clicks: the breakdowns, the drill into the table, the tender links.
- Add no new rules beyond the reads above; the only new facts are the four earlier years' aggregates.
- Keep dev checks to about 12 rows. Polish Najd first (the hero tenant), then check the other four read sensibly.
- Keep the non-negotiables: the 12-month figures equal the dashboards' for the same viewer, masking is correct, Reset works.

## Steps

### Phase 1 — The earlier years' seed
- [x] 1.1 `BidYearSeed`: `{ from: 'YYYY-03-09', to: 'YYYY-03-08', submitted, won, lost, withdrawn, valueSubmitted: Money, valueWon: Money, bySector: Record<string, { submitted: number; won: number }> }` in the tenant's currency.
- [x] 1.2 Four years per GCC tenant (Najd, Corniche, Dafna, Batinah, Qurain). Size them to each company (its turnover and its last-12-month counts): a steady or improving win rate for most, and one tenant with a dip year to make the chart honest. Sectors come from the company's identity sectors.
- [x] 1.3 Acceptance: the seed meets the plausibility rules in Design; every figure lives in `src/data/` only.

### Phase 2 — Derivations (`domain/gcc/company/record.ts`)
- [x] 2.1 The 12-month set: submitted, results (won, lost, withdrawn), declines (DG1 discard and DG2 no-bid in the window, with reason codes), each with its lifecycle.
- [x] 2.2 Breakdowns: by sector, client type, country, value band (three bands in the company currency, set once in the domain from the tenant's typical bid size and labelled in words, e.g. "Under SAR 50 M"), and top clients (by bids, then wins, up to 8). Each gives bids, won, lost and win rate, with "n = …" where fewer than 5 results.
- [x] 2.3 Loss analysis: reasons with count and share; our place (median rank) and the median gap to the winner per reason, masked without `see.margin`.
- [x] 2.4 Captured → pursued → submitted → won over 12 months, from the same lifecycles. If `portfolio.flow.ts` already exposes these counts for the 12-month window, read them from it so the funnel card and this row agree.
- [x] 2.5 Forecast accuracy: `calibrationFor` over the 12-month outcomes (as OUT-4 reads them).
- [x] 2.6 The five-year series: the four seeded years, then the derived last 12 months.
- [x] 2.7 Filters: a sector narrows 2.1–2.5 and the table together; the five-year series ignores it.

### Phase 3 — The Bid record tab
- [x] 3.1 `Company.tsx`: `record` tab labelled **Bid record**, second in the list; `?tab=record`; old links unchanged.
- [x] 3.2 `Record.tsx`: tiles (PF-3 via `registryTile`; the others via `valueTile` with the full ⓘ text: means, counted, target, source), then the rows in the Design's order, each an `.eq-row` with `.eq-scroll` bodies, then the results table (AG Grid, since it has more than five rows).
  - [x] 3.2.1 Charts: Recharts, bars `--blue` for single series, and Won / Lost / Withdrawn in their stated colours with a legend; each chart has a screen-reader table (as `StageChart` does).
  - [x] 3.2.2 A click on a bar, a breakdown row or a tile filters the table and scrolls to it; the table's filter shows as a removable chip.
  - [x] 3.2.3 "How to read this" ⓘ on the tab's head explains the colours, the 12-month window, and that earlier years are the annual record.
- [x] 3.3 Acceptance, as the Head of Tendering in Najd:
  - [x] 3.3.1 The Win / loss tile equals the home dashboard's Win / loss tile at "Last 12 months";
  - [x] 3.3.2 the sector breakdown's bids add up to Bids submitted;
  - [x] 3.3.3 a lost tender in the table opens its workspace, and its result reads the same there.

### Phase 4 — Overview and equal rows
- [x] 4.1 The Bid record summary card on Overview, beside the Project record, in an `.eq-row`; **Bid record →** opens the tab.
- [x] 4.2 `.co-ov-cols`, `.co-facility`, `.co-teams`, and every other row of cards in Company's tabs become `.eq-row` with `.eq-scroll` bodies. List them in the report (tab, file:line).
- [x] 4.3 Acceptance at 1280 and 1440: cards in a row have the same width and height; the long card scrolls inside with its head fixed.

### Phase 5 — Checks
- [x] 5.1 `dev-checks/66-company.tsx`, about 12 new rows per tenant:
  - the 12-month won, lost and value won equal PF-3's at 12 months for the Head of Tendering;
  - submitted equals `submissionsIn` at 12 months;
  - each breakdown sums to its total;
  - loss reasons sum to lost;
  - declines equal the DG1 discards and DG2 no-bids in the window;
  - forecast accuracy equals `calibrationFor`;
  - the seed has four years, with won + lost + withdrawn = submitted, value won within 40–160% of turnover, and sectors within the company's.
- [ ] 5.2 typecheck and build pass; `/dev/checks` has no failing row in any tenant. *(Dev checks pass in all five tenants and typecheck is clean in this plan's files; `npm run build` is blocked by plan 031's `data/gcc/s2/profiles/generate.ts`, see Blockers.)*
- [x] 5.3 Browser (your own tab; reset the demo in that tab only), at 1280 and 1440, light and dark, no console errors:
  - [x] 5.3.1 Najd as the Head of Tendering (everything), the Tender Coordinator (`company.view`, no `see.margin`: gap and predicted win masked), Finance (the Company section only);
  - [x] 5.3.2 Corniche and Qurain read sensibly (their currencies, their sectors);
  - [x] 5.3.3 after "Start: DG2 committee" (Demo menu) and a DG2 No-Bid on T-2026-097, "Chose not to bid" and the table follow if the decision falls in the window, and the dashboard agrees.
- [x] 5.4 Reset demo returns the tab to its seed readings (this plan adds no demo state).

## Data and derivation
- New facts: the four earlier rolling years per tenant in `data/gcc/company/`.
- Derived: `domain/gcc/company/record.ts`, reading lifecycles through `queriesFor`, PF-3 through `registryTile`, and `calibrationFor`.
- No new `done` keys.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants *(build: see Blockers)*
- [x] Company › Bid record shows won, lost and declined tenders by sector, client type, country, size and client, why we lost, and five years of record
- [x] The 12-month figures equal the home dashboard's Win / loss at 12 months for the same viewer
- [x] Colours are fixed (won green, lost grey, withdrawn hatched, single series blue) and explained on screen
- [x] Cards side by side on every Company tab share width and height; long content scrolls inside
- [x] Masking of the gap to winner and the predicted win is correct; Reset returns to the seed
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
Executor, 2026-09-29.

- **Changed files:**
  - New: `data/gcc/company/bidRecord.ts` (`BidYearSeed`, `BID_RECORD_YEARS`: four rolling years per tenant); `domain/gcc/company/record.ts` (`bidRecordFor`, `bidSummaryFor`, `valueBandsOf`, `RECORD_PERIOD`, `RECORD_STATUS`, `LOSS_LABEL`, `declineReasonLabel`); `pages/gcc/company/Record.tsx` (the tab, component `BidRecord`); `pages/gcc/company/record/{Cards,FiveYearChart,RecordGrid}.tsx`.
  - Changed: `pages/gcc/company/Company.tsx` (the `record` tab, second); `Overview.tsx` (the Bid record card, two equal rows, `.eq-scroll` bodies); `Teams.tsx` (equal row); `company.css` (the bid record block; `.co-ov-cols` and `.co-teams` grid rules removed); `domain/gcc/company/overview.ts` (`bids: BidSummaryVM`); `domain/gcc/company/index.ts` (one line, `export * from './record'`; every existing export kept); `pages/gcc/dev-checks/66-company.tsx` (14 rows, 17–30; targets 1–16 unchanged); `pages/gcc/screens.ts` (the `/company` line names the bid record; re-read before editing, one line).
- **Rows made equal (tab, file:line):**
  - Overview: `Overview.tsx:316` Project record | Bid record; `Overview.tsx:320` Turnover by year | Where this profile is used (was `.co-ov-cols`, 5fr / 7fr). Bodies: `:158`, `:213`, `:233`, `:246`, `:280`.
  - Teams and partners: `Teams.tsx:22` (was `.co-teams`, auto-fit 420 px, `align-items: start`); `--eq-cols` is the number of teams (1 fills the row, up to 3); body `:26`.
  - Bid record (new): `Record.tsx:266` (2), `:277` (3), `:283` (2), `:288` (2); bodies in `Record.tsx:269` and `record/Cards.tsx`.
  - Not rows of cards, left as they were: `.co-facility` (two columns inside the one facility card, already equal widths), `.co-rec-lists`, `.co-recent`. Credentials, Projects and Financials have no cards side by side.
- **Verification** (my own headless Chrome over the DevTools protocol, own profile, against the shared dev server on 5173; reset only there):
  - typecheck: no error in any file of this plan. `npm run build`: see Blockers. `vite build` of the whole app into my scratchpad succeeds (the Company chunk is 106 kB).
  - `/dev/checks`, every tenant, no failing row on the page: Najd 920, Corniche 511, Dafna 492, Batinah 500, Qurain 515 (wave 9b's counts + 14). The company card reads "All 30 pass".
  - 3.3.1: Win / loss on the tab equals the home dashboard at "12 months" for the Head of Tendering in all five tenants (Najd "9 won · 24 lost, 27% · SAR 1.72 bn won, Target 25%"). The funnel row equals the dashboard's funnel (2,080 → 60 → 38 → 9); declines 116 + 14 = the funnel's discarded and no-bid.
  - 3.3.2: sector bids add up to Bids submitted (38) in every tenant (and client type, country, size; row 20).
  - 3.3.3: T-2025-270 in the table reads Lost · Price · 2 of 6 · decided Thu 5 Mar; its link opens `/tenders/T-2025-270`, whose tracker reads "Lost · price · ranked 2 of 6 · Thu 5 Mar".
  - Clicks: each tile, breakdown row, loss reason, decline reason, funnel count and part of the last five-year bar sets the table's filter; the table scrolls into view and focus goes to the chip's clear button; the chip clears. The sector chip narrows tiles, rows, funnel (captured says "all sectors") and table; the five years stay. Tooltip on the chart shows the year's figures and sectors.
  - 5.3.1: Najd Head of Tendering (everything); Tender Coordinator (Forecast accuracy masked, the gap to the winner masked in Why we lost, 26 masked cells in the price-loss table); Finance (sidebar Dashboard, Calendar, Company profile, Settings; the 12 months read 0 with "count only the tenders shared with you"); Bid Manager also checked (assigned every historic bid, so sees all).
  - 5.3.2: Corniche (AED; Buildings MEP, District cooling, Fit-out) and Qurain (KWD; Water, Infrastructure, Oil and gas facilities) read sensibly; Dafna and Batinah checked too.
  - 5.3.3: Demo menu › "Start: DG2 committee", a third position recorded as secretary (quorum met), Record No-Bid on T-2026-097 (Capacity conflict): Chose not to bid 130 → 131, "No-bid at DG2" 14 → 15 with "Capacity conflict 1"; the dashboard's funnel reads 15 no-bid. 5.4: Demo › Reset this company returns 130 / 14.
  - 4.3: at 1280 and 1440, every row's cards share width and height (e.g. 467 × 440 | 467 × 440); long cards scroll inside with the head fixed (checked by scrolling Top clients). Light and dark at 1280 and 1440. No console errors (only React Router's existing future-flag warnings).
- **Deviations from plan:**
  1. Value won is the registered OUT-3 (`registryTile`), not a `valueTile`, so it equals the dashboards' Value won at 12 months. With a sector chosen, Win / loss and Value won become `valueTile`s over the narrowed totals, with PF-3's and OUT-3's own ⓘ text plus "Narrowed to …"; OUT-3's order-intake target is dropped for a sector.
  2. When the viewer cannot open every tender in the window (`partial`, e.g. Finance), PF-3 and OUT-3 keep their values but lose tone and status: a company target would otherwise call a part of the record "Off track".
  3. The third series is **Withdrawn or cancelled**: the 12-month lifecycles have no `withdrawn` result, only `cancelled` by the employer (2 in Najd, 7 in Corniche). The seed field stays `withdrawn`.
  4. The predicted win % is masked without `see.margin` **or** `see.positions`: the plan names `see.margin`; the tender table masks it with `see.positions`. Requiring both keeps the two screens from disagreeing (the same for every `company.view` role today).
  5. By country: each tenant bids in one country, with its cities 1–3 bids each, so the card shows one row and says "Every bid in the last 12 months was in …".
  6. Value bands are derived once per tenant from the seed's 12-month bids (the thirds, rounded to a round figure), not typed: Najd under SAR 150 M · SAR 150–250 M · SAR 250 M and over; Corniche AED 250 / 400 M; Dafna QAR 150 / 300 M; Batinah OMR 15 / 30 M; Qurain KWD 15 / 30 M.
  7. The table is "Tenders, last 12 months": it opens on the bids (submitted, or with a result, in the window); a count can also list declines or pursuits, so the status words run Won … In progress. It is my own fixed-height grid (`record/RecordGrid.tsx`, 10 rows, then it scrolls) because `S1Grid` is auto-height and not in my files.
  8. Overview: two rows, Project record | Bid record and Turnover by year | Where this profile is used. The card adds "Chose not to bid" as its sixth figure. In a half-width card the project record's two bar lists stack, and the usage card's gap rows read on two lines.
  9. Declines are counted by their first reason code, so the rows add up to the decisions. The history's codes `pq-fail`, `contract-risk` and `price-competition` get words in `record.ts` (`declineReasonLabel`); `reasonLabel` returns them raw.
  10. The seed check for 2021–22 compares with FY2022: the accounts start at FY2022.
  11. The dev checks are 14 rows, each across the five tenants (the file's pattern), rather than about 12 per tenant.
- **Blockers / questions:**
  - `npm run build` stops at `tsc -b` on `src/data/gcc/s2/profiles/generate.ts(458,9)`: "'delivered' is declared but its value is never read". That is plan 031's file, mid-edit. Re-run several times over about 20 minutes; not touched. The orchestrator should re-run the build once 031 lands.
- **Follow-ups noticed (not done):**
  - Our place and the gap to the winner are recorded on 2 of Najd's 24 losses (1 gap) and on none in the other tenants, so "Why we lost" and the table read "Not published" almost everywhere. More places and gaps on the history results (the lifecycle generator, out of scope) would let that card land.
  - The generated bids are large for Batinah (value won OMR 177.5 M in 12 months, about 4× its FY2025 turnover of OMR 43.5 M) and Corniche (AED 2.46 bn, about 2×). The seeded years keep to 40–160%, so the 12-month value jumps in the chart's tooltip.
  - Forecast accuracy reads off target in Corniche (0 of 2 bands), Batinah (0 of 3) and Qurain (0 of 2): the generated predictions do not calibrate. It is what `calibrationFor` (OUT-4) says; decide whether that is the intended story.
  - Catalogue §D and dashboards.md §8.3 do not mention the Bid record tab yet.
  - Finance opens only invited tenders, so its 12 months read 0. If Finance should read the company's record, that is an access decision.
  - Loss-reason words are defined three times (`lifecycle.port.ts`, `stage9.kpi.ts`, `record.ts`); `CALIBRATION_MIN_N` and the tolerance are not exported from `s3/win.ts`.
