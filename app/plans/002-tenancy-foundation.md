# 002 — Tenancy foundation and GCC formats

Status: DONE — awaiting review (2026-09-25) · Depends on: none · Can run in parallel with: 005. Plans 003 and 004 start after this one is DONE.

## Goal
A presenter can switch between five GCC contractors and the Indian tenant from the top bar. The brand, currency, time zone, calendar and demo state then change with the tenant, and nothing from one tenant shows in another.

This plan lays the foundation every Stage 1–3 plan builds on:
- tenant-scoped state;
- tenant profiles;
- money, FX and GCC calendar helpers.

## Context
- **Why:**
  - s1-s3-demo-spec §11 (five tenants, one tender, five answers, M-7);
  - acceptance in spec §19 ("Tenant switch changes the data … Nothing leaks between tenants");
  - gcc-demo-data §1–§3;
  - app/plans/README "Architecture decisions" 1, 3, 6, 7.
- **Current behaviour:**
  - `src/data/tenants.ts:47-72`: two tenants (`gen-in` live, `gen-gulf` onboarding). `HOME_TENANT` is fixed to `gen-in`.
  - `src/components/layout/TenantSwitch.tsx:35`: choosing another tenant only opens its drawer; it never switches.
  - `src/state/store.tsx:45-53,80-81`: one global `done` map and one uploads list, persisted under `ctai.demo.v1`. `reset` clears everything.
  - `src/domain/format.ts:10-19`: money is INR-only (`cr()` → "₹ 486 Cr"). Dates are plain ISO with no time zone or working days.
  - `src/pages/Settings.tsx:32`: counts `state.done` for the Reset button.

## Scope
**Files to create:**
- `src/data/gcc/calendar.ts`: per-country weekend, closures, Ramadan window (gcc-demo-data §1).
- `src/data/gcc/fx.ts`: demo bid rates per USD with an as-of date.
- `src/domain/money.ts`: money formatting and conversion.
- `src/domain/calendar.ts`: working days, flags, local date-time formatting.
- `src/domain/tenancy.ts`: `useTenant()`, `useTenantKey()`, the current tenant's profile and world.
- `src/pages/gcc/GccPending.tsx` and `src/pages/gcc/dev-checks/10-formats.tsx`: the interim home for GCC tenants (replaced by plan 006). It is a smoke-test page, not demo content.

**Files to change:**
- `src/data/tenants.ts`
- `src/domain/tenants.ts`
- `src/state/store.tsx`
- `src/components/layout/TenantSwitch.tsx`
- `src/components/overlays/Drawers.tsx` (tenant drawer only, lines ~390–430)
- `src/components/overlays/Modals.tsx` (ResetModal only, ~line 227)
- `src/pages/Settings.tsx` (Reset card and tenants card only)
- `src/App.tsx` (world-aware home route and GCC route guard)
- `src/components/layout/Sidebar.tsx` (world gating only: a GCC tenant sees Home and Settings)
- `src/styles/tokens.css` (brand tokens)

**Out of scope** (stop and ask before touching):
- Roles, persona switcher or access rules (plan 003).
- Any GCC tender, credential or register data (plan 004).
- Any new Stage 1–3 page beyond `GccPending`.
- Refactoring legacy Indian screens to use `money()` (not needed: they only render for `gen-in`).
- New npm dependencies.

## Steps

### Phase 1 — Tenant profiles
- [x] 1.1 Extend `Tenant` in `src/data/tenants.ts` with:
  - `world: 'legacy-in' | 'gcc'`
  - `switchable: boolean`
  - `countryCode: 'SA' | 'AE' | 'QA' | 'OM' | 'KW' | 'IN'`
  - `hqCity: string`
  - `timeZone: string` (IANA, e.g. `Asia/Riyadh`) and `tzLabel: string` (`AST`, `GST`, `IST`)
  - `locale: string` (`en-GB` for GCC, `en-IN` for India)
  - `monogram: string` (2 letters)
  - `accent: string` (the token suffix used by `data-tenant` CSS, e.g. `najd`)
  - `headTitle: 'Head of Tendering' | 'Tendering Director'`
  - `sectors: string[]`
  - [x] 1.1.1 Keep every existing field. Fill the new ones for `gen-in` (`world: 'legacy-in'`, `switchable: true`, `Asia/Kolkata`, `IST`, `en-IN`) and `gen-gulf` (`world: 'gcc'`, **`switchable: false`**: it stays an onboarding tenant, shown only in lists and the Platform Console later).
