# 027d — The decision funnel card, one calm colour for the graph, and a tracker where gates stand out

Status: DONE (2026-09-28, reviewed) · Depends on: wave 8 (commit 10de455) and the orchestrator's wave 9 contract (below) · Can run in parallel with: 027a, 027b, 027c

## Goal
A prospect reads the Head of Tendering's dashboard at a glance:
1. **The decision funnel** is its own full-width card. Every column has **the same five rows**: step and what it decides, the main number, a split bar, the other outcomes, and a rate. Today it is one cramped line.
2. **The graph** uses one calm blue for its bars, whatever the tenant's brand colour. Its gate lines are violet, the colour of decision gates everywhere. A "How to read this graph" ⓘ says what each mark means.
3. **The tender tracker** makes decision gates obvious at first glance: violet diamonds between green stage circles, with a small key. A tender stopped at a stage or gate shows that point in red. Every node has the same rows of text, lined up.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Presentation first.** No new facts, `done` keys, capabilities or libraries. The one new derivation is a step's own outcome split on stage dashboards (2.4), read from the stage logs that already exist.
- **Components compute nothing.** Rates, notes and the graph's key text are built in the domain (`domain/gcc/flows/*`, `domain/gcc/dashboards/build.ts`) and reach components as strings. A component may turn counts into bar widths (that is layout, not a KPI).
- **Status is never colour alone.** Every coloured mark has a glyph or a word beside it.
- **Keep readings still.** No funnel count, drill-down, graph value or tracker date changes. The one allowed exception: Stage 1's "Linked" column folds into Captured (2.4.1). All `/dev/checks` rows that exist today must still pass in the five tenants (after wave 8: Najd 805, Corniche 396, Dafna 377, Batinah 385, Qurain 400). If a check asserts Stage 1's step list, update its target and record old → new under Deviations. Plans 027a, 027b and 027c add rows of their own in parallel; those aren't yours.
- **Stay in your files** (Scope). If a change needs another file, stop and ask.

