import { useMemo } from 'react';
import type { CountryCode } from '@/data/tenants';
import { DEMO_TODAY, addDays, dateText, weekdayOf } from '@/domain/calendar';
import { calendarBanners, weekendDays, type CalendarBanner, type CalendarItemVM } from '@/domain/gcc/calendar';
import { dayMonth } from '@/domain/gcc/s1/common';
import { usePop } from '@/components/tender/Tip';
import { Chip, type OpenItem } from './Chip';

/**
 * Month view (plan 027b Phase 3): six weeks of seven days, Sunday first (the
 * GCC working week starts on Sunday). The tenant's weekend is shaded, days
 * outside the month are dimmed, today is circled, and Ramadan hours and the
 * public closures run across the days they cover. Each day shows up to three
 * items; "+2 more" lists the rest. Empty space does nothing: the calendar is read only.
 */

const SHOWN = 3;
const WEEKS = 6;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A banner's columns within one week (0–6), or null when it misses the week. */
function span(b: CalendarBanner, start: string): [number, number] | null {
  const end = addDays(start, 6);
  if (b.to < start || b.from > end) return null;
  const a = b.from < start ? 0 : weekdayOf(b.from);
  const z = b.to > end ? 6 : weekdayOf(b.to);
  return [a, z];
}

export function Banners({ banners, start, rowOf }: { banners: CalendarBanner[]; start: string; rowOf: (b: CalendarBanner) => number }) {
  return (
    <>
      {banners.map((b) => {
        const s = span(b, start);
        if (!s) return null;
        return (
          <div
            key={b.key} className={`gcal-banner k-${b.kind}`} title={b.detail}
            style={{ gridColumn: `${s[0] + 1} / ${s[1] + 2}`, gridRow: rowOf(b) }}
          >
            <span className="sr-only">{b.detail}</span>
            <span aria-hidden>{b.label}</span>
          </div>
        );
      })}
    </>
  );
}

function More({ day, items, onOpen }: { day: string; items: CalendarItemVM[]; onOpen: OpenItem }) {
  const pop = usePop<HTMLButtonElement>({ mode: 'click', width: 300, label: `Everything on ${dateText(day)}` });
  const n = items.length - SHOWN;
  return (
    <>
      <button type="button" className="gcal-more" {...pop.menuProps} aria-label={`${n} more on ${dateText(day)}`}>+{n} more</button>
      {pop.render(
        <div className="gcal-day-pop">
          <div className="gcal-day-pop-h">{dateText(day)}</div>
          {items.map((i) => (
            <Chip
              key={i.id} item={i}
              // The list closes first; focus returns to "+n more" when the detail closes.
              onOpen={(item) => { const btn = pop.menuProps.ref.current; pop.close(); if (btn) onOpen(item, btn); }}
            />
          ))}
        </div>,
        'gcal-pop',
      )}
    </>
  );
}

export function MonthView({ month, from, items, cc, onOpen }: {
  /** The first of the month shown, `YYYY-MM-01`. */
  month: string;
  /** The Sunday the grid starts on. */
  from: string;
  items: CalendarItemVM[];
  cc: CountryCode;
  onOpen: OpenItem;
}) {
  const weekend = weekendDays(cc);
  const to = addDays(from, WEEKS * 7 - 1);
  const banners = useMemo(() => calendarBanners(cc, from, to), [cc, from, to]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItemVM[]>();
    for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return m;
  }, [items]);
  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7);
  const rowOf = (b: CalendarBanner) => (b.kind === 'ramadan' ? 2 : 3);

  return (
    <div className="gcal-month">
      <div className="gcal-dow" aria-hidden>
        {DOW.map((n, i) => <div key={n} className={weekend.includes(i) ? 'we' : ''}>{n}</div>)}
      </div>
      {Array.from({ length: WEEKS }, (_, w) => {
        const start = addDays(from, w * 7);
        const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
        return (
          <div key={start} className="gcal-week">
            {days.map((d, i) => (
              <div key={`bg:${d}`} className={`gcal-cell ${weekend.includes(i) ? 'we' : ''} ${inMonth(d) ? '' : 'out'}`} style={{ gridColumn: i + 1 }} aria-hidden />
            ))}
            {days.map((d, i) => {
              const today = d === DEMO_TODAY;
              return (
                <div key={`n:${d}`} className={`gcal-num ${d < DEMO_TODAY ? 'past' : ''} ${inMonth(d) ? '' : 'out'} ${today ? 'today' : ''}`} style={{ gridColumn: i + 1 }}>
                  <span className="n" aria-hidden>{d.endsWith('-01') ? dayMonth(d) : Number(d.slice(8))}</span>
                  {today && <span className="gcal-today" aria-hidden>Today</span>}
                  <span className="sr-only">{dateText(d)}{today ? ', today' : ''}</span>
                </div>
              );
            })}
            <Banners banners={banners} start={start} rowOf={rowOf} />
            {days.map((d, i) => {
              const all = byDay.get(d) ?? [];
              return (
                <div key={`i:${d}`} className="gcal-items" style={{ gridColumn: i + 1 }}>
                  {all.slice(0, SHOWN).map((it) => <Chip key={it.id} item={it} onOpen={onOpen} />)}
                  {all.length > SHOWN && <More day={d} items={all} onOpen={onOpen} />}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
