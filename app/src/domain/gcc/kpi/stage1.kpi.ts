import type { Tone } from '@/data/types';
import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Source } from '@/data/gcc/types';
import { money } from '@/domain/money';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { INTAKE_TARGET_MIN, queueFor } from '../s1';
import type { DrillVM } from '../viewmodels';
import { dayText, idsDrill, liveIn, nearestRank, plural, qOf, STAGE_BANDS, tileLabel, wdTo } from './stages';
import type { KpiCtx, KpiDef } from './types';

/**
 * Stage 1 · Intake (plan 013 Phase 2.1, dashboards.md §10.4). The Tender
 * Coordinator's home: what came in, what must be checked, and which deadlines
 * are close. ⓘ texts are dashboards.md §11.9, verbatim.
 */

const route = (path: string): DrillVM | null => (isScreenBuilt(path) ? { kind: 'route', to: path } : null);

const sourcesOf = (tenant: string): Source[] => (isGccTenantKey(tenant) ? gccData(tenant).sources : []);

/** "Etimad 7 · portals 1 · email 2 · scanned 1": the busiest portal by name, then the rest by kind. */
function sourceSplit(tenant: string, bySource: Record<string, number>): string {
  const sources = sourcesOf(tenant);
  const kindOf = (id: string) => sources.find((s) => s.id === id)?.kind ?? 'manual';
  const lead = Object.entries(bySource)
    .filter(([id, n]) => n > 0 && kindOf(id) === 'portal')
    .sort((a, b) => b[1] - a[1])[0];
  const groups: [string, (k: Source['kind']) => boolean][] = [
    ['portals', (k) => k === 'portal' || k === 'client-portal'],
    ['email', (k) => k === 'mailbox'],
    ['scanned', (k) => k === 'scan'],
    ['manual', (k) => k === 'manual'],
  ];
  // The lead portal's name without its qualifier, to fit the tile: "Monaqasat (Ministry of Finance)" reads "Monaqasat".
  const leadName = (id: string) => (sources.find((s) => s.id === id)?.name ?? id).replace(/\s*\(.*\)$/, '');
  const parts = lead ? [`${leadName(lead[0])} ${lead[1]}`] : [];
  for (const [label, test] of groups) {
    const n = Object.entries(bySource).filter(([id]) => id !== lead?.[0] && test(kindOf(id))).reduce((s, [, v]) => s + v, 0);
    if (n) parts.push(`${label} ${n}`);
  }
  return parts.join(' · ');
}

const STATE_RANK: Record<Source['state'], number> = { down: 0, degraded: 1, 'credentials-expiring': 2, healthy: 3 };
const STATE_TEXT: Record<Source['state'], string> = { down: 'down', degraded: 'degraded', 'credentials-expiring': 'credentials expiring', healthy: 'healthy' };

/** The intake queue's open items on tenders the viewer may open (007a's `queueFor`, blockers first). */
export function openFields(ctx: KpiCtx) {
  const q = qOf(ctx);
  return queueFor(ctx.tenant, ctx.done as Record<string, string>).filter((g) => {
    const l = q.one(g.tenderId);
    return !!l && !l.closedAt;
  });
}

/** Live Stage 1 tenders whose booklet must be bought, soonest purchase deadline first. */
export function toBuy(ctx: KpiCtx) {
  return liveIn(ctx, 1)
    .flatMap((l) => (l.facts?.stage === 1 && l.facts.documents !== 'downloaded' ? [{ l, d: l.facts.documents }] : []))
    .sort((a, b) => a.d.purchaseBy.localeCompare(b.d.purchaseBy));
}

