# 034 — A bid history that reads true

Status: READY · Depends on: wave 10 (committed `4d3f6ee`) · Can run in parallel with: 033 (no shared file)

## Goal
The last 12 months of results read like a real contractor's. On most losses the employer published our place and the gap to the winner. Each company wins roughly what its size allows. The win forecasts of Corniche, Batinah and Qurain calibrate, while Najd keeps the one honest over-confident band the spec asks for. Two seed slips a prospect could spot are fixed: a project that looks listed twice, and more seats in use than licensed.

## Context
- **Why:** from the wave 10 review (orchestrator, 2026-09-29), on the new Company › Bid record (plan 032):
  - **Why we lost reads "not published" almost everywhere.** Our place is recorded on 2 of Najd's 24 losses and the gap on 1; no other company records either.
  - **Value won is far above company size.** The 12-month value won is OMR 177.5 M in Batinah against FY2025 turnover of OMR 43.5 M (4.1×), and AED 2.46 bn in Corniche against AED 1.24 bn (2.0×). Najd (1.04×), Dafna (1.05×) and Qurain (1.00×) are in line. The seeded earlier years keep 40–160% of turnover, so the five-year chart jumps in its last year.
  - **Forecast accuracy reads off target** in Corniche (0 of 2 bands within ±10 points), Batinah (0 of 3) and Qurain (0 of 2). That tells a prospect the Win-Probability agent is wrong, which is not the demo's story. Najd's single over-confident band (< 30%: 0 of 13) is intended: gcc-demo-data §5.1 calls it "an honest 'the model is not perfect' line".
  - **Two slips:**
    - Batinah's completed project "Wadi crossing bridges, Saham" (register `batinah-p3`) and its 12-month win "Saham wadi crossing bridges" (outcome `BA-O03`) read as one project;
    - Seats in use exceeds the licence in Corniche, Dafna and Batinah (wave 9b review, open since).
