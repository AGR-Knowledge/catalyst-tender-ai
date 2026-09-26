import type { RfqLine, S2Tender } from '../types';
import { boq, packages, rfqs, type PackageInput, type RfqRow } from './build';

/**
 * Stage 2 records for tenants B–E (plan 008a Phase 8). Seeded so that on
 * Sun 8 Mar 2026 at 10:00 local time the rules derive plan 017's `s2` step
 * facts in `data/gcc/lifecycle/live/<tenant>.ts` exactly:
 *
 * | Tender     | Packages · covered | RFQs · due | On time | Overdue (esc.) | To level | Not covered | Replies due | Clarifications |
 * | ---------- | ------------------ | ---------- | ------- | -------------- | -------- | ----------- | ----------- | -------------- |
 * | T-2026-044 | 8 · 0              | 24 · 0     | 0       | 0 (0)          | 0        | 0%          | Thu 12 Mar  | 1 open         |
 * | T-2026-019 | 10 · 0             | 30 · 18    | 14      | 2 (0)          | 0        | 0%          | Tue 10 Mar  | 3 open, 1 stale|
 * | T-2026-027 | 7 · 3              | 21 · 12    | 9       | 1 (0)          | 2        | 4.5%        | Thu 12 Mar  | 2 open         |
 * | T-2026-058 | 12 · 5             | 36 · 24    | 20      | 2 (0)          | 4        | 2.2%        | Tue 10 Mar  | 3 open         |
 * | T-2026-062 | 10 · 0             | 30 · 0     | 0       | 0 (0)          | 0        | 0%          | Thu 12 Mar  | 1 open         |
 *
 * "Replies due" is the next reply date still ahead, after extensions (the
 * issued date when none is ahead). An overdue RFQ that is not yet escalated
 * fell due this morning (Sun 8 Mar, before 10:00, after an extension), each at
 * its own time: escalation by rule is the next working day at 08:00. Every
 * extension states its reason (`extensionReason`). Packaging
 * is approved at 017's `2:shortlisting` time and the last RFQ goes out at its
 * `2:rfqs-out` time. Each company's Procurement Lead set the reply windows.
 */

/** [item, description, unit, quantity]: BOQ lines without rates. */
type Line = [string, string, string, number];
const lines = (rows: Line[]): RfqLine[] => rows.map(([item, description, unit, qty]) => ({ item, description, unit, qty }));

const DOCUMENTS = [
  { title: 'Instructions to suppliers and commercial terms', ref: 'RFQ' },
  { title: 'Specification sections for the package', ref: 'Tender Vol. 2' },
  { title: 'Bill of quantities: the package lines only', ref: 'Tender Vol. 3' },
  { title: 'Drawings for the package', ref: 'Tender Vol. 4' },
];

type Reply = Pick<RfqRow, 'replyBy' | 'extendedFrom' | 'extensionReason'>;

/** RFQs to several suppliers for one package, sent together; `rest` adds each supplier's state. */
const send = (pkg: string, sentAt: string, reply: Reply, rows: [string, Omit<RfqRow, 'pkg' | 'sup' | 'sentAt' | 'replyBy'>?][]): RfqRow[] =>
  rows.map(([sup, rest]) => ({ pkg, sup, sentAt, ...reply, ...rest }));

const levelOf = (list: PackageInput[]) => (pkg: string) => list.find((p) => p.id === pkg)!.quoteLevel;

/** BOQ summary rows for the packages, numbered after the self-performed lines. */
const packageBoq = (list: PackageInput[], from: number) =>
  list.map((p, i): [string, string, number, 'supply' | 'subcontract', string] => [`B-${String(i + from).padStart(2, '0')}`, p.title, p.value, p.kind, p.id]);

// ===========================================================================
// Corniche · T-2026-044 Dubai district cooling plant, 30,000 TR (AED 260 M)
// DG1 pursue Tue 17 Feb 10:20. Packaging approved 13:00, shortlists 15:40,
// 24 RFQs sent 16:45–17:30. Replies due Thu 12 Mar: none due yet.

const T044 = 'T-2026-044';
const D044 = 'ECUC-DC30';
const CO_PROC = 'corniche.proc';
const CO_BID = 'corniche.bid';

const P044: PackageInput[] = [
  { id: 'P-01', title: 'Centrifugal chillers', kind: 'supply', value: 62_000_000, trades: ['chillers'], quoteLevel: 'line', lineCount: 4,
    selfInstall: true, longLeadWeeks: 36, needByWeeks: 40, avlRequired: true,
    lines: lines([
      ['2.01', 'Centrifugal chillers, 3,000 TR, series counterflow pairs, with variable speed drives', 'nr', 10],
      ['2.03', 'Factory performance tests at the design conditions, witnessed', 'item', 1],
    ]),
    note: 'Chillers set the programme',
    scope: 'Supply of ten 3,000 TR centrifugal chillers, delivered to site, with installation supervision, commissioning and the efficiency guarantee.',
    specRef: 'Specification, Section 23 64 00: chillers', drawings: [`${D044}-M-201`, `${D044}-M-202`] },
  { id: 'P-02', title: 'Cooling towers', kind: 'supply', value: 18_500_000, trades: ['cooling-towers'], quoteLevel: 'line', lineCount: 3, selfInstall: true, avlRequired: true,
    lines: lines([
      ['3.01', 'Induced-draught counterflow cooling tower cells, FRP structure', 'nr', 12],
      ['3.04', 'Cooling tower fans, with variable speed drives', 'nr', 12],
    ]),
    scope: 'Supply of the cooling tower cells and fans, delivered to site, with installation supervision and commissioning.',
    specRef: 'Specification, Section 23 65 00: cooling towers', drawings: [`${D044}-M-203`] },
  { id: 'P-03', title: 'Chilled and condenser water pumps', kind: 'supply', value: 9_800_000, trades: ['pumps'], quoteLevel: 'line', lineCount: 5, selfInstall: true,
    lines: lines([
      ['4.01', 'Primary chilled-water pumps, split case, with motors', 'nr', 12],
      ['4.03', 'Distribution pumps, with variable speed drives', 'nr', 6],
      ['4.05', 'Condenser water pumps', 'nr', 12],
    ]),
    scope: 'Supply of the chilled-water, distribution and condenser water pumps, delivered to site, with commissioning.',
    specRef: 'Specification, Section 23 21 23: pumps', drawings: [`${D044}-M-204`] },
  { id: 'P-04', title: 'Plant pipework and valves', kind: 'supply', value: 14_200_000, trades: ['pipes', 'valves'], quoteLevel: 'line', lineCount: 9,
    lines: lines([
      ['5.01', 'Carbon steel pipe and fittings, DN200–DN1200', 't', 1_450],
      ['5.04', 'Butterfly valves DN300–DN1200, gear operated', 'nr', 180],
      ['5.07', 'Strainers and check valves', 'nr', 64],
    ]),
    scope: 'Supply of plant-room pipework, fittings and valves, delivered to site.',
    specRef: 'Specification, Section 23 21 13: hydronic piping', drawings: [`${D044}-M-210`, `${D044}-M-211`] },
  { id: 'P-05', title: 'MV and LV electrical works', kind: 'subcontract', value: 21_600_000, trades: ['hv', 'lv'], quoteLevel: 'line', lineCount: 8,
    lines: lines([
      ['6.01', '11 kV switchgear, with protection', 'item', 1],
      ['6.03', 'Transformers 11/0.4 kV, 2,500 kVA', 'nr', 4],
      ['6.06', 'Motor control centres and power cabling', 'set', 1],
    ]),
    scope: 'Supply, installation and testing of the 11 kV switchgear, transformers, motor control centres and cabling.',
    specRef: 'Specification, Division 26: electrical', drawings: [`${D044}-E-301`, `${D044}-E-302`] },
  { id: 'P-06', title: 'Plant controls and BMS', kind: 'subcontract', value: 7_400_000, trades: ['bms', 'ica'], quoteLevel: 'package', lineCount: 4,
    lines: lines([
      ['7.01', 'Plant control system, with chiller sequencing and optimisation', 'item', 1],
      ['7.03', 'Energy meters and field instruments', 'nr', 140],
    ]),
    scope: 'Supply, installation and commissioning of the plant controls, BMS integration and the energy metering.',
    specRef: 'Specification, Section 25 00 00: integrated automation', drawings: [`${D044}-I-401`] },
  { id: 'P-07', title: 'Condenser water treatment and dosing', kind: 'supply', value: 3_100_000, trades: ['chem-dosing'], quoteLevel: 'package', lineCount: 3, selfInstall: true,
    lines: lines([
      ['8.01', 'Side-stream filtration and chemical dosing skids', 'nr', 4],
      ['8.02', 'Chemical storage tanks and bunds', 'set', 1],
    ]),
    scope: 'Supply of the condenser water treatment and dosing system, delivered to site, with commissioning.',
    specRef: 'Specification, Section 23 25 00: water treatment', drawings: [`${D044}-M-220`] },
  { id: 'P-08', title: 'Insulation and plant-room ventilation', kind: 'subcontract', value: 6_900_000, trades: ['insulation', 'hvac'], quoteLevel: 'line', lineCount: 6,
    lines: lines([
      ['9.01', 'Chilled-water pipe insulation with aluminium cladding', 'm2', 18_600],
      ['9.04', 'Plant-room ventilation and extract fans', 'nr', 16],
    ]),
    scope: 'Supply and installation of pipe insulation and cladding, and the plant-room ventilation.',
    specRef: 'Specification, Section 23 07 00: insulation', drawings: [`${D044}-M-230`] },
];

const DUE_044: Reply = { replyBy: '2026-03-12T17:00' };

