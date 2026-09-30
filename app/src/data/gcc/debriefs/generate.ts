import type { GccTenantKey } from '@/data/gcc';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { NOW, addWorkingDays, dayDiff, plusMin, toMin } from '@/data/gcc/lifecycle/chain';
import { timeIn } from '@/data/gcc/lifecycle/fold';
import { ccOf } from '@/data/gcc/lifecycle/live/common';
import { rngOf, type Rng } from '@/data/gcc/lifecycle/rng';
import { dueByOf, endingAt, hasLessons, type EndingAt } from '@/domain/gcc/debriefs/endings';
import type { DebriefInput, DebriefRecord, Lesson } from '@/domain/gcc/debriefs/types';
import { FEATURED, type Featured } from './featured';
import { RIVALS, type Rival } from './rivals';
import { stopOf } from './stops';
import { EMPLOYER_SHORT, LESSONS, SAID, WOULD_LET_US_BID, type LessonTemplate } from './templates';
import { RIVAL_OTHER, RIVAL_UNKNOWN, type BidAgain, type Ending, type EmployerDebriefState, type StoppedEarlier } from './vocab';

/**
 * The seed's debriefs (plan 035 Phase 2): one record per ended bid, built
 * once per tenant from the seed lifecycles, with no demo state. Each draws on
 * its own stream, `rngOf('debrief:{TID}')`, never the lifecycle generator's,
 * so no lifecycle, id or date moves.
 *
 * Status, by construction:
 * - won and lost: accepted exactly when the lifecycle has lessons by demo day
 *   (`hasLessons`), at that event's time, by the Head of Tendering, submitted
 *   one working day earlier by the Project Director. Without lessons, nothing
 *   is submitted: the debrief is due or overdue;
 * - stopped endings: 85% of each tenant's (the plan's "about 80%") submitted 3–8 working days after
 *   the ending and accepted 1–2 working days later. Which ones is ranked by
 *   the first draw of each tender's own stream, so the share is exact in
 *   every tenant however small. A time after the demo clock is dropped, so
 *   those read submitted, due or overdue;
 * - featured records (`featured.ts`) set their own.
 * No time is after `NOW` (Sun 8 Mar 2026, 10:00).
 */

/* --------------------------------------------------------------- weights */

type W<T> = readonly (readonly [T, number])[];

const WIN_MAIN: W<string> = [['price', 35], ['technical', 20], ['track-record', 15], ['local-content', 10], ['programme', 8], ['alternative', 6], ['partner', 6]];

/** "What else decided it", weighted by the main reason (ending:main, then ending:*). */
const FACTOR_WEIGHTS: Record<string, W<string>> = {
  'lost:price': [['price-level', 5], ['quotes', 3], ['terms', 2]],
  'lost:technical': [['technical', 5], ['bid-quality', 3], ['clarifications', 2]],
  'lost:local-content': [['local-content', 5], ['quotes', 3], ['partner', 2]],
  'lost:pq': [['credentials', 5], ['partner', 3]],
  'lost:*': [['compliance', 3], ['bid-quality', 3], ['clarifications', 2], ['relationship', 2]],
  'won:price': [['price-level', 5], ['relationship', 2], ['programme', 2]],
  'won:technical': [['technical', 5], ['relationship', 2], ['programme', 2]],
  'won:track-record': [['credentials', 5], ['relationship', 3], ['programme', 1]],
  'won:local-content': [['local-content', 5], ['relationship', 2], ['programme', 2]],
  'won:programme': [['programme', 5], ['relationship', 2], ['technical', 2]],
  'won:alternative': [['technical', 5], ['programme', 2], ['relationship', 2]],
  'won:partner': [['partner', 5], ['relationship', 2], ['programme', 2]],
  'won:*': [['bid-quality', 4], ['relationship', 2], ['programme', 2]],
  'cancelled:over-budget': [['price-level', 4], ['relationship', 2]],
  'cancelled:scope': [['clarifications', 4], ['relationship', 2]],
  'cancelled:procedure': [['compliance', 4], ['relationship', 2]],
  'cancelled:*': [['relationship', 4], ['terms', 2]],
  'withdrawn:partner': [['partner', 5], ['credentials', 3]],
  'withdrawn:quotes': [['quotes', 5], ['programme', 2]],
  'withdrawn:local-content': [['local-content', 5], ['quotes', 3]],
  'withdrawn:capacity': [['capacity', 5]],
  'withdrawn:risk': [['terms', 5]],
  'withdrawn:*': [['capacity', 3], ['terms', 2]],
  'no-bid:capacity': [['capacity', 5], ['programme', 2]],
  'no-bid:risk': [['terms', 5], ['compliance', 2]],
  'no-bid:price': [['price-level', 5], ['quotes', 3]],
  'no-bid:below-value': [['clarifications', 3], ['terms', 2]],
  'no-bid:*': [['capacity', 3], ['terms', 2], ['price-level', 2]],
  'rejected:*': [['price-level', 5], ['quotes', 3], ['terms', 2]],
};

