import type { EvaluationSeed, JobSeed, QuarterKey, QuarterSeed } from '@/data/gcc/s2/profiles';

/**
 * A supplier's last four quarters with the company and its latest evaluation
 * (plan 031 step 2.2). Awards per quarter are the jobs awarded in it, so the
 * quarters and "Projects with us" always agree. The reply rate is not here:
 * it is the master's own `response` (plan 031, B4).
 */

export interface QuarterVM {
  key: QuarterKey;
  from: string;
  to: string;
  quotes: number;
  awards: number;
  deliveries: number;
  onTime: number;
  /** On-time deliveries over deliveries; null with no delivery. */
  onTimePct: number | null;
  ncrs: number;
}

export interface QuarterTotals { quotes: number; awards: number; deliveries: number; onTime: number; onTimePct: number | null; ncrs: number }

const pctOf = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : null);

export function quartersOf(quarters: QuarterSeed[], jobs: JobSeed[]): QuarterVM[] {
  return quarters.map((q) => ({
    key: q.key, from: q.from, to: q.to, quotes: q.quotes, deliveries: q.deliveries, onTime: q.onTime, ncrs: q.ncrs,
    awards: jobs.filter((j) => j.awardedAt >= q.from && j.awardedAt <= q.to).length,
    onTimePct: pctOf(q.onTime, q.deliveries),
  }));
}

/** The four quarters together: on time is weighted by deliveries, not an average of the quarters. */
export function totalsOf(quarters: QuarterVM[]): QuarterTotals {
  const sum = (k: 'quotes' | 'awards' | 'deliveries' | 'onTime' | 'ncrs') => quarters.reduce((n, q) => n + q[k], 0);
  return { quotes: sum('quotes'), awards: sum('awards'), deliveries: sum('deliveries'), onTime: sum('onTime'), onTimePct: pctOf(sum('onTime'), sum('deliveries')), ncrs: sum('ncrs') };
}

/** The quarter with the lowest on-time share, among those with deliveries. */
export function worstQuarter(quarters: QuarterVM[]): QuarterVM | null {
  return quarters.filter((q) => q.onTimePct !== null).sort((a, b) => a.onTimePct! - b.onTimePct! || a.from.localeCompare(b.from))[0] ?? null;
}

/** The latest quarter with an NCR. */
export const latestNcrQuarter = (quarters: QuarterVM[]): QuarterVM | null => [...quarters].reverse().find((q) => q.ncrs > 0) ?? null;

export type ScoreKey = 'quality' | 'schedule' | 'hse' | 'commercial' | 'communication';
export const SCORE_LABEL: Record<ScoreKey, string> = { quality: 'Quality', schedule: 'Schedule', hse: 'HSE', commercial: 'Commercial', communication: 'Communication' };

export interface EvaluationVM {
  at: string;
  byRole: string;
  scores: { key: ScoreKey; label: string; score: number }[];
  /** The mean of the five scores, to one decimal. */
  overall: number;
}

export function evaluationOf(e: EvaluationSeed): EvaluationVM {
  const keys: ScoreKey[] = ['quality', 'schedule', 'hse', 'commercial', 'communication'];
  const scores = keys.map((key) => ({ key, label: SCORE_LABEL[key], score: e[key] }));
  const overall = Math.round((scores.reduce((n, s) => n + s.score, 0) / scores.length) * 10) / 10;
  return { at: e.at, byRole: e.byRole, scores, overall };
}
