# 011 — Catalyst Platform Console and break-glass

Status: READY · Depends on: 002, 003, 006, 015 (all in `gcc-demo`) · Can run in parallel with: 007b, 008b, 009b, 022, 023

## Goal
Demo script F ends with the question every EPC buyer asks: **"Can Catalyst see our prices?"** After this plan the presenter switches to the Catalyst operator and lands in a **separate Platform Console**: every tenant's health, counts and spend, and **no tender content anywhere**. A locked tile says "Tenant data. Request break-glass access". The request form (reason, one tenant, at most 4 hours, a second approver) is sent. Then the presenter switches back to Najd's Head of Tendering, who sees **"Catalyst requested access"** in the audit log and on the dashboard. That is M-9 in one click (s1-s3-demo-spec §13, roles-and-access P1).

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **Counts and health only.** The console never shows a tender title, TID, value, supplier, person's bid data or document, and must not import tender-level data modules to compute anything that could leak. Counts are fine (live tenders per tenant, connectors healthy).
- **Platform facts are synthetic and labelled.** Intake p90, eval pass rates, spend and releases are fixed demo facts in `src/data/platform/`, not live data. The honesty banner stays.
- **One flow:** the break-glass request, and the tenant seeing it. No approval workflow beyond that (the second approver is named on the form; the tenant's Head of Tendering can revoke).
- **Keep the dev check small:** about 8 rows.

## Context
- **Why:** s1-s3-demo-spec §13 and §17 script F; roles-and-access §4 P1 (what the operator can and cannot do; break-glass rules), §8; kpi-and-screen-catalogue §C.8 (PLT-1…6 tiles, panels) and GOV-6 (break-glass; shown to the tenant as an action row and in the audit log, not as a tile).
- **Today:**
  - The operator exists: `PLATFORM_OPERATOR` in `src/data/people.ts` (`role: 'platform'`, `tenant: '*'`), reachable from every GCC tenant's persona menu. `data/access.ts` gives it `platform.console`, `platform.breakglass` and `tenant.add`, and an empty sidebar. Switching to it today shows the tenant shell with nothing in it.
  - The demo store (`src/state/store.tsx`) keeps an audit trail per tenant (`auditBy`, `appendAudit`, the `audit` action appends to the **current** tenant), and a platform bucket (`PLATFORM_BUCKET`) for onboarding keys (`tn-`).
  - `/admin/audit` is listed in `src/pages/gcc/screens.ts` but not built (plan 010 owns Administration; this plan builds only the audit log page, at demo grade, because script F needs it).
  - Tenant records: `src/data/tenants.ts` / `domain/tenancy` (name, region, residency, accent) and `src/data/gcc/tenants/*.ts` (`sources` for connector counts).

## Scope
**Files to create:**
- `src/pages/platform/`: `PlatformShell.tsx` (its own top bar and rail, Catalyst branding, an "Operator" label, visually distinct from a tenant), `Console.tsx`, `TenantPanel.tsx`, `BreakGlassModal.tsx`, `platform.css`.
- `src/data/platform/`: `facts.ts` (per tenant: tier pooled or silo, residency, version, intake p90, eval pass rate per agent, model spend and ceiling, guardrail activations; releases and canary), `operators.ts` (two fictional Catalyst operators: the requester is `PLATFORM_OPERATOR`, plus one named second approver).
- `src/domain/platform/`: `console.ts` (view models PLT-1…6 and the panels, from the facts plus **counts** from tenant data), `breakglass.ts` (the key contract, below).
- `src/pages/gcc/admin/AuditLog.tsx`: the tenant's audit log (store `auditBy` for this tenant, newest first, with actor, action, target and detail; filter by kind; the break-glass entries tagged "Catalyst").
- `src/domain/gcc/actions/platform.actions.ts`: the Head of Tendering's action row "Catalyst requested access", as a registry file (collected by glob; no registry edits).
- `src/pages/gcc/dev-checks/65-platform.tsx`.

**Files to change (only these lines):**
- `src/App.tsx`: a `platform` route tree rendered by `PlatformShell`; when the current person has `role === 'platform'`, `/` redirects to `/platform`. Re-read the file right before editing (007b, 008b and 009b may add routes at the same time); add lines, don't move others.
- `src/state/store.tsx`: one new action, `auditTo(tenant, event)`, which appends to a named tenant's trail (the existing `audit` action is untouched), and have **Reset demo** clear the break-glass keys with the tenant (check that the tenant reset already does, since they live in that tenant's `done`).
- `src/pages/gcc/screens.ts`: set `'/admin/audit'`'s `built: true` and its `page` loader. Touch nothing else.
- `src/data/access.ts`: only if the operator needs a route capability that doesn't exist; say so in the report. No change to any tenant role.
- `src/domain/gcc/dashboards/portfolio.dash.ts`: add the new action source's ID to the Head of Tendering's `actions` list, one line. The six tiles are fixed by dashboards.md §10.1 and stay as they are (no GOV-6 tile).

