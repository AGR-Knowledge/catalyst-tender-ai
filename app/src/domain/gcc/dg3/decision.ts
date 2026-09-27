import { can, type CanCtx } from '@/data/access';
import { firstWithRole, personById, type Person } from '@/data/people';
import type { Tone } from '@/data/types';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { addDays } from '@/domain/calendar';
import { addHours, durationText, minutesBetween } from '@/domain/gcc/clock';
import { requestWrite } from '@/domain/gcc/requestKeys';
import { nowIso, readDone, type AuditDraft, type Done, type Write, type WriteError } from '@/domain/gcc/s3/done';
import {
  activeDecision, backKey, DG3_BACK_TOPIC, dg3Key, openedAtOf, reissueKey, reopenKey, reopenOf, roundOf,
  type Dg3Choice, type Dg3Decision, type Dg3Fix, type Dg3ReissueValue, type Dg3ReopenEntry, type Dg3ReopenValue, type Dg3SendBackValue,
} from './keys';
import { BANK_EXTENSION_DAYS, dayText, dg3EvidenceFor, evidenceText, maskedSentence, stampOf, type Dg3EvidenceVM } from './evidence';

/**
 * DG3: final bid approval (dashboards.md §9, plan 018 Phase 2). Compliance
 * issues the pack; the Head of Tendering approves submission or rejects it
 * with reasons. Approval needs every blocking evidence line to pass. "Send
 * back to Compliance" is an action, not a decision: the pack goes back with a
 * note, and Compliance re-issues it, which starts a new round and restarts
 * the 48 h clock. A decision has no undo: it is re-opened with a reason, and
 * the earlier one stays on record.
 */

export const DG3_REJECT_REASONS: { code: string; label: string }[] = [
  { code: 'margin-below-minimum', label: 'Margin below the DG2 minimum' },
  { code: 'mandatory-not-evidenced', label: 'Mandatory requirement not evidenced' },
  { code: 'guarantee-not-valid', label: 'Guarantee not valid' },
  { code: 'unacceptable-deviation', label: 'Unacceptable deviation' },
  { code: 'signatory-not-ready', label: 'Signatory not ready' },
  { code: 'other', label: 'Other' },
];

export const dg3ReasonLabel = (code: string) => DG3_REJECT_REASONS.find((r) => r.code === code)?.label ?? code;
const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
/** "guarantee not valid, signatory not ready": the reasons inside a sentence. */
export const dg3ReasonText = (codes: string[]) => codes.map((c) => (c === 'other' ? 'other reason' : lowerFirst(dg3ReasonLabel(c)))).join(', ');

export const DG3_LABEL: Record<Dg3Choice, string> = { approved: 'Approved for submission', rejected: 'Rejected: do not submit' };
export const APPROVE_NEEDS_PASS = 'Approval needs every blocking check to pass: send it back to Compliance';
export const SENT_BACK_WAIT = 'The pack is back with Compliance: approve once it is re-issued';
export const DG3_SLA_HOURS = GATE_SLA_HOURS.DG3;

const nameOf = (id: string | null | undefined) => personById(id)?.name ?? id ?? '';
const firstName = (id: string | null | undefined) => nameOf(id).split(' ')[0];

// ---------------------------------------------------------------------------

export type Dg3StatusKey = 'ready' | 'fails' | 'sent-back' | 'approved' | 'rejected';
export interface Dg3Status { key: Dg3StatusKey; label: string; tone: Tone; icon: string }

export interface Dg3State {
  tenant: string;
  tenderId: string;
  title: string;
  shortTitle: string;
  bidManagerId: string | null;
  round: number;
  /** The round's clock: from the pack's issue, or its latest re-issue or re-open. */
  openedAt: string;
  slaDue: string;
  /** "30 h left", "Late by 2 h", or the decision time once decided. */
  slaText: string;
  breached: boolean;
  decision: Dg3Decision | null;
  /** Sent back to Compliance in this round and not yet re-issued (and not decided since). */
  sentBack: (Dg3SendBackValue & { round: number }) | null;
  /** Every re-open so far, oldest first. */
  reopens: Dg3ReopenEntry[];
  evaluation: Dg3EvidenceVM;
  status: Dg3Status;
  /** Why Approve is refused now, in words; absent when it can be approved. */
  approveBlocked?: string;
}

