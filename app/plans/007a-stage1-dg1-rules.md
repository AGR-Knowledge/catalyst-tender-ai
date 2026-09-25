# 007a — Stage 1 and DG1: rules, records and checks (no screens)

Status: DONE — awaiting review (2026-09-26) · Depends on: 004 (DONE) · Can run in parallel with: 006, 017, 008a, 009a. **Parallel run:** read "Running wave 1 in parallel" in `app/plans/README.md` first; the same rules apply.

## Goal
Everything the Stage 1 and DG1 screens will show is computed correctly before any screen exists. That covers:
- the PQ check against each company's credential vault, with the JV scenario;
- the fit score with the PQ-fail cap;
- key dates with GCC calendar flags;
- the validation queue with the conflict pattern;
- the intake pipeline and radar;
- addenda;
- same-day triage;
- queries to the employer;
- the DG1 evidence pack and decision rules.

The hero tender gives its five different answers in a dev check, with the exact wording a prospect will read. Plan 007b later builds the screens on top of these functions and adds nothing to the logic.

## Context
- **Why:**
  - s1-s3-demo-spec §6 (all of it) and §7 (DG1);
  - gcc-demo-data §4.2–§4.7 (hero dates, terms, PQ lines, flaws, expected results) and §5.1, §5.3 (Najd register and target readings);
  - product-foundation rules 4 and 8: one record, many lenses; the agents recommend and people decide.
