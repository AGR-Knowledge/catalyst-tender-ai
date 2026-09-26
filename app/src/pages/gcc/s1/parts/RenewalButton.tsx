import { Check, Send } from 'lucide-react';
import { personById } from '@/data/people';
import { dateText } from '@/domain/calendar';
import { DONE_KEY, isFlagged, json, readDone } from '@/domain/gcc/s1/done';
import { requestsFor } from '@/domain/gcc/requests';
import { whenLabel } from '@/components/tender/When';
import type { S1 } from '../vm/useS1';

/**
 * "Request renewal" on an at-risk certificate (spec §6.5). It writes the same
 * `renewal-requested:{credential}` record the Head of Tendering's dashboard
 * action writes (who asked and when), so the owner's My requests, the SCR-6
 * tile and the dashboard row all agree, and a second person can't ask twice.
 * It looks and reads like the kit's `RequestButton`.
 */
export function RenewalButton({ s1, tenderId, credentialId, ownerId, label, validTo }: {
  s1: S1; tenderId: string; credentialId: string; ownerId: string; label: string; validTo: string;
}) {
  const key = DONE_KEY.renewalRequested(credentialId);
  const owner = personById(ownerId);
  const asked = isFlagged(s1.done, key);
  const right = s1.check('input.request', tenderId);
  const name = owner?.name ?? 'the owner';

  if (asked) {
    const v = readDone<{ at?: string; byId?: string }>(s1.done, key);
    const req = requestsFor(s1.tenant, ownerId, s1.done, s1.viewer).find((r) => r.id === `renewal:${credentialId}`);
    return (
      <span className="req-done" role="status">
        <button type="button" className="btn btn-sm req-btn done" disabled><Check size={12} aria-hidden />Renewal requested{v?.at ? ` ${v.at.slice(11, 16)}` : ''}</button>
        <span className="req-meta">{req ? `due ${whenLabel(req.due.slice(0, 10), undefined, undefined, true)} · ` : ''}{name}</span>
      </span>
    );
  }

  const send = () => {
    const at = s1.nextAt();
    s1.mark(key, `Renewal requested from ${name}. It is in their requests.`, 'green', json({ at, byId: s1.viewer.id }));
    s1.logAudit({ actorId: s1.viewer.id, action: 'Requested credential renewal', target: tenderId, detail: `${label}, expires ${dateText(validTo)}; asked of ${name}` });
  };
  const whyId = `ren-why-${tenderId}-${credentialId}`;
  return (
    <span className="req-wrap">
      <button type="button" className="btn btn-sm req-btn" onClick={send} disabled={!right.ok} aria-describedby={right.ok ? undefined : whyId}>
        <Send size={12} aria-hidden />Request renewal from {name}
      </button>
      {!right.ok && <span className="req-why" id={whyId}>{right.reason}</span>}
    </span>
  );
}
