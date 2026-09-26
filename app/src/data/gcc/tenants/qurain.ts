import type { Credential, GccTender, TenantSeed } from '../types';
import { heroTender } from '../hero';
import { dg1Records, dg2Records, fit, outcomes, type Dg1Tuple, type Dg2Tuple, type OutcomeTuple } from '../build';

/**
 * Qurain Meridian Projects Co. (tenant E): a Kuwait group that bids in KSA
 * through its subsidiary Qurain Meridian Arabia Co. (gcc-demo-data §2.6,
 * §5.2). The subsidiary meets every hero PQ line, but the water team is over
 * capacity in April and the group facility has little headroom, so the answer
 * is Hold or Pursue with conditions. Two register rows are real documents
 * (Kuwait ccTLD, Wadi Zarqa).
 */

const KWD = (amount: number) => ({ amount, ccy: 'KWD' as const });
const SAR = (amount: number) => ({ amount, ccy: 'SAR' as const });
const ARABIA = 'qurain-arabia';

const CREDENTIALS: Credential[] = [
  // Group, Kuwait
  { id: 'qurain-cr-kw', kind: 'cr', label: 'Kuwait Commercial Registration: general contracting', number: 'CR xxxxxx', field: 'General contracting', country: 'KW',
    issuer: 'Ministry of Commerce and Industry (Kuwait)', validTo: '2027-04-30', ownerId: 'qurain.comp' },
  { id: 'qurain-capt', kind: 'avl', label: 'Central Agency for Public Tenders registration: first category', country: 'KW', issuer: 'CAPT', validTo: '2026-12-31', ownerId: 'qurain.coord' },
  { id: 'qurain-chamber-kw', kind: 'chamber', label: 'Kuwait Chamber of Commerce and Industry membership', country: 'KW', issuer: 'Kuwait Chamber of Commerce and Industry', validTo: '2026-12-31', ownerId: 'qurain.coord' },
  { id: 'qurain-iso', kind: 'iso', label: 'ISO 9001 / 14001 / 45001 (group, including the KSA subsidiary)', issuer: 'Accredited certification body', validTo: '2027-02-28', ownerId: 'qurain.comp' },
  // KSA subsidiary: every certificate valid past the hero opening on 10 May
  { id: 'qurain-cr-sa', kind: 'cr', label: 'Saudi Commercial Registration: water and sewage works', number: '1010xxxxxx', field: 'Water & sewage works', country: 'SA', holder: ARABIA,
    issuer: 'Ministry of Commerce', validTo: '2027-06-30', ownerId: 'qurain.comp' },
  { id: 'qurain-zakat', kind: 'zakat', label: 'Zakat certificate (ZATCA)', country: 'SA', holder: ARABIA, issuer: 'Zakat, Tax and Customs Authority', validTo: '2026-06-30', ownerId: 'qurain.fin' },
  { id: 'qurain-gosi', kind: 'gosi', label: 'GOSI certificate', country: 'SA', holder: ARABIA, issuer: 'General Organization for Social Insurance', validTo: '2026-10-31', ownerId: 'qurain.hr' },
  { id: 'qurain-chamber-sa', kind: 'chamber', label: 'Chamber of Commerce membership: Riyadh', country: 'SA', holder: ARABIA, issuer: 'Riyadh Chamber', validTo: '2026-12-31', ownerId: 'qurain.coord' },
  { id: 'qurain-class-sa', kind: 'classification', label: 'Contractor classification: Water & sewage works', field: 'Water & sewage works', grade: 1, country: 'SA', holder: ARABIA,
    issuer: 'Contractor Classification Agency', validTo: '2027-09-30', ownerId: 'qurain.hot' },
  { id: 'qurain-sca', kind: 'contractors-authority', label: 'Saudi Contractors Authority membership', country: 'SA', holder: ARABIA, issuer: 'Saudi Contractors Authority', validTo: '2026-12-31', ownerId: 'qurain.coord' },
  { id: 'qurain-saudization', kind: 'saudization', label: 'Saudization certificate: High Green band', country: 'SA', holder: ARABIA, issuer: 'Ministry of Human Resources and Social Development', validTo: '2026-11-30', ownerId: 'qurain.hr' },
  { id: 'qurain-vat-sa', kind: 'vat', label: 'VAT registration', country: 'SA', holder: ARABIA, issuer: 'Zakat, Tax and Customs Authority', validTo: null, ownerId: 'qurain.fin' },
  { id: 'qurain-lc', kind: 'lc-baseline', label: 'Local content baseline certificate', score: 43, country: 'SA', holder: ARABIA, issuer: 'Local Content and Government Procurement Authority', validTo: '2026-12-31', ownerId: 'qurain.comm' },
];

