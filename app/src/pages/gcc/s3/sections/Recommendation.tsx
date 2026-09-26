import { useState } from 'react';
import { Lock } from 'lucide-react';
import { holdersOf, type CanResult } from '@/data/access';
import { personById } from '@/data/people';
import { MASKED_TEXT, stampText, type PackSection, type PackSummary, type Section98, type WinVM, type MaskedBody } from '@/domain/gcc/s3';
import { RecommendationCard } from '@/components/tender/RecommendationCard';
import type { SourceDoc } from '@/components/tender/SourceHost';
import type { Tone } from '@/data/types';
import { RiskLine } from './Risks';
import { Row, SectionFrame } from './Section';

const TONE: Record<Section98['recommendation'], Tone> = { bid: 'green', 'bid-with-conditions': 'orange', 'no-bid': 'red' };

/** The rationale's sentences, as the card's "Why". */
const sentences = (s: string) => s.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);

/**
 * 9.8 Recommendation: the agent's recommendation, win themes, the resource
 * ask and the top three risks. The Bid Manager writes the presenter's note;
 * the numbers stay locked.
 */
export function RecommendationSection({ sec, summary, win, noteCheck, onSaveNote, doc, collapsible, open, lens }: {
  sec: PackSection<Section98>;
  summary: PackSummary;
  win: WinVM | MaskedBody | null;
  /** `can('pack.note')` with its reason. */
  /** Null: the viewer never writes the note, so no control is shown. */
  noteCheck: CanResult | null;
  onSaveNote(text: string): string | null;
  doc?: SourceDoc | null;
  collapsible?: boolean; open?: boolean; lens?: boolean;
}) {
  const r = sec.body;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.presenterNote?.text ?? '');
  const [error, setError] = useState<string | null>(null);
  const winMasked = summary.win === MASKED_TEXT;
  const movers = win && !('masked' in win) ? win.movers.map((m) => m.text) : [];

  const save = () => {
    const e = onSaveNote(draft);
    setError(e);
    if (!e) setEditing(false);
  };

  return (
    <SectionFrame sec={sec} collapsible={collapsible} open={open} lens={lens}>
      <RecommendationCard
        heading="Bid / No-Bid recommendation"
        agent={r.agent.replace(/ agent$/, '')}
        verdict={r.label}
        tone={TONE[r.recommendation]}
        confidence={summary.win && !winMasked ? `Win ${summary.win}` : null}
        confidenceMasked={winMasked ? { by: holdersOf('see.positions') } : undefined}
        reasons={sentences(r.rationale)}
        wouldChange={movers}
        wouldChangeMasked={winMasked ? { by: holdersOf('see.positions') } : undefined}
        sources={[{ kind: 'calc', label: 'Calc: win model', detail: 'Win-Probability & Recommendation agent' }]}
        doc={doc}
      />

      <div className="pk-h4">Win themes</div>
      <ul className="pk-list">
        {r.winThemes.map((w) => (
          <li key={w.text}>{w.text}{w.cites.length > 0 && <span className="pk-cites">{w.cites.map((c) => `${c.title} (${c.year}, ${c.result})`).join('; ')}</span>}</li>
        ))}
      </ul>
      <Row k="Resource ask">{r.resourceAsk}</Row>
      {r.topRisks.length > 0 && (
        <>
          <div className="pk-h4">Top three risks</div>
          <ol className="pk-risks compact">{r.topRisks.map((x) => <RiskLine key={`${x.kind}-${x.clause}`} r={x} doc={doc} />)}</ol>
        </>
      )}

      <div className="pk-note-box">
        <div className="pk-note-h">
          <span className="pk-h4">Presenter&apos;s note</span>
          <span className="pk-lock"><Lock size={11} aria-hidden />The numbers are locked: the note is narrative only</span>
        </div>
        {editing ? (
          <>
            <label className="sr-only" htmlFor={`note-${sec.id}`}>Presenter&apos;s note</label>
            <textarea id={`note-${sec.id}`} className="pk-textarea" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What you will say to the committee, in two or three sentences." autoFocus />
            {error && <p className="pk-err" role="alert">{error}</p>}
            <div className="pk-acts">
              <button type="button" className="btn btn-sm btn-primary" onClick={save}>Save note</button>
              <button type="button" className="btn btn-sm" onClick={() => { setEditing(false); setError(null); setDraft(r.presenterNote?.text ?? ''); }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            {r.presenterNote
              ? <blockquote className="pk-quote">{r.presenterNote.text}<footer>{personById(r.presenterNote.byId)?.name ?? r.presenterNote.byId}, {stampText(r.presenterNote.at)}</footer></blockquote>
              : <p className="pk-empty">No presenter&apos;s note yet.</p>}
            {noteCheck && (
              <div className="pk-acts">
                <button type="button" className="btn btn-sm" onClick={() => setEditing(true)} disabled={!noteCheck.ok} aria-describedby={!noteCheck.ok ? `note-why-${sec.id}` : undefined}>
                  {r.presenterNote ? 'Edit the note' : 'Write the note'}
                </button>
                {!noteCheck.ok && <span className="pk-why" id={`note-why-${sec.id}`}>{noteCheck.reason}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </SectionFrame>
  );
}
