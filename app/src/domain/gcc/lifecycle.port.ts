import type { Tone } from '@/data/types';
import { can } from '@/data/access';
import type { Person } from '@/data/people';
import { personById, roleLine } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { DG2_QUORUM } from '@/data/gcc/targets';
import { stageLabel, stageOf, stepLabel, type StageN } from '@/data/gcc/stages';
import { CRITERIA, type GccTender } from '@/data/gcc/types';
import { NOW, hoursBetween } from '@/data/gcc/lifecycle/chain';
import type { GateKind, GateRecord, Lifecycle, StageEntry } from '@/data/gcc/lifecycle';
import { DEMO_TODAY, dateText } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import {
  currentOf, deadlineWd, eligibilityOf, healthOf, hoursText, lifecycle, lifecyclesOf, openGate, personName, staleOf, teamOf, tenderCtx, visible, type DemoDone,
} from './lifecycle';
import type { DataPort, GateKey, MoneyVM, RowScope, TenderRowVM, TrackerNodeVM, TrackerVM } from './viewmodels';

/**
 * The data port over the lifecycles (plan 017 Phase 5, dashboards.md §5 and
 * §7): the rows of the dashboard table and the tender tracker. Pages reach
 * tender data only through `dataPort()`, which loads this file.
 *
 * Masking follows `can()`, and a masked fact is null with a `<key>.masked`
 * marker:
 * - margin and price facts (margins, the estimated price) without `see.margin`;
 * - win probability, committee positions and what derives from them (quorum,
 *   weighted value, the predicted win of a result) without `see.positions`;
 * - quote facts are counts only, so a viewer with `see.quotes.summary` sees
 *   them as they are and a viewer with neither sees them masked.
 * Tenders the viewer may not open (`visible`: the restricted lane for people
 * not cleared) are left out.
 */

export { tenderCtx, visible, visibleOf, queriesFor, type DemoDone } from './lifecycle';

type Facts = TenderRowVM['facts'];

const ccyOf = (tenant: string) => gccData(tenant).fit.band.min.ccy;
const registerOf = (tenant: string, id: string): GccTender | undefined => gccData(tenant).register.find((t) => t.id === id);

/** What the viewer may see on this tender. */
function sightOf(tenant: string, l: Lifecycle, viewer: Person) {
  const ctx = tenderCtx(tenant, l);
  return {
    margin: can(viewer, 'see.margin', ctx).ok,
    positions: can(viewer, 'see.positions', ctx).ok,
    quotes: can(viewer, 'see.quotes', ctx).ok || can(viewer, 'see.quotes.summary', ctx).ok,
  };
}

const DEMO_YEAR = DEMO_TODAY.slice(0, 4);
/** "Sun 15 Mar", with the year only outside the demo year. */
const day = (iso: string) => (iso.startsWith(DEMO_YEAR) ? dateText(iso.slice(0, 10)).replace(/ \d{4}$/, '') : dateText(iso.slice(0, 10)));
const dayTime = (iso: string) => `${day(iso)} ${iso.slice(11, 16)}`;

function moneyVM(tenant: string, amount: number, ccy: MoneyVM['ccy']): MoneyVM {
  const to = ccyOf(tenant);
  return ccy === to ? { amount, ccy } : { amount: Math.round(convert(amount, ccy, to)), ccy: to, original: { amount, ccy } };
}

/** Who the tender waits on now: the Head of Tendering at an open DG2 or DG3, else the owner of the current step. Nobody once closed. */
function ownerOf(tenant: string, l: Lifecycle): string | null {
  if (l.closedAt) return null;
  const g = openGate(l);
  if (g && g.gate !== 'DG1') return `${tenant}.hot`;
  return currentOf(l).ownerId;
}

/** The gate open now, or the next one ahead. */
function nextGateOf(l: Lifecycle): TenderRowVM['nextGate'] {
  if (l.closedAt) return null;
  const g = openGate(l);
  if (g) return { gate: g.gate, slaEnd: g.slaEnd, label: g.onTime ? `${g.gate} open · ${hoursText(g.leftHours)} left` : `${g.gate} overdue by ${hoursText(g.leftHours)}` };
  const n = currentOf(l).stage;
  const ahead: GateKey | null = n <= 1 ? 'DG1' : n <= 3 ? 'DG2' : n <= 7 ? 'DG3' : null;
  return ahead ? { gate: ahead, label: `${ahead} next` } : null;
}