const OUTCOMES: OutcomeTuple[] = [
  ['QU-O01', 'Jahra STP rehabilitation', 'Water', 'government', 53_000_000, '2024-12-29', '2025-03-12', 'won', null, 58],
  ['QU-O02', 'Kuwait South pumping main', 'Water', 'semi-government', 29_100_000, '2024-12-29', '2025-03-24', 'lost', 'price', 58],
  ['QU-O03', 'Ahmadi storm drainage', 'Infrastructure', 'semi-government', 57_900_000, '2025-01-19', '2025-04-06', 'won', null, 36],
  ['QU-O04', 'Northern oil field water injection plant', 'Oil and gas facilities', 'private', 6_800_000, '2025-01-26', '2025-04-20', 'lost', 'pq', 56],
  ['QU-O05', 'Mubarak Al-Kabeer sewer network', 'Water', 'private', 52_400_000, '2025-01-20', '2025-04-30', 'lost', 'technical', 46],
  ['QU-O06', 'Sulaibiya effluent reuse line', 'Water', 'semi-government', 16_200_000, '2025-02-05', '2025-05-13', 'lost', 'price', 46],
  ['QU-O07', 'Wafra gathering centre upgrade', 'Oil and gas facilities', 'government', 21_600_000, '2025-02-16', '2025-05-25', 'lost', 'other', 42],
  ['QU-O08', 'Farwaniya road and utilities package', 'Infrastructure', 'private', 53_200_000, '2025-04-08', '2025-06-08', 'lost', 'other', 25],
  ['QU-O09', 'Kuwait City water reservoirs', 'Water', 'private', 7_100_000, '2025-03-23', '2025-06-18', 'won', null, 72],
  ['QU-O10', 'Abdali produced water treatment', 'Oil and gas facilities', 'private', 10_000_000, '2025-04-21', '2025-07-01', 'won', null, 56],
  ['QU-O11', 'Hawalli sewer rehabilitation', 'Water', 'semi-government', 6_100_000, '2025-04-06', '2025-07-13', 'won', null, 42],
  ['QU-O12', 'Shuwaikh port utilities', 'Infrastructure', 'private', 49_000_000, '2025-04-20', '2025-07-27', 'lost', 'technical', 35],
  ['QU-O13', 'Riyadh North STP (KSA subsidiary)', 'Water', 'semi-government', 15_600_000, '2025-05-11', '2025-08-07', 'lost', 'other', 38],
  ['QU-O14', 'Dammam treated effluent line (KSA subsidiary)', 'Water', 'government', 48_800_000, '2025-06-10', '2025-08-19', 'lost', 'price', 33],
  ['QU-O15', 'Burgan tank farm civil works', 'Oil and gas facilities', 'government', 8_000_000, '2025-06-18', '2025-08-31', 'lost', 'other', 34],
  ['QU-O16', 'Jaber Al-Ahmad city utilities', 'Infrastructure', 'government', 26_500_000, '2025-06-08', '2025-09-14', 'lost', 'price', 32],
  ['QU-O17', 'Kabd pumping station', 'Water', 'government', 8_300_000, '2025-07-07', '2025-09-25', 'won', null, 70],
  ['QU-O18', 'Mina Abdullah effluent treatment', 'Oil and gas facilities', 'government', 21_700_000, '2025-07-03', '2025-10-07', 'lost', 'price', 60],
  ['QU-O19', 'Sabah Al-Ahmad city sewer network', 'Water', 'semi-government', 13_200_000, '2025-08-17', '2025-10-20', 'lost', 'other', 57],
  ['QU-O20', 'Umm Al-Hayman STP interface works', 'Water', 'government', 19_000_000, '2025-08-14', '2025-11-02', 'lost', 'price', 63],
  ['QU-O21', 'Doha peninsula water main', 'Water', 'semi-government', 54_900_000, '2025-08-10', '2025-11-13', 'lost', 'pq', 34],
  ['QU-O22', 'Northern Kuwait gas plant utilities', 'Oil and gas facilities', 'private', 42_100_000, '2025-09-14', '2025-11-26', 'lost', 'pq', 65],
  ['QU-O23', 'Salmiya storm outfall', 'Infrastructure', 'government', 8_100_000, '2025-09-11', '2025-12-08', 'won', null, 58],
  ['QU-O24', 'Qurain district utilities', 'Infrastructure', 'government', 22_100_000, '2025-10-12', '2025-12-21', 'lost', 'local-content', 54],
  ['QU-O25', 'Jahra water transmission', 'Water', 'government', 2_600_000, '2025-09-25', '2026-01-01', 'lost', 'price', 20],
  ['QU-O26', 'Ahmadi refinery cooling water', 'Oil and gas facilities', 'semi-government', 38_700_000, '2025-10-19', '2026-01-14', 'lost', 'technical', 39],
  ['QU-O27', 'Fahaheel sewer upgrade', 'Water', 'semi-government', 41_600_000, '2025-10-29', '2026-01-26', 'lost', 'price', 32],
  ['QU-O28', 'Wafra housing utilities', 'Infrastructure', 'semi-government', 9_000_000, '2025-12-09', '2026-02-08', 'lost', 'price', 33],
  ['QU-O29', 'Khiran city water network', 'Water', 'semi-government', 6_000_000, '2025-11-20', '2026-02-22', 'won', null, 32],
  ['QU-O30', 'Hafr Al-Batin sewer network (KSA subsidiary)', 'Water', 'government', 50_900_000, '2025-12-21', '2026-03-04', 'lost', 'price', 17],
];

