import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { TENANTS } from '@/data/tenants';
import { PEOPLE } from '@/data/people';
import { GCC_DATA, LIFECYCLES, isGccTenantKey, type Lifecycle } from '../../index';
import { FX_PER_USD, type Ccy } from '../../fx';
import type { SimilarProject } from '../../types';
import { rngOf, type Rng } from '../../lifecycle/rng';
import type { Supplier, Trade } from '../types';
import { GCC_CODES, emailLocal, personName, phoneOf } from './names';
import type {
  Capability, CertificateSeed, CompanyFacts, CompletedSeed, ContactSeed, DocumentSeed, EvaluationSeed, FinancialYear,
  JobSeed, QuarterKey, QuarterSeed, ScreeningCycle, SupplierProfileSeed,
} from './types';

/**
 * Supplier profiles by rule (plan 031), so 143 suppliers get one without
 * hand-typing. Deterministic: company facts and accounts come from
 * `rngOf('supplier:' + id)` (the same firm reads the same in every tenant),
 * the work with the tenant from `rngOf('supplier:' + id + ':' + tenant)`.
 *
 * By construction the profile agrees with the master (plan 031, "Data rules",
 * and the orchestrator's answer B1 of 2026-09-29):
 * - the jobs are the master's `awards12m`, each on a tender the tenant won in
 *   the last 12 months: at most the load band's top in progress (Low 1,
 *   Medium 3), at least its floor when the awards allow (Medium 2, High 4),
 *   the rest delivered within the 12 months. Load is the supplier's whole
 *   order book, across all its clients;
 * - the four quarters' quotes and NCRs add up to `quotes12m` and `ncrs12m`;
 *   on-time deliveries over deliveries round to `onTimePct`. The reply rate
 *   and days are the master's own `response` (B4: no RFQ counts are made up);
 * - a blocked supplier has no job that started after the check that blocked it;
 * - "completed with us" rows are the tenant's own project register.
 */

const TODAY = DEMO_TODAY;
/** The first day of the 12-month window (the `12m` period ends on demo day). */
export const WINDOW_FROM = addDays(TODAY, -364);

export const QUARTERS: { key: QuarterKey; from: string; to: string }[] = [
  { key: 'Q2 2025', from: '2025-04-01', to: '2025-06-30' },
  { key: 'Q3 2025', from: '2025-07-01', to: '2025-09-30' },
  { key: 'Q4 2025', from: '2025-10-01', to: '2025-12-31' },
  { key: 'Q1 2026', from: '2026-01-01', to: TODAY },
];

/* ------------------------------------------------------------------ helpers */

