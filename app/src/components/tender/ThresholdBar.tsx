import type { Tone } from '@/data/types';
import { Masked } from './Masked';
import './tender.css';

/**
 * A micro-bar with a threshold tick (ui-direction §6.2), for fit and win
 * probability. The text beside it says the same thing in words:
 * "58 ± 8 · threshold 50". Masked values keep their place with `Masked`.
 */
export function ThresholdBar({ value, band, threshold, max = 100, masked, maskedBy, tone, unit = '', thresholdLabel = 'threshold', label }: {
  value: number | null;
  /** ± points around the value. */
  band?: number;
  threshold?: number;
  max?: number;
  masked?: boolean;
  maskedBy?: string;
  tone?: Tone;
  /** "%" for a probability. */
  unit?: string;
  /** The tick's name in the text: "threshold", "pursue at". */
  thresholdLabel?: string;
  /** What is measured, for screen readers: "Fit", "Win probability". */
  label?: string;
}) {
  if (masked) return <Masked by={maskedBy} />;
  if (value === null) return <span className="tk-sub">Not scored</span>;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`;
  const t = tone ?? (threshold === undefined ? 'ink' : value >= threshold ? 'green' : 'orange');
  const text = `${value}${unit}${band ? ` ± ${band}` : ''}${threshold !== undefined ? ` · ${thresholdLabel} ${threshold}${unit}` : ''}`;
  return (
    <span className="thr" role="img" aria-label={`${label ? `${label} ` : ''}${text}`}>
      <span className="thr-bar" aria-hidden>
        {band ? <span className="thr-band" style={{ left: pct(value - band), width: `calc(${pct(value + band)} - ${pct(value - band)})` }} /> : null}
        <span className={`thr-fill bg-${t}`} style={{ width: pct(value) }} />
        {threshold !== undefined && <i className="thr-tick" style={{ left: pct(threshold) }} />}
      </span>
      <span className="thr-t num" aria-hidden><b className={`t-${t}`}>{value}{unit}</b>{band ? ` ± ${band}` : ''}{threshold !== undefined && <span className="thr-th"> · {thresholdLabel} {threshold}{unit}</span>}</span>
    </span>
  );
}
