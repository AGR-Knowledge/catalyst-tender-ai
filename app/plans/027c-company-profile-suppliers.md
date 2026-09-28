# 027c — Company profile and Suppliers: their own sidebar entries, and pages a prospect can explore

Status: DONE (2026-09-28, reviewed) · Depends on: wave 8 (commit 10de455) and the orchestrator's wave 9 contract (below) · Can run in parallel with: 027a, 027b, 027d

## Goal
The sidebar has a **Company** section with two entries, **Company profile** and **Suppliers**. Today Suppliers hides under Stage 2 › Sourcing, and "Company" opens straight onto a credentials table.
- **Company profile** opens on an Overview that reads like a bidder's profile: who the company is, its registrations, its key figures, its turnover by year, its project record, and where the agents use this profile on live tenders. Then tabs for Credentials, Projects, Financials and Teams and partners.
- **Suppliers** is a proper supplier master: the dashboard kit's tiles, a table a procurement lead can filter by trade, country and screening, and a side sheet per supplier with its screening, approvals, performance and the RFQs it has open with the company.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Build what the prospect sees and clicks.** No new facts, rules or libraries. The Overview, the project detail and the supplier sheet are compositions of data and rules that already exist (listed under Context). If a section would need a new fact, leave it out and note it under Follow-ups.
- **No prices on Suppliers.** The supplier sheet never shows a quoted price, a rate or a package value. Counts, dates and statuses only.
- **Masking stays as today.** Whatever today's Company tabs mask for a role stays masked in the new places.
- **Keep dev checks small:** extend `dev-checks/66-company.tsx` by at most 8 rows; no new file unless 66 can't hold them.
- **Keep other readings still.** All `/dev/checks` rows that exist today must still pass in the five tenants (after wave 8: Najd 805, Corniche 396, Dafna 377, Batinah 385, Qurain 400). Plans 027a, 027b and 027d add rows in parallel; those aren't yours.
- **Stay in your files** (Scope). If a change needs another file, stop and ask.

## Context
- **Why:** user feedback, 2026-09-28: "The company profile and procurement/supplier pages need more refinement, and they should be present separately in the menubar."
- **The sidebar today** (`data/access.ts` about 405–490, `NAV_GCC`; rendered by `components/layout/Sidebar.tsx` `GccNav`):
  - Dashboard, Calendar, My requests;
  - STAGES 1–9, where Stage 2 › Sourcing holds Packages & RFQs, Quote levelling and **Suppliers** (`cap: 'supplier.view'`);
  - **Company** (`/company`, `cap: 'company.view'`), a single entry;
  - Administration and Settings, pinned to the bottom.
  - `navFor` filters by `can`. Its comment carries a self-check table of who sees what (about 500–520); keep it true.
  - `supplier.view` is held by the Head of Tendering, the CEO and the Procurement Lead. `company.view` is held by every role except the Commercial Manager, Planning, Proposal, Compliance, the Project Director, the supplier and the operator (see the table).
- **Company today:** `pages/gcc/company/Company.tsx` has four tabs: Credentials (the default), Capability profile, Bank facility, and Teams and partners. The tab and the open credential are in the URL (`?tab=`, `?cred=`).
  - `Profile.tsx`: company facts, sectors, geographies, accounts by financial year, group entities, and the similar-projects grid.
  - `Credentials.tsx`: the vault, with a tile strip (`Strip` + `valueTile`), a grid whose at-risk and expired rows carry a 3 px inset left stripe (`company.css` about 9–10), and a credential sheet (`?cred=`).
  - `Facility.tsx`: the bank guarantee facility (limit, utilised, committed, headroom).
  - `Teams.tsx`: teams with load meters, and partners.
  - The domain is in `domain/gcc/company/index.ts` (`profileFor`, `facilityFor`, `teamsFor`) and `vault.ts` (`vaultFor`).
  - **Links into Company:**
    - `domain/gcc/actions/requests.actions.ts` about 21 goes to `/company?tab=credentials&cred=…`;
    - `domain/gcc/kpi/portfolio.kpi.ts` about 338 goes to `?tab=credentials&bids=affects`, and about 379 to `?tab=teams`;
    - `pages/gcc/s1/parts/EligibilityPanel.tsx` about 81 goes to `?tab=credentials…`;
    - `pages/gcc/dev/fixtures.ts` about 140 goes to `/company`.
    All of them must still land on the right tab.
