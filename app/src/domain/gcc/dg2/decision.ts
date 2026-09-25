import { gccData, isGccTenantKey } from '@/data/gcc';
import { committeeOf, firstWithRole, personById } from '@/data/people';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { addHours, durationText, minutesBetween } from '@/domain/gcc/clock';
import { nowIso, stampText, type AuditDraft, type Done, type Write, type WriteError } from '@/domain/gcc/s3/done';
import { freshnessFor } from '@/domain/gcc/s3/freshness';
import { packVersionsFor } from '@/domain/gcc/s3/versions';
import { activeDecision, roundOf, type Dg2Choice, type Dg2Decision } from './keys';
import { positionsFor, type PositionsVM } from './positions';
import { splitConditions } from './conditions';
import { declineLetter, letterWrite } from './letter';

/**
 * DG2: Bid / No-Bid (spec §10 as changed by dashboards.md §9). Members record
 * positions; the Head of Tendering approves. Approval is disabled until 3 of 5
 * positions are in. Going against the majority needs a reason, and the record
 * says "Approval differs from majority". A stale pack doesn't block approval,
 * but the approver must acknowledge it. The clock runs 24 h from the first
 * issue of the pack.
 */

// ---------------------------------------------------------------------------
// No-Bid reasons: DG1's discard codes (spec §7) plus three DG2 ones. The DG1
// list is kept here with plan 007a's keys (004's history uses the same), not
// imported, so the two lanes stay independent.

export const DG1_DISCARD_REASONS: { code: string; label: string }[] = [
  { code: 'out-of-scope', label: 'Out of sector/scope' },
  { code: 'below-value', label: 'Below value threshold' },
  { code: 'above-limit', label: 'Above single-contract/bond limit' },
  { code: 'pq-fail-classification', label: 'PQ fail: classification' },
  { code: 'pq-fail-turnover', label: 'PQ fail: turnover' },
  { code: 'pq-fail-experience', label: 'PQ fail: experience' },
  { code: 'pq-fail-other', label: 'PQ fail: other' },
  { code: 'insufficient-time', label: 'Insufficient time' },
  { code: 'capacity', label: 'No capacity' },
  { code: 'unacceptable-terms', label: 'Unacceptable terms' },
  { code: 'client-risk', label: 'Client/payment risk' },
  { code: 'geography', label: 'Geography' },
  { code: 'strategic', label: 'Strategic' },
  { code: 'other', label: 'Other' },
];

export const NO_BID_REASONS: { code: string; label: string }[] = [
  ...DG1_DISCARD_REASONS.filter((r) => r.code !== 'other'),
  { code: 'price-competitiveness', label: 'Price competitiveness' },
  { code: 'win-probability-low', label: 'Win probability too low' },
  { code: 'capacity-conflict', label: 'Capacity conflict' },
  { code: 'other', label: 'Other' },
];

export const reasonLabel = (code: string) => NO_BID_REASONS.find((r) => r.code === code)?.label ?? code;

export const AGAINST_MAJORITY_TEXT = 'Approval differs from majority';
export const STALE_ACK_LABEL = 'I have seen that the pack is stale';
export const STALE_WARNING = 'Pack is stale: re-run and issue it first (or approve with a reason)';
export const DECISION_LABEL: Record<Dg2Choice, string> = { bid: 'Bid', 'no-bid': 'No-Bid' };

export const BID_EFFECTS = ['Decision recorded. Planning and Commercial have been asked to start baselines.', 'Stage moves to Planning'];
export const LETTER_EFFECT = 'Decline letter drafted: the Bid Manager reviews and sends it';
export const NO_BID_EFFECTS = ['Lessons captured', 'Tender closed: No-Bid'];

// ---------------------------------------------------------------------------

export interface DecisionState {
  tenant: string;
  tenderId: string;
  enabled: boolean;
  disabledReason?: string;
  /** Present when the pack is stale: approval needs this acknowledgement. */
  staleAck?: { required: true; label: string; warning: string; reason: string };
  /** DG2 clock: from the first issue of the pack. */
  slaStart?: string;
  slaDue?: string;
  /** "4 h 10 m left", "Late by 2 h", or the decision time once decided. */
  slaText: string;
  breached: boolean;
  /** When breached with no decision: the escalation, as audit text. */
  escalation?: AuditDraft;
  positions: PositionsVM;
  /** The version with the committee. */
  packVersion: number | null;
  round: number;
  decision: Dg2Decision | null;
  /** A No-Bid drafts a decline letter: the tender came from a public portal, or people were invited. */
  letterNeeded: boolean;
}

