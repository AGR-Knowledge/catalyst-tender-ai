# KPI and screen catalogue: Stages 1–3, GCC

AGR product definition, v1 draft, 2026-09-25. This defines **what each role sees**: every KPI (formula, source, target, why it exists) and every role's home screen for the Stage 1–3 demo.

It replaces the KPIs in the client wireframe for these roles. The client's *content* (stages, agents, gates, flows) stands. Its *tiles* were written before the role model existed, and several of them measure the wrong thing (§E).

Read with:
- [s1-s3-demo-spec.md](s1-s3-demo-spec.md) (behaviour);
- [roles-and-access.md](roles-and-access.md) (permissions);
- [ui-direction.md](ui-direction.md) (archetypes and components);
- [gcc-demo-data.md](gcc-demo-data.md) (the seed story that makes these numbers tell the right tale).

---

## 0. How KPIs work in this product

### 0.1 The test
A number earns a place on a screen only if **the person looking at it would act differently when it changes**. If nobody acts on it, it's a report, not a KPI, and it goes to a report page or nowhere.

**Anti-patterns (do not build):**
- Hero AI numbers ("Extraction accuracy 97%") on a working desk. Accuracy belongs to the platform view and the Head of Tendering's governance panel.
- "Hours saved" and ROI on a working desk. They go to the Head of Tendering's Value panel, labelled "estimated".
- "Since go-live" deltas. A demo tenant has no go-live, and fake deltas undermine trust in a live meeting.
- Counts without a next step ("214 suppliers"). A count on a desk must open the list it counts, filtered.
- Averages that hide the tail. Use p90 for times, and always show the worst item ("oldest 1 h 40 m").

### 0.2 The KPI record
Every KPI is defined once, in §A, with:

| Field | Meaning |
| --- | --- |
| ID | Stable code, e.g. `INT-2`. Screens reference IDs, never re-define |
| Name / tile label | The label on a tile (sentence case, ≤ 4 words where possible) |
| Formula | Exact definition, including the time window and what's excluded |
| Source | The facts it reads. Everything comes from `src/data` and demo state; nothing is typed |
| Target / tone | The threshold behind the colour; tenant-configurable unless stated |
| Drill-down | What a click opens |
| Seen by | Roles, and the scope (tenant / sector / assigned) |
| Why | The decision it drives |

### 0.3 One KPI registry in code
Build **`domain/kpi.ts`** as a registry keyed by ID. Each entry carries: label, `compute(live, scope)`, a formatter, tone rules, a drill-down route, the permission needed, and the formula text (shown in an ⓘ popover, so every KPI can explain itself).

Role desks and the future Head of Tendering home are then **compositions of IDs**. When the user's sketch arrives, building that dashboard means arranging registry entries, not writing new maths.

### 0.4 Targets and SLAs are tenant settings
Administration → Targets & SLAs holds every target below:
- intake ≤ 15 min;
- DG1 ≤ 24 h;
- RFQ ≤ 24 h of DG1;
- DG2 ≤ 24 h of pack issue;
- the RFQ reply SLA;
- the capacity safe threshold;
- the facility warning level;
- the fit thresholds.

The spec's figures are the defaults. Each tile's ⓘ shows the target in force.

### 0.5 Periods
Working desks show **now** (live counts) and **today / next 7 days**. Trailing periods (30 days, 12 months) appear only on outcome and governance KPIs, and always print their `n` ("27% · n = 33").

---

## A. KPI dictionary

### A.1 Intake (Stage 1, before DG1)

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| INT-1 | New today | Tender notices captured since 00:00 local, across all sources, excluding duplicates and addenda. Sub: split by source type | Intake events | none (information) | Radar › Today's captures | Coord, BidMgr, HoT | Tells the Coordinator how heavy the morning is |
| INT-2 | Intake to logged | p90 minutes from receipt to TID assigned, today (sub: worst item) | Intake events with timestamps | ≤ 15 min green; ≤ 20 orange; > 20 red | Radar, sorted by intake time | Coord, HoT, Platform | Spec KPI: "100% logged within 15 minutes" |
| INT-3 | Missed tenders | Tenders on a portal's daily listing that are not in the register after reconciliation (last run) | Reconciliation runs | 0 green; ≥ 1 red | Reconciliation card | Coord, HoT, Platform | Spec KPI: zero missed tenders. The fear the product answers |
| INT-4 | Sources healthy | Connectors Healthy ÷ connectors configured. Sub: the worst one and why ("Etimad credential expires in 5 days") | Connector records | all healthy green; any degraded or expiring orange; any down red | Radar › Connectors | Coord, HoT, Platform | A silent broken source is how tenders get missed |
| INT-5 | Fields to check | Open validation items. Sub: "n block DG1 · oldest {age}" | Validation items | 0 green; any blocking DG1 orange; oldest > 4 h red | Intake queue | Coord (own), BidMgr (own tenders), HoT | Pursue is locked while these are open |
| INT-6 | Auto-accepted | Share of extracted fields accepted without human touch, last 30 days, with n | Field records | information | Extraction confidence panel | Coord, HoT | Shows where the agent is trusted and where not |
| INT-7 | Human-corrected | Share of fields a person corrected, last 30 days, by field group | Field records (corrections) | ≤ 5% green; ≤ 10% orange | Extraction confidence by group | HoT, Platform | The operational proxy for the spec's ≥ 95% extraction accuracy (measured formally against the golden set) |
| INT-8 | Linked, not duplicated | Duplicates merged + addenda linked, today | Register checks | information | Radar filtered | Coord | Proves nothing is double-logged |
| INT-9 | Restricted lane | Count of restricted tenders (never titles, for users not cleared) | Sensitivity flags | information | Restricted list (cleared users only) | Coord, HoT | Security posture, visible without leaking |
| INT-10 | Documents to buy | Tenders whose booklet or documents must be purchased before download. Sub: next purchase deadline and fee | Tender records (document fee, purchase deadline) | deadline ≤ 2 working days orange | Coordinator queue | Coord, HoT | GCC portals often sell the booklet. A missed purchase means a missed tender. The platform never pays; a person does |

