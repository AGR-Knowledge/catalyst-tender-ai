import type { Tone } from '@/data/types';
import { BUYER_MINUTES, ESCALATION_TIME, REMINDER_DAYS_BEFORE, REMINDER_TIME } from '@/data/gcc/s2';
import { personById } from '@/data/people';
import { addDays, calendarDaysBetween, dateText, whenText } from '@/domain/calendar';
import { type Done, NOW } from './done';
import { dateOf, liveS2Tenders, nextWorkingDay, s2TenderOf, sentSupplierIds, supplierName, tenantOf, timeOf } from './context';
import { packagesFor } from './packaging';
import { approvedShortlist, rankedCandidates, type ShortlistItem } from './shortlist';
import { quotesFor, rfqsFor, type LiveRfq } from './rfq';
import { levelledFor } from './levelling';
import { clarificationsFor } from './clarifications';
import { mixFor } from './bestfit';

/**
 * Tracking and nudges (spec §8.5). Reminders follow the one rule of
 * ui-direction §7.3: 3 days before the reply date, then daily. Escalation
 * (§7.3, decided 2026-09-26): overdue at the reply time, reminder sent; escalated
 * to the Procurement Lead at 08:00 on the next working day if still unanswered.
 * Nothing is sent from here: the plan is shown, and counted.
 */

// ---------------------------------------------------------------------------
// Reply state

export const isOverdue = (r: LiveRfq, now = NOW) => !r.repliedAt && r.replyBy < now;

/** When escalation falls due by rule: the first working day after the reply date. */
export const escalationAt = (tenant: string, r: LiveRfq) => r.escalatedAt ?? nextWorkingDay(r.replyBy, tenantOf(tenant).cc, ESCALATION_TIME);

export const isEscalated = (tenant: string, r: LiveRfq, now = NOW) => isOverdue(r, now) && escalationAt(tenant, r) <= now;

export interface ReminderEntry { at: string; kind: 'reminder' | 'escalation'; text: string; state: 'sent' | 'planned' | 'not needed' }

/** The reminder and escalation plan of an RFQ, with what has already gone out. */
export function reminderPlan(tenant: string, r: LiveRfq, now = NOW): ReminderEntry[] {
  const t = tenantOf(tenant);
  const pkg = s2TenderOf(tenant, r.tenderId)?.packages.find((p) => p.id === r.packageId);
  const replyDate = dateOf(r.replyBy);
  const due = whenText(replyDate, timeOf(r.replyBy), t.tzLabel);
  const stateAt = (at: string): ReminderEntry['state'] => {
    if (r.repliedAt && at >= r.repliedAt) return 'not needed';
    return at <= now ? 'sent' : 'planned';
  };
  const out: ReminderEntry[] = [];
  for (let d = REMINDER_DAYS_BEFORE; d >= 0; d--) {
    const at = `${addDays(replyDate, -d)}T${REMINDER_TIME}`;
    if (at <= r.sentAt || at > r.replyBy) continue;
    out.push({ at, kind: 'reminder', state: stateAt(at),
      text: `Reminder to ${supplierName(tenant, r.supplierId)}: your quote for ${pkg?.title ?? r.packageId} is due ${due}${d ? `, in ${d} ${d === 1 ? 'day' : 'days'}` : ', today'}. Reply through the RFQ link.` });
  }
  const esc = escalationAt(tenant, r);
  const proc = personById(`${tenant}.proc`)?.name ?? 'the Procurement Lead';
  out.push({ at: esc, kind: 'escalation', state: r.declined || (r.repliedAt && esc >= r.repliedAt) ? 'not needed' : esc <= now ? 'sent' : 'planned',
    text: `No reply from ${supplierName(tenant, r.supplierId)} by ${due}: escalated to ${proc}, with reserve suppliers suggested.` });
  return out;
}

export interface RfqStatus { text: string; tone: Tone }

/** The RFQ status vocabulary of ui-direction §7.3. */
export function rfqStatus(tenant: string, r: LiveRfq, now = NOW): RfqStatus {
  if (r.declined) return { text: `Declined, ${r.declined.reason}`, tone: 'grey' };
  if (r.quoteId && r.repliedAt) return { text: `Quote received ${dateText(dateOf(r.repliedAt))}`, tone: 'green' };
  if (isOverdue(r, now)) return isEscalated(tenant, r, now) ? { text: 'No response, escalated', tone: 'red' } : { text: 'Overdue, reminder sent', tone: 'orange' };
  if (reminderPlan(tenant, r, now).some((e) => e.kind === 'reminder' && e.state === 'sent')) {
    const n = calendarDaysBetween(dateOf(now), dateOf(r.replyBy));
    return { text: `Reminder sent, ${n} ${n === 1 ? 'day' : 'days'} to reply date`, tone: 'orange' };
  }
  if (r.acknowledgedAt) return { text: 'Acknowledged', tone: 'ink' };
  if (r.openedAt) return { text: 'Opened, not yet quoted', tone: 'ink' };
  return { text: 'Sent', tone: 'ink' };
}

