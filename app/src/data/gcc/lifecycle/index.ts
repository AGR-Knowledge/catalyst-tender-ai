import type { GccTenantKey } from '../index';
import type { TenantSeed } from '../types';
import { NAJD } from '../tenants/najd';
import { CORNICHE } from '../tenants/corniche';
import { DAFNA } from '../tenants/dafna';
import { BATINAH } from '../tenants/batinah';
import { QURAIN } from '../tenants/qurain';
import { CLAIMED_NAJD, LIVE_NAJD } from './live/najd';
import { CLAIMED_CORNICHE, LIVE_CORNICHE } from './live/corniche';
import { CLAIMED_DAFNA, LIVE_DAFNA } from './live/dafna';
import { CLAIMED_BATINAH, LIVE_BATINAH } from './live/batinah';
import { CLAIMED_QURAIN, LIVE_QURAIN } from './live/qurain';
import { cmp } from './chain';
import { ccOf } from './live/common';
import { foldHistory } from './fold';
import { generateHistory } from './generate';
import { intakeDaily } from './intake';
import { FLOW_TARGETS, RESULT_SPLITS } from './targets';
import type { IntakeDay, Lifecycle } from './types';

/**
 * Every GCC tender's lifecycle, per tenant (plan 017): the hand-authored rows
 * (story and live), plan 004's history folded in, and the generated history
 * that makes the flow targets land. Built once, at module load, and
 * deterministic. Screens read it through `domain/gcc/lifecycle.ts`.
 */

export type * from './types';

/** The tenant files as authored, with plan 004's history records as input. */
export const LIFECYCLE_SEEDS: Record<GccTenantKey, TenantSeed> = { najd: NAJD, corniche: CORNICHE, dafna: DAFNA, batinah: BATINAH, qurain: QURAIN };

const FIXED: Record<GccTenantKey, { live: Lifecycle[]; claimed: string[] }> = {
  najd: { live: LIVE_NAJD, claimed: CLAIMED_NAJD },
  corniche: { live: LIVE_CORNICHE, claimed: CLAIMED_CORNICHE },
  dafna: { live: LIVE_DAFNA, claimed: CLAIMED_DAFNA },
  batinah: { live: LIVE_BATINAH, claimed: CLAIMED_BATINAH },
  qurain: { live: LIVE_QURAIN, claimed: CLAIMED_QURAIN },
};

export const GCC_KEYS = Object.keys(FIXED) as GccTenantKey[];

export interface TenantLifecycles {
  lifecycles: Lifecycle[];
  intake: IntakeDay[];
  /** How many tenders the generator made, and what it moved or marked. */
  generated: number;
  notes: string[];
}

/** Folds and generates one tenant's history. Pure: the dev check calls it again to prove it is deterministic. */
export function buildLifecycles(tenant: GccTenantKey): TenantLifecycles {
  const seed = LIFECYCLE_SEEDS[tenant];
  const cc = ccOf(tenant);
  const fixed = FIXED[tenant].live;
  const drafts = foldHistory({ tenant, cc, seed, fixedIds: new Set(fixed.map((l) => l.tenderId)), claimed: new Set(FIXED[tenant].claimed) });
  const g = generateHistory({
    tenant, seed, fixed, drafts, targets: FLOW_TARGETS[tenant],
    ...(tenant === 'najd' ? { againstMajority12m: RESULT_SPLITS.dg2.againstMajority, submissionsFixed: true } : {}),
  });
  const lifecycles = [...fixed, ...g.lifecycles].sort((a, b) => cmp(a.capturedAt, b.capturedAt) || cmp(a.tenderId, b.tenderId));
  const ids = new Set<string>();
  for (const l of lifecycles) {
    if (ids.has(l.tenderId)) throw new Error(`Lifecycle ${tenant}: two lifecycles for ${l.tenderId}`);
    ids.add(l.tenderId);
  }
  return { lifecycles, intake: intakeDaily(tenant, cc, seed, lifecycles), generated: g.generated, notes: g.notes };
}

const started = performance.now();
const BUILT = Object.fromEntries(GCC_KEYS.map((k) => [k, buildLifecycles(k)])) as Record<GccTenantKey, TenantLifecycles>;

/** Milliseconds the fold, the generator and the intake volumes took at load. */
export const LIFECYCLE_LOAD_MS = performance.now() - started;

export const LIFECYCLES = Object.fromEntries(GCC_KEYS.map((k) => [k, BUILT[k].lifecycles])) as Record<GccTenantKey, Lifecycle[]>;

/** Capture volumes for the 365 days before today; today's are plan 004's `intakeToday` events. */
export const INTAKE_DAILY = Object.fromEntries(GCC_KEYS.map((k) => [k, BUILT[k].intake])) as Record<GccTenantKey, IntakeDay[]>;

export const GENERATION = Object.fromEntries(GCC_KEYS.map((k) => [k, { generated: BUILT[k].generated, notes: BUILT[k].notes }])) as
  Record<GccTenantKey, { generated: number; notes: string[] }>;

if (import.meta.env?.DEV) {
  const n = GCC_KEYS.reduce((s, k) => s + LIFECYCLES[k].length, 0);
  console.info(`[lifecycle] ${n} GCC lifecycles built in ${LIFECYCLE_LOAD_MS.toFixed(1)} ms`);
}

/**
 * The hook for demo actions. Gates recorded during the demo (DG1 Pursue on
 * the hero, a DG2 approval …) are `mark()` keys in the store's `done` map.
 * Plans 007–018 apply them here, on top of the seeded lifecycle, so every
 * query reads one merged lifecycle and a reset returns the seed. For now it
 * returns `l` unchanged.
 */
export function withDemoState(l: Lifecycle, _done: Readonly<Record<string, string>>): Lifecycle {
  return l;
}
