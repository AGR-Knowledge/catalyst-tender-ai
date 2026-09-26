import type { ExtractedTender } from '../types';
import type { ExtractedTenderAr } from './types-ar';
import { WADI_ZARQA } from './wadi-zarqa';
import { T887_JEZZINE } from './cdr-jezzine';
import { KW_CCTLD } from './kw-cctld';
import { CBHH_DOC_KEY, CBHH_EXTRACTED, CBHH_FILE } from './cbhh-011';
import { ILRA_042 } from './ilra-042';

export type { ExtractedTenderAr } from './types-ar';

/**
 * Pre-extracted records for the real Middle East documents in public/bids/me.
 * Kept apart from the legacy `EXTRACTED` list, so Indian upload recognition is
 * unchanged. Each record's `fileNames` holds the original and the ASCII file
 * name, and an upload matches on either (plan 007).
 */
export const GCC_EXTRACTED: Record<string, ExtractedTender | ExtractedTenderAr> = {
  'wadi-zarqa': WADI_ZARQA,
  'cdr-jezzine-lot3': T887_JEZZINE,
  'kw-cctld': KW_CCTLD,
  // Plan 022: the second demo tender (synthetic), T-2026-061 in Corniche.
  [CBHH_DOC_KEY]: CBHH_EXTRACTED,
  // Plan 023: the third demo tender (synthetic, Arabic, 3 scanned pages), T-2026-042 in Batinah.
  'ilra-042': ILRA_042,
};

/** Where each real document is served from. */
export const GCC_DOC_FILES: Record<string, string> = {
  'wadi-zarqa': '/bids/me/wadi-zarqa-pq.pdf',
  'cdr-jezzine-lot3': '/bids/me/cdr-jezzine-lot3.pdf',
  'kw-cctld': '/bids/me/kw-citra-cctld-6-2024-2025.pdf',
  [CBHH_DOC_KEY]: CBHH_FILE,
  'ilra-042': '/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf',
};
