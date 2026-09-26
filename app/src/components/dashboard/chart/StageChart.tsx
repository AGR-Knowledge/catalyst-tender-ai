import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { ChevronDown } from 'lucide-react';
import type { GraphPointVM, GraphVM } from '@/domain/gcc/viewmodels';
import { EmptyState } from '@/components/tender/EmptyState';

/**
 * The dashboard graph (dashboards.md §6): stages or steps on the x-axis, a
 * metric the viewer chooses on the y-axis, and a dashed comparison series (the
 * start of the window for state metrics, the previous window for flow metrics).
 * A click on a point, or Enter on a point focused with the arrow keys, calls
 * `onPoint`; the page decides where that goes. Colours are CSS variables only.
 */

export interface StageChartProps {
  vm: GraphVM;
  onPoint(key: string): void;
  metric: string;
  setMetric(id: string): void;
  /** Rendered first in the toolbar (the page's Table | Graph toggle). */
  lead?: ReactNode;
}

/** The plot fills the box the table sets (dashboards.md §1 Z5), never under 440 px (`.sc-plot`). */
const PLOT_H = '100%';

/** Compact y-axis ticks: 1.2 bn, 260 M, 12 k. */
function tick(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)} bn`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(0)} M`;
  if (a >= 1e4) return `${+(v / 1e3).toFixed(0)} k`;
  return String(+v.toFixed(1));
}

export function StageChart({ vm, onPoint, metric, setMetric, lead }: StageChartProps) {
  const [shape, setShape] = useState<'line' | 'bar'>('line');
  const [compare, setCompare] = useState(true);
  const active = useRef<GraphPointVM | null>(null);
  const showCompare = compare && vm.compareLabel !== null;
  const data = vm.points.map((p) => ({ ...p, v: p.value ?? 0, c: p.compare ?? 0 }));
  const byLabel = (label: unknown) => vm.points.find((p) => p.label === label) ?? null;
  // A gate sits between two points: draw it at the start of the point after it.
  const markers = vm.markers
    .map((mk) => ({ ...mk, next: vm.points[vm.points.findIndex((p) => p.key === mk.after) + 1] }))
    .filter((mk) => mk.next);

  const click = (p: GraphPointVM | null) => { if (p?.drill) onPoint(p.key); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && active.current) { e.preventDefault(); click(active.current); }
  };

  const TooltipBody = ({ active: on, label }: TooltipContentProps<ValueType, NameType>) => {
    const p = on ? byLabel(label) : null;
    active.current = p;
    if (!p) return null;
    return (
      <div className="sc-tip">
        <b>{p.label}</b>
        <span>{vm.metricLabel}: <span className="num">{p.display}</span>{p.count !== undefined && ` · ${p.count} ${p.count === 1 ? 'tender' : 'tenders'}`}</span>
        {showCompare && <span className="cmp">{vm.compareLabel}: <span className="num">{p.compareDisplay}</span></span>}
        {p.hint && <span className="hint">{p.hint}</span>}
      </div>
    );
  };

  return (
    <div className="sc">
      <div className="sc-bar">
        {lead}
        <label className="tg-sort">
          <span className="sr-only">Metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {vm.metrics.length === 0 && <option value={metric}>{vm.metricLabel}</option>}
            {vm.metrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <ChevronDown size={13} aria-hidden />
        </label>
        <div className="seg" role="radiogroup" aria-label="Chart type">
          {(['line', 'bar'] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={shape === s} className={shape === s ? 'on' : ''} onClick={() => setShape(s)}>
              {s === 'line' ? 'Line' : 'Bar'}
            </button>
          ))}
        </div>
        <label className="sc-cmp" title={vm.compareLabel ?? 'No comparison for this period'}>
          <input type="checkbox" checked={compare && vm.compareLabel !== null} disabled={vm.compareLabel === null} onChange={(e) => setCompare(e.target.checked)} />
          Compare
        </label>
        <span className="sc-legend" aria-hidden>
          <span className="k main" />{vm.metricLabel}
          {showCompare && <><span className="k cmp" />{vm.compareLabel}</>}
          {vm.compareLabel === null && <span className="none">No comparison</span>}
        </span>
      </div>

      <figure className="sc-fig" onKeyDown={onKey}>
        {vm.missing || vm.empty ? (
          <div className="sc-empty">
            <EmptyState
              title={vm.missing ? vm.metricLabel : vm.axis === 'stages' ? 'No tenders in these stages in this period.' : 'No tenders in these steps in this period.'}
              body={vm.missing ? 'This metric is not registered yet.' : undefined}
              compact
            />
          </div>
        ) : (
          <div role="img" aria-label={vm.summary} className="sc-plot">
            <ResponsiveContainer width="100%" height={PLOT_H}>
              <ComposedChart
                data={data} margin={{ top: 26, right: 24, bottom: 8, left: 4 }} barGap={4} barCategoryGap="28%"
                onClick={(s) => click(byLabel(s?.activeLabel))}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis
                  dataKey="label" scale="band" interval={0} tickLine={false} axisLine={{ stroke: 'var(--line)' }}
                  tick={{ fill: 'var(--ink-3)', fontSize: 12 }} height={36}
                />
                <YAxis
                  tickFormatter={tick} tickLine={false} axisLine={false} width={52} allowDecimals={false}
                  tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                />
                {markers.map((mk) => (
                  <ReferenceLine
                    key={mk.label} x={mk.next.label} position="start" stroke="var(--line-strong)" strokeDasharray="4 4"
                    label={{ value: mk.label, position: 'top', fill: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  />
                ))}
                <Tooltip content={TooltipBody} cursor={{ fill: 'var(--surface-hover)' }} isAnimationActive={false} />
                {shape === 'bar' ? (
                  <>
                    <Bar dataKey="v" name={vm.metricLabel} fill="var(--brand)" radius={[3, 3, 0, 0]} maxBarSize={44} isAnimationActive={false} />
                    {showCompare && (
                      <Bar
                        dataKey="c" name={vm.compareLabel ?? ''} fill="var(--brand)" fillOpacity={0.12} stroke="var(--brand)" strokeOpacity={0.5}
                        strokeDasharray="4 3" radius={[3, 3, 0, 0]} maxBarSize={44} isAnimationActive={false}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {showCompare && (
                      <Line
                        dataKey="c" name={vm.compareLabel ?? ''} stroke="var(--brand)" strokeOpacity={0.5} strokeDasharray="5 4" strokeWidth={2}
                        dot={{ r: 3, fill: 'var(--surface)', stroke: 'var(--brand)', strokeOpacity: 0.5 }} activeDot={false} isAnimationActive={false}
                      />
                    )}
                    <Line
                      dataKey="v" name={vm.metricLabel} stroke="var(--brand)" strokeWidth={2.2}
                      dot={{ r: 4, fill: 'var(--surface)', stroke: 'var(--brand)', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'var(--brand)', stroke: 'var(--surface)', strokeWidth: 2 }} isAnimationActive={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <table className="sr-only">
          <caption>{vm.summary}</caption>
          <thead>
            <tr>
              <th scope="col">{vm.axis === 'stages' ? 'Stage' : 'Step'}</th>
              <th scope="col">{vm.metricLabel}</th>
              {vm.compareLabel && <th scope="col">{vm.compareLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {vm.points.map((p) => (
              <tr key={p.key}>
                <th scope="row">{p.label}</th>
                <td>{p.display}</td>
                {vm.compareLabel && <td>{p.compareDisplay}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  );
}

export default StageChart;