const R044: RfqRow[] = [
  ...send('P-01', '2026-02-17T16:45', DUE_044, [
    ['arctis', { openedAt: '2026-02-17T17:20', acknowledgedAt: '2026-02-18T09:10' }],
    ['tilal-thermal', { openedAt: '2026-02-18T08:30', acknowledgedAt: '2026-02-18T11:00' }],
    ['warsan-thermal', { openedAt: '2026-02-18T09:45' }],
  ]),
  ...send('P-02', '2026-02-17T16:50', DUE_044, [
    ['mirdif-towers', { openedAt: '2026-02-17T18:05', acknowledgedAt: '2026-02-18T08:40' }],
    ['tilal-thermal', { openedAt: '2026-02-18T08:32', acknowledgedAt: '2026-02-18T11:02' }],
    ['warsan-thermal', { openedAt: '2026-02-18T09:47' }],
  ]),
  ...send('P-03', '2026-02-17T16:55', DUE_044, [
    ['hamriyah-pumps', { openedAt: '2026-02-18T10:15', acknowledgedAt: '2026-02-19T09:00' }],
    ['gulf-process', { openedAt: '2026-02-18T12:40', acknowledgedAt: '2026-02-22T10:30' }],
    ['anjar-mech'],
  ]),
  ...send('P-04', '2026-02-17T17:00', DUE_044, [
    ['karama-pipe', { openedAt: '2026-02-18T08:05', acknowledgedAt: '2026-02-18T08:50' }],
    ['liguria-valvole', { openedAt: '2026-02-18T09:30', acknowledgedAt: '2026-02-19T10:20' }],
    ['anjar-mech', { openedAt: '2026-02-23T11:10' }],
  ]),
  ...send('P-05', '2026-02-17T17:10', DUE_044, [
    ['qusais-switchgear', { openedAt: '2026-02-17T17:40', acknowledgedAt: '2026-02-18T09:30' }],
    ['nord-trasformatori', { openedAt: '2026-02-18T10:50' }],
    ['barsha-em', { openedAt: '2026-02-18T08:20', acknowledgedAt: '2026-02-19T08:15' }],
  ]),
  ...send('P-06', '2026-02-17T17:15', DUE_044, [
    ['deira-controls', { openedAt: '2026-02-17T17:50', acknowledgedAt: '2026-02-18T08:10' }],
    ['barsha-em', { openedAt: '2026-02-18T08:22', acknowledgedAt: '2026-02-19T08:17' }],
    ['qusais-switchgear', { openedAt: '2026-02-17T17:42' }],
  ]),
  ...send('P-07', '2026-02-17T17:20', DUE_044, [
    ['nahda-chemicals', { openedAt: '2026-02-18T09:05', acknowledgedAt: '2026-02-18T13:30' }],
    ['hamriyah-pumps', { openedAt: '2026-02-18T10:17' }],
    ['gulf-process', { openedAt: '2026-02-18T12:42', acknowledgedAt: '2026-02-22T10:32' }],
  ]),
  ...send('P-08', '2026-02-17T17:30', DUE_044, [
    ['marmoom-insulation', { openedAt: '2026-02-18T08:45', acknowledgedAt: '2026-02-18T14:00' }],
    ['barsha-em', { openedAt: '2026-02-18T08:24' }],
    ['anjar-mech'],
  ]),
];

const SL_044 = '2026-02-17T15:40';

export const CORNICHE_T044: S2Tender = {
  tenant: 'corniche',
  tenderId: T044,
  packages: packages('corniche', T044, 'AED', P044),
  // Packages and self-performed work: exactly AED 260,000,000, with nothing uncovered.
  boq: boq(T044, 'AED', [
    ['B-01', 'General and preliminaries', 21_300_000, 'self'],
    ['B-02', 'Civil and structural works: plant building and thermal storage tank', 68_400_000, 'self'],
    ['B-03', 'Mechanical installation, testing and commissioning', 26_800_000, 'self'],
    ...packageBoq(P044, 4),
  ]),
  packagingApproved: { at: '2026-02-17T13:00', byId: CO_PROC },
  shortlists: {
    'P-01': { supplierIds: ['arctis', 'tilal-thermal', 'warsan-thermal', 'setouchi'], at: SL_044, byId: CO_PROC },
    'P-02': { supplierIds: ['mirdif-towers', 'tilal-thermal', 'warsan-thermal'], at: SL_044, byId: CO_PROC },
    'P-03': { supplierIds: ['hamriyah-pumps', 'gulf-process', 'anjar-mech'], at: SL_044, byId: CO_PROC },
    'P-04': { supplierIds: ['karama-pipe', 'liguria-valvole', 'anjar-mech'], at: SL_044, byId: CO_PROC },
    'P-05': { supplierIds: ['qusais-switchgear', 'nord-trasformatori', 'barsha-em'], at: SL_044, byId: CO_PROC },
    'P-06': { supplierIds: ['deira-controls', 'barsha-em', 'qusais-switchgear'], at: SL_044, byId: CO_PROC },
    'P-07': { supplierIds: ['nahda-chemicals', 'hamriyah-pumps', 'gulf-process'], at: SL_044, byId: CO_PROC },
    'P-08': { supplierIds: ['marmoom-insulation', 'barsha-em', 'anjar-mech'], at: SL_044, byId: CO_PROC },
  },
  ...rfqs(T044, R044, levelOf(P044)),
  clarifications: [
    { id: 'CL-044-01', tenderId: T044, packageId: 'P-01', supplierId: 'arctis', commercial: false, ownerId: CO_BID,
      question: 'Is the chiller efficiency guaranteed at AHRI rating conditions or at the site design conditions of 46 °C?',
      raisedAt: '2026-03-05T11:00', due: '2026-03-10T11:00' },
    { id: 'CL-044-02', tenderId: T044, packageId: 'P-02', supplierId: 'mirdif-towers', commercial: false, ownerId: CO_BID,
      question: 'Is treated sewage effluent the make-up water source for the cooling towers?',
      raisedAt: '2026-02-24T10:00', due: '2026-02-27T10:00',
      answer: { text: 'Yes. Treated sewage effluent, with potable water as the back-up; the water quality is in Appendix C.', at: '2026-02-25T15:20', byId: CO_BID } },
  ],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 60 days of invoice; an advance of up to 10% against an advance payment guarantee; 10% retention, half released at completion.',
  documents: DOCUMENTS,
};

// ===========================================================================
// Dafna · T-2026-019 Al Wakra sewer rehabilitation (QAR 150 M)
// DG1 pursue Thu 19 Feb 09:30. Packaging approved 12:00, shortlists 13:40,
// 30 RFQs sent 14:20–15:00. Replies due Thu 5 Mar for six packages (P-03's
// extended to Sun 8 Mar 09:00 at the suppliers' request) and Tue 10 Mar for
// four. Two replies were late: Simaisma (P-04) and Mesaieed (P-06).

const T019 = 'T-2026-019';
const D019 = 'SMDO-WKR';
const DA_PROC = 'dafna.proc';
const DA_BID = 'dafna.bid';

const P019: PackageInput[] = [
  { id: 'P-01', title: 'CIPP liner tubes and resin, DN300–DN600', kind: 'supply', value: 21_500_000, trades: ['cipp'], quoteLevel: 'line', lineCount: 6, selfInstall: true,
    lines: lines([
      ['3.01', 'CIPP liner tube, felt, DN300–DN450, with resin, supplied wet-out', 'm', 14_200],
      ['3.03', 'CIPP liner tube, felt, DN500–DN600, with resin, supplied wet-out', 'm', 9_800],
    ]),
    scope: 'Supply of cured-in-place liner tubes and resin for the small-diameter sewers, delivered to site in the lining sequence, with installation supervision.',
    specRef: 'Specification, Section 4: sewer rehabilitation by lining', drawings: [`${D019}-S-101`, `${D019}-S-102`] },
  { id: 'P-02', title: 'CIPP liner tubes and resin, DN700–DN1400', kind: 'supply', value: 27_800_000, trades: ['cipp'], quoteLevel: 'line', lineCount: 5, selfInstall: true,
    lines: lines([
      ['3.06', 'CIPP liner tube, glass-fibre reinforced, DN700–DN1000, UV cured', 'm', 6_400],
      ['3.08', 'CIPP liner tube, glass-fibre reinforced, DN1100–DN1400, UV cured', 'm', 3_100],
    ]),
    scope: 'Supply of glass-fibre liner tubes for the large-diameter trunk sewers, delivered to site, with installation supervision and the UV curing train.',
    specRef: 'Specification, Section 4: sewer rehabilitation by lining', drawings: [`${D019}-S-103`] },
  { id: 'P-03', title: 'Spot repairs and lateral reconnection', kind: 'subcontract', value: 6_400_000, trades: ['cipp'], quoteLevel: 'line', lineCount: 4,
    lines: lines([
      ['3.12', 'Robotic lateral reinstatement after lining', 'nr', 2_150],
      ['3.14', 'Patch repairs, DN300–DN900', 'nr', 340],
    ]),
    scope: 'Robotic reinstatement of lateral connections after lining, and localised patch repairs.',
    specRef: 'Specification, Section 4.8: laterals and repairs', drawings: [`${D019}-S-104`] },
  { id: 'P-04', title: 'Manhole rehabilitation', kind: 'subcontract', value: 9_600_000, trades: ['manholes'], quoteLevel: 'line', lineCount: 5,
    lines: lines([
      ['5.01', 'Manhole wall rehabilitation with the specified epoxy coating system', 'm2', 21_000],
      ['5.04', 'Benching and channel reconstruction', 'nr', 620],
    ]),
    scope: 'Rehabilitation of existing manholes: surface preparation, the specified epoxy coating system, benching and channels.',
    specRef: 'Specification, Section 5: manholes', drawings: [`${D019}-S-110`] },
  { id: 'P-05', title: 'Bypass pumping and flow management', kind: 'subcontract', value: 7_200_000, trades: ['bypass', 'pumps'], quoteLevel: 'package', lineCount: 3,
    lines: lines([
      ['2.04', 'Bypass pumping for lining sections, with 100% standby', 'week', 64],
      ['2.06', 'Flow monitoring during the works', 'item', 1],
    ]),
    scope: 'Bypass pumping and flow management for every lining section, with 100% standby capacity and round-the-clock attendance.',
    specRef: 'Specification, Section 2.4: flow management', drawings: [`${D019}-S-120`] },
  { id: 'P-06', title: 'CCTV survey and cleaning', kind: 'subcontract', value: 3_900_000, trades: ['cctv'], quoteLevel: 'line', lineCount: 4,
    lines: lines([
      ['2.01', 'High-pressure jetting and root cutting before lining', 'm', 33_500],
      ['2.02', 'CCTV survey before and after lining, to the national coding standard', 'm', 67_000],
    ]),
    scope: 'Cleaning, and CCTV survey before and after lining, with coded reports.',
    specRef: 'Specification, Section 2: surveys and cleaning', drawings: [`${D019}-S-100`] },
  { id: 'P-07', title: 'Pump station refurbishment', kind: 'supply', value: 8_700_000, trades: ['pumps', 'process-mech'], quoteLevel: 'line', lineCount: 6, selfInstall: true,
    lines: lines([
      ['7.01', 'Submersible sewage pumps, 90 kW, with guide rails', 'nr', 9],
      ['7.03', 'Mechanical screens for the wet wells', 'nr', 3],
    ]),
    scope: 'Supply of replacement pumps and screens for three pump stations, delivered to site, with installation supervision and commissioning.',
    specRef: 'Specification, Section 7: pump stations', drawings: [`${D019}-M-201`] },
  { id: 'P-08', title: 'Odour and corrosion control', kind: 'subcontract', value: 4_300_000, trades: ['odour', 'filtration'], quoteLevel: 'package', lineCount: 3,
    lines: lines([
      ['8.01', 'Carbon filter odour control units at pump stations', 'nr', 3],
      ['8.03', 'Chemical dosing for hydrogen sulphide control at the rising mains', 'set', 2],
    ]),
    scope: 'Design, supply, installation and commissioning of odour control and hydrogen sulphide dosing.',
    specRef: 'Specification, Section 8: odour control', drawings: [`${D019}-M-205`] },
  { id: 'P-09', title: 'Replacement pipes and fittings', kind: 'supply', value: 6_800_000, trades: ['grp', 'pipes'], quoteLevel: 'line', lineCount: 5, lcRelevant: true,
    lines: lines([
      ['6.01', 'GRP pipes DN400–DN800, SN10000, for collapsed sections', 'm', 3_900],
      ['6.03', 'Couplings and connectors for existing pipes', 'nr', 520],
    ]),
    scope: 'Supply of pipes and fittings for the sections replaced by open cut, delivered to site.',
    specRef: 'Specification, Section 6: pipe replacement', drawings: [`${D019}-S-130`] },
  { id: 'P-10', title: 'Manhole covers and frames', kind: 'supply', value: 2_100_000, trades: ['manholes', 'pipes'], quoteLevel: 'line', lineCount: 2,
    lines: lines([
      ['5.08', 'Ductile iron manhole covers and frames, D400, lockable', 'nr', 780],
    ]),
    scope: 'Supply of manhole covers and frames, delivered to site.',
    specRef: 'Specification, Section 5.6: covers and frames', drawings: [`${D019}-S-111`] },
];

