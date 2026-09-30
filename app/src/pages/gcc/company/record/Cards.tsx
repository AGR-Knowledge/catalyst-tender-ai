import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import type { BreakdownRowVM, BreakdownVM, DeclineGateVM, DeclinesVM, FunnelVM, LossesVM } from '@/domain/gcc/company/record';
import { plural } from '@/domain/gcc/s1/common';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { Masked } from '@/components/tender/Masked';
import { usePop } from '@/components/tender/Tip';

/**
 * The bid record's cards (plan 032). Each count is a button that lists its
 * tenders in the table below (`onPick`). Bars are one blue: they count one
 * thing each. Numbers and sentences come from `bidRecordFor`; nothing is
 * worked out here but the wording.
 */

/** What a click hands the table: a key, the chip's words, and the tenders. */
export interface TablePick { key: string; label: string; ids: string[] }
type OnPick = (p: TablePick) => void;

/** "33%", "33% (n = 3)" under five results, "No results". */
export const rateOf = (r: Pick<BreakdownRowVM, 'winRatePct' | 'n' | 'small'>) =>
  (r.winRatePct === null ? 'No results' : r.small ? `${r.winRatePct}% (n = ${r.n})` : `${r.winRatePct}%`);

const Bar = ({ pct }: { pct: number }) => <span className="co-bd-bar" aria-hidden><span style={{ width: `${pct ? Math.max(3, pct) : 0}%` }} /></span>;

