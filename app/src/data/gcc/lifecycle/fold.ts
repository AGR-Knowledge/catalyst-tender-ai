import type { CountryCode } from '@/data/tenants';
import type { BidOutcome, Dg1Record, Dg2History, TenantSeed } from '../types';
import type { GccTenantKey } from '../index';
import { addDays, addWorkingDays, cmp, dayDiff, hoursBetween, plusHours, plusMin, snapBack, snapFwd, type ChainSpec, type GateSpec } from './chain';
import { POOLS, type TenantPool } from './pools';
import { rngOf, type Rng } from './rng';
import type { WorkEvent } from './types';

/**
 * Plan 017 §3.4: every plan 004 history record (DG1, DG2 and outcome) that
 * no hand-authored lifecycle carries becomes a chain draft here. A record
 * keeps its own facts (decision, time, on time, reasons, values, result);
 * the moments the record does not state (capture, M1, pack issue, the other
 * gates) are placed deterministically from a seed made of the record's key.
 * The generator then gives drafts without a tender id their id.
 */

/** A chain spec on its way to a lifecycle: the id and source come last, and `derived` lists the gates the generator may still move or mark late. */
export interface Draft extends Omit<ChainSpec, 'id' | 'source'> {
  id: string | null;
  sourceId: string;
  derived: ('DG1' | 'DG2' | 'DG3')[];
  /** Where the draft came from, for the dev check and the report. */
  from: string;
}

/** The submission deadline's time of day, per tenant (the time most of its portals use). */
export const DEADLINE_TIME: Record<GccTenantKey, string> = { najd: '10:00', corniche: '14:00', dafna: '12:00', batinah: '12:00', qurain: '13:00' };

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** A time of day inside working hours. */
export const timeIn = (r: Rng, fromH: number, toH: number) => hhmm(r.int(fromH, toH - 1), r.int(0, 11) * 5);

const hourOf = (iso: string) => Number(iso.slice(11, 13)) + Number(iso.slice(14, 16)) / 60;
const atHour = (day: string, h: number) => `${day}T${hhmm(Math.floor(h), Math.floor((h % 1) * 12) * 5)}`;

/**
 * When a gate opened, given its decision time: within its SLA when on time,
 * past it when late. With a calendar, it opens on a working day between 08:00
 * and 17:00: the same morning, or an afternoon of the working day before.
 */
export function openedBefore(r: Rng, decision: string, slaH: number, onTime: boolean, cc?: CountryCode): string {
  const day = decision.slice(0, 10);
  const h = hourOf(decision);
  if (!onTime) {
    const at = plusHours(decision, -(slaH + r.range(2, 16)));
    if (!cc) return at;
    // Only ever earlier, so it stays late.
    const d = snapBack(hourOf(at) < 8 ? addDays(at.slice(0, 10), -1) : at.slice(0, 10), cc);
    return d === at.slice(0, 10) && hourOf(at) < 17 ? at : atHour(d, r.range(13, 16.9));
  }
  const sameMorning = () => plusMin(decision, -Math.round(r.range(0.5, Math.max(0.6, h - 8)) * 60));
  if (h >= 10.5 && r.chance(0.6)) return sameMorning();
  const prev = cc ? snapBack(addDays(day, -1), cc) : addDays(day, -1);
  const gap = dayDiff(prev, day) * 24;
  // Opened at `o` on `prev`: gap + h − o hours before the decision, at most the SLA less an hour.
  const lo = Math.max(12, gap + h - slaH + 1);
  return lo <= 16.9 ? atHour(prev, r.range(lo, 16.9)) : sameMorning();
}

/** Captured on a working morning 1–3 working days before M1, never after it, and never in a year after the tender id's. */
export function capturedBefore(r: Rng, m1: string, cc: CountryCode, idYear?: string): string {
  let day = addWorkingDays(m1.slice(0, 10), -r.int(1, 3), cc);
  if (idYear && day.slice(0, 4) > idYear) day = snapBack(`${idYear}-12-31`, cc);
  return `${day}T${timeIn(r, 8, 11)}`;
}

