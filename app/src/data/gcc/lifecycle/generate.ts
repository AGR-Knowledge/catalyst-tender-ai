import { DEMO_TODAY } from '@/domain/calendar';
import type { CountryCode } from '@/data/tenants';
import type { PeriodKey } from '@/domain/gcc/period';
import type { TenantSeed } from '../types';
import type { GccTenantKey } from '../index';
import { NOW, addDays, addWorkingDays, buildChain, cmp, dayDiff, plusMin, snapBack, snapFwd, type ChainSpec, type GateSpec } from './chain';
import { addFlows, emptyFlows, flowEntries, subFlows, type Countable, type FlowCounts } from './count';
import {
  DEADLINE_TIME, byEventTime, capturedBefore, changeEvent, cityFrom, clientTypeOf, discardNote, issuerFor, openedBefore, pickSource, resultClose, resultEvents, timeIn, workEvents, type Draft,
} from './fold';
import { ccOf, refFor, sourceOf } from './live/common';
import { POOLS, type TenantPool } from './pools';
import { rngOf, type Rng } from './rng';
import { WINDOW_FROM, WINDOW_KEYS, type DecisionCounts, type FlowTarget } from './targets';
import type { Lifecycle, Result } from './types';

/**
 * The deterministic history generator (plan 017 §3.3). Given a tenant's fixed
 * lifecycles (the hand-authored rows) and plan 004's folded records, it adds
 * the closed tenders that make every flow target land exactly:
 *
 * 1. The windows are cut into disjoint bands (today · rest of 7 days · rest of
 *    30 · rest of 90 · rest of 12 months). A band's quota is the difference of
 *    its window targets. Najd's inner bands are fully set by dashboards.md
 *    §12.3's anchors, so a gap there throws; generation fills the outer band.
 *    The other tenants have one band, the 12 months.
 * 2. Where the records overshoot a quota, a folded record's derived moments
 *    (those plan 004 did not state) move to just before the band.
 * 3. The rest is filled with chains, from the end of the lifecycle backwards:
 *    results, submissions, DG3, DG2, DG1. A chain may enter the band late (its
 *    DG1 before 9 Mar 2025, say), so each quota is met exactly.
 * 4. Late decisions and "approval against the majority" are then marked, on
 *    generated gates first.
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
  /** Every submission in the targets is already a record (Najd): generating one is a bug. */
  submissionsFixed?: boolean;
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

/* ------------------------------------------------------------------ bands */

interface Band { key: PeriodKey; from: string; to: string; flows: FlowCounts; open: Set<string> }

function quotaOf(t: FlowTarget): { flows: FlowCounts; open: Set<string> } {
  const open = new Set<string>();
  const late = (gate: string, d: DecisionCounts<string>) => {
    if (d.onTime !== undefined) return d.total - d.onTime;
    open.add(`${gate} late`);
    return 0;
  };
  if (t.avgTicketM === undefined) open.add('submitted value');
  return {
    flows: {
      dg1: { ...t.dg1.by, late: late('DG1', t.dg1) },
      dg2: { bid: t.dg2.by.bid, 'no-bid': t.dg2.by['no-bid'], late: late('DG2', t.dg2) },
      dg3: { approved: t.dg3.by.approved, rejected: t.dg3.by.rejected, late: late('DG3', t.dg3) },
      submitted: t.submitted,
      submittedValue: Math.round((t.avgTicketM ?? 0) * t.submitted * 1_000_000),
      won: t.results.won,
      lost: t.results.lost,
    },
    open,
  };
}

export function bandsOf(targets: Partial<Record<PeriodKey, FlowTarget>>): Band[] {
  const keys = WINDOW_KEYS.filter((k) => targets[k]);
  return keys.map((k, i) => {
    const q = quotaOf(targets[k]!);
    const inner = keys[i - 1];
    return {
      key: k, from: WINDOW_FROM[k], to: inner ? plusMin(WINDOW_FROM[inner], -1) : NOW,
      flows: inner ? subFlows(q.flows, quotaOf(targets[inner]!).flows) : q.flows, open: q.open,
    };
  });
}

