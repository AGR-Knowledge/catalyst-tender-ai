import type { Tender } from './types';

/**
 * The single tender register. Every dashboard, KPI and drawer reads from here.
 * Counts such as "at a gate" or "pipeline by stage" are derived, never typed in.
 *
 * Demo "today" is 08 Mar 2026 (see domain/dates.ts).
 */
export const TENDERS: Tender[] = [
  {
    id: 'T-2026-041', name: '400 kV Substation & Transmission Line', client: 'TN Transco', sector: 'Power',
    value: 486, stage: 6, due: '2026-03-12', win: 74, band: 6, confidence: 'high', bidManager: 'R. Iyer', gate: null,
    status: 'Drafting, SME input open',
    detail: {
      scope: 'Turnkey 400/220 kV GIS substation + 62 km line',
      portal: 'CPPP portal',
      bidSecurity: '₹ 1.92 Cr, BG issued 02 Mar',
      rows: [],
      events: [
        ['04 Mar 09:12', 'Addendum 3 linked to parent; 2 packages and 4 clauses re-flagged'],
        ['02 Mar 16:40', 'Cost model re-run after transformer quote revised (−₹ 0.8 Cr)'],
        ['02 Mar 11:20', 'Bank guarantee issued and filed to Annexure C'],
        ['28 Feb 11:05', 'Steel index escalation applied (+₹ 2.2 Cr)'],
      ],
      note: 'Addendum 3 was issued by the client on 04 Mar. The Intake Agent linked it to the parent tender and re-flagged two priced packages and four compliance clauses for re-verification.',
    },
  },
  {
    id: 'T-2026-044', name: 'Metro Depot Civil Works, Phase II', client: 'Pune Metro Rail', sector: 'Transport',
    value: 312, stage: 5, due: '2026-03-19', win: 61, band: 8, confidence: 'high', bidManager: 'R. Iyer', gate: null,
    status: 'Cost model at M2 reconciliation',
    detail: {
      scope: 'Depot civil works, workshop and stabling lines',
      portal: 'GeM portal',
      bidSecurity: '₹ 1.24 Cr, in preparation',
      rows: [['Packages priced', '6 of 8'], ['Schedule', 'Baseline matched to cost model at M2'], ['Open gaps', '0 critical, 2 major, 4 minor']],
      events: [
        ['05 Mar 10:02', 'Schedule reconciled to cost model at M2'],
        ['04 Mar 14:33', 'Win-theme sign-off requested from Bid Manager'],
        ['01 Mar 09:15', 'Two civil packages returned to the buyer for re-quote'],
      ],
      note: 'Executive summary draft is ready and awaiting win-theme sign-off. The Scheduling Agent has reconciled the baseline programme against the cost model. M2 can be frozen once the two open packages return.',
    },
  },
  {
    id: 'T-2026-047', name: '250 MW Solar PV Balance of Plant', client: 'Rajasthan Renewables', sector: 'Renewables',
    value: 208, stage: 3, due: '2026-03-29', win: 48, band: 9, confidence: 'medium', bidManager: 'R. Iyer', gate: 'DG2',
    status: 'DG2 pack with the Bid Committee',
    detail: {
      scope: 'BoP for 250 MW PV: civil, MV, SCADA',
      portal: 'Client e-tender portal',
      resourceAsk: '6.5 FTE for 5 weeks',
      expectedMargin: '9.1-12.4%',
      comparables: '11 in the decided set',
      rows: [['Comparable bids', '11 in the decided set'], ['Sector note', 'Solar BoP margins running 2.4 pts below bid'], ['Decision SLA', 'DG2 · 14h remaining']],
      events: [
        ['06 Mar 08:40', 'DG2 evidence pack assembled and issued to the committee'],
        ['05 Mar 17:10', 'Learning Loop flagged sector margin variance on solar BoP'],
      ],
      note: 'Solar BoP has delivered 2.4 pts below bid across three projects. That variance is attached to the pack for the committee.',
    },
  },
  {
    id: 'T-2026-049', name: 'Refinery Piping Package 4B', client: 'Jamnagar Petro', sector: 'Oil & gas',
    value: 655, stage: 7, due: '2026-03-17', win: 69, band: 5, confidence: 'high', bidManager: 'R. Iyer', gate: 'DG3',
    status: 'Compliance verification, DG3 in review',
    detail: {
      scope: 'Piping, supports and stress analysis for Package 4B',
      portal: 'Client portal',
      rows: [['Approved at DG2', '18 Feb 2026'], ['Requirements mapped', '186 of 190'], ['Open gaps', '0 critical, 1 major, 3 minor']],
      events: [
        ['06 Mar 12:05', '38 intake fields auto-accepted with provenance recorded'],
        ['18 Feb 15:30', 'DG2 approved, pursuit confirmed by the committee'],
      ],
      note: 'No critical gaps. The Compliance Agent expects the remaining major gap (welder qualification records) to close on receipt of the fabricator dossier.',
    },
  },
  {
    id: 'T-2026-052', name: 'Bulk Water Supply Scheme', client: 'Karnataka WSSB', sector: 'Water',
    value: 141, stage: 3, due: '2026-04-03', win: 35, band: 12, confidence: 'low', bidManager: 'R. Iyer', gate: 'DG2',
    status: 'DG2 pack with the committee (low-data confidence)',
    detail: {
      scope: 'Intake works, 46 km transmission main, 3 reservoirs',
      portal: 'Karnataka e-Procurement',
      resourceAsk: '4.0 FTE for 6 weeks',
      expectedMargin: '8.4-10.2%',
      comparables: '3 only, low-data confidence flagged',
      rows: [['Comparable bids', '3 only, low-data confidence flagged'], ['Indicative RFQs', '11 across 4 packages'], ['Decision SLA', 'DG2 · 4h remaining']],
      events: [
        ['06 Mar 16:20', 'DG2 evidence pack issued with low-data confidence flagged'],
        ['05 Mar 11:48', 'Indicative RFQs issued to 11 suppliers across 4 packages'],
      ],
      note: 'Only three comparable bids sit behind this win-probability, so it is marked low-data confidence.',
    },
  },
  {
    id: 'T-2026-053', name: 'Effluent Treatment Plant, Dahej', client: 'Gujarat Industrial', sector: 'Water',
    value: 96, stage: 1, due: '2026-04-10', win: null, fit: 71, confidence: 'medium', bidManager: 'R. Iyer', gate: 'DG1',
    status: 'DG1 due, fit-score 71%',
    detail: {
      scope: '40 MLD effluent treatment plant, 15-year O&M option',
      portal: 'CPPP portal',
      bidSecurity: '₹ 1.92 Cr, confirmed by coordinator',
      resourceAsk: '2.5 FTE for 4 weeks',
      comparables: 'Dahej ETP Phase I, tracking 14.6% vs 14.1% bid',
      rows: [['Source', 'CPPP portal, captured 06:12 today'], ['Coordinator status', 'Validated, 2 fields confirmed'], ['Comparable', 'Dahej ETP Phase I, tracking 14.6% margin']],
      events: [
        ['Today 08:05', 'Coordinator confirmed bid security and resolved deadline conflict'],
        ['Today 06:12', 'Captured from CPPP and screened at fit-score 71%'],
      ],
      note: 'Dahej ETP Phase I is the closest comparable in the portfolio and is tracking above its bid margin. The screening rationale, the fit-score breakdown and the comparable set are attached to the DG1 pack.',
    },
  },
  {
    id: 'T-2026-056', name: 'Pipeline Package 7', client: 'Jamnagar Petro', sector: 'Oil & gas',
    value: 298, stage: 1, due: '2026-04-21', win: null, fit: 82, confidence: 'high', bidManager: 'R. Iyer', gate: 'DG1',
    status: 'DG1 due, fit-score 82%, 2 fields in validation',
    detail: {
      scope: '84 km 24-inch crude pipeline with two pumping stations',
      portal: 'Client e-procurement portal',
      bidSecurity: '₹ 2.98 Cr, pending coordinator validation',
      resourceAsk: '3.0 FTE for 5 weeks',
      comparables: 'Refinery Piping 4B (T-2026-049): same client, at Stage 7',
      rows: [['Source', 'Client email, captured 09:51 today'], ['Repeat client', 'T-2026-049 in Stage 7 with the same client']],
      events: [
        ['Today 09:58', 'Two fields routed to the Tender Coordinator below threshold'],
        ['Today 09:51', 'Captured from client email and screened at fit-score 82%'],
      ],
      note: 'Highest fit-score captured this month. Two fields, bid security and the submission deadline, sit with the Tender Coordinator; the DG1 pack is complete once they are validated.',
    },
  },
  { id: 'T-2026-036', name: 'Coastal Desalination Package B', client: 'TN Water Board', sector: 'Water', value: 402, stage: 8, due: '2026-03-09', win: 66, band: 6, confidence: 'high', bidManager: 'N. Gupta', gate: null, status: 'Packaged, submits tomorrow' },
  { id: 'T-2026-038', name: '765 kV Line, Section 3', client: 'PowerGrid', sector: 'Power', value: 718, stage: 6, due: '2026-03-21', win: 58, band: 7, confidence: 'high', bidManager: 'N. Gupta', gate: null, status: 'Drafting, red-team scheduled' },
  { id: 'T-2026-039', name: 'Industrial Park Roads & Drainage', client: 'GIDC', sector: 'Urban infra', value: 128, stage: 6, due: '2026-03-24', win: 52, band: 8, confidence: 'high', bidManager: 'P. Shah', gate: null, status: 'Drafting with 71% reuse' },
  { id: 'T-2026-042', name: 'LNG Terminal Civil Works', client: 'Petronet East', sector: 'Oil & gas', value: 894, stage: 5, due: '2026-03-27', win: 44, band: 9, confidence: 'medium', bidManager: 'P. Shah', gate: null, status: 'Scenario set in preparation' },
  { id: 'T-2026-043', name: 'Airport Apron Extension', client: 'AAI Bhubaneswar', sector: 'Transport', value: 233, stage: 3, due: '2026-03-31', win: 39, band: 10, confidence: 'medium', bidManager: 'N. Gupta', gate: null, status: 'DG2 evidence pack in assembly' },
  { id: 'T-2026-045', name: '220 kV GIS Substation, Kochi', client: 'Kerala SEB', sector: 'Power', value: 176, stage: 4, due: '2026-04-02', win: 63, band: 7, confidence: 'high', bidManager: 'P. Shah', gate: null, status: 'Baseline programme in validation' },
  { id: 'T-2026-046', name: 'Water Treatment Plant (120 MLD)', client: 'Maha Jeevan', sector: 'Water', value: 189, stage: 2, due: '2026-04-06', win: 47, band: 9, confidence: 'medium', bidManager: 'N. Gupta', gate: null, status: 'RFQs out, 3 of 5 packages covered' },
  { id: 'T-2026-048', name: 'Rail Electrification Phase IV', client: 'CORE Allahabad', sector: 'Transport', value: 541, stage: 3, due: '2026-04-08', win: 55, band: 8, confidence: 'medium', bidManager: 'P. Shah', gate: null, status: 'Win-probability model running' },
  { id: 'T-2026-050', name: 'Hybrid Renewable Park BoP', client: 'NTPC Renewables', sector: 'Renewables', value: 367, stage: 1, due: '2026-04-14', win: null, fit: 61, confidence: 'medium', bidManager: 'N. Gupta', gate: null, status: 'Screening, 2 fields in validation' },
  { id: 'T-2026-051', name: 'Steel Plant Utilities Package', client: 'JSW Dolvi', sector: 'Industrial', value: 622, stage: 2, due: '2026-04-16', win: 42, band: 10, confidence: 'medium', bidManager: 'P. Shah', gate: null, status: 'Scope split into 7 packages' },
  { id: 'T-2026-054', name: 'Township Infrastructure', client: 'Private developer', sector: 'Urban infra', value: 74, stage: 1, due: '2026-04-18', win: null, fit: 38, confidence: 'low', bidManager: 'P. Shah', gate: null, status: 'Low fit, held for review' },
];

/** Sub-stage owners for stages 4 and 8 fall to the tender's bid manager. */
export const TODAY_ISO = '2026-03-08';
