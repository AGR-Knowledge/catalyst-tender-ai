import { gccData, isGccTenantKey } from '@/data/gcc';
import { personById, SEAT_LABEL, type Seat } from '@/data/people';
import { readDone, type Done } from '@/domain/gcc/s3/done';
import { packVersionsFor } from '@/domain/gcc/s3/versions';
import { activeDecision, letterKey, roundOf, type Dg2Decision, type LetterValue } from './keys';
import { positionsFor, STANCE_LABEL, SECRETARY_TEXT } from './positions';
import { conditionText, conditionsFor, type ConditionViewer, type ConditionVM } from './conditions';
import { AGAINST_MAJORITY_TEXT, DECISION_LABEL, reasonLabel } from './decision';
import { reopenState, triggerLabel } from './reopen';

/**
 * The DG2 record (spec §10 "Record written"): each position with its comment
 * and time, conflicts declared, the decision with its reason, the pack
 * version and snapshot reference, the conditions, and the re-open history.
 * Conditions and the decline letter belong to a decision round, so a re-open
 * leaves the earlier round's with its entry in `reopens`.
 */

export interface DecisionRecordVM {
  decision: Dg2Decision['decision'];
  label: string;
  at: string;
  byId: string;
  byName: string;
  againstMajority: boolean;
  /** "Approval differs from majority", when it did. */
  differsText?: string;
  reason?: string;
  reasons: string[];
  conditions: string[];
  lessons?: string;
  staleAcknowledged: boolean;
  packVersion: number;
  /** Null when the viewer may not see committee positions. */
  majority: Dg2Decision['majority'] | null;
}

export interface Dg2RecordVM {
  tenderId: string;
  title: string;
  positions: {
    seat: Seat; seatLabel: string; name: string; stance: string; comment?: string; conditions?: string[];
    at: string; packVersion: number; recordedBy?: string; note?: string; beforeReopen: boolean;
  }[];
  conflicts: { seat: Seat; name: string; text: string; at: string }[];
  decision: DecisionRecordVM | null;
  pack: { version: number; generatedAt?: string; issuedAt?: string; snapshotRef: string } | null;
  conditions: ConditionVM[];
  /** Every re-open, oldest first: the decision it took out of force, why, and that round's letter. */
  reopens: { decision: DecisionRecordVM; reason: string; trigger: string; requestedBy: string; requestedAt: string; by: string; at: string; letter?: LetterValue }[];
  previous: DecisionRecordVM | null;
  reopenText?: string;
  lastReopen?: { at: string; by: string; requestedBy: string; reason: string; trigger: string };
  letter?: LetterValue;
}

const nameOf = (id: string) => personById(id)?.name ?? id;

function decisionVM(d: Dg2Decision, viewer?: ConditionViewer): DecisionRecordVM {
  return {
    decision: d.decision, label: DECISION_LABEL[d.decision], at: d.at, byId: d.byId, byName: nameOf(d.byId),
    againstMajority: viewer?.canSeePositions === false ? false : d.againstMajority,
    ...(d.againstMajority && viewer?.canSeePositions !== false ? { differsText: AGAINST_MAJORITY_TEXT } : {}),
    ...(d.reason ? { reason: d.reason } : {}),
    reasons: (d.reasonCodes ?? []).map(reasonLabel),
    conditions: d.conditions.map((c) => conditionText(c, !!d.marginConditions?.includes(c), viewer)),
    ...(d.lessons ? { lessons: d.lessons } : {}),
    staleAcknowledged: !!d.staleAcknowledged,
    packVersion: d.packVersion,
    majority: viewer?.canSeePositions === false ? null : d.majority,
  };
}

/** `viewer`: without `see.margin`, a condition that states a margin figure reads masked (plan 021 4.6). */
export function dg2RecordFor(tenant: string, tenderId: string, done: Done, viewer?: ConditionViewer): Dg2RecordVM | null {
  if (!isGccTenantKey(tenant)) return null;
  const t = gccData(tenant).register.find((x) => x.id === tenderId);
  if (!t) return null;
  const pos = positionsFor(tenant, tenderId, done);
  const active = activeDecision(done, tenderId);
  const pv = packVersionsFor(tenant, tenderId, done);
  const re = reopenState(tenant, tenderId, done);
  const packVersion = active?.packVersion ?? pv.issued?.version ?? pv.current?.version;
  const version = pv.versions.find((v) => v.version === packVersion);
  const letter = readDone<LetterValue>(done, letterKey(tenderId, roundOf(done, tenderId)));

  const hidePositions = viewer?.canSeePositions === false;
  const maskComment = (p: { comment?: string; marginConditions?: string[] }) => !!p.marginConditions?.length && !!viewer && !viewer.canSeeMargin;
  return {
    tenderId,
    title: t.title,
    positions: hidePositions ? [] : pos.seats.flatMap((s) => (s.position ? [{
      seat: s.seat, seatLabel: s.seat === 'sector' ? s.label : SEAT_LABEL[s.seat], name: s.name,
      stance: STANCE_LABEL[s.position.stance],
      ...(s.position.comment ? { comment: maskComment(s.position) ? 'Comment masked for your role (it refers to a margin condition)' : s.position.comment } : {}),
      ...(s.position.conditions ? { conditions: s.position.conditions.map((c) => conditionText(c, !!s.position!.marginConditions?.includes(c), viewer)) } : {}),
      at: s.position.at, packVersion: s.position.packVersion,
      ...(s.position.recordedById ? { recordedBy: nameOf(s.position.recordedById), note: SECRETARY_TEXT } : {}),
      beforeReopen: s.position.beforeReopen,
    }] : [])),
    conflicts: hidePositions ? [] : pos.seats.flatMap((s) => (s.position?.coi ? [{ seat: s.seat, name: s.name, text: s.position.coi.text, at: s.position.at }] : [])),
    decision: active ? decisionVM(active, viewer) : null,
    pack: packVersion !== undefined ? {
      version: packVersion,
      ...(version?.generatedAt ? { generatedAt: version.generatedAt } : {}),
      ...(version?.issuedAt ? { issuedAt: version.issuedAt } : {}),
      snapshotRef: `${tenderId}/pack/v${packVersion}`,
    } : null,
    conditions: conditionsFor(tenant, tenderId, done, viewer),
    reopens: re.previous.map((e) => {
      const old = readDone<LetterValue>(done, letterKey(tenderId, e.decision.round ?? 1));
      return {
        decision: decisionVM(e.decision, viewer), reason: e.reason, trigger: triggerLabel(e.trigger),
        requestedBy: nameOf(e.requestedById), requestedAt: e.requestedAt, by: nameOf(e.byId), at: e.at,
        ...(old ? { letter: old } : {}),
      };
    }),
    previous: re.previous.length ? decisionVM(re.previous[re.previous.length - 1].decision, viewer) : null,
    ...(re.text ? { reopenText: re.text } : {}),
    ...(re.last ? { lastReopen: { at: re.last.at, by: nameOf(re.last.byId), requestedBy: nameOf(re.last.requestedById), reason: re.last.reason, trigger: triggerLabel(re.last.trigger) } } : {}),
    ...(letter ? { letter } : {}),
  };
}
