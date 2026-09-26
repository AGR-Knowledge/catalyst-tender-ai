import { dg1RecordFor } from '@/domain/gcc/dg1/record';
import { requestsIn } from '@/domain/gcc/requestKeys';
import { readDone } from '@/domain/gcc/s1/done';
import { asDone, hasKey, type Applier } from './types';

/**
 * Who the demo invited to a tender (orchestrator, 2026-09-26): the bid team a
 * DG1 Pursue names, and whoever an input (`input-req:`) or a request
 * (`request:`) on it went to. Contributors see only the tenders they are
 * invited to (`access.ts`), so without this a Finance or Planning owner asked
 * in the demo would land on a masked tab. Last in file order: it only adds names.
 */
export const applier: Applier = {
  id: 'invited',
  apply(tenant, l, done) {
    const id = l.tenderId;
    if (!hasKey(done, `dg1:${id}`, `input-req:${id}:`, `request:${id}:`)) return l;
    const d = asDone(done);
    const ids = new Set<string>();
    const cur = dg1RecordFor(tenant, id, d).current;
    if (cur && cur.decision === 'pursue' && 'team' in cur && cur.team) for (const p of Object.values(cur.team)) if (p) ids.add(p);
    for (const k of Object.keys(d).filter((x) => x.startsWith(`input-req:${id}:`))) {
      const to = readDone<{ toId?: string }>(d, k)?.toId;
      if (to) ids.add(to);
    }
    for (const r of requestsIn(d)) if (r.tenderId === id) ids.add(r.toId);
    const before = l.invited ?? [];
    const add = [...ids].filter((x) => !before.includes(x));
    return add.length ? { ...l, invited: [...before, ...add] } : l;
  },
};
