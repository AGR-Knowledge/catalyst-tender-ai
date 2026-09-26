import type { GccTender } from '@/data/gcc/types';
import { s1Data } from '@/data/gcc/s1';
import { DEMO_TODAY, calendarDaysBetween } from '@/domain/calendar';
import { moneyPair, type MoneyPair } from '@/domain/money';
import { DONE_KEY, isFlagged, type Done } from '@/domain/gcc/s1/done';
import { dataOf, keyDate, tenantCcy, tenderOf } from '@/domain/gcc/s1/common';
import { recommendationFor, fitFor, type ComparableVM, type FitResult, type RecommendationVM } from '@/domain/gcc/s1/fit';
import type { EligibilityLine, EligibilityResult } from '@/domain/gcc/s1/eligibility';
import { keyDatesFor, prepRatio, type KeyDateRow, type PrepRatio } from '@/domain/gcc/s1/dates';
import { bidBondFor, facilityHeadroom, type BidBond } from '@/domain/gcc/s1/bond';
import { asCommitment, peakMonth, teamLoad, toSubmissionLabel, type PeakMonth } from '@/domain/gcc/s1/triage';
import { blockingOpen, validationsOf, type QueueItem } from '@/domain/gcc/s1/validation';
import { queriesFor, type QueriesVM } from '@/domain/gcc/s1/queries';
import { dg1RecordFor } from './record';

/**
 * The DG1 evidence pack (spec §7, plan 007a step 9.2): one screen with the
 * eight parts in order. DG1 cannot be recorded while a field that blocks it is
 * still open; the lock names the Coordinator and offers a nudge.
 */

export const PROCUREMENT_LABEL: Record<GccTender['procurement'], string> = {
  'two-file': 'Public tender, two files (technical and financial)',
  open: 'Open tender',
  pq: 'Prequalification',
  limited: 'Limited tender (by invitation)',
};

/** Other pursuits on the same team whose submission falls within this many days of this one. */
const CLASH_DAYS = 7;

export interface Dg1Pack {
  tenant: string;
  tenderId: string;
  /** The decision round in force (plan 021 4.1): a decision recorded on this pack is written in it. */
  round: number;
  /** 1. */
  recommendation: RecommendationVM;
  /** 2. */
  glance: {
    authority: string;
    value: MoneyPair | null;
    valueBasis: GccTender['value']['basis'];
    type: string;
    keyDates: KeyDateRow[];
    prep: PrepRatio | null;
  };
  /** 3. Fail, at-risk and interpretation lines expanded. */
  eligibility: { result: EligibilityResult; expanded: EligibilityLine[] } | null;
  /** 4. */
  fit: { result: FitResult; collapsed: true };
  /** 5. */
  capacity: {
    teamId: string;
    teamName: string;
    /** Today to submission: not the four weeks triage and CAP-1 read. */
    window: { from: string; to: string };
    /** "Today to submission (8 Mar – 26 Apr)". */
    windowLabel: string;
    nowPct: number;
    withPct: number;
    peak: PeakMonth;
    clashes: { tenderId: string; title: string; to: string; hoursPerWeek: number }[];
  } | null;
  /** 6. */
  bond: { bond: BidBond; facilityText: string } | null;
  /** 7. */
  comparables: ComparableVM[];
  /** 8. */
  open: { validations: QueueItem[]; queries: QueriesVM };
  /** Set while a field that blocks DG1 is open. */
  locked: {
    reason: string;
    /** Nudge the Coordinator; absent when the tenant has none. The lock stands either way. */
    nudge?: { key: string; toId: string; sent: boolean };
    /**
     * The recommendation is a PQ-fail discard: no open field can change a PQ
     * fail, so Discard stays open while Pursue is locked.
     */
    discardAllowed: boolean;
  } | null;
}

/** "Recommend discard" because the company fails the PQ bidding alone and no partner clears it. */
export const isPqFailDiscard = (pack: Pick<Dg1Pack, 'recommendation' | 'eligibility'>) =>
  pack.recommendation.verdict === 'discard' && pack.eligibility?.result.verdict === 'not-eligible';

export function dg1PackFor(tenant: string, tenderId: string, done: Done): Dg1Pack | null {
  const t = tenderOf(tenant, tenderId);
  const recommendation = recommendationFor(tenant, tenderId, done);
  const fit = fitFor(tenant, tenderId, done);
  if (!t || !recommendation || !fit) return null;
  const d = dataOf(tenant);
  const ccy = tenantCcy(tenant);

  const eligibility = fit.eligibility
    ? { result: fit.eligibility, expanded: fit.eligibility.lines.filter((l) => l.state === 'fail' || l.state === 'at-risk' || l.state === 'interpretation') }
    : null;

  const effort = s1Data(tenant).effort.find((e) => e.tenderId === tenderId);
  const team = effort ? d.teams.find((x) => x.id === effort.teamId) : undefined;
  const sub = keyDate(t, 'submission');
  const capacity = effort && team && sub && sub.date >= DEMO_TODAY
    ? {
      teamId: team.id, teamName: team.name, window: { from: DEMO_TODAY, to: sub.date }, windowLabel: toSubmissionLabel(DEMO_TODAY, sub.date),
      nowPct: Math.round(teamLoad(team, DEMO_TODAY, sub.date) * 100),
      withPct: Math.round(teamLoad(team, DEMO_TODAY, sub.date, [asCommitment(effort)]) * 100),
      peak: peakMonth(team, DEMO_TODAY, sub.date, [asCommitment(effort)]),
      clashes: team.commitments
        .filter((c) => c.tenderId !== tenderId && Math.abs(calendarDaysBetween(c.to, sub.date)) <= CLASH_DAYS)
        .map((c) => ({ tenderId: c.tenderId, title: d.register.find((x) => x.id === c.tenderId)?.shortTitle ?? c.tenderId, to: c.to, hoursPerWeek: c.hoursPerWeek })),
    }
    : null;

  const bond = bidBondFor(tenant, tenderId, done);
  const blocking = blockingOpen(tenant, tenderId, done);
  const nudgeKey = DONE_KEY.nudged(`val-${tenderId}`);

  const pqFailDiscard = isPqFailDiscard({ recommendation, eligibility });

  return {
    tenant, tenderId, round: dg1RecordFor(tenant, tenderId, done).round, recommendation,
    glance: {
      authority: t.issuer,
      value: t.value.basis === 'not-stated' || !t.value.amount ? null : moneyPair(t.value.amount, t.value.ccy, ccy),
      valueBasis: t.value.basis,
      type: PROCUREMENT_LABEL[t.procurement],
      keyDates: keyDatesFor(tenant, tenderId),
      prep: prepRatio(tenant, tenderId),
    },
    eligibility,
    fit: { result: fit, collapsed: true },
    capacity,
    bond: bond ? { bond, facilityText: facilityHeadroom(tenant).text } : null,
    comparables: fit.comparables,
    open: { validations: validationsOf(tenant, tenderId, done).filter((q) => q.state !== 'resolved'), queries: queriesFor(tenant, tenderId, done) },
    locked: blocking.count
      ? {
        reason: blocking.text,
        ...(blocking.coordinatorId ? { nudge: { key: nudgeKey, toId: blocking.coordinatorId, sent: isFlagged(done, nudgeKey) } } : {}),
        discardAllowed: pqFailDiscard,
      }
      : null,
  };
}
