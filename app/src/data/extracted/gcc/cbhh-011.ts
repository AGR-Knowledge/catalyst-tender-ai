import type { ExtractField } from '../types';
import type { ExtractedTenderGcc, KeyDate, PqRequirement, ValidationItem } from '../../gcc/types';

/**
 * The second demo tender (plan 022, gcc-demo-data §4A): T-2026-061, the MEP works package for a
 * fictional 220-bed specialist hospital in Abu Dhabi. It is Corniche's tender only, in English.
 * Pages follow the document as built by `scripts/demo-itt/cbhh-011` into
 * `public/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf` (the page map is in that folder's README).
 *
 * The employer, the hospital, the reference and the contacts are fictional. The English text
 * governs (clause 7.2, p. 5): no "Arabic prevails" flag is raised on this tender.
 */

export const CBHH_ID = 'T-2026-061';
export const CBHH_DOC_KEY = 'cbhh-011';
export const CBHH_FILE = '/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf';
export const CBHH_FILE_NAME = 'CBHH-PRJ-2026-011-ITT.pdf';
export const CBHH_REF = 'CBHH/PRJ/2026/011';
const TITLE = 'MEP Works Package for the 220-Bed Crescent Bay Specialist Hospital, Abu Dhabi';
const ISSUER = 'Crescent Bay Health Holding';

// ---------------------------------------------------------------------------
// Key dates (Gulf Standard Time). No date is given for the answers (clause 5.3): the extraction
// reads it as "Not stated" with a flag, so there is no 'answers' key date.

export const CBHH_KEY_DATES: KeyDate[] = [
  { kind: 'published', date: '2026-03-08', page: 3, note: 'Published on the Abu Dhabi government procurement portal' },
  { kind: 'site-visit', date: '2026-03-11', time: '10:00', place: 'Hospital site gate, Crescent Bay campus', page: 4, note: 'Optional but recommended; register by Tue 10 Mar (clause 4)' },
  { kind: 'questions', date: '2026-03-19', page: 4, note: 'Through the Portal (clause 5.1)' },
  { kind: 'submission', date: '2026-04-21', time: '14:00', page: 6, note: 'Through the Portal, which closes at that time (clause 13.1)' },
  { kind: 'originals', date: '2026-04-21', time: '14:00', page: 6, note: 'Original bank guarantee to the Capital Projects Office; a scan with the commercial volume (clause 12.3)' },
  { kind: 'opening', date: '2026-04-21', time: '15:00', page: 7, note: 'By the tender committee; technical volumes first (clause 15)' },
  { kind: 'validity-end', date: '2026-08-19', page: 5, note: '120 days from the Tender Submission Date (clause 9.1)' },
];

// ---------------------------------------------------------------------------
// Qualification requirements (Section 6, p. 15). Certificates must be valid on the Tender Submission
// Date. The numbers the rules compare are in `threshold`, never parsed from the text.

export const CBHH_REQUIREMENTS: PqRequirement[] = [
  { id: 'Q-01', kind: 'cr', page: 15, alsoOn: [4], validAt: 'submission', country: 'AE', threshold: { field: 'MEP contracting' },
    text: 'A valid UAE trade licence covering MEP contracting' },
  { id: 'Q-02', kind: 'classification', page: 15, validAt: 'submission', country: 'AE',
    threshold: { field: 'MEP', grade: 1, issuer: 'Abu Dhabi contractor classification' },
    text: 'Abu Dhabi contractor classification: MEP, first grade' },
  { id: 'Q-03', kind: 'chamber', page: 15, validAt: 'submission', country: 'AE',
    text: 'Current membership of the Chamber of Commerce and Industry',
    reading: 'The tender does not say which emirate\'s chamber. An Abu Dhabi tender may expect Abu Dhabi Chamber membership' },
  { id: 'Q-04', kind: 'avl', page: 15, alsoOn: [12], validAt: 'submission', country: 'AE', threshold: { issuer: 'Civil Defence' },
    text: 'Approved by Civil Defence as a fire and life safety systems contractor, or a named specialist subcontractor that is' },
  { id: 'Q-05', kind: 'lc-baseline', page: 15, alsoOn: [3], validAt: 'submission', country: 'AE',
    text: 'A valid In-Country Value (ICV) certificate',
    note: 'The ICV score carries 25% of the commercial evaluation (clause 16.3, p. 7)' },
  { id: 'Q-06', kind: 'iso', page: 15, validAt: 'submission',
    text: 'ISO 9001, ISO 14001 and ISO 45001 certificates' },
  { id: 'Q-07', kind: 'experience', page: 15, threshold: { count: 2, value: 100_000_000, unit: 'AED', years: 7, field: 'healthcare MEP' },
    text: 'At least two (2) hospital or healthcare MEP projects, each with an MEP contract value of AED 100,000,000 or more, completed as main MEP contractor in the last seven (7) years' },
  { id: 'Q-08', kind: 'turnover', page: 15, threshold: { value: 400_000_000, unit: 'AED', years: 3 },
    text: 'Average annual turnover over the last three (3) financial years of AED 400,000,000 or more, from audited accounts' },
  { id: 'Q-09', kind: 'other', page: 15, alsoOn: [13],
    specialist: { what: 'installer approved for medical gas pipeline systems (HTM 02-01 or NFPA 99)' },
    text: 'An installer approved for medical gas pipeline systems, working to HTM 02-01 or NFPA 99: the tenderer, or a named specialist subcontractor (Section 4.8.2)' },
  { id: 'Q-10', kind: 'personnel', page: 15,
    roles: [{ role: 'project-manager', label: 'Project Manager', years: 15, sectorYears: 10, sector: 'healthcare' }],
    text: 'Key personnel: a Project Manager with at least 15 years\' experience, of which at least 10 years in healthcare projects' },
];

