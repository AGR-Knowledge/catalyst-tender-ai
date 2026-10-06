import { RIVALS, type Rival } from '@/data/gcc/debriefs';
import { WIN_SHORT, groupOf } from '@/data/gcc/debriefs/vocab';
import { DBR3_WAIT_DAYS, DEBRIEF_DUE_DAYS, RATE_BANDS } from '@/data/gcc/targets';
import { workingDaysBetween } from '@/domain/calendar';
import { endedIn } from '../debriefs/archive';
import { recordsFor, type DebriefEntry } from '../debriefs/records';
import { dmText } from '../debriefs/text';
import type { PeriodWindow } from '../period';
import type { KpiCtx, KpiDef } from './types';
import { ccOf, daysBetween, idsDrill, isSmall, pctOf, plural, rateTone, tileLabel } from './stages';

/**
 * Debriefs (plan 035 step 4.3, catalogue §A.5): how many bids ended, how many
 * debriefs the Head of Tendering accepted, what waits for sign-off or is
 * overdue, and what the accepted debriefs say about why we win and who beats
 * us. DBR-1, 2, 4, 5 and 6 count endings whose ended time is in the period;
 * DBR-5 and DBR-6 read accepted debriefs only; DBR-3 is the company now.
 * They read `recordsFor` and `endedIn`, as the archive and the action rows do.
 */

const dctx = (ctx: KpiCtx) => ({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done, now: ctx.now });
const ended = (ctx: KpiCtx) => endedIn(dctx(ctx), ctx.window);
const ids = (xs: DebriefEntry[]) => xs.map((e) => e.l.tenderId);
const oldestFirst = (a: DebriefEntry, b: DebriefEntry) => a.record.endedAt.localeCompare(b.record.endedAt) || a.l.tenderId.localeCompare(b.l.tenderId);

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a; 22 characters, since six tiles share the row here), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 22) ?? options[options.length - 1];

/** "Since 9 Mar", "Since 00:00" for Today, as on Stage 9's tiles. */
const sinceKey = (w: PeriodWindow) => `Since ${w.key === 'today' ? w.startText : dmText(w.from).replace(/ \d{4}$/, '')}`;

const accepted = (xs: DebriefEntry[]) => xs.filter((e) => e.status === 'accepted');

/** Debriefs waiting for sign-off, the longest waiting first. */
const awaiting = (ctx: KpiCtx) => recordsFor(dctx(ctx))
  .filter((e) => e.status === 'submitted')
  .sort((a, b) => a.record.submission!.at.localeCompare(b.record.submission!.at) || a.l.tenderId.localeCompare(b.l.tenderId));

const overdueIn = (ctx: KpiCtx) => ended(ctx).filter((e) => e.status === 'overdue').sort(oldestFirst);

/** Counts by label, the most first; a tie keeps the labels in order. */
function tally(labels: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const k of labels) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const top = (sorted: [string, number][]) => sorted.filter(([, n]) => n === sorted[0][1]).map(([k]) => k).slice(0, 2);

const rivalsOf = (tenant: string): Rival[] => (RIVALS as Record<string, Rival[]>)[tenant] ?? [];

/** Accepted losses that name one of the tenant's rivals as the winner, and the rivals named most. */
function beaten(ctx: KpiCtx) {
  const lost = accepted(ended(ctx)).filter((e) => e.record.ending === 'lost');
  const rivals = rivalsOf(ctx.tenant);
  const named = lost.flatMap((e) => { const r = rivals.find((x) => x.id === e.record.submission!.rivalId); return r ? [{ e, r }] : []; });
  const counts = rivals.map((r) => ({ r, xs: named.filter((x) => x.r.id === r.id).map((x) => x.e) })).filter((x) => x.xs.length)
    .sort((a, b) => b.xs.length - a.xs.length || a.r.short.localeCompare(b.r.short));
  const most = counts.filter((x) => x.xs.length === counts[0]?.xs.length).slice(0, 2);
  return { lost, most };
}

