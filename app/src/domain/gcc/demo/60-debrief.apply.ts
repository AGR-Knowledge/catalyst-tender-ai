import type { Lifecycle, WorkEvent } from '@/data/gcc/lifecycle';
import { firstWithRole } from '@/data/people';
import { stageOf } from '@/data/gcc/stages';
import { LOSS_IN_SENTENCE, LOSS_REASONS, type LossReason } from '@/data/gcc/debriefs/vocab';
import { seedDebrief } from '@/data/gcc/debriefs';
import { debriefKey, debriefOkKey } from '@/domain/gcc/debriefs/keys';
import type { DebriefAcceptance, DebriefSubmission } from '@/domain/gcc/debriefs/types';
import { readDone } from '@/domain/gcc/s3/done';
import { asDone, later, type Applier } from './types';

/**
 * A debrief accepted in the demo (plan 035 step 4.1). An accepted debrief is
 * what "Lessons captured" means, so on `debrief-ok:{TID}` for the round of
 * the latest `debrief:{TID}` (a submission not yet accepted changes nothing):
 * - won or lost: a lessons event at the acceptance (unless one is already
 *   there by then), and a live Stage 9 tender moves to Lessons captured, owned
 *   by the Stage 9 owner;
 * - lost: it closes as the seed's T-2025-255 does, "Lost on …; lessons captured";
 * - won: it closes only once its handover is held; until then RES-2 still asks for it;
 * - lost, with a main reason other than the result's: the result reads the
 *   debrief's reason, so OUT-6, the tracker and Bid record follow;
 * - won or lost, with a place the employer told us and none in the result: the result reads it;
 * - stopped endings are already closed: nothing changes.
 * It imports the keys, the vocabulary, the seed (a data module, for a seeded
 * submission the Head of Tendering accepts) and `readDone`, never
 * `domain/gcc/debriefs/index.ts`, which would loop through `lifecycle.ts`.
 */

const isLoss = (x: string | null | undefined): x is LossReason => LOSS_REASONS.some((r) => r.id === x);

const byTime = (a: WorkEvent, b: WorkEvent) => (a.at ?? ('due' in a ? a.due : '')).localeCompare(b.at ?? ('due' in b ? b.due : ''));

export const applier: Applier = {
  id: 'debrief',
  apply(tenant, l, done) {
    const id = l.tenderId;
    if (!(debriefOkKey(id) in done)) return l;
    const r = l.result;
    if (!r || (r.result !== 'won' && r.result !== 'lost')) return l;
    const d = asDone(done);
    const ok = readDone<DebriefAcceptance>(d, debriefOkKey(id));
    const sub = readDone<DebriefSubmission>(d, debriefKey(id)) ?? seedDebrief(tenant, id)?.submission;
    if (!ok || !sub || sub.round !== ok.round) return l;
    const at = ok.at;

    // The result, corrected by what the debrief says.
    const main = sub.main;
    const lossReason = r.result === 'lost' && isLoss(main) && main !== r.lossReason ? main : undefined;
    const rank = sub.place && !r.rank ? sub.place : undefined;
    const result = lossReason || rank ? { ...r, ...(lossReason ? { lossReason } : {}), ...(rank ? { rank } : {}) } : r;

    // Lessons captured at the acceptance; a later seeded lessons event gives way to it.
    const lessonsBy = l.events.some((e) => e.kind === 'lessons' && e.at <= at);
    const events = lessonsBy ? l.events : [...l.events.filter((e) => e.kind !== 'lessons'), { kind: 'lessons' as const, at }].sort(byTime);

    // Stage 9's step: a live tender moves on; a close that the seed placed after the acceptance moves back to it.
    const cur = l.log[l.log.length - 1];
    let log = l.log;
    if (cur.stage === 9 && cur.step !== 'lessons-captured' && !l.closedAt) {
      log = [...l.log, { stage: 9, step: 'lessons-captured', at: later(at, cur.at), ownerId: firstWithRole(tenant, stageOf(9)!.ownerRole)?.id ?? cur.ownerId }];
    } else if (cur.stage === 9 && cur.step === 'lessons-captured' && cur.at > at) {
      const prev = l.log[l.log.length - 2];
      log = [...l.log.slice(0, -1), { ...cur, at: prev ? later(at, prev.at) : at }];
    }

    // The close.
    const handedOver = l.events.some((e) => e.kind === 'handover' && e.at <= at);
    const closes = (!l.closedAt || l.closedAt > at) && (r.result === 'lost' || handedOver);
    const reason = (result.lossReason ?? 'other') as LossReason;
    const close: Partial<Lifecycle> = !closes ? {} : {
      closedAt: later(at, log[log.length - 1].at),
      closedAs: r.result,
      closedNote: r.result === 'lost' ? `Lost on ${LOSS_IN_SENTENCE[reason]}; lessons captured` : 'Won; handed over and lessons captured',
    };
    const facts = l.facts?.stage === 9 ? (closes ? undefined : { ...l.facts, lessons: true }) : l.facts;
    const { facts: _f, ...rest } = l;
    return { ...rest, result, events, log, ...close, ...(facts ? { facts } : {}) };
  },
};
