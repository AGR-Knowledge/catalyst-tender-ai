import { TENANTS, type CountryCode } from '@/data/tenants';
import { personById } from '@/data/people';
import { INTAKE_DAILY, LIFECYCLES, gccData, isGccTenantKey } from '@/data/gcc';
import { NEAR_WD, SLA_AT_RISK_SHARE, GATE_SLA_HOURS } from '@/data/gcc/targets';
import { NOW, hoursBetween, plusHours } from '@/data/gcc/lifecycle/chain';
import { isNewNotice } from '@/data/gcc/lifecycle/intake';
import type { GateKind, GateRecord, IntakeDay, Lifecycle, Result, StageEntry, StepFacts, Submission, WorkEvent } from '@/data/gcc/lifecycle';
import type { Team } from '@/data/gcc/types';
import { DEMO_TODAY, workingDaysBetween } from '@/domain/calendar';
import { inWindow, type PeriodWindow } from './period';
import type { Health } from './viewmodels';

/**
 * Queries over the lifecycles (plan 017 Phase 4). Every dashboard number about
 * a tender's path (what is where now, what happened in a window, whether it is
 * healthy) is read from here, so two screens never disagree.
 *
 * `now` defaults to the demo clock (Sun 8 Mar 2026, 10:00 tenant time).
 */

type Win = Pick<PeriodWindow, 'from' | 'to'>;

export function lifecyclesOf(tenant: string): Lifecycle[] {
  return isGccTenantKey(tenant) ? LIFECYCLES[tenant] : [];
}

export const lifecycle = (tenant: string, id: string): Lifecycle | undefined => lifecyclesOf(tenant).find((l) => l.tenderId === id);

/** Tenders still in play: no `closedAt`. */
export const liveOf = (tenant: string) => lifecyclesOf(tenant).filter((l) => !l.closedAt);

export const closedOf = (tenant: string) => lifecyclesOf(tenant).filter((l) => !!l.closedAt);

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

export function gateEventsIn(tenant: string, w: Win, gate?: GateKind): { l: Lifecycle; g: GateRecord }[] {
  return lifecyclesOf(tenant).flatMap((l) => l.gates.filter((g) => (!gate || g.gate === gate) && inWindow(g.at, w)).map((g) => ({ l, g })));
}

export function submissionsIn(tenant: string, w: Win): { l: Lifecycle; s: Submission }[] {
  return lifecyclesOf(tenant).flatMap((l) => (l.submission && inWindow(l.submission.at, w) ? [{ l, s: l.submission }] : []));
}

/** Results in the window: won and lost by default, the way the dashboards count them. */
export function resultsIn(tenant: string, w: Win, kinds: Result['result'][] = ['won', 'lost']): { l: Lifecycle; r: Result }[] {
  return lifecyclesOf(tenant).flatMap((l) => (l.result && kinds.includes(l.result.result) && inWindow(l.result.at, w) ? [{ l, r: l.result }] : []));
}

/** Work events of a kind in the window: by when they happened, or by their due date while an M2 or a review is still to be held. */
export function workEventsIn<K extends WorkEvent['kind']>(tenant: string, w: Win, kind: K): { l: Lifecycle; e: Extract<WorkEvent, { kind: K }> }[] {
  return lifecyclesOf(tenant).flatMap((l) => l.events
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

/** Capture volumes in the window: the daily history, plus today's intake events (plan 004's `intakeToday`). */
export function capturesIn(tenant: string, w: Win): Captures {
  const c: Captures = { captured: 0, bySource: {}, linked: 0, logged: 0, screened: 0, minutes: [], missed: 0 };
  if (!isGccTenantKey(tenant)) return c;
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
  for (const e of gccData(tenant).intakeToday.filter((x) => inWindow(x.receivedAt, w))) {
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
  c.screened += lifecyclesOf(tenant).filter((l) => inWindow(l.capturedAt, w) && l.capturedAt.slice(0, 10) === DEMO_TODAY && l.log.some((e) => e.step === 'screened')).length;
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
  const decided = (g: GateKind) => l.gates.some((x) => x.gate === g);
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

/* -------------------------------------------------------------- health */

export interface HealthVM { health: Health; reason: string | null }

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
 * person can act on; several at-risk reasons are joined.
 */
export function healthOf(l: Lifecycle, tenant: string, now = NOW): HealthVM {
  if (l.closedAt) return { health: l.closedAs ?? 'withdrawn', reason: l.closedNote ?? null };
  const f: StepFacts | undefined = l.facts;
  const wd = deadlineWd(l, tenant);
  const near = wd !== null && wd <= NEAR_WD;
  const gate = openGate(l, now);

  // Blocked: a hard block.
  if (f?.stage === 1 && f.eligibility.fail > 0) return { health: 'blocked', reason: `Eligibility: ${f.eligibility.fail} ${f.eligibility.fail === 1 ? 'line fails' : 'lines fail'}` };
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
    if (f.stale) risks.push(`pack stale since ${f.stale.since.slice(11, 16)} (${f.stale.reason})`);
    if (f.inputs.late > 0) risks.push(`${f.inputs.late} ${f.inputs.late === 1 ? 'input' : 'inputs'} late`);
  }
  if (f?.stage === 5 && f.baseMarginPct < f.minMarginPct) risks.push(`margin ${pct(f.baseMarginPct)} below the ${pct(f.minMarginPct)} minimum`);
  if (f?.stage === 6) {
    if (f.simScore < f.passMark) risks.push(`simulated score ${f.simScore} below the pass mark ${f.passMark}`);
    if (f.sections.late > 0) risks.push(`${f.sections.late} ${f.sections.late === 1 ? 'section' : 'sections'} late`);
  }
  if (f?.stage === 4 && f.durationPlannedM > f.durationRequiredM) risks.push(`programme ${f.durationPlannedM} months against ${f.durationRequiredM} required`);
  if (risks.length) {
    const text = risks.join('; ');
    return { health: 'at-risk', reason: text[0].toUpperCase() + text.slice(1) };
  }
  return { health: 'on-track', reason: null };
}

/* -------------------------------------------------------------- people */

export const teamOf = (tenant: string, teamId: string): Team | undefined =>
  (isGccTenantKey(tenant) ? gccData(tenant).teams : []).find((t) => t.id === teamId);

export const personName = (id: string | null | undefined): string | null => personById(id)?.name ?? null;