function statusOf(decision: Dg3Decision | null, sentBack: boolean, ev: Dg3EvidenceVM): Dg3Status {
  if (decision?.decision === 'approved') return { key: 'approved', label: 'Decided: approved', tone: 'green', icon: '✓' };
  if (decision?.decision === 'rejected') return { key: 'rejected', label: 'Decided: rejected', tone: 'grey', icon: '–' };
  if (sentBack) return { key: 'sent-back', label: 'Sent back to Compliance', tone: 'orange', icon: '•' };
  if (!ev.ready) return { key: 'fails', label: ev.failing.length === 1 ? '1 check fails' : `${ev.failing.length} checks fail`, tone: 'red', icon: '!' };
  return { key: 'ready', label: 'Ready', tone: 'green', icon: '✓' };
}

/** One tender's DG3, or null when it has no DG3 pack in the seed. */
export function dg3State(tenant: string, tenderId: string, done: Done): Dg3State | null {
  const evaluation = dg3EvidenceFor(tenant, tenderId, done);
  if (!evaluation) return null;
  const round = roundOf(done, tenderId);
  const decision = activeDecision(done, tenderId);
  const back = readDone<Dg3SendBackValue>(done, backKey(tenderId, round));
  const sentBack = !decision && back ? { ...back, round } : null;
  const openedAt = openedAtOf(done, tenderId, round, evaluation.issuedAt);
  const slaDue = addHours(openedAt, DG3_SLA_HOURS);
  const left = minutesBetween(nowIso(), slaDue);
  const breached = !decision && left < 0;
  const slaText = decision
    ? `Decided ${stampOf(decision.at)}${decision.at > slaDue ? ', after the time limit' : ''}`
    : left < 0 ? `Late by ${durationText(-left)}` : `${durationText(left)} left`;
  const approveBlocked = decision ? 'DG3 is already decided' : sentBack ? SENT_BACK_WAIT : !evaluation.ready ? APPROVE_NEEDS_PASS : undefined;
  const l = evaluation.l;
  return {
    tenant, tenderId, title: l.title, shortTitle: l.shortTitle, bidManagerId: l.bidManagerId,
    round, openedAt, slaDue, slaText, breached, decision, sentBack,
    reopens: reopenOf(done, tenderId)?.history ?? [],
    evaluation,
    status: statusOf(decision, !!sentBack, evaluation),
    ...(approveBlocked ? { approveBlocked } : {}),
  };
}

/**
 * The readiness in words, for the dashboard's action row (so the row and the
 * gate never disagree): "Ready for your approval: evidence complete",
 * "1 check fails: initial guarantee validity", "Sent back to Compliance · Nour".
 */
export function dg3Readiness(s: Dg3State, mine: boolean): string {
  if (s.decision) return s.status.label;
  if (s.sentBack) return `Sent back to Compliance · ${firstName(s.sentBack.toId)}`;
  if (s.evaluation.ready) return `${mine ? 'Ready for your approval' : 'Ready for approval'}: evidence complete`;
  return s.evaluation.summary;
}

// ---------------------------------------------------------------------------

/** An audit entry, with what its detail reveals (orchestrator contract, wave 4). */
export interface Dg3Audit extends AuditDraft { sensitive?: 'margin' }
export interface Dg3Result { writes: Write[]; audit: Dg3Audit[]; effects: string[] }
export interface Dg3WriteResult extends Dg3Result { decision: Dg3Decision }

export interface Dg3Input {
  tenderId: string;
  decision: Dg3Choice;
  /** Reject: one or more of `DG3_REJECT_REASONS`. */
  reasonCodes?: string[];
  /** Optional, except with the reason "Other". */
  note?: string;
}

const uniq = (xs: string[]) => [...new Set(xs)];

/** The send-back note's first draft: what each failing line asks of Compliance, with no price or margin figure (Compliance may not see them). */
export const sendBackDraft = (s: Dg3State) => s.evaluation.failing.map((l) => l.ask ?? `${l.label}: ${l.mask ? maskedSentence(l.mask) : l.text}`).join('\n');

