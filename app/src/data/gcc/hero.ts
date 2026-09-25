import type { ExtractField } from '../extracted/types';
import type {
  BoqBill, BoqLine, BoqPackage, ExtractedTenderGcc, FitInput, Criterion, GccTender, KeyDate, Money, PqRequirement, ValidationItem,
} from './types';

/**
 * The hero tender (gcc-demo-data §4): one synthetic Saudi tender that all five
 * GCC tenants capture, and that gives five different answers. Page numbers
 * follow the booklet page map in gcc-demo-data §4.9, which plan 005 prints to
 * `public/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf`.
 *
 * The issuer, ECWS, is fictional. The rules it quotes (GTPL, the Ministry of
 * Finance model booklet, the Classification Law) are real.
 */

export const HERO_ID = 'T-2026-118';
export const HERO_DOC_KEY = 'ecws-al-rawdah';
export const HERO_FILE = '/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf';
export const HERO_FILE_NAME = 'ECWS-PRJ-2026-0147-booklet.pdf';
export const HERO_REF = 'ECWS/PRJ/2026/0147';
export const HERO_TITLE =
  'Expansion of Al-Rawdah Sewage Treatment Plant, Phase 2 (+150,000 m³/day), with tertiary treatment and a TSE transmission pipeline';
export const HERO_SHORT = 'Al-Rawdah STP Phase 2';
export const HERO_ISSUER = 'Eastern Cities Water Services Company (ECWS)';

/** Not published by the issuer. The platform's estimate, always labelled as one. */
export const HERO_ESTIMATE: Money & { band: [number, number] } = { amount: 480_000_000, ccy: 'SAR', band: [420_000_000, 540_000_000] };
export const HERO_ESTIMATE_BASIS =
  'Estimate, not published by ECWS: BOQ quantities (Vol. 2, 11 bills) priced at benchmark rates. The booklet gives quantities only.';
export const HERO_BOOKLET_FEE: Money = { amount: 5_000, ccy: 'SAR' };

// ---------------------------------------------------------------------------
// Key dates (§4.2). Everything else about time derives from these.

export const HERO_KEY_DATES: KeyDate[] = [
  { kind: 'published', date: '2026-03-08', time: '07:15', page: 4, note: 'Time from the Etimad listing; the booklet gives the date' },
  { kind: 'participation', date: '2026-03-12', page: 4, note: 'Participation confirmation letter' },
  { kind: 'site-visit', date: '2026-03-17', time: '10:00', place: 'Al-Rawdah STP, plant gate', page: 4, note: 'Encouraged, not mandatory (§34)' },
  { kind: 'questions', date: '2026-03-18', page: 4, note: '10 days after publication (§33)' },
  { kind: 'answers', date: '2026-03-25', page: 10, note: '"Within seven (7) days from that date" (§33): the booklet does not say which date' },
  { kind: 'submission', date: '2026-05-10', time: '10:00', page: 4, note: 'Electronic submission, two files' },
  { kind: 'originals', date: '2026-05-10', time: '10:00', page: 12, note: 'Original initial guarantee delivered to the §8 address (p. 4) before the deadline; a copy goes in the financial file (§41)' },
  { kind: 'opening', date: '2026-05-10', time: '10:30', page: 4, note: 'Technical files only; bidder names announced (§49)' },
  { kind: 'validity-end', date: '2026-08-08', page: 10, note: '90 days from opening (§29)' },
  { kind: 'bond-validity-end', date: '2026-08-08', page: 12, note: 'Initial guarantee valid at least 90 days from opening (§41)' },
];

// ---------------------------------------------------------------------------
// Eligibility requirements (§4.5). Certificates must be valid at bid opening,
// for the bidder and every listed subcontractor (§6), with at most 10 working
// days to cure a missing or expired one (§53).

