// Content of the synthetic tender document for the second demo tender (plan 022): Vol. 1 of an
// Abu Dhabi hospital MEP works package, CBHH/PRJ/2026/011, page by page. It follows plan 022's fact
// sheet and gcc-demo-data §4A; the extraction record (src/data/extracted/gcc/cbhh-011.ts) cites these
// pages. Everything here is fictional: the employer, the hospital, the reference and the contacts.
// Rules for editing: keep every ANCHORS text verbatim on its page; keep each EXCLUSIVE text on one page;
// never write that any Arabic text prevails (the tender is governed by its English text, clause 7);
// never print a price or a rate in the bill of quantities.

export const PAGE_COUNT = 20;

/**
 * The PDF's CreationDate and ModDate: the issue date, Sun 8 Mar 2026, 07:00 Gulf Standard Time (build.mjs pins
 * both, so a rebuild writes the same bytes and the file is never dated after the demo's "today").
 */
export const PDF_DATE = "D:20260308070000+04'00'";

export const OUTPUT = {
  pdf: 'public/bids/gcc/CBHH-PRJ-2026-011-ITT.pdf',
  csv: 'public/bids/gcc/CBHH-PRJ-2026-011-BOQ.csv',
};

export const META = {
  country: 'United Arab Emirates · Emirate of Abu Dhabi',
  issuer: 'Crescent Bay Health Holding',
  department: 'Capital Projects Office, acting as Project Manager',
  booklet: 'Invitation to Tender: Instructions, Conditions and Scope of Works',
  title: 'MEP Works Package for the 220-Bed Crescent Bay Specialist Hospital, Abu Dhabi',
  ref: 'CBHH/PRJ/2026/011',
  issueDate: 'Sunday 8 March 2026',
  city: 'Abu Dhabi',
  method: 'Open tender, single envelope with separate technical and commercial volumes, through the Abu Dhabi government procurement portal',
  volume: 'Volume 1 of 3. Volume 2 (Bill of Quantities) and Volume 3 (Drawings) are issued with it.',
  header: 'CBHH · Invitation to Tender · CBHH/PRJ/2026/011',
  watermark: 'Synthetic document for demonstration',
  coverNote: 'The main civil and structural works are let under a separate contract. This package covers the mechanical, electrical, plumbing, medical gas, fire and ELV works, with interface and commissioning support.<br>The English text of the Tender Documents governs (clause 7).',
  disclaimer: 'Synthetic document produced for a software demonstration. The employer, hospital, reference number and contact details are fictional.',
  boqLines: 186,
};

// Page anchors: verify.mjs checks that each text appears verbatim on its page. `catch` is the
// deliberate catch number in plan 022 (1 bond validity, 2 chiller capacity, 3 undated answers,
// 4 medical gas installer, 5 chamber without an emirate).
export const ANCHORS = [
  { page: 1, text: 'CBHH/PRJ/2026/011' },
  { page: 3, text: 'Site visit: Wednesday 11 March 2026, 10:00' },
  { page: 3, text: 'Deadline for questions: Thursday 19 March 2026' },
  { page: 3, text: 'Tender submission deadline: Tuesday 21 April 2026, 14:00' },
  { page: 4, text: 'Wednesday 11 March 2026 at 10:00' },
  { page: 4, text: 'no later than Thursday 19 March 2026' },
  { page: 4, text: 'issued to all tenderers as a circular', catch: 3 },
  { page: 5, text: 'The English text of the Tender Documents shall govern' },
  { page: 5, text: 'exclusive of value added tax' },
  { page: 5, text: 'VAT at 5%' },
  { page: 5, text: '120 days from the Tender Submission Date' },
  { page: 6, text: 'AED 2,000,000 (two million UAE dirhams)' },
  { page: 6, text: 'The tender bond shall remain valid for one hundred and twenty (120) days', catch: 1 },
  { page: 6, text: 'Tuesday 21 April 2026 at 14:00' },
  { page: 7, text: 'pass mark of 70' },
  { page: 7, text: '25% of the commercial evaluation' },
  { page: 7, text: 'Tuesday 21 April 2026 at 15:00' },
  { page: 8, text: 'The ruling language is English' },
  { page: 8, text: '10% of the Accepted Contract Amount' },
  { page: 8, text: 'more than 35% of the Accepted Contract Amount' },
  { page: 9, text: 'twenty-six (26) months' },
  { page: 9, text: '0.1% of the Contract Price for each day of delay' },
  { page: 9, text: 'maximum of 10% of the Contract Price' },
  { page: 9, text: 'twenty-four (24) months' },
  { page: 9, text: 'advance payment of up to 10%' },
  { page: 9, text: 'half of the Retention Money' },
  { page: 9, text: 'within sixty (60) days' },
  { page: 10, text: '220 beds' },
  { page: 11, text: 'three (3) water-cooled centrifugal chillers of 1,500 TR each', catch: 2 },
  { page: 13, text: 'an installer approved for medical gas pipeline systems', catch: 4 },
  { page: 13, text: 'HTM 02-01 or NFPA 99' },
  { page: 14, text: '1,750 TR each', catch: 2 },
  { page: 15, text: 'MEP, first grade' },
  { page: 15, text: 'Chamber of Commerce and Industry', catch: 5 },
  { page: 15, text: 'Civil Defence' },
  { page: 15, text: 'In-Country Value (ICV) certificate' },
  { page: 15, text: 'AED 100,000,000' },
  { page: 15, text: 'seven (7) years' },
  { page: 15, text: 'AED 400,000,000' },
  { page: 15, text: '15 years' },
  { page: 18, text: 'Drawings list' },
  { page: 19, text: 'one hundred and fifty (150) days', catch: 1 },
  { page: 20, text: 'Form of Tender' },
];

// Texts that must appear on one page only, so that each side of a conflict has exactly one page.
export const EXCLUSIVE = [
  { page: 6, text: 'remain valid for one hundred and twenty (120) days' },
  { page: 19, text: '(150) days' },
  { page: 11, text: '1,500 TR' },
  { page: 14, text: '1,750 TR' },
];

// Texts that must appear nowhere. The M-8 "Arabic prevails" flag must not be raised on this tender.
export const NEVER = ['prevail', 'Arabic text'];

