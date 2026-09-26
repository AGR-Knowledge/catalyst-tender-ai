import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Text, Tooltip, XAxis, YAxis, type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { ChevronDown } from 'lucide-react';
import type { GraphPointVM, GraphVM } from '@/domain/gcc/viewmodels';
import { EmptyState } from '@/components/tender/EmptyState';

/**
 * The dashboard graph (dashboards.md §6, user decision 2026-09-26): one bar
 * per stage (or per step on a stage dashboard). Buttons switch the bars between
 * Tenders | Value | Weighted; the other metrics sit under "More". Compare draws
 * a ghost bar behind each bar (the start of the window for state metrics, the
 * previous window for flow metrics). A click on a bar, or Enter on a bar
 * focused with the arrow keys, calls `onPoint`; the page decides where that
 * goes. Every number and every sentence comes from the view model; colours
 * are CSS variables only.
 */

export interface StageChartProps {
  vm: GraphVM;
  onPoint(key: string): void;
  metric: string;
  setMetric(id: string): void;
  /** Rendered first in the toolbar (the page's Table | Graph toggle). */
  lead?: ReactNode;
}

/** Compact y-axis ticks: 1.2 bn, 260 M, 12 k. */
function tick(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return `${+(v / 1e9).toFixed(1)} bn`;
  if (a >= 1e6) return `${+(v / 1e6).toFixed(0)} M`;
  if (a >= 1e4) return `${+(v / 1e3).toFixed(0)} k`;
  return String(+v.toFixed(1));
}

/** An x-axis label that wraps inside its band ("3 Bid decision" on two lines when the band is narrow). */
function AxisTick(props: { x?: number | string; y?: number | string; payload?: { value: string }; width?: number | string; visibleTicksCount?: number }) {
  const band = Number(props.width ?? 0) / Math.max(1, props.visibleTicksCount ?? 1);
  // A narrow band (nine stages at 1280 px) steps the size down so "Compliance" still fits on its line.
  const size = band < 68 ? 10.5 : 11.5;
  return (
    <Text
      x={Number(props.x)} y={Number(props.y)} width={Math.max(40, band - 4)} maxLines={2}
      textAnchor="middle" verticalAnchor="start" fill="var(--ink-3)" fontSize={size} lineHeight={14}
      // Recharts measures the words with `style`, not the font attributes.
      style={{ fontSize: `${size}px`, fontFamily: 'var(--font-sans)' }}
    >{props.payload?.value ?? ''}</Text>
  );
}

/** The value above a bar, on one line (Recharts' own label wraps to the bar's width). */
function BarLabel(props: { x?: number | string; y?: number | string; width?: number | string; value?: unknown }) {
  const text = typeof props.value === 'string' ? props.value : '';
  if (!text) return null;
  return (
    <text
      x={Number(props.x) + Number(props.width) / 2} y={Number(props.y) - 6} textAnchor="middle"
      fill="var(--ink-2)" fontSize={11.5} fontWeight={500} style={{ fontVariantNumeric: 'tabular-nums' }}
    >{text}</text>
  );
}

