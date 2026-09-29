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
| **Performance** | The last four quarters (Q2 2025 to Q1 2026): RFQs received, quotes returned, awards, deliveries on time %, NCRs, as a small table and a `--blue` bar chart of on-time %. **Latest evaluation**: Quality, Schedule, HSE, Commercial and Communication scores (1–5) with the overall, the date and the evaluator's role |
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
- [ ] 1.1 `profiles/types.ts`: `SupplierProfileSeed` with `company` (legal name, registration no., established, HQ, staff, ownership and local share, classification, geographies), `capabilities` (per trade: largest order, lead time), `accounts` (3 FYs), `interim`, `rating`, `paymentTerms`, `insurance`, `quarters` (4), `evaluation`, `certificates`, `screeningHistory`, `contacts`, `documents`, `jobs` (references: won lifecycle id + package title, or project register id).
- [ ] 1.2 `generate.ts`: deterministic per supplier. It satisfies every rule in "Data rules" by construction: it picks the job counts first, then splits NCRs and quotes across the quarters, then solves on-time deliveries to hit `onTimePct`. Scale revenue plausibly by trade and country (a German process-equipment maker is larger than a local piling contractor).
- [ ] 1.3 `featured.ts`: the ~8 overrides; they must still meet the Data rules.
- [ ] 1.4 Acceptance: `supplierProfileSeed` returns a profile for every supplier in every GCC tenant, and the same values after a reload.

### Phase 2 — Derivations
- [ ] 2.1 `health.ts`: one rule, stated in its ⓘ: Strong when the current ratio ≥ 1.5 and the net margin ≥ 5%; Watch when the current ratio < 1.1 or the net margin < 0; Adequate otherwise.
- [ ] 2.2 `performance.ts`: the quarters, the weighted on-time %, the evaluation's overall score.
- [ ] 2.3 `detail.ts`: `supplierDetailFor(tenant, id, done, viewer)`. It composes `supplierProfileFor` (screening, held places, open RFQs), the seed, the health word, **Where it fits now** (open packages on `liveS2Tenders` whose trade the supplier covers, with the standing from the shortlist and RFQ state), the jobs resolved to lifecycle titles and project register titles (skipping any the viewer may not open), certificate states against `DEMO_TODAY`, and the masked flags.

### Phase 3 — The master and the sheet
- [ ] 3.1 Master: add **Health** (status word) and **With us now** (count) columns; Enter or double-click on a row opens the full profile; a single click still opens the sheet.
- [ ] 3.2 Sheet: an **Open full profile** button at the top; three new rows (Financial health, Working for us now, Last evaluation); its existing content unchanged.

### Phase 4 — The profile page
- [ ] 4.1 `SupplierProfile.tsx` at `/suppliers/:id`: header per the anatomy, six tiles (`valueTile` + `Strip`, as `Suppliers.tsx` builds its tiles: detail and reference line on each), tabs (`Tabs`, `?tab=`), Back returns to the master with its filters (history back, else `/suppliers`). An unknown id shows the kit's `EmptyState`.
- [ ] 4.2 Overview tab (Company │ Where it fits now as an `.eq-row`, then Capabilities).
- [ ] 4.3 Financials tab (Accounts │ Current position as an `.eq-row`; the health pill with its ⓘ).
- [ ] 4.4 Projects with us tab (jobs now as cards in an `.eq-row` of up to three; completed as AG Grid if more than five rows; quoted-with-us counts).
- [ ] 4.5 Performance and Compliance tabs.
- [ ] 4.6 Contacts & documents tab. **Documents open in plan 030's `FileViewer`** (`components/tender/FileViewer.tsx`) with facsimiles from `facsimileHtml` (`domain/gcc/library/facsimile.ts`). If 030's Phase 1 isn't ticked in `030-tender-library.md` yet, do this step last; if it still isn't there when everything else is done, list the documents without View and note it under Blockers.
- [ ] 4.7 Acceptance, as the Procurement Lead in Najd: open a supplier on the hero's shortlist; every tab reads well at 1280 and 1440; the tiles agree with the master's row (awards, on-time, NCRs, reply rate); a blocked supplier's profile leads with its block.

### Phase 5 — Checks
- [ ] 5.1 `dev-checks/68-suppliers.tsx`, about 12 rows per tenant: a profile for every supplier; awards in 12 months = `awards12m`; the quarters' NCRs = `ncrs12m`; the quarters' quotes = `quotes12m`; weighted on-time rounds to `onTimePct`; the reply rate and days equal `response`; job count within the `load` band; every job references a won lifecycle in the window or a register project; no job on a blocked supplier after its block; the health word matches the rule; certificate states against demo day.
- [ ] 5.2 typecheck and build pass; `/dev/checks` has no failing row in any tenant.
- [ ] 5.3 Browser (your own tab; reset the demo in that tab only), at 1280 and 1440, light and dark, no console errors:
  - [ ] 5.3.1 Najd as the Procurement Lead (values shown), the Head of Tendering, and the CEO (`see.quotes.summary`: values per the masking rule);
  - [ ] 5.3.2 a Tender Coordinator can't reach `/suppliers/:id` (the guard's message, not a blank page);
  - [ ] 5.3.3 Corniche and Batinah: the featured supplier on T-2026-061 and on T-2026-042;
  - [ ] 5.3.4 after "Simulate supplier replies" on the hero (Stage 2), the supplier's open RFQs and **Where it fits now** show the reply on the profile as on the Sourcing screen.
- [ ] 5.4 Reset demo returns everything to the seed (this plan adds no demo state).

## Data and derivation
- New facts: `data/gcc/s2/profiles/**` (generated deterministically, plus ~8 featured overrides).
- Derived: `domain/gcc/suppliers/{detail,health,performance}.ts`.
- No new `done` keys.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants
- [ ] Every supplier has a full profile page with the six tabs; the master and the sheet lead into it
- [ ] The profile's 12-month figures equal the master's, and the jobs reference only real (seeded) tenders and projects
- [ ] Masking of awarded values is correct for the Procurement Lead, the CEO and the Head of Tendering; the Tender Coordinator can't open the page
- [ ] Cards side by side are the same width and height, with the long one scrolling inside
- [ ] Reset demo returns to the seed state; no console errors
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
