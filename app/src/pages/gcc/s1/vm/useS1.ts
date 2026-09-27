import { useCallback, useMemo } from 'react';
import type { Tone } from '@/data/types';
import { can, type CanCtx, type CanResult, type Capability } from '@/data/access';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { queriesFor, tenderCtx } from '@/domain/gcc/lifecycle.port';
import type { AuditDraft, DoneWrite } from '@/domain/gcc/s1/done';

/**
 * What every Stage 1 screen needs (plan 007b): the tenant, the viewer (the
 * viewed person during View as), the demo state, the lifecycle queries bound
 * to both, and `check()`, the permission with its refusal sentence for one
 * tender. Writes go through `mark()` and the audit trail, so a reload keeps
 * them and Reset demo clears them.
 */
export function useS1() {
  const demo = useDemo();
  const { state } = demo;
  const tenant = useTenantKey();
  const viewer = state.person;
  const done = state.done;
  const viewAs = !!state.viewAs;
  const q = useMemo(() => queriesFor({ tenant, viewer, done }), [tenant, viewer, done]);

  /** `can()` for this viewer, on one tender when an id is given. */
  const check = useCallback((cap: Capability, tenderId?: string, extra?: Partial<CanCtx>): CanResult => {
    const l = tenderId ? q.one(tenderId) : undefined;
    return can(viewer, cap, { ...(l ? tenderCtx(tenant, l) : {}), viewAs, ...extra });
  }, [q, viewer, tenant, viewAs]);

  /** May the viewer open this tender at all (restricted lane, invitations). */
  const canOpen = useCallback((tenderId: string) => !!q.one(tenderId), [q]);

  /** The time the next audit entry will carry: a minute after the last, from 10:00 on demo day (the store's clock). */
  const nextAt = useCallback(() => demo.nextAt(), [demo]);

  /** Write the rule module's done pairs and audit drafts, for one tender. The toast goes with the last write. */
  const write = useCallback((tenderId: string, writes: DoneWrite[], audits: AuditDraft[], toast?: { msg: string; tone?: Tone }) => {
    writes.forEach((w, i) => demo.mark(w.key, i === writes.length - 1 ? toast?.msg : undefined, toast?.tone ?? 'green', w.value));
    for (const a of audits) demo.logAudit({ actorId: viewer.id, action: a.action, target: tenderId, ...(a.detail ? { detail: a.detail } : {}) });
  }, [demo, viewer.id]);

  return { ...demo, tenant, viewer, done, viewAs, q, check, canOpen, nextAt, write };
}

export type S1 = ReturnType<typeof useS1>;
