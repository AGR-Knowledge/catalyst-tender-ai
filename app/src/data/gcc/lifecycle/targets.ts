import type { PeriodKey } from '@/domain/gcc/period';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import type { StageN } from './types';
import type { GccTenantKey } from '../index';

/**
 * Flow targets per tenant (dashboards.md §12.3 and §12.5; plan 039). They
 * steer the history generator, the intake volumes and the 40-lifecycle dev
 * check, and nothing else: every dashboard number is derived from the
 * lifecycles, never read from here.
 */

/** Days of history (plan 039): 730, from Sat 9 Mar 2024. `domain/gcc/period.ts` keeps the same number. */
export const HISTORY_DAYS = 730;
export const HISTORY_FROM = addDays(DEMO_TODAY, -(HISTORY_DAYS - 1));

/**
 * The first minute of each window (dashboards.md §2): the last N calendar days
 * including today, ending at the demo clock; All starts on the first day of
 * the history. `domain/gcc/period.ts` is the copy the screens use; the data
 * layer cannot import it (it carries React hooks), so the generator keeps this
 * one and dev-checks/40-lifecycle asserts they agree.
 */
export const WINDOW_FROM: Record<PeriodKey, string> = {
  today: `${DEMO_TODAY}T00:00`,
  '7d': `${addDays(DEMO_TODAY, -6)}T00:00`,
  '30d': `${addDays(DEMO_TODAY, -29)}T00:00`,
  '90d': `${addDays(DEMO_TODAY, -89)}T00:00`,
  '12m': `${addDays(DEMO_TODAY, -364)}T00:00`,
  all: `${HISTORY_FROM}T00:00`,
};

/** Innermost first. */
export const WINDOW_KEYS: PeriodKey[] = ['today', '7d', '30d', '90d', '12m', 'all'];

export interface DecisionCounts<K extends string> { total: number; by: Record<K, number>; onTime?: number }

export interface FlowTarget {
  /** New notices captured. */
  captured?: number;
  /** Re-issued notices of a tender seen before ("previous"; the intake's `linked`). */
  previous?: number;
  /** New notices that passed the AI initial screening. */
  passed?: number;
  dg1: DecisionCounts<'pursue' | 'discard' | 'hold'>;
  dg2: DecisionCounts<'bid' | 'no-bid'>;
  dg3: DecisionCounts<'approved' | 'rejected'>;
  submitted: number;
  /** PF-2: mean value of the bids submitted in the window, in millions of tenant currency. Null: "No bids submitted". Unset: not steered. */
  avgTicketM?: number | null;
  results: { won: number; lost: number };
}

const dg1 = (pursue: number, discard: number, hold: number, onTime?: number): FlowTarget['dg1'] =>
  ({ total: pursue + discard + hold, by: { pursue, discard, hold }, ...(onTime === undefined ? {} : { onTime }) });
const dg2 = (bid: number, noBid: number, onTime?: number): FlowTarget['dg2'] =>
  ({ total: bid + noBid, by: { bid, 'no-bid': noBid }, ...(onTime === undefined ? {} : { onTime }) });
const dg3 = (approved: number, rejected: number, onTime?: number): FlowTarget['dg3'] =>
  ({ total: approved + rejected, by: { approved, rejected }, ...(onTime === undefined ? {} : { onTime }) });

/**
 * Najd, every window (plan 039, the user's table of 2026-10-06). Read as one
 * batch narrowing: DG2 decides what DG1 approved, DG3 what DG2 approved, and
 * every DG3 approval is submitted. Today and 7 days are no longer offered;
 * they stay as the hand-authored subsets the generator must not touch.
 */
const NAJD: Record<PeriodKey, FlowTarget> = {
  today: { captured: 11, previous: 1, passed: 2, dg1: dg1(0, 0, 0, 0), dg2: dg2(0, 0, 0), dg3: dg3(0, 0, 0), submitted: 0, avgTicketM: null, results: { won: 0, lost: 0 } },
  '7d': { captured: 44, previous: 4, passed: 5, dg1: dg1(1, 2, 0, 3), dg2: dg2(1, 0, 1), dg3: dg3(1, 0, 1), submitted: 1, avgTicketM: 290, results: { won: 0, lost: 1 } },
  '30d': { captured: 176, previous: 18, passed: 18, dg1: dg1(8, 3, 1, 11), dg2: dg2(7, 1, 7), dg3: dg3(7, 0, 7), submitted: 7, results: { won: 3, lost: 3 } },
  '90d': { captured: 520, previous: 52, passed: 62, dg1: dg1(30, 12, 2, 41), dg2: dg2(28, 2, 28), dg3: dg3(27, 1, 26), submitted: 27, results: { won: 14, lost: 11 } },
  '12m': { captured: 1890, previous: 190, passed: 250, dg1: dg1(104, 72, 9, 174), dg2: dg2(96, 8, 98), dg3: dg3(94, 2, 90), submitted: 94, results: { won: 42, lost: 44 } },
  all: { captured: 3700, previous: 370, passed: 490, dg1: dg1(206, 146, 14, 344), dg2: dg2(190, 16, 194), dg3: dg3(186, 4, 178), submitted: 186, results: { won: 82, lost: 88 } },
};

