import { TENANTS, type CountryCode } from '@/data/tenants';
import { can } from '@/data/access';
import { personById, type Person } from '@/data/people';
import { INTAKE_DAILY, LIFECYCLES, gccData, isGccTenantKey } from '@/data/gcc';
import { NEAR_WD, SLA_AT_RISK_SHARE, GATE_SLA_HOURS } from '@/data/gcc/targets';
import { GATE_AFTER } from '@/data/gcc/stages';
import { NOW, hoursBetween, plusHours } from '@/data/gcc/lifecycle/chain';
import { isNewNotice } from '@/data/gcc/lifecycle/intake';
import type { GateKind, GateRecord, IntakeDay, Lifecycle, Result, S1Facts, StageEntry, StepFacts, Submission, WorkEvent } from '@/data/gcc/lifecycle';
import type { Team } from '@/data/gcc/types';
import { DEMO_TODAY, workingDaysBetween } from '@/domain/calendar';
import { eligibilityFor } from '@/domain/gcc/s1/eligibility';
import { freshnessFor } from '@/domain/gcc/s3/freshness';
import { applyDemo } from './demo';
import { inWindow, type PeriodWindow } from './period';
import type { Health } from './viewmodels';

/**
 * Queries over the lifecycles (plan 017 Phase 4). Every dashboard number about
 * a tender's path (what is where now, what happened in a window, whether it is
 * healthy) is read from here, so two screens never disagree.
 *
 * `now` defaults to the demo clock (Sun 8 Mar 2026, 10:00 tenant time).
 *
 * Every query takes an optional `viewer`. With one, it counts only the
 * tenders that person may open (`visible`: `tender.view`, so the restricted
 * lane is left out for people not cleared), the same check the table rows
 * use, so a tile never counts a tender its table hides.
 */

type Win = Pick<PeriodWindow, 'from' | 'to'>;

/** The tenant's demo actions (`store.done`). Queries take it last and optional; without it they read the seed. */
export type DemoDone = Readonly<Record<string, string>>;

const SEED_DONE: DemoDone = Object.freeze({});

/** No demo actions: missing, or an empty map (the store gives a fresh `{}` after Reset). */
const isSeed = (done?: DemoDone): boolean => {
  for (const _ in done) return false;
  return true;
};

const MERGED = new Map<string, WeakMap<DemoDone, Lifecycle[]>>();

/** The demo state each merged lifecycle was built with, so a reading of it (eligibility, staleness, health) uses the same state. */
const DONE_OF = new WeakMap<Lifecycle, DemoDone>();

/**
 * The demo state a lifecycle carries: the `done` it was merged with (plan
 * 021), or the seed's for a seed lifecycle. Helpers that take a lifecycle and
 * an optional `done` default to it, so a caller holding a merged lifecycle
 * can't read it against the seed by mistake.
 */
export const demoDoneOf = (l: Lifecycle): DemoDone => DONE_OF.get(l) ?? SEED_DONE;

/**
 * Every lifecycle of the tenant, with the demo actions merged in (plan 021):
 * a gate recorded in a screen shows on every dashboard, and Reset returns the
 * seed. With no `done`, or an empty one, it is the seed array itself. Otherwise
 * each lifecycle goes through the appliers (`domain/gcc/demo`); the result is
 * memoised on the `done` object's identity, and every lifecycle in it is a
 * copy that carries that `done` (`demoDoneOf`).
 */
function allOf(tenant: string, done?: DemoDone): Lifecycle[] {
  if (!isGccTenantKey(tenant)) return [];
  const seed = LIFECYCLES[tenant];
  if (isSeed(done)) return seed;
  let memo = MERGED.get(tenant);
  if (!memo) MERGED.set(tenant, (memo = new WeakMap()));
  const hit = memo.get(done!);
  if (hit) return hit;
  const merged = seed.map((l) => {
    const m = applyDemo(tenant, l, done!);
    const out = m === l ? { ...l } : m;
    DONE_OF.set(out, done!);
    return out;
  });
  memo.set(done!, merged);
  return merged;
}

