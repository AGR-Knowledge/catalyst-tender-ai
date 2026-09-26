import type { Money, Team } from '@/data/gcc/types';
import { s1Data, type EffortEstimate } from '@/data/gcc/s1';
import { DEMO_TODAY, addDays, calendarDaysBetween } from '@/domain/calendar';
import { moneyPair, type MoneyPair } from '@/domain/money';
import { dg1Queue, dg1RecordFor } from '@/domain/gcc/dg1/record';
import type { Done } from './done';
import { bidBondFor, facilityHeadroom } from './bond';
import { fitScoresFor } from './eligibility';
import { capitalise, countWord, dataOf, dayMonth, monthName, tenantCcy, weightedOf } from './common';

/**
 * Same-day triage and bid-team capacity (spec §6.9, plan 007a Phase 7). The
 * table states what pursuing everything would do to each team and to the bank
 * facility; it never ranks the tenders for people.
 */

export type Commitment = Team['commitments'][number];

/** The next four weeks, as CAP-1 reads them. */
export const CAPACITY_WINDOW_DAYS = 28;

/**
 * Two capacity windows are in use, and a screen must say which it shows:
 * triage and CAP-1 read the next four weeks; the DG1 pack reads today to the
 * tender's submission. "Next 4 weeks (8 Mar – 4 Apr)".
 */
export const nextWeeksLabel = (from: string, to: string) => `Next ${CAPACITY_WINDOW_DAYS / 7} weeks (${dayMonth(from)} – ${dayMonth(to)})`;
/** "Today to submission (8 Mar – 26 Apr)". */
export const toSubmissionLabel = (from: string, to: string) => `Today to submission (${dayMonth(from)} – ${dayMonth(to)})`;

const overlapDays = (from: string, to: string, a: string, b: string) => {
  const start = from > a ? from : a;
  const end = to < b ? to : b;
  return Math.max(0, calendarDaysBetween(start, end) + 1);
};

const peopleOf = (t: Team) => t.engineers + t.estimators + t.planners;

/**
 * Committed hours ÷ available hours in [from, to] (inclusive), with each
 * commitment counted for the days it overlaps the window: CAP-1's arithmetic,
 * moved here from plan 004's dev check. 0.78 is 78%.
 */
export function teamLoad(team: Team, from: string, to: string, extra: Commitment[] = []): number {
  const days = overlapDays(from, to, from, to);
  if (!days) return 0;
  const committed = [...team.commitments, ...extra].reduce((s, c) => s + (c.hoursPerWeek * overlapDays(c.from, c.to, from, to)) / 7, 0);
  return committed / ((peopleOf(team) * team.hoursPerWeek * days) / 7);
}

export interface PeakMonth { month: string; monthStart: string; pct: number; share: number }

/** The busiest calendar month of [from, to], each month clipped to the window. */
export function peakMonth(team: Team, from: string, to: string, extra: Commitment[] = []): PeakMonth {
  let best: PeakMonth = { month: monthName(from), monthStart: `${from.slice(0, 7)}-01`, pct: 0, share: 0 };
  for (let m = `${from.slice(0, 7)}-01`; m <= to; m = addDays(m, 32).slice(0, 8) + '01') {
    const end = addDays(addDays(m, 32).slice(0, 8) + '01', -1);
    const a = m < from ? from : m;
    const b = end > to ? to : end;
    const share = teamLoad(team, a, b, extra);
    if (share > best.share) best = { month: monthName(m), monthStart: m, pct: Math.round(share * 100), share };
  }
  return best;
}

const pursuingAll = (n: number) => (n === 1 ? 'Pursuing it' : n === 2 ? 'Pursuing both' : `Pursuing all ${countWord(n)}`);

export const asCommitment = (e: EffortEstimate): Commitment => ({ tenderId: e.tenderId, hoursPerWeek: e.hoursPerWeek, from: e.from, to: e.to, note: e.note });

export interface TriageRow {
  tenderId: string;
  title: string;
  shortTitle: string;
  restricted: boolean;
  queue: 'dg1' | 'low-fit';
  held: boolean;
  fit: number;
  value: MoneyPair;
  valueBasis: 'published' | 'estimate' | 'not-stated';
  effort?: EffortEstimate;
  teamId?: string;
  teamName?: string;
  bidBond: Money;
  /** If this row and every row above it were pursued. */
  cumulative: { teamLoadPct: number | null; facilityUsePct: number; facilityLeft: Money };
}

