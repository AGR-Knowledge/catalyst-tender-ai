# 010 — Company: the credentials vault and the renewal loop

Status: READY · Depends on: 007a, 007b, 013, 015 (all in `gcc-demo`) · Can run in parallel with: 012, 014, 018, 024

## Goal
Script A shows the hero's Zakat and GOSI certificates **at risk**: valid today, expired on the bid's opening day. Today the story stops there: "Add evidence" only toasts, and the renewal request's "Open credentials" leads nowhere. After this plan the loop closes:
1. The Head of Tendering requests the renewal.
2. The owner (Finance for Zakat) opens **Company › Credentials** from My requests and uploads the renewed certificate (demo: no real file).
3. Every screen re-checks at once: the hero's eligibility line turns green, the "Credentials at risk" tile drops, and the DG1 pack reads the new date.

The Company page also gives a prospect the company-level view: the capability profile, the bank guarantee facility and the tendering teams, all from the seed.

## Demo-grade rules (read first)
This is a **sales demo**, not the product.
- **One write:** the renewal upload. The profile, the facility and the teams are read-only; their edit buttons are out of scope.
- **Nothing new to derive:** the renewal key `renewed:{credId}` already exists, and its readers already re-check eligibility, the pack's freshness and the dashboards. This plan writes it and shows it.
- **The same numbers as the dashboard:** the credentials strip uses the derivation behind SCR-6 (`domain/gcc/kpi/portfolio.kpi.ts:315`) and `eligibilityRisks` (`domain/gcc/s1`), never its own count.
- **Keep the dev check small:** about 8 rows.