/** The effects of a decision, before it is taken. */
export function dg3Effects(choice: Dg3Choice, s: Dg3State): string[] {
  const bm = personById(s.bidManagerId);
  return choice === 'approved'
    ? [`Submission approved. ${bm ? bm.name : 'The Bid Manager'} assembles the bid and submits it`, 'Stage moves to Submission']
    : ['Do not submit: the decision and its reasons are recorded', 'Tender closed: rejected at DG3'];
}

export function dg3Write(input: Dg3Input, by: Person, s: Dg3State | null, ctx: CanCtx = {}): Dg3WriteResult | WriteError {
  const allowed = can(by, 'dg3.decide', ctx);
  if (!allowed.ok) return { error: allowed.reason ?? 'Only the Head of Tendering approves DG3' };
  if (!s || s.tenderId !== input.tenderId) return { error: 'This tender is not waiting at DG3' };
  if (s.decision) return { error: 'DG3 is already decided in this round: re-open it to change the decision' };

  const note = input.note?.trim();
  let reasonCodes: string[] = [];
  if (input.decision === 'approved') {
    if (s.approveBlocked) return { error: s.approveBlocked };
  } else {
    reasonCodes = uniq(input.reasonCodes ?? []);
    if (!reasonCodes.length) return { error: 'Pick at least one reason to reject' };
    const unknown = reasonCodes.filter((c) => !DG3_REJECT_REASONS.some((r) => r.code === c));
    if (unknown.length) return { error: `Unknown reason: ${unknown.join(', ')}` };
    if (reasonCodes.includes('other') && !note) return { error: 'Write a note: the reason is Other' };
  }

  const ev = s.evaluation;
  const decision: Dg3Decision = {
    tenderId: s.tenderId, decision: input.decision, at: nowIso(), byId: by.id, reasonCodes,
    ...(note ? { note } : {}),
    round: s.round,
    evidenceSnapshot: ev.lines.map((l) => ({ key: l.key, label: l.label, state: l.state, text: l.text, ...(l.mask ? { maskedText: maskedSentence(l.mask) } : {}) })),
  };
  const seen = evidenceText({ passed: ev.passed, failed: ev.failing.length, info: ev.info });
  return {
    writes: [{ key: dg3Key(s.tenderId), value: JSON.stringify(decision) }],
    audit: [{
      actorId: by.id,
      action: input.decision === 'approved' ? 'DG3 approved' : `DG3 rejected: ${dg3ReasonText(reasonCodes)}`,
      target: s.tenderId,
      detail: [`${by.name}, round ${s.round}`, `Evidence: ${seen}`, note ? `Note: ${note}` : ''].filter(Boolean).join(' · '),
      // A note may state the price or margin.
      ...(note ? { sensitive: 'margin' as const } : {}),
    }],
    effects: dg3Effects(input.decision, s),
    decision,
  };
}

/** Send the pack back to Compliance with a note (the Head of Tendering). The clock keeps running. */
export function dg3SendBackWrite(s: Dg3State | null, note: string, by: Person, ctx: CanCtx = {}): Dg3Result | WriteError {
  const allowed = can(by, 'dg3.decide', ctx);
  if (!allowed.ok) return { error: allowed.reason ?? 'Only the Head of Tendering approves DG3' };
  if (!s) return { error: 'This tender is not waiting at DG3' };
  if (s.decision) return { error: 'DG3 is already decided: re-open it before sending the pack back' };
  if (s.sentBack) return { error: 'The pack is already back with Compliance' };
  const text = note.trim();
  if (!text) return { error: 'Write a note for Compliance: what must change before you can approve' };
  const comp = firstWithRole(s.tenant, 'comp');
  if (!comp) return { error: 'This company has no Compliance / Legal Lead to send it to' };
  const at = nowIso();
  const value: Dg3SendBackValue = { note: text, at, byId: by.id, toId: comp.id };
  const req = requestWrite(s.tenderId, comp.id, DG3_BACK_TOPIC, { what: `Re-issue the DG3 pack: ${text}`, section: 'DG3 pack', due: s.slaDue, at, byId: by.id });
  return {
    writes: [{ key: backKey(s.tenderId, s.round), value: JSON.stringify(value) }, req],
    audit: [{ actorId: by.id, action: 'DG3 sent back to Compliance', target: s.tenderId, detail: `To ${comp.name}: ${text}. The ${DG3_SLA_HOURS} h clock keeps running` }],
    effects: [
      `The pack goes back to ${comp.name}, ${comp.title}, with your note`,
      'It appears in their My requests',
      `The ${DG3_SLA_HOURS} h clock keeps running until the pack is re-issued`,
    ],
  };
}

