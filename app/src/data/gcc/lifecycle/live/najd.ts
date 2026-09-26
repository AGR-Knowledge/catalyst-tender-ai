import { NAJD } from '../../tenants/najd';
import { HERO_ID } from '../../hero';
import { buildChain, type ChainSpec, type GateSpec } from '../chain';
import type { InputItem, Lifecycle, S2Facts, S8Facts, StageN, WorkEvent } from '../types';
import { dg1Gate, dg1Record, dg2Gate, dg2Record, facilityAfter, fromRegister, intakeSteps, refFor, registerRow, s1, s1Derived, sourceOf, teamFor } from './common';

/**
 * Najd (tenant A), hand-authored (plan 017 Phase 2.1): every register row of
 * plan 004, the live register of dashboards.md §12.2, the recently closed
 * tenders listed there, and the completions of plan 004's DG1 and DG2
 * records that §12.3's 90-day anchors fix. Everything else is generated.
 *
 * Dates are KSA working days (Fri–Sat weekend; Founding Day Sun 22 Feb)
 * except where the story says otherwise: T-2025-305's DG3 pack (Sat 7 Mar),
 * T-2026-097's pack (Sat 7 Mar) and T-2026-107's M1 (captured on Founding
 * Day, hence the late DG1). T-2026-079 was submitted on Thu 19 Feb, before
 * the Founding Day closure (plan 020 B7).
 */

const T = 'najd' as const;
const M = 1_000_000;
const SAR = (m: number) => ({ amount: Math.round(m * M), ccy: 'SAR' as const });
const HOT = 'najd.hot';
const BID = 'najd.bid';
const CCWS = 'Central Cities Water Services Company';
const ECWS = 'Eastern Cities Water Services Company (ECWS)';
const NCWS = 'Northern Cities Water Services Company';
const SCWS = 'Southern Cities Water Services Company';
const WCWS = 'Western Cities Water Services Company';

/** KSA government bid bond: 2% of the bid (plan 009a's pack bonds). */
const BOND_PCT = 2;

const story = (id: string, spec: Partial<ChainSpec>): Lifecycle => {
  const t = registerRow(NAJD, id);
  return buildChain({ ...fromRegister(T, NAJD, t), ...spec } as ChainSpec);
};

/** A tender that is not on plan 004's register. */
function row(id: string, title: string, shortTitle: string, issuer: string, city: string, sector: string, valueM: number,
  spec: Omit<Partial<ChainSpec>, 'id' | 'title'> & { captured: string }): Lifecycle {
  return buildChain({
    tenant: T, cc: 'SA', id, title, shortTitle, issuer, city, country: 'Saudi Arabia', sector,
    value: { amount: SAR(valueM).amount, ccy: 'SAR', basis: 'estimate' }, teamId: teamFor(NAJD, id, sector), bidManagerId: BID,
    source: sourceOf(T, 'etimad', refFor(issuer, id, NAJD)), origin: 'live', ...spec,
  } as ChainSpec);
}

const pursue = (at: string, onTime = true): GateSpec => ({ at, decision: 'pursue', byId: BID, onTime, recommendation: 'pursue' });
const bid = (at: string): GateSpec => ({ at, decision: 'bid', byId: HOT, onTime: true });
const approved = (at: string): GateSpec => ({ at, decision: 'approved', byId: HOT, onTime: true });
const sub = (at: string, deadline: string) => ({ at, deadline, onTime: at <= deadline, portal: 'Etimad' });

function s8(p: Omit<S8Facts, 'stage' | 'bond'>, bondM: number, validTo: string, requiredTo: string): S8Facts {
  return { stage: 8, ...p, bond: { amount: SAR(bondM), validTo, requiredTo, issued: true } };
}

/** Plan 009a's contributor inputs for T-2026-097 and T-2026-101, as an interim summary. */
function inputs(tenderId: string, requestedAt: string, rows: [key: string, what: string, section: string, ownerId: string, due: string, submittedAt?: string][]): InputItem[] {
  return rows.map(([key, what, section, ownerId, due, submittedAt]) => ({
    id: `${tenderId}:${key}`, what, section, ownerId, requestedById: BID, requestedAt, due, ...(submittedAt ? { submittedAt } : {}),
  }));
}

const INPUTS_097 = inputs('T-2026-097', '2026-03-01T09:00', [
  ['commercial', 'Preliminary margin range', '9.7', 'najd.comm', '2026-03-05T17:00', '2026-03-05T11:40'],
  ['finance', 'Facility headroom and bond capacity', '9.5', 'najd.fin', '2026-03-05T17:00', '2026-03-05T15:20'],
  ['legal', 'Top five contract risks', '9.6', 'najd.comp', '2026-03-06T17:00', '2026-03-06T16:05'],
  ['planning', 'Preliminary programme and delivery impact', '9.4', 'najd.plan', '2026-03-05T17:00', '2026-03-05T13:30'],
  ['pd', 'Delivery feasibility and key staff', '9.4', 'najd.dir', '2026-03-06T17:00', '2026-03-06T10:15'],
  ['hr', 'Key-personnel availability', '9.4', 'najd.hr', '2026-03-06T17:00', '2026-03-06T12:00'],
]);