- **Where the results come from:**
  - **Authored outcomes.** Each company's 12-month bids are first its authored outcome tuples, `OUTCOMES: OutcomeTuple[]` in `data/gcc/tenants/{najd,corniche,dafna,batinah,qurain}.ts`. The tuple is `[id, title, sector, clientType, value, submitted, decided, result, lossReason | null, predictedWin]` (`data/gcc/build.ts:33`). `fold.ts` folds them into lifecycles (`base(...)`, `result: { at, result, lossReason, predictedWin, value (wins) }`, no rank or gap).
  - **Generated history.** `data/gcc/lifecycle/generate.ts` adds chains until every flow target of `data/gcc/lifecycle/targets.ts` lands exactly. A generated result (`layout`, around line 294) is `predictedWin: won ? r.int(38, 76) : r.int(10, 62)`. A win's value is the tender's amount; a loss gets `lossReason` from a weighted pick, with no rank or gap. Amounts come from `workFor` via the company's sector ranges, `POOLS[tenant].sectors[s].value` in `data/gcc/lifecycle/pools.ts` (Batinah OMR 3–36 M, Corniche AED 50–520 M). **All generation draws from one seeded stream per company.** Adding, removing or reordering a draw shifts every later generated tender (titles, dates, ids), which would break pinned dev checks.
  - **Authored live lifecycles.** `data/gcc/lifecycle/live/*.ts` holds hand-authored tenders, such as T-2025-270: `rank: [2, 6], gapToWinnerPct: 6.8, lossReason: 'price', predictedWin: 40`. Their stated values stay.
  - **Derived history.** `data/gcc/lifecycle/history.ts` derives `history.outcomes` from the lifecycles: won or lost in the last 12 months. That one list feeds OUT-4 (`calibrationFor` in `domain/gcc/s3/win.ts`: bands > 70, 50–70, 30–50, < 30; a band with fewer than `MIN_N` = 5 bids isn't judged; tolerance ±10 points; at least 20 decided bids overall), the DG2 pack's calibration note, and the bid record.
- **Who reads rank and gap:**
  - `domain/gcc/lifecycle.port.ts` (the tracker's outcome line "Lost · price · ranked 2 of 6");
  - `domain/gcc/actions/stages.actions.ts` ("… % above the winner");
  - the Stage 9 table (`components/dashboard/columns/stages.cols.tsx`: `s9.rank`, `s9.gap`, "Not published");
  - `domain/gcc/library/proposal.ts` (the regret letter);
  - `domain/gcc/company/record.ts` (Why we lost: median place and gap).

  No KPI has a target on them.
- **Value and targets:**
  - `data/gcc/portfolio.ts` `TENANT_TARGETS[t].orderIntakeAnnual` is OUT-3's annual target. Batinah OMR 80 M is 1.84× its turnover; the others are 0.7–1.2×. The OUT-3 bands are green ≥ 100% and orange ≥ 70% of the pro-rated target.
  - Turnover is in each tenant file's accounts (e.g. `batinah.ts:190–193`: FY2022–FY2025 OMR 35.0, 38.0, 41.0, 43.5 M).
  - The seeded earlier years are in `data/gcc/company/bidRecord.ts` (not to be changed).
- **Seats:**
  - licensed seats are `seats` in `data/tenants.ts` (GCC tenants: Najd 20, Corniche 14, Dafna 12, Batinah 12, Qurain 16);
  - seats in use is `domain/gcc/admin/users.ts:141` (people with `usesSeat`);
  - the Platform Console's tenant panel (`pages/platform/TenantPanel.tsx`) also reads `seats`.
- Read first:
  - `/CLAUDE.md`;
  - `app/plans/README.md` (architecture decisions; the wave 10 and 10b sections; plan 017's generator notes);
  - `docs/07-product-design/agr-product-definition/gcc-demo-data.md` §5 (history, Najd splits, the calibration story, B–E registers);
  - `dashboards.md` §12.3 and §12.5 (flow targets);
  - `kpi-and-screen-catalogue.md` OUT-3 and OUT-4.

## Design

### 1. Our place and the gap to the winner
- **One helper**, `data/gcc/lifecycle/placing.ts`, exports `placingFor(tenderId, lossReason, clientType, sector)`. It returns `{ rank?: [number, number]; gapToWinnerPct?: number }` from **its own** RNG, seeded by `rngOf('place:' + tenderId)` (`data/gcc/lifecycle/rng.ts`). It never draws from the generator's stream.
- **Applied to** every lost result that doesn't state a rank or gap: folded outcomes (in `fold.ts`) and generated results (in `generate.ts`, after the result is built). An authored rank or gap, such as T-2025-270's, is kept as written.
- **Rules**, so every published figure makes sense:
  - **Bidders:** 3–9, more on larger tenders (the tender's value against its sector range in `POOLS`).
  - **Published or not:** government and semi-government clients publish the opening results on about 80% of losses, private clients on about 30%.
  - **By reason:**

    | Loss reason | Our place | Gap to the winner |
    | --- | --- | --- |
    | price | 2nd to 4th, never beyond the bidders | 0.8–12%, most under 7% |
    | local content | 2nd | 0.5–3% (we lost on the local-content weighting, not by much on price) |
    | technical | the technical ranking, 2nd to last, published on about half | not published (a gap on price means little after a technical loss) |
    | pq | not opened: none | none |
    | other | published on about half | published on about a third, 1–10% |
  - A gap is always positive, with one decimal. Place ≤ bidders.
- **Target shape**, checked by a new dev row:
  - in every company, our place is published on at least half the losses;
  - at least half the price losses show a gap;
  - Najd's Why we lost card shows places and gaps on most rows rather than "not published".

### 2. Value won in proportion to size
- **Rule:** in every company, the 12-month value won is between 0.9× and 1.3× the FY2025 turnover. This is roughly one year of work won for one year of work done, a typical book-to-bill for a contractor.
  - Najd, Dafna and Qurain already pass; don't change them.
  - **Batinah and Corniche:**
    - lower the value of their **won** bids in the 12 months until the rule holds: the authored tuples' 5th element, and the generated wins' amounts;
    - keep every won value inside the company's value band (Batinah OMR 3–40 M, Corniche AED 50–600 M, the tenant files' `band`);
    - leave **lost** bids at their values, so the story becomes "we win the mid-size jobs and lose the largest on price";
    - change as few authored rows as needed.
  - For generated wins, a win may take its amount from the lower part of its sector range: scale the amount that is already drawn, without an extra draw. Losses and discards keep today's amounts.
  - Say in the report which rows changed and the resulting multiple.
- **Batinah's order-intake target:** OMR 80 M → **OMR 50 M** (1.15× FY2025 turnover), so Value won reads against a target its size can meet. No other target changes.
- The seeded earlier years (`bidRecord.ts`) are not changed. The five-year chart's last bar now continues their trend.
- Everything that reads a won value moves with it by derivation: dashboards (PF-3's value line, OUT-3), Stage 9, the bid record, the supplier profiles' awarded values, and the library's award letters. Check that 031's supplier profile rules still hold (dev check 68), and that no awarded package value now exceeds its tender's value.

### 3. Forecasts that calibrate (Corniche, Batinah, Qurain; Dafna when it has enough bids)
- **Rule:** in Corniche, Batinah and Qurain, every judged band of `calibrationFor(history.outcomes)` is within ±10 points. Dafna (18 decided bids today, below the 20 needed) stays "not enough outcomes". If this plan's changes lift it to 20 or more, the same rule applies.
- **Najd is unchanged.** Its bands stay exactly as gcc-demo-data §5.1 and `RESULT_SPLITS.calibration` state (dev check 40 asserts them), including the over-confident < 30% band.
- **How:**
  - Re-set the predictions (the tuples' 10th element, and the generated results' `predictedWin`), moving each as little as needed.
  - Wins sit mostly at 50% and above, losses mostly under 50%, and a few losses in the high bands, so it reads honest rather than perfect.
  - **Keep the generator's existing `r.int(...)` draw for `predictedWin` in place, so the stream is untouched.** Override its value after the result is built, with a deterministic rule or a second stream seeded by the tender id.
- After the change, the Forecast accuracy tile on Bid record reads "On track" in Corniche, Batinah and Qurain, and the DG2 packs' calibration notes in those companies read "every band within ±10 points".

### 4. Two seed slips
- **The Saham duplicate:** retitle outcome `BA-O03` ("Saham wadi crossing bridges") to a Batinah roads or bridges project in another place. Use one no other Batinah row, register project or generated title uses (for example "Ibri–Yanqul road bridges").
  - The generator avoids titles already taken, so the new title must be one its pools can never produce: not a pool city followed by a pool work type from `POOLS.batinah`. Then no generated title shifts.
  - Check it the same way as step 1.2.1.
  - The 031 profile of Alpen Bridge Bearings then no longer meets the pair; check its Projects tab.
- **Seats:**
  - in `data/tenants.ts`, set each GCC tenant's licensed `seats` to at least the seats in use, rounded up to the next whole 2;
  - remove no person;
  - the Users page's "Seats in use" then reads "n of m" with n ≤ m in every company, and the Platform Console's tenant panel agrees.

### 5. Docs
- In `gcc-demo-data.md` §5, add short lines stating:
  - the places rule;
  - the value won rule (0.9–1.3× turnover) with Batinah's new target;
  - B–E calibration within ±10 points, Najd's intended exception unchanged.

  Keep the file's style: plain, one rule per line.

## Scope
- **Files:**
  - `data/gcc/lifecycle/placing.ts` (new), `fold.ts`, `generate.ts` and `pools.ts` (only if a range must move for generated wins);
  - the `OUTCOMES` tuples and the `BA-O03` title in `data/gcc/tenants/{corniche,batinah,qurain}.ts` (Dafna only if §3 applies);
  - `data/gcc/portfolio.ts`: Batinah's target only;
  - `data/tenants.ts`: GCC `seats` only;
  - `pages/gcc/dev-checks/69-history.tsx` (new);
  - `docs/07-product-design/agr-product-definition/gcc-demo-data.md` §5;
  - this plan and its README row.
- **Pinned dev-check values:** where an existing check pins a value this plan moves (a Batinah or Corniche value won, a calibration text in B–E, a seats count), update the pin, and list each change with its reason under Deviations.
  - Never loosen a rule: change only the expected value that follows from this plan's data.
  - Najd's calibration and flow targets must not move.
- **Out of scope:**
  - Najd's flow targets, results or calibration;
  - the seeded earlier years;
  - the library and the supplier pages (plan 033 and plan 031's files), which move only through derivation;
  - spreading Najd's Sunday submission dates (a separate follow-up).

## Steps
### Phase 1 — Places and gaps
- [ ] 1.1 `placing.ts` with `placingFor` and the rules of Design §1, on its own seeded stream.
- [ ] 1.2 Apply it to folded losses in `fold.ts` and generated losses in `generate.ts`, keeping any stated rank or gap.
  - [ ] 1.2.1 Confirm the generator's stream is untouched: every generated tender's id, title, dates and amounts are identical before and after this phase. Compare a dump of the lifecycles, without rank and gap, for all five companies.
- [ ] 1.3 Check the readers on screen:
  - the tracker's outcome line on a lost history tender;
  - the Stage 9 table;
  - the regret letter in the Library;
  - Why we lost on Bid record (Najd and Batinah).

### Phase 2 — Value won
- [ ] 2.1 Measure each company's 12-month value won ÷ FY2025 turnover. Report the five multiples before any change.
- [ ] 2.2 Batinah and Corniche: lower won values (authored rows first, then generated wins by scaling the drawn amount) until 0.9–1.3× holds, keeping every value in the company's band. Leave losses as they are.
- [ ] 2.3 Batinah's order-intake target: OMR 50 M.
- [ ] 2.4 Re-measure all five, and report the multiples after. Check OUT-3's tone in each company at 12 months and at 90 days.

### Phase 3 — Calibration
- [ ] 3.1 Report `calibrationFor(history.outcomes)` per company before any change: n, and each band's bids, won, predicted and actual.
- [ ] 3.2 Re-set predictions in Corniche, Batinah and Qurain (Design §3), with no new draw on the generator's stream.
- [ ] 3.3 Report the bands after. Najd's must be byte-identical to before.

### Phase 4 — Seed slips
- [ ] 4.1 Retitle `BA-O03`, and check the title is unique across Batinah's rows, register and generated titles. No generated tender's id, title or dates changes (compare as in 1.2.1).
- [ ] 4.2 Licensed seats ≥ seats in use in every GCC company. The Users page and the Platform Console's tenant panel agree.

### Phase 5 — Checks and docs
- [ ] 5.1 New `69-history.tsx`, each row across the five companies:
  - places published on at least half the losses, and gaps on at least half the price losses;
  - every place ≤ its bidders, and every gap > 0;
  - no pq loss has a place;
  - value won within 0.9–1.3× FY2025 turnover;
  - B–E judged bands within ±10 points;
  - Najd's bands equal `RESULT_SPLITS.calibration`;
  - seats in use ≤ licensed;
  - no 12-month lifecycle title equals a register project's title, compared as sets of lower-case words, so "Wadi crossing bridges, Saham" and "Saham wadi crossing bridges" count as equal.
- [ ] 5.2 `gcc-demo-data.md` §5 lines (Design §5).
- [ ] 5.3 Typecheck and build pass. `/dev/checks` has no failing row in any company, and you report the counts. Any pin you updated is listed under Deviations.
- [ ] 5.4 Click through at 1440, light and dark, with no console errors:
  - Company › Bid record in all five companies;
  - home dashboard tiles at 12 months in Batinah and Corniche;
  - `/stages/9` in Najd;
  - a DG2 pack's calibration note in Corniche;
  - Administration › Users in Corniche, Dafna and Batinah;
  - Alpen Bridge Bearings' Projects tab in Batinah.
- [ ] 5.5 Reset demo returns every screen to the new seed (this plan adds no demo state).

## Data and derivation
- Every change is in `src/data`; every screen moves by derivation (app rule 1). The same tender reads the same place, gap, value and prediction on every screen, because each is stored once on its lifecycle result.
- The generator stays deterministic: the same seed gives the same history on every reload.

## Acceptance checks
- Najd's Bid record › Why we lost shows our median place and gap on most reasons. The Stage 9 table shows places and gaps on most losses, and "Not published" on the rest (and on every pq loss).
- Batinah's and Corniche's 12-month value won is 0.9–1.3× their FY2025 turnover, and the five-year chart has no jump in its last year. Batinah's Value won reads against OMR 50 M.
- Forecast accuracy reads "On track" in Corniche, Batinah and Qurain. Najd still shows its one over-confident band with the honest line.
- No Batinah project appears to be listed twice. Seats in use never exceeds the licence.
- Najd's flow targets, results and calibration are unchanged. Every generated tender's id, title and dates are unchanged.
- Typecheck, build and every dev check pass.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
