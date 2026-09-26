import type { Tone } from '@/data/types';
import { personById } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { s1Data } from '@/data/gcc/s1';
import { DELIVERY_LOAD, PORTFOLIO_BANDS, TENANT_TARGETS } from '@/data/gcc/portfolio';
import { CRITICAL_WD, MIN_N, NEAR_WD, RATE_BANDS, SLA_AT_RISK_SHARE, bandTone } from '@/data/gcc/targets';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import { durationText, minutesBetween } from '../clock';
import { currentOf, deadlineWd, queriesFor, standingGate, tenderCtx } from '../lifecycle';
import { can } from '@/data/access';
import { inWindow, type PeriodWindow } from '../period';
import { eligibilityFor } from '../s1/eligibility';
import { CAPACITY_WINDOW_DAYS, asCommitment, peakMonth, teamLoad } from '../s1/triage';
import { facilityHeadroom } from '../s1/bond';
import {
  credentialsAtRisk, dayMonth, dayText, dg1Open, dg2Open, inScope, inputsOutstanding, liveInScope, ownerTag, tenantCcy,
} from '../actions/portfolio.actions';
import type { DrillVM } from '../viewmodels';
import type { KpiCtx, KpiDef, KpiResult } from './types';

/**
 * The portfolio KPIs (plan 015 Phase 2, dashboards.md §10.1–10.3 and §11.1):
 * PF-1 … PF-4 and PF-6, and SCR-1, SCR-5, SCR-6, CAP-1, DEC-4 … DEC-7 and
 * OUT-3, which the stage dashboards (plan 013) reuse. Every value is derived
 * from the lifecycles (read through `queriesFor`, so restricted tenders never
 * reach a count their table hides), the tenant seed and the demo state.
 *
 * Scope: all tenders for the Head of Tendering and the CEO; the Bid Manager's
 * assigned tenders on their dashboard. A stage scope doesn't narrow them: the
 * DEC KPIs read Stage 3 tenders anyway.
 */

const Q = (ctx: KpiCtx) => queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done });

/** Every tender in scope, live or closed. */
const allInScope = (ctx: KpiCtx) => Q(ctx).all().filter((l) => inScope(l, ctx.scope));

const valueIn = (ctx: KpiCtx, amount: number, ccy: Lifecycle['value']['ccy']) => convert(amount, ccy, tenantCcy(ctx.tenant));
const valueOf = (ctx: KpiCtx, l: Lifecycle) => valueIn(ctx, l.value.amount, l.value.ccy);
const m = (ctx: KpiCtx, amount: number) => money(amount, tenantCcy(ctx.tenant));

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const pct = (num: number, den: number) => Math.round((num / den) * 100);
const uniq = (ids: string[]) => [...new Set(ids)];

/** "No decisions yet today", "No decisions in this period". */
const noneText = (w: PeriodWindow, what: string, today = `${what} yet today`) => (w.key === 'today' ? today : `${what} in this period`);

/** A table drill to exactly these tenders, closed ones included (dashboards.md §1 Z3). */
const tableOf = (label: string, ids: string[], extra: Partial<Extract<DrillVM, { kind: 'table' }>> = {}): DrillVM =>
  ({ kind: 'table', label, ids: uniq(ids), status: 'all', ...extra });

const fromTile = (ctx: KpiCtx, what: string) => `From tile: ${what} · ${ctx.window.label}`;

/* ------------------------------------------------------------- pipeline moves */

const PIPELINE = [2, 3, 4, 5, 6, 7, 8];
const inPipeline = (stage: number) => stage >= 2 && stage <= 8;

/**
 * When a tender left the live pipeline (Stages 2–8): a DG2 No-Bid, a DG3
 * rejection, a withdrawal or cancellation while in Stages 2–8, or a result.
 * A tender held at DG1 and closed in Stage 1 never entered it.
 */