const INPUTS_101 = inputs('T-2026-101', '2026-03-04T11:00', [
  ['commercial', 'Preliminary margin range', '9.7', 'najd.comm', '2026-03-07T17:00', '2026-03-07T12:20'],
  ['planning', 'Preliminary programme and delivery impact', '9.4', 'najd.plan', '2026-03-07T17:00', '2026-03-07T10:05'],
  ['pd', 'Delivery feasibility and key staff', '9.4', 'najd.dir', '2026-03-07T17:00', '2026-03-07T14:40'],
  ['hr', 'Key-personnel availability', '9.4', 'najd.hr', '2026-03-07T17:00', '2026-03-07T11:15'],
  ['finance', 'Facility headroom and bond capacity', '9.5', 'najd.fin', '2026-03-07T17:00'],
  ['legal', 'Top five contract risks', '9.6', 'najd.comp', '2026-03-08T17:00'],
]);

const NOW_ISO = '2026-03-08T10:00';
const summary = (items: InputItem[]) => ({
  requested: items.length,
  outstanding: items.filter((i) => !i.submittedAt).length,
  late: items.filter((i) => !i.submittedAt && i.due < NOW_ISO).length,
  items,
});

const s2 = (f: Omit<S2Facts, 'stage'>): S2Facts => ({ stage: 2, ...f });

// ---------------------------------------------------------------------------
// Stage 1: the 12 register rows (dashboards.md §12.2, decided 2026-09-25).

const STAGE1: Lifecycle[] = [
  story(HERO_ID, {
    now: { stage: 1, step: 'validating' },
    // Documents in at 07:33, the intake event (the booklet purchase was approved at 07:31).
    steps: intakeSteps('2026-03-08T07:15', '2026-03-08T07:33', '2026-03-08T07:44'),
    // Eligibility from 007a: Zakat and GOSI expire before opening (gcc-demo-data §4.7).
    facts: s1Derived('EN', { dg1Due: '2026-03-09T07:44' }),
  }),
  story('T-2026-117', {
    m1: '2026-03-07T16:10', now: { stage: 1, step: 'awaiting-dg1' },
    steps: intakeSteps('2026-03-07T15:58', '2026-03-07T16:00', '2026-03-07T16:10'),
    facts: s1Derived('EN', { dg1Due: '2026-03-08T16:10' }),
  }),
  story('T-2026-119', {
    now: { stage: 1, step: 'screened' },
    steps: { ...intakeSteps('2026-03-08T07:52', '2026-03-08T07:53', '2026-03-08T08:00'), '1:screened': '2026-03-08T08:12' },
    facts: s1Derived('EN'),
  }),
  story('T-2026-120', {
    now: { stage: 1, step: 'validating' },
    steps: intakeSteps('2026-03-08T08:06', '2026-03-08T08:07', '2026-03-08T08:13'),
    facts: s1(0, 0, 0, 'EN'),
  }),
  story('T-2026-121', {
    now: { stage: 1, step: 'screened' },
    steps: { ...intakeSteps('2026-03-08T08:21', '2026-03-08T08:22', '2026-03-08T08:26'), '1:screened': '2026-03-08T08:40' },
    facts: s1(0, 0, 0, 'EN'),
  }),
  story('T-2026-122', {
    now: { stage: 1, step: 'captured' },
    facts: s1(0, 0, 0, 'EN', {
      documents: { fee: { amount: 3_000, ccy: 'SAR' }, purchaseBy: '2026-03-10', requestedById: 'najd.coord', requestedAt: '2026-03-08T08:41' },
    }),
  }),
  ...['T-2026-123', 'T-2026-124', 'T-2026-125', 'T-2026-126', 'T-2026-127', 'T-2026-128'].map((id) => {
    const t = registerRow(NAJD, id);
    const logged = t.intake.loggedAt!;
    const screened = new Date(Date.parse(`${logged}:00Z`) + 10 * 60_000).toISOString().slice(0, 16);
    const event = NAJD.intakeToday.find((e) => e.tenderId === id)!;
    return story(id, {
      now: { stage: 1, step: 'screened' },
      steps: { ...intakeSteps(t.intake.capturedAt, event.receivedAt, logged), '1:screened': screened },
      facts: s1(0, 0, 0, event.language),
    });
  }),
];

// ---------------------------------------------------------------------------
// Stages 2 and 3 (register rows).

