import type { Credential, GccTender, TenantSeed } from '../types';
import { heroTender } from '../hero';
import { dg1Records, dg2Records, fit, outcomes, type Dg1Tuple, type Dg2Tuple, type OutcomeTuple } from '../build';

/**
 * Corniche Lattice MEP LLC (tenant B): a Dubai MEP contractor with no Saudi
 * registrations, watching Etimad because it plans to enter KSA in 2026
 * (gcc-demo-data §2.3, §5.2). On the hero tender a decent weighted score is
 * overridden by the PQ-fail cap.
 */

const AED = (amount: number) => ({ amount, ccy: 'AED' as const });

const CREDENTIALS: Credential[] = [
  { id: 'corniche-licence', kind: 'cr', label: 'Dubai trade licence: MEP contracting', number: 'DED-xxxxxx', field: 'MEP contracting', country: 'AE',
    issuer: 'Dubai trade licensing authority', validTo: '2026-11-30', ownerId: 'corniche.comp' },
  { id: 'corniche-class-dm', kind: 'classification', label: 'Dubai Municipality contractor classification: MEP, unlimited', field: 'MEP', grade: 1, country: 'AE',
    issuer: 'Dubai Municipality', validTo: '2027-03-31', ownerId: 'corniche.hot' },
  { id: 'corniche-class-ad', kind: 'classification', label: 'Abu Dhabi contractor classification: MEP, first grade', field: 'MEP', grade: 1, country: 'AE',
    issuer: 'Abu Dhabi contractor classification', validTo: '2026-12-31', ownerId: 'corniche.hot' },
  { id: 'corniche-chamber', kind: 'chamber', label: 'Dubai Chamber membership', country: 'AE', issuer: 'Dubai Chamber', validTo: '2026-10-31', ownerId: 'corniche.coord' },
  { id: 'corniche-vat', kind: 'vat', label: 'UAE VAT registration', number: '100xxxxxxxx0003', country: 'AE', issuer: 'Federal Tax Authority', validTo: null, ownerId: 'corniche.fin' },
  { id: 'corniche-icv', kind: 'lc-baseline', label: 'In-Country Value (ICV) certificate', score: 38, country: 'AE', issuer: 'UAE In-Country Value programme', validTo: '2026-08-31', ownerId: 'corniche.comm' },
  { id: 'corniche-iso', kind: 'iso', label: 'ISO 9001 / 14001 / 45001', issuer: 'Accredited certification body', validTo: '2027-01-31', ownerId: 'corniche.comp' },
  { id: 'corniche-civil-defence', kind: 'avl', label: 'Civil Defence approved fire and life safety contractor', country: 'AE', issuer: 'Civil Defence', validTo: '2026-09-30', ownerId: 'corniche.coord' },
];

