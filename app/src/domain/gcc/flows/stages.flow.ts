import { GCC_STAGES, stageOf, type StageN } from '@/data/gcc/stages';
import type { GateDecision, Lifecycle } from '@/data/gcc/lifecycle';
import { inWindow } from '../period';
import { requestsFor } from '../requests';
import type { FlowPartVM, FlowStepVM } from '../viewmodels';
import type { KpiCtx } from '../kpi/types';
import { entriesInto, firstInto, idsDrill, qOf, stageNow } from '../kpi/stages';
import type { FlowDef } from './types';
import { GATE_SUB, splitNote } from './notes';

/**
 * The stage flow strips (plan 013 Phase 1, dashboards.md §1 Z3 and §10.4–10.13).
 * One rule for every stage: how many tenders entered each step in the period,
 * then "Moved on" (entered the next stage) and "Stopped" (closed in this
 * stage). A stage that ends in a gate shows the gate's decisions instead.
 * Stage 1 starts with the notices captured; My requests uses request statuses.
 * All of it is read from the stage logs, so every strip needs no extra data.
 *
 * Every column has the same rows (plan 027d): what it is, the part that went
 * on, a bar split by outcome, the other parts, and the rate as a note. A step
 * column splits the tenders that entered it by where each is now: moved on,
 * still here, or stopped here. Together they are the tenders that entered.
 */

type Outcome = NonNullable<FlowPartVM['outcome']>;

const part = (key: string, list: Lifecycle[], label: string, drillLabel: string, outcome?: Outcome): FlowPartVM => ({
  key, count: list.length, label, drill: idsDrill(drillLabel, list.map((l) => l.tenderId)), ...(outcome ? { outcome } : {}),
});

/** A column whose note is the first part's share of all its parts. */
const column = (key: string, label: string, sub: string, noun: string, parts: FlowPartVM[]): FlowStepVM => ({ key, label, sub, parts, note: splitNote(parts, noun) });

/** Tenders whose log shows an entry into this step inside the window. */
const into = (all: Lifecycle[], ctx: KpiCtx, n: number, step: string) =>
  all.filter((l) => entriesInto(l, n, step).some((e) => inWindow(e.at, ctx.window)));

/**
 * Where a tender that entered this step is now. It left the step if its log
 * has an entry after its last entry into it: usually a later step or stage
 * ("moved on"). Otherwise it is still here, or it closed here ("stopped"). In
 * Stage 9 a result closed after its handover or debrief is done, not stopped.
 */
function whereNow(l: Lifecycle, n: number, step: string): Outcome {
  const entries = entriesInto(l, n, step);
  const last = entries[entries.length - 1];
  if (last && l.log.indexOf(last) < l.log.length - 1) return 'on';
  if (!l.closedAt) return 'held';
  return n === 9 && (l.closedAs === 'won' || l.closedAs === 'lost') ? 'on' : 'stopped';
}

const GATE_PARTS: Record<'DG1' | 'DG2' | 'DG3', [GateDecision, string, Outcome][]> = {
  DG1: [['pursue', 'pursued', 'on'], ['discard', 'discarded', 'stopped'], ['hold', 'held', 'held']],
  DG2: [['bid', 'bid', 'on'], ['no-bid', 'no-bid', 'stopped']],
  DG3: [['approved', 'approved', 'on'], ['rejected', 'rejected', 'stopped']],
};

