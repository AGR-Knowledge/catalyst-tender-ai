import { can } from '@/data/access';
import type { GateDecision, GateKind } from '@/data/gcc/lifecycle';
import { queriesFor } from '../lifecycle';
import { inScope } from '../actions/portfolio.actions';
import type { KpiCtx } from '../kpi/types';
import type { DrillVM, FlowPartVM, FlowStepVM } from '../viewmodels';
import type { FlowDef } from './types';

/**
 * PF-5, the decision funnel (plan 015 Phase 3, dashboards.md §1 Z3 and §11.1;
 * plan 039). It reads left to right as one batch narrowing: what came in,
 * what passed the AI screening, what each gate decided, and what was won. Each
 * column counts what happened in the period, over the dashboard's scope; the
 * targets are set so each gate decides about what the one before approved.
 * Every number on a gate column opens the table on exactly those tenders,
 * closed ones included. Captured and AI screening are intake volumes without
 * tender rows. The Bid Manager's funnel starts at DG1: notices aren't
 * assigned to anyone yet.
 *
 * Every column has the same rows (plan 027d): what it is, the headline, a bar
 * split by outcome (approved, rejected, pending, and previous for re-issued
 * notices), the other parts, and a note in counts.
 */

const uniq = (ids: string[]) => [...new Set(ids)];
const n = (v: number) => v.toLocaleString('en-GB');

function part(ctx: KpiCtx, step: string, key: string, label: string, ids: string[], outcome?: FlowPartVM['outcome']): FlowPartVM {
  const drill: DrillVM | null = ids.length
    ? { kind: 'table', label: `From funnel: ${step} ${label} · ${ctx.window.label}`, ids: uniq(ids), status: 'all' }
    : null;
  return { key, count: ids.length, label, drill, ...(outcome ? { outcome } : {}) };
}

/** "8 approved of 12 decided": the note under every column, in counts. */
const ofNote = (count: number, what: string, total: number, noun: string) => (total ? `${n(count)} ${what} of ${n(total)} ${noun}` : 'None in this period');

const DECISION_FUNNEL: FlowDef = {
  id: 'PF-5',
  label: 'Decision funnel',
  info: {
    means: 'How the tenders of this period narrow, step by step, from what came in to what was won. Read it left to right.',
    counted: 'Captured: new notices, and previous ones (re-issued tenders seen before). AI screening: the notices that passed. DG1, DG2 and DG3: the decisions at each gate. Won: the results against the bids submitted. Green is approved, grey rejected, orange pending, pale blue previous.',
    target: 'None (information)',
    source: 'Intake volumes and tender lifecycles',
  },
  compute(ctx) {
    const q = queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done });
    const gates = q.gateEventsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const at = (gate: GateKind, decision?: GateDecision) => gates.filter((x) => x.g.gate === gate && (!decision || x.g.decision === decision)).map((x) => x.l.tenderId);
    const steps: FlowStepVM[] = [];

    if (ctx.scope.kind !== 'assigned') {
      const c = q.capturesIn(ctx.window);
      const radar: DrillVM | null = can(ctx.viewer, 'radar.view').ok ? { kind: 'route', to: '/radar', label: 'Open the tender radar' } : null;
      const total = c.captured + c.linked;
      steps.push({
        key: 'captured', label: 'Captured', sub: 'Total in', note: ofNote(c.linked, 're-issued', total, 'in'),
        parts: [
          { key: 'in', count: total, label: 'in', drill: null },
          { key: 'notices', count: c.captured, label: 'new', outcome: 'on', drill: c.captured ? radar : null },
          { key: 'previous', count: c.linked, label: 'previous', outcome: 'previous', drill: null },
        ],
      });
      steps.push({
        key: 'screening', label: 'AI screening', sub: 'Initial screening', note: ofNote(c.passed, 'passed', total, 'screened'),
        parts: [
          { key: 'passed', count: c.passed, label: 'passed', outcome: 'on', drill: c.passed ? radar : null },
          { key: 'out', count: Math.max(0, total - c.passed), label: 'screened out', outcome: 'stopped', drill: null },
        ],
      });
    }
    const gate = (g: GateKind, sub: string, parts: [GateDecision, string, FlowPartVM['outcome']][]): FlowStepVM => {
      const all = at(g);
      const on = at(g, parts[0][0]);
      return {
        key: g.toLowerCase(), label: g, sub, note: ofNote(on.length, 'approved', all.length, 'decided'),
        parts: [part(ctx, g, 'decided', 'decided', all), ...parts.map(([d, label, o]) => part(ctx, g, d, label, at(g, d), o))],
      };
    };
    steps.push(
      gate('DG1', 'First-level screening', [['pursue', 'approved', 'on'], ['discard', 'rejected', 'stopped'], ['hold', 'pending', 'held']]),
      gate('DG2', 'Bid or no-bid', [['bid', 'approved', 'on'], ['no-bid', 'rejected', 'stopped']]),
      gate('DG3', 'Final approval', [['approved', 'approved', 'on'], ['rejected', 'rejected', 'stopped']]),
    );
    // Won: the results of the period against the bids submitted in it; pending is what is still to hear about.
    const subs = q.submissionsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const res = q.resultsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));
    const by = (r: 'won' | 'lost') => res.filter((x) => x.r.result === r).map((x) => x.l.tenderId);
    const won = by('won');
    const lost = by('lost');
    steps.push({
      key: 'won', label: 'Won', sub: 'Final shortlist', note: ofNote(won.length, 'won', subs.length, 'submitted'),
      parts: [
        part(ctx, 'Won', 'won', 'won', won, 'on'),
        part(ctx, 'Won', 'lost', 'lost', lost, 'stopped'),
        { key: 'pending', count: Math.max(0, subs.length - won.length - lost.length), label: 'pending', outcome: 'held', drill: null },
      ],
    });
    return { steps };
  },
};

export const FLOWS: FlowDef[] = [DECISION_FUNNEL];
