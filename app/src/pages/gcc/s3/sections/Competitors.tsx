import { Link } from 'react-router-dom';
import type { CompetitorsVM, EvidenceChip, PackSection, Section93 } from '@/domain/gcc/s3';
import { SourceChip } from '@/components/tender/SourceChip';
import { Empty, Row, SectionFrame } from './Section';

/** An evidence record as a chip: its id, with the record's title and date in the tip. */
const Ev = ({ e }: { e: EvidenceChip }) => <SourceChip source={{ kind: 'project', label: e.id, detail: `${e.title}, ${e.date}` }} />;

/** 9.2 Competitors: every claim with its evidence; claims without a source are not shown, only counted. */
export function CompetitorsSection({ sec, collapsible, open, lens }: { sec: PackSection<CompetitorsVM | null>; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const c = sec.body;
  return (
    <SectionFrame sec={sec} collapsible={collapsible} open={open} lens={lens}>
      {!c ? <Empty>No competitor intelligence on record for this tender yet.</Empty> : (
        <>
          <p className="pk-lede">
            <b className="num">{c.bidders}</b> likely bidders{c.weBid ? ', us included' : ''}. Every claim below cites its evidence: no source, no claim. Names are fictional.
          </p>
          <div className="pk-comps">
            {c.competitors.map((x) => (
              <article key={x.id} className="pk-comp" aria-label={x.name}>
                <header className="pk-comp-h">
                  <span className="pk-comp-n">{x.name}</span>
                  <span className="pk-comp-c">{x.country}</span>
                  <span className={`pk-posture p-${x.pricingPosture}`}>{x.postureLabel}</span>
                  {x.usuallyJv && <span className="pk-tag">Usually in a JV</span>}
                  {x.alsoOurPartner && <span className="pk-tag warn">Also on our JV partner list</span>}
                </header>
                <p className="pk-comp-p">{x.profile}</p>
                {x.claims.length > 0 && (
                  <ul className="pk-claims">
                    {x.claims.map((cl) => <li key={cl.text}><span>{cl.text}</span><span className="pk-evs">{cl.evidence.map((e) => <Ev key={e.id} e={e} />)}</span></li>)}
                  </ul>
                )}
                {x.recentWins.length > 0 && (
                  <div className="pk-wins">
                    <span className="pk-h5">Recent comparable wins</span>
                    {x.recentWins.map((w) => (
                      <span key={w.title} className="pk-win">{w.title} ({w.year}){w.valueText ? `, ${w.valueText}` : ''} <Ev e={w.evidence} /></span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
          {c.suppressedText && <p className="pk-note">{c.suppressedText}.</p>}
        </>
      )}
    </SectionFrame>
  );
}

/** 9.3 Eligibility and JV: the Stage 1 roll-up, refreshed with renewed credentials. */
export function EligibilitySection({ sec, tenderId, collapsible, open, lens }: { sec: PackSection<Section93 | null>; tenderId: string; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const e = sec.body;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'credential', label: 'Vault: PQ check' }} collapsible={collapsible} open={open} lens={lens}>
      {!e ? <Empty>No eligibility check on record for this tender.</Empty> : (
        <>
          <Row k="PQ lines" strong><span className={e.atRisk ? 't-orange' : 't-green'}>{e.text}</span></Row>
          <Row k="Structure">{e.jv}</Row>
          {e.kind === 'live' && <Row k="Detail"><Link className="btn-link" to={`/tenders/${encodeURIComponent(tenderId)}?tab=eligibility`}>Open eligibility and fit</Link></Row>}
        </>
      )}
    </SectionFrame>
  );
}
