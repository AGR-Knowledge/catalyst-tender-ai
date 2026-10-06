import { itemLabel, type CalendarItemVM } from '@/domain/gcc/calendar';

/** Opens an item's detail; `el` is where focus returns when the modal closes. */
export type OpenItem = (item: CalendarItemVM, el: HTMLElement) => void;

/** Opens the whole of one day (`YYYY-MM-DD`), the same way. */
export type OpenDay = (day: string, el: HTMLElement) => void;

/**
 * One item as a chip (plan 027b 3.5): the category's dot and soft tint, the
 * time if any, then the title and the tender's short title on one line. A
 * flagged item shows "!", a past one is faded. A button: Enter or click opens
 * the item's detail.
 * A lead-up (plan 041) is the lighter chip: outlined, no tint, the countdown
 * first and the tender's number: "In 3 days · DG2 · T-2026-097".
 */
export function Chip({ item, onOpen }: { item: CalendarItemVM; onOpen: OpenItem }) {
  const label = itemLabel(item);
  return (
    <button
      type="button"
      className={`gcal-chip gcal-c-${item.category} ${item.past ? 'past' : ''} ${item.lead ? 'lead' : ''}`}
      aria-label={label}
      title={label}
      onClick={(e) => onOpen(item, e.currentTarget)}
    >
      <span className="gcal-dot" aria-hidden />
      {item.time && <span className="t num" aria-hidden>{item.time}</span>}
      <span className="l" aria-hidden>
        {item.chip}
        {item.lead
          ? item.tenderId && <span className="s"> · {item.tenderId}</span>
          : item.shortTitle && <span className="s"> · {item.shortTitle}</span>}
      </span>
      {item.flags.length > 0 && <span className="fl" aria-hidden>!</span>}
    </button>
  );
}
