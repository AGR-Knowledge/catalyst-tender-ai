import { DEMO_TODAY } from '@/domain/calendar';
import type { CountryCode } from '@/data/tenants';
import type { PeriodKey } from '@/domain/gcc/period';
import type { TenantSeed } from '../types';
import type { GccTenantKey } from '../index';
import { NOW, addDays, addWorkingDays, buildChain, cmp, dayDiff, plusMin, snapBack, snapFwd, type ChainSpec, type GateSpec } from './chain';
import { addFlows, emptyFlows, subFlows, type Countable, type FlowCounts } from './count';
import {
  DEADLINE_TIME, byEventTime, capturedBefore, changeEvent, cityFrom, clientTypeOf, discardNote, issuerFor, openedBefore, pickSource, resultClose, resultEvents, timeIn, workEvents, type Draft,
} from './fold';
import { ccOf, refFor, sourceOf } from './live/common';
import { placeLosses } from './placing';
import { POOLS, type TenantPool } from './pools';
import { rngOf, type Rng } from './rng';
import { AVG_TICKET_RANGE_M, HISTORY_FROM, RESULT_SPLITS, WINDOW_FROM, WINDOW_KEYS, type FlowTarget } from './targets';
import type { Lifecycle, Result } from './types';

/**
 * The deterministic history generator (plan 017 §3.3, rebuilt by plan 039).
 * Given a tenant's fixed lifecycles (the hand-authored rows) and plan 004's
 * folded records, it adds the closed tenders that make every flow target land
 * exactly, over the 730 days of history:
 *
 * 1. The windows are cut into disjoint bands (today · rest of 7 days · rest
 *    of 30 · rest of 90 · rest of 12 months · rest of All). A band's quota is
 *    the difference of its window targets, less what the records already put
 *    there. Today and the rest of 7 days are hand-authored only: a gap there
 *    throws. Where the records overshoot a band, a folded record's derived
 *    moments move to just before it.
 * 2. Chains are scheduled backwards, newest band first. In each band the
 *    results come first, then what stopped at each step (a bid cancelled
 *    after opening, a DG3 rejection, an approval cancelled before
 *    submission, a No-Bid, a bid withdrawn in Stage 4, a Pursue withdrawn in
 *    Stage 2, a hold, a discard). Each chain places the events before its
 *    last one in the newest band that still needs that kind of event, within
 *    the usual gaps (DG2 14–26 days after DG1, DG3 22–44 days after DG2, the
 *    submission 2–5 working days after DG3, the result 45–110 days after the
 *    submission). Events that fall before the history count nowhere.
 * 3. Late decisions, approvals against the majority, the wins' sectors, the
 *    loss reasons and the forecast bands are then set on generated tenders.
 *
 * Every date is a working day of the tenant's calendar, in working hours; the
 * random stream is seeded from the tenant key. Generated tenders close at
 * least three days before the demo's today, so today's and this week's tiles
 * show only hand-authored tenders.
 */

export interface GenerateInput {
  tenant: GccTenantKey;
  seed: TenantSeed;
  fixed: Lifecycle[];
  drafts: Draft[];
  targets: Partial<Record<PeriodKey, FlowTarget>>;
  /** DG2 approvals against the majority wanted over 12 months (Najd: RESULT_SPLITS). */
  againstMajority12m?: number;
  /** Steer the 12-month results to RESULT_SPLITS (Najd); otherwise calibrate the forecasts only. */
  splits?: typeof RESULT_SPLITS;
}

export interface GenerateResult {
  /** Folded and generated lifecycles, with ids. */
  lifecycles: Lifecycle[];
  /** How many the generator made. */
  generated: number;
  /** What it moved or marked, for the dev check. */
  notes: string[];
}

/** Generated tenders close by this time. */
const FILL_TO = `${addDays(DEMO_TODAY, -3)}T23:59`;
const FILL_DAY = FILL_TO.slice(0, 10);

/* ------------------------------------------------------------------ bands */

/** The kinds of counted event: DG1 pursue · discard · hold, DG2 bid · no-bid, DG3 approved · rejected, submitted, won, lost. */
type Ev = 'P' | 'X' | 'H' | 'B' | 'N' | 'A' | 'R' | 'S' | 'W' | 'L';
type Gate = 'DG1' | 'DG2' | 'DG3';

interface Band {
  key: PeriodKey;
  from: string;
  to: string;
  /** Records only: the generator adds nothing here. */
  fixed: boolean;
  /** Target events in the band. */
  want: Record<Ev, number>;
  /** Late decisions wanted in the band, or null where the target sets none. */
  late: Record<Gate, number | null>;
}

const evOf = (c: FlowCounts): Record<Ev, number> => ({
  P: c.dg1.pursue, X: c.dg1.discard, H: c.dg1.hold, B: c.dg2.bid, N: c.dg2['no-bid'], A: c.dg3.approved, R: c.dg3.rejected, S: c.submitted, W: c.won, L: c.lost,
});
const EVS: Ev[] = ['P', 'X', 'H', 'B', 'N', 'A', 'R', 'S', 'W', 'L'];

function wantOf(t: FlowTarget): { flows: FlowCounts; late: Record<Gate, number | null> } {
  const late = (d: { total: number; onTime?: number }) => (d.onTime === undefined ? null : d.total - d.onTime);
  return {
    flows: {
      dg1: { ...t.dg1.by, late: 0 }, dg2: { bid: t.dg2.by.bid, 'no-bid': t.dg2.by['no-bid'], late: 0 },
      dg3: { approved: t.dg3.by.approved, rejected: t.dg3.by.rejected, late: 0 }, submitted: t.submitted, submittedValue: 0, won: t.results.won, lost: t.results.lost,
    },
    late: { DG1: late(t.dg1), DG2: late(t.dg2), DG3: late(t.dg3) },
  };
}

export function bandsOf(targets: Partial<Record<PeriodKey, FlowTarget>>): Band[] {
  const keys = WINDOW_KEYS.filter((k) => targets[k]);
  return keys.map((k, i) => {
    const q = wantOf(targets[k]!);
    const inner = keys[i - 1];
    const qi = inner ? wantOf(targets[inner]!) : null;
    const late = (g: Gate) => (q.late[g] === null ? null : q.late[g]! - (qi?.late[g] ?? 0));
    return {
      key: k, from: WINDOW_FROM[k], to: inner ? plusMin(WINDOW_FROM[inner], -1) : NOW, fixed: k === 'today' || k === '7d',
      want: evOf(qi ? subFlows(q.flows, qi.flows) : q.flows), late: { DG1: late('DG1'), DG2: late('DG2'), DG3: late('DG3') },
    };
  });
}

