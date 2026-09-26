import type { Position, S3Facts, StageEntry } from '@/data/gcc/lifecycle';
import { SEATS, type Seat } from '@/data/people';
import { stageOf } from '@/data/gcc/stages';
import { stepOwnerRole } from '@/data/gcc/lifecycle/chain';
import {
  freshnessFor, inputsFor, keysWithPrefix, packFor, packVersionsFor, readDone, type InputSubValue, type PackIssueValue,
} from '@/domain/gcc/s3';
import { positionsFor } from '@/domain/gcc/dg2/positions';
import { posKey, type Dg2PositionValue } from '@/domain/gcc/dg2/keys';
import { currentOf } from '@/domain/gcc/lifecycle';
import { asDone, hasKey, later, type Applier, type Done } from './types';

/**
 * Stage 3 recorded in the demo (plan 021 step 2.3), for tenders in Stage 3
 * with plan 009a's pack, from 009a's own readers with `done`:
 * - inputs requested, submitted, outstanding and late (`inputsFor`);
 * - the pack issued, from its first issue (`packVersionsFor`), and stale or
 *   fresh (`freshnessFor`: a re-run clears it, a renewal after generation sets it);
 * - positions recorded, by seat (`positionsFor`);
 * - the margin range, facility after the bond and weighted value, as the pack shows them.
 * The step only moves forward: every input in → Inputs complete; issued in the
 * demo → Pack issued; a position recorded in the demo → Positions in; quorum
 * met → Awaiting approval.
 */

const STEPS = stageOf(3)!.steps.map((s) => s.key);
/** The full pack, for the facts (masking is the data port's job). */
const ALL = { canSeeMargin: true, canSeePositions: true };

const sorted = (xs: (string | undefined)[]) => xs.filter((x): x is string => !!x).sort();

function ownerOf(tenant: string, bidManagerId: string | null, step: string): string | null {
  const role = stepOwnerRole(3, step);
  return role === 'bidManager' ? bidManagerId : `${tenant}.${role}`;
}

export const applier: Applier = {
  id: 'stage3',
  apply(tenant, l, done) {
    const f = l.facts;
    if (l.closedAt || f?.stage !== 3 || currentOf(l).stage !== 3) return l;
    const id = l.tenderId;
    if (!hasKey(done, `input-req:${id}:`, `input-sub:${id}:`, `pack-rerun:${id}`, `pack-issue:${id}`, `dg2-pos:${id}:`, 'renewed:')) return l;
    const d: Done = asDone(done);
    const pv = packVersionsFor(tenant, id, d);
    if (!pv.current) return l;

    const inputs = inputsFor(tenant, id, d);
    const pos = positionsFor(tenant, id, d);
    const fresh = freshnessFor(tenant, id, d);
    const pack = packFor(tenant, id, d, ALL);
    const margin = pack?.sections['9.7'].body;
    const bySeat: Partial<Record<Seat, Position>> = {};
    for (const s of pos.seats) if (s.position) bySeat[s.seat] = { stance: s.position.stance, at: s.position.at, ...(s.position.comment ? { comment: s.position.comment } : {}) };

    const { issuedAt: _i, stale: _s, weightedValue: _w, ...base } = f;
    const facts: S3Facts = {
      ...base,
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
      positions: { recorded: pos.recorded, of: f.positions.of, bySeat },
      marginRange: margin && !margin.masked ? [margin.low, margin.high] : f.marginRange,
      facilityAfter: pack?.facilityAfter ?? f.facilityAfter,
      ...(pack?.weightedValue ? { weightedValue: pack.weightedValue } : {}),
    };

    // Steps the demo reached, each at the time of the demo action that reached it.
    const subs = sorted(keysWithPrefix(d, `input-sub:${id}:`).map((k) => readDone<InputSubValue>(d, k)?.at));
    const issue = readDone<PackIssueValue>(d, `pack-issue:${id}`);
    const posAt = sorted(SEATS.map((seat) => readDone<Dg2PositionValue>(d, posKey(id, seat))?.at));
    const moves: [string, string | undefined][] = [
      ['inputs-complete', inputs.totals.requested && !inputs.totals.outstanding ? subs[subs.length - 1] : undefined],
      ['pack-issued', issue?.at],
      ['positions-in', pv.issued ? posAt[0] : undefined],
      ['awaiting-approval', pv.issued && pos.quorum.met ? posAt[posAt.length - 1] : undefined],
    ];
    let log: StageEntry[] = l.log;
    for (const [step, at] of moves) {
      const last = log[log.length - 1];
      if (!at || STEPS.indexOf(step) <= STEPS.indexOf(last.step)) continue;
      log = [...log, { stage: 3, step, at: later(at, last.at), ownerId: ownerOf(tenant, l.bidManagerId, step) }];
    }
    return { ...l, log, facts };
  },
};
