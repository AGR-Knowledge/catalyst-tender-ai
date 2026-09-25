# 003 — Roles, people and permissions

Status: DONE — awaiting review (2026-09-25) · Depends on: 002 · Can run in parallel with: 004, 005 (they own different files). **Parallel run:** read "Running wave 1 in parallel" in `app/plans/README.md` first.

## Goal
Each GCC tenant has its own named people: a Head of Tendering, the tendering team, a Bid Committee whose members are named, contributors, a supplier and the Catalyst operator. The presenter picks a person from a grouped switcher. Every screen asks one function, `can()`, what that person may see and do. Sensitive values (margin, competing quotes, committee positions) can be masked by role. The Head of Tendering can "View as" anyone, read-only.

## Context
- **Why:**
  - roles-and-access.md, decisions R1–R7, §4 role catalogue, §6 permission matrix, §9 sensitive data;
  - s1-s3-demo-spec §3 personas, §4 information architecture;
  - kpi-and-screen-catalogue §C (rights per role) and §D (who opens which screen);
  - gcc-demo-data §2.7 (names).
- **Current behaviour:**
  - `src/data/types.ts:3`: `RoleKey` has 8 values.
  - `src/data/roles.ts:3-12`: one global list of 8 people, all Indian personas.
  - `src/data/access.ts:21-111`: access is "which sidebar items you see" (`ROLE_NAV`, `canSee`). There are no action rights, no tender scoping and no masking.
  - `src/components/layout/Header.tsx:132`: persona menu in hand-over order (`WALK_ORDER`), the same Indian names for every tenant. Plan 002 already made `:126` show the active tenant's name, and hides search and upload for GCC tenants (`:76-77`).
  - `src/pages/Settings.tsx`: "Add tenant" (`:42`) and every "Administrator only" card are open to every persona. For GCC tenants three cards still show Indian content: "Sources watched" (`:62`, the legacy `TENANT` label and `SOURCES` from `data/catalog`), "Gates and control points" (`CONTROL_POINTS`) and "Users and roles" (`:87`, `WALK_ORDER`). "Add tenant" is also in `TenantSwitch.tsx:70`.
  - `src/state/store.tsx`: after plan 002, holds `tenant`, `doneBy`, and one global `role` (`:66`; `setRole` `:266`, `setTenant` `:272`). Tenant switching from the UI goes through `useSwitchTenant()` in `src/domain/tenancy.ts`.
  - Line numbers are as of the plan 002 review (2026-09-25); find by name if they drift.

## Scope
**Files to create:**
- `src/data/people.ts`
- `src/domain/permissions.ts` (the `useCan()` hook and helpers)
- `src/components/layout/ViewAsBanner.tsx`

