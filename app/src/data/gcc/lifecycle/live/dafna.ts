import { DAFNA } from '../../tenants/dafna';
import { HERO_ID } from '../../hero';
import type { Lifecycle } from '../types';
import { dg1Gate, dg1Record, intakeSteps, liveKit, s1 } from './common';

/**
 * Dafna (tenant C, Qatar: Fri–Sat weekend), hand-authored (plan 017 §2.2):
 * plan 004's register (its two submitted bids are the Stage 8 rows), the
 * Stage 4–7 rows of dashboards.md §12.5 and a Stage 9 row that carries
 * outcome DA-O17. T-2025-422 (plan 004's DG1 record, re-dated from 9 to
 * 29 Dec) is the Stage 4 row. Suggested titles that repeated a register row
 * were renamed ("Umm Salal pump station upgrade" → Al Sailiya).
 */

const K = liveKit('dafna', DAFNA, 'Monaqasat');

export const LIVE_DAFNA: Lifecycle[] = [
  K.story(HERO_ID, {
    now: { stage: 1, step: 'validating' },
    steps: intakeSteps('2026-03-08T07:20', '2026-03-08T08:10', '2026-03-08T08:26'),
    // gcc-demo-data §4.7, alone: classification, STP, O&M and turnover fail; the JV with Tihama closes them.
    facts: s1(12, 0, 4, 'EN', { dg1Due: '2026-03-09T08:26' }),
  }),
  K.story('T-2026-033', {
    m1: '2026-03-08T07:14', now: { stage: 1, step: 'awaiting-dg1' },
    steps: intakeSteps('2026-03-08T07:05', '2026-03-08T07:06', '2026-03-08T07:14'),
    facts: s1(5, 0, 0, 'EN', { dg1Due: '2026-03-09T07:14' }),
  }),
  K.story('T-2026-034', {
    m1: '2026-03-08T09:10', now: { stage: 1, step: 'awaiting-dg1' },
    steps: intakeSteps('2026-03-08T09:02', '2026-03-08T09:03', '2026-03-08T09:10'),
    facts: s1(4, 0, 0, 'EN', { dg1Due: '2026-03-09T09:10' }),
  }),
  K.story('T-2026-019', {
    m1: '2026-02-18T10:41', dg1: dg1Gate(dg1Record(DAFNA, 'T-2026-019')),
    steps: { ...intakeSteps('2026-02-18T10:30', '2026-02-18T10:32', '2026-02-18T10:41'), '2:shortlisting': '2026-02-19T12:00', '2:rfqs-out': '2026-02-19T15:00' },
    now: { stage: 2, step: 'rfqs-out' },
    facts: {
      stage: 2, packages: { total: 10, covered: 0 }, rfqs: { sent: 30, total: 30, overdue: 2, escalated: 0, answeredOnTime: 14, dueSoFar: 18 },
      toLevel: 0, notCoveredPct: 0, repliesDue: '2026-03-10', clarifications: { open: 3, stale: 1 }, bestFitApproved: 0,
    },
  }),
  K.row('T-2025-422', dg1Record(DAFNA, 'T-2025-422').title!, 'Al Rayyan utility corridor', 'Central Doha Utilities Programme', 'Al Rayyan', 'Utility networks', 180, 'monaqasat', {
    origin: 'history',
    captured: '2025-12-25T09:00', m1: '2025-12-28T14:00', dg1: dg1Gate(dg1Record(DAFNA, 'T-2025-422')),
    packIssued: '2026-02-18T14:00', dg2: K.bid('2026-02-19T10:00'),
    now: { stage: 4, step: 'baseline-drafting' }, submissionDeadline: { date: '2026-04-29', time: '12:00' },
    facts: { stage: 4, durationPlannedM: 30, durationRequiredM: 30, floatDays: 5, longLeadAtRisk: 2, peakManpower: 260, baselineDue: '2026-03-12', m2Due: '2026-03-26' },
  }),
  K.row('T-2026-064', 'Al Sailiya pump station upgrade', 'Al Sailiya pump station', 'Doha Drainage Works Authority', 'Al Sailiya', 'Pump stations', 75, 'monaqasat', {
    captured: '2026-01-19T09:00', m1: '2026-01-19T14:00', dg1: K.pursue('2026-01-20T10:00'),
    packIssued: '2026-02-10T14:00', dg2: K.bid('2026-02-11T10:00'),
    steps: { '4:m2': '2026-02-24T09:00', '5:cost-build-up': '2026-03-01T09:00', '5:scenarios': '2026-03-03T09:00', '5:finance-check': '2026-03-05T14:00' },
    now: { stage: 5, step: 'finance-check' }, submissionDeadline: { date: '2026-03-17', time: '12:00' },
    events: [{ kind: 'm2', due: '2026-02-24', at: '2026-02-24T12:00' }, { kind: 'reprice', at: '2026-03-03T10:00', turnaroundH: 1, trigger: 'Pump supplier price change' }],
    facts: { stage: 5, estPrice: K.money(75), baseMarginPct: 11, minMarginPct: 9, sourcedPct: 88, estimatedPct: 6, financeCheck: 'pending', priceDue: '2026-03-11', m2Due: '2026-02-24' },
  }),
  K.row('T-2026-008', 'Mesaieed stormwater outfall', 'Mesaieed stormwater outfall', 'Southern Municipalities Drainage Office', 'Mesaieed', 'Civil works', 220, 'monaqasat', {
    captured: '2026-01-04T09:00', m1: '2026-01-04T14:00', dg1: K.pursue('2026-01-05T10:00'),
    packIssued: '2026-01-25T14:00', dg2: K.bid('2026-01-26T10:00'),
    steps: { '5:cost-build-up': '2026-02-03T09:00', '6:sections-assigned': '2026-02-16T09:00', '6:drafting': '2026-02-17T09:00', '6:review': '2026-03-04T09:00' },
    now: { stage: 6, step: 'review' }, submissionDeadline: { date: '2026-03-24', time: '12:00' },
    events: [{ kind: 'm2', due: '2026-02-01', at: '2026-02-02T10:00' }, { kind: 'replan', at: '2026-02-09T10:00', turnaroundH: 2.5, trigger: 'Marine works window' }, { kind: 'review', due: '2026-03-09' }],
    facts: { stage: 6, sections: { locked: 14, total: 16, late: 0 }, simScore: 79, passMark: 70, smeOverdue: 0, redTeamAt: '2026-03-09T10:00', reusePct: 55 },
  }),
  K.row('T-2025-436', 'Al Rayyan sewer rehabilitation', 'Al Rayyan sewer rehab', 'Doha Drainage Works Authority', 'Al Rayyan', 'Utility networks', 95, 'monaqasat', {
    captured: '2025-12-28T09:00', m1: '2025-12-28T15:00', dg1: K.pursue('2025-12-29T10:00'),
    packIssued: '2026-01-19T14:00', dg2: K.bid('2026-01-20T10:00'),
    dg3Issued: '2026-03-07T15:30',
    steps: { '5:cost-build-up': '2026-02-01T09:00', '6:sections-assigned': '2026-02-11T09:00', '7:matrix': '2026-02-23T09:00' },
    now: { stage: 7, step: 'dg3-issued' }, submissionDeadline: { date: '2026-03-12', time: '12:00' },
    events: [{ kind: 'm2', due: '2026-01-28', at: '2026-01-28T12:00' }, { kind: 'review', due: '2026-02-19', at: '2026-02-19T10:00' }],
    facts: { stage: 7, requirements: { evidenced: 112, total: 112 }, mandatoryGaps: 0, redlinesOpen: 0, risksWithoutOwner: 0, dg3IssuedAt: '2026-03-07T15:30' },
  }),
  K.story('T-2026-012', {
    m1: '2026-01-07T13:52', dg1: dg1Gate(dg1Record(DAFNA, 'T-2026-012')),
    packIssued: '2026-02-01T08:30', dg2: K.bid('2026-02-01T14:00'),
    dg3Issued: '2026-02-22T14:00', dg3: K.approved('2026-02-23T10:00'),
    submission: K.sub('2026-02-26T11:30', '2026-02-26T12:00'),
    steps: { ...intakeSteps('2026-01-07T13:40', '2026-01-07T13:42', '2026-01-07T13:52'), '5:cost-build-up': '2026-02-10T09:00', '6:sections-assigned': '2026-02-15T09:00', '7:matrix': '2026-02-17T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-02-09', at: '2026-02-09T12:00' }, { kind: 'review', due: '2026-02-16', at: '2026-02-16T10:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-02-26', expectedAwardBy: '2026-03-26' }, 4.8, '2026-05-27', '2026-05-27'),
  }),
  K.story('T-2026-015', {
    m1: '2026-01-11T12:21', dg1: dg1Gate(dg1Record(DAFNA, 'T-2026-015')),
    packIssued: '2026-02-03T15:00', dg2: K.bid('2026-02-04T10:00'),
    dg3Issued: '2026-03-01T08:30', dg3: K.approved('2026-03-01T15:00'),
    submission: K.sub('2026-03-03T11:00', '2026-03-03T12:00'),
    steps: { ...intakeSteps('2026-01-11T12:10', '2026-01-11T12:12', '2026-01-11T12:21'), '5:cost-build-up': '2026-02-11T09:00', '6:sections-assigned': '2026-02-17T09:00', '7:matrix': '2026-02-23T09:00' },
    now: { stage: 8, step: 'awaiting-result' },
    events: [{ kind: 'm2', due: '2026-02-10', at: '2026-02-10T12:00' }, { kind: 'review', due: '2026-02-19', at: '2026-02-19T11:00' }],
    facts: K.s8({ packageReadyPct: 100, signaturesPending: 0, openingDate: '2026-03-03', expectedAwardBy: '2026-04-30' }, 5.8, '2026-06-01', '2026-06-01'),
  }),
  K.fromOutcome('DA-O17', 'T-2025-333', 'Northern Growth Corridor Authority', 'Al Khor', 'monaqasat', {
    captured: '2025-10-02T09:00', m1: '2025-10-05T14:00', dg1: K.pursue('2025-10-06T10:00'),
    packIssued: '2025-10-20T14:00', dg2: K.bid('2025-10-21T10:00'),
    dg3Issued: '2025-11-16T14:00', dg3: K.approved('2025-11-17T10:00'),
    events: [{ kind: 'm2', due: '2025-10-28', at: '2025-10-28T12:00' }, { kind: 'review', due: '2025-11-10', at: '2025-11-10T10:00' }, { kind: 'handover', at: '2026-02-19T09:00' }],
    now: { stage: 9, step: 'handover-or-debrief' },
    facts: { stage: 9, handoverAt: '2026-02-19T09:00', lessons: false },
  }),
];

export const CLAIMED_DAFNA = ['DA-O17'];
