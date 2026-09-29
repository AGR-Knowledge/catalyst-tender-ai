import { acronymOf } from '@/data/gcc/lifecycle/pools';

/**
 * File names by rule (plan 030 step 2.1.4), never typed per tender: the
 * employer's reference as a file-safe prefix ("ECWS/PRJ/2026/0147" →
 * "ECWS-PRJ-2026-0147"), then what the file is. A reference that isn't a code
 * ("Letter 1447/588", "Restricted") gives way to the issuer's initials and the
 * tender's number: "SRRWD-2026-128".
 */

const CODE = /^[A-Za-z0-9]+(?:[/\-._][A-Za-z0-9]+)+$/;

/** The prefix every file of a tender carries. */
export function refPrefix(ref: string | null | undefined, issuer: string, tenderId: string): string {
  const r = ref?.trim();
  if (r && CODE.test(r)) return r.replace(/[/\\]+/g, '-');
  const [, year, n] = tenderId.split('-');
  return `${acronymOf(issuer) || 'TND'}-${year}-${n}`;
}

/** "ECWS-PRJ-2026-0147 Tender notice.pdf". */
export const fileName = (prefix: string, what: string, ext = 'pdf') => `${prefix} ${what.replace(/\.+$/, '')}.${ext}`;

/** Two digits, as a document register numbers them: "02". */
export const no2 = (n: number) => String(n).padStart(2, '0');

/** A name made safe for a file: no slashes or reserved characters. */
export const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();

/** "Name.pdf", "Name (2).pdf": the second file of the same name in one folder gets a number. */
export function uniqueIn<T extends { name: string }>(files: T[]): T[] {
  const seen = new Map<string, number>();
  return files.map((f) => {
    const k = f.name.toLowerCase();
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n === 1) return f;
    const dot = f.name.lastIndexOf('.');
    const name = dot > 0 ? `${f.name.slice(0, dot)} (${n})${f.name.slice(dot)}` : `${f.name} (${n})`;
    return { ...f, name };
  });
}
