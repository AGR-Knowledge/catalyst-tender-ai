import { useRef, type KeyboardEvent } from 'react';
import { PERIODS, type PeriodKey, type PeriodWindow } from '@/domain/gcc/period';

/**
 * The period filter (dashboards.md §2): Today · 7 days · 30 days · 90 days ·
 * 12 months, with the window's dates under it. It drives the tiles, the flow
 * strip and the graph; never Needs your action or the table.
 */
export function PeriodFilter({ value, window, onChange }: { value: PeriodKey; window: PeriodWindow; onChange(k: PeriodKey): void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + PERIODS.length) % PERIODS.length;
    onChange(PERIODS[j].key);
    refs.current[j]?.focus();
  };
  return (
    <div className="pf">
      <div className="seg pf-seg" role="radiogroup" aria-label="Period">
        {PERIODS.map((p, i) => (
          <button
            key={p.key} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={p.key === value}
            tabIndex={p.key === value ? 0 : -1} className={p.key === value ? 'on' : ''}
            onClick={() => onChange(p.key)} onKeyDown={(e) => onKey(e, i)}
          >{p.label}</button>
        ))}
      </div>
      <div className="pf-cap num" aria-live="polite">{window.rangeText}</div>
    </div>
  );
}