const DG1_HISTORY: Dg1Tuple[] = [
  ['T-2025-405', 'Jahra sewer network extension', 'pursue', '2025-12-30T09:00', 'qurain.bid', 'pursue', true, []],
  ['T-2025-406', 'Ahmadi water reservoirs', 'pursue', '2025-12-15T11:13', 'qurain.bid', 'pursue', true, []],
  ['T-2025-411', 'Infrastructure programme, Phase 2', 'hold', '2025-12-21T13:26', 'qurain.hot', 'conditions', true, ['information-requested'], 'Finance to confirm facility headroom'],
  ['T-2025-425', 'IT network cabling framework', 'discard', '2025-12-28T15:39', 'qurain.hot', 'discard', true, ['out-of-scope']],
  ['T-2026-030', 'Office tower cleaning', 'discard', '2026-01-04T10:52', 'qurain.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-038', 'Vehicle fleet maintenance', 'discard', '2026-01-11T12:05', 'qurain.bid', 'discard', true, ['below-value']],
  ['T-2026-040', 'Minor road patching', 'discard', '2026-01-15T14:18', 'qurain.hot', 'discard', true, ['pq-fail']],
  ['T-2026-043', 'Street lighting maintenance', 'discard', '2026-01-21T09:31', 'qurain.bid', 'discard', true, ['insufficient-time']],
  ['T-2026-047', 'Desalination membranes supply', 'discard', '2026-01-27T11:44', 'qurain.bid', 'discard', true, ['capacity']],
  ['T-2026-049', 'Kuwait STP rehabilitation', 'pursue', '2026-01-27T13:10', 'qurain.bid', 'pursue', true, []],
  ['T-2026-051', 'Tank inspection services', 'discard', '2026-02-02T13:57', 'qurain.hot', 'discard', true, ['out-of-scope']],
  ['T-2026-056', 'Landscaping, Ahmadi', 'discard', '2026-02-08T15:10', 'qurain.bid', 'discard', true, ['below-value']],
  ['T-2026-058', 'Kuwait South wastewater conveyance tunnels', 'pursue', '2026-02-10T12:00', 'qurain.bid', 'pursue', true, []],
  ['T-2026-060', 'Pipe coating supply', 'discard', '2026-02-15T10:23', 'qurain.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-062', 'Northern Kuwait water transmission mains', 'pursue', '2026-02-16T10:45', 'qurain.bid', 'pursue', true, []],
  ['T-2026-073', 'Housing maintenance framework', 'discard', '2026-02-22T12:36', 'qurain.hot', 'discard', false, ['out-of-scope'], 'Recorded late: decider travelling'],
  ['T-2026-082', 'Traffic signals upgrade', 'discard', '2026-03-01T14:49', 'qurain.bid', 'discard', true, ['below-value']],
  ['T-2026-084', 'Office furniture supply', 'discard', '2026-03-05T09:02', 'qurain.bid', 'discard', true, ['pq-fail']],
];