/**
 * The gate decision that stands (plan 021). A re-opened record stays in the
 * history, marked `reopened`; it stops standing once the tender is back at
 * the gate or a later record follows it. On a live tender a Hold never
 * stands: DG1 keeps its SLA running while a person is asked for information.
 * The seed's re-opened records (plan 004's history) are on tenders past the
 * gate, and its holds on closed tenders, so seed readings are unchanged.
 */
export function standingGate(l: Lifecycle, gate: GateKind): GateRecord | undefined {
  const xs = l.gates.filter((g) => g.gate === gate);
  if (l.closedAt) return [...xs].reverse().find((g) => !g.reopened) ?? xs[0];
  const back = currentOf(l).stage <= GATE_AFTER[gate];
  const standing = xs.filter((g, i) => g.decision !== 'hold' && !(g.reopened && (back || i < xs.length - 1)));
  return standing[standing.length - 1];
}

/** The `can()` context for a lifecycle: its Bid Manager, sector, invited people (from the register) and lane. */
export const tenderCtx = (tenant: string, l: Lifecycle) => ({
  tender: {
    bidManagerId: l.bidManagerId ?? undefined, sector: l.sector, restricted: !!l.restricted,
    invited: (isGccTenantKey(tenant) ? gccData(tenant).register.find((t) => t.id === l.tenderId)?.invited : undefined) ?? [],
  },
});

/** The one visibility check: may this person open the tender? */
export const visible = (tenant: string, l: Lifecycle, viewer: Person) => can(viewer, 'tender.view', tenderCtx(tenant, l)).ok;

/** The lifecycles this person may open. */
export const visibleOf = (tenant: string, viewer: Person, done?: DemoDone): Lifecycle[] => allOf(tenant, done).filter((l) => visible(tenant, l, viewer));

/** Every lifecycle of the tenant, or with a `viewer` the ones they may open. */
export function lifecyclesOf(tenant: string, viewer?: Person, done?: DemoDone): Lifecycle[] {
  return viewer ? visibleOf(tenant, viewer, done) : allOf(tenant, done);
}

/** One lifecycle by id, whoever asks: callers that show it check `visible`. */
export const lifecycle = (tenant: string, id: string, done?: DemoDone): Lifecycle | undefined => allOf(tenant, done).find((l) => l.tenderId === id);

/** Tenders still in play: no `closedAt`. */
export const liveOf = (tenant: string, viewer?: Person, done?: DemoDone) => lifecyclesOf(tenant, viewer, done).filter((l) => !l.closedAt);

export const closedOf = (tenant: string, viewer?: Person, done?: DemoDone) => lifecyclesOf(tenant, viewer, done).filter((l) => !!l.closedAt);

/** The current stage and step: the last log entry. For a closed tender, where it stopped. */
export const currentOf = (l: Lifecycle): StageEntry => l.log[l.log.length - 1];

/** Where the tender was at a moment: null before capture or after it closed. */
export function stageAt(l: Lifecycle, iso: string): { stage: StageEntry['stage']; step: string } | null {
  if (iso < l.capturedAt || (l.closedAt && iso > l.closedAt)) return null;
  let at: StageEntry | null = null;
  for (const e of l.log) {
    if (e.at > iso) break;
    at = e;
  }
  return at ? { stage: at.stage, step: at.step } : null;
}

/* ------------------------------------------------------------- windows */

export function gateEventsIn(tenant: string, w: Win, gate?: GateKind, viewer?: Person, done?: DemoDone): { l: Lifecycle; g: GateRecord }[] {
  return lifecyclesOf(tenant, viewer, done).flatMap((l) => l.gates.filter((g) => (!gate || g.gate === gate) && inWindow(g.at, w)).map((g) => ({ l, g })));
}

export function submissionsIn(tenant: string, w: Win, viewer?: Person, done?: DemoDone): { l: Lifecycle; s: Submission }[] {
  return lifecyclesOf(tenant, viewer, done).flatMap((l) => (l.submission && inWindow(l.submission.at, w) ? [{ l, s: l.submission }] : []));
}