// ---------------------------------------------------------------------------
// The two conflicts. The agent shows both values with their pages and does not choose.

/** As raised in Corniche's intake queue at `raisedAt`. */
export const cbhhConflicts = (raisedAt: string): ValidationItem[] => [
  {
    id: 'VAL-061-1', tenderId: CBHH_ID, field: 'Tender bond validity', value: '150 days', page: 19, alt: { value: '120 days', page: 6 },
    confidence: 0.55, reason: 'Clause 12.2 and the Annex C bond form state different periods', blocksDg1: true, raisedAt,
  },
  {
    id: 'VAL-061-2', tenderId: CBHH_ID, field: 'Chiller plant capacity', value: '3 × 1,500 TR', page: 11, alt: { value: '3 × 1,750 TR', page: 14 },
    confidence: 0.63, reason: 'Scope of works and equipment schedule disagree', blocksDg1: false, raisedAt,
  },
];

export const CBHH_CONFLICTS: ValidationItem[] = cbhhConflicts('2026-03-08T07:52');

// ---------------------------------------------------------------------------
// Extraction record (spec §6.4 groups). Confidence is high unless noted.

const f = (label: string, value: string, page: number, confidence: ExtractField['confidence'] = 'high', note?: string): ExtractField =>
  note ? { label, value, page, confidence, note } : { label, value, page, confidence };

const IDENTITY: ExtractField[] = [
  f('Reference', CBHH_REF, 1),
  f('Title', TITLE, 1),
  f('Issuer', `${ISSUER}, Capital Projects Office acting as Project Manager`, 1),
  f('Parent entity', 'Not stated in this document', 3, 'low', 'The document names only the Employer, acting through its Capital Projects Office.'),
  f('Country and region', 'United Arab Emirates, Emirate of Abu Dhabi', 1),
  f('Procurement type', 'Open tender, single envelope with separate technical and commercial volumes (clause 11)', 1),
  f('Portal', 'The Abu Dhabi government procurement portal, for all communication (clause 1)', 4),
  f('Package', 'MEP works of a new 220-bed specialist hospital; the civil and structural works are under a separate contract (Section 4.1)', 10),
];

const COMMERCIAL: ExtractField[] = [
  f('Estimated value', 'Not published', 16, 'high', 'The BOQ summary gives quantities only. The platform estimate is shown separately and labelled as an estimate.'),
  f('Currency', 'UAE dirhams (AED) (clause 8.1)', 5),
  f('Contract basis', 'Measured contract: the Volume 2 quantities are estimates, re-measured at the tendered rates; FIDIC 2017 Construction conditions as amended (clause 8.1)', 5),
  f('Taxes', 'Rates exclusive of VAT; VAT at 5% shown separately in the Form of Tender and in each invoice (clause 8.3)', 5),
  f('Price adjustment', 'None: the Contractor bears changes in the cost of equipment, materials, labour and exchange rates (Sub-Clause 14.9)', 9),
  f('Advance payment', 'Up to 10% of the Accepted Contract Amount against an equal advance payment guarantee, recovered from interim payments (Sub-Clause 14.2)', 9),
  f('Retention', '10% of each interim payment until 10% of the Accepted Contract Amount is held; half released at taking-over, the balance after the defects period (Sub-Clause 14.3)', 9),
  f('Payment', 'Within 60 days of the Payment Certificate (Sub-Clause 14.7)', 9),
];