/** The latest moment in the lifecycle up to now. */
function lastActivityOf(l: Lifecycle): string {
  const ts = [
    ...l.log.map((e) => e.at), ...l.gates.map((g) => g.at), ...l.events.flatMap((e) => (e.at ? [e.at] : [])),
    l.submission?.at, l.result?.at, l.closedAt,
  ].filter((t): t is string => !!t && t <= NOW);
  return ts.reduce((a, b) => (b > a ? b : a), l.capturedAt);
}

/** Plan 004's weighted fit, for tenders on the register in Stages 1–3. */
function fitOf(tenant: string, l: Lifecycle): number | null {
  if (l.closedAt || currentOf(l).stage > 3) return null;
  const t = registerOf(tenant, l.tenderId);
  if (!t) return null;
  const d = gccData(tenant);
  return Math.round((CRITERIA.reduce((s, c) => s + d.fit.weights[c] * t.fit[c].score, 0) / 10) * 10) / 10;
}

/**
 * The current step's facts, flattened for columns (dashboards.md §10), plus
 * the result of a decided tender. Keys are listed in plan 017's report.
 */
function factsOf(tenant: string, l: Lifecycle, viewer: Person): Facts {
  const out: Facts = {};
  const { margin, positions, quotes } = sightOf(tenant, l, viewer);
  const mask = (keys: string[]) => { for (const k of keys) { out[k] = null; out[`${k}.masked`] = true; } };
  const f = l.facts;
  if (f?.stage === 1) {
    const t = registerOf(tenant, l.tenderId);
    const e = eligibilityOf(tenant, l);
    Object.assign(out, {
      fieldsToCheck: t?.validations.length ?? 0, fieldsBlocking: t?.validations.filter((v) => v.blocksDg1).length ?? 0,
      eligPass: e?.pass ?? null, eligAtRisk: e?.atRisk ?? null, eligInterpretation: e?.interpretation ?? null, eligFail: e?.fail ?? null,
      documents: f.documents === 'downloaded' ? 'downloaded' : 'to buy',
      documentFee: f.documents === 'downloaded' ? null : f.documents.fee.amount,
      purchaseBy: f.documents === 'downloaded' ? null : f.documents.purchaseBy,
      language: f.language, dg1Due: f.dg1Due ?? null,
    });
  } else if (f?.stage === 2) {
    Object.assign(out, {
      packagesCovered: f.packages.covered, packagesTotal: f.packages.total, rfqsSent: f.rfqs.sent, rfqsTotal: f.rfqs.total,
      rfqsOverdue: f.rfqs.overdue, rfqsEscalated: f.rfqs.escalated, rfqsAnsweredOnTime: f.rfqs.answeredOnTime, rfqsDueSoFar: f.rfqs.dueSoFar,
      toLevel: f.toLevel, notCoveredPct: f.notCoveredPct, repliesDue: f.repliesDue,
      clarificationsOpen: f.clarifications.open, clarificationsStale: f.clarifications.stale, bestFitApproved: f.bestFitApproved,
    });
    if (!quotes) mask(['toLevel', 'notCoveredPct', 'bestFitApproved']);
  } else if (f?.stage === 3) {
    const g = openGate(l);
    const more = DG2_QUORUM - f.positions.recorded;
    Object.assign(out, {
      pack: f.pack === 'preparation' ? 'in preparation' : staleOf(tenant, l) ? 'stale' : 'fresh', packIssuedAt: f.issuedAt ?? null,
      inputsRequested: f.inputs.requested, inputsOutstanding: f.inputs.outstanding, inputsLate: f.inputs.late,
      positionsRecorded: f.positions.recorded, positionsOf: f.positions.of, quorum: more <= 0 ? 'met' : `${more} more needed`,
      winP: f.win.p, winBand: f.win.band, marginMin: f.marginRange[0], marginMax: f.marginRange[1],
      facilityAfter: f.facilityAfter.amount, weightedValue: f.weightedValue?.amount ?? null, dg2SlaEnd: g?.gate === 'DG2' ? g.slaEnd : null,
    });
    if (!margin) mask(['marginMin', 'marginMax']);
    if (!positions) mask(['winP', 'winBand', 'positionsRecorded', 'quorum', 'weightedValue']);
  } else if (f?.stage === 4) {
    Object.assign(out, {
      durationPlannedM: f.durationPlannedM, durationRequiredM: f.durationRequiredM, floatDays: f.floatDays, longLeadAtRisk: f.longLeadAtRisk,
      peakManpower: f.peakManpower, baselineDue: f.baselineDue, m2Due: f.m2Due, clashWith: f.clashWith ?? null,
    });
  } else if (f?.stage === 5) {
    Object.assign(out, {
      estPrice: f.estPrice.amount, baseMarginPct: f.baseMarginPct, minMarginPct: f.minMarginPct, sourcedPct: f.sourcedPct,
      estimatedPct: f.estimatedPct, financeCheck: f.financeCheck, priceDue: f.priceDue, m2Due: f.m2Due,
    });
    if (!margin) mask(['estPrice', 'baseMarginPct', 'minMarginPct']);
  } else if (f?.stage === 6) {
    Object.assign(out, {
      sectionsLocked: f.sections.locked, sectionsTotal: f.sections.total, sectionsLate: f.sections.late, simScore: f.simScore,
      passMark: f.passMark, smeOverdue: f.smeOverdue, redTeamAt: f.redTeamAt ?? null, reusePct: f.reusePct,
    });
  } else if (f?.stage === 7) {
    const g = openGate(l);
    Object.assign(out, {
      evidenced: f.requirements.evidenced, requirements: f.requirements.total,
      evidencedPct: f.requirements.total ? Math.round((f.requirements.evidenced / f.requirements.total) * 100) : null,
      mandatoryGaps: f.mandatoryGaps, redlinesOpen: f.redlinesOpen, risksWithoutOwner: f.risksWithoutOwner,
      dg3IssuedAt: f.dg3IssuedAt ?? null, dg3SlaEnd: g?.gate === 'DG3' ? g.slaEnd : null,
    });
  } else if (f?.stage === 8) {
    Object.assign(out, {
      packageReadyPct: f.packageReadyPct, signaturesPending: f.signaturesPending, bondAmount: f.bond.amount.amount,
      bondValidTo: f.bond.validTo, bondRequiredTo: f.bond.requiredTo, bondIssued: f.bond.issued,
      openingDate: f.openingDate, expectedAwardBy: f.expectedAwardBy ?? null,
    });
    // The bid bond is a share of the bid price, so its amount reveals the price: masked with margin.
    if (!margin) mask(['bondAmount']);
  } else if (f?.stage === 9) {
    Object.assign(out, { handoverAt: f.handoverAt ?? null, debriefAt: f.debriefAt ?? null });
  }
  if (l.submission) Object.assign(out, { portal: l.submission.portal, receipt: l.submission.receipt ?? null, submittedAt: l.submission.at });
  if (l.result) {
    const r = l.result;
    Object.assign(out, {
      result: r.result, rankPlace: r.rank?.[0] ?? null, rankOf: r.rank?.[1] ?? null, gapToWinnerPct: r.gapToWinnerPct ?? null,
      lossReason: r.lossReason ?? null, predictedWin: r.predictedWin ?? null, lessons: l.events.some((e) => e.kind === 'lessons'),
    });
    if (!positions) mask(['predictedWin']);
  }
  return out;
}

