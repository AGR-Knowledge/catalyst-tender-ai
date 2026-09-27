# 016b — Polish: the top bar, the dashboard kit, workspace and gate screens

Status: DONE (2026-09-27, reviewed) · Depends on: waves 1–5 (all in `gcc-demo`, commit 5ee38b8) · Can run in parallel with: 016a · Before: 016c

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
- [x] 1.1 **The top bar at 1280 and 1440.**
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
- [x] 1.2 **The Compare tenants title.** Move `Header.tsx` about 35 (`/demo/compare`) into `screenHead` in `screens.ts` as a special case, like `/requests`. No route, no `SCREENS` entry. (acceptance: `/demo/compare` still reads "Compare tenants" with its sub-line.)
- [x] 1.3 **A preset asks before it clears a demo in progress** (`DemoMenu.tsx` about 95 applies it straight away).
  - When the company has demo activity (any `done` key or audit entry for this tenant), a confirm names what happens: "Start from 'DG1 due'? This first resets Najd Arcline Contracting Co.: the actions recorded in this demo are cleared."
  - Add it as a `ModalSpec` case beside `ResetModal` (`store.tsx` about 22–34, `Modals.tsx` about 228–245). With no activity, the preset runs at once, as now.
  - (acceptance: after one action in Najd, Demo › Start: DG1 due asks first; Cancel keeps the action; confirming runs the preset. Straight after Reset it doesn't ask.)
- [x] 1.4 **Search "First 8"** (`GccSearch.tsx` about 29 and 102).
  - The count is taken after the cut, so exactly 8 matches says "First 8" and the real total never shows.
  - Return the full count with the cut list, and read "8 of 23 matches". When everything shows, read "N matches".
  - (acceptance: ⌘K, "T-2026" in Najd.)

### Phase 2 — The dashboard kit
- [x] 2.1 **Grey boxes in the Stage column.**
  - The tender table's stage cell uses the class `stage-chip` (`base.cols.tsx` about 131–140). That class collides with the legacy `.stage-chip` in `styles/pages.css` about 7–12 (border, card shadow, scale on press), and `dashboard.css` about 237 overrides only part of it.
  - Rename the dashboard's class (for example `tk-stage`) in both files. Leave `pages.css` alone.
  - (acceptance: `/` Table at 1280 and 1440, light and dark: no border or shadow on the stage cells; check the computed style.)
- [x] 2.2 **Tables fit their rows** (`dashboard.css` about 214: `.tg-grid` is a fixed 40 + 10 × 40 px; `--tg-hscroll` is never set).
  - Size the grid to its rows: header plus `clamp(rows, 3, 10)` × row height plus the scroll gutter, set inline from `TenderGrid.tsx` (the row count is about 176).
  - Keep a minimum height for the empty overlay.
  - (acceptance: as `corniche.hot`, `/stages/3` Table shows no band of blank rows. As `najd.hot`, `/` still shows 10 rows with a scroll.)
- [x] 2.3 **The Weighted empty line shows twice** (`StageChart.tsx` about 140 and 144–150: the caption note and the empty state print the same sentence). Show it once, in the empty state. (acceptance: as `corniche.hot`, `/`, Graph › Weighted.)
- [x] 2.4 **A row in My requests opens what it asks for.**
  - Today a row click does nothing, and only the action button routes (`DashboardPage.tsx` about 112–113 opens tenders only; `requests.cols.tsx` about 38).
  - A click or Enter on a request row goes where its primary action goes:
    - export the route of `primaryOf` in `requests.actions.ts` (about 18–32) as a pure function, and use it for the row;
    - the Tender cell's link keeps opening the tender.
  - (acceptance: as `najd.comm` after Omar's Request estimate, a row click opens the input form. As `najd.fin` with a renewal requested, it opens the credential in Company.)

### Phase 3 — Workspace, upload and Company
- [x] 3.1 **"With nobody now" on closed tenders** (`WorkspaceHeader.tsx` about 73; the VM `domain/gcc/workspace/header.ts` about 144 has no live flag).
  - Add `closed` (or `live`) to the VM.
  - A closed tender reads its outcome ("Discarded at DG1", "Lost", "Won") instead of an owner line. A live tender with no owner keeps "With nobody now".
  - (acceptance: as `najd.hot`, `/tenders/T-2026-019`, a discarded tender.)
- [x] 3.2 **Rail key dates read like the Dates tab** (`Rail.tsx` about 141: "in 2 d · 1 wd").
  - Use `countdownText` from `domain/calendar.ts` (about 97) with the tenant's country code, the same as `KeyDateList.tsx` about 49.
  - (acceptance: as `najd.hot`, the hero's rail and its Key dates tab read the same countdowns.)
- [x] 3.3 **Upload doesn't reveal a tender the viewer can't open** (`UploadGcc.tsx`: `canOpen` about 89 gates only the Open button; the "Recognised" callout about 144–151, the intake steps, and the demo file list about 47–57 still show).
  - Gate the callout, the steps and the demo file list on `canOpen`.
  - A recognised file the viewer can't open reads "Logged to the register. It is outside your role", with no ID or title.
  - (acceptance: as `najd.coord`, the demo files list has no restricted tender; as `najd.hot`, cleared, unchanged.)
- [x] 3.4 **Arabic file names in the Arabic font.**
  - In `tokens.css`, add `'IBM Plex Sans Arabic'` after `'IBM Plex Sans'` in `--font-sans`, and after `'IBM Plex Mono'` in `--font-mono`. Latin text keeps its fonts.
  - Wrap file names in `<bdi dir="auto">` in the Documents list (`documents.tab.tsx` about 111) and the upload modal (`UploadGcc.tsx` about 110).
  - In the toast string (about 71), wrap the name in U+2068 and U+2069 (first-strong isolate) so the order holds.
  - (acceptance: as `batinah.coord`, upload T-2026-042's demo file; the modal title, the toast and the Documents list show the Arabic name in Plex Sans Arabic, in the right order.)
- [x] 3.5 **The Documents card shows the Arabic title** (`documents.tab.tsx` about 90 shows only "Tender document {ref}").
  - For a record with an Arabic title (`readingOf(record).titleAr`, `domain/gcc/arabic/reading.ts` about 88–92), show it with `lang="ar" dir="rtl"` above the English working title, as `ReadInEnglish.tsx` about 59 does.
  - (acceptance: Batinah, `/tenders/T-2026-042?tab=documents`; Najd's hero card unchanged.)
- [x] 3.6 **"Requested by you" in the credential panel** (`Credentials.tsx` about 108). When the viewer made the renewal request, read "Requested by you". (acceptance: as `najd.hot` after Request renewal on Zakat.)
- [x] 3.7 **The Bid / No-Bid tab for the Commercial Manager** (`bid-decision.tab.tsx`).
  - Check as `najd.comm` on T-2026-097: the tab should mask only what `see.margin` and `see.positions` hide. The decision, its date and its conditions are not confidential.
  - If more is masked, narrow it to those capabilities. If it is already right, write that and tick.

### Phase 4 — The gates
- [x] 4.1 **The DG3 confirm repeats the name** (`DecisionPanel.tsx` about 119–120: "Approved for submission, by Faisal Al-Harbi, Sun 8 Mar 10:00, round 1." then the audit detail, which starts "Faisal Al-Harbi, round 1 · …").
  - Render the evidence part only on the second line ("Evidence: 7 checks passed, 1 for information"), plus the note when there is one. Take it from the preview, not typed.
  - (acceptance: as `najd.hot`, `/dg3?tender=T-2025-305` › Approve submission.)
- [x] 4.2 **DG2 position choices by keyboard** (`PositionForm.tsx` about 105–107: the segments move with Tab, not the arrow keys).
  - Make the group a radio group with a roving `tabindex`: Tab enters, the arrows move, and Space or Enter selects.
  - (acceptance: as `najd.member.cfo` on `/dg2?tender=T-2026-097` after the DG2 committee preset.)

### Phase 5 — Check
- [x] 5.1 typecheck and build pass; `/dev/checks` has no failing row in any of the five tenants. None of your changes should move a target.
- [x] 5.2 Each acceptance above at 1440 and 1280, light and dark, with no console errors; the keyboard reaches each new control. Reset demo returns each to seed.

## Data and derivation
No new facts, derivations or `done` keys. The request route is the existing `primaryOf`, exported.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] Every acceptance line in Phases 1–4, with no console errors.
- [x] Reset demo returns the app to seed.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-27.)

**Changed files** (all in the Scope list):
- Shell:
  - `components/layout/TenantSwitch.tsx`: the name always shows (`.hd-tenant-name`), full text in the button's `title`; `has-logo` class when a prospect logo is set.
  - `components/layout/Header.tsx`: the `/demo/compare` special case removed (1.2).
  - `components/layout/GccSearch.tsx`: `searchTendersCounted` returns the cut list and the total; `searchTenders` stays as a wrapper, so dev check 55 is untouched. "8 of 45 matches" / "5 matches".
  - `components/layout/DemoMenu.tsx`: `useStartPreset()` (apply, land, toast) used by the menu and the confirm; a preset with demo activity opens the confirm.
  - `styles/components.css`: name capped at 110 px at ≤1280 (120 px at ≤1500 with a logo).
  - `styles/layout.css`: the title never wraps (nowrap + ellipsis as a safety net); the search pill is 190 px at ≤1500 and an icon button at ≤1400.
  - `styles/tokens.css`: `'IBM Plex Sans Arabic'` after the Latin face in `--font-sans` and `--font-mono`.
  - `pages/gcc/screens.ts` (`screenHead`): `/demo/compare`.
  - `state/store.tsx`: one `ModalSpec` case, `{ type: 'preset'; id }`.
  - `components/overlays/Modals.tsx`: `PresetModal` beside `ResetModal`.
- Dashboard kit:
  - `columns/base.cols.tsx` and `dashboard.css`: `stage-chip` → `tk-stage`; `.tg-grid` loses its fixed height.
  - `grid/TenderGrid.tsx`: the box is set inline to 40 + clamp(n, 3, 10) × 40 + 17 px.
  - `chart/StageChart.tsx`: an empty chart's caption drops the note that is its empty message.
  - `DashboardPage.tsx`: a request row's click or Enter navigates to `vm.table.routeOf(id)`.
  - `columns/requests.cols.tsx`: comment only.
  - `domain/gcc/actions/requests.actions.ts`: `requestRoute(r)` exported (the route of `primaryOf`).
  - `domain/gcc/viewmodels.ts`: optional `TableZoneVM.routeOf`.
  - `domain/gcc/dashboards/build.ts`: sets `routeOf` for request tables.
- Workspace and Stage 1:
  - `domain/gcc/workspace/header.ts`: `closed` on the VM; a closed tender with no recorded outcome reads "Closed".
  - `pages/gcc/workspace/WorkspaceHeader.tsx`: no "With …" part when closed.
  - `pages/gcc/workspace/Rail.tsx`: `countdownText` on `authorityCalendar` (as `KeyDateList`), "Today".
  - `tabs/documents.tab.tsx`: the Arabic title (`readingOf(record).titleAr`, `lang="ar" dir="rtl"`, the existing `.rie-title-ar` style) and `<bdi dir="auto">` on file names.
  - `pages/gcc/s1/UploadGcc.tsx`: the demo file list, the Recognised callout, the steps, the duplicate's ID and the toast's ID are gated on `canOpen`; file names isolated in the modal title and toast.
- Company and gates:
  - `pages/gcc/company/Credentials.tsx`: "Requested by you" (and "asked of you").
  - `pages/gcc/dg3/DecisionPanel.tsx`: the preview's second line is the audit detail after its "name, round" part.
  - `pages/gcc/dg2/PositionForm.tsx`: a roving-tabindex radio group.

**Verification** (own dev server on 5187, headless Chrome via CDP, at 1280 and 1440, light and dark, unless noted):
- `npm run typecheck` and `npm run build` pass (the chunk-size warning is the existing one).
- `/dev/checks` in all five tenants: no "× Fail" row and no crashed panel, with 016a's edits present in the checkout.
- No console errors in any run; only the React Router future-flag warnings.
- 1.1, as `najd.hot` on `/tenders/T-2026-118`, `/dg3`, `/sourcing`, `/demo/compare`, `/admin/sources` ("Sources & integrations", the longest title, 192 px) and `/stages/3`:
  - at 1280, 1366 and 1440 the title is never truncated and the bar is one row;
  - the name shows (110 px with an ellipsis at 1280; whole at 1440), with the full name in `title`;
  - the same with a 43-character branding display name, and with that name plus a 180 × 40 logo.
- 1.2: `/demo/compare` reads "Compare tenants" with "Demo view: the same tender in five companies."
- 1.3:
  - a fresh company runs "DG1 due" at once, and so does one with only persona switches;
  - with activity, "Start: RFQs out" asks "Start from ‘RFQs out’?" (reachable by keyboard; focus on "Reset and start");
  - Cancel keeps the `done` keys; confirming runs the preset (26 keys, lands on the package board);
  - straight after Reset it doesn't ask.
- 1.4: ⌘K "T-2026" in Najd reads "8 of 45 matches"; "T-2026-11" reads "5 matches"; "Rawdah" "1 match". ⌘K, Enter and Space open the collapsed button at 1280, and Esc returns focus to it.
- 2.1: the stage cell computes `border: 0`, `box-shadow: none` in both themes.
- 2.2: Corniche `/stages/3` grid 177 px (1 row, no vertical scroll); Najd `/` 457 px, 10 rows with a scroll; Dafna and Batinah `/stages/3` empty message (88 px) fits in the 3-row minimum.
- 2.3: Corniche `/` › Graph › Weighted shows the sentence once, in the empty state. Najd's Weighted keeps its caption note.
- 2.4:
  - Omar requests the estimate on the hero's Inputs tab (after "RFQs out"); as `najd.comm`, a row click and Enter both open `/tenders/T-2026-118?tab=inputs&input=estimate` with the form, and the Tender link still opens the tender;
  - after Faisal's Zakat renewal request, `najd.fin`'s row click opens `/company?tab=credentials&cred=najd-zakat`.
- 3.1: T-2026-019 reads "Discarded at DG1 · out of scope · Thu 22 Jan · Omar Siddiqui · Bid Manager Omar Siddiqui". The same holds for withdrawn, no-bid, won (T-2025-290) and lost tenders. Live tenders keep "With …".
- 3.2: the rail's three dates equal the Key dates tab for T-2026-118, T-2026-042 and T-2026-061 ("in 4 days · 4 working days", "Today").
- 3.3:
  - no seed persona who can upload is refused a demo document, so the gate was tested by forcing `canOpen` false for T-2026-120 in `UploadGcc.tsx` (reverted and re-checked afterwards);
  - with the gate on: no list entry; the modal reads "Recognised / Logged to the register / It is outside your role." with no ID, title, steps or Open button; the toast reads "… recognised and logged to the register."; the duplicate shows no ID;
  - with the gate off: `najd.coord` and `najd.hot` are unchanged.
- 3.4, as `batinah.coord`, uploading T-2026-042's demo file:
  - the modal title and the toast carry U+2068 … U+2069;
  - the Arabic glyphs render in IBM Plex Sans Arabic (`CSS.getPlatformFontsForNode`) in the title, the toast and the Documents list, with Latin in Plex Sans or Plex Mono;
  - the name reads as one RTL unit and keeps its place in the English sentence.
- 3.5: T-2026-042's card shows the Arabic title (Plex Sans Arabic, `lang="ar" dir="rtl"`) above "Tender document ILRA/RD/2026/042". Najd's hero, T-2026-041, T-2026-071 and T-2026-072 are unchanged.
- 3.6: Faisal reads "Requested by you, Sun 8 Mar 10:00 · asked of Sultan Al-Anazi"; Sultan reads "Requested by Faisal Al-Harbi … · asked of you".
- 3.7: already right; nothing changed. As `najd.comm` on T-2026-097 (and after a real DG2 Bid in the demo):
  - margin is shown (he holds `see.margin`);
  - masked: win probability (`pack.ts` 273, `see.positions`), the committee count ("With the committee") and which seat proposed a condition ("A condition of the DG2 approval");
  - shown: the decision, its date, its pack version and both conditions, including the margin one.
- 4.1: `/dg3?tender=T-2025-305` › Approve submission: "Approved for submission, by Faisal Al-Harbi, Sun 8 Mar 10:00, round 1." then "Evidence: 7 checks passed, 1 for information", and "· Note: …" once a note is typed. The recorded audit detail matches.
- 4.2, after the DG2 committee preset:
  - `najd.member.cfo`'s form opens with focus on the saved "Support with conditions";
  - the arrow keys and Home/End move and choose; Tab leaves the group; Shift+Tab returns to the chosen option; Space and Enter choose without submitting;
  - `najd.exec` recorded a fresh position by keyboard (quorum 3 of 5).
- Reset:
  - after a DG3 approval and a renewal request in Najd and an Arabic upload in Batinah, "Reset all companies" leaves 0 `done` and 0 audit in both;
  - T-2025-305 is back to pending, the Zakat panel offers Request renewal again, and T-2026-042's Documents list has no upload;
  - the next preset runs without asking.

**Deviations from plan:**
1. 2.2 (user decision, 2026-09-27): the card keeps its 491 px minimum (dashboards.md §1: one box for Table and Graph, so toggling never moves the page).
   - The grid fits its rows inside the card: Corniche `/stages/3` 177 px for one row; Najd `/` 457 px with 10 rows and a scroll.
   - So a short table still sits in the tall card, with empty card surface below it.
2. 1.1:
   - The search pill collapses at ≤1400, not only at ≤1280, so 1366 also holds.
   - It is 190 px wide at ≤1500 (was ≤1320), so the longest title fits whole at 1440.
   - The name keeps its 170 px cap at 1440 (the full "Najd Arcline Contracting Co." is 157 px); with a prospect logo it is capped at 120 px up to 1500.
   - The rules sit in `layout.css` and `components.css`, because `.gs-btn` lives in `tender.css`, which is outside the list.
3. 1.3:
   - "Demo activity" counts `done` keys, uploads and audit entries, except the store's own persona, company and View as switches. Otherwise a single persona switch would make every preset ask.
   - The confirm's note is the preset's own line, plus "The prospect branding set in Administration is cleared too." when branding is set (the preset's reset clears it).
   - The action reads "Reset and start".
4. 1.4: `searchTenders` is kept, as a wrapper, so dev check 55 is unchanged.
5. 2.4: the route reaches the page through `TableZoneVM.routeOf`, set in `build.ts`, so the component computes nothing.
6. 3.1: a closed tender's outcome already reads in place of the countdown (`dueNote`). Repeating it in the owner slot would print it twice, so the owner slot drops "With …" and keeps the Bid Manager.
7. 3.4: `S1Modal`/`ModalFrame` take the title as a string and aren't in the list. The upload modal's title uses the U+2068/U+2069 isolate (the string form of `<bdi dir="auto">`) instead of a `<bdi>` element; the Documents list uses `<bdi dir="auto">`, and so does the card's file name.
8. 3.6: "asked of you" is added in the same sentence when the viewer owns the credential.
9. 4.1: the second line is taken from the preview's audit detail (its segments after the first), so the preview always equals the record.
10. 4.2: the saved position loads just after the modal focuses, so focus follows the checked option.

**Blockers / questions:** none open (2.2 decided by the user).

**Follow-ups noticed (not done):**
- A preset's reset clears the prospect branding (a `done` key). A presenter who brands the demo and then starts a preset loses it. Consider keeping `branding` across presets and Reset this company (a rule change).
- The My requests table's Status column is off-screen at 1280, since the table sits at two thirds of the width. It scrolls inside the card; the file's comment says it fits 1280.
- `data/extracted/gcc/kw-cctld.ts` (T-2026-071, Arabic) has no Arabic `Title` field, so its Documents card shows no Arabic title.
- In the rail at 1280, the longer countdown wraps labels like "Participation confirmation" onto two lines. It reads fine.
