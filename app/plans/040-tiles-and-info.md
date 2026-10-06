# 040 — Dashboard tiles and plain ⓘ texts

Status: DONE — awaiting review (2026-10-06) · Depends on: none (orchestrator contract in place; 039 fills the data in parallel) · Can run in parallel with: 039, 041, 042, 043, 044

## Goal
The Head of Tendering opens the dashboard and reads, left to right: how many tenders are live and from how many portals, how many we won and lost, our average ticket, how many tenders passed screening, how many gate decisions were late (and which), and which company documents have gaps. Every ⓘ explains its tile in two or three plain sentences.

## Context
- User's change list of 2026-10-06, items 2, 3, 4, 5, 11 and 12. Decisions are in `app/plans/README.md` → "Wave 12". Read them first.
- Current behaviour:
  - Tiles are `KpiDef`s in `src/domain/gcc/kpi/portfolio.kpi.ts`; the Head of Tendering's list is `portfolio.hot` in `src/domain/gcc/dashboards/portfolio.dash.ts:42`: `PF-1, PF-2, PF-3, PF-4, SCR-6, CAP-1`.
  - PF-1 "Live pipeline" is the pursued pipeline: Stages 2–8, 15 tenders, SAR 3.09 bn.
  - PF-3 "Win / loss": "1 won · 2 lost", target "25% from 5 results".
  - PF-4 "Decisions on time": "95%", "20 of 21 on time", ref "Latest late T-2026-107". Its drill is the table of all gate tenders, with late ones first.
  - SCR-6 "Credentials at risk": "2", "Zakat 30 Apr · GOSI 7 May"; the drill routes to Company › Credentials.
  - The ⓘ is `components/dashboard/InfoTip.tsx`, fed by each `KpiDef.info` (`means`, `counted`, `target`, `source`).
