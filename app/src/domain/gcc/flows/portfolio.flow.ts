import { can } from '@/data/access';
import type { GateDecision, GateKind } from '@/data/gcc/lifecycle';
import { queriesFor } from '../lifecycle';
import { inScope } from '../actions/portfolio.actions';
import type { KpiCtx } from '../kpi/types';
import type { DrillVM, FlowPartVM, FlowStepVM } from '../viewmodels';
import type { FlowDef } from './types';
import { GATE_SUB, splitNote } from './notes';

/**
 * PF-5, the decision funnel (plan 015 Phase 3, dashboards.md §1 Z3 and §11.1):
 * what was captured, decided at each gate, submitted and won or lost in the
 * period, over the dashboard's scope. The counts are decisions in the window,
 * whichever tenders they were on, so the steps need not add up. Every number
 * opens the table on exactly those tenders, closed ones included. The Bid
 * Manager's funnel starts at DG1: notices aren't assigned to anyone yet.
 *
 * Every column has the same rows (plan 027d): what it is, the part that went
 * on, a bar split by outcome, the other parts, and the rate as a note. Each
 * part says whether it went on, stopped or is still waiting.
 */

const uniq = (ids: string[]) => [...new Set(ids)];

function part(ctx: KpiCtx, step: string, key: string, label: string, ids: string[], outcome: FlowPartVM['outcome']): FlowPartVM {
  const drill: DrillVM | null = ids.length
    ? { kind: 'table', label: `From funnel: ${step} ${label} · ${ctx.window.label}`, ids: uniq(ids), status: 'all' }
    : null;
  return { key, count: ids.length, label, drill, outcome };
}

/** A column: its parts, and the rate of the first part over all of them. */
const column = (key: string, label: string, sub: string, noun: string, parts: FlowPartVM[]): FlowStepVM => ({ key, label, sub, parts, note: splitNote(parts, noun) });

const DECISION_FUNNEL: FlowDef = {
  id: 'PF-5',
  label: 'Decision funnel',
  info: {
    means: 'Decisions made in this period at each gate, whichever tenders they were on. It is not one group of tenders followed through, so the steps need not add up.',
    counted: 'Notices captured from every source (new ones, and duplicates or addenda linked to a tender already on the register); DG1, DG2 and DG3 decisions recorded; bids submitted, on time or late; and results received, all in the period. Each column’s bar splits its own outcomes: green went on, grey stopped, orange still waiting.',
    target: 'None (information)',
    source: 'Intake volumes and tender lifecycles',
  },
  compute(ctx) {
    const q = queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done });
    const gates = q.gateEventsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const at = (gate: GateKind, decision: GateDecision) => gates.filter((x) => x.g.gate === gate && x.g.decision === decision).map((x) => x.l.tenderId);
    const steps: FlowStepVM[] = [];

    if (ctx.scope.kind !== 'assigned') {
      // New notices went on to the register; duplicates and addenda were linked to a tender already on it.
      const c = q.capturesIn(ctx.window);
      const radar = can(ctx.viewer, 'radar.view').ok;
      steps.push(column('captured', 'Captured', 'New notices', 'received', [
        { key: 'notices', count: c.captured, label: 'new', outcome: 'on', drill: radar ? { kind: 'route', to: '/radar', label: 'Open the tender radar' } : null },
        { key: 'linked', count: c.linked, label: 'linked', outcome: 'stopped', drill: null },
      ]));
    }
    steps.push(
      column('dg1', 'DG1', GATE_SUB.DG1, 'decided', [
        part(ctx, 'DG1', 'pursue', 'pursued', at('DG1', 'pursue'), 'on'),
        part(ctx, 'DG1', 'discard', 'discarded', at('DG1', 'discard'), 'stopped'),
        part(ctx, 'DG1', 'hold', 'held', at('DG1', 'hold'), 'held'),
      ]),
      column('dg2', 'DG2', GATE_SUB.DG2, 'decided', [
        part(ctx, 'DG2', 'bid', 'bid', at('DG2', 'bid'), 'on'),
        part(ctx, 'DG2', 'no-bid', 'no-bid', at('DG2', 'no-bid'), 'stopped'),
      ]),
      column('dg3', 'DG3', GATE_SUB.DG3, 'decided', [
        part(ctx, 'DG3', 'approved', 'approved', at('DG3', 'approved'), 'on'),
        part(ctx, 'DG3', 'rejected', 'rejected', at('DG3', 'rejected'), 'stopped'),
      ]),
    );
    const subs = q.submissionsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const sent = (onTime: boolean) => subs.filter((x) => x.s.onTime === onTime).map((x) => x.l.tenderId);
    steps.push(column('submitted', 'Submitted', 'Bids sent', 'submitted', [
      part(ctx, 'Submitted', 'on-time', 'on time', sent(true), 'on'),
      part(ctx, 'Submitted', 'late', 'late', sent(false), 'stopped'),
    ]));
    const res = q.resultsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const by = (r: 'won' | 'lost') => res.filter((x) => x.r.result === r).map((x) => x.l.tenderId);
    steps.push(column('results', 'Results', 'Won or lost', 'results', [
      part(ctx, 'Results', 'won', 'won', by('won'), 'on'),
      part(ctx, 'Results', 'lost', 'lost', by('lost'), 'stopped'),
    ]));
    return { steps };
  },
};

export const FLOWS: FlowDef[] = [DECISION_FUNNEL];
