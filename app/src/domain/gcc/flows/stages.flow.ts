import { GCC_STAGES, stageOf, type StageN } from '@/data/gcc/stages';
import type { GateDecision, Lifecycle } from '@/data/gcc/lifecycle';
import { inWindow } from '../period';
import { requestsFor } from '../requests';
import type { FlowPartVM, FlowStepVM } from '../viewmodels';
import type { KpiCtx } from '../kpi/types';
import { entriesInto, firstInto, idsDrill, qOf, stageNow } from '../kpi/stages';
import type { FlowDef } from './types';

/**
 * The stage flow strips (plan 013 Phase 1, dashboards.md §1 Z3 and §10.4–10.13).
 * One rule for every stage: how many tenders entered each step in the period,
 * then "Moved on" (entered the next stage) and "Stopped" (closed in this
 * stage). A stage that ends in a gate shows the gate's decisions instead.
 * Stage 1 starts with the notices captured; My requests uses request statuses.
 * All of it is read from the stage logs, so every strip needs no extra data.
 */

const tenders = (n: number) => (n === 1 ? 'tender' : 'tenders');

const part = (key: string, list: Lifecycle[], label: string, drillLabel: string): FlowPartVM => ({
  key, count: list.length, label, drill: idsDrill(drillLabel, list.map((l) => l.tenderId)),
});

/** Tenders whose log shows an entry into this step inside the window. */
const into = (all: Lifecycle[], ctx: KpiCtx, n: number, step: string) =>
  all.filter((l) => entriesInto(l, n, step).some((e) => inWindow(e.at, ctx.window)));

const GATE_PARTS: Record<'DG1' | 'DG2' | 'DG3', [GateDecision, string][]> = {
  DG1: [['pursue', 'pursued'], ['discard', 'discarded'], ['hold', 'held']],
  DG2: [['bid', 'bid'], ['no-bid', 'no-bid']],
  DG3: [['approved', 'approved'], ['rejected', 'rejected']],
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
      counted: n === 1
        ? 'Notices captured and linked come from the intake counts. Each later step counts the tenders that entered it in the period, so the numbers need not add up.'
        : 'Each step counts the tenders that entered it in the period. A tender can enter several steps, so the numbers need not add up.',
      source: 'Tender lifecycles: stage history and gate records',
    },
    compute(ctx) {
      const q = qOf(ctx);
      const all = q.all();
      const per = ctx.window.label;
      const from = (label: string) => `From flow: ${label} · ${per}`;
      const stepBox = (step: string, label: string): FlowStepVM => {
        const list = into(all, ctx, n, step);
        return { key: step, label, parts: [part('n', list, tenders(list.length), from(label))] };
      };
      const steps: FlowStepVM[] = [];

      if (n === 1) {
        // dashboards.md §10.4: Captured (notices) → Linked (duplicates and addenda) → Logged → Screened → Awaiting DG1 → DG1.
        const c = q.capturesIn(ctx.window);
        steps.push({ key: 'notices', label: 'Captured', parts: [{ key: 'n', count: c.captured, label: c.captured === 1 ? 'notice' : 'notices', drill: null }] });
        steps.push({ key: 'linked', label: 'Linked', parts: [{ key: 'n', count: c.linked, label: 'duplicates and addenda', drill: null }] });
        steps.push(stepBox('captured', 'Logged'), stepBox('screened', 'Screened'), stepBox('awaiting-dg1', 'Awaiting DG1'));
      } else if (n === 9) {
        // Result received (won · lost) → Handover or debrief → Lessons captured → Closed.
        const got = into(all, ctx, 9, 'result-received');
        const won = got.filter((l) => l.result?.result === 'won');
        const lost = got.filter((l) => l.result?.result === 'lost');
        steps.push({ key: 'result-received', label: 'Result received', parts: [part('won', won, 'won', from('Won')), part('lost', lost, 'lost', from('Lost'))] });
        steps.push(stepBox('handover-or-debrief', 'Handover or debrief'), stepBox('lessons-captured', 'Lessons captured'));
      } else {
        for (const st of s.steps) steps.push(stepBox(st.key, st.label));
      }

      if (gate) {
        const events = q.gateEventsIn(ctx.window, gate);
        steps.push({
          key: gate, label: gate,
          parts: GATE_PARTS[gate].map(([d, label]) => part(d, events.filter((e) => e.g.decision === d).map((e) => e.l), label, from(`${gate} ${label}`))),
        });
      } else {
        // Closed while in this stage, in the window.
        const stopped = all.filter((l) => inWindow(l.closedAt, ctx.window) && stageNow(l) === n);
        if (n === 9) {
          steps.push({ key: 'closed', label: 'Closed', parts: [part('n', stopped, tenders(stopped.length), from('Closed'))] });
        } else {
          const moved = all.filter((l) => inWindow(firstInto(l, n + 1), ctx.window));
          const [on, off] = n === 8 ? ['results received', 'withdrawn'] : ['moved on', 'stopped'];
          steps.push({ key: 'out', label: `Left ${s.short}`, parts: [part('moved', moved, on, from(`Moved on from ${s.short}`)), part('stopped', stopped, off, from(`Stopped in ${s.short}`))] });
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
    const box = (key: string, label: string, pick: (r: (typeof rs)[number]) => string | undefined): FlowStepVM => {
      const ids = rs.filter((r) => inWindow(pick(r), ctx.window)).map((r) => r.id);
      return {
        key, label,
        parts: [{ key: 'n', count: ids.length, label: ids.length === 1 ? 'request' : 'requests', drill: ids.length ? { kind: 'table', label: `From flow: ${label} · ${per}`, ids } : null }],
      };
    };
    return {
      steps: [
        box('requested', 'Requested', (r) => r.requestedAt),
        box('submitted', 'Submitted', (r) => r.submittedAt),
        box('accepted', 'Accepted', (r) => r.acceptedAt),
      ],
    };
  },
};

export const FLOWS: FlowDef[] = [...GCC_STAGES.map((s) => stageFlow(s.n)), REQUESTS_FLOW];
