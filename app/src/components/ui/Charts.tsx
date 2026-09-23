import type { CSSProperties } from 'react';

const MINUS = '−';
const signed = (v: number) => `${v < 0 ? MINUS : ''}₹ ${Math.abs(v).toFixed(1)} Cr`;

export interface EffortRow { stage: number; name: string; before: number; now: number; saved: number; change: string }

/** Hours per bid by stage: the pale bar is before go-live, the dark bar is now. */
export function EffortChart({ rows, before, now }: { rows: EffortRow[]; before: number; now: number }) {
  const max = Math.max(...rows.map((r) => r.before));
  const bars = (b: number, n: number, m: number) => ({ '--b': `${(b / m) * 100}%`, '--n': `${(n / m) * 100}%` }) as CSSProperties;
  return (
    <div className="eff" role="table" aria-label="Hours per bid by stage">
      <div className="eff-row eff-head" role="row">
        <span role="columnheader">Stage</span>
        <span role="columnheader" className="eff-bars">Hours per bid, before and now</span>
        <span role="columnheader" className="r">Saved</span>
        <span role="columnheader" className="eff-ch">What changed</span>
      </div>
      {rows.map((r) => (
        <div className="eff-row" role="row" key={r.stage} title={`${r.name}: ${r.before} h before go-live, ${r.now} h now`}>
          <span className="eff-st"><i>{r.stage}</i>{r.name}</span>
          <span className="eff-bars">
            <span className="eff-b">{r.before} h</span>
            <span className="eff-track" style={bars(r.before, r.now, max)}><span className="was" /><span className="is" /></span>
            <span className="eff-n">{r.now} h</span>
          </span>
          <span className="r t-green mono">{r.saved} h</span>
          <span className="eff-ch">{r.change}</span>
        </div>
      ))}
      <div className="eff-row eff-total" role="row">
        <span className="eff-st">Whole bid</span>
        <span className="eff-bars">
          <span className="eff-b">{before} h</span>
          <span className="eff-track" style={bars(before, now, before)}><span className="was" /><span className="is" /></span>
          <span className="eff-n">{now} h</span>
        </span>
        <span className="r t-green mono">{before - now} h</span>
        <span className="eff-ch">{Math.round(((before - now) / before) * 100)}% less time per bid</span>
      </div>
    </div>
  );
}

/** Monthly columns around a zero line. Months below zero are still paying back the platform cost. */
export function BenefitChart({ data }: { data: { m: string; v: number }[] }) {
  const hi = Math.max(0, ...data.map((d) => d.v));
  const lo = Math.min(0, ...data.map((d) => d.v));
  const range = hi - lo || 1;
  const zero = (hi / range) * 100;
  const payback = data.findIndex((d) => d.v > 0);
  return (
    <div className="ben">
      <div className="ben-plot" style={{ '--zero': `${zero}%` } as CSSProperties}>
        <span className="ben-zero" />
        {data.map((d, i) => {
          const h = (Math.abs(d.v) / range) * 100;
          const last = i === data.length - 1;
          return (
            <span key={d.m} className="ben-col" title={`${d.m}: ${signed(d.v)} cumulative`}>
              <span className={`ben-bar ${d.v < 0 ? 'neg' : ''} ${i >= payback && payback >= 0 ? 'paid' : ''}`} style={d.v < 0 ? { top: `${zero}%`, height: `${h}%` } : { bottom: `${100 - zero}%`, height: `${h}%` }} />
              {last && <span className="ben-v" style={{ bottom: `${100 - zero + h}%` }}>{signed(d.v)}</span>}
            </span>
          );
        })}
      </div>
      <div className="ben-x">{data.map((d) => <span key={d.m}>{d.m}</span>)}</div>
    </div>
  );
}

/**
 * Monthly resource need against what can be fielded. The part of a bar above
 * owned capacity is orange while it is a shortfall and turns cyan once covered by hire.
 */
export function Histogram({ months, owned, capacity, unit }: { months: { m: string; y: number; v: number }[]; owned: number; capacity: number; unit: string }) {
  const top = Math.max(capacity, ...months.map((m) => m.v)) + 1;
  const y = (v: number) => `${(v / top) * 100}%`;
  return (
    <div className="hist">
      <div className="hist-plot">
        <span className="hist-cap" style={{ bottom: y(capacity) }}><i>{capacity} {unit} available</i></span>
        {months.map((m) => {
          const base = Math.min(m.v, owned);
          const extra = m.v - base;
          const covered = extra > 0 && m.v <= capacity;
          return (
            <span key={`${m.m}${m.y}`} className="hist-col" title={`${m.m} ${m.y}: ${m.v} ${unit} needed, ${capacity} available`}>
              <span className="hist-bar" style={{ height: y(base) }} />
              {extra > 0 && <span className={`hist-bar extra ${covered ? 'covered' : ''}`} style={{ bottom: y(base), height: y(extra) }} />}
              <span className="hist-v" style={{ bottom: y(m.v) }}>{m.v}</span>
            </span>
          );
        })}
      </div>
      <div className="hist-x">
        {months.map((m, i) => <span key={`${m.m}${m.y}`}>{m.m}{i === 0 || m.m === 'Jan' ? <small>{` ${m.y}`}</small> : null}</span>)}
      </div>
    </div>
  );
}
