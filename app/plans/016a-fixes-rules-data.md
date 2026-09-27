# 016a — Polish: rules, counts and seed fixes carried from waves 3–5

Status: DONE (2026-09-27, reviewed) · Depends on: waves 1–5 (all in `gcc-demo`, commit 5ee38b8) · Can run in parallel with: 016b · Before: 016c

## Goal
The numbers and records a prospect sees agree with each other and with what they are told:
- Screening totals don't count a row the viewer can't see.
- The DG3 chip stops saying "waiting on me" while the pack is with Compliance.
- A tender approved at DG3 counts on the Stage 8 dashboard.
- A DG1 re-open really sends a tender back.
- The Bid Manager sees levelled totals, as the capability's name says.
- The workspace audit tab shows the Stage 2 work.
- Several small wording and seed slips are gone.

These items were found in earlier reviews and left for this plan.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Fix, don't build.** Every item below is a bug fix or a copy fix inside existing rules. No new screens, capabilities, `done` keys or libraries.
- **Keep other readings still.** A fix changes only the reading it is about. If a dev-check target moves, record the old and new value under Deviations, with why.
- **Stay in your files** (Scope). Plan 016b edits the screens and copy at the same time. If a fix needs a file outside your list, stop and ask.
- **Each item is small.** If one turns out bigger than about 30 lines, or needs a new rule, write it under Blockers and move on.

## Context
- Why: spec §19 (every number traces to data and derivations; masked data shows masked; records carry who, when and why); dashboards.md §2 and 013 Q3 ("a tile never counts what its table hides"); product-foundation rule 1 (the same tender never disagrees between two screens).
- The orchestrator's carry-lists: `app/plans/README.md`, "Wave 3 review", "Wave 4 review" and "Wave 5 review".
- Line numbers below were read on 2026-09-27. Re-read each file before editing.
- Personas are `{tenant}.{role}` (`src/data/people.ts`). For example:
  - `najd.hot` is Faisal Al-Harbi (Head of Tendering), `najd.coord` Aisha Al-Qahtani, `najd.bid` Omar Siddiqui, `najd.proc` Joseph Mathew;
  - `najd.exec` is Eng. Abdulaziz Al-Dosari (CEO), `najd.comp` Lina Barakat (Compliance);
  - `corniche.hot` is Rania Khoury, `corniche.bid` Sameer Qureshi.
