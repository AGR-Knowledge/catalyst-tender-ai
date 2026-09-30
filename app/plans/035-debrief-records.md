# 035 — Debrief records and rules

Status: DONE (2026-09-30, reviewed) · Depends on: wave 10b (committed `2ebb1ce`) and the wave 11 contract (below) · Can run in parallel with: 036, 037

## Goal
Every bid that ends has a debrief record: why it was won, lost or stopped, and what we learned. Each one is recorded by the Project Director and accepted, or sent back, by the Head of Tendering. The 12-month history already holds these records on demo day, so the archive has data. An accepted debrief moves Stage 9 on ("Lessons captured"), and every screen reads the same reasons. This plan builds the data and rules and no screens. Plans 036 (the workspace tab) and 037 (the archive) render them.

## Context
- **Why:** user request of 2026-09-30. When a tender reaches its end (won, lost, or interrupted part-way), the tender's Project Director gives feedback in a form: why we lost, or what mainly won it. The records build an archive, so the KPI team can analyse history tender by tender. product-foundation.md pain 5: "win/loss reasons live in emails and memory". Stage 9 is "Post-Award Oversight & Learning" (`data/gcc/stages.ts:83-87`): owned by `dir`, steps `result-received` → `handover-or-debrief` → `lessons-captured`.
- **User decisions (2026-09-30):**
  - **Every ending** gets a debrief: won, lost, cancelled by the employer, withdrawn, No-Bid at DG2, rejected at DG3. DG1 discards don't (never pursued, and DG1 already records a reason).
  - **The Project Director records it; the Head of Tendering accepts it or sends it back.** Both names and times are kept.
  - **No new role.** The Head of Tendering, the CEO and committee members read the archive; so do Bid Managers, for their own tenders.
- **The wave 11 contract (written by the orchestrator, typecheck passes):**
  - `data/gcc/debriefs/vocab.ts`: every word, plus the types `Ending`, `EndingGroup`, `DebriefStatus`, `LossReason`, `LessonArea` …, `LOSS_LABEL` and `labelOf`. **This plan owns it from here and may only add to it.**
  - `domain/gcc/debriefs/types.ts`: `DebriefCtx`, `DebriefInput`, `DebriefRecord`, `DebriefFacts`, `DebriefVM`, `ArchiveFilters`, `ArchiveRow`, `ArchiveVM`. **You may add optional fields; never rename or remove one.**
  - `domain/gcc/debriefs/keys.ts`: `debrief:{TID}`, `debrief-back:{TID}`, `debrief-ok:{TID}`, `DEBRIEF_PREFIXES`.
  - `domain/gcc/debriefs/index.ts`: **stubbed** `endingOf`, `debriefFor`, `draftFor`, `validateDebrief`, `debriefSubmitWrite`, `debriefAcceptWrite`, `debriefBackWrite`, `archiveFor`, `isDebriefError`. **This plan replaces every body and keeps every signature.** Plans 036 and 037 import only from `index.ts`.
  - `data/access.ts`:
    - capabilities `debrief.view`, `debrief.record`, `debrief.accept`, with their `CAP_TEXT`;
    - grants: `hot` view + accept (tenant); `exec` and `member` view (tenant); `dir` view + record (tenant); `bid` view (assigned).
    - The Head of Tendering never records and the Project Director never accepts.
  - `docs/…/s1-s3-demo-spec.md` §20: a skeleton; 036 and 037 fill it.
