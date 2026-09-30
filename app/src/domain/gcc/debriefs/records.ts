import { can } from '@/data/access';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { seedDebrief } from '@/data/gcc/debriefs';
import { lifecycle, queriesFor, tenderCtx, type DemoDone } from '@/domain/gcc/lifecycle';
import { readDone } from '@/domain/gcc/s3/done';
import { dueByOf, endingAt, statusOf } from './endings';
import { debriefBackKey, debriefKey, debriefOkKey } from './keys';
import type { DebriefAcceptance, DebriefCtx, DebriefRecord, DebriefSendBack, DebriefStatus, DebriefSubmission } from './types';

/**
 * The debrief records (plan 035 step 3.1): the seed's record for each ended
 * bid, with the demo's keys over it.
 * - `debrief:{TID}` replaces the seed's submission (a demo round is the seed's + 1);
 * - `debrief-back:{TID}` and `debrief-ok:{TID}` count only for the latest submission's round.
 * An ending made in the demo (a live No-Bid or DG3 rejection) has no seed
 * record, so it starts due from its ended time.
 */

export interface DebriefEntry { l: Lifecycle; record: DebriefRecord; status: DebriefStatus }

/** One lifecycle's record (the lifecycle merged with `done`), or null when it has no ending. */
export function recordOf(tenant: string, l: Lifecycle, done: DemoDone): DebriefRecord | null {
  const e = endingAt(l);
  if (!e) return null;
  const id = l.tenderId;
  const seed = seedDebrief(tenant, id);
  const d = done as Record<string, string>;
  const demoSub = readDone<DebriefSubmission>(d, debriefKey(id));
  const sub = demoSub ?? seed?.submission;
  const back = readDone<DebriefSendBack>(d, debriefBackKey(id)) ?? seed?.sentBack;
  const ok = readDone<DebriefAcceptance>(d, debriefOkKey(id)) ?? seed?.accepted;
  const endedAt = seed?.endedAt ?? e.at;
  return {
    tenderId: id, ending: seed?.ending ?? e.ending, endedAt, dueBy: seed?.dueBy ?? dueByOf(endedAt),
    ...(sub ? { submission: sub } : {}),
    ...(sub && back && back.round === sub.round && back.at >= sub.at ? { sentBack: back } : {}),
    ...(sub && ok && ok.round === sub.round ? { accepted: ok } : {}),
    source: demoSub || !seed ? 'demo' : seed.source,
  };
}

/** The lifecycle as the seed has it: what the result said before any debrief corrected it. */
export const seedLifecycleOf = (tenant: string, tenderId: string) => lifecycle(tenant, tenderId);

const CACHE = new WeakMap<object, Map<string, DebriefEntry[]>>();

/**
 * Every ended bid the viewer may read the debrief of: the tenders they may
 * open (`queriesFor`), narrowed by `debrief.view` on each (a Bid Manager
 * reads their own tenders only). Memoised on the demo state's identity.
 */
export function recordsFor(ctx: DebriefCtx): DebriefEntry[] {
  const key = `${ctx.tenant}|${ctx.viewer.id}|${ctx.now}`;
  let memo = CACHE.get(ctx.done);
  if (!memo) CACHE.set(ctx.done, (memo = new Map()));
  const hit = memo.get(key);
  if (hit) return hit;
  const out = queriesFor(ctx).all().flatMap((l) => {
    if (!can(ctx.viewer, 'debrief.view', tenderCtx(ctx.tenant, l)).ok) return [];
    const record = recordOf(ctx.tenant, l, ctx.done);
    return record ? [{ l, record, status: statusOf(record, ctx.now) }] : [];
  });
  memo.set(key, out);
  return out;
}

/** One tender's entry, whoever reads it (the writers check the writer's own rights). */
export function entryOf(ctx: Pick<DebriefCtx, 'tenant' | 'done' | 'now'>, tenderId: string): DebriefEntry | null {
  const l = lifecycle(ctx.tenant, tenderId, ctx.done);
  const record = l ? recordOf(ctx.tenant, l, ctx.done) : null;
  return l && record ? { l, record, status: statusOf(record, ctx.now) } : null;
}