export const HERO_REQUIREMENTS: PqRequirement[] = [
  { id: 'PQ-01', kind: 'cr', page: 4, validAt: 'opening', country: 'SA', threshold: { field: 'Water & sewage works' },
    text: 'Saudi Commercial Registration covering water and sewage works' },
  { id: 'PQ-02', kind: 'zakat', page: 4, validAt: 'opening', country: 'SA',
    text: 'Zakat and/or tax certificate, valid at bid opening' },
  { id: 'PQ-03', kind: 'gosi', page: 4, validAt: 'opening', country: 'SA',
    text: 'GOSI (social insurance) certificate, valid at bid opening' },
  { id: 'PQ-04', kind: 'chamber', page: 4, validAt: 'opening', country: 'SA',
    text: 'Chamber of Commerce membership' },
  { id: 'PQ-05', kind: 'classification', page: 4, alsoOn: [38], validAt: 'opening', country: 'SA', threshold: { field: 'Water & sewage works', grade: 1 },
    text: 'Contractor classification: Water and Sewage Works, Grade 1',
    jvRule: 'Classification Law Art. 9: all members in field; one at grade; others ≤ 1 grade lower' },
  { id: 'PQ-06', kind: 'contractors-authority', page: 4, validAt: 'opening', country: 'SA',
    text: 'Saudi Contractors Authority membership' },
  { id: 'PQ-07', kind: 'saudization', page: 4, validAt: 'opening', country: 'SA',
    text: 'Certificate of the required localisation ratio (Saudization)' },
  { id: 'PQ-08', kind: 'vat', page: 38, validAt: 'opening', country: 'SA',
    text: 'Tax registration with the Zakat, Tax and Customs Authority, with the tax registration number stated in the bid',
    note: 'The booklet says "tax registration"; for a contractor this is the VAT registration' },
  { id: 'PQ-09', kind: 'experience', page: 38, threshold: { count: 2, value: 100_000, unit: 'm3/day', years: 10 },
    text: 'At least two (2) completed sewage treatment plants, each of 100,000 m3/day or more, in the last 10 years',
    note: 'Completed since 10 May 2016; at least one with tertiary treatment; as prime contractor or consortium lead' },
  { id: 'PQ-10', kind: 'om', page: 38, threshold: { years: 3, value: 50_000, unit: 'm3/day' },
    text: 'At least 3 years of operation and maintenance of a sewage treatment plant of 50,000 m3/day or more',
    note: 'Or a named O&M subcontractor that meets it' },
  { id: 'PQ-11', kind: 'turnover', page: 39, threshold: { value: 1_200_000_000, unit: 'SAR', years: 3 },
    text: 'Average annual turnover over the last three (3) financial years of at least SAR 1,200,000,000, from audited accounts',
    jvRule: 'lead ≥ 60% of threshold; members combined ≥ 100%',
    note: 'The booklet does not say which three financial years count' },
  { id: 'PQ-12', kind: 'ratios', page: 39, threshold: { value: 1.1, unit: 'current ratio' },
    text: 'Positive net worth and a current ratio of at least 1.1 in the latest audited accounts' },
  { id: 'PQ-13', kind: 'personnel', page: 40, threshold: { count: 4 },
    text: 'Key personnel: Project Manager (20 years, 10 in water and wastewater), Process Design Lead (15), Saudi national HSE Manager (10), Commissioning Manager (12)' },
  { id: 'PQ-14', kind: 'iso', page: 40, validAt: 'opening',
    text: 'ISO 9001, ISO 14001 and ISO 45001 certificates',
    note: 'Printed as "ISO 90001": likely ISO 9001' },
  { id: 'PQ-15', kind: 'lc', page: 33, alsoOn: [41], threshold: { value: 40, unit: '%' },
    text: 'Local content: a target LC% commitment, and a local content baseline certificate of at least 40%' },
  { id: 'PQ-16', kind: 'consortium', page: 7,
    text: 'Consortium agreement certified by the Chamber of Commerce or a notary before submission; named lead; joint and several liability; no member bids alone or in another consortium' },
];

// ---------------------------------------------------------------------------
// The two fields that block DG1 (§4.6 flaws 1 and 7). The agent shows both
// values with their pages and does not choose (spec §6.3 conflict pattern).

/** The hero conflicts as raised in a tenant's intake queue at `raisedAt`. */
export const heroConflicts = (raisedAt: string): ValidationItem[] => [
  {
    id: 'VAL-118-1', tenderId: HERO_ID, field: 'Initial guarantee rate', value: '2%', page: 35, alt: { value: '1%', page: 12 },
    confidence: 0.52, reason: 'Two rates stated: §41 and §77', blocksDg1: true, raisedAt,
  },
  {
    id: 'VAL-118-2', tenderId: HERO_ID, field: 'TSE pipeline length', value: '16 km', page: 23, alt: { value: '18 km', page: 47 },
    confidence: 0.61, reason: 'Scope and drawings list disagree', blocksDg1: true, raisedAt,
  },
];

/** As raised in Najd's queue. */
export const HERO_CONFLICTS: ValidationItem[] = heroConflicts('2026-03-08T07:44');

// ---------------------------------------------------------------------------
// Extraction record (spec §6.4 groups). Confidence is high unless noted.

const f = (label: string, value: string, page: number, confidence: ExtractField['confidence'] = 'high', note?: string): ExtractField =>
  note ? { label, value, page, confidence, note } : { label, value, page, confidence };

const IDENTITY: ExtractField[] = [
  f('Reference', HERO_REF, 1),
  f('Title', HERO_TITLE, 1),
  f('Issuer', `${HERO_ISSUER}, Projects Department`, 1),
  f('Parent entity', 'Not stated in this document', 3, 'low', 'The booklet names only the Entity, acting through its Projects Department.'),
  f('Country and region', 'Saudi Arabia, Eastern Province', 1),
  f('Procurement type', 'Public tender, two files (technical and financial), encrypted; mandatory at an estimated cost of SAR 5 M or more (§45)', 13),
  f('Portal', 'The government electronic procurement portal (Etimad)', 3, 'medium', 'The booklet says "the electronic portal". The listing was captured from Etimad.'),
  f('Funding source', 'Not stated in this document', 3, 'low', 'No budget line or financing source is named.'),
];

