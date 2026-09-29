import type { GccTenantKey } from '../index';
import type { Money } from '../types';

/**
 * The company's bid record before the lifecycles begin (plan 032): four
 * rolling years to 8 March, each the company's annual record, with no tender
 * rows. The last 12 months are never seeded here: they are derived from the
 * lifecycles (`domain/gcc/company/record.ts`), so they agree with the
 * dashboards tender by tender.
 *
 * Money is in the company's currency. Every bid of an earlier year has its
 * outcome: won + lost + withdrawn = submitted. Withdrawn counts bids submitted
 * that were neither won nor lost (withdrawn by us, or cancelled by the
 * employer). Each year's value won sits within 40–160% of the turnover of the
 * financial year it mostly covers, and its sectors are the company's own
 * (dev check 66). Najd, Corniche, Batinah and Qurain grow steadily; Dafna has
 * one poor year (2023–24) before it recovers.
 */

export interface BidYearSeed {
  /** First day, `YYYY-03-09`. */
  from: string;
  /** Last day, `YYYY-03-08` of the next year. */
  to: string;
  submitted: number;
  won: number;
  lost: number;
  withdrawn: number;
  valueSubmitted: Money;
  valueWon: Money;
  /** By the company's sector names: bids submitted and bids won. */
  bySector: Record<string, { submitted: number; won: number }>;
}

const M = 1e6;
const year = (from: number, s: Omit<BidYearSeed, 'from' | 'to'>): BidYearSeed => ({ from: `${from}-03-09`, to: `${from + 1}-03-08`, ...s });

