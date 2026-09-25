import type { Clarification } from '@/data/gcc/s2';
import { personById } from '@/data/people';
import { K, NOW, readDone, write, type ClarValue, type Done, type S2Write } from './done';
import { liveS2Tenders, s2TenderOf, supplierName } from './context';

/**
 * The supplier clarification log (spec §8.8). The exit rule is zero stale
 * beyond the SLA. Commercial questions always go to a person.
 */

export const COMMERCIAL_ROUTE = 'Commercial question: answered by a person';
export const TECHNICAL_ROUTE = 'Technical question: the agent drafts an answer from the tender documents; the owner approves it';

export interface ClarificationVM extends Clarification {
  supplierName: string;
  ownerName: string;
  state: 'open' | 'answered';
  /** Open past its due time. */
  stale: boolean;
  route: string;
}

export function clarificationsFor(tenant: string, tenderId: string, done: Done, now = NOW): ClarificationVM[] {
  const rec = s2TenderOf(tenant, tenderId);
  if (!rec) return [];
  return rec.clarifications.map((c) => {
    const v = readDone<ClarValue>(done, K.clar(c.id));
    const answer = c.answer ?? (v ? { text: v.answer, at: v.at, byId: v.byId } : undefined);
    const open = !answer;
    return {
      ...c, ...(answer ? { answer } : {}),
      supplierName: supplierName(tenant, c.supplierId), ownerName: personById(c.ownerId)?.name ?? c.ownerId,
      state: open ? 'open' : 'answered', stale: open && c.due < now, route: c.commercial ? COMMERCIAL_ROUTE : TECHNICAL_ROUTE,
    };
  });
}

/** SRC-5 across live tenders. */
export function openClarifications(tenant: string, done: Done, now = NOW): { open: number; stale: number; list: ClarificationVM[] } {
  const list = liveS2Tenders(tenant, done).flatMap((t) => clarificationsFor(tenant, t.tenderId, done, now)).filter((c) => c.state === 'open');
  return { open: list.length, stale: list.filter((c) => c.stale).length, list };
}

export function clarificationWrite(clarId: string, answer: string, byId: string, at = NOW): S2Write<ClarValue> | { error: string } {
  if (!answer.trim()) return { error: 'Write the answer before sending it.' };
  return write(K.clar(clarId), { answer: answer.trim(), at, byId }, {
    actorId: byId, action: 'Supplier clarification answered', target: clarId, detail: answer.trim(),
  });
}
