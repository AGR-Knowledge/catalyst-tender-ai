import type { Tone } from '@/data/types';
import type { FinancialYear } from '@/data/gcc/s2/profiles';

/**
 * A supplier's financial health (plan 031 step 2.1): one word from one rule,
 * read from its latest financial year. The rule is stated in the ⓘ, so the
 * word is never a black box.
 */

export type HealthWord = 'Strong' | 'Adequate' | 'Watch';

export const HEALTH_RULE = { strongRatio: 1.5, strongMargin: 5, watchRatio: 1.1, watchMargin: 0 } as const;

/** Green means strong, orange means watch; adequate is neutral ink. */
export const HEALTH_TONE: Record<HealthWord, Tone> = { Strong: 'green', Adequate: 'ink', Watch: 'orange' };

export const HEALTH_RULE_TEXT =
  `Strong when the current ratio is ${HEALTH_RULE.strongRatio} or more and the net margin ${HEALTH_RULE.strongMargin}% or more. `
  + `Watch when the current ratio is under ${HEALTH_RULE.watchRatio} or the net margin is below ${HEALTH_RULE.watchMargin}%. Adequate otherwise.`;

export function healthOf(fy: Pick<FinancialYear, 'currentRatio' | 'netMarginPct'>): HealthWord {
  if (fy.currentRatio >= HEALTH_RULE.strongRatio && fy.netMarginPct >= HEALTH_RULE.strongMargin) return 'Strong';
  if (fy.currentRatio < HEALTH_RULE.watchRatio || fy.netMarginPct < HEALTH_RULE.watchMargin) return 'Watch';
  return 'Adequate';
}