- [x] 1.2 Add the five GCC tenants from gcc-demo-data §2: keys `najd`, `corniche`, `dafna`, `batinah`, `qurain`.
  - Fields: name, legal (fictional), country, currency (SAR/AED/QAR/OMR/KWD), residency, SSO (any plausible IdP), admin = the tenant's Head of Tendering from gcc-demo-data §2.7, adminEmail `@<key>.example`, created (2025 dates), `live: true`, goLive, seats (12–20), sources (from §2.2 for Najd; 3–5 plausible ones for the others), `doneSteps` all.
  - Mark the Najd Etimad source state as "credentials expiring Fri 13 Mar" in `mode` text.
- [x] 1.3 Replace `HOME_TENANT` with `DEFAULT_TENANT = 'najd'`. Keep `HOME_TENANT` exported as a deprecated alias of `DEFAULT_TENANT`, so untouched legacy imports still compile. Update `CURRENCY_OPTIONS` to include QAR, OMR, KWD.
- [x] 1.4 In `src/domain/tenants.ts`, `home` means "the active tenant" (from the store, Phase 3), not a constant. `useTenants()` returns every tenant; add `useSwitchableTenants()`.

### Phase 2 — Money, FX and calendar
- [x] 2.1 `src/data/gcc/fx.ts`: `FX_PER_USD: Record<Ccy, number>`:
  - SAR 3.75, AED 3.6725, QAR 3.64, OMR 0.3845, KWD 0.3070, BHD 0.376, USD 1, EUR 0.92, INR 83.0;
  - `FX_AS_OF = '2026-03-01'` and `FX_LABEL = 'Demo bid rate, 1 Mar 2026'`.
  - Note in a comment that KWD and EUR are demo assumptions.
- [x] 2.2 `src/domain/money.ts`:
  - [x] 2.2.1 `money(amount: number, ccy: Ccy, opts?: { compact?: boolean; dp?: number; full?: boolean })`. `amount` is in **major units** (SAR, not millions).
    - Compact default: `SAR 482.6 M`, `AED 1.24 bn`. ~~OMR and KWD use 2 dp for millions~~ **Changed at review: one decimal for millions in every currency (`KWD 39.3 M`, `OMR 49.2 M`); `dp` overrides.** Full: `SAR 12,064,000`.
    - INR keeps the legacy look: `₹ 486 Cr` (1 Cr = 1e7), so a future migration is drop-in.
    - Negative values use the typographic minus.
  - [x] 2.2.2 `convert(amount, from, to)` via USD.
  - [x] 2.2.3 `moneyPair(amount, from, to)` returns `{ text, original?: string, rate: number, asOf: string }`. `original` is present only when `from !== to` (used for "AED 470.1 M · SAR 480 M").
  - (acceptance: a scratch check in `GccPending` shows `money(480e6,'SAR')` → `SAR 480.0 M`, and `moneyPair(480e6,'SAR','KWD').text` → `KWD 39.3 M`.)
- [x] 2.3 `src/data/gcc/calendar.ts` per country (SA, AE, QA, OM, KW; IN minimal):
  - `weekend: number[]` (0 = Sunday … 6 = Saturday): SA/QA/OM/KW `[5,6]`, AE `[6,0]`, IN `[0]`.
  - `closures: { from: string; to: string; name: string; expected: boolean }[]`: the Eid al-Fitr and Eid al-Adha rows from gcc-demo-data §1, `expected: true`.
  - `ramadan: { from: '2026-02-18', to: '2026-03-19', hours: string, expected: true }`: KSA hours `10:00–15:00`; others `09:00–14:00` [A].
- [x] 2.4 `src/domain/calendar.ts`:
  - [x] 2.4.1 `isWorkingDay(iso, cc)`, and `workingDaysBetween(fromIso, toIso, cc)` (exclusive of `from`, inclusive of `to`; excludes weekends and closures).
  - [x] 2.4.2 `dayFlags(iso, cc)` returns the set of `'weekend' | 'ramadan-hours' | 'closure-expected'`, with labels ("Ramadan hours", "Eid holiday expected").
  - [x] 2.4.3 `whenText(iso: string, time?: string, tzLabel?: string)` → `Sun 10 May 2026, 10:00 AST`; `countdownText(fromIso, toIso, cc)` → `63 days · 42 working days`.
  - (acceptance: a unit-style check rendered in `GccPending` for SA: from 2026-03-08 to 2026-05-10 gives 63 calendar days. Record the working-day count it produces in the Execution report; plan 004 uses the function, never a typed number.)