export function rowFor(l: Lifecycle, tenant: string, viewer: Person): TenderRowVM {
  const cur = currentOf(l);
  const ownerId = ownerOf(tenant, l);
  const owner = personById(ownerId);
  const src = gccData(tenant).sources.find((s) => s.id === l.source.sourceId);
  const f = l.facts;
  return {
    id: l.tenderId, shortTitle: l.shortTitle, issuer: l.issuer, city: l.city, country: l.country, sector: l.sector,
    stage: cur.stage, step: cur.step,
    ownerId, ownerName: owner?.name ?? null, ownerRole: owner ? roleLine(owner) : null,
    teamName: teamOf(tenant, l.teamId)?.name ?? null,
    value: l.value.amount ? moneyVM(tenant, l.value.amount, l.value.ccy) : null, valueBasis: l.value.basis,
    submission: l.submissionDeadline ? { date: l.submissionDeadline.date, time: l.submissionDeadline.time } : null,
    nextGate: nextGateOf(l),
    health: healthOf(l, tenant).health,
    source: {
      name: src?.name ?? l.source.sourceId, ref: l.source.ref, capturedAt: l.capturedAt,
      ...(l.source.url ? { url: l.source.url } : {}), ...(l.source.documentHref ? { documentHref: l.source.documentHref } : {}),
    },
    capturedAt: l.capturedAt, lastActivityAt: lastActivityOf(l),
    // Win probability is masked like the positions (roles-and-access §9): null for viewers without `see.positions`.
    fit: fitOf(tenant, l), win: f?.stage === 3 && sightOf(tenant, l, viewer).positions ? { p: f.win.p, band: f.win.band } : null,
    live: !l.closedAt, ...(l.closedAt ? { closedAt: l.closedAt } : {}),
    bidManagerId: l.bidManagerId,
    facts: factsOf(tenant, l, viewer),
  };
}

