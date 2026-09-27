import { useState } from 'react';
import { CornerUpLeft, RefreshCw } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { firstWithRole, personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { isWriteError } from '@/domain/gcc/s3/done';
import { dayText, dg3ReissueWrite, dg3SendBackWrite, extendedTo, sendBackDraft, stampOf, type Dg3State } from '@/domain/gcc/dg3';
import { DemoTag } from '@/components/tender/DemoTag';
import { ConfirmModal, Effects } from '../s3/Confirm';
import './dg3.css';

/**
 * Send back to Compliance (dashboards.md §9: an action, not a decision) and
 * the Compliance side of it (plan 018 steps 3.2 and 3.4). The Head of
 * Tendering sends the pack back with a note; it lands in the Compliance
 * Lead's My requests. Compliance re-issues it, which starts a new round and
 * restarts the 48 h clock. In the demo, re-issuing can carry the bank's
 * extension of the guarantee (a labelled demo control).
 */

type Commit = (r: { writes: { key: string; value: string }[]; audit: { actorId: string; action: string; target?: string; detail?: string }[]; effects: string[] }) => void;

function useCommit(): Commit {
  const { mark, logAudit, toast } = useDemo();
  return (r) => {
    for (const w of r.writes) mark(w.key, undefined, undefined, w.value);
    r.audit.forEach((a) => logAudit(a));
    toast(r.effects[0].replace(/\.?$/, '.'), 'green'); // an effect is a list item; the toast is a sentence
  };
}

/** The Head of Tendering's "Send back to Compliance", beside the decision. */
export function SendBackButton({ s }: { s: Dg3State }) {
  const { state } = useDemo();
  const commit = useCommit();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const comp = firstWithRole(s.tenant, 'comp');

  const probe = dg3SendBackWrite(s, note, state.person, { viewAs: !!state.viewAs });
  const refused = dg3SendBackWrite(s, 'probe', state.person, { viewAs: !!state.viewAs });
  const why = isWriteError(refused) ? refused.error : null;
  // The failing lines are what Compliance must fix: the note starts from them, without figures Compliance may not see.
  const start = () => { setNote(sendBackDraft(s)); setOpen(true); };
  const send = () => {
    const r = dg3SendBackWrite(s, note, state.person, { viewAs: !!state.viewAs });
    if (isWriteError(r)) return;
    commit(r);
    setOpen(false);
  };

  return (
    <div className="dg3-sendback">
      <button type="button" className="btn btn-sm" onClick={start} disabled={!!why} aria-describedby={why ? `dg3-back-why-${s.tenderId}` : undefined}>
        <CornerUpLeft size={13} aria-hidden />Send back to Compliance
      </button>
      <span className="pk-why" id={`dg3-back-why-${s.tenderId}`}>{why ?? `An action, not a decision: the pack goes back to ${comp?.name ?? 'Compliance'} with your note.`}</span>
      <ConfirmModal
        open={open} eyebrow="DG3 · Send back" title="Send back to Compliance"
        sub={`An action, not a decision. ${comp ? `${comp.name}, ${comp.title},` : 'Compliance'} re-issues the pack; then you decide.`}
        confirmLabel="Send back" disabledReason={isWriteError(probe) ? probe.error : null} onConfirm={send} onClose={() => setOpen(false)}
      >
        {!isWriteError(probe) && <Effects items={probe.effects} />}
        <label className="s3-field">
          <span className="s3-l">Note for Compliance (required)</span>
          <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What must change before you can approve." data-autofocus />
        </label>
      </ConfirmModal>
    </div>
  );
}

/** The pack is back with Compliance: the note for everyone, and "Re-issue the DG3 pack" for Compliance. */
export function SentBackCard({ s, check, holds }: {
  s: Dg3State;
  /** `can('dg3.issue')` for this tender. */
  check: CanResult;
  /** The viewer issues DG3 packs at all (Compliance). */
  holds: boolean;
}) {
  const { state } = useDemo();
  const commit = useCommit();
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState(false);
  const back = s.sentBack;
  if (!back) return null;
  const by = personById(back.byId);
  const to = personById(back.toId);
  const validityFails = s.evaluation.failing.some((l) => l.key === 'guarantee') && s.evaluation.evidence.bond.validTo < s.evaluation.evidence.bond.requiredTo;
  const input = bank && validityFails ? { fixed: 'bond-validity' as const } : {};
  const probe = dg3ReissueWrite(s, input, state.person, { viewAs: !!state.viewAs });
  const reissue = () => {
    const r = dg3ReissueWrite(s, input, state.person, { viewAs: !!state.viewAs });
    if (isWriteError(r)) return;
    commit(r);
    setOpen(false);
  };

  return (
    <section className="dg2-card dg3-back" aria-labelledby={`dg3-back-${s.tenderId}`}>
      <header className="dg2-card-h">
        <h3 id={`dg3-back-${s.tenderId}`}><CornerUpLeft size={13} aria-hidden /> Sent back to Compliance</h3>
        <span className="dg2-card-m">{stampOf(back.at)} · round {back.round}</span>
      </header>
      <p className="dg3-back-who">{by?.name ?? back.byId} to {to ? `${to.name}, ${to.title}` : 'Compliance'}:</p>
      <p className="dg3-back-note">{back.note}</p>
      {holds ? (
        <div className="pk-acts">
          <button type="button" className="btn btn-sm btn-primary" onClick={() => { setBank(validityFails); setOpen(true); }} disabled={!check.ok}>
            <RefreshCw size={13} aria-hidden />Re-issue the DG3 pack
          </button>
          {!check.ok && <span className="pk-why">{check.reason}</span>}
        </div>
      ) : (
        <p className="dg2-p">Waiting for {to?.name ?? 'Compliance'} to re-issue the pack. The clock keeps running.</p>
      )}

      <ConfirmModal
        open={open} eyebrow="DG3 · Re-issue" title="Re-issue the DG3 pack"
        sub={`Round ${s.round + 1}. It goes back to ${firstWithRole(s.tenant, 'hot')?.name ?? 'the Head of Tendering'} with a fresh clock.`}
        confirmLabel="Re-issue the pack" disabledReason={isWriteError(probe) ? probe.error : null} onConfirm={reissue} onClose={() => setOpen(false)}
      >
        {validityFails && (
          <label className="s3-check dg3-demo">
            <input type="checkbox" checked={bank} onChange={(e) => setBank(e.target.checked)} data-autofocus />
            <span>Demo: the bank extended the guarantee, to {dayText(extendedTo(s))}</span>
            <DemoTag />
          </label>
        )}
        {!isWriteError(probe) && <Effects items={probe.effects} />}
      </ConfirmModal>
    </section>
  );
}
