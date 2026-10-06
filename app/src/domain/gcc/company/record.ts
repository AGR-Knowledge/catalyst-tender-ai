import type { Tone } from '@/data/types';
import type { Person } from '@/data/people';
import { can, holdersOf } from '@/data/access';
import { isGccTenantKey } from '@/data/gcc';
import type { BidOutcome } from '@/data/gcc/types';
import type { GateRecord, Lifecycle, Result } from '@/data/gcc/lifecycle';
import { MIN_N } from '@/data/gcc/targets';
import { stageLabel } from '@/data/gcc/stages';
import { BID_RECORD_YEARS, type BidYearSeed } from '@/data/gcc/company/bidRecord';
import { LOSS_LABEL, LOSS_REASONS } from '@/data/gcc/debriefs/vocab';
import { rangeText } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import { DEMO_NOW } from '../clock';
import { currentOf, gateEventsIn, queriesFor, resultsIn, submissionsIn, tenderCtx, type DemoDone } from '../lifecycle';
import { previousOf, windowOf, type PeriodKey, type PeriodWindow } from '../period';
import { flow } from '../flows';
import type { KpiCtx } from '../kpi/types';
import { calibrationFor, type Calibration } from '../s3/win';
import { reasonLabel } from '../dg2/decision';
import type { MoneyVM } from '../viewmodels';
import { tenantCcy } from '../s1/common';
import { DEBRIEF_STATUSES, archiveFor, endingOf, labelOf, type ArchiveRow, type ArchiveVM, type DebriefStatus } from '../debriefs';

/**
 * Company profile › Bid record (plan 032): the company's record as a bidder.
 * The last 12 months are tender by tender, read only through `queriesFor`
 * with the dashboards' 12-month window, so every count here is the count the
 * dashboards show for the same viewer: bids submitted are `submissionsIn`,
 * results are `resultsIn` (Win / loss, PF-3, and Value won, OUT-3, read the
 * same), declines are the DG1 discards and DG2 no-bids among the gate events,
 * and the funnel's steps are the decision funnel's (PF-5). The four earlier
 * rolling years are the company's annual record (`BID_RECORD_YEARS`), with no
 * tender rows. Read models only; nothing here writes.
 *
 * Masking follows `can()` on each tender: the gap to the winner needs
 * `see.margin`; the predicted win % needs `see.margin` and, as the tender
 * table masks it, `see.positions`. A figure over several tenders is masked
 * unless the viewer may see it on every one of them.
 *
 * The debriefs (plan 037): "Why we lost" names each reason's top factor, and
 * each ended tender its debrief's status, both from the archive at 12 months
 * (`archiveFor`), so the two pages read the same accepted debriefs. They need
 * `debrief.view` on the tenders behind them.
 */

/** The period every tender-level section reads: the dashboards' "12 months". */
export const RECORD_PERIOD: PeriodKey = '12m';

export interface RecordFilters { sector?: string | null }

export type RecordStatus = 'won' | 'lost' | 'withdrawn' | 'cancelled' | 'awaiting' | 'discarded' | 'no-bid' | 'rejected' | 'live';

/** The status words, as the tender table and the tracker say them. Lost is grey: a result, not an alarm. */
export const RECORD_STATUS: Record<RecordStatus, { label: string; tone: Tone; icon: string }> = {
  won: { label: 'Won', tone: 'green', icon: '✓' },
  lost: { label: 'Lost', tone: 'grey', icon: '–' },
  withdrawn: { label: 'Withdrawn', tone: 'grey', icon: '–' },
  cancelled: { label: 'Cancelled', tone: 'grey', icon: '–' },
  awaiting: { label: 'Awaiting result', tone: 'cyan', icon: '…' },
  discarded: { label: 'Discarded at DG1', tone: 'grey', icon: '–' },
  'no-bid': { label: 'No-bid at DG2', tone: 'grey', icon: '–' },
  rejected: { label: 'Rejected at DG3', tone: 'grey', icon: '–' },
  live: { label: 'In progress', tone: 'ink', icon: '→' },
};

/**
 * Loss reasons in the words of Stage 9's "Why we lose" (OUT-6), from the debrief vocabulary, so every screen says
 * them alike; a loss with none recorded counts as Other, as there. `LOSS_LABEL` stays exported from here for
 * the files that import it from this module.
 */
const LOSS_ORDER: NonNullable<Result['lossReason']>[] = LOSS_REASONS.map((r) => r.id);
export { LOSS_LABEL };

/** Reason codes the history carries that the DG1 and DG2 pickers don't list. */
const HISTORY_REASON: Record<string, string> = {
  'pq-fail': 'PQ fail', 'contract-risk': 'Unacceptable contract risk', 'price-competition': 'Price competition',
};
export const declineReasonLabel = (code: string) => HISTORY_REASON[code] ?? reasonLabel(code);

const CLIENT_TYPE: Record<NonNullable<Lifecycle['clientType']> | 'none', string> = {
  government: 'Government', 'semi-government': 'Semi-government', private: 'Private', none: 'Not stated',
};
const CLIENT_ORDER = ['government', 'semi-government', 'private', 'none'];

