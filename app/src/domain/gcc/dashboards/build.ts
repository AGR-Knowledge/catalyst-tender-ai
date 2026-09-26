/// <reference types="vite/client" />
import { can, holdersOf, type Capability } from '@/data/access';
import { firstWithRole, type Person } from '@/data/people';
import { GCC_STAGES, stageOf, stageShortLabel, stepLabel } from '@/data/gcc/stages';
import type { PeriodWindow } from '../period';
import { kpi } from '../kpi';
import { flow as flowDef } from '../flows';
import { actionSource, type ActionSource } from '../actions';
import { metric as metricDef } from '../metrics';
import type { KpiCtx, KpiKind } from '../kpi/types';
import type {
  ActionVM, ActionsZoneVM, DashboardVM, DataPort, DrillVM, FlowZoneVM, GraphPointVM, GraphVM, InfoVM, TableZoneVM, TileVM,
} from '../viewmodels';
import type { DashboardSpec } from './types';
import { homeDashboardKey, stageOfKey } from './home';

/**
 * Turns a dashboard spec (a list of registry ids) into the view model the
 * dashboard components render (dashboards.md §1–§7). It resolves every id,
 * masks what the viewer may not see, fills the ⓘ period, merges and orders the
 * action rows, reads table rows through the data port and builds the graph.
 * An id that isn't registered yet becomes a "Not defined yet" placeholder:
 * the build never crashes on it.
 */

const DEV = import.meta.env.DEV;

/** The placeholder text for an unregistered id. */
export const notDefinedText = (id: string) => (DEV ? `Not defined yet: ${id}` : 'Not available yet');

/** A registry function that throws is a bug in its plan; the dashboard still renders. */
function safe<T>(what: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    console.error(`${what} failed`, e);
    return fallback;
  }
}

/**
 * Whether the viewer gets a registry entry that names a capability. View as asks
 * about the viewed person's own rights, so the presenter sees what they would;
 * writing is refused where it happens (in-place action rows are disabled below).
 */
const holds = (ctx: KpiCtx, cap?: Capability) => !cap || can(ctx.viewer, cap).ok;

/** The ⓘ "Period" line. */
function periodText(kind: KpiKind, ctx: KpiCtx): string {
  return kind === 'flow' ? `${ctx.window.label} · ${ctx.window.rangeText}` : `Now · change since ${ctx.window.startText}`;
}

/* --------------------------------------------------------------------- context */

export interface CtxBase {
  tenant: string;
  viewer: Person;
  viewAs: boolean;
  window: PeriodWindow;
  prev: PeriodWindow;
  done: Record<string, string>;
  now: string;
}

/** The KPI context for a dashboard: the spec decides the scope (all, assigned, or one stage). */
export function dashboardCtx(spec: DashboardSpec, base: CtxBase): KpiCtx {
  const ctx: KpiCtx = { ...base, dashboard: spec.key, scope: { kind: 'all' } };
  return { ...ctx, scope: safe(`${spec.key} table scope`, () => spec.table.scope(ctx), ctx.scope) };
}

/* ----------------------------------------------------------------------- tiles */

function buildTile(id: string, ctx: KpiCtx): TileVM {
  const def = kpi(id);
  if (!def) {
    // The raw id ("PF-5") never reaches the screen: dev builds name it inside `notDefinedText`.
    const text = notDefinedText(id);
    return {
      id, label: text, display: text, drill: null, missing: true,
      info: { label: text, means: 'This KPI is not registered yet.', counted: 'Not counted yet.', period: '', source: 'None yet' },
    };
  }
  const baseLabel = ctx.window.key === 'today' && def.labelToday ? def.labelToday : def.label;
  const info = (label: string, smallSample?: boolean): InfoVM => ({
    label, ...def.info, period: periodText(def.kind, ctx), ...(smallSample ? { smallSample } : {}),
  });
  if (def.cap && !holds(ctx, def.cap)) {
    return { id, label: baseLabel, display: 'Masked for your role', masked: { by: holdersOf(def.cap) }, info: info(baseLabel), drill: null };
  }
  const r = safe(`KPI ${id}`, () => def.compute(ctx), { display: 'Not available', tone: 'muted' as const });
  const label = r.label ?? baseLabel;
  return {
    id, label, display: r.display, sub: r.sub, tone: r.tone, ownerTag: r.ownerTag, masked: r.masked, smallSample: r.smallSample,
    info: info(label, r.smallSample),
    drill: r.masked ? null : safe(`KPI ${id} drill`, () => def.drill?.(ctx) ?? null, null),
  };
}

/* ------------------------------------------------------------------------ flow */