const COMMERCIAL: ExtractField[] = [
  f('Estimated value', 'Not published', 43, 'high', 'The BOQ summary gives quantities only. The platform estimate is shown separately and labelled as an estimate.'),
  f('Currency', 'Saudi riyals (§28)', 9),
  f('Document fee', 'SAR 5,000, paid through SADAD before the submission deadline (§3)', 3),
  f('Contract basis', 'Design and build of process and MEP works; civil works to the issued design; re-measured unit rates (§2.3)', 3),
  f('Pricing rules', 'Price the Works exactly as specified, without reservation; unit rates and totals in figures and in words, in Saudi riyals (§37)', 11),
  f('Taxes', 'Prices "inclusive of all taxes, fees and expenses" (§39)', 11, 'medium', 'VAT is not named. Confirm whether rates include 15% VAT: query drafted.'),
  f('Advance payment', 'Up to 10% of contract value against an equal advance payment guarantee, reducing as recovered', 36),
  f('Final invoice (retention)', 'Up to 10% deducted from each invoice until 10% of contract value is held; paid at initial delivery', 36),
  f('Optional O&M', '24 months of operation and maintenance, priced separately (§84)', 37),
  f('Economic participation', 'Applies if foreign imports reach SAR 100 M. Estimated imports are about SAR 85 M: close to the threshold', 34, 'medium', 'The import estimate is the platform\'s, from the BOQ; the threshold is the booklet\'s.'),
];

const GUARANTEES: ExtractField[] = [
  f('Initial guarantee', 'Two rates: 1% of total bid value (§41, p. 12) and 2% (§77, p. 35)', 12, 'low', 'Conflict. The agent shows both and does not choose. The likely reading is 2% (special conditions prevail); query drafted.'),
  f('Initial guarantee validity', 'At least 90 days from bid opening, to 8 Aug 2026 (§41)', 12),
  f('Original guarantee', 'Original delivered to the §8 address before the deadline; a copy in the financial file (§41)', 12),
  f('Final guarantee', '5% of contract value within fifteen (15) working days of award (§57)', 18),
  f('Advance payment guarantee', 'Equal to the advance payment, reducing as it is recovered', 36),
];

const TIME: ExtractField[] = [
  f('Issue date', 'Sun 8 Mar 2026, corresponding to 19 Ramadan 1447 H (approx.)', 1),
  f('Participation confirmation', 'Thu 12 Mar 2026', 4),
  f('Site visit', 'Tue 17 Mar 2026, 10:00, at the plant gate; encouraged, not mandatory (§34)', 4),
  f('Questions deadline', 'Wed 18 Mar 2026 (§33)', 4),
  f('Answers to questions', '"Within seven (7) days from that date" (§33)', 10, 'medium', 'The booklet does not say whether this counts from publication or from the questions deadline.'),
  f('Submission deadline', 'Sun 10 May 2026, 10:00', 4),
  f('Bid opening', 'Sun 10 May 2026, 10:30: technical files only (§49)', 4),
  f('Bid validity', '90 days from bid opening, to Sat 8 Aug 2026 (§29)', 10),
  f('Contract duration', '30 months from site handover, then a 12-month maintenance period (§2.3, §65)', 3),
];

const EVALUATION: ExtractField[] = [
  f('Method', 'Technical evaluation first, pass mark 70 of 100 (Annex 5); then the financial score for technically qualified bids', 42),
  f('Financial score', '(Lowest qualified price ÷ bid price) × 60% + local content score × 40%. The top score wins only if within 10% of the lowest qualified price (§51)', 16),
  f('Local content', 'Target LC% is mandatory; a bid without one is excluded (§51). Annex 10 applies: minimum local content of 40%', 33),
  f('National product preference', '10% price preference for national products; mandatory-list items must be of national origin (§51, §75)', 15, 'medium', 'Mandatory-list items in the BOQ: GRP pipes, LV cables, valves (p. 33).'),
  f('Abnormally low bids', '25% or more below the estimate and market prices may be excluded after a justification request (§19)', 6),
  f('Standstill', '5 working days after award notice (§55)', 17),
];

const SUBMISSION: ExtractField[] = [
  f('Files', 'Two separate encrypted files, technical and financial, through the electronic portal (§45)', 13),
  f('Language', 'English booklet provided; the Arabic text shall prevail (§27)', 9, 'high', 'Arabic prevails: check the Arabic text of any clause the bid relies on.'),
  f('Certificates', 'All certificates valid on the date of bid opening, for the bidder and each listed subcontractor; up to 10 working days to cure (§6, §53)', 4),
  f('Consortium agreement', 'Certified by the Chamber of Commerce or a notary before submission; named lead; joint and several liability (§22)', 7),
  f('Subcontractor list', 'Subcontracted works listed with quantities and prices in the bid (§23)', 7),
  f('Late bids', 'Not accepted; the portal closes at the deadline', 13),
  f('Bid letter', 'Annex 1 form, signed by the authorised signatory', 48),
];

const RISK: ExtractField[] = [
  f('Delay penalties', 'Formula stated; the cap is left as "[ %]" (§60)', 19, 'low', 'Blank in the booklet. Query drafted.'),
  f('Total penalties cap', '20% of contract value (§62)', 19),
  f('Subcontracting limit', 'Up to 30% of contract value; 30–50% needs approval; no sub-subcontracting (§23)', 7),
  f('Post-qualification reference', 'Criteria said to be "in Annex (8)"; they are in Annex 4 (§24)', 8, 'medium', 'Wrong annex reference in the booklet.'),
  f('Works in the live plant', 'Tie-ins to the operating Phase 1 plant with limited shutdowns; none from 1 June to 30 September without approval (§64.11)', 26),
  f('Insurance', 'Contractor\'s all-risk and third-party liability insurance for the contract period', 19),
];