const round = (n: number, dp = 0) => Math.round(n * 10 ** dp) / 10 ** dp;
/** Three significant figures: 1,234,567 → 1,230,000. */
export const nice = (n: number) => {
  if (n <= 0) return 0;
  const p = 10 ** (Math.floor(Math.log10(n)) - 2);
  return Math.round(n / p) * p;
};
const clampDate = (d: string, lo: string, hi: string) => (d < lo ? lo : d > hi ? hi : d);
const minDate = (a: string, b: string) => (a < b ? a : b);
const maxDate = (a: string, b: string) => (a > b ? a : b);
const weeks = (from: string, n: number) => addDays(from, Math.round(n * 7));
const dateIn = (r: Rng, from: string, to: string) => {
  const span = Math.max(0, Math.round((Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / 86400000));
  return addDays(from, r.int(0, span));
};

/** Units dealt one at a time by weight, so a split always adds up. */
function split(total: number, weights: number[], r: Rng, room?: number[]): number[] {
  const out = weights.map(() => 0);
  for (let i = 0; i < total; i++) {
    const w = weights.map((x, k) => (room && out[k] >= room[k] ? 0 : x));
    const sum = w.reduce((s, x) => s + x, 0);
    let pick = w.length - 1;
    if (sum > 0) {
      let v = r.next() * sum;
      for (let k = 0; k < w.length; k++) { v -= w[k]; if (v < 0) { pick = k; break; } }
    } else if (room) {
      pick = room.findIndex((x, k) => out[k] < x);
      if (pick < 0) pick = w.length - 1;
    }
    out[pick]++;
  }
  return out;
}

/* ------------------------------------------------------------------ trades */

/** The package a trade is bought as, in the words the Stage 2 packages use. */
export const TRADE_PACKAGE: Record<Trade, string> = {
  piling: 'Piling, dewatering and shoring', 'process-mech': 'Process mechanical equipment', filtration: 'Tertiary filters and UV disinfection',
  sludge: 'Sludge thickening and dewatering', odour: 'Odour control units', hv: 'HV substation and transformers', lv: 'LV distribution and cabling',
  ica: 'Instrumentation, control and SCADA', valves: 'Valves and penstocks', pipes: 'Steel pipes and fittings', grp: 'GRP pipes',
  pumps: 'Pumps', surge: 'Surge vessels', 'chem-dosing': 'Chemical dosing systems', steel: 'Steel structures and covers',
  cathodic: 'Cathodic protection', trenchless: 'Trenchless crossings', testing: 'Testing and disinfection', chillers: 'Chillers',
  'cooling-towers': 'Cooling towers', hvac: 'Air handling units and HVAC', plumbing: 'Plumbing and drainage', fire: 'Fire fighting and fire alarm',
  bms: 'BMS and ELV systems', insulation: 'Thermal insulation', cipp: 'CIPP relining', manholes: 'Manhole rehabilitation',
  bypass: 'Bypass pumping', cctv: 'CCTV sewer survey', asphalt: 'Asphalt and bitumen supply', precast: 'Precast culverts and drainage',
  bearings: 'Bridge bearings and expansion joints', barriers: 'Safety barriers', lighting: 'Street lighting', signage: 'Road signage and markings',
  earthworks: 'Earthworks and aggregates', tbm: 'Tunnel boring machine', segments: 'Precast tunnel segments', grouting: 'Grouting and ground treatment',
  ventilation: 'Tunnel ventilation', shafts: 'Shafts and launch pits', 'medical-gas': 'Medical gas pipeline systems',
};

/** Work done on site by the supplier's own crews; everything else is supplied. */
const SUBCONTRACT = new Set<Trade>(['piling', 'trenchless', 'testing', 'plumbing', 'fire', 'insulation', 'cipp', 'manholes', 'bypass', 'cctv', 'earthworks', 'grouting', 'shafts', 'bms', 'cathodic']);
export const kindOf = (t: Trade): 'supply' | 'subcontract' => (SUBCONTRACT.has(t) ? 'subcontract' : 'supply');

/** Supply: lead time in weeks. Subcontract: weeks to mobilise. */
const WEEKS: Record<Trade, [number, number]> = {
  piling: [3, 6], 'process-mech': [24, 34], filtration: [20, 30], sludge: [22, 30], odour: [16, 24], hv: [36, 52], lv: [14, 22], ica: [16, 26],
  valves: [12, 20], pipes: [10, 16], grp: [8, 14], pumps: [18, 28], surge: [16, 24], 'chem-dosing': [12, 18], steel: [8, 14], cathodic: [3, 6],
  trenchless: [4, 8], testing: [1, 3], chillers: [26, 36], 'cooling-towers': [18, 26], hvac: [16, 24], plumbing: [3, 6], fire: [4, 8], bms: [4, 8],
  insulation: [2, 4], cipp: [3, 6], manholes: [2, 5], bypass: [1, 2], cctv: [1, 2], asphalt: [1, 2], precast: [6, 10], bearings: [16, 24],
  barriers: [6, 10], lighting: [12, 18], signage: [6, 10], earthworks: [2, 4], tbm: [52, 70], segments: [10, 16], grouting: [2, 4],
  ventilation: [26, 36], shafts: [4, 8], 'medical-gas': [14, 22],
};

/** A package's share of the contract value, in per cent. */
const SHARE: Record<Trade, [number, number]> = {
  'process-mech': [4, 9], filtration: [2, 5], sludge: [2, 4], odour: [0.8, 2], hv: [3, 7], lv: [2, 5], ica: [1.5, 4], valves: [1.5, 4], pipes: [4, 12],
  grp: [6, 15], pumps: [1.5, 4], surge: [0.5, 1.5], 'chem-dosing': [0.5, 1.5], steel: [1, 3], cathodic: [0.4, 1.2], trenchless: [1, 4], testing: [0.2, 0.8],
  piling: [2, 6], chillers: [6, 12], 'cooling-towers': [2, 5], hvac: [5, 12], plumbing: [3, 7], fire: [2, 5], bms: [1.5, 4], insulation: [0.8, 2],
  cipp: [8, 20], manholes: [3, 8], bypass: [1, 3], cctv: [0.8, 2.5], asphalt: [8, 18], precast: [4, 10], bearings: [0.5, 1.5], barriers: [2, 5],
  lighting: [2, 5], signage: [1, 3], earthworks: [6, 14], tbm: [5, 12], segments: [6, 14], grouting: [1, 4], ventilation: [1.5, 4], shafts: [2, 6],
  'medical-gas': [1.5, 4],
};

/**
 * Which trades a contract can buy, read from its sector and title. A trade
 * with its own pattern (bearings, medical gas …) goes only where it matches.
 */
const GROUPS: { re: RegExp; trades: Trade[] }[] = [
  {
    re: /water|wastewater|stp|sewer|sewage|pump|treatment|reservoir|network|utilit|drainage|outfall|lift station|transmission|corridor|diversion|tank/,
    trades: ['process-mech', 'filtration', 'sludge', 'odour', 'chem-dosing', 'pumps', 'surge', 'valves', 'pipes', 'grp', 'ica', 'hv', 'lv', 'steel', 'cathodic',
      'trenchless', 'testing', 'piling', 'cipp', 'manholes', 'bypass', 'cctv', 'precast', 'earthworks', 'shafts', 'grouting'],
  },
  {
    re: /road|bridge|earthwork|expressway|embankment|crossing|flood|access|highway/,
    trades: ['asphalt', 'precast', 'bearings', 'barriers', 'lighting', 'signage', 'earthworks', 'piling', 'lv', 'hv', 'steel', 'pipes', 'grp', 'trenchless', 'cathodic', 'testing', 'pumps'],
  },
  {
    re: /mep|cooling|hospital|building|tower|office|lab|airport/,
    trades: ['chillers', 'cooling-towers', 'hvac', 'plumbing', 'fire', 'bms', 'insulation', 'medical-gas', 'lv', 'hv', 'ica', 'pumps', 'pipes', 'valves', 'chem-dosing', 'process-mech', 'filtration', 'testing'],
  },
  {
    re: /oil|gas|produced water|injection/,
    trades: ['process-mech', 'filtration', 'sludge', 'chem-dosing', 'pumps', 'valves', 'pipes', 'ica', 'hv', 'lv', 'cathodic', 'steel', 'testing', 'surge'],
  },
  {
    re: /tunnel|storm|outfall|trunk|drainage|sewer|main/,
    trades: ['tbm', 'segments', 'grouting', 'shafts', 'ventilation', 'trenchless', 'piling', 'pipes', 'grp', 'pumps', 'precast', 'cathodic', 'hv', 'lv', 'ica', 'valves', 'surge', 'earthworks', 'hvac'],
  },
];
const ONLY: Partial<Record<Trade, RegExp>> = {
  'medical-gas': /hospital|lab|clinic|health/,
  bearings: /bridge|crossing/,
  tbm: /tunnel|storm|outfall|trunk|drainage|sewer/,
  segments: /tunnel|storm|outfall|trunk|drainage|sewer/,
  ventilation: /tunnel|storm|outfall|trunk|drainage|sewer/,
};

export function tradeFits(trade: Trade, text: string): boolean {
  const t = text.toLowerCase();
  const only = ONLY[trade];
  if (only && !only.test(t)) return false;
  return GROUPS.some((g) => g.re.test(t) && g.trades.includes(trade));
}

/* ------------------------------------------------------------------ company */

type Scale = 'contractor' | 'maker' | 'oem' | 'foreign-small';
const LARGE = new Set(['DE', 'JP', 'KR', 'CN', 'FR', 'IT', 'GB', 'SE', 'AT', 'CH', 'NL', 'ES']);
const EURO = new Set(['DE', 'AT', 'IT', 'FR', 'ES', 'PT', 'IE', 'NL', 'BE', 'SI', 'HR', 'FI', 'GR', 'LU', 'SK', 'EE', 'LV', 'LT', 'MT', 'CY']);
const GCC_CCY: Record<string, Ccy> = { SA: 'SAR', AE: 'AED', QA: 'QAR', OM: 'OMR', KW: 'KWD', BH: 'BHD' };

export function currencyOf(country: string): { ccy: Ccy; reportedInUsd: boolean } {
  if (GCC_CCY[country]) return { ccy: GCC_CCY[country], reportedInUsd: false };
  if (EURO.has(country)) return { ccy: 'EUR', reportedInUsd: false };
  return { ccy: 'USD', reportedInUsd: true };
}

const scaleOf = (s: Supplier): Scale => {
  if (GCC_CODES.has(s.country)) return SUBCONTRACT.has(s.trades[0]) ? 'contractor' : 'maker';
  return LARGE.has(s.country) ? 'oem' : 'foreign-small';
};

/** Staff, revenue per head (USD M) and founding years, by scale. */
const SCALE: Record<Scale, { staff: [number, number]; perHead: [number, number]; est: [number, number] }> = {
  contractor: { staff: [60, 600], perHead: [0.07, 0.11], est: [1984, 2014] },
  maker: { staff: [150, 1400], perHead: [0.12, 0.2], est: [1976, 2010] },
  oem: { staff: [180, 1800], perHead: [0.18, 0.3], est: [1952, 2005] },
  'foreign-small': { staff: [80, 500], perHead: [0.08, 0.16], est: [1972, 2008] },
};

const LEGAL = /(GmbH|S\.A\.|\bSA|\bAB|B\.V\.|Srl|S\.r\.l\.|S\.p\.A\.|SAL|Ltd|FZE|FZCO|LLC|W\.L\.L\.|Co\.|A\.Ş\.|d\.o\.o\.|SAS|S\.L\.|Company)$/;
const LEGAL_SUFFIX: Record<string, string> = {
  SA: 'Co. Ltd', AE: 'LLC', QA: 'W.L.L.', OM: 'LLC', KW: 'Co. W.L.L.', BH: 'W.L.L.', GB: 'Ltd', IE: 'Ltd', KR: 'Co., Ltd.', JP: 'Co., Ltd.',
  CN: 'Co., Ltd.', DE: 'GmbH', AT: 'GmbH', CH: 'AG', IT: 'S.r.l.', FR: 'SAS', ES: 'S.L.', PT: 'Lda', NL: 'B.V.', SE: 'AB', PL: 'Sp. z o.o.',
  SI: 'd.o.o.', HR: 'd.o.o.', TR: 'A.Ş.', LB: 'SAL', TN: 'SARL',
};

/** Registration label and number pattern per country (`#` a digit, `@` a capital letter). */
const REGISTRATION: Record<string, [string, string]> = {
  SA: ['Commercial registration', '20########'], AE: ['Trade licence', 'CN-#######'], QA: ['Commercial registration', '1#####'],
  OM: ['Commercial registration', '1######'], KW: ['Commercial registration', '3#####'], BH: ['Commercial registration', '1####-#'],
  DE: ['Handelsregister', 'HRB #####'], AT: ['Firmenbuch', 'FN ######@'], CH: ['UID', 'CHE-###.###.###'], IT: ['REA number', '@@-######'],
  GB: ['Company number', '0#######'], IE: ['Company number', '######'], SE: ['Organisation number', '556###-####'], NL: ['KvK number', '########'],
  ES: ['CIF', 'B########'], PT: ['NIPC', '5########'], FR: ['SIREN', '### ### ###'], KR: ['Business registration', '###-##-#####'],
  JP: ['Corporate number', '#############'], CN: ['Unified social credit code', '91##############@@'], PL: ['KRS', '0000######'],
  SI: ['Registration number', '#######'], HR: ['Registration number', '########'], TR: ['Trade registry', '######'],
  LB: ['Commercial register', '#######'], TN: ['Registre du commerce', 'B#######'],
};
const fill = (r: Rng, pattern: string) =>
  pattern.replace(/#/g, () => String(r.int(0, 9))).replace(/@/g, () => String.fromCharCode(65 + r.int(0, 25)));

const DEMONYM: Record<string, string> = { SA: 'Saudi', AE: 'Emirati', QA: 'Qatari', OM: 'Omani', KW: 'Kuwaiti', BH: 'Bahraini' };
export const demonymOf = (country: string) => DEMONYM[country] ?? null;

/** How a GCC contractor is graded, by the trade it is graded in. */
const FIELD: Partial<Record<Trade, string>> = {
  piling: 'foundations', trenchless: 'pipelines', testing: 'water and sewage', plumbing: 'mechanical', fire: 'mechanical', insulation: 'mechanical',
  cipp: 'water and sewage', manholes: 'water and sewage', bypass: 'water and sewage', cctv: 'water and sewage', earthworks: 'roads', grouting: 'foundations',
  shafts: 'foundations', bms: 'electrical', cathodic: 'pipelines',
};

/* ------------------------------------------------------------------ overrides */

export interface ProfileOverride {
  /** The tenant it applies in; absent = every tenant (the same firm). */
  tenant?: string;
  summary?: string;
  risk?: string;
  company?: Partial<CompanyFacts>;
  scale?: Scale;
  health?: 'strong' | 'adequate' | 'watch';
  /** Jobs in progress, within the band's rule. */
  jobsNow?: number;
  /** Tender ids the jobs go on, in order (now jobs first, then delivered). */
  jobTenders?: string[];
  /** A line on each job, in the same order. */
  jobNotes?: string[];
  /** Register projects to include in "Completed with us". */
  completed?: string[];
  /** No certificate expired or due for renewal: a featured supplier the scripts show without a compliance story. */
  cleanCertificates?: boolean;
}

/* ------------------------------------------------------------------ the generator */

const HEALTH_BAND = {
  strong: { cr: [1.55, 2.4], nm: [5.2, 11] },
  adequate: { cr: [1.15, 1.45], nm: [0.8, 6.5] },
  watch: { cr: [0.88, 1.06], nm: [-2.5, 2.5] },
} as const;

const ISO_BODIES = ['Veritrust Certification', 'Northstar Assurance Registrar', 'Qualitas Cert', 'Meridian Management Systems'];
const INSURERS = ['Harbourline Assurance', 'Northgate Indemnity', 'Arcadia Mutual Insurance', 'Qasr Takaful', 'Saltmarsh General Insurance'];

/** A valid-to date: mostly well ahead, some within 60 days, a few passed. */
/** A yearly certificate's issue date: the latest anniversary of its expiry on or before the demo day, never after it. */
function issuedBefore(validTo: string): string {
  let d = addDays(validTo, -365);
  while (d > TODAY) d = addDays(d, -365);
  return d;
}

function validToOf(r: Rng): string {
  const state = r.weighted([['valid', 84], ['soon', 12], ['expired', 4]] as const);
  if (state === 'soon') return addDays(TODAY, r.int(6, 58));
  if (state === 'expired') return addDays(TODAY, -r.int(5, 80));
  return addDays(TODAY, r.int(75, 820));
}

/** The smallest delivery count, from `from` up, whose on-time share can round to `pct`. */
export function deliveryCounts(from: number, pct: number): { deliveries: number; onTime: number } {
  for (let n = Math.max(1, from); n < from + 60; n++) {
    const k = Math.round((pct * n) / 100);
    for (const x of [k, k - 1, k + 1]) if (x >= 0 && x <= n && Math.round((100 * x) / n) === pct) return { deliveries: n, onTime: x };
  }
  return { deliveries: 100, onTime: pct };
}

/** Won lifecycles of the last 12 months, oldest first, open to every `supplier.view` holder (no restricted lane). */
export function wonInWindow(tenant: string): Lifecycle[] {
  if (!isGccTenantKey(tenant)) return [];
  return LIFECYCLES[tenant]
    .filter((l) => l.result?.result === 'won' && !l.restricted && l.result.at.slice(0, 10) >= WINDOW_FROM && l.result.at.slice(0, 10) <= TODAY)
    .sort((a, b) => a.result!.at.localeCompare(b.result!.at));
}

/** The check that blocks a supplier, and when. */
export function blockOf(s: Supplier): { kind: 'sanctions' | 'antiBribery'; at: string } | null {
  if (s.screening.sanctions.state === 'match') return { kind: 'sanctions', at: s.screening.sanctions.checkedAt };
  if (s.screening.antiBribery.state === 'flag') return { kind: 'antiBribery', at: s.screening.antiBribery.checkedAt };
  return null;
}

export const BAND: Record<Supplier['load'], { floor: number; top: number }> = {
  low: { floor: 0, top: 1 }, medium: { floor: 2, top: 3 }, high: { floor: 4, top: Infinity },
};

export function generateProfile(s: Supplier, tenant: string, o: ProfileOverride = {}): SupplierProfileSeed {
  const rc = rngOf(`supplier:${s.id}`);
  const rt = rngOf(`supplier:${s.id}:${tenant}`);
  const scale = o.scale ?? scaleOf(s);
  const sc = SCALE[scale];
  const { ccy, reportedInUsd } = currencyOf(s.country);
  const fx = FX_PER_USD[ccy];
  const gcc = GCC_CODES.has(s.country);

  // --- Company facts (the firm, whatever the tenant)
  const staff = o.company?.staff ?? Math.round(rc.int(sc.staff[0], sc.staff[1]) / 10) * 10;
  const perHead = rc.range(sc.perHead[0], sc.perHead[1]);
  const established = o.company?.established ?? rc.int(sc.est[0], sc.est[1]);
  const [regLabel, regPattern] = REGISTRATION[s.country] ?? ['Registration number', '########'];
  const registration = { label: regLabel, no: fill(rc, regPattern) };
  const ownership = gcc
    ? rc.weighted([['Private, family owned', 45], ['Private', 25], ['Subsidiary of a listed group', 15], ['Listed company', 10], ['Joint venture with a foreign manufacturer', 5]] as const)
    : rc.weighted([['Private, family owned', 35], ['Subsidiary of a listed group', 30], ['Listed company', 15], ['Private equity owned', 20]] as const);
  const localSharePct = gcc ? (ownership === 'Joint venture with a foreign manufacturer' ? rc.pick([51, 60, 70]) : rc.chance(0.7) ? 100 : rc.pick([51, 60, 75, 80])) : null;
  const grade = rc.int(1, 4);
  const classification = SUBCONTRACT.has(s.trades[0]) && gcc
    ? `Contractor classification Grade ${grade}, ${FIELD[s.trades[0]] ?? 'general works'}`
    : SUBCONTRACT.has(s.trades[0]) ? 'Specialist contractor' : s.national ? 'Manufacturer, on the national product list' : 'Manufacturer';

  // --- Accounts (oldest first), shaped by delivery record: weaker delivery, weaker finances.
  const { onTimePct, ncrs12m } = s.performance;
  const pWatch = Math.min(0.45, Math.max(0.03, 0.05 + (88 - onTimePct) * 0.04 + ncrs12m * 0.04));
  const pStrong = Math.min(0.7, Math.max(0.1, 0.35 + (onTimePct - 86) * 0.04 - ncrs12m * 0.05));
  const health = o.health ?? rc.weighted([['watch', pWatch], ['strong', pStrong], ['adequate', Math.max(0.1, 1 - pWatch - pStrong)]] as const);
  const band = HEALTH_BAND[health];
  const revenue25 = nice(staff * perHead * 1e6 * fx);
  const gm = { contractor: [12, 22], maker: [14, 24], oem: [22, 34], 'foreign-small': [15, 26] }[scale];
  const growth = [rc.range(0.9, 1.12), rc.range(0.9, 1.14)];
  const crLatest = round(rc.range(band.cr[0], band.cr[1]), 2);
  const nmLatest = round(rc.range(band.nm[0], band.nm[1]), 1);
  const auditedLatest = rc.chance(0.45);
  const worthRatio = rc.range(0.24, 0.52);
  const accounts: FinancialYear[] = [2023, 2024, 2025].map((fy, i) => {
    const revenue = i === 2 ? revenue25 : nice(revenue25 / (i === 1 ? growth[1] : growth[1] * growth[0]));
    const netMarginPct = i === 2 ? nmLatest : round(nmLatest + rc.range(-1.4, 1.4), 1);
    const currentRatio = i === 2 ? crLatest : round(Math.max(0.8, crLatest + rc.range(-0.14, 0.14)), 2);
    const gross = round(rc.range(gm[0], gm[1]), 1);
    return {
      fy, revenue, grossMarginPct: Math.max(gross, round(netMarginPct + 6, 1)), netMarginPct, currentRatio,
      // Net worth moves with the business: the same ratio to revenue each year, give or take a few per cent.
      netWorth: nice(revenue * worthRatio * rc.range(0.95, 1.05)),
      debtToEquity: round(health === 'watch' ? rc.range(1.2, 2.2) : rc.range(0.2, 1.3), 2),
      audited: i < 2 || auditedLatest,
      ...(i === 2 && !auditedLatest ? { auditDue: '2026-04-30' } : {}),
    };
  });
  const orderMult = { low: [0.5, 0.9], medium: [0.9, 1.4], high: [1.4, 2.2] }[s.load];
  const interim = {
    label: 'Jan–Feb 2026', to: '2026-02-28',
    revenueToDate: nice(revenue25 * (59 / 365) * rc.range(0.85, 1.18)),
    orderBook: nice(revenue25 * rc.range(orderMult[0], orderMult[1])),
    bgCapacity: nice(revenue25 * rc.range(0.08, 0.25)),
  };
  const latest = accounts[2];
  const ratingGrade = health === 'watch' ? 'C' : health === 'strong' ? (latest.debtToEquity < 0.8 ? 'A' : 'B+') : latest.netMarginPct >= 4 ? 'B+' : 'B';
  const rating = { grade: ratingGrade as SupplierProfileSeed['rating']['grade'], at: addDays(TODAY, -rc.int(20, 150)) };
  const insurance = {
    cover: 'Public and product liability', limit: nice(Math.max(revenue25 * rc.range(0.02, 0.08), 2e6 * fx)),
    insurer: rc.pick(INSURERS), validTo: validToOf(rc),
  };

  // Certificates held by the firm.
  const certificates: CertificateSeed[] = [];
  if (gcc) certificates.push({ kind: 'licence', name: 'Trade licence', no: fill(rc, 'TL-######'), issuer: `${s.city} municipality`, validTo: validToOf(rc) });
  certificates.push({
    kind: 'cr', name: gcc ? 'Commercial registration' : 'Commercial register extract', no: registration.no,
    issuer: gcc ? 'Ministry of Commerce' : 'Company registry', validTo: validToOf(rc),
  });
  const body = rc.pick(ISO_BODIES);
  if (rc.chance(0.92)) certificates.push({ kind: 'iso9001', name: 'ISO 9001 quality management', no: fill(rc, 'QMS-######'), issuer: body, validTo: validToOf(rc) });
  if (rc.chance(0.72)) certificates.push({ kind: 'iso14001', name: 'ISO 14001 environmental management', no: fill(rc, 'EMS-######'), issuer: body, validTo: validToOf(rc) });
  if (rc.chance(0.62)) certificates.push({ kind: 'iso45001', name: 'ISO 45001 health and safety', no: fill(rc, 'OHS-######'), issuer: body, validTo: validToOf(rc) });

  // Contacts: four people, no name twice.
  const titles: Record<ContactSeed['role'], string> = {
    md: 'Managing director', tendering: gcc ? 'Tendering manager' : 'Export sales manager, Middle East', qa: 'QA/QC manager', hse: 'HSE lead',
  };
  // Never a name a demo person already has (the tenants' own staff, admins and portal users).
  const used = new Set<string>([...PEOPLE.map((p) => p.name), ...TENANTS.map((t) => t.admin)]);
  // One family name per firm at most, so two contacts never read as relatives.
  const families = new Set<string>();
  const firsts = new Set<string>();
  const family = (n: string) => n.split(' ').slice(1).join(' ');
  const firstOf = (n: string) => n.split(' ')[0];
  const contacts: ContactSeed[] = (['md', 'tendering', 'qa', 'hse'] as const).map((role) => {
    let name = personName(rc, s.country, role);
    for (let i = 0; (used.has(name) || families.has(family(name)) || firsts.has(firstOf(name))) && i < 30; i++) name = personName(rc, s.country, role);
    used.add(name);
    families.add(family(name));
    firsts.add(firstOf(name));
    return { role, title: titles[role], name, email: `${emailLocal(name)}@${s.id}.example`, phone: phoneOf(rc, s.country) };
  });

  const legalName = o.company?.legalName ?? (LEGAL.test(s.name) ? s.name : `${s.name} ${LEGAL_SUFFIX[s.country] ?? 'Ltd'}`);
  const isoHeld = certificates.filter((c) => c.kind.startsWith('iso'));
  const lastAudited = [...accounts].reverse().find((a) => a.audited)!;
  const documents: DocumentSeed[] = [
    { kind: 'profile', title: 'Company profile 2025', fileName: `${s.name} Company profile 2025.pdf`, issued: addDays('2025-01-15', rc.int(0, 200)), pages: rc.int(16, 44) },
    {
      kind: 'licence', title: gcc ? 'Trade licence and commercial registration' : 'Commercial register extract',
      fileName: `${s.name} ${gcc ? 'Trade licence' : 'Register extract'}.pdf`, issued: addDays(TODAY, -rc.int(40, 300)), pages: gcc ? 2 : 1,
    },
    ...(isoHeld.length ? [{
      kind: 'iso' as const, title: `ISO certificates (${isoHeld.map((c) => c.kind.slice(3)).join(', ')})`,
      fileName: `${s.name} ISO certificates.pdf`, issued: addDays(TODAY, -rc.int(60, 400)), pages: isoHeld.length,
    }] : []),
    {
      kind: 'accounts', title: `Audited accounts FY${lastAudited.fy}`, fileName: `${s.name} Audited accounts FY${lastAudited.fy}.pdf`,
      issued: lastAudited.fy === 2025 ? addDays('2026-02-01', rc.int(0, 25)) : addDays('2025-03-01', rc.int(0, 60)), pages: rc.int(24, 64),
    },
    { kind: 'insurance', title: 'Insurance certificate', fileName: `${s.name} Insurance certificate.pdf`, issued: issuedBefore(insurance.validTo), pages: 2 },
  ];

  // --- The work with this tenant
  const capabilities: Capability[] = s.trades.map((trade) => ({
    trade, kind: kindOf(trade), weeks: WEEKS[trade], largestOrder: nice(revenue25 * rt.range(0.06, 0.24)),
  }));
  const tenantCc: string = TENANTS.find((t) => t.key === tenant)?.countryCode ?? s.country;
  const others = (gcc ? ['SA', 'AE', 'QA', 'OM', 'KW', 'BH'] : ['SA', 'AE', 'QA', 'OM', 'KW', 'EG', 'DE', 'GB', 'JO', 'TR']).filter((c) => c !== s.country);
  const geographies = [...new Set([s.country, ...(s.avl.length || s.performance.awards12m ? [tenantCc] : []), ...others.filter(() => rt.chance(0.35))])].slice(0, 6);

  const jobs = jobsOf(s, tenant, rt, o);
  const completed = completedOf(s, tenant, rt, o, established);
  const quarters = quartersOf(s, rt);
  const evaluation = evaluationOf(s, rt);
  const screeningHistory = historyOf(s, rt);

  if (s.icv !== undefined) {
    certificates.push({
      kind: 'icv', name: tenantCc === 'SA' ? 'Local content certificate' : 'ICV certificate', no: fill(rt, 'ICV-2025-#####'),
      issuer: 'National ICV programme', validTo: validToOf(rt),
    });
  }
  certificates.push({ kind: 'insurance', name: `Insurance: ${insurance.cover.toLowerCase()}`, no: fill(rc, 'POL-########'), issuer: insurance.insurer, validTo: insurance.validTo });
  if (o.cleanCertificates) {
    // Moved past the renew-soon window by a whole number of years, so the dates stay plausible anniversaries.
    const ahead = addDays(TODAY, 61);
    for (const c of certificates) while (c.validTo < ahead) c.validTo = addDays(c.validTo, 365);
    while (insurance.validTo < ahead) insurance.validTo = addDays(insurance.validTo, 365);
    const cert = certificates.find((c) => c.kind === 'insurance');
    if (cert) cert.validTo = insurance.validTo;
    const doc = documents.find((d) => d.kind === 'insurance');
    if (doc) doc.issued = issuedBefore(insurance.validTo);
  }

  const primaryKind = kindOf(s.trades[0]);
  const paymentTerms = primaryKind === 'subcontract'
    ? rt.pick(['Monthly valuations, paid 45 days from certification; 10% retention', 'Monthly valuations, paid 60 days from certification; 5% retention'])
    : rt.pick(['10% advance against a guarantee, 80% on delivery, 10% on commissioning', '30 days from delivery and invoice', '20% advance, 70% against shipping documents, 10% on acceptance']);

  return {
    supplierId: s.id, tenant,
    company: {
      legalName, registration, established, city: s.city, staff, ownership, localSharePct, classification, geographies, ...o.company,
    },
    ...(o.summary ? { summary: o.summary } : {}),
    ...(o.risk ? { risk: o.risk } : {}),
    capabilities, ccy, reportedInUsd, accounts, interim, rating, paymentTerms, insurance,
    quarters, evaluation, certificates, screeningHistory, contacts, documents, jobs, completed,
  };
}

/* ------------------------------------------------------------------ jobs */

function jobsOf(s: Supplier, tenant: string, r: Rng, o: ProfileOverride): JobSeed[] {
  const aw = s.performance.awards12m;
  if (!aw) return [];
  const { floor, top } = BAND[s.load];
  const lo = Math.min(floor, aw);
  const hi = Math.min(top, aw);
  let now = o.jobsNow !== undefined ? Math.max(lo, Math.min(hi, o.jobsNow)) : lo === hi ? lo : s.load === 'low' ? (r.chance(0.7) ? hi : lo) : r.int(lo, hi);
  now = Math.max(lo, Math.min(hi, now));
  // The other `aw - now` awards were delivered within the 12 months.

  const block = blockOf(s);
  const latestStart = block ? addDays(block.at, -7) : TODAY;
  // Won at least four days before demo day, so an award can follow; before a block, a month ahead of it.
  const all = wonInWindow(tenant).filter((l) => l.result!.at.slice(0, 10) <= addDays(TODAY, -4));
  let wins = all.filter((l) => !block || l.result!.at.slice(0, 10) <= addDays(block.at, -30));
  if (!wins.length) wins = all;
  const fitting = (l: Lifecycle) => s.trades.filter((t) => tradeFits(t, `${l.sector} ${l.title}`));
  const pool = wins.filter((l) => fitting(l).length);
  const usable = pool.length ? pool : wins;
  if (!usable.length) return [];

  // Delivered jobs sit on the earliest wins (they had time to finish); jobs now on the rest, latest first.
  const early = usable.filter((l) => l.result!.at.slice(0, 10) <= addDays(TODAY, -70));
  const order: { l: Lifecycle; state: 'now' | 'delivered' }[] = [];
  const taken = new Map<string, number>();
  const take = (l: Lifecycle, state: 'now' | 'delivered') => { order.push({ l, state }); taken.set(l.tenderId, (taken.get(l.tenderId) ?? 0) + 1); };
  const byId = (id: string) => wins.find((l) => l.tenderId === id);
  const forced = (o.jobTenders ?? []).map(byId).filter((l): l is Lifecycle => !!l);
  for (let i = 0; i < aw; i++) {
    const state = i < now ? 'now' : 'delivered';
    if (forced[i]) { take(forced[i], state); continue; }
    const src = state === 'delivered' && early.length ? early : usable;
    // A tender not used yet; else one with a second trade to buy; else any.
    const fresh = src.filter((l) => !taken.has(l.tenderId));
    const second = src.filter((l) => (taken.get(l.tenderId) ?? 0) < fitting(l).length);
    const list = fresh.length ? fresh : second.length ? second : src;
    // Now: a random pick favouring later wins; delivered: the earliest free win.
    const pick = state === 'delivered' ? list[0] : list[Math.min(list.length - 1, Math.floor(Math.pow(r.next(), 0.6) * list.length))];
    take(pick, state);
  }

  const counts = new Map<string, number>();
  return order.map(({ l, state }, i) => {
    const n = counts.get(l.tenderId) ?? 0;
    counts.set(l.tenderId, n + 1);
    const trades = fitting(l);
    const trade = (trades.length ? trades : s.trades)[n % (trades.length || s.trades.length)];
    const kind = kindOf(trade);
    const won = l.result!.at.slice(0, 10);
    const w = WEEKS[trade];
    // Awarded two to six weeks after the win, or sooner when the win is recent.
    const since = Math.round((Date.parse(`${TODAY}T00:00Z`) - Date.parse(`${won}T00:00Z`)) / 86400000);
    const gapMax = Math.max(3, Math.min(state === 'delivered' ? 30 : 45, since - 2));
    let awardedAt = clampDate(addDays(won, r.int(Math.min(10, gapMax), gapMax)), maxDate(addDays(won, 3), QUARTERS[0].from), addDays(TODAY, -1));
    if (block) awardedAt = minDate(awardedAt, addDays(block.at, -20));
    awardedAt = maxDate(awardedAt, maxDate(won, QUARTERS[0].from));
    let startedAt = minDate(addDays(awardedAt, r.int(5, 20)), minDate(TODAY, latestStart));
    startedAt = maxDate(startedAt, awardedAt);
    const onTimeChance = s.performance.onTimePct / 100;
    let dueAt: string;
    let deliveredAt: string | undefined;
    let slipWeeks: number;
    if (state === 'now') {
      const dur = kind === 'supply' ? r.int(w[0], w[1]) + r.int(2, 10) : r.int(16, 48);
      dueAt = weeks(startedAt, dur);
      if (dueAt <= addDays(TODAY, 14)) dueAt = weeks(TODAY, r.int(4, 20));
      slipWeeks = r.weighted([[0, onTimeChance * 100], [r.int(1, 3), (100 - s.performance.onTimePct) * 0.7], [r.int(4, 8), (100 - s.performance.onTimePct) * 0.3]] as const);
    } else {
      slipWeeks = r.chance(onTimeChance) ? 0 : r.int(1, 4);
      let dur = kind === 'supply' ? r.int(Math.max(1, w[0] - 6), w[0]) : r.int(6, 20);
      const room = Math.floor((Date.parse(`${addDays(TODAY, -5)}T00:00Z`) - Date.parse(`${startedAt}T00:00Z`)) / (7 * 86400000));
      if (dur + slipWeeks > room) { dur = Math.max(1, room - slipWeeks); if (dur + slipWeeks > room) { slipWeeks = 0; dur = Math.max(1, room); } }
      dueAt = weeks(startedAt, dur);
      deliveredAt = minDate(weeks(dueAt, slipWeeks), addDays(TODAY, -1));
    }
    const share = SHARE[trade];
    return {
      id: `${s.id}:${l.tenderId}:${n + 1}`, tenderId: l.tenderId, trade,
      packageTitle: n > 0 && trades.length < 2 ? `${TRADE_PACKAGE[trade]}, second order` : TRADE_PACKAGE[trade],
      kind, awardedAt, startedAt, dueAt, state, ...(deliveredAt ? { deliveredAt } : {}), slipWeeks,
      value: nice((l.value.amount * r.range(share[0], share[1])) / 100), ccy: l.value.ccy,
      ...(o.jobNotes?.[i] ? { note: o.jobNotes[i] } : {}),
    };
  });
}

/* ------------------------------------------------------------------ completed with us */

function completedOf(s: Supplier, tenant: string, r: Rng, o: ProfileOverride, established: number): CompletedSeed[] {
  if (!isGccTenantKey(tenant) || s.prequal === 'none') return [];
  const projects: SimilarProject[] = GCC_DATA[tenant].projects;
  const fitsOf = (p: SimilarProject) => s.trades.filter((t) => tradeFits(t, `${p.title} ${p.scope}`));
  const forced = (o.completed ?? []).map((id) => projects.find((p) => p.id === id)).filter((p): p is SimilarProject => !!p);
  const pool = projects.filter((p) => fitsOf(p).length && Number(p.completed.slice(0, 4)) >= established + 3 && !forced.includes(p));
  const base = (s.performance.quotes12m >= 8 ? 2 : 1) + (s.avl.length ? 1 : 0);
  const n = Math.min(pool.length, r.int(0, base));
  const picked = [...forced];
  const rest = [...pool];
  for (let i = 0; i < n && rest.length; i++) picked.push(...rest.splice(r.int(0, rest.length - 1), 1));
  const ot = s.performance.onTimePct;
  return picked
    .sort((a, b) => b.completed.localeCompare(a.completed))
    .map((p) => {
      const trades = fitsOf(p);
      const trade = trades.length ? r.pick(trades) : s.trades[0];
      const rating = ot >= 90 ? r.weighted([[5, 5], [4, 4], [3, 1]] as const) : ot >= 84 ? r.weighted([[5, 2], [4, 5], [3, 3]] as const) : r.weighted([[4, 4], [3, 4.5], [2, 1.5]] as const);
      const share = SHARE[trade];
      return {
        projectId: p.id, trade, packageTitle: TRADE_PACKAGE[trade], kind: kindOf(trade),
        completed: addDays(p.completed, -r.int(30, 240)), rating, onTime: r.chance(ot / 100), ncrs: r.int(0, 2) + (rating <= 3 ? 1 : 0),
        value: nice((p.value.amount * r.range(share[0], share[1])) / 100), ccy: p.value.ccy,
      };
    });
}

/* ------------------------------------------------------------------ quarters */

function quartersOf(s: Supplier, r: Rng): QuarterSeed[] {
  const { quotes12m, ncrs12m, awards12m, onTimePct } = s.performance;
  const w = [1, 1, 1.05, 0.75];
  const q = split(quotes12m, w, r);
  const { deliveries, onTime } = deliveryCounts(awards12m ? awards12m * r.int(2, 5) + r.int(0, 4) : r.int(2, 5), onTimePct);
  const del = split(deliveries, [0.8, 1, 1.1, 0.7], r);
  const late = split(deliveries - onTime, del, r, del);
  const ncrs = split(ncrs12m, del.map((x) => (x ? 1 : 0)), r);
  return QUARTERS.map((x, i) => ({
    key: x.key, from: x.from, to: x.to,
    quotes: q[i],
    deliveries: del[i], onTime: del[i] - late[i], ncrs: ncrs[i],
  }));
}

/* ------------------------------------------------------------------ evaluation */

function evaluationOf(s: Supplier, r: Rng): EvaluationSeed {
  const ot = s.performance.onTimePct;
  const nc = s.performance.ncrs12m;
  const rr = s.response.ratePct;
  const byRole = r.weighted([['Procurement Lead', 5], ['Project Manager', 3], ['QA/QC Manager', 2]] as const);
  return {
    at: dateIn(r, '2025-12-01', '2026-03-01'),
    byRole,
    quality: nc === 0 ? 5 : nc === 1 ? r.pick([4, 4, 5]) : nc === 2 ? r.pick([3, 4]) : r.pick([2, 3]),
    schedule: ot >= 93 ? 5 : ot >= 88 ? 4 : ot >= 83 ? 3 : 2,
    hse: r.weighted([[5, 3], [4, 5], [3, 2]] as const),
    commercial: r.weighted([[5, 2], [4, 5], [3, 3]] as const),
    communication: rr >= 90 ? 5 : rr >= 84 ? 4 : rr >= 76 ? 3 : 2,
  };
}

/* ------------------------------------------------------------------ screening history */

function historyOf(s: Supplier, r: Rng): ScreeningCycle[] {
  const { sanctions, antiBribery } = s.screening;
  const same = sanctions.checkedAt === antiBribery.checkedAt;
  const cycles: ScreeningCycle[] = [{ sanctions: { state: sanctions.state, at: sanctions.checkedAt }, antiBribery: { state: antiBribery.state, at: antiBribery.checkedAt } }];
  let sa = sanctions.checkedAt;
  let ab = antiBribery.checkedAt;
  for (let i = 0; i < 2; i++) {
    const back = r.int(172, 186);
    sa = addDays(sa, -back);
    ab = same ? sa : addDays(ab, -r.int(172, 186));
    cycles.push({ sanctions: { state: 'clear', at: sa }, antiBribery: { state: 'clear', at: ab } });
  }
  return cycles;
}
