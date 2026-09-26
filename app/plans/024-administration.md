# 024 — Administration: users and roles, gates, sources, fit model, targets, branding

Status: READY · Depends on: 003, 006, 011, 013, 015 (all in `gcc-demo`) · Can run in parallel with: 010, 012, 014, 018

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
- [ ] 1.1 `/admin` landing: seven cards (Users and roles · Committees and gates · Sources · Fit model · Targets and SLAs · Branding · Audit log), each with a status line derived from its section, and the rights line "Only the Head of Tendering changes these settings".
- [ ] 1.2 `/admin/users`:
  - every person in the tenant, grouped as in the persona switcher (`PERSON_GROUPS`);
  - columns: name, role, scope ("all tenders", "assigned tenders", "invited only"), seat (for committee members), and what they can do in one plain line from `access.ts`;
  - GOV-5 seats in use as a strip;
  - **View as** on each row calls `startViewAs` (hidden for the viewer's own row);
  - Invite is disabled with its reason.

### Phase 2 — Committees and gates, and Sources
- [ ] 2.1 `/admin/committees`:
  - the three gates, each with who decides (dashboards.md §9: DG1 the assigned Bid Manager, the Head of Tendering as delegate; DG2 committee positions then the Head of Tendering's approval; DG3 the Head of Tendering, pack issued by Compliance), the SLA (`GATE_SLA_HOURS`) and its owner in this tenant;
  - DG2's five seats with their members, quorum 3 of 5, and the referral threshold (`fit.dg2Referral`, through `Money`);
  - a strip "Gates without owners: 0", derived: a gate whose deciding role has nobody in the tenant counts. The rule reads "A gate without an owner blocks every tender that reaches it".
- [ ] 2.2 `/admin/sources`: the seed's sources with kind, mode, state (`StatusPill`: healthy, degraded, credentials expiring, down), last poll (`When`), and a strip INT-4 (healthy of total). A source whose credentials expire says so in words; no connect flow.
- [ ] 2.3 Settings' GCC branch uses the seed's sources and links here (Scope).

### Phase 3 — Fit model (what-if) and Targets
- [ ] 3.1 `/admin/fit`:
  - the tenant's weights (per criterion, as % summing to 100), `pursueAt`, `conditionsFrom`, the value band, single-project limit, DG2 referral, safe delivery %;
  - a **What-if** switch reveals sliders for the weights and the two thresholds, and a "Weights must add up to 100%" check;
  - the live impact list: every live Stage 1 tender with its score and verdict now → with the what-if, changed rows first ("T-2026-118: 82 → 79, Pursue → Pursue with conditions");
  - a "Reset the what-if" button;
  - the label "A what-if: nothing is saved, and every screen keeps the current model."
- [ ] 3.2 `fitWhatIf` reuses `fitScoresFor` for the scores (eligibility re-checked, as the screening screen does) and `weightedOf`'s arithmetic with the what-if weights. (acceptance: with the what-if equal to the current model, every row's score equals `fitFor(...).weighted`.)
- [ ] 3.3 `/admin/targets`: one table of every target and SLA from the files in Context: name in words, value with unit ("24 h", "15 min", "3 of 5"), what uses it (the tile or rule, e.g. "DG1 on time · DEC-1"), and the source file. Grouped: Gates · Stage 1 · Stage 2 · Stage 3 · Portfolio. The values are imported, never retyped.

### Phase 4 — Branding
- [ ] 4.1 `/admin/branding`:
  - the accent colour as swatches from the token palettes (with a live preview card);
  - the logo upload (Scope limits) with a preview;
  - the display name;
  - Save and Restore defaults.

  Each writes through `mark()` with an audit entry ("Branding changed: accent teal, logo acme.svg").
- [ ] 4.2 The shell applies it at once, across every GCC page:
  - the accent from `AppShell`;
  - the logo in `TenantSwitch`;
  - the display name in `TenantSwitch`.

  Light and dark both read well, because the palettes have both. The vendor's "Catalyst" mark stays.
- [ ] 4.3 Reset demo (this company) restores the tenant's own brand. Switching tenants shows each tenant's own branding.

### Phase 5 — Dev check and polish
- [ ] 5.1 `67-admin.tsx`, about 10 rows:
  - every `/admin*` screen is built and guarded by its cap;
  - every person appears once in Users;
  - gates without owners is 0 in every tenant;
  - `fitWhatIf` with the current model changes nothing and matches `fitFor` in all five tenants;
  - raising one weight changes at least one Najd verdict (choose a case from the seed, and name it in the row);
  - the targets list has no duplicate and every value matches its import;
  - `brandingOf` round-trips;
  - a logo over 200 KB is refused.
- [ ] 5.2 1440 and 1280, light and dark, no console errors; the keyboard reaches every control; the what-if sliders work with the arrow keys.

## Data and derivation
- No new facts. Derived: `domain/gcc/admin/*`.
- One new done key: `branding` (tenant `done`), cleared by **Reset demo**.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] As Faisal (Najd Head of Tendering):
  - Administration → Users → View as the Procurement Lead (the margin is masked) → exit;
  - Fit model what-if moves the hero's verdict, and nothing else changes after leaving the page;
  - Branding with an accent and a logo recolours the shell and shows the logo on every page and after a reload;
  - Reset restores Najd's own brand.
- [ ] As the CEO (no `admin.view`, but `audit.view`): only Audit log shows under Administration, and a direct link to `/admin/fit` shows the guard.
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
