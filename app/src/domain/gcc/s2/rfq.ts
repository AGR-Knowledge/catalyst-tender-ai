import type { Tone } from '@/data/types';
import type { Ccy } from '@/data/gcc/fx';
import { HERO_ID, HERO_LINES } from '@/data/gcc/hero';
import {
  RFQ_CLOCK_HOURS, RFQ_CLOCK_WARN_HOURS, RFQ_REPLY_TIME, RFQ_REPLY_WORKING_DAYS,
  type Quote, type Rfq, type RfqLine, type TenderPackage,
} from '@/data/gcc/s2';
import { whenText } from '@/domain/calendar';
import { addHours, durationText, minutesBetween } from '@/domain/gcc/clock';
import { K, NOW, readDone, write, type Done, type RfqSentValue, type S2WriteResult, type SupplierQuoteValue } from './done';
import {
  addWorkingDays, bidCcy, dateOf, liveS2Tenders, NOT_PURSUED, pursueOf, requiredValidityDays, s2TenderOf, sentBatches, sentSupplierIds,
  supplierName, supplierOf, tenantOf, timeOf,
} from './context';
import { packagesFor } from './packaging';
import { approvedShortlist, screeningOf } from './shortlist';

/**
 * RFQs (spec §8.4): the draft per package, the guarded send, the list of RFQs
 * a tender has (seeded, sent in the demo, answered in the Supplier Portal), and
 * the 24-hour clock from the DG1 pursue (SRC-1).
 */

export const rfqIdOf = (tenderId: string, pkgId: string, supplierId: string) => `${tenderId}-${pkgId}-${supplierId}`;
export const quoteIdOf = (rfqId: string) => `Q-${rfqId}`;

export interface LiveRfq extends Rfq { source: 'seed' | 'demo' }

/** Reply date for an RFQ sent at `sentAt`: the reply window in the tenant's working days. */
export const replyByFor = (tenant: string, sentAt: string) => addWorkingDays(sentAt, RFQ_REPLY_WORKING_DAYS, tenantOf(tenant).cc, RFQ_REPLY_TIME);

/** Every RFQ of a tender: seeded, plus those derived from `rfq-sent:` keys, with Supplier Portal quotes and nudges applied. */
export function rfqsFor(tenant: string, tenderId: string, done: Done): LiveRfq[] {
  const rec = s2TenderOf(tenant, tenderId);
  if (!rec) return [];
  const seeded: LiveRfq[] = rec.rfqs.map((r) => ({ ...r, source: 'seed' }));
  const demo: LiveRfq[] = sentBatches(tenderId, done).flatMap(({ pkgId, value }) =>
    value.supplierIds.map((supplierId): LiveRfq => ({
      id: rfqIdOf(tenderId, pkgId, supplierId), tenderId, packageId: pkgId, supplierId,
      sentAt: value.at, replyBy: replyByFor(tenant, value.at), nudges: 0, source: 'demo',
    })));
  return [...seeded, ...demo].map((r) => {
    const sq = readDone<SupplierQuoteValue>(done, K.sq(r.id));
    const nudged = done[K.nudged(r.id)] ? 1 : 0;
    const answered = r.quoteId || r.declined;
    return {
      ...r,
      nudges: r.nudges + nudged,
      ...(sq && !answered ? { quoteId: quoteIdOf(r.id), repliedAt: sq.at, acknowledgedAt: r.acknowledgedAt ?? sq.at, openedAt: r.openedAt ?? sq.at } : {}),
    };
  });
}

