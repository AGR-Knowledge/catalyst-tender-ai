import type { Tone } from '@/data/types';
import type { Person } from '@/data/people';
import { can, holdersOf } from '@/data/access';
import { kpi, type KpiCtx, type KpiInfo, type KpiKind } from '@/domain/gcc/kpi';
import { previousOf, windowOf, type PeriodKey } from '@/domain/gcc/period';
import { DEMO_NOW } from '@/domain/gcc/clock';
import type { DrillVM, TileVM } from '@/domain/gcc/viewmodels';

/**
 * The header strip of a Stage 1 screen (catalogue §D): tiles from the KPI
 * registry, read exactly as the dashboards read them (plan 006's `buildTile`),
 * and, where the registry has no KPI yet, a tile over a value 007a already
 * derives. No figure is worked out here.
 */

export interface StripBase { tenant: string; viewer: Person; viewAs: boolean; done: Record<string, string> }

export function kpiCtxOf(base: StripBase, period: PeriodKey, dashboard: string): KpiCtx {
  const window = windowOf(period, base.tenant);
  return { ...base, done: { ...base.done }, window, prev: previousOf(window), scope: { kind: 'all' }, now: DEMO_NOW, dashboard };
}

const periodText = (kind: KpiKind, ctx: KpiCtx) =>
  (kind === 'flow' ? `${ctx.window.label} · ${ctx.window.rangeText}` : 'Now: the period does not change this value');

/** A route drill that would reopen this screen adds nothing. Table drills belong to dashboards. */
const drillOn = (d: DrillVM | null | undefined, here: string): DrillVM | null =>
  (d && d.kind === 'route' && d.to.split('?')[0] !== here ? d : null);

/** One registered KPI, masked when the viewer lacks its capability. */
export function registryTile(id: string, ctx: KpiCtx, here: string): TileVM | null {
  const def = kpi(id);
  if (!def) return null;
  const label = ctx.window.key === 'today' && def.labelToday ? def.labelToday : def.label;
  const info = { label, ...def.info, period: periodText(def.kind, ctx) };
  if (def.cap && !can(ctx.viewer, def.cap).ok) {
    return { id, label, display: 'Masked for your role', masked: { by: holdersOf(def.cap) }, info, drill: null };
  }
  let r;
  try { r = def.compute(ctx); } catch (e) { console.error(`KPI ${id} failed`, e); r = { display: 'Not available', tone: 'muted' as const }; }
  let drill: DrillVM | null = null;
  try { drill = r.masked ? null : drillOn(def.drill?.(ctx), here); } catch { drill = null; }
  return { id, label: r.label ?? label, display: r.display, sub: r.sub, tone: r.tone, ownerTag: r.ownerTag, masked: r.masked, info: { ...info, label: r.label ?? label }, drill };
}

/** A tile over a value a rule module derives, for a catalogue KPI the registry does not hold yet. */
export function valueTile(id: string, label: string, display: string, info: KpiInfo & { kind: KpiKind }, ctx: KpiCtx, opts: { sub?: string; tone?: Tone; drill?: DrillVM | null } = {}): TileVM {
  const { kind, ...rest } = info;
  return { id, label, display, sub: opts.sub, tone: opts.tone, info: { label, ...rest, period: periodText(kind, ctx) }, drill: opts.drill ?? null };
}

/** Registry tiles first where registered; the ids the registry lacks are left out (the report lists them). */
export const tilesOf = (ids: string[], ctx: KpiCtx, here: string): TileVM[] => ids.flatMap((id) => { const t = registryTile(id, ctx, here); return t ? [t] : []; });
