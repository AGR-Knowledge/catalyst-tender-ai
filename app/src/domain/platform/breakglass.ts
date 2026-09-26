import { personById } from '@/data/people';
import { BREAKGLASS_MAX_HOURS, BREAKGLASS_MIN_REASON } from '@/data/platform/facts';
import { approversFor, operatorById } from '@/data/platform/operators';
import { DEMO_TODAY, dateText } from '@/domain/calendar';
import type { AuditEvent } from '@/state/store';

/**
 * Break-glass (plan 011, roles-and-access §4 P1, catalogue GOV-6): Catalyst
 * asks for time-boxed, read-only access to one tenant, with a second approver.
 * The request is written into the **target tenant's** `done` and audit trail
 * (the store's `auditTo`), so that tenant's Head of Tendering sees it and
 * Reset demo clears it. This module is the only reader and writer of the keys:
 * - `breakglass:{n}` → JSON `{ reason, scope: 'read-only', hours, requestedById, approverId, at, status: 'requested' }`;
 * - `breakglass:{n}:revoked` → JSON `{ byId, at }`.
 * The demo stops at "requested": no session ever opens tenant data.
 */

export interface BreakGlassRecord {
  reason: string;
  scope: 'read-only';
  hours: number;
  requestedById: string;
  approverId: string;
  /** Demo time of the audit entry, `YYYY-MM-DDTHH:MM`, tenant local. */
  at: string;
  status: 'requested' | 'revoked';
}

export interface BreakGlass extends BreakGlassRecord {
  n: number;
  key: string;
  revoked: { byId: string; at: string } | null;
}

export interface BreakGlassInput { reason: string; hours: number; requestedById: string; approverId: string }

/** One write into one tenant, for `auditTo`: the audit entry, and the `done` keys given the entry's demo time. */
export interface TenantWrite {
  event: Omit<AuditEvent, 'id' | 'at'>;
  set: (at: string) => Record<string, string>;
}

const KEY = /^breakglass:(\d+)$/;

export const requestedAction = (hours: number) => `Catalyst requested access (break-glass, ${hours} h, read only)`;
export const REVOKED_ACTION = 'Break-glass access revoked';

/** The audit entries this module writes, for the audit log's "Catalyst" tag. */
export const isBreakGlassEvent = (e: Pick<AuditEvent, 'action'>) =>
  e.action.startsWith('Catalyst requested access (break-glass') || e.action === REVOKED_ACTION;

function parse(v: string | undefined): BreakGlassRecord | null {
  if (!v) return null;
  try {
    const r = JSON.parse(v) as Partial<BreakGlassRecord>;
    if (typeof r.reason !== 'string' || typeof r.hours !== 'number' || typeof r.requestedById !== 'string' || typeof r.approverId !== 'string' || typeof r.at !== 'string') return null;
    return { reason: r.reason, scope: 'read-only', hours: r.hours, requestedById: r.requestedById, approverId: r.approverId, at: r.at, status: r.status === 'revoked' ? 'revoked' : 'requested' };
  } catch {
    return null;
  }
}

function parseRevoked(v: string | undefined): { byId: string; at: string } | null {
  if (!v) return null;
  try {
    const r = JSON.parse(v) as { byId?: unknown; at?: unknown };
    return typeof r.byId === 'string' && typeof r.at === 'string' ? { byId: r.byId, at: r.at } : null;
  } catch {
    return null;
  }
}

/** A tenant's break-glass requests, newest first, each with its status. */
export function breakGlassOf(done: Record<string, string>): BreakGlass[] {
  const out: BreakGlass[] = [];
  for (const [key, value] of Object.entries(done)) {
    const m = KEY.exec(key);
    const rec = m ? parse(value) : null;
    if (!m || !rec) continue;
    const revoked = parseRevoked(done[`${key}:revoked`]);
    out.push({ ...rec, n: Number(m[1]), key, revoked, status: revoked ? 'revoked' : rec.status });
  }
  return out.sort((a, b) => b.n - a.n);
}

/** Requests not yet revoked. */
export const openBreakGlass = (done: Record<string, string>) => breakGlassOf(done).filter((r) => r.status === 'requested');

/** Why the request can't be sent yet, as a sentence, or null when it can. */
export function breakGlassProblem(input: BreakGlassInput): string | null {
  const reason = input.reason.trim().length;
  if (reason < BREAKGLASS_MIN_REASON) {
    return reason ? `Give a reason of at least ${BREAKGLASS_MIN_REASON} characters (${reason} so far)` : `Give a reason of at least ${BREAKGLASS_MIN_REASON} characters`;
  }
  if (!Number.isInteger(input.hours) || input.hours < 1 || input.hours > BREAKGLASS_MAX_HOURS) return `Choose from 1 to ${BREAKGLASS_MAX_HOURS} hours`;
  if (input.approverId === input.requestedById) return 'You can’t approve your own request. Choose a second approver';
  if (!approversFor(input.requestedById).some((o) => o.id === input.approverId)) return 'Choose a second approver';
  return null;
}

/** Who asked or approved: a Catalyst operator, else a tenant person. */
export const actorName = (id: string) => operatorById(id)?.name ?? personById(id)?.name ?? id;
export const approverLine = (id: string) => {
  const o = operatorById(id);
  return o ? `${o.name}, ${o.title}` : actorName(id);
};

/** "today 10:03", or "Sat 7 Mar 2026 16:20". */
export const stampText = (at: string) => `${at.slice(0, 10) === DEMO_TODAY ? 'today' : dateText(at.slice(0, 10))} ${at.slice(11, 16)}`;

/** The request, as written into the target tenant. The caller has checked `breakGlassProblem`. */
export function breakGlassRequest(done: Record<string, string>, input: BreakGlassInput): TenantWrite {
  const n = Math.max(0, ...breakGlassOf(done).map((r) => r.n)) + 1;
  const reason = input.reason.trim();
  return {
    event: {
      actorId: input.requestedById,
      action: requestedAction(input.hours),
      detail: `Reason: ${reason}. Second approver: ${approverLine(input.approverId)}. Every screen viewed would be logged here`,
    },
    set: (at) => ({
      [`breakglass:${n}`]: JSON.stringify({
        reason, scope: 'read-only', hours: input.hours, requestedById: input.requestedById, approverId: input.approverId, at, status: 'requested',
      } satisfies BreakGlassRecord),
    }),
  };
}

/** Revoking an open request, by a tenant person. Null when there is nothing open to revoke. */
export function breakGlassRevoke(done: Record<string, string>, n: number, byId: string): TenantWrite | null {
  const r = breakGlassOf(done).find((x) => x.n === n);
  if (!r || r.status !== 'requested') return null;
  return {
    event: { actorId: byId, action: REVOKED_ACTION, detail: `Catalyst’s request (${stampText(r.at)}, ${r.hours} h, read only). Reason given: ${r.reason}` },
    set: (at) => ({ [`${r.key}:revoked`]: JSON.stringify({ byId, at }) }),
  };
}
