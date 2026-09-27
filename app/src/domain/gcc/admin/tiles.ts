import type { Tone } from '@/data/types';
import type { Person } from '@/data/people';
import { can, holdersOf } from '@/data/access';
import { kpi, type KpiCtx, type KpiInfo } from '@/domain/gcc/kpi';
import { previousOf, windowOf } from '@/domain/gcc/period';
import { DEMO_NOW } from '@/domain/gcc/clock';
import type { TileVM } from '@/domain/gcc/viewmodels';

/**
 * The header strips of the Administration pages (ui-direction §5 F): a
 * registered KPI read exactly as the dashboards read it (INT-4), or a tile
 * over a value an admin module derives (GOV-5, gates without owners), for a
 * catalogue KPI the registry doesn't hold. Administration shows state, never a
 * period, and its tiles don't drill: the page below is the detail.
 */

export interface AdminBase { tenant: string; viewer: Person; viewAs: boolean; done: Record<string, string> }

const NOW_TEXT = 'Now: the period does not change this value';

export function adminCtx(base: AdminBase): KpiCtx {
  const window = windowOf('today', base.tenant);
  return { ...base, done: { ...base.done }, window, prev: previousOf(window), scope: { kind: 'all' }, now: DEMO_NOW, dashboard: 'admin' };
}

/** One registered state KPI, masked when the viewer lacks its capability. */
export function registryTile(id: string, base: AdminBase): TileVM | null {
  const def = kpi(id);
  if (!def) return null;
  const info = { label: def.label, ...def.info, period: NOW_TEXT };
  if (def.cap && !can(base.viewer, def.cap).ok) {
    return { id, label: def.label, display: 'Masked for your role', masked: { by: holdersOf(def.cap) }, info, drill: null };
  }
  const r = def.compute(adminCtx(base));
  return { id, label: r.label ?? def.label, display: r.display, sub: r.sub, tone: r.tone, info, drill: null };
}

/** A tile over a derived value. */
export function valueTile(id: string, label: string, display: string, info: KpiInfo, opts: { sub?: string; tone?: Tone } = {}): TileVM {
  return { id, label, display, sub: opts.sub, tone: opts.tone, info: { label, ...info, period: NOW_TEXT }, drill: null };
}
