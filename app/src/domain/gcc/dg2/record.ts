import { gccData, isGccTenantKey } from '@/data/gcc';
import { personById, SEAT_LABEL, type Seat } from '@/data/people';
import { readDone, type Done } from '@/domain/gcc/s3/done';
import { packVersionsFor } from '@/domain/gcc/s3/versions';
import { activeDecision, type Dg2Decision, type LetterValue } from './keys';
import { positionsFor, STANCE_LABEL, SECRETARY_TEXT } from './positions';
import { conditionsFor, type ConditionVM } from './conditions';
import { AGAINST_MAJORITY_TEXT, DECISION_LABEL, reasonLabel } from './decision';
import { reopenState, triggerLabel } from './reopen';

/**
 * The DG2 record (spec §10 "Record written"): each position with its comment
 * and time, conflicts declared, the decision with its reason, the pack
 * version and snapshot reference, the conditions, and the re-open history.
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
  majority: Dg2Decision['majority'];
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
  reopens: { decision: DecisionRecordVM }[];
  previous: DecisionRecordVM | null;
  reopenText?: string;
  lastReopen?: { at: string; by: string; requestedBy: string; reason: string; trigger: string };
  letter?: LetterValue;
}

const nameOf = (id: string) => personById(id)?.name ?? id;

function decisionVM(d: Dg2Decision): DecisionRecordVM {
  return {
    decision: d.decision, label: DECISION_LABEL[d.decision], at: d.at, byId: d.byId, byName: nameOf(d.byId),
    againstMajority: d.againstMajority,
    ...(d.againstMajority ? { differsText: AGAINST_MAJORITY_TEXT } : {}),
    ...(d.reason ? { reason: d.reason } : {}),
    reasons: (d.reasonCodes ?? []).map(reasonLabel),
    conditions: d.conditions,
    ...(d.lessons ? { lessons: d.lessons } : {}),
    staleAcknowledged: !!d.staleAcknowledged,
    packVersion: d.packVersion,
    majority: d.majority,
  };
}

export function dg2RecordFor(tenant: string, tenderId: string, done: Done): Dg2RecordVM | null {
  if (!isGccTenantKey(tenant)) return null;
  const t = gccData(tenant).register.find((x) => x.id === tenderId);
  if (!t) return null;
  const pos = positionsFor(tenant, tenderId, done);
  const active = activeDecision(done, tenderId);
  const pv = packVersionsFor(tenant, tenderId, done);
  const re = reopenState(tenant, tenderId, done);
  const packVersion = active?.packVersion ?? pv.issued?.version ?? pv.current?.version;
  const version = pv.versions.find((v) => v.version === packVersion);
  const letter = readDone<LetterValue>(done, `dg2-letter:${tenderId}`);

  return {
    tenderId,
    title: t.title,
    positions: pos.seats.flatMap((s) => (s.position ? [{
      seat: s.seat, seatLabel: s.seat === 'sector' ? s.label : SEAT_LABEL[s.seat], name: s.name,
      stance: STANCE_LABEL[s.position.stance],
      ...(s.position.comment ? { comment: s.position.comment } : {}),
      ...(s.position.conditions ? { conditions: s.position.conditions } : {}),
      at: s.position.at, packVersion: s.position.packVersion,
      ...(s.position.recordedById ? { recordedBy: nameOf(s.position.recordedById), note: SECRETARY_TEXT } : {}),
      beforeReopen: s.position.beforeReopen,
    }] : [])),
    conflicts: pos.seats.flatMap((s) => (s.position?.coi ? [{ seat: s.seat, name: s.name, text: s.position.coi.text, at: s.position.at }] : [])),
    decision: active ? decisionVM(active) : null,
    pack: packVersion !== undefined ? {
      version: packVersion,
      ...(version?.generatedAt ? { generatedAt: version.generatedAt } : {}),
      ...(version?.issuedAt ? { issuedAt: version.issuedAt } : {}),
      snapshotRef: `${tenderId}/pack/v${packVersion}`,
    } : null,
    conditions: conditionsFor(tenant, tenderId, done),
    reopens: re.previous.map((d) => ({ decision: decisionVM(d) })),
    previous: re.previous.length ? decisionVM(re.previous[re.previous.length - 1]) : null,
    ...(re.text ? { reopenText: re.text } : {}),
    ...(re.last ? { lastReopen: { at: re.last.at, by: nameOf(re.last.byId), requestedBy: nameOf(re.last.requestedById), reason: re.last.reason, trigger: triggerLabel(re.last.trigger) } } : {}),
    ...(letter ? { letter } : {}),
  };
}