export function decisionState(tenant: string, tenderId: string, done: Done): DecisionState {
  const positions = positionsFor(tenant, tenderId, done);
  const decision = activeDecision(done, tenderId);
  const pv = packVersionsFor(tenant, tenderId, done);
  const fresh = freshnessFor(tenant, tenderId, done);
  const d = isGccTenantKey(tenant) ? gccData(tenant) : null;
  const t = d?.register.find((x) => x.id === tenderId);
  const source = d?.sources.find((s) => s.id === t?.sourceId);
  const letterNeeded = source?.kind === 'portal' || (t?.invited.length ?? 0) > 0;

  const slaStart = pv.firstIssuedAt;
  const slaDue = slaStart ? addHours(slaStart, GATE_SLA_HOURS.DG2) : undefined;
  const left = slaDue ? minutesBetween(nowIso(), slaDue) : 0;
  const breached = !!slaDue && !decision && left < 0;
  const slaText = decision
    ? `Decided ${stampText(decision.at)}${slaDue && decision.at > slaDue ? ', after the SLA' : ''}`
    : !slaDue ? 'Pack not issued'
    : left < 0 ? `Late by ${durationText(-left)}` : `${durationText(left)} left`;

  let escalation: AuditDraft | undefined;
  if (breached) {
    const hot = firstWithRole(tenant, 'hot');
    const ceo = committeeOf(tenant).find((p) => p.seat === 'ceo');
    escalation = {
      actorId: 'agent.sla', action: 'DG2 SLA breached: escalated', target: tenderId,
      detail: `Late by ${durationText(-left)}. Escalated to ${[hot, ceo].filter(Boolean).map((p) => `${p!.name}, ${p!.title}`).join(', and ')}`,
    };
  }

  // The committee reads the issued version: a re-run that isn't issued yet leaves them on the stale one.
  const behind = pv.issued && pv.current && pv.issued.version < pv.current.version;
  const staleReason = behind
    ? `Pack v${pv.current!.version} was re-run but not issued: the committee still has v${pv.issued!.version}`
    : fresh?.stale?.reason;

  const disabledReason = decision ? 'Decision already recorded'
    : !pv.issued ? 'Pack not issued to the committee yet'
    : !positions.quorum.met ? `Quorum needs ${positions.quorum.needed} of ${positions.quorum.of} positions: ${positions.recorded} recorded`
    : undefined;

  return {
    tenant, tenderId,
    enabled: !disabledReason,
    ...(disabledReason ? { disabledReason } : {}),
    ...(staleReason && !decision ? { staleAck: { required: true as const, label: STALE_ACK_LABEL, warning: STALE_WARNING, reason: staleReason } } : {}),
    ...(slaStart ? { slaStart } : {}),
    ...(slaDue ? { slaDue } : {}),
    slaText, breached,
    ...(escalation ? { escalation } : {}),
    positions,
    packVersion: pv.issued?.version ?? null,
    round: roundOf(done, tenderId),
    decision,
    letterNeeded,
  };
}

// ---------------------------------------------------------------------------

export interface Dg2Input {
  tenderId: string;
  decision: Dg2Choice;
  /** Required when the approval differs from the majority. */
  reason?: string;
  /** No-Bid: one or more of `NO_BID_REASONS`. */
  reasonCodes?: string[];
  /** Bid: the approver's own conditions, added to the members'. */
  conditions?: string[];
  staleAcknowledged?: boolean;
  lessons?: string;
}

export interface Dg2WriteResult { writes: Write[]; audit: AuditDraft[]; effects: string[]; decision: Dg2Decision }

