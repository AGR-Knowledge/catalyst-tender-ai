import { holdersOf } from '@/data/access';
import { isMasked, type PackSection, type RiskVM, type Section97 } from '@/domain/gcc/s3';
import { Masked } from '@/components/tender/Masked';
import { SourceChip, type SourceChipRef } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { Empty, Row, SectionFrame } from './Section';

const RATING: Record<RiskVM['rating'], { word: string; tone: string }> = {
  high: { word: 'High', tone: 'red' }, medium: { word: 'Medium', tone: 'orange' }, low: { word: 'Low', tone: 'grey' },
};

/** "Addendum 2, p. 2" → the chip `add.2 p. 2`. */
function addendumChip(source: string): SourceChipRef {
  const m = /^Addendum (\d+), p\. (\d+)/.exec(source);
  return m ? { kind: 'addendum', label: `add.${m[1]} p. ${m[2]}`, page: Number(m[2]) } : { kind: 'addendum', label: source };
}

/** One risk line: rating in words, the clause and its page, the stance, the mitigation, and where it came from. */
export function RiskLine({ r, doc }: { r: RiskVM; doc?: SourceDoc | null }) {
  const rt = RATING[r.rating];
  return (
    <li className="pk-risk">
      <span className={`pk-rate tone-${rt.tone}`}>{rt.word}</span>
      <div className="pk-risk-b">
        <div className="pk-risk-t">
          {r.risk}
          {r.changed && <span className="pk-tag warn">Changed by the addendum</span>}
          {r.kind === 'extraction-flag' && <span className="pk-tag">{r.flagState === 'sent-back' ? 'Extraction flag, sent back' : 'Extraction flag, open'}</span>}
        </div>
        <div className="pk-risk-m">
          {r.kind === 'contract' && <span>Cl. {r.clause}</span>}
          {r.stance && <span>Stance: <b>{r.stance}</b></span>}
          {r.category && <span className="cap">{r.category}</span>}
          {r.page ? <SourceChip source={{ kind: 'page', label: `p. ${r.page}`, page: r.page }} doc={doc} /> : null}
          {r.changed && <SourceChip source={addendumChip(r.source)} />}
        </div>
        {r.mitigation && <div className="pk-risk-mit">Mitigation: {r.mitigation}</div>}
      </div>
    </li>
  );
}

/** 9.6 Risk profile: the top five contract risks with their stance and mitigation, then any open extraction flags. */
export function RisksSection({ sec, doc, collapsible, open, lens }: { sec: PackSection<RiskVM[] | null>; doc?: SourceDoc | null; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const risks = sec.body;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'input', label: 'Input: Legal' }} collapsible={collapsible} open={open} lens={lens}>
      {!risks ? <Empty>The contract risks come from the Compliance / Legal input.</Empty>
        : risks.length === 0 ? <Empty>No contract risks listed.</Empty>
        : <ol className="pk-risks">{risks.map((r) => <RiskLine key={`${r.kind}-${r.clause}-${r.risk}`} r={r} doc={doc} />)}</ol>}
    </SectionFrame>
  );
}

/** 9.7 Expected margin range: Commercial's preliminary range, never a price. Masked without `see.margin`. */
export function MarginSection({ sec, collapsible, open, lens }: { sec: PackSection<Section97 | null>; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const m = sec.body;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'input', label: 'Input: Commercial' }} collapsible={collapsible} open={open} lens={lens}>
      {!m ? <Empty>The margin range comes from the Commercial Manager&apos;s input.</Empty>
        : isMasked(m) ? <Masked by={holdersOf('see.margin')} />
        : (
          <>
            <div className="pk-hero">
              <div className="pk-big num">{m.range}</div>
              <div className="pk-hero-side">
                <p className="pk-lede">On {m.basis}.{m.note && <> <span className="pk-tag warn">{m.note}</span></>}</p>
                <p className="pk-note">A range, not a price. Confidence: <b>{m.confidence}</b>.</p>
              </div>
            </div>
            <Row k="Top cost risks"><ol className="pk-list plain num-list">{m.costRisks.map((c) => <li key={c}>{c}</li>)}</ol></Row>
          </>
        )}
    </SectionFrame>
  );
}
