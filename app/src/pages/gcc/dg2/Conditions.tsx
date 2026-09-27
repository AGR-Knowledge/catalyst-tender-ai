import { useMemo, useState } from 'react';
import { Check, Lock } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { personById, SEAT_LABEL } from '@/data/people';
import { useDemo } from '@/state/store';
import { isWriteError, stampText, type PackViewer } from '@/domain/gcc/s3';
import { conditionCloseWrite, conditionsFor, type ConditionVM } from '@/domain/gcc/dg2';
import { EmptyState } from '@/components/tender/EmptyState';
import { StatusPill } from '@/components/tender/StatusPill';
import { ConfirmModal } from '../s3/Confirm';
import '../s3/s3.css';
import './dg2.css';

/**
 * The DG2 conditions as tracked items on the bid workspace (spec §10): each
 * with where it came from, open until someone closes it with a note. A margin
 * condition reads masked without `see.margin`, and closing one writes an audit
 * entry marked `margin`.
 */
export function Conditions({ tenant, tenderId, sight, check, holds }: {
  tenant: string;
  tenderId: string;
  sight: PackViewer;
  /** Who may close a condition: the Bid Manager or the Head of Tendering. */
  check: CanResult;
  /** The viewer holds that capability at all; View as then says why it is read only. */
  holds: boolean;
}) {
  const { state, mark, logAudit, nextAt } = useDemo();
  const { person, done } = state;
  const items = useMemo(() => conditionsFor(tenant, tenderId, done, sight), [tenant, tenderId, done, sight]);
  const [closing, setClosing] = useState<ConditionVM | null>(null);
  const [note, setNote] = useState('');
  if (!items.length) return null;
  const open = items.filter((c) => c.state === 'open').length;

  const close = () => {
    if (!closing) return;
    const w = conditionCloseWrite(closing.id, person.id, note, nextAt());
    if (isWriteError(w)) return;
    mark(w.key, `Condition ${closing.id} closed.`, 'green', w.value);
    logAudit({ ...w.audit, ...(closing.margin ? { sensitive: 'margin' as const } : {}) });
    setClosing(null);
    setNote('');
  };

  return (
    <section className="dg2-card" aria-labelledby={`cond-${tenderId}`}>
      <header className="dg2-card-h">
        <h3 id={`cond-${tenderId}`}>DG2 conditions</h3>
        <span className="dg2-card-m">{open ? `${open} of ${items.length} open` : `All ${items.length} closed`}</span>
      </header>
      {items.length === 0 ? <EmptyState title="No conditions on this decision." compact /> : (
        <ul className="dg2-condlist">
          {items.map((c) => (
            <li key={c.id} className={c.state}>
              <div className="dg2-cond-t">
                <span className="mono dg2-cid">{c.id}</span>
                <span className={c.masked ? 'pk-dim' : ''}>{c.masked && <Lock size={11} aria-hidden />} {c.text}</span>
                {c.margin && !c.masked && <span className="mp-mtag">Margin</span>}
              </div>
              <div className="dg2-cond-m">
                {/* Who raised it says how that member stood: shown only to people who may see positions. */}
                <span>{!sight.canSeePositions ? 'A condition of the DG2 approval' : c.fromSeat ? `From the ${SEAT_LABEL[c.fromSeat]}` : "The Head of Tendering's"}</span>
                {c.state === 'closed'
                  ? <StatusPill label={`Closed ${c.closedAt ? stampText(c.closedAt) : ''} by ${personById(c.closedById)?.name ?? ''}`} tone="green" icon="✓" />
                  : <StatusPill label="Open" tone="orange" icon="•" />}
                {/* A close note on a masked condition may state the figure: masked with it. */}
                {c.note && !c.masked && <span>{c.note}</span>}
                {c.state === 'open' && check.ok && (
                  <button type="button" className="btn btn-sm" onClick={() => { setClosing(c); setNote(''); }}><Check size={12} aria-hidden />Close</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open > 0 && holds && !check.ok && <p className="dg2-why">{check.reason}.</p>}

      <ConfirmModal
        open={!!closing} eyebrow="DG2 condition" title={`Close ${closing?.id ?? ''}`} sub={closing?.text}
        confirmLabel="Close condition" onConfirm={close} onClose={() => setClosing(null)}
      >
        <label className="s3-field">
          <span className="s3-l">How it was met (optional)</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: bid bond confirmed inside the facility by Finance." data-autofocus />
        </label>
        <p className="s3-hint">Recorded with your name and the time. The condition stays on the record.</p>
      </ConfirmModal>
    </section>
  );
}
