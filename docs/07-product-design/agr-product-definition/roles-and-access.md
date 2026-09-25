# Roles and access: Catalyst Tender AI

Draft v2, 2026-09-25. AGR product definition. v2 applies the decisions below. They supersede anything later in this document that contradicts them.

**Decisions taken with the user on 2026-09-25:**

| # | Decision | Effect in this document |
| --- | --- | --- |
| R1 | **Merge the tenant super admin and the tenant IT admin into one persona, titled "Head of Tendering"** (tenant-configurable alternative: "Tendering Director"). Not "Administrator" | T1 now carries the IT duties. T2 is an optional product role, not a demo persona (§4) |
| R2 | **"Procurement / Estimation Lead" becomes "Procurement Lead"** | B4; overlap 7.2 resolved as recommended |
| R3 | **The Bid Committee votes as named members** in the DG2 screen. The same pattern is ready for the Tender Review Board | G1; spec §10 has the seats, quorum and rules |
| R4 | **The Catalyst Platform Console is shown briefly** to prospects, as proof of data isolation | P1 |
| R5 | **Demo scope is Stages 1–3 with DG1 and DG2, for GCC EPC contractors.** Stage 4–9 roles act as contributors ("My requests") in the demo | Personas in the switcher follow [s1-s3-demo-spec.md](s1-s3-demo-spec.md) §3 |
| R6 | Finance / Treasury and the Sector Head are **committee members and contributors**, not standalone personas | G1, Tier C |
| R7 | The Head of Tendering **may decide DG1 as a recorded delegate** of an absent Bid Manager | T1 |
| R8 | **DG2: committee members record named positions; the Head of Tendering gives the final approval** (reason required against the majority). The CEO is an ordinary member (seat `ceo`); quorum is 3 of 5 positions. Supersedes the chair in R3 (2026-09-25) | G1, T1; [dashboards.md](dashboards.md) §9 |
| R9 | **DG3 (final bid approval): the Head of Tendering approves**, on a simple gate screen; Compliance / Legal issues the DG3 pack (2026-09-25) | T1, B7; dashboards.md §9 |
| R10 | **Every role has a dashboard with the same layout**, and Stages 4–9 have stage dashboards with real tenders (no working screens). Supersedes R5's "contributors only" for Planning, Commercial, Proposal, Compliance and Project Director: each now has its stage dashboard as home, and still answers pack requests (2026-09-25) | dashboards.md §8, §10 |
| R11 | **A Proposal Manager persona (`prop`) exists in GCC tenants**, as owner of Stage 6. Finance and HR can open Company, to reach the credentials they own (2026-09-25) | dashboards.md §8.3, §12.6 |

Still open: the Supplier Portal login model (accounts, or a secure link per RFQ). The demo uses a secure link per RFQ (§11).

**What this is.** The role model for the platform:
- who the users are, and what each does in a real EPC bid office;
- what each role sees, what it may do, and on which data;
- how the roles in the client's material overlap;
- what is missing, including a super admin.

It is written to drive the demo build in `app/`. Every recommendation ends in something a plan can implement (section 10).

**Sources.**
- Client Agentic System Specification v1.0: §3.4 control points, the per-stage RACI tables in §4, §6 gates, §10.1 identity and access.
- Client role-dashboard wireframe: RACI tab, 9 role pages, Agent Console.
- Client "Top 15 Agentic Tender Workflows" wireframes.
- Client discovery responses.
- AGR proposal v2.2: §3.2 tenant versus operator, §13.1.1 identity.
- The current app: `app/src/data/roles.ts`, `access.ts`, `stages.ts`, and the gate checks in `components/overlays/*`.

---

## 1. The short version

1. **The client's RACI names 10 business roles; the app has 8 personas.** Two roles have no persona:
   - **Planning Manager**: accountable for Stage 4, co-owner of milestone M2.
   - **Bid Office / Analytics**: accountable for the Stage 9b learning loop; owner of the Tender Registry and Knowledge Base.

   The app maps these two RACI rows onto the Bid Manager and Project Director keys (`stages.ts`, RACI rows reuse `bid` and `dir`).
2. **There is no admin tier.** There is no tenant administrator, no platform operator and no super admin.
   - Settings labels its cards "Administrator only" and "Platform administrator only", but every persona can open it.
   - "Add tenant" is available to everyone.
   - "Users and roles" only raises a toast.
3. **Access today means which pages appear in your sidebar, and nothing more.** The model has no idea of:
   - *what you may do* on a page (view, edit or decide);
   - *which tenders* you may see: every persona sees all 18 tenders and every drawer;
   - *which fields are sensitive*: margin, competing quotes, personal data.
4. **Three governance bodies are modelled as one person, or not at all.**
   - DG2 (Bid Committee) is decided by the single `exec` persona.
   - DG3 (Tender Review Board) has no persona; the Compliance Lead "convenes" it and records the decision, which breaks segregation of duties.
   - The AI Governance Forum does not exist.
5. **Contributors and outside parties have no access model.** This covers:
   - SMEs;
   - the Independent Reviewer (mandatory before DG3);
   - the Authorised Signatory (signs the submission);
   - Finance and Treasury (bid security, certified turnover);
   - suppliers (Supplier Portal);
   - JV partners.
6. **Section 7 checks eleven pairs.**
   - **Two names for one thing (2):** Project Director and "Delivery Manager"; Tender Review Board and "Technical Review Board".
   - **Different roles merged or folded together (4):** Executive Sponsor with the Bid Committee; Procurement with Estimation; Planning Manager into Bid Manager; Bid Office into Project Director.
   - **Conflicting owner names across client documents (1):** who decides DG1.
   - **The app letting the wrong role act (2):** Compliance records DG3; Commercial alone freezes M2.
   - **Not real overlaps, clarified (2):** the Stage 8 split between Bid Manager and Proposal Manager; the client's "BD Manager".
7. **Add a super admin, but as two roles, because the product is multi-tenant and resold (section 8).**
   - The **Tenant Super Admin** ("Head of Tendering") sees everything inside one EPC company.
   - The **Platform Super Admin** (Catalyst) sees the whole tenant estate, but not a tenant's bid data except through a logged, time-boxed, second-approver break-glass.
   - Neither can record a gate decision that belongs to someone else.

**Target for the demo** (revised for decisions R1–R6):
- **The switcher groups personas** as Tendering team · Bid Committee · Contributors · External · Platform (spec §3).
  - **Tendering team:** Head of Tendering, Tender Coordinator, Bid Manager, Procurement Lead.
  - **Bid Committee:** Executive Sponsor (chair), CFO, Technical Director, Operations Director, Sector Head.
  - **Contributors:** Commercial, Planning, Compliance / Legal, Project Director (designate), Finance / Treasury.
  - **External:** Supplier (portal preview).
  - **Platform:** Catalyst Platform Operations.