/** A draft the way the counts see it, without building its stage log. */
const countable = (d: Draft): Countable => ({
  gates: ([['DG1', d.dg1], ['DG2', d.dg2], ['DG3', d.dg3]] as const).flatMap(([gate, g]) => (g ? [{ gate, decision: g.decision, at: g.at, onTime: g.onTime }] : [])),
  submission: d.submission, result: d.result, value: d.value,
});

const countIn = (lcs: Countable[], b: { from: string; to: string }) => {
  const c = emptyFlows();
  for (const l of lcs) addFlows(c, l, b.from, b.to);
  return c;
};

/** Late decisions of each gate in the band. */
const lateIn = (c: FlowCounts): Record<Gate, number> => ({ DG1: c.dg1.late, DG2: c.dg2.late, DG3: c.dg3.late });

/* ----------------------------------------------------------- the schedule */

type Kind = 'A' | 'H' | 'B' | 'C' | 'BW' | 'D' | 'AW' | 'EC' | 'E';

/**
 * Chain kinds by their last counted event: A discard · H hold · B pursue,
 * withdrawn in Stage 2 · C no-bid · BW bid, withdrawn in Stage 4 · D rejected
 * at DG3 · AW approved, cancelled before submission · EC submitted,
 * cancelled after opening · E result. In scheduling order within a band.
 */
const ORDER: [Kind, Ev][] = [['E', 'W'], ['E', 'L'], ['EC', 'S'], ['D', 'R'], ['AW', 'A'], ['C', 'N'], ['BW', 'B'], ['B', 'P'], ['H', 'H'], ['A', 'X']];
/** The level of each kind's last event: 0 DG1, 1 DG2, 2 DG3, 3 submission, 4 result. */
const TOP: Record<Kind, number> = { A: 0, H: 0, B: 0, C: 1, BW: 1, D: 2, AW: 2, EC: 3, E: 4 };
/** The event before each level, in order. */
const BEFORE: Ev[] = ['P', 'B', 'A', 'S'];
/** Days a kind needs after its last event to close by `FILL_TO`. */
const ROOM: Record<Kind, number> = { A: 0, H: 7, B: 8, C: 0, BW: 10, D: 0, AW: 3, EC: 9, E: 14 };

interface Chain {
  kind: Kind;
  /** The day of each counted event, DG1 first. */
  days: string[];
  result?: 'won' | 'lost';
  discard?: string;
  /** Steered after scheduling (12-month results). */
  sector?: string;
  lossReason?: NonNullable<Result['lossReason']>;
  predicted?: [number, number];
}

const DISCARD_REASONS: [string, number][] = [['out-of-scope', 11], ['below-value', 6], ['pq-fail', 5], ['insufficient-time', 4], ['capacity', 3]];
const LOSS_REASONS = [['price', 13], ['technical', 5], ['local-content', 3], ['pq', 1], ['other', 2]] as const;

/** The days a predecessor of an event on `day` may fall on, oldest first. */
function rangeBefore(level: number, day: string, cc: CountryCode): [string, string] {
  if (level === 4) return [addDays(day, -110), addDays(day, -45)];
  if (level === 3) return [addWorkingDays(day, -5, cc), addWorkingDays(day, -2, cc)];
  if (level === 2) return [addDays(day, -44), addDays(day, -22)];
  return [addDays(day, -26), addDays(day, -14)];
}

/** A working day in [lo, hi] at `frac` of the way, or null when there is none. */
function dayIn(lo: string, hi: string, frac: number, cc: CountryCode): string | null {
  if (lo > hi) return null;
  const d = addDays(lo, Math.round(frac * dayDiff(lo, hi)));
  const back = snapBack(d, cc);
  if (back >= lo) return back;
  const fwd = snapFwd(d, cc);
  return fwd <= hi ? fwd : null;
}

/**
 * The schedule: every chain the bands need, with its event days. `left` is
 * what each band still needs; predecessors take from it, newest band first.
 */
function schedule(bands: Band[], left: Record<Ev, number>[], cc: CountryCode, r: Rng): Chain[] {
  const chains: Chain[] = [];
  const history = HISTORY_FROM;
  const dayOfBand = (b: Band) => [b.from.slice(0, 10), b.to.slice(0, 10)] as const;
  /** A predecessor of kind `ev` in [lo, hi]: the newest fillable band that still needs one, else before the history; null when neither fits. */
  const place = (ev: Ev, lo: string, hi: string, taken: [number, Ev][]): string | null => {
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      if (b.fixed || left[i][ev] <= 0) continue;
      const [bf, bt] = dayOfBand(b);
      const d = dayIn(lo > bf ? lo : bf, hi < bt ? hi : bt, r.next(), cc);
      if (!d) continue;
      left[i][ev]--;
      taken.push([i, ev]);
      return d;
    }
    return lo < history ? dayIn(lo, hi < history ? hi : addDays(history, -1), r.next(), cc) : null;
  };
  /** The days of a chain whose last event is on `day`, or null (and nothing taken) when a predecessor has no room. */
  const chainFrom = (kind: Kind, day: string): string[] | null => {
    const days = [day];
    const taken: [number, Ev][] = [];
    for (let level = TOP[kind]; level > 0; level--) {
      const [lo, hi] = rangeBefore(level, days[0], cc);
      const d = place(BEFORE[level - 1], lo, hi, taken);
      if (!d) {
        for (const [i, ev] of taken) left[i][ev]++;
        return null;
      }
      days.unshift(d);
    }
    return days;
  };
  bands.forEach((b, i) => {
    if (b.fixed) return;
    const [bf, bt] = dayOfBand(b);
    for (const [kind, ev] of ORDER) {
      const n = left[i][ev];
      if (n <= 0) continue;
      left[i][ev] = 0;
      const last = bt < addDays(FILL_DAY, -ROOM[kind]) ? bt : addDays(FILL_DAY, -ROOM[kind]);
      for (let k = 0; k < n; k++) {
        let days: string[] | null = null;
        // Evenly spread first; then anywhere in the band where the events before it still fit.
        for (let tries = 0; tries < 40 && !days; tries++) {
          const frac = tries ? r.next() : (k + 0.5 + r.range(-0.3, 0.3)) / n;
          const day = dayIn(bf, last, Math.min(1, Math.max(0, frac)), cc);
          if (day) days = chainFrom(kind, day);
        }
        if (!days) throw new Error(`Generator: no room for a ${kind} chain in the ${b.key} band (${bf} to ${last})`);
        chains.push({
          kind, days,
          ...(kind === 'E' ? { result: ev === 'W' ? 'won' as const : 'lost' as const } : {}),
          ...(kind === 'A' ? { discard: r.weighted(DISCARD_REASONS) } : {}),
        });
      }
    }
  });
  return chains;
}