const DA_DUE_5: Reply = { replyBy: '2026-03-05T17:00' };
const DA_EXT_8: Reply = { replyBy: '2026-03-08T08:30', extendedFrom: '2026-03-05T17:00', extensionReason: 'Lateral connection schedule reissued with the RFQ documents on Tue 3 Mar' };
const DA_DUE_10: Reply = { replyBy: '2026-03-10T17:00' };

const R019: RfqRow[] = [
  // P-01: two quotes, one decline
  ...send('P-01', '2026-02-19T14:20', DA_DUE_5, [
    ['mesaieed-relining', { openedAt: '2026-02-19T15:10', acknowledgedAt: '2026-02-22T08:30',
      quote: { receivedAt: '2026-03-03T10:20', amount: 21_180_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 6, page: 2 } }],
    ['oder-liner', { openedAt: '2026-02-19T15:40', acknowledgedAt: '2026-02-22T09:15',
      quote: { receivedAt: '2026-03-04T15:00', amount: 5_390_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 8, page: 3, seededDecisions: { currency: 'confirmed' } } }],
    ['anatolia-kanal', { openedAt: '2026-02-20T09:00', declined: { at: '2026-03-02T09:30', reason: 'Lining crews committed in Doha until June' } }],
  ]),
  // P-02: not yet due
  ...send('P-02', '2026-02-19T14:25', DA_DUE_10, [
    ['mesaieed-relining', { openedAt: '2026-02-19T15:12', acknowledgedAt: '2026-02-22T08:32' }],
    ['oder-liner', { openedAt: '2026-02-19T15:42', acknowledgedAt: '2026-02-22T09:17' }],
    ['simaisma-manhole', { openedAt: '2026-02-22T10:05' }],
  ]),
  // P-03: extended to Sun 8 Mar 08:30; one quote, two overdue (escalation due Mon 9 Mar)
  ...send('P-03', '2026-02-19T14:30', DA_EXT_8, [
    ['oder-liner', { openedAt: '2026-02-19T15:44', acknowledgedAt: '2026-02-22T09:19',
      quote: { receivedAt: '2026-03-05T10:30', amount: 1_590_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 4, page: 2, seededDecisions: { currency: 'confirmed' } } }],
    ['anatolia-kanal', { openedAt: '2026-02-20T09:02', acknowledgedAt: '2026-02-23T08:00' }],
    ['simaisma-manhole', { openedAt: '2026-02-22T10:07', acknowledgedAt: '2026-02-24T12:40' }],
  ]),
  // P-04: two compliant quotes (Simaisma late), one non-compliant
  ...send('P-04', '2026-02-19T14:35', DA_DUE_5, [
    ['anatolia-kanal', { openedAt: '2026-02-20T09:04', acknowledgedAt: '2026-02-23T08:02',
      quote: { receivedAt: '2026-03-05T11:40', amount: 2_380_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 3, page: 2, seededDecisions: { currency: 'confirmed' } } }],
    ['simaisma-manhole', { openedAt: '2026-02-22T10:09', acknowledgedAt: '2026-02-24T12:42',
      quote: { receivedAt: '2026-03-07T13:20', amount: 9_840_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 3, page: 2 } }],
    ['umm-salal-precast', { openedAt: '2026-02-19T16:20', acknowledgedAt: '2026-02-22T11:00',
      quote: { receivedAt: '2026-03-04T10:00', amount: 8_650_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 4, page: 3,
        deviations: [{ text: 'Cementitious lining only; the specified epoxy coating system is not offered', nonCompliant: true }],
        seededDecisions: { deviations: 'confirmed' } } }],
  ]),
  // P-05: two compliant quotes, one non-compliant
  ...send('P-05', '2026-02-19T14:40', DA_DUE_5, [
    ['duhail-bypass', { openedAt: '2026-02-19T15:05', acknowledgedAt: '2026-02-19T16:30',
      quote: { receivedAt: '2026-03-03T14:30', amount: 7_050_000, ccy: 'QAR', validityDays: 120, page: 2 } }],
    ['saale-pumpen', { openedAt: '2026-02-20T08:40', acknowledgedAt: '2026-02-22T09:50',
      quote: { receivedAt: '2026-03-05T09:15', amount: 1_720_000, ccy: 'EUR', validityDays: 120, page: 4,
        deviations: [{ text: 'Standby pumps not offered: the specification requires 100% standby', nonCompliant: true }],
        seededDecisions: { currency: 'confirmed', deviations: 'confirmed' } } }],
    ['gulf-process', { openedAt: '2026-02-19T17:30', acknowledgedAt: '2026-02-22T10:10',
      quote: { receivedAt: '2026-03-04T16:00', amount: 7_480_000, ccy: 'SAR', validityDays: 120, page: 2, seededDecisions: { currency: 'confirmed' } } }],
  ]),
  // P-06: two quotes (Mesaieed late), one decline; Zubarah held on the shortlist
  ...send('P-06', '2026-02-19T14:45', DA_DUE_5, [
    ['khor-inspection', { openedAt: '2026-02-19T15:00', acknowledgedAt: '2026-02-19T15:30',
      quote: { receivedAt: '2026-03-02T11:00', amount: 3_760_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 2, page: 2 } }],
    ['mesaieed-relining', { openedAt: '2026-02-19T15:14', acknowledgedAt: '2026-02-22T08:34',
      quote: { receivedAt: '2026-03-08T08:15', amount: 4_020_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 2, page: 3 } }],
    ['anatolia-kanal', { openedAt: '2026-02-20T09:06', declined: { at: '2026-03-03T10:00', reason: 'No CCTV crew available in Qatar before May' } }],
  ]),
  // P-07: not yet due
  ...send('P-07', '2026-02-19T14:50', DA_DUE_10, [
    ['gulf-process', { openedAt: '2026-02-19T17:32', acknowledgedAt: '2026-02-22T10:12' }],
    ['saale-pumpen', { openedAt: '2026-02-20T08:42' }],
    ['duhail-bypass', { openedAt: '2026-02-19T15:07', acknowledgedAt: '2026-02-19T16:32' }],
  ]),
  // P-08: not yet due
  ...send('P-08', '2026-02-19T14:55', DA_DUE_10, [
    ['fuwairit-water', { openedAt: '2026-02-19T16:00', acknowledgedAt: '2026-02-22T09:00' }],
    ['wukair-env', { openedAt: '2026-02-22T11:30' }],
    ['mosel-separation', { openedAt: '2026-02-20T10:15', acknowledgedAt: '2026-02-23T09:40' }],
  ]),
  // P-09: two quotes, one decline
  ...send('P-09', '2026-02-19T14:58', DA_DUE_5, [
    ['dukhan-composite', { openedAt: '2026-02-19T15:30', acknowledgedAt: '2026-02-22T08:20',
      quote: { receivedAt: '2026-03-04T12:30', amount: 6_640_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 10, page: 2 } }],
    ['kharrara-pipe', { openedAt: '2026-02-20T11:00', acknowledgedAt: '2026-02-23T10:10',
      quote: { receivedAt: '2026-03-05T15:45', amount: 6_910_000, ccy: 'QAR', validityDays: 120, leadTimeWeeks: 8, page: 2 } }],
    ['shamal-pipe', { openedAt: '2026-02-22T09:20', declined: { at: '2026-03-01T12:00', reason: 'GRP above DN800 not stocked, and no ductile option in the specification' } }],
  ]),
  // P-10: not yet due
  ...send('P-10', '2026-02-19T15:00', DA_DUE_10, [
    ['umm-salal-precast', { openedAt: '2026-02-19T16:22' }],
    ['kharrara-pipe', { openedAt: '2026-02-20T11:02', acknowledgedAt: '2026-02-23T10:12' }],
    ['shamal-pipe', { openedAt: '2026-02-22T09:22', acknowledgedAt: '2026-02-24T08:45' }],
  ]),
];

const SL_019 = '2026-02-19T13:40';

