# UI direction: combining the two AGR designs

AGR product definition, v1 draft, 2026-09-25. This is how the Stage 1–3 demo looks and behaves.

It combines two designs:
- **the App**: the React prototype in `app/`, built from `agr-design/`;
- **the Workbench**: the UI/UX team's Bid Workbench, `agr-uiux-bid-workbench/bid-workbench 1.html`.

Read with [s1-s3-demo-spec.md](s1-s3-demo-spec.md) (what the screens do) and [kpi-and-screen-catalogue.md](kpi-and-screen-catalogue.md) (what each screen shows).

**The short version:**
- **Keep the App's foundations**: tokens, dark mode, fonts, primitives, motion, role homes and data derivation.
- **Take the Workbench's product thinking**: stage-grouped navigation, BOQ-driven sourcing, screening gates, override semantics, honest-AI copy and rule-stating settings.
- **Replace the client wireframe's KPIs** with the catalogue's.
- Both designs share one palette, so this is a merge of *patterns*, not a visual clash.

---

## 1. What each design is good at

| Area | App (React) | Workbench (UI/UX) | Direction |
| --- | --- | --- | --- |
| Visual foundation | Tokens with light and dark, IBM Plex Sans and Mono, motion tokens | The same palette, system fonts, light only | **App** |
| Accessibility | Real buttons, focus handling, a modal focus trap | No aria, `<span>` buttons, hover-only rationale | **App**, and raise the bar (§9) |
| Density | Medium; tables readable | Low and airy; 15px table cells | **App**, with a compact mode for long tables (§3.3) |
| Navigation | Role-shaped tree: dashboard sections plus pages | Stage-grouped accordion with gate chips | **Workbench** structure, filtered by the App's permissions (§4.2) |
| Home screen | One dashboard per role | One dashboard for everyone, with tabs | **App** (role homes), with the Workbench's tile discipline (owner labels) |
| Tender detail | A drawer | A 720px sheet with prev/next and a document view | **Both**: the sheet for triage, plus a new full **Tender Workspace** (spec §4.1) |
| Intake | Timed pipeline, real PDF viewer, page links | Upload modal with sensitivity, thread-aware email intake | **Both** |
| Stage 2 | Package board, quote comparison | BOQ-line classification, supplier-to-line matching, RFQ scoped to lines, screening gate | **Workbench** logic, App components |
| Gates | Toast-like buttons, one decider | Vote chips, referral threshold, blocking semantics stated | **Workbench** semantics, with our numbering and named voting (spec §10) |
| Data integrity | One source of truth; `live.ts` derives every number | Hard-coded HTML; figures contradict each other | **App** |
| Copy | Mixed | Plain, rule-stating, attributes actions to people | **Workbench** tone, with the App's British English |
| Analytics | Effort and benefit charts on the Executive home | An ROI tab on the main dashboard | Neither on a working desk. ROI belongs to the Head of Tendering's "Value" panel and the sales deck |

---

## 2. Gate numbering (do not copy the Workbench labels)

The Workbench numbers its gates differently. Always use the spec's numbering.

| Workbench label | Catalyst Tender AI | Notes |
| --- | --- | --- |
| Pursue / Discard (unnumbered) | **DG1: Pursue / Discard** | After Stage 1; Bid Manager |
| DG1: Bid or no bid | **DG2: Bid / No-Bid** | After Stage 3; Bid Committee vote |
| DG2: Price scenario | Commercial sign-off inside Stage 5 (M2) | Not a gate. Out of demo scope |
| DG3: Compliance | **DG3: Final approval** | Tender Review Board. Out of demo scope |
| DG4: Signatory submit | Milestone M3 (authorised signatory) | Out of demo scope |

---

## 3. Foundations

### 3.1 Tokens and colour
- **Source of truth:** `app/src/styles/tokens.css`. Do not introduce new hex values in components. If a colour is missing, add a token for both themes.
- **Status semantics** (both designs agree; make them a rule):