const STAGE2_3: Lifecycle[] = [
  story('T-2026-109', {
    m1: '2026-03-03T11:25', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-109')),
    steps: { ...intakeSteps('2026-03-03T10:50', '2026-03-03T11:14', '2026-03-03T11:25'), '2:shortlisting': '2026-03-04T14:20', '2:rfqs-out': '2026-03-05T10:05' },
    now: { stage: 2, step: 'rfqs-out' },
    facts: s2({
      packages: { total: 9, covered: 0 }, rfqs: { sent: 27, total: 27, overdue: 0, escalated: 0, answeredOnTime: 0, dueSoFar: 0 },
      toLevel: 0, notCoveredPct: 0, repliesDue: '2026-03-15', clarifications: { open: 2, stale: 0 }, bestFitApproved: 0,
    }),
  }),
  story('T-2026-104', {
    m1: '2026-02-25T11:17', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-104')),
    steps: {
      ...intakeSteps('2026-02-25T11:05', '2026-02-25T11:08', '2026-02-25T11:17'),
      '2:shortlisting': '2026-02-26T12:30', '2:rfqs-out': '2026-02-26T16:40', '2:quotes-in': '2026-03-02T09:00', '2:levelling': '2026-03-05T11:00',
    },
    now: { stage: 2, step: 'levelling' },
    facts: s2({
      packages: { total: 11, covered: 7 }, rfqs: { sent: 33, total: 33, overdue: 4, escalated: 2, answeredOnTime: 22, dueSoFar: 31 },
      // Replies due: the next reply date still ahead, after extensions (dashboards.md §10.5, decided 2026-09-26).
      toLevel: 5, notCoveredPct: 3.1, repliesDue: '2026-03-10', clarifications: { open: 4, stale: 0 }, bestFitApproved: 0,
    }),
  }),
  story('T-2026-101', {
    m1: '2026-02-11T13:42', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-101')),
    steps: {
      ...intakeSteps('2026-02-11T13:30', '2026-02-11T13:33', '2026-02-11T13:42'),
      '2:shortlisting': '2026-02-12T15:30', '2:rfqs-out': '2026-02-12T16:50', '2:quotes-in': '2026-02-17T10:00', '2:levelling': '2026-02-24T10:00',
      '2:best-fit-approved': '2026-03-01T12:00', '3:pack-in-preparation': '2026-03-02T09:00',
    },
    now: { stage: 3, step: 'pack-in-preparation' },
    facts: {
      stage: 3, pack: 'preparation', inputs: summary(INPUTS_101), positions: { recorded: 0, of: 5, bySeat: {} },
      win: { p: 47, band: 12 }, marginRange: [9.5, 12], facilityAfter: facilityAfter(NAJD, registerRow(NAJD, 'T-2026-101').value.amount, BOND_PCT),
    },
  }),
  story('T-2026-097', {
    m1: '2026-01-11T08:52', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-097')),
    packIssued: '2026-03-07T14:10',
    steps: {
      ...intakeSteps('2026-01-11T08:40', '2026-01-11T08:43', '2026-01-11T08:52'),
      '2:shortlisting': '2026-01-11T13:00', '2:rfqs-out': '2026-01-11T16:10', '2:quotes-in': '2026-01-25T10:00', '2:levelling': '2026-02-08T10:00',
      '2:best-fit-approved': '2026-02-16T12:00', '3:pack-in-preparation': '2026-02-19T09:00', '3:inputs-complete': '2026-03-06T16:05',
      '3:positions-in': '2026-03-07T18:40',
    },
    now: { stage: 3, step: 'positions-in' },
    facts: {
      stage: 3, pack: 'issued', issuedAt: '2026-03-07T14:10', inputs: summary(INPUTS_097),
      stale: { since: '2026-03-08T09:12', reason: 'Addendum 2 received: two packages re-quoting and the delay damages cap raised' },
      positions: {
        recorded: 2, of: 5, bySeat: {
          cfo: { stance: 'conditions', at: '2026-03-07T18:40', comment: 'Keep the bid bond within the facility; see my margin condition' },
          technical: { stance: 'support', at: '2026-03-08T08:15' },
        },
      },
      win: { p: 58, band: 8 }, marginRange: [8.5, 11.5],
      facilityAfter: facilityAfter(NAJD, registerRow(NAJD, 'T-2026-097').value.amount, BOND_PCT),
      weightedValue: SAR((registerRow(NAJD, 'T-2026-097').value.amount / M) * 0.58),
    },
  }),
];

// ---------------------------------------------------------------------------
// Stages 4–8 (dashboards.md §12.2). Their DG1s fall before 9 Dec 2025, except
// T-2025-317's, because §12.3 fixes the 90-day DG1 total at plan 004's 46
// records: hence their long Stage 2.

const replan = (at: string, turnaroundH: number, trigger: string): WorkEvent => ({ kind: 'replan', at, turnaroundH, trigger });
const reprice = (at: string, turnaroundH: number, trigger: string): WorkEvent => ({ kind: 'reprice', at, turnaroundH, trigger });
const m2 = (due: string, atIso?: string): WorkEvent => ({ kind: 'm2', due, ...(atIso ? { at: atIso } : {}) });
const review = (due: string, atIso?: string): WorkEvent => ({ kind: 'review', due, ...(atIso ? { at: atIso } : {}) });