### A.2 Screening and DG1

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCR-1 | DG1 due | Tenders at M1 with no DG1 record. Sub: time to the first SLA expiry | Tender stage + DG1 records + SLA | any breached red; < 6 h orange | DG1 decisions | BidMgr (assigned), HoT | The spec's 24 h gate |
| SCR-2 | DG1 on time | DG1 decisions recorded ≤ 24 h of M1, last 90 days, with n | DG1 records | 100% green; ≥ 90% orange | Decisions log | HoT, Exec | Decision latency is a stated client pain |
| SCR-3 | Pursue rate | Pursued ÷ DG1 decisions, last 90 days. Split by fit band | DG1 records | information | Decisions log by band | HoT | Are we chasing low-fit tenders, or discarding good ones? |
| SCR-4 | Overrides | DG1 decisions that differ from the recommendation, last 90 days, with the top reason code | DG1 records + recommendation snapshot | information; a rising trend flagged | Override list | HoT, Platform (count only) | Learning loop, and trust calibration |
| SCR-5 | Eligibility risks | Live tenders (S1–S3) with any Fail or At-risk PQ line. Sub: the most urgent | Eligibility results | any Fail on a pursued tender red; At risk orange | Screening, filtered | BidMgr, HoT, Coord | PQ disqualification is the #1 avoidable loss |
| SCR-6 | Credentials at risk | Vault credentials that expire **before the submission date (or through bid validity, where required)** of any live bid. Sub: the first one ("GOSI · 10 Apr · T-118 due 12 Apr") | Credential vault × live tender dates | any red; ≤ 30 days before a due date orange | Company › Credentials, filtered "affects live bids" | HoT, BidMgr, credential owners | The most GCC-specific KPI in the product. Expiry is checked against the bid, not today |
| SCR-7 | Queries closing | Open clarification drafts or unanswered queries whose deadline is ≤ 3 working days away | Queries + tender key dates | any ≤ 1 wd red | Queries tab, across tenders | Coord, BidMgr | A missed clarification window forces bidding on an ambiguous basis |
| SCR-8 | Time to prepare | Working days from today to submission ÷ typical preparation working days for this tender type (from history). Shown per tender, not as a tile | Key dates + history | < 1.0 red; < 1.3 orange | Tender DG1 pack | BidMgr, HoT | "Insufficient time" is a legitimate discard reason, and should be seen early |

### A.3 Sourcing (Stage 2)

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SRC-1 | RFQ clock | For each tender pursued in the last 24 h: time left to issue all RFQs, and packages issued ÷ packages. The trailing form is "RFQs within 24 h of DG1", last 90 days | DG1 time + RFQ send times | trailing 100% green; live < 6 h left with packages unsent orange; breached red | Packages & RFQs | Proc, BidMgr, HoT | Spec KPI: 100% of RFQs within 24 h of DG1 |
| SRC-2 | Packages covered | Packages with ≥ 3 **compliant levelled** quotes, or an accepted gap ÷ packages, per tender or across my tenders | Packages, quotes, levelling results | 100% green; ≥ 70% orange; < 70% red (near pack issue) | Package board | Proc, BidMgr, HoT, Exec (in pack) | Spec KPI: bid coverage. "Compliant" and "levelled" stop a non-compliant quote counting |
| SRC-3 | Replies on time | RFQs answered (quote or decline) by the reply date ÷ RFQs whose reply date has passed, live tenders | RFQ records | ≥ 80% green; ≥ 60% orange | Supplier response matrix | Proc, HoT | Spec KPI: supplier response within SLA |
| SRC-4 | Overdue RFQs | RFQs past their reply date without a reply. Sub: escalated count | RFQ records | 0 green; any escalated red | Response matrix, filtered | Proc | What the buyer should chase today (or confirm the agent is chasing) |
| SRC-5 | Open clarifications | Supplier clarifications not answered. Sub: stale beyond SLA | Clarification log | 0 stale green; any stale red | Clarification log | Proc, BidMgr | Spec exit rule: zero stale clarifications |
| SRC-6 | To level | Quotes with unconfirmed adjustments (currency, VAT, delivery terms, exclusions priced, validity short) | Levelling records | information; any > 2 days old orange | Quote levelling | Proc, Commercial | Levelling is judgement. The agent proposes, the buyer confirms |
| SRC-7 | Not covered | Share of BOQ value classified Not covered (no self-perform, no supplier matched), per tender | BOQ classification | 0% green; ≤ 5% orange; > 5% red | BOQ coverage bar | Proc, BidMgr, HoT | "Lines nobody covers are the risk" (from the Workbench) |
| SRC-8 | Held by screening | Shortlisted suppliers that cannot be sent an RFQ (screening due or blocked) | Supplier screening × shortlists | information; blocked red | Suppliers, filtered | Proc | Guardrail visibility, and a prompt to re-screen before the reply window |
| SRC-9 | Long-lead at risk | Packages where the best compliant quote's lead time exceeds the programme need | Levelled quotes + package need-by | any red | Package board | Proc, Planning (input) | A bid that can't be delivered on time is a risk the committee must see |
| SRC-10 | ICV in mix | ICV/local-content-weighted share of the recommended best-fit mix | Supplier ICV scores × mix | tender-specific threshold | Best-fit view | Proc, BidMgr, Exec (pack) | GCC evaluation often scores local content. It moves win probability |
| SRC-11 | Buyer time saved | Estimated buyer hours saved by agent nudges, parsing and levelling, this month. **Labelled "estimated"** | Agent action counts × tenant time standards | information | Value panel | HoT only | Belongs to value proof, not the buyer's desk (§E) |

