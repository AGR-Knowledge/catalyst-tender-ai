import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { isWriteError } from '@/domain/gcc/s3/done';
import { dg3ReopenWrite, stampOf, type Dg3RecordVM, type Dg3State } from '@/domain/gcc/dg3';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { ConfirmModal, Effects } from '../s3/Confirm';
import './dg3.css';

/**
 * Re-open a DG3 decision (plan 018 step 3.3): the Head of Tendering only,
 * with a reason. The decision stays on record, marked re-opened, and the
 * tender goes back to DG3 with a fresh clock. There is no undo.
 */
export function Reopen({ s, record, check, holds }: {
  s: Dg3State;
  record: Dg3RecordVM | null;
  /** `can('dg3.decide')` for this tender. */
  check: CanResult;
  holds: boolean;
}) {
  const { state, mark, logAudit, toast, nextAt } = useDemo();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const probe = dg3ReopenWrite(s, reason, state.person, { viewAs: !!state.viewAs }, nextAt());
  // What happens doesn't depend on the reason: show it before one is typed.
  const draft = dg3ReopenWrite(s, reason.trim() || 'probe', state.person, { viewAs: !!state.viewAs }, nextAt());
  const previous = record?.previous ?? [];
  if (!s.decision && !previous.length) return null;

  const reopen = () => {
    const r = dg3ReopenWrite(s, reason, state.person, { viewAs: !!state.viewAs }, nextAt());
    if (isWriteError(r)) { toast(r.error, 'red'); return; }
    for (const w of r.writes) mark(w.key, undefined, undefined, w.value);
    r.audit.forEach((a) => logAudit(a));
    toast('DG3 re-opened. The tender is back at DG3; the earlier decision is kept on record.', 'green');
    setOpen(false);
  };

  return (
    <section className="dg2-card" aria-labelledby={`dg3-reopen-${s.tenderId}`}>
      <header className="dg2-card-h">
        <h3 id={`dg3-reopen-${s.tenderId}`}><RotateCcw size={13} aria-hidden /> Re-open</h3>
        {previous.length > 0 && <span className="dg2-card-m">{previous.length === 1 ? 'Re-opened once' : `Re-opened ${previous.length} times`}</span>}
      </header>
      {s.decision && (
        <div className="pk-acts">
          {holds ? (
            <>
              <button type="button" className="btn btn-sm" onClick={() => { setReason(''); setOpen(true); }} disabled={!check.ok}>Re-open DG3</button>
              {!check.ok && <span className="pk-why">{check.reason}</span>}
            </>
          ) : <span className="pk-why">A decision is changed only by re-opening it: the Head of Tendering re-opens it, with a reason.</span>}
        </div>
      )}
      {previous.length > 0 && (
        <ol className="dg2-hist">
          {previous.map((p) => (
            <li key={`${p.round}-${p.reopen.at}`}>
              <b>{p.label}</b> of {stampOf(p.at)} by {p.byName}, re-opened {stampOf(p.reopen.at)} by {p.reopen.byName}: &ldquo;{p.reopen.reason}&rdquo;
            </li>
          ))}
        </ol>
      )}

      <ConfirmModal
        open={open} eyebrow="DG3 · Re-open" title="Re-open DG3" sub="Both records are kept, with your name and the time."
        confirmLabel="Re-open DG3" disabledReason={isWriteError(probe) ? probe.error : null} onConfirm={reopen} onClose={() => setOpen(false)}
      >
        {!isWriteError(draft) && <Effects items={draft.effects} />}
        <label className="s3-field">
          <span className="s3-l">Reason (required)</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What changed since the decision." data-autofocus />
        </label>
      </ConfirmModal>
    </section>
  );
}

/** Every DG3 event in order, each with who and when (plan 018 step 2.5). */
export function Dg3History({ record }: { record: Dg3RecordVM }) {
  if (record.events.length < 2) return null;
  return (
    <section className="dg2-card" aria-labelledby={`dg3-hist-${record.tenderId}`}>
      <header className="dg2-card-h">
        <h3 id={`dg3-hist-${record.tenderId}`}>Record</h3>
        <span className="dg2-card-m">Recorded in the audit trail</span>
      </header>
      <div className="dg3-hist">
        {record.events.map((e, i) => {
          const p = personById(e.byId);
          return <AuditEntry key={`${e.kind}-${e.round}-${i}`} actor={{ name: e.byName, role: p?.title }} at={e.at} action={e.title} detail={e.detail} />;
        })}
      </div>
    </section>
  );
}