const STAGE4_8: Lifecycle[] = [
  row('T-2025-341', 'Jeddah industrial wastewater network', 'Jeddah industrial WW network', WCWS, 'Jeddah', 'Utility networks', 120, {
    captured: '2025-12-04T09:40', m1: '2025-12-07T08:30', dg1: pursue('2025-12-07T11:10'),
    packIssued: '2026-03-02T15:30', dg2: bid('2026-03-03T11:00'),
    now: { stage: 4, step: 'baseline-drafting' }, submissionDeadline: { date: '2026-04-21', time: '10:00' },
    facts: { stage: 4, durationPlannedM: 22, durationRequiredM: 24, floatDays: 12, longLeadAtRisk: 1, peakManpower: 420, baselineDue: '2026-03-11', m2Due: '2026-03-31' },
  }),
  row('T-2025-336', 'Riyadh stormwater pumping stations', 'Riyadh stormwater pumping', 'Riyadh Municipal Projects Office', 'Riyadh', 'Utility networks', 88, {
    captured: '2025-12-02T09:00', m1: '2025-12-03T13:00', dg1: pursue('2025-12-04T10:00'),
    packIssued: '2026-02-25T15:00', dg2: bid('2026-02-26T10:30'),
    steps: { '4:resource-loading': '2026-03-03T13:00' },
    now: { stage: 4, step: 'resource-loading' }, submissionDeadline: { date: '2026-04-14', time: '10:00' },
    events: [replan('2026-03-03T09:30', 3.5, 'Quote lead time')],
    facts: { stage: 4, durationPlannedM: 20, durationRequiredM: 18, floatDays: -61, longLeadAtRisk: 2, peakManpower: 310, baselineDue: '2026-03-12', m2Due: '2026-03-18' },
  }),
  row('T-2025-322', 'Al-Ahsa water treatment plant', 'Al-Ahsa WTP', ECWS, 'Hofuf', 'Water and wastewater', 210, {
    captured: '2025-11-30T09:00', m1: '2025-12-01T13:00', dg1: pursue('2025-12-02T10:00'),
    packIssued: '2026-02-09T15:00', dg2: bid('2026-02-10T10:30'),
    steps: { '4:m2': '2026-02-19T09:00', '5:cost-build-up': '2026-02-23T09:00', '5:scenarios': '2026-03-01T09:00', '5:finance-check': '2026-03-05T14:00' },
    now: { stage: 5, step: 'finance-check' }, submissionDeadline: { date: '2026-04-06', time: '10:00' },
    events: [replan('2026-02-16T10:00', 2, 'Site visit findings'), m2('2026-02-19', '2026-02-19T12:00'), reprice('2026-03-01T11:30', 1.5, 'Addendum 1')],
    facts: { stage: 5, estPrice: SAR(203.6), baseMarginPct: 10.2, minMarginPct: 9, sourcedPct: 93, estimatedPct: 4, financeCheck: 'pending', priceDue: '2026-03-12', m2Due: '2026-02-19' },
  }),
  row('T-2025-329', 'Buraydah sewer lift stations', 'Buraydah sewer lift stations', CCWS, 'Buraydah', 'Water and wastewater', 64, {
    captured: '2025-12-01T09:30', m1: '2025-12-02T14:00', dg1: pursue('2025-12-03T10:20'),
    packIssued: '2026-02-17T15:00', dg2: bid('2026-02-18T11:00'),
    steps: { '5:cost-build-up': '2026-02-25T09:00', '5:scenarios': '2026-03-04T10:00' },
    now: { stage: 5, step: 'scenarios' }, submissionDeadline: { date: '2026-04-08', time: '10:00' },
    events: [m2('2026-02-24', '2026-02-24T12:00')],
    facts: { stage: 5, estPrice: SAR(66.1), baseMarginPct: 7.8, minMarginPct: 9, sourcedPct: 81, estimatedPct: 11, financeCheck: 'pending', priceDue: '2026-03-15', m2Due: '2026-02-24' },
  }),
  story('T-2026-088', {
    m1: '2026-01-06T16:28', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-088')),
    packIssued: '2026-02-01T15:00', dg2: dg2Gate(dg2Record(NAJD, 'T-2026-088'), HOT),
    steps: {
      ...intakeSteps('2026-01-06T16:15', '2026-01-06T16:18', '2026-01-06T16:28'),
      '5:cost-build-up': '2026-02-11T09:00', '6:sections-assigned': '2026-02-23T09:00', '6:drafting': '2026-02-24T09:00', '6:review': '2026-03-05T09:00',
    },
    now: { stage: 6, step: 'review' },
    events: [m2('2026-02-10', '2026-02-10T12:00'), reprice('2026-02-19T10:00', 2.5, 'Addendum 1'), review('2026-03-10')],
    facts: { stage: 6, sections: { locked: 11, total: 18, late: 1 }, simScore: 76, passMark: 70, smeOverdue: 0, redTeamAt: '2026-03-10T10:00', reusePct: 42 },
  }),
  row('T-2025-317', 'Taif water reservoirs', 'Taif water reservoirs', WCWS, 'Taif', 'Water and wastewater', 96, {
    captured: '2025-12-28T09:10', m1: '2025-12-28T15:00', dg1: pursue('2025-12-29T10:40'),
    packIssued: '2026-02-04T15:00', dg2: bid('2026-02-05T10:00'),
    steps: { '4:m2': '2026-02-12T09:00', '5:cost-build-up': '2026-02-15T09:00', '6:sections-assigned': '2026-02-24T09:00', '6:drafting': '2026-02-25T09:00' },
    now: { stage: 6, step: 'drafting' }, submissionDeadline: { date: '2026-04-13', time: '10:00' },
    events: [m2('2026-02-12', '2026-02-12T11:00'), review('2026-03-24')],
    facts: { stage: 6, sections: { locked: 3, total: 12, late: 2 }, simScore: 68, passMark: 70, smeOverdue: 3, reusePct: 35 },
  }),
  row('T-2025-305', 'Yanbu STP expansion', 'Yanbu STP expansion', WCWS, 'Yanbu', 'Water and wastewater', 150, {
    captured: '2025-11-20T09:30', m1: '2025-11-23T14:00', dg1: pursue('2025-11-24T10:00'),
    packIssued: '2026-01-20T15:00', dg2: bid('2026-01-21T10:30'),
    dg3Issued: '2026-03-07T16:00',
    steps: { '5:cost-build-up': '2026-02-01T09:00', '6:sections-assigned': '2026-02-11T09:00', '7:matrix': '2026-02-25T09:00', '7:gaps-closing': '2026-03-01T09:00', '7:redlines': '2026-03-04T09:00' },
    now: { stage: 7, step: 'dg3-issued' }, submissionDeadline: { date: '2026-03-15', time: '10:00' },
    events: [m2('2026-01-29', '2026-01-29T12:00'), review('2026-02-19', '2026-02-18T10:00')],
    facts: { stage: 7, requirements: { evidenced: 146, total: 146 }, mandatoryGaps: 0, redlinesOpen: 0, risksWithoutOwner: 0, dg3IssuedAt: '2026-03-07T16:00' },
  }),
  row('T-2025-298', 'Makkah water distribution network', 'Makkah water distribution', WCWS, 'Makkah', 'Utility networks', 230, {
    captured: '2025-11-16T10:00', m1: '2025-11-17T14:00', dg1: pursue('2025-11-18T09:30'),
    packIssued: '2026-01-18T08:30', dg2: bid('2026-01-18T15:00'),
    dg3Issued: '2026-03-03T12:00', dg3: approved('2026-03-04T10:00'),
    steps: { '5:cost-build-up': '2026-01-27T09:00', '6:sections-assigned': '2026-02-09T09:00', '7:matrix': '2026-02-23T09:00', '8:signatures': '2026-03-05T15:00' },
    now: { stage: 8, step: 'signatures' }, submissionDeadline: { date: '2026-03-12', time: '10:00' },
    events: [m2('2026-01-25', '2026-01-26T10:00'), review('2026-02-17', '2026-02-17T11:00')],
    facts: s8({ packageReadyPct: 88, signaturesPending: 2, openingDate: '2026-03-12' }, 2.3, '2026-06-10', '2026-06-10'),
  }),
  row('T-2025-291', 'Riyadh sewage network extension', 'Riyadh sewage network ext.', CCWS, 'Riyadh', 'Utility networks', 290, {
    captured: '2025-11-09T09:00', m1: '2025-11-10T15:00', dg1: pursue('2025-11-11T10:40'),
    packIssued: '2026-01-11T15:00', dg2: bid('2026-01-12T10:00'),
    dg3Issued: '2026-02-24T14:00', dg3: approved('2026-02-25T11:00'),
    submission: sub('2026-03-03T09:30', '2026-03-03T10:00'),
    steps: { '5:cost-build-up': '2026-01-20T09:00', '6:sections-assigned': '2026-02-01T09:00', '7:matrix': '2026-02-16T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [m2('2026-01-19', '2026-01-19T11:00'), review('2026-02-10', '2026-02-10T10:00')],
    facts: s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-03-03', expectedAwardBy: '2026-04-15' }, 9.4, '2026-06-01', '2026-06-01'),
  }),
  row('T-2025-284', 'Dammam water network', 'Dammam water network', ECWS, 'Dammam', 'Utility networks', 186, {
    captured: '2025-10-30T10:00', m1: '2025-11-02T13:00', dg1: pursue('2025-11-03T10:30'),
    packIssued: '2025-12-28T08:30', dg2: bid('2025-12-28T14:00'),
    dg3Issued: '2026-02-09T12:00', dg3: approved('2026-02-10T10:30'),
    submission: sub('2026-02-15T09:15', '2026-02-15T10:00'),
    steps: { '5:cost-build-up': '2026-01-11T09:00', '6:sections-assigned': '2026-01-19T09:00', '7:matrix': '2026-02-02T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [m2('2026-01-08', '2026-01-08T12:00'), review('2026-01-28', '2026-01-28T10:00')],
    facts: s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-15', expectedAwardBy: '2026-04-20' }, 6.2, '2026-05-16', '2026-05-16'),
  }),
  story('T-2026-079', {
    m1: '2026-01-03T14:33', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-079')),
    packIssued: '2026-01-25T16:00', dg2: dg2Gate(dg2Record(NAJD, 'T-2026-079'), HOT),
    dg3Issued: '2026-02-15T11:00', dg3: approved('2026-02-16T10:00'),
    submission: sub('2026-02-19T09:10', '2026-02-19T10:00'),
    steps: { ...intakeSteps('2026-01-03T14:20', '2026-01-03T14:23', '2026-01-03T14:33'), '5:cost-build-up': '2026-02-03T09:00', '6:sections-assigned': '2026-02-08T09:00', '7:matrix': '2026-02-11T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [m2('2026-02-02', '2026-02-02T15:00'), review('2026-02-10', '2026-02-10T14:00')],
    facts: s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-19', expectedAwardBy: '2026-03-05' }, 8.4, '2026-05-20', '2026-05-20'),
  }),
];

// ---------------------------------------------------------------------------
// Stage 9 (live) and the recently closed tenders of dashboards.md §12.2.
// T-2025-262 carries plan 004's O-25-02 and DG2 T-2025-219; T-2025-270
// carries O-25-15; T-2025-255 carries O-25-16; T-2026-107 carries DG1 T-2026-049.

const STAGE9_AND_CLOSED: Lifecycle[] = [
  row('T-2025-262', 'Unaizah STP upgrade', 'Unaizah STP upgrade', CCWS, 'Unaizah', 'Water and wastewater', 142, {
    clientType: 'government',
    captured: '2025-10-16T10:00', m1: '2025-10-19T14:00', dg1: pursue('2025-10-20T10:00'),
    packIssued: '2025-11-11T16:00', dg2: bid('2025-11-12T11:30'),
    dg3Issued: '2025-12-14T09:00', dg3: approved('2025-12-14T16:00'),
    submission: sub('2025-12-16T09:30', '2025-12-16T10:00'),
    result: { at: '2026-02-24T11:00', result: 'won', rank: [1, 5], predictedWin: 76, value: SAR(142) },
    steps: { '5:cost-build-up': '2025-11-20T09:00', '6:sections-assigned': '2025-11-27T09:00', '7:matrix': '2025-12-07T09:00', '9:handover-or-debrief': '2026-02-25T09:00' },
    now: { stage: 9, step: 'handover-or-debrief' },
    events: [m2('2025-11-19', '2025-11-19T12:00'), review('2025-12-04', '2025-12-04T10:00')],
    facts: { stage: 9, handoverAt: '2026-03-15T09:00', lessons: false },
  }),
  row('T-2025-270', 'Hail water transmission line', 'Hail water transmission', NCWS, 'Hail', 'Water and wastewater', 205, {
    clientType: 'government',
    captured: '2025-10-26T09:00', m1: '2025-10-28T15:00', dg1: pursue('2025-10-29T11:00'),
    packIssued: '2025-11-24T15:30', dg2: bid('2025-11-25T10:00'),
    dg3Issued: '2025-12-23T15:00', dg3: approved('2025-12-24T11:00'),
    submission: sub('2025-12-28T09:40', '2025-12-28T10:00'),
    result: { at: '2026-03-05T12:00', result: 'lost', rank: [2, 6], gapToWinnerPct: 6.8, lossReason: 'price', predictedWin: 40 },
    steps: { '5:cost-build-up': '2025-12-02T09:00', '6:sections-assigned': '2025-12-09T09:00', '7:matrix': '2025-12-17T09:00', '9:handover-or-debrief': '2026-03-08T09:00' },
    now: { stage: 9, step: 'handover-or-debrief' },
    events: [replan('2025-12-03T10:00', 4.5, 'Programme resequenced after the site visit'), m2('2025-12-01', '2025-12-01T15:00'), review('2025-12-14', '2025-12-14T10:00')],
    facts: { stage: 9, debriefAt: '2026-03-12T11:00', lessons: false },
  }),
  row('T-2025-255', 'Najran dam rehabilitation', 'Najran dam rehab', SCWS, 'Najran', 'Water and wastewater', 376, {
    clientType: 'government',
    captured: '2025-10-19T09:00', m1: '2025-10-20T14:00', dg1: pursue('2025-10-21T10:30'),
    packIssued: '2025-11-18T16:00', dg2: bid('2025-11-19T11:00'),
    dg3Issued: '2025-12-15T14:00', dg3: approved('2025-12-16T10:00'),
    submission: sub('2025-12-18T09:30', '2025-12-18T10:00'),
    result: { at: '2026-02-17T11:00', result: 'lost', rank: [4, 7], lossReason: 'technical', predictedWin: 36 },
    steps: { '5:cost-build-up': '2025-11-27T09:00', '6:sections-assigned': '2025-12-02T09:00', '7:matrix': '2025-12-10T09:00', '9:handover-or-debrief': '2026-02-23T10:00' },
    events: [m2('2025-11-26', '2025-11-26T12:00'), review('2025-12-08', '2025-12-09T10:00'), { kind: 'lessons', at: '2026-03-01T14:00' }],
    close: { at: '2026-03-01T14:00', as: 'lost', note: 'Lost on the technical score; lessons captured' },
  }),
  row('T-2026-106', 'Al-Kharj treated effluent line', 'Al-Kharj TSE line', CCWS, 'Al-Kharj', 'Utility networks', 230, {
    captured: '2026-02-08T09:30', m1: '2026-02-08T15:00', dg1: pursue('2026-02-09T10:15'),
    steps: { '2:rfqs-out': '2026-02-10T09:00', '2:quotes-in': '2026-02-19T10:00', '2:levelling': '2026-02-26T10:00' },
    close: { at: '2026-03-01T11:00', as: 'withdrawn', note: 'The JV partner withdrew; the bid cannot meet the PQ alone', stage: 2, step: 'levelling' },
  }),
  row('T-2026-099', 'Hafr Al-Batin water network', 'Hafr Al-Batin water network', NCWS, 'Hafr Al-Batin', 'Utility networks', 165, {
    captured: '2026-02-01T09:00', m1: '2026-02-02T13:00', dg1: pursue('2026-02-03T10:20'),
    packIssued: '2026-03-01T08:30',
    dg2: { at: '2026-03-01T15:30', decision: 'no-bid', byId: HOT, onTime: true, reasonCodes: ['capacity'], note: 'Capacity conflict: the Water team is fully committed until May' },
    steps: { '3:pack-in-preparation': '2026-02-23T09:00' },
    close: { at: '2026-03-01T15:30', as: 'no-bid', note: 'No-Bid at DG2: capacity conflict' },
  }),
  row('T-2026-107', 'Jazan sewer house connections', 'Jazan house connections', SCWS, 'Jazan', 'Utility networks', 70, {
    captured: '2026-02-22T08:10', m1: '2026-02-22T09:40',
    dg1: { at: '2026-02-23T12:40', decision: 'discard', byId: HOT, onTime: false, recommendation: 'discard', reasonCodes: ['insufficient-time'], note: 'Recorded late: decider on leave; no delegate set' },
    close: { at: '2026-02-23T12:40', as: 'discarded', note: 'Discarded at DG1: not enough time to prepare a compliant bid' },
  }),
  row('T-2026-115', 'Jeddah desalination intake, re-tender', 'Jeddah desal intake (re-tender)', 'Red Sea Coastal Water Company', 'Jeddah', 'Marine works', 310, {
    captured: '2026-03-01T10:30', m1: '2026-03-01T14:00',
    dg1: { at: '2026-03-02T11:10', decision: 'discard', byId: BID, onTime: true, recommendation: 'discard', reasonCodes: ['out-of-scope'] },
    close: { at: '2026-03-02T11:10', as: 'discarded', note: 'Discarded at DG1: marine works are out of scope' },
  }),
  story('T-2026-112', {
    m1: '2026-03-03T11:30', dg1: dg1Gate(dg1Record(NAJD, 'T-2026-112')),
    steps: intakeSteps('2026-03-03T11:18', '2026-03-03T11:20', '2026-03-03T11:30'),
    close: { at: '2026-03-03T15:40', as: 'discarded', note: 'Discarded at DG1: below the value band' },
  }),
  // A bid the Head of Tendering stopped at DG3 (§12.3: 1 rejected in 90 days).
  row('T-2025-297', 'Jeddah industrial area service roads', 'Jeddah industrial service roads', 'Western Region Municipal Projects Office', 'Jeddah', 'Roads', 240, {
    captured: '2025-11-02T09:30', m1: '2025-11-03T11:00', dg1: pursue('2025-11-04T09:40'),
    packIssued: '2025-11-23T08:30', dg2: bid('2025-11-23T15:00'),
    dg3Issued: '2025-12-15T12:00',
    dg3: { at: '2025-12-16T11:00', decision: 'rejected', byId: HOT, onTime: true, reasonCodes: ['margin-below-minimum'], note: 'The final price leaves a 6.1% margin against the DG2 minimum of 8%: do not submit' },
    events: [m2('2025-11-30', '2025-11-30T12:00'), review('2025-12-10', '2025-12-10T10:00')],
    close: { at: '2025-12-16T11:00', as: 'rejected', note: 'Rejected at DG3: margin below the DG2 minimum' },
  }),
];

// ---------------------------------------------------------------------------
// Completions of plan 004's records: pursued tenders the 90-day anchors leave
// no room for at DG2, and the two December bids their employers cancelled.

const withdrawn = (atIso: string, stage: StageN, step: string, note: string) => ({ close: { at: atIso, as: 'withdrawn' as const, note, stage, step } });

function fromDg1(id: string, issuer: string, city: string, sector: string, valueM: number, spec: Partial<ChainSpec> & { captured: string; m1: string }): Lifecycle {
  const r = dg1Record(NAJD, id);
  return row(id, r.title!, r.title!, issuer, city, sector, valueM, { origin: 'history', dg1: dg1Gate(r), ...spec });
}

const COMPLETIONS: Lifecycle[] = [
  fromDg1('T-2025-391', CCWS, 'Riyadh', 'Utility networks', 180, {
    captured: '2025-11-17T10:00', m1: '2025-11-19T14:00', packIssued: '2025-12-03T15:00',
    dg2: { at: '2025-12-04T11:00', decision: 'no-bid', byId: HOT, onTime: true, reasonCodes: ['capacity'], note: 'The networks team is committed to three December submissions' },
    close: { at: '2025-12-04T11:00', as: 'no-bid', note: 'No-Bid at DG2: capacity' },
  }),
  fromDg1('T-2025-447', CCWS, 'Al-Kharj', 'Water and wastewater', 60, {
    captured: '2025-12-18T09:00', m1: '2025-12-21T17:00', packIssued: '2026-01-18T15:00',
    dg2: { ...dg2Gate(dg2Record(NAJD, 'T-2025-447'), HOT), reasonCodes: ['below-value'], note: 'Scope below the value band once the reservoirs were re-measured' },
    close: { at: '2026-01-19T11:00', as: 'no-bid', note: 'No-Bid at DG2: below the value band' },
  }),
  fromDg1('T-2026-031', ECWS, 'Dammam', 'Utility networks', 95, {
    captured: '2026-01-18T09:00', m1: '2026-01-20T15:00', packIssued: '2026-02-04T16:00',
    dg2: { at: '2026-02-05T11:00', decision: 'no-bid', byId: HOT, onTime: true, reasonCodes: ['below-value'], note: 'Addendum 1 cut the scope further below the value band' },
    close: { at: '2026-02-05T11:00', as: 'no-bid', note: 'No-Bid at DG2: below the value band after Addendum 1' },
  }),
  fromDg1('T-2026-014', ECWS, 'Qatif', 'Water and wastewater', 210, {
    captured: '2026-01-05T09:00', m1: '2026-01-07T15:00',
    steps: { '2:quotes-in': '2026-01-18T10:00', '2:levelling': '2026-01-25T10:00' },
    ...withdrawn('2026-01-29T12:00', 2, 'levelling', 'The employer cancelled the tender to re-scope it'),
  }),
  fromDg1('T-2026-066', CCWS, 'Unaizah', 'Utility networks', 150, {
    captured: '2026-01-29T09:00', m1: '2026-02-01T08:00',
    steps: { '3:pack-in-preparation': '2026-02-19T09:00' },
    ...withdrawn('2026-02-24T14:00', 3, 'pack-in-preparation', 'The employer moved the budget to 2027 and cancelled the tender'),
  }),
  fromDg1('T-2026-046', 'Gulf Coast Industrial Utilities Company', 'Jubail', 'Water and wastewater', 120, {
    captured: '2026-01-29T10:00', m1: '2026-02-01T16:00',
    steps: { '2:quotes-in': '2026-02-11T10:00', '2:levelling': '2026-02-16T10:00' },
    ...withdrawn('2026-02-19T11:00', 2, 'levelling', 'Supplier quotes could not meet the local content minimum'),
  }),
  fromDg1('T-2026-058', ECWS, 'Hofuf', 'Water and wastewater', 110, {
    captured: '2026-02-01T09:00', m1: '2026-02-03T13:00',
    steps: { '3:pack-in-preparation': '2026-02-23T09:00' },
    ...withdrawn('2026-02-25T10:00', 3, 'pack-in-preparation', 'The client postponed the tender indefinitely'),
  }),
  story('T-2025-412', {
    m1: '2025-10-12T14:24', dg1: dg1Gate(dg1Record(NAJD, 'T-2025-412')),
    packIssued: '2025-11-09T08:30', dg2: dg2Gate(dg2Record(NAJD, 'T-2025-412'), HOT),
    dg3Issued: '2025-12-02T14:00', dg3: approved('2025-12-03T11:00'),
    submission: sub('2025-12-07T09:20', '2025-12-07T10:00'),
    result: { at: '2026-02-02T11:00', result: 'cancelled' },
    steps: { ...intakeSteps('2025-10-12T14:10', '2025-10-12T14:13', '2025-10-12T14:24'), '5:cost-build-up': '2025-11-15T09:00', '6:sections-assigned': '2025-11-19T09:00', '7:matrix': '2025-11-26T09:00' },
    events: [m2('2025-11-13', '2025-11-13T12:00'), review('2025-11-24', '2025-11-24T10:00')],
    close: { at: '2026-02-02T11:00', as: 'withdrawn', note: 'The employer cancelled the tender after opening, to re-tender it' },
  }),
  story('T-2025-438', {
    m1: '2025-10-21T15:57', dg1: dg1Gate(dg1Record(NAJD, 'T-2025-438')),
    packIssued: '2025-11-16T17:00', dg2: dg2Gate(dg2Record(NAJD, 'T-2025-438'), HOT),
    dg3Issued: '2025-12-03T15:00', dg3: approved('2025-12-04T12:00'),
    submission: sub('2025-12-08T09:40', '2025-12-08T10:00'),
    result: { at: '2026-02-12T10:00', result: 'cancelled' },
    steps: { ...intakeSteps('2025-10-21T15:45', '2025-10-21T15:48', '2025-10-21T15:57'), '5:cost-build-up': '2025-11-20T09:00', '6:sections-assigned': '2025-11-24T09:00', '7:matrix': '2025-11-30T09:00' },
    events: [m2('2025-11-19', '2025-11-19T12:00'), review('2025-11-27', '2025-11-27T10:00')],
    close: { at: '2026-02-12T10:00', as: 'withdrawn', note: 'The employer cancelled the tender when its budget was withdrawn' },
  }),
];

export const LIVE_NAJD: Lifecycle[] = [...STAGE1, ...STAGE2_3, ...STAGE4_8, ...STAGE9_AND_CLOSED, ...COMPLETIONS];

/** Plan 004 outcomes that a hand-authored lifecycle carries (none for Najd: its three were merged into the rows above). */
export const CLAIMED_NAJD: string[] = [];
