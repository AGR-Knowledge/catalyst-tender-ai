import { personId, stepOwnerRole } from '@/data/gcc/lifecycle/chain';
import { dg1Queue } from '@/domain/gcc/dg1';
import { DONE_KEY } from '@/domain/gcc/s1/done';
import { validatedOf } from '@/domain/gcc/s1/validation';
import { currentOf } from '@/domain/gcc/lifecycle';
import { asDone, later, type Applier } from './types';

/**
 * A tender moves on once its fields are validated (plan 025b): when the
 * Coordinator resolves the last field that blocks DG1 on a tender at Stage 1
 * · Validating, it enters the next step at the time of that resolution:
 * - Awaiting DG1, owned by its Bid Manager, when it waits for DG1 (a DG1 due
 *   time in its facts, or routed to the DG1 queue by intake);
 * - Screened, owned by the Coordinator, otherwise.
 * It needs one of the tender's own items resolved in the demo, so the seed
 * never moves. A resolution without a time uses the current step's.
 *
 * The DG1 gate stays where the seed had it. With a DG1 due time the gate
 * reads that (`openGate`). Without one, `10-dg1` opens a recorded decision at
 * the step the tender waits at, so this applier stands down once a DG1
 * action is on record for such a tender, and `10-dg1` reads the seed's step.
 */

const next = (waits: boolean) => (waits ? 'awaiting-dg1' : 'screened');

export const applier: Applier = {
  id: 'validated',
  apply(tenant, l, done) {
    const cur = currentOf(l);
    if (l.closedAt || cur.stage !== 1 || cur.step !== 'validating') return l;
    const id = l.tenderId;
    const v = validatedOf(tenant, id, asDone(done));
    if (!v) return l;
    const dg1Due = l.facts?.stage === 1 ? l.facts.dg1Due : undefined;
    if (!dg1Due && [DONE_KEY.dg1(id), DONE_KEY.dg1Hold(id), DONE_KEY.dg1Reopen(id)].some((k) => k in done)) return l;
    const step = next(!!dg1Due || dg1Queue(tenant, {}).some((q) => q.tenderId === id));
    const role = stepOwnerRole(1, step);
    const ownerId = role === 'bidManager' ? l.bidManagerId : personId(tenant, role);
    return { ...l, log: [...l.log, { stage: 1, step, at: later(v.at ?? cur.at, cur.at), ownerId }] };
  },
};
