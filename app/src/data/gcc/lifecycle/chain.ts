import type { CountryCode } from '@/data/tenants';
import type { RoleKey } from '@/data/types';
import { DEMO_TIME, DEMO_TODAY, isWorkingDay as calendarWorkingDay } from '@/domain/calendar';
import { GCC_STAGES } from '../stages';
import { GATE_SLA_HOURS } from '../targets';
import type {
  ClosedAs, GateDecision, GateKind, GateRecord, Lifecycle, LifecycleOrigin, Result, StageEntry, StageN, StepFacts, Submission, WorkEvent,
} from './types';

/**
 * Builds a lifecycle's stage log from a few key moments (capture, M1, the
 * gates, submission, result, close), so the hand-authored rows, plan 004's
 * folded history and the generated history share one shape. Steps that are
 * not pinned are placed between the pinned ones by fixed fractions of the
 * stage. A spec whose moments run backwards throws, so a slip in the data is
 * caught at load rather than shown on a tracker.
 */

/* ------------------------------------------------------------------ time */

/** The demo clock as a tenant-local date-time. */
export const NOW = `${DEMO_TODAY}T${DEMO_TIME}`;

// Integer date arithmetic: the history build does hundreds of thousands of
// these, and Date.parse / toISOString would take most of the 50 ms budget.

/** Days since 1970-01-01 for a `YYYY-MM-DD…` string (Hinnant's days_from_civil). */
function daysOf(iso: string): number {
  let y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7);
  const d = +iso.slice(8, 10);
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}

const p2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** `YYYY-MM-DD` for a day number (civil_from_days). */
function dateOf(days: number): string {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return `${yoe + era * 400 + (m <= 2 ? 1 : 0)}-${p2(m)}-${p2(d)}`;
}

/** Minutes since 1970 for a tenant-local `YYYY-MM-DDTHH:MM`. Every time in a tenant shares one zone, so the zone never matters. */
export function toMin(iso: string): number {
  const t = iso.length > 10 ? +iso.slice(11, 13) * 60 + +iso.slice(14, 16) : 0;
  return daysOf(iso) * 1440 + t;
}

export function fromMin(min: number): string {
  const days = Math.floor(min / 1440);
  const t = min - days * 1440;
  return `${dateOf(days)}T${p2(Math.floor(t / 60))}:${p2(t % 60)}`;
}

export const hoursBetween = (a: string, b: string) => (toMin(b) - toMin(a)) / 60;
export const plusMin = (iso: string, m: number) => fromMin(toMin(iso) + Math.round(m));
export const plusHours = (iso: string, h: number) => plusMin(iso, h * 60);
export const plusDays = (iso: string, d: number) => plusMin(iso, d * 1440);

/** `date` plus `n` calendar days (the date part of an ISO string). Same result as `domain/calendar.ts`'s `addDays`, faster. */
export const addDays = (date: string, n: number) => dateOf(daysOf(date) + n);

/** Calendar days from `a` to `b` (date parts). */
export const dayDiff = (a: string, b: string) => daysOf(b) - daysOf(a);

/** Orders ISO strings (and ids) by code unit: what `localeCompare` gives them, much faster. */
export const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const workingCache = new Map<string, boolean>();

/** `domain/calendar.ts`'s `isWorkingDay`, remembered: the calendars are fixed data. */
export function isWorkingDay(date: string, cc: CountryCode): boolean {
  const key = `${cc}${date.slice(0, 10)}`;
  let w = workingCache.get(key);
  if (w === undefined) workingCache.set(key, (w = calendarWorkingDay(date.slice(0, 10), cc)));
  return w;
}

/** The working day on or before `date`. */
export function snapBack(date: string, cc: CountryCode): string {
  let d = date.slice(0, 10);
  for (let i = 0; i < 30 && !isWorkingDay(d, cc); i++) d = addDays(d, -1);
  return d;
}

/** The working day on or after `date`. */
export function snapFwd(date: string, cc: CountryCode): string {
  let d = date.slice(0, 10);
  for (let i = 0; i < 30 && !isWorkingDay(d, cc); i++) d = addDays(d, 1);
  return d;
}

/** `n` working days after `date` (before it when negative). */
export function addWorkingDays(date: string, n: number, cc: CountryCode): string {
  let d = date.slice(0, 10);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0;) {
    d = addDays(d, step);
    if (isWorkingDay(d, cc)) left--;
  }
  return d;
}

/* ---------------------------------------------------------------- owners */

