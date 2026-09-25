import type { BidOutcome, Criterion, Dg1Record, Dg2History, FitInput } from './types';
import { CRITERIA } from './types';
import type { Ccy } from './fx';

/**
 * Record builders for the GCC seed. They only reshape literals written in the
 * tenant files (compact tuples → records); nothing here derives a value.
 */

/** Fit inputs in `CRITERIA` order: [score, reason, source] per criterion. */
export function fit(rows: [number, string, string][]): Record<Criterion, FitInput> {
  if (rows.length !== CRITERIA.length) throw new Error(`fit() needs ${CRITERIA.length} rows, got ${rows.length}`);
  return Object.fromEntries(CRITERIA.map((c, i) => [c, { score: rows[i][0], reason: rows[i][1], source: rows[i][2] }])) as Record<Criterion, FitInput>;
}

/** [tenderId, title, decision, at, byId, recommendation, withinSla, reasonCodes, note?] */
export type Dg1Tuple = [string, string, Dg1Record['decision'], string, string, Dg1Record['recommendation'], boolean, string[], string?];

export const dg1Records = (rows: Dg1Tuple[]): Dg1Record[] =>
  rows.map(([tenderId, title, decision, at, byId, recommendation, withinSla, reasonCodes, note]) => ({
    tenderId, title, decision, at, byId, recommendation, withinSla, reasonCodes, ...(note ? { note } : {}),
  }));

/** [tenderId, title, at, decision, withinSla, againstMajority, reopened?] */
export type Dg2Tuple = [string, string, string, Dg2History['decision'], boolean, boolean, string?];

export const dg2Records = (rows: Dg2Tuple[]): Dg2History[] =>
  rows.map(([tenderId, title, at, decision, withinSla, againstMajority, reopened]) => ({
    tenderId, title, at, decision, withinSla, againstMajority, ...(reopened ? { reopened } : {}),
  }));

/** [id, title, sector, clientType, value (major units), submitted, decided, result, lossReason | null, predictedWin] */
export type OutcomeTuple = [string, string, string, BidOutcome['clientType'], number, string, string, BidOutcome['result'], BidOutcome['lossReason'] | null, number];

export const outcomes = (ccy: Ccy, rows: OutcomeTuple[]): BidOutcome[] =>
  rows.map(([id, title, sector, clientType, amount, submitted, decided, result, lossReason, predictedWin]) => ({
    id, title, sector, clientType, value: { amount, ccy }, submitted, decided, result, ...(lossReason ? { lossReason } : {}), predictedWin,
  }));