/** Results in the window: won and lost by default, the way the dashboards count them. */
export function resultsIn(tenant: string, w: Win, kinds: Result['result'][] = ['won', 'lost'], viewer?: Person, done?: DemoDone): { l: Lifecycle; r: Result }[] {
  return lifecyclesOf(tenant, viewer, done).flatMap((l) => (l.result && kinds.includes(l.result.result) && inWindow(l.result.at, w) ? [{ l, r: l.result }] : []));
}

/** Work events of a kind in the window: by when they happened, or by their due date while an M2 or a review is still to be held. */
export function workEventsIn<K extends WorkEvent['kind']>(tenant: string, w: Win, kind: K, viewer?: Person, done?: DemoDone): { l: Lifecycle; e: Extract<WorkEvent, { kind: K }> }[] {
  return lifecyclesOf(tenant, viewer, done).flatMap((l) => l.events
    .filter((e): e is Extract<WorkEvent, { kind: K }> => e.kind === kind && inWindow(e.at ?? ('due' in e ? e.due : undefined), w))
    .map((e) => ({ l, e })));
}

export interface Captures {
  /** New notices captured. */
  captured: number;
  bySource: Record<string, number>;
  /** Duplicates and addenda linked to a tender already on the register. */
  linked: number;
  logged: number;
  screened: number;
  /** Intake-to-logged minutes, one per logged notice (INT-2). */
  minutes: number[];
  /** Notices the reconciliations found missing (INT-3). */
  missed: number;
}

const minutesBetween = (a: string, b: string) => Math.round(hoursBetween(a, b) * 60);

/**
 * Capture volumes in the window: the daily history, plus today's intake
 * events (plan 004's `intakeToday`). With a `viewer`, today's events and
 * screenings of tenders they may not open are left out; the daily history is
 * counts without tenders, so it stays as it is.
 */
export function capturesIn(tenant: string, w: Win, viewer?: Person, done?: DemoDone): Captures {
  const c: Captures = { captured: 0, bySource: {}, linked: 0, logged: 0, screened: 0, minutes: [], missed: 0 };
  if (!isGccTenantKey(tenant)) return c;
  const hidden = new Set(viewer ? allOf(tenant, done).filter((l) => !visible(tenant, l, viewer)).map((l) => l.tenderId) : []);
  const days: IntakeDay[] = INTAKE_DAILY[tenant].filter((d) => inWindow(d.date, w));
  for (const d of days) {
    c.captured += d.logged;
    for (const [s, n] of Object.entries(d.bySource)) c.bySource[s] = (c.bySource[s] ?? 0) + n;
    c.linked += d.linked;
    c.logged += d.logged;
    c.screened += d.screened;
    c.minutes.push(...d.minutes);
    c.missed += d.missed;
  }
  for (const e of gccData(tenant).intakeToday.filter((x) => inWindow(x.receivedAt, w) && !(x.tenderId && hidden.has(x.tenderId)))) {
    if (!isNewNotice(e)) { c.linked++; continue; }
    c.captured++;
    c.bySource[e.sourceId] = (c.bySource[e.sourceId] ?? 0) + 1;
    if (e.loggedAt) {
      c.logged++;
      c.minutes.push(minutesBetween(e.receivedAt, e.loggedAt));
    }
  }
  const recon = gccData(tenant).reconciliation;
  if (inWindow(recon.at, w)) c.missed += recon.missed;
  c.screened += lifecyclesOf(tenant, viewer, done).filter((l) => inWindow(l.capturedAt, w) && l.capturedAt.slice(0, 10) === DEMO_TODAY && l.log.some((e) => e.step === 'screened')).length;
  return c;
}

/* ---------------------------------------------------------- open gates */

export interface OpenGate {
  gate: GateKind;
  openedAt: string;
  slaEnd: string;
  slaHours: number;
  /** Hours left before the SLA ends; negative once breached. */
  leftHours: number;
  /** Share of the SLA left, 0–1 (0 when breached). */
  leftShare: number;
  onTime: boolean;
}