### A.4 Decision (Stage 3 and DG2)

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEC-1 | Awaiting committee | Packs issued with no DG2 record. Sub: first SLA expiry and positions recorded ("2 of 5 · quorum 3") | Packs + DG2 records | breached red; < 6 h orange | DG2 committee | Exec, members, HoT, BidMgr (own) | The spec's 24 h gate |
| DEC-2 | DG2 on time | DG2 decisions ≤ 24 h of pack issue, last 12 months, with n | DG2 records | 100% green; ≥ 90% orange | Decisions log | HoT, Exec | Decision latency |
| DEC-3 | Win probability | Per tender: score ± band, with the driver count and a low-data warning when comparables < 5. Never averaged across tenders on a tile | Win model outputs (seeded) | vs tenant bid threshold | Pack §9.1 | BidMgr, Exec, members, HoT | The pack's headline, always with its uncertainty |
| DEC-4 | Weighted pipeline | Σ (value × win probability) for tenders with a current pack (S3/DG2), in tenant currency. Sub: count, and unweighted value | Packs | information | Portfolio roll-up | Exec, HoT | Replaces the client's "weighted value" across all pursuits, which multiplied probabilities that didn't yet exist |
| DEC-5 | Capacity if won | Peak delivery load (key staff and manpower) if every bid at DG2 plus awarded-but-not-started work wins ÷ safe-delivery threshold | Pack capacity inputs + active projects | ≤ 100% of threshold green; ≤ 115% orange; > 115% red | Portfolio conflict roll-up | Exec, members, HoT | The committee must see the combined effect, not one bid at a time |
| DEC-6 | Facility headroom | Bank guarantee facility limit − utilised − committed by live bids (bid bonds held, plus performance bonds if pending awards convert). Sub: after this bid, and Finance's as-of date | Finance input (timestamped) | ≥ warning level green; below it orange; negative red | Pack §9.5 | Exec, CFO, Finance, HoT, BidMgr (value only) | In the GCC, bonds bind facility for months. Running out stops bidding |
| DEC-7 | Inputs outstanding | Contributor inputs requested for packs and not yet submitted. Sub: late count and who | Requests | 0 late green; any late orange; any late on a pack due in 24 h red | Inputs tab | BidMgr, HoT, contributors (own) | Packs slip because inputs slip |
| DEC-8 | Stale packs | Issued or draft packs whose inputs changed after generation (addendum, new quote, renewed credential) | Pack version × change events | any issued pack stale red | Pack freshness | BidMgr, Exec, HoT | A committee must not decide on stale evidence |
| DEC-9 | Conditions open | DG2 conditions not yet closed on tenders that proceeded | Conditions tracker | information; any past due orange | Bid workspace conditions | BidMgr, Exec, HoT | Conditions without follow-through are theatre |
| DEC-10 | Approval vs majority | DG2 decisions where the Head of Tendering's approval (the chair's, before 2026-09-25) differed from the majority of positions, last 12 months | DG2 records | information | Decisions log | HoT (governance), Exec | Governance transparency. The data is recorded; nobody is judged by the tile |

### A.5 Outcomes (history; the tenant's past bids)