- **Suppliers today:** `pages/gcc/s2/Suppliers.tsx` (122 lines).
  - It uses the legacy `Kpis` primitive (a different look from the dashboard tiles), an `S2Grid` with nine columns, three screening filter chips, a search, and a detail card under the table when a row is selected.
  - The data is `suppliersOf(tenant)` (`Supplier`: `name`, `city`, `country`, `trades`, `avl`, `icv`, `prequal`, `screening { sanctions, antiBribery }` with `checkedAt`, `performance { onTimePct, ncrs12m, quotes12m, awards12m }`, `load`, `response { ratePct, avgDays }`, `national`, `contactPersonId`).
  - The rules: `screeningOf`, `heldByScreening`, `RESCREEN_DAYS`, and, for the RFQs a supplier has open, `liveS2Tenders`, `rfqsFor` and `registerRow` (all from `domain/gcc/s2`).
- **Kit to reuse:**
  - `Strip` + `valueTile` (`pages/gcc/s1/parts/Strip.tsx`, `pages/gcc/s1/vm/tiles.ts`);
  - `Sheet` (`components/tender/Sheet.tsx`: a side sheet with previous and next, as the credential drawer uses);
  - `S1Grid` / `S2Grid` (AG Grid), `StatusPill`, `Meter`, `Money`, `When`, `EmptyState`, `Tabs`.
- **The orchestrator's wave 9 contract:** `TileVM` and `valueTile` now take `detail`, `ref: { k, v }` and `status` (plan 027a makes the tile render them).
  - Give every tile you build a `detail` line (one short line: what the value is made of) and a `ref` pair, keyed from `Target`, `Cap`, `Since {date}`, `Largest`, `Oldest`, `Latest late`, `Next`, `First needed`, `Peak`, `Worst` or `Average`.
  - Keep `sub` as the full sentence (screen readers and dev checks read it).
  - Until 027a lands, tiles show `sub`; that is expected.
  - `tokens.css` has `--blue*` and `--violet*`. **Nobody edits `tokens.css` in wave 9.**
- **No coloured left stripes:** the user turned them down on the dashboard tiles (2026-09-28). Don't add them, and remove the credential rows' inset stripes (their State column already says "At risk" or "Expired").

