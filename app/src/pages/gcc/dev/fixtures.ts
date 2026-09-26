import type {
  ActionVM, DashboardVM, FlowZoneVM, GraphPointVM, GraphVM, Health, TenderRowVM, TileVM, TrackerNodeVM, TrackerVM,
} from '@/domain/gcc/viewmodels';
import { GCC_STAGES, stageLabel, stageShortLabel, stepLabel } from '@/data/gcc/stages';
import { personById } from '@/data/people';
import { convert, money } from '@/domain/money';
import { windowOf, type PeriodWindow } from '@/domain/gcc/period';

/**
 * KIT PREVIEW FIXTURES (development only). Hand-written view models that
 * exercise every dashboard component at `/dev/kit`. They use Najd's names
 * (gcc-demo-data §5.1, dashboards.md §12) but are NOT the demo's data: real
 * dashboards read the registries and the data port. Nothing outside
 * `pages/gcc/dev/` may import this file.
 */

const T = 'najd';
const M = 1e6;
const sar = (m: number) => ({ amount: m * M, ccy: 'SAR' as const });
const who = (id: string) => personById(`${T}.${id}`);

/* ------------------------------------------------------------------ table rows */

type RowSeed = [id: string, title: string, issuer: string, city: string, stage: number, step: string, owner: string | null,
  valueM: number | null, due: string | null, health: Health, team: 'water' | 'networks', fit: number | null, win?: number];

