# 024 — Administration: users and roles, gates, sources, fit model, targets, branding

Status: DONE (2026-09-27, reviewed) · Depends on: 003, 006, 011, 013, 015 (all in `gcc-demo`) · Can run in parallel with: 010, 012, 014, 018

## Goal
The Head of Tendering opens **Administration** and sees how the platform is set up for their company:
- who has which role, with **View as** one click away;
- which gates exist, who owns each, the committee's seats and quorum;
- the tender sources and their health;
- the fit model's weights and thresholds, with a **what-if that shows the live impact** ("Raising Experience to 30% moves 2 live tenders from Pursue to Pursue with conditions");
- every target and SLA the dashboards use;
- **Branding**, where the presenter sets the prospect's logo and accent colour before a meeting (s1-s3-demo-spec §16), so the prospect sees their own company in the demo.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Read the real settings; change only two things.** Every page shows the seed's settings, derived from `src/data`.
  - Branding is the only saved write.
  - The fit model is a what-if: nothing is saved, as with the JV scenario on the Eligibility panel. "Apply" is out of scope, because five modules read the fit model and a saved change would move every dashboard target.
- **Targets are listed, not edited.** Each shows where it is used. Editing is out of scope.
- **No new roles or capabilities.** The admin is the Head of Tendering (roles-and-access R1: the tenant super admin merged into it). The caps `admin.users`, `admin.gates`, `admin.sources`, `admin.fit`, `admin.targets` and `admin.branding` already exist, held by `hot` only.
- **Keep the dev check small:** about 10 rows.

## Context
- **Why:**
  - roles-and-access R1 and T1 (179-200: the Head of Tendering edits the capability profile, fit weights, gate approvers and committee membership, KPI targets and branding, and administers users and sources) and the matrix (522-527);
  - kpi-and-screen-catalogue §D (430-438) and §0.4 (46-57, every target);
  - B11 ("Gates without owners (blocks!)", 195);
  - s1-s3-demo-spec §16 (prospect branding).
- **Screens** (`src/pages/gcc/screens.ts:39-46`): `/admin` (Administration, `admin.view`), `/admin/users` (`admin.users`), `/admin/committees` (`admin.gates`), `/admin/sources` (`admin.sources`), `/admin/fit` (`admin.fit`), `/admin/targets` (`admin.targets`) and `/admin/branding` (`admin.branding`), all `built: false`. `/admin/audit` is built (plan 011, `pages/gcc/admin/AuditLog.tsx`). The sidebar's pinned Administration group already lists them (`src/data/access.ts:476-483`).
- **Data:**
  - people and roles: `src/data/people.ts` (`Person` 15-34, ROSTER 65-91, `gccPeople` 96-127, `PERSON_GROUPS` 37, `peopleOf` 151), roles in `src/data/roles.ts`, capabilities by role in `access.ts:188-266`;
  - committees: `Seat`, `SEATS`, `SEAT_LABEL`, `committeeOf` (`people.ts:12, 40, 42, 166`), `DG2_QUORUM = 3` and `DG2_SEATS = 5` in `src/data/gcc/targets.ts`;
  - gate SLAs: `GATE_SLA_HOURS = { DG1: 24, DG2: 24, DG3: 48 }` (`targets.ts:11`); gate authority is in dashboards.md §9;
  - sources: `gccData(tenant).sources` (`Source`, `src/data/gcc/types.ts:144-152`: kind, mode, state `healthy | degraded | credentials-expiring | down`, lastPoll). The legacy `src/data/tenants.ts:53` `sources` is what `pages/Settings.tsx` lists today; plan 004's review asked to switch GCC to the seed's list;
  - fit: `FitModel` (`types.ts:26-36`: weights, pursueAt, conditionsFrom, band, singleLimit, dg2Referral, safeDeliveryPct) per tenant (for example `tenants/najd.ts:845-852`), with `fitFor` and `fitScoresFor` (`domain/gcc/s1/fit.ts:93`, `s1/eligibility.ts:777`) and `weightedOf` (`s1/common.ts:73`);
  - targets:
    - `src/data/gcc/targets.ts` (NEAR_WD, CRITICAL_WD, SLA_OK_SHARE, SLA_AT_RISK_SHARE, MIN_N, RATE_BANDS, TURNAROUND_HOURS, BOND_VALIDITY_DAYS_KSA, …: "Administration › Targets & SLAs (plan 010) will edit them");
    - `STAGE_BANDS` (`domain/gcc/kpi/stages.ts:81-96`);
    - `INTAKE_TARGET_MIN` (`domain/gcc/s1/intake.ts:21`);
    - `TENANT_TARGETS` (`data/gcc/portfolio.ts:19`);
    - `RFQ_CLOCK_HOURS` and the other Stage 2 constants in `data/gcc/s2`;
  - branding: `TenantProfile.accent` and `monogram` (`src/data/tenants.ts:28-30`). The store sets `document.documentElement.dataset.tenant` (`src/state/store.tsx:388-389`); `tokens.css:183-201` maps `[data-tenant]` to `--brand`, `--brand-soft` and `--brand-ink` from the `--acc-*` palettes (147+ light, 165+ dark); `TenantSwitch.tsx:13` shows the monogram; the sidebar's "C / Catalyst" mark is the vendor's and stays.
