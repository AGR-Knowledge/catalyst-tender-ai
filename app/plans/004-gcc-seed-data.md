# 004 — GCC seed data

Status: DONE (2026-09-25) · Depends on: 002 (tenant keys, `Ccy`, calendar) · Can run in parallel with: 003, 005. **Parallel run:** read "Running wave 1 in parallel" in `app/plans/README.md` first.

## Goal
Each of the five GCC tenants has a believable company behind it, and the shared hero tender exists as structured data (dates, eligibility requirements, seeded flaws, BOQ and packages) with page references that match the generated PDF. When later plans derive KPIs from this data, they land on the numbers in gcc-demo-data §5.3.

Each company has:
- a credential vault with deliberate expiries;
- financials;
- a similar-projects register;
- JV partners;
- a tendering team and load;
- a bank guarantee facility;
- a fit model;
- sources;
- a live register;
- a year of decision and outcome history.

## Context
- **Why:**
  - gcc-demo-data.md, the whole document; this plan implements it;
  - s1-s3-demo-spec §6.5 (credential vault), §6.6 (fit), §11 (five tenants);
  - kpi-and-screen-catalogue §A (the KPIs this data must feed) and §F.
- **Current behaviour:** there is no GCC data. The Indian register (`src/data/tenders.ts`) and extraction records (`src/data/extracted/*`) are INR and India-specific. They stay untouched.
- **Real-document drafts** already exist locally (gitignored): `docs/08-sample-tenders/middle-east/extraction-drafts/`.
  - They are `wadi-zarqa.md`, `t887-jezzine.md` and `kuwait-cctld.md`, each with a `ts` record block.
  - `BRIEF.md` explains the conventions.
  - **Never use the file marked `CONFIDENTIAL-do-not-use` in that folder.**

