import { money } from '@/domain/money';
import {
  levelledFor, packagesFor, quotesFor, rfqLines, rfqsFor, rfqTerms, sentBy, s2TenderOf, supplierOf,
} from '@/domain/gcc/s2';
import type { FacCell, FacsimileSpec } from './facsimile';
import { docDate, fileOf, nameOf, type LibCtx } from './context';
import { facsimileFile } from './documents';
import type { FolderDef, MaskedFolder } from './folders';
import { fileName, safe } from './names';
import type { LibraryFileVM } from './types';

/**
 * 04 Suppliers and quotes (plan 030 Design): a sub-folder per package, each
 * with the RFQs as sent and every reply (a quote, or a decline). They are the
 * Sourcing tab's RFQs and replies for the same demo state (`rfqsFor`, sent by
 * now, as the supplier matrix lists them), so the two never disagree.
 *
 * Masking: the folder is for holders of `sourcing.view` or `levelling.view`;
 * anyone else sees its count only. A quote's prices need `see.quotes`; with
 * `see.quotes.summary` the facsimile shows the levelled total and masks the
 * supplier's own prices.
 */

const OUTREACH = 'Outreach & Evaluation agent';

export interface SourcingPart { files: LibraryFileVM[]; folders: FolderDef[]; masked: MaskedFolder[] }