const SEEDS: RowSeed[] = [
  ['T-2026-118', 'Al-Rawdah STP Phase 2', 'Eastern Cities Water Services Co.', 'Dammam', 1, 'awaiting-dg1', 'bid', 480, '2026-05-10T10:00', 'at-risk', 'water', 78],
  ['T-2026-117', 'Riyadh North sewer network rehabilitation', 'Riyadh municipal water authority', 'Riyadh', 1, 'awaiting-dg1', 'bid', 96, '2026-04-26T10:00', 'at-risk', 'networks', 74],
  ['T-2026-119', 'Jazan seawater intake and outfall', 'Southern Region water utility', 'Jazan', 1, 'screened', 'coord', 310, '2026-05-03T12:00', 'on-track', 'water', 41],
  ['T-2026-122', 'Dammam lift stations rehabilitation', 'Eastern Province municipality', 'Dammam', 1, 'captured', 'coord', 18, '2026-04-12T10:00', 'on-track', 'networks', null],
  ['T-2026-120', 'Wadi Zarqa WWTP Phase I DBO, PQ', 'Water authority (Jordan)', 'Zarqa', 1, 'validating', 'coord', null, '2026-04-02T14:00', 'blocked', 'water', 36],
  ['T-2026-109', 'Tabuk water transmission pipeline, Phase 1', 'Northern Region water utility', 'Tabuk', 2, 'rfqs-out', 'proc', 260, '2026-05-10T10:00', 'on-track', 'water', 81],
  ['T-2026-104', 'Jubail industrial wastewater treatment upgrade', 'Industrial city utilities', 'Jubail', 2, 'levelling', 'proc', 175, '2026-04-19T10:00', 'overdue', 'water', 72],
  ['T-2026-101', 'Abha STP upgrade', 'Asir Region water utility', 'Abha', 3, 'pack-in-preparation', 'bid', 140, '2026-04-30T10:00', 'at-risk', 'water', 70],
  ['T-2026-097', 'Madinah WTP expansion', 'Madinah water utility', 'Madinah', 3, 'positions-in', 'hot', 355, '2026-04-22T10:00', 'at-risk', 'water', 76, 0.58],
  ['T-2025-341', 'Jeddah industrial wastewater network', 'Jeddah industrial city', 'Jeddah', 4, 'baseline-drafting', 'plan', 120, '2026-04-15T10:00', 'on-track', 'networks', null, 0.46],
  ['T-2025-336', 'Riyadh stormwater pumping stations', 'Riyadh municipality', 'Riyadh', 4, 'resource-loading', 'plan', 88, '2026-04-08T10:00', 'at-risk', 'networks', null, 0.41],
  ['T-2025-322', 'Al-Ahsa water treatment plant', 'Eastern Province water utility', 'Hofuf', 5, 'finance-check', 'comm', 210, '2026-03-29T10:00', 'on-track', 'water', null, 0.52],
  ['T-2025-329', 'Buraydah sewer lift stations', 'Qassim municipality', 'Buraydah', 5, 'scenarios', 'comm', 64, '2026-04-05T10:00', 'at-risk', 'networks', null, 0.39],
  ['T-2026-088', 'Dammam stormwater tunnels', 'Eastern Province municipality', 'Dammam', 6, 'review', 'prop', 420, '2026-03-24T10:00', 'on-track', 'networks', null, 0.44],
  ['T-2025-317', 'Taif water reservoirs', 'Makkah Region water utility', 'Taif', 6, 'drafting', 'prop', 96, '2026-03-26T10:00', 'at-risk', 'water', null, 0.37],
  ['T-2025-305', 'Yanbu STP expansion', 'Yanbu industrial city', 'Yanbu', 7, 'dg3-issued', 'hot', 150, '2026-03-12T10:00', 'on-track', 'water', null, 0.55],
  ['T-2025-298', 'Makkah water distribution', 'Makkah Region water utility', 'Makkah', 8, 'signatures', 'bid', 230, '2026-03-12T10:00', 'at-risk', 'water', null, 0.49],
  ['T-2025-291', 'Riyadh sewage network extension', 'Riyadh municipal water authority', 'Riyadh', 8, 'awaiting-result', 'bid', 290, '2026-03-03T10:00', 'on-track', 'networks', null, 0.43],
  ['T-2025-284', 'Dammam water network', 'Eastern Province water utility', 'Dammam', 8, 'awaiting-result', 'bid', 186, '2026-02-15T10:00', 'on-track', 'water', null, 0.47],
  ['T-2026-079', 'Qassim water networks', 'Qassim water utility', 'Buraydah', 8, 'awaiting-result', 'bid', 310, '2026-02-19T09:10', 'on-track', 'networks', null, 0.51],
  ['T-2025-262', 'Unaizah STP', 'Qassim water utility', 'Unaizah', 9, 'handover-or-debrief', 'dir', 142, '2026-01-18T10:00', 'on-track', 'water', null, 0.61],
  ['T-2025-270', 'Hail water transmission', 'Hail Region water utility', 'Hail', 9, 'handover-or-debrief', 'dir', 205, '2026-01-25T10:00', 'on-track', 'water', null, 0.48],
  // Closed in the last 30 days, and two older results, so every health state appears.
  ['T-2025-255', 'Najran dam rehabilitation', 'Najran Region water utility', 'Najran', 9, 'lessons-captured', 'dir', 118, '2026-01-11T10:00', 'lost', 'water', null, 0.44],
  ['T-2026-106', 'Al-Kharj treated effluent line', 'Riyadh Region water utility', 'Al-Kharj', 2, 'packaging', 'proc', 72, '2026-04-01T10:00', 'withdrawn', 'networks', 69],
  ['T-2026-099', 'Hafr Al-Batin water network', 'Eastern Province water utility', 'Hafr Al-Batin', 3, 'awaiting-approval', 'hot', 134, '2026-04-06T10:00', 'no-bid', 'networks', 67, 0.33],
  ['T-2026-107', 'Jazan sewer house connections', 'Southern Region water utility', 'Jazan', 1, 'awaiting-dg1', 'bid', 22, '2026-03-30T10:00', 'discarded', 'networks', 44],
  ['T-2026-115', 'Jeddah desalination intake', 'Western Region water utility', 'Jeddah', 1, 'awaiting-dg1', 'bid', 540, '2026-04-20T10:00', 'discarded', 'water', 28],
  ['T-2026-112', 'Hofuf water network extension', 'Eastern Province municipality', 'Hofuf', 1, 'awaiting-dg1', 'bid', 11, '2026-03-22T10:00', 'discarded', 'networks', 52],
  ['T-2025-246', 'Khamis Mushait pumping main', 'Asir Region water utility', 'Khamis Mushait', 7, 'dg3-issued', 'hot', 97, '2026-02-26T10:00', 'rejected', 'water', null, 0.31],
  ['T-2025-233', 'Al-Qatif sewer lines', 'Eastern Province municipality', 'Al-Qatif', 9, 'lessons-captured', 'dir', 83, '2025-12-14T10:00', 'won', 'networks', null, 0.57],
];

const TEAM = { water: 'Water tendering team', networks: 'Networks and roads tendering team' };
const CLOSED: Health[] = ['won', 'lost', 'discarded', 'no-bid', 'rejected', 'withdrawn'];

/** Step facts for two rows, so the tender summary shows both kinds (one masked). */
const FACTS: Record<string, TenderRowVM['facts']> = {
  'T-2026-104': { 's2.covered': '7 / 11', 's2.overdue': 4, 's2.escalated': 2, 's2.toLevel': 5 },
  'T-2025-322': { 's5.margin': null, 's5.margin.masked': true, 's5.sourced': '93%' },
};

/** Captured dates spread back from demo day, newest first (fixture only). */
const capturedOf = (i: number) => {
  const d = new Date(Date.UTC(2026, 2, 8) - i * 4 * 86_400_000).toISOString().slice(0, 10);
  return `${d}T${String(7 + (i % 3)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`;
};

