# 027e — KPI tiles: a reference line on every tile

Status: DONE (2026-09-28, reviewed) · Depends on: wave 9 (027a–028, committed) · Can run in parallel with: nothing else in wave 9b

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
- [x] 1.1 Convert in this order, checking each screen in the browser as you finish it:
  - [x] 1.1.1 `stage2.kpi.ts` and `stage7.kpi.ts` (the worst rows);
  - [x] 1.1.2 `stage1`, `stage3`, `stage4`, `stage6`, `stage8`, `stage9`, then `stage5` (already filled at seed, but check the other branches);
  - [x] 1.1.3 `portfolio.kpi.ts` and `requests.kpi.ts`, every branch (Inputs outstanding when late, the empty states);
  - [x] 1.1.4 the screen strips (Radar, Screening, DG1 decisions, Intake queue) and Administration (Users, Committees, Sources);
  - [x] 1.1.5 the Platform Console.
- [x] 1.2 For each tile you change, the reference states a fact the tile's `sub`, `info.target` or data already holds. Where two readings are possible, choose the one that tells a prospect whether the value is good ("Target · 0" beats "Since 7 Feb").
- [x] 1.3 Empty and small-sample branches keep the same key as the data branch (Context, point 4). (acceptance: switch the period between Today and 12 months on Stage 7; no tile's reference row appears or disappears.)

### Phase 2 — A guard, so it stays filled
- [x] 2.1 New dev check `51-tiles.tsx`, "Every tile has a detail and a reference line". For the active tenant, it builds every dashboard spec for every role that has one (as check 50 does with `dashboardSpec`, `buildDashboard` and `dashboardCtx`) at all five periods. It prints one row per dashboard and period: "all N tiles filled", or the labels of tiles with no `detail` or no `ref`. Masked and missing tiles (`masked`, or no value) are skipped and counted in the row's text.
- [x] 2.2 One row per screen-strip builder the check can call without rendering a page (the Stage 1 strips' view-model functions and `domain/gcc/admin/tiles.ts` users, if they are pure functions). If a strip is only built inside a component, leave it out of the check, and verify it in the browser (Acceptance).
- [x] 2.3 Expected value for every row: "all filled". Record the new row count per tenant under the Execution report.

### Phase 3 — The spec
- [x] 3.1 `dashboards.md` §3: every tile has a detail line and a reference line; the key list with any new keys; the review decision of 2026-09-28.

## Data and derivation
- No new facts and no `done` keys. Each reference comes from the KPI's own inputs or its target in `data/gcc/targets.ts`.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] `/dev/checks` in all five tenants: no failing row; counts are wave 9's plus your new rows. (Plus 5 calendar rows from a parallel session; see the report.)
- [x] (After the three fixes in plan 027c's files the user approved, see Blockers.) In the browser, with no console errors, run a script that reads every `.kt` tile's `.kt-detail` and `.kt-ref`. No tile may have either one empty, and none may be cut (scrollWidth ≤ clientWidth). Run it across:
  - all five tenants, as the Head of Tendering, at 30 and 90 days: the home, `/stages/1` to `/stages/9`, `/radar`, `/screening`, `/dg1`, `/intake-queue`, `/requests`, `/admin/users`, `/admin/committees`, `/admin/sources`, `/company`, `/suppliers`;
  - Najd as the Bid Manager, the Tender Coordinator, the Procurement Lead and Finance, on their homes;
  - the Platform Console.
  Paste the script's summary into the Execution report.
- [x] 1440 and 1280, light and dark: a row of tiles has its detail lines at one height and its reference lines at one height (screenshots of Stage 2 and Stage 7).
- [x] Reset demo returns the seed readings.

## Execution report
(Filled in by the executor, 2026-09-28.)

- **What changed (files):**
  - `domain/gcc/kpi/portfolio.kpi.ts`, `requests.kpi.ts`, `stage1.kpi.ts` … `stage9.kpi.ts`: `ref` in every branch that returns a value, and `detail` in the empty branches that had none. No `display`, `sub`, `tone`, `status`, `n`, `ownerTag`, drill or filled `detail` changed. Small local helpers where needed: `sinceKey` (stage1, stage9, as portfolio's), `ZERO` and an `onSplit` parameter (stage7), an empty-period `none` detail for `turnSplit` (stage4, stage5).
  - `pages/gcc/s1/Radar.tsx`, `Screening.tsx`, `Dg1.tsx`, `IntakeQueue.tsx`, `pages/gcc/admin/Users.tsx`, `Committees.tsx`: `ref` (and `detail` on Committee seats filled) on the `valueTile` calls.
  - `domain/platform/console.ts`: PLT-1 … PLT-6 gain `detail` and `ref` (counts, tenant short names and shares only; dev check 65's leak scan still passes).
  - `pages/gcc/dev-checks/51-tiles.tsx` (new): "Every tile has a detail and a reference line", 76 rows per tenant.
  - `docs/07-product-design/agr-product-definition/dashboards.md` §3 only: every tile has a detail and a reference line (user decision, 2026-09-28), the preference order, empty states keep their key, the two new keys, dev check 51.
  - **Outside the list, approved by the user (2026-09-28):** `pages/gcc/suppliers/Suppliers.tsx` (every strip tile keeps its reference key with "None": Blocked "Latest None", and also Suppliers' "Largest", Screening due's "Oldest" and Held by screening's "Shortlists", which had the same conditional; "United Arab Emirates, 20" reads "UAE, 20" through a one-entry `SHORT_COUNTRY`), and `pages/gcc/company/Overview.tsx` (Bid-team load's detail takes the first wording of 24 characters or fewer, as CAP-1 does: "Buildings MEP team", "Utilities team, 4 weeks").
  - Not changed: `pages/gcc/admin/Sources.tsx` (its INT-4 tile comes from `stage1.kpi.ts`).
- **How verified** (headless Chrome against the shared dev server; a script reads every `.kt` tile's `.kt-detail` and `.kt-ref` key and value, their scrollWidth against clientWidth, and whether a row's detail lines and reference lines sit at one height):
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass (the chunk-size warning is as before).
  - Before the change, the same script over the five tenants × the 20 pages × Today, 30 days and 12 months: 765 of 1,428 tile readings had an empty row.
  - `/dev/checks`, all five tenants, on the seed: no failing row, no crashed panel. Najd 906, Corniche 497, Dafna 478, Batinah 486, Qurain 501 = wave 9's 825, 416, 397, 405, 420 + 76 new rows (check 51) + 5 rows in `78-calendar.tsx`, which a parallel session is changing in this checkout (not mine).
  - Check 51 rows per tenant: 14 readers (each role's home: Head of Tendering, CEO, Bid Manager, Tender Coordinator, Procurement Lead, the first committee member, Planning, Commercial, Proposal, Compliance, Project Director, Finance, HR; and Stage 8 for the Head of Tendering) × 5 periods, 4 Stage 1 strips' registry tiles, Administration › Sources' INT-4, and the Platform Console: 76, all "all N tiles filled".
  - The acceptance script's summary (1440, light unless stated):
    - A. All five tenants, Head of Tendering, 30 and 90 days, the 20 pages listed: `198 page readings, 949 tiles, 8 with an empty row, 4 cut, 0 misaligned rows`. All 12 are outside this plan's files (see Blockers): Suppliers › Blocked has no reference line at zero (Corniche, Dafna, Batinah, Qurain; 8), and Company › Bid-team load's detail is cut in Corniche (42 px) and Dafna (5 px; 4). Every tile in this plan's files is filled and uncut. The 2 console errors are the dev server's hot-reload WebSocket dropping during navigation, not app errors.
    - B. Najd as the Bid Manager, the Tender Coordinator, the Procurement Lead and Finance, their homes at 30 and 90 days: `8 page readings, 44 tiles, 0 with an empty row, 0 cut, 0 misaligned rows; console errors 0`.
    - C. The Platform Console, at 1440 light and 1280 dark: `6 tiles, 0 with an empty row, 0 cut, 0 misaligned rows; console errors 0` each.
    - D. All five tenants, Head of Tendering, 30 and 90 days, the 20 pages, 1280 dark: `198 page readings, 948 tiles, 8 with an empty row, 2 cut, 0 misaligned rows; console errors 2`. Again all outside this plan's files: the same 8 Suppliers › Blocked readings, and Suppliers › Suppliers' "Largest United Arab Emirates, 20" cut by 21 px in Corniche (2). Company › Bid-team load isn't cut at 1280 (three tiles a row). The 2 console errors are the hot-reload WebSocket again.
    - E. Stage 7 in all five tenants at Today, 7 days, 30 days, 90 days and 12 months (step 1.3): `25 page readings, 150 tiles, 0 with an empty row, 0 cut, 0 misaligned rows; console errors 0`. No tile's reference row appears or disappears between Today and 12 months; e.g. Najd's DG3 on time reads "No final approvals | Target 100%" at Today and "38 of 39 within 48 h | Target 100%" at 12 months.
    - After the user-approved fixes to Company and Suppliers: `/company` and `/suppliers` in all five tenants at 30 and 90 days, 1440 light and 1280 dark: `20 page readings, 110 tiles, 0 with an empty row, 0 cut, 0 misaligned rows; console errors 0` each. With A and D, every page on the list is now filled and uncut. `/dev/checks` re-run after them: the same counts, no failing row.
    - Najd, Head of Tendering, the 20 pages at Today and 12 months: `40 page readings, 192 tiles, 0 with an empty row, 0 cut; console errors 0`.
  - Screenshots of the Stage 2 and Stage 7 tile rows (Najd, Head of Tendering, 30 days) at 1440 and 1280, light and dark: the detail lines sit at one height and the reference lines at another in every row (the script's row check agrees).
  - Reset demo: Request renewal on the home's Renewal row turns Credentials at risk into "Zakat renewal requested | Renew by 10 May [Finance]"; it survives a reload; Settings › Reset demo › Reset this company brings back every seed line on the home, Stage 3 and My requests, with `doneBy` empty. No `done` keys were added.
- **Deviations from plan:**
  1. **New reference keys (two), listed in dashboards.md §3:** "Latest" (already used by plan 027c on Suppliers › Blocked but not in §3's list; now also DG1 decisions › Recorded today and My requests › Submitted), and "Waiting on" (To level: "Waiting on A buyer", from its ⓘ: the agent proposes each adjustment, a buyer confirms it; "Waiting on None" at zero). "First needed" stays unused.
  2. **Countdowns with nothing waiting say "Next None"**, not their data key "Time left": DG1 due, Awaiting DG2, Baselines due, Prices due, Submissions due, Next submission. "Time left None" reads as time run out. These are state tiles, so the row doesn't change between periods.
  3. **Keys that differ by branch** on state tiles (the branch changes with the tenant or a demo action, never with the period):
     - Mandatory gaps and Risks without owner: "Target 0" at zero and on one tender (the detail already names it); 027a's "Worst T-…, n" across several.
     - Redlines open (information): on one tender, "Time left N working days" to its submission, the fact behind its orange tone; "Worst" across several (027a's) and "Worst None" at zero.
     - Inputs outstanding: "Target None late" when any is late (it shares the line with the owner's chip, so no date); 027a's "Next 9 Mar, 17:00" otherwise; "Next None" when every input is in.
     - RFQ clock: 027a's "Next T-…" while a clock runs; "Target 100%" for the period's rate and when none went out.
     - Bid-team load: "Target 85% or less" when there is neither a peak over capacity nor the hero waiting for DG1 (after DG1 on T-2026-118).
  4. **Figures a reviewer should look at** (derived from what the tile reads, not new facts, but not on the tile before):
     - Weighted pipeline: "Average 58% to win" = the tile's weighted ÷ unweighted value (the packs' value-weighted win probability).
     - Facility headroom: "Cap SAR 602.3 M", the facility limit it reads (Company › Financials shows the same).
     - Content reused: "Worst T-2025-317, 35%", the proposal with the lowest reuse (as Cost lines sourced names its lowest).
     - On hold (DG1) and DG2 quorum: "Cap 24 h to decide", from `DG1_SLA_HOURS` and the DG2 gate's time limit on the Committees page.
     - Committee seats filled (Users and Committees): detail "Every voting seat named" (or "N voting seats empty") and "Target 3 for quorum" (the Users ⓘ's target, the tone's red threshold). The tiles have no `sub`; I didn't add one.
     - Seats in use: "Largest Contributors 7", the group the detail folds into "others".
     - Radar's Restricted lane and Linked: the period anchor "Since 00:00 1 routed" / "1 linked"; Captured and Why we lose: "Since 7 Feb 176 notices" / "2 losses".
     - Blocking DG1: "Target 0", from its tone (green only at none) and Fields to check's target; its ⓘ has no target line (Follow-ups).
     - Eval pass rate (Console): "Worst 92.9%"; the agent's name stays in the full sentence, as "Delivery Oversight, 92.9%" doesn't fit.
  5. **Step order:** I wrote the browser script before Phase 1 to find every empty row, and used it after each file; check 51 was written after Phase 1, as planned.
  6. The `Not available` guards for non-GCC tenants (Bid-team load, Capacity if won, Facility headroom, Value won) have no lines: unreachable in the GCC world.
  7. Check 51 repeats the four Stage 1 strips' registry ids (`STRIPS`); their value tiles are built inside the pages, so the browser script checks those (step 2.2).
- **Blockers / questions:** one, resolved. The acceptance script found three tiles in plan 027c's files, outside this plan's list; the user approved fixing all three (2026-09-28), done as listed under What changed:
  1. Suppliers › Blocked had no reference line when nothing is blocked (Corniche, Dafna, Batinah, Qurain). Now "Latest None". The strip's other conditional references (Largest, Oldest, Shortlists) got the same treatment, since they would empty in the same way.
  2. Company › Bid-team load's detail was cut at 1440 ("Buildings MEP team, next 4 weeks" by 42 px in Corniche, "Utilities team, next 4 weeks" by 5 px in Dafna).
  3. Suppliers › Suppliers' "Largest United Arab Emirates, 20" was cut by 21 px at 1280 (Corniche).
- **Follow-ups noticed (not done):**
  - `dashboard.css` about line 70 still says the reference row is "kept, empty, on a tile without one"; no tile has none now (the file is out of scope).
  - Seats in use reads "16 of 14" (Corniche), "16 of 12" (Dafna, Batinah) and "16 of 16" (Qurain): more seats used than licensed, with no tone. A seed or tone question, not a tile text one.
  - The ⓘ of Blocking DG1 and Sent back to the agent have no target line, though Blocking DG1's tone (and now its reference) treat 0 as the target.
  - `sinceKey`, `fit`, `dm` and `cap` are now repeated in several KPI files and `console.ts`; they could live once in `kpi/stages.ts`.
  - A parallel session is editing `pages/gcc/calendar/**`, `domain/gcc/calendar/events.ts`, `dev-checks/78-calendar.tsx` and `s1-s3-demo-spec.md` in this checkout; its typecheck errors came and went during my run. None of those files are mine.