export const DAFNA_T019: S2Tender = {
  tenant: 'dafna',
  tenderId: T019,
  packages: packages('dafna', T019, 'QAR', P019),
  // Packages and self-performed work: exactly QAR 150,000,000, with nothing uncovered.
  boq: boq(T019, 'QAR', [
    ['B-01', 'General and preliminaries', 14_600_000, 'self'],
    ['B-02', 'Traffic management and road reinstatement', 19_400_000, 'self'],
    ['B-03', 'Lining installation and pipe replacement by open cut', 17_700_000, 'self'],
    ...packageBoq(P019, 4),
  ]),
  packagingApproved: { at: '2026-02-19T12:00', byId: DA_PROC },
  shortlists: {
    'P-01': { supplierIds: ['mesaieed-relining', 'oder-liner', 'anatolia-kanal'], at: SL_019, byId: DA_PROC },
    'P-02': { supplierIds: ['mesaieed-relining', 'oder-liner', 'simaisma-manhole'], at: SL_019, byId: DA_PROC },
    'P-03': { supplierIds: ['oder-liner', 'anatolia-kanal', 'simaisma-manhole'], at: SL_019, byId: DA_PROC },
    'P-04': { supplierIds: ['anatolia-kanal', 'simaisma-manhole', 'umm-salal-precast'], at: SL_019, byId: DA_PROC },
    'P-05': { supplierIds: ['duhail-bypass', 'saale-pumpen', 'gulf-process'], at: SL_019, byId: DA_PROC },
    'P-06': { supplierIds: ['khor-inspection', 'mesaieed-relining', 'anatolia-kanal', 'zubarah-survey'], at: SL_019, byId: DA_PROC },
    'P-07': { supplierIds: ['gulf-process', 'saale-pumpen', 'duhail-bypass'], at: SL_019, byId: DA_PROC },
    'P-08': { supplierIds: ['fuwairit-water', 'wukair-env', 'mosel-separation'], at: SL_019, byId: DA_PROC },
    'P-09': { supplierIds: ['dukhan-composite', 'kharrara-pipe', 'shamal-pipe'], at: SL_019, byId: DA_PROC },
    'P-10': { supplierIds: ['umm-salal-precast', 'kharrara-pipe', 'shamal-pipe'], at: SL_019, byId: DA_PROC },
  },
  ...rfqs(T019, R019, levelOf(P019)),
  clarifications: [
    { id: 'CL-019-01', tenderId: T019, packageId: 'P-01', supplierId: 'oder-liner', commercial: false, ownerId: DA_BID,
      question: 'Is the host pipe ovality survey available for the DN450 sections? The liner design thickness depends on it.',
      raisedAt: '2026-03-01T10:00', due: '2026-03-04T10:00' },
    { id: 'CL-019-02', tenderId: T019, packageId: 'P-07', supplierId: 'gulf-process', commercial: false, ownerId: DA_BID,
      question: 'Can the existing pump bases and guide rails be reused, or are new plinths in our scope?',
      raisedAt: '2026-03-05T14:00', due: '2026-03-10T14:00' },
    { id: 'CL-019-03', tenderId: T019, packageId: 'P-08', supplierId: 'fuwairit-water', commercial: true, ownerId: DA_PROC,
      question: 'Will you accept payment within 60 days of invoice instead of 45, against a 5% discount?',
      raisedAt: '2026-03-08T09:00', due: '2026-03-11T09:00' },
    { id: 'CL-019-04', tenderId: T019, packageId: 'P-05', supplierId: 'duhail-bypass', commercial: false, ownerId: DA_BID,
      question: 'What is the peak wet-weather flow for the Al Wakra trunk sewer?',
      raisedAt: '2026-02-24T09:00', due: '2026-03-01T09:00',
      answer: { text: 'Peak wet-weather flow is 1,850 l/s at the trunk sewer outfall, from the 2025 flow survey in Appendix D.', at: '2026-02-25T11:30', byId: DA_BID } },
  ],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 45 days of invoice; an advance of up to 10% against an advance payment guarantee; 10% retention until the end of the maintenance period.',
  documents: DOCUMENTS,
};

// ===========================================================================
// Batinah · T-2026-027 Muscat interchange upgrade (OMR 24 M)
// DG1 pursue Thu 12 Feb 10:15. Packaging approved 12:30, shortlists 14:30,
// 21 RFQs sent 15:20–16:00 with replies due Thu 5 Mar. Addendum 1 (3 Mar)
// revised the underpass: P-03, P-06 and P-07 extended to Thu 12 Mar, the next
// replies due. Karst asked for the weekend and was extended to Sun 8 Mar 09:00;
// no reply yet.

const T027 = 'T-2026-027';
const D027 = 'CARD-MIU';
const BA_PROC = 'batinah.proc';
const BA_BID = 'batinah.bid';

const P027: PackageInput[] = [
  { id: 'P-01', title: 'Earthworks and subgrade', kind: 'subcontract', value: 2_900_000, trades: ['earthworks'], quoteLevel: 'line', lineCount: 6,
    lines: lines([
      ['2.01', 'Excavation in all materials, to spoil', 'm3', 184_000],
      ['2.04', 'Embankment fill, compacted in layers', 'm3', 126_000],
      ['2.07', 'Subgrade preparation and capping layer', 'm2', 98_000],
    ]),
    scope: 'Earthworks for the ramps and the approach roads: excavation, embankment fill and subgrade.',
    specRef: 'Specification, Series 600: earthworks', drawings: [`${D027}-R-101`, `${D027}-R-102`] },
  { id: 'P-02', title: 'Asphalt supply', kind: 'supply', value: 3_400_000, trades: ['asphalt'], quoteLevel: 'line', lineCount: 4, selfInstall: true, lcRelevant: true,
    lines: lines([
      ['7.01', 'Asphalt base course, 60/70 bitumen, delivered to the paver', 't', 58_000],
      ['7.03', 'Asphalt wearing course, polymer-modified, delivered to the paver', 't', 21_500],
    ]),
    scope: 'Supply of asphalt base and wearing courses from an approved plant, delivered to the paver in the paving sequence.',
    specRef: 'Specification, Series 700: pavements', drawings: [`${D027}-R-110`] },
  { id: 'P-03', title: 'Bored piles for the flyover and underpass', kind: 'subcontract', value: 1_600_000, trades: ['piling'], quoteLevel: 'line', lineCount: 3,
    lines: lines([
      ['3.01', 'Bored cast-in-place piles, 1,200 mm diameter', 'm', 4_600],
      ['3.03', 'Pile integrity and load tests', 'nr', 12],
    ]),
    note: 'Pile layout at the underpass revised by Addendum 1',
    scope: 'Bored piles for the flyover piers and the underpass walls, with integrity and load tests.',
    specRef: 'Specification, Series 1600: piling', drawings: [`${D027}-B-201`, `${D027}-B-202`] },
  { id: 'P-04', title: 'Precast bridge beams and parapets', kind: 'supply', value: 2_200_000, trades: ['precast'], quoteLevel: 'line', lineCount: 4, lcRelevant: true,
    lines: lines([
      ['4.01', 'Precast prestressed bridge beams, 32 m', 'nr', 48],
      ['4.04', 'Precast parapet units', 'm', 860],
    ]),
    scope: 'Supply of precast prestressed beams and parapet units, delivered to site.',
    specRef: 'Specification, Series 1700: structural concrete', drawings: [`${D027}-B-210`] },
  { id: 'P-05', title: 'Bridge bearings and expansion joints', kind: 'supply', value: 480_000, trades: ['bearings'], quoteLevel: 'line', lineCount: 3, needByWeeks: 20,
    lines: lines([
      ['4.08', 'Elastomeric bearings, laminated', 'nr', 96],
      ['4.10', 'Modular expansion joints, 160 mm movement', 'm', 64],
    ]),
    scope: 'Supply of bridge bearings and expansion joints, delivered to site, with installation supervision.',
    specRef: 'Specification, Series 2100: bearings and joints', drawings: [`${D027}-B-220`] },
  { id: 'P-06', title: 'Road restraint systems and signs', kind: 'supply', value: 920_000, trades: ['barriers', 'signage'], quoteLevel: 'line', lineCount: 5, lcRelevant: true,
    lines: lines([
      ['8.01', 'Concrete safety barriers, precast', 'm', 3_400],
      ['8.04', 'Overhead sign gantries and signs', 'nr', 9],
    ]),
    note: 'Signage schedule revised by Addendum 1',
    scope: 'Supply of safety barriers, crash cushions, gantries and signs, delivered to site.',
    specRef: 'Specification, Series 1200: traffic signs and restraint', drawings: [`${D027}-R-130`] },
  { id: 'P-07', title: 'Underpass lighting, pumping and power', kind: 'subcontract', value: 1_100_000, trades: ['lighting', 'lv', 'pumps'], quoteLevel: 'package', lineCount: 4,
    lines: lines([
      ['9.01', 'Underpass lighting, LED, with controls', 'item', 1],
      ['9.03', 'Stormwater pumping station for the underpass, duty and standby', 'item', 1],
    ]),
    note: 'Underpass drainage revised by Addendum 1',
    scope: 'Supply, installation and commissioning of the underpass lighting, the stormwater pumping station and the power supply.',
    specRef: 'Specification, Series 1400: electrical and lighting', drawings: [`${D027}-E-301`] },
];

const BA_DUE_5: Reply = { replyBy: '2026-03-05T17:00' };
const BA_EXT_8: Reply = { replyBy: '2026-03-08T09:00', extendedFrom: '2026-03-05T17:00', extensionReason: 'The supplier asked for the weekend to finish its price' };
/** Addendum 1 (Tue 3 Mar) revised the underpass; each package's reply date moved to Thu 12 Mar. */
const addendum1 = (what: string): Reply => ({ replyBy: '2026-03-12T17:00', extendedFrom: '2026-03-05T17:00', extensionReason: `Addendum 1 (Tue 3 Mar) revised ${what}` });