// ---------------------------------------------------------------------------
// Package board

export type BoardColumn = 'not-issued' | 'issued' | 'acknowledged' | 'quoted' | 'levelled' | 'approved';

export const BOARD_LABEL: Record<BoardColumn, string> = {
  'not-issued': 'Not issued', issued: 'Issued', acknowledged: 'Acknowledged', quoted: 'Quoted', levelled: 'Levelled', approved: 'Buyer approved',
};
const ORDER: BoardColumn[] = ['issued', 'acknowledged', 'quoted', 'levelled', 'approved'];

export interface BoardRow {
  pkgId: string;
  title: string;
  column: BoardColumn;
  label: string;
  rfqs: number;
  declined: number;
  quotes: number;
  longLeadWeeks?: number;
}

/**
 * Each package sits in the furthest column all its live RFQs have reached
 * (declines are set aside); Quoted needs at least one quote, and Buyer
 * approved needs the package in an approved best-fit mix.
 */
export function packageBoard(tenant: string, tenderId: string, done: Done, now = NOW): BoardRow[] {
  const rfqs = rfqsFor(tenant, tenderId, done).filter((r) => r.sentAt <= now);
  const levelled = new Map(levelledFor(tenant, tenderId, done).map((l) => [l.quoteId, l]));
  const mix = mixFor(tenant, tenderId, done);
  const inMix = new Set(mix?.picks.map((p) => p.pkgId) ?? []);
  return packagesFor(tenant, tenderId, done).map(({ pkg }) => {
    const mine = rfqs.filter((r) => r.packageId === pkg.id);
    const live = mine.filter((r) => !r.declined);
    const quotes = mine.filter((r) => r.quoteId).length;
    let column: BoardColumn = 'not-issued';
    if (mine.length) {
      const stageOf = (r: LiveRfq) => {
        const l = r.quoteId ? levelled.get(r.quoteId) : undefined;
        if (l?.state === 'levelled') return inMix.has(pkg.id) ? 4 : 3;
        if (r.quoteId) return 2;
        return r.acknowledgedAt ? 1 : 0;
      };
      const reached = live.length ? Math.min(...live.map(stageOf)) : 0;
      // Every live RFQ has a quote from column 2 on, so Quoted always has at least one; all declined stays Issued.
      column = ORDER[reached];
    }
    return { pkgId: pkg.id, title: pkg.title, column, label: BOARD_LABEL[column], rfqs: mine.length, declined: mine.length - live.length, quotes,
      ...(pkg.longLeadWeeks ? { longLeadWeeks: pkg.longLeadWeeks } : {}) };
  });
}

// ---------------------------------------------------------------------------
// Per-supplier matrix

export interface MatrixRow {
  rfqId: string;
  supplierId: string;
  supplierName: string;
  packageId: string;
  sentAt: string;
  replyBy: string;
  openedAt?: string;
  acknowledgedAt?: string;
  declined?: { at: string; reason: string };
  quotedAt?: string;
  clarificationOpen: boolean;
  overdue: boolean;
  escalated: boolean;
  status: RfqStatus;
}

export function supplierMatrix(tenant: string, tenderId: string, done: Done, now = NOW): MatrixRow[] {
  const open = clarificationsFor(tenant, tenderId, done, now).filter((c) => c.state === 'open');
  return rfqsFor(tenant, tenderId, done).filter((r) => r.sentAt <= now).map((r) => ({
    rfqId: r.id, supplierId: r.supplierId, supplierName: supplierName(tenant, r.supplierId), packageId: r.packageId, sentAt: r.sentAt, replyBy: r.replyBy,
    ...(r.openedAt ? { openedAt: r.openedAt } : {}), ...(r.acknowledgedAt ? { acknowledgedAt: r.acknowledgedAt } : {}),
    ...(r.declined ? { declined: r.declined } : {}), ...(r.quoteId && r.repliedAt ? { quotedAt: r.repliedAt } : {}),
    clarificationOpen: open.some((c) => c.supplierId === r.supplierId && c.packageId === r.packageId),
    overdue: isOverdue(r, now), escalated: isEscalated(tenant, r, now), status: rfqStatus(tenant, r, now),
  }));
}

// ---------------------------------------------------------------------------
// SRC-3, SRC-4

const liveRfqs = (tenant: string, done: Done, now: string) =>
  liveS2Tenders(tenant, done).flatMap((t) => rfqsFor(tenant, t.tenderId, done)).filter((r) => r.sentAt <= now);

/** SRC-3: RFQs answered (quote or decline) by their reply date ÷ RFQs whose reply date has passed. */
export function repliesOnTime(tenant: string, done: Done, now = NOW): { onTime: number; due: number; pct: number | null } {
  const due = liveRfqs(tenant, done, now).filter((r) => r.replyBy <= now);
  const onTime = due.filter((r) => r.repliedAt && r.repliedAt <= r.replyBy).length;
  return { onTime, due: due.length, pct: due.length ? Math.round((onTime / due.length) * 100) : null };
}

