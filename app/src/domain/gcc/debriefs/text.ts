import { DEMO_TODAY, dateText } from '@/domain/calendar';

/** Dates in the debriefs' sentences, as the dashboards write them. */

const DEMO_YEAR = DEMO_TODAY.slice(0, 4);

/** "Thu 12 Mar", with the year only outside the demo year. */
export const dayText = (iso: string) => {
  const d = dateText(iso.slice(0, 10));
  return iso.startsWith(DEMO_YEAR) ? d.replace(/ \d{4}$/, '') : d;
};

/** "Thu 12 Mar, 10:00". */
export const dayTimeText = (iso: string) => (iso.length > 10 ? `${dayText(iso)}, ${iso.slice(11, 16)}` : dayText(iso));

/** "5 Mar": a tile's date, without the weekday. */
export const dmText = (iso: string) => dayText(iso).replace(/^\w{3} /, '');

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;