const R027: RfqRow[] = [
  // P-01: three compliant quotes (Khabourah late)
  ...send('P-01', '2026-02-12T15:20', BA_DUE_5, [
    ['nizwa-quarry', { openedAt: '2026-02-12T16:00', acknowledgedAt: '2026-02-15T08:30',
      quote: { receivedAt: '2026-03-03T10:00', amount: 2_840_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 2, page: 2 } }],
    ['khabourah-earth', { openedAt: '2026-02-15T09:10', acknowledgedAt: '2026-02-16T10:00',
      quote: { receivedAt: '2026-03-07T10:30', amount: 2_790_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 3, page: 2 } }],
    ['bidbid-foundations', { openedAt: '2026-02-12T17:40', acknowledgedAt: '2026-02-15T11:20',
      quote: { receivedAt: '2026-03-05T12:00', amount: 3_020_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 2, page: 3 } }],
  ]),
  // P-02: three compliant quotes
  ...send('P-02', '2026-02-12T15:30', BA_DUE_5, [
    ['sohar-asphalt', { openedAt: '2026-02-12T15:50', acknowledgedAt: '2026-02-12T16:40',
      quote: { receivedAt: '2026-03-02T11:30', amount: 3_310_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 1, page: 2 } }],
    ['nizwa-quarry', { openedAt: '2026-02-12T16:02', acknowledgedAt: '2026-02-15T08:32',
      quote: { receivedAt: '2026-03-04T09:40', amount: 3_450_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 1, page: 2 } }],
    ['khabourah-earth', { openedAt: '2026-02-15T09:12', acknowledgedAt: '2026-02-16T10:02',
      quote: { receivedAt: '2026-03-05T16:10', amount: 3_380_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 2, page: 3 } }],
  ]),
  // P-03: extended by Addendum 1
  ...send('P-03', '2026-02-12T15:35', addendum1('the pile layout at the underpass'), [
    ['seeb-piling', { openedAt: '2026-02-12T16:10', acknowledgedAt: '2026-02-15T09:00' }],
    ['bidbid-foundations', { openedAt: '2026-02-12T17:42', acknowledgedAt: '2026-02-15T11:22' }],
    ['amerat-foundations', { openedAt: '2026-02-15T10:30' }],
  ]),
  // P-04: three compliant quotes (Rustaq late)
  ...send('P-04', '2026-02-12T15:40', BA_DUE_5, [
    ['barka-precast', { openedAt: '2026-02-12T16:20', acknowledgedAt: '2026-02-15T08:10',
      quote: { receivedAt: '2026-03-04T13:00', amount: 2_150_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 10, page: 2 } }],
    ['sur-precast', { openedAt: '2026-02-15T08:45', acknowledgedAt: '2026-02-15T12:00',
      quote: { receivedAt: '2026-03-03T15:20', amount: 2_240_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 12, page: 2 } }],
    ['rustaq-barriers', { openedAt: '2026-02-16T09:30', acknowledgedAt: '2026-02-17T10:10',
      quote: { receivedAt: '2026-03-08T08:40', amount: 2_310_000, ccy: 'OMR', validityDays: 120, leadTimeWeeks: 11, page: 3 } }],
  ]),
  // P-05: two quotes to level; Karst extended to Sun 8 Mar 09:00 and overdue (escalation due Mon 9 Mar)
  ...send('P-05', '2026-02-12T15:45', BA_DUE_5, [
    ['alpen-bearings', { openedAt: '2026-02-12T16:30', acknowledgedAt: '2026-02-15T10:00',
      quote: { receivedAt: '2026-03-05T11:00', amount: 1_120_000, ccy: 'EUR', incoterm: 'EXW', origin: 'Innsbruck, AT', validityDays: 120, leadTimeWeeks: 14, page: 3 } }],
    ['emilia-giunti', { openedAt: '2026-02-13T09:15', acknowledgedAt: '2026-02-16T08:40',
      quote: { receivedAt: '2026-03-04T15:30', amount: 1_160_000, ccy: 'EUR', validityDays: 90, leadTimeWeeks: 16, page: 2 } }],
  ]),
  ...send('P-05', '2026-02-12T15:45', BA_EXT_8, [
    ['karst-bearings', { openedAt: '2026-02-16T11:20', acknowledgedAt: '2026-02-18T09:30' }],
  ]),
  // P-06: extended by Addendum 1; Ibri held on the shortlist
  ...send('P-06', '2026-02-12T15:50', addendum1('the signage schedule'), [
    ['sur-precast', { openedAt: '2026-02-15T08:47', acknowledgedAt: '2026-02-15T12:02' }],
    ['rustaq-barriers', { openedAt: '2026-02-16T09:32' }],
    ['barka-precast', { openedAt: '2026-02-12T16:22', acknowledgedAt: '2026-02-15T08:12' }],
  ]),
  // P-07: extended by Addendum 1
  ...send('P-07', '2026-02-12T16:00', addendum1('the underpass drainage'), [
    ['samail-lighting', { openedAt: '2026-02-12T16:40', acknowledgedAt: '2026-02-15T09:20' }],
    ['luminara', { openedAt: '2026-02-13T10:00' }],
    ['gulf-process', { openedAt: '2026-02-15T12:05', acknowledgedAt: '2026-02-16T09:45' }],
  ]),
];

const SL_027 = '2026-02-12T14:30';

export const BATINAH_T027: S2Tender = {
  tenant: 'batinah',
  tenderId: T027,
  packages: packages('batinah', T027, 'OMR', P027),
  // Packages, self-performed work and the one scope nobody in the master offers: exactly OMR 24,000,000.
  boq: boq(T027, 'OMR', [
    ['B-01', 'General and preliminaries', 2_640_000, 'self'],
    ['B-02', 'Bridge and underpass structures', 5_180_000, 'self'],
    ['B-03', 'Drainage, paving and road works', 2_500_000, 'self'],
    ...packageBoq(P027, 4),
    ['B-11', 'Intelligent transport system: gantries, cameras and message signs', 1_080_000, 'not-covered'],
  ]),
  packagingApproved: { at: '2026-02-12T12:30', byId: BA_PROC },
  shortlists: {
    'P-01': { supplierIds: ['nizwa-quarry', 'khabourah-earth', 'bidbid-foundations'], at: SL_027, byId: BA_PROC },
    'P-02': { supplierIds: ['sohar-asphalt', 'nizwa-quarry', 'khabourah-earth'], at: SL_027, byId: BA_PROC },
    'P-03': { supplierIds: ['seeb-piling', 'bidbid-foundations', 'amerat-foundations'], at: SL_027, byId: BA_PROC },
    'P-04': { supplierIds: ['barka-precast', 'sur-precast', 'rustaq-barriers'], at: SL_027, byId: BA_PROC },
    'P-05': { supplierIds: ['alpen-bearings', 'emilia-giunti', 'karst-bearings'], at: SL_027, byId: BA_PROC },
    'P-06': { supplierIds: ['sur-precast', 'rustaq-barriers', 'barka-precast', 'ibri-signs'], at: SL_027, byId: BA_PROC },
    'P-07': { supplierIds: ['samail-lighting', 'luminara', 'gulf-process'], at: SL_027, byId: BA_PROC },
  },
  ...rfqs(T027, R027, levelOf(P027)),
  clarifications: [
    { id: 'CL-027-01', tenderId: T027, packageId: 'P-05', supplierId: 'alpen-bearings', commercial: false, ownerId: BA_BID,
      question: 'Please confirm the design movement for the expansion joints at the east abutment: 160 mm or 240 mm?',
      raisedAt: '2026-03-05T11:00', due: '2026-03-10T11:00' },
    { id: 'CL-027-02', tenderId: T027, packageId: 'P-07', supplierId: 'gulf-process', commercial: true, ownerId: BA_PROC,
      question: 'Can the pump warranty start at the underpass handover instead of at delivery?',
      raisedAt: '2026-03-08T09:15', due: '2026-03-11T09:15' },
    { id: 'CL-027-03', tenderId: T027, packageId: 'P-03', supplierId: 'seeb-piling', commercial: false, ownerId: BA_BID,
      question: 'Does Addendum 1 change the pile lengths at the underpass, or only the layout?',
      raisedAt: '2026-03-03T14:00', due: '2026-03-08T14:00',
      answer: { text: 'Both. Addendum 1, drawing CARD-MIU-B-202 rev. B, adds four piles and lengthens the underpass wall piles from 18 m to 22 m.', at: '2026-03-04T10:30', byId: BA_BID } },
  ],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 56 days of invoice; an advance of up to 10% against an advance payment guarantee; 10% retention, half released at completion.',
  documents: DOCUMENTS,
};

// ===========================================================================
// Qurain · T-2026-058 Kuwait South wastewater conveyance tunnels (KWD 46 M)
// DG1 pursue Tue 10 Feb 12:00. Packaging approved 13:30, shortlists 15:10,
// 36 RFQs sent 16:00–17:00. Replies due Thu 5 Mar for eight packages and
// Tue 10 Mar for four. Taihu (P-01) and Fahaheel (P-05) were extended to
// Sun 8 Mar 09:00 and have not replied. Late: Bubiyan (P-06), Abdali (P-09).

const T058 = 'T-2026-058';
const D058 = 'SGSA-KSC';
const QU_PROC = 'qurain.proc';
const QU_BID = 'qurain.bid';