/** Who beats us, by sector, so one or two rivals recur and "Who beats us" has a leader. Unlisted rivals weigh 5. */
const RIVAL_WEIGHTS: Record<string, Record<string, number>> = {
  'Water and wastewater': { hijr: 30, 'al-masar': 25, sahab: 15, tihama: 15, istria: 10 },
  'Utility networks': { 'al-masar': 40, hijr: 20, tihama: 15, sahab: 5, istria: 5, pellstone: 45, karstel: 30, trevannon: 25 },
  Roads: { 'al-masar': 60, hijr: 10, sahab: 0, tihama: 0, istria: 0, 'liwa-highways': 55, 'mahda-infra': 30, 'shinas-bridges': 15 },
  'Buildings MEP': { 'tessaline-mep': 45, 'sarab-bs': 30, brevanne: 25 },
  'District cooling': { 'sarab-bs': 50, 'tessaline-mep': 30, brevanne: 20 },
  'Fit-out': { 'sarab-bs': 40, 'tessaline-mep': 40, brevanne: 20 },
  'Civil works': { karstel: 45, pellstone: 35, trevannon: 20 },
  'Pump stations': { trevannon: 45, pellstone: 35, karstel: 20 },
  Bridges: { 'shinas-bridges': 55, 'liwa-highways': 25, 'mahda-infra': 20 },
  Earthworks: { 'liwa-highways': 45, 'mahda-infra': 40, 'shinas-bridges': 15 },
  Water: { ostrel: 50, brennock: 30, kelvane: 20 },
  Infrastructure: { brennock: 50, ostrel: 30, kelvane: 20 },
  'Oil and gas facilities': { kelvane: 60, brennock: 25, ostrel: 15 },
};

/** A main reason tilts the field: the price-aggressive firm on price, the specialists on technical. */
const RIVAL_TILT: Record<string, Record<string, number>> = {
  price: { 'al-masar': 1.8, 'sarab-bs': 1.5, pellstone: 1.4, 'liwa-highways': 1.4, ostrel: 1.4 },
  technical: { sahab: 1.8, istria: 1.8, brevanne: 1.8, trevannon: 1.5, 'shinas-bridges': 1.5, kelvane: 1.5 },
  'local-content': { hijr: 1.6, tihama: 1.6, 'tessaline-mep': 1.5, karstel: 1.4, 'mahda-infra': 1.4, brennock: 1.4 },
  pq: { hijr: 2 },
};

const BID_AGAIN: Record<'won' | 'lost' | 'stopped', W<BidAgain>> = {
  lost: [['yes', 65], ['conditions', 25], ['no', 10]],
  won: [['yes', 90], ['conditions', 10]],
  stopped: [['yes', 60], ['conditions', 30], ['no', 10]],
};

const STOPPED_EARLIER: Partial<Record<Ending, W<StoppedEarlier>>> = {
  'no-bid': [['dg1', 40], ['before-sourcing', 25], ['right-time', 35]],
  rejected: [['before-sourcing', 50], ['right-time', 50]],
  withdrawn: [['dg1', 30], ['before-sourcing', 30], ['right-time', 40]],
};

const LESSON_COUNT: W<number> = [[1, 3], [2, 5], [3, 2]];
const FACTOR_COUNT: W<number> = [[1, 3], [2, 5], [3, 2]];

