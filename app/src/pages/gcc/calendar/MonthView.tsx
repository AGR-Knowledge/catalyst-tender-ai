import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CountryCode } from '@/data/tenants';
import { DEMO_TODAY, addDays, calendarDaysBetween, dateText, weekdayOf } from '@/domain/calendar';
import { byImportance, calendarBanners, weekendDays, type CalendarBanner, type CalendarItemVM } from '@/domain/gcc/calendar';
import { dayMonth, plural } from '@/domain/gcc/s1/common';
import { Chip, type OpenDay, type OpenItem } from './Chip';

/**
 * Month view (plan 027b Phase 3; orchestrator follow-up 2026-09-28): the weeks
 * the month needs, from the first working day of the tenant's country (Sunday
 * in KSA, Monday in the UAE). The grid fits the window and never scrolls: each
 * day lists its items most important first, as many as its cell holds, and
 * folds the rest into "+n more", which opens the whole day, as does the date.
 * The weekend is hatched, days outside the month are dimmed, today is filled,
 * and Ramadan hours and the public closures run across the days they cover.
 */

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** A chip's height and the gap between chips, in pixels: `.gcal-chip` and `.gcal-items` in calendar.css. */
const CHIP = 20;
const GAP = 2;
/** Chips a cell holds before it is measured. */
const FALLBACK = 3;
/** The shortest a week may be, in pixels: its date, a banner and two chips (so one item and "+n more"). */
const MIN_WEEK = 88;

/** A banner's columns within a run of `len` days from `start` (0-based), or null when it misses them. */
function span(b: CalendarBanner, start: string, len: number): [number, number] | null {
  const end = addDays(start, len - 1);
  if (b.to < start || b.from > end) return null;
  return [b.from < start ? 0 : calendarDaysBetween(start, b.from), b.to > end ? len - 1 : calendarDaysBetween(start, b.to)];
}

export function Banners({ banners, start, len, row }: { banners: CalendarBanner[]; start: string; len: number; row: number }) {
  return (
    <>
      {banners.map((b) => {
        const s = span(b, start, len);
        if (!s) return null;
        return (
          <div key={b.key} className={`gcal-banner k-${b.kind}`} title={b.detail} style={{ gridColumn: `${s[0] + 1} / ${s[1] + 2}`, gridRow: row }}>
            <span className="sr-only">{b.detail}</span>
            <span aria-hidden>{b.label}</span>
          </div>
        );
      })}
    </>
  );
}

/** "+2 more": opens the whole day. */
export function More({ day, n, onDay }: { day: string; n: number; onDay: OpenDay }) {
  return (
    <button type="button" className="gcal-more" aria-label={`${n} more on ${dateText(day)}: open the day`} onClick={(e) => onDay(day, e.currentTarget)}>
      +{n} more
    </button>
  );
}

/** How many chips each week's cells hold, from the height the grid gives them. */
function useCapacity(weeks: number) {
  const box = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<number[]>([]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const next = Array.from(el.querySelectorAll<HTMLElement>('.gcal-week')).map((w) => {
        const cell = w.querySelector<HTMLElement>('.gcal-items');
        if (!cell) return FALLBACK;
        const cs = getComputedStyle(cell);
        const h = cell.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        return Math.max(2, Math.floor((h + GAP) / (CHIP + GAP)));
      });
      setCap((c) => (c.join() === next.join() ? c : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [weeks]);
  return { box, cap };
}

export function MonthView({ month, from, weeks, items, cc, onOpen, onDay }: {
  /** The first of the month shown, `YYYY-MM-01`. */
  month: string;
  /** The first working day the grid starts on. */
  from: string;
  weeks: number;
  items: CalendarItemVM[];
  cc: CountryCode;
  onOpen: OpenItem;
  onDay: OpenDay;
}) {
  const weekend = weekendDays(cc);
  const to = addDays(from, weeks * 7 - 1);
  const banners = useMemo(() => calendarBanners(cc, from, to), [cc, from, to]);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItemVM[]>();
    for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    for (const [k, v] of m) m.set(k, byImportance(v));
    return m;
  }, [items]);
  const { box, cap } = useCapacity(weeks);
  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7);
  const header = Array.from({ length: 7 }, (_, i) => weekdayOf(addDays(from, i)));

  return (
    <div className="gcal-month" ref={box} style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(${MIN_WEEK}px, 1fr))` }}>
      <div className="gcal-dow" aria-hidden>
        {header.map((wd) => (
          <div key={wd} className={weekend.includes(wd) ? 'we' : ''}>
            {WEEKDAY[wd]}{weekend.includes(wd) && <span className="we-l">Weekend</span>}
          </div>
        ))}
      </div>
      {Array.from({ length: weeks }, (_, w) => {
        const start = addDays(from, w * 7);
        const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
        const fits = cap[w] ?? FALLBACK;
        return (
          <div key={start} className="gcal-week">
            {days.map((d, i) => (
              <div
                key={`bg:${d}`} style={{ gridColumn: i + 1 }} aria-hidden
                className={`gcal-cell ${weekend.includes(weekdayOf(d)) ? 'we' : ''} ${inMonth(d) ? '' : 'out'} ${d === DEMO_TODAY ? 'today' : ''}`}
              />
            ))}
            {days.map((d, i) => {
              const today = d === DEMO_TODAY;
              const n = byDay.get(d)?.length ?? 0;
              const cls = `gcal-num ${d < DEMO_TODAY ? 'past' : ''} ${inMonth(d) ? '' : 'out'} ${today ? 'today' : ''}`;
              const label = <span className="n" aria-hidden>{d.endsWith('-01') ? dayMonth(d) : Number(d.slice(8))}</span>;
              const said = `${dateText(d)}${today ? ', today' : ''}`;
              return (
                <div key={`n:${d}`} className={cls} style={{ gridColumn: i + 1 }}>
                  {n ? (
                    <button type="button" className="gcal-num-btn" onClick={(e) => onDay(d, e.currentTarget)} aria-label={`${said}: ${plural(n, 'item')}. Open the day`}>{label}</button>
                  ) : (
                    <>{label}<span className="sr-only">{said}</span></>
                  )}
                  {today && <span className="gcal-today" aria-hidden>Today</span>}
                </div>
              );
            })}
            <Banners banners={banners} start={start} len={7} row={2} />
            {days.map((d, i) => {
              const all = byDay.get(d) ?? [];
              // A full cell keeps its last line for "+n more".
              const shown = all.length > fits ? all.slice(0, fits - 1) : all;
              return (
                <div key={`i:${d}`} className="gcal-items" style={{ gridColumn: i + 1 }}>
                  {shown.map((it) => <Chip key={it.id} item={it} onOpen={onOpen} />)}
                  {shown.length < all.length && <More day={d} n={all.length - shown.length} onDay={onDay} />}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
