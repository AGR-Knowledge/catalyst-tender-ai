# Dashboards: one layout for every role (GCC)

AGR product definition, v1, 2026-09-25. It sets out, for the GCC demo:
- the layout every dashboard shares, from the Head of Tendering to a Planning Manager;
- the period filter and the KPI information popover;
- the table (AG Grid) and the graph (Recharts), and how the two switch;
- the tender tracker that opens under the table;
- the sidebar and the short stage names;
- the new gate authority at DG2 and DG3;
- every role's dashboard: tiles, flow strip, actions, table and graph;
- the data the dashboards need, with target readings for the primary tenant.

**This document is authoritative for dashboards.** Where older documents disagree, this one wins:
- kpi-and-screen-catalogue §B (Head of Tendering candidate panels) and the tile lists in §C;
- ui-direction §4.2 (sidebar) and §5 archetype A (role desk);
- s1-s3-demo-spec §2 (Stages 4–9 out of scope), §10 (chair decides DG2) and §14 (home awaiting a sketch);
- roles-and-access R3 (chair records DG2) and R5 (Stage 4–9 roles are contributors only).

KPI IDs refer to the dictionary in [kpi-and-screen-catalogue.md](kpi-and-screen-catalogue.md) §A. New KPIs are defined in §11 below. People and tenants come from [gcc-demo-data.md](gcc-demo-data.md).

---

## 0. Decisions (taken with the user, 2026-09-25)

| # | Decision |
| --- | --- |
| DB-1 | **One layout for every dashboard.** The zones, their order and their behaviour are identical for every role. Only the content differs: the tiles, the flow, the actions, the table's columns and the graph's axis |
| DB-2 | **Period filter:** All · 30 days · 90 days · 12 months (plan 039, 2026-10-06; Today and 7 days went). The default is 30 days. It drives the KPI tiles, the flow strip and the graph. It does not filter "Needs your action", which is always now, or the table, which has its own filters |
| DB-3 | **Every KPI label has an ⓘ.** Hover or keyboard focus shows what the KPI means, how it's counted, the period, the target and the source. The icon is the information icon, because an eye usually means show or hide |
| DB-4 | **Sidebar:** Dashboard at the top, then Calendar. Then the stages the person can open, numbered 1–9 with short names, each with its working screens. Then Company. **Administration and Settings sit at the bottom.** The Head of Tendering sees all nine stages |
| DB-5 | **The main view toggles between Table and Graph.** Only one shows at a time. The choice is remembered per viewer |
| DB-6 | **Table: AG Grid Community.** There is always one sort applied (Newest, Highest value or Due soonest). Ten rows are visible and the rest scroll inside the container. Filters are available. A row click opens the tender tracker below the table |
| DB-7 | **Graph: Recharts.** The x-axis shows the stages on a portfolio dashboard, or the steps inside the stage on a stage dashboard. The y-axis metric can be changed. Clicking a stage opens **that stage's dashboard: the same page its owner uses** |
| DB-8 | **DG2:** committee members still record named positions. **The Head of Tendering gives the final approval**, with a reason if it goes against the majority. The CEO becomes an ordinary member |
| DB-9 | **DG3 (final bid approval): the Head of Tendering approves**, on a simple gate screen |
| DB-10 | **Stages 4–9** get real tenders, owners, dates and step status, and each has a stage dashboard. The working screens inside them (programme, cost build-up, drafting) stay out of the demo |
| DB-11 | **Build order:** the shared kit and shell first, then the dashboards, then the Stage 1–3 working screens and the gate screens |
| DB-12 | **New libraries, approved:** `ag-grid-community` and `ag-grid-react` (MIT; Community modules only, never Enterprise) and `recharts` (MIT) |
| DB-13 | **User decision, 2026-09-26: less empty space.** The flow (Z3) sits under the tiles; since 2026-09-28 it is its own card whose columns share five rows (§1, plan 027d). Z5 (Table or Graph) sits at two thirds of the width with Z4 (Needs your action) beside it at one third. The graph is one bar per stage or step, with buttons **Tenders · Value · Weighted** and the other measures under **More** (§1, §6) |

---

## 1. The layout

The same page, top to bottom, at 1440 px:

```
┌ Sidebar ─────┐┌─────────────────────────────────────────────────────────────────────────┐
│ Dashboard    ││ Z1  Dashboard · Head of Tendering        [Today|7 days|30 days|90 d|12 m] │
│ Calendar     ││     Faisal Al-Harbi · Najd Arvelle · As of Sun 8 Mar 2026, 10:00 AST      │
│ STAGES       ││ Z2  ┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐   six KPI tiles     │
│ 1 Intake   ▸ ││     └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘                     │
│ 2 Sourcing ▸ ││ Z3  ┌ Decision funnel ⓘ ──── ▬ Approved ▬ Rejected ▬ Pending ▬ Previous ┐ │
│ 3 Bid dec. ▸ ││     │ Captured   › AI scr.  › DG1      › DG2      › DG3      › Won      │ │
│ 4 Planning   ││     │ 194 in     18 passed  12 decid.  8 decided  7 decided  3 won      │ │
│ …            ││     │ ▇▇▇▇▇▇▇▇▒▒ ▇░░░░░░░░░ ▇▇▇▇▇▇░░▪▪ ▇▇▇▇▇▇▇▇░░ ▇▇▇▇▇▇▇▇▇▇ ▇▇▇▇░░░░▪▪ │ │
│ 9 Results    ││     │ 176 new …  176 out    8 appr. …  7 appr. …  7 appr. …  3 lost …   │ │
│ Company      ││     │ 18 re-iss… 18 passed… 8 appr. o… 7 appr. o… 7 appr. o… 3 won of 7 │ │
│ ──────────── ││     └───────────────────────────────────────────────────────────────────┘ │
│ Admin        ││ Z5  ┌ Table | Graph (8/12) ───────────────────┐ Z4 ┌ Needs your ────────┐ │
│ Settings     ││     │ Table: 10 rows, the rest scroll inside  │    │ action (4/12)      │ │
│              ││     │ … or Graph: Tenders | Value | Weighted  │    │ most urgent first  │ │
│              ││     │ More ▾ · bars · ghost bar = compare     │    │ rows scroll inside │ │
│              ││     │                                         │    │ Show all (n)       │ │
│              ││     └─────────────────────────────────────────┘    └────────────────────┘ │
│              ││ Z6  ┌ Tender tracker (after a row click) ───────────────────────────────┐ │
│              ││     │ ● ✓ ◆ ✓ ● ● ○ ◇ ○ … ◇ ○ ○ · five rows a node · Now: who, next     │ │
└──────────────┘│     └───────────────────────────────────────────────────────────────────┘ │
                └─────────────────────────────────────────────────────────────────────────┘
```

### Z1 · Header
- **Title:** "Dashboard" on the person's own home. On a stage dashboard it is "Stage 2 · Sourcing".
- **Sub-line:** person · company · "As of Sun 8 Mar 2026, 10:00 AST" (the demo clock, tenant time zone).
- **Opened from the Head of Tendering's graph:** a breadcrumb "Dashboard › Stage 2 · Sourcing". The sub-line then reads "Joseph Mathew's dashboard (Procurement Lead). Actions follow your own rights." A "Back to my dashboard" link keeps the period.
- **Period filter** at the right (§2).

### Z2 · KPI tiles
- **Six tiles on every dashboard** (four on My requests). One row at ≥ 1440 px; 3 × 2 at 1280 px; 2 × 3 below 1100 px.
- Tile anatomy and the ⓘ are in §3.

