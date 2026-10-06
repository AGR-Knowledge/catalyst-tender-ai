import type { Tone } from '@/data/types';
import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Source } from '@/data/gcc/types';
import { money } from '@/domain/money';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { INTAKE_TARGET_MIN, queueFor } from '../s1';
import type { PeriodWindow } from '../period';
import type { DrillVM } from '../viewmodels';
import { dayText, idsDrill, liveIn, nearestRank, plural, qOf, STAGE_BANDS, tileLabel, wdTo } from './stages';
import type { KpiCtx, KpiDef } from './types';

/**
 * Stage 1 · Intake (plan 013 Phase 2.1, dashboards.md §10.4). The Tender
 * Coordinator's home: what came in, what must be checked, and which deadlines
 * are close. ⓘ texts: plain English, rewritten in plan 040.
 */

const route = (path: string): DrillVM | null => (isScreenBuilt(path) ? { kind: 'route', to: path } : null);

const sourcesOf = (tenant: string): Source[] => (isGccTenantKey(tenant) ? gccData(tenant).sources : []);

/** "Etimad 7 · portals 1 · email 2 · scanned 1": the busiest portal by name, then the rest by kind. */
function sourceSplit(tenant: string, bySource: Record<string, number>): string {
  return sourceParts(tenant, bySource).map(([label, n]) => `${label} ${n}`).join(' · ');
}

/** The split's parts: the busiest portal by name, then the rest by kind, each with its count. */
function sourceParts(tenant: string, bySource: Record<string, number>): [string, number][] {
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
  const parts: [string, number][] = lead ? [[leadName(lead[0]), lead[1]]] : [];
  for (const [label, test] of groups) {
    const n = Object.entries(bySource).filter(([id]) => id !== lead?.[0] && test(kindOf(id))).reduce((s, [, v]) => s + v, 0);
    if (n) parts.push([label, n]);
  }
  return parts;
}

/**
 * The detail line keeps two parts of the split: the busiest portal, then the
 * rest together ("Etimad 7 · others 4"). A portal name too long for the line
 * joins the other portals ("Portals 150 · others 185").
 */
function sourceDetail(tenant: string, bySource: Record<string, number>): string {
  const two = (parts: [string, number][]) => (parts.length <= 2 ? parts.map(([label, n]) => `${label} ${n}`).join(' · ')
    : `${parts[0][0]} ${parts[0][1]} · others ${parts.slice(1).reduce((s, [, n]) => s + n, 0)}`).replace(/^./, (c) => c.toUpperCase());
  const parts = sourceParts(tenant, bySource);
  const lead = parts[0];
  if (!lead || lead[0] === 'portals') return two(parts);
  // The lead portal back among the portals: "portals" first, then email, scanned and manual as before.
  const rest = parts.slice(1);
  const portals = lead[1] + (rest.find(([label]) => label === 'portals')?.[1] ?? 0);
  return fit(two(parts), two([['portals', portals], ...rest.filter(([label]) => label !== 'portals')]));
}

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a: about 24 characters), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 24) ?? options[options.length - 1];

/** "12 Mar": a reference line's date, without the weekday. */
const dm = (iso: string) => dayText(iso).replace(/^\w{3} /, '');

