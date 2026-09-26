import { peopleOf, personById } from '@/data/people';
import { addDays } from '@/domain/calendar';
import { addHours } from '@/domain/gcc/clock';
import { DONE_KEY, json, nowIso, type AuditDraft, type Done, type DoneWrite } from '@/domain/gcc/s1/done';
import { addWorkingDays, authorityCalendar, dataOf, keyDate, listText, plural, profileOf, shortWhen, tenderOf } from '@/domain/gcc/s1/common';
import type { Verdict } from '@/domain/gcc/s1/fit';
import type { Dg1Pack } from './pack';
import { dg1RecordFor, DG1_SLA_HOURS, type AnyDg1, type Dg1HoldValue, type Dg1ReopenValue } from './record';

/**
 * DG1: Pursue or Discard (spec §7, plan 007a step 9.3). The record keeps who,
 * when, the recommendation at that moment, what was shown, and why. Hold asks
 * a person for information; the SLA keeps running.
 */

export interface Dg1Team { proc: string; plan: string; comm: string; comp: string; dir: string }

export interface Dg1Milestone { key: 'rfqs' | 'quotes' | 'pack' | 'dg2' | 'dg3' | 'submission'; label: string; date: string; time?: string; proposed: true }

/** `dg1:{TID}`. Pursue or Discard only: Hold is `dg1-hold:{TID}`. Plan 008a reads `at` as the start of the RFQ clock. */
export interface Dg1Decision {
  tenderId: string;
  decision: 'pursue' | 'discard';
  at: string;
  byId: string;
  /** Recorded by someone other than the assigned Bid Manager (the Head of Tendering as delegate). */
  delegate: boolean;
  recommendation: Verdict;
  verdictLabel: string;
  reasonCodes: string[];
  note?: string;
  team?: Dg1Team;
  strategy?: { kind: 'prime' | 'jv'; partnerId?: string; shares?: [number, number] };
  milestones?: Dg1Milestone[];
  /**
   * What the pack showed. `validationsOpen` counts the fields still blocking
   * DG1: 0, except for a PQ-fail discard recorded while they were open.
   */
  snapshot: { weighted: number; eligibilityText: string | null; bond: string; validationsOpen: number };
}

// ---------------------------------------------------------------------------
// Reason codes (step 9.3.2). Keys follow plan 004's DG1 history.

export interface ReasonCode { code: string; label: string }