/* ---------------------------------------------------------------- reasons */

/** A No-Bid gate code as a template key: the seed's codes and plan 009a's. */
function noBidKey(code: string | undefined): string {
  if (code === 'capacity' || code === 'capacity-conflict') return 'capacity';
  if (code === 'contract-risk' || code === 'unacceptable-terms' || code === 'client-risk') return 'risk';
  if (code === 'price-competition' || code === 'price-competitiveness' || code === 'win-probability-low') return 'price';
  if (code === 'below-value') return 'below-value';
  return '*';
}

/** The main reason a generated debrief records (the Design's "Main" row). Null for No-Bid and rejected: the gate's reasons stand. */
function mainOf(l: Lifecycle, ending: Ending, r: Rng): string | null {
  if (ending === 'lost') return l.result?.lossReason ?? 'other';
  if (ending === 'won') return r.weighted(WIN_MAIN);
  if (ending === 'cancelled' || ending === 'withdrawn') return stopOf(l.closedNote).reason;
  return null;
}

/** The template key's reason part: the main reason, or the No-Bid gate's first code. */
function reasonKey(l: Lifecycle, ending: Ending, main: string | null): string {
  if (ending === 'no-bid') return noBidKey([...l.gates].reverse().find((g) => g.gate === 'DG2' && g.decision === 'no-bid')?.reasonCodes[0]);
  if (ending === 'rejected') return '*';
  return main ?? '*';
}

const keyed = <T>(table: Record<string, T>, ending: Ending, reason: string): T | undefined => table[`${ending}:${reason}`] ?? table[`${ending}:*`];

/* ------------------------------------------------------------------ slots */

interface Slots { employer: string; sector: string; lc: string; rival?: string; place?: string; bidders?: string; weeks?: string }

const lowerFirst = (s: string) => s[0].toLowerCase() + s.slice(1);

