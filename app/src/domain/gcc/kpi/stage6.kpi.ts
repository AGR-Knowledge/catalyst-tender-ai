import type { Tone } from '@/data/types';
import type { Lifecycle, S6Facts } from '@/data/gcc/lifecycle';
import { NEAR_WD } from '@/data/gcc/targets';
import { deadlineWd } from '../lifecycle';
import type { KpiCtx, KpiDef } from './types';
import { dueInWindow, idsDrill, liveIn, onTimeRate, pctOf, plural, round1, STAGE_BANDS, tileLabel, valueOf, wdText } from './stages';

/**
 * Stage 6 · Proposal (plan 013 Phase 2.6, dashboards.md §10.9 and §11.4). The
 * Proposal Manager's home: which sections are late, and will each proposal
 * clear the pass mark?
 */

type S6 = { l: Lifecycle; f: S6Facts };

export const s6Of = (ctx: KpiCtx): S6[] => liveIn(ctx, 6).flatMap((l) => (l.facts?.stage === 6 ? [{ l, f: l.facts }] : []));

/** "On T-2025-317", "Across 2 proposals": a lower-case sub-line clause as a line of its own. */
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

export const belowPass = (ctx: KpiCtx) => s6Of(ctx).filter((x) => x.f.simScore < x.f.passMark).sort((a, b) => (a.f.simScore - a.f.passMark) - (b.f.simScore - b.f.passMark));

