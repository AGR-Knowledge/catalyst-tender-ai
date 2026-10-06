# 039 — Funnel, periods and the Najd numbers

Status: DONE — awaiting review (2026-10-06) · Depends on: none (orchestrator contract in place) · Can run in parallel with: 040, 041, 042, 043, 044

## Goal
The Head of Tendering's decision funnel tells one story a prospect follows at a glance: of 194 tenders that came in this month, 18 passed AI screening, 12 reached DG1, 8 went to DG2, 7 to DG3 and 3 were won. The period filter offers All · 30 days · 90 days · 12 months, and every number on every screen agrees with it.

## Context
- User's change list of 2026-10-06, items 6 (data), 7, 8, 10, 13 and 18. Decisions are in `app/plans/README.md` → "Wave 12". Read them first.
- Current behaviour:
  - The funnel is `PF-5` in `src/domain/gcc/flows/portfolio.flow.ts`, rendered by `src/components/dashboard/FlowCard.tsx`. Its columns are Captured (176 new · 18 linked) → DG1 → DG2 → DG3 → Submitted → Results, and each counts **decisions in the window**, so the columns needn't add up. The legend reads Went on / Stopped / Waiting (`FlowCard.tsx:20`).
  - The volumes are generated: `src/data/gcc/lifecycle/targets.ts` (`FLOW_TARGETS`, Najd per window, other tenants 12 months only) steers the history generator (`generate.ts`, `history.ts`, `pools.ts` …) and `intake.ts` (`INTAKE_DAILY`, 365 days). Dev check `pages/gcc/dev-checks/40-lifecycle.tsx` asserts the targets.
  - The periods are in `src/domain/gcc/period.ts` (`PERIODS`, `windowOf`, default `30d`) and `components/dashboard/PeriodFilter.tsx`. The generator keeps its own copy, `WINDOW_FROM` / `WINDOW_KEYS` in `targets.ts`.
  - Najd's win target is `TENANT_TARGETS.najd.hitRatePct = 25` in `src/data/gcc/portfolio.ts`.
- Contract already written by the orchestrator: `IntakeDay.passed?`, `IntakeDay.open?`, `Captures.passed`, `activeNotices()` (a stub summing `IntakeDay.open`), `queriesFor(...).activeNotices()`, and `FlowPartVM.outcome` `'previous'`. Plan 040 builds tiles on them: **keep the signatures**. You may change the bodies.

## Scope
- Files to change: `src/data/gcc/lifecycle/**`, `src/data/gcc/portfolio.ts`, `src/data/gcc/targets.ts` (only if needed), `src/domain/gcc/period.ts`, `src/domain/gcc/lifecycle.ts`, `src/domain/gcc/flows/**`, `src/components/dashboard/PeriodFilter.tsx`, `src/components/dashboard/FlowCard.tsx`, the `fc-*` rules in `src/components/dashboard/dashboard.css`, dev checks `40-lifecycle.tsx`, `50-portfolio.tsx` and `69-history.tsx`. In any other dev check, update only the pins your numbers move, and list each one in your report. Docs: `docs/07-product-design/agr-product-definition/dashboards.md` §2 (periods) and the funnel and §12 number tables.
- Out of scope (stop and ask): KPI tiles and their texts (plan 040 owns `domain/gcc/kpi/**` and `domain/gcc/dashboards/**`); the DG1 screen's words (Pursue / Discard / Hold stay); BOQ or suppliers at DG2 (parked); calendar; any new library.

## Steps
### Phase 1 — Periods
- [x] 1.1 `PeriodKey` gains `'all'`. The visible `PERIODS` become **All · 30 days · 90 days · 12 months**, in that order, default `30d`. Keep `'today'` and `'7d'` as keys that are no longer offered, so old code and old `?period=today` links still type-check. A stored or URL value of `today`/`7d` falls back to `30d`.
- [x] 1.2 `'all'` covers the whole history. Extend the generated history from 365 days to **730 days** (from 9 Mar 2024), so "All" differs from 12 months. `windowOf('all')` starts on the first history day; its `rangeText` and `startText` follow the existing style; `previousOf('all')` returns an empty window before the history (no comparison).
- [x] 1.3 Mirror `'all'` in `WINDOW_FROM` / `WINDOW_KEYS`, and in dev check 40's agreement check.
- [x] 1.4 Grep every `w.key === 'today'`, `'7d'` and `days: 365` use outside your files and make sure each still reads sensibly with `'all'`. Fix only your own files; list the others in the report for plan 040 or the orchestrator.