export function pickSource(r: Rng, pool: TenantPool): string {
  return r.weighted(pool.sourceMix);
}

/** A city named in the title, else one from the pool. */
export function cityFrom(title: string, pool: TenantPool, r: Rng): string {
  const named = pool.cities.filter((c) => title.includes(c)).sort((a, b) => b.length - a.length)[0];
  return named ?? r.pick(pool.cities);
}

const ISSUER_HINTS: [RegExp, RegExp][] = [
  [/road|bypass|interchange|expressway|access|bridge|wadi|earthwork|embankment|lighting/i, /Road|Links|Works|Municipal|Port|Programme/],
  [/cooling|chilled/i, /Cooling/],
  [/hospital|clinic|health/i, /Health/],
  [/hotel|fit-out|refurb|tower|mall|villa|residential|office/i, /Hospitality|Properties|Developments|Real Estate/],
  [/school|university|campus|education/i, /Campus|Education/],
  [/oil|gas|refinery|injection|tank farm|gathering|produced water/i, /Upstream|Facilities/],
  [/drain|storm|sewer|sewage|STP|wastewater|outfall|pump/i, /Drainage|Sanitation|Water|Utilities/],
  [/water|reservoir|desal|pipeline|transmission|effluent|network|main/i, /Water|Utilities|Grid/],
];

/** A fictional issuer from the pool whose name fits the work. */
export function issuerFor(title: string, pool: TenantPool, r: Rng): string {
  for (const [work, issuer] of ISSUER_HINTS) {
    if (!work.test(title)) continue;
    const fits = pool.issuers.filter((i) => issuer.test(i));
    if (fits.length) return r.pick(fits);
  }
  return r.pick(pool.issuers);
}

/** The kind of employer an invented issuer is: developers and hotel groups are private, utility and holding companies semi-government. */
export function clientTypeOf(issuer: string): NonNullable<ChainSpec['clientType']> {
  if (/Properties|Developments|Real Estate|Hospitality/.test(issuer)) return 'private';
  if (/Company|Holding/.test(issuer)) return 'semi-government';
  return 'government';
}

const spanDay = (cc: CountryCode, dg2: string, dg3Open: string) => {
  const span = hoursBetween(dg2, dg3Open) / 24;
  return (f: number) => snapFwd(addDays(dg2.slice(0, 10), Math.max(1, Math.round(span * f))), cc);
};

/** A re-plan (early in Stage 4) or a re-price (mid Stage 5) between DG2 and the DG3 pack. */
export function changeEvent(r: Rng, cc: CountryCode, kind: 'replan' | 'reprice', dg2: string, dg3Open: string): WorkEvent {
  const dayAt = spanDay(cc, dg2, dg3Open);
  return kind === 'replan'
    ? { kind, at: `${dayAt(r.range(0.1, 0.35))}T${timeIn(r, 9, 15)}`, turnaroundH: Math.round(r.range(1, 6) * 2) / 2, trigger: r.pick(REPLAN_TRIGGERS) }
    : { kind, at: `${dayAt(r.range(0.4, 0.65))}T${timeIn(r, 9, 15)}`, turnaroundH: Math.round(r.range(0.5, 4) * 2) / 2, trigger: r.pick(REPRICE_TRIGGERS) };
}

const eventTime = (e: WorkEvent) => e.at ?? ('due' in e ? e.due : '');
export const byEventTime = (a: WorkEvent, b: WorkEvent) => cmp(eventTime(a), eventTime(b));

/** Work events for a bid that went through Stages 4–6 (plan 017 §3.3.1). The generator evens the shares out afterwards. */
export function workEvents(r: Rng, cc: CountryCode, dg2: string, dg3Open: string): WorkEvent[] {
  const dayAt = spanDay(cc, dg2, dg3Open);
  const ev: WorkEvent[] = [];
  if (r.chance(0.4)) ev.push(changeEvent(r, cc, 'replan', dg2, dg3Open));
  const m2Due = dayAt(0.3);
  ev.push({ kind: 'm2', due: m2Due, at: r.chance(0.85) ? `${m2Due}T${timeIn(r, 9, 16)}` : `${snapFwd(addDays(m2Due, r.int(1, 3)), cc)}T${timeIn(r, 9, 16)}` });
  if (r.chance(0.5)) ev.push(changeEvent(r, cc, 'reprice', dg2, dg3Open));
  const reviewDue = dayAt(0.75);
  ev.push({ kind: 'review', due: reviewDue, at: r.chance(0.9) ? `${reviewDue}T${timeIn(r, 9, 12)}` : `${snapFwd(addDays(reviewDue, r.int(1, 2)), cc)}T${timeIn(r, 9, 12)}` });
  return ev.sort(byEventTime);
}