- **View as:** `startViewAs` in the store (345-346), the header's "View as…" submenu (`components/layout/Header.tsx:193-200`), `ViewAsBanner.tsx`. The Settings "Users and roles" card (`pages/Settings.tsx:104-128`) only toasts.

## Scope
**Files to create:**
- `src/pages/gcc/admin/`: `Admin.tsx` (the landing: one card per section, each with a one-line status, e.g. "9 sources · 1 degraded"), `Users.tsx`, `Committees.tsx`, `Sources.tsx`, `FitModel.tsx`, `Targets.tsx`, `Branding.tsx`, `admin.css`. Don't change `AuditLog.tsx` (plan 011's).
- `src/domain/gcc/admin/`: `users.ts` (people with role, scope, key capabilities in words, seat), `gates.ts` (the three gates with owner, SLA, quorum, referral threshold, "gates without owners"), `sources.ts`, `fitWhatIf.ts` (`fitWhatIf(tenant, done, model)` → per live Stage 1 tender the weighted score and verdict now and with the model, plus the changed ones), `targets.ts` (the list: name, value with unit, where it is used, source file), `branding.ts` (key contract below, `brandingOf(done)`), `index.ts`.
- `src/pages/gcc/dev-checks/67-admin.tsx`.

**Files to change (only these lines):**
- `src/pages/gcc/screens.ts`: the six `/admin*` entries and `/admin` only (`built: true`, `page`). Re-read it before editing; plans 010 and 018 edit their own entries at the same time.
- `src/components/layout/AppShell.tsx`: apply the branding. When `brandingOf(done)` has an accent, set `--brand`, `--brand-soft` and `--brand-ink` inline on the shell root from that palette's `--acc-*` variables. **Don't edit `tokens.css`**, because plan 012 edits it.
- `src/components/layout/TenantSwitch.tsx`: show the uploaded logo in place of the monogram when one is set.
- `pages/Settings.tsx`, in the GCC branch only: the "Users and roles" card links to `/admin/users`; "Sources watched" reads `gccData(tenant).sources` and links to `/admin/sources`. The legacy branch doesn't change.

**Branding key contract** (`domain/gcc/admin/branding.ts`):
- `branding` → JSON `{ accent?: AccentKey; logo?: { dataUrl: string; name: string }; displayName?: string; at; byId }` in the tenant's `done`. Reset clears it.
- The logo is read in the browser as a data URL, PNG, JPG or SVG, at most 200 KB (refuse larger with the reason), and shown at most 32 px tall.
- `displayName` is the prospect's company name, shown in place of the tenant name in `TenantSwitch` (:39) only. **Don't edit `Header.tsx`**, because plan 014 edits it. The persona names and all data stay as they are.

**Out of scope** (stop and ask):
- saving fit model changes;
- editing targets, SLAs, committee seats or gate owners;
- inviting users or changing roles (the Invite button shows "Demo: invitations are sent from the product" as a disabled reason);
- source connection flows or credentials;
- the role-name alternative ("Tendering Director": role labels are read in many places; note it in Follow-ups if you find one label function);
- `tokens.css`; the Company page (plan 010); the audit log page; the Platform Console; new libraries.

## Steps