const GUARANTEES: ExtractField[] = [
  f('Tender bond', 'AED 2,000,000, a fixed amount: an unconditional bank guarantee from a bank licensed in the UAE, in the Annex C form (clause 12.1)', 6),
  f('Tender bond validity', 'Two periods: 120 days from the Tender Submission Date (clause 12.2, p. 6) and 150 days (Annex C, p. 19)', 6, 'low',
    'Conflict. The agent shows both and does not choose. Until it is resolved, the longer period is used for the bank guarantee; query drafted.'),
  f('Original guarantee', 'Original delivered to the Capital Projects Office before the Tender Submission Date; a scan uploaded with the commercial volume (clause 12.3)', 6),
  f('Performance security', '10% of the Accepted Contract Amount within 14 days of the Letter of Acceptance; reduced to 5% at taking-over (clause 18, Sub-Clause 4.2)', 8),
  f('Advance payment guarantee', 'Equal to the advance payment (Sub-Clause 14.2)', 9),
];

const TIME: ExtractField[] = [
  f('Issue date', 'Sun 8 Mar 2026', 1),
  f('Site visit', 'Wed 11 Mar 2026, 10:00, from the hospital site gate; optional but recommended; register by Tue 10 Mar (clause 4)', 4),
  f('Questions deadline', 'Thu 19 Mar 2026, through the Portal (clause 5.1)', 4),
  f('Answers to questions', 'Not stated: "issued to all tenderers as a circular" (clause 5.3)', 4, 'medium',
    'The document gives no date for the answers. The expected Eid al-Fitr closure (20–23 Mar) follows the questions deadline.'),
  f('Submission deadline', 'Tue 21 Apr 2026, 14:00, through the Portal (clause 13.1)', 6),
  f('Tender opening', 'Tue 21 Apr 2026, 15:00: technical volumes first; tenderers are not invited (clause 15)', 7),
  f('Tender validity', '120 days from the Tender Submission Date, to Wed 19 Aug 2026 (clause 9.1)', 5),
  f('Time for completion', '26 months from the Commencement Date, then a 24-month defects notification period (Sub-Clauses 8.2 and 11.3)', 9),
];

const EVALUATION: ExtractField[] = [
  f('Method', 'Qualification (Section 6), then a technical score out of 100 with a pass mark of 70, then the commercial score of technically compliant tenders (clause 16)', 7),
  f('Commercial score', 'Price score weighted at 75% and the certified ICV score at 25% (clause 16.3)', 7),
  f('Technical criteria', 'Method and programme 25; healthcare experience and key personnel 25; commissioning, including medical gases, 20; specialists and equipment 15; HSEQ 15', 7),
  f('Abnormally low tenders', 'May be rejected after the tenderer has been asked to justify the price (clause 16.4)', 7),
  f('Award', 'To the technically compliant tender with the highest commercial score (clause 17)', 7),
];

const SUBMISSION: ExtractField[] = [
  f('Files', 'One submission through the Portal: a technical volume and a commercial volume; no price in the technical volume (clause 11)', 6),
  f('Language', 'English. The English text of the Tender Documents governs (clause 7.2); the ruling language of the Contract is English (Sub-Clause 1.4)', 5),
  f('Joint ventures', 'Not accepted. Named specialist subcontractors are allowed, subject to the Employer\'s approval (clause 2.2)', 4),
  f('Certificates', 'Valid on the Tender Submission Date (Section 6)', 15),
  f('Format', 'Searchable PDF files; the priced BOQ also in the Employer\'s XLSX template (clause 13.2)', 6),
  f('Late tenders', 'Not accepted: the Portal closes at the deadline (clause 14.1)', 7),
  f('Form of Tender', 'Annex D, signed under a power of attorney, acknowledging every circular (clauses 6.2 and 13.3)', 20),
];