These read closed bids in the seed history. Stages 4–9 are hidden, but a real register has outcomes, so the numbers exist.

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OUT-1 | Hit rate | Won ÷ (won + lost) for bids submitted and decided, trailing 12 months, with n. Split by sector and by client type | Bid history | vs tenant target | Outcomes table | Exec, HoT, Sector Head | The classic tendering-department KPI. Always with n |
| OUT-2 | Bids submitted | Count per quarter, with value | Bid history | information | Outcomes table | HoT | Throughput with the same team |
| OUT-3 | Value won | Σ awarded value, trailing 12 months, against the tenant's order-intake target | Bid history + target | vs target | Outcomes table | Exec, HoT | Order intake is what the board asks the CEO about |
| OUT-4 | Calibration | Predicted win-probability bands against actual win rates, with n per band | History (prediction snapshot at DG2 + outcome) | gap ≤ ±10 pts per band green | Calibration table | HoT, Platform | Spec KPI: calibration within ±10%. Hidden when n < 20 ("Not enough outcomes yet") |
| OUT-5 | Why we walk away | Pareto of DG1 discard and DG2 no-bid reason codes, last 12 months | DG1/DG2 records | information | Decisions log filtered | HoT, Exec | Where the company's strategy and capability actually bite |
| OUT-6 | Why we lose | Pareto of loss reasons recorded on outcomes (price, technical score, PQ, local content, competitor) | Bid history | information | Outcomes table | HoT, Exec, Sector Head | Feeds pricing and positioning |
| OUT-7 | Reversals | Decisions re-opened (DG1 or DG2), with trigger (competitor withdrew, JV offer, employer signal) | Decision records | information | Decisions log | HoT | Discovery responses say reversals are common. Measuring them improves the recommendation |

### A.6 Capacity

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CAP-1 | Bid-desk load | Committed bid-team hours in the next 4 weeks ÷ available hours, per sector team (tendering engineers, estimators, planners) | Bid effort estimates + team roster | ≤ 85% green; ≤ 100% orange; > 100% red | Capacity view by team and week | HoT, BidMgr, Exec | "Pursuing all three would use 112% of the Water team in March" (spec §6.9) |
| CAP-2 | Bids in preparation | Concurrent bids in S2–S3 (and in later stages from history) against the tenant's ceiling | Register | vs ceiling | Pipeline filtered | HoT | The simple ceiling everyone understands |
| CAP-3 | Submission clashes | Weeks with ≥ 3 submissions due, next 8 weeks | Key dates | any orange | Calendar | HoT, BidMgr | Peaks break quality. Seeing them at DG1 helps |
| CAP-4 | Key people committed | Named key personnel (the CVs promised) committed on more than one live bid or project in overlapping windows | CV commitments | any red | Capacity view | HoT, PD, HR | GCC employers check key-personnel availability at award; double-promising is a real risk |

### A.7 Governance and platform

| ID | Tile label | Formula | Source | Target / tone | Drill-down | Seen by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GOV-1 | Audit coverage | Actions with an audit entry ÷ auditable actions (should be 100% by construction; shown as a proof point) | Audit log | 100% | Audit log | HoT, Platform | Spec KPI: 100% traceable |
| GOV-2 | SLA breaches | Breaches this month by gate or queue, and by owner | SLA events | 0 green | Breach list | HoT | Who needs help, and where the process is too tight |
| GOV-3 | Overrides with reason | Overrides carrying a reason ÷ all overrides | Decision records | 100% on gates by rule; others information | Override list | HoT | Rule compliance |
| GOV-4 | Guardrail activations | Guardrail events this month (restricted-lane routing, blocked RFQ to unscreened supplier, PII redaction, uncited-claim suppression) | Guardrail events | information | Guardrail log | HoT, Platform | Evidence that the guardrails exist and fire |
| GOV-5 | Seats in use | Active users ÷ licensed seats, by role | Users | information | Users & roles | HoT, Platform | Licensing and adoption |
| GOV-6 | Break-glass | Catalyst break-glass requests (open, approved, expired), with reason | Break-glass records | any open orange | Audit log | HoT, Platform | M-9: the operator's access is visible to the tenant |
| PLT-1…6 | Platform Console tiles | Tenants live and onboarding · connector health across the estate · intake p90 by tenant · eval pass rate by agent (golden sets) · model spend against ceiling by tenant · open break-glass | Platform records (never tender content) | per tile | Console | Platform only | See §C.8 |

---

## B. Head of Tendering: candidate inputs (awaiting the user's sketch)

> **Superseded 2026-09-25.** The user's brief replaced the sketch. The Head of Tendering's dashboard, and every role's dashboard, are now defined in [dashboards.md](dashboards.md) §10. Panels below that dashboards.md doesn't use (B3 credential radar, B5 facility, B8 trust and learning, B11 admin shortcuts) remain candidates for later screens.

**Do not build this home before the sketch arrives** (spec §14). This section is the menu the sketch will be held against. Every item below is a registry entry (§0.3), so building from the sketch is composition work.

**Who the Head of Tendering is in a GCC contractor.** They run the Tendering (Estimation & Tendering) department:
- the tendering engineers and estimators by sector;
- the coordinators and document controllers.

Their job:
- decide or delegate what the department pursues;
- keep bids compliant and on time;
- keep the committee fed with sound packs;
- protect capacity and the bank facility;
- report hit rate and order intake to the CEO.

In the product they also own the tenant's configuration: users, committees, sources, the fit model, branding and the audit log. That is the merged admin (decision D4).

**The questions they open the app with, and the candidate panels that answer them:**