/* ------------------------------------------------------------ tracker */

const DECISION: Record<GateRecord['decision'], { label: string; tone: Tone; goesOn: boolean }> = {
  pursue: { label: 'Pursue', tone: 'green', goesOn: true },
  discard: { label: 'Discard', tone: 'red', goesOn: false },
  hold: { label: 'Hold', tone: 'orange', goesOn: false },
  bid: { label: 'Bid', tone: 'green', goesOn: true },
  'no-bid': { label: 'No-bid', tone: 'red', goesOn: false },
  approved: { label: 'Approved', tone: 'green', goesOn: true },
  rejected: { label: 'Rejected', tone: 'red', goesOn: false },
};

const ORDER: ({ kind: 'stage'; n: StageN } | { kind: 'gate'; gate: GateKind })[] = [
  { kind: 'stage', n: 1 }, { kind: 'gate', gate: 'DG1' }, { kind: 'stage', n: 2 }, { kind: 'stage', n: 3 }, { kind: 'gate', gate: 'DG2' },
  { kind: 'stage', n: 4 }, { kind: 'stage', n: 5 }, { kind: 'stage', n: 6 }, { kind: 'stage', n: 7 }, { kind: 'gate', gate: 'DG3' },
  { kind: 'stage', n: 8 }, { kind: 'stage', n: 9 },
];

const initialsOfId = (id: string | null | undefined) => personById(id)?.initials;
const count = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
const daysBetween = (a: string, b: string) => Math.max(0, Math.round(hoursBetween(a, b) / 24));

const LOSS: Record<string, string> = { price: 'price', technical: 'technical score', 'local-content': 'local content', pq: 'prequalification', other: 'other reasons' };

/** The reason after "Discarded at DG1: …" in a closing note, else the note itself. */
const reasonOf = (note: string | undefined) => (note ? (note.includes(': ') ? note.slice(note.indexOf(': ') + 2) : note) : null);

/** "Won · SAR 142.0 M · 24 Feb · handover Sun 15 Mar", "Lost · price · 2 of 6 · Thu 5 Mar": the S9 node, live or closed. */
function resultNote(l: Lifecycle): string | undefined {
  const r = l.result;
  if (!r || (r.result !== 'won' && r.result !== 'lost')) return undefined;
  const parts = (...xs: (string | null | undefined)[]) => xs.filter(Boolean).join(' · ');
  if (r.result === 'lost') return parts('Lost', r.lossReason && LOSS[r.lossReason], r.rank && `${r.rank[0]} of ${r.rank[1]}`, day(r.at));
  const f = l.facts;
  const handover = l.events.find((e) => e.kind === 'handover')?.at ?? (f?.stage === 9 ? f.handoverAt : undefined);
  return parts('Won', money(r.value?.amount ?? l.value.amount, r.value?.ccy ?? l.value.ccy), day(r.at), handover && `handover ${day(handover)}`);
}

