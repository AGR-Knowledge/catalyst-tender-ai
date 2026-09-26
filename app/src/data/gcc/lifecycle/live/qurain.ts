import { QURAIN } from '../../tenants/qurain';
import { HERO_ID } from '../../hero';
import type { Lifecycle } from '../types';
import { dg1Gate, dg1Record, facilityAfter, intakeSteps, liveKit, registerRow, s1, s1Derived } from './common';

/**
 * Qurain (tenant E, Kuwait: Fri–Sat weekend), hand-authored (plan 017 §2.2).
 * Plan 004's pursued DG1 records T-2025-405 (re-dated from 9 to 30 Dec) and
 * T-2025-406 become the Stage 4 and 5 rows; the Stage 9 row carries outcome
 * QU-O29. T-2026-049's DG2 pack went out at 08:30 today, and one position is
 * in. "Khairan residential water network" repeated QU-O29 and was renamed.
 */

const K = liveKit('qurain', QURAIN, 'CAPT e-tendering');
const SANITATION = 'Southern Governorates Sanitation Agency';
const GRID = 'National Water Grid Projects Office';
const HOUSING = 'Housing Cities Utilities Programme';

const t049 = registerRow(QURAIN, 'T-2026-049');

export const LIVE_QURAIN: Lifecycle[] = [
  K.story(HERO_ID, {
    m1: '2026-03-08T07:55', now: { stage: 1, step: 'awaiting-dg1' },
    steps: intakeSteps('2026-03-08T07:18', '2026-03-08T07:40', '2026-03-08T07:55'),
    // Eligibility from 007a (gcc-demo-data §4.7): every line passes through the KSA subsidiary.
    facts: s1Derived('EN', { dg1Due: '2026-03-09T07:55' }),
  }),
  K.story('T-2026-071', {
    now: { stage: 1, step: 'screened' },
    steps: { ...intakeSteps('2026-03-08T08:30', '2026-03-08T08:31', '2026-03-08T08:44'), '1:screened': '2026-03-08T08:55' },
    facts: s1(0, 0, 0, 'AR'),
  }),
  K.story('T-2026-072', {
    now: { stage: 1, step: 'validating' },
    steps: intakeSteps('2026-03-08T08:50', '2026-03-08T08:51', '2026-03-08T09:01'),
    facts: s1(0, 0, 0, 'EN'),
  }),
  K.story('T-2026-058', {
    m1: '2026-02-09T13:42', dg1: dg1Gate(dg1Record(QURAIN, 'T-2026-058')),
    steps: { ...intakeSteps('2026-02-09T13:30', '2026-02-09T13:32', '2026-02-09T13:42'), '2:rfqs-out': '2026-02-10T17:00', '2:quotes-in': '2026-03-03T10:00' },
    now: { stage: 2, step: 'quotes-in' },
    facts: {
      stage: 2, packages: { total: 12, covered: 5 }, rfqs: { sent: 36, total: 36, overdue: 2, escalated: 0, answeredOnTime: 20, dueSoFar: 24 },
      toLevel: 4, notCoveredPct: 2.2, repliesDue: '2026-03-10', clarifications: { open: 3, stale: 0 }, bestFitApproved: 0,
    },
  }),
  K.story('T-2026-062', {
    m1: '2026-02-15T11:51', dg1: dg1Gate(dg1Record(QURAIN, 'T-2026-062')),
    steps: { ...intakeSteps('2026-02-15T11:40', '2026-02-15T11:42', '2026-02-15T11:51'), '2:rfqs-out': '2026-02-16T16:30' },
    now: { stage: 2, step: 'rfqs-out' },
    facts: {
      stage: 2, packages: { total: 10, covered: 0 }, rfqs: { sent: 30, total: 30, overdue: 0, escalated: 0, answeredOnTime: 0, dueSoFar: 0 },
      toLevel: 0, notCoveredPct: 0, repliesDue: '2026-03-12', clarifications: { open: 1, stale: 0 }, bestFitApproved: 0,
    },
  }),
  K.story('T-2026-049', {
    m1: '2026-01-26T14:17', dg1: dg1Gate(dg1Record(QURAIN, 'T-2026-049')),
    packIssued: t049.packIssuedAt!,
    steps: {
      ...intakeSteps('2026-01-26T14:05', '2026-01-26T14:07', '2026-01-26T14:17'),
      '2:rfqs-out': '2026-01-28T11:00', '2:quotes-in': '2026-02-10T10:00', '2:levelling': '2026-02-18T10:00', '2:best-fit-approved': '2026-02-25T12:00',
      '3:pack-in-preparation': '2026-03-01T09:00', '3:inputs-complete': '2026-03-05T16:00', '3:positions-in': '2026-03-08T09:45',
    },
    now: { stage: 3, step: 'positions-in' },
    facts: {
      stage: 3, pack: 'issued', issuedAt: t049.packIssuedAt!,
      inputs: {
        requested: 2, outstanding: 0, late: 0, items: [
          { id: 'T-2026-049:commercial', what: 'Preliminary margin range', section: '9.7', ownerId: 'qurain.comm', requestedById: K.bidManager, requestedAt: '2026-03-02T10:00', due: '2026-03-05T17:00', submittedAt: '2026-03-05T11:00' },
          { id: 'T-2026-049:finance', what: 'Facility headroom and bond capacity', section: '9.5', ownerId: 'qurain.fin', requestedById: K.bidManager, requestedAt: '2026-03-02T10:00', due: '2026-03-05T17:00', submittedAt: '2026-03-05T16:00' },
        ],
      },
      positions: { recorded: 1, of: 5, bySeat: { technical: { stance: 'support', at: '2026-03-08T09:45' } } },
      win: { p: 52, band: 8 }, marginRange: [7, 10],
      facilityAfter: facilityAfter(QURAIN, t049.value.amount, 2),
      weightedValue: { amount: Math.round(t049.value.amount * 0.52), ccy: t049.value.ccy },
    },
  }),
  K.row('T-2025-405', dg1Record(QURAIN, 'T-2025-405').title!, 'Jahra sewer network ext.', 'Northern Governorates Public Works Office', 'Jahra', 'Water', 14, 'capt', {
    origin: 'history',
    captured: '2025-12-28T09:00', m1: '2025-12-29T13:00', dg1: dg1Gate(dg1Record(QURAIN, 'T-2025-405')),
    packIssued: '2026-02-22T14:00', dg2: K.bid('2026-02-23T10:00'),
    steps: { '4:resource-loading': '2026-03-04T10:00' },
    now: { stage: 4, step: 'resource-loading' }, submissionDeadline: { date: '2026-04-22', time: '13:00' },
    facts: { stage: 4, durationPlannedM: 20, durationRequiredM: 22, floatDays: 20, longLeadAtRisk: 1, peakManpower: 170, baselineDue: '2026-03-11', m2Due: '2026-03-16' },
  }),
  K.row('T-2025-406', dg1Record(QURAIN, 'T-2025-406').title!, 'Ahmadi water reservoirs', GRID, 'Ahmadi', 'Water', 9, 'capt', {
    origin: 'history',
    captured: '2025-12-11T09:00', m1: '2025-12-14T14:00', dg1: dg1Gate(dg1Record(QURAIN, 'T-2025-406')),
    packIssued: '2026-01-26T14:00', dg2: K.bid('2026-01-27T10:00'),
    steps: { '4:m2': '2026-02-10T09:00', '5:cost-build-up': '2026-02-16T09:00' },
    now: { stage: 5, step: 'cost-build-up' }, submissionDeadline: { date: '2026-04-05', time: '13:00' },
    events: [{ kind: 'm2', due: '2026-02-10', at: '2026-02-11T10:00' }],
    facts: { stage: 5, estPrice: K.money(9.3), baseMarginPct: 8.8, minMarginPct: 8, sourcedPct: 68, estimatedPct: 18, financeCheck: 'pending', priceDue: '2026-03-15', m2Due: '2026-02-10' },
  }),
  K.row('T-2026-033', 'Subiya water transmission line', 'Subiya water transmission', GRID, 'Subiya', 'Water', 22, 'capt', {
    captured: '2026-01-06T09:00', m1: '2026-01-06T14:00', dg1: K.pursue('2026-01-07T10:00'),
    packIssued: '2026-01-27T14:00', dg2: K.bid('2026-01-28T10:00'),
    steps: { '5:cost-build-up': '2026-02-09T09:00', '6:sections-assigned': '2026-02-23T09:00', '6:drafting': '2026-02-24T09:00', '6:review': '2026-03-05T09:00' },
    now: { stage: 6, step: 'review' }, submissionDeadline: { date: '2026-03-25', time: '13:00' },
    events: [{ kind: 'm2', due: '2026-02-05', at: '2026-02-05T12:00' }, { kind: 'reprice', at: '2026-02-26T10:00', turnaroundH: 3.5, trigger: 'Pipe supplier re-quote' }, { kind: 'review', due: '2026-03-10' }],
    facts: { stage: 6, sections: { locked: 10, total: 12, late: 0 }, simScore: 73, passMark: 70, smeOverdue: 0, redTeamAt: '2026-03-10T11:00', reusePct: 51 },
  }),
  K.row('T-2025-428', 'Wafra oil-field water injection pipeline', 'Wafra water injection line', 'Upstream Facilities Engineering Company', 'Wafra', 'Oil and gas facilities', 11, 'og-portal', {
    captured: '2025-12-24T09:00', m1: '2025-12-24T14:00', dg1: K.pursue('2025-12-25T10:00'),
    packIssued: '2026-01-19T14:00', dg2: K.bid('2026-01-20T10:00'),
    dg3Issued: '2026-03-07T17:00',
    steps: { '5:cost-build-up': '2026-02-01T09:00', '6:sections-assigned': '2026-02-10T09:00', '7:matrix': '2026-02-23T09:00' },
    now: { stage: 7, step: 'dg3-issued' }, submissionDeadline: { date: '2026-03-12', time: '13:00' },
    events: [{ kind: 'm2', due: '2026-01-28', at: '2026-01-28T12:00' }, { kind: 'review', due: '2026-02-18', at: '2026-02-18T10:00' }],
    facts: { stage: 7, requirements: { evidenced: 72, total: 72 }, mandatoryGaps: 0, redlinesOpen: 0, risksWithoutOwner: 0, dg3IssuedAt: '2026-03-07T17:00' },
  }),
  K.row('T-2025-418', 'Mutlaa stormwater network', 'Mutlaa stormwater network', HOUSING, 'Mutlaa', 'Infrastructure', 16, 'capt', {
    captured: '2025-12-15T09:00', m1: '2025-12-16T14:00', dg1: K.pursue('2025-12-17T10:00'),
    packIssued: '2026-01-11T14:00', dg2: K.bid('2026-01-12T10:00'),
    dg3Issued: '2026-02-15T14:00', dg3: K.approved('2026-02-16T10:00'),
    submission: K.sub('2026-02-18T12:00', '2026-02-18T13:00'),
    steps: { '5:cost-build-up': '2026-01-20T09:00', '6:sections-assigned': '2026-01-27T09:00', '7:matrix': '2026-02-09T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-01-19', at: '2026-01-19T12:00' }, { kind: 'review', due: '2026-02-04', at: '2026-02-04T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-18', expectedAwardBy: '2026-04-15' }, 0.32, '2026-05-19', '2026-05-19'),
  }),
  K.row('T-2025-431', 'Kabd sewage treatment rehabilitation', 'Kabd STP rehabilitation', SANITATION, 'Kabd', 'Water', 12, 'capt', {
    captured: '2025-12-28T09:00', m1: '2025-12-28T14:00', dg1: K.pursue('2025-12-29T10:00'),
    packIssued: '2026-01-21T14:00', dg2: K.bid('2026-01-22T10:00'),
    dg3Issued: '2026-02-24T14:00', dg3: K.approved('2026-02-25T10:00'),
    submission: K.sub('2026-03-01T12:00', '2026-03-01T13:00'),
    steps: { '5:cost-build-up': '2026-02-01T09:00', '6:sections-assigned': '2026-02-08T09:00', '7:matrix': '2026-02-16T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-01-29', at: '2026-01-29T12:00' }, { kind: 'review', due: '2026-02-12', at: '2026-02-12T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-03-01', expectedAwardBy: '2026-04-26' }, 0.24, '2026-05-30', '2026-05-30'),
  }),
  K.row('T-2026-036', 'Abdullah Al-Mubarak residential water network', 'Abdullah Al-Mubarak water network', HOUSING, 'Abdullah Al-Mubarak', 'Water', 18, 'capt', {
    captured: '2026-01-07T09:00', m1: '2026-01-07T14:00', dg1: K.pursue('2026-01-08T10:00'),
    packIssued: '2026-02-01T08:30', dg2: K.bid('2026-02-01T14:00'),
    dg3Issued: '2026-03-04T14:00', dg3: K.approved('2026-03-05T10:00'),
    steps: { '5:cost-build-up': '2026-02-11T09:00', '6:sections-assigned': '2026-02-17T09:00', '7:matrix': '2026-03-01T09:00' },
    now: { stage: 8, step: 'assembling' }, submissionDeadline: { date: '2026-03-17', time: '13:00' },
    events: [{ kind: 'm2', due: '2026-02-10', at: '2026-02-10T12:00' }, { kind: 'review', due: '2026-02-26', at: '2026-02-26T10:00' }],
    // The bid bond is requested from the bank but not yet issued; the deadline is 7 working days away.
    facts: K.s8({ packageReadyPct: 64, signaturesPending: 3, openingDate: '2026-03-17' }, 0.36, '2026-06-15', '2026-06-15', false),
  }),
  K.fromOutcome('QU-O29', 'T-2025-352', HOUSING, 'Khiran', 'capt', {
    captured: '2025-10-02T09:00', m1: '2025-10-05T14:00', dg1: K.pursue('2025-10-06T10:00'),
    packIssued: '2025-10-21T14:00', dg2: K.bid('2025-10-22T10:00'),
    dg3Issued: '2025-11-16T14:00', dg3: K.approved('2025-11-17T10:00'),
    events: [{ kind: 'm2', due: '2025-10-29', at: '2025-10-29T12:00' }, { kind: 'review', due: '2025-11-11', at: '2025-11-11T10:00' }, { kind: 'handover', at: '2026-03-02T10:00' }],
    now: { stage: 9, step: 'handover-or-debrief' },
    facts: { stage: 9, handoverAt: '2026-03-02T10:00', lessons: false },
  }),
];

export const CLAIMED_QURAIN = ['QU-O29'];