| # | Question | Candidate panel | KPIs / content | Priority |
| --- | --- | --- | --- | --- |
| B1 | "What's waiting on a decision, and is anything about to breach?" | Decisions across gates | SCR-1, DEC-1, SLA clocks per item, plus escalations to me; each row actionable ("Nudge", "Open", "Record as delegate") | Must |
| B2 | "What's in the funnel and what is it worth?" | Pipeline funnel | Count and value per step: captured → screened → DG1 pursued → S2 → pack → DG2 bid; conversion between steps; discards by reason (OUT-5 mini) | Must |
| B3 | "Are we about to be disqualified by our own paperwork?" | Credential expiry radar | SCR-6 plus a timeline of vault credentials against live bid due dates; owners; "Request renewal" | Must (the GCC signature panel) |
| B4 | "Do we have the people?" | Capacity by team | CAP-1 heat grid (team × week), CAP-3 clashes, CAP-4 key people | Must |
| B5 | "Do we have the bank room?" | Facility | DEC-6 bar: limit / utilised / committed / headroom, with bids pending and their bond sizes; Finance's as-of date | Must |
| B6 | "Is intake working?" | Intake health | INT-2, INT-3, INT-4, INT-5, INT-10 compact | Should |
| B7 | "Are we winning, and why not?" | Outcomes | OUT-1 by sector, OUT-3 against target, OUT-6 Pareto | Should |
| B8 | "Is the platform telling us the truth?" | Trust and learning | OUT-4 calibration (when n allows), SCR-4 overrides, INT-7 corrections, OUT-7 reversals | Should |
| B9 | "What is the platform worth to us?" | Value (labelled estimated) | SRC-11, intake minutes saved, disqualifications avoided (At-risk lines resolved before submission), bids per head | Could (a meeting prop for the CEO, not a daily panel) |
| B10 | "Who's doing what?" | Team | Per person: tenders owned, requests open, SLA breaches; "View as" shortcut | Should |
| B11 | "Is my configuration right?" | Administration shortcuts | Gates without owners (blocks!), users without roles, sources degraded, fit model last changed, pending invitations, GOV-6 | Must (small) |
| B12 | "What changed since yesterday?" | Activity digest | New tenders, decisions, addenda, stale packs, overrides, in time order | Could |

**Things the sketch should settle** (bring these to the review):
1. Is the home an **operations cockpit** (B1, B3, B4, B5 first) or a **portfolio view** (B2, B7 first)? Our recommendation is the cockpit, with the portfolio one click away.
2. Sector split: one department view, or tabs per sector team (Water, Buildings, Roads…)?
3. How prominent the credential radar is. We think it's the panel that sells the product to a GCC buyer.
4. Whether Value (B9) is on the home at all, or only in a "For the CEO" export.
5. "View as": a switcher in the header, or per person in the Team panel?

---

## C. Role screens

> **Tiles and layout superseded 2026-09-25** by [dashboards.md](dashboards.md) §10 (one layout for every role, period filter, Table | Graph). The *who*, *question*, *needs you now*, *rights* and *must not see* below still hold.

The format for each role:
- **who they are** (GCC reality);
- **the question** they open the app with;
- **their desk** (archetype A in ui-direction), with ≤ 6 tiles by KPI ID;
- **needs you now**;
- **panels**;
- **other screens and rights**;
- **what they must not see**.

Persona names per tenant are in gcc-demo-data.

### C.1 Tender Coordinator: Intake desk
**Who.** Tendering coordinator or tender document controller, sometimes a junior tendering engineer. Watches Etimad or the national portal and client vendor portals, buys booklets, downloads documents, logs tenders, tracks dates, and prepares the document checklist.

**Question.** *"What came in, what do I need to check, and what deadlines are close?"*

**Tiles:** INT-1 New today · INT-5 Fields to check · INT-2 Intake to logged · INT-4 Sources healthy · INT-3 Missed tenders · INT-10 Documents to buy.

**Needs you now** (ordered by what blocks DG1, then SLA):
- validation items (low confidence, **conflicts**);
- booklet purchases awaiting approval ("SAR 5,000 via the portal · approver: Head of Tendering · closes Tue");
- addenda to confirm against their parent;
- a possible re-tender to decide on (link or new);
- clarification drafts to review before the Bid Manager approves.

**Panels:**
1. **Today's captures**: time · source · reference · title · authority · country · value · due · language · type · fit · disposition (spec §6.1). Kept from the client wireframe, which got this right.
2. **Extraction confidence by field group**: last 50 tenders, lowest groups first, with "routed to you most often". Kept from the client wireframe: it tells the Coordinator where to look.
3. **Key dates, next 14 days**: purchase deadlines, site visits, pre-bid meetings, clarification deadlines, submissions. GCC calendar flags (Ramadan hours, Eid, weekends).
4. **Source health**: one row per connector with its mode (API / scheduled / assisted).

**Rights:**
- Create tenders.
- Validate fields: Accept, Correct, Not stated, Send back.
- Draft queries.
- Link addenda.
- Request a booklet purchase.
- Cannot record DG1. Cannot see margin or quotes.

### C.2 Bid Manager: Bid desk
**Who.** Tender manager or bid manager, usually per sector. Owns each bid from DG1 to submission, runs the bid team, and presents at DG2.

**Question.** *"What must I decide today, which of my bids are at risk, and what are they waiting on?"*

