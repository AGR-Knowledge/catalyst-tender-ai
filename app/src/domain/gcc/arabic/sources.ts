import type { ExtractField } from '@/data/extracted/types';
import { isArabicRecord, isGccRecord, type TenderRecord } from '@/domain/gcc/documents';

/**
 * The Arabic a record's items were read from (plan 023's `source` fields).
 * Nothing is translated here: the Arabic is data, and a source counts only
 * when it holds Arabic script. The English technical specification of the
 * Kuwaiti tender (pp. 38–61) quotes English, and a date read from the file's
 * metadata has no source, so neither shows an Arabic line.
 */

const ARABIC_SCRIPT = /[؀-ۿ]/;

/** True when the text holds Arabic script. */
export const hasArabic = (s: string | null | undefined): s is string => !!s && ARABIC_SCRIPT.test(s);

/** The Arabic an item was read from, or undefined when it has none. */
export function arabicOf(item: object | null | undefined): string | undefined {
  const s = item ? (item as { source?: unknown }).source : undefined;
  return typeof s === 'string' && hasArabic(s) ? s : undefined;
}

/** Every field of a record: the GCC groups when it has them, else its own sections. */
export function fieldsOf(r: TenderRecord): ExtractField[] {
  const own = [...r.summary, ...r.eligibility, ...r.evaluation, ...r.submission];
  return isGccRecord(r) ? [...Object.values(r.groups).flat(), ...r.eligibility] : own;
}

interface Line { page: number; text: string; ar?: string; field: boolean }

/** The record's lines in the order the intake queue's snippet reads them (`s1/vm/docs.ts`), with their Arabic. */
function linesOf(r: TenderRecord): Line[] {
  const field = (f: ExtractField): Line => ({ page: f.page, text: `${f.label}: ${f.value}`, ar: arabicOf(f), field: true });
  const groups = isGccRecord(r) ? Object.values(r.groups).flat().map(field) : [];
  return [
    ...r.clauses.map((c) => ({ page: c.page, text: `${c.ref} ${c.title}: ${c.summary}`, ar: arabicOf(c), field: false })),
    ...r.scope.map((s) => ({ page: s.page, text: s.text, ar: arabicOf(s), field: false })),
    ...groups,
    ...[...r.summary, ...r.evaluation, ...r.submission, ...r.eligibility].map(field),
  ];
}

/**
 * The line an Arabic record prints on `page` that states `value`, with the
 * Arabic it was read from, for a validation item's snippet. The same line as
 * the English snippet when there is one; else a field on that page that
 * states the value without its bracket ("OMR 300,000 (fixed amount)" finds
 * the bond form's "OMR 300,000"). Null for an English record.
 */
export function bilingualSnippet(r: TenderRecord | null | undefined, page: number, value: string): { en: string; ar?: string } | null {
  if (!r || !isArabicRecord(r)) return null;
  const here = linesOf(r).filter((l) => l.page === page);
  const v = value.toLowerCase();
  const exact = here.find((l) => l.text.toLowerCase().includes(v));
  const core = v.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const loose = !exact && core && core !== v
    ? [...here.filter((l) => l.field && l.ar), ...here].find((l) => l.text.toLowerCase().includes(core))
    : undefined;
  const hit = exact ?? loose;
  return hit ? { en: hit.text, ...(hit.ar ? { ar: hit.ar } : {}) } : null;
}

/**
 * The Arabic a record prints for a key date: its dated item on the same page
 * and day (and at the same time when both give one). Undefined for an English
 * record, or when the record holds no such item.
 */
export function dateArabicOf(r: TenderRecord | null | undefined, k: { date: string; time?: string; page?: number }): string | undefined {
  if (!r || !isArabicRecord(r) || k.page === undefined) return undefined;
  const same = r.dates.filter((d) => d.page === k.page && d.date === k.date);
  const hit = same.find((d) => !k.time || !d.time || d.time === k.time) ?? same[0];
  return hit ? arabicOf(hit) : undefined;
}
