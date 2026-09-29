import type { Credential } from '@/data/gcc/types';
import { money } from '@/domain/money';
import { dateText } from '@/domain/calendar';
import { eligibilityFor, bidBondFor } from '@/domain/gcc/s1';
import { dataOf } from '@/domain/gcc/s1/common';
import { DONE_KEY, readDone } from '@/domain/gcc/s1/done';
import type { RenewedValue } from '@/domain/gcc/s1/eligibility';
import type { FacCell, FacSection, FacsimileSpec } from './facsimile';
import { docDate, fileOf, nameOf, type LibCtx } from './context';
import { facsimileFile } from './documents';
import { fileName, safe } from './names';
import type { LibraryFileVM } from './types';

/**
 * 05 Our proposal, 06 Company evidence and 07 Result (plan 030 Design).
 * - 05: for a tender that reached Stage 6 (Proposal), its technical and
 *   commercial proposals, the bid bond and the form of tender: drafts until it
 *   is submitted, then as submitted. Prices and the bond (it states the price
 *   through its rate) need `see.margin`.
 * - 06: the vault credentials and audited accounts the eligibility check used.
 * - 07: the award or regret letter, or the notice of cancellation.
 */

const reached = (c: LibCtx, stage: number) => c.l.log.some((e) => e.stage >= stage);

export function proposalFiles(c: LibCtx): LibraryFileVM[] {
  const { l } = c;
  if (!reached(c, 6)) return [];
  const s = l.submission;
  const start = l.log.find((e) => e.stage === 6)?.at ?? l.log[l.log.length - 1].at;
  const at = s?.at ?? start;
  const by = nameOf(l.bidManagerId);
  const state = s ? 'As submitted' : 'Draft';
  // Drafts are ours until the bid is submitted; then they left with it.
  const dated = s ? 'sent' as const : 'made' as const;
  const seeMargin = c.can('see.margin');
  const mask: FacCell = { masked: c.holders('see.margin') };
  const price = l.result?.value ?? (l.value.amount ? { amount: l.value.amount, ccy: l.value.ccy } : null);
  const head = (what: string, lines: FacSection[]): FacsimileSpec => ({
    title: `${c.prefix} ${what}`, issuer: c.company, heading: what, ref: c.ref ?? l.tenderId, date: docDate(at.slice(0, 10)),
    to: [c.issuer, 'Tendering Committee'], subject: l.title, sections: lines,
    signature: { name: by ?? undefined, role: 'Bid Manager', org: c.company },
  });
  const source = { channel: 'person' as const, label: `Prepared by ${by ?? 'the bid team'}` };
  const out: LibraryFileVM[] = [
    fileOf('05/technical', 'technical', {
      kind: 'proposal', name: fileName(c.prefix, 'Technical proposal'), title: 'Technical proposal', type: 'PDF', source, receivedAt: at, dated, by, tags: [state],
      ...facsimileFile(() => head('Technical proposal', [
        { heading: 'Contents', list: ['Understanding of the scope', 'Method statement and programme', 'Organisation and key personnel', 'Similar projects and references', 'Quality, health, safety and environment plans', 'Local content plan'] },
        { heading: 'Understanding of the scope', paragraphs: [`${c.company} proposes to deliver ${l.title} for ${c.issuer}${l.city ? ` in ${l.city}` : ''}, as set out in the tender documents.`], newPage: true },
      ]), 2),
    }),
    fileOf('05/commercial', 'commercial', {
      kind: 'proposal', name: fileName(c.prefix, 'Commercial proposal'), title: 'Commercial proposal', type: 'PDF', source, receivedAt: at, dated, by, tags: [state],
      ...(seeMargin ? {} : { masked: { by: c.holders('see.margin') } }),
      ...facsimileFile(() => head('Commercial proposal', [
        { heading: 'Form of price', rows: [
          ...(price ? [['Total price, excluding VAT', seeMargin ? money(price.amount, price.ccy, { full: true }) : mask] as [string, FacCell]] : []),
          ['Currency', price?.ccy ?? l.value.ccy],
          ['Price basis', 'Priced bill of quantities, excluding VAT'],
          ...(l.facts?.stage === 5 ? [['Base margin', seeMargin ? `${l.facts.baseMarginPct}%` : mask] as [string, FacCell]] : []),
        ] },
        { note: 'The priced bill of quantities is attached to the commercial file.' },
      ]), 1),
    }),
  ];

  // The bid bond: the Stage 8 facts, else the Stage 1 rule for a register tender.
  const f8 = l.facts?.stage === 8 ? l.facts.bond : null;
  const bond = f8 ? { amount: f8.amount, validTo: f8.validTo } : c.t ? (() => { const b = bidBondFor(c.tenant, l.tenderId, c.done); return b ? { amount: b.original ?? b.amount, validTo: undefined } : null; })() : null;
  if (bond) {
    out.push(fileOf('05/forms', 'bond', {
      kind: 'proposal', name: fileName(c.prefix, 'Bid bond'), title: 'Bid bond (initial guarantee)', type: 'PDF',
      source: { channel: 'person', label: `Requested by ${by ?? 'the bid team'}` }, receivedAt: at, dated, by, tags: [f8 && !f8.issued ? 'Requested' : state],
      ...(seeMargin ? {} : { masked: { by: c.holders('see.margin') } }),
      ...facsimileFile(() => ({
        title: `${c.prefix} Bid bond`, issuer: 'Issuing bank', heading: 'Bid bond (initial guarantee)', ref: c.ref ?? l.tenderId, date: docDate(at.slice(0, 10)),
        to: [c.issuer], subject: l.title,
        sections: [{ rows: [
          ['Principal', c.company], ['Beneficiary', c.issuer],
          ['Amount', seeMargin ? money(bond.amount.amount, bond.amount.ccy, { full: true }) : mask],
          ...(bond.validTo ? [['Valid to', dateText(bond.validTo)] as [string, FacCell]] : []),
        ] }, { paragraphs: ['We undertake to pay the beneficiary on first written demand, without objection, up to the amount above.'] }],
      }), 1),
    }));
  }
  out.push(fileOf('05/forms', 'form', {
    kind: 'proposal', name: fileName(c.prefix, 'Form of tender'), title: 'Form of tender', type: 'Form', source, receivedAt: at, dated, by, tags: [state],
    ...facsimileFile(() => head('Form of tender', [
      { paragraphs: [`We, ${c.company}, offer to execute and complete ${l.title} in conformity with the tender documents, for the price stated in our commercial proposal.`, 'This offer remains valid for the bid validity period stated in the tender documents.'] },
    ]), 1),
  }));
  return out;
}