/* ------------------------------------------------------------ steering */

/** `total` split by weight, largest remainder first. */
function splitBy(total: number, weights: number[]): number[] {
  const W = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (W ? (total * w) / W : 0));
  const n = raw.map(Math.floor);
  const left = total - n.reduce((a, b) => a + b, 0);
  raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach(({ i }) => n[i]++);
  return n;
}

/**
 * What the generated tenders must add so a split lands: `target` less what
 * the records have, never below zero, fitted to `n` generated tenders (the
 * extra or the shortfall goes by `weights`).
 */
function needs(target: number[], have: number[], n: number, weights: number[]): number[] {
  const need = target.map((t, i) => Math.max(0, t - have[i]));
  let diff = n - need.reduce((a, b) => a + b, 0);
  if (diff > 0) splitBy(diff, weights).forEach((x, i) => { need[i] += x; });
  while (diff < 0) {
    const i = need.indexOf(Math.max(...need));
    need[i]--;
    diff++;
  }
  return need;
}

/** A list with `counts[i]` copies of `values[i]`, shuffled. */
function deal<T>(values: T[], counts: number[], r: Rng): T[] {
  const xs = values.flatMap((v, i) => Array.from({ length: counts[i] }, () => v));
  for (let i = xs.length - 1; i > 0; i--) { const j = r.int(0, i); [xs[i], xs[j]] = [xs[j], xs[i]]; }
  return xs;
}

/** The forecast bands (OUT-4), the predictions drawn in each, and the share of bids and win rate a calibrated history has in them. */
const FORECAST = [
  { min: 70.0001, max: 100, draw: [71, 88] as [number, number], share: 0.19, rate: 0.8 },
  { min: 50, max: 70, draw: [50, 69] as [number, number], share: 0.33, rate: 0.6 },
  { min: 30, max: 49.9999, draw: [30, 49] as [number, number], share: 0.25, rate: 0.4 },
  { min: 0, max: 29.9999, draw: [8, 29] as [number, number], share: 0.23, rate: 0.15 },
];

interface Steer { won: Chain[]; lost: Chain[]; records: Result[]; recordSectors: string[] }

/**
 * Sectors of the wins, loss reasons and forecast bands of the 12-month
 * results: exact to RESULT_SPLITS where given (Najd), else calibrated
 * forecasts and the usual loss reasons.
 */
function steer({ won, lost, records, recordSectors }: Steer, pool: TenantPool, splits: typeof RESULT_SPLITS | undefined, r: Rng) {
  const recWon = records.filter((x) => x.result === 'won');
  const recLost = records.filter((x) => x.result === 'lost');
  const bandOf = (p: number | undefined) => (p === undefined ? -1 : FORECAST.findIndex((b) => p >= b.min && p <= b.max));
  const recIn = (xs: Result[], i: number) => xs.filter((x) => bandOf(x.predictedWin) === i).length;
  const sectors = Object.keys(pool.sectors);
  if (splits) {
    const names = Object.keys(splits.wonBySector);
    const have = names.map((s) => recordSectors.filter((x) => x === s).length);
    deal(names, needs(names.map((s) => splits.wonBySector[s]), have, won.length, names.map(() => 0)), r).forEach((s, i) => { won[i].sector = s; });
    const reasons = Object.keys(splits.lossReasons) as NonNullable<Result['lossReason']>[];
    const lr = splits.lossReasons as Record<string, number>;
    deal(reasons, needs(reasons.map((k) => lr[k]), reasons.map((k) => recLost.filter((x) => x.lossReason === k).length), lost.length, reasons.map(() => 0)), r)
      .forEach((k, i) => { lost[i].lossReason = k; });
  } else {
    for (const c of won) c.sector = r.weighted(sectors.map((s, i) => [s, i === 0 ? 3 : 2] as const));
    for (const c of lost) c.lossReason = r.weighted(LOSS_REASONS);
  }
  const W = won.length + recWon.length;
  const L = lost.length + recLost.length;
  const tWon = splits ? splits.calibration.map((b) => b.won) : splitBy(W, FORECAST.map((b) => b.share * b.rate));
  const tLost = splits ? splits.calibration.map((b) => b.bids - b.won) : splitBy(L, FORECAST.map((b) => b.share * (1 - b.rate)));
  const idx = FORECAST.map((_, i) => i);
  deal(idx, needs(tWon, idx.map((i) => recIn(recWon, i)), won.length, FORECAST.map((b) => b.share * b.rate)), r).forEach((b, i) => { won[i].predicted = FORECAST[b].draw; });
  deal(idx, needs(tLost, idx.map((i) => recIn(recLost, i)), lost.length, FORECAST.map((b) => b.share * (1 - b.rate))), r).forEach((b, i) => { lost[i].predicted = FORECAST[b].draw; });
}

/* ------------------------------------------------------------- layout */

const OUT_OF_SCOPE_WORKS = ['facility management services', 'IT network cabling framework', 'landscaping maintenance', 'office furniture supply',
  'security guarding services', 'vehicle fleet leasing', 'laboratory equipment supply', 'traffic study consultancy', 'cleaning services contract',
  'street lighting maintenance', 'water treatment chemicals supply', 'survey services framework'];

const QUALIFIERS = ['package 2', 'phase 2', 'phase 3', 'package B', 'extension', 'north', 'south'];

