import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TODAY_ISO } from '@/data/tenders';
import type { LiveTender } from '@/domain/live';
import { cr, dayMonth, plural } from '@/domain/format';
import { tc } from '@/components/ui/primitives';
import { dueTone } from './TenderBoard';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Submission deadlines on a month grid. Below 560px it becomes a dated list. */
export function TenderCalendar({ rows, onOpen }: { rows: LiveTender[]; onOpen: (t: LiveTender) => void }) {
  const [ty, tm] = TODAY_ISO.split('-').map(Number);
  const [cursor, setCursor] = useState({ y: ty, m: tm - 1 });
  const { y, m } = cursor;
  const shift = (n: number) => setCursor(({ y, m }) => { const k = y * 12 + m + n; return { y: Math.floor(k / 12), m: k % 12 }; });

  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const lead = (first + 6) % 7;
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const prefix = iso(y, m, 1).slice(0, 7);
  const inMonth = rows.filter((t) => t.held !== 'nodate' && t.due.startsWith(prefix)).sort((a, b) => a.due.localeCompare(b.due));
  const byDay = (d: number) => inMonth.filter((t) => t.due === iso(y, m, d));
  const isThisMonth = y === ty && m === tm - 1;

  const chip = (t: LiveTender) => (
    <button type="button" key={t.id} className={`cal-chip ${tc(dueTone(t))}`} onClick={() => onOpen(t)} title={`${t.id} ${t.name}, ${cr(t.value)}`}>
      <b>{t.id.slice(-3)}</b> {t.name}
    </button>
  );

  return (
    <div className="cal-c">
      <div className="cal-bar">
        <div className="cal-month">{MONTHS[m]} {y}</div>
        <span className="cal-sum">{inMonth.length ? `${plural(inMonth.length, 'submission')} due` : 'No submissions due'}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={() => setCursor({ y: ty, m: tm - 1 })} disabled={isThisMonth}>Today</button>
        <button type="button" className="btn btn-icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft /></button>
        <button type="button" className="btn btn-icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight /></button>
      </div>
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m]} ${y}`}>
        {DOW.map((d) => <div className="cal-dow" key={d} role="columnheader">{d}</div>)}
        {cells.map((d, i) => {
          const out = d < 1 || d > days;
          const today = !out && iso(y, m, d) === TODAY_ISO;
          const past = !out && iso(y, m, d) < TODAY_ISO;
          return (
            <div key={i} role="gridcell" className={`cal-cell ${out ? 'out' : ''} ${today ? 'today' : ''} ${past ? 'past' : ''} ${i % 7 > 4 ? 'wkend' : ''}`}>
              {!out && <span className="cal-d">{d}</span>}
              {!out && byDay(d).map(chip)}
            </div>
          );
        })}
      </div>
      <div className="cal-list">
        {inMonth.map((t) => (
          <button type="button" key={t.id} className="cal-li" onClick={() => onOpen(t)}>
            <span className={`d ${tc(dueTone(t))}`}>{dayMonth(t.due)}</span>
            <span className="n"><b>{t.name}</b><small>{t.id}, {t.client}</small></span>
            <span className="v">{cr(t.value)}</span>
          </button>
        ))}
        {!inMonth.length && <div className="kb-empty">No submissions due this month</div>}
      </div>
    </div>
  );
}