// Vol. 2 bill of quantities: the employer's eight work packages, a line count each summing to 186,
// and five representative lines per package (40 in all). Quantities only: the document carries no prices.
export const BILLS = [
  { no: 0, title: 'General requirements and preliminaries', lineCount: 14, items: [
    { item: '0.01', description: 'Mobilisation, site establishment and demobilisation', unit: 'item', qty: 1 },
    { item: '0.03', description: 'MEP site management and supervision staff', unit: 'month', qty: 26 },
    { item: '0.06', description: 'MEP coordination and BIM model to LOD 400, with shop drawings', unit: 'item', qty: 1 },
    { item: '0.09', description: 'Temporary services and protection of installed plant', unit: 'item', qty: 1 },
    { item: '0.12', description: 'Insurances required under Sub-Clause 18', unit: 'item', qty: 1 },
  ] },
  { no: 1, title: 'Chilled water plant', lineCount: 22, items: [
    { item: '1.01', description: 'Water-cooled centrifugal chillers, with starters and controls', unit: 'nr', qty: 3 },
    { item: '1.03', description: 'Induced-draft cooling tower cells, with variable speed fans', unit: 'nr', qty: 3 },
    { item: '1.06', description: 'Primary chilled water pumps, with variable speed drives', unit: 'nr', qty: 4 },
    { item: '1.09', description: 'Condenser water pumps, split-case', unit: 'nr', qty: 4 },
    { item: '1.12', description: 'Chilled water pipework, steel, pre-insulated, DN50–DN500', unit: 'm', qty: 6850 },
  ] },
  { no: 2, title: 'Air-side HVAC', lineCount: 34, items: [
    { item: '2.02', description: 'Air handling units, 100% fresh air, with heat recovery', unit: 'nr', qty: 14 },
    { item: '2.04', description: 'Air handling units, mixed air', unit: 'nr', qty: 24 },
    { item: '2.07', description: 'Fan coil units, ceiling concealed, two-pipe', unit: 'nr', qty: 1150 },
    { item: '2.11', description: 'Galvanised steel ductwork, with insulation', unit: 'm2', qty: 41500 },
    { item: '2.15', description: 'HEPA terminal filter units, theatres and isolation rooms', unit: 'nr', qty: 96 },
  ] },
  { no: 3, title: 'Medical gas pipeline systems', lineCount: 16, items: [
    { item: '3.01', description: 'Vacuum insulated evaporator, liquid oxygen, 20,000 litres', unit: 'item', qty: 1 },
    { item: '3.03', description: 'Medical air plant, triplex compressors with dryers', unit: 'nr', qty: 2 },
    { item: '3.05', description: 'Medical vacuum plant, triplex pumps with bacterial filters', unit: 'nr', qty: 2 },
    { item: '3.08', description: 'Copper pipework for medical gases, cleaned for oxygen service', unit: 'm', qty: 14200 },
    { item: '3.11', description: 'Medical gas terminal units in bed-head units and pendants', unit: 'nr', qty: 1480 },
  ] },
  { no: 4, title: 'LV switchgear, standby power and UPS', lineCount: 24, items: [
    { item: '4.01', description: 'Main LV switchboards, 4,000 A, form 4 type 6', unit: 'nr', qty: 6 },
    { item: '4.04', description: 'Standby diesel generator sets, 2,000 kVA, with fuel system', unit: 'nr', qty: 3 },
    { item: '4.07', description: 'UPS systems, 400 kVA, modular, 15 minutes’ autonomy', unit: 'nr', qty: 4 },
    { item: '4.09', description: 'Isolated power supply panels for theatres and critical care', unit: 'nr', qty: 34 },
    { item: '4.13', description: 'LV cables and busbar trunking, installed and tested', unit: 'm', qty: 38600 },
  ] },
  { no: 5, title: 'Fire fighting and fire alarm', lineCount: 20, items: [
    { item: '5.02', description: 'Fire pump set: electric, diesel and jockey pumps', unit: 'set', qty: 1 },
    { item: '5.05', description: 'Sprinkler heads, quick response, with pipework and valves', unit: 'nr', qty: 9800 },
    { item: '5.08', description: 'Wet risers with landing valves and hose reels', unit: 'nr', qty: 48 },
    { item: '5.11', description: 'Addressable fire alarm system with voice evacuation', unit: 'item', qty: 1 },
    { item: '5.14', description: 'Clean agent suppression, data and imaging equipment rooms', unit: 'nr', qty: 6 },
  ] },
  { no: 6, title: 'Plumbing, drainage and water treatment', lineCount: 30, items: [
    { item: '6.02', description: 'Domestic water transfer and booster pump sets', unit: 'set', qty: 4 },
    { item: '6.05', description: 'Hot water calorifiers with circulation pumps', unit: 'nr', qty: 8 },
    { item: '6.08', description: 'Reverse osmosis water treatment plant for renal dialysis', unit: 'item', qty: 1 },
    { item: '6.11', description: 'Cold and hot water pipework, PPR and copper', unit: 'm', qty: 22400 },
    { item: '6.19', description: 'Sanitary fixtures, hospital grade, with thermostatic mixing', unit: 'nr', qty: 1620 },
  ] },
  { no: 7, title: 'ELV, BMS and nurse call', lineCount: 26, items: [
    { item: '7.02', description: 'Building management system: controllers, devices and head-end', unit: 'point', qty: 6400 },
    { item: '7.05', description: 'Nurse call system with bed-head and bathroom call points', unit: 'nr', qty: 262 },
    { item: '7.08', description: 'Structured cabling, Cat 6A, with outlets and racks', unit: 'point', qty: 5900 },
    { item: '7.11', description: 'CCTV and access control', unit: 'item', qty: 1 },
    { item: '7.14', description: 'Public address, interfaced with the voice evacuation', unit: 'item', qty: 1 },
  ] },
];

export const PARTS = [
  { id: 's1', label: 'Section 1', title: 'Invitation to Tender', clauses: '' },
  { id: 's2', label: 'Section 2', title: 'Instructions to Tenderers', clauses: '1–18' },
  { id: 's3', label: 'Section 3', title: 'Particular Conditions of Contract', clauses: '' },
  { id: 's4', label: 'Section 4', title: 'Scope of MEP Works', clauses: '4.1–4.10' },
  { id: 's5', label: 'Section 5', title: 'Equipment schedule', clauses: '' },
  { id: 's6', label: 'Section 6', title: 'Qualification requirements', clauses: 'Q-01–Q-10' },
  { id: 'boq', label: 'Volume 2', title: 'Bill of quantities: summary by work package (extract)', clauses: '' },
  { id: 'dwg', label: 'Volume 3', title: 'Drawings list', clauses: '' },
  { id: 'annc', label: 'Annex C', title: 'Form of Tender Bond', clauses: '' },
  { id: 'annd', label: 'Annex D', title: 'Form of Tender', clauses: '' },
];

