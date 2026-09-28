import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CountryCode } from '@/data/tenants';
import { DEMO_TIME, DEMO_TODAY, addDays, dateText } from '@/domain/calendar';
import { calendarBanners, itemLabel, weekendDays, type CalendarBanner, type CalendarItemVM } from '@/domain/gcc/calendar';
import { Banners } from './MonthView';
import { Chip, type OpenItem } from './Chip';

/**
 * Week view (plan 027b Phase 4): seven day columns, Sunday first, with the
 * tenant's weekend shaded; an all-day lane on top (untimed items, Ramadan
 * hours and closures), then 07:00 to 19:00 in half hours. A timed item sits at
 * its time, 45 minutes tall, side by side with any item it overlaps; one
 * before or after those hours sits at the grid's edge with its time shown.
 * A red line marks the demo clock on today. The grid scrolls to 08:00.
 */

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Layout, in minutes from midnight and pixels. */
const FIRST = 7 * 60;
const LAST = 19 * 60;
const SLOT = 30;
const ROW = 22;
const LENGTH = 45;
const OPEN_AT = 8 * 60;
const HEIGHT = ((LAST - FIRST) / SLOT) * ROW;
const px = (min: number) => ((min - FIRST) / SLOT) * ROW;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

interface Placed { item: CalendarItemVM; top: number; lane: number; lanes: number; edge: 'before' | 'after' | null }

/** Items of one day at their time, in lanes where they overlap. */
function place(items: CalendarItemVM[]): Placed[] {
  const block = (ROW * LENGTH) / SLOT;
  const rows = items.map((item) => {
    const m = minutesOf(item.time!);
    const edge = m < FIRST ? 'before' as const : m + LENGTH > LAST ? 'after' as const : null;
    return { item, top: Math.min(Math.max(px(m), 0), HEIGHT - block), lane: 0, lanes: 1, edge };
  }).sort((a, b) => a.top - b.top);
  // Clusters of blocks that overlap one another share the width.
  let cluster: typeof rows = [];
  let end = -1;
  const close = () => { const n = Math.max(...cluster.map((c) => c.lane)) + 1; cluster.forEach((c) => { c.lanes = n; }); };
  for (const r of rows) {
    if (cluster.length && r.top >= end) { close(); cluster = []; }
    const busy = new Set(cluster.filter((c) => c.top + block > r.top).map((c) => c.lane));
    let lane = 0;
    while (busy.has(lane)) lane++;
    r.lane = lane;
    cluster.push(r);
    end = Math.max(end, r.top + block);
  }
  if (cluster.length) close();
  return rows;
}

export function WeekView({ from, items, cc, onOpen }: { from: string; items: CalendarItemVM[]; cc: CountryCode; onOpen: OpenItem }) {
  const weekend = weekendDays(cc);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const to = days[6];
  const banners = useMemo(() => calendarBanners(cc, from, to), [cc, from, to]);
  const scroller = useRef<HTMLDivElement>(null);
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItemVM[]>();
    for (const i of items) m.set(i.date, [...(m.get(i.date) ?? []), i]);
    return m;
  }, [items]);
  const rowOf = (b: CalendarBanner) => (b.kind === 'ramadan' ? 1 : 2);
  const hours = Array.from({ length: (LAST - FIRST) / 60 }, (_, i) => FIRST + i * 60);

  // Open at 08:00, or at the hour of an earlier item this week, so nothing starts out of view.
  const earliest = Math.min(OPEN_AT, ...items.filter((i) => i.time).map((i) => Math.floor(minutesOf(i.time!) / 60) * 60));
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = Math.max(0, px(earliest));
  }, [from]); // Only when the week changes, not when a filter does.

  return (
    <div className="gcal-wk">
      <div className="gcal-wk-head">
        <div className="gcal-wk-gut" aria-hidden />
        {days.map((d, i) => (
          <div key={d} className={`gcal-wk-day ${weekend.includes(i) ? 'we' : ''} ${d === DEMO_TODAY ? 'today' : ''} ${d < DEMO_TODAY ? 'past' : ''}`}>
            <span className="dn" aria-hidden>{DOW[i]}</span>
            <span className="n" aria-hidden>{Number(d.slice(8))}</span>
            {d === DEMO_TODAY && <span className="gcal-today" aria-hidden>Today</span>}
            <span className="sr-only">{dateText(d)}{d === DEMO_TODAY ? ', today' : ''}</span>
          </div>
        ))}
      </div>

      <div className="gcal-wk-lane">
        <div className="gcal-wk-gut lbl">All day</div>
        <div className="gcal-wk-lane-days">
          {days.map((d, i) => <div key={`bg:${d}`} className={`gcal-cell ${weekend.includes(i) ? 'we' : ''}`} style={{ gridColumn: i + 1 }} aria-hidden />)}
          <Banners banners={banners} start={from} rowOf={rowOf} />
          {days.map((d, i) => (
            <div key={`i:${d}`} className="gcal-items" style={{ gridColumn: i + 1, gridRow: 3 }}>
              {(byDay.get(d) ?? []).filter((it) => !it.time).map((it) => <Chip key={it.id} item={it} onOpen={onOpen} />)}
            </div>
          ))}
        </div>
      </div>

      <div className="gcal-wk-scroll" ref={scroller}>
        <div className="gcal-wk-grid" style={{ height: HEIGHT, ['--row' as string]: `${ROW}px` }}>
          <div className="gcal-wk-gut hours" aria-hidden>
            {hours.map((m) => <span key={m} style={{ top: px(m) }}>{`${String(m / 60).padStart(2, '0')}:00`}</span>)}
          </div>
          {days.map((d, i) => (
            <div key={d} className={`gcal-wk-col ${weekend.includes(i) ? 'we' : ''}`}>
              {place((byDay.get(d) ?? []).filter((it) => it.time)).map((p) => {
                const label = itemLabel(p.item);
                return (
                  <button
                    key={p.item.id} type="button"
                    className={`gcal-ev gcal-c-${p.item.category} ${p.item.past ? 'past' : ''} ${p.edge ? `edge ${p.edge}` : ''}`}
                    style={{ top: p.top, height: (ROW * LENGTH) / SLOT, left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`, width: `calc(${100 / p.lanes}% - 4px)` }}
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
              {d === DEMO_TODAY && <div className="gcal-now" style={{ top: px(minutesOf(DEMO_TIME)) }} aria-hidden />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
