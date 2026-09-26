import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Done } from './done';

/**
 * `pack-ready:{TID}`: opens a seeded pack before its tender reaches Stage 3.
 * Plan 014's presenter control ("Advance to Stage 3") writes it together with
 * the stage move; dev checks pass it to read a demo tender's pack.
 */
export const packReadyKey = (tenderId: string) => `pack-ready:${tenderId}`;

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
  return (t.stage !== 'S1' && t.stage !== 'S2') || done[packReadyKey(tenderId)] !== undefined;
}
