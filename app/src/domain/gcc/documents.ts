import type { ExtractedTender } from '@/data/extracted/types';
import { GCC_DOC_FILES, GCC_EXTRACTED, type ExtractedTenderAr } from '@/data/extracted/gcc';
import type { ExtractedTenderGcc } from '@/data/gcc/types';
import { HERO_EXTRACTED, HERO_FILE, HERO_ID, HERO_REF } from '@/data/gcc/hero';
import { gccData } from '@/data/gcc';

/**
 * The tender document behind a register row (orchestrator contract, wave 4).
 *
 * - The hero's booklet (T-2026-118, every GCC tenant).
 * - A demo tender's booklet (plans 022 and 023) or a real sample document:
 *   the register row's `docKey` names a record in `GCC_EXTRACTED` and a file
 *   in `GCC_DOC_FILES`.
 *
 * Screens (007b, 012) read documents only through `documentFor`, and data
 * plans add documents only by registering them in `data/extracted/gcc/index.ts`,
 * so neither needs the other's files.
 */
export type TenderRecord = ExtractedTenderGcc | ExtractedTender | ExtractedTenderAr;

export interface TenderDocument {
  docKey: string;
  /** Served PDF, e.g. `/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf`. */
  url: string;
  /** "Tender booklet ECWS/PRJ/2026/0147". */
  title: string;
  lang: 'en' | 'ar';
  /** True when some pages are images and were read by OCR. */
  scanned: boolean;
  record: TenderRecord;
}

/** True for a record that carries the GCC field groups and conflicts (the hero, and plan 022's tender). */
export const isGccRecord = (r: TenderRecord): r is ExtractedTenderGcc => 'groups' in r && 'conflicts' in r;

/** True for a record read from an Arabic document: every item carries its Arabic `source`. */
export const isArabicRecord = (r: TenderRecord): r is ExtractedTenderAr => r.language === 'Arabic';

export function documentFor(tenant: string, tenderId: string): TenderDocument | null {
  if (tenderId === HERO_ID) {
    return { docKey: HERO_EXTRACTED.key, url: HERO_FILE, title: `Tender booklet ${HERO_REF}`, lang: 'en', scanned: false, record: HERO_EXTRACTED };
  }
  const row = gccData(tenant).register.find((t) => t.id === tenderId);
  const docKey = row?.docKey;
  if (!docKey) return null;
  const record = GCC_EXTRACTED[docKey];
  const url = GCC_DOC_FILES[docKey];
  if (!record || !url) return null;
  return {
    docKey, url, record,
    title: `Tender document ${record.refNo ?? row.id}`,
    lang: record.language === 'Arabic' ? 'ar' : 'en',
    scanned: record.scanned,
  };
}
