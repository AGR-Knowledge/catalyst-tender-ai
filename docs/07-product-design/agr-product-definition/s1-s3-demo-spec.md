# Stage 1–3 demo specification: GCC, EPC

AGR product definition, v1 draft, 2026-09-25. This is the functional and UX specification for the staged demo.
It covers Stage 1 (identification and screening), **DG1**, Stage 2 (subcontractor and internal inputs), Stage 3 (bid/no-bid) and **DG2**, for GCC EPC contractors.

Read with:
- [product-foundation.md](product-foundation.md): why, and the ten screen rules.
- [roles-and-access.md](roles-and-access.md): who sees what.
- [kpi-and-screen-catalogue.md](kpi-and-screen-catalogue.md): exactly what each role's screen shows, with KPI definitions.
- [gcc-demo-data.md](gcc-demo-data.md): tenants, tenders, suppliers, calendar.
- [ui-direction.md](ui-direction.md): how the two AGR designs combine.

**Decisions this spec rests on**, taken with the user on 2026-09-25:

| # | Decision |
| --- | --- |
| D1 | Region **GCC**, domain **EPC**. India comes later; the current Indian data is kept as a separate tenant, not deleted |
| D2 | Demo depth covers **Stages 1, 2 and 3, with DG1 and DG2**. Stages 4–9 are out of scope and hidden in demo mode |
| D3 | Tender documents are **English first**. Reading **Arabic** tenders is a bonus feature, and the demo shows it |
| D4 | The tenant super admin and the tenant IT admin **merge into one persona**. It gets a tendering-world title, not "Administrator": see §3 |
| D5 | "Procurement / Estimation Lead" becomes **Procurement Lead** |
| D6 | The Bid Committee (DG2) **votes as named members** in the gate screen. The same pattern is ready for the Tender Review Board (DG3) later |
| D7 | The **Catalyst Platform Console** is shown briefly, as proof of data isolation |
| D8 | **Five GCC sample tenants.** The same tender produces a different outcome in each |
| D9 | The UI **combines AGR's app design with the UI/UX team's Bid Workbench**. Content follows the role model, not the client wireframe's KPIs |
| D10 | The top persona's dashboard waits for the user's own sketch. §14 lists inputs only |

---

## 1. What the demo must prove

A prospect in a GCC contractor's tendering department should leave having *felt* these moments. Each one maps to a pain the client named in discovery.

| # | Moment | Pain it answers | Where |
| --- | --- | --- | --- |
| M-1 | "A tender published on Etimad this morning is already in the register, read, with every field linked to its page, and fit-scored for *our* company." | Tenders found late; analysts buried in extraction | S1 Radar and intake |
| M-2 | "It told us our **GOSI certificate expires three days before bid opening**, and that our Zakat certificate lapses on 30 April. Certificates must be valid *at opening*. It also showed both readings of 'last three financial years' and drafted the question to the employer." | PQ disqualification over document errors | S1 eligibility |
| M-3 | "It never threw anything away. The low-fit tender is flagged, and a person decides, with a reason we can learn from." | Weak decision memory; a black box | DG1 |
| M-4 | "RFQs went to screened, approved suppliers within a day of pursue. Nobody chased: the agent nudged and escalated, and we compared quotes *levelled* for VAT, currency, delivery terms, validity and exclusions." | Buyers chasing instead of evaluating; incomparable quotes | S2 |
| M-5 | "The committee pack shows win probability *with its uncertainty and its drivers*, competitors with sources, bond and facility exposure, and the capacity clash with another bid, on one page." | Bid/no-bid on anecdote | S3 |
| M-6 | "Each committee member recorded a position. The CEO decided, conditions were captured, and the audit trail shows exactly what everyone saw." | No record of decisions or rationale | DG2 |
| M-7 | "The same tender gives five different answers for five different companies, because it's *their* credentials, capacity and strategy, not a generic score." | "Will it fit *us*?" | Multi-tenant |
| M-8 | "It read an Arabic, scanned tender and gave us English fields with the Arabic source beside each one, and it warned us that the Arabic text prevails." | Arabic-only documents | Bonus |
| M-9 | "Catalyst runs the platform, but cannot see our prices. That's enforced and logged." | Trust, data sovereignty | Platform Console |

**Test for every screen:** does it serve one of M-1 to M-9? If not, it's not in this demo.

---

## 2. Scope

**In:**
- Stage 1: sources and radar, intake pipeline, extraction and validation, eligibility against the company credential vault, fit score, key dates with the GCC calendar, duplicates and addenda, same-day triage, and queries to the employer.
- DG1.
- Stage 2: bid team kick-off, scope packaging, supplier shortlisting, RFQ dispatch and tracking, quote levelling, best-fit mix, clarifications, internal inputs, and a Supplier Portal preview.
- Stage 3: win probability, competitors, eligibility and JV, resource and capacity, financial exposure, risk, margin range, the pack, the portfolio roll-up, and re-scoring.
- DG2 with committee voting.
- Tenancy: 5 GCC tenants with switching, per-tenant credentials, profiles, branding and currency.
- The role model: the top persona, the permission model, and admin inside the top persona.
- Arabic intake (bonus). The Platform Console (brief). Presenter controls.

> **Changed 2026-09-25** ([dashboards.md](dashboards.md) DB-9, DB-10): Stages 4–9 now have **stage dashboards** with real tenders, owners, dates and step status, and **DG3 gets a simple approval screen** for the Head of Tendering. Their working screens stay out, as below.

**Out (hidden in demo mode):**
- Stages 4–9 workspaces: scheduling, costing, drafting, compliance, submission and delivery screens; DG3, M2 and M3.
- Their existing dashboards (Commercial, Proposal, Compliance, Project Director) as *home screens*.
- They remain in the codebase for the Indian tenant and a future phase. See §2.1.

**Tenancy rule (added 2026-09-25):** "Full lifecycle (preview)" is offered **only on the Indian tenant** (`gen-in`), whose data the Stage 4–9 screens were built on. GCC tenants are always in `Stages 1–3` scope, so Indian data can never appear under a GCC brand (gcc-demo-data §3).

### 2.1 Demo scope mode
Add a setting, **Settings → Demo scope**, with two values: `Stages 1–3` (default) or `Full lifecycle (preview)`.

