# 019 — Tender Workspace and tender kit part 2

Status: READY · Depends on: 006, 017, 007a, 009a, 020 (all in `gcc-demo`) · Can run in parallel with: 015 and 013

## Goal
Every "Open tender" in the demo (a dashboard row, the tracker, an action row, the new ⌘K search) lands on **one Tender Workspace** at `/tenders/:id`. Its header says in one glance what the tender is, where it stands and what is due. Its tabs show everything about the bid, and later lanes add tabs as new files. The right rail shows the agent's recommendation, my next actions, key dates and blockers.

The plan also builds the shared components that 007b, 008b and 009b all need (recommendation card, override with a reason, source chips that open the PDF at the page, callouts, the triage sheet, request buttons, audit entries), so those three lanes can run in parallel without each building their own.

## Demo-grade rules (read first)
This is a **sales demo**, not the product. Build what a prospect sees and clicks.
- **No new rules and no new facts.** Every value comes from an existing derivation: the port (017), Stage 1 (007a), Stage 3 (009a), the lifecycles. If a value you need doesn't exist, show less, and note it under Follow-ups. Don't add a rules module.
- **Keep the dev check small:** about ten rows (Phase 6), not an exhaustive suite.
- **Polish where the eye lands:** the header, the rail and the recommendation card are on every script's path. Spend the time there.

