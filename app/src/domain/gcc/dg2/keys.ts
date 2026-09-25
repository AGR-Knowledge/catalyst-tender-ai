import type { Seat } from '@/data/people';
import type { Stance } from '@/data/gcc/s3';
import { readDone, type Done } from '@/domain/gcc/s3/done';

/**
 * DG2 done-key values (plan 009a, done-key table) and the two readers every
 * DG2 module shares: the decision round, and the decision that is in force.
 *
 * A decision belongs to a round: 1 at first, one more after each approved
 * re-open. Keys are never deleted, so a re-open doesn't clear `dg2:{TID}`: it
 * moves the round on, and the old decision stops being in force.
 */

export type Dg2Choice = 'bid' | 'no-bid';
export type ReopenTrigger = 'competitor-withdrew' | 'employer-signal' | 'jv-offer' | 'other';

/** `dg2-pos:{TID}:{seat}`. `byId` is the member; `recordedById` the Head of Tendering recording it as secretary. */
export interface Dg2PositionValue {
  stance: Stance;
  comment?: string;
  conditions?: string[];
  coi?: { declared: true; text: string };
  packVersion: number;
  /** Decision round it was recorded in (1 when absent). */
  round?: number;
  recordedById?: string;
  at: string;
  byId: string;
}

export interface Majority { for: number; against: number; abstain: number; result: 'bid' | 'no-bid' | 'none' }

/** `dg2:{TID}`. */
export interface Dg2Decision {
  tenderId: string;
  decision: Dg2Choice;
  at: string;
  byId: string;
  againstMajority: boolean;
  reason?: string;
  reasonCodes?: string[];
  conditions: string[];
  packVersion: number;
  positionsSnapshot: { seat: Seat; personId: string; stance?: Stance; comment?: string; conditions?: string[]; at?: string; packVersion?: number }[];
  majority: Majority;
  lessons?: string;
  staleAcknowledged?: boolean;
  round: number;
}

/** `dg2-reopen-req:{TID}`. */
export interface ReopenRequestValue { reason: string; trigger: ReopenTrigger; round: number; at: string; byId: string }

/** `dg2-reopen:{TID}`: the Head of Tendering's approval, holding every decision re-opened so far. */
export interface ReopenValue {
  approved: true;
  round: number;
  reason: string;
  trigger: ReopenTrigger;
  requestedById: string;
  previous: Dg2Decision[];
  at: string;
  byId: string;
}

/** `dg2-letter:{TID}`. */
export interface LetterValue { text: string; sent: boolean; at: string; byId: string }

/** `cond:{conditionId}`. */
export interface ConditionValue { state: 'closed'; note?: string; at: string; byId: string }

export const posKey = (tenderId: string, seat: Seat) => `dg2-pos:${tenderId}:${seat}`;

/** The decision round in force: 1, plus one per approved re-open. */
export function roundOf(done: Done, tenderId: string): number {
  const r = readDone<ReopenValue>(done, `dg2-reopen:${tenderId}`);
  return r?.approved ? r.round + 1 : 1;
}

/** The DG2 decision in force, or null (none yet, or re-opened since). */
export function activeDecision(done: Done, tenderId: string): Dg2Decision | null {
  const d = readDone<Dg2Decision>(done, `dg2:${tenderId}`);
  return d && (d.round ?? 1) === roundOf(done, tenderId) ? d : null;
}
