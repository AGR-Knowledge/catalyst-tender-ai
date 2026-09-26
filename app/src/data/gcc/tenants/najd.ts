import type { Credential, GccTender, IntakeEvent, PqRequirement, Source, Team, TenantData, TenantSeed } from '../types';
import { HERO_ID, heroTender } from '../hero';
import { TIHAMA } from '../partners';
import { dg1Records, dg2Records, fit, outcomes, type Dg1Tuple, type Dg2Tuple, type OutcomeTuple } from '../build';

/**
 * Najd Arcline Contracting Co. (tenant A, primary): a Riyadh water and
 * wastewater EPC contractor (gcc-demo-data §2.2, §5.1). The seed is tuned so
 * the KPIs in gcc-demo-data §5.3 derive to their target readings on Sun 8 Mar
 * 2026 at 10:00 AST. Issuers are fictional except the Water Authority of
 * Jordan, which issued the real Wadi Zarqa document.
 */

const SAR = (amount: number) => ({ amount, ccy: 'SAR' as const });

/**
 * Bid-team effort for the hero tender, added to the Water team when it is
 * pursued (plan 007), from demo today to submission. The Water team has 9
 * people × 40 h = 360 h a week. The commitments below take 281 h a week for
 * the whole of the next 4 weeks (CAP-1 78%); adding the hero takes it to
 * 346 h (96%).
 */
export const HERO_EFFORT_HOURS_PER_WEEK = 65;
export const HERO_EFFORT_WINDOW = { from: '2026-03-08', to: '2026-05-10' };

const CCWS = 'Central Cities Water Services Company';
const ECWS = 'Eastern Cities Water Services Company (ECWS)';
const NCWS = 'Northern Cities Water Services Company';
const SCWS = 'Southern Cities Water Services Company';
const WCWS = 'Western Cities Water Services Company';

// ---------------------------------------------------------------------------
// Credential vault (§2.2). Zakat and GOSI expire before the hero opens on 10 May.

const CREDENTIALS: Credential[] = [
  { id: 'najd-cr', kind: 'cr', label: 'Commercial Registration: water and sewage works activity', number: '1010xxxxxx', field: 'Water & sewage works', country: 'SA',
    issuer: 'Ministry of Commerce', validTo: '2027-08-21', ownerId: 'najd.comp' },
  { id: 'najd-zakat', kind: 'zakat', label: 'Zakat certificate (ZATCA)', number: 'FY2024 filing', country: 'SA',
    issuer: 'Zakat, Tax and Customs Authority', validTo: '2026-04-30', ownerId: 'najd.fin', note: 'Renewal follows the FY2025 return' },
  { id: 'najd-gosi', kind: 'gosi', label: 'GOSI certificate', country: 'SA',
    issuer: 'General Organization for Social Insurance', validTo: '2026-05-07', ownerId: 'najd.hr' },
  { id: 'najd-chamber', kind: 'chamber', label: 'Chamber of Commerce membership: Riyadh', country: 'SA',
    issuer: 'Riyadh Chamber', validTo: '2026-12-31', ownerId: 'najd.coord' },
  { id: 'najd-class-water', kind: 'classification', label: 'Contractor classification: Water & sewage works', number: 'CL-0xxxx', field: 'Water & sewage works', grade: 1, country: 'SA',
    issuer: 'Contractor Classification Agency', validTo: '2027-11-14', ownerId: 'najd.hot', note: 'One certificate, three fields' },
  { id: 'najd-class-roads', kind: 'classification', label: 'Contractor classification: Roads', number: 'CL-0xxxx', field: 'Roads', grade: 2, country: 'SA',
    issuer: 'Contractor Classification Agency', validTo: '2027-11-14', ownerId: 'najd.hot', note: 'One certificate, three fields' },
  { id: 'najd-class-buildings', kind: 'classification', label: 'Contractor classification: Buildings', number: 'CL-0xxxx', field: 'Buildings', grade: 3, country: 'SA',
    issuer: 'Contractor Classification Agency', validTo: '2027-11-14', ownerId: 'najd.hot', note: 'One certificate, three fields' },
  { id: 'najd-sca', kind: 'contractors-authority', label: 'Saudi Contractors Authority membership', country: 'SA',
    issuer: 'Saudi Contractors Authority', validTo: '2026-10-31', ownerId: 'najd.coord' },
  { id: 'najd-saudization', kind: 'saudization', label: 'Saudization certificate: High Green band', country: 'SA',
    issuer: 'Ministry of Human Resources and Social Development', validTo: '2026-06-30', ownerId: 'najd.hr' },
  { id: 'najd-vat', kind: 'vat', label: 'VAT registration', number: '3xxxxxxxxxx0003', country: 'SA',
    issuer: 'Zakat, Tax and Customs Authority', validTo: null, ownerId: 'najd.fin' },
  { id: 'najd-iso', kind: 'iso', label: 'ISO 9001 / 14001 / 45001',
    issuer: 'Accredited certification body', validTo: '2027-06-30', ownerId: 'najd.comp' },
  { id: 'najd-lc', kind: 'lc-baseline', label: 'Local content baseline certificate', score: 41, country: 'SA',
    issuer: 'Local Content and Government Procurement Authority', validTo: '2026-09-30', ownerId: 'najd.comm' },
  { id: 'najd-avl', kind: 'avl', label: 'Approved contractor: national water utility vendor list', country: 'SA',
    issuer: 'National water utility', validTo: '2027-01-31', ownerId: 'najd.coord' },
  { id: 'najd-accounts', kind: 'other', label: 'Audited financial statements FY2022–FY2024 (FY2025 draft)',
    issuer: 'External auditor', validTo: null, ownerId: 'najd.fin', note: 'FY2025 audit sign-off expected 15 Apr 2026' },
];

// ---------------------------------------------------------------------------
// Requirements for the other register rows that are screened in Stage 1–3.

const T117_REQUIREMENTS: PqRequirement[] = [
  { id: 'R-01', kind: 'cr', page: 3, validAt: 'opening', country: 'SA', text: 'Saudi Commercial Registration covering water and sewage works' },
  { id: 'R-02', kind: 'zakat', page: 3, validAt: 'opening', country: 'SA', text: 'Zakat certificate, valid at bid opening' },
  { id: 'R-03', kind: 'gosi', page: 3, validAt: 'opening', country: 'SA', text: 'GOSI certificate, valid at bid opening' },
  { id: 'R-04', kind: 'classification', page: 3, validAt: 'opening', country: 'SA', threshold: { field: 'Water & sewage works', grade: 2 },
    text: 'Contractor classification: Water and Sewage Works, Grade 2 or better' },
  { id: 'R-05', kind: 'experience', page: 5, threshold: { count: 2, value: 20, unit: 'km', years: 10 },
    text: 'At least two completed sewer network or trunk sewer contracts, each of 20 km or more, in the last 10 years' },
  { id: 'R-06', kind: 'turnover', page: 5, threshold: { value: 400_000_000, unit: 'SAR', years: 3 },
    text: 'Average annual turnover of SAR 400 M or more over the last three financial years' },
];

const T119_REQUIREMENTS: PqRequirement[] = [
  { id: 'R-01', kind: 'cr', page: 4, validAt: 'opening', country: 'SA', text: 'Saudi Commercial Registration covering marine works' },
  { id: 'R-02', kind: 'classification', page: 4, validAt: 'opening', country: 'SA', threshold: { field: 'Marine works', grade: 2 },
    text: 'Contractor classification: Marine Works, Grade 2 or better' },
  { id: 'R-03', kind: 'experience', page: 6, threshold: { count: 1, value: 1, unit: 'km offshore', years: 10 },
    text: 'At least one completed seawater intake or outfall extending 1 km or more offshore, in the last 10 years' },
];

const T109_REQUIREMENTS: PqRequirement[] = [
  { id: 'R-01', kind: 'cr', page: 4, validAt: 'opening', country: 'SA', text: 'Saudi Commercial Registration covering water and sewage works' },
  { id: 'R-02', kind: 'zakat', page: 4, validAt: 'opening', country: 'SA', text: 'Zakat certificate, valid at bid opening' },
  { id: 'R-03', kind: 'gosi', page: 4, validAt: 'opening', country: 'SA', text: 'GOSI certificate, valid at bid opening' },
  { id: 'R-04', kind: 'classification', page: 4, validAt: 'opening', country: 'SA', threshold: { field: 'Water & sewage works', grade: 1 },
    text: 'Contractor classification: Water and Sewage Works, Grade 1' },
  { id: 'R-05', kind: 'experience', page: 37, threshold: { count: 2, value: 30, unit: 'km', years: 10 },
    text: 'At least two completed water transmission pipelines, each 30 km or more of DN1000 or larger, in the last 10 years' },
];

