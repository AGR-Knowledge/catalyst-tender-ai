import type { GccTender, Money } from '@/data/gcc/types';
import { s1Data } from '@/data/gcc/s1';
import { personById } from '@/data/people';
import { addDays, calendarDaysBetween } from '@/domain/calendar';
import { isCcy, type Ccy } from '@/data/gcc/fx';
import { convert, money } from '@/domain/money';
import type { Done } from './done';
import { dataOf, dayMonth2, keyDate, openingOf, shortDate, tenantCcy, tenderOf } from './common';
import { resolvedValue, validationsOf } from './validation';

/**
 * The bid bond (initial guarantee) against the bank guarantee facility (spec
 * §6.7, §7 item 6, plan 007a step 4.1). The hero's rate is in conflict: until
 * the Coordinator resolves VAL-118-1, the higher of the two rates is used.
 * A conflict can also set a rate against a fixed amount (T-2026-042's
 * VAL-042-1): until it is resolved, the higher of the two bonds is used.
 */

/** Banks need five working days to issue a guarantee (spec §6.7). */
export const BANK_LEAD_DAYS = 5 as const;
/** When a tender states no validity, a guarantee is assumed to run 90 days from opening. */
const DEFAULT_BOND_DAYS = 90;

const pctOf = (s: string | null | undefined) => {
  const m = s?.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
};

/**
 * "OMR 300,000 (fixed amount)" → 300000 in OMR: a number of four or more digits, thousands separators
 * stripped, with the currency code before it when there is one. Read only where no percentage is stated.
 */
const amountOf = (s: string | null | undefined): { amount: number; ccy?: Ccy } | null => {
  const m = s?.replace(/(\d),(?=\d{3}(?!\d))/g, '$1').match(/(?:\b([A-Z]{3})\s*)?(\d{4,}(?:\.\d+)?)/);
  if (!m) return null;
  return { amount: Number(m[2]), ...(m[1] && isCcy(m[1]) ? { ccy: m[1] } : {}) };
};

/** "150 days" → 150. */
const daysOf = (s: string | null | undefined) => {
  const m = s?.match(/(\d+)\s*days?/i);
  return m ? Number(m[1]) : null;
};

export interface FacilityHeadroom {
  headroom: Money;
  asOf: string;
  confirmedById: string;
  confirmedByName?: string;
  /** "facility headroom SAR 96.0 M as of 05 Mar, confirmed by Finance". */
  text: string;
}

const CONFIRMER: Record<string, string> = { fin: 'Finance', cfo: 'the CFO' };

/** Headroom (DEC-6) = limit − utilised − Σ committed, as Finance last confirmed it. */
export function facilityHeadroom(tenant: string): FacilityHeadroom {
  const f = dataOf(tenant).facility;
  const amount = f.limit.amount - f.utilised.amount - f.committed.reduce((s, c) => s + convert(c.amount.amount, c.amount.ccy, f.limit.ccy), 0);
  const who = personById(f.confirmedById);
  const by = who ? CONFIRMER[who.role] ?? who.title : 'Finance';
  return {
    headroom: { amount, ccy: f.limit.ccy }, asOf: f.asOf, confirmedById: f.confirmedById, confirmedByName: who?.name,
    text: `facility headroom ${money(amount, f.limit.ccy)} as of ${dayMonth2(f.asOf)}, confirmed by ${by}`,
  };
}

export interface BidBond {
  tenderId: string;
  /** Percent of the bid value, or null when no rate is stated. For a fixed bond, the amount as a share of the estimate. */
  rate: number | null;
  /** The tender states an amount, not a rate (plan 022): `amount` stands whatever the price. */
  fixed?: boolean;
  rateBasis: 'resolved' | 'higher-until-resolved' | 'stated' | 'not-stated';
  /** "2% (p. 35)", or "2%: the higher of 1% (p. 12) and 2% (p. 35), until the conflict is resolved". */
  rateText: string;
  /** In the tenant's currency. */
  amount: Money;
  /** The same amount in the tender's currency, when that differs. */
  original?: Money;
  /** The date the bond must stay valid to: the tender's stated validity, else 90 days from opening. */
  validTo: string;
  /** Calendar days from opening to `validTo` (120, or 90 when unstated). Null without an opening date. */
  validityDays: number | null;
  validityBasis: 'stated' | 'unstated';
  /** "Valid 120 days from opening (to Mon 24 Aug)", or "…: not stated, 90 days assumed". */
  validityText: string;
  /** Where the tender states the guarantee terms. */
  source?: string;
  bankLeadDays: typeof BANK_LEAD_DAYS;
  headroom: Money;
  headroomAsOf: string;
  confirmedById: string;
  /** Headroom left once the bid bond is issued. */
  afterBid: Money;
  /** Final guarantee if the bid wins (5% on the hero, §57). */
  performanceIfWon?: Money;
  /** Advance payment guarantee if won and the advance is taken (up to 10% on the hero, p. 36). */
  advanceIfWon?: Money;
  /** The advance the tender offers, in % of contract value (10 on the hero). */
  advancePct?: number;
  /**
   * After the bid bond, the headroom would not cover the guarantees needed on
   * award (performance plus advance payment): Finance must confirm the facility.
   */
  facilityTight: boolean;
  /** "SAR 9,600,000 at 2%". */
  text: string;
}