export const HERO_EXTRACTED: ExtractedTenderGcc = {
  key: HERO_DOC_KEY,
  fileNames: [HERO_FILE_NAME],
  docType: 'Terms and Specifications Booklet: General Construction Works',
  pages: 48,
  language: 'English',
  scanned: false,

  title: HERO_TITLE,
  shortName: HERO_SHORT,
  refNo: HERO_REF,
  issued: '2026-03-08',
  authority: HERO_ISSUER,
  parent: null,
  country: 'Saudi Arabia',
  location: 'Al-Rawdah Sewage Treatment Plant, Eastern Province',
  sector: 'Water',
  mode: 'Design and build (process and MEP); civil works to issued design; re-measured unit-rate BOQ; optional 24-month O&M',
  currency: 'SAR',
  valueDisplay: null,
  valueCr: null,

  summary: [
    COMMERCIAL[0],
    f('Capacity', '+150,000 m3/day (Phase 2), with tertiary treatment and a TSE transmission pipeline', 20),
    TIME[8],
    GUARANTEES[0],
    COMMERCIAL[2],
    IDENTITY[6],
    TIME[7],
  ],
  dates: [
    { label: 'Published', date: '2026-03-08', page: 4, confidence: 'high' },
    { label: 'Participation confirmation', date: '2026-03-12', page: 4, confidence: 'high' },
    { label: 'Site visit', date: '2026-03-17', time: '10:00', page: 4, confidence: 'high' },
    { label: 'Questions deadline', date: '2026-03-18', page: 4, confidence: 'high' },
    // "Within seven (7) days from that date" (§33): read here as seven days after the questions deadline.
    { label: 'Answers to questions', date: '2026-03-25', page: 10, confidence: 'medium' },
    { label: 'Submission deadline', date: '2026-05-10', time: '10:00', page: 4, confidence: 'high' },
    { label: 'Bid opening', date: '2026-05-10', time: '10:30', page: 4, confidence: 'high' },
    { label: 'Bid validity ends', date: '2026-08-08', page: 10, confidence: 'high' },
    { label: 'Initial guarantee valid to (at least)', date: '2026-08-08', page: 12, confidence: 'high' },
  ],
  eligibility: HERO_REQUIREMENTS.map((r) => f(r.id, r.text, r.page, r.id === 'PQ-11' || r.id === 'PQ-14' ? 'medium' : 'high', r.note)),
  scope: [
    { text: 'Expand the Al-Rawdah STP by 150,000 m3/day (Phase 2) next to the operating Phase 1 plant, for a total of 300,000 m3/day', page: 20 },
    { text: 'Inlet works: six 6 mm fine screens with washer-compactors and four vortex grit removal units', page: 22 },
    { text: 'Biological treatment: four bioreactor lanes with anoxic and aerobic zones; fine-bubble aeration from six turbo blowers', page: 22 },
    { text: 'Six secondary clarifiers, 52 m diameter', page: 22 },
    { text: 'Tertiary treatment: cloth disc filters, UV disinfection in three channels and chlorine residual dosing', page: 22 },
    { text: 'TSE transmission pipeline, DN1000 GRP, approximately 16 km, with a 20,000 m3 TSE storage tank and pump station', page: 23 },
    { text: 'Sludge thickening and dewatering, with cake silos and truck loading; odour control by biotrickling filters and carbon polishing', page: 24 },
    { text: '33/11 kV substation, distribution and standby generation; plant SCADA integrated with the Entity\'s central control centre in Dammam', page: 25 },
    { text: 'Tie-ins to the operating Phase 1 plant with limited shutdowns', page: 26 },
    { text: 'Contract duration of 30 months from site handover, then a 12-month maintenance period', page: 28 },
    { text: 'Training and knowledge transfer for the Entity\'s staff', page: 29 },
    { text: 'Staff and labour: minimum key personnel (Table 7.1) and a programme of staff and labour by trade and by month', page: 30 },
  ],
  evaluation: EVALUATION,
  submission: SUBMISSION,
  contacts: [
    { name: 'Tenders and Contracts Manager', role: 'Representative of the Entity (§7); by phone or email only when the portal is unavailable', org: `${HERO_ISSUER}, Projects Department`,
      email: 'tenders.0147@ecws.example', phone: '+966 13 000 0147', address: 'ECWS Head Office, Tender Receipt Office, Ground Floor, Room G-12, Dammam (§8)', page: 4 },
  ],
  clauses: [
    { ref: '§6', title: 'Required certificates', summary: 'Valid on the date of bid opening, for the bidder and every listed subcontractor', page: 4 },
    { ref: '§19', title: 'Abnormally low bids', summary: '25% or more below estimate and market may be excluded after a justification request', page: 6 },
    { ref: '§22', title: 'Consortium', summary: 'Agreement certified before submission; lead named; joint and several liability', page: 7 },
    { ref: '§23', title: 'Subcontracting', summary: 'Up to 30% of contract value; 30–50% with approval; subcontractors listed with quantities and prices', page: 7 },
    { ref: '§27', title: 'Language', summary: 'The Arabic text shall prevail', page: 9 },
    { ref: '§29', title: 'Bid validity', summary: '90 days from the date of bid opening', page: 10 },
    { ref: '§33', title: 'Questions and answers', summary: 'Questions within 10 days of publication; answers "within seven (7) days from that date"', page: 10 },
    { ref: '§39', title: 'Taxes', summary: 'Prices inclusive of all taxes, fees and expenses (VAT not named)', page: 11 },
    { ref: '§41', title: 'Initial guarantee', summary: '1% of the total bid value; valid 90 days from opening; original with the bid', page: 12 },
    { ref: '§51', title: 'Evaluation criteria', summary: 'Technical pass mark, then price 60% and local content 40%; target LC% mandatory; 10% national product preference', page: 15 },
    { ref: '§57', title: 'Final guarantee', summary: '5% of contract value within 15 working days of award', page: 18 },
    { ref: '§60', title: 'Delay penalties', summary: 'Formula stated; cap left as "[ %]"', page: 19 },
    { ref: '§62', title: 'Total penalties', summary: 'Capped at 20% of contract value', page: 19 },
    { ref: '§77', title: 'Initial guarantee (special conditions)', summary: '2% of the total bid value', page: 35 },
  ],
  flags: [
    { title: 'Initial guarantee: 1% or 2%', detail: '§41 (p. 12) says 1% of the total bid value; §77 in the special conditions (p. 35) says 2%. Blocks DG1 until the Coordinator resolves it. The likely reading is 2%; a query is drafted.', page: 12, severity: 'high' },
    { title: 'Delay penalty cap left blank', detail: '§60 gives the penalty formula but the cap reads "[ %]". The 20% total cap in §62 still applies. A query is drafted.', page: 19, severity: 'high' },
    { title: 'Answer period is ambiguous', detail: '§33: answers come "within seven (7) days from that date", without saying whether that is publication or the questions deadline. Answers fall in the expected Eid closure either way.', page: 10, severity: 'medium' },
    { title: 'Wrong annex reference', detail: '§24 says the post-qualification criteria are "in Annex (8)". They are in Annex 4 (pp. 38–41).', page: 8, severity: 'low' },
    { title: '"ISO 90001"', detail: 'Annex 4 asks for "ISO 90001". Likely ISO 9001.', page: 40, severity: 'low' },
    { title: 'VAT not named', detail: '§39 says prices include all taxes, fees and expenses, but does not name VAT. A query is drafted: confirm whether rates include 15% VAT.', page: 11, severity: 'medium' },
    { title: 'TSE pipeline: 16 km or 18 km', detail: 'The scope (p. 23) says approximately 16 km; the drawings list (p. 47) titles the TSE transmission line 18 km. Blocks DG1 until resolved; affects the P-10 pipe quantity.', page: 23, severity: 'medium' },
    { title: 'Which three financial years?', detail: 'PQ-11 asks for the average turnover of "the last three (3) financial years" without naming them. Accounts due to be audited before opening may count. Interpretation line; a query is drafted.', page: 39, severity: 'medium' },
    { title: 'Arabic text prevails', detail: '§27: the booklet is supplied in English but the Arabic text prevails. Check the Arabic of any clause the bid relies on.', page: 9, severity: 'medium' },
  ],

  groups: {
    identity: IDENTITY,
    commercial: COMMERCIAL,
    guarantees: GUARANTEES,
    time: TIME,
    evaluation: EVALUATION,
    submission: SUBMISSION,
    risk: RISK,
  },
  conflicts: HERO_CONFLICTS,
};