- **The Bid Committee votes as named members** inside the DG2 screen. The Tender Review Board and the AI Governance Forum are documented, but outside the Stage 1–3 demo.
- The Planning Manager and the Independent Reviewer stay in the model for the full lifecycle. They are not in the Stage 1–3 switcher, except Planning as a contributor.

---

## 2. How roles work in a real EPC bid office

The spec's roles are an idealised RACI. Real infrastructure and EPC companies (roads, bridges, power, water, hospitals) run tendering across several departments. Knowing who these people really are decides what each screen should show.

| Real department and people | What they actually do on a bid | Spec role it maps to |
| --- | --- | --- |
| **Business Development**: BD managers and analysts | Watch portals, log opportunities, first go/no-go screen with the Sector Head. Most of their time goes on reading and extracting tender documents | Tender Coordinator (intake), and partly Bid Manager |
| **Tendering / Bid Office**: Head of Tendering or Bid Director, bid managers | Own each live bid end to end, run the bid calendar, present to the committee, own the tender register and the past-bid library | Bid Manager; the head is "Bid Office / Analytics" |
| **Estimation**: estimation engineers, quantity surveyors | Take off quantities, analyse rates, price the BOQ | Split between Procurement (quotes) and Commercial (rates). The spec merges it as "Procurement / Estimation" |
| **Planning**: planning engineers (Primavera P6 / MS Project) | Bid programme, critical path, resource histogram | Planning Manager |
| **Procurement / Contracts**: buyers, subcontracts managers | Package the scope, find suppliers, issue RFQs, chase and compare quotes | Procurement Lead |
| **Commercial / Finance**: commercial manager, CFO, treasury | Overheads, bonds, escalation, FX, margin. Treasury issues bid security and bank guarantees; finance certifies turnover and net worth | Commercial Manager, plus Finance/Treasury (missing) |
| **Engineering / Design**: VP Engineering, design managers | Technical solution, method statements, design basis; the "E" in EPC | SMEs; VP Engineering sits on the committee |
| **Legal / Company Secretary**: in-house legal, external counsel | Contract risk, redlines, power of attorney, board resolutions | Compliance / Legal Lead |
| **QHSE**: HSE manager, quality manager | HSE plans, ISO certificates, ESG evidence | SMEs; certificates feed compliance |
| **HR** | Key-personnel CVs | SMEs |
| **Leadership**: MD/CEO, CFO, sector or BU heads | Go/no-go committee, final sign-off, portfolio view | Executive Sponsor, Bid Committee, Tender Review Board |
| **Operations / Projects**: project directors | Endorse whether the bid can actually be delivered; run the project after award | Project Director |
| **IT** | SSO, users, integrations (ERP, SharePoint, M365) | Head of Tendering → Administration (R1); optional IT Administrator role |

The client's own process (discovery responses) confirms this shape:
1. BD logs the opportunity.
2. BD and the Sector Head filter it within 24–48 hours.
3. A weekly committee decides go/no-go: MD/CEO in the chair, CFO, VP Engineering, Sector Head and the BD Manager. The MD can override the committee.
4. The CFO and VP Engineering release a bid budget and assign a bid manager.
5. The MD signs off the final package.

Three principles follow for access control. The platform must enforce them, not merely suggest them.
- **Need to know.** Margin, cost build-up and competing supplier quotes are the most sensitive data a contractor holds. Most roles do not need them.
- **Segregation of duties.** The person who prepares a gate pack does not approve it. The independent reviewer is not on the drafting team. Agents recommend and never decide. Administrators configure and never decide bids.
- **Named accountability.** Every gate decision records who decided, when, what they saw and why. Acting for someone else is explicit ("on behalf of") and visible.

---

## 3. The access model: four questions for every user

Today the app answers only one question: which pages are in your sidebar. The target model answers four.

| Dimension | Question | Values |
| --- | --- | --- |
| **Role** | Which functions are yours? | The role catalogue in section 4 |
| **Permission level** | What may you do with a capability? | `—` none · `V` view · `C` contribute (only items assigned to you) · `E` edit (you own the artefact) · `D` decide or sign off (a gate, milestone or signature) · `A` administer (configure) |
| **Scope** | On which records? | `Estate` (all tenants; platform only) · `Tenant` (every tender in the company) · `Sector` (tenders in your sectors) · `Assigned` (tenders you are named on) · `Task` (only the tasks or sections assigned to you) · `Invited` (external: only what was sent to you) |
| **Sensitivity** | Which fields are masked? | Margin and pricing · competing quotes · personal data · restricted or defence tenders (section 6) |

In code this becomes one table: role × capability → level and scope, in `src/data/access.ts`. Every guard, button, modal, drawer action and search result reads from it (section 10, item P0-1).

---

## 4. Role catalogue (target)

Six tiers. "App today" says whether the role exists in the prototype.

### Tier P: Platform, operated by Catalyst

#### P1 · Platform Super Admin (NEW)
- **Who:** Catalyst's platform operations and product team. They run the tenant estate the product is sold into.
- **Purpose:** keep every tenant healthy, provisioned, configured and within cost. Govern the agents and models.
- **Home screen, "Platform Console":**
  - tenants and their onboarding status;
  - per-tenant health: connectors, intake latency, missed-tender reconciliation;
  - agent runs, eval pass rates and guardrail activations across the estate;
  - model routing and spend per tenant;
  - release and canary status;
  - break-glass requests.
- **Can:**
  - create and provision tenants, and book go-live;
  - set data residency and the pooled or silo tier;
  - configure the portal connector library, model routing tiers and cost ceilings;
  - view the Agent Console across tenants;
  - approve platform releases with the AI Governance Forum;
  - request break-glass access to one tenant.
- **Cannot:**
  - see any tenant's tender content, prices, margins, quotes or documents by default;
  - take any bid action;
  - record any gate.
- **Break-glass:**
  - time-boxed (e.g. 4 hours) and scoped to a single tenant;
  - needs a second approver;
  - the tenant's Head of Tendering is notified;
  - every screen viewed is written to the audit trail.
- **Why it matters for sales:** EPC buyers will ask whether Catalyst can see their prices. The answer, and the demo, must say no: not without your approval, and every access is logged.
- **App today:** none. Tenant cards and "Add tenant" sit in the shared Settings page, available to every persona.

#### P2 · Platform Support (optional, later)
Tier-1 support at Catalyst. Read-only tenant health and connector status. Uses the same break-glass path as P1. For the demo, fold it into P1.