In `Stages 1–3` mode:
- The sidebar and search hide Stage 4–9 pages.
- Stage tracks show S4–S9 as a muted "later stages" segment, not clickable. They carry no "coming soon" labels; the track just ends at DG2 with a quiet "then planning, pricing, drafting…" caption.
- Commercial, Planning, Compliance / Legal and Project Director personas become **contributors**. Their home is **"My requests"**: the inputs they owe to Stage 2–3 packs (e.g. Commercial's preliminary margin range, Compliance's top contract risks, the PD designate's delivery feasibility, Finance's bond headroom). See the KPI catalogue §C.
- Tenders already past Stage 3 in the register still appear in the pipeline, because a real register has them. Their workspace shows the complete, inspectable S1–S3 history (with DG1 and DG2 records) and a one-line "Current stage" status. It never shows an empty or placeholder tab.

---

## 3. Personas in the demo

**The top persona's title is "Head of Tendering".** It merges the Tenant Super Admin and the Tenant IT Admin from roles-and-access. Rationale:
- In GCC construction and EPC contractors, the department is almost always the **Tendering** (or Estimation & Tendering) department, and its head is the *Head of Tendering*, *Tendering Manager* or *Tendering Director*.
- "Bid Director" is the APMP/international term, and "Proposals Director" is common in oil & gas EPC.
- The spec's "Bid Office" maps to this department.

Use "Head of Tendering" in the UI, with "Tendering Director" as a tenant-configurable alternative. The title is still to be confirmed with GCC job-market evidence (gcc-demo-data §10.3).

Personas active in the Stage 1–3 demo. Names are per tenant; see gcc-demo-data.md. The primary demo tenant is shown here.

| Persona | Kind | Home screen | Demo moments |
| --- | --- | --- | --- |
| **Head of Tendering** | Top persona: everything in the tenant, plus administration | *Awaiting the user's sketch* (§14) | M-1…M-7 from the top; "View as" any role |
| **Tender Coordinator** | Core | Intake desk | M-1, M-2 |
| **Bid Manager** | Core | Bid desk | M-2, M-3, M-5 |
| **Procurement Lead** | Core | Sourcing desk | M-4 |
| **Executive Sponsor** (CEO; chairs the Bid Committee) | Core, gate chair | Committee desk | M-5, M-6 |
| **Bid Committee members**: CFO, Technical Director, Operations Director, Sector Head | Group members | "My committee items": pack plus position | M-6 |
| **Commercial Manager**, **Planning Manager**, **Compliance / Legal Lead**, **Project Director (designate)**, **Finance / Treasury** | Contributors in this demo | My requests | Inputs to the S3 pack |
| **Supplier** | External, preview | Supplier Portal: one RFQ | M-4 |
| **Catalyst Platform Operations** | Platform | Platform Console | M-9 |

The persona switcher groups them as Tendering team · Bid Committee · Contributors · External · Platform. Each group has a one-line "what this person does" hint, so a presenter can pick fast.

---

## 4. Information architecture

A role home for "what needs me", stage work areas for "doing the work", and **one Tender Workspace per tender** for "everything about this bid".
- The current app has role homes but no tender page: tenders open in a drawer.
- The Bid Workbench has stage areas but no roles.
- The combination gives each role its own lens on the same record. That is product-foundation rule 4, made visible.

```
Top bar:  tenant switch (with brand mark) · global search ⌘K · notifications · upload · persona (demo control)
Sidebar (filtered by permission):
  My desk                        ← role home (KPIs + queues), §C of the KPI catalogue
  Pipeline  · Calendar           ← register (board / list), key-dates calendar with GCC holidays
  1 · Discover & qualify
      Tender radar               ← sources, today's captures, reconciliation
      Intake queue               ← validation of low-confidence fields
      Screening                  ← eligibility + fit for tenders awaiting DG1
      DG1 decisions
  2 · Source
      Packages & RFQs            ← per-tender packaging, dispatch, tracking
      Quote levelling            ← normalised comparison, best-fit
      Suppliers                  ← supplier master, screening, AVL, ICV
  3 · Decide
      Bid / No-Bid packs         ← pack assembly, inputs, portfolio roll-up
      DG2 committee
  Company                        ← credentials vault, capability profile (view for most roles)
  Administration (Head of Tendering only)
      Users & roles · Committees & gates · Sources & integrations · Fit model & rules · Branding · Audit log
  Settings                       ← theme, demo scope, reset (demo)
Tender Workspace  /tenders/:id   ← tabs below
Platform Console  /platform      ← separate shell, Catalyst only
```

### 4.1 The Tender Workspace (`/tenders/:id`)

**Header, always visible:**
- tender ID;
- title;
- authority, with country flag and city;
- value in tenant currency, with the original currency beside it when different;
- procurement type (Open / Limited / PQ / Two-envelope);
- a **stage track** S1 · DG1 · S2 · S3 · DG2 (later stages muted);
- a due countdown in the authority's local time zone;
- the owner (Bid Manager);
- badges: document language (EN / AR / EN+AR), sensitivity (Standard / Restricted lane), "Addendum 2 applied".

**Tabs** (visibility follows the permission model; masked content shows a clear "masked for your role" state, never a blank):

| Tab | Content | Stage |
| --- | --- | --- |
| Overview | The agent's summary, the recommendation card, next actions for *my* role, key dates, open blockers, the latest activity | all |
| Documents | The document pack (ITT, BOQ, drawings list, addenda, clarifications, pre-bid minutes), each with type, language, pages, OCR flag, version and received-via; addenda diff | S1 |
| Requirements | Extracted fields by group (§6.4), each with value, confidence, page link, source snippet (bilingual for Arabic), and validation state | S1 |
| Eligibility & fit | The PQ checklist against the company credential vault (§6.5), the fit-score breakdown (§6.6), what would change the result | S1 |
| Key dates | Typed dates on a mini calendar with the GCC holiday and weekend overlay; reminders; conflicts | S1+ |
| Queries | Clarification questions to the employer (agent-drafted from ambiguities; approve and send before the deadline) and the employer's responses | S1–S3 |
| Sourcing | Packages, shortlist, RFQs, responses, levelled quotes, best-fit mix, supplier clarifications | S2 |
| Inputs | Internal inputs requested from contributors (SMEs, Commercial, Planning, Legal, PD, Finance): status and SLA | S2–S3 |
| Bid / No-Bid | The full DG2 pack (§9) | S3 |
| Decisions & audit | DG1 and DG2 records (who, when, what they saw, why), overrides, persona switches, and the agent actions timeline | all |