export const KPIS: KpiDef[] = [
  {
    id: 'PRP-1', label: 'Sections late', kind: 'state',
    info: {
      means: 'Sections that are behind. Late sections get written in a hurry, and it shows in the score',
      counted: 'Proposal sections past their internal due date and not locked, across Stage 6 tenders. The sub-line names the tender with most.',
      target: `0 green; any orange; any on a bid due within ${NEAR_WD} working days red`, source: 'Proposal section plan',
    },
    compute(ctx) {
      const rows = s6Of(ctx).filter((x) => x.f.sections.late > 0);
      const n = rows.reduce((s, x) => s + x.f.sections.late, 0);
      if (!n) return { display: '0', sub: 'Every section is on time', detail: 'Every section is on time', ref: { k: 'Worst', v: 'None' }, tone: 'green' };
      const most = [...rows].sort((a, b) => b.f.sections.late - a.f.sections.late)[0];
      const urgent = rows.some((x) => { const wd = deadlineWd(x.l, ctx.tenant); return wd !== null && wd <= NEAR_WD; });
      const tone: Tone = urgent ? 'red' : 'orange';
      return { display: String(n), sub: `Most: ${most.l.tenderId} (${most.f.sections.late})`, detail: `Across ${plural(rows.length, 'tender')}`, ref: { k: 'Worst', v: `${most.l.tenderId}, ${most.f.sections.late}` }, tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Sections late'), s6Of(ctx).filter((x) => x.f.sections.late > 0).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRP-2', label: 'Sections locked', kind: 'state',
    info: {
      means: 'How much of each proposal is final',
      counted: 'Locked sections ÷ all sections, across Stage 6 tenders. The sub-line names the least advanced proposal and the working days to its submission.',
      target: 'None (information)', source: 'Proposal section plan',
    },
    compute(ctx) {
      const rows = s6Of(ctx);
      if (!rows.length) return { display: 'No proposals in drafting', detail: 'No sections in drafting', ref: { k: 'Worst', v: 'None' } };
      const locked = rows.reduce((s, x) => s + x.f.sections.locked, 0);
      const total = rows.reduce((s, x) => s + x.f.sections.total, 0);
      const least = [...rows].sort((a, b) => a.f.sections.locked / a.f.sections.total - b.f.sections.locked / b.f.sections.total)[0];
      const wd = deadlineWd(least.l, ctx.tenant);
      return {
        display: `${pctOf(locked, total)}%`,
        sub: `Least: ${least.l.tenderId}, ${least.f.sections.locked} of ${least.f.sections.total}${wd !== null ? ` · ${wdText(wd)} left` : ''}`.replace(' due today left', ', due today'),
        detail: `${locked} of ${plural(total, 'section')}`,
        ref: { k: 'Worst', v: least.l.tenderId },
      };
    },
  },
  {
    id: 'PRP-3', label: 'Below pass mark', kind: 'state',
    info: {
      means: 'Proposals that would fail the technical evaluation as they stand. A failed technical envelope means the price is never opened',
      counted: 'Stage 6 tenders whose simulated technical score is below the published pass mark. The sub-line shows the worst.',
      target: '0 green; any red', source: 'Technical score simulation',
    },
    compute(ctx) {
      const list = belowPass(ctx);
      if (!list.length) return { display: '0', sub: 'Every proposal clears its pass mark', detail: 'All clear the pass mark', ref: { k: 'Worst', v: 'None' }, tone: 'green' };
      const w = list[0];
      return { display: String(list.length), sub: `${w.l.tenderId}: ${w.f.simScore} vs ${w.f.passMark}`, detail: `${w.f.simScore} vs ${w.f.passMark} pass mark`, ref: { k: 'Worst', v: w.l.tenderId }, tone: 'red' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Below pass mark'), belowPass(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRP-4', label: 'SME tasks overdue', kind: 'state',
    info: {
      means: 'Specialists who owe text. This is usually where proposals slip',
      counted: 'Specialist writing tasks past their due date, across Stage 6 tenders.',
      target: '0 green; any orange', source: 'Proposal task list',
    },
    compute(ctx) {
      const rows = s6Of(ctx).filter((x) => x.f.smeOverdue > 0);
      const n = rows.reduce((s, x) => s + x.f.smeOverdue, 0);
      if (!n) return { display: '0', sub: 'No specialist is late', detail: 'No specialist is late', ref: { k: 'Target', v: '0' }, tone: 'green' };
      const sub = rows.length === 1 ? `on ${rows[0].l.tenderId}` : `across ${plural(rows.length, 'tender')}`;
      return { display: String(n), sub, detail: cap(sub), ref: { k: 'Target', v: '0' }, tone: 'orange' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'SME tasks overdue'), s6Of(ctx).filter((x) => x.f.smeOverdue > 0).map((x) => x.l.tenderId)),
  },
  {
    id: 'PRP-5', label: 'Reviews held', kind: 'flow',
    info: {
      means: 'Whether proposals are being reviewed before they lock',
      counted: 'Red-team reviews due in the period that were held by their date ÷ reviews due in the period. A review due today and not yet held is not counted.',
      target: '100% green', source: 'Review records',
    },
    compute: (ctx) => {
      const r = onTimeRate(dueInWindow(ctx, 'review'), 'No reviews due in this period', STAGE_BANDS.full, 'held by their date');
      return { ...r, detail: r.sub ?? 'No red-team review due', ref: { k: 'Target', v: `${STAGE_BANDS.full.green}%` } };
    },
    drill: (ctx) => idsDrill(`From tile: Reviews due · ${ctx.window.label}`, dueInWindow(ctx, 'review').map((x) => x.l.tenderId)),
  },
  {
    id: 'PRP-6', label: 'Content reused', kind: 'state',
    info: {
      means: 'How much of the writing starts from proven, cited material',
      counted: 'Share of drafted text reused from past bids with the source cited, across Stage 6 tenders, weighted by tender value.',
      target: 'None (information)', source: 'Proposal content library',
    },
    compute(ctx) {
      const rows = s6Of(ctx);
      if (!rows.length) return { display: 'No proposals in drafting', detail: 'No text drafted yet', ref: { k: 'Worst', v: 'None' } };
      const total = rows.reduce((s, x) => s + valueOf(ctx.tenant, x.l), 0);
      const pct = total ? round1(rows.reduce((s, x) => s + x.f.reusePct * valueOf(ctx.tenant, x.l), 0) / total) : 0;
      // The proposal starting least from cited material, as Cost lines sourced names its least-sourced price.
      const low = [...rows].sort((a, b) => a.f.reusePct - b.f.reusePct)[0];
      return { display: `${Math.round(pct)}%`, sub: `across ${plural(rows.length, 'proposal')}`, detail: cap(`across ${plural(rows.length, 'proposal')}`), ref: { k: 'Worst', v: `${low.l.tenderId}, ${Math.round(low.f.reusePct)}%` } };
    },
  },
];
