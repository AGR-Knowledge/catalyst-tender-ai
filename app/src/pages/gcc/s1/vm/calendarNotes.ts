import { CALENDARS } from '@/data/gcc/calendar';
import type { CountryCode } from '@/data/tenants';
import { dateText, rangeText, weekendText } from '@/domain/calendar';

/**
 * The working calendar that applies between two dates, in words (spec §5.7,
 * §6.7): the weekend, Ramadan's reduced public-sector hours and the public
 * closures in the window. Moon-sighting dates always say "expected".
 */
export function calendarNotes(cc: CountryCode, from: string, to: string): { key: string; text: string }[] {
  const cal = CALENDARS[cc];
  const out = [{ key: 'weekend', text: `Weekend: ${weekendText(cc)}` }];
  const r = cal.ramadan;
  if (r && r.to >= from && r.from <= to) {
    out.push({ key: 'ramadan', text: `Ramadan reduced hours${r.expected ? ' (expected)' : ''}: the public sector works ${r.hours} until ${dateText(r.to)}` });
  }
  for (const c of cal.closures.filter((x) => x.to >= from && x.from <= to)) {
    out.push({ key: `closure:${c.from}`, text: `${c.name}: public-sector closure ${c.expected ? 'expected ' : ''}${rangeText(c.from, c.to)}${c.expected ? '. Dates depend on moon sighting' : ''}` });
  }
  return out;
}
