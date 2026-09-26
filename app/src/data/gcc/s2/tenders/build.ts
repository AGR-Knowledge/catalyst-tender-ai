import type { Ccy } from '../../fx';
import type { BoqSummaryLine, Quote, Rfq, TenderPackage } from '../types';

/**
 * Builders for a tender's Stage 2 record. They only reshape literals (ids are
 * composed from their parts); nothing here derives a value.
 */

export const money = (ccy: Ccy) => (amount: number) => ({ amount, ccy });

/** A package: everything but the tender and tenant, which the tender file adds. */
export type PackageInput = Omit<TenderPackage, 'tenderId' | 'tenant' | 'value'> & { value: number };

export const packages = (tenant: string, tenderId: string, ccy: Ccy, rows: PackageInput[]): TenderPackage[] =>
  rows.map((p) => ({ ...p, tenant, tenderId, value: { amount: p.value, ccy } }));

/** [id, title, value, kind, packageId?] */
export type BoqTuple = [string, string, number, BoqSummaryLine['kind'], string?];

export const boq = (tenderId: string, ccy: Ccy, rows: BoqTuple[]): BoqSummaryLine[] =>
  rows.map(([id, title, amount, kind, packageId]) => ({ id, tenderId, title, value: { amount, ccy }, kind, ...(packageId ? { packageId } : {}) }));

/** A quote as its RFQ row states it; the ids come from the RFQ. */
export type QuoteInput = Omit<Quote, 'id' | 'rfqId' | 'supplierId' | 'packageId' | 'tenderId' | 'exclusions' | 'deviations' | 'level' | 'vatInclusive' | 'incoterm'>
  & Partial<Pick<Quote, 'exclusions' | 'deviations' | 'level' | 'vatInclusive' | 'incoterm'>>;

export interface RfqRow {
  pkg: string;
  sup: string;
  sentAt: string;
  replyBy: string;
  openedAt?: string;
  acknowledgedAt?: string;
  extendedFrom?: string;
  extensionReason?: string;
  declined?: { at: string; reason: string };
  quote?: QuoteInput;
  nudges?: number;
}

export const rfqId = (tenderId: string, pkg: string, sup: string) => `${tenderId}-${pkg}-${sup}`;
export const quoteId = (rfq: string) => `Q-${rfq}`;

/** RFQs and their quotes. A reply's time is the quote's receipt or the decline. */
export function rfqs(tenderId: string, rows: RfqRow[], levelOf: (pkg: string) => Quote['level']): { rfqs: Rfq[]; quotes: Quote[] } {
  const out: Rfq[] = [];
  const quotes: Quote[] = [];
  for (const row of rows) {
    const id = rfqId(tenderId, row.pkg, row.sup);
    const repliedAt = row.quote?.receivedAt ?? row.declined?.at;
    out.push({
      id, tenderId, packageId: row.pkg, supplierId: row.sup, sentAt: row.sentAt, replyBy: row.replyBy, nudges: row.nudges ?? 0,
      ...(row.extendedFrom ? { extendedFrom: row.extendedFrom } : {}),
      ...(row.extensionReason ? { extensionReason: row.extensionReason } : {}),
      ...(row.openedAt ? { openedAt: row.openedAt } : {}),
      ...(row.acknowledgedAt ? { acknowledgedAt: row.acknowledgedAt } : {}),
      ...(row.declined ? { declined: row.declined } : {}),
      ...(row.quote ? { quoteId: quoteId(id) } : {}),
      ...(repliedAt ? { repliedAt } : {}),
    });
    if (row.quote) {
      quotes.push({
        level: levelOf(row.pkg), vatInclusive: false, incoterm: 'DAP site', exclusions: [], deviations: [],
        ...row.quote,
        id: quoteId(id), rfqId: id, supplierId: row.sup, packageId: row.pkg, tenderId,
      });
    }
  }
  return { rfqs: out, quotes };
}