- [x] 2.5 Demo clock: `DEMO_TODAY = '2026-03-08'` and `DEMO_TIME = '10:00'` exported from `src/domain/calendar.ts`, re-exporting `TODAY_ISO` from `data/tenders.ts` so there is one source.

### Phase 3 — Tenant-scoped demo state
- [x] 3.1 In `src/state/store.tsx`, change `Persisted` to:
  - `tenant: string` (active tenant key, default `DEFAULT_TENANT`)
  - `doneBy: Record<string, Record<string, string>>` (per tenant), plus the platform bucket `doneBy.__platform`
  - `uploads: Upload[]`, where `Upload` gains `tenant: string`
  - `tenants`, `scenario`, `role`, `showBanner` unchanged
- [x] 3.2 Derived state (not persisted): `state.done = doneBy[tenant] ?? {}` and `state.uploads = uploads.filter(u => u.tenant === tenant)`. `state.uploadsAll` holds every tenant's. Every existing reader of `state.done` and `state.uploads` keeps working unchanged.
- [x] 3.3 `mark(key, …)` writes to the active tenant's bucket. **Exception:** keys starting with `tn-` (tenant onboarding, `domain/tenants.ts:13-14`) write to `doneBy.__platform`. `liveTenants()` reads `__platform` for those.
- [x] 3.4 New actions:
  - `setTenant(key)`, which closes any drawer or modal and toasts "Now working in {tenant}. Demo control";
  - `reset(scope: 'tenant' | 'all')`.

  Existing `reset()` callers default to `'tenant'`.
- [x] 3.5 Storage: bump to `STORAGE_KEY = 'ctai.demo.v2'`. On load, if v2 is absent and v1 exists, migrate:
  - v1 `done` → `doneBy['gen-in']`, except `tn-*` keys → `__platform`;
  - v1 uploads get `tenant: 'gen-in'`.

  Then remove v1. (acceptance: an existing browser with v1 state opens with its Indian demo progress intact.)
- [x] 3.6 Upload creation (`addUpload` callers in `components/intake/*`) stamps `tenant: state.tenant`. Do this inside the store's `addUpload` so the intake components are not edited.

### Phase 4 — Switching, brand, and world gating
- [x] 4.1 `TenantSwitch.tsx`:
  - lists switchable tenants with monogram (accent-coloured), name, country and currency;
  - choosing one calls `setTenant`;
  - non-switchable tenants appear under a small "Onboarding" subhead and keep opening their drawer, as today;
  - add the `Demo` chip (reuse `.demo-chip` from Header) to the popover head: "Switch company · Demo".
- [x] 4.2 Brand tokens in `tokens.css`: `--brand`, `--brand-soft`, `--brand-ink` for each GCC tenant, under `:root[data-tenant='najd']` etc. Define light **and** dark values (dark variants lighter, as the existing status colours do). Accents are per gcc-demo-data §2: teal, violet, amber, slate blue, crimson. `gen-in` uses the current ink.
  - [x] 4.2.1 `document.documentElement.dataset.tenant` is set from the store (effect in `DemoProvider`).
  - [x] 4.2.2 Brand is used only for the tenant monogram, the active nav indicator and the primary focus ring accent. **Status colours never change with the tenant.**
- [x] 4.3 World gating:
  - [x] 4.3.1 `App.tsx`: when the active tenant's `world === 'gcc'`, `/` and `/dashboard/*` render `GccPending`. Every legacy route (`/pipeline`, `/workflow`, `/agents`, `/submission`, `/suppliers`, `/library`, `/intake*`, `/boq`) redirects to `/` with a toast: "That screen belongs to the full-lifecycle preview (Genesis EPC India)". `/settings` stays.
  - [x] 4.3.2 `Sidebar.tsx`: for GCC tenants render only "Home" (→ `/`) and "Settings". Legacy nav is untouched for `gen-in`.
  - [x] 4.3.3 Header search and alerts: for GCC tenants hide the legacy alert list (it reads Indian data), and show an empty state "No alerts yet". Do this with a world check inside Header's existing alert block only.
