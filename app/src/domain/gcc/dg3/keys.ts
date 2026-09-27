import { readDone, type Done } from '@/domain/gcc/s3/done';

/**
 * DG3 done-key values (plan 018 step 2.1) and the readers every DG3 module
 * shares. A decision belongs to a round: 1 at first, one more after each
 * re-issue of the pack and after each re-open. Keys are never deleted, so a
 * re-open doesn't clear `dg3:{TID}`: it moves the round on, and the old
 * decision stops being in force (DG2's round rule).
 *
 * - `dg3:{TID}`: the latest decision;
 * - `dg3-back:{TID}:{round}`: sent back to Compliance in that round;
 * - `dg3-reissue:{TID}:{round}`: Compliance re-issued the pack after that round's send-back;
 * - `dg3-reopen:{TID}`: the latest re-open, holding every re-open so far;
 * - `request:{TID}:{comp id}:dg3-back`: the send-back in the Compliance Lead's My requests.
 */

export type Dg3Choice = 'approved' | 'rejected';
export type Dg3LineState = 'pass' | 'fail' | 'info';

/** One evidence line as the approver saw it. `maskedText` is what a viewer without `see.margin` reads instead. */
export interface Dg3SnapshotLine { key: string; label: string; state: Dg3LineState; text: string; maskedText?: string }

/** `dg3:{TID}`. */
export interface Dg3Decision {
  tenderId: string;
  decision: Dg3Choice;
  at: string;
  byId: string;
  reasonCodes: string[];
  note?: string;
  round: number;
  evidenceSnapshot: Dg3SnapshotLine[];
}

/** `dg3-back:{TID}:{round}`. */
export interface Dg3SendBackValue { note: string; at: string; byId: string; toId: string }

export type Dg3Fix = 'bond-validity';

/** `dg3-reissue:{TID}:{round}`. */
export interface Dg3ReissueValue { at: string; byId: string; fixed?: Dg3Fix }

/** One re-open: the decision it took out of force, and why. */
export interface Dg3ReopenEntry { decision: Dg3Decision; reason: string; at: string; byId: string; round: number }

/** `dg3-reopen:{TID}`: the latest re-open, with every re-open so far in `history`, oldest first. */
export interface Dg3ReopenValue { reason: string; at: string; byId: string; round: number; history: Dg3ReopenEntry[] }

export const dg3Key = (tenderId: string) => `dg3:${tenderId}`;
export const backKey = (tenderId: string, round: number) => `dg3-back:${tenderId}:${round}`;
export const reissueKey = (tenderId: string, round: number) => `dg3-reissue:${tenderId}:${round}`;
export const reopenKey = (tenderId: string) => `dg3-reopen:${tenderId}`;
/** The `request:` topic of a send-back (`domain/gcc/requestKeys.ts`). */
export const DG3_BACK_TOPIC = 'dg3-back';

/** Every `done` key prefix DG3 owns for one tender, for the applier's quick test. */
export const dg3Prefixes = (tenderId: string) => [dg3Key(tenderId), `dg3-back:${tenderId}:`, `dg3-reissue:${tenderId}:`, reopenKey(tenderId)];

/** Rounds are counted up to this, so a corrupt `done` can't loop. */
const MAX_ROUNDS = 50;

export const reopenOf = (done: Done, tenderId: string) => readDone<Dg3ReopenValue>(done, reopenKey(tenderId));

/** The round in force: 1, plus one for each re-issue and each re-open before it. */
export function roundOf(done: Done, tenderId: string): number {
  const reopened = new Set((reopenOf(done, tenderId)?.history ?? []).map((e) => e.round));
  let r = 1;
  while (r < MAX_ROUNDS && (done[reissueKey(tenderId, r)] || reopened.has(r))) r++;
  return r;
}

/** The DG3 decision in force, or null (none yet, or re-opened since). */
export function activeDecision(done: Done, tenderId: string): Dg3Decision | null {
  const d = readDone<Dg3Decision>(done, dg3Key(tenderId));
  return d && d.round === roundOf(done, tenderId) ? d : null;
}

/** When a round opened: the pack's issue for round 1, else the re-issue or re-open that ended the round before. */
export function openedAtOf(done: Done, tenderId: string, round: number, issuedAt: string): string {
  if (round <= 1) return issuedAt;
  const reissue = readDone<Dg3ReissueValue>(done, reissueKey(tenderId, round - 1));
  if (reissue) return reissue.at;
  return reopenOf(done, tenderId)?.history.find((e) => e.round === round - 1)?.at ?? issuedAt;
}

/** Re-issues so far, oldest first, each with the round it ended. */
export function reissuesOf(done: Done, tenderId: string): (Dg3ReissueValue & { round: number })[] {
  const out: (Dg3ReissueValue & { round: number })[] = [];
  const now = roundOf(done, tenderId);
  for (let r = 1; r < now; r++) {
    const v = readDone<Dg3ReissueValue>(done, reissueKey(tenderId, r));
    if (v) out.push({ ...v, round: r });
  }
  return out;
}

/** Send-backs so far, oldest first, each with its round. */
export function sendBacksOf(done: Done, tenderId: string): (Dg3SendBackValue & { round: number })[] {
  const out: (Dg3SendBackValue & { round: number })[] = [];
  const now = roundOf(done, tenderId);
  for (let r = 1; r <= now; r++) {
    const v = readDone<Dg3SendBackValue>(done, backKey(tenderId, r));
    if (v) out.push({ ...v, round: r });
  }
  return out;
}