/* ------------------------------------------------------------ view models */

export interface RecordTotalsVM {
  submitted: number;
  valueSubmitted: MoneyVM;
  /** Submitted in the window, no result yet. */
  awaiting: number;
  won: number;
  lost: number;
  /** Results withdrawn or cancelled: neither won nor lost. */
  withdrawn: number;
  /** Won ÷ (won + lost), rounded; null with no results. */
  winRatePct: number | null;
  /** Won + lost. Under `MIN_N` the rate reads with its n. */
  n: number;
  valueWon: MoneyVM;
  valueLost: MoneyVM;
  /** Value won ÷ (value won + value lost), rounded; null with no results. */
  valueRatePct: number | null;
  largestWin: { id: string; title: string; value: MoneyVM } | null;
  ids: { submitted: string[]; awaiting: string[]; won: string[]; lost: string[]; withdrawn: string[]; results: string[] };
}

export interface BreakdownRowVM {
  key: string;
  label: string;
  /** Bids submitted in the window. */
  bids: number;
  /** Results in the window, won and lost. */
  won: number;
  lost: number;
  winRatePct: number | null;
  n: number;
  /** Fewer than `MIN_N` results: the rate reads "n = …" and is not judged. */
  small: boolean;
  valueBid: MoneyVM;
  /** Bar width against the row with the most bids, 0–100. */
  pct: number;
  ids: { all: string[]; bids: string[]; won: string[]; lost: string[] };
}

export interface BreakdownVM {
  rows: BreakdownRowVM[];
  /** Rows left out (top clients: beyond the first eight). */
  more: number;
  /** A sentence under the rows, when one says more than the bars ("Every bid was in Saudi Arabia"). */
  note?: string;
}

export interface LossRowVM {
  key: string;
  label: string;
  count: number;
  /** Share of the losses, rounded. */
  sharePct: number;
  /** Bar width against the most common reason, 0–100. */
  pct: number;
  /** Our median place and the median field, over the losses that record it, each rounded to a whole place. */
  place: { median: number; of: number; n: number } | null;
  /** The median gap to the winner (%), over the losses that record it; masked without `see.margin` on every one of them. */
  gap: { medianPct: number; n: number } | null | 'masked';
  /** The factor cited most in this reason's accepted debriefs (the archive's); null with none yet; masked without `debrief.view` on every one of them. */
  topFactor: { label: string; count: number } | null | 'masked';
  ids: string[];
}

export interface LossesVM {
  total: number;
  rows: LossRowVM[];
  /** Losses that record our place, and the gap to the winner. */
  placeRecorded: number;
  gapRecorded: number | 'masked';
  /**
   * The debriefs behind the top factors: the accepted lost debriefs in the window the viewer may read, whether they
   * may open the archive, and whether they may read the debrief of every loss (a Bid Manager reads their own only).
   */
  debriefs: { accepted: number; canOpen: boolean; complete: boolean };
}

export interface DeclineRowVM { code: string; label: string; count: number; pct: number; ids: string[] }
export interface DeclineGateVM { total: number; ids: string[]; rows: DeclineRowVM[] }
export interface DeclinesVM { total: number; ids: string[]; dg1: DeclineGateVM; dg2: DeclineGateVM }

export interface FunnelStepVM {
  key: 'captured' | 'pursued' | 'submitted' | 'won';
  label: string;
  /** What the count is, in a few words. */
  sub: string;
  count: number;
  /** The tenders behind it; null for captured notices, which are counts without tenders. */
  ids: string[] | null;
  /** This step as a share of the step before, rounded; null for the first step or when the one before is zero. */
  pctOfPrev: number | null;
}

export interface FunnelVM {
  steps: FunnelStepVM[];
  /** A sector is chosen: the captured notices are not split by sector, so they stay the company's. */
  capturedAllSectors: boolean;
}

export interface ForecastVM {
  /** The viewer may not see the predicted win % on every outcome. */
  masked: boolean;
  calibration: Calibration | null;
  /** Bands judged (five results or more) and those within the tolerance. */
  judged: number;
  within: number;
}

export interface YearVM {
  key: string;
  /** "2021–22", or "Last 12 months". */
  label: string;
  /** "Tue 9 Mar 2021 – Tue 8 Mar 2022". */
  rangeText: string;
  /** The last day, `YYYY-MM-DD`. */
  to: string;
  /** The last 12 months, derived from the lifecycles; earlier years are the annual record. */
  derived: boolean;
  submitted: number;
  won: number;
  lost: number;
  withdrawn: number;
  /** Derived year only: submitted with no result yet. */
  awaiting: number;
  valueSubmitted: MoneyVM;
  valueWon: MoneyVM;
  winRatePct: number | null;
  bySector: { sector: string; submitted: number; won: number }[];
  /** Derived year only: the tenders behind each part of the bar. */
  ids: { won: string[]; lost: string[]; withdrawn: string[] } | null;
}

