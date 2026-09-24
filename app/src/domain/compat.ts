import { COMPAT, CRITERIA, PURSUE_AT, REVIEW_AT } from '@/data/compat';
import type { ExtractedTender } from '@/data/extracted/types';
import type { Tone } from '@/data/types';

export type Verdict = 'pursue' | 'review' | 'decline';

export interface Compat {
  score: number;
  verdict: Verdict;
  label: string;
  tone: Tone;
  rows: { key: string; label: string; weight: number; score: number; points: number; reason: string; page?: number }[];
  strengths: string[];
  concerns: string[];
  sharpen: string[];
}

/** The weighted score and recommendation for an extracted tender. Null for a document outside the demo set. */
export function compatFor(d: ExtractedTender): Compat | null {
  const rec = COMPAT[d.key];
  if (!rec) return null;
  const rows = CRITERIA.map((c) => {
    const s = rec.scores[c.key];
    return { ...c, score: s.score, points: (s.score * c.weight) / 100, reason: s.reason, page: s.page };
  });
  const score = Math.round(rows.reduce((a, r) => a + r.points, 0));
  const verdict: Verdict = score >= PURSUE_AT ? 'pursue' : score >= REVIEW_AT ? 'review' : 'decline';
  const ranked = [...rows].sort((a, b) => b.score - a.score);
  return {
    score, verdict, rows,
    label: verdict === 'pursue' ? 'Pursue' : verdict === 'review' ? 'Pursue with conditions' : 'Do not pursue',
    tone: verdict === 'pursue' ? 'green' : verdict === 'review' ? 'orange' : 'red',
    strengths: ranked.filter((r) => r.score >= 70).slice(0, 3).map((r) => r.label),
    concerns: ranked.filter((r) => r.score < 60).reverse().slice(0, 3).map((r) => r.label),
    sharpen: rec.sharpen,
  };
}
