import type { Lifecycle, S2Facts, StageEntry } from '@/data/gcc/lifecycle';
import { stageOf } from '@/data/gcc/stages';
import {
  K, NOW, clarificationsFor, keysWithPrefix, levelledFor, mixFor, notCovered, packageCoverage, pursueOf, quotesFor, readDone, replyByFor, rfqCounts, s2TenderOf,
  type LevValue, type MixValue, type PackagingValue, type ShortlistValue,
} from '@/domain/gcc/s2';
import { sentBatches } from '@/domain/gcc/s2/context';
import { currentOf } from '@/domain/gcc/lifecycle';
import { asDone, hasKey, later, type Applier, type Done } from './types';

/**
 * Stage 2 progress recorded in the demo (plan 021 step 2.2), for tenders in
 * Stage 2 with plan 008a's record: seeded, or pursued in the demo (`10-dg1`).
 *
 * - The step follows the furthest demo action, and only moves forward:
 *   `pkg:` → Shortlisting, `shortlist:` → RFQs out, `rfq-sent:` → Quotes in,
 *   a `lev:` on one of its quotes → Levelling, `mix:` → Best-fit approved.
 * - `facts.s2` are 008a's own counts with `done` (the same reading the 80-stage2
 *   check compares with plan 017's seed facts), so the two never disagree.
 */

const STAGE2_KEYS = ['pkg:', 'shortlist:', 'rfq-sent:', 'lev:', 'gap:', 'mix:', 'clar:', 'sq:'];
const STEPS = stageOf(2)!.steps.map((s) => s.key);

const earliest = (xs: (string | undefined)[]) => xs.filter((x): x is string => !!x).sort()[0];

/** 008a's Stage 2 numbers for one tender, in plan 017's step-fact shape. */
export function s2FactsOf(tenant: string, tenderId: string, done: Done): S2Facts {
  const cov = packageCoverage(tenant, tenderId, done);
  const c = rfqCounts(tenant, tenderId, done);
  const open = clarificationsFor(tenant, tenderId, done).filter((x) => x.state === 'open');
  return {
    stage: 2,
    packages: { total: cov.total, covered: cov.covered },
    rfqs: { sent: c.sent, total: c.total, overdue: c.overdue, escalated: c.escalated, answeredOnTime: c.answeredOnTime, dueSoFar: c.dueSoFar },
    toLevel: levelledFor(tenant, tenderId, done).filter((x) => x.state === 'to-level').length,
    notCoveredPct: notCovered(tenant, tenderId)?.pct ?? 0,
    // Before any RFQ is sent: the reply date an RFQ sent now would get, as 008a's RFQ draft shows it.
    repliesDue: (c.repliesDue ?? replyByFor(tenant, NOW)).slice(0, 10),
    clarifications: { open: open.length, stale: open.filter((x) => x.stale).length },
    bestFitApproved: mixFor(tenant, tenderId, done)?.picks.length ?? 0,
  };
}

/** The Stage 2 steps the demo actions reached, each with the time of the first action that reached it. */
function movesOf(tenant: string, tenderId: string, d: Done): [string, string | undefined][] {
  const quoteIds = new Set(quotesFor(tenant, tenderId, d).map((q) => q.id));
  return [
    ['shortlisting', readDone<PackagingValue>(d, K.pkg(tenderId))?.at],
    ['rfqs-out', earliest(keysWithPrefix(d, `shortlist:${tenderId}:`).map((k) => readDone<ShortlistValue>(d, k)?.at))],
    ['quotes-in', earliest(sentBatches(tenderId, d).map((b) => b.value.at))],
    ['levelling', earliest(keysWithPrefix(d, 'lev:').filter((k) => quoteIds.has(k.split(':')[1])).map((k) => readDone<LevValue>(d, k)?.at))],
    ['best-fit-approved', readDone<MixValue>(d, K.mix(tenderId))?.at],
  ];
}

export const applier: Applier = {
  id: 'stage2',
  apply(tenant, l, done) {
    if (l.closedAt || currentOf(l).stage !== 2) return l;
    const id = l.tenderId;
    if (!s2TenderOf(tenant, id)) return l;
    const d = asDone(done);
    const pursue = pursueOf(tenant, id, d);
    if (!pursue) return l;
    // A seeded Stage 2 tender changes only with Stage 2 keys; one pursued in the demo always gets 008a's facts.
    if (pursue.source !== 'demo' && !hasKey(done, ...STAGE2_KEYS)) return l;

    let log: StageEntry[] = l.log;
    for (const [step, at] of movesOf(tenant, id, d)) {
      const last = log[log.length - 1];
      if (!at || STEPS.indexOf(step) <= STEPS.indexOf(last.step)) continue;
      log = [...log, { stage: 2, step, at: later(at, last.at), ownerId: last.ownerId }];
    }
    const facts = s2FactsOf(tenant, id, d);
    return log === l.log && JSON.stringify(facts) === JSON.stringify(l.facts) ? l : { ...l, log, facts } satisfies Lifecycle;
  },
};