export const FIXTURE_ROWS: TenderRowVM[] = SEEDS.map(([id, title, issuer, city, stage, step, owner, valueM, due, health, team, fit, win], i) => {
  const p = owner ? who(owner) : undefined;
  const live = !CLOSED.includes(health);
  const [date, time] = due ? due.split('T') : [];
  const gate = stage === 1 ? 'DG1' : stage <= 3 ? 'DG2' : stage <= 7 ? 'DG3' : null;
  const slaEnd = id === 'T-2026-117' ? '2026-03-08T16:10' : id === 'T-2026-118' ? '2026-03-09T07:44' : id === 'T-2026-097' ? '2026-03-08T14:10'
    : id === 'T-2025-305' ? '2026-03-09T16:00' : undefined;
  // One row carries a converted value, so the Money hover shows its original.
  const value = id === 'T-2026-120'
    ? { amount: convert(42 * M, 'USD', 'SAR'), ccy: 'SAR' as const, original: { amount: 42 * M, ccy: 'USD' as const } }
    : valueM === null ? null : sar(valueM);
  const ref = id === 'T-2026-118' ? 'ECWS/PRJ/2026/0147' : `ET-${id.slice(2).replace('-', '')}`;
  return {
    id, shortTitle: title, issuer, city, country: id === 'T-2026-120' ? 'Jordan' : 'Saudi Arabia',
    sector: team === 'water' ? 'Water and wastewater' : 'Utility networks',
    stage, step, ownerId: p?.id ?? null, ownerName: p?.name ?? null, ownerRole: p?.title ?? null, teamName: TEAM[team],
    value, valueBasis: id === 'T-2026-118' ? 'estimate' : id === 'T-2026-120' ? 'published' : valueM === null ? 'not-stated' : 'published',
    submission: date ? { date, time } : null,
    nextGate: live && gate ? { gate, slaEnd, label: slaEnd ? `${gate} open` : `${gate} after ${stageLabel(gate === 'DG1' ? 1 : gate === 'DG2' ? 3 : 7)}` } : null,
    health,
    source: {
      name: id === 'T-2026-120' ? 'bids@najd.example' : 'Etimad', ref,
      url: id === 'T-2026-120' ? undefined : `https://etimad.example/tenders/${ref.replace(/\//g, '-')}`,
      capturedAt: capturedOf(i),
      documentHref: id === 'T-2026-118' ? '/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf' : undefined,
    },
    capturedAt: capturedOf(i), lastActivityAt: live ? `2026-03-0${8 - (i % 5)}T0${(i % 9) + 1}:15` : `2026-02-2${i % 8}T11:00`,
    fit, win: win !== undefined && stage >= 3 ? { p: win, band: 8 } : null,
    live, closedAt: live ? undefined : `2026-03-0${(i % 5) + 1}`,
    bidManagerId: `${T}.bid`,
    facts: FACTS[id] ?? {},
  };
});

const ids = (pred: (r: TenderRowVM) => boolean) => FIXTURE_ROWS.filter(pred).map((r) => r.id);

/* ----------------------------------------------------------------------- tiles */

const W: PeriodWindow = windowOf('30d', T);
const period = `${W.label} · ${W.rangeText}`;
const now = `Now · change since ${W.startText}`;
const live28 = FIXTURE_ROWS.filter((r) => r.live && r.stage >= 2 && r.stage <= 8);

