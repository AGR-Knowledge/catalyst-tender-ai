import { DEMO_TODAY } from '@/domain/calendar';
import { addDays, isWorkingDay } from './chain';
import type { CountryCode } from '@/data/tenants';
import type { IntakeEvent, TenantSeed } from '../types';
import type { GccTenantKey } from '../index';
import { POOLS } from './pools';
import { rngOf, type Rng } from './rng';
import { FLOW_TARGETS, HISTORY_FROM, WINDOW_FROM, WINDOW_KEYS } from './targets';
import type { IntakeDay, Lifecycle } from './types';

/**
 * Capture volumes for the 730 days before today (plan 017 §3.3.6, plan 039).
 * Today's captures are plan 004's `intakeToday` events, so they are counted
 * once.
 *
 * Per window, the sums equal the targets (`FLOW_TARGETS`): new notices
 * (`logged`), re-issued ones (`linked`, the funnel's "previous") and the new
 * ones that passed the AI initial screening (`passed`). Najd has a target per
 * window; the other tenants for 12 months and All. Working days carry the
 * volume; weekends and closures get a trickle. A day never has fewer captures
 * than the lifecycles captured on it. The new notices of the last 30 days are
 * the ones still open for bids now (`open`).
 */

/** A new notice, the way the intake screen counts it (`domain/gcc/s1/intake.ts`). */
export const isNewNotice = (e: IntakeEvent) => e.disposition !== 'addendum' && e.disposition !== 'duplicate';

/** Najd's one missed notice in the year: the reconciliation of a working day in October 2025. */
const NAJD_MISSED_FROM = '2025-10-14';

/** Intake-to-logged minutes for one notice: p90 about 12 minutes, the odd slow one near 20. */
function minutesFor(r: Rng): number {
  const p = r.next();
  if (p < 0.6) return r.int(3, 7);
  if (p < 0.86) return r.int(8, 10);
  if (p < 0.96) return r.int(11, 14);
  return r.int(15, 22);
}

interface DayBand { from: string; to: string; total: number }

/** Spreads `total` over the days by weight, never below each day's floor. */
function spread(days: string[], weight: (d: string) => number, floor: Map<string, number>, total: number): Map<string, number> {
  const ws = days.map(weight);
  const W = ws.reduce((s, w) => s + w, 0);
  const raw = ws.map((w) => (total * w) / W);
  const n = raw.map(Math.floor);
  let left = total - n.reduce((s, x) => s + x, 0);
  raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach(({ i }) => n[i]++);
  left = 0;
  // Raise days below their floor, taking the difference from the days with the most room.
  days.forEach((d, i) => {
    const need = (floor.get(d) ?? 0) - n[i];
    if (need > 0) { n[i] += need; left += need; }
  });
  while (left > 0) {
    let best = -1;
    days.forEach((d, i) => {
      const room = n[i] - (floor.get(d) ?? 0);
      if (room > 0 && (best < 0 || room > n[best] - (floor.get(days[best]) ?? 0))) best = i;
    });
    if (best < 0) throw new Error(`Intake: the lifecycles capture more than ${total} notices between ${days[0]} and ${days[days.length - 1]}`);
    n[best]--;
    left--;
  }
  return new Map(days.map((d, i) => [d, n[i]]));
}

/** Today's intake events, the way `capturesIn` counts them: new, linked (previous) and passed (shortlisted or routed to validation). */
export function todayCounts(seed: TenantSeed): Record<Metric, number> {
  const news = seed.intakeToday.filter(isNewNotice);
  return {
    captured: news.length,
    previous: seed.intakeToday.length - news.length,
    passed: news.filter(isPassed).length,
  };
}

/** A new notice of today that passed the AI initial screening. */
export const isPassed = (e: IntakeEvent) => e.disposition === 'shortlisted' || e.disposition === 'needs-validation';

type Metric = 'captured' | 'previous' | 'passed';