function gateFrom(gate: GateKind, openedAt: string, now: string, slaEnd = plusHours(openedAt, GATE_SLA_HOURS[gate])): OpenGate {
  const slaHours = GATE_SLA_HOURS[gate];
  const leftHours = hoursBetween(now, slaEnd);
  return { gate, openedAt, slaEnd, slaHours, leftHours, leftShare: Math.max(0, leftHours / slaHours), onTime: leftHours >= 0 };
}

/**
 * The gate waiting for a decision now, if any:
 * - DG1, from the DG1 due time in the Stage 1 facts, or the entry into Awaiting DG1;
 * - DG2, from the pack issue in the Stage 3 facts (or the log's Pack issued);
 * - DG3, from the DG3 pack issue in the Stage 7 facts (or the log's DG3 pack issued).
 */
export function openGate(l: Lifecycle, now = NOW): OpenGate | null {
  if (l.closedAt) return null;
  const cur = currentOf(l);
  const f = l.facts;
  const decided = (g: GateKind) => !!standingGate(l, g);
  if (cur.stage === 1 && !decided('DG1')) {
    if (f?.stage === 1 && f.dg1Due) return gateFrom('DG1', plusHours(f.dg1Due, -GATE_SLA_HOURS.DG1), now, f.dg1Due);
    if (cur.step === 'awaiting-dg1') return gateFrom('DG1', cur.at, now);
  }
  if (cur.stage === 3 && !decided('DG2')) {
    const issued = f?.stage === 3 ? f.issuedAt : l.log.find((e) => e.step === 'pack-issued')?.at;
    if (issued) return gateFrom('DG2', issued, now);
  }
  if (cur.stage === 7 && cur.step === 'dg3-issued' && !decided('DG3')) {
    return gateFrom('DG3', (f?.stage === 7 && f.dg3IssuedAt) || cur.at, now);
  }
  return null;
}