export interface RecordRowVM {
  id: string;
  title: string;
  client: string;
  sector: string;
  country: string;
  clientType: string;
  value: MoneyVM | null;
  valueBasis: Lifecycle['value']['basis'];
  submitted: string | null;
  decided: string | null;
  status: RecordStatus;
  place: { rank: number; of: number } | null;
  /** Lost: the gap (%), null when not published; masked without `see.margin`. Absent (undefined) where it does not apply. */
  gap?: number | null | 'masked';
  reason: string | null;
  /** Results: the win % predicted at DG2, null when none was recorded; masked for the roles that may not see it. */
  predicted?: number | null | 'masked';
  /** Where the row comes from: a bid (submitted or with a result), a decline, or a pursuit not yet submitted. */
  kind: 'bid' | 'declined' | 'pursued';
  /** An ended bid's debrief status, as the archive reads it; masked without `debrief.view` on the tender. Absent until the bid has ended. */
  debrief?: { status: DebriefStatus; label: string; tone: Tone; text: string } | 'masked';
}

export interface BidRecordVM {
  ccy: MoneyVM['ccy'];
  window: { label: string; rangeText: string };
  sector: string | null;
  /** The sector chips: every sector with a bid or a result in the window, most bids first. */
  sectors: { value: string; label: string; n: number }[];
  /** Some tenders in the window are not shared with the viewer, so the 12-month counts leave them out. */
  partial: boolean;
  totals: RecordTotalsVM;
  bySector: BreakdownVM;
  byClientType: BreakdownVM;
  byCountry: BreakdownVM;
  byBand: BreakdownVM;
  topClients: BreakdownVM;
  losses: LossesVM;
  declines: DeclinesVM;
  funnel: FunnelVM;
  forecast: ForecastVM;
  /** Five rolling years, oldest first; the last is the derived 12 months. It ignores the sector filter. */
  years: YearVM[];
  /** Every tender any count above opens, newest decision first. */
  rows: RecordRowVM[];
  /** The rows the table opens on: the bids (submitted or with a result in the window). */
  bidIds: string[];
  /** Who may see what is masked. */
  maskedBy: { gap: string; predicted: string; debrief: string };
}

/* ------------------------------------------------------------ arithmetic */

const uniq = (ids: string[]) => [...new Set(ids)];
const pctOf = (num: number, den: number) => (den ? Math.round((num / den) * 100) : null);
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

type Home = MoneyVM['ccy'];
const homeOf = (tenant: string): Home => tenantCcy(tenant) as Home;
const inHome = (home: Home, amount: number, ccy: Home) => convert(amount, ccy, home);
/** A lifecycle's value in the company currency, as the tiles sum it. */
const valueOf = (home: Home, l: Lifecycle) => inHome(home, l.value.amount, l.value.ccy);
/** A win's value: the awarded value where recorded, else the tender's, as Win / loss (PF-3) and Value won (OUT-3) sum it. */
const wonValueOf = (home: Home, l: Lifecycle, r: Result) => (r.value ? inHome(home, r.value.amount, r.value.ccy) : valueOf(home, l));
const sumOf = (home: Home, xs: number[]): MoneyVM => ({ amount: xs.reduce((a, b) => a + b, 0), ccy: home });

/** One amount, keeping what was stated when it was converted. */
function moneyVM(home: Home, amount: number, ccy: Home): MoneyVM {
  return ccy === home ? { amount, ccy } : { amount: Math.round(convert(amount, ccy, home)), ccy: home, original: { amount, ccy } };
}

const kpiCtxFor = (tenant: string, viewer: Person, done: DemoDone, window: PeriodWindow): KpiCtx => ({
  tenant, viewer, viewAs: false, window, prev: previousOf(window), done: done as Record<string, string>, scope: { kind: 'all' }, now: DEMO_NOW, dashboard: 'company',
});

/* ------------------------------------------------------------ value bands */

const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
/** The nearest round figure on a log scale: 123 M → 150 M, 240 M → 250 M. */
function nice(x: number): number {
  if (x <= 0) return 1;
  const k = 10 ** Math.floor(Math.log10(x));
  return NICE.map((n) => n * k).reduce((best, v) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(best / x)) ? v : best));
}
const nextNice = (x: number) => { const k = 10 ** Math.floor(Math.log10(x)); return NICE.map((n) => n * k).find((v) => v > x * 1.0001) ?? x * 2; };

export interface ValueBand { key: 'low' | 'mid' | 'high'; label: string; from: number; to: number | null }

const BANDS = new Map<string, ValueBand[]>();

/** An amount for a band label: "SAR 150 M", "SAR 1.5 bn". */
function bandMoney(x: number, ccy: Home): string {
  const whole = x >= 1e9 ? x % 1e9 === 0 : x % 1e6 === 0;
  return money(x, ccy, { dp: whole ? 0 : 1 });
}

/**
 * Three bands of bid value, set once per company from its typical bid size:
 * the lower and upper thirds of the bids it submitted in the 12 months to demo
 * day (the seed, whoever reads), each rounded to a round figure. So a demo
 * action never moves a band's edge.
 */