// ---------------------------------------------------------------------------
// BOQ (§4.8). Vol. 2 has 236 lines in 11 bills. Titles, line counts, items
// and quantities are the ones the booklet prints on pp. 43–46 (plan 005,
// scripts/hero-itt/content.mjs). One "Remaining items" line per bill carries
// the rest, so each bill equals its §4.8 share of the SAR 480 M estimate and
// the bills add up to exactly SAR 480,000,000. Rates are estimates, not from
// the booklet.

export const HERO_BILLS: BoqBill[] = [
  { no: 1, title: 'General and preliminaries', lineCount: 18 },
  { no: 2, title: 'Civil and structural (bioreactors, clarifiers, buildings)', lineCount: 52 },
  { no: 3, title: 'Process mechanical equipment (screens, grit, blowers, clarifier mechanisms)', lineCount: 34 },
  { no: 4, title: 'Tertiary filtration and UV disinfection', lineCount: 14 },
  { no: 5, title: 'Sludge thickening and dewatering', lineCount: 15 },
  { no: 6, title: 'Odour control', lineCount: 9 },
  { no: 7, title: 'Electrical: 33/11 kV substation, transformers, MCCs, cabling', lineCount: 30 },
  { no: 8, title: 'Instrumentation, control and SCADA', lineCount: 20 },
  { no: 9, title: 'Yard piping, valves and penstocks', lineCount: 22 },
  { no: 10, title: 'TSE pipeline (DN1000 GRP, 16 km) and TSE pump station', lineCount: 14 },
  { no: 11, title: 'Piling, dewatering and shoring', lineCount: 8 },
];

