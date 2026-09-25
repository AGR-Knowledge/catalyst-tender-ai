# Product foundation: Catalyst Tender AI

AGR product definition, v2, 2026-09-25. Read this before designing or building anything in `app/`.

**Current focus (decided 2026-09-25):**
- **market:** GCC EPC contractors;
- **depth:** Stages 1–3 with DG1 and DG2;
- **tenants:** five fictional GCC tenants;
- **language:** English tenders first, Arabic as a bonus.

The Indian tenant and data stay for later. The full set of decisions is in [s1-s3-demo-spec.md](s1-s3-demo-spec.md).

Companion docs:
- [roles-and-access.md](roles-and-access.md): every role and permission;
- [s1-s3-demo-spec.md](s1-s3-demo-spec.md): what the Stage 1–3 demo does;
- [kpi-and-screen-catalogue.md](kpi-and-screen-catalogue.md): what each role sees;
- [gcc-demo-data.md](gcc-demo-data.md): tenants, tenders and the GCC facts;
- [ui-direction.md](ui-direction.md): how the screens look and behave.

---

## 1. What it is, in one paragraph

Catalyst Tender AI is an agentic bid and tender platform for large EPC and infrastructure contractors: roads, bridges, power, water, hospitals and public buildings.
- **A mesh of 10 specialised AI agents** does the high-volume work: portal watching, reading tender documents, chasing suppliers, pricing roll-ups, drafting, compliance checking, packaging.
- **The work runs through 9 lifecycle stages.** Named people decide at **3 mandatory gates**, and every tender lives once in **a single Tender Registry**.
- **The promise is not "AI writes your bid".** It is a *governed* bid operation: faster, evidence-based, auditable, and learning from every outcome.

## 2. Who's who

| Term | Meaning |
| --- | --- |
| **Catalyst** (Catalyst Solutions Pte Ltd, Singapore) | Owns the platform and **resells it** to EPC contractors. Leads all sales conversations. Wrote the specification, the blueprint and the client wireframes |
| **AGR** (AGR Knowledge Services) | Us. The build contractor: we design and build the platform and this demo |
| **Tenant** | One EPC customer company using the platform as its bid function. The demo has five fictional GCC tenants (primary: a KSA water and infrastructure contractor) plus the original *Genesis EPC India Ltd* for later; see gcc-demo-data.md |
| **Tenant users** | The customer's bid team: coordinator, bid managers, procurement, planning, commercial, proposal, compliance and legal, leadership, project directors |
| **Platform operator** | Catalyst, running the tenant estate: provisioning, configuration, model governance, cost |
| **Suppliers** | The tenant's subcontractors, who answer RFQs (Supplier Portal) |

Because the product is **resold to competing contractors**, multi-tenancy and data isolation are not features. They are the business model. This was Catalyst's single biggest concern when it reviewed AGR's proposal.

## 3. Why it exists: the buyer's problem

A large EPC tender arrives as hundreds of pages of specifications, drawings, forms and addenda. The bid team must turn it into a compliant, priced, persuasive submission in three to six weeks, alongside every other live bid. The work is done well by experienced people. It is done manually, in parallel, under time pressure, and without institutional memory. **The bid team is not the bottleneck; the process around them is.**

There is one failure point per stage, and they compound:

| Stage | Where it breaks today |
| --- | --- |
| 1 Identification and screening | Portals watched inconsistently; tenders found late or missed; requirements re-keyed by hand |
| 2 Subcontractor inputs | Buyers chase quotes instead of evaluating them; quotes arrive incomparable, late, or not at all |
| 3 Bid / No-Bid | Pursuit decided on anecdote and optimism; weak bids use up the resource strong bids needed |
| 4 Scheduling | The programme is built in isolation from cost and stops matching reality when scope moves |
| 5 Cost and margin | Overheads, bonds, escalation and FX treated differently by each estimator; nobody can rebuild the number |
| 6 Proposal drafting | Content re-invented from scratch; what won last time is never found |
| 7 Compliance | The matrix is assembled last, so gaps are found too late to close well |
| 8 Submission | Formatting, signatures and portal constraints become a deadline-night risk |
| 9 Post-award and learning | Outcomes recorded but never analysed; the next bid starts no wiser |

**The pains buyers feel most**, from the client's discovery answers, in their words paraphrased:
1. **Bids disqualified on avoidable pre-qualification errors:** expired certificates, the wrong financial year used for turnover, missing JV agreements. Each one throws away the whole bid effort.
2. **Analysts buried in extraction:** reading every NIT/RFP by hand to find eligibility, deadlines, scope and PQ thresholds, when they should be analysing competitors and shaping bids.
3. **Subjective bid/no-bid:** no scoring, no confidence, no link to past win rates. Weak bids go through to full preparation and are abandoned or lost.
4. **Compliance checked last**, by a manual checklist whose quality depends on who ran it.
5. **No learning:** win/loss reasons live in emails and memory.

