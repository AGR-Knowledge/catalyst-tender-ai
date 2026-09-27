import { personById } from '@/data/people';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { isOutstanding, requestsFor, type Request } from '../requests';
import type { ActionPrimary } from '../viewmodels';
import { minsTo, openTender, urgency } from '../kpi/stages';
import { DG3_BACK_TOPIC } from '../dg3/keys';
import type { ActionSource } from './types';

/**
 * My requests, Needs your action (plan 013 Phase 5.4, dashboards.md §10.13):
 * each open request is a row, late ones first. A pack input opens its form
 * ("Open form", plan 009b); a renewal opens the credentials vault once
 * Company is built; anything else opens the tender.
 */

const TYPE: Record<Request['kind'], string> = { 'pack-input': 'Pack input', renewal: 'Renewal', request: 'Request' };

function primaryOf(r: Request): ActionPrimary {
  // A renewal opens its credential in the vault (plan 010). The request id is `renewal:{credId}`.
  if (r.kind === 'renewal' && (isScreenBuilt('/company') || !r.tenderId)) {
    return { kind: 'route', label: 'Open credentials', to: `/company?tab=credentials&cred=${encodeURIComponent(r.id.slice('renewal:'.length))}` };
  }
  // A pack input opens its form on the tender's Inputs tab (plan 009b). The request id is `input:{TID}:{key}`.
  if (r.kind === 'pack-input' && r.tenderId) {
    const key = r.id.slice(r.id.lastIndexOf(':') + 1);
    return { kind: 'route', label: 'Open form', to: `/tenders/${encodeURIComponent(r.tenderId)}?tab=inputs&input=${encodeURIComponent(key)}` };
  }
  // A DG3 send-back opens the gate, where Compliance re-issues the pack (plan 018). The request id is `request:{TID}:{toId}:dg3-back`.
  if (r.kind === 'request' && r.tenderId && r.id.endsWith(`:${DG3_BACK_TOPIC}`) && isScreenBuilt('/dg3')) {
    return { kind: 'route', label: 'Open DG3', to: `/dg3?tender=${encodeURIComponent(r.tenderId)}` };
  }
  return openTender(r.tenderId);
}

/** Where a request goes: its primary action's route. My requests' table rows open the same place (plan 016b). */
export function requestRoute(r: Request): string {
  const p = primaryOf(r);
  return p.kind === 'route' ? p.to : `/tenders/${encodeURIComponent(r.tenderId ?? '')}`;
}

const REQUEST_OPEN: ActionSource = {
  id: 'request.open',
  rows: (ctx) => requestsFor(ctx.tenant, ctx.viewer.id, ctx.done, ctx.viewer, ctx.now).filter(isOutstanding).map((r) => {
    const by = personById(r.requestedById);
    const late = r.status === 'late';
    return {
      id: `request.open:${r.id}`, source: 'request.open',
      type: late ? 'Late input' : TYPE[r.kind], typeTone: late ? 'red' : undefined,
      ...(r.tenderId ? { tenderId: r.tenderId, shortTitle: r.shortTitle } : {}),
      what: `${r.what}${by ? ` · asked by ${by.name}` : ''}`,
      due: { kind: 'date', date: r.due.slice(0, 10), time: r.due.slice(11, 16) || undefined },
      primary: primaryOf(r),
      // Late first, the latest of those first; then by time left.
      urgency: urgency(late, minsTo(ctx, r.due)),
    };
  }),
};

export const ACTION_SOURCES: ActionSource[] = [REQUEST_OPEN];
