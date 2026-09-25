import { BATINAH } from '../../tenants/batinah';
import { HERO_ID } from '../../hero';
import type { Lifecycle } from '../types';
import { dg1Gate, dg1Record, dg2Gate, dg2Record, intakeSteps, liveKit, s1 } from './common';

/**
 * Batinah (tenant D, Oman: Fri–Sat weekend), hand-authored (plan 017 §2.2).
 * Plan 004's pursued DG1 records become the Stage 5, 6 and 8 rows
 * (T-2025-405, 404, 407 and 415); the Stage 9 row carries outcome BA-O25 and
 * DG2 T-2025-120. dashboards.md §12.5 counts 4 in Stage 1: the fourth is the
 * scanned Arabic roads tender that plan 012 adds. Suggested titles that
 * repeated a past bid were renamed.
 */

const K = liveKit('batinah', BATINAH, 'Tender Board portal');
const COAST = 'Batinah Coastal Roads Office';
const PORTS = 'Port Cities Access Roads Office';

export const LIVE_BATINAH: Lifecycle[] = [
  K.story(HERO_ID, {
    now: { stage: 1, step: 'screened' },
    steps: { ...intakeSteps('2026-03-08T09:05', '2026-03-08T09:06', '2026-03-08T09:19'), '1:screened': '2026-03-08T09:30' },
    // gcc-demo-data §4.7: KSA registrations, certificates, classification, STP, O&M and turnover fail; PQ-12 to 15 not applicable.
    facts: s1(5, 0, 11, 'EN'),
  }),
  K.story('T-2026-041', {
    now: { stage: 1, step: 'validating' },
    steps: intakeSteps('2026-03-08T08:40', '2026-03-08T08:41', '2026-03-08T08:52'),
    facts: s1(0, 0, 0, 'EN'),
  }),
  K.story('T-2026-042', {
    m1: '2026-03-08T07:41', now: { stage: 1, step: 'awaiting-dg1' },
    steps: intakeSteps('2026-03-08T07:30', '2026-03-08T07:31', '2026-03-08T07:41'),
    facts: s1(6, 0, 0, 'EN', { dg1Due: '2026-03-09T07:41' }),
  }),
  K.story('T-2026-027', {
    m1: '2026-02-11T11:32', dg1: dg1Gate(dg1Record(BATINAH, 'T-2026-027')),
    steps: { ...intakeSteps('2026-02-11T11:20', '2026-02-11T11:22', '2026-02-11T11:32'), '2:shortlisting': '2026-02-12T12:30', '2:rfqs-out': '2026-02-12T16:00' },
    now: { stage: 2, step: 'rfqs-out' },
    facts: {
      stage: 2, packages: { total: 7, covered: 3 }, rfqs: { sent: 21, total: 21, overdue: 1, escalated: 0, answeredOnTime: 9, dueSoFar: 12 },
      toLevel: 2, notCoveredPct: 4.5, repliesDue: '2026-03-05', clarifications: { open: 2, stale: 0 }, bestFitApproved: 0,
    },
  }),
  K.row('T-2026-048', 'Sur–Ras Al Hadd road widening', 'Sur–Ras Al Hadd widening', PORTS, 'Sur', 'Roads', 18, 'tender-board', {
    captured: '2026-01-29T09:00', m1: '2026-02-01T08:30', dg1: K.pursue('2026-02-01T12:00'),
    packIssued: '2026-02-24T14:00', dg2: K.bid('2026-02-25T10:00'),
    now: { stage: 4, step: 'baseline-drafting' }, submissionDeadline: { date: '2026-04-12', time: '12:00' },
    facts: { stage: 4, durationPlannedM: 18, durationRequiredM: 18, floatDays: 8, longLeadAtRisk: 0, peakManpower: 190, baselineDue: '2026-03-11', m2Due: '2026-03-18' },
  }),
  K.row('T-2025-405', dg1Record(BATINAH, 'T-2025-405').title!, 'Barka wadi bridges', COAST, 'Barka', 'Bridges', 12, 'tender-board', {
    origin: 'history',
    captured: '2025-12-11T09:00', m1: '2025-12-14T14:00', dg1: dg1Gate(dg1Record(BATINAH, 'T-2025-405')),
    packIssued: '2026-01-26T14:00', dg2: K.bid('2026-01-27T10:00'),
    steps: { '4:m2': '2026-02-12T09:00', '5:cost-build-up': '2026-02-16T09:00', '5:scenarios': '2026-03-03T10:00' },
    now: { stage: 5, step: 'scenarios' }, submissionDeadline: { date: '2026-03-29', time: '12:00' },
    events: [{ kind: 'm2', due: '2026-02-12', at: '2026-02-12T12:00' }, { kind: 'reprice', at: '2026-03-02T11:00', turnaroundH: 2, trigger: 'Steel price update' }],
    facts: { stage: 5, estPrice: K.money(12), baseMarginPct: 9.8, minMarginPct: 8.5, sourcedPct: 84, estimatedPct: 9, financeCheck: 'pending', priceDue: '2026-03-12', m2Due: '2026-02-12' },
  }),
  K.row('T-2025-404', dg1Record(BATINAH, 'T-2025-404').title!, 'Sohar ring road, s. 2', COAST, 'Sohar', 'Roads', 9, 'tender-board', {
    origin: 'history',
    captured: '2025-12-07T09:00', m1: '2025-12-08T13:00', dg1: dg1Gate(dg1Record(BATINAH, 'T-2025-404')),
    packIssued: '2026-01-12T14:00', dg2: K.bid('2026-01-13T10:00'),
    steps: { '5:cost-build-up': '2026-02-02T09:00', '6:sections-assigned': '2026-02-17T09:00', '6:drafting': '2026-02-18T09:00' },
    now: { stage: 6, step: 'drafting' }, submissionDeadline: { date: '2026-03-18', time: '12:00' },
    events: [{ kind: 'm2', due: '2026-01-26', at: '2026-01-27T11:00' }, { kind: 'replan', at: '2026-01-21T10:00', turnaroundH: 5, trigger: 'Utility diversion found at the interchange' }, { kind: 'review', due: '2026-03-12' }],
    facts: { stage: 6, sections: { locked: 5, total: 11, late: 1 }, simScore: 71, passMark: 70, smeOverdue: 1, reusePct: 40 },
  }),
  K.row('T-2026-020', 'Duqm port access road, section 3', 'Duqm port access road, s. 3', PORTS, 'Duqm', 'Roads', 22, 'tender-board', {
    captured: '2026-01-05T09:00', m1: '2026-01-05T14:00', dg1: K.pursue('2026-01-06T10:00'),
    packIssued: '2026-01-26T14:00', dg2: K.bid('2026-01-27T10:00'),
    dg3Issued: '2026-03-08T08:30',
    steps: { '5:cost-build-up': '2026-02-08T09:00', '6:sections-assigned': '2026-02-17T09:00', '7:matrix': '2026-03-03T09:00' },
    now: { stage: 7, step: 'dg3-issued' }, submissionDeadline: { date: '2026-03-12', time: '12:00' },
    events: [{ kind: 'm2', due: '2026-02-05', at: '2026-02-05T12:00' }, { kind: 'review', due: '2026-02-26', at: '2026-02-26T10:00' }],
    facts: { stage: 7, requirements: { evidenced: 64, total: 64 }, mandatoryGaps: 0, redlinesOpen: 0, risksWithoutOwner: 0, dg3IssuedAt: '2026-03-08T08:30' },
  }),
  K.row('T-2025-407', dg1Record(BATINAH, 'T-2025-407').title!, 'Nizwa bypass link', 'Interior Links Roads Authority', 'Nizwa', 'Roads', 32.5, 'tender-board', {
    origin: 'history',
    captured: '2025-12-17T09:00', m1: '2025-12-21T08:30', dg1: dg1Gate(dg1Record(BATINAH, 'T-2025-407')),
    packIssued: '2026-01-11T08:30', dg2: K.bid('2026-01-11T14:00'),
    dg3Issued: '2026-02-09T14:00', dg3: K.approved('2026-02-10T10:00'),
    submission: K.sub('2026-02-15T11:00', '2026-02-15T12:00'),
    steps: { '5:cost-build-up': '2026-01-20T09:00', '6:sections-assigned': '2026-01-27T09:00', '7:matrix': '2026-02-02T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-01-19', at: '2026-01-19T12:00' }, { kind: 'review', due: '2026-01-29', at: '2026-01-29T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-15', expectedAwardBy: '2026-04-12' }, 0.65, '2026-05-16', '2026-05-16'),
  }),
  K.row('T-2025-415', dg1Record(BATINAH, 'T-2025-415').title!, 'Saham coastal road', COAST, 'Saham', 'Roads', 27.5, 'tender-board', {
    origin: 'history',
    captured: '2025-12-24T09:00', m1: '2025-12-28T08:30', dg1: dg1Gate(dg1Record(BATINAH, 'T-2025-415')),
    packIssued: '2026-01-19T14:00', dg2: K.bid('2026-01-20T10:00'),
    dg3Issued: '2026-02-22T14:00', dg3: K.approved('2026-02-23T10:00'),
    submission: K.sub('2026-02-25T11:00', '2026-02-25T12:00'),
    steps: { '5:cost-build-up': '2026-01-28T09:00', '6:sections-assigned': '2026-02-03T09:00', '7:matrix': '2026-02-16T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-01-27', at: '2026-01-27T12:00' }, { kind: 'review', due: '2026-02-11', at: '2026-02-11T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-25', expectedAwardBy: '2026-04-22' }, 0.55, '2026-05-26', '2026-05-26'),
  }),
  K.fromOutcome('BA-O25', 'T-2025-120', 'Capital Area Roads Directorate', 'Muscat', 'tender-board', {
    captured: '2025-11-13T09:00', m1: '2025-11-16T14:00', dg1: K.pursue('2025-11-17T10:00'),
    packIssued: '2025-12-08T15:00', dg2: dg2Gate(dg2Record(BATINAH, 'T-2025-120'), K.hot),
    dg3Issued: '2025-12-21T09:00', dg3: K.approved('2025-12-21T14:00'),
    steps: { '9:handover-or-debrief': '2026-03-05T09:00' },
    now: { stage: 9, step: 'handover-or-debrief' },
    facts: { stage: 9, handoverAt: '2026-03-12T09:00', lessons: false },
  }),
];

export const CLAIMED_BATINAH = ['BA-O25'];