The existing tender **drawer stays** as a quick peek from lists, with an "Open workspace" button.

---

## 5. Cross-cutting behaviours

1. **The recommendation card.** Every agent recommendation renders the same way:
   - the recommendation, in plain words;
   - the confidence, as a band or a level;
   - the top three reasons;
   - what would change it;
   - the source links;
   - the agent's name;
   - "Recommendation, not a decision."
2. **Override with a reason.** Any human choice that differs from the recommendation opens a short reason field. Where a structured list exists, it offers reason codes. It records "Overridden by {name} at {time}" beside the recommendation. Both stay visible forever.
3. **Provenance everywhere.** Every extracted or derived number has a source chip: `p. 14`, `Quote Q-0412`, `Credential: GOSI cert`, `Calc: bid capacity`. Clicking it opens the PDF viewer at the page with the value highlighted, or the source record.
4. **SLA clocks.** Gates and queues show time remaining against their SLA:
   - DG1 ≤ 24h from M1;
   - DG2 ≤ 24h from pack issue;
   - intake ≤ 15 min;
   - RFQs ≤ 24h from DG1.

   A breach escalates to the Head of Tendering, and the escalation appears in the audit trail.
5. **Nudge and notify.** Cross-role actions become a "Request / Nudge {person}" with a due date. They appear in that person's "My requests". This replaces today's toast-only nudges.
6. **Money.** All values are formatted per tenant currency, e.g. `SAR 482.6 M`, `AED 1.24 bn`, `KWD 18.3 M`. The original currency is kept when a tender or quote uses another one, and conversions show their rate and date.
7. **Time.** Dates show in the authority's local time zone, with the GCC work week (see gcc-demo-data §Calendar). Demo "today" remains **Sun 08 Mar 2026**. That falls in Ramadan 1447, which the calendar must reflect: reduced government hours, and Eid al-Fitr closures shortly after.
8. **Audit.** Every decision, override, validation, send, vote and persona switch writes an audit entry with actor, time, action, before and after, and a snapshot reference.

---

## 6. Stage 1: Tender Identification & Screening

**Owner:** Tender Coordinator (responsible), Bid Manager (accountable, DG1). **Agent:** Intake & Extraction.
**Exit:** DG1 recorded with a rationale; M1 "Logged & Qualified".

### 6.1 Tender radar (sources)
What a Tender Coordinator wants first thing in the morning: *did anything come in, is anything broken, and did we miss anything?*

- **Connectors panel.** One row per source:
  - Source types: government e-procurement portals and client vendor portals for the tenant's countries (the list is in gcc-demo-data §Portals, e.g. Etimad, Monaqasat, CAPT, Tender Board portals, ADNOC / Aramco supplier portals); monitored mailboxes; the scanned-document drop; manual upload.
  - Columns: status (Healthy / Degraded / Credentials expiring / Assisted mode), mode (API, scheduled scrape, assisted: login- or CAPTCHA-gated, operator completes access), last poll, new today, and whether a login is needed.
  - The platform never solves CAPTCHAs. Assisted mode says so.
- **Today's captures feed:**
  - Columns: time · source · reference · title · authority · country · estimated value (tenant currency) · due date · language · document type (Tender / PQ / Addendum / Clarification / Award notice) · fit · disposition.
  - Dispositions: Auto-shortlisted → DG1 queue · Low fit, flagged · Duplicate, merged into T-… · Addendum, linked to T-… · Restricted lane · Needs validation.
  - Filters: country, sector, value band, fit, language, source.
- **Reconciliation card.** "Last reconciliation 06:00. 0 missed across 9 sources." Tenders are compared against each portal's daily listing.
- **Restricted lane.** A count only. Titles are hidden from everyone not cleared; see roles §9.
- **Market signal strip.** Optional, and marked as external intelligence: upcoming tenders announced but not yet issued. This reflects how GCC contractors track pipeline ahead of publication.

### 6.2 Intake pipeline, per document
A visible, timed step list. This is the existing `domain/intake.ts` pattern, extended with GCC steps:
1. Received (source, time)
2. Classified (document type and confidence)
3. **Sensitivity checked** (Standard / Restricted; 100% recall bias: when unsure, it goes to the restricted lane)
4. **Language detected** (EN / AR / bilingual). For Arabic: "reading in Arabic; English fields will show the Arabic source".
5. OCR (only when scanned; shows the page count and the OCR quality score)
6. Fields extracted (count; how many below the confidence threshold)
7. Register check (duplicate / addendum / new)
8. Screened (eligibility and fit for **this tenant**)
9. Logged (TID assigned). **Intake-to-logged time** is shown against the 15-minute target.

Unknown documents stop after the page read and go to the Coordinator queue, as today. A re-upload is flagged as a duplicate, as today.

### 6.3 Intake queue (validation)
- **Only fields the agent would not accept alone** appear here, grouped by tender and ordered by what blocks DG1 first.
- Each item shows:
  - the field and the extracted value;
  - the confidence and why it's low: OCR quality, two conflicting values, value on a table spanning pages, Arabic-only clause, handwriting;
  - the source snippet with page;
  - the actions **Accept**, **Correct** (inline edit, with the original kept), **Mark not stated**, or **Send back to agent** (re-read with a hint). Send-back must **not** close the item; the current bug does.
- A **"conflict" pattern**: two dates or two amounts found. The agent shows both with pages and refuses to choose. The Coordinator picks one and may raise a query to the employer (§6.10).
- Queue KPIs sit in the header: open fields, oldest age, auto-accept rate (see the KPI catalogue).