- Run your own dev server: `npm --prefix app run dev -- --port 5186 --strictPort`. Don't touch 5173 (the orchestrator's) or 5187 (016b's).

## Scope
**Files to change (only these):**
- `src/domain/gcc/actions/portfolio.actions.ts`: items 1.1, 1.2, 2.1.
- `src/domain/gcc/lifecycle.port.ts`, `src/domain/gcc/actions/stages.actions.ts`: item 1.3.
- `src/domain/gcc/kpi/stage7.kpi.ts`: item 1.4.
- `src/domain/gcc/s1/eligibility.ts` (`credName` only): item 1.5.
- `src/domain/gcc/s3/pack.ts` (section 9.3 text only): item 1.6.
- `src/domain/gcc/s2/levelling.ts` (the "Received" row only): item 1.7.
- `src/pages/gcc/s1/Screening.tsx`, `src/domain/gcc/s1/triage.ts`: item 2.2.
- `src/domain/gcc/workspace/audit.ts`, `src/pages/gcc/s2/vm/desk.ts` (the target matcher), and a new `src/domain/gcc/auditTargets.ts` if the matcher moves: item 2.3.
- `src/domain/gcc/s1/dates.ts`, and the `keyDatesFor` call sites in `src/pages/gcc/workspace/tabs/dates.tab.tsx` and `src/pages/gcc/s1/parts/KeyDateList.tsx`: item 2.4.
- `src/pages/gcc/s2/vm/desk.ts`, `src/pages/gcc/s2/ui.tsx`, `src/pages/gcc/s2/LevelQuote.tsx`, `src/pages/gcc/s2/BestFit.tsx`: item 2.5.
- `src/domain/gcc/kpi/portfolio.kpi.ts` (the SCR-6 and CAP-1 drill routes only): item 2.6.
- `src/domain/gcc/demo/50-dg3.apply.ts`, `src/domain/gcc/kpi/stage8.kpi.ts` (read only unless needed): item 3.1.
- `src/domain/gcc/s3/ready.ts`, `src/domain/gcc/demo/25-stage3-entry.apply.ts`: item 3.2.
- `src/data/gcc/s2/suppliers/najd.ts` or `src/data/gcc/s2/tenders/najd.ts`: item 4.1.
- Seed slips: `src/data/gcc/lifecycle/live/*.ts`, `src/data/gcc/lifecycle/targets.ts` (comments and the rows item 4.2 names), `src/data/gcc/tenders/*` or wherever T-2025-002 and Batinah's 22 Mar questions date live: item 4.2.
- `docs/07-product-design/agr-product-definition/dashboards.md`: the Batinah row and note (item 4.3), and one line on the Stage 8 rule (item 3.1).
- Dev checks, only where your fix moves a target: `src/pages/gcc/dev-checks/{50-portfolio,60-stages,70-stage1,80-stage2,90-stage3,97-dg3,46-presenter}.tsx`.

**Out of scope** (stop and ask):
- anything plan 016b owns:
  - `components/layout/**`, `components/dashboard/**`, `components/tender/**`, `styles/**`;
  - `pages/gcc/workspace/**` (except the two `keyDatesFor` call sites of item 2.4), `pages/gcc/s1/UploadGcc.tsx`, `pages/gcc/dg3/**`, `pages/gcc/dg2/**`, `pages/gcc/company/**`;
  - `domain/gcc/workspace/header.ts`, `state/store.tsx`;
- extending Weighted beyond Stage 3 (dashboards.md §6 keeps it to issued packs, by design);
- the seeded input times of T-2026-061 and T-2026-042 (a known limit, recorded in 016c's runbook);
- Arabic highlighting in the PDF viewer;
- new `done` keys, capabilities or libraries; the Indian world.

## Steps

### Phase 1 — Wording read from the rules
- [x] 1.1 **The CEO's delegate wording** (`portfolio.actions.ts` about 399–411). The CEO sees the `dg1.oversight` rows without `dg1.delegate`, yet the row offers "Record as delegate" and says "you can record it as Omar Siddiqui's delegate".
  - Without `dg1.delegate` (ask `can()`): primary "Open DG1", the line "Waiting on {Bid Manager}", and no delegate sentence.
  - With it: unchanged.
  - (acceptance: as `najd.exec`, the home's DG1 row for T-2026-117 reads "Open DG1" and "Waiting on Omar Siddiqui"; as `najd.hot` it is unchanged.)
- [x] 1.2 **"requested by you"** (`portfolio.actions.ts` about 348–361). When `doc.requestedById === ctx.viewer.id`, read "requested by you". (acceptance: as `najd.coord`, the booklet purchase row for T-2026-122.)
- [x] 1.3 **"ranked 2 of 5"** (`lifecycle.port.ts` about 250, `stages.actions.ts` about 401). Write "ranked {a} of {b}" where the rank stands alone in a sentence; leave the "Our rank" column as it is. (acceptance: Najd Stage 9 dashboard, a lost tender's Debrief row and tracker node.)
- [x] 1.4 **Stage 7 "Most"** (`stage7.kpi.ts` about 28–34). The sub-line names `rows[0]`, and the computed `most` is never used. Pass `most` through. (acceptance: add a dev-check row in `60-stages.tsx` with two synthetic rows where the larger one isn't first.)
- [x] 1.5 **"Grade" twice** (`eligibility.ts` about 190, `credName`). Don't append ", Grade N" when the label already contains "Grade". (acceptance: an eligibility line naming a classification in Najd or Dafna reads the grade once.)
- [x] 1.6 **Section 9.3's "at risk"** (`pack.ts` about 290). Interpretation lines are counted as "at risk". Report them apart: "12 of 16 PQ lines met, 2 at risk, 1 to interpret". Keep `atRisk` for the at-risk lines alone. (acceptance: T-2026-097's 9.3 in Najd, and the 90-stage3 targets, updated with old → new under Deviations.)
- [x] 1.7 **The side-by-side's empty "Received" cell** (`levelling.ts` about 248). The levelled column repeats the received date: levelling doesn't change it. (acceptance: as `najd.proc`, the side-by-side on any levelled quote.)

### Phase 2 — Counts and routes that disagree
- [x] 2.1 **The DG3 chip while the pack is with Compliance** (`portfolio.actions.ts` about 584–593, and the `dg3Approve` row about 265).
  - Leave out tenders whose `dg3State(...)?.sentBack` is set from the Head of Tendering's `waits`.
  - The row, while sent back, reads as waiting on Compliance (`waiting: true`, `waitingOn` the Compliance Lead) rather than "for your approval".
  - (acceptance: as `najd.hot`, Send back T-2025-305 on `/dg3?tender=T-2025-305`. The sidebar DG3 chip no longer says "waiting on me", and the row names Lina Barakat. Qurain's T-2025-428 behaves the same after its send-back.)
- [x] 2.2 **Screening totals over hidden rows** (`Screening.tsx` about 78–80 and 160; `triage.ts` about 103–135). The ↓ columns and "Load if all pursued" include restricted rows the viewer can't see.
  - Compute the running sums over the rows shown.
  - Drop the footnote that says restricted rows count.
  - (acceptance: as `najd.coord`, with T-2026-121 restricted, the totals equal the sum of the visible rows; as `najd.hot`, cleared, unchanged.)
- [x] 2.3 **The workspace audit tab misses Stage 2 entries** (`workspace/audit.ts` about 124 filters `target === tenderId`).
  - Stage 2 entries target `{TID} {pkgId}`, quote, RFQ or clarification ids, and Stage 1 queries target `{TID} · {topic}`.
  - Match the way `pages/gcc/s2/vm/desk.ts` about 131 already does. Move that matcher into the domain (`domain/gcc/auditTargets.ts`), use it in both places, and keep it exact enough that T-2026-01 never matches T-2026-011.
  - (acceptance: as `najd.proc` after the hero's Pursue, approve a shortlist, send RFQs and level a quote; the hero's Decisions & audit tab lists all three. Add one dev-check row for the matcher.)
- [x] 2.4 **T-2026-061's bond validity on the Dates tab** (`s1/dates.ts` about 56 and 86–91). The Dates tab has no "Initial guarantee valid to" row.
  - Add it from `bidBondFor(...).validTo` (`s1/bond.ts` about 116–135), which already follows VAL-061-1.
  - `keyDatesFor` takes no `done`: add an optional `done` parameter (without it, nothing changes) and pass it from the Dates tab only: `pages/gcc/workspace/tabs/dates.tab.tsx` about 20, 46 and 48, and `pages/gcc/s1/parts/KeyDateList.tsx` about 26. These two call sites are yours for this item; 016b stays out of them.
  - (acceptance: as `corniche.hot`, `/tenders/T-2026-061?tab=dates` shows the row, and it moves when VAL-061-1 is resolved to 150 days.)
- [x] 2.5 **Levelled totals for `see.quotes.summary`** (`s2/vm/desk.ts` about 84; `ui.tsx` 16; `LevelQuote.tsx` 61, 213; `BestFit.tsx` 117, 149).
  - The capability is labelled "Levelled quote summaries" (`access.ts` about 298). It is held by the Bid Manager (assigned), the Head of Tendering's delegates, the CEO and the committee members.
  - Levelled totals and the mix total show with `see.quotes` **or** `see.quotes.summary`. Suppliers' original quoted amounts stay masked without `see.quotes`.
  - (acceptance: as `najd.bid` on T-2026-104, `/levelling` and best fit show levelled and mix totals with the original prices masked; as `najd.comm` or `najd.plan`, still masked.)
- [x] 2.6 **The SCR-6 and CAP-1 drills** (`portfolio.kpi.ts` about 337 and 378) open plain `/company`.
  - SCR-6 opens `/company?tab=credentials` with the "affects live bids" filter.
  - CAP-1 opens the tab it is about.
  - Read 010's `Company.tsx` for the URL parameters; don't edit it.
  - (acceptance: as `najd.hot`, the "Credentials at risk" tile's drill lands on the filtered list.)

### Phase 3 — Demo writes that leave a gap
- [x] 3.1 **A tender approved at DG3 has no Stage 8 facts** (`50-dg3.apply.ts` about 52–56 drops `facts`).
  - Build `S8Facts` (`data/gcc/lifecycle/types.ts` about 178) from the DG3 evidence (`dg3EvidenceRecord`, `data/gcc/dg3/index.ts`):
    - `bond`: the evidence guarantee, `issued: true`;
    - `signaturesPending`: signatories not ready;
    - `openingDate`: the register's opening key date;
    - `packageReadyPct`: the evidenced share of requirements (evidenced ÷ total × 100, rounded).
  - Write the rule as a comment, and as one line in dashboards.md's Stage 8 section.
  - Update `97-dg3.tsx` about 109, which asserts there are no facts.
  - (acceptance: as `najd.hot`, approve T-2025-305; `/stages/8` counts it in the tiles that read bond and signatures, and its table row and the tiles agree. Reset returns it to Stage 7.)
- [x] 3.2 **A DG1 re-open after Advance to Stage 3** (`s3/ready.ts` about 18–22, `25-stage3-entry.apply.ts` about 70–71). `dg1Reopen` writes only `dg1-reopen:{TID}`, so `pack-ready:` and `stage3-entry:` stay: the pack stays open by link, and a new Pursue jumps straight back to Stage 3.
  - Both keys count only when their `at` is later than the latest `dg1-reopen:{TID}` `at`. A value with no `at` (dev checks write `'1'`) still counts when there is no re-open. Parse defensively.
  - (acceptance: as `corniche.hot`, DG1 Pursue on T-2026-061 › Demo › Advance to Stage 3 › re-open DG1. `/packs?tender=T-2026-061` no longer opens the pack. A new Pursue leaves it at Stage 2, and Advance to Stage 3 is offered again. Add the case to `46-presenter.tsx`.)

### Phase 4 — Seed slips
- [x] 4.1 **P-04's approved-vendor list** (Najd, T-2026-104). P-04 has `avlRequired: true` and the issuer is GCIU, yet its seeded RFQs went to suppliers not on GCIU's list. Their rows read "Not on the client's approved list: needs approval" after the RFQ went out.
  - First confirm it in the browser (as `najd.proc`, `/sourcing?tender=T-2026-104`, P-04). If it doesn't show, write that and skip.
  - Otherwise add GCIU to those two suppliers' AVLs (`data/gcc/s2/suppliers/najd.ts` about 31 and 44). The data is synthetic.
  - Check that no other Najd Stage 2 reading moves (the 80-stage2 targets).
- [x] 4.2 **Two seed realism slips** (from 020 lane B):
  - T-2025-002's issuer doesn't match its location;
  - one Batinah questions deadline falls on 22 Mar 2026, inside the Eid al-Fitr closure.
  - Find both. For seed data, move the date to the next working day on the Omani calendar and give T-2025-002 an issuer from its city. If either is printed in a demo PDF (`public/bids/gcc/`), leave it and write it under Follow-ups.
- [x] 4.3 **dashboards.md's Batinah note** (about 981 and 984), and the matching comments in `data/gcc/lifecycle/targets.ts` about 78 and `live/batinah.ts` about 10.
  - The table says 4 and the note waits for plan 012. The Arabic tender is T-2026-042 (plan 023), already one of the three.
  - Set the table to 3, drop the note, and fix both comments. No value changes.

### Phase 5 — Check
- [x] 5.1 typecheck and build pass; `/dev/checks` has no failing row in any of the five tenants; each moved target is under Deviations.
- [x] 5.2 Each acceptance above clicked through at 1440, with no console errors. Reset demo returns each to seed.

## Data and derivation
- No new facts except item 4's seed corrections.
- Item 3.1 derives Stage 8 facts from existing DG3 evidence.
- Item 3.2 reads the existing keys against `dg1-reopen:`.
- No new `done` keys.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] Every acceptance line in Phases 1–4, with no console errors.
- [x] Reset demo returns the app to seed.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-27.)

**Changed files** (all in the plan's Scope; paths under `app/`):
- 1.1, 1.2, 2.1: `src/domain/gcc/actions/portfolio.actions.ts`.
- 1.3: `src/domain/gcc/lifecycle.port.ts`, `src/domain/gcc/actions/stages.actions.ts`.
- 1.4: `src/domain/gcc/kpi/stage7.kpi.ts` (exports `countOver` and `on` for the dev check).
- 1.5: `src/domain/gcc/s1/eligibility.ts` (`credName` only).
- 1.6: `src/domain/gcc/s3/pack.ts` (9.3 only; `Section93` gains `interpretation`).
- 1.7: `src/domain/gcc/s2/levelling.ts` (the "Received" row only).
- 2.2: `src/domain/gcc/s1/triage.ts` (optional `visible` on `triageFor`), `src/pages/gcc/s1/Screening.tsx`.
- 2.3: new `src/domain/gcc/auditTargets.ts`; `src/domain/gcc/workspace/audit.ts`; `src/pages/gcc/s2/vm/desk.ts` (re-exports the domain's `auditOfTender`).
- 2.4: `src/domain/gcc/s1/dates.ts` (optional `done` on `keyDatesFor`), `src/pages/gcc/workspace/tabs/dates.tab.tsx` (the three `keyDatesFor` calls), `src/pages/gcc/s1/parts/KeyDateList.tsx` (the `keyDatesFor` call).
- 2.5: `src/pages/gcc/s2/vm/desk.ts` (`seesLevelled`), `src/pages/gcc/s2/ui.tsx` (`QuoteAmount levelled`), `src/pages/gcc/s2/LevelQuote.tsx`, `src/pages/gcc/s2/BestFit.tsx`.
- 2.6: `src/domain/gcc/kpi/portfolio.kpi.ts` (the two drill routes only).
- 3.1: `src/domain/gcc/demo/50-dg3.apply.ts`; one line in dashboards.md §10.11. `stage8.kpi.ts` read only.
- 3.2: `src/domain/gcc/s3/ready.ts` (`standsAfterDg1Reopen`), `src/domain/gcc/demo/25-stage3-entry.apply.ts`.
- 4.1: `src/data/gcc/s2/suppliers/najd.ts` (Gulf Process Systems and Salwa Environmental gain GCIU).
- 4.3: `src/data/gcc/lifecycle/targets.ts` and `src/data/gcc/lifecycle/live/batinah.ts` (comments only); `docs/07-product-design/agr-product-definition/dashboards.md` (§12.5 Batinah row 4 → 3, the note dropped; plus 3.1's line in §10.11).
- Dev checks: `46-presenter`, `60-stages`, `70-stage1`, `80-stage2`, `90-stage3`, `97-dg3`.

**Verification:**
- `npm --prefix app run typecheck` and `run build` pass (only the known chunk-size warning).
- `/dev/checks`: no failing row in any tenant, 0 console errors. Najd 729, Corniche 320, Dafna 301, Batinah 309, Qurain 324 passing targets (wave 5: 722 / 314 / 296 / 303 / 319; the difference is the rows added below, on the combined checkout with 016b in progress).
- Every acceptance was clicked through at 1440 × 900 on my own server (port 5186), in headless Chromium driven by Playwright, each flow in a fresh browser context, with 0 console errors:
  - 1.1: as `najd.exec`, the home's T-2026-117 row reads "Due today 16:10 · Waiting on Omar Siddiqui, Bid Manager" with an enabled "Open DG1", which lands on `/dg1?tender=T-2026-117`. As `najd.hot` it still reads "Record as delegate".
  - 1.2: as `najd.coord`, the T-2026-122 booklet row ends "requested by you".
  - 1.3: Najd `/stages/9`: the T-2025-270 Debrief row reads "(lost on price, ranked 2 of 6, 6.8% above the winner)". Its tracker node reads "Lost · price · ranked 2 of 6 · Thu 5 Mar".
  - 1.4: the dev-check row reads "Most: T-B" for two synthetic rows with the larger second.
  - 1.5: see Deviations. T-2026-061 Q-02 now reads "Abu Dhabi contractor classification: MEP, first grade: valid to Thu 31 Dec 2026".
  - 1.6: the 90-stage3 rows below.
  - 1.7 and 2.5: as `najd.proc`, T-2026-104's side-by-side "Received" row reads "Tue 3 Mar 2026 | Tue 3 Mar 2026". As `najd.bid` and `najd.exec`, the levelled total (SAR 11.4 M), the levelled column, the mix options (SAR 38.5 / 38.9 / 39.0 M) and the per-package levelled figures show, and "As quoted" is masked.
  - 2.1: as `najd.hot`, Send back T-2025-305 on `/dg3`. The DG3 chip goes from waiting on you to open, and the row reads "Sent back to Compliance · Lina · Waiting on Lina Barakat, Compliance / Legal Lead". This survives a reload. After `najd.comp` re-issues, the chip is waiting on you again. Qurain T-2025-428 behaves the same, waiting on Nour El-Din.
  - 2.2: the footnote is gone. See Deviations for the seed.
  - 2.3: as `najd.proc`: RFQs-out preset, Advance agent work, then one levelling confirm on the hero. The hero's Decisions & audit tab lists 1 Packaging approved, 11 Shortlist approved, 11 RFQs sent, 11 supplier quotes and the Levelling adjustment confirmed.
  - 2.4: as `corniche.hot`, `/tenders/T-2026-061?tab=dates` shows "Initial guarantee valid to Fri 18 Sep 2026", with the conflict note and the bank lead-time flag.
    - As `corniche.coord`, resolving VAL-061-1 to 150 days keeps Fri 18 Sep (the note says "as resolved in the intake queue").
    - Resolving it to 120 days moves the row to Wed 19 Aug 2026.
    - Both survive a reload.
  - 2.6: as `najd.hot`, the "Credentials at risk" tile opens `/company?tab=credentials&bids=affects`, with the filter on "Affects live bids (2)" and two rows, Zakat and GOSI. The "Bid-team load" tile opens `/company?tab=teams`.
  - 3.1: as `najd.hot`, approve T-2025-305 on `/dg3`. `/stages/8` then reads:
    - Submissions due 1 → 2;
    - Packages ready 88% → 94% (T-2025-298 at 88%, T-2025-305 at 100%);
    - Signatures pending 2 (T-2025-305 has none pending);
    - Bid bonds "1 bond in order" → "2 bonds in order".
    - T-2025-305's table row reads 8 · Submission · Assembling · Sun 15 Mar, 10:00 · 5 working days · Etimad · 100%.
    - Settings › Reset demo › Reset this company returns it to Stage 7 and the tiles to the seed.
  - 3.2: as `corniche`:
    - the Coordinator resolves VAL-061-1, then the Bid Manager records DG1 Pursue;
    - the Head of Tendering uses Demo › Advance T-2026-061 to Stage 3 (3 · Bid decision, the pack opens at `/packs`), then re-opens DG1 with a reason. The tender is back at 1 · Intake, and `/packs?tender=T-2026-061` says there is no pack yet;
    - a new Pursue leaves it at 2 · Sourcing · Packaging, still with no pack, and the Demo menu offers "Advance T-2026-061 to Stage 3" again. This survives a reload.
    - The 46-presenter rows run the same for T-2026-042, including the second Advance.
  - 4.1: as `najd.proc`, `/sourcing?tender=T-2026-104&s=shortlists` › P-04. Before the fix, Salwa and Gulf Process read "RFQ sent" and "Not on the client's approved list: needs approval". After it, both read "On the client's approved list". Brenner, which was never sent an RFQ (screening due), still needs approval. The 80-stage2 targets are unchanged (all 56 met).

**Deviations from plan** (every moved dev-check target, old → new):
- **Moved or new dev-check targets:**
  - `97-dg3` "Approve: Stage 8 · Assembling …": it asserted `!lA.facts` (no Stage 8 facts) and now asserts `lA.facts?.stage === 8`. New row "Approve: Stage 8 facts from the evidence": bond issued to 2026-06-20 (needs 2026-06-13), 0 signatures pending, 100% ready, opens 2026-03-15.
  - `90-stage3`: no existing target moved. New targets:
    - '097 · 9.3 PQ lines' = 'All PQ lines met at generation (16 of 16)'. It is unchanged: T-2026-097's pack reads its frozen roll-up, because the tender has no live requirements.
    - 'T-2026-061 · 9.3 PQ lines (live)': "8 of 10 PQ lines met, 2 at risk" → "8 of 10 PQ lines met, 1 at risk, 1 to interpret".
    - 'T-2026-042 · 9.3 PQ lines (live)': "7 of 9 PQ lines met, 2 at risk" → "7 of 9 PQ lines met, 1 at risk, 1 to interpret".
  - New rows only, with no existing target moved:
    - `60-stages` "Stage 7 · sub-line names the most, not the first" = "Most: T-B";
    - `80-stage2` "Audit matcher: T-2026-01 against T-2026-011 · CL-104-01" = "5 of 10 · T-2026-104", in every tenant;
    - `46-presenter` "DG1 re-open after Advance to Stage 3" for T-2026-061 and T-2026-042 = "after re-open: Stage 1 · no pack · new Pursue: Stage 2 · no pack · Advance offered · after it: Stage 3 · pack v1";
    - `70-stage1` "Triage totals over the rows shown (one hidden)".
    - `46-presenter`'s `pursued()` helper takes an optional later state and time.
  - `50-portfolio` is untouched. Its booklet row is read as the Head of Tendering, so it still says "requested by Aisha Al-Qahtani".
- **1.1:** For a viewer without `dg1.delegate` (the CEO), "Open DG1" is enabled, and the old disabled reason ("Omar Siddiqui records DG1") is gone. The row sorts as waiting on someone else. A tender with no Bid Manager reads "No Bid Manager assigned" and waits on the Head of Tendering; no seeded row is like that.
- **1.5:** The double grade was on Corniche's Abu Dhabi classification, "MEP, first grade" (T-2026-061 Q-02), not in Najd or Dafna. Najd's labels carry no grade word, and Dafna's "civil works, first grade" sits on no eligibility line.
- **1.6:**
  - The acceptance names T-2026-097, but its 9.3 reads the snapshot, so it doesn't change. The change shows on the two packs read against live eligibility, T-2026-061 and T-2026-042.
  - `Section93.atRisk` now counts the at-risk lines only, and a new `interpretation` field counts the lines to interpret.
- **2.1:**
  - While the pack is back with Compliance, the row waits on the Compliance Lead for every viewer except the Compliance Lead, who sees no "waiting on" line.
  - The approver's disabled reason and the blocking rule are unchanged.
- **2.2:**
  - The acceptance can't be reproduced on the seed. No tenant has a restricted row in its triage: T-2026-121's disposition is `restricted`, so it never joins the DG1 queue. The Coordinator and the Head of Tendering therefore already read the same Screening (Load 121%, bid bonds SAR 20.5 M, 21% of headroom).
  - Checked instead with one row hidden (T-2026-117):
    - bid bonds SAR 20.48 M → 16.68 M, equal to the sum of the rows shown;
    - facility share 21% → 17%;
    - networks team 80% → 63%.
    - It is kept as a dev-check row.
  - Without `visible`, `triageFor` is unchanged.
  - The teams, the facility and the flags are also computed over the rows shown.
- **2.3:**
  - The matcher also matches `{TID}:` (input nudges) and `Q-{TID}-` (quotes).
  - It resolves clarification ids (`CL-104-01`) through the Stage 2 seed.
  - DG1 re-open entries (`{TID} · {title}`) now reach the audit tab too.
  - `Sourcing.tsx` is unchanged: it passes no tenant, so a clarification is looked up in every tenant's seed. The list it passes is already the tenant's own.
  - I ran the acceptance through the RFQs-out preset and Advance agent work, not by hand, package by package. They write the same keys and audit entries.
- **2.4:**
  - The row is added wherever the bond terms state the validity in days or hold it in a validation, and the tender types no "Initial guarantee valid to" date. That is T-2026-061, and also Najd T-2026-101 and T-2026-097, Corniche T-2026-029 and Qurain T-2026-049.
  - Each of those Dates tabs gains the row with its bank lead-time flag, so the tab badge rises by one: 061 from 1 to 2 flagged, the other four from 0 to 1.
  - The acceptance's "moves when resolved to 150 days" doesn't happen: until it is resolved, VAL-061-1 already holds the longer 150 days. Resolving to 150 keeps Fri 18 Sep and changes only the note; resolving to 120 moves the row to Wed 19 Aug.
  - The DG1 pack's compact date list gets no `done`, so it is unchanged.
- **2.5:** The acceptance's "as `najd.comm` or `najd.plan`, still masked" can't be shown:
  - `najd.comm` holds `see.quotes` and sees every figure, before and after this change.
  - `najd.plan` and the committee members can't open `/levelling`.
  - No demo persona opens `/levelling` without one of the two capabilities: every tender's Bid Manager is the tenant's `bid` persona.
- **3.1:** The Stage 8 facts are read from `dg3EvidenceFor` rather than the raw `dg3EvidenceRecord`, so a guarantee the bank extended at a re-issue (Qurain's catch) keeps its extended date in Stage 8. Where the register has no opening key date, the opening is the submission deadline's date (T-2025-305: 2026-03-15).
- **4.2:** Both slips were already fixed in the 020 orchestrator review, so nothing was changed:
  - T-2026-042's questions deadline is Tue 24 Mar (`tenants/batinah-042.ts:26`), the first working day after the Omani Eid closure (20–23 Mar). No Batinah date falls on 22 Mar.
  - T-2025-002 is "Jazan district water reservoirs", issued by Southern Cities Water Services Company. Its workspace header reads "… · Jazan, Saudi Arabia", which matches.
  - Neither is printed in a demo PDF.

**Blockers / questions:** none.

**Follow-ups noticed (not done):**
- The P-04 approved-list slip exists on other seeded RFQs of packages that need the client's approved list:
  - T-2026-104: P-03 (Sahara Clearwater, Tamarisk) and P-06 (Weser, declined);
  - Corniche T-2026-044: P-01 and P-02 (Tilal Thermal, Warsan Thermal);
  - Qurain T-2026-058: P-01 (Hokuriku Shield, Taihu Shield).
- Najd T-2026-119's questions deadline, Sun 22 Mar, falls inside the expected KSA Eid al-Fitr closure (19–28 Mar). The screen flags it. Keep it as a flag, or move it to Sun 29 Mar.
- `see.quotes.summary` leaves a small gap. The levelled total and the adjustment trace are both visible, for example "VAT 15% removed" or a currency conversion, so a viewer can work back to the quoted amount on some quotes. Masking the trace's rates for summary-only viewers (`LevelQuote.tsx`) would close it.
- `pages/gcc/s3/sections/Competitors.tsx` colours the 9.3 PQ line on `atRisk` alone. A pack with only lines to interpret would now read green; use `atRisk || interpretation`.
- An existing copy slip: the levelling summary's label ends "…delivered to site, SAR", and the value beside it reads "SAR 11.4 M", so the currency appears twice.
