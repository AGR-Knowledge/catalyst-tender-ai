import type { Tone } from './types';

/* ───────────── Stage 1: Tender Coordinator ───────────── */

export interface ValidationItem {
  key: string;
  tender: string;
  field: string;
  sub: string;
  detail: string;
  label: string;
  rows: [string, string, Tone?][];
  note: string;
}

export const VALIDATIONS: ValidationItem[] = [
  { key: 'val-v1', tender: 'T-2026-056', field: 'Bid security amount', sub: 'Extracted from a scanned annexure, page 44', detail: 'Extracted "₹ 2.98 Cr" at 61% confidence from a scanned annexure. Source page 44.', label: 'Confirm',
    rows: [['Extracted value', '₹ 2.98 Cr'], ['Confidence', '61%, below the 85% threshold', 'orange'], ['Source', 'Annexure B, page 44 (scanned)'], ['Cross-check', 'ITB 14.1 states 1% of estimated value']],
    note: 'Confirming saves the value under your name and adds it to the golden set.' },
  { key: 'val-v2', tender: 'T-2026-056', field: 'Submission deadline', sub: 'Two dates present in the document', detail: 'Two dates present in the document; flagged for you to pick one.', label: 'Resolve',
    rows: [['Date A', '21 Apr 2026, 15:00 (cover letter)'], ['Date B', '23 Apr 2026, 15:00 (ITB clause 21.1)', 'orange'], ['Portal states', '21 Apr 2026, 15:00'], ['Agent position', 'Conflict, so it will not choose', 'red']],
    note: 'The date you pick sets the submission countdown for all roles.' },
  { key: 'val-v3', tender: 'T-2026-050', field: 'Eligibility: turnover', sub: 'OCR quality poor on the qualification table', detail: 'OCR quality poor on the qualification table. Manual read required.', label: 'Manual read',
    rows: [['Field', 'Average annual turnover'], ['OCR output', '₹ 1,?50 Cr (unreadable)', 'red'], ['Confidence', '34%', 'red'], ['Source', 'Section III, qualification table']],
    note: 'Stays open until someone reads the value from the source.' },
  { key: 'val-v4', tender: 'T-2026-050', field: 'Scope boundary', sub: 'Ambiguous split between civil and electrical', detail: 'Pooling substation works could sit in the civil or the electrical package. Coordinator judgement needed.', label: 'Review',
    rows: [['Ambiguity', 'Pooling substation: civil or electrical package'], ['Impact', '2 RFQ packages, ₹ 22 Cr indicative'], ['Agent position', 'Judgement required', 'orange'], ['Clarification', 'Draft query prepared for the client']],
    note: 'The answer decides which RFQ package prices the pooling substation.' },
  { key: 'val-v5', tender: 'T-2026-054', field: 'Client standing', sub: 'No registration or audited financials in the pack', detail: 'Private developer with no company registration number or audited financials in the tender pack.', label: 'Review',
    rows: [['Field', 'Client registration (CIN)'], ['Extracted', 'Not present in the document', 'red'], ['Payment security', 'Not stated'], ['Agent position', 'Cannot verify client standing', 'orange']],
    note: 'Your review decides whether a counterparty-risk flag goes into the DG1 pack.' },
];

export const AUTO_ACCEPTED = { tender: 'T-2026-049', fields: 38 };

export const EXTRACTION_CONFIDENCE = [
  { label: 'Deadline', pct: 99 },
  { label: 'Submission format', pct: 97 },
  { label: 'Scope summary', pct: 96 },
  { label: 'Eligibility criteria', pct: 94 },
  { label: 'Evaluation criteria', pct: 92 },
  { label: 'Bond / security', pct: 88 },
];