### Phase 2 — Najd's numbers (the user's table, plus the orchestrator's 90-day and All columns)
Each funnel column's **headline** is the bold number below. The split under it uses Approved / Rejected / Pending.

| Column | 30 days | 90 days | 12 months | All (730 days) |
| --- | --- | --- | --- | --- |
| Captured: total in = new + previous | **194** = 176 + 18 | **572** = 520 + 52 | **2,080** = 1,890 + 190 | **4,070** = 3,700 + 370 |
| AI screening: passed · screened out | **18** · 176 | **62** · 510 | **250** · 1,830 | **490** · 3,580 |
| DG1: decided = approved · rejected · pending | **12** = 8 · 3 · 1 | **44** = 30 · 12 · 2 | **185** = 104 · 72 · 9 | **366** = 206 · 146 · 14 |
| DG2: decided = approved (bid) · rejected (no-bid) | **8** = 7 · 1 | **30** = 28 · 2 | **104** = 96 · 8 | **206** = 190 · 16 |
| DG3: decided = approved · rejected | **7** = 7 · 0 | **28** = 27 · 1 | **96** = 94 · 2 | **190** = 186 · 4 |
| Won: results = won · lost · awaiting result | **3** won (3 · 3 · 1 of 7 submitted) | **14** won (14 · 11 · 2 of 27) | **42** won (42 · 44 · 8 of 94) | **82** won (82 · 88 · 16 of 186) |

- [x] 2.1 Set Najd's `FLOW_TARGETS` to the table: captured (new) and previous, DG1 pursue/discard/hold = approved/rejected/pending, DG2 bid/no-bid, DG3 approved/rejected, submitted = DG3 approved, results won/lost. Add `previous` and `passed` to `FlowTarget` (and `all` to the record). Keep `today` and `7d` targets as consistent subsets (≤ the 30-day numbers). Choose their values and say what they are in the report.
  - [x] 2.1.1 Gate decisions on time (PF-4 reads them): 30 days 25 of 27 on time; 90 days 95 of 102; 12 months ≈ 94%; All ≈ 94%. Every late one is a real gate record with an `openedAt`, an `at` and an SLA.
  - [x] 2.1.2 The average ticket (PF-2) still reads the submitted bids; keep the means in the same range as today (SAR 210–290 M).
