import type { Ccy } from '@/data/gcc/fx';
import type { RfqLine } from '@/data/gcc/s2';
import { countdownText, dateText, whenText } from '@/domain/calendar';
import { K, NOW, readDone, write, type Done, type S2Write, type SupplierQuoteValue } from './done';
import { dateOf, liveS2Tenders, registerRow, s2TenderOf, supplierOf, suppliersOf, tenantOf, timeOf } from './context';
import { packagesFor } from './packaging';
import { rfqLines, rfqsFor, rfqTerms, type LiveRfq, type RfqTerms } from './rfq';
import { clarificationsFor } from './clarifications';
import { isOverdue } from './tracking';

/**
 * The Supplier Portal preview (spec §8.10, catalogue §C.7): what one supplier
 * sees of one RFQ. It never carries other suppliers, other quotes, the
 * tender's value, the estimate or any rate. Plain objects, so the dev check can
 * serialise them and look for leaks.
 */

/** The suppliers a portal person answers for, in this tenant. */
const firmsOf = (tenant: string, personId: string) => suppliersOf(tenant).filter((s) => s.contactPersonId === personId).map((s) => s.id);

export interface SupplierRfqRow {
  rfqId: string;
  tenderId: string;
  project: string;
  packageId: string;
  packageTitle: string;
  replyBy: string;
  replyByText: string;
  status: string;
}

/** Supplier-side status: never the buyer's escalation. */
function supplierStatus(r: LiveRfq, now: string): string {
  if (r.declined) return `Declined ${dateText(dateOf(r.declined.at))}`;
  if (r.quoteId && r.repliedAt) return `Quote sent ${dateText(dateOf(r.repliedAt))}`;
  if (isOverdue(r, now)) return `Reply date passed ${dateText(dateOf(r.replyBy))}: you can still reply`;
  return `Reply by ${dateText(dateOf(r.replyBy))}`;
}

export function supplierRfqs(tenant: string, personId: string, done: Done, now = NOW): SupplierRfqRow[] {
  const firms = firmsOf(tenant, personId);
  const tz = tenantOf(tenant).tzLabel;
  return liveS2Tenders(tenant, done).flatMap((t) => {
    const row = registerRow(tenant, t.tenderId);
    const pkgs = packagesFor(tenant, t.tenderId, done);
    return rfqsFor(tenant, t.tenderId, done)
      .filter((r) => firms.includes(r.supplierId) && r.sentAt <= now)
      .map((r) => ({
        rfqId: r.id, tenderId: r.tenderId, project: row?.title ?? r.tenderId, packageId: r.packageId,
        packageTitle: pkgs.find((p) => p.pkg.id === r.packageId)?.pkg.title ?? r.packageId,
        replyBy: r.replyBy, replyByText: whenText(dateOf(r.replyBy), timeOf(r.replyBy), tz), status: supplierStatus(r, now),
      }));
  });
}

export interface SupplierView {
  rfqId: string;
  supplier: { name: string };
  invitedBy: { name: string; monogram: string; accent: string };
  project: { title: string; employer: string };
  package: { id: string; title: string; scope: string };
  lines: RfqLine[];
  replyBy: { at: string; text: string; countdown: string };
  documents: { title: string; ref: string }[];
  terms: Omit<RfqTerms, 'validityDays'> & { validityDays: number };
  status: string;
  quoteForm: {
    level: 'line' | 'package';
    levelText: string;
    fields: { name: string; label: string }[];
    submitted?: { amount: number; ccy: Ccy; at: string; fileName: string };
  };
  deviations: { label: string; hint: string };
  exclusions: { label: string; hint: string };
  clarification: { channel: string; mine: { question: string; answer?: string; raisedAt: string }[] };
}

