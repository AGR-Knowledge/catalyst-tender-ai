import type { Credential, GccTender, TenantSeed } from '../types';
import { heroTender } from '../hero';
import { dg1Records, dg2Records, fit, outcomes, type Dg1Tuple, type Dg2Tuple, type OutcomeTuple } from '../build';

/**
 * Batinah Waypoint Roads LLC (tenant D): an Omani roads contractor with no KSA
 * presence and no water experience (gcc-demo-data §2.5, §5.2). The hero
 * arrives by email from a prospective partner and scores low on size,
 * geography and eligibility; it is flagged for a person, never auto-discarded.
 * The Lebanese CDR roads tender is a real document. The scanned Arabic roads
 * tender is added by plan 012.
 */

const OMR = (amount: number) => ({ amount, ccy: 'OMR' as const });

const CREDENTIALS: Credential[] = [
  { id: 'batinah-cr', kind: 'cr', label: 'Oman Commercial Registration: roads and bridges contracting', number: 'CR 1xxxxxx', field: 'Roads and bridges', country: 'OM',
    issuer: 'Ministry of Commerce, Industry and Investment Promotion', validTo: '2027-02-28', ownerId: 'batinah.comp' },
  { id: 'batinah-class', kind: 'classification', label: 'Tender Board registration: roads and bridges, Excellent grade', field: 'Roads and bridges', country: 'OM',
    issuer: 'Tender Board', validTo: '2026-10-31', ownerId: 'batinah.hot', note: 'Excellent is the top grade' },
  { id: 'batinah-chamber', kind: 'chamber', label: 'Oman Chamber of Commerce and Industry membership', country: 'OM', issuer: 'Oman Chamber of Commerce and Industry', validTo: '2026-12-31', ownerId: 'batinah.coord' },
  { id: 'batinah-omanisation', kind: 'other', label: 'Omanisation compliance certificate', country: 'OM', issuer: 'Ministry of Labour', validTo: '2026-09-30', ownerId: 'batinah.hr' },
  { id: 'batinah-vat', kind: 'vat', label: 'Oman VAT registration', country: 'OM', issuer: 'Tax Authority', validTo: null, ownerId: 'batinah.fin' },
  { id: 'batinah-iso', kind: 'iso', label: 'ISO 9001 / 14001 / 45001', issuer: 'Accredited certification body', validTo: '2027-04-30', ownerId: 'batinah.comp' },
  { id: 'batinah-avl', kind: 'avl', label: 'Approved contractor: national roads programme', country: 'OM', issuer: 'Roads programme office', validTo: '2026-11-30', ownerId: 'batinah.coord' },
];

