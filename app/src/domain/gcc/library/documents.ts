import type { IntakeEvent, KeyDate } from '@/data/gcc/types';
import type { GateRecord, Lifecycle } from '@/data/gcc/lifecycle';
import { POOLS, type TenantPool } from '@/data/gcc/lifecycle/pools';
import { s1Data } from '@/data/gcc/s1';
import type { CountryCode } from '@/data/tenants';
import { money } from '@/domain/money';
import { DEMO_TODAY, addDays, dateText, isWorkingDay } from '@/domain/calendar';
import { addendaFor, queriesFor as s1QueriesFor, KEY_DATE_LABEL, type AddendumVM } from '@/domain/gcc/s1';
import { dataOf, profileOf } from '@/domain/gcc/s1/common';
import { PROCUREMENT_LABEL } from '@/domain/gcc/dg1/pack';
import { ocrOf, pagesText, readingOf } from '@/domain/gcc/arabic';
import { uploadsOf } from '@/domain/gcc/s1/uploads';
import { facsimileHtml, type FacCell, type FacSection, type FacsimileSpec } from './facsimile';
import { docDate, fileOf, nameOf, sourceVM, type LibCtx } from './context';
import { fileName, no2, safe } from './names';
import type { LibraryFileVM } from './types';

/**
 * 01 Tender documents and 02 Correspondence (plan 030 Design). Every tender
 * has its notice as captured; the booklet and BOQ where the demo holds them,
 * else, once we pursued it, a booklet extract built from its data (plan 033);
 * one file per addendum; every further copy that arrived; the queries to the
 * employer, the booklet receipt and the portal's submission receipt.
 */

export const INTAKE_AGENT = 'Intake & Extraction agent';

/** Pages a facsimile will print: one, plus one per section that starts a page. */
export const pagesOf = (spec: FacsimileSpec) => 1 + spec.sections.slice(1).filter((s) => s.newPage).length;

/** A facsimile file: its spec is built only when it is viewed. */
export function facsimileFile(spec: () => FacsimileSpec, pages?: number): Pick<LibraryFileVM, 'view' | 'extent'> {
  return { view: { kind: 'html', html: () => facsimileHtml(spec()) }, ...(pages ? { extent: { n: pages, unit: 'page' } } : {}) };
}

/** The BOQ CSV beside a demo booklet in `public/bids/gcc/`: every one there has one (plans 005, 022, 023). */
export const boqOf = (url: string): string | null => (url.startsWith('/bids/gcc/') ? url.replace(/-(booklet(-ar)?|ITT)\.pdf$/, '-BOQ.csv') : null);

const fileOfUrl = (url: string) => decodeURIComponent(url.split('/').pop() ?? url);

/** This tender's intake events that brought its documents (not addenda), oldest first. */
const arrivalsOf = (c: LibCtx): IntakeEvent[] =>
  dataOf(c.tenant).intakeToday.filter((e) => e.tenderId === c.l.tenderId && e.docType !== 'Addendum').sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));

/** The notice's own date: its publication date, else the day we captured it. */
const issuedOf = (c: LibCtx) => docDate((c.t?.keyDates.find((k) => k.kind === 'published')?.date) ?? (c.t?.intake.capturedAt ?? c.l.capturedAt).slice(0, 10));

const whereOf = (c: LibCtx) => [c.t?.city ?? c.l.city, c.t?.country ?? c.l.country].filter(Boolean).join(', ');

/** "Sun 26 Apr 2026, 10:00 · Hospital site gate", as a notice lists a key date. */
const keyDateText = (k: Pick<KeyDate, 'date' | 'time' | 'place'>) => `${dateText(k.date)}${k.time ? `, ${k.time}` : ''}${k.place ? ` · ${k.place}` : ''}`;

// ---------------------------------------------------------------------------
// The notice as captured