## Context
- **Why:** user feedback, 2026-09-28:
  - "The decision funnel looks bad: too little space; the data can be shown in a much better way."
  - After the orchestrator's sketch (columns, split bars, rates): "In the decision funnel the text and the bar are not consistent across the columns." In the sketch, Captured and Submitted had no bar and no rate; the gate columns had both.
  - "The colours in the graph: is there a reason for each colour? If yes, say it in a small popup." Then: "For the graph's tender colour, go with only one: blue or some smooth colour."
  - On the tracker (a tender's stages and gates, screenshot of T-2025-284): "Can we use a different colour for the DG? I know you used squares and circles to differentiate, but it doesn't look different at first glance. If a tender is stopped or rejected at one point, it would show red at that point: is that correct?" And: "The text below each stage and DG is inconsistent."
- **The answer to "red at the stop":** yes, today a stopped node reads ✕ on red (`.tt-node.s-stopped`), and the nodes after it fade to 40% (`.after-stop`), with an outcome line ("Discarded at DG1 · below the value band · 3 Mar"). Keep that behaviour, in the new shapes.
- **The funnel today:** `components/dashboard/FlowStrip.tsx`, one thin sunken line (`dashboard.css` `.fs*`, about 75–95).
  - View model: `FlowZoneVM` → `FlowStepVM { key, label, parts, sub?, note? }` → `FlowPartVM { key, count, label, tone?, drill, outcome? }` (`domain/gcc/viewmodels.ts`; `sub`, `note` and `outcome` are the orchestrator's wave 9 contract, already in the code).
  - PF-5 in `domain/gcc/flows/portfolio.flow.ts`: Captured, DG1, DG2, DG3, Submitted, Results. The Bid Manager's starts at DG1.
  - `domain/gcc/flows/stages.flow.ts`: every stage dashboard. Stage 1 has Captured, Linked, Logged, Screened, Awaiting DG1, DG1. Other stages have their steps (dashboards.md §8.2) then the gate's decisions, or "Left {stage}" (moved on · stopped), or Stage 9's Result received and Closed. My requests has Requested, Submitted, Accepted.
  - The ⓘ says the counts are decisions in the period, not one group of tenders followed through. **So never draw a tapered funnel** whose widths imply one cohort. A split bar per column is honest: each bar splits that step's own outcomes.
  - Data for the non-gate columns, already there:
    - `capturesIn(window)` (`domain/gcc/lifecycle.ts` about 168–205) gives `captured` (new notices) and `linked` (duplicates and addenda linked to a tender already on the register), counted separately;
    - `Submission.onTime` (`data/gcc/lifecycle/types.ts` about 44) says whether each submitted bid went in on time.
- **The graph today:** `components/dashboard/chart/StageChart.tsx`.
  - Bars use `var(--brand)`, the tenant's accent: teal in Najd, crimson in Qurain, gold in Dafna. The ghost bar (Compare) is the same hue at 10% with a dashed outline. Gate markers are dashed `--line-strong` verticals labelled DG1, DG2 and DG3. The target line is dashed `--orange` (no measure has a target yet).
  - The legend (about 134–143) names the bar and the ghost, not the gate lines.
  - `GraphVM.key?: GraphKeyVM { title, items: { mark, text }[], foot }` is in the contract; `buildGraph` (`domain/gcc/dashboards/build.ts` about 158) doesn't fill it yet.
- **The tracker today:** `components/dashboard/TenderTracker.tsx` (styles `.tt*` in `dashboard.css` about 284–320).
  - Stage nodes are circles and gate nodes are rounded squares, both green when done, so they look alike.
  - The text under the nodes differs:
    - stages show a date range that wraps ("20 Dec–28 / Dec") and "8 d · FH";
    - gates show a decision chip, the full name "Faisal Al-Harbi", "28 Dec 14:00" and "on time";
    - the current stage shows "since 10 Feb · 26 d · OS".
  - `TrackerNodeVM` gives `from`, `to`, `days`, `ownerInitials` (stages) and `decision { label, tone, byName, at, onTime, lateBy }` (gates).
  - It renders on the dashboards (Z6), the Tender Workspace Overview (`pages/gcc/workspace/tabs/overview.tab.tsx` about 81), the kit preview and dev check 40.
- **The orchestrator's wave 9 contract:** `tokens.css` now has `--blue`, `--blue-soft`, `--violet`, `--violet-soft` and `--violet-line`, in light and dark. They never follow the tenant's accent. **Nobody edits `tokens.css` in wave 9**; if a colour is missing, stop and ask.

## Colour rules for this plan
| Thing | Colour | Glyph or word |
| --- | --- | --- |
| Graph bar (any measure) | `--blue` | the legend's metric label |
| Graph comparison (ghost) bar | `--blue` at about 12% fill, dashed `--blue` outline | "At the start of the window …" / "Previous period …" |
| Graph gate line and its label | dashed `--violet` | DG1, DG2, DG3 |
| Graph target line | dashed `--orange` (unchanged) | the target's label |
| Funnel "went on" segment | `--green` | the part's word ("pursued") |
| Funnel "stopped" segment | a neutral grey that reads in light and dark (try `--ink-6`, then `--grey-2`) | "discarded", "no-bid" … |
| Funnel "waiting" segment | `--orange` | "held", "still here" |
| Funnel gate column's label | `--violet`, mono | "DG1" |
| Tracker stage node | circle: done green ✓; current `--blue` ring with a dot; not reached grey outline; stopped red ✕ | the stage name |
| Tracker gate node | diamond: passed violet ✓; open or not reached violet outline; on hold orange; stopped red ✕ | "DG1" |

The tenant's accent stays on buttons, the selected row and the brand mark. It is no longer used for data.

## Scope
- **Files to create or change:**
  - new `components/dashboard/FlowCard.tsx`, replacing `FlowStrip.tsx` (delete it); `components/dashboard/DashboardPage.tsx` (import and render it in Z3);
  - `components/dashboard/chart/StageChart.tsx`;
  - `components/dashboard/TenderTracker.tsx`;
  - `components/dashboard/dashboard.css`: **only** the `.fs*` block (removed), the new `.fc-*` rules, the `.sc*` block and the `.tt*` block. Plan 027a edits the `.kt*` and `.ac-type*` blocks of the same file in parallel: use targeted edits, re-read the file before each edit, and never rewrite it whole;
  - `domain/gcc/flows/portfolio.flow.ts`, `stages.flow.ts`, and a new `domain/gcc/flows/notes.ts`;
  - `domain/gcc/dashboards/build.ts`: `buildGraph` only (fill `key`). Plan 027a doesn't edit this file;
  - `pages/gcc/dev/fixtures.ts` and `KitPreview.tsx`, if the kit preview renders the flow or needs the new fields;
  - the dev check whose Stage 1 step list moves (2.4.1), if any;
  - `dev-checks/50-portfolio.tsx`, **its readers only** (added by the orchestrator, 2026-09-28, answering the executor): the Captured row reads the new-notices part, and the Submitted row reads on time plus late. Its §12.3 targets don't change;
  - `docs/07-product-design/agr-product-definition/dashboards.md`: §1 (the layout sketch and Z3), §6 (colours), §7 (the tracker). Plans 027a and 027c edit other sections: re-read the file right before you edit.
- **Out of scope** (stop and ask before touching):
  - `viewmodels.ts` and `tokens.css` (the contract is in place);
  - the tiles and the action chip (plan 027a); the Table (`grid/**`, `columns/**`), the period filter;
  - any count, drill-down, graph value or tracker date;
  - the tracker's Now card (With, Team, Status, Next, Blocker);
  - the sidebar's DG gate chips (`GateChip`: their colours carry the viewer's state).

## Steps

### Phase 1 — The notes helper
- [x] 1.1 New `domain/gcc/flows/notes.ts`: `splitNote(parts, noun)`. The first part is the "went on" count and `total` is the sum of the counts.
  - total 0 → "None in this period";
  - total below `MIN_N` (`data/gcc/targets.ts`, the tiles' small-sample rule) → "2 of 3 {noun}", no percentage;
  - otherwise → "33% {first label} of 46 {noun}", the percentage rounded to a whole number.
  - `noun` is "decided" for gates, "results" for Results, "received" for Captured, "submitted" for Submitted, "entered" for a step.

### Phase 2 — The funnel's data
- [x] 2.1 **Every column has the same five rows**, filled in the domain:
  1. `label`, and a `sub` of two or three words;
  2. the first part's count and label (the column's main number);
  3. the split bar, from the parts' counts and `outcome`s;
  4. the other parts ("29 discarded · 2 held");
  5. the `note`.
- [x] 2.2 `portfolio.flow.ts` (PF-5). Numbers are Najd, Faisal Al-Harbi, 90 days; don't hard-code them.

  | Column | sub | Main | Split: on · stopped · waiting | Other parts | note |
  | --- | --- | --- | --- | --- | --- |
  | Captured | New notices | 520 new | new · linked | 34 linked | 94% new of 554 received |
  | DG1 | Pursue or discard | 15 pursued | pursued · discarded · held | 29 discarded · 2 held | 33% pursued of 46 decided |
  | DG2 | Bid or no-bid | 11 bid | bid · no-bid | 3 no-bid | 79% bid of 14 decided |
  | DG3 | Final approval | 9 approved | approved · rejected | 1 rejected | 90% approved of 10 decided |
  | Submitted | Bids sent | 9 on time | on time · late | 0 late | 100% on time of 9 submitted |
  | Results | Won or lost | 2 won | won · lost | 7 lost | 22% won of 9 results |

  - [x] 2.2.1 Captured gains a second part, `linked` (outcome `stopped`: merged into a tender already on the register), with no drill-down. Its main count stays the new notices (520), which still opens the radar. Check the real linked count: 34 is an example.
  - [x] 2.2.2 Submitted splits into `on-time` and `late` from `Submission.onTime`. Each part drills to its own tenders; together they are today's list.
  - [x] 2.2.3 Outcomes: pursue, bid, approved, on time and won are `on`; discard, no-bid, rejected, linked, late and lost are `stopped`; hold is `held`.
  - [x] 2.2.4 The Bid Manager's funnel starts at DG1, with the same rows.
- [x] 2.3 A zero part still shows in "Other parts" ("0 late"), so every column reads the same.
- [x] 2.4 `stages.flow.ts`.
  - [x] 2.4.1 Stage 1: Captured takes the portfolio's new · linked split, and the separate "Linked" column goes: five columns (Captured, Logged, Screened, Awaiting DG1, DG1).
  - [x] 2.4.2 **Step columns** (a step entered in the period): of the tenders that entered the step in the window, split by where each is now:
    - `on`: it has since entered a later step or stage ("moved on");
    - `stopped`: it closed while in this step;
    - `held`: it is still in this step ("still here").
    Read it from the stage logs (`entriesInto`, `firstInto`, `stageNow` in `domain/gcc/kpi/stages.ts`, and the lifecycle's close). Main: "6 moved on" (the first part, as in every other column). Other parts: "5 still here · 1 stopped". Note: "50% moved on of 12 entered", so the entered count sits in the note. Each part drills to its tenders. *(Orchestrator, 2026-09-28, answering the executor: the main number is the first part, not "12 entered"; dev check 76 stays as it is.)*
  - [x] 2.4.3 Gate columns (`GATE_PARTS`): outcomes as in 2.2.3, subs as in 2.2, notes by `splitNote`.
  - [x] 2.4.4 "Left {stage}": moved `on`, stopped `stopped`; sub "Moved on or stopped"; note "{n}% moved on of {total} left". Stage 9's "Result received": won `on`, lost `stopped`. Stage 9's "Closed": `on` (a closed result is done), sub "Handed over or debriefed".
  - [x] 2.4.5 My requests (Requested, Submitted, Accepted): each column keeps one part. Its bar is a full neutral track, and its note says what the number counts ("Asked of you in the period"). Of all the flows, only here may a row read as information rather than a split.
- [x] 2.5 (acceptance) No column on the Head of Tendering's, CEO's or Bid Manager's funnel, or on the Stage 1, 2 and 3 dashboards, has an empty row.

### Phase 3 — The funnel card
- [x] 3.1 `FlowCard.tsx` renders `FlowZoneVM` in Z3 (`DashboardPage.tsx`), as a `card` at full width under the tiles.
  - [x] 3.1.1 Header: the flow's label and its ⓘ (as today). At the right, a key of the outcome colours that occur in this flow: "Went on · Stopped · Waiting", each with its swatch.
  - [x] 3.1.2 One column per step, equal widths, separated by a hairline and a small chevron.
  - [x] 3.1.3 The five rows sit on a shared grid, so the numbers, bars and notes line up across columns. Row 1: the label (12 px, 600; a gate label in violet mono) and the sub (11.5 px, muted). Row 2: the count (mono, about 22 px) and its label (12.5 px, body font). Row 3: the bar, 6 px, full column width. Row 4: the other parts (12 px). Row 5: the note (11.5 px, muted). No row wraps at 1440 or 1280: ellipsis, with the full text in `title`.
  - [x] 3.1.4 The bar: segments proportional to the counts in this column. A non-zero segment is at least 4% wide, so a single "held" stays visible. A column whose counts are all zero shows the neutral track (`--track`). Colours from "Colour rules". The bar is `aria-hidden`: its information is in the words.
  - [x] 3.1.5 Every non-zero count, in row 2 and row 4, is a button with the same drill-down and `aria-label` as today ("DG1: 29 discarded. Show these tenders"). A zero count is plain text.
  - [x] 3.1.6 Empty ("Nothing moved in this period.") and missing flows render inside the card as today.
  - [x] 3.1.7 Width: at 1440 and 1280 every flow fits (Stage 2 has seven columns). Below that the columns scroll horizontally inside the card; the page never scrolls sideways.
  - [x] 3.1.8 Height about 130–140 px at 1440, header included. Remove the `.fs*` rules; the new rules use a `.fc-` prefix.

### Phase 4 — The graph
- [x] 4.1 Colours in `StageChart.tsx`, per "Colour rules": bars and the ghost in `--blue`, gate lines and their labels in `--violet`, the target line unchanged. The legend swatches match.
- [x] 4.2 The legend gains a gate key when markers exist: a short dashed violet vertical and "Decision gates".
- [x] 4.3 `buildGraph` fills `key` for the chosen metric and viewer. The wording below is for Tenders now on a portfolio dashboard; other measures swap in their own label and comparison.
  - [x] 4.3.1 Title: "How to read this graph".
  - [x] 4.3.2 `bar`: "Blue bar: {metric label} in each stage now. One colour, because it is one measure." (On a stage dashboard: "in each step". For a flow metric: "in the period".)
  - [x] 4.3.3 `ghost`, only with a comparison: "Pale dashed bar: the same measure {compareLabel's words}, so you can see what grew or shrank."
  - [x] 4.3.4 `gate`, only with markers: "Violet dashed line: a decision gate (DG1, DG2, DG3), between the stages it closes."
  - [x] 4.3.5 `target`, only when a target is drawn: "Orange dashed line: the target, {display}."
  - [x] 4.3.6 `foot`: "Click a bar to open that stage's dashboard." where the bar navigates for this viewer; "Click a bar to see those tenders in the table." elsewhere. It must match what `onPoint` does (dashboards.md §6, Click).
- [x] 4.4 An ⓘ at the end of the legend (`aria-label` "How to read this graph"). It opens a popover with `usePop` from `components/tender/Tip.tsx`, as `InfoTip` does: on hover, focus and tap; Esc closes it; max width 320 px. It lists `key.items`, each with its mark drawn as in the plot, then `key.foot`, muted. The legend itself stays `aria-hidden`.

### Phase 5 — The tracker
- [x] 5.1 Shapes and colours per "Colour rules". A gate node is a diamond (a rotated square, 18 px, or an SVG), so it differs from a stage circle in shape **and** colour. Each mark keeps its glyph (✓, ●, ✕, ‖ for hold).
- [x] 5.2 A gate column gets a faint `--violet-soft` band behind the node and its text, full height of the track, so the eye finds the three gates at once.
- [x] 5.3 The connector line: `--green-line` up to the last done node, `--line` after.
- [x] 5.4 **The same rows under every node**, on a shared grid, so they line up:
  1. the mark;
  2. the label (a stage's short name; a gate's "DG1" in mono);
  3. a chip: a stage's duration ("4 d", or "26 d so far" for the current stage), neutral; a gate's decision ("Pursue", "Bid", "Approved", "Discarded" …) in its decision tone. Nothing for a node not reached, with the row's space kept;
  4. when: a stage's dates on one line, "30 Oct – 3 Nov" (or "since 10 Feb"); a gate's decision time, "3 Nov 10:30". It never wraps: set a column minimum width (about 92 px) and let the track scroll inside, as today;
  5. who: an initials avatar (the existing `.avatar.xs`), with the full name in `title` and the screen-reader text. For gates add "· on time" (muted) or "· 3 h late" (red). Stages show the owner's initials; gates the decider's. Take the initials from the name with `initialsOf` (`data/people.ts`); don’t add a field to the view model.
- [x] 5.5 A small key at the right of the tracker's head or above the track: "● Stage  ◆ Decision gate  ·  ✓ Done  ● Now  ✕ Stopped here", drawn with the real marks.
- [x] 5.6 A stopped tender: the stop node in red with ✕; nodes after it faded (as today); the outcome line unchanged.
- [x] 5.7 Screen readers: each node still says its label and state ("DG1, passed, Pursue, Omar Siddiqui, 3 Nov 10:30, on time").

### Phase 6 — The spec
- [x] 6.1 `dashboards.md` §1: the layout sketch shows Z3 as a card with columns. Z3's text records "User decision, 2026-09-28: the funnel is its own card; every column has the same five rows (step, number, split bar, other outcomes, rate). It replaces the thin line of 2026-09-26." Update the Stage 1 funnel (Linked folds into Captured) and "Responsiveness".
- [x] 6.2 §6 Colours: bars `--blue` whatever the tenant; gate lines `--violet`; the key and its ⓘ popover.
- [x] 6.3 §7 The tracker: diamonds and circles, colours, the five rows, the key.

## Data and derivation
- New in the domain: `splitNote` (`flows/notes.ts`); Captured's `linked` part; Submitted's on-time split; the step columns' own outcome split (2.4.2); `GraphVM.key`. All from existing lifecycle and intake data.
- No new `done` keys, so Reset is unaffected.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] `/dev/checks` in all five tenants: no failing row, and no fewer rows than the wave 8 counts (except a Stage 1 step-list target recorded under Deviations).
- [x] Najd, Faisal Al-Harbi (Head of Tendering), home, at 1440 and 1280, light and dark, no console errors:
  - [x] the funnel card at 90 days reads as in 2.2's table (with the real linked and late counts). 30 days and 12 months read their own numbers, and no count differs from before this plan;
  - [x] every column has all five rows, and the rows line up across columns;
  - [x] every non-zero funnel number opens the Table filtered to those tenders; "520 new" opens the radar;
  - [x] Graph: blue bars, violet gate lines; the ⓘ opens "How to read this graph" on hover, Tab focus and click, and Esc closes it. Switch to Value and to "Tenders in the period": the ghost line says "previous period".
- [x] Qurain and Dafna homes: the graph is blue and the funnel's "went on" green; neither uses the tenant's crimson or gold.
- [x] Bid Manager home: the funnel starts at DG1, five columns.
- [x] Stage 1 (five columns) and Stage 2 (seven columns) dashboards fit at 1280, and each step column shows its moved on · still here · stopped split.
- [x] Tracker (select a row on the home table; also a tender's Overview tab):
  - [x] T-2025-284 reads like the user's screenshot, with violet diamonds for DG1, DG2 and DG3, one-line dates and the same five rows under every node;
  - [x] a tender discarded at DG1 (find one with the table's Closed filter) shows DG1 as a red diamond with ✕, and the stages after it faded;
  - [x] a tender held at DG1 (if the seed has one) shows an orange diamond.
- [x] Reset demo returns everything to seed.
- [x] No hard-coded numbers in components; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-28.)

- **Changed files:**
  - new `src/components/dashboard/FlowCard.tsx`; deleted `src/components/dashboard/FlowStrip.tsx`; `src/components/dashboard/DashboardPage.tsx` (Z3 renders the card);
  - `src/components/dashboard/chart/StageChart.tsx`; `src/components/dashboard/TenderTracker.tsx`;
  - `src/components/dashboard/dashboard.css`: the `.fs*` block replaced by `.fc-*`; the `.sc-legend` swatches, `.sc-leg`, `.sc-key*` and `.sc-mk*`; the `.tt-track` … `.after-stop` part of the `.tt*` block. Targeted edits only; 027a's `.kt*` and `.ac-type*` rules untouched;
  - new `src/domain/gcc/flows/notes.ts` (`splitNote`, `GATE_SUB`); `src/domain/gcc/flows/portfolio.flow.ts`; `src/domain/gcc/flows/stages.flow.ts`;
  - `src/domain/gcc/dashboards/build.ts`: `buildGraph` returns `key` (a new `graphKey` helper and one `BAR_NOUN` override beside it);
  - `src/pages/gcc/dev-checks/50-portfolio.tsx`: readers only, as the orchestrator allowed (the Captured row reads the new-notices part, the Submitted row on time plus late; targets unchanged);
  - `src/pages/gcc/dev/fixtures.ts` (the flow fixture in the new shape, graph keys, a held-at-DG1 tracker) and `KitPreview.tsx` (one card meta);
  - `docs/07-product-design/agr-product-definition/dashboards.md` §1 (sketch, Z3, Responsiveness), §6 (Colours, the legend, "How to read this graph"), §7 (sketch, nodes, the five rows, the key).
- **Verification** (my own dev server on 5176, headless Chrome over the DevTools protocol, scripts in my scratchpad):
  - `npm run typecheck` exits 0; `npm run build` succeeds (the chunk-size warning was there before).
  - `/dev/checks`, all five tenants: no failing row. Najd 825, Corniche 416, Dafna 397, Batinah 405, Qurain 420 at the end: wave 8's counts plus 027b's and 027c's new rows. Every panel of mine (50, 60, 76) reads exactly as before, and no Stage 1 target moved.
  - **No reading moved:** a before/after snapshot of every dashboard (15 dashboard and viewer pairs × 5 periods × 5 tenants = 375) compares each old count with the new first part (Captured) or the column total (a split column), each old drill list with the union of the new parts' lists, and every graph value: none moved. No column on the HoT, CEO, BM or Stage 1–3 funnels has an empty row; only Stage 9's Closed and My requests' three columns have one part.
  - Najd HoT home, 90 days: Captured 520 new | 54 linked | 91% new of 574 received · DG1 15 pursued | 29 discarded · 2 held | 33% pursued of 46 decided · DG2 11 bid | 3 no-bid | 79% bid of 14 decided · DG3 9 approved | 1 rejected | 90% approved of 10 decided · Submitted 9 on time | 0 late | 100% on time of 9 submitted · Results 2 won | 7 lost | 22% won of 9 results. The card is 140 px tall at 1440 and 1280; the five rows line up (screenshots).
  - Drills: "29 discarded" → "From funnel: DG1 discarded · 90 days", 29 of 209; the same for 11 bid, 9 on time and 7 lost; "0 late" and "54 linked" are plain text; "520 new" opens `/radar`.
  - Graph: blue bars and ghost, violet gate lines and labels, "Decision gates" in the legend. The ⓘ opens on hover, Tab focus and click, closes on Esc and mouse-away, 320 px. Tenders now and Value say "at the start of the window, Sat 7 Feb" (state measures, dashboards.md §6); Tenders in the period and Average days say "in the previous period, Thu 8 Jan – Fri 6 Feb 2026"; Weighted has no ghost line. The foot matches the drills: HoT and CEO "open that stage's dashboard"; stage dashboards "see those tenders in the table"; the Bid Manager and Procurement Lead get the mixed sentence.
  - Qurain (#a8193f) and Dafna (#9a6a00): bars blue, "went on" green, gate labels violet.
  - Bid Manager home: DG1 → Results, five columns. Stage 1: five columns; Stage 2: seven, fitting at 1280 with every step split (moved on · still here · stopped). At 900 px Stage 2 scrolls inside the card; the page never scrolls sideways (1100, 1024, 900).
  - Tracker, selected on the home table and on the Overview tab: T-2025-284 has violet diamonds for DG1, DG2 and DG3 on violet bands, one-line dates, five aligned rows, no cut row, no scroll at 1440. Its screen-reader line reads "DG1, passed, Pursue, Omar Siddiqui, 3 Nov 10:30, on time". T-2026-112 (Closed filter): a red DG1 diamond with ✕, the rest faded, and the outcome line unchanged. No live tender in the seed is held at DG1, so the orange diamond with ‖ is shown by a kit fixture (T-2026-119). T-2026-071 was held and then withdrawn, so it shows the stop in red with an orange "Hold" chip.
  - Reset demo: a DG1 Pursue written into the demo state moves the Today funnel to 1 pursued; Settings → Reset this company returns it to 0 and leaves no `done` keys. The plan adds no `done` keys.
  - Console: no errors over 68 loads (Najd and Batinah; HoT, CEO, BM, Coordinator, Procurement Lead, Finance; stage dashboards 1–9 and the kit; Table and Graph; light and dark). Only React Router's future-flag warnings, as before.
  - No hard-coded numbers in the components (the bar's 4% minimum is layout), and no role checks.
- **Deviations from plan:**
  1. Step columns lead with "moved on", not "12 entered" (orchestrator's answer, 2026-09-28, now in 2.4.2). The parts are moved on · still here · stopped, and they sum to the entered count, so dev check 76 is unchanged.
  2. Check 50's Captured and Submitted readers (orchestrator's answer, now in Scope). No Stage 1 step-list target moved: 76 reads step totals, and Captured's total isn't affected by its checks.
  3. The plan gives no sub for step columns; they read "Step 2 of 6". Stage 8's "Left Submission" sub is "Result or withdrawn", since its parts are results received · withdrawn. My requests: subs "By the bid teams", "Your answers", "Used in a pack"; notes "Asked of you in the period", "Answered in the period", "Used by a pack issued in the period". Stage 9's Closed reads "31 closed" (was "31 tenders"), with the note "Closed in the period".
  4. In Stage 9's step columns, a result closed after its handover or debrief counts as moved on, not stopped (as the plan's Closed column is `on`). Elsewhere a close in the step is "stopped".
  5. The bar's segments are always in the order went on · stopped · waiting, so every column reads the same; row 4 keeps the plan's part order ("5 still here · 1 stopped").
  6. With seven or more columns (Stage 2), rows 4 and 5 are set at 11.5 and 11 px (the plan says 12 and 11.5) and the column padding is tighter, so row 4 never truncates at 1280. Some subs and notes still end in an ellipsis there, as do four notes on the HoT home at 12 months at 1280 ("100% on time of 38 submitted"), with the full text in `title`, as 3.1.3 allows.
  7. Graph key wording: the plan's "Blue bar: {metric label} in each stage now" would read "Tenders now in each stage now". `graphKey` drops the label's "now" or "in the period" ("Blue bar: tenders in each stage now."), names "tenders at risk or overdue" for that measure, and reads Average days as "average days in each stage, for tenders that left it in the period". A viewer whose bars both open stages and filter the table gets a third foot sentence. The popover hides the ghost line while Compare is off.
  8. Gate lines are 1.5 px: at 1 px, a dashed violet line on a fractional x was anti-aliased into grey.
  9. Tracker: the column minimum is 88 px (the plan says about 92), so all 12 nodes fit the 1440 dashboard card without scrolling. Dates use the body font with tabular figures, not mono, so "30 Oct – 3 Nov" fits. A stopped mark is solid red with a white ✕ (it was a pale red with a red ✕). An open gate reads "Open", "since 7 Mar", and its time left in a note line under the five rows. That optional note line also carries a re-open or a result; a stop's reason isn't repeated there, since it is the outcome line (it stays in the node's `title` and screen-reader line). A held gate is a done gate whose decision tone is orange.
  10. The ⓘ "How it's counted" text of PF-5 and the stage flows gained one sentence naming the bar's colours. PF-5's also mentions linked notices and on-time or late bids.
  11. dashboards.md: the Z3 heading is "Z3 · Flow strip: the funnel card", so references to "flow strip" elsewhere still land.
- **Blockers / questions:** none open. Two were asked and answered by the orchestrator (deviations 1 and 2).
- **Follow-ups noticed (not done):**
  - dashboards.md §0 DB-13 still says Z3 is "one thin line under the tiles, not a card", and §10.4's flow strip still lists "Linked" as a step. §1 now records both changes, but those sections aren't mine.
  - `TrackerNodeVM` has no owner name for stage nodes, so a stage avatar's hover shows initials only. Adding `ownerName` (`viewmodels.ts`, `lifecycle.port.ts`) would let it show the full name, as a gate's decider does.
  - A DG1 Hold recorded in the demo leaves the tracker's DG1 open (the tender goes back to validating), so the orange held diamond appears only for a seeded standing hold, and no live tender has one.
  - The table's selected row still has a 3 px brand stripe on its left (`.tgrid .ag-row-selected::before`), against the "no stripes" direction. It belongs to the grid, which is out of scope here.
