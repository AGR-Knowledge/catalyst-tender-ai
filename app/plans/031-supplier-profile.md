# 031 — Supplier profile in depth

Status: READY · Depends on: wave 9b (committed `3a00f3f`) and the wave 10 contract (`.eq-row` in `styles/components.css`); step 4.6 uses plan 030's `FileViewer` · Can run in parallel with: 029, 030, 032

## Goal
A procurement lead can open any supplier and see everything needed to decide whether to give it a package: who it is, how healthy its finances are now, what it has done and is doing for us, how it has performed, whether it is compliant, and who to call. All of it is on one profile page, with the supplier master and its quick-look sheet leading into it.

## Context
- **Why:** the user's review, 2026-09-29: "Suppliers: for each supplier we can go more in depth: their basic information, their current financial data, the latest projects they have worked or are working on for us … Suppliers are very important for the procurement team to look at all the data needed for assigning them projects, so go a little more in depth."
- **Current behaviour** (plan 027c):
  - `pages/gcc/suppliers/Suppliers.tsx` at `/suppliers`: five tiles (Suppliers, Screened current, Screening due, Blocked, Held by screening), a filterable master (AG Grid via `S2Grid`) and a `Sheet` per supplier (`SupplierPanel`) with screening checks, approvals (AVL), performance, held shortlist places and open RFQs. It shows counts, dates and states only.
  - `domain/gcc/suppliers/profile.ts`: `supplierMasterFor`, `supplierProfileFor`, `SupplierRowVM`, `SupplierProfileVM`, `tradeLabel`, `rfqStateOf`.
  - The data: `data/gcc/s2/suppliers/{najd,corniche,dafna,batinah,qurain}.ts` (48, 29, 16, 17 and 33 suppliers, built from tuples by `suppliers/build.ts`), type `Supplier` in `data/gcc/s2/types.ts:35`: name, country, city, trades, AVL clients, ICV score, prequal, screening (sanctions, anti-bribery with dates), `performance { onTimePct, ncrs12m, quotes12m, awards12m }`, `load`, `response { ratePct, avgDays }`, `national`, `contactPersonId`.
  - The company's own projects: `TenantData.projects: SimilarProject[]` (completed projects, `data/gcc/types.ts:77`), read through `profileFor(tenant)` in `domain/gcc/company/index.ts`. Won tenders of the last 12 months are lifecycles with `result.result === 'won'` (`queriesFor(...).resultsIn(window)`, as the portfolio's Win / loss tile PF-3 reads them).
  - A deterministic generator is available: `rngOf(seed)` and `hash32` in `data/gcc/lifecycle/rng.ts`.
  - Capabilities (`data/access.ts`): `supplier.view` is held by the Procurement Lead, the Head of Tendering and the CEO. `see.quotes` is held by the Procurement Lead, the Head of Tendering and the Commercial Manager; `see.quotes.summary` by the CEO, committee members and the Bid Manager (assigned).
- Read first: `/CLAUDE.md`, `app/plans/README.md` (architecture decisions; the wave 10 section), `docs/07-product-design/agr-product-definition/kpi-and-screen-catalogue.md` §D (Suppliers), `s1-s3-demo-spec.md` §8 (Stage 2 sourcing), `gcc-demo-data.md` §6 (suppliers), `dashboards.md` §3 (tiles: one detail line and one reference line on every tile). User's UI taste: no coloured stripes; status is a word in a pill; the same rows of text on every card; data colours fixed and explained (graph bars `--blue`); every colour has a stated meaning.

## Design

