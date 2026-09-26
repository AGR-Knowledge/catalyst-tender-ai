import { TENANTS } from '@/data/tenants';
import { DEMO_TIME, DEMO_TODAY, whenText } from '@/domain/calendar';
import type { KpiCtx } from '../kpi/types';
import type { DashboardSpec } from './types';

/**
 * The portfolio dashboards (plan 015 Phase 7, dashboards.md §10.1–10.3): the
 * home of the Head of Tendering, the CEO and the Bid Manager. One layout;
 * only the tiles, the action sources and the table's scope differ.
 */

const subtitle = (ctx: KpiCtx) => {
  const t = TENANTS.find((x) => x.key === ctx.tenant);
  return `${ctx.viewer.name} · ${t?.name ?? ctx.tenant} · As of ${whenText(DEMO_TODAY, DEMO_TIME, t?.tzLabel)}`;
};

const COLUMNS = ['tid', 'tender', 'stage', 'owner', 'team', 'value', 'due', 'nextGate', 'health', 'source'];
const OPTIONAL = ['captured', 'country', 'sector', 'fit', 'win', 'lastActivity'];
const METRICS = ['stages.count', 'stages.value', 'stages.inPeriod', 'stages.atRisk', 'stages.avgDays'];

const base = {
  title: () => 'Dashboard',
  subtitle,
  flow: 'PF-5',
  graph: { axis: 'stages' as const },
  metrics: METRICS,
  defaultMetric: 'stages.count',
};

const table = {
  columns: COLUMNS,
  optional: OPTIONAL,
  defaultSort: 'newest' as const,
  filters: ['stage', 'status', 'sector', 'country', 'owner', 'health'] as DashboardSpec['table']['filters'],
  statusDefault: 'live' as const,
};

export const DASHBOARDS: DashboardSpec[] = [
  {
    key: 'portfolio.hot', ...base,
    tiles: ['PF-1', 'PF-2', 'PF-3', 'PF-4', 'SCR-6', 'CAP-1'],
    actions: ['dg3.approve', 'dg2.approve', 'booklet.approve', 'dg1.oversight', 'renewal.request', 'input.nudge'],
    table: { ...table, scope: () => ({ kind: 'all' }) },
  },
  {
    key: 'portfolio.exec', ...base,
    tiles: ['PF-1', 'PF-3', 'OUT-3', 'DEC-4', 'DEC-6', 'DEC-5'],
    // The CEO records a DG2 position; the Head of Tendering's items show as "Waiting on …", read only.
    actions: ['dg2.position', 'dg3.approve', 'dg2.approve', 'booklet.approve', 'dg1.oversight', 'renewal.request', 'input.nudge'],
    table: { ...table, scope: () => ({ kind: 'all' }) },
  },
  {
    key: 'portfolio.bid', ...base,
    tiles: ['SCR-1', 'PF-1', 'SCR-5', 'DEC-7', 'PF-6', 'PF-4'],
    actions: ['dg1.decide', 'pack.issue', 'pack.stale', 'submission.due', 'renewal.request', 'input.nudge'],
    table: { ...table, columns: [...COLUMNS, 'win'], optional: OPTIONAL.filter((c) => c !== 'win'), scope: (ctx) => ({ kind: 'assigned', personId: ctx.viewer.id }) },
  },
];