- [x] 4.4 `GccPending.tsx`, the interim smoke-test page (plain, using existing `Card`/`KV`). It shows:
  - the tenant profile;
  - demo today in the tenant's time zone (`whenText`);
  - `countdownText('2026-03-08','2026-05-10', cc)`;
  - `dayFlags` for 2026-03-17 and 2026-03-25;
  - `money` and `moneyPair` examples for the hero estimate SAR 480 M in the tenant's currency.

  A one-line note says "Stage 1–3 workspace arrives with plan 006".
  - [x] 4.4.1 **Dev-check slots**, so later plans never edit this file:
    - `GccPending` renders every default export found by `import.meta.glob('./dev-checks/*.tsx', { eager: true })`, in file-name order, each in its own `Card`;
    - create `src/pages/gcc/dev-checks/` with one panel, `10-formats.tsx`, holding the money, calendar and countdown checks above.
    - Plans 003 and 004 add their own panels as new files (`20-people.tsx`, `30-seed.tsx`). Plan 006 deletes the folder together with `GccPending`.

### Phase 5 — Settings and Reset
- [x] 5.1 The Reset modal offers two choices: **Reset this company** (default) and **Reset all companies**. Copy: "Re-opens every gate, validation and decision for {tenant}. Theme and current view are kept."
- [x] 5.2 The Settings Reset button is enabled when the active tenant's bucket has actions (or any bucket, for "all").
- [x] 5.3 The Settings tenants table marks the active tenant as "current" (reads the store, not `HOME_TENANT`).
- [x] 5.4 The tenant drawer (`Drawers.tsx` ~390–430): for a switchable, non-active tenant, the primary action is "Switch to this company · Demo". For the active one, keep "Open settings". The "Tenders" count shows `live.active.length` only for `gen-in`. For GCC tenants show "—" until plan 004 provides registers (plan 004 may wire the count).

## Data and derivation
- **New facts:** `data/tenants.ts` (5 GCC tenants and the new fields), `data/gcc/calendar.ts`, `data/gcc/fx.ts`.
- **New derivations:** `domain/money.ts`, `domain/calendar.ts`, `domain/tenancy.ts`.
- **State:** `doneBy` per tenant plus `__platform`; uploads carry `tenant`; storage `ctai.demo.v2` with migration from v1. Reset clears the active tenant's bucket (or all buckets and all uploads).
- No new `done` keys.

## Acceptance checks
- [x] `npm --prefix app run typecheck` and `npm --prefix app run build` pass.
- [x] As any persona on `gen-in`, the whole legacy demo behaves exactly as before: click through the sidebar, open a DG1 modal, record it, reload. The decision persists.
- [x] Switch to Najd: brand monogram teal; `GccPending` shows SAR formatting, "Sun 8 Mar 2026, 10:00 AST", the 63-day countdown with working days, "Ramadan hours" on 17 Mar and "Eid holiday expected" on 25 Mar. Legacy routes typed into the URL redirect with the toast.
- [x] Switch to Corniche: weekend Sat–Sun reflected in the working-day count, AED amounts, GST. Qurain: KWD with 2-dp rule.
- [x] Record a DG1 on `gen-in`, switch to Najd, then back: the DG1 is still recorded on `gen-in`. Reset this company on Najd does not clear it; Reset all companies does.
- [x] Onboarding steps ticked in the `gen-gulf` drawer survive a tenant switch (platform bucket).
- [x] Both themes: the brand accent is legible in dark mode; status colours unchanged.
- [x] No `₹` literal or `cr(` call in any new file.

## Execution report
Executor, 2026-09-25.

