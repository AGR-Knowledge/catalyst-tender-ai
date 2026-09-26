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
| DB-2 | **Period filter:** Today · 7 days · 30 days · 90 days · 12 months. The default is 30 days. It drives the KPI tiles, the flow strip and the graph. It does not filter "Needs your action", which is always now, or the table, which has its own filters |
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

---

## 1. The layout

The same page, top to bottom, at 1440 px:

```
┌ Sidebar ─────┐┌─────────────────────────────────────────────────────────────────────────┐
│ Dashboard    ││ Z1  Dashboard · Head of Tendering        [Today|7 days|30 days|90 d|12 m] │
│ Calendar     ││     Faisal Al-Harbi · Najd Arcline · As of Sun 8 Mar 2026, 10:00 AST      │
│ STAGES       ││ Z2  ┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐┌tile ⓘ┐   six KPI tiles     │
│ 1 Intake   ▸ ││     └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘                     │
│ 2 Sourcing ▸ ││ Z3  ┌ Flow strip ⓘ (7/12) ─────────────┐ Z4 ┌ Needs your action (5/12) ─┐ │
│ 3 Bid dec. ▸ ││     │ Captured → DG1 → DG2 → DG3 →      │    │ 5 rows, most urgent first │ │
│ 4 Planning   ││     │ Submitted → Results               │    │ what · tender · due · [▶] │ │
│ …            ││     └───────────────────────────────────┘    └───────────────────────────┘ │
│ 9 Results    ││ Z5  [ Table | Graph ]   Sort: Newest ▾   Search · Filters · chips   n of m │
│ Company      ││     ┌ Table: header + 10 rows visible, the rest scroll inside ──────────┐ │
│              ││     │  … or the Graph, same box, same height                            │ │
│ ──────────── ││     └───────────────────────────────────────────────────────────────────┘ │
│ Admin        ││ Z6  ┌ Tender tracker (after a row click) ───────────────────────────────┐ │
│ Settings     ││     │ S1 ✓ · DG1 ✓ · S2 ● · S3 · DG2 · S4 … S9 · who · team · next      │ │
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

### Z3 · Flow strip
- **One horizontal flow per dashboard, for the selected period:** the role's funnel. For the Head of Tendering it is the decision funnel: Captured → DG1 → DG2 → DG3 → Submitted → Results. Each gate shows what went through and what stopped ("4 pursued · 7 discarded · 1 held").
- **Every number is a link.** It switches the main view to the Table, filtered to exactly those tenders (including closed ones).
- The strip has its own ⓘ. It says the counts are decisions made in the period, whichever tenders they were on. It is not one group of tenders followed through, so the steps need not add up.
- **Stage dashboards use one rule:** the strip shows **how many tenders entered each step of the stage in the period**, then **Moved on** (entered the next stage) and **Stopped** (closed in this stage). A stage that ends in a gate shows the gate's decisions instead of Moved on and Stopped. All of it is derived from the stage log (§12.1), so every stage's strip is honest and needs no extra data. Stage 1 starts with the notices captured; My requests uses the request statuses.

### Z4 · Needs your action
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
- **Both views sit in the same box at the same height**, so the page doesn't jump when toggling. The table stays mounted under the graph and sets the box's height (its toolbar wraps to two rows on a stage table); the graph fills the box, with a plot of at least 440 px (plan 020 A6.3).
- The Table is described in §5, the Graph in §6.

### Z6 · Tender tracker
It opens **below the main view** when a table row is selected (§7). Clicking the same row again, the ×, or Esc closes it. It doesn't open from the Graph, whose clicks navigate instead.

### Responsiveness
- At 1280 px: Z3 and Z4 stay side by side, at 6/12 each.
- Below 1100 px they stack, Z4 first.
- The table scrolls horizontally inside its box, with TID and Tender pinned left. The page never scrolls horizontally.

---

## 2. The period filter

**Options:** Today · 7 days · 30 days · 90 days · 12 months. The default is **30 days**.

**Windows.** Each is the last N calendar days, including today, ending at the demo clock (Sun 8 Mar 2026, 10:00 tenant time). With the demo date they are:

| Option | Window | Previous period (for comparison) |
| --- | --- | --- |
| Today | Sun 8 Mar 00:00 – 10:00 | Sat 7 Mar, same hours |
| 7 days | Mon 2 Mar – Sun 8 Mar | 23 Feb – 1 Mar |
| 30 days | Sat 7 Feb – Sun 8 Mar | 8 Jan – 6 Feb |
| 90 days | Tue 9 Dec 2025 – Sun 8 Mar | 10 Sep – 8 Dec 2025 |
| 12 months | 9 Mar 2025 – 8 Mar 2026 | 9 Mar 2024 – 8 Mar 2025 (only where history exists; otherwise "No comparison") |

**Two kinds of KPI** (every registry entry declares its `kind`):
- **Flow KPIs** count events inside the window: decisions, submissions, results, captures. The sub-line may compare with the previous period in words ("previous 30 days: 2"). Arrows are optional and always neutral in colour.
- **State KPIs** are a value **now**: live pipeline, credentials at risk, fields to check. The period changes only the sub-line, which shows the change since the window started ("4 in · 5 out since 7 Feb"). With "Today", that is the change since 00:00.

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

**Tile anatomy**, top to bottom:
- **Label + ⓘ.** Sentence case, at most four words.
- **Main value.** Money through `Money`, dates through `When`. The tone colour comes from the registry's thresholds; information KPIs are neutral.
- **Sub-line:** n, the comparison, the worst item, or the target in force.
- **Owner tag** ("Finance") when the thing measured waits on someone else.

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
- `compute(ctx) → { value, display, sub, tone, n? }`, where `ctx` carries the tenant, the viewer, the scope and the window;
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

- **Library:** `recharts`. Line by default; a small "Line | Bar" switch in the graph toolbar.
- **X-axis:**
  - **Portfolio dashboards:** the nine stages by short name, "1 Intake" … "9 Results". Gate markers sit between stages as dashed vertical reference lines labelled DG1 (after 1), DG2 (after 3) and DG3 (after 7).
  - **Stage dashboards:** the steps of that stage, in order (§8.2).
- **Y-axis:** a select in the graph toolbar. Metrics per dashboard are listed in §10. The common set is:

| Metric | Kind | Definition |
| --- | --- | --- |
| Tenders now (default) | state | Live tenders in each stage or step now |
| Value now | state | Σ value in tenant currency, same set |
| Tenders in the period | flow | Tenders that were in the stage or step at any time in the window |
| At risk or overdue now | state | Health At risk, Overdue or Blocked |
| Average days in stage | flow | For tenders that left the stage or step in the window: mean days spent there |

- **Comparison series** (dashed, same hue at 50%), switchable with "Compare":
  - for **state** metrics: the same metric **at the start of the window** (e.g. 7 Feb);
  - for **flow** metrics: the **previous period**.
- **Tooltip:** stage or step name · value · comparison value · count if the metric is value · "Click to open Sourcing" (portfolio) or "Click to see these tenders" (stage).
- **Click:**
  - **Portfolio, and the viewer can open the stage's dashboard** (`can(person, 'stage.view', { stage })`): navigate to `/stages/:n?period=…`. This is **the same page the stage owner uses as home.**
  - **Otherwise, and on stage dashboards:** switch to the Table, filtered to that stage or step.
- **Accessibility:**
  - The chart has `role="img"` and an `aria-label` summary ("Tenders now by stage: Intake 12, Sourcing 2, …").
  - A visually hidden `<table>` carries the same data.
  - Keyboard: Recharts' accessibility layer moves between points; Enter on a focused point does the click.
- **Colours:** series use `var(--brand)`; the comparison uses the same at 50% opacity; gate lines use `var(--line-strong)`; axis text uses `var(--ink-4)` at 12 px.
- **Empty:** "No tenders in these stages in this period."

---

## 7. The tender tracker

It opens under the main view for the selected row. It is a card at full width.

```
T-2026-109 · Tabuk water transmission pipeline, Phase 1 · SAR 260.0 M · [On track]            ×
 1 Intake ─ DG1 ─ 2 Sourcing ─ 3 Bid decision ─ DG2 ─ 4 ─ 5 ─ 6 ─ 7 ─ DG3 ─ 8 ─ 9
   ✓          ✓        ●              ○            ○    ○   ○   ○   ○    ○    ○   ○
 28 Feb–4 Mar  Pursue    since 4 Mar
 5 d · Aisha   Omar S.   RFQs out
               4 Mar 11:20
               on time