function leftPipelineAt(l: Lifecycle): string | null {
  const times: string[] = [];
  for (const g of l.gates) if ((g.gate === 'DG2' && g.decision === 'no-bid') || (g.gate === 'DG3' && g.decision === 'rejected')) times.push(g.at);
  if (l.result && (l.result.result === 'won' || l.result.result === 'lost')) times.push(l.result.at);
  if (l.closedAt && l.closedAs === 'withdrawn' && inPipeline(currentOf(l).stage)) times.push(l.closedAt);
  return times.sort()[0] ?? null;
}

/** Pursued at DG1 in the window (in), and left the pipeline in the window (out). */
function pipelineMoves(ctx: KpiCtx) {
  const inIds = Q(ctx).gateEventsIn(ctx.window, 'DG1').filter((x) => x.g.decision === 'pursue' && inScope(x.l, ctx.scope)).map((x) => x.l.tenderId);
  const outIds = allInScope(ctx).filter((l) => inWindow(leftPipelineAt(l), ctx.window)).map((l) => l.tenderId);
  return { inIds: uniq(inIds), outIds };
}

/* ------------------------------------------------------------------- PF-1 … PF-6 */

const PF1: KpiDef = {
  id: 'PF-1',
  label: 'Live pipeline',
  kind: 'state',
  periodAware: true,
  info: {
    means: 'Every tender we decided to pursue that is still open: being sourced, priced or written, or submitted and waiting for the result.',
    counted: 'Tenders in Stages 2 to 8 now, and their value in the company currency. "In" is pursued at DG1 since the window started; "out" is a No-Bid, a DG3 rejection, a withdrawal or a result.',
    target: 'None (information)',
    source: 'Tender lifecycles',
  },
  compute(ctx) {
    const live = liveInScope(ctx).filter((l) => inPipeline(currentOf(l).stage));
    const total = live.reduce((s, l) => s + valueOf(ctx, l), 0);
    const { inIds, outIds } = pipelineMoves(ctx);
    return {
      display: m(ctx, total),
      sub: `${count(live.length, 'tender')} · ${inIds.length} in, ${outIds.length} out since ${ctx.window.startText}`,
      n: live.length,
      ...(ctx.scope.kind === 'assigned' ? { label: 'My live bids' } : {}),
    };
  },
  drill: (ctx) => ({ kind: 'table', label: `From tile: ${ctx.scope.kind === 'assigned' ? 'My live bids' : 'Live pipeline'} · now`, stages: PIPELINE, status: 'live' }),
};

const submitted = (ctx: KpiCtx) => Q(ctx).submissionsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));

const PF2: KpiDef = {
  id: 'PF-2',
  label: 'Average ticket size',
  kind: 'flow',
  info: {
    means: 'The typical size of what we bid. A rising average with the same team means bigger, riskier bids.',
    counted: 'The mean value of the bids submitted in the period, in the company currency.',
    target: 'None (information)',
    source: 'Tender lifecycles: submissions',
  },
  compute(ctx) {
    const subs = submitted(ctx);
    if (!subs.length) return { display: noneText(ctx.window, 'No bids submitted', 'No bids submitted today'), n: 0 };
    const values = subs.map((x) => valueOf(ctx, x.l));
    return {
      display: m(ctx, values.reduce((a, b) => a + b, 0) / values.length),
      sub: `${count(subs.length, 'bid')} · largest ${m(ctx, Math.max(...values))}`,
      n: subs.length,
    };
  },
  drill: (ctx) => tableOf(fromTile(ctx, 'bids submitted'), submitted(ctx).map((x) => x.l.tenderId)),
};

const decided = (ctx: KpiCtx) => Q(ctx).resultsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));

