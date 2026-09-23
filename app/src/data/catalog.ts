import type { Agent, Artefact, Supplier } from './types';

export const AGENTS: Agent[] = [
  { name: 'Intake & Extraction', stage: 'S1', state: 'Active', runs: 1284, eval: 97.2, guard: 'Holds low-fit tenders for review', remit: 'Watches nine portals, three mailboxes and a scanned-document drop. Extracts every field with page-level provenance and links addenda to the parent tender.', owner: 'Tender Coordinator', tier: 'Economy' },
  { name: 'Outreach & Evaluation', stage: 'S2', state: 'Active', runs: 642, eval: 94.8, guard: 'Recommends only; buyer commits spend', remit: 'Builds supplier shortlists from delivered performance, issues RFQs, nudges non-responders at T+48h and normalises incoming quotes to a common schema.', owner: 'Procurement / Estimation Lead', tier: 'Economy' },
  { name: 'Win-Probability & Recommendation', stage: 'S3', state: 'Active', runs: 38, eval: 91.5, guard: 'Cannot make the Bid/No-Bid call', remit: 'Models win probability with an explicit uncertainty band against the decided-bid set, and flags low-data confidence instead of presenting false precision.', owner: 'Bid Committee', tier: 'Frontier' },
  { name: 'Scheduling', stage: 'S4', state: 'Active', runs: 54, eval: 93.1, guard: 'Schedules stay draft until validated', remit: 'Generates the baseline programme and critical path from the scope split, levels resources and re-plans when scope or quotes move.', owner: 'Planning Manager', tier: 'Workhorse' },
  { name: 'Costing & Margin', stage: 'S5', state: 'Active', runs: 61, eval: 95.6, guard: 'No price without Commercial Manager selection', remit: 'Builds the cost model with a source on each line, runs base / stretch / defensive scenarios with sensitivity, and re-runs the model on every input change.', owner: 'Commercial Manager', tier: 'Frontier' },
  { name: 'Drafting & Section Assembly', stage: 'S6', state: 'Active', runs: 417, eval: 92.4, guard: 'Cites source of any reused content', remit: 'Drafts sections from past-bid IP with citation, orchestrates SME tasks and simulates evaluator scoring against the published criteria.', owner: 'Proposal Manager', tier: 'Frontier' },
  { name: 'Compliance Verification', stage: 'S7', state: 'Active', runs: 128, eval: 96.9, guard: 'Cannot clear the gate with open gaps', remit: 'Maintains the requirement-to-evidence matrix continuously, classifies gaps by severity and recommends redlines on non-standard positions.', owner: 'Compliance / Legal Lead', tier: 'Frontier' },
  { name: 'Document Assembly & e-Submission', stage: 'S8', state: 'Idle', runs: 19, eval: 99.1, guard: 'No submission without a DG3 record', remit: 'Packages the submission to the portal specification, places signatures, submits and captures the receipt into a locked archive.', owner: 'Bid Manager', tier: 'Workhorse' },
  { name: 'Delivery Oversight', stage: 'S9a', state: 'Active', runs: 206, eval: 90.7, guard: 'Recommends corrections; humans approve', remit: 'Tracks milestones and obligations against the commitments made in the bid and detects deviations early enough to correct them.', owner: 'Project Director', tier: 'Workhorse' },
  { name: 'Learning Loop', stage: 'S9b', state: 'Scheduled', runs: 4, eval: null, guard: 'Model changes need Governance Forum approval', remit: 'Refreshes margin models, supplier scoring and win-probability calibration from delivered outcomes, and proposes changes for approval.', owner: 'Bid Office / Analytics', tier: 'Workhorse' },
];

/** Release threshold every agent must clear against its golden set. */
export const EVAL_THRESHOLD = 90;
export const EVAL_WATCH = 92;

export const MODEL_ROUTING = [
  { label: 'Economy tier', pct: 62, tone: 'ink' as const },
  { label: 'Workhorse tier', pct: 29, tone: 'grey' as const },
  { label: 'Frontier tier', pct: 9, tone: 'cyan' as const },
];