export const HERO_LINES: BoqLine[] = [
  { item: '1.01', bill: 1, description: 'Mobilisation, site establishment and temporary facilities', unit: 'item', qty: 1, rate: 4_600_000, lines: 1 },
  { item: '1.04', bill: 1, description: 'Engineer’s site offices, furnished and serviced for the contract period', unit: 'month', qty: 30, rate: 165_000, lines: 1 },
  { item: '1.07', bill: 1, description: 'Design of process, mechanical, electrical and ICA works, with approvals', unit: 'item', qty: 1, rate: 6_400_000, lines: 1 },
  { item: '1.10', bill: 1, description: 'Temporary flow management and bypass works at the operating Phase 1 plant', unit: 'item', qty: 1, rate: 3_800_000, lines: 1 },
  { item: '1.13', bill: 1, description: 'Insurances required under clause 63', unit: 'item', qty: 1, rate: 2_900_000, lines: 1 },
  { item: '1.16', bill: 1, description: 'As-built documents, O&M manuals and operator training', unit: 'item', qty: 1, rate: 2_100_000, lines: 1 },
  { item: '1.x', bill: 1, description: 'Remaining items in bill 1 (12 lines)', unit: 'sum', qty: 1, rate: 8_850_000, lines: 12 },
  { item: '2.04', bill: 2, description: 'Excavation in all materials for tanks and channels, depth 0–7.5 m', unit: 'm3', qty: 186_000, rate: 42, lines: 1 },
  { item: '2.09', bill: 2, description: 'Sulphate-resisting concrete C40 for water-retaining structures', unit: 'm3', qty: 64_500, rate: 980, lines: 1 },
  { item: '2.11', bill: 2, description: 'High-yield reinforcement grade 60, cut, bent and fixed', unit: 't', qty: 9_850, rate: 3_400, lines: 1 },
  { item: '2.17', bill: 2, description: 'PVC waterstops, 230 mm, in construction and movement joints', unit: 'm', qty: 18_400, rate: 95, lines: 1 },
  { item: '2.26', bill: 2, description: 'Epoxy protective coating to internal surfaces of tanks and channels', unit: 'm2', qty: 72_000, rate: 110, lines: 1 },
  { item: '2.41', bill: 2, description: 'Blower building, reinforced concrete frame and blockwork, complete', unit: 'm2', qty: 2_150, rate: 4_300, lines: 1 },
  { item: '2.x', bill: 2, description: 'Remaining items in bill 2 (46 lines)', unit: 'sum', qty: 1, rate: 20_575_000, lines: 46 },
  { item: '3.02', bill: 3, description: 'Fine screens, 6 mm, 2,600 m3/h each, with washer-compactors', unit: 'nr', qty: 6, rate: 1_450_000, lines: 1 },
  { item: '3.06', bill: 3, description: 'Vortex grit removal units with grit classifiers', unit: 'nr', qty: 4, rate: 1_150_000, lines: 1 },
  { item: '3.10', bill: 3, description: 'Aeration blowers, high-speed turbo type, 750 kW, with enclosures', unit: 'nr', qty: 6, rate: 2_950_000, lines: 1 },
  { item: '3.14', bill: 3, description: 'Fine-bubble membrane diffusers, EPDM, with pipework grids', unit: 'nr', qty: 28_800, rate: 310, lines: 1 },
  { item: '3.21', bill: 3, description: 'Clarifier scraper mechanisms, 52 m diameter, half-bridge type', unit: 'nr', qty: 6, rate: 1_850_000, lines: 1 },
  { item: '3.27', bill: 3, description: 'Return and waste activated sludge pumps, with variable speed drives', unit: 'nr', qty: 14, rate: 420_000, lines: 1 },
  { item: '3.x', bill: 3, description: 'Remaining items in bill 3 (28 lines)', unit: 'sum', qty: 1, rate: 24_692_000, lines: 28 },
  { item: '4.02', bill: 4, description: 'Cloth disc filter units, 1,750 m3/h each, with backwash system', unit: 'nr', qty: 6, rate: 1_900_000, lines: 1 },
  { item: '4.06', bill: 4, description: 'UV disinfection channels, low-pressure high-output lamps', unit: 'nr', qty: 3, rate: 2_600_000, lines: 1 },
  { item: '4.09', bill: 4, description: 'Filter backwash and filtrate return pumps', unit: 'nr', qty: 6, rate: 240_000, lines: 1 },
  { item: '4.12', bill: 4, description: 'Sodium hypochlorite dosing system for the TSE chlorine residual', unit: 'item', qty: 1, rate: 1_150_000, lines: 1 },
  { item: '4.x', bill: 4, description: 'Remaining items in bill 4 (10 lines)', unit: 'sum', qty: 1, rate: 7_010_000, lines: 10 },
  { item: '5.02', bill: 5, description: 'Gravity belt thickeners, 60 m3/h', unit: 'nr', qty: 4, rate: 1_150_000, lines: 1 },
  { item: '5.05', bill: 5, description: 'Dewatering centrifuges, 45 m3/h, with cake pumps', unit: 'nr', qty: 4, rate: 2_700_000, lines: 1 },
  { item: '5.09', bill: 5, description: 'Polymer preparation and dosing units', unit: 'nr', qty: 2, rate: 620_000, lines: 1 },
  { item: '5.12', bill: 5, description: 'Dewatered cake silos, 200 m3, with truck loading', unit: 'nr', qty: 2, rate: 1_300_000, lines: 1 },
  { item: '5.x', bill: 5, description: 'Remaining items in bill 5 (11 lines)', unit: 'sum', qty: 1, rate: 4_760_000, lines: 11 },
  { item: '6.02', bill: 6, description: 'Biotrickling filter odour control units, 45,000 m3/h', unit: 'nr', qty: 3, rate: 1_650_000, lines: 1 },
  { item: '6.04', bill: 6, description: 'Activated carbon polishing units', unit: 'nr', qty: 3, rate: 480_000, lines: 1 },
  { item: '6.06', bill: 6, description: 'GRP odour extraction ductwork, DN300–DN1200', unit: 'm', qty: 1_850, rate: 820, lines: 1 },
  { item: '6.x', bill: 6, description: 'Remaining items in bill 6 (6 lines)', unit: 'sum', qty: 1, rate: 1_693_000, lines: 6 },
  { item: '7.01', bill: 7, description: '33/11 kV substation, gas-insulated switchgear, protection and control', unit: 'item', qty: 1, rate: 11_500_000, lines: 1 },
  { item: '7.03', bill: 7, description: 'Power transformers 33/11 kV, 20 MVA, ONAN', unit: 'nr', qty: 2, rate: 3_700_000, lines: 1 },
  { item: '7.07', bill: 7, description: 'Distribution transformers 11/0.4 kV, 2,500 kVA', unit: 'nr', qty: 6, rate: 520_000, lines: 1 },
  { item: '7.12', bill: 7, description: 'Motor control centres, form 4b, with variable speed drive sections', unit: 'nr', qty: 14, rate: 640_000, lines: 1 },
  { item: '7.19', bill: 7, description: 'LV power and control cables, XLPE/SWA (mandatory list)', unit: 'm', qty: 96_000, rate: 62, lines: 1 },
  { item: '7.24', bill: 7, description: 'Standby diesel generator sets, 2,000 kVA, with fuel system', unit: 'nr', qty: 2, rate: 1_600_000, lines: 1 },
  { item: '7.x', bill: 7, description: 'Remaining items in bill 7 (24 lines)', unit: 'sum', qty: 1, rate: 3_068_000, lines: 24 },
  { item: '8.02', bill: 8, description: 'Electromagnetic flowmeters, DN200–DN1200', unit: 'nr', qty: 38, rate: 48_000, lines: 1 },
  { item: '8.05', bill: 8, description: 'Online analysers: DO, ammonium, nitrate, TSS, turbidity', unit: 'nr', qty: 64, rate: 36_000, lines: 1 },
  { item: '8.09', bill: 8, description: 'PLC control panels with redundant processors', unit: 'nr', qty: 12, rate: 290_000, lines: 1 },
  { item: '8.13', bill: 8, description: 'SCADA servers, workstations and software, with central control centre link', unit: 'item', qty: 1, rate: 9_600_000, lines: 1 },
  { item: '8.16', bill: 8, description: 'Fibre-optic network, single-mode, 24-core', unit: 'm', qty: 14_500, rate: 42, lines: 1 },
  { item: '8.x', bill: 8, description: 'Remaining items in bill 8 (15 lines)', unit: 'sum', qty: 1, rate: 1_383_000, lines: 15 },
  { item: '9.03', bill: 9, description: 'Ductile iron pipes and fittings, DN300–DN1400', unit: 'm', qty: 7_200, rate: 2_100, lines: 1 },
  { item: '9.08', bill: 9, description: 'Butterfly valves, DN400–DN1400, electrically actuated (mandatory list)', unit: 'nr', qty: 96, rate: 68_000, lines: 1 },
  { item: '9.12', bill: 9, description: 'Stainless steel penstocks and weir gates', unit: 'nr', qty: 74, rate: 38_000, lines: 1 },
  { item: '9.17', bill: 9, description: 'Pipe supports, thrust blocks and wall sleeves', unit: 'nr', qty: 410, rate: 4_200, lines: 1 },
  { item: '9.x', bill: 9, description: 'Remaining items in bill 9 (18 lines)', unit: 'sum', qty: 1, rate: 2_618_000, lines: 18 },
  { item: '10.02', bill: 10, description: 'GRP pipes, DN1000, PN16, supplied to site (mandatory list)', unit: 'm', qty: 16_050, rate: 1_420, lines: 1 },
  { item: '10.04', bill: 10, description: 'Trench excavation, bedding, laying and backfill for DN1000 pipe', unit: 'm', qty: 16_050, rate: 690, lines: 1 },
  { item: '10.07', bill: 10, description: 'Air valve, washout and isolating valve chambers', unit: 'nr', qty: 42, rate: 95_000, lines: 1 },
  { item: '10.10', bill: 10, description: 'TSE pump station, 4 duty and 1 standby pumps, 450 kW, with surge vessels', unit: 'item', qty: 1, rate: 9_800_000, lines: 1 },
  { item: '10.12', bill: 10, description: 'Hydrostatic testing and flushing of the TSE pipeline', unit: 'm', qty: 16_050, rate: 38, lines: 1 },
  { item: '10.x', bill: 10, description: 'Remaining items in bill 10 (9 lines)', unit: 'sum', qty: 1, rate: 4_534_600, lines: 9 },
  { item: '11.02', bill: 11, description: 'Bored cast-in-place piles, 800 mm diameter, average length 18 m', unit: 'nr', qty: 1_240, rate: 6_800, lines: 1 },
  { item: '11.05', bill: 11, description: 'Deep-well and wellpoint dewatering, installed, operated and removed', unit: 'month', qty: 14, rate: 205_000, lines: 1 },
  { item: '11.07', bill: 11, description: 'Steel sheet piling for temporary shoring, installed and extracted', unit: 'm2', qty: 9_800, rate: 215, lines: 1 },
  { item: '11.x', bill: 11, description: 'Remaining items in bill 11 (5 lines)', unit: 'sum', qty: 1, rate: 991_000, lines: 5 },
];

