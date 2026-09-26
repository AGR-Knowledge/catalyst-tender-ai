# 009a — Stage 3 and DG2: pack, positions and approval rules (no screens)

Status: DONE — awaiting review (2026-09-26); 1 question in the report · Depends on: 004 (DONE) · Can run in parallel with: 006, 017, 007a, 008a.
- **Phase 7 waits for 007a's `eligibilityFor` and `addendaFor`.**
- **Phase 9 waits for 017 to be DONE.**
- **Parallel run:** read "Running wave 1 in parallel" in `app/plans/README.md` first; the same rules apply.

## Goal
Everything the Bid / No-Bid pack and the DG2 gate will show is computed correctly before any screen exists:
- the ten pack sections with sources and freshness (win probability with its band and drivers, cited competitors, eligibility, capacity, financial exposure, risks, margin range, recommendation, inputs, and staleness with re-run);
- the contributor inputs behind them;
- the committee's named positions with quorum 3 of 5;
- the Head of Tendering's approval with the majority check;
- conditions, the No-Bid decline letter, and re-open.

Najd's T-2026-097 reproduces the Script C story exactly. Plan 009b later builds the screens and the input forms and adds no logic.

## Context
- **Why:**
  - s1-s3-demo-spec §9 (the pack) and §10 (DG2), **as changed by dashboards.md §9**: members record positions; **the Head of Tendering approves**; the CEO is an ordinary member (seat `ceo`); quorum is 3 of 5 positions. If the approval goes against the majority of positions, a reason is required and the record shows "Approval differs from majority". The Head of Tendering keeps the secretary function, and re-opening needs the Head of Tendering's approval.
  - kpi-and-screen-catalogue §A.4 (DEC-1 … DEC-10), §C.4 and §C.5 (committee lenses), §C.6 (contributor input forms: exact fields).
  - gcc-demo-data §5.1 (T-2026-097, T-2026-101), §5.3 (DEC readings), §7 (competitors), §8 (committee and seeded positions).
- **The Script C story (Najd, T-2026-097 Madinah WTP expansion, SAR 355 M):**
  - the pack was generated and issued Sat 7 Mar 14:10, so the SLA falls due Sun 8 Mar 14:10 (4 h 10 m left at demo time);
  - 2 of 5 positions are recorded: CFO "Support with conditions: Keep the bid bond within the facility; minimum margin 9%" (Sat 7 Mar 18:40), Technical Director "Support" (Sun 8 Mar 08:15);
  - win probability **58 ± 8**; margin range **8.5–11.5%**, "on benchmark rates and levelled quotes for 7 of 9 packages";
  - **stale:** Addendum 2 received today 09:12 changes 2 packages (P-03 Filtration, P-09 Pipes and valves), per 007a;
  - DEC-4 SAR 206 M weighted (0.58 × 355).
- **T-2026-101** (Abha STP upgrade, SAR 260 M): pack in preparation. Inputs outstanding:
  - "Facility headroom and bond capacity" (`najd.fin`, due Sat 7 Mar 17:00, **late**);
  - "Top five contract risks" (`najd.comp`, due today 17:00).
- **What exists:**
  - 004: register rows (`packIssuedAt` on T-2026-097), `facility`, `teams`, `history.outcomes` (with `predictedWin`, for calibration), `fit.safeDeliveryPct` (Najd 70).
  - `src/data/people.ts`: `Seat = 'ceo' | 'cfo' | 'technical' | 'operations' | 'sector'`, `SEATS`, `SEAT_LABEL`. Members are `{tenant}.exec` (seat `ceo`) and `{tenant}.member.{seat}`; the Head of Tendering is `{tenant}.hot`; contributors are `comm`, `plan`, `comp`, `dir`, `fin`, `hr`.
- **017's interim `s3` step facts** (which 009b replaces with your derivations, with an agreement check): `pack`, `issuedAt`, `inputs.items[]` (ids, owners, due, submittedAt), `stale`, `positions.bySeat`, `win`, `marginRange`, `facilityAfter`, `weightedValue`.
- **Plan 015's `DELIVERY_LOAD`** (not built yet): Najd current 58% as of 5 Mar; T-2026-097 +9; T-2026-101 +4; (58 + 9 + 4) ÷ 70 = 101% of the safe threshold. Your §9.4 snapshot uses the same figures; 009b checks that the two agree.
- **Other plans running now:**
  - 006: shell. Its `can()` has `dg2.decide` for `hot` and `dg2.position` for seats.
  - 017: lifecycles; it edits `data/gcc/types.ts`, `tenants/*.ts`, `index.ts`.
  - 007a: Stage 1. You import `eligibilityFor` and `addendaFor` from `@/domain/gcc/s1`.
  - 008a: Stage 2. It reads your `input-req:` and `input-sub:` keys only for presence.

## Scope
**Files to create (you own these folders):**
- `src/data/gcc/s3/types.ts`, `competitors.ts`, `win.ts`, `inputs.ts`, `packs.ts`, `positions.ts`, `letters.ts`, `index.ts`
- `src/domain/gcc/s3/done.ts`, `win.ts`, `competitors.ts`, `inputs.ts`, `pack.ts`, `freshness.ts`, `index.ts`
- `src/domain/gcc/dg2/positions.ts`, `decision.ts`, `conditions.ts`, `reopen.ts`, `record.ts`, `index.ts`
- `src/pages/gcc/dev-checks/90-stage3.tsx`