export const DISCARD_REASONS: ReasonCode[] = [
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

/** Codes the seed history also uses: 'pq-fail' (no sub-reason), and the override and hold reasons. */
const HISTORY_REASONS: ReasonCode[] = [
  { code: 'pq-fail', label: 'PQ fail' },
  { code: 'client-relationship', label: 'Client relationship' },
  { code: 'information-requested', label: 'Information requested' },
];

export const reasonLabel = (code: string) => [...DISCARD_REASONS, ...HISTORY_REASONS].find((r) => r.code === code)?.label ?? code;

/**
 * The code a reason counts under in roll-ups (DEC-10, plan 017's targets): the
 * four PQ sub-codes are one "PQ fail", as the seed history records it.
 */
export const rollupReason = (code: string) => (code.startsWith('pq-fail-') ? 'pq-fail' : code);

// ---------------------------------------------------------------------------
// Input and validation (step 9.3.3)

export interface Dg1Input {
  tenderId: string;
  decision: 'pursue' | 'discard' | 'hold';
  reasonCodes?: string[];
  note?: string;
  team?: Dg1Team;
  strategy?: Dg1Decision['strategy'];
  milestones?: Dg1Milestone[];
  /** Hold: who is asked, for what, by when (tenant-local date-time). */
  request?: { toId: string; what: string; due: string };
  at?: string;
}

export function validateDg1(input: Dg1Input, pack: Dg1Pack): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const note = input.note?.trim();
  // Hold is how the missing fields are asked for; a PQ-fail discard can't be changed by them.
  const lockApplies = input.decision === 'pursue' || (input.decision === 'discard' && !pack.locked?.discardAllowed);
  if (pack.locked && lockApplies) errors.push(`${pack.locked.reason}. DG1 can be recorded once they are resolved.`);
  if (input.decision === 'discard' && !input.reasonCodes?.length) errors.push('Choose at least one reason for Discard.');
  const unknown = (input.reasonCodes ?? []).filter((c) => !DISCARD_REASONS.some((r) => r.code === c) && !HISTORY_REASONS.some((r) => r.code === c));
  if (unknown.length) errors.push(`Unknown reason code: ${unknown.join(', ')}.`);
  const overridesDiscard = input.decision === 'pursue' && pack.recommendation.verdict === 'discard';
  if (overridesDiscard && !note) errors.push('Add a note: Pursue overrides a Recommend discard.');
  if (input.decision === 'pursue' && input.strategy?.kind === 'jv') {
    if (!input.strategy.partnerId) errors.push('Name the JV partner.');
    else if (!dataOf(pack.tenant).partners.some((p) => p.id === input.strategy!.partnerId)) errors.push(`No partner "${input.strategy.partnerId}" on the partner list.`);
  }
  // The recommendation needs a JV: bidding alone fails the PQ. A prime bid needs the reason on record.
  const elig = pack.eligibility?.result;
  if (input.decision === 'pursue' && elig?.verdict === 'eligible-with-jv' && input.strategy?.kind !== 'jv' && !note && !overridesDiscard) {
    errors.push(`Record the JV with ${elig.jvPartner?.name ?? 'the partner'} as the submission strategy, or add a note on why the company bids alone (it fails ${plural(elig.counts.fail, 'PQ line')} on its own).`);
  }
  if (input.decision === 'hold' && (!input.request?.toId || !input.request.what?.trim() || !input.request.due)) {
    errors.push('Say who is asked, for what, and by when.');
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Team and milestones (steps 9.3.4, 9.3.5)

/** The tenant's Procurement, Planning, Commercial, Compliance and Project Director people. */
export function defaultTeam(tenant: string): Dg1Team {
  const of = (role: string) => peopleOf(tenant).find((p) => p.role === role)?.id ?? '';
  return { proc: of('proc'), plan: of('plan'), comm: of('comm'), comp: of('comp'), dir: of('dir') };
}

/** The internal bid calendar proposed on Pursue, each labelled "proposed" for people to change. */
export function proposedMilestones(tenant: string, tenderId: string, pursuedAt: string): Dg1Milestone[] {
  const t = tenderOf(tenant, tenderId);
  const sub = t ? keyDate(t, 'submission') : undefined;
  if (!t || !sub) return [];
  const { cc } = authorityCalendar(t, tenant);
  const own = profileOf(tenant).countryCode;
  const rfqs = addHours(pursuedAt, 24);
  const quotes = addWorkingDays(rfqs.slice(0, 10), 10, own);
  const pack = addWorkingDays(sub.date, -25, cc);
  const at = (iso: string) => ({ date: iso.slice(0, 10), ...(iso.length > 10 ? { time: iso.slice(11, 16) } : {}) });
  return [
    { key: 'rfqs', label: 'RFQs out', ...at(rfqs), proposed: true },
    { key: 'quotes', label: 'Quotes due', date: quotes, proposed: true },
    { key: 'pack', label: 'Bid / No-Bid pack issued', date: pack, proposed: true },
    { key: 'dg2', label: 'DG2 decision (pack + 24 h)', date: addDays(pack, 1), proposed: true },
    { key: 'dg3', label: 'DG3 approval', date: addWorkingDays(sub.date, -5, cc), proposed: true },
    { key: 'submission', label: 'Submission', date: sub.date, ...(sub.time ? { time: sub.time } : {}), proposed: true },
  ];
}

// ---------------------------------------------------------------------------
// Writes (step 9.3.6)

export interface Dg1Writes { writes: DoneWrite[]; audit: AuditDraft[]; effects: string[] }

const nameOf = (id: string) => personById(id)?.name ?? id;

/** Build the record, audit and effects of a DG1 action. Call `validateDg1` first: an invalid input throws. */
export function dg1Write(input: Dg1Input, byId: string, pack: Dg1Pack): Dg1Writes {
  const v = validateDg1(input, pack);
  if (!v.ok) throw new Error(v.errors.join(' '));
  const t = tenderOf(pack.tenant, input.tenderId);
  const at = input.at ?? nowIso();
  const target = `${input.tenderId} · ${t?.shortTitle ?? input.tenderId}`;
  const rec = pack.recommendation;

  if (input.decision === 'hold') {
    const r = input.request!;
    const value: Dg1HoldValue = { request: r, at, byId };
    const due = t?.intake.loggedAt ? addHours(t.intake.loggedAt, DG1_SLA_HOURS) : undefined;
    return {
      writes: [{ key: DONE_KEY.dg1Hold(input.tenderId), value: json(value) }],
      audit: [{ action: 'DG1: Hold', target, detail: `Asked ${nameOf(r.toId)}: ${r.what}, due ${shortWhen(r.due)}. Recommendation: ${rec.recommendation}` }],
      effects: [
        `Request sent to ${nameOf(r.toId)}: ${r.what}, due ${shortWhen(r.due)}`,
        ...(due ? [`SLA keeps running: due ${shortWhen(due)}`] : []),
      ],
    };
  }

  const pursue = input.decision === 'pursue';
  const team = pursue ? input.team ?? defaultTeam(pack.tenant) : undefined;
  const milestones = pursue ? input.milestones ?? proposedMilestones(pack.tenant, input.tenderId, at) : undefined;
  const decision: Dg1Decision = {
    tenderId: input.tenderId, decision: input.decision, at, byId,
    delegate: !!t && byId !== t.bidManagerId,
    recommendation: rec.verdict, verdictLabel: rec.recommendation,
    reasonCodes: input.reasonCodes ?? [],
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(team ? { team } : {}),
    ...(pursue ? { strategy: input.strategy ?? { kind: 'prime' } } : {}),
    ...(milestones ? { milestones } : {}),
    snapshot: {
      weighted: pack.fit.result.weighted,
      eligibilityText: pack.eligibility?.result.text ?? null,
      bond: pack.bond?.bond.text ?? 'No bid bond stated',
      validationsOpen: pack.open.validations.filter((q) => q.item.blocksDg1).length,
    },
  };
  const override = pursue ? rec.verdict === 'discard' : rec.verdict !== 'discard';
  const by = nameOf(byId);
  const overrideText = override ? `Overridden by ${by} at ${shortWhen(at)}: the recommendation was ${rec.recommendation}` : undefined;

  const effects: string[] = [];
  if (pursue) {
    const names = team ? Object.values(team).filter(Boolean).map(nameOf) : [];
    effects.push('Stage moves to Sourcing');
    if (names.length) effects.push(`Team notified: ${listText(names)}`);
    effects.push(`RFQ clock started: all RFQs due by ${shortWhen(addHours(at, 24))}`);
    if (decision.strategy?.kind === 'jv' && decision.strategy.partnerId) {
      const partner = pack.eligibility?.result.jvPartner?.id === decision.strategy.partnerId ? pack.eligibility.result.jvPartner.name : decision.strategy.partnerId;
      effects.push(`Submission strategy: JV with ${partner}${decision.strategy.shares ? ` (${decision.strategy.shares[0]}/${decision.strategy.shares[1]})` : ''}`);
    }
  } else {
    effects.push(`Closed with reason: ${listText(decision.reasonCodes.map(reasonLabel))}. Stays searchable; can be re-opened with a reason.`);
  }
  if (overrideText) effects.push(overrideText);

  return {
    writes: [{ key: DONE_KEY.dg1(input.tenderId), value: json(decision) }],
    audit: [{
      action: pursue ? 'DG1: Pursue' : 'DG1: Discard', target,
      detail: [
        `Recommendation: ${rec.recommendation}`,
        decision.reasonCodes.length ? `reasons: ${decision.reasonCodes.map(reasonLabel).join(', ')}` : '',
        decision.note ? `note: ${decision.note}` : '',
        decision.delegate ? `recorded by ${by} as delegate` : '',
        override ? 'overrides the recommendation' : '',
        decision.snapshot.validationsOpen ? `${plural(decision.snapshot.validationsOpen, 'field')} still open, which cannot change a PQ fail` : '',
      ].filter(Boolean).join('; '),
    }],
    effects,
  };
}

/** Re-open a Pursue or Discard with a reason. It keeps the cleared decision on record. */
export function dg1Reopen(tenant: string, tenderId: string, reason: string, byId: string, done: Done, at = nowIso()): Dg1Writes {
  if (!reason.trim()) throw new Error('Give a reason to re-open DG1.');
  const s = dg1RecordFor(tenant, tenderId, done);
  const t = tenderOf(tenant, tenderId);
  const value: Dg1ReopenValue = { reason: reason.trim(), at, byId, ...(s.current ? { previous: s.current } : {}) };
  return {
    writes: [{ key: DONE_KEY.dg1Reopen(tenderId), value: json(value) }],
    audit: [{ action: 'DG1: Re-opened', target: `${tenderId} · ${t?.shortTitle ?? tenderId}`, detail: `${reason.trim()}${s.current ? `; ${s.current.decision} of ${shortWhen(s.current.at)} kept on record` : ''}` }],
    effects: ['Back in the DG1 queue', ...(s.current ? [`Previous decision kept on record: ${s.current.decision === 'pursue' ? 'Pursue' : 'Discard'}, ${shortWhen(s.current.at)}`] : [])],
  };
}

// ---------------------------------------------------------------------------
// Stage overlay (step 9.3.7): what the data port shows once DG1 is recorded in the demo

export type StageOverlay =
  | { stage: 'S2'; since: string }
  | { stage: 'closed'; since: string; reason: string }
  /** Re-opened back to Stage 1 (from any stage). */
  | { stage: 'S1'; since: string; reason: string }
  | null;

export function stageOverlay(tenant: string, tenderId: string, done: Done): StageOverlay {
  const s = dg1RecordFor(tenant, tenderId, done);
  if (s.current && s.source === 'demo') {
    const c = s.current as AnyDg1;
    return c.decision === 'pursue'
      ? { stage: 'S2', since: c.at }
      : { stage: 'closed', since: c.at, reason: listText(c.reasonCodes.map(reasonLabel)) };
  }
  if (!s.current && s.reopen) return { stage: 'S1', since: s.reopen.at, reason: s.reopen.reason };
  return null;
}
