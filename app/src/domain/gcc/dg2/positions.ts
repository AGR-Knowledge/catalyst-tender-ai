import { committeeOf, SEAT_LABEL, SEATS, type Seat } from '@/data/people';
import { SEEDED_POSITIONS, type Stance } from '@/data/gcc/s3';
import { DG2_QUORUM, DG2_SEATS } from '@/data/gcc/targets';
import { nowIso, readDone, type Done, type WriteError, type WriteResult } from '@/domain/gcc/s3/done';
import { packVersionsFor } from '@/domain/gcc/s3/versions';
import { posKey, roundOf, type Dg2PositionValue, type Majority } from './keys';

/**
 * DG2 positions (spec §10, dashboards.md §9). The five voting seats record a
 * named position; the seeded ones are overridden by `dg2-pos:` keys. Quorum
 * is 3 of 5 positions recorded, abstentions included. The majority counts
 * Support and Support with conditions for, Oppose against; a tie, or nothing
 * but abstentions, is no majority.
 */

export const STANCE_LABEL: Record<Stance, string> = {
  support: 'Support', conditions: 'Support with conditions', oppose: 'Oppose', abstain: 'Abstain',
};

export const SECRETARY_TEXT = 'Recorded by the secretary in the meeting';

export interface PositionVM {
  stance: Stance;
  stanceLabel: string;
  comment?: string;
  conditions?: string[];
  coi?: { declared: true; text: string };
  at: string;
  byId: string;
  packVersion: number;
  /** Recorded on a pack version older than the one now with the committee. */
  onOlderVersion: boolean;
  /** "on v1", when `onOlderVersion`. */
  versionText?: string;
  bySecretary: boolean;
  recordedById?: string;
  secretaryText?: string;
  round: number;
  /** Recorded before the decision was re-opened: kept, and shown as such. */
  beforeReopen: boolean;
}

export interface SeatVM { seat: Seat; personId: string; name: string; label: string; position?: PositionVM }

export interface PositionsVM {
  tenderId: string;
  seats: SeatVM[];
  recorded: number;
  quorum: { needed: number; of: number; met: boolean; text: string; short: string };
  majority: Majority;
  onOlderVersion: Seat[];
  /** The pack version with the committee, or null before issue. */
  issuedVersion: number | null;
  round: number;
}

export function majorityOf(stances: Stance[]): Majority {
  const pro = stances.filter((s) => s === 'support' || s === 'conditions').length;
  const against = stances.filter((s) => s === 'oppose').length;
  const abstain = stances.filter((s) => s === 'abstain').length;
  return { for: pro, against, abstain, result: pro > against ? 'bid' : against > pro ? 'no-bid' : 'none' };
}

export const quorumText = (recorded: number, met: boolean) =>
  met ? `${recorded} of ${DG2_SEATS} positions · quorum met` : `${recorded} of ${DG2_SEATS} positions · quorum needs ${DG2_QUORUM}`;
export const quorumShort = (recorded: number, met: boolean) =>
  met ? `${recorded} of ${DG2_SEATS} · quorum met` : `${recorded} of ${DG2_SEATS} · quorum needs ${DG2_QUORUM}`;

