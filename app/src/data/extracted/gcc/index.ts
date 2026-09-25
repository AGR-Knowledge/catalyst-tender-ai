import type { ExtractedTender } from '../types';
import type { ExtractedTenderAr } from './types-ar';
import { WADI_ZARQA } from './wadi-zarqa';
import { T887_JEZZINE } from './cdr-jezzine';
import { KW_CCTLD } from './kw-cctld';

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
};

/** Where each real document is served from. */
export const GCC_DOC_FILES: Record<string, string> = {
  'wadi-zarqa': '/bids/me/wadi-zarqa-pq.pdf',
  'cdr-jezzine-lot3': '/bids/me/cdr-jezzine-lot3.pdf',
  'kw-cctld': '/bids/me/kw-citra-cctld-6-2024-2025.pdf',
};
