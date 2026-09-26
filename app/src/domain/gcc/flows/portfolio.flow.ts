import { can } from '@/data/access';
import type { GateDecision, GateKind } from '@/data/gcc/lifecycle';
import { queriesFor } from '../lifecycle';
import { inScope } from '../actions/portfolio.actions';
import type { KpiCtx } from '../kpi/types';
import type { DrillVM, FlowPartVM, FlowStepVM } from '../viewmodels';
import type { FlowDef } from './types';

/**
 * PF-5, the decision funnel (plan 015 Phase 3, dashboards.md §1 Z3 and §11.1):
 * what was captured, decided at each gate, submitted and won or lost in the
 * period, over the dashboard's scope. The counts are decisions in the window,
 * whichever tenders they were on, so the steps need not add up. Every number
 * opens the table on exactly those tenders, closed ones included. The Bid
 * Manager's funnel starts at DG1: notices aren't assigned to anyone yet.
 */

const uniq = (ids: string[]) => [...new Set(ids)];

function part(ctx: KpiCtx, step: string, key: string, label: string, ids: string[]): FlowPartVM {
  const drill: DrillVM | null = ids.length
    ? { kind: 'table', label: `From funnel: ${step} ${label} · ${ctx.window.label}`, ids: uniq(ids), status: 'all' }
    : null;
  return { key, count: ids.length, label, drill };
}

const DECISION_FUNNEL: FlowDef = {
  id: 'PF-5',
  label: 'Decision funnel',
  info: {
    means: 'Decisions made in this period at each gate, whichever tenders they were on. It is not one group of tenders followed through, so the steps need not add up.',
    counted: 'Notices captured from every source; DG1, DG2 and DG3 decisions recorded; bids submitted; and results received, all in the period.',
    target: 'None (information)',
    source: 'Intake volumes and tender lifecycles',
  },
  compute(ctx) {
    const q = queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done });
    const gates = q.gateEventsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const at = (gate: GateKind, decision: GateDecision) => gates.filter((x) => x.g.gate === gate && x.g.decision === decision).map((x) => x.l.tenderId);
    const steps: FlowStepVM[] = [];

    if (ctx.scope.kind !== 'assigned') {
      const captured = q.capturesIn(ctx.window).captured;
      const radar = can(ctx.viewer, 'radar.view').ok;
      steps.push({
        key: 'captured', label: 'Captured',
        parts: [{ key: 'notices', count: captured, label: captured === 1 ? 'notice' : 'notices', drill: radar ? { kind: 'route', to: '/radar', label: 'Open the tender radar' } : null }],
      });
    }
    steps.push(
      { key: 'dg1', label: 'DG1', parts: [part(ctx, 'DG1', 'pursue', 'pursued', at('DG1', 'pursue')), part(ctx, 'DG1', 'discard', 'discarded', at('DG1', 'discard')), part(ctx, 'DG1', 'hold', 'held', at('DG1', 'hold'))] },
      { key: 'dg2', label: 'DG2', parts: [part(ctx, 'DG2', 'bid', 'bid', at('DG2', 'bid')), part(ctx, 'DG2', 'no-bid', 'no-bid', at('DG2', 'no-bid'))] },
      { key: 'dg3', label: 'DG3', parts: [part(ctx, 'DG3', 'approved', 'approved', at('DG3', 'approved')), part(ctx, 'DG3', 'rejected', 'rejected', at('DG3', 'rejected'))] },
    );
    const subs = q.submissionsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope)).map((x) => x.l.tenderId);
    steps.push({ key: 'submitted', label: 'Submitted', parts: [part(ctx, 'Submitted', 'submitted', subs.length === 1 ? 'bid' : 'bids', subs)] });
    const res = q.resultsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const by = (r: 'won' | 'lost') => res.filter((x) => x.r.result === r).map((x) => x.l.tenderId);
    steps.push({ key: 'results', label: 'Results', parts: [part(ctx, 'Results', 'won', 'won', by('won')), part(ctx, 'Results', 'lost', 'lost', by('lost'))] });
    return { steps };
  },
};

export const FLOWS: FlowDef[] = [DECISION_FUNNEL];