/** A quote submitted in the Supplier Portal, in the common schema. It asks for delivered-to-site prices excluding VAT. */
function portalQuote(tenant: string, rfq: LiveRfq, sq: SupplierQuoteValue): Quote {
  const s = supplierOf(tenant, rfq.supplierId);
  return {
    id: quoteIdOf(rfq.id), rfqId: rfq.id, supplierId: rfq.supplierId, packageId: rfq.packageId, tenderId: rfq.tenderId,
    receivedAt: sq.at, level: sq.level, amount: sq.amount, ccy: sq.ccy, vatInclusive: false, incoterm: 'DAP site',
    ...(s ? { origin: s.country } : {}),
    validityDays: sq.validityDays, leadTimeWeeks: sq.leadTimeWeeks, exclusions: sq.exclusions,
    deviations: sq.deviations.map((text) => ({ text, nonCompliant: false })), page: 1,
  };
}

/** Every quote of a tender: seeded, plus those submitted in the Supplier Portal. */
export function quotesFor(tenant: string, tenderId: string, done: Done): Quote[] {
  const rec = s2TenderOf(tenant, tenderId);
  if (!rec) return [];
  const seeded = rec.quotes;
  const portal = rfqsFor(tenant, tenderId, done).flatMap((r) => {
    if (seeded.some((q) => q.rfqId === r.id)) return [];
    const sq = readDone<SupplierQuoteValue>(done, K.sq(r.id));
    return sq ? [portalQuote(tenant, r, sq)] : [];
  });
  return [...seeded, ...portal];
}

export const quoteById = (tenant: string, quoteId: string, done: Done): Quote | undefined =>
  liveS2Tenders(tenant, done).flatMap((t) => quotesFor(tenant, t.tenderId, done)).find((q) => q.id === quoteId);

// ---------------------------------------------------------------------------
// Draft (spec §8.4)

/** RFQ lines: the package's BOQ lines, never rates. A hero "remaining items" line becomes a pointer to the BOQ extract. */
export function rfqLines(pkg: TenderPackage): RfqLine[] {
  if (pkg.lineItems) {
    return HERO_LINES.filter((l) => pkg.lineItems!.includes(l.item)).map((l) => (l.lines > 1
      ? { item: l.item, description: `Further items of bill ${l.bill} (${l.lines} lines), listed in the BOQ extract`, unit: 'sum', qty: 1 }
      : { item: l.item, description: l.description, unit: l.unit, qty: l.qty }));
  }
  return (pkg.lines ?? []).map(({ item, description, unit, qty }) => ({ item, description, unit, qty }));
}

export interface RfqTerms {
  currency: Ccy;
  priceBasis: string;
  delivery: string;
  validityDays: number;
  validity: string;
  paymentTerms: string;
  leadTime: string;
  schedule: string;
}

export interface RfqDraft {
  tenderId: string;
  packageId: string;
  title: string;
  scope: string;
  lines: RfqLine[];
  lineCount: number;
  drawings: { text: string; sheets: string[] };
  technical: string[];
  terms: RfqTerms;
  quoteLevel: 'line' | 'package';
  replyBy: string;
  replyByText: string;
  clarifications: string;
  documents: { title: string; ref: string }[];
  /** Buyer side only: the package note, which is not sent. */
  internalNote?: string;
}

export function rfqTerms(tenant: string, tenderId: string, pkg: TenderPackage): RfqTerms {
  const rec = s2TenderOf(tenant, tenderId)!;
  const v = requiredValidityDays(tenant, tenderId);
  return {
    currency: bidCcy(tenant, tenderId),
    priceBasis: 'Price excluding VAT, with VAT stated separately',
    delivery: 'Delivered to site (DAP)',
    validityDays: v.days,
    validity: `Valid for at least ${v.days} days from the reply date`,
    paymentTerms: rec.paymentTerms,
    leadTime: pkg.needByWeeks ? `State the lead time from award. The programme needs it on site within ${pkg.needByWeeks} weeks` : 'State the lead time from award',
    schedule: 'Deviations and exclusions schedule: list every deviation and exclusion; none is assumed',
  };
}