// ---- Block helpers (rendered by template.mjs) ----
// nw() keeps an anchor on one line inside a table cell (pdftotext -layout interleaves wrapped cells).
const nw = (s) => `<span class="nw">${s}</span>`;
const P = (html) => ({ t: 'p', html });
const S = (no, html) => ({ t: 'sub', no, html });
const H = (html) => ({ t: 'h', html });
const L = (items, style = 'alpha') => ({ t: 'list', style, items });
const T = (head, rows, opts = {}) => ({ t: 'table', head, rows, ...opts });
const KV = (rows) => ({ t: 'kv', rows });
const NOTE = (html) => ({ t: 'note', html });
const SIGN = (fields) => ({ t: 'sign', fields });
// Clause headings are free text here: the ITT numbers 1–18, the conditions use FIDIC sub-clause numbers.
const C = (no, title) => ({ t: 'clause', no, title });
const PART = (id) => {
  const p = PARTS.find((x) => x.id === id);
  return { t: 'part', label: p.label, title: p.title };
};
const qty = (n) => n.toLocaleString('en-GB');

function billRows(nos) {
  const rows = [];
  for (const b of BILLS.filter((x) => nos.includes(x.no))) {
    rows.push({ cls: 'bill', cells: [`WP-${b.no}`, `${b.title} · ${b.lineCount} line items, ${b.items.length} shown`], span: 3 });
    for (const it of b.items) rows.push([it.item, it.description, it.unit, qty(it.qty)]);
  }
  return rows;
}
const BOQ_TABLE = (nos) => T(['Item', 'Description', 'Unit', 'Quantity'], billRows(nos), {
  widths: ['14mm', 'auto', '14mm', '22mm'],
  align: ['', '', 'c', 'r'],
});

