# 016c — Script QA: scripts A–F run end to end, and the presenter runbook

Status: DONE (2026-09-27, reviewed) · Depends on: 016a, 016b · Can run in parallel with: none (it runs alone, so it may fix small things in any file)

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
| 1 | A·2, A·6 | najd.coord, najd.hot · 1440 · light | After both blocking fields are resolved, the hero still reads "1 · Intake · Validating", with Aisha, in the workspace header and on the Stage 1 dashboard. The seeded step only moves at DG1 | Left: moving it needs a new demo applier (validating → awaiting DG1 once no blocking field is open), a derivation rule that moves Stage 1 step counts after demo actions |
| 2 | A·4 | najd.fin · 1440 and 1280 · both | My requests table: What's asked truncated, Due cut off, Status off-screen at 1440 (016b follow-up) | Fixed (`columns/requests.cols.tsx`, `dashboard.css`): Due is two lines (date over time), What's asked and For wrap to two lines, widths trimmed; all six fit at 1440; at 1280 Status is pinned right and the middle scrolls |
| 3 | A·6 | najd.hot · 1440 · light | DG1 evidence pack starts at section "2": section 1 is the unnumbered recommendation card on the right | Fixed (`s1/Dg1.tsx`): the left column is numbered 1–7 |
| 4 | A·6 | najd.hot · 1440 · light | DG1 header shows a bare "84" beside the clock | Fixed (`s1/Dg1.tsx`): labelled "Fit" |
| 5 | A·4→A·6 | najd.hot · 1440 · light | After the Zakat renewal the DG1 pack reads fit 84.4 but the workspace Overview (and every dashboard Fit column) still read 82.4: one tender, two fits | Fixed (`domain/gcc/lifecycle.port.ts`): the port's `fitOf` reads 007a's `fitScoresFor` with the demo state; at seed it equals the stored fit, so no seed reading moves |
| 6 | A·6 | najd.hot · 1440 · light | DG1 audit detail "…should not wait.; recorded by…" when the note ends with a full stop | Fixed (`domain/gcc/dg1/decision.ts`): trailing stop trimmed before joining |
| 7 | A·1 (keyboard) | najd.hot · 1280 · dark | Reset demo and the preset confirm, opened from the Demo menu (or the persona menu's Reset demo), dropped focus to the page when they closed: the menu item that opened them had unmounted | Fixed (`layout/DemoMenu.tsx`, `layout/Header.tsx`): the menu hands focus to its button before opening the modal, so the modal returns it there |
| 8 | A·2 (keyboard) | najd.coord · 1280 · dark | Resolving a field removes its card and focus falls to the page; the next Tab continues from where the card was, so the path still works | Left: works by keyboard; moving focus to the next card is polish |
| 9 | A·4 (keyboard) | najd.fin · 1280 · dark | Esc on the credential drawer that "Open credentials" opened leaves focus on the page: it was opened by navigating from My requests, so there is no control to return to | Left: no origin control on the new page; Tab resumes at the top |
| 10 | B·1, B·4, C·2–C·5, 1.7 | najd.proc, committee, najd.hot · 1440 · light | Stage 2, Stage 3, DG2 and DG3 writes are stamped 10:00 (demo now): RFQs "Sent Sun 8 Mar, 10:00", packaging, shortlists and the best-fit override "10:00", the pack "issued 08 Mar 10:00", every DG2 position "Sun 8 Mar, 10:00" and "Decided 08 Mar 10:00", and DG3 "Decided Sun 8 Mar 10:00"; the audit log beside them runs on the minute clock (10:06, 10:08, 10:10, 10:12). Only the DG1 record already uses that clock | Left: the Stage 2 writers default `at` to NOW and `positionWrite`, `dg2Write` and `dg3Write` use `nowIso()`; passing the store's next audit time means an optional `at` on about eight writers and their call sites, with Stage 2, Stage 3, DG3 and presenter dev-check readings to re-check. Listed in the runbook's known limits |
| 11 | B·1 | najd.proc · 1440 · light | "1 NCRs in 12 months" on the shortlist and supplier cards | Fixed (`s2/Shortlists.tsx`, `s2/Suppliers.tsx`): `plural()` |
| 12 | B·1 | najd.proc · 1440 · light | RFQ audit detail "…Lusitania Bombas S.A.. Reply by…" when the last supplier's name ends with a full stop (same in the shortlist entry) | Fixed (`domain/gcc/s2/rfq.ts`, `s2/shortlist.ts`) |
| 13 | B·4 | najd.proc · 1440 · light | Best-fit override: "Reasons (pick at least one, or write a note)" above "Note (required)" | Fixed (`tender/ReasonCodePicker.tsx`): "Note (or pick a reason above)" until a reason is picked |
| 14 | B·5 | najd.proc → supplier · 1440 · light | Persona toast "…Gulf Process Systems Co.. Demo control" | Fixed (`layout/Header.tsx`, `platform/PlatformShell.tsx`, `supplier/SupplierPortal.tsx`) |
| 15 | B·2 | najd.proc · 1440 · light | Advance agent work brings the hero's 13 scripted replies but no nudge or escalation: the hero's replies are due 30 Mar, so none is overdue on demo day | Left: by design. The nudges and escalations are on T-2026-104 (4 overdue, 2 escalated); the runbook shows them there |
| 16 | C·1 | najd.bid · 1440 · light | Pack 9.7: "…for 7 of 9 packages." followed by a tag reading "two packages re-quoting" | Fixed (`s3/sections/Risks.tsx`): the tag starts with a capital; the sentence form ("; two packages…") is unchanged |
| 17 | C·4 | najd.hot · 1440 · light | DG2 confirm, "The record will say": the second line repeated "Faisal Al-Harbi on pack v2" from the first | Fixed (`dg2/DecisionBar.tsx`): the second line is the audit detail after its first segment, as 016b did for DG3 |
| 18 | D·1 (keyboard) | najd.hot · 1280 · dark | The workspace's Compare tenants link was announced "DemoCompare tenants" (the chip and the label run together) | Fixed (`workspace/WorkspaceHeader.tsx`): `aria-label="Compare tenants (demo view)"` |
| 19 | D·3, 2.5 | najd.hot · 1280 · dark | The company switcher always went to the home page, so switching company on `/tenders/T-2026-118` lost the hero (and 2.5's "not in this company" check on `/dg3?tender=` could not happen) | Fixed (`domain/tenancy.ts`): on a tender's own page (the workspace or a `?tender=` desk or gate) the page stays when the new company is a GCC one; the tender re-reads for that company or says it is not there. Everything else still lands on the home page, and a switch to the Indian preview always does |
| 20 | E·1 | batinah.coord · 1440 · light | Batinah's upload modal lists "T-2026-041 · Jezzine Entrance road rehab (Lot 3, CDR)", the Lebanese tender that left the demo path (wave 3 decision); it is a Batinah seed row with its radar capture and a queue item | Left: removing it changes Batinah's seed and dev-check targets. The runbook says to use T-2026-042 only |
| 21 | F·2 | platform · 1440 · light | Platform Console: "one tenant, read only,4 hours at most" (JSX dropped the space before the expression) | Fixed (`platform/Console.tsx`) |
| 22 | F·2 | platform · 1440 · light | Break-glass toast "Request sent to Najd Arcline Contracting Co.. Faisal…" | Fixed (`platform/Console.tsx`): `nameStop` |
| 23 | F·3 | najd.hot · 1440 · light | A reason ending with a full stop read "…its login.. Second approver" in the audit entry and "…login.”." in the audit log's callout | Fixed (`domain/platform/breakglass.ts`, `gcc/admin/AuditLog.tsx`) |
| 24 | Orchestrator 2a · 2.6 | najd.proc, najd.coord · 1440 · light | A preset could land on a page the persona can't open: "Start: DG1 due" as Joseph Mathew (Procurement Lead) landed on "This page isn't part of your role"; the same for RFQs out and DG2 committee as the Coordinator | Fixed (`layout/DemoMenu.tsx`, `useStartPreset`): when the persona lacks the landing screen's capability (`SCREENS[path].cap`), the preset switches to the tenant's Head of Tendering and the toast adds "DG1 decisions isn’t part of Joseph Mathew’s role, so you now act as Faisal Al-Harbi, Head of Tendering. Demo control". As the Head of Tendering nothing changes. The switch is the ordinary persona switch, audited as a demo control |
| 25 | Orchestrator 2b | najd.proc, corniche.proc, qurain.proc · 1440 · light | The P-04 approved-list slip (016a 4.1) was also on T-2026-104 P-03 (Sahara Clearwater, Tamarisk) and P-06 (Weser), Corniche T-2026-044 P-01 and P-02 (Tilal Thermal, Warsan Thermal) and Qurain T-2026-058 P-01 (Hokuriku Shield, Taihu Shield): suppliers sent an RFQ on a package that needs the client's approved list, but not on it | Fixed (`data/gcc/s2/suppliers/najd.ts`, `corniche.ts`, `qurain.ts`): the issuer (GCIU, ECUC, SGSA) added to those seven suppliers' approved lists. No screen or script uses the gap. Every supplier sent an RFQ on those packages now reads "On the client’s approved list"; the only "needs approval" rows left were never sent one (Lumenza, blocked by screening; Nafud). Dev checks in all five tenants read exactly as before (only the load time moved) |
| 26 | Orchestrator 2c | najd.bid · 1440 · light | The Bid Manager (`see.quotes.summary`, no `see.quotes`) sees the levelled total beside "VAT 15% removed", an exchange rate, a freight and duty percentage or an allowance percentage, so could work back to the quoted price | Fixed (`s2/LevelQuote.tsx`): without `see.quotes` a money adjustment is named without its rate, amount or share ("VAT removed: shown excluding VAT", "Freight and any customs duty added…", "Demo bid exchange rate"), in the side-by-side trace, the adjustment list and the package comparison's trace. With `see.quotes` (Procurement, Pricing, Head of Tendering) nothing changes |
| 27 | 1.7 DG3 (keyboard) | najd.hot · 1280 · dark | After Approve submission, the decision bar gives way to the record and focus falls to the page (as finding 8) | Left: works by keyboard, the next Tab starts at the top; moving focus to the new record is polish |
| 28 | 1.7 DG3, C·4 | najd.hot, qurain.hot · 1280 · dark | Decision toasts reuse the first effect, a list item without a full stop: "Submission approved. Omar Siddiqui assembles the bid and submits it" (also DG3 send-back and DG2 No-Bid) | Fixed (`dg3/DecisionPanel.tsx`, `dg3/SendBack.tsx`, `dg2/DecisionBar.tsx`): the toast ends with a full stop |
| 29 | 2.4 (A·6 in Corniche) | corniche.hot · 1440 · light | Where the agent recommends discard, the verdict label "Recommend discard" doubled up: "The agent recommends Recommend discard" (DG1 override callout) and "The agent recommends: Recommend discard." (Start: DG1 due toast in Corniche and Batinah) | Fixed (`s1/parts/Dg1Form.tsx`, `demo/presets/dg1-due.preset.ts`): both read "The agent recommends: Discard"; Pursue verdicts read as before |
| 30 | 2.7 | batinah.bid · 1440 · light | T-2026-042's Overview and DG1 pack dates show the English value with a page chip into the Arabic document (p. 17 noted as OCR), but not the Arabic quotation; the Arabic source text shows in Requirements (with Show Arabic), Key dates and the intake queue | Left: showing the Arabic quotation there is a new display fed through the Overview and DG1 view models, more than a small fix. The runbook shows Arabic on Requirements and Key dates |
| 31 | 2.5 | najd.hot · 1440 · light | Branding toasts had no closing full stop ("…Every page shows it now") | Fixed (`admin/Branding.tsx`) |

## Steps

### Phase 1 — Walk the six scripts
For each script:
- start from **Reset all**, at 1440 × 900, light;
- walk it through as the listed personas;
- walk it again at 1280 × 800, dark;
- on one of the two passes, use only the keyboard for the main path: Tab order, visible focus, Esc closes sheets and modals and focus returns.

Watch the console throughout.

- [x] 1.1 **Script A. From portal to Pursue** (Najd; "Start: morning intake"; M-1, M-2, M-3).
  1. As `najd.hot`: the home, then Tender radar. The hero, captured from Etimad this morning. The booklet purchase requested by the Coordinator and approved by a person.
  2. As `najd.coord`: the intake steps for the hero, then the intake queue. The two fields, including the initial guarantee's 1% vs 2% conflict; resolve both.
  3. As `najd.hot`: the hero's Eligibility tab. Zakat and GOSI at risk; the turnover-years interpretation; Request renewal on Zakat.
  4. The renewal loop: as `najd.fin`, My requests › Open credentials › Upload renewal. Back as `najd.hot`: the line passes, and "Credentials at risk" has dropped by one.
  5. The Queries tab: the drafted queries (VAT; turnover years).
  6. DG1 on `/dg1?tender=T-2026-118`: Pursue with the team. The RFQ clock starts.
- [x] 1.2 **Script B. Quotes without chasing** (Najd; "Start: RFQs out"; M-4).
  1. As `najd.proc`: the hero's packages, a shortlist where screening blocks one supplier, then the RFQs sent.
  2. Demo › Advance agent work: the scripted replies, the nudges and an escalation.
  3. Levelling: VAT, EUR, ex-works, validity and exclusions, each with its trace.
  4. Best fit, with an override and its reason.
  5. The Supplier Portal preview, as the supplier.
  6. As `najd.bid`: the levelled totals show and the original prices are masked (016a 2.5).
- [x] 1.3 **Script C. The committee decides** (Najd; "Start: DG2 committee" on T-2026-097; M-5, M-6).
  1. As `najd.bid`: the pack. Win probability with its range and drivers, competitors with sources, bond and facility exposure, the capacity clash, the margin range. It was re-run on the addendum and issued.
  2. As `najd.member.cfo` and `najd.member.technical`: record positions.
  3. As `najd.exec`: record the CEO's position as a member.
  4. As `najd.hot`: approve Bid with conditions on `/dg2?tender=T-2026-097`.
  5. The record (who, when, what was seen, why) and the audit log.
- [x] 1.4 **Script D. Same tender, five companies** (all five tenants; M-7).
  1. As `najd.hot`, the hero workspace › Compare tenants. The five columns give five different answers.
  2. Open each column: the company switches, and the hero opens in that company with its own eligibility, fit and team load.
  3. Switch back with the company switcher.
- [x] 1.5 **Script E. Arabic in, English out** (Batinah; M-8).
  1. As `batinah.coord`: Upload tender › T-2026-042's demo file. The steps say Arabic and name the OCR pages 15–17.
  2. As `batinah.bid`: Requirements. The English value with the Arabic source and page for each field; "Arabic text prevails (§7, p. 5)"; the Show Arabic toggle; Read in English and its label.
  3. Then Qurain T-2026-071: bilingual, with no prevailing clause.
- [x] 1.6 **Script F. Who can see what** (Najd, and the platform; M-9).
  1. As `najd.hot`: Administration › Users & roles › View as the Procurement Lead. The margin is masked on T-2026-097 and the hero. End View as.
  2. As the Catalyst operator: the Platform Console › Request break-glass on Najd.
  3. Back as `najd.hot`: the audit log shows the request. The operator never sees a price.
- [x] 1.7 **The two gates beyond the scripts:**
  - **DG3 in Najd:** as `najd.hot`, approve T-2025-305. It moves to Stage 8 and counts on `/stages/8` (016a 3.1).
  - **DG3 in Qurain:**
    1. As `qurain.hot`, T-2025-428 is 3 days short; Send back to Compliance.
    2. As `qurain.comp`, My requests › Open DG3 › re-issue.
    3. As `qurain.hot`, approve.
  - **Stage 3 entry:** as `corniche.hot`, DG1 Pursue on T-2026-061 › Demo › Advance to Stage 3. It appears on the Stage 3 dashboard and in Bid packs, and its pack opens. Repeat in Batinah for T-2026-042.

### Phase 2 — The §19 acceptance list
- [x] 2.1 **Scripts A–F without dead ends:** the result of Phase 1. Every row in Findings is Fixed or Left.
- [x] 2.2 **No hard-coded numbers in pages.**
  - Search `src/pages/gcc/**` and `src/components/{tender,dashboard,layout}/**` for digits in JSX text and in template strings, excluding dev checks, comments, CSS values and dates in comments.
  - Each hit is either read from `src/data` or `src/domain`, or it's a unit or layout constant. Fix any typed fact; list what you checked.
- [x] 2.3 **Every action goes through `can()`; masked data shows masked.**
  - Search pages and components for `role ===`, `.role`, `seat ===` and `cleared`.
  - Allowed:
    - the lens choice in `pages/gcc/s3/Pack.tsx` (about 59: a view, not access);
    - the team picker's filter by role in `Dg1Form.tsx` (data).
  - Anything else that decides access moves to `can()`, or goes under Findings.
  - Spot-check masking as `najd.proc` (margin, positions) and `najd.comm` (quotes).
- [x] 2.4 **DG1 and DG2 records.** Each records who, when, what was seen and why, with overrides and reason codes.
  - DG1: the hero's record after an override (Pursue against a Discard recommendation, in a tenant where the agent says Discard, for example Corniche).
  - DG2: T-2026-097's record from 1.3.
- [x] 2.5 **Tenant switch changes everything, and nothing leaks.** Check that:
  - switching company on `/tenders/T-2026-118` keeps the hero with that company's reading;
  - on `/dg3?tender=T-2025-305` (Najd only), switching to Corniche shows the "not in this company" state, not Najd's data;
  - a Najd action (for example a DG1 Pursue) doesn't appear in Corniche;
  - Najd's branding doesn't appear in Corniche;
  - the persona, the currency, the audit log and the supplier portal follow the company.
- [x] 2.6 **Reset and presets.**
  - Reset this company and Reset all return the seed: check the home tiles and one gate in Najd, and that another company's actions survive "this company".
  - Each preset lands in the state its toast states, on the screen it names.
  - The preset confirmation (016b 1.3) shows only with a demo in progress.
- [x] 2.7 **Arabic.** Every field of T-2026-042 shows the English value with its Arabic source: Requirements, Overview, Key dates, the intake queue, and the DG1 pack's dates. The 73-arabic dev-check panel passes.
- [x] 2.8 **Stages 4–9 (DB-10).** In a GCC tenant:
  - each stage opens its dashboard;
  - no `ComingNext` placeholder can be reached from the sidebar, search or a link;
  - no Indian (legacy) screen renders: try the legacy paths in `App.tsx` directly;
  - Settings shows no Demo scope toggle.
- [x] 2.9 **Everywhere:**
  - the "Prototype: indicative UI, illustrative data" banner shows;
  - the persona switcher is labelled as a demo control;
  - agent outputs are labelled as recommendations;
  - copy is UK English.
  - Spot-check ten screens.

### Phase 3 — The presenter runbook
- [x] 3.1 Write `docs/07-product-design/agr-product-definition/demo-runbook.md`. Keep it short and practical.
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
- [x] 3.2 **Known limits (don't click)**, each one line:
  - the seeded input times of T-2026-061 and T-2026-042 read before the demo's DG1 Pursue;
  - the PDF viewer doesn't highlight Arabic words;
  - the supplier's "Ask a question" is not wired;
  - break-glass access doesn't expire;
  - agent timings are simulated on a fixed clock (demo "today" is Sun 8 Mar 2026, 10:00).

  Add any "Left" finding a presenter could hit.

### Phase 4 — Bring the spec up to date
- [x] 4.1 `s1-s3-demo-spec.md`:
  - §1 M-6: the committee members record positions and the Head of Tendering approves;
  - §17 script C: "switch to the CFO, the Technical Director and the CEO to record positions → the Head of Tendering approves Bid with conditions → audit";
  - §17 script E: tenant D (Batinah), T-2026-042, uploaded by the Tender Coordinator;
  - §19: a note under the last line that dashboards.md DB-10 supersedes it, with the rule as it now stands.
  - Link the runbook from §17.

### Phase 5 — Check
- [x] 5.1 typecheck and build pass; `/dev/checks` has no failing row in any of the five tenants.
- [x] 5.2 Re-walk any script touched by a fix, at the width and theme where the finding was.

## Data and derivation
No new facts, derivations or `done` keys. Fixes are listed in Findings.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] Scripts A–F, DG3 and Stage 3 entry walked at 1440 light and 1280 dark, one pass by keyboard, with no console errors. Every finding is Fixed or Left.
- [x] §19 items 2.2 to 2.9 checked, each with what was checked.
- [x] The runbook exists, matches the walked paths, and lists the known limits.
- [x] Reset demo returns the app to seed.

## Execution report
(Filled in by the executor.)
- **Changed files** (small fixes, each tied to a row in Findings; several of these files also carry 016a/016b edits, which were kept):
  - Dashboard kit: `components/dashboard/columns/requests.cols.tsx`, `components/dashboard/dashboard.css` (2).
  - Top bar and menus: `components/layout/DemoMenu.tsx` (7, 24; the orchestrator's `useStartPreset` branding and `inProgress` changes kept), `components/layout/Header.tsx` (7, 14), `pages/platform/PlatformShell.tsx` and `pages/gcc/supplier/SupplierPortal.tsx` (14), `domain/tenancy.ts` (19).
  - Stage 1 and DG1: `pages/gcc/s1/Dg1.tsx` (3, 4), `domain/gcc/lifecycle.port.ts` (5), `domain/gcc/dg1/decision.ts` (6), `pages/gcc/s1/parts/Dg1Form.tsx` and `domain/gcc/demo/presets/dg1-due.preset.ts` (29).
  - Stage 2: `pages/gcc/s2/Shortlists.tsx`, `pages/gcc/s2/Suppliers.tsx` (11), `domain/gcc/s2/rfq.ts`, `domain/gcc/s2/shortlist.ts` (12), `components/tender/ReasonCodePicker.tsx` (13), `pages/gcc/s2/LevelQuote.tsx` (26), `data/gcc/s2/suppliers/najd.ts`, `corniche.ts`, `qurain.ts` (25).
  - Stage 3 and gates: `pages/gcc/s3/sections/Risks.tsx` (16), `pages/gcc/dg2/DecisionBar.tsx` (17, 28), `pages/gcc/dg3/DecisionPanel.tsx`, `pages/gcc/dg3/SendBack.tsx` (28), `pages/gcc/workspace/WorkspaceHeader.tsx` (18).
  - Platform and admin: `pages/platform/Console.tsx` (21, 22), `domain/platform/breakglass.ts`, `pages/gcc/admin/AuditLog.tsx` (23), `pages/gcc/admin/Branding.tsx` (31).
  - Docs: `docs/07-product-design/agr-product-definition/demo-runbook.md` (new), `docs/07-product-design/agr-product-definition/s1-s3-demo-spec.md` (§1 M-6, §17 intro link and scripts C and E, §19 ticks and notes).
  - Plans: this file and the 016c row in `plans/README.md`. The 016a and 016b plan files were not touched.
- **Verification:**
  - Harness: Playwright (headless Chromium) on my own dev server at port 5188, with a persistent profile so demo state carries between steps, reading the rendered text, focus and console. Screenshots checked by eye where a check was visual (focus rings on `::after`, dark theme).
  - Phase 1: scripts A–F, DG3 (Najd and Qurain) and Stage 3 entry (Corniche and Batinah) walked from Reset all at 1440 × 900 light and 1280 × 800 dark, each with one keyboard pass (A, B, C, D, DG3 by keyboard). Console clean on every run; no horizontal scroll at 1280.
  - 2.1: every Findings row is Fixed or Left.
  - 2.2: searched `pages/gcc/**` and `components/{tender,dashboard,layout}/**` (dev checks and the dev kit excluded) for digits in JSX text, in template strings and in numeric props. Every hit is a gate name (DG1…), a unit ("of 100", "24 h" in the dev kit only), a derived count, a layout constant (sizes, rows, the 100% capacity line, the Dg1 section numbers), a split label ("part 1") or a comment. No typed fact.
  - 2.3: searched pages and components for `role ===`, `.role`, `seat ===`, `cleared`. Access-deciding hits: only the two allowed (`s3/Pack.tsx` lens; `Dg1Form.tsx` team picker). `s1/Radar.tsx` pairs `can('see.restricted')` with the person's `cleared` flag, the same rule `can()` applies per tender. The rest are display (a person's role title), data lookups (`PositionForm` seat) or the Indian preview's `canSee` (out of scope). Masking spot-check: as `najd.proc`, the margin and committee positions are masked on T-2026-097 and the pack and DG2 are closed; as `najd.comm`, margin and quotes show, positions are masked, DG2 is closed; as `najd.bid`, levelled totals show and quoted prices and adjustment rates are masked (26).
  - 2.4: DG1 override in Corniche on the hero (Pursue against "Discard", as Rania Khoury, delegate, note ending in a full stop): the record shows who, when, what the pack showed, the note and "went against it; both are kept"; the audit detail reads cleanly (fix 6). DG2 record of T-2026-097 checked in 1.3 (positions, quorum, conditions, pack version, audit).
  - 2.5: switching company on the hero keeps the page and re-reads it (19); `/dg3?tender=T-2025-305` in Corniche shows "No DG3 for T-2025-305 here"; Corniche's DG1 Pursue on the hero does not appear in Najd; Najd's prospect branding does not appear in Corniche; persona, currency (SAR vs AED), audit log and Supplier Portal (only Corniche's RFQs) follow the company.
  - 2.6: Reset this company clears Najd (branding too) and keeps Corniche's DG1; Reset all clears every company and the Najd home reads as seed. Each preset lands on the screen its toast names, in the state it states; RFQs out and DG2 committee give their reasons where unavailable. The preset confirmation shows only with demo activity (not after Reset all, not for branding alone); presets keep branding.
  - 2.7: T-2026-042 shows the Arabic source on Requirements (with Show Arabic sources), Key dates and the intake queue; the Overview and DG1 pack dates give page chips into the Arabic document (30, Left). 73-arabic passes.
  - 2.8: `/stages/4`…`/stages/9` open their dashboards; every screen in `SCREENS` is built, so `ComingNext` cannot render, and every sidebar entry opens a built screen; the legacy paths (`/pipeline`, `/workflow`, `/agents`, `/submission`, `/library`, `/intake`, `/intake/:id`, `/boq`, `/dashboard/:role`) land on the GCC home; `/suppliers` opens the GCC Suppliers screen. Settings shows a read-only "Demo scope" line and no toggle.
  - 2.9: on 13 screens at 1280 dark (home, radar, intake queue, screening, DG1, sourcing, levelling, pack, DG2, DG3, Company, workspace, Stage 5) the prototype banner shows, the persona switcher is labelled a demo control, agent outputs carry "Recommendation, not a decision" or name their agent, and no page scrolls sideways. US spellings searched in copy: none (only code, CSS, and an official body's proper name).
  - Phase 5: `npm --prefix app run typecheck` and `run build` pass (the chunk-size warning is as before). `/dev/checks` in all five tenants: no failing row; readings identical to the run before 25 (only load times move). Fixes 24–31 re-walked where found (presets as Procurement and the Coordinator; shortlists in Najd, Corniche and Qurain; levelling as Omar and Joseph; DG3 and send-back toasts at 1280 dark; Corniche's DG1 due; branding toasts). Finished with Reset all.
- **Deviations from plan:**
  - 1.2 step 2: the hero's scripted replies bring no nudge or escalation on demo day (15, Left); the runbook shows them on T-2026-104.
  - Three extra findings from the orchestrator's review (2a, 2b, 2c) are rows 24, 25 and 26. 25 changes seed data (seven suppliers' approved lists) with no dev-check target moving.
  - The spec's §19 boxes are ticked, except Arabic (see 30) and the superseded last line, which carries the DB-10 note.
  - The runbook calls the platform persona "the platform operator" (the Platform group in the persona menu) rather than naming the client.
- **Blockers / questions:** none. For decision: the Left rows 1, 10 and 30 (each needs more than a small fix), and 20 (a Batinah seed row).
- **Follow-ups noticed (not done):**
  - Spec §3 still calls the CEO the gate chair ("Executive Sponsor (CEO; chairs the Bid Committee) … gate chair"); since the replan the Head of Tendering approves DG2. §17 script C keeps "win probability 58 ± 8", a copied figure.
  - After "Advance to Stage 3" as the Head of Tendering, the toast says the pack "is ready to issue to the committee", but issuing is the Bid Manager's action; the runbook says so.
  - Nour's My requests tile has an accessible name ending "opening.. Show these tenders" (a double full stop in an aria-label).
  - The Settings "Demo scope" line says GCC companies "run Stage 1 to Stage 3 only", which reads oddly beside DB-10's Stage 4–9 dashboards.
  - Findings 8, 9 and 27 (focus falling to the page after a card resolves or a gate is decided) could share one small focus-management helper.