/**
 * One validity rule (plan 020 C9): what the tender states (the guarantee's own
 * end date, else a number of days from opening, else the end of bid validity);
 * 90 days from opening only when it states none.
 */
function validityOf(t: GccTender, statedDays?: number, conflict?: { days: number; text: string }): Pick<BidBond, 'validTo' | 'validityDays' | 'validityBasis' | 'validityText'> {
  const opening = openingOf(t);
  // Validity held in the intake queue (plan 022): the longer of two stated values until it is resolved.
  if (conflict && opening) {
    const validTo = addDays(opening.date, conflict.days);
    return { validTo, validityDays: conflict.days, validityBasis: 'stated', validityText: `Valid ${conflict.days} days from opening (to ${shortDate(validTo)})${conflict.text}` };
  }
  const statedTo = keyDate(t, 'bond-validity-end')?.date
    ?? (statedDays && opening ? addDays(opening.date, statedDays) : undefined)
    ?? keyDate(t, 'validity-end')?.date;
  const validTo = statedTo ?? (opening ? addDays(opening.date, DEFAULT_BOND_DAYS) : '');
  const validityDays = opening && validTo ? calendarDaysBetween(opening.date, validTo) : null;
  const span = validityDays !== null ? `Valid ${validityDays} days from opening (to ${shortDate(validTo)})` : validTo ? `Valid to ${shortDate(validTo)}` : 'Validity not stated';
  return {
    validTo, validityDays, validityBasis: statedTo ? 'stated' : 'unstated',
    validityText: statedTo || !validTo ? span : `${span}: not stated, ${DEFAULT_BOND_DAYS} days assumed`,
  };
}

