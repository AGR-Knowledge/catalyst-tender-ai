import { DEMO_TODAY, calendarDaysBetween, countdownText, whenText } from '@/domain/calendar';
import { useTenant } from '@/domain/tenancy';
import type { Tone } from '@/data/types';
import type { CountryCode } from '@/data/tenants';
import './tender.css';

/** "in 63 days · 42 working days", "today", or "3 days ago", from the demo date, in the tenant's working calendar. */
export function countdownLabel(date: string, cc: CountryCode): string {
  const d = calendarDaysBetween(DEMO_TODAY, date);
  if (d === 0) return 'today';
  if (d < 0) return d === -1 ? 'yesterday' : `${-d} days ago`;
  return `in ${countdownText(DEMO_TODAY, date, cc)}`;
}

/** "Sun 10 May 2026, 10:00 AST"; `short` drops the year: "Thu 12 Mar, 10:00". */
export function whenLabel(date: string, time?: string, tz?: string, short = false): string {
  const text = whenText(date, time, tz);
  return short ? text.replace(/ \d{4}(?=,|$)/, '') : text;
}

/**
 * A date in the authority's time zone (ui-direction §7.2), with an optional
 * countdown in calendar and working days.
 */
export function When({ date, time, tz, countdown = false, short = false, tone }: {
  date: string; time?: string; tz?: string; countdown?: boolean; short?: boolean; tone?: Tone;
}) {
  const t = useTenant();
  const text = whenLabel(date, time, time ? tz ?? t.tzLabel : undefined, short);
  return (
    <span className={`when ${tone ? `t-${tone}` : ''}`}>
      <span className="num">{text}</span>
      {countdown && <span className="when-cd">{countdownLabel(date, t.countryCode)}</span>}
    </span>
  );
}
