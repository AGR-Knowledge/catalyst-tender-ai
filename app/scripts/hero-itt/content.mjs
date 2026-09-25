// Content of the synthetic hero booklet (Vol. 1), page by page.
// Follows gcc-demo-data §4 and the page map in §4.9; plan 004 seeds the matching extraction record.
// Structure and wording style paraphrase the Saudi model booklet for general construction works.
// Everything here is fictional: the issuer, the project, the reference and the contact details.
// Two rules for editing: keep every ANCHORS text verbatim on its page, and never write the
// abbreviation for value added tax, or its full name, anywhere (seeded flaw 6).

export const PAGE_COUNT = 48;

export const OUTPUT = {
  pdf: 'public/bids/gcc/ECWS-PRJ-2026-0147-booklet.pdf',
  csv: 'public/bids/gcc/ECWS-PRJ-2026-0147-BOQ.csv',
};

export const META = {
  country: 'Kingdom of Saudi Arabia',
  issuer: 'Eastern Cities Water Services Company (ECWS)',
  department: 'Projects Department',
  booklet: 'Terms and Specifications Booklet: General Construction Works',
  title: 'Expansion of Al-Rawdah Sewage Treatment Plant, Phase 2 (+150,000 m3/day), with Tertiary Treatment and a TSE Transmission Pipeline',
  ref: 'ECWS/PRJ/2026/0147',
  issueDate: 'Sunday 8 March 2026',
  hijri: 'corresponding to 19 Ramadan 1447 H (approx.)',
  city: 'Dammam, Eastern Province',
  method: 'Public tender, two files (technical and financial), through the electronic portal',
  volume: 'Volume 1 of 3. Volume 2 (Bill of Quantities) and Volume 3 (Drawings) are issued with it.',
  header: 'ECWS · Terms and Specifications Booklet · ECWS/PRJ/2026/0147',
  watermark: 'Synthetic document for demonstration',
  coverNote: 'Prepared on the model terms and specifications booklet for general construction works under the Government Tenders and Procurement Law.<br>Issued in English for the convenience of bidders. In any conflict, the Arabic text prevails (clause 27).',
  disclaimer: 'Synthetic document produced for a software demonstration. The issuer, project, reference number and contact details are fictional.',
  boqLines: 236,
};

// Page anchors: verify.mjs checks that each text appears verbatim on its page (plan 005 step 1.3).
// `flaw` is the seeded flaw number in gcc-demo-data §4.6.
export const ANCHORS = [
  { page: 4, text: 'Deadline for questions: Wednesday 18 March 2026' },
  { page: 4, text: 'Bid submission deadline: Sunday 10 May 2026, 10:00' },
  { page: 4, text: 'Site visit: Tuesday 17 March 2026, 10:00' },
  { page: 4, text: 'valid on the date of bid opening' },
  { page: 6, text: '25%' },
  { page: 7, text: '30% of the contract value' },
  { page: 7, text: 'certified by the Chamber of Commerce' },
  { page: 8, text: 'Annex (8)', flaw: 4 },
  { page: 9, text: 'the Arabic text shall prevail' },
  { page: 10, text: '90 days from the date of bid opening' },
  { page: 10, text: 'within seven (7) days from that date', flaw: 3 },
  { page: 11, text: 'inclusive of all taxes, fees and expenses', flaw: 6 },
  { page: 12, text: 'Initial guarantee: 1% of the total bid value', flaw: 1 },
  { page: 18, text: '5% of the contract value' },
  { page: 18, text: 'fifteen (15) working days' },
  { page: 19, text: 'shall not exceed [ %]', flaw: 2 },
  { page: 19, text: '20% of the contract value' },
  { page: 23, text: 'TSE transmission pipeline, DN1000 GRP, approximately 16 km', flaw: 7 },
  { page: 33, text: 'minimum local content of 40%' },
  { page: 33, text: 'Annex (10)' },
  { page: 35, text: 'The initial guarantee shall be 2% of the total bid value', flaw: 1 },
  { page: 36, text: 'advance payment not exceeding 10%' },
  { page: 36, text: 'final invoice' },
  { page: 38, text: 'Water and Sewage Works, Grade 1' },
  { page: 38, text: 'two (2) completed sewage treatment plants' },
  { page: 38, text: '100,000 m3/day' },
  { page: 39, text: 'last three (3) financial years', flaw: 8 },
  { page: 39, text: 'SAR 1,200,000,000' },
  { page: 40, text: 'ISO 90001', flaw: 5 },
  { page: 42, text: 'pass mark of 70' },
  { page: 47, text: 'TSE Transmission Line, 18 km', flaw: 7 },
  { page: 48, text: 'Bid Letter' },
];

// Texts that must appear on one page only, so that each side of a seeded conflict has one page.
export const EXCLUSIVE = [
  { page: 8, text: 'Annex (8)' },
  { page: 12, text: '1% of the total bid value' },
  { page: 19, text: '[ %]' },
  { page: 35, text: '2% of the total bid value' },
  { page: 40, text: 'ISO 90001' },
  { page: 47, text: '18 km' },
];

// Vol. 2 bill of quantities: the 11 bills of gcc-demo-data §4.8, a line count per bill summing
// to 236, and 3–6 representative lines per bill. Quantities only: the booklet carries no prices.
// Plan 004's HERO_BILLS / HERO_LINES should use the same titles, counts and items.
export const BILLS = [
  { no: 1, title: 'General and preliminaries', lineCount: 18, items: [
    { item: '1.01', description: 'Mobilisation, site establishment and temporary facilities', unit: 'item', qty: 1 },
    { item: '1.04', description: 'Engineer’s site offices, furnished and serviced for the contract period', unit: 'month', qty: 30 },
    { item: '1.07', description: 'Design of process, mechanical, electrical and ICA works, with approvals', unit: 'item', qty: 1 },
    { item: '1.10', description: 'Temporary flow management and bypass works at the operating Phase 1 plant', unit: 'item', qty: 1 },
    { item: '1.13', description: 'Insurances required under clause 63', unit: 'item', qty: 1 },
    { item: '1.16', description: 'As-built documents, O&M manuals and operator training', unit: 'item', qty: 1 },
  ] },
  { no: 2, title: 'Civil and structural (bioreactors, clarifiers, buildings)', lineCount: 52, items: [
    { item: '2.04', description: 'Excavation in all materials for tanks and channels, depth 0–7.5 m', unit: 'm3', qty: 186000 },
    { item: '2.09', description: 'Sulphate-resisting concrete C40 for water-retaining structures', unit: 'm3', qty: 64500 },
    { item: '2.11', description: 'High-yield reinforcement grade 60, cut, bent and fixed', unit: 't', qty: 9850 },
    { item: '2.17', description: 'PVC waterstops, 230 mm, in construction and movement joints', unit: 'm', qty: 18400 },
    { item: '2.26', description: 'Epoxy protective coating to internal surfaces of tanks and channels', unit: 'm2', qty: 72000 },
    { item: '2.41', description: 'Blower building, reinforced concrete frame and blockwork, complete', unit: 'm2', qty: 2150 },
  ] },
  { no: 3, title: 'Process mechanical equipment (screens, grit, blowers, clarifier mechanisms)', lineCount: 34, items: [
    { item: '3.02', description: 'Fine screens, 6 mm, 2,600 m3/h each, with washer-compactors', unit: 'nr', qty: 6 },
    { item: '3.06', description: 'Vortex grit removal units with grit classifiers', unit: 'nr', qty: 4 },
    { item: '3.10', description: 'Aeration blowers, high-speed turbo type, 750 kW, with enclosures', unit: 'nr', qty: 6 },
    { item: '3.14', description: 'Fine-bubble membrane diffusers, EPDM, with pipework grids', unit: 'nr', qty: 28800 },
    { item: '3.21', description: 'Clarifier scraper mechanisms, 52 m diameter, half-bridge type', unit: 'nr', qty: 6 },
    { item: '3.27', description: 'Return and waste activated sludge pumps, with variable speed drives', unit: 'nr', qty: 14 },
  ] },
  { no: 4, title: 'Tertiary filtration and UV disinfection', lineCount: 14, items: [
    { item: '4.02', description: 'Cloth disc filter units, 1,750 m3/h each, with backwash system', unit: 'nr', qty: 6 },
    { item: '4.06', description: 'UV disinfection channels, low-pressure high-output lamps', unit: 'nr', qty: 3 },
    { item: '4.09', description: 'Filter backwash and filtrate return pumps', unit: 'nr', qty: 6 },
    { item: '4.12', description: 'Sodium hypochlorite dosing system for the TSE chlorine residual', unit: 'item', qty: 1 },
  ] },
  { no: 5, title: 'Sludge thickening and dewatering', lineCount: 15, items: [
    { item: '5.02', description: 'Gravity belt thickeners, 60 m3/h', unit: 'nr', qty: 4 },
    { item: '5.05', description: 'Dewatering centrifuges, 45 m3/h, with cake pumps', unit: 'nr', qty: 4 },
    { item: '5.09', description: 'Polymer preparation and dosing units', unit: 'nr', qty: 2 },
    { item: '5.12', description: 'Dewatered cake silos, 200 m3, with truck loading', unit: 'nr', qty: 2 },
  ] },
  { no: 6, title: 'Odour control', lineCount: 9, items: [
    { item: '6.02', description: 'Biotrickling filter odour control units, 45,000 m3/h', unit: 'nr', qty: 3 },
    { item: '6.04', description: 'Activated carbon polishing units', unit: 'nr', qty: 3 },
    { item: '6.06', description: 'GRP odour extraction ductwork, DN300–DN1200', unit: 'm', qty: 1850 },
  ] },
  { no: 7, title: 'Electrical: 33/11 kV substation, transformers, MCCs, cabling', lineCount: 30, items: [
    { item: '7.01', description: '33/11 kV substation, gas-insulated switchgear, protection and control', unit: 'item', qty: 1 },
    { item: '7.03', description: 'Power transformers 33/11 kV, 20 MVA, ONAN', unit: 'nr', qty: 2 },
    { item: '7.07', description: 'Distribution transformers 11/0.4 kV, 2,500 kVA', unit: 'nr', qty: 6 },
    { item: '7.12', description: 'Motor control centres, form 4b, with variable speed drive sections', unit: 'nr', qty: 14 },
    { item: '7.19', description: 'LV power and control cables, XLPE/SWA (mandatory list)', unit: 'm', qty: 96000 },
    { item: '7.24', description: 'Standby diesel generator sets, 2,000 kVA, with fuel system', unit: 'nr', qty: 2 },
  ] },
  { no: 8, title: 'Instrumentation, control and SCADA', lineCount: 20, items: [
    { item: '8.02', description: 'Electromagnetic flowmeters, DN200–DN1200', unit: 'nr', qty: 38 },
    { item: '8.05', description: 'Online analysers: DO, ammonium, nitrate, TSS, turbidity', unit: 'nr', qty: 64 },
    { item: '8.09', description: 'PLC control panels with redundant processors', unit: 'nr', qty: 12 },
    { item: '8.13', description: 'SCADA servers, workstations and software, with central control centre link', unit: 'item', qty: 1 },
    { item: '8.16', description: 'Fibre-optic network, single-mode, 24-core', unit: 'm', qty: 14500 },
  ] },
  { no: 9, title: 'Yard piping, valves and penstocks', lineCount: 22, items: [
    { item: '9.03', description: 'Ductile iron pipes and fittings, DN300–DN1400', unit: 'm', qty: 7200 },
    { item: '9.08', description: 'Butterfly valves, DN400–DN1400, electrically actuated (mandatory list)', unit: 'nr', qty: 96 },
    { item: '9.12', description: 'Stainless steel penstocks and weir gates', unit: 'nr', qty: 74 },
    { item: '9.17', description: 'Pipe supports, thrust blocks and wall sleeves', unit: 'nr', qty: 410 },
  ] },
  { no: 10, title: 'TSE pipeline (DN1000 GRP, 16 km) and TSE pump station', lineCount: 14, items: [
    { item: '10.02', description: 'GRP pipes, DN1000, PN16, supplied to site (mandatory list)', unit: 'm', qty: 16050 },
    { item: '10.04', description: 'Trench excavation, bedding, laying and backfill for DN1000 pipe', unit: 'm', qty: 16050 },
    { item: '10.07', description: 'Air valve, washout and isolating valve chambers', unit: 'nr', qty: 42 },
    { item: '10.10', description: 'TSE pump station, 4 duty and 1 standby pumps, 450 kW, with surge vessels', unit: 'item', qty: 1 },
    { item: '10.12', description: 'Hydrostatic testing and flushing of the TSE pipeline', unit: 'm', qty: 16050 },
  ] },
  { no: 11, title: 'Piling, dewatering and shoring', lineCount: 8, items: [
    { item: '11.02', description: 'Bored cast-in-place piles, 800 mm diameter, average length 18 m', unit: 'nr', qty: 1240 },
    { item: '11.05', description: 'Deep-well and wellpoint dewatering, installed, operated and removed', unit: 'month', qty: 14 },
    { item: '11.07', description: 'Steel sheet piling for temporary shoring, installed and extracted', unit: 'm2', qty: 9800 },
  ] },
];

// Parts and printed annexes, in booklet order. The contents page takes each one's first page from PAGES.
export const PARTS = [
  { id: 'p1', label: 'Part 1', title: 'Introduction', clauses: '1–9' },
  { id: 'p2', label: 'Part 2', title: 'General provisions', clauses: '10–26' },
  { id: 'p3', label: 'Part 3', title: 'Preparing bids', clauses: '27–44' },
  { id: 'p4', label: 'Part 4', title: 'Submitting bids', clauses: '45–49' },
  { id: 'p5', label: 'Part 5', title: 'Evaluation of bids', clauses: '50–55' },
  { id: 'p6', label: 'Part 6', title: 'Contracting requirements', clauses: '56–63' },
  { id: 'p7', label: 'Part 7', title: 'Detailed scope of work', clauses: '64–68' },
  { id: 'p8', label: 'Part 8', title: 'Specifications', clauses: '69–74' },
  { id: 'p9', label: 'Part 9', title: 'Local content requirements', clauses: '75–76' },
  { id: 'p10', label: 'Part 10', title: 'Economic participation programme', clauses: '' },
  { id: 'p11', label: 'Part 11', title: 'Special conditions', clauses: '77–89' },
  { id: 'a4', label: 'Annex (4)', title: 'Post-qualification criteria', clauses: '' },
  { id: 'a5', label: 'Annex (5)', title: 'Evaluation criteria and weights', clauses: '' },
  { id: 'boq', label: 'Volume 2', title: 'Bill of quantities: summary by bill (extract)', clauses: '' },
  { id: 'a6', label: 'Annex (6)', title: 'Drawings list', clauses: '' },
  { id: 'a1', label: 'Annex (1)', title: 'Bid Letter form', clauses: '' },
];