The client's own definition of an early win is:
- tenders captured automatically from the portals they watch;
- a PQ compliance check run on every tender;
- a committee meeting that actually uses AI scores;
- measurably less analyst time on screening.

**A demo that makes a prospect *feel* those five pains being solved will sell. A tour of features will not.**

Targets the platform is engineered against (from Catalyst's sales deck):
- intake to logged in ≤ 15 minutes;
- ≥ 95% extraction accuracy on key fields;
- 100% mandatory compliance coverage;
- 100% on-time submission;
- win-probability calibrated to within ±10%;
- up to 70% faster sourcing cycles;
- 30–50% better bid coverage;
- up to 30% lower procurement cost;
- ~35% fewer delivery delays.

## 4. How the product works

| Stage | Agent (does the work) | Business owner (decides) | Control point | Key output |
| --- | --- | --- | --- | --- |
| S1 Tender Identification & Screening | Intake & Extraction | Tender Coordinator validates; Bid Manager decides | **DG1 Pursue / Discard**; M1 Logged & Qualified | Registry record, extracted requirements with confidence and page provenance, fit score, key-dates calendar |
| S2 Subcontractor & Internal Inputs | Outreach & Evaluation | Procurement Lead | none | Normalised quote register, best-fit supplier mix, open clarifications |
| S3 Bid / No-Bid Decisioning | Win-Probability & Recommendation | Bid Committee / Executive Sponsor | **DG2 Bid / No-Bid** | Win probability with an uncertainty band, competitor view, resource impact, top risks, committee pack |
| S4 Scheduling (runs in parallel with S5) | Scheduling | Planning Manager | M2 (with S5) | Baseline Gantt, critical path, resource histogram, schedule risks |
| S5 Cost & Margin (runs in parallel with S4) | Costing & Margin | Commercial Manager | **M2 Baselines Approved** | Priced BOQ, direct/indirect build-up, base/stretch/defensive scenarios, cashflow |
| S6 Proposal Drafting | Drafting & Section Assembly | Proposal Manager | none | Drafts with every reused claim cited, SME tasks, simulated evaluator score |
| S7 Compliance & Risk | Compliance Verification | Compliance / Legal Lead; Tender Review Board decides | **DG3 Final Approval** (Approve / Rework) | 100% requirement-to-evidence matrix, gaps by severity, redlines, risk register, independent review |
| S8 Compilation & Submission | Document Assembly & e-Submission | Bid Manager; Authorised Signatory signs | **M3 Bid Submitted** | Package in every required format, integrity checks, receipt |
| S9 Post-award & Learning | Delivery Oversight (9a), Learning Loop (9b) | Project Director (9a), Head of Tendering (9b) | Loop back to S1 | Delivery KPIs against bid commitments; refreshed win, supplier and margin models |

Gate SLAs:
- **DG1** within 24 hours of M1.
- **DG2** within 24 hours of the pack.
- **DG3** within 48 hours of the pack.

Gates cannot be bypassed. A DG3 "Rework" sends the tender back to S6 or S7.

**What the agents never do**, the guardrails, stated in the spec and shown in the UI:
- the Intake Agent never discards a tender;
- the Win-Probability Agent never makes the bid call;
- the Outreach Agent never commits spend or issues a PO;
- the Costing Agent never sets a price without the Commercial Manager;
- Compliance cannot clear DG3 with an open mandatory gap;
- Document Assembly never submits without a DG3 record and a signatory;
- Learning Loop changes need governance approval.

## 5. The nuance: rules every screen must respect

These principles are what separate this product from "a workflow tool with AI bolted on". Every demo screen should make at least one of them visible.

1. **Agents recommend; named people decide.** Every AI output is labelled as a recommendation. Every decision shows who made it, when, what they saw and why. Overrides are welcome and recorded ("override recorded: rank 2 selected on delivery record").
2. **Evidence at every gate.** A gate is never a bare button. It is an evidence pack: scores with uncertainty, sources, risks, and what changed since last time.
3. **Confidence and provenance on every extracted value.** Each field carries its source page and a confidence level. Low-confidence values go to a human queue, never silently accepted. One click traces a number back to its source document or quote.
4. **One record, many views.** Every role looks at the *same* tender record through its own lens. A number must never disagree between two dashboards. (In code: facts live only in `src/data`; everything is derived in `src/domain/live.ts`.)
5. **Numbers are computed, never generated.** Schedules, BOQ roll-ups, escalation, tax and FX come from deterministic engines. The AI writes the narrative around them.
6. **Uncertainty is shown, not hidden.** Win probability always has a band, and a low-data warning when comparables are few. Where two options carry near-identical value (base against stretch margin), the agent surfaces the trade-off and leaves the judgement to the human.
7. **Problems surface early.** The compliance gap is detected at Stage 6, not deadline week. Addenda are linked to their parent and re-flag the affected prices, schedule activities and clauses automatically.
8. **Need to know.** Margin and competing quotes are shown only to roles that need them. Suppliers see only their own RFQ lines. Restricted tenders are invisible to everyone else. See the roles doc.
9. **Everything is audited.** Every agent action and human decision is timestamped and attributed, including demo persona switches.
10. **It learns.** Outcomes feed back into scoring, supplier ranking and margin models, visibly and under governance.

## 6. What we are doing now: a demo to validate demand

The full platform is a large, six-month build. **Before building it, AGR and Catalyst want to prove that EPC contractors will buy it.** The job of `app/` right now is a clickable, believable demo. It is not the product.

**Audience:** heads of tendering, MDs and CFOs, commercial and procurement heads at **GCC** EPC contractors, in a meeting led by Catalyst.

**Scope now: Stages 1–3 with DG1 and DG2** (discover and qualify, source, decide). Stages 4–9 are hidden in demo scope mode; their roles appear as contributors to the Stage 3 pack. See s1-s3-demo-spec.md §2.

**The demo must:**
- show **short, complete flows**, each one landing a single pain, rather than the whole product at once. A presenter picks two or three flows per meeting;
- feel real to a GCC tendering department:
  - a synthetic but faithful KSA tender as the hero, plus real Middle East documents for intake variety (including Arabic);
  - tenant currencies (SAR, AED, QAR, OMR, KWD) and the GCC calendar (Ramadan, Eid, weekends);
  - national portals and the paperwork GCC bids live on (classification, Zakat, social insurance, nationalisation, local content);
  - consistent numbers across every screen;
- show governance and roles: a prospect should see *their* organisation in it, with the Head of Tendering, the Bid Committee voting by name, and procurement each seeing what they should;
- show that the same tender gives **different answers for different companies**: five tenants, one hero tender;
- reset in one click, and be brandable for a specific prospect.

**The standing demo scenarios** (the committed demo backbone):
1. **Discover → qualify → DG1.** A tender arrives (upload or portal), fields are extracted with confidence and page links, the fit score and PQ eligibility are checked, and the Bid Manager decides Pursue.
2. **Full bid build.** Supplier quotes, baseline schedule, priced BOQ, base/stretch/defensive margin scenarios, the M2 freeze.
3. **Compliance with deliberate gaps.** The matrix catches an expiring certificate early, DG3 is blocked until the gap is closed, and the board approves.
4. **Dry-run submission.** Package assembly, integrity checklist, signatory, receipt.
5. **A populated Executive Dashboard** with plausible pipeline history, win rate and margin trends.

Plus one-click reset and prospect branding.

**For the Stage 1–3 GCC demo** these become scripts A–F in s1-s3-demo-spec.md §17:
- A: from portal to Pursue;
- B: quotes without chasing;
- C: the committee decides;
- D: same tender, five companies;
- E: Arabic in, English out;
- F: who can see what.

Scenarios 2–5 above return when the demo extends past Stage 3.

## 7. What exists today (app/, as of 2026-09-25)

A React 18 + Vite + TypeScript front end with no backend. Demo state lives in `localStorage` (`ctai.demo.v1`). Demo "today" is Sun 08 Mar 2026.

- **8 role dashboards:** Executive Sponsor, Bid Manager, Tender Coordinator, Procurement, Commercial, Proposal, Compliance/Legal, Project Director. There is also a persona switcher, a walk-through bar that hands the tender from role to role, and hand-over packages.
- **Shared pages:** Pipeline (board, list, calendar), Workflow (stages, gates, RACI), Agent Console, Submission desk, Supplier database, Artefacts library, BOQ and rates, Settings (tenants, sources, users, theme, reset).
- **Tender intake:** upload a PDF; simulated staged extraction; a review page with every field linked to its page in an in-app PDF viewer; a 7-criterion compatibility score; add to register.
- **A register of 18 tenders**, with the gates DG1, DG2 and DG3, M2 and M3 as recorded decisions. Global search (⌘K), light and dark themes, responsive layout, and motion polish (plan 001).
- **Strengths:** clean, credible visual design; derived-state discipline (`live.ts`); real PDFs with page-level provenance; good narrative spine (the walk-through).

## 8. Known gaps (from the 2026-09-25 audit)

**Flow continuity**
- **Downstream work exists only for the focus tender T-2026-041.** Tenders pursued at DG1 or approved at DG2 get no RFQs, schedule, cost model, draft or compliance work.
- **Uploaded tenders can never reach DG1.** All three demo PDFs are past-dated, so they are held, and there is no "release hold".
- T-2026-050 reaches DG1 but no one can decide it.
- There is no Stage 4 (planning) workspace.
- There is no Stage 9 transition, no award or loss outcome, and no link from a submitted bid to delivery.
- DG3 data is inconsistent: T-2026-049 carries the gate, but the flow runs on 041.
- M2 cannot be re-opened.

**Roles and access.** See [roles-and-access.md](roles-and-access.md). In short:
- the Planning Manager and the Head of Tendering (super admin) are missing;
- there is no admin tier;
- access is by page only, with no tender scoping and no masking;
- Compliance records DG3 itself;
- the Bid Committee and Tender Review Board are single personas.

**Simulated depth**
- About 19 drawer actions and many page actions only raise a toast: evidence pack, audit entries, nudges, section cards and others.
- There is no addenda-impact flow (client WF10) and no Supplier Portal.
- There is no prospect branding.

**Data discipline.** Several numbers are hard-coded in pages, against the "never type a number into a page" rule: sidebar intake badge, some dashboard KPIs, Agents KPIs, the Exec T-2026-049 row, the DG2 modal rows.

## 9. Glossary

| Term | Meaning |
| --- | --- |
| EPC | Engineering, Procurement and Construction contract |
| NIT / RFP / RFQ / ITT | Notice Inviting Tender / Request for Proposal / Request for Quotation / Invitation to Tender |
| PQ | Pre-qualification: turnover, similar-work experience, net worth, bid capacity, registrations |
| EMD / bid security | Earnest money deposit, or bank guarantee, submitted with the bid |
| BOQ | Bill of Quantities: priced schedule of items and quantities |
| L1 / QCBS | Lowest bidder wins / Quality- and Cost-Based Selection |
| DSC | Digital Signature Certificate, used to sign e-portal submissions (India) |
| CPPP, GeM, BIMS | Indian government e-procurement portals |
| Etimad | Saudi government e-procurement platform. Other GCC portals are listed in gcc-demo-data.md |
| GTPL | Saudi Government Tenders and Procurement Law and its Implementing Regulations |
| Classification | Government contractor classification by field and grade (e.g. KSA Contractor Classification). Often a PQ requirement |
| Zakat / GOSI / Nitaqat | KSA Zakat and tax certificate; social-insurance (GOSI) certificate; Saudization band (Nitaqat). Typical bid credentials with expiry dates |
| ICV / local content | In-Country Value (UAE, Oman, ADNOC) and local-content schemes (KSA LCGPA). Often scored in evaluation |
| Bank guarantee facility | The contractor's bank line for bid, performance and advance-payment guarantees. Bonds consume it for their validity |
| Levelling | Normalising supplier quotes to common terms (currency, VAT, delivery terms, validity, exclusions) before comparing them |
| Head of Tendering | Top tenant persona: runs the Tendering department and administers the tenant |
| DG1–DG3 | Decision gates: Pursue/Discard, Bid/No-Bid, Final Approval |
| M1–M3 | Milestones: Logged & Qualified, Baselines Approved, Bid Submitted |
| TRB | Tender Review Board (approves DG3) |
| TID | Tender ID in the registry (app format `T-2026-0NN`) |
| Tenant | One EPC customer company on the platform |
| No-egress lane | Isolated processing for restricted or defence tenders; nothing leaves the boundary |

## 10. Source documents

Local only, not in git. They sit in `docs/`, ignored because the repo is public:
- the client's discovery responses;
- the client's Agentic System Specification v1.0, treated as the fixed requirement set;
- the client's Discovery, Design & Delivery Blueprint;
- AGR's Data Flow worked example (NH-57 Takera bridge);
- AGR's proposal and gap-register response;
- the six-month action plan and the 74-feature release roadmap;
- costing;
- sample tenders (India and Middle East).

In git (`docs/07-product-design/`):
- the client's role-dashboard wireframe (interactive `index.html`, plus a PDF per role);
- the client's 15 agentic-workflow wireframes;
- Catalyst's sales presentation;
- AGR's design the app is built from (`agr-design/`);
- the UI/UX team's Bid Workbench (`agr-uiux-bid-workbench/`);
- these product-definition docs.
