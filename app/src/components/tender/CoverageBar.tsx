import type { Tone } from '@/data/types';
import type { MoneyVM } from '@/domain/gcc/viewmodels';
import { Money } from './Money';
import './tender.css';

/**
 * A stacked share by value (ui-direction §6.2): BOQ classification
 * (Self-performed / Subcontract / Not covered) or pricing state (Quoted /
 * Derived / Estimated / Open). The shares are computed from the values given,
 * never typed. A segment under 8% has its label outside the bar only; screen
 * readers get every share in words.
 */

export interface CoverageSegment { label: string; value: MoneyVM | number; tone: Tone }

const INLINE_MIN = 8;

const amountOf = (v: MoneyVM | number) => (typeof v === 'number' ? v : v.amount);
const pctText = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}%`;

export function CoverageBar({ segments, label = 'Share by value' }: { segments: CoverageSegment[]; label?: string }) {
  const total = segments.reduce((s, x) => s + Math.max(0, amountOf(x.value)), 0);
  const parts = segments.map((s) => ({ ...s, pct: total ? (Math.max(0, amountOf(s.value)) / total) * 100 : 0 }));
  const words = parts.map((p, i) => `${i === 0 ? p.label : p.label.toLowerCase()} ${pctText(p.pct)}`).join(', ');
  let left = 0;
  return (
    <figure className="cov" aria-label={label}>
      <div className="cov-scale" aria-hidden>
        {parts.map((p) => {
          const at = left;
          left += p.pct;
          return p.pct >= INLINE_MIN ? <span key={p.label} className="cov-in" style={{ left: `${at}%`, maxWidth: `${p.pct}%` }}>{pctText(p.pct)}</span> : null;
        })}
      </div>
      <div className="cov-bar" aria-hidden>
        {parts.map((p) => p.pct > 0 && <span key={p.label} className={`cov-seg bg-${p.tone}`} style={{ width: `${p.pct}%` }} title={`${p.label} ${pctText(p.pct)}`} />)}
      </div>
      <figcaption className="sr-only">{words}</figcaption>
      <ul className="cov-legend" aria-hidden>
        {parts.map((p) => (
          <li key={p.label} className={p.pct < INLINE_MIN ? 'small' : ''}>
            <span className={`cov-sw bg-${p.tone}`} />
            <span className="cov-l">{p.label}</span>
            <span className="num cov-p">{pctText(p.pct)}</span>
            {typeof p.value !== 'number' && <span className="cov-v"><Money value={p.value} /></span>}
          </li>
        ))}
      </ul>
    </figure>
  );
}
