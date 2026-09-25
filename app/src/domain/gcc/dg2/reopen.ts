import { personById } from '@/data/people';
import { nowIso, readDone, type Done, type WriteError, type WriteResult } from '@/domain/gcc/s3/done';
import { activeDecision, roundOf, type Dg2Decision, type ReopenRequestValue, type ReopenTrigger, type ReopenValue } from './keys';

/**
 * Re-opening a DG2 decision (spec §10, dashboards.md §9): the Bid Manager or
 * the Head of Tendering asks, with a reason and a trigger; the Head of
 * Tendering approves. An approved re-open takes the decision out of force
 * (it is kept as `previous` in the record) and returns the tender to "at DG2"
 * with its positions kept, marked as recorded before the re-open.
 */

export const REOPEN_TRIGGERS: { key: ReopenTrigger; label: string }[] = [
  { key: 'competitor-withdrew', label: 'A competitor withdrew' },
  { key: 'employer-signal', label: 'The employer signalled interest' },
  { key: 'jv-offer', label: 'A partner offered a JV' },
  { key: 'other', label: 'Other' },
];

export const triggerLabel = (k: ReopenTrigger) => REOPEN_TRIGGERS.find((t) => t.key === k)?.label ?? k;

export interface ReopenState {
  decision: Dg2Decision | null;
  /** A request waiting for the Head of Tendering. */
  pending: ReopenRequestValue | null;
  canRequest: boolean;
  canApprove: boolean;
  /** Every decision re-opened so far, oldest first. */
  previous: Dg2Decision[];
  last?: { at: string; byId: string; reason: string; trigger: ReopenTrigger; requestedById: string };
  text?: string;
}

/** `_tenant` keeps the shared signature: keys are already tenant-scoped by the store. */
export function reopenState(_tenant: string, tenderId: string, done: Done): ReopenState {
  const decision = activeDecision(done, tenderId);
  const req = readDone<ReopenRequestValue>(done, `dg2-reopen-req:${tenderId}`);
  const approved = readDone<ReopenValue>(done, `dg2-reopen:${tenderId}`);
  const pending = decision && req && req.round === roundOf(done, tenderId) ? req : null;
  const text = pending
    ? `Re-open requested by ${personById(pending.byId)?.name ?? pending.byId}: ${triggerLabel(pending.trigger)}. Waiting for the Head of Tendering`
    : approved?.approved && !decision ? `Re-opened by ${personById(approved.byId)?.name ?? approved.byId}: ${triggerLabel(approved.trigger)}. Back at DG2` : undefined;
  return {
    decision,
    pending,
    canRequest: !!decision && !pending,
    canApprove: !!pending,
    previous: approved?.previous ?? [],
    ...(approved?.approved ? { last: { at: approved.at, byId: approved.byId, reason: approved.reason, trigger: approved.trigger, requestedById: approved.requestedById } } : {}),
    ...(text ? { text } : {}),
  };
}

/** Ask to re-open (the Bid Manager or the Head of Tendering). */
export function reopenRequestWrite(tenant: string, tenderId: string, done: Done, input: { reason: string; trigger: ReopenTrigger }, byId: string): WriteResult | WriteError {
  const s = reopenState(tenant, tenderId, done);
  if (!s.decision) return { error: 'There is no DG2 decision to re-open' };
  if (s.pending) return { error: 'A re-open request is already waiting for the Head of Tendering' };
  const reason = input.reason?.trim();
  if (!reason) return { error: 'Give a reason for re-opening the decision' };
  if (!REOPEN_TRIGGERS.some((t) => t.key === input.trigger)) return { error: 'Pick what triggered the re-open' };
  const value: ReopenRequestValue = { reason, trigger: input.trigger, round: s.decision.round, at: nowIso(), byId };
  return {
    key: `dg2-reopen-req:${tenderId}`,
    value: JSON.stringify(value),
    audit: { actorId: byId, action: 'DG2 re-open requested', target: tenderId, detail: `${triggerLabel(input.trigger)}: ${reason}` },
  };
}

/** Approve the pending re-open (the Head of Tendering). */
export function reopenApproveWrite(tenant: string, tenderId: string, done: Done, byId: string): WriteResult | WriteError {
  const s = reopenState(tenant, tenderId, done);
  if (!s.decision || !s.pending) return { error: 'There is no re-open request to approve' };
  const prior = readDone<ReopenValue>(done, `dg2-reopen:${tenderId}`);
  const value: ReopenValue = {
    approved: true,
    round: s.decision.round,
    reason: s.pending.reason,
    trigger: s.pending.trigger,
    requestedById: s.pending.byId,
    previous: [...(prior?.previous ?? []), s.decision],
    at: nowIso(),
    byId,
  };
  return {
    key: `dg2-reopen:${tenderId}`,
    value: JSON.stringify(value),
    audit: { actorId: byId, action: 'DG2 re-opened', target: tenderId, detail: `${triggerLabel(value.trigger)}: ${value.reason}. The ${s.decision.decision === 'bid' ? 'Bid' : 'No-Bid'} decision is kept on record; positions stay` },
  };
}
