# 027e — KPI tiles: a reference line on every tile

Status: TODO · Depends on: wave 9 (027a–028, committed) · Can run in parallel with: nothing else in wave 9b

## Goal
Every KPI tile, on every dashboard and screen strip, in every tenant and period, has **both** of its text rows filled:
1. one detail line (what the value is made of);
2. one reference line, "key · value", under the hairline.

After plan 027a, about 40 tiles still show an empty reference row. Stage 2 and Stage 7 are the worst, with five of six tiles empty, so a row of tiles still reads unevenly. That is exactly what the user objected to.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Presentation only.** No new KPIs, facts, rules, `done` keys, capabilities or libraries. A reference line states a fact the KPI already reads, its `sub` already says, or the KPI's own target or band (`data/gcc/targets.ts`, the ⓘ's "target" text). Never invent a number.
- **Keep readings still.** No value, tone, status word, `sub`, `detail` that is already filled, drill-down or count changes. Every `/dev/checks` row passes in the five tenants, and no counts drop (after wave 9: Najd 825, Corniche 416, Dafna 397, Batinah 405, Qurain 420). Your new check adds rows.
- **Status is never colour alone**, and a tile without a tone shows no pill (027a's rule; keep it).
- **Stay in your files** (Scope). If a change needs another file, stop and ask.

## Context
- **Why:** user feedback, 2026-09-28: "the descriptive or small text present in the bottom … too inconsistent". Plan 027a gave every tile the same four rows, but its step 1.1.5 let a tile "without a `ref` keep the reference row's space, empty". In review, that empty row is the inconsistency. **User decision, recorded by the orchestrator in the 2026-09-28 review: no tile has an empty reference row.**
- **The tile anatomy (027a, in the code):** `components/dashboard/KpiTile.tsx`, which renders `kt-detail` and then `kt-ref` (key, value, owner chip). A `KpiResult` or `TileVM` carries `detail?` and `ref?: { k, v }`. Tiles are built by `buildTile` (`domain/gcc/dashboards/build.ts`), `registryTile` and `valueTile` (`pages/gcc/s1/vm/tiles.ts`), `domain/gcc/admin/tiles.ts`, and the Platform Console (`domain/platform/console.ts`).
- **Text rules (027a Phase 2, unchanged):**
  - detail: about 24 characters at most;
  - reference: value at most 20 characters, and the key from this list: `Target`, `Cap`, `Since {date}`, `Largest`, `Oldest`, `Latest late`, `Next`, `First needed`, `Peak`, `Worst`, `Average`, `Renew by`, `Time left`, `With {tender}`. At most **three** new keys; list them under Deviations and in dashboards.md §3.
  - Measure in the page, not by counting characters: a tile has 150 px for text at 1440.
- **Where a natural reference exists, prefer it in this order:**
  1. the tile's `Target` or limit, from its target or band ("Target · 0", "Target · 100%", "Cap · 3 a person");
  2. the oldest, worst, latest or next item it counts (`Oldest · T-2026-118`, `Next · 12 Mar, 10:00`);
  3. its period anchor (`Since 7 Feb · 4 in`), for pure counts of events in the period.
  4. For an empty state ("No results in this period", "0"), keep the same key the tile uses when it has data, with a value such as "None" or the target, so the row doesn't jump between periods.
- **Tiles found empty in review** (Najd, Faisal Al-Harbi, 30 days, 1440; other tenants, periods and personas may add more):
  - Stage 1: Captured, Missed tenders
  - Stage 2: RFQ clock, Replies on time, Overdue RFQs, Open clarifications, To level
  - Stage 3: Stale packs, Weighted pipeline
  - Stage 4: Resource clashes, M2 on time
  - Stage 6: SME tasks overdue, Reviews held, Content reused
  - Stage 7: Mandatory gaps, Requirements evidenced, Redlines open, Risks without owner, DG3 on time
  - Stage 8: On-time submissions, Signatures pending, Bid bonds
  - Stage 9: Hit rate, Why we lose, Lessons captured
  - Radar strip: Captured today, Missed tenders, Restricted lane, Linked, not duplicated
  - DG1 decisions strip: On hold, Recorded today
  - Intake queue strip: Blocking DG1, Oldest item, Sent back to the agent
  - Administration › Users: Seats in use, Committee seats filled (no detail either)
  - Administration › Committees: Gates without owners, Committee seats filled (no detail either), DG2 quorum
  - My requests: Open requests, Due in 48 h, Late, Submitted
  - Inputs outstanding (Bid Manager home), late branch: the owner chip with no key
  - Platform Console: every tile (on 027a's fallback, full `sub` and an empty reference row)
- **Already fixed by the orchestrator in review** (don't redo them): Win / loss always shows "Target · 25%" ("25% from 5 results" under five results), and Decisions on time shows "Latest late · None" when nothing was late.

## Scope
- **Files to create or change:**
  - `domain/gcc/kpi/portfolio.kpi.ts`, `requests.kpi.ts`, `stage1.kpi.ts` to `stage9.kpi.ts`: add `ref`, and `detail` where missing, in **every** `compute` branch that returns a value;
  - the `valueTile` and `registryTile` calls in `pages/gcc/s1/Radar.tsx`, `Screening.tsx`, `Dg1.tsx`, `IntakeQueue.tsx`, `pages/gcc/admin/Users.tsx`, `Committees.tsx`, `Sources.tsx`;
  - `domain/platform/console.ts`: its `tiles()` gains `detail` and `ref` (the platform world; presentation only);
  - new `pages/gcc/dev-checks/51-tiles.tsx`: the guard in Phase 2;
  - `docs/07-product-design/agr-product-definition/dashboards.md` §3 only: replace "a tile without a reference keeps the row empty" (or the equivalent) with "every tile has a reference line (user decision, 2026-09-28)", and add any new keys.
- **Out of scope** (stop and ask before touching): `KpiTile.tsx` and `dashboard.css` (the layout is accepted); `viewmodels.ts`, `kpi/types.ts`, `build.ts`, `s1/vm/tiles.ts`, `admin/tiles.ts`; any value, tone, status word, `sub` or drill-down; `pages/gcc/company/**` and `pages/gcc/suppliers/**` (their tiles are all filled); the Indian (`gen-in`) screens.

## Steps
### Phase 1 — Fill every reference line
- [ ] 1.1 Convert in this order, checking each screen in the browser as you finish it:
  - [ ] 1.1.1 `stage2.kpi.ts` and `stage7.kpi.ts` (the worst rows);
  - [ ] 1.1.2 `stage1`, `stage3`, `stage4`, `stage6`, `stage8`, `stage9`, then `stage5` (already filled at seed, but check the other branches);
  - [ ] 1.1.3 `portfolio.kpi.ts` and `requests.kpi.ts`, every branch (Inputs outstanding when late, the empty states);
  - [ ] 1.1.4 the screen strips (Radar, Screening, DG1 decisions, Intake queue) and Administration (Users, Committees, Sources);
  - [ ] 1.1.5 the Platform Console.
- [ ] 1.2 For each tile you change, the reference states a fact the tile's `sub`, `info.target` or data already holds. Where two readings are possible, choose the one that tells a prospect whether the value is good ("Target · 0" beats "Since 7 Feb").
- [ ] 1.3 Empty and small-sample branches keep the same key as the data branch (Context, point 4). (acceptance: switch the period between Today and 12 months on Stage 7; no tile's reference row appears or disappears.)

### Phase 2 — A guard, so it stays filled
- [ ] 2.1 New dev check `51-tiles.tsx`, "Every tile has a detail and a reference line". For the active tenant, it builds every dashboard spec for every role that has one (as check 50 does with `dashboardSpec`, `buildDashboard` and `dashboardCtx`) at all five periods. It prints one row per dashboard and period: "all N tiles filled", or the labels of tiles with no `detail` or no `ref`. Masked and missing tiles (`masked`, or no value) are skipped and counted in the row's text.
- [ ] 2.2 One row per screen-strip builder the check can call without rendering a page (the Stage 1 strips' view-model functions and `domain/gcc/admin/tiles.ts` users, if they are pure functions). If a strip is only built inside a component, leave it out of the check, and verify it in the browser (Acceptance).
- [ ] 2.3 Expected value for every row: "all filled". Record the new row count per tenant under the Execution report.

### Phase 3 — The spec
- [ ] 3.1 `dashboards.md` §3: every tile has a detail line and a reference line; the key list with any new keys; the review decision of 2026-09-28.

## Data and derivation
- No new facts and no `done` keys. Each reference comes from the KPI's own inputs or its target in `data/gcc/targets.ts`.

## Acceptance checks
- [ ] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [ ] `/dev/checks` in all five tenants: no failing row; counts are wave 9's plus your new rows.
- [ ] In the browser, with no console errors, run a script that reads every `.kt` tile's `.kt-detail` and `.kt-ref`. No tile may have either one empty, and none may be cut (scrollWidth ≤ clientWidth). Run it across:
  - all five tenants, as the Head of Tendering, at 30 and 90 days: the home, `/stages/1` to `/stages/9`, `/radar`, `/screening`, `/dg1`, `/intake-queue`, `/requests`, `/admin/users`, `/admin/committees`, `/admin/sources`, `/company`, `/suppliers`;
  - Najd as the Bid Manager, the Tender Coordinator, the Procurement Lead and Finance, on their homes;
  - the Platform Console.
  Paste the script's summary into the Execution report.
- [ ] 1440 and 1280, light and dark: a row of tiles has its detail lines at one height and its reference lines at one height (screenshots of Stage 2 and Stage 7).
- [ ] Reset demo returns the seed readings.

## Execution report
- **What changed (files):**
- **How verified:**
- **Deviations from plan:**
- **Blockers / questions:**
- **Follow-ups noticed (not done):**