export const KPIS: KpiDef[] = [
  {
    id: 'DBR-1', label: 'Endings', kind: 'flow', cap: 'debrief.view',
    info: {
      means: 'Bids that ended in the period: won, lost or stopped. Each one needs a debrief.',
      counted: 'Bids with a result, a cancellation, a withdrawal, a No-Bid at DG2 or a rejection at DG3 in the period; tenders discarded or left on hold at DG1 are left out.',
      target: 'No target',
      source: 'Results, gate decisions and debriefs',
    },
    compute(ctx) {
      const list = ended(ctx);
      const sectors = new Set(list.map((e) => e.l.sector)).size;
      const ref = { k: sinceKey(ctx.window), v: sectors ? plural(sectors, 'sector') : 'None' };
      if (!list.length) return { display: '0', sub: 'No bid ended in this period', detail: 'No bid ended', ref };
      const won = list.filter((e) => e.record.ending === 'won').length;
      const lost = list.filter((e) => e.record.ending === 'lost').length;
      const stopped = list.filter((e) => groupOf(e.record.ending) === 'stopped').length;
      const sub = `${won} won · ${lost} lost · ${stopped} stopped`;
      // Too long for the detail line: the stopped count moves to the foot, and the sub keeps all three.
      const short = sub.length > 22;
      return { display: String(list.length), sub, detail: short ? `${won} won · ${lost} lost` : sub, ref: short ? { k: 'Stopped', v: String(stopped) } : ref, n: list.length };
    },
    drill: (ctx) => idsDrill(`From tile: Endings · ${ctx.window.label}`, ids(ended(ctx))),
  },
  {
    id: 'DBR-2', label: 'Debriefs accepted', kind: 'flow', cap: 'debrief.view',
    info: {
      means: 'Whether every bid that ends leaves its lessons behind.',
      counted: 'Bids that ended in the period with a debrief the Head of Tendering accepted, out of all the bids that ended.',
      target: `${RATE_BANDS['DBR-2'].green}% of endings`,
      source: 'Debriefs',
    },
    compute(ctx) {
      const list = ended(ctx);
      const ref = { k: 'Target', v: `${RATE_BANDS['DBR-2'].green}%` };
      if (!list.length) return { display: 'No endings in this period', detail: 'Nothing to debrief', ref };
      const done = accepted(list).length;
      const pct = pctOf(done, list.length);
      if (isSmall(list.length)) return { display: `${done} of ${list.length}`, sub: `${pct}% of endings`, detail: `${pct}% of endings`, ref, smallSample: true, n: list.length };
      const detail = `${done} of ${plural(list.length, 'ending')}`;
      return { display: `${pct}%`, sub: detail, detail, ref, tone: rateTone(pct, RATE_BANDS['DBR-2']), n: list.length };
    },
    drill: (ctx) => idsDrill(`From tile: Endings without an accepted debrief · ${ctx.window.label}`, ids(ended(ctx).filter((e) => e.status !== 'accepted'))),
  },
  {
    id: 'DBR-3', label: 'Awaiting sign-off', kind: 'state', cap: 'debrief.view',
    info: {
      means: 'Debriefs the Project Director sent that wait for the Head of Tendering to accept or send back.',
      counted: 'Debriefs submitted and not yet accepted or sent back, whenever the bid ended.',
      target: `Signed off within ${plural(DBR3_WAIT_DAYS, 'working day')}`,
      source: 'Debriefs',
    },
    compute(ctx) {
      const list = awaiting(ctx);
      if (!list.length) return { display: '0', sub: 'Nothing waits for sign-off', detail: 'Nothing waits for sign-off', ref: { k: 'Oldest', v: 'None' } };
      const first = list[0];
      const at = first.record.submission!.at;
      const days = daysBetween(at, ctx.now);
      const wd = workingDaysBetween(at.slice(0, 10), ctx.now.slice(0, 10), ccOf(ctx.tenant, first.l));
      const detail = days > 0 ? `Oldest waiting ${plural(days, 'day')}` : 'Submitted today';
      return { display: String(list.length), sub: `${first.l.tenderId} · ${detail.toLowerCase()}`, detail, ref: { k: 'Oldest', v: first.l.tenderId }, ...(wd > DBR3_WAIT_DAYS ? { tone: 'orange' as const } : {}) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Awaiting sign-off'), ids(awaiting(ctx))),
  },
  {
    id: 'DBR-4', label: 'Debriefs overdue', kind: 'flow', cap: 'debrief.view',
    info: {
      means: 'Bids that ended over two weeks ago with no debrief, while the team still remembers.',
      counted: `Bids that ended in the period whose debrief, due ${DEBRIEF_DUE_DAYS} days after the ending, has not been submitted.`,
      target: 'None',
      source: 'Debriefs',
    },
    compute(ctx) {
      const list = overdueIn(ctx);
      if (!list.length) return { display: '0', sub: 'None overdue', detail: 'None overdue', ref: { k: 'Oldest', v: 'None' }, tone: 'green' };
      const first = list[0];
      return { display: String(list.length), sub: `${first.l.tenderId} · ended ${dmText(first.record.endedAt)}`, detail: fit(`Oldest ended ${dmText(first.record.endedAt)}`, `Ended ${dmText(first.record.endedAt)}`), ref: { k: 'Oldest', v: first.l.tenderId }, tone: 'orange', n: list.length };
    },
    drill: (ctx) => idsDrill(`From tile: Debriefs overdue · ${ctx.window.label}`, ids(overdueIn(ctx))),
  },
  {
    id: 'DBR-5', label: 'Why we win', kind: 'flow', cap: 'debrief.view',
    info: {
      means: 'The most common main reason we won in the period.',
      counted: 'The main win reason in each accepted debrief of a bid won in the period; a tie shows both.',
      target: 'No target',
      source: 'Debriefs',
    },
    compute(ctx) {
      const wins = ended(ctx).filter((e) => e.record.ending === 'won');
      const read = accepted(wins);
      const k = sinceKey(ctx.window);
      if (!read.length) return { display: wins.length ? 'No win debriefed yet' : 'No wins in this period', detail: 'No win reasons recorded', ref: { k, v: wins.length ? plural(wins.length, 'win') : 'None' } };
      const sorted = tally(read.map((e) => WIN_SHORT[e.record.submission!.main ?? 'other'] ?? WIN_SHORT.other));
      const sub = sorted.slice(0, 3).map(([x, n]) => `${x} ${n}`).join(' · ');
      const v = read.length === wins.length ? plural(wins.length, 'win') : `${read.length} of ${plural(wins.length, 'win')}`;
      return { display: top(sorted).join(' · '), sub, detail: fit(sub, sorted.slice(0, 2).map(([x, n]) => `${x} ${n}`).join(' · ')), ref: { k, v }, n: read.length };
    },
    drill: (ctx) => idsDrill(`From tile: Wins debriefed · ${ctx.window.label}`, ids(accepted(ended(ctx).filter((e) => e.record.ending === 'won')))),
  },
  {
    id: 'DBR-6', label: 'Who beats us', kind: 'flow', cap: 'debrief.view',
    info: {
      means: 'The rival who beat us most often in the period.',
      counted: 'The winner named in each accepted debrief of a bid we lost in the period, leaving out “another bidder” and “not known”; a tie shows both.',
      target: 'No target',
      source: 'Debriefs',
    },
    compute(ctx) {
      const { lost, most } = beaten(ctx);
      if (!most.length) {
        return { display: lost.length ? 'No rival named' : 'No losses debriefed', detail: lost.length ? 'No debrief names a rival' : 'No losses debriefed', ref: { k: sinceKey(ctx.window), v: 'None' } };
      }
      const n = most[0].xs.length;
      const sectors = tally(most.flatMap((x) => x.xs.map((e) => e.l.sector))).map(([s]) => s);
      const detail = `${n} of ${plural(lost.length, 'loss', 'losses')}`;
      // The foot holds about 15 characters after "Sectors": the list, the most common and a count, or the count.
      const v = [sectors.join(', '), `${sectors[0]} +${sectors.length - 1}`].find((x, i) => x.length <= 15 && (i === 0 || sectors.length > 1)) ?? String(sectors.length);
      return { display: most.map((x) => x.r.short).join(' · '), sub: `${most.map((x) => x.r.name).join(' · ')} · ${detail} · ${sectors.join(', ')}`, detail, ref: { k: 'Sectors', v }, n: lost.length };
    },
    drill: (ctx) => idsDrill(`From tile: Who beats us · ${ctx.window.label}`, beaten(ctx).most.flatMap((x) => ids(x.xs))),
  },
];