### Z3 · Flow strip: the funnel card
- **User decision, 2026-09-28: the funnel is its own card; every column has the same five rows (step, number, split bar, other outcomes, rate). It replaces the thin line of 2026-09-26.** It sits at full width under the tiles, about 140 px tall at 1440 with its header.
- **The header:** the flow's label and its ⓘ, and at the right a key of the outcome colours that occur in this flow. The decision funnel (PF-5) reads **Approved** (green), **Rejected** (grey), **Pending** (orange) and **Previous** (pale blue, re-issued notices); the stage strips read **Went on**, **Stopped**, **Waiting** (plan 039, user decision 2026-10-06: Approved / Rejected / Pending in the funnel only; the DG1 screen keeps Pursue / Discard / Hold).
- **One column per step,** equal widths, separated by a hairline and a small chevron. The five rows sit on one grid, so the numbers, bars and notes line up across columns:
  1. the step and what it is or decides, in two or three words ("DG1 · Pursue or discard"; a gate's label is violet mono);
  2. the part that went on, the column's main number ("15 pursued");
  3. **a bar split by the column's own outcomes**: green went on, grey stopped, orange still waiting. A non-zero segment is at least 4% wide, so a single "held" stays visible; a column of zeros shows the empty track. The bar only draws the counts: its words are in rows 2 and 4, and screen readers skip it;
  4. the other outcomes, zeros included, so every column reads the same ("29 discarded · 2 held", "0 late");
  5. the rate: "33% pursued of 46 decided". Under five, the counts only ("2 pursued of 3 decided"), the tiles' small-sample rule; with nothing, "None in this period".
- **It is not a tapered bar.** Each bar splits its own column only. The decision funnel's numbers are still read as one batch narrowing (plan 039): the targets are set so each gate decides about what the one before approved.
- **The Head of Tendering's decision funnel** (PF-5, plan 039, user decision 2026-10-06): six columns read left to right as tenders narrowing step by step. Najd at 30 days reads **194 → 18 → 12 → 8 → 7 → 3**:
  1. **Captured** · Total in: "194 in"; 176 new · 18 previous; note "18 re-issued of 194 in". "Previous" counts re-issued notices of a tender seen before (and today's addenda or duplicates linked to one).
  2. **AI screening** · Initial screening: "18 passed"; 176 screened out; note "18 passed of 194 screened".
  3. **DG1** · First-level screening: "12 decided"; 8 approved · 3 rejected · 1 pending; note "8 approved of 12 decided".
  4. **DG2** · Bid or no-bid: "8 decided"; 7 approved · 1 rejected.
  5. **DG3** · Final approval: "7 decided"; 7 approved · 0 rejected.
  6. **Won** · Final shortlist: "3 won"; 3 lost · 1 pending (bids submitted in the period still to hear about); note "3 won of 7 submitted".
  The Submitted and Results columns are gone; Won replaces them. The notes are counts, never percentages. The Bid Manager's funnel starts at DG1.
- **Every non-zero number on a gate column, and won and lost, is a link.** It switches the main view to the Table, filtered to exactly those tenders (including closed ones). "176 new" and "18 passed" open the tender radar; "in", "previous", "screened out" and Won's "pending" are volumes without a list. A zero is plain text.
- The card has its own ⓘ, in plain English: what the card shows, that it reads left to right as tenders narrowing step by step, and what each colour means.
- **Stage dashboards use one rule:** a **step column** takes the tenders that entered the step in the period and splits them by where each is now: **moved on** (a later step or stage), **still here**, or **stopped** (closed in this step). Its main number is "moved on", as in every other column, and the note says of how many: "50% moved on of 12 entered". A stage that ends in a gate shows the gate's decisions; the others end with "Left {stage}" (moved on · stopped, "80% moved on of 10 left"). All of it is derived from the stage log (§12.1), so every stage's card is honest and needs no extra data.
  - **Stage 1:** Captured (new · previous) → Logged → Screened → Awaiting DG1 → DG1. The separate Linked column of §10.4 folds into Captured (plan 027d, 2026-09-28); plan 039 renamed "linked" to "previous".
  - **Stage 9:** Result received (won · lost) → Handover or debrief → Lessons captured → Closed. A result closed after its handover or debrief is done, so it counts as moved on.
  - **My requests:** Requested → Submitted → Accepted, one number each on a neutral bar, with a note saying what it counts ("Asked of you in the period").
- **No row wraps** at 1440 or 1280: a row that doesn't fit ends in an ellipsis, with its full text on hover.

### Z4 · Needs your action
- **User decision, 2026-09-26:** a column beside Z5 at one third of the width, exactly as tall as the main card. Each row is compact (type chip and TID with the button on the first line, then the title, what is needed and the due), and the rows scroll inside the column.
- **Always now; the period does not apply.**
- **Rows are ordered:** hard blocks and breached SLAs first, then by time left, then by value.
- **Five rows are visible**, then "Show all (n)", which expands in place.
- **Row anatomy:** type chip (DG3 approval, DG2 approval, Booklet purchase, Renewal, Late input …) · tender ID and short title · what is needed, in one line · due, as an `SlaClock` or a date · **one primary button**.
- **The primary button** does the action in place (Approve purchase, Nudge, Request renewal) or opens the exact screen (Open DG3). While that screen is not built yet, the button reads "Open tender" and opens the tender summary. It never shows a dead button.
- **Viewer-aware:**
  - On their own dashboard, the owner sees "Needs your action".
  - When the Head of Tendering opens someone else's stage dashboard, the same zone is titled "Waiting in Sourcing". Each row then names who it waits on ("Joseph Mathew"), and buttons follow the viewer's rights. A disabled button says why in words.
- **Empty state:** "Nothing needs you right now." plus the next due item if there is one ("Next: DG1 on T-2026-118, due Mon 9 Mar 07:44").

### Z5 · Main view
- **A segmented control, `Table | Graph`.** The choice is remembered per viewer in `localStorage` (`ctai.mainview`), in a try/catch, defaulting to Table. My requests has no graph, so the toggle is hidden there.
- **Two thirds of the width, beside Z4** (user decision, 2026-09-26). The table scrolls horizontally inside it.
- **Both views sit in the same box at the same height**, so the page doesn't jump when toggling, and only one is ever visible. The table stays mounted under the graph and sets the box's height (its toolbar wraps to two rows on a narrow or stage table); the graph fills the box, with a plot of at least 400 px.
- The Table is described in §5, the Graph in §6.

### Z6 · Tender tracker
It opens **below the main view** when a table row is selected (§7). Clicking the same row again, the ×, or Esc closes it. It doesn't open from the Graph, whose clicks navigate instead.

### Responsiveness
- At 1440 and 1280 px: Z5 and Z4 stay side by side, at 8/12 and 4/12 (2026-09-26). Z3's columns fit at both widths (Stage 2 has seven; with seven or more, rows 4 and 5 are set half a point smaller). Below that they scroll inside the card.
- Below 1100 px Z4 stacks under Z5 at its own height.
- The table scrolls horizontally inside its box, with TID and Tender pinned left. The page never scrolls horizontally.

---

## 2. The period filter

**Options:** All · 30 days · 90 days · 12 months. The default is **30 days**. (User decision 2026-10-06, plan 039: Today and 7 days are no longer offered; a stored or linked `today` or `7d` falls back to 30 days. Code and dev checks may still read those windows.)

**Windows.** Each is the last N calendar days, including today, ending at the demo clock (Sun 8 Mar 2026, 10:00 tenant time). All is the whole history: 730 days, from Sat 9 Mar 2024. With the demo date they are:

| Option | Window | Previous period (for comparison) |
| --- | --- | --- |
| All | Sat 9 Mar 2024 – Sun 8 Mar 2026 | None ("No earlier period"): an empty window before the history |
| 30 days | Sat 7 Feb – Sun 8 Mar | 8 Jan – 6 Feb |
| 90 days | Tue 9 Dec 2025 – Sun 8 Mar | 10 Sep – 8 Dec 2025 |
| 12 months | 9 Mar 2025 – 8 Mar 2026 | 9 Mar 2024 – 8 Mar 2025 |

**Two kinds of KPI** (every registry entry declares its `kind`):
- **Flow KPIs** count events inside the window: decisions, submissions, results, captures. The sub-line may compare with the previous period in words ("previous 30 days: 2"). Arrows are optional and always neutral in colour.
- **State KPIs** are a value **now**: live pipeline, credentials at risk, fields to check. The period never changes the value. Where the history exists, the sub-line shows the change since the window started ("4 in · 9 out since 7 Feb" on Live pipeline, PF-1; with "Today", since 00:00). Other state tiles keep their own sub-line, and their ⓘ says the period does not change them (orchestrator, 2026-09-26, plan 013 review).

**Small numbers:**
- A rate with n < 5 shows its count beside it ("1 won · 2 lost"). Its tone is neutral, and the ⓘ adds "Small sample".
- With n = 0 the tile says what's missing ("No results in this period"), never "0%" or "—".

**Scope and persistence:**
- **What it drives:** Z2, Z3 and the Graph (Z5).
- **What it does not drive:** Z4, the Table and the tracker.
- **URL:** the period lives in the URL (`?period=30d`) so a drill-down keeps it, and in `localStorage` (`ctai.period`) as the viewer's default.
- **Its own copy of the rules:** `domain/gcc/period.ts` holds the windows, previous windows and `inWindow(iso, window)`. Nothing else computes dates for periods.

---

## 3. KPI tiles and the ⓘ

**Tile anatomy**, top to bottom. Every tile has the same four rows, and tiles side by side keep them level (each row of tiles is one grid, so a pill that wraps moves every value in the row together):
- **Label, ⓘ and the status pill.** The label is sentence case, at most four words. The pill sits at the right; on a narrow tile it wraps under the label, never over it.
  - The pill is the tone as a word with its glyph: green "✓ On track", orange "! Watch", red "! Off track". Information tones, masked tiles and small samples have no pill.
  - A tile may replace the word where the default misleads, keeping the glyph. At most eight such overrides in all; today: "Below target" (Win / loss, Decisions on time and Hit rate when orange), "Renew soon" and "Expired" (Credentials at risk), "Within capacity" and "Over capacity" (Bid-team load, and Load if all pursued on Screening).
- **Main value,** in ink whatever the tone. Money through `Money`, dates through `When`.
- **Detail:** one line, what the value is made of: a count, a scope or a split ("15 live tenders", "68 of 70 on time", "Water team, next 4 weeks"). At most two items joined by " · ", about 24 characters so six tiles fit across at 1440 px; dates as "30 Apr". It never wraps: a longer one ends in an ellipsis, with the full sentence in its title. Every tile has one, empty states included ("No pack issued yet", "Nothing won or lost").
- **Reference:** one line under a hairline, a key and its value ("Target 25%", "Largest SAR 450.0 M", "Since 9 Dec 15 in, 20 out"). The key is muted, from a short list: Target, Cap, Since {date}, Largest, Oldest, Latest, Latest late, Next, Peak, Worst, Average, Renew by, Time left, With {tender}, Waiting on. **Every tile has one** (user decision, 2026-09-28, in the review of plan 027a: an empty reference row read as the inconsistency). Where a tile could say several things, it gives, in this order:
  1. its target or limit, from its ⓘ target or band ("Target 0", "Target 100%", "Cap 24 h to decide"), because that says whether the value is good;
  2. the oldest, worst, latest or next item it counts ("Oldest T-2025-284", "Next closes 10 Mar", "Latest T-2026-118");
  3. its period anchor, for a plain count of events in the period ("Since 7 Feb 176 notices", "Since 00:00 1 linked").

  An empty state keeps the key the tile uses with data, with "None" or the target as its value ("Latest late None", "Target 25% from 5 results"), so the row never appears or disappears when the period changes. A countdown with nothing waiting says "Next None", not "Time left None", which would read as time run out. Information tiles with no target name what they wait on ("Waiting on A buyer" on To level: the agent proposes each adjustment, a buyer confirms it).
- **Owner chip** ("Finance"), when the thing measured waits on someone else: a small muted chip at the right of the reference line.

The detail and reference say the same facts as the KPI's full sentence (`sub`), split and shortened, or the KPI's own target or band from its ⓘ: never a new fact. The full sentence stays in the registry: the tile's accessible name reads it with the status word ("Win / loss: 2 won · 7 lost, Below target. Win rate 22% (n = 9) · SAR 842.0 M won · target 25%. Show these tenders"), and the dev checks read it. A tile without a detail would show its full sentence in the detail's place, on two lines at most; since plan 027e none does, and dev check 51 fails any dashboard, period or strip where a tile lacks either line.

User decision, 2026-09-28: no coloured stripe; status is a word. The action type chip in Needs your action and the workspace rail follows the same rule: a small dot in its tone before the word, not a coloured edge.

**Click.** A tile click applies its drill-down: usually it switches the main view to the Table with a filter and scrolls to it. Where the drill-down is another screen (for example Company › Credentials), it navigates there. A tile with no drill-down isn't clickable and doesn't look it.

**The ⓘ popover.** It opens on hover and on focus (a button with `aria-describedby`); on touch, a tap toggles it. Esc closes it. Max width 320 px. Its content comes from the registry, never from the page:

```
Captured                                              ⓘ
What it means   Tender notices the platform picked up from your
                portals, mailboxes and scanned post.
How it's counted  Notices received in the period, all sources.
                Duplicates and addenda are counted once, under Linked.
Period          30 days · Sat 7 Feb – Sun 8 Mar 2026
Target          None (information)
Source          Intake events
```

**Masking.** A tile whose value the viewer may not see shows `Masked` ("Masked for your role", with who can see it). The tile keeps its place, so layouts stay identical across roles.

**Registry fields added by this document** (catalogue §0.3 describes the registry):
- `kind: 'flow' | 'state'`;
- `info: { means, counted, target?, source }`, written in plain UK English;
- `periodAware: boolean`;
- `compute(ctx) → { value, display, sub, tone, n?, detail?, ref?, status? }`, where `ctx` carries the tenant, the viewer, the scope and the window (`detail`, `ref: { k, v }` and `status` are the display split above, plan 027a);
- `drill?: { kind: 'table-filter' | 'route', … }`.

---

## 4. Needs your action: sources

Each dashboard lists its **action sources**. A source is a function that returns rows from the data plus demo state, with a type, an urgency and a primary action. The rows shown are the union of the dashboard's sources, **filtered by the viewer**:
- the owner sees their own rows;
- the Head of Tendering sees everything, labelled with who it waits on.

The row types and their primary actions:

| Type chip | What it is | Primary action (when its screen exists) | Until then |
| --- | --- | --- | --- |
| DG1 decision | DG1 due on a tender | Open DG1 | Open tender |
| DG2 approval | Pack issued, positions in; Head of Tendering approves | Open DG2 | Open tender |
| DG2 position | A member's position is needed | Record position | Open tender |
| DG3 approval | DG3 pack issued; Head of Tendering approves | Open DG3 | Open tender |
| Booklet purchase | A coordinator has requested one; the Head of Tendering approves | Approve purchase (in place) | Same |
| Renewal | A credential expires before a live bid's opening | Request renewal (in place; creates a request for the owner) | Same |
| Late input | A contributor input for a pack is late | Nudge (in place; logged) | Same |
| Validation | A field to check, blocking DG1 first | Open queue | Open tender |
| RFQ | RFQs to send, overdue replies, escalations | Open packages | Open tender |
| Levelling | Adjustments to confirm | Open levelling | Open tender |
| Pack | A pack to issue, or a stale pack to re-run | Open pack | Open tender |
| Baseline, Price, Section, Gap, Redline | Stage 4–7 work items | Open tender (no working screens by design) | Same |
| Submission | Due within 5 working days, with something missing | Open tender | Same |
| Handover, Debrief | A result to act on | Open tender | Same |
| Request | An input asked of me (My requests) | Open request form | Open tender |

**In-place actions write through `mark()`, so they survive a reload and Reset clears them.** Each writes an audit entry (`logAudit`) and shows a toast in plain words ("Purchase approved. Aisha Al-Qahtani can buy the booklet on Etimad.").

---

## 5. Main view: the Table (AG Grid)

**Library.** `ag-grid-community` with `ag-grid-react`, on the **Community modules only**. Row grouping, the set filter, the columns tool panel, master/detail, Excel export and the context menu are Enterprise, so we don't use them. Our own toolbar and the tracker replace them.

**Theme.** Use the Theming API (`themeQuartz.withParams`) with our CSS variables, so light, dark and the tenant brand follow automatically:

| AG Grid param | Token |
| --- | --- |
| `backgroundColor` | `var(--surface)` |
| `foregroundColor` | `var(--ink)` |
| `headerBackgroundColor` | `var(--surface-2)` |
| `headerTextColor` | `var(--ink-3)` |
| `borderColor` | `var(--line)` |
| `rowHoverColor` | `var(--surface-hover)` |
| `selectedRowBackgroundColor` | `var(--brand-soft)` |
| `accentColor` | `var(--brand)` |
| `fontFamily` | `var(--font-sans)` |
| `fontSize` | 13 |
| `headerFontSize` | 12 |
| `headerFontWeight` | 600 |
| `rowHeight` | 40 |
| `headerHeight` | 40 |
| `wrapperBorderRadius` | `var(--radius)` |

If a param does not accept `var(...)`, resolve it from the computed style at mount and on theme and tenant change.

**Size.** The box is 440 px: a 40 px header plus 10 rows of 40 px. Rows scroll inside it, with the header sticky. The Tender column shows two lines (title, then issuer · city), so its row height is 48. The box stays 440 px, showing about 8½ rows, and the rest scroll.

**Toolbar**, above the grid, one line:
- **Sort** (always one): a select "Sort: Newest first · Highest value · Due soonest".
  - Newest sorts by captured date, descending.
  - Highest value sorts by value in tenant currency.
  - Due soonest sorts by submission deadline, ascending; tenders with no deadline go last.
  - Clicking a column header applies that column's sort instead. The select then reads "Sort: {column}" and offers the three presets. Removing a header sort returns to the preset, **so the table is never unsorted**.
- **Search**: quick filter across TID, title, issuer and city.
- **Filters**: chip dropdowns with count badges.
  - On portfolio dashboards: Stage, Status (Live · Closed · All; default Live), Sector, Country, Owner, Health.
  - Stage dashboards filter by Step, Health and Owner.
  - These use AG Grid's external filter (Community). Column filters for number and date are allowed on value and deadline columns.
- **Active chips**, with "Clear all".
- **"n of m"** on the right.

**Columns.** Each is defined once in a column registry and picked by ID per dashboard. Shared columns:

| Col ID | Header | Content |
| --- | --- | --- |
| `tid` | TID | Mono. Pinned left |
| `tender` | Tender | Short title (bold) / issuer · city (small). Pinned left. Min width 280 |
| `stage` | Stage | Chip "2 · Sourcing" plus the step in small text ("RFQs out") |
| `owner` | With | The person the tender waits on now: avatar and name. Tooltip: role |
| `team` | Team | Sector team from the tenant data ("Water team") |
| `value` | Value | `Money`, tenant currency. A converted amount shows its original on hover |
| `due` | Submission | `When`: date, local time, "in 63 days · 39 working days". Red if under the tender's time-to-prepare |
| `nextGate` | Next gate | DG1 / DG2 / DG3 chip with the SLA if it is open, or the next milestone |
| `health` | Health | `StatusPill` from the health vocabulary below |
| `source` | Source | Portal name + reference; the source popover (below) |
| `captured` | Captured | Date |
| `country` | Country | Name, for multi-country tenants |
| `sector` | Sector | Tenant sector names |
| `fit` | Fit | 0–100 with a `ThresholdBar` against the pursue threshold |
| `win` | Win | Win probability ± band (Stage 3 onwards only; otherwise blank, explained by tooltip) |
| `lastActivity` | Last activity | Relative time, from the lifecycle |

Stage-specific columns are listed per dashboard in §10.

**Health vocabulary** (one set, table and tracker):

| State | Meaning |
| --- | --- |
| On track | Nothing breached; SLA above 25% |
| At risk | Less than 25% of an SLA left, or an open blocker with a named owner |
| Overdue | An SLA or internal deadline breached |
| Blocked | A hard block: eligibility Fail, or a mandatory gap within 5 working days of submission |
| Won · Lost · Discarded · No-bid · Rejected · Withdrawn | Closed states. Only shown when Status is Closed or All |

**Source popover.** It shows:
- portal or mailbox, reference, captured time, and the notice URL as copyable text;
- "Open document" when the platform holds the file (the hero booklet, the real sample PDFs).

Synthetic tenders use URLs on the reserved `.example` domain (e.g. `https://etimad.example/tenders/ECWS-PRJ-2026-0147`). These are never clickable links, so nothing points at a real portal.

**Row click** (or Enter, or Space) selects the row and opens the tracker (Z6). Double-click, or the tracker's "Open tender", opens `/tenders/:id`.

**Empty state:** "No tenders match these filters." with "Clear all".

---

## 6. Main view: the Graph (Recharts)

**User decision, 2026-09-26: bars per stage and a measure switch.** It replaces "Line by default" and the metric select.

- **Library:** `recharts`. **Bars only:** one bar per stage (portfolio) or per step (stage dashboard), with its value above it.
- **X-axis:**
  - **Portfolio dashboards:** the nine stages by short name, "1 Intake" … "9 Results". Gate markers sit between stages as dashed vertical reference lines labelled DG1 (after 1), DG2 (after 3) and DG3 (after 7).
  - **Stage dashboards:** the steps of that stage, in order (§8.2).
- **Measure:** three buttons in the graph toolbar, **Tenders · Value · Weighted**, then a small **More** select with the dashboard's other metrics (§10). A button shows only when the dashboard has that measure and the viewer may see it. The common set is:

| Metric | Where | Kind | Definition |
| --- | --- | --- | --- |
| Tenders now (default) | button | state | Live tenders in each stage or step now |
| Value now | button | state | Σ value in tenant currency, same set |
| Weighted value now | button | state | Σ value × win probability, DEC-4's rule (below) |
| Tenders in the period | More | flow | Tenders that were in the stage or step at any time in the window |
| At risk or overdue now | More | state | Health At risk, Overdue or Blocked |
| Average days in stage | More | flow | For tenders that left the stage or step in the window: mean days spent there |

- **Weighted** (portfolio and Stage 3): value × win probability over bids whose Bid / No-Bid pack has been issued, the same rule as DEC-4, so the Stage 3 bar equals the Weighted pipeline tile. No other stage carries a win probability, so those stages show no bar and one line under the toolbar says why. Win probability follows `see.positions` tender by tender: a tender the viewer may not see is left out and the line says "N tenders not counted: win probability is masked for your role". A viewer who can see none of them gets no Weighted button.
- **Comparison** ("Compare", on by default): a ghost bar (dashed outline, same hue, light fill), a little wider, behind each bar:
  - for **state** metrics: the same metric **at the start of the window** (e.g. 7 Feb);
  - for **flow** metrics: the **previous period**;
  - Weighted and the "now only" metrics have no comparison, and the legend says so.
- **Target line:** drawn only for a measure whose target is defined in `src/data`. None of the graph measures has one yet, so no line is drawn.
- **Tooltip:** stage or step name · value · comparison value · count if the metric is value · "Click to open Sourcing" (portfolio) or "Click to see these tenders" (stage).
- **Click:**
  - **Portfolio, and the viewer can open the stage's dashboard** (`can(person, 'stage.view', { stage })`): navigate to `/stages/:n?period=…`. This is **the same page the stage owner uses as home.**
  - **Otherwise, and on stage dashboards:** switch to the Table, filtered to that stage or step.
- **Accessibility:**
  - The measure buttons are a radio group; More is a labelled select.
  - The chart has `role="img"` and an `aria-label` summary ("Tenders now by stage: Intake 12, Sourcing 2, …"), including the note lines.
  - A visually hidden `<table>` carries the same data.
  - Keyboard: Recharts' accessibility layer moves between bars; Enter on a focused bar does the click.
- **Colours (user decision, 2026-09-28: "one colour: blue or some smooth colour"):** bars use `var(--blue)` whatever the tenant's brand, because they are one measure, and the tenant's accent (Qurain's crimson, Dafna's gold) would read as danger or warning. The ghost bar is the same blue at about 12% with a dashed blue outline. Gate lines and their labels are dashed `var(--violet)`, the colour of decision gates everywhere (the funnel's gate labels, the tracker's diamonds). A target line is dashed `var(--orange)`. Axis text uses `var(--ink-3)` at 11–11.5 px. No animation. The accent stays on controls: buttons, the Compare box, the selected row.
- **The legend** names the bar, the ghost (or "No comparison for this measure"), the target when drawn, and **"Decision gates"** with a short dashed violet line when the gates are drawn. The legend is decoration for screen readers, which read the chart's summary and hidden table.
- **"How to read this graph"**, an ⓘ at the end of the legend. It opens on hover, keyboard focus and tap; Esc closes it; at most 320 px wide. One line per mark drawn for this measure and viewer, each with its mark drawn as in the plot, then what a click does. `buildGraph` writes it (`GraphVM.key`). For Tenders now on a portfolio dashboard:
  - "Blue bar: tenders in each stage now. One colour, because it is one measure." (On a stage dashboard "in each step"; for a flow measure "in the period"; for Average days "in each stage, for tenders that left it in the period".)
  - "Pale dashed bar: the same measure at the start of the window, Sat 7 Feb, so you can see what grew or shrank." (A flow measure: "in the previous period, Thu 8 Jan – Fri 6 Feb 2026". Only with a comparison, and only while Compare is on.)
  - "Violet dashed line: a decision gate (DG1, DG2, DG3), between the stages it closes." (Portfolio only.)
  - "Orange dashed line: the target, {value}." (Only when a target is drawn.)
  - Then, muted, what a click does, following the bars' own drills (Click, below): "Click a bar to open that stage's dashboard.", "Click a bar to see those tenders in the table.", or, when some stages open and some filter (the Bid Manager's stage 9), "Click a bar to open that stage's dashboard, or to see its tenders in the table where you can't open it."
- **Empty:** "No tenders in these stages in this period.", or the measure's own line (for Weighted: "No bid has a win probability yet: it is set when the Bid / No-Bid pack is issued.").

---

## 7. The tender tracker

It opens under the main view for the selected row. It is a card at full width.

```
T-2026-109 · Tabuk water transmission pipeline, Phase 1 · SAR 260.0 M · [On track]            ×
                                     ○ Stage  ◇ Decision gate │ ✓ Done  ● Now  ✕ Stopped here
                 ░░░░░░░░░░░░░░                                  ░░░░░░░░░░░░░░
       (✓) ─────────── ◆✓ ──────────── (●) ─────────── ( ) ──────────── ◇  ── … S4–S7 ◇ DG3 S8 S9
     Intake           DG1           Sourcing      Bid decision        DG2
     [5 d]          [Pursue]      [4 d so far]
 28 Feb – 4 Mar   4 Mar 11:20     since 4 Mar
      (AQ)       (OS) · on time       (JM)
                 ░░░░░░░░░░░░░░                                  ░░░░░░░░░░░░░░
┌ Now: 2 · Sourcing · RFQs out ──────────────────────────────────────────────────────────┐
│ With     Joseph Mathew, Procurement Lead                                               │
│ Team     Water team: Omar Siddiqui (Bid Manager), 4 engineers, 2 estimators            │
│ Status   9 of 9 packages issued · 27 RFQs · Thu 5 Mar 10:05 · replies due Sun 15 Mar   │
│ Next     Quotes in → levelling → Bid / No-Bid pack · Submission Sun 10 May (39 wd)     │
│ Blocker  None                                                                          │
└──────────────────────────────────────────────────────────────── [Open tender] ────────┘
```

**Nodes.** One per stage and one per gate, in lifecycle order: S1 · DG1 · S2 · S3 · DG2 · S4 · S5 · S6 · S7 · DG3 · S8 · S9.
- **User decision, 2026-09-28: decision gates stand out at first glance.** Circles and rounded squares, both green when done, looked alike. Now a gate differs from a stage in shape **and** colour, and each mark keeps its glyph, so status is never colour alone:
  - **Stage: a circle.** Done: green with ✓. Now: a blue ring with a dot ●. Not reached: a grey outline. Stopped here: red with ✕.
  - **Gate: a diamond,** on a faint violet band behind the node and its text, the full height of the track. Passed: violet with ✓. Open or not reached: a violet outline (open adds a dot ●). On hold: orange with ‖. Stopped here: red with ✕.
  - The line between nodes is green between done nodes, and grey after.
  - A small key sits above the track, drawn with the real marks: "○ Stage ◇ Decision gate │ ✓ Done ● Now ✕ Stopped here".
- **The same five rows under every node, on one grid, so they line up** (user feedback 2026-09-28: "the text below each stage and DG is inconsistent"):
  1. the mark;
  2. the label: the stage's short name, or "DG1" in violet mono;
  3. a chip: a stage's days ("4 d", or "26 d so far" for the current stage), neutral; a gate's decision (Pursue · Discard · Hold · Bid · No-bid · Approved · Rejected) in its decision colour; "Open" for an open gate. Nothing for a node not reached, with the row's space kept;
  4. when, on one line: a stage's dates ("30 Oct – 3 Nov", or "since 10 Feb"); a gate's decision time ("3 Nov 10:30"), or "since 7 Mar" while it is open;
  5. who: an initials avatar, the stage's owner or the gate's decider (the decider's full name shows on hover). A gate adds "· on time", or "· 3 h late" in red.
  - An optional note sits under the five rows: an open gate's time left ("6 h 10 m left of 24 h"), a re-open, a result.
  - The track has a column minimum of about 88 px: at 1440 it fits the dashboard's card, and in a narrower box it scrolls inside.
  - Screen readers hear each node as one sentence: "DG1, passed, Pursue, Omar Siddiqui, 3 Nov 10:30, on time".
- **A stopped tender** (discarded, no-bid, rejected, withdrawn, lost) shows the stop in red with ✕ and fades every node after it. The reason is the outcome line under the track ("Discarded at DG1 · below the value band · 3 Mar · Omar Siddiqui").
- **A won tender** ends at S9 with "Won · SAR 142.0 M · handover Sun 15 Mar".

**Now card:**
- the current stage and step;
- **With**: the person it waits on, with role;
- **Team**: the sector team and the named bid people;
- **Status**: the step facts in one line;
- **Next**: the next steps and the submission date with working days;
- **Blocker**: the open blocker, or "None".

From a 1280 px window the rows sit in two columns (With, Team, Status | Next, Blocker). The 12 nodes share the tracker's width with no sideways scroll whenever the tracker is at least 900 px wide; a narrower tracker scrolls rather than cut a label (wave 10).

**Masking** applies as everywhere. For example, a Procurement Lead sees "Margin: masked for your role" in a Stage 5 status line.

**A simplification, stated in the ⓘ:** planning, pricing and drafting overlap in real bids. The tracker shows a tender in the stage where its critical work is now; the stage log keeps each stage's own dates.

---

## 8. Sidebar and stage names

### 8.1 Short names (the proposal's names are too long for a sidebar)

| n | Sidebar name | Full name (spec and proposal) | Owner (stage dashboard is their home) | Working screens under it |
| --- | --- | --- | --- | --- |
| 1 | **Intake** | Tender Identification & Screening | Tender Coordinator | Tender radar · Intake queue · Screening · DG1 decisions |
| 2 | **Sourcing** | Subcontractor & Internal Input Orchestration | Procurement Lead | Packages & RFQs · Quote levelling (Suppliers moved to the Company section, §8.3, 2026-09-28) |
| 3 | **Bid decision** | Bid / No-Bid Decisioning | Bid Committee | Bid packs · DG2 approvals |
| 4 | **Planning** | Project Scheduling & Planning | Planning Manager | none (dashboard only) |
| 5 | **Pricing** | Financial & Cost Modelling | Commercial Manager | none |
| 6 | **Proposal** | Proposal Preparation & Drafting | Proposal Manager | none |
| 7 | **Compliance** | Compliance & Risk Verification | Compliance / Legal Lead | DG3 approvals |
| 8 | **Submission** | Final Compilation & Submission | Bid Manager | none |
| 9 | **Results** | Post-Award Oversight & Learning | Project Director | none |

The full name appears as the stage dashboard's sub-title and in the ⓘ of the stage chip. Everywhere else uses the short name with its number ("2 · Sourcing").

### 8.2 Steps inside each stage (the stage graph's x-axis, and the tracker's "step")

| Stage | Steps, in order |
| --- | --- |
| 1 Intake | Captured · Documents in · Validating · Screened · Awaiting DG1 |
| 2 Sourcing | Packaging · Shortlisting · RFQs out · Quotes in · Levelling · Best-fit approved |
| 3 Bid decision | Pack in preparation · Inputs complete · Pack issued · Positions in · Awaiting approval |
| 4 Planning | Baseline drafting · Resource loading · M2 reconciliation · Released |
| 5 Pricing | Cost build-up · Scenarios · Finance check · Price approved |
| 6 Proposal | Sections assigned · Drafting · Review · Locked |
| 7 Compliance | Matrix · Gaps closing · Redlines · DG3 pack issued |
| 8 Submission | Assembling · Signatures · Submitted · Awaiting result |
| 9 Results | Result received · Handover or debrief · Lessons captured |

### 8.3 Sidebar

```
Dashboard                  ← the person's home (§10)
Calendar
Tender library             ← every tender's files (plan 030; tender.view)
Debriefs                   ← every bid that ended, why, and what we learned (plan 037; debrief.view)
My requests                ← only for people who owe inputs
STAGES                     ← section label
1 Intake            ▸      ← the header opens the stage dashboard; ▸ expands its screens
   Tender radar · Intake queue · Screening · DG1 decisions [DG1]
2 Sourcing          ▸
   Packages & RFQs · Quote levelling
3 Bid decision      ▸
   Bid packs · DG2 approvals [DG2]
4 Planning
5 Pricing
6 Proposal
7 Compliance        ▸
   DG3 approvals [DG3]
8 Submission
9 Results
COMPANY                    ← section label
Company profile            ← /company: Overview, Credentials, Projects, Financials, Teams and partners
Suppliers                  ← /suppliers: the supplier master (supplier.view)
────────────────────────── (pinned to the bottom)
Administration      ▸      ← Head of Tendering only
Settings
```

**Rules:**
- **Visibility.** Each stage appears only if `can(person, 'stage.view', { stage: n })`. Each child appears only if its own capability allows (as in plan 003's `navFor`).
- **Stage headers.** A header is a link to `/stages/n`, unless that dashboard is the person's home: then it is a plain label (their Dashboard item covers it), and it still expands.
- **Expansion** is remembered per viewer (`ctai.nav.open`, try/catch). The group holding the current route is always open.
- **Gate chips** DG1, DG2 and DG3 sit beside their entries: outline normally, orange when something waits on the viewer, red when an SLA is breached. Badges are derived, never typed.
- **Bottom group.** Administration and Settings are pinned to the bottom of the rail, with a divider. The collapsed rail keeps them at the bottom too.
- **Debriefs** (plan 037, 2026-09-30) sits in the top group, after Tender library, for everyone with `debrief.view`: the Head of Tendering, the CEO, committee members and the Project Director company-wide, and Bid Managers for their own tenders. It is the archive the KPI team reads (spec §20.4). The Tender Coordinator, Procurement, the other stage owners, Finance and HR don't see it.
- **Company section.** Two entries under the label "Company": **Company profile** (`company.view`) and **Suppliers** (`supplier.view`: the Head of Tendering, the CEO and the Procurement Lead). Suppliers is no longer a Stage 2 screen, so one page has one entry; on `/suppliers` the Suppliers entry is highlighted and Stage 2 stays folded unless opened. **User decision, 2026-09-28** (plan 027c): "The company profile and procurement/supplier pages … should be present separately in the menubar."

**The Pipeline page is dropped.** The Head of Tendering's dashboard table is the all-tenders register.

**Who sees which stages** (`STAGE_ACCESS`, used by `stage.view`):

| Role | Stages | Home |
| --- | --- | --- |
| Head of Tendering (`hot`) | 1–9 | Portfolio, all tenders |
| CEO (`exec`) | 1–9 (read only) | Portfolio, all tenders |
| Bid Manager (`bid`) | 1–8 (assigned tenders act; others read) | Portfolio, my tenders |
| Tender Coordinator (`coord`) | 1 | Stage 1 |
| Procurement Lead (`proc`) | 2 | Stage 2 |
| Committee members (`member`) | 3 | Stage 3 |
| Planning Manager (`plan`) | 4 | Stage 4 |
| Commercial Manager (`comm`) | 5 (and Stage 2's levelling screen, as today) | Stage 5 |
| Proposal Manager (`prop`, new for GCC tenants) | 6 | Stage 6 |
| Compliance / Legal Lead (`comp`) | 7 | Stage 7 |
| Project Director (`dir`) | 9 | Stage 9 |
| Finance (`fin`), HR (`hr`) | none | My requests |
| Supplier, Catalyst operator | none | Their own shells (plans 008, 011) |

Stage owners see **every tender in their stage** in the tenant (tenant scope). It is their function's queue. Masking still applies.

**Decided 2026-09-26:** the stage owners (Planning, Commercial for Pricing, Compliance, Project Director) see every tender in the company, not only their stage's.
- Margin, quotes, win probability and positions stay masked per [roles-and-access.md](roles-and-access.md) §9.
- Restricted tenders show only to cleared people.
- The Commercial Manager sees margin and quotes.

---

## 9. Gate authority (changes)

| Gate | Who decides | What changes |
| --- | --- | --- |
| DG1 · Pursue or Discard | The assigned Bid Manager. The Head of Tendering may record it as a delegate (R7) | Nothing |
| DG2 · Bid / No-Bid | **Committee members record named positions; the Head of Tendering approves** | The CEO is an ordinary member (seat `ceo`), no longer the chair. Voting members: CEO, CFO, Technical Director, Operations Director, Sector Head. **Quorum: 3 of 5 positions recorded.** "Approve Bid" and "Record No-Bid" are disabled until quorum is met, and the disabled button says why. If the approval goes against the majority of positions, a reason is required, and the record shows "Approval differs from majority". The Head of Tendering keeps the secretary function (recording a position stated in a meeting, marked as such). Re-opening needs the Head of Tendering's approval |
| DG3 · Final bid approval | **The Head of Tendering** | New in the demo: a simple gate screen. The Compliance / Legal Lead issues the DG3 pack; the Head of Tendering approves submission or rejects (do not submit) with reason codes. "Send back to Compliance" with a note is an action, not a decision. SLA 48 h from pack issue |

**DG3 screen** (gate archetype D, with the evidence summary on the left and the decision on the right):
- **Evidence:**
  - requirements evidenced and mandatory gaps (must be 0);
  - final price and margin against the DG2 conditions (e.g. "Minimum margin 9%: met, 10.2%");
  - initial guarantee amount and validity against the requirement;
  - contract deviations and qualifications;
  - top risks with owners;
  - signatories ready;
  - portal and deadline.
- **Decision:** Approve submission · Reject. It shows a record preview, writes an audit entry, and has no Undo (re-open with a reason).

**Capability changes** (in `data/access.ts`):
- **`hot`:**
  - gains `dg2.decide`, `dg3.decide`, `dg3.view`, `reopen.approve`, `portfolio.view` (tenant) and `stage.view` (all);
  - keeps `dg2.secretary`.
- **`exec`:**
  - loses `dg2.decide` and `reopen.approve`;
  - keeps `dg2.position` (seat);
  - gains `portfolio.view` (tenant) and `stage.view` (all, read).
- **`comp`:** gains `dg3.issue` and `dg3.view`.
- **`bid`:** gains `portfolio.view` (assigned), `stage.view` (1–8) and `dg3.view`.
- **`fin`, `hr`:** gain `company.view`, so credential owners can reach their credentials (plan 003 review).
- **`prop`:** gains `tender.view` (tenant), `stage.view` (6) and `input.respond` (own).
- **Reasons, as plain sentences:**
  - `dg2.decide`: "Only the Head of Tendering approves DG2";
  - `dg3.decide`: "Only the Head of Tendering approves DG3";
  - `stage.view`: "Stage {n} is outside your role".

---

## 10. Dashboards by role

Each entry lists the following. Tiles are KPI IDs, and **all six obey §2 and §3.**
- where it is the home;
- its scope;
- the question it answers;
- tiles;
- flow strip;
- action sources;
- table (scope, columns, default sort);
- graph (axis, metrics, click).

### 10.1 Head of Tendering: Portfolio (all tenders)
- **Home of:** `hot`. The same dashboard serves the CEO (§10.2) with different tiles.
- **Question:** *"How many tenders are open to us, are we winning, what do we bid, how many pass screening, are gates decided on time, and which company documents have gaps?"*
- **Tiles** (one row at 1440, left to right; plan 040, user decisions 2026-10-06):
  1. PF-0 Live pipeline (state): "{n} active tenders", new notices still open for bids now; detail "from {N} portals" (distinct portal and client-portal sources among them); reference "Largest · {portal} {n}". Click → Tender radar (when the viewer may open it).
  2. PF-3 Win & Loss (flow): "{won} won · {lost} lost"; detail "{rate}% win rate"; reference "Target · {tenant target}%" ("… from 5 results" under five results); status "Below target" only under target. Najd, 90 days: 14 won · 11 lost, 56%, target 45%.
  3. PF-2 Average ticket size (flow).
  4. PF-7 Tenders accepted (flow): notices that passed the AI first screening in the period; detail "of {captured + re-issued} captured"; reference "Rate · {passed ÷ captured}%". Najd, 30 days: 18 of 194, 9%. Click → Tender radar.
  5. PF-4 Decisions on time (flow): "{on time} of {all} on time"; detail "{k} late" or "None late"; reference "Latest late · {TID}". Tone bands unchanged (100% green, ≥ 90% orange). Click → list panel "Late gate decisions · {period}": one row per late decision, newest first (gate, tender, who decided and role, when the gate opened, when it was decided, the limit, how late); each row opens the tender; the link under it shows all decisions in the table, late first.
  6. SCR-6 Documentation gaps (state): documents in the credentials vault that have expired, or expire before a live bid needs them; detail the first two ("Zakat 30 Apr · GOSI 7 May"); reference "Renew by · {date}"; status "Expired" / "Renew soon"; owner chip. Click → list panel "Company documents": every vault document, gaps first (document and issuer, number, expiry, status Valid · Expiring before a bid · Expired, live bids affected, owner, renewal requested); a row opens the credential; the link under it opens Company › Credentials.
  - PF-1 is renamed **Pursued pipeline** and stays on the CEO's dashboard (§10.2); the Bid Manager's reads "My live bids" (§10.3). CAP-1 Bid-team load leaves this dashboard.
- **Flow strip, PF-5 Decision funnel** (plan 039): Captured (new · previous) → AI screening (passed · screened out) → DG1 (approved · rejected · pending) → DG2 (approved · rejected) → DG3 (approved · rejected) → Won (won · lost · pending), read as one batch narrowing; see §1 Z3.
- **Needs your action:**
  - DG3 approvals;
  - DG2 approvals (with quorum state and pack freshness);
  - re-open requests;
  - booklet purchases awaiting approval;
  - DG1 escalations (breached SLA, or no Bid Manager assigned);
  - renewals for credentials at risk;
  - late inputs on packs due within 24 h;
  - debriefs to sign off (plan 035): "Review the debrief", after the late inputs, the longest waiting first; it opens the tender's Debrief tab;
  - gates without an owner (configuration).
- **Table:**
  - scope: all tenders; Status filter defaults to Live;
  - default columns: `tid` · `tender` · `stage` · `owner` · `team` · `value` · `due` · `nextGate` · `health` · `source`;
  - optional columns: `captured`, `country`, `sector`, `fit`, `win`, `lastActivity`;
  - default sort: Newest first.
- **Graph:**
  - x = the 9 stages;
  - metrics: Tenders now (default) · Value now · Weighted value now (the three buttons) · Tenders in the period · At risk or overdue now · Average days in stage (under More);
  - click → `/stages/n`.

### 10.2 CEO: Portfolio (all tenders, read only)
- **Home of:** `exec`. It uses the same page as §10.1.
- **Tiles:**
  1. PF-1 Live pipeline
  2. PF-3 Win / loss
  3. OUT-3 Value won
  4. DEC-4 Weighted pipeline
  5. DEC-6 Facility headroom
  6. DEC-5 Capacity if won
- **Flow strip:** PF-5.
- **Needs your action:** DG2 positions to record (the CEO is a member). Other items, debrief sign-offs among them (plan 035), show as "Waiting on …" and can't be actioned.
- **Table and graph:** as §10.1; the graph click opens stage dashboards read only.

### 10.3 Bid Manager: Portfolio (my tenders)
- **Home of:** `bid`. Scope: tenders where they are the assigned Bid Manager.
- **Question:** *"What must I decide today, which of my bids are at risk, and what are they waiting on?"*
- **Tiles:**
  1. SCR-1 DG1 due
  2. PF-1 My live bids (scope: assigned)
  3. SCR-5 Eligibility risks
  4. DEC-7 Inputs outstanding
  5. PF-6 Next submission
  6. PF-4 Decisions on time (scope: assigned)
- **Flow strip:** PF-5 for my tenders.
- **Needs your action:**
  - DG1 decisions;
  - queries to approve;
  - packs to issue, and stale packs;
  - DG2 conditions to action;
  - DG3 send-backs to fix;
  - submissions due within 5 working days with something missing.
- **Table:** as §10.1, scoped to my tenders; adds `win`.
- **Graph:** x = the 9 stages. The click opens the stage dashboard for stages 1–8 (read, with actions on my tenders), and filters the table for stage 9.

### 10.4 Stage 1 · Intake
- **Home of:** `coord`. Scope: tenders in Stage 1 (Include decided at DG1 in the period is a toggle).
- **Question:** *"What came in, what must I check, and which deadlines are close?"*
- **Tiles:**
  1. INT-1 Captured (flow; "Captured today" when the period is Today)
  2. INT-5 Fields to check (state)
  3. INT-2 Intake to logged (flow, p90 over the period)
  4. INT-4 Sources healthy (state)
  5. INT-3 Missed tenders (flow, over the reconciliations in the period)
  6. INT-10 Documents to buy (state)
- **Flow card:** Captured (new · previous: re-issued notices, and today's duplicates and addenda) → Logged → Screened → Awaiting DG1 → DG1 (pursued · discarded · held). Linked folded into Captured on 2026-09-28 (§1) and became "previous" on 2026-10-06 (plan 039).
- **Needs your action:**
  - validation items (blocking DG1 first);
  - booklet purchases (requested; waiting on the Head of Tendering);
  - addenda to confirm;
  - possible re-tenders;
  - clarification drafts;
  - for a Bid Manager viewing: DG1 decisions due.
- **Table:**
  - columns: `tid` · `tender` · `source` · `captured` · `stage` (step) · **Fields to check** (n, blocking in red) · `fit` · **Eligibility** (Pass / At risk / Fail counts) · **Documents** (bought, or fee and purchase deadline) · **Language** (EN / AR / EN+AR) · **DG1 due** (SlaClock) · `due`;
  - default sort: Newest.
- **Graph:**
  - x = Stage 1 steps;
  - metrics: Tenders now · Value now · Fields to check now · Tenders in the period · Average hours in step.

### 10.5 Stage 2 · Sourcing
- **Home of:** `proc`. Scope: tenders in Stage 2.
- **Question:** *"Which packages aren't covered, who hasn't replied, and are the quotes comparable?"*
- **Tiles:**
  1. SRC-1 RFQ clock
  2. SRC-2 Packages covered
  3. SRC-3 Replies on time (state: live tenders)
  4. SRC-4 Overdue RFQs
  5. SRC-5 Open clarifications
  6. SRC-6 To level
- **Flow strip** (tenders entering each step): Packaging → Shortlisting → RFQs out → Quotes in → Levelling → Best-fit approved → Moved on · Stopped.
- **Needs your action:** packaging to approve · shortlists · RFQs to send (clock) · non-responder escalations · adjustments to confirm · best-fit to approve · supplier commercial questions.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · **Packages covered** (7 / 11) · **Packages issued** (9 / 9, with the RFQ count, e.g. "27 RFQs") · **Overdue RFQs** (n, escalated) · **To level** · **Not covered** (% of BOQ value) · **Replies due** · **Bid Manager** · `due`;
  - **Replies due** is the next reply date still ahead, after any extensions. When none is ahead, it falls back to the original reply date. (Decided 2026-09-26.)
  - default sort: Due soonest.
- **Graph:**
  - x = Stage 2 steps;
  - metrics: Tenders now · Packages not covered now · Overdue RFQs now · Value now · Average days in step.

### 10.6 Stage 3 · Bid decision
- **Home of:** committee members (`member`).
- **Also opened by:** the Head of Tendering (who approves DG2), the CEO and the Bid Manager. Scope: tenders in Stage 3.
- **Question:** *"Which bids are we being asked to decide, is the evidence sound, and what would winning them do to capacity and the bank facility?"*
- **Tiles:**
  1. DEC-1 Awaiting DG2 (sub: positions n of 5, quorum, SLA)
  2. DEC-7 Inputs outstanding
  3. DEC-8 Stale packs
  4. DEC-4 Weighted pipeline
  5. DEC-6 Facility headroom
  6. DEC-5 Capacity if won
- **Flow strip:** Pack in preparation → Inputs complete → Pack issued → Positions in → Awaiting approval → DG2 (bid · no-bid).
- **Needs your action:**
  - member: record my position, declare a conflict;
  - Head of Tendering: approve DG2 (enabled at quorum), nudge members;
  - Bid Manager: issue the pack, re-run a stale pack.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · `value` · `win` · **Margin range** (masked per role) · **Facility after bond** · **Positions** (2 of 5) · **Quorum** (met / 1 more needed) · **DG2 SLA** · **Pack** (fresh / stale) · **Bid Manager**;
  - default sort: Due soonest.
- **Graph:** x = Stage 3 steps; metrics: Tenders now · Value now · Weighted value now · Average days in step.

### 10.7 Stage 4 · Planning
- **Home of:** `plan`. Scope: tenders in Stage 4.
- **Question:** *"Whose programme must I release next, and which ones don't fit the employer's time or our people?"*
- **Tiles:**
  1. PLN-1 Baselines due
  2. PLN-2 Programme over time
  3. SRC-9 Long-lead at risk
  4. PLN-4 Resource clashes
  5. PLN-5 Re-plans (flow)
  6. PLN-6 M2 on time (flow)
- **Flow strip:** Baseline drafting → Resource loading → M2 reconciliation → Released → Moved on · Stopped.
- **Needs your action:** baselines to release · re-plans triggered (addendum, quote lead time) · M2 reconciliations with Commercial · resource clash warnings.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · **Duration** (planned vs required, months) · **Float** (critical path, days) · **Long-lead at risk** · **Peak manpower** · **Baseline due** · **M2 due** · `owner` · `due`;
  - default sort: Due soonest.
- **Graph:** x = Stage 4 steps; metrics: Tenders now · Value now · Average days in step.

### 10.8 Stage 5 · Pricing
- **Home of:** `comm`. Scope: tenders in Stage 5.
- **Question:** *"Which prices are due, are they built on real quotes, and do they clear the margin the committee set?"*
- **Tiles:**
  1. PRC-1 Prices due
  2. PRC-2 Cost lines sourced
  3. PRC-3 Below minimum margin
  4. PRC-4 Estimated share
  5. PRC-5 Re-prices (flow)
  6. PRC-6 Finance checks pending
- **Flow strip:** Cost build-up → Scenarios → Finance check → Price approved → Moved on · Stopped.
- **Needs your action:** prices to approve · re-prices triggered · margins below the DG2 condition · Finance confirmations outstanding.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · **Estimated price** · **Base margin** (masked per role) · **Minimum margin** (DG2 condition or tenant floor) · **Sourced** (%) · **Estimated** (%) · **Finance check** · **M2 due** · `owner` · `due`;
  - default sort: Due soonest.
- **Graph:** x = Stage 5 steps; metrics: Tenders now · Value now · Average days in step.

### 10.9 Stage 6 · Proposal
- **Home of:** `prop`. Scope: tenders in Stage 6.
- **Question:** *"Which sections are late, and will each proposal clear the pass mark?"*
- **Tiles:**
  1. PRP-1 Sections late
  2. PRP-2 Sections locked
  3. PRP-3 Below pass mark
  4. PRP-4 SME tasks overdue
  5. PRP-5 Reviews held (flow)
  6. PRP-6 Content reused
- **Flow strip:** Sections assigned → Drafting → Review → Locked → Moved on · Stopped.
- **Needs your action:** late sections (chase the SME) · reviews to hold · sections to approve and lock.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · **Sections locked** (11 / 18) · **Late sections** · **Simulated score** (vs pass mark) · **SME tasks overdue** · **Red-team review** (date) · `owner` · `due`;
  - default sort: Due soonest.
- **Graph:** x = Stage 6 steps; metrics: Tenders now · Value now · Late sections now · Average days in step.

### 10.10 Stage 7 · Compliance
- **Home of:** `comp`. Scope: tenders in Stage 7.
- **Question:** *"Is every mandatory requirement evidenced, which contract positions are open, and what is waiting for DG3?"*
- **Tiles:**
  1. CMP-1 Mandatory gaps
  2. CMP-2 Requirements evidenced
  3. CMP-3 Redlines open
  4. CMP-4 Risks without owner
  5. CMP-5 DG3 waiting
  6. CMP-6 DG3 on time (flow)
- **Flow strip:** Matrix → Gaps closing → Redlines → DG3 pack issued → DG3 (approved · rejected).
- **Needs your action:**
  - Compliance: gaps to close, redlines to accept, amend or escalate, DG3 packs to issue;
  - Head of Tendering: DG3 approvals.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · **Evidenced** (%) · **Mandatory gaps** · **Redlines open** · **Risks without owner** · **DG3** (SLA or decision) · `owner` · `due`;
  - default sort: Due soonest.
- **Graph:** x = Stage 7 steps; metrics: Tenders now · Value now · Mandatory gaps now · Average days in step.

### 10.11 Stage 8 · Submission
- **Owner:** the Bid Manager (`bid`), who reaches it from the sidebar; their home stays the portfolio. Scope: tenders in Stage 8.
- **Question:** *"What is due, is each package complete and signed, and are the guarantees in order?"*
- **Tiles:**
  1. SUB-1 Submissions due
  2. SUB-2 On-time submissions (flow)
  3. SUB-3 Packages ready
  4. SUB-4 Signatures pending
  5. SUB-5 Awaiting result
  6. SUB-6 Bid bonds
- **Flow strip:** Assembling → Signatures → Submitted → Awaiting result → Moved on (result received) · Stopped (withdrawn).
- **Needs your action:** submissions due within 5 working days with gaps · signatures to chase · guarantees to issue or extend.
- **Table:**
  - columns: `tid` · `tender` · `stage` (step) · **Deadline** (local time, working days) · **Portal** · **Package ready** (%) · **Signatures** · **Bid bond** (amount · valid to) · **Receipt** · **Opening** · `owner`;
  - default sort: Due soonest.
- **Graph:** x = Stage 8 steps; metrics: Tenders now · Value now · Average days in step.
- **A tender approved at DG3 in the demo** enters Stage 8 with facts read from its DG3 evidence (plan 016a): the initial guarantee as issued, the signatories not yet ready as signatures pending, the register's bid opening, and package ready = the Stage 7 requirements evidenced ÷ all requirements.

### 10.12 Stage 9 · Results
- **Home of:** `dir` (Project Director). The Head of Tendering and the Bid Office use it too. Scope: tenders with a result that are not yet closed.
- **Question:** *"What did we win and lose, why, and what have we handed over or learned?"*
- **Tiles:**
  1. OUT-1 Hit rate (flow, with n)
  2. OUT-3 Value won (flow)
  3. RES-1 Results overdue
  4. RES-2 Handovers pending
  5. OUT-6 Why we lose (flow)
  6. RES-3 Lessons captured (flow)
- **Flow strip:** Result received (won · lost) → Handover or debrief → Lessons captured → Closed.
- **Needs your action** (plan 035): handovers to start · **Record the debrief**, one row per debrief due, overdue or sent back that ended in the last 30 days or is still live at Stage 9 (lost: the place and the employer's debrief booking, or "Ask the employer for a debrief"; opens the tender's Debrief tab) · results overdue. The old "debriefs to hold" and "lessons to record" rows are this one row, so a tender shows once.
- **Table:**
  - columns: `tid` · `tender` · **Result** · `value` · **Our rank** (2 of 6) · **Gap to winner** (%) · **Loss reason** · **Predicted at DG2** · **Lessons** · `owner`;
  - default sort: Newest (result date).
- **Graph:** x = Stage 9 steps; metrics: Tenders now · Value now.

### 10.13 My requests (Finance, HR, and anyone who owes inputs)
- **Home of:** `fin`, `hr`. Also in the sidebar for anyone with `input.respond`. **Four tiles:**
  1. REQ-1 Open requests
  2. REQ-2 Due in 48 h
  3. REQ-3 Late
  4. REQ-4 Submitted (flow)
- **Flow strip:** Requested → In progress → Submitted → Accepted.
- **Needs your action:** the open requests themselves.
- **Table:** Tender · What's asked · For (pack section) · Requested by · Due · Status. The row opens the focused input form (catalogue §C.6).
- **No graph.**

---

## 11. New KPIs (additions to the catalogue dictionary)

Format: **ID · tile label · kind** — formula (with the period where it applies). ⓘ is the "What it means" text, shown verbatim in the popover. Tone is green / orange / red unless the entry says information.

### 11.1 Portfolio (PF)
| ID | Label · kind | Formula | ⓘ What it means | Tone | Drill |
| --- | --- | --- | --- | --- | --- |
| PF-1 | Live pipeline · state | Count and Σ value (tenant currency) of tenders pursued at DG1 and not yet closed: Stages 2–8, including submitted bids awaiting a result. Sub: "{in} in · {out} out since {window start}" (in = pursued at DG1; out = no-bid, rejected at DG3, withdrawn, or a result received) | Every tender we decided to pursue that is still open: being sourced, priced or written, or submitted and waiting for the result | information | Table: Stages 2–8, Live |
| PF-2 | Average ticket size · flow | Mean value of the bids **submitted** in the window. Sub: "n bids · largest {value}". n = 0 → "No bids submitted in this period" | The typical size of what we bid. A rising average with the same team means bigger, riskier bids | information | Table: submitted in the window |
| PF-3 | Win / loss · flow | Results received in the window: "{won} won · {lost} lost". Sub: "Win rate {won ÷ (won + lost)} (n = …) · {value won} won". Withdrawn and cancelled tenders are excluded | Of the results we received in this period, how many we won. With few results the rate swings, so the counts are shown first | vs the tenant's target hit rate, only when n ≥ 5; otherwise neutral | Table: results in the window |
| PF-4 | Decisions on time · flow | Gate decisions (DG1, DG2, DG3) recorded within their SLA ÷ gate decisions in the window. Sub: "{n} of {m} · {k} late: {first}" | How often DG1, DG2 and DG3 were decided within their time limits (24 h, 24 h and 48 h by default). A late decision takes days out of bid preparation | 100% green; ≥ 90% orange; else red | Table: decisions in the window, late first |
| PF-5 | Decision funnel · flow (strip) | Counts in the window: notices captured; DG1 pursued · discarded · held; DG2 bid · no-bid; DG3 approved · rejected; bids submitted; results won · lost | Decisions made in this period at each gate, whichever tenders they were on. It is not one group of tenders followed through, so the steps need not add up | information | Each number → table filtered to those tenders |
| PF-6 | Next submission · state | The nearest submission deadline among my live bids: date, local time, working days left, TID. Sub: second nearest | The next bid that must leave the building, and how many working days are left. GCC weekends and holidays are taken out | orange ≤ 5 wd; red ≤ 2 wd with anything missing | Tender tracker |

**Label change:** SCR-6 shows as **"Credentials at risk"**, because what counts is expiry before a live bid's opening, not expiry as such. Its ⓘ: "Company certificates that expire before a live bid is opened. Saudi tenders require them to be valid on the opening date, so an expiry here can disqualify the bid."

### 11.2 Stage 4 · Planning (PLN)
| ID | Label · kind | Formula | ⓘ What it means | Tone |
| --- | --- | --- | --- | --- |
| PLN-1 | Baselines due · state | Stage 4 tenders whose baseline release date is ≤ 5 working days away or past. Sub: first due | Programmes that must be released soon so pricing and the proposal can use them | orange ≤ 5 wd; red past |
| PLN-2 | Programme over time · state | Stage 4 tenders whose planned duration exceeds the employer's required duration. Sub: worst ("20 vs 18 months") | Our programme is longer than the employer allows. Either re-sequence, or the bid needs a qualification the committee has seen | any red |
| PLN-4 | Resource clashes · state | Stage 4–8 tenders whose peak key resources (named people, cranes, TBMs) overlap with another bid or a live project in the same weeks | Two bids planning on the same people or plant at the same time. One of the programmes will not hold | any orange |
| PLN-5 | Re-plans · flow | Re-plans triggered in the window (addendum, quote lead time, scope change). Sub: p90 turnaround vs the 4 h target | How often the programme had to change, and how fast we turned it round | p90 ≤ 4 h green; else orange |
| PLN-6 | M2 on time · flow | M2 reconciliations (programme and cost model agree) completed by their planned date ÷ due in the window | M2 is the checkpoint where the programme and the price agree. A late M2 means pricing on an old programme | 100% green; ≥ 80% orange |

SRC-9 (Long-lead at risk) is reused, scoped to Stage 4 tenders.

### 11.3 Stage 5 · Pricing (PRC)
| ID | Label · kind | Formula | ⓘ What it means | Tone |
| --- | --- | --- | --- | --- |
| PRC-1 | Prices due · state | Stage 5 tenders whose price approval is due within 5 working days, or past | Prices that must be approved soon to hold the submission date | orange ≤ 5 wd; red past |
| PRC-2 | Cost lines sourced · state | Share of BOQ value priced from a levelled quote or a rate-library norm, across Stage 5 tenders. Sub: the lowest tender | How much of the price rests on real quotes or proven rates rather than guesses | ≥ 95% green; ≥ 85% orange |
| PRC-3 | Below minimum margin · state | Stage 5 tenders whose base-scenario margin is below the DG2 condition or the tenant floor. Sub: worst ("7.8% vs 9.0%") | Bids priced under the margin the committee set. They need a decision, not a quiet submission | any red |
| PRC-4 | Estimated share · state | Share of BOQ value on estimated rates (no quote, no norm), across Stage 5 tenders | The part of the price nobody has quoted yet | ≤ 5% green; ≤ 10% orange |
| PRC-5 | Re-prices · flow | Re-prices triggered in the window (addendum, FX, quote change). Sub: p90 turnaround vs the 2 h target | How often the price had to move, and how quickly we moved it | p90 ≤ 2 h green |
| PRC-6 | Finance checks pending · state | Stage 5 tenders waiting on Finance to confirm bonds, insurances and head-office recovery | Prices that can't be approved until Finance confirms the costs only they know | any orange |

### 11.4 Stage 6 · Proposal (PRP)
| ID | Label · kind | Formula | ⓘ What it means | Tone |
| --- | --- | --- | --- | --- |
| PRP-1 | Sections late · state | Proposal sections past their internal due date and not locked. Sub: tender with most | Sections that are behind. Late sections get written in a hurry, and it shows in the score | any orange; any on a bid due ≤ 5 wd red |
| PRP-2 | Sections locked · state | Locked ÷ total sections across Stage 6 tenders. Sub: least advanced tender, with days left | How much of each proposal is final | information |
| PRP-3 | Below pass mark · state | Stage 6 tenders whose simulated technical score is below the published pass mark. Sub: worst ("68 vs 70") | Proposals that would fail the technical evaluation as they stand. A failed technical envelope means the price is never opened | any red |
| PRP-4 | SME tasks overdue · state | Specialist writing tasks past due | Specialists who owe text. This is usually where proposals slip | any orange |
| PRP-5 | Reviews held · flow | Red-team reviews held in the window ÷ due in the window | Whether proposals are being reviewed before they lock | 100% green |
| PRP-6 | Content reused · state | Share of drafted text reused from past bids, with the source cited | How much of the writing starts from proven, cited material | information |

### 11.5 Stage 7 · Compliance (CMP)
| ID | Label · kind | Formula | ⓘ What it means | Tone |
| --- | --- | --- | --- | --- |
| CMP-1 | Mandatory gaps · state | Mandatory requirements without accepted evidence, across Stage 7 tenders | Must-have requirements we can't yet prove. One open gap at submission can exclude the bid | any orange; any within 5 wd of submission red |
| CMP-2 | Requirements evidenced · state | Requirements with evidence attached and checked ÷ all requirements, Stage 7 tenders | How complete the compliance matrix is | 100% green |
| CMP-3 | Redlines open · state | Contract deviations recommended but not yet accepted, amended or escalated | Contract positions still undecided. Each one is price or risk | information; any within 5 wd of submission orange |
| CMP-4 | Risks without owner · state | Risk-register items with no named owner | A risk nobody owns is a risk nobody manages | 0 green; any red |
| CMP-5 | DG3 waiting · state | DG3 packs issued with no decision. Sub: SLA left on the first | Bids ready for final approval by the Head of Tendering | orange < 25% of SLA; red breached |
| CMP-6 | DG3 on time · flow | DG3 decisions within 48 h of pack issue ÷ DG3 decisions in the window | Whether final approvals are keeping pace with the submission dates | 100% green; ≥ 90% orange |

### 11.6 Stage 8 · Submission (SUB)
| ID | Label · kind | Formula | ⓘ What it means | Tone |
| --- | --- | --- | --- | --- |
| SUB-1 | Submissions due · state | Deadlines in the next 14 days. Sub: first ("Thu 12 Mar, 10:00 · 4 working days") | The bids that must be submitted soon, with working days left | orange ≤ 5 wd |
| SUB-2 | On-time submissions · flow | Submitted before the deadline ÷ submitted in the window | Whether every bid made it in time. A late bid is not opened | 100% green; else red |
| SUB-3 | Packages ready · state | For bids due within 5 working days: documents assembled and checked ÷ required. Sub: least ready | How complete the submission packages are for the next bids out | 100% green; ≥ 90% orange; else red |
| SUB-4 | Signatures pending · state | Forms awaiting authorised signatories on bids due within 5 working days | Documents that still need a signature and stamp before upload | any orange |
| SUB-5 | Awaiting result · state | Submitted bids with no result: count and value. Sub: oldest ("T-2025-284 · 21 days") | Bids with the employer. Value that may still come in | information |
| SUB-6 | Bid bonds · state | Bids due within 14 days whose initial guarantee is not issued, or whose validity is short of the requirement (KSA: 90 days from opening) | Guarantees that are missing or too short. An invalid guarantee excludes the bid | any red |

### 11.7 Stage 9 · Results (RES)
| ID | Label · kind | Formula | ⓘ What it means | Tone |
| --- | --- | --- | --- | --- |
| RES-1 | Results overdue · state | Submitted bids past the employer's expected award date with no result | Results we should have heard by now. Worth a call to the employer | any orange |
| RES-2 | Handovers pending · state | Won bids whose handover to delivery has not been held. Sub: days since award | Wins that haven't reached the delivery team yet. What we promised in the bid must reach them | orange > 10 days |
| RES-3 | Lessons captured · flow | Results in the window with a debrief record ÷ results in the window | Whether we learn from every result, won or lost | 100% green; ≥ 80% orange |

OUT-1, OUT-3 and OUT-6 keep their catalogue definitions, now with the period applied.

### 11.8 My requests (REQ)
| ID | Label · kind | Formula | ⓘ What it means |
| --- | --- | --- | --- |
| REQ-1 | Open requests · state | Requests to me not yet submitted | Everything the bid teams are waiting for from you |
| REQ-2 | Due in 48 h · state | Open requests due within 48 hours | What to do first |
| REQ-3 | Late · state | Open requests past due | Inputs holding up a pack or a price |
| REQ-4 | Submitted · flow | Requests I submitted in the window | What you've delivered in this period |

### 11.9 ⓘ text for existing KPIs used on dashboards
| ID | ⓘ What it means |
| --- | --- |
| INT-1 | Tender notices the platform picked up from your portals, mailboxes and scanned post |
| INT-2 | How long it takes from a notice arriving to it being logged with an ID. The slowest tenth is shown, because one slow tender is the one that gets missed |
| INT-3 | Tenders on a portal's daily list that we didn't log. It should always be zero |
| INT-4 | Whether each portal and mailbox connection is working. A silent broken source is how tenders get missed |
| INT-5 | Values the agent read with low confidence, or read two different ways. A person checks them. Pursue stays locked while blocking ones are open |
| INT-10 | Tenders whose booklet must be bought before it can be downloaded. The platform never pays; a person approves the purchase |
| SCR-1 | Tenders waiting for the Bid Manager's pursue or discard call, against the 24 h limit |
| SCR-5 | Live tenders with a prequalification line that fails or is at risk. Disqualification on paperwork is the most avoidable loss |
| SRC-1 | Time left to send every RFQ for tenders pursued in the last 24 hours, against the 24 h target |
| SRC-2 | Packages with at least three compliant, levelled quotes (or an accepted gap). Only comparable quotes count |
| SRC-3 | RFQs answered, with a quote or a decline, by their reply date |
| SRC-4 | RFQs past their reply date with no answer. The agent chases; escalated ones need you |
| SRC-5 | Supplier questions not yet answered. Stale ones hold up quotes |
| SRC-6 | Quotes with adjustments (currency, VAT, delivery terms, exclusions) that a buyer must confirm before they count |
| SRC-9 | Packages where the best compliant quote can't deliver in time for the programme |
| DEC-1 | Bid / No-Bid packs issued and waiting for DG2, with positions recorded and time left |
| DEC-4 | The value of the bids at DG2, weighted by their win probability. Only bids with a pack are counted, because earlier tenders have no probability yet |
| DEC-5 | The delivery load if every bid at DG2 wins, on top of work already awarded, against the safe level |
| DEC-6 | What is left of the bank guarantee facility after the bonds we hold and those live bids would need. In the GCC, bonds tie up the facility for months |
| DEC-7 | Inputs asked of colleagues for packs and not yet given. Packs slip when inputs slip |
| DEC-8 | Packs whose evidence changed after they were built, for example by an addendum. A committee must not decide on stale evidence |
| OUT-1 | Won ÷ (won + lost), for the results received in the period. Always shown with the count |
| OUT-3 | Contract value won in the period, against the order-intake target pro-rated to the period |
| OUT-6 | The most common reason we lost, from the results in the period |
| CAP-1 | Committed bid-team hours in the next four weeks against the hours available, for the busiest team |

---

## 12. Data the dashboards need (plan 017)

### 12.1 One lifecycle per tender
For every tender, live or closed in the 730 days of history (plan 039; 13 months before), the tenant data holds a **lifecycle**:
- **stage log:** `{ stage, step, enteredAt, leftAt?, ownerId }[]`;
- **gate records** for DG1, DG2 and DG3: decision, time, who, on time or not, reason codes, and for DG2 `againstMajority`;
- **submission:** time, and on time or not;
- **result:** won, lost, withdrawn or cancelled; time; our rank; gap to winner; loss reason; predicted win at DG2;
- **step facts** for the current step: the few numbers its stage dashboard needs (e.g. packages covered 7 of 11; sections locked 11 of 18; mandatory gaps 0; base margin 10.2%).

**The lifecycle is the single source.** The history arrays of plan 004 are folded into it, so a decision is written once. Step facts for Stages 2 and 3 are **interim summaries**: plans 008 and 009 replace them with derivations from their detailed RFQ and pack records, and a dev check asserts the two agree.

Captures are kept as daily counts per source (`intakeDaily`), because the funnel needs capture volumes for two years, not 4,000 individual notices. Each day also holds the re-issued notices (`linked`, the funnel's "previous"), the new notices that passed the AI screening (`passed`) and those still open for bids (`open`: every new notice of the last 30 days, so Najd's active notices now are 176).

### 12.2 Najd (tenant A): live register by stage (now)
The Stage 1–3 rows exist already (gcc-demo-data §5.1). New rows are marked **new**. IDs from 2025 are tenders captured last year, as their submission dates require.

| Stage | TID · tender (fictional) | Value (SAR M) | Step and facts | With |
| --- | --- | --- | --- | --- |
| 1 | T-2026-118 hero · T-2026-117 · T-2026-119 · T-2026-122 · T-2026-120 | as §5.1 | as §5.1 | Aisha Al-Qahtani / Omar Siddiqui |
| 2 | T-2026-109 Tabuk transmission · T-2026-104 Jubail IWTP | 260 · 175 | RFQs out (9 of 9 packages issued · 27 RFQs) · Levelling (7 of 11 covered; 4 overdue, 2 escalated; 5 to level) | Joseph Mathew |
| 3 | T-2026-101 Abha STP · T-2026-097 Madinah WTP | 140 · 355 | Pack in preparation (2 inputs outstanding, 1 late) · Positions in (2 of 5; stale after Addendum 2) | Omar Siddiqui · the committee |
| 4 **new** | T-2025-341 Jeddah industrial wastewater network · T-2025-336 Riyadh stormwater pumping stations | 120 · 88 | Baseline drafting (due Wed 11 Mar) · Resource loading (planned 20 vs required 18 months) | Arjun Pillai |
| 5 **new** | T-2025-322 Al-Ahsa water treatment plant · T-2025-329 Buraydah sewer lift stations | 210 · 64 | Finance check (base margin 10.2% vs 9.0%; sourced 93%; estimated 4%) · Scenarios (7.8% vs 9.0% → PRC-3; sourced 81%; estimated 11%) | Tarek Haddad |
| 6 | T-2026-088 Dammam stormwater tunnels · **new** T-2025-317 Taif water reservoirs | 420 · 96 | Review (11 / 18 locked; 1 late; score 76 vs 70; red team Tue 10 Mar) · Drafting (3 / 12; 2 late; 3 SME tasks overdue; score 68 vs 70 → PRP-3) | Rami Aziz |
| 7 **new** | T-2025-305 Yanbu STP expansion | 150 | DG3 pack issued Sat 7 Mar 16:00 (100% evidenced; 0 gaps; 0 redlines open) | Faisal Al-Harbi (DG3) |
| 8 | **new** T-2025-298 Makkah water distribution · **new** T-2025-291 Riyadh sewage network extension · **new** T-2025-284 Dammam water network · T-2026-079 Qassim water networks | 230 · 290 · 186 · 310 | Signatures (deadline Thu 12 Mar 10:00; 2 signatures pending; bond SAR 2.3 M valid to 10 Jun) · Awaiting result (submitted 3 Mar) · Awaiting result (15 Feb) · Awaiting result (Thu 19 Feb) | Omar Siddiqui |
| 9 **new** | T-2025-262 Unaizah STP (won 24 Feb) · T-2025-270 Hail water transmission (lost 5 Mar: price, 2nd of 6, 6.8% above the winner) | 142 · 205 | Handover (kick-off Sun 15 Mar) · Debrief | Mazen Al-Ghufaili |

Live counts: S1 12 · S2 7 · S3 2 · S4 2 · S5 3 · S6 4 · S7 1 · S8 8 · S9 2 = **41**. **PF-1 = 27 tenders, SAR 6.83 bn** (Stages 2–8). Review of plan 039 (2026-10-06): what the last 30 days approved stays live, so T-2026-106 and 11 generated tenders (4 in Stage 2, 3 in Stages 5–6, 4 submitted and awaiting results) joined the 15 hand-authored ones.

**Stage 2 runs long, by design.** Najd's Stage 2 durations run 29–77 days, because §12.3 fixes the 90-day DG1 total and the DG2 anchors. The "average days in stage" graph shows Stage 2 long; that is expected (accepted 2026-09-26).

**Stage 1 is 12, decided 2026-09-25 (plan 017 question).** It is the 5 rows above plus plan 004's seven other Stage 1 register rows: T-2026-121 (restricted lane) and T-2026-123 … 128 (six low-fit notices captured this morning, at step "Screened", flagged for a person). Every register row has a lifecycle, so the intake screens, the table and the graph agree. People not cleared for the restricted lane see 11 in Stage 1 and 28 live. SCR-1 stays "DG1 due 2" and PF-1 is unchanged, because it counts Stages 2–8 only.

**Recently closed (inside 30 days):**
- T-2025-255 Najran dam rehabilitation: lost 17 Feb (technical score); lessons captured 1 Mar; closed.
- T-2026-106 Al-Kharj treated effluent line: pursued 9 Feb, now levelling quotes in Stage 2 (until 2026-10-06 it was withdrawn on 1 Mar).
- T-2026-099 Hafr Al-Batin water network: DG2 No-Bid 1 Mar (capacity conflict).
- T-2026-107 Jazan sewer house connections: DG1 Discard 23 Feb, 27 h after M1. **Late: the one late decision.**
- T-2026-115 Jeddah desalination intake: DG1 Discard 2 Mar (out of scope).
- T-2026-112: as §5.1.

### 12.3 Najd: flow targets by period (the generator must hit these exactly)
Plan 039 (the user's table of 2026-10-06, with the orchestrator's 90-day and All columns). Each column's headline is in bold; the funnel reads it as one batch narrowing. Today and 7 days are no longer offered but stay as the hand-authored subsets.

| Flow | Today | 7 days | 30 days | 90 days | 12 months | All (730 days) |
| --- | --- | --- | --- | --- | --- | --- |
| Captured: total in = new + previous | 12 = 11 + 1 | 48 = 44 + 4 | **194** = 176 + 18 | **572** = 520 + 52 | **2,080** = 1,890 + 190 | **4,070** = 3,700 + 370 |
| AI screening: passed · screened out | 2 · 10 | 5 · 43 | **18** · 176 | **62** · 510 | **250** · 1,830 | **490** · 3,580 |
| DG1: decided = approved · rejected · pending | 0 | 3 = 1 · 2 · 0 | **12** = 8 · 3 · 1 | **44** = 30 · 12 · 2 | **185** = 104 · 72 · 9 | **366** = 206 · 146 · 14 |
| DG2: decided = approved (bid) · rejected (no-bid) | 0 | 1 = 1 · 0 | **8** = 7 · 1 | **30** = 28 · 2 | **104** = 96 · 8 | **206** = 190 · 16 |
| DG3: decided = approved · rejected | 0 | 1 = 1 · 0 | **7** = 7 · 0 | **28** = 27 · 1 | **96** = 94 · 2 | **190** = 186 · 4 |
| Won: won · lost · pending, of submitted | 0 | 0 · 1 · 0 of 1 | **3** · 3 · 1 of 7 | **14** · 11 · 2 of 27 | **42** · 44 · 8 of 94 | **82** · 88 · 16 of 186 |
| Decisions on time (PF-4) | — | 5 / 5 | 25 / 27 | 95 / 102 | 362 / 385 (94%) | 716 / 762 (94%) |
| Late by gate (DG1 · DG2 · DG3) | — | 0 · 0 · 0 | 1 · 1 · 0 | 3 · 2 · 2 | 11 · 6 · 6 | 22 · 12 · 12 |
| PF-2 Average ticket size | "No bids submitted" | SAR 290.0 M | SAR 210–290 M (steered, not fixed) | same | same | same |

Win target (PF-3): **45%** (plan 039; it was 25%).

**Dated anchors that give these numbers** (plan 017; plan 039 keeps the hand-authored rows and lets the generator add closed tenders around them in every band but today and 7 days, so 30-day and 90-day drills now also show generated tenders, mostly closed: withdrawn in Stage 2 or 4, or cancelled after opening):
- **DG1, 7 days:**
  - Pursue T-2026-109 on Wed 4 Mar 11:20;
  - Discard T-2026-112 on 3 Mar;
  - Discard T-2026-115 on 2 Mar.
- **DG1, 30 days adds:**
  - Pursue T-2026-104 (26 Feb), T-2026-101 (12 Feb) and T-2026-106 (9 Feb);
  - Discard T-2026-107 (23 Feb, late) and 4 more;
  - Hold 1.
- **DG2, 30 days:**
  - Bid T-2025-341 (Tue 3 Mar), T-2025-336 (26 Feb), T-2025-329 (18 Feb) and T-2025-322 (10 Feb);
  - No-bid T-2026-099 (1 Mar).
- **DG3, 30 days:** approved T-2025-298 (Wed 4 Mar), T-2025-291 (25 Feb), T-2026-079 (16 Feb) and T-2025-284 (10 Feb).
- **Submitted, 30 days:** T-2025-291 (Tue 3 Mar, SAR 290 M), T-2026-079 (Thu 19 Feb, SAR 310 M) and T-2025-284 (15 Feb, SAR 186 M). Their average is SAR 262.0 M.
- **Results, 30 days:**
  - won T-2025-262 (24 Feb, SAR 142 M);
  - lost T-2025-255 (17 Feb) and T-2025-270 (Thu 5 Mar).
- **90-day and 12-month totals:** keep plan 004's records and 33 outcomes. Plan 039 moved 17 of the DG1 discard records 13 weeks earlier (into the rest of the 12 months; seven of them get a 2025 id), and T-2025-447 (Pursue against the recommendation, then No-Bid) likewise, so the 90 days hold 12 discards and 2 No-Bids. The other history is generated around them.
- **12-month splits (plan 039, scaled to the new totals):** wins by sector water 33 · roads 9; losses price 24 · technical 9 · local content 5 · prequalification 2 · other 4; forecast bands > 70%: 13 of 16, 50–70%: 19 of 28, 30–50%: 10 of 22, < 30%: 0 of 20 (Najd's one over-confident band); DG2 against the majority 4, re-opened 2. Over 90 days: discards out of scope 5 · below value 2 · prequalification 2 · not enough time 2 · capacity 1; overrides 3 (2 for the client relationship).

**Correction to gcc-demo-data §5.1** (applied there on 2026-09-26):
- "DG2, last 12 months: 18 decisions" was too few for 38 submissions a year. It becomes **54 (40 bid, 14 no-bid), 51 on time**.
- "Chair differed from the majority: 1" becomes **approval against the majority: 2**.
- Re-opened: 2, unchanged.

### 12.4 Najd: Head of Tendering, Needs your action (now)
1. **DG3 approval** · T-2025-305 Yanbu STP expansion · ready (evidence complete) · 30 h left of 48 h · [Open DG3].
2. **DG2 approval** · T-2026-097 Madinah WTP · 2 of 5 positions, quorum needs 3 · pack stale (Addendum 2, 09:12) · 4 h 10 m left · [Open DG2].
3. **Booklet purchase** · T-2026-122 Dammam lift stations · SAR 3,000 via Etimad · purchase closes Tue 10 Mar · requested by Aisha Al-Qahtani · [Approve purchase].
4. **Renewal** · Zakat certificate expires Thu 30 Apr, before T-2026-118 opens Sun 10 May · owner Sultan Al-Anazi · [Request renewal].
5. **Late input** · T-2026-101 Abha STP · Finance facility input, 1 day late · [Nudge].

"Show all (7)" adds:
- **Renewal** · GOSI certificate expires Thu 7 May;
- **DG1 due** · T-2026-117, today 16:10, waiting on Omar Siddiqui.

### 12.5 Other tenants: live counts and 12-month flows
Titles and values are fictional; the generator fills the history.

Live by stage (S1 · S2 · S3 · S4 · S5 · S6 · S7 · S8 · S9): Corniche 3 · 1 · 1 · 1 · 1 · 1 · 1 · 2 · 1; Dafna and Batinah 3 · 1 · 0 · 1 · 1 · 1 · 1 · 2 · 1; Qurain 3 · 2 · 1 · 1 · 1 · 1 · 1 · 3 · 1.

**Flows (plan 039):** the same layout as Najd, scaled from Najd's 12-month and All columns by each tenant's 12-month DG1 total before plan 039 ÷ 185 (Corniche 120, Dafna 95, Batinah 130, Qurain 160), rounded, each column no larger than the one before it. On-time counts are not steered (about 4% of generated decisions late); forecasts are calibrated.

| Tenant · window | Captured = new + previous | AI passed | DG1 = approved · rejected · pending | DG2 = approved · rejected | DG3 = approved · rejected | Won (won · lost · pending of submitted) |
| --- | --- | --- | --- | --- | --- | --- |
| Corniche · 12 months | 1,349 = 1,226 + 123 | 162 | 120 = 67 · 47 · 6 | 67 = 62 · 5 | 62 = 61 · 1 | 27 (27 · 29 · 5 of 61) |
| Corniche · All | 2,640 = 2,400 + 240 | 318 | 237 = 134 · 95 · 8 | 134 = 123 · 11 | 123 = 121 · 2 | 53 (53 · 57 · 11 of 121) |
| Dafna · 12 months | 1,069 = 971 + 98 | 128 | 95 = 53 · 37 · 5 | 53 = 49 · 4 | 49 = 48 · 1 | 22 (22 · 23 · 3 of 48) |
| Dafna · All | 2,090 = 1,900 + 190 | 252 | 188 = 106 · 75 · 7 | 106 = 98 · 8 | 98 = 96 · 2 | 42 (42 · 45 · 9 of 96) |
| Batinah · 12 months | 1,462 = 1,328 + 134 | 176 | 130 = 73 · 51 · 6 | 73 = 67 · 6 | 67 = 66 · 1 | 30 (30 · 31 · 5 of 66) |
| Batinah · All | 2,860 = 2,600 + 260 | 344 | 257 = 145 · 103 · 9 | 145 = 134 · 11 | 134 = 131 · 3 | 58 (58 · 62 · 11 of 131) |
| Qurain · 12 months | 1,799 = 1,635 + 164 | 216 | 160 = 90 · 62 · 8 | 90 = 83 · 7 | 83 = 81 · 2 | 36 (36 · 38 · 7 of 81) |
| Qurain · All | 3,520 = 3,200 + 320 | 424 | 317 = 178 · 126 · 13 | 178 = 164 · 14 | 164 = 161 · 3 | 71 (71 · 76 · 14 of 161) |

**Every tenant has, now:**
- one DG3 approval waiting for its Head of Tendering (the Stage 7 tender);
- at least one DG1 decision in the last 7 days;
- at least one result in the last 30 days.

This keeps every tenant's dashboard alive on every period.

### 12.6 New people
**Proposal Manager** (`prop`, group Contributors, owner of Stage 6):
- Najd: Rami Aziz;
- Corniche: Sophie Laurent;
- Dafna: Ayman Fikry;
- Batinah: Latifa Al-Maawali;
- Qurain: Mona Al-Rifai.

**The CEO's seat** becomes `ceo`.

**Committee members' sector names** use the tenant's own sector names (e.g. "Water and wastewater", not "Water"), from the plan 003 review.

---

## 13. How this maps to plans
| Plan | What it delivers from this document |
| --- | --- |
| 006 Shell and dashboard kit | §1 layout components; §2 period engine; §3 tile and ⓘ; §4 action list; §5 grid wrapper and shared columns; §6 chart wrapper; §7 tracker component; §8 sidebar, stage names and steps, routes; §9 capability changes; §12.6 people |
| 017 Lifecycle data | §12: lifecycle model, Najd rows and targets, other tenants, generator and verification, lifecycle queries (stage at a date, events in a window, health, tracker view model) |
| 015 Portfolio dashboards | §10.1–10.3; PF KPIs; the funnel; portfolio action sources; drill to stages |
| 013 Stage dashboards and My requests | §10.4–10.13; PLN, PRC, PRP, CMP, SUB, RES and REQ KPIs; stage action sources and columns |
| 018 DG3 approval | §9 DG3 screen |
| 009 Stage 3 and DG2 | §9 DG2 rules (quorum 3 of 5, Head of Tendering approves) |
