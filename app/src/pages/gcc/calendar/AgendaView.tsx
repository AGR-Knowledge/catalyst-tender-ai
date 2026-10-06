import type { CountryCode } from '@/data/tenants';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { calendarOrder, itemCountdown, itemLabel, type CalendarItemVM } from '@/domain/gcc/calendar';
import { dayMonth } from '@/domain/gcc/s1/common';
import { Card, CardHead } from '@/components/ui/primitives';
import { When } from '@/components/tender/When';
import { EmptyState } from '@/components/tender/EmptyState';
import { calendarNotes } from '../s1/vm/calendarNotes';
import type { OpenItem } from './Chip';

/**
 * Agenda view (plan 027b Phase 5): the calendar page as it was, a list from
 * the start of the range grouped by week, with the working-calendar notes
 * beside it. Each row opens the same detail as a chip. Lead-ups (plan 041)
 * follow each day's due items, lighter: "In 3 days: DG2 decision due".
 */
export function AgendaView({ from, weeks, items, tenant, cc, tzLabel, onOpen }: {
  from: string; weeks: number; items: CalendarItemVM[]; tenant: string; cc: CountryCode; tzLabel: string; onOpen: OpenItem;
}) {
  const to = addDays(from, weeks * 7 - 1);
  const groups = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(from, i * 7);
    const end = addDays(start, 6);
    return { start, end, items: items.filter((e) => e.date >= start && e.date <= end).sort(calendarOrder) };
  });
  const notes = calendarNotes(cc, from, to);

  return (
    <div className="gcal-ag">
      <div className="gcal-ag-weeks">
        {groups.map((w) => {
          const now = DEMO_TODAY >= w.start && DEMO_TODAY <= w.end;
          return (
            <Card key={w.start}>
              <CardHead title={`${now ? 'This week · ' : 'Week of '}${dayMonth(w.start)} – ${dayMonth(w.end)}`} meta={<span className="num">{w.items.filter((e) => !e.lead).length}</span>} />
              {w.items.length ? (
                <ol className="gcal-ag-list">
                  {w.items.map((e) => (
                    <li key={e.id}>
                      <button type="button" className={`gcal-ag-row gcal-c-${e.category} ${e.past ? 'past' : ''} ${e.lead ? 'lead' : ''}`} aria-label={[itemLabel(e), itemCountdown(e, tenant), ...e.flags].join('. ')} onClick={(ev) => onOpen(e, ev.currentTarget)}>
                        <span className="w" aria-hidden><When date={e.date} time={e.time} tz={e.tz} short /></span>
                        <span className="gcal-dot" aria-hidden />
                        <span className="l" aria-hidden>{e.lead ? `${e.lead.word}: ${e.title}` : e.title}</span>
                        <span className="cd num" aria-hidden>{itemCountdown(e, tenant)}</span>
                        {e.tenderId && <span className="tt" aria-hidden><span className="mono">{e.tenderId}</span> {e.shortTitle}</span>}
                        {e.flags.map((f) => <span key={f} className="fl" aria-hidden><span>! </span>{f}</span>)}
                      </button>
                    </li>
                  ))}
                </ol>
              ) : <EmptyState title="Nothing due this week." compact />}
            </Card>
          );
        })}
      </div>
      <Card className="gcal-ag-side">
        <CardHead title="The working calendar" meta={<span>{tzLabel}</span>} />
        <p className="gcal-ag-lede">Each date shows in the authority's own time zone. Working days count its weekend and expected closures.</p>
        <ul className="gcal-ag-notes">{notes.map((n) => <li key={n.key}>{n.text}</li>)}</ul>
      </Card>
    </div>
  );
}
