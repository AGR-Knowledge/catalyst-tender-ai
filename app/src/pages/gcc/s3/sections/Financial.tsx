import { dayText, type FacilityAfterBasis, type PackSection, type Section95 } from '@/domain/gcc/s3';
import type { Money as MoneyT } from '@/data/gcc/types';
import { Money } from '@/components/tender/Money';
import { Row, SectionFrame } from './Section';

/**
 * 9.5 Financial exposure: the bid bond, the bonds if won, and the bank
 * guarantee facility with Finance's time stamp. Until Finance answers, the
 * headroom after the bond reads the company facility, marked provisional.
 */
export function FinancialSection({ sec, provisional, collapsible, open, lens }: {
  sec: PackSection<Section95 | null>;
  /** The pack's headroom after the bond, for when Finance hasn't answered yet. */
  provisional: { after: MoneyT; basis: FacilityAfterBasis; source: string; note?: string };
  collapsible?: boolean; open?: boolean; lens?: boolean;
}) {
  const f = sec.body;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'input', label: 'Input: Finance' }} collapsible={collapsible} open={open} lens={lens}>
      {!f ? (
        <div className="pk-facility">
          <div className="pk-fac-after">
            <span className="pk-k">Headroom after this bid&apos;s bond</span>
            <Money value={provisional.after} className="pk-mid" />
            {provisional.note && <span className="pk-prov">{provisional.note}</span>}
            <span className="pk-note">{provisional.source}.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="pk-facility">
            <div className="pk-fac-bar" aria-hidden>
              <FacilityBar f={f} />
              <span className="pk-fleg">
                <span><i className="u" />Utilised</span><span><i className="c" />Committed</span>
                {!f.bidBond.alreadyCommitted && <span><i className="b" />This bid&apos;s bond</span>}<span><i className="h" />Headroom after</span>
              </span>
            </div>
            <div className="pk-fac-grid">
              <Row k="Facility limit"><Money value={f.facility.limit} /></Row>
              <Row k="Utilised"><Money value={f.facility.utilised} /></Row>
              <Row k="Committed by live bids"><Money value={f.facility.committed} /></Row>
              <Row k="Headroom today"><Money value={f.facility.headroom} /></Row>
            </div>
            <div className="pk-fac-after">
              <span className="pk-k">Headroom after this bid&apos;s bond</span>
              <Money value={f.facility.after} className={`pk-mid ${f.facility.after.amount < 0 ? 't-red' : ''}`} />
              <span className="pk-note">Confirmed by {f.facility.confirmedBy}, as of {dayText(f.facility.asOf)}</span>
            </div>
          </div>
          <Row k="Bid bond" strong>{f.bidBond.text}{f.bidBond.alreadyCommitted ? ' (already counted in committed)' : ''}</Row>
          <Row k="Bond costs">{f.bidBond.charges} · {f.bidBond.leadTime}</Row>
          <Row k="If won">
            <ul className="pk-list plain">
              <li>{f.ifWon.performance.text}</li>
              {f.ifWon.advanceGuarantee && <li>{f.ifWon.advanceGuarantee.text}</li>}
              <li>Retention held: <span className="num">{f.ifWon.retentionPct}%</span></li>
            </ul>
          </Row>
          <Row k="Working capital">{f.workingCapital}</Row>
          <Row k="FX">{f.fx}</Row>
          <Row k="Bond terms">{f.bondTermsSource}</Row>
        </>
      )}
    </SectionFrame>
  );
}

/** The facility as one bar: utilised, committed, this bond, headroom after. Words carry the same figures beside it. */
function FacilityBar({ f }: { f: Section95 }) {
  const lim = f.facility.limit.amount || 1;
  const bond = f.bidBond.alreadyCommitted ? 0 : f.bidBond.amount.amount;
  const seg = (n: number) => `${Math.max(0, (n / lim) * 100)}%`;
  return (
    <span className="pk-fbar">
      <span className="u" style={{ width: seg(f.facility.utilised.amount) }} />
      <span className="c" style={{ width: seg(f.facility.committed.amount) }} />
      <span className="b" style={{ width: seg(bond) }} />
      <span className="h" style={{ width: seg(Math.max(0, f.facility.after.amount)) }} />
    </span>
  );
}