### Tier T: Tenant administration and oversight, inside one EPC company

#### T1 · Head of Tendering: tenant super admin (NEW; absorbs "Bid Office / Analytics" and the Tenant IT Administrator, decision R1)
- **Who:** the head of the Tendering (Estimation & Tendering) department. Also titled Tendering Manager, Tendering Director, Bid Director or GM Tenders. Owns the bid function.
- **Why merged:** in the GCC contractors we are selling to, the tendering head is the person who asks for users to be added and sources to be connected. A separate IT persona made the demo longer without adding a buying moment.
  - Separation of duties is kept by **design, not by persona**. Administration is a distinct sidebar section; every admin change is audited; and the business rules (who decides which gate) still bind the Head of Tendering like anyone else.
  - A tenant that wants IT separated can enable the optional T2 role in the product.
- **Purpose:** see everything in the company's bid operation from intake to delivery. Own the registry, the knowledge base and the learning loop. Set how the platform decides.
- **Home screen:** awaiting the user's own sketch (spec §14). The candidate panels are in [kpi-and-screen-catalogue.md](kpi-and-screen-catalogue.md) §B: decisions across gates with SLA, the pipeline funnel, the credential expiry radar, capacity by team, bank facility, intake health, outcomes, trust and learning, value, team, and administration shortcuts. A **"View as" switcher** opens any role's desk read-only, with a banner.
- **Can:**
  - view every dashboard, tender, stage workspace and page in the tenant, including the Agent Console and audit log;
  - reassign bid managers and owners;
  - accept or reject learning-loop model refinements for the tenant;
  - edit business configuration: capability profile, fit-score weights, compliance rule sets, gate approvers and committee membership, KPI targets, branding;
  - act as the configured **delegate** for DG1 when a Bid Manager is unavailable. This is recorded "on behalf of" with a reason, and the owner is notified;
  - act as **secretary** of the Bid Committee: record members' positions during a live meeting, marked "recorded by secretary";
  - **administer the tenant** (the former T2 duties): invite, suspend and assign users to roles and scopes; manage sources, portal credentials (masked), mailboxes and integrations; set SSO/MFA; run access reviews; export the audit log;
  - approve booklet or document purchases requested by the Tender Coordinator (the platform never pays).
- **Cannot:**
  - record DG2 or DG3 unless they are a member of that body;
  - select a price, which is the Commercial Manager's call;
  - grant themselves a seat on a committee without the change being audited and visible to the chair.
- **Scope:** Tenant. Sensitive data: sees all of it, except restricted tenders they are not cleared for.
- **App today:** none. The "Learning loop" section sits on the Project Director's dashboard, and the RACI row borrows the `dir` key.

#### T2 · IT Administrator (optional product role; not a demo persona, decision R1)
- **Status:** in the demo these duties sit with the Head of Tendering (T1). The role stays in the product for tenants whose IT department must administer users and connectors without seeing bid content. The definition below is that optional role.
- **Who:** the EPC company's IT administrator (the seed data already names one: S. Kapoor, `tenants.ts`).
- **Purpose:** run the technical setup without seeing bid content.
- **Home screen, "Administration":** users and roles, SSO/MFA status, integrations (ERP, CRM, document library, M365), watched mailboxes, portal credentials (masked), data residency, audit export, access reviews.
- **Can:**
  - invite, suspend and assign users to roles, within the role policy T1 sets;
  - manage connectors and credentials;
  - run joiner, mover and leaver access reviews;
  - export the audit log.
- **Cannot:**
  - see tender content beyond register metadata (ID, title, stage, owner);
  - see prices, margins or quotes;
  - take any bid action;
  - grant themselves a business role.
- **Scope:** Tenant, metadata only.
- **App today:** none. The "Users and roles" card is toast-only and visible to everyone.

### Tier B: The core bid team (existing personas, refined)

#### B1 · Executive Sponsor (exists as `exec`, currently titled "Executive Sponsor / Bid Committee")
- **Who:** MD, CEO or a director.
- **Purpose:** portfolio health, capital at risk, and the decisions waiting on leadership.
- **Home screen, "Portfolio Dashboard":**
  - active pursuits and weighted value;
  - DG2 packs awaiting the committee;
  - win rate, average bid margin and on-time submission;
  - pipeline by stage with capacity flags;
  - "why we win";
  - bid versus delivered margin.
- **Can:**
  - chair the Bid Committee and record the DG2 outcome after members vote;
  - override the committee, with a reason that is recorded (the client confirmed the MD holds this authority);
  - sit on the Tender Review Board for DG3 when the tenant configures it;
  - review the quarterly governance pack.
- **Cannot:** edit any stage artefact. The dashboard is read-only apart from DG2 and DG3 membership.
- **Scope:** Tenant. Sensitive data: sees all of it.
- **Change:**
  - rename to "Executive Sponsor";
  - model the Bid Committee as a group (G1) that the Sponsor chairs;
  - enforce "read-only except at gates".

#### B2 · Bid Manager (exists as `bid`)
- **Who:** the tendering or bid manager who owns a set of live bids.
- **Purpose:** every live pursuit they own, what each is waiting on, and what needs their decision today.
- **Home screen, "Bid Cockpit":** their register, the "needs you today" queue, stage progress per tender, blockers, resources and clashes, and the next submission.
- **Owns:**
  - DG1 Pursue or Discard;
  - Stage 8 submission (accountable);
  - milestone M3;
  - presenting the recommendation at DG2 (responsible, Stage 3).

  Consulted at Stages 2 and 4–7.
- **Can:**
  - decide DG1 for their tenders;
  - assign the bid team;
  - approve scope packaging with Procurement;
  - reconcile price with win probability;
  - validate win themes;
  - perform the final visual review;
  - confirm submission and receipt;
  - raise addenda impact across stages (WF10).
- **Cannot:**
  - select the price (Commercial);
  - approve DG2 or DG3 (committee and board);
  - sign the submission (Authorised Signatory).
- **Scope:** Assigned for detail and actions. Tenant, at summary level, for the pipeline.
- **Change:**
  - scope actions and detail to *assigned* tenders;
  - give bid managers N. Gupta and P. Shah a cockpit, or at least let the data say who owns what. Today `mine` is hardcoded to R. Iyer, so 11 of the 18 tenders have no working owner.

#### B3 · Tender Coordinator (exists as `coord`)
- **Who:** a BD or bid-office analyst.
- **Purpose:** everything the Intake Agent captured, and the fields it was not confident enough to accept alone.
- **Home screen, "Intake & Validation Queue":**
  - captured overnight, by source;
  - awaiting validation;
  - intake-to-logged time;
  - duplicates resolved;
  - missed tenders;
  - the per-field validation queue;
  - extraction confidence by field;
  - today's intake disposition.