/**
 * Who a step waits on (dashboards.md §8.1): the stage owner, except that the
 * Bid Manager has DG1, the Stage 3 pack work and Stage 8, and the Head of
 * Tendering has open DG2 and DG3 decisions.
 */
export function stepOwnerRole(stage: StageN, step: string): RoleKey | 'bidManager' {
  if (stage === 1 && step === 'awaiting-dg1') return 'bidManager';
  if (stage === 3) return step === 'pack-in-preparation' || step === 'inputs-complete' ? 'bidManager' : 'hot';
  if (stage === 7 && step === 'dg3-issued') return 'hot';
  if (stage === 8) return 'bidManager';
  return GCC_STAGES[stage - 1].ownerRole;
}

export const personId = (tenant: string, role: RoleKey) => `${tenant}.${role}`;

export const stepsOf = (n: StageN) => GCC_STAGES[n - 1].steps.map((s) => s.key);

/* ----------------------------------------------------------------- specs */

export interface GateSpec {
  at: string;
  decision: GateDecision;
  byId: string;
  onTime: boolean;
  reasonCodes?: string[];
  againstMajority?: boolean;
  reopened?: string;
  note?: string;
  recommendation?: GateRecord['recommendation'];
}

export interface ChainSpec {
  tenant: string;
  cc: CountryCode;
  id: string;
  title: string;
  shortTitle: string;
  issuer: string;
  city: string;
  country: string;
  sector: string;
  value: Lifecycle['value'];
  clientType?: Lifecycle['clientType'];
  teamId: string;
  bidManagerId: string | null;
  source: Lifecycle['source'];
  restricted?: boolean;
  origin: LifecycleOrigin;

  captured: string;
  /** Entry into Awaiting DG1 (M1): the DG1 clock starts. */
  m1?: string;
  dg1?: GateSpec;
  /** DG2 pack issued: the DG2 clock starts. */
  packIssued?: string;
  dg2?: GateSpec;
  /** DG3 pack issued: the DG3 clock starts. */
  dg3Issued?: string;
  dg3?: GateSpec;
  submission?: Submission;
  submissionDeadline?: { date: string; time: string };
  result?: Result;
  /** A closed tender. `stage` and `step` place a withdrawal; otherwise it closes where its last gate or result left it. */
  close?: { at: string; as: ClosedAs; note?: string; stage?: StageN; step?: string };
  /** A live tender: its current stage and step. The log stops there. */
  now?: { stage: StageN; step: string };
  /** Exact entry times for steps, keyed `stage:step` ("2:rfqs-out"). */
  steps?: Record<string, string>;
  /** Pins a step's owner, keyed like `steps`. */
  owners?: Record<string, string | null>;
  events?: WorkEvent[];
  facts?: StepFacts;
}

/** Fractions of a stage at which each of its steps starts, when not pinned. The end of the stage is 1. */
const FRACTIONS: Record<StageN, number[]> = {
  1: [0, 0.1, 0.3, 0.8, 1],
  2: [0, 0.01, 0.03, 0.45, 0.75, 0.92],
  3: [0, 0.55, 0.85, 0.92, 0.97],
  4: [0, 0.35, 0.7, 0.9],
  5: [0, 0.35, 0.7, 0.9],
  6: [0, 0.2, 0.7, 0.9],
  7: [0, 0.35, 0.65, 0.95],
  8: [0, 0.5, 0.98, 0.99],
  9: [0, 0.3, 0.95],
};

interface Span { stage: StageN; from: string; to: string }

const lerp = (a: string, b: string, f: number) => fromMin(Math.round(toMin(a) + (toMin(b) - toMin(a)) * f));

function fail(s: ChainSpec, msg: string): never {
  throw new Error(`Lifecycle ${s.tenant} ${s.id}: ${msg}`);
}

/** The last stage and step a closed tender reached, from how it closed. */
function closedStep(s: ChainSpec): { stage: StageN; step: string } | null {
  if (!s.close) return null;
  if (s.close.stage && s.close.step) return { stage: s.close.stage, step: s.close.step };
  if (s.result && (s.result.result === 'won' || s.result.result === 'lost')) {
    return { stage: 9, step: s.events?.some((e) => e.kind === 'lessons') ? 'lessons-captured' : 'handover-or-debrief' };
  }
  if (s.submission) return { stage: 8, step: 'awaiting-result' };
  if (s.dg3) return { stage: 7, step: 'dg3-issued' };
  if (s.dg2) return { stage: 3, step: 'awaiting-approval' };
  return { stage: 1, step: 'awaiting-dg1' };
}

