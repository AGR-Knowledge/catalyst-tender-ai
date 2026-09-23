import type { RoleKey, Stage } from './types';

export const STAGES: Stage[] = [
  { n: 1, name: 'Tender Identification & Screening', short: 'Identification & screening', agent: 'Intake & Extraction Agent', owner: 'Tender Coordinator', control: 'DG1 and Milestone M1', tag: 'DG1', role: 'coord',
    ai: ['Continuous capture from portals, mailboxes and scanned hard copy', 'Field extraction with page-level provenance on every value', 'Duplicate and addendum linking to the parent tender', 'Fit-score against capability, geography and balance-sheet rules'],
    hu: ['Coordinator validates fields below the confidence threshold', 'Coordinator resolves conflicting dates and scope boundaries', 'Bid Manager takes the DG1 pursue-or-discard call'],
    out: ['Validated tender record with provenance', 'Fit-score and screening rationale', 'DG1 decision pack'],
    kpi: ['Intake to logged ≤ 15 min', 'Zero missed tenders on daily reconciliation'] },
  { n: 2, name: 'Subcontractor & Internal Input Orchestration', short: 'Subcontractor inputs', agent: 'Outreach & Evaluation Agent', owner: 'Procurement / Estimation Lead', control: 'None', tag: '', role: 'proc',
    ai: ['Scope split into packages and supplier shortlists built from performance history', 'RFQs issued package by package with the right attachments', 'Non-responders nudged at T+48h and escalated to the buyer', 'Incoming quotes normalised to a common schema, with exclusions and validity flagged'],
    hu: ['Buyer approves the shortlist and the ranking criteria', 'Buyer selects the supplier; any override is recorded with a reason'],
    out: ['Normalised quote comparison per package', 'Coverage report by trade', 'Supplier engagement and screening log'],
    kpi: ['≥ 3 comparable quotes on 90% of packages', 'Response rate 79%, up 22 pts since go-live'] },
  { n: 3, name: 'Bid / No-Bid Decisioning', short: 'Bid / No-Bid', agent: 'Win-Probability & Recommendation Agent', owner: 'Bid Committee / Sponsor', control: 'DG2', tag: 'DG2', role: 'exec',
    ai: ['Win-probability modelled with an explicit uncertainty band', 'Comparable-bid evidence assembled from the decided-bid history', 'Resource ask quantified in FTE and calendar weeks', 'Low-data confidence shown on the pack'],
    hu: ['Bid Committee takes the bid / no-bid decision at DG2', 'Sponsor sets any conditions attached to the pursuit'],
    out: ['DG2 evidence pack', 'Recorded decision with rationale', 'Resource commitment'],
    kpi: ['Decision within the 24h SLA', 'Trailing calibration inside ±10% of actual win rate'] },
  { n: 4, name: 'Project Scheduling & Planning', short: 'Scheduling & planning', agent: 'Scheduling Agent', owner: 'Planning Manager', control: 'Milestone M2', tag: 'M2', role: 'bid',
    ai: ['Baseline programme and critical path generated from the scope split', 'Resource histogram levelled against committed delivery load', 'Re-plan triggered automatically when scope or quotes move', 'Schedule reconciled against the cost model line by line'],
    hu: ['Planning Manager validates and releases the baseline', 'Delivery input on constructability and sequencing'],
    out: ['Baseline programme and critical path', 'Resource histogram', 'Schedule-cost reconciliation at M2'],
    kpi: ['Programme and cost model reconciled at M2', 'Re-plan turnaround under 4 hours'] },
  { n: 5, name: 'Financial & Cost Modelling', short: 'Cost & margin', agent: 'Costing & Margin Agent', owner: 'Commercial Manager', control: 'Milestone M2', tag: 'M2', role: 'comm',
    ai: ['Cost build-up with each line linked to its quote or historical norm', 'Base, stretch and defensive scenarios with win probability attached', 'Sensitivity run across steel, FX, schedule and productivity', 'Model re-run when an input changes'],
    hu: ['Commercial Manager selects the scenario that goes forward', 'Finance confirms bonds, insurances and HO recovery treatment'],
    out: ['Priced BOQ', 'Margin scenario set and break-even price', 'Sensitivity and re-price log'],
    kpi: ['100% of cost lines linked to source', 'Re-price completed within 2 hours of a trigger'] },
  { n: 6, name: 'Proposal Preparation & Drafting', short: 'Proposal drafting', agent: 'Drafting & Section Assembly Agent', owner: 'Proposal Manager', control: 'None', tag: '', role: 'prop',
    ai: ['Sections drafted from past-bid IP with the source of any reused content cited', 'SME tasks created, assigned and chased against the submission date', 'Evaluator scoring simulated against the published criteria', 'Red-team pass run before the review cycle'],
    hu: ['SMEs write the specialist sections', 'Proposal Manager approves every section before it locks'],
    out: ['Section pack with reuse provenance', 'Simulated evaluator score', 'Win-theme coverage map'],
    kpi: ['64% of content reused from the library', 'Simulated score up 6 points after red-team'] },
  { n: 7, name: 'Compliance & Risk Verification', short: 'Compliance & risk', agent: 'Compliance Verification Agent', owner: 'Compliance / Legal Lead', control: 'DG3', tag: 'DG3', role: 'comp',
    ai: ['Requirement-to-evidence matrix updated as documents arrive', 'Gaps classified by severity the moment they appear', 'Non-standard contractual positions detected and redlines recommended', 'Exposure quantified where possible'],
    hu: ['Legal accepts, amends or escalates each recommended redline', 'Tender Review Board clears DG3'],
    out: ['Compliance matrix across every requirement', 'Risk register with named owners', 'DG3 approval pack'],
    kpi: ['Zero open mandatory gaps at submission', '100% of risks carry a named owner'] },
  { n: 8, name: 'Final Compilation & Submission', short: 'Compilation & submission', agent: 'Document Assembly & e-Submission Agent', owner: 'Bid Manager', control: 'Milestone M3', tag: 'M3', role: 'bid',
    ai: ['Multi-format packaging against the portal specification', 'Signature and stamp placement checked page by page', 'Portal submission executed and the receipt captured', 'Complete submission archive written to the audit trail'],
    hu: ['Bid Manager authorises the submission', 'Authorised signatories sign the commercial forms'],
    out: ['Submission package in the required formats', 'Portal receipt', 'Locked submission archive'],
    kpi: ['100% on-time submission (19 of 19 this quarter)', 'No submission without a DG3 record'] },
  { n: 9, name: 'Post-Award Oversight & Learning', short: 'Oversight & learning', agent: 'Delivery Oversight + Learning Loop Agents', owner: 'Project Director / Bid Office', control: 'Loop → Stage 1', tag: 'Loop', role: 'dir',
    ai: ['Milestone and obligation tracking against the commitments made in the bid', 'Deviation detection with recommended corrective actions', 'Win/loss pattern analytics across the decided-bid set', 'Supplier scoring and margin model refresh'],
    hu: ['Project Director leads delivery and approves corrections', 'Bid Office accepts model refinements at the Governance Forum', 'Sponsor reviews governance quarterly'],
    out: ['Live KPI dashboards', 'Audit and compliance reports', 'Win/loss trend reports', 'Updated scoring and margin models'],
    kpi: ['~35% fewer delivery delays', 'Calibration improves quarter on quarter'] },
];

