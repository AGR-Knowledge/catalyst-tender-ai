import { LOSS_LABEL } from '@/data/gcc/debriefs/vocab';
import { HANDOVER_DAYS, MIN_N, RATE_BANDS } from '@/data/gcc/targets';
import { TENANT_TARGETS } from '@/data/gcc/portfolio';
import { isGccTenantKey } from '@/data/gcc';
import { DEMO_TODAY } from '@/domain/calendar';
import { hasLessons } from '../debriefs/endings';
import type { PeriodWindow } from '../period';
import type { KpiCtx, KpiDef } from './types';
import { daysBetween, dayText, idsDrill, isSmall, liveIn, pctOf, plural, qOf, rateTone, tileLabel } from './stages';

/**
 * Stage 9 · Results (plan 013 Phase 2.9, dashboards.md §10.12 and §11.7).
 * OUT-3 (Value won) comes from plan 015. Rates with fewer than five results
 * show their counts first, with a neutral tone (dashboards.md §2).
 */

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a: about 24 characters), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 24) ?? options[options.length - 1];

/** "5 Mar": a reference line's date, without the weekday. */
const dm = (iso: string) => dayText(iso).replace(/^\w{3} /, '');

/** The reference line's period anchor, as on Live pipeline: "Since 7 Feb", "Since 9 Mar" (no year), "Since 00:00" for Today. */
const sinceKey = (w: PeriodWindow) => `Since ${w.key === 'today' ? w.startText : dm(w.from).replace(/ \d{4}$/, '')}`;

/** Lessons recorded by demo day: one predicate, shared with the debriefs' seed (plan 035), so Accepted and Lessons captured agree. */
export { hasLessons };

/** Submitted bids past the employer's expected award date with no result. */
export const overdue = (ctx: KpiCtx) => qOf(ctx).live()
  .flatMap((l) => (l.facts?.stage === 8 && l.submission && !l.result && l.facts.expectedAwardBy && l.facts.expectedAwardBy < DEMO_TODAY ? [{ l, by: l.facts.expectedAwardBy }] : []))
  .sort((a, b) => a.by.localeCompare(b.by));

/** Wins not yet handed over to delivery. */
export const handovers = (ctx: KpiCtx) => liveIn(ctx, 9)
  .filter((l) => l.result?.result === 'won' && !l.events.some((e) => e.kind === 'handover' && e.at <= ctx.now))
  .map((l) => ({ l, days: daysBetween(l.result!.at, ctx.now) }))
  .sort((a, b) => b.days - a.days);