function buildFlow(id: string, ctx: KpiCtx): FlowZoneVM {
  const def = flowDef(id);
  if (!def) {
    const text = notDefinedText(id);
    return { id, label: text, steps: [], missing: true, info: { label: text, means: 'This flow is not registered yet.', counted: 'Not counted yet.', period: '', source: 'None yet' } };
  }
  const vm = safe(`Flow ${id}`, () => def.compute(ctx), { steps: [] });
  return { id, label: def.label, steps: vm.steps, info: { label: def.label, ...def.info, period: periodText('flow', ctx) } };
}

/* --------------------------------------------------------------------- actions */

/**
 * The rows the viewer gets from these sources, merged and ordered. Exported for
 * the dev check. A source's `cap` is asked of the viewed person without View as
 * (a write capability such as `dg1.decide` would otherwise hide every row);
 * View as then keeps in-place rows visible but disabled.
 */
export function actionRows(sources: ActionSource[], ctx: KpiCtx): { rows: ActionVM[]; nextText?: string } {
  const rows = new Map<string, ActionVM>();
  let nextText: string | undefined;
  for (const src of sources) {
    if (!holds(ctx, src.cap)) continue;
    for (const row of safe(`Action source ${src.id}`, () => src.rows(ctx), [])) {
      if (rows.has(row.id)) continue;
      // View as is read only: in-place actions stay visible but can't be done.
      const readOnly = ctx.viewAs && row.primary.kind === 'inplace' && !row.disabledReason;
      rows.set(row.id, readOnly ? { ...row, disabledReason: `Viewing as ${ctx.viewer.name}. Read only` } : row);
    }
    nextText ??= safe(`Action source ${src.id} next`, () => src.next?.(ctx) ?? undefined, undefined);
  }
  const ordered = [...rows.values()].map((r, i) => ({ r, i })).sort((a, b) => a.r.urgency - b.r.urgency || a.i - b.i).map((x) => x.r);
  return { rows: ordered, nextText };
}

function buildActions(spec: DashboardSpec, ctx: KpiCtx, title: string): ActionsZoneVM {
  const sources = spec.actions.map((id) => ({ id, src: actionSource(id) }));
  const missing = sources.filter((s) => !s.src).map((s) => s.id);
  const found = sources.flatMap((s) => (s.src ? [s.src] : []));
  return { title, ...actionRows(found, ctx), missing };
}

/* ----------------------------------------------------------------------- graph */

const num = (v: number) => v.toLocaleString('en-GB', { maximumFractionDigits: 1 });

/** The graph for the chosen metric (or the spec's default). Null when the spec has no graph. */
export function buildGraph(spec: DashboardSpec, ctx: KpiCtx, metricId?: string): GraphVM | null {
  const g = spec.graph;
  if (!g) return null;
  const stageN = g.axis === 'steps' ? g.stage : null;
  const axis = g.axis === 'stages'
    ? GCC_STAGES.map((s) => ({ key: String(s.n), label: stageShortLabel(s.n) }))
    : (stageOf(g.stage)?.steps ?? []).map((s) => ({ key: s.key, label: s.label }));
  const markers = g.axis === 'stages'
    ? GCC_STAGES.filter((s) => s.gateAfter).map((s) => ({ after: String(s.n), label: s.gateAfter! }))
    : [];

  const defs = spec.metrics.map((id) => ({ id, def: metricDef(id) }));
  const offered = defs.filter((d) => d.def && holds(ctx, d.def.cap));
  const metrics = offered.map((d) => ({ id: d.id, label: d.def!.label }));
  const chosen = offered.find((d) => d.id === metricId) ?? offered.find((d) => d.id === spec.defaultMetric) ?? offered[0];
  const axisWord = g.axis === 'stages' ? 'stage' : 'step';

  if (!chosen?.def) {
    const id = metricId ?? spec.defaultMetric;
    return {
      metric: id, metricLabel: notDefinedText(id), kind: 'state', axis: g.axis, metrics, markers, compareLabel: null, empty: true, missing: true,
      points: axis.map((a) => ({ key: a.key, label: a.label, value: null, compare: null, display: 'No data', drill: null, hint: '' })),
      summary: `${notDefinedText(id)}. No values by ${axisWord} yet.`,
    };
  }

  const def = chosen.def;
  const keys = axis.map((a) => a.key);
  const res = safe(`Metric ${def.id}`, () => def.compute(ctx, keys), { values: keys.map(() => null) });
  const hasCompare = Array.isArray(res.compare);
  const points: GraphPointVM[] = axis.map((a, i) => {
    const value = res.values[i] ?? null;
    const compare = hasCompare ? res.compare![i] ?? null : null;
    const drill: DrillVM | null = res.drills?.[i] !== undefined ? res.drills[i] : defaultPointDrill(g.axis, a, ctx, stageN);
    return {
      key: a.key, label: a.label, value, compare,
      display: res.displays?.[i] ?? (value === null ? 'No data' : num(value)),
      compareDisplay: hasCompare ? res.compareDisplays?.[i] ?? (compare === null ? 'No data' : num(compare)) : undefined,
      count: res.counts?.[i],
      drill,
      hint: !drill ? '' : drill.kind === 'route' ? `Click to open ${stageOf(Number(a.key))?.short ?? a.label}` : 'Click to see these tenders',
    };
  });
  return {
    metric: def.id, metricLabel: def.label, kind: def.kind, axis: g.axis, points, markers, metrics,
    compareLabel: !hasCompare ? null
      : def.kind === 'state' ? `At the start of the window (${ctx.window.startText})` : `${ctx.prev.label} (${ctx.prev.rangeText})`,
    summary: `${def.label} by ${axisWord}: ${points.map((p) => `${p.label} ${p.display}`).join(', ')}`,
    empty: points.every((p) => !p.value),
  };
}