const P058: PackageInput[] = [
  { id: 'P-01', title: 'Tunnel boring machines', kind: 'supply', value: 7_800_000, trades: ['tbm'], quoteLevel: 'line', lineCount: 3,
    selfInstall: true, longLeadWeeks: 40, needByWeeks: 30, avlRequired: true,
    lines: lines([
      ['3.01', 'Earth pressure balance tunnel boring machine, 3.6 m bore, with back-up gantries', 'nr', 2],
      ['3.03', 'Cutter tools and wear parts for the first 4 km', 'set', 2],
    ]),
    note: 'TBMs set the programme; the drive starts in week 30',
    scope: 'Supply of two EPB tunnel boring machines with back-up gantries, delivered to site, with assembly supervision, commissioning and site support for the first drive.',
    specRef: 'Specification, Section 3: tunnelling plant', drawings: [`${D058}-T-101`] },
  { id: 'P-02', title: 'Precast tunnel segments', kind: 'supply', value: 5_600_000, trades: ['segments'], quoteLevel: 'line', lineCount: 4, lcRelevant: true,
    lines: lines([
      ['4.01', 'Precast segmental lining rings, 3.2 m internal diameter, steel-fibre reinforced', 'ring', 9_400],
      ['4.03', 'EPDM gaskets and connectors', 'ring', 9_400],
    ]),
    scope: 'Supply of precast segment rings with gaskets and connectors, delivered to the shafts in the drive sequence.',
    specRef: 'Specification, Section 4: segmental lining', drawings: [`${D058}-T-110`] },
  { id: 'P-03', title: 'Annulus and contact grouting', kind: 'subcontract', value: 1_150_000, trades: ['grouting'], quoteLevel: 'line', lineCount: 3,
    lines: lines([
      ['4.08', 'Two-component annulus grouting behind the segments', 'm', 14_100],
      ['4.10', 'Contact grouting at the shaft eyes', 'nr', 12],
    ]),
    scope: 'Annulus and contact grouting, with the grout plant, mix design and testing.',
    specRef: 'Specification, Section 4.6: grouting', drawings: [`${D058}-T-111`] },
  { id: 'P-04', title: 'Shaft construction', kind: 'subcontract', value: 3_900_000, trades: ['shafts'], quoteLevel: 'line', lineCount: 5,
    lines: lines([
      ['2.01', 'Diaphragm wall shafts, 12 m internal diameter, to 28 m depth', 'nr', 6],
      ['2.04', 'Secant pile reception shafts', 'nr', 4],
    ]),
    scope: 'Construction of the launch and reception shafts: diaphragm walls, secant piles, excavation and base slabs.',
    specRef: 'Specification, Section 2: shafts', drawings: [`${D058}-S-201`, `${D058}-S-202`] },
  { id: 'P-05', title: 'Tunnel ventilation', kind: 'supply', value: 820_000, trades: ['ventilation'], quoteLevel: 'package', lineCount: 3,
    lines: lines([
      ['3.08', 'Tunnel ventilation fans and ducting for the construction drives', 'set', 2],
      ['3.10', 'Gas detection and ventilation controls', 'set', 2],
    ]),
    scope: 'Supply of construction ventilation fans, ducting and controls for both drives, delivered to site, with commissioning.',
    specRef: 'Specification, Section 3.5: ventilation', drawings: [`${D058}-T-120`] },
  { id: 'P-06', title: 'Carrier pipe DN2000', kind: 'supply', value: 4_300_000, trades: ['grp', 'pipes'], quoteLevel: 'line', lineCount: 3, lcRelevant: true,
    lines: lines([
      ['5.01', 'GRP carrier pipe DN2000, SN5000, jointed in the tunnel', 'm', 14_100],
    ]),
    scope: 'Supply of the DN2000 carrier pipe and joints, delivered to the shafts.',
    specRef: 'Specification, Section 5: carrier pipe', drawings: [`${D058}-P-130`] },
  { id: 'P-07', title: 'Valves and penstocks', kind: 'supply', value: 1_050_000, trades: ['valves'], quoteLevel: 'line', lineCount: 4,
    lines: lines([
      ['6.01', 'Knife gate valves DN1200–DN2000, actuated', 'nr', 14],
      ['6.03', 'Stainless steel penstocks', 'nr', 18],
    ]),
    scope: 'Supply of isolation valves and penstocks for the shafts and the terminal station, delivered to site.',
    specRef: 'Specification, Section 6: valves', drawings: [`${D058}-M-210`] },
  { id: 'P-08', title: 'Terminal pump station, mechanical', kind: 'supply', value: 2_650_000, trades: ['pumps', 'process-mech'], quoteLevel: 'line', lineCount: 5, selfInstall: true,
    lines: lines([
      ['7.01', 'Dry-well centrifugal sewage pumps, 450 kW', 'nr', 5],
      ['7.03', 'Coarse screens and screenings handling', 'set', 1],
    ]),
    scope: 'Supply of the terminal pump station pumps and screens, delivered to site, with installation supervision and commissioning.',
    specRef: 'Specification, Section 7: terminal pump station', drawings: [`${D058}-M-220`] },
  { id: 'P-09', title: 'Cathodic protection', kind: 'subcontract', value: 480_000, trades: ['cathodic'], quoteLevel: 'package', lineCount: 2,
    lines: lines([
      ['8.01', 'Cathodic protection for the shaft steelwork and the terminal station pipework', 'item', 1],
    ]),
    scope: 'Design, supply, installation and commissioning of cathodic protection.',
    specRef: 'Specification, Section 8: corrosion protection', drawings: [`${D058}-E-310`] },
  { id: 'P-10', title: 'Electrical works and substation', kind: 'subcontract', value: 2_200_000, trades: ['hv', 'lv'], quoteLevel: 'line', lineCount: 6,
    lines: lines([
      ['9.01', '11 kV substation for the terminal station', 'item', 1],
      ['9.03', 'Temporary power for the TBM drives', 'set', 2],
    ]),
    scope: 'Supply, installation and testing of the terminal station substation, the TBM temporary power and cabling.',
    specRef: 'Specification, Section 9: electrical works', drawings: [`${D058}-E-301`] },
  { id: 'P-11', title: 'SCADA and gas monitoring', kind: 'subcontract', value: 950_000, trades: ['ica'], quoteLevel: 'package', lineCount: 3,
    lines: lines([
      ['9.08', 'SCADA for the terminal station and the shafts', 'item', 1],
      ['9.10', 'Hydrogen sulphide and methane monitoring in the shafts', 'nr', 10],
    ]),
    scope: 'Supply, installation and commissioning of the SCADA and the gas monitoring.',
    specRef: 'Specification, Section 9.5: controls', drawings: [`${D058}-I-401`] },
  { id: 'P-12', title: 'Microtunnelled connections', kind: 'subcontract', value: 1_700_000, trades: ['trenchless'], quoteLevel: 'line', lineCount: 3,
    lines: lines([
      ['2.10', 'Microtunnelled connections DN1200 to the existing trunk sewers', 'm', 640],
    ]),
    scope: 'Microtunnelled connections from the shafts to the existing trunk sewers, with the jacking pits.',
    specRef: 'Specification, Section 2.8: connections', drawings: [`${D058}-P-140`] },
];

const QU_DUE_5: Reply = { replyBy: '2026-03-05T17:00' };
const QU_EXT_TBM: Reply = { replyBy: '2026-03-08T08:00', extendedFrom: '2026-03-05T17:00', extensionReason: 'The supplier asked for the weekend to check its cutterhead design against the ground classes' };
const QU_EXT_VENT: Reply = { replyBy: '2026-03-08T09:30', extendedFrom: '2026-03-05T17:00', extensionReason: 'The supplier asked for the weekend to confirm fan lead times with its factory' };
const QU_DUE_10: Reply = { replyBy: '2026-03-10T17:00' };

const R058: RfqRow[] = [
  // P-01: two quotes to level; Taihu extended and overdue
  ...send('P-01', '2026-02-10T16:00', QU_DUE_5, [
    ['rheintal-tbm', { openedAt: '2026-02-10T16:45', acknowledgedAt: '2026-02-11T09:00',
      quote: { receivedAt: '2026-03-04T11:00', amount: 23_400_000, ccy: 'EUR', incoterm: 'EXW', origin: 'Karlsruhe, DE', validityDays: 120, leadTimeWeeks: 38, page: 5 } }],
    ['hokuriku-shield', { openedAt: '2026-02-11T03:10', acknowledgedAt: '2026-02-12T02:30',
      quote: { receivedAt: '2026-03-05T08:20', amount: 24_900_000, ccy: 'USD', incoterm: 'FCA', origin: 'Kanazawa, JP', validityDays: 120, leadTimeWeeks: 34, page: 4 } }],
  ]),
  ...send('P-01', '2026-02-10T16:00', QU_EXT_TBM, [
    ['taihu-shield', { openedAt: '2026-02-11T05:40', acknowledgedAt: '2026-02-15T06:10' }],
  ]),
  // P-02: three compliant quotes
  ...send('P-02', '2026-02-10T16:10', QU_DUE_5, [
    ['wafra-segments', { openedAt: '2026-02-10T16:30', acknowledgedAt: '2026-02-11T08:15',
      quote: { receivedAt: '2026-03-03T10:00', amount: 5_480_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 14, page: 2 } }],
    ['sulaibiya-precast', { openedAt: '2026-02-11T09:40', acknowledgedAt: '2026-02-12T10:00',
      quote: { receivedAt: '2026-03-04T14:10', amount: 5_730_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 16, page: 2 } }],
    ['kabd-precast', { openedAt: '2026-02-11T08:20', acknowledgedAt: '2026-02-11T12:30',
      quote: { receivedAt: '2026-03-05T12:40', amount: 5_560_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 15, page: 3 } }],
  ]),
  // P-03: three compliant quotes
  ...send('P-03', '2026-02-10T16:15', QU_DUE_5, [
    ['failaka-grouting', { openedAt: '2026-02-11T08:00', acknowledgedAt: '2026-02-11T09:30',
      quote: { receivedAt: '2026-03-03T13:20', amount: 1_120_000, ccy: 'KWD', validityDays: 120, page: 2 } }],
    ['ticino-injection', { openedAt: '2026-02-11T10:10', acknowledgedAt: '2026-02-12T09:00',
      quote: { receivedAt: '2026-03-05T10:00', amount: 3_450_000, ccy: 'EUR', validityDays: 120, page: 3, seededDecisions: { currency: 'confirmed' } } }],
    ['kazma-micro', { openedAt: '2026-02-10T17:20', acknowledgedAt: '2026-02-11T08:40',
      quote: { receivedAt: '2026-03-04T09:30', amount: 1_180_000, ccy: 'KWD', validityDays: 120, page: 2 } }],
  ]),
  // P-04: not yet due
  ...send('P-04', '2026-02-10T16:20', QU_DUE_10, [
    ['kazma-micro', { openedAt: '2026-02-10T17:22', acknowledgedAt: '2026-02-11T08:42' }],
    ['khiran-ground', { openedAt: '2026-02-11T08:50', acknowledgedAt: '2026-02-12T11:15' }],
    ['subiya-foundations', { openedAt: '2026-02-15T10:00' }],
  ]),
  // P-05: two quotes to level; Fahaheel extended and overdue
  ...send('P-05', '2026-02-10T16:25', QU_DUE_5, [
    ['ventalba-vent', { openedAt: '2026-02-11T09:00', acknowledgedAt: '2026-02-12T08:30',
      quote: { receivedAt: '2026-03-05T11:50', amount: 2_540_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 18, exclusions: ['Commissioning spares excluded'], page: 3 } }],
    ['rhone-ventilation', { openedAt: '2026-02-11T10:20', acknowledgedAt: '2026-02-15T09:10',
      quote: { receivedAt: '2026-03-04T16:30', amount: 2_610_000, ccy: 'EUR', validityDays: 90, leadTimeWeeks: 20, page: 2 } }],
  ]),
  ...send('P-05', '2026-02-10T16:25', QU_EXT_VENT, [
    ['fahaheel-air', { openedAt: '2026-02-16T12:00', acknowledgedAt: '2026-02-19T10:00' }],
  ]),
  // P-06: three compliant quotes (Bubiyan late)
  ...send('P-06', '2026-02-10T16:30', QU_DUE_5, [
    ['bubiyan-composite', { openedAt: '2026-02-11T08:30', acknowledgedAt: '2026-02-12T09:20',
      quote: { receivedAt: '2026-03-06T11:00', amount: 4_210_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 12, page: 2 } }],
    ['mutla-steel', { openedAt: '2026-02-10T17:00', acknowledgedAt: '2026-02-11T08:05',
      quote: { receivedAt: '2026-03-03T15:40', amount: 4_390_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 14, page: 2 } }],
    ['mina-pipe', { openedAt: '2026-02-11T09:15', acknowledgedAt: '2026-02-11T13:00',
      quote: { receivedAt: '2026-03-05T09:10', amount: 4_260_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 12, page: 3 } }],
  ]),
  // P-07: three compliant quotes; Garda held on the shortlist
  ...send('P-07', '2026-02-10T16:35', QU_DUE_5, [
    ['salmiya-valve', { openedAt: '2026-02-11T08:10', acknowledgedAt: '2026-02-11T10:30',
      quote: { receivedAt: '2026-03-04T10:20', amount: 1_020_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 16, page: 2 } }],
    ['ardiya-valve', { openedAt: '2026-02-11T09:05', acknowledgedAt: '2026-02-12T08:45',
      quote: { receivedAt: '2026-03-05T13:30', amount: 1_070_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 14, page: 2 } }],
    ['tyrol-armaturen', { openedAt: '2026-02-11T09:50', acknowledgedAt: '2026-02-12T10:40',
      quote: { receivedAt: '2026-03-04T15:00', amount: 3_110_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 18, page: 3, seededDecisions: { currency: 'confirmed' } } }],
  ]),
  // P-08: two compliant quotes, one decline
  ...send('P-08', '2026-02-10T16:40', QU_DUE_5, [
    ['mangaf-pumps', { openedAt: '2026-02-11T08:25', acknowledgedAt: '2026-02-11T11:00',
      quote: { receivedAt: '2026-03-04T12:00', amount: 2_590_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 20, page: 2 } }],
    ['shuwaikh-water', { openedAt: '2026-02-11T10:40', acknowledgedAt: '2026-02-12T09:30',
      quote: { receivedAt: '2026-03-05T14:50', amount: 2_720_000, ccy: 'KWD', validityDays: 120, leadTimeWeeks: 22, page: 3 } }],
    ['gulf-process', { openedAt: '2026-02-11T11:30', declined: { at: '2026-03-03T09:40', reason: 'The duty is above our pump range for this station' } }],
  ]),
  // P-09: three compliant quotes (Abdali late)
  ...send('P-09', '2026-02-10T16:45', QU_DUE_5, [
    ['abdali-cp', { openedAt: '2026-02-11T09:30', acknowledgedAt: '2026-02-12T10:00',
      quote: { receivedAt: '2026-03-08T08:30', amount: 470_000, ccy: 'KWD', validityDays: 120, page: 2 } }],
    ['salmi-corrosion', { openedAt: '2026-02-11T10:00', acknowledgedAt: '2026-02-11T14:20',
      quote: { receivedAt: '2026-03-04T11:30', amount: 495_000, ccy: 'KWD', validityDays: 120, page: 2 } }],
    ['adriatic-cp', { openedAt: '2026-02-11T11:10', acknowledgedAt: '2026-02-12T09:50',
      quote: { receivedAt: '2026-03-05T10:40', amount: 1_430_000, ccy: 'EUR', validityDays: 120, page: 2, seededDecisions: { currency: 'confirmed' } } }],
  ]),
  // P-10 to P-12: not yet due
  ...send('P-10', '2026-02-10T16:50', QU_DUE_10, [
    ['rai-electrical', { openedAt: '2026-02-11T08:40', acknowledgedAt: '2026-02-12T09:10' }],
    ['qurtuba-power', { openedAt: '2026-02-11T09:20', acknowledgedAt: '2026-02-11T15:00' }],
    ['nuwaiseeb-electrical', { openedAt: '2026-02-16T08:30' }],
  ]),
  ...send('P-11', '2026-02-10T16:55', QU_DUE_10, [
    ['qurtuba-power', { openedAt: '2026-02-11T09:22', acknowledgedAt: '2026-02-11T15:02' }],
    ['mishref-controls', { openedAt: '2026-02-11T08:55', acknowledgedAt: '2026-02-11T10:10' }],
    ['rai-electrical', { openedAt: '2026-02-11T08:42' }],
  ]),
  ...send('P-12', '2026-02-10T17:00', QU_DUE_10, [
    ['kazma-micro', { openedAt: '2026-02-10T17:24', acknowledgedAt: '2026-02-11T08:44' }],
    ['khiran-ground', { openedAt: '2026-02-11T08:52' }],
    ['subiya-foundations', { openedAt: '2026-02-15T10:02', acknowledgedAt: '2026-02-17T09:30' }],
  ]),
];

