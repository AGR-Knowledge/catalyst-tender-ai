# 027a — KPI tiles: a status word, no stripe, and the same text layout on every tile

Status: DONE (2026-09-28, reviewed) · Depends on: wave 8 (commit 10de455) and the orchestrator's wave 9 contract (below) · Can run in parallel with: 027b, 027c, 027d

## Goal
A prospect reads every KPI tile the same way, on every dashboard and screen strip:
1. the label, its ⓘ, and a **status pill** at the right ("✓ On track", "! Watch", "! Off track"), with **no coloured stripe** down the tile's left edge;
2. the value, in ink;
3. **one detail line**: what the value is made of ("15 live tenders");
4. **one reference line** under a hairline, always "key · value" ("Target 25%", "Largest SAR 450.0 M", "First needed 10 May").

Today each tile's small text is a different sentence of a different length, and it wraps to one, two or three lines.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Presentation only.** No new KPIs, facts, rules, `done` keys, capabilities or libraries. The detail and reference lines say **the same facts as today's sub-line**, split and shortened. Never a new fact.
- **Keep `sub`.** Every KPI keeps its full `sub` sentence, because the tile's `aria-label` and the dev checks read it. You add `detail` and `ref` beside it.
- **Status is never colour alone** (ui-direction §3.1): the tone becomes a word in a `StatusPill`.
- **Keep readings still.** No value, tone, `sub`, drill-down or count changes. All `/dev/checks` rows that exist today must still pass in the five tenants (after wave 8: Najd 805, Corniche 396, Dafna 377, Batinah 385, Qurain 400). Plans 027b, 027c and 027d add rows of their own in parallel; those aren't yours.
- **Stay in your files** (Scope). If a change needs another file, stop and ask.

## Context
- **Why:** user feedback, 2026-09-28, on the Head of Tendering's home (Najd, Faisal Al-Harbi, 90 days):
  - "I don't like the colour on the left side of the tiles. We want to show warning and status, but there should be a better way."
  - After seeing the orchestrator's sketch of a status pill: "The descriptive small text at the bottom of the tiles: can it be shown in a better manner? Too inconsistent as of now."
- **Today's six tiles** (Najd, Faisal, 90 days), value then sub-line:

  | Tile | Value | Sub-line today |
  | --- | --- | --- |
  | Live pipeline | SAR 3.09 bn | 15 tenders · 15 in, 20 out since Tue 9 Dec 2025 |
  | Average ticket size | SAR 241.0 M | 9 bids · largest SAR 450.0 M |
  | Win / loss | 2 won · 7 lost (orange) | Win rate 22% (n = 9) · SAR 842.0 M won · target 25% |
  | Decisions on time | 97% (orange) | 68 of 70 · 2 late, latest: DG1 on T-2026-107 (3 h) |
  | Credentials at risk | 2 (orange), owner tag "Finance" | Zakat 30 Apr · before T-2026-118 opens 10 May |
  | Bid-team load | 78% (green) | Water team, next 4 weeks · 96% with T-2026-118 |

