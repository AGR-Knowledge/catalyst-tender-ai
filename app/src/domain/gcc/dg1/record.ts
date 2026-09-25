import type { Dg1Record, GccTender } from '@/data/gcc/types';
import type { Tone } from '@/data/types';
import { DEMO_NOW, addHours, durationText, minutesBetween, slaState } from '@/domain/gcc/clock';
import { DONE_KEY, readDone, type Done, type Stamped } from '@/domain/gcc/s1/done';
import { dataOf, tenderOf } from '@/domain/gcc/s1/common';
import type { Dg1Decision } from './decision';

/**
 * The DG1 record of a tender (spec §7, plan 007a step 9.1): the seed's record
 * (register row or history), then what was recorded in the demo. A re-open
 * clears the decision and keeps it in `previous`; a hold keeps the tender in
 * the queue with its SLA running.
 */

/** DG1 is due within 24 h of M1 (logged). */
export const DG1_SLA_HOURS = 24;

/** `dg1-hold:{TID}`. */
export interface Dg1HoldValue extends Stamped { request: { toId: string; what: string; due: string } }

/** `dg1-reopen:{TID}`. `previous` is the decision it cleared, so a later decision is not cleared by an old re-open. */
export interface Dg1ReopenValue extends Stamped { reason: string; previous?: Dg1Decision | Dg1Record }

export type AnyDg1 = Dg1Decision | Dg1Record;

export interface Dg1State {
  tenderId: string;
  /** The standing Pursue or Discard, or null while the tender waits for DG1. */
  current: AnyDg1 | null;
  /** Where `current` comes from. */
  source: 'seed' | 'demo' | null;
  /** An open Hold: a person was asked for information; the SLA keeps running. */
  hold: Dg1HoldValue | Dg1Record | null;
  reopen: Dg1ReopenValue | null;
  /** Decisions cleared by a re-open, oldest first. */
  previous: AnyDg1[];
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The seed's DG1 record: the register row's, else the latest in the history. */
function seedRecord(tenant: string, t: GccTender | undefined, tenderId: string): Dg1Record | undefined {
  if (t?.dg1) return t.dg1;
  return dataOf(tenant).history.dg1.filter((r) => r.tenderId === tenderId).sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function dg1RecordFor(tenant: string, tenderId: string, done: Done): Dg1State {
  const t = tenderOf(tenant, tenderId);
  const seed = seedRecord(tenant, t, tenderId);
  const demo = readDone<Dg1Decision>(done, DONE_KEY.dg1(tenderId));
  const reopen = readDone<Dg1ReopenValue>(done, DONE_KEY.dg1Reopen(tenderId));
  const heldDemo = readDone<Dg1HoldValue>(done, DONE_KEY.dg1Hold(tenderId));

  const seedDecision = seed && seed.decision !== 'hold' ? seed : undefined;
  let current: AnyDg1 | null = demo ?? seedDecision ?? null;
  let source: Dg1State['source'] = demo ? 'demo' : seedDecision ? 'seed' : null;
  const previous: AnyDg1[] = [];
  if (demo && seedDecision) previous.push(seedDecision);

  if (reopen) {
    if (reopen.previous) {
      if (current && same(reopen.previous, current)) { previous.push(current); current = null; source = null; }
      else if (!previous.some((p) => same(p, reopen.previous))) previous.push(reopen.previous);
    } else if (current && reopen.at >= current.at) { previous.push(current); current = null; source = null; }
  }

  const seedHold = seed?.decision === 'hold' ? seed : null;
  const hold = current ? null : heldDemo && (!reopen || heldDemo.at >= reopen.at) ? heldDemo : !demo && !reopen ? seedHold : null;
  return { tenderId, current, source, hold, reopen, previous };
}

export interface Dg1QueueItem {
  tenderId: string;
  title: string;
  shortTitle: string;
  restricted: boolean;
  bidManagerId: string;
  loggedAt: string;
  dueAt: string;
  leftMin: number;
  /** "6 h 10 m left" or "Overdue by 1 h 5 m". */
  slaText: string;
  tone: Tone;
  held: boolean;
  hold?: Dg1HoldValue | Dg1Record;
  reopened: boolean;
}

/** "6 h 10 m left" or "Overdue by 1 h 5 m", at the demo clock. */
export const slaTextOf = (leftMin: number) => (leftMin >= 0 ? `${durationText(leftMin)} left` : `Overdue by ${durationText(-leftMin)}`);

/**
 * Tenders waiting for DG1: in Stage 1 (or re-opened back to it), routed to the
 * DG1 queue by intake, with no standing Pursue or Discard. Held tenders stay,
 * with `held: true`. Soonest SLA first.
 */
export function dg1Queue(tenant: string, done: Done): Dg1QueueItem[] {
  return dataOf(tenant).register
    .filter((t) => t.intake.disposition === 'shortlisted' && t.intake.loggedAt)
    .flatMap((t) => {
      const s = dg1RecordFor(tenant, t.id, done);
      if (s.current) return [];
      const inS1 = t.stage === 'S1' || !!s.reopen;
      if (!inS1) return [];
      const loggedAt = t.intake.loggedAt!;
      const dueAt = addHours(loggedAt, DG1_SLA_HOURS);
      const leftMin = minutesBetween(DEMO_NOW, dueAt);
      return [{
        tenderId: t.id, title: t.title, shortTitle: t.shortTitle, restricted: !!t.restricted, bidManagerId: t.bidManagerId,
        loggedAt, dueAt, leftMin, slaText: slaTextOf(leftMin), tone: slaState(loggedAt, dueAt).tone,
        held: !!s.hold, ...(s.hold ? { hold: s.hold } : {}), reopened: !!s.reopen,
      }];
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}
