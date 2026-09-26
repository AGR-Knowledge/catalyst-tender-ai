import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { personById } from '@/data/people';
import { useDemo } from '@/state/store';

/**
 * "Open as supplier (preview)" (spec §8.10): a demo control that switches the
 * persona to the supplier's portal contact and opens the Supplier Portal at
 * that RFQ. The portal's "Back to {company}" switches back to `back` and
 * returns to `from`. The switch is audited like any persona switch.
 */

export const PORTAL_PATH = '/supplier-portal';

export function portalHref(rfqId: string | null, back?: string, from?: string): string {
  const q = new URLSearchParams();
  if (rfqId) q.set('rfq', rfqId);
  if (back) q.set('back', back);
  if (from) q.set('from', from);
  const s = q.toString();
  return s ? `${PORTAL_PATH}?${s}` : PORTAL_PATH;
}

export function usePortalPreview(): { open(rfqId: string, contactId: string): void; blocked: string | null } {
  const { state, setPerson, toast } = useDemo();
  const navigate = useNavigate();
  const loc = useLocation();
  const blocked = state.viewAs ? `Viewing as ${state.person.name}. Read only` : null;
  const open = useCallback((rfqId: string, contactId: string) => {
    const c = personById(contactId);
    if (!c) return;
    const back = state.realPerson.id;
    setPerson(contactId);
    toast(`Previewing the Supplier Portal as ${c.name}, ${c.title.replace(/\.$/, '')}. Demo control`, 'ink3');
    navigate(portalHref(rfqId, back, `${loc.pathname}${loc.search}`));
  }, [state.realPerson.id, setPerson, toast, navigate, loc.pathname, loc.search]);
  return { open, blocked };
}
