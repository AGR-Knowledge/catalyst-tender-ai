/**
 * Demo bid rates, per US dollar. One set for every tenant, so the same amount
 * converts the same way on every screen. The four Gulf pegs are published
 * rates; KWD (a managed basket) and EUR are demo assumptions to verify before
 * a client meeting (gcc-demo-data §10.3).
 */

export type Ccy = 'SAR' | 'AED' | 'QAR' | 'OMR' | 'KWD' | 'BHD' | 'USD' | 'EUR' | 'INR';

export const FX_PER_USD: Record<Ccy, number> = {
  SAR: 3.75,
  AED: 3.6725,
  QAR: 3.64,
  OMR: 0.3845,
  KWD: 0.307,
  BHD: 0.376,
  USD: 1,
  EUR: 0.92,
  INR: 83.0,
};

export const FX_AS_OF = '2026-03-01';
export const FX_LABEL = 'Demo bid rate, 1 Mar 2026';

export const isCcy = (s: string): s is Ccy => Object.prototype.hasOwnProperty.call(FX_PER_USD, s);