**Files to change:**
- `src/data/types.ts` (RoleKey)
- `src/data/roles.ts`
- `src/data/access.ts`
- `src/state/store.tsx` (person per tenant, viewAs, audit list)
- `src/components/layout/Header.tsx` (persona menu)
- `src/components/layout/AppShell.tsx` (mount the banner)
- `src/components/layout/TenantSwitch.tsx` ("Add tenant" gating only)
- `src/components/layout/Sidebar.tsx` (exhaustive `Record<RoleKey,…>` maps only)
- `src/pages/Settings.tsx` (card gating)
- `src/pages/Restricted.tsx` (a capability guard)
- `src/pages/gcc/dev-checks/20-people.tsx` (new panel; plan 002's dev-check slot)
- any other file that fails typecheck **only** because a `Record<RoleKey, …>` needs the new keys. Add minimal entries; do not change behaviour.

**Out of scope** (stop and ask):
- Building desks, Administration pages or the stage-grouped sidebar (plans 006, 010, 013). This plan defines the **nav model data**; plan 006 renders it.
- Legacy gate-authority fixes on the Indian tenant (DG2 vote, DG3 board, M2 co-sign). Those are full-lifecycle work, later.
- GCC tender data (plan 004).

## Steps

### Phase 1 — Role keys and people
- [x] 1.1 Extend `RoleKey` with `'hot' | 'member' | 'plan' | 'fin' | 'hr' | 'supplier' | 'platform'`:
  - `dir` doubles as the Project Director (designate);
  - `comp`, `comm` and `prop` keep their meaning.
  - [x] 1.1.1 Fix every exhaustive `Record<RoleKey, …>` the compiler flags, with minimal neutral entries: an icon, an empty `ROLE_NAV` group list, a `WALK_STEP` text of `''`. Legacy behaviour for the 8 original keys must not change.
- [x] 1.2 `src/data/people.ts`:
  - [x] 1.2.1 Types:

    ```ts
    export type Seat = 'chair' | 'cfo' | 'technical' | 'operations' | 'sector';
    export type PersonGroup = 'Tendering team' | 'Bid Committee' | 'Contributors' | 'External' | 'Platform';
    export interface Person {
      id: string;            // `${tenant}.${role}` or `${tenant}.member.${seat}`, e.g. 'najd.bid', 'najd.member.cfo'
      tenant: string;        // tenant key, or '*' for the platform operator
      name: string; initials: string;
      role: RoleKey; seat?: Seat; sector?: string;
      title: string;         // shown in UI, e.g. 'Chief Financial Officer'
      group: PersonGroup; hint: string;   // one line: what this person does (spec §3)
      switcher: boolean;     // false for HR (credential owner only)
      cleared?: boolean;     // restricted-lane clearance; true for hot and exec
    }
    ```
  - [x] 1.2.2 GCC people for all five tenants, exactly from gcc-demo-data §2.7:
    - Seats: `exec` has `seat: 'chair'`; the four members have seats `cfo`, `technical`, `operations`, `sector` (with `sector` set).
    - `hr` has `switcher: false`.
    - The supplier person uses id `${tenant}.supplier`.
    - The platform operator has id `platform.ops` and tenant `'*'`.
    - `headTitle` from the tenant profile (plan 002) is used for the `hot` title.
  - [x] 1.2.3 Indian people: map the existing 8 `ROLES` to ids `gen-in.<key>` with `group: 'Tendering team'` etc. Keep `ROLES` exported for legacy readers.
  - [x] 1.2.4 Helpers: `peopleOf(tenant)`, `personById(id)`, `firstWithRole(tenant, role)`, `committeeOf(tenant)` (chair first, then cfo, technical, operations, sector).
- [x] 1.3 `TENANT` in `roles.ts`: plan 002 already replaced the Header usage with the active tenant's name. The one remaining render is Settings "Sources watched" (`Settings.tsx:62`), handled in 5.3. Leave the constant for legacy imports.

### Phase 2 — Person in the store, View as, audit
- [x] 2.1 Store (`state/store.tsx`):
  - `personBy: Record<string, string>` (tenant → person id), persisted;
  - derived `state.person` (a Person) and `state.role` (= `person.role`);
  - on tenant switch, keep the same `role` if that tenant has it (`firstWithRole`), else fall back to `hot`, or `bid` for `gen-in`;
  - `setPerson(id)`;
  - legacy `setRole(key)` maps to `firstWithRole(tenant, key)`, so `/dashboard/:role` keeps working.
- [x] 2.2 `viewAs: string | null` (person id), **not** persisted, cleared on tenant switch.
  - `startViewAs(id)` is allowed only if `can('view.as')` for the real person;
  - `stopViewAs()`.
  - While viewing: `state.person` is the viewed person for **reading**, and every write capability is denied (Phase 3.4).
- [x] 2.3 A minimal audit trail per tenant:
  - `auditBy: Record<string, AuditEvent[]>`, persisted, where `AuditEvent = { id, at: string /* demo ISO date-time */, actorId, action, target?, detail? }`;
  - `logAudit(e)`;
  - persona switch, View as start and stop, and tenant switch write events;
  - Reset clears the tenant's audit (or all, with "all").

  Plan 006+ uses `logAudit` for decisions. Timestamps use the demo clock: `DEMO_TODAY` plus an incrementing minute from 10:00, so entries order correctly without real time.

### Phase 3 — Capabilities and `can()`
- [x] 3.1 In `access.ts`, add:

  ```ts
  export type Scope = 'tenant' | 'sector' | 'assigned' | 'invited' | 'own' | 'seat';
  export type Capability =
    // viewing
    | 'tender.view' | 'radar.view' | 'queue.view' | 'screening.view' | 'dg1.view' | 'sourcing.view' | 'levelling.view'
    | 'supplier.view' | 'pack.view' | 'dg2.view' | 'company.view' | 'audit.view' | 'admin.view'
    // Stage 1 / DG1
    | 'tender.create' | 'field.validate' | 'query.draft' | 'query.approve' | 'addendum.link' | 'booklet.request' | 'booklet.approve'
    | 'dg1.decide' | 'dg1.delegate' | 'reopen.request'
    // Stage 2
    | 'package.approve' | 'package.comment' | 'shortlist.approve' | 'rfq.send' | 'quote.level' | 'bestfit.approve' | 'supplier.manage'
    // Stage 3 / DG2
    | 'pack.issue' | 'pack.note' | 'input.request' | 'input.respond' | 'dg2.position' | 'dg2.decide' | 'dg2.secretary' | 'reopen.approve'
    // company, admin, platform
    | 'credential.manage' | 'credential.renew' | 'facility.edit'
    | 'admin.users' | 'admin.gates' | 'admin.sources' | 'admin.fit' | 'admin.targets' | 'admin.branding' | 'view.as'
    | 'platform.console' | 'platform.breakglass' | 'tenant.add'
    // sensitive data (masking)
    | 'see.margin' | 'see.quotes' | 'see.quotes.summary' | 'see.positions' | 'see.pii' | 'see.restricted'
    // supplier portal
    | 'portal.rfq';
  export const GRANTS: Record<RoleKey, Partial<Record<Capability, Scope>>> = { … };
  ```
- [x] 3.2 Fill `GRANTS` from kpi-and-screen-catalogue §C and §D and roles-and-access §9. Anything not listed is denied:
  - **`hot`:** every `*.view` at `tenant`; `tender.create`, `field.validate`, `query.draft`, `query.approve`, `addendum.link`, `booklet.approve`, `dg1.delegate`, `reopen.request`, `input.request`, `dg2.secretary`, `credential.manage`, all `admin.*`, `view.as`, `audit.view`; `see.margin`, `see.quotes`, `see.positions`, `see.pii`, `see.restricted` (`tenant`). **Not** `dg1.decide` (only as delegate), `dg2.position`, `dg2.decide`, `rfq.send` or `bestfit.approve`.
  - **`coord`:** `tender.view`, `radar.view`, `queue.view`, `screening.view`, `dg1.view`, `company.view` (`tenant`); `tender.create`, `field.validate`, `query.draft`, `addendum.link`, `booklet.request`.
  - **`bid`:** `tender.view`, `radar.view`, `queue.view`, `screening.view`, `dg1.view`, `sourcing.view`, `levelling.view`, `pack.view`, `dg2.view`, `company.view` (`tenant`); `dg1.decide`, `query.approve`, `package.comment`, `pack.issue`, `pack.note`, `input.request`, `reopen.request`, `see.margin`, `see.quotes.summary`, `see.positions` (`assigned`).
  - **`proc`:** `tender.view`, `sourcing.view`, `levelling.view`, `supplier.view`, `company.view` (`tenant`); `package.approve`, `shortlist.approve`, `rfq.send`, `quote.level`, `bestfit.approve`, `supplier.manage`, `see.quotes` (`tenant`). **Not** `see.margin`.
  - **`exec`:** every view except `admin.view` (`tenant`); `dg2.position`, `dg2.decide` (`seat`: chair only); `reopen.approve`; `see.margin`, `see.quotes.summary`, `see.positions`, `see.restricted`.
  - **`member`:** `tender.view`, `pack.view`, `dg2.view`, `company.view` (`tenant`); `dg2.position` (`seat`); `see.margin`, `see.positions`, `see.quotes.summary` (`tenant`; tenant-configurable later).
  - **`comm`:** `tender.view` (`invited`), `levelling.view`, `pack.view` (`invited`); `input.respond` (`own`); `see.margin`, `see.quotes` (`invited`).
  - **`plan`, `comp`, `dir`:** `tender.view`, `pack.view` (`invited`); `input.respond` (`own`).
  - **`fin`:** as `plan`, plus `facility.edit` (`tenant`) and `credential.renew` (`own`).
  - **`hr`:** `credential.renew` (`own`).
  - **`supplier`:** `portal.rfq` (`own`) only.
  - **`platform`:** `platform.console`, `platform.breakglass`, `tenant.add` only. No tenant data at all.
  - **Legacy keys on `gen-in`** (`prop`, and the others in legacy screens): legacy screens keep using `canSee`, unchanged.
- [x] 3.3 `can(person: Person, cap: Capability, ctx?: { tender?: { bidManagerId?: string; sector?: string; invited?: string[]; restricted?: boolean }; ownerId?: string; seat?: Seat; viewAs?: boolean }): { ok: boolean; reason?: string }`:
  - `tenant` → ok.
  - `assigned` → `ctx.tender?.bidManagerId === person.id` (or no tender given, which means list-level access).
  - `sector` → `person.sector === ctx.tender?.sector`.
  - `invited` → `ctx.tender?.invited?.includes(person.id)`.
  - `own` → `ctx.ownerId === person.id`.
  - `seat` → `dg2.decide` needs `person.seat === 'chair'`; `dg2.position` needs any seat.
  - Restricted tenders need `see.restricted` and `person.cleared`.
  - **Reasons are user-facing sentences**, e.g. "Only the assigned Bid Manager, Omar Siddiqui, records DG1", "Margin is masked for your role", "Only the committee chair records the decision".
- [x] 3.4 View as: when `ctx.viewAs` (or the store's `viewAs`) is set, every capability that isn't `*.view` or `see.*` returns `{ ok: false, reason: 'Viewing as {name}. Read only' }`.
- [x] 3.5 `src/domain/permissions.ts`:
  - `useCan()` returns `(cap, ctx?) => result`, bound to the current person and the viewAs state;
  - `useMask()` returns `(field: 'margin' | 'quotes' | 'positions' | 'pii', ctx?) => boolean` (true = visible).
- [x] 3.6 Keep `canSee(role, page)` for legacy screens. For GCC tenants, `canSee` returns true only for `'settings'` (legacy pages are already redirected by plan 002).

### Phase 4 — GCC navigation model (data only; plan 006 renders it)
- [x] 4.1 In `access.ts`, add `NAV_GCC: { label: string; stage?: 1 | 2 | 3; items: { key: string; label: string; path: string; cap: Capability; gate?: 'DG1' | 'DG2' }[] }[]`, exactly as spec §4:
  - My desk `/` (`tender.view` or `input.respond`: use a special `cap` of `'tender.view'` and let the desk decide);
  - Pipeline `/pipeline`; Calendar `/calendar`;
  - 1 Discover & qualify: Tender radar `/radar` (`radar.view`), Intake queue `/intake-queue` (`queue.view`), Screening `/screening` (`screening.view`), DG1 decisions `/dg1` (`dg1.view`, gate `DG1`);
  - 2 Source: Packages & RFQs `/sourcing` (`sourcing.view`), Quote levelling `/levelling` (`levelling.view`), Suppliers `/suppliers` (`supplier.view`);
  - 3 Decide: Bid / No-Bid packs `/packs` (`pack.view`), DG2 committee `/dg2` (`dg2.view`, gate `DG2`);
  - Company `/company` (`company.view`);
  - Administration `/admin` (`admin.view`), with children users, committees, sources, fit, targets, branding, audit;
  - Settings `/settings`.
  - Paths are reserved for later plans. **Do not create the pages.**
- [x] 4.2 `navFor(person)` filters `NAV_GCC` by `can`. Export it for plan 006. Add a small table in a comment showing, per role, which groups appear, as a self-check against catalogue §D.

### Phase 5 — Persona switcher, banner, admin gating
- [x] 5.1 `Header.tsx` persona menu:
  - **GCC tenants:** people of the active tenant with `switcher: true`, grouped under the five `PersonGroup` headings. Each row shows avatar, name, title (and seat for members: "CFO · Bid Committee") and the one-line hint. Keep the `Demo` chip. Keyboard behaviour stays as today (menuitemradio).
  - **`gen-in`:** keep the existing hand-over list, unchanged.
  - [x] 5.1.1 When the current real person is `hot`, add a "View as…" section listing everyone else in the tenant. Choosing one calls `startViewAs`.
- [x] 5.2 `ViewAsBanner.tsx`, mounted in `AppShell` above the page:
  - text: "Viewing as {name}, {title}. Read only. Actions are disabled.";
  - an "Exit view" button;
  - high contrast in both themes (uses `--orange-soft` and `--ink`);
  - `role="status"`.
- [x] 5.3 Settings gating (`Settings.tsx`):
  - "Tenants" card and "Add tenant" show only with `can('tenant.add')`, which means the platform persona only;
  - "Users and roles" shows only with `can('admin.users')` (GCC `hot`). On `gen-in` there is no such person, so it is hidden, and a note says "Managed by your Head of Tendering";
  - Appearance and Demo (Reset, banner) stay for everyone. They are presenter controls, with the `Demo` chip on the Demo card;
  - add a read-only "Demo scope" row: GCC tenants show "Stages 1–3 with DG1 and DG2"; `gen-in` shows "Full lifecycle (preview)". A toggle is deliberately not built (spec §2.1 tenancy rule).
  - [x] 5.3.1 **No Indian content under a GCC brand** (plan 002 review). For GCC tenants only; `gen-in` keeps today's cards:
    - "Sources watched" lists the active tenant's own `tenant.sources` (name and mode), with the tenant name as the card meta. No health column yet: source health arrives with plan 007 from plan 004's data.
    - "Users and roles" lists `peopleOf(tenant)` grouped by `PersonGroup` (name, title, seat for members), not `WALK_ORDER`. Clicking a person keeps today's toast, worded "{name}: role, tender scope and gate authority (Head of Tendering only)".
    - "Gates and control points" is hidden. Plan 010 builds the GCC version under Administration.
- [x] 5.4 `TenantSwitch.tsx`: the "Add tenant" link shows only with `can('tenant.add')`. The switcher itself stays available to everyone: it is a demo control (spec §16).
- [x] 5.5 `Restricted.tsx`: add `GuardCap({ cap, children })`. It renders the existing restricted page with the `can()` reason when denied. `Guard` (page-based) stays for legacy routes.
- [x] 5.6 Smoke test: plan 002 already routes every GCC person to `GccPending`. Add the panel `src/pages/gcc/dev-checks/20-people.tsx`. **Do not edit `GccPending.tsx`, `App.tsx` or `Dashboard.tsx`.** The panel prints:
  - the current person, role and seat;
  - `navFor(person)` groups;
  - the `can()` spot checks listed under Acceptance;
  - the last 5 audit entries.

  `supplier` and `platform` personas see a note naming their later plans (portal: 008; console: 011).

## Data and derivation
- **New facts:** `data/people.ts` (5 × 16 GCC people, 8 Indian, 1 platform); `GRANTS` and `NAV_GCC` in `data/access.ts`.
- **State:** `personBy` (persisted), `viewAs` (session), `auditBy` (persisted, per tenant). Reset clears the tenant's audit; person selection is kept across Reset.
- No `done` keys added.

## Acceptance checks
- [x] typecheck and build pass.
- [x] `gen-in`: the persona menu, dashboards, gates and Settings behave as before, except that "Add tenant" and "Users and roles" are hidden (by design).
- [x] Najd: the persona menu shows five groups with 16 switchable people and hints. Picking "Khalid Al-Mutairi, CFO · Bid Committee" makes the people panel on `GccPending` show role `member`, seat `cfo`, with nav groups Pipeline, Calendar, 3 Decide (packs, DG2), Company.
- [x] Switching Najd → Corniche keeps the role: Bid Manager Omar Siddiqui → Bid Manager Sameer Qureshi.
- [x] As Head of Tendering (Faisal Al-Harbi), "View as" Joseph Mathew:
  - the banner appears;
  - `GccPending` shows `can('rfq.send')` denied with "Viewing as Joseph Mathew. Read only";
  - "Exit view" restores.

  The persona switch and View as appear in the audit list that `GccPending` prints (last 5 entries).
- [x] Spot checks of `can()` printed on `GccPending`, with a fake tender `{ bidManagerId: 'najd.bid' }`:
  - `bid` → `dg1.decide` ok;
  - `hot` → `dg1.decide` denied with a reason (delegate only);
  - `proc` → `see.margin` denied "Margin is masked for your role";
  - `member.cfo` → `dg2.decide` denied (chair only);
  - `exec` → `dg2.decide` ok.
- [x] Reset (this company) clears Najd's audit list but keeps the selected person.
- [x] Najd Settings as Faisal Al-Harbi: "Sources watched" lists Najd's own sources, "Users and roles" lists Najd's people by group, and no Indian name, mailbox or gate owner appears anywhere on the page (search the page text for "Genesis" and the eight Indian persona names).
- [x] No role checks added in pages; everything goes through `can()` or `canSee()`.

## Execution report
Executor, 2026-09-25.

**Changed files**
- Created:
  - `src/data/people.ts`: the `Person` type, 5 × 16 GCC people from gcc-demo-data §2.7, 8 Indian people, and the platform operator. Helpers: `peopleOf`, `switcherOf`, `personById`, `firstWithRole`, `committeeOf`, `defaultPersonOf`, `counterpartIn`, `belongsTo`, `roleLine`, `initialsOf`.
  - `src/domain/permissions.ts`: `useCan()` and `useMask()`.
  - `src/components/layout/ViewAsBanner.tsx`.
  - `src/pages/gcc/dev-checks/20-people.tsx`.
- Changed, as the plan lists:
  - `src/data/types.ts`: `RoleKey` +7 keys.
  - `src/data/roles.ts`: `WALK_STEP` entries; doc comments on `ROLE_KEYS` and `isRoleKey`, which stay legacy-only.
  - `src/data/access.ts`: `Scope`, `Capability`, `GRANTS`, `can()`, `NAV_GCC`, `navFor()`; `canSee` takes an optional `world`; `ROLE_NAV` entries.
  - `src/state/store.tsx`: `personBy`, `viewAs`, `auditBy`; derived `person`, `realPerson`, `role`, `audit`; `setPerson`, `startViewAs`, `stopViewAs`, `logAudit`; legacy `setRole` maps to a person.
  - `src/components/layout/Header.tsx`: GCC persona menu with groups, hints and "View as…".
  - `src/components/layout/AppShell.tsx`: mounts the banner.
  - `src/components/layout/TenantSwitch.tsx`: "Add tenant" gating.
  - `src/components/layout/Sidebar.tsx`: `ROLE_ICON` entries only.
  - `src/pages/Settings.tsx`: card gating, GCC sources, GCC people, demo scope row.
  - `src/pages/Restricted.tsx`: `GuardCap`; `Guard` passes the world.
- Changed only because a `Record<RoleKey, …>` needed the new keys (scope clause):
  - `src/domain/live.ts` (`roleAttention`);
  - `src/domain/handover.ts` (`WHAT`);
  - `src/pages/Dashboard.tsx` (`BODIES`, plus `default: return []` in the `kpisFor` switch). See deviation 1.

**Verification**
- `npm run typecheck` and `npm run build` pass. The only build warning is the existing chunk-size one.
- A headless Chromium script drove the dev server at 1440 × 1000 from an empty `localStorage`: **43 of 43 checks passed, with no console errors**. What it covers:
  - Najd fresh start as Faisal Al-Harbi. All 5 `can()` spot checks pass on the panel.
  - The persona menu shows 5 groups (Tendering team, Bid Committee, Contributors, External, Platform) and 16 switchable people, each with a hint. There is a `Demo` chip, and HR is not listed.
  - Khalid Al-Mutairi shows role `member`, seat `cfo`. His navigation is: My desk, Pipeline, Calendar; 3 Decide (Bid / No-Bid packs, DG2 committee); Company; Settings.
  - Najd Omar Siddiqui → Corniche gives Sameer Qureshi. Corniche Priya Raman (CFO) → Najd gives Khalid Al-Mutairi.
  - Faisal views as Joseph Mathew:
    - the banner appears;
    - `can('rfq.send')` is denied with "Viewing as Joseph Mathew. Read only";
    - Exit view restores Faisal;
    - the audit list shows "Persona switched", "View as started" and "View as ended".
  - A reload keeps the persona.
  - Najd Settings as Faisal:
    - Najd's own sources are listed;
    - people are listed by group;
    - there is no Tenants card and no gates card;
    - demo scope reads "Stages 1–3 with DG1 and DG2";
    - the header plus page text contains no "Genesis" and none of the 8 Indian persona names;
    - the tenant switcher has no "Add tenant".
  - "Reset this company" clears Najd's audit and keeps Faisal.
  - Catalyst Platform Operations sees the Tenants card, "Add tenant" and the plan 011 note. The supplier sees the plan 008 note.
  - gen-in:
    - opens the Bid Cockpit as R. Iyer;
    - the persona menu keeps 8 people in hand-over order, with no View as;
    - Tender Coordinator and `/dashboard/exec` open their dashboards;
    - Settings: the Tenants card is hidden, the Users note is shown, the gates card is kept, and the scope reads "Full lifecycle (preview)";
    - Pipeline renders;
    - gen-in Executive Sponsor → Najd gives Eng. Abdulaziz Al-Dosari.
- Screenshots were checked by eye: the persona menu, the View as list, the banner in light and dark, Najd Settings and gen-in Settings.

**Deviations from plan**
1. **`Dashboard.tsx` was edited**, although 5.6 says not to. The edit is minimal, as the scope clause for `Record<RoleKey, …>` allows: `BODIES` entries for the new keys, pointing to an empty body. The `kpisFor` switch also needed `default: return []` (TS2366). Neither change is reachable: `/dashboard/:role` accepts only the 8 legacy keys.
2. **`ROLE_NAV` for the new keys** is `[{ label: '', items: [] }]`, not `[]`. The legacy Sidebar destructures `[own, ...rest]` before its GCC branch, so an empty list crashes it.
3. **The committee seat carries across tenants, as well as the role** (`counterpartIn`): a CFO lands on the other tenant's CFO. The plan asked for the role only, which would land on whichever member comes first.
4. **Default persona:** a fresh browser, or a tenant with no saved persona, starts as the Head of Tendering in GCC tenants and as the Bid Manager in `gen-in`. The plan did not specify this.
5. **The platform operator** (`tenant: '*'`) appears in every GCC tenant's switcher under "Platform", through `switcherOf()`. `peopleOf()` excludes it. That gives 15 switchable tenant people plus the operator, which is the 16 in the acceptance check.
6. **`NAV_GCC` type:**
   - an item's `cap` is optional (Settings has none, so everyone sees it);
   - groups gain an optional `cap` (Administration needs `admin.view`, so the Executive Sponsor's `audit.view` does not surface it) and an optional `path` (`/admin`);
   - Administration is a group whose seven children are its items.
7. **`can()` list level:** with no tender or owner in `ctx`, the `invited`, `sector` and `own` scopes pass too. The plan said this only for `assigned`. Without it, `navFor` would give contributors no desk and no packs.
8. **`canSee(role, page, world?)`:** GCC tenants and GCC-only keys get Settings only. `Guard` passes the world. `rolesWith` counts legacy keys only.
9. **"Manage tenants" is gated too**, with `tenant.add`, alongside "Add tenant" in `TenantSwitch`. It links to the Tenants card, which is now hidden for everyone except the operator. The switcher footer hides when both links are hidden.
10. **Settings:**
    - the legacy `WALK_ORDER` Users card was removed: no gen-in person has `admin.users`, so it could never render. The "Managed by your Head of Tendering" card shows instead;
    - Reset also enables when a company has audit entries;
    - the Settings subtitle in `Header` now matches the cards, for GCC and legacy.
11. **Reset also ends View as.**
12. **Copy:**
    - a tenant switch toasts "Now working in {tenant} as {name}, {title}. Demo control";
    - a GCC persona switch toasts "Now acting as {name}, {title}. Demo control" and goes to `/`, except on Settings, which stays put (as a company switch does);
    - the Alerts popover title uses `state.person.name`, which is identical for legacy.
13. **Audit trail:**
    - capped at 200 entries per tenant;
    - each time is one minute after the last entry, starting at 10:00 on demo day;
    - ids are `${tenant}.${n}`.
14. **"View as…" menu:** it is a disclosure inside the persona menu, to keep the menu short. It lists everyone in `peopleOf(tenant)` except the Head of Tendering, including HR and the supplier contact.
15. **Users and roles** also lists the External group (the supplier contact), because the plan says `peopleOf(tenant)`.

**Blockers / questions:** none.

**Follow-ups noticed (not done)**
- **Credential owners' navigation:** `fin` and `hr` have `credential.renew` (`own`) but no `company.view`, so Company is not in their navigation. Catalogue §D gives credential owners "E own" in Company › Credentials. Decide in plan 006 or 010 whether to grant `company.view` at `own` scope.
- **Sector labels:** the committee members' `sector` values ('Water', 'Buildings', 'Utilities', 'Roads', 'Water and infrastructure') follow §2.7. They do not match the tenant sector labels ('Water and wastewater' …). No grant uses the `sector` scope yet; align them when plan 004's tender sectors land.
- **Legacy `canSee` callers:** `Search.tsx`, `UploadButton.tsx` and `Drawers.tsx` call `canSee` without a world. This is harmless today: GCC tenants hide search and upload, and the tender drawer is legacy. Plans 006 and 007 should use `useCan()` for the GCC versions.
- **`roleOf()` fallback:** it falls back to the legacy Bid Manager (R. Iyer) for GCC-only keys. Callers are `nav.ts` `goRole` toasts and `UploadModal`, both unreachable for GCC tenants today.
- **Keyboard:** the persona menu has no arrow-key roving, the same as the legacy menu. Worth adding with plan 016's keyboard pass.