| Tone | Means | Typical use |
| --- | --- | --- |
| `cyan` | Information, a link, the platform acting | Source chips, "agent drafted", links |
| `orange` | Waiting on a person, at risk, needs attention soon | "At risk" eligibility, SLA < 25%, validation needed |
| `red` | Blocked, failed, overdue, breached | PQ fail, SLA breach, screening blocked, hard block |
| `green` | Done, passed, current | Pass, screened, quote received |
| `grey` | Not applicable, dormant, declined | Not stated, declined, muted later stages |
| `ink` | Neutral fact | Most numbers |

- **Colour is never alone.** Every status also has a word, and where space allows an icon (✓, !, ×, –). The Workbench used colour-only left rules; ours pair the rule with a label.
- **Status carries through as** a 3px left rule on rows and cards, a coloured value, or a thin bar. Big filled blocks are reserved for the one callout that matters on a page.

### 3.2 Typography
- **IBM Plex Sans** for UI, **IBM Plex Mono** for IDs, references, page numbers and clause numbers (`T-2026-118`, `p. 14`, `cl. 4.2.1`).
- **Tabular figures** (`font-variant-numeric: tabular-nums`) for every column of numbers, and in KPI values.
- **Arabic text:** add **IBM Plex Sans Arabic** through `@fontsource/ibm-plex-sans-arabic`, the same way the Latin faces load. The orchestrator approves this one dependency for the Arabic bonus. Arabic spans get `lang="ar" dir="rtl"` inside an LTR page. See §8.
- **Scale:** keep the App's scale. KPI values 28–32px semibold; card titles 15–16px semibold; body 14px; sub-labels 12px in `--ink-3` or darker (not `--ink-4`; see §9).

### 3.3 Density
Two densities, chosen per component and not per user:
- **Comfortable** (the default): role homes, packs, gate screens, forms.
- **Compact**: any table that can exceed ~20 rows. That covers the BOQ, the supplier master, the RFQ matrix, quote levelling, the validation queue, the audit log and today's captures. Row height is 36px instead of 48px, with 13px text and a sticky header and first column.

The Workbench's airy tables fail at a 184-line BOQ. A tendering team lives in these tables, so they must be scannable.

### 3.4 Motion
Keep the App's motion tokens and the 001 motion pass: UI under 300ms, strong ease-out, respect `prefers-reduced-motion`. New overlays (the sheet, gate panels) use `--ease-drawer` and `--dur-overlay`.

### 3.5 Themes
Light and dark remain first class, and every new component must be checked in both. The tender "paper" view (document reader) stays light in both themes, as a real page would, but its frame follows the theme.

---

## 4. Shell and navigation

### 4.1 Top bar
Left to right:
- **Tenant switch**: brand mark plus tenant name, and a country flag for the primary country. It changes data, users, currency, branding and portals.
- **Page title**, then a breadcrumb inside the Tender Workspace (`Pipeline › T-2026-118 › Eligibility & fit`).
- **Global search ⌘K**: tenders, suppliers, credentials, people, pages, all permission-filtered.
- **Notifications**: requests to me, SLA warnings, mentions.
- **Upload**: shown only to roles that can create tenders.
- **Persona**: a demo control, visually labelled "Demo" and grouped as in spec §3.

The fixed demo date shows as a small caption: "Sun 8 Mar 2026 · Riyadh".

### 4.2 Sidebar

