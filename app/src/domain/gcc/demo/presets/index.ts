/// <reference types="vite/client" />
import type { GccTenantKey } from '@/data/gcc';
import type { Preset, PresetResult } from './types';

export { isPlan, type AuditDraft, type Preset, type PresetPlan, type PresetResult, type Write } from './types';

/**
 * The scenario presets (plan 014), collected from `./*.preset.ts`, in menu
 * order. Each builds from the seed, so its result depends only on the tenant
 * and is kept once built.
 */

const mods = import.meta.glob<{ preset: Preset }>('./*.preset.ts', { eager: true });

let list: Preset[] | null = null;

export function presets(): Preset[] {
  if (list) return list;
  const found = Object.values(mods).map((m) => m.preset).filter(Boolean).sort((a, b) => a.order - b.order);
  if (import.meta.env?.DEV) {
    const ids = found.map((p) => p.id);
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup) throw new Error(`Preset "${dup}" is defined twice`);
  }
  list = found;
  return list;
}

const built = new Map<string, PresetResult>();

/** A preset built for a tenant from the seed. A writer's refusal makes it unavailable, with the refusal as the reason. */
export function presetFor(p: Preset, tenant: GccTenantKey): PresetResult {
  const key = `${p.id}:${tenant}`;
  const hit = built.get(key);
  if (hit) return hit;
  let r: PresetResult;
  try {
    r = p.build(tenant, {});
  } catch (e) {
    r = { unavailable: `This preset could not be built here: ${(e as Error).message}` };
  }
  built.set(key, r);
  return r;
}
