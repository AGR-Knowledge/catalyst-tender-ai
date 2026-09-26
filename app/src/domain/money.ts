import { FX_AS_OF, FX_LABEL, FX_PER_USD, type Ccy } from '@/data/gcc/fx';

/**
 * Money for every tenant (ui-direction §7.1). Amounts are in major units
 * (SAR, not SAR millions). Tenant currency first; a converted amount always
 * keeps its original, with the rate and its date.
 */

const MINUS = '−';

/** INR keeps the legacy crore look, so moving the Indian screens here later is drop-in. */
const INR_SIGN = '₹';
const CRORE = 1e7;

export interface MoneyOpts {
  /** Millions and billions (the default). */
  compact?: boolean;
  /** Decimals, overriding the currency's default. */
  dp?: number;
  /** Every digit, e.g. SAR 12,064,000. */
  full?: boolean;
  /**
   * Always in millions, below 1 M and above 1,000 M too ("KWD 0.79 M"), so the
   * amounts in one sentence share a format. Ignored for INR and with `full`.
   */
  millions?: boolean;
}

const group = (n: number, dp: number, locale = 'en-GB') =>
  n.toLocaleString(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

function inr(abs: number, opts: MoneyOpts): string {
  if (opts.full || opts.compact === false) return `${INR_SIGN} ${group(abs, opts.dp ?? 0, 'en-IN')}`;
  const crore = abs / CRORE;
  const dp = opts.dp ?? (Number.isInteger(round(crore, 1)) ? 0 : 1);
  return `${INR_SIGN} ${group(crore, dp, 'en-IN')} Cr`;
}

/** `SAR 482.6 M`, `AED 1.24 bn`, `KWD 39.3 M`, or `SAR 12,064,000` with `full`. One decimal for millions in every currency. */
export function money(amount: number, ccy: Ccy, opts: MoneyOpts = {}): string {
  const sign = amount < 0 ? MINUS : '';
  const abs = Math.abs(amount);
  if (ccy === 'INR') return sign + inr(abs, opts);
  if (opts.full || opts.compact === false || (abs < 1e6 && !opts.millions)) return `${sign}${ccy} ${group(abs, opts.dp ?? 0)}`;

  const mDp = opts.dp ?? 1;
  const m = round(abs / 1e6, mDp);
  if (m < 1000 || opts.millions) return `${sign}${ccy} ${group(m, mDp)} M`;
  const bDp = opts.dp ?? 2;
  return `${sign}${ccy} ${group(round(abs / 1e9, bDp), bDp)} bn`;
}

/** Through USD at the demo bid rates. */
export function convert(amount: number, from: Ccy, to: Ccy): number {
  if (from === to) return amount;
  return (amount / FX_PER_USD[from]) * FX_PER_USD[to];
}

/** Units of `to` per one `from`. */
export const rateOf = (from: Ccy, to: Ccy) => FX_PER_USD[to] / FX_PER_USD[from];

export interface MoneyPair {
  /** The amount in the target (tenant) currency. */
  text: string;
  /** The amount as stated, present only when it was converted. */
  original?: string;
  rate: number;
  asOf: string;
}

/** "AED 470.1 M · SAR 480.0 M": never convert silently. */
export function moneyPair(amount: number, from: Ccy, to: Ccy, opts: MoneyOpts = {}): MoneyPair {
  return {
    text: money(convert(amount, from, to), to, opts),
    original: from === to ? undefined : money(amount, from, opts),
    rate: rateOf(from, to),
    asOf: FX_AS_OF,
  };
}

/** For the hover on a converted amount: "SAR 1 = AED 0.9793 · Demo bid rate, 1 Mar 2026". */
export function rateNote(from: Ccy, to: Ccy): string {
  const r = rateOf(from, to);
  const dp = r >= 100 ? 2 : 4;
  return `${from} 1 = ${to} ${group(r, dp)} · ${FX_LABEL}`;
}