const NO_BID: [string, string][] = [
  ['capacity', 'No-Bid at DG2: the team is committed to other submissions'],
  ['contract-risk', 'No-Bid at DG2: uncapped liabilities and unbalanced risk'],
  ['price-competition', 'No-Bid at DG2: the levelled price is well above recent awards'],
  ['below-value', 'No-Bid at DG2: below the value band once the scope was confirmed'],
];

const WITHDRAWN = [
  'The employer cancelled the tender', 'The employer postponed the tender indefinitely', 'Supplier quotes could not meet the local content minimum',
  'The JV partner withdrew', 'The employer re-scoped the works to re-tender them later',
];

interface Ctx { tenant: GccTenantKey; cc: CountryCode; pool: TenantPool; seed: TenantSeed; titles: Set<string>; projects: Set<string> }

/** A title as a set of lower-case words, so "Saham wadi crossing bridges" meets "Wadi crossing bridges, Saham" (plan 034). */
const wordsOf = (s: string) => [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))].sort().join(' ');
/** A title already used, or one that reads as a completed project of the register listed again. */
const taken = (ctx: Ctx, title: string) => ctx.titles.has(title) || ctx.projects.has(wordsOf(title));

function workFor(ctx: Ctx, r: Rng, plan: Chain): { title: string; sector: string; amount: number; city: string } {
  const sectors = Object.keys(ctx.pool.sectors);
  for (let tries = 0; tries < 80; tries++) {
    const city = r.pick(ctx.pool.cities);
    const q = tries >= 40 ? `, ${r.pick(QUALIFIERS)}` : '';
    if (plan.discard === 'out-of-scope') {
      const title = `${city} ${r.pick(OUT_OF_SCOPE_WORKS)}${q}`;
      if (taken(ctx, title)) continue;
      const lo = ctx.pool.sectors[sectors[0]].value[0];
      return { title, sector: 'Other', amount: Math.round(r.range(lo * 0.05, lo * 0.4) / 1e5) * 1e5, city };
    }
    const sector = plan.sector ?? r.weighted(sectors.map((s, i) => [s, i === 0 ? 3 : 2] as const));
    const sp = ctx.pool.sectors[sector];
    const title = `${city} ${r.pick(sp.works)}${q}`;
    if (taken(ctx, title)) continue;
    const [lo, hi] = sp.value;
    const amount = plan.discard === 'below-value' ? r.range(lo * 0.15, lo * 0.7) : r.range(lo, hi);
    return { title, sector, amount: Math.round(amount / 1e5) * 1e5, city };
  }
  throw new Error(`Generator ${ctx.tenant}: ran out of fictional titles`);
}


const dayOf = (iso: string) => iso.slice(0, 10);

/** Cancellation notes for a bid the employer cancelled after opening. */
const CANCELLED_AFTER_OPENING = [
  'The employer cancelled the tender after opening: every price was above the budget',
  'The employer cancelled the tender after opening, to re-tender it with a revised scope',
  'The employer cancelled the tender after opening',
];

/** One scheduled chain as a draft, or null when it cannot close by `FILL_TO` with this draw. */
function layout(ctx: Ctx, r: Rng, plan: Chain): Draft | null {
  const { cc, tenant } = ctx;
  const [dg1Day, dg2Day, dg3Day, subDay, resDay] = plan.days;
  const hot = `${tenant}.hot`;
  const at = (day: string, fromH = 10, toH = 16) => `${day}T${timeIn(r, fromH, toH)}`;
  /** A close `min`–`max` days after `day`, on a working day, never after `FILL_TO`. */
  const closeAfter = (day: string, min: number, max: number) => {
    const room = dayDiff(day, FILL_DAY);
    const d = snapBack(addDays(day, r.int(Math.min(min, room), Math.min(max, room))), cc);
    return at(d < day ? day : d);
  };
  const { title, sector, amount, city } = workFor(ctx, r, plan);
  const decider = r.chance(0.85) ? `${tenant}.bid` : hot;
  const dg1: GateSpec = plan.kind === 'A'
    ? { at: at(dg1Day), decision: 'discard', byId: decider, onTime: true, recommendation: 'discard', reasonCodes: [plan.discard!] }
    : plan.kind === 'H'
      ? { at: at(dg1Day), decision: 'hold', byId: decider, onTime: true, recommendation: 'conditions', reasonCodes: ['information-requested'], note: 'Held for information the tender does not give' }
      : { at: at(dg1Day), decision: 'pursue', byId: decider, onTime: true, recommendation: r.chance(0.75) ? 'pursue' : 'conditions' };
  const m1 = openedBefore(r, dg1.at, 24, true, cc);
  const issuer = issuerFor(title, ctx.pool, r, plan.kind === 'E' || plan.kind === 'EC');
  const d: Draft = {
    tenant, cc, id: null, title, shortTitle: title, issuer, clientType: clientTypeOf(issuer), city: cityFrom(city, ctx.pool, r), country: ctx.pool.country,
    sector, value: { amount, ccy: ctx.pool.ccy, basis: 'estimate' }, teamId: ctx.pool.sectors[sector]?.teamId ?? ctx.seed.teams[0].id,
    bidManagerId: `${tenant}.bid`, sourceId: pickSource(r, ctx.pool), origin: 'generated', derived: ['DG1', 'DG2', 'DG3'], from: `generated ${plan.kind}`,
    captured: capturedBefore(r, m1, cc), m1, dg1,
  };

  if (plan.kind === 'A') d.close = { at: dg1.at, as: 'discarded', note: discardNote(plan.discard) };
  else if (plan.kind === 'H') {
    d.close = { at: closeAfter(dg1Day, 7, 14), as: 'withdrawn', note: 'Held at DG1; the information did not arrive before the deadline, so the tender was not resumed' };
  } else if (plan.kind === 'B') {
    const w = closeAfter(dg1Day, 8, 20);
    d.close = { at: w, as: 'withdrawn', note: r.pick(WITHDRAWN), stage: 2, step: dayDiff(dg1Day, dayOf(w)) < 12 ? 'quotes-in' : 'levelling' };
  } else {
    const noBid = plan.kind === 'C' ? r.pick(NO_BID) : null;
    d.dg2 = noBid
      ? { at: at(dg2Day), decision: 'no-bid', byId: hot, onTime: true, reasonCodes: [noBid[0]], note: noBid[1] }
      : { at: at(dg2Day), decision: 'bid', byId: hot, onTime: true };
    d.packIssued = openedBefore(r, d.dg2.at, 24, true, cc);
    if (noBid) d.close = { at: d.dg2.at, as: 'no-bid', note: noBid[1] };
    else if (plan.kind === 'BW') {
      d.close = { at: closeAfter(dg2Day, 10, 25), as: 'withdrawn', note: r.pick(WITHDRAWN), stage: 4, step: 'resource-loading' };
    } else {
      d.dg3 = plan.kind === 'D'
        ? { at: at(dg3Day), decision: 'rejected', byId: hot, onTime: true, reasonCodes: ['margin-below-minimum'], note: 'The final price is below the DG2 minimum margin: do not submit' }
        : { at: at(dg3Day), decision: 'approved', byId: hot, onTime: true };
      d.dg3Issued = openedBefore(r, d.dg3.at, 48, true, cc);
      d.events = workEvents(r, cc, d.dg2.at, d.dg3Issued);
      if (plan.kind === 'D') d.close = { at: d.dg3.at, as: 'rejected', note: 'Rejected at DG3: margin below the DG2 minimum' };
      else if (plan.kind === 'AW') {
        d.close = { at: at(addWorkingDays(dg3Day, r.int(1, 2), cc)), as: 'withdrawn', note: 'The employer cancelled the tender before the deadline', stage: 8, step: 'assembling' };
      } else {
        const deadline = `${subDay}T${DEADLINE_TIME[tenant]}`;
        d.submission = { at: plusMin(deadline, -r.int(20, 95)), deadline, onTime: true, portal: '' };
        if (plan.kind === 'EC') {
          const c = closeAfter(subDay, 20, 60);
          d.result = { at: c, result: 'cancelled' };
          d.close = { at: c, as: 'withdrawn', note: r.pick(CANCELLED_AFTER_OPENING) };
        } else {
          const won = plan.result === 'won';
          const [lo, hi] = plan.predicted ?? (won ? [38, 76] : [10, 62]);
          const result: Result = {
            at: at(resDay, 10, 13), result: plan.result!, predictedWin: r.int(lo, hi),
            ...(won ? { value: { amount, ccy: ctx.pool.ccy } } : { lossReason: plan.lossReason ?? r.weighted(LOSS_REASONS) }),
          };
          d.result = result;
          let ev = resultEvents(r, cc, result.at, won);
          let close = resultClose(r, cc, result.at, ev);
          // Near the end of the history, the lessons may not fit before `FILL_TO`: then the result closes without them.
          if (close > FILL_TO) {
            ev = ev.filter((e) => e.kind !== 'lessons');
            const handover = ev.find((e) => e.kind === 'handover')?.at;
            if (handover && handover > FILL_TO) return null;
            close = closeAfter(dayOf(handover ?? result.at), 1, 4);
          }
          d.events = [...d.events, ...ev];
          d.close = { at: close, as: won ? 'won' : 'lost' };
        }
      }
    }
  }
  if (d.close!.at > FILL_TO) return null;
  return d;
}

