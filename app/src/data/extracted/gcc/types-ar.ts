import type { ExtractedTender, ExtractField, ExtractDate, ExtractClause, ExtractFlag } from '../types';
import type { GccFieldGroup, ValidationItem } from '../../gcc/types';

/** Arabic-source variant: each item also carries the original Arabic snippet it was read from. */
type Src = { source: string };
export interface ExtractedTenderAr
  extends Omit<ExtractedTender, 'summary' | 'dates' | 'eligibility' | 'scope' | 'evaluation' | 'submission' | 'clauses' | 'flags'> {
  summary: (ExtractField & Src)[];
  dates: (ExtractDate & Src)[];
  eligibility: (ExtractField & Src)[];
  scope: { text: string; page: number; source: string }[];
  evaluation: (ExtractField & Src)[];
  submission: (ExtractField & Src)[];
  clauses: (ExtractClause & Src)[];
  flags: (ExtractFlag & Src)[];
}

/**
 * An Arabic document that also carries the GCC field groups and conflicts (plan 023), so it satisfies
 * both `isArabicRecord` and `isGccRecord` in `domain/gcc/documents.ts`.
 */
export type ExtractedTenderGccAr = ExtractedTenderAr & {
  groups: Record<GccFieldGroup, (ExtractField & Src)[]>;
  conflicts: ValidationItem[];
};
