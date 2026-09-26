import type { Lifecycle, Result } from '@/data/gcc/lifecycle';
import { HANDOVER_DAYS, RATE_BANDS } from '@/data/gcc/targets';
import { TENANT_TARGETS } from '@/data/gcc/portfolio';
import { isGccTenantKey } from '@/data/gcc';
import { DEMO_TODAY } from '@/domain/calendar';
import type { KpiCtx, KpiDef } from './types';
import { daysBetween, dayText, idsDrill, isSmall, liveIn, pctOf, plural, qOf, rateTone, tileLabel } from './stages';

/**
 * Stage 9 · Results (plan 013 Phase 2.9, dashboards.md §10.12 and §11.7).
 * OUT-3 (Value won) comes from plan 015. Rates with fewer than five results
 * show their counts first, with a neutral tone (dashboards.md §2).
 */

const LOSS: Record<NonNullable<Result['lossReason']>, string> = {
  price: 'Price', technical: 'Technical', 'local-content': 'Local content', pq: 'Prequalification', other: 'Other',
};

export const hasLessons = (l: Lifecycle) => l.events.some((e) => e.kind === 'lessons' && e.at <= DEMO_TODAY + 'T23:59');

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
      means: 'Won ÷ (won + lost), for the results received in the period. Always shown with the count',
      counted: 'Results received in the period, won and lost. Withdrawn and cancelled tenders are left out.',
      target: 'The company target hit rate, judged only with five results or more', source: 'Bid results',
    },
    compute(ctx) {
      const list = qOf(ctx).resultsIn(ctx.window);
      if (!list.length) return { display: 'No results in this period' };
      const won = list.filter((x) => x.r.result === 'won').length;
      const lost = list.length - won;
      const pct = pctOf(won, list.length);
      if (isSmall(list.length)) return { display: `${won} won · ${lost} lost`, sub: `Win rate ${pct}% (n = ${list.length})`, smallSample: true, n: list.length };
      const target = isGccTenantKey(ctx.tenant) ? TENANT_TARGETS[ctx.tenant].hitRatePct : null;
      return {
        display: `${pct}%`, sub: `${won} won · ${lost} lost (n = ${list.length})${target ? ` · target ${target}%` : ''}`, n: list.length,
        ...(target ? { tone: pct >= target ? 'green' as const : 'orange' as const } : {}),
      };
    },
    drill: (ctx) => idsDrill(`From tile: Results · ${ctx.window.label}`, qOf(ctx).resultsIn(ctx.window).map((x) => x.l.tenderId)),
  },
  {
    id: 'RES-1', label: 'Results overdue', kind: 'state',
    info: {
      means: 'Results we should have heard by now. Worth a call to the employer',
      counted: "Submitted bids past the employer's expected award date, with no result yet.",
      target: '0 green; any orange', source: 'Submissions and expected award dates',
    },
    compute(ctx) {
      const list = overdue(ctx);
      if (!list.length) return { display: '0', sub: 'No result is overdue', tone: 'green' };
      return { display: String(list.length), sub: `${list[0].l.tenderId} · expected by ${dayText(list[0].by)}`, tone: 'orange' };
    },
  },
  {
    id: 'RES-2', label: 'Handovers pending', kind: 'state',
    info: {
      means: "Wins that haven't reached the delivery team yet. What we promised in the bid must reach them",
      counted: 'Won bids whose handover to delivery has not been held. The sub-line shows the days since award.',
      target: `Orange after ${HANDOVER_DAYS} days`, source: 'Results and handover records',
    },
    compute(ctx) {
      const list = handovers(ctx);
      if (!list.length) return { display: '0', sub: 'Every win is handed over', tone: 'green' };
      const first = list[0];
      return { display: String(list.length), sub: `${first.l.tenderId} · ${plural(first.days, 'day')} since award`, ...(first.days > HANDOVER_DAYS ? { tone: 'orange' as const } : {}) };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Handovers pending'), handovers(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'OUT-6', label: 'Why we lose', kind: 'flow',
    info: {
      means: 'The most common reason we lost, from the results in the period',
      counted: 'Loss reasons recorded on the bids lost in the period. A tie shows both.',
      target: 'None (information)', source: 'Bid results',
    },
    compute(ctx) {
      const lost = qOf(ctx).resultsIn(ctx.window, ['lost']);
      if (!lost.length) return { display: 'No losses in this period' };
      const counts = new Map<string, number>();
      for (const { r } of lost) { const k = LOSS[r.lossReason ?? 'other']; counts.set(k, (counts.get(k) ?? 0) + 1); }
      const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const top = sorted.filter(([, n]) => n === sorted[0][1]).map(([k]) => k);
      return { display: top.slice(0, 2).join(' · '), sub: sorted.slice(0, 3).map(([k, n]) => `${k} ${n}`).join(' · '), n: lost.length };
    },
    drill: (ctx) => idsDrill(`From tile: Losses · ${ctx.window.label}`, qOf(ctx).resultsIn(ctx.window, ['lost']).map((x) => x.l.tenderId)),
  },
  {
    id: 'RES-3', label: 'Lessons captured', kind: 'flow',
    info: {
      means: 'Whether we learn from every result, won or lost',
      counted: 'Results received in the period with a debrief or lessons record ÷ results received in the period.',
      target: '100% green; 80% or more orange', source: 'Results and lessons records',
    },
    compute(ctx) {
      const list = qOf(ctx).resultsIn(ctx.window);
      if (!list.length) return { display: 'No results in this period' };
      const done = list.filter((x) => hasLessons(x.l)).length;
      const pct = pctOf(done, list.length);
      if (isSmall(list.length)) return { display: `${done} of ${list.length}`, sub: `${pct}% of results`, smallSample: true, n: list.length };
      return { display: `${pct}%`, sub: `${done} of ${plural(list.length, 'result')}`, tone: rateTone(pct, RATE_BANDS['RES-3']), n: list.length };
    },
    drill: (ctx) => idsDrill(`From tile: Results without lessons · ${ctx.window.label}`, qOf(ctx).resultsIn(ctx.window).filter((x) => !hasLessons(x.l)).map((x) => x.l.tenderId)),
  },
];