export const SUPPLIERS: Supplier[] = [
  { name: 'Bharat Heavy Electricals', trade: 'Transformers and HV equipment', score: 8.6, projects: 41, response: 98, screening: 'Cleared', standing: 'Preferred' },
  { name: 'Toshiba T&D India', trade: 'Transformers and switchgear', score: 9.1, projects: 23, response: 94, screening: 'Cleared', standing: 'Preferred' },
  { name: 'Crompton Greaves', trade: 'Transformers and motors', score: 7.9, projects: 31, response: 78, screening: 'Cleared', standing: 'Approved' },
  { name: 'KEC International', trade: 'Transmission lines and towers', score: 8.8, projects: 52, response: 91, screening: 'Cleared', standing: 'Preferred' },
  { name: 'Sterlite Power', trade: 'HV cabling and OPGW', score: 8.2, projects: 28, response: 86, screening: 'Cleared', standing: 'Approved' },
  { name: 'L&T Construction', trade: 'Civil works and foundations', score: 8.9, projects: 64, response: 89, screening: 'Cleared', standing: 'Preferred' },
  { name: 'Tata Projects', trade: 'Civil and balance of plant', score: 8.4, projects: 47, response: 83, screening: 'Cleared', standing: 'Approved' },
  { name: 'Apar Industries', trade: 'Conductors and cables', score: 7.6, projects: 19, response: 72, screening: 'Cleared', standing: 'Approved' },
  { name: 'Sungrow India', trade: 'Solar inverters', score: 6.4, projects: 12, response: 64, screening: 'Cleared', standing: 'Watch' },
  { name: 'Delta Green Energy', trade: 'Solar inverters and SCADA', score: 6.1, projects: 9, response: 58, screening: 'Cleared', standing: 'Watch' },
  { name: 'Hitachi Energy India', trade: 'Protection & control', score: 9.0, projects: 26, response: 96, screening: 'Cleared', standing: 'Preferred' },
  { name: 'Kirloskar Brothers', trade: 'Pumps and water systems', score: 8.1, projects: 33, response: 88, screening: 'Cleared', standing: 'Approved' },
];

export const SUPPLIER_TOTAL = 214;

export const LIBRARY: Artefact[] = [
  { title: 'Executive summary: HV substation turnkey', kind: 'Narrative', origin: 'Won on Vadodara 400 kV', reuses: 18, lastUsed: '06 Mar 2026' },
  { title: 'QHSE management plan (EPC standard)', kind: 'Plan', origin: 'Reused across 31 bids', reuses: 31, lastUsed: '04 Mar 2026' },
  { title: 'Zero-outage tie-in methodology', kind: 'Case study', origin: 'Won on Trichy TL', reuses: 14, lastUsed: '02 Mar 2026' },
  { title: 'Form EXP-2 comparable experience table', kind: 'Form', origin: 'Auto-assembled from delivery records', reuses: 44, lastUsed: '06 Mar 2026' },
  { title: 'Substation key personnel CV set', kind: 'CV pack', origin: '9 CVs, substation-specific', reuses: 22, lastUsed: '28 Feb 2026' },
  { title: 'Local content declaration template', kind: 'Form', origin: 'Threshold logic per state', reuses: 17, lastUsed: '24 Feb 2026' },
  { title: 'GIS testing & commissioning approach', kind: 'Method', origin: 'Won on Vadodara and Kochi', reuses: 11, lastUsed: '21 Feb 2026' },
  { title: 'EPC baseline risk register (214 lines)', kind: 'Register', origin: 'Seeds every new tender', reuses: 58, lastUsed: '18 Feb 2026' },
];

export const LIBRARY_STATS = { artefacts: 1204, categories: 9, reuseRate: 64, wonSourced: 71, stale: 46 };

export const SOURCES = [
  { name: 'CPPP portal', mode: 'Polled every 15 min', state: 'Healthy', tone: 'green' as const },
  { name: 'GeM portal', mode: 'Polled every 15 min', state: 'Healthy', tone: 'green' as const },
  { name: 'State utility portals (7)', mode: 'Polled hourly', state: 'Healthy', tone: 'green' as const },
  { name: 'tenders@genesis-epc.in mailbox', mode: 'IMAP, attachments opened', state: 'Healthy', tone: 'green' as const },
  { name: 'bids@genesis-gulf.com mailbox', mode: 'IMAP, attachments opened', state: 'Healthy', tone: 'green' as const },
  { name: 'rfp@genesis-infra.com mailbox', mode: 'IMAP, attachments opened', state: 'Healthy', tone: 'green' as const },
  { name: 'Scanned drop at \\\\bidoffice\\intake', mode: 'OCR on arrival', state: '2 queued', tone: 'orange' as const },
];

export const CONTROL_POINTS = [
  { name: 'DG1: Pursue or discard', owner: 'Bid Manager', sla: '≤ 24h', state: 'Enforced' },
  { name: 'DG2: Bid / No-Bid', owner: 'Bid Committee', sla: '≤ 24h', state: 'Enforced' },
  { name: 'DG3: Final bid approval', owner: 'Tender Review Board', sla: '≤ 48h', state: 'Enforced, blocks submission' },
  { name: 'M2: Cost & schedule freeze', owner: 'Commercial + Planning', sla: 'Stage 5', state: 'Enforced' },
  { name: 'M3: Submission authority', owner: 'Bid Manager', sla: 'Stage 8', state: 'Enforced' },
];