- **The target reading** of the same tiles (the executor derives each string in the KPI's `compute`, from the same values that build `sub`):

  | Tile | Pill | Value | Detail | Reference |
  | --- | --- | --- | --- | --- |
  | Live pipeline | none (information) | SAR 3.09 bn | 15 live tenders | Since 9 Dec · 15 in, 20 out |
  | Average ticket size | none | SAR 241.0 M | 9 bids in the period | Largest · SAR 450.0 M |
  | Win / loss | ! Below target | 2 won · 7 lost | Win rate 22% · SAR 842.0 M won | Target · 25% |
  | Decisions on time | ! Below target | 97% | 68 of 70 on time | Latest late · DG1, T-2026-107 |
  | Credentials at risk | ! Renew soon | 2 | Zakat 30 Apr · GOSI 7 May | First needed · 10 May |
  | Bid-team load | ✓ Within capacity | 78% | Water team, next 4 weeks | Peak · 96% with T-2026-118 |

  Check the Credentials at risk detail against the KPI's own rows: name the credentials it counts, not the ones on the Company page.
- **Code today:**
  - `components/dashboard/KpiTile.tsx`: the value is coloured by `t-{tone}` (about line 36). The whole tile gets `tone-{tone}` (about 41), which `dashboard.css` about 37–40 turns into a 3 px coloured left border. The owner tag sits at the header's right (about 46). The sub-line is clamped to two lines (`.kt-sub`).
  - Tiles are built in two places: `domain/gcc/dashboards/build.ts` `buildTile` (from `KpiResult`, `domain/gcc/kpi/types.ts`), and `pages/gcc/s1/vm/tiles.ts` `registryTile` and `valueTile` (screen strips via `pages/gcc/s1/parts/Strip.tsx`).
  - `components/tender/StatusPill.tsx` renders a status word with its tone and glyph.
- **The orchestrator's wave 9 contract (already in the code, typecheck passes):**
  - `TileVM` has optional `detail`, `ref: TileRefVM { k, v }` and `status` (`domain/gcc/viewmodels.ts`);
  - `KpiResult` has the same three (`domain/gcc/kpi/types.ts`);
  - `buildTile`, `registryTile` and `valueTile` (`opts.detail`, `opts.ref`, `opts.status`) pass them through;
  - `tokens.css` has new `--blue*` and `--violet*` tokens (plan 027d uses them). **Nobody edits `tokens.css` in wave 9.**
- **Where tiles appear:** every dashboard (`DashboardPage`), and the screen strips of Radar, Screening, DG1 decisions and the Intake queue (`pages/gcc/s1/*.tsx`), Company › Credentials (plan 027c converts those), Administration (`pages/gcc/admin/Users.tsx`, `Committees.tsx`, via `AdminKit.tsx`) and the Platform Console (`pages/platform/Console.tsx`).
- **The action chip:** `.ac-type` in `dashboard.css` about 127–134 has the same 3 px left stripe. It is used by `ActionList.tsx` about 79 and the workspace rail (`pages/gcc/workspace/Rail.tsx` about 54).

## Scope
- **Files to create or change:**
  - `components/dashboard/KpiTile.tsx`, `ActionList.tsx` (only if the dot needs markup);
  - `components/dashboard/dashboard.css`: **only** the tile block (`.kt*`, about lines 20–60) and `.ac-type*` (about 127–134). Plan 027d edits the `.fs*`, `.sc*` and `.tt*` blocks of the same file in parallel: use targeted edits, re-read the file before each edit, and never rewrite it whole;
  - `domain/gcc/kpi/portfolio.kpi.ts`, `requests.kpi.ts`, `stage1.kpi.ts` to `stage9.kpi.ts`: add `detail`, `ref` and, where 1.3 says, `status`;
  - the `valueTile` calls in `pages/gcc/s1/Radar.tsx`, `Screening.tsx`, `Dg1.tsx`, `IntakeQueue.tsx`, `pages/gcc/admin/Users.tsx`, `Committees.tsx`: add `detail` and `ref`;
  - `pages/platform/Console.tsx` only if its tiles need `detail` and `ref` to read well;
  - `docs/07-product-design/agr-product-definition/dashboards.md` §3 only (tile anatomy). Plans 027c and 027d edit other sections of this file: re-read it right before you edit.
- **Out of scope** (stop and ask before touching):
  - `pages/gcc/company/**` (plan 027c converts the Credentials tiles and moves Suppliers to tiles);
  - the flow strip, the graph and the tracker (plan 027d);
  - `viewmodels.ts`, `kpi/types.ts`, `build.ts`, `tiles.ts` and `tokens.css` (the contract is in place; if it is wrong, stop and ask);
  - any KPI's value, tone thresholds, `sub` or drill-down;
  - the legacy `Kpis` primitive (`components/ui/primitives.tsx`);
  - other left stripes in the app (callouts, queue cards, pack sections): list them under Follow-ups.

## Steps

### Phase 1 — The tile
- [x] 1.1 Anatomy in `KpiTile.tsx`, top to bottom, the same rows on every tile:
  - [x] 1.1.1 **Header:** label, ⓘ, then the status pill pushed to the right (`StatusPill`, a compact size for tiles). On a narrow tile the pill wraps under the label; it never overlaps it or cuts a word.
  - [x] 1.1.2 **Value:** `--ink` in every tone (drop `t-{tone}` from `.kt-value`). The size steps (`sizeOf`), masked and "long" values stay as today.
  - [x] 1.1.3 **Detail:** one line, 12.5 px, `--ink-2`. It never wraps: ellipsis, with the full `sub` in the element's `title`.
  - [x] 1.1.4 **Reference:** under a hairline (`--line-2`), one line: the key muted (`--ink-3`, 11.5 px) and the value in ink (12 px, tabular numbers). The owner tag, when present, sits at the right of this line as a small muted chip ("Finance"), not in the header.
  - [x] 1.1.5 **Alignment:** tiles in one row have the same height, and their detail and reference lines sit at the same heights. A tile without a `ref` keeps the reference row's space, empty.
  - [x] 1.1.6 **Fallback:** a tile without `detail` shows `sub` as today (two-line clamp), so nothing unconverted breaks.
- [x] 1.2 The status pill.
  - [x] 1.2.1 The default vocabulary sits beside the component, as `HEALTH` does in `StatusPill.tsx`: green → "On track" (✓), orange → "Watch" (!), red → "Off track" (!). Tones `ink`, `muted`, `cyan` and none show no pill. `tile.status` replaces the word and keeps the tone's glyph.
  - [x] 1.2.2 The tile button's `aria-label` reads the status word and the full `sub`: "Win / loss: 2 won · 7 lost, Below target. Win rate 22% (n = 9) · SAR 842.0 M won · target 25%. Show these tenders".
  - [x] 1.2.3 Missing, masked and small-sample (neutral) tiles render as today, without a pill.
- [x] 1.3 Remove `.kt.tone-*` (the left border) from `dashboard.css`. Drop the `tone-*` class on `.kt` unless something else needs it.

### Phase 2 — The text rules, applied to every KPI
- [x] 2.1 **Detail:**
  - at most 26 characters, so it fits six tiles across at 1440;
  - what the value is made of or covers: a count, a scope, a split ("15 live tenders", "68 of 70 on time", "Water team, next 4 weeks");
  - at most two items joined by " · ";
  - dates as "30 Apr" (no weekday, no year); money through `domain/money.ts` as today.
- [x] 2.2 **Reference:** one pair, with the key from this list: `Target`, `Cap`, `Since {date}`, `Largest`, `Oldest`, `Latest late`, `Next`, `First needed`, `Peak`, `Worst`, `Average`. The value is at most 20 characters. If a KPI needs another key, add at most three, and list them under Deviations.
- [x] 2.3 **Status words** where the default misleads. Set `status` only where "Watch" or "On track" is wrong for that tile; at most eight in all. Start with the four in the target table ("Below target" ×2, "Renew soon", "Within capacity"), and list every one you set, with its tile and tone, under Deviations.
- [x] 2.4 Convert, in this order, checking each screen in the browser as you finish it:
  - [x] 2.4.1 `portfolio.kpi.ts`: the Head of Tendering's, CEO's and Bid Manager's homes. (acceptance: the target table above, in Najd at 90 days.)
  - [x] 2.4.2 `stage1.kpi.ts`, `stage2.kpi.ts`, `stage3.kpi.ts`, `requests.kpi.ts`.
  - [x] 2.4.3 The screen strips: Radar, Screening, DG1 decisions, Intake queue, Administration › Users and Committees.
  - [x] 2.4.4 `stage4.kpi.ts` to `stage9.kpi.ts`.
  - [x] 2.4.5 The Platform Console, only if its tiles read badly with the fallback.
- [x] 2.5 Tiles with a period comparison (`periodAware`, e.g. Live pipeline): the comparison moves to the reference line as `Since {window start}`, so it changes with the period filter. (acceptance: switch to 30 days; the reference reads "Since 7 Feb · …".)

### Phase 3 — The action chip
- [x] 3.1 `.ac-type`: remove the 3 px left border. Show a 6 px round dot in the tone colour before the text (a `::before` is fine); no dot without a tone. The chip keeps its hairline border and background.
- [x] 3.2 Check it in "Needs your action" and in the Tender Workspace rail.

### Phase 4 — The spec
- [x] 4.1 `dashboards.md` §3, tile anatomy: header with the status pill (the default words and the override), the value in ink, one detail line, one reference line with its key list, the owner chip on the reference line. Add "User decision, 2026-09-28: no coloured stripe; status is a word."

## Data and derivation
- No new facts. The contract fields are optional; each KPI's `compute` fills `detail`, `ref` and `status` from the values it already reads.
- No new `done` keys, so Reset is unaffected.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] `/dev/checks` in all five tenants: no failing row, and no fewer rows than the wave 8 counts.
- [x] Najd, Faisal Al-Harbi (Head of Tendering), home, at 1440 and 1280, light and dark, no console errors:
  - [x] no tile has a coloured left edge; the six tiles read as in the target table;
  - [x] every tile has one detail line and one reference line, aligned across the row, none truncated at 1440;
  - [x] Credentials at risk shows "Finance" on its reference line;
  - [x] each tile click still drills as before.