- Tile anatomy (user's standing rule, plan 027a/027e): every tile has the same rows. Label (+ ⓘ), optional status pill (a word, never a coloured stripe), the value, **one detail line**, and **one "key · value" reference line**, never empty. The detail fits about 24 characters at 1440 (`fit()` in `portfolio.kpi.ts`).
- Contract written by the orchestrator, filled by plan 039 in parallel (until 039 lands, the stubs return 0):
  - `queriesFor(ctx).activeNotices()` → `{ count, bySource }`: new notices still open for bids now (Najd will read 176);
  - `queriesFor(ctx).capturesIn(w).passed`: notices that passed the AI screening in the window (Najd 30 days: 18 of 194);
  - `capturesIn(w).captured` (new) and `.linked` (re-issued, "previous").
  - Plan 039 also sets Najd's win target to 45% and the results (90 days: 14 won · 11 lost), and changes the periods to All · 30 days · 90 days · 12 months (`'all'` is a new `PeriodKey`; `'today'` and `'7d'` are no longer offered).

## Scope
- Files to change: `src/domain/gcc/kpi/**`, `src/domain/gcc/dashboards/**`, `src/domain/gcc/actions/portfolio.actions.ts`, `src/domain/gcc/viewmodels.ts` (keep the orchestrator's contract lines), `src/components/dashboard/{KpiTile,InfoTip,DashboardPage}.tsx`, new `src/components/dashboard/ListPanel.tsx` and `list-panel.css`, dev check `51-tiles.tsx`.
- Out of scope (stop and ask): the funnel, periods and data (plan 039 owns `flows/**`, `period.ts`, `lifecycle.ts`, `data/gcc/lifecycle/**`, `data/gcc/portfolio.ts`); calendar; labels; any new library. If a tile needs a fact that doesn't exist, ask; don't add data.
- Docs: don't edit `dashboards.md` (039 owns it). Put the exact text for §10.1 (the tiles) in your report, and the orchestrator applies it.

## Steps
### Phase 1 — The Head of Tendering's tiles and their order
- [x] 1.1 New KPI **PF-0 "Live pipeline"** (state, not period-aware): value `176 active tenders` (from `activeNotices().count`); detail `from N portals`, where N = the distinct sources of kind portal or client portal among `activeNotices().bySource`, using the same source kinds as `stage1.kpi.ts`; ref `Largest · <portal> <n>`. Drill: the tender radar (`/radar`) when the viewer may open it, otherwise none. ⓘ: tenders open for bids now, captured from the portals and mailboxes.
- [x] 1.2 PF-1 (the pursued pipeline) is renamed **"Pursued pipeline"**, so two different numbers never share the label "Live pipeline". The Bid Manager keeps "My live bids". PF-1 leaves the Head of Tendering's tiles; the CEO keeps it.
- [x] 1.3 New KPI **PF-7 "Tenders accepted"** (flow): value = `capturesIn(w).passed` (`18`); detail `of 194 captured` (captured + linked); ref `Rate · 9%` (passed ÷ in, whole %). Drill: the radar, as PF-0. ⓘ: tenders that passed the AI / system first screening in the period.
- [x] 1.4 `portfolio.hot` tiles, in this order: **PF-0 Live pipeline · PF-3 Win & Loss · PF-2 Average ticket size · PF-7 Tenders accepted · PF-4 Decisions on time · SCR-6 Documentation gaps**. CAP-1 (Bid-team load) leaves this dashboard (it stays where else it is used). The CEO and Bid Manager lists are otherwise unchanged.
- [x] 1.5 Six tiles stay one row of equal width at 1440 and 1280 (`.eq-row`), every tile with the same rows.

### Phase 2 — Win & Loss (item 6)
- [x] 2.1 Rename PF-3 to **"Win & Loss"**. Value `14 won · 11 lost` (90 days, once 039 lands); detail `56% win rate`; ref `Target · 45%`. The target comes from `TENANT_TARGETS`, never typed. Keep the small-sample rule: under 5 results, ref reads `Target · 45% from 5 results`. Status pill "Below target" only when under target.

### Phase 3 — Decisions on time as counts, and where it was missed (item 2)
- [x] 3.1 PF-4's value becomes counts, not a percentage: `25 of 27 on time`; detail `2 late`; ref `Latest late · T-…`. With none late: detail `None late`, ref `Latest late · None`. Keep the tone bands (computed from the same counts).
- [x] 3.2 Clicking the tile opens a **list panel** (Phase 5) titled "Late gate decisions · <period>". One row per late decision: gate (DG1/DG2/DG3), tender ID and title, who decided (person and role), when the gate opened, when it was decided, the limit (24 h / 48 h), and how late ("3 h 20 m late"). Newest first. Each row opens the tender. Under it, a link "Show all 27 decisions in the table" keeps today's table drill.

### Phase 4 — Documentation gaps (items 1 and 5)
- [x] 4.1 Rename SCR-6 to **"Documentation gaps"**. Value = the number of documents with a gap: expired, or expiring before a live bid needs it. Detail = the first two (`Zakat 30 Apr · GOSI 7 May`), ref `Renew by · <date>`, status pill `Expired` / `Renew soon` as today.
- [x] 4.2 Clicking it opens the list panel "Company documents". It lists **every** document in the credentials vault, gaps first: document name, issuer, number (masked as the vault masks it), expiry date, status (**Valid** · **Expiring before a bid** · **Expired**, as words in pills), the live bids it affects ("T-2026-118, opens 10 May"), owner, and whether a renewal was requested. Footer link: "Open Company › Credentials" (today's route).
- [x] 4.3 Statuses come from the same rule as today (`credentialsAtRisk` in `actions/portfolio.actions.ts`); the panel and the tile never disagree.

### Phase 5 — The list panel
- [x] 5.1 Add a drill kind `{ kind: 'list'; title: string; panel: 'late-decisions' | 'documents' }` (or similar) to `DrillVM`. `DashboardPage` opens `ListPanel` for it. Reuse the existing drawer or `Sheet` primitives and their motion; no new library. The panel closes with Esc and the close button, and focus returns to the tile.
- [x] 5.2 Rows use the shared text styles; status is a word in a pill; no coloured stripes. It fits 1280.

### Phase 6 — Every ⓘ in plain English (item 4)
- [x] 6.1 Rewrite `info` for **every** KPI in `src/domain/gcc/kpi/**` (portfolio, requests, stage 1–9, debrief):
  - `means`: one or two short sentences: what the number tells you and why it matters;
  - `counted`: one sentence: what is counted, in everyday words;
  - `target`: a few words ("45% or more", "None late", "No target");
  - `source`: a few words.
  - No formulas or symbols (Σ, ÷, ×), no plan or section numbers, no internal ids, no jargon a tendering head wouldn't use. UK English. Keep any fact the old text carried that a user needs (e.g. "Saudi tenders need certificates valid on the opening date").
- [x] 6.2 `InfoTip` shows the four parts with plain labels ("What it shows", "How we count it", "Target", "Source"), plus the period line it shows today. Keep it compact.
- [x] 6.3 Put a before/after sample of five rewritten ⓘ in the report.

### Phase 7 — Checks
- [x] 7.1 Dev check 51: the six Head of Tendering tiles in order; PF-0 = `activeNotices().count`; PF-7 = `capturesIn().passed`; PF-4's on-time + late = its decisions; the documents panel rows = the vault; the late-decisions panel rows = PF-4's late count. About 10 rows.
- [x] 7.2 Any other dev-check pin your renames move: update it and list it.

## Data and derivation
- No new facts. Every value is derived from `queriesFor`, the tenant seed's credentials vault and `TENANT_TARGETS`.
- No new `done` keys. "Renewal requested" reads the existing `renewal` keys.

## Demo-grade rules
- Build what the prospect sees; no new rules beyond what a tile needs; dev checks stay short.
- Non-negotiables: the same tender never disagrees between screens; masking holds; Reset demo works.

## Acceptance checks
- [x] typecheck and build pass.
- [x] Najd Head of Tendering (`najd.hot`), port 5192, 1440 and 1280, 30 days. Before 039 lands, numbers may read 0; check the shape. After it lands, check the numbers:
  - tiles in order: Live pipeline (176 active tenders · from N portals) · Win & Loss · Average ticket size · Tenders accepted (18 · of 194 captured) · Decisions on time (counts) · Documentation gaps;
  - 90 days: Win & Loss reads 14 won · 11 lost, ref Target 45%;
  - clicking Decisions on time lists the late decisions with how late each was; clicking Documentation gaps lists every vault document with expiry and status;
  - every ⓘ (open at least 10, across the portfolio and three stage dashboards) reads in plain English.
- [x] CEO and Bid Manager dashboards: no tile reads "Live pipeline" with the pursued number; no console errors.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.
- [x] Reset demo returns to the seed state.

## Execution report
(Filled in by the executor, 2026-10-06.)

- **Changed files:**
  - `src/domain/gcc/kpi/portfolio.kpi.ts`: new PF-0 "Live pipeline" (active notices, portals, largest portal; drill to `/radar` when the viewer has `radar.view`) and PF-7 "Tenders accepted" (`capturesIn().passed` of captured + linked, rate); PF-1 renamed "Pursued pipeline"; PF-3 "Win & Loss" (detail "56% win rate", "Below target" under target); PF-4 shows counts ("25 of 27 on time", "2 late") and drills to the late-decisions list panel; SCR-6 "Documentation gaps" counts `documentGaps` and drills to the documents panel; every ⓘ rewritten.
  - new `src/domain/gcc/kpi/panels.ts`: builds the two list panels (late gate decisions; company documents) as view models.
  - `src/domain/gcc/kpi/{stage1…stage9,requests,debrief}.kpi.ts`: every ⓘ rewritten in plain English (targets from the existing constants: `GATE_SLA_HOURS`, `NEAR_WD`, `BOND_VALIDITY_DAYS_KSA`, `DEBRIEF_DUE_DAYS` and so on; imports added where needed). Header comments that said "dashboards.md §11.x, verbatim" now say the texts were rewritten in plan 040.
  - `src/domain/gcc/kpi/types.ts`: `KpiResult.infoTarget?` (the ⓘ target for one reading, e.g. "45% or more, judged from 5 results").
  - `src/domain/gcc/dashboards/build.ts`: passes `infoTarget` into the ⓘ.
  - `src/domain/gcc/dashboards/portfolio.dash.ts`: `portfolio.hot` tiles `PF-0, PF-3, PF-2, PF-7, PF-4, SCR-6`.
  - `src/domain/gcc/actions/portfolio.actions.ts`: `companyDocuments()` and `documentGaps()` (the whole vault with Expired / Expiring before a bid / Valid, built on `credentialsAtRisk`); `renewedTo` and `renewalRequested` lifted to module helpers (same logic).
  - `src/domain/gcc/viewmodels.ts`: `DrillVM` gains `{ kind: 'list'; label; panel: ListPanelVM }`, plus `ListPanelVM`, `ListColumnVM`, `ListRowVM`, `ListCellVM`. The orchestrator's contract lines are untouched.
  - `src/components/dashboard/DashboardPage.tsx`: opens `ListPanel` for a list drill; the panel's link hands its table or route drill back to the page; closes on period or dashboard change.
  - `src/components/dashboard/KpiTile.tsx`: aria text for list drills; a "figure noun" value ("176 active tenders") shows the figure at full size and the noun beside it.
  - `src/components/dashboard/InfoTip.tsx`: labels "What it shows", "How we count it", "Period", "Target", "Source"; default target "No target"; plainer small-sample note.
  - new `src/components/dashboard/ListPanel.tsx` and `list-panel.css`: `DrawerFrame` + `usePresence` (drawer motion), portalled; Esc and Close shut it and focus returns to the tile; rows are buttons when they have a destination; status is a word in a pill; no stripes.
  - `src/pages/gcc/dev-checks/51-tiles.tsx`: 10 plan-040 rows.
  - `src/pages/gcc/debriefs/Debriefs.tsx` (outside my list, see Deviations): one guard, `else if (d.kind === 'route') navigate(d.to);`.
- **Verification:**
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass (whole checkout, after lane 043 fixed `wadi-zarqa.ts`).
  - Browser, port 5192, Najd Head of Tendering, 039's data landed. At 30 days, 1440: Live pipeline "176 active tenders · from 4 portals · Largest Etimad 132"; Win & Loss "3 won · 3 lost · 50% win rate · Target 45%"; Average ticket size; Tenders accepted "18 · of 194 captured · Rate 9%"; Decisions on time "25 of 27 on time · 2 late · Latest late T-2026-107"; Documentation gaps "2 · Zakat 30 Apr · GOSI 7 May · Renew by 10 May". At 90 days, Win & Loss reads "14 won · 11 lost · 56% win rate · Target 45%". No console errors.
  - Late decisions panel (30 days): 2 rows, DG1 T-2026-107 "3 h late" and DG2 T-2026-050 "67 h 55 m late", each with decider, role, opened and decided times and the 24 h limit. A row opens `/tenders/T-2026-107`. "Show all 27 decisions in the table" sets the table chip. Esc and Close shut it and focus returns to the tile.
  - Documents panel: all 14 vault documents, the 2 gaps first ("Expiring before a bid"), the rest "Valid". It fits 1280 with names wrapping to two lines. A row opens the credential in Company › Credentials; the link opens `/company?tab=credentials&bids=affects`.
  - Request renewal from Needs your action: the panel reads "Requested" and the tile "Zakat renewal requested". This survives a reload, and Settings › Reset demo returns both to "Not requested" and "Zakat 30 Apr · GOSI 7 May".
  - ⓘ: opened all 24 tiles on the portfolio and on the Stage 1, 3 and 8 dashboards. All read in plain English, with no symbols and no ids.
  - CEO: "Pursued pipeline", no "Live pipeline". Bid Manager: "My live bids", with Decisions on time as counts. No console errors.
  - Batinah, Corniche, Dafna and Qurain dashboards: the same six tiles with their own numbers, and the portal names shortened so the reference line fits ("Tender Board 92", "Dubai 44").
  - Dev check 51 on Najd: "All 72 targets met", including all 10 plan-040 rows.
- **Deviations from plan:**
  - 1.5: at 1440 the six tiles are one equal-width row. At 1280 they sit as two equal rows of three, which is the kit's existing breakpoint (`.kt-grid` at 1439 px in `dashboard.css`, not in my files). One row at 1280 would mean tiles about 150 px wide.
  - `Debriefs.tsx` got a one-line guard so the new drill kind typechecks. Behaviour is unchanged; that page never receives a list drill.
  - Added `KpiResult.infoTarget` so the ⓘ target can name the tenant's own figure (PF-3, OUT-1: "45% or more, judged from 5 results"; OUT-3: the period's amount). Static ⓘ texts can't hold a per-tenant number.
  - PF-3: "Below target" shows for both orange and red tones; before, red read "Off track".
  - The documents panel's rows open the credential in Company › Credentials (with `company.view`); the plan named only the footer link.
  - PF-4 has no drill when the period has no decisions.
  - Documentation gaps counts `documentGaps` (expired, or expiring before a live bid). In the seed nothing has expired, so it equals `credentialsAtRisk` and check 66's "vault at-risk = SCR-6" still holds.
- **Blockers / questions:**
  - Item for lane 039: dev check 50's pin "HoT · CAP-1" (`50-portfolio.tsx` line 47, 039's file) now reads "missing", because Bid-team load left the Head of Tendering's tiles (1.4). It should be dropped or moved to a dashboard that keeps CAP-1. 039 has already updated the PF-1 and PF-4 pins.
  - Question for the orchestrator: should the six tiles be one row at 1280 too (see 1.5)?
- **Follow-ups noticed (not done):**
  - `pages/gcc/dev/fixtures.ts` still has "Win / loss" and "Credentials at risk" fixtures (dev kit page only).
  - Comments in `pages/gcc/company/Record.tsx`, `domain/gcc/company/record.ts` and `domain/gcc/company/vault.ts` still say "Win / loss" and "Credentials at risk".
  - dashboards.md §10.1–10.3, §11.1 and §11.9 need the new tiles, labels and ⓘ texts; the §10.1 text is in the final report for the orchestrator.
  - Ticket-size and other money tiles still use the mono value; the figure-noun split could apply to other "N things" values later.
