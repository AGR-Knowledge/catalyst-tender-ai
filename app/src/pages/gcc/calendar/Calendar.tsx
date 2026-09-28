import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import {
  CALENDAR_CATEGORIES, calendarItems, monthTitle, spanTitle, tzNote, weekStart,
  type CalendarCategory, type CalendarItemVM,
} from '@/domain/gcc/calendar';
import { profileOf } from '@/domain/gcc/s1/common';
import { Card } from '@/components/ui/primitives';
import { usePop } from '@/components/tender/Tip';
import { SourceHost } from '@/components/tender/SourceHost';
import { useS1 } from '../s1/vm/useS1';
import type { OpenItem } from './Chip';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { AgendaView } from './AgendaView';
import { EventModal } from './EventModal';
import './calendar.css';

/**
 * `/calendar` (spec §6.7, plan 027b): every submission, site visit,
 * questions deadline, gate decision, supplier quote due and credential
 * renewal across the tenders the viewer may see, as a month grid, a week with
 * a time grid, or the agenda list. Any item opens its detail. Read only: the
 * view and the month or week shown are in the URL (`?view=month&d=2026-03-01`),
 * and the last view is remembered in this browser as a convenience.
 */

type View = 'month' | 'week' | 'agenda';
const VIEWS: { key: View; label: string }[] = [{ key: 'month', label: 'Month' }, { key: 'week', label: 'Week' }, { key: 'agenda', label: 'Agenda' }];
const isView = (v: string | null): v is View => v === 'month' || v === 'week' || v === 'agenda';
const KEY = 'ctai.calendar.view';
const AGENDA_WEEKS = 4;
const ALL = CALENDAR_CATEGORIES.map((c) => c.key);

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
/** The date a view starts from, for a day inside it. */
const anchorOf = (view: View, iso: string) => (view === 'month' ? monthStart(iso) : view === 'week' ? weekStart(iso) : iso);

interface Range { from: string; to: string; title: string }

function rangeOf(view: View, d: string): Range {
  if (view === 'month') {
    const from = weekStart(d);
    return { from, to: addDays(from, 6 * 7 - 1), title: monthTitle(d) };
  }
  const to = addDays(d, (view === 'week' ? 7 : AGENDA_WEEKS * 7) - 1);
  return { from: d, to, title: spanTitle(d, to) };
}

function ShowMenu({ hidden, counts, onToggle, onAll }: {
  hidden: Set<CalendarCategory>; counts: Record<CalendarCategory, number>; onToggle(c: CalendarCategory): void; onAll(): void;
}) {
  const pop = usePop<HTMLButtonElement>({ mode: 'click', width: 290, align: 'end', label: 'Show categories' });
  const shown = ALL.length - hidden.size;
  return (
    <>
      <button type="button" className="btn btn-sm gcal-show" {...pop.menuProps} aria-haspopup="dialog">
        Show{hidden.size ? ` · ${shown} of ${ALL.length}` : ''} <ChevronDown size={13} aria-hidden />
      </button>
      {pop.render(
        <div className="gcal-show-menu">
          <div className="gcal-show-h">Show on the calendar</div>
          {CALENDAR_CATEGORIES.map((c) => (
            <label key={c.key} className={`gcal-show-row gcal-c-${c.key}`}>
              <input type="checkbox" checked={!hidden.has(c.key)} onChange={() => onToggle(c.key)} />
              <span className="gcal-dot" aria-hidden />
              <span className="l">{c.label}</span>
              <span className="n num" aria-label={`${counts[c.key]} in view`}>{counts[c.key]}</span>
            </label>
          ))}
          {hidden.size > 0 && <button type="button" className="btn btn-sm gcal-show-all" onClick={onAll}>Show all</button>}
        </div>,
        'gcal-pop',
      )}
    </>
  );
}

export default function Calendar() {
  const { tenant, viewer, done } = useS1();
  const profile = profileOf(tenant);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = isView(params.get('view')) ? params.get('view') as View : storedView() ?? 'month';
  const raw = params.get('d');
  const d = anchorOf(view, isIso(raw) ? raw : DEMO_TODAY);
  const range = rangeOf(view, d);

  const [onlyMine, setOnlyMine] = useState(false);
  const [hidden, setHidden] = useState<Set<CalendarCategory>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(() => calendarItems({ tenant, viewer, done, from: range.from, to: range.to }), [tenant, viewer, done, range.from, range.to]);
  const mineOnly = useMemo(() => (onlyMine ? items.filter((i) => i.mine) : items), [items, onlyMine]);
  const counts = useMemo(() => Object.fromEntries(ALL.map((k) => [k, mineOnly.filter((i) => i.category === k).length])) as Record<CalendarCategory, number>, [mineOnly]);
  const visible = useMemo(() => mineOnly.filter((i) => !hidden.has(i.category)), [mineOnly, hidden]);

  const go = useCallback((next: View, day: string) => {
    setParams({ view: next, d: anchorOf(next, day) }, { replace: true });
  }, [setParams]);
  const switchTo = (next: View) => {
    storeView(next);
    // Keep today in view when it is; else the start of what is shown.
    const focus = DEMO_TODAY >= range.from && DEMO_TODAY <= range.to && (view !== 'month' || DEMO_TODAY.slice(0, 7) === d.slice(0, 7)) ? DEMO_TODAY : d;
    go(next, focus);
  };
  const step = (n: 1 | -1) => go(view, view === 'month' ? addMonths(d, n) : addDays(d, n * (view === 'week' ? 7 : AGENDA_WEEKS * 7)));
  const unit = view === 'month' ? 'month' : view === 'week' ? 'week' : `${AGENDA_WEEKS} weeks`;

  const onOpen: OpenItem = useCallback((item: CalendarItemVM, el: HTMLElement) => {
    // The modal hands focus back to whatever held it when it opened (Safari doesn't focus a clicked button).
    el.focus({ preventScroll: true });
    setOpenId(item.id);
  }, []);

  return (
    <SourceHost>
      <div className="view gcal">
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
          <ShowMenu
            hidden={hidden} counts={counts}
            onToggle={(c) => setHidden((h) => { const n = new Set(h); if (n.has(c)) n.delete(c); else n.add(c); return n; })}
            onAll={() => setHidden(new Set())}
          />
          <span className="gcal-tz">{tzNote(items, tenant)}</span>
        </div>

        <ul className="gcal-legend" aria-label="What the colours mean">
          {CALENDAR_CATEGORIES.map((c) => (
            <li key={c.key} className={`gcal-c-${c.key} ${hidden.has(c.key) ? 'off' : ''}`}>
              <span className="gcal-dot" aria-hidden />
              <b>{c.label}</b>
              <span>{c.items}</span>
            </li>
          ))}
        </ul>

        {view === 'month' && <Card className="gcal-card"><MonthView month={d} from={range.from} items={visible} cc={profile.countryCode} onOpen={onOpen} /></Card>}
        {view === 'week' && <Card className="gcal-card"><WeekView from={range.from} items={visible} cc={profile.countryCode} onOpen={onOpen} /></Card>}
        {view === 'agenda' && (
          <AgendaView from={range.from} weeks={AGENDA_WEEKS} items={visible} tenant={tenant} cc={profile.countryCode} tzLabel={profile.tzLabel} onOpen={onOpen} />
        )}
      </div>

      <EventModal
        id={openId} tenant={tenant} viewer={viewer} done={done}
        onClose={() => setOpenId(null)}
        onGo={(to) => { setOpenId(null); navigate(to); }}
      />
    </SourceHost>
  );
}
