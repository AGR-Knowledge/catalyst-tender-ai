import type { Credential, GccTender, TenantSeed } from '../types';
import { heroTender } from '../hero';
import { TIHAMA } from '../partners';
import { dg1Records, dg2Records, fit, outcomes, type Dg1Tuple, type Dg2Tuple, type OutcomeTuple } from '../build';

/**
 * Dafna Keystone Civil W.L.L. (tenant C): a Doha civil and utilities
 * contractor whose Riyadh branch holds the Saudi registrations, at Water &
 * sewage works Grade 2 (gcc-demo-data §2.4, §5.2). Alone it fails four hero PQ
 * lines; with Tihama Hydro Works as JV lead at 60% it passes them.
 */

const QAR = (amount: number) => ({ amount, ccy: 'QAR' as const });

const CREDENTIALS: Credential[] = [
  // Qatar
  { id: 'dafna-cr-qa', kind: 'cr', label: 'Qatar Commercial Registration: civil contracting', number: 'CR xxxxx', field: 'Civil contracting', country: 'QA',
    issuer: 'Ministry of Commerce and Industry (Qatar)', validTo: '2027-01-31', ownerId: 'dafna.comp' },
  { id: 'dafna-class-qa', kind: 'classification', label: 'Qatar contractor classification: civil works, first grade', field: 'Civil works', grade: 1, country: 'QA',
    issuer: 'Qatar contractor classification', validTo: '2026-12-31', ownerId: 'dafna.hot' },
  { id: 'dafna-chamber-qa', kind: 'chamber', label: 'Qatar Chamber membership', country: 'QA', issuer: 'Qatar Chamber', validTo: '2026-12-31', ownerId: 'dafna.coord' },
  { id: 'dafna-iso', kind: 'iso', label: 'ISO 9001 / 14001 / 45001', issuer: 'Accredited certification body', validTo: '2027-05-31', ownerId: 'dafna.comp' },
  // Riyadh branch
  { id: 'dafna-cr-sa', kind: 'cr', label: 'Saudi Commercial Registration (Riyadh branch): water and sewage works', number: '1010xxxxxx', field: 'Water & sewage works', country: 'SA',
    issuer: 'Ministry of Commerce', validTo: '2027-03-31', ownerId: 'dafna.comp', note: 'Branch of a foreign company' },
  { id: 'dafna-zakat', kind: 'zakat', label: 'Zakat certificate (ZATCA), Riyadh branch', country: 'SA', issuer: 'Zakat, Tax and Customs Authority', validTo: '2026-07-31', ownerId: 'dafna.fin' },
  { id: 'dafna-gosi', kind: 'gosi', label: 'GOSI certificate, Riyadh branch', country: 'SA', issuer: 'General Organization for Social Insurance', validTo: '2026-09-30', ownerId: 'dafna.hr' },
  { id: 'dafna-chamber-sa', kind: 'chamber', label: 'Chamber of Commerce membership: Riyadh', country: 'SA', issuer: 'Riyadh Chamber', validTo: '2026-12-31', ownerId: 'dafna.coord' },
  { id: 'dafna-class-sa', kind: 'classification', label: 'Contractor classification: Water & sewage works', field: 'Water & sewage works', grade: 2, country: 'SA',
    issuer: 'Contractor Classification Agency', validTo: '2027-06-30', ownerId: 'dafna.hot' },
  { id: 'dafna-sca', kind: 'contractors-authority', label: 'Saudi Contractors Authority membership', country: 'SA', issuer: 'Saudi Contractors Authority', validTo: '2026-12-31', ownerId: 'dafna.coord' },
  { id: 'dafna-saudization', kind: 'saudization', label: 'Saudization certificate: Medium Green band', country: 'SA', issuer: 'Ministry of Human Resources and Social Development', validTo: '2026-08-31', ownerId: 'dafna.hr' },
  { id: 'dafna-vat-sa', kind: 'vat', label: 'VAT registration (Riyadh branch)', country: 'SA', issuer: 'Zakat, Tax and Customs Authority', validTo: null, ownerId: 'dafna.fin' },
  { id: 'dafna-lc', kind: 'lc-baseline', label: 'Local content baseline certificate (Riyadh branch)', score: 42, country: 'SA', issuer: 'Local Content and Government Procurement Authority', validTo: '2026-11-30', ownerId: 'dafna.comm' },
];

