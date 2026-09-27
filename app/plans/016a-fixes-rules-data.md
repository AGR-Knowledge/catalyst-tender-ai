# 016a — Polish: rules, counts and seed fixes carried from waves 3–5

Status: READY · Depends on: waves 1–5 (all in `gcc-demo`, commit 5ee38b8) · Can run in parallel with: 016b · Before: 016c

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
- [ ] 1.1 **The CEO's delegate wording** (`portfolio.actions.ts` about 399–411). The CEO sees the `dg1.oversight` rows without `dg1.delegate`, yet the row offers "Record as delegate" and says "you can record it as Omar Siddiqui's delegate".
  - Without `dg1.delegate` (ask `can()`): primary "Open DG1", the line "Waiting on {Bid Manager}", and no delegate sentence.
  - With it: unchanged.
  - (acceptance: as `najd.exec`, the home's DG1 row for T-2026-117 reads "Open DG1" and "Waiting on Omar Siddiqui"; as `najd.hot` it is unchanged.)
- [ ] 1.2 **"requested by you"** (`portfolio.actions.ts` about 348–361). When `doc.requestedById === ctx.viewer.id`, read "requested by you". (acceptance: as `najd.coord`, the booklet purchase row for T-2026-122.)
- [ ] 1.3 **"ranked 2 of 5"** (`lifecycle.port.ts` about 250, `stages.actions.ts` about 401). Write "ranked {a} of {b}" where the rank stands alone in a sentence; leave the "Our rank" column as it is. (acceptance: Najd Stage 9 dashboard, a lost tender's Debrief row and tracker node.)
- [ ] 1.4 **Stage 7 "Most"** (`stage7.kpi.ts` about 28–34). The sub-line names `rows[0]`, and the computed `most` is never used. Pass `most` through. (acceptance: add a dev-check row in `60-stages.tsx` with two synthetic rows where the larger one isn't first.)
- [ ] 1.5 **"Grade" twice** (`eligibility.ts` about 190, `credName`). Don't append ", Grade N" when the label already contains "Grade". (acceptance: an eligibility line naming a classification in Najd or Dafna reads the grade once.)
- [ ] 1.6 **Section 9.3's "at risk"** (`pack.ts` about 290). Interpretation lines are counted as "at risk". Report them apart: "12 of 16 PQ lines met, 2 at risk, 1 to interpret". Keep `atRisk` for the at-risk lines alone. (acceptance: T-2026-097's 9.3 in Najd, and the 90-stage3 targets, updated with old → new under Deviations.)
- [ ] 1.7 **The side-by-side's empty "Received" cell** (`levelling.ts` about 248). The levelled column repeats the received date: levelling doesn't change it. (acceptance: as `najd.proc`, the side-by-side on any levelled quote.)

### Phase 2 — Counts and routes that disagree
- [ ] 2.1 **The DG3 chip while the pack is with Compliance** (`portfolio.actions.ts` about 584–593, and the `dg3Approve` row about 265).
  - Leave out tenders whose `dg3State(...)?.sentBack` is set from the Head of Tendering's `waits`.
  - The row, while sent back, reads as waiting on Compliance (`waiting: true`, `waitingOn` the Compliance Lead) rather than "for your approval".
  - (acceptance: as `najd.hot`, Send back T-2025-305 on `/dg3?tender=T-2025-305`. The sidebar DG3 chip no longer says "waiting on me", and the row names Lina Barakat. Qurain's T-2025-428 behaves the same after its send-back.)
- [ ] 2.2 **Screening totals over hidden rows** (`Screening.tsx` about 78–80 and 160; `triage.ts` about 103–135). The ↓ columns and "Load if all pursued" include restricted rows the viewer can't see.
  - Compute the running sums over the rows shown.
  - Drop the footnote that says restricted rows count.
  - (acceptance: as `najd.coord`, with T-2026-121 restricted, the totals equal the sum of the visible rows; as `najd.hot`, cleared, unchanged.)
- [ ] 2.3 **The workspace audit tab misses Stage 2 entries** (`workspace/audit.ts` about 124 filters `target === tenderId`).
  - Stage 2 entries target `{TID} {pkgId}`, quote, RFQ or clarification ids, and Stage 1 queries target `{TID} · {topic}`.
  - Match the way `pages/gcc/s2/vm/desk.ts` about 131 already does. Move that matcher into the domain (`domain/gcc/auditTargets.ts`), use it in both places, and keep it exact enough that T-2026-01 never matches T-2026-011.
  - (acceptance: as `najd.proc` after the hero's Pursue, approve a shortlist, send RFQs and level a quote; the hero's Decisions & audit tab lists all three. Add one dev-check row for the matcher.)
- [ ] 2.4 **T-2026-061's bond validity on the Dates tab** (`s1/dates.ts` about 56 and 86–91). The Dates tab has no "Initial guarantee valid to" row.
  - Add it from `bidBondFor(...).validTo` (`s1/bond.ts` about 116–135), which already follows VAL-061-1.
  - `keyDatesFor` takes no `done`: add an optional `done` parameter (without it, nothing changes) and pass it from the Dates tab only: `pages/gcc/workspace/tabs/dates.tab.tsx` about 20, 46 and 48, and `pages/gcc/s1/parts/KeyDateList.tsx` about 26. These two call sites are yours for this item; 016b stays out of them.
  - (acceptance: as `corniche.hot`, `/tenders/T-2026-061?tab=dates` shows the row, and it moves when VAL-061-1 is resolved to 150 days.)
- [ ] 2.5 **Levelled totals for `see.quotes.summary`** (`s2/vm/desk.ts` about 84; `ui.tsx` 16; `LevelQuote.tsx` 61, 213; `BestFit.tsx` 117, 149).
  - The capability is labelled "Levelled quote summaries" (`access.ts` about 298). It is held by the Bid Manager (assigned), the Head of Tendering's delegates, the CEO and the committee members.
  - Levelled totals and the mix total show with `see.quotes` **or** `see.quotes.summary`. Suppliers' original quoted amounts stay masked without `see.quotes`.
  - (acceptance: as `najd.bid` on T-2026-104, `/levelling` and best fit show levelled and mix totals with the original prices masked; as `najd.comm` or `najd.plan`, still masked.)
- [ ] 2.6 **The SCR-6 and CAP-1 drills** (`portfolio.kpi.ts` about 337 and 378) open plain `/company`.
  - SCR-6 opens `/company?tab=credentials` with the "affects live bids" filter.
  - CAP-1 opens the tab it is about.
  - Read 010's `Company.tsx` for the URL parameters; don't edit it.
  - (acceptance: as `najd.hot`, the "Credentials at risk" tile's drill lands on the filtered list.)

### Phase 3 — Demo writes that leave a gap
- [ ] 3.1 **A tender approved at DG3 has no Stage 8 facts** (`50-dg3.apply.ts` about 52–56 drops `facts`).
  - Build `S8Facts` (`data/gcc/lifecycle/types.ts` about 178) from the DG3 evidence (`dg3EvidenceRecord`, `data/gcc/dg3/index.ts`):
    - `bond`: the evidence guarantee, `issued: true`;
    - `signaturesPending`: signatories not ready;
    - `openingDate`: the register's opening key date;
    - `packageReadyPct`: the evidenced share of requirements (evidenced ÷ total × 100, rounded).
  - Write the rule as a comment, and as one line in dashboards.md's Stage 8 section.
  - Update `97-dg3.tsx` about 109, which asserts there are no facts.
  - (acceptance: as `najd.hot`, approve T-2025-305; `/stages/8` counts it in the tiles that read bond and signatures, and its table row and the tiles agree. Reset returns it to Stage 7.)
- [ ] 3.2 **A DG1 re-open after Advance to Stage 3** (`s3/ready.ts` about 18–22, `25-stage3-entry.apply.ts` about 70–71). `dg1Reopen` writes only `dg1-reopen:{TID}`, so `pack-ready:` and `stage3-entry:` stay: the pack stays open by link, and a new Pursue jumps straight back to Stage 3.
  - Both keys count only when their `at` is later than the latest `dg1-reopen:{TID}` `at`. A value with no `at` (dev checks write `'1'`) still counts when there is no re-open. Parse defensively.
  - (acceptance: as `corniche.hot`, DG1 Pursue on T-2026-061 › Demo › Advance to Stage 3 › re-open DG1. `/packs?tender=T-2026-061` no longer opens the pack. A new Pursue leaves it at Stage 2, and Advance to Stage 3 is offered again. Add the case to `46-presenter.tsx`.)

### Phase 4 — Seed slips
- [ ] 4.1 **P-04's approved-vendor list** (Najd, T-2026-104). P-04 has `avlRequired: true` and the issuer is GCIU, yet its seeded RFQs went to suppliers not on GCIU's list. Their rows read "Not on the client's approved list: needs approval" after the RFQ went out.
  - First confirm it in the browser (as `najd.proc`, `/sourcing?tender=T-2026-104`, P-04). If it doesn't show, write that and skip.
  - Otherwise add GCIU to those two suppliers' AVLs (`data/gcc/s2/suppliers/najd.ts` about 31 and 44). The data is synthetic.
  - Check that no other Najd Stage 2 reading moves (the 80-stage2 targets).
- [ ] 4.2 **Two seed realism slips** (from 020 lane B):
  - T-2025-002's issuer doesn't match its location;
  - one Batinah questions deadline falls on 22 Mar 2026, inside the Eid al-Fitr closure.
  - Find both. For seed data, move the date to the next working day on the Omani calendar and give T-2025-002 an issuer from its city. If either is printed in a demo PDF (`public/bids/gcc/`), leave it and write it under Follow-ups.
- [ ] 4.3 **dashboards.md's Batinah note** (about 981 and 984), and the matching comments in `data/gcc/lifecycle/targets.ts` about 78 and `live/batinah.ts` about 10.
  - The table says 4 and the note waits for plan 012. The Arabic tender is T-2026-042 (plan 023), already one of the three.
  - Set the table to 3, drop the note, and fix both comments. No value changes.

### Phase 5 — Check
- [ ] 5.1 typecheck and build pass; `/dev/checks` has no failing row in any of the five tenants; each moved target is under Deviations.
- [ ] 5.2 Each acceptance above clicked through at 1440, with no console errors. Reset demo returns each to seed.

## Data and derivation
- No new facts except item 4's seed corrections.
- Item 3.1 derives Stage 8 facts from existing DG3 evidence.
- Item 3.2 reads the existing keys against `dg1-reopen:`.
- No new `done` keys.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] Every acceptance line in Phases 1–4, with no console errors.
- [ ] Reset demo returns the app to seed.
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan (with every moved dev-check target, old → new):
- Blockers / questions:
- Follow-ups noticed (not done):