export const FIXTURE_TILES: TileVM[] = [
  {
    id: 'PF-1', label: 'Live pipeline',
    display: money(live28.reduce((s, r) => s + (r.value?.amount ?? 0), 0), 'SAR'),
    sub: `${live28.length} tenders · 4 in, 5 out since ${W.startText}`,
    info: { label: 'Live pipeline', period: now, means: 'Every tender we decided to pursue that is still open: being sourced, priced or written, or submitted and waiting for the result', counted: 'Tenders pursued at DG1 and not yet closed: Stages 2–8, including submitted bids awaiting a result.', target: undefined, source: 'Tender lifecycles' },
    drill: { kind: 'table', label: `From tile: Live pipeline · ${W.label}`, stages: [2, 3, 4, 5, 6, 7, 8], status: 'live' },
  },
  {
    id: 'PF-3', label: 'Win / loss', display: '1 won · 2 lost', sub: 'Win rate 33% (n = 3) · SAR 142.0 M won', smallSample: true,
    info: { label: 'Win / loss', period, smallSample: true, means: 'Of the results we received in this period, how many we won. With few results the rate swings, so the counts are shown first', counted: 'Results received in the window. Withdrawn and cancelled tenders are excluded.', target: 'Hit rate 25%, judged only when n ≥ 5', source: 'Results' },
    drill: { kind: 'table', label: `From tile: Win / loss · ${W.label}`, ids: ['T-2025-262', 'T-2025-255', 'T-2025-270'], status: 'all' },
  },
  {
    id: 'PF-4', label: 'Decisions on time', display: '95%', tone: 'orange', sub: '20 of 21 · 1 late: DG1 on T-2026-107 (3 h)',
    info: { label: 'Decisions on time', period, means: 'How often DG1, DG2 and DG3 were decided within their time limits (24 h, 24 h and 48 h by default). A late decision takes days out of bid preparation', counted: 'Gate decisions recorded within their SLA ÷ gate decisions in the window.', target: '100% green; 90% or more orange; otherwise red', source: 'Gate records' },
    drill: { kind: 'table', label: `From tile: Decisions on time · ${W.label}`, ids: ids((r) => ['T-2026-107', 'T-2026-109', 'T-2026-112', 'T-2026-115', 'T-2026-099'].includes(r.id)), order: ['T-2026-107'], status: 'all' },
  },
  {
    id: 'SCR-6', label: 'Credentials at risk', display: '2', tone: 'orange', ownerTag: 'Finance', sub: 'Zakat 30 Apr · before T-2026-118 opens 10 May',
    info: { label: 'Credentials at risk', period: now, means: 'Company certificates that expire before a live bid is opened. Saudi tenders require them to be valid on the opening date, so an expiry here can disqualify the bid.', counted: 'Credentials whose expiry falls before the opening date of any live bid.', target: '0', source: 'Credentials vault' },
    drill: { kind: 'route', to: '/company' },
  },
  {
    id: 'CAP-1', label: 'Bid-team load', display: '78%', tone: 'green', sub: 'Water team, next 4 weeks · 96% if T-2026-118 is pursued',
    info: { label: 'Bid-team load', period: now, means: 'Committed bid-team hours in the next four weeks against the hours available, for the busiest team', counted: 'Σ committed hours in the next 28 days ÷ available hours, per team; the busiest is shown.', target: 'Under 85%', source: 'Tendering teams' },
    drill: null,
  },
  {
    id: 'DEC-6', label: 'Facility headroom', display: 'Masked for your role', masked: { by: 'the Head of Tendering, the CEO and Finance / Treasury' },
    info: { label: 'Facility headroom', period: now, means: 'What is left of the bank guarantee facility after the bonds we hold and those live bids would need. In the GCC, bonds tie up the facility for months', counted: 'Facility limit − bonds issued − bonds committed to live bids.', target: 'Above the largest live bid bond', source: 'Finance, bank facility' },
    drill: null,
  },
];

/* ------------------------------------------------------------------------ flow */

const dr = (label: string, list: string[]) => ({ kind: 'table' as const, label: `From funnel: ${label} · ${W.label}`, ids: list, status: 'all' as const });

export const FIXTURE_FLOW: FlowZoneVM = {
  id: 'PF-5', label: 'Decision funnel',
  info: { label: 'Decision funnel', period, means: 'Decisions made in this period at each gate, whichever tenders they were on. It is not one group of tenders followed through, so the steps need not add up', counted: 'Notices captured; DG1, DG2 and DG3 decisions; bids submitted; results received, in the window.', source: 'Intake events and gate records' },
  steps: [
    { key: 'captured', label: 'Captured', parts: [{ key: 'n', count: 176, label: 'notices', drill: null }] },
    { key: 'dg1', label: 'DG1', parts: [
      { key: 'pursue', count: 4, label: 'pursued', drill: dr('DG1 pursued', ['T-2026-109', 'T-2026-104', 'T-2026-101', 'T-2026-106']) },
      { key: 'discard', count: 7, label: 'discarded', drill: dr('DG1 discarded', ['T-2026-112', 'T-2026-115', 'T-2026-107']) },
      { key: 'hold', count: 1, label: 'held', drill: dr('DG1 held', ['T-2026-119']) },
    ] },
    { key: 'dg2', label: 'DG2', parts: [
      { key: 'bid', count: 4, label: 'bid', drill: dr('DG2 bid', ['T-2025-341', 'T-2025-336', 'T-2025-329', 'T-2025-322']) },
      { key: 'nobid', count: 1, label: 'no-bid', drill: dr('DG2 no-bid', ['T-2026-099']) },
    ] },
    { key: 'dg3', label: 'DG3', parts: [
      { key: 'approved', count: 4, label: 'approved', drill: dr('DG3 approved', ['T-2025-298', 'T-2025-291', 'T-2026-079', 'T-2025-284']) },
      { key: 'rejected', count: 0, label: 'rejected', drill: null },
    ] },
    { key: 'submitted', label: 'Submitted', parts: [{ key: 'n', count: 3, label: 'bids', drill: dr('Submitted', ['T-2025-291', 'T-2026-079', 'T-2025-284']) }] },
    { key: 'results', label: 'Results', parts: [
      { key: 'won', count: 1, label: 'won', tone: 'green', drill: dr('Won', ['T-2025-262']) },
      { key: 'lost', count: 2, label: 'lost', drill: dr('Lost', ['T-2025-255', 'T-2025-270']) },
    ] },
  ],
};

/* --------------------------------------------------------------------- actions */