export const KPIS: KpiDef[] = [
  {
    id: 'OUT-1', label: 'Hit rate', kind: 'flow',
    info: {
      means: 'The share of results we won in the period. Read it with the number of results behind it.',
      counted: 'Bids won out of bids won and lost in the period; withdrawn and cancelled tenders are left out.',
      target: `The company’s win target, from ${MIN_N} results`,
      source: 'Bid results',
    },
    compute(ctx) {
      const list = qOf(ctx).resultsIn(ctx.window);
      const target = isGccTenantKey(ctx.tenant) ? TENANT_TARGETS[ctx.tenant].hitRatePct : null;
      // Under five results the rate isn't judged yet; the line says when it will be, as on Win & Loss (PF-3).
      const early = target ? { ref: { k: 'Target', v: `${target}% from ${MIN_N} results` }, infoTarget: `${target}% or more, judged from ${MIN_N} results` } : {};
      if (!list.length) return { display: 'No results in this period', detail: 'Nothing won or lost', ...early };
      const won = list.filter((x) => x.r.result === 'won').length;
      const lost = list.length - won;
      const pct = pctOf(won, list.length);
      if (isSmall(list.length)) return { display: `${won} won · ${lost} lost`, sub: `Win rate ${pct}% (n = ${list.length})`, detail: `Win rate ${pct}%`, ...early, smallSample: true, n: list.length };
      return {
        display: `${pct}%`, sub: `${won} won · ${lost} lost (n = ${list.length})${target ? ` · target ${target}%` : ''}`, n: list.length,
        detail: `${won} won · ${lost} lost`,
        // Orange here is already under the target hit rate, as on Win & Loss (PF-3).
        ...(target ? { ref: { k: 'Target', v: `${target}%` }, infoTarget: early.infoTarget, tone: pct >= target ? 'green' as const : 'orange' as const, ...(pct < target ? { status: 'Below target' } : {}) } : {}),
      };
    },
    drill: (ctx) => idsDrill(`From tile: Results · ${ctx.window.label}`, qOf(ctx).resultsIn(ctx.window).map((x) => x.l.tenderId)),
  },
  {
    id: 'RES-1', label: 'Results overdue', kind: 'state',
    info: {
      means: 'Results we should have heard by now. Worth a call to the employer.',
      counted: 'Submitted bids past the employer’s expected award date with no result yet.',
      target: 'None',
      source: 'Submissions and award dates',
    },
    compute(ctx) {
      const list = overdue(ctx);
      if (!list.length) return { display: '0', sub: 'No result is overdue', detail: 'No result is overdue', ref: { k: 'Oldest', v: 'None' }, tone: 'green' };
      return { display: String(list.length), sub: `${list[0].l.tenderId} · expected by ${dayText(list[0].by)}`, detail: `Expected by ${dm(list[0].by)}`, ref: { k: 'Oldest', v: list[0].l.tenderId }, tone: 'orange' };
    },
  },
  {
    id: 'RES-2', label: 'Handovers pending', kind: 'state',
    info: {
      means: 'Wins that have not reached the delivery team yet. What we promised in the bid must reach them.',
      counted: 'Won bids whose handover to delivery has not been held; underneath, the days since the award.',
      target: `Within ${HANDOVER_DAYS} days of the award`,
      source: 'Results and handovers',
    },
    compute(ctx) {
      const list = handovers(ctx);
      if (!list.length) return { display: '0', sub: 'Every win is handed over', detail: 'Every win is handed over', ref: { k: 'Oldest', v: 'None' }, tone: 'green' };
      const first = list[0];
      return { display: String(list.length), sub: `${first.l.tenderId} · ${plural(first.days, 'day')} since award`, detail: `${plural(first.days, 'day')} since award`, ref: { k: 'Oldest', v: first.l.tenderId }, ...(first.days > HANDOVER_DAYS ? { tone: 'orange' as const } : {}) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Handovers pending'), handovers(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'OUT-6', label: 'Why we lose', kind: 'flow',
    info: {
      means: 'The most common reason we lost in the period.',
      counted: 'The loss reason recorded on each bid lost in the period; a tie shows both.',
      target: 'No target',
      source: 'Bid results',
    },
    compute(ctx) {
      const lost = qOf(ctx).resultsIn(ctx.window, ['lost']);
      if (!lost.length) return { display: 'No losses in this period', detail: 'No loss reasons recorded', ref: { k: sinceKey(ctx.window), v: 'None' } };
      const counts = new Map<string, number>();
      for (const { r } of lost) { const k = LOSS_LABEL[r.lossReason ?? 'other']; counts.set(k, (counts.get(k) ?? 0) + 1); }
      const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const top = sorted.filter(([, n]) => n === sorted[0][1]).map(([k]) => k);
      const sub = sorted.slice(0, 3).map(([k, n]) => `${k} ${n}`).join(' · ');
      return { display: top.slice(0, 2).join(' · '), sub, detail: fit(sub, sorted.slice(0, 2).map(([k, n]) => `${k} ${n}`).join(' · ')), ref: { k: sinceKey(ctx.window), v: plural(lost.length, 'loss', 'losses') }, n: lost.length };
    },
    drill: (ctx) => idsDrill(`From tile: Losses · ${ctx.window.label}`, qOf(ctx).resultsIn(ctx.window, ['lost']).map((x) => x.l.tenderId)),
  },
  {
    id: 'RES-3', label: 'Lessons captured', kind: 'flow',
    info: {
      means: 'Whether we learn from every result, won or lost.',
      counted: 'Results received in the period that have a debrief the Head of Tendering accepted, out of all results received.',
      target: 'Every result',
      source: 'Results and debriefs',
    },
    compute(ctx) {
      const list = qOf(ctx).resultsIn(ctx.window);
      const ref = { k: 'Target', v: `${RATE_BANDS['RES-3'].green}%` };
      if (!list.length) return { display: 'No results in this period', detail: 'No results to debrief', ref };
      const done = list.filter((x) => hasLessons(x.l)).length;
      const pct = pctOf(done, list.length);
      if (isSmall(list.length)) return { display: `${done} of ${list.length}`, sub: `${pct}% of results`, detail: `${pct}% of results`, ref, smallSample: true, n: list.length };
      return { display: `${pct}%`, sub: `${done} of ${plural(list.length, 'result')}`, detail: `${done} of ${plural(list.length, 'result')}`, ref, tone: rateTone(pct, RATE_BANDS['RES-3']), n: list.length };
    },
    drill: (ctx) => idsDrill(`From tile: Results without lessons · ${ctx.window.label}`, qOf(ctx).resultsIn(ctx.window).filter((x) => !hasLessons(x.l)).map((x) => x.l.tenderId)),
  },
];
