import { requestsFor } from '../requests';
import type { DashboardSpec } from './types';

/**
 * My requests (plan 013 Phase 5.6, dashboards.md §10.13): the home of Finance
 * and HR, in the shared layout with four tiles and no graph. The sub-line is
 * the default one: person · company · As of.
 */
export const DASHBOARDS: DashboardSpec[] = [
  {
    key: 'requests',
    title: () => 'My requests',
    subtitle: () => '',
    tiles: ['REQ-1', 'REQ-2', 'REQ-3', 'REQ-4'],
    flow: 'flow.requests',
    actions: ['request.open'],
    table: {
      kind: 'requests',
      scope: () => ({ kind: 'all' }),
      rows: (ctx) => requestsFor(ctx.tenant, ctx.viewer.id, ctx.done, ctx.viewer, ctx.now),
      columns: ['req.tender', 'req.what', 'req.section', 'req.by', 'req.due', 'req.status'],
      defaultSort: 'due',
      filters: [],
    },
    graph: null,
    metrics: [],
    defaultMetric: '',
  },
];
