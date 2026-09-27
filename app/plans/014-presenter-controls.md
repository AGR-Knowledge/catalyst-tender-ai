# 014 — Presenter controls and the Compare tenants lens

Status: DONE (2026-09-27, reviewed) · Depends on: 007b, 008b, 009b, 021, 022, 023 (all in `gcc-demo`) · Can run in parallel with: 010, 012, 018

## Goal
A presenter can run any demo script from a known starting point in **one click**, and can show script D, "Same tender, five companies", in one screen:
- a labelled **Demo menu** in the header with the four scenario presets;
- "Advance agent work";
- Reset for this company or all;
- "Advance to Stage 3" for the two new demo tenders;
- the **Compare tenants** lens, where the hero tender T-2026-118 gives five different answers side by side: Pursue, Recommend discard, Pursue with a JV, Recommend discard, Pursue with conditions (s1-s3-demo-spec §11).

Today a presenter must click through Stage 1 and DG1 before showing RFQs or the committee. A mis-click mid-meeting means starting over, and script D needs five tenant switches.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Every control is labelled "Demo"** (`components/tender/DemoTag.tsx`) and never presented as a product feature (CLAUDE.md rule 5).
- **Presets are recipes, not snapshots.** A preset writes its keys through the domain writers that own them (`dg1Write`, `validationAction`, `packagingWrite`, `rfqWrite`, `packRerunWrite`, `packIssueWrite`, …), in order, on the demo clock. It never types a key or value by hand, so a preset can't drift from what a click would write. `pages/gcc/dev-checks/45-demo-state.tsx:64-70, 120-124, 163-200` already builds these recipes in memory: start from them.
- **One file per recipe**, collected by glob, like the other registries.
- **Keep the dev check small:** about 12 rows.

## Context
- **Why:**
  - s1-s3-demo-spec §16 (presenter controls), §11 (five tenants, one tender, five answers), §17 script D, §19 ("Reset returns to seed. Scenario presets land in their stated state");
  - product-foundation's demo scenarios;
  - the orchestrator's wave 4 review follow-up: a Stage 2 tender with a seeded pack needs a way into Stage 3 (`domain/gcc/s3/ready.ts`).
- **The store** (`src/state/store.tsx`):
  - saved state (:77-92): `tenant`, `doneBy`, `uploads`, `personBy`, `auditBy` (≤ 200 per tenant) and `showBanner`;
  - `mark` (:267-270) writes one key to the active tenant. The only multi-key write is `writeTo` (:211-220, :297): a named tenant, a map of keys, and one audit entry;
  - `nextAuditAt` (:193-197) stamps entries a minute apart from 10:00;
  - Reset (:318-329) has two scopes, `'all'` and `'tenant'`. Both keep the persona and the theme and end View as.
- **Reset UI:** `ResetModal` (`components/overlays/Modals.tsx:228-244`) opens from the persona menu footer (`components/layout/Header.tsx:208`) and from Settings, in the Demo session card (`pages/Settings.tsx:153-170`).
- **Header:** `Header.tsx:108-251` holds TenantSwitch (:115, a "Demo · Switch company" popover), search, upload, alerts, theme, then the profile (the "Demo · Switch persona" group and View as, :155-212).
- **Existing demo control:** "Demo: suppliers reply now" (`pages/gcc/s2/PackageBoard.tsx:68-89`) uses `pendingReplies` (`pages/gcc/s2/simulate.ts:29-38`, whose header says this plan reuses it) and `desk.applyAll` (`pages/gcc/s2/vm/desk.ts:71-77`). Scripted replies live in `data/gcc/s2/replies.ts:69-133` (the hero in Najd, Dafna and Qurain; T-2026-061 in Corniche; T-2026-042 in Batinah).
- **No preset mechanism exists.** "scenario" in the store is the Indian price scenario; leave it alone.
- **Appliers** (`domain/gcc/demo/*.apply.ts`, name order):
  - `10-dg1` Pursue moves a tender to Stage 2 packaging;
  - `20-stage2` walks Stage 2 to best-fit-approved and stops;
  - `30-stage3` runs only when the lifecycle's facts are already Stage 3;
  - `40-dg2`;
  - `90-invited` (must stay last).
  - **Nothing moves a tender from Stage 2 to Stage 3**, and the hero has no Stage 3 seed. Script C's committee tender is Najd's **T-2026-097** (`data/gcc/lifecycle/live/najd.ts:182-205`: pack issued, stale after Addendum 2, 2 of 5 positions, win 58 ± 8).
  - T-2026-061 (Corniche, 022) and T-2026-042 (Batinah, 023) have seeded packs, hidden by `seededPackReady` until `pack-ready:{TID}` is set (`s3/ready.ts:9, 18-23`).