export function buildChain(s: ChainSpec): Lifecycle {
  const pin = (stage: StageN, step: string) => s.steps?.[`${stage}:${step}`];
  const stop = s.now ?? closedStep(s);
  if (!stop) fail(s, 'neither live (`now`) nor closed (`close`)');
  const end = s.now ? NOW : s.close!.at;

  const m1 = s.m1 ?? pin(1, 'awaiting-dg1');
  const pack = s.packIssued ?? pin(3, 'pack-issued');
  const dg3Open = s.dg3Issued ?? pin(7, 'dg3-issued');

  // Stage spans from the key moments. A stage still open ends at `end`.
  const spans: Span[] = [{ stage: 1, from: s.captured, to: s.dg1?.at ?? end }];
  if (s.dg1?.decision === 'pursue') {
    const dg1 = s.dg1.at;
    let s3 = pin(3, 'pack-in-preparation');
    if (!s3 && pack) {
      const span = toMin(pack) - toMin(dg1);
      const len = Math.min(Math.max(span * 0.3, 2 * 1440), 8 * 1440);
      s3 = fromMin(Math.max(toMin(dg1) + 60, toMin(pack) - len));
    }
    spans.push({ stage: 2, from: dg1, to: s3 ?? end });
    if (s3) spans.push({ stage: 3, from: s3, to: s.dg2?.at ?? end });
    if (s.dg2?.decision === 'bid') {
      const a = s.dg2.at;
      const b = dg3Open ?? end;
      const p5 = pin(5, 'cost-build-up') ?? (dg3Open ? lerp(a, b, 0.25) : undefined);
      const p6 = pin(6, 'sections-assigned') ?? (dg3Open ? lerp(a, b, 0.5) : undefined);
      const p7 = pin(7, 'matrix') ?? (dg3Open ? lerp(a, b, 0.8) : undefined);
      spans.push({ stage: 4, from: a, to: p5 ?? end });
      if (p5) spans.push({ stage: 5, from: p5, to: p6 ?? end });
      if (p6) spans.push({ stage: 6, from: p6, to: p7 ?? end });
      if (p7) spans.push({ stage: 7, from: p7, to: s.dg3?.at ?? end });
      if (s.dg3?.decision === 'approved') {
        spans.push({ stage: 8, from: s.dg3.at, to: s.result?.at ?? end });
        if (s.result && (s.result.result === 'won' || s.result.result === 'lost')) spans.push({ stage: 9, from: s.result.at, to: end });
      }
    }
  }

  const ownerOf = (stage: StageN, step: string) => {
    const key = `${stage}:${step}`;
    if (s.owners && key in s.owners) return s.owners[key]!;
    const role = stepOwnerRole(stage, step);
    return role === 'bidManager' ? s.bidManagerId : personId(s.tenant, role);
  };

  // Moments every chain pins, when it has them.
  const known = (stage: StageN, step: string): string | undefined => {
    const p = pin(stage, step);
    if (p) return p;
    if (stage === 1 && step === 'captured') return s.captured;
    if (stage === 1 && step === 'awaiting-dg1') return m1;
    if (stage === 2 && step === 'packaging') return s.dg1?.at;
    // RFQs go out the day after Pursue (SRC-1: within 24 h), unless the spec says otherwise.
    if (stage === 2 && step === 'shortlisting' && s.dg1) return plusHours(s.dg1.at, 3);
    if (stage === 2 && step === 'rfqs-out' && s.dg1) return plusHours(s.dg1.at, 20);
    if (stage === 3 && step === 'pack-issued') return pack;
    if (stage === 4 && step === 'baseline-drafting') return s.dg2?.at;
    if (stage === 7 && step === 'dg3-issued') return dg3Open;
    if (stage === 8 && step === 'assembling') return s.dg3?.at;
    if (stage === 8 && step === 'submitted') return s.submission?.at;
    if (stage === 8 && step === 'awaiting-result') return s.submission ? plusMin(s.submission.at, 20) : undefined;
    if (stage === 9 && step === 'result-received') return s.result?.at;
    if (stage === 9 && step === 'lessons-captured') return s.events?.find((e) => e.kind === 'lessons')?.at;
    if (stage === 9 && step === 'handover-or-debrief') return s.events?.find((e) => e.kind === 'handover')?.at;
    return undefined;
  };

  const log: StageEntry[] = [];
  let reached = false;
  for (const sp of spans) {
    const keys = stepsOf(sp.stage);
    const last = stop.stage === sp.stage ? keys.indexOf(stop.step) : keys.length - 1;
    if (last < 0) fail(s, `unknown step ${stop.step} in stage ${sp.stage}`);
    const times: (string | undefined)[] = keys.map((k, i) => (i <= last ? known(sp.stage, k) : undefined));
    times[0] ??= sp.from;
    // Unpinned steps go between their pinned neighbours. The current stage of a live tender ends at now.
    const fr = FRACTIONS[sp.stage];
    const current = sp.stage === stop.stage && !!s.now;
    const endAt = current ? NOW : sp.to;
    const frEnd = current ? (last + 1 < fr.length ? fr[last + 1] : 1) : 1;
    for (let i = 1; i <= last; i++) {
      if (times[i]) continue;
      let a = i - 1;
      while (!times[a]) a--;
      let b = i + 1;
      while (b <= last && !times[b]) b++;
      const tb = b <= last ? times[b]! : endAt;
      const fb = b <= last ? fr[b] : b < fr.length && !current ? fr[b] : frEnd;
      const f = (fr[i] - fr[a]) / ((fb - fr[a]) || 1);
      times[i] = lerp(times[a]!, tb, f);
    }
    for (let i = 0; i <= last; i++) {
      const t = times[i]!;
      const prev = log[log.length - 1];
      if (prev && t < prev.at) fail(s, `${sp.stage}:${keys[i]} at ${t} is before ${prev.stage}:${prev.step} at ${prev.at}`);
      log.push({ stage: sp.stage, step: keys[i], at: t, ownerId: ownerOf(sp.stage, keys[i]) });
    }
    if (sp.stage === stop.stage) { reached = true; break; }
  }
  if (!reached) fail(s, `the log never reaches ${stop.stage}:${stop.step}`);
  if (s.now && log[log.length - 1].at > NOW) fail(s, `current step starts after now (${log[log.length - 1].at})`);
  if (s.close && log[log.length - 1].at > s.close.at) fail(s, `closed at ${s.close.at}, before its last step`);

  const gate = (g: GateKind, spec: GateSpec | undefined, openedAt: string | undefined): GateRecord[] => {
    if (!spec) return [];
    if (!openedAt) fail(s, `${g} has no opening time`);
    if (spec.at < openedAt) fail(s, `${g} decided before it opened`);
    const hours = hoursBetween(openedAt, spec.at);
    if ((hours <= GATE_SLA_HOURS[g]) !== spec.onTime) fail(s, `${g} decided ${hours.toFixed(1)} h after opening but marked ${spec.onTime ? 'on time' : 'late'}`);
    return [{
      gate: g, decision: spec.decision, at: spec.at, byId: spec.byId, openedAt, slaHours: GATE_SLA_HOURS[g], onTime: spec.onTime,
      reasonCodes: spec.reasonCodes ?? [],
      ...(spec.againstMajority ? { againstMajority: true } : {}),
      ...(spec.reopened ? { reopened: spec.reopened } : {}),
      ...(spec.note ? { note: spec.note } : {}),
      ...(spec.recommendation ? { recommendation: spec.recommendation } : {}),
    }];
  };

  return {
    tenderId: s.id, title: s.title, shortTitle: s.shortTitle, issuer: s.issuer, city: s.city, country: s.country, sector: s.sector,
    value: s.value, ...(s.clientType ? { clientType: s.clientType } : {}), teamId: s.teamId, bidManagerId: s.bidManagerId, source: s.source,
    capturedAt: s.captured,
    ...(s.submissionDeadline ? { submissionDeadline: s.submissionDeadline }
      : s.submission ? { submissionDeadline: { date: s.submission.deadline.slice(0, 10), time: s.submission.deadline.slice(11, 16) } } : {}),
    log,
    gates: [...gate('DG1', s.dg1, m1), ...gate('DG2', s.dg2, pack), ...gate('DG3', s.dg3, dg3Open)],
    ...(s.submission ? { submission: s.submission } : {}),
    ...(s.result ? { result: s.result } : {}),
    ...(s.close ? { closedAt: s.close.at, closedAs: s.close.as, ...(s.close.note ? { closedNote: s.close.note } : {}) } : {}),
    events: s.events ?? [],
    ...(s.facts ? { facts: s.facts } : {}),
    ...(s.restricted ? { restricted: true } : {}),
    origin: s.origin,
  };
}
