import type { Tone } from '@/data/types';
import { STAGES } from '@/data/stages';
import type { LiveTender } from '@/domain/live';
import { cr, dayMonth } from '@/domain/format';
import { tc } from '@/components/ui/primitives';

/** How urgent a tender looks on the board. Shared with the calendar so both read the same. */
export function dueTone(t: LiveTender): Tone {
  if (t.closed || t.held) return 'ink3';
  return t.days <= 5 ? 'red' : t.days <= 14 ? 'orange' : 'ink3';
}

function statusTone(t: LiveTender): Tone {
  if (t.closed) return 'ink3';
  if (t.held) return 'red';
  if (t.gate) return t.gateReady ? 'orange' : 'red';
  if (t.confidence === 'low') return 'orange';
  return 'cyan';
}

export function TenderBoard({ rows, onOpen }: { rows: LiveTender[]; onOpen: (t: LiveTender) => void }) {
  const stages = STAGES.filter((s) => s.n <= 8);
  return (
    <div className="kb-c">
      <div className="kb">
        {stages.map((st) => {
          const cards = rows.filter((t) => t.stage === st.n).sort((a, b) => Number(!!a.held) - Number(!!b.held) || a.days - b.days);
          return (
            <section className="kb-col" key={st.n} aria-label={`Stage ${st.n}, ${st.short}`}>
              <header className="kb-head">
                <span className="kb-n">{st.n}</span>
                <span className="kb-t">{st.short}</span>
                <span className="kb-c-n">{cards.length}</span>
              </header>
              {cards.map((t) => {
                const due = dueTone(t);
                const rail = t.closed ? '' : due === 'red' ? 'r-red' : t.gate ? 'r-orange' : '';
                return (
                  <button type="button" key={t.id} className={`kb-card ${rail} ${t.closed ? 'closed' : ''}`} onClick={() => onOpen(t)}>
                    <span className="kb-name">{t.name}</span>
                    <span className={`kb-status ${tc(statusTone(t))}`}>{t.closed ? t.closedReason : t.status}</span>
                    <span className="kb-meta">{t.client}, {cr(t.value)}</span>
                    <span className="kb-foot">
                      <span className={`kb-due ${tc(due)}`}>{t.held === 'nodate' ? 'No date' : t.held ? `${dayMonth(t.due)} ${t.due.slice(0, 4)}` : dayMonth(t.due)}{!t.closed && !t.held && t.days >= 0 ? `, ${t.days} d` : ''}</span>
                      <span className="kb-owner">{t.owner}</span>
                      {t.gate && !t.closed && <span className={`kb-gate ${t.gateReady ? '' : 'wait'}`}>{t.gate}</span>}
                    </span>
                  </button>
                );
              })}
              {cards.length === 0 && <div className="kb-empty">Nothing at this stage</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