export function valueBandsOf(tenant: string): ValueBand[] {
  const hit = BANDS.get(tenant);
  if (hit) return hit;
  const home = homeOf(tenant);
  const vals = submissionsIn(tenant, windowOf(RECORD_PERIOD, tenant)).map((x) => valueOf(home, x.l)).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (f: number) => vals[Math.min(vals.length - 1, Math.floor(vals.length * f))] ?? 0;
  const lo = nice(q(1 / 3) || 1e6);
  let hi = nice(q(2 / 3) || 2e6);
  if (hi <= lo) hi = nextNice(lo);
  const a = bandMoney(lo, home);
  const b = bandMoney(hi, home);
  // "SAR 150–250 M" when both edges are millions (or both billions); otherwise "SAR 800 M – SAR 1.5 bn".
  const unit = (s: string) => s.slice(s.lastIndexOf(' ') + 1);
  const mid = unit(a) === unit(b) ? `${a.slice(0, a.lastIndexOf(' '))}–${b.slice(b.indexOf(' ') + 1)}` : `${a} – ${b}`;
  const out: ValueBand[] = [
    { key: 'low', label: `Under ${a}`, from: 0, to: lo },
    { key: 'mid', label: mid, from: lo, to: hi },
    { key: 'high', label: `${b} and over`, from: hi, to: null },
  ];
  BANDS.set(tenant, out);
  return out;
}

const bandOf = (bands: ValueBand[], v: number): ValueBand['key'] => bands.find((b) => v >= b.from && (b.to === null || v < b.to))!.key;

/* ------------------------------------------------------------ the window's sets */

interface Sets {
  home: Home;
  w: PeriodWindow;
  subs: { l: Lifecycle }[];
  res: { l: Lifecycle; r: Result }[];
  dg1: { l: Lifecycle; g: GateRecord }[];
  dg2: { l: Lifecycle; g: GateRecord }[];
  partial: boolean;
}

const RESULT_KINDS: Result['result'][] = ['won', 'lost', 'withdrawn', 'cancelled'];

function setsOf(tenant: string, done: DemoDone, viewer: Person): Sets {
  const w = windowOf(RECORD_PERIOD, tenant);
  const q = queriesFor({ tenant, viewer, done });
  const subs = q.submissionsIn(w);
  const res = q.resultsIn(w, RESULT_KINDS);
  const gates = q.gateEventsIn(w);
  // Whether anything in the window is hidden from this viewer: a yes or no only, never how many.
  const partial = submissionsIn(tenant, w, undefined, done).length !== subs.length
    || resultsIn(tenant, w, RESULT_KINDS, undefined, done).length !== res.length
    || gateEventsIn(tenant, w, undefined, undefined, done).length !== gates.length;
  return {
    home: homeOf(tenant), w, subs, res, partial,
    dg1: gates.filter((x) => x.g.gate === 'DG1' && x.g.decision === 'discard'),
    dg2: gates.filter((x) => x.g.gate === 'DG2' && x.g.decision === 'no-bid'),
  };
}

const inSector = (sector: string | null | undefined) => (l: Lifecycle) => !sector || l.sector === sector;

function totalsOf(s: Pick<Sets, 'home' | 'subs' | 'res'>): RecordTotalsVM {
  const { home } = s;
  const won = s.res.filter((x) => x.r.result === 'won');
  const lost = s.res.filter((x) => x.r.result === 'lost');
  const withdrawn = s.res.filter((x) => x.r.result === 'withdrawn' || x.r.result === 'cancelled');
  const awaiting = s.subs.filter((x) => !x.l.result);
  const wonValues = won.map((x) => ({ x, v: wonValueOf(home, x.l, x.r) }));
  const top = [...wonValues].sort((a, b) => b.v - a.v)[0];
  const valueWon = sumOf(home, wonValues.map((x) => x.v));
  const valueLost = sumOf(home, lost.map((x) => valueOf(home, x.l)));
  const n = won.length + lost.length;
  return {
    submitted: s.subs.length,
    valueSubmitted: sumOf(home, s.subs.map((x) => valueOf(home, x.l))),
    awaiting: awaiting.length,
    won: won.length, lost: lost.length, withdrawn: withdrawn.length,
    winRatePct: pctOf(won.length, n), n,
    valueWon, valueLost, valueRatePct: pctOf(valueWon.amount, valueWon.amount + valueLost.amount),
    largestWin: top ? {
      id: top.x.l.tenderId, title: top.x.l.shortTitle,
      value: top.x.r.value ? moneyVM(home, top.x.r.value.amount, top.x.r.value.ccy) : moneyVM(home, top.x.l.value.amount, top.x.l.value.ccy),
    } : null,
    ids: {
      submitted: uniq(s.subs.map((x) => x.l.tenderId)), awaiting: uniq(awaiting.map((x) => x.l.tenderId)),
      won: uniq(won.map((x) => x.l.tenderId)), lost: uniq(lost.map((x) => x.l.tenderId)), withdrawn: uniq(withdrawn.map((x) => x.l.tenderId)),
      results: uniq([...won, ...lost].map((x) => x.l.tenderId)),
    },
  };
}