- **Owns:** Stage 1 (responsible); milestone M1, "Tender Logged & Qualified".
- **Can:**
  - upload tenders;
  - validate and correct extracted fields;
  - link duplicates and addenda to their parent tender;
  - confirm or override the fit score, with a reason;
  - release a held tender to DG1.
- **Cannot:** decide DG1. The agent never discards a tender, and neither does the coordinator: they flag, and the Bid Manager decides.
- **Scope:** Tenant, for everything at intake. Summary view after DG1. Sensitive data: none.
- **Change:** add "Release hold". Today every uploaded demo document is past-dated and can never reach DG1.

#### B4 · Procurement Lead (exists as `proc`, currently titled "Procurement / Estimation Lead"; renamed per R2)
- **Who:** head buyer or subcontracts manager.
- **Purpose:** package coverage, live RFQs and normalised quote comparison for every trade.
- **Home screen, "Vendor & RFQ Hub":** live RFQs, response rate, packages with three or more quotes, agent nudges, open clarifications, the package board, quote comparison, and the guardrails in force.
- **Owns:** Stage 2 (accountable). Consulted at Stage 5, confirming supplier prices are firm.
- **Can:**
  - approve the supplier shortlist;
  - issue and chase RFQs;
  - approve or override the best-fit supplier mix, with a reason;
  - manage the Supplier Master;
  - answer suppliers' commercial questions.
- **Cannot:**
  - issue a commitment or PO (a guardrail in the spec);
  - see the margin or the selected price.
- **Scope:** Tenant, for the supplier master. Assigned, for tender packages. Sensitive data: sees competing quotes; margin is masked.
- **Change:** rename to "Procurement Lead" (see overlap 7.2). Estimation engineers become contributors under Commercial and Planning.

#### B5 · Planning Manager (NEW; the RACI row exists but borrows the `bid` key)
- **Who:** head of planning, a senior planning engineer.
- **Purpose:** a credible baseline programme that supports the technical narrative and reconciles with the cost model.
- **Home screen, "Programme Studio":**
  - baselines in progress;
  - the Gantt with its critical path and float;
  - the resource histogram and clashes, within and across bids;
  - long-lead items against Stage 2 packages;
  - the schedule risk register;
  - reconciliation status against the cost model.
- **Owns:** Stage 4 (accountable); co-signs milestone M2 with Commercial.
- **Can:**
  - validate durations and sequence;
  - resolve clashes;
  - move schedules from draft to baselined (the agent keeps schedules in draft until then);
  - sign off M2 on the schedule side.
- **Cannot:** change prices or supplier choices.
- **Scope:** Assigned. Sensitive data: sees cost at package level for reconciliation; margin is masked.
- **App today:** no persona, no dashboard, no Stage 4 workspace. M2 is frozen by Commercial alone.

#### B6 · Commercial Manager (exists as `comm`)
- **Who:** commercial manager or chief estimator.
- **Purpose:** the cost build-up, the margin scenarios and the sensitivity behind the number the company signs.
- **Home screen, "Cost & Margin Studio":** priced BOQ, base margin, break-even price, cost build-up split into direct and indirect, the base/stretch/defensive scenarios, sensitivity, the re-price log, and BOQ rates.
- **Owns:** Stage 5 (accountable); co-signs milestone M2.
- **Can:**
  - validate assumptions and edit rates;
  - **select the pricing strategy**, which only this role can do (a guardrail in the spec);
  - freeze the cost model at M2;
  - re-open M2 on a re-price event, with the reason recorded.
- **Cannot:** approve DG2 or DG3 unless they are a member of that body.
- **Scope:** Assigned. Sensitive data: sees all of it.
- **Change:**
  - M2 needs both sign-offs, Planning and Commercial;
  - add "Re-open M2". The UI promises it, but it does not exist.

#### B7 · Proposal Manager (exists as `prop`)
- **Who:** proposal or bid-writing manager.
- **Purpose:** section status, SME tasks and simulated evaluator scoring across the submission.
- **Home screen, "Proposal Workspace":** sections complete, SME tasks open and overdue, the simulated score, the section board, evaluator scoring, and win-theme coverage.
- **Owns:** Stage 6 (accountable); assembles the package at Stage 8 (responsible).
- **Can:**
  - assign and chase SME tasks;
  - approve sections;
  - run storyboard, pink-team and red-team reviews;
  - accept agent recommendations (e.g. swap CVs);
  - assemble the package.
- **Cannot:** see the cost build-up or margin. They see only the frozen bid price, after M2, for the commercial volume.
- **Scope:** Assigned. Sensitive data: sees personal data in CVs; margin is masked.

#### B8 · Compliance / Legal Lead (exists as `comp`)
- **Who:** head of contracts or legal, or a compliance manager (often with Company Secretary support).
- **Purpose:** requirement-to-evidence coverage, open gaps by severity, and the contractual redline position.
- **Home screen, "Compliance & Risk Console":** mandatory coverage, critical gaps (which block DG3), redlines applied and escalated, the compliance matrix, gaps by severity, and escalated contract positions.
- **Owns:** Stage 7 (accountable); the compliance matrix, redlines and audit trail.
- **Can:**
  - validate agent findings;
  - assign gap owners and due dates;
  - set contractual positions and send redlines;
  - compile the DG3 pack and convene the Tender Review Board.
- **Cannot:**
  - **approve DG3** (the Tender Review Board decides);
  - clear DG3 while a mandatory gap is open (a guardrail in the spec).
- **Scope:** Assigned. Sensitive data: sees the price for consistency checks; margin is masked.
- **Change:** today this persona records DG3 itself. Move the decision to the board (G2).

#### B9 · Project Director (exists as `dir`)
- **Who:** the project director, both the designate during the bid and the delivery lead after award.
- **Purpose:** won projects tracked against what the bid promised, with margin variance in view.
- **Home screen, "Delivery Oversight":** live projects and backlog, milestones at risk, margin variance, bid-versus-delivered figures, agent-detected deviations, and the delivery programme.
- **Owns:** Stage 9a (accountable). Consulted at Stages 3 and 4, endorsing that the bid can be delivered.
- **Can:**
  - approve corrective actions;
  - endorse schedule feasibility at Stage 4 as PD designate;
  - receive the hand-over pack on award.