function noticeSpec(c: LibCtx, kind: 'notice' | 'letter' | 'email'): FacsimileSpec {
  const { l, t } = c;
  const src = c.source(t?.sourceId ?? l.source.sourceId);
  const where = whereOf(c);
  const rows: [string, string][] = [
    ['Tender', t?.title ?? l.title],
    ...(c.ref ? [['Reference', c.ref] as [string, string]] : []),
    ['Issued by', c.issuer],
    ...(t ? [['Procurement', PROCUREMENT_LABEL[t.procurement]] as [string, string]] : []),
    ...(where ? [['Location', where] as [string, string]] : []),
    ['Sector', t?.sector ?? l.sector],
  ];
  const value = t?.value ?? l.value;
  if (value.basis === 'published' && value.amount) rows.push(['Estimated value', money(value.amount, value.ccy, { full: true })]);

  const dates = t?.keyDates.length
    ? t.keyDates.map((k) => [KEY_DATE_LABEL[k.kind], keyDateText(k)])
    : l.submissionDeadline ? [[KEY_DATE_LABEL.submission, keyDateText(l.submissionDeadline)]] : [];

  const sections: FacSection[] = [];
  const reading = readingOf(c.doc?.record);
  const arabic = (arrivalsOf(c)[0]?.language === 'AR') || c.doc?.lang === 'ar';
  if (kind === 'letter') {
    sections.push({ paragraphs: [
      `${c.issuer} invites ${c.company} to submit a bid for ${t?.title ?? l.title}${where ? `, ${where}` : ''}.`,
      'The tender documents set out the scope, the conditions and how to submit. Please confirm receipt of this letter and your intention to bid.',
    ] });
  } else if (kind === 'email') {
    sections.push({ paragraphs: [
      'Dear Sir or Madam,',
      `Please find the invitation to tender for ${t?.title ?? l.title} below${c.doc ? ', with the tender documents attached' : ''}.`,
    ] });
  }
  sections.push({ heading: 'The tender', rows });
  if (dates.length) sections.push({ heading: 'Key dates', rows: dates as [string, string][] });
  if (t?.documentFee) {
    sections.push({ heading: 'Tender documents', paragraphs: [`The tender documents may be obtained for a non-refundable fee of ${money(t.documentFee.amount, t.documentFee.ccy, { full: true })}${src ? ` through ${src.name}` : ''}.`] });
  }
  if (t?.sourceDetail || arabic) {
    sections.push({ note: [
      arabic ? `Read from the Arabic original by the ${INTAKE_AGENT}. The Arabic text prevails.` : '',
      t?.sourceDetail ? `Logged at intake as: ${t.sourceDetail}.` : '',
    ].filter(Boolean).join(' ') });
  }

  const date = issuedOf(c);
  const titleAr = reading?.titleAr;
  const base: FacsimileSpec = {
    title: `${c.prefix} ${kind === 'notice' ? 'Tender notice' : kind === 'letter' ? 'Letter of invitation' : 'Invitation email'}`,
    issuer: c.issuer, issuerLines: where ? [where] : undefined,
    ref: c.ref ?? undefined, date, sections,
    scanned: src?.kind === 'scan',
    ...(titleAr ? { lang: 'ar' as const, subject: titleAr } : {}),
  };
  if (kind === 'letter') return { ...base, heading: 'Letter of invitation', to: [c.company], subject: base.subject ?? t?.shortTitle ?? l.shortTitle, signature: { role: 'Tendering Committee', org: c.issuer } };
  if (kind === 'email') {
    return {
      ...base, ref: undefined, date: undefined,
      email: {
        from: `Tendering, ${c.issuer}`, to: src?.name ?? c.company, subject: `${c.ref ? `${c.ref}: ` : ''}Invitation to tender, ${t?.shortTitle ?? l.shortTitle}`,
        received: docDate(t?.intake.capturedAt ?? l.capturedAt) ?? '',
        ...(c.doc ? { attachments: [fileOfUrl(c.doc.url)] } : {}),
      },
    };
  }
  return { ...base, heading: 'Tender notice' };
}