/** B–E's 12-month DG1 totals before plan 039 (§12.5): their size against Najd's. */
const DG1_12M: Record<Exclude<GccTenantKey, 'najd'>, number> = { corniche: 120, dafna: 95, batinah: 130, qurain: 160 };

/**
 * Najd's 12-month or All column scaled by `f` (plan 039 §2.6): whole numbers,
 * the same batch narrowing (DG2 decides what DG1 approved, and so on), every
 * column no larger than the one before it. On-time counts are not steered.
 */
function scaled(t: FlowTarget, f: number): FlowTarget {
  const r = (n: number) => Math.round(n * f);
  const total = r(t.dg1.total);
  const pursue = r(t.dg1.by.pursue);
  const discard = Math.min(r(t.dg1.by.discard), total - pursue);
  const bid = Math.min(r(t.dg2.by.bid), pursue);
  const approved = Math.min(r(t.dg3.by.approved), bid);
  const won = Math.min(r(t.results.won), approved);
  return {
    captured: r(t.captured!), previous: r(t.previous!), passed: Math.max(r(t.passed!), total),
    dg1: dg1(pursue, discard, total - pursue - discard), dg2: dg2(bid, pursue - bid), dg3: dg3(approved, bid - approved),
    submitted: approved, results: { won, lost: Math.min(r(t.results.lost), approved - won) },
  };
}

const scaledOf = (k: Exclude<GccTenantKey, 'najd'>) => {
  const f = DG1_12M[k] / NAJD['12m'].dg1.total;
  return { '12m': scaled(NAJD['12m'], f), all: scaled(NAJD.all, f) };
};

export const FLOW_TARGETS: Record<GccTenantKey, Partial<Record<PeriodKey, FlowTarget>>> = {
  najd: NAJD,
  corniche: scaledOf('corniche'),
  dafna: scaledOf('dafna'),
  batinah: scaledOf('batinah'),
  qurain: scaledOf('qurain'),
};

/** PF-2's range for the steered windows of every tenant, in millions: the mean submitted value stays where it was (plan 039 §2.1.2). */
export const AVG_TICKET_RANGE_M: Partial<Record<GccTenantKey, [number, number]>> = { najd: [210, 290] };

/**
 * Live tenders by stage now (§12.2, §12.5, with the Najd Stage 1 count decided on 2026-09-25: every register row).
 * Review of plan 039 (2026-10-06): what the last 30 days approved stays live, so Najd's pursued pipeline grew
 * from 15 to 27 (T-2026-106 and 11 generated tenders) and Qurain's by 2.
 */
export const LIVE_TARGETS: Record<GccTenantKey, Record<StageN, number>> = {
  najd: { 1: 12, 2: 7, 3: 2, 4: 2, 5: 3, 6: 4, 7: 1, 8: 8, 9: 2 },
  corniche: { 1: 3, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1 },
  dafna: { 1: 3, 2: 1, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1 },
  // Three in Stage 1, one of them T-2026-042, the Arabic roads tender with scanned pages (plan 023).
  batinah: { 1: 3, 2: 1, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1 },
  qurain: { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1, 6: 2, 7: 1, 8: 4, 9: 1 },
};

/** Najd: PF-1 = Stages 2–8 now (§12.2). */
export const NAJD_PIPELINE = { tenders: 27, valueM: 6832.6 };

/**
 * Najd splits over the results and decisions (§5.1, §12.3; plan 039 scaled
 * them to the new totals). Results, sectors and calibration are over the
 * 12-month results (42 won, 44 lost); DG1 over the 90-day decisions (12
 * discards). Calibration keeps Najd's one over-confident band (< 30%): with
 * twice the win rate, the bids per band could not keep their old shares too.
 */
export const RESULT_SPLITS = {
  wonBySector: { 'Water and wastewater': 33, Roads: 9 } as Record<string, number>,
  lossReasons: { price: 24, technical: 9, 'local-content': 5, pq: 2, other: 4 },
  /** Predicted win at DG2, in bands: bids and wins. */
  calibration: [
    { band: '> 70', min: 70.0001, max: 100, bids: 16, won: 13 },
    { band: '50–70', min: 50, max: 70, bids: 28, won: 19 },
    { band: '30–50', min: 30, max: 49.9999, bids: 22, won: 10 },
    { band: '< 30', min: 0, max: 29.9999, bids: 20, won: 0 },
  ],
  dg2: { againstMajority: 4, reopened: 2 },
  dg1: {
    overrides: 3,
    overridesClientRelationship: 2,
    discardReasons: { 'out-of-scope': 5, 'below-value': 2, 'pq-fail': 2, 'insufficient-time': 2, capacity: 1 } as Record<string, number>,
  },
};
