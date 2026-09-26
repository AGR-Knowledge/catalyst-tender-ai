import { holdersOf } from '@/data/access';
import { personById, type Person } from '@/data/people';
import { dg2RecordFor, positionsFor, SECRETARY_TEXT, type PositionsVM } from '@/domain/gcc/dg2';
import type { PackViewer } from '@/domain/gcc/s3';
import type { MemberRow } from '@/components/tender/MembersPanel';

/**
 * The members panel's rows for one tender, as this viewer may see them:
 * positions and comments from `dg2RecordFor` (which masks margin conditions
 * and comments), seats and people from `positionsFor`. Without sight of
 * positions there are no rows at all, only "With the committee".
 */
export interface MembersVM {
  rows: MemberRow[];
  headline?: string;
  quorum?: { recorded: number; needed: number; of: number; met: boolean };
  majority?: string;
  masked?: { by: string };
  positions: PositionsVM;
}

export function membersFor(tenant: string, tenderId: string, done: Record<string, string>, viewer: Person, sight: PackViewer): MembersVM {
  const positions = positionsFor(tenant, tenderId, done);
  if (!sight.canSeePositions) return { rows: [], masked: { by: holdersOf('see.positions') }, positions };
  const record = dg2RecordFor(tenant, tenderId, done, sight);
  const rows = positions.seats.map((s): MemberRow => {
    const p = personById(s.personId);
    const base = { seat: s.seat, name: s.name, initials: p?.initials ?? '', seatLabel: p?.title ?? s.label, me: viewer.seat === s.seat };
    const pos = s.position;
    if (!pos) return { ...base, stance: 'none', stanceLabel: 'Not yet recorded' };
    const seen = record?.positions.find((x) => x.seat === s.seat);
    const raw = pos.conditions ?? [];
    const conditions = (seen?.conditions ?? []).map((text, i) => ({
      text, margin: !!pos.marginConditions?.includes(raw[i]), masked: text !== raw[i],
    }));
    const flags = [
      ...(pos.onOlderVersion && pos.versionText ? [`Recorded ${pos.versionText}`] : []),
      ...(pos.beforeReopen ? ['Before the re-open'] : []),
    ];
    return {
      ...base,
      stance: pos.coi ? 'conflict' : pos.stance,
      stanceLabel: pos.coi ? 'Conflict declared' : pos.stanceLabel,
      ...(seen?.comment ? { comment: seen.comment } : {}),
      ...(conditions.length ? { conditions } : {}),
      at: pos.at,
      ...(pos.bySecretary ? { secretary: `${SECRETARY_TEXT} · ${personById(pos.recordedById)?.name ?? ''}` } : {}),
      ...(flags.length ? { flags } : {}),
      ...(pos.coi ? { conflict: pos.coi.text } : {}),
    };
  });
  const m = positions.majority;
  return {
    rows,
    headline: positions.quorum.text,
    quorum: { recorded: positions.recorded, needed: positions.quorum.needed, of: positions.quorum.of, met: positions.quorum.met },
    majority: `${m.for} for, ${m.against} against${m.abstain ? `, ${m.abstain} abstaining` : ''}`,
    positions,
  };
}