/* ------------------------------------------------------------- live ones */

/** Generated chains of these kinds whose last counted event falls in the last 30 days stay live (review of plan 039, 2026-10-06). */
const LIVE_KINDS = new Set<Kind>(['B', 'BW', 'EC']);

/** A working day `n` days from `day`, forward. */
const fwd = (day: string, n: number, cc: CountryCode) => snapFwd(addDays(day, n), cc);

/**
 * Turns a generated tender that would have been withdrawn or cancelled into a
 * live one, where its stage flow has got to by today: a Pursue in Stage 2, a
 * Bid in Stages 4 to 6, a submitted bid awaiting its result. Its facts read
 * on track: no gate open, nothing overdue. The counted events do not move.
 */
function liven(d: Draft, kind: Kind, r: Rng) {
  const { cc } = d;
  const today = DEMO_TODAY;
  const deadline = (day: string) => ({ date: day, time: DEADLINE_TIME[d.tenant as GccTenantKey] });
  const value = d.value.amount;
  delete d.close;
  if (kind === 'B') {
    const since = dayDiff(dayOf(d.dg1!.at), today);
    const step = since <= 5 ? 'rfqs-out' : since <= 12 ? 'quotes-in' : 'levelling';
    const total = r.int(7, 12);
    const covered = step === 'rfqs-out' ? 0 : total - r.int(1, 2);
    const rfqs = total * 3;
    const dueSoFar = step === 'rfqs-out' ? 0 : step === 'quotes-in' ? Math.round(rfqs * r.range(0.45, 0.65)) : Math.round(rfqs * r.range(0.85, 0.95));
    // Suppliers reply about as late as they do on the hand-authored bids: about seven in ten by their date.
    const answeredOnTime = Math.round(dueSoFar * r.range(0.62, 0.8));
    d.now = { stage: 2, step };
    d.facts = {
      stage: 2, packages: { total, covered }, rfqs: { sent: rfqs, total: rfqs, overdue: r.chance(0.5) ? Math.min(1, dueSoFar - answeredOnTime) : 0, escalated: 0, answeredOnTime, dueSoFar },
      toLevel: step === 'levelling' ? r.int(2, 5) : 0, notCoveredPct: step === 'levelling' ? Math.round(r.range(0, 3) * 10) / 10 : 0,
      repliesDue: fwd(today, r.int(3, 9), cc), clarifications: { open: r.int(0, 3), stale: 0 }, bestFitApproved: 0,
    };
    // Before the end of April, so no certificate that lapses then (Najd's Zakat, 30 Apr) puts a generated bid at risk.
    d.submissionDeadline = deadline(fwd(dayOf(d.dg1!.at), r.int(52, 66), cc));
  } else if (kind === 'BW') {
    const dg2Day = dayOf(d.dg2!.at);
    const since = dayDiff(dg2Day, today);
    const pin = (n: number, h: string) => `${fwd(dg2Day, n, cc)}T${h}`;
    if (since < 9) {
      d.now = { stage: 4, step: since < 4 ? 'baseline-drafting' : 'resource-loading' };
      const required = r.int(18, 30);
      d.facts = {
        stage: 4, durationPlannedM: required - r.int(0, 2), durationRequiredM: required, floatDays: r.int(6, 25), longLeadAtRisk: r.int(0, 1),
        peakManpower: r.int(15, 45) * 10, baselineDue: fwd(today, r.int(2, 6), cc), m2Due: fwd(today, r.int(9, 15), cc),
      };
    } else if (since < 18) {
      d.steps = { '5:cost-build-up': pin(r.int(6, 8), '09:00') };
      d.now = { stage: 5, step: 'cost-build-up' };
      const base = Math.round(r.range(9.2, 11.5) * 10) / 10;
      d.facts = {
        stage: 5, estPrice: { amount: Math.round((value * r.range(0.96, 1.03)) / 1e5) * 1e5, ccy: d.value.ccy }, baseMarginPct: base, minMarginPct: base >= 10 ? 9 : 8,
        sourcedPct: r.int(78, 92), estimatedPct: r.int(4, 12), financeCheck: 'pending', priceDue: fwd(today, r.int(4, 10), cc), m2Due: fwd(dg2Day, 10, cc),
      };
    } else {
      d.steps = { '5:cost-build-up': pin(r.int(6, 8), '09:00'), '6:sections-assigned': pin(r.int(14, 16), '09:00') };
      d.now = { stage: 6, step: 'drafting' };
      const total = r.int(12, 18);
      d.facts = { stage: 6, sections: { locked: r.int(2, total - 5), total, late: 0 }, simScore: r.int(72, 82), passMark: 70, smeOverdue: 0, reusePct: r.int(30, 48) };
    }
    d.submissionDeadline = deadline(fwd(dg2Day, r.int(42, 56), cc));
  } else {
    const subDay = dayOf(d.submission!.at);
    delete d.result;
    d.now = { stage: 8, step: 'awaiting-result' };
    const validTo = addDays(subDay, r.int(9, 12) * 10);
    const award = addDays(subDay, r.int(60, 100));
    d.facts = {
      stage: 8, packageReadyPct: 100, signaturesPending: 0, openingDate: subDay, expectedAwardBy: award > today ? award : fwd(today, r.int(10, 30), cc),
      bond: { amount: { amount: Math.round((value * (cc === 'SA' ? 0.02 : 0.01)) / 1e4) * 1e4, ccy: d.value.ccy }, validTo, requiredTo: validTo, issued: true },
    };
  }
  d.from = `${d.from}, live`;
}