## Scope
- **Files to create or change:**
  - `data/access.ts`: `NAV_GCC` (the Company group and Stage 2's children) and the self-check comment only;
  - `components/layout/Sidebar.tsx`: `GCC_ICON` only (an icon for Suppliers; `Factory` is already imported);
  - `pages/gcc/company/**` (all files; new ones allowed) and `domain/gcc/company/**` (new read-only view models allowed);
  - new `pages/gcc/suppliers/**` (the Suppliers page moves here) and new `domain/gcc/suppliers/**` (the supplier profile view model, read only, built on `domain/gcc/s2`); delete `pages/gcc/s2/Suppliers.tsx`. Keep what `s2.css` other Stage 2 screens use;
  - `pages/gcc/screens.ts`: the `/company` and `/suppliers` entries only. Plan 027b edits the `/calendar` entry in parallel: re-read before editing, change only your lines;
  - the `/company` link in `pages/gcc/dev/fixtures.ts`, if the default tab change needs it;
  - `pages/gcc/dev-checks/66-company.tsx`;
  - `docs/07-product-design/agr-product-definition/dashboards.md` §8.3 (the sidebar). Plans 027a and 027d edit other sections: re-read right before you edit. Also `kpi-and-screen-catalogue.md` §D (Company), a short update.
- **Out of scope** (stop and ask before touching):
  - `domain/gcc/s2/**` rules and `data/**` (read them; don't change them);
  - any credential, eligibility, facility or team figure;
  - the Stage 2 screens other than Suppliers (Packages & RFQs, Quote levelling, shortlists);
  - the Supplier Portal (`pages/gcc/supplier/**`);
  - the dashboard kit (`components/dashboard/**`, plans 027a and 027d), `tokens.css`, `viewmodels.ts`;
  - new capabilities or roles.

## Steps

### Phase 1 — The sidebar
- [x] 1.1 `NAV_GCC`: the `company` group gets the section label "Company" and two items:
  - `company`: "Company profile", `/company`, `cap: 'company.view'`;
  - `suppliers`: "Suppliers", `/suppliers`, `cap: 'supplier.view'`.
- [x] 1.2 Remove Suppliers from Stage 2's children (`STAGE_SCREENS[2]`), so one page has one entry. Stage 2 keeps Packages & RFQs and Quote levelling.
- [x] 1.3 `GCC_ICON`: `suppliers` gets the `Factory` icon; `company` keeps `Building2`.
- [x] 1.4 Update `navFor`'s self-check table: a Suppliers column (Head of Tendering, CEO, Procurement Lead), and the Company column renamed "Company profile".
- [x] 1.5 (acceptance) As the Head of Tendering, the CEO and the Procurement Lead: the Company section shows both entries. As the Bid Manager, the Tender Coordinator, a committee member, Finance and HR: Company profile only. As the Commercial Manager: neither. On `/suppliers`, "Suppliers" is highlighted and Stage 2 stays folded unless opened.

### Phase 2 — Company profile: structure
- [x] 2.1 `screens.ts` `/company`: name "Company profile", line "Who you are as a bidder: registrations, credentials, project record, accounts, bank facility and teams, as every eligibility check reads them."
- [x] 2.2 Tabs: **Overview** (the default, no `tab` parameter) · **Credentials** · **Projects** · **Financials** · **Teams and partners**. URL values: `credentials`, `projects`, `financials`, `teams`.
  - [x] 2.2.1 Old values still work: `?tab=profile` opens Overview, `?tab=facility` opens Financials.
  - [x] 2.2.2 `openTab` writes `tab=credentials` explicitly now that Credentials isn't the default. Every link listed under Context still lands on its tab, with `?cred=` and `?bids=` working.
  - [x] 2.2.3 The Credentials tab keeps its "2 at risk" badge.

### Phase 3 — Company profile: Overview (new)
- [x] 3.1 **Identity card**, full width:
  - the tenant's monogram (the brand mark may use the tenant's accent), the company name, the head office, employees, the financial year end;
  - sectors and geographies as chips;
  - a **Registrations** row: the credentials of kind `cr`, `classification`, `contractors-authority`, `chamber` and `engineers-council` that the vault holds, each with its name, issuer and state pill ("Valid to 31 Dec 2026"). Read from `vaultFor`; nothing new.
- [x] 3.2 **Key figures**, a tile strip (`Strip` + `valueTile`, each tile with `detail` and `ref`):
  - Turnover, latest year (draft or audited), ref `Previous · FY2024 SAR 1.52 bn`;
  - Net worth, the latest stated year;
  - Similar projects on record, ref `Largest · …`;
  - Credentials held, with a status when any is at risk, ref `Next expiry · 30 Apr`;
  - Bank facility headroom, ref `Cap · {limit}` (the same headroom the DG1 pack quotes);
  - Bid-team load, the busiest team (from `teamsFor`), ref `Peak · …`.
  Each tile drills to its tab (a `route` drill). If a role may not see a figure today, the tile shows `Masked`.
- [x] 3.3 **Turnover by year**: the four financial years as CSS bars (no chart library), in `--blue`. A draft year's bar is pale with a dashed outline and reads "Draft, audit due 15 Apr". Net worth and the current ratio are shown under the bars where stated.
- [x] 3.4 **Project record**: counts and total value by country and by role (prime, JV lead, JV member, subcontractor), as two short bar lists; then the three most recent projects as compact cards (title, client, value, completed), with "See all 9 projects" going to the Projects tab.
- [x] 3.5 **Where this profile is used:** the live tenders the viewer can see, read through the eligibility check (`eligibilityFor` in `domain/gcc/s1`). The count of tenders it runs on, how many meet every line, and how many have a gap, with the top three gaps named ("T-2026-118 · Zakat certificate must hold to 10 May"). Each links to that tender's Eligibility tab. If `eligibilityFor` can't be read per tender without a new rule, show the at-risk credentials' affected bids from `vaultFor` instead, and note it under Deviations.
- [x] 3.6 Layout at 1440: identity card; tiles; then two columns (turnover | project record); then "Where this profile is used". At 1280 the two columns stay; below 1100 they stack.

### Phase 4 — Company profile: the other tabs
- [x] 4.1 **Credentials:** unchanged, except:
  - its tiles get `detail` and `ref`;
  - the rows' inset left stripes go (`company.css` `.co-row-risk`, `.co-row-expired`); the State pill carries the state.
- [x] 4.2 **Projects** (the similar-projects register, moved out of Capability profile):
  - a search, and filter chips by country and by role, with counts;
  - the grid as today, plus a "Holder" column when group entities exist;
  - a row click opens a `Sheet` with the project: scope, client, country, value, completed, role, holder entity, capacity or measures, the O&M period, and the fields it counts for;
  - if 3.5's eligibility reading exposes it, "Used as evidence on" (tender and line). Otherwise leave it out.
  - The project in the URL (`?tab=projects&project={id}`).
- [x] 4.3 **Financials:** the accounts by financial year (from today's Capability profile), the group entities, then the bank facility (today's `Facility` component) under its own heading. One tab, because Finance reads them together.
- [x] 4.4 **Teams and partners:** as today; its meters use the kit's `Meter`, without any tone stripe.
- [x] 4.5 Delete `Profile.tsx` once Overview, Projects and Financials hold its content, or keep it as the Financials body; don't leave dead code.

### Phase 5 — Suppliers
- [x] 5.1 Move the page to `pages/gcc/suppliers/Suppliers.tsx`; `screens.ts` `/suppliers`: name "Suppliers", line "Your supplier master: screening, approvals, performance and the RFQs each supplier has open with you."
- [x] 5.2 **Tiles:** replace the legacy `Kpis` with `Strip` + `valueTile` (same facts as today, each with `detail` and `ref`): Suppliers; Screened, current (ref `Cap · re-screen every 180 days`, or the nearest key in the list); Screening due (status "Watch" when above zero; ref `Oldest · {date}`); Blocked; Held by screening (ref naming the shortlists). A tile drills by setting the table's screening filter.
- [x] 5.3 **The master table** (`S2Grid`):
  - [x] 5.3.1 Columns:
    - Supplier (the name, with city and country under it);
    - Trades (up to three chips, then "+2");
    - Approved by (the count, with the short names under it);
    - ICV (the score with a thin bar);
    - Screening (pill);
    - On time %; NCRs (12 m);
    - Replies (% and the average days);
    - Load (a pill: low, medium, high);
    - Open RFQs (the count across live tenders).
  - [x] 5.3.2 Filters: the screening chips (as today), plus a Trade select and a Country select, each with counts, and the search. A "Clear" appears when any filter is on. The count line reads "31 of 48".
  - [x] 5.3.3 Row height and column widths fit 1440 without a horizontal scrollbar in the common case; the grid scrolls inside at 1280.
- [x] 5.4 **The supplier sheet** (`Sheet`, with previous and next through the filtered rows; the supplier in the URL as `?supplier={id}`):
  - [x] 5.4.1 Header: the name, the location, a "National product" badge where true, the screening pill, and the prequalification state.
  - [x] 5.4.2 **Screening:** sanctions and anti-bribery, each with its state and the date checked; the next re-screen due (`checkedAt` + `RESCREEN_DAYS`), in orange when it has passed; the shortlists it is held on (`heldByScreening`), with the tender and package.
  - [x] 5.4.3 **Approvals:** the clients whose approved lists include it (full names), its ICV score with a one-line explanation ("In-country value score, 0–100"), and its prequalification.
  - [x] 5.4.4 **Performance, 12 months:** on time % and reply rate as `Meter`s; NCRs; quotes against awards ("14 quotes, 3 awarded"); average reply days; load.
  - [x] 5.4.5 **Open with us:** its RFQs on live tenders: the tender (ID and short title), the package, sent, reply by, and a status pill (Replied, Due, Overdue, Declined). Read from `liveS2Tenders`, `rfqsFor` and `registerRow`. **No prices.** Each row links to the tender's Sourcing tab.
  - [x] 5.4.6 **Contact:** the Supplier Portal person, if `contactPersonId` is set, and "Open the Supplier Portal preview" where the viewer may open it (reuse `pages/gcc/s2/portalLink.ts`).
- [x] 5.5 Empty and edge states: no match ("No supplier matches. Clear the search or a filter."); a supplier with no open RFQs ("No open RFQs with you.").

### Phase 6 — Checks and the spec
- [x] 6.1 `66-company.tsx`, at most 8 new rows:
  - the Overview's facility headroom equals `facilityFor`'s;
  - the credential count and the next expiry equal the vault's;
  - the project count and the largest equal `profileFor`'s;
  - "Where this profile is used" counts only tenders the viewer can see;
  - each supplier sheet's open RFQs equal `rfqsFor` across `liveS2Tenders`;
  - the next re-screen date is `checkedAt` + `RESCREEN_DAYS`;
  - `navFor`: Suppliers for `hot`, `exec` and `proc` only, and not under Stage 2.
- [x] 6.2 `dashboards.md` §8.3: the sidebar sketch and rules gain the Company section (Company profile, Suppliers); Suppliers leaves Stage 2's list. Record "User decision, 2026-09-28".
- [x] 6.3 `kpi-and-screen-catalogue.md` §D: the Company profile's tabs and the Overview's sections, in a few lines.

## Data and derivation
- No new facts. New read-only view models: the Overview (`domain/gcc/company/overview.ts`), a project's detail, and the supplier profile (`domain/gcc/suppliers/profile.ts`).
- No new `done` keys, so Reset is unaffected.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] `/dev/checks` in all five tenants: no failing row; 66's new rows pass.
- [x] Sidebar per 1.5, in Najd, with no console errors.
- [x] Najd, Faisal Al-Harbi, Company profile at 1440 and 1280, light and dark:
  - [x] it opens on Overview; the identity card, registrations, tiles, turnover bars (FY2025 as a draft), project record and "Where this profile is used" all read from the seed;
  - [x] Credentials, Projects (the sheet opens and deep-links), Financials (accounts and facility) and Teams and partners work; `?tab=profile` and `?tab=facility` still land;
  - [x] from My requests (as Finance), "Open credentials" still opens the credential's sheet; the dashboard's Credentials at risk tile still opens Credentials filtered to affected bids.
