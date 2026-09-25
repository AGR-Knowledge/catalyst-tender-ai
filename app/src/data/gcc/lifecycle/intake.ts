import { DEMO_TODAY } from '@/domain/calendar';
import { addDays, isWorkingDay } from './chain';
import type { CountryCode } from '@/data/tenants';
import type { IntakeEvent, TenantSeed } from '../types';
import type { GccTenantKey } from '../index';
import { POOLS } from './pools';
import { rngOf, type Rng } from './rng';
import { FLOW_TARGETS, WINDOW_FROM, WINDOW_KEYS } from './targets';
import type { IntakeDay, Lifecycle } from './types';

/**
 * Capture volumes for the 365 days before today (plan 017 §3.3.6). Today's
 * captures are plan 004's `intakeToday` events, so they are counted once.
 *
 * Najd's sums per window equal the "Notices captured" row of dashboards.md
 * §12.3. The other tenants capture in the ratio Najd has to its DG1 decisions
 * over 12 months. Working days carry the volume; weekends and closures get a
 * trickle. A day never has fewer captures than the lifecycles captured on it.
 */

/** A new notice, the way the intake screen counts it (`domain/gcc/s1/intake.ts`). */
export const isNewNotice = (e: IntakeEvent) => e.disposition !== 'addendum' && e.disposition !== 'duplicate';

const NAJD_12M = FLOW_TARGETS.najd['12m']!;
/** Notices captured per DG1 decision over 12 months, from Najd's row. */
const NOTICES_PER_DG1 = NAJD_12M.captured! / NAJD_12M.dg1.total;

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

export function intakeDaily(tenant: GccTenantKey, cc: CountryCode, seed: TenantSeed, lifecycles: Lifecycle[]): IntakeDay[] {
  const r = rngOf(`intake:${tenant}`);
  const first = addDays(DEMO_TODAY, -365);
  const days: string[] = [];
  for (let d = first; d < DEMO_TODAY; d = addDays(d, 1)) days.push(d);

  const today = seed.intakeToday.filter(isNewNotice).length;
  const targets = FLOW_TARGETS[tenant];
  const bands: DayBand[] = [];
  if (tenant === 'najd') {
    // Window sums minus the window inside: today, 2–7 Mar, 7 Feb – 1 Mar, and so on.
    const keys = WINDOW_KEYS.filter((k) => targets[k]?.captured !== undefined);
    keys.forEach((k, i) => {
      if (k === 'today') return;
      const inner = keys[i - 1];
      bands.push({
        from: WINDOW_FROM[k].slice(0, 10), to: addDays(WINDOW_FROM[inner].slice(0, 10), -1),
        total: targets[k]!.captured! - targets[inner]!.captured!,
      });
    });
  } else {
    bands.push({ from: WINDOW_FROM['12m'].slice(0, 10), to: addDays(DEMO_TODAY, -1), total: Math.round(NOTICES_PER_DG1 * targets['12m']!.dg1.total) - today });
  }
  // The day before the 12 months counts in no window: an ordinary day.
  const before = { from: first, to: addDays(WINDOW_FROM['12m'].slice(0, 10), -1) };

  const byDay = new Map<string, Lifecycle[]>();
  for (const l of lifecycles) {
    const d = l.capturedAt.slice(0, 10);
    if (d >= first && d < DEMO_TODAY) byDay.set(d, [...(byDay.get(d) ?? []), l]);
  }
  const floor = new Map([...byDay].map(([d, ls]) => [d, ls.length]));
  const jitter = new Map(days.map((d) => [d, r.range(0.7, 1.3)]));
  const weight = (d: string) => (isWorkingDay(d, cc) ? 1 : 0.1) * jitter.get(d)!;

  const count = new Map<string, number>();
  for (const b of bands) {
    const span = days.filter((d) => d >= b.from && d <= b.to);
    for (const [d, n] of spread(span, weight, floor, b.total)) count.set(d, n);
  }
  const year = days.filter((d) => d >= WINDOW_FROM['12m'].slice(0, 10));
  const perWeight = year.reduce((s, d) => s + (count.get(d) ?? 0), 0) / year.reduce((s, d) => s + weight(d), 0);
  for (const d of days.filter((x) => x >= before.from && x <= before.to)) count.set(d, Math.max(floor.get(d) ?? 0, Math.round(perWeight * weight(d))));

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
      linked: Math.round(n * r.range(0.05, 0.15)),
      logged: n, screened: n,
      minutes: Array.from({ length: n }, () => minutesFor(r)),
      missed: date === missedDay ? 1 : 0,
    };
  });
}
