import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { can, holdersOf, type CanCtx, type CanResult, type Capability } from '@/data/access';
import type { Person } from '@/data/people';
import { useDemo, type AuditEvent } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { queriesFor, tenderCtx } from '@/domain/gcc/lifecycle.port';
import { documentFor } from '@/domain/gcc/documents';
import {
  isWriteError, K, NOW, liveS2Tenders, registerRow, supplierName, type Done, type LiveRfq, type S2Write, type S2WriteResult,
} from '@/domain/gcc/s2';
import type { SourceDoc } from '@/components/tender/SourceHost';

/**
 * What every Stage 2 panel needs for one tender (plan 008b): the tenant, the
 * viewer, the demo state, `can()` bound to the tender, what the viewer may see
 * of the quotes, and one way to record a write (the `done` key, its audit
 * entry and a toast). The `/sourcing` and `/levelling` pages and the workspace's
 * Sourcing tab build it the same way, so a panel reads the same everywhere.
 */

export interface DeskCtx {
  tenant: string;
  tenderId: string;
  title: string;
  viewer: Person;
  viewAs: boolean;
  done: Done;
  audit: AuditEvent[];
  now: string;
  check(cap: Capability, extra?: Partial<CanCtx>): CanResult;
  /** Quote amounts, levelled prices and adjustment amounts (`see.quotes`). Without it, counts and states only. */
  seesQuotes: boolean;
  quotesBy: string;
  doc: SourceDoc | null;
  /** Record one write; a refused write toasts its reason. True when recorded. */
  apply(r: S2WriteResult<unknown>, msg: string, sensitive?: 'quotes'): boolean;
  /** Record several writes, all or none (the first refusal stops them). */
  applyAll(rs: S2WriteResult<unknown>[], msg: string, sensitive?: 'quotes'): boolean;
}

export function useDesk(tenderId: string, from?: { check?: DeskCtx['check'] }): DeskCtx {
  const { state, mark, logAudit, toast } = useDemo();
  const tenant = useTenantKey();
  const { person, done, audit } = state;
  const viewAs = !!state.viewAs;

  const canCtx = useMemo<CanCtx>(() => {
    const l = queriesFor({ tenant, viewer: person, done }).one(tenderId);
    return { ...(l ? tenderCtx(tenant, l) : {}), viewAs };
  }, [tenant, person, done, tenderId, viewAs]);

  const fromCheck = from?.check;
  const check = useCallback(
    (cap: Capability, extra?: Partial<CanCtx>) => (fromCheck ? fromCheck(cap, extra) : can(person, cap, { ...canCtx, ...extra })),
    [fromCheck, person, canCtx],
  );

  const record = useCallback((w: S2Write<unknown>, msg: string | undefined, sensitive?: 'quotes') => {
    logAudit({ ...w.audit, ...(sensitive ? { sensitive } : {}) });
    mark(w.key, msg, 'green', w.value);
  }, [logAudit, mark]);

  const apply = useCallback((r: S2WriteResult<unknown>, msg: string, sensitive?: 'quotes') => {
    if (isWriteError(r)) { toast(r.error, 'red'); return false; }
    record(r, msg, sensitive);
    return true;
  }, [record, toast]);

  const applyAll = useCallback((rs: S2WriteResult<unknown>[], msg: string, sensitive?: 'quotes') => {
    const bad = rs.find(isWriteError);
    if (bad) { toast(bad.error, 'red'); return false; }
    const ok = rs as S2Write<unknown>[];
    ok.forEach((w, i) => record(w, i === ok.length - 1 ? msg : undefined, sensitive));
    return ok.length > 0;
  }, [record, toast]);

  const doc = useMemo(() => {
    const d = documentFor(tenant, tenderId);
    return d ? { url: d.url, title: d.title } : null;
  }, [tenant, tenderId]);

  const seesQuotes = check('see.quotes').ok;
  return {
    tenant, tenderId, title: registerRow(tenant, tenderId)?.title ?? tenderId, viewer: person, viewAs, done, audit, now: DEMO_NOW,
    check, seesQuotes, quotesBy: holdersOf('see.quotes'), doc, apply, applyAll,
  };
}

/** The tenders being sourced now that this viewer may open, the viewer's own first. */
export function useLiveTenders(): { id: string; title: string; mine: boolean }[] {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const { person, done } = state;
  return useMemo(() => {
    const q = queriesFor({ tenant, viewer: person, done });
    return liveS2Tenders(tenant, done)
      .map((t) => ({ t, l: q.one(t.tenderId) }))
      .filter((x) => !!x.l)
      .map(({ t, l }) => ({ id: t.tenderId, title: registerRow(tenant, t.tenderId)?.title ?? t.tenderId, mine: l!.bidManagerId === person.id }))
      .sort((a, b) => Number(b.mine) - Number(a.mine) || b.id.localeCompare(a.id));
  }, [tenant, person, done]);
}

/** A `?key=` value in the URL, and a setter that keeps the other params. */
export function useParam(key: string): [string | null, (v: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback((v: string | null) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (v === null) n.delete(key); else n.set(key, v);
      return n;
    }, { replace: true });
  }, [key, setParams]);
  return [params.get(key), set];
}

/** A nudge by the buyer (`K.nudged(rfqId)`, plan 008a's convention): counted on the RFQ, with its audit entry. */
export function nudgeWrite(tenant: string, r: LiveRfq, byId: string, done: Done, at = NOW): S2WriteResult<{ at: string; byId: string }> {
  if (done[K.nudged(r.id)]) return { error: `${supplierName(tenant, r.supplierId)} has already been nudged on this RFQ.` };
  if (r.repliedAt) return { error: `${supplierName(tenant, r.supplierId)} has already replied.` };
  const record = { at, byId };
  return {
    key: K.nudged(r.id), value: JSON.stringify(record), record,
    audit: { actorId: byId, action: 'Supplier nudged', target: r.id, detail: `Reminder sent by hand to ${supplierName(tenant, r.supplierId)} for ${r.packageId}, on top of the scheduled reminders.` },
  };
}

/** Only the tender's own entries in the demo audit trail: its packages, RFQs and quotes carry its id. */
export const auditOfTender = (audit: AuditEvent[], tenderId: string) => audit.filter((e) => e.target?.includes(tenderId));