const OUTCOMES: OutcomeTuple[] = [
  ['CO-O01', 'Abu Dhabi school cluster MEP', 'Buildings MEP', 'semi-government', 324_000_000, '2024-12-26', '2025-03-12', 'lost', 'price', 16],
  ['CO-O02', 'Dubai mall extension MEP', 'Buildings MEP', 'semi-government', 494_000_000, '2025-01-30', '2025-03-31', 'lost', 'price', 55],
  ['CO-O03', 'Al Ain hospital MEP works', 'Buildings MEP', 'semi-government', 496_000_000, '2025-01-20', '2025-04-15', 'lost', 'technical', 36],
  ['CO-O04', 'Business Bay office tower MEP', 'Buildings MEP', 'government', 374_000_000, '2025-01-27', '2025-05-02', 'won', null, 77],
  ['CO-O05', 'Sharjah residential towers MEP', 'Buildings MEP', 'private', 332_000_000, '2025-03-03', '2025-05-19', 'lost', 'price', 59],
  ['CO-O06', 'Ajman civic centre MEP', 'Buildings MEP', 'semi-government', 519_000_000, '2025-03-03', '2025-06-05', 'lost', 'price', 25],
  ['CO-O07', 'Abu Dhabi museum fit-out', 'Fit-out', 'semi-government', 272_000_000, '2025-04-08', '2025-06-23', 'lost', 'pq', 43],
  ['CO-O08', 'Dubai airport lounge fit-out', 'Fit-out', 'government', 260_000_000, '2025-05-07', '2025-07-09', 'lost', 'other', 35],
  ['CO-O09', 'Downtown hotel refurbishment', 'Fit-out', 'government', 290_000_000, '2025-04-29', '2025-07-28', 'lost', 'pq', 21],
  ['CO-O10', 'Dubai Creek district cooling plant', 'District cooling', 'government', 380_000_000, '2025-05-26', '2025-08-12', 'won', null, 62],
  ['CO-O11', 'Abu Dhabi island district cooling network', 'District cooling', 'private', 468_000_000, '2025-05-28', '2025-08-29', 'lost', 'price', 18],
  ['CO-O12', 'Sharjah district cooling, Phase 2', 'District cooling', 'government', 77_000_000, '2025-07-01', '2025-09-15', 'lost', 'price', 17],
  ['CO-O13', 'Ras Al Khaimah hospital MEP', 'Buildings MEP', 'private', 501_000_000, '2025-07-29', '2025-10-02', 'won', null, 63],
  ['CO-O14', 'Fujairah port offices MEP', 'Buildings MEP', 'government', 501_000_000, '2025-08-08', '2025-10-20', 'won', null, 57],
  ['CO-O15', 'Dubai data centre MEP', 'Buildings MEP', 'government', 294_000_000, '2025-09-04', '2025-11-05', 'lost', 'price', 64],
  ['CO-O16', 'Jumeirah villa community MEP', 'Buildings MEP', 'private', 319_000_000, '2025-08-25', '2025-11-24', 'lost', 'technical', 64],
  ['CO-O17', 'Abu Dhabi university labs MEP', 'Buildings MEP', 'semi-government', 268_000_000, '2025-09-18', '2025-12-09', 'won', null, 72],
  ['CO-O18', 'Dubai metro depot MEP', 'Buildings MEP', 'private', 146_000_000, '2025-09-17', '2025-12-26', 'lost', 'technical', 58],
  ['CO-O19', 'Al Barsha hotel fit-out', 'Fit-out', 'government', 287_000_000, '2025-10-06', '2026-01-12', 'lost', 'price', 53],
  ['CO-O20', 'Dubai South district cooling plant', 'District cooling', 'semi-government', 422_000_000, '2025-10-28', '2026-01-29', 'lost', 'other', 32],
  ['CO-O21', 'Sharjah airport extension MEP', 'Buildings MEP', 'semi-government', 436_000_000, '2025-11-28', '2026-02-16', 'won', null, 60],
  ['CO-O22', 'Dubai Marina towers chilled water', 'District cooling', 'semi-government', 248_000_000, '2025-12-23', '2026-03-04', 'lost', 'local-content', 27],
];

const DG1_HISTORY: Dg1Tuple[] = [
  ['T-2025-402', 'Abu Dhabi clinic MEP', 'pursue', '2025-12-09T09:00', 'corniche.bid', 'pursue', true, []],
  ['T-2025-406', 'Dubai hotel tower MEP', 'pursue', '2025-12-17T11:13', 'corniche.bid', 'pursue', true, []],
  ['T-2025-410', 'District cooling programme, Phase 2', 'hold', '2025-12-25T13:26', 'corniche.hot', 'conditions', true, ['information-requested'], 'Finance to confirm facility headroom'],
  ['T-2026-012', 'Villa maintenance framework', 'discard', '2026-01-01T15:39', 'corniche.hot', 'discard', true, ['out-of-scope']],
  ['T-2026-013', 'Warehouse fire protection retrofit', 'discard', '2026-01-09T10:52', 'corniche.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-021', 'Mall escalator replacement', 'discard', '2026-01-19T12:05', 'corniche.bid', 'discard', true, ['below-value']],
  ['T-2026-023', 'Labour camp MEP', 'discard', '2026-01-26T14:18', 'corniche.hot', 'discard', true, ['pq-fail']],
  ['T-2026-029', 'Sharjah university MEP', 'pursue', '2026-01-28T11:40', 'corniche.bid', 'pursue', true, []],
  ['T-2026-040', 'School canteen fit-out', 'discard', '2026-02-02T09:31', 'corniche.bid', 'discard', true, ['insufficient-time']],
  ['T-2026-046', 'Airport cargo shed electrical', 'discard', '2026-02-10T11:44', 'corniche.bid', 'discard', true, ['capacity']],
  ['T-2026-044', 'Dubai district cooling plant, 30,000 TR', 'pursue', '2026-02-17T10:20', 'corniche.bid', 'pursue', true, []],
  ['T-2026-060', 'Clinic fit-out, Sharjah', 'discard', '2026-02-17T13:57', 'corniche.hot', 'discard', false, ['out-of-scope'], 'Recorded late: decider travelling'],
  ['T-2026-091', 'Parking structure ventilation', 'discard', '2026-02-25T15:10', 'corniche.bid', 'discard', true, ['below-value']],
  ['T-2026-093', 'Office refurbishment, Deira', 'discard', '2026-03-05T10:23', 'corniche.bid', 'discard', true, ['out-of-scope']],
];