const DG2_HISTORY: Dg2Tuple[] = [
  ['T-2025-268', 'Mina Abdullah effluent treatment', '2025-06-19T11:00', 'bid', true, false],
  ['T-2025-231', 'Doha peninsula water main', '2025-07-27T11:00', 'bid', true, false],
  ['T-2025-306', 'Infrastructure programme, Phase 1', '2025-09-16T12:30', 'no-bid', true, false],
  ['T-2025-194', 'Qurain district utilities', '2025-09-28T11:00', 'bid', true, false],
  ['T-2025-157', 'Fahaheel sewer upgrade', '2025-10-15T11:00', 'bid', true, false],
  ['T-2025-120', 'Hafr Al-Batin sewer network (KSA subsidiary)', '2025-12-07T11:00', 'bid', true, false],
];

const DG1 = dg1Records(DG1_HISTORY);
function dg1Of(tenderId: string) {
  const r = DG1.find((d) => d.tenderId === tenderId);
  if (!r) throw new Error(`Qurain seed: no DG1 record for ${tenderId}`);
  return r;
}

const REGISTER: GccTender[] = [
  heroTender({
    sourceId: 'etimad-arabia',
    sourceDetail: 'Etimad, through Qurain Meridian Arabia Co.; booklet bought through SADAD',
    bidManagerId: 'qurain.bid',
    stageNote: 'Captured through the KSA subsidiary',
    intake: { capturedAt: '2026-03-08T07:18', purchasedAt: '2026-03-08T07:40', loggedAt: '2026-03-08T07:55', disposition: 'shortlisted' },
    conflictsRaisedAt: '2026-03-08T07:55',
    fit: fit([
      [10, 'STP expansion with tertiary treatment: the subsidiary\'s core work', 'Capability profile'],
      [9, 'Inside the preferred value band once converted', 'Platform estimate; Fit model & rules'],
      [10, 'The KSA subsidiary meets every PQ line, with certificates valid past opening', 'Eligibility check against the credential vault'],
      [8, 'Riyadh office of the subsidiary; Eastern Province is new ground', 'Company profile: offices'],
      [9, 'Utility clients in KSA pay reliably', 'Client history'],
      [8, 'Standard Saudi government terms', 'Extraction'],
      [4, 'The water team is over capacity in April: two large Kuwait bids are due', 'Capacity: Water tendering team'],
      [3, 'The bid bond fits, but the performance and advance payment guarantees together would exceed headroom if won and the 10% advance is taken', 'Bank guarantee facility, group level'],
      [10, 'KSA water is the group\'s growth priority', 'Strategy: 2026 plan'],
    ]),
  }),
  {
    id: 'T-2026-071', title: 'Kuwait Country Code Top-Level Domain (.kw ccTLD) registry: Public Tender No. 6-2024/2025', shortTitle: 'Kuwait .kw ccTLD registry SaaS (CITRA)',
    issuer: 'Communication and Information Technology Regulatory Authority (CITRA), State of Kuwait', issuerIsReal: true,
    country: 'Kuwait', city: 'Kuwait City', sector: 'IT services', sourceId: 'capt', sourceDetail: 'CAPT listing; viewing copy downloaded', procurement: 'open',
    value: { amount: 0, ccy: 'KWD', basis: 'not-stated' },
    stage: 'S1', stageNote: 'Past-dated; use Treat as newly published', bidManagerId: 'qurain.bid', invited: [],
    keyDates: [],
    docKey: 'kw-cctld',
    fit: fit([
      [0, 'Domain registry software and hosting: not construction', 'Capability profile'],
      [3, 'Value not stated; likely small', 'Extraction'],
      [2, 'Kuwait-only IT eligibility gates the group does not hold', 'Extraction flags'],
      [8, 'Kuwait City', 'Company profile: offices'],
      [6, 'Government regulator', 'Client history'],
      [4, 'Uncapped delay penalties; open-ended development scope', 'Extraction flags'],
      [5, 'Would need an IT partner', 'Capacity'],
      [7, 'Small guarantee', 'Bank guarantee facility'],
      [1, 'Not a business line', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T08:30', loggedAt: '2026-03-08T08:44', disposition: 'low-fit' },
  },
  {
    id: 'T-2026-072', title: 'Wadi Zarqa Wastewater Treatment Plant Phase I, Design-Build-Operate: prequalification', shortTitle: 'Wadi Zarqa WWTP Phase 1 DBO (PQ)',
    issuer: 'Water Authority of Jordan (WAJ)', issuerIsReal: true,
    country: 'Jordan', city: 'Zarqa', sector: 'Water and wastewater', sourceId: 'mail', sourceDetail: 'Email from a regional consultant, with the RFQ attached', procurement: 'pq',
    value: { amount: 0, ccy: 'USD', basis: 'not-stated' },
    stage: 'S1', stageNote: 'Past-dated; use Treat as newly published', bidManagerId: 'qurain.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2025-10-23', page: 1 },
      { kind: 'questions', date: '2025-12-08', time: '12:00', page: 25 },
      { kind: 'submission', date: '2025-12-29', time: '12:00', page: 26, note: 'Hard-copy application' },
      { kind: 'opening', date: '2025-12-29', time: '13:00', page: 26 },
    ],
    docKey: 'wadi-zarqa',
    fit: fit([
      [9, 'WWTP design-build-operate: in sector', 'Capability profile'],
      [6, 'Value not stated; the PQ thresholds suggest a large contract', 'Extraction: PQ thresholds'],
      [6, 'Not yet checked: needs Jordanian registration and a narrow O&M reference', 'Extraction flags'],
      [4, 'Jordan: the group has worked in the Levant before', 'Company profile: offices'],
      [5, 'Financing only applied for', 'Extraction flags'],
      [5, 'FIDIC Gold Book with a 20-year operation period', 'Extraction'],
      [3, 'Water team over capacity in April', 'Capacity: Water tendering team'],
      [4, 'Long-dated security', 'Extraction flags'],
      [6, 'A multi-country reference would help the group', 'Strategy: 2026 plan'],
    ]),
    validations: [
      { id: 'VAL-072-1', tenderId: 'T-2026-072', field: 'Conveyance pipeline diameter', value: 'Up to 1,600 mm', page: 3, alt: { value: '1,600–1,700 mm (to be verified)', page: 67 },
        confidence: 0.55, reason: 'Two values stated: the notice and Section VII', blocksDg1: false, raisedAt: '2026-03-08T09:01' },
    ],
    intake: { capturedAt: '2026-03-08T08:50', loggedAt: '2026-03-08T09:01', disposition: 'needs-validation' },
  },
  {
    id: 'T-2026-058', title: 'Kuwait South wastewater conveyance tunnels', shortTitle: 'Kuwait South conveyance tunnels', issuer: 'Southern Governorates Sanitation Agency', issuerIsReal: false,
    country: 'Kuwait', city: 'Ahmadi', sector: 'Water', sourceId: 'capt', sourceDetail: 'CAPT', procurement: 'open',
    value: { amount: 46_000_000, ccy: 'KWD', basis: 'estimate', band: [41_000_000, 51_000_000] },
    stage: 'S2', stageNote: 'Stage 2: RFQs out; submission in April', bidManagerId: 'qurain.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-02-09' }, { kind: 'submission', date: '2026-04-29', time: '13:00' }],
    fit: fit([
      [9, 'Tunnelled conveyance: core water infrastructure', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [10, 'Kuwait: home market', 'Company profile: offices'],
      [8, 'Reliable payer', 'Client history'],
      [6, 'Ground risk with the contractor', 'Extraction'],
      [3, 'Water team over capacity in April', 'Capacity: Water tendering team'],
      [4, 'Bid bond committed; little headroom left', 'Bank guarantee facility'],
      [8, 'Flagship Kuwait project', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-02-09T13:30', loggedAt: '2026-02-09T13:42', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-058'),
  },
  {
    id: 'T-2026-062', title: 'Northern Kuwait water transmission mains', shortTitle: 'Northern Kuwait water mains', issuer: 'National Water Grid Projects Office', issuerIsReal: false,
    country: 'Kuwait', city: 'Jahra', sector: 'Water', sourceId: 'capt', sourceDetail: 'CAPT', procurement: 'open',
    value: { amount: 38_000_000, ccy: 'KWD', basis: 'estimate', band: [34_000_000, 42_000_000] },
    stage: 'S2', stageNote: 'Stage 2: RFQs out; submission in April', bidManagerId: 'qurain.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-02-15' }, { kind: 'submission', date: '2026-04-26', time: '13:00' }],
    fit: fit([
      [9, 'Large-diameter transmission mains', 'Capability profile'],
      [7, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [10, 'Kuwait: home market', 'Company profile: offices'],
      [8, 'Reliable payer', 'Client history'],
      [7, 'Standard terms', 'Extraction'],
      [3, 'Water team over capacity in April', 'Capacity: Water tendering team'],
      [4, 'Bid bond committed; little headroom left', 'Bank guarantee facility'],
      [7, 'Keeps the grid programme relationship', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-02-15T11:40', loggedAt: '2026-02-15T11:51', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-062'),
  },
  {
    id: 'T-2026-049', title: 'Kuwait STP rehabilitation', shortTitle: 'Kuwait STP rehabilitation', issuer: 'Southern Governorates Sanitation Agency', issuerIsReal: false,
    country: 'Kuwait', city: 'Kuwait City', sector: 'Water', sourceId: 'capt', sourceDetail: 'CAPT', procurement: 'open',
    value: { amount: 22_000_000, ccy: 'KWD', basis: 'estimate', band: [19_000_000, 25_000_000] },
    stage: 'DG2', stageNote: 'At DG2: pack issued this morning', bidManagerId: 'qurain.bid', invited: ['qurain.comm', 'qurain.fin'],
    packIssuedAt: '2026-03-08T08:30',
    keyDates: [{ kind: 'published', date: '2026-01-26' }, { kind: 'submission', date: '2026-05-10', time: '13:00' }],
    fit: fit([
      [9, 'STP rehabilitation: core work', 'Capability profile'],
      [6, 'Inside the value band', 'Platform estimate'],
      [9, 'Meets every PQ line', 'Eligibility check'],
      [10, 'Kuwait: home market', 'Company profile: offices'],
      [8, 'Reliable payer', 'Client history'],
      [6, 'Works in a live plant', 'Extraction'],
      [4, 'Water team stretched', 'Capacity: Water tendering team'],
      [5, 'Bid bond would use most of the headroom', 'Bank guarantee facility'],
      [6, 'Routine but profitable', 'Strategy: 2026 plan'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-26T14:05', loggedAt: '2026-01-26T14:17', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-049'),
  },
];

export const QURAIN: TenantSeed = {
  key: 'qurain',
  company: {
    hq: 'Kuwait City; KSA subsidiary in Riyadh',
    employees: 3_900,
    fyEnd: '12-31',
    financials: [
      { fy: 2022, turnover: KWD(135_000_000), audited: true },
      { fy: 2023, turnover: KWD(142_000_000), audited: true },
      { fy: 2024, turnover: KWD(149_000_000), audited: true, netWorth: KWD(58_000_000), currentRatio: 1.25 },
      { fy: 2025, turnover: KWD(156_000_000), audited: false, auditDate: '2026-04-26' },
    ],
    entities: [
      {
        id: ARABIA, name: 'Qurain Meridian Arabia Co.', country: 'SA',
        note: 'Wholly owned KSA subsidiary; bids in KSA in its own name, with its own registrations and accounts',
        financials: [
          { fy: 2022, turnover: SAR(1_280_000_000), audited: true },
          { fy: 2023, turnover: SAR(1_350_000_000), audited: true },
          { fy: 2024, turnover: SAR(1_420_000_000), audited: true, netWorth: SAR(460_000_000), currentRatio: 1.3 },
          // Audited after the hero opens on 10 May, so PQ-11 reads the FY2022–FY2024 accounts only.
          { fy: 2025, turnover: SAR(1_470_000_000), audited: false, auditDate: '2026-05-24' },
        ],
      },
    ],
  },
  fit: {
    weights: { scope: 15, size: 10, eligibility: 15, geography: 10, client: 10, terms: 10, team: 15, facility: 10, strategy: 5 },
    pursueAt: 70,
    conditionsFrom: 50,
    band: { min: KWD(5_000_000), max: KWD(60_000_000) },
    singleLimit: KWD(70_000_000),
    dg2Referral: KWD(4_000_000),
    safeDeliveryPct: 75,
  },
  credentials: CREDENTIALS,
  projects: [
    { id: 'qurain-p1', title: 'Al-Kharj STP', client: 'Central Cities Water Services Company', country: 'SA', capacityM3d: 110_000, tertiary: true, value: SAR(470_000_000),
      completed: '2021-03-31', role: 'prime', scope: 'Design and build with tertiary treatment; then operated the plant', om: { from: '2021-04-01', to: '2024-06-30' }, holder: ARABIA },
    { id: 'qurain-p2', title: 'Qurayyat STP', client: 'Northern Cities Water Services Company', country: 'SA', capacityM3d: 105_000, tertiary: false, value: SAR(390_000_000),
      completed: '2019-08-31', role: 'prime', scope: 'Design and build, secondary treatment', holder: ARABIA },
    { id: 'qurain-p3', title: 'Kuwait South pumping main, Phase 1', client: 'Southern Governorates Sanitation Agency', country: 'KW', value: KWD(28_000_000),
      completed: '2022-12-31', role: 'prime', scope: 'DN1800 pumping main, 21 km' },
    { id: 'qurain-p4', title: 'Northern oil field water injection plant', client: 'Northern oil field operator', country: 'KW', value: KWD(34_000_000),
      completed: '2023-09-30', role: 'prime', scope: 'Water treatment and injection facility' },
  ],
  partners: [],
  teams: [
    {
      id: 'qurain-water', name: 'Water tendering team', sector: 'Water and infrastructure', engineers: 4, estimators: 2, planners: 1, hoursPerWeek: 40,
      // 280 h available a week. Every April day carries 110 + 100 + 60 + 50 + 10 = 330 h: 118%.
      commitments: [
        { tenderId: 'T-2026-058', hoursPerWeek: 110, from: '2026-02-10', to: '2026-05-06', note: 'Sourcing and pricing' },
        { tenderId: 'T-2026-062', hoursPerWeek: 100, from: '2026-02-16', to: '2026-05-03', note: 'Sourcing and pricing' },
        { tenderId: 'T-2026-058', hoursPerWeek: 60, from: '2026-03-29', to: '2026-05-02', note: 'Final pricing and submission' },
        { tenderId: 'T-2026-062', hoursPerWeek: 50, from: '2026-03-29', to: '2026-05-02', note: 'Final pricing and submission' },
        { tenderId: 'T-2026-049', hoursPerWeek: 10, from: '2026-01-27', to: '2026-05-10', note: 'Committee, then proposal' },
      ],
    },
  ],
  facility: {
    // The limit carries the two submitted bids' bid bonds, so headroom stays KWD 3.1 M (plan 020 B11).
    limit: KWD(28_560_000),
    utilised: KWD(22_800_000),
    committed: [
      { label: 'Bid bond: Kuwait South wastewater conveyance tunnels', tenderId: 'T-2026-058', kind: 'bid bond', amount: KWD(1_150_000) },
      { label: 'Bid bond: Northern Kuwait water transmission mains', tenderId: 'T-2026-062', kind: 'bid bond', amount: KWD(950_000) },
      { label: 'Bid bond: Mutlaa stormwater network (submitted 18 Feb)', tenderId: 'T-2025-418', kind: 'bid bond', amount: KWD(320_000) },
      { label: 'Bid bond: Kabd sewage treatment rehabilitation (submitted 1 Mar)', tenderId: 'T-2025-431', kind: 'bid bond', amount: KWD(240_000) },
    ],
    asOf: '2026-03-05',
    confirmedById: 'qurain.fin',
  },
  sources: [
    { id: 'capt', name: 'CAPT (Central Agency for Public Tenders)', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:50' },
    { id: 'etimad-arabia', name: 'Etimad (Qurain Meridian Arabia Co.)', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:55' },
    { id: 'og-portal', name: 'Oil and gas operator vendor portal', kind: 'client-portal', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T08:30', note: 'An operator completes access' },
    { id: 'mail', name: 'tenders@qurain.example', kind: 'mailbox', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:58' },
    { id: 'manual', name: 'Manual upload', kind: 'manual', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T10:00' },
  ],
  reconciliation: { at: '2026-03-08T06:00', sources: 5, missed: 0 },
  intakeToday: [
    { id: 'IN-0308-01', sourceId: 'etimad-arabia', tenderId: 'T-2026-118', ref: 'ECWS/PRJ/2026/0147', title: 'Expansion of Al-Rawdah STP, Phase 2', docType: 'Tender', language: 'EN',
      receivedAt: '2026-03-08T07:42', loggedAt: '2026-03-08T07:55', disposition: 'shortlisted' },
    { id: 'IN-0308-02', sourceId: 'capt', tenderId: 'T-2026-071', ref: 'Public Tender No. 6-2024/2025', title: 'Kuwait .kw ccTLD registry', docType: 'Tender', language: 'AR',
      receivedAt: '2026-03-08T08:30', loggedAt: '2026-03-08T08:44', disposition: 'low-fit' },
    { id: 'IN-0308-03', sourceId: 'mail', tenderId: 'T-2026-072', ref: 'Tender No. 33/2025', title: 'Wadi Zarqa WWTP Phase I DBO, prequalification', docType: 'PQ', language: 'EN',
      receivedAt: '2026-03-08T08:50', loggedAt: '2026-03-08T09:01', disposition: 'needs-validation' },
  ],
  register: REGISTER,
  historySeed: { outcomes: outcomes('KWD', OUTCOMES), dg1: DG1, dg2: dg2Records(DG2_HISTORY) },
};