const OUTCOMES: OutcomeTuple[] = [
  ['DA-O01', 'Al Rayyan storm drainage', 'Utility networks', 'government', 257_000_000, '2024-12-22', '2025-03-12', 'lost', 'price', 49],
  ['DA-O02', 'Umm Salal sewer network', 'Utility networks', 'government', 243_000_000, '2025-01-20', '2025-04-02', 'won', null, 48],
  ['DA-O03', 'Al Khor pump station upgrade', 'Pump stations', 'semi-government', 181_000_000, '2025-02-18', '2025-04-23', 'lost', 'other', 63],
  ['DA-O04', 'Doha industrial area roads and utilities', 'Civil works', 'government', 58_000_000, '2025-03-09', '2025-05-14', 'lost', 'technical', 28],
  ['DA-O05', 'Mesaieed utility corridor', 'Utility networks', 'government', 95_000_000, '2025-03-12', '2025-06-04', 'won', null, 54],
  ['DA-O06', 'Al Daayen treated effluent main', 'Utility networks', 'private', 281_000_000, '2025-03-26', '2025-06-25', 'lost', 'price', 61],
  ['DA-O07', 'West Bay deep sewer shaft works', 'Civil works', 'semi-government', 205_000_000, '2025-04-13', '2025-07-16', 'lost', 'other', 22],
  ['DA-O08', 'Al Shamal pumping station', 'Pump stations', 'government', 119_000_000, '2025-05-08', '2025-08-06', 'won', null, 65],
  ['DA-O09', 'Doha port area drainage', 'Civil works', 'semi-government', 187_000_000, '2025-06-09', '2025-08-27', 'lost', 'price', 28],
  ['DA-O10', 'Al Wakra foul water pumping main', 'Utility networks', 'government', 108_000_000, '2025-07-03', '2025-09-17', 'lost', 'price', 42],
  ['DA-O11', 'Education district utilities', 'Utility networks', 'private', 56_000_000, '2025-07-02', '2025-10-08', 'lost', 'price', 44],
  ['DA-O12', 'Al Rayyan pump station refurbishment', 'Pump stations', 'private', 156_000_000, '2025-07-31', '2025-10-29', 'lost', 'pq', 36],
  ['DA-O13', 'Lusail marina utilities', 'Utility networks', 'semi-government', 347_000_000, '2025-09-11', '2025-11-19', 'lost', 'local-content', 46],
  ['DA-O14', 'Industrial area stormwater outfall', 'Civil works', 'private', 150_000_000, '2025-09-02', '2025-12-10', 'lost', 'price', 41],
  ['DA-O15', 'Doha North trunk sewer', 'Utility networks', 'government', 348_000_000, '2025-10-02', '2025-12-31', 'lost', 'technical', 29],
  ['DA-O16', 'Simaisma pump station', 'Pump stations', 'semi-government', 158_000_000, '2025-10-19', '2026-01-21', 'won', null, 78],
  ['DA-O17', 'Al Khor utility diversions', 'Civil works', 'government', 334_000_000, '2025-11-20', '2026-02-11', 'won', null, 37],
  ['DA-O18', 'Doha South groundwater control', 'Civil works', 'government', 85_000_000, '2025-12-14', '2026-03-04', 'lost', 'local-content', 48],
];

const DG1_HISTORY: Dg1Tuple[] = [
  ['T-2025-422', 'Al Rayyan utility corridor', 'pursue', '2025-12-29T09:00', 'dafna.bid', 'pursue', true, []],
  ['T-2025-431', 'Utility networks programme, Phase 2', 'hold', '2025-12-21T11:13', 'dafna.hot', 'conditions', true, ['information-requested'], 'Finance to confirm facility headroom'],
  ['T-2025-432', 'Street lighting maintenance', 'discard', '2025-12-31T13:26', 'dafna.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-012', 'Mesaieed pump station upgrade', 'pursue', '2026-01-08T10:10', 'dafna.bid', 'pursue', true, []],
  ['T-2026-035', 'Landscaping and irrigation', 'discard', '2026-01-11T15:39', 'dafna.hot', 'discard', true, ['out-of-scope']],
  ['T-2026-015', 'Umm Salal pumping main', 'pursue', '2026-01-12T11:25', 'dafna.bid', 'pursue', true, []],
  ['T-2026-067', 'Temporary site offices', 'discard', '2026-01-21T10:52', 'dafna.bid', 'discard', true, ['below-value']],
  ['T-2026-068', 'Road marking contract', 'discard', '2026-02-01T12:05', 'dafna.bid', 'discard', true, ['pq-fail']],
  ['T-2026-073', 'School car parks', 'discard', '2026-02-11T14:18', 'dafna.hot', 'discard', false, ['insufficient-time'], 'Recorded late: decider travelling'],
  ['T-2026-019', 'Al Wakra sewer rehabilitation', 'pursue', '2026-02-19T09:30', 'dafna.bid', 'pursue', true, []],
  ['T-2026-082', 'Pipe supply framework', 'discard', '2026-02-22T09:31', 'dafna.bid', 'discard', true, ['capacity']],
  ['T-2026-091', 'Survey services', 'discard', '2026-03-05T11:44', 'dafna.bid', 'discard', true, ['out-of-scope']],
];

