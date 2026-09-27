import type { Confidence, ExtractField } from '@/data/extracted/types';
import { dateText } from '@/domain/calendar';
import { isArabicRecord, type TenderRecord } from '@/domain/gcc/documents';
import { arabicOf, fieldsOf } from './sources';
import { ocrOf, ocrPagesOf, reasonOf, type OcrReading, type OcrReason } from './ocr';

/**
 * "Read in English" (spec §12, ui-direction §8): an English reading of the
 * whole Arabic document, built only from the extraction record's English
 * values (nothing is translated at run time), in the record's own order:
 * headline facts, scope, eligibility, dates, evaluation, submission, clauses.
 * Each item keeps its page and the Arabic it was read from. An empty section
 * is left out. A record not read from Arabic has no reading.
 */

export const READING_LABEL = 'Machine translation for understanding, not for submission. The Arabic text is the tender.';

export type ReadingSectionId = 'summary' | 'scope' | 'eligibility' | 'dates' | 'evaluation' | 'submission' | 'clauses';

export const READING_SECTIONS: { id: ReadingSectionId; title: string }[] = [
  { id: 'summary', title: 'Headline facts' },
  { id: 'scope', title: 'Scope of work' },
  { id: 'eligibility', title: 'Eligibility and prequalification' },
  { id: 'dates', title: 'Dates' },
  { id: 'evaluation', title: 'Evaluation' },
  { id: 'submission', title: 'Submission' },
  { id: 'clauses', title: 'Clauses' },
];

export interface ReadingItem {
  key: string;
  label?: string;
  text: string;
  page: number;
  /** The Arabic it was read from, when it has Arabic. */
  ar?: string;
  confidence?: Confidence;
  /** Why the reading is less certain (a scan, a stamp), when it is. */
  reason?: OcrReason;
}

export interface ReadingSection { id: ReadingSectionId; title: string; items: ReadingItem[] }

export interface Reading {
  /** The English working title, and the Arabic title as printed when the record holds it. */
  title: string;
  titleAr?: string;
  ref: string | null;
  docType: string;
  pages: number;
  ocr: OcrReading;
  sections: ReadingSection[];
}

export function readingOf(r: TenderRecord | null | undefined): Reading | null {
  if (!r || !isArabicRecord(r)) return null;
  const ocrPages = ocrPagesOf(r);
  const field = (id: string) => (f: ExtractField, i: number): ReadingItem => {
    const reason = reasonOf(f, ocrPages);
    const ar = arabicOf(f);
    return {
      key: `${id}:${i}`, label: f.label, text: f.value, page: f.page, confidence: f.confidence,
      ...(ar ? { ar } : {}), ...(reason ? { reason } : {}),
    };
  };
  const items: Record<ReadingSectionId, ReadingItem[]> = {
    summary: r.summary.map(field('summary')),
    scope: r.scope.map((s, i) => {
      const ar = arabicOf(s);
      return { key: `scope:${i}`, text: s.text, page: s.page, ...(ar ? { ar } : {}) };
    }),
    eligibility: r.eligibility.map(field('eligibility')),
    dates: r.dates.map((d, i) => {
      const ar = arabicOf(d);
      const reason = reasonOf({ page: d.page, confidence: d.confidence, label: d.label }, ocrPages);
      return {
        key: `dates:${i}`, label: d.label, text: `${dateText(d.date)}${d.time ? `, ${d.time}` : ''}`, page: d.page, confidence: d.confidence,
        ...(ar ? { ar } : {}), ...(reason ? { reason } : {}),
      };
    }),
    evaluation: r.evaluation.map(field('evaluation')),
    submission: r.submission.map(field('submission')),
    clauses: r.clauses.map((c, i) => {
      const ar = arabicOf(c);
      return { key: `clauses:${i}`, label: `${c.ref} ${c.title}`, text: c.summary, page: c.page, ...(ar ? { ar } : {}) };
    }),
  };
  const title = fieldsOf(r).find((f) => f.label === 'Title');
  const titleAr = title ? arabicOf(title) : undefined;
  return {
    title: r.title,
    ...(titleAr ? { titleAr } : {}),
    ref: r.refNo, docType: r.docType, pages: r.pages, ocr: ocrOf(r),
    sections: READING_SECTIONS.map((s) => ({ ...s, items: items[s.id] })).filter((s) => s.items.length > 0),
  };
}
