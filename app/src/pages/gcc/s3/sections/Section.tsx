import type { ReactNode } from 'react';
import { Check, Clock, RefreshCw, CircleDashed } from 'lucide-react';
import type { PackSection, SectionFreshness } from '@/domain/gcc/s3';
import { SourceChip, type SourceKind } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';

/**
 * One pack section (spec §9): its number and title, its source and its
 * freshness, then the body. A section waiting for a contributor's input says
 * whose and by when; one nobody asked for says so. In the gate screen the
 * sections fold, with the member's lens open.
 */

const FRESH: Record<SectionFreshness, { word: string; Icon: typeof Check; tone: string }> = {
  current: { word: 'Current', Icon: Check, tone: 'green' },
  stale: { word: 'Stale', Icon: RefreshCw, tone: 'orange' },
  waiting: { word: 'Waiting for input', Icon: Clock, tone: 'orange' },
  'not-requested': { word: 'No input requested', Icon: CircleDashed, tone: 'grey' },
};

export function FreshBadge({ freshness }: { freshness: SectionFreshness }) {
  const f = FRESH[freshness];
  return <span className={`pk-fresh tone-${f.tone}`}><f.Icon size={11} strokeWidth={2.2} aria-hidden />{f.word}</span>;
}

/** The DOM id of a section, for the lens and the section links. */
export const sectionDomId = (id: string) => `pk-${id.replace('.', '-')}`;

export function SectionFrame<B>({ sec, children, chip, doc, collapsible = false, open = true, lens = false }: {
  sec: PackSection<B>;
  children: ReactNode;
  /** The section's source as a chip; its text stays beside it. */
  chip?: { kind: SourceKind; label: string };
  doc?: SourceDoc | null;
  collapsible?: boolean;
  open?: boolean;
  /** This is the member's lens: marked, and open. */
  lens?: boolean;
}) {
  const head = (
    <>
      <span className="pk-no num">{sec.id}</span>
      <h3 className="pk-t">{sec.title}</h3>
      {lens && <span className="pk-lens">Your lens</span>}
      <FreshBadge freshness={sec.freshness} />
    </>
  );
  const meta = (
    <div className="pk-meta">
      {chip && <SourceChip source={{ ...chip, detail: sec.source }} doc={doc} />}
      <span className="pk-src">{sec.source}</span>
    </div>
  );
  const notes = (
    <>
      {sec.waitingFor && (
        <p className="pk-wait">
          <Clock size={12} aria-hidden />
          Waiting for <b>{sec.waitingFor.label}</b> from {sec.waitingFor.ownerName}: {sec.waitingFor.dueText.toLowerCase()}.
        </p>
      )}
      {sec.notRequestedText && <p className="pk-nreq">{sec.notRequestedText}.</p>}
    </>
  );
  const id = sectionDomId(sec.id);
  if (collapsible) {
    return (
      <details className={`pk-sec f-${sec.freshness} ${lens ? 'is-lens' : ''}`} id={id} open={open || lens}>
        <summary className="pk-head">{head}</summary>
        {meta}
        {notes}
        <div className="pk-body">{children}</div>
      </details>
    );
  }
  return (
    <section className={`pk-sec f-${sec.freshness} ${lens ? 'is-lens' : ''}`} id={id} aria-labelledby={`${id}-t`}>
      <header className="pk-head" id={`${id}-t`}>{head}</header>
      {meta}
      {notes}
      <div className="pk-body">{children}</div>
    </section>
  );
}

/** A labelled row inside a section. */
export function Row({ k, children, strong = false }: { k: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`pk-row ${strong ? 'strong' : ''}`}>
      <span className="pk-k">{k}</span>
      <span className="pk-v">{children}</span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="pk-empty">{children}</p>;
}
