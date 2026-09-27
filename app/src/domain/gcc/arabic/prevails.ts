import { isArabicRecord, type TenderRecord } from '@/domain/gcc/documents';
import { arabicOf } from './sources';

/**
 * "Arabic text prevails" (spec §12, ui-direction §8): raised on the
 * Requirements tab and the Overview whenever the document says so, or, for a
 * tender read from Arabic, when it doesn't say which language prevails.
 *
 * Found in this order:
 * 1. the language clause (T-2026-042 §7; the hero's §27);
 * 2. a flag that says the Arabic text prevails (the regex 007b used);
 * 3. for an Arabic record, a flag that says no clause settles it (T-2026-071);
 * 4. for an Arabic record with neither, the fixed sentence below.
 * An English record with none of these (T-2026-061: English governs) gives null.
 */

export interface Prevails {
  /** `arabic`: the document says the Arabic text prevails. `unstated`: it doesn't say which language does. */
  kind: 'arabic' | 'unstated';
  /** The clause as printed, e.g. "§7"; null when a flag raised it. */
  ref: string | null;
  page?: number;
  /** The English wording: the clause summary, or the flag's detail. */
  en: string;
  /** The Arabic it was read from, when the record holds it. */
  ar: string | null;
  /** The detail of the screening flag that raises the same point, when there is one. */
  flag?: string;
}

export const UNSTATED_TEXT = "The document doesn't say which language prevails.";

const SAYS_ARABIC = /arabic text (shall )?prevails?|arabic prevails/i;
const SAYS_UNSTATED = /no language[- ]precedence|which language prevails|which prevails/i;

export function prevailsOf(r: TenderRecord | null | undefined): Prevails | null {
  if (!r) return null;
  const flag = r.flags.find((f) => SAYS_ARABIC.test(`${f.title} ${f.detail}`));
  const clause = r.clauses.find((c) => /language/i.test(c.title) && SAYS_ARABIC.test(c.summary));
  if (clause) {
    return { kind: 'arabic', ref: clause.ref, page: clause.page, en: clause.summary, ar: arabicOf(clause) ?? null, ...(flag ? { flag: flag.detail } : {}) };
  }
  if (flag) return { kind: 'arabic', ref: null, page: flag.page, en: flag.detail, ar: arabicOf(flag) ?? null, flag: flag.detail };
  if (!isArabicRecord(r)) return null;
  const unstated = r.flags.find((f) => SAYS_UNSTATED.test(`${f.title} ${f.detail}`));
  if (unstated) return { kind: 'unstated', ref: null, page: unstated.page, en: unstated.detail, ar: arabicOf(unstated) ?? null, flag: unstated.detail };
  return { kind: 'unstated', ref: null, en: UNSTATED_TEXT, ar: null };
}

/**
 * The callout's title: "Arabic text prevails (§7, p. 5)" or "No clause says
 * which language prevails". `page: false` leaves the page to a chip beside it.
 */
export function prevailsTitle(p: Prevails, { page = true }: { page?: boolean } = {}): string {
  if (p.kind === 'unstated') return 'No clause says which language prevails';
  const where = [p.ref, page && p.page ? `p. ${p.page}` : null].filter(Boolean).join(', ');
  return `Arabic text prevails${where ? ` (${where})` : ''}`;
}