/** The flows a band has a target for, with the submitted value. */
const targeted = (c: FlowCounts, b: Band) =>
  [...flowEntries(c), ['submitted value', c.submittedValue] as [string, number]].filter(([n]) => !b.open.has(n));

/** A draft the way the counts see it, without building its stage log. */
const countable = (d: Draft): Countable => ({
  gates: ([['DG1', d.dg1], ['DG2', d.dg2], ['DG3', d.dg3]] as const).flatMap(([gate, g]) => (g ? [{ gate, decision: g.decision, at: g.at, onTime: g.onTime }] : [])),
  submission: d.submission, result: d.result, value: d.value,
});

const countBand = (lcs: Countable[], b: Band) => {
  const c = emptyFlows();
  for (const l of lcs) addFlows(c, l, b.from, b.to);
  return c;
};

/* ------------------------------------------------------------ the solver */

type Kind = 'A' | 'H' | 'B' | 'C' | 'BW' | 'D' | 'AW' | 'EC' | 'E';

/**
 * Chain kinds, by their last counted event (0 DG1, 1 DG2, 2 DG3, 3 submission, 4 result):
 * A discard · H hold · B pursue, withdrawn in Stage 2 · C no-bid · BW bid, withdrawn in Stage 4 ·
 * D rejected at DG3 · AW approved, cancelled before submission · EC submitted, cancelled · E result.
 */
const TOP: Record<Kind, number> = { A: 0, H: 0, B: 0, C: 1, BW: 1, D: 2, AW: 2, EC: 3, E: 4 };

interface Plan { kind: Kind; entry: number; result?: 'won' | 'lost'; discard?: string }

const DISCARD_REASONS: [string, number][] = [['out-of-scope', 11], ['below-value', 6], ['pq-fail', 5], ['insufficient-time', 4], ['capacity', 3]];

/**
 * Chain plans that fill a residual exactly. Each chain takes its own last event
 * and, going backwards, the events before it while the band still needs them
 * (DG1 pursue, DG2 bid, DG3 approved, submitted). `entry` is its first event
 * inside the band; the ones before it fall before the band.
 */