// ---- Block helpers (rendered by template.mjs) ----
// Keeps an anchor on one line. Needed in table cells only: pdftotext -layout interleaves the
// wrapped lines of neighbouring cells, while wrapped running text re-joins after normalising.
const nw = (s) => `<span class="nw">${s}</span>`;
const blank = '<span class="blank"></span>';
const P = (html) => ({ t: 'p', html });
const C = (no, title) => ({ t: 'clause', no, title });
const S = (no, html) => ({ t: 'sub', no, html });
const H = (html) => ({ t: 'h', html });
const L = (items, style = 'alpha') => ({ t: 'list', style, items });
const T = (head, rows, opts = {}) => ({ t: 'table', head, rows, ...opts });
const KV = (rows) => ({ t: 'kv', rows });
const NOTE = (html) => ({ t: 'note', html });
const F = (html) => ({ t: 'formula', html });
const SIGN = (fields) => ({ t: 'sign', fields });
const PART = (id) => {
  const p = PARTS.find((x) => x.id === id);
  return { t: 'part', label: p.label, title: p.title };
};
const qty = (n) => n.toLocaleString('en-GB');

function billRows(nos) {
  const rows = [];
  for (const b of BILLS.filter((x) => nos.includes(x.no))) {
    rows.push({ cls: 'bill', cells: [`Bill ${b.no}`, `${b.title} · ${b.lineCount} line items`], span: 3 });
    for (const it of b.items) rows.push([it.item, it.description, it.unit, qty(it.qty)]);
    rows.push({ cls: 'rest', cells: ['', `Remaining items in bill ${b.no}: ${b.lineCount - b.items.length} lines (Volume 2)`], span: 3 });
  }
  return rows;
}
const BOQ_TABLE = (nos) => T(['Item', 'Description', 'Unit', 'Quantity'], billRows(nos), {
  widths: ['16mm', 'auto', '16mm', '24mm'],
  align: ['', '', 'c', 'r'],
});

