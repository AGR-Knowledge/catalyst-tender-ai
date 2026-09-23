/**
 * Before-and-after effort, measured from timesheets for the twelve months
 * before go-live (July 2025) and from activity logs since. Totals, savings and
 * hours returned are derived in domain/live.ts, never typed here.
 */

export const GO_LIVE = 'July 2025';

/** Average hours of bid-office time per bid, by stage. */
export const EFFORT = [
  { stage: 1, before: 30, now: 4, change: 'Portals read overnight, fields extracted for checking' },
  { stage: 2, before: 34, now: 10, change: 'RFQs issued from the BOQ, quotes normalised' },
  { stage: 3, before: 14, now: 5, change: 'One evidence pack for the committee' },
  { stage: 4, before: 22, now: 9, change: 'Baseline drafted from the BOQ, planner checks it' },
  { stage: 5, before: 38, now: 17, change: 'Rates applied from quotes and delivery norms' },
  { stage: 6, before: 46, now: 15, change: 'Sections drafted from past bids with sources' },
  { stage: 7, before: 21, now: 8, change: 'Matrix checked against attached evidence' },
  { stage: 8, before: 12, now: 4, change: 'Forms filled and the package assembled' },
];

/** Cumulative net benefit after platform cost, ₹ Cr, month by month since go-live. */
export const BENEFIT = [
  { m: 'Jul', v: -1.4 }, { m: 'Aug', v: -2.1 }, { m: 'Sep', v: -1.9 }, { m: 'Oct', v: -0.8 },
  { m: 'Nov', v: 0.6 }, { m: 'Dec', v: 2.3 }, { m: 'Jan', v: 4.4 }, { m: 'Feb', v: 6.9 },
];

/** Decided bids since go-live, grouped by the win probability given at DG2. */
export const CALIBRATION = [
  { band: 'Above 70%', bids: 3, won: 2, predicted: 75 },
  { band: '50 to 70%', bids: 4, won: 2, predicted: 58 },
  { band: '30 to 50%', bids: 5, won: 2, predicted: 36 },
  { band: 'Below 30%', bids: 3, won: 1, predicted: 22 },
];