/** Rows by a key: bids from the submissions, won and lost from the results, most bids first. */
function breakdownOf(
  s: Pick<Sets, 'home' | 'subs' | 'res'>, keyOf: (l: Lifecycle) => string, labelOf: (k: string) => string, order?: string[],
): BreakdownRowVM[] {
  const keys = uniq([...s.subs.map((x) => keyOf(x.l)), ...s.res.filter((x) => x.r.result === 'won' || x.r.result === 'lost').map((x) => keyOf(x.l))]);
  const rows = keys.map((key) => {
    const bids = s.subs.filter((x) => keyOf(x.l) === key);
    const won = s.res.filter((x) => x.r.result === 'won' && keyOf(x.l) === key);
    const lost = s.res.filter((x) => x.r.result === 'lost' && keyOf(x.l) === key);
    const n = won.length + lost.length;
    const ids = { bids: uniq(bids.map((x) => x.l.tenderId)), won: uniq(won.map((x) => x.l.tenderId)), lost: uniq(lost.map((x) => x.l.tenderId)) };
    return {
      key, label: labelOf(key), bids: bids.length, won: won.length, lost: lost.length, winRatePct: pctOf(won.length, n), n, small: n < MIN_N,
      valueBid: sumOf(s.home, bids.map((x) => valueOf(s.home, x.l))), pct: 0,
      ids: { ...ids, all: uniq([...ids.bids, ...ids.won, ...ids.lost]) },
    };
  });
  rows.sort((a, b) => (order ? order.indexOf(a.key) - order.indexOf(b.key) : 0) || b.bids - a.bids || b.won - a.won || a.label.localeCompare(b.label));
  const top = Math.max(1, ...rows.map((r) => r.bids));
  return rows.map((r) => ({ ...r, pct: Math.round((r.bids / top) * 100) }));
}

function lossesOf(tenant: string, viewer: Person, res: Sets['res'], arch: ArchiveVM): LossesVM {
  const lost = res.filter((x) => x.r.result === 'lost');
  const marginOn = (l: Lifecycle) => can(viewer, 'see.margin', tenderCtx(tenant, l)).ok;
  const debriefOn = (l: Lifecycle) => can(viewer, 'debrief.view', tenderCtx(tenant, l)).ok;
  const rows = LOSS_ORDER.flatMap((key) => {
    const xs = lost.filter((x) => (x.r.lossReason ?? 'other') === key);
    if (!xs.length) return [];
    const ranked = xs.filter((x) => x.r.rank);
    const gaps = xs.filter((x) => x.r.gapToWinnerPct !== undefined);
    const row: LossRowVM = {
      key, label: LOSS_LABEL[key], count: xs.length, sharePct: Math.round((xs.length / lost.length) * 100), pct: 0,
      // Whole places: two losses 7th of 7 and 4th of 4 read "6 of 6", never "5.5 of 5.5" (orchestrator review, plan 034).
      place: ranked.length ? { median: Math.round(median(ranked.map((x) => x.r.rank![0]))), of: Math.round(median(ranked.map((x) => x.r.rank![1]))), n: ranked.length } : null,
      gap: !xs.every((x) => marginOn(x.l)) ? 'masked' : gaps.length ? { medianPct: Math.round(median(gaps.map((x) => x.r.gapToWinnerPct!)) * 10) / 10, n: gaps.length } : null,
      topFactor: !xs.every((x) => debriefOn(x.l)) ? 'masked' : arch.lossReasons.find((a) => a.id === key)?.topFactor ?? null,
      ids: uniq(xs.map((x) => x.l.tenderId)),
    };
    return [row];
  }).sort((a, b) => b.count - a.count || (LOSS_ORDER as string[]).indexOf(a.key) - (LOSS_ORDER as string[]).indexOf(b.key));
  const top = Math.max(1, ...rows.map((r) => r.count));
  return {
    total: lost.length,
    rows: rows.map((r) => ({ ...r, pct: Math.round((r.count / top) * 100) })),
    placeRecorded: lost.filter((x) => x.r.rank).length,
    gapRecorded: lost.every((x) => marginOn(x.l)) ? lost.filter((x) => x.r.gapToWinnerPct !== undefined).length : 'masked',
    debriefs: { accepted: arch.lossReasons.reduce((n, a) => n + a.count, 0), canOpen: can(viewer, 'debrief.view').ok, complete: lost.every((x) => debriefOn(x.l)) },
  };
}

