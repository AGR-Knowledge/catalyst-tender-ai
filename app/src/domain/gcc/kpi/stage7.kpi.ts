import { firstWithRole } from '@/data/people';
import type { Tone } from '@/data/types';
import type { Lifecycle, S7Facts } from '@/data/gcc/lifecycle';
import { NEAR_WD, RATE_BANDS } from '@/data/gcc/targets';
import { slaState } from '../clock';
import { deadlineWd, openGate } from '../lifecycle';
import type { TileRefVM } from '../viewmodels';
import type { KpiCtx, KpiDef, KpiResult } from './types';
import { idsDrill, liveIn, onTimeRate, pctOf, plural, qOf, rateTone, STAGE_BANDS, tileLabel, wdText } from './stages';

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

/** A count over Stage 7 rows, with the tender that has most. */
export function countOver(all: S7[], pick: (f: S7Facts) => number) {
  const rows = all.filter((x) => pick(x.f) > 0);
  const n = rows.reduce((s, x) => s + pick(x.f), 0);
  const most = [...rows].sort((a, b) => pick(b.f) - pick(a.f))[0];
  return { rows, n, most };
}

function sumOf(ctx: KpiCtx, pick: (f: S7Facts) => number) {
  const s = countOver(s7Of(ctx), pick);
  return { ...s, nearAny: s.rows.some((x) => near(ctx, x.l)) };
}

/** The tile's sub-line: "on T-…" for one tender, else "Most: T-…", the tender with the largest count. */
export const on = (s: { rows: S7[]; most?: S7 }) => (s.rows.length === 1 ? `on ${s.rows[0].l.tenderId}` : `Most: ${s.most?.l.tenderId}`);

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a: about 24 characters), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 24) ?? options[options.length - 1];

/**
 * A count's tile lines: the one tender, or how many tenders with the worst named (the same facts as `on`).
 * With one tender the detail already names it, so the reference line is `one` (the tile's target).
 */
const onSplit = (s: { rows: S7[]; most?: S7 }, pick: (f: S7Facts) => number, one: TileRefVM): Pick<KpiResult, 'detail' | 'ref'> =>
  s.rows.length === 1 ? { detail: `On ${s.rows[0].l.tenderId}`, ref: one }
    : { detail: `Across ${plural(s.rows.length, 'tender')}`, ref: s.most ? { k: 'Worst', v: `${s.most.l.tenderId}, ${pick(s.most.f)}` } : one };

/** The target of the count tiles whose ⓘ says "0 green". */
const ZERO: TileRefVM = { k: 'Target', v: '0' };

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
      if (!s.n) return { display: '0', sub: s7Of(ctx).length ? 'Every mandatory line is evidenced' : 'No bids in compliance', detail: s7Of(ctx).length ? 'All lines evidenced' : 'No bids in compliance', ref: ZERO, tone: 'green' };
      const tone: Tone = s.nearAny ? 'red' : 'orange';
      return { display: String(s.n), sub: on(s), ...onSplit(s, (f) => f.mandatoryGaps, ZERO), tone };
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
      const ref = { k: 'Target', v: `${STAGE_BANDS.full.green}%` };
      if (!rows.length) return { display: 'No bids in compliance', detail: 'No matrix to complete', ref };
      const ev = rows.reduce((s, x) => s + x.f.requirements.evidenced, 0);
      const total = rows.reduce((s, x) => s + x.f.requirements.total, 0);
      const pct = pctOf(ev, total);
      return { display: `${pct}%`, sub: `${ev.toLocaleString('en-GB')} of ${plural(total, 'requirement')}`, detail: fit(`${ev.toLocaleString('en-GB')} of ${plural(total, 'requirement')}`, `${ev.toLocaleString('en-GB')} of ${total.toLocaleString('en-GB')}`), ref, tone: rateTone(pct, STAGE_BANDS.full) };
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
      if (!s.n) return { display: '0', sub: 'Every contract position is decided', detail: 'All positions decided', ref: { k: 'Worst', v: 'None' } };
      // Information, orange near submission: with one tender, how long until it is submitted.
      const wd = deadlineWd(s.rows[0].l, ctx.tenant);
      const one: TileRefVM = wd !== null ? { k: 'Time left', v: wdText(wd) } : { k: 'Worst', v: `${s.rows[0].l.tenderId}, ${s.n}` };
      return { display: String(s.n), sub: on(s), ...onSplit(s, (f) => f.redlinesOpen, one), ...(s.nearAny ? { tone: 'orange' as const } : {}) };
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
      return s.n ? { display: String(s.n), sub: on(s), ...onSplit(s, (f) => f.risksWithoutOwner, ZERO), tone: 'red' } : { display: '0', sub: 'Every risk has an owner', detail: 'Every risk has an owner', ref: ZERO, tone: 'green' };
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
      if (!list.length) return { display: '0', sub: 'No bid is waiting for DG3', detail: 'No bid waiting for DG3', ref: { k: 'Next', v: 'None' } };
      const { l, g } = list[0];
      const s = slaState(g.openedAt, g.slaEnd, ctx.now);
      // The approver's first name fits the tile ("Head of Tendering" squeezes the label); no tag for the approver themself.
      const hot = firstWithRole(ctx.tenant, 'hot');
      return {
        display: String(list.length), sub: `${l.tenderId} · ${s.text}`, tone: s.tone, ...(hot && hot.id !== ctx.viewer.id ? { ownerTag: hot.name.split(' ')[0] } : {}),
        // The approver's chip shares the reference line, so the tender goes there and the time on the detail line.
        detail: s.breached ? s.text : s.text.replace(/ of .*$/, ''),
        ref: { k: s.breached ? 'Worst' : 'Next', v: l.tenderId },
      };
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
    compute: (ctx) => {
      const r = onTimeRate(qOf(ctx).gateEventsIn(ctx.window, 'DG3').map((x) => ({ onTime: x.g.onTime })), 'No DG3 decisions in this period', RATE_BANDS['CMP-6'], 'within 48 h');
      return { ...r, detail: r.sub ?? 'No final approvals', ref: { k: 'Target', v: `${RATE_BANDS['CMP-6'].green}%` } };
    },
    drill: (ctx) => idsDrill(`From tile: DG3 decisions · ${ctx.window.label}`, qOf(ctx).gateEventsIn(ctx.window, 'DG3').map((x) => x.l.tenderId)),
  },
];