export const BID_RECORD_YEARS: Record<GccTenantKey, BidYearSeed[]> = {
  najd: [
    year(2021, {
      submitted: 30, won: 6, lost: 22, withdrawn: 2,
      valueSubmitted: { amount: 5_400 * M, ccy: 'SAR' }, valueWon: { amount: 980 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 20, won: 5 }, Roads: { submitted: 10, won: 1 } },
    }),
    year(2022, {
      submitted: 33, won: 7, lost: 24, withdrawn: 2,
      valueSubmitted: { amount: 6_100 * M, ccy: 'SAR' }, valueWon: { amount: 1_120 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 21, won: 5 }, Roads: { submitted: 10, won: 2 }, 'Utility networks': { submitted: 2, won: 0 } },
    }),
    year(2023, {
      submitted: 35, won: 8, lost: 25, withdrawn: 2,
      valueSubmitted: { amount: 6_900 * M, ccy: 'SAR' }, valueWon: { amount: 1_380 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 22, won: 6 }, Roads: { submitted: 11, won: 2 }, 'Utility networks': { submitted: 2, won: 0 } },
    }),
    year(2024, {
      submitted: 36, won: 8, lost: 26, withdrawn: 2,
      valueSubmitted: { amount: 7_400 * M, ccy: 'SAR' }, valueWon: { amount: 1_460 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 22, won: 6 }, Roads: { submitted: 12, won: 2 }, 'Utility networks': { submitted: 2, won: 0 } },
    }),
  ],
  corniche: [
    year(2021, {
      submitted: 20, won: 4, lost: 15, withdrawn: 1,
      valueSubmitted: { amount: 4_200 * M, ccy: 'AED' }, valueWon: { amount: 720 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 12, won: 3 }, 'District cooling': { submitted: 5, won: 1 }, 'Fit-out': { submitted: 3, won: 0 } },
    }),
    year(2022, {
      submitted: 22, won: 5, lost: 15, withdrawn: 2,
      valueSubmitted: { amount: 4_800 * M, ccy: 'AED' }, valueWon: { amount: 950 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 13, won: 4 }, 'District cooling': { submitted: 6, won: 1 }, 'Fit-out': { submitted: 3, won: 0 } },
    }),
    year(2023, {
      submitted: 23, won: 5, lost: 16, withdrawn: 2,
      valueSubmitted: { amount: 5_600 * M, ccy: 'AED' }, valueWon: { amount: 1_100 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 13, won: 4 }, 'District cooling': { submitted: 6, won: 1 }, 'Fit-out': { submitted: 4, won: 0 } },
    }),
    year(2024, {
      submitted: 24, won: 6, lost: 16, withdrawn: 2,
      valueSubmitted: { amount: 6_500 * M, ccy: 'AED' }, valueWon: { amount: 1_450 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 13, won: 5 }, 'District cooling': { submitted: 7, won: 1 }, 'Fit-out': { submitted: 4, won: 0 } },
    }),
  ],
  dafna: [
    year(2021, {
      submitted: 17, won: 4, lost: 12, withdrawn: 1,
      valueSubmitted: { amount: 3_000 * M, ccy: 'QAR' }, valueWon: { amount: 620 * M, ccy: 'QAR' },
      bySector: { 'Civil works': { submitted: 8, won: 2 }, 'Utility networks': { submitted: 6, won: 1 }, 'Pump stations': { submitted: 3, won: 1 } },
    }),
    year(2022, {
      submitted: 18, won: 5, lost: 12, withdrawn: 1,
      valueSubmitted: { amount: 3_200 * M, ccy: 'QAR' }, valueWon: { amount: 780 * M, ccy: 'QAR' },
      bySector: { 'Civil works': { submitted: 8, won: 2 }, 'Utility networks': { submitted: 6, won: 2 }, 'Pump stations': { submitted: 4, won: 1 } },
    }),
    // The poor year: two wins from nineteen bids.
    year(2023, {
      submitted: 19, won: 2, lost: 15, withdrawn: 2,
      valueSubmitted: { amount: 3_400 * M, ccy: 'QAR' }, valueWon: { amount: 360 * M, ccy: 'QAR' },
      bySector: { 'Civil works': { submitted: 9, won: 1 }, 'Utility networks': { submitted: 6, won: 1 }, 'Pump stations': { submitted: 4, won: 0 } },
    }),
    year(2024, {
      submitted: 19, won: 4, lost: 14, withdrawn: 1,
      valueSubmitted: { amount: 3_600 * M, ccy: 'QAR' }, valueWon: { amount: 720 * M, ccy: 'QAR' },
      bySector: { 'Civil works': { submitted: 8, won: 2 }, 'Utility networks': { submitted: 7, won: 1 }, 'Pump stations': { submitted: 4, won: 1 } },
    }),
  ],
  batinah: [
    year(2021, {
      submitted: 22, won: 6, lost: 15, withdrawn: 1,
      valueSubmitted: { amount: 200 * M, ccy: 'OMR' }, valueWon: { amount: 48 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 15, won: 4 }, Bridges: { submitted: 4, won: 1 }, Earthworks: { submitted: 3, won: 1 } },
    }),
    year(2022, {
      submitted: 24, won: 7, lost: 16, withdrawn: 1,
      valueSubmitted: { amount: 230 * M, ccy: 'OMR' }, valueWon: { amount: 54 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 16, won: 5 }, Bridges: { submitted: 5, won: 1 }, Earthworks: { submitted: 3, won: 1 } },
    }),
    year(2023, {
      submitted: 25, won: 7, lost: 17, withdrawn: 1,
      valueSubmitted: { amount: 260 * M, ccy: 'OMR' }, valueWon: { amount: 58 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 16, won: 4 }, Bridges: { submitted: 5, won: 2 }, Earthworks: { submitted: 4, won: 1 } },
    }),
    year(2024, {
      submitted: 26, won: 8, lost: 17, withdrawn: 1,
      valueSubmitted: { amount: 300 * M, ccy: 'OMR' }, valueWon: { amount: 62 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 17, won: 5 }, Bridges: { submitted: 5, won: 2 }, Earthworks: { submitted: 4, won: 1 } },
    }),
  ],
  qurain: [
    year(2021, {
      submitted: 28, won: 7, lost: 19, withdrawn: 2,
      valueSubmitted: { amount: 600 * M, ccy: 'KWD' }, valueWon: { amount: 110 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 14, won: 4 }, Infrastructure: { submitted: 7, won: 2 }, 'Oil and gas facilities': { submitted: 7, won: 1 } },
    }),
    year(2022, {
      submitted: 30, won: 8, lost: 20, withdrawn: 2,
      valueSubmitted: { amount: 650 * M, ccy: 'KWD' }, valueWon: { amount: 128 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 15, won: 5 }, Infrastructure: { submitted: 7, won: 2 }, 'Oil and gas facilities': { submitted: 8, won: 1 } },
    }),
    year(2023, {
      submitted: 31, won: 7, lost: 22, withdrawn: 2,
      valueSubmitted: { amount: 700 * M, ccy: 'KWD' }, valueWon: { amount: 120 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 15, won: 4 }, Infrastructure: { submitted: 8, won: 2 }, 'Oil and gas facilities': { submitted: 8, won: 1 } },
    }),
    year(2024, {
      submitted: 32, won: 8, lost: 22, withdrawn: 2,
      valueSubmitted: { amount: 760 * M, ccy: 'KWD' }, valueWon: { amount: 140 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 16, won: 5 }, Infrastructure: { submitted: 8, won: 2 }, 'Oil and gas facilities': { submitted: 8, won: 1 } },
    }),
  ],
};
