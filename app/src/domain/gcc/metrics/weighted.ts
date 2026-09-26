import type { Lifecycle } from '@/data/gcc/lifecycle';
import type { Ccy } from '@/data/gcc/fx';
import { can } from '@/data/access';
import { money } from '@/domain/money';
import { tenderCtx } from '../lifecycle';
import type { KpiCtx } from '../kpi/types';

/**
 * Win-probability-weighted value, the same rule as DEC-4 "Weighted pipeline"
 * (kpi/portfolio.kpi.ts): value × win probability, over bids whose Bid / No-Bid
 * pack has been issued. Earlier tenders have no probability yet, and no later
 * stage's facts carry one, so only Stage 3 bids with an issued pack are
 * weighted. A viewer counts only the tenders whose probability they may see
 * (`see.positions`, asked tender by tender: a Bid Manager sees only his own).
 */

/** The win probability (%) of a bid with an issued pack; null for any other tender. */
export const winP = (l: Lifecycle): number | null => (l.facts?.stage === 3 && l.facts.pack === 'issued' ? l.facts.win.p : null);

const seesWin = (ctx: KpiCtx, l: Lifecycle) => can(ctx.viewer, 'see.positions', tenderCtx(ctx.tenant, l)).ok;

/** One point of the graph: `value` is null when no tender here has a probability this viewer may see. */
export interface Weighed { value: number | null; counted: number; masked: number; tenders: number }

export function weigh(ctx: KpiCtx, ls: Lifecycle[], valueOf: (l: Lifecycle) => number): Weighed {
  const withP = ls.filter((l) => winP(l) !== null);
  const seen = withP.filter((l) => seesWin(ctx, l));
  return {
    value: seen.length ? seen.reduce((s, l) => s + (valueOf(l) * winP(l)!) / 100, 0) : null,
    counted: seen.length, masked: withP.length - seen.length, tenders: ls.length,
  };
}

/** Offered unless every probability in view is masked for this viewer (dashboards.md §6: then there is no Weighted button). */
export function weightedOffered(ctx: KpiCtx, ls: Lifecycle[]): boolean {
  const withP = ls.filter((l) => winP(l) !== null);
  return !withP.length || withP.some((l) => seesWin(ctx, l));
}

/** What a point without a bar says in its tooltip. */
export function weighedText(w: Weighed, money: (v: number) => string): string {
  if (w.value !== null) return money(w.value);
  if (w.masked) return 'Masked for your role';
  return w.tenders ? 'No win probability yet' : money(0);
}

/** The notes under the chart: why points have no bar, and what was left out for this viewer. */
export function weightedNotes(points: Weighed[], noBarText: string): string[] {
  const notes: string[] = [];
  if (points.some((w) => w.tenders > 0 && w.counted + w.masked === 0)) notes.push(noBarText);
  const masked = points.reduce((s, w) => s + w.masked, 0);
  if (masked) notes.push(`${masked} ${masked === 1 ? 'tender' : 'tenders'} not counted: win probability is masked for your role.`);
  return notes;
}

export const NO_WIN_YET = 'No bid has a win probability yet: it is set when the Bid / No-Bid pack is issued.';

/** "262 M", "3.1 bn": the label above a bar. The currency is the graph's `unit`, shown once in the legend. */
export const shortMoney = (amount: number, ccy: Ccy) => money(amount, ccy, { dp: Math.abs(amount) >= 999.5e6 ? 1 : 0 }).replace(`${ccy} `, '');