- **Current behaviour:**
  - The end states are on the lifecycle (`data/gcc/lifecycle/types.ts:46-68, 187-243`):
    - `result` (`won | lost | withdrawn | cancelled`, `rank`, `gapToWinnerPct`, `lossReason`, `predictedWin`, `value`);
    - `closedAt`, `closedAs` (`discarded | no-bid | rejected | withdrawn | won | lost`; **no `cancelled`**), `closedNote`;
    - the events `lessons` and `handover`;
    - `S9Facts.debriefAt`.
  - How each ending is stored today:
    - a result cancelled after opening is `result:'cancelled'` + `closedAs:'withdrawn'` (`generate.ts:286-289`; Najd T-2025-412, T-2025-438 at `live/najd.ts:444-463`);
    - a withdrawal or employer stop before submission is `closedAs:'withdrawn'` with only a `closedNote`. The generator's list is `generate.ts:181-184` (employer: "cancelled", "postponed indefinitely", "re-scoped … to re-tender"; ours: "Supplier quotes could not meet the local content minimum", "The JV partner withdrew"). There are more fixed notes at `generate.ts:255,280,289`, `fold.ts:250,271,274` and the live rows (`live/*.ts`);
    - a DG1 Hold that lapsed also closes `withdrawn` with no Pursue (`fold.ts:269-272`). **It is not a bid.**
  - Lessons (`fold.ts:145-152`): 85% of past results get a lessons event 3–8 working days after the result, 10% after 16–25 days, and 5% never. A lost tender closes at its lessons event: see T-2025-255 (`live/najd.ts:348-357`, `close: { at: lessons, as: 'lost', note: '…; lessons captured' }`).
  - The Stage 9 step comes from the lessons event (`chain.ts:213-219, 286-289`).
  - Stage 9 readers of "lessons":
    - `hasLessons` (`domain/gcc/kpi/stage9.kpi.ts:29`);
    - RES-3 (`:116-133`);
    - the `lessons.record` action (`domain/gcc/actions/stages.actions.ts:413-426`);
    - the port's `lessons` flag (`domain/gcc/lifecycle.port.ts:186`);
    - the `s9.lessons` column (`components/dashboard/columns/stages.cols.tsx:342-345`).
  - `debrief.hold` (`stages.actions.ts:391-411`) reads `facts.debriefAt`. Every Stage 9 action only opens the tender.
  - Stage 9 dashboard spec: `domain/gcc/dashboards/stages.dash.ts:96-103`. Home dashboards: `portfolio.dash.ts:40-57` (`portfolio.hot`, `.exec`, `.bid`).
  - Loss-reason words exist in several copies: `stage9.kpi.ts:16`, `record.ts:60` (plan 037's file), `stages.cols.tsx:337` ("Technical score"), and the in-sentence forms in `lifecycle.port.ts:243`.
  - Competitors: `data/gcc/s3/competitors.ts` has KSA ×5 (`hijr`, `sahab`, `al-masar`, `tihama`, `istria`), UAE ×3 (`tessaline-mep`, `sarab-bs`, `brevanne`) and Oman ×3 (`liwa-highways`, `shinas-bridges`, `mahda-infra`). There are none for Qatar or Kuwait.
  - Demo state: `mark()` values are strings (JSON). Writers return `{ writes, audit, effects }`; see DG3's `dg3Write` (`domain/gcc/dg3/decision.ts:154-193`). Appliers live in `domain/gcc/demo/*.apply.ts`, sorted by file name; the contract is in `demo/types.ts` (pure, reads only its own keys). Stamps come from `nextAt()`.
- **Read first:**
  - `/CLAUDE.md`;
  - `app/plans/README.md` (architecture decisions; the wave 11 section);
  - `docs/07-product-design/agr-product-definition/dashboards.md` §2 (periods), §3 (tiles), §10.12 (Stage 9) and §12 (lifecycles);
  - `roles-and-access.md` §matrix (row "Record award or loss outcome, debrief", line ~516) and §4 B9;
  - `kpi-and-screen-catalogue.md` §A.5;
  - `gcc-demo-data.md` (tenants; GCC facts with sources);
  - `ui-direction.md` §7.3 and §10.

## Design

### Endings (`endingOf(l)`)
- **Only bids:** lifecycles with a DG1 gate decided `pursue`. Everything else returns null: live, a DG1 discard, a lapsed DG1 hold.
- **Mapping:**

| Lifecycle | Ending | Ended at |
| --- | --- | --- |
| `result.result === 'won'` / `'lost'` | `won` / `lost` | `result.at` |
| `result.result === 'cancelled'` | `cancelled` | `result.at` |
| `closedAs === 'withdrawn'`, no result, `STOP_NOTES[note].by === 'employer'` | `cancelled` | `closedAt` |
| `closedAs === 'withdrawn'`, no result, otherwise | `withdrawn` | `closedAt` |
| `closedAs === 'no-bid'` | `no-bid` | the DG2 gate's `at` |
| `closedAs === 'rejected'` | `rejected` | the DG3 gate's `at` |

- **`STOP_NOTES`** (`data/gcc/debriefs/stops.ts`): `Record<string, { by: 'employer' | 'us'; reason: string }>`. It maps every `closedNote` a withdrawn bid carries, in all five tenants, to who stopped it and a `CANCEL_REASONS` or `WITHDRAW_REASONS` id. A note missing from the table reads `withdrawn` / `other`, **and dev check row 2 fails**.
- **Due and status:**
  - due = ended date + `DEBRIEF_DUE_DAYS` (14) calendar days, the rule `lessons.record` uses today;
  - the status is `accepted` (an acceptance of the latest submission), else `sent-back` (a send-back later than the latest submission), else `submitted`, else `due` (the demo clock ≤ the due date, 23:59), else `overdue`.

### The record and its sources
- **Seed** (data, built once per tenant from `LIFECYCLES[tenant]` with no demo state): one `DebriefRecord` per ended bid. Its submission and acceptance times are never after `DEMO_NOW` (Sun 8 Mar 2026, 10:00).
- **Demo:** `debrief:{TID}` overrides the seed's submission; `debrief-back:` and `debrief-ok:` add a send-back and an acceptance. A demo round is the seed's round + 1.
- **An ending made in the demo** (a live DG2 No-Bid or DG3 Reject, through the existing appliers) has no seed record. It reads `due` from its ended time.

### What an accepted debrief changes (the applier `domain/gcc/demo/60-debrief.apply.ts`)
It runs on `debrief-ok:{TID}` for the round of the latest `debrief:{TID}` only. A demo submission that is still unaccepted changes nothing. The applier imports `keys.ts`, the vocabulary and `readDone`, **never `domain/gcc/debriefs/index.ts`**, which would loop through `lifecycle.ts`.
- **Won or lost:**
  - add `{ kind: 'lessons', at }` to `events`, unless one exists at or before `at`;
  - a live Stage 9 lifecycle gets the log entry `{ stage: 9, step: 'lessons-captured', at: later(at, current.at), ownerId: the Stage 9 owner }`;
  - **lost:** it closes as T-2025-255 does: `closedAt: at`, `closedAs: 'lost'`, `closedNote: 'Lost on {the loss reason, in-sentence}; lessons captured'`;
  - **won:** it closes only if a `handover` event is at or before `at` (`'Won; handed over and lessons captured'`). Otherwise it stays live at Stage 9, where RES-2 still asks for the handover.
- **Lost, with the submission's main reason ≠ `result.lossReason`:** `result.lossReason` becomes the submission's. The result's original reason stays in the record (`DebriefFacts.lossReason` reads the seed lifecycle), and the submission's `mainNote` gives the reason. OUT-6, the tracker line, the Stage 9 table and Bid record follow.
- **Lost or won, with `place` given and no `result.rank`:** `result.rank` becomes `place`.
- **Stopped endings:** the lifecycle is already closed, so nothing changes.

### Who does what
- **Writers** check `can()` with `{ tender: tenderCtx, viewAs }`:
  - `debriefSubmitWrite` needs `debrief.record` and a status of `due`, `overdue` or `sent-back`;
  - `debriefAcceptWrite` and `debriefBackWrite` need `debrief.accept` and the status `submitted`. The send-back note is required (at least 10 characters).
- **Audit:** every write logs one entry with `target: TID`, so it shows in the tender's Decisions & audit (`auditTargets.ts`). The actions are "Debrief submitted", "Debrief re-submitted", "Debrief sent back" and "Debrief accepted". The detail names the ending and the main reason.
- **Effects:** one sentence each; the first is the toast. For example:
  - submit: "Sent to Faisal Al-Harbi for sign-off", then "Once accepted, it joins the archive and Stage 9 reads Lessons captured". When the main reason changes: "On acceptance the loss reason reads Technical on every screen; the result's Price stays in the record";
  - accept: "Accepted into the archive", then "T-2025-270 closes: lessons captured";
  - back: "Sent back to Mohammed Al-Ghamdi with your note".

### Form rules (`validateDebrief`, sentences in UK English)

| Section | Applies to | Rule |
| --- | --- | --- |
| 1 Main reason | all | Required, from the ending's list: `WIN_REASONS`, `LOSS_REASONS`, `CANCEL_REASONS` or `WITHDRAW_REASONS`. No-Bid and rejected have none (null): the gate's reasons stand. Lost: a reason different from the result's needs `mainNote`. |
| 2 Factors | all | 1 to `MAX_FACTORS` `FACTORS` ids, no repeats. |
| 3 Competition | won, lost | Lost: `rivalId` required (a rival, `other` or `unknown`). Won: optional. `place` only when the result has no rank: place ≥ 1, bidders ≥ place, bidders ≤ 20. |
| 4 Employer's debrief | won, lost, cancelled | A state is required. `held` needs a date not after the demo clock and `said` of at least 20 characters. `booked` needs a date. |
| 5 Lessons | all | 1 to `MAX_LESSONS`, each with an area and at least 20 characters. **No money:** a lesson that contains a currency code (SAR, AED, QAR, OMR, KWD, USD) or a figure with "M"/"bn" is refused ("Keep prices out of lessons: Bid record holds them"). |
| 6 Next time | all; `stoppedEarlier` for withdrawn, No-Bid, rejected | `bidAgain` required. `stoppedEarlier` is required where it applies. `wouldLetUsBid` is optional. |

- **`DebriefVM.sections`:**
  - `competition`: won, lost;
  - `employer`: won, lost, cancelled;
  - `bidAgain`: all;
  - `stoppedEarlier`: withdrawn, No-Bid, rejected.
- **`draftFor(vm)`:**
  - after a send-back, the latest submission;
  - otherwise lost gets `main: facts.lossReason`;
  - `employer` is pre-set from `facts.employerDebriefAt`: `held` with that date if it is at or before the clock, else `booked`;
  - everything else starts empty.

### The seed's content (generated, deterministic)
- **Stream:** `rngOf(\`debrief:${tenderId}\`)` (`data/gcc/lifecycle/rng.ts`), never the lifecycle generator's. No lifecycle, id or date moves.
- **Status, which agrees with Stage 9 by construction:**
  - **Won and lost:** accepted **exactly when** `hasLessons(l)`, accepted at that event's `at` by the tenant's Head of Tendering. Submitted one working day earlier (10:00–16:00, never before the ending) by the tenant's Project Director. Without a lessons event, there is no submission.
  - **Stopped endings:** about 80% get a submission 3–8 working days after the ending, accepted 1–2 working days later. A time after `DEMO_NOW` is dropped: the debrief is then due or submitted.
  - **Featured records** (below) may set their own status.
- **Content, from the facts:**

| Field | Rule |
| --- | --- |
| Main | lost: `result.lossReason` (`other` if absent). Won: price 35, technical 20, track-record 15, local-content 10, programme 8, alternative 6, partner 6. Cancelled and withdrawn: `STOP_NOTES` reason. No-Bid and rejected: null. |
| Factors | 1–3, weighted by the main reason (price → price-level, quotes, terms; technical → technical, bid-quality, clarifications; local content → local-content, quotes, partner; pq → credentials, partner; won → the main's factor plus relationship or programme). |
| Rival | lost: 75% one of the tenant's rivals, weighted so one or two recur and "Who beats us" has a clear leader; 15% `other`; 10% `unknown`. Won: 60% our closest rival. |
| Place | never set in the seed: the result holds it. |
| Employer | government employers: 60% held (with `said`), 20% not offered, 20% not asked. Private employers: 30% held. Won: 40% held. |
| Lessons | 1–3 from templates keyed by ending × main reason, each with an area. Slots: the employer's short name, the sector, the rival's name, our place and the number of bidders, weeks. **No money, no percentages of price, no gap to the winner.** GCC terms only as gcc-demo-data.md uses them (local content; ICV in the UAE and Oman). At least 4 templates per common key (price loss, technical loss, a win by price, a win by track record, No-Bid), so the archive doesn't repeat itself. |
| Bid again | lost: yes 65, conditions 25, no 10. Won: yes 90, conditions 10. Stopped: yes 60, conditions 30, no 10. |
| Stopped earlier | No-Bid: dg1 40, before-sourcing 25, right-time 35. Rejected: before-sourcing 50, right-time 50. Withdrawn: dg1 30, before-sourcing 30, right-time 40. |

- **Rivals** (`data/gcc/debriefs/rivals.ts`): `RIVALS: Record<GccTenantKey, { id: string; name: string }[]>`.
  - Najd: the five KSA competitors. Corniche: the three UAE. Batinah: the three Omani. Names come from `COMPETITORS`, never retyped.
  - Dafna (Qatar) and Qurain (Kuwait): three **new** synthetic contractors each.
  - Web-search every new name for a real firm before adopting it (the repo is public; commit-policy rule). Record the search in the report.
- **Featured** (`data/gcc/debriefs/featured.ts`), hand-written in a Project Director's voice, about two per tenant:
  - Najd **T-2025-255** (lost, technical, 4 of 7, lessons 1 Mar): Accepted.
  - Najd **T-2025-438** (cancelled after opening, 12 Feb): **Submitted, waiting for the Head of Tendering**, so Faisal has a debrief to accept on demo day.
  - One accepted win per tenant from its 12-month endings. List your picks in the report.
- **Left due for the live demo** (a dev check pins these):

| Tenant | Tender | Status on demo day |
| --- | --- | --- |
| Najd | T-2025-270 (lost on price, 2 of 6, 5 Mar; the employer's debrief booked Thu 12 Mar 11:00) | Due |
| Najd | T-2025-262 (won, 24 Feb) | Due by 10 Mar |
| Corniche | T-2025-120 (lost on local content, 4 Mar; booked 11 Mar) | Due |
| Dafna | T-2025-333 (won 11 Feb, no lessons) | Overdue |
| Batinah | T-2025-120 (won 4 Mar) | Due |
| Qurain | T-2025-352 (won 22 Feb) | Due, today |

- **Examples** (`data/gcc/debriefs/examples.ts`): `DebriefInput`s for the presenter's "Fill in an example" (a demo control in 036). They cover Najd T-2025-270, Najd T-2025-262, Corniche T-2025-120, and **Najd T-2026-097 after a live DG2 No-Bid** (script C). Each must pass `validateDebrief` (dev check). `DebriefVM.example` carries it.

### Needs your action
- **New file `domain/gcc/actions/debrief.actions.ts`,** `ACTION_SOURCES` with two sources, each with `cap: 'debrief.view'`. Other viewers see the rows read-only as "Waiting on …", as the other Stage 9 rows do.
  - **`debrief.record`:**
    - rows: debriefs that are `due`, `overdue` or `sent-back`, whose ending falls in the 30 days to the clock, or whose lifecycle is live at Stage 9;
    - type "Debrief", orange when overdue or sent back;
    - text, by ending:
      - lost: "Lost {date} on {reason}, ranked 2 of 6: record why. Debrief with the employer booked Thu 12 Mar, 11:00". This absorbs `debrief.hold`'s wording;
      - won: "Won {date}: record why we won while the team remembers";
      - stopped: "No-Bid at DG2 {date} ({reasons}): record what we learned";
      - sent back: "Sent back by Faisal Al-Harbi: "{note}"";
    - due: the date, or "Overdue since {date}" in orange;
    - waiting on: the Project Director;
    - primary: a route "Record the debrief" → `/tenders/{TID}?tab=debrief`.
  - **`debrief.accept`:**
    - rows: `submitted` debriefs;
    - text: "{Ending} {date}: recorded by Mohammed Al-Ghamdi, {when}";
    - waiting on: the Head of Tendering;
    - primary: "Review the debrief" → `/tenders/{TID}?tab=debrief`.
- **Remove** `lessons.record` and `debrief.hold` from `stages.actions.ts` and its `ACTION_SOURCES`. `debrief.record` covers both, and one tender must not show twice.
- **Dashboard lists:**
  - Stage 9 (`stages.dash.ts`) actions become `['handover.start', 'debrief.record', 'result.chase']`;
  - `portfolio.hot` and `portfolio.exec` gain `'debrief.accept'` (`portfolio.dash.ts`).

### KPIs: new `domain/gcc/kpi/debrief.kpi.ts`, `cap: 'debrief.view'` on each
- **Every tile's shape:** one detail line and one `ref` line, never empty (plan 027e's rule), with a full ⓘ (means, counted, target, source) and a drill to the tender ids.

| ID | Label | Kind | Value · detail · ref |
| --- | --- | --- | --- |
| DBR-1 | Endings | flow | "38" · "9 won · 24 lost · 5 stopped" · "Since 9 Mar" |
| DBR-2 | Debriefs accepted | flow | "82%" (accepted ÷ endings; under `MIN_N` show "4 of 5") · "31 of 38 endings" · "Target · 100%"; tone from `RATE_BANDS['DBR-2']` (green 100, orange from 80, as RES-3) |
| DBR-3 | Awaiting sign-off | state | "1" · "Oldest waiting 3 days" · "Oldest · T-2025-438" (or "None"); orange after 2 working days |
| DBR-4 | Debriefs overdue | flow | "3" · "Oldest ended 12 Jan" · "Oldest · T-…"; orange if more than 0, green at 0 ("None overdue") |
| DBR-5 | Why we win | flow | the top main win reason (a tie shows both) · "Price 3 · Technical 2" · "Since 9 Mar · 9 wins" |
| DBR-6 | Who beats us | flow | the rival named most often as the winner · "5 of 21 losses" · "Sectors · Water" |

- **Counting:**
  - DBR-1, DBR-2, DBR-4, DBR-5 and DBR-6 count endings whose ended time is in the window;
  - DBR-5 and DBR-6 read accepted debriefs only;
  - DBR-3 is a state (the whole company now).
- **`data/gcc/targets.ts`:** `DEBRIEF_DUE_DAYS = 14`, `RATE_BANDS['DBR-2']` and `DBR3_WAIT_DAYS = 2`.
- **`stage9.kpi.ts`:**
  - RES-3's `counted` reads "Results received in the period with an accepted debrief ÷ results received in the period";
  - its `LOSS` map is replaced by an import of `LOSS_LABEL` from the vocabulary.
- **`stages.cols.tsx`:** `s9.lossReason` reads `LOSS_LABEL`, so "Technical score" becomes "Technical".

## Scope
- **Files to create:**
  - `data/gcc/debriefs/{stops,rivals,generate,featured,examples,index}.ts`;
  - `domain/gcc/debriefs/{endings,records,form,writers,archive}.ts`, or a similar split (your call);
  - `domain/gcc/demo/60-debrief.apply.ts`;
  - `domain/gcc/actions/debrief.actions.ts`;
  - `domain/gcc/kpi/debrief.kpi.ts`;
  - `pages/gcc/dev-checks/74-debriefs.tsx`.
- **Files to change:**
  - `domain/gcc/debriefs/index.ts`: replace the stub bodies, keep every signature and export;
  - `domain/gcc/debriefs/types.ts`: optional fields only;
  - `data/gcc/debriefs/vocab.ts`: additions only;
  - `domain/gcc/actions/stages.actions.ts`: remove the two sources;
  - `domain/gcc/dashboards/stages.dash.ts` (Stage 9 actions) and `portfolio.dash.ts` (two lists);
  - `domain/gcc/kpi/stage9.kpi.ts`, `components/dashboard/columns/stages.cols.tsx` (`s9.lossReason` only), `data/gcc/targets.ts` (append);
  - the dev checks whose pins your changes move. Expect `60-stages.tsx` (Stage 9 actions) and `50-portfolio.tsx` (home actions). List every moved pin in the report, with the before and after values.
- **Docs:**
  - `roles-and-access.md`: split the matrix row "Record award or loss outcome, debrief" into "Record award or loss outcome" (unchanged) and "Record the debrief": PD **E**, HoT **A** (accept or send back), Exec V, Committee V, BM V own;
  - `kpi-and-screen-catalogue.md` §A.5: DBR-1 to DBR-6;
  - `ui-direction.md` §7.3: "Debrief: Due {date} · Overdue · Submitted {date} · Sent back · Accepted {date}";
  - `dashboards.md` §10.12: Stage 9's action list, and the Head of Tendering's and CEO's home action lists.
  - Edit only those sections; plan 037 edits catalogue and dashboards.md sections of its own.
- **Out of scope** (stop and ask):
  - any screen: `pages/**` except your dev check (plans 036 and 037);
  - `data/access.ts` (the contract already holds the capabilities; 037 edits `NAV_GCC`);
  - `domain/gcc/company/**` (037);
  - the lifecycle generator and seeds (`data/gcc/lifecycle/**`), which must not move;
  - a live "Record the result" on Stage 8;
  - new libraries.

## Demo-grade rules
- Build what the screens need. No rule beyond the Design above.
- Content quality matters more than rigour. Read 20 generated debriefs in Najd and 10 in another tenant. They must read like a real Project Director wrote them, varied and specific, with no money.
- The dev check is about 15 rows, each across the five tenants.
- **Non-negotiables:**
  - the same tender never disagrees between screens (Accepted ⇔ Lessons captured; the loss reason);
  - masking and scope are right (a Bid Manager reads only their own tenders' debriefs);
  - Reset returns the seed.

## Steps

### Phase 1 — Endings
- [x] 1.1 `data/gcc/debriefs/stops.ts`: collect every `closedNote` of a withdrawn lifecycle in the five tenants (print them from `LIFECYCLES` in a scratch script, not in the repo). Classify each. Acceptance: no note is missing.
- [x] 1.2 `endingOf(l)` and the ended time, as the Design's table has them.
- [x] 1.3 Due date and status (`DEBRIEF_DUE_DAYS` and `DBR3_WAIT_DAYS` appended to `data/gcc/targets.ts`).

### Phase 2 — Rivals and the seed
- [x] 2.1 `rivals.ts`, with the six new names web-checked.
- [x] 2.2 The generator: statuses and times as the Design has them, then content from the facts and templates.
  - [x] 2.2.1 Won and lost: accepted ⇔ `hasLessons`. Use one predicate; if you move `hasLessons` somewhere neutral, keep `stage9.kpi.ts` exporting it.
  - [x] 2.2.2 Stopped endings: about 80% covered; no time after `DEMO_NOW`.
  - [x] 2.2.3 The templates, with no money in any of them.
- [x] 2.3 `featured.ts` (T-2025-255 accepted, T-2025-438 submitted, one win per tenant) and `examples.ts` (the four examples).
- [x] 2.4 Acceptance: the demo-day statuses in the Design's table hold. Read 30 generated debriefs.

### Phase 3 — Records, form and writers
- [x] 3.1 The records: the seed merged with the demo keys, and the viewer's scope through `queriesFor` and `can(viewer, 'debrief.view', tenderCtx)`.
- [x] 3.2 `debriefFor` (the full `DebriefVM`: facts, choices, sections, rivals, example), `draftFor` and `validateDebrief`.
- [x] 3.3 The three writers, with `can()`, statuses, audit and effects.
- [x] 3.4 `archiveFor`: the window from `windowOf(period, tenant)`; filters; rows with masking; breakdowns over accepted debriefs; totals over all endings; medians rounded to whole places, as `record.ts` does.
- [x] 3.5 Acceptance (in the dev check, in memory): submit → send back → re-submit → accept on T-2025-270 gives rounds 1 and 2, the right statuses, and four audit entries.

### Phase 4 — The applier, actions and KPIs
- [x] 4.1 `60-debrief.apply.ts`, as the Design has it. Acceptance, after accepting T-2025-270 in memory:
  - the lifecycle has a lessons event and the step `lessons-captured`;
  - it is closed as lost;
  - RES-3 counts it;
  - `debrief.record` drops it.
- [x] 4.2 `debrief.actions.ts`; remove the two old sources; the three dashboard lists.
- [x] 4.3 `debrief.kpi.ts` (DBR-1 to DBR-6), the DBR-2 band, RES-3's ⓘ, and `LOSS_LABEL` in `stage9.kpi.ts` and `stages.cols.tsx`.
- [x] 4.4 Acceptance in the browser (your own tab), Najd:
  - as the Project Director (Mohammed Al-Ghamdi), the Stage 9 dashboard's Needs your action lists "Record the debrief" for T-2025-270 and T-2025-262, and neither old row;
  - as the Head of Tendering (Faisal Al-Harbi), the home lists "Review the debrief" for T-2025-438;
  - the rows open `/tenders/…?tab=debrief`. The tab arrives with 036, so until then the tender opens on Overview.

### Phase 5 — Checks and docs
- [x] 5.1 `dev-checks/74-debriefs.tsx`, about 15 rows across the five tenants:
  1. every bid ended in the 12 months has exactly one ending, and DG1 discards and lapsed holds have none;
  2. every withdrawn note is classified;
  3. won and lost debriefs are accepted ⇔ `hasLessons`;
  4. seed times: submitted ≥ ended, accepted > submitted, and none after `DEMO_NOW`;
  5. a seeded lost debrief's main reason = `result.lossReason`;
  6. every rival named is in the tenant's list, and no rival name equals a supplier's or a tenant's name;
  7. coverage (accepted ÷ endings) is 80–95% in each tenant;
  8. the demo-day statuses in the Design's table;
  9. each example passes `validateDebrief`, and no lesson in the seed or the examples contains money;
  10. the round trip of 3.5;
  11. acceptance changes the lifecycle as 4.1 has it;
  12. a changed main loss reason moves OUT-6's count and the tracker line;
  13. a DG2 No-Bid on T-2026-097, in memory with the DG2 writer, gives a `due` debrief with `no-bid` and the gate's reasons;
  14. the archive's totals: endings = won + lost + stopped, and every breakdown sums to its total;
  15. access: `dir` records but can't accept, `hot` accepts but can't record, `coord` has no `debrief.view`, and `bid` reads only assigned tenders.
- [x] 5.2 Move the pins your changes moved, in 60 and 50 (and any other), and list them.
- [x] 5.3 The four docs edits.
- [x] 5.4 typecheck and build pass; `/dev/checks` has no failing row in any tenant.
- [x] 5.5 Reset demo returns the seed readings (T-2025-270 due again).

## Data and derivation
- **New facts:** `data/gcc/debriefs/**` (stops, rivals, featured, examples; the generator derives the rest from the lifecycles).
- **Derived:** `domain/gcc/debriefs/**`, `debrief.kpi.ts`, `debrief.actions.ts`.
- **New `done` keys:** `debrief:{TID}`, `debrief-back:{TID}`, `debrief-ok:{TID}`, all tenant-scoped, so Settings › Reset demo clears them.

## Acceptance checks
- [x] typecheck and build pass; `/dev/checks` passes in all five tenants
- [x] Every ended bid has a debrief record with a status; the demo-day statuses hold
- [x] The Project Director's Stage 9 and the Head of Tendering's home list the right rows, and the old Stage 9 debrief and lessons rows are gone
- [x] An accepted debrief (in memory) moves RES-3, the Stage 9 step, the close, and a corrected loss reason on every reader
- [x] Access: record and accept are separate people; a Bid Manager sees only their own
- [x] No money in any lesson; new rival names web-checked; no hard-coded numbers in pages; no role checks outside `access.ts`

## Execution report
(Filled in by the executor, 2026-09-30.)
- **Changed files:**
  - New data: `data/gcc/debriefs/{stops,rivals,templates,generate,featured,examples,index}.ts`. `templates.ts` holds the lesson, "what the employer said" and "would let us bid" templates the generator fills.
  - New domain: `domain/gcc/debriefs/{endings,records,vm,form,writers,archive,text}.ts`, `domain/gcc/demo/60-debrief.apply.ts`, `domain/gcc/actions/debrief.actions.ts`, `domain/gcc/kpi/debrief.kpi.ts`.
  - New dev check: `pages/gcc/dev-checks/74-debriefs.tsx` (15 rows, all five tenants, in memory).
  - Changed:
    - `domain/gcc/debriefs/index.ts`: stubs filled; every signature and export kept;
    - `domain/gcc/debriefs/types.ts`: one optional field, `DebriefVM.now`;
    - `data/gcc/debriefs/vocab.ts`: additions only (`LOSS_IN_SENTENCE`, `WIN_SHORT`, `StoppedBy`, `NO_MONEY_TEXT`, `SEED_GATE_REASONS`);
    - `data/gcc/targets.ts`: `RATE_BANDS['DBR-2']`, `DEBRIEF_DUE_DAYS`, `DBR3_WAIT_DAYS`;
    - `domain/gcc/kpi/stage9.kpi.ts`: `hasLessons` moved to `debriefs/endings.ts` and re-exported; `LOSS_LABEL`; RES-3's ⓘ;
    - `domain/gcc/actions/stages.actions.ts`: `debrief.hold` and `lessons.record` removed, with their imports;
    - `domain/gcc/dashboards/stages.dash.ts` (Stage 9 actions) and `portfolio.dash.ts` (`debrief.accept` on `portfolio.hot` and `portfolio.exec`);
    - `components/dashboard/columns/stages.cols.tsx` (`s9.lossReason` reads `LOSS_LABEL`);
    - `pages/gcc/dev-checks/50-portfolio.tsx` (one pin).
  - Docs: `roles-and-access.md` (matrix row split), `kpi-and-screen-catalogue.md` §A.5 (DBR-1 to DBR-6), `ui-direction.md` §7.3 (Debrief statuses), `dashboards.md` §10.1, §10.2 and §10.12 (action lists).
- **Verification:**
  - `npm run typecheck` and `npm run build` pass. The chunk-size warning was there before.
  - `/dev/checks` in headless Chrome (my own server on :5194): no failing row in any panel in Najd, Corniche, Dafna, Batinah or Qurain. Check 74 passes all 15 rows in each. The only console output is the React Router future-flag warnings, which were there before.
  - Check 74 readings:
    - records per tenant: Najd 57, Corniche 41, Dafna 31, Batinah 46, Qurain 56;
    - 51 withdrawn bids, all classified;
    - 115 won or lost debriefs accepted, each with its lessons event;
    - 201 seeded submissions, all in order;
    - coverage: Najd 81%, Corniche 88%, Dafna 87%, Batinah 89%, Qurain 88%;
    - round trip: submitted r1 → sent-back r1 → submitted r2 → accepted r2, four audit entries;
    - acceptance of T-2025-270: Stage 9 · lessons-captured, closed lost, "Lost on price; lessons captured", RES-3 1 of 3 → 2 of 3, row gone;
    - a Technical main reason: OUT-6 "Price 1 · Technical 1" → "Technical 2", tracker "Lost · technical score · ranked 2 of 6 · Thu 5 Mar", facts keep Price;
    - a live No-Bid on T-2026-097: a due No-Bid debrief with "Capacity conflict".
  - Browser, Najd:
    - Project Director (Mohammed Al-Ghamdi), Stage 9: "Record the debrief" for T-2025-262, T-2026-058, T-2026-106 and T-2025-270 (the last under Show all). T-2025-270 reads "Lost Thu 5 Mar on price, ranked 2 of 6: record why. Debrief with the employer booked Thu 12 Mar, 11:00". No Lessons or old debrief row.
    - Head of Tendering (Faisal Al-Harbi), home, Show all: "Review the debrief" for T-2025-438 ("Cancelled by the employer Thu 12 Feb: recorded by Mohammed Al-Ghamdi, Thu 5 Mar, 11:40 · Waiting 3 days") and T-2026-099.
    - The CEO sees both as "Waiting on Faisal Al-Harbi". The Head of Tendering's Stage 9 shows the Record rows as "Waiting on Mohammed Al-Ghamdi".
    - Both buttons open `/tenders/{TID}?tab=debrief`. 036's tab is already in the tree, so the workspace opens.
  - Browser, Corniche: the Project Director's Stage 9 lists T-2025-120, "Lost Wed 4 Mar on local content … booked Wed 11 Mar, 10:00".
  - Reset:
    - an accepted T-2025-270 was written into `ctai.demo.v2` (the keys `mark()` writes) and the page reloaded: Stage 9 went from 6 to 5 items and RES-3 from 1 of 3 to 2 of 3; the tracker reads "Lost · price · ranked 2 of 6 · Thu 5 Mar";
    - Settings › Reset › Reset this company then left no Najd keys: Stage 9 was back to 6 items and RES-3 to 1 of 3.
- **Moved pins:**
  - `50-portfolio.tsx`, 'HoT · actions, Show all':
    - before: `7: + Renewal T-2026-118 | DG1 due T-2026-117`;
    - after: `9: + Debrief sign-off T-2025-438 | Renewal T-2026-118 | Debrief sign-off T-2026-099 | DG1 due T-2026-117`.
  - 'HoT · actions 1–5' did not move.
  - `60-stages.tsx`: nothing moved (RES-3 stays "1 of 3"; Stage 9 actions have no pin).
- **Featured wins (one per tenant, accepted):** Najd T-2025-290 (track record), Corniche T-2025-308 (technical), Dafna T-2025-276 (price), Batinah T-2025-265 (alternative), Qurain T-2025-241 (programme). Also featured: Najd T-2025-255 (accepted) and T-2025-438 (submitted).
- **Rival search (2026-09-30):**
  - Dafna: Thumama Pellstone Contracting W.L.L., Karstel Civil Engineering W.L.L., Mesaieed Trevannon Infrastructure W.L.L.
  - Qurain: Failaka Ostrel Contracting Co., Jahra Brennock Projects Co., Kelvane Gulf Engineering Co.
  - Each was web-searched; no real firm found.
  - Dropped because a real company uses the name: Orvanta, Marlex, Corvell, Dunmore, Varden. Also dropped: "Wafra", a well-known Kuwaiti brand.
  - The note is kept in `rivals.ts`. Dev check 74 row 6 confirms no rival shares a supplier's or tenant's name.
- **Deviations from plan:**
  1. **Stopped coverage.** It is the top 85% of stopped endings, ranked by each tender's own stream (featured ones excluded), not a random 80%. A random 80% left Corniche at 78% and Najd at 77%. Every tenant now lands at 81–89%.
  2. **`Rival` has a `short` name** ("Pellstone"). Sentences and the DBR-6 tile use it; the full name stays in `name`.
  3. **The domain split** is `endings`, `records`, `vm`, `form`, `writers`, `archive` and `text`, plus `templates.ts` in data (the plan left the split to me).
  4. **The applier** (`60-debrief.apply.ts`):
     - It also imports the seed (`@/data/gcc/debriefs`, a data module), so accepting a seeded submission such as T-2025-438 or T-2026-099 finds its round and main reason. It still never imports `debriefs/index.ts`.
     - A won or lost tender that closed before the acceptance (an old overdue one) gets the lessons event and the result corrections only. Its close and its last step stay, since a log entry after the close would break the chain. Live Stage 9 tenders close as the Design says.
  5. **Action rows:**
     - `debrief.accept` rows use the type "Debrief sign-off" (the plan named none), with due text "Waiting n days", orange after `DBR3_WAIT_DAYS` working days, as DBR-3.
     - A lost `debrief.record` row whose employer debrief was already held reads "Debrief with the employer held {date}".
  6. **Tiles:**
     - DBR-1's reference is "Since 9 Mar · n sectors", since a reference needs a value and the count would repeat the tile.
     - DBR-3 is neutral when nothing waits (the plan gives only orange).
     - DBR-5's reference reads "7 of 9 wins" while some wins are not yet accepted.
     - DBR-6 shows the short name on the tile and the full name in the sub-line.
  7. **`roles-and-access.md`:** the matrix has no Committee column, so "committee members V" is in the row label.
  8. **`dashboards.md` §10.12** now also lists "results overdue" (`result.chase`), which was already in the build but missing from the doc.
  9. **Dev check 74, rows 13 and 15:**
     - Row 13 first records positions to quorum with `positionWrite`, since T-2026-097 has 2 of 5.
     - Row 15: every bid in every tenant is managed by the tenant's one Bid Manager, so a count cannot show the scope. The row shows Omar reads only tenders assigned to him, and that `can()` refuses him a tender with another Bid Manager.
- **Blockers / questions:** none.
- **Follow-ups noticed (not done):**
  1. `domain/gcc/lifecycle.port.ts:186` sets the Stage 9 column's `lessons` flag from any lessons event, with no date bound. Dafna and Qurain T-2025-120 have lessons events on 11 and 10 Mar (after demo day), so their Lessons column reads "Captured" while RES-3 and the debrief say not yet. This disagreed with RES-3 before this plan. The one-line fix is `lessons: hasLessons(l)`, but the file is outside this plan.
  2. `lifecycle.port.ts` keeps its own loss wording for the tracker ("technical score"), while the Stage 9 column and OUT-6 now read `LOSS_LABEL` ("Technical"). It could read `LOSS_IN_SENTENCE`.
  3. On the Project Director's Stage 9, a won tender shows twice (Handover and Debrief). They are two different actions, but the orchestrator may prefer one row.
  4. The seed's close notes say both "The employer …" and "The client …" (for example "The client postponed the tender indefinitely"). The Record row quotes them as they are.