// ---------------------------------------------------------------------------
// History (§5.1): input to the lifecycles (plan 017), which own the dates from
// here on. Outcomes: 30 of the 33 decided bids in the 12 months to 7 Mar 2026;
// the other three are T-2025-262, T-2025-255 and T-2025-270 in
// lifecycle/live/najd.ts (dashboards.md §12.2). DG1: 45 of the 46 decisions of
// the last 90 days; T-2026-107 carries the 46th. DG2: 17 records; the
// generator adds the rest of the 54. Plan 017 re-dated records so the
// dashboards.md §12.3 anchors hold, scaled the values of the bids submitted
// before 9 Dec 2025 so the average ticket is SAR 214.0 M over 12 months, and
// uses the tenant's sector names. Its execution report lists every change.

const OUTCOMES: OutcomeTuple[] = [
  ['O-25-30', 'Al-Ula visitor access road', 'Roads', 'government', 199_000_000, '2025-03-09', '2025-05-18', 'lost', 'technical', 19],
  ['O-25-20', 'Jazan district water reservoirs', 'Water and wastewater', 'government', 123_000_000, '2025-03-12', '2025-05-28', 'lost', 'local-content', 21],
  ['O-25-06', 'Arar treated water storage tanks', 'Water and wastewater', 'government', 88_000_000, '2025-03-16', '2025-06-08', 'won', null, 42],
  ['O-25-11', 'Yanbu desalinated water transmission line', 'Water and wastewater', 'semi-government', 357_000_000, '2025-03-18', '2025-06-17', 'lost', 'price', 66],
  ['O-25-03', 'Khamis Mushait sewer network, Phase 3', 'Water and wastewater', 'government', 141_000_000, '2025-04-07', '2025-06-18', 'won', null, 72],
  ['O-25-23', 'Jazan dam conveyance pipeline', 'Water and wastewater', 'government', 246_000_000, '2025-03-23', '2025-06-29', 'lost', 'pq', 10],
  ['O-25-14', 'Sakaka water distribution network', 'Water and wastewater', 'government', 100_000_000, '2025-04-10', '2025-06-30', 'lost', 'local-content', 44],
  ['O-25-21', 'Tabuk STP operation and maintenance', 'Water and wastewater', 'semi-government', 56_000_000, '2025-04-10', '2025-07-06', 'lost', 'other', 17],
  ['O-25-26', 'Hail city bypass', 'Roads', 'government', 129_000_000, '2025-03-26', '2025-07-09', 'lost', 'technical', 32],
  ['O-25-10', 'Jubail STP expansion', 'Water and wastewater', 'semi-government', 305_000_000, '2025-04-20', '2025-07-22', 'lost', 'price', 74],
  ['O-25-33', 'Ras Tanura access road', 'Roads', 'private', 64_000_000, '2025-04-17', '2025-07-27', 'lost', 'price', 12],
  ['O-25-08', 'Al-Ahsa ring road, section 2', 'Roads', 'government', 158_000_000, '2025-04-24', '2025-08-10', 'won', null, 56],
  ['O-25-28', 'Buraydah urban roads package', 'Roads', 'government', 88_000_000, '2025-06-04', '2025-08-17', 'lost', 'local-content', 22],
  ['O-25-18', 'Makkah trunk sewer tunnel', 'Water and wastewater', 'government', 517_000_000, '2025-06-08', '2025-08-28', 'lost', 'technical', 28],
  ['O-25-04', 'Qatif water network rehabilitation', 'Water and wastewater', 'semi-government', 111_000_000, '2025-06-05', '2025-09-03', 'won', null, 58],
  ['O-25-24', 'Riyadh ring road interchange upgrade', 'Roads', 'government', 193_000_000, '2025-06-11', '2025-09-14', 'lost', 'price', 52],
  ['O-25-12', 'Rabigh wastewater network', 'Water and wastewater', 'government', 135_000_000, '2025-06-18', '2025-10-05', 'lost', 'technical', 61],
  ['O-25-32', 'Jubail industrial road resurfacing', 'Roads', 'semi-government', 50_000_000, '2025-07-28', '2025-10-12', 'lost', 'price', 15],
  ['O-25-22', 'Al-Baha water network extension', 'Water and wastewater', 'government', 76_000_000, '2025-07-28', '2025-10-19', 'lost', 'price', 14],
  ['O-25-09', 'Dammam port access road upgrade', 'Roads', 'government', 105_000_000, '2025-07-28', '2025-10-26', 'won', null, 38],
  ['O-25-27', 'Khobar coastal road improvement', 'Roads', 'government', 152_000_000, '2025-08-11', '2025-11-23', 'lost', 'price', 26],
  ['O-25-07', 'Majma\'ah sewage lift stations', 'Water and wastewater', 'semi-government', 94_000_000, '2025-10-07', '2025-11-26', 'won', null, 35],
  ['O-25-17', 'Najran STP', 'Water and wastewater', 'government', 170_000_000, '2025-09-18', '2025-11-30', 'lost', 'price', 33],
  ['O-25-05', 'Hafr Al-Batin STP expansion', 'Water and wastewater', 'government', 182_000_000, '2025-09-18', '2025-12-03', 'won', null, 54],
  ['O-25-19', 'Jeddah industrial wastewater treatment plant', 'Water and wastewater', 'private', 404_000_000, '2025-10-09', '2026-01-25', 'lost', 'price', 24],
  ['O-25-31', 'Taif mountain road safety works', 'Roads', 'government', 90_000_000, '2025-12-11', '2026-01-28', 'lost', 'other', 18],
  ['O-25-29', 'Abqaiq industrial access road', 'Roads', 'semi-government', 120_000_000, '2025-12-09', '2026-02-02', 'lost', 'price', 20],
  ['O-25-01', 'Al-Kharj water transmission main and reservoirs', 'Water and wastewater', 'semi-government', 700_000_000, '2025-11-24', '2026-02-03', 'won', null, 63],
  ['O-25-13', 'Taif STP, Phase 2', 'Water and wastewater', 'government', 450_000_000, '2025-12-14', '2026-02-04', 'lost', 'price', 46],
  ['O-25-25', 'Qassim expressway, section 4', 'Roads', 'government', 240_000_000, '2025-11-27', '2026-02-05', 'lost', 'price', 34],
];

