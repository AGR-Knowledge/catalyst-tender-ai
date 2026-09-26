import type { ExtractField } from '@/data/extracted/types';
import { documentFor, isGccRecord, type TenderDocument, type TenderRecord } from '@/domain/gcc/documents';
import type { SourceDoc } from '@/components/tender/SourceHost';

/**
 * The tender's document for page chips (read only through `documentFor`, the
 * orchestrator's contract), and the text a record prints on a page, for a
 * validation item's source snippet. Shaping only: nothing here decides.
 */

export const docOf = (tenant: string, tenderId: string): TenderDocument | null => documentFor(tenant, tenderId);

export const sourceDocOf = (d: TenderDocument | null): SourceDoc | null => (d ? { url: d.url, title: d.title } : null);

/** Every line of a record with its page: clauses, scope, fields and flags. */
function linesOf(r: TenderRecord): { page: number; text: string }[] {
  const field = (f: ExtractField) => ({ page: f.page, text: `${f.label}: ${f.value}` });
  const groups = isGccRecord(r) ? Object.values(r.groups).flat().map(field) : [];
  return [
    ...r.clauses.map((c) => ({ page: c.page, text: `${c.ref} ${c.title}: ${c.summary}` })),
    ...r.scope.map((s) => ({ page: s.page, text: s.text })),
    ...groups,
    ...[...r.summary, ...r.evaluation, ...r.submission, ...r.eligibility].map(field),
  ];
}

/** What the record prints on `page` that states `value` ("§41 Initial guarantee: 1% of the total bid value…"), or null. */
export function snippetAt(r: TenderRecord | null | undefined, page: number, value: string): string | null {
  if (!r) return null;
  const v = value.toLowerCase();
  return linesOf(r).find((l) => l.page === page && l.text.toLowerCase().includes(v))?.text ?? null;
}