### 6.4 Requirements (extracted fields)
Field groups, extending today's `ExtractedTender` shape for GCC:
- **Identity:** reference, title, authority, parent ministry or entity, country, city or region, procurement type, envelope system, portal, funding source.
- **Commercial:** estimated value (if published) or tender value band, currency, document purchase fee, contract form (e.g. FIDIC Yellow 2017 with particular conditions, or a government standard contract), pricing basis (lump sum / re-measured / unit rates), payment terms, advance payment, retention, price adjustment, VAT treatment.
- **Guarantees:** bid bond amount or % and validity; performance bond % and validity; advance payment guarantee; retention release; the acceptable bank or format (often a local bank or a specified template).
- **Time:** issue date, document purchase deadline, site visit, pre-bid meeting, clarification deadline, submission (online and physical, with time zone), bid opening, bid validity, contract duration, maintenance or O&M period.
- **Eligibility / PQ:** classification (field and grade), commercial registration activities, chamber membership, tax/Zakat certificates, social-insurance certificate, nationalisation (e.g. Saudization) status, local content or ICV requirement, similar-experience thresholds (number, value, capacity, period), financial thresholds (turnover over N years, net worth, liquidity, credit lines), key personnel, HSE record, ISO certifications, client vendor registration or approved-vendor status, JV/consortium rules, local agent or partner rules.
- **Evaluation:** method (lowest compliant price / quality and cost based), technical–commercial weighting, technical pass mark, local content or preference weighting, mandatory versus scored.
- **Submission:** format and number of copies, language (Arabic/English; **which prevails**), envelope separation, portal upload rules and file limits, sealed physical originals, signatures (authorised signatory, company stamp), required forms.
- **Risk clauses:** liquidated damages and cap, limitation of liability, termination for convenience, design responsibility, ground risk, permits, force majeure, dispute resolution and seat, governing law, insurance.
- **Flags:** the agent's points to raise at screening, with severity and page.

Each field carries a value, confidence, page, a note, and for Arabic documents `source` (the Arabic snippet). The UI shows English first, with the Arabic beside it, and a toggle to "Show Arabic source".

### 6.5 Eligibility: the PQ check against the company credential vault
**This is the single most important demo screen for the GCC buyer.** It turns their biggest avoidable loss (disqualification on document errors) into a list of green, amber and red lines, each one explained.

**The credential vault** (Company → Credentials) holds, per tenant, each document the company uses to qualify. Every entry carries its issuer, number, scope or grade, validity dates, file, and owner:
- commercial registration(s) and activities;
- chamber membership;
- classification certificate(s), with field and grade;
- tax/VAT registration;
- Zakat or tax clearance certificate;
- social insurance (e.g. GOSI) certificate;
- nationalisation certificate (e.g. Nitaqat band);
- ICV / local content certificate and score;
- ISO 9001 / 14001 / 45001;
- audited financial statements per financial year (with the audit date);
- bank reference letters;
- approved-vendor registrations with major clients;
- the similar-projects register (value, capacity, dates, client, completion certificate);
- key personnel CVs (with availability);
- JV agreements (active or frameworks).

**The check.** Each extracted PQ requirement is matched to credentials, and one line is rendered per requirement:

| Result | Meaning | Example |
| --- | --- | --- |
| ✅ Pass | Requirement met, with evidence linked | "Classification Grade 1, Water & sewage works: certificate valid to 14 Nov 2027" |
| ⚠️ At risk | Met today, but fails by bid opening (certificates must be valid *at opening*), or the evidence is weak | "GOSI certificate expires **Thu 7 May 2026**, 3 days before bid opening (Sun 10 May). Renew before submission." |
| ⚠️ Interpretation | The requirement is ambiguous, so the agent shows both readings | "'Average turnover of the last three financial years'. FY2025 accounts are due to be audited on 15 Apr, before opening. **FY2022–FY2024** gives an average of SAR 1.41 bn; **FY2023–FY2025** gives SAR 1.52 bn. Both pass the SAR 1.2 bn threshold. Suggested query to the employer drafted." |
| ❌ Fail | Not met (tenant C example) | "Two completed STPs ≥ 100,000 m³/day in 10 years: 1 on record (110,000 m³/day, 2020). JV partner needed." |
| — Not stated | The tender doesn't ask | |

**Roll-up:** tenant A reads "13 met · 2 at risk · 1 interpretation · 0 fail → eligible; renew two certificates before 10 May". Tenant C reads "fails 4 lines alone → eligible **only with a JV partner**". A **JV scenario** toggle re-runs the check with a named partner's credentials from the tenant's partner list, applying the tender's JV rules (lead-member shares, joint and several liability) when stated.

**Actions:** "Request renewal" (a task to the credential owner, e.g. HR for GOSI) · "Draft query to employer" · "Add evidence".

**Tender-user realism:**
- The check uses the **bid opening date**, not today. Saudi rules require certificates to be valid at opening, for the bidder and every listed subcontractor. A missing or expired certificate gets at most 10 working days to cure, after which the bid is excluded and the initial guarantee forfeited.
- Where a tender asks certificates to stay valid through bid validity, expiry is checked against that instead.
- Sources: gcc-demo-data §4.5 and §10.1.

