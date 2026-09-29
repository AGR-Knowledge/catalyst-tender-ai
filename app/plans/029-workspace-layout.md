# 029 — Tender workspace layout: one flow, full width, equal cards

Status: READY · Depends on: wave 9b (committed `3a00f3f`) and the wave 10 contract (`.eq-row` in `styles/components.css`) · Can run in parallel with: 030, 031, 032

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
- [ ] 1.1 `WorkspaceHeader.tsx`: delete the `<ol className="wsh-track">` block and the `MARK` constant. The second header line reads: issuer · place · procurement, then Submission … in N days, then With … · Bid Manager ….
  - [ ] 1.1.1 The crumb above the title keeps the stage in words ("1 · Intake · Screened"), so the position is still stated.
  - [ ] 1.1.2 `.wsh-who` loses its `max-width: 34%` if the line then fits; it keeps its ellipsis. Acceptance: at 1440 the second line sits on one line for T-2026-118 (hero), T-2026-128 and, in Corniche, T-2026-061, with the issuer readable up to the ellipsis.
- [ ] 1.2 `workspace.css`: delete the compact-track block (`.wsh-track*`, `.wsh-dot`, `.wsh-k`, including the 027d gate and current-stage rules). Acceptance: `grep -rn "wsh-track\|wsh-dot\|wsh-k\b" app/src` returns nothing.
- [ ] 1.3 `domain/gcc/workspace/header.ts`: remove `track` from `WorkspaceHeaderVM`, and `trackOf` and `TrackStepVM` if nothing else reads them (grep first; check `dev-checks/55-workspace.tsx`). Acceptance: typecheck passes.

### Phase 2 — The flow runs the full width on Overview
- [ ] 2.1 `Workspace.tsx`: when the active tab is `overview`, render the tracker between the header and `.ws-grid`, in `<section className="ws-flow" aria-label="Lifecycle of this tender">`, with `focusOnOpen={false}`.
  - [ ] 2.1.1 A tender with no tracker shows the existing "No tracker for this tender yet." card in the same place.
  - [ ] 2.1.2 `overview.tab.tsx` no longer renders the tracker; its doc comment says the flow sits above the panel.
  - [ ] 2.1.3 `workspace.css`: `.ws-flow` spacing matches the gap under it; the rule that hides the tracker's own heading (`.ws-tab .tt > .tt-head`) becomes `.ws-flow .tt > .tt-head`.
  - [ ] 2.1.4 The other tabs show no tracker, as today.
  - [ ] 2.1.5 Keyboard: the order is header → tabs → flow → main → rail; the tab panel's `aria-labelledby` still points at the active tab.
- [ ] 2.2 All 12 nodes fit, in `TenderTracker.tsx` and the `.tt*` block of `dashboard.css`:
  - [ ] 2.2.1 From a 1100 px window up, `.tt-nodes` fills its card with 12 equal columns and no `min-width` (`repeat(12, minmax(0, 1fr))`). Below 1100 px it keeps today's `minmax(88px, 1fr)` and `min-width: 1056px`, and scrolls.
  - [ ] 2.2.2 Acceptance at 1280 × 800 and 1440 × 900, sidebar open: `.tt-track` has `scrollWidth === clientWidth` (no horizontal scroll), and no node's label, chip, when or who row is cut with an ellipsis. Check the hero (T-2026-118), T-2026-128, T-2026-097 (Stage 3), a tender stopped at a gate (a No-Bid; find one in DG2 approvals or the Stage 3 dashboard) and a Stage 8 or 9 tender from the home dashboard's tracker table. If a label is cut at 1280, reduce the node's side padding or the connector gap. Never reduce a font below today's size.
  - [ ] 2.2.3 The "centre the current node" effect (`TenderTracker.tsx`, around line 35) does nothing when the track doesn't overflow; nothing jumps on open.
  - [ ] 2.2.4 The dashboard tracker (`DashboardPage.tsx:137`, opened from a row of the home dashboard or `/stages/1`) gets the same fit, and its head, close button and "Open tender" still work.
  - [ ] 2.2.5 The Now card under the track: from 1280 px its five rows flow into two columns (With, Team, Status | Next, Blocker). Each row keeps the `label · value` shape of `.tt-kv`, and the columns share one label width. Below 1280 it stays one column. Acceptance: the flow band on Overview is no taller than today's tracker at 1440.
  - [ ] 2.2.6 The legend (Stage, Decision gate │ Done, Now, Stopped here) stays above the track, right-aligned, unchanged.

