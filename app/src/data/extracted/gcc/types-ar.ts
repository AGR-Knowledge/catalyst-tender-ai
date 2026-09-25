import type { ExtractedTender, ExtractField, ExtractDate, ExtractClause, ExtractFlag } from '../types';

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
