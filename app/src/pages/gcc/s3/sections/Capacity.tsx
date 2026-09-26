import { dayText, type PackSection, type Section94 } from '@/domain/gcc/s3';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { Row, SectionFrame } from './Section';

/** 9.4 Resource and capacity: bid effort, delivery impact if won, and the portfolio roll-up against the safe-delivery level. */
export function CapacitySection({ sec, collapsible, open, lens }: { sec: PackSection<Section94>; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const c = sec.body;
  const p = c.portfolio;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'input', label: 'Input: Planning' }} collapsible={collapsible} open={open} lens={lens}>
      <div className="pk-roll">
        <div className="pk-h4">Delivery capacity if won, against the safe level</div>
        <ThresholdBar value={p.totalPct} threshold={p.safePct} thresholdLabel="safe level" unit="%" tone={p.tone} label="Delivery capacity if won" />
        <p className={`pk-lede t-${p.tone === 'green' ? 'ink' : p.tone}`}>{p.text}.</p>
        <table className="pk-table">
          <caption className="sr-only">Delivery load today and what each bid adds if won</caption>
          <thead><tr><th scope="col">Load</th><th scope="col" className="r">Points of capacity</th>{p.ifWon.some((x) => x.win) && <th scope="col" className="r">Win</th>}</tr></thead>
          <tbody>
            <tr><th scope="row">Live projects, as of {dayText(p.asOf)}</th><td className="r num">{p.currentPct}</td>{p.ifWon.some((x) => x.win) && <td />}</tr>
            {p.ifWon.map((x) => (
              <tr key={x.tenderId}>
                <th scope="row"><span className="mono">{x.tenderId}</span> {x.title}</th>
                <td className="r num">{x.addText}</td>
                {p.ifWon.some((y) => y.win) && <td className="r num">{x.win ?? <span className="pk-dim">Not shown here</span>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Row k="Bid effort">{c.effort.text}</Row>
      {c.planning && (
        <>
          <Row k="Programme">{c.planning.duration}</Row>
          <Row k="Long-lead fit">{c.planning.longLead}</Row>
          <Row k="Peak manpower"><span className="num">{c.planning.peakManpower.toLocaleString('en-GB')}</span></Row>
          <Row k="Key plant">{c.planning.keyPlant.join('; ')}</Row>
          <Row k="Clash">{c.planning.clash}</Row>
        </>
      )}
      {c.pd && (
        <>
          <Row k="Delivery feasibility" strong>{c.pd.feasibility}{c.pd.note ? `: ${c.pd.note}` : ''}</Row>
          <Row k="Key staff">
            <ul className="pk-list plain">{c.pd.keyStaff.map((s) => <li key={`${s.name}-${s.role}`}><b>{s.name}</b>, {s.role} · available from {dayText(s.availableFrom)}</li>)}</ul>
          </Row>
          <Row k="Site">{c.pd.site}</Row>
        </>
      )}
      {c.hr && (
        <>
          <Row k="Availability (HR)">
            <ul className="pk-list plain">{c.hr.availability.map((s) => <li key={`${s.name}-${s.role}`}><b>{s.name}</b>, {s.role}: {s.status}</li>)}</ul>
          </Row>
          <Row k="Nationalisation">{c.hr.nationalisation}</Row>
        </>
      )}
    </SectionFrame>
  );
}