### Phase 1 — Landing and Users and roles
- [x] 1.1 `/admin` landing: seven cards (Users and roles · Committees and gates · Sources · Fit model · Targets and SLAs · Branding · Audit log), each with a status line derived from its section, and the rights line "Only the Head of Tendering changes these settings".
- [x] 1.2 `/admin/users`:
  - every person in the tenant, grouped as in the persona switcher (`PERSON_GROUPS`);
  - columns: name, role, scope ("all tenders", "assigned tenders", "invited only"), seat (for committee members), and what they can do in one plain line from `access.ts`;
  - GOV-5 seats in use as a strip;
  - **View as** on each row calls `startViewAs` (hidden for the viewer's own row);
  - Invite is disabled with its reason.

### Phase 2 — Committees and gates, and Sources
- [x] 2.1 `/admin/committees`:
  - the three gates, each with who decides (dashboards.md §9: DG1 the assigned Bid Manager, the Head of Tendering as delegate; DG2 committee positions then the Head of Tendering's approval; DG3 the Head of Tendering, pack issued by Compliance), the SLA (`GATE_SLA_HOURS`) and its owner in this tenant;
  - DG2's five seats with their members, quorum 3 of 5, and the referral threshold (`fit.dg2Referral`, through `Money`);
  - a strip "Gates without owners: 0", derived: a gate whose deciding role has nobody in the tenant counts. The rule reads "A gate without an owner blocks every tender that reaches it".
- [x] 2.2 `/admin/sources`: the seed's sources with kind, mode, state (`StatusPill`: healthy, degraded, credentials expiring, down), last poll (`When`), and a strip INT-4 (healthy of total). A source whose credentials expire says so in words; no connect flow.
- [x] 2.3 Settings' GCC branch uses the seed's sources and links here (Scope).

### Phase 3 — Fit model (what-if) and Targets
- [x] 3.1 `/admin/fit`:
  - the tenant's weights (per criterion, as % summing to 100), `pursueAt`, `conditionsFrom`, the value band, single-project limit, DG2 referral, safe delivery %;
  - a **What-if** switch reveals sliders for the weights and the two thresholds, and a "Weights must add up to 100%" check;
  - the live impact list: every live Stage 1 tender with its score and verdict now → with the what-if, changed rows first ("T-2026-118: 82 → 79, Pursue → Pursue with conditions");
  - a "Reset the what-if" button;
  - the label "A what-if: nothing is saved, and every screen keeps the current model."
- [x] 3.2 `fitWhatIf` reuses `fitScoresFor` for the scores (eligibility re-checked, as the screening screen does) and `weightedOf`'s arithmetic with the what-if weights. (acceptance: with the what-if equal to the current model, every row's score equals `fitFor(...).weighted`.)
- [x] 3.3 `/admin/targets`: one table of every target and SLA from the files in Context: name in words, value with unit ("24 h", "15 min", "3 of 5"), what uses it (the tile or rule, e.g. "DG1 on time · DEC-1"), and the source file. Grouped: Gates · Stage 1 · Stage 2 · Stage 3 · Portfolio. The values are imported, never retyped.

### Phase 4 — Branding
- [x] 4.1 `/admin/branding`:
  - the accent colour as swatches from the token palettes (with a live preview card);
  - the logo upload (Scope limits) with a preview;
  - the display name;
  - Save and Restore defaults.

  Each writes through `mark()` with an audit entry ("Branding changed: accent teal, logo acme.svg").
- [x] 4.2 The shell applies it at once, across every GCC page:
  - the accent from `AppShell`;
  - the logo in `TenantSwitch`;
  - the display name in `TenantSwitch`.

  Light and dark both read well, because the palettes have both. The vendor's "Catalyst" mark stays.
- [x] 4.3 Reset demo (this company) restores the tenant's own brand. Switching tenants shows each tenant's own branding.

### Phase 5 — Dev check and polish
- [x] 5.1 `67-admin.tsx`, about 10 rows:
  - every `/admin*` screen is built and guarded by its cap;
  - every person appears once in Users;
  - gates without owners is 0 in every tenant;
  - `fitWhatIf` with the current model changes nothing and matches `fitFor` in all five tenants;
  - raising one weight changes at least one Najd verdict (choose a case from the seed, and name it in the row);
  - the targets list has no duplicate and every value matches its import;
  - `brandingOf` round-trips;
  - a logo over 200 KB is refused.
- [x] 5.2 1440 and 1280, light and dark, no console errors; the keyboard reaches every control; the what-if sliders work with the arrow keys.

## Data and derivation
- No new facts. Derived: `domain/gcc/admin/*`.
- One new done key: `branding` (tenant `done`), cleared by **Reset demo**.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [x] As Faisal (Najd Head of Tendering):
  - Administration → Users → View as the Procurement Lead (the margin is masked) → exit;
  - Fit model what-if moves the hero's verdict, and nothing else changes after leaving the page;
  - Branding with an accent and a logo recolours the shell and shows the logo on every page and after a reload;
  - Reset restores Najd's own brand.
- [x] As the CEO (no `admin.view`, but `audit.view`): only Audit log shows under Administration, and a direct link to `/admin/fit` shows the guard.
- [x] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor, 2026-09-27.)

