import { gccData, isGccTenantKey } from '@/data/gcc';
import { DONE_KEY } from '../s1/done';
import type { Done } from './done';

/**
 * `pack-ready:{TID}`: opens a seeded pack before its tender reaches Stage 3.
 * Plan 014's presenter control ("Advance to Stage 3") writes it together with
 * the stage move; dev checks pass it to read a demo tender's pack.
 */
export const packReadyKey = (tenderId: string) => `pack-ready:${tenderId}`;

/** The `at` of a `{ at, … }` value, or null (dev checks write '1'; anything unreadable has none). */
const atOf = (raw: string | undefined): string | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { at?: unknown } | null;
    return v && typeof v.at === 'string' ? v.at : null;
  } catch { return null; }
};

/**
 * Whether a `pack-ready:` or `stage3-entry:` value still stands (plan 016a 3.2): a DG1 re-open sends the
 * tender back, so a value counts only when its `at` is later than the latest `dg1-reopen:{TID}`. With no
 * re-open, any value counts, with or without an `at`.
 */
export function standsAfterDg1Reopen(done: Done, tenderId: string, raw: string | undefined): boolean {
  if (raw === undefined) return false;
  const reopenAt = atOf(done[DONE_KEY.dg1Reopen(tenderId)]);
  if (!reopenAt) return true;
  const at = atOf(raw);
  return at !== null && at > reopenAt;
}

/**
 * A seeded Bid / No-Bid pack, and the inputs seeded with it, exist only once
 * the tender has reached Stage 3 (orchestrator, 2026-09-26): a prospect must
 * never see a finished pack, citing quotes not yet received, on a tender still
 * in Stage 1 or 2. No demo action moves a tender from Stage 2 into Stage 3
 * yet, so the register's stage decides, unless `pack-ready:` is set.
 */
export function seededPackReady(tenant: string, tenderId: string, done: Done): boolean {
  if (!isGccTenantKey(tenant)) return false;
  const t = gccData(tenant).register.find((x) => x.id === tenderId);
  if (!t) return false;
  return (t.stage !== 'S1' && t.stage !== 'S2') || standsAfterDg1Reopen(done, tenderId, done[packReadyKey(tenderId)]);
}