export const FIXTURE_ACTIONS: ActionVM[] = [
  { id: 'dg3:T-2025-305', source: 'kit', type: 'DG3 approval', typeTone: 'orange', tenderId: 'T-2025-305', shortTitle: 'Yanbu STP expansion', what: 'Ready for your approval: evidence complete', due: { kind: 'sla', start: '2026-03-07T16:00', end: '2026-03-09T16:00' }, primary: { kind: 'route', label: 'Open tender', to: '/tenders/T-2025-305' }, urgency: 10 },
  { id: 'dg2:T-2026-097', source: 'kit', type: 'DG2 approval', typeTone: 'orange', tenderId: 'T-2026-097', shortTitle: 'Madinah WTP expansion', what: '2 of 5 positions · quorum needs 3 · pack stale (Addendum 2, 09:12)', due: { kind: 'sla', start: '2026-03-07T14:10', end: '2026-03-08T14:10' }, primary: { kind: 'route', label: 'Open tender', to: '/tenders/T-2026-097' }, urgency: 20 },
  { id: 'booklet:T-2026-122', source: 'kit', type: 'Booklet purchase', tenderId: 'T-2026-122', shortTitle: 'Dammam lift stations rehabilitation', what: `${money(3000, 'SAR')} via Etimad · purchase closes Tue 10 Mar · requested by Aisha Al-Qahtani`, due: { kind: 'date', date: '2026-03-10' },
    primary: { kind: 'inplace', label: 'Approve purchase', doneLabel: 'Approved {time}', markKey: 'kit.booklet-approved:T-2026-122', audit: { action: 'Approved booklet purchase (kit preview fixture)', target: 'T-2026-122', detail: money(3000, 'SAR') }, toast: 'Purchase approved. Aisha Al-Qahtani can buy the booklet on Etimad. (Kit preview)' }, urgency: 30 },
  { id: 'renewal:zakat', source: 'kit', type: 'Renewal', what: 'Zakat certificate expires Thu 30 Apr, before T-2026-118 opens Sun 10 May · owner Sultan Al-Anazi', due: { kind: 'date', date: '2026-04-30' },
    primary: { kind: 'inplace', label: 'Request renewal', doneLabel: 'Requested {time}', markKey: 'kit.renewal-requested:zakat', audit: { action: 'Requested credential renewal (kit preview fixture)', detail: 'Zakat certificate' }, toast: 'Renewal requested from Sultan Al-Anazi. It is in their requests. (Kit preview)' }, urgency: 40 },
  { id: 'nudge:T-2026-101', source: 'kit', type: 'Late input', typeTone: 'red', tenderId: 'T-2026-101', shortTitle: 'Abha STP upgrade', what: 'Finance facility input, 1 day late', due: { kind: 'text', text: 'Late by 1 day', tone: 'red' }, waitingOn: { name: 'Sultan Al-Anazi', role: 'Finance / Treasury' },
    primary: { kind: 'inplace', label: 'Nudge', doneLabel: 'Reminded {time}', markKey: 'kit.nudged:T-2026-101', audit: { action: 'Sent a reminder (kit preview fixture)', target: 'T-2026-101', detail: 'Finance facility input' }, toast: 'Sultan Al-Anazi has been reminded. The reminder is in the audit log. (Kit preview)' }, urgency: 50 },
  { id: 'dg2approve:T-2026-097', source: 'kit', type: 'DG2 approval', tenderId: 'T-2026-097', shortTitle: 'Madinah WTP expansion', what: 'Approve Bid or record No-Bid', due: { kind: 'sla', start: '2026-03-07T14:10', end: '2026-03-08T14:10' },
    primary: { kind: 'inplace', label: 'Approve Bid', doneLabel: 'Approved {time}', markKey: 'kit.never', audit: { action: 'never' }, toast: '' }, disabledReason: 'Quorum not met: 2 of 5 positions recorded, 3 needed', urgency: 60 },
  { id: 'dg1:T-2026-117', source: 'kit', type: 'DG1 decision', tenderId: 'T-2026-117', shortTitle: 'Riyadh North sewer network rehabilitation', what: 'Pursue or discard', due: { kind: 'sla', start: '2026-03-07T16:10', end: '2026-03-08T16:10' }, waitingOn: { name: 'Omar Siddiqui', role: 'Bid Manager' }, primary: { kind: 'route', label: 'Open tender', to: '/tenders/T-2026-117' }, urgency: 70 },
];

/* ----------------------------------------------------------------------- graphs */

const stagePoints = (values: number[], compare: number[], fmt: (v: number) => string): GraphPointVM[] =>
  GCC_STAGES.map((s, i) => ({
    key: String(s.n), label: stageShortLabel(s.n), value: values[i], compare: compare[i], display: fmt(values[i]), compareDisplay: fmt(compare[i]),
    drill: { kind: 'table', label: `From graph: ${stageShortLabel(s.n)} · ${W.label}`, stages: [s.n] }, hint: 'Click to see these tenders',
  }));

