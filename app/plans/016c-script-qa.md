# 016c — Script QA: scripts A–F run end to end, and the presenter runbook

Status: READY after 016a and 016b are reviewed · Depends on: 016a, 016b · Can run in parallel with: none (it runs alone, so it may fix small things in any file)

## Goal
A salesperson can run every demo script (spec §17) from a clean reset, as the personas it names, without a dead end, a wrong number or a console error, at 1440 and 1280, light and dark. After this plan:
- the spec §19 acceptance list is checked off, item by item;
- a short **presenter runbook** gives the tested click path for each script, where to switch persona, and what not to click.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Walk, log, fix small.** Walk each script exactly as the runbook will say it. Log every finding in the Findings table below.
- **What you may fix yourself:** anything small (about 30 lines or fewer) that changes no rule, data model, capability or `done` key: layout, copy, wiring, focus, a missing guard.
- **What you log and leave:** anything bigger, or any fix that would move a dev-check target without a clear bug behind it. Mark it "Left" with why; the orchestrator decides.
- **Don't widen the demo.** No new screens, presets or seed tenders. If a script needs one to run, it's a Blocker.
- **The runbook describes, the app decides.** Name screens, buttons and what changes ("the Zakat line turns green"). Avoid copying figures into the runbook: they drift. Where a number is the point (a fit score), name the tile or column.

## Context
- **The scripts:** s1-s3-demo-spec §17, with the moments M-1 … M-9 of §1. Two points there are out of date; this plan corrects the spec (Phase 4):
  - DG2 is **approved by the Head of Tendering** (dashboards.md §9, and the 2026-09-25 replan). The CEO records a position as a committee member (seat `ceo`), not the decision.
  - §19's last line ("Demo scope mode hides Stage 4–9 surfaces") is superseded by dashboards.md **DB-10**: Stages 4–9 have real tenders and a stage dashboard each, with no working screens; GCC tenants are always in Stages 1–3 scope, and the Demo scope toggle shows only for `gen-in` (gcc-demo-data §3).
- **Presenter controls** (plan 014, the Demo menu in the top bar):
  - presets "Start: morning intake", "Start: DG1 due", "Start: RFQs out" (not in Corniche or Batinah), "Start: DG2 committee" (Najd only);
  - Advance agent work; Advance to Stage 3 (T-2026-061 in Corniche, T-2026-042 in Batinah, after DG1 Pursue);
  - Compare tenants (`/demo/compare`); Reset this company or all.
- **Decisions already made** (plans/README.md, Wave 5 review):
  - script E uploads as the Tender Coordinator (the Bid Manager has no upload), then carries on as the Bid Manager;
  - the hero keeps "Arabic text prevails (§27)" even on its English booklet;
  - Weighted has bars only for Stage 3 issued packs, by design (dashboards.md §6).
- **Personas** are `{tenant}.{role}`, or `{tenant}.member.{seat}` for the committee (`src/data/people.ts`).
  - Najd (the primary tenant):
    - `hot` Faisal Al-Harbi, `coord` Aisha Al-Qahtani, `bid` Omar Siddiqui, `proc` Joseph Mathew;
    - `exec` Eng. Abdulaziz Al-Dosari (CEO), `member.cfo` Khalid Al-Mutairi, `member.technical` Dr Hany Farouk;
    - `comm` Tarek Haddad, `comp` Lina Barakat, `fin` Sultan Al-Anazi, `hr` Noura Al-Shammari.
  - Batinah: `coord` Shamsa Al-Hinai, `bid` Imran Sheikh.
  - Qurain: `hot` Bader Al-Mutawa, `comp` Nour El-Din.
  - Also the supplier and the Catalyst operator (`platform`).
- **Demo tenders:**
  - the hero T-2026-118, in all five tenants;
  - Najd: T-2026-097 (script C, with its addendum) and T-2025-305 (DG3, clean);
  - Qurain: T-2025-428 (DG3, its guarantee 3 days short) and T-2026-071 (bilingual);
  - Corniche: T-2026-061 (English, UAE);
  - Batinah: T-2026-042 (Arabic, scanned pp. 15–17).
- Run your own dev server: `npm --prefix app run dev -- --port 5188 --strictPort`. Don't touch 5173 (the orchestrator's).

## Scope
**Files to create:**
- `docs/07-product-design/agr-product-definition/demo-runbook.md`: the presenter runbook (Phase 3).

**Files to change:**
- any file, for small fixes found in the walk (see the rules above), each named in the Findings table;
- `docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md`: §1 M-6, §17 scripts C and E, and §19 (Phase 4).

**Out of scope** (stop and ask):
- new screens, presets, seed tenders, capabilities, `done` keys or libraries;
- rules or counts that change a dev-check target;
- the Indian world (check only that it never shows in a GCC tenant);
- the known limits listed in 3.2.

## Findings
Add one row per finding, as you go.

| # | Script · step | Persona · width · theme | What happened | Fixed (file) or Left (why) |
| --- | --- | --- | --- | --- |