## Context
- **Why:** s1-s3-demo-spec §6.5 (eligibility against the credentials vault; certificates checked against the bid opening date, not today), §17 script A (Zakat and GOSI at risk); kpi-and-screen-catalogue §D (Company › Credentials, archetype B: strip SCR-6 plus "expiring in 90 days"; actions upload renewal and assign owner; Head of Tendering A, owners E on their own, Bid Manager and Coordinator V; SCR-6's drill is filtered "affects live bids"); roles-and-access R11 (Finance and HR open Company).
- **Screens:** `src/pages/gcc/screens.ts:38`: `'/company'` ("The credentials vault, capability profile, bank facility and tendering teams"), `cap: 'company.view'`, `built: false`. It renders `ComingNext` today.
- **Access** (`src/data/access.ts`):
  - `company.view`: hot, exec, coord, bid, proc, member, fin, hr (not comp);
  - `credential.manage`: hot;
  - `credential.renew`: `'own'` for fin and hr (264-266);
  - `facility.edit`: fin (not used here).
  - Under View as, `can()` refuses non-read caps with "Viewing as X. Read only".
- **Data:**
  - `gccData(tenant)` (`src/data/gcc/index.ts:28`) holds `credentials` (`Credential`, `src/data/gcc/types.ts:45-65`: id, kind, label, number, issuer, `validTo`, `ownerId`, note), `company` (hq, employees, fyEnd, financials, entities), `projects`, `partners` (`Partner`, 99-107), `teams` (`Team`, 118-128) and `facility` (`Facility`, 131-139).
  - Najd's credentials are at `src/data/gcc/tenants/najd.ts:35`.
  - Helpers: `dataOf`, `profileOf`, `tenantCcy` (`domain/gcc/s1/common.ts:14-26`) and `facilityHeadroom` (`domain/gcc/s1/bond.ts:57`).
- **The renewal keys** (`domain/gcc/s1/done.ts:45-54`, `DONE_KEY`):
  - `renewal-requested:{id}` → `{ at, byId }` is written by `RenewalButton` (`pages/gcc/s1/parts/RenewalButton.tsx`);
  - `renewed:{id}` → `RenewedValue { validTo, at, byId }` (`domain/gcc/s1/eligibility.ts:74`) is **read** by `eligibility.ts:122-127`, `requests.ts` (renewal rows), `s3/freshness.ts:84`, `actions/portfolio.actions.ts:154` and `demo/30-stage3.apply.ts:43`. **Nothing writes it yet.**
- **Links that point here:**
  - My requests' renewal row routes to `/company` once it is built (`domain/gcc/actions/requests.actions.ts:18`, with no credential in the link);
  - Eligibility's "Add evidence" only toasts (`pages/gcc/s1/parts/EligibilityPanel.tsx:72-77`).

## Scope
**Files to create:**
- `src/pages/gcc/company/`: `Company.tsx` (tabs: Credentials · Capability profile · Bank facility · Teams and partners, with `?tab=` and `?cred=` in the URL), `Credentials.tsx`, `RenewalModal.tsx`, `Profile.tsx`, `Facility.tsx`, `Teams.tsx`, `company.css`.
- `src/domain/gcc/company/`: `vault.ts` (`vaultFor(tenant, done, viewer)`: each credential with its state against today and against the earliest live bid opening that needs it, the bids it affects, the owner, the renewal request and the renewal), `renewal.ts` (`renewalWrite(credId, validTo, byId, done)` → `renewed:{id}` plus an audit draft, refusing a date that isn't later than the current `validTo`), `index.ts`.
- `src/pages/gcc/dev-checks/66-company.tsx`.

**Files to change (only these lines):**
- `src/pages/gcc/screens.ts`: the `'/company'` entry only (`built: true`, `page`). Re-read it before editing; plans 018 and 024 edit their own entries at the same time.
- `src/domain/gcc/actions/requests.actions.ts:18`: the renewal route gains the credential (`/company?tab=credentials&cred={id}`).
- `src/pages/gcc/s1/parts/EligibilityPanel.tsx:72-77`: "Add evidence" opens `/company?tab=credentials&cred={id}` for the line's credential (or the Credentials tab when the line has none), instead of the toast.

**Out of scope** (stop and ask):
- editing the profile, the facility, teams or partners;
- assigning a credential owner (the owner is read in several modules; not for this demo);
- Administration (plan 024);
- a real file upload or storage;
- new capabilities;
- the Indian world;
- new libraries.

## Steps

### Phase 1 — The vault rules
- [ ] 1.1 `vaultFor`: for each credential, the state:
  - `valid`;
  - `expiring` (within 90 days of today);
  - `at-risk` (valid today, expired on the opening of a live bid that needs it; the same test as the eligibility line's `checkedAgainst`);
  - `expired`;
  - `renewed` (a `renewed:` key, with the new date).

  Also: the affected live bids (TID, short title, the date it must hold), the owner's name, the request (who asked, when, due), and the renewal (who, when). Read the bids through `eligibilityRisks` so the vault and the eligibility lines agree.
- [ ] 1.2 `renewalWrite`:
  - refuses without `credential.manage`, or `credential.renew` on the viewer's own credential (the reason from `access.ts`);
  - refuses a `validTo` not later than the current one;
  - the audit reads "Credential renewed: Zakat certificate (ZATCA), valid to 30 Apr 2027";
  - the default new date is one year after the current `validTo`, through `domain/calendar.ts`.
- [ ] 1.3 The strip counts come from the SCR-6 derivation: at risk (affects live bids), expiring in 90 days, expired. (acceptance: in Najd the strip's at-risk count equals the dashboard's "Credentials at risk" tile.)

### Phase 2 — The Company page
- [ ] 2.1 **Credentials** (archetype B, a list with a detail side panel):
  - the strip;
  - the table: credential, kind, number, issuer, valid to (`When`), state (`StatusPill`), owner, affects;
  - sorted with at-risk first;
  - "affects live bids" as a filter.

  `?cred=` opens that credential's panel and scrolls to it.
- [ ] 2.2 The side panel:
  - the facts;
  - the bids it affects, each linking to the tender's Eligibility tab;
  - the renewal request ("Requested by Faisal Al-Harbi, Sun 8 Mar 10:03 · due …");
  - the actions:
    - **Upload renewal** (owner or Head of Tendering; others see it disabled with the reason);
    - **Request renewal** (the existing `RenewalButton`, for the Head of Tendering, when none is requested).
- [ ] 2.3 `RenewalModal`:
  - the new valid-to date (default from 1.2);
  - a "Demo: the renewed certificate is attached" line in place of a file picker;
  - Save writes through `mark()`;
  - the toast names what changed ("Zakat certificate renewed to 30 Apr 2027. T-2026-118's eligibility re-checked: the line now passes."), derived from the re-run, not typed.
- [ ] 2.4 **Capability profile:** company facts (HQ, employees, financial year, financials by year through `Money`), the entities (for groups), the similar projects list, the sectors and geographies. All read-only.
- [ ] 2.5 **Bank facility:** limit, used, headroom (`facilityHeadroom`), with the guarantees in issue if the seed holds them, and the "as of" date.
- [ ] 2.6 **Teams and partners:** teams with their members and load; JV partners with country and a one-line note.

### Phase 3 — The loop, end to end
- [ ] 3.1 As Faisal (Najd Head of Tendering): the hero's Eligibility tab → **Request renewal** on Zakat → switch to Sultan (Finance) → My requests → **Open credentials** lands on the Zakat panel → **Upload renewal** → back as Faisal:
  - the hero's line passes;
  - the "Credentials at risk" tile has dropped by one;
  - the request shows as submitted;
  - the DG1 pack's eligibility section reads the new date.
- [ ] 3.2 "Add evidence" on an eligibility line opens the matching credential.
- [ ] 3.3 A contributor without `company.view` (e.g. Compliance) gets the existing guard, not a broken page.

### Phase 4 — Dev check and polish
- [ ] 4.1 `66-company.tsx`, about 8 rows:
  - the vault's at-risk count equals SCR-6 in every tenant;
  - Najd's Zakat and GOSI are at risk against T-2026-118's opening;
  - `renewalWrite` refuses an earlier date and a non-owner;
  - after a renewal, `eligibilityFor` passes that line and the renewal request reads submitted;
  - Finance can renew its own credential but not HR's.
- [ ] 4.2 1440 and 1280, light and dark, no console errors; the keyboard reaches every control.

## Data and derivation
- No new facts. Derived: `domain/gcc/company/*`.
- The done key `renewed:{credId}` (existing, first written here) lives in the tenant's `done`, so **Reset demo** clears it. Check that it does.

## Acceptance checks
- [ ] typecheck and build pass; `/dev/checks` passes in all five tenants.
- [ ] The loop of 3.1, with no console errors.
- [ ] As the CEO (read-only): the page opens with every action disabled and its reason. Under View as it is read-only.
- [ ] Reset demo returns the certificates to at risk.
- [ ] No hard-coded numbers in pages; no role checks outside `access.ts`.

## Execution report
(Filled in by the executor.)
- Changed files:
- Verification:
- Deviations from plan:
- Blockers / questions:
- Follow-ups noticed (not done):