const SL_058 = '2026-02-10T15:10';

export const QURAIN_T058: S2Tender = {
  tenant: 'qurain',
  tenderId: T058,
  packages: packages('qurain', T058, 'KWD', P058),
  // Packages, self-performed work and the one scope nobody in the master offers: exactly KWD 46,000,000.
  boq: boq(T058, 'KWD', [
    ['B-01', 'General and preliminaries', 4_600_000, 'self'],
    ['B-02', 'Tunnel boring operation and spoil handling', 5_900_000, 'self'],
    ['B-03', 'Shaft fit-out and civil works', 1_888_000, 'self'],
    ...packageBoq(P058, 4),
    ['B-16', 'Diversion of live sewer flows at the existing pumping station', 1_012_000, 'not-covered'],
  ]),
  packagingApproved: { at: '2026-02-10T13:30', byId: QU_PROC },
  shortlists: {
    'P-01': { supplierIds: ['rheintal-tbm', 'hokuriku-shield', 'taihu-shield'], at: SL_058, byId: QU_PROC },
    'P-02': { supplierIds: ['wafra-segments', 'sulaibiya-precast', 'kabd-precast'], at: SL_058, byId: QU_PROC },
    'P-03': { supplierIds: ['failaka-grouting', 'ticino-injection', 'kazma-micro'], at: SL_058, byId: QU_PROC },
    'P-04': { supplierIds: ['kazma-micro', 'khiran-ground', 'subiya-foundations'], at: SL_058, byId: QU_PROC },
    'P-05': { supplierIds: ['ventalba-vent', 'rhone-ventilation', 'fahaheel-air'], at: SL_058, byId: QU_PROC },
    'P-06': { supplierIds: ['bubiyan-composite', 'mutla-steel', 'mina-pipe'], at: SL_058, byId: QU_PROC },
    'P-07': { supplierIds: ['salmiya-valve', 'ardiya-valve', 'tyrol-armaturen', 'garda-valvole'], at: SL_058, byId: QU_PROC },
    'P-08': { supplierIds: ['mangaf-pumps', 'shuwaikh-water', 'gulf-process'], at: SL_058, byId: QU_PROC },
    'P-09': { supplierIds: ['abdali-cp', 'salmi-corrosion', 'adriatic-cp'], at: SL_058, byId: QU_PROC },
    'P-10': { supplierIds: ['rai-electrical', 'qurtuba-power', 'nuwaiseeb-electrical'], at: SL_058, byId: QU_PROC },
    'P-11': { supplierIds: ['qurtuba-power', 'mishref-controls', 'rai-electrical'], at: SL_058, byId: QU_PROC },
    'P-12': { supplierIds: ['kazma-micro', 'khiran-ground', 'subiya-foundations'], at: SL_058, byId: QU_PROC },
  },
  ...rfqs(T058, R058, levelOf(P058)),
  clarifications: [
    { id: 'CL-058-01', tenderId: T058, packageId: 'P-01', supplierId: 'rheintal-tbm', commercial: false, ownerId: QU_BID,
      question: 'Is the geotechnical baseline report contractual, and which ground class governs the cutterhead design?',
      raisedAt: '2026-03-05T10:00', due: '2026-03-10T10:00' },
    { id: 'CL-058-02', tenderId: T058, packageId: 'P-04', supplierId: 'khiran-ground', commercial: false, ownerId: QU_BID,
      question: 'Please confirm the diaphragm wall toe level at shaft S3: the drawing and the schedule differ.',
      raisedAt: '2026-03-08T08:30', due: '2026-03-11T08:30' },
    { id: 'CL-058-03', tenderId: T058, packageId: 'P-07', supplierId: 'tyrol-armaturen', commercial: true, ownerId: QU_PROC,
      question: 'Will you accept a letter of credit at sight instead of the monthly payment terms?',
      raisedAt: '2026-03-05T15:00', due: '2026-03-10T15:00' },
    { id: 'CL-058-04', tenderId: T058, packageId: 'P-02', supplierId: 'wafra-segments', commercial: false, ownerId: QU_BID,
      question: 'Is the segment design life 100 years, as the specification states, or 50 years, as the design basis states?',
      raisedAt: '2026-02-18T09:00', due: '2026-02-23T09:00',
      answer: { text: '100 years. The design basis is corrected by Addendum 2.', at: '2026-02-19T12:10', byId: QU_BID } },
  ],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 45 days of invoice; an advance of up to 10% against an advance payment guarantee; 10% retention until taking over.',
  documents: DOCUMENTS,
};

// ===========================================================================
// Qurain · T-2026-062 Northern Kuwait water transmission mains (KWD 38 M)
// DG1 pursue Mon 16 Feb 10:45. Packaging approved 12:30, shortlists 14:40,
// 30 RFQs sent 15:40–16:30. Replies due Thu 12 Mar: none due yet.

const T062 = 'T-2026-062';
const D062 = 'NWGP-NKM';