export const INTAKE_TODAY = [
  { time: '06:12', source: 'Portal · CPPP', id: 'T-2026-053', name: 'Effluent Treatment Plant', client: 'Gujarat Industrial', fit: '71%', disp: 'Shortlisted → DG1', tone: 'green' as Tone },
  { time: '06:44', source: 'Email · tenders@', id: 'T-2026-054', name: 'Township Infrastructure', client: 'Private developer', fit: '38%', disp: 'Low fit, held', tone: 'ink3' as Tone },
  { time: '07:03', source: 'Scanned · OCR', id: 'T-2026-041', name: 'Addendum 3', client: 'TN Transco', fit: 'n/a', disp: 'Linked to parent', tone: 'cyan' as Tone },
  { time: '08:20', source: 'Portal · GeM', id: 'T-2026-038', name: 'Corrigendum 2', client: 'PowerGrid', fit: 'n/a', disp: 'Linked to parent', tone: 'cyan' as Tone },
  { time: '09:51', source: 'Email · client', id: 'T-2026-056', name: 'Pipeline Package 7', client: 'Jamnagar Petro', fit: '82%', disp: 'Shortlisted → DG1', tone: 'green' as Tone },
];

/* ───────────── Stage 2: Procurement (T-2026-041) ───────────── */

export type PackageColumn = 'issued' | 'normalising' | 'evaluated' | 'approved';

export interface RfqPackage {
  key: string;
  name: string;
  column: PackageColumn;
  invited: number;
  responded: number;
  nudges: number;
  meta: string;
  note: string;
  recommendation?: string;
  issue?: string;
}

export const PACKAGES: RfqPackage[] = [
  { key: 'steel', name: 'Structural steel', column: 'issued', invited: 5, responded: 2, nudges: 3, meta: 'escalated', note: 'Agent nudged three non-responders at T+48h and T+96h, then escalated to the buyer. Two bidders are now past SLA.' },
  { key: 'hv', name: 'HV cabling', column: 'issued', invited: 6, responded: 4, nudges: 2, meta: '', note: 'Coverage already meets the three-quote threshold. Two responses outstanding but not blocking.' },
  { key: 'civil', name: 'Civil works (foundations)', column: 'issued', invited: 6, responded: 5, nudges: 1, meta: '', note: 'Held open for one late responder who has priced competitively before.' },
  { key: 'tx', name: 'Transformers', column: 'normalising', invited: 4, responded: 3, nudges: 1, meta: '3 quotes parsed', issue: 'Crompton Greaves: freight excluded', note: 'Crompton Greaves excludes freight. Ranking waits until it is adjusted.' },
  { key: 'cp', name: 'Control & protection', column: 'normalising', invited: 5, responded: 4, nudges: 1, meta: 'Validity differs across 4 offers', issue: 'Validity 30-120 days', note: 'Validity runs from 30 to 120 days and is set to a common expiry for comparison.' },
  { key: 'earth', name: 'Earthing & lightning', column: 'evaluated', invited: 5, responded: 4, nudges: 0, meta: 'Best-fit ready', recommendation: 'Best fit on price and lead time', note: 'Ranked on price and lead time. Awaiting buyer selection.' },
  { key: 'site', name: 'Site establishment', column: 'evaluated', invited: 4, responded: 3, nudges: 1, meta: 'Best-fit ready', recommendation: 'Best fit on price', note: 'Ranked on price. Awaiting buyer selection.' },
  { key: 'tc', name: 'Testing & commissioning', column: 'evaluated', invited: 4, responded: 3, nudges: 0, meta: 'Best-fit ready', recommendation: 'In-house (differentiator)', note: 'In-house capability priced alongside the subcontract option.' },
  { key: 'sw', name: 'Switchgear', column: 'approved', invited: 4, responded: 4, nudges: 0, meta: 'Locked to BOQ', recommendation: 'Rank 2 selected on delivery track record', note: 'Rank 2 chosen on delivery track record. Override reason logged 23 Feb.' },
];

export const TRANSFORMER_QUOTES = [
  { key: 'bhel', supplier: 'Bharat Heavy Electricals', price: 41.2, freight: 'Included', validity: '90 days', lead: '34 wks', note: 'Normalised best fit', tone: 'green' as Tone },
  { key: 'cg', supplier: 'Crompton Greaves', price: 39.8, freight: 'Excluded', validity: '60 days', lead: '38 wks', note: '+₹ 1.6 Cr freight to compare', tone: 'orange' as Tone },
  { key: 'tos', supplier: 'Toshiba T&D India', price: 43.6, freight: 'Included', validity: '120 days', lead: '29 wks', note: 'Fastest delivery', tone: 'ink3' as Tone },
];