/** The guarantee's expiry once the bank extends it (the demo control on re-issue). */
export const extendedTo = (s: Dg3State) => addDays(s.evaluation.evidence.bond.requiredTo, BANK_EXTENSION_DAYS);

/** Re-issue the pack after a send-back (Compliance). A new round starts, with a fresh 48 h clock. */
export function dg3ReissueWrite(s: Dg3State | null, input: { fixed?: Dg3Fix }, by: Person, ctx: CanCtx = {}): Dg3Result | WriteError {
  const allowed = can(by, 'dg3.issue', ctx);
  if (!allowed.ok) return { error: allowed.reason ?? 'Only Compliance issues the DG3 pack' };
  if (!s) return { error: 'This tender is not waiting at DG3' };
  if (s.decision) return { error: 'DG3 is already decided: the pack cannot be re-issued' };
  if (!s.sentBack) return { error: 'Nothing to re-issue: the Head of Tendering has not sent the pack back' };
  if (input.fixed && input.fixed !== 'bond-validity') return { error: `Unknown fix: ${input.fixed}` };
  const value: Dg3ReissueValue = { at: nowIso(), byId: by.id, ...(input.fixed ? { fixed: input.fixed } : {}) };
  const fixText = input.fixed ? `The bank extended the initial guarantee to ${dayText(extendedTo(s))} (demo control)` : '';
  return {
    writes: [{ key: reissueKey(s.tenderId, s.round), value: JSON.stringify(value) }],
    audit: [{ actorId: by.id, action: 'DG3 pack re-issued', target: s.tenderId, detail: [`Round ${s.round + 1}. The ${DG3_SLA_HOURS} h clock restarts`, fixText].filter(Boolean).join(' · ') }],
    effects: [
      ...(input.fixed ? [`The initial guarantee now reads valid to ${dayText(extendedTo(s))}`] : []),
      `The pack goes back to ${firstWithRole(s.tenant, 'hot')?.name ?? 'the Head of Tendering'} for DG3`,
      `The ${DG3_SLA_HOURS} h clock restarts`,
    ],
  };
}

/** Re-open the decision in force (the Head of Tendering, with a reason). The decision stays on record. */
export function dg3ReopenWrite(s: Dg3State | null, reason: string, by: Person, ctx: CanCtx = {}): Dg3Result | WriteError {
  const allowed = can(by, 'dg3.decide', ctx);
  if (!allowed.ok) return { error: allowed.reason ?? 'Only the Head of Tendering approves DG3' };
  if (!s?.decision) return { error: 'There is no DG3 decision to re-open' };
  const text = reason.trim();
  if (!text) return { error: 'Give a reason for re-opening DG3' };
  const at = nowIso();
  const entry: Dg3ReopenEntry = { decision: s.decision, reason: text, at, byId: by.id, round: s.round };
  const value: Dg3ReopenValue = { reason: text, at, byId: by.id, round: s.round, history: [...s.reopens, entry] };
  return {
    writes: [{ key: reopenKey(s.tenderId), value: JSON.stringify(value) }],
    audit: [{
      actorId: by.id, action: 'DG3 re-opened', target: s.tenderId,
      detail: `${text}. The decision "${DG3_LABEL[s.decision.decision]}" of ${stampOf(s.decision.at)} is kept on record`,
    }],
    effects: [
      'The decision is taken out of force and kept on record',
      s.decision.decision === 'approved' ? 'The tender goes back from Submission to DG3' : 'The tender is live again, back at DG3',
      `The ${DG3_SLA_HOURS} h clock restarts`,
    ],
  };
}