/* ------------------------------------------------------------ adjustments */

const WORK_KINDS = new Set(['replan', 'm2', 'reprice', 'review']);

/** Stages 4–6 events again, after the DG2 or the DG3 pack moved. */
function rework(d: Draft, r: Rng) {
  if (!d.dg2 || !d.dg3Issued || !d.events) return;
  d.events = [...workEvents(r, d.cc, d.dg2.at, d.dg3Issued), ...d.events.filter((e) => !WORK_KINDS.has(e.kind))];
}

/** Moves a folded draft's derived DG2, and the DG1 before it, to just before the band. */
function demoteDg2(d: Draft, start: string, r: Rng): boolean {
  if (!d.derived.includes('DG2') || d.dg2?.decision !== 'bid' || !d.dg3Issued) return false;
  const day = snapBack(addDays(start, -r.int(1, 3)), d.cc);
  if (dayDiff(day, d.dg3Issued) > 75) return false;
  d.dg2 = { ...d.dg2, at: `${day}T${timeIn(r, 10, 15)}` };
  d.packIssued = openedBefore(r, d.dg2.at, 24, d.dg2.onTime, d.cc);
  if (d.derived.includes('DG1')) {
    d.dg1 = { ...d.dg1!, at: `${snapBack(addDays(day, -r.int(14, 22)), d.cc)}T${timeIn(r, 9, 15)}` };
    d.m1 = openedBefore(r, d.dg1.at, 24, d.dg1.onTime, d.cc);
    d.captured = capturedBefore(r, d.m1, d.cc);
  }
  rework(d, r);
  return true;
}

/** Moves a folded draft's derived DG1 Pursue to just before the band. */
function demoteDg1(d: Draft, start: string, r: Rng): boolean {
  if (!d.derived.includes('DG1') || d.dg1?.decision !== 'pursue') return false;
  const next = d.dg2?.at ?? d.close?.at;
  const day = snapBack(addDays(start, -r.int(1, 3)), d.cc);
  if (!next || dayDiff(day, next) > 60) return false;
  d.dg1 = { ...d.dg1, at: `${day}T${timeIn(r, 9, 15)}` };
  d.m1 = openedBefore(r, d.dg1.at, 24, d.dg1.onTime, d.cc);
  d.captured = capturedBefore(r, d.m1, d.cc);
  return true;
}

const gateOf = (d: Draft, g: 'DG1' | 'DG2' | 'DG3') => (g === 'DG1' ? d.dg1 : g === 'DG2' ? d.dg2 : d.dg3);

/** Marks a gate late: it opened longer ago than its SLA. */
function markLate(d: Draft, g: 'DG1' | 'DG2' | 'DG3', r: Rng) {
  const gate = { ...gateOf(d, g)!, onTime: false };
  const opened = openedBefore(r, gate.at, g === 'DG3' ? 48 : 24, false, d.cc);
  if (g === 'DG1') {
    d.dg1 = gate;
    d.m1 = opened;
    if (d.captured > opened) d.captured = capturedBefore(r, opened, d.cc);
  } else if (g === 'DG2') {
    d.dg2 = gate;
    d.packIssued = opened;
  } else {
    d.dg3 = gate;
    d.dg3Issued = opened;
    rework(d, r);
  }
}

/** `k` items spread evenly over `xs`. */
const spreadPick = <T>(xs: T[], k: number): T[] => Array.from({ length: k }, (_, i) => xs[Math.floor(((i + 0.5) * xs.length) / k)]);

/**
 * Evens out the Stages 4–6 work events over the folded and generated bids, so
 * the shares land on plan 017 §3.3.1 rather than wherever a small sample puts
 * them: re-plans on 40% of the bids, re-prices on 50%, M2 held by its due date
 * on 85%, the red-team review on 90%.
 */