function stageFlow(n: StageN): FlowDef {
  const s = stageOf(n)!;
  const gate = s.gateAfter;
  const ending = gate ? `then what ${gate} decided` : n === 9 ? 'then how many closed' : 'then how many moved on or stopped';
  return {
    id: `flow.stage.${n}`,
    label: `Tenders through ${s.short}`,
    info: {
      means: `How tenders moved through ${s.full} in this period: how many entered each step, ${ending}. Counted from each tender's stage history.`,
      counted: (n === 1
        ? 'Notices captured, new and previous (re-issued tenders seen before), come from the intake counts. Each later step counts the tenders that entered it in the period, so the numbers need not add up.'
        : 'Each step counts the tenders that entered it in the period. A tender can enter several steps, so the numbers need not add up.')
        + ' A step’s bar splits the tenders that entered it by where each is now: green moved on, orange still here, grey stopped.',
      source: 'Tender lifecycles: stage history and gate records',
    },
    compute(ctx) {
      const q = qOf(ctx);
      const all = q.all();
      const per = ctx.window.label;
      const from = (label: string) => `From flow: ${label} · ${per}`;
      const stepBox = (step: string, label: string): FlowStepVM => {
        const list = into(all, ctx, n, step);
        const now = (o: Outcome) => list.filter((l) => whereNow(l, n, step) === o);
        const at = s.steps.findIndex((x) => x.key === step);
        return column(step, label, `Step ${at + 1} of ${s.steps.length}`, 'entered', [
          part('moved', now('on'), 'moved on', from(`${label} moved on`), 'on'),
          part('held', now('held'), 'still here', from(`${label} still here`), 'held'),
          part('stopped', now('stopped'), 'stopped', from(`${label} stopped`), 'stopped'),
        ]);
      };
      const steps: FlowStepVM[] = [];

      if (n === 1) {
        // dashboards.md §10.4, amended by plans 027d and 039: Captured (new · previous) → Logged → Screened → Awaiting DG1 → DG1.
        const c = q.capturesIn(ctx.window);
        steps.push(column('notices', 'Captured', 'New notices', 'received', [
          { key: 'n', count: c.captured, label: 'new', outcome: 'on', drill: null },
          { key: 'linked', count: c.linked, label: 'previous', outcome: 'previous', drill: null },
        ]));
        steps.push(stepBox('captured', 'Logged'), stepBox('screened', 'Screened'), stepBox('awaiting-dg1', 'Awaiting DG1'));
      } else if (n === 9) {
        // Result received (won · lost) → Handover or debrief → Lessons captured → Closed.
        const got = into(all, ctx, 9, 'result-received');
        const won = got.filter((l) => l.result?.result === 'won');
        const lost = got.filter((l) => l.result?.result === 'lost');
        steps.push(column('result-received', 'Result received', 'Won or lost', 'results', [part('won', won, 'won', from('Won'), 'on'), part('lost', lost, 'lost', from('Lost'), 'stopped')]));
        steps.push(stepBox('handover-or-debrief', 'Handover or debrief'), stepBox('lessons-captured', 'Lessons captured'));
      } else {
        for (const st of s.steps) steps.push(stepBox(st.key, st.label));
      }

      if (gate) {
        const events = q.gateEventsIn(ctx.window, gate);
        steps.push(column(gate, gate, GATE_SUB[gate], 'decided',
          GATE_PARTS[gate].map(([d, label, o]) => part(d, events.filter((e) => e.g.decision === d).map((e) => e.l), label, from(`${gate} ${label}`), o))));
      } else {
        // Closed while in this stage, in the window.
        const stopped = all.filter((l) => inWindow(l.closedAt, ctx.window) && stageNow(l) === n);
        if (n === 9) {
          // A closed result is done: one part, and the note says what it counts.
          steps.push({ key: 'closed', label: 'Closed', sub: 'Handed over or debriefed', parts: [part('n', stopped, 'closed', from('Closed'), 'on')], note: 'Closed in the period' });
        } else {
          const moved = all.filter((l) => inWindow(firstInto(l, n + 1), ctx.window));
          const [on, off, sub] = n === 8 ? ['results received', 'withdrawn', 'Result or withdrawn'] : ['moved on', 'stopped', 'Moved on or stopped'];
          steps.push(column('out', `Left ${s.short}`, sub, 'left', [part('moved', moved, on, from(`Moved on from ${s.short}`), 'on'), part('stopped', stopped, off, from(`Stopped in ${s.short}`), 'stopped')]));
        }
      }
      return { steps };
    },
  };
}

/** Requested → Submitted → Accepted (dashboards.md §10.13), each counted when it happened in the period. */
const REQUESTS_FLOW: FlowDef = {
  id: 'flow.requests',
  label: 'Your requests',
  info: {
    means: 'What the bid teams asked of you in this period, what you delivered, and what an issued pack has used.',
    counted: 'Requested counts requests made in the period; Submitted, the answers you gave; Accepted, the inputs a pack issued in the period relied on.',
    source: 'Pack input requests, renewal requests and requests from the bid teams',
  },
  compute(ctx) {
    const rs = requestsFor(ctx.tenant, ctx.viewer.id, ctx.done, ctx.viewer);
    const per = ctx.window.label;
    // One part each, with no outcome (a neutral bar): the note says what the number counts (plan 027d 2.4.5).
    const box = (key: string, label: string, sub: string, note: string, pick: (r: (typeof rs)[number]) => string | undefined): FlowStepVM => {
      const ids = rs.filter((r) => inWindow(pick(r), ctx.window)).map((r) => r.id);
      return {
        key, label, sub, note,
        parts: [{ key: 'n', count: ids.length, label: ids.length === 1 ? 'request' : 'requests', drill: ids.length ? { kind: 'table', label: `From flow: ${label} · ${per}`, ids } : null }],
      };
    };
    return {
      steps: [
        box('requested', 'Requested', 'By the bid teams', 'Asked of you in the period', (r) => r.requestedAt),
        box('submitted', 'Submitted', 'Your answers', 'Answered in the period', (r) => r.submittedAt),
        box('accepted', 'Accepted', 'Used in a pack', 'Used by a pack issued in the period', (r) => r.acceptedAt),
      ],
    };
  },
};

export const FLOWS: FlowDef[] = [...GCC_STAGES.map((s) => stageFlow(s.n)), REQUESTS_FLOW];