/** Gate / milestone markers shown under the stage tracks. */
export const STAGE_MARKERS: Record<number, string> = { 1: 'DG1', 3: 'DG2', 5: 'M2', 7: 'DG3', 8: 'M3' };

export const GATES = [
  { id: 'DG1', name: 'Pursue or Discard', owner: 'Bid Manager', after: 'After Stage 1, decision recorded against the tender', sla: '≤ 24h' },
  { id: 'DG2', name: 'Bid / No-Bid', owner: 'Bid Committee', after: 'After Stage 3, with the evidence pack attached', sla: '≤ 24h' },
  { id: 'DG3', name: 'Final Bid Approval', owner: 'Tender Review Board', after: 'After Stage 7. No submission without this record', sla: '≤ 48h' },
];

export type RaciValue = 'R' | 'A' | 'C' | 'I' | '·';

export const RACI: { role: string; key: RoleKey; cells: RaciValue[] }[] = [
  { role: 'Tender Coordinator', key: 'coord', cells: ['R', 'I', 'I', '·', '·', '·', '·', 'I', 'I'] },
  { role: 'Bid Manager', key: 'bid', cells: ['A', 'C', 'R', 'C', 'C', 'C', 'C', 'A', 'I'] },
  { role: 'Procurement / Estimation', key: 'proc', cells: ['I', 'A', 'C', 'C', 'C', '·', '·', 'I', 'C'] },
  { role: 'Bid Committee / Sponsor', key: 'exec', cells: ['I', '·', 'A', 'I', 'I', '·', '·', 'I', 'I'] },
  { role: 'Planning Manager', key: 'bid', cells: ['·', 'C', 'C', 'A', 'C', 'C', '·', '·', 'C'] },
  { role: 'Commercial Manager', key: 'comm', cells: ['·', 'C', 'C', 'C', 'A', 'C', 'C', '·', 'C'] },
  { role: 'Proposal Manager', key: 'prop', cells: ['·', '·', '·', '·', '·', 'A', 'C', 'R', '·'] },
  { role: 'Compliance / Legal', key: 'comp', cells: ['·', '·', 'C', '·', '·', 'C', 'A', 'C', 'I'] },
  { role: 'Project Director', key: 'dir', cells: ['·', '·', 'C', 'C', '·', '·', '·', '·', 'A'] },
  { role: 'Bid Office / Analytics', key: 'dir', cells: ['C', '·', 'C', '·', '·', '·', '·', '·', 'A'] },
];