const REPLAN_TRIGGERS = ['Quote lead time', 'Addendum to the programme', 'Site visit findings', 'Revised completion date', 'Long-lead equipment dates'];
const REPRICE_TRIGGERS = ['Addendum 1', 'Addendum 2', 'Supplier re-quote', 'Steel price update', 'Clarification response'];

/** Lessons within 14 days for most results; a handover within 10 days for every win. */
export function resultEvents(r: Rng, cc: CountryCode, resultAt: string, won: boolean): WorkEvent[] {
  const ev: WorkEvent[] = [];
  if (won) ev.push({ kind: 'handover', at: `${addWorkingDays(resultAt.slice(0, 10), r.int(2, 5), cc)}T${timeIn(r, 9, 12)}` });
  const p = r.next();
  if (p < 0.85) ev.push({ kind: 'lessons', at: `${addWorkingDays(resultAt.slice(0, 10), r.int(won ? 6 : 3, 8), cc)}T${timeIn(r, 10, 16)}` });
  else if (p < 0.95) ev.push({ kind: 'lessons', at: `${snapFwd(addDays(resultAt.slice(0, 10), r.int(16, 25)), cc)}T${timeIn(r, 10, 16)}` });
  return ev;
}

/** When a closed result's lifecycle ends: at its lessons, or a week or two after the result (after any handover). */
export function resultClose(r: Rng, cc: CountryCode, resultAt: string, events: WorkEvent[]): string {
  const lessons = events.find((e) => e.kind === 'lessons')?.at;
  if (lessons) return lessons;
  const handover = events.find((e) => e.kind === 'handover')?.at;
  const d = snapFwd(addDays((handover ?? resultAt).slice(0, 10), r.int(5, 12)), cc);
  return `${d}T${timeIn(r, 10, 16)}`;
}

const DISCARD_NOTES: Record<string, string> = {
  'out-of-scope': 'Discarded at DG1: out of scope',
  'below-value': 'Discarded at DG1: below the value band',
  'pq-fail': 'Discarded at DG1: a prequalification line fails',
  'insufficient-time': 'Discarded at DG1: not enough time to prepare a compliant bid',
  capacity: 'Discarded at DG1: no team capacity before the deadline',
};
export const discardNote = (code: string | undefined) => (code && DISCARD_NOTES[code]) || 'Discarded at DG1';

export interface FoldInput {
  tenant: GccTenantKey;
  cc: CountryCode;
  seed: TenantSeed;
  /** Tender ids that hand-authored lifecycles carry: their records are not folded again. */
  fixedIds: Set<string>;
  /** Outcome ids that hand-authored lifecycles carry. */
  claimed: Set<string>;
}

const base = (fi: FoldInput, r: Rng, title: string, sector: string, amount: number, from: string): Omit<Draft, 'captured'> => {
  const pool = POOLS[fi.tenant];
  const sectorPool = pool.sectors[sector];
  const issuer = issuerFor(title, pool, r);
  return {
    tenant: fi.tenant, cc: fi.cc, id: null, title, shortTitle: title, issuer, clientType: clientTypeOf(issuer), city: cityFrom(title, pool, r),
    country: pool.country, sector, value: { amount, ccy: pool.ccy, basis: 'estimate' },
    teamId: sectorPool?.teamId ?? fi.seed.teams[0].id, bidManagerId: `${fi.tenant}.bid`, sourceId: pickSource(r, pool),
    origin: 'history', derived: [], from,
  };
};

