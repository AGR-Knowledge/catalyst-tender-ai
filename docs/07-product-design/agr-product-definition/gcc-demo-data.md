# GCC demo data: tenants, hero tender, seed story

AGR product definition, v1 draft, 2026-09-25. This is the data design for the Stage 1–3 GCC demo. Executors seed `app/src/data/` from this document, so that the numbers in [kpi-and-screen-catalogue.md](kpi-and-screen-catalogue.md) are *derived* to the values below. Nothing here is typed into a page.

Read with [s1-s3-demo-spec.md](s1-s3-demo-spec.md) (behaviour) and [roles-and-access.md](roles-and-access.md) (who sees what).

**Everything is fictional**:
- tenant companies, people, suppliers, competitors;
- the hero tender and its issuer.

Resemblance to real organisations or people is unintended. Real public bodies appear only where a *real* sample document names them (§9). Laws, portals and calendar facts are real and carry a source.

**Provenance tags used below:**
- **[V]**: verified against the primary text named in §10.
- **[L]**: well-established, but not re-verified in this pass.
- **[A]**: an assumption made for the demo. Verify it before a client meeting (§10.3 lists these).

---

## 1. Demo clock and GCC calendar

- **Demo today: Sunday 8 March 2026** (unchanged, `TODAY_ISO`). That is about **19 Ramadan 1447** [L: Ramadan 1447 expected to begin on or about 18 Feb 2026].
- The default demo time of day is **10:00 in the tenant's time zone**. Intake events earlier that morning are timestamped before 10:00.
- **Eid al-Fitr 1447** is expected on or about **Fri 20 Mar 2026**. The exact date depends on moon sighting, so the UI always says "expected" [L].
- **Eid al-Adha 1447** is expected on or about **Wed 27 May 2026** [L].

| Country | Time zone | Weekend | VAT | Currency (per USD) | Main public e-procurement | Tenant |
| --- | --- | --- | --- | --- | --- | --- |
| Saudi Arabia | UTC+3 (AST) | Fri–Sat [L] | 15% [L] | SAR 3.75 (peg) [L] | **Etimad** [L] | A (primary) |
| United Arab Emirates | UTC+4 (GST) | Sat–Sun; federal government half day on Friday [L] | 5% [L] | AED 3.6725 (peg) [L] | Federal and emirate portals (e.g. Abu Dhabi, Dubai) [A: exact portal names to verify] | B |
| Qatar | UTC+3 | Fri–Sat [L] | none [L] | QAR 3.64 (peg) [L] | **Monaqasat** (Ministry of Finance) [L] | C |
| Oman | UTC+4 | Fri–Sat [L] | 5% [L] | OMR 0.3845 (peg) [L] | Tender Board e-tendering [A: current portal name to verify] | D |
| Kuwait | UTC+3 | Fri–Sat [L] | none [L] | KWD **0.3070** (managed basket; demo bid rate) [A] | **CAPT** (Central Agency for Public Tenders) [L] | E |

**Calendar data for the app** (`data/gcc/calendar.ts`, plan 002). Every public holiday carries `expected: true` until confirmed.

| Item | Demo value | Tag |
| --- | --- | --- |
| Ramadan reduced public-sector hours | on through Thu 19 Mar 2026; KSA government shown as 10:00–15:00 | [A] |
| KSA public-sector Eid al-Fitr closure | Thu 19 Mar – Sat 28 Mar 2026 (expected) | [A] |
| UAE, Qatar, Oman, Kuwait Eid al-Fitr closure | Fri 20 Mar – Mon 23 Mar 2026 (expected) | [A] |
| KSA Founding Day | 22 Feb (before demo today; history only) | [L] |
| Eid al-Adha closure (all) | Tue 26 May – Sat 30 May 2026 (expected) | [A] |

**Working days** = the country's weekdays minus the closures above. `When` shows calendar days and working days (ui-direction §7.2).

---

## 2. Tenants

Five fictional GCC EPC contractors plus the existing Indian tenant. The Platform Console also lists **Genesis Infra Gulf JV**, the existing onboarding tenant, as an *onboarding* tenant. It is not switchable.

| Key | Tenant | HQ | Sectors | Size (avg turnover) | Currency | Residency [A] | Accent [A] |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `najd` | **Najd Arcline Contracting Co.** (primary) | Riyadh, KSA | Water & wastewater (lead), utility networks, roads | SAR 1.41 bn | SAR | KSA in-Kingdom region | teal |
| `corniche` | **Corniche Lattice MEP LLC** | Dubai, UAE | Buildings MEP, district cooling, fit-out | AED 1.10 bn | AED | UAE (me-central-1) | violet |
| `dafna` | **Dafna Keystone Civil W.L.L.** | Doha, Qatar (with a Riyadh branch) | Civil works, utility networks, pump stations | QAR 820 M | QAR | Qatar region | amber |
| `batinah` | **Batinah Waypoint Roads LLC** | Sohar, Oman | Roads, bridges, earthworks | OMR 38 M | OMR | UAE (me-central-1) | slate blue |
| `qurain` | **Qurain Meridian Projects Co.** (group; bids in KSA through Qurain Meridian Arabia Co.) | Kuwait City | Water, infrastructure, oil & gas facilities | KWD 142 M group (KSA subsidiary SAR 1.35 bn) | KWD | Bahrain (me-south-1) | crimson |
| `gen-in` | Genesis EPC India Ltd (existing) | Mumbai | Existing Indian data | existing | INR | Mumbai (ap-south-1) | existing |

Accents need light and dark tokens (ui-direction §3.1). The brand mark is a two-letter monogram in the accent colour. No logos are drawn.

### 2.1 Fit model per tenant
Nine criteria (spec §6.6). Weights sum to 100. The Head of Tendering edits them in Administration → Fit model & rules.

