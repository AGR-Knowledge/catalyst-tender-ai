import { firstWithRole } from '@/data/people';
import type { Tone } from '@/data/types';
import type { Lifecycle, S7Facts } from '@/data/gcc/lifecycle';
import { NEAR_WD, RATE_BANDS } from '@/data/gcc/targets';
import { slaState } from '../clock';
import { deadlineWd, openGate } from '../lifecycle';
import type { KpiCtx, KpiDef } from './types';
import { idsDrill, liveIn, onTimeRate, pctOf, plural, qOf, rateTone, STAGE_BANDS, tileLabel } from './stages';

/**
 * Stage 7 · Compliance (plan 013 Phase 2.7, dashboards.md §10.10 and §11.5).
 * DG3 is approved by the Head of Tendering on the pack Compliance issues.
 */

type S7 = { l: Lifecycle; f: S7Facts };

export const s7Of = (ctx: KpiCtx): S7[] => liveIn(ctx, 7).flatMap((l) => (l.facts?.stage === 7 ? [{ l, f: l.facts }] : []));

/** Submission within 5 working days: an open item there is urgent. */
export const near = (ctx: KpiCtx, l: Lifecycle) => { const wd = deadlineWd(l, ctx.tenant); return wd !== null && wd <= NEAR_WD; };

export const dg3Waiting = (ctx: KpiCtx) => liveIn(ctx, 7)
  .flatMap((l) => { const g = openGate(l, ctx.now); return g?.gate === 'DG3' ? [{ l, g }] : []; })
  .sort((a, b) => a.g.slaEnd.localeCompare(b.g.slaEnd));

/** A count over Stage 7 tenders, with the tender that has most. */
function sumOf(ctx: KpiCtx, pick: (f: S7Facts) => number) {
  const rows = s7Of(ctx).filter((x) => pick(x.f) > 0);
  const n = rows.reduce((s, x) => s + pick(x.f), 0);
  const most = [...rows].sort((a, b) => pick(b.f) - pick(a.f))[0];
  return { rows, n, most, nearAny: rows.some((x) => near(ctx, x.l)) };
}

const on = (rows: S7[]) => (rows.length === 1 ? `on ${rows[0].l.tenderId}` : `Most: ${rows[0]?.l.tenderId}`);

export const KPIS: KpiDef[] = [
  {
    id: 'CMP-1', label: 'Mandatory gaps', kind: 'state',
    info: {
      means: "Must-have requirements we can't yet prove. One open gap at submission can exclude the bid",
      counted: 'Mandatory requirements without accepted evidence, across Stage 7 tenders.',
      target: `0 green; any orange; any within ${NEAR_WD} working days of submission red`, source: 'Compliance matrix',
    },
    compute(ctx) {
      const s = sumOf(ctx, (f) => f.mandatoryGaps);
      if (!s.n) return { display: '0', sub: s7Of(ctx).length ? 'Every mandatory line is evidenced' : 'No bids in compliance', tone: 'green' };
      const tone: Tone = s.nearAny ? 'red' : 'orange';
      return { display: String(s.n), sub: on(s.rows), tone };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Mandatory gaps'), sumOf(ctx, (f) => f.mandatoryGaps).rows.map((x) => x.l.tenderId)),
  },
  {
    id: 'CMP-2', label: 'Requirements evidenced', kind: 'state',
    info: {
      means: 'How complete the compliance matrix is',
      counted: 'Requirements with evidence attached and checked ÷ all requirements, across Stage 7 tenders.',
      target: '100% green', source: 'Compliance matrix',
    },
    compute(ctx) {
      const rows = s7Of(ctx);
      if (!rows.length) return { display: 'No bids in compliance' };
      const ev = rows.reduce((s, x) => s + x.f.requirements.evidenced, 0);
      const total = rows.reduce((s, x) => s + x.f.requirements.total, 0);
      const pct = pctOf(ev, total);
      return { display: `${pct}%`, sub: `${ev.toLocaleString('en-GB')} of ${plural(total, 'requirement')}`, tone: rateTone(pct, STAGE_BANDS.full) };
    },
  },
  {
    id: 'CMP-3', label: 'Redlines open', kind: 'state',
    info: {
      means: 'Contract positions still undecided. Each one is price or risk',
      counted: 'Contract deviations recommended but not yet accepted, amended or escalated, across Stage 7 tenders.',
      target: `Information; orange when any is on a bid due within ${NEAR_WD} working days`, source: 'Contract review',
    },
    compute(ctx) {
      const s = sumOf(ctx, (f) => f.redlinesOpen);
      if (!s.n) return { display: '0', sub: 'Every contract position is decided' };
      return { display: String(s.n), sub: on(s.rows), ...(s.nearAny ? { tone: 'orange' as const } : {}) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Redlines open'), sumOf(ctx, (f) => f.redlinesOpen).rows.map((x) => x.l.tenderId)),
  },
  {
    id: 'CMP-4', label: 'Risks without owner', kind: 'state',
    info: {
      means: 'A risk nobody owns is a risk nobody manages',
      counted: 'Risk-register items with no named owner, across Stage 7 tenders.',
      target: '0 green; any red', source: 'Risk register',
    },
    compute(ctx) {
      const s = sumOf(ctx, (f) => f.risksWithoutOwner);
      return s.n ? { display: String(s.n), sub: on(s.rows), tone: 'red' } : { display: '0', sub: 'Every risk has an owner', tone: 'green' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Risks without owner'), sumOf(ctx, (f) => f.risksWithoutOwner).rows.map((x) => x.l.tenderId)),
  },
  {
    id: 'CMP-5', label: 'DG3 waiting', kind: 'state',
    info: {
      means: 'Bids ready for final approval by the Head of Tendering',
      counted: 'DG3 packs issued with no decision. The sub-line shows the time left on the first, against the 48 h limit.',
      target: 'Orange under 25% of the time limit; red once breached', source: 'DG3 packs and decisions',
    },
    compute(ctx) {
      const list = dg3Waiting(ctx);
      if (!list.length) return { display: '0', sub: 'No bid is waiting for DG3' };
      const { l, g } = list[0];
      const s = slaState(g.openedAt, g.slaEnd, ctx.now);
      // The approver's first name fits the tile ("Head of Tendering" squeezes the label); no tag for the approver themself.
      const hot = firstWithRole(ctx.tenant, 'hot');
      return { display: String(list.length), sub: `${l.tenderId} · ${s.text}`, tone: s.tone, ...(hot && hot.id !== ctx.viewer.id ? { ownerTag: hot.name.split(' ')[0] } : {}) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'DG3 waiting'), dg3Waiting(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'CMP-6', label: 'DG3 on time', kind: 'flow',
    info: {
      means: 'Whether final approvals are keeping pace with the submission dates',
      counted: 'DG3 decisions made within 48 h of pack issue ÷ DG3 decisions in the period.',
      target: '100% green; 90% or more orange', source: 'DG3 decisions',
    },
    compute: (ctx) => onTimeRate(qOf(ctx).gateEventsIn(ctx.window, 'DG3').map((x) => ({ onTime: x.g.onTime })), 'No DG3 decisions in this period', RATE_BANDS['CMP-6'], 'within 48 h'),
    drill: (ctx) => idsDrill(`From tile: DG3 decisions · ${ctx.window.label}`, qOf(ctx).gateEventsIn(ctx.window, 'DG3').map((x) => x.l.tenderId)),
  },
];