┌ Now: 2 · Sourcing · RFQs out ──────────────────────────────────────────────────────────┐
│ With     Joseph Mathew, Procurement Lead                                               │
│ Team     Water team: Omar Siddiqui (Bid Manager), 4 engineers, 2 estimators            │
│ Status   9 of 9 packages issued · 27 RFQs · Thu 5 Mar 10:05 · replies due Sun 15 Mar   │
│ Next     Quotes in → levelling → Bid / No-Bid pack · Submission Sun 10 May (39 wd)     │
│ Blocker  None                                                                          │
└──────────────────────────────────────────────────────────────── [Open tender] ────────┘
```

**Nodes.** One per stage and one per gate, in lifecycle order: S1 · DG1 · S2 · S3 · DG2 · S4 · S5 · S6 · S7 · DG3 · S8 · S9.
- **Stage node:** ✓ done / ● current / ○ not reached / ✕ where the tender stopped. It shows the dates in and out, days spent, and the owner's initials.
- **Gate node:**
  - a decision chip (Pursue · Discard · Hold · Bid · No-bid · Approved · Rejected);
  - who and when;
  - "on time" or "late by 3 h".
- **A stopped tender** (discarded, no-bid, rejected, withdrawn, lost) greys every node after the stop. The stop node carries the reason ("Discarded at DG1 · below the value band · 3 Mar · Omar Siddiqui").
- **A won tender** ends at S9 with "Won · SAR 142.0 M · handover Sun 15 Mar".

**Now card:**
- the current stage and step;
- **With**: the person it waits on, with role;
- **Team**: the sector team and the named bid people;
- **Status**: the step facts in one line;
- **Next**: the next steps and the submission date with working days;
- **Blocker**: the open blocker, or "None".

**Masking** applies as everywhere. For example, a Procurement Lead sees "Margin: masked for your role" in a Stage 5 status line.

**A simplification, stated in the ⓘ:** planning, pricing and drafting overlap in real bids. The tracker shows a tender in the stage where its critical work is now; the stage log keeps each stage's own dates.

---

## 8. Sidebar and stage names

### 8.1 Short names (the proposal's names are too long for a sidebar)

| n | Sidebar name | Full name (spec and proposal) | Owner (stage dashboard is their home) | Working screens under it |
| --- | --- | --- | --- | --- |
| 1 | **Intake** | Tender Identification & Screening | Tender Coordinator | Tender radar · Intake queue · Screening · DG1 decisions |
| 2 | **Sourcing** | Subcontractor & Internal Input Orchestration | Procurement Lead | Packages & RFQs · Quote levelling · Suppliers |
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
My requests                ← only for people who owe inputs
STAGES                     ← section label
1 Intake            ▸      ← the header opens the stage dashboard; ▸ expands its screens
   Tender radar · Intake queue · Screening · DG1 decisions [DG1]
2 Sourcing          ▸
   Packages & RFQs · Quote levelling · Suppliers
3 Bid decision      ▸
   Bid packs · DG2 approvals [DG2]
4 Planning
5 Pricing
6 Proposal
7 Compliance        ▸
   DG3 approvals [DG3]
8 Submission
9 Results
Company
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
- **Question:** *"What is in our pipeline and what is it worth, what did we decide, are we winning, and what needs me?"*
- **Tiles:**
  1. PF-1 Live pipeline (state)
  2. PF-2 Average ticket size (flow)
  3. PF-3 Win / loss (flow)
  4. PF-4 Decisions on time (flow)
  5. SCR-6 Credentials at risk (state)
  6. CAP-1 Bid-team load (state)
- **Flow strip, PF-5 Decision funnel:** Captured → DG1 (pursued · discarded · held) → DG2 (bid · no-bid) → DG3 (approved · rejected) → Submitted → Results (won · lost).
- **Needs your action:**
  - DG3 approvals;
  - DG2 approvals (with quorum state and pack freshness);
  - re-open requests;
  - booklet purchases awaiting approval;
  - DG1 escalations (breached SLA, or no Bid Manager assigned);
  - renewals for credentials at risk;
  - late inputs on packs due within 24 h;
  - gates without an owner (configuration).
- **Table:**
  - scope: all tenders; Status filter defaults to Live;
  - default columns: `tid` · `tender` · `stage` · `owner` · `team` · `value` · `due` · `nextGate` · `health` · `source`;
  - optional columns: `captured`, `country`, `sector`, `fit`, `win`, `lastActivity`;
  - default sort: Newest first.
- **Graph:**
  - x = the 9 stages;
  - metrics: Tenders now (default) · Value now · Tenders in the period · At risk or overdue now · Average days in stage;
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
- **Needs your action:** DG2 positions to record (the CEO is a member). Other items show as "Waiting on …" and can't be actioned.
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
- **Flow strip:** Captured (notices) → Linked (duplicates and addenda) → Logged → Screened → Awaiting DG1 → DG1 (pursued · discarded · held).
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
- **Graph:** x = Stage 6 steps; metrics: Tenders now · Late sections now · Average days in step.

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
- **Graph:** x = Stage 7 steps; metrics: Tenders now · Mandatory gaps now · Average days in step.

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
- **Needs your action:** handovers to start · debriefs to hold · lessons to record.
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
For every tender, live or closed in the last 13 months, the tenant data holds a **lifecycle**:
- **stage log:** `{ stage, step, enteredAt, leftAt?, ownerId }[]`;
- **gate records** for DG1, DG2 and DG3: decision, time, who, on time or not, reason codes, and for DG2 `againstMajority`;
- **submission:** time, and on time or not;
- **result:** won, lost, withdrawn or cancelled; time; our rank; gap to winner; loss reason; predicted win at DG2;
- **step facts** for the current step: the few numbers its stage dashboard needs (e.g. packages covered 7 of 11; sections locked 11 of 18; mandatory gaps 0; base margin 10.2%).

**The lifecycle is the single source.** The history arrays of plan 004 are folded into it, so a decision is written once. Step facts for Stages 2 and 3 are **interim summaries**: plans 008 and 009 replace them with derivations from their detailed RFQ and pack records, and a dev check asserts the two agree.

Captures are kept as daily counts per source (`intakeDaily`), because the funnel needs capture volumes for 12 months, not 2,000 individual notices.

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
| 9 **new** | T-2025-262 Unaizah STP (won 24 Feb) · T-2025-270 Hail water transmission (lost 5 Mar: price, 2nd of 6, 6.8% above the winner) | 142 · 205 | Handover (kick-off Sun 15 Mar) · Debrief | Mohammed Al-Ghamdi |

Live counts: S1 12 · S2 2 · S3 2 · S4 2 · S5 2 · S6 2 · S7 1 · S8 4 · S9 2 = **29**. **PF-1 = 15 tenders, SAR 3.09 bn** (Stages 2–8).

**Stage 2 runs long, by design.** Najd's Stage 2 durations run 29–77 days, because §12.3 fixes the 90-day DG1 total and the DG2 anchors. The "average days in stage" graph shows Stage 2 long; that is expected (accepted 2026-09-26).

**Stage 1 is 12, decided 2026-09-25 (plan 017 question).** It is the 5 rows above plus plan 004's seven other Stage 1 register rows: T-2026-121 (restricted lane) and T-2026-123 … 128 (six low-fit notices captured this morning, at step "Screened", flagged for a person). Every register row has a lifecycle, so the intake screens, the table and the graph agree. People not cleared for the restricted lane see 11 in Stage 1 and 28 live. SCR-1 stays "DG1 due 2" and PF-1 is unchanged, because it counts Stages 2–8 only.

**Recently closed (inside 30 days):**
- T-2025-255 Najran dam rehabilitation: lost 17 Feb (technical score); lessons captured 1 Mar; closed.
- T-2026-106 Al-Kharj treated effluent line: pursued 9 Feb, withdrawn 1 Mar when the JV partner withdrew.
- T-2026-099 Hafr Al-Batin water network: DG2 No-Bid 1 Mar (capacity conflict).
- T-2026-107 Jazan sewer house connections: DG1 Discard 23 Feb, 27 h after M1. **Late: the one late decision.**
- T-2026-115 Jeddah desalination intake: DG1 Discard 2 Mar (out of scope).
- T-2026-112: as §5.1.

### 12.3 Najd: flow targets by period (the generator must hit these exactly)
| Flow | Today | 7 days | 30 days | 90 days | 12 months |
| --- | --- | --- | --- | --- | --- |
| Notices captured | 11 | 44 | 176 | 520 | 2,080 |
| DG1 decided (pursue · discard · hold) | 0 | 3 (1 · 2 · 0) | 12 (4 · 7 · 1) | 46 (15 · 29 · 2) | 185 (60 · 116 · 9) |
| DG1 on time | — | 3 / 3 | 11 / 12 | 44 / 46 | 178 / 185 |
| DG2 decided (bid · no-bid) | 0 | 1 (1 · 0) | 5 (4 · 1) | 14 (11 · 3) | 54 (40 · 14) |
| DG2 on time | — | 1 / 1 | 5 / 5 | 14 / 14 | 51 / 54 |
| DG3 decided (approved · rejected) | 0 | 1 (1 · 0) | 4 (4 · 0) | 10 (9 · 1) | 39 (38 · 1) |
| DG3 on time | — | 1 / 1 | 4 / 4 | 10 / 10 | 38 / 39 |
| Bids submitted | 0 | 1 | 3 | 9 | 38 |
| PF-2 Average ticket size | "No bids submitted" | SAR 290.0 M | **SAR 262.0 M** | SAR 241.0 M | SAR 214.0 M |
| Results (won · lost) | 0 | 1 (0 · 1) | 3 (1 · 2) | 9 (2 · 7) | 33 (9 · 24) |
| PF-4 Decisions on time | "No decisions yet today" | 5 / 5 (100%) | **20 / 21 (95%)** | 68 / 70 (97%) | 267 / 278 (96%) |

**Dated anchors that give these numbers:**
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
- **90-day and 12-month totals:** keep plan 004's 46 DG1 records and 33 outcomes (re-dated where needed to fit the windows above). The other history is generated around them.

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

| Tenant | Live by stage (S1 · S2 · S3 · S4 · S5 · S6 · S7 · S8 · S9) | DG1 (pursue · discard · hold) | DG2 (bid · no-bid) | DG3 (approved · rejected) | Submitted | Results (won · lost) |
| --- | --- | --- | --- | --- | --- | --- |
| Corniche (B) | 3 · 1 · 1 · 1 · 1 · 1 · 1 · 2 · 1 | 120 (38 · 78 · 4) | 34 (26 · 8) | 26 (25 · 1) | 25 | 22 (6 · 16) |
| Dafna (C) | 3 · 1 · 0 · 1 · 1 · 1 · 1 · 2 · 1 | 95 (30 · 61 · 4) | 28 (21 · 7) | 21 (20 · 1) | 20 | 18 (5 · 13) |
| Batinah (D) | 4 · 1 · 0 · 1 · 1 · 1 · 1 · 2 · 1 | 130 (40 · 85 · 5) | 36 (28 · 8) | 28 (27 · 1) | 27 | 25 (8 · 17) |
| Qurain (E) | 3 · 2 · 1 · 1 · 1 · 1 · 1 · 3 · 1 | 160 (52 · 100 · 8) | 45 (35 · 10) | 35 (34 · 1) | 34 | 30 (8 · 22) |

**Batinah's Stage 1 shows 3, not 4,** until plan 012 adds the scanned Arabic roads tender (noted 2026-09-26).

**Every tenant has, now:**
- one DG3 approval waiting for its Head of Tendering (the Stage 7 tender);
- at least one DG1 decision in the last 7 days;
- at least one result in the last 30 days.

This keeps every tenant's dashboard alive on every period.

### 12.6 New people
**Proposal Manager** (`prop`, group Contributors, owner of Stage 6):
- Najd: Rami Aziz;
- Corniche: Sophie Laurent;
- Dafna: Ahmed Fathy;
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