/** Declines by their first reason recorded, so the rows add up to the decisions. */
function declineGateOf(xs: Sets['dg1']): DeclineGateVM {
  const byCode = new Map<string, string[]>();
  for (const { l, g } of xs) { const code = g.reasonCodes[0] ?? 'other'; byCode.set(code, [...(byCode.get(code) ?? []), l.tenderId]); }
  const rows = [...byCode].map(([code, ids]) => ({ code, label: declineReasonLabel(code), count: ids.length, pct: 0, ids: uniq(ids) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const top = Math.max(1, ...rows.map((r) => r.count));
  return { total: xs.length, ids: uniq(xs.map((x) => x.l.tenderId)), rows: rows.map((r) => ({ ...r, pct: Math.round((r.count / top) * 100) })) };
}

/**
 * Captured → pursued → submitted → won, read from the decision funnel (PF-5)
 * at 12 months, so this row and the dashboard's funnel card agree. A sector
 * narrows the three steps that have tenders; captured notices are counts
 * without tenders, so they stay the company's.
 */
function funnelOf(tenant: string, viewer: Person, done: DemoDone, w: PeriodWindow, keep: (l: Lifecycle) => boolean, sector: string | null): FunnelVM {
  const f = flow('PF-5')?.compute(kpiCtxFor(tenant, viewer, done, w));
  const q = queriesFor({ tenant, viewer, done });
  const part = (step: string, key: string) => f?.steps.find((s) => s.key === step)?.parts.find((p) => p.key === key);
  const idsOf = (p: ReturnType<typeof part>) => (p?.drill?.kind === 'table' ? p.drill.ids ?? [] : []);
  const narrowed = (parts: ReturnType<typeof part>[]) => {
    const ids = uniq(parts.flatMap(idsOf)).filter((id) => { const l = q.one(id); return !!l && keep(l); });
    return { ids, count: sector ? ids.length : parts.reduce((n, p) => n + (p?.count ?? 0), 0) };
  };
  const captured = part('captured', 'notices')?.count ?? 0;
  const pursued = narrowed([part('dg1', 'pursue')]);
  // Plan 039: the funnel has no Submitted column any more; the bids sent are the submissions in the window, and Won is its own column.
  const sent = uniq(q.submissionsIn(w).map((x) => x.l.tenderId));
  const sentKept = sent.filter((id) => { const l = q.one(id); return !!l && keep(l); });
  const submitted = { ids: sentKept, count: sector ? sentKept.length : sent.length };
  const won = narrowed([part('won', 'won')]);
  return {
    capturedAllSectors: !!sector,
    steps: [
      { key: 'captured', label: 'Captured', sub: sector ? 'New notices, all sectors' : 'New notices', count: captured, ids: null, pctOfPrev: null },
      { key: 'pursued', label: 'Pursued', sub: 'Pursued at DG1', count: pursued.count, ids: pursued.ids, pctOfPrev: pctOf(pursued.count, captured) },
      { key: 'submitted', label: 'Submitted', sub: 'Bids sent', count: submitted.count, ids: submitted.ids, pctOfPrev: pctOf(submitted.count, pursued.count) },
      { key: 'won', label: 'Won', sub: 'Contracts won', count: won.count, ids: won.ids, pctOfPrev: pctOf(won.count, submitted.count) },
    ],
  };
}

/** The outcomes OUT-4 calibrates on: won or lost in the window, submitted, with the prediction recorded at DG2 (as `historyFrom` lists them). */
function outcomesOf(res: Sets['res']): BidOutcome[] {
  return res.filter((x) => (x.r.result === 'won' || x.r.result === 'lost') && x.l.submission).map(({ l, r }) => ({
    id: l.tenderId, title: l.title, sector: l.sector, clientType: l.clientType ?? 'government',
    value: r.value ?? { amount: l.value.amount, ccy: l.value.ccy },
    submitted: l.submission!.at.slice(0, 10), decided: r.at.slice(0, 10), result: r.result as BidOutcome['result'],
    ...(r.lossReason ? { lossReason: r.lossReason } : {}), ...(r.predictedWin !== undefined ? { predictedWin: r.predictedWin } : {}),
  }));
}

/** May the viewer see the predicted win % on this tender: margin (plan 032) and positions (the tender table's rule). */
const predictedOn = (tenant: string, viewer: Person, l: Lifecycle) => {
  const ctx = tenderCtx(tenant, l);
  return can(viewer, 'see.margin', ctx).ok && can(viewer, 'see.positions', ctx).ok;
};

function forecastOf(tenant: string, viewer: Person, res: Sets['res']): ForecastVM {
  const decided = res.filter((x) => (x.r.result === 'won' || x.r.result === 'lost') && x.r.predictedWin !== undefined);
  if (!decided.every((x) => predictedOn(tenant, viewer, x.l))) return { masked: true, calibration: null, judged: 0, within: 0 };
  const c = calibrationFor(outcomesOf(res));
  const judged = c.bands.filter((b) => !b.smallSample);
  return { masked: false, calibration: c, judged: judged.length, within: judged.filter((b) => b.within).length };
}

/** "2021–22". */
const yearLabel = (from: string, to: string) => `${from.slice(0, 4)}–${to.slice(2, 4)}`;

function seedYear(y: BidYearSeed): YearVM {
  return {
    key: y.from, label: yearLabel(y.from, y.to), rangeText: rangeText(y.from, y.to), to: y.to, derived: false,
    submitted: y.submitted, won: y.won, lost: y.lost, withdrawn: y.withdrawn, awaiting: 0,
    valueSubmitted: y.valueSubmitted, valueWon: y.valueWon, winRatePct: pctOf(y.won, y.won + y.lost),
    bySector: Object.entries(y.bySector).map(([sector, v]) => ({ sector, ...v })).sort((a, b) => b.submitted - a.submitted),
    ids: null,
  };
}

function derivedYear(s: Sets, t: RecordTotalsVM): YearVM {
  const sectors = uniq([...s.subs.map((x) => x.l.sector), ...s.res.map((x) => x.l.sector)]);
  return {
    key: 'last-12-months', label: 'Last 12 months', rangeText: s.w.rangeText, to: s.w.to.slice(0, 10), derived: true,
    submitted: t.submitted, won: t.won, lost: t.lost, withdrawn: t.withdrawn, awaiting: t.awaiting,
    valueSubmitted: t.valueSubmitted, valueWon: t.valueWon, winRatePct: t.winRatePct,
    bySector: sectors.map((sector) => ({
      sector, submitted: s.subs.filter((x) => x.l.sector === sector).length, won: s.res.filter((x) => x.r.result === 'won' && x.l.sector === sector).length,
    })).sort((a, b) => b.submitted - a.submitted),
    ids: { won: t.ids.won, lost: t.ids.lost, withdrawn: t.ids.withdrawn },
  };
}

/** What a row is now: its result, how it closed, awaiting a result, or still in progress. */
function statusOf(l: Lifecycle): RecordStatus {
  if (l.result) return l.result.result;
  switch (l.closedAs) {
    case 'discarded': case 'no-bid': case 'rejected': case 'withdrawn': case 'won': case 'lost': return l.closedAs;
  }
  return l.submission ? 'awaiting' : 'live';
}

/** The gate record that closed it: the last with that decision. */
const lastGate = (l: Lifecycle, decision: GateRecord['decision']) => [...l.gates].reverse().find((g) => g.decision === decision);

/** An ended bid's debrief, as the archive lists it; masked without `debrief.view` on the tender; absent until it has ended. */
function debriefOf(viewer: Person, ctx: ReturnType<typeof tenderCtx>, l: Lifecycle, deb: Map<string, ArchiveRow>): RecordRowVM['debrief'] {
  if (!endingOf(l)) return undefined;
  if (!can(viewer, 'debrief.view', ctx).ok) return 'masked';
  const d = deb.get(l.tenderId);
  return d ? { status: d.status, label: labelOf(DEBRIEF_STATUSES, d.status), tone: d.statusTone, text: d.statusText } : undefined;
}

function rowOf(tenant: string, viewer: Person, home: Home, l: Lifecycle, kind: RecordRowVM['kind'], declinedAt: string | undefined, deb: Map<string, ArchiveRow>): RecordRowVM {
  const status = statusOf(l);
  const r = l.result;
  const ctx = tenderCtx(tenant, l);
  const margin = can(viewer, 'see.margin', ctx).ok;
  const closing = status === 'discarded' ? lastGate(l, 'discard') : status === 'no-bid' ? lastGate(l, 'no-bid') : status === 'rejected' ? lastGate(l, 'rejected') : undefined;
  const reason = status === 'lost' ? LOSS_LABEL[r?.lossReason ?? 'other']
    : closing ? (closing.reasonCodes.map(declineReasonLabel).join(', ') || l.closedNote || null)
      : status === 'withdrawn' || status === 'cancelled' ? l.closedNote ?? null
        : status === 'live' ? `Now at ${stageLabel(currentOf(l).stage)}` : null;
  const decided = r?.at ?? closing?.at ?? declinedAt ?? l.closedAt ?? null;
  const isResult = status === 'won' || status === 'lost';
  return {
    id: l.tenderId, title: l.shortTitle, client: l.issuer, sector: l.sector, country: l.country,
    clientType: CLIENT_TYPE[l.clientType ?? 'none'],
    value: l.value.amount ? moneyVM(home, l.value.amount, l.value.ccy) : null, valueBasis: l.value.basis,
    submitted: l.submission?.at ?? null, decided,
    status, place: r?.rank ? { rank: r.rank[0], of: r.rank[1] } : null,
    ...(status === 'lost' ? { gap: margin ? r?.gapToWinnerPct ?? null : 'masked' as const } : {}),
    ...(isResult ? { predicted: predictedOn(tenant, viewer, l) ? r?.predictedWin ?? null : 'masked' as const } : {}),
    reason, kind,
    debrief: debriefOf(viewer, ctx, l, deb),
  };
}

/* ------------------------------------------------------------ the record */

export function bidRecordFor(tenant: string, done: DemoDone, viewer: Person, filters: RecordFilters = {}): BidRecordVM {
  const all = setsOf(tenant, done, viewer);
  const { home, w } = all;
  const sectorChips = breakdownOf(all, (l) => l.sector, (k) => k).map((r) => ({ value: r.key, label: r.label, n: r.bids }));
  // A sector the window doesn't have (a stale link) reads as all sectors.
  const sector = filters.sector && sectorChips.some((c) => c.value === filters.sector) ? filters.sector : null;
  const keep = inSector(sector);
  const s: Sets = {
    ...all,
    subs: all.subs.filter((x) => keep(x.l)), res: all.res.filter((x) => keep(x.l)),
    dg1: all.dg1.filter((x) => keep(x.l)), dg2: all.dg2.filter((x) => keep(x.l)),
  };
  const totals = totalsOf(s);
  const bands = valueBandsOf(tenant);

  const countries = breakdownOf(s, (l) => l.country, (k) => k);
  const clients = breakdownOf(s, (l) => l.issuer, (k) => k);
  const dg1 = declineGateOf(s.dg1);
  const dg2 = declineGateOf(s.dg2);
  const funnel = funnelOf(tenant, viewer, done, w, keep, sector);
  // The debriefs of the same 12 months, narrowed by the same sector (plan 037).
  const arch = archiveFor({ tenant, viewer, done, now: DEMO_NOW }, { period: '12m', ...(sector ? { sector } : {}) });
  const deb = new Map(arch.rows.map((r) => [r.tenderId, r]));

  // The table: every tender a count on the tab opens, each once, newest decision first.
  const declinedAt = new Map<string, string>();
  for (const { l, g } of [...s.dg1, ...s.dg2]) if ((declinedAt.get(l.tenderId) ?? '') < g.at) declinedAt.set(l.tenderId, g.at);
  const bidIds = uniq([...totals.ids.submitted, ...s.res.map((x) => x.l.tenderId)]);
  const q = queriesFor({ tenant, viewer, done });
  const pursuedIds = funnel.steps.find((x) => x.key === 'pursued')?.ids ?? [];
  const kindOf = (id: string): RecordRowVM['kind'] => (bidIds.includes(id) ? 'bid' : declinedAt.has(id) ? 'declined' : 'pursued');
  const rows = uniq([...bidIds, ...declinedAt.keys(), ...pursuedIds]).flatMap((id) => {
    const l = q.one(id);
    return l && keep(l) ? [rowOf(tenant, viewer, home, l, kindOf(id), declinedAt.get(id), deb)] : [];
  }).sort((a, b) => (b.decided ?? b.submitted ?? '').localeCompare(a.decided ?? a.submitted ?? '') || a.id.localeCompare(b.id));

  const single = countries.length === 1 && totals.submitted ? countries[0] : null;
  return {
    ccy: home,
    window: { label: w.label, rangeText: w.rangeText },
    sector, sectors: sectorChips, partial: all.partial,
    totals,
    bySector: { rows: breakdownOf(s, (l) => l.sector, (k) => k), more: 0 },
    byClientType: { rows: breakdownOf(s, (l) => l.clientType ?? 'none', (k) => CLIENT_TYPE[k as keyof typeof CLIENT_TYPE], CLIENT_ORDER), more: 0 },
    byCountry: { rows: countries, more: 0, ...(single ? { note: `Every bid in the last 12 months was in ${single.label}.` } : {}) },
    byBand: { rows: breakdownOf(s, (l) => bandOf(bands, valueOf(home, l)), (k) => bands.find((b) => b.key === k)!.label, bands.map((b) => b.key)), more: 0 },
    topClients: { rows: clients.slice(0, 8), more: Math.max(0, clients.length - 8) },
    losses: lossesOf(tenant, viewer, s.res, arch),
    declines: { total: dg1.total + dg2.total, ids: uniq([...dg1.ids, ...dg2.ids]), dg1, dg2 },
    funnel,
    forecast: forecastOf(tenant, viewer, s.res),
    // The five years ignore the sector: the earlier years are the company's annual record.
    years: [...(isGccTenantKey(tenant) ? BID_RECORD_YEARS[tenant] : []).map(seedYear), derivedYear(all, totalsOf(all))],
    rows,
    bidIds: bidIds.filter((id) => rows.some((r) => r.id === id)),
    maskedBy: { gap: holdersOf('see.margin'), predicted: holdersOf('see.positions'), debrief: holdersOf('debrief.view') },
  };
}

/* ------------------------------------------------------------ Overview's card */

export interface BidSummaryVM {
  windowLabel: string;
  rangeText: string;
  submitted: number;
  won: number;
  lost: number;
  winRatePct: number | null;
  n: number;
  small: boolean;
  valueWon: MoneyVM;
  largestWin: RecordTotalsVM['largestWin'];
  declined: number;
  partial: boolean;
}

/** The last 12 months in one card, from the same sets as the tab. */
export function bidSummaryFor(tenant: string, done: DemoDone, viewer: Person): BidSummaryVM {
  const s = setsOf(tenant, done, viewer);
  const t = totalsOf(s);
  return {
    windowLabel: s.w.label, rangeText: s.w.rangeText,
    submitted: t.submitted, won: t.won, lost: t.lost, winRatePct: t.winRatePct, n: t.n, small: t.n < MIN_N,
    valueWon: t.valueWon, largestWin: t.largestWin, declined: s.dg1.length + s.dg2.length, partial: s.partial,
  };
}
