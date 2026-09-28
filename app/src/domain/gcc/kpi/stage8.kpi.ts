import type { Lifecycle, S8Facts } from '@/data/gcc/lifecycle';
import { AHEAD_DAYS, NEAR_WD, RATE_BANDS } from '@/data/gcc/targets';
import { DEMO_TODAY } from '@/domain/calendar';
import { deadlineWd } from '../lifecycle';
import type { KpiCtx, KpiDef } from './types';
import { daysBetween, dayTimeText, idsDrill, isSmall, liveIn, moneyText, pctOf, plural, qOf, rateTone, tileLabel, valueOf, wdText } from './stages';

/**
 * Stage 8 · Submission (plan 013 Phase 2.8, dashboards.md §10.11 and §11.6).
 * Owned by the Bid Manager, who reaches it from the sidebar.
 */

type S8 = { l: Lifecycle; f: S8Facts };

export const s8Of = (ctx: KpiCtx): S8[] => liveIn(ctx, 8).flatMap((l) => (l.facts?.stage === 8 ? [{ l, f: l.facts }] : []));

const deadlineOf = (l: Lifecycle) => (l.submissionDeadline ? `${l.submissionDeadline.date}T${l.submissionDeadline.time}` : null);

/** Not yet submitted, deadline still ahead and within `days` calendar days. */
export function dueWithin(ctx: KpiCtx, days: number): S8[] {
  return s8Of(ctx)
    .filter((x) => !x.l.submission && x.l.submissionDeadline && deadlineOf(x.l)! >= ctx.now && daysBetween(DEMO_TODAY, x.l.submissionDeadline.date) <= days)
    .sort((a, b) => deadlineOf(a.l)!.localeCompare(deadlineOf(b.l)!));
}

/** Not yet submitted, due within 5 working days. */
export const dueSoon = (ctx: KpiCtx) => dueWithin(ctx, AHEAD_DAYS.submissions).filter((x) => { const wd = deadlineWd(x.l, ctx.tenant); return wd !== null && wd <= NEAR_WD; });

const awaitingResult = (ctx: KpiCtx) => s8Of(ctx).filter((x) => !!x.l.submission && !x.l.result).sort((a, b) => a.l.submission!.at.localeCompare(b.l.submission!.at));

export const bondIssues = (ctx: KpiCtx) => dueWithin(ctx, AHEAD_DAYS.bonds).filter((x) => !x.f.bond.issued || x.f.bond.validTo < x.f.bond.requiredTo);

/** The first wording that fits a tile's one-line detail at 1440 px (plan 027a: about 24 characters), else the last. */
const fit = (...options: string[]) => options.find((x) => x.length <= 24) ?? options[options.length - 1];

/** "12 Mar": a reference line's date, without the weekday. */
const dm = (iso: string) => dayTimeText(iso.slice(0, 10)).replace(/^\w{3} /, '');

/** "On T-2025-298", "Across 2 bids": a lower-case sub-line clause as a line of its own. */
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