- [x] Najd Bid Manager home, and the CEO's home: same layout.
- [x] Stage 1, 2 and 3 dashboards (from the Head of Tendering's graph, and as their owners), a Stage 5 and a Stage 8 dashboard: every tile follows the layout.
- [x] Screen strips: Radar, Screening, DG1 decisions, Intake queue, Administration, the Platform Console.
- [x] A small-sample tile (Win / loss at 7 days) shows no pill and a neutral value.
- [x] Batinah and Qurain homes: same layout; nothing truncated.
- [x] "Needs your action" and the workspace rail: chips show a dot, not a stripe.
- [x] Reset demo returns everything to seed.
- [x] No hard-coded numbers in components; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-28.)

- **Changed files:**
  - `components/dashboard/KpiTile.tsx`: the four rows (head with `StatusPill`, value in ink, detail, reference with the owner chip), `TILE_STATUS` beside the component, the aria-label with the status word and the full `sub`. The tile carries `role="listitem"` itself (the wrapper div is gone), so it can be a subgrid of its row.
  - `components/dashboard/dashboard.css`: the `.kt*` block rewritten (subgrid rows, no `.kt.tone-*`, 12 px side padding, the detail and reference lines, a compact pill); `.ac-type*`: the stripe replaced by a 6 px `::before` dot. Nothing else in the file was touched.
  - `domain/gcc/kpi/portfolio.kpi.ts`, `requests.kpi.ts`, `stage1.kpi.ts` … `stage9.kpi.ts`: `detail`, `ref` and, where listed below, `status`. No `display`, `sub`, `tone`, `n`, `ownerTag` or drill changed.
  - `pages/gcc/s1/Radar.tsx`, `Screening.tsx`, `Dg1.tsx`, `IntakeQueue.tsx`, `pages/gcc/admin/Users.tsx`, `Committees.tsx`: `detail` (and `ref`, `status` on Screening) on the `valueTile` calls.
  - `domain/gcc/admin/tiles.ts` (**outside the list, approved by the user 2026-09-28**): its `valueTile` and `registryTile` pass `detail`, `ref` and `status` through, like the contract's `s1/vm/tiles.ts`. Admin › Sources (INT-4) reads the new lines through it.
  - `docs/07-product-design/agr-product-definition/dashboards.md` §3 only: the tile anatomy, the status words and overrides, the key list, the owner chip, the user decision, and `detail`/`ref`/`status` in the registry fields.
  - Not changed: `ActionList.tsx` (the dot needs no markup), `pages/platform/Console.tsx` (see Deviations).
