import { TODAY_ISO } from '@/data/tenders';
import { CALENDARS, type Closure } from '@/data/gcc/calendar';
import type { CountryCode } from '@/data/tenants';

/**
 * Dates as the authority keeps them (ui-direction §7.2): local time with its
 * zone label, calendar days and working days for anything with a deadline,
 * and "expected" on every moon-sighting date. Dates are ISO `YYYY-MM-DD`.
 */

export { TODAY_ISO };
/** Demo "today", one source with the legacy screens. */
export const DEMO_TODAY = TODAY_ISO;
/** Demo time of day, in the active tenant's time zone. */
export const DEMO_TIME = '10:00';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 0 = Sunday … 6 = Saturday. */
export const weekdayOf = (iso: string) => new Date(utc(iso)).getUTCDay();

export const calendarDaysBetween = (fromIso: string, toIso: string) => Math.round((utc(toIso) - utc(fromIso)) / DAY_MS);

export const addDays = (iso: string, n: number) => isoOf(utc(iso) + n * DAY_MS);

const closureOn = (iso: string, cc: CountryCode): Closure | undefined =>
  CALENDARS[cc].closures.find((c) => iso >= c.from && iso <= c.to);

export const isWeekend = (iso: string, cc: CountryCode) => CALENDARS[cc].weekend.includes(weekdayOf(iso));

export const isWorkingDay = (iso: string, cc: CountryCode) => !isWeekend(iso, cc) && !closureOn(iso, cc);

/** Working days after `fromIso` up to and including `toIso`. Negative when `toIso` is earlier. */
export function workingDaysBetween(fromIso: string, toIso: string, cc: CountryCode): number {
  if (toIso < fromIso) return -workingDaysBetween(toIso, fromIso, cc);
  let n = 0;
  for (let d = addDays(fromIso, 1); d <= toIso; d = addDays(d, 1)) if (isWorkingDay(d, cc)) n++;
  return n;
}

export type DayFlagKey = 'weekend' | 'ramadan-hours' | 'closure-expected' | 'closure';

export interface DayFlag { key: DayFlagKey; label: string; detail: string }

/** The `When` flag slot: "Weekend", "Ramadan hours", "Eid holiday expected". */
export function dayFlags(iso: string, cc: CountryCode): DayFlag[] {
  const cal = CALENDARS[cc];
  const flags: DayFlag[] = [];
  const closure = closureOn(iso, cc);
  if (closure) {
    const holiday = closure.name.startsWith('Eid') ? 'Eid holiday' : closure.name;
    flags.push(closure.expected
      ? { key: 'closure-expected', label: `${holiday} expected`, detail: `${closure.name} public-sector closure expected ${rangeText(closure.from, closure.to)}. Dates depend on moon sighting` }
      : { key: 'closure', label: 'Public holiday', detail: `${closure.name}, ${dateText(closure.from)}` });
  }
  if (isWeekend(iso, cc)) flags.push({ key: 'weekend', label: 'Weekend', detail: `${weekendText(cc)} is the weekend` });
  const r = cal.ramadan;
  if (r && !closure && !isWeekend(iso, cc) && iso >= r.from && iso <= r.to) {
    flags.push({ key: 'ramadan-hours', label: 'Ramadan hours', detail: `Public sector works ${r.hours}${r.expected ? ' (expected)' : ''} until ${dateText(r.to)}` });
  }
  return flags;
}

/** "Sun 8 Mar 2026". */
export function dateText(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${WEEKDAYS[weekdayOf(iso)]} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "Thu 19 – Sat 28 Mar 2026". */
export function rangeText(fromIso: string, toIso: string): string {
  if (fromIso === toIso) return dateText(fromIso);
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm] = toIso.split('-').map(Number);
  const head = fy !== ty ? dateText(fromIso) : fm !== tm ? `${WEEKDAYS[weekdayOf(fromIso)]} ${fd} ${MONTHS[fm - 1]}` : `${WEEKDAYS[weekdayOf(fromIso)]} ${fd}`;
  return `${head} – ${dateText(toIso)}`;
}

/** "Sun 10 May 2026, 10:00 AST". */
export function whenText(iso: string, time?: string, tzLabel?: string): string {
  const day = dateText(iso);
  if (!time) return day;
  return `${day}, ${time}${tzLabel ? ` ${tzLabel}` : ''}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${Math.abs(n) === 1 ? one : many}`;

/** "63 days · 42 working days". */
export function countdownText(fromIso: string, toIso: string, cc: CountryCode): string {
  return `${plural(calendarDaysBetween(fromIso, toIso), 'day')} · ${plural(workingDaysBetween(fromIso, toIso, cc), 'working day')}`;
}

/** "Fri–Sat". */
export function weekendText(cc: CountryCode): string {
  return CALENDARS[cc].weekend.map((d) => WEEKDAYS[d]).join('–');
}