- **What exists (plan 004, DONE):**
  - `src/data/gcc/types.ts`: `TenantData`, `Credential`, `SimilarProject`, `Partner`, `Financials`, `Team`, `Facility`, `Source`, `IntakeEvent`, `KeyDate`, `PqRequirement`, `ValidationItem`, `FitInput`, `GccTender`, `Dg1Record`.
  - `src/data/gcc/hero.ts`: `HERO_REQUIREMENTS` (PQ-01 … PQ-16), `HERO_KEY_DATES`, `heroConflicts()` (VAL-118-1 guarantee 1% vs 2%, VAL-118-2 pipeline 16 vs 18 km, both `blocksDg1`), `HERO_EXTRACTED` (field groups with page and confidence), `HERO_ESTIMATE`, `HERO_BOOKLET_FEE`.
  - `src/data/gcc/tenants/*.ts`: vaults, projects, partners (Dafna's `TIHAMA` is in `src/data/gcc/partners.ts`), teams, facility, sources, `intakeToday`, register (each row has stored `fit` inputs, 0–10 with reason and source), history. Najd exports `HERO_EFFORT_HOURS_PER_WEEK` and `HERO_EFFORT_WINDOW`.
  - `gccData(key)` in `src/data/gcc/index.ts`.
- **Throwaway arithmetic to replace:**
  - `src/pages/gcc/dev-checks/30-seed.tsx` has a certificate-only check and a weighted-fit sum. They are 004's scaffolding.
  - Don't edit that file. Your engine must agree with it where they overlap: Najd hero fit 82, and certificates 2 at risk.
- **Helpers to use:**
  - `src/domain/calendar.ts`: `DEMO_TODAY`, `DEMO_TIME`, `addDays`, `calendarDaysBetween`, `workingDaysBetween(from, to, cc)`, `isWorkingDay`, `dayFlags(iso, cc)` (weekend, Ramadan hours, expected closure), `dateText`, `whenText`, `countdownText`.
  - `src/domain/money.ts`: `money(amount, ccy, opts)`, `convert(amount, from, to)`, `moneyPair()`, `rateNote()`.
  - `src/data/people.ts`: `peopleOf(tenant)`, `personById(id)`; roles `coord`, `bid`, `hot`, `proc`, `plan`, `comm`, `comp`, `dir`, `fin`, `hr`.
- **Demo state:**
  - `mark(key, msg?, tone?, value = 'yes')` stores a string per key in the tenant's `done` (store.tsx ~383). `logAudit({ actorId, action, target?, detail? })` stamps the time itself.
  - This plan only **reads** `done` (a `Record<string, string>`) in pure functions, and **builds** the key/value pairs and audit drafts that 007b's screens will write.
- **Other plans running now:**
  - 006: shell, sidebar, dashboard kit, `can()` changes.
  - 017: lifecycles; it edits `data/gcc/types.ts`, `tenants/*.ts`, `data/gcc/index.ts`.
  - 008a: Stage 2 rules.
  - 009a: Stage 3 and DG2 rules; it imports two things from you, see "Exports other plans rely on".

## Scope
**Files to create (you own these folders):**
- `src/data/gcc/s1/types.ts`, `queries.ts`, `addenda.ts`, `personnel.ts`, `effort.ts`, `prep.ts`, `index.ts`
- `src/domain/gcc/s1/done.ts`, `eligibility.ts`, `fit.ts`, `bond.ts`, `dates.ts`, `validation.ts`, `intake.ts`, `addenda.ts`, `triage.ts`, `queries.ts`, `index.ts`
- `src/domain/gcc/dg1/record.ts`, `pack.ts`, `decision.ts`, `index.ts`
- `src/pages/gcc/dev-checks/70-stage1.tsx`

**Do not change:**
- anything in `src/data/gcc/*.ts` or `src/data/gcc/tenants/*.ts` (004's data; 017 is editing some of it now);
- `src/data/extracted/**`, `30-seed.tsx`;
- any file plan 006 owns (App, Sidebar, access, people, `components/**`, `domain/gcc/{viewmodels,port,period}.ts`, registries);
- the store.

If a fact you need is missing from 004's data, add it in `src/data/gcc/s1/` keyed by tenant and tender ID. **Never** add it by editing a tenant file.

**Out of scope:**
- Screens, routes, sidebar entries, KPI registry files (`*.kpi.ts`). Those are 007b and 013.
- Stage 2 (008a), Stage 3 and DG2 (009a).
- The Arabic records beyond what they already carry (plan 012).
- Presenter controls (014).
- Replacing 017's interim `s1` step facts. 007b does that, with an agreement check.

## Exports other plans rely on
Keep these names and shapes stable; 009a imports them.
- `eligibilityFor(tenant: string, tenderId: string, done: Done, scenario?: JvScenario): EligibilityResult | null`, from `domain/gcc/s1`. It returns null when the tender has no `requirements`.
- `addendaFor(tenant: string, tenderId: string): AddendumVM[]`, from `domain/gcc/s1`. It covers received addenda, their diff and their effects.
- `type Done = Record<string, string>`.
- **Build order:** Phase 1 and the eligibility and addenda functions first (Phases 2 and 5), so 009a can import them early.

## Done-key conventions (shared with 008a, 009a, 007b)
Values are JSON strings unless noted. Read them with `readDone<T>(done, key)` from `domain/gcc/s1/done.ts`: `JSON.parse` in a try/catch, where a bad or missing value gives `null`. Every value carries `at` (`${DEMO_TODAY}T${DEMO_TIME}` unless a function is given another time) and `byId`.

| Key | Value | Written by (screen, later) |
| --- | --- | --- |
| `val:{validationId}` | `{ action: 'accept' \| 'correct' \| 'not-stated' \| 'pick' \| 'send-back'; value?: string; pick?: 'value' \| 'alt'; hint?: string; at; byId }` | Intake queue |
| `query:{queryId}` | `{ state: 'approved' \| 'sent'; text?: string; at; byId }` | Queries tab |
| `renewed:{credentialId}` | `{ validTo: string; at; byId }` | Company vault (010) or presenter (014) |
| `renewal-requested:{credentialId}` | `'yes'` (plan 015's key; read only here) | Dashboards (015), eligibility line |
| `nudged:{target}` | `'yes'` (plan 015's pattern) | DG1 pack, validation lock |
| `dg1:{TID}` | `Dg1Decision` (pursue or discard only; see Phase 9) | DG1 form |
| `dg1-hold:{TID}` | `{ request: { toId; what; due }; at; byId }` | DG1 form |
| `dg1-reopen:{TID}` | `{ reason: string; at; byId }` | DG1 record |

## Steps

### Phase 1 — Types and small helpers
- [x] 1.1 `src/domain/gcc/s1/done.ts`:
  - `type Done = Record<string, string>`;
  - `readDone<T>(done, key): T | null`;
  - `nowIso()`, returning `${DEMO_TODAY}T${DEMO_TIME}`;
  - `type AuditDraft = { action: string; target?: string; detail?: string }`: what 007b passes to `logAudit` with the actor.
- [x] 1.2 `src/data/gcc/s1/types.ts`. It holds only facts 004 doesn't have:
  - `QueryDraft { id; tenderId; tenants: GccTenantKey[] | '*'; topic: string; clause: string; page: number; alsoPage?: number; text: string; source: 'extraction' | 'eligibility' | 'validation'; relatesTo?: string /* PQ id, validation id or field label */ }`.
  - `AddendumChange`, which is one of:
    - `{ kind: 'date'; field: KeyDateKind; from: string; to: string }`;
    - `{ kind: 'boq'; item: string; packageId?: string; from: string; to: string }`;
    - `{ kind: 'clause'; clause: string; page: number; from: string; to: string }`.
  - `Addendum { id; tenderId; tenant: GccTenantKey; no: number; ref: string; receivedAt: string; intakeEventId?: string; pages: number; summary: string; changes: AddendumChange[]; requote?: { packageId: string; title: string; suppliers: number }[] }`.
  - `KeyPerson { id; tenant; entity?: string; name: string; role: 'project-manager' | 'process-lead' | 'hse-manager' | 'commissioning-manager' | 'other'; years: number; sectorYears: number; saudiNational: boolean; availableFrom: string; committedTo?: string }`. Names are fictional.
  - `EffortEstimate { tenant; tenderId; teamId; hoursPerWeek; from; to; note }`.
  - `PrepTypical { tenant; procurement: GccTender['procurement']; sector: string; workingDays: number; n: number }`.
- [x] 1.3 `src/data/gcc/s1/index.ts`: `s1Data(tenant)` returns `{ queries, addenda, personnel, effort, prep }` filtered to that tenant (queries with `'*'` included).

### Phase 2 — Eligibility engine (spec §6.5)
- [x] 2.1 `src/data/gcc/s1/personnel.ts`: key people per tenant, enough to decide PQ-13 exactly as gcc-demo-data §4.7 says.
  - Najd, Dafna, Qurain (through its KSA subsidiary, `entity` = that subsidiary's id) pass all four roles.
  - Corniche and Batinah have no Saudi national HSE manager with 10 years.
  - 4–6 people per tenant, fictional names.
  - Give one Najd person (the Project Manager) a `committedTo` that ends before 10 May. Plan 010 and CAP-4 will use it later; it doesn't change PQ-13.
- [x] 2.2 `eligibility.ts`. One line per requirement: `EligibilityLine { reqId; text; page; alsoOn?; state: 'pass' | 'at-risk' | 'interpretation' | 'fail' | 'na'; why: string; evidence: { kind: 'credential' | 'project' | 'financials' | 'person' | 'partner'; id: string; label: string }[]; actions: ('request-renewal' | 'draft-query' | 'add-evidence' | 'find-partner')[]; checkedAgainst: { date: string; label: string } }`.
  - [x] 2.2.1 **Check date.**
    - `validAt: 'opening'` → the `opening` key date, else `submission`;
    - `'submission'` → submission;
    - `'validity'` → `validity-end`.
    - `checkedAgainst.label` reads "bid opening Sun 10 May".
  - [x] 2.2.2 **Certificates** (`cr`, `zakat`, `gosi`, `chamber`, `classification`, `contractors-authority`, `saudization`, `vat`, `iso`, `engineers-council`, `avl`). A credential matches on `kind`, `country` (when the requirement names one), `threshold.field` and `grade <= threshold.grade`.
    - A matched credential valid on the check date is **pass**.
    - One valid today but not on the check date is **at-risk**.
    - None, or expired today, is **fail**.
    - Apply `renewed:{credentialId}` from `done` before checking; its `validTo` replaces the vault's.
    - An at-risk `why` reads exactly like spec §6.5: "GOSI certificate expires Thu 7 May 2026, 3 days before bid opening (Sun 10 May). Renew before submission." Use `dateText` and calendar days.
    - When `renewal-requested:{id}` is set, append " Renewal requested."
    - Actions: `request-renewal`, and `add-evidence`.
  - [x] 2.2.3 **Holder entity.** A tenant whose `company.entities` includes a group entity bidding in its own name (Qurain's KSA subsidiary) is checked against credentials and projects whose `holder` is that entity. Choose it as the one whose `country` matches the requirement country. The line's `why` names the entity.
  - [x] 2.2.4 **Experience** (`experience`): count projects completed within `threshold.years` before the check date, each with `capacityM3d >= threshold.value`, role `prime` or `jv-lead`.
    - If the requirement note says "at least one with tertiary treatment" (PQ-09), require one `tertiary`.
    - **pass** when the count ≥ `threshold.count`, else **fail**.
    - The `why` lists the qualifying projects: "2 on record: Riyadh East STP (150,000 m³/day, tertiary, 2022), Buraydah STP (120,000 m³/day, 2019)".
    - A fail reads like spec §6.5 tenant C: "Two completed STPs ≥ 100,000 m³/day in 10 years: 1 on record (110,000 m³/day, 2020). JV partner needed."
  - [x] 2.2.5 **O&M** (`om`): a project with an `om` period of ≥ `threshold.years` on a plant ≥ `threshold.value`. Otherwise **fail**, with `find-partner`.
  - [x] 2.2.6 **Turnover** (`turnover`): the average of the last N audited financial years, converted to the requirement currency with `convert()`.
    - **Interpretation rule:** if the most recent financial year is audited after today but on or before the check date, compute two readings: the last N audited years, and the N years ending with that one.
      - Both pass → **interpretation**.
      - One passes → **interpretation**, with the `why` saying the result depends on the reading.
      - Neither passes → **fail**.
    - Najd's `why` must read: "'Average turnover of the last three financial years'. FY2025 accounts are due to be audited on 15 Apr, before opening. FY2022–FY2024 gives an average of SAR 1.41 bn; FY2023–FY2025 gives SAR 1.52 bn. Both pass the SAR 1.2 bn threshold. Suggested query to the employer drafted."
    - Actions: `draft-query`.
  - [x] 2.2.7 **Ratios** (`ratios`): the latest audited year has `netWorth > 0` and `currentRatio >= threshold.value`.
  - [x] 2.2.8 **Personnel** (`personnel`): parse nothing from the text. The four roles and their thresholds for PQ-13 are a constant in `eligibility.ts`, citing p. 40:
    - PM 20/10;
    - process 15;
    - HSE 10, Saudi national;
    - commissioning 12.

    Match them against `personnel` for the tenant (or its holder entity). Each missing role is named in the `why`.
  - [x] 2.2.9 **Local content** (`lc`): an `lc-baseline` credential with `score >= threshold.value` passes. The `why` adds: "A target LC% commitment must be stated in the bid (§51-4)".
  - [x] 2.2.10 **Consortium** (`consortium`):
    - Bidding alone → **na**, with "Applies only when bidding as a consortium".
    - In a JV scenario → **at-risk**, with "Consortium agreement to be certified by the Chamber of Commerce or a notary before {submission date}".
  - [x] 2.2.11 A requirement kind with no rule → **na**, with "Not assessed automatically: check by hand". None should occur for the hero; the dev check asserts that.
- [x] 2.3 **JV scenario** (`JvScenario { partnerId: string; lead: 'partner' | 'self'; shares: [number, number] }`). It re-runs every line with the partner's credentials, projects and financials added, applying the requirement's `jvRule`:
  - **Classification (Art. 9):** every member is classified in the field; at least one at the grade; the others at most one grade lower.
  - **Turnover:** the lead ≥ 60% of the threshold; members combined ≥ 100%. Dafna reads "Pass: lead Tihama Hydro Works Co. SAR 1.10 bn ≥ 60%; combined SAR 1.95 bn". Use the numbers the data gives and report them.
  - **Experience and O&M:** the members' projects together; the partner's count as the lead's when `lead: 'partner'`.
  - **Certificates:** each member must hold its own.
  - Each line's `why` says which member satisfies it: "Pass (partner): Tihama Hydro Works Co., 2 STPs ≥ 100,000 m³/day".
- [x] 2.4 **Roll-up** `EligibilityResult { lines; counts: { met; atRisk; interpretation; fail; na }; verdict: 'eligible' | 'eligible-with-jv' | 'not-eligible'; jvPartner?: { id; name }; text: string; renewBefore?: string }`.
  - `met` counts `pass` and `na` (na lines are satisfied; the line itself shows muted).
  - When bidding alone fails, try each partner in the tenant's `partners` with `lead: 'partner'`, shares `[60, 40]`. The first that clears every fail sets `eligible-with-jv`.
  - **Texts (exact):**
    - Najd: "13 met · 2 at risk · 1 interpretation · 0 fail → eligible; renew two certificates before 10 May".
    - Dafna: "fails 4 lines alone → eligible only with a JV partner (Tihama Hydro Works Co.)".
    - Not eligible: "fails {n} lines → not eligible".
- [x] 2.5 `eligibilityScore(result, seedResult): number` for the fit's `eligibility` criterion.
  - The formula `f(r)`:
    - no fail → `max(6, 10 − atRisk)`;
    - `eligible-with-jv` → 5;
    - otherwise → 2.
  - The score is the tender's stored `fit.eligibility.score + f(current) − f(seed)`, clamped to 0–10. `seed` is the result with an empty `done`.
  - At seed the stored scores stand (Najd 8, Corniche 2, Dafna 5, Batinah 2, Qurain 10). Renewing GOSI in Najd gives 9; renewing both gives 10.
- [x] 2.6 `eligibilityFor(tenant, tenderId, done, scenario?)` and `eligibilityRisks(tenant, done)`, the live S1–S3 tenders with any fail or at-risk line. Najd at seed: 3 (hero, T-2026-109, and one more; name it in the report). That matches gcc-demo-data §5.3 SCR-5.

### Phase 3 — Fit score and recommendation (spec §6.6)
- [x] 3.1 `fit.ts`:
  - [x] 3.1.1 `fitFor(tenant, tenderId, done)` returns `FitResult { weighted: number (1 dp); rows: { criterion; weight; score; reason; source; contribution }[]; verdict: 'pursue' | 'conditions' | 'discard'; verdictLabel; capped: null | 'pq-fail' | 'pq-fail-jv' | 'capacity'; confidence: 'high' | 'medium' | 'low'; confidenceWhy; strengths: string[]; concerns: string[]; wouldChange: string[]; comparables: ComparableVM[] }`.
  - [x] 3.1.2 Scores are the stored inputs, except `eligibility` for tenders with `requirements`, which is `eligibilityScore()`.
  - [x] 3.1.3 **Verdict:**
    - thresholds from `fit.pursueAt` and `fit.conditionsFrom`;
    - **PQ-fail cap:** `not-eligible` → discard; `eligible-with-jv` → at most conditions ("Pursue with conditions (JV needed)");
    - **Capacity rule:** a `pursue` becomes `conditions` when the team's peak calendar-month load between today and submission, with this tender's effort added, exceeds 100%. Use `triage.ts` (Phase 7), which shares the load function.
  - [x] 3.1.4 **Labels:** "Pursue", "Pursue with conditions", "Pursue with conditions (JV needed)", "Recommend discard". **Never** "Discard" on its own: the agent recommends, people decide.
  - [x] 3.1.5 **Confidence:**
    - `medium` while the tender has open validations that block DG1, with "2 fields still being validated";
    - `low` when the tender has no requirements extracted, or its value basis is `not-stated`;
    - else `high`.
  - [x] 3.1.6 **Strengths:** the three highest contributions with score ≥ 8. **Concerns:** the three lowest with score ≤ 6, plus every at-risk and fail eligibility line. Both use the stored reasons.
  - [x] 3.1.7 **What would change it**, one or more lines, derived:
    - PQ fails with no partner in the list → "Join a Grade 1 bidder as MEP subcontractor (inside the 30% subcontracting cap)" when the tenant's sector is MEP, else "A JV partner covering {fail kinds}";
    - capacity rule → "{Team} peaks at {n}% in {Month}: release a bid or add estimators";
    - facility headroom after the bid bond below the performance bond if won → "Finance to confirm the facility; headroom {x} against the {y} bid bond";
    - open blocking validations → "Resolve {n} fields in the intake queue".

    Corniche's first line must be the MEP one. Qurain's must include the capacity line and the facility figures from gcc-demo-data §4.7.
  - [x] 3.1.8 **Comparables:** up to three `history.outcomes` in the same sector, closest by value, each with `{ id; title; value (tenant ccy); result; lossReason?; decided }`.
- [x] 3.2 `recommendationFor(tenant, tenderId, done)` returns the recommendation-card view model:
  - `{ agent: 'Intake & Extraction'; recommendation: verdictLabel; confidence; reasons: top 3; wouldChange; sources: SourceRef[]; disclaimer: 'Recommendation, not a decision.' }`;
  - `SourceRef = { label: 'p. 38' | 'Credential: GOSI certificate' | 'Calc: fit model'; kind: 'page' | 'credential' | 'project' | 'calc'; page?: number; id?: string }`.

### Phase 4 — Bond and key dates (spec §6.7, §7 item 6)
- [x] 4.1 `bond.ts`: `bidBondFor(tenant, tenderId, done)` returns `{ rate: number | null; rateBasis: 'resolved' | 'higher-until-resolved' | 'stated'; amount: Money (tenant ccy); original?: Money; validTo: string; bankLeadDays: 5; headroom: Money; headroomAsOf: string; confirmedById: string; afterBid: Money; performanceIfWon?: Money }`.
  - **Hero:** the rate comes from VAL-118-1 (`pick` or `correct` in `done`). Until it's resolved, use the higher of the two values, with `rateBasis 'higher-until-resolved'`.
  - The performance bond is 5% (§57).
  - The facility figures come from `facility` (headroom = limit − utilised − Σ committed).
  - **Check:**
    - Najd: SAR 9,600,000 at 2%;
    - Qurain: SAR 9,600,000 converted to KWD, against headroom KWD 3.1 M, with a performance bond of about KWD 1.97 M.
- [x] 4.2 `dates.ts`: `keyDatesFor(tenant, tenderId)` returns rows `{ kind; label; date; time?; tz; place?; page?; daysLeft; workingDaysLeft; past: boolean; flags: { key; text }[] }`.
  - Working days and flags use the **authority's country** calendar (`CountryCode` from the tender's `country`), not the tenant's. The hero is KSA for every tenant.
  - Flags come from `dayFlags()` plus two derived rules.
  - **Hero, exact texts:**
    - "Site visit Tue 17 Mar falls during Ramadan reduced hours: authority office hours are shorter; confirm the slot";
    - "Answers to questions are due Wed 25 Mar, inside the expected Eid al-Fitr closure (dates depend on moon sighting): expect a delay";
    - "Initial guarantee must be valid at least 90 days from opening (to 8 Aug 2026): bank lead time 5 working days".
  - **Reminders:** `remindersFor(row)` gives 3 days and 1 day before, to the owner and the Bid Manager, then an escalation to the Head of Tendering 24 h before an unmet deadline. Return the planned times only; nothing is sent.
- [x] 4.3 `prepRatio(tenant, tenderId)` gives `{ workingDaysLeft; typical; n; ratio; tone }` from `data/gcc/s1/prep.ts` (SCR-8).
  - Seed values:
    - two-file water tenders: 28 working days (n 12);
    - open networks: 18 (n 9);
    - PQ-stage documents: 15 (n 6);
    - B–E: similar, in their sectors.
  - Tone: < 1.0 red; < 1.3 orange; else green.
  - Report the ratios for the Najd S1 tenders. The hero should be green in every tenant. If it isn't, report it; don't tune the data to force it.

### Phase 5 — Addenda and duplicates (spec §6.8)
- [x] 5.1 `src/data/gcc/s1/addenda.ts`: **T-2026-097, Addendum 2**, Najd.
  - ref `WCWS/PRJ/2026/0009, Addendum 2`; received `2026-03-08T09:12`; `intakeEventId: 'IN-0308-09'`; 3 pages.
  - Summary: "Changes the filter media and the treated-water main material; raises the delay damages cap".
  - Changes:
    - BOQ `3.07` in package `P-03` (Filtration): "Dual media, 1.2 m" → "Dual media with a 600 mm GAC capping layer";
    - BOQ `9.02` and `9.03` in `P-09` (Pipes and valves): "Ductile iron DN1200" → "GRP DN1200 PN16";
    - clause "58.2 Delay damages cap", p. 2: "10% of contract value" → "15% of contract value".
    - No date changes: the submission stays Sun 26 Apr 10:00. Say so in the diff.
  - `requote`: P-03 Filtration (3 suppliers), P-09 Pipes and valves (2 suppliers).
  - **These package IDs and titles are fixed:** 009a's staleness text uses them.
- [x] 5.2 `addenda.ts` (domain):
  - `addendaFor(tenant, tenderId)` returns `AddendumVM { ...Addendum; diff: { dates: …; boq: …; clauses: … }; effects: string[] }`. The effects read:
    - "Eligibility and fit re-checked: no change";
    - "Addendum 2 changes filter media in Package P-03 and pipe material in Package P-09: re-quote 5 suppliers";
    - "Bid / No-Bid pack marked stale since Sun 8 Mar 09:12".
  - `latestAddendumBadge(tenant, tenderId)` returns "Addendum 2 applied" or null.
- [x] 5.3 `registerMatch(tenant, ref, title)`, for upload and intake. It returns `{ kind: 'new' | 'duplicate' | 'addendum'; tenderId?; why }`:
  - exact `ref` match → duplicate;
  - a ref containing "Addendum" and matching a register ref prefix → addendum;
  - no fuzzy title merging: re-tenders are asked about, not merged (spec §6.8).

### Phase 6 — Intake: pipeline, radar, validation queue (spec §6.1–§6.3)
- [x] 6.1 `intake.ts`:
  - [x] 6.1.1 `pipelineFor(tenant, intakeEventId)`: the nine steps of spec §6.2, with times.
    - Step times fall between `receivedAt` and `loggedAt` at fixed fractions: 0, .08, .12, .18, (.30 OCR, only when the language is AR or the source is `scan`), .62, .74, .88, 1.0.
    - **Fields extracted:** the field count and the low-confidence count come from the extraction record when the event's tender has a `docKey` (hero: `HERO_EXTRACTED`; real documents: `GCC_EXTRACTED`), else omitted.
    - **Logged:** "Intake to logged {n} min" against the 15-minute target.
    - Notice-only events stop after step 1, with "Documents not yet bought".
  - [x] 6.1.2 `radarFor(tenant, viewerCleared: boolean)` returns:
    - connectors: each source with status, mode, last poll, new today, login needed (`mode !== 'api'`), and assisted-mode text "Assisted: an operator completes the portal login. The platform never solves CAPTCHAs.";
    - captures: every `intakeToday` event with time, source name, ref, title (masked as "Restricted tender" when restricted and not cleared), authority, country, value in tenant currency (with the original), due date, language, doc type, fit (weighted, when a register row exists), and a disposition label:
      - "Auto-shortlisted → DG1 queue";
      - "Low fit, flagged";
      - "Duplicate, merged into {TID}";
      - "Addendum, linked to {TID}";
      - "Restricted lane";
      - "Needs validation";
      - "Notice only: documents to buy".
    - reconciliation: "Last reconciliation 06:00. 0 missed across 9 sources." (from `reconciliation`);
    - restricted count.
  - [x] 6.1.3 `recogniseUpload(fileName)` returns `{ docKey; tenderId?: string } | null`. It matches `HERO_FILE_NAME` and every `fileNames` entry in `GCC_EXTRACTED`. The hero resolves to `T-2026-118` in every GCC tenant.
- [x] 6.2 `validation.ts`:
  - [x] 6.2.1 `queueFor(tenant, done)` returns open items grouped by tender, ordered with DG1 blockers first, then oldest.
    - Each item: `{ item; state: 'open' | 'sent-back' | 'resolved'; resolution?; ageText; conflict: boolean }`.
    - `send-back` keeps the item **open**, with state `sent-back` and the text "Sent back to the agent with a hint. It re-read pp. {page} and {alt.page} and still found two values: a person must choose." This fixes the old bug where send-back closed the item.
  - [x] 6.2.2 **Conflicts** (items with `alt`) offer `pick` (`value` or `alt`), `correct`, `not-stated` and `send-back`, but never `accept`. The agent refuses to choose.
    - Non-conflict items offer `accept`, `correct`, `not-stated` and `send-back`.
  - [x] 6.2.3 `validationAction(item, action, input, byId)` returns `{ key; value; audit: AuditDraft }`.
    - Example audit: "Resolved conflict: Initial guarantee rate = 2% (p. 35); 1% (p. 12) kept on record".
    - `correct` keeps the original value in the audit detail.
  - [x] 6.2.4 `blockingOpen(tenant, tenderId, done)` gives the count of open items with `blocksDg1`, with the coordinator's name for the lock text.
  - [x] 6.2.5 `queueStats(tenant, done)`: open, blocking, oldest age (INT-5's reading: Najd "6 · 2 block DG1 · oldest 2 h 16 m").

### Phase 7 — Same-day triage and capacity (spec §6.9)
- [x] 7.1 `src/data/gcc/s1/effort.ts`: bid-effort estimates for each S1 tender that is shortlisted or low fit and has no team commitment yet.
  - **Reuse** Najd's `HERO_EFFORT_*` for the Najd hero; import them, don't copy the numbers.
  - Qurain's hero: 60 h/week, 8 Mar–10 May, on `qurain-water`.
  - Give each other tenant's hero an estimate on its main team.
  - Najd T-2026-117: 40 h/week, 8 Mar–14 Apr, on `najd-networks`.
- [x] 7.2 `triage.ts`:
  - `teamLoad(team, from, to, extra[])`: the same arithmetic as 30-seed's `load`, moved here and exported.
  - `peakMonth(team, from, to, extra[])` returns `{ month: 'April'; pct }`.
  - `triageFor(tenant, done)`: rows for the tenders awaiting DG1 (and low-fit ones a person may still take), each with fit, value, effort, bid bond, and **cumulative** team load and facility use if all are pursued.
  - A flag sentence per team over 100%, worded as fact, never as a ranking: "Pursuing all {n} would use {pct}% of the {team}'s bid capacity in {Month}."
  - **Check:**
    - Najd water team 78% → 96% with the hero (next 4 weeks);
    - Qurain water team 118% in April before its hero effort, and higher with it;
    - report the exact figures.

### Phase 8 — Queries to the employer (spec §6.10)
- [x] 8.1 `src/data/gcc/s1/queries.ts`, for the hero (`tenants: '*'` unless noted). Each has its clause and page; write the text as a contractor would send it, polite and specific:
  1. VAT inclusion (§39, p. 11);
  2. initial guarantee rate, 1% (§41, p. 12) vs 2% (§77, p. 35), relates to VAL-118-1;
  3. the answer period's start date (§33, p. 10);
  4. the delay penalty cap left blank (§60, p. 19);
  5. the post-qualification annex reference (§24, p. 8);
  6. TSE pipeline length, 16 km (p. 23) vs 18 km (p. 47), relates to VAL-118-2;
  7. which three financial years count for PQ-11 (p. 39), Najd only;
  8. whether a consortium lead may rely on a member's O&M experience for PQ-10 (p. 38), Dafna only.
- [x] 8.2 `queries.ts` (domain): `queriesFor(tenant, tenderId, done)` returns drafts with state (draft, approved or sent, from `query:{id}`), plus a countdown to the `questions` key date in working days.
  - `queryAction(query, 'approve' | 'send', text, byId)` returns `{ key; value; audit }`.
  - "Sent" means "marked sent via the portal (demo)". Nothing leaves the app.

### Phase 9 — DG1: record, evidence pack, decision rules (spec §7)
- [x] 9.1 `dg1/record.ts`:
  - `dg1RecordFor(tenant, tenderId, done)` merges the register's `dg1`, `history.dg1` and `done` (`dg1:`, `dg1-hold:`, `dg1-reopen:`). The last one wins; a re-open clears the decision and keeps it in `previous`.
  - `dg1Queue(tenant, done)`: tenders in S1 with intake disposition `shortlisted` and no pursue/discard record. Held tenders stay in the queue with `held: true`: the SLA keeps running.
  - The SLA falls due at `loggedAt + 24 h`. `slaText` reads "6 h 10 m left" or "Overdue by 1 h 5 m".
  - **Check:** Najd at seed has 2, and the first falls due in 6 h 10 m (T-2026-117). The hero falls due Mon 9 Mar 07:44.
- [x] 9.2 `dg1/pack.ts`: `dg1PackFor(tenant, tenderId, done)` returns the eight parts of spec §7, in order:
  1. recommendation (Phase 3.2);
  2. at a glance (authority, value pair, type, key dates, `prepRatio`);
  3. eligibility roll-up with the fail, at-risk and interpretation lines expanded;
  4. fit breakdown (`collapsed: true`);
  5. capacity (team load in the submission window, and clashes with other pursuits);
  6. bond vs facility, with Finance's timestamp: "facility headroom SAR 96.0 M as of 05 Mar, confirmed by Finance". Take the date and person from `facility.asOf` and `confirmedById`;
  7. comparables;
  8. open validations and queries, with the lock.
  - `locked: { reason: '2 fields still being validated by {coordinator}'; nudge: { key: 'nudged:val-{TID}'; toId } } | null`.
- [x] 9.3 `dg1/decision.ts`:
  - [x] 9.3.1 `Dg1Decision`:
    ```ts
    {
      tenderId; decision: 'pursue' | 'discard'; at; byId; delegate: boolean; recommendation; verdictLabel;
      reasonCodes: string[]; note?: string;
      team?: { proc; plan; comm; comp; dir };
      strategy?: { kind: 'prime' | 'jv'; partnerId?; shares? };
      milestones?: { key; label; date }[];
      snapshot: { weighted; eligibilityText; bond; validationsOpen: 0 };
    }
    ```
  - [x] 9.3.2 `DISCARD_REASONS`: the codes and labels of spec §7:
    - Out of sector/scope;
    - Below value threshold;
    - Above single-contract/bond limit;
    - PQ fail (classification, turnover, experience, other), as four codes;
    - Insufficient time;
    - No capacity;
    - Unacceptable terms;
    - Client/payment risk;
    - Geography;
    - Strategic;
    - Other.

    Use code keys like 004's history (`out-of-scope`, `below-band`, `pq-fail`, `insufficient-time`, `capacity` …). Read 004's `DG1_HISTORY` so the keys match what the history already uses; list any mismatch in the report.
  - [x] 9.3.3 `validateDg1(input, pack)` returns `{ ok; errors: string[] }`:
    - locked → error;
    - discard with no reason code → error;
    - pursue against a "Recommend discard" → note required;
    - JV strategy → partner required.
  - [x] 9.3.4 `defaultTeam(tenant)` takes the people with roles `proc`, `plan`, `comm`, `comp`, `dir` from `peopleOf`.
  - [x] 9.3.5 `proposedMilestones(tenant, tenderId, pursuedAt)`, each labelled "proposed":
    - RFQs out: +24 h;
    - quotes due: RFQs + 10 working days;
    - pack issue: submission − 25 working days;
    - DG2: pack + 24 h;
    - DG3: submission − 5 working days;
    - submission.
  - [x] 9.3.6 `dg1Write(input, byId, pack)` returns `{ writes: { key; value }[]; audit: AuditDraft[]; effects: string[] }`.
    - Pursue effects: "Stage moves to Sourcing", "Team notified: {names}", and "RFQ clock started: all RFQs due by {at + 24 h}". The RFQ clock start is the decision time; 008a reads it from `dg1:{TID}.at`.
    - Discard: "Closed with reason: {labels}. Stays searchable; can be re-opened with a reason."
    - Hold: writes `dg1-hold:` with the request. The effect says "SLA keeps running: due {time}".
    - Re-open: `dg1Reopen(tenderId, reason, byId)`.
  - [x] 9.3.7 `stageOverlay(tenant, tenderId, done)` returns `{ stage: 'S2'; since } | { stage: 'closed'; since; reason } | null`. 007b plugs it into the data port later; this plan only exposes it.
- [x] 9.4 `src/domain/gcc/s1/index.ts` and `src/domain/gcc/dg1/index.ts` re-export the public functions and types named in this plan.

### Phase 10 — Dev check `70-stage1.tsx`
Model it on `30-seed.tsx`: a CardHead with "All n targets met", a table (target, got, result) and KV rows. It reads the active tenant, like 30-seed. Najd shows the full set.
- [x] 10.1 **Five answers** (hero; run it for every tenant by calling the functions for each key, whichever tenant is active):
  - [x] 10.1.1 Per tenant: the eligibility state of each PQ line group in gcc-demo-data §4.7 (Dafna both alone and in the JV scenario), the roll-up text, the weighted fit (82, 63, 71, 38, 78), the verdict label, `capped`, and the first "what would change it" line.
  - [x] 10.1.2 Expected verdicts:
    - Najd: Pursue;
    - Corniche: Recommend discard (pq-fail);
    - Dafna: Pursue with conditions (JV needed);
    - Batinah: Recommend discard;
    - Qurain: Pursue with conditions (capacity).
- [x] 10.2 **Najd, seed:**
  - eligibility risks 3;
  - hero bond SAR 9.6 M ("higher-until-resolved");
  - three key-date flags (exact texts);
  - DG1 queue 2, first due in 6 h 10 m;
  - queue stats "6 · 2 block DG1 · oldest 2 h 16 m";
  - radar: 11 new today, 8 of 9 healthy, reconciliation text;
  - hero pipeline: 9 steps, logged in 11 min;
  - T-2026-097's addendum effects (three lines);
  - triage figures;
  - queries: 7 for Najd, 7 for Dafna (6 shared + its own), 6 elsewhere.
- [x] 10.3 **Simulated flows** with an in-memory `done` (never write the real store):
  1. Pick 2% on VAL-118-1 and pick 16 km on VAL-118-2 → blocking open 0, pack unlocked, confidence high, bond basis "resolved".
  2. Renew GOSI to 2027-05-31 → PQ-03 pass, eligibility score 9, weighted fit 84.4. Renew Zakat too → 10, and 86.4.
  3. Send back VAL-118-1 → still open, state `sent-back`.
  4. Record Pursue on the hero as `najd.bid` → the record validates, the RFQ clock falls due Mon 9 Mar 10:00, `stageOverlay` → S2, and there are 6 milestones.
  5. Discard with no reason → error. Pursue on a "Recommend discard" with no note → error.
  6. Hold with a request to `qurain.fin` → still in the queue, `held: true`.
  7. Re-open the Najd hero after a Discard → back in the queue, with `previous` set.
- [x] 10.4 **Determinism:** calling every function twice gives equal JSON. There is no `Date.now()` or `Math.random()` anywhere in your folders; grep and report.

## Data and derivation
- **New facts** are all in `src/data/gcc/s1/`:
  - query drafts;
  - T-2026-097 Addendum 2;
  - key personnel;
  - effort estimates;
  - typical preparation times.
- **Derived** in `src/domain/gcc/s1/` and `src/domain/gcc/dg1/`: eligibility and its score, fit, verdict, recommendation, bond, key dates and flags, preparation ratio, pipeline, radar, queue, triage, queries, the DG1 queue, pack and record, and the stage overlay.
- **New `done` keys:** listed above. This plan writes none. Reset demo clears them because they live in the tenant's `done`.

## Acceptance checks
- [x] typecheck and build pass (parallel rules: a failure in another plan's files isn't yours; re-run, then note it).
- [x] `/dev/checks` (or the GCC home, if 006 hasn't moved it yet) shows the 70-stage1 panel with every target met, in Najd and in each other GCC tenant. There are no console errors.
- [x] The Indian tenant is unchanged: its home and dashboards load as before.
- [x] No page files are created. No number is typed into a panel except in its `EXPECT` table. No role checks.
- [x] Only the files listed in Scope are touched (`git status` in the report).

## Execution report
(Filled in by the executor, 2026-09-25.)

### Changed files
All new (`git status`: untracked). No other source file was touched.
- `src/data/gcc/s1/`: `types.ts`, `queries.ts`, `addenda.ts`, `personnel.ts`, `effort.ts`, `prep.ts`, `index.ts`, plus two extra files:
  - `measures.ts`: pipeline lengths and requirement scopes;
  - `bonds.ts`: bond rates and pages per tender.
- `src/domain/gcc/s1/`: `done.ts`, `eligibility.ts`, `fit.ts`, `bond.ts`, `dates.ts`, `validation.ts`, `intake.ts`, `addenda.ts`, `triage.ts`, `queries.ts`, `index.ts`, plus one extra, `common.ts` (lookups, country and calendar helpers, text formatting shared by the others).
- `src/domain/gcc/dg1/`: `record.ts`, `pack.ts`, `decision.ts`, `index.ts`.
- `src/pages/gcc/dev-checks/70-stage1.tsx`.
- `app/plans/README.md`: row 007a only (status).

### Verification
- **Typecheck:** no errors in 007a's files.
  - At the last run, `tsc -b` reported one error in another plan's file: `30-seed.tsx(121)`, `chairVsMajority` missing on `Dg2History`.
  - An earlier run also showed `domain/gcc/s2/kickoff.ts` (`RoleKey`) and, before that, `data/gcc/lifecycle/chain.ts`. Those had gone by the next run.
  - I did not touch any of these files.
- **Build:** `npm run build` stops at that same `tsc -b` error. `vite build` on its own (output to a scratch folder) bundles cleanly.
- **Browser** (headless Chromium, `/dev/checks`, each tenant from a fresh store). The 70-stage1 panel shows:

  | Tenant | Result |
  | --- | --- |
  | Najd | All 103 targets met |
  | Corniche | All 68 targets met |
  | Dafna | All 68 targets met |
  | Batinah | All 68 targets met |
  | Qurain | All 68 targets met |

  - There were no console errors in any tenant.
  - The 30-seed panel still reads "All n targets met" in every tenant.
  - **Re-run after 017's history migration.** On 25 Sep from 23:35, while 017 was moving the history into `historySeed` → lifecycles, `/dev/checks` briefly crashed in every panel (`history` undefined). Once `data/gcc/index.ts` compiled again (26 Sep, 00:06), I re-ran the whole browser pass, the `vite build` and the grep. The results were identical: the targets above all met, and no console errors.
- **Indian tenant:** `gen-in` opens on the Bid Cockpit as before, with no console errors.
- **Determinism:**
  - A dev-check row serialises fit, pack, triage, radar and queue for all five tenants twice, both at seed and after a simulated flow. The JSON is equal.
  - `grep -rn "Date.now\|Math.random\|new Date()"` over `data/gcc/s1`, `domain/gcc/s1`, `domain/gcc/dg1` and `70-stage1.tsx` finds nothing.
- **Readings the plan asked me to report:**
  - **Eligibility risks, Najd at seed:** T-2026-118 (hero), T-2026-119 and T-2026-109. The third one is T-2026-119.
  - **Triage, Najd:**
    - Water tendering team: 78% → 96% with the hero (next 4 weeks). If all are pursued: 120%, peaking at 121% in March.
    - Networks and roads team: 42% → 83% if all are pursued, peaking at 90% in March.
    - Flag: "Pursuing all five would use 121% of the Water tendering team's bid capacity in March."
  - **Triage, Qurain:**
    - Water team: 118% in April before the hero; 139% with the hero; 140% with all pursued.
    - Next 4 weeks: 88% → 117%.
  - **Preparation ratios, Najd S1:**

    | Tender | Ratio |
    | --- | --- |
    | T-2026-118 (hero) | 39 ÷ 28 = 1.39, green |
    | T-2026-117 | 21 ÷ 18 = 1.17, orange |
    | T-2026-119 | 29 ÷ 20 = 1.45, green |
    | T-2026-120 | no submission ahead |
    | T-2026-121 | 33 ÷ 18 = 1.83, green |
    | T-2026-122 | 19 ÷ 20 = 0.95, red |
    | T-2026-123 | 14 ÷ 20 = 0.70, red |
    | T-2026-124 | 9 ÷ 20 = 0.45, red |
    | T-2026-125 | 18 ÷ 20 = 0.90, red |
    | T-2026-126 | 11 ÷ 20 = 0.55, red |
    | T-2026-127 | 22 ÷ 16 = 1.38, green |
    | T-2026-128 | 8 ÷ 20 = 0.40, red |

    The hero is green in every tenant: Najd 1.39, Qurain 1.44 (27 working days, n 6), and the others likewise.
  - **Hero bond:** SAR 9,600,000 at 2%, "higher-until-resolved", in every tenant.
    - Converted: Corniche AED 9.4 M, Dafna QAR 9.3 M, Batinah OMR 984,320, Qurain KWD 785,920.
    - Qurain's headroom is KWD 3.1 M.

### Deviations from plan
1. **Data that disagrees with gcc-demo-data §4.7.** I followed the data and did not tune it. The dev check's targets are what the data gives.
   - **Qurain PQ-11 is `interpretation`, not Pass.** Qurain's FY2025 audit falls due 26 Apr, before opening (10 May), so the interpretation rule applies. Both readings pass.
   - **Corniche PQ-11 fails.** Its FY2023–FY2025 average is SAR 1.198 bn, just under the SAR 1.2 bn threshold. The latest-three-audited reading gives SAR 1.12 bn. §4.7 says "pass in AED terms", but with the fixed peg the data does not pass.
     - To stop rounding from hiding the gap, turnover text adds a third decimal whenever rounding to two would reach the threshold. Otherwise it would read "SAR 1.20 bn … below SAR 1.2 bn".
   - **Dafna's JV combined turnover is SAR 1.94 bn, not 1.95.** The lead is Tihama Hydro Works Co. at SAR 1.10 bn.
2. **The facility line in "What would change it" compares against performance + advance-payment guarantees if won, not the performance bond alone.** With the performance bond alone, the rule would not fire for Qurain, and §4.7 expects it there.
3. **Discard codes.**
   - I used `below-value`, not the plan's `below-band`, because that is the key 004's history uses (28 rows).
   - The history also uses a generic `pq-fail` (20 rows), `client-relationship` and `information-requested`. `reasonLabel()` maps these.
   - The four PQ sub-codes are new keys for new decisions.
4. **Hold is allowed while the pack is locked.** The lock blocks Pursue and Discard only: a hold is how the Head of Tendering asks for the missing fields.
5. **`capped` is set only when a rule changed the verdict.** Batinah is `null`: it scores 38, below the discard threshold, so it would be a discard anyway.
6. **Low-confidence count (pipeline):** only fields with confidence `low` count. For the hero that is 4 of 76 fields.
7. **Group ISO certificates** (no holder, no country) count for Qurain's KSA subsidiary, the entity bidding.
8. **Extra files, fields and parameters, all inside 007a's folders:**
   - `s1Data()` also returns `lengths`, `scopes` and `bonds`;
   - `BidBond.rateBasis` adds `'not-stated'`;
   - `KeyDateRow` carries `tenant` and `tenderId`, so `remindersFor(row)` needs no other input;
   - `recogniseUpload(fileName, tenant?)` takes an optional tenant;
   - `dg1Reopen(tenant, tenderId, reason, byId, done, at?)` takes the tenant and `done`, so it can record `previous`;
   - `Dg1ReopenValue.previous` is added;
   - `stageOverlay` has an extra `{ stage: 'S1'; since; reason }` for a re-opened tender;
   - `EligibilityResult` also carries `jv`, `asJv`, `entity` and `storedScore`, which `eligibilityScore(result, seedResult)` uses.
9. **Dev check:** the "This tenant" rows are info only. They are never matched against the name-keyed `EXPECT` table: the names "DG1 queue" and "Hero bid bond" repeat the Najd seed rows.

### Blockers / questions
None blocking. Three questions for review:
- **§4.7 against the data (deviation 1).** Should gcc-demo-data §4.7 be corrected to match the seed? If §4.7 is right, the seed needs changing, in 004's or 017's files, not mine. The two options:
  - update §4.7: Qurain PQ-11 "interpretation", Corniche PQ-11 "fail", Dafna combined turnover SAR 1.94 bn;
  - adjust the seed so the demo tells the §4.7 story.
- **The facility rule (deviation 2).** Is performance + advance payment the intended comparison?
- **Discard codes (deviation 3).** Keep `below-value`, or rename it across 004's history?

### Follow-ups noticed (not done)
- 007b: plug `stageOverlay` into the data port. It also needs to replace 017's interim `s1` step facts with an agreement check (out of scope here).
- 30-seed's `load()` still has its own copy of the capacity arithmetic. I did not edit 30-seed, so it could now import `teamLoad` from `domain/gcc/s1/triage.ts`.
- Six of the Najd S1 tenders show a red preparation ratio. That is realistic for tenders that are already late, but the demo script should expect it.