## Context
- **Why:** s1-s3-demo-spec §4.1 (the workspace), §5 (cross-cutting behaviours: the recommendation card, override with a reason, provenance, nudge and notify, audit); ui-direction §5 C2 (layout), §6.2 (components), §7.4–7.5 (provenance, masking), §13 (definition of done). Every demo script (spec §17 A–F) passes through this page.
- **Today:** `/tenders/:id` renders `pages/gcc/TenderSummary.tsx`: a header, the tracker, and the step facts (006, fixed by 020 lane A9). It is a stop-gap and this plan replaces it.
- **Read these real files first** (the plans that made them deviated in places; their reports say how):
  - `src/domain/gcc/viewmodels.ts`: `TenderRowVM`, `TrackerVM`, `ActionVM`, `DataPort`.
  - `src/domain/gcc/port.ts` and `lifecycle.port.ts`: `dataPort().rows(...)` and `.tracker(...)`. **They already mask** win, positions, margin and price for the viewer (020 lane B). Use their values; don't recompute.
  - `src/domain/gcc/lifecycle.ts`: `lifecycle(tenant, id)` (stage log, gate records), `visible`, `visibleOf`.
  - `src/domain/gcc/dashboards/build.ts`: `actionRows(sources, ctx)` (exported by 020 lane A1) and how `KpiCtx` is built.
  - `src/domain/gcc/s1/index.ts`: `recommendationFor`, `keyDatesFor`, `blockingOpen`, `latestAddendumBadge`, `SourceRef`, `EligibilityLine`.
  - `src/domain/gcc/s3/pack.ts`: `packFor(...)`, `RECOMMENDATION_NOTE`, `isMasked`.
  - `src/data/gcc/hero.ts`: `HERO_ID` (T-2026-118, the hero), `HERO_FILE` (its booklet PDF); `row.source.documentHref` on port rows.
  - `src/components/intake/PdfViewer.tsx` (page jump plus highlight, lazy chunk), `components/overlays/Frames.tsx` (`DrawerFrame`, `ModalFrame`), `components/tender/*` (006's kit: `Money`, `When`, `Masked`, `StatusPill`, `GateChip`, `SlaClock`, `Tip`, `EmptyState`, `DemoTag`), `components/dashboard/TenderTracker.tsx`.
  - `src/domain/gcc/requestKeys.ts`: the request key contract (written by the orchestrator, shared with plan 013).
  - `src/pages/gcc/dev/KitPreview.tsx` and `fixtures.ts`: the `/dev/kit` preview.

## Scope
**Files to create:**
- **Kit** (`src/components/tender/`): `RecommendationCard.tsx`, `OverrideModal.tsx`, `ReasonCodePicker.tsx`, `SourceChip.tsx`, `SourceHost.tsx`, `Callout.tsx`, `CoverageBar.tsx`, `ThresholdBar.tsx`, `EligibilityLine.tsx`, `RequestButton.tsx`, `AuditEntry.tsx`, `Sheet.tsx`, `LangBadge.tsx`, `Tabs.tsx`; styles appended to `tender.css`.
- **Workspace** (`src/pages/gcc/workspace/`): `Workspace.tsx`, `WorkspaceHeader.tsx`, `Rail.tsx`, `tabs/types.ts`, `tabs/index.ts`, `tabs/overview.tab.tsx`, `tabs/audit.tab.tsx`.
- **View models** (`src/domain/gcc/workspace/`): `header.ts`, `rail.ts`, `audit.ts`, `index.ts`.
- **Search:** `src/components/layout/GccSearch.tsx`.
- **Dev check:** `src/pages/gcc/dev-checks/55-workspace.tsx`.

**Files to change (only these lines):**
- `src/App.tsx`: the `tenders/:id` route renders `Workspace` instead of `TenderSummary`.
- `src/pages/gcc/screens.ts`: in `screenHead`, the tender sub-title "Tender summary" becomes "Tender workspace". Touch nothing else in that file.
- `src/components/layout/Header.tsx`: render `<GccSearch />` for GCC tenants where `{!gcc && <GlobalSearch />}` sits today. Upload stays hidden (plan 007b).
- `src/pages/gcc/TenderSummary.tsx`: delete it once the workspace replaces it; move `factLabel` into the Overview tab.
- `src/pages/gcc/dev/KitPreview.tsx`, `fixtures.ts`: add a section per new component.

**Out of scope** (stop and ask):
- Any tab other than Overview and Decisions & audit (they belong to 007b, 008b and 009b; the registry below is how they add them).
- `MembersPanel` (009b), `BilingualValue` (012), `FilterBar` (the grid's own toolbar covers it).
- Editing 006's existing kit components, the dashboard components, the registries of 015/013, `gateChips.ts`, `access.ts`, the store, any data file.
- New capabilities, roles or libraries. New `done` keys other than `request:` (through `requestKeys.ts`).

## Steps

### Phase 1 — Kit components (each one visible on `/dev/kit`)
- [ ] 1.1 **`Callout`**: `variant: 'route' | 'block' | 'verdict' | 'stale'`, `title`, `children`, optional `action`. Copy rule for `block`: the body ends "This is a hard block, not a warning." (ui-direction §6.2). Tones from `tokens.css`; icon plus words, never colour alone.
- [ ] 1.2 **`SourceChip` and `SourceHost`** (spec §5.3, ui-direction §7.4):
  - [ ] 1.2.1 `SourceChip({ source, doc? })` renders the mono label (`p. 14`, `add.2 p. 3`, `Q-0412`, `Cred: GOSI`, `Calc: fit model`), quiet (`--ink-3`) until hover or focus. It accepts 007a's `SourceRef` (`kind: 'page' | 'credential' | 'project' | 'calc'`) plus `'addendum' | 'quote' | 'input'`, as a widened local type. Don't edit 007a's type.
  - [ ] 1.2.2 Click on a `page` or `addendum` chip with a `doc` (`{ url, title }`): opens `PdfViewer` at that page with `terms` highlighted, through `SourceHost`, a provider mounted once in `Workspace` (and on `/dev/kit`) that lazy-loads the viewer. Without a `doc` (most tenders have no PDF in the demo), the chip is a button that shows a `Tip`: "Page 14 of the tender documents. This demo holds a copy of the hero tender only."
  - [ ] 1.2.3 Click on `credential`, `project`, `quote`, `input` or `calc`: a `Tip` with the record's label and the one line the caller passes (`detail`). The Company vault page arrives with plan 010; don't link to it.
  - [ ] 1.2.4 Keyboard: Enter or Space opens; Esc closes the viewer and returns focus to the chip.
- [ ] 1.3 **`RecommendationCard`** (spec §5.1): props `agent`, `verdict` (text) plus a tone, `confidence` (band or level text), `confidenceWhy?`, `reasons` (at most 3 shown), `wouldChange[]`, `sources: SourceRef[]` (rendered as `SourceChip`s), `doc?`, `overriddenBy?: { name; at; reason }`, `children?` (the caller's actions). It always ends with the words "Recommendation, not a decision." When `overriddenBy` is set, it shows "Overridden by {name} at {time}: {reason}" under the verdict, with the original verdict still visible (never replaced).
  - (acceptance: on `/dev/kit`, the hero's real `recommendationFor('najd', HERO_ID, {})` (T-2026-118) as the fixture renders with three reasons, "what would change it", and two page chips; the overridden variant shows both.)
- [ ] 1.4 **`ReasonCodePicker`**: `codes: { id; label }[]`, `value: { codes: string[]; note: string }`, `required: 'none' | 'code' | 'note' | 'code-or-note'`, `onChange`. It reports its own missing-reason sentence (for the caller's disabled button): "Pick a reason or write a note."
- [ ] 1.5 **`OverrideModal`** on `ModalFrame`: props `title`, `from` (the recommendation), `options` (the choices, the opposite pre-selected), `reasonRule` (passed to `ReasonCodePicker`), `codes?`, `consequence?` (e.g. "Overriding does not by itself pursue the tender."), `onConfirm({ choice, codes, note })`. Copy under the picker: "Both are kept, with your name and the time." The confirm button is disabled until the rule is met, and the reason is shown in words beside it.
- [ ] 1.6 **`Sheet`** (ui-direction §5 C1): a 720 px right overlay on `DrawerFrame`'s motion tokens. Props `items: { id; title }[]`, `index`, `onIndex`, `onClose`, `render(id)`, `primary?` ("Open workspace"). ↑/↓ (and on-screen buttons) move through the list the caller passes (the filtered list), "n of m" in the header, Esc closes, focus is trapped and returns to the row. Full screen below 900 px.
- [ ] 1.7 **`CoverageBar`**: `segments: { label; value: MoneyVM | number; tone }[]`, shares in words for screen readers ("Self-performed 49.7%, subcontract 32.3%, …"), labels outside the bar when a segment is under 8%.
- [ ] 1.8 **`ThresholdBar`**: `value`, `band?` (±), `threshold`, `max = 100`, `masked?` (renders `Masked` in place of the bar). Text form beside it: "58 ± 8 · threshold 50".
- [ ] 1.9 **`EligibilityLine`**: one PQ line from 007a's `EligibilityLine` type: requirement, `SourceChip` for its page, the result as a word (Pass / At risk / Interpretation / Fail / Not stated, via `StatusPill`'s tone vocabulary), evidence chips (credentials), the explanation, and an `actions` slot. Don't compute the state; render 007a's.
- [ ] 1.10 **`RequestButton`** (spec §5.5): props `tenderId`, `to: Person`, `topic`, `what`, `section?`, `due` (the caller computes it on the tenant calendar). Click writes `requestWrite(...)` from `domain/gcc/requestKeys.ts` through `mark(key, msg, tone, value)` and `logAudit`. Afterwards it reads `requestFor(...)` and shows "Requested {time} · due {When short}" and is disabled. The toast names the person: "Request sent to Joseph Mathew, due Tue 10 Mar." Under View as it is disabled with "View as is read only."
- [ ] 1.11 **`AuditEntry`**: actor name and role, time (`When`), action, `before → after` when given, and a detail line. It's used by the audit tab (Phase 4) and, later, the admin audit log (010).
- [ ] 1.12 **`LangBadge`**: `EN` / `AR` / `EN+AR`, with `title` "Document language". **`Tabs`**: an accessible tab list (`role="tablist"`, arrow keys, `aria-selected`, optional badge per tab), if `components/ui` has none. Check first; reuse it if it exists.
- [ ] 1.13 `/dev/kit`: one section per component above, on fixture data, light and dark.

### Phase 2 — Workspace frame and tab registry
- [ ] 2.1 **`tabs/types.ts`:**
  ```ts
  export interface WorkspaceCtx {
    tenant: string; tenderId: string;
    row: TenderRowVM; tracker: TrackerVM | null;
    viewer: Person; viewAs: boolean; done: Record<string, string>; now: string;
    can(cap: Capability): boolean;          // can(viewer, cap, { tenderId, viewAs }) from access.ts
    openTab(id: string): void;
  }
  export interface WorkspaceTabDef {
    id: string;             // the ?tab= value
    label: string;
    order: number;          // see the table below
    plan: string;
    shows(ctx: WorkspaceCtx): boolean;     // false = the tab is absent; never an empty tab (spec §2.1)
    cap?: Capability;       // held → the panel; not held → the tab shows a Masked state with who can see it
    badge?(ctx: WorkspaceCtx): { text: string; tone?: Tone } | null;
    Panel: ComponentType<{ ctx: WorkspaceCtx }>;
  }
  ```
- [ ] 2.2 **`tabs/index.ts`:** collect `./*.tab.tsx` with `import.meta.glob({ eager: true })`, sorted by `order`; a duplicate `id` throws in dev (the same rule as the other registries). Reserve the ids and orders in a comment, so parallel lanes don't collide:

  | id | Label | Order | Owner |
  | --- | --- | --- | --- |
  | `overview` | Overview | 10 | 019 |
  | `documents` | Documents | 20 | 007b |
  | `requirements` | Requirements | 30 | 007b |
  | `eligibility` | Eligibility & fit | 40 | 007b |
  | `dates` | Key dates | 50 | 007b |
  | `queries` | Queries | 60 | 007b |
  | `sourcing` | Sourcing | 70 | 008b |
  | `inputs` | Inputs | 80 | 009b |
  | `bid-decision` | Bid / No-Bid | 90 | 009b |
  | `audit` | Decisions & audit | 100 | 019 |

- [ ] 2.3 **`Workspace.tsx`** (route `/tenders/:id`):
  - [ ] 2.3.1 The row from `dataPort().rows(tenant, { kind: 'all' }, person, 'all', state.done)`, and the tracker from `.tracker(tenant, id, person, state.done)`. **Always pass `state.done`**, and include it in every `useMemo` dependency list, so actions taken in the demo show here (plan 021, running in parallel, applies them behind the port). Any lifecycle query goes through `queriesFor({ tenant, viewer, done })` from `domain/gcc/lifecycle.port.ts`, never unbound. Not found (or restricted and not cleared) → the existing `EmptyState` text "No tender {id} here. It may belong to another company, or not be shared with you."
  - [ ] 2.3.2 The active tab from `?tab=`; unknown or hidden → `overview`. Changing tab updates the URL (`replace`), so a reload and Back behave.
  - [ ] 2.3.3 Layout (ui-direction §5 C2): the sticky header; the tab list; main content 8/12 and the rail 4/12 at ≥ 1280 px; below 1280 the rail moves under the content.
  - [ ] 2.3.4 Mount `SourceHost` once here.
- [ ] 2.4 **`App.tsx`:** point `tenders/:id` at `Workspace` (lazy, as today). Delete `TenderSummary.tsx` after moving `factLabel`.

### Phase 3 — Header and rail (view models in `domain/gcc/workspace/`)
- [ ] 3.1 **`header.ts` `workspaceHeader(tenant, row, tracker, done)`** returns the header VM (spec §4.1), read-only derivations:
  - ID, title (`row.shortTitle`; the full title from the register when there is one), issuer, city and country (with the flag emoji from the country code), value (`MoneyVM`; the original currency beside it when different, as `Money` does), `valueBasis` as words when not published ("Estimate", "Value not stated");
  - procurement type from the register tender (`procurement`: Open / PQ / Limited / Two-envelope), omitted when there is no register record;
  - a **compact stage track** from `tracker.nodes` (S1 · DG1 · S2 · S3 · DG2 · S4 … S9 · DG3 order, as the tracker has it): done, current, not reached, stopped;
  - the submission countdown (`When` with `countdown`, in the authority's time zone, working days);
  - the owner (`row.ownerName`, role) and the Bid Manager when different;
  - badges: document language (the tender's intake event `language`; omitted when unknown, never guessed), "Restricted" when the register marks it, `latestAddendumBadge(...)` (007a), and the health pill.
- [ ] 3.2 **`WorkspaceHeader.tsx`** renders it: sticky under the top bar, one line of identity and one line of track plus due plus owner, fitting 1280 px without wrapping the title into three lines (ellipsis plus a `title` attribute).
- [ ] 3.3 **`rail.ts` `workspaceRail(ctx)`**, four blocks, each omitted when empty:
  - [ ] 3.3.1 **Recommendation:**
    - Stage 1 (before DG1) → 007a's `recommendationFor(tenant, id, done)`;
    - Stage 3 (before DG2) → 009a's `packFor(tenant, id, done, viewer)`'s recommendation, with the viewer's masking (`canSeeMargin` from `see.margin`, `canSeePositions` from `see.positions`);
    - after a gate: the gate's recorded decision from the lifecycle (who, when, the decision chip), as a small verdict `Callout`, not a recommendation card.
    - The hero's `doc` is `{ url: HERO_FILE, title }` for the hero tender, else `row.source.documentHref` when present.
  - [ ] 3.3.2 **Next actions for me:** collect the action sources through the registry, as `buildDashboard` does, run `actionRows(sources, ctx)` with the viewer's `KpiCtx`, and keep the rows whose `tenderId` is this tender. **Don't define action sources here.** Whatever 015 and 013 register shows up automatically. Empty → "Nothing on this tender needs you right now."
  - [ ] 3.3.3 **Key dates:** 007a's `keyDatesFor(tenant, id, done)` for register tenders: the next three dates ahead, with `When` and GCC flags; "All key dates" opens the `dates` tab when it exists.
  - [ ] 3.3.4 **Blockers:** `tracker.now.blocker`, plus 007a's `blockingOpen(...)` count ("2 fields still being validated by Aisha Al-Qahtani") while in Stage 1, as `route` callouts.
- [ ] 3.4 **`Rail.tsx`** renders the blocks; the recommendation card's actions slot is empty in this plan (the gate screens add buttons).

### Phase 4 — The two tabs this plan owns
- [ ] 4.1 **`overview.tab.tsx`** (order 10, always shown):
  - the tender tracker (`TenderTracker`, `focusOnOpen={false}`, no close button);
  - "Where it stands": the step facts from `row.facts`, headed by the registered column header or `factLabel`, with `Masked` where `{key}.masked` is set (move the logic from `TenderSummary`). **Render each value through its registered column's renderer** (`column(key)` from `components/dashboard/columns`, which lane B's `lifecycle.cols.tsx` fills for all 91 fact keys), so money shows with its currency, percentages with "%", and dates as dates, exactly as in the table. Today's `TenderSummary` prints raw numbers ("210000000", "81", "2026-03-15"); that's the bug to avoid;
  - "Tender": sector, team, source and reference (with a `SourceChip` to the document when there is one), captured at, fit (`ThresholdBar` against the tenant's pursue threshold when the fit model gives one), win (`ThresholdBar` with band; otherwise reuse `WinCell` from `columns/base.cols.tsx`, which shows `Masked`, "From Stage 3" or "Recorded at DG2");
  - "Latest activity": the last five entries of the audit timeline (4.2), with "All activity" opening the audit tab.
- [ ] 4.2 **`audit.ts` `auditTimeline(tenant, tenderId, done, audit, viewer)`** and **`audit.tab.tsx`** (order 100, always shown):
  - from the lifecycle: stage entries and exits, and each gate record (decision, who, when, on time or late, reason codes and note, and an override flag when the decision differed from the recommendation);
  - from the demo: the tenant's `AuditEvent`s whose `target` is this tender (these are the actions taken during the demo);
  - newest first, grouped by day, each an `AuditEntry`. Masked text stays masked (the lifecycle port's sentences already are).
  - Header line: "Every decision and action on this tender: who, when and why."
- [ ] 4.3 **Leave room:** a tab owned by a later lane doesn't exist yet, so it isn't shown. No "coming soon" tabs.

### Phase 5 — ⌘K tender search (GCC)
- [ ] 5.1 **`GccSearch.tsx`**: a top-bar button ("Search tenders", `⌘K` / `Ctrl K`) opening a small command list over `dataPort().rows(tenant, { kind: 'all' }, person, 'all')`, the rows the viewer may see. It matches ID, short title, issuer and city. Each result shows ID · short title · stage chip · health. Enter opens `/tenders/:id`. Esc closes. At most eight results, live first.
- [ ] 5.2 `Header.tsx`: render it for GCC tenants in place of the hidden `GlobalSearch`. Restricted T-2026-121 is findable only by cleared people (it isn't in the others' rows).

### Phase 6 — Dev check (`55-workspace.tsx`, about ten rows)
- [ ] 6.1 Every registered tab has a unique id and an order from the reserved table.
- [ ] 6.2 Hero (Najd `HERO_ID`, T-2026-118) header: value, the addendum badge, and a submission countdown in working days are present; the header VM has no `undefined` strings.
- [ ] 6.3 Rail on the hero as its Bid Manager: the Stage 1 recommendation with three reasons and at least one page source.
- [ ] 6.4 Rail on T-2026-097 (Stage 3) as the Procurement Lead: the serialised rail and header contain no win, margin or price values (compare against the Head of Tendering's).
- [ ] 6.5 Audit timeline on a tender past DG1: it contains the DG1 record with who, when and the decision.
- [ ] 6.6 Search: `T-2026-121` isn't in the results for Aisha, and is for Faisal.
- [ ] 6.7 `requestKeys`: a `requestWrite` then `requestFor` round-trip on an in-memory `done`.

## Data and derivation
- **No new facts.** New derivations only in `domain/gcc/workspace/` (header, rail, audit), built on the port, the lifecycles, 007a and 009a.
- **`done` keys:** `request:{TID}:{toId}:{topic}` through `requestKeys.ts` only. Reset demo clears it with the rest of the tenant.

## Acceptance checks
- [ ] typecheck and build pass.
- [ ] `/dev/checks` in all five GCC tenants: every panel passes, including 55, with no console errors.
- [ ] Click-through at 1440 and 1280, light and dark:
  - As the Head of Tendering (Najd): open the hero T-2026-118 (Al-Rawdah STP Phase 2) from the ⌘K search. The header, Overview, rail recommendation and Decisions & audit tab all render. A page chip in the recommendation opens the booklet at that page with the value highlighted, and Esc returns focus.
  - As the Procurement Lead: T-2026-097 shows "Masked for your role" wherever win or price would be, never a blank or "From Stage 3". On T-2025-329 the blocker reads "Margin below the minimum (figures masked for your role)".
  - As the Coordinator: T-2026-121 isn't findable, and its URL shows the "No tender here" state.
  - Under View as (Head of Tendering viewing Omar): the rail's next actions appear, disabled, with the read-only reason.
  - In another tenant (Qurain): the hero's header shows KWD and Kuwait time.
- [ ] Every dashboard's "Open tender" and the tracker's button land on the workspace (check one per dashboard that exists when you finish).
- [ ] Reset demo clears a `request:` key written from `/dev/kit`.
- [ ] gen-in unchanged (its search, drawer and pages).
- [ ] No numbers typed into pages, no role checks outside `access.ts`, no `Date.now`, `Math.random` or bare `new Date()`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
