import { personId, stepOwnerRole } from '@/data/gcc/lifecycle/chain';
import { DG1_SLA_HOURS, waitsForDg1 } from '@/domain/gcc/dg1/record';
import { addHours } from '@/domain/gcc/clock';
import { tenderOf } from '@/domain/gcc/s1/common';
import { validatedOf } from '@/domain/gcc/s1/validation';
import { currentOf } from '@/domain/gcc/lifecycle';
import { asDone, later, type Applier } from './types';

/**
 * A tender moves on once its fields are validated (plans 025b, 026): when the
 * Coordinator resolves the last field that blocks DG1 on a tender at Stage 1
 * · Validating, it enters the next step at the time of that resolution:
 * - Awaiting DG1, owned by its Bid Manager, when it waits for DG1
 *   (`waitsForDg1`: shortlisted by intake, or routed to validation);
 * - Screened, owned by the Coordinator, otherwise.
 * It needs one of the tender's own items resolved in the demo, so the seed
 * never moves. A resolution without a time uses the current step's.
 *
 * A tender routed to validation has no DG1 due time in the seed. It gets the
 * one the DG1 list and pack count from, logging + the DG1 SLA, so `openGate`
 * (and `10-dg1`'s record) opens the gate there, not at the resolution.
 */

export const applier: Applier = {
  id: 'validated',
  apply(tenant, l, done) {
    const cur = currentOf(l);
    if (l.closedAt || cur.stage !== 1 || cur.step !== 'validating') return l;
    const id = l.tenderId;
    const d = asDone(done);
    const v = validatedOf(tenant, id, d);
    if (!v) return l;
    const waits = waitsForDg1(tenant, id, d);
    const step = waits ? 'awaiting-dg1' : 'screened';
    const role = stepOwnerRole(1, step);
    const ownerId = role === 'bidManager' ? l.bidManagerId : personId(tenant, role);
    const log = [...l.log, { stage: 1 as const, step, at: later(v.at ?? cur.at, cur.at), ownerId }];
    const loggedAt = tenderOf(tenant, id)?.intake.loggedAt;
    const f = l.facts;
    if (waits && loggedAt && f?.stage === 1 && !f.dg1Due) return { ...l, log, facts: { ...f, dg1Due: addHours(loggedAt, DG1_SLA_HOURS) } };
    return { ...l, log };
  },
};