const RISK: ExtractField[] = [
  f('Delay damages', '0.1% of the Contract Price for each day of delay, capped at 10% (Sub-Clause 8.8)', 9),
  f('Subcontracting limit', 'At most 35% of the Accepted Contract Amount without approval; approved specialists for medical gas and fire, not replaced without consent (Sub-Clause 4.4)', 8),
  f('Chiller plant capacity', 'Two capacities: 3 × 1,500 TR (Section 4.4.1, p. 11) and 3 × 1,750 TR (equipment schedule, p. 14)', 11, 'low',
    'Conflict. Does not block DG1, but changes the chiller package. Query drafted.'),
  f('Medical gas installer', 'Installed by an installer approved for medical gas pipeline systems, working to HTM 02-01 or NFPA 99, and on the Employer\'s approved list: the tenderer, or a specialist subcontractor named in the technical volume (Section 4.8.2)', 13, 'high',
    'A tenderer without that approval must name its specialist before submission.'),
  f('Interface with the Main Contractor', 'The Main Contractor controls the site, hoists and access routes; an interface schedule defines the builder\'s work (Sub-Clause 4.6, Section 4.3)', 8),
  f('Insurance', 'Employer\'s project-wide contractor\'s all-risks policy; the Contractor insures its own plant, with third-party liability of AED 10 M per occurrence (Sub-Clause 18)', 9),
];

