# 008a — Stage 2 sourcing: supplier data, rules and checks (no screens)

Status: DONE — awaiting review (2026-09-26) · Depends on: 004 (DONE) · Can run in parallel with: 006, 017, 007a, 009a. **Phase 8 waits for 017 to be DONE.** **Parallel run:** read "Running wave 1 in parallel" in `app/plans/README.md` first; the same rules apply.

## Goal
Everything the Sourcing desk will show is computed correctly before any screen exists. That covers:
- each company's supplier master with screening;
- procurement packages and the coverage bar with the 30% subcontracting check;
- recommended shortlists with the screening guardrail;
- RFQ drafts that carry only each package's BOQ lines, and the 24-hour RFQ clock;
- tracking and reminders;
- quote levelling with every adjustment sourced;
- coverage, the best-fit mix, and supplier clarifications;
- the Supplier Portal view, which never shows another supplier's data.

Najd's live Stage 2 tenders reproduce the target readings in gcc-demo-data §5.3 exactly. Plan 008b later builds the screens and adds no logic.

## Context
- **Why:**
  - s1-s3-demo-spec §8 (all of it): the Stage 2 behaviour;
  - gcc-demo-data §4.8 (hero BOQ and packages; the roll-up was corrected 2026-09-25 to 49.7 / 32.3 / 16.0 / 2.0, derived), §5.1 (T-2026-104, T-2026-109), §5.3 (SRC readings) and §6 (supplier examples);
  - kpi-and-screen-catalogue §A.3 (SRC-1 … SRC-11) and §C.3 (Sourcing desk), §C.7 (Supplier Portal);
  - product-foundation rule 8: the agent proposes, the buyer confirms. The agent **never** issues a commitment or purchase order.
- **What exists (plan 004, DONE):**
  - `src/data/gcc/hero.ts`: `HERO_BILLS`, `HERO_LINES` (item, bill, description, unit, qty, rate, lines), `HERO_PACKAGES` (P-01 … P-11 with `lineItems`, `kind`, `longLeadWeeks`, `mandatoryList`, `note`), `HERO_NOT_COVERED` (`['8.13']`), `HERO_KEY_DATES`.
  - `src/data/gcc/tenants/najd.ts` register (register values; were 310/420 in the first draft):
    - T-2026-104 (Jubail industrial WWTP upgrade, SAR 175 M, S2, pursued 26 Feb, validation `VAL-104-1` on sludge dewatering capacity 120 vs 150 m³/h);
    - T-2026-109 (Tabuk water transmission, SAR 260 M, S2, pursued Wed 4 Mar 11:20).
  - The DG1 records are in `history.dg1` via `dg1Of()`.
  - **B–E Stage 2 tenders:** Corniche T-2026-044 (Dubai district cooling), Dafna T-2026-019 (Al Wakra sewer rehab), Batinah T-2026-027 (Muscat interchange), Qurain T-2026-058 and T-2026-062.
  - People: `najd.proc` (Procurement Lead), `najd.bid`, `najd.comm`. The supplier persona is `{tenant}.supplier`: Ahmed Saleh, Gulf Process Systems Co. (`src/data/people.ts`).
- **Plan 017's interim `s2` step facts,** which your records must reproduce and which 008b later replaces with your derivations:
  - T-2026-104: packages 11, covered 7; RFQs sent 33 of 33; overdue 4, escalated 2; answered on time 22 of 31 due so far (71%); to level 5; clarifications open 4, stale 0; not covered 3.1%.
  - T-2026-109: packages 9, covered 0; RFQs sent 27 of 27; due so far 0; clarifications open 2, stale 0; replies due Sun 15 Mar.
  - B–E: read their values from `src/data/gcc/lifecycle/live/<tenant>.ts` once 017 is DONE (Phase 8).
- **Helpers:**
  - `domain/money.ts`: `money`, `convert`, `rateOf`, `rateNote`. `FX_LABEL` is "Demo bid rate, 1 Mar 2026"; EUR and USD exist, KRW doesn't.
  - `domain/calendar.ts`: `workingDaysBetween`, `addDays`, `dateText`, `whenText`, `countdownText`.
- **Other plans running now:**
  - 006 (shell);
  - 017 (lifecycles; it edits `data/gcc/types.ts`, `tenants/*.ts`, `data/gcc/index.ts`);
  - 007a (Stage 1 rules; writes the DG1 record key `dg1:{TID}` that starts your RFQ clock);
  - 009a (Stage 3; owns internal inputs).

## Scope
**Files to create (you own these folders):**
- `src/data/gcc/s2/types.ts`, `benchmarks.ts`, `suppliers/najd.ts`, `suppliers/corniche.ts`, `suppliers/dafna.ts`, `suppliers/batinah.ts`, `suppliers/qurain.ts`, `tenders/najd.ts`, `tenders/others.ts`, `index.ts`
- `src/domain/gcc/s2/done.ts`, `packaging.ts`, `shortlist.ts`, `rfq.ts`, `tracking.ts`, `levelling.ts`, `coverage.ts`, `bestfit.ts`, `clarifications.ts`, `kickoff.ts`, `portal.ts`, `index.ts`
- `src/pages/gcc/dev-checks/80-stage2.tsx`