- **Changed files:**
  - New: `src/data/gcc/fx.ts`, `src/data/gcc/calendar.ts`, `src/domain/money.ts`, `src/domain/calendar.ts`, `src/domain/tenancy.ts`, `src/pages/gcc/GccPending.tsx`, `src/pages/gcc/dev-checks/10-formats.tsx`.
  - Changed (in the plan's list): `src/data/tenants.ts`, `src/domain/tenants.ts`, `src/state/store.tsx`, `src/components/layout/TenantSwitch.tsx`, `src/components/overlays/Drawers.tsx` (tenant drawer and its `KVRow` only), `src/components/overlays/Modals.tsx` (ResetModal only), `src/pages/Settings.tsx` (tenants card and Demo session card only), `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/styles/tokens.css`.
  - Changed (not in the list; see Deviations 3): `src/components/layout/Header.tsx`, `src/components/layout/AppShell.tsx`, `src/styles/base.css`, `src/styles/components.css`, `src/styles/layout.css`.
- **Verification:**
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass. The build's "chunk larger than 500 kB" warning was already there at `6941c62` (500.3 kB then, 519 kB now).
  - A Playwright click-through against the dev server ran 57 checks, all passing, with **no console errors**: at 1440 in light and dark, and 1280 in dark with no horizontal overflow. It covered:
    - a fresh browser opens in Najd with the teal monogram, the teal active-nav rule and `data-tenant="najd"`;
    - `GccPending` shows `Sun 8 Mar 2026, 10:00 AST`, `63 days · 39 working days`, "Ramadan hours" on 17 Mar, "Eid holiday expected" on 25 Mar and `SAR 480.0 M`, and all 16 dev checks pass;
    - `/pipeline`, `/workflow`, `/boq` and `/intake` redirect to `/` with the toast; `/dashboard/bid` renders `GccPending`; `/settings` stays;
    - Corniche shows GST, `Sat–Sun`, `63 days · 43 working days` and `AED 470.1 M · SAR 480.0 M`, with no Eid flag on 25 Mar. Qurain shows `KWD 39.30 M`, Batinah `OMR 49.22 M` and Dafna `QAR 465.9 M`;
    - status colour tokens are identical across tenants; the dark Najd monogram uses the light teal;
    - `gen-in` lands on the legacy Bid Cockpit with the legacy sidebar, search and upload. Every top-level sidebar item was clicked. DG1 "Pursue" on T-2026-053 is recorded in the `gen-in` bucket and survives a reload and a Najd round trip;
    - the Gulf JV "Mark done" tick is stored in `__platform` and still shows `4 / 7` after switches;
    - "Reset this company" on Najd keeps the `gen-in` DG1 and the onboarding tick. "Reset all companies" clears every bucket and keeps the current tenant, and the Settings Reset button is then disabled;
    - the Corniche drawer offers "Switch to this company · Demo", which switches and stays on Settings;
    - a v1 browser (`done` with `dg1-041` and `tn-gen-gulf-users`, one upload, scenario `stretch`, role `exec`) opens in `gen-in` on `/dashboard/exec`. `dg1-041` moves to `gen-in`, the `tn-*` key goes to `__platform`, the upload is stamped `gen-in` and v1 is removed.
  - **Working days recorded (step 2.4 acceptance), 8 Mar → 10 May 2026, as computed by `workingDaysBetween`:** SA **39**, AE/QA/OM/KW 43, IN 54. Checked by hand for SA: 63 days are 9 weeks, so 45 weekdays, minus 6 weekday days of the expected 19–28 Mar Eid closure.
- **Deviations from plan:**
  1. **Tenant type.** The profile fields are optional on `Tenant` and required on `ProfiledTenant` (seeded tenants) and on `LiveTenant`. `completeTenant()` fills the profile of a tenant added in the demo from its country; such a tenant is never switchable. This keeps `TenantAddModal` (`FlowModals.tsx`, not in scope) and any added tenants saved in v1 working unchanged.
  2. **Accent and tokens.** `accent` is the tenant key for the five GCC tenants and `ink` for `gen-in`, `gen-gulf` and added tenants.
     - Raw `--acc-<tenant>{,-soft,-ink}` tokens exist for light and dark.
     - `:root[data-tenant=…]` maps them to `--brand*`, and `.accent-<x>` does the same on a single mark, so the switcher shows each tenant in its own colour.
     - A new `--focus-ring` token is cyan by default and the brand colour for GCC tenants.
     - Contrast is at least 4.7:1 for the brand against the surface and for brand-ink on brand-soft, in both themes.
  3. **Files beyond the list.**
     - `base.css`: the focus ring reads `--focus-ring`. `components.css`: the monogram reads the brand tokens, plus the switcher's subhead and scroll list. `layout.css`: `.sidebar.branded` active rule.
     - `Header.tsx`: 4.3.3 needs it. For GCC tenants it also shows the caption "Home / Sun 8 Mar 2026 · Riyadh" instead of the legacy title and waiting count, hides **search and upload** (both read the Indian register), and puts the active tenant's name in the profile menu.
     - `AppShell.tsx`: the footer said "for Genesis EPC India Ltd" under every tenant; it now names the active one.
  4. **Migration** reopens the browser in `gen-in`, not Najd, so "an existing browser with v1 state opens with its Indian demo progress intact" is literally true. Fresh browsers open in Najd.
  5. **Reset.**
     - `'tenant'` resets the price scenario only on `gen-in`, since the scenario belongs to the Indian tenders.
     - `'all'` also clears the `__platform` bucket and tenants added in the session. The modal's note says so.
     - The modal buttons are always enabled; resetting a clean company is harmless.
     - The Settings "Guided walk-through" row, which walks the eight legacy dashboards, shows only on `gen-in`.
  6. **Money.**
     - **KWD conflict (see Blockers 1).** I followed the 2.2.1 rule, so `moneyPair(480e6,'SAR','KWD').text` is `KWD 39.30 M`; `{ dp: 1 }` gives `KWD 39.3 M`. The 2.2 acceptance line expects `KWD 39.3 M`.
     - BHD gets the same 2-dp rule as OMR and KWD (large unit).
     - Compact amounts under 1 M print in full (`SAR 5,000`). Negative amounts print as `−SAR 4.1 M`.
     - Added `rateOf()` and `rateNote()` for the "rate and date on hover" rule.
  7. **Calendar.**
     - Added KSA Founding Day (22 Feb, `expected: false`) from the gcc-demo-data §1 calendar table, with a `'closure'` flag ("Public holiday").
     - `dayFlags` returns `{ key, label, detail }[]`, and does not raise "Ramadan hours" on weekends or closure days.
     - Extra helpers: `dateText`, `rangeText`, `calendarDaysBetween`, `addDays`, `weekendText`, `isWeekend`.
  8. **`useSwitchTenant()`** (in `tenancy.ts`) switches and navigates to `/`, but stays on Settings. So switching never lands on a legacy route under a GCC brand and never shows the redirect toast.
  9. **Tenant drawer.**
     - Adds "Head office" and "Time zone" rows. `KVRow` shows "expiring" in orange (the Najd Etimad credentials).
     - The `gen-in` Tenders count is computed from `gen-in`'s own bucket, so it is right when the drawer is opened from another tenant.
     - Every other tenant shows "—".
  10. **`nameStop()`** in `data/tenants.ts` avoids "Co.." in copy: switch toast, reset toast, reset modal, switcher label.
  11. **Literals.** `money.ts` holds the one `₹` in the new files, which 2.2.1 requires for the INR crore look. `calendar.ts` imports `TODAY_ISO` from `data/tenders.ts`, per 2.5.
  12. **Header pill** shows the tenant monogram instead of the building icon, for every tenant. `gen-in`'s is the neutral ink mark.
- **Blockers / questions:**
  1. **KWD decimals.**
     - For the rule: 2.2.1 and ui-direction §7.1 say OMR and KWD use two decimals for millions.
     - Against it: the 2.2 acceptance line (`KWD 39.3 M`), ui-direction's own example (`KWD 18.3 M`) and gcc-demo-data (`KWD 3.1 M`) all use one decimal.
     - Built as the rule. Changing to 1 dp for KWD is a one-word edit to `WIDE_UNIT` in `domain/money.ts` plus the dev check's expectation.
  2. **Remaining Indian content under a GCC brand, in files this plan did not own.**
     - Settings shows "Sources watched" (Genesis mailboxes and the `TENANT` label), "Gates and control points" and "Users and roles" (Indian personas).
     - The profile menu's persona list uses Indian names.
     - Plan 003 owns Settings and the persona switcher, so I left these.
- **Follow-ups noticed (not done):**
  - Settings "Sources watched" could read `tenant.sources` for GCC tenants (plan 003 or 010).
  - Search and upload come back for GCC tenants with plans 006 and 007.
  - `homeTenant()` in `domain/tenants.ts` was unused and was removed.
  - `data/roles.ts` `TENANT` is still used by the legacy Settings cards.

## Orchestrator review (2026-09-25)
- **Accepted.** Status set to `DONE (2026-09-25)` in the index.
- **Blocker 1 (KWD decimals) decided:** one decimal for millions in every currency. The 2-dp rule in 2.2.1 was the orchestrator's error; the docs' examples were right. Changed by the orchestrator: `WIDE_UNIT` removed from `domain/money.ts`; `dev-checks/10-formats.tsx` now expects `KWD 39.3 M` and `OMR 49.2 M` by default, with `{ dp: 2 }` rows for the two-decimal form; ui-direction §7.1 updated. Typecheck passes; all 16 checks pass in the browser.
- **Blocker 2 (Indian content under GCC brands):** moved into plan 003 steps 5.1 and 5.3.1.
- Deviations 1–12 accepted.