function technicalOf(tenderId: string, pkg: TenderPackage): string[] {
  const hero = tenderId === HERO_ID;
  return [
    pkg.specRef,
    ...(pkg.kind === 'supply' ? [hero ? 'Manufacturer’s standard, proven equipment, with factory test certificates (§71, p. 31)' : 'Manufacturer’s standard, proven equipment, with factory test certificates'] : []),
    ...(pkg.kind === 'subcontract' ? [hero ? 'Listed subcontractors hold certificates valid at bid opening (§6, p. 4)' : 'Registrations and certificates valid at bid opening'] : []),
    ...(pkg.mandatoryList || pkg.lcRelevant ? [hero ? 'Mandatory-list items must be of national origin (§75, p. 33)' : 'Mandatory-list items must be of national origin'] : []),
    ...(pkg.avlRequired ? [hero ? 'Manufacturers from the Entity’s approved lists where they exist (§64.14.1, p. 27)' : 'Manufacturers from the client’s approved list'] : []),
  ];
}

export function rfqDraft(tenant: string, tenderId: string, pkgId: string, done: Done = {}): RfqDraft | null {
  const rec = s2TenderOf(tenant, tenderId);
  const pkg = packagesFor(tenant, tenderId, done).find((p) => p.pkg.id === pkgId)?.pkg;
  if (!rec || !pkg) return null;
  const sent = rfqsFor(tenant, tenderId, done).filter((r) => r.packageId === pkgId).map((r) => r.replyBy).sort()[0];
  const replyBy = sent ?? replyByFor(tenant, NOW);
  const hero = tenderId === HERO_ID;
  return {
    tenderId, packageId: pkg.id, title: pkg.title, scope: pkg.scope,
    lines: rfqLines(pkg), lineCount: pkg.lineCount ?? rfqLines(pkg).length,
    drawings: { text: hero ? `Vol. 3 Drawings list, p. 47: sheets for ${pkg.title}` : `Drawings for ${pkg.title}`, sheets: pkg.drawings },
    technical: technicalOf(tenderId, pkg),
    terms: rfqTerms(tenant, tenderId, pkg),
    quoteLevel: pkg.quoteLevel,
    replyBy, replyByText: whenText(dateOf(replyBy), timeOf(replyBy), tenantOf(tenant).tzLabel),
    clarifications: 'Questions through the clarification channel in this RFQ',
    documents: rec.documents,
    ...(pkg.note ? { internalNote: pkg.note } : {}),
  };
}

// ---------------------------------------------------------------------------
// Send (the screening guardrail)

/**
 * Send RFQs for a package. Refused when the pursue no longer stands, when no
 * shortlist is approved, when a supplier is not on it, has already been sent
 * one, or is not screened.
 */
export function rfqWrite(tenant: string, tenderId: string, pkgId: string, supplierIds: string[], byId: string, done: Done, at = NOW): S2WriteResult<RfqSentValue> {
  if (!pursueOf(tenant, tenderId, done)) return { error: NOT_PURSUED };
  const list = approvedShortlist(tenant, tenderId, pkgId, done);
  if (!list) return { error: `Approve the ${pkgId} shortlist before sending RFQs.` };
  if (!supplierIds.length) return { error: 'Choose at least one supplier to send to.' };
  const already = sentSupplierIds(tenant, tenderId, pkgId, done);
  for (const id of supplierIds) {
    const s = supplierOf(tenant, id);
    if (!s) return { error: `${id} is not in the supplier master.` };
    // Screening first: a blocked supplier cannot be added to the shortlist either.
    const sc = screeningOf(s);
    if (!sc.sendable) return { error: `${s.name}: ${sc.reason}` };
    if (!list.supplierIds.includes(id)) return { error: `${s.name} is not on the approved shortlist. Add it with a reason first.` };
    if (already.has(id)) return { error: `${s.name} already has this RFQ.` };
  }
  const batch = sentBatches(tenderId, done).filter((b) => b.pkgId === pkgId).length + 1;
  const record: RfqSentValue = { supplierIds, at, byId };
  const reply = replyByFor(tenant, at);
  return write(K.rfqSent(tenderId, pkgId, batch), record, {
    actorId: byId, action: 'RFQs sent', target: `${tenderId} ${pkgId}`,
    detail: `Sent to ${supplierIds.map((id) => supplierName(tenant, id)).join(', ')}. Reply by ${whenText(dateOf(reply), timeOf(reply), tenantOf(tenant).tzLabel)}.`,
  });
}