### Phase 3 — Cards side by side share width and height
- [ ] 3.1 Overview: `.ws-two` becomes `.eq-row` (two columns). Each card's body (`.ws-kv`) also gets `eq-scroll`. Delete the `.ws-two` rule if nothing else uses it.
  - [ ] 3.1.1 Acceptance at 1440: "Where it stands" and "Tender" have the same width and the same height. On the hero (many step facts) the longer card scrolls inside while its head stays put, and the shorter card keeps the same height.
  - [ ] 3.1.2 At 1280 the main column is about 630 px, so each card is about 300 px. If the Tender card's values (the fit and win bars, the source chip) wrap badly at that width, set `--eq-cols: 1` for the Overview row below 1440 px in `workspace.css`, and say so in the report. Never let them overflow.
  - [ ] 3.1.3 "Latest activity" stays one card across the main column.
- [ ] 3.2 Audit the other workspace tabs, except Documents (plan 030): Requirements, Eligibility & fit, Key dates, Queries, Sourcing, Inputs, Bid / No-Bid, Decisions & audit.
  - [ ] 3.2.1 As the Head of Tendering, at 1440 and 1280, open every tab on: the hero T-2026-118 and T-2026-097 in Najd, T-2026-061 in Corniche, and T-2026-042 in Batinah. **List every place where two or more cards sit in one row** (tab, component, `file:line`) in the execution report, before changing anything.
  - [ ] 3.2.2 Make each such row an `.eq-row` (`--eq-cols` for three or more), with each card's body in `.eq-scroll`. Where the row is inside a component that a stage screen also renders (for example `SourcingDesk` on `/sourcing`, `PackView` on `/packs`), the change applies there too: open that screen once and check it.
  - [ ] 3.2.3 Leave unchanged: KPI tile strips (already equal), the main/rail columns, tables and lists inside one card.
- [ ] 3.3 The rail stays one column of cards; it is not a row.

### Phase 4 — Checks
- [ ] 4.1 `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [ ] 4.2 `/dev/checks`: no failing row in any tenant (Najd, Corniche, Dafna, Batinah, Qurain). Update `55-workspace.tsx` only where it read `track`.
- [ ] 4.3 Browser (your own tab; reset the demo in that tab only), at 1280 and 1440, light and dark, no console errors:
  - [ ] 4.3.1 Najd as the Head of Tendering: T-2026-128, the hero and T-2026-097. Each shows one flow, full width, all 12 nodes, and the rail beside the two equal cards.
  - [ ] 4.3.2 Najd as the Tender Coordinator and as a committee member: the tabs they can't open still show the masked state; the flow and the equal rows hold.
  - [ ] 4.3.3 Corniche (T-2026-061) and Batinah (T-2026-042, Arabic): the Arabic clause in the Tender card still reads right to left inside the scroll body.
  - [ ] 4.3.4 A dashboard's tracker (home, then a tender row) fits end to end at 1280.
- [ ] 4.4 Settings → Reset demo returns the tender pages to their seed state (this plan adds no demo state).

## Data and derivation
None. No new facts, no new `done` keys. The header VM loses `track`; nothing else changes shape.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants
- [ ] The header has no stage chain; the crumb still names the stage and step
- [ ] On Overview the tracker runs the full content width, and its 12 nodes show with no horizontal scroll at 1280 and 1440 (sidebar open)
- [ ] Cards in one row have the same width and height in every workspace tab listed in 3.2.1; long content scrolls inside the card
- [ ] Dashboards' tracker unchanged apart from fitting
- [ ] Reset demo returns to the seed state; no console errors
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor.)
- Changed files:
- Rows made equal (tab, component, file:line):
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