export function StageChart({ vm, onPoint, metric, setMetric, lead }: StageChartProps) {
  const [compare, setCompare] = useState(true);
  const active = useRef<GraphPointVM | null>(null);
  const showCompare = compare && vm.compareLabel !== null;
  // Null draws no bar (a stage without a win probability); the page adds nothing to the numbers.
  const data = vm.points.map((p) => ({ ...p, v: p.value, c: p.compare, t: p.barLabel ?? '' }));
  const byLabel = (label: unknown) => vm.points.find((p) => p.label === label) ?? null;
  // A gate sits between two points: draw it at the start of the point after it.
  const markers = vm.markers
    .map((mk) => ({ ...mk, next: vm.points[vm.points.findIndex((p) => p.key === mk.after) + 1] }))
    .filter((mk) => mk.next);
  // Without measure buttons (older fixtures), every metric sits in the select.
  const measures = vm.measures ?? [];
  const more = vm.more ?? (measures.length ? [] : vm.metrics);
  const onMore = more.some((m) => m.id === metric);
  const notes = vm.notes ?? [];

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
        <span>{vm.metricLabel}: <span className="num">{p.display}</span>{p.count !== undefined && p.value !== null && ` · ${p.count} ${p.count === 1 ? 'tender' : 'tenders'}`}</span>
        {showCompare && <span className="cmp">{vm.compareLabel}: <span className="num">{p.compareDisplay}</span></span>}
        {p.hint && <span className="hint">{p.hint}</span>}
      </div>
    );
  };

  return (
    <div className="sc">
      <div className="sc-bar">
        {lead}
        {measures.length > 0 && (
          <div className="seg sc-measures" role="radiogroup" aria-label="Measure">
            {measures.map((m) => (
              <button
                key={m.id} type="button" role="radio" aria-checked={metric === m.id} className={metric === m.id ? 'on' : ''}
                onClick={() => setMetric(m.id)} title={m.label}
              >{m.short}</button>
            ))}
          </div>
        )}
        {more.length > 0 && (
          <label className={`tg-sort sc-more ${onMore ? 'on' : ''}`}>
            <span className="sr-only">{measures.length ? 'More measures' : 'Metric'}</span>
            <select value={onMore ? metric : ''} onChange={(e) => e.target.value && setMetric(e.target.value)}>
              {measures.length > 0 && <option value="" disabled>More</option>}
              {!measures.length && !onMore && <option value="" disabled>{vm.metricLabel}</option>}
              {more.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <ChevronDown size={13} aria-hidden />
          </label>
        )}
        <label className="sc-cmp" title={vm.compareLabel ?? 'No comparison for this measure'}>
          <input type="checkbox" checked={showCompare} disabled={vm.compareLabel === null} onChange={(e) => setCompare(e.target.checked)} />
          Compare
        </label>
      </div>

      <div className="sc-cap">
        <span className="sc-legend" aria-hidden>
          <span className="k main" />{vm.metricLabel}{vm.unit && <span className="unit">{vm.unit}</span>}
          {showCompare && <><span className="k cmp" />{vm.compareLabel}</>}
          {vm.compareLabel === null && <span className="none">No comparison for this measure</span>}
          {vm.target && <><span className="k tgt" />{vm.target.label}</>}
        </span>
        {notes.map((n) => <span key={n} className="sc-note">{n}</span>)}
      </div>

      <figure className="sc-fig" onKeyDown={onKey}>
        {vm.missing || vm.empty ? (
          <div className="sc-empty">
            <EmptyState
              title={vm.missing ? vm.metricLabel : vm.emptyText ?? (vm.axis === 'stages' ? 'No tenders in these stages in this period.' : 'No tenders in these steps in this period.')}
              body={vm.missing ? 'This metric is not registered yet.' : undefined}
              compact
            />
          </div>
        ) : (
          <div role="img" aria-label={vm.summary} className="sc-plot">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data} margin={{ top: 28, right: 12, bottom: 4, left: 0 }} barCategoryGap="22%"
                onClick={(s) => click(byLabel(s?.activeLabel))}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid stroke="var(--line-2)" vertical={false} />
                <XAxis
                  xAxisId="main" dataKey="label" scale="band" interval={0} tickLine={false} axisLine={{ stroke: 'var(--line)' }}
                  tick={<AxisTick />} height={40}
                />
                {/* The ghost bars get their own hidden band axis, so they sit centred behind the bars, a little wider. Height 0: bottom axes stack. */}
                <XAxis xAxisId="ghost" dataKey="label" scale="band" hide height={0} />
                <YAxis
                  tickFormatter={tick} tickLine={false} axisLine={false} width={48} allowDecimals={false}
                  tick={{ fill: 'var(--ink-3)', fontSize: 12 }}
                />
                {markers.map((mk) => (
                  <ReferenceLine
                    key={mk.label} xAxisId="main" x={mk.next.label} position="start" stroke="var(--line-strong)" strokeDasharray="4 4"
                    label={{ value: mk.label, position: 'top', fill: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  />
                ))}
                <Tooltip axisId="main" content={TooltipBody} cursor={{ fill: 'var(--surface-hover)' }} isAnimationActive={false} />
                {showCompare && (
                  <Bar
                    xAxisId="ghost" dataKey="c" name={vm.compareLabel ?? ''} fill="var(--brand)" fillOpacity={0.1}
                    stroke="var(--brand)" strokeOpacity={0.45} strokeDasharray="4 3" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={false}
                  />
                )}
                <Bar xAxisId="main" dataKey="v" name={vm.metricLabel} fill="var(--brand)" radius={[3, 3, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                  <LabelList dataKey="t" content={BarLabel} />
                </Bar>
                {vm.target && (
                  <ReferenceLine
                    xAxisId="main" y={vm.target.value} stroke="var(--orange)" strokeDasharray="6 4"
                    label={{ value: `${vm.target.label} ${vm.target.display}`, position: 'insideTopRight', fill: 'var(--ink-3)', fontSize: 11 }}
                  />
                )}
              </BarChart>
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
