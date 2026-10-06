# 043 — Real-names audit

Status: DONE — awaiting review (2026-10-06) · Depends on: none · Can run in parallel with: 039, 040, 041, 042, 044

## Goal
No real person and no real private company appears anywhere in the demo, so the public repo and the deployed demo can be shown to any prospect without risk. Real **public bodies and portals** stay, because they make the demo believable to GCC buyers.

## Context
- User's change list of 2026-10-06, item 1: "Check all names mentioned in the data. Ensure that the names are not real/actual individuals or organizations. Use dummy/non-real names wherever required." Read `app/plans/README.md` → "Wave 12".
- User decision (2026-10-06): **keep** real government bodies, ministries, regulators, municipalities, public utilities acting as tendering authorities, and public portals (e.g. Etimad, Monaqasat, ZATCA, GOSI, CDR Lebanon, Water Authority of Jordan, CITRA Kuwait). **Replace** every person, and every private company (contractors, suppliers, subcontractors, JV partners, banks and insurers, consultants, competitors) that is real or close enough to a real one to be mistaken for it.
- Earlier work (commit-policy memory, 2026-09-26): real officials' names in the real-document records were already replaced with role titles, and supplier names close to real firms were renamed. This plan is the full sweep.
- The repo is public (CLAUDE.md, "Confidentiality"). The confidential client's staff names must never appear.

## Scope
- Files to change: name strings in `src/data/**` and `src/data/extracted/**`, **except** `src/data/gcc/lifecycle/**`, `src/data/gcc/portfolio.ts` (plan 039) and `src/data/gcc/reissued.ts` (plan 042). Also `docs/07-product-design/agr-product-definition/gcc-demo-data.md`, where it lists the same names.
- Name strings in `src/domain/**` or `src/pages/**`: list them in the report, don't edit them (other lanes own those files). The orchestrator fixes them.
- **Ask before** touching `scripts/**` or the generated PDFs in `public/bids/gcc/` (a name baked into a PDF needs a rebuild).
- Out of scope: the real client-supplied PDFs in `public/bids/me/` and `public/bids/*.pdf` (they are the documents as published); ids (`najd.hot`, `T-2026-118`) never change; person ids and tenant keys stay.
- The Indian preview tenant (`gen-in`) is in scope **only** for names that are real; change nothing else there.

## Steps
### Phase 1 — Inventory
- [x] 1.1 List every proper name in scope: people (personas, committee members, contacts, supplier contacts, signatories, letter writers), companies (tenants, suppliers in `data/gcc/s2/**` including the generated profiles and `profiles/names.ts`, partners in `data/gcc/partners.ts`, competitors, banks, insurers, consultants), and clients or issuers. Save the inventory in the scratchpad, not the repo.
- [x] 1.2 Classify each one:
  - **public body or portal**: keep;
  - **fictional and safe**: keep;
  - **real or too close**: replace.
- [x] 1.3 Check every company name with a web search: an exact or near match to a real GCC, Indian or international firm is "too close". Also check the five tenant names and every bank. People: a full name that matches a well-known real person (a minister, CEO, official or public figure), or an identifiable official taken from a real document, is "too close". A common Arabic or Indian first name and surname that matches no one notable is fine. List what you checked and found.

### Phase 2 — Replace
- [x] 2.1 Replacements are plausible for the country and sector, distinct from each other, and not themselves real (web-search each new company name before adopting it). Keep initials-based avatars working (`initialsOf`).
- [x] 2.2 Replace every occurrence of a name consistently (the persona menu, letters, audit lines, generated supplier profiles, extracted records, docs). Grep the whole repo for each old name afterwards; the only allowed leftover is in a file another lane owns, and you list it.
- [x] 2.3 Generated names (`profiles/names.ts` and the generators): change the word lists so no generated combination is a real firm. Don't change the generator's random stream beyond the names themselves, so the other numbers don't move.

### Phase 3 — Checks
- [x] 3.1 Dev check `20-people.tsx` and the seed and supplier checks still pass (update the pins that names move, and list them).
- [x] 3.2 Click through Najd as the Head of Tendering, Bid Manager and Procurement Lead, and Corniche as the Head of Tendering, on port 5195: the persona menu, a tender workspace, the Sourcing supplier lists, a supplier profile, Company › Credentials and Company › Bid record show the new names, with no console errors.