function balanceEvents(ds: Draft[], r: Rng) {
  const bids = ds.filter((d) => d.dg2?.decision === 'bid' && d.dg3Issued && d.events);
  for (const [kind, share] of [['replan', 0.4], ['reprice', 0.5]] as const) {
    const has = bids.filter((d) => d.events!.some((e) => e.kind === kind));
    const want = Math.round(share * bids.length);
    if (has.length > want) for (const d of spreadPick(has, has.length - want)) d.events = d.events!.filter((e) => e.kind !== kind);
    const without = bids.filter((d) => !d.events!.some((e) => e.kind === kind));
    if (has.length < want) for (const d of spreadPick(without, want - has.length)) d.events = [...d.events!, changeEvent(r, d.cc, kind, d.dg2!.at, d.dg3Issued!)].sort(byEventTime);
  }
  for (const [kind, share, toH] of [['m2', 0.85, 16], ['review', 0.9, 12]] as const) {
    const evs = bids.flatMap((d) => d.events!.flatMap((e) => (e.kind === kind ? [{ d, e }] : []))) as { d: Draft; e: { at?: string; due: string } }[];
    const held = (x: { e: { at?: string; due: string } }) => !!x.e.at && x.e.at.slice(0, 10) <= x.e.due;
    const want = Math.round(share * evs.length);
    const onTime = evs.filter(held);
    if (onTime.length > want) for (const { d, e } of spreadPick(onTime, onTime.length - want)) e.at = `${snapFwd(addDays(e.due, r.int(1, 3)), d.cc)}T${timeIn(r, 9, toH)}`;
    if (onTime.length < want) for (const { e } of spreadPick(evs.filter((x) => !held(x)), want - onTime.length)) e.at = `${e.due}T${timeIn(r, 9, toH)}`;
  }
  for (const d of bids) d.events!.sort(byEventTime);
}

/* ------------------------------------------------------------ assembly */

const inBand = (iso: string | undefined, b: { from: string; to: string }) => !!iso && iso >= b.from && iso <= b.to;

/** Gives drafts without an id a free `T-YYYY-NNN`, roughly in capture order, at the rate the tenant's ids run. */
function allocateIds(seed: TenantSeed, fixed: Lifecycle[], drafts: Draft[]) {
  const used = new Set<string>([
    ...fixed.map((l) => l.tenderId), ...seed.register.map((t) => t.id), ...seed.historySeed.dg1.map((d) => d.tenderId),
    ...seed.historySeed.dg2.map((d) => d.tenderId), ...drafts.flatMap((d) => (d.id ? [d.id] : [])),
  ]);
  const maxOf = (year: string) => Math.max(0, ...[...used].filter((id) => id.startsWith(`T-${year}-`)).map((id) => Number(id.slice(7))));
  const dayOfYear = (iso: string) => dayDiff(`${iso.slice(0, 4)}-01-01`, iso) + 1;
  const rates: Record<string, number> = {};
  const rateOf = (year: string): number => {
    if (rates[year] === undefined) {
      const max = maxOf(year);
      const days = year === DEMO_TODAY.slice(0, 4) ? dayOfYear(DEMO_TODAY) : 365;
      rates[year] = max > 20 ? max / days : year < DEMO_TODAY.slice(0, 4) ? rateOf(String(Number(year) + 1)) : 1.2;
    }
    return rates[year];
  };
  const last: Record<string, number> = {};
  for (const d of drafts.filter((x) => !x.id).sort((a, b) => cmp(a.captured, b.captured))) {
    const year = d.captured.slice(0, 4);
    let n = Math.max(1, Math.round(dayOfYear(d.captured) * rateOf(year)), (last[year] ?? 0) + 1);
    while (used.has(`T-${year}-${String(n).padStart(3, '0')}`)) n++;
    d.id = `T-${year}-${String(n).padStart(3, '0')}`;
    used.add(d.id);
    last[year] = n;
  }
}

function finalSpec(d: Draft, seed: TenantSeed): ChainSpec {
  const { derived: _derived, from: _from, sourceId, ...rest } = d;
  const portal = seed.sources.find((s) => s.id === sourceId)?.name ?? sourceId;
  return {
    ...rest, id: d.id!,
    source: sourceOf(d.tenant as GccTenantKey, sourceId, refFor(d.issuer, d.id!, seed)),
    ...(d.submission ? { submission: { ...d.submission, portal: d.submission.portal || portal } } : {}),
  };
}

/* ---------------------------------------------------------------- main */