/** A breakdown: one row per sector, client type, country, size band or client, most bids first. */
export function BreakdownCard({ title, noun, vm, onPick, empty }: { title: string; noun: string; vm: BreakdownVM; onPick: OnPick; empty: string }) {
  const bids = vm.rows.reduce((n, r) => n + r.bids, 0);
  return (
    <Card className="co-bd-card">
      <CardHead title={title} meta={<span className="tk-sub">Bids · won · lost · win rate</span>} />
      <div className="eq-scroll">
        {vm.rows.length ? (
          <ul className="co-bd" aria-label={title}>
            {vm.rows.map((r) => (
              <li key={r.key}>
                <button
                  type="button" className="co-bd-row"
                  onClick={() => onPick({ key: `${noun}:${r.key}`, label: `${noun}: ${r.label}`, ids: r.ids.all })}
                  aria-label={`${r.label}: ${plural(r.bids, 'bid')}, ${r.won} won, ${r.lost} lost, win rate ${rateOf(r)}. List these tenders`}
                >
                  <span className="co-bd-l" title={r.label}>{r.label}</span>
                  <span className={`co-bd-r ${r.winRatePct === null ? 'none' : 'num'}`}>{rateOf(r)}</span>
                  <Bar pct={r.pct} />
                  <span className="co-bd-m"><span className="num">{r.bids}</span> {r.bids === 1 ? 'bid' : 'bids'} · <span className="num">{r.won}</span> won · <span className="num">{r.lost}</span> lost</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <EmptyState title={empty} compact />}
        {vm.more > 0 && <p className="co-bd-more">and {plural(vm.more, 'more client')} with fewer bids</p>}
        {vm.note && bids > 0 && <p className="co-bd-more">{vm.note}</p>}
      </div>
    </Card>
  );
}

/** Captured → pursued → submitted → won: each bar is the share of the step before. */
export function FunnelCard({ vm, onPick }: { vm: FunnelVM; onPick: OnPick }) {
  const s = vm.steps;
  return (
    <Card className="co-fn-card">
      <CardHead title="From captured to won" meta={<span className="tk-sub">Last 12 months</span>} />
      <div className="eq-scroll">
        <ol className="co-fn" aria-label="From captured to won">
          {s.map((x, i) => {
            const prev = s[i - 1];
            const share = i === 0 ? 100 : x.pctOfPrev ?? 0;
            const note = i === 0 ? x.sub : x.pctOfPrev === null ? `None ${prev.label.toLowerCase()}` : `${x.pctOfPrev}% of ${prev.label.toLowerCase()}`;
            const count = <span className="co-fn-n num">{x.count.toLocaleString('en-GB')}</span>;
            return (
              <li key={x.key}>
                <span className="co-fn-l">{x.label}<span className="co-fn-sub">{i === 0 ? '' : x.sub}</span></span>
                {x.ids && x.ids.length ? (
                  <button type="button" className="co-fn-btn" onClick={() => onPick({ key: `funnel:${x.key}`, label: `${x.sub}`, ids: x.ids! })} aria-label={`${x.sub}: ${x.count}. List these tenders`}>{count}</button>
                ) : count}
                <Bar pct={share} />
                <span className="co-fn-p">{note}</span>
              </li>
            );
          })}
        </ol>
        <p className="co-bd-more">
          Decisions made in the same 12 months, not one group of tenders followed through, so a step can hold tenders captured before the window.
          {vm.capturedAllSectors ? ' Captured notices are not split by sector, so they are the company’s.' : ''}
        </p>
      </div>
    </Card>
  );
}

/** "Top factor · Supplier quotes (4)": the factor the accepted debriefs cite most for this reason (plan 037). */
function TopFactor({ f, maskedBy }: { f: LossesVM['rows'][number]['topFactor']; maskedBy: string }) {
  if (f === 'masked') return <>Top factor <Masked by={maskedBy} /></>;
  return f ? <>Top factor · {f.label} (<span className="num">{f.count}</span>)</> : <>No debriefs yet</>;
}

/**
 * Why we lost: the loss reasons, our place and the gap to the winner where the employer published them, and the
 * top factor from the debriefs. The foot links to the Debriefs archive for those who may open it (`debriefsTo`).
 */
export function LossCard({ vm, maskedBy, debriefMaskedBy, debriefsTo, onPick }: { vm: LossesVM; maskedBy: string; debriefMaskedBy: string; debriefsTo: string; onPick: OnPick }) {
  const d = vm.debriefs;
  return (
    <Card className="co-bd-card">
      <CardHead title="Why we lost" meta={<span className="tk-sub">{plural(vm.total, 'loss', 'losses')}</span>} />
      <div className="eq-scroll">
        {vm.rows.length ? (
          <ul className="co-bd" aria-label="Loss reasons">
            {vm.rows.map((r) => (
              <li key={r.key}>
                <button
                  type="button" className="co-bd-row" onClick={() => onPick({ key: `loss:${r.key}`, label: `Lost on ${r.label.toLowerCase()}`, ids: r.ids })}
                  aria-label={`${r.label}: ${plural(r.count, 'loss', 'losses')}, ${r.sharePct}% of losses. List these tenders`}
                >
                  <span className="co-bd-l">{r.label}</span>
                  <span className="co-bd-r num">{r.sharePct}%</span>
                  <Bar pct={r.pct} />
                  <span className="co-bd-m"><span className="num">{r.count}</span> {r.count === 1 ? 'loss' : 'losses'}</span>
                </button>
                <span className="co-ls-x">
                  {r.place ? <>Our place <span className="num">{r.place.median} of {r.place.of}</span>{r.place.n < r.count && <> (n = {r.place.n})</>}</> : 'Our place not published'}
                  {' · '}
                  {r.gap === 'masked' ? <>gap to winner <Masked by={maskedBy} /></>
                    : r.gap ? <>gap to winner <span className="num">{r.gap.medianPct}%</span>{r.gap.n < r.count && <> (n = {r.gap.n})</>}</> : 'gap not published'}
                </span>
                <span className="co-ls-x co-ls-f"><TopFactor f={r.topFactor} maskedBy={debriefMaskedBy} /></span>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No losses in the last 12 months." compact />}
        {vm.total > 0 && (
          <p className="co-bd-more">
            Our place is published on {vm.placeRecorded} of {plural(vm.total, 'loss', 'losses')}
            {vm.gapRecorded === 'masked' ? '.' : <>, the gap to the winner on {vm.gapRecorded}.</>} Places and gaps are medians of those published.
          </p>
        )}
      </div>
      {vm.total > 0 && (
        <CardFoot>
          {/* Without `debrief.view` the archive holds nothing for the viewer, so the count is masked rather than read as none. */}
          <span className="co-ls-foot">
            {!d.canOpen ? <>Top factors come from accepted debriefs · <Masked by={debriefMaskedBy} /></>
              : d.accepted ? <>From <span className="num">{d.accepted}</span> accepted {d.accepted === 1 ? 'debrief' : 'debriefs'}{d.complete ? '' : ' on your tenders'}</>
                : d.complete ? 'No accepted debriefs yet' : 'No accepted debriefs on your tenders yet'}
            {d.canOpen && <> · <Link className="co-rt-link" to={debriefsTo}>Open Debriefs →</Link></>}
          </span>
        </CardFoot>
      )}
    </Card>
  );
}

function DeclineGroup({ title, g, gate, onPick }: { title: string; g: DeclineGateVM; gate: string; onPick: OnPick }) {
  return (
    <>
      <h3 className="s1-h3 co-dc-h">{title} <span className="num">{g.total}</span></h3>
      {g.rows.length ? (
        <ul className="co-bd" aria-label={title}>
          {g.rows.map((r) => (
            <li key={r.code}>
              <button
                type="button" className="co-bd-row co-bd-row-1" onClick={() => onPick({ key: `${gate}:${r.code}`, label: `${gate}: ${r.label}`, ids: r.ids })}
                aria-label={`${r.label}: ${r.count}. List these tenders`}
              >
                <span className="co-bd-l" title={r.label}>{r.label}</span>
                <span className="co-bd-r num">{r.count}</span>
                <Bar pct={r.pct} />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="s1-muted co-dc-none">None in the last 12 months.</p>}
    </>
  );
}

/** What we chose not to bid: DG1 discards and DG2 no-bids, by the first reason recorded. */
export function DeclineCard({ vm, onPick }: { vm: DeclinesVM; onPick: OnPick }) {
  return (
    <Card className="co-bd-card">
      <CardHead title="What we chose not to bid" meta={<span className="tk-sub">{plural(vm.total, 'decision')}</span>} />
      <div className="eq-scroll">
        <DeclineGroup title="Discarded at DG1" g={vm.dg1} gate="Discarded at DG1" onPick={onPick} />
        <DeclineGroup title="No-bid at DG2" g={vm.dg2} gate="No-bid at DG2" onPick={onPick} />
        <p className="co-bd-more">By the first reason recorded with each decision.</p>
      </div>
    </Card>
  );
}

/** "How to read this": the colours, the window, and where the earlier years come from. */
export function ReadKey({ window: w }: { window: string }) {
  const pop = usePop<HTMLButtonElement>({ width: 340 });
  const item = (mark: string, text: ReactNode) => <li><span className={`co-mk ${mark}`} aria-hidden />{text}</li>;
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost co-rh-key" {...pop.triggerProps}>
        <Info size={14} strokeWidth={1.7} aria-hidden />How to read this
      </button>
      {pop.render(
        <div className="info-pop co-key-pop">
          <div className="ip-t">How to read the bid record</div>
          <ul className="sc-key co-key">
            {item('won', 'Won: a contract awarded to us.')}
            {item('lost', 'Lost: a result, shown grey, not as an alarm.')}
            {item('wd', 'Withdrawn or cancelled: submitted, then neither won nor lost.')}
            {item('rate', 'Win rate, and every bar that counts one thing: blue.')}
          </ul>
          <div className="ip-note">
            Everything but the five-year record reads the last 12 months ({w}), tender by tender, as the dashboards do at “12 months”.
            The four earlier years are the company’s annual record, with no tender rows. Select any count to list its tenders in the table.
          </div>
        </div>,
      )}
    </>
  );
}