// ---- Pages ----
export const PAGES = [
  // 1 · Cover
  { n: 1, part: 'cover', blocks: [{ t: 'cover' }] },

  // 2 · Contents
  { n: 2, part: 'contents', blocks: [
    { t: 'part', label: 'Contents', title: '' },
    { t: 'contents' },
    H('Tender documents'),
    T(['Volume', 'Content', 'Format'], [
      ['Volume 1', `This Terms and Specifications Booklet (${PAGE_COUNT} pages), including the annexes printed in it`, 'PDF'],
      ['Volume 2', `Bill of quantities: ${META.boqLines} line items in 11 bills`, 'XLSX template and PDF'],
      ['Volume 3', 'Drawings, as listed in Annex (6)', 'PDF'],
      ['Separate annexes', 'Annex (2) Questions form; Annex (3) Form of contract; Annex (7) Mandatory list; Annex (10) Local content weighting, contract level; Annex (11) Economic participation policy; Annex (12) Undertaking form', 'PDF, on the electronic portal'],
    ], { widths: ['30mm', 'auto', '40mm'] }),
    P('Addenda issued under clause 10 form part of the tender documents. Bidders shall acknowledge each addendum in the Bid Letter (Annex 1). Part 12 of the model booklet (Annexes) is given by the annexes printed in this booklet and those issued separately.'),
    NOTE('<p>All communication in this tender takes place through the electronic portal (clause 31). The representative in clause 7 is contacted only when the portal is unavailable.</p>'),
  ] },

  // 3 · Part 1: definitions, about the tender, fee
  { n: 3, part: 'p1', blocks: [
    PART('p1'),
    C(1, 'Definitions'),
    P('In this booklet, the following words and expressions have the meanings shown against them, unless the context requires otherwise:'),
    KV([
      ['The Entity', 'Eastern Cities Water Services Company (ECWS), acting through its Projects Department.'],
      ['The Bidder', 'Any natural or legal person, or consortium, that submits a bid in this tender.'],
      ['The Tender', 'Public tender No. ECWS/PRJ/2026/0147 for the Works described in Part 7.'],
      ['The Law', 'The Government Tenders and Procurement Law issued by Royal Decree No. (M/128) dated 13/11/1440 H.'],
      ['The Regulations', 'The Implementing Regulations of the Law issued by Minister of Finance Decision No. (1242) dated 21/3/1441 H, as amended.'],
      ['The Electronic Portal', 'The government electronic procurement portal through which this tender is published and bids are received.'],
      ['The Works', 'All works, supplies and services required under the tender documents.'],
      ['The Contractor', 'The Bidder to whom the contract is awarded and who signs it.'],
    ]),
    P('Words in the singular include the plural and vice versa. Headings do not affect interpretation.'),
    C(2, 'About the tender'),
    S('2.1', 'The Entity’s Al-Rawdah Sewage Treatment Plant serves the eastern districts of the city, with a design capacity of 150,000 m3/day (Phase 1). Inflows are forecast to exceed it before the end of 2028.'),
    S('2.2', 'The Entity invites bids for the expansion of the plant by a second phase of 150,000 m3/day, with tertiary filtration and ultraviolet disinfection, so that the treated sewage effluent (TSE) meets the national standards for reuse in irrigation, and for a TSE pump station and transmission pipeline to the Entity’s reuse reservoir.'),
    S('2.3', 'The contract is for the design and construction of the process, mechanical, electrical, instrumentation and control works, and the construction of the civil works to the issued design, priced on re-measured unit rates. The contract duration is thirty (30) months from site handover, followed by a maintenance period of twelve (12) months. An optional operation and maintenance service of twenty-four (24) months is priced separately (clause 84).'),
    C(3, 'Cost of tender documents'),
    S('3.1', 'The tender documents may be purchased, until the bid submission deadline, for SAR 5,000 (five thousand Saudi riyals), payable through the SADAD payment system via the electronic portal.'),
    S('3.2', 'The fee recovers only the cost of preparing the documents and is not refundable, except in the cases stated in clause 20. Only bidders who have purchased the documents may bid, and the receipt shall be placed in the technical file.'),
  ] },

  // 4 · Part 1: timetable, eligibility, certificates, representative, delivery, law
  { n: 4, part: 'p1', blocks: [
    C(4, 'Tender timetable'),
    T(['No.', 'Milestone and date (all times Riyadh time, UTC+3)', 'Channel or place'], [
      ['1', 'Publication of the tender: Sunday 8 March 2026', 'Electronic portal'],
      ['2', 'Participation confirmation letter: Thursday 12 March 2026', 'Electronic portal'],
      ['3', nw('Site visit: Tuesday 17 March 2026, 10:00'), 'Plant main gate (clause 34)'],
      ['4', nw('Deadline for questions: Wednesday 18 March 2026'), 'Electronic portal (clause 33)'],
      ['5', nw('Bid submission deadline: Sunday 10 May 2026, 10:00'), 'Electronic portal (clause 45)'],
      ['6', 'Original initial guarantee: before the submission deadline', 'Address in clause 8'],
      ['7', 'Bid opening: Sunday 10 May 2026, 10:30', 'Electronic portal (clause 49)'],
    ], { widths: ['10mm', '104mm', 'auto'], align: ['c', '', ''] }),
    C(5, 'Eligibility of bidders'),
    P('Persons barred by the Law may not bid, such as debarred, bankrupt or insolvent persons and companies in liquidation.'),
    C(6, 'Statutory records and licences'),
    P(`The Bidder, and every subcontractor listed in its bid, shall hold the following certificates, valid on the date of bid opening:`),
    T(['Ref.', 'Certificate', 'Condition'], [
      ['(a)', 'Commercial Registration', 'Activities include water and sewage works'],
      ['(b)', 'Zakat and/or tax certificate', 'Issued by the Zakat, Tax and Customs Authority'],
      ['(c)', 'Social insurance (GOSI) certificate', 'Registration and payment of contributions'],
      ['(d)', 'Chamber of Commerce membership', 'Current membership'],
      ['(e)', 'Contractor classification certificate', 'Field and grade as stated in Annex (4)'],
      ['(f)', 'Saudi Contractors Authority membership', 'Current membership'],
      ['(g)', 'Required job-localisation ratio certificate', 'Issued under the labour regulations in force'],
    ], { widths: ['10mm', '74mm', 'auto'], align: ['c', '', ''] }),
    P('A missing or expired certificate may be supplied within ten (10) working days of the committee’s request; otherwise the bid is excluded and the initial guarantee forfeited (clause 53).'),
    C(7, 'Representative of the Entity'),
    KV([
      ['Title', 'Tenders and Contracts Manager, Projects Department'],
      ['Telephone and email', '+966 13 000 0147 · tenders.0147@ecws.example (only when the portal is unavailable)'],
    ]),
    C(8, 'Place of delivery'),
    KV([
      ['Address', 'ECWS Head Office, Tender Receipt Office, Ground Floor, Room G-12, Dammam'],
      ['Hours', 'Working days 08:00–14:00; during Ramadan 10:00–15:00'],
    ]),
    C(9, 'Governing law'),
    P('The Law, the Regulations, and the regulations on local content preference (clause 16), conflict of interest and conduct.'),
  ] },

  // 5 · Part 2: clauses 10–15
  { n: 5, part: 'p2', blocks: [
    PART('p2'),
    C(10, 'Equality and transparency'),
    S('10.1', 'The Entity gives all bidders the same information and the same opportunity to take part in the tender.'),
    S('10.2', 'The Entity may amend the tender documents by addendum before the bid submission deadline. Each addendum is published to all bidders through the electronic portal and forms part of the tender documents. Where an addendum requires it, the Entity extends the bid submission deadline and notifies the new date in the same way.'),
    S('10.3', 'If the electronic portal is unavailable, changes are notified by official mail or by email to the addresses the bidders have registered.'),
    C(11, 'Conflict of interest'),
    S('11.1', 'The Bidder, its staff, affiliates and subcontractors shall avoid any conflict of interest with the Entity or its staff, and shall disclose in writing any actual or potential conflict as soon as they become aware of it.'),
    S('11.2', 'A bidder that fails to disclose a conflict of interest may be excluded, and any contract awarded to it may be terminated.'),
    C(12, 'Conduct and ethics'),
    P('The Bidder shall not offer or give any gift, payment or benefit to any person involved in the tender, and shall not seek any information or advantage by improper means, at any stage of the tender or of the contract. Any such act leads to exclusion of the bid and is referred to the competent authorities.'),
    C(13, 'Confidentiality and disclosure'),
    P('The Bidder shall keep all information relating to the tender confidential. It shall not disclose that information to any third party, or publish it in any media, without the prior written approval of the Entity. This obligation continues after the tender has been concluded.'),
    C(14, 'Ownership of tender documents'),
    P('The tender documents remain the property of the Entity. They are provided only for the preparation of bids and may not be copied, circulated or used for any other purpose. The Entity may require their return or destruction at any time.'),
    C(15, 'Intellectual property rights'),
    P('Intellectual property in the successful bid, and in the designs, drawings, reports and application software produced under the contract, passes to the Entity. This does not affect the rights of third parties in standard products and licensed software, for which the Contractor shall obtain licences in the Entity’s name.'),
  ] },

  // 6 · Part 2: clauses 16–21 (abnormally low bids)
  { n: 6, part: 'p2', blocks: [
    C(16, 'Local content'),
    P('The Bidder shall comply with the Regulation on Preference for Local Content, Local Small and Medium Enterprises and Listed Companies issued by Council of Ministers Decision No. (245) dated 29/3/1441 H, and its implementing decisions, including the requirements in Part 9 of this booklet.'),
    C(17, 'Import regulations'),
    P('The Bidder acknowledges that it has reviewed the laws, regulations and customs procedures of the Kingdom governing imports, including prohibited and restricted goods, and has allowed for them in its programme and prices.'),
    C(18, 'Splitting the tender'),
    P('The Works will be awarded as a single contract. Splitting the award between bidders does not apply to this tender.'),
    C(19, 'Exclusion for abnormally low prices'),
    S('19.1', `The Entity may exclude a bid that has passed the technical evaluation if its total price is 25% or more below the estimated cost of the Works and the prevailing market prices.`),
    S('19.2', 'Before excluding a bid under clause 19.1, the Entity shall ask the Bidder in writing for a detailed breakdown of its prices, and shall consider the Bidder’s reply, including any evidence that the prices can be sustained.'),
    C(20, 'Cancellation of the tender and its effect'),
    S('20.1', 'The Entity may cancel the tender before award if: (a) no bid complies with the tender documents; (b) all bids are materially higher than prevailing market prices; (c) the public interest requires it, or the need for the Works no longer exists; or (d) serious violations of the Law affect the fairness of the procedure.'),
    S('20.2', 'Where the tender is cancelled for a reason other than a bidder’s own default, the Entity refunds the cost of the tender documents to the bidders who purchased them. The Entity is not liable for any other cost.'),
    C(21, 'Negotiation with bidders'),
    S('21.1', 'If the best evaluated bid is clearly higher than prevailing market prices, or exceeds the funds available, the Entity may negotiate with that Bidder to reduce its price. If the negotiation fails, the Entity may negotiate with the next bidder, in the order of evaluation.'),
    S('21.2', 'If negotiation does not bring the price within market prices or the available funds, the Entity may, with the approvals required by the Regulations, reduce or remove items, or cancel the tender.'),
    S('21.3', 'Negotiation shall not change the technical specifications or the terms of the tender, other than any reduction or removal of items made under clause 21.2.'),
  ] },

  // 7 · Part 2: consortium (§22) and subcontracting (§23)
  { n: 7, part: 'p2', blocks: [
    C(22, 'Consortium (joint bidding)'),
    S('22.1', 'Bids from consortia are accepted, on the following conditions:'),
    L([
      `the consortium agreement shall be concluded before the bid submission deadline and certified by the Chamber of Commerce or by a notary public. Alternatively, the members may submit a certified undertaking to conclude such an agreement if the contract is awarded to them;`,
      'the agreement shall name the lead member and its legal representative, and state each member’s share of the Works;',
      'the members shall be jointly and severally liable to the Entity for the performance of the contract;',
      'every member shall sign the bid and every document in it, and the agreement shall be placed in the technical file;',
      'no member may submit another bid, alone or as a member of another consortium;',
      'the composition of the consortium, and the members’ shares, may not change without the Entity’s prior written approval.',
    ]),
    S('22.2', 'If a member withdraws before award, the bid is excluded unless the remaining members meet all requirements without it. The post-qualification criteria in Annex (4) state how each criterion applies to a consortium.'),
    C(23, 'Subcontracting'),
    S('23.1', 'The Bidder shall submit with its bid a list of the subcontractors it proposes, the works assigned to each, and the quantities and prices of those works. The list is subject to the Entity’s approval.'),
    S('23.2', 'Every subcontractor shall be eligible under clause 5, hold the certificates in clause 6, and be classified in the relevant field and at the required grade.'),
    S('23.3', `The total value of subcontracted works shall not exceed 30% of the contract value. Subcontracting of more than 30% and up to 50% requires the prior approval of the Expenditure Efficiency and Projects Authority and of the Entity, and shall be spread over more than one qualified subcontractor.`),
    S('23.4', 'Subcontractors may not subcontract any part of their works. The Contractor remains fully responsible to the Entity for the subcontracted works.'),
    S('23.5', 'The Contractor shall give an undertaking allowing the Entity to pay subcontractors directly, and to deduct those payments from sums due to the Contractor, if the Contractor delays paying them without justification.'),
    S('23.6', 'The national product preference in clause 51 applies to the purchases of the Contractor and of its subcontractors.'),
  ] },

  // 8 · Part 2: post-qualification (§24, wrong annex reference), §25, §26
  { n: 8, part: 'p2', blocks: [
    C(24, 'Post-qualification'),
    S('24.1', `As this tender was not preceded by pre-qualification, the Entity shall post-qualify the Bidder whose bid is evaluated best, before award, against the post-qualification criteria set out in Annex (8).`),
    S('24.2', 'Post-qualification assesses the Bidder’s technical, financial and administrative capability to perform the contract, on the evidence in the technical file. The committee may verify any evidence with its issuer, and may ask the Bidder to clarify or complete it within a period the committee sets.'),
    S('24.3', 'If the Bidder fails post-qualification, its bid is rejected, and the Bidder with the next best evaluated bid is post-qualified in the same way, and so on until a bidder qualifies or the bids are exhausted.'),
    S('24.4', 'Information found to be false or misleading leads to rejection of the bid and forfeiture of the initial guarantee, without prejudice to the penalties provided by the Law.'),
    S('24.5', 'Post-qualification is also required where a pre-qualification took place more than one (1) year before the bid submission deadline.'),
    S('24.6', 'Post-qualification does not replace the checks in clause 53, and a bidder that passes it remains subject to the conditions in clause 6 until the contract is signed.'),
    C(25, 'Invitation not binding'),
    P('The invitation to bid is not an offer and does not create any contractual or legal obligation on the Entity. Subject to the Law, the Entity is not bound to accept the lowest bid or any bid, and bears no liability to bidders if it does not award the contract.'),
    C(26, 'Acceptance of the terms'),
    S('26.1', 'By submitting a bid, the Bidder accepts all the terms and conditions of the tender documents, including addenda.'),
    S('26.2', 'A bid that departs from the tender documents, or is qualified by reservations, is excluded, unless the departure is formal and does not affect the price, the scope of the Works or the rights of other bidders.'),
    S('26.3', 'Bidders shall raise any objection to the tender terms through the questions procedure in clause 33, before the deadline for questions. An objection raised after that deadline is not considered.'),
    S('26.4', 'Conditions printed on the Bidder’s letterhead, quotations or catalogues do not form part of the bid and are disregarded.'),
  ] },

  // 9 · Part 3: language (§27, Arabic prevails), currency (§28)
  { n: 9, part: 'p3', blocks: [
    PART('p3'),
    C(27, 'Language of the bid'),
    S('27.1', 'The bid, and all correspondence and documents relating to it, shall be in Arabic. Documents in another language may accompany the bid.'),
    S('27.2', 'Technical literature, catalogues, data sheets, test certificates and design calculations may be submitted in English without translation. The Entity may ask for a translation of any part of them.'),
    S('27.3', 'This booklet is issued in English for the convenience of bidders. The Arabic text of the tender documents is available on the electronic portal.'),
    S('27.4', `In the event of any conflict or inconsistency between the Arabic text and any other text, the Arabic text shall prevail.`),
    S('27.5', 'Amounts shall be written in figures and in words. Where the figures and the words differ, the words prevail (clause 52).'),
    S('27.6', 'The Bidder is responsible for the accuracy of any translation it submits, and the Entity may rely on the translation in evaluating the bid.'),
    C(28, 'Currency'),
    S('28.1', 'All prices shall be stated in Saudi riyals (SAR). All payments under the contract are made in Saudi riyals, by bank transfer to the Contractor’s account with a bank licensed in the Kingdom.'),
    S('28.2', 'Where the Bidder obtains quotations in a foreign currency, it shall convert them to Saudi riyals itself. The Bidder bears all exchange-rate risk, and no adjustment is made for changes in exchange rates after the bid submission deadline.'),
    S('28.3', 'Prices are fixed for the duration of the contract. No price adjustment applies, except for variations ordered under the contract and valued at the bid rates.'),
    S('28.4', 'The bid price shall include all bank charges, transfer costs and costs of foreign exchange.'),
    NOTE('<p><b>Note to bidders.</b> Clauses 29, 33, 37, 39 and 41 set conditions under which bids have most often been found non-compliant at examination. Bidders should read them with care, and raise any question through the electronic portal before the deadline for questions in clause 4.</p>'),
  ] },

  // 10 · Part 3: validity (§29), §30–32, questions (§33, ambiguous answer period), site visit (§34)
  { n: 10, part: 'p3', blocks: [
    C(29, 'Bid validity'),
    S('29.1', `Bids shall remain valid for a period of 90 days from the date of bid opening. A bid stating a shorter validity is excluded.`),
    S('29.2', 'The Entity may ask bidders to extend the validity of their bids in accordance with clause 47.'),
    C(30, 'Cost of preparing bids'),
    P('The Bidder bears all costs of preparing and submitting its bid, including site visits, clarifications and negotiations. The Entity is not liable for these costs, whatever the outcome of the tender.'),
    C(31, 'Notices and correspondence'),
    P('The electronic portal is the official channel for all notices and correspondence in this tender. A portal outage of three (3) consecutive days or less extends any deadline in clause 4 falling within it by the same period. During a longer outage, the Bidder shall address the representative named in clause 7, and bids are delivered under clause 45.4.'),
    C(32, 'Accuracy of information'),
    P('The Bidder shall verify all information in the tender documents, and shall take account of all laws and regulations in force in the Kingdom when preparing its prices. No claim is accepted on the ground of error or misunderstanding.'),
    C(33, 'Questions and enquiries'),
    S('33.1', `Bidders shall send their questions and enquiries through the electronic portal within ten (10) days from the date of publication of the tender, and the Entity shall answer them within seven (7) days from that date.`),
    S('33.2', 'Questions shall be submitted on the form in Annex (2). Answers are sent to all bidders through the electronic portal without identifying the enquirer, and form part of the tender documents.'),
    S('33.3', 'If the electronic portal is unavailable, questions may be sent to the representative in clause 7 by official mail or by email.'),
    C(34, 'Information and site visit'),
    S('34.1', 'The Bidder shall inform itself of the site and its surroundings, ground and groundwater conditions, access, existing utilities and all other matters that may affect its bid. No claim is accepted for lack of knowledge of site conditions.'),
    S('34.2', 'The Entity will hold a site visit and scope-briefing meeting on the date in clause 4. Attendance is recommended but is not a condition of the bid. Bidders shall register up to four (4) attendees through the electronic portal at least two (2) working days in advance. As the Phase 1 plant is in operation, attendees shall wear safety footwear and high-visibility clothing and follow the instructions of the plant staff.'),
  ] },

  // 11 · Part 3: technical and financial files (§35–36), prices (§37), payment schedule (§38), taxes (§39)
  { n: 11, part: 'p3', blocks: [
    C(35, 'Technical proposal documents'),
    P('The technical file shall contain:'),
    L([
      'the purchase receipt for the tender documents and the certificates in clause 6;',
      'the methodology, the process design basis and a preliminary mass balance for the Works;',
      'the preliminary programme (clause 65) and the organisation chart;',
      'the evidence required by Annex (4), including completion certificates for the reference projects and the CVs of the key personnel;',
      'outline health, safety and environment and quality plans;',
      'the list of proposed subcontractors and suppliers, with the works assigned to each, without prices;',
      'the consortium agreement or undertaking, where applicable (clause 22);',
      'the target local content percentage (clause 76). A bid without it is excluded.',
    ]),
    C(36, 'Financial proposal documents'),
    P('The financial file shall contain the priced bill of quantities (Volume 2) in figures and in words; the payment schedule (clause 38); a copy of the initial guarantee (clause 41); the prices of the subcontracted works (clause 23); form EXP-KD0-GL-000004 (clause 83); and the separately priced operation and maintenance option (clause 84).'),
    C(37, 'Writing prices'),
    L([
      'Bidders shall price the Works exactly as described in the specifications and the bill of quantities, without amendment, reservation or omission. A bid that changes the tender terms is excluded.',
      'Unit rates and totals shall be written in figures and in words, in Saudi riyals.',
      'No erasure or overwriting is allowed. A correction shall be rewritten in figures and in words and signed. Erasures affecting more than 10% of the priced items or of the bid value may lead to exclusion.',
      'Every item shall be priced. An unpriced item is treated as included in the other prices (clause 53).',
    ]),
    C(38, 'Payment schedule'),
    P('The Bidder shall propose a payment schedule showing the amount of each payment, its percentage of the bid price and the milestone to which it relates. The Entity may require changes to the schedule at the examination stage.'),
    C(39, 'Taxes and fees'),
    P(`Prices shall be inclusive of all taxes, fees and expenses. The Entity shall not pay any amount in addition to the bid price in respect of any tax, duty or charge.`),
  ] },

  // 12 · Part 3: guarantees (§40), initial guarantee 1% (§41), §42–44
  { n: 12, part: 'p3', blocks: [
    C(40, 'General rules on guarantees'),
    L([
      'Guarantees shall be issued by a bank licensed in the Kingdom, including licensed branches of foreign banks. A foreign bank may issue a guarantee through a local bank.',
      'A guarantee may be shared between several banks, provided that the shares together make up the required amount.',
      'Guarantees shall be unconditional and irrevocable, payable on first demand without recourse to a court or arbitration, and free of any deduction for taxes, fees or costs.',
      'A guarantee may be replaced by another bank’s guarantee; the original is released only when the substitute has been received.',
    ]),
    C(41, 'Initial guarantee'),
    S('41.1', `Initial guarantee: 1% of the total bid value, provided as an original bank guarantee submitted with the bid. In this two-file tender, a copy is placed in the financial file and the original is delivered to the address in clause 8 before the bid submission deadline.`),
    S('41.2', 'The initial guarantee shall remain valid for at least ninety (90) days from the date of bid opening. A bid submitted without an initial guarantee is not accepted.'),
    S('41.3', 'If the amount of the guarantee is short by no more than 10%, or its validity by no more than thirty (30) days, the Bidder shall make good the shortfall within ten (10) working days of notice, failing which it is treated as having withdrawn and the guarantee is forfeited. A shortfall of one or two days in validity is disregarded.'),
    S('41.4', 'The successful Bidder shall extend its initial guarantee as necessary until the final guarantee is provided. Other guarantees are returned after award, cancellation, or expiry of bid validity.'),
    S('41.5', 'Local small and medium enterprises are exempt from the initial guarantee, subject to clause 48.'),
    C(42, 'Forfeiture of guarantees'),
    P('A guarantee is forfeited only on the recommendation of the examination committee, and only for the purpose for which it was given. The Entity asks the issuing bank in writing to pay the amount, stating that the guarantee is forfeited.'),
    C(43, 'Alternative offers'),
    P('Alternative offers are not accepted.'),
    C(44, 'Bid formatting'),
    P('Files shall be in searchable PDF, except the bill of quantities, which shall use the Entity’s XLSX template. No single file may exceed 50 MB. Each file name shall include the tender reference and the content of the file.'),
  ] },

  // 13 · Part 4: submission (§45), late bids (§46)
  { n: 13, part: 'p4', blocks: [
    PART('p4'),
    C(45, 'Submission mechanism'),
    S('45.1', 'Bids shall be submitted through the electronic portal by the bid submission deadline in clause 4, in two separate files: a technical file and a financial file. Each file shall be encrypted in the manner required by the electronic portal.'),
    S('45.2', 'The bid shall be accompanied by a signed official cover letter on the form in Annex (1), issued by the Bidder or its legal representative, together with the documents listed in clauses 35 and 36.'),
    S('45.3', 'Where the Bidder is required to submit an economic participation file (Part 10), that file is submitted separately from the technical and financial files.'),
    S('45.4', 'If the electronic portal is unavailable for more than three (3) consecutive days, bids may be delivered by hand to the address in clause 8, in separate sealed envelopes marked “Technical file” and “Financial file” with the tender name and reference. The Entity issues a receipt stating the date and time of delivery.'),
    S('45.5', 'The names of the bidders are published on the electronic portal after the bids are opened.'),
    H('Contents of the two files'),
    T(['Technical file', 'Financial file'], [
      ['Cover letter (Annex 1)', 'Cover letter (Annex 1)'],
      ['Purchase receipt and the certificates in clause 6', 'Priced bill of quantities (XLSX template and PDF)'],
      ['Methodology, programme and organisation', 'Payment schedule (clause 38)'],
      ['Evidence for the criteria in Annex (4)', 'Copy of the initial guarantee (clause 41)'],
      ['Subcontractor and supplier list, without prices', 'Prices of the subcontracted works'],
      ['Target local content percentage (clause 76)', 'Form EXP-KD0-GL-000004'],
      ['Consortium agreement or undertaking, if any', 'Price of the operation and maintenance option'],
    ], { widths: ['50%', '50%'] }),
    C(46, 'Late bids'),
    S('46.1', 'A bid received after the bid submission deadline, or submitted by a channel other than those in clause 45, is not considered.'),
    S('46.2', 'The Bidder bears the risk of any delay in submission, whatever its cause, including loss of connectivity or failure of its own systems. The time of submission recorded by the electronic portal is conclusive.'),
    S('46.3', 'An original initial guarantee received at the address in clause 8 after the bid submission deadline is treated as not submitted.'),
  ] },

  // 14 · Part 4: validity extension (§47), withdrawal (§48), opening (§49)
  { n: 14, part: 'p4', blocks: [
    C(47, 'Extension of bid validity and postponement of opening'),
    S('47.1', 'The Entity may, before bid validity expires, ask bidders to extend the validity of their bids for up to ninety (90) additional days. Bidders shall reply within two (2) weeks of the request and, if they agree, extend their initial guarantees accordingly.'),
    S('47.2', 'A bidder that does not reply within that period is treated as having declined the extension. Its bid is set aside and its guarantee returned, without forfeiture.'),
    S('47.3', 'Any further extension requires the approval of the Minister of Finance. Without that approval, the tender is cancelled.'),
    S('47.4', 'The Entity may postpone the bid submission deadline and the opening by an addendum published before the deadline (clause 10).'),
    C(48, 'Withdrawal of bids'),
    S('48.1', 'A bidder may withdraw its bid before the bid submission deadline, and its initial guarantee is then returned.'),
    S('48.2', 'A bidder that withdraws its bid after the bid submission deadline forfeits its initial guarantee.'),
    S('48.3', 'A local small or medium enterprise that is exempt from the initial guarantee and withdraws after the deadline pays a fine equal to the guarantee it would otherwise have provided. If the fine is not paid within sixty (60) days, the enterprise is barred from dealing with government entities for one (1) year.'),
    C(49, 'Bid opening'),
    S('49.1', 'Bids are opened immediately after the bid submission deadline, at the time shown in clause 4, by the bid opening committee. Bidders or their representatives may attend.'),
    S('49.2', 'As this tender uses two files, only the technical files are opened at the opening session, and only the names of the bidders are announced. The financial files remain sealed and encrypted.'),
    S('49.3', 'The financial files of the bidders that pass the technical evaluation are opened at a later session, notified to those bidders through the electronic portal. The financial files of the other bidders are not opened.'),
    S('49.4', 'At the opening session the committee may not exclude any bid, ask for any correction, or accept any document handed over during the session.'),
    S('49.5', 'A record of the opening session is prepared and signed by the members of the committee.'),
  ] },

  // 15 · Part 5: confidentiality (§50), evaluation (§51, first part)
  { n: 15, part: 'p5', blocks: [
    PART('p5'),
    C(50, 'Confidentiality of evaluation'),
    P('The Entity keeps all information about the examination and evaluation of bids confidential, and does not disclose it to bidders or any other party until the results are announced, except as the Law requires.'),
    P('Bidders shall not contact the members of the examination committee about their bids. Any attempt to influence the evaluation leads to exclusion of the bid (clause 12).'),
    C(51, 'Evaluation criteria'),
    S('51.1', 'Bids are evaluated against the criteria and weights in Annex (5), set under the rules issued by the Expenditure Efficiency and Projects Authority.'),
    S('51.2', 'The technical evaluation is carried out first. Only bids that achieve the technical pass mark stated in Annex (5) proceed to the financial evaluation. The technical scores of all bidders are disclosed with the results (clause 54).'),
    S('51.3', 'During the technical evaluation the committee may interview the proposed key personnel, visit reference projects, and ask bidders to clarify their technical proposals, provided that no clarification changes the substance of a bid or its price.'),
    S('51.4', 'For comparison, the price of a foreign product is treated as 10% higher than its bid price, so that national products receive a price preference of 10%. The preference does not apply to products on the mandatory list (clause 75), which must be of national origin. The further preferences for local small and medium enterprises and listed companies apply as the Regulation provides.'),
    H('Stages of evaluation'),
    T(['Stage', 'Content', 'Result'], [
      ['1. Preliminary examination', 'Completeness of the files; certificates (clause 6); initial guarantee; signatures; correction of prices (clause 52)', 'Compliant, cure period, or excluded'],
      ['2. Technical evaluation', 'Criteria and weights in Annex (5)', 'Score out of 100; pass or fail against the pass mark'],
      ['3. Financial evaluation', 'Corrected prices; national product preference; local content formula (clause 51.6)', 'Financial score'],
      ['4. Post-qualification', 'Criteria in the post-qualification annex (clause 24)', 'Qualified, or the next bidder is considered'],
    ], { widths: ['40mm', 'auto', '48mm'] }),
  ] },

  // 16 · Part 5: local content formula (§51 continued), correction (§52)
  { n: 16, part: 'p5', blocks: [
    S('51.5', 'This tender applies the weighting of local content in the financial evaluation at contract level. Each bidder shall state a target local content percentage in its technical file. A bidder that does not state a target local content percentage is excluded.'),
    S('51.6', 'The financial score of each technically qualified bid is calculated as follows:'),
    F('Financial score = (lowest technically qualified price ÷ bidder’s price) × 60%<br>+ (target local content % × 50% + local content baseline × 50% + 5 points if the bidder is listed on the stock market) × 40%'),
    S('51.7', 'The contract is awarded to the bid with the highest financial score, provided that its price does not exceed the lowest technically qualified price by more than 10%. Otherwise the bid with the next highest score is considered, on the same condition, and so on.'),
    S('51.8', 'The committee applies the formula to the corrected prices (clause 52), after the preference in clause 51.4. The local content baseline is taken from the certificate submitted with the bid.'),
    C(52, 'Correction of bids'),
    L([
      'Where the price in words differs from the price in figures, the price in words prevails.',
      'Where a unit rate multiplied by the quantity differs from the total for the item, the unit rate prevails, unless there is an obvious error in the unit rate, such as a misplaced decimal point, in which case the total prevails and the rate is corrected.',
      'Arithmetic errors in adding up the item totals are corrected, and the corrected total becomes the bid price.',
      'A bidder that does not accept the correction of its bid is excluded.',
      'If the corrected errors exceed 10% of the priced items or of the bid value, the committee may exclude the bid.',
    ]),
    S('52.1', 'The committee records every correction and notifies the Bidder of the corrected price through the electronic portal. The Bidder shall confirm its acceptance within five (5) working days of the notice.'),
    S('52.2', 'Corrections do not change the rates of items that are correctly priced, and the corrected bill of quantities becomes part of the contract.'),
    S('52.3', 'Where the cover letter offers a discount, the discount is applied to the corrected total, and the Bidder shall state how it is distributed over the items of the bill of quantities.'),
  ] },

  // 17 · Part 5: examination (§53), results (§54), standstill (§55)
  { n: 17, part: 'p5', blocks: [
    C(53, 'Examination of bids'),
    S('53.1', 'If a bid lacks any certificate listed in clause 6, or a certificate has expired, the committee gives the Bidder no more than ten (10) working days to provide it. If the Bidder does not, the bid is excluded and the initial guarantee is forfeited.'),
    S('53.2', 'Where an item is not priced, the committee may exclude the bid or treat the item as included in the total price, at the Bidder’s cost.'),
    S('53.3', 'Where rates for some items are unbalanced compared with the estimated cost and market prices, the committee may ask the Bidder to re-price those items without changing the total price. A bidder that refuses is excluded, and its guarantee is returned.'),
    S('53.4', 'Where two or more bids have the same evaluated result, preference is given in this order: the lower price; a split award, where the terms allow it; local small and medium enterprises; and, if bids remain equal, a closed competition between the tied bidders.'),
    S('53.5', 'The committee may ask a bidder to clarify its bid in writing. A clarification may not change the price or the substance of the bid.'),
    C(54, 'Announcement of results'),
    S('54.1', 'The Entity announces the award through the electronic portal, stating the name of the successful Bidder, the value and duration of the contract and the place of execution.'),
    S('54.2', 'Each unsuccessful bidder is told why its bid was not accepted, and is given its technical score.'),
    S('54.3', 'Contracts are published on the electronic portal within thirty (30) days of signature, as the Regulations require.'),
    C(55, 'Standstill period'),
    S('55.1', 'The Entity shall not award the contract until a standstill period of five (5) working days has passed from the announcement of the intended award.'),
    S('55.2', 'A bidder may submit a grievance against the intended award through the electronic portal only, before the standstill period ends, under Article 87 of the Law. Grievances received after that are not considered.'),
    S('55.3', 'The award becomes effective only after the standstill period ends and any grievance has been decided.'),
    S('55.4', 'A grievance does not release the other bidders from their bids, which remain valid in accordance with clause 29.'),
  ] },

  // 18 · Part 6: award (§56), final guarantee (§57), signature (§58)
  { n: 18, part: 'p6', blocks: [
    PART('p6'),
    C(56, 'Award notification'),
    S('56.1', 'The Entity notifies the successful Bidder of the award through the electronic portal. The notice states the scope, the contract value and the expected date of site handover.'),
    S('56.2', 'The award notice does not bind the Entity until the contract is signed. Before signature, the Entity verifies that the site is ready for handover.'),
    S('56.3', 'Within ten (10) working days of signature, the Entity and the Contractor hold a kick-off meeting, and the Entity hands over the site, or its first part, against a signed record.'),
    C(57, 'Final guarantee'),
    S('57.1', `The successful Bidder shall provide a final guarantee of 5% of the contract value within fifteen (15) working days from the date of the award notification. The Entity may extend this period once, by a further period not exceeding the first.`),
    S('57.2', 'The final guarantee shall remain valid until final acceptance of the Works, and the Contractor shall extend it as necessary.'),
    S('57.3', 'A bidder that fails to provide the final guarantee within the period loses the award, and its initial guarantee is forfeited. A local small or medium enterprise exempt from the initial guarantee pays a fine equal to it.'),
    C(58, 'Signature of the contract'),
    S('58.1', 'No work may start before the contract is signed (Article 55 of the Law).'),
    S('58.2', 'The Entity invites the successful Bidder to sign the contract after the final guarantee is received. If the Bidder does not attend, it is warned in writing and given ten (10) working days to sign. If it still does not sign, the award is cancelled, the final guarantee is forfeited, and the matter is referred to the committee under Article 88 of the Law.'),
    S('58.3', 'If the Entity does not sign the contract within thirty-five (35) working days of receiving the final guarantee, the Bidder may give notice of withdrawal. If the contract is not signed within ten (10) working days of that notice, the Bidder’s guarantees are returned.'),
    S('58.4', 'If the payment schedule in the contract differs materially from the one agreed at examination, the Bidder may withdraw within ten (10) working days without forfeiting its guarantee.'),
  ] },

  // 19 · Part 6: penalties (§59), delay penalty cap left blank (§60), §61, total cap (§62), insurance (§63)
  { n: 19, part: 'p6', blocks: [
    C(59, 'Penalties'),
    S('59.1', 'The Contractor is liable to the penalties in this Part for delay and for failure to perform its obligations. Penalties are deducted from sums due to the Contractor or from its guarantees.'),
    S('59.2', 'Default penalties apply per occurrence, after written notice and failure to remedy within the period stated in the notice:'),
    T(['Default', 'Penalty'], [
      ['Monthly progress or HSE report not submitted on time', 'SAR 10,000'],
      ['Key personnel removed or replaced without approval (clause 86)', 'SAR 50,000 per person'],
      ['Uncontrolled discharge or bypass caused by the Contractor at the Phase 1 plant', 'SAR 100,000'],
      ['Night, Friday or holiday work without approval (clause 69)', 'SAR 20,000'],
    ], { widths: ['auto', '44mm'] }),
    S('59.3', 'The value of any unexecuted or non-conforming item is deducted in addition to the penalties.'),
    C(60, 'Delay penalties'),
    S('60.1', 'If the Contractor fails to complete the Works, or a milestone in clause 65, by the required date, a delay penalty of 0.5% of the value of the delayed works applies for each week of delay or part of a week.'),
    S('60.2', `The total delay penalties shall not exceed [ %] of the contract value.`),
    S('60.3', 'After preliminary handover of part of the Works, the Entity may limit the delay penalties to the value of the delayed part.'),
    C(61, 'Penalties for breach of the local content regulation'),
    S('61.1', 'A penalty of 30% of the value of the purchases in which the Contractor did not give preference to national products as the Regulation requires.'),
    S('61.2', 'A penalty of up to 10% of the contract value if the Contractor does not achieve its target local content percentage.'),
    C(62, 'Total penalties'),
    P(`The total of all penalties under this Part, including delay, default and local content penalties, shall not exceed 20% of the contract value.`),
    C(63, 'Insurance'),
    P('From site handover until final acceptance, the Contractor shall maintain contractor’s all risks insurance for the full contract value; third-party liability insurance of not less than SAR 20,000,000 per occurrence; professional indemnity insurance for its design of not less than SAR 10,000,000; and employer’s liability and vehicle insurance as the law requires. Insurance certificates are a condition of payment (clause 82).'),
  ] },

  // 20 · Part 7: background and design basis
  { n: 20, part: 'p7', blocks: [
    PART('p7'),
    C(64, 'Project scope of work'),
    H('64.1 Project background'),
    P('The Al-Rawdah Sewage Treatment Plant (Phase 1) has treated municipal wastewater from the eastern districts of the city since 2013. It uses conventional activated sludge with nitrification and denitrification, and has a design capacity of 150,000 m3/day. An operation and maintenance contractor runs the plant for the Entity, and the plant shall remain in operation throughout the Works.'),
    P('Phase 2 adds 150,000 m3/day of treatment capacity on land reserved within the plant boundary to the north of Phase 1, bringing the total capacity of the plant to 300,000 m3/day. The Phase 2 effluent receives tertiary filtration and ultraviolet disinfection and is pumped to the Entity’s reuse reservoir, for the irrigation of public landscaping and agriculture.'),
    H('64.2 Design basis'),
    T(['Parameter', 'Unit', 'Influent (Phase 2)', 'Treated effluent'], [
      ['Average daily flow', 'm3/day', '150,000', '150,000'],
      ['Peak hourly flow factor', '–', '1.8', '–'],
      ['Biochemical oxygen demand (BOD5)', 'mg/l', '300', '≤ 10'],
      ['Total suspended solids', 'mg/l', '320', '≤ 10'],
      ['Total nitrogen', 'mg/l', '55', '≤ 10'],
      ['Ammonia nitrogen', 'mg/l', '38', '≤ 1'],
      ['Turbidity', 'NTU', '–', '≤ 2 (average)'],
      ['Faecal coliforms', 'MPN/100 ml', '–', '< 2.2'],
      ['Wastewater temperature range', '°C', '22–36', '–'],
    ], { widths: ['auto', '24mm', '32mm', '32mm'], align: ['', 'c', 'c', 'c'] }),
    P('The Contractor shall confirm the design basis against the plant records provided by the Entity, and shall report any discrepancy before submitting the design for approval. Where the national standards for treated wastewater reuse in force at preliminary acceptance are stricter than the table above, the treated effluent shall meet those standards.'),
    P('Capacities, flows and quality parameters stated in this Part apply to Phase 2 alone, unless stated otherwise.'),
  ] },

  // 21 · Part 7: scope summary and design responsibility
  { n: 21, part: 'p7', blocks: [
    H('64.3 Scope summary'),
    P('<b>Included work.</b> The Works include, without limitation:'),
    L([
      'inlet works: fine screening, grit removal, flow measurement and the flow split to Phase 2;',
      'biological treatment: four bioreactor lanes with anoxic and aerobic zones, aeration blowers and diffusers, and internal recirculation;',
      'six secondary clarifiers, with return and waste activated sludge pumping;',
      'tertiary filtration, ultraviolet disinfection and chlorine residual dosing;',
      'sludge thickening and dewatering, cake storage and truck loading;',
      'odour control for the inlet works and the sludge treatment building;',
      'a 33/11 kV substation, the 11 kV distribution, motor control centres and standby generation;',
      'instrumentation, control and SCADA, and integration with the Entity’s central control centre (clause 64.10);',
      'yard piping, valves and penstocks, and the tie-ins to Phase 1 (clause 64.11);',
      'the TSE storage tank and pump station, and the TSE transmission system (clause 64.6);',
      'buildings, internal roads, drainage, fencing, lighting and landscaping in the Phase 2 area.',
    ]),
    P('<b>Excluded work.</b> Operation of the Phase 1 plant; off-site transport and disposal of dewatered sludge; the 33 kV incoming supply up to the substation incomer, provided by the electricity company; and the reuse reservoir.'),
    P('<b>Supplied by the Entity.</b> The site, free of encumbrances; the existing plant records and as-built drawings; and treated effluent for commissioning.'),
    P('<b>Interfaces.</b> The Phase 1 operation and maintenance contractor; the electricity company for the 33 kV supply; the municipality and the roads authority for the pipeline corridor and crossings; and the operator of the reuse reservoir.'),
    H('64.4 Design responsibility'),
    P('The Contractor is responsible for the design of the process, mechanical, electrical, instrumentation and control works and of all temporary works, and for the detailed design of connections, supports and embedded items. The civil works are built to the issued design in Volume 3. The Contractor shall check that design against its process and equipment selection and report any conflict before construction.'),
  ] },

  // 22 · Part 7: liquid treatment line
  { n: 22, part: 'p7', blocks: [
    H('64.5 Liquid treatment line'),
    S('64.5.1', '<b>Inlet works.</b> Six mechanically raked fine screens of 6 mm aperture with washer-compactors, four vortex grit removal units with classifiers, and electromagnetic flow measurement on the Phase 2 inlet. The Phase 2 flow is taken from the existing inlet pumping station, whose spare capacity the Contractor shall verify by testing before the design is approved.'),
    S('64.5.2', '<b>Bioreactors.</b> Four lanes, each with anoxic and aerobic zones, sized for the design basis at the minimum design temperature with a safety factor on sludge age of not less than 1.5. Aeration is by fine-bubble membrane diffusers supplied by six high-speed turbo blowers (five duty, one standby), with dissolved-oxygen and ammonium-based control of the air supply to each zone.'),
    S('64.5.3', '<b>Secondary clarifiers.</b> Six circular clarifiers of 52 m diameter with half-bridge scraper mechanisms, a surface overflow rate at peak flow of not more than 1.6 m/h, and return and waste activated sludge pumping with variable speed drives.'),
    S('64.5.4', '<b>Tertiary treatment.</b> Cloth disc filters sized for peak flow with one unit out of service, producing filtered effluent with a turbidity of not more than 2 NTU, followed by ultraviolet disinfection in three channels at a validated dose of not less than 40 mJ/cm2, and sodium hypochlorite dosing to keep a chlorine residual in the TSE system.'),
    S('64.5.5', '<b>Hydraulics.</b> The hydraulic profile shall allow gravity flow from the inlet works to the TSE storage tank at peak flow with one unit out of service in each process stage, with a freeboard of not less than 300 mm in every open channel and tank.'),
    S('64.5.6', '<b>Performance.</b> The Contractor guarantees the effluent quality in clause 64.2 and the specific power consumption stated in its bid. The guarantees are demonstrated by performance tests during the process proving period (clause 64.16).'),
    S('64.5.7', '<b>Flexibility.</b> The layout shall allow a future fifth bioreactor lane and a seventh clarifier without interrupting the operation of Phase 2, and the Contractor shall show this on its layout drawings.'),
    S('64.5.8', '<b>Access and lifting.</b> Walkways, stairs and platforms shall give safe access to every item of equipment, and permanent lifting equipment shall be provided for every item heavier than 50 kg.'),
    S('64.5.9', '<b>Process control philosophy.</b> The Contractor shall submit a process control philosophy with the 60% design, describing the control of flow splitting, aeration, sludge age and recirculation, and the response to power failures and equipment trips.'),
  ] },

  // 23 · Part 7: TSE transmission system (16 km)
  { n: 23, part: 'p7', blocks: [
    H('64.6 TSE transmission system'),
    S('64.6.1', `The Contractor shall design, supply, lay, test and commission a TSE transmission pipeline, DN1000 GRP, approximately 16 km long, from the TSE pump station at the plant to the inlet chamber of the Entity’s reuse reservoir, with all chambers, fittings and crossings.`),
    S('64.6.2', 'The pipeline follows the service corridor shown on the drawings. It includes two crossings of a dual carriageway by pipe jacking, one wadi crossing, and crossings of existing water, power and telecommunications services, each to be agreed with the owner of the service.'),
    S('64.6.3', 'Pipes shall be glass-reinforced plastic (GRP), pressure class PN16 and stiffness class SN10000, from a national manufacturer holding the required baseline certificate, as GRP pipes are on the mandatory list (clause 75). Fittings and valves in chambers shall be ductile iron or stainless steel, as specified.'),
    S('64.6.4', 'Air valves shall be provided at high points, washouts at low points, and isolating valve chambers at intervals of not more than 1.5 km. The Contractor shall carry out a surge analysis and provide surge protection accordingly.'),
    S('64.6.5', '<b>TSE storage tank and pump station.</b> A covered TSE storage tank of 20,000 m3 at the plant, and a pump station with four duty and one standby vertical turbine pumps with variable speed drives, able to deliver the peak TSE demand against the system curve with one pump out of service.'),
    S('64.6.6', 'The Contractor shall obtain all permits for the works in the corridor and at the crossings, and shall reinstate roads, tracks and landscaping to their original condition. Traffic management at the road crossings shall be approved by the roads authority before work starts.'),
    S('64.6.7', 'The pipeline shall be surveyed and recorded as laid, with the coordinates and levels of every chamber, and marked with warning tape and route markers at intervals of not more than 200 m.'),
    S('64.6.8', '<b>Monitoring.</b> Flow meters at the pump station outlet and at the reservoir inlet, and pressure transmitters at the main chambers, shall be connected to SCADA so that leaks and bursts are detected.'),
    S('64.6.9', '<b>Corridor constraints.</b> Where the corridor runs within thirty (30) m of overhead power lines, or crosses pipelines of other owners, the Contractor shall follow the owners’ safety rules and obtain their work permits.'),
    S('64.6.10', '<b>Handover.</b> Each pipeline section is handed over after hydrostatic testing, flushing and reinstatement of the corridor, together with its as-laid survey.'),
  ] },

  // 24 · Part 7: sludge treatment and odour control
  { n: 24, part: 'p7', blocks: [
    H('64.7 Sludge treatment'),
    S('64.7.1', 'Waste activated sludge is thickened by four gravity belt thickeners to not less than 5% dry solids, and dewatered by four centrifuges (three duty, one standby) to not less than 22% dry solids, with polymer preparation and dosing.'),
    S('64.7.2', 'Dewatered cake is conveyed to two covered storage silos of 200 m3 each, with truck loading. Transport and disposal of the cake are by others, and the Contractor shall coordinate the loading arrangements with them.'),
    S('64.7.3', 'Centrate and filtrate are returned to the inlet of the bioreactors through a balancing tank, so that return loads do not disturb the biological process.'),
    S('64.7.4', 'The sludge treatment building shall be enclosed, with forced ventilation connected to the odour control system, and shall house the polymer plant, the dewatering units and their motor control centre.'),
    S('64.7.5', 'Sludge storage and handling shall provide at least three (3) days of storage for dewatered cake, so that a weekend or holiday without collection does not stop dewatering.'),
    S('64.7.6', 'Sampling points shall be provided on the sludge lines before and after thickening and dewatering, and on the centrate return.'),
    H('64.8 Odour control'),
    S('64.8.1', 'Odorous air from the inlet works, the sludge treatment building and the centrate balancing tank is extracted and treated in three biotrickling filter units, followed by activated carbon polishing.'),
    S('64.8.2', 'The odour control system shall limit the odour concentration at the plant boundary to 5 odour units (98th percentile of hourly averages), confirmed by dispersion modelling at the design stage and by measurement during the process proving period.'),
    S('64.8.3', 'Hydrogen sulphide is monitored continuously at the inlet works, in the sludge treatment building and at the outlet of each odour control unit, with alarms to SCADA.'),
    S('64.8.4', 'Ductwork shall be GRP, with dampers for balancing and access openings for inspection and cleaning. Covers over open channels shall be removable in sections for maintenance.'),
    S('64.8.5', 'During tie-ins and other works that open existing channels or tanks, the Contractor shall provide temporary odour control and notify the Entity in advance.'),
    S('64.8.6', 'The Contractor shall investigate any odour complaint from neighbouring areas within twenty-four (24) hours, and report it to the Entity with the corrective action taken.'),
  ] },

  // 25 · Part 7: electrical, ICA and SCADA
  { n: 25, part: 'p7', blocks: [
    H('64.9 Electrical works'),
    S('64.9.1', 'A new 33/11 kV substation with gas-insulated switchgear, two 20 MVA power transformers (each able to carry the full Phase 2 load), protection, control and metering, connected to the 33 kV supply provided by the electricity company.'),
    S('64.9.2', 'An 11 kV ring main to the process areas, six 11/0.4 kV distribution transformers of 2,500 kVA, motor control centres of form 4b construction with variable speed drives where required, and power factor correction.'),
    S('64.9.3', 'Two standby diesel generator sets of 2,000 kVA with fuel storage for 48 hours, able to supply the essential loads, including the inlet works, one blower per lane, the ultraviolet system and the TSE pump station.'),
    S('64.9.4', 'LV power and control cables shall be XLPE insulated and armoured, from a national manufacturer, as LV cables are on the mandatory list. Earthing, lightning protection, and internal and external lighting shall be provided throughout.'),
    S('64.9.5', '<b>Energy efficiency.</b> Motors shall be of efficiency class IE3 or better. Power monitoring shall be provided on each motor control centre, and SCADA shall report the specific energy consumption of the plant.'),
    H('64.10 Instrumentation, control and SCADA'),
    S('64.10.1', 'A plant control system of programmable logic controllers with redundant processors in each process area, connected by a single-mode fibre-optic ring to a SCADA system with redundant servers and operator workstations in the Phase 2 control room.'),
    S('64.10.2', 'Online instruments shall include flow, level and pressure measurement, and analysers for dissolved oxygen, ammonium, nitrate, suspended solids and turbidity, as shown on the drawings.'),
    S('64.10.3', 'The Contractor shall integrate the Phase 2 SCADA with the Entity’s existing central control centre in Dammam, including data exchange, alarm transfer, remote monitoring and reports, in accordance with the Entity’s control-system standards and cyber-security requirements.'),
    S('64.10.4', 'Application software, licences and source code become the property of the Entity (clause 15).'),
    S('64.10.5', '<b>Testing.</b> The control system is tested at the factory before shipment and on site before commissioning. The Entity’s control-centre staff attend the tests of the interface in clause 64.10.3.'),
    S('64.10.6', '<b>Cyber-security.</b> The control network shall be segregated from the corporate network, with the controls required by the national cybersecurity regulations for critical infrastructure.'),
  ] },

  // 26 · Part 7: tie-ins to the live plant and general work requirements
  { n: 26, part: 'p7', blocks: [
    H('64.11 Tie-ins to the operating plant'),
    S('64.11.1', 'Phase 1 shall remain in operation throughout the Works. The Contractor shall plan every connection to the existing plant so that treatment is not interrupted, and shall agree each tie-in with the Entity and the Phase 1 operator at least twenty-eight (28) days in advance.'),
    T(['Ref.', 'Tie-in', 'Maximum shutdown', 'Condition'], [
      ['TI-01', 'Inlet channel flow split to Phase 2', '8 hours', 'Night-time low flow, with a temporary bypass'],
      ['TI-02', 'Sludge return and centrate lines', '12 hours', 'Phase 1 sludge line on standby'],
      ['TI-03', '11 kV interconnection with the Phase 1 switchboard', '6 hours', 'Standby generation on Phase 1'],
      ['TI-04', 'SCADA interconnection with the Phase 1 control room', 'None', 'Parallel running before cut-over'],
      ['TI-05', 'Phase 1 effluent to the Phase 2 tertiary inlet', '8 hours', 'Provision only in this contract'],
    ], { widths: ['14mm', 'auto', '26mm', '52mm'] }),
    S('64.11.2', 'No shutdown may take place between 1 June and 30 September, when flows and temperatures are highest, unless the Entity approves otherwise in writing.'),
    H('64.12 General work requirements'),
    L([
      '<b>Licences and permits.</b> The Contractor obtains all licences and permits for the Works, except those the Entity is required by law to obtain itself.',
      '<b>Coordination.</b> The Contractor coordinates with the Entity, the Phase 1 operator, the authorities and the service owners, and attends weekly progress meetings.',
      '<b>Information requests.</b> The Contractor answers the Entity’s requests for information within twenty-four (24) hours orally and within seventy-two (72) hours in writing.',
      '<b>Health, safety, security and environment.</b> The Contractor implements an approved HSSE management system from mobilisation (clause 89).',
      '<b>Traffic management.</b> Works affecting public roads are carried out under approved traffic management plans.',
      '<b>Quality management.</b> The Contractor implements the quality plan in clause 73 from mobilisation, with inspection and test plans approved before each activity starts.',
      '<b>Project management.</b> The Contractor submits monthly progress reports covering progress, programme, HSE, quality, local content and risks.',
      '<b>Site security.</b> The Contractor secures its work areas, controls access to them and keeps a register of all persons on site.',
    ], 'dash'),
  ] },

  // 27 · Part 7: engineering, procurement, construction, commissioning
  { n: 27, part: 'p7', blocks: [
    H('64.13 Engineering'),
    S('64.13.1', 'Designs are submitted for approval at the 30%, 60% and 90% stages and as approved for construction. Drawings shall be prepared in AutoCAD, Revit or Civil 3D, and delivered in native and PDF formats.'),
    S('64.13.2', 'Temporary works designs shall be submitted at least twenty-eight (28) days before the related procurement, fabrication or construction.'),
    H('64.14 Procurement'),
    S('64.14.1', 'The Contractor selects suppliers and manufacturers from the Entity’s approved lists where they exist, and otherwise submits them for approval with evidence of experience, quality systems and after-sales support in the Kingdom.'),
    S('64.14.2', 'Materials are received, inspected and stored under a documented procedure, in controlled storage areas protected from sun, dust and moisture. Consumables and spare parts are managed so that the spares for commissioning and for the first two years of operation are available at handover.'),
    H('64.15 Construction'),
    S('64.15.1', 'Pre-construction services include surveys, trial pits, utility detection, and condition surveys of the existing structures next to the Works.'),
    S('64.15.2', 'Construction includes all works needed to complete the Works, including a welding programme for steel pipework, with qualified procedures and welders, and non-destructive testing.'),
    H('64.16 Testing, commissioning and handover'),
    S('64.16.1', 'The Contractor submits a testing and commissioning plan within the first month after site handover, including lock-out and tag-out procedures and a list of tests for every system.'),
    S('64.16.2', 'Water-retaining structures are tested for water-tightness before backfilling, and pipelines are pressure tested (clause 72).'),
    S('64.16.3', 'After commissioning, the Contractor operates Phase 2 for a process proving period of ninety (90) days, during which the performance tests are carried out. Preliminary acceptance follows the successful completion of the performance tests.'),
    S('64.16.4', 'Handover includes the as-built documents (clause 88), the operation and maintenance manuals (clause 79), spare parts and special tools, and the training in clause 67.'),
  ] },

  // 28 · Part 7: programme (30 months) and milestones
  { n: 28, part: 'p7', blocks: [
    C(65, 'Work programme'),
    S('65.1', 'The Bidder shall submit in its technical file a preliminary programme showing the design, procurement, construction, tie-ins, commissioning and process proving of the Works, and the critical path.'),
    S('65.2', 'Within thirty (30) days of site handover the Contractor shall submit a detailed programme for approval. Changes to the approved programme require the Entity’s approval and, where they affect the contract dates, a variation order.'),
    S('65.3', 'The contract duration is thirty (30) months from the date of site handover, including the process proving period. It is followed by a maintenance period of twelve (12) months (clause 85).'),
    S('65.4', 'The Contractor shall achieve the following milestones, to which the delay penalties in clause 60 apply:'),
    T(['Milestone', 'Description', 'Month from site handover'], [
      ['M1', 'Approval of the 90% process and electrical design', '6'],
      ['M2', 'Completion of the bioreactor and clarifier structures', '18'],
      ['M3', 'Substation energised from the 33 kV supply', '20'],
      ['M4', 'TSE pipeline hydrostatic test completed', '22'],
      ['M5', 'All tie-ins to Phase 1 completed', '24'],
      ['M6', 'Start of the process proving period', '27'],
      ['M7', 'Preliminary acceptance of the Works', '30'],
    ], { widths: ['22mm', 'auto', '44mm'], align: ['c', '', 'c'] }),
    S('65.5', 'The programme shall allow for the restrictions on shutdowns in clause 64.11, for the reduced working hours during Ramadan, and for public holidays.'),
    S('65.6', 'The Contractor shall update the programme monthly and submit it with the progress report, showing actual progress, forecast dates and recovery measures for any delay.'),
    S('65.7', 'The Contractor shall keep on site at least the staffing in Table 7.1. The key personnel shall meet the requirements of Annex (4).'),
    S('65.8', 'Programmes shall be prepared in recognised planning software, loaded with resources, and delivered in native format and in PDF.'),
    S('65.9', 'The Contractor shall issue a three-week look-ahead programme at each weekly progress meeting, including the tie-ins and shutdowns planned in that period.'),
  ] },

  // 29 · Part 7: labour table, place of works (§66), training (§67), BOQ (§68)
  { n: 29, part: 'p7', blocks: [
    H('Table 7.1 Minimum site staffing'),
    T(['Position', 'Number', 'Minimum experience (years)', 'Notes'], [
      ['Project manager', '1', '20', 'Key personnel (Annex 4)'],
      ['Construction manager', '1', '15', ''],
      ['Process design lead', '1', '15', 'Key personnel (Annex 4)'],
      ['Civil and structural engineers', '6', '8', ''],
      ['Mechanical engineers', '4', '8', ''],
      ['Electrical engineers', '4', '8', 'One for the substation'],
      ['Instrumentation and control engineers', '2', '8', ''],
      ['HSE manager', '1', '10', 'Saudi national; key personnel'],
      ['HSE officers', '6', '5', 'One per active work front'],
      ['Quality manager and inspectors', '1 + 6', '12 / 5', ''],
      ['Commissioning manager', '1', '12', 'Key personnel (Annex 4)'],
      ['Planners and surveyors', '2 + 4', '8 / 5', ''],
    ], { widths: ['auto', '20mm', '40mm', '50mm'], align: ['', 'c', 'c', ''] }),
    C(66, 'Place of works'),
    P('The Works are located at the Al-Rawdah Sewage Treatment Plant, within the plant boundary in the Phase 2 area shown on the drawings, and along the TSE pipeline corridor to the reuse reservoir, in the Eastern Province. Site coordinates are given on the site location drawing (Annex 6).'),
    C(67, 'Training and knowledge transfer'),
    P('The Contractor shall train the staff of the Entity and of the Phase 1 operator in the operation and maintenance of the Phase 2 facilities, through on-the-job training during commissioning and process proving, side-by-side working and classroom workshops, for not fewer than forty (40) trainees and not less than four hundred (400) training hours in total.'),
    C(68, 'Bill of quantities and prices'),
    P(`The bill of quantities is issued as Volume 2 (${META.boqLines} line items in eleven bills), and a summary is given at the end of this booklet. Products on the mandatory list are flagged in the bill with their sector, product name, code and description, and whether a baseline certificate is required. For other products, the Bidder shall state the country of origin. The contract is re-measured: the quantities are estimates, and payment is made for the quantities actually executed at the bid rates.`),
  ] },

  // 30 · Part 8: labour (§69)
  { n: 30, part: 'p8', blocks: [
    PART('p8'),
    C(69, 'Labour'),
    H('First: conditions of employment'),
    L([
      'The Contractor shall comply with the Labour Law and the Social Insurance Law and their regulations, and shall register all its staff with the General Organisation for Social Insurance.',
      'The Contractor shall provide suitable housing, transport to and from site, and healthcare for its staff, and shall comply with the rules on working hours in the summer months.',
      'No work may be carried out at night, on Fridays or on public holidays without the Entity’s prior written approval.',
      'The Entity may approve the employment of Saudi nationals in target jobs, and the Contractor shall give them priority in recruitment.',
      'Where Saudi staff of a previous contractor transfer to the Contractor, their pay and benefits shall not be reduced.',
      'The Contractor shall provide monthly records of its staff on site, with nationality and job title, and shall ensure that every expatriate holds a valid residence permit.',
      'The Contractor shall provide uniforms and personal protective equipment for all its staff, and shall employ female staff where the nature of the work requires it.',
    ]),
    H('Second: labour specification'),
    P('Staff shall meet the minimum numbers and experience in Table 7.1. Key personnel shall meet the requirements of Annex (4) and shall not be replaced without the Entity’s approval (clause 86).'),
    P('Within thirty (30) days of site handover, the Contractor shall submit a manpower histogram for the contract period, showing the numbers of staff and labour by trade and by month, and the proportion of Saudi nationals.'),
    H('Third: localisation of jobs'),
    P('The Contractor shall maintain the job-localisation ratio required for its activity throughout the contract, and shall keep the certificate in clause 6 valid. A lapse is a default under clause 59, and the Entity may withhold payment until the certificate is renewed.'),
  ] },

  // 31 · Part 8: materials (§70), equipment (§71)
  { n: 31, part: 'p8', blocks: [
    C(70, 'Items and materials'),
    S('70.1', 'All materials shall be new and shall comply with the Saudi standards and, where none exist, with the international standards named in the specifications. The Contractor shall submit a statement of materials within ten (10) days of the Entity’s request.'),
    S('70.2', 'The principal materials are listed in Table 8.1. Samples and certificates shall be submitted for approval before orders are placed.'),
    H('Table 8.1 Principal materials'),
    T(['Material', 'Requirement'], [
      ['Concrete for water-retaining structures', 'Grade C40, sulphate-resisting cement, water/cement ratio not more than 0.40'],
      ['Reinforcement', 'High-yield deformed bars, grade 60, from a national mill'],
      ['GRP pipes', 'DN1000, PN16, SN10000; national origin (mandatory list)'],
      ['Ductile iron pipes and fittings', 'Class K9, cement-mortar lined, with zinc and bitumen external coating'],
      ['Valves', 'Butterfly and gate valves to the specification; national origin where on the mandatory list'],
      ['LV cables', 'XLPE insulated, armoured; national origin (mandatory list)'],
      ['Stainless steel', 'Grade 316L for submerged and wetted parts'],
    ], { widths: ['62mm', 'auto'] }),
    C(71, 'Equipment'),
    S('71.1', 'Equipment shall comply with the Saudi standards and the specifications, and shall be the manufacturer’s standard, proven product. Each major item shall be supplied with its factory test certificates.'),
    S('71.2', 'Major equipment is witnessed at factory acceptance tests by the Entity or its representative, with at least twenty-one (21) days’ notice. The principal items are listed in Table 8.2.'),
    H('Table 8.2 Factory acceptance tests'),
    T(['Equipment', 'Factory acceptance test'], [
      ['Aeration blowers', 'Performance and noise test at the duty points'],
      ['Fine screens and grit units', 'Functional test of drives and controls'],
      ['Dewatering centrifuges', 'Mechanical run test and vibration measurement'],
      ['Power transformers and switchgear', 'Routine and type tests to the relevant IEC standards'],
      ['TSE pumps', 'Performance test with the site motors or equivalent'],
    ], { widths: ['62mm', 'auto'] }),
    S('71.3', 'A failed test may be repeated once only. If the item fails again, it is rejected and replaced at the Contractor’s cost.'),
  ] },

  // 32 · Part 8: method of works (§72), quality (§73), safety (§74)
  { n: 32, part: 'p8', blocks: [
    C(72, 'Method of executing the works'),
    S('72.1', '<b>Concrete for water-retaining structures.</b> Structures are designed for a crack width not exceeding 0.2 mm, with concrete cover of not less than 50 mm to reinforcement in contact with wastewater. The minimum cement content is 350 kg/m3. Construction joints are located as shown on the drawings and fitted with waterstops.'),
    S('72.2', '<b>Water-tightness testing.</b> Each water-retaining structure is filled to its top water level, left to stabilise for seven (7) days, and then observed for a further seven (7) days. The drop in level, corrected for evaporation, shall not exceed 1/500 of the average water depth or 10 mm, whichever is less, and no damp patches shall appear on the outer faces.'),
    S('72.3', '<b>Pipework testing.</b> Pressure pipelines are hydrostatically tested in sections at 1.5 times the maximum working pressure for not less than twenty-four (24) hours. Gravity pipelines are tested for leakage and inspected by closed-circuit television before handover.'),
    S('72.4', '<b>GRP pipe laying.</b> Pipes are laid on granular bedding, with side fill compacted in layers to not less than 95% of maximum dry density, and deflection is measured after backfilling. Deflection shall not exceed the manufacturer’s limits.'),
    C(73, 'Quality specifications'),
    S('73.1', 'Within fourteen (14) days of site handover, the Contractor shall submit its quality assurance programme, including a valid ISO 9001 certificate or its quality manual, and a project quality plan prepared in accordance with ISO 9001.'),
    S('73.2', 'The quality plan includes inspection and test plans for every work item, with hold and witness points, and procedures for non-conformances and corrective actions.'),
    C(74, 'Safety specifications'),
    S('74.1', 'The Contractor shall comply with the health, safety and environmental laws of the Kingdom and with the Entity’s safety rules throughout the Works.'),
    S('74.2', 'Particular hazards on this site include work next to live process units, confined spaces, hydrogen sulphide, deep excavations below the water table, and work near energised electrical equipment. The Contractor’s safety plan shall address each of them, with permits to work and gas monitoring.'),
  ] },

  // 33 · Part 9: local content (Annex (10), minimum 40%)
  { n: 33, part: 'p9', blocks: [
    PART('p9'),
    C(75, 'Mandatory list'),
    S('75.1', 'Products on the mandatory list issued by the Local Content and Government Procurement Authority shall be of national origin. Non-national products on the list will not be accepted, unless the Authority has granted an exemption.'),
    S('75.2', 'The mandatory list products in this tender include GRP pipes, LV cables and valves. They are flagged in the bill of quantities and listed in Annex (7). Where the list requires it, products shall come from factories holding a baseline local content certificate.'),
    S('75.3', 'The Contractor shall provide evidence of the national origin of mandatory list products with each delivery. A bid or item that does not comply with this clause is excluded.'),
    C(76, 'Local content mechanism'),
    S('76.1', `This tender applies the weighting of local content in the financial evaluation at contract level, under the terms and conditions in Annex (10), as the estimated cost of the Works is above the threshold for that mechanism.`),
    S('76.2', `The Entity has set a minimum local content of 40% for this contract. The Bidder shall hold a valid baseline local content certificate showing not less than this percentage.`),
    S('76.3', 'Each bidder shall state in its technical file a target local content percentage for the contract. The target shall not be less than the minimum in clause 76.2. A bidder that does not state a target is excluded (clause 51).'),
    S('76.4', 'The target stated in the bid becomes a contractual obligation. The Contractor reports its local content quarterly, and it is audited at preliminary acceptance. Failure to achieve the target attracts the penalty in clause 61.'),
    S('76.5', 'Bidders should read Annex (10) together with clause 51.6, which shows how the target and the baseline enter the financial score.'),
    S('76.6', 'The Contractor shall submit a local content plan within sixty (60) days of site handover, naming the national suppliers, manufacturers and subcontractors it will use and the share of the contract value expected from each.'),
  ] },

  // 34 · Part 10: economic participation (no numbered clauses)
  { n: 34, part: 'p10', blocks: [
    PART('p10'),
    P('This Part applies where the value of the goods and services that the Contractor will import from foreign companies for the contract, directly or through a local agent or subcontractor, is SAR 100,000,000 (one hundred million Saudi riyals) or more.'),
    P('Every bidder shall state in its technical file its estimate of the value of such imports, with a breakdown by main category on the form below, and a signed declaration that the estimate is complete.'),
    P('Where the estimated imports reach the threshold, the Bidder shall submit a separate economic participation file containing: (a) an economic participation offer in accordance with the economic participation policy in Annex (11); and (b) the undertaking on the form in Annex (12), signed and stamped.'),
    P('The economic participation file is reviewed by the Local Content and Government Procurement Authority. The Entity may ask the Bidder to clarify or improve its offer before award, and the approved offer becomes part of the contract.'),
    P('Where the imports stated in the bid are below the threshold but the Contractor’s actual imports during the contract reach it, the Contractor shall notify the Entity within thirty (30) days and submit an economic participation offer at that time.'),
    P('A bidder whose estimated imports reach the threshold and who does not submit the economic participation file may be excluded.'),
    H('Estimate of imports (to be completed in the technical file)'),
    T(['Category', 'Main items', 'Estimated imports (SAR)'], [
      ['Process equipment', 'Screens, blowers, diffusers, clarifier mechanisms, filters, UV, centrifuges', blank],
      ['Electrical equipment', 'Switchgear, transformers, drives, generators', blank],
      ['Instrumentation and SCADA', 'Analysers, flowmeters, control system hardware and software', blank],
      ['Pipes, valves and fittings', 'Items not on the mandatory list', blank],
      ['Engineering and other services', 'Design, supervision, commissioning specialists', blank],
      { cls: 'total', cells: ['', 'Total', blank] },
    ], { widths: ['52mm', 'auto', '46mm'] }),
  ] },

  // 35 · Part 11: initial guarantee 2% (§77), §78, §79
  { n: 35, part: 'p11', blocks: [
    PART('p11'),
    P('The following special conditions are set by the Entity for this tender. They are numbered in continuation of the preceding clauses.'),
    C(77, 'Initial guarantee (special condition)'),
    S('77.1', `The initial guarantee shall be 2% of the total bid value, issued by a bank licensed in the Kingdom on the Entity’s standard form, which is available on the electronic portal.`),
    S('77.2', 'The guarantee shall name the Entity as beneficiary and state the tender name and reference. It shall be valid for not less than ninety (90) days from the date of bid opening.'),
    S('77.3', 'The original guarantee shall be delivered in a sealed envelope to the address in clause 8 before the bid submission deadline, and a copy shall be placed in the financial file. The Entity’s receipt is the only proof of delivery.'),
    S('77.4', 'For a consortium, the guarantee may be issued in the name of the lead member on behalf of the consortium, provided that the consortium is named in it.'),
    C(78, 'Materials and equipment supplied by the Entity'),
    S('78.1', 'Items supplied by the Entity are handed over to the Contractor against a signed record of their quantity and condition.'),
    S('78.2', 'From handover the Contractor is responsible for their loss or damage, and shall return any surplus at its own cost.'),
    C(79, 'Manuals and spare parts'),
    S('79.1', 'Within ninety (90) days of commencement, the Contractor shall submit the list of operation and maintenance manuals it will provide. Draft manuals are required before commissioning, and final manuals before preliminary acceptance, in five (5) printed copies and in electronic form, in English, with an overview of each system in Arabic and English.'),
    S('79.2', 'The Contractor shall supply the spare parts, consumables and special tools needed for commissioning and for the first two (2) years of operation, as listed in its bid and approved by the Entity.'),
    S('79.3', 'Spare parts shall be new, of the same make as the installed equipment, and delivered in marked packaging with a recommended stock list.'),
  ] },

  // 36 · Part 11: advance payment (§80), retention / final invoice (§81), §82, §83
  { n: 36, part: 'p11', blocks: [
    C(80, 'Advance payment'),
    S('80.1', `The Contractor may request an advance payment not exceeding 10% of the contract value, against an advance payment guarantee of the same amount issued by a bank licensed in the Kingdom.`),
    S('80.2', 'The advance payment is recovered by deduction from each interim payment in proportion to the value of the work certified, so that it is fully recovered before the value certified reaches 80% of the contract value. The advance payment guarantee is reduced as the advance is recovered.'),
    S('80.3', 'The advance payment is made within thirty (30) days of receipt of the Contractor’s request, the advance payment guarantee and the insurance certificates.'),
    C(81, 'Retention and final invoice'),
    S('81.1', `An amount of 10% is deducted from each interim invoice until the total deducted reaches 10% of the contract value. That amount forms the final invoice.`),
    S('81.2', 'The final invoice is paid to the Contractor on preliminary acceptance of the Works, after the Contractor has submitted the as-built documents, the final manuals and a clearance of its obligations to its staff, subcontractors and suppliers.'),
    C(82, 'Conditions of payment'),
    P('No payment is made until the Contractor has submitted, and the Entity has approved: (a) the insurance certificates in clause 63; (b) the HSSE plan; (c) the quality plan (clause 73); (d) the key personnel (clause 86); (e) the baseline programme (clause 65); and (f) the pre-mobilisation checklist.'),
    C(83, 'Commencement and progress'),
    S('83.1', 'Within thirty (30) calendar days of the award, the Contractor shall submit its schedule of initial deliverables on form EXP-KD0-GL-000004, which is also attached to the financial file (clause 36).'),
    S('83.2', 'Interim payments are made monthly against the measured quantities and the milestones in clause 65. The Contractor submits a monthly progress report with each invoice.'),
    S('83.3', 'Payments are made within the period set by the Regulations after the invoice is approved.'),
    S('83.4', 'Variations ordered by the Entity are valued at the bid rates where the bill of quantities contains similar items, and otherwise at rates agreed on the basis of the bid rates.'),
  ] },

  // 37 · Part 11: O&M option (§84), maintenance period (§85), key personnel (§86), §87–89
  { n: 37, part: 'p11', blocks: [
    C(84, 'Operation and maintenance option'),
    S('84.1', 'The Bidder shall price, separately from the bid price, the operation and maintenance of the Phase 2 facilities for twenty-four (24) months after preliminary acceptance, including staff, consumables, chemicals, laboratory testing and routine maintenance, and excluding electricity and sludge disposal.'),
    S('84.2', 'The option price is not included in the evaluated bid price. The Entity may award the option at its discretion within twelve (12) months of signing the contract.'),
    C(85, 'Maintenance period'),
    P('The maintenance period is twelve (12) months from preliminary acceptance. During it the Contractor remedies, at its own cost, all defects notified to it, within the periods stated in the notice. Final acceptance follows the end of the maintenance period and the remedy of all defects, and the final guarantee is then released.'),
    C(86, 'Key personnel'),
    P('The key personnel named in the bid shall be assigned to the contract for its duration and shall not be replaced without the Entity’s prior written approval. A replacement shall have qualifications and experience equal to or better than those of the person replaced and shall meet Annex (4). The HSE manager shall be a Saudi national.'),
    C(87, 'Site precautions, existing utilities and night work'),
    P('The Contractor shall keep access roads open, open trenches only when materials are ready for laying, locate and protect all existing utilities, repair any damage at its own cost, and comply with the Public Utilities Protection Law. Information on existing utilities provided by the Entity is indicative only. Approved night work shall be lit at the Contractor’s cost and shall respect the noise limits.'),
    C(88, 'As-built documents'),
    P('The Contractor keeps the drawings up to date as the Works proceed. Before any completion certificate, it shall deliver one (1) electronic set, one (1) original and six (6) printed sets of as-built drawings, which shall be complete within three (3) months of preliminary acceptance.'),
    C(89, 'Detailed safety procedures'),
    P('Within thirty (30) calendar days of the award, and before any work on site, the Contractor shall submit an occupational health and safety plan aligned with recognised international practice, appoint qualified safety representatives, report safety indicators weekly and monthly, and report any death, injury or damage to property immediately.'),
  ] },

  // 38 · Annex (4): classification, tax registration, STP experience, O&M
  { n: 38, part: 'a4', blocks: [
    PART('a4'),
    P('The Bidder with the best evaluated bid is post-qualified against the criteria below (clause 24). Each criterion is assessed as pass or fail. The evidence shall be included in the technical file. For a consortium, each criterion applies as stated against it.'),
    T(['No.', 'Criterion', 'Requirement', 'Evidence'], [
      ['1', 'Classification', `Contractor classification in ${nw('Water and Sewage Works, Grade 1')}. For a consortium, every member shall be classified in the field, at least one member at Grade 1, and the others not more than one grade lower (Contractor Classification Law, Article 9).`, 'Classification certificate, valid on the date of bid opening'],
      ['2', 'Tax registration', 'Registration with the Zakat, Tax and Customs Authority for tax purposes, with the tax registration number stated in the bid.', 'Tax registration certificate'],
      ['3', 'Similar experience', `At least ${nw('two (2) completed sewage treatment plants')}, each with a treatment capacity of not less than ${nw('100,000 m3/day')}, completed within the last ten (10) years before the bid submission deadline, at least one of them including tertiary treatment. The Bidder shall have acted as prime contractor or as lead member of a consortium.`, 'Completion certificates from the employers, stating capacity, scope, value and date of completion'],
      ['4', 'Operation and maintenance', 'Operation and maintenance of a sewage treatment plant of not less than 50,000 m3/day for at least three (3) years, or a named operation and maintenance subcontractor that meets this requirement and is listed in the bid.', 'O&M contract and employer’s certificate, or the subcontractor’s undertaking with its evidence'],
    ], { widths: ['10mm', '28mm', 'auto', '46mm'], align: ['c', '', '', ''] }),
    P('Only projects that have received preliminary or final acceptance count as completed. A project executed in a consortium counts for the member that led it, or for another member in proportion to its share where the completion certificate states that share.'),
    P('The committee may contact the employers of the reference projects, visit the projects, and reject any reference it cannot verify.'),
    H('Form A4-1: Reference projects (criterion 3)'),
    T(['No.', 'Project and employer', 'Capacity (m3/day)', 'Tertiary (yes/no)', 'Role', 'Date of acceptance'], [
      ['1', blank, blank, blank, blank, blank],
      ['2', blank, blank, blank, blank, blank],
      ['3', blank, blank, blank, blank, blank],
    ], { widths: ['8mm', 'auto', '28mm', '24mm', '24mm', '28mm'], align: ['c', '', '', '', '', ''] }),
  ] },

  // 39 · Annex (4): turnover (ambiguous years), financial position
  { n: 39, part: 'a4', blocks: [
    H('Financial capacity'),
    T(['No.', 'Criterion', 'Requirement', 'Evidence'], [
      ['5', 'Turnover', `Average annual turnover over the ${nw('last three (3) financial years')} of not less than ${nw('SAR 1,200,000,000')}, as shown in the audited financial statements. For a consortium, the lead member shall meet at least 60% of this requirement, and all members together at least 100%.`, 'Audited financial statements for each of the years, with the auditor’s report'],
      ['6', 'Financial position', 'Positive net worth, and a current ratio of not less than 1.1, in the latest audited financial statements. For a consortium, each member shall meet this criterion.', 'Audited financial statements'],
    ], { widths: ['10mm', '28mm', 'auto', '46mm'], align: ['c', '', '', ''] }),
    P('Financial statements shall be audited by an auditor licensed in the Kingdom or, for a foreign bidder, in its country of incorporation, and shall be submitted in full with their notes. Amounts in a foreign currency are converted to Saudi riyals at the exchange rate published by the Saudi Central Bank on the date of the bid submission deadline.'),
    H('Financial information form'),
    P('The Bidder shall complete the following form in Saudi riyals and attach the audited statements for each year entered. A bidder whose financial year does not end on 31 December shall state the date on which it ends.'),
    T(['', 'Financial year', 'Turnover (SAR)', 'Net worth (SAR)', 'Current ratio', 'Date of audit report'], [
      ['1', blank, blank, blank, blank, blank],
      ['2', blank, blank, blank, blank, blank],
      ['3', blank, blank, blank, blank, blank],
      ['', '<b>Average</b>', blank, '', '', ''],
    ], { cls: 'form', widths: ['8mm', '28mm', 'auto', 'auto', '22mm', '30mm'], align: ['c', '', '', '', '', ''] }),
    P('Where a member of a consortium relies on the financial statements of a parent company, the parent shall be jointly and severally liable with the member for the contract, and shall sign the consortium agreement.'),
  ] },

  // 40 · Annex (4): key personnel, management systems (ISO 90001 typo)
  { n: 40, part: 'a4', blocks: [
    H('Key personnel'),
    T(['Position', 'Total experience', 'Specific experience', 'Other requirements'], [
      ['Project manager', '20 years', '10 years in water and wastewater projects, including one STP of not less than 100,000 m3/day as project manager', 'Degree in engineering; membership of the Saudi Council of Engineers'],
      ['Process design lead', '15 years', 'Process design of biological nutrient removal plants, including tertiary treatment', 'Degree in chemical, civil or environmental engineering'],
      ['HSE manager', '10 years', '5 years as HSE manager on construction projects', 'Saudi national; recognised HSE qualification'],
      ['Commissioning manager', '12 years', 'Commissioning of at least two (2) sewage treatment plants', 'Degree in engineering'],
    ], { widths: ['32mm', '22mm', 'auto', '52mm'] }),
    P('For each key position, the Bidder shall submit the CV of the person proposed, signed by that person, with copies of degrees and professional memberships, and a statement of availability for the contract period. The same person may not be proposed for two key positions.'),
    H('Personnel and management systems'),
    T(['No.', 'Criterion', 'Requirement', 'Evidence'], [
      ['7', 'Key personnel', 'As in the table above, for each of the four key positions.', 'CVs, certificates and availability statements'],
      ['8', 'Management systems', `Valid certificates of ${nw('ISO 90001')} (quality management), ISO 14001 (environmental management) and ISO 45001 (occupational health and safety management), issued by an accredited certification body and covering construction activities.`, 'Certificates, with the scope of certification'],
    ], { widths: ['10mm', '28mm', 'auto', '46mm'], align: ['c', '', '', ''] }),
    P('Certificates held by a parent company count only where their scope covers the Bidder’s operations in the Kingdom.'),
    H('Form A4-2: Proposed key personnel (criterion 7)'),
    T(['Position', 'Name', 'Nationality', 'Years of experience', 'Available from'], [
      ['Project manager', blank, blank, blank, blank],
      ['Process design lead', blank, blank, blank, blank],
      ['HSE manager', blank, blank, blank, blank],
      ['Commissioning manager', blank, blank, blank, blank],
    ], { widths: ['40mm', 'auto', '28mm', '28mm', '28mm'] }),
  ] },

  // 41 · Annex (4): local content criterion, general rules, declaration
  { n: 41, part: 'a4', blocks: [
    T(['No.', 'Criterion', 'Requirement', 'Evidence'], [
      ['9', 'Local content', 'A valid baseline local content certificate showing not less than 40%, and a target local content percentage in the technical file that is not less than the minimum in clause 76.2.', 'Baseline certificate issued by the Local Content and Government Procurement Authority; target in the technical file'],
    ], { widths: ['10mm', '28mm', 'auto', '46mm'], align: ['c', '', '', ''] }),
    H('General rules for post-qualification'),
    L([
      'Evidence shall be valid on the date of bid opening, unless the criterion states otherwise.',
      'Documents issued outside the Kingdom shall be authenticated under the applicable procedures, and translated into Arabic where they are not in Arabic or English.',
      'For a consortium, the consortium agreement (clause 22) shall be consistent with the roles on which the consortium relies to meet these criteria. A member’s experience counts only for the scope that member will perform.',
      'A named subcontractor relied on for criterion 4 shall be listed in the bid under clause 23, and its share counts towards the subcontracting limit.',
      'A reference project relied on by two members of a consortium counts once.',
      'The committee may ask the Bidder to clarify or complete its evidence within a period it sets, but not to add experience or capacity that did not exist at the bid submission deadline.',
      'A bidder that fails any criterion fails post-qualification (clause 24.3).',
    ]),
    H('Declaration'),
    P('We declare that the information and evidence provided for post-qualification are true and complete, and we accept that false information leads to the consequences in clause 24.4.'),
    SIGN(['Name of authorised signatory', 'Title', 'Signature', 'Company stamp', 'Date', 'Commercial Registration No.']),
  ] },

  // 42 · Annex (5): evaluation criteria and weights (pass mark 70)
  { n: 42, part: 'a5', blocks: [
    PART('a5'),
    H('5.1 Technical evaluation'),
    P(`The technical proposals are scored out of 100 against the criteria below. A bid shall achieve a technical pass mark of 70 to proceed to the financial evaluation. A bid scoring less than half the weight of criterion 1, 3 or 4 is technically non-compliant, whatever its total score.`),
    T(['No.', 'Criterion', 'Weight', 'Main sub-criteria'], [
      ['1', 'Process design and technical approach', '30', 'Design basis and calculations; equipment selection; hydraulic profile; energy efficiency; odour control; effluent guarantees'],
      ['2', 'Methodology and programme', '15', 'Construction method; tie-in plan for the operating plant; programme and critical path; logistics'],
      ['3', 'Experience in similar works', '20', 'Reference plants beyond the post-qualification minimum; tertiary treatment; large-diameter pipelines'],
      ['4', 'Key personnel and organisation', '15', 'Qualifications and experience of the key personnel; organisation; Saudi nationals in key roles'],
      ['5', 'HSE and quality', '10', 'HSE plan for work next to the live plant; quality plan; record'],
      ['6', 'Local content and training', '10', 'Local content plan; national suppliers and subcontractors; training and knowledge transfer'],
      { cls: 'total', cells: ['', 'Total', '100', ''] },
    ], { widths: ['10mm', '52mm', '16mm', 'auto'], align: ['c', '', 'c', ''] }),
    H('5.2 Scoring scale'),
    T(['Score', 'Meaning'], [
      ['100%', 'Fully meets the requirement, with clear added value'],
      ['75%', 'Fully meets the requirement'],
      ['50%', 'Meets the requirement, with minor weaknesses'],
      ['25%', 'Significant weaknesses'],
      ['0%', 'Not addressed, or not acceptable'],
    ], { widths: ['22mm', 'auto'], align: ['c', ''] }),
    H('5.3 Financial evaluation'),
    P('The financial files of bids that pass the technical evaluation are opened and evaluated under clauses 51 and 52. The financial score is calculated with the formula in clause 51.6, using each bidder’s target local content percentage and local content baseline, and the award follows clause 51.7.'),
  ] },

  // 43 · Vol. 2 BOQ summary (11 bills, 236 lines)
  { n: 43, part: 'boq', blocks: [
    PART('boq'),
    P('This summary is an extract from Volume 2, for information. It gives quantities only. Prices shall be entered only in the Volume 2 template (XLSX) and placed in the financial file (clause 36). A price shown anywhere in the technical file leads to exclusion of the bid.'),
    L([
      'The bill of quantities is re-measured. Quantities are estimates and do not limit the Contractor’s obligation to complete the Works.',
      'Items marked as mandatory list products shall be of national origin (clause 75).',
      'Preliminaries and design are priced in Bill 1 and shall not be spread over the other bills.',
      'Provisional sums, where shown in Volume 2, are spent only on the Entity’s instruction.',
      'Bidders shall not add, delete or modify items. Queries on items shall be raised under clause 33.',
    ], 'num'),
    T(['Bill', 'Title', 'Line items'], [
      ...BILLS.map((b) => [String(b.no), nw(b.title), String(b.lineCount)]),
      { cls: 'total', cells: ['', 'Total (11 bills)', String(BILLS.reduce((s, b) => s + b.lineCount, 0))] },
    ], { widths: ['14mm', 'auto', '24mm'], align: ['c', '', 'c'] }),
    P('Representative items from each bill are listed on the following pages. The full descriptions, item coverage rules and units of measurement are given in Volume 2.'),
  ] },

  // 44–46 · Representative items by bill
  { n: 44, part: 'boq', blocks: [H('Representative items: Bills 1 to 3'), BOQ_TABLE([1, 2, 3])] },
  { n: 45, part: 'boq', blocks: [H('Representative items: Bills 4 to 7'), BOQ_TABLE([4, 5, 6, 7])] },
  { n: 46, part: 'boq', blocks: [
    H('Representative items: Bills 8 to 11'),
    BOQ_TABLE([8, 9, 10, 11]),
    NOTE('<p><b>Mandatory list products.</b> GRP pipes (item 10.02), LV cables (item 7.19) and valves (item 9.08, and the valves in the Bill 10 chambers). Their codes, full descriptions and baseline certificate requirements are given in Volume 2 and in Annex (7).</p>'),
  ] },

  // 47 · Annex (6): drawings list (18 km in the title of P-201)
  { n: 47, part: 'a6', blocks: [
    PART('a6'),
    P('The drawings below form Volume 3 of the tender documents and are issued for tender (revision T0). The civil drawings are the issued design. The process, mechanical, electrical and ICA drawings are indicative, and the Contractor develops them under clause 64.4.'),
    T(['Drawing no.', 'Title', 'Rev.'], [
      ['ECWS-0147-G-001', 'Cover sheet and drawing index', 'T0'],
      ['ECWS-0147-G-002', 'Site location plan and coordinates', 'T0'],
      ['ECWS-0147-G-003', 'Overall site layout, Phase 1 and Phase 2', 'T0'],
      ['ECWS-0147-G-004', 'Hydraulic profile, Phase 2', 'T0'],
      ['ECWS-0147-G-005', 'Process flow diagram, liquid line', 'T0'],
      ['ECWS-0147-G-006', 'Process flow diagram, sludge line and odour control', 'T0'],
      ['ECWS-0147-C-101', 'Inlet works, general arrangement', 'T0'],
      ['ECWS-0147-C-102', 'Bioreactors 1 to 4, general arrangement', 'T0'],
      ['ECWS-0147-C-103', 'Bioreactors, sections and details', 'T0'],
      ['ECWS-0147-C-104', 'Secondary clarifiers, general arrangement', 'T0'],
      ['ECWS-0147-C-105', 'Tertiary filtration and UV building', 'T0'],
      ['ECWS-0147-C-106', 'Sludge treatment building', 'T0'],
      ['ECWS-0147-C-107', 'Blower building', 'T0'],
      ['ECWS-0147-C-108', 'TSE storage tank and pump station', 'T0'],
      ['ECWS-0147-C-109', 'Yard piping layout', 'T0'],
      ['ECWS-0147-C-110', 'Roads, drainage and fencing', 'T0'],
      ['ECWS-0147-P-201', `${nw('TSE Transmission Line, 18 km')}: route plan, sheets 1 to 9`, 'T0'],
      ['ECWS-0147-P-202', 'TSE pipeline longitudinal profiles', 'T0'],
      ['ECWS-0147-P-203', 'TSE pipeline road and wadi crossings', 'T0'],
      ['ECWS-0147-P-204', 'Typical trench sections, chambers and thrust blocks', 'T0'],
      ['ECWS-0147-E-301', 'Single line diagram, 33/11 kV substation', 'T0'],
      ['ECWS-0147-E-302', 'Substation layout and cable routes', 'T0'],
      ['ECWS-0147-E-303', '11 kV distribution and lighting layout', 'T0'],
      ['ECWS-0147-I-401', 'SCADA and control system architecture', 'T0'],
      ['ECWS-0147-I-402', 'P&amp;ID legend and typical control loops', 'T0'],
      ['ECWS-0147-M-501', 'Odour control layout', 'T0'],
      ['ECWS-0147-M-502', 'Tie-in points to the Phase 1 plant', 'T0'],
    ], { widths: ['40mm', 'auto', '14mm'], align: ['', '', 'c'] }),
    P('Where the drawings and the specifications conflict, the Contractor shall refer the matter to the Entity for instruction before proceeding.'),
  ] },

  // 48 · Annex (1): Bid Letter form
  { n: 48, part: 'a1', blocks: [
    PART('a1'),
    { t: 'letter', blocks: [
      P('<b>To:</b> Eastern Cities Water Services Company (ECWS), Projects Department, Dammam'),
      P('<b>Subject:</b> Tender No. ECWS/PRJ/2026/0147, Expansion of Al-Rawdah Sewage Treatment Plant, Phase 2'),
      P(`We, the undersigned, having examined the tender documents, including addenda Nos. ${blank}, which we acknowledge, offer to execute the Works in accordance with those documents for a total bid price of SAR ${blank} (in words: ${blank}), as stated in the priced bill of quantities in our financial file.`),
      L([
        'Our bid shall remain valid for ninety (90) days from the date of bid opening and shall be binding on us until that date.',
        `We enclose the initial guarantee required by the tender documents, issued by ${blank} for SAR ${blank}.`,
        `Our target local content percentage for the contract is ${blank} %.`,
        'We confirm that we, and every subcontractor listed in our bid, are eligible under clause 5 and hold the certificates in clause 6.',
        'We have no conflict of interest in this tender, other than any disclosed in writing with this letter.',
        'If our bid is accepted, we undertake to provide the final guarantee and to sign the contract within the periods stated in the tender documents.',
        'We understand that the Entity is not bound to accept the lowest bid or any bid.',
        'We acknowledge that the Arabic text of the tender documents prevails over this English version (clause 27).',
      ], 'num'),
    ] },
    SIGN(['Name of the Bidder', 'Commercial Registration No.', 'Name of authorised signatory', 'Title', 'Signature', 'Company stamp', 'Address', 'Date']),
  ] },
];