- [x] 2.2 `intake.ts`: the per-day `linked` volumes become the **previous** (re-issued) notices and sum exactly to the "previous" column per window. Set `passed` per day so it sums to the AI screening column per window, and `open` so that the notices still open for bids now are **176** (the new notices of the last 30 days, today's intake events included; nothing older is still open). Make `activeNotices()` and `capturesIn().passed` return those; keep `captured` = new notices, so plan 040's Stage 1 tiles don't move.
- [x] 2.3 The lifecycle generator produces exactly the gate, submission and result events above. That means many more results over 12 months (86 instead of 33), so update `RESULT_SPLITS` (wins by sector, loss reasons, calibration bands, DG1 discard reasons) to the new totals, keeping their proportions. Company › Bid record, Debriefs and the Stage 9 dashboard derive from these; open each and check that it reads sensibly.
- [x] 2.4 Keep `LIVE_TARGETS` (live tenders by stage now) and `NAJD_PIPELINE` unchanged, unless the new history forces a change; if it does, report it.
- [x] 2.5 Najd's win target: `hitRatePct: 45`. The other tenants keep theirs.
- [x] 2.6 The other four tenants: the same structure (previous, passed, open, 730-day history), with their 12-month and All volumes scaled from Najd's by their current 12-month DG1 total ÷ 185. Round to whole numbers, keep every column ≤ the one before it, and put their tables in the report.

### Phase 3 — The funnel card
- [x] 3.1 `PF-5` columns, in order. Each column has the same five rows as today (label + sub, main row, bar, other parts, note):
  1. **Captured**, sub "Total in": main `194 in`; parts `176 new` (outcome `on`) · `18 previous` (outcome `previous`); note "18 re-issued of 194 in".
  2. **AI screening**, sub "Initial screening" (new column): main `18 passed`; part `176 screened out` (`stopped`); note "18 passed of 194 screened".
  3. **DG1**, sub "First-level screening": main `12 decided`; parts `8 approved` (`on`) · `3 rejected` (`stopped`) · `1 pending` (`held`); note "8 approved of 12 decided".
  4. **DG2**, sub "Bid or no-bid": `8 decided`; `7 approved` · `1 rejected`.
  5. **DG3**, sub "Final approval": `7 decided`; `7 approved` · `0 rejected`.
  6. **Won**, sub "Final shortlist": main `3 won`; parts `3 lost` (`stopped`) · `1 pending` (`held`, awaiting the result); note "3 won of 7 submitted".
  - The headlines across the card read 194 → 18 → 12 → 8 → 7 → 3. The Submitted and Results columns are gone (the Won column replaces them).
  - The Bid Manager's (assigned) funnel still starts at DG1.
- [x] 3.2 The legend: **Approved** (green), **Rejected** (grey), **Pending** (orange), and **Previous** in a calm colour that is neither the tenant accent nor a warning colour (e.g. a pale blue from `tokens.css`). Every colour's meaning is in the legend.
- [x] 3.3 Every non-zero number on a gate column still drills to exactly those tenders (`status: 'all'`). Captured and AI screening are volumes without tender rows: no drill for "previous" and "screened out"; "new" and "passed" keep the radar link where the viewer may open it.
- [x] 3.4 The funnel ⓘ in plain English, short: what the card shows, that it reads left to right as tenders narrowing step by step, and what each colour means.
- [x] 3.5 Six columns must fit at 1280 and 1440 with no sideways scroll. Use `dense` if needed.

### Phase 4 — Checks and docs
- [x] 4.1 Dev check 40: every number in the Phase 2 table, per window, plus the other tenants' scaled tables. Keep to about 15 new rows.
- [x] 4.2 `/dev/checks` has no failing row in any tenant (after the review follow-up below). Fix the pins in 50 and 69 yourself; for any other file, update only the numeric pin and list it.
- [x] 4.3 `dashboards.md`: §2 periods (All · 30 · 90 · 12 months), the funnel description and §12's number tables.

## Data and derivation
- Facts: `FLOW_TARGETS`, `INTAKE_DAILY` (`previous` via `linked`, `passed`, `open`) and `RESULT_SPLITS`, all in `src/data/gcc/lifecycle/`. Screens read the derived queries (`capturesIn`, `activeNotices`, `gateEventsIn`, `resultsIn`, `submissionsIn`); no page types a number.
- No new `done` keys.

## Demo-grade rules
- Build what the prospect sees; add no rules the screens don't need; dev checks stay short.
- Non-negotiables: the same tender never disagrees between screens; masking holds; Reset demo works.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] Najd, Head of Tendering (`najd.hot`), dashboard on port 5191, at 1440 and 1280:
  - 30 days: the funnel reads 194 → 18 → 12 → 8 → 7 → 3, with the splits above and the four-word legend;
  - 90 days: 572 → 62 → 44 → 30 → 28 → 14, and Won shows 14 won · 11 lost;
  - 12 months: 2,080 → 250 → 185 → 104 → 96 → 42;
  - All: 4,070 → 490 → 366 → 206 → 190 → 82.
- [x] The filter shows exactly All · 30 days · 90 days · 12 months; 30 days is selected on first load; every stage dashboard uses the same filter.
- [x] Bid Manager (`najd.bid`), CEO and one other tenant (Corniche HoT) render the funnel and dashboards without console errors.
- [x] Company › Bid record, the Debriefs archive and the Stage 9 dashboard open without errors and read sensibly with the larger history.
- [x] `/dev/checks`: no failing row in any tenant (after the review follow-up below).
- [x] Reset demo returns to the seed state.

