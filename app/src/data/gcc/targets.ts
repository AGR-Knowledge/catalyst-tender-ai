import type { GateKey } from '@/domain/gcc/viewmodels';

/**
 * The demo defaults behind every tone on the GCC dashboards, as data
 * (dashboards.md §2, §5, §9 and §11). KPI definitions read these; they never
 * type a threshold of their own. Administration › Targets & SLAs (plan 010)
 * will edit them. Only thresholds dashboards.md names live here, never a KPI value.
 */

/** Time limits for each gate decision, from the moment the gate opens (§9, PF-4). */
export const GATE_SLA_HOURS: Record<GateKey, number> = { DG1: 24, DG2: 24, DG3: 48 };

/** "Within 5 working days": submissions, gaps, bonds and baselines this close are urgent (§5, §11). */
export const NEAR_WD = 5;

/** PF-6: red at or under this many working days when something is still missing. */
export const CRITICAL_WD = 2;

/** SLA share left: above this is comfortably on track (ui-direction §6.2 SlaClock green). */
export const SLA_OK_SHARE = 0.5;
/** SLA share left: at or under this is at risk (§5 health, SlaClock orange). */
export const SLA_AT_RISK_SHARE = 0.25;

/** A rate with fewer results than this shows its counts, a neutral tone and "Small sample" (§2). */
export const MIN_N = 5;

/** DG2 quorum: positions recorded out of the five voting seats (§9). */
export const DG2_QUORUM = 3;
export const DG2_SEATS = 5;

/** Rate bands, in percent: at or above `green` is green, at or above `orange` is orange, otherwise red. */
export interface RateBand { green: number; orange: number }

export const RATE_BANDS: Record<string, RateBand> = {
  'PF-4': { green: 100, orange: 90 },   // decisions on time
  'PLN-6': { green: 100, orange: 80 },  // M2 on time
  'PRC-2': { green: 95, orange: 85 },   // cost lines sourced
  'CMP-6': { green: 100, orange: 90 },  // DG3 on time
  'SUB-3': { green: 100, orange: 90 },  // packages ready
  'RES-3': { green: 100, orange: 80 },  // lessons captured
};

/** PRC-4 estimated share, in percent: at or under `green` is green, at or under `orange` is orange. */
export const ESTIMATED_SHARE_BAND = { green: 5, orange: 10 };

/** Turnaround targets, p90 in hours (PLN-5 re-plans, PRC-5 re-prices, SRC-1 RFQs after DG1). */
export const TURNAROUND_HOURS = { replan: 4, reprice: 2, rfqsAfterDg1: 24 };

/** Look-ahead windows, in days: SUB-1 and SUB-6 deadlines, CAP-1 bid-team load. */
export const AHEAD_DAYS = { submissions: 14, bonds: 14, teamLoad: 28 };

/** RES-2: a handover not held this many days after award is orange. */
export const HANDOVER_DAYS = 10;

/** SUB-6 (KSA): the initial guarantee must stay valid this many days from opening. */
export const BOND_VALIDITY_DAYS_KSA = 90;

/** Tone of a rate against its band. */
export function bandTone(pct: number, band: RateBand): 'green' | 'orange' | 'red' {
  return pct >= band.green ? 'green' : pct >= band.orange ? 'orange' : 'red';
}
