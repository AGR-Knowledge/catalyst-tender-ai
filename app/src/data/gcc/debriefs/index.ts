import type { GccTenantKey } from '@/data/gcc';
import { GCC_KEYS, LIFECYCLES } from '@/data/gcc/lifecycle';
import type { DebriefRecord } from '@/domain/gcc/debriefs/types';
import { generateDebriefs } from './generate';

/**
 * The debriefs' seed (plan 035): one record per ended bid in each tenant,
 * built once at load from the seed lifecycles. The domain
 * (`domain/gcc/debriefs`) merges the demo's `debrief…` keys over it; screens
 * read it only through there.
 */

export { EXAMPLES, exampleFor } from './examples';
export { FEATURED } from './featured';
export { RIVALS, rivalName, type Rival } from './rivals';
export { STOP_NOTES, isKnownStop, stopOf } from './stops';
export { generateDebriefs } from './generate';

export const DEBRIEF_SEED = Object.fromEntries(GCC_KEYS.map((k) => [k, generateDebriefs(k, LIFECYCLES[k])])) as Record<GccTenantKey, DebriefRecord[]>;

const BY_ID = Object.fromEntries(GCC_KEYS.map((k) => [k, new Map(DEBRIEF_SEED[k].map((d) => [d.tenderId, d]))])) as Record<GccTenantKey, Map<string, DebriefRecord>>;

/** One tender's seed debrief, if it ended in the seed. */
export const seedDebrief = (tenant: string, tenderId: string): DebriefRecord | undefined =>
  (BY_ID as Record<string, Map<string, DebriefRecord> | undefined>)[tenant]?.get(tenderId);