// ---- Pages ----
export const PAGES = [
  // 1 · Cover
  { n: 1, part: 'cover', blocks: [{ t: 'cover' }] },

  // 2 · Contents and tender documents
  { n: 2, part: 'contents', blocks: [
    { t: 'part', label: 'Contents', title: '' },
    { t: 'contents' },
    H('Tender documents'),
    T(['Volume', 'Content', 'Format'], [
      ['Volume 1', `This document (${PAGE_COUNT} pages): the invitation, instructions to tenderers, particular conditions, scope of works, equipment schedule, qualification requirements, the summary of Volume 2, the drawings list and the tender forms`, 'PDF'],
      ['Volume 2', `Bill of quantities: ${META.boqLines} line items in eight work packages, for pricing`, 'XLSX template and PDF'],
      ['Volume 3', 'Drawings, as listed in this volume', 'PDF'],
      ['Separate annexes', 'Annex A Tender submission checklist; Annex B Schedule of key personnel; Annex E ICV declaration; the General Conditions (FIDIC Conditions of Contract for Construction, Second Edition 2017)', 'PDF, on the portal'],
    ], { widths: ['28mm', 'auto', '36mm'] }),
    P('Circulars issued under clause 6 form part of the Tender Documents. Tenderers shall acknowledge each circular in the Form of Tender (Annex D). Where this volume and a separate annex differ, this volume applies until a circular says otherwise.'),
    NOTE('<p>All communication in this tender takes place through the Abu Dhabi government procurement portal (the Portal). The Employer’s contact in clause 5 is used only when the Portal is unavailable.</p>'),
    P('The Employer is Crescent Bay Health Holding, acting through its Capital Projects Office as Project Manager. The Crescent Bay Specialist Hospital is being built on the Employer’s Crescent Bay campus. The main civil and structural contractor is already on site under a separate contract; the successful tenderer for this package will work alongside it.'),
  ] },

  // 3 · Section 1: Invitation to Tender
  { n: 3, part: 's1', blocks: [
    PART('s1'),
    P('Sunday 8 March 2026'),
    P('To: prospective tenderers registered on the Portal'),
    P('<strong>Tender CBHH/PRJ/2026/011: MEP works package for the 220-bed Crescent Bay Specialist Hospital, Abu Dhabi</strong>'),
    P('Crescent Bay Health Holding (the Employer) invites tenders from qualified contractors for the mechanical, electrical, plumbing, medical gas, fire protection and extra-low-voltage works of its new specialist hospital. The works comprise design development and coordination, supply, installation, testing and commissioning of the systems described in Section 4, with support for the commissioning of the whole building.'),
    P('The tender is an open tender. Tenderers submit one envelope through the Portal, containing a technical volume and a commercial volume, as clause 11 describes. The technical volume is evaluated first; only technically compliant tenders proceed to commercial evaluation (clause 16).'),
    H('Timetable'),
    L([
      'Publication on the Portal: Sunday 8 March 2026',
      'Site visit: Wednesday 11 March 2026, 10:00',
      'Deadline for questions: Thursday 19 March 2026',
      'Answers to questions: by circular (clause 5)',
      'Tender submission deadline: Tuesday 21 April 2026, 14:00',
      'Tender opening: by the Employer’s tender committee (clause 15)',
      'Tender validity: 120 days from the Tender Submission Date (clause 9)',
    ], 'dash'),
    P('Times are Gulf Standard Time. The Employer’s offices are closed on Saturdays and Sundays and on public holidays, including the Eid al-Fitr holiday, whose dates depend on the sighting of the moon.'),
    P('Each tender shall be accompanied by a tender bond (clause 12) and the tenderer’s In-Country Value (ICV) certificate. The ICV score forms part of the commercial evaluation.'),
    P('The Employer is not bound to accept the lowest or any tender, and will not reimburse the cost of preparing a tender. Tenderers should read the whole of this volume before they begin.'),
    SIGN(['Director, Capital Projects Office', 'Crescent Bay Health Holding']),
  ] },

  // 4 · Section 2: ITT clauses 1–5
  { n: 4, part: 's2', blocks: [
    PART('s2'),
    C(1, 'Definitions'),
    P('Words defined in the General Conditions have the same meaning here. In addition: <em>Tender Documents</em> means Volumes 1 to 3, the separate annexes and every circular; <em>Tender Submission Date</em> means the deadline in clause 13; <em>Portal</em> means the Abu Dhabi government procurement portal; <em>Main Contractor</em> means the Employer’s separate civil and structural contractor.'),
    C(2, 'Eligible tenderers'),
    S('2.1', 'A tenderer shall be a company licensed to carry out MEP contracting in the United Arab Emirates, registered on the Portal, and meeting every qualification requirement in Section 6.'),
    S('2.2', 'Joint ventures are not accepted for this package. A tenderer may name specialist subcontractors for the systems Section 4 identifies, subject to the Employer’s approval (Sub-Clause 4.4 of the Particular Conditions).'),
    S('2.3', 'A tenderer, or any company under common control with it, shall submit one tender only.'),
    C(3, 'Tender documents'),
    S('3.1', 'The Tender Documents are issued free of charge through the Portal to registered tenderers. Tenderers are responsible for checking that they hold every page and every drawing listed in this volume.'),
    C(4, 'Site visit'),
    S('4.1', 'A site visit will be held on Wednesday 11 March 2026 at 10:00, starting from the hospital site gate on the Crescent Bay campus. Attendance is optional but recommended. Each tenderer may send up to three representatives, who shall wear the personal protective equipment required on a live construction site.'),
    S('4.2', 'Tenderers shall register their representatives through the Portal by Tuesday 10 March 2026. No questions will be answered at the site visit; questions shall be sent under clause 5.'),
    C(5, 'Clarifications'),
    S('5.1', 'Questions on the Tender Documents shall be submitted through the Portal no later than Thursday 19 March 2026. Questions received after that date may not be answered.'),
    S('5.2', 'Each question shall cite the volume, section, clause and page it concerns.'),
    S('5.3', 'Answers will be issued to all tenderers as a circular, without disclosing the source of the question. Only answers issued by circular bind the Employer.'),
    S('5.4', 'The Employer’s contact, for use only when the Portal is unavailable, is the Tender Administrator, Capital Projects Office, tenders.011@cbhh.example.'),
  ] },

  // 5 · ITT clauses 6–10
  { n: 5, part: 's2', blocks: [
    C(6, 'Circulars and amendments'),
    S('6.1', 'The Employer may amend the Tender Documents by circular at any time before the Tender Submission Date. A circular may extend the Tender Submission Date.'),
    S('6.2', 'Tenderers shall acknowledge every circular in the Form of Tender. A tender that does not acknowledge a circular may be treated as non-compliant.'),
    C(7, 'Language'),
    S('7.1', 'The tender, and all correspondence and documents relating to it, shall be in English.'),
    S('7.2', 'The English text of the Tender Documents shall govern. Where a document is also supplied in another language, it is supplied for convenience only.'),
    S('7.3', 'Supporting documents in another language, such as licences and certificates, shall be accompanied by a certified translation into English.'),
    C(8, 'Currency and prices'),
    S('8.1', 'Prices shall be in UAE dirhams (AED). The Contract is a measured contract: the quantities in Volume 2 are estimates, and the Works will be measured and valued at the tendered rates.'),
    S('8.2', 'Rates shall include all costs of labour, materials, plant, supervision, design development, coordination with the Main Contractor, testing, commissioning, overheads and profit, and every risk and obligation in the Tender Documents.'),
    S('8.3', 'Rates and prices shall be exclusive of value added tax. VAT at 5% shall be shown separately in the Form of Tender and in each invoice.'),
    S('8.4', 'Prices shall not be subject to adjustment for changes in cost during the Contract, except as the Particular Conditions provide.'),
    C(9, 'Tender validity'),
    S('9.1', 'Tenders shall remain valid for acceptance for 120 days from the Tender Submission Date.'),
    S('9.2', 'Before the validity expires, the Employer may ask tenderers to extend it. A tenderer that agrees shall extend its tender bond to match; a tenderer that refuses may withdraw without forfeiting its bond.'),
    C(10, 'Alternative tenders'),
    S('10.1', 'Alternative tenders are not accepted. A tenderer may offer an alternative item of equipment only as a clearly marked option, priced separately, in addition to a compliant tender.'),
    S('10.2', 'Any deviation from the Specification or the Particular Conditions shall be listed in the schedule of deviations in the technical volume. Deviations not listed are deemed withdrawn.'),
  ] },

  // 6 · ITT clauses 11–13: tender composition, tender bond, submission
  { n: 6, part: 's2', blocks: [
    C(11, 'Documents comprising the tender'),
    S('11.1', 'The <strong>technical volume</strong> shall contain: the completed submission checklist (Annex A); the evidence for each qualification requirement in Section 6; the method statement and programme; the schedule of key personnel (Annex B) with CVs; the named specialist subcontractors, with their certificates; the equipment data sheets; and the schedule of deviations.'),
    S('11.2', 'The <strong>commercial volume</strong> shall contain: the Form of Tender (Annex D); the priced bill of quantities; the tender bond (clause 12); the ICV certificate and the ICV declaration (Annex E); and the schedule of payment milestones for the equipment.'),
    S('11.3', 'No price shall appear in the technical volume. A technical volume that discloses a price may be rejected.'),
    C(12, 'Tender bond'),
    S('12.1', 'Each tender shall be accompanied by a tender bond of AED 2,000,000 (two million UAE dirhams), in the form of an unconditional and irrevocable bank guarantee issued by a bank licensed in the United Arab Emirates, in the form at Annex C.'),
    S('12.2', 'The tender bond shall remain valid for one hundred and twenty (120) days from the Tender Submission Date.'),
    S('12.3', 'The original bank guarantee shall be delivered to the Capital Projects Office before the Tender Submission Date, and a scanned copy uploaded with the commercial volume. A tender without a compliant tender bond will be rejected.'),
    S('12.4', 'The tender bond may be forfeited if the tenderer withdraws its tender during the validity period, or if the successful tenderer fails to sign the Contract or to provide the performance security under clause 18.'),
    S('12.5', 'Tender bonds of unsuccessful tenderers will be returned within 30 days of the award.'),
    C(13, 'Submission'),
    S('13.1', 'Tenders shall be submitted through the Portal no later than Tuesday 21 April 2026 at 14:00 (the Tender Submission Date). The Portal closes at that time and does not accept late submissions.'),
    S('13.2', 'Each volume shall be uploaded as searchable PDF files, with the priced bill of quantities also uploaded in the Employer’s XLSX template.'),
    S('13.3', 'The Form of Tender and the schedules shall be signed by a person authorised under a power of attorney, which shall be included in the technical volume.'),
  ] },

  // 7 · ITT clauses 14–18: late tenders, opening, evaluation, award, performance security
  { n: 7, part: 's2', blocks: [
    C(14, 'Late tenders and withdrawal'),
    S('14.1', 'The Portal does not accept a tender after the Tender Submission Date. A tenderer may withdraw or replace its tender through the Portal before that time.'),
    C(15, 'Opening'),
    S('15.1', 'Tenders will be opened by the Employer’s tender committee on Tuesday 21 April 2026 at 15:00. Tenderers are not invited to the opening. The technical volumes are opened first; the commercial volumes of technically compliant tenders are opened after the technical evaluation.'),
    C(16, 'Evaluation'),
    S('16.1', '<strong>Qualification.</strong> Each tenderer is checked against the requirements in Section 6. A tenderer that does not meet a requirement is not evaluated further.'),
    S('16.2', '<strong>Technical evaluation</strong> is scored out of 100 against the criteria below. A tender that does not reach the pass mark of 70 is not evaluated commercially.'),
    T(['Technical criterion', 'Points'], [
      ['Method statement, programme and interface with the Main Contractor', '25'],
      ['Healthcare MEP experience and the key personnel proposed', '25'],
      ['Commissioning, testing and handover approach, including medical gases', '20'],
      ['Specialist subcontractors and equipment proposed', '15'],
      ['Health, safety, quality and environmental management', '15'],
    ], { widths: ['auto', '22mm'], align: ['', 'r'] }),
    S('16.3', '<strong>Commercial evaluation.</strong> The commercial score is the price score weighted at 75% and the ICV score weighted at 25%. The ICV score carries 25% of the commercial evaluation. The price score is the lowest compliant tender price divided by the tender price, times 100; the ICV score is the tenderer’s certified ICV score.'),
    S('16.4', 'Arithmetical errors are corrected on the basis of the rates. A tender that is abnormally low may be rejected after the tenderer has been asked to justify it.'),
    C(17, 'Award'),
    S('17.1', 'The Contract will be awarded to the technically compliant tenderer with the highest commercial score. The Employer will issue a Letter of Acceptance through the Portal.'),
    C(18, 'Performance security'),
    S('18.1', 'Within fourteen (14) days of the Letter of Acceptance, the successful tenderer shall provide the performance security required by Sub-Clause 4.2 of the Particular Conditions and sign the Contract Agreement.'),
  ] },

  // 8 · Section 3: Particular Conditions (1)
  { n: 8, part: 's3', blocks: [
    PART('s3'),
    P('The Contract comprises the General Conditions (the FIDIC Conditions of Contract for Construction, Second Edition 2017) as amended by these Particular Conditions. The sub-clause numbers below are those of the General Conditions.'),
    C('1.4', 'Law and language'),
    S('(a)', 'The Contract is governed by the laws of the Emirate of Abu Dhabi and the federal laws of the United Arab Emirates as they apply there.'),
    S('(b)', 'The ruling language is English. The language for communications is English.'),
    C('1.5', 'Priority of documents'),
    P('The documents forming the Contract take priority in this order: the Contract Agreement; the Letter of Acceptance; the Form of Tender; these Particular Conditions; the General Conditions; the Scope of Works (Section 4) and the Specification; the Drawings; the priced bill of quantities; and the tender.'),
    C('4.2', 'Performance security'),
    S('(a)', 'The performance security shall be an unconditional bank guarantee for 10% of the Accepted Contract Amount, issued by a bank licensed in the United Arab Emirates.'),
    S('(b)', 'It shall remain valid until the Contractor has completed the Works and remedied any defects, and it shall be reduced to 5% of the Accepted Contract Amount on the issue of the Taking-Over Certificate.'),
    C('4.4', 'Subcontractors'),
    S('(a)', 'The Contractor shall not subcontract more than 35% of the Accepted Contract Amount without the Employer’s prior approval, and shall not subcontract the whole of the Works.'),
    S('(b)', 'The specialist systems named in Section 4 (medical gas pipeline systems; fire protection) shall be installed by specialists approved by the Employer and by the relevant authority. Named specialists shall not be replaced without the Employer’s consent.'),
    C('4.6', 'Cooperation and interface'),
    S('(a)', 'The Contractor shall cooperate with the Main Contractor, who controls the site, the hoists and the access routes. The interface schedule in Section 4.3 defines which contractor provides each builder’s work, sleeve, plinth and opening.'),
    S('(b)', 'The Contractor shall attend the weekly coordination meetings chaired by the Project Manager, and shall keep the federated BIM model current.'),
  ] },

  // 9 · Particular Conditions (2)
  { n: 9, part: 's3', blocks: [
    C('8.2', 'Time for completion'),
    P('The Time for Completion is twenty-six (26) months from the Commencement Date, with the milestones in the programme at Section 4.10. Sections of the Works serving the operating theatres and the central plant shall be completed first.'),
    C('8.8', 'Delay damages'),
    P('Delay damages for the Works are 0.1% of the Contract Price for each day of delay, up to a maximum of 10% of the Contract Price. They are the Employer’s only remedy for delay, except for termination under Sub-Clause 15.2.'),
    C('11.3', 'Defects notification period'),
    P('The Defects Notification Period is twenty-four (24) months from the date of the Taking-Over Certificate. For the medical gas pipeline systems and the chillers, the Contractor shall also pass on to the Employer the manufacturers’ warranties.'),
    C('14.2', 'Advance payment'),
    S('(a)', 'The Employer will make an advance payment of up to 10% of the Accepted Contract Amount, on receipt of an advance payment guarantee of equal amount from a bank licensed in the United Arab Emirates.'),
    S('(b)', 'The advance is recovered through deductions from interim payments, in proportion to the value of the Works certified, until it is repaid in full.'),
    C('14.3', 'Retention'),
    P('Ten per cent (10%) of the value of each interim payment is retained until the Retention Money reaches 10% of the Accepted Contract Amount. On the issue of the Taking-Over Certificate, half of the Retention Money is released; the balance is released at the end of the Defects Notification Period.'),
    C('14.7', 'Payment'),
    P('The Employer shall pay each amount certified within sixty (60) days of the date of the Payment Certificate. Invoices shall show VAT separately.'),
    C('14.9', 'Price adjustment'),
    P('There is no adjustment for changes in cost. The Contractor bears the risk of changes in the price of equipment, materials and labour, and of exchange rates.'),
    C('18', 'Insurance'),
    P('The Employer insures the Works under a project-wide contractor’s all-risks policy. The Contractor shall insure its own plant and equipment, and shall hold third-party liability insurance of at least AED 10,000,000 for any one occurrence and workers’ compensation insurance.'),
  ] },

  // 10 · Section 4: Scope (1): project, package, interfaces
  { n: 10, part: 's4', blocks: [
    PART('s4'),
    C('4.1', 'The project'),
    P('The Crescent Bay Specialist Hospital is a new hospital of 220 beds on the Employer’s Crescent Bay campus in Abu Dhabi. It has a basement, a ground floor and six upper floors, with a gross floor area of about 64,000 m2. Its departments include eight operating theatres, a 24-bed intensive care unit, 12 isolation rooms, diagnostic imaging, a renal dialysis unit, outpatient clinics and a central sterile services department.'),
    P('The Main Contractor is building the substructure, frame, envelope and finishes. The frame is expected to be complete on the lower four floors when this package starts.'),
    C('4.2', 'The package'),
    P('The Contractor shall carry out the design development, coordination, supply, installation, testing and commissioning of the following systems, as described in Sections 4.4 to 4.9 and the Specification:'),
    L([
      'the central chilled water plant, and the air-side heating, ventilation and air conditioning;',
      'the LV electrical installation, with standby generation and uninterruptible power;',
      'plumbing, drainage and water treatment, including the reverse osmosis plant for renal dialysis;',
      'fire fighting and fire alarm systems;',
      'medical gas pipeline systems;',
      'extra-low-voltage systems, the building management system and nurse call.',
    ]),
    C('4.3', 'Interfaces'),
    P('The Main Contractor provides the plant rooms, plinths, builder’s work openings, the lifting of equipment into the building, and the fire-rated enclosures. The Contractor provides the sleeves, supports, fire stopping to its own penetrations, and every connection between its systems and the Main Contractor’s work.'),
    P('Medical equipment is procured by the Employer. The Contractor provides the services to the equipment and coordinates the medical gas outlets, pendants and bed-head units with the equipment suppliers.'),
  ] },

  // 11 · Scope (2): HVAC and the central plant
  { n: 11, part: 's4', blocks: [
    C('4.4', 'HVAC and the central plant'),
    S('4.4.1', 'The central chilled water plant, in the basement plant room, comprises three (3) water-cooled centrifugal chillers of 1,500 TR each, in an N+1 arrangement, with induced-draft cooling towers on the roof, primary-variable chilled water pumping and condenser water pumps.'),
    S('4.4.2', 'The plant shall maintain chilled water at 5.5 °C supply and 13.5 °C return at the design ambient of 46 °C dry bulb. The chillers shall be sequenced by the building management system, with the standby chiller rotated weekly.'),
    S('4.4.3', 'Condenser water shall be treated by chemical dosing and side-stream filtration, with continuous monitoring of conductivity and biological growth.'),
    S('4.4.4', 'Operating theatres, isolation rooms and the intensive care unit are served by dedicated 100% fresh-air handling units with heat recovery, HEPA terminal filtration and pressure cascades between rooms. Isolation rooms shall be switchable between positive and negative pressure.'),
    S('4.4.5', 'General clinical, office and public areas are served by mixed-air handling units and ceiling-concealed fan coil units, with demand-controlled ventilation.'),
    S('4.4.6', 'Kitchens, laboratories, toilets and the central sterile services department have dedicated exhaust systems. Smoke extract from the atrium and the basement car park forms part of the fire strategy and is included in this package.'),
    S('4.4.7', 'The Contractor shall carry out the heat load calculations and the selections of the equipment in Section 5, confirming the capacities stated there, and shall submit them with the first design submission.'),
    S('4.4.8', 'Plant shall be selected and isolated so that the noise from building services does not exceed NR 30 in patient bedrooms and NR 35 in operating theatres and consulting rooms. Plant on the roof shall be screened, and the cooling towers shall be fitted with attenuators on their air inlets.'),
    S('4.4.9', 'The chilled water plant shall be metered: energy meters on the primary circuit and on each air handling unit, and electricity meters on each chiller, reported to the building management system. The Contractor shall demonstrate the plant’s efficiency at part load during commissioning.'),
    S('4.4.10', 'Every piece of equipment in the central plant shall be accessible for maintenance without removing other equipment, with the lifting beams, access routes and withdrawal spaces shown on the coordinated drawings.'),
  ] },

  // 12 · Scope (3): electrical, plumbing, fire
  { n: 12, part: 's4', blocks: [
    C('4.5', 'Electrical'),
    S('4.5.1', 'The hospital is supplied at 11 kV by the distribution company. The Main Contractor provides the substation building; the Contractor provides everything from the LV terminals of the transformers onwards.'),
    S('4.5.2', 'Main LV switchboards feed essential and non-essential sections. Three standby diesel generator sets, synchronised, serve the essential services; the operating theatres and critical care areas are also served by UPS and by isolated power supply panels.'),
    S('4.5.3', 'The installation includes the sub-main distribution, busbar trunking, lighting and emergency lighting, small power, earthing and lightning protection.'),
    C('4.6', 'Plumbing, drainage and water treatment'),
    S('4.6.1', 'Domestic cold water is stored in the basement tanks and boosted to the floors. Hot water is generated by calorifiers and circulated, with thermostatic mixing at the outlets and a regime to control Legionella.'),
    S('4.6.2', 'A reverse osmosis plant, with a loop of treated water, serves the renal dialysis unit. Soil, waste and vent pipework is in HDPE, with separate drainage for laboratories and the central sterile services department.'),
    C('4.7', 'Fire fighting and fire alarm'),
    S('4.7.1', 'The fire systems comprise sprinklers throughout, wet risers and hose reels, the fire pump set, clean agent suppression in the data and imaging equipment rooms, and an addressable fire alarm with voice evacuation.'),
    S('4.7.2', 'The fire systems shall be designed, installed and tested by a contractor approved by Civil Defence for fire and life safety systems, and shall be approved by Civil Defence before the building is occupied.'),
  ] },

  // 13 · Scope (4): medical gas, ELV/BMS/nurse call, testing and commissioning
  { n: 13, part: 's4', blocks: [
    C('4.8', 'Medical gas pipeline systems'),
    S('4.8.1', 'The medical gas pipeline systems comprise oxygen (from a vacuum insulated evaporator, with a cylinder manifold back-up), medical air, surgical air, medical vacuum, nitrous oxide and anaesthetic gas scavenging, with their plant, pipework, terminal units, area valve service units and alarms.'),
    S('4.8.2', 'The medical gas pipeline systems shall be designed, installed, tested and certified by an installer approved for medical gas pipeline systems, working to HTM 02-01 or NFPA 99, and on the Employer’s approved list of medical gas installers. Where the tenderer is not itself so approved, it shall name a specialist subcontractor that is, in the technical volume.'),
    S('4.8.3', 'Testing includes pressure and leak tests, cross-connection tests, purity and particulate tests at every terminal unit, and certification by an independent authorised person before any system is used.'),
    C('4.9', 'ELV, BMS and nurse call'),
    S('4.9.1', 'The Contractor shall design the extra-low-voltage systems, the building management system and the nurse call system, and shall supply, install and commission them. They include structured cabling, CCTV, access control, public address, the master clock and the patient call system.'),
    S('4.9.2', 'The building management system monitors and controls the central plant, the air-side systems, the pressure cascades of critical rooms and the medical gas alarms, and interfaces with the fire alarm system.'),
    C('4.10', 'Testing, commissioning and handover'),
    S('4.10.1', 'The Contractor shall test and commission its systems, and shall support the Employer’s independent commissioning agent in the integrated systems tests of the whole building. The programme shall allow at least ten weeks for commissioning and integrated testing before handover.'),
    S('4.10.2', 'The Contractor shall provide as-built drawings, operation and maintenance manuals, and training for the Employer’s facilities staff.'),
  ] },

  // 14 · Section 5: Equipment schedule
  { n: 14, part: 's5', blocks: [
    PART('s5'),
    P('The capacities below are those of the Employer’s concept design. The Contractor shall confirm them in its selections (Section 4.4.7) and state the equipment offered in its data sheets.'),
    T(['Tag', 'Equipment', 'Qty', 'Capacity or rating', 'Notes'], [
      ['CH-01 to 03', 'Water-cooled centrifugal chillers', '3', nw('1,750 TR each'), 'N+1; variable speed; low-GWP refrigerant'],
      ['CT-01 to 03', 'Induced-draft cooling tower cells', '3', 'Matched to the chillers', 'FRP casing; variable speed fans'],
      ['PCHWP-01 to 04', 'Primary chilled water pumps', '4', '165 l/s each', 'Duty and standby'],
      ['CWP-01 to 04', 'Condenser water pumps', '4', '205 l/s each', 'Split-case'],
      ['AHU-01 to 14', 'Air handling units, 100% fresh air', '14', '1.2–6.0 m3/s', 'Heat recovery; HEPA terminal filters'],
      ['AHU-15 to 38', 'Air handling units, mixed air', '24', '2.0–9.5 m3/s', 'Demand-controlled ventilation'],
      ['FCU', 'Fan coil units, ceiling concealed', '1,150', '0.8–7.0 kW', 'Two-pipe'],
      ['GEN-01 to 03', 'Standby diesel generator sets', '3', '2,000 kVA each', 'Synchronised; 24 hours’ fuel'],
      ['MSB-01 to 06', 'Main LV switchboards', '6', '4,000 A', 'Form 4 type 6'],
      ['UPS-01 to 04', 'UPS systems', '4', '400 kVA each', '15 minutes’ autonomy'],
      ['VIE-01', 'Vacuum insulated evaporator, liquid oxygen', '1', '20,000 litres', 'With cylinder manifold back-up'],
      ['MA-01 to 02', 'Medical air plants', '2', 'Triplex', 'Duty, assist and standby compressors'],
      ['MV-01 to 02', 'Medical vacuum plants', '2', 'Triplex', 'Bacterial filters'],
      ['FP-01', 'Fire pump set', '1', '95 l/s at 10 bar', 'Electric, diesel and jockey pumps'],
      ['RO-01', 'Reverse osmosis plant for renal dialysis', '1', '4 m3/h', 'With a treated-water loop'],
      ['BMS', 'Building management system', '1', '6,400 points', 'Open protocol'],
      ['NC', 'Nurse call system', '1', '262 call points', 'Integrated with the bed-head units'],
    ].map(([tag, ...rest]) => [nw(tag), ...rest]), { widths: ['30mm', 'auto', '11mm', '29mm', '40mm'], align: ['', '', 'c', '', ''] }),
    P('Equipment of equal performance from another manufacturer may be offered as an option under clause 10.1.'),
  ] },

  // 15 · Section 6: Qualification requirements
  { n: 15, part: 's6', blocks: [
    PART('s6'),
    P('Each tenderer shall meet every requirement below, and shall provide the evidence listed in the technical volume. Certificates shall be valid on the Tender Submission Date.'),
    T(['No.', 'Requirement', 'Evidence'], [
      ['Q-01', 'A valid UAE trade licence covering MEP contracting', 'Copy of the licence'],
      ['Q-02', 'Abu Dhabi contractor classification: MEP, first grade', 'Classification certificate'],
      ['Q-03', 'Current membership of the Chamber of Commerce and Industry', 'Membership certificate'],
      ['Q-04', 'Approved by Civil Defence as a fire and life safety systems contractor, or a named specialist subcontractor that is', 'Approval certificate'],
      ['Q-05', 'A valid In-Country Value (ICV) certificate', 'ICV certificate and Annex E'],
      ['Q-06', 'ISO 9001, ISO 14001 and ISO 45001 certificates', 'Copies of the certificates'],
      ['Q-07', 'At least two (2) hospital or healthcare MEP projects, each with an MEP contract value of AED 100,000,000 or more, completed as main MEP contractor in the last seven (7) years', 'Completion certificates and employer references'],
      ['Q-08', `Average annual turnover over the last three (3) financial years of ${nw('AED 400,000,000')} or more, from audited accounts`, 'Audited financial statements'],
      ['Q-09', `An installer approved for medical gas pipeline systems, working to ${nw('HTM 02-01')} or NFPA 99: the tenderer, or a named specialist subcontractor (Section 4.8.2)`, 'Installer’s approval and project record'],
      ['Q-10', 'Key personnel: a Project Manager with at least 15 years’ experience, of which at least 10 years in healthcare projects', 'Annex B and CVs'],
    ], { widths: ['12mm', 'auto', '46mm'] }),
    P('The Employer may verify any evidence with its issuer. A tenderer found to have given false information will be excluded, and its tender bond forfeited.'),
  ] },

  // 16 · Vol. 2 BOQ summary (1): line items by work package, then representative items WP-0 to WP-2
  { n: 16, part: 'boq', blocks: [
    PART('boq'),
    P(`Volume 2 is the bill of quantities for pricing: ${META.boqLines} line items in eight work packages (WP-0 to WP-7). This summary gives each work package’s number of line items and five representative lines. It gives quantities and units only; tenderers price the full bill in the Employer’s XLSX template.`),
    T(['Work package', 'Line items'], [
      ...BILLS.map((b) => [`WP-${b.no} ${b.title}`, String(b.lineCount)]),
      { cls: 'total', cells: ['Total (8 work packages)', String(META.boqLines)] },
    ], { widths: ['auto', '26mm'], align: ['', 'r'] }),
    H('Representative items: WP-0 to WP-2'),
    BOQ_TABLE([0, 1, 2]),
  ] },

  // 17 · Vol. 2 BOQ summary (2)
  { n: 17, part: 'boq', blocks: [
    H('Representative items: WP-3 to WP-7'),
    BOQ_TABLE([3, 4, 5, 6, 7]),
    P('Quantities are the Employer’s estimates (clause 8.1). The full descriptions, and the measurement rules for each work package, are in Volume 2.'),
  ] },

  // 18 · Vol. 3 Drawings list
  { n: 18, part: 'dwg', blocks: [
    PART('dwg'),
    P('Drawings list for Volume 3. Drawings are issued as PDF files; the federated BIM model is available to the successful tenderer.'),
    T(['Drawing no.', 'Title', 'Rev.'], [
      ['CBHH-011-G-001', 'Site plan and campus services', 'T1'],
      ['CBHH-011-G-002', 'Floor plans, basement to level 6: key plans', 'T1'],
      ['CBHH-011-M-101', 'Central chilled water plant: layout and schematic', 'T1'],
      ['CBHH-011-M-102', 'Chilled water distribution schematic', 'T1'],
      ['CBHH-011-M-201', 'Air handling units: schedule and zoning, theatres and isolation rooms', 'T1'],
      ['CBHH-011-M-202', 'Ductwork layouts, basement to level 6', 'T1'],
      ['CBHH-011-M-301', 'Medical gas pipeline systems: schematic', 'T1'],
      ['CBHH-011-M-302', 'Medical gas plant rooms and VIE compound', 'T1'],
      ['CBHH-011-E-401', 'LV single-line diagram: essential and non-essential sections', 'T1'],
      ['CBHH-011-E-402', 'Standby generation and UPS: layout and schematic', 'T1'],
      ['CBHH-011-P-501', 'Water supply and treatment schematic, with the RO plant', 'T1'],
      ['CBHH-011-P-502', 'Drainage schematic', 'T1'],
      ['CBHH-011-F-601', 'Fire protection: sprinkler zones and risers', 'T1'],
      ['CBHH-011-F-602', 'Fire alarm and voice evacuation: riser diagram', 'T1'],
      ['CBHH-011-X-701', 'ELV and nurse call: riser diagrams', 'T1'],
      ['CBHH-011-X-702', 'Building management system: architecture', 'T1'],
      ['CBHH-011-X-801', 'Interface schedule with the Main Contractor', 'T1'],
    ], { widths: ['34mm', 'auto', '12mm'], align: ['', '', 'c'] }),
  ] },

  // 19 · Annex C: Form of Tender Bond
  { n: 19, part: 'annc', blocks: [
    PART('annc'),
    P('<em>To be issued on the letterhead of a bank licensed in the United Arab Emirates.</em>'),
    { t: 'letter', blocks: [
      P('To: Crescent Bay Health Holding, Capital Projects Office, Abu Dhabi'),
      P('Tender: CBHH/PRJ/2026/011, MEP works package for the 220-bed Crescent Bay Specialist Hospital'),
      P('Guarantee no.: ______________________'),
      P('We have been informed that ______________________ (the Tenderer) is submitting a tender for the above works, and that the conditions of the tender require it to provide a tender bond.'),
      P('At the request of the Tenderer, we ______________________ (the Bank) irrevocably and unconditionally undertake to pay you any sum or sums not exceeding in total AED 2,000,000 (two million UAE dirhams), on receipt of your first written demand, without your having to prove or show grounds for the demand.'),
      P('This guarantee shall remain valid for one hundred and fifty (150) days from the Tender Submission Date. Any demand under it must be received by us at this office on or before that date.'),
      P('This guarantee is governed by the laws of the Emirate of Abu Dhabi and the federal laws of the United Arab Emirates.'),
    ] },
    SIGN(['Authorised signatory of the Bank', 'Bank seal', 'Name and position', 'Date']),
  ] },

  // 20 · Annex D: Form of Tender
  { n: 20, part: 'annd', blocks: [
    PART('annd'),
    { t: 'letter', blocks: [
      P('To: Crescent Bay Health Holding, Capital Projects Office, Abu Dhabi'),
      P('Tender: CBHH/PRJ/2026/011, MEP works package for the 220-bed Crescent Bay Specialist Hospital'),
      P('Having examined the Tender Documents, including circulars nos. ______________________, we offer to execute and complete the Works, and remedy any defects in them, in accordance with the Contract, for the sum of AED ______________________ (excluding VAT), and VAT at 5% of AED ______________________, or such other sum as may be determined under the Contract.'),
      P('We accept the Time for Completion of twenty-six (26) months, and we agree to abide by this tender for 120 days from the Tender Submission Date. It shall remain binding on us and may be accepted at any time before that date.'),
      P('We enclose the tender bond, our ICV certificate and the ICV declaration. We name the specialist subcontractors listed in our technical volume.'),
      P('We understand that you are not bound to accept the lowest or any tender you receive.'),
    ] },
    SIGN(['Signature of the authorised signatory', 'Name and position', 'For and on behalf of', 'Date']),
  ] },
];
