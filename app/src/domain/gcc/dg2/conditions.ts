import type { Seat } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { nowIso, readDone, type Done, type WriteError, type WriteResult } from '@/domain/gcc/s3/done';
import { activeDecision, conditionId, type ConditionValue, type Dg2Decision } from './keys';

/**
 * DG2 conditions (spec §10, DEC-9). A Bid decision carries the members'
 * conditions plus the approver's own; each becomes a tracked item on the bid
 * workspace, `{TID}-R{round}-C{n}`, open until someone closes it (`cond:`).
 * The round keeps a closed condition of an earlier decision from closing the
 * same number after a re-open.
 */

/** One member's condition text as separate conditions: split on ";", first letter capitalised. */
export function splitConditions(texts: string[]): string[] {
  return texts
    .flatMap((t) => t.split(';'))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1));
}

export interface ConditionVM {
  id: string; tenderId: string; text: string; fromSeat?: Seat; state: 'open' | 'closed'; closedAt?: string; closedById?: string; note?: string;
  /** It states a margin figure, as marked where it was written (plan 021 4.6). */
  margin?: true;
  /** The text is masked for this viewer. */
  masked?: true;
}

/** Who reads the conditions: `see.margin` from `can()`. Without a viewer, conditions read in full. */
/**
 * Who reads the DG2 record. Without `see.margin`, margin conditions read masked (plan 021 4.6).
 * With `canSeePositions: false` the record carries no positions, conflicts or majority: only the outcome.
 */
export interface ConditionViewer { canSeeMargin: boolean; canSeePositions?: boolean }

export const MASKED_MARGIN_CONDITION = 'Minimum margin condition (figure masked for your role)';

/** A condition's text as the viewer may read it. */
export const conditionText = (text: string, margin: boolean, viewer?: ConditionViewer) => (margin && viewer && !viewer.canSeeMargin ? MASKED_MARGIN_CONDITION : text);

/** The seat whose position raised this condition; none for the approver's own. */
function seatOf(decision: Dg2Decision, text: string): Seat | undefined {
  return decision.positionsSnapshot.find((p) => p.stance === 'conditions' && splitConditions(p.conditions ?? []).includes(text))?.seat;
}

export function conditionsFor(tenant: string, tenderId: string, done: Done, viewer?: ConditionViewer): ConditionVM[] {
  if (!isGccTenantKey(tenant)) return [];
  const d = activeDecision(done, tenderId);
  if (!d || d.decision !== 'bid') return [];
  return d.conditions.map((raw, i) => {
    const id = conditionId(tenderId, d.round ?? 1, i + 1);
    const closed = readDone<ConditionValue>(done, `cond:${id}`);
    const fromSeat = seatOf(d, raw);
    const margin = !!d.marginConditions?.includes(raw);
    const text = conditionText(raw, margin, viewer);
    return {
      id, tenderId, text,
      ...(fromSeat ? { fromSeat } : {}),
      ...(margin ? { margin: true as const } : {}),
      ...(text !== raw ? { masked: true as const } : {}),
      state: closed ? 'closed' : 'open',
      ...(closed ? { closedAt: closed.at, closedById: closed.byId, ...(closed.note ? { note: closed.note } : {}) } : {}),
    };
  });
}

/** DEC-9: conditions still open on tenders that proceeded, across the tenant. */
export function conditionsOpen(tenant: string, done: Done, viewer?: ConditionViewer): { count: number; items: ConditionVM[] } {
  if (!isGccTenantKey(tenant)) return { count: 0, items: [] };
  const items = gccData(tenant).register.flatMap((t) => conditionsFor(tenant, t.id, done, viewer)).filter((c) => c.state === 'open');
  return { count: items.length, items };
}

export function conditionCloseWrite(id: string, byId: string, note?: string): WriteResult | WriteError {
  const m = /^(.+)-R\d+-C\d+$/.exec(id);
  if (!m) return { error: `No condition called "${id}"` };
  const value: ConditionValue = { state: 'closed', ...(note?.trim() ? { note: note.trim() } : {}), at: nowIso(), byId };
  return {
    key: `cond:${id}`,
    value: JSON.stringify(value),
    audit: { actorId: byId, action: 'DG2 condition closed', target: m[1], detail: `${id}${value.note ? `: ${value.note}` : ''}` },
  };
}