export function bidBondFor(tenant: string, tenderId: string, done: Done): BidBond | null {
  const t = tenderOf(tenant, tenderId);
  if (!t) return null;
  const ccy = tenantCcy(tenant);
  const terms = s1Data(tenant).bonds.find((b) => b.tenderId === tenderId);

  const value = t.value.amount;
  const full = (n: number) => money(n, t.value.ccy, { full: true });
  /** A fixed amount as a share of the estimate, in %. */
  const shareOf = (n: number) => (value ? Math.round((n / value) * 10_000) / 100 : null);
  /** An amount stated in the tender, in the tender's currency. */
  const inTenderCcy = (a: { amount: number; ccy?: Ccy }) => convert(a.amount, a.ccy ?? t.value.ccy, t.value.ccy);
  // A fixed amount (plan 022), in the tender's currency. A rate conflict can replace it, or resolve to it.
  let amt: number | null = terms?.bidAmount ?? null;
  let rate: number | null = amt !== null ? shareOf(amt) : terms?.bidPct ?? null;
  let rateBasis: BidBond['rateBasis'] = amt !== null || rate !== null ? 'stated' : 'not-stated';
  let rateText = amt !== null
    ? `${full(amt)}, a fixed amount${terms?.bidPage ? ` (p. ${terms.bidPage})` : ''}`
    : rate === null ? 'No bid bond rate stated' : `${rate}%${terms?.bidPage ? ` (p. ${terms.bidPage})` : ''}`;
  if (terms?.bidRateValidationId) {
    const q = validationsOf(tenant, tenderId, done).find((x) => x.item.id === terms.bidRateValidationId);
    const resolved = resolvedValue(tenant, tenderId, terms.bidRateValidationId, done);
    // Each side reads as a percentage, else as an amount (plan 023: 1% on one page, a fixed amount on another).
    const sideOf = (s: string | undefined, p: number | undefined) => {
      const v = pctOf(s);
      const a = v === null ? amountOf(s) : null;
      return { s, v, amt: a ? inTenderCcy(a) : null, p };
    };
    if (resolved !== null) {
      const r = sideOf(resolved, undefined);
      amt = r.amt;
      rate = r.v ?? (r.amt !== null ? shareOf(r.amt) : null);
      rateBasis = r.v === null && r.amt === null ? 'not-stated' : 'resolved';
      rateText = r.v !== null ? `${r.v}%, as resolved in the intake queue`
        : r.amt !== null ? `${full(r.amt)}, a fixed amount, as resolved in the intake queue`
          : 'Marked not stated in the intake queue';
    } else if (q) {
      const a = sideOf(q.item.value, q.item.page);
      const b = sideOf(q.item.alt?.value, q.item.alt?.page);
      rateBasis = 'higher-until-resolved';
      if (a.amt === null && b.amt === null) {
        // Two rates (the hero's VAL-118-1): the higher rate.
        const hi = (b.v ?? -1) > (a.v ?? -1) ? b : a;
        amt = null;
        rate = hi.v;
        rateText = q.item.alt
          ? `${hi.v}%: the higher of ${[a, b].sort((x, y) => (x.v ?? 0) - (y.v ?? 0)).map((x) => `${x.v}% (p. ${x.p})`).join(' and ')}, until the conflict is resolved`
          : `${hi.v}% (p. ${hi.p}), until the field is validated`;
      } else {
        // A rate against an amount: the higher bond of (the estimate × the rate) and the amount.
        const bondOf = (x: typeof a) => (x.v !== null ? (value * x.v) / 100 : x.amt ?? -1);
        const sayOf = (x: typeof a) => `${x.v !== null ? `${x.v}% of the estimate (${full(bondOf(x))}, ` : `${x.amt !== null ? full(x.amt) : x.s} (`}p. ${x.p})`;
        const sides = q.item.alt ? [a, b] : [a];
        const hi = sides.reduce((m, x) => (bondOf(x) > bondOf(m) ? x : m));
        amt = hi.v !== null ? null : hi.amt;
        rate = hi.v ?? (hi.amt !== null ? shareOf(hi.amt) : null);
        const head = hi.v !== null ? `${hi.v}%` : `${full(hi.amt ?? 0)}, a fixed amount`;
        rateText = sides.length > 1
          ? `${head}: the higher of ${[...sides].sort((x, y) => bondOf(x) - bondOf(y)).map(sayOf).join(' and ')}, until the conflict is resolved`
          : `${head} (p. ${hi.p}), until the field is validated`;
      }
    }
  }
  const fixed = amt !== null;

  const inTender = amt !== null ? amt : rate === null ? 0 : (value * rate) / 100;
  const amount = convert(inTender, t.value.ccy, ccy);
  const validity = validityOf(t, terms?.bidValidityDays, terms?.bidValidityValidationId ? validityConflict(tenant, tenderId, terms.bidValidityValidationId, done) : undefined);
  const f = facilityHeadroom(tenant);
  const afterBid = f.headroom.amount - amount;
  const perf = terms ? convert((value * terms.performancePct) / 100, t.value.ccy, ccy) : undefined;
  const adv = terms?.advancePct ? convert((value * terms.advancePct) / 100, t.value.ccy, ccy) : undefined;

  return {
    tenderId, rate, rateBasis, rateText, ...(fixed ? { fixed: true } : {}),
    amount: { amount, ccy },
    ...(t.value.ccy !== ccy ? { original: { amount: inTender, ccy: t.value.ccy } } : {}),
    ...validity, ...(terms?.source ? { source: terms.source } : {}), bankLeadDays: BANK_LEAD_DAYS,
    headroom: f.headroom, headroomAsOf: f.asOf, confirmedById: f.confirmedById,
    afterBid: { amount: afterBid, ccy },
    ...(perf !== undefined ? { performanceIfWon: { amount: perf, ccy } } : {}),
    ...(adv !== undefined ? { advanceIfWon: { amount: adv, ccy }, advancePct: terms!.advancePct } : {}),
    facilityTight: perf !== undefined && afterBid < perf + (adv ?? 0),
    text: fixed
      ? `${money(inTender, t.value.ccy, { full: true })}, a fixed amount${t.value.ccy !== ccy ? ` (${money(amount, ccy)})` : ''}`
      : rate === null
        ? 'No bid bond stated'
        : `${money(inTender, t.value.ccy, { full: true })} at ${rate}%${t.value.ccy !== ccy ? ` (${money(amount, ccy)})` : ''}`,
  };
}

/**
 * The bond validity a validation item holds (plan 022): the resolved value once the Coordinator resolves
 * it, else the longer of the two stated values, "until the conflict is resolved".
 */
function validityConflict(tenant: string, tenderId: string, validationId: string, done: Done): { days: number; text: string } | undefined {
  const resolved = resolvedValue(tenant, tenderId, validationId, done);
  if (resolved !== null) {
    const days = daysOf(resolved);
    return days === null ? undefined : { days, text: ', as resolved in the intake queue' };
  }
  const q = validationsOf(tenant, tenderId, done).find((x) => x.item.id === validationId);
  if (!q) return undefined;
  const a = { d: daysOf(q.item.value), p: q.item.page };
  const b = { d: daysOf(q.item.alt?.value), p: q.item.alt?.page };
  const hi = (b.d ?? -1) > (a.d ?? -1) ? b : a;
  if (hi.d === null) return undefined;
  const both = q.item.alt ? [a, b].sort((x, y) => (x.d ?? 0) - (y.d ?? 0)).map((x) => `${x.d} days (p. ${x.p})`).join(' and ') : null;
  return { days: hi.d, text: both ? `: the longer of ${both}, until the conflict is resolved` : ', until the field is validated' };
}