export const PROCUREMENT_GUARDS = [
  { title: 'Sanctions & anti-bribery', body: 'Screened before engagement. 0 flags this cycle.' },
  { title: 'Criteria-based shortlisting', body: 'Ranking criteria recorded per package.' },
  { title: 'No commitment authority', body: 'Agent cannot issue a PO or commitment.' },
  { title: 'Quote confidentiality', body: 'Competing quotes are not shared between suppliers.' },
];

/* ───────────── Stage 5: Commercial (T-2026-041) ───────────── */

export const COST_LINES = [
  { key: 'sub', label: 'Subcontract packages', value: 268.0, direct: true, source: '9 packages of normalised quotes from Stage 2' },
  { key: 'mat', label: 'Direct materials', value: 61.0, direct: true, source: 'Steel, cable and conductor, index-linked to 28 Feb' },
  { key: 'lab', label: 'Direct labour', value: 38.0, direct: true, source: 'Productivity norms from 6 delivered substations' },
  { key: 'site', label: 'Site overheads', value: 22.0, direct: false, source: 'Mobilisation plan for a 26-month programme' },
  { key: 'bond', label: 'Bonds & insurances', value: 13.0, direct: false, source: 'Performance BG 10% and CAR policy quote' },
  { key: 'ho', label: 'HO recovery', value: 17.0, direct: false, source: 'Finance rate 3.5% of revenue' },
  { key: 'cont', label: 'Contingency', value: 8.2, direct: false, source: 'Risk register, P80 of priced risks' },
];

export type ScenarioKey = 'base' | 'stretch' | 'defensive';

export const SCENARIOS: { key: ScenarioKey; name: string; price: number; win: number }[] = [
  { key: 'base', name: 'Base', price: 486, win: 74 },
  { key: 'stretch', name: 'Stretch', price: 502, win: 58 },
  { key: 'defensive', name: 'Defensive', price: 469, win: 86 },
];

export const SENSITIVITY = [
  { label: 'Steel price ±10%', value: '±1.8 pts', w: 100 },
  { label: 'Schedule slip +8 wks', value: '±1.4 pts', w: 78 },
  { label: 'Labour productivity ±10%', value: '±1.1 pts', w: 61 },
  { label: 'FX ±5%', value: '±0.8 pts', w: 44 },
  { label: 'Subcontract re-quote risk', value: '±0.6 pts', w: 33 },
];

export const REPRICE_LOG = [
  { when: '04 Mar 09:12', trigger: 'Addendum 3: scope added to civil package', impact: 4.1 },
  { when: '02 Mar 16:40', trigger: 'Transformer quote revised (BHEL)', impact: -0.8 },
  { when: '28 Feb 11:05', trigger: 'Steel index escalation applied', impact: 2.2 },
  { when: '26 Feb 08:30', trigger: 'FX revaluation of EUR content', impact: 1.4 },
  { when: '23 Feb 14:20', trigger: 'Switchgear override, rank 2 supplier selected', impact: 0.6 },
  { when: '20 Feb 10:05', trigger: 'Addendum 2: revised BOQ quantities', impact: -1.3 },
  { when: '17 Feb 09:40', trigger: 'Civil foundations re-quote received', impact: -0.9 },
];

export const FX_EXPOSURE = 62;

/* ───────────── Stage 6: Proposal (T-2026-041) ───────────── */

export type SectionColumn = 'drafted' | 'sme' | 'review' | 'approved';

export interface ProposalSection {
  key: string;
  name: string;
  column: SectionColumn;
  meta: string;
  tone: Tone;
  overdue?: boolean;
}

