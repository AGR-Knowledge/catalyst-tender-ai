import type { Tone } from '@/data/types';
import { can } from '@/data/access';
import { DG2_QUORUM } from '@/data/gcc/targets';
import { hoursText, openGate, staleOf } from '../lifecycle';
import { tenderCtx } from '../lifecycle.port';
import { idsDrill, liveIn, STAGE_BANDS, tileLabel } from './stages';
import type { KpiCtx, KpiDef } from './types';

/**
 * Stage 3 · Bid decision (plan 013 Phase 2.3, dashboards.md §10.6). DEC-4 …
 * DEC-7 come from plan 015. Positions are shown only to viewers who may see
 * them on that tender (roles-and-access §9).
 */

/** Issued packs waiting for DG2, first SLA end first. */
function awaiting(ctx: KpiCtx) {
  return liveIn(ctx, 3)
    .flatMap((l) => {
      const g = openGate(l, ctx.now);
      return g?.gate === 'DG2' ? [{ l, g }] : [];
    })
    .sort((a, b) => a.g.slaEnd.localeCompare(b.g.slaEnd));
}

const stalePacks = (ctx: KpiCtx) => liveIn(ctx, 3).flatMap((l) => {
  const s = staleOf(ctx.tenant, l);
  return s ? [{ l, s }] : [];
});

/** "Addendum 2 received 08 Mar 09:12 changes 2 packages …" → "Addendum 2 received 08 Mar 09:12". */
const shortReason = (text: string) => text.replace(/^since \d\d:\d\d \((.*)\)$/, '$1').split(/ changes |: /)[0];

export const KPIS: KpiDef[] = [
  {
    id: 'DEC-1', label: 'Awaiting DG2', kind: 'state',
    info: {
      means: 'Bid / No-Bid packs issued and waiting for DG2, with positions recorded and time left',
      counted: 'Issued packs with no DG2 decision. The sub-line shows the one whose 24 h limit ends first: positions recorded, the quorum and the time left.',
      target: `Orange under ${STAGE_BANDS.dg2OrangeH} h left; red once breached`, source: 'Bid / No-Bid packs and DG2 records',
    },
    compute(ctx) {
      const list = awaiting(ctx);
      if (!list.length) return { display: '0', sub: 'No pack is waiting for DG2' };
      const { l, g } = list[0];
      const f = l.facts?.stage === 3 ? l.facts : null;
      const sees = can(ctx.viewer, 'see.positions', tenderCtx(ctx.tenant, l)).ok;
      const time = g.onTime ? `${hoursText(g.leftHours)} left` : `overdue by ${hoursText(g.leftHours)}`;
      const tone: Tone = !g.onTime ? 'red' : g.leftHours < STAGE_BANDS.dg2OrangeH ? 'orange' : 'ink';
      return {
        display: String(list.length), tone,
        sub: [sees && f ? `${f.positions.recorded} of ${f.positions.of} positions` : null, `quorum ${DG2_QUORUM}`, time].filter(Boolean).join(' · '),
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Awaiting DG2'), awaiting(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'DEC-8', label: 'Stale packs', kind: 'state',
    info: {
      means: 'Packs whose evidence changed after they were built, for example by an addendum. A committee must not decide on stale evidence',
      counted: 'Issued or draft Bid / No-Bid packs whose inputs changed after the pack was generated: an addendum, a new quote or a renewed credential.',
      target: '0 green; any issued pack stale red', source: 'Pack versions and change events',
    },
    compute(ctx) {
      const list = stalePacks(ctx);
      if (!list.length) return { display: '0', sub: 'Every pack is fresh', tone: 'green' };
      const issued = list.some((x) => x.l.facts?.stage === 3 && x.l.facts.pack === 'issued');
      const first = list[0];
      return { display: String(list.length), sub: `${first.l.tenderId} · ${shortReason(first.s.text)}`, tone: issued ? 'red' : 'orange' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Stale packs'), stalePacks(ctx).map((x) => x.l.tenderId)),
  },
];