const PF3: KpiDef = {
  id: 'PF-3',
  label: 'Win / loss',
  kind: 'flow',
  info: {
    means: 'Of the results we received in this period, how many we won. With few results the rate swings, so the counts are shown first.',
    counted: 'Results received in the period: won ÷ (won + lost). Withdrawn and cancelled tenders are left out.',
    target: 'The company’s target hit rate, applied from 5 results',
    source: 'Tender lifecycles: results',
  },
  compute(ctx): KpiResult {
    const res = decided(ctx);
    if (!res.length) return { display: noneText(ctx.window, 'No results'), n: 0 };
    const won = res.filter((x) => x.r.result === 'won');
    const n = res.length;
    const rate = pct(won.length, n);
    const valueWon = won.reduce((s, x) => s + (x.r.value ? valueIn(ctx, x.r.value.amount, x.r.value.ccy) : valueOf(ctx, x.l)), 0);
    const target = isGccTenantKey(ctx.tenant) ? TENANT_TARGETS[ctx.tenant].hitRatePct : null;
    const tone: Tone | undefined = n < MIN_N || target === null ? undefined
      : rate >= target ? 'green' : rate >= target * PORTFOLIO_BANDS.hitRateOrangeShare ? 'orange' : 'red';
    return {
      display: `${won.length} won · ${n - won.length} lost`,
      sub: `Win rate ${rate}% (n = ${n})${won.length ? ` · ${m(ctx, valueWon)} won` : ''}${target !== null && n >= MIN_N ? ` · target ${target}%` : ''}`,
      tone, n, ...(n < MIN_N ? { smallSample: true } : {}),
    };
  },
  drill: (ctx) => tableOf(fromTile(ctx, 'results'), decided(ctx).map((x) => x.l.tenderId)),
};

const gateDecisions = (ctx: KpiCtx) => Q(ctx).gateEventsIn(ctx.window).filter((x) => inScope(x.l, ctx.scope));

/** How late a gate decision was: "3 h", "1 h 20 m". */
const lateBy = (g: { openedAt: string; at: string; slaHours: number }) => durationText(minutesBetween(g.openedAt, g.at) - g.slaHours * 60);

const PF4: KpiDef = {
  id: 'PF-4',
  label: 'Decisions on time',
  kind: 'flow',
  info: {
    means: 'How often DG1, DG2 and DG3 were decided within their time limits (24 h, 24 h and 48 h by default). A late decision takes days out of bid preparation.',
    counted: 'Gate decisions recorded within their time limit ÷ all gate decisions in the period, from the moment each gate opened.',
    target: '100% (green); 90% or more is orange',
    source: 'Tender lifecycles: gate records',
  },
  compute(ctx) {
    const ev = gateDecisions(ctx);
    if (!ev.length) return { display: noneText(ctx.window, 'No decisions'), n: 0 };
    const late = ev.filter((x) => !x.g.onTime).sort((a, b) => b.g.at.localeCompare(a.g.at));
    const on = ev.length - late.length;
    const p = pct(on, ev.length);
    const first = late[0];
    const lateText = !first ? 'all on time'
      : `${late.length} late${late.length > 1 ? ', latest' : ''}: ${first.g.gate} on ${first.l.tenderId} (${lateBy(first.g)})`;
    return { display: `${p}%`, sub: `${on} of ${ev.length} · ${lateText}`, tone: bandTone(p, RATE_BANDS['PF-4']), n: ev.length };
  },
  drill(ctx) {
    const ev = gateDecisions(ctx);
    const late = ev.filter((x) => !x.g.onTime).map((x) => x.l.tenderId);
    return tableOf(fromTile(ctx, 'gate decisions'), ev.map((x) => x.l.tenderId), { order: uniq(late) });
  },
};

/** Live tenders in scope not yet submitted, with a deadline still ahead, soonest first. */
function nextSubmissions(ctx: KpiCtx) {
  return liveInScope(ctx)
    .filter((l) => l.submissionDeadline && !l.submission && !l.log.some((e) => e.step === 'submitted'))
    .map((l) => ({ l, at: `${l.submissionDeadline!.date}T${l.submissionDeadline!.time}` }))
    .filter((x) => x.at >= ctx.now)
    .sort((a, b) => a.at.localeCompare(b.at));
}

