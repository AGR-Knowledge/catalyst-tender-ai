import { addHours } from '../clock';
import { inWindow } from '../period';
import { isOutstanding, requestsFor, type Request } from '../requests';
import type { DrillVM } from '../viewmodels';
import type { KpiCtx, KpiDef } from './types';
import { dayText, dayTimeText } from './stages';

/**
 * My requests (plan 013 Phase 5.2, dashboards.md §10.13 and §11.8): the home
 * of Finance and HR, and of anyone who owes the bid teams an input. Four
 * tiles; the requests are the viewer's own.
 */

const mine = (ctx: KpiCtx) => requestsFor(ctx.tenant, ctx.viewer.id, ctx.done, ctx.viewer, ctx.now);

const drill = (label: string, list: Request[]): DrillVM | null => (list.length ? { kind: 'table', label, ids: list.map((r) => r.id) } : null);

/** "Facility headroom and bond capacity for T-2026-101". */
const whatFor = (r: Request) => (r.tenderId ? `${r.tenderId} · ${r.what}` : r.what);

const dueSoon = (ctx: KpiCtx) => mine(ctx).filter((r) => r.status === 'open' && r.due <= addHours(ctx.now, 48));

export const KPIS: KpiDef[] = [
  {
    id: 'REQ-1', label: 'Open requests', kind: 'state',
    info: {
      means: 'Everything the bid teams are waiting for from you',
      counted: 'Requests to you not yet submitted: pack inputs, credential renewals and questions from the bid teams.',
      target: 'None (information)', source: 'Requests',
    },
    compute(ctx) {
      const open = mine(ctx).filter(isOutstanding);
      if (!open.length) return { display: '0', sub: 'Nothing is asked of you right now' };
      const late = open.filter((r) => r.status === 'late').length;
      const next = open.filter((r) => r.status === 'open')[0];
      return { display: String(open.length), sub: late ? `${late} late${next ? ` · next due ${dayText(next.due)}` : ''}` : `next due ${dayTimeText(next!.due)}` };
    },
    drill: (ctx) => drill('From tile: Open requests', mine(ctx).filter(isOutstanding)),
  },
  {
    id: 'REQ-2', label: 'Due in 48 h', kind: 'state',
    info: {
      means: 'What to do first',
      counted: 'Open requests due within the next 48 hours. Late ones are counted under Late.',
      target: 'None (information)', source: 'Requests',
    },
    compute(ctx) {
      const list = dueSoon(ctx);
      if (!list.length) return { display: '0', sub: 'Nothing due in the next two days' };
      return { display: String(list.length), sub: `${dayTimeText(list[0].due)} · ${whatFor(list[0])}`, tone: 'orange' };
    },
    drill: (ctx) => drill('From tile: Due in 48 h', dueSoon(ctx)),
  },
  {
    id: 'REQ-3', label: 'Late', kind: 'state',
    info: {
      means: 'Inputs holding up a pack or a price',
      counted: 'Open requests past their due date.',
      target: '0 green; any red', source: 'Requests',
    },
    compute(ctx) {
      const late = mine(ctx).filter((r) => r.status === 'late');
      if (!late.length) return { display: '0', sub: 'Nothing is late', tone: 'green' };
      return { display: String(late.length), sub: whatFor(late[0]), tone: 'red' };
    },
    drill: (ctx) => drill('From tile: Late', mine(ctx).filter((r) => r.status === 'late')),
  },
  {
    id: 'REQ-4', label: 'Submitted', kind: 'flow',
    info: {
      means: "What you've delivered in this period",
      counted: 'Requests you answered in the period, whether or not a pack has used them yet.',
      target: 'None (information)', source: 'Requests',
    },
    compute(ctx) {
      const list = mine(ctx).filter((r) => inWindow(r.submittedAt, ctx.window)).sort((a, b) => b.submittedAt!.localeCompare(a.submittedAt!));
      if (!list.length) return { display: '0', sub: 'Nothing submitted in this period' };
      return { display: String(list.length), sub: `Last: ${whatFor(list[0])}, ${dayText(list[0].submittedAt!)}` };
    },
    drill: (ctx) => drill(`From tile: Submitted · ${ctx.window.label}`, mine(ctx).filter((r) => inWindow(r.submittedAt, ctx.window))),
  },
];
