import type { GccTender, Money } from '@/data/gcc/types';
import { s1Data } from '@/data/gcc/s1';
import { personById } from '@/data/people';
import { addDays, calendarDaysBetween } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import type { Done } from './done';
import { dataOf, dayMonth2, keyDate, openingOf, shortDate, tenantCcy, tenderOf } from './common';
import { resolvedValue, validationsOf } from './validation';

/**
 * The bid bond (initial guarantee) against the bank guarantee facility (spec
 * §6.7, §7 item 6, plan 007a step 4.1). The hero's rate is in conflict: until
 * the Coordinator resolves VAL-118-1, the higher of the two rates is used.
 */

/** Banks need five working days to issue a guarantee (spec §6.7). */
export const BANK_LEAD_DAYS = 5 as const;
/** When a tender states no validity, a guarantee is assumed to run 90 days from opening. */
const DEFAULT_BOND_DAYS = 90;

const pctOf = (s: string | null | undefined) => {
  const m = s?.match(/(\d+(?:\.\d+)?)\s*%/);
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
  /** Percent of the bid value, or null when no rate is stated. */
  rate: number | null;
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
function validityOf(t: GccTender, statedDays?: number): Pick<BidBond, 'validTo' | 'validityDays' | 'validityBasis' | 'validityText'> {
  const opening = openingOf(t);
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

  let rate: number | null = terms?.bidPct ?? null;
  let rateBasis: BidBond['rateBasis'] = rate === null ? 'not-stated' : 'stated';
  let rateText = rate === null ? 'No bid bond rate stated' : `${rate}%${terms?.bidPage ? ` (p. ${terms.bidPage})` : ''}`;
  if (terms?.bidRateValidationId) {
    const q = validationsOf(tenant, tenderId, done).find((x) => x.item.id === terms.bidRateValidationId);
    const resolved = resolvedValue(tenant, tenderId, terms.bidRateValidationId, done);
    if (resolved !== null) {
      rate = pctOf(resolved);
      rateBasis = rate === null ? 'not-stated' : 'resolved';
      rateText = rate === null ? 'Marked not stated in the intake queue' : `${rate}%, as resolved in the intake queue`;
    } else if (q) {
      const a = { v: pctOf(q.item.value), p: q.item.page };
      const b = { v: pctOf(q.item.alt?.value), p: q.item.alt?.page };
      const hi = (b.v ?? -1) > (a.v ?? -1) ? b : a;
      rate = hi.v;
      rateBasis = 'higher-until-resolved';
      rateText = q.item.alt
        ? `${hi.v}%: the higher of ${[a, b].sort((x, y) => (x.v ?? 0) - (y.v ?? 0)).map((x) => `${x.v}% (p. ${x.p})`).join(' and ')}, until the conflict is resolved`
        : `${hi.v}% (p. ${hi.p}), until the field is validated`;
    }
  }

  const value = t.value.amount;
  const inTender = rate === null ? 0 : (value * rate) / 100;
  const amount = convert(inTender, t.value.ccy, ccy);
  const validity = validityOf(t, terms?.bidValidityDays);
  const f = facilityHeadroom(tenant);
  const afterBid = f.headroom.amount - amount;
  const perf = terms ? convert((value * terms.performancePct) / 100, t.value.ccy, ccy) : undefined;
  const adv = terms?.advancePct ? convert((value * terms.advancePct) / 100, t.value.ccy, ccy) : undefined;

  return {
    tenderId, rate, rateBasis, rateText,
    amount: { amount, ccy },
    ...(t.value.ccy !== ccy ? { original: { amount: inTender, ccy: t.value.ccy } } : {}),
    ...validity, ...(terms?.source ? { source: terms.source } : {}), bankLeadDays: BANK_LEAD_DAYS,
    headroom: f.headroom, headroomAsOf: f.asOf, confirmedById: f.confirmedById,
    afterBid: { amount: afterBid, ccy },
    ...(perf !== undefined ? { performanceIfWon: { amount: perf, ccy } } : {}),
    ...(adv !== undefined ? { advanceIfWon: { amount: adv, ccy }, advancePct: terms!.advancePct } : {}),
    facilityTight: perf !== undefined && afterBid < perf + (adv ?? 0),
    text: rate === null
      ? 'No bid bond stated'
      : `${money(inTender, t.value.ccy, { full: true })} at ${rate}%${t.value.ccy !== ccy ? ` (${money(amount, ccy)})` : ''}`,
  };
}