/** "4 h 10 m", "2 d 3 h". */
export function hoursText(h: number): string {
  const m = Math.round(Math.abs(h) * 60);
  if (m >= 48 * 60) return `${Math.floor(m / 1440)} d ${Math.floor((m % 1440) / 60)} h`;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m} m`;
}

/* ------------------------------------------------- derived step facts */

export type EligibilityCountsVM = NonNullable<S1Facts['eligibility']> & { from: '007a' | 'interim' };

/** A cache per demo state: one map for the seed, one per `done` object (dropped with it). */
function doneCache<V>() {
  const seed = new Map<string, V>();
  const byDone = new WeakMap<DemoDone, Map<string, V>>();
  return (done: DemoDone): Map<string, V> => {
    if (isSeed(done)) return seed;
    let m = byDone.get(done);
    if (!m) byDone.set(done, (m = new Map()));
    return m;
  };
}

const ELIGIBILITY = doneCache<EligibilityCountsVM | null>();

/**
 * A Stage 1 tender's eligibility counts (plan 020 B12): 007a's
 * `eligibilityFor` when it has extracted requirements, else the interim
 * counts in its step facts. `done` defaults to the one the lifecycle was
 * merged with, so a renewed credential (plan 021 2.5) changes the counts.
 */
export function eligibilityOf(tenant: string, l: Lifecycle, done: DemoDone = demoDoneOf(l)): EligibilityCountsVM | null {
  if (l.facts?.stage !== 1) return null;
  const key = `${tenant}:${l.tenderId}`;
  const cache = ELIGIBILITY(done);
  if (!cache.has(key)) {
    const r = isGccTenantKey(tenant) ? eligibilityFor(tenant, l.tenderId, done as Record<string, string>) : null;
    cache.set(key, r ? { pass: r.counts.met, atRisk: r.counts.atRisk, interpretation: r.counts.interpretation, fail: r.counts.fail, from: '007a' } : null);
  }
  const derived = cache.get(key);
  if (derived) return derived;
  return l.facts.eligibility ? { ...l.facts.eligibility, from: 'interim' } : null;
}

export interface StaleVM { since: string; text: string; from: '009a' | 'interim' }

const STALE = doneCache<StaleVM | null | 'no pack'>();

/**
 * A Stage 3 pack's staleness (plan 020 B17): 009a's freshness text when 009a
 * holds the pack ("Addendum 2 received 08 Mar 09:12 changes 2 packages …"),
 * else the interim step facts. Null when the pack is fresh. `done` defaults to
 * the lifecycle's own, so a re-run in the demo clears it (plan 021 2.3).
 */
export function staleOf(tenant: string, l: Lifecycle, done: DemoDone = demoDoneOf(l)): StaleVM | null {
  if (l.facts?.stage !== 3) return null;
  const key = `${tenant}:${l.tenderId}`;
  const cache = STALE(done);
  if (!cache.has(key)) {
    const f = isGccTenantKey(tenant) ? freshnessFor(tenant, l.tenderId, done as Record<string, string>) : null;
    cache.set(key, !f ? 'no pack' : f.stale ? { since: f.stale.since, text: f.stale.reason, from: '009a' } : null);
  }
  const v = cache.get(key)!;
  if (v !== 'no pack') return v;
  const st = l.facts.stale;
  return st ? { since: st.since, text: `since ${st.since.slice(11, 16)} (${st.reason})`, from: 'interim' } : null;
}

/* -------------------------------------------------------------- health */

export interface HealthVM {
  health: Health; reason: string | null;
  /** The reason without margin figures, for viewers without `see.margin`. Set only when `reason` states one. */
  maskedReason?: string;
}

const ccOfCountry = (country: string, tenant: string): CountryCode =>
  TENANTS.find((t) => t.country === country || t.countryCode === country)?.countryCode ?? TENANTS.find((t) => t.key === tenant)!.countryCode;

/** Working days from today to the submission deadline, in the tender's country's calendar. */
export function deadlineWd(l: Lifecycle, tenant: string): number | null {
  if (!l.submissionDeadline) return null;
  return workingDaysBetween(DEMO_TODAY, l.submissionDeadline.date, ccOfCountry(l.country, tenant));
}

const submittedOf = (l: Lifecycle) => !!l.submission || l.log.some((e) => e.step === 'submitted');
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

/**
 * Health, exactly dashboards.md §5 (plan 017 §4.5). The reason is one line a
 * person can act on; several at-risk reasons are joined. `done` defaults to
 * the lifecycle's own demo state.
 */
export function healthOf(l: Lifecycle, tenant: string, now = NOW, done: DemoDone = demoDoneOf(l)): HealthVM {
  if (l.closedAt) return { health: l.closedAs ?? 'withdrawn', reason: l.closedNote ?? null };
  const f: StepFacts | undefined = l.facts;
  const wd = deadlineWd(l, tenant);
  const near = wd !== null && wd <= NEAR_WD;
  const gate = openGate(l, now);

  // Blocked: a hard block.
  const elig = eligibilityOf(tenant, l, done);
  if (elig && elig.fail > 0) return { health: 'blocked', reason: `Eligibility: ${elig.fail} ${elig.fail === 1 ? 'line fails' : 'lines fail'}` };
  if (f?.stage === 7 && f.mandatoryGaps > 0 && near) return { health: 'blocked', reason: `${f.mandatoryGaps} mandatory ${f.mandatoryGaps === 1 ? 'gap' : 'gaps'}, submission in ${wd} working days` };
  if (f?.stage === 8 && near && (!f.bond.issued || f.bond.validTo < f.bond.requiredTo)) {
    return { health: 'blocked', reason: !f.bond.issued ? `Bid bond not issued, submission in ${wd} working days` : 'Bid bond validity ends before the required date' };
  }

  // Overdue: an SLA or an internal deadline breached.
  if (gate && !gate.onTime) return { health: 'overdue', reason: `${gate.gate} overdue by ${hoursText(gate.leftHours)}` };
  const today = now.slice(0, 10);
  if (f?.stage === 4 && f.baselineDue < today) return { health: 'overdue', reason: `Baseline was due ${f.baselineDue}` };
  if (f?.stage === 5 && f.priceDue < today) return { health: 'overdue', reason: `Price was due ${f.priceDue}` };
  if (l.submissionDeadline && !submittedOf(l) && `${l.submissionDeadline.date}T${l.submissionDeadline.time}` < now) return { health: 'overdue', reason: 'Submission deadline passed' };
  if (f?.stage === 2 && f.rfqs.escalated > 0) return { health: 'overdue', reason: `${f.rfqs.escalated} overdue ${f.rfqs.escalated === 1 ? 'RFQ' : 'RFQs'} escalated` };

  // At risk: little SLA left, or an open blocker with a named owner.
  const risks: string[] = [];
  if (gate && gate.leftShare < SLA_AT_RISK_SHARE) risks.push(`${gate.gate}: ${hoursText(gate.leftHours)} left`);
  if (f?.stage === 3) {
    const stale = staleOf(tenant, l, done);
    if (stale) risks.push(stale.from === '009a' ? `pack stale: ${stale.text}` : `pack stale ${stale.text}`);
    if (f.inputs.late > 0) risks.push(`${f.inputs.late} ${f.inputs.late === 1 ? 'input' : 'inputs'} late`);
  }
  // The margin risk has a figure-free twin, so the port can show it to people who can't see margin.
  let marginRisk: { at: number; masked: string } | null = null;
  if (f?.stage === 5 && f.baseMarginPct < f.minMarginPct) {
    marginRisk = { at: risks.length, masked: 'margin below the minimum (figures masked for your role)' };
    risks.push(`margin ${pct(f.baseMarginPct)} below the ${pct(f.minMarginPct)} minimum`);
  }
  if (f?.stage === 6) {
    if (f.simScore < f.passMark) risks.push(`simulated score ${f.simScore} below the pass mark ${f.passMark}`);
    if (f.sections.late > 0) risks.push(`${f.sections.late} ${f.sections.late === 1 ? 'section' : 'sections'} late`);
  }
  if (f?.stage === 4 && f.durationPlannedM > f.durationRequiredM) risks.push(`programme ${f.durationPlannedM} months against ${f.durationRequiredM} required`);
  if (risks.length) {
    const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
    const masked = marginRisk ? risks.map((r, i) => (i === marginRisk!.at ? marginRisk!.masked : r)).join('; ') : null;
    return { health: 'at-risk', reason: cap(risks.join('; ')), ...(masked ? { maskedReason: cap(masked) } : {}) };
  }
  return { health: 'on-track', reason: null };
}

/* -------------------------------------------------------------- people */

export const teamOf = (tenant: string, teamId: string): Team | undefined =>
  (isGccTenantKey(tenant) ? gccData(tenant).teams : []).find((t) => t.id === teamId);

export const personName = (id: string | null | undefined): string | null => personById(id)?.name ?? null;

/* ------------------------------------------------------ bound queries */

/**
 * Every query above, bound to one context: the tenant, the viewer (so a count
 * never includes a tender the viewer's table hides) and the demo state (so a
 * gate recorded in a screen shows everywhere, plan 021). Dashboards
 * (015, 013) and the Tender Workspace (019) call lifecycle queries through
 * this, never unbound, so neither the viewer nor `done` can be forgotten.
 */
export function queriesFor(ctx: { tenant: string; viewer: Person; done: DemoDone }) {
  const { tenant, viewer, done } = ctx;
  return {
    all: () => lifecyclesOf(tenant, viewer, done),
    live: () => liveOf(tenant, viewer, done),
    closed: () => closedOf(tenant, viewer, done),
    /** One tender, or undefined when it doesn't exist or the viewer may not open it. */
    one: (id: string) => {
      const l = lifecycle(tenant, id, done);
      return l && visible(tenant, l, viewer) ? l : undefined;
    },
    gateEventsIn: (w: Win, gate?: GateKind) => gateEventsIn(tenant, w, gate, viewer, done),
    submissionsIn: (w: Win) => submissionsIn(tenant, w, viewer, done),
    resultsIn: (w: Win, kinds?: Result['result'][]) => resultsIn(tenant, w, kinds, viewer, done),
    workEventsIn: <K extends WorkEvent['kind']>(w: Win, kind: K) => workEventsIn(tenant, w, kind, viewer, done),
    capturesIn: (w: Win) => capturesIn(tenant, w, viewer, done),
  };
}