- **Cannot:** accept learning-loop model changes. That moves to the Head of Tendering.
- **Scope:** Assigned, meaning their projects and the bids they are designated on. Sensitive data: sees bid versus delivered margin for their projects.
- **Change:**
  - move the "Learning loop" section to T1;
  - move the Agent Console link to T1 and P1;
  - one role, one name. The client's PDF calls this page "Delivery Manager & Oversight".

### Tier G: Governance bodies (groups, not personas)

Model these as **groups with members, a chair and a decision rule**. Each member is a user with a primary role. The gate modal shows each member's position, and the chair records the outcome.

| Group | Gate | Typical members | Decision rule | App today |
| --- | --- | --- | --- | --- |
| **G1 Bid Committee** | DG2 Bid / No-Bid, SLA 24h from the pack | MD/CEO (chair, i.e. the Executive Sponsor), CFO, Technical Director, Operations Director, Sector Head for the tender's sector; the Bid Manager presents without a vote; the Head of Tendering is secretary without a vote. Quorum: chair + 2 (spec §10) | Members record a position, and the chair records the decision. A chair override needs a reason. No-Bid triggers a courteous decline and a lessons-learned capture | The single `exec` persona decides |
| **G2 Tender Review Board** | DG3 Approve / Rework, SLA 48h from the pack | Chief Executive, Commercial Director, Operations Director, Legal Counsel (per client WF12) | Needs the Independent Reviewer's report and zero open mandatory gaps. Rework must say whether the tender goes back to Stage 6 or Stage 7 | Compliance Lead records it |
| **G3 AI Governance Forum** | Model and guardrail changes | Platform level: Catalyst security/compliance with the AI governance lead. Tenant level: Head of Tendering accepts tenant-specific refinements | Canary release with rollback; promotion gated on calibration | Not modelled. "Send to Forum" is a flag on the PD dashboard |

### Tier C: Contributors (scoped, time-bound access)

| Role | Who | Access | Can | Cannot | App today |
| --- | --- | --- | --- | --- | --- |
| **C1 Subject-Matter Expert** | Engineering, QHSE, HR, finance or legal specialists (e.g. A. Deshpande, Electrical) | Task: only the sections and tasks assigned to them | Draft content, upload evidence, answer compliance gaps assigned to them | See the pipeline, pricing or other sections | Named in data only |
| **C2 Independent Reviewer** | A senior engineer or manager outside the drafting team | Assigned: read-all on one tender before DG3 | Write the integrity-pass report, which DG3 requires | Edit any section. The system blocks assignment if they edited that tender (segregation of duties) | None |
| **C3 Authorised Signatory** | A director holding the power of attorney and digital signature certificate (DSC) | Assigned: the final package only | Sign the submission at Stage 8 | Change content | None |
| **C4 Finance / Treasury** | CFO's team, treasury | Task: bid security and financial pre-qualification items | Arrange the EMD, bid bond or bank guarantee; **certify turnover and net worth by financial year**; confirm working-capital headroom | See the proposal content | None ("confirm bond headroom with Treasury" in client WF03) |
| **C5 Sector / BU Head** | Head of Power, Transport or another sector | Sector: pipeline and scores for their sectors | Initial filter with BD; member of the Bid Committee | Edit stage work | None (the client asked for the scoring dashboard to be open to "BD Manager and Sector Head" in near real time) |

Why C4 matters for the demo: the client's biggest avoidable loss is PQ disqualification. They name expired certificates, the **wrong financial year used for turnover**, and missing JV agreements. A Finance-certified turnover table that the Compliance Agent checks against the tender's financial-year window turns that pain directly into a demo moment.

### Tier X: External parties

| Role | Access | Can | Cannot | App today |
| --- | --- | --- | --- | --- |
| **X1 Supplier / Subcontractor** | Invited: the Supplier Portal, only the RFQs sent to them, only the BOQ lines matched to them | Acknowledge, submit a quote (package or line level), answer clarifications, upload documents | See competing quotes, other suppliers or the tender's value. Nothing is sent to a supplier whose sanctions screening has lapsed | None. The UI/UX workbench design has the RFQ-send side |
| **X2 JV Partner / External Consultant** (later) | Invited: named documents on one tender | Contribute JV documents and credentials | Anything else | None |

### Non-human: agents
The 10 agents run under **service identities** scoped to one tenant. They are "Responsible (AI)" in the RACI. They never hold "Accountable" and never decide a gate:
- the Intake Agent never discards a tender;
- the Win-Probability Agent never makes the bid call;
- the Costing Agent never sets the price;
- the Outreach Agent never commits spend;
- the Document Assembly Agent never submits without a DG3 record and a signatory.

---

## 5. Who does what, stage by stage (target RACI)

This is the client's RACI with the new roles added. **Bold** marks a change from the client's matrix. `R` responsible · `A` accountable · `C` consulted · `I` informed · `·` not involved.

| Role | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tender Coordinator | R | I | I | · | · | · | · | I | I |
| Bid Manager | A | C | R | C | C | C | C | A | I |
| Procurement Lead | I | A | C | C | C | · | · | I | C |
| Executive Sponsor / Bid Committee | I | · | A | I | I | · | · | I | I |
| Planning Manager | · | C | C | A | C | C | · | · | C |
| Commercial Manager | · | C | C | C | A | C | C | · | C |
| Proposal Manager | · | · | · | · | · | A | C | R | · |
| Compliance / Legal Lead | · | · | C | · | · | C | A | C | I |
| Project Director | · | · | C | C | · | · | · | · | A (9a) |
| Head of Tendering | C | · | C | · | · | · | · | · | A (9b) |
| **Tender Review Board** | · | · | · | · | · | · | **A (DG3)** | I | · |
| **Independent Reviewer** | · | · | · | · | · | · | **R** | · | · |
| **Authorised Signatory** | · | · | · | · | · | · | · | **R** | · |
| **SMEs** | · | **R** | · | **C** | **C** | **R** | **C** | · | · |
| **Finance / Treasury** | · | · | **C** | · | **C** | · | **R (PQ financials)** | **R (bid security)** | · |

Milestones:
- **M1** is owned by the Tender Coordinator.
- **M2** is signed by the Planning Manager **and** the Commercial Manager.
- **M3** is owned by the Bid Manager.

---

## 6. Permission matrix

### 6a. Core roles

Legend: `—` none · `V` view · `V*` view with margin and pricing masked · `C` contribute on assigned items · `E` edit · `D` decide or sign off · `A` administer. `own` means on assigned tenders only.

Column key: HoT = Head of Tendering (T1) · IT = optional IT Administrator (T2; in the demo its rights sit with HoT) · Exec = Executive Sponsor · BM = Bid Manager · TC = Tender Coordinator · Proc = Procurement Lead · Plan = Planning Manager · Comm = Commercial Manager · Prop = Proposal Manager · Comp = Compliance / Legal Lead · PD = Project Director.

