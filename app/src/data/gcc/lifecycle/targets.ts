import type { PeriodKey } from '@/domain/gcc/period';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import type { StageN } from './types';
import type { GccTenantKey } from '../index';

/**
 * Flow targets per tenant (dashboards.md §12.3 and §12.5). They steer the
 * history generator and the 40-lifecycle dev check, and nothing else: every
 * dashboard number is derived from the lifecycles, never read from here.
 */

/**
 * The first minute of each window (dashboards.md §2): the last N calendar days
 * including today, ending at the demo clock. `domain/gcc/period.ts` is the copy
 * the screens use; the data layer cannot import it (it carries React hooks), so
 * the generator keeps this one and dev-checks/40-lifecycle asserts they agree.
 */
export const WINDOW_FROM: Record<PeriodKey, string> = {
  today: `${DEMO_TODAY}T00:00`,
  '7d': `${addDays(DEMO_TODAY, -6)}T00:00`,
  '30d': `${addDays(DEMO_TODAY, -29)}T00:00`,
  '90d': `${addDays(DEMO_TODAY, -89)}T00:00`,
  '12m': `${addDays(DEMO_TODAY, -364)}T00:00`,
};

export const WINDOW_KEYS: PeriodKey[] = ['today', '7d', '30d', '90d', '12m'];

export interface DecisionCounts<K extends string> { total: number; by: Record<K, number>; onTime?: number }

export interface FlowTarget {
  captured?: number;
  dg1: DecisionCounts<'pursue' | 'discard' | 'hold'>;
  dg2: DecisionCounts<'bid' | 'no-bid'>;
  dg3: DecisionCounts<'approved' | 'rejected'>;
  submitted: number;
  /** PF-2: mean value of the bids submitted in the window, in millions of tenant currency. Null: "No bids submitted". */
  avgTicketM?: number | null;
  results: { won: number; lost: number };
}

const dg1 = (pursue: number, discard: number, hold: number, onTime?: number): FlowTarget['dg1'] =>
  ({ total: pursue + discard + hold, by: { pursue, discard, hold }, ...(onTime === undefined ? {} : { onTime }) });
const dg2 = (bid: number, noBid: number, onTime?: number): FlowTarget['dg2'] =>
  ({ total: bid + noBid, by: { bid, 'no-bid': noBid }, ...(onTime === undefined ? {} : { onTime }) });
const dg3 = (approved: number, rejected: number, onTime?: number): FlowTarget['dg3'] =>
  ({ total: approved + rejected, by: { approved, rejected }, ...(onTime === undefined ? {} : { onTime }) });

/** Najd, every window (§12.3). */
const NAJD: Record<PeriodKey, FlowTarget> = {
  today: { captured: 11, dg1: dg1(0, 0, 0, 0), dg2: dg2(0, 0, 0), dg3: dg3(0, 0, 0), submitted: 0, avgTicketM: null, results: { won: 0, lost: 0 } },
  '7d': { captured: 44, dg1: dg1(1, 2, 0, 3), dg2: dg2(1, 0, 1), dg3: dg3(1, 0, 1), submitted: 1, avgTicketM: 290, results: { won: 0, lost: 1 } },
  '30d': { captured: 176, dg1: dg1(4, 7, 1, 11), dg2: dg2(4, 1, 5), dg3: dg3(4, 0, 4), submitted: 3, avgTicketM: 262, results: { won: 1, lost: 2 } },
  '90d': { captured: 520, dg1: dg1(15, 29, 2, 44), dg2: dg2(11, 3, 14), dg3: dg3(9, 1, 10), submitted: 9, avgTicketM: 241, results: { won: 2, lost: 7 } },
  '12m': { captured: 2080, dg1: dg1(60, 116, 9, 178), dg2: dg2(40, 14, 51), dg3: dg3(38, 1, 38), submitted: 38, avgTicketM: 214, results: { won: 9, lost: 24 } },
};

/** B–E: the 12-month totals only (§12.5). */
const TWELVE: Record<Exclude<GccTenantKey, 'najd'>, FlowTarget> = {
  corniche: { dg1: dg1(38, 78, 4), dg2: dg2(26, 8), dg3: dg3(25, 1), submitted: 25, results: { won: 6, lost: 16 } },
  dafna: { dg1: dg1(30, 61, 4), dg2: dg2(21, 7), dg3: dg3(20, 1), submitted: 20, results: { won: 5, lost: 13 } },
  batinah: { dg1: dg1(40, 85, 5), dg2: dg2(28, 8), dg3: dg3(27, 1), submitted: 27, results: { won: 8, lost: 17 } },
  qurain: { dg1: dg1(52, 100, 8), dg2: dg2(35, 10), dg3: dg3(34, 1), submitted: 34, results: { won: 8, lost: 22 } },
};

export const FLOW_TARGETS: Record<GccTenantKey, Partial<Record<PeriodKey, FlowTarget>>> = {
  najd: NAJD,
  corniche: { '12m': TWELVE.corniche },
  dafna: { '12m': TWELVE.dafna },
  batinah: { '12m': TWELVE.batinah },
  qurain: { '12m': TWELVE.qurain },
};

/** Live tenders by stage now (§12.2, §12.5, with the Najd Stage 1 count decided on 2026-09-25: every register row). */
export const LIVE_TARGETS: Record<GccTenantKey, Record<StageN, number>> = {
  najd: { 1: 12, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 1, 8: 4, 9: 2 },
  corniche: { 1: 3, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1 },
  dafna: { 1: 3, 2: 1, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1 },
  // §12.5 says 4: the fourth is the scanned Arabic roads tender, which plan 012 adds.
  batinah: { 1: 3, 2: 1, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1 },
  qurain: { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 3, 9: 1 },
};

/** Najd: PF-1 = Stages 2–8 now (§12.2). */
export const NAJD_PIPELINE = { tenders: 15, valueM: 3094 };

/**
 * Najd splits over the results and decisions (§5.1, §12.3). Results, sectors
 * and calibration are over the 12-month results; DG1 over the 90-day decisions.
 */
export const RESULT_SPLITS = {
  wonBySector: { 'Water and wastewater': 7, Roads: 2 } as Record<string, number>,
  lossReasons: { price: 13, technical: 5, 'local-content': 3, pq: 1, other: 2 },
  /** Predicted win at DG2, in bands: bids and wins. */
  calibration: [
    { band: '> 70', min: 70.0001, max: 100, bids: 3, won: 2 },
    { band: '50–70', min: 50, max: 70, bids: 7, won: 4 },
    { band: '30–50', min: 30, max: 49.9999, bids: 10, won: 3 },
    { band: '< 30', min: 0, max: 29.9999, bids: 13, won: 0 },
  ],
  dg2: { againstMajority: 2, reopened: 2 },
  dg1: {
    overrides: 4,
    overridesClientRelationship: 3,
    discardReasons: { 'out-of-scope': 11, 'below-value': 6, 'pq-fail': 5, 'insufficient-time': 4, capacity: 3 } as Record<string, number>,
  },
};
