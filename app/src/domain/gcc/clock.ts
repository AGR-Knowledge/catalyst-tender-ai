import type { Tone } from '@/data/types';
import { SLA_AT_RISK_SHARE, SLA_OK_SHARE } from '@/data/gcc/targets';
import { DEMO_TIME, DEMO_TODAY } from '@/domain/calendar';

/**
 * The demo clock for GCC screens: Sun 8 Mar 2026, 10:00 in the tenant's own
 * time zone. Times are tenant-local ISO date-times (`YYYY-MM-DDTHH:MM`), so
 * arithmetic treats them as one shared wall clock.
 */

export const DEMO_NOW = `${DEMO_TODAY}T${DEMO_TIME}`;

const MIN_MS = 60_000;

/** Minutes since the epoch for a local date or date-time. */
const minutesOf = (iso: string) => Date.parse(`${iso.length <= 10 ? `${iso}T00:00` : iso.slice(0, 16)}:00Z`) / MIN_MS;

/** Whole minutes from `a` to `b` (negative when `b` is earlier). */
export const minutesBetween = (a: string, b: string) => Math.round(minutesOf(b) - minutesOf(a));

/** `iso` plus some hours, as a local date-time. */
export const addHours = (iso: string, h: number) => new Date((minutesOf(iso) + h * 60) * MIN_MS).toISOString().slice(0, 16);

/** "9 h 40 m", "30 h", "25 m". */
export function durationText(minutes: number): string {
  const m = Math.abs(Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} m`;
  return r ? `${h} h ${r} m` : `${h} h`;
}

export interface SlaState {
  /** Minutes left; negative once breached. */
  leftMin: number;
  totalMin: number;
  /** Share of the SLA left, 0–1 (0 once breached). */
  share: number;
  breached: boolean;
  /** Green above half, orange at a quarter or less, red once breached (ui-direction §6.2). */
  tone: Tone;
  /** "9 h 40 m left of 24 h", or "Late by 3 h". */
  text: string;
}

/** An SLA running from `start` to `end`, read at the demo clock (or `now`). */
export function slaState(start: string, end: string, now: string = DEMO_NOW): SlaState {
  const totalMin = Math.max(1, minutesBetween(start, end));
  const leftMin = minutesBetween(now, end);
  const breached = leftMin < 0;
  const share = breached ? 0 : Math.min(1, leftMin / totalMin);
  const tone: Tone = breached ? 'red' : share <= SLA_AT_RISK_SHARE ? 'orange' : share > SLA_OK_SHARE ? 'green' : 'ink';
  const text = breached ? `Late by ${durationText(-leftMin)}` : `${durationText(leftMin)} left of ${durationText(totalMin)}`;
  return { leftMin, totalMin, share, breached, tone, text };
}

/** "10 min ago", "3 h ago", "2 days ago", from the demo clock. */
export function agoText(iso: string, now: string = DEMO_NOW): string {
  const m = minutesBetween(iso, now);
  if (m < 0) return `in ${durationText(-m)}`;
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h ago`;
  const d = Math.floor(m / (24 * 60));
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