const OUTCOMES: OutcomeTuple[] = [
  ['BA-O01', 'Sohar port access road', 'Roads', 'government', 20_500_000, '2024-12-19', '2025-03-12', 'lost', 'price', 25],
  ['BA-O02', 'Batinah expressway link, section 5', 'Roads', 'semi-government', 35_500_000, '2024-12-23', '2025-03-27', 'won', null, 48],
  ['BA-O03', 'Saham wadi crossing bridges', 'Bridges', 'government', 29_500_000, '2025-01-19', '2025-04-13', 'won', null, 56],
  ['BA-O04', 'Liwa industrial estate roads', 'Roads', 'government', 27_100_000, '2025-01-22', '2025-04-27', 'won', null, 76],
  ['BA-O05', 'Shinas coastal road widening', 'Roads', 'private', 27_600_000, '2025-02-05', '2025-05-11', 'lost', 'other', 62],
  ['BA-O06', 'Rustaq mountain road improvement', 'Roads', 'semi-government', 36_300_000, '2025-02-16', '2025-05-25', 'lost', 'price', 47],
  ['BA-O07', 'Nizwa interchange', 'Roads', 'private', 9_500_000, '2025-03-13', '2025-06-09', 'lost', 'price', 22],
  ['BA-O08', 'Ibri bypass', 'Roads', 'semi-government', 35_500_000, '2025-04-06', '2025-06-24', 'lost', 'pq', 14],
  ['BA-O09', 'Barka flood protection earthworks', 'Earthworks', 'private', 24_600_000, '2025-04-28', '2025-07-09', 'won', null, 37],
  ['BA-O10', 'Sur coastal road', 'Roads', 'government', 2_900_000, '2025-04-28', '2025-07-24', 'lost', 'price', 28],
  ['BA-O11', 'Muscat airport link bridges', 'Bridges', 'government', 5_300_000, '2025-05-04', '2025-08-10', 'lost', 'price', 14],
  ['BA-O12', 'Sohar freezone earthworks', 'Earthworks', 'government', 35_300_000, '2025-06-08', '2025-08-24', 'lost', 'other', 51],
  ['BA-O13', 'Suwaiq internal roads', 'Roads', 'government', 5_800_000, '2025-06-25', '2025-09-07', 'won', null, 52],
  ['BA-O14', 'Buraimi truck route', 'Roads', 'government', 22_000_000, '2025-07-06', '2025-09-21', 'lost', 'pq', 58],
  ['BA-O15', 'Duqm access road, section 2', 'Roads', 'government', 27_900_000, '2025-08-06', '2025-10-06', 'lost', 'other', 61],
  ['BA-O16', 'Khabourah wadi bridge', 'Bridges', 'private', 30_700_000, '2025-08-03', '2025-10-21', 'lost', 'technical', 53],
  ['BA-O17', 'Seeb service roads', 'Roads', 'private', 34_800_000, '2025-08-04', '2025-11-05', 'lost', 'price', 33],
  ['BA-O18', 'Musannah dual carriageway', 'Roads', 'government', 19_500_000, '2025-08-19', '2025-11-20', 'lost', 'price', 56],
  ['BA-O19', 'Ibra ring road', 'Roads', 'government', 3_500_000, '2025-09-07', '2025-12-07', 'lost', 'other', 31],
  ['BA-O20', 'Salalah port road upgrade', 'Roads', 'semi-government', 3_000_000, '2025-10-05', '2025-12-21', 'lost', 'price', 25],
  ['BA-O21', 'Sohar smelter access embankment', 'Earthworks', 'private', 13_500_000, '2025-10-05', '2026-01-04', 'won', null, 39],
  ['BA-O22', 'Batinah coastal rehabilitation, lot 2', 'Roads', 'government', 25_600_000, '2025-11-02', '2026-01-18', 'lost', 'price', 26],
  ['BA-O23', 'Bahla wadi crossing', 'Bridges', 'semi-government', 31_900_000, '2025-10-28', '2026-02-02', 'won', null, 72],
  ['BA-O24', 'Yanqul road dualling', 'Roads', 'semi-government', 16_800_000, '2025-11-20', '2026-02-17', 'lost', 'pq', 31],
  ['BA-O25', 'Muscat expressway lighting and barriers', 'Roads', 'government', 9_600_000, '2025-12-23', '2026-03-04', 'won', null, 49],
];

const DG1_HISTORY: Dg1Tuple[] = [
  ['T-2025-404', 'Sohar ring road, section 2', 'pursue', '2025-12-09T09:00', 'batinah.bid', 'pursue', true, []],
  ['T-2025-405', 'Barka wadi bridges', 'pursue', '2025-12-15T11:13', 'batinah.bid', 'pursue', true, []],
  ['T-2025-407', 'Nizwa bypass link', 'pursue', '2025-12-21T13:26', 'batinah.bid', 'pursue', true, []],
  ['T-2025-415', 'Saham coastal road', 'pursue', '2025-12-28T15:39', 'batinah.bid', 'pursue', true, []],
  ['T-2026-018', 'Bridges programme, Phase 2', 'hold', '2026-01-04T10:52', 'batinah.hot', 'conditions', true, ['information-requested'], 'Finance to confirm facility headroom'],
  ['T-2026-029', 'Street lighting maintenance', 'discard', '2026-01-11T12:05', 'batinah.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-030', 'Road marking framework', 'discard', '2026-01-15T14:18', 'batinah.hot', 'discard', true, ['out-of-scope']],
  ['T-2026-033', 'Traffic signal upgrade, Sohar', 'discard', '2026-01-21T09:31', 'batinah.bid', 'discard', true, ['below-value']],
  ['T-2026-043', 'Village access tracks', 'discard', '2026-01-27T11:44', 'batinah.bid', 'discard', true, ['pq-fail']],
  ['T-2026-051', 'Bus shelters supply', 'discard', '2026-02-02T13:57', 'batinah.hot', 'discard', true, ['insufficient-time']],
  ['T-2026-052', 'Car park resurfacing', 'discard', '2026-02-08T15:10', 'batinah.bid', 'discard', true, ['capacity']],
  ['T-2026-027', 'Muscat interchange upgrade', 'pursue', '2026-02-12T10:15', 'batinah.bid', 'pursue', true, []],
  ['T-2026-065', 'Survey services', 'discard', '2026-02-15T10:23', 'batinah.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-077', 'Landscaping works', 'discard', '2026-02-22T12:36', 'batinah.hot', 'discard', false, ['below-value'], 'Recorded late: decider travelling'],
  ['T-2026-080', 'Guard rail supply', 'discard', '2026-03-01T14:49', 'batinah.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-083', 'Speed humps programme', 'discard', '2026-03-05T09:02', 'batinah.bid', 'discard', true, ['out-of-scope']],
];

