# 016b — Polish: the top bar, the dashboard kit, workspace and gate screens

Status: READY · Depends on: waves 1–5 (all in `gcc-demo`, commit 5ee38b8) · Can run in parallel with: 016a · Before: 016c

## Goal
Nothing on screen looks unfinished to a prospect:
- The top bar holds its title and the company name at 1280 and 1440.
- Dashboard tables fit their rows, and the stage chips are clean.
- A row in My requests opens what it asks for.
- A preset asks before it wipes a demo in progress.
- Arabic file names read in the Arabic font.
- Small wording slips in the workspace, the upload, search and the gate screens are gone.

These items were found in earlier reviews and left for this plan.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Fix, don't build.** Layout, copy and wiring fixes on existing screens. No new screens, capabilities, `done` keys or libraries.
- **No rule changes.** Counts, masking rules and derivations are plan 016a's this wave. If a fix here would move a dev-check target, stop and ask.
- **Stay in your files** (Scope). If a fix needs a file outside your list, stop and ask.
- **Each item is small.** If one turns out bigger than about 30 lines, write it under Blockers and move on.

## Context
- Why: spec §19 (scripts A–F at 1440 and 1280, both themes, no dead ends); ui-direction (copy rules, definition of done for a screen); dashboards.md DB-13 (less empty space).
- The orchestrator's carry-lists: `app/plans/README.md`, "Wave 3 review", "Wave 4 review" and "Wave 5 review".
- Line numbers below were read on 2026-09-27. Re-read each file before editing.
- Personas are `{tenant}.{role}` (`src/data/people.ts`). For example:
  - `najd.hot` is Faisal Al-Harbi (Head of Tendering), `najd.coord` Aisha Al-Qahtani, `najd.bid` Omar Siddiqui, `najd.comm` Tarek Haddad (Commercial Manager);
  - `batinah.coord` is Shamsa Al-Hinai;
  - `qurain.comp` is Nour El-Din.