| Capability | HoT | IT | Exec | BM | TC | Proc | Plan | Comm | Prop | Comp | PD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Portfolio and pipeline** | | | | | | | | | | | |
| Portfolio dashboard (value, win rate, margin trend) | V | — | V | V* | — | — | — | V | — | — | V* |
| Pipeline / tender register | V | V (metadata) | V | V | V | V | V | V | V | V | V |
| Tender detail (all stages) | V | — | V | E own | V* | V* | V* | V own | V* | V* | V* |
| Workflow and RACI reference | V | V | V | V | V | V | V | V | V | V | V |
| "View as" another role's dashboard | V | — | — | — | — | — | — | — | — | — | — |
| **Stage 1 intake** | | | | | | | | | | | |
| Upload tender, intake queue | V | — | — | E | E | — | — | — | — | — | — |
| Validate extracted fields, link addenda | V | — | — | V | E | — | — | — | — | — | — |
| Override fit score (with reason) | V | — | — | V | E | — | — | — | — | — | — |
| Release a held tender to DG1 | V | — | — | E | E | — | — | — | — | — | — |
| **DG1 Pursue / Discard** | D (delegate) | — | V | **D own** | V | — | — | — | — | — | — |
| **Stage 2 sourcing** | | | | | | | | | | | |
| Supplier master | V | — | — | V | — | E | — | V | — | V | V |
| Approve scope packaging and shortlist | V | — | — | D own | — | E | — | — | — | — | — |
| Issue RFQs and nudges | V | — | — | V own | — | E | — | — | — | — | — |
| Competing quotes (comparison) | V | — | V | V own | — | E | — | V | — | — | — |
| Approve best-fit supplier mix | V | — | — | C | — | **D** | — | C | — | — | — |
| **Stage 3 bid / no-bid** | | | | | | | | | | | |
| DG2 evidence pack | V | — | V | E own | — | C | C | C | — | C | C |
| **DG2 decision** | member? | — | **D (chair)** | presents | — | — | — | member? | — | — | — |
| **Stage 4 programme** | | | | | | | | | | | |
| Baseline programme, Gantt, clashes | V | — | V | V own | — | C | **E** | V | V | — | C |
| Validate schedule (draft to baseline) | V | — | — | V | — | — | **D** | — | — | — | C (endorse) |
| **Stage 5 cost and margin** | | | | | | | | | | | |
| BOQ and rates | V | — | V | V own | — | V* | V* | **E** | — | — | — |
| Cost build-up, margin scenarios, sensitivity | V | — | V | V own | — | — | — | **E** | — | — | — |
| **Select pricing strategy** | — | — | — | C | — | — | — | **D** | — | — | — |
| M2 freeze (or re-open) | V | — | V | V | — | — | **D (schedule)** | **D (cost)** | V | V | — |
| **Stage 6 drafting** | | | | | | | | | | | |
| Proposal sections, section board | V | — | — | C | — | — | C | C | **E** | C | — |
| Assign SME tasks, run reviews | V | — | — | V | — | — | — | — | **E** | — | — |
| **Stage 7 compliance** | | | | | | | | | | | |
| Compliance matrix, gaps | V | — | V | V own | — | — | — | — | C | **E** | — |
| Redlines, contract positions | V | — | V | V own | — | — | — | C | — | **E** | — |
| Convene the TRB, compile the DG3 pack | V | — | — | C | — | — | — | — | — | **E** | — |
| **DG3 decision** | member? | — | member? | — | — | — | — | member? | — | prepares | member? |
| **Stage 8 submission** | | | | | | | | | | | |
| Assemble package, integrity checks | V | — | — | E own | — | — | — | — | **E** | C | — |
| Confirm submission and receipt (M3) | V | — | V | **D own** | — | — | — | — | — | — | — |
| **Stage 9 delivery and learning** | | | | | | | | | | | |
| Delivery projects, deviations | V | — | V | — | — | — | — | V | — | — | **E** |
| Approve corrective actions | V | — | — | — | — | — | — | — | — | — | **D** |
| Record award or loss outcome, debrief | E | — | V | E own | — | — | — | — | — | — | — |
| Accept learning-loop model refinements | **D** | — | V | — | — | — | — | — | — | — | V |
| **Governance and administration** | | | | | | | | | | | |
| Agent console (tenant) | V | V | V | — | — | — | — | — | — | — | — |
| Audit log | V | V (export) | V | V own | — | — | — | — | — | V | — |
| Artefacts library / knowledge base | E | — | — | V | — | — | — | — | E | V | — |
| Users and roles | A (role policy) | **A** | — | — | — | — | — | — | — | — | — |
| Integrations, portals, mailboxes, credentials | V | **A** | — | — | — | — | — | — | — | — | — |
| Capability profile, fit weights, compliance rules | **A** | — | V | V | V | — | — | — | — | V | — |
| Gate approvers, committee and board membership | **A** | — | V | — | — | — | — | — | — | — | — |
| Tenant branding (prospect white-label) | **A** | — | — | — | — | — | — | — | — | — | — |

"member?" means the role decides only if the tenant names that person in the body. Membership is configured by the Head of Tendering.

### 6b. Platform, contributor and external roles

| Capability | Platform Super Admin | Independent Reviewer | SME | Authorised Signatory | Finance / Treasury | Supplier |
| --- | --- | --- | --- | --- | --- | --- |
| Tenants: create, provision, residency, go-live | **A** | — | — | — | — | — |
| Model routing, cost ceilings, connector library | **A** | — | — | — | — | — |
| Estate health, agent runs, spend (all tenants) | V | — | — | — | — | — |
| Tenant bid data | break-glass only | V (assigned tender) | C (assigned tasks) | V (final package) | C (financial items) | — |
| Integrity-pass report (before DG3) | — | **E** | — | — | — | — |
| Sign the submission | — | — | — | **D** | — | — |
| Bid security, certified turnover and net worth | — | — | — | — | **E** | — |
| RFQ response, quote, clarifications | — | — | — | — | — | **E (own RFQs)** |

---

## 7. Overlaps and conflicts