function solve(res: FlowCounts, r: Rng): Plan[] {
  const left = [res.dg1.pursue, res.dg2.bid, res.dg3.approved, res.submitted];
  const plans: Plan[] = [];
  const add = (kind: Kind, n: number, extra: () => Partial<Plan> = () => ({})) => {
    for (let i = 0; i < n; i++) {
      let entry = TOP[kind];
      while (entry > 0 && left[entry - 1] > 0) { left[entry - 1]--; entry--; }
      plans.push({ kind, entry, ...extra() });
    }
  };
  /** The chains that end at event `i` take what is left of it. */
  const rest = (i: number) => { const n = left[i]; left[i] = 0; return n; };
  add('E', res.won, () => ({ result: 'won' }));
  add('E', res.lost, () => ({ result: 'lost' }));
  add('EC', rest(3));
  add('D', res.dg3.rejected);
  add('AW', rest(2));
  add('C', res.dg2['no-bid']);
  add('BW', rest(1));
  add('B', rest(0));
  add('H', res.dg1.hold);
  add('A', res.dg1.discard, () => ({ discard: r.weighted(DISCARD_REASONS) }));
  return plans;
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

interface Ctx { tenant: GccTenantKey; cc: CountryCode; pool: TenantPool; seed: TenantSeed; titles: Set<string> }

function workFor(ctx: Ctx, r: Rng, plan: Plan): { title: string; sector: string; amount: number; city: string } {
  const sectors = Object.keys(ctx.pool.sectors);
  for (let tries = 0; tries < 80; tries++) {
    const city = r.pick(ctx.pool.cities);
    const q = tries >= 40 ? `, ${r.pick(QUALIFIERS)}` : '';
    if (plan.discard === 'out-of-scope') {
      const title = `${city} ${r.pick(OUT_OF_SCOPE_WORKS)}${q}`;
      if (ctx.titles.has(title)) continue;
      const lo = ctx.pool.sectors[sectors[0]].value[0];
      return { title, sector: 'Other', amount: Math.round(r.range(lo * 0.05, lo * 0.4) / 1e5) * 1e5, city };
    }
    const sector = r.weighted(sectors.map((s, i) => [s, i === 0 ? 3 : 2] as const));
    const sp = ctx.pool.sectors[sector];
    const title = `${city} ${r.pick(sp.works)}${q}`;
    if (ctx.titles.has(title)) continue;
    const [lo, hi] = sp.value;
    const amount = plan.discard === 'below-value' ? r.range(lo * 0.15, lo * 0.7) : r.range(lo, hi);
    return { title, sector, amount: Math.round(amount / 1e5) * 1e5, city };
  }
  throw new Error(`Generator ${ctx.tenant}: ran out of fictional titles`);
}

const dayOf = (iso: string) => iso.slice(0, 10);

/** Days from DG1 to each counted event, and how long the tender stays open after its last one. */
function gaps(r: Rng) {
  const t = [0, r.int(14, 26)];
  t.push(t[1] + r.int(22, 44));
  t.push(t[2] + r.int(2, 5));
  t.push(t[3] + r.int(45, 110));
  return t;
}
const TAIL: Record<Kind, number> = { A: 0, H: 14, B: 20, C: 0, BW: 25, D: 0, AW: 3, EC: 60, E: 26 };

/** One chain in the band at `frac` of the room it has, or null when it does not fit. */
function layout(ctx: Ctx, r: Rng, plan: Plan, band: Band, fillTo: string, frac: number): Draft | null {
  const { cc, tenant } = ctx;
  const start = dayOf(band.from);
  const t = gaps(r);
  const top = TOP[plan.kind];
  let hi = dayDiff(start, fillTo) - (t[top] - t[plan.entry]) - TAIL[plan.kind];
  if (plan.entry > 0) hi = Math.min(hi, t[plan.entry] - t[plan.entry - 1] - 1);
  if (hi < 0) return null;
  const dg1Day = snapBack(addDays(addDays(start, Math.round(frac * hi)), -t[plan.entry]), cc);

  const hot = `${tenant}.hot`;
  const at = (day: string, fromH = 10, toH = 16) => `${day}T${timeIn(r, fromH, toH)}`;
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
  /** The day of each counted event, in order. */
  const days = [dg1Day];

  if (plan.kind === 'A') d.close = { at: dg1.at, as: 'discarded', note: discardNote(plan.discard) };
  else if (plan.kind === 'H') {
    d.close = { at: at(snapFwd(addDays(dg1Day, r.int(7, 14)), cc)), as: 'withdrawn', note: 'Held at DG1; the information did not arrive before the deadline, so the tender was not resumed' };
  } else if (plan.kind === 'B') {
    const w = snapFwd(addDays(dg1Day, r.int(8, 20)), cc);
    d.close = { at: at(w), as: 'withdrawn', note: r.pick(WITHDRAWN), stage: 2, step: dayDiff(dg1Day, w) < 12 ? 'quotes-in' : 'levelling' };
  } else {
    const dg2Day = snapFwd(addDays(dg1Day, t[1]), cc);
    days.push(dg2Day);
    const noBid = plan.kind === 'C' ? r.pick(NO_BID) : null;
    d.dg2 = noBid
      ? { at: at(dg2Day), decision: 'no-bid', byId: hot, onTime: true, reasonCodes: [noBid[0]], note: noBid[1] }
      : { at: at(dg2Day), decision: 'bid', byId: hot, onTime: true };
    d.packIssued = openedBefore(r, d.dg2.at, 24, true, cc);
    if (noBid) d.close = { at: d.dg2.at, as: 'no-bid', note: noBid[1] };
    else if (plan.kind === 'BW') {
      d.close = { at: at(snapFwd(addDays(dg2Day, r.int(10, 25)), cc)), as: 'withdrawn', note: r.pick(WITHDRAWN), stage: 4, step: 'resource-loading' };
    } else {
      const dg3Day = snapFwd(addDays(dg1Day, t[2]), cc);
      days.push(dg3Day);
      d.dg3 = plan.kind === 'D'
        ? { at: at(dg3Day), decision: 'rejected', byId: hot, onTime: true, reasonCodes: ['margin-below-minimum'], note: 'The final price is below the DG2 minimum margin: do not submit' }
        : { at: at(dg3Day), decision: 'approved', byId: hot, onTime: true };
      d.dg3Issued = openedBefore(r, d.dg3.at, 48, true, cc);
      d.events = workEvents(r, cc, d.dg2.at, d.dg3Issued);
      if (plan.kind === 'D') d.close = { at: d.dg3.at, as: 'rejected', note: 'Rejected at DG3: margin below the DG2 minimum' };
      else if (plan.kind === 'AW') {
        d.close = { at: at(addWorkingDays(dg3Day, r.int(1, 2), cc)), as: 'withdrawn', note: 'The employer cancelled the tender before the deadline', stage: 8, step: 'assembling' };
      } else {
        const subDay = addWorkingDays(dg3Day, t[3] - t[2], cc);
        days.push(subDay);
        const deadline = `${subDay}T${DEADLINE_TIME[tenant]}`;
        d.submission = { at: plusMin(deadline, -r.int(20, 95)), deadline, onTime: true, portal: '' };
        if (plan.kind === 'EC') {
          const c = at(snapFwd(addDays(subDay, r.int(20, 60)), cc));
          d.result = { at: c, result: 'cancelled' };
          d.close = { at: c, as: 'withdrawn', note: 'The employer cancelled the tender after opening' };
        } else {
          const resDay = snapFwd(addDays(dg1Day, t[4]), cc);
          days.push(resDay);
          const won = plan.result === 'won';
          const result: Result = {
            at: at(resDay, 10, 13), result: plan.result!, predictedWin: won ? r.int(38, 76) : r.int(10, 62),
            ...(won ? { value: { amount, ccy: ctx.pool.ccy } } : { lossReason: r.weighted([['price', 13], ['technical', 5], ['local-content', 3], ['pq', 1], ['other', 2]] as const) }),
          };
          d.result = result;
          const ev = resultEvents(r, cc, result.at, won);
          d.events = [...d.events, ...ev];
          d.close = { at: resultClose(r, cc, result.at, ev), as: won ? 'won' : 'lost' };
        }
      }
    }
  }
  // Counted events before the entry fall before the band, the rest inside it; the tender closes by `fillTo`.
  for (let i = 0; i < days.length; i++) {
    if (i < plan.entry ? days[i] >= start : days[i] < start || days[i] > dayOf(band.to)) return null;
  }
  if (d.close!.at > fillTo) return null;
  return d;
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
  const notes: string[] = [];
  const bands = bandsOf(input.targets);
  const open = bands[bands.length - 1];
  const folded = () => drafts.map(countable);

  // Inner bands must be met by the records alone.
  for (const b of bands.slice(0, -1)) {
    const off = targeted(subFlows(b.flows, countBand([...fixed, ...folded()], b)), b).filter(([, v]) => v !== 0);
    if (off.length) {
      throw new Error(`Generator ${tenant}: band ${b.key} (${b.from} to ${b.to}) is off by ${off.map(([n, v]) => `${n} ${v > 0 ? '+' : ''}${v}`).join(', ')}. Its records are hand-authored: fix them.`);
    }
  }

  // Overshoots in the open band: move folded records' derived moments before it.
  const start = dayOf(open.from);
  for (let guard = 0; guard < 100; guard++) {
    const res = subFlows(open.flows, countBand([...fixed, ...folded()], open));
    const inOpen = (d: Draft, g: 'DG1' | 'DG2') => inBand(gateOf(d, g)?.at, open);
    let moved: Draft | undefined;
    if (res.dg2.bid < 0) moved = drafts.find((d) => inOpen(d, 'DG2') && demoteDg2(d, start, r));
    else if (res.dg1.pursue < 0) moved = drafts.find((d) => inOpen(d, 'DG1') && demoteDg1(d, start, r));
    if (!moved) break;
    notes.push(`${moved.from}: ${res.dg2.bid < 0 ? 'DG2' : 'DG1'} moved before ${start}`);
  }
  const res = subFlows(open.flows, countBand([...fixed, ...folded()], open));
  const over = targeted(res, open).filter(([n, v]) => v < 0 && !n.endsWith('late'));
  if (over.length) throw new Error(`Generator ${tenant}: the records overshoot the ${open.key} band by ${over.map(([n, v]) => `${n} ${-v}`).join(', ')}`);

  // Fill the rest, spreading each kind of chain evenly over the band.
  const ctx: Ctx = { tenant, cc: ccOf(tenant), pool: POOLS[tenant], seed, titles: new Set([...fixed, ...drafts].map((l) => l.title)) };
  const fillTo = open.to < FILL_TO ? open.to : FILL_TO;
  const groups = new Map<string, Plan[]>();
  for (const p of solve(res, r)) groups.set(`${p.kind}:${p.entry}`, [...(groups.get(`${p.kind}:${p.entry}`) ?? []), p]);
  const made: Draft[] = [];
  for (const key of [...groups.keys()].sort()) {
    const group = groups.get(key)!;
    for (let i = group.length - 1; i > 0; i--) { const j = r.int(0, i); [group[i], group[j]] = [group[j], group[i]]; }
    group.forEach((plan, i) => {
      for (let tries = 0; tries < 80; tries++) {
        const frac = Math.min(1, Math.max(0, (i + 0.5) / group.length + (tries ? r.range(-0.2, 0.2) : 0)));
        const d = layout(ctx, r, plan, open, fillTo, frac);
        if (d) { made.push(d); ctx.titles.add(d.title); return; }
      }
      throw new Error(`Generator ${tenant}: no room for a ${plan.kind} chain entering at event ${plan.entry} in the ${open.key} band`);
    });
  }
  if (input.submissionsFixed && made.some((d) => d.submission)) throw new Error(`Generator ${tenant}: generated a submission, but every one is a record`);
  const value = targeted(subFlows(open.flows, countBand([...fixed, ...drafts.map(countable), ...made.map(countable)], open)), open).find(([n]) => n === 'submitted value');
  if (value && value[1] !== 0) throw new Error(`Generator ${tenant}: submitted value in the ${open.key} band is off by ${value[1]}`);

  // Late decisions: generated gates first, then folded derived ones. Without a target, about 4% of the generated ones.
  for (const [g, want] of [['DG1', res.dg1.late], ['DG2', res.dg2.late], ['DG3', res.dg3.late]] as const) {
    const onTime = (d: Draft) => d.derived.includes(g) && !!gateOf(d, g)?.onTime && inBand(gateOf(d, g)!.at, open);
    const mine = made.filter(onTime);
    const n = open.open.has(`${g} late`) ? Math.round(made.filter((d) => gateOf(d, g)).length * 0.04) : want;
    const pool = mine.length >= n ? mine : [...mine, ...drafts.filter(onTime)];
    if (pool.length < n) throw new Error(`Generator ${tenant}: only ${pool.length} ${g} decisions to mark late, ${n} needed`);
    for (let k = 0; k < n; k++) {
      const d = pool[Math.floor(((k + 0.5) * pool.length) / n)];
      markLate(d, g, r);
      if (d.origin !== 'generated') notes.push(`${d.from}: ${g} marked late`);
    }
  }

  // DG2 approvals against the majority (Najd), on bids of the open band.
  if (input.againstMajority12m !== undefined) {
    const twelve = { from: WINDOW_FROM['12m'], to: NOW };
    const has = fixed.reduce((s, l) => s + l.gates.filter((g) => g.gate === 'DG2' && g.againstMajority && inBand(g.at, twelve)).length, 0)
      + drafts.filter((d) => d.dg2?.againstMajority && inBand(d.dg2.at, twelve)).length;
    let want = input.againstMajority12m - has;
    const bids = [...made, ...drafts].filter((d) => d.derived.includes('DG2') && d.dg2?.decision === 'bid' && !d.dg2.againstMajority && inBand(d.dg2.at, open));
    for (const d of bids) {
      if (want <= 0) break;
      d.dg2 = { ...d.dg2!, againstMajority: true, note: 'Approved against the majority of positions; the Head of Tendering recorded why' };
      notes.push(`${d.from}: DG2 approved against the majority`);
      want--;
    }
    if (want < 0 || want > 0) throw new Error(`Generator ${tenant}: DG2 against the majority is off by ${want}`);
  }

  const all = [...drafts, ...made];
  balanceEvents(all, r);
  allocateIds(seed, fixed, all);
  return { lifecycles: all.map((d) => buildChain(finalSpec(d, seed))), generated: made.length, notes };
}
