import type { GateRecord, Lifecycle } from '@/data/gcc/lifecycle';
import { addDays } from '@/data/gcc/lifecycle/chain';
import { DEBRIEF_DUE_DAYS } from '@/data/gcc/targets';
import { stopOf } from '@/data/gcc/debriefs/stops';
import type { DebriefStatus, Ending } from '@/data/gcc/debriefs/vocab';
import { DEMO_TODAY } from '@/domain/calendar';
import type { DebriefRecord } from './types';

/**
 * How a bid ended, when, and what its debrief's status is (plan 035 Phase 1).
 * Pure, and it imports data modules only: the seed generator
 * (`data/gcc/debriefs/generate.ts`) and the domain both read it, so the seed
 * and the demo can never disagree on an ending.
 */

/** The DG1 decision that stands: the last one not re-opened. */
function dg1Of(l: Lifecycle): GateRecord | undefined {
  const xs = l.gates.filter((g) => g.gate === 'DG1');
  return [...xs].reverse().find((g) => !g.reopened) ?? xs[xs.length - 1];
}

/** A bid: DG1 decided Pursue. A DG1 discard, or a DG1 Hold that lapsed, never was one. */
export const isBid = (l: Lifecycle) => dg1Of(l)?.decision === 'pursue';

/** The last gate record of a kind with a decision. */
const gateAt = (l: Lifecycle, gate: GateRecord['gate'], decision: GateRecord['decision']) =>
  [...l.gates].reverse().find((g) => g.gate === gate && g.decision === decision);

export interface EndingAt { ending: Ending; at: string }

/**
 * The ending and its time (the Design's table), or null: still live, or not a bid.
 * - won, lost, cancelled after opening: the result's time;
 * - withdrawn before a result: the close; the employer's stops (`STOP_NOTES`) read as cancelled;
 * - No-Bid at DG2 and rejected at DG3: the gate's time.
 */
export function endingAt(l: Lifecycle): EndingAt | null {
  if (!isBid(l)) return null;
  const r = l.result;
  if (r && (r.result === 'won' || r.result === 'lost' || r.result === 'cancelled')) return { ending: r.result, at: r.at };
  if (!l.closedAt) return null;
  switch (l.closedAs) {
    case 'withdrawn':
      if (r?.result === 'withdrawn') return { ending: 'withdrawn', at: r.at };
      return { ending: stopOf(l.closedNote).by === 'employer' ? 'cancelled' : 'withdrawn', at: l.closedAt };
    case 'no-bid':
      return { ending: 'no-bid', at: gateAt(l, 'DG2', 'no-bid')?.at ?? l.closedAt };
    case 'rejected':
      return { ending: 'rejected', at: gateAt(l, 'DG3', 'rejected')?.at ?? l.closedAt };
    default:
      return null;
  }
}

/** The ending alone. */
export const endingOfLifecycle = (l: Lifecycle): Ending | null => endingAt(l)?.ending ?? null;

/** Due `DEBRIEF_DUE_DAYS` calendar days after the ending's date. */
export const dueByOf = (endedAt: string) => addDays(endedAt.slice(0, 10), DEBRIEF_DUE_DAYS);

/**
 * Lessons recorded by demo day. Stage 9's one predicate (plan 035 step 2.2.1):
 * RES-3, the Stage 9 column and the seed's accepted debriefs all read it, so
 * "Accepted" and "Lessons captured" agree by construction. `stage9.kpi.ts`
 * re-exports it.
 */
export const hasLessons = (l: Lifecycle) => l.events.some((e) => e.kind === 'lessons' && e.at <= `${DEMO_TODAY}T23:59`);

/**
 * The status (the Design's order): accepted (the latest submission's
 * acceptance), else sent back (a send-back of the latest submission), else
 * submitted, else due until the due date's 23:59 on the demo clock, else overdue.
 */
export function statusOf(rec: Pick<DebriefRecord, 'submission' | 'sentBack' | 'accepted' | 'dueBy'>, now: string): DebriefStatus {
  const s = rec.submission;
  if (s && rec.accepted && rec.accepted.round === s.round) return 'accepted';
  if (s && rec.sentBack && rec.sentBack.round === s.round && rec.sentBack.at >= s.at) return 'sent-back';
  if (s) return 'submitted';
  return now <= `${rec.dueBy}T23:59` ? 'due' : 'overdue';
}