export function generateHistory(input: GenerateInput): GenerateResult {
  const { tenant, seed, fixed, drafts } = input;
  const r = rngOf(`generate:${tenant}`);
  const cc = ccOf(tenant);
  const notes: string[] = [];
  const bands = bandsOf(input.targets);
  const records = () => [...fixed, ...drafts.map(countable)];
  const resid = (b: Band) => {
    const have = evOf(countIn(records(), b));
    return Object.fromEntries(EVS.map((e) => [e, b.want[e] - have[e]])) as Record<Ev, number>;
  };

  // Records-only bands must be met by the records alone.
  for (const b of bands.filter((x) => x.fixed)) {
    const off = EVS.map((e) => [e, resid(b)[e]] as const).filter(([, v]) => v !== 0);
    if (off.length) throw new Error(`Generator ${tenant}: band ${b.key} (${b.from} to ${b.to}) is off by ${off.map(([n, v]) => `${n} ${v > 0 ? '+' : ''}${v}`).join(', ')}. Its records are hand-authored: fix them.`);
  }

  // Overshoots: move folded records' derived moments to just before their band.
  for (const b of bands.filter((x) => !x.fixed)) {
    const start = dayOf(b.from);
    for (let guard = 0; guard < 100; guard++) {
      const res = resid(b);
      const inB = (d: Draft, g: 'DG1' | 'DG2') => inBand(gateOf(d, g)?.at, b);
      let moved: Draft | undefined;
      if (res.B < 0) moved = drafts.find((d) => inB(d, 'DG2') && demoteDg2(d, start, r));
      else if (res.P < 0) moved = drafts.find((d) => inB(d, 'DG1') && demoteDg1(d, start, r));
      if (!moved) break;
      notes.push(`${moved.from}: ${res.B < 0 ? 'DG2' : 'DG1'} moved before ${start}`);
    }
  }
  const left = bands.map(resid);
  bands.forEach((b, i) => {
    const over = EVS.filter((e) => left[i][e] < 0);
    if (over.length) throw new Error(`Generator ${tenant}: the records overshoot the ${b.key} band by ${over.map((e) => `${e} ${-left[i][e]}`).join(', ')}`);
  });

  // The schedule, then each chain laid out.
  const chains = schedule(bands, left, cc, r);
  const twelve = { from: WINDOW_FROM['12m'], to: NOW };
  const in12 = (c: Chain) => c.kind === 'E' && c.days[4] >= dayOf(twelve.from);
  const recResults = records().flatMap((l) => (l.result && inBand(l.result.at, twelve) && (l.result.result === 'won' || l.result.result === 'lost') ? [l.result] : []));
  const recSectors = [...fixed, ...drafts].flatMap((l) => (l.result?.result === 'won' && inBand(l.result.at, twelve) ? [l.sector] : []));
  steer({ won: chains.filter((c) => in12(c) && c.result === 'won'), lost: chains.filter((c) => in12(c) && c.result === 'lost'), records: recResults, recordSectors: recSectors },
    POOLS[tenant], input.splits, r);
  const ctx: Ctx = { tenant, cc, pool: POOLS[tenant], seed, titles: new Set([...fixed, ...drafts].map((l) => l.title)), projects: new Set(seed.projects.map((p) => wordsOf(p.title))) };
  const made: Draft[] = [];
  for (const c of chains) {
    let d: Draft | null = null;
    for (let tries = 0; tries < 20 && !d; tries++) d = layout(ctx, r, c);
    if (!d) throw new Error(`Generator ${tenant}: a ${c.kind} chain ending ${c.days[c.days.length - 1]} cannot close by ${FILL_TO}`);
    made.push(d);
    ctx.titles.add(d.title);
  }

  // PF-2: where a range is set, each window's mean submitted value stays inside it.
  const range = AVG_TICKET_RANGE_M[tenant];
  if (range) {
    for (const b of bands.filter((x) => !x.fixed)) {
      const win = { from: b.from, to: NOW };
      const subs = [...fixed, ...drafts, ...made].filter((l) => inBand(l.submission?.at, win));
      const mine = made.filter((d) => inBand(d.submission?.at, b));
      const mean = subs.reduce((t, l) => t + l.value.amount, 0) / (subs.length || 1) / 1e6;
      const aim = mean > range[1] ? range[1] - 5 : mean < range[0] ? range[0] + 5 : null;
      if (aim === null || !mine.length) continue;
      const total = mine.reduce((t, d) => t + d.value.amount, 0);
      const f = 1 + ((aim - mean) * subs.length * 1e6) / total;
      for (const d of mine) {
        const amount = Math.round((d.value.amount * f) / 1e5) * 1e5;
        d.value = { ...d.value, amount };
        if (d.result?.value) d.result = { ...d.result, value: { ...d.result.value, amount } };
      }
      notes.push(`${b.key}: generated bids scaled ×${f.toFixed(2)} for a mean of ${aim} M`);
    }
  }

  // Late decisions, band by band: generated gates first, then folded derived ones. Without a target, about 4% of the generated ones.
  for (const b of bands.filter((x) => !x.fixed)) {
    const have = lateIn(countIn([...records(), ...made.map(countable)], b));
    for (const g of ['DG1', 'DG2', 'DG3'] as const) {
      const onTime = (d: Draft) => d.derived.includes(g) && !!gateOf(d, g)?.onTime && inBand(gateOf(d, g)!.at, b);
      const mine = made.filter(onTime);
      const n = b.late[g] === null ? Math.round(made.filter((d) => inBand(gateOf(d, g)?.at, b)).length * 0.04) : b.late[g]! - have[g];
      if (n < 0) throw new Error(`Generator ${tenant}: the records have ${-n} more ${g} decisions late than the ${b.key} band wants`);
      const pool = mine.length >= n ? mine : [...mine, ...drafts.filter(onTime)];
      if (pool.length < n) throw new Error(`Generator ${tenant}: only ${pool.length} ${g} decisions to mark late in the ${b.key} band, ${n} needed`);
      for (let k = 0; k < n; k++) {
        const d = pool[Math.floor(((k + 0.5) * pool.length) / n)];
        markLate(d, g, r);
        if (d.origin !== 'generated') notes.push(`${d.from}: ${g} marked late`);
      }
    }
  }

  // DG2 approvals against the majority over 12 months, on generated bids.
  if (input.againstMajority12m !== undefined) {
    const has = fixed.reduce((s, l) => s + l.gates.filter((g) => g.gate === 'DG2' && g.againstMajority && inBand(g.at, twelve)).length, 0)
      + drafts.filter((d) => d.dg2?.againstMajority && inBand(d.dg2.at, twelve)).length;
    const want = input.againstMajority12m - has;
    const bids = made.filter((d) => d.dg2?.decision === 'bid' && inBand(d.dg2.at, twelve));
    if (want < 0 || bids.length < want) throw new Error(`Generator ${tenant}: DG2 against the majority is off by ${want}`);
    for (const d of spreadPick(bids, want)) d.dg2 = { ...d.dg2!, againstMajority: true, note: 'Approved against the majority of positions; the Head of Tendering recorded why' };
  }

  // What the last 30 days approved is still being worked on: those chains stay live (own stream, so nothing above moves).
  const lr = rngOf(`live:${tenant}`);
  const start30 = WINDOW_FROM['30d'];
  for (const d of made) {
    const kind = d.from.slice('generated '.length) as Kind;
    if (!LIVE_KINDS.has(kind)) continue;
    const last = kind === 'B' ? d.dg1?.at : kind === 'BW' ? d.dg2?.at : d.submission?.at;
    if (last && last >= start30) liven(d, kind, lr);
  }

  const all = [...drafts, ...made];
  balanceEvents(all, r);
  allocateIds(seed, fixed, all);
  // Places and gaps on folded and generated losses (plan 034 §1): each on its own stream, seeded by the id just given.
  placeLosses(all);
  return { lifecycles: all.map((d) => buildChain(finalSpec(d, seed))), generated: made.length, notes };
}