- **Verification** (headless Chromium against the shared dev server at 1440 × 900 unless stated; a script read every tile's text, overflow and the spare width of its detail and reference lines):
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass (the chunk-size warning is as before).
  - `/dev/checks`: no failing row and no crashed panel in any tenant: Najd 825, Corniche 416, Dafna 397, Batinah 405, Qurain 420 passing (wave 8: 805, 396, 377, 385, 400; the +20 each are other wave 9 rows).
  - Najd, Faisal Al-Harbi, home at 90 days, 1440 and 1280, light and dark, no console errors: no left edge (every tile's `border-left-width` is 1 px); the six tiles read "15 live tenders / Since 9 Dec 15 in, 20 out", "9 bids in the period / Largest SAR 450.0 M", "! Below target · 22% · SAR 842.0 M won / Target 25%", "! Below target · 68 of 70 on time / Latest late T-2026-107", "! Renew soon · Zakat 30 Apr · GOSI 7 May / Renew by 10 May [Finance]", "✓ Within capacity · Water team, next 4 weeks / With T-2026-118 96%". Detail and reference lines sit at one height across each row; none is cut at 1440 or 1280. At 30 days the reference reads "Since 7 Feb 4 in, 9 out"; at Today "Since 00:00 0 in, 0 out"; at 12 months "Since 9 Mar 60 in, 57 out". Win / loss at 7 days (n = 1) has no pill and a neutral value.
  - Every tile click drills as before: Live pipeline, Average ticket size, Win / loss and Decisions on time set their "From tile: …" table filters; Credentials at risk opens `/company?tab=credentials&bids=affects`; Bid-team load opens `/company?tab=teams`. The aria-label reads "Win / loss: 2 won · 7 lost, Below target. Win rate 22% (n = 9) · SAR 842.0 M won · target 25%. Show these tenders"; the detail's title holds the full `sub`.
  - All five tenants at 90 days (30 days at 1280): the Head of Tendering, CEO, Bid Manager and Finance (My requests) homes, the Stage 1–9 dashboards, the eight stage owners' homes, the strips of Radar, Screening, DG1 decisions, Intake queue (as the Head of Tendering and the Coordinator), Administration › Users, Committees and Sources, and Company › Credentials: every tile has one detail and one reference row, aligned across its row, and nothing is cut except Next submission's value (below, as before this plan). Batinah and Qurain homes: nothing cut.
  - Needs your action (home) and the workspace rail (T-2026-097): DG2 and DG3 chips show an orange dot and no stripe; the untoned Booklet purchase and Renewal chips have no dot.
  - Reset: Request renewal on Zakat turns the detail into "Zakat renewal requested"; Settings › Reset demo › Reset this company brings back "Zakat 30 Apr · GOSI 7 May" with `doneBy` empty. No `done` keys were added.
  - Masked tiles: no persona reaches one in the UI today (dev check 50 builds Procurement on the CEO dashboard synthetically, and it still passes). A masked tile shows no pill (`statusOf` returns none for `masked`) and keeps its rows; checked by reading the code, not in the browser.
  - No hard-coded numbers in components and no role checks: `KpiTile` renders only what the view model holds.
- **Deviations from plan:**
  1. **Width at 1440.** A tile is 176 px wide at 1440, so it had 142 px for text at 16 px padding. The plan's 26-character detail needs about 160 px at 12.5 px, and several target strings don't fit at any readable size (measured in the page: "Win rate 22% · SAR 842.0 M won" is 186 px). So:
     - the side padding is 12 px (150 px for text), and the font sizes are as the plan says;
     - details aim at about 24 characters. Each KPI file has a small local `fit()` that takes the first wording of 24 characters or fewer ("Water team, next 4 weeks", else "Utilities team, 4 weeks", else the team name). Every dashboard above was measured, not estimated.
  2. **Target-table strings changed to fit** (same facts, shorter):
     - Win / loss detail "22% · SAR 842.0 M won" (the pill and "Target 25%" say it is a rate), or "Win rate 0%" with no win;
     - Decisions on time reference "Latest late T-2026-107" (the gate is in the title and aria-label);
     - Credentials at risk reference "Renew by 10 May" ("First needed" and the Finance chip need 164 px);
     - Bid-team load reference "With T-2026-118 96%" ("Peak 96% with T-2026-118" is 151 px). "Peak" is kept for the committed-peak branch ("Peak 118% in April", Qurain).
     - Credentials at risk's detail is the plan's string, with 2 px to spare.
  3. **New reference keys (three):** "Renew by" (Credentials at risk), "Time left" (Next submission, DG1 due, Awaiting DG2, Baselines due, Prices due, Submissions due), "With {tender}" (Bid-team load while the hero waits for DG1). "First needed" and "Average" are unused. The spec's key list says so.
  4. **Status words set (eight):** Win / loss orange "Below target"; Decisions on time orange "Below target"; Hit rate (OUT-1) orange "Below target"; Credentials at risk orange "Renew soon" and red "Expired"; Bid-team load green "Within capacity" and red "Over capacity"; Load if all pursued (Screening) red "Over capacity". Red on Win / loss and Decisions on time keeps "Off track".
  5. The "Since" key has no year, 12 months included ("Since 9 Mar"). The period filter and the ⓘ carry the full range, and "Since 9 Mar 2025" doesn't fit.
  6. Values of different size steps share a baseline across the row (`align-self: last baseline`), so their tops differ by a few pixels while the text sits level.
  7. Some sub-line facts are only in the title and aria-label now, where two items or one reference couldn't hold them:
     - Next submission's second bid;
     - the RFQ clock's "N more running";
     - Facility headroom's as-of date when a DG2 bid exists (its detail reads "SAR 88.9 M after DG2 bid");
     - Awaiting result's days;
     - Sections locked's working days.
  8. `fit`, `dm` (date without weekday) and `cap` are repeated in a few KPI files, not added to `kpi/stages.ts`, which is not in the file list.
  9. The Platform Console stays on the fallback: its tiles come from `domain/platform/console.ts` (not in the list). They read acceptably (full sub on two lines, empty reference row), so step 2.4.5 didn't call for it.
- **Blockers / questions:** one, resolved. `domain/gcc/admin/tiles.ts` dropped `detail`/`ref`/`status`; the user approved the pass-through edit (2026-09-28).
- **Follow-ups noticed (not done):**
  - Next submission's value "Thu 12 Mar, 10:00" (size step `xs`) is cut by about 10 px at 1440 on every Bid Manager home. It was cut by 14 px before this plan; the size steps were out of scope.
  - Other left stripes: `.callout` (3 px, `components/tender/tender.css` about line 77, used by queue cards and pack sections) and `.cal-chip.t-red/.t-orange` (`styles/charts.css` about 130; the old calendar chips, plan 027b's area).
  - The Console's tiles could get `detail`/`ref` in `domain/platform/console.ts`.
  - The local `fit`/`dm`/`cap` helpers could move into `kpi/stages.ts` in one place.
  - `viewmodels.ts` comments attribute `FlowPartVM.outcome` and `GraphVM.key` to "plan 027a"; they are 027d's.
  - Credentials at risk's detail has 2 px to spare at 1440 with the bundled fonts; a longer credential name in another seed would end in an ellipsis.