/** The disjoint day bands of one metric, innermost first: each window's target less the window inside it (or today's events). */
function bandsOf(tenant: GccTenantKey, metric: Metric, today: number): DayBand[] {
  const targets = FLOW_TARGETS[tenant];
  const keys = WINDOW_KEYS.filter((k) => targets[k]?.[metric] !== undefined);
  const bands: DayBand[] = [];
  keys.forEach((k, i) => {
    if (k === 'today') {
      if (targets.today![metric] !== today) throw new Error(`Intake ${tenant}: today's ${metric} is ${today}, the target ${targets.today![metric]}`);
      return;
    }
    const inner = keys[i - 1];
    const total = targets[k]![metric]! - (inner ? targets[inner]![metric]! : today);
    if (total < 0) throw new Error(`Intake ${tenant}: ${metric} in the ${k} band is ${total}`);
    bands.push({ from: WINDOW_FROM[k].slice(0, 10), to: addDays(inner && inner !== 'today' ? WINDOW_FROM[inner].slice(0, 10) : DEMO_TODAY, -1), total });
  });
  return bands;
}

/** `total` over the days in proportion to `per`, never above it. */
function share(days: string[], per: Map<string, number>, total: number): Map<string, number> {
  const W = days.reduce((s, d) => s + (per.get(d) ?? 0), 0);
  if (total > W) throw new Error(`Intake: ${total} passed of ${W} notices between ${days[0]} and ${days[days.length - 1]}`);
  const raw = days.map((d) => (W ? (total * (per.get(d) ?? 0)) / W : 0));
  const n = raw.map(Math.floor);
  const left = total - n.reduce((s, x) => s + x, 0);
  raw.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach(({ i }) => n[i]++);
  return new Map(days.map((d, i) => [d, n[i]]));
}

export function intakeDaily(tenant: GccTenantKey, cc: CountryCode, seed: TenantSeed, lifecycles: Lifecycle[]): IntakeDay[] {
  const r = rngOf(`intake:${tenant}`);
  const first = HISTORY_FROM;
  const days: string[] = [];
  for (let d = first; d < DEMO_TODAY; d = addDays(d, 1)) days.push(d);
  const today = todayCounts(seed);

  const byDay = new Map<string, Lifecycle[]>();
  for (const l of lifecycles) {
    const d = l.capturedAt.slice(0, 10);
    if (d >= first && d < DEMO_TODAY) byDay.set(d, [...(byDay.get(d) ?? []), l]);
  }
  const floor = new Map([...byDay].map(([d, ls]) => [d, ls.length]));
  const jitter = new Map(days.map((d) => [d, r.range(0.7, 1.3)]));
  const weight = (d: string) => (isWorkingDay(d, cc) ? 1 : 0.1) * jitter.get(d)!;
  const inBand = (b: DayBand) => days.filter((d) => d >= b.from && d <= b.to);

  const count = new Map<string, number>();
  for (const b of bandsOf(tenant, 'captured', today.captured)) for (const [d, n] of spread(inBand(b), weight, floor, b.total)) count.set(d, n);
  const linked = new Map<string, number>();
  for (const b of bandsOf(tenant, 'previous', today.previous)) for (const [d, n] of spread(inBand(b), weight, new Map(), b.total)) linked.set(d, n);
  const passed = new Map<string, number>();
  for (const b of bandsOf(tenant, 'passed', today.passed)) for (const [d, n] of share(inBand(b), count, b.total)) passed.set(d, n);
  const openFrom = WINDOW_FROM['30d'].slice(0, 10);

  const mix = POOLS[tenant].sourceMix;
  const missedDay = tenant === 'najd' ? days.find((d) => d >= NAJD_MISSED_FROM && isWorkingDay(d, cc)) : undefined;
  return days.map((date) => {
    const n = count.get(date) ?? 0;
    const bySource: Record<string, number> = {};
    for (const l of byDay.get(date) ?? []) bySource[l.source.sourceId] = (bySource[l.source.sourceId] ?? 0) + 1;
    for (let i = (byDay.get(date) ?? []).length; i < n; i++) {
      const s = r.weighted(mix);
      bySource[s] = (bySource[s] ?? 0) + 1;
    }
    return {
      date, bySource,
      linked: linked.get(date) ?? 0,
      logged: n, screened: n,
      minutes: Array.from({ length: n }, () => minutesFor(r)),
      missed: date === missedDay ? 1 : 0,
      passed: passed.get(date) ?? 0,
      open: date >= openFrom ? n : 0,
    };
  });
}