> **Superseded 2026-09-25** by [dashboards.md](dashboards.md) §8: Dashboard on top, nine numbered stages with short names, Company, then Administration and Settings pinned to the bottom. The rules below on scope, gate chips, badges and collapse still hold.
- **Structure: the Workbench's stage groups.** My desk · Pipeline · Calendar · **1 Discover & qualify** · **2 Source** · **3 Decide** · Company · Administration · Settings (spec §4).
- **Scope: the App's rule.** A group or item appears only if `can(role, 'view', page)` allows it. A contributor in demo scope mode sees My requests, Pipeline, Calendar, Company and the tenders they are invited to.
- **Gate chips** sit beside the gate entries (`DG1` and `DG2`, outline). They turn orange when something waits on the current user, and red when an SLA is breached.
- **Badges** are derived from state (as `badge()` in `Sidebar.tsx` already does), never typed.
- **Collapse** to a 62px icon rail, remembered per viewer (as today with `ctai.sidebar.mini`). Below 1100px it becomes an off-canvas drawer.
- **Configuration never sits inside stage groups.** The Workbench put the Supplier database and Templates there. The supplier master lives under 2 Source because buyers work in it daily. Scoring, reminders, users and gates live under Administration.

### 4.3 Demo chrome
Everything that exists only for the demo carries a small `Demo` tag in the same style: the persona switch, presets, reset, "Advance agent work", "Treat as newly published" and the Compare tenants lens. The prototype banner stays. A viewer must always be able to tell product from presenter tooling.

---

## 5. Page archetypes

Every Stage 1–3 page is one of these seven. Executors build a page by picking its archetype and filling it from the KPI catalogue.

### A. Role desk ("My desk")

> **Superseded 2026-09-25** by the dashboard layout in [dashboards.md](dashboards.md) §1: period filter, six KPI tiles with ⓘ, flow strip, Needs your action, Table | Graph, tender tracker. The rules "Needs you now has one primary action per row" and "no charts without a decision behind them" carry over.
```
[ Title: "My desk" · role name · one-line "what needs you" summary ("3 decisions, 2 overdue requests") ]
[ KPI row: 4–6 tiles. Each: label · value · sub-label (target or delta) · owner tag if not me ]
[ Needs you now: action list, ordered by SLA; each row = what · tender · due · primary action ]
[ Two or three role panels (catalogue §C), in a 2-column grid at ≥1280px ]
```
**Rules:**
- **At most six KPI tiles.** Each must pass the catalogue test: someone acts differently when it changes.
- **"Needs you now" is always the first panel**, and each row has one primary action that works in place (Accept, Nudge, Record position) or opens the exact screen.
- **No charts without a decision behind them.** A trend line is allowed only where the catalogue says it drives action.

### B. Queue / register list (Radar, Intake queue, Screening, Suppliers)
```
[ Header stats strip (3–5 counts, each a filter shortcut) ]
[ Filter bar: search · checkbox dropdowns with count badges · active-filter chips · Clear all · "n of m" ]
[ Compact table, sortable; row left-rule by status; row hover shows secondary actions ]
[ Row click → Sheet (C1) with ↑/↓ prev/next through the *filtered* list; Esc closes ]
```
The filter pattern (checkbox popovers, chips, live count) comes from the Workbench. The table and focus handling come from the App's `DataTable`.

### C. Tender views
- **C1, the sheet** (quick triage, 720px, from lists). It holds: header stats (fit, value, fields to check, due); "What was read | Document" as a segmented control; flag banners; key fields with page links; eligibility roll-up; recommendation card; actions. With a primary "Open workspace".
- **C2, the Tender Workspace** (`/tenders/:id`, full page). A sticky header (spec §4.1) and tabs, with a two-column layout inside the tabs: main content (8/12) and a right rail (4/12). The rail holds the recommendation card, next actions for my role, key dates and open blockers. The rail collapses under the content below 1280px.

