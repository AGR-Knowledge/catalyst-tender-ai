import { TENANTS } from '@/data/tenants';
import { stageOf, type StageN } from '@/data/gcc/stages';
import { DEMO_TIME, DEMO_TODAY, whenText } from '@/domain/calendar';
import type { KpiCtx } from '../kpi/types';
import { stageOwner } from '../kpi/stages';
import type { DashboardSpec, FilterKey, SortPreset } from './types';

/**
 * One dashboard per stage (plan 013 Phase 6, dashboards.md §10.4–10.12). The
 * stage owner's home and the page the Head of Tendering opens from the
 * portfolio graph are the same spec: only "Needs your action" follows the
 * viewer (the builder titles it "Waiting in {stage}" for everyone else).
 */

const asOf = (ctx: KpiCtx) => whenText(DEMO_TODAY, DEMO_TIME, TENANTS.find((t) => t.key === ctx.tenant)?.tzLabel);

/** "Subcontractor & Internal Input Orchestration · Joseph Mathew, Procurement Lead · As of Sun 8 Mar 2026, 10:00 AST". */
function subtitleOf(n: StageN) {
  return (ctx: KpiCtx) => {
    const s = stageOf(n)!;
    const owner = stageOwner(ctx.tenant, n);
    return `${s.full} · ${owner ? `${owner.name}, ${owner.title}` : s.ownerLabel} · As of ${asOf(ctx)}`;
  };
}

interface StageSpec {
  tiles: string[];
  actions: string[];
  columns: string[];
  sort: SortPreset;
  metrics: string[];
  filters?: FilterKey[];
}

const FILTERS: FilterKey[] = ['step', 'health', 'owner'];
/** Shared columns a viewer can add from the Columns menu. */
const OPTIONAL = ['health', 'value', 'owner', 'team', 'captured', 'lastActivity'];

