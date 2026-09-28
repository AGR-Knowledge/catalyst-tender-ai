import { itemLabel, type CalendarItemVM } from '@/domain/gcc/calendar';

/** Opens an item's detail; `el` is where focus returns when the modal closes. */
export type OpenItem = (item: CalendarItemVM, el: HTMLElement) => void;

/**
 * One item as a chip (plan 027b 3.5): the category's dot and soft tint, the
 * time if any, then the title and the tender's short title on one line. A
 * flagged item shows "!", a past one is faded. A button: Enter or click opens
 * the item's detail.
 */
export function Chip({ item, onOpen }: { item: CalendarItemVM; onOpen: OpenItem }) {
  const label = itemLabel(item);
  return (
    <button
      type="button"
      className={`gcal-chip gcal-c-${item.category} ${item.past ? 'past' : ''}`}
      aria-label={label}
      title={label}
      onClick={(e) => onOpen(item, e.currentTarget)}
    >
      <span className="gcal-dot" aria-hidden />
      {item.time && <span className="t num" aria-hidden>{item.time}</span>}
      <span className="l" aria-hidden>
        {item.chip}
        {item.shortTitle && <span className="s"> · {item.shortTitle}</span>}
      </span>
      {item.flags.length > 0 && <span className="fl" aria-hidden>!</span>}
    </button>
  );
}