### Route and entry points
- New page **`/suppliers/:id`** (`?tab=` for the tab). Entry points: the sheet's new **Open full profile** button, a double-click or Enter on a master row, and the supplier's name wherever a screen links a supplier (only within this plan's files).
- The master and the sheet stay. The sheet gains three rows (Financial health, Working for us now, Last evaluation) and the Open full profile button at its top.

### Page anatomy
```
‹ Suppliers │ Supplier                                                     [Supplier Portal preview (demo)]
Rhein Aqua Systems GmbH                              [✓ Screened, current] [Prequalified] [Load · Medium]
Duisburg, Germany · Process mechanical · Est. 1998 · 420 staff · On 2 approved-vendor lists
─ tiles (the dashboard kit's Strip, 6): Awards with us (12 m) │ On-time delivery │ NCRs (12 m) │ RFQ replies │ Working for us now │ Financial health
─ tabs: Overview │ Financials │ Projects with us │ Performance │ Compliance │ Contacts & documents
```
Every tile has one detail line and one reference line (`key · value`), as dashboards.md §3 requires. Where cards sit side by side they use `.eq-row` (same width and height, the long one scrolls inside).

| Tab | Content |
| --- | --- |
| **Overview** | Row: **Company** (legal name, registration number, established, headquarters, staff, ownership and local share, ICV score, classification or grade, geographies served, approved-vendor lists) │ **Where it fits now**: the open packages on live tenders whose trade it covers, each with its standing (On the shortlist, RFQ sent, Replied, Held by screening, Not shortlisted), from the existing Stage 2 rules. Then **Capabilities**: per trade, the largest order it takes and a typical lead time; a one-line summary for the featured suppliers |
| **Financials** | Row: **Accounts** (the last three financial years: revenue, gross margin %, net margin %, net worth, current ratio, debt to equity; revenue as small `--blue` bars) │ **Current position** (the latest interim period: revenue to date, order book, bank guarantee capacity, credit rating (internal), payment terms, insurance cover). **Financial health** is one word in a pill (Strong, Adequate or Watch) from one stated rule, with a "How we rate this" ⓘ. Amounts in the supplier's currency, with the company-currency equivalent through `domain/money.ts` |
| **Projects with us** | **Working for us now**: one card per job on a tender we won in the last 12 months (project, client, package, started, due, progress, a status word On track, Watch or Late). **Completed with us**: a table of its work on the company's completed projects (project, client, package, supply or subcontract, completed, our rating, on time, NCRs, value). **Quoted with us**: the open RFQs (today's list) and the last 12 months' counts (quotes, awards) |
| **Performance** | The last four quarters (Q2 2025 to Q1 2026): quotes returned, awards, deliveries, on time %, NCRs (no RFQs-received or declined column, B4), as a small table and a `--blue` bar chart of on-time %. **Latest evaluation**: Quality, Schedule, HSE, Commercial and Communication scores (1–5) with the overall, the date and the evaluator's role |
| **Compliance** | The screening checks (today's content) with their history (the last three checks). Certificates: trade licence, commercial registration, ISO 9001, 14001 and 45001, the national-content or ICV certificate, insurance; each with a valid-to date and a status word (Valid, Renew soon (60 days or less), Expired). Approved-vendor lists. Held shortlist places (today's content). A blocked supplier shows its block first, in words |
| **Contacts & documents** | Key contacts (Managing director, Tendering contact, QA/QC manager, HSE lead), with fictional names, emails at a `.example` domain and phones in the country's format; the Supplier Portal user (today's contact). **Documents**: company profile, trade licence, ISO certificates, latest audited accounts, insurance certificate. **View** opens each in plan 030's `FileViewer` as a watermarked facsimile |

### Data rules (the profile must agree with the master)
- Figures the master already has are **never restated as new facts**. The profile's 12-month figures are built so that:
  - awards to it in the last 12 months = `performance.awards12m`;
  - NCRs over the last four quarters = `performance.ncrs12m`;
  - quotes over the last four quarters = `performance.quotes12m`;
  - on-time % over the last four quarters, weighted by deliveries, rounds to `performance.onTimePct`;
  - the reply rate and average days equal `response`;
  - the number of jobs "Working for us now" fits `load` (low 0–1, medium 2–3, high 4 or more).
- "Working for us now" jobs sit only on lifecycles with a won result in the last 12 months. "Completed with us" rows reference only the tenant's `projects` register. No new project or client name is invented.
- A blocked supplier has no job that started after the check that blocked it.
- Awarded values show only with `see.quotes` or `see.quotes.summary`; otherwise `<Masked by={holdersOf('see.quotes')} />`. Supplier financials show to every `supplier.view` holder. All checks go through `can()`.
- Every name is fictional. Contacts use role titles plus fictional personal names; emails use `@{supplier-slug}.example`.