/** Fills a template, or null when it names a slot without a value. Sentences start with a capital. */
function fill(text: string, s: Slots): string | null {
  let missing = false;
  const out = text.replace(/\{(\w+)\}/g, (_, k: keyof Slots) => {
    const v = s[k];
    if (!v) missing = true;
    return v ?? '';
  });
  if (missing) return null;
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

function slotsOf(tenant: GccTenantKey, l: Lifecycle, e: EndingAt, rival?: Rival): Slots {
  const from = l.gates.find((g) => g.gate === 'DG1' && g.decision === 'pursue')?.at;
  const to = l.submission?.deadline ?? e.at;
  const weeks = from ? Math.round(dayDiff(from, to) / 7) : 0;
  return {
    employer: EMPLOYER_SHORT[l.issuer] ?? l.issuer,
    sector: lowerFirst(l.sector),
    lc: tenant === 'corniche' || tenant === 'batinah' ? 'ICV' : 'local content',
    ...(rival ? { rival: rival.short } : {}),
    ...(l.result?.rank ? { place: String(l.result.rank[0]), bidders: String(l.result.rank[1]) } : {}),
    ...(weeks >= 3 ? { weeks: String(weeks) } : {}),
  };
}

/* ------------------------------------------------------------------ times */

interface Times { submittedAt?: string; acceptedAt?: string }

/** The midpoint of two times, on a five-minute mark. */
function between(a: string, b: string): string {
  const m = Math.round((toMin(a) + toMin(b)) / 2 / 5) * 5;
  return plusMin(a, m - toMin(a));
}

/** The share of each tenant's stopped endings that the Project Director debriefed. */
const STOPPED_COVERED = 0.85;

function timesOf(tenant: GccTenantKey, l: Lifecycle, e: EndingAt, r: Rng, picked: boolean): Times {
  const cc = ccOf(tenant);
  if (e.ending === 'won' || e.ending === 'lost') {
    if (!hasLessons(l)) return {};
    const acceptedAt = l.events.find((x) => x.kind === 'lessons' && x.at <= NOW)?.at;
    if (!acceptedAt) return {};
    let submittedAt = `${addWorkingDays(acceptedAt.slice(0, 10), -1, cc)}T${timeIn(r, 10, 16)}`;
    if (submittedAt <= e.at || submittedAt >= acceptedAt) submittedAt = between(e.at, acceptedAt);
    return { submittedAt, acceptedAt };
  }
  if (!picked) return {};
  const subDay = addWorkingDays(e.at.slice(0, 10), r.int(3, 8), cc);
  const submittedAt = `${subDay}T${timeIn(r, 10, 16)}`;
  const acceptedAt = `${addWorkingDays(subDay, r.int(1, 2), cc)}T${timeIn(r, 9, 16)}`;
  if (submittedAt > NOW) return {};
  return acceptedAt > NOW ? { submittedAt } : { submittedAt, acceptedAt };
}

/* ---------------------------------------------------------------- content */

function pickRival(tenant: GccTenantKey, l: Lifecycle, main: string | null, r: Rng): Rival {
  const weights = RIVAL_WEIGHTS[l.sector] ?? {};
  const tilt = (main && RIVAL_TILT[main]) || {};
  return r.weighted(RIVALS[tenant].map((x) => [x, (weights[x.id] ?? 5) * (tilt[x.id] ?? 1)] as const));
}

/** 1–3 distinct picks by weight. */
function distinct<T>(r: Rng, xs: W<T>, n: number): T[] {
  const left = [...xs];
  const out: T[] = [];
  while (out.length < n && left.length) {
    const v = r.weighted(left);
    out.push(v);
    left.splice(left.findIndex(([x]) => x === v), 1);
  }
  return out;
}

function lessonsOf(ending: Ending, reason: string, s: Slots, r: Rng): Lesson[] {
  const own = LESSONS[`${ending}:${reason}`] ?? [];
  const fallback = LESSONS[`${ending}:*`] ?? [];
  const pool = [...own, ...(own.length >= 2 ? [] : fallback.filter((t) => !own.includes(t)))]
    .flatMap((t: LessonTemplate) => { const text = fill(t.text, s); return text ? [{ area: t.area, text }] : []; });
  const n = Math.min(pool.length, r.weighted(LESSON_COUNT));
  const out: Lesson[] = [];
  const left = [...pool];
  while (out.length < n && left.length) out.push(left.splice(r.int(0, left.length - 1), 1)[0]);
  return out;
}

/** The employer's debrief meeting: held (between the ending and our submission, with what they said), not offered, or not asked. */
function employerOf(l: Lifecycle, ending: Ending, reason: string, e: EndingAt, submittedAt: string, s: Slots, r: Rng, cc: ReturnType<typeof ccOf>): DebriefInput['employer'] {
  const government = (l.clientType ?? 'government') !== 'private';
  const heldP = ending === 'won' || ending === 'cancelled' ? 0.4 : government ? 0.6 : 0.3;
  const state: EmployerDebriefState = r.chance(heldP) ? 'held' : r.chance(0.5) ? 'not-offered' : 'not-asked';
  if (state !== 'held') return { state };
  const said = (keyed(SAID, ending, reason) ?? []).flatMap((t) => { const x = fill(t, s); return x ? [x] : []; });
  if (!said.length) return { state: 'not-asked' };
  const endDay = e.at.slice(0, 10);
  let day = addWorkingDays(endDay, r.int(1, 6), cc);
  if (day >= submittedAt.slice(0, 10)) day = addWorkingDays(endDay, 1, cc);
  const slot = `${String(r.int(9, 13)).padStart(2, '0')}:${['00', '15', '30', '45'][r.int(0, 3)]}`;
  // A submission the next working day leaves no room: the meeting is the ending's own afternoon.
  const at = day < submittedAt.slice(0, 10) ? `${day}T${slot}` : plusMin(e.at, 90);
  return { state, at: at < submittedAt ? at : e.at, said: r.pick(said) };
}

/** A generated debrief's content, as the Project Director would have written it. */
function contentOf(tenant: GccTenantKey, l: Lifecycle, e: EndingAt, submittedAt: string, r: Rng): DebriefInput {
  const { ending } = e;
  const group = ending === 'won' || ending === 'lost' ? ending : 'stopped';
  const main = mainOf(l, ending, r);
  const reason = reasonKey(l, ending, main);
  const rivalRoll = r.next();
  const rival = ending === 'lost' ? (rivalRoll < 0.75 ? pickRival(tenant, l, main, r) : undefined)
    : ending === 'won' && rivalRoll < 0.6 ? pickRival(tenant, l, null, r) : undefined;
  const rivalId = ending === 'lost' ? rival?.id ?? (rivalRoll < 0.9 ? RIVAL_OTHER : RIVAL_UNKNOWN) : rival?.id;
  const s = slotsOf(tenant, l, e, rival);
  const factors = distinct(r, keyed(FACTOR_WEIGHTS, ending, reason) ?? [['bid-quality', 1]], r.weighted(FACTOR_COUNT));
  const employer = ending === 'won' || ending === 'lost' || ending === 'cancelled' ? employerOf(l, ending, reason, e, submittedAt, s, r, ccOf(tenant)) : undefined;
  const lessons = lessonsOf(ending, reason, s, r);
  const stoppedEarlier = STOPPED_EARLIER[ending] ? r.weighted(STOPPED_EARLIER[ending]!) : undefined;
  const wouldLetUsBid = group === 'stopped' && ending !== 'cancelled' && r.chance(0.5) ? keyed(WOULD_LET_US_BID, ending, reason) : undefined;
  return {
    tenderId: l.tenderId, main, factors, lessons,
    ...(rivalId ? { rivalId } : {}),
    ...(employer ? { employer } : {}),
    bidAgain: r.weighted(BID_AGAIN[group]),
    ...(stoppedEarlier ? { stoppedEarlier } : {}),
    ...(wouldLetUsBid ? { wouldLetUsBid } : {}),
  };
}

/* --------------------------------------------------------------- records */

function featuredRecord(tenant: GccTenantKey, l: Lifecycle, e: EndingAt, f: Featured): DebriefRecord {
  return {
    tenderId: l.tenderId, ending: e.ending, endedAt: e.at, dueBy: dueByOf(e.at), source: 'featured',
    submission: { ...f.input, tenderId: l.tenderId, at: f.submittedAt, byId: `${tenant}.dir`, round: 1 },
    ...(f.acceptedAt ? { accepted: { at: f.acceptedAt, byId: `${tenant}.hot`, round: 1 } } : {}),
  };
}

function generatedRecord(tenant: GccTenantKey, l: Lifecycle, e: EndingAt, r: Rng, picked: boolean): DebriefRecord {
  const base: DebriefRecord = { tenderId: l.tenderId, ending: e.ending, endedAt: e.at, dueBy: dueByOf(e.at), source: 'generated' };
  const t = timesOf(tenant, l, e, r, picked);
  if (!t.submittedAt) return base;
  return {
    ...base,
    submission: { ...contentOf(tenant, l, e, t.submittedAt, r), at: t.submittedAt, byId: `${tenant}.dir`, round: 1 },
    ...(t.acceptedAt ? { accepted: { at: t.acceptedAt, byId: `${tenant}.hot`, round: 1 } } : {}),
  };
}

/** Every ended bid's seed debrief, in the lifecycles' order. Pure: the dev check calls it again. */
export function generateDebriefs(tenant: GccTenantKey, lifecycles: Lifecycle[]): DebriefRecord[] {
  const ended = lifecycles.flatMap((l) => {
    const e = endingAt(l);
    if (!e) return [];
    // Each tender's stream; its first draw ranks the stopped endings.
    const r = rngOf(`debrief:${l.tenderId}`);
    return [{ l, e, r, rank: r.next() }];
  });
  const stopped = ended.filter((x) => x.e.ending !== 'won' && x.e.ending !== 'lost' && !FEATURED[tenant][x.l.tenderId]).sort((a, b) => a.rank - b.rank);
  const picked = new Set(stopped.slice(0, Math.round(stopped.length * STOPPED_COVERED)).map((x) => x.l.tenderId));
  return ended.map(({ l, e, r }) => {
    const f = FEATURED[tenant][l.tenderId];
    return f ? featuredRecord(tenant, l, e, f) : generatedRecord(tenant, l, e, r, picked.has(l.tenderId));
  });
}