| Criterion | Najd | Corniche | Dafna | Batinah | Qurain |
| --- | --- | --- | --- | --- | --- |
| Scope and sector fit | 20 | 15 | 20 | 25 | 15 |
| Size against band and single-contract limit | 10 | 10 | 15 | 15 | 10 |
| Eligibility result | 20 | 15 | 20 | 20 | 15 |
| Geography and presence | 10 | 10 | 10 | 15 | 10 |
| Client relationship and payment record | 10 | 10 | 5 | 5 | 10 |
| Contract terms and risk | 10 | 10 | 10 | 5 | 10 |
| Team capacity | 8 | 10 | 10 | 5 | 15 |
| Bond facility headroom | 7 | 5 | 5 | 5 | 10 |
| Strategic priority | 5 | 15 | 5 | 5 | 5 |
| **Pursue at / conditions from** | 70 / 50 | 65 / 45 | 70 / 50 | 75 / 55 | 70 / 50 |
| Preferred value band | SAR 150–800 M | AED 50–600 M | QAR 40–400 M | OMR 3–40 M | KWD 5–60 M |
| Single-contract limit | SAR 900 M | AED 700 M | QAR 450 M | OMR 45 M | KWD 70 M |
| DG2 referral threshold (committee above) | SAR 50 M | AED 40 M | QAR 40 M | OMR 4 M | KWD 4 M |
| Capacity safe-delivery threshold | 70% | 75% | 70% | 70% | 75% |

**The PQ-fail cap:** any Fail line caps the verdict at "Pursue with conditions (JV needed)", when a partner in the tenant's list closes every failing line, or else at "Recommend discard". This applies whatever the weighted score (spec §6.6).

### 2.2 Najd Arcline Contracting Co. (tenant A, primary)

**Company:**
- Riyadh HQ; offices in Dammam and Jeddah; about 4,800 staff.
- Financial year ends 31 Dec.
- Audited turnover: FY2022 SAR 1.32 bn, FY2023 SAR 1.39 bn, FY2024 SAR 1.52 bn (average FY22–24: **SAR 1.41 bn**).
- FY2025 draft (unaudited) SAR 1.66 bn. The audit sign-off is expected on **15 Apr 2026**.
- Net worth SAR 610 M; current ratio 1.34 (FY2024).

**Credential vault** (the deliberate expiries drive M-2):

| Credential | Number / grade | Valid to | Owner | Hero result |
| --- | --- | --- | --- | --- |
| Commercial Registration (water & sewage works activity) | CR 1010xxxxxx | 21 Aug 2027 | Legal | Pass |
| Zakat certificate (ZATCA) | FY2024 filing | **30 Apr 2026** | Finance (Sultan Al-Anazi) | **At risk**: expires before opening (10 May). Renewal follows the FY2025 return [A: the Zakat certificate validity pattern is an assumption to verify] |
| GOSI certificate | — | **Thu 7 May 2026** | HR (Noura Al-Shammari) | **At risk**: expires 3 days before opening |
| Chamber of Commerce membership | Riyadh Chamber | 31 Dec 2026 | Admin | Pass |
| Contractor classification | Water & sewage works **Grade 1**; Roads Grade 2; Buildings Grade 3 | 14 Nov 2027 | Tendering | Pass |
| Saudi Contractors Authority membership | — | 31 Oct 2026 | Admin | Pass |
| Saudization (localisation ratio) certificate | High Green band | 30 Jun 2026 | HR | Pass |
| VAT registration | 3xxxxxxxxxx0003 | n/a | Finance | Pass |
| ISO 9001 / 14001 / 45001 | — | 2027 | QHSE | Pass |
| Local content baseline certificate | Company LC score **41%** | 30 Sep 2026 | Commercial | Pass (min 40%) |
| Audited financial statements | FY2022, FY2023, FY2024 (FY2025 draft) | n/a | Finance | Interpretation (§4.6) |

**Similar-projects register (extract):**
- **Riyadh East STP expansion**: 150,000 m³/day, tertiary treatment, completed 2019, SAR 620 M.
- **Buraydah STP**: 120,000 m³/day, secondary, completed 2022, SAR 540 M.
- **Hail STP**: 60,000 m³/day, completed 2021.
- **Riyadh East STP O&M**: 2019–2024.

**JV partners list:**
- Rafid Process Engineering (process design);
- Tihama Hydro Works Co. (a potential partner that is also a market competitor).

**Capacity and facility:**
- **Water tendering team:** 6 tendering engineers, 2 estimators, 1 planner.
  - Committed load for the next 4 weeks is **78%**; with the hero tender it is **96%** (CAP-1 orange).
- **Bank guarantee facility:**
  - limit SAR 600 M;
  - utilised on contracts SAR 410 M;
  - committed by live bids SAR 94 M;
  - **headroom SAR 96 M**, as of Thu 5 Mar, confirmed by Finance.

**Sources:**

| Source | Mode | State on demo day |
| --- | --- | --- |
| Etimad | Scheduled, login | Healthy. **Credentials expiring**: the service-account password expires Fri 13 Mar (INT-4 orange) |
| National water utility supplier portal | Assisted: login-gated, an operator completes access | Healthy |
| Industrial utilities vendor portal | Assisted | Healthy |
| Mailboxes (two) | IMAP | Healthy |
| Scanned drop | OCR | Healthy |
| Manual upload | n/a | Healthy |

The reconciliation card counts **9 sources** (with the other portals it watches).

### 2.3 Corniche Lattice MEP LLC (tenant B)

- **Company:** UAE MEP contractor; Dubai Municipality and Abu Dhabi classifications [A].
  - **No Saudi CR, classification or registrations.**
  - Strategy: enter KSA in 2026, which is why its strategic-priority weight is high.
  - Watches Etimad for KSA entry opportunities.
- **Experience:** MEP packages inside two STPs as a subcontractor. No STP as prime.
- **Facility:** AED 380 M limit, 58% used. **Team:** Buildings MEP team at 64% load.
- **Hero result:** Recommend discard (§4.7).

### 2.4 Dafna Keystone Civil W.L.L. (tenant C)

- **Company:** Doha HQ. Its Riyadh branch holds a Saudi CR and all KSA registrations. It is classified **Water & sewage works Grade 2**.
- **Experience:** one STP of 110,000 m³/day (civil and mechanical, 2020); no O&M.
- **Turnover:** average QAR 820 M (about SAR 845 M).
- **Partners list:** **Tihama Hydro Works Co.**:
  - fictional KSA contractor, Water & sewage **Grade 1**;
  - two STPs over 100,000 m³/day, one tertiary;
  - 4 years of O&M;
  - turnover SAR 1.10 bn.
- **Facility:** QAR 260 M limit, 41% used. **Team:** Utilities team at 72% load.
- **Hero result:** Pursue with conditions, as a JV with Tihama as lead at 60% (§4.7).

