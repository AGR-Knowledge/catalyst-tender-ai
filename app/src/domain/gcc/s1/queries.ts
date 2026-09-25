import { s1Data, type QueryDraft } from '@/data/gcc/s1';
import { DEMO_TODAY, calendarDaysBetween, workingDaysBetween } from '@/domain/calendar';
import { DONE_KEY, json, nowIso, readDone, type AuditDraft, type Done, type DoneWrite, type Stamped } from './done';
import { authorityCalendar, keyDate, shortDate, tenderOf } from './common';

/**
 * Queries to the employer (spec §6.10, plan 007a Phase 8): the agent's drafts
 * from extraction, eligibility and validation, each citing its clause and page.
 * A person edits, approves and "sends" them. Sending only marks them sent via
 * the portal (demo): nothing leaves the app.
 */

/** `query:{queryId}`. */
export interface QueryValue extends Stamped { state: 'approved' | 'sent'; text?: string }

export interface QueryVM {
  query: QueryDraft;
  state: 'draft' | 'approved' | 'sent';
  /** The text as it stands: the person's edit, else the draft. */
  text: string;
  edited: boolean;
  /** "p. 12 and p. 35". */
  pagesText: string;
  at?: string;
  byId?: string;
}

export interface QueriesVM {
  items: QueryVM[];
  counts: { draft: number; approved: number; sent: number };
  /** Countdown to the questions deadline, in the authority's working days. */
  deadline: { date: string; daysLeft: number; workingDaysLeft: number; past: boolean; text: string } | null;
}

export function queriesFor(tenant: string, tenderId: string, done: Done): QueriesVM {
  const t = tenderOf(tenant, tenderId);
  const items: QueryVM[] = s1Data(tenant).queries.filter((q) => q.tenderId === tenderId).map((q) => {
    const v = readDone<QueryValue>(done, DONE_KEY.query(q.id));
    return {
      query: q, state: v?.state ?? 'draft', text: v?.text ?? q.text, edited: !!v?.text && v.text !== q.text,
      pagesText: q.alsoPage ? `p. ${q.page} and p. ${q.alsoPage}` : `p. ${q.page}`,
      ...(v ? { at: v.at, byId: v.byId } : {}),
    };
  });
  const n = (s: QueryVM['state']) => items.filter((i) => i.state === s).length;

  const q = t ? keyDate(t, 'questions') : undefined;
  let deadline: QueriesVM['deadline'] = null;
  if (t && q) {
    const { cc } = authorityCalendar(t, tenant);
    const workingDaysLeft = workingDaysBetween(DEMO_TODAY, q.date, cc);
    const past = q.date < DEMO_TODAY;
    deadline = {
      date: q.date, daysLeft: calendarDaysBetween(DEMO_TODAY, q.date), workingDaysLeft, past,
      text: past ? `Questions closed ${shortDate(q.date)}` : `Questions close ${shortDate(q.date)}: ${workingDaysLeft} working day${workingDaysLeft === 1 ? '' : 's'} left`,
    };
  }
  return { items, counts: { draft: n('draft'), approved: n('approved'), sent: n('sent') }, deadline };
}

/** Approve a draft (with the person's edits), or mark it sent via the portal (demo). */
export function queryAction(query: QueryDraft, action: 'approve' | 'send', text: string, byId: string, at = nowIso()): DoneWrite & { audit: AuditDraft } {
  const value: QueryValue = { state: action === 'approve' ? 'approved' : 'sent', at, byId, ...(text && text !== query.text ? { text } : {}) };
  const audit: AuditDraft = action === 'approve'
    ? { action: 'Query approved', target: `${query.tenderId} · ${query.topic}`, detail: `${query.clause}, p. ${query.page}${value.text ? ' (edited)' : ''}` }
    : { action: 'Query marked sent via the portal (demo)', target: `${query.tenderId} · ${query.topic}`, detail: `${query.clause}, p. ${query.page}. Nothing leaves the app` };
  return { key: DONE_KEY.query(query.id), value: json(value), audit };
}