/** Procurement packages (A's classification, spec §8.2). Lines in no package are self-performed. */
export const HERO_PACKAGES: BoqPackage[] = [
  { id: 'P-01', title: 'Piling, dewatering and shoring', bills: [11], lineItems: ['11.02', '11.05', '11.07', '11.x'], kind: 'subcontract' },
  { id: 'P-02', title: 'Process mechanical equipment', bills: [3], lineItems: ['3.02', '3.06', '3.10', '3.14', '3.21', '3.27'], kind: 'supply', longLeadWeeks: 40,
    note: 'Suppliers quote 32–40 weeks; installed by the contractor (in 3.x)' },
  { id: 'P-03', title: 'Tertiary filters and UV disinfection', bills: [4], lineItems: ['4.02', '4.06', '4.09', '4.12'], kind: 'supply', longLeadWeeks: 30,
    note: 'Installed by the contractor (in 4.x)' },
  { id: 'P-04', title: 'Sludge thickening and dewatering', bills: [5], lineItems: ['5.02', '5.05', '5.09', '5.12'], kind: 'supply',
    note: 'Installed by the contractor (in 5.x)' },
  { id: 'P-05', title: 'Odour control', bills: [6], lineItems: ['6.02', '6.04', '6.06', '6.x'], kind: 'subcontract' },
  { id: 'P-06', title: '33/11 kV substation and transformers', bills: [7], lineItems: ['7.01', '7.03'], kind: 'subcontract', longLeadWeeks: 36,
    note: 'Transformers are the long-lead item' },
  { id: 'P-07', title: 'LV distribution, MCCs and cabling', bills: [7], lineItems: ['7.07', '7.12', '7.19', '7.24', '7.x'], kind: 'subcontract',
    note: 'LV cables (7.19) are a mandatory-list item' },
  { id: 'P-08', title: 'Instrumentation, control and SCADA', bills: [8], lineItems: ['8.02', '8.05', '8.09', '8.16', '8.x'], kind: 'subcontract',
    note: 'The SCADA link to the Entity\'s central control centre (8.13) is not covered by any supplier' },
  { id: 'P-09', title: 'Yard pipes, valves and penstocks', bills: [9], lineItems: ['9.03', '9.08', '9.12'], kind: 'supply',
    note: 'Butterfly valves (9.08) are a mandatory-list item; supports and laying by the contractor (9.17, 9.x)' },
  { id: 'P-10', title: 'GRP pipes DN1000', bills: [10], lineItems: ['10.02'], kind: 'supply', mandatoryList: true,
    note: 'National product; laying by the contractor (10.04)' },
  { id: 'P-11', title: 'TSE pumps and surge vessels', bills: [10], lineItems: ['10.10'], kind: 'supply',
    note: 'Pump station civil works by the contractor (in 10.x)' },
];