- **Script A and B keys:** `val:{id}` (`domain/gcc/s1/validation.ts:104`), `dg1:` (`dg1/decision.ts:179`, needs `dg1PackFor`), and the Stage 2 keys in `domain/gcc/s2/done.ts:46-63` (`packagingWrite` `s2/packaging.ts:126`, `shortlistWrite` `s2/shortlist.ts:191`, `rfqWrite` `s2/rfq.ts:183`, `supplierQuoteWrite` `s2/portal.ts:128`).
- **Compare:** the hero exists in all five tenants. Per-tenant readers take a tenant and that tenant's `done` (`state.doneBy[k]`):
  - `eligibilityFor` (`s1/eligibility.ts:705`);
  - `fitScoresFor` (:777) and `fitFor` (`s1/fit.ts:93`);
  - `recommendationFor` (:206);
  - `bidBondFor` (`s1/bond.ts:135`) and `facilityHeadroom` (:57);
  - `dg1PackFor`.

  The expected five answers are in `pages/gcc/dev-checks/70-stage1.tsx:47-70, 171-200` (fit 82/63/71/38/78).

## Scope
**Files to create:**
- `src/domain/gcc/demo/presets/`:
  - `types.ts`: `Preset { id; label; line; tenants: string[] | 'all'; build(tenant, seedDone): { writes: Write[]; audit: AuditDraft[] } | { unavailable: string } }`;
  - one `*.preset.ts` per preset (below);
  - `index.ts`, globbed.
- `src/domain/gcc/demo/compare.ts`: `compareHero(state)`, one column per tenant.
- `src/domain/gcc/demo/25-stage3-entry.apply.ts`: the Stage 2 → 3 move (Phase 4).
- `src/components/layout/DemoMenu.tsx` (+ styles in `layout.css`).
- `src/pages/gcc/demo/Compare.tsx` (+ `compare.css`): route `/demo/compare`.
- `src/pages/gcc/dev-checks/46-presenter.tsx`.

**Files to change (only these lines):**
- `src/state/store.tsx`: one new action, `applyPreset(tenant, writes, audit)`, which resets that tenant (as `'tenant'` Reset does), then sets every write and appends the audit entries, stamped with `nextAuditAt`, in one state update. Nothing else in the store changes.
- `src/components/layout/Header.tsx`: render `<DemoMenu />` beside TenantSwitch, for GCC tenants only. Re-read the file before editing.
- `src/App.tsx`: one route, `/demo/compare`. Re-read before editing.
- `pages/gcc/s2/simulate.ts`: move `pendingReplies` to `src/domain/gcc/s2/simulate.ts` and re-export it from the old path, so `PackageBoard` keeps working unchanged.
- `pages/gcc/workspace/WorkspaceHeader.tsx`: a "Compare tenants (demo)" link on T-2026-118 only.

**Out of scope** (stop and ask):
- **"Treat as newly published"**, deferred by the orchestrator (2026-09-27). Key dates are read without `done` in about 14 modules (`s1/dates.ts:56`, `s1/common.ts:28`), so a date shift would touch every stage module, and no demo script uses it. The past-dated rows keep their `stageNote`.
- **Prospect branding** (plan 010, Administration › Branding).
- Changes to the appliers `10`–`40` or `90`, or to any domain writer.
- A new persona or tenant; the Indian preview; new libraries.