**Tiles:** SCR-1 DG1 due · "My live bids" (count and value by S1/S2/S3; a composition of the register) · SCR-5 Eligibility risks · SRC-2 Packages covered (my bids) · DEC-7 Inputs outstanding · "Next submission" (date, tender, working days: a register composition).

**Needs you now:**
- DG1 decisions, with SLA;
- queries to approve and send;
- packaging or shortlists where they are consulted;
- packs ready to issue;
- **stale packs**;
- DG2 conditions to action;
- escalations (SLA breaches on their bids).

**Panels:**
1. **My bid register**: tender · employer · value · stage track · next milestone · blocker ("waiting on Finance: facility") · health. Row → Workspace.
2. **Capacity and clashes**: my team's load by week (CAP-1 filtered to my sector) and overlapping submission windows (CAP-3).
3. **Eligibility watch**: At-risk and Fail lines across my bids, with owner and action.
4. **Recent decisions and overrides** on my tenders.

**Rights:**
- Record DG1 on assigned tenders.
- Approve queries.
- Comment on packages.
- Issue packs.
- Edit the pack's presenter note (the numbers stay locked).
- Present at DG2 (no vote).
- Sees margin ranges on own tenders if the tenant grants it (default yes). Sees supplier quotes as levelled summaries.

### C.3 Procurement Lead: Sourcing desk
**Who.** Tendering procurement lead, estimation and procurement manager, or senior procurement engineer. Owns packages, supplier shortlists, RFQs and quote levelling during tendering (not post-award purchasing).

**Question.** *"Which packages aren't covered yet, who hasn't replied, and are the quotes comparable?"*

**Tiles:** SRC-1 RFQ clock · SRC-2 Packages covered · SRC-3 Replies on time · SRC-4 Overdue RFQs · SRC-5 Open clarifications · SRC-6 To level.

**Needs you now:**
- packaging to approve;
- shortlists to approve;
- RFQs ready to send (clock);
- escalations (non-responders past SLA, with reserve suppliers suggested);
- levelling adjustments to confirm;
- best-fit mixes to approve;
- supplier commercial questions (routed to a human by rule).

**Panels:**
1. **Package board**: Issued → Acknowledged → Quoted → Levelled → Buyer approved, per tender, with a long-lead flag (SRC-9) and a not-covered flag (SRC-7).
2. **Supplier response matrix**: supplier × package status (the unified vocabulary, ui-direction §7.3).
3. **Levelled comparison**: the selected package, with its adjustments trace (spec §8.6).
4. **Screening watch**: shortlisted suppliers whose screening is due or blocked (SRC-8).

**Rights:**
- Approve packages, shortlists and RFQ sends.
- Level quotes.
- Approve best-fit (override with a reason).
- Manage the supplier master.
- Sees supplier quotes in full. Does **not** see the tender margin range (masked) or committee positions.

### C.4 Executive Sponsor (CEO / MD): Committee desk
**Who.** Chairs the Bid Committee. Decides DG2. Reads, rarely edits.

**Question.** *"What am I being asked to decide, is the evidence sound, and what does the pipeline mean for capacity and risk?"*

**Tiles:** DEC-1 Awaiting committee · DEC-4 Weighted pipeline · DEC-6 Facility headroom · DEC-5 Capacity if won · OUT-1 Hit rate · "Decisions on time" (SCR-2 and DEC-2 combined).

**Needs you now:** DG2 decisions, each with positions recorded, quorum state, and SLA. Re-open requests awaiting chair approval.

**Panels:**
1. **Committee queue**: each pack with the headline (win probability ± band, value, margin range, facility after, top risk) and member positions.
2. **Portfolio conflict roll-up**: bids at DG2 this cycle with capacity-if-won and facility-if-won, against thresholds.
3. **Funnel by stage**: S1 / DG1 / S2 / S3 / DG2, count and value. The later stages are one muted "in delivery preparation" figure.
4. **Why we win and lose**: OUT-6 and OUT-5, trailing 12 months with n. Kept in spirit from the client's "Why we win".

**Rights:**
- Record their own position.
- Record the DG2 decision as chair (a reason is required if it differs from the majority).
- Approve re-opens.
- View everything in the tenant except the restricted lane unless cleared.

### C.5 Bid Committee members: My committee items
**Who:**
- **CFO**: financial exposure.
- **Technical Director**: technical risk and design responsibility.
- **Operations Director**: delivery capacity, plant and manpower.
- **Sector Head** for the tender's sector: client relationship and strategic fit.

**Question.** *"What do I need to form a position on, by when?"*

**Tiles** (four only): packs awaiting my position (DEC-1 filtered) · time to first SLA · my positions this quarter · conditions I raised still open (DEC-9 filtered).

**The lens.** The same pack opens at the section the member cares about, with the rest one scroll away:
- CFO: §9.5 Financial exposure and §9.7 Margin range;
- Technical Director: §9.6 Risks (technical) and key staff;
- Operations Director: §9.4 Resource and capacity;
- Sector Head: §9.1 Win drivers, §9.2 Competitors and client history.

This is the lens idea from product-foundation rule 4, applied inside one record.