### D. Gate screen (DG1, DG2)
```
[ Gate header: gate name · tender · SLA clock · status (Open / Quorum not met / Ready / Decided) ]
[ Left 7/12: evidence pack, sections collapsible, each with source + freshness ]
[ Right 5/12, sticky: recommendation card → members panel (DG2) → decision form → record preview ]
[ Decision bar at bottom of right column: primary action + disabled-state reason in words ]
```
**Rules:**
- **A disabled decision button always says why**, in words next to it: "2 fields still being validated by Aisha", "Quorum: 1 more member needed".
- **Before commit, the screen shows exactly what the record will say** (the record preview). After commit it shows the written record, with "Recorded in the audit trail".
- **No Undo on a gate.** Use **Re-open with a reason**, which leaves both records. The Workbench's Undo left no trace.

### E. Comparison matrix (quote levelling, best-fit, Compare tenants)
- Frozen first column (the line or the criterion) and frozen header (the supplier or the tenant).
- Each cell shows the value plus a state tag: `quoted` · `derived` (hatched) · `estimated` (orange text) · `awaited` · `declined` · `non-compliant` (red).
- **"Show adjustments"** expands each levelled cell into its trace: original, then each adjustment with its source, then levelled.
- The best value per row is marked with a word ("lowest"), not only a colour. The Workbench's "best" marker never rendered because of a bug.

