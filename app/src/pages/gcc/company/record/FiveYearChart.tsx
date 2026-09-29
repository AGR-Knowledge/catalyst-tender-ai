import { useId, useRef, type KeyboardEvent } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { BarRectangleItem } from 'recharts/types/cartesian/Bar';
import type { YearVM } from '@/domain/gcc/company/record';
import { money } from '@/domain/money';

/**
 * Company › Bid record › Five-year record (plan 032): one stacked bar per
 * rolling year to demo day's date (won, lost, withdrawn or cancelled) and the win
 * rate as a line. The colours are fixed and said in the legend: won green,
 * lost grey (a result, not an alarm), withdrawn hatched, the rate blue. The
 * last bar is the 12 months derived from the tenders below, so a click on one
 * of its parts opens those tenders in the table; the earlier years are the
 * annual record and have no tender rows. Every figure comes from the view
 * model; the table under the plot says the same for screen readers.
 */

export type YearPart = 'won' | 'lost' | 'withdrawn';

const m = (v: YearVM['valueWon']) => money(v.amount, v.ccy);
const rateText = (y: YearVM) => (y.winRatePct === null ? 'no results' : `${y.winRatePct}%`);

export function FiveYearChart({ years, yearEnd, onPick }: { years: YearVM[]; /** "8 Mar" */ yearEnd: string; onPick(y: YearVM, part: YearPart): void }) {
  const hatch = `co-hatch-${useId().replace(/:/g, '')}`;
  const active = useRef<YearVM | null>(null);
  const data = years.map((y) => ({ key: y.key, label: y.label, won: y.won, lost: y.lost, withdrawn: y.withdrawn, rate: y.winRatePct }));
  const byLabel = (label: unknown) => years.find((y) => y.label === label) ?? null;
  const click = (part: YearPart) => (d: BarRectangleItem) => {
    const y = years.find((x) => x.key === d.payload?.key);
    if (y?.ids && y.ids[part].length) onPick(y, part);
  };
  // Enter on the focused chart opens the derived year's results (won and lost first).
  const onKey = (e: KeyboardEvent) => {
    const y = active.current;
    if (e.key !== 'Enter' || !y?.ids) return;
    const part = (['lost', 'won', 'withdrawn'] as YearPart[]).find((p) => y.ids![p].length);
    if (part) { e.preventDefault(); onPick(y, part); }
  };

  const TipBody = ({ active: on, label }: TooltipContentProps<ValueType, NameType>) => {
    const y = on ? byLabel(label) : null;
    active.current = y;
    if (!y) return null;
    return (
      <div className="sc-tip co-yr-tip">
        <b>{y.label}</b>
        <span className="cmp">{y.rangeText}</span>
        <span><span className="num">{y.submitted}</span> bids submitted · <span className="num">{m(y.valueSubmitted)}</span></span>
        <span>
          <span className="num">{y.won}</span> won · <span className="num">{y.lost}</span> lost · <span className="num">{y.withdrawn}</span> withdrawn or cancelled
          {y.awaiting > 0 && <> · <span className="num">{y.awaiting}</span> awaiting result</>}
        </span>
        <span>Win rate {rateText(y)} · <span className="num">{m(y.valueWon)}</span> won</span>
        {y.bySector.map((s) => <span key={s.sector} className="cmp">{s.sector}: <span className="num">{s.won}</span> won of <span className="num">{s.submitted}</span></span>)}
        <span className="hint">{y.derived ? 'From the tenders in the table below. Click a part of the bar to list them.' : 'The company’s annual record: no tender rows.'}</span>
      </div>
    );
  };

  return (
    <div className="co-yr">
      <div className="sc-legend co-yr-legend" aria-hidden>
        <span className="co-mk won" />Won
        <span className="co-mk lost" />Lost
        <span className="co-mk wd" />Withdrawn or cancelled
        <span className="co-mk rate" />Win rate
      </div>
      <figure className="co-yr-fig" onKeyDown={onKey}>
        <div role="img" aria-label={`Bids won, lost and withdrawn by rolling year to ${yearEnd}, ${years[0]?.label} to ${years[years.length - 1]?.label}, with the win rate`} className="co-yr-plot">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: 0 }} barCategoryGap="26%">
              <defs>
                <pattern id={hatch} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                  <rect width="6" height="6" fill="var(--surface)" />
                  <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" strokeWidth="3" />
                </pattern>
              </defs>
              <CartesianGrid stroke="var(--line-2)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={0} tick={{ fill: 'var(--ink-3)', fontSize: 11.5 }} height={26} />
              <YAxis yAxisId="n" tickLine={false} axisLine={false} width={32} allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 11.5 }} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} width={40} tick={{ fill: 'var(--ink-3)', fontSize: 11.5 }} />
              <Tooltip content={TipBody} cursor={{ fill: 'var(--surface-hover)' }} isAnimationActive={false} />
              <Bar yAxisId="n" dataKey="won" name="Won" stackId="r" fill="var(--green)" maxBarSize={52} isAnimationActive={false} onClick={click('won')} style={{ cursor: 'pointer' }} />
              <Bar yAxisId="n" dataKey="lost" name="Lost" stackId="r" fill="var(--ink-4)" maxBarSize={52} isAnimationActive={false} onClick={click('lost')} style={{ cursor: 'pointer' }} />
              <Bar
                yAxisId="n" dataKey="withdrawn" name="Withdrawn or cancelled" stackId="r" fill={`url(#${hatch})`} stroke="var(--line-strong)" strokeWidth={1}
                maxBarSize={52} isAnimationActive={false} onClick={click('withdrawn')} style={{ cursor: 'pointer' }}
              />
              <Line
                yAxisId="pct" dataKey="rate" name="Win rate" type="linear" stroke="var(--blue)" strokeWidth={2}
                dot={{ r: 3.5, fill: 'var(--blue)', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="sr-only">
          <table>
            <caption>Bid record by rolling year to {yearEnd}. The last row is the last 12 months, from the tenders below; the others are the annual record.</caption>
            <thead>
              <tr><th scope="col">Year</th><th scope="col">Submitted</th><th scope="col">Won</th><th scope="col">Lost</th><th scope="col">Withdrawn or cancelled</th><th scope="col">Win rate</th><th scope="col">Value won</th></tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.key}>
                  <th scope="row">{y.label} ({y.rangeText})</th>
                  <td>{y.submitted}</td><td>{y.won}</td><td>{y.lost}</td><td>{y.withdrawn}</td><td>{rateText(y)}</td><td>{m(y.valueWon)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    </div>
  );
}
