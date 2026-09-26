import { can, type CanCtx, type CanResult, type Capability } from '@/data/access';
import type { Person } from '@/data/people';
import { queriesFor, tenderCtx } from '@/domain/gcc/lifecycle.port';
import type { PackViewer } from '@/domain/gcc/s3';
import type { AuditEvent } from '@/state/store';

/**
 * What one person may see and do on one tender, for the Stage 3 and DG2
 * screens outside the workspace (which has its own `ctx.can`/`ctx.check`).
 * A tender the person may not open answers every check with a refusal, so a
 * scoped grant ("invited", "assigned") never falls back to the list-level yes.
 */
export interface TenderAccess {
  /** False: the tender doesn't exist here, or isn't shared with this person. */
  open: boolean;
  /** What `packFor` and `dg2RecordFor` take. */
  sight: PackViewer;
  can(cap: Capability, extra?: Partial<CanCtx>): boolean;
  check(cap: Capability, extra?: Partial<CanCtx>): CanResult;
}

const NOT_HERE: CanResult = { ok: false, reason: 'This tender has not been shared with you' };

export function tenderAccess(tenant: string, tenderId: string, person: Person, done: Record<string, string>, viewAs: boolean): TenderAccess {
  const l = queriesFor({ tenant, viewer: person, done }).one(tenderId);
  const base: CanCtx = { ...(l ? tenderCtx(tenant, l) : {}), viewAs };
  const check = (cap: Capability, extra?: Partial<CanCtx>): CanResult => (l ? can(person, cap, { ...base, ...extra }) : NOT_HERE);
  return {
    open: !!l,
    sight: { canSeeMargin: check('see.margin').ok, canSeePositions: check('see.positions').ok },
    can: (cap, extra) => check(cap, extra).ok,
    check,
  };
}

/** The sight a workspace tab passes to the pack and DG2 readers. */
export const sightOf = (can: (cap: Capability) => boolean): PackViewer => ({ canSeeMargin: can('see.margin'), canSeePositions: can('see.positions') });

/** An audit entry as the store takes it, with what its detail reveals (orchestrator contract, wave 4). */
export type AuditIn = Omit<AuditEvent, 'id' | 'at'>;
