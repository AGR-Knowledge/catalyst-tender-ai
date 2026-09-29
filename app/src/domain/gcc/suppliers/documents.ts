import type { DocumentSeed } from '@/data/gcc/s2/profiles';
import { dateText } from '@/domain/calendar';
import { money } from '@/domain/money';
import { facsimileHtml, type FacsimileSpec } from '../library/facsimile';
import type { LibraryFileVM } from '../library/types';
import type { SupplierDetailVM } from './detail';

/**
 * A supplier's documents as files for plan 030's `FileViewer` (plan 031 step
 * 4.6): each one a watermarked facsimile built from the profile's own facts
 * when it is viewed. The demo holds no supplier PDFs.
 */

const FOLDER = 'supplier-documents';

function specOf(d: SupplierDetailVM, doc: DocumentSeed): FacsimileSpec {
  const c = d.company;
  const name = d.row.s.name;
  const m = (n: number) => money(n, d.ccy, { full: true });
  const base = { title: doc.title, issuer: c.legalName, issuerLines: [c.hq], date: dateText(doc.issued), footer: `${c.legalName} · ${c.registration.label} ${c.registration.no}` };
  const latest = d.accounts[d.accounts.length - 1];
  switch (doc.kind) {
    case 'profile':
      return {
        ...base, heading: 'Company profile',
        sections: [
          { paragraphs: [d.summary ?? `${name} is based in ${c.hq}. It was established in ${c.established} and has ${c.staff.toLocaleString('en-GB')} staff.`] },
          {
            heading: 'Key facts',
            rows: [
              [c.registration.label, c.registration.no], ['Established', String(c.established)], ['Staff', c.staff.toLocaleString('en-GB')],
              ['Ownership', c.localShare ? `${c.ownership}; ${c.localShare}` : c.ownership], ...(c.classification ? [['Classification', c.classification] as [string, string]] : []),
              ['Geographies served', c.geographies.join(', ')],
            ],
          },
          {
            heading: 'What we supply',
            table: {
              head: ['Trade', 'Scope', 'Largest single order', d.capabilities[0]?.kind === 'subcontract' ? 'Mobilisation' : 'Lead time'],
              align: ['l', 'l', 'r', 'r'],
              rows: d.capabilities.map((x) => [x.trade, x.kind === 'supply' ? 'Supply' : 'Subcontract', m(x.largestOrder.own.amount), `${x.weeks[0]}–${x.weeks[1]} weeks`]),
            },
          },
          ...(c.avl.length ? [{ heading: 'Approved-vendor lists', list: c.avl }] : []),
        ],
      };
    case 'licence': {
      const cert = d.certificates.find((x) => x.kind === 'licence') ?? d.certificates.find((x) => x.kind === 'cr');
      return {
        ...base, issuer: cert?.issuer ?? 'Company registry', issuerLines: [c.hq], heading: doc.title,
        sections: [{
          rows: [
            ['Registered name', c.legalName], [c.registration.label, c.registration.no], ['Registered office', c.hq],
            ['Activities', d.capabilities.map((x) => x.trade).join(', ')], ...(cert ? [['Valid to', dateText(cert.validTo)] as [string, string]] : []),
          ],
        }],
      };
    }
    case 'iso': {
      const isos = d.certificates.filter((x) => x.kind.startsWith('iso'));
      return {
        ...base, issuer: isos[0]?.issuer ?? 'Certification body', issuerLines: ['Management systems certification'], heading: 'Certificates of registration',
        sections: isos.map((x, i) => ({
          heading: x.name, newPage: i > 0,
          paragraphs: [`This is to certify that the management system of ${c.legalName}, ${c.hq}, has been assessed and found to conform to the standard named above.`],
          rows: [['Certificate number', x.no], ['Scope', d.capabilities.map((k) => k.trade).join(', ')], ['Valid to', dateText(x.validTo)]] as [string, string][],
        })),
      };
    }
    case 'accounts': {
      const fy = d.accounts.find((a) => a.audited && doc.title.endsWith(`FY${a.fy}`)) ?? latest;
      const prev = d.accounts.find((a) => a.fy === fy.fy - 1);
      const col = (a: typeof fy) => [m(a.revenue), m(Math.round((a.revenue * a.grossMarginPct) / 100)), m(Math.round((a.revenue * a.netMarginPct) / 100)), m(a.netWorth)];
      return {
        ...base, heading: `Financial statements for the year ended 31 December ${fy.fy}`,
        sections: [
          { heading: 'Independent auditor’s opinion', paragraphs: [`In our opinion the financial statements give a true and fair view of the financial position of ${c.legalName} as at 31 December ${fy.fy}, and of its performance for the year then ended.`] },
          {
            heading: `Summary, in ${d.ccy}${d.reportedInUsd ? ' (reported in USD)' : ''}`,
            table: {
              head: ['', `FY${fy.fy}`, ...(prev ? [`FY${prev.fy}`] : [])], align: ['l', 'r', 'r'],
              rows: ['Revenue', 'Gross profit', 'Net profit', 'Net worth'].map((label, i) => [label, col(fy)[i], ...(prev ? [col(prev)[i]] : [])]),
            },
          },
          { rows: [['Current ratio', fy.currentRatio.toFixed(2)], ['Debt to equity', fy.debtToEquity.toFixed(2)]] },
        ],
      };
    }
    case 'insurance':
      return {
        ...base, issuer: d.insurance.insurer, issuerLines: ['Certificate of insurance'], heading: 'Certificate of insurance',
        sections: [{
          rows: [
            ['Insured', c.legalName], ['Cover', d.insurance.cover], ['Limit of indemnity', m(d.insurance.limit.own.amount)],
            ['Policy number', d.certificates.find((x) => x.kind === 'insurance')?.no ?? ''], ['Valid to', dateText(d.insurance.validTo)],
          ],
        }],
      };
  }
}

export function supplierDocumentsFor(d: SupplierDetailVM): LibraryFileVM[] {
  const name = d.row.s.name;
  return d.documents.map((doc) => ({
    id: `${FOLDER}:${d.id}:${doc.kind}`,
    name: doc.fileName,
    title: doc.title,
    kind: `supplier-${doc.kind}`,
    type: 'PDF',
    source: { channel: 'supplier', label: `From ${name}, with its prequalification` },
    receivedAt: doc.issued,
    by: name,
    extent: { n: doc.pages, unit: 'page' },
    tags: [],
    view: { kind: 'html', html: () => facsimileHtml(specOf(d, doc)) },
    folderId: FOLDER,
    path: [name, 'Documents'],
  }));
}
