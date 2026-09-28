import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CountryCode } from '@/data/tenants';
import { DEMO_TIME, DEMO_TODAY, addDays, dateText, weekdayOf } from '@/domain/calendar';
import { byImportance, calendarBanners, itemLabel, weekendDays, type CalendarItemVM } from '@/domain/gcc/calendar';
import { plural } from '@/domain/gcc/s1/common';
import { Banners, More } from './MonthView';
import { Chip, type OpenDay, type OpenItem } from './Chip';

/**
 * Week and work-week views (plan 027b Phase 4; orchestrator follow-up
 * 2026-09-28): the week from the first working day of the tenant's country,
 * all seven days or only the five working ones. An all-day lane on top
 * (untimed items, most important first, and the Ramadan hours and closures),
 * then 07:00 to 19:00, stretched to fit the window. A timed item sits at its
 * time, 45 minutes tall, side by side with any item it overlaps; one before or
 * after those hours sits at the grid's edge with its time shown. A red line
 * marks the demo clock on today.
 */

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** The grid, in minutes from midnight. */
const FIRST = 7 * 60;
const LAST = 19 * 60;
const SPAN = LAST - FIRST;
const LENGTH = 45;
/** Untimed items a day's lane shows before "+n more". */
const LANE = 2;
const pct = (min: number) => `${((min - FIRST) / SPAN) * 100}%`;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

interface Placed { item: CalendarItemVM; start: number; lane: number; lanes: number; edge: 'before' | 'after' | null }

/** Items of one day at their time, in lanes where they overlap. */
function place(items: CalendarItemVM[]): Placed[] {
  const rows = items.map((item) => {
    const m = minutesOf(item.time!);
    const edge = m < FIRST ? 'before' as const : m + LENGTH > LAST ? 'after' as const : null;
    return { item, start: Math.min(Math.max(m, FIRST), LAST - LENGTH), lane: 0, lanes: 1, edge };
  }).sort((a, b) => a.start - b.start);
  // Clusters of blocks that overlap one another share the width.
  let cluster: typeof rows = [];
  let end = -1;
  const close = () => { const n = Math.max(...cluster.map((c) => c.lane)) + 1; cluster.forEach((c) => { c.lanes = n; }); };
  for (const r of rows) {
    if (cluster.length && r.start >= end) { close(); cluster = []; }
    const busy = new Set(cluster.filter((c) => c.start + LENGTH > r.start).map((c) => c.lane));
    let lane = 0;
    while (busy.has(lane)) lane++;
    r.lane = lane;
    cluster.push(r);
    end = Math.max(end, r.start + LENGTH);
  }
  if (cluster.length) close();
  return rows;
}

