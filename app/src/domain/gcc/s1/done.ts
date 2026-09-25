import { DEMO_TIME, DEMO_TODAY } from '@/domain/calendar';

/**
 * Demo state for the Stage 1 and DG1 rules (plan 007a). These functions only
 * read `done`; the screens (plan 007b) write the key/value pairs built here
 * through `mark()`, so Reset demo clears them with the rest of the tenant.
 *
 * Values are JSON strings, except the `'yes'` flags written by other plans.
 */

export type Done = Record<string, string>;

/** A JSON value from `done`: `null` when the key is missing or its value is not valid JSON. */
export function readDone<T>(done: Done, key: string): T | null {
  const raw = done[key];
  if (raw === undefined || raw === null || raw === '') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** A `'yes'` flag, such as `renewal-requested:{id}` or `nudged:{target}`. */
export const isFlagged = (done: Done, key: string) => Boolean(done[key]) && done[key] !== 'no';

/** The demo clock as a tenant-local date-time: `2026-03-08T10:00`. */
export const nowIso = () => `${DEMO_TODAY}T${DEMO_TIME}`;

/** What 007b passes to `logAudit` together with the actor. */
export type AuditDraft = { action: string; target?: string; detail?: string };

/** "Resolved conflict: Initial guarantee rate = 2% (p. 35); 1% (p. 12) kept on record". */
export const auditText = (a: AuditDraft) => (a.detail ? `${a.action}: ${a.detail}` : a.action);

/** A write the screens hand to `mark(key, msg, tone, value)`. */
export interface DoneWrite { key: string; value: string }

/** Every value carries when and who. */
export interface Stamped { at: string; byId: string }

/**
 * The done keys shared with plans 008a, 009a, 015 and 007b (plan 007a, "Done-key
 * conventions"). Build keys here rather than by hand.
 */
export const DONE_KEY = {
  val: (validationId: string) => `val:${validationId}`,
  query: (queryId: string) => `query:${queryId}`,
  renewed: (credentialId: string) => `renewed:${credentialId}`,
  renewalRequested: (credentialId: string) => `renewal-requested:${credentialId}`,
  nudged: (target: string) => `nudged:${target}`,
  dg1: (tenderId: string) => `dg1:${tenderId}`,
  dg1Hold: (tenderId: string) => `dg1-hold:${tenderId}`,
  dg1Reopen: (tenderId: string) => `dg1-reopen:${tenderId}`,
} as const;

export const json = (v: unknown) => JSON.stringify(v);