### Where the new facts live
- `data/gcc/s2/profiles/`:
  - `types.ts` (`SupplierProfileSeed`);
  - `generate.ts`: `profileSeedOf(supplier, tenant)`, deterministic from `rngOf('supplier:' + id)` and the supplier's own fields (trades, country, performance, load), so the 143 suppliers get profiles without hand-typing;
  - `featured.ts`: hand-written overrides for about 8 featured suppliers (a summary line, a notable job, a risk note): the suppliers on the hero's shortlists in Najd, the two blocked suppliers (Tarvessa Trading FZE and Lumenza UV Systems), and one supplier quoting on T-2026-061 (Corniche) and one on T-2026-042 (Batinah);
  - `index.ts` (`supplierProfileSeed(tenant, id)`).
- Derivations go in `domain/gcc/suppliers/` (new `detail.ts`: `supplierDetailFor(tenant, id, done, viewer)`; `health.ts`: the one health rule; `performance.ts`: quarters and evaluation). `profile.ts` keeps its exports.

## Scope
- **Files to create:** `data/gcc/s2/profiles/**`; `domain/gcc/suppliers/{detail,health,performance}.ts`; `pages/gcc/suppliers/SupplierProfile.tsx` and its tab components (`pages/gcc/suppliers/profile/*.tsx`), `pages/gcc/suppliers/profile.css`; `pages/gcc/dev-checks/68-suppliers.tsx`.
- **Files to change:**
  - `pages/gcc/suppliers/Suppliers.tsx` and `suppliers.css` (the sheet's button and rows, master row open, two new master columns: Health and With us now);
  - `domain/gcc/suppliers/profile.ts` (add; don't rename existing exports);
  - `data/gcc/s2/index.ts`: one export line, if needed;
  - `App.tsx`: one route `suppliers/:id` beside `tenders/:id`, behind `supplier.view` (as `GccScreen` guards with `GuardCap`). Re-read `App.tsx` right before editing, because plan 030 edits `LEGACY_AT` in the same file;
  - this plan's row in `app/plans/README.md`.
- **Out of scope** (stop and ask before touching):
  - `data/gcc/s2/suppliers/*.ts` (the master's facts; the profile must fit them, not change them);
  - the Stage 2 rules (`domain/gcc/s2/**`) and screens (`pages/gcc/s2/**`) beyond reading them;
  - `pages/gcc/company/**` and `domain/gcc/company/**` (plan 032; read `profileFor` only);
  - `components/tender/FileViewer.tsx` and `domain/gcc/library/**` (plan 030; import only);
  - `access.ts` (no new capability), `screens.ts`, new libraries, the lifecycle generator.

## Demo-grade rules
- Build what the prospect sees and clicks. Depth goes into realistic content, not rule engines: one health rule, one fit list from the existing Stage 2 rules.
- Keep dev checks to about 12 rows. Polish the featured suppliers first: the hero's shortlist is what script B shows.
- Keep the non-negotiables: the profile never disagrees with the master or the Stage 2 screens, masking is correct, Reset works.

## Steps

### Phase 1 — Profile facts
- [x] 1.1 `profiles/types.ts`: `SupplierProfileSeed` with `company` (legal name, registration no., established, HQ, staff, ownership and local share, classification, geographies), `capabilities` (per trade: largest order, lead time), `accounts` (3 FYs), `interim`, `rating`, `paymentTerms`, `insurance`, `quarters` (4), `evaluation`, `certificates`, `screeningHistory`, `contacts`, `documents`, `jobs` (references: won lifecycle id + package title, or project register id).
- [x] 1.2 `generate.ts`: deterministic per supplier. It satisfies every rule in "Data rules" by construction: it picks the job counts first, then splits NCRs and quotes across the quarters, then solves on-time deliveries to hit `onTimePct`. Scale revenue plausibly by trade and country (a German process-equipment maker is larger than a local piling contractor).
- [x] 1.3 `featured.ts`: the ~8 overrides; they must still meet the Data rules.
- [x] 1.4 Acceptance: `supplierProfileSeed` returns a profile for every supplier in every GCC tenant, and the same values after a reload.

### Phase 2 — Derivations
- [x] 2.1 `health.ts`: one rule, stated in its ⓘ: Strong when the current ratio ≥ 1.5 and the net margin ≥ 5%; Watch when the current ratio < 1.1 or the net margin < 0; Adequate otherwise.
- [x] 2.2 `performance.ts`: the quarters, the weighted on-time %, the evaluation's overall score.
- [x] 2.3 `detail.ts`: `supplierDetailFor(tenant, id, done, viewer)`. It composes `supplierProfileFor` (screening, held places, open RFQs), the seed, the health word, **Where it fits now** (open packages on `liveS2Tenders` whose trade the supplier covers, with the standing from the shortlist and RFQ state), the jobs resolved to lifecycle titles and project register titles (skipping any the viewer may not open), certificate states against `DEMO_TODAY`, and the masked flags.

### Phase 3 — The master and the sheet
- [x] 3.1 Master: add **Health** (status word) and **With us now** (count; under the Load pill, B5); Enter or double-click on a row opens the full profile; a single click still opens the sheet.
- [x] 3.2 Sheet: an **Open full profile** button at the top; three new rows (Financial health, Working for us now, Last evaluation); its existing content unchanged.

### Phase 4 — The profile page
- [x] 4.1 `SupplierProfile.tsx` at `/suppliers/:id`: header per the anatomy, six tiles (`valueTile` + `Strip`, as `Suppliers.tsx` builds its tiles: detail and reference line on each), tabs (`Tabs`, `?tab=`), Back returns to the master with its filters (history back, else `/suppliers`). An unknown id shows the kit's `EmptyState`.
- [x] 4.2 Overview tab (Company │ Where it fits now as an `.eq-row`, then Capabilities).
- [x] 4.3 Financials tab (Accounts │ Current position as an `.eq-row`; the health pill with its ⓘ).
- [x] 4.4 Projects with us tab (jobs now as cards in an `.eq-row` of up to three; completed as AG Grid if more than five rows; quoted-with-us counts).
- [x] 4.5 Performance and Compliance tabs. Performance's quarters table has quotes, awards, deliveries, on-time % and NCRs only; the reply rate and days are the master's `response`, labelled so they don't read as a sum of the rows ("Replies to 84% of RFQs, in 3 days"), on the tile and in "Quoted with us" (B4).
- [x] 4.6 Contacts & documents tab. **Documents open in plan 030's `FileViewer`** (`components/tender/FileViewer.tsx`) with facsimiles from `facsimileHtml` (`domain/gcc/library/facsimile.ts`). If 030's Phase 1 isn't ticked in `030-tender-library.md` yet, do this step last; if it still isn't there when everything else is done, list the documents without View and note it under Blockers.
- [x] 4.7 Acceptance, as the Procurement Lead in Najd: open a supplier on the hero's shortlist; every tab reads well at 1280 and 1440; the tiles agree with the master's row (awards, on-time, NCRs, reply rate); a blocked supplier's profile leads with its block.

### Phase 5 — Checks
- [x] 5.1 `dev-checks/68-suppliers.tsx`, about 12 rows per tenant: a profile for every supplier; awards in 12 months = `awards12m`; the quarters' NCRs = `ncrs12m`; the quarters' quotes = `quotes12m`; weighted on-time rounds to `onTimePct`; the reply rate and days equal `response`; jobs now ≤ the `load` band's top and ≤ `awards12m` (B1); jobs now + delivered in the last 12 months = `awards12m` (B1); every job references a won lifecycle in the window or a register project; no job on a blocked supplier after its block; the health word matches the rule; certificate states against demo day.
- [x] 5.2 typecheck and build pass; `/dev/checks` has no failing row in any tenant.
- [x] 5.3 Browser (your own tab; reset the demo in that tab only), at 1280 and 1440, light and dark, no console errors:
  - [x] 5.3.1 Najd as the Procurement Lead (values shown), the Head of Tendering, and the CEO (`see.quotes.summary`: values per the masking rule);
  - [x] 5.3.2 a Tender Coordinator can't reach `/suppliers/:id` (the guard's message, not a blank page);
  - [x] 5.3.3 Corniche and Batinah: the featured supplier on T-2026-061 and on T-2026-042;
  - [x] 5.3.4 after "Simulate supplier replies" on the hero (Stage 2), the supplier's open RFQs and **Where it fits now** show the reply on the profile as on the Sourcing screen.
- [x] 5.4 Reset demo returns everything to the seed (this plan adds no demo state).

## Data and derivation
- New facts: `data/gcc/s2/profiles/**` (generated deterministically, plus ~8 featured overrides).
- Derived: `domain/gcc/suppliers/{detail,health,performance}.ts`.
- No new `done` keys.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants
- [x] Every supplier has a full profile page with the six tabs; the master and the sheet lead into it
- [x] The profile's 12-month figures equal the master's, and the jobs reference only real (seeded) tenders and projects
- [x] Masking of awarded values is correct for the Procurement Lead, the CEO and the Head of Tendering; the Tender Coordinator can't open the page
- [x] Cards side by side are the same width and height, with the long one scrolling inside
- [x] Reset demo returns to the seed state; no console errors
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor.)
- Changed files:
  - New facts: `data/gcc/s2/profiles/` with `types.ts`, `names.ts` (name pools by locale, phone patterns), `generate.ts` (the deterministic seed), `featured.ts` (9 overrides) and `index.ts` (`supplierProfileSeed`, cached).
  - New derivations: `domain/gcc/suppliers/` with `health.ts`, `performance.ts`, `detail.ts` (`supplierDetailFor`, `supplierGlanceOf`, `fitsFor`) and `documents.ts` (the facsimile files for `FileViewer`).
  - New page: `pages/gcc/suppliers/SupplierProfile.tsx`, `profile.css`, and `profile/` with `parts.tsx` and the six tabs (`OverviewTab`, `FinancialsTab`, `ProjectsTab`, `PerformanceTab`, `ComplianceTab`, `ContactsTab`).
  - New dev check: `pages/gcc/dev-checks/68-suppliers.tsx` (14 rows, run for the open company).
  - Changed: `pages/gcc/suppliers/Suppliers.tsx` and `suppliers.css` (master columns, double-click and Enter, Space, the sheet's button and rows); `App.tsx` (one lazy import, one `suppliers/:id` route); `pages/gcc/screens.ts` (one `screenHead` line, B3).
  - Not changed: `data/gcc/s2/index.ts`. Profiles are imported from `data/gcc/s2/profiles` directly, because an export line there would make an import cycle (`profiles/generate.ts` reads `data/gcc/s2`).
- Verification:
  - `npm run typecheck` and `npm run build` pass. The profile ships as its own lazy chunk. The build's chunk-size warning was already there.
  - `/dev/checks` in all five tenants: 31 of 31 cards pass, and the new card passes 14 of 14 in each. That includes 66 (no money in `supplierProfileFor`) and 99 (demo clock).
  - Scratch validation of every seed: 143 profiles, 0 rule failures. Health: Strong 54, Adequate 70, Watch 19.
  - Browser: my own headless Chrome with an isolated profile, driven over the DevTools protocol against the shared dev server. I reset the demo only there. Checked at 1280 and 1440, light and dark. No console errors (the React Router future-flag warnings were already there).
    - Najd as the Procurement Lead: the master's Health and Load/with-us cells; click and Space open the sheet, double-click and Enter open the profile; the sheet's button and three rows.
    - All six tabs of Rhein Aqua. The tiles equal the master's row: 2 awards, 93% on time, 0 NCRs, 92% replies in 5 days.
    - The document viewer: opens, arrows to the next file, Esc closes it.
    - Tarvessa leads with its hard block, and every package it fits reads Blocked.
    - An unknown id shows `EmptyState`.
    - The Head of Tendering and the CEO see awarded values.
    - The Tender Coordinator gets the guard message on `/suppliers/:id`.
    - Corniche Qarn Air and Batinah Alpen Bridge Bearings (profiles, tabs; after a DG1 Pursue they show "T-2026-061 P-02 Recommended" and "T-2026-042 P-04 Recommended").
    - On T-2026-118, with RFQs sent, I clicked "Demo: suppliers reply now (13)". The profiles of Rhein Aqua, Nordklar and Hanseong then read Replied on T-2026-118. Gulf Process P-02 and Weser P-06 stay RFQ sent, as in Sourcing's grid. The tile's next reply date moves.
    - Settings → Reset demo → Reset this company empties `doneBy` and returns the profile to the seed.
- Deviations from plan:
  - **B5, the master's width (user, 2026-09-29).** With us now is not its own column. It is the second line of the Load cell ("Medium / 2 with us"). NCRs are the second line of On time ("93% / 1 NCR"), like Replies. So the grid still fits at 1440 with Health added. The card's line now says the performance is the last 12 months'. Those two figures are no longer sortable on their own.
  - Tile label "Our awards (12 m)", not "Awards with us (12 m)", so it fits one line at 1440. The Working for us now tile's detail line is "Load Medium, all clients" (the §3 length); the full B1 sentence is its sub and ⓘ.
  - The replies tile's reference line reads "Oldest · overdue since 5 Mar" when a reply is late, and "Next · reply by …" otherwise.
  - Where it fits now has a **Blocked** standing, so a blocked supplier's packages don't read "Not shortlisted". The block shows once, above the tiles, not again in Compliance.
  - Jobs on a tender the viewer can't open show as a locked row ("not shared with you") rather than being skipped (step 2.3), so the counts still equal the master's.
  - Quarterly deliveries include call-offs on earlier orders, so a supplier with no award in 12 months can still have deliveries and an on-time % (the master gives every supplier one).
  - Featured suppliers that aren't blocked get their certificates rolled forward (`cleanCertificates`), so their register extract never reads Expired. The Corniche featured supplier is Qarn Air (P-02 on T-2026-061). T-2026-061 is at Stage 1 on demo day, so it appears in Where it fits now only after a DG1 Pursue.
  - Accounts are one column per year (latest first) with the measures as rows, so all seven fit half a row.
  - The Company card has no approved-vendor row (the header gives the count, Compliance the list). The Screening card head says "The last three cycles" rather than repeating the header's pill. The Projects section head doesn't repeat the load sentence.
  - The sheet's Working for us now row reads "2 jobs · plus 1 delivered in 12 months". Its existing Current load row adds "its whole order book, not only ours".
  - "Completed with us" is a plain table: no supplier has more than three rows, so the AG Grid case (> 5) never arises.
  - No `headerTooltip` on the grid: AG Grid's `TooltipModule` is not registered in `components/dashboard/grid/agGrid.ts`.
  - **B1, load (orchestrator, 2026-09-29).** Load means the supplier's whole order book, across all its clients. The supplier master is not edited. "Working for us now" jobs never go above the band's top (Low ≤ 1, Medium ≤ 3) or `awards12m`, and reach the band's floor whenever `awards12m` allows. Awards beyond that show as **Delivered for us**: finished within the last 12 months, on the same won tenders, in the Projects with us tab above "Completed with us". Working now + delivered in 12 months = `awards12m`, so the Awards tile matches the master. The Load pill in the header and on the Working for us now tile says it plainly ("Load · High: its whole order book; 1 job is for us"), and the ⓘ says so too. Step 5.1's load row is replaced by two rows: (a) jobs now ≤ band top and ≤ `awards12m`; (b) jobs now + delivered in 12 months = `awards12m`.
  - **B3, top bar (user, 2026-09-29).** One line in `screenHead` (`pages/gcc/screens.ts`) beside the `/tenders/:id` case, so `/suppliers/:id` reads "Supplier profile" in the top bar, not "Not found".
  - **B4, reply rate (user, 2026-09-29).** The Performance quarters table has no RFQs-received or declined column. It shows quotes returned, awards, deliveries, on-time % and NCRs. The reply rate and average days are the master's own `response.ratePct` and `avgDays`, on the RFQ replies tile and in "Quoted with us". They are labelled so they can't be read as a sum of the quarter rows ("Replies to 84% of RFQs, in 3 days"). `replyCounts()` and every back-solved RFQ or decline count are removed from `generate.ts`, and the master's `response` is untouched.
  - **B2, currency (orchestrator, 2026-09-29).** GCC suppliers show their own currency, and euro-area suppliers show EUR. Everyone else shows "Reported in USD". Every amount also shows the company-currency equivalent through `domain/money.ts`. `fx.ts` is unchanged.
- Blockers / questions:
  - **B1 (asked 2026-09-29): the load band can't hold for 37 of 143 suppliers.** "Working for us now" jobs sit only on won lifecycles of the last 12 months (Najd 9, Corniche 6, Dafna 5, Batinah 8, Qurain 8; there are no older won lifecycles), so each job is one of the supplier's `awards12m`. 37 suppliers have fewer awards than their band needs: High with fewer than 4 (e.g. Weser Transformer Works: High, 1 award; Asir Telemetry: High, 0), or Medium with fewer than 2. Proposed: `load` reads as the supplier's whole order book; jobs with us never exceed the band's top (Low ≤ 1, Medium ≤ 3) or `awards12m`, and reach the band's floor whenever the awards allow. **Answered (user, 2026-09-29): as proposed.**
  - **B2 (asked 2026-09-29): currencies.** `Ccy` (`data/gcc/fx.ts`) has SAR, AED, QAR, OMR, KWD, BHD, USD, EUR and INR. Suppliers in GB, KR, JP, CN, PL, SE, CH, TN, LB and TR have no currency there. Proposed: GCC suppliers in their own currency, euro-area suppliers in EUR, the rest "Reported in USD"; `fx.ts` unchanged. **Answered (user, 2026-09-29): as proposed.**
  - **B3 (asked 2026-09-29): the top bar would read "Not found" on `/suppliers/:id`.** The GCC top bar takes its title from `screenHead(pathname)` in `pages/gcc/screens.ts` (`Header.tsx`), which knows `/tenders/:id` but not `/suppliers/:id`, so it falls back to "Not found · This page does not exist in the workspace". `screens.ts` is out of this plan's scope. Proposed: one line in `screenHead` beside the tender one, `/suppliers/:id` → "Supplier profile", "Company facts, financial health, work with us, performance, compliance and contacts for one supplier." **Answered (user, 2026-09-29): add the one line.**
  - **B4 (asked 2026-09-29): the reply rate can't be rebuilt from counts for 59 of 143 suppliers.** Performance shows "RFQs received" and "quotes returned" per quarter, and the reply rate must equal `response.ratePct`. With the master's small counts no whole number of RFQs works. Sadeem Piling has 6 quotes at 84%: 7 RFQs reads 86%, and 84% needs 19 RFQs with 10 declines. Proposed: the quarters table drops the RFQs-received column (quotes, awards, deliveries, on time, NCRs), and the reply rate and average days show as the master's figures in "Quoted with us" and on the tile. Nothing on the page can then disagree. **Answered (user, 2026-09-29): as proposed.**
  - **B5 (asked 2026-09-29): the master no longer fits at 1440.** The 027c grid was sized to fit 1440 with about 20 px to spare ("At 1440 they fit; at 1280 the grid scrolls inside"). Health (98 px) and With us now (92 px) bring the minimum to 1,284 px against 1,114 px available, so at 1440 the last two columns scroll out of view. Options: (a) fold With us now under the Load pill ("Medium / 2 with us", the B1 sentence in short) and NCRs under On time ("93% / 0 NCRs"), like the Replies cell: fits at 1440, every figure stays, but those two can't be sorted on their own; (b) pin the Supplier column and let the grid scroll at 1440; (c) keep the new columns in the sheet only. **Answered (user, 2026-09-29): (a), two-line cells.**
- Follow-ups noticed (not done):
  - `components/dashboard/grid/agGrid.ts` doesn't register `TooltipModule`, so no grid can use `headerTooltip` (AG Grid error #200 in development).
  - Batinah's project register has "Wadi crossing bridges, Saham" (2021), and a won lifecycle is "Saham wadi crossing bridges" (T-2024-360). They read as the same project. I kept Alpen Bearings off T-2024-360, but anyone who shows both side by side meets it.
  - The React Router v7 future-flag warnings in the console (already there).
