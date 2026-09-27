import type { Confidence } from '@/data/extracted/types';
import type { TenderRecord } from '@/domain/gcc/documents';
import { fieldsOf } from './sources';

/**
 * What OCR read, and why a value read from a scan or from Arabic is less
 * certain (ui-direction §8, spec §12). The reasons are four fixed sentences,
 * mapped from the record's own `note` and page, never typed in a page. Plan
 * 023's notes map like this:
 * - its STAMPED note ("a stamp covers the figures") → "Stamp over text";
 * - its OCR note on a table (the BOQ summary, p. 15; the copies are slightly
 *   rotated) → "Table read from a skewed scan";
 * - its OCR note on any other scanned page → "Scanned page read by OCR".
 */

export type OcrReason =
  | 'Handwritten amount'
  | 'Stamp over text'
  | 'Table read from a skewed scan'
  | 'Arabic-only clause'
  | 'Scanned page read by OCR';

/** The pages the record lists as scanned and read by OCR, in order. */
export const ocrPagesOf = (r: TenderRecord | null | undefined): number[] =>
  r?.ocrPages ? [...new Set(r.ocrPages)].sort((a, b) => a - b) : [];

/** Why this value's confidence is not high, in one of the fixed sentences; null when high or nothing applies. */
export function reasonOf(
  item: { page: number; confidence: Confidence; note?: string; label?: string },
  ocrPages: number[],
): OcrReason | null {
  if (item.confidence === 'high') return null;
  const note = item.note ?? '';
  const scanned = ocrPages.includes(item.page);
  if (/handwrit/i.test(note)) return 'Handwritten amount';
  if (/stamp (covers|over)/i.test(note)) return 'Stamp over text';
  if (scanned && /\bBOQ\b|\btable\b|\bschedule\b/i.test(`${item.label ?? ''} ${note}`)) return 'Table read from a skewed scan';
  if (/arabic[- ]only clause/i.test(note)) return 'Arabic-only clause';
  return scanned ? 'Scanned page read by OCR' : null;
}

export interface OcrReading {
  /** The scanned pages, e.g. [15, 16, 17]; empty for a record with a text layer throughout. */
  pages: number[];
  /** The reasons that apply to the fields read from those pages, in the order met. */
  reasons: OcrReason[];
  /** Fields read from the scanned pages. */
  fields: number;
}

export function ocrOf(r: TenderRecord | null | undefined): OcrReading {
  const pages = ocrPagesOf(r);
  if (!r || !pages.length) return { pages, reasons: [], fields: 0 };
  const read = fieldsOf(r).filter((f) => pages.includes(f.page));
  const reasons = [...new Set(read.map((f) => reasonOf(f, pages)).filter((x): x is OcrReason => !!x))];
  return { pages, reasons, fields: read.length };
}

/** "p. 15", "pp. 15–17", "pp. 3, 5–7". */
export function pagesText(pages: number[]): string {
  const runs: [number, number][] = [];
  for (const p of pages) {
    const last = runs[runs.length - 1];
    if (last && p === last[1] + 1) last[1] = p; else runs.push([p, p]);
  }
  const text = runs.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(', ');
  return `${pages.length === 1 ? 'p.' : 'pp.'} ${text}`;
}

/** The intake step's detail: "pp. 15–17 read: scanned and stamped". */
export function ocrText(o: OcrReading): string {
  if (!o.pages.length) return 'Scanned pages read';
  return `${pagesText(o.pages)} read: scanned${o.reasons.includes('Stamp over text') ? ' and stamped' : ''}`;
}

/** The document badge: "OCR pp. 15–17", or "OCR" when the record doesn't list its scanned pages. */
export const ocrBadgeText = (o: OcrReading): string => (o.pages.length ? `OCR ${pagesText(o.pages)}` : 'OCR');