export function dg2Write(input: Dg2Input, byId: string, state: DecisionState): Dg2WriteResult | WriteError {
  if (input.tenderId !== state.tenderId) return { error: 'This decision is for a different tender' };
  if (!state.enabled) return { error: state.disabledReason ?? 'DG2 cannot be recorded yet' };
  if (state.staleAck && !input.staleAcknowledged) return { error: `Tick "${STALE_ACK_LABEL}" to decide on this pack` };

  const { majority } = state.positions;
  const againstMajority = majority.result !== 'none' && majority.result !== input.decision;
  const reason = input.reason?.trim();
  if (againstMajority && !reason) return { error: `Give a reason: this approval differs from the majority of positions (${majority.for} for, ${majority.against} against)` };

  const reasonCodes = input.decision === 'no-bid' ? uniqStr(input.reasonCodes ?? []) : [];
  if (input.decision === 'no-bid') {
    if (!reasonCodes.length) return { error: 'Pick at least one No-Bid reason' };
    const unknown = reasonCodes.filter((c) => !NO_BID_REASONS.some((r) => r.code === c));
    if (unknown.length) return { error: `Unknown No-Bid reason: ${unknown.join(', ')}` };
  }

  const memberConditions = splitConditions(state.positions.seats.flatMap((s) => (s.position?.stance === 'conditions' ? s.position.conditions ?? [] : [])));
  const ownConditions = (input.conditions ?? []).map((c) => c.trim()).filter(Boolean);
  const conditions = input.decision === 'bid' ? uniqStr([...memberConditions, ...ownConditions]) : [];
  const at = nowIso();
  const lessons = input.decision === 'no-bid'
    ? input.lessons?.trim() || `No-Bid at DG2: ${reasonCodes.map(reasonLabel).join(', ')}`
    : undefined;

  const decision: Dg2Decision = {
    tenderId: input.tenderId,
    decision: input.decision,
    at, byId,
    againstMajority,
    ...(reason ? { reason } : {}),
    ...(reasonCodes.length ? { reasonCodes } : {}),
    conditions,
    packVersion: state.packVersion ?? 1,
    positionsSnapshot: state.positions.seats.map((s) => ({
      seat: s.seat, personId: s.personId,
      ...(s.position ? {
        stance: s.position.stance, at: s.position.at, packVersion: s.position.packVersion,
        ...(s.position.comment ? { comment: s.position.comment } : {}),
        ...(s.position.conditions ? { conditions: s.position.conditions } : {}),
      } : {}),
    })),
    majority,
    ...(lessons ? { lessons } : {}),
    ...(state.staleAck ? { staleAcknowledged: true } : {}),
    round: state.round,
  };

  const writes: Write[] = [{ key: `dg2:${input.tenderId}`, value: JSON.stringify(decision) }];
  const who = personById(byId)?.name ?? byId;
  const audit: AuditDraft[] = [{
    actorId: byId,
    action: input.decision === 'bid' ? 'DG2 approved: Bid' : 'DG2 recorded: No-Bid',
    target: input.tenderId,
    detail: [
      `${who} on pack v${decision.packVersion}`,
      `${majority.for} for, ${majority.against} against, ${majority.abstain} abstaining`,
      againstMajority ? `${AGAINST_MAJORITY_TEXT}: ${reason}` : '',
      conditions.length ? `Conditions: ${conditions.join('; ')}` : '',
      reasonCodes.length ? `Reasons: ${reasonCodes.map(reasonLabel).join(', ')}` : '',
      state.staleAck ? 'Decided on a stale pack, acknowledged' : '',
    ].filter(Boolean).join(' · '),
  }];

  let effects: string[];
  if (input.decision === 'bid') {
    effects = BID_EFFECTS;
  } else {
    effects = [...NO_BID_EFFECTS];
    const letter = state.letterNeeded ? declineLetter(state.tenant, input.tenderId, byId) : null;
    if (letter) {
      const w = letterWrite(input.tenderId, letter.text, false, letter.signatoryId);
      writes.push({ key: w.key, value: w.value });
      audit.push({ ...w.audit, actorId: byId });
      effects = [LETTER_EFFECT, ...effects];
    }
  }
  return { writes, audit, effects, decision };
}

function uniqStr(xs: string[]): string[] {
  return [...new Set(xs)];
}

// ---------------------------------------------------------------------------

export type Dg2Overlay = { stage: 'S4'; since: string } | { stage: 'closed'; since: string; reason: string } | null;

/** Where a DG2 decision moves the tender, for plan 009b to overlay on the data port. */
export function dg2Overlay(tenant: string, tenderId: string, done: Done): Dg2Overlay {
  if (!isGccTenantKey(tenant)) return null;
  const d = activeDecision(done, tenderId);
  if (!d) return null;
  if (d.decision === 'bid') return { stage: 'S4', since: d.at };
  return { stage: 'closed', since: d.at, reason: `No-Bid at DG2: ${(d.reasonCodes ?? []).map(reasonLabel).join(', ')}` };
}