const PF6: KpiDef = {
  id: 'PF-6',
  label: 'Next submission',
  kind: 'state',
  info: {
    means: 'The next bid that must leave the building, and how many working days are left. GCC weekends and holidays are taken out.',
    counted: 'The nearest submission deadline among your live bids not yet submitted, in the authority’s local time. The second nearest is shown under it.',
    target: 'Orange within 5 working days; red within 2 with anything still missing',
    source: 'Tender lifecycles and the country calendars',
  },
  compute(ctx) {
    const [first, second] = nextSubmissions(ctx);
    if (!first) return { display: 'No submissions due', n: 0 };
    const { l } = first;
    const wd = deadlineWd(l, ctx.tenant) ?? 0;
    const f = l.facts;
    const missing = f?.stage !== 8 || f.packageReadyPct < 100 || f.signaturesPending > 0;
    const tone: Tone | undefined = wd <= CRITICAL_WD && missing ? 'red' : wd <= NEAR_WD ? 'orange' : undefined;
    return {
      display: `${dayText(l.submissionDeadline!.date)}, ${l.submissionDeadline!.time}`,
      sub: `${l.tenderId} · ${count(wd, 'working day')}${second ? ` · next: ${second.l.tenderId} ${dayText(second.l.submissionDeadline!.date)}` : ''}`,
      tone,
    };
  },
  drill(ctx) {
    const first = nextSubmissions(ctx)[0];
    return first ? { kind: 'table', label: `From tile: next submission · ${first.l.tenderId}`, ids: [first.l.tenderId], select: first.l.tenderId, status: 'live' } : null;
  },
};

/* ---------------------------------------------------------------- Screening */

const SCR1: KpiDef = {
  id: 'SCR-1',
  label: 'DG1 due',
  kind: 'state',
  info: {
    means: 'Tenders waiting for the Bid Manager’s pursue or discard call, against the 24 h limit.',
    counted: 'Live Stage 1 tenders whose DG1 is open now. The limit runs from M1, when the tender is logged with its evidence.',
    target: 'Every DG1 within 24 h: orange with 6 h or less left, red once late',
    source: 'Tender lifecycles: DG1 clock',
  },
  compute(ctx) {
    const open = dg1Open(ctx);
    if (!open.length) return { display: '0', sub: 'No DG1 decisions due', tone: 'green', n: 0 };
    const breached = open.filter((x) => !x.g.onTime);
    const first = open[0];
    const leftMin = minutesBetween(ctx.now, first.g.slaEnd);
    const sub = breached.length
      ? `${breached.length} late: ${breached[0].l.tenderId}, by ${durationText(-minutesBetween(ctx.now, breached[0].g.slaEnd))}`
      : `first in ${durationText(leftMin)} · ${first.l.tenderId}`;
    const tone: Tone | undefined = breached.length ? 'red' : first.g.leftShare <= SLA_AT_RISK_SHARE ? 'orange' : undefined;
    return { display: String(open.length), sub, tone, n: open.length };
  },
  drill: (ctx) => ({ kind: 'table', label: 'From tile: DG1 due · now', ids: dg1Open(ctx).map((x) => x.l.tenderId), status: 'live' }),
};

interface EligRisk { l: Lifecycle; fail: number; atRisk: number; pursued: boolean; what: string }