const DG2_HISTORY: Dg2Tuple[] = [
  ['T-2025-231', 'Khabourah wadi bridge', '2025-07-20T11:00', 'bid', true, false],
  ['T-2025-194', 'Ibra ring road', '2025-08-24T11:00', 'bid', true, false],
  ['T-2025-305', 'Bridges programme, Phase 1', '2025-09-16T12:30', 'no-bid', true, false],
  ['T-2025-157', 'Batinah coastal rehabilitation, lot 2', '2025-10-19T11:00', 'bid', true, false],
  ['T-2025-120', 'Muscat expressway lighting and barriers', '2025-12-09T11:00', 'bid', true, false],
];

const DG1 = dg1Records(DG1_HISTORY);
function dg1Of(tenderId: string) {
  const r = DG1.find((d) => d.tenderId === tenderId);
  if (!r) throw new Error(`Batinah seed: no DG1 record for ${tenderId}`);
  return r;
}

const REGISTER: GccTender[] = [
  heroTender({
    sourceId: 'mail-bids',
    sourceDetail: 'Email from a prospective KSA partner, booklet attached',
    bidManagerId: 'batinah.bid',
    stageNote: 'Low fit: flagged for a person to decide',
    intake: { capturedAt: '2026-03-08T09:05', loggedAt: '2026-03-08T09:19', disposition: 'low-fit' },
    conflictsRaisedAt: '2026-03-08T09:19',
    fit: fit([
      [4, 'Treatment plant works: only the roads, earthworks and pipeline laying fit', 'Capability profile'],
      [3, 'Above the preferred value band and the single-contract limit once converted', 'Platform estimate; Fit model & rules'],
      [2, 'No Saudi registrations, no water classification, turnover below the threshold', 'Eligibility check against the credential vault'],
      [3, 'KSA: no presence', 'Company profile: offices'],
      [4, 'New client in a new country', 'Client history'],
      [7, 'Standard government terms', 'Extraction'],
      [9, 'Roads team has room', 'Capacity: Roads tendering team'],
      [5, 'The initial guarantee would take a large share of headroom', 'Bank guarantee facility'],
      [5, 'KSA is on the watch list, not the plan', 'Strategy: 2026 plan'],
    ]),
  }),
  {
    id: 'T-2026-041', title: 'Rehabilitation of Remaining Roads for Lot 3: Jezzine Caza, Jezzine Entrance', shortTitle: 'Jezzine Entrance road rehab (Lot 3, CDR)',
    issuer: 'Council for Development and Reconstruction (CDR), Republic of Lebanon', issuerIsReal: true,
    country: 'Lebanon', city: 'Jezzine', sector: 'Roads', sourceId: 'mail-bids', sourceDetail: 'Forwarded by a Lebanese partner firm', procurement: 'open',
    value: { amount: 0, ccy: 'USD', basis: 'not-stated' },
    stage: 'S1', stageNote: 'Past-dated; use Treat as newly published', bidManagerId: 'batinah.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2024-04-01', page: 5, note: 'Month only: April 2024' }],
    docKey: 'cdr-jezzine-lot3',
    fit: fit([
      [7, 'Road rehabilitation with piling: in sector', 'Capability profile'],
      [2, 'Small works contract, below the value band', 'Extraction'],
      [5, 'Piling experience is the qualification gate', 'Extraction flags'],
      [1, 'Lebanon: outside the company\'s markets', 'Company profile: offices'],
      [5, 'World Bank financing; payments only to the loan closing date', 'Extraction flags'],
      [4, 'Liquidated damages reach termination in 50 days', 'Extraction flags'],
      [6, 'Small team effort', 'Capacity'],
      [7, 'Small bid security', 'Bank guarantee facility'],
      [3, 'Not a target market', 'Strategy: 2026 plan'],
    ]),
    validations: [
      { id: 'VAL-041-1', tenderId: 'T-2026-041', field: 'Submission deadline', value: 'Not stated', page: 4, confidence: 0.4,
        reason: 'The deadline page is blank in this copy', blocksDg1: false, raisedAt: '2026-03-08T08:52' },
    ],
    intake: { capturedAt: '2026-03-08T08:40', loggedAt: '2026-03-08T08:52', disposition: 'needs-validation' },
  },
  {
    id: 'T-2026-042', title: 'Sohar–Buraimi road dualling', shortTitle: 'Sohar–Buraimi road dualling', issuer: 'Interior Links Roads Authority', issuerIsReal: false,
    country: 'Oman', city: 'Sohar', sector: 'Roads', sourceId: 'tender-board', sourceDetail: 'Tender Board e-tendering', procurement: 'open',
    value: { amount: 32_000_000, ccy: 'OMR', basis: 'estimate', band: [28_000_000, 36_000_000] },
    stage: 'S1', stageNote: 'Validated; waiting for DG1', bidManagerId: 'batinah.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'questions', date: '2026-03-22' }, { kind: 'submission', date: '2026-04-26', time: '12:00' }],
    fit: fit([
      [10, 'Dual carriageway: the core business', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [10, 'Sohar: home region', 'Company profile: offices'],
      [7, 'Roads authority; payments on time', 'Client history'],
      [6, 'Standard terms', 'Extraction'],
      [6, 'Roads team has room', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [8, 'Key corridor for the Batinah region', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T07:30', loggedAt: '2026-03-08T07:41', disposition: 'shortlisted' },
  },
  {
    id: 'T-2026-027', title: 'Muscat interchange upgrade', shortTitle: 'Muscat interchange upgrade', issuer: 'Capital Area Roads Directorate', issuerIsReal: false,
    country: 'Oman', city: 'Muscat', sector: 'Roads', sourceId: 'tender-board', sourceDetail: 'Tender Board e-tendering', procurement: 'open',
    value: { amount: 24_000_000, ccy: 'OMR', basis: 'estimate', band: [21_000_000, 27_000_000] },
    stage: 'S2', stageNote: 'Stage 2: RFQs out', bidManagerId: 'batinah.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-02-11' }, { kind: 'submission', date: '2026-04-12', time: '12:00' }],
    fit: fit([
      [10, 'Interchange and bridges: core business', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [9, 'Muscat site office', 'Company profile: offices'],
      [7, 'Roads authority; payments on time', 'Client history'],
      [6, 'Traffic management on a live interchange', 'Extraction'],
      [6, 'Team committed', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Capital area growth', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-02-11T11:20', loggedAt: '2026-02-11T11:32', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-027'),
  },
];

export const BATINAH: TenantSeed = {
  key: 'batinah',
  company: {
    hq: 'Sohar; site office in Muscat',
    employees: 1_400,
    fyEnd: '12-31',
    financials: [
      { fy: 2022, turnover: OMR(35_000_000), audited: true },
      { fy: 2023, turnover: OMR(38_000_000), audited: true },
      { fy: 2024, turnover: OMR(41_000_000), audited: true, netWorth: OMR(14_500_000), currentRatio: 1.31 },
      { fy: 2025, turnover: OMR(43_500_000), audited: false, auditDate: '2026-04-30' },
    ],
  },
  fit: {
    weights: { scope: 25, size: 15, eligibility: 20, geography: 15, client: 5, terms: 5, team: 5, facility: 5, strategy: 5 },
    pursueAt: 75,
    conditionsFrom: 55,
    band: { min: OMR(3_000_000), max: OMR(40_000_000) },
    singleLimit: OMR(45_000_000),
    dg2Referral: OMR(4_000_000),
    safeDeliveryPct: 70,
  },
  credentials: CREDENTIALS,
  projects: [
    { id: 'batinah-p1', title: 'Sohar industrial port access road', client: 'Interior Links Roads Authority', country: 'OM', value: OMR(26_000_000),
      completed: '2022-06-30', role: 'prime', scope: 'Dual carriageway, 18 km, with two interchanges' },
    { id: 'batinah-p2', title: 'Batinah coastal highway widening, section 3', client: 'Coastal Roads Programme Office', country: 'OM', value: OMR(31_000_000),
      completed: '2024-02-29', role: 'prime', scope: 'Widening and drainage, 24 km' },
    { id: 'batinah-p3', title: 'Wadi crossing bridges, Saham', client: 'Interior Links Roads Authority', country: 'OM', value: OMR(9_500_000),
      completed: '2021-11-30', role: 'prime', scope: 'Four wadi bridges' },
  ],
  partners: [
    {
      id: 'shamal-crest', name: 'Shamal Crest Contracting Co.', country: 'SA',
      note: 'Prospective KSA partner that forwarded the hero booklet. Roads only; no water classification.',
      credentials: [
        { id: 'shamal-cr', kind: 'cr', label: 'Saudi Commercial Registration: roads contracting', field: 'Roads', country: 'SA', issuer: 'Ministry of Commerce', validTo: '2027-01-31', ownerId: 'partner.shamal-crest' },
        { id: 'shamal-class', kind: 'classification', label: 'Contractor classification: Roads', field: 'Roads', grade: 1, country: 'SA', issuer: 'Contractor Classification Agency', validTo: '2027-05-31', ownerId: 'partner.shamal-crest' },
      ],
      projects: [],
      financials: [
        { fy: 2022, turnover: { amount: 560_000_000, ccy: 'SAR' }, audited: true },
        { fy: 2023, turnover: { amount: 600_000_000, ccy: 'SAR' }, audited: true },
        { fy: 2024, turnover: { amount: 640_000_000, ccy: 'SAR' }, audited: true },
      ],
    },
  ],
  teams: [
    {
      id: 'batinah-roads', name: 'Roads tendering team', sector: 'Roads', engineers: 3, estimators: 1, planners: 1, hoursPerWeek: 40,
      commitments: [
        { tenderId: 'T-2026-027', hoursPerWeek: 110, from: '2026-02-12', to: '2026-04-12', note: 'Sourcing and pricing' },
      ],
    },
  ],
  facility: {
    limit: OMR(30_000_000),
    utilised: OMR(17_500_000),
    committed: [
      { label: 'Bid bond: Nizwa bypass link (submitted)', kind: 'bid bond', amount: OMR(650_000) },
      { label: 'Bid bond: Saham coastal road (submitted)', kind: 'bid bond', amount: OMR(550_000) },
    ],
    asOf: '2026-03-04',
    confirmedById: 'batinah.fin',
  },
  sources: [
    { id: 'tender-board', name: 'Tender Board e-tendering', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:50' },
    { id: 'mail-bids', name: 'bids@batinah.example', kind: 'mailbox', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:58', note: 'Partner referrals arrive here' },
    { id: 'scan', name: 'Scanned drop', kind: 'scan', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:30', note: 'OCR on arrival' },
    { id: 'manual', name: 'Manual upload', kind: 'manual', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T10:00' },
  ],
  reconciliation: { at: '2026-03-08T06:00', sources: 4, missed: 0 },
  intakeToday: [
    { id: 'IN-0308-01', sourceId: 'tender-board', tenderId: 'T-2026-042', ref: 'ILRA/RD/2026/07', title: 'Sohar–Buraimi road dualling', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T07:30', loggedAt: '2026-03-08T07:41', disposition: 'shortlisted' },
    { id: 'IN-0308-02', sourceId: 'mail-bids', tenderId: 'T-2026-041', ref: 'RFB No. PW015 RE', title: 'Jezzine Entrance road rehabilitation (Lot 3)', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T08:40', loggedAt: '2026-03-08T08:52', disposition: 'needs-validation' },
    { id: 'IN-0308-03', sourceId: 'mail-bids', tenderId: 'T-2026-118', ref: 'ECWS/PRJ/2026/0147', title: 'Expansion of Al-Rawdah STP, Phase 2', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T09:05', loggedAt: '2026-03-08T09:19', disposition: 'low-fit' },
  ],
  register: REGISTER,
  historySeed: { outcomes: outcomes('OMR', OUTCOMES), dg1: DG1, dg2: dg2Records(DG2_HISTORY) },
};