## Data and derivation
- Names are facts in `src/data/**`; screens read them. No new `done` keys.
- If renaming moves a person's sort order or initials, check the screens still read cleanly.

## Demo-grade rules
- Only names change. No layout, logic or number changes.
- Non-negotiables: the same person or company has the same name on every screen; Reset works.

## Acceptance checks
- [x] typecheck and build pass.
- [x] The report has the full table: old name → new name → why (real firm / real person / too close), with the web-search evidence in a few words.
- [x] A grep for every replaced name finds nothing in `src/` or `docs/07-product-design/` (except the listed files other lanes own).
- [x] `/dev/checks`: no new failing row.
- [x] No console errors; Reset demo returns to the seed state.

## Execution report
(Executor, 2026-10-06.)

### Changed files
- **Data:**
  - `data/people.ts`, `data/tenants.ts`, `data/tenders.ts`, `data/catalog.ts`, `data/workspace.ts`;
  - `data/gcc/partners.ts`, `data/gcc/tenants/{najd,corniche,dafna}.ts`, `data/gcc/s1/personnel.ts`;
  - `data/gcc/s2/suppliers/{najd,corniche,dafna,batinah,qurain}.ts`, `data/gcc/s2/tenders/najd.ts`, `data/gcc/s2/profiles/{names,generate}.ts`;
  - `data/gcc/s3/{competitors,inputs}.ts`, `data/gcc/debriefs/{rivals,examples,templates}.ts`.
- **Extracted records:** `data/extracted/nit.ts`, `data/extracted/rfp-rangpo.ts`, `data/extracted/gcc/cdr-jezzine.ts`, `data/extracted/gcc/wadi-zarqa.ts`.
- **Dev-check pins moved by the names:**
  - `pages/gcc/dev-checks/70-stage1.tsx`, `80-stage2.tsx` and `90-stage3.tsx`.
  - Check 20-people pins no names.