export function positionsFor(tenant: string, tenderId: string, done: Done): PositionsVM {
  const committee = committeeOf(tenant);
  const round = roundOf(done, tenderId);
  const issuedVersion = packVersionsFor(tenant, tenderId, done).issued?.version ?? null;

  const seats = SEATS.map((seat): SeatVM => {
    const person = committee.find((p) => p.seat === seat);
    const label = seat === 'sector' && person ? person.title : SEAT_LABEL[seat];
    const saved = readDone<Dg2PositionValue>(done, posKey(tenderId, seat));
    const seed = SEEDED_POSITIONS.find((p) => p.tenant === tenant && p.tenderId === tenderId && p.seat === seat);
    const raw: Dg2PositionValue | null = saved ?? (seed ? {
      stance: seed.stance, ...(seed.comment ? { comment: seed.comment } : {}), ...(seed.conditions ? { conditions: seed.conditions } : {}),
      packVersion: 1, round: 1, at: seed.at, byId: seed.byId,
    } : null);
    const base = { seat, personId: person?.id ?? '', name: person?.name ?? SEAT_LABEL[seat], label };
    if (!raw) return base;
    const onOlder = issuedVersion !== null && raw.packVersion < issuedVersion;
    const posRound = raw.round ?? 1;
    return {
      ...base,
      position: {
        stance: raw.stance, stanceLabel: STANCE_LABEL[raw.stance],
        ...(raw.comment ? { comment: raw.comment } : {}),
        ...(raw.conditions?.length ? { conditions: raw.conditions } : {}),
        ...(raw.coi ? { coi: raw.coi } : {}),
        at: raw.at, byId: raw.byId, packVersion: raw.packVersion,
        onOlderVersion: onOlder, ...(onOlder ? { versionText: `on v${raw.packVersion}` } : {}),
        bySecretary: !!raw.recordedById, ...(raw.recordedById ? { recordedById: raw.recordedById, secretaryText: SECRETARY_TEXT } : {}),
        round: posRound, beforeReopen: posRound < round,
      },
    };
  });

  const stances = seats.flatMap((s) => (s.position ? [s.position.stance] : []));
  const recorded = stances.length;
  const met = recorded >= DG2_QUORUM;
  return {
    tenderId, seats, recorded,
    quorum: { needed: DG2_QUORUM, of: DG2_SEATS, met, text: quorumText(recorded, met), short: quorumShort(recorded, met) },
    majority: majorityOf(stances),
    onOlderVersion: seats.filter((s) => s.position?.onOlderVersion).map((s) => s.seat),
    issuedVersion,
    round,
  };
}

// ---------------------------------------------------------------------------

export interface PositionInput {
  stance: Stance;
  comment?: string;
  conditions?: string[];
  /** A declared conflict of interest: the position becomes Abstain. */
  coi?: { text: string };
  /** The pack version the member read (`PositionsVM.issuedVersion`). */
  packVersion: number;
  /** `PositionsVM.round`. */
  round?: number;
}

/** Record a member's position. `recordedById` is the Head of Tendering, recording it as secretary in a meeting. */
export function positionWrite(tenderId: string, seat: Seat, input: PositionInput, byId: string, recordedById?: string): WriteResult | WriteError {
  const coiText = input.coi?.text.trim();
  if (input.coi && !coiText) return { error: 'Describe the conflict of interest so it can be recorded' };
  const stance: Stance = input.coi ? 'abstain' : input.stance;
  const comment = input.comment?.trim() || coiText || '';
  if (stance !== 'support' && !comment) return { error: 'Add a comment: it is needed for any position other than Support' };
  const conditions = (input.conditions ?? []).map((c) => c.trim()).filter(Boolean);
  if (stance === 'conditions' && !conditions.length) return { error: 'Add at least one condition for Support with conditions' };

  const value: Dg2PositionValue = {
    stance,
    ...(comment ? { comment } : {}),
    ...(stance === 'conditions' ? { conditions } : {}),
    ...(input.coi ? { coi: { declared: true as const, text: coiText! } } : {}),
    packVersion: input.packVersion,
    round: input.round ?? 1,
    ...(recordedById ? { recordedById } : {}),
    at: nowIso(),
    byId,
  };
  const who = SEAT_LABEL[seat];
  const detail = [
    `${who}: ${STANCE_LABEL[stance]}${comment ? `. ${comment}` : ''}`,
    input.coi ? 'Conflict of interest declared' : '',
    recordedById ? SECRETARY_TEXT : '',
    `Pack v${input.packVersion}`,
  ].filter(Boolean).join(' · ');
  return {
    key: posKey(tenderId, seat),
    value: JSON.stringify(value),
    audit: { actorId: recordedById ?? byId, action: input.coi ? 'DG2 conflict of interest declared' : 'DG2 position recorded', target: tenderId, detail },
  };
}