const DG1_HISTORY: Dg1Tuple[] = [
  ['T-2025-388', 'Hospital water treatment equipment, supply only', 'discard', '2025-12-08T09:00', 'najd.hot', 'discard', true, ['out-of-scope']],
  ['T-2025-391', 'Riyadh South sewage pumping main', 'pursue', '2025-11-20T09:15', 'najd.bid', 'pursue', true, []],
  ['T-2025-402', 'Buraydah treated effluent reuse line', 'hold', '2025-12-10T16:00', 'najd.bid', 'conditions', true, ['information-requested'], 'Finance to confirm facility headroom'],
  ['T-2025-412', 'Khafji coastal road rehabilitation', 'pursue', '2025-10-13T10:40', 'najd.bid', 'pursue', true, []],
  ['T-2025-396', 'Desalination membrane replacement, Jubail', 'discard', '2025-12-11T12:17', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2025-399', 'Sewer manhole rehabilitation, Hail', 'discard', '2025-12-15T15:34', 'najd.bid', 'discard', true, ['below-value']],
  ['T-2025-407', 'Makkah deep tunnel sewer, Phase 1', 'discard', '2025-12-18T11:51', 'najd.bid', 'discard', true, ['pq-fail']],
  ['T-2025-438', 'Yanbu STP rehabilitation', 'pursue', '2025-10-22T12:05', 'najd.bid', 'pursue', true, []],
  ['T-2025-415', 'Airport terminal plumbing works', 'discard', '2025-12-21T14:08', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2025-447', 'Al-Kharj reservoir rehabilitation', 'pursue', '2025-12-22T15:10', 'najd.bid', 'discard', true, ['client-relationship'], 'Discard recommended on size, but CCWS has asked us to bid; strong payment record'],
  ['T-2025-421', 'Hofuf STP emergency upgrade', 'discard', '2025-12-24T10:25', 'najd.hot', 'discard', true, ['insufficient-time']],
  ['T-2025-429', 'Irrigation canal lining, Al-Ahsa', 'discard', '2025-12-28T13:42', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2025-433', 'Jeddah desalination intake, marine works', 'discard', '2025-12-31T09:59', 'najd.bid', 'discard', true, ['pq-fail']],
  ['T-2026-079', 'Qassim water networks', 'pursue', '2026-01-04T11:30', 'najd.bid', 'pursue', true, []],
  ['T-2025-441', 'Water network valves replacement, Qassim', 'discard', '2026-01-04T12:16', 'najd.bid', 'discard', true, ['below-value']],
  ['T-2025-452', 'Smart water meter software platform', 'discard', '2026-01-06T15:33', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-088', 'Dammam stormwater tunnels', 'pursue', '2026-01-07T14:20', 'najd.bid', 'pursue', true, []],
  ['T-2026-014', 'Qatif sewage treatment upgrade', 'pursue', '2026-01-08T10:05', 'najd.bid', 'pursue', true, []],
  ['T-2026-097', 'Madinah WTP expansion', 'pursue', '2026-01-11T10:30', 'najd.bid', 'pursue', true, []],
  ['T-2025-456', 'Tabuk sewer network extension', 'discard', '2026-01-11T11:50', 'najd.hot', 'discard', true, ['capacity']],
  ['T-2026-005', 'Marine outfall inspection services', 'discard', '2026-01-13T14:07', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-008', 'Tabuk coastal water reuse plant, design-build-operate', 'discard', '2026-01-15T10:24', 'najd.bid', 'discard', true, ['pq-fail']],
  ['T-2026-101', 'Abha STP upgrade', 'pursue', '2026-02-12T13:05', 'najd.bid', 'pursue', true, []],
  ['T-2026-011', 'Pump station refurbishment, Arar', 'discard', '2026-01-19T13:41', 'najd.bid', 'discard', true, ['below-value']],
  ['T-2026-031', 'Dammam water network, zone 7', 'pursue', '2026-01-21T11:45', 'najd.hot', 'discard', true, ['client-relationship'], 'Below the value band, but a repeat client with three contracts on time'],
  ['T-2026-019', 'Water tanker fleet leasing', 'discard', '2026-01-22T09:58', 'najd.bid', 'discard', false, ['out-of-scope'], 'Recorded late: decider on leave; no delegate set'],
  ['T-2026-022', 'Taif water transmission, re-tender', 'discard', '2026-01-26T12:15', 'najd.hot', 'discard', true, ['insufficient-time']],
  ['T-2026-027', 'Laboratory equipment for water testing', 'discard', '2026-01-29T15:32', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-035', 'Riyadh rail corridor utility diversions', 'discard', '2026-02-01T11:49', 'najd.bid', 'discard', true, ['pq-fail']],
  ['T-2026-046', 'Jubail water storage tanks', 'pursue', '2026-02-02T13:30', 'najd.bid', 'pursue', true, []],
  ['T-2026-038', 'House connections programme, Buraydah', 'discard', '2026-02-05T14:06', 'najd.bid', 'discard', true, ['below-value']],
  ['T-2026-042', 'Dam safety monitoring consultancy', 'discard', '2026-02-05T10:23', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-058', 'Hofuf sewage lift stations', 'pursue', '2026-02-04T09:40', 'najd.bid', 'discard', true, ['client-relationship'], 'Low fit on terms, but the client is a strategic account in Al-Ahsa'],
  ['T-2026-053', 'Chlorine dosing chemicals, 3-year supply', 'discard', '2026-02-15T09:57', 'najd.bid', 'discard', true, ['out-of-scope']],
  ['T-2026-066', 'Unaizah water network extension', 'pursue', '2026-02-01T12:20', 'najd.bid', 'pursue', true, []],
  ['T-2026-071', 'Riyadh North water reservoirs', 'hold', '2026-02-17T10:50', 'najd.hot', 'conditions', true, ['information-requested'], 'Coordinator to confirm the turnover years asked for'],
  ['T-2026-060', 'Jazan STP expansion', 'discard', '2026-02-18T12:14', 'najd.bid', 'discard', true, ['capacity']],
  ['T-2026-063', 'Yanbu industrial water plant, 25-year O&M', 'discard', '2026-02-19T15:31', 'najd.bid', 'discard', true, ['pq-fail']],
  ['T-2026-074', 'Lift station odour control, Khobar', 'discard', '2026-02-24T11:48', 'najd.bid', 'discard', true, ['below-value']],
  ['T-2026-104', 'Jubail industrial wastewater treatment upgrade', 'pursue', '2026-02-26T09:50', 'najd.bid', 'pursue', true, []],
  ['T-2026-083', 'Al-Kharj stormwater drainage', 'discard', '2026-02-03T14:05', 'najd.hot', 'discard', true, ['insufficient-time']],
  ['T-2026-090', 'Abha water network rehabilitation', 'discard', '2026-01-29T10:22', 'najd.bid', 'pursue', true, ['capacity'], 'Recommended Pursue, but the Water team is fully committed until May'],
  ['T-2026-112', 'Hofuf water network extension', 'discard', '2026-03-03T15:40', 'najd.bid', 'discard', true, ['below-value']],
  ['T-2026-109', 'Tabuk water transmission pipeline, Phase 1', 'pursue', '2026-03-04T11:20', 'najd.bid', 'pursue', true, []],
  ['T-2026-092', 'District cooling network, Riyadh', 'discard', '2026-02-01T13:39', 'najd.bid', 'discard', true, ['out-of-scope']],
];

const DG2_HISTORY: Dg2Tuple[] = [
  ['T-2025-118', 'Khamis Mushait sewer network, Phase 3', '2025-03-19T13:00', 'bid', true, false],
  ['T-2025-131', 'Jubail STP expansion', '2025-03-30T11:00', 'bid', true, false],
  ['T-2025-149', 'Makkah trunk sewer tunnel', '2025-04-22T14:30', 'bid', true, true],
  ['T-2025-162', 'Al-Ahsa ring road, section 2', '2025-03-20T10:00', 'bid', true, false],
  ['T-2025-177', 'Taif STP, Phase 2', '2025-11-10T12:00', 'bid', true, false],
  ['T-2025-190', 'Qatif water network rehabilitation', '2025-05-08T09:30', 'bid', true, false],
  ['T-2025-204', 'Medina industrial water network', '2025-07-15T15:00', 'no-bid', true, false, 'JV offer'],
  ['T-2025-236', 'Jeddah industrial wastewater treatment plant', '2025-09-09T13:00', 'bid', true, false],
  ['T-2025-251', 'Hafr Al-Batin STP expansion', '2025-08-24T10:30', 'bid', false, false],
  ['T-2025-268', 'Riyadh East wastewater tunnel', '2025-10-20T14:00', 'no-bid', true, false, 'competitor withdrew'],
  ['T-2025-290', 'Al-Kharj water transmission main and reservoirs', '2025-10-16T11:00', 'bid', true, false],
  ['T-2025-331', 'Qassim expressway, section 4', '2025-10-20T12:30', 'bid', true, false],
  ['T-2025-412', 'Khafji coastal road rehabilitation', '2025-11-09T10:00', 'bid', true, false],
  ['T-2025-438', 'Yanbu STP rehabilitation', '2025-11-17T13:30', 'bid', true, false],
  ['T-2025-447', 'Al-Kharj reservoir rehabilitation', '2026-01-19T11:00', 'no-bid', true, false],
  ['T-2026-079', 'Qassim water networks', '2026-01-26T12:00', 'bid', true, false],
  ['T-2026-088', 'Dammam stormwater tunnels', '2026-02-02T10:30', 'bid', true, false],
];

const DG1 = dg1Records(DG1_HISTORY);

/** The DG1 record of a register row, from the history above. */
function dg1Of(tenderId: string) {
  const r = DG1.find((d) => d.tenderId === tenderId);
  if (!r) throw new Error(`Najd seed: no DG1 record for ${tenderId}`);
  return r;
}

// ---------------------------------------------------------------------------
// Sources (§2.2). Reconciliation counts all 9; Etimad's credentials expire Fri 13 Mar.

const SOURCES: Source[] = [
  { id: 'etimad', name: 'Etimad', kind: 'portal', mode: 'scheduled', state: 'credentials-expiring', lastPoll: '2026-03-08T09:55',
    note: 'Service-account password expires Fri 13 Mar' },
  { id: 'nwu-portal', name: 'National water utility supplier portal', kind: 'client-portal', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T09:30',
    note: 'Login-gated: an operator completes access' },
  { id: 'industrial-portal', name: 'Industrial utilities vendor portal', kind: 'client-portal', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T08:45',
    note: 'An operator completes access' },
  { id: 'og-portal', name: 'Oil and gas operator vendor portal', kind: 'client-portal', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T08:40',
    note: 'An operator completes access' },
  { id: 'municipal-listing', name: 'Eastern Province municipal projects listing', kind: 'portal', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:50' },
  { id: 'mail-tenders', name: 'tenders@najd.example', kind: 'mailbox', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:58', note: 'IMAP; attachments opened' },
  { id: 'mail-bids', name: 'bids@najd.example', kind: 'mailbox', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:58', note: 'IMAP; attachments opened' },
  { id: 'scan', name: 'Scanned drop', kind: 'scan', mode: 'scheduled', state: 'healthy', lastPoll: '2026-03-08T09:20', note: 'OCR on arrival' },
  { id: 'manual', name: 'Manual upload', kind: 'manual', mode: 'assisted', state: 'healthy', lastPoll: '2026-03-08T10:00', note: 'Any user with upload rights' },
];

// ---------------------------------------------------------------------------
// Today's intake. 11 new notices (Etimad 7, portals 1, email 2, scanned 1),
// plus Addendum 2 to T-2026-097. Receipt to logged, in minutes:
// 5, 6, 7, 7, 8, 8, 9, 10, 10, 11, 14 (the addendum is one of the 10s), so
// nearest-rank p90 is 11 with or without the addendum; worst 14. T-2026-122 is
// a notice only: no documents yet, so it has no logged time.

const INTAKE_TODAY: IntakeEvent[] = [
  { id: 'IN-0308-01', sourceId: 'etimad', tenderId: HERO_ID, ref: 'ECWS/PRJ/2026/0147', title: 'Expansion of Al-Rawdah STP, Phase 2', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T07:33', loggedAt: '2026-03-08T07:44', disposition: 'shortlisted' },
  { id: 'IN-0308-02', sourceId: 'etimad', tenderId: 'T-2026-119', ref: 'RSCW/MW/2026/022', title: 'Jazan seawater intake and outfall', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T07:52', loggedAt: '2026-03-08T08:00', disposition: 'low-fit' },
  { id: 'IN-0308-03', sourceId: 'mail-tenders', tenderId: 'T-2026-120', ref: 'Tender No. 33/2025', title: 'Wadi Zarqa WWTP Phase I DBO, prequalification', docType: 'PQ', language: 'EN',
    receivedAt: '2026-03-08T08:06', loggedAt: '2026-03-08T08:13', disposition: 'needs-validation' },
  { id: 'IN-0308-04', sourceId: 'mail-bids', tenderId: 'T-2026-121', ref: 'Restricted', title: 'Restricted tender', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T08:21', loggedAt: '2026-03-08T08:26', disposition: 'restricted' },
  { id: 'IN-0308-05', sourceId: 'etimad', tenderId: 'T-2026-122', ref: 'ECWS/OPS/2026/0061', title: 'Dammam lift stations rehabilitation', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T08:34', disposition: 'notice-only' },
  { id: 'IN-0308-06', sourceId: 'etimad', tenderId: 'T-2026-123', ref: 'CCWS/OM/2026/014', title: 'O&M of wastewater lift stations, Al-Kharj', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T08:40', loggedAt: '2026-03-08T08:46', disposition: 'low-fit' },
  { id: 'IN-0308-07', sourceId: 'etimad', tenderId: 'T-2026-124', ref: 'CCWS/SUP/2026/031', title: 'Supply of ductile iron pipes and fittings, Qassim', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T08:55', loggedAt: '2026-03-08T09:02', disposition: 'low-fit' },
  { id: 'IN-0308-08', sourceId: 'nwu-portal', tenderId: 'T-2026-125', ref: 'KWN-MTR-2026-03', title: 'Water meter replacement programme, Riyadh, Phase 3', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T09:05', loggedAt: '2026-03-08T09:13', disposition: 'low-fit' },
  { id: 'IN-0308-09', sourceId: 'etimad', tenderId: 'T-2026-097', ref: 'WCWS/PRJ/2026/0009, Addendum 2', title: 'Madinah WTP expansion: Addendum 2', docType: 'Addendum', language: 'EN',
    receivedAt: '2026-03-08T09:12', loggedAt: '2026-03-08T09:22', disposition: 'addendum' },
  { id: 'IN-0308-10', sourceId: 'etimad', tenderId: 'T-2026-126', ref: 'NCWS/CON/2026/007', title: 'Wastewater master plan update, Tabuk (consultancy)', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T09:18', loggedAt: '2026-03-08T09:27', disposition: 'low-fit' },
  { id: 'IN-0308-11', sourceId: 'scan', tenderId: 'T-2026-128', ref: 'Letter 1447/588', title: 'Rehabilitation of rural water reservoirs, Al-Aflaj', docType: 'Tender', language: 'AR',
    receivedAt: '2026-03-08T09:20', loggedAt: '2026-03-08T09:34', disposition: 'low-fit' },
  { id: 'IN-0308-12', sourceId: 'etimad', tenderId: 'T-2026-127', ref: 'NBMP/RD/2026/019', title: 'Road resurfacing and street lighting, Hafr Al-Batin', docType: 'Tender', language: 'EN',
    receivedAt: '2026-03-08T09:24', loggedAt: '2026-03-08T09:34', disposition: 'low-fit' },
];

// ---------------------------------------------------------------------------
// Register (§5.1), plus the other notices captured today (restricted and low
// fit) and two bids submitted in December that their employers cancelled
// (plan 017: dashboards.md §12.2 has no room for them in Stage 8).

const lowFit = (row: Omit<GccTender, 'issuerIsReal' | 'country' | 'bidManagerId' | 'invited' | 'validations' | 'stage' | 'stageNote' | 'procurement'>): GccTender => ({
  issuerIsReal: false, country: 'Saudi Arabia', bidManagerId: 'najd.bid', invited: [], validations: [], stage: 'S1', procurement: 'open',
  stageNote: 'Low fit: flagged for a person to decide', ...row,
});

const INVITED_PACK = ['najd.comm', 'najd.plan', 'najd.comp', 'najd.dir', 'najd.fin'];

const REGISTER: GccTender[] = [
  heroTender({
    sourceId: 'etimad',
    sourceDetail: 'Etimad: captured when published; booklet bought through SADAD',
    bidManagerId: 'najd.bid',
    stageNote: 'Logged this morning; fields to check before DG1',
    intake: { capturedAt: '2026-03-08T07:15', purchasedAt: '2026-03-08T07:31', loggedAt: '2026-03-08T07:44', disposition: 'shortlisted' },
    conflictsRaisedAt: '2026-03-08T07:44',
    fit: fit([
      [10, 'STP expansion with tertiary treatment and TSE reuse: the core of the Water & wastewater business', 'Capability profile'],
      [9, 'The estimate sits inside the preferred value band and below the single-contract limit', 'Platform estimate; Fit model & rules'],
      [8, 'Meets the PQ lines, but two certificates expire before bid opening and the turnover years need a query', 'Eligibility check against the credential vault'],
      [9, 'Eastern Province: the Dammam office is close to the site', 'Company profile: offices'],
      [8, 'ECWS: past contracts delivered on time; payments within terms', 'Similar-projects register; client history'],
      [6, 'Standard government terms, but the delay penalty cap is blank and the guarantee rate is in conflict', 'Extraction flags'],
      [6, 'The Water team is heavily committed for the next four weeks; this bid takes it close to full', 'Capacity: Water tendering team'],
      [8, 'Headroom covers the initial guarantee at either rate', 'Bank guarantee facility, as confirmed by Finance'],
      [8, 'Tertiary treatment and TSE reuse are growth priorities in the 2026 plan', 'Strategy: sector priorities'],
    ]),
  }),
  {
    id: 'T-2026-117', title: 'Riyadh North sewer network rehabilitation', shortTitle: 'Riyadh North sewer rehab', issuer: CCWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Riyadh', sector: 'Utility networks', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'open',
    value: { amount: 190_000_000, ccy: 'SAR', basis: 'estimate', band: [170_000_000, 215_000_000] },
    stage: 'S1', stageNote: 'Validated; waiting for DG1', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2026-03-07', page: 1 },
      { kind: 'questions', date: '2026-03-17', page: 3 },
      { kind: 'submission', date: '2026-04-14', time: '10:00', page: 3 },
      { kind: 'opening', date: '2026-04-14', time: '10:30', page: 3 },
      { kind: 'validity-end', date: '2026-07-13', page: 6 },
    ],
    requirements: T117_REQUIREMENTS,
    fit: fit([
      [8, 'Sewer network rehabilitation: a regular line of work for the networks team', 'Capability profile'],
      [7, 'Inside the value band, at its lower end', 'Platform estimate; Fit model & rules'],
      [9, 'Meets every PQ line; certificates valid at opening', 'Eligibility check against the credential vault'],
      [9, 'Riyadh: head office city', 'Company profile: offices'],
      [7, 'CCWS: reliable payer; one dispute on variations settled in 2024', 'Client history'],
      [6, 'Standard terms; working in live streets needs traffic permits', 'Extraction'],
      [4, 'The networks team is committed to the Dammam stormwater proposal until late March', 'Capacity: networks and roads team'],
      [8, 'Bid bond well inside headroom', 'Bank guarantee facility'],
      [5, 'Maintains the relationship; not a growth priority', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-07T15:58', loggedAt: '2026-03-07T16:10', disposition: 'shortlisted' },
  },
  {
    id: 'T-2026-119', title: 'Jazan seawater intake and outfall (marine works)', shortTitle: 'Jazan seawater intake and outfall', issuer: 'Red Sea Coastal Water Company', issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Jazan', sector: 'Marine works', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'open',
    value: { amount: 260_000_000, ccy: 'SAR', basis: 'estimate', band: [220_000_000, 300_000_000] },
    stage: 'S1', stageNote: 'Low fit: flagged for a person to decide', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2026-03-08', page: 1 },
      { kind: 'questions', date: '2026-03-22', page: 4 },
      { kind: 'submission', date: '2026-04-26', time: '10:00', page: 4 },
      { kind: 'opening', date: '2026-04-26', time: '10:30', page: 4 },
    ],
    requirements: T119_REQUIREMENTS,
    fit: fit([
      [2, 'Marine intake and outfall works: outside the company\'s scope', 'Capability profile'],
      [6, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [2, 'No marine works classification and no offshore experience', 'Eligibility check against the credential vault'],
      [4, 'Jazan: no office in the south-west', 'Company profile: offices'],
      [6, 'New client; public utility with a sound payment record', 'Client history'],
      [6, 'Standard terms; marine weather risk sits with the contractor', 'Extraction'],
      [5, 'Would need a marine estimating partner', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [5, 'Desalination intakes are a possible adjacent market', 'Strategy: sector priorities'],
    ]),
    validations: [
      { id: 'VAL-119-1', tenderId: 'T-2026-119', field: 'Outfall length offshore', value: '2.4 km', page: 14, confidence: 0.66,
        reason: 'Value on a table spanning pages', blocksDg1: false, raisedAt: '2026-03-08T08:00' },
    ],
    intake: { capturedAt: '2026-03-08T07:52', loggedAt: '2026-03-08T08:00', disposition: 'low-fit' },
  },
  {
    id: 'T-2026-120', title: 'Wadi Zarqa Wastewater Treatment Plant Phase I, Design-Build-Operate: prequalification', shortTitle: 'Wadi Zarqa WWTP Phase 1 DBO (PQ)',
    issuer: 'Water Authority of Jordan (WAJ)', issuerIsReal: true,
    country: 'Jordan', city: 'Zarqa', sector: 'Water and wastewater', sourceId: 'mail-tenders', sourceDetail: 'Email from a consultant, with the RFQ attached', procurement: 'pq',
    value: { amount: 0, ccy: 'USD', basis: 'not-stated' },
    stage: 'S1', stageNote: 'Past-dated; use Treat as newly published', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2025-10-23', page: 1 },
      { kind: 'questions', date: '2025-12-08', time: '12:00', page: 25 },
      { kind: 'submission', date: '2025-12-29', time: '12:00', page: 26, note: 'Hard-copy application' },
      { kind: 'opening', date: '2025-12-29', time: '13:00', page: 26 },
    ],
    docKey: 'wadi-zarqa',
    fit: fit([
      [9, 'WWTP design-build-operate, 150,000 m³/day: squarely in the lead sector', 'Capability profile'],
      [6, 'Value not stated; the PQ thresholds suggest a large contract', 'Extraction: PQ thresholds'],
      [6, 'Not yet checked: the PQ criteria need Jordanian registration and a narrow O&M reference', 'Extraction flags'],
      [2, 'Jordan: outside the GCC and with no local presence', 'Company profile: offices'],
      [5, 'New client; financing only applied for', 'Extraction flags'],
      [5, 'FIDIC Gold Book with a 20-year operation period', 'Extraction'],
      [5, 'PQ stage only: light effort now, heavy later', 'Capacity'],
      [6, 'Security must span design-build and operation', 'Extraction flags'],
      [4, 'Not a target market in the 2026 plan', 'Strategy: sector priorities'],
    ]),
    validations: [
      { id: 'VAL-120-1', tenderId: 'T-2026-120', field: 'Conveyance pipeline diameter', value: 'Up to 1,600 mm', page: 3, alt: { value: '1,600–1,700 mm (to be verified)', page: 67 },
        confidence: 0.55, reason: 'Two values stated: the notice and Section VII', blocksDg1: false, raisedAt: '2026-03-08T08:13' },
      { id: 'VAL-120-2', tenderId: 'T-2026-120', field: 'Flow diverted from the West Zarqa pump station', value: '60–80%', page: 69,
        confidence: 0.6, reason: 'The remaining share is given as 30 percent, which does not add up', blocksDg1: false, raisedAt: '2026-03-08T08:13' },
    ],
    intake: { capturedAt: '2026-03-08T08:06', loggedAt: '2026-03-08T08:13', disposition: 'needs-validation' },
  },
  {
    id: 'T-2026-121', title: 'Strategic water storage reservoirs, Central Region', shortTitle: 'Strategic water storage reservoirs', issuer: 'Central Region Strategic Utilities Office', issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Riyadh', sector: 'Water and wastewater', sourceId: 'mail-bids', sourceDetail: 'Limited tender invitation by email', procurement: 'limited',
    value: { amount: 340_000_000, ccy: 'SAR', basis: 'estimate', band: [300_000_000, 380_000_000] },
    stage: 'S1', stageNote: 'Restricted lane: cleared people only', bidManagerId: 'najd.bid', invited: [], restricted: true,
    keyDates: [
      { kind: 'published', date: '2026-03-08', page: 1 },
      { kind: 'submission', date: '2026-04-30', time: '12:00', page: 2 },
    ],
    fit: fit([
      [8, 'Large reservoirs and pumping: within Water & wastewater', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [8, 'Invitation confirms prequalified status', 'Invitation letter'],
      [8, 'Central Region: head office', 'Company profile: offices'],
      [7, 'Government client; security vetting required', 'Invitation letter'],
      [5, 'Confidentiality undertakings and site access restrictions', 'Invitation letter'],
      [5, 'Short bid period', 'Capacity'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Strategic client relationship', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T08:21', loggedAt: '2026-03-08T08:26', disposition: 'restricted' },
  },
  {
    id: 'T-2026-122', title: 'Dammam lift stations rehabilitation', shortTitle: 'Dammam lift stations rehab', issuer: ECWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Dammam', sector: 'Water and wastewater', sourceId: 'etimad', sourceDetail: 'Etimad notice; booklet not yet bought', procurement: 'open',
    value: { amount: 85_000_000, ccy: 'SAR', basis: 'estimate', band: [70_000_000, 100_000_000] },
    documentFee: SAR(3_000),
    stage: 'S1', stageNote: 'Notice only: booklet not yet bought', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2026-03-08' },
      { kind: 'purchase', date: '2026-03-10', note: 'Booklet purchase closes' },
      { kind: 'submission', date: '2026-04-12', time: '10:00' },
    ],
    fit: fit([
      [7, 'Lift station rehabilitation: in sector, mechanical and electrical heavy', 'Etimad notice'],
      [4, 'Below the preferred value band', 'Platform estimate from the notice'],
      [7, 'Preliminary: the booklet is not yet bought', 'Etimad notice'],
      [9, 'Dammam office', 'Company profile: offices'],
      [8, 'ECWS: repeat client', 'Client history'],
      [5, 'Not known until the booklet is read', 'Etimad notice'],
      [6, 'Small team effort', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [4, 'Keeps the ECWS relationship warm', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-08T08:34', disposition: 'notice-only' },
  },
  lowFit({
    id: 'T-2026-123', title: 'Operation and maintenance of wastewater lift stations, Al-Kharj (3 years)', shortTitle: 'Al-Kharj lift stations O&M', issuer: CCWS,
    city: 'Al-Kharj', sector: 'O&M services', sourceId: 'etimad', sourceDetail: 'Etimad',
    value: { amount: 36_000_000, ccy: 'SAR', basis: 'estimate' },
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'submission', date: '2026-04-05', time: '10:00' }],
    fit: fit([
      [2, 'O&M service contract, not construction', 'Capability profile'],
      [2, 'Well below the value band', 'Platform estimate'],
      [5, 'O&M experience on record, but no service classification', 'Eligibility check'],
      [8, 'Near Riyadh', 'Company profile: offices'],
      [7, 'CCWS: reliable payer', 'Client history'],
      [5, 'Performance penalties on availability', 'Extraction'],
      [6, 'Low bid effort', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [3, 'Not a strategic service line', 'Strategy: sector priorities'],
    ]),
    intake: { capturedAt: '2026-03-08T08:40', loggedAt: '2026-03-08T08:46', disposition: 'low-fit' },
  }),
  lowFit({
    id: 'T-2026-124', title: 'Supply of ductile iron pipes and fittings, Qassim (supply only)', shortTitle: 'DI pipes supply, Qassim', issuer: CCWS,
    city: 'Buraydah', sector: 'Supply', sourceId: 'etimad', sourceDetail: 'Etimad',
    value: { amount: 22_000_000, ccy: 'SAR', basis: 'estimate' },
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'submission', date: '2026-03-29', time: '10:00' }],
    fit: fit([
      [0, 'Supply-only tender: the company is a contractor, not a supplier', 'Capability profile'],
      [1, 'Well below the value band', 'Platform estimate'],
      [3, 'Asks for manufacturer or agent status', 'Eligibility check'],
      [7, 'Qassim: served from Riyadh', 'Company profile: offices'],
      [7, 'CCWS: reliable payer', 'Client history'],
      [5, 'Standard supply terms', 'Extraction'],
      [8, 'Low bid effort', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [2, 'Not a business line', 'Strategy: sector priorities'],
    ]),
    intake: { capturedAt: '2026-03-08T08:55', loggedAt: '2026-03-08T09:02', disposition: 'low-fit' },
  }),
  lowFit({
    id: 'T-2026-125', title: 'Water meter replacement programme, Riyadh, Phase 3', shortTitle: 'Riyadh water meters, Phase 3', issuer: 'Kingdom Water Networks Company',
    city: 'Riyadh', sector: 'Metering services', sourceId: 'nwu-portal', sourceDetail: 'National water utility supplier portal',
    value: { amount: 48_000_000, ccy: 'SAR', basis: 'estimate' },
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'submission', date: '2026-04-09', time: '12:00' }],
    fit: fit([
      [1, 'Meter replacement and data services: outside construction', 'Capability profile'],
      [2, 'Below the value band', 'Platform estimate'],
      [4, 'Asks for metering system integrator references', 'Eligibility check'],
      [9, 'Riyadh', 'Company profile: offices'],
      [8, 'Approved on this utility\'s vendor list', 'Credential vault: approved vendor list'],
      [6, 'Standard terms', 'Extraction'],
      [6, 'Moderate effort', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [3, 'Not a strategic line', 'Strategy: sector priorities'],
    ]),
    intake: { capturedAt: '2026-03-08T09:05', loggedAt: '2026-03-08T09:13', disposition: 'low-fit' },
  }),
  lowFit({
    id: 'T-2026-126', title: 'Consultancy: wastewater master plan update, Tabuk', shortTitle: 'Tabuk wastewater master plan', issuer: NCWS,
    city: 'Tabuk', sector: 'Consultancy', sourceId: 'etimad', sourceDetail: 'Etimad',
    value: { amount: 12_000_000, ccy: 'SAR', basis: 'estimate' },
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'submission', date: '2026-03-31', time: '10:00' }],
    fit: fit([
      [0, 'Consultancy study: the company does not offer planning services', 'Capability profile'],
      [0, 'Far below the value band', 'Platform estimate'],
      [2, 'Asks for an engineering consultancy licence', 'Eligibility check'],
      [6, 'Tabuk: served from a live project nearby', 'Company profile: offices'],
      [6, 'NCWS: reliable payer', 'Client history'],
      [6, 'Standard consultancy terms', 'Extraction'],
      [8, 'Low effort', 'Capacity'],
      [8, 'No bid bond', 'Bank guarantee facility'],
      [2, 'Not a business line', 'Strategy: sector priorities'],
    ]),
    intake: { capturedAt: '2026-03-08T09:18', loggedAt: '2026-03-08T09:27', disposition: 'low-fit' },
  }),
  lowFit({
    id: 'T-2026-127', title: 'Road resurfacing and street lighting, Hafr Al-Batin', shortTitle: 'Hafr Al-Batin resurfacing', issuer: 'Northern Borders Municipal Projects Office',
    city: 'Hafr Al-Batin', sector: 'Roads', sourceId: 'etimad', sourceDetail: 'Etimad',
    value: { amount: 64_000_000, ccy: 'SAR', basis: 'estimate' },
    keyDates: [{ kind: 'published', date: '2026-03-08' }, { kind: 'submission', date: '2026-04-15', time: '10:00' }],
    fit: fit([
      [4, 'Resurfacing and lighting: roads, but not the company\'s focus', 'Capability profile'],
      [3, 'Below the value band', 'Platform estimate'],
      [6, 'Roads Grade 2 meets the requirement', 'Eligibility check'],
      [3, 'Hafr Al-Batin: far from any office', 'Company profile: offices'],
      [5, 'Municipal client; slow payments reported', 'Client history'],
      [5, 'Standard terms', 'Extraction'],
      [6, 'Networks and roads team has some room', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [3, 'Not a priority region', 'Strategy: sector priorities'],
    ]),
    intake: { capturedAt: '2026-03-08T09:24', loggedAt: '2026-03-08T09:34', disposition: 'low-fit' },
  }),
  lowFit({
    id: 'T-2026-128', title: 'Rehabilitation of rural water reservoirs, Al-Aflaj (hand-delivered invitation)', shortTitle: 'Al-Aflaj rural reservoirs', issuer: 'Southern Riyadh Rural Water Directorate',
    city: 'Al-Aflaj', sector: 'Water and wastewater', sourceId: 'scan', sourceDetail: 'Scanned invitation letter, in Arabic',
    value: { amount: 18_000_000, ccy: 'SAR', basis: 'estimate' },
    // Submission on the first working day after the expected Eid al-Fitr closure (19–28 Mar).
    keyDates: [{ kind: 'published', date: '2026-03-05' }, { kind: 'submission', date: '2026-03-29', time: '12:00' }],
    fit: fit([
      [5, 'Small reservoir repairs: in sector but minor works', 'Capability profile'],
      [0, 'Far below the value band', 'Platform estimate'],
      [5, 'Requirements unclear from the letter', 'Scanned letter'],
      [6, 'Al-Aflaj: three hours from Riyadh', 'Company profile: offices'],
      [5, 'New client', 'Client history'],
      [5, 'Terms not stated in the letter', 'Scanned letter'],
      [7, 'Low effort', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [2, 'Not strategic', 'Strategy: sector priorities'],
    ]),
    intake: { capturedAt: '2026-03-08T09:20', loggedAt: '2026-03-08T09:34', disposition: 'low-fit' },
  }),
  {
    id: 'T-2026-112', title: 'Hofuf water network extension', shortTitle: 'Hofuf water network extension', issuer: ECWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Hofuf', sector: 'Utility networks', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'open',
    value: { amount: 95_000_000, ccy: 'SAR', basis: 'estimate', band: [80_000_000, 110_000_000] },
    stage: 'closed', stageNote: 'Discarded at DG1: below the value band', bidManagerId: 'najd.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-03-03' }, { kind: 'submission', date: '2026-04-06', time: '10:00' }],
    fit: fit([
      [5, 'Distribution network extension: small-diameter work', 'Capability profile'],
      [0, 'Below the preferred value band', 'Platform estimate; Fit model & rules'],
      [4, 'Asks for a local Al-Ahsa office', 'Eligibility check'],
      [8, 'Eastern Province', 'Company profile: offices'],
      [5, 'ECWS: repeat client', 'Client history'],
      [5, 'Standard terms', 'Extraction'],
      [6, 'Moderate effort', 'Capacity'],
      [8, 'Small bid bond', 'Bank guarantee facility'],
      [2, 'Not a priority', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-03T11:18', loggedAt: '2026-03-03T11:30', disposition: 'low-fit' },
    dg1: dg1Of('T-2026-112'),
  },
  {
    id: 'T-2026-109', title: 'Tabuk water transmission pipeline, Phase 1', shortTitle: 'Tabuk water transmission, Ph. 1', issuer: NCWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Tabuk', sector: 'Utility networks', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'open',
    value: { amount: 260_000_000, ccy: 'SAR', basis: 'estimate', band: [230_000_000, 290_000_000] },
    documentFee: SAR(4_000),
    stage: 'S2', stageNote: 'Stage 2: RFQs out', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2026-03-03', page: 1 },
      { kind: 'questions', date: '2026-03-15', page: 4 },
      { kind: 'submission', date: '2026-05-13', time: '10:00', page: 4 },
      { kind: 'opening', date: '2026-05-13', time: '10:30', page: 4 },
      { kind: 'validity-end', date: '2026-08-11', page: 11 },
    ],
    requirements: T109_REQUIREMENTS,
    fit: fit([
      [9, 'Large-diameter water transmission: a core networks capability', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [8, 'Meets the PQ lines; Zakat and GOSI expire before opening', 'Eligibility check against the credential vault'],
      [6, 'Tabuk: no office, but a site camp from a past job', 'Company profile: offices'],
      [8, 'NCWS: good payment record', 'Client history'],
      [7, 'Standard terms; price adjustment on steel', 'Extraction'],
      [6, 'Water team can absorb it', 'Capacity: Water tendering team'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Transmission is a growth line', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-03-03T10:50', purchasedAt: '2026-03-03T11:14', loggedAt: '2026-03-03T11:25', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-109'),
  },
  {
    id: 'T-2026-104', title: 'Jubail industrial wastewater treatment upgrade', shortTitle: 'Jubail industrial WWTP upgrade', issuer: 'Gulf Coast Industrial Utilities Company', issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Jubail', sector: 'Water and wastewater', sourceId: 'industrial-portal', sourceDetail: 'Industrial utilities vendor portal', procurement: 'open',
    value: { amount: 175_000_000, ccy: 'SAR', basis: 'estimate', band: [155_000_000, 195_000_000] },
    stage: 'S2', stageNote: 'Stage 2: packages being covered', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'published', date: '2026-02-25', page: 1 },
      { kind: 'submission', date: '2026-04-19', time: '10:00', page: 5 },
      { kind: 'opening', date: '2026-04-19', time: '11:00', page: 5 },
    ],
    fit: fit([
      [9, 'Industrial wastewater treatment upgrade: in the lead sector', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [9, 'Meets the PQ lines', 'Eligibility check against the credential vault'],
      [9, 'Jubail: near the Dammam office', 'Company profile: offices'],
      [7, 'Semi-government client; payments on time', 'Client history'],
      [6, 'Performance guarantees on effluent quality', 'Extraction'],
      [6, 'Water team can absorb it', 'Capacity: Water tendering team'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [6, 'Industrial clients diversify the order book', 'Strategy: sector priorities'],
    ]),
    validations: [
      { id: 'VAL-104-1', tenderId: 'T-2026-104', field: 'Sludge dewatering capacity', value: '120 m3/h', page: 31, alt: { value: '150 m3/h', page: 58 },
        confidence: 0.58, reason: 'Re-read for packaging: scope and equipment schedule disagree', blocksDg1: false, raisedAt: '2026-03-08T08:31' },
    ],
    intake: { capturedAt: '2026-02-25T11:05', loggedAt: '2026-02-25T11:17', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-104'),
  },
  {
    id: 'T-2026-101', title: 'Abha STP upgrade', shortTitle: 'Abha STP upgrade', issuer: SCWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Abha', sector: 'Water and wastewater', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'two-file',
    value: { amount: 140_000_000, ccy: 'SAR', basis: 'estimate', band: [125_000_000, 155_000_000] },
    stage: 'S3', stageNote: 'Stage 3: pack in preparation; inputs outstanding', bidManagerId: 'najd.bid', invited: INVITED_PACK,
    keyDates: [
      { kind: 'published', date: '2026-02-11', page: 1 },
      { kind: 'submission', date: '2026-04-16', time: '10:00', page: 4 },
      { kind: 'opening', date: '2026-04-16', time: '10:30', page: 4 },
    ],
    fit: fit([
      [10, 'STP upgrade: core business', 'Capability profile'],
      [8, 'Just below the value band', 'Platform estimate; Fit model & rules'],
      [9, 'Meets the PQ lines', 'Eligibility check against the credential vault'],
      [6, 'Abha: no office in the south-west', 'Company profile: offices'],
      [7, 'SCWS: payments sometimes late', 'Client history'],
      [6, 'Standard government terms', 'Extraction'],
      [6, 'Water team committed', 'Capacity: Water tendering team'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Builds the STP track record', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-02-11T13:30', loggedAt: '2026-02-11T13:42', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-101'),
  },
  {
    id: 'T-2026-097', title: 'Madinah WTP expansion', shortTitle: 'Madinah WTP expansion', issuer: WCWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Madinah', sector: 'Water and wastewater', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'two-file',
    value: { amount: 355_000_000, ccy: 'SAR', basis: 'estimate', band: [320_000_000, 390_000_000] },
    stage: 'DG2', stageNote: 'At DG2: pack issued; Addendum 2 received this morning', bidManagerId: 'najd.bid', invited: INVITED_PACK,
    packIssuedAt: '2026-03-07T14:10',
    keyDates: [
      { kind: 'published', date: '2026-01-11', page: 1 },
      { kind: 'submission', date: '2026-04-26', time: '10:00', page: 4, note: 'Unchanged by Addendum 2' },
      { kind: 'opening', date: '2026-04-26', time: '10:30', page: 4 },
    ],
    fit: fit([
      [9, 'Water treatment plant expansion: in the lead sector', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [9, 'Meets the PQ lines', 'Eligibility check against the credential vault'],
      [7, 'Madinah: served from the Jeddah office', 'Company profile: offices'],
      [8, 'WCWS: good payment record', 'Client history'],
      [7, 'Standard government terms', 'Extraction'],
      [6, 'Water team committed', 'Capacity: Water tendering team'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [8, 'Western Region growth target', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-11T08:40', loggedAt: '2026-01-11T08:52', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-097'),
  },
  {
    id: 'T-2026-088', title: 'Dammam stormwater tunnels', shortTitle: 'Dammam stormwater tunnels', issuer: 'Eastern Province Municipal Projects Office', issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Dammam', sector: 'Utility networks', sourceId: 'municipal-listing', sourceDetail: 'Eastern Province municipal projects listing', procurement: 'two-file',
    value: { amount: 420_000_000, ccy: 'SAR', basis: 'estimate', band: [370_000_000, 470_000_000] },
    stage: 'later', stageNote: 'Stage 6: proposal drafting (full lifecycle; current stage only)', bidManagerId: 'najd.bid', invited: [],
    keyDates: [{ kind: 'published', date: '2026-01-06' }, { kind: 'submission', date: '2026-03-29', time: '10:00' }],
    fit: fit([
      [7, 'Tunnelled stormwater: networks work with a specialist tunnelling partner', 'Capability profile'],
      [9, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [9, 'Meets the PQ lines', 'Eligibility check against the credential vault'],
      [9, 'Dammam office', 'Company profile: offices'],
      [7, 'Municipal client; payments on time recently', 'Client history'],
      [6, 'Ground risk shared', 'Extraction'],
      [5, 'Networks team committed', 'Capacity: networks and roads team'],
      [7, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Stormwater is a growth line in the Eastern Province', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-06T16:15', loggedAt: '2026-01-06T16:28', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-088'),
  },
  {
    id: 'T-2026-079', title: 'Qassim water networks', shortTitle: 'Qassim water networks', issuer: CCWS, issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Buraydah', sector: 'Utility networks', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'open',
    value: { amount: 310_000_000, ccy: 'SAR', basis: 'estimate', band: [280_000_000, 340_000_000] },
    stage: 'later', stageNote: 'Submitted 19 Feb; awaiting award', bidManagerId: 'najd.bid', invited: [],
    keyDates: [
      { kind: 'submission', date: '2026-02-19', time: '10:00' },
      { kind: 'opening', date: '2026-02-19', time: '10:30' },
      { kind: 'validity-end', date: '2026-05-20' },
    ],
    fit: fit([
      [9, 'Water networks: core networks capability', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [9, 'Met every PQ line', 'Eligibility check against the credential vault'],
      [8, 'Qassim: served from Riyadh; past projects in the region', 'Company profile: offices'],
      [8, 'CCWS: reliable payer', 'Client history'],
      [7, 'Standard terms', 'Extraction'],
      [6, 'Water team could absorb it', 'Capacity: Water tendering team'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [6, 'Keeps the Qassim presence', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2026-01-03T14:20', loggedAt: '2026-01-03T14:33', disposition: 'shortlisted' },
    dg1: dg1Of('T-2026-079'),
  },
  {
    id: 'T-2025-412', title: 'Khafji coastal road rehabilitation', shortTitle: 'Khafji coastal road rehab', issuer: 'Eastern Province Roads Programme Office', issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Khafji', sector: 'Roads', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'open',
    value: { amount: 310_000_000, ccy: 'SAR', basis: 'estimate' },
    stage: 'closed', stageNote: 'Submitted 7 Dec; the employer cancelled the tender after opening, to re-tender it', bidManagerId: 'najd.bid', invited: [],
    keyDates: [{ kind: 'submission', date: '2025-12-07', time: '10:00' }, { kind: 'validity-end', date: '2026-03-07' }],
    fit: fit([
      [7, 'Road rehabilitation: the roads line', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [8, 'Roads Grade 2 met the requirement', 'Eligibility check'],
      [7, 'Eastern Province', 'Company profile: offices'],
      [6, 'Roads programme payments sometimes slow', 'Client history'],
      [6, 'Standard terms', 'Extraction'],
      [6, 'Networks and roads team could absorb it', 'Capacity'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [5, 'Roads keep the plant busy', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2025-10-12T14:10', loggedAt: '2025-10-12T14:24', disposition: 'shortlisted' },
    dg1: dg1Of('T-2025-412'),
  },
  {
    // Not WCWS: Najd's bids to WCWS are plan 009a's client history (2 awards from 3 bids since 2022).
    id: 'T-2025-438', title: 'Yanbu STP rehabilitation', shortTitle: 'Yanbu STP rehabilitation', issuer: 'Western Region Municipal Projects Office', issuerIsReal: false,
    country: 'Saudi Arabia', city: 'Yanbu', sector: 'Water and wastewater', sourceId: 'etimad', sourceDetail: 'Etimad', procurement: 'two-file',
    value: { amount: 470_000_000, ccy: 'SAR', basis: 'estimate' },
    stage: 'closed', stageNote: 'Submitted 8 Dec; the employer cancelled the tender when its budget was withdrawn', bidManagerId: 'najd.bid', invited: [],
    keyDates: [{ kind: 'submission', date: '2025-12-08', time: '10:00' }, { kind: 'validity-end', date: '2026-03-08' }],
    fit: fit([
      [10, 'STP rehabilitation: core business', 'Capability profile'],
      [8, 'Inside the value band', 'Platform estimate; Fit model & rules'],
      [9, 'Met every PQ line', 'Eligibility check'],
      [7, 'Yanbu: served from the Jeddah office', 'Company profile: offices'],
      [8, 'Municipal client; payments on time', 'Client history'],
      [6, 'Works in a live plant', 'Extraction'],
      [6, 'Water team could absorb it', 'Capacity: Water tendering team'],
      [8, 'Bid bond inside headroom', 'Bank guarantee facility'],
      [7, 'Western Region growth target', 'Strategy: sector priorities'],
    ]),
    validations: [],
    intake: { capturedAt: '2025-10-21T15:45', loggedAt: '2025-10-21T15:57', disposition: 'shortlisted' },
    dg1: dg1Of('T-2025-438'),
  },
];

// ---------------------------------------------------------------------------
// Company, projects, partners, teams and facility (§2.2).

const PROJECTS: TenantData['projects'] = [
  { id: 'najd-p1', title: 'Riyadh East STP expansion', client: CCWS, country: 'SA', capacityM3d: 150_000, tertiary: true, value: SAR(620_000_000),
    completed: '2019-06-30', role: 'prime', scope: 'Design and build, tertiary treatment; then operated the plant for five years', om: { from: '2019-07-01', to: '2024-06-30' } },
  { id: 'najd-p2', title: 'Buraydah STP', client: CCWS, country: 'SA', capacityM3d: 120_000, tertiary: false, value: SAR(540_000_000),
    completed: '2022-03-31', role: 'prime', scope: 'Design and build, secondary treatment' },
  { id: 'najd-p3', title: 'Hail STP', client: NCWS, country: 'SA', capacityM3d: 60_000, tertiary: false, value: SAR(310_000_000),
    completed: '2021-09-30', role: 'prime', scope: 'Civil, mechanical and electrical works' },
  { id: 'najd-p4', title: 'Dammam sewer network rehabilitation, 64 km', client: ECWS, country: 'SA', value: SAR(280_000_000),
    completed: '2020-11-30', role: 'prime', scope: 'Trenchless and open-cut rehabilitation of 64 km of sewers' },
  { id: 'najd-p5', title: 'Riyadh North trunk sewer, 22 km', client: CCWS, country: 'SA', value: SAR(190_000_000),
    completed: '2018-05-31', role: 'prime', scope: 'DN1600–DN2000 trunk sewer, 22 km' },
  { id: 'najd-p6', title: 'Qassim water transmission pipeline, 48 km DN1200', client: CCWS, country: 'SA', value: SAR(410_000_000),
    completed: '2023-10-31', role: 'prime', scope: 'Steel transmission main with two pump stations' },
  { id: 'najd-p7', title: 'Hail water transmission line, 36 km DN1000', client: NCWS, country: 'SA', value: SAR(290_000_000),
    completed: '2019-12-31', role: 'prime', scope: 'Ductile iron transmission main and reservoir' },
  { id: 'najd-p8', title: 'Eastern ring road dualling, 28 km', client: 'Eastern Province Roads Programme Office', country: 'SA', value: SAR(350_000_000),
    completed: '2021-12-31', role: 'prime', scope: 'Dualling, interchanges and drainage' },
  { id: 'najd-p9', title: 'Khobar lift stations upgrade', client: ECWS, country: 'SA', value: SAR(120_000_000),
    completed: '2024-04-30', role: 'prime', scope: 'Mechanical and electrical upgrade of 11 lift stations' },
];

const RAFID: TenantData['partners'][number] = {
  id: 'rafid',
  name: 'Rafid Process Engineering',
  country: 'SA',
  note: 'Process design partner for treatment plants. Design subconsultant, not a JV member.',
  credentials: [
    { id: 'rafid-cr', kind: 'cr', label: 'Commercial Registration: engineering consultancy', number: '1010xxxxxx', country: 'SA', issuer: 'Ministry of Commerce', validTo: '2027-02-28', ownerId: 'partner.rafid' },
    { id: 'rafid-sce', kind: 'engineers-council', label: 'Saudi Council of Engineers registration', country: 'SA', issuer: 'Saudi Council of Engineers', validTo: '2026-12-31', ownerId: 'partner.rafid' },
  ],
  projects: [
    { id: 'rafid-p1', title: 'Riyadh East STP expansion: process design', client: 'Najd Arcline Contracting Co.', country: 'SA', capacityM3d: 150_000, tertiary: true,
      value: SAR(18_000_000), completed: '2019-06-30', role: 'subcontractor', scope: 'Process design and commissioning support' },
  ],
  financials: [
    { fy: 2024, turnover: SAR(85_000_000), audited: true },
  ],
};

const TEAMS: Team[] = [
  {
    id: 'najd-water', name: 'Water tendering team', sector: 'Water and wastewater', engineers: 6, estimators: 2, planners: 1, hoursPerWeek: 40,
    // 80 + 75 + 64 + 55 + 7 = 281 h a week, each for the whole of the next 4 weeks.
    commitments: [
      { tenderId: 'T-2026-109', hoursPerWeek: 80, from: '2026-03-04', to: '2026-05-13', note: 'Sourcing and pricing' },
      { tenderId: 'T-2026-104', hoursPerWeek: 75, from: '2026-02-26', to: '2026-04-19', note: 'Sourcing and levelling' },
      { tenderId: 'T-2026-101', hoursPerWeek: 64, from: '2026-02-12', to: '2026-04-16', note: 'Stage 3 pack, then pricing' },
      { tenderId: 'T-2026-097', hoursPerWeek: 55, from: '2026-01-11', to: '2026-04-26', note: 'Committee, then proposal' },
      { tenderId: 'T-2026-079', hoursPerWeek: 7, from: '2026-02-19', to: '2026-04-30', note: 'Post-submission clarifications' },
    ],
  },
  {
    id: 'najd-networks', name: 'Networks and roads tendering team', sector: 'Utility networks and roads', engineers: 4, estimators: 1, planners: 1, hoursPerWeek: 40,
    commitments: [
      { tenderId: 'T-2026-088', hoursPerWeek: 120, from: '2026-01-07', to: '2026-03-29', note: 'Proposal drafting' },
    ],
  },
];

export const NAJD: TenantSeed = {
  key: 'najd',
  company: {
    hq: 'Riyadh; offices in Dammam and Jeddah',
    employees: 4_800,
    fyEnd: '12-31',
    financials: [
      { fy: 2022, turnover: SAR(1_320_000_000), audited: true },
      { fy: 2023, turnover: SAR(1_390_000_000), audited: true },
      { fy: 2024, turnover: SAR(1_520_000_000), audited: true, netWorth: SAR(610_000_000), currentRatio: 1.34 },
      { fy: 2025, turnover: SAR(1_660_000_000), audited: false, auditDate: '2026-04-15' },
    ],
  },
  fit: {
    weights: { scope: 20, size: 10, eligibility: 20, geography: 10, client: 10, terms: 10, team: 8, facility: 7, strategy: 5 },
    pursueAt: 70,
    conditionsFrom: 50,
    band: { min: SAR(150_000_000), max: SAR(800_000_000) },
    singleLimit: SAR(900_000_000),
    dg2Referral: SAR(50_000_000),
    safeDeliveryPct: 70,
  },
  credentials: CREDENTIALS,
  projects: PROJECTS,
  partners: [RAFID, TIHAMA],
  teams: TEAMS,
  facility: {
    // The limit carries T-2025-298's issued bid bond, so headroom stays SAR 96.0 M (plan 020 B11).
    limit: SAR(602_300_000),
    utilised: SAR(410_000_000),
    committed: [
      { label: 'Bid bond: Qassim water networks (submitted 19 Feb)', tenderId: 'T-2026-079', kind: 'bid bond', amount: SAR(8_400_000) },
      { label: 'Bid bond: Dammam water network (submitted 15 Feb)', tenderId: 'T-2025-284', kind: 'bid bond', amount: SAR(6_200_000) },
      { label: 'Bid bond: Riyadh sewage network extension (submitted 3 Mar)', tenderId: 'T-2025-291', kind: 'bid bond', amount: SAR(9_400_000) },
      { label: 'Bid bond: Makkah water distribution network (issued; submission 12 Mar)', tenderId: 'T-2025-298', kind: 'bid bond', amount: SAR(2_300_000) },
      { label: 'Performance bond reserved: Al-Kharj water transmission main (awarded 3 Feb, awaiting signature)', kind: 'performance', amount: SAR(70_000_000) },
    ],
    asOf: '2026-03-05',
    confirmedById: 'najd.fin',
  },
  sources: SOURCES,
  reconciliation: { at: '2026-03-08T06:00', sources: 9, missed: 0 },
  intakeToday: INTAKE_TODAY,
  register: REGISTER,
  historySeed: { outcomes: outcomes('SAR', OUTCOMES), dg1: DG1, dg2: dg2Records(DG2_HISTORY) },
};