**Do not change:**
- 004's data files and `tenants/*.ts` (017 is editing them);
- `people.ts`, `access.ts`, or any file 006 owns;
- the store;
- 007a's and 008a's folders.

**Out of scope:**
- Screens, input forms and routes (009b);
- KPI registry files (013, 015);
- DG3 (018);
- DG2 history (017 generated it);
- overlaying decisions onto the data port (009b; you expose `dg2Overlay`);
- sending letters or messages outside the app.

## Done-key conventions
JSON values, read with a local `readDone<T>` in `domain/gcc/s3/done.ts`. Every value carries `at` (default `2026-03-08T10:00`) and `byId`.

| Key | Value |
| --- | --- |
| `dg2-pos:{TID}:{seat}` | `{ stance: 'support' \| 'conditions' \| 'oppose' \| 'abstain'; comment?: string; conditions?: string[]; coi?: { declared: true; text: string }; packVersion: number; recordedById?: string; at; byId }`. `byId` is the member; `recordedById` is set when the Head of Tendering recorded it as secretary |
| `dg2:{TID}` | `Dg2Decision` (Phase 5) |
| `dg2-reopen-req:{TID}` | `{ reason; trigger: 'competitor-withdrew' \| 'employer-signal' \| 'jv-offer' \| 'other'; at; byId }` |
| `dg2-reopen:{TID}` | `{ approved: true; at; byId }` (the Head of Tendering) |
| `dg2-letter:{TID}:R{round}` | `{ text: string; sent: boolean; round: number; at; byId }` (round-scoped since plan 020 E4; build it with `letterKey()`) |
| `cond:{TID}-R{round}-C{n}` | `{ state: 'closed'; note?: string; at; byId }` (round-scoped since plan 020 E3; build the id with `conditionId()`) |
| `pack-rerun:{TID}` | `{ version: number; at; byId }` |
| `pack-issue:{TID}` | `{ version: number; at; byId }` |
| `pack-note:{TID}` | `{ text: string; at; byId }` (the Bid Manager's presenter note; numbers stay locked) |
| `input-req:{TID}:{inputKey}` | `{ toId: string; due: string; at; byId }` |
| `input-sub:{TID}:{inputKey}` | `{ fields: Record<string, unknown>; at; byId }` |
| `nudged:{target}` | `'yes'` (015's pattern; for seeded inputs the target is 017's item id) |

## Steps

### Phase 1 — Types
- [x] 1.1 `src/data/gcc/s3/types.ts`:
  - [x] 1.1.1 **`Evidence`:** `{ id; kind: 'award-notice' | 'opening-report' | 'pq-list' | 'market-intel'; date: string; title: string; url: string }`. URLs use `.example` hosts only (for example `https://awards.portal.example/…`); never a real portal hostname. Every record is labelled synthetic in its title: "(synthetic)".
  - [x] 1.1.2 **`Competitor`:** `{ id; name; country; profile: string; claims: { text: string; evidenceIds: string[] }[]; pricingPosture: 'aggressive' | 'market' | 'premium'; recentWins: { title; year; value?: Money; evidenceId }[]; usuallyJv?: boolean; alsoPartnerOf?: GccTenantKey[] }`.
  - [x] 1.1.3 **`WinModel`:** `{ tenant; tenderId; base: { pct: number; label: string }; drivers: { key: 'client' | 'value-band' | 'geography' | 'competitors' | 'capacity' | 'price-position' | 'local-content' | 'jv'; label: string; points: number; why: string; source: string }[]; comparables: number; movers: { text: string; points: number }[]; bidders?: string[] /* competitor ids */ }`.
  - [x] 1.1.4 **`InputKey`:**
    - S3 pack inputs: `'commercial' | 'planning' | 'legal' | 'pd' | 'finance' | 'hr'`;
    - S2 kick-off inputs listed by 008a: `'method-statement' | 'hse-plan' | 'key-cvs' | 'programme' | 'estimate' | 'design-basis'`.
  - [x] 1.1.5 **`InputSpec`:** `{ key: InputKey; label; ownerRole: RoleKey; feeds: string /* '§9.7' */; fields: { name; label; kind: 'range' | 'text' | 'choice' | 'list' | 'money' | 'date' | 'number' }[] }`. The fields are exactly those of catalogue §C.6.
  - [x] 1.1.6 **`SeededInput`:** `{ tenant; tenderId; key: InputKey; itemId?: string /* 017's id, filled in Phase 9 */; ownerId; requestedById; requestedAt; due; submittedAt?; fields?: Record<string, unknown> }`.
  - [x] 1.1.7 **`PackVersion`:** `{ tenant; tenderId; version: number; generatedAt: string; issuedAt?: string; snapshot: PackSnapshot }`.
    - `PackSnapshot` holds what a pack freezes at generation:
      - eligibility summary (for tenders with no `requirements`);
      - sourcing summary (`{ packages; levelled }`);
      - the portfolio roll-up (`{ asOf; currentPct; ifWon: { tenderId; addPct }[]; safePct }`);
      - bid effort (`{ toDateWeeks; toGoWeeks; externalCost: Money }`);
      - the agent's recommendation narrative (`{ recommendation: 'bid' | 'bid-with-conditions' | 'no-bid'; rationale; winThemes: string[]; resourceAsk }`).
  - [x] 1.1.8 **`RerunEffect`:** `{ tenant; tenderId; fromVersion; section: string; change: string }[]`, the authored differences a re-run produces.
  - [x] 1.1.9 **`SeededPosition`:** `{ tenant; tenderId; seat: Seat; stance; comment?; conditions?: string[]; at; byId }`.

### Phase 2 — Data
- [x] 2.1 `competitors.ts`: the five fictional competitors of gcc-demo-data §7, each with 2–4 claims, **every claim** citing at least one evidence record:
  - Hijr Al-Watan Contracting;
  - Sahab Gulf Water Technologies (usually in a JV);
  - Al-Masar United Contracting (lowest bidder in 4 of its last 7 tenders, from opening reports);
  - Tihama Hydro Works Co. (`alsoPartnerOf: ['dafna']`);
  - Istria Aqua Engineering (enters through local JVs).

  Add **one uncited claim** to Al-Masar ("Said to be bidding below cost this year", with no evidence). Phase 3 must suppress it. 10–14 evidence records in all.
- [x] 2.2 `win.ts`: T-2026-097, Najd.
  - Base 33%: "Water hit rate, trailing 12 months (7 of 21)".
  - Drivers (they sum to +25):
    - client history +9 ("WCWS: 2 awards from 3 bids since 2022");
    - value band +3;
    - geography and presence +2 ("Jeddah office serves Madinah");
    - competitor count −4 ("6 prequalified bidders");
    - capacity load −2;
    - planned price position +8 ("Levelled quotes put the estimate in the lower quartile of past awards");
    - local content +9 ("LC baseline 41% against a 40% minimum");
    - JV 0 ("Bidding as prime").
  - `comparables: 14`.
  - Movers:
    - "+6 pts with local content ≥ 45%";
    - "−5 pts if a 7th bidder qualifies";
    - "−3 pts if the Addendum 2 re-quote moves the price position to the median".
  - Bidders: the five competitors plus Najd.
  - T-2026-101 and B–E tenders: Phase 9.
- [x] 2.3 `inputs.ts`:
  - [x] 2.3.1 `INPUT_SPECS` for all twelve keys. Owner roles:
    - commercial → `comm`; planning → `plan`; legal → `comp`; pd → `dir`; finance → `fin`; hr → `hr`;
    - method-statement → `dir`; hse-plan → `dir`; key-cvs → `hr`; programme → `plan`; estimate → `comm`; design-basis → `dir`.
  - [x] 2.3.2 **Seeded T-2026-097 inputs**, all submitted before 7 Mar 14:10. Finance's was submitted Thu 5 Mar 15:20.
    - **Commercial:** margin 8.5–11.5%, basis "benchmark rates; levelled quotes for 7 of 9 packages", three cost risks, confidence medium.
    - **Finance:** facility figures equal to 004's `facility` with `asOf` 5 Mar, confirmed by `najd.fin`. Also bank lead time 5 working days, a working-capital note (10% advance against an APG, 10% retention, 60-day payment terms), and FX "SAR peg".
    - **Legal:** five risks with clause, page, risk and stance. Include the delay damages cap at 10% (clause 58.2, which Addendum 2 later raises to 15%), limitation of liability, design responsibility for process guarantees, ground risk at the intake, and termination for convenience. Also JV status "not applicable" and a redline posture.
    - **Planning:** 30 months against 30 required, long-lead fit (filters 30 weeks: OK), peak manpower 640, key plant, clash note, **delivery impact +9 pts**.
    - **PD:** "With conditions", named key staff (fictional; reuse 007a's personnel names only if that file exists, else your own), a site note.
    - **HR:** availability of the named staff, and the Saudization band impact "High Green band kept".
  - [x] 2.3.3 **Seeded T-2026-101 inputs:** commercial, planning, pd and hr submitted; finance **late** (due Sat 7 Mar 17:00, not submitted); legal due today 17:00, not submitted.
- [x] 2.4 `packs.ts`:
  - [x] 2.4.1 **T-2026-097 v1:** generated and issued `2026-03-07T14:10`. Snapshot:
    - eligibility "All PQ lines met at generation (16 of 16)";
    - sourcing `{ packages: 9, levelled: 7 }`;
    - portfolio `{ asOf: '2026-03-05', currentPct: 58, ifWon: [{ 'T-2026-097', 9 }, { 'T-2026-101', 4 }], safePct: 70 }`;
    - bid effort (to date 14 people-weeks, to go 9, external cost SAR 180,000);
    - recommendation `bid-with-conditions`, with the rationale, three win themes (local content, WCWS delivery record, the lower-quartile price position) and the resource ask.
  - [x] 2.4.2 **T-2026-097 re-run effects** (to v2):
    - §9.6: "Delay damages cap raised from 10% to 15% (Addendum 2, clause 58.2): risk re-rated high";
    - §9.7: margin range 8.0–11.5%, "two packages re-quoting (P-03, P-09)";
    - §9.2 and §9.1: unchanged;
    - §9.10: "Regenerated after Addendum 2".
  - [x] 2.4.3 **T-2026-101:** a draft v1 (not issued), generated `2026-03-08T08:00`.
- [x] 2.5 `positions.ts`: T-2026-097's two seeded positions (text and times above). B–E: Phase 9.
- [x] 2.6 `letters.ts`: the No-Bid decline letter template.
  - It is courteous. It thanks the employer for the opportunity, regrets not submitting on this occasion, asks to be considered for future tenders, and is signed by the Bid Manager for the tenant's legal name.
  - It **never** states internal reasons.
  - Placeholders: issuer, reference, title, date, signatory, company.

### Phase 3 — Win probability and competitors (pack §9.1, §9.2)
- [x] 3.1 `domain/gcc/s3/win.ts`: `winFor(tenant, tenderId)` returns `{ p: base + Σ points, clamped 5–95; band; drivers (sorted by |points|); comparables; lowData: comparables < 5; calibration: string; movers } | null`.
  - **Band from comparables:** ≥ 20 → ±6; 10–19 → ±8; 5–9 → ±12; < 5 → ±15 with a low-data warning.
  - **Calibration text** comes from `history.outcomes` with `predictedWin`: n, and each band's predicted vs actual (the OUT-4 bands in gcc-demo-data §5.1). Najd: "Calibrated on 33 decided bids: bands within ±10 points except under 30%, where the model is over-confident (0 of 13 won)".
  - **Check:** T-2026-097 → 58 ± 8.
- [x] 3.2 `competitors.ts`: `competitorsFor(tenant, tenderId)` gives the bidders' view models, with each claim's evidence chips (title, date, url).
  - Claims with no evidence are **dropped**, and counted in `suppressed: number` with the text "1 uncited claim suppressed (no source, no claim)". GOV-4 counts guardrail activations from this later.

### Phase 4 — Inputs (pack §9.9; the contributor side)
- [x] 4.1 `inputs.ts`: `inputsFor(tenant, tenderId, done)` merges seeded inputs with `input-req:` and `input-sub:`. Each item is `{ key; label; feeds; ownerId; requestedById; requestedAt; due; state: 'submitted' | 'outstanding' | 'late'; submittedAt?; fields? }`, where **late** means past due and not submitted.
  - Totals: `{ requested; outstanding; late }`.
  - Najd T-2026-101: outstanding 2, late 1.
- [x] 4.2 `inputRequestWrite(tenderId, key, toId, due, byId)`, `inputSubmitWrite(tenderId, key, fields, byId)` (validates the fields against `INPUT_SPECS`) and `nudgeWrite(target)`. Each returns `{ key; value; audit }`.
- [x] 4.3 `myRequests(tenant, personId, done)`: the rows of catalogue §C.6 for one contributor (tender, what, section, requested by, due, status). This is for 009b's forms; plan 013's Finance/HR requests dashboard keeps its own source until 009b reconciles them.

### Phase 5 — DG2 positions, quorum and approval (spec §10, dashboards.md §9)
- [x] 5.1 `dg2/positions.ts`:
  - [x] 5.1.1 `positionsFor(tenant, tenderId, done)` gives the seeded positions, overridden by `dg2-pos:` keys. The result:
    - `{ seats: { seat; personId; name; label; position?: { stance; comment?; conditions?; coi?; at; packVersion; bySecretary: boolean } }[] }`;
    - `recorded` (any stance, including abstain);
    - `quorum: { needed: 3; met: boolean; text: '2 of 5 positions · quorum needs 3' }`;
    - `majority: { for; against; abstain; result: 'bid' | 'no-bid' | 'none' }`, where for = support + conditions, against = oppose, and a tie or all abstaining gives `none`;
    - `onOlderVersion: Seat[]`, the positions recorded on an earlier pack version than the current one.
  - [x] 5.1.2 `positionWrite(tenderId, seat, input, byId, recordedById?)` returns `{ key; value; audit } | { error }`:
    - a comment is required for anything other than Support;
    - Conditions need at least one condition;
    - a conflict of interest forces `abstain` and records the declaration;
    - `recordedById` (the Head of Tendering as secretary) marks the position "Recorded by the secretary in the meeting".
- [x] 5.2 `dg2/decision.ts`:
  - [x] 5.2.1 `Dg2Decision`: `{ tenderId; decision: 'bid' | 'no-bid'; at; byId; againstMajority: boolean; reason?: string; reasonCodes?: string[]; conditions: string[]; packVersion: number; positionsSnapshot: …; lessons?: string }`.
  - [x] 5.2.2 `NO_BID_REASONS`: 007a's DG1 discard codes plus `price-competitiveness`, `win-probability-low` and `capacity-conflict`. Define the DG1 list locally with the same keys. Don't import it: 007a may not have finished.
  - [x] 5.2.3 `decisionState(tenant, tenderId, done)` returns:
    - `{ enabled: boolean; disabledReason?: 'Quorum needs 3 of 5 positions: 2 recorded' | 'Decision already recorded' | 'Pack is stale: re-run and issue it first (or approve with a reason)'; slaDue; slaText: '4 h 10 m left'; breached: boolean; escalation?: AuditDraft }`.
    - A stale pack **doesn't** disable approval. It adds a required acknowledgement: "I have seen that the pack is stale".
    - A breach escalates to the Head of Tendering and the CEO, as audit text.
  - [x] 5.2.4 `dg2Write(input, byId, state)` returns `{ writes; audit; effects } | { error }`:
    - `againstMajority` → a reason is required. The record carries the text "Approval differs from majority".
    - **Bid:** conditions come from the positions plus the approver's own, each becoming a tracked condition (Phase 6). Effects:
      - "Decision recorded. Planning and Commercial have been asked to start baselines.";
      - "Stage moves to Planning".
    - **No-Bid:** at least one reason code. Effects:
      - a decline letter drafted (Phase 6) when the tender is from a public portal or `invited` is non-empty;
      - "Lessons captured";
      - "Tender closed: No-Bid".
  - [x] 5.2.5 `dg2Overlay(tenant, tenderId, done)` returns `{ stage: 'S4'; since } | { stage: 'closed'; since; reason } | null`, for 009b to plug into the port.
- [x] 5.3 `dg2/record.ts`: `dg2RecordFor(tenant, tenderId, done)` gives the full record: positions with comments and times, conflicts declared, the decision with its reason and "Approval differs from majority" when relevant, the pack version and snapshot reference, the conditions, and the re-open history.

### Phase 6 — Conditions, letter, re-open
- [x] 6.1 `dg2/conditions.ts`: `conditionsFor(tenant, tenderId, done)` gives the conditions from a Bid decision: `{ id: '{TID}-C{n}'; text; fromSeat?; state: 'open' | 'closed' }`. `conditionsOpen(tenant, done)` gives DEC-9.
  - On T-2026-097, a Bid approved with the seeded positions yields "Keep the bid bond within the facility" and "Minimum margin 9%". Split the CFO's condition text on ";".
- [x] 6.2 Letter: `declineLetter(tenant, tenderId, byId)` returns the filled template, marked "Draft: the Bid Manager reviews and sends". `letterWrite(tenderId, text, sent, byId)`. "Sent" means marked sent in the demo; nothing leaves the app.
- [x] 6.3 `dg2/reopen.ts`:
  - `reopenRequestWrite` (Bid Manager or Head of Tendering; reason and trigger required);
  - `reopenApproveWrite` (the Head of Tendering);
  - `reopenState(tenant, tenderId, done)`.

  An approved re-open clears the decision, keeps it as `previous` in the record, and returns the tender to "at DG2" with the positions kept but marked as recorded on the earlier decision.

### Phase 7 — The pack (spec §9; **uses 007a**)
Start this phase once `src/domain/gcc/s1/index.ts` exports `eligibilityFor` and `addendaFor`; check with a grep. Until then, build everything else and stub nothing.
- [x] 7.1 `freshness.ts`: `freshnessFor(tenant, tenderId, done)` returns `{ version; generatedAt; issuedAt?; stale: null | { since; reason; affected: string[] }; text }`.
  - A pack is **stale** when `addendaFor()` returns an addendum received after `generatedAt` of the current version.
  - A credential renewed (`renewed:` key) after generation is also stale, but only for tenders whose eligibility used that credential.
  - **T-2026-097 text (exact):** "Pack generated 07 Mar 14:10. Stale: Addendum 2 received 08 Mar 09:12 changes 2 packages (P-03 Filtration, P-09 Pipes and valves)."
  - A `pack-rerun:` key creates version 2 with the authored `RerunEffect`s. It clears staleness and keeps v1 for comparison (`compare(v1, v2)` gives the changed sections).
  - Issuing v2 (`pack-issue:`) **doesn't** restart the DG2 clock: the clock runs from the first issue. The positions recorded on v1 show "on v1".
- [x] 7.2 `pack.ts`: `packFor(tenant, tenderId, done, viewer: { canSeeMargin: boolean })` returns the sticky summary plus sections 9.1–9.10. Each section has `{ id; title; source: string; freshness: 'current' | 'stale' | 'waiting'; waitingFor?: { inputKey; ownerName; due } }`.
  - [x] 7.2.1 **9.1** from `winFor`.
  - [x] 7.2.2 **9.2** from `competitorsFor`.
  - [x] 7.2.3 **9.3:** `eligibilityFor(…)` when the tender has requirements (a live result, with "refreshed" when it differs from the snapshot); otherwise the snapshot summary. Plus JV structure when relevant.
  - [x] 7.2.4 **9.4:**
    - bid effort (to date and to go);
    - delivery impact from the Planning, PD and HR inputs;
    - the **portfolio roll-up** from the snapshot: current + Σ ifWon ÷ safe → Najd "71% of delivery capacity if both bids win, against a safe level of 70% (101%)".
  - [x] 7.2.5 **9.5:**
    - bid bond (T-2026-097 at 2% of the estimate unless the Finance input states otherwise; validity; bank charges from the input);
    - if won: performance bond 5%, APG equal to the 10% advance, retention;
    - facility limit, utilised, committed, and headroom after this bid. Don't subtract the bond twice if `facility.committed` already holds it;
    - working capital;
    - the source "Finance / Treasury input, as of 05 Mar".
  - [x] 7.2.6 **9.6:** the Legal input's five risks, plus extraction flags if any, each with its mitigation and source. The v2 changes apply after a re-run.
  - [x] 7.2.7 **9.7:** the margin range and basis, with `masked: !viewer.canSeeMargin`. When masked, return no numbers at all, only "Masked for your role".
  - [x] 7.2.8 **9.8:** the recommendation (Bid with conditions), rationale, win themes, resource ask, and the top three risks. `pack-note:` supplies the presenter's note. Numbers are locked: the note is text only.
  - [x] 7.2.9 **9.9:** `inputsFor`, with nudge targets.
  - [x] 7.2.10 **9.10:** `freshnessFor`.
  - [x] 7.2.11 **Sticky summary:** recommendation · p ± band · value · margin range (or masked) · facility after bid · positions "2 of 5 · quorum needs 3" · SLA text · stale badge.
  - [x] 7.2.12 **T-2026-101** (preparation): sections 9.5 and 9.6 have `freshness: 'waiting'` with the owner and due. `issueBlockers()` lists the outstanding inputs. Issuing is allowed with a reason when inputs are missing, which records "Issued with 2 inputs outstanding". Issuing starts the 24 h clock.
- [x] 7.3 `lensFor(seat | 'hot' | 'bid')` gives the section the pack opens at (catalogue §C.5):
  - CFO → 9.5;
  - Technical Director → 9.6;
  - Operations Director → 9.4;
  - Sector Head → 9.1;
  - CEO, Head of Tendering and Bid Manager → the top.

### Phase 8 — Dev check `90-stage3.tsx`
Model it on `30-seed.tsx`. It reads the active tenant; Najd shows the full set.
- [x] 8.1 **Najd T-2026-097 seed:**
  - p 58 ± 8, drivers summing to +25, 14 comparables;
  - 5 bidders;
  - 1 uncited claim suppressed;
  - margin 8.5–11.5% (and masked with `canSeeMargin: false`, with no digits in the section);
  - positions "2 of 5 · quorum needs 3", majority for 2 against 0;
  - decision disabled for the quorum reason;
  - SLA "4 h 10 m left";
  - freshness text (exact);
  - portfolio "101%";
  - weighted value 205,900,000 (0.58 × SAR 355 M; DEC-4 reads it);
  - inputs all submitted.
- [x] 8.2 **Najd T-2026-101:** preparation; inputs outstanding 2, late 1 (Finance); sections 9.5 and 9.6 waiting; issue blockers 2.
- [x] 8.3 **Simulated flows**, with an in-memory `done`:
  1. The Operations Director records Support → quorum met, decision enabled (with the stale acknowledgement required).
  2. The Head of Tendering approves **No-Bid** with the majority for Bid → error without a reason. With a reason → recorded, with `againstMajority: true` and the record text "Approval differs from majority"; letter drafted; overlay → closed.
  3. Instead, approve **Bid** → two conditions from the CFO's text; overlay → S4; effects text exact.
  4. The Sector Head declares a conflict → abstain, with the declaration recorded.
  5. The Head of Tendering records the Sector Head's position as secretary → "Recorded by the secretary in the meeting".
  6. Re-run the pack → v2, stale cleared, compare shows §9.6, §9.7 and §9.10 changed. Issue v2 → SLA unchanged; the CFO's and TD's positions show "on v1".
  7. Request and approve a re-open after a No-Bid → back at DG2 with `previous` set.
  8. Oppose with no comment → error.
- [x] 8.4 **Determinism:** equal JSON on a second call. Grep for `Date.now` and `Math.random`: none.
- [x] 8.5 **B–E and agreement** (after Phase 9).

### Phase 9 — B–E and agreement with 017 (**waits for 017 DONE**)
- [x] 9.1 When 017 is DONE (or DONE — awaiting review), read the `s3` facts for T-2026-101 (win, if any) and for B–E's Stage 3 tenders:
  - Corniche T-2026-029, pack in preparation;
  - Qurain T-2026-049, at DG2;
  - any others 017 created.
- [x] 9.2 Author their win models, seeded inputs (with 017's item ids in `itemId`), pack versions and positions so that `recorded`, `bySeat`, `win`, `marginRange`, `inputs` and `stale` match exactly. **Done except three win bands, which the band rule cannot produce (see Blockers).**
- [x] 9.3 Add rows to the dev check asserting agreement for every Stage 3 tender in every tenant: yours against 017's `s3`, including T-2026-097's `bySeat` (017 amendment).
- [x] 9.4 If 017 isn't done when you reach this phase, finish Phases 1–8 and write "Phase 9 waiting for 017" in the report; the orchestrator will resume you.

## Data and derivation
- **New facts** are in `src/data/gcc/s3/`:
  - competitors and evidence (synthetic, `.example` URLs);
  - win models;
  - input specs and seeded inputs;
  - pack versions, snapshots and re-run effects;
  - seeded positions;
  - the letter template.
- **Derived** in `src/domain/gcc/s3/` and `src/domain/gcc/dg2/`: win probability and band, competitor view models with suppression, inputs and requests, freshness and versions, the pack, lenses, positions and quorum, majority, the decision state and record, conditions, letters, re-open, and overlays.
- **New `done` keys:** listed above. This plan writes none. Reset demo clears them.

## Acceptance checks
- [x] typecheck and build pass (parallel rules apply).
- [ ] The 90-stage3 panel shows every target met in Najd, and in B–E after Phase 9. There are no console errors. **All met except the three win-band rows (Blockers); no console errors.**
- [x] The Indian tenant is unchanged.
- [x] No page files. No numbers typed into the panel except its `EXPECT` table. No role checks: margin masking is a parameter the page supplies.
- [x] Only the files in Scope are touched (`git status` in the report).
- [x] All competitor, evidence and people names are fictional. All URLs use `.example` hosts.

## Execution report
(Executor. Phases 1–8 on 2026-09-25; Phase 9 on 2026-09-26, after 017 was done. One question is open: the win bands, under Blockers.)

- **Changed files** (all in this plan's folders; `git status` shows nothing else of mine):
  - `src/data/gcc/s3/`: `types.ts`, `competitors.ts`, `win.ts`, `inputs.ts`, `packs.ts`, `positions.ts`, `letters.ts`, `index.ts`.
  - `src/domain/gcc/s3/`: `done.ts`, `win.ts`, `competitors.ts`, `inputs.ts`, `versions.ts` (extra), `freshness.ts`, `pack.ts`, `index.ts`.
  - `src/domain/gcc/dg2/`: `keys.ts` (extra), `positions.ts`, `decision.ts`, `conditions.ts`, `letter.ts` (extra), `reopen.ts`, `record.ts`, `index.ts`.
  - `src/pages/gcc/dev-checks/90-stage3.tsx`.
  - `app/plans/README.md`: my index row only.
- **Phase 9 (B–E and agreement with 017):**
  - **Stage 3 tenders in 017's lifecycles:** Najd T-2026-097 and T-2026-101, Corniche T-2026-029, Qurain T-2026-049. Dafna and Batinah have none, as dashboards.md §12.5 says.
  - **Authored:**
    - win models for T-2026-101 (47), T-2026-029 (44) and T-2026-049 (52). Each base is the sector's hit rate from `history.outcomes` (Water and wastewater 7 of 21, Buildings MEP 5 of 13, Water 5 of 16), and the drivers sum to 017's `p`;
    - seeded inputs for T-2026-029 (commercial and planning in, Finance due Mon 9 Mar) and T-2026-049 (commercial and Finance in; the Finance facility equals Qurain's 004 facility);
    - pack versions: T-2026-029 as a draft generated 06 Mar 13:00; T-2026-049 generated 08:15 and issued 08:30 (the register's `packIssuedAt`);
    - the Technical Director's Support on T-2026-049 at 09:45;
    - 017's item ids (`{TID}:{key}`) as `itemId` on every seeded input, so nudges use the same `nudged:{itemId}` key as plan 015.
  - **Dev-check rows for every Stage 3 tender in every tenant**, against 017's `s3`: pack and first issue, inputs (totals, plus every item's id, what, section, owner, requester, requested, due and submitted), stale (presence and `since`), positions (`recorded` and each `bySeat` entry, including T-2026-097's CFO and TD), win, margin range, facility after the bond, and weighted value. **All agree except the three win bands** (Blockers).
- **Verification:**
  - `tsc --noEmit`: 0 errors in the whole app (017's earlier errors are fixed). `vite build` passes (built to a scratch folder); the dev panel and its raw-source glob are not in the production bundle.
  - Browser: headless Chrome over DevTools, fresh profile, `/dev/checks` in each tenant. **0 console errors or exceptions in every tenant.**
    - Najd: 71 of 72 targets met.
    - Corniche: 9 of 10 met.
    - Qurain: 9 of 10 met.
    - Dafna and Batinah: 2 of 2 met (no Stage 3 tenders).
    - The only failing rows are the three win bands.
    - The Indian tenant keeps its legacy screens; the GCC-only dev route doesn't render there.
  - The Najd rows cover 8.1–8.4 as before: 58 ± 8, +25, 14 comparables, 5 competitors of 6 bidders, 1 uncited claim suppressed, margin 8.5–11.5% and masked with no digits, "2 of 5 · quorum needs 3", quorum disabled, "4 h 10 m left", the exact freshness text, 101%, SAR 205,900,000, SAR 88.9 M, T-2026-101's 2 outstanding and 1 late, all eight flows, determinism, and no `Date.now` or `Math.random`.
  - Cross-plan agreement rows also pass: the Finance input equals 004's facility, `packIssuedAt`, the safe level, Planning's delivery impact, the sourcing basis, the base rate against history, the bidder count, Tihama's partner lists, and 007a's `DISCARD_REASONS` (the same 14 codes and labels).
  - This plan writes no `done` keys. The panel runs every flow on an in-memory map; 009b writes through `mark()`, which Reset clears.
- **Deviations from plan:**
  1. **Three extra files inside my folders:**
     - `s3/versions.ts`: pack versions without 007a;
     - `dg2/keys.ts`: value types, `roundOf` and `activeDecision`, to avoid circular imports;
     - `dg2/letter.ts`: step 6.2 had no file.
  2. **A Finance field `bondCharges` (% a year)**, not in catalogue §C.6. Step 7.2.5 needs bank charges from the input, and §C.6 has no field for them.
  3. **`PackSnapshot.bonds`** (bid %, validity, performance %, advance %, retention %, source) holds the guarantee terms. `PackSnapshot.eligibility` is `{ met, of, credentialIds }`; `credentialIds` drives the "renewed credential" staleness rule.
  4. **`RerunEffect` gained `changed` and an optional `patch`** (`margin`, `marginNote`, `risk`), so a re-run changes numbers. The §9.7 change line is composed from the patch and masked for viewers without margin access.
  5. **Re-open uses a decision round instead of deleting keys:** `round` on `dg2:`, `dg2-pos:` and `dg2-reopen-req:`, and `round` plus `previous[]` on `dg2-reopen:`. Demo actions all happen at 10:00, so time order can't tell a new decision from a re-opened one.
     - `pack-issue:` gained `firstAt`, `reason` and `outstanding`; `pack-rerun:` gained `earlier[]`.
     - All are additions. No other plan reads these keys.
  6. **Stale does not disable approval.** The "Pack is stale: re-run and issue it first (or approve with a reason)" text is `staleAck.warning`, and approval needs the acknowledgement. The acknowledgement is also required while a re-run is not yet issued: the committee still holds the stale version.
  7. **Extra `disabledReason` values:** "Pack not issued to the committee yet" and "Decision already recorded".
  8. **Signature changes:**
     - `dg2Write`'s `state` is `decisionState()`'s result;
     - `nudgeWrite(target, byId, detail?)`;
     - `positionWrite`'s input carries `packVersion` and `round`;
     - the re-open writers take `(tenant, tenderId, done, …)`.
  9. **Commercial `basis` reads "… and levelled quotes for n of m packages"**, so §9.7 reads like the spec.
  10. **Tihama's `alsoPartnerOf` is `['najd', 'dafna']`:** both seeds list it as a partner. The dev check asserts it.
  11. **The breach escalation's actor is `'agent.sla'`**, not a person.
  12. **Fictional PD key staff** of my own (007a's `personnel.ts` did not exist when I wrote the inputs).
  13. **Phase 9: `facilityAfter` is always given.** It is the Finance input's headroom once submitted, else the company facility Finance confirmed (the DEC-6 figure), minus this bid's bond. `facilityAfterBasis` says which. 017 computes it the same way for tenders whose Finance input is still due.
  14. **Phase 9: `weightedValue` only once the pack is issued**, as 017's step facts have it (DEC-4 counts tenders with a pack before the committee).
  15. **Phase 9: calibration doesn't judge a band with fewer than `MIN_N` (5) bids** (dashboards.md §2's small-sample rule). Najd's text is unchanged. Without the rule, Corniche's and Qurain's text would call bands with 1–3 bids "under-confident".
  16. **Phase 9: the decline letter quotes the lifecycle's `source.ref`** (017), so it matches the tender header. The interim `EMPLOYER_REFS` table is removed.
  17. **Phase 9: delivery-load figures for B–E packs.**
      - Qurain: current 66% and +12, from plan 015's text.
      - Corniche: current 55% and +7, which I picked inside 015's "50–60%, +5–10" range.
      - **015 should use these two figures** (or 009b reconciles them).
  18. **Phase 9: no competitor bidders for T-2026-101, T-2026-029 or T-2026-049.** gcc-demo-data §7 covers only the hero and T-2026-097, so §9.2 says "No competitor intelligence on record yet".
- **Blockers / questions:**
  - **Win bands (for the orchestrator; the user chose to leave this to you, 2026-09-26).** 017's interim facts give T-2026-101 **47 ± 10**, T-2026-029 **44 ± 9** and T-2026-049 **52 ± 9**. This plan's band rule (step 3.1) produces only ±6, ±8, ±12 or ±15, so 009a derives 47 ± 12 (8 comparables), 44 ± 8 (11) and 52 ± 8 (12). Those three rows fail. Two ways to close it:
    - **(a)** edit 017's three `band` values in `lifecycle/live/{najd,corniche,qurain}.ts` to 12, 8 and 8 (the executor's recommendation: the plan's rule stays);
    - **(b)** replace the step table with `band = round(30 ÷ √comparables)`. That keeps ±8 at 14 comparables and ±15 under 5, and gives ±10, ±9 and ±9 at 9, 11 and 12 comparables. I would then set those comparables.
    - **Answer:** Decided 2026-09-26: 009a's rule stands (band from the comparable count); 017's three bands were changed to 47 ± 12, 44 ± 8, 52 ± 8.
- **Follow-ups noticed (not done):**
  - **T-2026-097's employer reference disagrees between plans.** The lifecycle (017's `refFor`) says `WCWSC/PRJ/2026/0097`, but 004's intake event IN-0308-09 and 007a's Addendum 2 say `WCWS/PRJ/2026/0009, Addendum 2`. The letter follows the lifecycle; 004 and 017 should agree on one.
    - Decided 2026-09-26: `WCWS/PRJ/2026/0009`, 004's reference. Plan 020 lane B (B4) makes the lifecycle agree.
  - The decline letter signs "For and on behalf of" the tenant's `legal` string ("Najd Arcline Contracting Company, closed joint stock company, Riyadh"). A shorter signature name on the tenant profile would read better.
    - Decided 2026-09-26: sign with the tenant's display name ("For and on behalf of Najd Arcline Contracting Co."). Plan 020 lane E (E15) makes the change.
  - 017's `withDemoState` still returns the seed. 009b plugs in `dg2Overlay`, and replaces the interim `s3` facts with these derivations (the agreement rows are in place).
  - 015's `DELIVERY_LOAD`: check it against `PackSnapshot.portfolio` once 015 exists.
  - `myRequests` and plan 013's Finance/HR requests source: 009b reconciles them, as planned.