### F. Administration page
- Tabs; each setting has a label, a control, a one-line rule statement, and a **live-impact hint** ("4 tenders on the radar fall below this").
- Changes that re-score things show a before/after count and write an audit entry.
- **Owner-required fields:** a gate with no named owner shows "This gate is blocked: no Bid Committee chair is named" (the Workbench's best governance idea).

### G. Platform Console
A separate shell at `/platform`:
- a different accent (Catalyst operator slate), an "Operator" label, no tenant branding;
- lists and health tiles only;
- **never renders tender content.** Where tenant data would be, it shows a lock and "Tenant data. Request break-glass access".

### H. Supplier Portal (external preview)
A single-column, phone-friendly page with the tenant's branding. It is the only surface designed mobile-first, because suppliers answer RFQs from phones.

---

## 6. Component inventory

### 6.1 Reuse (exists in `app/src/components`)
- **Layout and cards:** `Card`, `CardHead`, `CardFoot`, `SectionTitle`.
- **Values and status:** `Kpis`, `Meter`, `Track`, `Mark`, `Pill`, `Dot`, `KV`, `StageTrack` (extend it for the S1 · DG1 · S2 · S3 · DG2 track with muted later stages).
- **Lists and overlays:** `DataTable`, `Board`, `DrawerFrame`, `ModalFrame`, `Toasts`. **In GCC screens, any tabular list of more than five rows uses `TenderGrid` (AG Grid Community, plan 006) instead of `DataTable`;** `DataTable` stays for the Indian tenant and small key-value tables.
- **Documents:** `PdfViewer` (page-jump and highlight).
- **Charts:** `Charts` (histogram and effort).

### 6.2 Build (new, shared, in `components/ui/` or `components/tender/`)

| Component | Purpose | Key props / behaviour |
| --- | --- | --- |
| `RecommendationCard` | The one way an agent recommendation renders (spec §5.1) | verdict, confidence (band or level), reasons[3], whatWouldChange[], sources[], agent, `overriddenBy?`. Always ends with "Recommendation, not a decision" |
| `OverrideModal` | Changing a recommendation | Pre-selects the opposite; reason **required** when overriding towards pursue/bid, above a value threshold, or on a gate. Copy: "Both are kept, with your name and the time." and "Overriding does not by itself pursue the tender." |
| `SourceChip` | Provenance for any value | kind: page / addendum / credential / quote / calc / input. Click opens the PDF at the page with a highlight, or the record. Mono text: `p. 14`, `add.2 p. 3`, `Q-0412`, `Cred: GOSI` |
| `SlaClock` | Time left against an SLA | start, sla, now (demo clock); tone by remaining share (green > 50%, orange ≤ 25%, red breached); an accessible text form ("9 h 40 m left of 24 h") |
| `GateChip` | DG1 / DG2 marker | state: open / waiting-on-me / breached / decided |
| `CoverageBar` | Stacked share by value | segments with label, value and tone. Used for BOQ classification (Self-performed / Subcontract / Not covered) and pricing state (Quoted / Derived / Estimated / Open) |
| `ThresholdBar` | Micro-bar with a threshold tick | value, band (±), threshold. Used for win probability and fit on lists |
| `EligibilityLine` | One PQ requirement against the vault | requirement, source page, result (Pass / At risk / Interpretation / Fail / Not stated), evidence (credential link), explanation, actions |
| `MembersPanel` | Committee positions (DG2) | seats[], position chip, comment, time, "recorded by secretary" flag, conflict declared; "Record my position" only for the signed-in member |
| `ReasonCodePicker` | Structured reasons | multi-select codes plus a note; required rules per gate |
| `FilterBar` | The Workbench filter pattern | search, checkbox dropdowns with count badges, chips, Clear all, "n of m" |
| `Sheet` | Triage overlay with prev/next | ↑/↓ keys, "n of m", Esc, focus trap; full-screen below 900px |
| `StatusPill` | One vocabulary for RFQ, supplier and validation statuses | see §7.3 |
| `Money` | Tenant-currency money | amount (base unit), currency, `original?` (currency, amount, rate, date). Renders `SAR 482.6 M`; hover or focus shows the original and the conversion |
| `When` | Dates in the authority's time zone | date-time, tz; shows "Sun 12 Apr, 10:00 AST", "in 35 days (24 working days)"; optional GCC-calendar flags |
| `Masked` | Value hidden by permission | "Masked for your role", with a lock icon and a tooltip saying who can see it. Never a blank or a dash |
| `LangBadge`, `BilingualValue` | Arabic support | EN / AR / EN+AR badge; the English value with the Arabic source beside it (`dir="rtl"`), a toggle to show all sources |
| `Callout` | Page-level message | variants: `route` (orange, referral or waiting), `block` (red, hard block: "This is a hard block, not a warning."), `verdict` (neutral), `stale` (orange, "Pack is stale: Addendum 2 …", with Re-run) |
| `RequestButton` | Replaces toast-only nudges | Creates a request with a due date, which lands in the person's My requests; the button shows "Requested 10:42 · due tomorrow" afterwards |
| `AuditEntry` | One audit line | actor, role, time, action, before → after, snapshot link |
| `DemoTag` | Marks presenter tooling | small outline tag "Demo" |
| `EmptyState` | Honest empty lists | says why it's empty and what would fill it ("No tenders match these filters." / "No RFQs yet. They are drafted when DG1 is Pursue.") |

**Rule:** a page may not build its own variant of any of these. If one doesn't fit, extend the shared component in its own plan step.

---

## 7. Data display rules

### 7.1 Money
- Tenant currency first: `SAR 482.6 M`, `AED 1.24 bn`, `QAR 96.0 M`, `OMR 12.4 M`, `KWD 18.3 M`.
  - One decimal for millions, two for billions, in every currency, OMR and KWD included (`KWD 39.3 M`). The exact amount shows on hover. (Decided 2026-09-25 at the plan 002 review.)
  - Full amounts in tables where precision matters (`SAR 12,064,000`).
- **Foreign-currency quotes** keep their original: `EUR 2.84 M → SAR 11.6 M` (rate and date on hover). Never convert silently.
- **VAT is always explicit:** `excl. VAT` by default in levelling; the rate and treatment appear on the quote.
- **Ranges and uncertainty:** `8.5–11.5%`, `58% ± 8`. Never a single point where the source is a range.
- **Value states:** `quoted` (from a supplier document), `derived` (pro-rata from a lump sum: "never shown as a quoted rate"), `estimated` (benchmark), `open`. Each state is visibly different.

### 7.2 Dates and time
- **Local to the authority:** `Sun 12 Apr 2026, 10:00 AST (UTC+3)`.
- **Countdowns:** calendar days *and* working days for anything with a deadline, e.g. "35 days · 24 working days".
- **Calendar flags** use the `When` component's flag slot: "Ramadan hours", "Eid holiday likely", "Weekend".
- **Moon-sighting-dependent dates** always say "expected".

### 7.3 Status vocabularies (one set, used everywhere)
- **RFQ** (from the Workbench, unified):
  - Draft · Sent · Opened, not yet quoted · Acknowledged
  - Quote received {date}
  - Reminder sent, {n} days to reply date · Overdue, reminder sent · No response, escalated
  - Declined, {reason}
- **Reminders rule (one version only):** 3 days before the reply date, then daily; escalate to the Procurement Lead when the reply date passes. The Workbench stated three different rules; this is the one.
- **Supplier screening:** Screened {date} · Screening due · Blocked, sanctions match · Blocked, anti-bribery. Re-screen interval 180 days.
- **Validation:** Needs check · Conflict · Accepted · Corrected · Not stated · Sent back.
- **Eligibility:** Pass · At risk · Interpretation · Fail · Not stated.
- **Contributor requests:** Requested · In progress · Submitted · Late · Declined, {reason}.
- **Committee positions:** Support · Support with conditions · Oppose · Abstain · Not yet recorded · Conflict declared.

### 7.4 Provenance
Every extracted or derived number carries a `SourceChip`. The chip is quiet (mono, `--ink-3`) until hovered or focused. On gate screens and packs, "Show all sources" makes them prominent for audit walk-throughs.

### 7.5 Masking
Masked values show `Masked` with a lock and the reason. Row counts and totals stay visible when only the values are masked ("3 quotes · values masked"). That keeps the demo point (you can see the work, not the prices) without dead space.

---

## 8. Arabic and bilingual display

- **The UI stays English and LTR.** Arabic appears as **content**: source snippets, clause originals and document titles.
- **`BilingualValue`:** English value first; beneath it, or beside it at ≥1440px, the Arabic source in Plex Sans Arabic, `dir="rtl"`, slightly muted, with the page chip.
- **Document titles in Arabic** show the Arabic title with an English working title underneath ("Working title (translated)").
- **Confidence reasons specific to Arabic and scans:** "Handwritten amount", "Stamp over text", "Table read from a skewed scan", "Arabic-only clause".
- **"Arabic text prevails":** a flag on the Requirements tab and on the Overview, whenever the document says so or doesn't say which language prevails in a bilingual tender.
- **"Read in English" summaries** carry a persistent label: "Machine translation, for understanding only. Not for submission."

---

## 9. Accessibility baseline (every new screen)

- Interactive elements are `<button>`, `<a href>` or form controls; never `<div>`/`<span>` with click handlers.
- **Visible focus ring** on every interactive element, in both themes.
- **Keyboard:** lists support ↑/↓ and Enter; sheets support prev/next and Esc; modals trap focus and return it on close (as `ModalFrame` does today).
- **No hover-only information.** Tooltips must also open on focus and on click or tap. The Workbench's rationale was hover-only.
- **Contrast:** body and sub-labels meet WCAG AA (4.5:1).
  - `--ink-4` (#77777D) on white is 4.45:1, which fails for small text. Use `--ink-3` or darker for text of 13px and below.
  - Dark theme: check the soft tints under text.
- **Status is never colour alone** (§3.1).
- **Tables:** real `<table>` with `<th scope>`; sortable headers announce their sort state (`aria-sort`).
- **Live regions** for toasts and for SLA breaches that appear while a screen is open.
- **Arabic spans** carry `lang="ar"` so screen readers switch voice.

---

## 10. Copy and tone

- **British English, sentence case, short declarative sentences.** Numbers in figures in data; words are fine in prose.
- **Name the person and the time** for every human action: "Pursued by Faisal Al-Harbi, Sun 8 Mar 11:24. Recorded in the audit trail."
- **The platform vs agents.**
  - The spec names ten agents, and the demo shows them where provenance matters: "Drafted by the Outreach & Evaluation agent", and the Agent timeline in Decisions & audit.
  - Elsewhere, write plainly about what happened, not about AI. Never write "AI-powered", "smart" or "magic".
- **Rules are stated, not implied.** Borrow these strings verbatim or nearly:
  1. "Recommendation, not a decision."
  2. "Overriding does not by itself pursue the tender."
  3. "Both are kept, with your name and the time."
  4. "Each supplier receives only the BOQ lines it was matched to, not the whole bill."
  5. "Nothing is sent to a supplier whose screening is not current."
  6. "A lump sum covering several lines is allocated pro rata and marked as derived, never shown as a quoted rate."
  7. "This is a hard block, not a warning."
  8. "Pursue unlocks once the flagged fields are confirmed."
  9. "Anything the template asks for that has no source is listed as missing rather than invented."
  10. "The platform will not issue a purchase order or commit to a supplier."
  11. "Catalyst can see that your tenant is healthy. It cannot see your tenders."
- **Terms** (use these, not synonyms):

| Use | Not | Why |
| --- | --- | --- |
| Tender | RFP, notice, opportunity | The GCC tendering word; "RFP" only when quoting a document title |
| Bid | Proposal (in the product) | "Proposal" is the Stage 6 document |
| Employer | Client, customer | The FIDIC term used in GCC contracts. "Authority" is fine for a government issuer |
| Recommendation | Verdict, suggestion | "Verdict" only inside the fit display ("Verdict: Pursue with conditions") |
| Decision | Approval | Gates record decisions |
| Pursue / Discard / Hold | Go / No-go | DG1 vocabulary |
| Bid / No-Bid | Go / No-go | DG2 vocabulary |
| Levelling, levelled quote | Normalisation (in UI) | What procurement teams say |
| Head of Tendering | Administrator, Super admin | Spec §3 |
| Credential | Document, certificate (generic) | The vault object |

---

## 11. Responsiveness

- **Demo targets:** 1440×900 and 1280×800, in both themes. Every script (spec §17) must run clean at both.
- **≥1101px:** full sidebar or rail. **≤1100px:** off-canvas drawer.
- **Tablet (768–1100px):** readable, with packs single column. Not a demo target.
- **Phone:** only the Supplier Portal is designed for it. Other screens must not break (no horizontal page scroll; tables scroll inside their card).

---

## 12. Not copied from the Workbench

- **Its demo data and figures.** They contradict each other; the report lists the examples.
- **"Bid capacity" as one concept.** We keep three separate measures:
  - **Statutory bid capacity**: a PQ formula, when a tender asks for one; it lives in eligibility.
  - **Bid-desk workload**: people-hours and concurrent bids.
  - **Bank guarantee facility headroom**: money.
- **Undo on audited decisions** (use Re-open with a reason).
- **Optional override reasons on gates.**
- **The ROI analytics tab on the working dashboard.**
- **Configuration pages inside stage groups.**
- **Hover-only rationale; no dark mode; `<span>` buttons.**
- **Its gate labels** (§2).

---

## 13. Definition of done for any Stage 1–3 screen

- [ ] Uses one archetype (§5) and only shared components (§6), or extends them in a named step.
- [ ] Every number comes from `src/data` through a derivation module. No literals in JSX.
- [ ] Every value that has a source shows a `SourceChip`. Every masked value shows `Masked`.
- [ ] Every action goes through `can()`. Disabled actions say why, in words.
- [ ] Money via `Money`, dates via `When`, statuses from §7.3.
- [ ] Light and dark, at 1440 and 1280; keyboard-only walkthrough passes; no hover-only information.
- [ ] Copy follows §10 (terms table, British English, names and times on actions).
- [ ] Demo-only controls carry `DemoTag`.
- [ ] Works after Reset, and for every tenant it applies to.