- **Changed files:**
  - New, `src/domain/gcc/admin/`: `users.ts`, `gates.ts`, `sources.ts`, `fitWhatIf.ts`, `targets.ts`, `branding.ts`, `tiles.ts` (the strips' tiles: INT-4 from the registry, derived tiles for GOV-5 and gates without owners), `useBranding.ts` (the shell's hook; imports `branding.ts` alone so the Indian preview's bundle doesn't grow), `index.ts`.
  - New, `src/pages/gcc/admin/`: `Admin.tsx`, `Users.tsx`, `Committees.tsx`, `Sources.tsx`, `FitModel.tsx`, `Targets.tsx`, `Branding.tsx`, `AdminKit.tsx` (`useAdmin`, `AdminStrip`, `AdminGrid` (the AG Grid wrapper, like `S1Grid`), `Cell2`, `Rule`, `DisabledAction`), `admin.css`. `AuditLog.tsx` untouched.
  - New: `src/pages/gcc/dev-checks/67-admin.tsx` (11 rows).
  - Changed: `src/pages/gcc/screens.ts` (the seven `/admin*` entries only: `plan: '024'`, `built: true`, `page`); `src/components/layout/AppShell.tsx` (the accent, one effect); `src/components/layout/TenantSwitch.tsx` (logo in place of the mark, the display name, an optional `accent` prop on `TenantMark`); `src/pages/Settings.tsx` (GCC branch: seed sources with their health and "Open Sources & integrations"; "Open Users & roles", and person buttons go to `/admin/users` instead of toasting; the legacy branch is unchanged); `src/data/access.ts` (one line in `navFor`, its comments and the CEO's row of the self-check table: Deviation 10, approved by the user).
- **Verification** (own dev server on 5185, headless Chromium from a scratch script, its own browser profile; never 5173):
  - `npm run typecheck` and `npm run build` pass (the large-chunk warning predates this plan).
  - `/dev/checks` passes in all five tenants: 67-admin 11 of 11, and every other panel passes; no console errors.
  - As Faisal (Najd), 1440 light and 1280 dark, 0 console errors:
    - Users → View as Joseph Mathew (Procurement Lead) lands on his dashboard with the banner; on T-2026-097 he sees 12 masked marks where Faisal sees none; Exit view clears it. Enter on a focused Users row does the same (keyboard).
    - Fit model: What-if on, the "Pursue at" slider moved to 83 with the arrow keys → "3 live tenders move: 3 from Pursue to Pursue with conditions", the hero first; Strategic priority to 25% shows "Weights add up to 120%", "Keep strategic priority at 25% and balance the others" → 100% and only T-2026-117 moves (74.3 → 69.3). Leaving the page and coming back: the switch is off and the current model shows.
    - Branding: a 250 KB PNG is refused ("huge.png is 250 KB. The logo must be 200 KB or smaller."); Violet + acme.svg + "Acme Contracting" → saved; `--brand` is `var(--acc-corniche)` on the root, and the switcher shows the logo and "Acme Contracting" on the admin pages, /radar and /, and after a reload. The audit log shows "Branding changed". Switching to Corniche shows Corniche's own brand; back to Najd keeps Acme. Settings → Reset → "Reset this company" restores Najd's own brand.
    - Settings (GCC): the seed's 9 sources with their state pills, and both links.
    - Keyboard: Tab reaches all seven landing cards and Enter opens them; arrow keys move the accent swatches (a radio group with roving focus); Tab reaches Upload logo, the name and Save.
  - As the CEO: `/admin/fit` shows the guard ("Changing the fit model is for the Head of Tendering"); the rail shows Administration as a plain label (a `<span>`: clicking it stays on the page) with only Audit log under it, which opens `/admin/audit` and is marked active.
  - Rails after the `navFor` change (Deviation 10): comparing `navFor` before and after for all 87 GCC people and the operator, only the five CEOs change (they gain Administration as a label over Audit log; nothing is removed). In the browser, the Head of Tendering keeps the linked Administration header with all seven pages; the Bid Manager and the Commercial Manager have no Administration, and the Commercial Manager keeps his Stage 2 label over Quote levelling. `/dev/checks` still passes in all five tenants; typecheck and build pass.
  - Batinah (OMR, three live Stage 1 tenders) and the Indian preview's Settings (no admin links, no inline brand, no errors) checked; `/admin/fit` in the Indian preview is Not found, as for every GCC screen.
- **Deviations from plan:**
  1. The accent is set on the document root (`<html>`) from `AppShell`, not on the `.app` div, so portalled sheets, modals and tips and the focus ring (`--focus-ring: var(--brand)` resolves on the root) follow it too. It is set before paint (no flash), and removed when the shell unmounts (the Platform Console) or the branding goes. `tokens.css` is untouched.
  2. The accent choices are the five palettes `tokens.css` already has (teal, violet, amber, slate blue, crimson), the company's own marked "Company default". An accent equal to the company's own isn't stored.
  3. "Restore defaults" writes `branding` with no fields (`mark()` can't delete a key); `brandingOf` reads that as no branding. Reset demo removes the key.
  4. Targets has a sixth group, **Stages 4–9**, for the Stage 4–9 dashboards' bands (PLN, PRC, PRP, CMP, SUB, RES). Only constants a screen reads are listed (45 at Najd); `BOND_VALIDITY_DAYS_KSA`, `CLARIFICATION_SLA_WORKING_DAYS` and `AHEAD_DAYS.teamLoad` are read by nothing, so they are left out. Two targets live in two files (`DG1_SLA_HOURS` with `GATE_SLA_HOURS.DG1`; `RFQ_CLOCK_HOURS` with `TURNAROUND_HOURS.rfqsAfterDg1`): one row each, and the dev check asserts the two agree.
  5. The what-if holds the impact list while the weights don't add up to 100% (or "Pursue with conditions" isn't below "Pursue"), and offers "Keep {criterion} at n% and balance the others" (`balanceWeights`, largest remainder). The dev check's named case uses it: Najd, Strategic priority to 25% moves T-2026-117 from Pursue to Pursue with conditions, and nothing else.
  6. The fit page has its own two-column grid down to 1101 px (the shared `.split` stacks at 1280), so a slider and its impact stay side by side at 1280.
  7. View as is hidden on the presenter's own row ("You") and on the external supplier ("External": the supplier lands in the Supplier Portal's own shell, where the View as banner doesn't show). HR, who isn't a demo persona, can be viewed.
  8. GOV-5 "Seats in use" counts tenant users (16 at Najd, of the tenant's 20 licensed seats); the supplier holds no seat.
  9. AG Grid's `autoHeight` rows need `RowAutoHeightModule`, which `agGrid.ts` doesn't register, so the admin grids use fixed row heights with two-line clamping and the full text in `title`. `admin.css` also removes AG Grid's 150 px auto-height minimum, so a one-row grid is as tall as its row.
  10. **`data/access.ts` (outside this plan's files, approved by the user on 2026-09-27).** `navFor` kept the company-wide screens of an entry outside the role only under a *stage* header, so the CEO (`audit.view`, no `admin.view`) had no Administration entry and the acceptance check "only Audit log shows under Administration" failed. `keep()` now keeps them under any entry (`const children = it.children?.filter(companyWide);`, the `it.stage !== undefined` condition dropped). The comments say "An entry outside the role" (on `labelOnly` and above `navFor`), and the CEO's row of the self-check table reads "Audit log, under a header that isn't a link". The Sidebar already renders `labelOnly` as a plain label for any entry, so no Sidebar change was needed. Only the CEO's rail changes.
- **Blockers / questions:** none. The one question (the CEO's rail) was answered by the user and is Deviation 10.
- **Follow-ups noticed (not done):**
  - GOV-5 and "gates without owners" are tiles built in `domain/gcc/admin/tiles.ts`; they could become registry KPIs (an `admin.kpi.ts`) if a dashboard needs them.
  - `STAGE_BANDS` (`kpi/stages.ts`) and `INTAKE_TARGET_MIN` (`s1/intake.ts`) still live outside `data/gcc/targets.ts`, and two targets are defined twice (above); moving them into `targets.ts` would leave one home per target.
  - The top bar wraps "Sources & integrations" onto two lines at 1440 beside the long company name; at 1280 the company switcher shows only the mark (`hide-md`), so the prospect's name shows at 1440 but not at 1280 (the logo shows at both).
  - The role-name alternative ("Tendering Director"): `TenantProfile.headTitle` already exists and `people.ts` and Settings read it, but "the Head of Tendering" is also typed in `HOLDER` and the reason sentences in `access.ts`, and in many copy strings. There is no single label function to switch.
  - More accent palettes (a prospect's colour rarely matches one of five) would need new `--acc-*` tokens in `tokens.css`.
