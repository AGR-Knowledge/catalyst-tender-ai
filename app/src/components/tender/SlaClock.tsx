import { Clock } from 'lucide-react';
import { slaState } from '@/domain/gcc/clock';
import './tender.css';

/**
 * Time left against an SLA, on the demo clock (ui-direction §6.2): green above
 * half, orange at a quarter or less, red once breached. Always in words:
 * "9 h 40 m left of 24 h", "Late by 3 h".
 */
export function SlaClock({ start, end, now }: { start: string; end: string; now?: string }) {
  const s = slaState(start, end, now);
  return (
    <span className={`sla t-${s.tone}`} role="timer" aria-live="off">
      <Clock size={12} strokeWidth={1.8} aria-hidden />
      <span className="num">{s.text}</span>
    </span>
  );
}