/** Cards shown on the board. Counts per column include sections not shown as cards. */
export const SECTION_CARDS: ProposalSection[] = [
  { key: 'profile', name: 'Company profile & credentials', column: 'drafted', meta: 'Reused 92%', tone: 'green' },
  { key: 'qhse', name: 'QHSE management plan', column: 'drafted', meta: 'Reused 78%', tone: 'green' },
  { key: 'sec-1', name: 'Substation protection philosophy', column: 'sme', meta: 'Overdue 2d · A. Deshpande', tone: 'red', overdue: true },
  { key: 'cvs', name: 'Key personnel CVs', column: 'sme', meta: 'Due tomorrow · HR', tone: 'orange' },
  { key: 'lc', name: 'Local content statement', column: 'sme', meta: 'Due tomorrow · Commercial', tone: 'orange' },
  { key: 'method', name: 'Execution methodology', column: 'review', meta: 'Pink team done', tone: 'ink3' },
  { key: 'prog', name: 'Programme narrative', column: 'review', meta: 'Tied to S4 baseline', tone: 'ink3' },
  { key: 'tcapp', name: 'Testing & commissioning approach', column: 'review', meta: 'Reused 61%', tone: 'ink3' },
  { key: 'exec', name: 'Executive summary', column: 'approved', meta: 'Locked', tone: 'green' },
  { key: 'themes', name: 'Win themes', column: 'approved', meta: 'Locked', tone: 'green' },
  { key: 'compA', name: 'Compliance Part A', column: 'approved', meta: 'Locked', tone: 'green' },
];

export const SECTION_TOTALS: Record<SectionColumn, number> = { drafted: 2, sme: 9, review: 17, approved: 14 };
export const SME_OVERDUE = 3;

export const SCORING = [
  { key: 'tech', label: 'Technical approach', weight: 40, score: 32.8 },
  { key: 'prog', label: 'Programme & method', weight: 20, score: 15.6 },
  { key: 'qhse', label: 'QHSE & ESG', weight: 15, score: 12.9 },
  { key: 'kp', label: 'Key personnel', weight: 15, score: 9.2 },
  { key: 'lc', label: 'Local content', weight: 10, score: 7.4 },
];
export const CV_SUBSTITUTION_SCORE = 11.2;

export const WIN_THEMES = [
  { title: 'Zero-outage tie-in record', body: 'Referenced in exec summary, methodology and 3 case studies.', tone: 'green' as Tone },
  { title: 'In-house HV testing capability', body: 'Differentiator vs both named competitors.', tone: 'green' as Tone },
  { title: 'Local content above threshold', body: 'Present in exec summary only. Agent flags weak coverage.', tone: 'orange' as Tone },
  { title: 'Delivered 4 of 6 comparable projects early', body: 'Evidence table auto-assembled from delivery records.', tone: 'green' as Tone },
];

/* ───────────── Stage 7: Compliance (T-2026-041) ───────────── */

export const REQUIREMENTS_TOTAL = 214;
export const MANDATORY_TOTAL = 118;
export const GAP_BASE = { critical: 1, major: 3, minor: 6 };

export const MATRIX = [
  { req: 'Bid security ₹ 1.92 Cr (bank guarantee)', ref: 'ITB 14.1', type: 'Mandatory', evidence: 'Annexure C, BG issued 02 Mar', status: 'Covered' },
  { req: 'Average annual turnover ≥ ₹ 600 Cr', ref: 'ITB 6.2(a)', type: 'Mandatory', evidence: 'Form FIN-1, audited accounts FY23-25', status: 'Covered' },
  { req: 'Two comparable 400 kV substations', ref: 'ITB 6.2(c)', type: 'Mandatory', evidence: 'Form EXP-2: Vadodara, Trichy', status: 'Covered' },
  { req: 'ISO 45001 occupational health & safety', ref: 'ITB 9.4', type: 'Mandatory', evidence: 'Certificate expires 08 Mar, 4 days before submission', status: 'Critical gap', gapKey: 'gap' },
  { req: 'Local content declaration ≥ 50%', ref: 'SCC 7.2', type: 'Mandatory', evidence: 'Form LC-1, 58% declared', status: 'Covered' },
  { req: 'Type test reports for 400 kV GIS', ref: 'TS 3.11', type: 'Scored', evidence: 'Annexure F (6 of 8 reports)', status: 'Major gap' },
];

