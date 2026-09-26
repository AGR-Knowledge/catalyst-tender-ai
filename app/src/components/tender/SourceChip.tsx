import { useRef } from 'react';
import type { SourceRef } from '@/domain/gcc/s1';
import { usePop } from './Tip';
import { useSourceHost, type SourceDoc } from './SourceHost';
import './tender.css';

/**
 * Provenance for a value (spec §5.3, ui-direction §6.2 and §7.4): a quiet mono
 * chip (`p. 14`, `add.2 p. 3`, `Q-0412`, `Credential: GOSI cert`, `Calc: fit
 * model`) that comes forward on hover and focus.
 * - A page or addendum chip with a `doc` opens the PDF at that page, with the
 *   value highlighted, through the page's `SourceHost`.
 * - Without a document (most tenders have no PDF in the demo), and for
 *   records (credential, project, quote, input, calc), it opens a tip that
 *   says what the source is.
 */

/** 007a's `SourceRef` kinds, widened with the kinds Stage 2 and 3 cite. 007a's type is not edited. */
export type SourceKind = SourceRef['kind'] | 'addendum' | 'quote' | 'input';

export interface SourceChipRef {
  label: string;
  kind: SourceKind;
  page?: number;
  id?: string;
  /** One line about the record, for the tip: "GOSI certificate, valid to 14 Apr 2026". */
  detail?: string;
  /** Text to highlight on the page. */
  terms?: string[];
}

const RECORD: Record<Exclude<SourceKind, 'page' | 'addendum'>, string> = {
  credential: 'Company credential',
  project: 'Project record',
  quote: 'Supplier quote',
  input: 'Contributor input',
  calc: 'Calculation',
};

const NO_COPY = 'This demo holds a copy of the hero tender only.';

/** "Page 14 of the tender documents", for the tip and the accessible name. */
function whereText(s: SourceChipRef): string {
  const n = s.page ?? (Number(/\d+/.exec(s.label)?.[0]) || undefined);
  const of = s.kind === 'addendum' ? 'the addendum' : 'the tender documents';
  return n ? `Page ${n} of ${of}` : s.kind === 'addendum' ? 'The addendum' : 'The tender documents';
}

export function SourceChip({ source, doc, detail }: { source: SourceChipRef; doc?: SourceDoc | null; detail?: string }) {
  const host = useSourceHost();
  const btn = useRef<HTMLButtonElement | null>(null);
  const isPage = source.kind === 'page' || source.kind === 'addendum';
  const page = source.page ?? (isPage ? Number(/\d+/.exec(source.label)?.[0]) || undefined : undefined);
  const opens = isPage && !!doc && !!host && !!page;
  const pop = usePop<HTMLButtonElement>({ width: 300 });

  if (opens) {
    const where = whereText(source);
    return (
      <button
        type="button" ref={btn} className={`src-chip k-${source.kind} opens`}
        aria-label={`Source: ${where}. Open ${doc!.title} at this page`} title={`Open ${doc!.title} at page ${page}`}
        onClick={() => host!.open({ doc: doc!, page: page!, terms: source.terms, label: source.label }, btn.current)}
      >
        {source.label}
      </button>
    );
  }

  const line = detail ?? source.detail;
  const tip = isPage
    ? <><b>{whereText(source)}.</b><span>{NO_COPY}</span></>
    : <><b>{RECORD[source.kind as keyof typeof RECORD]}: {source.label.replace(/^[A-Za-z]+: /, '')}</b>{line && <span>{line}</span>}</>;
  const name = isPage ? `${whereText(source)}. ${NO_COPY}` : `${RECORD[source.kind as keyof typeof RECORD]}: ${source.label}${line ? `. ${line}` : ''}`;

  return (
    <>
      <button type="button" className={`src-chip k-${source.kind}`} aria-label={`Source: ${name}`} {...pop.triggerProps}>
        {source.label}
      </button>
      {pop.render(<div className="tip-body">{tip}</div>)}
    </>
  );
}

/** A row of chips. */
export function SourceChips({ sources, doc, label = 'Sources' }: { sources: SourceChipRef[]; doc?: SourceDoc | null; label?: string }) {
  if (!sources.length) return null;
  return (
    <span className="src-chips" role="group" aria-label={label}>
      {sources.map((s) => <SourceChip key={`${s.kind}:${s.label}`} source={s} doc={doc} />)}
    </span>
  );
}