export function sourcingFiles(c: LibCtx): SourcingPart {
  const { tenant, l, done } = c;
  const empty: SourcingPart = { files: [], folders: [], masked: [] };
  if (!s2TenderOf(tenant, l.tenderId)) return empty;
  const rfqs = rfqsFor(tenant, l.tenderId, done).filter((r) => sentBy(r));
  if (!rfqs.length) return empty;
  const quotes = quotesFor(tenant, l.tenderId, done);
  const replies = rfqs.filter((r) => (r.quoteId && r.repliedAt && quotes.some((q) => q.id === r.quoteId)) || r.declined).length;

  if (!c.can('sourcing.view') && !c.can('levelling.view')) {
    // Everyone with `sourcing.view` also has `levelling.view` (access.ts), so its holders name them all.
    return { ...empty, masked: [{ id: '04', count: rfqs.length + replies, by: c.holders('levelling.view') }] };
  }

  const pkgs = packagesFor(tenant, l.tenderId, done);
  const levelled = new Map(levelledFor(tenant, l.tenderId, done).map((v) => [v.quoteId, v]));
  const seeQuotes = c.can('see.quotes');
  const seeSummary = c.can('see.quotes.summary');
  const files: LibraryFileVM[] = [];
  const folders: FolderDef[] = [];

  for (const { pkg } of pkgs) {
    const mine = rfqs.filter((r) => r.packageId === pkg.id);
    if (!mine.length) continue;
    const folder = `04/${pkg.id}`;
    folders.push({ id: folder, name: `${pkg.id} ${pkg.title}`, parent: '04' });
    const terms = rfqTerms(tenant, l.tenderId, pkg);
    const lines = rfqLines(pkg);

    for (const r of mine) {
      const s = supplierOf(tenant, r.supplierId);
      const sName = s?.name ?? r.supplierId;
      const buyer = nameOf(c.t?.bidManagerId ?? l.bidManagerId);
      files.push(fileOf(folder, `rfq-${r.id}`, {
        kind: 'rfq', name: fileName(`RFQ ${pkg.id}`, safe(sName)), title: `RFQ ${pkg.id} ${pkg.title}, to ${sName}`, type: 'PDF',
        source: { channel: 'person', label: `Sent to ${sName}` }, receivedAt: r.sentAt, by: r.source === 'demo' ? buyer : OUTREACH,
        tags: [r.source === 'demo' ? 'Sent in the demo' : 'Sent'],
        ...facsimileFile((): FacsimileSpec => ({
          title: `RFQ ${pkg.id} ${sName}`, issuer: c.company, issuerLines: ['Procurement'], heading: 'Request for quotation',
          ref: `${l.tenderId}-${pkg.id}`, date: docDate(r.sentAt.slice(0, 10)), to: [sName, s ? `${s.city}, ${s.country}` : ''].filter(Boolean),
          subject: `${pkg.id} ${pkg.title}, for ${l.title}`,
          sections: [
            { paragraphs: [pkg.scope] },
            { heading: 'Terms', rows: [
              ['Reply by', docDate(r.replyBy) ?? ''],
              ['Validity', terms.validity],
              ['Prices', `${terms.priceBasis}, in ${terms.currency}`],
              ['Delivery', terms.delivery],
              ['Payment', terms.paymentTerms],
              ['Lead time', terms.leadTime],
              ...(pkg.specRef ? [['Specification', pkg.specRef] as [string, FacCell]] : []),
              ...(pkg.drawings.length ? [['Drawings', pkg.drawings.join(', ')] as [string, FacCell]] : []),
            ] },
            { heading: 'Lines', table: { head: ['Item', 'Description', 'Unit', 'Quantity'], align: ['l', 'l', 'l', 'r'], rows: lines.map((x) => [x.item, x.description, x.unit, x.qty.toLocaleString('en-GB')]) }, newPage: lines.length > 6 },
            { note: `Drafted by the ${OUTREACH} from the tender documents; sent by the buyer. Quantities only: the RFQ carries no rates.` },
          ],
        }), lines.length > 6 ? 2 : 1),
      }));

      if (r.declined) {
        files.push(fileOf(folder, `decline-${r.id}`, {
          kind: 'decline', name: fileName(`Decline ${pkg.id}`, safe(sName), 'eml'), title: `${sName} declined`, type: 'Email',
          source: { channel: 'supplier', label: `From ${sName}, via the Supplier Portal` }, receivedAt: r.declined.at, by: sName,
          ...facsimileFile((): FacsimileSpec => ({
            title: `Decline ${pkg.id} ${sName}`, issuer: sName,
            email: { from: sName, to: c.company, subject: `RFQ ${l.tenderId}-${pkg.id}: we will not quote`, received: docDate(r.declined!.at) ?? '' },
            sections: [{ paragraphs: ['Thank you for your request for quotation.', r.declined!.reason] }],
          }), 1),
        }));
      }

      const q = r.quoteId ? quotes.find((x) => x.id === r.quoteId) : undefined;
      if (!q) continue;
      const lv = levelled.get(q.id);
      const price: FacCell = seeQuotes ? money(q.amount, q.ccy, { full: true })
        : { masked: c.holders('see.quotes') };
      const level: FacCell | null = lv ? (seeQuotes || seeSummary ? money(lv.levelled.amount, lv.levelled.ccy, { full: true }) : { masked: c.holders('see.quotes.summary') }) : null;
      files.push(fileOf(folder, `quote-${q.id}`, {
        kind: 'quote', name: fileName(`Quote ${pkg.id}`, safe(sName)), title: `Quote ${pkg.id} from ${sName}`, type: 'PDF',
        source: { channel: 'supplier', label: `From ${sName}, via the Supplier Portal` }, receivedAt: q.receivedAt, by: sName,
        tags: lv ? [lv.state === 'levelled' ? 'Levelled' : 'To level'] : [],
        ...(seeQuotes ? {} : { masked: { by: c.holders('see.quotes') } }),
        ...facsimileFile((): FacsimileSpec => ({
          title: `Quote ${pkg.id} ${sName}`, issuer: sName, issuerLines: s ? [`${s.city}, ${s.country}`] : undefined, heading: 'Quotation',
          ref: q.id, date: docDate(q.receivedAt.slice(0, 10)), to: [c.company, 'Procurement'], subject: `RFQ ${l.tenderId}-${pkg.id}, ${pkg.title}`,
          sections: [
            { heading: 'Price', rows: [
              ['Quoted price', price],
              ['Basis', `${q.level === 'line' ? 'Line by line' : 'Lump sum for the package'}, ${q.incoterm}, ${q.vatInclusive ? 'including' : 'excluding'} VAT`],
              ...(level ? [['Levelled total (our evaluation)', level] as [string, FacCell]] : []),
            ] },
            { heading: 'Terms', rows: [
              ['Valid for', `${q.validityDays} days`],
              ...(q.leadTimeWeeks ? [['Lead time', `${q.leadTimeWeeks} weeks`] as [string, FacCell]] : []),
              ...(q.origin ? [['Origin', q.origin] as [string, FacCell]] : []),
              ...(q.paymentAdvancePct ? [['Advance payment', `${q.paymentAdvancePct}%`] as [string, FacCell]] : []),
            ] },
            ...(q.exclusions.length ? [{ heading: 'Exclusions', list: q.exclusions }] : []),
            ...(q.deviations.length ? [{ heading: 'Deviations', list: q.deviations.map((d) => d.text) }] : []),
            ...(!seeQuotes && seeSummary ? [{ note: "The supplier's own prices are masked for your role; the levelled total is our evaluation, excluding VAT, delivered to site." }] : []),
          ],
        }), 1),
      }));
    }
  }
  return { files, folders, masked: [] };
}