/** The line no package covers: counted as "Not covered" in the coverage bar. */
export const HERO_NOT_COVERED = ['8.13'];

// ---------------------------------------------------------------------------
// The hero as a row in a tenant's register. Dates, requirements, extraction and
// estimate are the same everywhere; each tenant brings its own source, intake
// times, bid manager, fit inputs and story.

export interface HeroRowInput {
  sourceId: string;
  sourceDetail: string;
  bidManagerId: string;
  stageNote: string;
  intake: GccTender['intake'];
  fit: Record<Criterion, FitInput>;
  /** When the tenant's intake queue raised the two conflicts. */
  conflictsRaisedAt: string;
}

export function heroTender(t: HeroRowInput): GccTender {
  return {
    id: HERO_ID,
    title: HERO_TITLE,
    shortTitle: HERO_SHORT,
    issuer: HERO_ISSUER,
    issuerIsReal: false,
    country: 'Saudi Arabia',
    city: 'Eastern Province',
    sector: 'Water and wastewater',
    sourceId: t.sourceId,
    sourceDetail: t.sourceDetail,
    procurement: 'two-file',
    value: { amount: HERO_ESTIMATE.amount, ccy: HERO_ESTIMATE.ccy, basis: 'estimate', band: HERO_ESTIMATE.band },
    documentFee: HERO_BOOKLET_FEE,
    stage: 'S1',
    stageNote: t.stageNote,
    bidManagerId: t.bidManagerId,
    invited: [],
    keyDates: HERO_KEY_DATES,
    docKey: HERO_DOC_KEY,
    hero: true,
    requirements: HERO_REQUIREMENTS,
    fit: t.fit,
    validations: heroConflicts(t.conflictsRaisedAt),
    intake: t.intake,
  };
}