export interface TriageTeam { id: string; name: string; basePct: number; allPct: number; rows: number; peak: PeakMonth }

export interface TriageResult {
  /** The next four weeks: every team percentage here is over this window. */
  window: { from: string; to: string };
  /** "Next 4 weeks (8 Mar – 4 Apr)", so a screen never confuses it with the DG1 pack's window to submission. */
  windowLabel: string;
  rows: TriageRow[];
  teams: TriageTeam[];
  facility: { headroom: Money; allBonds: Money; usePct: number };
  /** Facts, never a ranking: "Pursuing all three would use 112% of the Water team's bid capacity in March." */
  flags: string[];
}

/** Tenders waiting for DG1 (soonest SLA first), then the low-fit ones a person may still take (oldest first). */
export function triageFor(tenant: string, done: Done): TriageResult {
  const d = dataOf(tenant);
  const s1 = s1Data(tenant);
  const ccy = tenantCcy(tenant);
  const from = DEMO_TODAY;
  const to = addDays(DEMO_TODAY, CAPACITY_WINDOW_DAYS - 1);
  const f = facilityHeadroom(tenant);

  const queue = dg1Queue(tenant, done);
  const lowFit = d.register
    .filter((t) => t.stage === 'S1' && t.intake.disposition === 'low-fit' && !dg1RecordFor(tenant, t.id, done).current)
    .sort((a, b) => (a.intake.loggedAt ?? a.intake.capturedAt).localeCompare(b.intake.loggedAt ?? b.intake.capturedAt));
  const order = [
    ...queue.map((q) => ({ t: d.register.find((x) => x.id === q.tenderId)!, queue: 'dg1' as const, held: q.held })),
    ...lowFit.map((t) => ({ t, queue: 'low-fit' as const, held: false })),
  ];

  const extras = new Map<string, Commitment[]>();
  let bonds = 0;
  const rows: TriageRow[] = order.map(({ t, queue: q, held }) => {
    const effort = s1.effort.find((e) => e.tenderId === t.id);
    const team = effort ? d.teams.find((x) => x.id === effort.teamId) : undefined;
    if (effort && team) extras.set(team.id, [...(extras.get(team.id) ?? []), asCommitment(effort)]);
    const bond = bidBondFor(tenant, t.id, done);
    bonds += bond?.amount.amount ?? 0;
    const scores = fitScoresFor(tenant, t.id, done)!.scores;
    return {
      tenderId: t.id, title: t.title, shortTitle: t.shortTitle, restricted: !!t.restricted, queue: q, held,
      fit: weightedOf(d, scores),
      value: moneyPair(t.value.amount, t.value.ccy, ccy), valueBasis: t.value.basis,
      ...(effort ? { effort } : {}), ...(team ? { teamId: team.id, teamName: team.name } : {}),
      bidBond: bond?.amount ?? { amount: 0, ccy },
      cumulative: {
        teamLoadPct: team ? Math.round(teamLoad(team, from, to, extras.get(team.id)) * 100) : null,
        facilityUsePct: f.headroom.amount > 0 ? Math.round((bonds / f.headroom.amount) * 100) : 0,
        facilityLeft: { amount: f.headroom.amount - bonds, ccy },
      },
    };
  });

  const teams: TriageTeam[] = d.teams.map((team) => {
    const extra = extras.get(team.id) ?? [];
    const until = extra.reduce((m, c) => (c.to > m ? c.to : m), to);
    return {
      id: team.id, name: team.name, rows: extra.length,
      basePct: Math.round(teamLoad(team, from, to) * 100),
      allPct: Math.round(teamLoad(team, from, to, extra) * 100),
      peak: peakMonth(team, from, until, extra),
    };
  });

  const flags = teams
    .filter((t) => t.rows && t.peak.pct > 100)
    .map((t) => `${pursuingAll(t.rows)} would use ${t.peak.pct}% of the ${capitalise(t.name)}'s bid capacity in ${t.peak.month}.`);
  const usePct = f.headroom.amount > 0 ? Math.round((bonds / f.headroom.amount) * 100) : 0;
  if (usePct > 100) flags.push(`${pursuingAll(rows.length)} would need bid bonds of ${usePct}% of the bank guarantee facility headroom.`);

  return {
    window: { from, to }, windowLabel: nextWeeksLabel(from, to), rows, teams,
    facility: { headroom: f.headroom, allBonds: { amount: bonds, ccy }, usePct }, flags,
  };
}