### 2.5 Batinah Waypoint Roads LLC (tenant D)

- **Company:** Oman roads contractor, classified Excellent grade with the Tender Board [A]. No KSA presence; no water experience.
- **Turnover:** average OMR 38 M (about SAR 371 M).
- **Hero route:** the tender arrives by email from a prospective partner, not from a watched portal.
- **Also the tenant for:** the scanned Arabic roads tender and the Lebanon roads tender (§9). Sector fit, but geography out.
- **Hero result:** Recommend discard (§4.7).

### 2.6 Qurain Meridian Projects Co. (tenant E)

- **Company:** Kuwait group. It bids in KSA through **Qurain Meridian Arabia Co.**, which holds:
  - Water & sewage **Grade 1**;
  - all KSA registrations current;
  - two KSA STPs over 100,000 m³/day, one tertiary, plus 3 years of O&M;
  - turnover of SAR 1.35 bn.
- **Facility** (group level, in KWD):
  - limit KWD 28 M; used KWD 22.8 M; committed by two live Kuwait bids KWD 2.1 M;
  - **headroom KWD 3.1 M** (about SAR 37.9 M).
- **Team:** the water tendering team is at **118%** in April, because two large Kuwait bids are due in the same weeks.
- **Hero result:** Pursue with conditions or Hold, on capacity and facility (§4.7).

### 2.7 People (persona names per tenant)
Names are fictional composites. **Role keys** come from plan 003. The same role key exists in every tenant, so switching tenant keeps the persona.

| Role key | Najd (A) | Corniche (B) | Dafna (C) | Batinah (D) | Qurain (E) |
| --- | --- | --- | --- | --- | --- |
| `hot` Head of Tendering | Faisal Al-Harbi | Rania Khoury | Nasser Al-Kuwari | Said Al-Balushi | Bader Al-Mutawa |
| `coord` Tender Coordinator | Aisha Al-Qahtani | Joanna D'Souza | Maria Santos | Shamsa Al-Hinai | Grace Pereira |
| `bid` Bid Manager | Omar Siddiqui | Sameer Qureshi | Bilal Ahmed | Imran Sheikh | Tariq Mahmood |
| `proc` Procurement Lead | Joseph Mathew | Ivan Petrov | Suresh Babu | Ravi Shankar | Sanjay Verma |
| `exec` CEO (committee member, seat `ceo`; the Head of Tendering approves DG2) | Eng. Abdulaziz Al-Dosari | Hamad Al Mazrouei | Jassim Al-Sulaiti | Talal Al-Rawahi | Fahad Al-Enezi |
| `member` CFO | Khalid Al-Mutairi | Priya Raman | Waleed Hamdan | Hilal Al-Kindi | Rashed Al-Ajmi |
| `member` Technical Director | Dr Hany Farouk | Stefan Novak | Emad Youssef | Ashraf Kamel | Walid Saab |
| `member` Operations Director | Saad Al-Shehri | Yousef Al Hammadi | Mubarak Al-Marri | Salim Al-Saadi | Hamad Al-Rashidi |
| `member` Sector Head | Majed Al-Otaibi (Water) | Mariam Al Suwaidi (Buildings) | Abdulla Al-Emadi (Utilities) | Khamis Al-Amri (Roads) | Dalal Al-Shatti (Water & Infra) |
| `comm` Commercial Manager | Tarek Haddad | Daniel Okafor | George Khalil | Nabil Aoun | Karim Nassar |
| `plan` Planning Manager | Arjun Pillai | Kiran Patel | Deepak Sharma | Vinod Kumar | Rohit Malhotra |
| `comp` Compliance / Legal Lead | Lina Barakat | Hala Mansour | Reem Al-Ansari | Muna Al-Harthy | Nour El-Din |
| `prop` Proposal Manager (Stage 6 owner; added 2026-09-25) | Rami Aziz | Sophie Laurent | Ahmed Fathy | Latifa Al-Maawali | Mona Al-Rifai |
| `dir` Project Director (Stage 9 owner; designate on Stage 1–3 packs) | Mohammed Al-Ghamdi | Graham Whitfield | Mark Ellison | Peter Grant | Alan Brooks |
| `fin` Finance / Treasury | Sultan Al-Anazi | Anil Kumar | Hisham Nasr | Badar Al-Riyami | Yacoub Al-Qattan |
| `hr` HR (credential owner; no switcher entry) | Noura Al-Shammari | Fatima Al Nuaimi | Sara Al-Mohannadi | Zainab Al-Lawati | Huda Al-Kandari |
| `supplier` (portal preview) | Ahmed Saleh, Gulf Process Systems Co. | as A's supplier | as A's supplier | as A's supplier | as A's supplier |
| `platform` Catalyst operator | Catalyst Platform Operations (not tenant-specific) | | | | |

---

## 3. The Indian tenant (kept)

`gen-in` keeps all of today's data and dashboards unchanged, as the **full lifecycle preview**. Until Stages 4–9 are rebuilt on GCC data:
- the Settings → Demo scope toggle "Full lifecycle (preview)" is offered **only on `gen-in`**;
- GCC tenants are always in `Stages 1–3` scope.

This prevents Indian data from appearing under a GCC brand. The spec §2.1 note records this.

---

## 4. The hero tender (synthetic)

One tender, captured by all five tenants, gives five answers (M-7). It is modelled on the **Saudi Ministry of Finance standard tender booklet for general construction works** [V: booklet], with the GTPL rules below. The PDF is generated by plan 005, and the extraction record is seeded by plan 004. **Both follow the page map in §4.9.** Every page of the PDF carries the watermark "Synthetic document for demonstration".