/** SRC-4: RFQs past their reply date without a reply, and how many are escalated. */
export function overdue(tenant: string, done: Done, now = NOW): { count: number; escalated: number; rfqs: LiveRfq[] } {
  const rfqs = liveRfqs(tenant, done, now).filter((r) => isOverdue(r, now));
  return { count: rfqs.length, escalated: rfqs.filter((r) => isEscalated(tenant, r, now)).length, rfqs };
}

/** Per tender: what 017's interim `s2` facts state. */
export function rfqCounts(tenant: string, tenderId: string, done: Done, now = NOW) {
  const all = rfqsFor(tenant, tenderId, done);
  const rfqs = all.filter((r) => r.sentAt <= now);
  // Due at exactly 10:00 is still ahead at 10:00 (plan 021 4.5).
  const due = rfqs.filter((r) => r.replyBy < now);
  const od = rfqs.filter((r) => isOverdue(r, now));
  /** The reply date the RFQs were issued with, before any extension; the latest when batches differ. */
  const issuedReplyBy = rfqs.map((r) => r.extendedFrom ?? r.replyBy).sort().pop();
  /** The next reply date still ahead, after extensions, among RFQs not yet answered. Due at exactly now is ahead: `isOverdue` starts after it (plan 021 4.5). */
  const nextReplyBy = rfqs.filter((r) => !r.repliedAt && r.replyBy >= now).map((r) => r.replyBy).sort()[0];
  return {
    sent: rfqs.length,
    /** Every RFQ the tender has, seeded or sent in the demo, including any dated after `now`. */
    total: all.length,
    dueSoFar: due.length,
    answeredOnTime: due.filter((r) => r.repliedAt && r.repliedAt <= r.replyBy).length,
    overdue: od.length,
    escalated: od.filter((r) => isEscalated(tenant, r, now)).length,
    replies: rfqs.filter((r) => r.repliedAt).length,
    quotes: rfqs.filter((r) => r.quoteId).length,
    declines: rfqs.filter((r) => r.declined).length,
    /**
     * "Replies due": the next reply date still ahead, after extensions; the
     * issued reply date when none is ahead. T-2026-104: Tue 10 Mar (two
     * suppliers extended); T-2026-109: Sun 15 Mar.
     */
    repliesDue: nextReplyBy ?? issuedReplyBy,
    issuedReplyBy,
    nextReplyBy,
  };
}

// ---------------------------------------------------------------------------
// Reserves

export interface Reserve extends ShortlistItem { from: 'shortlist' | 'master' }

/** For an overdue RFQ past the SLA: shortlist members not yet sent, then other candidates from the master. Sendable only. */
export function reserveSuppliers(tenant: string, tenderId: string, pkgId: string, done: Done): Reserve[] {
  const pkg = packagesFor(tenant, tenderId, done).find((p) => p.pkg.id === pkgId)?.pkg;
  if (!pkg) return [];
  const sent = sentSupplierIds(tenant, tenderId, pkgId, done);
  const listed = new Set(approvedShortlist(tenant, tenderId, pkgId, done)?.supplierIds ?? []);
  const ranked = rankedCandidates(tenant, tenderId, pkg).filter((c) => c.sendable && !sent.has(c.supplierId));
  return [
    ...ranked.filter((c) => listed.has(c.supplierId)).map((c): Reserve => ({ ...c, from: 'shortlist' })),
    ...ranked.filter((c) => !listed.has(c.supplierId)).map((c): Reserve => ({ ...c, from: 'master' })),
  ];
}

// ---------------------------------------------------------------------------
// SRC-11 Buyer time saved (estimated)

export function buyerTimeSaved(tenant: string, done: Done, now = NOW): { hours: number; nudges: number; parsed: number; levelled: number; label: string } {
  let nudges = 0;
  let parsed = 0;
  let levelled = 0;
  for (const t of liveS2Tenders(tenant, done)) {
    for (const r of rfqsFor(tenant, t.tenderId, done)) {
      nudges += r.nudges + reminderPlan(tenant, r, now).filter((e) => e.kind === 'reminder' && e.state === 'sent').length;
    }
    parsed += quotesFor(tenant, t.tenderId, done).filter((q) => q.receivedAt <= now).length;
    levelled += levelledFor(tenant, t.tenderId, done).filter((l) => l.state === 'levelled').length;
  }
  const minutes = nudges * BUYER_MINUTES.nudge + parsed * BUYER_MINUTES.parsedQuote + levelled * BUYER_MINUTES.levelledQuote;
  return { hours: Math.round(minutes / 6) / 10, nudges, parsed, levelled, label: 'Estimated from agent action counts and the tenant’s time standards' };
}