/** One RFQ as its supplier sees it, or null if the person does not answer for that supplier. */
export function supplierView(tenant: string, personId: string, rfqId: string, done: Done, now = NOW): SupplierView | null {
  const firms = firmsOf(tenant, personId);
  const r = liveS2Tenders(tenant, done).flatMap((t) => rfqsFor(tenant, t.tenderId, done)).find((x) => x.id === rfqId);
  if (!r || !firms.includes(r.supplierId)) return null;
  const pkg = packagesFor(tenant, r.tenderId, done).find((p) => p.pkg.id === r.packageId)?.pkg;
  const row = registerRow(tenant, r.tenderId);
  const rec = s2TenderOf(tenant, r.tenderId);
  if (!pkg || !row || !rec) return null;
  const t = tenantOf(tenant);
  const sq = readDone<SupplierQuoteValue>(done, K.sq(r.id));
  const replyDate = dateOf(r.replyBy);
  const lineText = pkg.quoteLevel === 'line' ? 'Price each line of the BOQ extract' : 'One price for the package';
  return {
    rfqId: r.id,
    supplier: { name: supplierOf(tenant, r.supplierId)!.name },
    invitedBy: { name: t.name, monogram: t.monogram, accent: t.accent },
    // "Reveal employer to suppliers" is on by default (catalogue §C.7).
    project: { title: row.title, employer: row.issuer },
    package: { id: pkg.id, title: pkg.title, scope: pkg.scope },
    lines: rfqLines(pkg),
    replyBy: { at: r.replyBy, text: whenText(replyDate, timeOf(r.replyBy), t.tzLabel), countdown: r.replyBy > now ? countdownText(dateOf(now), replyDate, t.cc) : 'The reply date has passed' },
    documents: rec.documents,
    terms: rfqTerms(tenant, r.tenderId, pkg),
    status: supplierStatus(r, now),
    quoteForm: {
      level: pkg.quoteLevel, levelText: lineText,
      fields: [
        { name: 'amount', label: pkg.quoteLevel === 'line' ? 'Total of your line prices, excluding VAT' : 'Package price, excluding VAT' },
        { name: 'validityDays', label: 'Validity (days)' },
        { name: 'leadTimeWeeks', label: 'Lead time from award (weeks)' },
        { name: 'fileName', label: 'Your quote document (PDF or Excel)' },
      ],
      ...(sq ? { submitted: { amount: sq.amount, ccy: sq.ccy, at: sq.at, fileName: sq.fileName } } : {}),
    },
    deviations: { label: 'Deviations', hint: 'List each deviation from the specification. Anything not listed is taken as compliant.' },
    exclusions: { label: 'Exclusions', hint: 'List anything your price does not include.' },
    clarification: {
      channel: 'Ask a question about this RFQ. Answers come back here.',
      mine: clarificationsFor(tenant, r.tenderId, done, now)
        .filter((c) => c.supplierId === r.supplierId && c.packageId === r.packageId)
        .map((c) => ({ question: c.question, raisedAt: c.raisedAt, ...(c.answer ? { answer: c.answer.text } : {}) })),
    },
  };
}

export type SupplierQuoteInput = Omit<SupplierQuoteValue, 'at' | 'byId'>;

/** A quote submitted in the portal. On the buyer's side it becomes a new quote to level, and the RFQ stops being overdue. */
export function supplierQuoteWrite(rfqId: string, input: SupplierQuoteInput, personId: string, at = NOW): S2Write<SupplierQuoteValue> {
  const record: SupplierQuoteValue = { ...input, at, byId: personId };
  return write(K.sq(rfqId), record, {
    actorId: personId, action: 'Quote submitted in the Supplier Portal', target: rfqId,
    detail: `${input.level === 'line' ? 'Line-level' : 'Package'} quote, ${input.ccy}, valid ${input.validityDays} days, lead time ${input.leadTimeWeeks} weeks. File: ${input.fileName}.`
      + `${input.deviations.length ? ` Deviations: ${input.deviations.join('; ')}.` : ''}${input.exclusions.length ? ` Exclusions: ${input.exclusions.join('; ')}.` : ''}`,
  });
}
