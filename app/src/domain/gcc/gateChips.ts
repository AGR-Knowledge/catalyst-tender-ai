import { useEffect, useMemo, useState } from 'react';
import { useDemo } from '@/state/store';
import type { GateKey } from './viewmodels';

/**
 * The sidebar's gate chips (dashboards.md §8.3): outline normally, orange when
 * something at the gate waits on the viewer, red when its SLA is breached.
 * Derived, never typed.
 */
export type GateChipState = 'open' | 'waiting-on-me' | 'breached' | 'decided';

type Rules = typeof import('./actions/portfolio.actions');

/**
 * The rules live with the portfolio's action sources (plan 015 Phase 6), so a
 * chip and a "Needs your action" row never disagree. They read the GCC
 * lifecycles, which only GCC tenants load: the sidebar fetches them on first
 * use rather than pulling them into the main bundle, and shows outline chips
 * until they arrive.
 */
let rules: Rules | null = null;
let loading: Promise<Rules> | null = null;
const loadRules = () => (loading ??= import('./actions/portfolio.actions').then((m) => (rules = m)));

/** The chip state for the current viewer: breached, waiting on them, or outline. */
export function useGateChipState(gate: GateKey): GateChipState {
  const { state } = useDemo();
  const [loaded, setLoaded] = useState<Rules | null>(rules);
  useEffect(() => {
    if (loaded) return;
    let live = true;
    void loadRules().then((m) => { if (live) setLoaded(m); });
    return () => { live = false; };
  }, [loaded]);
  const { tenant, person, done } = state;
  return useMemo(() => {
    if (!loaded) return 'open';
    try {
      return loaded.gateChipState(gate, loaded.chipCtx(tenant, person, done));
    } catch (e) {
      console.error(`Gate chip ${gate} failed`, e);
      return 'open';
    }
  }, [loaded, gate, tenant, person, done]);
}