function noticeFile(c: LibCtx): LibraryFileVM {
  const { l, t } = c;
  const sourceId = t?.sourceId ?? l.source.sourceId;
  const kind = c.source(sourceId)?.kind;
  const as = kind === 'scan' ? 'letter' : kind === 'mailbox' ? 'email' : 'notice';
  const spec = () => noticeSpec(c, as);
  const arabic = arrivalsOf(c)[0]?.language === 'AR';
  return fileOf('01', 'notice', {
    kind: 'notice',
    name: as === 'email' ? fileName(c.prefix, 'Invitation email', 'eml') : fileName(c.prefix, as === 'letter' ? 'Letter of invitation' : 'Tender notice'),
    title: as === 'email' ? 'Invitation email' : as === 'letter' ? 'Letter of invitation' : 'Tender notice',
    type: as === 'email' ? 'Email' : as === 'letter' ? 'Letter' : 'PDF',
    ...(arabic ? { lang: 'AR' as const } : {}),
    ...(kind === 'scan' ? { scanned: true } : {}),
    source: sourceVM(c, sourceId),
    receivedAt: t?.intake.capturedAt ?? l.capturedAt, dated: 'received',
    by: c.issuer,
    ...facsimileFile(spec, pagesOf(spec())),
  });
}

// ---------------------------------------------------------------------------
// The documents the demo holds