## Execution report
- Changed files:
  - Periods: `src/domain/gcc/period.ts` (`'all'`, hidden `today`/`7d`, `periodLabel`, `HISTORY_DAYS`/`HISTORY_FROM`, All's empty previous window), `src/components/dashboard/PeriodFilter.tsx` (comment).
  - Data: `src/data/gcc/lifecycle/targets.ts` (730-day windows, `previous`/`passed` targets, Najd's table, B–E scaled by a function, `AVG_TICKET_RANGE_M`, rescaled `RESULT_SPLITS`), `intake.ts` (730 days; `linked` = previous, `passed`, `open`; `todayCounts`, `isPassed`), `generate.ts` (rebuilt planner: every band but today and 7 days is filled; backward scheduling newest band first; steering of win sectors, loss reasons and forecast bands; PF-2 mean steering; late marks per band; titles never equal a register project's), `fold.ts` (`MOVED_13_WEEKS`: 17 Najd DG1 discard records moved 13 weeks earlier, seven re-numbered into 2025), `live/najd.ts` (T-2025-447 moved 13 weeks earlier), `index.ts` (`splits`, no `submissionsFixed`), `src/data/gcc/portfolio.ts` (Najd `hitRatePct: 45`).
  - Domain: `src/domain/gcc/lifecycle.ts` (`activeNotices` body; today's passed events in `capturesIn`), `src/domain/gcc/flows/portfolio.flow.ts` (PF-5's six columns), `src/domain/gcc/flows/stages.flow.ts` (Stage 1 "linked" → "previous").
  - UI: `src/components/dashboard/FlowCard.tsx` (Approved / Rejected / Pending / Previous key for PF-5, stage strips keep theirs; funnel columns weighted by content; dense from 6 columns), `dashboard.css` (`o-previous` pale blue from `--blue`).
  - Dev checks: `40-lifecycle.tsx`, `50-portfolio.tsx` (funnel rows, tile pins, CAP-1 pin dropped, HoT PF-1 pin moved to the CEO), plus pins only in `30-seed.tsx` (hit rates, Najd DG1 on time 41 of 44), `45-demo-state.tsx` (closed 389 → 390), `60-stages.tsx` (`periodLabel` for hidden periods, crash fix; OUT-1 `50%`, RES-3 `67%`), `90-stage3.tsx` (097 calibration text), `66-company.tsx` (row 23 reads the new PF-5 columns).
  - Outside my list, a regression fix: `src/domain/gcc/company/record.ts` `funnelOf` read PF-5's removed Submitted/Results columns (Bid record funnel read 0 submitted, 0 won); it now counts `submissionsIn` and PF-5's Won column. Unowned in wave 12.
  - Docs: `dashboards.md` DB-2, §1 Z3 (sketch, key, PF-5 columns, links, ⓘ, Stage 1), §2, §10.4 flow card, §12.1, §12.3 (new table, anchors note, splits), §12.5 (B–E tables).
- Verification:
  - `npx tsc --noEmit -p .` and `npm run build` pass (the chunk-size warning predates this wave).
  - Najd HoT on 5191, no console errors: 30 days 194 → 18 → 12 → 8 → 7 → 3 (176 new · 18 previous; 176 screened out; 8 · 3 · 1; 7 · 1; 7 · 0; 3 lost · 1 pending); 90 days 572 → 62 → 44 → 30 → 28 → 14 (11 lost); 12 months 2,080 → 250 → 185 → 104 → 96 → 42; All 4,070 → 490 → 366 → 206 → 190 → 82. 30 days fits fully at 1280 and 1440; 90 days fits at 1440; at 1280 on 12 months and All a few rows (DG1/DG2 parts, notes) end in an ellipsis with the full text on hover; no sideways scroll.
  - Filter reads All · 30 days · 90 days · 12 months, 30 days on first load; `?period=today` falls back to 30 days; stage dashboards share the filter (Stage 1, Stage 9 checked).
  - Bid Manager, CEO and Corniche HoT dashboards, Stage 1, Stage 9 (12 months), Debriefs archive and Company profile render without console errors. Reset demo clicked without errors; no new `done` keys.
  - Domain read-back (SSR): every Najd window matches the table, including on-time 25/27, 95/102, 362/385, 716/762, PF-2 means SAR 285.0 / 283.6 / 260.8 / 263.3 M; active notices 176 (Etimad 132). Splits: wins water 33 · roads 9; losses 24 · 9 · 5 · 2 · 4; bands 13/16, 19/28, 10/22, 0/20; 90-day discards 5 · 2 · 2 · 2 · 1; overrides 3 (2); against majority 4; re-opened 2. B–E forecasts calibrate (every band within ±10).
  - `/dev/checks`: 40 and 50 pass in all five tenants. Still failing: 69 row 5 (all tenants) and 90 rows "097 · Base…" (Najd), see Blockers.
  - Today and 7 days targets kept as they were (captured 11 / 44, previous 1 / 4, passed 2 / 5; the decisions unchanged).
  - Other tenants (12 months · All), captured = new + previous; passed; DG1; DG2; DG3; won (won · lost · pending of submitted): Corniche 1,349 = 1,226 + 123 · 162 · 120 = 67 · 47 · 6 · 67 = 62 · 5 · 62 = 61 · 1 · 27 (27 · 29 · 5 of 61) | All 2,640 = 2,400 + 240 · 318 · 237 = 134 · 95 · 8 · 134 = 123 · 11 · 123 = 121 · 2 · 53 (53 · 57 · 11 of 121). Dafna 1,069 = 971 + 98 · 128 · 95 = 53 · 37 · 5 · 53 = 49 · 4 · 49 = 48 · 1 · 22 (22 · 23 · 3 of 48) | 2,090 = 1,900 + 190 · 252 · 188 = 106 · 75 · 7 · 106 = 98 · 8 · 98 = 96 · 2 · 42 (42 · 45 · 9 of 96). Batinah 1,462 = 1,328 + 134 · 176 · 130 = 73 · 51 · 6 · 73 = 67 · 6 · 67 = 66 · 1 · 30 (30 · 31 · 5 of 66) | 2,860 = 2,600 + 260 · 344 · 257 = 145 · 103 · 9 · 145 = 134 · 11 · 134 = 131 · 3 · 58 (58 · 62 · 11 of 131). Qurain 1,799 = 1,635 + 164 · 216 · 160 = 90 · 62 · 8 · 90 = 83 · 7 · 83 = 81 · 2 · 36 (36 · 38 · 7 of 81) | 3,520 = 3,200 + 320 · 424 · 317 = 178 · 126 · 13 · 178 = 164 · 14 · 164 = 161 · 3 · 71 (71 · 76 · 14 of 161).
- Deviations from plan:
  - The records could not meet the new 90 days: 17 Najd DG1 discard records and T-2025-447 moved 13 weeks earlier (the kept ones give the scaled discard reasons). Overrides over 90 days are therefore 3 (2 client relationship), not 4.
  - Generated tenders must close three days before today, so most generated events in the 30- and 90-day bands end closed: Pursues withdrawn in Stage 2, bids withdrawn in Stage 4, and bids cancelled by the employer after opening. Drilling DG1 "8 approved" at 30 days shows 4 live and 4 withdrawn tenders. LIVE_TARGETS and NAJD_PIPELINE are unchanged.
  - Won's "pending" is the bids submitted in the period less its results, with no drill (no tender list matches that count). Funnel notes are counts at every period.
  - PF-2 is steered into SAR 210–290 M for Najd's 30 days, 90 days, 12 months and All (generated bid values scaled), not fixed.
  - RESULT_SPLITS calibration could not keep both its bid shares and its win shares at a 49% win rate; it keeps Najd's one over-confident band (< 30%, 0 of 20).
  - Funnel columns share the width by their content (DG1 widest) instead of equal widths, so the 30-day funnel fits at 1280.
  - Load time of all lifecycles is about 90 ms warm (1,529 lifecycles; 772 before), over the 50 ms target the dev check prints.
- Blockers / questions:
  1. Value won no longer fits company size. With 42 wins in 12 months at SAR 210–290 M a bid, value won is 6.8× Najd's FY2025 turnover (SAR 11.31 bn vs 1.66 bn; OUT-3 565% of target); Corniche 4.5×, Dafna 4.7×, Batinah 11.0×, Qurain 5.5×. Dev check 69 row 5 fails in every tenant, and Company profile and Stage 9 show it. Options: raise the companies' turnover, order-intake targets and earlier bid-record years (tenants/*.ts, `data/gcc/company/bidRecord.ts`, `portfolio.ts`), or relax the rule. Needs a decision.
  2. Bid record's five years jump: the four seeded years read 30–36 bids and 6–8 wins a year, the derived last 12 months 94 and 42. Also the seeded 2024–25 year now differs from the lifecycle history the All window shows for the same dates. `data/gcc/company/bidRecord.ts` is not mine.
  3. T-2026-097's DG2 win model base is stored as "Water hit rate, trailing 12 months (7 of 21)", 33% (`data/gcc/s3/win.ts`); the history now says 59% (33 of 56). Check 90 fails on "097 · Base…". Updating it moves the hero's win probability and the DG2 story; the other packs' bases are stale too (unchecked). Needs a decision.
- Follow-ups noticed (not done):
  - KPI `sinceKey` texts (portfolio, stage1, stage9, debrief kpi files) drop the year, so on All they read "Since Sat 9 Mar" for 2024; the `today` branches in KPI files are now dead. Previous-period comparisons on All see an empty window (`days` 0, label "No earlier period").
  - At 1280 the 12-month and All funnels truncate a few rows; shorter notes (they repeat row 4's first part) would fit.
  - B–E 30- and 90-day funnels are not steered (only 12 months and All), so they don't narrow as cleanly as Najd's.

### Review follow-up (2026-10-06, user decisions relayed by the orchestrator)
1. **Najd bigger, and B–E sized the same way.**
   - Najd: turnover FY2022–25 SAR 8.75 / 9.20 / 10.05 / 11.0 bn (was 1.32 / 1.39 / 1.52 / 1.66); net worth SAR 4.03 bn; staff 18,500; `TENANT_TARGETS.najd.orderIntakeAnnual` SAR 11 bn (was 2 bn). Value won over 12 months SAR 11.31 bn = 1.03× FY2025, 103% of target.
   - Najd facility: limit SAR 4.0 bn, utilised SAR 3.24 bn, committed SAR 120.5 M → headroom SAR 640.0 M (16% of the limit, as SAR 96 M was of the old one). Bonds stay inside headroom; no tender's "facility tight" flag moved.
   - B–E (value won was 4.5–11× turnover): turnover ×4.1 (Corniche, AED 5.12 bn FY2025), ×4.3 (Dafna, QAR 3.85 bn), ×10 (Batinah, OMR 435 M), ×5 (Qurain, KWD 780 M; its KSA subsidiary SAR 7.35 bn), net worth and staff in proportion, order-intake targets about one year's turnover. Check 69 row 5: 1.03 / 1.10 / 1.10 / 1.09 / 1.11×. B–E facilities are unchanged (Qurain's hero story is a tight facility).
   - **PQ threshold:** with that, the hero's PQ-11 (SAR 1.2 bn) would have flipped Corniche, Dafna and Batinah from fail to pass. To keep every line's outcome, PQ-11 is now **SAR 5 bn** (`data/gcc/hero.ts`) and the JV partner Qunfudhah's turnover ×4.5 (SAR 4.95 bn average) so Dafna's JV still passes as lead. A before/after snapshot of every register tender in every tenant (alone and with each partner as lead or member): no line state, roll-up text, fit score, weighted fit, verdict or cap changed. Only the figures in the PQ-11 sentences changed (check 70 pins updated). Caveat: SAR 5 bn average turnover is about ten times the hero's SAR 480 M value, steep for a real booklet.
   - `data/gcc/company/bidRecord.ts`: every tenant's 2024–25 year now repeats what the lifecycles hold for 9 Mar 2024 – 8 Mar 2025 (Najd 92 bids, 40 won, 44 lost, 8 cancelled; SAR 24.46 bn bid, 11.19 bn won); the three years before rise gently (Najd 84/35, 87/37, 90/38). New check 66 row "039 Seed 2024–25 = the lifecycles…" asserts it in every tenant.
2. **More live tenders.** The generator (`liven` in `generate.ts`, its own random stream) keeps every generated chain whose last counted event falls in the last 30 days live instead of withdrawn or cancelled: a Pursue in Stage 2 (rfqs-out / quotes-in / levelling), a Bid in Stages 4–6, a submitted bid awaiting its result in Stage 8, each with on-track facts, deadlines before 30 Apr, and its bid bond on the facility (B11). T-2026-106 (hand-authored) is live in Stage 2 levelling rather than withdrawn on 1 Mar. Najd 30 days: DG1 8 approved → 8 live; DG2 7 → 7 live; DG3 7 → 7 live. 90 days: DG1 30 → 19 live, 2 no-bid, 9 withdrawn or cancelled; DG2 28 → 18 live; DG3 27 → 10 live, 4 won, 5 lost, 8 cancelled after opening. Najd live by stage 12 · 7 · 2 · 2 · 3 · 4 · 1 · 8 · 2; PF-1 27 tenders, SAR 6.83 bn (was 15, SAR 3.09 bn). Qurain gained 2 live (Stage 6 and 8). Flow counts are unchanged. CAP-1 is unchanged (team rosters list commitments only for hand-authored bids).
3. **DG2 win base.** `data/gcc/s3/win.ts` bases from the last 12 months: Najd water 59% (33 of 56), Corniche Buildings MEP 47% (15 of 32), Qurain water 43% (12 of 28), Batinah roads 39% (12 of 31). Win probabilities: T-2026-097 58 → **84 ± 8**, T-2026-101 47 → 73, T-2026-029 44 → 53, T-2026-049 52 → 64, T-2026-061 52 → 61, T-2026-042 61 → 78; the lifecycle facts and weighted values follow (DEC-4 SAR 298.2 M). Every recommendation keeps its wording (097 "Bid with conditions"; its rationale "well above the water hit rate" still holds). The DG2 script in `demo-runbook.md` quotes no figures, so it needs no change.
- Files changed: `src/data/gcc/tenants/{najd,corniche,dafna,batinah,qurain}.ts`, `src/data/gcc/partners.ts`, `src/data/gcc/hero.ts`, `src/data/gcc/portfolio.ts`, `src/data/gcc/company/bidRecord.ts`, `src/data/gcc/lifecycle/{generate,targets}.ts`, `src/data/gcc/lifecycle/live/{najd,corniche,qurain}.ts`, `src/data/gcc/s3/win.ts`; dev checks 30, 45, 50, 60, 66 (new row), 70, 71, 72, 90 (pins only); docs `gcc-demo-data.md`, `s1-s3-demo-spec.md`, `dashboards.md`.
- Verified: typecheck and build pass; `/dev/checks` has 0 failing rows in all five tenants; port 5191 (`vite --force`): Najd HoT dashboard at 30 and 90 days, the 30-day DG1 "8 approved" drill (8 live rows), Company › Bid record, Company › Financials, DG2 for T-2026-097, four generated live tenders' workspaces and Sourcing, no console errors; Reset demo returns to the seed.
- Follow-ups: generated issuers can mismatch their titles ("Hail odour control upgrade" for a roads office), now visible in the 30-day drill (`issuerFor` in `fold.ts`; changing it re-draws every generated tender); delivery load (DEC-5, `DELIVERY_LOAD`) and the hero's SAR 5 bn PQ-11 are not re-sized to the bigger companies; the old §5.1 history figures in `gcc-demo-data.md` are marked superseded rather than rewritten.

