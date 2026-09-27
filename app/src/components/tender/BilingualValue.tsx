import type { ReactNode } from 'react';
import type { Confidence } from '@/data/extracted/types';
import { SourceChip } from './SourceChip';
import type { SourceDoc } from './SourceHost';
import './tender.css';

/**
 * An English value with the Arabic it was read from (ui-direction §6.2 and §8,
 * spec §12): the English first; the Arabic beneath it, or beside it at
 * 1440 px and wider, in IBM Plex Sans Arabic, right to left, muted, with the
 * page chip at the end of its line (visually left for Arabic; the chip itself
 * reads left to right). The UI stays English: Arabic is content only.
 *
 * With no `ar`, or with `show` off, it renders the English value exactly as
 * the page rendered it before: `en` alone, in a span only when `className` is
 * given. With the Arabic, `className` goes on the pair, so the Arabic reads at
 * the English value's size. Pages never build their own variant.
 */
export function BilingualValue({ en, ar, page, doc, terms, scanned = false, confidence, reason, show = true, className }: {
  en: ReactNode;
  /** The Arabic source snippet, as printed. */
  ar?: string;
  /** The page the Arabic is on: the chip beside it. */
  page?: number;
  doc?: SourceDoc | null;
  /** Text to highlight when the chip opens the page. */
  terms?: string[];
  /** The page is a scan read by OCR: the chip says so instead of highlighting. */
  scanned?: boolean;
  confidence?: Confidence;
  /** Why the reading is less certain ("Stamp over text"), shown with the confidence. */
  reason?: string;
  /** The page's "Show Arabic sources" switch. */
  show?: boolean;
  /** The class the English value had on the page ("rq-v"). */
  className?: string;
}) {
  const withAr = show && !!ar;
  const why = reason ? (
    <span className={`bv-why c-${confidence ?? 'low'}`}>
      <span aria-hidden>! </span>{confidence && confidence !== 'high' ? `${confidence === 'low' ? 'Low' : 'Medium'} confidence: ` : ''}{reason}
    </span>
  ) : null;

  if (!withAr) {
    if (!why) return className ? <span className={className}>{en}</span> : <>{en}</>;
    return <span className="bv"><span className={className}>{en}</span>{why}</span>;
  }
  return (
    <span className={`bv on${className ? ` ${className}` : ''}`}>
      <span className="bv-en">{en}</span>
      <span className="bv-src" dir="rtl">
        <span className="bv-ar" lang="ar">{ar}</span>
        {page !== undefined && (
          <>
            {' '}
            <span className="bv-chip" dir="ltr">
              <SourceChip source={{ kind: 'page', page, label: `p. ${page}`, ...(terms ? { terms } : {}), ...(scanned ? { scanned: true, arabic: ar } : {}) }} doc={doc} />
            </span>
          </>
        )}
      </span>
      {why}
    </span>
  );
}

/** The one switch that shows or hides every Arabic source on a page or sheet (ui-direction §6.2). */
export function ArabicToggle({ on, onChange, label = 'Show Arabic sources' }: { on: boolean; onChange(on: boolean): void; label?: string }) {
  return (
    <label className="bv-toggle">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