## Steps

### Phase 1 — Store action and the Demo menu
- [x] 1.1 `applyPreset` in the store (Scope). (acceptance: after a preset, a reload shows the same state, and Reset this company returns to seed.)
- [x] 1.2 `DemoMenu`: a header button "Demo" with the `DemoTag` outline style, opening a popover with these groups:
  - **Start from**: the presets for this tenant, each with its one-line description; one that doesn't apply is disabled with its reason;
  - **Simulate**: "Advance agent work" and "Advance to Stage 3" (when it applies to the tender on screen);
  - **Views**: "Compare tenants";
  - **Reset**: this company, or all companies, through the existing `ResetModal`.

  Keyboard: Enter opens it, arrow keys move, Esc closes and returns the focus to the button.
- [x] 1.3 Each action ends with a toast saying what happened and where to go ("Start: RFQs out. The hero is in Stage 2 with 11 RFQs out. Open the package board") and a route to that screen.

### Phase 2 — The four presets
- [x] 2.1 `morning-intake.preset.ts` ("Start: morning intake", all tenants): the seed. It writes nothing after the tenant reset. It lands on the dashboard.
- [x] 2.2 `dg1-due.preset.ts` ("Start: DG1 due"): the hero's DG1-blocking validation items resolved as the Coordinator would, through `validationAction`, exactly as `resolved()` in `45-demo-state.tsx:64-67` does, so the DG1 pack unlocks. It lands on `/dg1?tender=T-2026-118`. All five tenants: it doesn't decide DG1, so it also works where the agent recommends discard.
- [x] 2.3 `rfqs-out.preset.ts` ("Start: RFQs out"): as 2.2, then DG1 Pursue with the recommended team, the recommended packaging and shortlists, and every RFQ sent, all through their writers. No supplier replies yet. It lands on the package board. For tenants whose DG1 recommendation is discard, it is unavailable: "The agent recommends discarding the hero here, so script B runs in Najd, Dafna or Qurain."
- [x] 2.4 `dg2-committee.preset.ts` ("Start: DG2 committee", Najd only): T-2026-097's pack re-run on Addendum 2 and issued (`packRerunWrite`, `packIssueWrite`), the seeded 2 of 5 positions kept. It lands on `/dg2?tender=T-2026-097`. Unavailable elsewhere: "Script C runs in Najd."
- [x] 2.5 Every preset's writes carry audit entries marked as demo controls, so the audit log reads "Presenter (demo control)" for them (plan 011's convention in `pages/gcc/admin/AuditLog.tsx`).