- [x] Najd, Procurement Lead, Suppliers at 1440 and 1280:
  - [x] the tiles look like the dashboard's;
  - [x] filter by the trade "piling" and the country Saudi Arabia; the count line and the chips agree;
  - [x] open a blocked supplier's sheet: screening shows the sanctions or anti-bribery reason, and the shortlists it is held on; previous and next move through the filtered rows; the URL carries `?supplier=`;
  - [x] a supplier with RFQs out on the hero shows them under "Open with us", with no price anywhere.
- [x] Corniche and Batinah: both pages read their own tenant's data (Batinah's Arabic-sourced tender reads in English).
- [x] Reset demo returns everything to seed.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
Executor, 2026-09-28. Not committed.

- **Changed files:**
  - `data/access.ts`: `NAV_GCC` only. The `company` group has the label "Company" with Company profile (`/company`) and Suppliers (`/suppliers`), and Suppliers is gone from `STAGE_SCREENS[2]`. The header comment and `navFor`'s self-check table are rewritten, with the columns "Company profile | Suppliers" and a line on why Suppliers left Stage 2.
  - `components/layout/Sidebar.tsx`: `GCC_ICON.suppliers` = `Factory`.
  - `pages/gcc/screens.ts`: the `/company` and `/suppliers` entries only (027b's `/calendar` is left alone).
  - `pages/gcc/dev/fixtures.ts`: the SCR-6 fixture drill is now `/company?tab=credentials&bids=affects` (one line).
  - `domain/gcc/company/index.ts`:
    - `ProjectVM` is exported, with `roleKey`, `tertiary`, `om`, `fields` and `measures` filled by `profileFor`;
    - `inCcy` is exported;
    - `COUNTRY_NAME` gains the European and Asian supplier countries, so the grid shows names, not codes.
  - `domain/gcc/company/overview.ts` (new):
    - `overviewFor` returns identity, registrations, key figures, turnover, project record and usage;
    - `usageFor` gives "Where this profile is used", per tender through `eligibilityFor`, and each project's "Used as evidence on".
  - `pages/gcc/company/`:
    - `Company.tsx` has five tabs, the Overview default, the old `profile`/`facility` aliases and an explicit `tab=credentials`;
    - `Overview.tsx`, `Projects.tsx` and `Financials.tsx` are new;
    - `Credentials.tsx`: tile `detail`/`ref`/`status`, drills that carry `tab=credentials`, and no row stripes;
    - `company.css`: the Overview and Projects styles are added; `.co-row-risk`, `.co-row-expired` and `.co-profile-cols` are removed;
    - `Profile.tsx` is deleted, its content now in Overview, Projects and Financials.
  - `domain/gcc/suppliers/profile.ts` (new): `supplierMasterFor`, `supplierProfileFor`, `openRfqsOf` and `rfqStateOf`, with labels and tones. No money field.
  - `pages/gcc/suppliers/Suppliers.tsx` and `suppliers.css` (new): the tiles, filters, grid and supplier sheet.
  - `pages/gcc/s2/Suppliers.tsx` is deleted. In `s2.css`, only the Suppliers block (`.s2-search`, `.s2-filters`, `.s2-chip`) is removed; no other Stage 2 screen used it.
  - `dev-checks/66-company.tsx`: 8 new rows (9–16).
  - Docs:
    - `dashboards.md` §8.3: the sketch, with Stage 2 as "Packages & RFQs · Quote levelling" and a COMPANY section, plus the "Company section" rule, "User decision, 2026-09-28";
    - `kpi-and-screen-catalogue.md` §D: the Suppliers row, five "Company profile › …" rows, and a paragraph under the table on the Overview and the old links.
- **Verification:**
  - `tsc -b` and `npm --prefix app run build` pass. The chunk-size warning was there before.
  - `/dev/checks` has no failing row in any of the five tenants: Najd 825, Corniche 416, Dafna 397, Batinah 405, Qurain 420. That is +20 on wave 8 in each: 8 are mine, the rest come from parallel plans. The 8 new rows in 66 pass: 201 open RFQs match `rfqsFor`, and 143 re-screen dates are `checkedAt` + 180.
  - Browser (Playwright, headless, no console errors):
    - **Sidebar (1.5):**
      - hot, exec and proc see Company profile and Suppliers;
      - bid, coord, a committee member, fin and hr see Company profile only;
      - comm sees neither;
      - Stage 2's children are Packages & RFQs and Quote levelling;
      - on `/suppliers`, Suppliers is highlighted and Stage 2 stays folded for the Head of Tendering. It is open for Procurement, whose home stage it is, as before.
    - **Company profile** (Najd, Faisal Al-Harbi, 1440 and 1280, light and dark):
      - Overview is the default;
      - all six tiles drill to their tab;
      - FY2025 shows as a dashed draft bar;
      - the record lists stack below 1440, and the two columns stack below 1100;
      - "Where this profile is used" links each gap to `/tenders/{id}?tab=eligibility`;
      - `?tab=profile` lands on Overview and `?tab=facility` on Financials;
      - `?tab=projects&project=najd-p1` opens the sheet; ↓ and Esc work, and focus returns.
    - **Links into Company:**
      - Finance's "Open credentials" in My requests opens the Zakat sheet;
      - the dashboard's Credentials at risk tile opens Credentials with "2 of 14" affected bids.
    - **Suppliers** (Najd, Procurement Lead, 1440 and 1280):
      - the tiles use the dashboard kit;
      - piling + Saudi Arabia reads "5 of 48", and the chip counts agree;
      - a blocked supplier's sheet shows the sanctions reason and its held shortlists;
      - ↑/↓ move through the filtered rows, and the URL carries `?supplier=`;
      - after "Start: RFQs out", gulf-process shows its two T-2026-118 RFQs under "Open with us", with no money anywhere;
      - the grid is 1114 px at 1440 with no horizontal scrollbar, and scrolls inside at 1280;
      - a passed re-screen date reads in orange.
    - **Other tenants:** Corniche, Batinah and Qurain read their own data. Qurain's group entities bring the Holder column. Batinah's Arabic-sourced tender reads in English.
    - **Reset demo:** it returns to seed (no done keys). No new done keys were added.
  - Scans: no numbers are typed into the pages and there are no role checks.
    - A last scan found "next 4 weeks" typed into the load tile. It now comes from `CAPACITY_WINDOW_DAYS / 7` through the view model.
    - The ICV scale ("0–100") and "Performance, 12 months" stay. They are plan copy, and the 12 months matches the data's `*12m` fields.
- **Deviations from plan:**
  - **Tile references, which have a 20-character limit:**
    - Turnover's reference reads "Previous · SAR 1.52 bn", with "FY2025, draft accounts" in the detail line instead of the year in the reference;
    - Credentials held's reference is "Next expiry · 30 Apr" (the date only).
    - References outside the list of keys: `Previous` and `Next expiry` (both named in the plan), `Latest` (net worth's year; blocked suppliers' latest flag) and `Shortlists` (Held by screening).
    - Screened, current: `Cap · Re-screen 180 days`.
  - **Status words:**
    - Renew soon and Renew now, for credentials on the Overview and Credentials;
    - Watch, for Screening due;
    - Excluded, for Blocked;
    - Held, for Held by screening.
    - The Held tile drills to `screening=due`, the nearest chip, because held suppliers are due or blocked.
  - **No tile masking.** Every figure on the Overview sits behind `company.view`, which the page guard already requires, and no role masks any of them today. A masked fallback would never show.
  - **Suppliers grid:**
    - S2Grid keeps its fixed 40 px rows;
    - `s2.css` is imported for its cell styles, and the accent stripe on a selected row is hidden on Suppliers only;
    - `company.css` is imported for `.co-chip`;
    - header tooltips are dropped, because AG Grid's TooltipModule isn't registered and the grid logs an error without it.
  - **Open RFQs:**
    - RFQs are counted once sent (`sentBy`), so a draft RFQ isn't "open with us";
    - the package title comes from `s2TenderOf().packages`, so `registerRow` wasn't needed.
  - **Projects:** the country and role chips show only when a group has two or more values; one chip would filter nothing.
  - **Tiles:** SRC-8 (Suppliers) is a `valueTile`, not a `registryTile`, because it isn't in the registry.
  - **3.5:** `eligibilityFor` reads per tender with no new rule, so the vault fallback wasn't needed. "Used as evidence on" is shown in the project sheet.
  - **Teams (4.4):** no edit. It already uses the kit's `Meter`, which has no tone stripe.
  - **Self-check table:** the CEO's row is corrected. Stage 2 lists packages and levelling, and there is no DG3 (`ALL_VIEWS` has no `dg3.view`), as the browser shows.
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  - `dashboards.md` §8.1 (about line 382) still lists Suppliers among Stage 2's screens. That section isn't mine; §8.3 is now authoritative.
  - The comment above `GccNav` in `Sidebar.tsx` still says "Company;". Only `GCC_ICON` was in scope.
  - 027a's status pill wraps under a long tile label, for example "Credentials held" plus "Renew soon" at 1280.
  - Finance and HR see an empty "Where this profile is used": they are on no tender with an eligibility check. The empty state says so; seed them onto a tender if the demo needs it.
  - Consider registering SRC-8 (Suppliers) so its tile can be a `registryTile` with a KPI ⓘ.
  - Registering AG Grid's TooltipModule would bring back header tooltips on the S1 and S2 grids.