function heldFiles(c: LibCtx): LibraryFileVM[] {
  const d = c.doc;
  if (!d) return [];
  const t = c.t;
  const arrival = arrivalsOf(c)[0];
  const at = arrival?.receivedAt ?? t?.intake.purchasedAt ?? t?.intake.capturedAt ?? c.l.capturedAt;
  const source = sourceVM(c, arrival?.sourceId ?? t?.sourceId ?? c.l.source.sourceId);
  const ocr = ocrOf(d.record);
  const out: LibraryFileVM[] = [fileOf('01', 'booklet', {
    kind: 'booklet', name: fileOfUrl(d.url), title: d.title, type: 'PDF',
    ...(d.lang === 'ar' ? { lang: 'AR' as const } : {}),
    ...(d.scanned ? { scanned: true, ...(ocr.pages.length ? { ocrText: pagesText(ocr.pages) } : {}) } : {}),
    source, receivedAt: at, dated: 'received', by: c.issuer, extent: { n: d.record.pages, unit: 'page' },
    view: { kind: 'url', src: d.url },
  })];
  const boq = boqOf(d.url);
  if (boq) {
    out.push(fileOf('01', 'boq', {
      kind: 'boq', name: fileOfUrl(boq), title: 'Bill of quantities (extract)', type: 'CSV',
      ...(d.lang === 'ar' ? { lang: 'EN+AR' as const } : {}),
      source, receivedAt: at, dated: 'received', by: c.issuer, view: { kind: 'csv', src: boq },
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// The booklet extract (plan 033): a tender we pursued whose booklet the demo doesn't hold

/** The first DG1 Pursue: once we pursued a tender we hold its booklet, even if the decision was later re-opened. */
export const dg1PursueOf = (l: Lifecycle): GateRecord | null => l.gates.find((g) => g.gate === 'DG1' && g.decision === 'pursue') ?? null;

/** Working hours, as the lifecycles keep them (`data/gcc/lifecycle/fold.ts`): 08:00 to 17:00 on a working day. */
const WORK_FROM_MIN = 8 * 60;
const WORK_TO_MIN = 17 * 60;
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** `iso` plus some working hours in a calendar: time after 17:00, on a weekend or a closure carries to the next working day from 08:00. */
export function plusWorkingHours(iso: string, hours: number, cc: CountryCode): string {
  let day = iso.slice(0, 10);
  let min = iso.length > 10 ? Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) : WORK_FROM_MIN;
  let left = Math.round(hours * 60);
  for (;;) {
    if (!isWorkingDay(day, cc) || min >= WORK_TO_MIN) { day = addDays(day, 1); min = WORK_FROM_MIN; continue; }
    min = Math.max(min, WORK_FROM_MIN);
    if (left <= WORK_TO_MIN - min) return `${day}T${hhmm(min + left)}`;
    left -= WORK_TO_MIN - min;
    min = WORK_TO_MIN;
  }
}

/**
 * When the booklet reached us: bought through the portal (`intake.purchasedAt`, the date of the receipt in 02),
 * else downloaded two working hours after the DG1 Pursue, in the company's calendar. A Pursue recorded in the
 * demo (on demo day; no seeded one is) dates it at the Pursue's own minute, so it is never later than the demo
 * clock (orchestrator decision, 2026-09-29).
 */
export const bookletAt = (c: LibCtx, pursue: GateRecord): string =>
  c.t?.intake.purchasedAt ?? (pursue.at.slice(0, 10) >= DEMO_TODAY ? pursue.at : plusWorkingHours(pursue.at, 2, profileOf(c.tenant).countryCode));

/** The work the title names: what follows the city ("Madinah WTP expansion"), else the longest work type of the sector's pool in it. */
function worksOf(c: LibCtx): string | null {
  const title = c.t?.title ?? c.l.title;
  const city = c.t?.city ?? c.l.city;
  const t = title.toLowerCase();
  if (city && t.startsWith(`${city.toLowerCase()} `)) return title.slice(city.length + 1);
  const pool = (POOLS as Record<string, TenantPool | undefined>)[c.tenant]?.sectors[c.t?.sector ?? c.l.sector]?.works ?? [];
  return pool.filter((w) => t.includes(w.toLowerCase())).sort((a, b) => b.length - a.length)[0] ?? null;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The booklet's parts, as its contents page lists them. The extract carries no page numbers: it isn't the whole booklet. */
const BOOKLET_PARTS = ['Instructions to tenderers', 'Conditions of contract', 'Scope of works', 'Bill of quantities', 'Forms and bonds'];

/**
 * The booklet extract, from the tender's data only (plan 033 Design §1): a cover and the contents, the
 * instructions to tenderers, the requirements, the scope of works and a closing note. A section with no data
 * is left out, never filled with made-up text.
 */
export function bookletSpec(c: LibCtx, arabic: boolean): FacsimileSpec {
  const { l, t } = c;
  const src = c.source(t?.sourceId ?? l.source.sourceId);
  const where = whereOf(c);
  const issued = issuedOf(c);

  // 1–2. Cover and contents.
  const cover: [string, FacCell][] = [
    ['Tender', t?.title ?? l.title],
    ...(c.ref ? [['Reference', c.ref] as [string, FacCell]] : []),
    ['Issued by', c.issuer],
    ...(t ? [['Procurement', PROCUREMENT_LABEL[t.procurement]] as [string, FacCell]] : []),
    ...(where ? [['Location', where] as [string, FacCell]] : []),
    ...(issued ? [['Issued', issued] as [string, FacCell]] : []),
  ];
  const sections: FacSection[] = [{ rows: cover }, { heading: 'Contents', list: BOOKLET_PARTS }];

  // 3. Instructions to tenderers: the key dates, where to submit, the fee, the bid validity and the bid bond.
  const kd = t?.keyDates ?? [];
  const byKind = (k: KeyDate['kind']) => kd.find((x) => x.kind === k);
  const events = kd.length
    ? kd.filter((k) => k.kind !== 'published' && k.kind !== 'validity-end' && k.kind !== 'bond-validity-end')
    : l.submissionDeadline ? [{ kind: 'submission' as const, ...l.submissionDeadline }] : [];
  const bond = s1Data(c.tenant).bonds.find((b) => b.tenderId === l.tenderId);
  const bondValid = byKind('bond-validity-end');
  const bondText = bond?.bidAmount ? money(bond.bidAmount, (t?.value ?? l.value).ccy, { full: true })
    : bond?.bidPct ? `${bond.bidPct}% of the tender price` : null;
  const validity = byKind('validity-end');
  const portal = src && (src.kind === 'portal' || src.kind === 'client-portal') ? src.name : null;
  const instructions: [string, FacCell][] = [
    ...events.map((k) => [KEY_DATE_LABEL[k.kind], keyDateText(k)] as [string, FacCell]),
    ...(portal ? [['Where to submit', `Electronically, through ${portal}`] as [string, FacCell]] : []),
    ...(t?.documentFee ? [['Tender documents', `A non-refundable fee of ${money(t.documentFee.amount, t.documentFee.ccy, { full: true })}`] as [string, FacCell]] : []),
    ...(validity ? [['Bid validity', `Until ${dateText(validity.date)}`] as [string, FacCell]] : []),
    ...(bondText ? [['Bid bond', `${bondText}${bondValid ? `, valid to ${dateText(bondValid.date)}` : bond?.bidValidityDays ? `, valid for ${bond.bidValidityDays} days from bid opening` : ''}`] as [string, FacCell]] : []),
  ];
  const body: FacSection[] = [];
  if (instructions.length) body.push({ heading: 'Instructions to tenderers', rows: instructions });

  // 4. Eligibility and requirements, where the register row holds them, on a page of their own. Pages are the full booklet's.
  const reqs = t?.requirements ?? [];
  if (reqs.length) {
    body.push({ heading: 'Eligibility and requirements', table: { head: ['Item', 'Requirement', 'Booklet page'], align: ['l', 'l', 'r'], rows: reqs.map((r) => [r.id, r.text, String(r.page)]) }, newPage: true });
  }

  // 5. Scope of works: the sector, the work the title names, and the value only where it is published.
  const value = t?.value ?? l.value;
  const works = worksOf(c);
  body.push({ heading: 'Scope of works', rows: [
    ['Sector', t?.sector ?? l.sector],
    ...(works ? [['Works', capital(works)] as [string, FacCell]] : []),
    ...(value.basis === 'published' && value.amount ? [['Estimated value', money(value.amount, value.ccy, { full: true })] as [string, FacCell]] : []),
  ] });

  // 6. The closing note. No data holds the full booklet's page count for these tenders, so its sentence is left out.
  body.push({ note: [
    arabic ? `Read from the Arabic original by the ${INTAKE_AGENT}. The Arabic text prevails.` : '',
    'Extract prepared from the tender record for this demonstration.',
  ].filter(Boolean).join(' ') });

  body[0].newPage = true;
  return {
    title: `${c.prefix} Tender booklet (extract)`, issuer: c.issuer, issuerLines: where ? [where] : undefined,
    heading: 'Tender booklet', ref: c.ref ?? undefined, date: issued,
    sections: [...sections, ...body], scanned: src?.kind === 'scan',
  };
}

function bookletExtract(c: LibCtx): LibraryFileVM[] {
  const pursue = dg1PursueOf(c.l);
  if (c.doc || !pursue) return [];
  const sourceId = c.t?.sourceId ?? c.l.source.sourceId;
  const scan = c.source(sourceId)?.kind === 'scan';
  const arabic = arrivalsOf(c)[0]?.language === 'AR';
  const spec = () => bookletSpec(c, arabic);
  return [fileOf('01', 'booklet-extract', {
    kind: 'booklet-extract', name: fileName(c.prefix, 'Tender booklet (extract)'), title: 'Tender booklet (extract)', type: 'PDF',
    ...(arabic ? { lang: 'AR' as const } : {}),
    ...(scan ? { scanned: true } : {}),
    source: sourceVM(c, sourceId), receivedAt: bookletAt(c, pursue), dated: 'received', by: c.issuer, tags: ['Extract'],
    ...facsimileFile(spec, pagesOf(spec())),
  })];
}

// ---------------------------------------------------------------------------
// Addenda

function addendumSpec(c: LibCtx, a: AddendumVM): FacsimileSpec {
  const sections: FacSection[] = [{ paragraphs: [`Addendum No. ${a.no} to the tender documents for ${c.t?.title ?? c.l.title}. It forms part of the tender documents.`, a.summary] }];
  if (a.diff.dates.length) {
    sections.push({ heading: 'Dates', table: { head: ['Date', 'Was', 'Now'], rows: a.diff.dates.map((d) => [d.label, dateText(d.from.slice(0, 10)), dateText(d.to.slice(0, 10))]) } });
  } else if (a.diff.datesNote) sections.push({ heading: 'Dates', paragraphs: [a.diff.datesNote] });
  if (a.diff.boq.length) {
    sections.push({ heading: 'Bill of quantities', table: { head: ['Item', 'Was', 'Now'], rows: a.diff.boq.map((b) => [`${b.item}${b.topic ? ` ${b.topic}` : ''}`, b.from, b.to]) } });
  }
  if (a.diff.clauses.length) {
    sections.push({ heading: 'Clauses', table: { head: ['Clause', 'Was', 'Now'], rows: a.diff.clauses.map((x) => [`${x.clause} (p. ${x.page})`, x.from, x.to]) } });
  }
  sections.push({ paragraphs: ['All other terms of the tender documents remain unchanged.'] });
  return {
    title: `${c.prefix} Addendum ${no2(a.no)}`, issuer: c.issuer, heading: `Addendum No. ${a.no}`, ref: a.ref, date: docDate(a.receivedAt.slice(0, 10)),
    to: ['All tenderers'], sections, signature: { role: 'Tendering Committee', org: c.issuer },
  };
}

function addendumFiles(c: LibCtx): LibraryFileVM[] {
  const events = dataOf(c.tenant).intakeToday;
  return addendaFor(c.tenant, c.l.tenderId).map((a) => {
    const ev = events.find((e) => e.id === a.intakeEventId);
    return fileOf('01/addenda', a.id, {
      kind: 'addendum', name: fileName(c.prefix, `Addendum ${no2(a.no)}`), title: `Addendum ${a.no}`, type: 'PDF',
      source: sourceVM(c, ev?.sourceId ?? c.t?.sourceId ?? c.l.source.sourceId), receivedAt: a.receivedAt, dated: 'received', by: c.issuer,
      tags: a.packStale ? ['Pack marked stale'] : [],
      ...facsimileFile(() => addendumSpec(c, a), a.pages),
    });
  });
}

// ---------------------------------------------------------------------------
// Received copies: every further copy of a document that arrived (spec §6.8: one tender, one ID)

function copyFiles(c: LibCtx, first: LibraryFileVM): LibraryFileVM[] {
  const out: LibraryFileVM[] = [];
  const dup = `Duplicate of ${first.name}`;
  // Further intake events of this tender: the first brought the documents.
  arrivalsOf(c).slice(1).forEach((e) => {
    out.push(fileOf('01/copies', e.id, {
      kind: 'copy', name: c.doc ? fileOfUrl(c.doc.url) : safe(`${e.ref} ${e.docType}.pdf`), title: `${e.docType}, a further copy`, type: 'PDF',
      ...(e.language !== 'EN' ? { lang: e.language === 'AR' ? 'AR' as const : 'EN+AR' as const } : {}),
      source: sourceVM(c, e.sourceId), receivedAt: e.receivedAt, dated: 'received', by: c.issuer, tags: [dup],
      view: first.view, ...(first.extent ? { extent: first.extent } : {}),
    }));
  });
  // Uploads in the demo, matched to this tender by file name.
  for (const u of uploadsOf(c.done, c.l.tenderId)) {
    u.times.forEach((x, i) => {
      const who = nameOf(x.byId);
      const held = !!c.doc && u.docKey === c.doc.docKey;
      out.push(fileOf('01/copies', `${u.key}:${i}`, {
        kind: 'copy', name: u.file, title: 'Uploaded copy', type: 'PDF',
        source: { channel: 'upload', label: `Upload by ${who ?? 'a colleague'}` }, receivedAt: x.at, dated: 'received', by: who,
        tags: [held ? dup : `Linked to ${c.l.tenderId}`, 'Recognised by file name (demo)'],
        view: held ? { kind: 'url', src: c.doc!.url } : first.view,
        ...(held ? { extent: { n: c.doc!.record.pages, unit: 'page' as const } } : {}),
      }));
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 02 Correspondence

function correspondence(c: LibCtx): LibraryFileVM[] {
  const { l, t } = c;
  const out: LibraryFileVM[] = [];
  const src = t ? c.source(t.sourceId) : undefined;

  // Queries to the employer: the agent's drafts, and those a person approved or sent.
  const q = t ? s1QueriesFor(c.tenant, l.tenderId, c.done) : null;
  q?.items.forEach((x, i) => {
    const sent = x.state === 'sent';
    const who = nameOf(x.byId);
    const spec = (): FacsimileSpec => ({
      title: `${c.prefix} Query ${no2(i + 1)}`, issuer: c.company, heading: 'Request for clarification',
      ref: c.ref ? `${c.ref} · Q${no2(i + 1)}` : `Q${no2(i + 1)}`, date: docDate((x.at ?? t?.intake.loggedAt ?? l.capturedAt).slice(0, 10)),
      to: [c.issuer, 'Tendering Committee'], subject: `${x.query.topic} (${x.query.clause}, ${x.pagesText})`,
      sections: [
        { paragraphs: [x.text] },
        { note: sent ? `Sent via ${src?.name ?? 'the portal'} (demo: nothing leaves the app).` : x.state === 'approved' ? `Approved by ${who}; not yet sent.` : `Drafted by the ${INTAKE_AGENT}. A recommendation: a person edits, approves and sends it.` },
      ],
      signature: sent || x.state === 'approved' ? { name: who ?? undefined, org: c.company } : undefined,
    });
    out.push(fileOf('02', x.query.id, {
      kind: 'query', name: fileName(c.prefix, `Query ${no2(i + 1)} ${safe(x.query.topic)}`), title: `Query ${i + 1}: ${x.query.topic}`, type: 'Letter',
      source: sent ? { channel: 'person', label: `Sent by ${who}` } : x.state === 'approved' ? { channel: 'person', label: `Approved by ${who}` } : { channel: 'agent', label: `Drafted by the ${INTAKE_AGENT}` },
      receivedAt: x.at ?? t?.intake.loggedAt ?? null, dated: sent ? 'sent' : 'made', by: x.at ? who : INTAKE_AGENT,
      tags: [sent ? 'Sent' : x.state === 'approved' ? 'Approved' : 'Draft'],
      ...facsimileFile(spec, 1),
    }));
  });

  // The booklet bought through the portal.
  if (t?.intake.purchasedAt && t.documentFee) {
    const fee = t.documentFee;
    const paid = t.intake.purchasedAt;
    out.push(fileOf('02', 'receipt', {
      kind: 'receipt', name: fileName(c.prefix, 'Booklet purchase receipt'), title: 'Booklet purchase receipt', type: 'PDF',
      source: sourceVM(c, t.sourceId), receivedAt: paid, dated: 'received', by: src?.name ?? c.issuer,
      ...facsimileFile(() => ({
        title: `${c.prefix} Booklet purchase receipt`, issuer: src?.name ?? c.issuer, heading: 'Payment receipt', date: docDate(paid),
        sections: [{ rows: [['Paid by', c.company], ['For', `Tender documents, ${c.ref ?? l.tenderId}`], ['Issuer', c.issuer], ['Amount', money(fee.amount, fee.ccy, { full: true })], ['Paid', docDate(paid) ?? '']] }],
      }), 1),
    }));
  }

  // The portal's receipt for the submission.
  const s = l.submission;
  if (s?.receipt) {
    out.push(fileOf('02', 'submission-receipt', {
      kind: 'receipt', name: fileName(c.prefix, 'Submission receipt'), title: 'Submission receipt', type: 'PDF',
      source: { channel: 'portal', label: s.portal }, receivedAt: s.at, dated: 'received', by: s.portal,
      ...facsimileFile(() => ({
        title: `${c.prefix} Submission receipt`, issuer: s.portal, heading: 'Bid submission receipt', ref: s.receipt, date: docDate(s.at),
        sections: [{ rows: [['Tender', l.title], ...(c.ref ? [['Reference', c.ref] as [string, string]] : []), ['Bidder', c.company], ['Received', docDate(s.at) ?? ''], ['Deadline', docDate(s.deadline) ?? ''], ['Receipt number', s.receipt!]] }],
      }), 1),
    }));
  }
  return out;
}

/** 01 and 02. Further copies are of the document that arrived: the held booklet, else the notice. */
export function documentFiles(c: LibCtx): LibraryFileVM[] {
  const notice = noticeFile(c);
  const held = heldFiles(c);
  return [notice, ...held, ...bookletExtract(c), ...addendumFiles(c), ...copyFiles(c, held[0] ?? notice), ...correspondence(c)];
}
