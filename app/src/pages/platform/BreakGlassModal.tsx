import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Eye } from 'lucide-react';
import { ModalFrame } from '@/components/overlays/Frames';
import { ClosingContext, usePresence } from '@/state/presence';
import { BREAKGLASS_MAX_HOURS, BREAKGLASS_MIN_REASON } from '@/data/platform/facts';
import { OPERATORS } from '@/data/platform/operators';
import { breakGlassProblem, type BreakGlassInput } from '@/domain/platform/breakglass';
import type { TenantRowVM } from '@/domain/platform/console';

/**
 * Requesting break-glass access (plan 011 §2.1, roles-and-access §4 P1): one
 * tenant, a reason, at most four hours, read only, and a second approver who
 * is not the requester. The send button stays disabled, saying why, until the
 * request is complete. The caller writes it into the tenant.
 */

const HOURS = Array.from({ length: BREAKGLASS_MAX_HOURS }, (_, i) => i + 1);

export function BreakGlassModal({ open, tenants, initial, requesterId, onSend, onClose }: {
  open: boolean;
  /** Every tenant in the list; those that can't be requested are shown disabled. */
  tenants: TenantRowVM[];
  initial: string | null;
  requesterId: string;
  onSend(tenant: string, input: BreakGlassInput): void;
  onClose(): void;
}) {
  const { shown, closing } = usePresence(open ? true : null);
  const requestable = tenants.filter((t) => t.lock.canRequest);
  const firstApprover = OPERATORS.find((o) => o.id !== requesterId)?.id ?? '';
  const [tenant, setTenant] = useState(initial ?? requestable[0]?.key ?? '');
  const [reason, setReason] = useState('');
  const [hours, setHours] = useState(BREAKGLASS_MAX_HOURS);
  const [approverId, setApproverId] = useState(firstApprover);

  // Each opening starts afresh, on the tenant whose row was clicked.
  useEffect(() => {
    if (!open) return;
    setTenant(initial ?? requestable[0]?.key ?? '');
    setReason('');
    setHours(BREAKGLASS_MAX_HOURS);
    setApproverId(firstApprover);
  }, [open, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  const input: BreakGlassInput = { reason, hours, requestedById: requesterId, approverId };
  const target = tenants.find((t) => t.key === tenant);
  const problem = !target?.lock.canRequest ? 'Choose a live tenant' : breakGlassProblem(input);
  const len = reason.trim().length;

  return createPortal(
    <ClosingContext.Provider value={closing}>
      <div className="plc-tokens">
      <ModalFrame
        eyebrow="Break-glass · one tenant, read only"
        title="Request access to tenant data"
        sub="For a support case the console’s counts can’t answer. The tenant sees the request and can revoke it."
        onClose={onClose}
        foot={problem ?? undefined}
        actions={[
          { label: 'Send request', primary: true, disabled: !!problem, onClick: () => target && onSend(target.key, input) },
          { label: 'Cancel', onClick: onClose },
        ]}
      >
        <div className="modal-body bg-form">
          <div className="bg-f">
            <label htmlFor="bg-tenant">Tenant</label>
            <select id="bg-tenant" value={tenant} onChange={(e) => setTenant(e.target.value)}>
              {tenants.map((t) => (
                <option key={t.key} value={t.key} disabled={!t.lock.canRequest}>{t.name}{t.lock.canRequest ? '' : ' (onboarding: no tender data yet)'}</option>
              ))}
            </select>
            <div className="bg-h">One tenant per request. Access never spans companies.</div>
          </div>

          <div className="bg-f">
            <label htmlFor="bg-reason">
              Reason
              <span className={`bg-count ${len >= BREAKGLASS_MIN_REASON ? 'ok' : ''}`} aria-live="polite">{len} / {BREAKGLASS_MIN_REASON} minimum</span>
            </label>
            <textarea
              id="bg-reason" value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby="bg-reason-h" data-autofocus
              placeholder="The support case, and what you need to check"
            />
            <div className="bg-h" id="bg-reason-h">The tenant’s Head of Tendering reads this reason word for word.</div>
          </div>

          <div className="bg-f">
            <span className="bg-l" id="bg-hours-l">Duration</span>
            <div className="seg" role="radiogroup" aria-labelledby="bg-hours-l">
              {HOURS.map((h) => (
                <button key={h} type="button" role="radio" aria-checked={hours === h} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>
                  {h} h
                </button>
              ))}
            </div>
            <div className="bg-h">Access ends on its own after {hours} {hours === 1 ? 'hour' : 'hours'}. {BREAKGLASS_MAX_HOURS} hours is the limit.</div>
          </div>

          <div className="bg-f">
            <span className="bg-l">Scope</span>
            <span className="bg-scope"><Eye size={13} aria-hidden />Read only. No bid action, gate or price can be changed</span>
          </div>

          <div className="bg-f">
            <span className="bg-l" id="bg-appr-l">Second approver</span>
            <div className="bg-appr" role="radiogroup" aria-labelledby="bg-appr-l">
              {OPERATORS.map((o) => {
                const self = o.id === requesterId;
                return (
                  <button
                    key={o.id} type="button" role="radio" aria-checked={approverId === o.id} disabled={self}
                    className={`bg-opt ${approverId === o.id ? 'on' : ''}`} onClick={() => setApproverId(o.id)}
                  >
                    <span className="bg-radio" aria-hidden />
                    <span>
                      <span className="t">{o.name}</span>
                      <span className="s">{self ? 'You, the requester. You can’t approve your own request' : o.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-tell">
            <Bell size={13} aria-hidden />
            <span>
              {target?.lock.canRequest ? `${target.admin} at ${target.short}, is` : 'The tenant’s Head of Tendering is'} notified and can revoke the request.
              Every screen viewed is written to the tenant’s audit log.
            </span>
          </div>
        </div>
      </ModalFrame>
      </div>
    </ClosingContext.Provider>,
    document.body,
  );
}
