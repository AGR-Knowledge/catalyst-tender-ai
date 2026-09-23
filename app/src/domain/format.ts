import { TODAY_ISO } from '@/data/tenders';

const MINUS = '−';

const num = (n: number, dp: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

/** ₹ crore, e.g. ₹ 486 Cr, ₹ 58.8 Cr, ₹ 2,940 Cr. */
export function cr(n: number, dp?: number): string {
  const rounded = Math.round(Math.abs(n) * 10) / 10;
  const d = dp ?? (Number.isInteger(rounded) ? 0 : 1);
  return `${n < 0 ? MINUS : ''}₹ ${num(Math.abs(n), d)} Cr`;
}

/** Signed crore delta, e.g. +₹ 4.1 Cr / −₹ 0.8 Cr. */
export function crDelta(n: number): string {
  return `${n < 0 ? MINUS : '+'}₹ ${num(Math.abs(n), 1)} Cr`;
}

export function pct(n: number, dp = 0): string {
  return `${num(n, dp)}%`;
}

/** Signed points, e.g. +0.5 / −2.3. */
export function pts(n: number, dp = 1): string {
  if (Math.abs(n) < 0.05) return num(0, dp);
  return `${n < 0 ? MINUS : '+'}${num(Math.abs(n), dp)}`;
}

export function int(n: number): string {
  return n.toLocaleString('en-IN');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayMonth(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

export function longDate(iso: string): string {
  const [y] = iso.split('-');
  return `${dayMonth(iso)} ${y}`;
}

const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function daysUntil(iso: string): number {
  return Math.round((utc(iso) - utc(TODAY_ISO)) / 86_400_000);
}

export const TODAY_LABEL = 'Sunday, 08 March 2026';

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  return name.split(/[\s.]+/).filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}