const METRICS = [
  { id: 'kit.count', label: 'Tenders now' }, { id: 'kit.value', label: 'Value now' }, { id: 'kit.inPeriod', label: 'Tenders in the period' },
  { id: 'kit.atRisk', label: 'At risk or overdue now' }, { id: 'kit.avgDays', label: 'Average days in stage' },
];
const MARKERS = GCC_STAGES.filter((s) => s.gateAfter).map((s) => ({ after: String(s.n), label: s.gateAfter! }));

const countsNow = GCC_STAGES.map((s) => FIXTURE_ROWS.filter((r) => r.live && r.stage === s.n).length);
const valuesNow = GCC_STAGES.map((s) => FIXTURE_ROWS.filter((r) => r.live && r.stage === s.n).reduce((a, r) => a + (r.value?.amount ?? 0), 0));

export function fixtureStagesGraph(metric: string): GraphVM {
  const isValue = metric === 'kit.value';
  const values = isValue ? valuesNow : countsNow;
  const compare = isValue ? valuesNow.map((v, i) => v * (i % 2 ? 0.8 : 1.15)) : [4, 3, 2, 1, 2, 2, 1, 3, 3];
  const fmt = isValue ? (v: number) => money(v, 'SAR') : String;
  const points = stagePoints(values, compare, fmt);
  const label = METRICS.find((m) => m.id === (isValue ? 'kit.value' : 'kit.count'))!.label;
  return {
    metric: isValue ? 'kit.value' : 'kit.count', metricLabel: label, kind: 'state', axis: 'stages', points, markers: MARKERS, metrics: METRICS,
    compareLabel: `At the start of the window (${W.startText})`, empty: false,
    summary: `${label} by stage: ${points.map((p) => `${p.label} ${p.display}`).join(', ')}`,
  };
}

export const FIXTURE_STEPS_GRAPH: GraphVM = (() => {
  const s2 = GCC_STAGES[1];
  const v = [0, 0, 1, 0, 1, 0];
  const c = [1, 0, 0, 1, 0, 0];
  const points: GraphPointVM[] = s2.steps.map((st, i) => ({
    key: st.key, label: st.label, value: v[i], compare: c[i], display: String(v[i]), compareDisplay: String(c[i]),
    drill: { kind: 'table', label: `From graph: ${st.label}`, stages: [2], steps: [st.key] }, hint: 'Click to see these tenders',
  }));
  return {
    metric: 'kit.steps.count', metricLabel: 'Tenders now', kind: 'state', axis: 'steps', points, markers: [],
    metrics: [{ id: 'kit.steps.count', label: 'Tenders now' }], compareLabel: `At the start of the window (${W.startText})`, empty: false,
    summary: `Tenders now by step: ${points.map((p) => `${p.label} ${p.display}`).join(', ')}`,
  };
})();

/* --------------------------------------------------------------------- trackers */

const ORDER: { key: string; kind: 'stage' | 'gate'; stage?: number; gate?: 'DG1' | 'DG2' | 'DG3' }[] = [
  { key: 's1', kind: 'stage', stage: 1 }, { key: 'dg1', kind: 'gate', gate: 'DG1' }, { key: 's2', kind: 'stage', stage: 2 }, { key: 's3', kind: 'stage', stage: 3 },
  { key: 'dg2', kind: 'gate', gate: 'DG2' }, { key: 's4', kind: 'stage', stage: 4 }, { key: 's5', kind: 'stage', stage: 5 }, { key: 's6', kind: 'stage', stage: 6 },
  { key: 's7', kind: 'stage', stage: 7 }, { key: 'dg3', kind: 'gate', gate: 'DG3' }, { key: 's8', kind: 'stage', stage: 8 }, { key: 's9', kind: 'stage', stage: 9 },
];

function nodes(filled: Record<string, Partial<TrackerNodeVM>>): TrackerNodeVM[] {
  return ORDER.map((o) => ({
    key: o.key, kind: o.kind, stage: o.stage, gate: o.gate,
    label: o.kind === 'gate' ? o.gate! : stageShortLabel(o.stage!),
    status: 'not-reached', ...filled[o.key],
  }));
}

const BY = { omar: 'Omar Siddiqui', faisal: 'Faisal Al-Harbi' };