/** The reference line's period anchor, as on Live pipeline: "Since 7 Feb", "Since 9 Mar" (no year), "Since 00:00" for Today. */
const sinceKey = (w: PeriodWindow) => `Since ${w.key === 'today' ? w.startText : dm(w.from).replace(/ \d{4}$/, '')}`;

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
      means: 'How many tender notices reached us from portals, mailboxes and scanned post. It shows how widely we are looking.',
      counted: 'New notices received in the period from every source; repeats and addenda of a tender we already have are counted apart, as linked.',
      target: 'No target',
      source: 'Intake records',
    },
    compute(ctx) {
      const c = qOf(ctx).capturesIn(ctx.window);
      const prev = qOf(ctx).capturesIn(ctx.prev).captured;
      return {
        display: c.captured.toLocaleString('en-GB'),
        sub: c.captured ? sourceSplit(ctx.tenant, c.bySource) : `None captured · ${ctx.prev.label.toLowerCase()}: ${prev}`,
        detail: c.captured ? sourceDetail(ctx.tenant, c.bySource) : `${ctx.prev.label}: ${prev}`,
        ref: { k: sinceKey(ctx.window), v: c.captured ? plural(c.captured, 'notice') : 'None' },
        n: c.captured,
      };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-5', label: 'Fields to check', kind: 'state',
    info: {
      means: 'Details the AI read with low confidence, or read two different ways, for a person to check. Pursue stays locked while a blocking one is open.',
      counted: 'Open check items on live tenders, including items sent back to the AI; the age runs from when the item was raised.',
      target: `None older than ${STAGE_BANDS.queueOldestRedH} hours`,
      source: 'Intake check queue',
    },
    compute(ctx) {
      const items = openFields(ctx).flatMap((g) => g.items);
      if (!items.length) return { display: '0', sub: 'Nothing to check', detail: 'Nothing to check', ref: { k: 'Oldest', v: 'None' }, tone: 'green' };
      const blocking = items.filter((i) => i.item.blocksDg1).length;
      const oldest = items.reduce((a, b) => (b.ageMin > a.ageMin ? b : a));
      const tone: Tone = oldest.ageMin > STAGE_BANDS.queueOldestRedH * 60 ? 'red' : blocking ? 'orange' : 'ink';
      return { display: String(items.length), sub: `${blocking} block DG1 · oldest ${oldest.ageText}`, detail: `${blocking} block DG1`, ref: { k: 'Oldest', v: oldest.ageText }, tone, n: items.length };
    },
    drill: (ctx) => route('/intake-queue') ?? idsDrill(tileLabel(ctx, 'Fields to check'), openFields(ctx).map((g) => g.tenderId)),
  },
  {
    id: 'INT-2', label: 'Intake to logged', kind: 'flow',
    info: {
      means: 'How long a notice waits before it is logged with a tender ID. We watch the slow ones, because a slow tender is the one that gets missed.',
      counted: 'Minutes from a notice arriving to it being logged, for the slowest one in ten of the notices logged in the period.',
      target: `${INTAKE_TARGET_MIN} minutes or less`,
      source: 'Intake records',
    },
    compute(ctx) {
      const mins = qOf(ctx).capturesIn(ctx.window).minutes;
      const p90 = nearestRank(mins, 90);
      if (p90 === null) return { display: 'No notices logged', sub: 'in this period', detail: 'In this period', ref: { k: 'Worst', v: 'None' } };
      const tone: Tone = p90 <= INTAKE_TARGET_MIN ? 'green' : p90 <= STAGE_BANDS.intakeOrangeMin ? 'orange' : 'red';
      return { display: `${p90} min`, sub: `worst ${Math.max(...mins)} min`, detail: fit(`Slowest tenth of ${plural(mins.length, 'notice')}`, `${plural(mins.length, 'notice')} logged`), ref: { k: 'Worst', v: `${Math.max(...mins)} min` }, tone, n: mins.length };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-4', label: 'Sources healthy', kind: 'state',
    info: {
      means: 'Whether each portal and mailbox connection is working. A source that breaks quietly is how tenders get missed.',
      counted: 'Connections that reported healthy at their last check, out of all the connections set up.',
      target: 'All healthy',
      source: 'Portal and mailbox connections',
    },
    compute(ctx) {
      const s = sourcesOf(ctx.tenant);
      if (!s.length) return { display: 'No sources set up', detail: 'No connections set up', ref: { k: 'Worst', v: 'None' }, tone: 'muted' };
      const healthy = s.filter((x) => x.state === 'healthy').length;
      const worst = [...s].sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state])[0];
      const tone: Tone = worst.state === 'down' ? 'red' : worst.state === 'healthy' ? 'green' : 'orange';
      const why = worst.note ? worst.note.replace(/^./, (c) => c.toLowerCase()) : STATE_TEXT[worst.state];
      return {
        display: `${healthy} of ${s.length}`, sub: worst.state === 'healthy' ? 'Every connection is working' : `${worst.name}: ${why}`, tone,
        ...(worst.state === 'healthy' ? { detail: 'Every connection working', ref: { k: 'Worst', v: 'None' } } : { detail: fit(why, STATE_TEXT[worst.state]).replace(/^./, (c) => c.toUpperCase()), ref: { k: 'Worst', v: worst.name.replace(/\s*\(.*\)$/, '') } }),
      };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-3', label: 'Missed tenders', kind: 'flow',
    info: {
      means: 'Tenders on a portal’s daily list that we did not log. It should always be zero.',
      counted: 'Notices the daily cross-checks found on a portal’s list but not in our register, in the period.',
      target: 'None',
      source: 'Daily portal cross-checks',
    },
    compute(ctx) {
      const missed = qOf(ctx).capturesIn(ctx.window).missed;
      const recon = isGccTenantKey(ctx.tenant) ? gccData(ctx.tenant).reconciliation : null;
      return {
        display: String(missed), tone: missed ? 'red' : 'green',
        sub: recon ? `last reconciled ${recon.at.slice(11, 16)} · ${plural(recon.sources, 'source')}` : undefined,
        detail: recon ? `Last reconciled ${recon.at.slice(11, 16)}` : 'No reconciliation run',
        ref: { k: 'Target', v: '0' },
      };
    },
    drill: () => route('/radar'),
  },
  {
    id: 'INT-10', label: 'Documents to buy', kind: 'state',
    info: {
      means: 'Tenders whose documents must be bought before they can be downloaded. The platform never pays; a person approves each purchase.',
      counted: 'Live tenders in Intake whose documents are sold and not yet bought.',
      target: `Bought over ${STAGE_BANDS.bookletWd} working days before sales close`,
      source: 'Tender records',
    },
    compute(ctx) {
      const list = toBuy(ctx);
      if (!list.length) return { display: '0', sub: 'Every booklet is in hand', detail: 'Every booklet is in hand', ref: { k: 'Next', v: 'None' } };
      const { l, d } = list[0];
      const approved = !!ctx.done[`booklet-approved:${l.tenderId}`];
      const tone: Tone = wdTo(ctx.tenant, l, d.purchaseBy) <= STAGE_BANDS.bookletWd ? 'orange' : 'ink';
      return {
        display: String(list.length), tone,
        sub: `${l.tenderId} · ${money(d.fee.amount, d.fee.ccy)} · closes ${dayText(d.purchaseBy)}${approved ? ' · approved, to buy' : ''}`,
        detail: approved ? `${l.tenderId} · approved` : `${l.tenderId} · ${money(d.fee.amount, d.fee.ccy)}`,
        ref: { k: 'Next', v: `closes ${dm(d.purchaseBy)}` },
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Documents to buy'), toBuy(ctx).map((x) => x.l.tenderId)),
  },
];