export const REDLINES = [
  { key: 'ld', clause: 'GCC 26.2 (LD cap)', client: '10% of contract value', redline: 'Cap at 7.5%, sub-cap per milestone', exposure: '₹ 12.2 Cr', owner: 'Legal', status: 'With client' },
  { key: 'ind', clause: 'GCC 31 (Indemnity)', client: 'Unlimited', redline: 'Limit to contract value, carve out IP', exposure: 'Unquantified', owner: 'Legal', status: 'Open' },
  { key: 'pv', clause: 'SCC 12 (Price variation)', client: 'Fixed price, 36 months', redline: 'Steel index linkage beyond 12 months', exposure: '₹ 8.6 Cr', owner: 'Commercial', status: 'With client' },
  { key: 'disp', clause: 'GCC 44 (Dispute forum)', client: 'Client-state courts', redline: 'Arbitration, seat at Mumbai', exposure: 'Unquantified', owner: 'Legal', status: 'Accepted' },
];

/* ───────────── Stage 8: Submission (T-2026-041) ───────────── */

export const SUBMISSION_LOG = [
  { when: 'Today 09:40', what: 'Integrity check', detail: '236 pages, 0 broken cross-references' },
  { when: 'Today 08:15', what: 'Signature placement', detail: '9 blocks positioned, 2 awaiting signatory' },
  { when: 'Yesterday 18:02', what: 'Format validation', detail: 'Portal schema accepted the dry run' },
  { when: '06 Mar 11:30', what: 'Dry-run upload', detail: 'Receipt simulated; no submission recorded' },
];

/* ───────────── Stage 9: Delivery ───────────── */

export interface Project {
  key: string;
  name: string;
  sector: string;
  value: number;
  progress: number;
  bid: number;
  current: number;
  milestones: number;
  atRisk: number;
  obligations: number;
}

export const PROJECTS: Project[] = [
  { key: 'vad', name: 'Vadodara 400 kV Substation', sector: 'Power', value: 412, progress: 68, bid: 12.8, current: 11.9, milestones: 12, atRisk: 1, obligations: 62 },
  { key: 'che', name: 'Chennai Metro Package 3', sector: 'Transport', value: 386, progress: 41, bid: 10.4, current: 8.1, milestones: 11, atRisk: 1, obligations: 58 },
  { key: 'jai', name: 'Jaipur Solar 120 MW', sector: 'Renewables', value: 214, progress: 83, bid: 9.2, current: 6.4, milestones: 8, atRisk: 2, obligations: 41 },
  { key: 'bha', name: 'Bhadla Solar 200 MW BoP', sector: 'Renewables', value: 318, progress: 57, bid: 10.1, current: 8.0, milestones: 9, atRisk: 0, obligations: 47 },
  { key: 'kut', name: 'Kutch Hybrid Solar 150 MW', sector: 'Renewables', value: 246, progress: 34, bid: 9.8, current: 7.5, milestones: 7, atRisk: 0, obligations: 39 },
  { key: 'dah', name: 'Dahej ETP Phase I', sector: 'Water', value: 88, progress: 22, bid: 14.1, current: 14.6, milestones: 6, atRisk: 0, obligations: 28 },
  { key: 'tri', name: 'Trichy Transmission Line', sector: 'Power', value: 176, progress: 95, bid: 11.6, current: 11.4, milestones: 9, atRisk: 0, obligations: 52 },
];

export const WHY_WIN = [
  { label: 'Technical differentiation', pct: 62, tone: 'ink' as Tone },
  { label: 'Price competitiveness', pct: 24, tone: 'grey' as Tone },
  { label: 'Delivery track record', pct: 14, tone: 'faint' as Tone },
];

export const PORTFOLIO = { winRate: 34.2, winRateDelta: 4.1, avgMargin: 11.4, avgMarginDelta: -0.6, onTime: 19 };