### 4.1 Identity
| Field | Value |
| --- | --- |
| TID (in each tenant's register) | **T-2026-118** (the same number in every tenant, for presenter clarity) |
| Title | Expansion of Al-Rawdah Sewage Treatment Plant, Phase 2 (+150,000 m³/day), with tertiary treatment and a TSE transmission pipeline |
| Issuer | **Eastern Cities Water Services Company (ECWS)**, a fictional government-owned water utility, Eastern Province, KSA |
| Reference | ECWS/PRJ/2026/0147 |
| Portal | Etimad (the booklet itself says "the electronic portal") |
| Procurement type | Public tender, **two files** (technical and financial), encrypted [V: booklet §45, mandatory at ≥ SAR 5 M] |
| Contract basis | Design & build of process and MEP, civil works to issued design; re-measured unit-rate BOQ; optional 24-month O&M priced separately |
| Duration | 30 months; then a 12-month maintenance period [A] |
| Estimated value | **Not published.** The platform estimates **SAR 480 M** (band SAR 420–540 M) from BOQ quantities × tenant benchmark rates, and labels it as an estimate (INT and pack copy) |
| Documents | Vol. 1 Booklet (48 pp PDF, §4.9) · Vol. 2 BOQ (XLSX, 236 lines, 11 bills) · Vol. 3 Drawings list |
| Language | English booklet provided; **"the Arabic text prevails"** [V: booklet §27]. This triggers the M-8 flag even on an English document |

### 4.2 Key dates (canonical; everything else derives from these)
| Event | Date and time (AST) | Rule / note |
| --- | --- | --- |
| Published on Etimad | **Sun 8 Mar 2026, 07:15** | Demo today |
| Booklet purchase | SAR 5,000 via SADAD, any time before the deadline | [V: fee clause exists, booklet §3; amount A]. Purchase is requested by the Coordinator and approved and paid by a person; **the platform never pays** |
| Participation confirmation letter | Thu 12 Mar 2026 | Booklet timetable row [V] |
| Site visit and scope briefing | **Tue 17 Mar 2026, 10:00**, plant gate | Encouraged, not mandatory [V: booklet §34]. Ramadan-hours flag |
| Questions deadline | **Wed 18 Mar 2026** | 10 days after publication [V: booklet §33] |
| Answers due | Wed 25 Mar 2026 | 7 days [V: booklet §33]. **Falls in the expected Eid closure**: flag "answers may be delayed" |
| **Submission deadline** | **Sun 10 May 2026, 10:00** | **≥ 60 days after publication for estimated cost ≥ SAR 100 M** [V: GTPL Implementing Regulations Art. 34(1)(c)]; 63 days here |
| Original initial guarantee | Delivered to the booklet §8 address before the deadline; a copy goes in the financial file | [V: original with the bid, in the financial file, booklet §41; physical delivery practice A] |
| Bid opening | Sun 10 May 2026, 10:30 | Immediately after the deadline; technical files only; names announced [V: booklet §49] |
| Bid validity | 90 days from opening → **Sat 8 Aug 2026** | [V: booklet §29] |
| Initial guarantee validity | ≥ 90 days from opening → ≥ 8 Aug 2026 | [V: booklet §41] |
| Standstill after award | 5 working days | [V: booklet §55] |

From demo today to submission: **63 calendar days**. Working days (KSA, minus the expected Eid closure) are computed by `calendar.ts`, not typed.

### 4.3 Commercial terms
| Field | Value | Tag / page |
| --- | --- | --- |
| Currency | SAR | [V booklet §28] p. 9 |
| Taxes | "Prices include all taxes, fees and expenses". **VAT is not named** → flag, and a drafted query ("confirm whether rates include 15% VAT") | [V booklet §39] p. 11 |
| Initial guarantee | **Conflict, seeded:** §41 says **1%** of total bid value (the template's red default, left unedited); §77 special conditions says **2%**. The agent shows both and refuses to choose (spec §6.3 conflict pattern) | [V range 1–2%] pp. 12 and 35 |
| Final guarantee | 5% of contract value within 15 working days of award | [V booklet §57] p. 18 |
| Advance payment | Up to 10% of contract value against an equal advance payment guarantee, reducing as recovered | [V GTPL Regs, advance payment article] p. 36 |
| Final invoice (retention) | Up to 10% deducted from each invoice until the final invoice reaches 10% of contract value, paid at initial delivery | [V GTPL Regs Art. 111] p. 36 |
| Delay penalties | Formula stated. **The cap is left as "[ %]"** → flag | [V: blank in the template, booklet §60] p. 19 |
| Total penalties cap | 20% of contract value | [V booklet §62] p. 19 |
| Subcontracting | ≤ 30% of contract value; 30–50% needs EXPRO and entity approval; list with quantities and prices in the bid; no sub-subcontracting | [V booklet §23] p. 7 |
| Abnormally low bids | ≥ 25% below the estimate and market may be excluded after a justification request | [V booklet §19] p. 6 |
| Economic participation | Applies if foreign imports ≥ SAR 100 M. Estimated imports are about SAR 85 M → "close to threshold" note | [V threshold booklet Part 10; import estimate A] p. 34 |

### 4.4 Evaluation
- Technical evaluation with a **pass mark of 70/100** (Annex 5, p. 42). Then the financial score.
- **Financial score:** (lowest qualified price ÷ bidder's price) × 60% + (target LC% × 50% + LC baseline × 50% + 5 points if listed) × 40%. The top score wins only if it is within 10% of the lowest qualified price [V booklet §51-5].
- **A target LC% is mandatory.** A bid without one is excluded [V booklet §51-4]. The LC annex is **Annex 10** (estimated cost ≥ SAR 400 M), with a minimum LC of **40%** [V annex band; 40% A].
- National product price preference of 10%. Mandatory-list items in the BOQ are flagged: GRP pipes, LV cables, valves [V preference; items A].

### 4.5 Eligibility requirements (PQ lines; IDs used by the eligibility check)
All certificates must be **valid at bid opening**, for the bidder **and every listed subcontractor**. A missing or expired certificate gets at most 10 working days to cure; after that the bid is excluded and the initial guarantee forfeited [V booklet §6, §53].

| ID | Requirement | Page |
| --- | --- | --- |
| PQ-01 | Saudi CR covering water and sewage works | 4 |
| PQ-02 | Zakat and/or tax certificate, valid at opening | 4 |
| PQ-03 | GOSI certificate, valid at opening | 4 |
| PQ-04 | Chamber of Commerce membership | 4 |
| PQ-05 | Contractor classification: **Water & sewage works, Grade 1**. Consortia per the Classification Law: every member classified in the field, at least one at the required grade, the rest at most one grade lower [V: Contractor Classification Law Art. 9] | 4, 38 |
| PQ-06 | Saudi Contractors Authority membership | 4 |
| PQ-07 | Certificate of the required localisation ratio (Saudization) | 4 |
| PQ-08 | VAT registration | 38 |
| PQ-09 | **≥ 2 completed STPs, each ≥ 100,000 m³/day, in the last 10 years** (since 10 May 2016), at least one with tertiary treatment; as prime or consortium lead | 38 |
| PQ-10 | ≥ 3 years' O&M of an STP ≥ 50,000 m³/day, or a named O&M subcontractor meeting it | 38 |
| PQ-11 | **Average annual turnover over the last three financial years ≥ SAR 1.2 bn (audited)**. Consortia: the lead ≥ 60% of the requirement, all members together ≥ 100% [synthetic rule] | 39 |
| PQ-12 | Positive net worth and current ratio ≥ 1.1 in the latest audited accounts | 39 |
| PQ-13 | Key personnel: Project Manager (≥ 20 years, 10 in water and wastewater), Process Design Lead (≥ 15), Saudi national HSE Manager (≥ 10), Commissioning Manager (≥ 12) | 40 |
| PQ-14 | ISO 9001 / 14001 / 45001. **The source typo "ISO 90001" is seeded** → flag "likely ISO 9001" [the typo is in the real template] | 40 |
| PQ-15 | Local content: target LC% commitment, and a baseline certificate ≥ 40% | 33, 41 |
| PQ-16 | Consortium rules: agreement certified by the Chamber or a notary before submission; named lead; joint and several liability; no member bids alone or in another consortium | 7 |

### 4.6 Deliberate flaws seeded in the booklet (the extraction must catch them)
1. **Initial guarantee 1% (§41) against 2% (§77):** a conflict. Blocks DG1 until the Coordinator resolves it (the likely reading is 2%, with a query drafted).
2. **Delay penalty cap "[ %]"** left blank.
3. **Answer period wording** ("within 7 days from that date"): it's ambiguous whether this counts from publication or from the questions deadline.
4. **Wrong annex reference:** post-qualification criteria "in Annex (8)", but they are in Annex 4 (the real template has this error).
5. **"ISO 90001"** typo.
6. **VAT not named.**
7. **TSE pipeline length:** 16 km in the scope (p. 23) against 18 km in the drawings list title (p. 47). Medium confidence.
8. **Turnover years ambiguity** (PQ-11) for tenant A. FY2025 accounts are audited on 15 Apr, before opening:
   - reading 1, FY2022–24: avg SAR 1.41 bn, **passes**;
   - reading 2, FY2023–25: avg SAR 1.52 bn, **passes**.

   Interpretation line; a query is drafted.

### 4.7 Expected result per tenant

| PQ line | Najd (A) | Corniche (B) | Dafna (C) alone → JV with Tihama | Batinah (D) | Qurain (E) via KSA subsidiary |
| --- | --- | --- | --- | --- | --- |
| PQ-01, 04, 06, 07, 08 KSA registrations | Pass | **Fail** (not registered in KSA) | Pass (Riyadh branch) | **Fail** | Pass |
| PQ-02 Zakat | **At risk** (30 Apr) | **Fail** | Pass | **Fail** | Pass |
| PQ-03 GOSI | **At risk** (7 May) | **Fail** | Pass | **Fail** | Pass |
| PQ-05 Classification | Pass (G1) | **Fail** | **Fail** alone (G2) → **Pass** in JV (Art. 9) | **Fail** | Pass |
| PQ-09 STP experience | Pass (150k tertiary; 120k) | **Fail** (MEP subcontracts only) | **Fail** alone (one STP) → **Pass** combined | **Fail** | Pass |
| PQ-10 O&M | Pass | **Fail** | **Fail** alone → **Pass** (partner) | **Fail** | Pass |
| PQ-11 Turnover | **Interpretation** (both pass) | Pass in AED terms, but the entity isn't eligible | **Fail** alone (SAR 845 M) → **Pass** (lead 1.10 bn ≥ 60%; combined 1.95 bn) | **Fail** (SAR 371 M) | Pass (SAR 1.35 bn) |
| PQ-12 to PQ-15 | Pass | n/a | Pass | n/a | Pass |
| **Weighted fit** | **82** | 63 | 71 | 38 | 78 |
| **Recommendation** | **Pursue**: renew Zakat and GOSI before 10 May; confirm turnover years | **Recommend discard** (PQ-fail cap). *What would change it:* join a Grade 1 bidder as MEP subcontractor (inside the 30% cap) | **Pursue with conditions (JV needed)**: Tihama Hydro as lead, 60/40 | **Recommend discard**: size, geography and eligibility. Flagged for a person; never auto-discarded | **Pursue with conditions**: team at 118% in April; facility headroom KWD 3.1 M against bid bond KWD 0.79 M, and a performance bond of about KWD 1.97 M if won. Hold until Finance confirms the facility or a bid is released |
| DG1 path in the demo | Pursue, with team assigned; RFQ clock starts | Discard (reason codes: PQ fail, geography), or re-routed as a subcontract opportunity | Pursue with the JV scenario recorded | Discard (size, PQ fail, geography) | Hold: request to Finance; SLA keeps running |

**Money shown per tenant** (hero estimate SAR 480 M at demo rates):
- A: SAR 480.0 M;
- B: AED 470.1 M (SAR 480 M);
- C: QAR 465.9 M;
- D: OMR 49.2 M;
- E: KWD 39.3 M.

The original SAR always shows beside the converted value (spec §5.6).

### 4.8 BOQ bills and procurement packages (A's view)
BOQ: 236 lines, 11 bills. Shares of the estimated value:

| Bill | Share | A's classification (spec §8.2) |
| --- | --- | --- |
| 1 General and preliminaries | 7% | Self-performed |
| 2 Civil and structural (bioreactors, clarifiers, buildings) | 30% | Self-performed |
| 3 Process mechanical equipment (screens, grit, blowers, clarifier mechanisms) | 17% | **Supply** (P-02), installed by A |
| 4 Tertiary filtration and UV disinfection | 6% | Supply (P-03) |
| 5 Sludge thickening and dewatering | 5% | Supply (P-04) |
| 6 Odour control | 2% | Subcontract (P-05) |
| 7 Electrical: 33/11 kV substation, transformers, MCCs, cabling | 9% | Subcontract (P-06 substation, P-07 LV) |
| 8 Instrumentation, control and SCADA | 4% | Subcontract (P-08). **2% of value is Not covered**: SCADA integration with the utility's existing control centre |
| 9 Yard piping, valves and penstocks | 6% | Supply (P-09) + self-performed install |
| 10 TSE pipeline (DN1000 GRP, 16 km) and TSE pump station | 11% | Supply (P-10 pipes, a mandatory-list item; P-11 pumps) + self-performed laying |
| 11 Piling, dewatering and shoring | 3% | Subcontract (P-01) |

**Roll-up** (the Workbench coverage bar, extended for the 30% cap). **Decided 2026-09-25:** the bar is derived from plan 004's BOQ lines and packages (`HERO_LINES`, `HERO_PACKAGES`, `HERO_NOT_COVERED`), never typed. The earlier summary (54 / 20 / 24 / 2) contradicted the table above and is withdrawn. The seed gives:
- Self-performed **49.7%** (bills 1–2, plus the contractor's installation and laying inside the supply bills);
- Supply **32.3%** (P-02, P-03, P-04, P-09, P-10, P-11);
- Subcontract works **16.0%** (P-01, P-05, P-06, P-07, P-08);
- **Not covered 2.0%** (8.13, the SCADA link to the utility's control centre).

"Subcontract works 16% of the 30% cap" shows as a passing check. Supply of equipment and materials is treated as not counting towards the §23 subcontracting cap; only works subcontracted do [A: confirm with a KSA procurement adviser]. **Long-lead items:** P-02 (32–40 weeks), P-03, P-06 (transformers, 36 weeks).

### 4.9 Page map of the booklet PDF (plans 004 and 005 must both honour it)
| Pages | Content (booklet part) |
| --- | --- |
| 1 | Cover: issuer, title, reference, Hijri and Gregorian issue date, watermark |
| 2 | Contents |
| 3–4 | Part 1 Introduction: definitions, purpose, fee (§3), **timetable (§4)**, eligible persons, **required certificates (§6)**, representative, delivery address |
| 5–8 | Part 2 General provisions: changes, cancellation, **abnormally low (§19)**, **consortium (§22)**, **subcontracting (§23)**, post-qualification (§24, "Annex (8)" error) |
| 9–12 | Part 3 Preparing bids: **language/Arabic prevails (§27)**, currency (§28), **validity (§29)**, technical and financial files (§35–36), pricing rules (§37), **taxes (§39)**, guarantees (§40), **initial guarantee 1% (§41)** |
| 13–14 | Part 4 Submitting bids: two files, encryption, late bids, withdrawal, opening |
| 15–17 | Part 5 Evaluation: criteria, LC financial formula, correction rules, ties, standstill |
| 18–19 | Part 6 Contracting: final guarantee, signature, **penalties with the "[ %]" cap (§60)**, 20% cap, insurance |
| 20–29 | Part 7 Scope of work: plant description, inlet works, bioreactors, clarifiers, tertiary, sludge, odour, electrical, SCADA, **TSE pipeline 16 km (p. 23)**, tie-ins to the live plant, programme (30 months), site, training, labour table |
| 30–32 | Part 8 Specifications summary |
| 33 | Part 9 Local content (Annex 10, minimum 40%, target LC% mandatory) |
| 34 | Part 10 Economic participation |
| 35–37 | Part 11 Special conditions: **initial guarantee 2% (§77)**, advance payment, final invoice, O&M option, maintenance period, key personnel |
| 38–41 | Annex 4 Post-qualification criteria: PQ-05 … PQ-15 table |
| 42 | Annex 5 Evaluation criteria and weights (technical pass mark 70) |
| 43–46 | BOQ summary by bill (quantities only; full BOQ in Vol. 2) |
| 47 | Drawings list (**"TSE transmission line, 18 km"**) |
| 48 | Annex 1 Bid letter form |

Exact pages of other facts the seed data cites (from plans 004 and 005, 2026-09-25): p. 3 contract basis; p. 11 pricing rules (§37); p. 15 national product preference; p. 26 tie-ins to the live plant.

---

## 5. Registers (seed story per tenant)

### 5.1 Najd (A): the full register, as of Sun 8 Mar 10:00 in preset "DG1 due"
| TID | Tender (fictional issuer unless a real document) | Stage / state | Story role |
| --- | --- | --- | --- |
| T-2026-118 | Al-Rawdah STP Phase 2 (hero) | S1. Captured 07:15 → booklet purchase approved 07:31 → documents 07:33 → logged 07:44. **2 fields to check** (guarantee conflict, pipeline length) | Script A; DG1 due Mon 9 Mar 07:44 |
| T-2026-117 | Riyadh North sewer network rehabilitation | S1, validated; fit 74; **DG1 due today 16:10** | SCR-1 "2 due · first in 6 h" |
| T-2026-119 | Jazan seawater intake and outfall (marine works) | S1; fit 41; **Low fit, flagged** | M-3: never discarded by the agent |
| T-2026-122 | Dammam lift stations rehabilitation | S1, **notice only**: booklet not yet bought (SAR 3,000, purchase closes Tue 10 Mar) | INT-10 "Documents to buy 1" |
| T-2026-120 | Wadi Zarqa WWTP Phase I DBO, PQ (real document, Jordan) | S1; received by email from a consultant; PQ stage; geography outside | Real-document variety; "Treat as newly published" |
| T-2026-112 | Hofuf water network extension | Discarded at DG1, 3 Mar (below the value band) | History |
| T-2026-109 | Tabuk water transmission pipeline, Phase 1 | S2. Pursued Wed 4 Mar 11:20; 9 of 9 RFQs sent Thu 5 Mar 10:05 (within 24 h); replies due Sun 15 Mar | SRC-1 trailing 100% |
| T-2026-104 | Jubail industrial wastewater treatment upgrade | S2. Pursued 26 Feb; **7 of 11 packages covered**; 4 overdue RFQs (2 escalated); 5 adjustments to confirm | Script B levelling |
| T-2026-101 | Abha STP upgrade | S3, pack in preparation. **Inputs outstanding:** Finance facility (late), Legal risks (due today) | DEC-7 |
| T-2026-097 | Madinah WTP expansion (SAR 355 M) | **At DG2.** Pack issued Sat 7 Mar 14:10 (SLA to Sun 8 Mar 14:10); positions recorded 2 of 5 (CFO: support with conditions; Technical Director: support). Win probability **58 ± 8**; margin range **8.5–11.5%**. **Stale:** Addendum 2 received today 09:12, changing 2 packages | Script C |
| T-2026-088 | Dammam stormwater tunnels | Later stage (S6), "Current stage" only | Realistic register |
| T-2026-079 | Qassim water networks | Submitted 22 Feb; awaiting award | Realistic register |

**History** (drives OUT-1 … OUT-7, SCR-2 … SCR-4, DEC-2, DEC-10):
- **Trailing 12 months:** 33 decided submitted bids; **9 won, 24 lost → hit rate 27%**.
  - Water: 7 of 21 (33%). Roads: 2 of 12 (17%).
  - Loss reasons: price 13, technical score 5, local content 3, PQ 1, other 2.
- **DG1, last 90 days:** 46 decisions (15 Pursue, 29 Discard, 2 Hold).
  - On time: 44 of 46 (96%).
  - Overrides: 4; top reason "client relationship".
  - Discard reasons: out of scope 11, below value band 6, PQ fail 5, insufficient time 4, capacity 3.
- **DG2, last 12 months:** 18 decisions, 17 on time; 1 where the chair differed from the majority; 2 re-opened (JV offer, competitor withdrew).
  - **Corrected 2026-09-25** ([dashboards.md](dashboards.md) §12.3): 18 is too few for 38 submissions a year. Plan 004 seeds 18; **plan 017 replaces it with 54 (40 bid, 14 no-bid), 51 on time, 2 approvals against the majority, 2 re-opened**, and adds DG3, submissions, stage logs and the Stage 4–9 register.
- **Calibration** (OUT-4): n = 33 is enough to show bands. Won ÷ bids per predicted band:
  - > 70%: 2 of 3;
  - 50–70%: 4 of 7;
  - 30–50%: 3 of 10;
  - < 30%: **0 of 13**.

  Every band is within ±10 points of its average prediction except < 30%, which is **over-confident**. That gives the Head of Tendering an honest "the model is not perfect" line.

### 5.2 Registers for B–E (smaller; enough that desks aren't empty)
| Tenant | S1 | S2 | S3 / DG2 | History (12 months) |
| --- | --- | --- | --- | --- |
| Corniche (B) | Hero (captured from Etimad, KSA watch); Abu Dhabi hospital MEP package; Dubai hotel fit-out (low fit) | Dubai district cooling plant, 30,000 TR (RFQs out) | Sharjah university MEP (pack in preparation) | 22 bids, 6 won (27%) |
| Dafna (C) | Hero (captured from Etimad via the Riyadh branch); Lusail utility corridor (fictional employer); a Doha pump station | Al Wakra sewer rehabilitation (fictional employer) | none | 18 bids, 5 won (28%) |
| Batinah (D) | Hero (by email from a partner); **scanned Arabic roads tender** (real, §9); **Lebanon roads tender** (real, §9); Sohar–Buraimi road dualling (fictional) | Muscat interchange upgrade | none | 25 bids, 8 won (32%) |
| Qurain (E) | Hero (Etimad via the KSA subsidiary); **Kuwait ccTLD Arabic IT tender** (real, §9: out of sector, low fit); Wadi Zarqa PQ (real, multi-country) | Two large Kuwait bids in S2 (they drive the 118% load) | Kuwait STP rehabilitation at DG2 (not scripted) | 30 bids, 8 won (27%) |

### 5.3 KPI target readings on demo day, tenant A (preset "DG1 due")
The derived values should land here (catalogue §A IDs):

| Group | Target readings |
| --- | --- |
| Intake | **INT-1 New today 11** (Etimad 7, portals 1, email 2, scanned 1) · **INT-2 p90 11 min** (worst 14 min) · **INT-3 Missed 0** (reconciled 06:00, 9 sources) · **INT-4 8 of 9 healthy** (Etimad credentials expire Fri 13 Mar) · **INT-5 Fields to check 6** (2 block DG1; oldest 2 h 16 m) · **INT-10 Documents to buy 1** (T-2026-122 booklet, SAR 3,000, closes Tue 10 Mar) |
| Screening | **SCR-1 DG1 due 2** (first in 6 h 10 m) · **SCR-5 Eligibility risks 3** · **SCR-6 Credentials expiring 2** (Zakat 30 Apr, GOSI 7 May; both before T-2026-118 opens 10 May) · **SCR-7 Queries closing 1** (T-2026-118 questions close Wed 18 Mar) |
| Sourcing | **SRC-1** trailing 100% · **SRC-2** 7 of 11 on T-2026-104 · **SRC-3** 71% · **SRC-4** 4 overdue (2 escalated) · **SRC-5** 6 open, 0 stale · **SRC-6** 5 to level |
| Decision | **DEC-1** 1 pack (SLA 4 h 10 m; 2 of 5 positions, quorum 3) · **DEC-4** SAR 206 M weighted (0.58 × 355) · **DEC-6** SAR 96 M headroom · **DEC-7** 2 outstanding, 1 late · **DEC-8** 1 stale |
| Outcomes | **OUT-1** 27% (n = 33) |
| Capacity | **CAP-1** Water team 78% now, 96% with the hero tender |

---

## 6. Suppliers (fictional; tenant A's master, used by the Stage 2 lane)

- **Master size:** 48 suppliers. 41 are screened and current, 5 have screening due, and 2 are blocked:
  - **Tarvessa Trading FZE**: sanctions match;
  - one supplier with an anti-bribery flag.
- **Examples per package** (the Stage 2 plan expands these):

| Package | Suppliers (fictional) | Notable for levelling |
| --- | --- | --- |
| P-01 Piling, dewatering | Rasikh Foundations Co. (KSA) · Taweel Geotechnical | Screening due on one |
| P-02 Process mechanical | Rhein Aqua Systems GmbH (DE) · Gulf Process Systems Co. (KSA, high LC) · Hanseong Water Machinery (KR) | EUR quote, **ex-works**; validity 60 days vs 120 required; lead time 34 weeks vs 28 needed |
| P-03 Tertiary filters and UV | Nordklar Filtration AB (SE) · Sahara Clearwater Technologies (UAE) | Excludes installation supervision → allowance, "estimated" |
| P-04 Sludge dewatering | Castellan Separators Srl (IT) · Gulf Process Systems Co. | 30% advance requested |
| P-06 Substation and transformers | Hijaz Power Equipment Co. (KSA) · Levant Switchgear SAL | Quote **inclusive of 15% VAT** → shown excluding VAT |
| P-08 ICA and SCADA | Qimma Automation (KSA) | Only one compliant quote → gap to accept or chase |
| P-10 GRP pipes (mandatory list) | Tuwaiq Pipe Industries (KSA) · Eastern Composite Pipes Co. (KSA) | National product; LC contribution |
| P-11 Pumps | Aldervane Pumps · Dunmore Hydraulics | Deviation on material grade → non-compliant |

- **Supplier Portal persona:** Ahmed Saleh, estimator at Gulf Process Systems Co. (P-02 RFQ for T-2026-118, once RFQs are sent).

## 7. Competitors (fictional; Stage 3 lane)

For the hero tender and T-2026-097. Every claim needs a source in the demo data (spec §9.2):
- **Hijr Al-Watan Contracting** (KSA): large water EPC; 3 STP awards 2023–25. Source: award notices (synthetic).
- **Sahab Gulf Water Technologies** (KSA/UAE): process specialist; usually bids in a JV.
- **Al-Masar United Contracting** (KSA): aggressive on price; lowest bidder in 4 of its last 7 tenders. Source: opening reports (synthetic).
- **Tihama Hydro Works Co.** (KSA): also tenant C's partner. In the market, contractors are both partners and rivals.
- **Istria Aqua Engineering** (foreign EPC): enters through local JVs.

## 8. Bid Committee per tenant

Seats as in spec §10, filled from the §2.7 people:
- approver: the Head of Tendering (since 2026-09-25; dashboards.md §9);
- voting members: the CEO (`exec`, seat `ceo`), CFO, Technical Director, Operations Director, Sector Head;
- members CFO, Technical Director, Operations Director, Sector Head;
- presenter: the Bid Manager;
- secretary: the Head of Tendering, who also approves.

Quorum: 3 of 5 positions. For T-2026-097 in tenant A, the positions are seeded:
- **CFO:** Support with conditions: "Keep the bid bond within the facility; minimum margin 9%".
- **Technical Director:** Support.
- **Operations Director** and **Sector Head:** not yet recorded.

---

## 9. Real sample documents (Stage 1 variety and the Arabic bonus)

Extraction drafts live **locally** in `docs/08-sample-tenders/middle-east/extraction-drafts/` (gitignored). Plans copy the record into `app/src/data/extracted/` when used.

| Document | Language | Use | Tenant | Draft |
| --- | --- | --- | --- | --- |
| Wadi Zarqa WWTP Phase I DBO, prequalification (Water Authority of Jordan, public) | English | Intake variety; a PQ-stage document (no RFQs); geography outside the GCC | A (and E) | Done |
| CDR Lebanon: Rehabilitation of Remaining Roads, Lot 3 Jezzine Entrance (World Bank, public) | English | Roads-tenant intake; blank deadline flagged; small value | D | Done |
| Kuwait CITRA public tender 6-2024/2025, .kw ccTLD registry (public viewing copy) | **Arabic** (technical spec in English) | Arabic intake; "out of sector, low fit" (M-3 in Arabic); no dates printed → "Not stated" | E | Done |
| Scanned Arabic road-works tender, south Lebanon (41 pp scan) | **Arabic, scanned** | Script E: OCR → bilingual fields → lower confidence with reasons | D | **Incomplete**: the extraction stopped on the rate limit; re-run it (plan 004 note) |
| One private-sector RFP in the local samples (the file marked CONFIDENTIAL in extraction-drafts) | English | **Excluded.** The document binds recipients to confidentiality. Never put it in the public repo or the demo | none | Draft kept locally only |

All real documents are past-dated. They reach DG1 only through **"Treat as newly published"** (spec §16), which is labelled, with the original dates kept in the Documents tab.

**Checked 2026-09-25:** none of the samples the client supplied is a live GCC construction tender in English. The GCC items are the Kuwait IT tender and the Saudi model booklet (both Arabic; the booklet is a blank template) and the excluded private RFP. So the hero stays synthetic, built on the Saudi model booklet. The three public documents above are copied into `app/public/bids/me/` (approved by the user on 2026-09-25: public tenders supplied by the client).

---

## 10. Sources and verification

### 10.1 Verified in this pass [V]
- **Saudi Ministry of Finance standard tender booklet, general construction works** (the Arabic model booklet, as amended to mid-2026). Local file: `docs/08-sample-tenders/middle-east/نموذج كراسة الشروط والمواصفات (إنشاءات عامة).docx`. It covers:
  - certificates valid at opening (§6);
  - questions and answers (§33);
  - language (§27);
  - currency (§28);
  - validity (§29);
  - taxes wording (§39);
  - guarantees (§40–41, §57);
  - two files (§45);
  - opening (§49);
  - LC scoring (§51);
  - cure period (§53);
  - standstill (§55);
  - penalties (§60, §62);
  - subcontracting (§23);
  - consortium (§22);
  - abnormally low (§19).
- **Saudi GTPL Implementing Regulations** (English translation):
  - Art. 34: minimum submission periods, including ≥ 60 days at ≥ SAR 100 M;
  - advance payment up to 10% with a guarantee;
  - Art. 111: final-invoice deductions (up to 10% per invoice; the final invoice ≥ 10% for general construction).
- **Saudi Contractor Classification Law**, Royal Decree M/9, 2021:
  - Art. 9: classification of consortium members;
  - Arts. 5–8: grades and fields.

### 10.2 Well-established [L]
- VAT rates;
- weekends and time zones;
- currency pegs;
- Etimad, Monaqasat, CAPT;
- expected Ramadan and Eid dates for 2026.

### 10.3 Assumptions to verify before a client meeting [A]
The research agent was rate-limited. Re-run it, or ask Catalyst's GCC contacts:
1. The exact UAE federal and emirate portal names; Oman's current e-tendering portal name.
2. Public-sector Eid al-Fitr 2026 closure dates per country; Ramadan working hours.
3. The Zakat certificate validity pattern, and how long a GOSI certificate is valid.
4. Physical delivery of the original initial guarantee alongside electronic submission on Etimad.
5. Contractor classification grade names for UAE, Qatar, Oman and Kuwait.
6. KWD bid rate (0.3070 per USD).
7. Common GCC titles for the tendering head, to confirm "Head of Tendering" (spec §3).
8. Cloud residency options per country.
