/// <reference types="vite/client" />
import type { Lifecycle } from '@/data/gcc/lifecycle';
import type { DemoDone } from '@/domain/gcc/lifecycle';
import type { Applier } from './types';

/**
 * The demo appliers (plan 021), collected from `./*.apply.ts` in file-name
 * order: DG1, then Stage 2, Stage 3 and DG2, the order a tender moves in.
 * `domain/gcc/lifecycle.ts` runs every lifecycle through them when the tenant
 * has demo actions.
 */

const mods = import.meta.glob<{ applier: Applier }>('./*.apply.ts', { eager: true });

let list: Applier[] | null = null;

/**
 * Read on first use, not at module load: the appliers import the rule
 * modules, which import the lifecycle queries that import this file.
 */
export function appliers(): Applier[] {
  if (list) return list;
  const found = Object.keys(mods).sort().map((k) => mods[k].applier).filter(Boolean);
  if (import.meta.env?.DEV) {
    const ids = found.map((a) => a.id);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) throw new Error(`Demo applier "${dup}" is defined twice`);
  }
  list = found;
  return list;
}

/** One lifecycle with the demo actions applied, in order. Returns `l` itself when none of them touch it. */
export function applyDemo(tenant: string, l: Lifecycle, done: DemoDone): Lifecycle {
  return appliers().reduce((x, a) => a.apply(tenant, x, done), l);
}
