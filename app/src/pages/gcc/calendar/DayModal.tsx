import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { calendarDay, itemLabel, type CalendarItemVM } from '@/domain/gcc/calendar';
import { ModalFrame } from '@/components/overlays/Frames';
import { ClosingContext, usePresence } from '@/state/presence';
import type { OpenItem } from './Chip';

/**
 * The whole of one day (orchestrator follow-up, 2026-09-28): what "+n more"
 * and a date open. The day's working calendar, then every item grouped by
 * category, most important first, as the month's cell lists them. A row opens
 * the item's detail over this list; closing the detail comes back here.
 * "Open the week" shows the day among its week, at its times.
 */
export function DayModal({ day, items, tenant, onClose, onOpen, onWeek }: {
  day: string | null;
  /** What the calendar shows now (its filters applied); the day's own are picked out here. */
  items: CalendarItemVM[];
  tenant: string;
  onClose(): void;
  onOpen: OpenItem;
  /** Shows the week holding the day, in the week view. */
  onWeek(day: string): void;
}) {
  const vm = useMemo(() => (day ? calendarDay(day, items, tenant) : null), [day, items, tenant]);
  const { shown, closing } = usePresence(vm);
  if (!shown) return null;
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <div className="gcal-day-host">
        <ModalFrame eyebrow="Day" title={shown.title} sub={shown.count} onClose={onClose} actions={[{ label: 'Open the week', onClick: () => onWeek(shown.date) }, { label: 'Close', onClick: onClose }]}>
          <div className="modal-body gcal-dm">
            {shown.notes.length > 0 && <ul className="gcal-dm-notes">{shown.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
            {shown.groups.map((g) => (
              <section key={g.category} className={`gcal-dm-g gcal-c-${g.category}`}>
                <h4>{g.category !== 'lead' && <span className="gcal-dot" aria-hidden />}{g.label}<span className="n num">{g.rows.length}</span></h4>
                <ul>
                  {g.rows.map(({ item, countdown }) => (
                    <li key={item.id}>
                      <button
                        type="button" className={`gcal-dm-row ${item.past ? 'past' : ''} ${item.lead ? `lead gcal-c-${item.category}` : ''}`}
                        aria-label={[itemLabel(item), countdown, ...item.flags].join('. ')}
                        onClick={(e) => onOpen(item, e.currentTarget)}
                      >
                        {item.lead
                          ? <span className="t" aria-hidden><span className="gcal-dot" />{item.lead.word}</span>
                          : <span className="t num" aria-hidden>{item.time ?? 'All day'}</span>}
                        <span className="l" aria-hidden>{item.title}</span>
                        <span className="cd num" aria-hidden>{countdown}</span>
                        {item.tenderId && <span className="tt" aria-hidden><span className="mono">{item.tenderId}</span> {item.shortTitle}</span>}
                        {item.flags.map((f) => <span key={f} className="fl" aria-hidden><span>! </span>{f}</span>)}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </ModalFrame>
      </div>
    </ClosingContext.Provider>,
    document.body,
  );
}