/** Live Stage 1–3 tenders with a failing or at-risk prequalification line (SCR-5): 007a's eligibility, or the interim counts. */
function eligibilityRisks(ctx: KpiCtx): EligRisk[] {
  const d = gccData(ctx.tenant);
  return liveInScope(ctx).filter((l) => currentOf(l).stage <= 3).flatMap((l) => {
    const reg = d.register.find((t) => t.id === l.tenderId);
    let fail = 0; let atRisk = 0; let what = '';
    if (reg?.requirements?.length) {
      const e = eligibilityFor(ctx.tenant, l.tenderId, ctx.done);
      if (!e) return [];
      fail = e.counts.fail; atRisk = e.counts.atRisk;
      const lines = e.lines.filter((x) => x.state === (fail ? 'fail' : 'at-risk'));
      const renew = lines.flatMap((x) => x.renew ?? []).map((r) => shortCred(r.label));
      what = renew.length ? `${listText(uniq(renew))} expire before ${e.lines.find((x) => x.renew?.length)?.checkedAgainst.label ?? 'opening'}` : '';
    } else if (l.facts?.stage === 1 && l.facts.eligibility) {
      fail = l.facts.eligibility.fail; atRisk = l.facts.eligibility.atRisk;
    }
    if (!fail && !atRisk) return [];
    return [{ l, fail, atRisk, pursued: currentOf(l).stage >= 2, what }];
  }).sort((a, b) => Number(b.pursued && b.fail > 0) - Number(a.pursued && a.fail > 0) || b.fail - a.fail || b.atRisk - a.atRisk);
}

