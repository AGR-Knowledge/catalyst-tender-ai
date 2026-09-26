import type { GccTenantKey } from './index';
import type { Money } from './types';

/**
 * Portfolio facts the dashboards need that the tenant seed (plan 004) and the
 * lifecycles (plan 017) don't carry (plan 015 Phase 1, dashboards.md §10.1–10.3).
 * Facts only: every KPI is derived from them in `domain/gcc/kpi/portfolio.kpi.ts`.
 * Administration › Targets & SLAs (plan 010) will edit the targets.
 */

/** The tenant's commercial targets: the hit rate behind PF-3's tone and the order intake behind OUT-3. */
export interface TenantTargets {
  /** Target win rate, in percent of won ÷ (won + lost). */
  hitRatePct: number;
  /** Contract value to win in a year, in the tenant currency. OUT-3 pro-rates it to the period. */
  orderIntakeAnnual: Money;
}

export const TENANT_TARGETS: Record<GccTenantKey, TenantTargets> = {
  najd: { hitRatePct: 25, orderIntakeAnnual: { amount: 2_000_000_000, ccy: 'SAR' } },
  corniche: { hitRatePct: 25, orderIntakeAnnual: { amount: 900_000_000, ccy: 'AED' } },
  dafna: { hitRatePct: 25, orderIntakeAnnual: { amount: 800_000_000, ccy: 'QAR' } },
  batinah: { hitRatePct: 30, orderIntakeAnnual: { amount: 80_000_000, ccy: 'OMR' } },
  qurain: { hitRatePct: 25, orderIntakeAnnual: { amount: 110_000_000, ccy: 'KWD' } },
};

/**
 * The delivery load of awarded work (DEC-5), as Operations last reported it,
 * and what each live Stage 3 bid would add if it were won. The safe level is
 * the tenant's fit model's `safeDeliveryPct`, never repeated here. The Stage 3
 * packs (plan 009a, `data/gcc/s3/packs.ts`) carry the same figures, and the
 * portfolio dev check asserts that the two agree.
 */
export interface DeliveryLoad {
  asOf: string;
  /** Awarded work as a share of delivery capacity, in percent. */
  currentPct: number;
  ifWon: { tenderId: string; addPct: number }[];
}

export const DELIVERY_LOAD: Record<GccTenantKey, DeliveryLoad> = {
  najd: { asOf: '2026-03-05', currentPct: 58, ifWon: [{ tenderId: 'T-2026-097', addPct: 9 }, { tenderId: 'T-2026-101', addPct: 4 }] },
  corniche: { asOf: '2026-03-05', currentPct: 55, ifWon: [{ tenderId: 'T-2026-029', addPct: 7 }] },
  dafna: { asOf: '2026-03-05', currentPct: 52, ifWon: [] },
  batinah: { asOf: '2026-03-05', currentPct: 57, ifWon: [] },
  qurain: { asOf: '2026-03-05', currentPct: 66, ifWon: [{ tenderId: 'T-2026-049', addPct: 12 }] },
};

/**
 * Tone bands for the portfolio KPIs whose thresholds come from the KPI
 * catalogue (§A) rather than dashboards.md, so `data/gcc/targets.ts` doesn't
 * carry them. Demo defaults until Administration › Targets & SLAs (plan 010).
 */
export const PORTFOLIO_BANDS = {
  /** CAP-1 bid-team load, percent: at or under `green` is green, at or under `orange` is orange, above is red. */
  teamLoadPct: { green: 85, orange: 100 },
  /** DEC-5 capacity if won, percent of the safe level: at or under `green` is green, at or under `orange` is orange. */
  capacityIfWonPct: { green: 100, orange: 115 },
  /** OUT-3 value won, percent of the pro-rated target: at or above `green` is green, at or above `orange` is orange. */
  valueWonPct: { green: 100, orange: 70 },
  /** PF-3 win rate: at or above the target is green; at or above this share of it is orange; below is red. */
  hitRateOrangeShare: 0.75,
  /** DEC-6 facility headroom: below this share of the facility limit is orange; below zero is red. */
  facilityWarningShare: 0.1,
} as const;
