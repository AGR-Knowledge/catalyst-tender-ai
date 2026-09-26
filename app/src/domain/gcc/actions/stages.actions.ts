import type { Lifecycle } from '@/data/gcc/lifecycle';
import { can } from '@/data/access';
import { firstWithRole, personById, type Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { AHEAD_DAYS, HANDOVER_DAYS, NEAR_WD } from '@/data/gcc/targets';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { money } from '@/domain/money';
import { slaState } from '../clock';
import { tenderCtx } from '../lifecycle.port';
import type { KpiCtx } from '../kpi/types';
import type { ActionVM } from '../viewmodels';
import {
  dayText, dayTimeText, daysBetween, liveIn, minsTo, openScreen, openTender, plural, qOf, stageOwner, urgency, waitingOn, wdText, wdTo,
} from '../kpi/stages';
import { openFields, toBuy } from '../kpi/stage1.kpi';
import { clockRunning, s2Of } from '../kpi/stage2.kpi';
import { baselinesDue, overTime } from '../kpi/stage4.kpi';
import { belowMargin, financePending, pricesDue } from '../kpi/stage5.kpi';
import { belowPass, s6Of } from '../kpi/stage6.kpi';
import { dg3Waiting, near, s7Of } from '../kpi/stage7.kpi';
import { bondIssues, dueWithin } from '../kpi/stage8.kpi';
import { handovers, hasLessons, overdue } from '../kpi/stage9.kpi';
import type { ActionSource } from './types';

/**
 * Needs your action for the stage dashboards (plan 013 Phase 3, dashboards.md
 * §4 and §10.4–10.12). Each source picks its tenders with the same selector
 * as its tile, so a tile and its rows never disagree. Every row names who it
 * waits on when the viewer isn't that person, so the Head of Tendering sees
 * "Waiting in {stage}" with names; the owner sees the rows as their own.
 * Portfolio sources (DG1, DG2, DG3, booklet approval, renewals, nudges,
 * submissions) are plan 015's and are reused by id in `stages.dash.ts`.
 */

type Row = Omit<ActionVM, 'source'>;

/**
 * A row, on 015's urgency scale (orchestrator review, 2026-09-26): a non-blocking
 * row that waits on someone else sorts after the viewer's own non-blocking rows,
 * as 015's `urgencyOf` does, so rows from both plans mix in one list.
 */
const row = (source: string, r: Row): ActionVM => ({
  source, ...r,
  urgency: r.waitingOn && r.urgency >= 1e13 ? r.urgency + 1e12 : r.urgency,
});

const tender = (l: Lifecycle) => ({ tenderId: l.tenderId, shortTitle: l.shortTitle });

const owner = (ctx: KpiCtx, n: number) => waitingOn(ctx.viewer, stageOwner(ctx.tenant, n));
const person = (ctx: KpiCtx, p: Person | undefined) => waitingOn(ctx.viewer, p);
const role = (ctx: KpiCtx, r: Person['role']) => firstWithRole(ctx.tenant, r);

/** Minutes to the tender's submission deadline (far ahead when it has none). */
const deadlineMins = (ctx: KpiCtx, l: Lifecycle) => (l.submissionDeadline ? minsTo(ctx, `${l.submissionDeadline.date}T${l.submissionDeadline.time}`) : 9e7);

/* ------------------------------------------------------------ Stage 1 */

const validationCheck: ActionSource = {
  id: 'validation.check', cap: 'queue.view',
  rows: (ctx) => openFields(ctx).map((g) => {
    const l = qOf(ctx).one(g.tenderId)!;
    const names = g.items.map((i) => i.item.field).join(', ');
    const oldest = g.items.reduce((a, b) => (b.ageMin > a.ageMin ? b : a));
    return row('validation.check', {
      id: `validation.check:${g.tenderId}`, type: 'Validation', typeTone: g.blocking ? 'orange' : undefined, ...tender(l),
      what: g.blocking
        ? `${plural(g.items.length, 'field')} to check (${names}). Pursue stays locked until ${g.blocking === 1 ? 'the blocking one is' : `the ${g.blocking} blocking ones are`} checked`
        : `${plural(g.items.length, 'field')} to check: ${names}`,
      due: { kind: 'text', text: `Raised ${oldest.ageText} ago` },
      waitingOn: owner(ctx, 1),
      primary: openScreen('/intake-queue', 'Open queue', g.tenderId),
      urgency: urgency(g.blocking > 0, -oldest.ageMin),
    });
  }),
};

const addendumConfirm: ActionSource = {
  id: 'addendum.confirm', cap: 'radar.view',
  rows(ctx) {
    if (!isGccTenantKey(ctx.tenant)) return [];
    const q = qOf(ctx);
    return gccData(ctx.tenant).intakeToday
      .filter((e) => e.disposition === 'addendum' && e.tenderId && q.one(e.tenderId))
      .map((e) => {
        const l = q.one(e.tenderId!)!;
        const which = /Addendum \d+/.exec(e.title)?.[0] ?? 'An addendum';
        return row('addendum.confirm', {
          id: `addendum.confirm:${e.id}`, type: 'Addendum', ...tender(l),
          what: `${which} received ${e.receivedAt.slice(11, 16)}: confirm the link to the tender`,
          due: { kind: 'text', text: 'Today' },
          waitingOn: owner(ctx, 1),
          primary: openScreen('/radar', 'Open radar', l.tenderId),
          urgency: urgency(false, minsTo(ctx, DEMO_TODAY)),
        });
      });
  },
};

/**
 * A booklet purchase once the Head of Tendering has approved it: the
 * Coordinator buys it. While it waits for approval, 015's `booklet.approve`
 * shows the row (disabled for the Coordinator, "waiting on" the approver).
 */
const bookletStatus: ActionSource = {
  id: 'booklet.status', cap: 'booklet.request',
  rows(ctx) {
    return toBuy(ctx).filter(({ l, d }) => d.requestedById && ctx.done[`booklet-approved:${l.tenderId}`]).map(({ l, d }) => {
      const fee = money(d.fee.amount, d.fee.ccy);
      const portal = isGccTenantKey(ctx.tenant) ? gccData(ctx.tenant).sources.find((s) => s.id === l.source.sourceId)?.name ?? 'the portal' : 'the portal';
      return row('booklet.status', {
        id: `booklet.status:${l.tenderId}`, type: 'Booklet purchase', typeTone: 'green', ...tender(l),
        what: `Purchase approved: buy the booklet (${fee}) on ${portal} before the purchase closes`,
        due: { kind: 'date', date: d.purchaseBy },
        waitingOn: owner(ctx, 1),
        primary: openTender(l.tenderId),
        urgency: urgency(false, minsTo(ctx, d.purchaseBy)),
      });
    });
  },
};

/* ------------------------------------------------------------ Stage 2 */

const rfqSend: ActionSource = {
  id: 'rfq.send', cap: 'sourcing.view',
  rows: (ctx) => clockRunning(ctx).map(({ l, start, end }) => {
    const f = l.facts?.stage === 2 ? l.facts : null;
    const s = slaState(start, end, ctx.now);
    return row('rfq.send', {
      id: `rfq.send:${l.tenderId}`, type: 'RFQ', typeTone: s.breached ? 'red' : 'orange', ...tender(l),
      // Just pursued, the packages aren't split yet (no RFQs to count).
      what: f?.rfqs.total ? `${f.rfqs.sent} of ${f.rfqs.total} RFQs sent: send the rest within 24 h of Pursue` : 'Pursued at DG1: split the packages and send the RFQs within 24 h',
      due: { kind: 'sla', start, end },
      waitingOn: owner(ctx, 2),
      primary: openScreen('/sourcing', 'Open packages', l.tenderId),
      urgency: urgency(s.breached, s.leftMin),
    });
  }),
};

const rfqEscalations: ActionSource = {
  id: 'rfq.escalations', cap: 'sourcing.view',
  rows: (ctx) => s2Of(ctx).filter((x) => x.f.rfqs.escalated > 0).map(({ l, f }) => row('rfq.escalations', {
    id: `rfq.escalations:${l.tenderId}`, type: 'RFQ', typeTone: 'red', ...tender(l),
    what: `${plural(f.rfqs.escalated, 'non-responder')} escalated to you: call the supplier${f.rfqs.escalated === 1 ? '' : 's'} or extend the reply date`,
    due: { kind: 'text', text: `${f.rfqs.overdue} overdue`, tone: 'red' },
    waitingOn: owner(ctx, 2),
    primary: openScreen('/sourcing', 'Open packages', l.tenderId),
    urgency: urgency(true, minsTo(ctx, f.repliesDue)),
  })),
};

const levellingConfirm: ActionSource = {
  id: 'levelling.confirm', cap: 'levelling.view',
  rows: (ctx) => s2Of(ctx).filter((x) => x.f.toLevel > 0).map(({ l, f }) => row('levelling.confirm', {
    id: `levelling.confirm:${l.tenderId}`, type: 'Levelling', ...tender(l),
    what: `${plural(f.toLevel, 'quote')} with adjustments to confirm (currency, VAT, delivery terms, exclusions) before ${f.toLevel === 1 ? 'it counts' : 'they count'}`,
    due: { kind: 'text', text: `${f.packages.covered} of ${f.packages.total} packages covered` },
    waitingOn: owner(ctx, 2),
    primary: openScreen('/levelling', 'Open levelling', l.tenderId),
    urgency: urgency(false, minsTo(ctx, f.repliesDue)),
  })),
};

/** Supplier questions: stale ones first (catalogue SRC-5), open ones after, so none is forgotten. */
const clarificationsStale: ActionSource = {
  id: 'clarifications.stale', cap: 'sourcing.view',
  rows: (ctx) => s2Of(ctx).filter((x) => x.f.clarifications.open > 0).map(({ l, f }) => {
    const { open, stale } = f.clarifications;
    return row('clarifications.stale', {
      id: `clarifications.stale:${l.tenderId}`, type: 'Clarification', typeTone: stale ? 'red' : undefined, ...tender(l),
      what: stale
        ? `${plural(stale, 'supplier question')} past the answer time, of ${open} open. Stale questions hold up quotes`
        : `${plural(open, 'supplier question')} to answer before the reply date`,
      due: { kind: 'date', date: f.repliesDue },
      waitingOn: owner(ctx, 2),
      primary: openScreen('/sourcing', 'Open packages', l.tenderId),
      urgency: urgency(stale > 0, minsTo(ctx, f.repliesDue)),
    });
  }),
};

/* ------------------------------------------------------- Stages 4 to 6 */

const baselineDue: ActionSource = {
  id: 'baseline.due', cap: 'tender.view',
  rows: (ctx) => baselinesDue(ctx).map(({ l, f, wd }) => row('baseline.due', {
    id: `baseline.due:${l.tenderId}`, type: 'Baseline', typeTone: wd < 0 ? 'red' : 'orange', ...tender(l),
    what: wd < 0 ? `The baseline programme was due ${dayText(f.baselineDue)}: release it so pricing can use it` : `Release the baseline programme by ${dayText(f.baselineDue)} (${wdText(wd)})`,
    due: { kind: 'date', date: f.baselineDue },
    waitingOn: owner(ctx, 4),
    primary: openTender(l.tenderId),
    urgency: urgency(wd < 0, minsTo(ctx, f.baselineDue)),
  })),
};

const programmeOverrun: ActionSource = {
  id: 'programme.overrun', cap: 'tender.view',
  rows: (ctx) => overTime(ctx).map(({ l, f }) => row('programme.overrun', {
    id: `programme.overrun:${l.tenderId}`, type: 'Baseline', typeTone: 'red', ...tender(l),
    what: `Programme ${f.durationPlannedM} months against ${f.durationRequiredM} required: re-sequence, or take a qualification to the committee`,
    due: { kind: 'text', text: `Float ${f.floatDays} days`, tone: 'red' },
    waitingOn: owner(ctx, 4),
    primary: openTender(l.tenderId),
    urgency: urgency(true, minsTo(ctx, f.baselineDue)),
  })),
};

const priceDue: ActionSource = {
  id: 'price.due', cap: 'tender.view',
  rows: (ctx) => pricesDue(ctx).map(({ l, f, wd }) => row('price.due', {
    id: `price.due:${l.tenderId}`, type: 'Price', typeTone: wd < 0 ? 'red' : 'orange', ...tender(l),
    what: wd < 0 ? `The price was due ${dayText(f.priceDue)}: approve it to hold the submission date` : `Approve the price by ${dayText(f.priceDue)} (${wdText(wd)})`,
    due: { kind: 'date', date: f.priceDue },
    waitingOn: owner(ctx, 5),
    primary: openTender(l.tenderId),
    urgency: urgency(wd < 0, minsTo(ctx, f.priceDue)),
  })),
};

/** Below the DG2 minimum margin. The figures show only to people who may see margin; the row itself shows to everyone. */
const marginBelow: ActionSource = {
  id: 'margin.below', cap: 'tender.view',
  rows: (ctx) => belowMargin(ctx).map(({ l, f }) => row('margin.below', {
    id: `margin.below:${l.tenderId}`, type: 'Price', typeTone: 'red', ...tender(l),
    what: can(ctx.viewer, 'see.margin', tenderCtx(ctx.tenant, l)).ok
      ? `Base margin ${f.baseMarginPct.toFixed(1)}% is below the ${f.minMarginPct.toFixed(1)}% minimum: decide before it is submitted`
      : 'A price needs a margin decision',
    due: { kind: 'date', date: f.priceDue },
    waitingOn: owner(ctx, 5),
    primary: openTender(l.tenderId),
    urgency: urgency(true, minsTo(ctx, f.priceDue)),
  })),
};

const financePendingRows: ActionSource = {
  id: 'finance.pending', cap: 'tender.view',
  rows: (ctx) => financePending(ctx).map(({ l, f }) => row('finance.pending', {
    id: `finance.pending:${l.tenderId}`, type: 'Price', ...tender(l),
    what: 'Finance to confirm bonds, insurances and head-office recovery before the price is approved',
    due: { kind: 'date', date: f.priceDue },
    waitingOn: person(ctx, role(ctx, 'fin')),
    primary: openTender(l.tenderId),
    urgency: urgency(false, minsTo(ctx, f.priceDue)),
  })),
};

const sectionsLate: ActionSource = {
  id: 'sections.late', cap: 'tender.view',
  rows: (ctx) => s6Of(ctx).filter((x) => x.f.sections.late > 0).map(({ l, f }) => row('sections.late', {
    id: `sections.late:${l.tenderId}`, type: 'Section', typeTone: 'orange', ...tender(l),
    what: `${plural(f.sections.late, 'section')} past ${f.sections.late === 1 ? 'its' : 'their'} due date${f.smeOverdue ? `, ${plural(f.smeOverdue, 'specialist task')} overdue` : ''}: chase the writers`,
    due: { kind: 'text', text: `${f.sections.locked} of ${f.sections.total} locked` },
    waitingOn: owner(ctx, 6),
    primary: openTender(l.tenderId),
    urgency: urgency(false, deadlineMins(ctx, l)),
  })),
};

const scoreBelow: ActionSource = {
  id: 'score.below', cap: 'tender.view',
  rows: (ctx) => belowPass(ctx).map(({ l, f }) => row('score.below', {
    id: `score.below:${l.tenderId}`, type: 'Section', typeTone: 'red', ...tender(l),
    what: `Simulated technical score ${f.simScore} against a pass mark of ${f.passMark}: strengthen the weakest sections before they lock`,
    due: { kind: 'text', text: `${f.passMark - f.simScore} points short`, tone: 'red' },
    waitingOn: owner(ctx, 6),
    primary: openTender(l.tenderId),
    urgency: urgency(true, deadlineMins(ctx, l)),
  })),
};

/** Red-team reviews due within 5 working days and not yet held. */
const reviewDue: ActionSource = {
  id: 'review.due', cap: 'tender.view',
  rows: (ctx) => liveIn(ctx, 6).flatMap((l) => l.events
    .flatMap((e) => (e.kind === 'review' && !e.at && e.due >= DEMO_TODAY ? [e] : []))
    .map((e) => ({ l, e, wd: wdTo(ctx.tenant, l, e.due) }))
    .filter((x) => x.wd <= NEAR_WD)
    .map(({ l, e, wd }) => row('review.due', {
      id: `review.due:${l.tenderId}:${e.due}`, type: 'Review', ...tender(l),
      what: `Red-team review due ${dayText(e.due)} (${wdText(wd)}): confirm the reviewers and circulate the draft`,
      due: { kind: 'date', date: e.due },
      waitingOn: owner(ctx, 6),
      primary: openTender(l.tenderId),
      urgency: urgency(false, minsTo(ctx, e.due)),
    }))),
};

/* ------------------------------------------------------------ Stage 7 */

const gapsOpen: ActionSource = {
  id: 'gaps.open', cap: 'tender.view',
  rows: (ctx) => s7Of(ctx).filter((x) => x.f.mandatoryGaps > 0).map(({ l, f }) => {
    const urgent = near(ctx, l);
    return row('gaps.open', {
      id: `gaps.open:${l.tenderId}`, type: 'Gap', typeTone: urgent ? 'red' : 'orange', ...tender(l),
      what: `${plural(f.mandatoryGaps, 'mandatory requirement')} without accepted evidence. One open gap at submission can exclude the bid`,
      ...(l.submissionDeadline ? { due: { kind: 'date' as const, date: l.submissionDeadline.date, time: l.submissionDeadline.time } } : {}),
      waitingOn: owner(ctx, 7),
      primary: openTender(l.tenderId),
      urgency: urgency(urgent, deadlineMins(ctx, l)),
    });
  }),
};

const redlinesOpen: ActionSource = {
  id: 'redlines.open', cap: 'tender.view',
  rows: (ctx) => s7Of(ctx).filter((x) => x.f.redlinesOpen > 0).map(({ l, f }) => row('redlines.open', {
    id: `redlines.open:${l.tenderId}`, type: 'Redline', ...tender(l),
    what: `${plural(f.redlinesOpen, 'contract deviation')} to accept, amend or escalate`,
    ...(l.submissionDeadline ? { due: { kind: 'date' as const, date: l.submissionDeadline.date, time: l.submissionDeadline.time } } : {}),
    waitingOn: owner(ctx, 7),
    primary: openTender(l.tenderId),
    urgency: urgency(false, deadlineMins(ctx, l)),
  })),
};

/** Evidence complete and redlines decided: Compliance issues the DG3 pack. */
const dg3Issue: ActionSource = {
  id: 'dg3.issue', cap: 'dg3.issue',
  rows: (ctx) => s7Of(ctx).filter((x) => x.l.log[x.l.log.length - 1].step === 'redlines' && x.f.mandatoryGaps === 0).map(({ l, f }) => row('dg3.issue', {
    id: `dg3.issue:${l.tenderId}`, type: 'DG3 pack', ...tender(l),
    what: `Evidence complete (${f.requirements.evidenced} of ${f.requirements.total}): issue the DG3 pack to the Head of Tendering`,
    ...(l.submissionDeadline ? { due: { kind: 'date' as const, date: l.submissionDeadline.date, time: l.submissionDeadline.time } } : {}),
    waitingOn: owner(ctx, 7),
    primary: openTender(l.tenderId),
    urgency: urgency(false, deadlineMins(ctx, l)),
  })),
  next(ctx) {
    const first = dg3Waiting(ctx)[0];
    if (!first) return null;
    const hot = role(ctx, 'hot');
    return `Next: DG3 on ${first.l.tenderId} with ${hot?.name ?? 'the Head of Tendering'}, due ${dayTimeText(first.g.slaEnd)}`;
  },
};

/* ------------------------------------------------------------ Stage 8 */

/**
 * Forms awaiting a signature on bids due in the next two weeks. The Bid
 * Manager's own bids due within 5 working days are 015's `submission.due` rows
 * (which name the signatures), so they aren't listed twice.
 */
const signaturesPending: ActionSource = {
  id: 'signatures.pending', cap: 'tender.view',
  rows: (ctx) => dueWithin(ctx, AHEAD_DAYS.submissions).filter((x) => x.f.signaturesPending > 0).flatMap(({ l, f }) => {
    const wd = wdTo(ctx.tenant, l, l.submissionDeadline!.date);
    if (wd >= 0 && wd <= NEAR_WD && can(ctx.viewer, 'pack.issue', tenderCtx(ctx.tenant, l)).ok) return [];
    return [row('signatures.pending', {
      id: `signatures.pending:${l.tenderId}`, type: 'Submission', typeTone: wd <= NEAR_WD ? 'orange' : undefined, ...tender(l),
      what: `${plural(f.signaturesPending, 'form')} still need${f.signaturesPending === 1 ? 's' : ''} an authorised signature and stamp before upload · package ${f.packageReadyPct}% ready`,
      due: { kind: 'date', date: l.submissionDeadline!.date, time: l.submissionDeadline!.time },
      waitingOn: person(ctx, personById(l.bidManagerId) ?? stageOwner(ctx.tenant, 8)),
      primary: openTender(l.tenderId),
      urgency: urgency(false, deadlineMins(ctx, l)),
    })];
  }),
};

const bondIssue: ActionSource = {
  id: 'bond.issue', cap: 'tender.view',
  rows: (ctx) => bondIssues(ctx).map(({ l, f }) => row('bond.issue', {
    id: `bond.issue:${l.tenderId}`, type: 'Submission', typeTone: 'red', ...tender(l),
    what: f.bond.issued
      ? `Bid bond valid to ${dayText(f.bond.validTo)}; the tender needs ${dayText(f.bond.requiredTo)}: ask the bank to extend it`
      : `Bid bond not issued yet: the bid is excluded without it`,
    due: { kind: 'date', date: l.submissionDeadline!.date, time: l.submissionDeadline!.time },
    waitingOn: person(ctx, role(ctx, 'fin')),
    primary: openTender(l.tenderId),
    urgency: urgency(true, deadlineMins(ctx, l)),
  })),
};

/* ------------------------------------------------------------ Stage 9 */

const handoverStart: ActionSource = {
  id: 'handover.start', cap: 'tender.view',
  rows: (ctx) => handovers(ctx).map(({ l, days }) => {
    const at = l.facts?.stage === 9 ? l.facts.handoverAt : undefined;
    return row('handover.start', {
      id: `handover.start:${l.tenderId}`, type: 'Handover', typeTone: days > HANDOVER_DAYS ? 'orange' : undefined, ...tender(l),
      what: `Won ${dayText(l.result!.at)}: hand what the bid promised to the delivery team${at && at > ctx.now ? `. Kick-off planned ${dayTimeText(at)}` : ''}`,
      due: { kind: 'text', text: `${plural(days, 'day')} since award`, ...(days > HANDOVER_DAYS ? { tone: 'orange' as const } : {}) },
      waitingOn: owner(ctx, 9),
      primary: openTender(l.tenderId),
      urgency: urgency(false, -days * 1440),
    });
  }),
};

/** Lost in the last 30 days: ask for a debrief, or prepare the one booked. */
const debriefHold: ActionSource = {
  id: 'debrief.hold', cap: 'tender.view',
  rows: (ctx) => liveIn(ctx, 9)
    .filter((l) => l.result?.result === 'lost' && l.result.at >= addDays(DEMO_TODAY, -30))
    .flatMap((l) => {
      const at = l.facts?.stage === 9 ? l.facts.debriefAt : undefined;
      if (at && at <= ctx.now) return [];
      const r = l.result!;
      const why = [r.lossReason && `lost on ${r.lossReason === 'local-content' ? 'local content' : r.lossReason === 'pq' ? 'prequalification' : r.lossReason}`,
        r.rank && `${r.rank[0]} of ${r.rank[1]}`, r.gapToWinnerPct !== undefined && `${r.gapToWinnerPct}% above the winner`].filter(Boolean).join(', ');
      return [row('debrief.hold', {
        id: `debrief.hold:${l.tenderId}`, type: 'Debrief', ...tender(l),
        what: at ? `Debrief with the employer booked ${dayTimeText(at)}: prepare the questions (${why})` : `Ask the employer for a debrief (${why})`,
        ...(at ? { due: { kind: 'date' as const, date: at.slice(0, 10), time: at.slice(11, 16) } } : { due: { kind: 'text' as const, text: `Result ${dayText(r.at)}` } }),
        waitingOn: owner(ctx, 9),
        primary: openTender(l.tenderId),
        urgency: urgency(false, at ? minsTo(ctx, at) : 0),
      })];
    }),
};

/** Results older than 14 days with no lessons recorded. */
const lessonsRecord: ActionSource = {
  id: 'lessons.record', cap: 'tender.view',
  rows: (ctx) => liveIn(ctx, 9)
    .filter((l) => l.result && (l.result.result === 'won' || l.result.result === 'lost') && daysBetween(l.result.at, ctx.now) > 14 && !hasLessons(l))
    .map((l) => row('lessons.record', {
      id: `lessons.record:${l.tenderId}`, type: 'Lessons', ...tender(l),
      what: `${l.result!.result === 'won' ? 'Won' : 'Lost'} ${dayText(l.result!.at)}: record the lessons while the team remembers them`,
      due: { kind: 'text', text: `${plural(daysBetween(l.result!.at, ctx.now), 'day')} since the result` },
      waitingOn: owner(ctx, 9),
      primary: openTender(l.tenderId),
      urgency: urgency(false, minsTo(ctx, addDays(l.result!.at.slice(0, 10), 14))),
    })),
};

const resultChase: ActionSource = {
  id: 'result.chase', cap: 'tender.view',
  rows: (ctx) => overdue(ctx).map(({ l, by }) => row('result.chase', {
    id: `result.chase:${l.tenderId}`, type: 'Result', typeTone: 'orange', ...tender(l),
    what: `Result expected by ${dayText(by)}. Worth a call to the employer.`,
    due: { kind: 'text', text: `${plural(daysBetween(by, ctx.now), 'day')} overdue`, tone: 'orange' },
    waitingOn: owner(ctx, 9),
    primary: openTender(l.tenderId),
    urgency: urgency(false, minsTo(ctx, by)),
  })),
};

export const ACTION_SOURCES: ActionSource[] = [
  validationCheck, addendumConfirm, bookletStatus,
  rfqSend, rfqEscalations, levellingConfirm, clarificationsStale,
  baselineDue, programmeOverrun, priceDue, marginBelow, financePendingRows, sectionsLate, scoreBelow, reviewDue,
  gapsOpen, redlinesOpen, dg3Issue,
  signaturesPending, bondIssue,
  handoverStart, debriefHold, lessonsRecord, resultChase,
];