**Break-glass key contract** (`domain/platform/breakglass.ts`):
- Written into the **target tenant's** `done` (so the tenant sees it and Reset clears it): `breakglass:{n}` → JSON `{ reason, scope: 'read-only', hours, requestedById, approverId, at, status: 'requested' | 'revoked' }`.
- Revoke writes `breakglass:{n}:revoked` → `{ byId, at }`.
- Each write also appends an audit event to that tenant through `auditTo`: "Catalyst requested access (break-glass, 4 h, read only)" and "Break-glass access revoked".
- Readers: `breakGlassOf(done)` returns the list with status. Nobody parses the keys elsewhere.

**Out of scope** (stop and ask): any tender screen or tender data; the rest of Administration (users and roles, committees, sources, fit model, targets, branding: plan 010); real authentication; a working break-glass session that opens tenant data (the demo stops at "requested", which is the point); new libraries.

## Steps

### Phase 1 — Shell and console
- [ ] 1.1 `PlatformShell`: Catalyst name and mark, an "Operator" label, the demo persona menu (to switch back), no tenant switcher inside the console. Distinct from the tenant shell at a glance (neutral palette, not a tenant accent).
- [ ] 1.2 Tiles (catalogue §C.8), each with an ⓘ that says what it counts and that it is a demo figure where it is one:
  - PLT-1 tenants live and onboarding, with region and residency (the five GCC tenants live; Genesis Infra Gulf JV onboarding; the Indian preview is not a GCC tenant: leave it out, or list it as "legacy preview");
  - PLT-2 connector health across the estate (from each tenant's `sources`);
  - PLT-3 intake p90 by tenant; PLT-4 eval pass rate by agent; PLT-5 model spend against ceiling; PLT-6 open break-glass (from `breakGlassOf` across tenants).
- [ ] 1.3 Panels: the tenant list (tier, residency, version, health dots); releases and canary; guardrail activations by tenant (counts).
- [ ] 1.4 **The locked tile:** each tenant row has a "Tender data" cell showing a lock and "Tenant data. Request break-glass access". There is no way to open tender content from the console.

### Phase 2 — Break-glass
- [ ] 2.1 `BreakGlassModal`: tenant (one), reason (required, at least 20 characters), duration (1–4 hours, default 4), scope "read only", second approver (the named Catalyst colleague; the requester cannot approve their own request), and a line that the tenant's Head of Tendering is notified and every screen viewed is logged.
- [ ] 2.2 Submit writes the key and the audit event into the target tenant; the console shows the request as "Requested · awaiting the tenant's view" with the time. It survives a reload.
- [ ] 2.3 Tenant side: Najd's Head of Tendering sees the action row "Catalyst requested access" (reason, duration, approver; buttons **View in audit log** and **Revoke**), and the audit log shows the entry tagged "Catalyst". Revoke writes the revoked key and an audit entry; the console then shows "Revoked by Faisal Al-Harbi".
- [ ] 2.4 Reset demo (this tenant) clears the request in both places.

### Phase 3 — Audit log page
- [ ] 3.1 `/admin/audit` for the Head of Tendering: every audit event of this tenant from the store (persona switches, View as, gate writes, requests, break-glass), newest first; a kind filter; the Catalyst entries stand out (tag, not colour alone). Other roles: the existing guard from `screens.ts`' capability (`audit.view`).

### Phase 4 — Dev check and polish
- [ ] 4.1 About 8 rows: the console view models contain no tender ID, title or value (scan every string for `T-20` and for currency amounts); PLT-6 counts a written request; the request lands in the target tenant's `done` and audit trail, not the current one; revoke works; Reset clears it; the operator is denied `tender.view`.
- [ ] 4.2 1440 and 1280, light and dark, no console errors.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] Script F end to end: as Najd's Head of Tendering, View as the Procurement Lead (margin masked); switch to the Catalyst operator → the console opens with no tender content; request break-glass for Najd; switch back to Faisal → the action row and the audit entry are there; Revoke → the console shows it revoked; Reset demo clears it.
- [ ] Switching to the operator from any GCC tenant opens the console; switching back returns to that tenant's dashboard. The Indian preview is unchanged.
- [ ] No hard-coded counts in pages; platform figures come from `data/platform`, counts from tenant data.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