/** "Discarded at DG1 · below the value band · 3 Mar · Omar Siddiqui", "Won · SAR 142.0 M · handover Sun 15 Mar". */
function outcomeOf(l: Lifecycle): string | undefined {
  if (!l.closedAt) return undefined;
  const gate = (g: GateKind) => l.gates.find((x) => x.gate === g);
  const parts = (...xs: (string | null | undefined)[]) => xs.filter(Boolean).join(' · ');
  const r = l.result;
  switch (l.closedAs) {
    case 'won':
    case 'lost':
      return resultNote(l) ?? parts(l.closedAs === 'won' ? 'Won' : 'Lost', r && day(r.at));
    case 'discarded': {
      const g = gate('DG1');
      return parts('Discarded at DG1', reasonOf(l.closedNote), g && day(g.at), g && personName(g.byId));
    }
    case 'no-bid': {
      const g = gate('DG2');
      return parts('No-bid at DG2', reasonOf(l.closedNote), g && day(g.at), g && personName(g.byId));
    }
    case 'rejected': {
      const g = gate('DG3');
      return parts('Rejected at DG3', reasonOf(l.closedNote), g && day(g.at), g && personName(g.byId));
    }
    default:
      return parts(`Withdrawn in ${stageLabel(currentOf(l).stage)}`, l.closedNote, day(l.closedAt));
  }
}

const maskedText = (what: string[]) => `${what.join(', ').replace(/, ([^,]*)$/, ' and $1').replace(/^./, (c) => c.toUpperCase())}: masked for your role`;

/** "Eligibility 13 pass · 2 at risk · 1 interpretation · 0 fail": interpretation only when there is one. */
function eligibilityText(tenant: string, l: Lifecycle): string | null {
  const e = eligibilityOf(tenant, l);
  if (!e) return null;
  return `Eligibility ${e.pass} pass · ${e.atRisk} at risk${e.interpretation ? ` · ${e.interpretation} interpretation` : ''} · ${e.fail} fail`;
}

/** The step facts in one line, masked like the table (dashboards.md §7). */
function statusLine(tenant: string, l: Lifecycle, viewer: Person): string {
  const f = l.facts;
  const ccy = ccyOf(tenant);
  const m = (amount: number) => money(amount, ccy);
  const sight = sightOf(tenant, l, viewer);
  const marginOk = sight.margin;
  if (!f) return stepLabel(currentOf(l).stage, currentOf(l).step);
  switch (f.stage) {
    case 1:
      return [eligibilityText(tenant, l),
        f.documents === 'downloaded' ? 'documents downloaded' : `booklet ${m(f.documents.fee.amount)} to buy by ${day(f.documents.purchaseBy)}`,
        f.dg1Due ? `DG1 due ${dayTime(f.dg1Due)}` : null].filter(Boolean).join(' · ');
    case 2:
      return `${f.rfqs.sent} of ${f.rfqs.total} RFQs sent · ${f.packages.covered} of ${f.packages.total} packages covered · replies due ${day(f.repliesDue)}${f.rfqs.overdue ? ` · ${f.rfqs.overdue} overdue` : ''}`;
    case 3: {
      const masked = [...(sight.positions ? [] : ['win probability', 'committee positions']), ...(marginOk ? [] : ['margin'])];
      return [f.pack === 'preparation' ? `Pack in preparation · ${f.inputs.outstanding} of ${f.inputs.requested} inputs outstanding` : `Pack issued ${dayTime(f.issuedAt!)}`,
        sight.positions ? `${f.positions.recorded} of ${f.positions.of} positions` : null, sight.positions ? `win ${f.win.p} ± ${f.win.band}` : null,
        marginOk ? `margin ${f.marginRange[0]}–${f.marginRange[1]}%` : null, masked.length ? maskedText(masked) : null].filter(Boolean).join(' · ');
    }
    case 4:
      return `Programme ${f.durationPlannedM} months planned, ${f.durationRequiredM} required · float ${f.floatDays < 0 ? `−${-f.floatDays}` : f.floatDays} days · baseline due ${day(f.baselineDue)}`;
    case 5:
      return [marginOk ? `Estimated price ${m(f.estPrice.amount)} · base margin ${f.baseMarginPct}% (minimum ${f.minMarginPct}%)` : maskedText(['estimated price', 'margin']),
        `finance check ${f.financeCheck}`, `price due ${day(f.priceDue)}`].join(' · ');
    case 6:
      return `${f.sections.locked} of ${f.sections.total} sections locked · simulated score ${f.simScore} (pass mark ${f.passMark})${f.redTeamAt ? ` · red-team review ${day(f.redTeamAt)}` : ''}`;
    case 7:
      return `${f.requirements.evidenced} of ${f.requirements.total} requirements evidenced · ${f.mandatoryGaps} mandatory gaps · ${f.redlinesOpen} redlines open`;
    case 8:
      return `Package ${f.packageReadyPct}% ready · ${f.signaturesPending} signatures pending · bid bond ${marginOk ? m(f.bond.amount.amount) : '(amount masked for your role)'}${f.bond.issued ? ` valid to ${day(f.bond.validTo)}` : ' not issued'}`;
    case 9:
      return f.handoverAt ? `Handover ${day(f.handoverAt)}` : f.debriefAt ? `Debrief ${day(f.debriefAt)}` : 'Result received';
  }
}

