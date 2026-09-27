import { useMemo, useState } from 'react';
import { Languages } from 'lucide-react';
import type { TenderRecord } from '@/domain/gcc/documents';
import { ocrPagesOf, pagesText, readingOf, READING_LABEL, type ReadingItem } from '@/domain/gcc/arabic';
import { termsOf } from '@/domain/gcc/workspace';
import { Sheet } from '@/components/tender/Sheet';
import { SourceChip } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { ArabicToggle, BilingualValue } from '@/components/tender/BilingualValue';

/**
 * "Read in English" (plan 012, spec §12): a button that opens the whole
 * Arabic document as an English reading in the sheet. The label is at the
 * top, and its short form sits in the sheet's header, which stays in view: it
 * is a machine translation for understanding, not for submission. Every item keeps its page chip, which opens the PDF at that
 * page; "Show the Arabic beside it" adds the original. Esc closes the sheet
 * and focus goes back to the button. A record not read from Arabic shows no
 * button.
 */

/** In the sheet's header, which stays in view while the reading scrolls: the label never leaves the screen. */
const READING_EYEBROW = 'Read in English · machine translation, not for submission';

function Item({ it, doc, ocrPages, showAr }: { it: ReadingItem; doc: SourceDoc | null; ocrPages: number[]; showAr: boolean }) {
  const scanned = ocrPages.includes(it.page);
  const terms = scanned ? undefined : termsOf(it.text);
  const withAr = showAr && !!it.ar;
  // With the Arabic shown, the chip sits beside it; otherwise at the end of the label, or of the line when there is none.
  const chip = !withAr && <SourceChip source={{ kind: 'page', page: it.page, label: `p. ${it.page}`, ...(terms ? { terms } : {}), ...(scanned ? { scanned: true, ...(it.ar ? { arabic: it.ar } : {}) } : {}) }} doc={doc} />;
  const value = <BilingualValue en={it.text} ar={it.ar} page={it.page} doc={doc} terms={terms} scanned={scanned} show={showAr} confidence={it.confidence} reason={it.reason} className="rie-v" />;
  if (!it.label) return <li className="rie-item bare">{value}{chip}</li>;
  return (
    <li className="rie-item">
      <div className="rie-item-h"><span className="rie-l">{it.label}</span>{chip}</div>
      {value}
    </li>
  );
}

export function ReadInEnglish({ record, doc, className = 'btn btn-sm' }: { record: TenderRecord; doc: SourceDoc | null; className?: string }) {
  const reading = useMemo(() => readingOf(record), [record]);
  const items = useMemo(() => [{ id: 'reading', title: record.shortName }], [record]);
  const [open, setOpen] = useState(false);
  const [showAr, setShowAr] = useState(false);
  if (!reading) return null;
  const ocrPages = ocrPagesOf(record);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Languages size={12} aria-hidden />Read in English
      </button>
      <Sheet
        items={items} index={open ? 0 : null} onIndex={() => undefined} onClose={() => setOpen(false)} eyebrow={READING_EYEBROW}
        render={() => (
          <div className="rie">
            <p className="rie-label" role="note"><b>{READING_LABEL}</b></p>
            <div className="rie-head">
              {reading.titleAr && <div className="rie-title-ar" lang="ar" dir="rtl">{reading.titleAr}</div>}
              <div className="rie-t">{reading.title}{reading.titleAr && <span className="rie-sub"> (working title, translated)</span>}</div>
              <div className="rie-sub">
                {reading.docType}, {reading.pages} pages{reading.ref ? <>, <span className="mono">{reading.ref}</span></> : null}
                {reading.ocr.pages.length > 0 && <>. Scanned and read by OCR: {pagesText(reading.ocr.pages)}</>}.
              </div>
            </div>
            <div className="rie-tools"><ArabicToggle on={showAr} onChange={setShowAr} label="Show the Arabic beside it" /></div>
            {reading.sections.map((s) => (
              <section key={s.id} className="rie-sec" aria-labelledby={`rie-${s.id}`}>
                <h3 id={`rie-${s.id}`}>{s.title}</h3>
                <ul className="rie-list">
                  {s.items.map((it) => <Item key={it.key} it={it} doc={doc} ocrPages={ocrPages} showAr={showAr} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      />
    </>
  );
}