// ---------------------------------------------------------------------------
// SRC-1 RFQ clock

export interface RfqClock {
  tenderId: string;
  startAt: string;
  dueAt: string;
  dueText: string;
  /** Packages with at least one RFQ sent. */
  sent: number;
  total: number;
  rfqsSent: number;
  leftMin: number;
  /** "23 h 10 m", or "Late by 2 h". */
  left: string;
  tone: Tone;
}

/** Packages first issued, per package: the earliest send. */
function firstSendByPackage(tenant: string, tenderId: string, done: Done): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rfqsFor(tenant, tenderId, done)) {
    const cur = m.get(r.packageId);
    if (!cur || r.sentAt < cur) m.set(r.packageId, r.sentAt);
  }
  return m;
}

/**
 * The live clock: shown from the DG1 pursue until every package is issued and
 * the 24 hours are over. Orange with 6 h or less left and packages unsent;
 * red once breached; green when all are sent.
 */
export function rfqClock(tenant: string, tenderId: string, done: Done, now = NOW): RfqClock | null {
  const p = pursueOf(tenant, tenderId, done);
  if (!p) return null;
  const dueAt = addHours(p.at, RFQ_CLOCK_HOURS);
  const total = packagesFor(tenant, tenderId, done).length;
  const first = firstSendByPackage(tenant, tenderId, done);
  const sent = [...first.values()].filter((at) => at <= now).length;
  const leftMin = minutesBetween(now, dueAt);
  if (leftMin <= 0 && sent >= total) return null;
  const tone: Tone = sent >= total ? 'green' : leftMin <= 0 ? 'red' : leftMin <= RFQ_CLOCK_WARN_HOURS * 60 ? 'orange' : 'ink';
  return {
    tenderId, startAt: p.at, dueAt, dueText: whenText(dateOf(dueAt), timeOf(dueAt), tenantOf(tenant).tzLabel),
    sent, total, rfqsSent: rfqsFor(tenant, tenderId, done).filter((r) => r.sentAt <= now).length,
    leftMin, left: leftMin < 0 ? `Late by ${durationText(-leftMin)}` : durationText(leftMin), tone,
  };
}

/** From the DG1 pursue to the last package's first RFQ, once every package is issued. */
export function rfqIssueLag(tenant: string, tenderId: string, done: Done): { minutes: number; text: string; within: boolean } | null {
  const p = pursueOf(tenant, tenderId, done);
  const total = packagesFor(tenant, tenderId, done).length;
  const first = firstSendByPackage(tenant, tenderId, done);
  if (!p || !total || first.size < total) return null;
  const sends = [...first.values()].sort();
  const last = sends[sends.length - 1];
  const minutes = minutesBetween(p.at, last);
  return { minutes, text: durationText(minutes), within: minutes <= RFQ_CLOCK_HOURS * 60 };
}

/** SRC-1 trailing: packages issued within 24 h of the DG1 pursue ÷ packages, over tenders with RFQs. */
export function rfqsWithin24h(tenant: string, done: Done): { within: number; total: number; pct: number } {
  let within = 0;
  let total = 0;
  for (const rec of liveS2Tenders(tenant, done)) {
    const p = pursueOf(tenant, rec.tenderId, done);
    if (!p) continue;
    for (const at of firstSendByPackage(tenant, rec.tenderId, done).values()) {
      total++;
      if (minutesBetween(p.at, at) <= RFQ_CLOCK_HOURS * 60) within++;
    }
  }
  return { within, total, pct: total ? Math.round((within / total) * 100) : 0 };
}