**Do not change:**
- `src/data/gcc/*.ts` or `tenants/*.ts` (004's data, which 017 is editing);
- `src/data/people.ts`;
- anything 006 owns (App, Sidebar, access, `components/**`, `domain/gcc/{viewmodels,port,period}.ts`, registries);
- the store;
- 007a's or 009a's folders.

**Out of scope:**
- Screens and routes (008b);
- KPI registry files (013 and 008b);
- internal input requests and answers (009a owns `input-req:` and `input-sub:`; you only list them in the kick-off checklist);
- Stage 3 packs;
- sending anything outside the app;
- purchase orders or commitments of any kind.

## Done-key conventions
Values are JSON, read with a local `readDone<T>(done, key)` in `domain/gcc/s2/done.ts` (a try/catch `JSON.parse`; missing or bad → `null`). Don't import 007a's helper: it may not exist yet. Every value carries `at` (default `2026-03-08T10:00`) and `byId`.

| Key | Value | Meaning |
| --- | --- | --- |
| `dg1:{TID}` | 007a's `Dg1Decision` (read only) | A pursue starts the RFQ clock at `at` |
| `pkg:{TID}` | `{ approved: true; splits?: …; merges?: …; at; byId }` | Packaging approved (split/merge optional) |
| `shortlist:{TID}:{pkgId}` | `{ supplierIds: string[]; overrides: { supplierId; action: 'add' \| 'remove'; reason }[]; at; byId }` | Shortlist approved |
| `rfq-sent:{TID}:{pkgId}` | `{ supplierIds: string[]; at; byId }` | RFQs dispatched |
| `lev:{quoteId}:{adjKey}` | `{ state: 'confirmed' \| 'rejected'; amount?: number; note?: string; at; byId }` | A levelling adjustment decided |
| `gap:{TID}:{pkgId}` | `{ reason: string; at; byId }` | Coverage gap accepted |
| `mix:{TID}` | `{ option: 'lowest-cost' \| 'balanced' \| 'lowest-risk'; overrides: { pkgId; supplierId; reason }[]; at; byId }` | Best-fit mix approved |
| `clar:{clarId}` | `{ answer: string; at; byId }` | Supplier clarification answered |
| `sq:{rfqId}` | `{ level: 'line' \| 'package'; amount: number; ccy; validityDays; leadTimeWeeks; deviations: string[]; exclusions: string[]; fileName: string; at; byId }` | Quote submitted in the Supplier Portal |
| `nudged:{target}` | `'yes'` (015's pattern) | Supplier or buyer nudged |

## Steps

### Phase 1 — Types and benchmarks
- [x] 1.1 `src/data/gcc/s2/types.ts`:
  - [x] 1.1.1 **`Supplier`:** `{ id; tenant; name; country; city; trades: string[]; avl: string[]; icv?: number; prequal: 'approved' | 'pending' | 'none'; screening: { sanctions: { state: 'clear' | 'match' | 'due'; checkedAt: string }; antiBribery: { state: 'clear' | 'flag' | 'due'; checkedAt: string } }; performance: { onTimePct: number; ncrs12m: number; quotes12m: number; awards12m: number }; load: 'low' | 'medium' | 'high'; response: { ratePct: number; avgDays: number }; national: boolean; contactPersonId?: string }`. The name is always fictional.
    - `avl` lists the client names whose approved-vendor list includes the supplier.
    - `national` means a national product (mandatory list and price preference).
  - [x] 1.1.2 **`TenderPackage`:** `{ id; tenderId; tenant; title; kind: 'supply' | 'subcontract'; value: Money; lineItems?: string[]; longLeadWeeks?: number; needByWeeks?: number; mandatoryList?: boolean; avlRequired?: boolean; lcRelevant?: boolean; note?: string }`. For the hero, build these from `HERO_PACKAGES` in code; don't copy them.
  - [x] 1.1.3 **`BoqSummaryLine`** (for non-hero tenders): `{ id; tenderId; title; value: Money; kind: 'self' | 'supply' | 'subcontract' | 'not-covered'; packageId?: string }`.
  - [x] 1.1.4 **`Rfq`:** `{ id; tenderId; packageId; supplierId; sentAt; replyBy: string; openedAt?; acknowledgedAt?; declined?: { at; reason }; quoteId?; repliedAt?; escalatedAt?; nudges: number }`.
  - [x] 1.1.5 **`Quote`:** `{ id; rfqId; supplierId; packageId; tenderId; receivedAt; level: 'line' | 'package'; amount: number; ccy: Ccy; vatInclusive: boolean; incoterm: 'DAP site' | 'EXW' | 'FCA' | 'CIF Dammam'; origin?: string; validityDays: number; leadTimeWeeks?: number; paymentAdvancePct?: number; exclusions: string[]; deviations: { text: string; nonCompliant: boolean }[]; page?: number; seededDecisions?: Record<string, 'confirmed' | 'rejected'> }`.
    - `seededDecisions` holds adjustments already decided before demo day, keyed by `adjKey`.
  - [x] 1.1.6 **`Clarification`:** `{ id; tenderId; packageId; supplierId; question; raisedAt; ownerId; due: string; answer?: { text; at; byId }; commercial: boolean }`.
  - [x] 1.1.7 **`AcceptedGap`:** `{ tenderId; packageId; reason; at; byId }`.
  - [x] 1.1.8 **`BestFitWeights`:** `{ price; technical; delivery; qhse; capacity; leadTime; icv }`, summing to 100.
- [x] 1.2 `benchmarks.ts`, each fact tagged `[V]`, `[L]` or `[A]` in a comment, as in gcc-demo-data §10:
  - VAT by country: SA 15, AE 5, OM 5, BH 10, QA 0 (none), KW 0 (none) [L].
  - GCC common customs duty on imported equipment: 5% [L].
  - Freight to site as a share of ex-works value: Europe 4%, Asia 3.5%, GCC 1% [A].
  - Allowances for common exclusions as a share of the package value: installation supervision 2.5%, commissioning spares 1.5%, factory tests witnessed 0.5% [A].
  - RFQ reply window: 10 working days. Reminders 3 days before the reply date, then daily. Escalation to the Procurement Lead once past due.
  - Clarification answer SLA: 3 working days.
  - Required quote validity: the tender's bid validity plus 30 days, and never less than 120 days.
  - Buyer time standards (SRC-11, labelled "estimated"): a nudge saves 10 min, a parsed quote 45 min, a levelled quote 60 min [A].
  - `BEST_FIT_WEIGHTS` per tenant: Najd price 40, technical 20, delivery 10, QHSE 10, capacity 5, lead time 5, ICV 10; B–E similar with their emphasis.

### Phase 2 — Supplier masters
- [x] 2.1 `suppliers/najd.ts`: **48 suppliers**, written as tuples through a small builder, like 004's `build.ts` style.
  - [x] 2.1.1 **Screening mix (exact):** 41 fully current; 5 with screening **due**; 2 **blocked**:
    - Tarvessa Trading FZE, sanctions `match`;
    - one supplier with an anti-bribery `flag`.
  - [x] 2.1.2 Include every supplier named in gcc-demo-data §6, in the trades given there:
    - Rasikh Foundations Co. and Taweel Geotechnical (screening due on one);
    - Rhein Aqua Systems GmbH (DE), Gulf Process Systems Co. (KSA, high ICV, the supplier persona's firm: `contactPersonId: 'najd.supplier'`) and Hanseong Water Machinery (KR);
    - Nordklar Filtration AB (SE) and Sahara Clearwater Technologies (UAE);
    - Castellan Separators Srl (IT);
    - Hijaz Power Equipment Co. (KSA) and Levant Switchgear SAL;
    - Qimma Automation (KSA);
    - Tuwaiq Pipe Industries (KSA, national) and Eastern Composite Pipes Co. (KSA, national);
    - Aldervane Pumps and Dunmore Hydraulics.
  - [x] 2.1.3 **Trades** cover the hero's 11 packages and T-2026-104's and T-2026-109's packages, with 4–8 candidate suppliers each, so shortlists of 4–6 are possible. Some suppliers are on the ECWS AVL.
  - [x] 2.1.4 All names are fictional and plausible for the region. No real company names: check each against your general knowledge and pick another if it's a known firm.
- [x] 2.2 `suppliers/<tenant>.ts` for B–E: 12–16 suppliers each, enough for their Stage 2 tender's packages, with at least one screening `due`. Corniche's trades are MEP and district cooling. Dafna's are sewer rehabilitation. Batinah's are roads and structures. Qurain's are tunnelling and large pipelines.

### Phase 3 — Najd's live Stage 2 tenders (`tenders/najd.ts`)
- [x] 3.1 **T-2026-104** (Jubail industrial WWTP upgrade, SAR 175 M), **11 packages:**
  - P-01 Piling and dewatering (subcontract);
  - P-02 Process mechanical equipment (supply, long lead 40 weeks, need-by 28);
  - P-03 Dissolved-air flotation and tertiary filters (supply);
  - P-04 Sludge thickening and dewatering (supply; scope note "capacity to be confirmed: 120 or 150 m³/h, validation VAL-104-1 open");
  - P-05 Odour control (subcontract);
  - P-06 33/11 kV substation and transformers (subcontract, long lead 36 weeks);
  - P-07 LV distribution and MCCs (subcontract);
  - P-08 Instrumentation, control and SCADA (subcontract);
  - P-09 Pipes and valves (supply);
  - P-10 Chemical dosing (supply);
  - P-11 Steel structures and covers (subcontract).

  Give each package a value.
  - [x] 3.1.1 **BOQ summary:** package values, self-performed lines and one not-covered line, "Integration with the existing plant control system", at **3.1%** of SAR 175 M. The package, self and not-covered values sum to exactly SAR 175,000,000.
  - [x] 3.1.2 **RFQs: 3 per package, 33 in all.** Sent 26–27 Feb (within 24 h of the DG1 pursue, which is in history). Reply dates are spread so that **31 are due** by 8 Mar 10:00 and **2 aren't yet due**.
  - [x] 3.1.3 **Replies, exactly:**

    | Package group | RFQs | Outcome |
    | --- | --- | --- |
    | P-01, P-05, P-07, P-09, P-10, P-11 (covered by quotes) | 18 | 18 compliant quotes, all adjustments decided at seed (`seededDecisions`) |
    | P-08 SCADA (covered by an accepted gap) | 3 | Qimma Automation compliant; one **decline** ("No capacity until Q3"); one quote **non-compliant** (deviation "Proprietary protocol; no DNP3 interface"). Accepted gap by `najd.proc` on 5 Mar: "Single compliant quote; utility-approved integrator; accepted by the Procurement Lead" |
    | P-02 Process mechanical | 3 | Rhein Aqua: quote to level. Hanseong: quote to level (USD, FCA Busan). Gulf Process Systems: **overdue, escalated** |
    | P-03 DAF and filters | 3 | Nordklar: quote to level (excludes installation supervision). Sahara Clearwater: **overdue**. Third supplier: **not yet due** |
    | P-04 Sludge | 3 | Castellan: quote to level (30% advance). Gulf Process Systems: **overdue**. Third supplier: **not yet due** |
    | P-06 Substation | 3 | Hijaz Power: quote to level (inclusive of 15% VAT). Levant Switchgear: **overdue, escalated**. Third supplier: **decline** ("Transformer factory fully booked") |

    That gives:
    - 27 replies (25 quotes and 2 declines), of which **22 were on time** and 5 late (choose them among the covered packages);
    - **4 overdue**, 2 of them escalated;
    - **5 quotes to level**.
  - [x] 3.1.4 **Rhein Aqua's quote** carries every levelling case of gcc-demo-data §6:
    - EUR;
    - EXW Germany;
    - validity 60 days (required 120);
    - lead time 34 weeks (need-by 28).
  - [x] 3.1.5 **Clarifications:** 4 open, none stale (due dates after today); plus 3 answered ones for history. One open clarification is `commercial: true` (payment terms), so it goes to a human buyer.
- [x] 3.2 **T-2026-109** (Tabuk water transmission, SAR 260 M), **9 packages:** pipes (national, mandatory list), valves, pump stations mechanical, surge protection, cathodic protection, SCADA and telemetry, electrical, trenchless crossings, and testing and disinfection.
  - [x] 3.2.1 27 RFQs (3 per package), all sent **Thu 5 Mar 10:05**. That is 22 h 45 m after the DG1 pursue on Wed 4 Mar 11:20.
  - [x] 3.2.2 Replies are due **Sun 15 Mar**; 0 are due so far. Spread the opened and acknowledged states: some opened, some acknowledged, none quoted yet.
  - [x] 3.2.3 2 open clarifications, none stale.
  - [x] 3.2.4 A BOQ summary with no not-covered line.
- [x] 3.3 **Hero** (every tenant): no RFQs at seed. They exist only after a DG1 pursue in the demo (Phase 6). Its packages come from `HERO_PACKAGES`, with values computed from `HERO_LINES`.

### Phase 4 — Packaging and coverage (spec §8.2, the coverage bar)
- [x] 4.1 `packaging.ts`: `packagesFor(tenant, tenderId, done)` returns `PackageVM[]`: `{ pkg; lines: { count; valueShare }; makeOrBuy: 'self-install' | 'buy' | 'subcontract'; estimated: Money; longLead?: { weeks; text }; avl?: string; lcRelevant; mandatoryList; approved: boolean }`.
  - **Hero:** each package's value and line count come from `HERO_LINES`, where the aggregate lines count `lines`.
  - **Proposal text:** "Proposed by the Outreach & Evaluation agent from the BOQ and the capability profile".
- [x] 4.2 `coverage.ts`:
  - [x] 4.2.1 `coverageBar(tenant, tenderId)` returns `{ selfPct; supplyPct; subcontractPct; notCoveredPct; subcontractCap: { pct; cap: 30; ok: boolean; text } }`.
    - **Hero:** 49.7 / 32.3 / 16.0 / 2.0, with "Subcontract works 16% of the 30% cap".
    - **T-2026-104:** not covered 3.1%.
  - [x] 4.2.2 `packageCoverage(tenant, tenderId, done)`: a package is **covered** when it has ≥ 3 compliant quotes whose adjustments are all decided, or an accepted gap (seeded or `gap:`).
    - Returns per package `{ state: 'covered' | 'gap-accepted' | 'open'; compliantLevelled; needed: 3; why }`.
    - Totals: `{ covered; total }`.
  - [x] 4.2.3 `notCovered(tenant, tenderId)` gives SRC-7, with the lines named.
  - [x] 4.2.4 `longLeadAtRisk(tenant, tenderId, done)` gives SRC-9: packages whose best compliant quote's lead time exceeds `needByWeeks`.

### Phase 5 — Shortlists (spec §8.3)
- [x] 5.1 `shortlist.ts`: `recommendedShortlist(tenant, tenderId, pkgId, done)` returns 4–6 suppliers ranked on:
  - trade match;
  - AVL status for the tender's issuer;
  - ICV;
  - on-time %;
  - response rate;
  - load.

  Each supplier carries a reason like "Approved by the client; ICV 42; 92% on time; 3 quotes in 12 months, 1 awarded", built from its fields.
  - Suppliers whose screening isn't current appear **greyed**, with `sendable: false` and the reason: "Sanctions screening match: cannot be sent an RFQ", or "Screening due since {date}: re-screen before sending".
  - **Guardrail:** they can never be sent. `rfqWrite` refuses them (Phase 6).
- [x] 5.2 `heldByScreening(tenant, done)` gives SRC-8: shortlisted suppliers that can't be sent to.
- [x] 5.3 `shortlistWrite(tenderId, pkgId, supplierIds, overrides, byId)` returns `{ key; value; audit }`. A removal of a recommended supplier, or an addition, needs a reason.

### Phase 6 — RFQs, the clock, tracking (spec §8.4–§8.5)
- [x] 6.1 `rfq.ts`:
  - [x] 6.1.1 `rfqDraft(tenant, tenderId, pkgId)` returns:
    - scope extract;
    - **only the BOQ lines matched to the package** (item, description, unit, quantity; **never rates**);
    - the drawings list reference (hero: "Vol. 3 Drawings list, p. 47: sheets for {package}");
    - technical requirements (from the package note and the extraction);
    - commercial terms:
      - the tenant currency;
      - "Price excluding VAT, with VAT stated separately";
      - Incoterm "Delivered to site (DAP)";
      - validity ≥ the required number of days;
      - the tender's payment terms;
      - lead time;
      - a deviations and exclusions schedule;
    - quote level (line or package);
    - reply-by (sent + 10 working days, tenant country calendar);
    - "Questions through the clarification channel in this RFQ".
  - [x] 6.1.2 `rfqWrite(tenant, tenderId, pkgId, supplierIds, byId, done)` returns `{ key; value; audit } | { error }`. It returns an error when any supplier isn't sendable, or no shortlist is approved.
  - [x] 6.1.3 `rfqClock(tenant, tenderId, done)`:
    - For a tender whose DG1 pursue (from `dg1:{TID}` or history) was in the last 24 h: `{ dueAt; sent; total; left: '23 h 10 m'; tone }`.
    - `null` otherwise.
    - SRC-1's live form.
  - [x] 6.1.4 `rfqsFor(tenant, tenderId, done)` combines seeded RFQs with RFQs derived from `rfq-sent:` keys. A derived RFQ's id is `{TID}-{pkgId}-{supplierId}`; it is sent at the key's `at` and replies by `at` + 10 working days.
- [x] 6.2 `tracking.ts`:
  - [x] 6.2.1 **Package board:** each package's column, one of Issued → Acknowledged → Quoted → Levelled → Buyer approved. It is the furthest stage **all** its RFQs have reached, except that Quoted needs at least one quote.
  - [x] 6.2.2 **Per-supplier matrix row:** sent · opened · acknowledged · declined (reason) · quoted · clarification open.
  - [x] 6.2.3 `repliesOnTime(tenant, done)` gives SRC-3: replied by the reply date ÷ due so far, across live tenders. Najd: 71% (22 of 31).
  - [x] 6.2.4 `overdue(tenant, done)` gives SRC-4 with the escalated count. Najd: 4 (2 escalated).
  - [x] 6.2.5 `reminderPlan(rfq)`: 3 days before the reply date, then daily; escalation after it. It returns planned times with their copy, for display; nothing is sent.
  - [x] 6.2.6 `reserveSuppliers(tenant, tenderId, pkgId, done)`: shortlist members not yet sent an RFQ, then master candidates. Used for overdue RFQs past the SLA.
  - [x] 6.2.7 `buyerTimeSaved(tenant, done)` gives SRC-11 as hours, labelled "estimated", from counts × the time standards.

### Phase 7 — Levelling, best fit, clarifications (spec §8.6–§8.8)
- [x] 7.1 `levelling.ts`:
  - [x] 7.1.1 `levelQuote(tenant, quote, pkg, done)` returns `LevelledVM { original: Money; levelled: Money (tenant ccy, excl. VAT, delivered to site); adjustments: Adjustment[]; compliant: boolean; flags: string[]; state: 'to-level' | 'levelled' }`.
    - `Adjustment` = `{ key; kind; label; from; to; delta?: Money; estimated: boolean; source: string; state: 'proposed' | 'confirmed' | 'rejected' }`.
    - `state` comes from `seededDecisions`, else the `lev:` key, else `proposed`.
  - [x] 7.1.2 **Rules**, in this order; each is one adjustment with a sourced text:
    - **Currency:** convert to the tenant currency at the demo bid rate, with the source `rateNote()` and `FX_LABEL`.
    - **VAT:** an inclusive quote is shown excluding VAT at the supplier country's rate. "Zero-rated or outside scope" is noted where the rate is 0.
    - **Delivery terms:** EXW or FCA gets freight (by origin region) plus 5% duty added to reach delivered to site. `estimated: true`.
    - **Validity:** fewer days than required gives the flag "Validity short: request extension" (no money change).
    - **Exclusions:** a priced allowance from the benchmarks, `estimated: true`.
    - **Deviations:** any deviation with `nonCompliant` makes `compliant` false, with the flag "Non-compliant: does not count towards coverage".
    - **Payment terms:** an advance of more than 10% gives a cash-flow note (no money change).
    - **Lead time:** longer than `needByWeeks` gives the flag "Lead time {n} weeks against {m} needed: schedule risk".
  - [x] 7.1.3 `toLevel(tenant, done)` gives SRC-6: quotes with any `proposed` adjustment. Najd: **5**.
  - [x] 7.1.4 `levelWrite(quoteId, adjKey, state, byId, amount?, note?)` returns `{ key; value; audit }`. Changing an estimated amount keeps the original in the audit detail.
  - [x] 7.1.5 `sideBySide(quote)` returns the original and levelled views, with the trace of each change.
- [x] 7.2 `bestfit.ts`:
  - `packageScores(tenant, tenderId, pkgId, done)` scores compliant, levelled quotes with the tenant's `BEST_FIT_WEIGHTS`. Screening is a pass/fail gate before scoring.
  - `mixOptions(tenant, tenderId, done)` returns three options across the covered packages:
    - **Lowest cost**;
    - **Balanced** (recommended);
    - **Lowest risk**.

    Each has total levelled cost, ICV share (SRC-10), risk notes and schedule fit.
  - `mixWrite(…)`: an override of the recommended supplier in a package needs a reason. The audit reads like "Override recorded: rank 2 selected on delivery record".
  - Every view model carries `disclaimer: 'The agent never issues a commitment or purchase order.'`.
- [x] 7.3 `clarifications.ts`:
  - `clarificationsFor(tenant, tenderId, done)` gives state (open, answered) and `stale` (open past `due`).
  - `openClarifications(tenant, done)` gives SRC-5. Najd: 6 open, 0 stale.
  - A commercial question is routed to the buyer (`najd.proc`), with the text "Commercial question: answered by a person".

### Phase 8 — B–E Stage 2 tenders (**waits for 017 DONE**)
- [x] 8.1 When `app/plans/README.md` shows 017 as DONE (or DONE — awaiting review), read each B–E Stage 2 tender's `s2` facts in `src/data/gcc/lifecycle/live/<tenant>.ts`.
- [x] 8.2 Author their packages, RFQs, quotes, clarifications and BOQ summaries in `tenders/others.ts`, so every `s2` number is reproduced exactly.
- [x] 8.3 If 017 isn't done when you reach this phase, finish Phases 9–10 for Najd first, then come back. If the facts are impossible to reproduce (for example, covered > packages), stop and write a Blocker.

### Phase 9 — Kick-off and the Supplier Portal (spec §8.1, §8.10)
- [x] 9.1 `kickoff.ts`: `kickoffFor(tenant, tenderId, done)` gives the checklist created by a DG1 pursue, each item with owner and due, and a derived state:
  - approve packaging (`najd.proc`);
  - approve shortlists (`najd.proc`);
  - send RFQs, with the clock;
  - internal inputs to request: method statement outline, HSE plan outline, key CVs, preliminary programme, preliminary estimate, design basis.
    - Each internal input carries `inputKey` and its owner role.
    - Its state is read from 009a's keys, `input-req:{TID}:{inputKey}` and `input-sub:{TID}:{inputKey}`, if present; otherwise "to request".
    - Don't define those keys' semantics beyond reading their presence.
- [x] 9.2 `portal.ts`:
  - [x] 9.2.1 `supplierRfqs(tenant, personId, done)`: the RFQs whose supplier has `contactPersonId === personId`. For Najd's Gulf Process Systems at seed, that is T-2026-104 P-02 and P-04, both overdue. The hero's P-02 is added once it has been sent in the demo.
  - [x] 9.2.2 `supplierView(tenant, personId, rfqId, done)` shows:
    - the inviting company (tenant name and brand);
    - package scope;
    - **only this RFQ's BOQ lines**, without rates;
    - reply-by;
    - the document list;
    - the quote form model (line or package level, as the RFQ says);
    - deviations and exclusions fields;
    - the clarification form.
  - [x] 9.2.3 It **never** shows other suppliers, other quotes, the tender's value, the estimate or rates. Return a plain object and have the dev check serialise it and assert none of those strings or numbers appear.
  - [x] 9.2.4 `supplierQuoteWrite(rfqId, input, personId)` returns `{ key: 'sq:{rfqId}'; value; audit }`. Once written, the quote appears on the buyer's side as a new quote to level (through `rfqsFor` and the quotes list), and the RFQ is no longer overdue.

### Phase 10 — Dev check `80-stage2.tsx`
Model it on `30-seed.tsx` (target / got / result). It reads the active tenant; Najd shows the full set.
- [x] 10.1 **Najd seed:**
  - T-2026-104: packages 11 · covered 7 · RFQs 33 · due 31 · on time 22 (71%) · overdue 4 (2 escalated) · to level 5 · clarifications 4 open, 0 stale · not covered 3.1%.
  - T-2026-109: packages 9 · covered 0 · RFQs 27 · sent 22 h 45 m after DG1 · due 0 · clarifications 2 open.
  - Tenant totals:
    - SRC-3 71%;
    - SRC-4 4 (2 escalated);
    - SRC-5 6 open, 0 stale;
    - SRC-6 5;
    - SRC-8 = the number of shortlisted suppliers held. Report it.
  - Supplier master: 48 · 41 current · 5 due · 2 blocked.
- [x] 10.2 **Hero:**
  - coverage bar 49.7 / 32.3 / 16.0 / 2.0 and "Subcontract works 16% of the 30% cap" ✓;
  - long-lead P-02 (40 weeks), P-03 (30), P-06 (36);
  - a recommended shortlist of 4–6 for every package, with reasons;
  - Tarvessa Trading FZE greyed, where it matches a trade;
  - the P-02 RFQ draft has exactly the 6 P-02 lines and no field named `rate`.
- [x] 10.3 **Levelling** on the five to-level quotes: each adjustment's label and source, with the levelled totals.
  - Rhein Aqua: currency, delivery terms (estimated), validity flag, lead-time flag.
  - Hijaz: VAT excluded at 15%.
  - Nordklar: allowance (estimated).
  - Castellan: cash-flow note.
  - Hanseong: USD conversion plus FCA freight and duty.
- [x] 10.4 **Simulated flows**, with an in-memory `done`:
  1. Confirm every adjustment on the five quotes → to level 0; P-02 is still open (the overdue Gulf Process reply is missing); covered stays 7.
  2. Gulf Process submits the T-104 P-02 quote through `supplierQuoteWrite` → overdue 3; P-02 has 3 quotes, 1 to level.
  3. Write a hero `dg1:T-2026-118` pursue at 10:00 → `rfqClock` due Mon 9 Mar 10:00, 0 of 11 sent. Approve the shortlists and send all → 11 of 11, and the supplier persona now sees the hero P-02 RFQ.
  4. Try to send to a blocked supplier → error.
  5. Accept a gap on T-104 P-06 → covered 8.
  6. Approve the Balanced mix with one override → the audit text includes the reason.
- [x] 10.5 **Supplier view masking:** serialise `supplierView` for T-104 P-02 and assert that it contains none of:
  - any other supplier's name;
  - "175,000,000" or "SAR 175";
  - any line rate;
  - the word "estimate".
- [x] 10.6 **Determinism:** equal JSON on a second call. Grep your folders for `Date.now` and `Math.random`: none.
- [x] 10.7 **B–E** (after Phase 8): each Stage 2 tender reproduces its 017 `s2` facts.

## Data and derivation
- **New facts** are in `src/data/gcc/s2/`:
  - supplier masters;
  - T-104's and T-109's packages, BOQ summaries, RFQs, quotes, clarifications and the accepted gap;
  - B–E Stage 2 records;
  - benchmarks.

  The hero packages derive from 004's data.
- **Derived** in `src/domain/gcc/s2/`: packaging, coverage (SRC-2, SRC-7, SRC-9), shortlists (SRC-8), RFQ clock (SRC-1 live), tracking (SRC-3, SRC-4), levelling (SRC-6), best fit (SRC-10), clarifications (SRC-5), buyer time saved (SRC-11), kick-off, and the supplier view.
- **New `done` keys:** listed above. This plan writes none; 008b's screens will. Reset demo clears them.

## Acceptance checks
- [x] typecheck and build pass (parallel rules apply).
- [x] The 80-stage2 panel shows every target met in Najd, and in B–E after Phase 8. There are no console errors.
- [x] The Indian tenant is unchanged.
- [x] No page files. No numbers typed into the panel except its `EXPECT` table. No role checks.
- [x] Only the files in Scope are touched (`git status` in the report).
- [x] No real company names among the suppliers (list any you were unsure of in the report).

## Execution report
Executor, 2026-09-25 (Phases 1–7, 9, 10 for Najd) and 2026-09-26 (Phase 8, 10.7, browser check). Every phase is done. Phase 8 was built on plan 017's `live/*.ts` facts while 017 still shows IN PROGRESS: see deviation 23.

**Changed files** (all in the folders this plan owns, plus my row of the index):
- `src/data/gcc/s2/`: `types.ts`, `benchmarks.ts`, `index.ts`, `suppliers/{build,najd,corniche,dafna,batinah,qurain}.ts`, `tenders/{build,najd,hero,others}.ts`.
- `src/domain/gcc/s2/`: `done.ts`, `context.ts`, `packaging.ts`, `shortlist.ts`, `rfq.ts`, `tracking.ts`, `levelling.ts`, `coverage.ts`, `bestfit.ts`, `clarifications.ts`, `kickoff.ts`, `portal.ts`, `index.ts`.
- `src/pages/gcc/dev-checks/80-stage2.tsx`.
- `plans/README.md` (my row only) and this plan.
- Nothing else. The checkout has many other sessions' changes; none of them is mine.

**Verification:**
- `npm run typecheck` and `npm run build`: both pass (2026-09-26). The only build warning is Vite's chunk size warning.
- **Headless** (esbuild bundle + Node, seed `done` and an in-memory `done`):
  - **Every live Stage 2 tender reproduces its plan 017 `s2` facts exactly** (packages, covered, RFQs sent, due so far, answered on time, overdue, escalated, to level, not covered %, replies due, clarifications open and stale):
    - Najd T-2026-104: 11 · 7; 33 of 33; 31 due; 22 on time (71%); 4 overdue (2 escalated); 5 to level; 3.1%; Thu 5 Mar; 4 open, 0 stale.
    - Najd T-2026-109: 9 · 0; 27 of 27; 0 due; 0 to level; 0%; Sun 15 Mar; 2 open.
    - Corniche T-2026-044: 8 · 0; 24 of 24; 0 due; Thu 12 Mar; 1 open.
    - Dafna T-2026-019: 10 · 0; 30 of 30; 18 due; 14 on time; 2 overdue (0 escalated); 0 to level; Tue 10 Mar; 3 open, 1 stale.
    - Batinah T-2026-027: 7 · 3; 21 of 21; 12 due; 9 on time; 1 overdue (0 escalated); 2 to level; 4.5%; Thu 5 Mar; 2 open.
    - Qurain T-2026-058: 12 · 5; 36 of 36; 24 due; 20 on time; 2 overdue (0 escalated); 4 to level; 2.2%; Tue 10 Mar; 3 open.
    - Qurain T-2026-062: 10 · 0; 30 of 30; 0 due; Thu 12 Mar; 1 open.
  - Every seeded RFQ in every tenant goes to a supplier in the master, in the package's trade, with screening current, opened after it was sent; every BOQ summary sums exactly to the register value; every shortlist member exists.
  - Najd tenant totals: SRC-1 trailing 100% (20 of 20 packages); SRC-3 71%; SRC-4 4 (2 escalated); SRC-5 6 open, 0 stale; SRC-6 5; **SRC-8 = 6 shortlist places held (5 suppliers, 0 blocked)**; SRC-11 53.1 h estimated. T-104 RFQs issued 6 h 50 m after DG1; T-109 22 h 45 m.
  - Master: Najd 48 · 41 current · 5 due · 2 blocked. B–E: Corniche 16 (Setouchi due, held on T-044 P-01), Dafna 16 (Zubarah due, held on P-06), Batinah 16 (Ibri due, held on P-06), Qurain 33 (Garda due, held on T-058 P-07 and T-062 P-02).
  - Hero: bar 49.7 / 32.3 / 16.0 / 2.0, "Subcontract works 16% of the 30% cap" ✓; long lead P-02 40, P-03 30, P-06 36; shortlists of 4–6 with reasons on all 11 packages (Najd); Tarvessa greyed in P-08 and P-09; the P-02 draft has the 6 P-02 lines and no `rate` field.
  - Levelling (Najd): Rhein Aqua currency, delivery (est.), validity, lead time (EUR 4,770,000 → SAR 21,231,685); Hanseong currency, delivery (est.) (USD 5,350,000 → SAR 21,802,922); Nordklar allowance (est.) (SAR 8,980,000 → 9,220,000); Castellan currency, cash-flow note (EUR 1,795,000 → SAR 7,316,576); Hijaz VAT 15% removed (SAR 13,110,000 → 11,400,000). B–E to-level quotes: Batinah Alpen (currency, delivery est.) and Emilia (currency, validity); Qurain Rheintal and Hokuriku (currency, delivery est., lead time), Ventalba (currency, allowance est.), Rhône (currency, validity). Qurain T-058 P-01 is SRC-9 long lead at risk (fastest compliant quote 34 weeks against 30).
  - Flows 1–6 as the plan states: to level 0, P-02 still open, covered 7 → Gulf Process quotes: overdue 3, P-02 3 quotes, 1 to level → hero pursue at 10:00: clock due Mon 9 Mar 10:00, 0 of 11 → shortlists approved and sent: 11 of 11, the supplier persona sees hero P-02 → Tarvessa refused ("Sanctions screening match: cannot be sent an RFQ") → gap on P-06: covered 8 → Balanced mix with a P-05 override: the audit reads "Override recorded for P-05: rank 2, Salwa Environmental Equipment, selected on delivery record."
  - Masking: the T-104 P-02 supplier view has no other supplier's name, no tender value ("175,000,000", "SAR 175"), no package value, no rate or value field, no "estimate"; Gulf Process cannot open Rhein Aqua's RFQ (null).
  - Determinism: equal JSON on a second run; no `Date.now`, `Math.random` or `new Date()` in my folders.
- **Browser** (headless Chrome on the dev server, `/dev/checks`, one fresh profile, each tenant switched in turn): the 80-stage2 panel reads "All 42 targets met" in Najd, "All 8 targets met" in Corniche, Dafna and Batinah, and "All 9 targets met" in Qurain. The 10.7 rows compare the rules with 017's facts read at run time. Console: no errors; only React Router's two future-flag warnings from the shell. The Indian tenant still renders its legacy workspace (no file of it was touched).

**Deviations from plan** (for the orchestrator to accept or reverse):
1. Extra files inside my folders: `suppliers/build.ts`, `tenders/build.ts` (tuple builders), `tenders/hero.ts` (the hero's Stage 2 facts that `HERO_PACKAGES` lacks: trades, need-by, AVL, scope, spec pages, drawings) and `domain/gcc/s2/context.ts` (shared lookups, working-day arithmetic).
2. Types extended: `TenderPackage` gains `trades`, `lines`/`lineCount` (non-hero BOQ lines without rates), `selfInstall` (make-or-buy), `scope`, `specRef`, `drawings`, `quoteLevel`; `Rfq` gains `extendedFrom`; an `S2Tender` record groups a tender's facts; `Trade` gains `shafts`.
3. **Bid currency is the tender's currency**, not the tenant's (`bidCcy`). They are equal for every seeded tender; they differ only for the hero in B–E, where the booklet (§28) requires SAR. One function to flip if you prefer the tenant currency.
4. **Escalation derives from the one rule of ui-direction §7.3** (escalate when the reply date has passed: the next working day, 08:00) instead of a seeded `escalatedAt`. So an overdue RFQ that is not yet escalated fell due this morning: T-104's P-03 and P-04, Dafna's P-03, Batinah's Karst (P-05) and Qurain's Taihu (P-01) and Fahaheel (P-05) had their reply dates extended to Sun 8 Mar 09:00 (escalation due Mon 9 Mar 08:00).
5. Seeded reply windows are set per tender by the Procurement Lead (5–17 working days), not the 10-day default. The default applies to RFQs sent in the demo (the hero's fall due Mon 30 Mar, after the expected Eid closure).
6. Screening is current for **180 days** (ui-direction §7.3), and a check older than that counts as due even if its state says clear.
7. Reserve sends after the first batch use `rfq-sent:{TID}:{pkgId}:2`, `:3` …, since one key per package would overwrite the first send.
8. Signatures: `shortlistWrite(tenant, tenderId, pkgId, supplierIds, overrides, byId, done)` (it needs the recommendation to know what counts as an add or a removal); `levelWrite(…, adjustment?)` (to put the agent's figure in the audit when an amount changes); `sideBySide(tenant, quote, done)`; `rfqDraft(tenant, tenderId, pkgId, done?)`. Every write returns `{ key, value (JSON string for mark()), record, audit }` or `{ error }`.
9. `rfqClock` stays visible after 24 h while packages are unsent (red, "Late by …"), so a breach shows; it returns null once every package is issued and the 24 h are over.
10. Agent reminders are derived from the rule and counted; `Rfq.nudges` holds manual nudges only, and `nudged:{rfqId}` adds one. SRC-11 counts across live tenders, not "this month".
11. The package `note` stays buyer-side (`internalNote` on the draft), not in the RFQ's technical requirements: some notes are internal ("not covered by any supplier"). The technical list is built from the spec reference and the booklet clauses (§6, §71, §75, §64.14.1).
12. A hero "remaining items" BOQ line appears in an RFQ as "Further items of bill N (n lines), listed in the BOQ extract".
13. SRC-9 reads "best compliant quote" as the fastest compliant quote. Hanseong quotes 26 weeks (need-by 28), so T-104 has no SRC-9 at seed; Rhein Aqua is cheaper but 34 weeks, which gives the best-fit choice its story.
14. A deviations adjustment is confirmed (agree with the agent's reading) or rejected (reverse it); a supplier's declared deviations are proposed as acceptable until the buyer confirms.
15. Mandatory-list packages recommend national suppliers only.
16. The kick-off reads the owner and due date from 009a's `input-req:` value when present (`toId`, `due`, as 009a's key table documents); otherwise the role's person and my benchmark due dates.
17. Gulf Process Systems Co. is in every B–E master with `contactPersonId: '{tenant}.supplier'`, and has RFQs in every B–E Stage 2 tender, so the portal persona has something to open in each tenant.
18. *(Superseded by plan 020 D3: replies due is now the next reply date still ahead; see the review note below.)* **`rfqCounts().repliesDue` is the reply date the RFQs were issued with** (before any extension; the latest batch). 017 does not define "Replies due", and only this reading reproduces all seven of its values: T-104 and Batinah read Thu 5 Mar although some of their RFQs were extended past today. `nextReplyBy` (the next reply date still ahead) is also returned. If you prefer "next reply date ahead" for the dashboard column, 017's T-104 value becomes Sun 8 Mar and Batinah's Sun 8 Mar.
19. **T-104 re-timed to 017's step log:** packaging approved 12:30 (017 `2:shortlisting`), last RFQ 16:40 (`2:rfqs-out`, so RFQs issued 6 h 50 m after DG1, was 5 h 55 m), first quote Mon 2 Mar 09:00 (`2:quotes-in`), reply date as issued Thu 5 Mar 17:00. Four late replies moved after 17:00 on 5 Mar so that 22 of 31 stays on time. T-109's packaging approved 14:20 (017 `2:shortlisting`). The same rule sets B–E: packaging at `2:shortlisting`, last RFQ at `2:rfqs-out`.
20. **T-104 is SAR 175 M and T-109 SAR 260 M** in the register (and dashboards.md §12.2), not the plan's 310 and 420. Their BOQ summaries, package values and quotes are scaled to the register, so the coverage bar and the register agree; every share is unchanged (T-104 not covered 3.1%).
21. **B–E masters:** Corniche, Dafna and Batinah have 16 suppliers each (new suppliers and a few extra trades, so each package has three sendable suppliers in its trade). **Qurain has 33, above the plan's 12–16**: its two Stage 2 tenders have 22 packages between them. Dafna's screening-due supplier moved from Shamal to Zubarah, and Qurain's Hokuriku is now current (Garda stays due), so the RFQ'd suppliers are all sendable.
22. Batinah's story: Addendum 1 (3 Mar) revised the underpass, so P-03, P-06 and P-07 were extended to Thu 12 Mar; those 9 RFQs are the ones not yet due.
23. **Phase 8 was built before 017 is DONE.** 017 is still IN PROGRESS, but its `live/*.ts` facts exist and compile. The 10.7 rows read 017's facts at run time, so if 017 changes a number the row fails instead of drifting silently.
24. The panel's B–E rows "Supplier master size 12–16" and "Stage 2 tenders authored" became "Seeded RFQs to sendable, trade-matched suppliers" and "Supplier master has screening due", plus one 017 comparison row per tender.

**Blockers / questions:** none open. Questions for review: deviations 18 (definition of "Replies due"), 20 (tender values) and 21 (Qurain's master size).

**Answers (2026-09-26 review):**
- **Replies due (18):** Decided 2026-09-26: the next reply date still ahead, after any extensions; when none is ahead, the original reply date. T-104 reads Tue 10 Mar and Batinah T-2026-027 Thu 12 Mar (plan 020 B15 and D3).
- **Tender values (20):** the register values stand: T-104 SAR 175 M, T-109 SAR 260 M. The plan text above now says so.
- **Qurain's master (21):** 33 suppliers accepted.

**Follow-ups noticed (not done):**
- B–E hero shortlists are thin (0–3 candidates per package): their masters are sized for their own Stage 2 tenders. No script takes a B–E hero into Stage 2, but a presenter who pursues it in Dafna or Qurain would find few suppliers.
- At seed, the kick-off inputs of the live Stage 2 tenders read "To request", some with due dates already past (T-104 Key CVs due Thu 5 Mar). Seeding them belongs to 009a's `inputsFor`, or the orchestrator decides.
- T-109's shortlists were approved Thu 5 Mar 09:40, after the kick-off's 12-hour due time (Wed 4 Mar 23:20), so its kick-off item reads late. 017 logs no shortlist time for T-109; move it if you want it on time.
- 017's `2:levelling` step (T-104 Thu 5 Mar 11:00) is not derived by these rules; 008b's flow strip should decide which event it maps to.
- The Supplier Portal's acknowledge, decline and "ask a clarification" actions have no `done` keys in this plan's table; 008b needs them (for example `sq-ack:`, `sq-decline:`, `sclar:{rfqId}:{n}`).
- `GccPending` has no error boundary per panel, so one crashing panel blanks the whole dev page (006 owns it).
- Supplier names I was unsure of (fictional as far as I know, but similar names may exist): Aldervane Pumps and Tarvessa Trading FZE (both named by gcc-demo-data §6), Ellanby Instrumentation Ltd, Odrana Odour Control FZCO, Weser Transformer Works GmbH, Luminara Poles S.A., Ventalba Ventilation S.L.; and among the new ones, Tyrol Armaturen GmbH, Danube Surge Systems GmbH, Adriatic Corrosion Protection d.o.o., Rhône Tunnel Ventilation SAS, Mina Abdullah Pipe Industries Co. and Taihu Shield Machinery Co. Worth a quick search before a client meeting. *Orchestrator, 2026-09-26: on review, five names were close to real firms or brands and were renamed everywhere: Borealis Trading FZE → Tarvessa Trading FZE, Kestrel Pumps → Aldervane Pumps, Zephyr → Odrana Odour Control FZCO, Halcyon → Ellanby Instrumentation Ltd, Tramontana → Ventalba Ventilation S.L.*
