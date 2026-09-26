import { holdersOf } from '@/data/access';
import { isMasked, type MaskedBody, type PackSection, type WinVM } from '@/domain/gcc/s3';
import { Callout } from '@/components/tender/Callout';
import { Masked } from '@/components/tender/Masked';
import { SourceChip } from '@/components/tender/SourceChip';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { Empty, SectionFrame } from './Section';

/** 9.1 Win probability: the score and its band, the driver table, calibration, the low-data warning, what would move it. */
export function WinSection({ sec, collapsible, open, lens }: { sec: PackSection<WinVM | MaskedBody | null>; collapsible?: boolean; open?: boolean; lens?: boolean }) {
  const w = sec.body;
  return (
    <SectionFrame sec={sec} chip={{ kind: 'calc', label: 'Calc: win model' }} collapsible={collapsible} open={open} lens={lens}>
      {!w ? <Empty>No win model for this tender yet: the agent scores it once the pack is generated.</Empty>
        : isMasked(w) ? <Masked by={holdersOf('see.positions')} />
        : (
          <>
            <div className="pk-hero">
              <div className="pk-big num">{w.p}<small>%</small><span className="pk-band"> ± {w.band}</span></div>
              <div className="pk-hero-side">
                <ThresholdBar value={w.p} band={w.band} unit="%" tone="ink" label="Win probability" />
                <p className="pk-lede">
                  Starts from {w.base.label.charAt(0).toLowerCase() + w.base.label.slice(1)}: <b className="num">{w.base.pct}%</b>.
                  {' '}The drivers add <b className="num">{w.sum > 0 ? '+' : ''}{w.sum}</b> points. The band comes from {w.comparables} comparable bids.
                </p>
              </div>
            </div>
            {w.lowData && w.lowDataText && <Callout variant="route" compact word="Low data" title={w.lowDataText} />}

            <table className="pk-table pk-drivers">
              <caption className="sr-only">What drives the win probability, largest effect first</caption>
              <thead>
                <tr><th scope="col">Driver</th><th scope="col" className="r">Points</th><th scope="col">Why</th><th scope="col">Source</th></tr>
              </thead>
              <tbody>
                {w.drivers.map((d) => (
                  <tr key={d.key}>
                    <th scope="row">{d.label}</th>
                    <td className={`r num pts ${d.points > 0 ? 't-green' : d.points < 0 ? 't-red' : 'pk-dim'}`}>{d.pointsText}</td>
                    <td>
                      {d.why}
                      {d.cites.length > 0 && <span className="pk-cites">{d.cites.map((c) => `${c.title} (${c.year}, ${c.result})`).join('; ')}</span>}
                    </td>
                    <td><SourceChip source={{ kind: 'calc', label: d.source, detail: d.why }} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th scope="row">Win probability</th><td className="r num pts"><b>{w.p}%</b></td><td colSpan={2} className="pk-dim">{w.base.pct}% base {w.sum >= 0 ? '+' : '−'} {Math.abs(w.sum)} points from the drivers</td></tr>
              </tfoot>
            </table>

            <div className="pk-two">
              <div>
                <div className="pk-h4">What would move it</div>
                <ul className="pk-list">{w.movers.map((m) => <li key={m.text} className={m.points > 0 ? 'up' : 'down'}>{m.text}</li>)}</ul>
              </div>
              <div>
                <div className="pk-h4">Calibration</div>
                <p className="pk-note">{w.calibration}.</p>
              </div>
            </div>
          </>
        )}
    </SectionFrame>
  );
}