## Steps

### Phase 1 — Walk the six scripts
For each script:
- start from **Reset all**, at 1440 × 900, light;
- walk it through as the listed personas;
- walk it again at 1280 × 800, dark;
- on one of the two passes, use only the keyboard for the main path: Tab order, visible focus, Esc closes sheets and modals and focus returns.

Watch the console throughout.

- [ ] 1.1 **Script A. From portal to Pursue** (Najd; "Start: morning intake"; M-1, M-2, M-3).
  1. As `najd.hot`: the home, then Tender radar. The hero, captured from Etimad this morning. The booklet purchase requested by the Coordinator and approved by a person.
  2. As `najd.coord`: the intake steps for the hero, then the intake queue. The two fields, including the initial guarantee's 1% vs 2% conflict; resolve both.
  3. As `najd.hot`: the hero's Eligibility tab. Zakat and GOSI at risk; the turnover-years interpretation; Request renewal on Zakat.
  4. The renewal loop: as `najd.fin`, My requests › Open credentials › Upload renewal. Back as `najd.hot`: the line passes, and "Credentials at risk" has dropped by one.
  5. The Queries tab: the drafted queries (VAT; turnover years).
  6. DG1 on `/dg1?tender=T-2026-118`: Pursue with the team. The RFQ clock starts.
- [ ] 1.2 **Script B. Quotes without chasing** (Najd; "Start: RFQs out"; M-4).
  1. As `najd.proc`: the hero's packages, a shortlist where screening blocks one supplier, then the RFQs sent.
  2. Demo › Advance agent work: the scripted replies, the nudges and an escalation.
  3. Levelling: VAT, EUR, ex-works, validity and exclusions, each with its trace.
  4. Best fit, with an override and its reason.
  5. The Supplier Portal preview, as the supplier.
  6. As `najd.bid`: the levelled totals show and the original prices are masked (016a 2.5).
- [ ] 1.3 **Script C. The committee decides** (Najd; "Start: DG2 committee" on T-2026-097; M-5, M-6).
  1. As `najd.bid`: the pack. Win probability with its range and drivers, competitors with sources, bond and facility exposure, the capacity clash, the margin range. It was re-run on the addendum and issued.
  2. As `najd.member.cfo` and `najd.member.technical`: record positions.
  3. As `najd.exec`: record the CEO's position as a member.
  4. As `najd.hot`: approve Bid with conditions on `/dg2?tender=T-2026-097`.
  5. The record (who, when, what was seen, why) and the audit log.
- [ ] 1.4 **Script D. Same tender, five companies** (all five tenants; M-7).
  1. As `najd.hot`, the hero workspace › Compare tenants. The five columns give five different answers.
  2. Open each column: the company switches, and the hero opens in that company with its own eligibility, fit and team load.
  3. Switch back with the company switcher.
- [ ] 1.5 **Script E. Arabic in, English out** (Batinah; M-8).
  1. As `batinah.coord`: Upload tender › T-2026-042's demo file. The steps say Arabic and name the OCR pages 15–17.
  2. As `batinah.bid`: Requirements. The English value with the Arabic source and page for each field; "Arabic text prevails (§7, p. 5)"; the Show Arabic toggle; Read in English and its label.
  3. Then Qurain T-2026-071: bilingual, with no prevailing clause.
- [ ] 1.6 **Script F. Who can see what** (Najd, and the platform; M-9).
  1. As `najd.hot`: Administration › Users & roles › View as the Procurement Lead. The margin is masked on T-2026-097 and the hero. End View as.
  2. As the Catalyst operator: the Platform Console › Request break-glass on Najd.
  3. Back as `najd.hot`: the audit log shows the request. The operator never sees a price.
- [ ] 1.7 **The two gates beyond the scripts:**
  - **DG3 in Najd:** as `najd.hot`, approve T-2025-305. It moves to Stage 8 and counts on `/stages/8` (016a 3.1).
  - **DG3 in Qurain:**
    1. As `qurain.hot`, T-2025-428 is 3 days short; Send back to Compliance.
    2. As `qurain.comp`, My requests › Open DG3 › re-issue.
    3. As `qurain.hot`, approve.
  - **Stage 3 entry:** as `corniche.hot`, DG1 Pursue on T-2026-061 › Demo › Advance to Stage 3. It appears on the Stage 3 dashboard and in Bid packs, and its pack opens. Repeat in Batinah for T-2026-042.

### Phase 2 — The §19 acceptance list
- [ ] 2.1 **Scripts A–F without dead ends:** the result of Phase 1. Every row in Findings is Fixed or Left.
- [ ] 2.2 **No hard-coded numbers in pages.**
  - Search `src/pages/gcc/**` and `src/components/{tender,dashboard,layout}/**` for digits in JSX text and in template strings, excluding dev checks, comments, CSS values and dates in comments.
  - Each hit is either read from `src/data` or `src/domain`, or it's a unit or layout constant. Fix any typed fact; list what you checked.