function outcomeDraft(fi: FoldInput, o: BidOutcome, link: Dg2History | undefined): Draft {
  const r = rngOf(`${fi.tenant}:outcome:${o.id}`);
  const { cc } = fi;
  const hot = `${fi.tenant}.hot`;
  const deadline = `${o.submitted}T${DEADLINE_TIME[fi.tenant]}`;
  const subAt = plusMin(deadline, -r.int(20, 95));
  const dg3Day = addWorkingDays(o.submitted, -2, cc);
  const dg3: GateSpec = { at: `${dg3Day}T${timeIn(r, 10, 15)}`, decision: 'approved', byId: hot, onTime: true };
  const dg3Issued = openedBefore(r, dg3.at, 48, true, cc);
  const dg2: GateSpec = link
    ? { at: link.at, decision: 'bid', byId: hot, onTime: link.withinSla, ...(link.againstMajority ? { againstMajority: true } : {}), ...(link.reopened ? { reopened: link.reopened } : {}) }
    : { at: `${snapBack(addDays(dg3Day, -r.int(24, 40)), cc)}T${timeIn(r, 10, 15)}`, decision: 'bid', byId: hot, onTime: true };
  if (dg2.at >= plusHours(dg3Issued, -72)) throw new Error(`Fold ${fi.tenant} ${o.id}: DG2 ${dg2.at} is not before the DG3 pack ${dg3Issued}`);
  const packIssued = openedBefore(r, dg2.at, 24, dg2.onTime, cc);
  const dg1: GateSpec = { at: `${snapBack(addDays(dg2.at.slice(0, 10), -r.int(14, 26)), cc)}T${timeIn(r, 9, 15)}`, decision: 'pursue', byId: `${fi.tenant}.bid`, onTime: true, recommendation: 'pursue' };
  const m1 = openedBefore(r, dg1.at, 24, true, cc);
  const idYear = link?.tenderId.slice(2, 6);
  const won = o.result === 'won';
  const resultAt = `${o.decided}T${timeIn(r, 10, 13)}`;
  const events = [...workEvents(r, cc, dg2.at, dg3Issued), ...(o.result === 'withdrawn' ? [] : resultEvents(r, cc, resultAt, won))];
  return {
    ...base(fi, r, o.title, o.sector, o.value.amount, `outcome ${o.id}${link ? ` + DG2 ${link.tenderId}` : ''}`),
    id: link?.tenderId ?? null, clientType: o.clientType,
    captured: capturedBefore(r, m1, cc, idYear), m1, dg1, packIssued, dg2, dg3Issued, dg3,
    submission: { at: subAt, deadline, onTime: true, portal: '' },
    result: {
      at: resultAt, result: o.result, ...(o.lossReason ? { lossReason: o.lossReason } : {}),
      ...(o.predictedWin !== undefined ? { predictedWin: o.predictedWin } : {}), ...(won ? { value: o.value } : {}),
    },
    events,
    close: { at: o.result === 'withdrawn' ? resultAt : resultClose(r, cc, resultAt, events), as: o.result === 'won' ? 'won' : o.result === 'lost' ? 'lost' : 'withdrawn' },
    derived: link ? ['DG1', 'DG3'] : ['DG1', 'DG2', 'DG3'],
  };
}

