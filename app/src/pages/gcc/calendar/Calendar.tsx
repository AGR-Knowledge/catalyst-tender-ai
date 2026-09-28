import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { CountryCode } from '@/data/tenants';
import { DEMO_TODAY, addDays, calendarDaysBetween } from '@/domain/calendar';
import {
  CALENDAR_CATEGORIES, calendarItems, monthGrid, monthTitle, spanTitle, tzNote, weekStart, workDays, workingWeekText,
  type CalendarCategory, type CalendarItemVM,
} from '@/domain/gcc/calendar';
import { profileOf, shortDate } from '@/domain/gcc/s1/common';
import { Card } from '@/components/ui/primitives';
import { usePop } from '@/components/tender/Tip';
import { SourceHost } from '@/components/tender/SourceHost';
import { useS1 } from '../s1/vm/useS1';
import type { OpenDay, OpenItem } from './Chip';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { AgendaView } from './AgendaView';
import { EventModal } from './EventModal';
import { DayModal } from './DayModal';
import './calendar.css';

/**
 * `/calendar` (spec §6.7, plan 027b; orchestrator follow-up 2026-09-28): every
 * submission, site visit, questions deadline, gate decision, supplier quote due
 * and credential renewal across the tenders the viewer may see, as a month, a
 * work week, a week with a time grid, or the agenda list. The month and the
 * weeks fit the window; a full day shows its most important items and folds
 * the rest into "+n more", which opens the whole day. Weeks start on the
 * first working day of the tenant's country. Read only: the view and the date
 * shown are in the URL (`?view=month&d=2026-03-01`), and the last view is
 * remembered in this browser as a convenience.
 */

type View = 'month' | 'workweek' | 'week' | 'agenda';
const VIEWS: { key: View; label: string }[] = [
  { key: 'month', label: 'Month' }, { key: 'workweek', label: 'Work week' }, { key: 'week', label: 'Week' }, { key: 'agenda', label: 'Agenda' },
];
const isView = (v: string | null): v is View => VIEWS.some((x) => x.key === v);
const KEY = 'ctai.calendar.view';
const AGENDA_WEEKS = 4;

function storedView(): View | null {
  try { const v = localStorage.getItem(KEY); return isView(v) ? v : null; } catch { return null; }
}
function storeView(v: View) {
  try { localStorage.setItem(KEY, v); } catch { /* the view still holds for this visit */ }
}