export const KPIS: KpiDef[] = [
  {
    id: 'SUB-1', label: 'Submissions due', kind: 'state',
    info: {
      means: 'The bids that must be submitted soon, with working days left',
      counted: `Stage 8 bids not yet submitted whose deadline falls in the next ${AHEAD_DAYS.submissions} days. The sub-line shows the first, in local time.`,
      target: `Orange within ${NEAR_WD} working days`, source: 'Submission deadlines and the country calendar',
    },
    compute(ctx) {
      const list = dueWithin(ctx, AHEAD_DAYS.submissions);
      if (!list.length) return { display: '0', sub: `Nothing due in the next ${AHEAD_DAYS.submissions} days`, detail: fit(`Nothing due in the next ${AHEAD_DAYS.submissions} days`, `Nothing due in ${AHEAD_DAYS.submissions} days`) };
      const first = list[0];
      const wd = deadlineWd(first.l, ctx.tenant) ?? 0;
      return {
        display: String(list.length), sub: `${first.l.tenderId} · ${dayTimeText(deadlineOf(first.l)!)} · ${wdText(wd)}`, ...(wd <= NEAR_WD ? { tone: 'orange' as const } : {}),
        detail: `${first.l.tenderId} · ${dm(deadlineOf(first.l)!)}`, ref: { k: 'Time left', v: wdText(wd) },
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Submissions due'), dueWithin(ctx, AHEAD_DAYS.submissions).map((x) => x.l.tenderId)),
  },
  {
    id: 'SUB-2', label: 'On-time submissions', kind: 'flow',
    info: {
      means: 'Whether every bid made it in time. A late bid is not opened',
      counted: 'Bids submitted before their deadline ÷ bids submitted in the period.',
      target: '100% green; anything less red', source: 'Portal submission receipts',
    },
    compute(ctx) {
      const list = qOf(ctx).submissionsIn(ctx.window);
      if (!list.length) return { display: 'No bids submitted in this period' };
      const on = list.filter((x) => x.s.onTime).length;
      const pct = pctOf(on, list.length);
      return { display: `${pct}%`, sub: `${on} of ${plural(list.length, 'bid')} before the deadline`, detail: fit(`${on} of ${plural(list.length, 'bid')} before the deadline`, `${on} of ${plural(list.length, 'bid')} on time`), n: list.length, ...(isSmall(list.length) && pct === 100 ? { smallSample: true } : { tone: pct === 100 ? 'green' as const : 'red' as const }) };
    },
    drill: (ctx) => idsDrill(`From tile: Submitted · ${ctx.window.label}`, qOf(ctx).submissionsIn(ctx.window).map((x) => x.l.tenderId)),
  },
  {
    id: 'SUB-3', label: 'Packages ready', kind: 'state',
    info: {
      means: 'How complete the submission packages are for the next bids out',
      counted: `For bids due within ${NEAR_WD} working days: documents assembled and checked ÷ documents required. The sub-line names the least ready.`,
      target: '100% green; 90% or more orange; else red', source: 'Submission checklist',
    },
    compute(ctx) {
      const list = dueSoon(ctx);
      if (!list.length) return { display: `No bids due in ${NEAR_WD} working days` };
      const pct = Math.round(list.reduce((s, x) => s + x.f.packageReadyPct, 0) / list.length);
      const least = [...list].sort((a, b) => a.f.packageReadyPct - b.f.packageReadyPct)[0];
      return {
        display: `${pct}%`, sub: list.length === 1 ? `Least ready: ${least.l.tenderId}` : `Least ready: ${least.l.tenderId}, ${least.f.packageReadyPct}%`, tone: rateTone(pct, RATE_BANDS['SUB-3']),
        detail: fit(`${plural(list.length, 'bid')} due in ${NEAR_WD} working days`, `${plural(list.length, 'bid')} due soon`), ref: { k: 'Worst', v: list.length === 1 ? least.l.tenderId : `${least.l.tenderId}, ${least.f.packageReadyPct}%` },
      };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Packages ready'), dueSoon(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'SUB-4', label: 'Signatures pending', kind: 'state',
    info: {
      means: 'Documents that still need a signature and stamp before upload',
      counted: `Forms awaiting an authorised signatory, on bids due within ${NEAR_WD} working days.`,
      target: '0 green; any orange', source: 'Submission checklist',
    },
    compute(ctx) {
      const rows = dueSoon(ctx).filter((x) => x.f.signaturesPending > 0);
      const n = rows.reduce((s, x) => s + x.f.signaturesPending, 0);
      if (!n) return { display: '0', sub: 'Everything due is signed', detail: 'Everything due is signed', tone: 'green' };
      const sub = rows.length === 1 ? `on ${rows[0].l.tenderId}` : `across ${plural(rows.length, 'bid')}`;
      return { display: String(n), sub, detail: cap(sub), tone: 'orange' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Signatures pending'), dueSoon(ctx).filter((x) => x.f.signaturesPending > 0).map((x) => x.l.tenderId)),
  },
  {
    id: 'SUB-5', label: 'Awaiting result', kind: 'state',
    info: {
      means: 'Bids with the employer. Value that may still come in',
      counted: 'Submitted bids with no result yet: how many and their value. The sub-line names the one submitted longest ago.',
      target: 'None (information)', source: 'Submissions and results',
    },
    compute(ctx) {
      const list = awaitingResult(ctx);
      if (!list.length) return { display: '0', sub: 'No bid is waiting for a result', detail: 'No bid awaiting a result' };
      const value = list.reduce((s, x) => s + valueOf(ctx.tenant, x.l), 0);
      const oldest = list[0];
      const days = daysBetween(oldest.l.submission!.at, ctx.now);
      return { display: String(list.length), sub: `${moneyText(ctx.tenant, value)} · oldest ${oldest.l.tenderId} · ${days} days`, detail: `Worth ${moneyText(ctx.tenant, value)}`, ref: { k: 'Oldest', v: oldest.l.tenderId } };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Awaiting result'), awaitingResult(ctx).map((x) => x.l.tenderId)),
  },
  {
    id: 'SUB-6', label: 'Bid bonds', kind: 'state',
    info: {
      means: 'Guarantees that are missing or too short. An invalid guarantee excludes the bid',
      counted: `Bids due within ${AHEAD_DAYS.bonds} days whose initial guarantee is not issued, or whose validity ends before the date the tender requires (KSA: 90 days from opening).`,
      target: '0 green; any red', source: 'Bank guarantees',
    },
    compute(ctx) {
      const list = bondIssues(ctx);
      if (list.length) return { display: String(list.length), sub: `${list[0].l.tenderId}: ${list[0].f.bond.issued ? 'validity too short' : 'not issued'}`, detail: list[0].f.bond.issued ? 'Validity too short' : 'Not issued', ref: { k: 'Worst', v: list[0].l.tenderId }, tone: 'red' };
      const due = dueWithin(ctx, AHEAD_DAYS.bonds).length;
      return { display: '0', sub: due ? `${plural(due, 'bond')} in order` : 'No bond needed in the next two weeks', detail: due ? `${plural(due, 'bond')} in order` : 'No bond needed soon', tone: 'green' };
    },
    drill: (ctx) => idsDrill(tileLabel(ctx, 'Bid bonds'), bondIssues(ctx).map((x) => x.l.tenderId)),
  },
];