function dg2Draft(fi: FoldInput, d: Dg2History): Draft {
  const r = rngOf(`${fi.tenant}:dg2:${d.tenderId}`);
  const { cc } = fi;
  const pool = POOLS[fi.tenant];
  const sector = Object.keys(pool.sectors)[0];
  const [lo, hi] = pool.sectors[sector].value;
  const amount = Math.round(r.range(lo, hi) / 1e5) * 1e5;
  const dg2: GateSpec = {
    at: d.at, decision: d.decision, byId: `${fi.tenant}.hot`, onTime: d.withinSla,
    ...(d.againstMajority ? { againstMajority: true } : {}), ...(d.reopened ? { reopened: d.reopened } : {}),
    reasonCodes: d.decision === 'no-bid' ? [r.pick(['capacity', 'contract-risk', 'price-competition'])] : [],
  };
  const packIssued = openedBefore(r, d.at, 24, d.withinSla, cc);
  const dg1: GateSpec = { at: `${snapBack(addDays(d.at.slice(0, 10), -r.int(14, 26)), cc)}T${timeIn(r, 9, 15)}`, decision: 'pursue', byId: `${fi.tenant}.bid`, onTime: true, recommendation: 'pursue' };
  const m1 = openedBefore(r, dg1.at, 24, true, cc);
  const closeAt = d.decision === 'no-bid' ? d.at : `${snapFwd(addDays(d.at.slice(0, 10), r.int(12, 24)), cc)}T${timeIn(r, 10, 15)}`;
  return {
    ...base(fi, r, d.title, sector, amount, `DG2 ${d.tenderId}`), id: d.tenderId,
    captured: capturedBefore(r, m1, cc, d.tenderId.slice(2, 6)), m1, dg1, packIssued, dg2,
    close: d.decision === 'no-bid'
      ? { at: closeAt, as: 'no-bid', note: d.reopened ? `No-Bid at DG2; re-opened later (${d.reopened})` : 'No-Bid at DG2' }
      : { at: closeAt, as: 'withdrawn', note: 'The employer cancelled the tender before submission', stage: 4, step: 'resource-loading' },
    derived: ['DG1'],
  };
}

function dg1Draft(fi: FoldInput, d: Dg1Record): Draft {
  const r = rngOf(`${fi.tenant}:dg1:${d.tenderId}`);
  const { cc } = fi;
  const pool = POOLS[fi.tenant];
  const sectors = Object.keys(pool.sectors);
  const sector = sectors[r.int(0, sectors.length - 1)];
  const [lo, hi] = pool.sectors[sector].value;
  const amount = Math.round(r.range(lo * 0.4, hi) / 1e5) * 1e5;
  const dg1: GateSpec = {
    at: d.at, decision: d.decision, byId: d.byId, onTime: d.withinSla, reasonCodes: d.reasonCodes, recommendation: d.recommendation, ...(d.note ? { note: d.note } : {}),
  };
  const m1 = openedBefore(r, d.at, 24, d.withinSla, cc);
  const common = { ...base(fi, r, d.title ?? d.tenderId, sector, amount, `DG1 ${d.tenderId}`), id: d.tenderId, captured: capturedBefore(r, m1, cc, d.tenderId.slice(2, 6)), m1, dg1 };
  if (d.decision === 'discard') return { ...common, close: { at: d.at, as: 'discarded', note: discardNote(d.reasonCodes[0]) } };
  if (d.decision === 'hold') {
    const at = `${snapFwd(addDays(d.at.slice(0, 10), r.int(7, 14)), cc)}T${timeIn(r, 10, 16)}`;
    return { ...common, close: { at, as: 'withdrawn', note: 'Held at DG1; the information did not arrive before the deadline, so the tender was not resumed' } };
  }
  const at = `${snapFwd(addDays(d.at.slice(0, 10), r.int(10, 18)), cc)}T${timeIn(r, 10, 16)}`;
  return { ...common, close: { at, as: 'withdrawn', note: 'Withdrawn in sourcing: no compliant quotes for the main packages', stage: 2, step: 'levelling' } };
}

/** The drafts for every plan 004 record not already carried by a hand-authored lifecycle. */
export function foldHistory(fi: FoldInput): Draft[] {
  const h = fi.seed.historySeed;
  const dg2Open = h.dg2.filter((d) => !fi.fixedIds.has(d.tenderId));
  const byTitle = new Map(dg2Open.filter((d) => d.decision === 'bid').map((d) => [d.title, d]));
  const linked = new Set<string>();
  const drafts: Draft[] = [];
  for (const o of h.outcomes) {
    if (fi.claimed.has(o.id)) continue;
    const link = byTitle.get(o.title);
    if (link) linked.add(link.tenderId);
    drafts.push(outcomeDraft(fi, o, link));
  }
  for (const d of dg2Open) if (!linked.has(d.tenderId)) drafts.push(dg2Draft(fi, d));
  for (const d of h.dg1) if (!fi.fixedIds.has(d.tenderId)) drafts.push(dg1Draft(fi, d));
  return drafts;
}