export const FIXTURE_TRACKERS: Record<string, TrackerVM> = {
  'T-2026-109': {
    tenderId: 'T-2026-109', title: 'Tabuk water transmission pipeline, Phase 1', value: sar(260), health: 'on-track',
    nodes: nodes({
      s1: { status: 'done', from: '2026-02-28', to: '2026-03-04', days: 5, ownerInitials: 'AQ' },
      dg1: { status: 'done', decision: { label: 'Pursue', tone: 'green', byName: BY.omar, at: '2026-03-04T11:20', onTime: true } },
      s2: { status: 'current', from: '2026-03-04', ownerInitials: 'JM', note: stepLabel(2, 'rfqs-out') },
    }),
    now: {
      stageLabel: stageLabel(2), stepLabel: stepLabel(2, 'rfqs-out'), withName: 'Joseph Mathew', withRole: 'Procurement Lead',
      team: 'Water team: Omar Siddiqui (Bid Manager), 4 engineers, 2 estimators',
      status: '9 of 9 RFQs sent Thu 5 Mar 10:05 · replies due Sun 15 Mar',
      next: 'Quotes in → levelling → Bid / No-Bid pack · Submission Sun 10 May (39 wd)', blocker: null,
    },
  },
  'T-2025-262': {
    tenderId: 'T-2025-262', title: 'Unaizah STP', value: sar(142), health: 'won',
    nodes: nodes({
      s1: { status: 'done', from: '2025-09-02', to: '2025-09-04', days: 2, ownerInitials: 'AQ' },
      dg1: { status: 'done', decision: { label: 'Pursue', tone: 'green', byName: BY.omar, at: '2025-09-04T09:40', onTime: true } },
      s2: { status: 'done', from: '2025-09-04', to: '2025-09-28', days: 24, ownerInitials: 'JM' },
      s3: { status: 'done', from: '2025-09-28', to: '2025-10-06', days: 8, ownerInitials: 'OS' },
      dg2: { status: 'done', decision: { label: 'Bid', tone: 'green', byName: BY.faisal, at: '2025-10-06T12:05', onTime: true } },
      s4: { status: 'done', from: '2025-10-06', to: '2025-10-30', days: 24, ownerInitials: 'AP' },
      s5: { status: 'done', from: '2025-10-20', to: '2025-11-24', days: 35, ownerInitials: 'TH' },
      s6: { status: 'done', from: '2025-10-20', to: '2025-12-18', days: 59, ownerInitials: 'RA' },
      s7: { status: 'done', from: '2025-12-01', to: '2026-01-08', days: 38, ownerInitials: 'LB' },
      dg3: { status: 'done', decision: { label: 'Approved', tone: 'green', byName: BY.faisal, at: '2026-01-09T15:30', onTime: true } },
      s8: { status: 'done', from: '2026-01-09', to: '2026-02-24', days: 46, ownerInitials: 'OS' },
      s9: { status: 'current', from: '2026-02-24', ownerInitials: 'MG', note: 'Handover or debrief' },
    }),
    now: {
      stageLabel: stageLabel(9), stepLabel: stepLabel(9, 'handover-or-debrief'), withName: 'Mohammed Al-Ghamdi', withRole: 'Project Director',
      team: 'Water team: Omar Siddiqui (Bid Manager)', status: 'Won Tue 24 Feb · 1st of 5', next: 'Handover kick-off Sun 15 Mar', blocker: null,
    },
    outcome: `Won · ${money(142 * M, 'SAR')} · handover Sun 15 Mar`,
  },
  'T-2026-112': {
    tenderId: 'T-2026-112', title: 'Hofuf water network extension', value: sar(11), health: 'discarded',
    nodes: nodes({
      s1: { status: 'done', from: '2026-02-27', to: '2026-03-03', days: 4, ownerInitials: 'AQ' },
      dg1: { status: 'stopped', decision: { label: 'Discard', tone: 'grey', byName: BY.omar, at: '2026-03-03T10:15', onTime: true }, note: 'Below the value band' },
    }),
    now: null,
    outcome: 'Discarded at DG1 · below the value band · 3 Mar · Omar Siddiqui',
  },
};

/** A plain tracker for any other fixture row. */
export function fixtureTracker(id: string): TrackerVM | null {
  if (FIXTURE_TRACKERS[id]) return FIXTURE_TRACKERS[id];
  const r = FIXTURE_ROWS.find((x) => x.id === id);
  if (!r) return null;
  const filled: Record<string, Partial<TrackerNodeVM>> = {};
  for (const o of ORDER) {
    const at = o.kind === 'stage' ? o.stage! : o.gate === 'DG1' ? 1.5 : o.gate === 'DG2' ? 3.5 : 7.5;
    if (at < r.stage) filled[o.key] = o.kind === 'gate' ? { status: 'done', decision: { label: o.gate === 'DG1' ? 'Pursue' : o.gate === 'DG2' ? 'Bid' : 'Approved', tone: 'green', byName: o.gate === 'DG1' ? BY.omar : BY.faisal, at: '2026-02-10T10:00', onTime: true } } : { status: 'done' };
    if (at === r.stage) filled[o.key] = { status: r.live ? 'current' : 'stopped', ownerInitials: r.ownerName ? r.ownerName.split(' ').map((w) => w[0]).join('').slice(0, 2) : undefined, note: stepLabel(r.stage, r.step) };
  }
  return {
    tenderId: r.id, title: r.shortTitle, value: r.value, health: r.health, nodes: nodes(filled),
    now: r.live ? { stageLabel: stageLabel(r.stage), stepLabel: stepLabel(r.stage, r.step), withName: r.ownerName, withRole: r.ownerRole, team: r.teamName, status: 'Fixture status line', next: 'Fixture next step', blocker: r.health === 'blocked' ? 'Eligibility fail: geography outside the tender’s scope' : null } : null,
    outcome: r.live ? undefined : `Closed: ${r.health} (fixture)`,
  };
}

