import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CanResult } from '@/data/access';
import type { Dg2RecordVM, ReopenTrigger } from '@/domain/gcc/dg2';
import { REOPEN_TRIGGERS, reopenApproveWrite, reopenRequestWrite, reopenState } from '@/domain/gcc/dg2';
import { isWriteError, stampText } from '@/domain/gcc/s3';
import { useDemo } from '@/state/store';
import { ConfirmModal, Effects } from '../s3/Confirm';
import './dg2.css';

/**
 * Re-open a DG2 decision (spec §10): the Bid Manager or the Head of Tendering
 * asks, with a reason and what triggered it; the Head of Tendering approves.
 * The earlier decision and the positions stay on record, marked "before the
 * re-open". There is no undo.
 */
export function Reopen({ tenant, tenderId, record, requestCheck, approveCheck, holdsRequest, holdsApprove }: {
  tenant: string;
  tenderId: string;
  record: Dg2RecordVM | null;
  requestCheck: CanResult;
  approveCheck: CanResult;
  holdsRequest: boolean;
  holdsApprove: boolean;
}) {
  const { state, mark, logAudit, toast } = useDemo();
  const { person, done } = state;
  const rs = reopenState(tenant, tenderId, done);
  const [asking, setAsking] = useState(false);
  const [approving, setApproving] = useState(false);
  const [trigger, setTrigger] = useState<ReopenTrigger | null>(null);
  const [reason, setReason] = useState('');

  const probe = trigger ? reopenRequestWrite(tenant, tenderId, done, { reason, trigger }, person.id) : null;
  const why = !trigger ? 'Pick what triggered the re-open' : probe && isWriteError(probe) ? probe.error : null;

  const request = () => {
    if (!trigger) return;
    const w = reopenRequestWrite(tenant, tenderId, done, { reason, trigger }, person.id);
    if (isWriteError(w)) { toast(w.error, 'red'); return; }
    mark(w.key, 'Re-open requested. The Head of Tendering approves it.', 'green', w.value);
    logAudit(w.audit);
    setAsking(false);
  };
  const approve = () => {
    const w = reopenApproveWrite(tenant, tenderId, done, person.id);
    if (isWriteError(w)) { toast(w.error, 'red'); return; }
    mark(w.key, 'Decision re-opened. The tender is back at DG2; the earlier record and positions are kept.', 'green', w.value);
    logAudit(w.audit);
    setApproving(false);
  };

  const history = record?.reopens ?? [];
  if (!rs.decision && !history.length) return null;

  return (
    <section className="dg2-card" aria-labelledby={`reopen-${tenderId}`}>
      <header className="dg2-card-h">
        <h3 id={`reopen-${tenderId}`}><RotateCcw size={13} aria-hidden /> Re-open</h3>
        {rs.text && <span className="dg2-card-m">{rs.text}</span>}
      </header>
      {rs.pending && (
        <p className="dg2-p">&ldquo;{rs.pending.reason}&rdquo; · asked {stampText(rs.pending.at)}</p>
      )}
      <div className="pk-acts">
        {rs.canRequest && holdsRequest && (
          <>
            <button type="button" className="btn btn-sm" onClick={() => { setAsking(true); setTrigger(null); setReason(''); }} disabled={!requestCheck.ok}>Request a re-open</button>
            {!requestCheck.ok && <span className="pk-why">{requestCheck.reason}</span>}
          </>
        )}
        {rs.canApprove && holdsApprove && (
          <>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setApproving(true)} disabled={!approveCheck.ok}>Approve the re-open</button>
            {!approveCheck.ok && <span className="pk-why">{approveCheck.reason}</span>}
          </>
        )}
        {rs.decision && !rs.pending && !holdsRequest && <span className="pk-why">A decision is changed only by re-opening it: the Bid Manager or the Head of Tendering asks, with a reason.</span>}
      </div>
      {history.length > 0 && (
        <ol className="dg2-hist">
          {history.map((h) => (
            <li key={h.at}>
              <b>{h.decision.label}</b> of {stampText(h.decision.at)} re-opened {stampText(h.at)} by {h.by}: {h.trigger}. &ldquo;{h.reason}&rdquo; (asked by {h.requestedBy})
            </li>
          ))}
        </ol>
      )}

      <ConfirmModal
        open={asking} eyebrow="DG2 · Re-open" title="Request a re-open" sub="The Head of Tendering approves it. Both records are kept."
        confirmLabel="Send the request" disabledReason={why} onConfirm={request} onClose={() => setAsking(false)}
      >
        <fieldset className="s3-field">
          <legend className="s3-l">What triggered it</legend>
          <div className="s3-seg" role="radiogroup" aria-label="What triggered the re-open">
            {REOPEN_TRIGGERS.map((t, i) => <button key={t.key} type="button" role="radio" aria-checked={trigger === t.key} onClick={() => setTrigger(t.key)} data-autofocus={i === 0 ? true : undefined}>{t.label}</button>)}
          </div>
        </fieldset>
        <label className="s3-field">
          <span className="s3-l">Reason (required)</span>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What changed since the decision." />
        </label>
      </ConfirmModal>

      <ConfirmModal
        open={approving} eyebrow="DG2 · Re-open" title="Approve the re-open"
        sub={rs.pending ? `Asked for: ${REOPEN_TRIGGERS.find((t) => t.key === rs.pending!.trigger)?.label ?? ''}. “${rs.pending.reason}”` : undefined}
        confirmLabel="Approve the re-open" onConfirm={approve} onClose={() => setApproving(false)}
      >
        <Effects items={[
          'The decision is taken out of force and kept on record',
          'The tender goes back to DG2; positions stay, marked "before the re-open"',
          'You approve the new decision once the committee has quorum',
        ]} />
      </ConfirmModal>
    </section>
  );
}