| # | Pair | What the documents say | Verdict | Recommendation |
| --- | --- | --- | --- | --- |
| 7.1 | **Executive Sponsor vs Bid Committee** | The app merges them into one persona, "Executive Sponsor / Bid Committee". The spec names the DG2 approver "Bid Committee / Executive Sponsor". Discovery describes a five-person committee chaired by the MD, who can override it | **Two different things merged**: a person and a body | Keep an "Executive Sponsor" persona. Model the Bid Committee as a group (G1) that votes, with the Sponsor as chair |
| 7.2 | **Procurement vs Estimation** | The spec has one role, "Procurement / Estimation Lead". Client WF04 is owned by the "Procurement Lead" and WF05 by the "Estimation Lead". In discovery the *estimating team* also builds the BOQ, the programme and the technical compliance matrix | **Two real functions under one name**, and "estimation" also overlaps Commercial (rates) and Planning (programme) | Persona becomes "Procurement Lead": suppliers, RFQs, quotes. Estimation engineers become contributors under Commercial and Planning |
| 7.3 | **Planning Manager folded into Bid Manager** | The client's RACI has a separate Planning Manager row. The app reuses the `bid` key, and Stage 4 ownership goes to the tender's bid manager (`live.ts` `stageOwner`) | **Missing role**, not a true overlap | Add the Planning Manager persona and a Stage 4 workspace. M2 needs a Planning sign-off |
| 7.4 | **Bid Office / Analytics folded into Project Director** | The client's RACI has a separate "Bid Office / Analytics" row, accountable for Stage 9. The app reuses the `dir` key and puts the Learning Loop on the PD dashboard | **Missing role** | Add the Head of Tendering (T1); move the learning loop and model acceptance there. PD keeps delivery |
| 7.5 | **DG1 owner: Bid Manager vs "Bid Office Lead"** | The spec, the RACI wireframe and the app say Bid Manager. Client WF03 names the "Bid Office Lead" as owner | **Naming conflict** | The spec wins: AGR's action plan treats it as the fixed requirement set. The Bid Manager decides; the Head of Tendering is escalation and configurable delegate |
| 7.6 | **Tender Review Board vs "Technical Review Board"** | The spec: Tender Review Board. The feature roadmap: "Technical Review Board" | **Same body, wrong name** in one document | Use "Tender Review Board" everywhere. Keep it separate from the Bid Committee; one person may sit on both |
| 7.7 | **Compliance Lead vs Tender Review Board at DG3** | The spec: Compliance is accountable for the matrix, and the TRB for DG3. The app lets the Compliance persona record DG3 | **Segregation-of-duties breach** | Compliance prepares and convenes; board members approve |
| 7.8 | **Project Director vs "Delivery Manager"** | The client's PDF is titled "Delivery Manager & Oversight", but the role on the page is Project Director | **Same role, two names** | One role, "Project Director". A per-tender "PD designate" flag covers the pre-award consulting at Stages 3 and 4 |
| 7.9 | **M2 owner: "Planning + Commercial" vs Commercial only** | The spec: M2 is owned by Planning and Commercial together. The app: only `comm` can freeze M2 | **Incomplete gate** | Two sign-offs are needed |
| 7.10 | **Bid Manager vs Proposal Manager at Stage 8** | The RACI: BM accountable, PrM responsible | **Not an overlap**: PrM assembles, BM owns and confirms | Keep. Make the split visible on the Submission desk |
| 7.11 | **Tender Coordinator vs the client's "BD Manager"** | Discovery: the BD Manager logs opportunities *and* sits on the committee | **A real-world job that spans two spec roles** | No new role. Map the BD Manager as the Tender Coordinator for intake, plus Bid Committee membership |

Smaller conflicts to record:
- The UI/UX team's Bid Workbench design has a fourth gate ("Submit · DG4") and is a single shared workspace with no roles. The spec has three gates. **The spec wins.** Treat the Workbench as a source of interaction patterns, not of structure.
- `exec` can open the Agent Console. The client's own Agent Console page says "Operations and AI governance see this view; it is not part of the bid user experience." Move it to T1, T2 and P1.

---

## 8. The super admin: recommendation

The ask was one role that can see every dashboard and every stage, first to last. Build **two**, for three reasons:

1. **The platform is resold to competing EPC contractors.** A single super admin who sees everything across tenants would let Catalyst staff see one contractor's prices. That would be a data-protection problem: under the proposal's data-processing terms the tenant is the data controller. It would also lose sales. Buyers must hear "no one outside your company sees your bid data unless you approve it, and it is logged."
2. **Inside a company, "see everything" and "decide everything" must stay separate.** The spec's credibility rests on named people deciding at the gates. A super admin who could click "Approve DG3" would undo that.
3. **Technical administration and business oversight are different jobs.** IT should manage users and SSO without seeing margins. *Revised by decision R1:* in the demo the Head of Tendering does both. Separation comes from an audited Administration area and from gate rules that bind the Head of Tendering like anyone else. Tenants that need IT separated enable the optional T2 role.

| | **Tenant Super Admin (Head of Tendering)** | **Platform Super Admin (Catalyst)** |
| --- | --- | --- |
| Sees | Every dashboard (via "View as"), every tender, every stage, the agent console, the audit log, within **one tenant** | Every tenant's health, onboarding, agents, spend and releases. **No tenant bid content** |
| Configures | Business rules (capability profile, fit weights, compliance rules, gate approvers, committee membership, KPI targets, branding) **and** the tenant's technical setup (users, sources, credentials, SSO), per R1 | The estate: tenants, residency and tier, connectors, model routing, cost ceilings |
| Decides | Learning-loop acceptance. DG1 only as a recorded delegate. DG2 and DG3 only if named a member | Platform releases, with the AI Governance Forum |
| Never | Selects a price; approves a gate on someone else's behalf without delegation; votes on a committee they don't sit on | Takes bid actions; sees bid data without break-glass |
| Break-glass | n/a | Time-boxed, single tenant, second approver, tenant notified, every view audited |

**For the demo.** Both appear in the persona switcher, marked clearly.
- **"Head of Tendering · all access"** is the persona to open a demo with. One screen shows the whole company, and "View as" opens any role. It covers "one person who can see everything, first to last."
- **"Catalyst Platform Console"** is shown briefly. It proves multi-tenancy and the data-isolation promise, which is Catalyst's top concern in the gap review.

---

## 9. Sensitive data rules

| Data | Visible to | Masked for | Notes |
| --- | --- | --- | --- |
| **Margin and pricing**: margin %, cost build-up, break-even, scenario expected value | Executive Sponsor, Head of Tendering, Commercial Manager, the Bid Manager (own tenders), committee and board members, the Independent Reviewer (assigned tender) | Procurement (package costs only), Planning (package costs only), Proposal (frozen price only, after M2), Tender Coordinator, SMEs, the optional IT Administrator, Platform Super Admin, suppliers | A "margin confidentiality preserved" guardrail in the spec |
| **Competing supplier quotes** | Procurement, Commercial, the Bid Manager (own), Head of Tendering, Independent Reviewer | Everyone else. Never shown to another supplier | A "confidentiality of competing quotes" guardrail in the spec |
| **Personal data**: CVs, signatory IDs, employee credentials | Proposal Manager, HR SMEs, Head of Tendering | Everyone else; field-level masking | DPDP Act (India), PDPA (Singapore); for GCC tenants, the Saudi PDPL, the UAE federal PDPL and Qatar's PDPPL |
| **Restricted / defence tenders** | Named, cleared users only | Everyone else: hidden entirely, not even the title in search or counts | Processed in the no-egress lane |
| **Committee positions and win probability** | Executive Sponsor, committee members, the Bid Manager (own), Head of Tendering | Suppliers, SMEs | |

