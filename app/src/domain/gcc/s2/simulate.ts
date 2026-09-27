import { repliesFor, type ScriptedReply } from '@/data/gcc/s2/replies';
import { addHours } from '@/domain/gcc/clock';
import { K, liveS2Tenders, rfqsFor, supplierOf, supplierQuoteWrite, type Done, type LiveRfq, type S2Write, type SupplierQuoteValue } from '@/domain/gcc/s2';
import type { SupplierQuoteInput } from '@/domain/gcc/s2/portal';

/**
 * Simulated supplier replies (plan 008b step 3.2; moved here by plan 014 so the
 * package board's "Demo: suppliers reply now" and the Demo menu's "Advance
 * agent work" call the same function). Nobody replies to a demo, so for each
 * RFQ a tender has sent that is still unanswered, the scripted reply in
 * `data/gcc/s2/replies.ts` is submitted through the Supplier Portal write,
 * stamped `afterMinutes` after the RFQ was sent. A decline is recorded as a
 * decline, with its reason. Reset clears them with the rest of the tenant's `done`.
 */

export interface SimulatedReply { rfq: LiveRfq; reply: ScriptedReply; write: S2Write<SupplierQuoteValue> }

const inputOf = (r: ScriptedReply): SupplierQuoteInput => (r.declines
  ? { level: r.level, amount: 0, ccy: r.ccy, validityDays: 0, leadTimeWeeks: 0, deviations: [], exclusions: [], fileName: '', declined: r.declines }
  : {
    level: r.level, amount: r.amount, ccy: r.ccy, validityDays: r.validityDays, leadTimeWeeks: r.leadTimeWeeks,
    deviations: r.deviations, exclusions: r.exclusions, fileName: r.fileName,
    ...(r.vatInclusive !== undefined ? { vatInclusive: r.vatInclusive } : {}), ...(r.incoterm ? { incoterm: r.incoterm } : {}),
  });

/** The replies that would arrive now: sent RFQs of this tender with no answer yet and a scripted reply. */
export function pendingReplies(tenant: string, tenderId: string, done: Done): SimulatedReply[] {
  return rfqsFor(tenant, tenderId, done).flatMap((rfq) => {
    if (rfq.repliedAt || rfq.quoteId || rfq.declined || done[K.sq(rfq.id)]) return [];
    const reply = repliesFor(tenant, tenderId, rfq.packageId).find((x) => x.supplierId === rfq.supplierId);
    if (!reply) return [];
    // The firm answers; a supplier with a portal persona answers as that person.
    const by = supplierOf(tenant, rfq.supplierId)?.contactPersonId ?? supplierOf(tenant, rfq.supplierId)?.name ?? rfq.supplierId;
    return [{ rfq, reply, write: supplierQuoteWrite(rfq.id, inputOf(reply), by, addHours(rfq.sentAt, reply.afterMinutes / 60)) }];
  });
}

/** How many scripted replies this tender has in all (for the button's disabled reason). */
export const scriptedCount = (tenant: string, tenderId: string, packageIds: string[]) =>
  packageIds.reduce((n, p) => n + repliesFor(tenant, tenderId, p).length, 0);

/**
 * "Advance agent work" (plan 014 step 3.1): every reply still pending on the
 * tenant's tenders being sourced now, tender by tender, as each package board's
 * button would submit them. Extraction resolves at upload and a pack re-run is
 * a person's action, so supplier replies are the only agent work it completes.
 */
export function pendingRepliesAll(tenant: string, done: Done): SimulatedReply[] {
  return liveS2Tenders(tenant, done).flatMap((t) => pendingReplies(tenant, t.tenderId, done));
}