/** The rest of the stage's steps, the next gate, and the submission date with working days. */
function nextLine(tenant: string, l: Lifecycle): string {
  const cur = currentOf(l);
  const steps = stageOf(cur.stage)!.steps;
  const rest = steps.slice(steps.findIndex((s) => s.key === cur.step) + 1).map((s) => s.label);
  const gate = nextGateOf(l);
  const chain = [...rest, ...(gate && !gate.slaEnd ? [gate.gate] : [])];
  const wd = deadlineWd(l, tenant);
  const sub = l.submissionDeadline && !l.submission ? `Submission ${day(l.submissionDeadline.date)}${wd !== null && wd >= 0 ? ` (${wd} wd)` : ''}` : null;
  const openText = gate?.slaEnd ? `${gate.gate} decision due ${dayTime(gate.slaEnd)}` : null;
  const f = l.facts;
  const tail = cur.stage === 8 ? (f?.stage === 8 && f.expectedAwardBy ? `Result expected by ${day(f.expectedAwardBy)}` : 'Waiting for the result')
    : cur.stage === 9 ? 'Close-out' : null;
  return [openText, chain.length ? chain.join(' → ') : null, sub].filter(Boolean).join(' · ') || tail || 'Close-out';
}

function teamLine(tenant: string, l: Lifecycle): string | null {
  const t = teamOf(tenant, l.teamId);
  if (!t) return null;
  const bm = personName(l.bidManagerId);
  return [`${t.name}${bm ? `: ${bm} (Bid Manager)` : ''}`, count(t.engineers, 'engineer'), count(t.estimators, 'estimator')].join(', ');
}