const SPECS: Record<StageN, StageSpec> = {
  1: {
    tiles: ['INT-1', 'INT-5', 'INT-2', 'INT-4', 'INT-3', 'INT-10'],
    actions: ['validation.check', 'booklet.status', 'booklet.approve', 'addendum.confirm', 'dg1.decide'],
    columns: ['tid', 'tender', 'source', 'captured', 'stage', 's1.fields', 'fit', 's1.eligibility', 's1.documents', 's1.language', 's1.dg1Due', 'due'],
    sort: 'newest',
    metrics: ['steps.count', 'steps.value', 's1.fieldsToCheck', 'steps.inPeriod', 'steps.avgHours'],
  },
  2: {
    tiles: ['SRC-1', 'SRC-2', 'SRC-3', 'SRC-4', 'SRC-5', 'SRC-6'],
    actions: ['rfq.send', 'rfq.escalations', 'levelling.confirm', 'clarifications.stale'],
    columns: ['tid', 'tender', 'stage', 's2.covered', 's2.issued', 's2.overdue', 's2.toLevel', 's2.notCovered', 's2.repliesDue', 's2.bidManager', 'due'],
    sort: 'due',
    metrics: ['steps.count', 's2.notCovered', 's2.overdueRfqs', 'steps.value', 'steps.avgDays'],
  },
  3: {
    tiles: ['DEC-1', 'DEC-7', 'DEC-8', 'DEC-4', 'DEC-6', 'DEC-5'],
    actions: ['dg2.position', 'dg2.approve', 'input.nudge', 'pack.issue', 'pack.stale'],
    columns: ['tid', 'tender', 'stage', 'value', 'win', 's3.margin', 's3.facility', 's3.positions', 's3.quorum', 's3.dg2Sla', 's3.pack', 's3.bidManager'],
    sort: 'due',
    metrics: ['steps.count', 'steps.value', 's3.weighted', 'steps.avgDays'],
  },
  4: {
    tiles: ['PLN-1', 'PLN-2', 'SRC-9', 'PLN-4', 'PLN-5', 'PLN-6'],
    actions: ['baseline.due', 'programme.overrun'],
    columns: ['tid', 'tender', 'stage', 's4.duration', 's4.float', 's4.longLead', 's4.manpower', 's4.baselineDue', 's4.m2Due', 'owner', 'due'],
    sort: 'due',
    metrics: ['steps.count', 'steps.value', 'steps.avgDays'],
  },
  5: {
    tiles: ['PRC-1', 'PRC-2', 'PRC-3', 'PRC-4', 'PRC-5', 'PRC-6'],
    actions: ['price.due', 'margin.below', 'finance.pending'],
    columns: ['tid', 'tender', 'stage', 's5.price', 's5.margin', 's5.minMargin', 's5.sourced', 's5.estimated', 's5.finance', 's5.m2Due', 'owner', 'due'],
    sort: 'due',
    metrics: ['steps.count', 'steps.value', 'steps.avgDays'],
  },
  6: {
    tiles: ['PRP-1', 'PRP-2', 'PRP-3', 'PRP-4', 'PRP-5', 'PRP-6'],
    actions: ['sections.late', 'score.below', 'review.due'],
    columns: ['tid', 'tender', 'stage', 's6.sections', 's6.late', 's6.score', 's6.sme', 's6.redTeam', 'owner', 'due'],
    sort: 'due',
    metrics: ['steps.count', 's6.lateSections', 'steps.avgDays'],
  },
  7: {
    tiles: ['CMP-1', 'CMP-2', 'CMP-3', 'CMP-4', 'CMP-5', 'CMP-6'],
    actions: ['dg3.approve', 'gaps.open', 'redlines.open', 'dg3.issue'],
    columns: ['tid', 'tender', 'stage', 's7.evidenced', 's7.gaps', 's7.redlines', 's7.risks', 's7.dg3', 'owner', 'due'],
    sort: 'due',
    metrics: ['steps.count', 's7.gaps', 'steps.avgDays'],
  },
  8: {
    tiles: ['SUB-1', 'SUB-2', 'SUB-3', 'SUB-4', 'SUB-5', 'SUB-6'],
    actions: ['submission.due', 'signatures.pending', 'bond.issue'],
    columns: ['tid', 'tender', 'stage', 's8.deadline', 's8.portal', 's8.ready', 's8.signatures', 's8.bond', 's8.receipt', 's8.opening', 'owner'],
    sort: 'due',
    metrics: ['steps.count', 'steps.value', 'steps.avgDays'],
  },
  9: {
    tiles: ['OUT-1', 'OUT-3', 'RES-1', 'RES-2', 'OUT-6', 'RES-3'],
    actions: ['handover.start', 'debrief.hold', 'lessons.record', 'result.chase'],
    columns: ['tid', 'tender', 's9.result', 'value', 's9.rank', 's9.gap', 's9.lossReason', 's9.predicted', 's9.lessons', 'owner'],
    sort: 'newest',
    metrics: ['steps.count', 'steps.value'],
    filters: [...FILTERS, 'status'],
  },
};

export const DASHBOARDS: DashboardSpec[] = (Object.keys(SPECS).map(Number) as StageN[]).map((n) => {
  const s = SPECS[n];
  return {
    key: `stage.${n}`,
    title: () => `Stage ${n} · ${stageOf(n)!.short}`,
    subtitle: subtitleOf(n),
    tiles: s.tiles,
    flow: `flow.stage.${n}`,
    actions: s.actions,
    table: {
      scope: () => ({ kind: 'stage', stage: n }),
      columns: s.columns,
      optional: OPTIONAL.filter((c) => !s.columns.includes(c)),
      defaultSort: s.sort,
      filters: s.filters ?? FILTERS,
      empty: () => ({
        title: `No tenders are in Stage ${n} now.`,
        body: n === 1 ? 'New tenders arrive here from the radar.' : `Tenders arrive here after ${stageOf(n - 1)!.short.toLowerCase()}.`,
      }),
    },
    graph: { axis: 'steps', stage: n },
    metrics: s.metrics,
    defaultMetric: 'steps.count',
  };
});