/** "Zakat" from "Zakat certificate (ZATCA)", "GOSI" from "GOSI certificate". */
const shortCred = (label: string) => label.split(/ certificate|\s*\(|:/)[0].trim();
const listText = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const SCR5: KpiDef = {
  id: 'SCR-5',
  label: 'Eligibility risks',
  kind: 'state',
  info: {
    means: 'Live tenders with a prequalification line that fails or is at risk. Disqualification on paperwork is the most avoidable loss.',
    counted: 'Live tenders in Stages 1 to 3 with any line that fails or is at risk, checked against the credentials vault on the date each line must hold.',
    target: 'None: red for a fail on a pursued tender, orange for any other',
    source: 'Eligibility checks against the credentials vault',
  },
  compute(ctx) {
    const risks = eligibilityRisks(ctx);
    if (!risks.length) return { display: '0', sub: 'No eligibility risks on live tenders', tone: 'green', n: 0 };
    const top = risks[0];
    const sub = top.fail
      ? `${top.l.tenderId}: ${count(top.fail, 'line')} ${top.fail === 1 ? 'fails' : 'fail'}${top.pursued ? ' on a pursued bid' : ''}`
      : `${top.l.tenderId}: ${top.what || `${count(top.atRisk, 'line')} at risk`}`;
    return { display: String(risks.length), sub, tone: risks.some((r) => r.pursued && r.fail) ? 'red' : 'orange', n: risks.length };
  },
  drill: (ctx) => ({ kind: 'table', label: 'From tile: eligibility risks · now', ids: eligibilityRisks(ctx).map((r) => r.l.tenderId), status: 'live' }),
};

const SCR6: KpiDef = {
  id: 'SCR-6',
  label: 'Credentials at risk',
  kind: 'state',
  info: {
    means: 'Company certificates that expire before a live bid is opened. Saudi tenders require them to be valid on the opening date, so an expiry here can disqualify the bid.',
    counted: 'Certificates in the vault whose expiry falls before the opening date (or the date the tender says it must hold) of any live bid not yet opened.',
    target: 'None: orange while a renewal is possible, red once one has expired',
    source: 'Credentials vault × live tender dates',
  },
  compute(ctx) {
    const risks = credentialsAtRisk(ctx);
    if (!risks.length) return { display: '0', sub: 'Every certificate holds past its bids’ openings', tone: 'green', n: 0 };
    const first = risks[0];
    const bid = first.bids[0];
    return {
      display: String(risks.length),
      sub: `${shortCred(first.cred.label)} ${dayMonth(first.validTo)} · before ${bid.l.tenderId} ${bid.checkLabel} ${dayMonth(bid.checkDate)}${first.requested ? ' · renewal requested' : ''}`,
      tone: risks.some((r) => r.validTo < DEMO_TODAY) ? 'red' : 'orange',
      ownerTag: ownerTag(first.cred.ownerId) ?? undefined,
      n: risks.length,
    };
  },
  drill: () => ({ kind: 'route', to: '/company', label: 'Open Company › Credentials' }),
};

/* ---------------------------------------------------------------- Capacity */

const CAP1: KpiDef = {
  id: 'CAP-1',
  label: 'Bid-team load',
  kind: 'state',
  info: {
    means: 'Committed bid-team hours in the next four weeks against the hours available, for the busiest team.',
    counted: 'Each team’s committed hours for its live bids over the next four weeks ÷ its engineers’, estimators’ and planners’ hours in the same weeks. The busiest team is shown; underneath, its peak month if that goes over capacity, or the load with the new tender waiting for DG1 if it were pursued.',
    target: '85% or less (green); up to 100% is orange',
    source: 'Team rosters and bid effort estimates',
  },
  compute(ctx) {
    if (!isGccTenantKey(ctx.tenant)) return { display: 'Not available' };
    const d = gccData(ctx.tenant);
    const from = DEMO_TODAY;
    const to = addDays(DEMO_TODAY, CAPACITY_WINDOW_DAYS - 1);
    const loads = d.teams.map((team) => ({ team, share: teamLoad(team, from, to) })).sort((a, b) => b.share - a.share);
    const top = loads[0];
    if (!top) return { display: 'No teams set up' };
    const p = Math.round(top.share * 100);
    // The sub-line holds two clauses: the committed peak if it goes over capacity, else what pursuing the hero would do.
    const short = (name: string) => name.replace(/ tendering team$/i, ' team');
    const parts = [`${short(top.team.name)}, next 4 weeks`];
    const until = top.team.commitments.reduce((mx, c) => (c.to > mx ? c.to : mx), to);
    const peak = peakMonth(top.team, from, until);
    const hero = Q(ctx).one(HERO_ID);
    const effort = s1Data(ctx.tenant).effort.find((e) => e.tenderId === HERO_ID);
    const heroTeam = effort && d.teams.find((t) => t.id === effort.teamId);
    if (peak.pct > 100 && peak.pct > p) parts.push(`peaks at ${peak.pct}% in ${peak.month}`);
    else if (hero && !hero.closedAt && !standingGate(hero, 'DG1') && effort && heroTeam) {
      // While the hero is undecided at DG1: what pursuing it would do to its team.
      const withHero = Math.round(teamLoad(heroTeam, from, to, [asCommitment(effort)]) * 100);
      parts.push(`${heroTeam.id === top.team.id ? '' : `${short(heroTeam.name)} `}${withHero}% with ${HERO_ID}`);
    }
    const b = PORTFOLIO_BANDS.teamLoadPct;
    return { display: `${p}%`, sub: parts.join(' · '), tone: p <= b.green ? 'green' : p <= b.orange ? 'orange' : 'red' };
  },
  drill: () => ({ kind: 'route', to: '/company', label: 'Open Company › Teams' }),
};

/* --------------------------------------------------------- Bid decision (DEC) */

/** Live Stage 3 tenders in scope whose pack has been issued (DEC-4). */
/** Issued packs whose win probability this viewer may see, tender by tender (a Bid Manager sees only his own). */
const issuedPacks = (ctx: KpiCtx) => liveInScope(ctx).filter((l) => l.facts?.stage === 3 && l.facts.pack === 'issued' && can(ctx.viewer, 'see.positions', tenderCtx(ctx.tenant, l)).ok);

const DEC4: KpiDef = {
  id: 'DEC-4',
  label: 'Weighted pipeline',
  kind: 'state',
  cap: 'see.positions',
  info: {
    means: 'The value of the bids at DG2, weighted by their win probability. Only bids with a pack are counted, because earlier tenders have no probability yet.',
    counted: 'Σ value × win probability over Stage 3 bids whose Bid / No-Bid pack has been issued, in the company currency.',
    target: 'None (information)',
    source: 'Bid / No-Bid packs: win probability',
  },
  compute(ctx) {
    const bids = issuedPacks(ctx);
    if (!bids.length) return { display: 'No bids at DG2', n: 0 };
    const weighted = bids.reduce((s, l) => s + valueOf(ctx, l) * (l.facts?.stage === 3 ? l.facts.win.p / 100 : 0), 0);
    const total = bids.reduce((s, l) => s + valueOf(ctx, l), 0);
    return { display: m(ctx, weighted), sub: `${count(bids.length, 'bid')} · unweighted ${m(ctx, total)}`, n: bids.length };
  },
  drill: (ctx) => ({ kind: 'table', label: 'From tile: weighted pipeline · now', ids: issuedPacks(ctx).map((l) => l.tenderId), status: 'live' }),
};

/** DEC-5's reading: current delivery load plus what each live Stage 3 bid would add. */
export function capacityIfWon(ctx: Pick<KpiCtx, 'tenant' | 'viewer' | 'done' | 'scope' | 'now'>) {
  if (!isGccTenantKey(ctx.tenant)) return null;
  const load = DELIVERY_LOAD[ctx.tenant];
  const safe = gccData(ctx.tenant).fit.safeDeliveryPct;
  const atDg2 = new Set(liveInScope(ctx).filter((l) => currentOf(l).stage === 3).map((l) => l.tenderId));
  const adds = load.ifWon.filter((x) => atDg2.has(x.tenderId));
  const total = load.currentPct + adds.reduce((s, x) => s + x.addPct, 0);
  return { load, safe, adds, total, ratio: Math.round((total / safe) * 100) };
}

const DEC5: KpiDef = {
  id: 'DEC-5',
  label: 'Capacity if won',
  kind: 'state',
  info: {
    means: 'The delivery load if every bid at DG2 wins, on top of work already awarded, against the safe level.',
    counted: 'Awarded work as a share of delivery capacity, plus what each Stage 3 bid would add if won, ÷ the company’s safe delivery level.',
    target: '100% of the safe level or less (green); up to 115% is orange',
    source: 'Operations delivery load and the Bid / No-Bid packs',
  },
  compute(ctx) {
    const c = capacityIfWon(ctx);
    if (!c) return { display: 'Not available' };
    const b = PORTFOLIO_BANDS.capacityIfWonPct;
    return {
      display: `${c.ratio}%`,
      sub: `${c.total}% of capacity vs safe ${c.safe}% · as of ${dayText(c.load.asOf)}`,
      tone: c.ratio <= b.green ? 'green' : c.ratio <= b.orange ? 'orange' : 'red',
    };
  },
  drill: () => ({ kind: 'table', label: 'From tile: bids at DG2 · now', stages: [3], status: 'live' }),
};

const DEC6: KpiDef = {
  id: 'DEC-6',
  label: 'Facility headroom',
  kind: 'state',
  cap: 'company.view',
  info: {
    means: 'What is left of the bank guarantee facility after the bonds we hold and those live bids would need. In the GCC, bonds tie up the facility for months.',
    counted: 'Facility limit − bonds issued on contracts − bonds held for live bids and pending awards, as Finance last confirmed it. Under it: what is left after the bid bond of the bid at DG2.',
    target: 'Orange below 10% of the limit; red below zero',
    source: 'Finance: bank guarantee facility',
  },
  compute(ctx) {
    if (!isGccTenantKey(ctx.tenant)) return { display: 'Not available' };
    const f = facilityHeadroom(ctx.tenant);
    const limit = gccData(ctx.tenant).facility.limit.amount;
    const open = dg2Open(ctx)[0];
    const h = f.headroom.amount;
    const asOf = dayText(f.asOf);
    return {
      display: money(h, f.headroom.ccy),
      sub: open ? `${money(open.f.facilityAfter.amount, open.f.facilityAfter.ccy)} after ${open.l.tenderId} · as of ${asOf}` : `As of ${asOf}`,
      tone: h < 0 ? 'red' : h < limit * PORTFOLIO_BANDS.facilityWarningShare ? 'orange' : 'green',
      ownerTag: 'Finance',
    };
  },
};

const DEC7: KpiDef = {
  id: 'DEC-7',
  label: 'Inputs outstanding',
  kind: 'state',
  info: {
    means: 'Inputs asked of colleagues for packs and not yet given. Packs slip when inputs slip.',
    counted: 'Contributor inputs requested for Bid / No-Bid packs and not yet submitted. Late means past the date the Bid Manager set.',
    target: 'None late (green); any late is orange, red on a pack already with the committee',
    source: 'Bid / No-Bid pack input requests',
  },
  compute(ctx) {
    const open = inputsOutstanding(ctx);
    if (!open.length) return { display: '0', sub: 'Every requested input is in', tone: 'green', n: 0 };
    const late = open.filter((x) => x.late);
    const first = late[0];
    const onIssued = late.some((x) => x.l.facts?.stage === 3 && x.l.facts.pack === 'issued');
    const owner = first && (personById(first.item.ownerId)?.name ?? 'its owner');
    return {
      display: String(open.length),
      sub: first ? `${late.length} late · ${first.item.what} · ${owner}` : `none late · next due ${dayText(open[0].item.due)} ${open[0].item.due.slice(11, 16)}`,
      tone: !late.length ? 'green' : onIssued ? 'red' : 'orange',
      ...(first ? { ownerTag: ownerTag(first.item.ownerId) ?? undefined } : {}),
      n: open.length,
    };
  },
  drill: (ctx) => ({ kind: 'table', label: 'From tile: inputs outstanding · now', ids: inputsOutstanding(ctx).map((x) => x.l.tenderId), status: 'live' }),
};

/* ---------------------------------------------------------------- Outcomes */

const wins = (ctx: KpiCtx) => Q(ctx).resultsIn(ctx.window, ['won']).filter((x) => inScope(x.l, ctx.scope));

const OUT3: KpiDef = {
  id: 'OUT-3',
  label: 'Value won',
  kind: 'flow',
  info: {
    means: 'Contract value won in the period, against the order-intake target pro-rated to the period.',
    counted: 'Σ contract value of the bids won in the period, in the company currency. The target is the annual order-intake target × the days in the period ÷ 365.',
    target: 'The pro-rated order-intake target: 70% of it or more is orange; not judged for Today or 7 days',
    source: 'Tender lifecycles: results; company targets',
  },
  compute(ctx) {
    if (!isGccTenantKey(ctx.tenant)) return { display: 'Not available' };
    const w = wins(ctx);
    const won = w.reduce((s, x) => s + (x.r.value ? valueIn(ctx, x.r.value.amount, x.r.value.ccy) : valueOf(ctx, x.l)), 0);
    const t = TENANT_TARGETS[ctx.tenant].orderIntakeAnnual;
    const target = (valueIn(ctx, t.amount, t.ccy) * ctx.window.days) / 365;
    const p = Math.round((won / target) * 100);
    const short = ctx.window.key === 'today' || ctx.window.key === '7d';
    const b = PORTFOLIO_BANDS.valueWonPct;
    return {
      display: w.length ? m(ctx, won) : noneText(ctx.window, 'No contracts won'),
      sub: `${w.length ? `${count(w.length, 'win')} · ` : ''}${p}% of the ${m(ctx, target)} target`,
      tone: short ? undefined : p >= b.green ? 'green' : p >= b.orange ? 'orange' : 'red',
      n: w.length,
    };
  },
  drill: (ctx) => tableOf(fromTile(ctx, 'contracts won'), wins(ctx).map((x) => x.l.tenderId)),
};

export const KPIS: KpiDef[] = [PF1, PF2, PF3, PF4, PF6, SCR1, SCR5, SCR6, CAP1, DEC4, DEC5, DEC6, DEC7, OUT3];