/* ------------------------------------------------------------------ dashboard */

export function fixtureDashboard(metric: string): DashboardVM {
  return {
    key: 'kit', title: 'Dashboard', subtitle: '', isHome: true, crumbs: [],
    tiles: FIXTURE_TILES, flow: FIXTURE_FLOW,
    actions: { title: 'Needs your action', rows: FIXTURE_ACTIONS, nextText: 'Next: DG1 on T-2026-118, due Mon 9 Mar 07:44', missing: [] },
    table: {
      kind: 'tenders', rows: FIXTURE_ROWS,
      columns: ['tid', 'tender', 'stage', 'owner', 'team', 'value', 'due', 'nextGate', 'health', 'source'],
      optional: ['captured', 'country', 'sector', 'fit', 'win', 'lastActivity'],
      defaultSort: 'newest', filters: ['stage', 'status', 'sector', 'country', 'owner', 'health'], statusDefault: 'live',
    },
    graph: fixtureStagesGraph(metric),
    trackerFor: fixtureTracker,
    missing: [],
  };
}

/* --------------------------------------------------------- period windows (4.4) */

/** dashboards.md §2, as dates: [from, to] of the window and of the previous window. */
export const EXPECTED_WINDOWS: Record<string, { w: [string, string]; p: [string, string] }> = {
  today: { w: ['2026-03-08T00:00', '2026-03-08T10:00'], p: ['2026-03-07T00:00', '2026-03-07T10:00'] },
  '7d': { w: ['2026-03-02', '2026-03-08'], p: ['2026-02-23', '2026-03-01'] },
  '30d': { w: ['2026-02-07', '2026-03-08'], p: ['2026-01-08', '2026-02-06'] },
  '90d': { w: ['2025-12-09', '2026-03-08'], p: ['2025-09-10', '2025-12-08'] },
  '12m': { w: ['2025-03-09', '2026-03-08'], p: ['2024-03-09', '2025-03-08'] },
};

/* ------------------------------------------------------- kit part 2 (plan 019) */

/** Source chips of every kind, as a caller would pass them. */
export const FIXTURE_SOURCES: { label: string; kind: 'page' | 'addendum' | 'credential' | 'project' | 'calc' | 'quote' | 'input'; page?: number; detail?: string; terms?: string[] }[] = [
  { kind: 'page', label: 'p. 12', page: 12, terms: ['1%'] },
  { kind: 'addendum', label: 'add.2 p. 3', page: 3 },
  { kind: 'credential', label: 'Cred: GOSI', detail: 'GOSI certificate, valid to 14 Apr 2026' },
  { kind: 'project', label: 'Proj: Qatif STP', detail: 'Completed 2023, 120,000 m³/day, tertiary treatment' },
  { kind: 'quote', label: 'Q-0412', detail: 'Pumps package, received Thu 5 Mar' },
  { kind: 'input', label: 'Input: Finance', detail: 'Bond headroom, requested from Finance / Treasury' },
  { kind: 'calc', label: 'Calc: fit model', detail: 'Nine weighted criteria from Administration › Fit model & rules' },
];

export const FIXTURE_OVERRIDDEN = { name: 'Faisal Al-Harbi', at: 'Sun 8 Mar 10:42', choice: 'Pursue', reason: 'Strategic client: we would bid as a JV with a classified partner.' };

export const FIXTURE_AUDIT = [
  { key: 'a1', actor: { name: 'Omar Siddiqui', role: 'Bid Manager' }, at: '2026-03-08T10:42', action: 'DG1 decision recorded', chip: { label: 'Pursue', tone: 'green' as const }, detail: 'On time (within 24 h) · Recommendation: Pursue with conditions' },
  { key: 'a2', actor: { name: 'Aisha Al-Qahtani', role: 'Tender Coordinator' }, at: '2026-03-08T10:31', action: 'Field corrected', before: '2%', after: '1%', detail: 'Initial guarantee rate: §41 on p. 12 prevails over §77' },
  { key: 'a3', actor: { name: 'Intake & Extraction agent', role: null }, at: '2026-03-08T07:44', action: 'Captured from Etimad', detail: 'Reference ECWS/PRJ/2026/0147', system: true },
];