// ---------------------------------------------------------------------------

export function evidenceFiles(c: LibCtx): LibraryFileVM[] {
  if (!c.t) return [];
  const e = eligibilityFor(c.tenant, c.l.tenderId, c.done);
  if (!e) return [];
  const d = dataOf(c.tenant);
  const creds = new Map<string, Credential>([...d.credentials, ...d.partners.flatMap((p) => p.credentials)].map((x) => [x.id, x]));
  const seen = new Set<string>();
  const out: LibraryFileVM[] = [];
  for (const ev of e.lines.flatMap((x) => x.evidence)) {
    if (seen.has(ev.id) || (ev.kind !== 'credential' && ev.kind !== 'financials')) continue;
    seen.add(ev.id);
    if (ev.kind === 'credential') {
      const cr = creds.get(ev.id);
      if (!cr) continue;
      const validTo = readDone<RenewedValue>(c.done, DONE_KEY.renewed(cr.id))?.validTo ?? cr.validTo;
      const holder = d.partners.find((p) => p.credentials.includes(cr))?.name ?? d.company.entities?.find((x) => x.id === cr.holder)?.name ?? c.company;
      out.push(fileOf('06', `cred-${cr.id}`, {
        kind: 'credential', name: `${safe(cr.label.split(':')[0])}${cr.number ? ` ${safe(cr.number)}` : ''}.pdf`, title: cr.label, type: 'PDF',
        source: { channel: 'vault', label: 'From the credentials vault' }, receivedAt: null, dated: 'made', by: nameOf(cr.ownerId),
        tags: [validTo ? `Valid to ${dateText(validTo)}` : 'No expiry'],
        link: { to: `/company?tab=credentials&cred=${encodeURIComponent(cr.id)}`, label: 'Open in Company › Credentials' },
        ...facsimileFile(() => ({
          title: cr.label, issuer: cr.issuer, heading: cr.label, ref: cr.number, to: [holder],
          sections: [{ rows: [
            ['Holder', holder],
            ...(cr.field ? [['Field', cr.field] as [string, FacCell]] : []),
            ...(cr.grade ? [['Grade', String(cr.grade)] as [string, FacCell]] : []),
            ...(cr.score !== undefined ? [['Score', `${cr.score}%`] as [string, FacCell]] : []),
            ['Valid to', validTo ? dateText(validTo) : 'No expiry'],
          ] }],
          footer: 'Copy from the credentials vault · Synthetic document for demonstration',
        }), 1),
      }));
    } else {
      const m = ev.id.match(/^(.*)-fy(\d{4})$/);
      if (!m) continue;
      const [, member, fyText] = m;
      const fy = Number(fyText);
      const partner = d.partners.find((p) => p.id === member);
      const entity = d.company.entities?.find((x) => x.id === member);
      const fin = (partner?.financials ?? entity?.financials ?? d.company.financials).find((f) => f.fy === fy);
      if (!fin) continue;
      const holder = partner?.name ?? entity?.name ?? c.company;
      out.push(fileOf('06', `fin-${ev.id}`, {
        kind: 'credential', name: `${safe(holder)} FY${fy} ${fin.audited ? 'audited' : 'draft'} accounts.pdf`, title: ev.label, type: 'PDF',
        source: { channel: 'vault', label: 'From the credentials vault' }, receivedAt: fin.auditDate ?? null, dated: 'made', by: holder,
        tags: [fin.audited ? 'Audited' : 'Draft'],
        link: { to: '/company?tab=credentials', label: 'Open in Company › Credentials' },
        ...facsimileFile(() => ({
          title: `${holder} FY${fy} accounts`, issuer: holder, heading: `Financial statements, FY${fy}`,
          sections: [{ rows: [
            ['Turnover', money(fin.turnover.amount, fin.turnover.ccy, { full: true })],
            ...(fin.netWorth ? [['Net worth', money(fin.netWorth.amount, fin.netWorth.ccy, { full: true })] as [string, FacCell]] : []),
            ...(fin.currentRatio ? [['Current ratio', fin.currentRatio.toFixed(2)] as [string, FacCell]] : []),
            ['Audit', fin.audited ? `Audited${fin.auditDate ? `, signed ${dateText(fin.auditDate)}` : ''}` : `Not yet audited${fin.auditDate ? `: expected ${dateText(fin.auditDate)}` : ''}`],
          ] }],
        }), 1),
      }));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

export function resultFiles(c: LibCtx): LibraryFileVM[] {
  const { l } = c;
  const r = l.result;
  if (!r || r.result === 'withdrawn') return [];
  const what = r.result === 'won' ? 'Letter of award' : r.result === 'lost' ? 'Regret letter' : 'Notice of cancellation';
  // The award value is our bid price: masked without `see.margin`, as in the commercial proposal.
  const seeValue = !!r.value && c.can('see.margin');
  const paragraphs = r.result === 'won'
    ? [`We are pleased to inform you that ${c.issuer} has awarded ${l.title} to ${c.company}${seeValue ? ` for ${money(r.value!.amount, r.value!.ccy, { full: true })}, excluding VAT` : ''}.`, 'Please provide the performance guarantee and sign the contract within the period stated in the tender documents.']
    : r.result === 'lost'
      ? [`Thank you for your bid for ${l.title}. We regret to inform you that it was not successful.`, ...(r.rank ? [`Your bid ranked ${r.rank[0]} of ${r.rank[1]}.`] : [])]
      : [`${c.issuer} has cancelled the tender for ${l.title}.`, ...(l.closedNote ? [l.closedNote] : [])];
  return [fileOf('07', 'result', {
    kind: 'result', name: fileName(c.prefix, what), title: what, type: 'Letter',
    source: { channel: 'authority', label: 'From the authority' }, receivedAt: r.at, dated: 'received', by: c.issuer,
    tags: [r.result === 'won' ? 'Won' : r.result === 'lost' ? 'Lost' : 'Cancelled'],
    ...(r.result === 'won' && r.value && !seeValue ? { masked: { by: c.holders('see.margin') } } : {}),
    ...facsimileFile(() => ({
      title: `${c.prefix} ${what}`, issuer: c.issuer, heading: what, ref: c.ref ?? l.tenderId, date: docDate(r.at.slice(0, 10)),
      to: [c.company], subject: l.title, signature: { role: 'Tendering Committee', org: c.issuer },
      sections: [{ paragraphs, ...(r.result === 'won' && r.value && !seeValue ? { rows: [['Contract value', { masked: c.holders('see.margin') }]] as [string, FacCell][] } : {}) }],
    }), 1),
  })];
}
