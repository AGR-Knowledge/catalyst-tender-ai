import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { firstWithRole, personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { isWriteError, nowIso } from '@/domain/gcc/s3/done';
import {
  DG3_LABEL, DG3_REJECT_REASONS, dg3Effects, stampOf as stamp, dg3Write, evidenceText, type Dg3Choice, type Dg3Input, type Dg3State, type Dg3WriteResult,
} from '@/domain/gcc/dg3';
import { ReasonCodePicker, EMPTY_REASON, type ReasonValue } from '@/components/tender/ReasonCodePicker';
import { ConfirmModal, Effects } from '../s3/Confirm';
import { SendBackButton } from './SendBack';
import './dg3.css';

/**
 * The DG3 decision (plan 018 steps 3.2–3.3, 3.5): the Head of Tendering
 * approves submission or rejects it with reasons. Approve stays disabled while
 * a blocking line fails, saying why. The record preview shows what the record
 * will say before anything is written. "Send back to Compliance" is an action
 * beside the decision, not a decision. Everyone else reads who decides.
 */


export function DecisionPanel({ s, check, holds, issues }: {
  s: Dg3State;
  /** `can('dg3.decide')` for this tender (refused under View as). */
  check: CanResult;
  /** The viewer holds `dg3.decide` at all: the controls show, disabled under View as. */
  holds: boolean;
  /** The viewer issues the pack (Compliance): says what is theirs to do. */
  issues: boolean;
}) {
  const { state, mark, logAudit, toast } = useDemo();
  const { person } = state;
  const [choice, setChoice] = useState<Dg3Choice | null>(null);
  const [codes, setCodes] = useState<ReasonValue>(EMPTY_REASON);
  const [note, setNote] = useState('');
  const hot = firstWithRole(s.tenant, 'hot');

  if (s.decision) return null;
  if (!holds) {
    return (
      <section className="dg2-bar muted" aria-label="DG3 approval">
        <p className="dg2-bar-t">{hot ? `${hot.name}, ${hot.title}, approves DG3: submit or do not submit.` : 'The Head of Tendering approves DG3.'}</p>
        {issues && !s.sentBack && <p className="dg2-hint">You issued this pack. If it is sent back to you, you re-issue it here.</p>}
      </section>
    );
  }

  const input: Dg3Input | null = choice ? {
    tenderId: s.tenderId, decision: choice,
    ...(choice === 'rejected' ? { reasonCodes: codes.codes, note: codes.note } : { note }),
  } : null;
  const result = input ? dg3Write(input, person, s, { viewAs: !!state.viewAs }) : null;
  const preview: Dg3WriteResult | null = result && !isWriteError(result) ? result : null;
  const why = result && isWriteError(result) ? result.error : null;

  const approveOk: CanResult = !check.ok ? check : s.approveBlocked ? { ok: false, reason: s.approveBlocked } : { ok: true };
  const open = (c: Dg3Choice) => { setChoice(c); setCodes(EMPTY_REASON); setNote(''); };
  const close = () => setChoice(null);
  const confirm = () => {
    if (!input) return;
    const r = dg3Write(input, person, s, { viewAs: !!state.viewAs });
    if (isWriteError(r)) { toast(r.error, 'red'); return; }
    for (const w of r.writes) mark(w.key, undefined, undefined, w.value);
    r.audit.forEach((a) => logAudit(a));
    toast(r.effects[0].replace(/\.?$/, '.'), 'green'); // an effect is a list item; the toast is a sentence
    close();
  };
  const ev = s.evaluation;
  const seen = evidenceText({ passed: ev.passed, failed: ev.failing.length, info: ev.info });

  return (
    <section className="dg2-bar" aria-label="DG3 approval">
      <div className="dg2-bar-h">
        <span className="dg2-bar-t">Your decision</span>
        <span className={`dg2-bar-s ${approveOk.ok ? 't-green' : ''}`}>{s.sentBack ? `Back with ${personById(s.sentBack.toId)?.name ?? 'Compliance'}` : s.evaluation.ready ? 'Every blocking check passes' : s.evaluation.summary}</span>
      </div>
      <div className="dg2-bar-acts">
        <button type="button" className="btn btn-primary" onClick={() => open('approved')} disabled={!approveOk.ok} aria-describedby={approveOk.ok ? undefined : `dg3-why-${s.tenderId}`}>
          <Check size={14} aria-hidden />Approve submission
        </button>
        <button type="button" className="btn btn-danger" onClick={() => open('rejected')} disabled={!check.ok} aria-describedby={check.ok ? undefined : `dg3-why-${s.tenderId}`}>
          <X size={14} aria-hidden />Reject
        </button>
      </div>
      {(!approveOk.ok || !check.ok) && <p className="dg2-why" id={`dg3-why-${s.tenderId}`}>{!check.ok ? check.reason : approveOk.reason}</p>}
      {approveOk.ok && (
        <p className="dg3-preview-line" aria-label="Record preview">
          <span className="dg3-preview-k">The record will say</span>
          {DG3_LABEL.approved} by {person.name}, {stamp(nowIso())}. Evidence: {seen}.
        </p>
      )}
      <SendBackButton s={s} />
      <p className="dg2-hint">No undo: a decision is changed only by re-opening it, with a reason. Both records are kept.</p>

      <ConfirmModal
        open={!!choice} wide={choice === 'rejected'} danger={choice === 'rejected'}
        eyebrow="DG3 · Final bid approval" title={choice === 'approved' ? 'Approve submission' : 'Reject: do not submit'}
        sub={`On the DG3 pack issued ${stamp(s.openedAt)}${s.round > 1 ? `, round ${s.round}` : ''}. Evidence: ${seen}.`}
        confirmLabel={choice === 'approved' ? 'Approve submission' : 'Reject'} disabledReason={why}
        onConfirm={confirm} onClose={close}
      >
        {choice && <Effects items={dg3Effects(choice, s)} />}
        {choice === 'rejected' ? (
          <ReasonCodePicker
            codes={DG3_REJECT_REASONS.map((r) => ({ id: r.code, label: r.label }))} value={codes} required="code" onChange={setCodes}
            noteLabel={codes.codes.includes('other') ? 'Note (required: the reason is Other)' : 'Note (optional)'} autoFocus
          />
        ) : (
          <label className="s3-field">
            <span className="s3-l">Note (optional)</span>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the Bid Manager should know before submitting." data-autofocus />
          </label>
        )}
        {preview ? (
          <div className="dg2-preview" aria-label="Record preview">
            <div className="s3-effects-h">The record will say</div>
            <p><b>{DG3_LABEL[preview.decision.decision]}</b>, by {person.name}, {stamp(preview.decision.at)}, round {preview.decision.round}.</p>
            {/* The audit detail after its "name, round" part, which the line above already says: the evidence, and the note when there is one. */}
            <p>{preview.audit[0].detail?.split(' · ').slice(1).join(' · ')}</p>
          </div>
        ) : <p className="s3-hint">The record preview appears once the form is complete.</p>}
      </ConfirmModal>
    </section>
  );
}