**Rights:**
- Record a position (Support / Support with conditions / Oppose / Abstain) with a comment.
- Declare a conflict.
- Cannot record the decision.
- The CFO sees margin; other members see margin if the tenant grants it (default yes for committee members).

### C.6 Contributors: My requests
Applies in demo scope mode to Commercial, Planning, Compliance / Legal, Project Director (designate), Finance / Treasury, HR, and credential owners.

**Question.** *"What have I been asked for, by whom, and by when?"*

**Tiles** (four): open requests · due in 48 h · late · submitted this month.

**The request list.** Each row shows: tender · what's asked · for which pack section · requested by · due (SLA) · status. The row opens a **focused input form** showing only the tender header, the relevant extracted fields and documents, and the form:

| Contributor | Input form (fields) | Feeds |
| --- | --- | --- |
| Commercial Manager | Preliminary margin range (low–high %), basis (benchmark rates; levelled quotes for n of m packages), top three cost risks, confidence | Pack §9.7 |
| Planning Manager | Preliminary duration against the tender duration, long-lead fit, peak manpower, key plant, clash with live projects and bids | Pack §9.4, SRC-9 |
| Compliance / Legal Lead | Top five contract risks (clause, page, risk, stance: accept / price / qualify / reject), JV agreement status, redline posture | Pack §9.6 |
| Project Director (designate) | Delivery feasibility (Yes / With conditions / No), named key staff with availability, site and logistics notes | Pack §9.4 |
| Finance / Treasury | Facility limit, utilised, committed, headroom **with an as-of date**; bank lead time for bonds; working-capital note (advance, retention, payment terms); FX assumption | Pack §9.5, DEC-6 |
| HR | Key-personnel availability; nationalisation impact of named staff (e.g. Saudization band) | Pack §9.4, CAP-4 |
| Credential owner (HR, Finance, QHSE) | Renewal task from an At-risk eligibility line: upload the renewed certificate, which re-runs eligibility | Eligibility, SCR-6 |

**Rights.** Edit their own inputs only. View the invited tender (assigned scope). Masked: Planning, Legal and HR don't see margin or quotes. Finance sees bond values and value bands, not supplier quotes.

### C.7 Supplier: Supplier Portal (external preview)
**Who.** A subcontractor or vendor's estimator, often on a phone.

**Question.** *"What are they asking me to price, by when, and how do I reply?"*

**The page:**
- invited by (tenant brand);
- project name, with the employer shown per the tenant setting "Reveal employer to suppliers" (default on);
- package scope;
- **only their BOQ lines**;
- documents;
- commercial terms asked (currency, price basis excluding VAT, delivery terms, validity, payment terms);
- reply-by in local time with a countdown.

**Actions:**
- acknowledge, or decline with a reason;
- quote at line or package level (as the RFQ allows);
- upload the quote document;
- declare validity, deviations and exclusions;
- ask a clarification.

**Never shows** other suppliers, other quotes, estimates or the tender value.

### C.8 Catalyst Platform Operations: Platform Console
**Tiles:** PLT-1 Tenants (live / onboarding, with region and residency) · PLT-2 Connector health across the estate · PLT-3 Intake p90 by tenant · PLT-4 Eval pass rate by agent · PLT-5 Model spend against ceiling · PLT-6 Open break-glass.

**Panels:**
- **tenant list**: tier (pooled / silo), residency, version, health dots;
- **releases and canary**;
- **guardrail activations by tenant** (counts);
- **break-glass log.**

**Never** a tender title, value, supplier or document. A locked tile says "Tenant data. Request break-glass access".

---

## D. Screen catalogue (Stages 1–3)

The page header strip shows these KPIs. "Rights" uses the roles doc levels: V view, E edit, D decide, A administer.