## Scope
**Files to create:**
- `src/data/gcc/types.ts`
- `src/data/gcc/hero.ts`
- `src/data/gcc/tenants/najd.ts`, `corniche.ts`, `dafna.ts`, `batinah.ts`, `qurain.ts`
- `src/data/gcc/index.ts`
- `src/data/extracted/gcc/types-ar.ts` (the `ExtractedTenderAr` type from BRIEF.md)
- `src/data/extracted/gcc/wadi-zarqa.ts`, `cdr-jezzine.ts`, `kw-cctld.ts`
- `src/data/extracted/gcc/index.ts`
- `app/public/bids/me/wadi-zarqa-pq.pdf`, `app/public/bids/me/cdr-jezzine-lot3.pdf`, `app/public/bids/me/kw-citra-cctld-6-2024-2025.pdf`, copied from `docs/08-sample-tenders/middle-east/` (`RFP__Wadi_Zarqa.pdf`, `T887_1.pdf`, and the Arabic-named Kuwait PDF)
- `src/pages/gcc/dev-checks/30-seed.tsx` (dev-check panel; plan 002's slot)

**Do not change:**
- `src/data/extracted/index.ts` (the legacy `EXTRACTED` map; GCC records stay separate so legacy upload recognition is unaffected);
- any legacy data file;
- `GccPending.tsx`, `App.tsx`, the store, access and people (plans 002 and 003).

**Out of scope:**
- Derivations: eligibility results, fit scores, KPIs and verdicts are computed by plans 006 and 007, not stored.
- Suppliers, RFQs and quotes (plan 008 seeds them from gcc-demo-data §6).
- Pack inputs and competitors (plan 009, from §7 and §8).
- The scanned Arabic roads tender (plan 012 re-runs its extraction).
- Any UI beyond the dev-check panel.

## Steps

### Phase 1 — Types
- [x] 1.1 `src/data/gcc/types.ts` (import `Ccy` from `data/gcc/fx.ts`):
  - `Money { amount: number; ccy: Ccy }`: amounts in major units.
  - `Criterion = 'scope' | 'size' | 'eligibility' | 'geography' | 'client' | 'terms' | 'team' | 'facility' | 'strategy'`.
  - `FitModel { weights: Record<Criterion, number>; pursueAt: number; conditionsFrom: number; band: { min: Money; max: Money }; singleLimit: Money; dg2Referral: Money; safeDeliveryPct: number }`.
  - `CredentialKind = 'cr' | 'zakat' | 'gosi' | 'chamber' | 'classification' | 'contractors-authority' | 'engineers-council' | 'saudization' | 'vat' | 'iso' | 'lc-baseline' | 'bank-reference' | 'avl' | 'other'`.
  - `Credential { id; kind; label; number?; field?; grade?: number; issuer; validTo: string | null; ownerId: string; note? }`, where `ownerId` is a person id from plan 003's convention (`najd.fin`, `najd.hr`, `najd.hot` …).
  - `Financials { fy: number; turnover: Money; audited: boolean; auditDate?: string; netWorth?: Money; currentRatio?: number }`.
  - `SimilarProject { id; title; client; country; capacityM3d?: number; tertiary?: boolean; value: Money; completed: string; role: 'prime' | 'jv-lead' | 'jv-member' | 'subcontractor'; scope: string; om?: { from: string; to: string } }`.
  - `Partner { id; name; country; note; credentials: Credential[]; projects: SimilarProject[]; financials: Financials[] }`.
  - `Team { id; name; sector; engineers: number; estimators: number; planners: number; hoursPerWeek: number; commitments: { tenderId: string; hoursPerWeek: number; from: string; to: string }[] }`.
  - `Facility { limit: Money; utilised: Money; committed: { label: string; tenderId?: string; kind: 'bid bond' | 'performance' | 'advance'; amount: Money }[]; asOf: string; confirmedById: string }`.
  - `Source { id; name; kind: 'portal' | 'client-portal' | 'mailbox' | 'scan' | 'manual'; mode: 'api' | 'scheduled' | 'assisted'; state: 'healthy' | 'degraded' | 'credentials-expiring' | 'down'; note?: string; lastPoll: string }`.
  - `IntakeEvent { id; sourceId; tenderId?: string; ref: string; title: string; docType: 'Tender' | 'PQ' | 'Addendum' | 'Clarification' | 'Award notice'; language: 'EN' | 'AR' | 'EN+AR'; receivedAt: string; loggedAt?: string; disposition: 'shortlisted' | 'low-fit' | 'duplicate' | 'addendum' | 'restricted' | 'needs-validation' | 'notice-only' }`: times as `'2026-03-08T07:44'` (tenant local).
  - `KeyDateKind = 'published' | 'purchase' | 'participation' | 'site-visit' | 'pre-bid' | 'questions' | 'answers' | 'submission' | 'originals' | 'opening' | 'validity-end' | 'bond-validity-end'`; `KeyDate { kind; date: string; time?: string; place?: string; page?: number; note?: string }`.
  - `PqKind = CredentialKind | 'experience' | 'om' | 'turnover' | 'ratios' | 'personnel' | 'lc' | 'consortium'`.
  - `PqRequirement { id: string; text: string; kind: PqKind; page: number; validAt?: 'opening' | 'submission' | 'validity'; threshold?: { value?: number; unit?: string; count?: number; years?: number; grade?: number; field?: string }; jvRule?: string }`.
  - `ValidationItem { id; tenderId; field: string; value: string; alt?: { value: string; page: number }; page: number; confidence: number; reason: string; blocksDg1: boolean; raisedAt: string }`.
  - `FitInput { score: number /* 0–10 */; reason: string; source: string }`.
  - `GccStage = 'S1' | 'S2' | 'S3' | 'DG2' | 'later' | 'closed'` (DG1 is "S1 with no DG1 record", derived).
  - `GccTender { id; title; shortTitle; issuer; issuerIsReal: boolean; country: string; city: string; sector: string; sourceId: string; sourceDetail: string; procurement: 'open' | 'pq' | 'limited' | 'two-file'; value: { amount: number; ccy: Ccy; basis: 'published' | 'estimate' | 'not-stated'; band?: [number, number] }; stage: GccStage; stageNote: string; bidManagerId: string; invited: string[]; keyDates: KeyDate[]; docKey?: string; hero?: boolean; requirements?: PqRequirement[]; fit: Record<Criterion, FitInput>; validations: ValidationItem[]; intake: { capturedAt: string; purchasedAt?: string; loggedAt?: string }; dg1?: Dg1Record; restricted?: boolean }`.
  - `Dg1Record { tenderId; decision: 'pursue' | 'discard' | 'hold'; at: string; byId: string; recommendation: 'pursue' | 'conditions' | 'discard'; withinSla: boolean; reasonCodes: string[]; note?: string }`.
  - `Dg2History { tenderId; title; at: string; decision: 'bid' | 'no-bid'; withinSla: boolean; chairVsMajority: boolean; reopened?: string }`.
  - `BidOutcome { id; title; sector: string; clientType: 'government' | 'semi-government' | 'private'; value: Money; submitted: string; decided: string; result: 'won' | 'lost' | 'withdrawn'; lossReason?: 'price' | 'technical' | 'local-content' | 'pq' | 'other'; predictedWin?: number }`.
  - `TenantData { key; company: { hq: string; employees: number; fyEnd: string; financials: Financials[] }; fit: FitModel; credentials: Credential[]; projects: SimilarProject[]; partners: Partner[]; teams: Team[]; facility: Facility; sources: Source[]; reconciliation: { at: string; sources: number; missed: number }; intakeToday: IntakeEvent[]; register: GccTender[]; history: { outcomes: BidOutcome[]; dg1: Dg1Record[]; dg2: Dg2History[] } }`.

### Phase 2 — The hero tender (`src/data/gcc/hero.ts`)
Everything here follows **gcc-demo-data §4**. Pages must follow the **page map in §4.9**, because plan 005 generates the PDF to the same map.
- [x] 2.1 `HERO_ID = 'T-2026-118'`, `HERO_FILE = '/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf'` (plan 005 creates it), `HERO_ESTIMATE_BASIS` text.
- [x] 2.2 `HERO_EXTRACTED`: extends the legacy `ExtractedTender` shape (`data/extracted/types.ts`) with GCC groups. Define `ExtractedTenderGcc` in `types.ts` as `ExtractedTender & { groups: Record<'identity' | 'commercial' | 'guarantees' | 'time' | 'evaluation' | 'submission' | 'risk', ExtractField[]>; conflicts: ValidationItem[] }`.
  - `valueCr: null`; `currency: 'SAR'`; `valueDisplay: null` (not published).
  - `language: 'English'` with a flag "Arabic text prevails (§27, p. 9)".
  - Fill every group from gcc-demo-data §4.1–§4.4, with page refs from §4.9 and confidence `high` unless noted.
  - `flags` = the eight seeded flaws of §4.6, each with severity and page.
- [x] 2.3 `HERO_KEY_DATES: KeyDate[]`, exactly §4.2: published 08 Mar 07:15; participation 12 Mar; site visit 17 Mar 10:00; questions 18 Mar; answers 25 Mar; submission 10 May 10:00; originals 10 May before 10:00; opening 10 May 10:30; validity end 8 Aug; bond validity end ≥ 8 Aug. Pages: timetable p. 4; validity p. 10; guarantee p. 12.
- [x] 2.4 `HERO_REQUIREMENTS: PqRequirement[]`: PQ-01…PQ-16 exactly §4.5, with `validAt: 'opening'` on certificate kinds and thresholds as numbers:
  - PQ-09 `{ count: 2, value: 100000, unit: 'm3/day', years: 10 }` plus a tertiary note;
  - PQ-11 `{ value: 1_200_000_000, unit: 'SAR', years: 3 }` with `jvRule: 'lead ≥ 60% of threshold; members combined ≥ 100%'`;
  - PQ-05 `{ field: 'Water & sewage works', grade: 1 }` with `jvRule: 'Classification Law Art. 9: all members in field; one at grade; others ≤ 1 grade lower'`.
- [x] 2.5 `HERO_CONFLICTS`: the two validation items that block DG1, raised `2026-03-08T07:44`:
  - initial guarantee rate: value `2%` from p. 35, alt `1%` from p. 12, confidence 0.52, reason "Two rates stated: §41 and §77";
  - TSE pipeline length: `16 km` from p. 23, alt `18 km` from p. 47, confidence 0.61, reason "Scope and drawings list disagree".
- [x] 2.6 BOQ (§4.8), derived so the estimate *adds up*:
  - [x] 2.6.1 `HERO_BILLS`: 11 bills `{ no, title, lineCount }`. Line counts sum to **236**.
  - [x] 2.6.2 `HERO_LINES`: for each bill, 3–6 representative lines `{ item: '2.14', bill, description, unit, qty, rate: number /* SAR, estimate */ }`, plus **one** "Remaining items in bill N (k lines)" aggregate line. The bill total = Σ(qty × rate) of its lines and matches the §4.8 share of **SAR 480,000,000** to the nearest SAR 0.1 M. The grand total is **exactly 480,000,000** (adjust the aggregate lines).
  - [x] 2.6.3 `HERO_PACKAGES`: P-01…P-11 `{ id, title, bills: number[], lineItems: string[], kind: 'supply' | 'subcontract', longLeadWeeks?: number, mandatoryList?: boolean }` per §4.8 (P-02 32–40 weeks, P-03 about 30, P-06 36; P-10 `mandatoryList: true`).
  - (acceptance: the dev panel shows Σ bills = SAR 480.0 M and 236 lines.)

### Phase 3 — Tenant files (one per tenant)
Each file exports `const <KEY>: TenantData`. Figures come from gcc-demo-data §2 and §5. People ids use plan 003's convention (`<tenant>.<role>`, `<tenant>.member.<seat>`) as plain strings: do not import `people.ts`, which plan 003 is creating in parallel.
- [x] 3.1 **Najd** (`tenants/najd.ts`), the fullest:
  - [x] 3.1.1 Company, financials FY2022–FY2025 (FY2025 `audited: false`, `auditDate: '2026-04-15'`), fit model (§2.1 column), credentials (§2.2 table: Zakat `validTo: '2026-04-30'`, GOSI `'2026-05-07'`, owners `najd.fin`, `najd.hr` …), projects (Riyadh East 150k tertiary 2019 with O&M 2019–2024; Buraydah 120k 2022; Hail 60k 2021; plus 3–4 networks and roads jobs), partners (Rafid Process Engineering; Tihama Hydro Works, with the credentials, projects and financials given in §2.4), teams (Water tendering team as in §2.2).
    - Commitments must make **CAP-1** derive to **78%** for the next 4 weeks without the hero tender, and **96%** once a hero commitment of the size given in the file comment is added. Put the hero's estimated effort in a named constant `HERO_EFFORT_HOURS_PER_WEEK` so plan 007 can add it on Pursue.
  - [x] 3.1.2 Facility:
    - limit SAR 600 M; utilised SAR 410 M;
    - committed: bid bonds on three submitted bids totalling SAR 24 M, plus a performance bond reserved for an awarded contract awaiting signature, SAR 70 M;
    - asOf `'2026-03-05'`, confirmedById `najd.fin`.
    - (acceptance: headroom derives to **SAR 96.0 M**.)
  - [x] 3.1.3 Sources (§2.2 table; 9 counted by reconciliation); `reconciliation { at: '2026-03-08T06:00', sources: 9, missed: 0 }`.
  - [x] 3.1.4 `intakeToday`: **11 events** (Etimad 7, portals 1, email 2, scanned 1).
    - Receipt-to-logged minutes: 5, 6, 7, 7, 8, 8, 9, 10, 10, 11, 14. With the nearest-rank method, p90 = 11 and worst = 14.
    - The hero's event: received 07:33 (after booklet purchase) → logged 07:44.
    - T-2026-122 is `notice-only` (no loggedAt; not in the p90).
  - [x] 3.1.5 `register`: every row of gcc-demo-data §5.1, including T-2026-122:
    - Stages, stage notes, bid managers (`najd.bid` for all water bids).
    - `invited` on T-2026-101 and T-2026-097: `najd.comm`, `najd.plan`, `najd.comp`, `najd.dir`, `najd.fin`.
    - Key dates relative to demo today (T-2026-117 DG1 SLA end `2026-03-08T16:10`; T-2026-097 pack issued `2026-03-07T14:10`).
    - Values in SAR.
    - Hero row: `hero: true`, `docKey: 'ecws-al-rawdah'`, validations from `HERO_CONFLICTS`.
    - Other rows' validations make **INT-5 = 6 open, 2 blocking DG1, oldest raised 07:44**: T-2026-120 has 2 (non-blocking), T-2026-119 has 1, T-2026-104 has 1 (non-blocking).
  - [x] 3.1.6 Fit inputs (scores 0–10, each with a reason and source). The hero row uses exactly:

    | Criterion | Score |
    | --- | --- |
    | scope | 10 |
    | size | 9 |
    | eligibility | 8 |
    | geography | 9 |
    | client | 8 |
    | terms | 6 |
    | team | 6 |
    | facility | 8 |
    | strategy | 8 |

    This gives 82.4 → **82**. Other rows give fits close to §5.1 (T-2026-117 ≈ 74, T-2026-119 ≈ 41). Record each computed value in the Execution report.
  - [x] 3.1.7 History:
    - **Outcomes:** 33 records.
      - 9 won (Water 7, Roads 2), 24 lost (Water 14, Roads 10).
      - Loss reasons: price 13, technical 5, local-content 3, pq 1, other 2.
      - `predictedWin` bands: > 70: 3 bids, 2 won; 50–70: 7 bids, 4 won; 30–50: 10 bids, 3 won; < 30: 13 bids, 0 won.
      - Decided dates within 9 Mar 2025 – 7 Mar 2026.
    - **DG1:** 46 records in the 90 days before demo today.
      - 15 pursue, 29 discard, 2 hold.
      - 44 `withinSla`.
      - 4 where the decision ≠ recommendation (3 with the reason code "client relationship").
      - Discard reason codes: out-of-scope 11, below-value 6, pq-fail 5, insufficient-time 4, capacity 3.
    - **DG2:** 18 records in 12 months: 17 within SLA, 1 `chairVsMajority`, 2 `reopened` ("JV offer", "competitor withdrew").
    - Compact tuple arrays mapped to records are fine.
- [x] 3.2 **Corniche, Dafna, Batinah, Qurain** (§2.3–§2.6, §5.2): the same shape, smaller.
  - [x] 3.2.1 Each has the hero row (`T-2026-118`, same `docKey`, the tenant's own `sourceDetail` and intake times) plus the S1, S2 and S3 rows in §5.2, and the history counts in §5.2 (outcomes only; 10–20 DG1 records; 3–6 DG2 records).
  - [x] 3.2.2 **Hero fit scores, exactly** (they produce the §4.7 targets):

    | Criterion | Corniche | Dafna | Batinah | Qurain |
    | --- | --- | --- | --- | --- |
    | scope | 5 | 9 | 4 | 10 |
    | size | 8 | 7 | 3 | 9 |
    | eligibility | 2 | 5 | 2 | 10 |
    | geography | 5 | 8 | 3 | 8 |
    | client | 6 | 7 | 4 | 9 |
    | terms | 6 | 6 | 7 | 8 |
    | team | 9 | 7 | 9 | 4 |
    | facility | 7 | 7 | 5 | 3 |
    | strategy | 10 | 9 | 5 | 10 |
    | **Weighted** | **63** | **71** | **38** | **78** |
  - [x] 3.2.3 Credentials so that the §4.7 table results can be derived:
    - Corniche: no KSA credentials at all; UAE ones only.
    - Dafna: KSA branch credentials with classification Grade 2; one STP of 110k; turnover QAR figures converting to about SAR 845 M; partner Tihama (KSA Grade 1, STPs 180k tertiary and 120k, O&M 4 years, turnover SAR 1.10 bn).
    - Batinah: Omani only.
    - Qurain: the KSA subsidiary's full set, all valid past 10 May.
  - [x] 3.2.4 Qurain facility in KWD: limit 28 M, utilised 22.8 M, committed 2.1 M (two Kuwait bid bonds) → headroom **KWD 3.1 M**. Team commitments put April load at **118%**.
- [x] 3.3 `src/data/gcc/index.ts`: `GCC_DATA: Record<'najd' | 'corniche' | 'dafna' | 'batinah' | 'qurain', TenantData>` and `gccData(key)`, which throws a clear error for non-GCC keys.

### Phase 4 — Real-document records
- [x] 4.1 Copy the `ts` record blocks from the local drafts into `src/data/extracted/gcc/`:
  - `wadi-zarqa.ts` (`WADI_ZARQA`);
  - `cdr-jezzine.ts` (`T887_JEZZINE`);
  - `kw-cctld.ts` (`KW_CCTLD`, typed `ExtractedTenderAr` from `types-ar.ts`).

  Fix import paths only. **Do not rewrite content.** If a record fails typecheck, fix the minimum and note it.
- [x] 4.2 Copy the three PDFs into `app/public/bids/me/` under the ASCII names in Scope (approved by the user on 2026-09-25: they are public tenders supplied by the client, like the Indian ones already in `public/bids/`). Never copy anything from the confidential sub-folder under `docs/08-sample-tenders/middle-east/` (see the local README there). Add `index.ts` exporting `GCC_EXTRACTED: Record<string, ExtractedTender | ExtractedTenderAr>`, keyed `wadi-zarqa`, `cdr-jezzine-lot3`, `kw-cctld`, with each record's `fileNames` including both the original and the ASCII file name (plan 007 matches uploads on either). **Done:** `index.ts` points at the ASCII paths; the orchestrator copied the three PDFs into `public/bids/me/` on 2026-09-25 after the executor's copy was refused by the permission check.
- [x] 4.3 Register rows referencing them: Najd T-2026-120 (Wadi Zarqa); Batinah (CDR Lebanon); Qurain (Kuwait ccTLD, and Wadi Zarqa). Mark `issuerIsReal: true`, keep their real dates in `keyDates`, and add `stageNote: 'Past-dated; use Treat as newly published'`.

### Phase 5 — Dev-check panel
- [x] 5.1 `src/pages/gcc/dev-checks/30-seed.tsx`, for the active tenant (read the key via plan 002's `useTenantKey()`). It shows raw derived numbers, **computed here from data** (a throwaway check, not the real KPI code):
  - register count by stage;
  - hero weighted fit (Σ weight × score ÷ 10, rounded);
  - facility headroom;
  - intake p90 and worst;
  - open validations, and how many block DG1;
  - credentials expiring before the hero opening date;
  - outcomes won and lost, and hit rate;
  - DG1 on-time share;
  - for Najd: BOQ total and line count.

## Data and derivation
- All new facts are under `src/data/gcc/**` and `src/data/extracted/gcc/**`. Nothing is derived in data files except simple constants.
- No store or `done` changes.
- The dev-check panel does throwaway arithmetic. Real derivations arrive in plans 006 and 007 (`domain/gcc/**`).

## Acceptance checks
- [x] typecheck and build pass. The legacy Indian demo is unchanged (the legacy `EXTRACTED` map is untouched).
- [x] On Najd, the seed panel shows:
  - hero fit **82**;
  - headroom **SAR 96.0 M**;
  - intake p90 **11 min**, worst 14;
  - validations **6** (2 blocking);
  - credentials expiring before 10 May: **Zakat, GOSI**;
  - hit rate **27% (9 of 33)**;
  - DG1 on time **44 of 46**;
  - BOQ **SAR 480.0 M, 236 lines**.
- [x] Corniche **63**, Dafna **71**, Batinah **38**, Qurain **78**. Qurain headroom **KWD 3.1 M**.
- [x] Hero page refs match gcc-demo-data §4.9. Spot-check against plan 005's PDF if it has landed (guarantee 1% on p. 12 and 2% on p. 35; 16 km on p. 23; 18 km on p. 47). Otherwise note "PDF not yet available".
- [x] No real company other than issuers of the real documents appears. No names beyond gcc-demo-data §2.7. No content from the file marked confidential.

## Execution report
Executor, 2026-09-25. Ran alongside plans 003 and 005 in the same checkout. I touched no file owned by another plan.

- **Changed files (all new):**
  - `src/data/gcc/types.ts`, `hero.ts`, `index.ts`;
  - `tenants/najd.ts`, `corniche.ts`, `dafna.ts`, `batinah.ts`, `qurain.ts`;
  - `partners.ts`: Tihama Hydro Works, shared by Najd and Dafna;
  - `build.ts`: tuple → record helpers `fit()`, `dg1Records()`, `dg2Records()`, `outcomes()`, which reshape literals only;
  - `src/data/extracted/gcc/types-ar.ts`, `wadi-zarqa.ts`, `cdr-jezzine.ts`, `kw-cctld.ts`, `index.ts`;
  - `src/pages/gcc/dev-checks/30-seed.tsx`;
  - `plans/README.md`: my status row only.
- **Verification:**
  - `npm --prefix app run typecheck` and `npm --prefix app run build` pass. The only build output is the existing chunk-size warning.
  - The seed panel was checked in Chromium (Playwright) on all five GCC tenants, with **0 console errors** on each. Every acceptance target is met:
    - **Najd:** hero fit **82** (82.4) · headroom **SAR 96.0 M** · intake p90 **11 min**, worst **14** · validations **6 (2 blocking)**, oldest 07:44 · expiring before 10 May: **Zakat, GOSI** · hit rate **27% (9 of 33)** · DG1 on time **44 of 46** · BOQ **SAR 480.0 M, 236 lines** · CAP-1 **78%** for the next 4 weeks, **96%** with `HERO_EFFORT_HOURS_PER_WEEK` (65 h) added · DG1 due 2, first SLA in 6 h 10 m · sources healthy 8 of 9 (Etimad credentials expiring).
    - **Corniche 63 · Dafna 71 · Batinah 38 · Qurain 78.** Qurain: headroom **KWD 3.1 M**, water team **118%** in April. Corniche and Dafna team loads are 64% and 72% (gcc-demo-data §5.3). Hit rates match §5.2: Corniche 27% (6 of 22), Dafna 28% (5 of 18), Batinah 32% (8 of 25), Qurain 27% (8 of 30).
    - Hero certificate lines, a throwaway check in the panel: Najd 7 pass · 2 at risk; Dafna 8 pass · 1 fail (Grade 2, which Tihama covers); Qurain 9 pass; Corniche and Batinah 1 pass · 8 fail.
  - Legacy: `gen-in` loads (Bid Cockpit) with 0 console errors, and the GCC seed panel does not appear on it. `src/data/extracted/index.ts` is unchanged. GCC data imports only `data/extracted/types` (types) and `CountryCode` from `data/tenants`, never Indian data modules.
  - **Spot-check against plan 005's PDF** (48 pages, `pdftotext` per page): guarantee 1% p. 12 and 2% p. 35; 16 km p. 23 and 18 km p. 47; timetable p. 4; validity p. 10.
    - Every other page reference in `HERO_EXTRACTED`, `HERO_REQUIREMENTS`, scope, clauses and flags was matched to its page text.
    - The BOQ items, units, quantities and descriptions match `public/bids/gcc/ECWS-PRJ-2026-0147-BOQ.csv` exactly: 63 of 63 lines.
  - **Computed fits** (Σ weight × score ÷ 10, unrounded):
    - **Najd:** 118 82.4 · 117 74.3 · 119 41.4 · 120 58.2 · 121 72.4 · 122 66.4 · 123 47.9 · 124 39.0 · 125 46.9 · 126 35.0 · 127 47.9 · 128 48.2 · 112 47.4 · 109 76.9 · 104 79.4 · 101 78.9 · 097 80.4 · 088 75.4 · 079 80.4 · 2025-412 69.9 · 2025-438 80.9.
    - **Corniche:** 118 63.0 · 061 71.5 · 063 44.0 · 044 78.0 · 029 75.5.
    - **Dafna:** 118 71.0 · 033 75.5 · 034 65.5 · 019 79.0 · 012 74.0 · 015 77.5.
    - **Batinah:** 118 38.0 · 041 44.5 · 042 87.0 · 027 85.0.
    - **Qurain:** 118 78.0 · 071 39.0 · 072 54.0 · 058 71.5 · 062 71.0 · 049 71.0.
  - Confidentiality sweep:
    - no real company except the issuers of the three real documents;
    - people appear only as ids;
    - the hero contact is a role title with an `.example` address;
    - nothing from the confidential file or folder under `docs/08-sample-tenders/middle-east/`;
    - no prices, rates or internal costs, apart from the booklet's own wording and the synthetic BOQ estimate rates.
- **Deviations from plan:**
  1. **Extra optional type fields**, all needed to derive the §4.7 and §5.3 results without typing numbers:
     - `CRITERIA` array;
     - `Credential.score` (LC baseline), `.country` and `.holder` (Qurain's KSA subsidiary);
     - `SimilarProject.holder`;
     - `PqRequirement.country`, `.alsoOn` and `.note`;
     - `IntakeDisposition`, and `GccTender.intake.disposition` (so "DG1 due" counts only shortlisted S1 rows);
     - `GccTender.documentFee` and `.packIssuedAt`;
     - `Dg1Record.title`;
     - `GroupEntity` / `company.entities` (Qurain Meridian Arabia Co., SAR financials);
     - BOQ types `BoqBill`, `BoqLine` (with `lines`, the number of booklet lines a row stands for) and `BoqPackage` (with `note`).
     - A comment on `Dg1Record` fixes the override rule for plan 007: Pursue on a Discard recommendation, or Discard on a Pursue one. Hold is never an override.
  2. **Extra files:** `partners.ts` and `build.ts`, described under "Changed files".
  3. **Extra register rows:**
     - Najd T-2026-121 (restricted), T-2026-123…128 (low-fit S1 rows that make the intake count and dispositions add up), and T-2025-412/438 (submitted bids carrying the bid bonds);
     - Dafna T-2026-012/015 (submitted bids carrying its bid bonds).
     - Intake times of older rows were set so each on-time DG1 decision falls within 24 h of logging.
  4. **Intake:** 11 new events plus Addendum 2 to T-2026-097 (09:12 → 09:22, 10 min). p90 is 11 with or without it.
  5. **Hero flags:** the 8 §4.6 flaws plus the "Arabic text prevails (§27, p. 9)" language flag, making 9 flags.
  6. **Aligned to plan 005's booklet**, which is the published document:
     - BOQ bill titles, line counts (18, 52, 34, 14, 15, 9, 30, 20, 22, 14, 8), items, units and quantities come from `scripts/hero-itt/content.mjs`, and my estimated rates are kept;
     - `HERO_NOT_COVERED` is `8.13` (SAR 9.6 M, the SCADA link to the central control centre);
     - contract basis and duration cite p. 3 (§2.3), with duration also on p. 28 (§65.3); pricing cites §37 on p. 11; national preference cites p. 15; live-plant works cite §64.11 on p. 26;
     - scope lines follow pp. 20–30;
     - the contact is the "Tenders and Contracts Manager" per §7 and §8;
     - the parent entity is "Not stated in this document" (low confidence), because the booklet does not name one;
     - PQ-08 reads "Tax registration …", because the booklet never uses the word VAT. A note maps it to VAT registration.
  7. **Batinah's hero row** is `low-fit` by email. Its own real record is CDR Jezzine. The scanned Arabic roads tender is left to plan 012, as Scope says.
  8. **Corniche and Batinah show "Documents to buy: 1"** (the hero booklet, SAR 5,000, not purchased). This is realistic: the booklet must be bought to bid.
- **Blockers / questions:**
  - **The three real PDFs are not copied** (step 4.2). The file copy was refused by the tool permission check, and I did not work around it. `GCC_DOC_FILES` already points at the target paths. Please run:
    ```bash
    mkdir -p app/public/bids/me
    cp docs/08-sample-tenders/middle-east/RFP__Wadi_Zarqa.pdf app/public/bids/me/wadi-zarqa-pq.pdf
    cp docs/08-sample-tenders/middle-east/T887_1.pdf app/public/bids/me/cdr-jezzine-lot3.pdf
    cp "docs/08-sample-tenders/middle-east/كراسة المناقصة العامة رقم 06-2024-2025 نسخة الاطلاع v1.0.pdf" app/public/bids/me/kw-citra-cctld-6-2024-2025.pdf
    ```
- **Follow-ups noticed (not done):**
  - **gcc-demo-data §4.8 roll-up does not match its own package table.** The roll-up says self 54 / supply 20 / subcontract 24 / not covered 2. Classifying the packages as the table does gives about self 46.6 / supply 35.4 / subcontract 16 / not covered 2 (% of SAR 480 M). Plan 008 or the orchestrator should decide which one is right before the Stage 2 screens show it.
  - `src/data/tenants.ts` (plan 002) lists 7 Najd sources; the seed has the 9 that §2.2 and the reconciliation count use.
  - Plan 007 should add `HERO_EFFORT_HOURS_PER_WEEK` over `HERO_EFFORT_WINDOW` (8 Mar–10 May) to the water team on Pursue; the seed panel already shows 78% → 96%.
  - `docs/07-product-design/agr-product-definition/gcc-demo-data.md` §4.9 could be updated with the page refs above (p. 3 contract basis, p. 11 §37, p. 15 preference, p. 26 live plant) so the doc and the booklet agree.
