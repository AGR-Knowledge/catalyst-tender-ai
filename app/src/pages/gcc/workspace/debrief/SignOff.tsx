import { useState } from 'react';
import { Archive, Undo2 } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { isDebriefError, type DebriefCtx, type DebriefVM } from '@/domain/gcc/debriefs';
import { ConfirmModal, Effects } from '../../s3/Confirm';
import { applyWrite } from './DebriefForm';
import { stampText, type DebriefWriters } from './format';

/**
 * The Head of Tendering's sign-off (plan 036 step 3.2): accept the submitted
 * debrief into the archive, or send it back with a note. A debrief is a record,
 * not a gate, so the words are "Accept" and "Send back", never "approve". Both
 * confirm first, with the writer's effects; the writer also says why Confirm
 * is disabled (the note it needs). Everyone else reads who signs it off.
 */

export function SignOff({ vm, dctx, check, holds, writers, onDone }: {
  vm: DebriefVM;
  dctx: DebriefCtx;
  /** `can('debrief.accept')`: refused under View as, with its reason. */
  check: CanResult;
  /** The viewer holds `debrief.accept` at all: the buttons show, disabled under View as. */
  holds: boolean;
  writers: DebriefWriters;
  /** Called after either write, so the record heading takes focus. */
  onDone(): void;
}) {
  const { state, mark, logAudit, toast, nextAt } = useDemo();
  const viewAs = !!state.viewAs;
  const [open, setOpen] = useState<'accept' | 'back' | null>(null);
  const [note, setNote] = useState('');
  const approver = personById(vm.approverId);
  const recorder = personById(vm.recorderId);
  const sub = vm.record.submission;
  if (vm.status !== 'submitted' || !sub) return null;

  if (!holds) {
    return <p className="dbr-wait">Waiting for {approver ? `${approver.name} (${approver.title})` : 'the Head of Tendering'} to accept it into the archive or send it back.</p>;
  }

  const run = (at: string) => (open === 'accept'
    ? writers.accept(dctx, vm.tenderId, dctx.viewer, at, { viewAs })
    : writers.back(dctx, vm.tenderId, note.trim(), dctx.viewer, at, { viewAs }));
  // A preview: nothing is written until Confirm.
  const preview = open ? run(nextAt()) : null;
  const why = preview && isDebriefError(preview) ? preview.error : null;
  const close = () => { setOpen(null); setNote(''); };
  const confirm = () => {
    const r = run(nextAt());
    if (isDebriefError(r)) { toast(r.error, 'red'); return; }
    applyWrite(r, { mark, logAudit, toast });
    close();
    onDone();
  };

  return (
    <section className="dbs" aria-label="Sign-off">
      <div className="dbs-acts">
        <button type="button" className="btn btn-primary" onClick={() => setOpen('accept')} disabled={!check.ok} aria-describedby={check.ok ? undefined : `dbs-why-${vm.tenderId}`}>
          <Archive size={14} aria-hidden />Accept into the archive
        </button>
        <button type="button" className="btn" onClick={() => setOpen('back')} disabled={!check.ok} aria-describedby={check.ok ? undefined : `dbs-why-${vm.tenderId}`}>
          <Undo2 size={14} aria-hidden />Send back…
        </button>
      </div>
      {!check.ok && <p className="dbs-why" id={`dbs-why-${vm.tenderId}`}>{check.reason}.</p>}
      <p className="dbf-hint">Accepting puts it in the archive the KPI team reads. Sending it back re-opens the form for {recorder?.name ?? 'the Project Director'}, with your note.</p>

      <ConfirmModal
        open={!!open} wide={open === 'back'}
        eyebrow={`Debrief · ${vm.tenderId}`}
        title={open === 'accept' ? 'Accept the debrief into the archive' : 'Send the debrief back'}
        sub={`Recorded by ${recorder?.name ?? 'the Project Director'}, ${stampText(sub.at)}${sub.round > 1 ? `, round ${sub.round}` : ''}.`}
        confirmLabel={open === 'accept' ? 'Accept into the archive' : 'Send back'} disabledReason={why}
        onConfirm={confirm} onClose={close}
      >
        {preview && !isDebriefError(preview) && <Effects items={preview.effects} />}
        {open === 'back' && (
          <label className="s3-field">
            <span className="s3-l">What should the Project Director add or change? (required)</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say what is missing or unclear, so the next round can fix it." data-autofocus />
          </label>
        )}
      </ConfirmModal>
    </section>
  );
}
