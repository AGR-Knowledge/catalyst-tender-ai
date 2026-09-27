import { useId, useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { credentialName, defaultRenewalDate, renewalToast, renewalWrite, type VaultRow } from '@/domain/gcc/company';
import { dayMonthYear } from '@/domain/gcc/s1/common';
import { addDays } from '@/domain/calendar';
import { DemoTag } from '@/components/tender/DemoTag';
import type { S1 } from '../s1/vm/useS1';
import { S1Modal } from '../s1/parts/Modal';

/**
 * Upload renewal (plan 010 step 2.3): the new valid-to date, a demo line in
 * place of a file picker, and Save. Save writes `renewed:{id}` through
 * `mark()` with an audit entry; the toast says what the re-check found.
 */
export function RenewalModal({ s1, row, onClose }: { s1: S1; row: VaultRow | null; onClose(): void }) {
  const id = useId();
  // The last credential shown, so the modal keeps its content while it closes.
  const last = useRef(row);
  if (row) last.current = row;
  const shown = row ?? last.current;
  const c = shown?.cred;
  // An edit belongs to one credential; opening another starts from its default date.
  const [edit, setEdit] = useState<{ id: string; date: string } | null>(null);
  const date = c ? (edit?.id === c.id ? edit.date : defaultRenewalDate(c, s1.done)) : '';
  const setDate = (d: string) => { if (c) setEdit({ id: c.id, date: d }); };

  const at = s1.nextAt();
  const check = c ? renewalWrite(s1.tenant, c.id, date, s1.viewer, s1.done, { at, viewAs: s1.viewAs, tenderId: shown?.bids[0]?.tenderId }) : null;

  const close = () => { setEdit(null); onClose(); };

  const save = () => {
    if (!c || !check?.ok) return;
    const after = { ...s1.done, [check.write.key]: check.write.value };
    s1.mark(check.write.key, renewalToast(s1.tenant, c.id, s1.done, after), 'green', check.write.value);
    s1.logAudit({ actorId: s1.viewer.id, action: check.audit.action, ...(check.audit.target ? { target: check.audit.target } : {}), ...(check.audit.detail ? { detail: check.audit.detail } : {}) });
    close();
  };

  const current = shown?.validTo;
  return (
    <S1Modal
      open={!!row} eyebrow="Upload renewal" title={c?.label ?? ''}
      sub={current ? `Currently valid to ${dayMonthYear(current)}.${shown?.owner ? ` Owner: ${shown.owner.name}.` : ''}` : undefined}
      actions={[
        { label: 'Save renewal', primary: true, disabled: !check?.ok, onClick: save },
        { label: 'Cancel', onClick: close },
      ]}
      foot={check && !check.ok ? check.reason : undefined}
      onClose={close}
    >
      <label className="co-field" htmlFor={`${id}-date`}>
        <span className="co-field-l">Renewed certificate valid to</span>
        <input
          id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)}
          min={current ? addDays(current, 1) : undefined} aria-describedby={`${id}-rule`}
        />
      </label>
      <p className="s1-note" id={`${id}-rule`}>The date printed on the renewed certificate. It must be later than the current expiry.</p>
      <p className="co-attach"><Paperclip size={13} aria-hidden /><span>The renewed certificate is attached.</span><DemoTag title="Demo: no file is uploaded or stored" /></p>
      <p className="s1-note">
        Saving re-checks eligibility on every live bid that needs {c ? `the ${credentialName(c)}` : 'this credential'}, and records your name and the time in the audit trail.
      </p>
    </S1Modal>
  );
}
