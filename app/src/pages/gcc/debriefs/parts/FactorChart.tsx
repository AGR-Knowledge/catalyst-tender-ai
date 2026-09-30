import { useRef, type KeyboardEvent } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { BarRectangleItem } from 'recharts/types/cartesian/Bar';
import type { ArchiveVM } from '@/domain/gcc/debriefs';
import { plural } from '@/domain/gcc/s1/common';
import { Card, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import type { EmptyWhy, OnPick } from './Cards';

/**
 * What decided it (plan 037): each factor the Project Directors cited, as two
 * bars, in accepted won debriefs (green) and in accepted lost debriefs (grey).
 * The colours are fixed and said in the legend above the plot. A click on a
 * bar lists those debriefs; with the chart focused, the up and down arrows
 * move between factors and Enter lists the factor's wins and losses together. The
 * table under the plot says the same for screen readers.
 */

type Factor = ArchiveVM['factors'][number];
const ROW = 34;

export function FactorCard({ vm, why, onPick }: { vm: ArchiveVM; why: EmptyWhy; onPick: OnPick }) {
  const rows = vm.factors.filter((f) => f.wins + f.losses > 0);
  const active = useRef<Factor | null>(null);
  const byLabel = (label: unknown) => rows.find((f) => f.label === label) ?? null;
  const pickWins = (f: Factor) => onPick({ key: `factor:${f.id}:won`, label: `${f.label}, in wins`, ids: f.winIds });
  const pickLosses = (f: Factor) => onPick({ key: `factor:${f.id}:lost`, label: `${f.label}, in losses`, ids: f.lossIds });
  const click = (part: 'wins' | 'losses') => (d: BarRectangleItem) => {
    const f = rows.find((x) => x.id === (d.payload as { id?: string } | undefined)?.id);
    if (!f) return;
    if (part === 'wins' && f.winIds.length) pickWins(f);
    if (part === 'losses' && f.lossIds.length) pickLosses(f);
  };
  // Recharts steps a vertical chart with ArrowLeft (down the list) and ArrowRight (up it); Up and Down say that plainly.
  const onKeyCapture = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    e.stopPropagation();
    e.target.dispatchEvent(new window.KeyboardEvent('keydown', { key: e.key === 'ArrowDown' ? 'ArrowLeft' : 'ArrowRight', bubbles: true }));
  };
  const onKey = (e: KeyboardEvent) => {
    const f = active.current;
    if (e.key !== 'Enter' || !f) return;
    e.preventDefault();
    onPick({ key: `factor:${f.id}`, label: `${f.label}, in wins and losses`, ids: [...f.winIds, ...f.lossIds] });
  };

  const TipBody = ({ active: on, label }: TooltipContentProps<ValueType, NameType>) => {
    const f = on ? byLabel(label) : null;
    active.current = f;
    if (!f) return null;
    return (
      <div className="sc-tip">
        <b>{f.label}</b>
        <span>In <span className="num">{plural(f.wins, 'win')}</span> · in <span className="num">{plural(f.losses, 'loss', 'losses')}</span></span>
        <span className="hint">Click a bar to list those debriefs.</span>
      </div>
    );
  };

  const empty = !why.endings
    ? { title: why.narrowed ? 'No bids ended in this selection.' : 'No bids ended in this period.' }
    : why.group === 'stopped'
      ? { title: 'Not in this selection.', body: 'Factors are counted on won and lost bids. The Ending chip shows stopped bids only.' }
      : { title: 'No accepted debriefs yet.', body: 'Factors count here once the Head of Tendering accepts the debrief.' };

  return (
    <Card className="co-bd-card">
      <CardHead title="What decided it" meta={<span className="tk-sub">Factors cited · up to three per debrief</span>} />
      <div className="eq-scroll">
        {rows.length ? (
          <div className="db-fc">
            <div className="sc-legend db-fc-legend" aria-hidden>
              <span className="co-mk won" />In wins
              <span className="co-mk lost" />In losses
            </div>
            <figure className="db-fc-fig" onKeyDownCapture={onKeyCapture} onKeyDown={onKey}>
              <div role="img" aria-label={`Factors cited in accepted won and lost debriefs, ${rows.length} factors`} style={{ height: rows.length * ROW + 34 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap="22%" barGap={1}>
                    <CartesianGrid stroke="var(--line-2)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tick={{ fill: 'var(--ink-3)', fontSize: 11.5 }} height={24} />
                    <YAxis type="category" dataKey="label" width={176} tickLine={false} axisLine={false} interval={0} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} />
                    <Tooltip content={TipBody} cursor={{ fill: 'var(--surface-hover)' }} isAnimationActive={false} />
                    <Bar dataKey="wins" name="In wins" fill="var(--green)" maxBarSize={12} isAnimationActive={false} onClick={click('wins')} style={{ cursor: 'pointer' }} />
                    <Bar dataKey="losses" name="In losses" fill="var(--ink-4)" maxBarSize={12} isAnimationActive={false} onClick={click('losses')} style={{ cursor: 'pointer' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="sr-only">
                <table>
                  <caption>Factors cited in accepted debriefs: how many wins and how many losses cite each.</caption>
                  <thead><tr><th scope="col">Factor</th><th scope="col">In wins</th><th scope="col">In losses</th></tr></thead>
                  <tbody>{rows.map((f) => <tr key={f.id}><th scope="row">{f.label}</th><td>{f.wins}</td><td>{f.losses}</td></tr>)}</tbody>
                </table>
              </div>
            </figure>
          </div>
        ) : <EmptyState title={empty.title} body={empty.body} compact />}
      </div>
    </Card>
  );
}