- **Docs:**
  - `agr-product-definition/gcc-demo-data.md`.
  - `demo-runbook.md` (no lane owns it).
  - `dashboards.md` §1, line 50 (outside 039's §2 and §12).

### Old → new, and why
The evidence comes from web searches. Once the search budget ran out, I used Wikipedia, Wikidata, GLEIF and domain look-ups. Every new name was searched before it was adopted.

| Old | New | Why |
| --- | --- | --- |
| Najd Arcline Contracting Co. | Najd Arvelle Contracting Co. | Real firm: Arcline, MEP and construction, Al-Khobar |
| Corniche Lattice MEP LLC | Corniche Lumvale MEP LLC | Too close: Lattice Group, a UAE EPC and MEP contractor |
| Dafna Keystone Civil W.L.L. | Dafna Kerrowstone Civil W.L.L. | Too close: Keystone Construction Co. WLL, Doha |
| Genesis Infra Gulf JV; Genesis Infra and Al Noor Contracting JV LLC | Genesis EPC Gulf JV; Genesis EPC and Al Ramlaan Contracting JV LLC | Real firms: Genesis Infra (India); Al Noor contractors (Abu Dhabi) |
| The old Genesis mail and web domains (.in, .com) | genesis-epc.example, genesis-gulf.example, rfp@genesis-epc.example | genesis-infra.com is a live firm's domain; genesisgulf.com is a real Kuwaiti firm's |
| CIN …PLC191230 | …PLC000000 | A valid-format registry number; the zero serial is plainly made up |
| Al-Masar United Contracting ("Al-Masar") | Al-Thamad United Contracting ("Al-Thamad") | Real firm: Masar United Contracting, Riyadh |
| Tihama Hydro Works Co. ("Tihama Hydro", "Tihama") | Qunfudhah Hydro Works Co. ("Qunfudhah Hydro") | Too close: Tihama Contracting and Tuhama water contractors |
| Sarab Building Services Co. ("Sarab") | Maswaan Building Services Co. ("Maswaan") | Too close: Sarab Contracting (Riyadh, Bahrain) |
| Liwa Highways Contracting LLC | Dhank Highways Contracting LLC | Too close: Liwa Contracting (UAE), North Liwa Contracting (Oman) |
| Rafid Process Engineering ("Rafid") | Thawban Process Engineering ("Thawban") | Real firm: Rafid Group, Al-Khobar, engineering and EPC |
| Desert Rose Developments | Saltreed Developments | Too close: Dubai's "Desert Rose" city project |
| Palm Crescent Properties | Coralwick Properties | Too close: The Crescent, Palm Jumeirah |
| Harbour Gate Real Estate | Berthwick Real Estate | Too close: Emaar's Harbour Gate |
| Emirates Cooling Utilities Company | Chillmont Cooling Utilities Company | Too close: Emicool (Emirates District Cooling) |
| Saltmarsh General Insurance | Fenmoor General Insurance | Real firm: Saltmarsh Insurance Agency (US) |
| Meridian Management Systems | Torvalen Management Systems | Very common name, and it repeated "Qurain Meridian" |
| Hanseong Water Machinery | Bongnim Water Machinery | Real: Hanseong MS (pumps), Hanseong Machinery |
| Pumpenwerk Saale GmbH | Pumpenwerk Unstrut GmbH | Real: Pumpenwerke Halle/Saale (KSB) |
| Setouchi Refrigeration Co. | Ushimado Refrigeration Co. | Real: a refrigeration firm of that name in Okayama |
| Arctis Chiller Technik GmbH | Kaltenau Chiller Technik GmbH | Too close: NOVAER ARCTIS HVAC units |
| Castellan Separators Srl | Valbrembo Separators Srl | Too close: Castellan hydraulics and pump-service firms |
| Kestrelwind Lufttechnik GmbH | Falkenwind Lufttechnik GmbH | Too close: Kestrel Wind Turbines ("kestrelwind") |
| Ventalba Ventilation S.L. | Ventorria Ventilation S.L. | Too close: Ventalba Costruzioni (Italy) |
| Sohar Asphalt Mixing LLC | Saham Asphalt Mixing LLC | Real: Sohar Asphalt LLC |
| Hijaz Power Equipment Co. | Hada Power Equipment Co. | Too close: Hijaz Power Co. Ltd |
| Nuwaiseeb Electrical Works Co. | Fintas Electrical Works Co. | Too close: Al Nuwaiseeb International (electrical parts) |
| Reem Power Systems LLC | Saadiyat Power Systems LLC | Too close: Reem Group, Abu Dhabi (switchgear, MEP) |
| Qimma Automation | Dhurwa Automation | Too close: Qimma Technologies (automation) |
| Nizwa Quarry and Asphalt LLC | Izki Quarry and Asphalt LLC | Too close: Nizwa Crushing LLC |
| Barka Precast Concrete LLC | Suwaiq Precast Concrete LLC | Borderline: Barka Cement Products Factory |
| Tuwaiq Pipe Industries | Thadiq Pipe Industries | Borderline: Tuwaiq Casting & Forging |
| Wafra Precast Segments Co. | Sabriya Precast Segments Co. | Wafra is a well-known Kuwaiti investment brand, the same reason wave 11 dropped it |
| Bharat Heavy Electricals (BHEL) | Narmada Heavy Electricals (NHEL) | Real (state-owned, but shown as a supplier) |
| Toshiba T&D India; Crompton Greaves; KEC International; Sterlite Power; L&T Construction; Tata Projects; Apar Industries; Sungrow India; Hitachi Energy India; Kirloskar Brothers | Sahyadri T&D Systems India; Kanchan Gridtech; Vindhya Transmission International; Konkan Gridlines; Ambarlok Constructions; Sindhurekha Projects; Anvaya Conductors; Bhanuvarta Solar India; Nilgiri Grid Systems India; Kshitij Pumps | All real Indian firms |
| Delta Green Energy | Anantam Energy Systems | Too close: Delta Electronics India makes solar inverters; the domain is registered |
| Jamnagar Petro; Petronet East; JSW Dolvi (clients) | Kutch Coast Refinery; Purvatat LNG Terminal; Mahisagar Steel Works | They point to the Jamnagar refineries, Petronet LNG and JSW Steel Dolvi |
| Saad Al-Shehri | Sami Al-Suhaimi | Shares the name of a public figure |
| Mohammed Al-Ghamdi | Mazen Al-Ghufaili | Shares the name of a public figure |
| Hamad Al Mazrouei | Humaid Al Matrooshi | Shares the name of a public figure |
| Priya Raman | Preeti Raghunath | Shares the name of a public figure |
| Kiran Patel | Kiran Pandya | Shares the name of a public figure |
| Fatima Al Nuaimi | Fatima Al Naqbi | Shares the name of a public figure |
| Suresh Babu | Sudhir Balan | Shares the name of a public figure |
| Jassim Al-Sulaiti | Jaber Al-Shahwani | Shares the name of a public figure |
| Ahmed Fathy | Ayman Fikry | Shares the name of a public figure |
| Ravi Shankar | Rakesh Sundaram | Shares the name of a public figure |
| Peter Grant | Philip Garside | Shares the name of a public figure |
| Bader Al-Mutawa (and the email b.almutawa@) | Basel Al-Mudhaf (b.almudhaf@) | Shares the name of a public figure |
| Sanjay Verma | Sandeep Vohra | Shares the name of a public figure |
| Fahad Al-Enezi | Fawaz Al-Eidan | Shares the name of a public figure |
| Dr Samir Nassar (key-staff CV) | Dr Samer Najjar | Shares the name of a public figure |
| Fahd Al-Rashid (CV) | Fahd Al-Rumaih | Shares the name of a public figure |
| Vikram Nair (CV) | Vineet Nambiar | Shares the name of a public figure |
| Ravi Menon (CV) | Ranjit Madhavan | Shares the name of a public figure |
| Ibrahim Al-Shahrani (CV) | Ibrahim Al-Sufyani | Shares the name of a public figure |
| Ahmed Saleh (supplier persona) | Amjad Salameh | Shares the name of a public figure |
| K. C. Bhatt; Shri Subhash Chandra; Mr. Sandeep Gupta (`nit.ts`, `rfp-rangpo.ts`) | Role titles: Deputy General Manager (Technical); Independent External Monitor; General Manager (Technical) | Identifiable officials from real documents; a personal email, mobile number and home address were removed too |
| Associated Consulting Engineers (`cdr-jezzine.ts`) | "Consulting engineers named on the cover" | A real private consultant |
| As Samra Project Company (`wadi-zarqa.ts`) | "the As Samra plant’s BOT operating company" | A real private concession company |

**Generated supplier contacts:**
- **Matches:** 42 drawn combinations match the names of well-known public figures.
- **Swap:** each is swapped for a searched fictional name by `NOT_REAL` / `fictionalName` in `profiles/names.ts`, for example Saeed Al-Ghamdi → Saeed Al-Fuhaid and Marta Ortega → Marta Valdés.

**Checked and kept:**
- **Companies:**
  - the tenants Batinah Waypoint and Qurain Meridian;
  - competitors Hijr Al-Watan, Sahab, Istria, Tessaline, Brevanne, Shinas, Mahda, Pellstone, Karstel, Trevannon, Ostrel, Brennock, Kelvane and Shamal Crest;
  - clients Gulfshore, Quellmar, Crescent Bay Health and the "Cities Water Services" utilities;
  - the other insurers and ISO bodies;
  - 89 of the 97 GCC suppliers and 35 of the 42 foreign ones.
- **People:**
  - 86 of the 106 personas and CV names;
  - Tarek Haddad, Nasser Al-Kuwari and Deepak Sharma have semi-known namesakes, but the names are common.
- **Indian public bodies:** NTPC, PowerGrid, GIDC, Maha Jeevan, Kerala SEB, TN Transco, TN Water Board, CORE, AAI and Karnataka WSSB.
- **References in the real documents:**
  - Marriott Hotel and Al Hamra Tower (address landmarks);
  - Kuwait Airways (in a law clause);
  - AWS, RedHat and WHMCS (named in CITRA's requirements);
  - Entra, Okta and Google Workspace (SSO products).

### Verification
- **Typecheck and build:** `npx tsc --noEmit -p .` is clean after each batch. `npm run build` passes, with only the existing chunk-size warning. The orchestrator's fix of my wadi-zarqa apostrophe slip is kept.
- **Generator stream unchanged:**
  - I dumped all 143 supplier profiles from the current tree and from a scratch copy with my renames reverted. After mapping the names back, 0 fields differ.
  - The swap is applied after de-duplication, on the name that is kept.
  - "Fahad Al-Enezi" maps to the CEO's new name, so a draw of it is still refused, as it was when it was a persona's name.
- **`/dev/checks`, all five tenants:**
  - Najd 1016 pass, Corniche 611, Dafna 592, Batinah 600, Qurain 615. No row fails because of a name.
  - The only failures are 034's "Value won 0.9–1.3× turnover" (every tenant) and 009a's "097 · Base: water hit rate" with its "agrees" row (Najd). Both are lifecycle numbers from 039's work in progress; the profile diff shows I move no numbers.
- **Clicked through on port 5195 at 1440, with no console errors:**
  - **Najd, Head of Tendering:** the persona menu, the dashboard, Company › Credentials and Company › Bid record.
  - **Najd, Bid Manager:** the T-2026-097 workspace.
  - **Najd, Procurement Lead:** Suppliers; Packages & RFQs; `/suppliers/hijaz-power`, which now reads "Hada Power Equipment Co."; Nordklar's contacts, which show the swapped names.
  - **Corniche, Head of Tendering:** the persona menu shows Humaid Al Matrooshi.
  - **Qurain:** the Reset demo dialog.
  - There are no new `done` keys.
- **Search limits:** both web-search tools hit their limits partway through the audit. A Google pass on the new names before a client meeting would add confidence.
- **Dev server:** it ran with its own cache directory, because the shared `node_modules/.vite` was serving two copies of React to my server.

### Deviations from plan
- **Generated contacts:** I swap the 42 matching drawn combinations instead of changing the pools' words. A pool change would rename many safe contacts and could not rule out every famous pair. The 42 real names therefore remain in `names.ts`, as keys of the swap map, but are never shown.
- **Extra docs:** I also edited `demo-runbook.md` and `dashboards.md` §1.
- **Extra renames:** I renamed the borderline Meridian Management Systems and Wafra Precast Segments.

### Blockers / questions
None. The generated PDFs carry only the fictional ECWS, CBHH and ILRA issuers, so nothing needs a rebuild.

### Follow-ups noticed (not done)
- **Must do together (039's files).** Until then, Corniche shows both the old and the new names of two clients.
  - `data/gcc/lifecycle/pools.ts` lines 80–81: Desert Rose Developments → Saltreed Developments, Palm Crescent Properties → Coralwick Properties, Harbour Gate Real Estate → Berthwick Real Estate, Emirates Cooling Utilities Company → Chillmont Cooling Utilities Company.
  - `data/gcc/lifecycle/live/corniche.ts` lines 67, 74 and 121: the same renames.
  - `data/gcc/lifecycle/live/dafna.ts` line 21: in a comment, Tihama → Qunfudhah.
  - `dashboards.md` §12, line 972: Mohammed Al-Ghamdi → Mazen Al-Ghufaili.
  - `dashboards.md` §12, line 1070: Ahmed Fathy → Ayman Fikry.
- **To list, not edit (the plan's rule for pages and domain):**
  - `domain/gcc/dg2/letter.ts` line 36: in a comment, Najd Arcline → Najd Arvelle.
  - `pages/roles/Proc.tsx` line 60: Crompton Greaves → Kanchan Gridtech.
  - `pages/gcc/dev/fixtures.ts` line 319: Mohammed Al-Ghamdi → Mazen Al-Ghufaili.
  - `components/overlays/FlowModals.tsx` line 108: the placeholder "Genesis Infra Saudi LLC" → "Genesis EPC Saudi LLC".
  - `data/gcc/contacts.ts` (044): `genesis-infra-gulf.example` → `genesis-gulf.example`.
- **For a decision:** `docs/07-product-design/agr-design/` and `client-provided/dashboard-wireframe/` still carry the original Indian firm names, "Genesis Infra" and the old domains. They are design archives and client material, so I left them.
- **From before this plan:** a generated Najd supplier contact "Hany Farouk" duplicates the persona "Dr Hany Farouk". The `used` check misses the "Dr" prefix.