const DG2_HISTORY: Dg2Tuple[] = [
  ['T-2025-303', 'Utility networks programme, Phase 1', '2025-09-16T12:30', 'no-bid', true, false],
  ['T-2025-157', 'Doha North trunk sewer', '2025-09-18T11:00', 'bid', true, false],
  ['T-2025-120', 'Doha South groundwater control', '2025-11-30T11:00', 'bid', true, false],
];

const DG1 = dg1Records(DG1_HISTORY);
function dg1Of(tenderId: string) {
  const r = DG1.find((d) => d.tenderId === tenderId);
  if (!r) throw new Error(`Dafna seed: no DG1 record for ${tenderId}`);
  return r;
}

const REGISTER: GccTender[] = [
  heroTender({
    sourceId: 'etimad-branch',
    sourceDetail: 'Etimad, through the Riyadh branch account; booklet bought through SADAD',
    bidManagerId: 'dafna.bid',
    stageNote: 'Captured through the Riyadh branch',
    intake: { capturedAt: '2026-03-08T07:20', purchasedAt: '2026-03-08T08:10', loggedAt: '2026-03-08T08:26', disposition: 'shortlisted' },
    conflictsRaisedAt: '2026-03-08T08:26',
    fit: fit([
      [9, 'STP civil and mechanical works: close to the company\'s utilities work', 'Capability profile'],
      [7, 'Above the preferred value band once converted, but below the single-contract limit', 'Platform estimate; Fit model & rules'],
      [5, 'Fails four PQ lines alone; a partner on the list closes them in a JV', 'Eligibility check against the credential vault'],
      [8, 'Riyadh branch in place', 'Company profile: offices'],
      [7, 'New client; public utility with a sound payment record', 'Client history'],
      [6, 'Standard Saudi government terms', 'Extraction'],
      [7, 'Utilities team can take it on', 'Capacity: Utilities tendering team'],
      [7, 'Headroom covers the initial guarantee', 'Bank guarantee facility'],
      [9, 'Growing the KSA branch is a 2026 priority', 'Strategy: 2026 plan'],
    ]),
  }),
  {
    id: 'T-2026-033', title: 'Lusail utility corridor, Package 2', shortTitle: 'Lusail utility corridor, Pkg 2', issuer: 'Northern Growth Corridor Authority', issuerIsReal: false,
    country: 'Qatar', city: 'Lusail', sector: 'Utility networks', sourceId: 'monaqasat', sourceDetail: 'Monaqasat (Ministry of Finance)', procurement: 'open',
    value: { amount: 240_000_000, ccy: 'QAR', basis: 'estimate', band: [215_000_000, 265_000_000] },
    stage: 'S1', stageNote: 'Validated; waiting for DG1', bidManagerId: 'dafna.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'questions', date: '2026-03-24' }, { kind: 'submission', date: '2026-04-28', time: '12:00' }],
    fit: fit([
      [9, 'Multi-utility corridor: a core line', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [8, 'Meets the classification and experience asked for', 'Eligibility check'],
      [9, 'Doha area', 'Company profile: offices'],
      [6, 'New authority; payments not yet known', 'Client history'],
      [6, 'Interface risk with other packages', 'Extraction'],
      [5, 'Utilities team busy until April', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [6, 'Keeps the Qatar order book full', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T07:05', loggedAt: '2026-03-08T07:14', disposition: 'shortlisted' },
  },
  {
    id: 'T-2026-034', title: 'Doha pump station upgrade', shortTitle: 'Doha pump station upgrade', issuer: 'Doha Drainage Works Authority', issuerIsReal: false,
    country: 'Qatar', city: 'Doha', sector: 'Pump stations', sourceId: 'monaqasat', sourceDetail: 'Monaqasat (Ministry of Finance)', procurement: 'open',
    value: { amount: 68_000_000, ccy: 'QAR', basis: 'estimate' },
    stage: 'S1', stageNote: 'Validated; waiting for DG1', bidManagerId: 'dafna.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'submission', date: '2026-04-14', time: '12:00' }],
    fit: fit([
      [8, 'Pump station civil and mechanical upgrade', 'Capability profile'],
      [5, 'Lower part of the value band', 'Platform estimate'],
      [7, 'Meets the PQ lines', 'Eligibility check'],
      [9, 'Doha', 'Company profile: offices'],
      [6, 'Payments sometimes slow', 'Client history'],
      [5, 'Works in a live station', 'Extraction'],
      [5, 'Utilities team busy until April', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [4, 'Routine work', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T09:02', loggedAt: '2026-03-08T09:10', disposition: 'shortlisted' },
  },
  {
    id: 'T-2026-019', title: 'Al Wakra sewer rehabilitation', shortTitle: 'Al Wakra sewer rehab', issuer: 'Southern Municipalities Drainage Office', issuerIsReal: false,
    country: 'Qatar', city: 'Al Wakra', sector: 'Utility networks', sourceId: 'monaqasat', sourceDetail: 'Monaqasat (Ministry of Finance)', procurement: 'open',
    value: { amount: 150_000_000, ccy: 'QAR', basis: 'estimate', band: [135_000_000, 165_000_000] },
    stage: 'S2', stageNote: 'Stage 2: RFQs out', bidManagerId: 'dafna.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-02-18' }, { kind: 'submission', date: '2026-04-20', time: '12:00' }],
    fit: fit([
      [9, 'Sewer rehabilitation: a core line', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [9, 'Al Wakra: near Doha', 'Company profile: offices'],
      [7, 'Municipal client; payments on time', 'Client history'],
      [6, 'Traffic management in live streets', 'Extraction'],
      [6, 'Team committed', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [6, 'Keeps the Qatar order book full', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-02-18T10:30', loggedAt: '2026-02-18T10:41', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-019'),
  },
  {
    id: 'T-2026-012', title: 'Mesaieed pump station upgrade', shortTitle: 'Mesaieed pump station upgrade', issuer: 'Doha Drainage Works Authority', issuerIsReal: false,
    country: 'Qatar', city: 'Mesaieed', sector: 'Pump stations', sourceId: 'monaqasat', sourceDetail: 'Monaqasat (Ministry of Finance)', procurement: 'open',
    value: { amount: 240_000_000, ccy: 'QAR', basis: 'estimate' },
    stage: 'later', stageNote: 'Submitted 26 Feb; best and final offer requested', bidManagerId: 'dafna.bid', invited: [],
    keyDates: [{ kind: 'submission', date: '2026-02-26', time: '12:00' }, { kind: 'validity-end', date: '2026-05-27' }],
    fit: fit([
      [8, 'Pump station works', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Met every PQ line', 'Eligibility check'],
      [7, 'Mesaieed: 45 minutes from Doha', 'Company profile: offices'],
      [6, 'Payments sometimes slow', 'Client history'],
      [6, 'Standard terms', 'Extraction'],
      [6, 'Team could absorb it', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [5, 'Routine work', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-07T13:40', loggedAt: '2026-01-07T13:52', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-012'),
  },
  {
    id: 'T-2026-015', title: 'Umm Salal pumping main', shortTitle: 'Umm Salal pumping main', issuer: 'Northern Growth Corridor Authority', issuerIsReal: false,
    country: 'Qatar', city: 'Umm Salal', sector: 'Utility networks', sourceId: 'monaqasat', sourceDetail: 'Monaqasat (Ministry of Finance)', procurement: 'open',
    value: { amount: 290_000_000, ccy: 'QAR', basis: 'estimate' },
    stage: 'later', stageNote: 'Submitted 3 Mar; awaiting award', bidManagerId: 'dafna.bid', invited: [],
    keyDates: [{ kind: 'submission', date: '2026-03-03', time: '12:00' }, { kind: 'validity-end', date: '2026-06-01' }],
    fit: fit([
      [9, 'Large-diameter pumping main', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Met every PQ line', 'Eligibility check'],
      [8, 'Near Doha', 'Company profile: offices'],
      [6, 'New authority', 'Client history'],
      [6, 'Standard terms', 'Extraction'],
      [6, 'Team could absorb it', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [6, 'Keeps the Qatar order book full', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-11T12:10', loggedAt: '2026-01-11T12:21', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-015'),
  },
];

export const DAFNA: TenantSeed = {
  key: 'dafna',
  company: {
    hq: 'Doha; registered branch in Riyadh',
    employees: 1_900,
    fyEnd: '12-31',
    financials: [
      { fy: 2022, turnover: QAR(780_000_000), audited: true },
      { fy: 2023, turnover: QAR(815_000_000), audited: true },
      { fy: 2024, turnover: QAR(865_000_000), audited: true, netWorth: QAR(290_000_000), currentRatio: 1.22 },
      { fy: 2025, turnover: QAR(900_000_000), audited: false, auditDate: '2026-04-28' },
    ],
  },
  fit: {
    weights: { scope: 20, size: 15, eligibility: 20, geography: 10, client: 5, terms: 10, team: 10, facility: 5, strategy: 5 },
    pursueAt: 70,
    conditionsFrom: 50,
    band: { min: QAR(40_000_000), max: QAR(400_000_000) },
    singleLimit: QAR(450_000_000),
    dg2Referral: QAR(40_000_000),
    safeDeliveryPct: 70,
  },
  credentials: CREDENTIALS,
  projects: [
    { id: 'dafna-p1', title: 'North Doha STP expansion', client: 'Doha Drainage Works Authority', country: 'QA', capacityM3d: 110_000, tertiary: false,
      value: QAR(420_000_000), completed: '2020-09-30', role: 'prime', scope: 'Civil and mechanical works; no operation' },
    { id: 'dafna-p2', title: 'Al Rayyan utility corridor', client: 'Northern Growth Corridor Authority', country: 'QA', value: QAR(260_000_000),
      completed: '2023-03-31', role: 'prime', scope: 'Multi-utility corridor, 14 km' },
    { id: 'dafna-p3', title: 'Industrial area pump stations', client: 'Doha Drainage Works Authority', country: 'QA', value: QAR(95_000_000),
      completed: '2024-08-31', role: 'prime', scope: 'Three foul water pump stations' },
  ],
  partners: [TIHAMA],
  teams: [
    {
      id: 'dafna-utilities', name: 'Utilities tendering team', sector: 'Utility networks', engineers: 4, estimators: 1, planners: 1, hoursPerWeek: 40,
      // 120 + 28 + 25 = 173 h a week against 240 h available: 72%.
      commitments: [
        { tenderId: 'T-2026-019', hoursPerWeek: 120, from: '2026-02-19', to: '2026-04-20', note: 'Sourcing and pricing' },
        { tenderId: 'T-2026-012', hoursPerWeek: 28, from: '2026-02-26', to: '2026-04-30', note: 'Clarifications; best and final offer requested' },
        { tenderId: 'T-2026-015', hoursPerWeek: 25, from: '2026-03-03', to: '2026-04-30', note: 'Post-submission clarifications' },
      ],
    },
  ],
  facility: {
    limit: QAR(260_000_000),
    utilised: QAR(96_000_000),
    committed: [
      { label: 'Bid bond: Mesaieed pump station upgrade (submitted 26 Feb)', tenderId: 'T-2026-012', kind: 'bid bond', amount: QAR(4_800_000) },
      { label: 'Bid bond: Umm Salal pumping main (submitted 3 Mar)', tenderId: 'T-2026-015', kind: 'bid bond', amount: QAR(5_800_000) },
    ],
    asOf: '2026-03-03',
    confirmedById: 'dafna.fin',
  },
  sources: [
    { id: 'monaqasat', name: 'Monaqasat (Ministry of Finance)', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:55' },
    { id: 'etimad-branch', name: 'Etimad (Riyadh branch)', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:52' },
    { id: 'mail', name: 'tenders@dafna.example', kind: 'mailbox', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:58' },
    { id: 'manual', name: 'Manual upload', kind: 'manual', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T10:00' },
  ],
  reconciliation: { at: '2026-03-08T06:00', sources: 4, missed: 0 },
  intakeToday: [
    { id: 'IN-0308-01', sourceId: 'monaqasat', tenderId: 'T-2026-033', ref: 'NGCA/UC/2026/02', title: 'Lusail utility corridor, Package 2', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T07:05', loggedAt: '2026-03-08T07:14', disposition: 'shortlisted' },
    { id: 'IN-0308-02', sourceId: 'etimad-branch', tenderId: 'T-2026-118', ref: 'ECWS/PRJ/2026/0147', title: 'Expansion of Al-Rawdah STP, Phase 2', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T08:12', loggedAt: '2026-03-08T08:26', disposition: 'shortlisted' },
    { id: 'IN-0308-03', sourceId: 'monaqasat', tenderId: 'T-2026-034', ref: 'DDWA/PS/2026/011', title: 'Doha pump station upgrade', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T09:02', loggedAt: '2026-03-08T09:10', disposition: 'shortlisted' },
  ],
  register: REGISTER,
  historySeed: { outcomes: outcomes('QAR', OUTCOMES), dg1: DG1, dg2: dg2Records(DG2_HISTORY) },
};