Segregation-of-duties checks the system enforces:
1. An agent never holds "Accountable" or decides a gate.
2. DG1 is decided by the assigned Bid Manager or a recorded delegate.
3. Only the Commercial Manager selects the price.
4. DG3 needs zero open mandatory gaps **and** an Independent Reviewer who has not edited that tender.
5. No submission without a DG3 record and a signatory.
6. Pure administrators (the optional IT Administrator, Platform Super Admin) cannot take bid actions. The Head of Tendering can, within the gate rules.
7. Any "on behalf of" decision needs a delegation record and a reason, and notifies the owner.
8. Persona switching in the demo is a labelled demo control, logged as such. It must never look like a real "log in as".

---

## 10. Gap against the current app, and what to build

### Current app, role by role

| Role | In app? | Home screen | Can act? | Main gaps |
| --- | --- | --- | --- | --- |
| Executive Sponsor | Yes (`exec`) | Portfolio Dashboard | DG2 alone | Merged with the committee; opens the Agent Console and Settings admin; T-2026-049 row hardcoded |
| Bid Manager | Yes (`bid`) | Bid Cockpit | DG1, submission, escalations | Only R. Iyer works; no scoping to assigned tenders; upload → DG1 path blocked |
| Tender Coordinator | Yes (`coord`) | Intake queue | Validations, uploads | No "release hold"; T-2026-050 DG1 dead end; "send back" closes the item |
| Procurement Lead | Yes (`proc`, "/Estimation") | Vendor & RFQ Hub | Select quote, approve packages | Naming; the escalation is also actionable by `bid` |
| Planning Manager | **No** | none | none | No persona, no Stage 4 workspace, no M2 sign-off |
| Commercial Manager | Yes (`comm`) | Cost & Margin Studio | Scenario, M2 | M2 single sign-off; no re-open |
| Proposal Manager | Yes (`prop`) | Proposal Workspace | One section card, CV swap | Most cards toast-only |
| Compliance / Legal Lead | Yes (`comp`) | Compliance & Risk Console | Gap, **DG3**, redlines | Records DG3 itself (segregation-of-duties breach) |
| Project Director | Yes (`dir`) | Delivery Oversight | Deviations, "send to Forum" | Carries the learning loop and Agent Console |
| Head of Tendering | **No** | none | none | The requested super admin does not exist |
| IT Administrator (optional; merged into HoT for the demo) | **No** | none | none | The Users and roles card is toast-only, open to all |
| Platform Super Admin | **No** | none | none | Tenant admin is inside the shared Settings |
| Bid Committee / TRB / Forum | **No** (groups) | none | none | Single-persona or wrong-persona decisions |
| Independent Reviewer, Signatory, SMEs, Finance | **No** | none | none | Named in data only |
| Supplier | **No** | none | none | No Supplier Portal |

### Recommended work, in order (each becomes a plan in `app/plans/`)

**P0: foundation, before any new screens**
1. **A permission model in data.**
   - Replace "sidebar pages" with a role × capability → level and scope table in `src/data/access.ts`.
   - Route every guard, action button, modal open, drawer action, search group and upload button through one `can(role, capability, tender?)` helper.
   - Keep the existing behaviour for today's 8 personas as the first test.
2. **Split Executive Sponsor from the Bid Committee, and fix gate authority.**
   - DG2 becomes a committee vote with the chair recording.
   - DG3 becomes a Tender Review Board vote. Compliance only convenes.
   - M2 needs Planning and Commercial sign-offs.
3. **Gate administration properly.**
   - Settings sections render by capability.
   - "Add tenant" moves to the platform only.
   - The Agent Console moves off `exec` and `dir`.

**P1: the new personas the demo needs**

4. **Head of Tendering (Tenant Super Admin, merged with IT admin per R1):**
   - a home built from the user's sketch (not before);
   - the Administration area: users and roles, committees and gates, sources, fit model, targets and SLAs, branding, audit log;
   - "View as" any role, read-only, with a clear banner;
   - the learning loop moved here;
   - business configuration.
5. **Planning Manager:** persona, "Programme Studio" dashboard (Stage 4), and M2 co-sign.
6. **Platform Super Admin:** a "Platform Console" with tenants, health, agents, spend, and a break-glass request flow that shows no tenant bid data.
7. ~~Tenant IT Administrator~~: merged into item 4 (R1). The Users and roles screen (assign a role, a scope and gate membership) is part of the Head of Tendering's Administration area.

**P2: data scoping and contributors**

8. Scope Bid Manager detail and actions to assigned tenders; give N. Gupta and P. Shah working ownership.
9. Margin and quote masking per section 9, shown as a visible "masked for your role" state (good demo moment).
10. Independent Reviewer: assign the reviewer, check segregation of duties, write the report, which DG3 requires.
11. Contributor views: SME task inbox, Authorised Signatory sign step, Finance-certified turnover feeding the PQ check.
12. Supplier Portal preview: one RFQ from the supplier's side.

---

## 11. Open questions for AGR and Catalyst

Answered on 2026-09-25 (see the decisions table at the top):
1. ~~Tenant admin split~~ → **merged** into the Head of Tendering (R1).
2. ~~Show the Platform Console to EPC prospects?~~ → **yes, briefly** (R4).
3. ~~Rename "Procurement / Estimation Lead"?~~ → **"Procurement Lead"** (R2).
4. ~~Named committee voting?~~ → **yes** (R3).
5. ~~Finance/Treasury and Sector Head as personas?~~ → **committee members and contributors** (R6).
6. ~~The DG1 delegate?~~ → **yes, recorded, owner notified** (R7).

Still open:
7. **The Supplier Portal login model** (a roadmap open question): accounts, or a secure link per RFQ? *The demo uses a secure link per RFQ, with an optional supplier account shown as "coming later". Confirm with Catalyst.*
8. **The title alternative.** "Head of Tendering" by default, and "Tendering Director" configurable. Should Catalyst's sales material use one title for all markets (e.g. "Head of Bids" for India later)?