- Run your own dev server: `npm --prefix app run dev -- --port 5187 --strictPort`. Don't touch 5173 (the orchestrator's) or 5186 (016a's).

## Scope
**Files to change (only these):**
- **The shell:**
  - `src/components/layout/TenantSwitch.tsx`, `Header.tsx`, `GccSearch.tsx`, `DemoMenu.tsx`;
  - `src/styles/components.css`, `src/styles/layout.css`, and `src/styles/tokens.css` (the two font stacks only);
  - `src/pages/gcc/screens.ts` (`screenHead` only);
  - `src/state/store.tsx` (one `ModalSpec` case only), `src/components/overlays/Modals.tsx`.
- **The dashboard kit:**
  - `src/components/dashboard/columns/base.cols.tsx`, `columns/requests.cols.tsx`;
  - `src/components/dashboard/dashboard.css`, `grid/TenderGrid.tsx`, `chart/StageChart.tsx`, `DashboardPage.tsx`;
  - `src/domain/gcc/actions/requests.actions.ts` (export the route only);
  - `src/domain/gcc/viewmodels.ts` and `src/domain/gcc/dashboards/build.ts`, only if the request row needs its route.
- **The workspace and Stage 1:**
  - `src/pages/gcc/workspace/WorkspaceHeader.tsx`, `src/domain/gcc/workspace/header.ts`, `src/pages/gcc/workspace/Rail.tsx`;
  - `src/pages/gcc/workspace/tabs/documents.tab.tsx`, `tabs/bid-decision.tab.tsx`;
  - `src/pages/gcc/s1/UploadGcc.tsx`.
- **Company and the gates:** `src/pages/gcc/company/Credentials.tsx`, `src/pages/gcc/dg3/DecisionPanel.tsx`, `src/pages/gcc/dg2/PositionForm.tsx`.

**Out of scope** (stop and ask):
- anything plan 016a owns:
  - `domain/gcc/actions/portfolio.actions.ts`, `stages.actions.ts`, `lifecycle.port.ts`, `kpi/**`;
  - `domain/gcc/s1/**`, `s2/**`, `s3/**`, `workspace/audit.ts`, `demo/**`;
  - `pages/gcc/s1/Screening.tsx`, `pages/gcc/s2/**`;
  - `pages/gcc/workspace/tabs/dates.tab.tsx`, `pages/gcc/s1/parts/KeyDateList.tsx`;
  - `data/**`, and every dev check;
- Arabic highlighting in the PDF viewer (a known limit);
- new capabilities, `done` keys or libraries; the Indian world.

## Steps

### Phase 1 — The top bar and the shell
- [ ] 1.1 **The top bar at 1280 and 1440.**
  - Today:
    - at 1280 the company switcher shows only its mark (`TenantSwitch.tsx` about 46, `.hide-md` in `components.css` about 290), so the prospect's branded name disappears;
    - at 1280 the page title truncates;
    - at 1440 the Head of Tendering's bar can wrap.
  - Make it hold at both widths:
    - the company name (or the branding display name) always shows, capped at about 110 px with an ellipsis at 1280, and its full text in `title`;
    - at 1280 or less the search pill may collapse to an icon button (with `aria-label`; ⌘K still works);
    - nothing is removed from the bar.
  - (acceptance: as `najd.hot`, the Head of Tendering, whose bar is the fullest with Upload:
    - on `/tenders/T-2026-118`, `/dg3`, `/sourcing` and `/demo/compare`, at 1280 and 1440, light and dark: the title reads whole, nothing wraps, and the company name shows;
    - the same with a branding display name set in `/admin/branding`.)
- [ ] 1.2 **The Compare tenants title.** Move `Header.tsx` about 35 (`/demo/compare`) into `screenHead` in `screens.ts` as a special case, like `/requests`. No route, no `SCREENS` entry. (acceptance: `/demo/compare` still reads "Compare tenants" with its sub-line.)
- [ ] 1.3 **A preset asks before it clears a demo in progress** (`DemoMenu.tsx` about 95 applies it straight away).
  - When the company has demo activity (any `done` key or audit entry for this tenant), a confirm names what happens: "Start from 'DG1 due'? This first resets Najd Arcline Contracting Co.: the actions recorded in this demo are cleared."
  - Add it as a `ModalSpec` case beside `ResetModal` (`store.tsx` about 22–34, `Modals.tsx` about 228–245). With no activity, the preset runs at once, as now.
  - (acceptance: after one action in Najd, Demo › Start: DG1 due asks first; Cancel keeps the action; confirming runs the preset. Straight after Reset it doesn't ask.)
- [ ] 1.4 **Search "First 8"** (`GccSearch.tsx` about 29 and 102).
  - The count is taken after the cut, so exactly 8 matches says "First 8" and the real total never shows.
  - Return the full count with the cut list, and read "8 of 23 matches". When everything shows, read "N matches".
  - (acceptance: ⌘K, "T-2026" in Najd.)

### Phase 2 — The dashboard kit
- [ ] 2.1 **Grey boxes in the Stage column.**
  - The tender table's stage cell uses the class `stage-chip` (`base.cols.tsx` about 131–140). That class collides with the legacy `.stage-chip` in `styles/pages.css` about 7–12 (border, card shadow, scale on press), and `dashboard.css` about 237 overrides only part of it.
  - Rename the dashboard's class (for example `tk-stage`) in both files. Leave `pages.css` alone.
  - (acceptance: `/` Table at 1280 and 1440, light and dark: no border or shadow on the stage cells; check the computed style.)
- [ ] 2.2 **Tables fit their rows** (`dashboard.css` about 214: `.tg-grid` is a fixed 40 + 10 × 40 px; `--tg-hscroll` is never set).
  - Size the grid to its rows: header plus `clamp(rows, 3, 10)` × row height plus the scroll gutter, set inline from `TenderGrid.tsx` (the row count is about 176).
  - Keep a minimum height for the empty overlay.
  - (acceptance: as `corniche.hot`, `/stages/3` Table shows no band of blank rows. As `najd.hot`, `/` still shows 10 rows with a scroll.)
- [ ] 2.3 **The Weighted empty line shows twice** (`StageChart.tsx` about 140 and 144–150: the caption note and the empty state print the same sentence). Show it once, in the empty state. (acceptance: as `corniche.hot`, `/`, Graph › Weighted.)
- [ ] 2.4 **A row in My requests opens what it asks for.**
  - Today a row click does nothing, and only the action button routes (`DashboardPage.tsx` about 112–113 opens tenders only; `requests.cols.tsx` about 38).
  - A click or Enter on a request row goes where its primary action goes:
    - export the route of `primaryOf` in `requests.actions.ts` (about 18–32) as a pure function, and use it for the row;
    - the Tender cell's link keeps opening the tender.
  - (acceptance: as `najd.comm` after Omar's Request estimate, a row click opens the input form. As `najd.fin` with a renewal requested, it opens the credential in Company.)

### Phase 3 — Workspace, upload and Company
- [ ] 3.1 **"With nobody now" on closed tenders** (`WorkspaceHeader.tsx` about 73; the VM `domain/gcc/workspace/header.ts` about 144 has no live flag).
  - Add `closed` (or `live`) to the VM.
  - A closed tender reads its outcome ("Discarded at DG1", "Lost", "Won") instead of an owner line. A live tender with no owner keeps "With nobody now".
  - (acceptance: as `najd.hot`, `/tenders/T-2026-019`, a discarded tender.)
- [ ] 3.2 **Rail key dates read like the Dates tab** (`Rail.tsx` about 141: "in 2 d · 1 wd").
  - Use `countdownText` from `domain/calendar.ts` (about 97) with the tenant's country code, the same as `KeyDateList.tsx` about 49.
  - (acceptance: as `najd.hot`, the hero's rail and its Key dates tab read the same countdowns.)
- [ ] 3.3 **Upload doesn't reveal a tender the viewer can't open** (`UploadGcc.tsx`: `canOpen` about 89 gates only the Open button; the "Recognised" callout about 144–151, the intake steps, and the demo file list about 47–57 still show).
  - Gate the callout, the steps and the demo file list on `canOpen`.
  - A recognised file the viewer can't open reads "Logged to the register. It is outside your role", with no ID or title.
  - (acceptance: as `najd.coord`, the demo files list has no restricted tender; as `najd.hot`, cleared, unchanged.)
- [ ] 3.4 **Arabic file names in the Arabic font.**
  - In `tokens.css`, add `'IBM Plex Sans Arabic'` after `'IBM Plex Sans'` in `--font-sans`, and after `'IBM Plex Mono'` in `--font-mono`. Latin text keeps its fonts.
  - Wrap file names in `<bdi dir="auto">` in the Documents list (`documents.tab.tsx` about 111) and the upload modal (`UploadGcc.tsx` about 110).
  - In the toast string (about 71), wrap the name in U+2068 and U+2069 (first-strong isolate) so the order holds.
  - (acceptance: as `batinah.coord`, upload T-2026-042's demo file; the modal title, the toast and the Documents list show the Arabic name in Plex Sans Arabic, in the right order.)
- [ ] 3.5 **The Documents card shows the Arabic title** (`documents.tab.tsx` about 90 shows only "Tender document {ref}").
  - For a record with an Arabic title (`readingOf(record).titleAr`, `domain/gcc/arabic/reading.ts` about 88–92), show it with `lang="ar" dir="rtl"` above the English working title, as `ReadInEnglish.tsx` about 59 does.
  - (acceptance: Batinah, `/tenders/T-2026-042?tab=documents`; Najd's hero card unchanged.)
- [ ] 3.6 **"Requested by you" in the credential panel** (`Credentials.tsx` about 108). When the viewer made the renewal request, read "Requested by you". (acceptance: as `najd.hot` after Request renewal on Zakat.)
- [ ] 3.7 **The Bid / No-Bid tab for the Commercial Manager** (`bid-decision.tab.tsx`).
  - Check as `najd.comm` on T-2026-097: the tab should mask only what `see.margin` and `see.positions` hide. The decision, its date and its conditions are not confidential.
  - If more is masked, narrow it to those capabilities. If it is already right, write that and tick.

### Phase 4 — The gates
- [ ] 4.1 **The DG3 confirm repeats the name** (`DecisionPanel.tsx` about 119–120: "Approved for submission, by Faisal Al-Harbi, Sun 8 Mar 10:00, round 1." then the audit detail, which starts "Faisal Al-Harbi, round 1 · …").
  - Render the evidence part only on the second line ("Evidence: 7 checks passed, 1 for information"), plus the note when there is one. Take it from the preview, not typed.
  - (acceptance: as `najd.hot`, `/dg3?tender=T-2025-305` › Approve submission.)
- [ ] 4.2 **DG2 position choices by keyboard** (`PositionForm.tsx` about 105–107: the segments move with Tab, not the arrow keys).
  - Make the group a radio group with a roving `tabindex`: Tab enters, the arrows move, and Space or Enter selects.
  - (acceptance: as `najd.member.cfo` on `/dg2?tender=T-2026-097` after the DG2 committee preset.)

### Phase 5 — Check
- [ ] 5.1 typecheck and build pass; `/dev/checks` has no failing row in any of the five tenants. None of your changes should move a target.
- [ ] 5.2 Each acceptance above at 1440 and 1280, light and dark, with no console errors; the keyboard reaches each new control. Reset demo returns each to seed.

## Data and derivation
No new facts, derivations or `done` keys. The request route is the existing `primaryOf`, exported.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] Every acceptance line in Phases 1–4, with no console errors.
- [ ] Reset demo returns the app to seed.
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