| Screen | Archetype | Header strip | Primary actions | Who (right) |
| --- | --- | --- | --- | --- |
| Tender radar | B | INT-1, INT-4, INT-3, INT-9, INT-8 | Upload; open sheet; mark disposition | Coord (E), BidMgr (V), HoT (E) |
| Intake queue | B | INT-5, oldest age, INT-6 | Accept / Correct / Not stated / Send back; resolve conflict; draft query | Coord (E), BidMgr (V own), HoT (E) |
| Screening | B | SCR-1, SCR-5, triage load (spec §6.9) | Open DG1 pack; JV scenario; request info | BidMgr (E), HoT (E), Coord (V) |
| DG1 decisions | D | SCR-1, SCR-2 | Pursue (assign team) / Discard (reasons) / Hold (request) | BidMgr (D assigned), HoT (D as delegate), others (V) |
| Packages & RFQs | B / C2 | SRC-1, SRC-2, SRC-4, SRC-7 | Approve packages; approve shortlist; send RFQs; open supplier preview | Proc (D), BidMgr (V, comment), HoT (V) |
| Quote levelling | E | SRC-6, SRC-2, SRC-9, SRC-10 | Confirm adjustments; approve best-fit; override with reason | Proc (D), Commercial (V), BidMgr (V summary) |
| Suppliers | B | total · screened current · due · blocked · SRC-8 | Add and screen; re-screen; edit profile | Proc (E), HoT (V) |
| Bid / No-Bid packs | C2 tab | DEC-7, DEC-8, DEC-3 | Request inputs; re-run; issue pack | BidMgr (E), HoT (V), contributors (E own section) |
| DG2 committee | D | DEC-1, quorum, SLA | Record position; declare conflict; record decision (chair) | Members (position), Exec (decision), HoT (secretary), BidMgr (present) |
| Pipeline | board / list | count and value by stage; CAP-2 | Open workspace; filter | All (scoped) |
| Calendar | calendar | CAP-3; holidays overlay | Open date; export ICS (demo toast) | All (scoped) |
| Company › Credentials | B | SCR-6; expiring in 90 days | Upload renewal; assign owner | HoT (A), credential owners (E own), BidMgr / Coord (V) |
| Company › Capability profile | F | none | Edit profile, sectors, geographies | HoT (A) |
| Administration › Users & roles | F | GOV-5 | Invite, assign role and scope, "View as" | HoT (A) |
| Administration › Committees & gates | F | gates without owners | Seats, quorum, SLAs, referral threshold | HoT (A) |
| Administration › Sources & integrations | F | INT-4 | Connect, credentials, assisted mode | HoT (A) |
| Administration › Fit model & rules | F | live impact counts | Weights, thresholds, PQ-fail rule | HoT (A) |
| Administration › Targets & SLAs | F | none | Every target in §0.4 | HoT (A) |
| Administration › Branding | F | none | Logo, accent, name alternative ("Tendering Director") | HoT (A) |
| Administration › Audit log | B | GOV-1, GOV-6 | Filter; export (demo) | HoT (V) |
| Tender Workspace | C2 | stage track, due, SLA, badges | Per tab (spec §4.1) | Scoped per role |
| Platform Console | G | PLT-1…6 | Break-glass request | Platform only |

---

## E. What happens to the client wireframe's Stage 1–3 tiles

Every client tile for the roles in scope, with its fate. The client's intent is kept wherever it holds.

| Client role / tile | Fate | Replaced by / reason |
| --- | --- | --- |
| **Coordinator** "Captured overnight 14" | Keep, reworded | INT-1 "New today". "Overnight" is wrong for a live register |
| "Awaiting validation 5" | Keep | INT-5, with "blocks DG1" and oldest age added |
| "Avg. intake to logged 9 min" | Change | INT-2 as **p90**. An average hides the one tender that took an hour |
| "Duplicates resolved 3" | Move | INT-8 goes to the Radar header. It's reassurance, not a desk KPI |
| "Missed tenders 0" | Keep | INT-3 |
| Validation queue, confidence by field, intake disposition | Keep | Panels C.1 1–2, and the queue. The client wireframe was strongest here |
| **Bid Manager** "My live pursuits 6" | Keep, sharpened | My live bids, split S1/S2/S3 with value |
| "DG1 decisions due 1" | Keep | SCR-1 |
| "Next submission 12 Mar" | Keep | Adds working days and GCC calendar flags |
| "Open blockers 3" | Change | Split into SCR-5 Eligibility risks and DEC-7 Inputs outstanding. "Blockers" was an unstructured bucket |
| "Bid coverage 84%" | Keep | SRC-2, counting only compliant levelled quotes |
| **Procurement** "Live RFQs 47" | Drop from tiles | A count with no action. It shows in the package board header |
| "Response rate 79% ▲ 22 pts since go-live" | Change | SRC-3 within SLA, with no go-live delta |
| "Packages with ≥ 3 quotes 7/9" | Keep, stricter | SRC-2 (compliant and levelled) |
| "Nudges sent by agent 118" | Move | SRC-11 on the Head of Tendering's Value panel. Vanity on a buyer's desk |
| "Open clarifications 4 · 0 stale" | Keep | SRC-5 |
| Normalised quote comparison | Keep, deepened | Quote levelling with the adjustments trace (spec §8.6) |
| **Executive** "Active pursuits 18 · weighted value" | Change | DEC-4 weighted only over tenders with a pack. Earlier probabilities don't exist yet |
| "Awaiting your decision 2" | Keep | DEC-1 with positions and quorum |
| "Win rate trailing 12: 34.2% ▲" | Keep, with n | OUT-1 "27% · n = 33". A delta vs prior year only if history supports it |
| "Avg. bid margin (base) 11.4%" | Drop here | A Stage 5 figure, out of demo scope. Pack margin *ranges* appear per decision |
| "On-time submission 100%" | Move | Stage 8. It goes to Head of Tendering outcomes as history |
| Pipeline by stage; capacity flag | Keep | Funnel panel; DEC-5 replaces the free-text capacity flag |
| "Why we win" | Keep, balanced | OUT-6 and OUT-5 (why we lose and why we walk away too) |
| Portfolio margin, bid vs delivered | Out of scope | Stage 9. Kept for the full-lifecycle preview |

---

## F. Seed story

The KPIs above must read as a coherent morning in the primary tenant on **Sun 8 Mar 2026**: a new hero tender on Etimad, a credential at risk, one DG1 due, one tender in Stage 2 with RFQs out, one pack at DG2. The target reading for each KPI per tenant is in [gcc-demo-data.md](gcc-demo-data.md) §Seed story. Executors seed data so that the *derived* values land there. Nobody types the numbers.
