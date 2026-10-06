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
 * one poor year (2023–24) before it recovers. The review of plan 039
 * (2026-10-06) sized every company to its 730 days of lifecycles: the
 * 2024–25 year repeats what those lifecycles hold for the same dates, and the
 * three years before it lead up to it gently.
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
      submitted: 84, won: 35, lost: 44, withdrawn: 5,
      valueSubmitted: { amount: 19_200 * M, ccy: 'SAR' }, valueWon: { amount: 8_400 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 40, won: 18 }, 'Utility networks': { submitted: 22, won: 9 }, Roads: { submitted: 22, won: 8 } },
    }),
    year(2022, {
      submitted: 87, won: 37, lost: 45, withdrawn: 5,
      valueSubmitted: { amount: 20_500 * M, ccy: 'SAR' }, valueWon: { amount: 9_000 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 41, won: 19 }, 'Utility networks': { submitted: 23, won: 10 }, Roads: { submitted: 23, won: 8 } },
    }),
    year(2023, {
      submitted: 90, won: 38, lost: 46, withdrawn: 6,
      valueSubmitted: { amount: 22_100 * M, ccy: 'SAR' }, valueWon: { amount: 9_600 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 41, won: 19 }, 'Utility networks': { submitted: 25, won: 11 }, Roads: { submitted: 24, won: 8 } },
    }),
    // 9 Mar 2024 – 8 Mar 2025 is inside the lifecycles: these are the counts the All period gives for the same dates (dev check 66).
    year(2024, {
      submitted: 92, won: 40, lost: 44, withdrawn: 8,
      valueSubmitted: { amount: 24_456 * M, ccy: 'SAR' }, valueWon: { amount: 11_186 * M, ccy: 'SAR' },
      bySector: { 'Water and wastewater': { submitted: 40, won: 20 }, 'Utility networks': { submitted: 27, won: 12 }, Roads: { submitted: 25, won: 8 } },
    }),
  ],
  corniche: [
    year(2021, {
      submitted: 52, won: 21, lost: 27, withdrawn: 4,
      valueSubmitted: { amount: 11_000 * M, ccy: 'AED' }, valueWon: { amount: 4_300 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 27, won: 11 }, 'District cooling': { submitted: 15, won: 6 }, 'Fit-out': { submitted: 10, won: 4 } },
    }),
    year(2022, {
      submitted: 55, won: 23, lost: 28, withdrawn: 4,
      valueSubmitted: { amount: 12_300 * M, ccy: 'AED' }, valueWon: { amount: 4_700 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 28, won: 12 }, 'District cooling': { submitted: 16, won: 6 }, 'Fit-out': { submitted: 11, won: 5 } },
    }),
    year(2023, {
      submitted: 57, won: 24, lost: 28, withdrawn: 5,
      valueSubmitted: { amount: 13_600 * M, ccy: 'AED' }, valueWon: { amount: 5_200 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 29, won: 12 }, 'District cooling': { submitted: 16, won: 7 }, 'Fit-out': { submitted: 12, won: 5 } },
    }),
    // 9 Mar 2024 – 8 Mar 2025 is inside the lifecycles: these are the counts the All period gives for the same dates (dev check 66).
    year(2024, {
      submitted: 60, won: 26, lost: 28, withdrawn: 6,
      valueSubmitted: { amount: 15463.2 * M, ccy: 'AED' }, valueWon: { amount: 6617.5 * M, ccy: 'AED' },
      bySector: { 'Buildings MEP': { submitted: 30, won: 13 }, 'Fit-out': { submitted: 19, won: 7 }, 'District cooling': { submitted: 11, won: 6 } },
    }),
  ],
  dafna: [
    year(2021, {
      submitted: 42, won: 17, lost: 22, withdrawn: 3,
      valueSubmitted: { amount: 7_600 * M, ccy: 'QAR' }, valueWon: { amount: 3_000 * M, ccy: 'QAR' },
      bySector: { 'Utility networks': { submitted: 18, won: 7 }, 'Civil works': { submitted: 14, won: 6 }, 'Pump stations': { submitted: 10, won: 4 } },
    }),
    year(2022, {
      submitted: 44, won: 18, lost: 23, withdrawn: 3,
      valueSubmitted: { amount: 8_100 * M, ccy: 'QAR' }, valueWon: { amount: 3_300 * M, ccy: 'QAR' },
      bySector: { 'Utility networks': { submitted: 19, won: 8 }, 'Civil works': { submitted: 14, won: 6 }, 'Pump stations': { submitted: 11, won: 4 } },
    }),
    // The poor year: nine wins from forty-six bids.
    year(2023, {
      submitted: 46, won: 9, lost: 33, withdrawn: 4,
      valueSubmitted: { amount: 8_700 * M, ccy: 'QAR' }, valueWon: { amount: 1_600 * M, ccy: 'QAR' },
      bySector: { 'Utility networks': { submitted: 19, won: 4 }, 'Civil works': { submitted: 15, won: 3 }, 'Pump stations': { submitted: 12, won: 2 } },
    }),
    // 9 Mar 2024 – 8 Mar 2025 is inside the lifecycles: these are the counts the All period gives for the same dates (dev check 66).
    year(2024, {
      submitted: 48, won: 20, lost: 22, withdrawn: 6,
      valueSubmitted: { amount: 9301.9 * M, ccy: 'QAR' }, valueWon: { amount: 3762.7 * M, ccy: 'QAR' },
      bySector: { 'Utility networks': { submitted: 26, won: 10 }, 'Pump stations': { submitted: 16, won: 7 }, 'Civil works': { submitted: 6, won: 3 } },
    }),
  ],
  batinah: [
    year(2021, {
      submitted: 56, won: 23, lost: 30, withdrawn: 3,
      valueSubmitted: { amount: 850 * M, ccy: 'OMR' }, valueWon: { amount: 330 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 30, won: 12 }, Bridges: { submitted: 16, won: 6 }, Earthworks: { submitted: 10, won: 5 } },
    }),
    year(2022, {
      submitted: 59, won: 25, lost: 31, withdrawn: 3,
      valueSubmitted: { amount: 920 * M, ccy: 'OMR' }, valueWon: { amount: 360 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 31, won: 13 }, Bridges: { submitted: 17, won: 7 }, Earthworks: { submitted: 11, won: 5 } },
    }),
    year(2023, {
      submitted: 62, won: 26, lost: 32, withdrawn: 4,
      valueSubmitted: { amount: 1_010 * M, ccy: 'OMR' }, valueWon: { amount: 400 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 32, won: 13 }, Bridges: { submitted: 19, won: 7 }, Earthworks: { submitted: 11, won: 6 } },
    }),
    // 9 Mar 2024 – 8 Mar 2025 is inside the lifecycles: these are the counts the All period gives for the same dates (dev check 66).
    year(2024, {
      submitted: 65, won: 28, lost: 31, withdrawn: 6,
      valueSubmitted: { amount: 1119.7 * M, ccy: 'OMR' }, valueWon: { amount: 477.5 * M, ccy: 'OMR' },
      bySector: { Roads: { submitted: 30, won: 12 }, Bridges: { submitted: 24, won: 8 }, Earthworks: { submitted: 11, won: 8 } },
    }),
  ],
  qurain: [
    year(2021, {
      submitted: 70, won: 29, lost: 37, withdrawn: 4,
      valueSubmitted: { amount: 1_600 * M, ccy: 'KWD' }, valueWon: { amount: 640 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 34, won: 13 }, Infrastructure: { submitted: 18, won: 9 }, 'Oil and gas facilities': { submitted: 18, won: 7 } },
    }),
    year(2022, {
      submitted: 73, won: 31, lost: 38, withdrawn: 4,
      valueSubmitted: { amount: 1_750 * M, ccy: 'KWD' }, valueWon: { amount: 720 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 35, won: 14 }, Infrastructure: { submitted: 19, won: 9 }, 'Oil and gas facilities': { submitted: 19, won: 8 } },
    }),
    year(2023, {
      submitted: 76, won: 32, lost: 39, withdrawn: 5,
      valueSubmitted: { amount: 1_950 * M, ccy: 'KWD' }, valueWon: { amount: 800 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 36, won: 14 }, Infrastructure: { submitted: 20, won: 10 }, 'Oil and gas facilities': { submitted: 20, won: 8 } },
    }),
    // 9 Mar 2024 – 8 Mar 2025 is inside the lifecycles: these are the counts the All period gives for the same dates (dev check 66).
    year(2024, {
      submitted: 80, won: 35, lost: 38, withdrawn: 7,
      valueSubmitted: { amount: 2180.6 * M, ccy: 'KWD' }, valueWon: { amount: 1072.3 * M, ccy: 'KWD' },
      bySector: { Water: { submitted: 38, won: 13 }, 'Oil and gas facilities': { submitted: 23, won: 9 }, Infrastructure: { submitted: 19, won: 13 } },
    }),
  ],
};
