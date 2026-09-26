import type { WinModel } from './types';

/**
 * Win models (pack §9.1). The base is the tenant's hit rate for the sector;
 * each driver adds or takes points, with its reason and source. The domain
 * adds them up, clamps the result and sets the band from `comparables`.
 * Simulated outputs of the Win-Probability & Recommendation agent.
 */

export const WIN_MODELS: WinModel[] = [
  {
    tenant: 'najd', tenderId: 'T-2026-097',
    base: { pct: 33, label: 'Water hit rate, trailing 12 months (7 of 21)' },
    drivers: [
      { key: 'client', label: 'Client history', points: 9, why: 'WCWS: 2 awards from 3 bids since 2022', source: 'Client history: award records',
        cites: ['najd-wcws-2022', 'najd-wcws-2023', 'najd-wcws-2024'] },
      { key: 'value-band', label: 'Value band', points: 3, why: 'Inside the preferred band, where the hit rate is highest', source: 'Bid history; Fit model & rules' },
      { key: 'geography', label: 'Geography and presence', points: 2, why: 'Jeddah office serves Madinah', source: 'Company profile: offices' },
      { key: 'competitors', label: 'Competitor count', points: -4, why: '6 prequalified bidders', source: 'Prequalified bidders list (EV-04)' },
      { key: 'capacity', label: 'Capacity load', points: -2, why: 'Water tendering team heavily committed until May', source: 'Capacity: Water tendering team' },
      { key: 'price-position', label: 'Planned price position', points: 8, why: 'Levelled quotes put the estimate in the lower quartile of past awards', source: 'Commercial input; levelled quotes' },
      { key: 'local-content', label: 'Local content', points: 9, why: 'LC baseline 41% against a 40% minimum', source: 'Credential: local content baseline certificate' },
      { key: 'jv', label: 'JV', points: 0, why: 'Bidding as prime', source: 'DG1 record: submission strategy' },
    ],
    comparables: 14,
    movers: [
      { text: '+6 pts with local content ≥ 45%', points: 6 },
      { text: '−5 pts if a 7th bidder qualifies', points: -5 },
      { text: '−3 pts if the Addendum 2 re-quote moves the price position to the median', points: -3 },
    ],
    bidders: ['hijr', 'sahab', 'al-masar', 'tihama', 'istria', 'najd'],
  },
  {
    tenant: 'najd', tenderId: 'T-2026-101',
    base: { pct: 33, label: 'Water hit rate, trailing 12 months (7 of 21)' },
    drivers: [
      { key: 'client', label: 'Client history', points: 3, why: 'SCWS: repeat client, though payments are sometimes late', source: 'Bid history; client history' },
      { key: 'value-band', label: 'Value band', points: 4, why: 'Value near the band\'s lower edge', source: 'Bid history; Fit model & rules' },
      { key: 'geography', label: 'Geography and presence', points: -4, why: 'No office in the south-west', source: 'Company profile: offices' },
      { key: 'competitors', label: 'Competitor count', points: -3, why: 'Open tender: more bidders expected than on a prequalified list', source: 'Tender procedure (two-file, open)' },
      { key: 'capacity', label: 'Capacity load', points: -3, why: 'Shares process engineers with the Madinah WTP bid', source: 'Capacity: Water tendering team' },
      { key: 'price-position', label: 'Planned price position', points: 8, why: 'Levelled quotes put the estimate below the median of past awards', source: 'Commercial input; levelled quotes' },
      { key: 'local-content', label: 'Local content', points: 9, why: 'LC baseline 41% against a 40% minimum', source: 'Credential: local content baseline certificate' },
      { key: 'jv', label: 'JV', points: 0, why: 'Bidding as prime', source: 'DG1 record: submission strategy' },
    ],
    comparables: 8,
    movers: [
      { text: '+4 pts with a site office in Abha named in the bid', points: 4 },
      { text: '−3 pts if the membrane re-quote comes in above the benchmark', points: -3 },
    ],
  },
  {
    tenant: 'corniche', tenderId: 'T-2026-029',
    base: { pct: 38, label: 'Buildings MEP hit rate, trailing 12 months (5 of 13)' },
    drivers: [
      { key: 'client', label: 'Client history', points: 4, why: 'Government-backed developer with a good payment record', source: 'Client history' },
      { key: 'value-band', label: 'Value band', points: 2, why: 'Inside the preferred band', source: 'Bid history; Fit model & rules' },
      { key: 'geography', label: 'Geography and presence', points: 3, why: 'Sharjah: served from the Dubai office', source: 'Company profile: offices' },
      { key: 'competitors', label: 'Competitor count', points: -5, why: 'Invited tender: five MEP contractors invited', source: 'Invitation to tender' },
      { key: 'capacity', label: 'Capacity load', points: -3, why: 'Buildings MEP tendering team committed through April', source: 'Capacity: Buildings MEP tendering team' },
      { key: 'price-position', label: 'Planned price position', points: 2, why: 'Levelled quotes put the estimate near the median of past awards', source: 'Commercial input; levelled quotes' },
      { key: 'local-content', label: 'Local content', points: 3, why: 'In-country value certificate above the tender\'s threshold', source: 'Credential: in-country value certificate' },
      { key: 'jv', label: 'JV', points: 0, why: 'Bidding as prime', source: 'DG1 record: submission strategy' },
    ],
    comparables: 11,
    movers: [
      { text: '+4 pts if the employer confirms a two-envelope evaluation', points: 4 },
      { text: '−3 pts if a sixth contractor is invited', points: -3 },
    ],
  },
  {
    tenant: 'qurain', tenderId: 'T-2026-049',
    base: { pct: 31, label: 'Water hit rate, trailing 12 months (5 of 16)' },
    drivers: [
      { key: 'client', label: 'Client history', points: 8, why: 'Sanitation agency: reliable payer and a repeat client', source: 'Client history' },
      { key: 'value-band', label: 'Value band', points: 2, why: 'Inside the preferred band', source: 'Bid history; Fit model & rules' },
      { key: 'geography', label: 'Geography and presence', points: 8, why: 'Kuwait: home market', source: 'Company profile: offices' },
      { key: 'competitors', label: 'Competitor count', points: -3, why: 'Four bidders registered on CAPT', source: 'CAPT tender record' },
      { key: 'capacity', label: 'Capacity load', points: -6, why: 'Water tendering team over capacity in April', source: 'Capacity: Water tendering team' },
      { key: 'price-position', label: 'Planned price position', points: 6, why: 'Levelled quotes put the estimate below the median of past awards', source: 'Commercial input; levelled quotes' },
      { key: 'local-content', label: 'Local content', points: 6, why: 'National-labour quota met; local products on the main packages', source: 'Company profile: Kuwait workforce' },
      { key: 'jv', label: 'JV', points: 0, why: 'Bidding as prime', source: 'DG1 record: submission strategy' },
    ],
    comparables: 12,
    movers: [
      { text: '+4 pts if the April peak is covered by moving an estimator from the Kuwait bids', points: 4 },
      { text: '−5 pts if the bond pushes the facility below its warning level', points: -5 },
    ],
  },
];