const P062: PackageInput[] = [
  { id: 'P-01', title: 'Transmission pipes DN1600', kind: 'supply', value: 11_200_000, trades: ['pipes', 'grp'], quoteLevel: 'line', lineCount: 5, lcRelevant: true, needByWeeks: 14,
    lines: lines([
      ['2.01', 'Transmission pipe DN1600, steel with cement mortar lining, or GRP PN16', 'm', 41_000],
      ['2.03', 'Bends, tees and specials DN1600', 'nr', 310],
    ]),
    scope: 'Supply of the DN1600 transmission pipes and specials, delivered along the corridor in the laying sequence.',
    specRef: 'Specification, Section 2: pipes and fittings', drawings: [`${D062}-P-101`, `${D062}-P-102`] },
  { id: 'P-02', title: 'Valves', kind: 'supply', value: 2_300_000, trades: ['valves'], quoteLevel: 'line', lineCount: 6,
    lines: lines([
      ['3.01', 'Butterfly valves DN1600, electrically actuated', 'nr', 18],
      ['3.03', 'Double-orifice air valves DN250', 'nr', 84],
    ]),
    scope: 'Supply of line, air and washout valves, delivered to site.',
    specRef: 'Specification, Section 3: valves', drawings: [`${D062}-P-103`] },
  { id: 'P-03', title: 'Pump stations, mechanical', kind: 'supply', value: 3_600_000, trades: ['pumps', 'process-mech'], quoteLevel: 'line', lineCount: 6, selfInstall: true,
    lines: lines([
      ['4.01', 'Horizontal split-case pumps, 1,250 kW, with motors', 'nr', 6],
      ['4.03', 'Station pipework, valves and overhead cranes', 'set', 2],
    ]),
    scope: 'Supply of the pumping units, station pipework and cranes for two booster stations, with installation supervision and commissioning.',
    specRef: 'Specification, Section 4: pump stations', drawings: [`${D062}-M-201`] },
  { id: 'P-04', title: 'Surge protection', kind: 'supply', value: 780_000, trades: ['surge'], quoteLevel: 'package', lineCount: 3, selfInstall: true,
    lines: lines([
      ['4.08', 'Surge vessels, 80 m3, with compressors', 'nr', 4],
      ['4.10', 'Surge analysis and protection design', 'item', 1],
    ]),
    scope: 'Surge analysis of the transmission system and supply of the surge vessels, with commissioning.',
    specRef: 'Specification, Section 4.6: surge protection', drawings: [`${D062}-M-203`] },
  { id: 'P-05', title: 'Cathodic protection', kind: 'subcontract', value: 640_000, trades: ['cathodic'], quoteLevel: 'package', lineCount: 3,
    lines: lines([
      ['5.01', 'Impressed-current cathodic protection for the steel sections', 'km', 41],
      ['5.03', 'Test posts', 'nr', 130],
    ]),
    scope: 'Design, supply, installation and commissioning of cathodic protection along the mains.',
    specRef: 'Specification, Section 5: cathodic protection', drawings: [`${D062}-E-310`] },
  { id: 'P-06', title: 'SCADA and telemetry', kind: 'subcontract', value: 1_050_000, trades: ['ica'], quoteLevel: 'line', lineCount: 4,
    lines: lines([
      ['6.01', 'Remote terminal units at valve chambers and pump stations', 'nr', 30],
      ['6.03', 'SCADA master station and software', 'item', 1],
    ]),
    scope: 'Supply, installation and commissioning of the SCADA and telemetry.',
    specRef: 'Specification, Section 6: SCADA', drawings: [`${D062}-I-401`] },
  { id: 'P-07', title: 'Electrical works', kind: 'subcontract', value: 2_100_000, trades: ['hv', 'lv'], quoteLevel: 'line', lineCount: 5,
    lines: lines([
      ['7.01', '11/3.3 kV pump station substations', 'nr', 2],
      ['7.04', 'MV and LV switchgear and cabling', 'set', 2],
    ]),
    scope: 'Supply, installation and testing of the pump station substations, switchgear and cabling.',
    specRef: 'Specification, Section 7: electrical works', drawings: [`${D062}-E-301`] },
  { id: 'P-08', title: 'Trenchless road crossings', kind: 'subcontract', value: 1_900_000, trades: ['trenchless'], quoteLevel: 'line', lineCount: 3,
    lines: lines([
      ['8.01', 'Microtunnelled road crossings, DN2000 sleeve', 'm', 520],
    ]),
    scope: 'Microtunnelled crossings of the motorway and two main roads, including shafts and sleeves.',
    specRef: 'Specification, Section 8: crossings', drawings: [`${D062}-P-110`] },
  { id: 'P-09', title: 'Testing and disinfection', kind: 'subcontract', value: 420_000, trades: ['testing'], quoteLevel: 'package', lineCount: 2,
    lines: lines([
      ['9.01', 'Hydrostatic testing of the mains, in sections', 'm', 41_000],
      ['9.02', 'Flushing and disinfection, with sampling', 'item', 1],
    ]),
    scope: 'Hydrostatic testing, flushing and disinfection of the mains, with laboratory sampling.',
    specRef: 'Specification, Section 9: testing and commissioning', drawings: [`${D062}-P-120`] },
  { id: 'P-10', title: 'Precast valve chambers', kind: 'supply', value: 1_150_000, trades: ['precast'], quoteLevel: 'line', lineCount: 3, lcRelevant: true,
    lines: lines([
      ['3.08', 'Precast valve and air valve chambers, with covers', 'nr', 102],
    ]),
    scope: 'Supply of precast valve chambers with covers, delivered along the corridor.',
    specRef: 'Specification, Section 3.5: chambers', drawings: [`${D062}-S-130`] },
];

const DUE_062: Reply = { replyBy: '2026-03-12T17:00' };

const R062: RfqRow[] = [
  ...send('P-01', '2026-02-16T15:40', DUE_062, [
    ['mutla-steel', { openedAt: '2026-02-16T16:10', acknowledgedAt: '2026-02-17T08:20' }],
    ['mina-pipe', { openedAt: '2026-02-17T09:00', acknowledgedAt: '2026-02-17T12:40' }],
    ['bubiyan-composite', { openedAt: '2026-02-17T08:35' }],
  ]),
  ...send('P-02', '2026-02-16T15:45', DUE_062, [
    ['salmiya-valve', { openedAt: '2026-02-17T08:15', acknowledgedAt: '2026-02-17T10:00' }],
    ['ardiya-valve', { openedAt: '2026-02-17T09:10' }],
    ['tyrol-armaturen', { openedAt: '2026-02-17T09:55', acknowledgedAt: '2026-02-18T08:30' }],
  ]),
  ...send('P-03', '2026-02-16T15:50', DUE_062, [
    ['gulf-process', { openedAt: '2026-02-17T11:30', acknowledgedAt: '2026-02-18T09:40' }],
    ['mangaf-pumps', { openedAt: '2026-02-17T08:30', acknowledgedAt: '2026-02-17T11:05' }],
    ['shuwaikh-water', { openedAt: '2026-02-17T10:45' }],
  ]),
  ...send('P-04', '2026-02-16T15:55', DUE_062, [
    ['danube-surge', { openedAt: '2026-02-17T09:20', acknowledgedAt: '2026-02-18T10:15' }],
    ['mangaf-pumps', { openedAt: '2026-02-17T08:32' }],
    ['gulf-process', { openedAt: '2026-02-17T11:32' }],
  ]),
  ...send('P-05', '2026-02-16T16:00', DUE_062, [
    ['abdali-cp', { openedAt: '2026-02-17T09:35', acknowledgedAt: '2026-02-18T10:05' }],
    ['salmi-corrosion', { openedAt: '2026-02-17T10:05' }],
    ['adriatic-cp', { openedAt: '2026-02-17T11:15', acknowledgedAt: '2026-02-18T09:55' }],
  ]),
  ...send('P-06', '2026-02-16T16:05', DUE_062, [
    ['qurtuba-power', { openedAt: '2026-02-17T09:25', acknowledgedAt: '2026-02-17T15:10' }],
    ['mishref-controls', { openedAt: '2026-02-17T09:00', acknowledgedAt: '2026-02-17T10:15' }],
    ['rai-electrical'],
  ]),
  ...send('P-07', '2026-02-16T16:10', DUE_062, [
    ['rai-electrical', { openedAt: '2026-02-17T08:45' }],
    ['qurtuba-power', { openedAt: '2026-02-17T09:27', acknowledgedAt: '2026-02-17T15:12' }],
    ['nuwaiseeb-electrical', { openedAt: '2026-02-19T08:30' }],
  ]),
  ...send('P-08', '2026-02-16T16:15', DUE_062, [
    ['kazma-micro', { openedAt: '2026-02-16T17:00', acknowledgedAt: '2026-02-17T08:50' }],
    ['khiran-ground', { openedAt: '2026-02-17T08:55', acknowledgedAt: '2026-02-18T11:20' }],
    ['subiya-foundations'],
  ]),
  ...send('P-09', '2026-02-16T16:20', DUE_062, [
    ['salmi-corrosion', { openedAt: '2026-02-17T10:07', acknowledgedAt: '2026-02-17T14:30' }],
    ['sulaibikhat-pipeline', { openedAt: '2026-02-17T08:40', acknowledgedAt: '2026-02-17T09:30' }],
    ['abdali-cp', { openedAt: '2026-02-17T09:37' }],
  ]),
  ...send('P-10', '2026-02-16T16:30', DUE_062, [
    ['sulaibiya-precast', { openedAt: '2026-02-17T09:45' }],
    ['kabd-precast', { openedAt: '2026-02-17T08:25', acknowledgedAt: '2026-02-17T12:35' }],
    ['wafra-segments', { openedAt: '2026-02-16T17:10', acknowledgedAt: '2026-02-17T08:20' }],
  ]),
];

const SL_062 = '2026-02-16T14:40';

export const QURAIN_T062: S2Tender = {
  tenant: 'qurain',
  tenderId: T062,
  packages: packages('qurain', T062, 'KWD', P062),
  // Packages and self-performed work: exactly KWD 38,000,000, with nothing uncovered.
  boq: boq(T062, 'KWD', [
    ['B-01', 'General and preliminaries', 3_800_000, 'self'],
    ['B-02', 'Pipe laying: excavation, bedding, laying and backfill', 7_260_000, 'self'],
    ['B-03', 'Pump station civil works', 1_800_000, 'self'],
    ...packageBoq(P062, 4),
  ]),
  packagingApproved: { at: '2026-02-16T12:30', byId: QU_PROC },
  shortlists: {
    'P-01': { supplierIds: ['mutla-steel', 'mina-pipe', 'bubiyan-composite'], at: SL_062, byId: QU_PROC },
    'P-02': { supplierIds: ['salmiya-valve', 'ardiya-valve', 'tyrol-armaturen', 'garda-valvole'], at: SL_062, byId: QU_PROC },
    'P-03': { supplierIds: ['gulf-process', 'mangaf-pumps', 'shuwaikh-water'], at: SL_062, byId: QU_PROC },
    'P-04': { supplierIds: ['danube-surge', 'mangaf-pumps', 'gulf-process'], at: SL_062, byId: QU_PROC },
    'P-05': { supplierIds: ['abdali-cp', 'salmi-corrosion', 'adriatic-cp'], at: SL_062, byId: QU_PROC },
    'P-06': { supplierIds: ['qurtuba-power', 'mishref-controls', 'rai-electrical'], at: SL_062, byId: QU_PROC },
    'P-07': { supplierIds: ['rai-electrical', 'qurtuba-power', 'nuwaiseeb-electrical'], at: SL_062, byId: QU_PROC },
    'P-08': { supplierIds: ['kazma-micro', 'khiran-ground', 'subiya-foundations'], at: SL_062, byId: QU_PROC },
    'P-09': { supplierIds: ['salmi-corrosion', 'sulaibikhat-pipeline', 'abdali-cp'], at: SL_062, byId: QU_PROC },
    'P-10': { supplierIds: ['sulaibiya-precast', 'kabd-precast', 'wafra-segments'], at: SL_062, byId: QU_PROC },
  },
  ...rfqs(T062, R062, levelOf(P062)),
  clarifications: [
    { id: 'CL-062-01', tenderId: T062, packageId: 'P-01', supplierId: 'mutla-steel', commercial: false, ownerId: QU_BID,
      question: 'For the steel option, is the internal lining cement mortar or epoxy? The specification allows both.',
      raisedAt: '2026-03-04T13:00', due: '2026-03-09T13:00' },
  ],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 45 days of invoice; an advance of up to 10% against an advance payment guarantee; 10% retention until taking over.',
  documents: DOCUMENTS,
};

export const CORNICHE_S2: S2Tender[] = [CORNICHE_T044];
export const DAFNA_S2: S2Tender[] = [DAFNA_T019];
export const BATINAH_S2: S2Tender[] = [BATINAH_T027];
export const QURAIN_S2: S2Tender[] = [QURAIN_T058, QURAIN_T062];