export const CBHH_EXTRACTED: ExtractedTenderGcc = {
  key: CBHH_DOC_KEY,
  fileNames: [CBHH_FILE_NAME],
  docType: 'Invitation to Tender: Instructions, Conditions and Scope of Works',
  pages: 20,
  language: 'English',
  scanned: false,

  title: TITLE,
  shortName: 'Abu Dhabi hospital MEP',
  refNo: CBHH_REF,
  issued: '2026-03-08',
  authority: ISSUER,
  parent: null,
  country: 'United Arab Emirates',
  location: 'Crescent Bay Specialist Hospital, Crescent Bay campus, Abu Dhabi',
  sector: 'Buildings',
  mode: 'Measured MEP package contract (FIDIC 2017 Construction, amended); design development, supply, installation, testing and commissioning',
  currency: 'AED',
  valueDisplay: null,
  valueCr: null,

  summary: [
    COMMERCIAL[0],
    IDENTITY[7],
    TIME[7],
    GUARANTEES[0],
    GUARANTEES[1],
    IDENTITY[6],
    TIME[6],
  ],
  dates: [
    { label: 'Published', date: '2026-03-08', page: 3, confidence: 'high' },
    { label: 'Site visit', date: '2026-03-11', time: '10:00', page: 4, confidence: 'high' },
    { label: 'Questions deadline', date: '2026-03-19', page: 4, confidence: 'high' },
    { label: 'Submission deadline', date: '2026-04-21', time: '14:00', page: 6, confidence: 'high' },
    { label: 'Tender opening', date: '2026-04-21', time: '15:00', page: 7, confidence: 'high' },
    { label: 'Tender validity ends', date: '2026-08-19', page: 5, confidence: 'high' },
  ],
  eligibility: CBHH_REQUIREMENTS.map((r) => f(r.id, r.text, r.page, r.reading || r.specialist ? 'medium' : 'high', r.reading ?? r.note)),
  scope: [
    { text: 'MEP works of a new 220-bed specialist hospital: basement, ground and six upper floors, about 64,000 m2, with eight operating theatres, a 24-bed ICU and 12 isolation rooms', page: 10 },
    { text: 'Design development, coordination, supply, installation, testing and commissioning, alongside the separate civil and structural contractor', page: 10 },
    { text: 'Central chilled water plant: three water-cooled centrifugal chillers of 1,500 TR each (N+1), cooling towers and primary-variable pumping', page: 11 },
    { text: 'Air side: 100% fresh-air AHUs with heat recovery and HEPA filtration for theatres, isolation rooms and the ICU; mixed-air AHUs and fan coil units elsewhere', page: 11 },
    { text: 'LV electrical installation from the transformer terminals, with three standby generators, UPS and isolated power supply panels for critical areas', page: 12 },
    { text: 'Plumbing, drainage and water treatment, including a reverse osmosis plant for renal dialysis', page: 12 },
    { text: 'Fire fighting and fire alarm, by a Civil Defence approved contractor', page: 12 },
    { text: 'Medical gas pipeline systems (oxygen from a VIE, medical and surgical air, vacuum, nitrous oxide, AGSS), by an installer approved for medical gas pipeline systems (HTM 02-01 or NFPA 99)', page: 13 },
    { text: 'ELV systems, the building management system and nurse call: design, supply, installation and commissioning', page: 13 },
    { text: 'Testing and commissioning, with at least ten weeks for integrated systems tests before handover', page: 13 },
  ],
  evaluation: EVALUATION,
  submission: SUBMISSION,
  contacts: [
    { name: 'Tender Administrator', role: 'Employer\'s contact, only when the Portal is unavailable (clause 5.4)', org: `${ISSUER}, Capital Projects Office`,
      email: 'tenders.011@cbhh.example', page: 4 },
  ],
  clauses: [
    { ref: 'ITT 2.2', title: 'Joint ventures and specialists', summary: 'Joint ventures not accepted; named specialist subcontractors allowed with approval', page: 4 },
    { ref: 'ITT 5.3', title: 'Answers to questions', summary: 'Issued to all tenderers as a circular; no date given', page: 4 },
    { ref: 'ITT 7.2', title: 'Language', summary: 'The English text of the Tender Documents governs', page: 5 },
    { ref: 'ITT 8.3', title: 'VAT', summary: 'Rates exclusive of VAT; VAT at 5% shown separately', page: 5 },
    { ref: 'ITT 9.1', title: 'Tender validity', summary: '120 days from the Tender Submission Date', page: 5 },
    { ref: 'ITT 12', title: 'Tender bond', summary: 'AED 2,000,000, UAE bank guarantee, valid 120 days from the Tender Submission Date', page: 6 },
    { ref: 'ITT 16.3', title: 'Commercial evaluation', summary: 'Price 75%, ICV score 25%', page: 7 },
    { ref: 'PC 4.2', title: 'Performance security', summary: '10% of the Accepted Contract Amount, reduced to 5% at taking-over', page: 8 },
    { ref: 'PC 4.4', title: 'Subcontractors', summary: 'At most 35% without approval; approved specialists for medical gas and fire', page: 8 },
    { ref: 'PC 8.8', title: 'Delay damages', summary: '0.1% a day, capped at 10% of the Contract Price', page: 9 },
    { ref: 'PC 14.3', title: 'Retention', summary: '10% up to 10% of the Accepted Contract Amount; half at taking-over', page: 9 },
    { ref: 'Scope 4.8.2', title: 'Medical gas installer', summary: 'Approved for medical gas pipeline systems (HTM 02-01 or NFPA 99) and on the Employer\'s approved list', page: 13 },
    { ref: 'Annex C', title: 'Form of Tender Bond', summary: 'Guarantee valid 150 days from the Tender Submission Date', page: 19 },
  ],
  flags: [
    { title: 'Tender bond validity: 120 or 150 days', detail: 'Clause 12.2 (p. 6) says the tender bond stays valid for 120 days from the Tender Submission Date; the Annex C bond form (p. 19) says 150 days. Blocks DG1 until the Coordinator resolves it. Until then the longer period is used for the bank guarantee; a query is drafted.', page: 6, severity: 'high' },
    { title: 'Medical gas: an approved installer (HTM 02-01 or NFPA 99)', detail: 'Section 4.8.2 and Q-09: the medical gas systems must be installed by an installer approved for medical gas pipeline systems and on the Employer\'s approved list: the tenderer, or a specialist subcontractor named in the technical volume. A named specialist cannot be replaced without consent (Sub-Clause 4.4).', page: 13, severity: 'high' },
    { title: 'Chiller capacity: 1,500 TR or 1,750 TR', detail: 'Section 4.4.1 (p. 11) specifies three 1,500 TR chillers; the equipment schedule (p. 14) lists CH-01 to 03 at 1,750 TR each. This changes the chiller package. It does not block DG1; a query is drafted.', page: 11, severity: 'medium' },
    { title: 'No date for the answers to questions', detail: 'Clause 5.3 says answers will be "issued to all tenderers as a circular" and gives no date. Questions close on Thu 19 Mar, the day before the expected Eid al-Fitr closure (20–23 Mar). Plan the pricing without the answers.', page: 4, severity: 'medium' },
    { title: 'ICV carries 25% of the commercial score', detail: 'Clause 16.3: the commercial score is the price score weighted at 75% and the certified ICV score at 25%. A low ICV score must be made up on price. The ICV certificate must be valid on the Tender Submission Date (Q-05).', page: 7, severity: 'medium' },
    { title: 'Which chamber of commerce?', detail: 'Q-03 asks for membership of "the Chamber of Commerce and Industry" without naming an emirate. An Abu Dhabi tender may expect Abu Dhabi Chamber membership. A query is drafted.', page: 15, severity: 'medium' },
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
  conflicts: CBHH_CONFLICTS,
};
