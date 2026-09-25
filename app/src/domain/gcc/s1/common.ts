import { gccData } from '@/data/gcc';
import type { Criterion, GccTender, KeyDate, KeyDateKind, TenantData } from '@/data/gcc/types';
import { CRITERIA } from '@/data/gcc/types';
import type { Ccy } from '@/data/gcc/fx';
import { TENANTS, type CountryCode, type ProfiledTenant } from '@/data/tenants';
import { addDays, dateText, isWorkingDay } from '@/domain/calendar';
import { money } from '@/domain/money';

/**
 * Lookups and wording shared by the Stage 1 and DG1 rules (plan 007a). Pure
 * functions of the seed; nothing here reads the demo state.
 */

export const dataOf = (tenant: string): TenantData => gccData(tenant);

export const tenderOf = (tenant: string, tenderId: string): GccTender | undefined =>
  dataOf(tenant).register.find((t) => t.id === tenderId);

export function profileOf(tenant: string): ProfiledTenant {
  const p = TENANTS.find((t) => t.key === tenant);
  if (!p) throw new Error(`No tenant profile for "${tenant}"`);
  return p;
}

/** The tenant's bid currency: the currency of its fit-model band. */
export const tenantCcy = (tenant: string): Ccy => dataOf(tenant).fit.band.min.ccy;

export const keyDate = (t: GccTender, kind: KeyDateKind): KeyDate | undefined => t.keyDates.find((k) => k.kind === kind);

/** Bid opening, else the submission deadline. */
export const openingOf = (t: GccTender) => keyDate(t, 'opening') ?? keyDate(t, 'submission');

// ---------------------------------------------------------------------------
// The authority's country: its calendar decides working days (spec §6.7).

const COUNTRY: Record<string, { cc?: CountryCode; tz: string; adjective: string; short: string }> = {
  'Saudi Arabia': { cc: 'SA', tz: 'AST', adjective: 'Saudi', short: 'KSA' },
  'United Arab Emirates': { cc: 'AE', tz: 'GST', adjective: 'UAE', short: 'the UAE' },
  Qatar: { cc: 'QA', tz: 'AST', adjective: 'Qatari', short: 'Qatar' },
  Oman: { cc: 'OM', tz: 'GST', adjective: 'Omani', short: 'Oman' },
  Kuwait: { cc: 'KW', tz: 'AST', adjective: 'Kuwaiti', short: 'Kuwait' },
  Jordan: { tz: 'UTC+3', adjective: 'Jordanian', short: 'Jordan' },
  Lebanon: { tz: 'EET', adjective: 'Lebanese', short: 'Lebanon' },
};

const BY_CODE: Record<string, string> = { SA: 'Saudi Arabia', AE: 'United Arab Emirates', QA: 'Qatar', OM: 'Oman', KW: 'Kuwait', JO: 'Jordan', LB: 'Lebanon' };

/** 'Saudi Arabia' → 'SA'. Undefined for a country with no working calendar in the demo. */
export const countryCodeOf = (country: string): CountryCode | undefined => COUNTRY[country]?.cc;

/** "Saudi" for 'SA' or 'Saudi Arabia'. */
export const countryAdjective = (codeOrName: string) => COUNTRY[BY_CODE[codeOrName] ?? codeOrName]?.adjective ?? codeOrName;

/** "KSA", "the UAE", "Qatar" for a code or a name. */
export const countryShort = (codeOrName: string) => COUNTRY[BY_CODE[codeOrName] ?? codeOrName]?.short ?? codeOrName;

/**
 * The calendar and time zone that count for a tender's dates: the authority's
 * country. A country without a demo calendar (Jordan, Lebanon) falls back to
 * the tenant's own calendar, and says so.
 */
export function authorityCalendar(t: GccTender, tenant: string): { cc: CountryCode; tz: string; fallback: boolean } {
  const c = COUNTRY[t.country];
  if (c?.cc) return { cc: c.cc, tz: c.tz, fallback: false };
  const p = profileOf(tenant);
  return { cc: p.countryCode, tz: c?.tz ?? p.tzLabel, fallback: true };
}

// ---------------------------------------------------------------------------
// Fit arithmetic

/** Σ weight × score ÷ 10, to one decimal. */
export function weightedOf(d: TenantData, scores: Record<Criterion, number>): number {
  const sum = CRITERIA.reduce((s, c) => s + d.fit.weights[c] * scores[c], 0) / 10;
  return Math.round(sum * 10) / 10;
}

// ---------------------------------------------------------------------------
// Working days

/** The date `n` working days after (or, for negative `n`, before) `iso`. */
export function addWorkingDays(iso: string, n: number, cc: CountryCode): string {
  const step = n < 0 ? -1 : 1;
  let d = iso;
  for (let left = Math.abs(n); left > 0;) {
    d = addDays(d, step);
    if (isWorkingDay(d, cc)) left--;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Wording (UK English, ui-direction §7)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parts = (iso: string) => iso.slice(0, 10).split('-').map(Number) as [number, number, number];

/** "Sun 10 May". */
export const shortDate = (iso: string) => dateText(iso.slice(0, 10)).replace(/ \d{4}$/, '');

/** "10 May". */
export const dayMonth = (iso: string) => { const [, m, d] = parts(iso); return `${d} ${MONTHS[m - 1]}`; };

/** "05 Mar": Finance's as-of stamp. */
export const dayMonth2 = (iso: string) => { const [, m, d] = parts(iso); return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`; };

/** "8 Aug 2026". */
export const dayMonthYear = (iso: string) => { const [y, m, d] = parts(iso); return `${d} ${MONTHS[m - 1]} ${y}`; };

/** "April". */
export const monthName = (iso: string) => MONTHS_LONG[parts(iso)[1] - 1];

/** "10:00" from a local date-time, or undefined for a date. */
export const timeOf = (iso: string) => (iso.length > 10 ? iso.slice(11, 16) : undefined);

/** "Mon 9 Mar 10:00", or "Mon 9 Mar" for a date. */
export const shortWhen = (iso: string) => { const t = timeOf(iso); return t ? `${shortDate(iso)} ${t}` : shortDate(iso); };

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** "two", or the digits above ten. */
export const countWord = (n: number) => WORDS[n] ?? String(n);

export const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "a, b and c". */
export function listText(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** "150,000". */
export const numberText = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/** "1 line", "4 lines". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A threshold without trailing zeros: "SAR 1.2 bn", "SAR 400 M". Measured amounts keep `money()`'s decimals. */
export function roundMoney(amount: number, ccy: Ccy): string {
  const abs = Math.abs(amount);
  if (abs >= 1e9) {
    const hundredths = Math.round(abs / 1e7);
    return money(amount, ccy, { dp: hundredths % 100 === 0 ? 0 : hundredths % 10 === 0 ? 1 : 2 });
  }
  if (abs >= 1e6) return money(amount, ccy, { dp: Math.round(abs / 1e5) % 10 === 0 ? 0 : 1 });
  return money(amount, ccy);
}