/** Portfolio: open the stage's dashboard when the viewer may, else filter the table. Stage dashboards filter by step. */
function defaultPointDrill(axis: 'stages' | 'steps', a: { key: string; label: string }, ctx: KpiCtx, stage: number | null): DrillVM {
  if (axis === 'stages') {
    const n = Number(a.key);
    if (can(ctx.viewer, 'stage.view', { stage: n }).ok) return { kind: 'route', to: `/stages/${n}?period=${ctx.window.key}` };
    return { kind: 'table', label: `From graph: ${a.label} · ${ctx.window.label}`, stages: [n] };
  }
  return { kind: 'table', label: `From graph: ${stepLabel(stage ?? 0, a.key)} · ${ctx.window.label}`, stages: stage ? [stage] : undefined, steps: [a.key] };
}

/* ------------------------------------------------------------------ dashboard */

/** "Joseph Mathew's dashboard (Procurement Lead). Actions follow your own rights." */
function ownerNote(stage: number, tenant: string): string {
  const def = stageOf(stage);
  if (!def) return 'Actions follow your own rights.';
  if (def.ownerRole === 'member') return "The Bid Committee's dashboard. Actions follow your own rights.";
  const owner = firstWithRole(tenant, def.ownerRole);
  return owner
    ? `${owner.name}'s dashboard (${owner.title}). Actions follow your own rights.`
    : `The ${def.ownerLabel}'s dashboard. Actions follow your own rights.`;
}

export function buildDashboard(spec: DashboardSpec, ctx: KpiCtx, port: DataPort | null, opts: { metric?: string } = {}): DashboardVM {
  const stage = stageOfKey(spec.key);
  const stageDef = stage ? stageOf(stage) : undefined;
  const isHome = homeDashboardKey(ctx.viewer) === spec.key;
  const isOwner = !!stageDef && ctx.viewer.role === stageDef.ownerRole;
  const title = safe(`${spec.key} title`, () => spec.title(ctx), spec.key);
  const subtitle = safe(`${spec.key} subtitle`, () => spec.subtitle(ctx), '');

  const tiles = spec.tiles.map((id) => buildTile(id, ctx));
  const flow = spec.flow ? buildFlow(spec.flow, ctx) : null;
  const actions = buildActions(spec, ctx, stageDef && !isHome && !isOwner ? `Waiting in ${stageDef.short}` : 'Needs your action');

  const kind = spec.table.kind ?? 'tenders';
  const table: TableZoneVM = {
    kind,
    rows: kind === 'requests'
      ? safe(`${spec.key} request rows`, () => spec.table.rows?.(ctx) ?? [], [])
      : port ? safe(`${spec.key} rows`, () => port.rows(ctx.tenant, ctx.scope, ctx.viewer, 'all'), []) : null,
    columns: spec.table.columns,
    optional: spec.table.optional ?? [],
    defaultSort: spec.table.defaultSort,
    filters: spec.table.filters,
    statusDefault: spec.table.statusDefault ?? 'live',
  };

  const graph = buildGraph(spec, ctx, opts.metric);

  const missing = [
    ...tiles.filter((t) => t.missing).map((t) => t.id),
    ...(flow?.missing ? [flow.id] : []),
    ...actions.missing,
    ...spec.metrics.filter((id) => !metricDef(id)),
  ];

  return {
    key: spec.key, title, subtitle, isHome,
    crumbs: isHome ? [] : [{ label: 'Dashboard', to: `/?period=${ctx.window.key}` }, { label: title }],
    viewerNote: stage && !isHome && !isOwner ? ownerNote(stage, ctx.tenant) : undefined,
    tiles, flow, actions, table, graph,
    trackerFor: (id) => (port ? safe(`Tracker ${id}`, () => port.tracker(ctx.tenant, id, ctx.viewer), null) : null),
    missing,
  };
}
