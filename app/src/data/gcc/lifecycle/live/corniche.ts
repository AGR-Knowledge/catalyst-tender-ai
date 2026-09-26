import { CORNICHE } from '../../tenants/corniche';
import { HERO_ID } from '../../hero';
import type { Lifecycle } from '../types';
import { dg1Gate, dg1Record, dg2Gate, dg2Record, facilityAfter, intakeSteps, liveKit, registerRow, s1, s1Derived } from './common';

/**
 * Corniche (tenant B, UAE: Sat–Sun weekend), hand-authored (plan 017 §2.2):
 * plan 004's register, the Stage 4–9 rows of dashboards.md §12.5 and the two
 * submitted bids that hold bid bonds on the facility (T-2025-402 and 406,
 * plan 004's DG1 records). The S9 row carries outcome CO-O22 and DG2
 * T-2025-120. Plan 017's suggested rows were renamed where they repeated a
 * past bid ("Abu Dhabi school cluster MEP" is outcome CO-O01).
 */

const K = liveKit('corniche', CORNICHE, 'Dubai government e-procurement portal');
const HOSPITAL = 'Crescent Bay Health Holding';

export const LIVE_CORNICHE: Lifecycle[] = [
  K.story(HERO_ID, {
    now: { stage: 1, step: 'validating' },
    steps: intakeSteps('2026-03-08T08:17', '2026-03-08T08:52', '2026-03-08T09:04'),
    // Eligibility from 007a (gcc-demo-data §4.7): no Saudi registrations, classification, STP or O&M record.
    facts: s1Derived('EN', { dg1Due: '2026-03-09T09:04' }),
  }),
  K.story('T-2026-061', {
    m1: '2026-03-08T07:52', now: { stage: 1, step: 'awaiting-dg1' },
    steps: intakeSteps('2026-03-08T07:40', '2026-03-08T07:42', '2026-03-08T07:52'),
    facts: s1(6, 0, 0, 'EN', { dg1Due: '2026-03-09T07:52' }),
  }),
  K.story('T-2026-063', {
    now: { stage: 1, step: 'screened' },
    steps: { ...intakeSteps('2026-03-08T09:10', '2026-03-08T09:11', '2026-03-08T09:18'), '1:screened': '2026-03-08T09:28' },
    facts: s1(3, 0, 0, 'EN'),
  }),
  K.story('T-2026-044', {
    m1: '2026-02-16T12:16', dg1: dg1Gate(dg1Record(CORNICHE, 'T-2026-044')),
    steps: { ...intakeSteps('2026-02-16T12:05', '2026-02-16T12:07', '2026-02-16T12:16'), '2:shortlisting': '2026-02-17T13:00', '2:rfqs-out': '2026-02-17T17:30' },
    now: { stage: 2, step: 'rfqs-out' },
    facts: {
      stage: 2, packages: { total: 8, covered: 0 }, rfqs: { sent: 24, total: 24, overdue: 0, escalated: 0, answeredOnTime: 0, dueSoFar: 0 },
      toLevel: 0, notCoveredPct: 0, repliesDue: '2026-03-12', clarifications: { open: 1, stale: 0 }, bestFitApproved: 0,
    },
  }),
  K.story('T-2026-029', {
    m1: '2026-01-27T13:22', dg1: dg1Gate(dg1Record(CORNICHE, 'T-2026-029')),
    steps: {
      ...intakeSteps('2026-01-27T13:10', '2026-01-27T13:12', '2026-01-27T13:22'),
      '2:rfqs-out': '2026-01-28T16:00', '2:quotes-in': '2026-02-09T10:00', '2:levelling': '2026-02-18T10:00', '2:best-fit-approved': '2026-02-26T12:00',
      '3:pack-in-preparation': '2026-03-02T09:00',
    },
    now: { stage: 3, step: 'pack-in-preparation' },
    facts: {
      stage: 3, pack: 'preparation',
      inputs: {
        requested: 3, outstanding: 1, late: 0, items: [
          { id: 'T-2026-029:commercial', what: 'Preliminary margin range', section: '9.7', ownerId: 'corniche.comm', requestedById: K.bidManager, requestedAt: '2026-03-03T10:00', due: '2026-03-06T17:00', submittedAt: '2026-03-06T12:00' },
          { id: 'T-2026-029:planning', what: 'Preliminary programme and delivery impact', section: '9.4', ownerId: 'corniche.plan', requestedById: K.bidManager, requestedAt: '2026-03-03T10:00', due: '2026-03-06T17:00', submittedAt: '2026-03-05T15:00' },
          { id: 'T-2026-029:finance', what: 'Facility headroom and bond capacity', section: '9.5', ownerId: 'corniche.fin', requestedById: K.bidManager, requestedAt: '2026-03-03T10:00', due: '2026-03-09T17:00' },
        ],
      },
      positions: { recorded: 0, of: 5, bySeat: {} },
      win: { p: 44, band: 8 }, marginRange: [7.5, 10], facilityAfter: facilityAfter(CORNICHE, registerRow(CORNICHE, 'T-2026-029').value.amount, 2),
    },
  }),
  K.row('T-2026-041', 'Al Reem mixed-use tower MEP', 'Al Reem tower MEP', 'Harbour Gate Real Estate', 'Al Reem Island', 'Buildings MEP', 145, 'abudhabi-portal', {
    captured: '2026-02-02T09:10', m1: '2026-02-02T15:00', dg1: K.pursue('2026-02-03T10:40'),
    packIssued: '2026-02-18T14:00', dg2: K.bid('2026-02-19T11:00'),
    steps: { '4:resource-loading': '2026-03-03T10:00' },
    now: { stage: 4, step: 'resource-loading' }, submissionDeadline: { date: '2026-04-15', time: '14:00' },
    facts: { stage: 4, durationPlannedM: 26, durationRequiredM: 28, floatDays: 18, longLeadAtRisk: 1, peakManpower: 380, baselineDue: '2026-03-10', m2Due: '2026-03-17' },
  }),
  K.row('T-2026-026', 'Jebel Ali logistics district cooling plant', 'Jebel Ali logistics cooling plant', 'Emirates Cooling Utilities Company', 'Jebel Ali', 'District cooling', 210, 'dubai-portal', {
    captured: '2026-01-26T09:00', m1: '2026-01-26T14:00', dg1: K.pursue('2026-01-27T10:00'),
    packIssued: '2026-02-11T14:00', dg2: K.bid('2026-02-12T10:30'),
    steps: { '4:m2': '2026-02-26T09:00', '5:cost-build-up': '2026-03-02T09:00' },
    now: { stage: 5, step: 'cost-build-up' }, submissionDeadline: { date: '2026-04-02', time: '14:00' },
    events: [{ kind: 'm2', due: '2026-02-26', at: '2026-02-26T12:00' }],
    facts: { stage: 5, estPrice: K.money(204.8), baseMarginPct: 9.4, minMarginPct: 8, sourcedPct: 72, estimatedPct: 14, financeCheck: 'pending', priceDue: '2026-03-16', m2Due: '2026-02-26' },
  }),
  K.row('T-2026-018', 'Sharjah hospital MEP package', 'Sharjah hospital MEP', HOSPITAL, 'Sharjah', 'Buildings MEP', 118, 'mail', {
    captured: '2026-01-14T09:30', m1: '2026-01-14T15:00', dg1: K.pursue('2026-01-15T10:00'),
    packIssued: '2026-01-28T14:00', dg2: K.bid('2026-01-29T10:00'),
    steps: { '5:cost-build-up': '2026-02-09T09:00', '6:sections-assigned': '2026-02-23T09:00', '6:drafting': '2026-02-24T09:00' },
    now: { stage: 6, step: 'drafting' }, submissionDeadline: { date: '2026-03-26', time: '14:00' },
    events: [{ kind: 'm2', due: '2026-02-05', at: '2026-02-05T12:00' }, { kind: 'reprice', at: '2026-02-17T10:00', turnaroundH: 3, trigger: 'Chiller quotes revised' }, { kind: 'review', due: '2026-03-16' }],
    facts: { stage: 6, sections: { locked: 7, total: 14, late: 0 }, simScore: 74, passMark: 70, smeOverdue: 1, redTeamAt: '2026-03-16T10:00', reusePct: 48 },
  }),
  K.row('T-2026-004', 'Khalifa City school cluster MEP', 'Khalifa City schools MEP', 'Capital Schools Development Office', 'Khalifa City', 'Buildings MEP', 64, 'abudhabi-portal', {
    captured: '2026-01-05T09:00', m1: '2026-01-05T14:00', dg1: K.pursue('2026-01-06T10:00'),
    packIssued: '2026-01-20T14:00', dg2: K.bid('2026-01-21T10:00'),
    dg3Issued: '2026-03-07T12:00',
    steps: { '5:cost-build-up': '2026-02-02T09:00', '6:sections-assigned': '2026-02-09T09:00', '7:matrix': '2026-02-23T09:00', '7:gaps-closing': '2026-02-26T09:00', '7:redlines': '2026-03-04T09:00' },
    now: { stage: 7, step: 'dg3-issued' }, submissionDeadline: { date: '2026-03-12', time: '14:00' },
    events: [{ kind: 'm2', due: '2026-01-29', at: '2026-01-29T12:00' }, { kind: 'review', due: '2026-02-19', at: '2026-02-19T10:00' }],
    facts: { stage: 7, requirements: { evidenced: 88, total: 88 }, mandatoryGaps: 0, redlinesOpen: 0, risksWithoutOwner: 0, dg3IssuedAt: '2026-03-07T12:00' },
  }),
  K.row('T-2025-402', dg1Record(CORNICHE, 'T-2025-402').title!, 'Abu Dhabi clinic MEP', HOSPITAL, 'Abu Dhabi', 'Buildings MEP', 240, 'abudhabi-portal', {
    origin: 'history',
    captured: '2025-12-05T10:00', m1: '2025-12-08T14:00', dg1: dg1Gate(dg1Record(CORNICHE, 'T-2025-402')),
    packIssued: '2025-12-22T14:00', dg2: K.bid('2025-12-23T10:00'),
    dg3Issued: '2026-02-03T14:00', dg3: K.approved('2026-02-04T10:00'),
    submission: K.sub('2026-02-09T11:30', '2026-02-09T12:00'),
    steps: { '5:cost-build-up': '2026-01-05T09:00', '6:sections-assigned': '2026-01-12T09:00', '7:matrix': '2026-01-26T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2025-12-31', at: '2025-12-31T12:00' }, { kind: 'review', due: '2026-01-22', at: '2026-01-22T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-09', expectedAwardBy: '2026-04-10' }, 12, '2026-06-09', '2026-06-09'),
  }),
  K.row('T-2025-406', dg1Record(CORNICHE, 'T-2025-406').title!, 'Dubai hotel tower MEP', 'Gulfshore Hospitality Developments', 'Dubai', 'Buildings MEP', 248, 'dubai-portal', {
    origin: 'history',
    captured: '2025-12-15T09:00', m1: '2025-12-16T15:00', dg1: dg1Gate(dg1Record(CORNICHE, 'T-2025-406')),
    packIssued: '2026-01-07T14:00', dg2: K.bid('2026-01-08T10:00'),
    dg3Issued: '2026-02-17T14:00', dg3: K.approved('2026-02-18T10:00'),
    submission: K.sub('2026-02-23T11:00', '2026-02-23T12:00'),
    steps: { '5:cost-build-up': '2026-01-20T09:00', '6:sections-assigned': '2026-01-27T09:00', '7:matrix': '2026-02-09T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-01-15', at: '2026-01-15T12:00' }, { kind: 'review', due: '2026-02-04', at: '2026-02-04T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-23', expectedAwardBy: '2026-04-20' }, 12.4, '2026-06-23', '2026-06-23'),
  }),
  K.fromOutcome('CO-O22', 'T-2025-120', 'Emirates Cooling Utilities Company', 'Dubai Marina', 'dubai-portal', {
    captured: '2025-11-14T09:00', m1: '2025-11-17T14:00', dg1: K.pursue('2025-11-18T10:00'),
    packIssued: '2025-12-08T15:00', dg2: dg2Gate(dg2Record(CORNICHE, 'T-2025-120'), K.hot),
    dg3Issued: '2025-12-18T14:00', dg3: K.approved('2025-12-19T10:00'),
    steps: { '9:handover-or-debrief': '2026-03-05T09:00' },
    now: { stage: 9, step: 'handover-or-debrief' },
    facts: { stage: 9, debriefAt: '2026-03-11T10:00', lessons: false },
  }),
];

/** Plan 004 outcomes carried by the rows above; the fold skips them. */
export const CLAIMED_CORNICHE = ['CO-O22'];