export function WeekView({ from, days: count, items, cc, onOpen, onDay }: {
  from: string;
  /** 7 for the week, 5 for the work week. */
  days: number;
  items: CalendarItemVM[];
  cc: CountryCode;
  onOpen: OpenItem;
  onDay: OpenDay;
}) {
  const weekend = weekendDays(cc);
  const days = Array.from({ length: count }, (_, i) => addDays(from, i));
  const to = days[days.length - 1];
  const banners = useMemo(() => calendarBanners(cc, from, to), [cc, from, to]);
  const scroller = useRef<HTMLDivElement>(null);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItemVM[]>();
    for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return m;
  }, [items]);
  const hours = Array.from({ length: SPAN / 60 }, (_, i) => FIRST + i * 60);
  const cols = { gridTemplateColumns: `var(--gut) repeat(${count}, minmax(0, 1fr))` };
  const we = (d: string) => (weekend.includes(weekdayOf(d)) ? 'we' : '');

  // Where the window is too short for the whole grid, it scrolls inside: open at 08:00, or at an earlier item's hour.
  const earliest = Math.min(8 * 60, ...items.filter((i) => i.time).map((i) => Math.floor(minutesOf(i.time!) / 60) * 60));
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && el.scrollHeight > el.clientHeight) el.scrollTop = Math.max(0, ((earliest - FIRST) / SPAN) * el.scrollHeight);
  }, [from]); // Only when the week changes, not when a filter does.

  return (
    <div className="gcal-wk">
      <div className="gcal-wk-head" style={cols}>
        <div className="gcal-wk-gut" aria-hidden />
        {days.map((d) => {
          const n = byDay.get(d)?.length ?? 0;
          const said = `${dateText(d)}${d === DEMO_TODAY ? ', today' : ''}`;
          const inner = (
            <>
              <span className="dn" aria-hidden>{WEEKDAY[weekdayOf(d)]}</span>
              <span className="n" aria-hidden>{Number(d.slice(8))}</span>
            </>
          );
          return (
            <div key={d} className={`gcal-wk-day ${we(d)} ${d === DEMO_TODAY ? 'today' : ''} ${d < DEMO_TODAY ? 'past' : ''}`}>
              {n ? (
                <button type="button" className="gcal-num-btn" onClick={(e) => onDay(d, e.currentTarget)} aria-label={`${said}: ${plural(n, 'item')}. Open the day`}>{inner}</button>
              ) : (
                <>{inner}<span className="sr-only">{said}</span></>
              )}
              {d === DEMO_TODAY && <span className="gcal-today" aria-hidden>Today</span>}
              {we(d) && <span className="we-l" aria-hidden>Weekend</span>}
            </div>
          );
        })}
      </div>

      <div className="gcal-wk-lane" style={cols}>
        <div className="gcal-wk-gut lbl">All day</div>
        <div className="gcal-wk-lane-days" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {days.map((d, i) => <div key={`bg:${d}`} className={`gcal-cell ${we(d)}`} style={{ gridColumn: i + 1 }} aria-hidden />)}
          <Banners banners={banners} start={from} len={count} row={1} />
          {days.map((d, i) => {
            const untimed = byImportance((byDay.get(d) ?? []).filter((it) => !it.time));
            const shown = untimed.length > LANE ? untimed.slice(0, LANE - 1) : untimed;
            return (
              <div key={`i:${d}`} className="gcal-items" style={{ gridColumn: i + 1, gridRow: 2 }}>
                {shown.map((it) => <Chip key={it.id} item={it} onOpen={onOpen} />)}
                {shown.length < untimed.length && <More day={d} n={untimed.length - shown.length} onDay={onDay} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="gcal-wk-scroll" ref={scroller}>
        <div className="gcal-wk-grid" style={cols}>
          <div className="gcal-wk-gut hours" aria-hidden>
            {hours.map((m) => <span key={m} style={{ top: pct(m) }}>{`${String(m / 60).padStart(2, '0')}:00`}</span>)}
          </div>
          {days.map((d) => (
            <div key={d} className={`gcal-wk-col ${we(d)} ${d === DEMO_TODAY ? 'today' : ''}`}>
              {place((byDay.get(d) ?? []).filter((it) => it.time)).map((p) => {
                const label = itemLabel(p.item);
                return (
                  <button
                    key={p.item.id} type="button"
                    className={`gcal-ev gcal-c-${p.item.category} ${p.item.past ? 'past' : ''} ${p.edge ? `edge ${p.edge}` : ''}`}
                    style={{ top: pct(p.start), height: `${(LENGTH / SPAN) * 100}%`, left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`, width: `calc(${100 / p.lanes}% - 4px)` }}
                    aria-label={label} title={label}
                    onClick={(e) => onOpen(p.item, e.currentTarget)}
                  >
                    <span className="h" aria-hidden>
                      <span className="gcal-dot" />
                      <span className="t num">{p.edge === 'before' ? '↑ ' : p.edge === 'after' ? '↓ ' : ''}{p.item.time}</span>
                      <span className="l">{p.item.chip}</span>
                      {p.item.flags.length > 0 && <span className="fl">!</span>}
                    </span>
                    {p.item.shortTitle && <span className="s" aria-hidden>{p.item.shortTitle}</span>}
                  </button>
                );
              })}
              {d === DEMO_TODAY && <div className="gcal-now" style={{ top: pct(minutesOf(DEMO_TIME)) }} aria-hidden />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
