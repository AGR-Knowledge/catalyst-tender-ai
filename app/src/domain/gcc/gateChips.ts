import type { GateKey } from './viewmodels';

/**
 * The sidebar's gate chips (dashboards.md §8.3): outline normally, orange when
 * something at the gate waits on the viewer, red when its SLA is breached.
 * Derived, never typed.
 */
export type GateChipState = 'open' | 'waiting-on-me' | 'breached' | 'decided';

/**
 * The chip state for the current viewer. Plan 015 fills this in from the same
 * queries as its action sources; until then every chip is outline.
 */
export function useGateChipState(gate: GateKey): GateChipState {
  void gate;
  return 'open';
}
