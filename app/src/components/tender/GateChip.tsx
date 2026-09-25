import type { GateKey } from '@/domain/gcc/viewmodels';
import type { GateChipState } from '@/domain/gcc/gateChips';
import './tender.css';

const STATE_TEXT: Record<GateChipState, string> = {
  open: 'open', 'waiting-on-me': 'waiting on you', breached: 'time limit passed', decided: 'decided',
};

/** Glyphs so the state never rests on colour alone. */
const GLYPH: Partial<Record<GateChipState, string>> = { 'waiting-on-me': '•', breached: '!', decided: '✓' };

/** A DG1 / DG2 / DG3 marker: outline when open, orange when waiting on the viewer, red when breached. */
export function GateChip({ gate, state = 'open' }: { gate: GateKey; state?: GateChipState }) {
  return (
    <span className={`gate-chip s-${state}`} title={`${gate}: ${STATE_TEXT[state]}`}>
      {gate}
      {GLYPH[state] && <span className="gl" aria-hidden>{GLYPH[state]}</span>}
      <span className="sr-only">, {STATE_TEXT[state]}</span>
    </span>
  );
}