const isIso = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;
/** The first of the month `n` months from the month of `first`. */
function addMonths(first: string, n: number): string {
  const y = Number(first.slice(0, 4));
  const m = Number(first.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12 + 1;
  return `${yy}-${String(mm).padStart(2, '0')}-01`;
}
/** The date a view starts from, for a day inside it. A weekend day opens the work week after it (Sunday in the UAE opens Monday's). */
function anchorOf(view: View, iso: string, cc: CountryCode): string {
  if (view === 'month') return monthStart(iso);
  const start = weekStart(iso, cc);
  return view === 'workweek' && calendarDaysBetween(start, iso) >= workDays(cc) ? addDays(start, 7) : start;
}

interface Range { from: string; to: string; title: string; weeks: number }

function rangeOf(view: View, d: string, cc: CountryCode): Range {
  if (view === 'month') {
    const g = monthGrid(d, cc);
    return { from: g.from, to: g.to, weeks: g.weeks, title: monthTitle(d) };
  }
  const days = view === 'workweek' ? workDays(cc) : view === 'week' ? 7 : AGENDA_WEEKS * 7;
  const to = addDays(d, days - 1);
  return { from: d, to, weeks: Math.ceil(days / 7), title: spanTitle(d, to) };
}

/** "How to read the calendar": what each colour means, the order of a day, the weekend and the banners. */
function HowToRead({ cc, tz }: { cc: CountryCode; tz: string }) {
  const pop = usePop<HTMLButtonElement>({ width: 360, align: 'end' });
  return (
    <>
      <button type="button" className="info-btn gcal-how" aria-label="How to read the calendar" {...pop.triggerProps}>
        <Info size={15} strokeWidth={1.7} aria-hidden />
      </button>
      {pop.render(
        <div className="info-pop gcal-how-pop">
          <div className="ip-t">How to read the calendar</div>
          <ul className="gcal-how-cats">
            {CALENDAR_CATEGORIES.map((c) => (
              <li key={c.key} className={`gcal-c-${c.key}`}><span className="gcal-dot" aria-hidden /><b>{c.label}</b><span>{c.items}</span></li>
            ))}
          </ul>
          <ul className="gcal-how-rules">
            <li>A day lists its items most important first, in the order above; within a kind, a flagged one (!) comes first. When a day is full, “+n more” opens the whole day.</li>
            <li>{workingWeekText(cc)}. Hatched days are the weekend.</li>
            <li>Solid banners are public closures; the dashed one is Ramadan’s reduced public-sector hours. Moon-sighting dates say “expected”.</li>
            <li>A faded item has passed. Today is the filled date. {tz}.</li>
          </ul>
        </div>,
      )}
    </>
  );
}

export default function Calendar() {
  const { tenant, viewer, done } = useS1();
  const profile = profileOf(tenant);
  const cc = profile.countryCode;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = isView(params.get('view')) ? params.get('view') as View : storedView() ?? 'month';
  const raw = params.get('d');
  const d = anchorOf(view, isIso(raw) ? raw : DEMO_TODAY, cc);
  const range = rangeOf(view, d, cc);

  const [onlyMine, setOnlyMine] = useState(false);
  const [hidden, setHidden] = useState<Set<CalendarCategory>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const items = useMemo(() => calendarItems({ tenant, viewer, done, from: range.from, to: range.to }), [tenant, viewer, done, range.from, range.to]);
  const mineOnly = useMemo(() => (onlyMine ? items.filter((i) => i.mine) : items), [items, onlyMine]);
  // The month counts only its own days, not the neighbours' shown around it.
  const counted = useMemo(() => (view === 'month' ? mineOnly.filter((i) => i.date.slice(0, 7) === d.slice(0, 7)) : mineOnly), [mineOnly, view, d]);
  const counts = useMemo(() => Object.fromEntries(CALENDAR_CATEGORIES.map((c) => [c.key, counted.filter((i) => i.category === c.key).length])) as Record<CalendarCategory, number>, [counted]);
  const visible = useMemo(() => mineOnly.filter((i) => !hidden.has(i.category)), [mineOnly, hidden]);

  const go = useCallback((next: View, day: string) => {
    setParams({ view: next, d: anchorOf(next, day, cc) }, { replace: true });
  }, [setParams, cc]);
  const switchTo = (next: View) => {
    storeView(next);
    // Keep today in view when it is; else the start of what is shown.
    const focus = DEMO_TODAY >= range.from && DEMO_TODAY <= range.to && (view !== 'month' || DEMO_TODAY.slice(0, 7) === d.slice(0, 7)) ? DEMO_TODAY : d;
    go(next, focus);
  };
  const step = (n: 1 | -1) => go(view, view === 'month' ? addMonths(d, n) : addDays(d, n * (view === 'agenda' ? AGENDA_WEEKS * 7 : 7)));
  const unit = view === 'month' ? 'month' : view === 'agenda' ? `${AGENDA_WEEKS} weeks` : 'week';
  const toggle = (c: CalendarCategory) => setHidden((h) => { const n = new Set(h); if (n.has(c)) n.delete(c); else n.add(c); return n; });

  const onOpen: OpenItem = useCallback((item: CalendarItemVM, el: HTMLElement) => {
    // The modal hands focus back to whatever held it when it opened (Safari doesn't focus a clicked button).
    el.focus({ preventScroll: true });
    setOpenId(item.id);
  }, []);
  const onDay: OpenDay = useCallback((day: string, el: HTMLElement) => {
    el.focus({ preventScroll: true });
    setOpenDay(day);
  }, []);

  const fit = view !== 'agenda';
  return (
    <SourceHost>
      <div className={`view gcal ${fit ? 'gcal-fit' : ''}`}>
        <div className="gcal-bar" role="toolbar" aria-label="Calendar">
          <button type="button" className="btn btn-sm" onClick={() => go(view, DEMO_TODAY)}>Today</button>
          <span className="gcal-step">
            <button type="button" className="gcal-icon" onClick={() => step(-1)} aria-label={`Previous ${unit}`}><ChevronLeft size={16} aria-hidden /></button>
            <button type="button" className="gcal-icon" onClick={() => step(1)} aria-label={`Next ${unit}`}><ChevronRight size={16} aria-hidden /></button>
          </span>
          <h2 className="gcal-title" aria-live="polite">{range.title}</h2>
          <div className="seg gcal-seg" role="radiogroup" aria-label="Calendar view">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" role="radio" aria-checked={view === v.key} className={view === v.key ? 'on' : ''} onClick={() => switchTo(v.key)}>{v.label}</button>
            ))}
          </div>
          <button type="button" className={`gcal-mine ${onlyMine ? 'on' : ''}`} aria-pressed={onlyMine} onClick={() => setOnlyMine((x) => !x)}>
            <span className="sw" aria-hidden><span /></span>Only mine
          </button>
          <span className="gcal-tz">{tzNote(items, tenant)}</span>
          <HowToRead cc={cc} tz={tzNote(items, tenant)} />
        </div>

        {/* The legend is also the filter: each colour says what it means, and a click hides or shows it. */}
        <div className="gcal-cats" role="group" aria-label="Show on the calendar">
          {CALENDAR_CATEGORIES.map((c) => (
            <button
              key={c.key} type="button" className={`gcal-cat gcal-c-${c.key} ${hidden.has(c.key) ? 'off' : ''}`}
              aria-pressed={!hidden.has(c.key)} title={`${c.label}: ${c.items}`} onClick={() => toggle(c.key)}
            >
              <span className="gcal-dot" aria-hidden />
              <span className="l">{c.label}</span>
              <span className="n num" aria-label={`${counts[c.key]} ${view === 'month' ? 'this month' : 'in view'}`}>{counts[c.key]}</span>
            </button>
          ))}
          {hidden.size > 0 && <button type="button" className="gcal-cat-all" onClick={() => setHidden(new Set())}>Show all</button>}
        </div>

        {view === 'month' && (
          <Card className="gcal-card">
            <MonthView month={d} from={range.from} weeks={range.weeks} items={visible} cc={cc} onOpen={onOpen} onDay={onDay} />
          </Card>
        )}
        {(view === 'week' || view === 'workweek') && (
          <Card className="gcal-card">
            <WeekView from={range.from} days={view === 'week' ? 7 : workDays(cc)} items={visible} cc={cc} onOpen={onOpen} onDay={onDay} />
          </Card>
        )}
        {view === 'agenda' && (
          <AgendaView from={range.from} weeks={AGENDA_WEEKS} items={visible} tenant={tenant} cc={cc} tzLabel={profile.tzLabel} onOpen={onOpen} />
        )}
      </div>

      {/*
        The item's detail renders before the day's list: opened from the list it
        mounts later, so it sits on top, and when both close together it
        releases the page scroll first, then the list restores it.
      */}
      <EventModal
        id={openId} tenant={tenant} viewer={viewer} done={done}
        back={openDay ? `Back to ${shortDate(openDay)}` : undefined}
        onClose={() => setOpenId(null)}
        onGo={(to) => { setOpenId(null); setOpenDay(null); navigate(to); }}
      />
      <DayModal
        day={openDay} items={visible} tenant={tenant}
        onClose={() => setOpenDay(null)}
        onOpen={onOpen}
        onWeek={(day) => { setOpenDay(null); storeView('week'); go('week', day); }}
      />
    </SourceHost>
  );
}
