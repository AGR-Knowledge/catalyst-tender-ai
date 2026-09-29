# 029 — Tender workspace layout: one flow, full width, equal cards

Status: DONE — awaiting review (2026-09-29) · Depends on: wave 9b (committed `3a00f3f`) and the wave 10 contract (`.eq-row` in `styles/components.css`) · Can run in parallel with: 030, 031, 032

## Goal
On a tender's page the prospect sees the tender's lifecycle once, end to end, without scrolling sideways. Cards that sit side by side are the same width and height; a card with more content scrolls inside instead of stretching the row.

## Context
- **Why:** the user's review of `/tenders/T-2026-128` (Najd, 2026-09-29):
  1. The flow is shown twice: once as the compact chain in the header (`S1 – DG1 – S2 – S3 – DG2 – S4 …`) and once as the tracker on Overview. **Keep the tracker and remove the header chain.**
  2. The tracker is the flow to keep, but it scrolls sideways and only about half of it is visible, because the rail (Recommendation, Next actions, Key dates) sits beside it. **Move the rail lower and give the tracker the whole width**, so all 12 nodes show end to end.
  3. Wherever two or more cards sit in one row, they must be the same width. A card with little content may look a little empty; a card with more content scrolls.
- **Current behaviour:**
  - `pages/gcc/workspace/WorkspaceHeader.tsx:58-68` renders the chain (`<ol className="wsh-track">`) from `vm.track`. `domain/gcc/workspace/header.ts:48` and `:143` build `track` with `trackOf(tracker)`. Its styles are `.wsh-track*`, `.wsh-dot` and `.wsh-k` in `pages/gcc/workspace/workspace.css` (the "compact stage track" block, including 027d's violet gate rules).
  - `pages/gcc/workspace/tabs/overview.tab.tsx:80-82` renders `<TenderTracker>` as the first thing inside the Overview panel, which is the 8/12 main column of `.ws-grid` (`workspace.css`: `grid-template-columns: minmax(0, 8fr) minmax(300px, 4fr)` from 1280 px). The rail is `pages/gcc/workspace/Rail.tsx` in the 4/12 column.
  - `components/dashboard/dashboard.css`: `.tt-nodes { grid-template-columns: repeat(12, minmax(88px, 1fr)); min-width: 1056px; }`, so the track needs 1056 px plus padding. The content column is about 972 px at a 1280 px window (1280 − 252 sidebar − 2 × 28 gutter) and about 1116 px at 1440 (gutter 36).
  - `components/dashboard/TenderTracker.tsx:~35` centres the current node when the track is wider than its card (027d review). `DashboardPage.tsx:137` also renders the tracker when a dashboard row is selected.
  - Overview's "Where it stands" and "Tender" cards sit in `.ws-two` (`repeat(auto-fit, minmax(320px, 1fr))`, `align-items: start`), so their heights differ.
- **The wave 10 contract (already in `styles/components.css`, written and checked by the orchestrator; do not edit it):**
  ```css
  .eq-row  /* grid, --eq-cols columns (default 2), same width and height, the row capped at --eq-h (default 440px) */
  .eq-row > .card > .eq-scroll  /* the card's body: scrolls inside while the card head stays */
  /* under 1100 px the cards stack at their natural height */
  ```
  Use it as `<div className="eq-row" style={{ '--eq-cols': 3 } as CSSProperties}>` with each card's body wrapped in (or given) `className="eq-scroll"`. The CardHead stays outside the scroll body.
- Read first: `/CLAUDE.md`, `app/plans/README.md` (architecture decisions; the wave 10 section), `docs/07-product-design/agr-product-definition/dashboards.md` §7 (the tracker), `ui-direction.md` §5 C2 (the workspace) and the user's standing UI taste: status is a word in a pill, never a coloured stripe; the same rows of text on every card or node; every colour has a stated meaning.

## Target layout (Overview, 1280 px and wider)

```
┌ sticky header ──────────────────────────────────────────────────────────────────────────┐
│ ‹ Back │ 1 · Intake · Screened                                                            │
│ 🇸🇦 T-2026-128  Al-Aflaj rural reservoirs                 AR  ✓ On track     SAR 18.0 M  │
│ Southern Riyadh Rural Water Directorate · Al-Aflaj …   SUBMISSION Sun 29 Mar … · With …  │   ← no S1–DG1–S2… chain
│ Overview  Documents  Eligibility & fit  Key dates  Decisions & audit                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌ FLOW, full content width ────────────────────────────────────────────────────────────────┐
│                                   ○ Stage ◇ Decision gate │ ✓ Done ● Now ✕ Stopped here   │
│ ●Intake ◇DG1 ○Sourcing ○Bid decision ◇DG2 ○Planning ○Pricing ○Proposal ○Compliance ◇DG3 ○Submission ○Results │  ← all 12, no scrollbar
│ ┌ Now: 1 · Intake · Screened ─────────────────────────────────────────────────────────┐ │
│ │ With    Aisha Al-Qahtani …          │ Next     Awaiting DG1 → …                      │ │
│ │ Team    Water tendering team …      │ Blocker  None                                   │ │
│ │ Status  Eligibility 0 pass …        │                                                 │ │
│ └──────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌ main 8/12 ───────────────────────────────────────────────┐ ┌ rail 4/12 ──────────────────┐
│ ┌ Where it stands ────────┐ ┌ Tender ──────────────────┐ │ │ Recommendation for DG1      │
│ │ same width, same height │ │ long content scrolls      │ │ │ Next actions for you        │
│ └─────────────────────────┘ └──────────────────────────┘ │ │ Key dates                   │
│ ┌ Latest activity ─────────────────────────────────────┐ │ │                             │
└──────────────────────────────────────────────────────────┘ └─────────────────────────────┘
```

Below 1280 px the rail goes under the main column, as today. The node labels are the tracker's own (`TrackerNodeVM.label`); the sketch's names are illustrative.

## Scope
- **Files to change:**
  - `pages/gcc/workspace/WorkspaceHeader.tsx`, `pages/gcc/workspace/Workspace.tsx`, `pages/gcc/workspace/workspace.css`;
  - `pages/gcc/workspace/tabs/*.tab.tsx` **except `documents.tab.tsx`** (plan 030 owns it);
  - `domain/gcc/workspace/header.ts` (the `track` field only);
  - `components/dashboard/TenderTracker.tsx` and the `.tt*` block of `components/dashboard/dashboard.css` (targeted edits only; re-read before each);
  - the CSS rule(s) of any component a workspace tab renders, where Phase 3 finds cards side by side (for example in `pages/gcc/s1/s1.css`, `s2/s2.css`, `s3/s3.css`, `dg2/dg2.css`): targeted edits of those rules only;
  - `pages/gcc/dev-checks/55-workspace.tsx` (only if it reads `track`);
  - this plan's row in `app/plans/README.md`.
- **Out of scope** (stop and ask before touching):
  - the Documents tab, `tabs/index.ts` and anything plan 030 owns (the library, the file viewer, `access.ts`, `Sidebar.tsx`, `screens.ts`, `App.tsx`);
  - `pages/gcc/company/**`, `pages/gcc/suppliers/**` (plans 032 and 031 apply the equal-row rule there);
  - the rail's content, the tab list, the tracker's data (`TrackerVM`, `lifecycle.port.ts`), KPI tiles, dashboards' composition;
  - `styles/components.css` (the contract) and `tokens.css`;
  - any fact in `src/data/`.

## Demo-grade rules
- Build what the prospect sees and clicks. Add no new rules or facts.
- Polish where the eye lands: the flow at first glance, then the two cards under it.
- Keep the non-negotiables: the same tender never disagrees between screens, masking stays correct, Reset works.

## Steps

### Phase 1 — The header loses its stage chain
- [x] 1.1 `WorkspaceHeader.tsx`: delete the `<ol className="wsh-track">` block and the `MARK` constant. The second header line reads: issuer · place · procurement, then Submission … in N days, then With … · Bid Manager ….
  - [x] 1.1.1 The crumb above the title keeps the stage in words ("1 · Intake · Screened"), so the position is still stated.
  - [x] 1.1.2 `.wsh-who` loses its `max-width: 34%` if the line then fits; it keeps its ellipsis. Acceptance: at 1440 the second line sits on one line for T-2026-118 (hero), T-2026-128 and, in Corniche, T-2026-061, with the issuer readable up to the ellipsis.
- [x] 1.2 `workspace.css`: delete the compact-track block (`.wsh-track*`, `.wsh-dot`, `.wsh-k`, including the 027d gate and current-stage rules). Acceptance: `grep -rn "wsh-track\|wsh-dot\|wsh-k\b" app/src` returns nothing.
- [x] 1.3 `domain/gcc/workspace/header.ts`: remove `track` from `WorkspaceHeaderVM`, and `trackOf` and `TrackStepVM` if nothing else reads them (grep first; check `dev-checks/55-workspace.tsx`). Acceptance: typecheck passes.

### Phase 2 — The flow runs the full width on Overview
- [x] 2.1 `Workspace.tsx`: when the active tab is `overview`, render the tracker between the header and `.ws-grid`, in `<section className="ws-flow" aria-label="Lifecycle of this tender">`, with `focusOnOpen={false}`.
  - [x] 2.1.1 A tender with no tracker shows the existing "No tracker for this tender yet." card in the same place.
  - [x] 2.1.2 `overview.tab.tsx` no longer renders the tracker; its doc comment says the flow sits above the panel.
  - [x] 2.1.3 `workspace.css`: `.ws-flow` spacing matches the gap under it; the rule that hides the tracker's own heading (`.ws-tab .tt > .tt-head`) becomes `.ws-flow .tt > .tt-head`.
  - [x] 2.1.4 The other tabs show no tracker, as today.
  - [x] 2.1.5 Keyboard: the order is header → tabs → flow → main → rail; the tab panel's `aria-labelledby` still points at the active tab.
- [x] 2.2 All 12 nodes fit, in `TenderTracker.tsx` and the `.tt*` block of `dashboard.css`:
  - [x] 2.2.1 From a 1100 px window up, `.tt-nodes` fills its card with 12 equal columns and no `min-width` (`repeat(12, minmax(0, 1fr))`). Below 1100 px it keeps today's `minmax(88px, 1fr)` and `min-width: 1056px`, and scrolls.
  - [x] 2.2.2 Acceptance at 1280 × 800 and 1440 × 900, sidebar open: `.tt-track` has `scrollWidth === clientWidth` (no horizontal scroll), and no node's label, chip, when or who row is cut with an ellipsis. Check the hero (T-2026-118), T-2026-128, T-2026-097 (Stage 3), a tender stopped at a gate (a No-Bid; find one in DG2 approvals or the Stage 3 dashboard) and a Stage 8 or 9 tender from the home dashboard's tracker table. If a label is cut at 1280, reduce the node's side padding or the connector gap. Never reduce a font below today's size.
  - [x] 2.2.3 The "centre the current node" effect (`TenderTracker.tsx`, around line 35) does nothing when the track doesn't overflow; nothing jumps on open.
  - [x] 2.2.4 The dashboard tracker (`DashboardPage.tsx:137`, opened from a row of the home dashboard or `/stages/1`) gets the same fit, and its head, close button and "Open tender" still work.
  - [x] 2.2.5 The Now card under the track: from 1280 px its five rows flow into two columns (With, Team, Status | Next, Blocker). Each row keeps the `label · value` shape of `.tt-kv`, and the columns share one label width. Below 1280 it stays one column. Acceptance: the flow band on Overview is no taller than today's tracker at 1440.
  - [x] 2.2.6 The legend (Stage, Decision gate │ Done, Now, Stopped here) stays above the track, right-aligned, unchanged.

### Phase 3 — Cards side by side share width and height
- [x] 3.1 Overview: `.ws-two` becomes `.eq-row` (two columns). Each card's body (`.ws-kv`) also gets `eq-scroll`. Delete the `.ws-two` rule if nothing else uses it.
  - [x] 3.1.1 Acceptance at 1440: "Where it stands" and "Tender" have the same width and the same height. On the hero (many step facts) the longer card scrolls inside while its head stays put, and the shorter card keeps the same height.
  - [x] 3.1.2 At 1280 the main column is about 630 px, so each card is about 300 px. If the Tender card's values (the fit and win bars, the source chip) wrap badly at that width, set `--eq-cols: 1` for the Overview row below 1440 px in `workspace.css`, and say so in the report. Never let them overflow.
  - [x] 3.1.3 "Latest activity" stays one card across the main column.
- [x] 3.2 Audit the other workspace tabs, except Documents (plan 030): Requirements, Eligibility & fit, Key dates, Queries, Sourcing, Inputs, Bid / No-Bid, Decisions & audit.
  - [x] 3.2.1 As the Head of Tendering, at 1440 and 1280, open every tab on: the hero T-2026-118 and T-2026-097 in Najd, T-2026-061 in Corniche, and T-2026-042 in Batinah. **List every place where two or more cards sit in one row** (tab, component, `file:line`) in the execution report, before changing anything.
  - [x] 3.2.2 Make each such row an `.eq-row` (`--eq-cols` for three or more), with each card's body in `.eq-scroll`. Where the row is inside a component that a stage screen also renders (for example `SourcingDesk` on `/sourcing`, `PackView` on `/packs`), the change applies there too: open that screen once and check it.
  - [x] 3.2.3 Leave unchanged: KPI tile strips (already equal), the main/rail columns, tables and lists inside one card.
- [x] 3.3 The rail stays one column of cards; it is not a row.

### Phase 4 — Checks
- [x] 4.1 `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] 4.2 `/dev/checks`: no failing row in any tenant (Najd, Corniche, Dafna, Batinah, Qurain). Update `55-workspace.tsx` only where it read `track`.
- [x] 4.3 Browser (your own tab; reset the demo in that tab only), at 1280 and 1440, light and dark, no console errors:
  - [x] 4.3.1 Najd as the Head of Tendering: T-2026-128, the hero and T-2026-097. Each shows one flow, full width, all 12 nodes, and the rail beside the two equal cards.
  - [x] 4.3.2 Najd as the Tender Coordinator and as a committee member: the tabs they can't open still show the masked state; the flow and the equal rows hold.
  - [x] 4.3.3 Corniche (T-2026-061) and Batinah (T-2026-042, Arabic): the Arabic clause in the Tender card still reads right to left inside the scroll body.
  - [x] 4.3.4 A dashboard's tracker (home, then a tender row) fits end to end at 1280.
- [x] 4.4 Settings → Reset demo returns the tender pages to their seed state (this plan adds no demo state).

## Data and derivation
None. No new facts, no new `done` keys. The header VM loses `track`; nothing else changes shape.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants
- [x] The header has no stage chain; the crumb still names the stage and step
- [x] On Overview the tracker runs the full content width, and its 12 nodes show with no horizontal scroll at 1280 and 1440 (sidebar open)
- [x] Cards in one row have the same width and height in every workspace tab listed in 3.2.1; long content scrolls inside the card
- [x] Dashboards' tracker unchanged apart from fitting
- [x] Reset demo returns to the seed state; no console errors
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor, 2026-09-29.)

- **Changed files:**
  - `pages/gcc/workspace/WorkspaceHeader.tsx`: the `<ol className="wsh-track">` chain and `MARK` are gone. The second line reads issuer · place · procurement, then Submission, then With … · Bid Manager …. The issuer line carries its full text as `title`.
  - `pages/gcc/workspace/workspace.css`: the compact-track block is deleted, and so are `.ws-two` and the 1100 px `.wsh-who` rule. `.wsh-who` is now `flex: 1 1 200px` (no `max-width: 34%`). New `.ws-flow` spacing. The hide rule is now `.ws-flow .tt > .tt-head`.
  - `domain/gcc/workspace/header.ts`: `track`, `trackOf`, `TrackStepVM` and `STATUS_WORD` are removed. Nothing else read them.
  - `domain/gcc/workspace/index.ts`: the `type TrackStepVM` re-export is dropped (one word; see Deviations).
  - `pages/gcc/workspace/Workspace.tsx`: on Overview, the tracker (or the "No tracker for this tender yet." card) sits in `<section className="ws-flow" aria-label="Lifecycle of this tender">`, between the header and `.ws-grid`, with `focusOnOpen={false}`.
  - `pages/gcc/workspace/tabs/overview.tab.tsx`: no tracker. The doc comment says the flow sits above the panel. The two cards sit in `eq-row ws-pair`, with each body `ws-kv eq-scroll`.
  - `components/dashboard/TenderTracker.tsx`:
    - a date never breaks inside (no-break space), so a range breaks only after its dash;
    - the Now card's five rows are two `<dl className="tt-kv">` in a `.tt-kvs` wrapper (With, Team, Status | Next, Blocker);
    - the comment on the "centre the current node" effect is updated; its logic is unchanged.
  - `components/dashboard/dashboard.css` (`.tt*` block only):
    - `.tt` is a size container named `tt`;
    - from a 1100 px window, `.tt-nodes` is `repeat(12, minmax(0, 1fr))` with no min-width, and nodes have 2 px side padding;
    - `@container tt (max-width: 1099px)`: the date row is two lines tall on every node, and the range wraps after its dash;
    - `.tt-dec` is capped at its column (ellipsis rather than spilling into the next node);
    - `.tt-kvs` gives two columns from 1280 px.
  - This plan and its README row.
- **Rows made equal (tab, component, file:line).** The audit (3.2.1) ran before any change, as the Head of Tendering at 1440 and 1280, on T-2026-118 and T-2026-097 (Najd), T-2026-061 (Corniche) and T-2026-042 (Batinah). It added T-2026-104, T-2026-109 and T-2026-101 (Najd) and T-2026-029 (Corniche), so that the Sourcing and Bid / No-Bid tabs were covered too; none of the four named tenders shows Sourcing. It ran again as the Coordinator and the CFO seat. A script listed every parent with two or more bordered boxes in one row. That found three places:
  1. **Overview**, "Where it stands" + "Tender": `pages/gcc/workspace/tabs/overview.tab.tsx:81` (was `.ws-two`, 354 × 417 / 354 × 404 on the hero at 1440). **Made `.eq-row`.** At 1440 both cards are 354 px wide, at the same height, on every tender checked. The longer card scrolls under its head where it passes 440 px: the hero's step facts don't; T-2026-097's "Where it stands" 595/387 and T-2026-104's 556/387 do. At 1280 each card is 300 px. The Tender card's values wrap to two lines at most (Source, Language with its page chip), and nothing overflows. Batinah's Arabic clause reads right to left inside the scroll body. So `--eq-cols: 1` below 1440 was **not** needed (3.1.2).
  2. **Bid / No-Bid**, competitor cards in pack section 9.2: `pages/gcc/s3/sections/Competitors.tsx:19` (`.pk-comps`, `s3/s3.css:149`), two per row at 1440 on T-2026-097 and stacked at 1280. **Left unchanged** (3.2.3): they are the items of one list inside the section's card. They already share one width, and one height per row (grid stretch: 325/325 and 250/250), well under 440 px. `.eq-row` would change nothing at 1440, and at 1280 it would force two 280 px columns where they now stack. `/packs` is therefore untouched.
  3. **Sourcing**, the package board: `pages/gcc/s2/PackageBoard.tsx:92` (`.s2-board`, `s2/s2.css:161`), six columns at 1440 and 3 + 3 at 1280. **Left unchanged** (3.2.3): one board (a `role="list"`) inside one card, whose columns already share width and, per row, height.

  Every other tab (Documents excepted, plan 030) has no cards side by side: Requirements, Eligibility & fit, Key dates, Queries, Inputs and Decisions & audit. The rail stays one column (3.3).
- **Verification.** No browser tool was attached to this session. I drove my own headless Chromium: the cached Playwright in `~/.npm/_npx` with its cached browser, nothing installed. Its `localStorage` is separate from every other session's tab. Scripts live in my scratchpad.
  - Typecheck and build pass (re-run at the end).
  - `/dev/checks`: no failing row in any tenant. Najd 906, Corniche 497, Dafna 478, Batinah 486 and Qurain 501: exactly the wave 9b counts. Check 55 only stringifies the header VM, so it needed no change.
  - Header: at 1440 the second line is one line on T-2026-118, T-2026-128, T-2026-061, T-2026-042 and T-2026-097. The issuer gets 235–258 px and ends in an ellipsis ("Eastern Cities Water Services Company (…"). At 1280 the owner wraps to a second row and the issuer shows about 500 px. The crumb reads "1 · Intake · Screened" (T-2026-128). `grep -rn "wsh-track\|wsh-dot\|wsh-k\b" app/src` returns nothing.
  - Tracker fit (2.2.2): at 1280 × 800 and 1440 × 900, sidebar open, `.tt-track` has `scrollWidth === clientWidth` (954/954 and 1114/1114). No label, chip, date or who row is clipped or spills its column. Tenders checked: T-2026-118, T-2026-128, T-2026-097, T-2026-106 (No-Bid at DG2), T-2026-099, T-2025-298 (Stage 8), T-2025-262 (Stage 9) and T-2026-079 (Stage 8/9).
    - Before the date fix, 1280 clipped the date ranges (e.g. "16 Nov – 18 Nov", 82 px in a 70 px column). The widest possible range in the font is 84 px ("28 May – 28 May"). 12 equal columns give at most ~79 px at 1280 even with no padding, so padding alone could not fix it (see Deviations).
    - The centre effect does nothing (no overflow).
    - The legend is unchanged.
    - The band is no taller than today's tracker at 1440. New vs today's, emulated in the page (729 px column, 88 px scrolling nodes, one-column Now): hero 380 vs 412; T-2026-128 333 vs 365; T-2026-097 380 vs 412; T-2025-298 350 vs 365; T-2026-106 233 vs 233; T-2026-061 380 vs 412; T-2026-042 350 vs 365.
  - Dashboard tracker (2.2.4, 4.3.4): home and `/stages/1` at 1280 and 1440. A row opens it with no scroll and nothing cut; its head shows; × and Esc close it; "Open tender" lands on `/tenders/T-2026-128`. The kit preview's four trackers fit (1068/1068).
  - Keyboard (2.1.5): Tab from the active tab goes to the flow (`Stages and gates`), then the main column ("All activity"), then the rail. The panel is still `role="tabpanel"`, `aria-labelledby="ws-tab-overview"`. Only Overview shows the flow.
  - 4.3, light and dark, at 1280 and 1440, with no console errors in any run. Checked each time: one flow at the full width of `.ws-grid`, 12 nodes, no scroll; the two cards side by side at equal width and height; the rail beside the main column; no header chain.
    - Najd as the Head of Tendering: T-2026-128, the hero and T-2026-097.
    - As the Coordinator (Aisha Al-Qahtani): the hero, and T-2026-097, whose Inputs and Bid / No-Bid tabs read "… is masked for your role" with no flow.
    - As the CFO seat: T-2026-097 and the hero.
    - Corniche T-2026-061 and Batinah T-2026-042; the Arabic clause reads right to left in the Tender card.
  - Reset (4.4), in my tab: "Start: DG1 due" moves the hero to "1 · Intake · Awaiting DG1" (the crumb and the tracker's Now card agree). Settings › Reset › Reset this company returns it to "1 · Intake · Validating". This plan adds no demo state.
- **Deviations from plan:**
  1. **The date row, 2.2.2.** The plan's remedy (less padding or connector gap) cannot fit an 84 px range in a 70–74 px column at 1280. Node side padding is 2 px from a 1100 px window, which the plan allows; with it, the worst case also fits at 1440 (86 px of room). A tracker card narrower than 1100 px (`@container tt`) gives every node's date row two lines. A range breaks only after its dash ("16 Nov –" over "18 Nov"), using no-break spaces inside each date in `TenderTracker.tsx`. Fonts are unchanged, and rows still line up because every node has the same row heights. At 1440 (card 1116 px) every date keeps one line.
  2. **The Now card, 2.2.5:** two `<dl>`s in a grid, not one grid with placement rules. Same `.tt-kv` shape, the same 84 px label in both columns, and the same text.
  3. `.tt-dec` gains `max-width: 100%` and an ellipsis, so a long chip can't spill into the next node in a narrow card. No chip is cut at 1280 or 1440.
  4. `domain/gcc/workspace/index.ts` (not in the file list): the re-export of the deleted `TrackStepVM` type had to go for typecheck.
  5. `.wsh-who` is `flex: 1 1 200px`, not just without `max-width`. Removing the cap alone still wraps the owner at 1440, because due and owner take ~880 of 1116 px. With a 0 basis, 1280 would leave the issuer ~75 px.
- **Blockers / questions:**
  - **The 12-node fit between a 1101 and ~1250 px window, sidebar open.** The plan says 12 nodes fit from 1100 px; measured, they don't cleanly there. The nodes are 63–71 px, so:
    - "Bid decision", "Compliance" and "Submission" end in an ellipsis;
    - at 1101 a decided gate's "OS · on time" row (67 px) widens its column by ~4 px into the gate band;
    - at 1200 only "Bid decision" is cut, by 1 px.

    At 1100 (sidebar as an overlay, 84 px nodes), 1024 (scrolling, 88 px) and 1280 and up, nothing is cut. I kept the plan's rule, since 1280 and 1440 are the acceptance widths. **Question:** should the fit key on the tracker's own width instead of the window? For example, `@container tt (min-width: 940px)` for the 12 equal columns, with the 88 px scroll below. That would scroll at 1101–1250 with the sidebar open, and fit from 1024 with the sidebar closed. It is a two-line change in the `.tt*` block. I haven't made it.
- **Follow-ups noticed (not done):**
  - s1-s3-demo-spec §4.1 still lists "a stage track S1 · DG1 · S2 · S3 · DG2 (later stages muted)" in the header. ui-direction §5 C2 describes the workspace as header, tabs, then 8/12 + 4/12, and doesn't mention the full-width flow on Overview. dashboards.md §7 could note the two-column Now card. None of these is in my file list.
  - On Batinah T-2026-042's Overview, the Tender card overflows the 440 px cap by 9 px, so it shows a scroll bar for its last few pixels. That is the contract working as written; a slightly larger `--eq-h` on `.ws-pair` would avoid it, if wanted.