export function trackerFor(l: Lifecycle, tenant: string, viewer: Person): TrackerVM {
  const cur = currentOf(l);
  const closed = !!l.closedAt;
  const health = healthOf(l, tenant);
  const byStage = new Map<number, StageEntry[]>();
  for (const e of l.log) byStage.set(e.stage, [...(byStage.get(e.stage) ?? []), e]);
  const firstOf = (n: number) => byStage.get(n)?.[0]?.at;
  const decided = (g: GateKind) => l.gates.find((x) => x.gate === g);
  const open = openGate(l);

  // Where the tender stopped, if it did: a gate that did not go on, or the stage it closed in.
  const stopGate = closed ? l.gates.find((g) => !DECISION[g.decision].goesOn)?.gate : undefined;
  const stopStage = closed && !stopGate && l.closedAs !== 'won' ? cur.stage : undefined;
  let stopped = false;

  const nodes: TrackerNodeVM[] = ORDER.map((o) => {
    if (o.kind === 'stage') {
      const entries = byStage.get(o.n);
      const s = stageOf(o.n)!;
      const node: TrackerNodeVM = { key: `S${o.n}`, kind: 'stage', label: s.short, stage: o.n, status: 'not-reached' };
      if (!entries || stopped) return node;
      const from = entries[0].at;
      const later = [...byStage.keys()].filter((n) => n > o.n).sort((a, b) => a - b)[0];
      const to = later ? firstOf(later) : closed ? l.closedAt : undefined;
      const status = o.n === stopStage ? 'stopped' : !later && !closed ? 'current' : 'done';
      if (status === 'stopped') stopped = true;
      return {
        ...node, status, from, ...(to ? { to } : {}), days: daysBetween(from, to ?? NOW),
        ...(initialsOfId(entries[entries.length - 1].ownerId) ? { ownerInitials: initialsOfId(entries[entries.length - 1].ownerId) } : {}),
        ...(status === 'stopped' ? { note: outcomeOf(l) } : o.n === 9 && resultNote(l) ? { note: resultNote(l) } : {}),
      };
    }
    const node: TrackerNodeVM = { key: o.gate, kind: 'gate', label: o.gate, gate: o.gate, status: 'not-reached' };
    if (stopped) return node;
    const g = decided(o.gate);
    if (g) {
      const d = DECISION[g.decision];
      const late = hoursBetween(g.openedAt, g.at) - g.slaHours;
      const status = o.gate === stopGate ? 'stopped' : 'done';
      if (status === 'stopped') stopped = true;
      return {
        ...node, status, from: g.openedAt, to: g.at,
        decision: { label: d.label, tone: d.tone, byName: personName(g.byId) ?? g.byId, at: g.at, onTime: g.onTime, ...(g.onTime ? {} : { lateBy: hoursText(late) }) },
        ...(status === 'stopped' ? { note: outcomeOf(l) } : {}),
      };
    }
    if (open?.gate === o.gate) {
      return { ...node, status: 'current', from: open.openedAt, note: open.onTime ? `${hoursText(open.leftHours)} left of ${open.slaHours} h` : `Overdue by ${hoursText(open.leftHours)}` };
    }
    return node;
  });

  const ownerId = ownerOf(tenant, l);
  const owner = personById(ownerId);
  return {
    tenderId: l.tenderId, title: l.title,
    value: l.value.amount ? moneyVM(tenant, l.value.amount, l.value.ccy) : null,
    health: health.health, nodes,
    now: closed ? null : {
      stageLabel: stageLabel(cur.stage), stepLabel: stepLabel(cur.stage, cur.step),
      withName: owner?.name ?? null, withRole: owner ? roleLine(owner) : null,
      team: teamLine(tenant, l), status: statusLine(tenant, l, viewer), next: nextLine(tenant, l),
      blocker: health.health === 'on-track' ? null : (sightOf(tenant, l, viewer).margin ? health.reason : health.maskedReason ?? health.reason),
    },
    ...(closed ? { outcome: outcomeOf(l) } : {}),
  };
}

/* ---------------------------------------------------------------- port */

export const port: DataPort = {
  rows(tenant: string, scope: RowScope, viewer: Person, status: 'live' | 'closed' | 'all', done?: DemoDone): TenderRowVM[] {
    if (!isGccTenantKey(tenant)) return [];
    return lifecyclesOf(tenant, undefined, done)
      .filter((l) => (status === 'all' ? true : status === 'live' ? !l.closedAt : !!l.closedAt))
      .filter((l) => scope.kind === 'all' || (scope.kind === 'assigned' ? l.bidManagerId === scope.personId : currentOf(l).stage === scope.stage))
      .filter((l) => visible(tenant, l, viewer))
      .map((l) => rowFor(l, tenant, viewer));
  },
  tracker(tenant: string, tenderId: string, viewer: Person, done?: DemoDone): TrackerVM | null {
    const l = lifecycle(tenant, tenderId, done);
    return l && visible(tenant, l, viewer) ? trackerFor(l, tenant, viewer) : null;
  },
};