### 6.6 Fit score
- A weighted score of 0–100 against the **tenant's own profile and weights**. The Head of Tendering sets them in Administration → Fit model & rules.
- Default criteria (extending today's `CRITERIA`), each with its reason and source:
  - scope and sector fit;
  - size against the preferred band and the single-contract limit;
  - eligibility result (from §6.5);
  - geography and presence;
  - client relationship and payment record;
  - contract terms and risk;
  - team and delivery capacity;
  - bond and facility headroom;
  - strategic priority.
- **Thresholds, per tenant:** Pursue ≥ X; Pursue with conditions between Y and X; Recommend discard < Y.
- The **eligibility fail rule:** a hard PQ fail caps the verdict at "Pursue with conditions (JV needed)" or "Recommend discard", whatever the weighted score.
- The display shows the **score, verdict, confidence** (lower when key fields are unvalidated), **strengths**, **concerns**, **what would sharpen it**, and **comparable past bids** from the tenant's history (outcome and reason).

### 6.7 Key dates and the GCC calendar
- Typed dates: document purchase, site visit, pre-bid meeting, clarification deadline, submission (online), physical originals, bid opening, bid validity end, bond validity end.
- Each shows local time, days remaining, and the **working days remaining** (per country weekend and public holidays).
- **Calendar-aware flags:**
  - "Site visit Tue 17 Mar falls during Ramadan reduced hours: authority office hours are shorter; confirm the slot";
  - "Answers to questions are due Wed 25 Mar, inside the expected Eid al-Fitr closure (dates depend on moon sighting): **expect a delay**";
  - "Initial guarantee must be valid at least 90 days from opening (to 8 Aug 2026): bank lead time 5 working days".
- Reminders follow the Workbench rule: 3 days before and 1 day before, to the owner and the Bid Manager, escalating to the Head of Tendering 24 hours before an unmet deadline.

### 6.8 Duplicates and addenda
- **The same tender from two sources** (e.g. the portal plus an email from the consultant) resolves to one TID. Both sources are listed in Documents.
- **An addendum or bulletin arrives:**
  - it links to the parent;
  - it shows a **diff**: dates changed, BOQ lines changed, clauses changed;
  - it re-runs eligibility and fit;
  - it re-flags affected Stage 2 packages ("Addendum 2 changes pipe material in Package P-04: re-quote 3 suppliers") and marks any S3 pack as **stale**.
- Re-tenders (same scope, new reference) are asked about, not auto-merged. This is an open question from the roadmap, answered here as "ask".

### 6.9 Same-day triage and capacity
When several tenders land together, the Screening view shows a **triage table**: fit, value, bid-team effort estimate, bond required, and the **cumulative** bid-team load and bond facility use if all are pursued. The agent flags combinations that exceed capacity or facility headroom. It does not rank people's priorities for them: "Pursuing all three would use 112% of the Water team's bid capacity in March."

### 6.10 Queries to the employer
The agent turns ambiguities found in extraction and eligibility into **draft clarification questions**. Examples: which financial years count; whether a JV lead may use a partner's O&M experience; which time zone the deadline uses.
- Each draft cites its clause and page. The Coordinator or Bid Manager edits, approves and "sends" (demo: marked sent via the portal).
- A countdown to the clarification deadline shows alongside.
- Responses arrive as clarification documents (§6.8) and update fields.

---

## 7. DG1: Pursue or Discard

**Decider:** the assigned Bid Manager, or a recorded delegate (the Head of Tendering). **SLA:** ≤ 24h from M1. **Options:** Pursue / Discard / Hold.

**The evidence pack**, a single screen from the Screening list or the Workspace:
1. The recommendation card (§5.1) with the verdict and confidence.
2. The tender at a glance: authority, value, type, key dates, working days to submission against the **typical preparation time** for this tender type (from history).
3. Eligibility roll-up with the ❌ and ⚠️ lines expanded.
4. Fit breakdown (collapsed by default).
5. Capacity: the bid team's load in the submission window; the capacity clash with other pursuits.
6. Bond: required amount and validity, against **bank guarantee facility headroom**. Finance/Treasury's figure carries a timestamp: "facility headroom SAR 96 M as of 05 Mar, confirmed by Finance".
7. Comparable past bids and their outcomes.
8. Open validations and queries. **DG1 cannot be recorded while a field marked "blocks DG1" is unvalidated.** The screen shows "2 fields still being validated by {coordinator}", with a Nudge button.

**Decision form:**
- **Pursue.**
  - Assign the bid team: Procurement Lead, Planning, Commercial, Compliance/Legal, PD designate (pre-filled from the tenant's sector defaults).
  - Confirm the submission strategy: prime or JV; the named partner if JV.
  - Set the internal bid calendar milestones.
  - The optional note is required when overriding a "Discard" recommendation.
  - Effects: the stage moves to S2, notifications go to the assigned team, and the **RFQ clock starts (≤ 24h)**.
- **Discard.**
  - Reason codes are required, one or more: Out of sector/scope · Below value threshold · Above single-contract/bond limit · PQ fail (classification / turnover / experience / other) · Insufficient time · No capacity · Unacceptable terms · Client/payment risk · Geography · Strategic · Other.
  - A note is optional.
  - Effects: the tender is closed with its reason, the learning loop is fed, and it stays searchable. **Re-open** is allowed, with a reason. The discovery responses say decisions are reversed in a meaningful share of cases.
- **Hold.** Request information from a person (e.g. "Finance: confirm facility headroom", "Coordinator: confirm turnover years") with a due date. The SLA clock keeps running; the screen shows that.

**Record written:** decision, decider (and delegate if any), time, the recommendation at that moment, the snapshot of fields, eligibility and fit shown, the reason codes and note, and the team assigned.

---

## 8. Stage 2: Subcontractor & Internal Input Orchestration

**Owner:** Procurement Lead (accountable). Bid Manager consulted. **Agent:** Outreach & Evaluation.
**Exit:** every package covered (≥ 3 compliant quotes, or an explicitly accepted gap), zero stale clarifications, internal inputs received.

### 8.1 Kick-off
The Pursue decision creates a **bid workspace checklist**:
- scope packaging to approve;
- shortlists to approve;
- RFQs to send (clock);
- internal inputs to request (method statement outline, HSE plan outline, key CVs, preliminary programme, preliminary estimate, design basis for design-build).

Each item has an owner and a due date.

### 8.2 Scope packaging
- The agent proposes **procurement packages** from the BOQ and scope. Each package is by discipline, for example:
  - for a sewage treatment plant: civil and structural works, process mechanical equipment, electrical and instrumentation, piping, membranes or filtration, odour control, SCADA, dewatering and shoring, piling, roads and landscaping;
  - for a substation: civil, GIS switchgear, power transformers, cabling, protection and control.
- Each package shows:
  - the BOQ lines it covers (count and value share);
  - make or buy (self-perform or subcontract, from the tenant's capability profile);
  - an estimated value from benchmark rates;
  - a **long-lead flag** with typical lead time;
  - the client's **approved-vendor list requirement**, when the tender names one;
  - the local-content relevance.
- The Procurement Lead approves, splits or merges packages. The Bid Manager is consulted and can comment.

### 8.3 Supplier shortlist per package
- **Source:** the tenant's Supplier Master. Filters and signals per supplier:
  - trades and service catalogue match;
  - **client approved-vendor status** (e.g. on the employer's AVL);
  - **ICV / local content certificate and score**;
  - prequalification status;
  - **sanctions and anti-bribery screening**: current or expired, with the date;
  - past performance (on-time %, NCRs, quote-to-award history);
  - current load or capacity;
  - location;
  - response history (response rate and speed).
- **The agent's recommended shortlist** (typically 4–6 per package) carries a reason per supplier, e.g. "Approved by the client; ICV 42; 92% on time; 3 quotes in 12 months, 1 awarded".
- The buyer approves or overrides, with a reason, as always.
- **Rule:** nothing is sent to a supplier whose screening is not current (a guardrail, from the Workbench). The UI shows why a supplier is greyed out.

### 8.4 RFQ pack and dispatch
- The auto-drafted RFQ per package contains:
  - scope extract;
  - **only the BOQ lines matched to that package** (suppliers never see the whole bill; from the Workbench);
  - drawings list;
  - technical requirements;
  - the commercial terms asked: currency, **price basis excluding VAT with VAT stated separately**, Incoterms (delivered to site versus ex-works), validity (≥ bid validity plus a margin), payment terms, lead time, deviations and exclusions schedule;
  - **quote at line or package level** (the supplier decides, or it is fixed);
  - reply-by date;
  - clarification channel.
- **Reminders:** 3 days before the reply date, then daily. **Escalation** to the Procurement Lead once the SLA is breached. The copy is visible in the RFQ.
- **"RFQs issued within 24h of DG1"** runs as a live clock on the Sourcing desk.

### 8.5 Tracking and nudges
- **A package board:** Issued → Acknowledged → Quoted → Levelled → Buyer approved.
- **A per-supplier matrix:** sent · opened · acknowledged · declined (with reason) · quoted · clarification open.
- Agent nudges are counted and the buyer time saved is estimated.
- Non-responders past the SLA are escalated with suggested **reserve suppliers** from the shortlist.

### 8.6 Quote levelling (normalisation)
"Levelling" is the term procurement teams use. Parsed quotes (PDF, Excel, email) go into a common schema, and **every adjustment is shown and sourced**:

| Adjustment | Example |
| --- | --- |
| Currency | EUR quote converted to SAR at the tenant's bid rate (rate, date) |
| VAT | Quote inclusive of 15% VAT → shown excluding VAT; zero-rated or outside scope noted per country |
| Delivery terms | Ex-works Germany → freight and duty estimate added to reach delivered-to-site |
| Validity | 60 days against the 120 required → flagged "validity short: request extension" |
| Exclusions | "Excludes installation supervision" → a priced allowance added from benchmark, marked estimated |
| Deviations | Technical deviations listed; a "non-compliant" flag stops it counting towards coverage |
| Payment terms | 30% advance requested → a cashflow note |
| Lead time | 34 weeks against the programme need of 28 → a schedule-risk flag |

Views: original quote against levelled quote, side by side, with a trace of each change. **Coverage:** packages with ≥ 3 *compliant* levelled quotes.

### 8.7 Best-fit mix
- **The per-package score** uses tenant-configurable weights: price (levelled), technical compliance, delivery record, QHSE record, capacity, lead-time fit, ICV contribution. Screening is a pass/fail gate.
- **Options across packages:** Lowest cost · **Balanced (recommended)** · Lowest risk. Each shows total levelled cost, ICV share, risk notes and schedule fit.
- **Buyer decision:** approve a mix, or override with a reason ("override recorded: rank 2 selected on delivery record"). The agent **never** issues a commitment or PO; the UI says so.

### 8.8 Clarifications
- **The supplier clarification log:** question, package, raised by, owner, due date, answer, status. **"0 stale beyond SLA"** is the exit rule.
- **Commercial questions from suppliers** go to a human buyer.

### 8.9 Internal inputs
The Inputs tab tracks what the S3 pack needs from inside the company. Each has an owner, a due date and a status, and each appears in that person's **My requests**:
- **Commercial:** preliminary cost and **margin range**.
- **Planning:** preliminary programme, long-lead fit, **delivery resource impact**.
- **Compliance / Legal:** **top contract risks** and a redline stance.
- **PD designate:** delivery feasibility and key staff.
- **Finance / Treasury:** **bond facility headroom**, and a working-capital view (retention, payment terms, advance).
- **HR:** key-personnel availability.

### 8.10 Supplier Portal preview (external persona)
- What a supplier sees from an RFQ link or account: the company that invited them (tenant branding), the package scope, **only their BOQ lines**, reply-by, and the documents.
- They submit a quote (at line or package level, per the RFQ), upload their quote PDF, declare deviations and exclusions, and ask a clarification.
- **They never see** other suppliers, other quotes, or the tender's value. A brief view, reached from the RFQ screen: "Open as supplier (preview)".

---

## 9. Stage 3: Bid / No-Bid Decisioning

**Owner:** Bid Committee / Executive Sponsor (accountable). Bid Manager (responsible; presents). **Agent:** Win-Probability & Recommendation.
**Exit:** a signed DG2 decision.

The **Bid / No-Bid pack** is one scrollable page with a sticky summary. Each section shows its source and freshness.

| § | Section | Content |
| --- | --- | --- |
| 9.1 | **Win probability** | A score with an **uncertainty band** (e.g. 58% ± 8). A **driver table** gives each feature's contribution: client history, value band, geography and presence, competitor count, capacity load, planned price position, local content score, JV. It notes the calibration method. A **low-data warning** appears when comparables number fewer than 5. **What would move it:** e.g. "+6 pts with local content ≥ 40%", "−5 pts if a 7th bidder qualifies" |
| 9.2 | **Competitors** | Likely bidders, **fictional names** in the demo. Each shows the evidence source (e.g. the employer's prequalified list, past award notices, market-intelligence feed), strengths, recent comparable wins, and pricing posture. **Every claim is cited; no source means no claim** (a spec guardrail) |
| 9.3 | **Eligibility and JV** | The S1 PQ roll-up, refreshed with any renewed credentials. JV structure and shares if applicable |
| 9.4 | **Resource and capacity** | Bid effort to date and to go (people-weeks, external cost). Delivery impact if won: key staff, plant, peak manpower. The **portfolio conflict roll-up**: tenders at DG2 this cycle, their win probability, and capacity if won; combined against the **safe-delivery threshold** (the tenant sets it, e.g. 70%) |
| 9.5 | **Financial exposure** | Bid bond (amount, validity, bank charges). If won: performance bond, advance payment guarantee, retention held. **Bank guarantee facility**: limit, used, committed by live bids, headroom after this bid. Working capital: payment terms and cash profile. Source: Finance input, time-stamped |
| 9.6 | **Risk profile** | The top five risks across contractual, technical, commercial, counterparty and geopolitical, each with a provisional mitigation and its source (the Legal input, extraction flags, history) |
| 9.7 | **Expected margin range** | From Commercial's preliminary estimate (a range, not a price): "8.5–11.5% on benchmark rates and levelled quotes for 7 of 9 packages". It is masked for roles without margin access |
| 9.8 | **Recommendation** | The agent's recommendation (Bid / No-Bid, with conditions) and its rationale, **win themes**, the resource ask, and the top three risks. The Bid Manager can edit the *narrative* ("presenter's note"); the numbers are locked |
| 9.9 | **Inputs status** | Which contributor inputs are in, late, or missing, with Nudge |
| 9.10 | **Freshness** | "Pack generated 07 Mar 14:10. **Stale:** Addendum 2 received 08 Mar 09:12 changes 2 packages." A **Re-run** regenerates it and keeps the previous version for comparison |

**Pack issue:** the Bid Manager clicks **Issue pack to committee**. This starts the 24h DG2 clock and notifies members.

---

## 10. DG2: Bid / No-Bid by committee vote

> **Changed 2026-09-25** (roles-and-access R8, [dashboards.md](dashboards.md) §9): members still record named positions, but **the Head of Tendering gives the final approval**. The CEO is an ordinary member, and quorum is 3 of 5 positions. Read "chair" below as "Head of Tendering (approver)" for the decision, and count the CEO as a voting member.

**Body:** the Bid Committee, configured per tenant in Administration → Committees & gates. Default members, with names per tenant:

| Seat | Role | Votes? |
| --- | --- | --- |
| Chair | Executive Sponsor (CEO/MD) | Yes; records the decision |
| Member | CFO | Yes |
| Member | Technical Director | Yes |
| Member | Operations Director | Yes |
| Member | Sector Head for the tender's sector | Yes |
| Presenter | Bid Manager | No; presents and answers |
| Secretary | Head of Tendering | No; can record positions on members' behalf in a live meeting, marked "recorded by secretary" |

**Rules** (tenant-configurable; demo defaults):
- **Quorum:** the chair plus 2 members.
- **Positions:** Support · Support with conditions · Oppose · Abstain. A comment is required for anything other than Support. **Conditions** are free text, and each becomes a tracked item.
- Members can record positions **before the meeting**, asynchronously; the demo seeds 2 of 5 as already submitted.
- **Conflict of interest:** a member can declare one and abstain; the declaration is recorded.
- **Chair decision:** Bid / No-Bid. If it goes against the majority of positions, a **reason is required**, and the record shows "Chair decision differs from majority".
- **SLA** ≤ 24h from pack issue, with a visible countdown. A breach escalates to the Head of Tendering and the chair.

**Screen:**
- The pack summary on the left.
- The **members panel** on the right: avatar, name, seat, position chip, comment and time. "Record my position" appears for the signed-in member only.
- A decision bar for the chair. It is disabled until quorum, with the reason shown.

**Outcomes:**
- **Bid:**
  - conditions are copied to the bid workspace as tracked items (e.g. "Bid only with a JV partner holding STP O&M experience", "Keep the bid bond within SAR 12 M", "Minimum margin 9%");
  - the tender moves to "Stages 4–5: baselines" (the muted track segment);
  - the Planning and Commercial leads are notified;
  - the demo shows a completion card: "Decision recorded. Planning and Commercial have been asked to start baselines."
- **No-Bid:**
  - reason codes (as DG1, plus Price-competitiveness, Win probability too low, Capacity conflict);
  - a **courteous decline letter to the employer** is drafted, where the contractor was invited or is registered, and the Bid Manager reviews and sends it;
  - lessons are captured;
  - the learning loop is fed.
- **Re-open** a decision, with a reason and the chair's approval. This happens when a competitor withdraws, the employer signals interest, or a partner offers a JV (reversal triggers from discovery).

**Record written:**
- each member's position, comment and time;
- conflicts declared;
- the chair's decision and reason;
- the pack version and snapshot;
- the conditions.

---

## 11. Five tenants, one tender, five answers

**Purpose:** prove the engine is *the tenant's*, not generic (M-7).

- **Data:** five fictional GCC EPC contractors (gcc-demo-data §Tenants). Each has its own profile, weights, credentials (with deliberate expiries), partner list, capacity, bond facility, branding, currency, portals, users and register.
- **The hero tender** is shared across all five: the synthetic GCC ITT in gcc-demo-data §Hero tender. Uploading it, or having it captured from the portal, in each tenant produces a different eligibility result, fit, verdict and DG1 path, designed to show a different engine behaviour per tenant:

| Tenant | Expected result | Engine behaviour shown |
| --- | --- | --- |
| A: KSA water and infrastructure EPC (primary demo tenant) | Pass; one ⚠️ credential at risk; **Pursue** | Credential expiry against the submission date; turnover-year interpretation |
| B: UAE building and MEP contractor | ❌ similar experience, ❌ classification field → **Recommend discard** | The hard PQ-fail cap overrides a decent weighted score |
| C: Qatar civil and utilities, mid-size | ❌ one experience line, but a JV partner in its list covers it → **Pursue with conditions (JV)** | The JV scenario re-check |
| D: Oman roads contractor | ❌ turnover, out of priority geography → **Recommend discard** | Size and geography criteria; it never auto-discards |
| E: Kuwait multi-country EPC group | Eligible, high fit, but bond facility headroom and bid-team load exceeded → **Hold / Pursue with conditions** | Capacity and facility logic; same-day triage |

- **Presenter lens.** A presenter-only **"Compare tenants"** view, opened from the demo menu, shows the five results side by side. It is **labelled as a demo view**: in the product no one can see across tenants, and the view says so in its header. Real users only ever see their own tenant.

---

## 12. Arabic tenders (bonus)

- **Intake:** the language is detected. Arabic documents show an "AR" badge. Scanned ones also show "OCR".
- **Fields:** the English value, with the **Arabic source** beside it (`source`), plus the page. Confidence is lower on OCR'd tables and handwriting, and the reason is shown.
- **Clauses:** each clause has an English summary and the Arabic original. The **"Arabic text prevails"** clause is detected and raised as a flag on every bilingual tender.
- **"Read in English":** an English reading summary of the whole document. It is clearly labelled a machine translation for understanding, not for submission.
- **Demo documents:**
  - a **scanned Arabic road-works tender**: OCR, then Arabic fields in English, then a fit relevant to a roads tenant (D);
  - an **Arabic IT tender**: readable Arabic, then an "out of sector" low fit. It shows M-3 in Arabic.

  See gcc-demo-data §Documents.
- **UI stays English, LTR.** An Arabic (RTL) interface is *not* in scope.

---

## 13. Catalyst Platform Console (brief)

- **A separate shell** at `/platform`, visually distinct, with Catalyst branding and an "Operator" label.
- **Contents:**
  - tenants (live and onboarding, region and residency, tier: pooled or silo);
  - per-tenant health: connectors, intake latency p90, reconciliation, eval pass rate, guardrail activations, model spend against ceiling;
  - releases and canary;
  - **break-glass requests.**
- **What it proves:** open any tenant, and the console shows **no tender content**: counts and health only. "Request break-glass access" opens a form: reason, scope (one tenant), duration (≤ 4h), second approver. The request appears in that tenant's Head of Tendering audit log as "Catalyst requested access". That is M-9 in one click.

---

## 14. Head of Tendering home: awaiting the user's sketch

> **Resolved 2026-09-25.** The user's brief replaced the sketch; the home is specified in [dashboards.md](dashboards.md) §10.1. The text below is kept for history.

The user will provide their own design for this dashboard. **Do not build it before then.** Candidate inputs to compare with the sketch are in the KPI catalogue §B. They include:
- the pipeline funnel and value;
- decisions waiting across the gates, with SLA;
- the credential expiry radar;
- bid-team capacity by sector;
- the bond facility;
- hit rate and bid economics;
- intake health;
- the learning loop;
- administration shortcuts.

---

## 15. GCC facts used in this spec

Facts such as portal names, classification systems, guarantee norms, VAT, the work week, the 2026 calendar and titles come from the GCC research in [gcc-demo-data.md](gcc-demo-data.md) §Sources. Where a value varies by tender, it comes from the tender's own document, never from a default.

---

## 16. Presenter controls (demo only, always labelled "Demo")

- **Persona switch** (grouped, §3) and **tenant switch** (brand changes with it).
- **Scenario presets:**
  - "Start: morning intake" (S1, fresh captures);
  - "Start: DG1 due";
  - "Start: RFQs out";
  - "Start: DG2 committee".

  Each is a known seed state, and each is reachable in one click.
- **Reset demo** (all tenants, or current tenant only).
- **Simulate time:** "Advance agent work" completes pending agent steps (extraction, supplier replies) instantly. It is labelled as simulation.
- **"Treat as newly published":** for real sample PDFs with past dates, the key dates shift relative to demo today so they can reach DG1. This is labelled, and the original dates stay visible in the Documents tab.
- **Compare tenants** lens (§11).
- **Prospect branding:** a logo and accent colour for the current tenant, set in Administration → Branding. Used to tailor a meeting.

---

## 17. Demo scripts

Each script is 8–12 minutes, and they can be combined.

| Script | Tenant | Path | Moments |
| --- | --- | --- | --- |
| **A. From portal to Pursue** | A (KSA) | Radar → capture of the hero tender → booklet purchase approved by a person → intake steps → queue (2 fields; the initial-guarantee 1% vs 2% conflict) → Eligibility (Zakat and GOSI at risk; turnover years) → queries drafted (VAT; turnover years) → DG1 Pursue with team → RFQ clock | M-1, M-2, M-3 |
| **B. Quotes without chasing** | A | Packages → shortlist (screening blocks one supplier) → RFQs → nudges → levelling (VAT, EUR, ex-works, validity) → best-fit, override → Supplier Portal preview | M-4 |
| **C. The committee decides** | A | Pack (win probability 58 ± 8, competitors, facility, capacity clash, margin range) → issue → switch to CFO and Technical Director to vote → CEO decides Bid with conditions → audit | M-5, M-6 |
| **D. Same tender, five companies** | A–E | Switch tenants and open the hero tender → Compare tenants lens | M-7 |
| **E. Arabic in, English out** | D or A | Upload the scanned Arabic tender → OCR → bilingual fields → "Arabic prevails" flag | M-8 |
| **F. Who can see what** | A, Platform | Head of Tendering "View as"; margin masked for Procurement; Platform Console break-glass | M-9 |

---

## 18. Honesty rules

- Agent timings and outcomes are **simulated**. Nothing claims to be live data. Keep the existing "Prototype: indicative UI, illustrative data" banner.
- Real sample tenders keep their real content. Any date shift is disclosed.
- Competitor and supplier names are fictional. Real public authorities may be named as issuers, as the app already does, but no real contractor is named or scored.
- No capability is shown that the proposal says the platform won't do. It does not submit autonomously, solve CAPTCHAs, or pay fees.

## 19. Acceptance criteria for the Stage 1–3 demo

- [ ] Scripts A–F run end to end without dead ends, as the personas listed, in both themes, at 1440 and 1280 widths.
- [ ] Every number traces to `src/data` and is derived in `live.ts`, or its equivalent per stage module. No hard-coded numbers in pages.
- [ ] Every action is permission-checked through `can()`. Masked data shows a masked state.
- [ ] DG1 and DG2 records contain who, when, what was seen and why. Overrides and reason codes are captured.
- [ ] Tenant switch changes the data, users, currency, branding and portals. Nothing leaks between tenants.
- [ ] Reset (all or current tenant) returns to seed. Scenario presets land in their stated state.
- [ ] Arabic documents show the English value with the Arabic source for every field.
- [ ] Demo scope mode hides Stage 4–9 surfaces completely, with no placeholders.