- [ ] 2.3 **Every action goes through `can()`; masked data shows masked.**
  - Search pages and components for `role ===`, `.role`, `seat ===` and `cleared`.
  - Allowed:
    - the lens choice in `pages/gcc/s3/Pack.tsx` (about 59: a view, not access);
    - the team picker's filter by role in `Dg1Form.tsx` (data).
  - Anything else that decides access moves to `can()`, or goes under Findings.
  - Spot-check masking as `najd.proc` (margin, positions) and `najd.comm` (quotes).
- [ ] 2.4 **DG1 and DG2 records.** Each records who, when, what was seen and why, with overrides and reason codes.
  - DG1: the hero's record after an override (Pursue against a Discard recommendation, in a tenant where the agent says Discard, for example Corniche).
  - DG2: T-2026-097's record from 1.3.
- [ ] 2.5 **Tenant switch changes everything, and nothing leaks.** Check that:
  - switching company on `/tenders/T-2026-118` keeps the hero with that company's reading;
  - on `/dg3?tender=T-2025-305` (Najd only), switching to Corniche shows the "not in this company" state, not Najd's data;
  - a Najd action (for example a DG1 Pursue) doesn't appear in Corniche;
  - Najd's branding doesn't appear in Corniche;
  - the persona, the currency, the audit log and the supplier portal follow the company.
- [ ] 2.6 **Reset and presets.**
  - Reset this company and Reset all return the seed: check the home tiles and one gate in Najd, and that another company's actions survive "this company".
  - Each preset lands in the state its toast states, on the screen it names.
  - The preset confirmation (016b 1.3) shows only with a demo in progress.
- [ ] 2.7 **Arabic.** Every field of T-2026-042 shows the English value with its Arabic source: Requirements, Overview, Key dates, the intake queue, and the DG1 pack's dates. The 73-arabic dev-check panel passes.
- [ ] 2.8 **Stages 4–9 (DB-10).** In a GCC tenant:
  - each stage opens its dashboard;
  - no `ComingNext` placeholder can be reached from the sidebar, search or a link;
  - no Indian (legacy) screen renders: try the legacy paths in `App.tsx` directly;
  - Settings shows no Demo scope toggle.
- [ ] 2.9 **Everywhere:**
  - the "Prototype: indicative UI, illustrative data" banner shows;
  - the persona switcher is labelled as a demo control;
  - agent outputs are labelled as recommendations;
  - copy is UK English.
  - Spot-check ten screens.

### Phase 3 — The presenter runbook
- [ ] 3.1 Write `docs/07-product-design/agr-product-definition/demo-runbook.md`. Keep it short and practical.
  - **Before the meeting:**
    - Reset all;
    - a window of 1440 × 900 or larger, light theme;
    - which company and persona to start in;
    - how to set prospect branding (Administration › Branding) and undo it.
  - **One section per script (A–F), plus DG3 and Stage 3 entry:**
    - the moment it proves (one line);
    - the company and the preset to start from;
    - about how long it takes;
    - the numbered click path as walked in Phase 1, with each persona switch in bold;
    - what the prospect should notice at each step;
    - how to recover if a step goes wrong (the preset to re-start from).
  - **Combining scripts:** which order works (for example A then B then C in Najd, then D, then E), and where to reset.
- [ ] 3.2 **Known limits (don't click)**, each one line:
  - the seeded input times of T-2026-061 and T-2026-042 read before the demo's DG1 Pursue;
  - the PDF viewer doesn't highlight Arabic words;
  - the supplier's "Ask a question" is not wired;
  - break-glass access doesn't expire;
  - agent timings are simulated on a fixed clock (demo "today" is Sun 8 Mar 2026, 10:00).

  Add any "Left" finding a presenter could hit.

### Phase 4 — Bring the spec up to date
- [ ] 4.1 `s1-s3-demo-spec.md`:
  - §1 M-6: the committee members record positions and the Head of Tendering approves;
  - §17 script C: "switch to the CFO, the Technical Director and the CEO to record positions → the Head of Tendering approves Bid with conditions → audit";
  - §17 script E: tenant D (Batinah), T-2026-042, uploaded by the Tender Coordinator;
  - §19: a note under the last line that dashboards.md DB-10 supersedes it, with the rule as it now stands.
  - Link the runbook from §17.

### Phase 5 — Check
- [ ] 5.1 typecheck and build pass; `/dev/checks` has no failing row in any of the five tenants.
- [ ] 5.2 Re-walk any script touched by a fix, at the width and theme where the finding was.

## Data and derivation
No new facts, derivations or `done` keys. Fixes are listed in Findings.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] Scripts A–F, DG3 and Stage 3 entry walked at 1440 light and 1280 dark, one pass by keyboard, with no console errors. Every finding is Fixed or Left.
- [ ] §19 items 2.2 to 2.9 checked, each with what was checked.
- [ ] The runbook exists, matches the walked paths, and lists the known limits.
- [ ] Reset demo returns the app to seed.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