export const KPIS: KpiDef[] = [
  {
    id: 'INT-1', label: 'Captured', labelToday: 'Captured today', kind: 'flow',
    info: {
      means: 'Tender notices the platform picked up from your portals, mailboxes and scanned post',
      counted: 'Notices received in the period, all sources. Duplicates and addenda are counted once, under Linked.',
      target: 'None (information)', source: 'Intake events',
    },
    compute(ctx) {
      const c = qOf(ctx).capturesIn(ctx.window);
      const prev = qOf(ctx).capturesIn(ctx.prev).captured;
      return {
        display: c.captured.toLocaleString('en-GB'),
        sub: c.captured ? sourceSplit(ctx.tenant, c.bySource) : `None captured · ${ctx.prev.label.toLowerCase()}: ${prev}`,
        n: c.captured,
      };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-5', label: 'Fields to check', kind: 'state',
    info: {
      means: 'Values the agent read with low confidence, or read two different ways. A person checks them. Pursue stays locked while blocking ones are open',
      counted: 'Open items in the intake queue on live tenders, including items sent back to the agent. The age runs from when the agent raised the item.',
      target: `0. Any blocking DG1 is orange; the oldest over ${STAGE_BANDS.queueOldestRedH} h is red`, source: 'Validation items',
    },
    compute(ctx) {
      const items = openFields(ctx).flatMap((g) => g.items);
      if (!items.length) return { display: '0', sub: 'Nothing to check', tone: 'green' };
      const blocking = items.filter((i) => i.item.blocksDg1).length;
      const oldest = items.reduce((a, b) => (b.ageMin > a.ageMin ? b : a));
      const tone: Tone = oldest.ageMin > STAGE_BANDS.queueOldestRedH * 60 ? 'red' : blocking ? 'orange' : 'ink';
      return { display: String(items.length), sub: `${blocking} block DG1 · oldest ${oldest.ageText}`, tone, n: items.length };
    },
    drill: (ctx) => route('/intake-queue') ?? idsDrill(tileLabel(ctx, 'Fields to check'), openFields(ctx).map((g) => g.tenderId)),
  },
  {
    id: 'INT-2', label: 'Intake to logged', kind: 'flow',
    info: {
      means: 'How long it takes from a notice arriving to it being logged with an ID. The slowest tenth is shown, because one slow tender is the one that gets missed',
      counted: 'The 90th percentile (nearest rank) of the minutes from receipt to TID, over the notices logged in the period. The worst one is in the sub-line.',
      target: `${INTAKE_TARGET_MIN} min or less (green); up to ${STAGE_BANDS.intakeOrangeMin} min orange`, source: 'Intake events with timestamps',
    },
    compute(ctx) {
      const mins = qOf(ctx).capturesIn(ctx.window).minutes;
      const p90 = nearestRank(mins, 90);
      if (p90 === null) return { display: 'No notices logged', sub: 'in this period' };
      const tone: Tone = p90 <= INTAKE_TARGET_MIN ? 'green' : p90 <= STAGE_BANDS.intakeOrangeMin ? 'orange' : 'red';
      return { display: `${p90} min`, sub: `worst ${Math.max(...mins)} min`, tone, n: mins.length };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-4', label: 'Sources healthy', kind: 'state',
    info: {
      means: 'Whether each portal and mailbox connection is working. A silent broken source is how tenders get missed',
      counted: 'Connections reporting Healthy ÷ connections configured, at their last poll. The worst one is named in the sub-line.',
      target: 'All healthy (green); any degraded or expiring orange; any down red', source: 'Connector records',
    },
    compute(ctx) {
      const s = sourcesOf(ctx.tenant);
      if (!s.length) return { display: 'No sources set up', tone: 'muted' };
      const healthy = s.filter((x) => x.state === 'healthy').length;
      const worst = [...s].sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state])[0];
      const tone: Tone = worst.state === 'down' ? 'red' : worst.state === 'healthy' ? 'green' : 'orange';
      const why = worst.note ? worst.note.replace(/^./, (c) => c.toLowerCase()) : STATE_TEXT[worst.state];
      return { display: `${healthy} of ${s.length}`, sub: worst.state === 'healthy' ? 'Every connection is working' : `${worst.name}: ${why}`, tone };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-3', label: 'Missed tenders', kind: 'flow',
    info: {
      means: "Tenders on a portal's daily list that we didn't log. It should always be zero",
      counted: "Notices the daily reconciliations found on a portal's list but not in the register, over the reconciliations run in the period.",
      target: '0 (green); 1 or more red', source: 'Reconciliation runs',
    },
    compute(ctx) {
      const missed = qOf(ctx).capturesIn(ctx.window).missed;
      const recon = isGccTenantKey(ctx.tenant) ? gccData(ctx.tenant).reconciliation : null;
      return {
        display: String(missed), tone: missed ? 'red' : 'green',
        sub: recon ? `last reconciled ${recon.at.slice(11, 16)} · ${plural(recon.sources, 'source')}` : undefined,
      };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-10', label: 'Documents to buy', kind: 'state',
    info: {
      means: 'Tenders whose booklet must be bought before it can be downloaded. The platform never pays; a person approves the purchase',
      counted: 'Live Stage 1 tenders whose documents are sold and not yet bought. The sub-line names the one whose purchase closes first.',
      target: `Orange when a purchase closes within ${STAGE_BANDS.bookletWd} working days`, source: 'Tender records: document fee and purchase deadline',
    },
    compute(ctx) {
      const list = toBuy(ctx);
      if (!list.length) return { display: '0', sub: 'Every booklet is in hand' };
      const { l, d } = list[0];
      const approved = !!ctx.done[`booklet-approved:${l.tenderId}`];
      const tone: Tone = wdTo(ctx.tenant, l, d.purchaseBy) <= STAGE_BANDS.bookletWd ? 'orange' : 'ink';
      return {
        display: String(list.length), tone,
        sub: `${l.tenderId} · ${money(d.fee.amount, d.fee.ccy)} · closes ${dayText(d.purchaseBy)}${approved ? ' · approved, to buy' : ''}`,
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Documents to buy'), toBuy(ctx).map((x) => x.l.tenderId)),
  },
];
