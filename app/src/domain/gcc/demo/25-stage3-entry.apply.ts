import type { S3Facts } from '@/data/gcc/lifecycle';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { PACK_VERSIONS } from '@/data/gcc/s3';
import { stageOf } from '@/data/gcc/stages';
import { freshnessFor, inputsFor, isMasked, packFor, packReadyKey, packVersionsFor, readDone } from '@/domain/gcc/s3';
import { currentOf, lifecycle, type DemoDone } from '@/domain/gcc/lifecycle';
import type { AuditDraft, Write } from './presets/types';
import { asDone, later, type Applier } from './types';

/**
 * "Advance to Stage 3" (plan 014 Phase 4), a presenter control for the two
 * demo tenders whose Bid / No-Bid pack is seeded but hidden until they reach
 * Stage 3 (`s3/ready.ts`): Corniche's T-2026-061 and Batinah's T-2026-042,
 * once DG1 Pursue has moved them into Stage 2. The control writes
 * `pack-ready:{TID}` and `stage3-entry:{TID}` → `{ at, byId }`; this applier
 * then enters Stage 3 at its first step, owned by the Bid Manager, with the
 * Stage 3 facts read from the seeded pack and inputs, as `30-stage3` reads
 * them. It runs before `30-stage3`, which keeps the facts current from then on.
 * Pure and idempotent: a tender already past Stage 2 is left as it is.
 */

export const stage3EntryKey = (tenderId: string) => `stage3-entry:${tenderId}`;

interface EntryValue { at: string; byId: string }

/** The full pack, for the facts (masking is the data port's job). */
const ALL = { canSeeMargin: true, canSeePositions: true };
const FIRST_STEP = stageOf(3)!.steps[0].key;

/** Tenders with a seeded pack that the seed keeps hidden (register Stage 1 or 2): the ones this control serves. */
export function stage3Candidates(tenant: string): string[] {
  if (!isGccTenantKey(tenant)) return [];
  const register = gccData(tenant).register;
  return [...new Set(PACK_VERSIONS.filter((p) => p.tenant === tenant).map((p) => p.tenderId))]
    .filter((id) => { const s = register.find((t) => t.id === id)?.stage; return s === 'S1' || s === 'S2'; });
}

/** Whether the tender can move to Stage 3 now, or why not. Null when the control doesn't serve it. */
export function stage3Entry(tenant: string, tenderId: string, done: DemoDone): { ok: true } | { ok: false; reason: string } | null {
  if (!stage3Candidates(tenant).includes(tenderId)) return null;
  const l = lifecycle(tenant, tenderId, done);
  if (!l) return null;
  if (l.closedAt) return { ok: false, reason: `${tenderId} is closed.` };
  const stage = currentOf(l).stage;
  if (stage === 1) return { ok: false, reason: `Record DG1 Pursue on ${tenderId} first: it is in Stage 1.` };
  if (stage !== 2) return { ok: false, reason: `${tenderId} is already in Stage ${stage}.` };
  return { ok: true };
}

/** The control's writes and its audit entry, as the presenter's persona, at the demo time of that entry. */
export function stage3EntryWrite(tenant: string, tenderId: string, byId: string, at: string, done: DemoDone): { writes: Write[]; audit: AuditDraft } | { error: string } {
  const can = stage3Entry(tenant, tenderId, done);
  if (!can) return { error: `${tenderId} has no seeded pack to open.` };
  if (!can.ok) return { error: can.reason };
  const value = JSON.stringify({ at, byId } satisfies EntryValue);
  const pv = packVersionsFor(tenant, tenderId, { ...asDone(done), [packReadyKey(tenderId)]: value });
  return {
    writes: [{ key: packReadyKey(tenderId), value }, { key: stage3EntryKey(tenderId), value }],
    audit: {
      actorId: byId, action: 'Moved to Stage 3 (demo control)', target: tenderId,
      detail: `Stage 3 · ${stageOf(3)!.steps[0].label}. Bid / No-Bid pack v${pv.current?.version} opened with its inputs.`,
    },
  };
}

export const applier: Applier = {
  id: 'stage3-entry',
  apply(tenant, l, done) {
    const id = l.tenderId;
    const v = readDone<EntryValue>(asDone(done), stage3EntryKey(id));
    if (!v || l.closedAt || currentOf(l).stage !== 2) return l;
    const d = asDone(done);
    const pv = packVersionsFor(tenant, id, d);
    const pack = packFor(tenant, id, d, ALL);
    const win = pack?.sections['9.1'].body;
    const margin = pack?.sections['9.7'].body;
    if (!pv.current || !pack || !win || isMasked(win) || !margin || isMasked(margin)) return l;

    const inputs = inputsFor(tenant, id, d);
    const fresh = freshnessFor(tenant, id, d);
    const facts: S3Facts = {
      stage: 3,
      pack: pv.issued ? 'issued' : 'preparation',
      ...(pv.issued && pv.firstIssuedAt ? { issuedAt: pv.firstIssuedAt } : {}),
      inputs: {
        requested: inputs.totals.requested, outstanding: inputs.totals.outstanding, late: inputs.totals.late,
        items: inputs.items.map((i) => ({
          id: i.itemId ?? i.nudgeTarget, what: i.label, section: i.feeds.replace('§', ''), ownerId: i.ownerId,
          requestedById: i.requestedById, requestedAt: i.requestedAt, due: i.due, ...(i.submittedAt ? { submittedAt: i.submittedAt } : {}),
        })),
      },
      ...(fresh?.stale ? { stale: { since: fresh.stale.since, reason: fresh.stale.reason } } : {}),
      positions: { recorded: 0, of: 5, bySeat: {} },
      win: { p: win.p, band: win.band },
      marginRange: [margin.low, margin.high],
      // The pack's own headroom after the bid bond (§9.5), so the dashboards and the pack show one figure.
      facilityAfter: pack.facilityAfter,
      ...(pack.weightedValue ? { weightedValue: pack.weightedValue } : {}),
    };
    const at = later(v.at, currentOf(l).at);
    return { ...l, log: [...l.log, { stage: 3, step: FIRST_STEP, at, ownerId: l.bidManagerId }], facts };
  },
};