### Phase 3 — Advance agent work
- [x] 3.1 "Advance agent work" completes, for the current tenant:
  - the scripted supplier replies still pending (`pendingReplies`, submitted as `PackageBoard`'s button does);
  - nothing else. Extraction resolves at upload, and a pack re-run is a person's action, not an agent's.

  The toast says what was done: "3 supplier replies received (simulated)". With nothing pending it is disabled: "No agent work is pending."
- [x] 3.2 The PackageBoard button keeps working and gives the same result (both call the same function).

### Phase 4 — Advance to Stage 3 (the two new demo tenders)
- [x] 4.1 A tender qualifies when it is in Stage 2 in its lifecycle, is live, and has a seeded pack (`PACK_VERSIONS`): today T-2026-061 (Corniche) and T-2026-042 (Batinah), after their DG1 Pursue.
- [x] 4.2 The control writes `pack-ready:{TID}` (`packReadyKey`) and `stage3-entry:{TID}` → `{ at, byId }` with an audit entry "Moved to Stage 3 (demo control)".
- [x] 4.3 `25-stage3-entry.apply.ts` reads `stage3-entry:`:
  - it adds a `{ stage: 3, step: <Stage 3's first step in data/gcc/stages.ts> }` log entry owned by the Bid Manager;
  - it sets `S3Facts` built from the seeded pack and inputs: `pack` from `packVersionsFor`, `inputs` from `inputsFor`, `positions` empty, `win` and `marginRange` from the pack's 9.x sections (as `30-stage3.apply.ts:46-60` reads them), `facilityAfter` from `facilityHeadroom` minus `bidBondFor`.

  It runs before `30-stage3`, so that applier then keeps the facts current. Pure and idempotent.
- [x] 4.4 After the move, the tender shows in its tenant's Stage 3 dashboard and `/packs`, its Inputs tab lists the seeded inputs, and the pack opens.

### Phase 5 — Compare tenants lens
- [x] 5.1 `compareHero(state)` returns one column per GCC tenant, each read with **that tenant's `done`**:
  - fit score and band;
  - the eligibility verdict with its failing or at-risk lines;
  - the DG1 recommendation;
  - the initial guarantee against facility headroom;
  - team load;
  - the tenant's decision if DG1 is recorded.

  Money in each tenant's currency, through `domain/money.ts`.
- [x] 5.2 `/demo/compare`:
  - a header "Demo view: the same tender in five companies", with the `DemoTag`;
  - five columns, one per tenant (brand chip, country, currency);
  - rows aligned across columns, so the eye reads across.

  The five answers match §11 and dev-check 70's expectations. Clicking a column switches to that tenant and opens the hero there. At 1280 the columns scroll horizontally inside the card, not the page.
- [x] 5.3 Entry from the Demo menu and from the hero's workspace header.

### Phase 6 — Dev check and polish
- [x] 6.1 `46-presenter.tsx`, about 12 rows:
  - every preset builds without an error in the tenants it lists;
  - an unavailable one returns its reason;
  - after `rfqs-out` the hero's RFQ count equals the package count, and the clock reads from DG1;
  - after `dg2-committee` T-2026-097's pack is issued and fresh;
  - `compareHero` gives the five answers of dev-check 70;
  - `25-stage3-entry` moves T-2026-061 to Stage 3 with a pack, and leaves the hero alone;
  - no preset writes a key outside its tenant.
- [x] 6.2 Each preset clicked in the browser from a dirty state lands exactly where its toast says. 1440 and 1280, light and dark, no console errors.

## Data and derivation
- No new facts. Presets are recipes over existing writers. Compare reads the existing per-tenant readers.
- New done keys:
  - `stage3-entry:{TID}` (and the existing `pack-ready:{TID}`);
  - presets write only keys the product flows already write.

  All live in the tenant's `done`, so **Reset demo** clears them.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] As Omar (Najd Bid Manager), from any state:
  - "Start: DG1 due" → the DG1 pack is ready;
  - "Start: RFQs out" → the package board with every RFQ out; "Advance agent work" → the scripted replies arrive;
  - "Start: DG2 committee" → T-2026-097's gate with a fresh issued pack.
- [x] Script D: Demo → Compare tenants shows the five answers; a column opens that tenant's hero.
- [x] In Corniche: after DG1 Pursue on T-2026-061, "Advance to Stage 3" → the tender is in Stage 3 and its pack opens.
- [x] Reset (this company / all) returns to seed after any preset.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`; every control carries the Demo label.

## Execution report
(Filled in by the executor, 2026-09-27.)

- **Changed files:**
  - New:
    - `src/domain/gcc/demo/presets/types.ts`, `recipe.ts`, `index.ts` (globbed), `morning-intake.preset.ts`, `dg1-due.preset.ts`, `rfqs-out.preset.ts`, `dg2-committee.preset.ts`;
    - `src/domain/gcc/demo/25-stage3-entry.apply.ts`: the applier, plus `stage3Candidates`, `stage3Entry` (qualifies, or why not) and `stage3EntryWrite`;
    - `src/domain/gcc/demo/compare.ts`: `compareHero`, `compareSubject`;
    - `src/domain/gcc/s2/simulate.ts`: `pendingReplies` and `scriptedCount` moved here, plus `pendingRepliesAll` for "Advance agent work";
    - `src/components/layout/DemoMenu.tsx`;
    - `src/pages/gcc/demo/Compare.tsx`, `compare.css`;
    - `src/pages/gcc/dev-checks/46-presenter.tsx`.
  - Changed:
    - `src/state/store.tsx`: the `preset` action and `applyPreset(tenant, writes, audit)` only;
    - `src/components/layout/Header.tsx`: `{gcc && <DemoMenu />}` beside TenantSwitch, the import, and the `/demo/compare` title (deviation 5);
    - `src/App.tsx`: the lazy `Compare` and the `/demo/compare` route;
    - `src/pages/gcc/s2/simulate.ts`: now a re-export of the domain module; `PackageBoard` is unchanged;
    - `src/pages/gcc/workspace/WorkspaceHeader.tsx`: the "Demo · Compare tenants" link, on T-2026-118 only;
    - `src/styles/layout.css`: the Demo menu block at the end.
- **Verification:**
  - `npm run typecheck` and `npm run build` pass. The build's large-chunk warning was there before this plan. Compare is its own lazy chunk.
  - `/dev/checks` in all five tenants: 24 of 24 panels pass, no console errors. Panel 46 meets 12 of 12 targets, with three info rows:
    - RFQs out issues 11 of 11 hero packages in Najd, 7 of 11 in Dafna and 10 of 11 in Qurain (deviation 3);
    - the Stage 3 facility figure equals headroom − bid bond for both tenders: AED 157.6 M and OMR 11.0 M.
  - Browser: this session has no browser tool, so I drove headless Chromium with the Playwright 1.63 found in the npx cache (scripts in the session scratchpad, not the repo). Port 5183 already had a Vite server from 26 Sep serving this checkout; I used it rather than stop a process I didn't start.
  - Clicked through, with no console errors:
    - **As Omar (Najd, 1440, light):**
      - keyboard: Enter opens the menu with the focus on the first item; the arrows, Home and End move; Esc closes it and returns the focus to the button;
      - "Start: RFQs out" lands on the package board: 42 RFQs for 11 of 11 packages, the clock "All issued" from the DG1 Pursue at 10:03, 27 audit entries;
      - "Advance agent work": 13 replies, 2 of them declines; after it the item reads "No agent work is pending";
      - a reload keeps the state;
      - "Start: DG1 due", from that dirty state, leaves only the two `val:` keys, and the DG1 pack is unlocked;
      - "Start: DG2 committee": `/dg2?tender=T-2026-097` with pack v2 issued, fresh, 2 of 5 positions;
      - Reset this company, and Reset all companies, return to seed (`doneBy` and `auditBy` empty).
    - **As the Head of Tendering (Najd, 1280, dark):** the audit log shows the preset summary as "Presenter (demo control)" and each writer's entry under the named person with the Demo chip. The hero's Decisions & audit tab never shows Catalyst.
    - **Corniche and Batinah:** after DG1 Pursue on T-2026-061 (written with the queue and DG1 writers), "Advance T-2026-061 to Stage 3" opens `/packs?tender=T-2026-061` at pack v1. The tender is then:
      - on the Stage 3 dashboard and in `/packs`;
      - "3 · Bid decision · Pack in preparation" in its workspace;
      - listing its seeded inputs on the Inputs tab.

      The item then says it is already in Stage 3, and Reset returns it to Stage 1. T-2026-042 in Batinah behaves the same.
    - **Qurain:** the package board's own button (as the Procurement Lead) submits the same 12 replies. "Start: morning intake" writes nothing and lands on the dashboard.
    - **Script D:** Compare tenants at 1440 light and 1280 dark shows the five answers (82/63/71/38/78, verdicts as dev-check 70). The columns scroll inside the card, never the page (page `scrollWidth` equals the window). A column opens the hero in that company.
    - **Indian preview:** no Demo menu. `/demo/compare` is "Not found" there, as for other GCC-only routes.
    - **Header titles at 1440 and 1280,** as the Head of Tendering, Bid Manager and Procurement Lead, on 15 routes and the nine stage dashboards: none wraps (deviation 6).
- **Deviations from plan:**
  1. **Audit attribution (the user's decision, 2026-09-27):** `AuditLog.tsx` prints "Presenter (demo control)" only when the actor is the Catalyst operator. So each preset records:
     - one summary entry, `Scenario preset "…" applied (demo control)`, as the operator with no tender target. The audit log reads "Presenter (demo control)" for it, and no tender's audit tab shows Catalyst acting in the tenant;
     - each writer's own entry, under the person the writer names, with " (demo control)" added to the action. The audit log shows these under that person with the Demo chip, not as "Presenter".
  2. **`Preset` has two extra fields:**
     - `order`, because the plan's file names sort alphabetically, not in menu order;
     - `build` returns `to` and `message` (step 1.3's landing screen and toast).

     The shared builder lives in `presets/recipe.ts`. Its `nextAt()` mirrors the store's clock, so a value stamped by a Stage 1 writer reads the same time as its audit entry. Stage 2 writers keep their default stamp, as the screens do. Built results are cached per tenant (seed-only input).
  3. **RFQs out skips packages with no screened supplier,** as "Approve all as recommended" does on the Shortlists screen (package state `none`). Without this, `shortlistWrite` refused in Dafna and Qurain. The toast says how many packages have no screened supplier.
  4. **DG2 committee also logs "Committee notified",** as the pack screen's Issue does.
  5. **Header.tsx gained one line in `usePageHead`** for the `/demo/compare` title. `screens.ts` isn't mine this wave, and without the line the header read "Not found".
  6. **The Demo button is a text-only cyan pill:**
     - no icon, and the chevron shows only above 1500px, because with the icon four titles wrapped for the Head of Tendering at 1440;
     - the selectors are `.hd-pill.hd-demo`, because `components.css` loads after `layout.css`.
  7. **The Stage 3 facts' `facilityAfter` is the pack's own §9.5 figure,** so it can't change when `30-stage3` takes over after an issue. It equals `facilityHeadroom − bidBondFor` for both tenders (dev-check info rows).
  8. **Reset is one menu item,** "Reset demo…", which opens the existing ResetModal (this company or all companies).
  9. **Advance agent work** runs across all the tenant's tenders being sourced (`pendingRepliesAll`), then shows the package board of the first tender that received replies. It is a presenter control, so it runs for any persona; the board's button still needs `rfq.send`.
  10. **Advance to Stage 3 appears only in tenants with a candidate** (Corniche, Batinah). It is enabled only when the candidate is on screen (`/tenders/:id` or `?tender=`) and in Stage 2; otherwise it shows the reason. The audit actor is the presenter's persona.
- **Blockers / questions:** none open. The audit question (deviation 1) was asked and answered.
- **Follow-ups noticed (not done):**
  - `AuditLog.tsx`: `presenter = k === 'demo'` (one line) would label every demo control "Presenter (demo control)", including persona and company switches. The user chose not to change it in this plan.
  - T-2026-061's and T-2026-042's seeded inputs are stamped 07:50–09:45 on demo day, before a DG1 Pursue recorded in the demo at about 10:00. The Inputs tab shows them requested before the pursue (plan 022 and 023 data).
  - After "Advance to Stage 3", a DG1 re-open takes the tender back to Stage 1, but `pack-ready:` stays, so `/packs?tender=` still opens its pack. The tender isn't listed anywhere.
  - Stage 3 opens at "Pack in preparation", as the plan says, although all six seeded inputs are in. `30-stage3` moves it on when the pack is issued.
  - The Demo menu needs a scroll to reach Views and Reset at a 900px window height.