const DG2_HISTORY: Dg2Tuple[] = [
  ['T-2025-194', 'Jumeirah villa community MEP', '2025-08-11T11:00', 'bid', true, false],
  ['T-2025-304', 'District cooling programme, Phase 1', '2025-09-16T12:30', 'no-bid', true, false],
  ['T-2025-157', 'Al Barsha hotel fit-out', '2025-09-22T11:00', 'bid', true, false],
  ['T-2025-120', 'Dubai Marina towers chilled water', '2025-12-09T11:00', 'bid', true, false],
];

const DG1 = dg1Records(DG1_HISTORY);
function dg1Of(tenderId: string) {
  const r = DG1.find((d) => d.tenderId === tenderId);
  if (!r) throw new Error(`Corniche seed: no DG1 record for ${tenderId}`);
  return r;
}

const REGISTER: GccTender[] = [
  heroTender({
    sourceId: 'etimad-watch',
    sourceDetail: 'Etimad public listing (KSA entry watch); booklet shared by a KSA contact',
    bidManagerId: 'corniche.bid',
    stageNote: 'Captured by the KSA entry watch',
    intake: { capturedAt: '2026-03-08T08:17', loggedAt: '2026-03-08T09:04', disposition: 'shortlisted' },
    conflictsRaisedAt: '2026-03-08T09:04',
    fit: fit([
      [5, 'MEP content is strong, but process and civil works are outside the company\'s scope', 'Capability profile'],
      [8, 'Inside the preferred value band once converted', 'Platform estimate; Fit model & rules'],
      [2, 'No Saudi registration, classification or STP as prime', 'Eligibility check against the credential vault'],
      [5, 'KSA: no presence yet', 'Company profile: offices'],
      [6, 'New client', 'Client history'],
      [6, 'Standard Saudi government terms', 'Extraction'],
      [9, 'Buildings MEP team has room', 'Capacity: Buildings MEP tendering team'],
      [7, 'Headroom covers the initial guarantee', 'Bank guarantee facility'],
      [10, 'KSA entry is the 2026 strategic priority', 'Strategy: 2026 plan'],
    ]),
  }),
  {
    id: 'T-2026-061', title: 'Abu Dhabi hospital MEP package', shortTitle: 'Abu Dhabi hospital MEP', issuer: 'Crescent Bay Health Holding', issuerIsReal: false,
    country: 'United Arab Emirates', city: 'Abu Dhabi', sector: 'Buildings MEP', sourceId: 'abudhabi-portal', sourceDetail: 'Abu Dhabi government procurement portal', procurement: 'open',
    value: { amount: 185_000_000, ccy: 'AED', basis: 'estimate', band: [165_000_000, 205_000_000] },
    stage: 'S1', stageNote: 'Validated; waiting for DG1', bidManagerId: 'corniche.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'questions', date: '2026-03-19' }, { kind: 'submission', date: '2026-04-21', time: '14:00' }],
    fit: fit([
      [9, 'Hospital MEP: a core buildings line', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [8, 'Meets the classification and experience asked for', 'Eligibility check'],
      [8, 'Abu Dhabi branch', 'Company profile: offices'],
      [6, 'New client; healthcare developer', 'Client history'],
      [6, 'Medical gas and commissioning liabilities', 'Extraction'],
      [7, 'Buildings MEP team has room', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [5, 'Healthcare is a steady market', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T07:40', loggedAt: '2026-03-08T07:52', disposition: 'shortlisted' },
  },
  {
    id: 'T-2026-063', title: 'Dubai hotel fit-out, 240 keys', shortTitle: 'Dubai hotel fit-out', issuer: 'Gulfshore Hospitality Developments', issuerIsReal: false,
    country: 'United Arab Emirates', city: 'Dubai', sector: 'Fit-out', sourceId: 'mail', sourceDetail: 'Email from a developer\'s project manager', procurement: 'limited',
    value: { amount: 42_000_000, ccy: 'AED', basis: 'estimate' },
    stage: 'S1', stageNote: 'Low fit: flagged for a person to decide', bidManagerId: 'corniche.bid', invited: [],
    // Submission on the first working day after the expected Eid al-Fitr closure (20–23 Mar).
    keyDates: [{ kind: 'published', date: '2026-03-07' }, { kind: 'submission', date: '2026-03-24', time: '12:00' }],
    fit: fit([
      [4, 'Interior fit-out with light MEP', 'Capability profile'],
      [2, 'Near the bottom of the value band', 'Platform estimate'],
      [6, 'No classification needed', 'Eligibility check'],
      [9, 'Dubai', 'Company profile: offices'],
      [3, 'Private developer; slow payments reported', 'Client history'],
      [3, 'Uncapped delay damages', 'Extraction'],
      [5, 'Two-week bid period', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [2, 'Fit-out is being run down', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T09:10', loggedAt: '2026-03-08T09:18', disposition: 'low-fit' },
  },
  {
    id: 'T-2026-044', title: 'Dubai district cooling plant, 30,000 TR', shortTitle: 'Dubai district cooling, 30,000 TR', issuer: 'Emirates Cooling Utilities Company', issuerIsReal: false,
    country: 'United Arab Emirates', city: 'Dubai', sector: 'District cooling', sourceId: 'dubai-portal', sourceDetail: 'Dubai government e-procurement portal', procurement: 'open',
    value: { amount: 260_000_000, ccy: 'AED', basis: 'estimate', band: [230_000_000, 290_000_000] },
    stage: 'S2', stageNote: 'Stage 2: RFQs out', bidManagerId: 'corniche.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-02-16' }, { kind: 'submission', date: '2026-04-09', time: '14:00' }],
    fit: fit([
      [9, 'District cooling plant: a core line', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [9, 'Dubai', 'Company profile: offices'],
      [7, 'Utility client; payments on time', 'Client history'],
      [6, 'Performance guarantee on plant efficiency', 'Extraction'],
      [7, 'Team committed', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Cooling is a growth line', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-02-16T12:05', loggedAt: '2026-02-16T12:16', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-044'),
  },
  {
    id: 'T-2026-029', title: 'Sharjah university MEP works', shortTitle: 'Sharjah university MEP', issuer: 'Sharjah Campus Development Office', issuerIsReal: false,
    country: 'United Arab Emirates', city: 'Sharjah', sector: 'Buildings MEP', sourceId: 'mail', sourceDetail: 'Invitation by email', procurement: 'limited',
    value: { amount: 210_000_000, ccy: 'AED', basis: 'estimate', band: [190_000_000, 230_000_000] },
    stage: 'S3', stageNote: 'Stage 3: pack in preparation', bidManagerId: 'corniche.bid', invited: ['corniche.comm', 'corniche.plan', 'corniche.fin'],
    keyDates: [{ kind: 'published', date: '2026-01-27' }, { kind: 'submission', date: '2026-04-07', time: '12:00' }],
    fit: fit([
      [9, 'University buildings MEP', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [8, 'Sharjah: served from Dubai', 'Company profile: offices'],
      [7, 'Government-backed developer', 'Client history'],
      [6, 'Standard terms', 'Extraction'],
      [7, 'Team committed', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [6, 'Education is a steady market', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-27T13:10', loggedAt: '2026-01-27T13:22', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-029'),
  },
];

export const CORNICHE: TenantSeed = {
  key: 'corniche',
  company: {
    hq: 'Dubai; branch in Abu Dhabi',
    employees: 2_600,
    fyEnd: '12-31',
    financials: [
      { fy: 2022, turnover: AED(1_020_000_000), audited: true },
      { fy: 2023, turnover: AED(1_100_000_000), audited: true },
      { fy: 2024, turnover: AED(1_180_000_000), audited: true, netWorth: AED(380_000_000), currentRatio: 1.29 },
      // Audited after the hero opens on 10 May, so PQ-11 reads the FY2022–FY2024 accounts only.
      { fy: 2025, turnover: AED(1_240_000_000), audited: false, auditDate: '2026-05-19' },
    ],
  },
  fit: {
    weights: { scope: 15, size: 10, eligibility: 15, geography: 10, client: 10, terms: 10, team: 10, facility: 5, strategy: 15 },
    pursueAt: 65,
    conditionsFrom: 45,
    band: { min: AED(50_000_000), max: AED(600_000_000) },
    singleLimit: AED(700_000_000),
    dg2Referral: AED(40_000_000),
    safeDeliveryPct: 75,
  },
  credentials: CREDENTIALS,
  projects: [
    { id: 'corniche-p1', title: 'Dubai South STP: MEP package', client: 'Coastal Wastewater Projects Company', country: 'AE', capacityM3d: 90_000, tertiary: false,
      value: AED(78_000_000), completed: '2021-05-31', role: 'subcontractor', scope: 'Electrical and HVAC works for the plant buildings' },
    { id: 'corniche-p2', title: 'Al Ain STP expansion: MEP package', client: 'Inland Sewerage Services Company', country: 'AE', capacityM3d: 120_000, tertiary: true,
      value: AED(95_000_000), completed: '2023-02-28', role: 'subcontractor', scope: 'MEP for process buildings and the control room' },
    { id: 'corniche-p3', title: 'Abu Dhabi specialist hospital MEP', client: 'Crescent Bay Health Holding', country: 'AE', value: AED(240_000_000),
      completed: '2022-10-31', role: 'prime', scope: 'Full MEP including medical gases' },
    { id: 'corniche-p4', title: 'Dubai district cooling plant, 25,000 TR', client: 'Emirates Cooling Utilities Company', country: 'AE', value: AED(210_000_000),
      completed: '2024-06-30', role: 'prime', scope: 'Plant, thermal storage and distribution' },
  ],
  partners: [],
  teams: [
    {
      id: 'corniche-mep', name: 'Buildings MEP tendering team', sector: 'Buildings MEP', engineers: 5, estimators: 2, planners: 1, hoursPerWeek: 40,
      // 110 + 95 = 205 h a week against 320 h available: 64%.
      commitments: [
        { tenderId: 'T-2026-044', hoursPerWeek: 110, from: '2026-02-17', to: '2026-04-09', note: 'Sourcing and pricing' },
        { tenderId: 'T-2026-029', hoursPerWeek: 95, from: '2026-01-28', to: '2026-04-07', note: 'Stage 3 pack, then proposal' },
      ],
    },
  ],
  facility: {
    limit: AED(380_000_000),
    utilised: AED(196_000_000),
    committed: [
      { label: 'Bid bond: Abu Dhabi clinic MEP (submitted)', tenderId: 'T-2025-402', kind: 'bid bond', amount: AED(12_000_000) },
      { label: 'Bid bond: Dubai hotel tower MEP (submitted)', tenderId: 'T-2025-406', kind: 'bid bond', amount: AED(12_400_000) },
    ],
    asOf: '2026-03-04',
    confirmedById: 'corniche.fin',
  },
  sources: [
    { id: 'dubai-portal', name: 'Dubai government e-procurement portal', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:50' },
    { id: 'abudhabi-portal', name: 'Abu Dhabi government procurement portal', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:45' },
    { id: 'etimad-watch', name: 'Etimad (KSA entry watch)', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:55', note: 'Public listings only: no Saudi registration' },
    { id: 'mail', name: 'tenders@corniche.example', kind: 'mailbox', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:58' },
    { id: 'manual', name: 'Manual upload', kind: 'manual', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T10:00' },
  ],
  reconciliation: { at: '2026-03-08T06:00', sources: 5, missed: 0 },
  intakeToday: [
    { id: 'IN-0308-01', sourceId: 'abudhabi-portal', tenderId: 'T-2026-061', ref: 'CBHH/MEP/2026/004', title: 'Abu Dhabi hospital MEP package', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T07:40', loggedAt: '2026-03-08T07:52', disposition: 'shortlisted' },
    { id: 'IN-0308-02', sourceId: 'etimad-watch', tenderId: 'T-2026-118', ref: 'ECWS/PRJ/2026/0147', title: 'Expansion of Al-Rawdah STP, Phase 2', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T08:52', loggedAt: '2026-03-08T09:04', disposition: 'shortlisted' },
    { id: 'IN-0308-03', sourceId: 'mail', tenderId: 'T-2026-063', ref: 'GHD-FO-118', title: 'Dubai hotel fit-out, 240 keys', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T09:10', loggedAt: '2026-03-08T09:18', disposition: 'low-fit' },
  ],
  register: REGISTER,
  historySeed: { outcomes: outcomes('AED', OUTCOMES), dg1: DG1, dg2: dg2Records(DG2_HISTORY) },
};
