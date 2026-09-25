import type { S2Tender } from '../types';
import { boq, packages, rfqs, type PackageInput, type RfqRow } from './build';

/**
 * Najd's live Stage 2 tenders (gcc-demo-data §5.1, §5.3). Seeded so that on
 * Sun 8 Mar 2026 at 10:00 AST the rules derive:
 * - T-2026-104: 7 of 11 packages covered; 33 RFQs, 31 due, 22 answered on
 *   time (71%); 4 overdue (2 escalated); 5 quotes to level; 4 open
 *   clarifications, none stale; 3.1% not covered.
 * - T-2026-109: 9 packages, 27 RFQs sent 22 h 45 m after the DG1 pursue;
 *   replies due Sun 15 Mar; 2 open clarifications.
 *
 * Reply windows were set by the Procurement Lead, shorter than the 10-working-day
 * default because both bids are due within ten weeks.
 */

const PROC = 'najd.proc';
const BID = 'najd.bid';

// ===========================================================================
// T-2026-104 Jubail industrial wastewater treatment upgrade (SAR 175 M)
// DG1 pursue Thu 26 Feb 09:50. Packaging approved 12:30, shortlists 13:30,
// RFQs sent 14:10–16:40, with replies due Thu 5 Mar 17:00. P-03 and P-04 were
// extended to Sun 8 Mar 09:00 after the capacity question (VAL-104-1), and
// two of their suppliers to Tue 10 Mar.

const T104 = 'T-2026-104';
const D104 = 'GCIU-104';

const P104: PackageInput[] = [
  { id: 'P-01', title: 'Piling and dewatering', kind: 'subcontract', value: 5_250_000, trades: ['piling'], quoteLevel: 'line', lineCount: 7,
    lines: [
      { item: '11.01', description: 'Bored cast-in-place piles, 600 mm diameter, average length 16 m', unit: 'nr', qty: 820 },
      { item: '11.04', description: 'Deep-well dewatering, installed, operated and removed', unit: 'month', qty: 10 },
      { item: '11.06', description: 'Temporary steel sheet-pile shoring, installed and extracted', unit: 'm2', qty: 6_400 },
    ],
    scope: 'Bored piles, dewatering and temporary shoring for the new tanks and the dewatering building, next to the operating plant.',
    specRef: 'Specification, Section 02: piling and ground works', drawings: [`${D104}-C-101`, `${D104}-C-104`, `${D104}-G-002`] },
  { id: 'P-02', title: 'Process mechanical equipment', kind: 'supply', value: 21_900_000, trades: ['process-mech'], quoteLevel: 'line', lineCount: 26,
    selfInstall: true, longLeadWeeks: 40, needByWeeks: 28, avlRequired: true,
    lines: [
      { item: '3.02', description: 'Coarse and fine screens with washer-compactors', unit: 'nr', qty: 4 },
      { item: '3.05', description: 'Grit and grease removal units', unit: 'nr', qty: 2 },
      { item: '3.09', description: 'Aeration blowers, high-speed turbo type, 450 kW, with enclosures', unit: 'nr', qty: 4 },
      { item: '3.13', description: 'Fine-bubble membrane diffusers with pipework grids', unit: 'nr', qty: 14_400 },
      { item: '3.18', description: 'Clarifier scraper mechanisms, 40 m diameter', unit: 'nr', qty: 4 },
      { item: '3.22', description: 'Return and waste activated sludge pumps, with variable speed drives', unit: 'nr', qty: 8 },
    ],
    note: 'Blowers and clarifier mechanisms set the lead time; installed by Najd',
    scope: 'Supply of the inlet works, aeration and clarifier equipment, delivered to site, with installation supervision and commissioning. Installation is by the contractor.',
    specRef: 'Specification, Section 11: process mechanical equipment', drawings: [`${D104}-M-201`, `${D104}-M-202`, `${D104}-M-205`] },
  { id: 'P-03', title: 'Dissolved-air flotation and tertiary filters', kind: 'supply', value: 9_600_000, trades: ['filtration'], quoteLevel: 'line', lineCount: 12,
    selfInstall: true, needByWeeks: 30, avlRequired: true,
    lines: [
      { item: '4.02', description: 'Dissolved-air flotation units, 900 m3/h each', unit: 'nr', qty: 3 },
      { item: '4.05', description: 'Cloth disc filters, 1,200 m3/h each, with backwash system', unit: 'nr', qty: 4 },
      { item: '4.08', description: 'Filter backwash pumps', unit: 'nr', qty: 4 },
    ],
    scope: 'Supply of the flotation units and tertiary filters, delivered to site, with installation supervision and commissioning.',
    specRef: 'Specification, Section 12: tertiary treatment', drawings: [`${D104}-M-203`] },
  { id: 'P-04', title: 'Sludge thickening and dewatering', kind: 'supply', value: 7_900_000, trades: ['sludge'], quoteLevel: 'line', lineCount: 13,
    selfInstall: true, needByWeeks: 30, avlRequired: true,
    lines: [
      { item: '5.02', description: 'Gravity belt thickeners, 40 m3/h', unit: 'nr', qty: 3 },
      { item: '5.04', description: 'Dewatering centrifuges, total capacity 120 or 150 m3/h (both to be priced)', unit: 'nr', qty: 3 },
      { item: '5.07', description: 'Polymer preparation and dosing units', unit: 'nr', qty: 2 },
      { item: '5.10', description: 'Dewatered cake silo, 150 m3, with truck loading', unit: 'nr', qty: 1 },
    ],
    note: 'Capacity to be confirmed: 120 or 150 m³/h, validation VAL-104-1 open',
    scope: 'Supply of the sludge thickening and dewatering line, delivered to site, with installation supervision and commissioning. Price the centrifuges at 120 m3/h and at 150 m3/h total capacity: the client is confirming which applies.',
    specRef: 'Specification, Section 13: sludge treatment', drawings: [`${D104}-M-204`] },
  { id: 'P-05', title: 'Odour control', kind: 'subcontract', value: 3_500_000, trades: ['odour'], quoteLevel: 'package', lineCount: 8,
    lines: [
      { item: '6.02', description: 'Biotrickling filter odour control units, 30,000 m3/h', unit: 'nr', qty: 2 },
      { item: '6.04', description: 'Activated carbon polishing units', unit: 'nr', qty: 2 },
      { item: '6.06', description: 'GRP odour extraction ductwork, DN300–DN900', unit: 'm', qty: 1_200 },
    ],
    scope: 'Design, supply, installation and commissioning of odour control for the inlet works and the sludge building.',
    specRef: 'Specification, Section 14: odour control', drawings: [`${D104}-M-206`] },
  { id: 'P-06', title: '33/11 kV substation and transformers', kind: 'subcontract', value: 11_400_000, trades: ['hv'], quoteLevel: 'line', lineCount: 5,
    longLeadWeeks: 36, needByWeeks: 40, avlRequired: true,
    lines: [
      { item: '7.01', description: '33/11 kV gas-insulated substation, with protection and control', unit: 'item', qty: 1 },
      { item: '7.03', description: 'Power transformers 33/11 kV, 16 MVA, ONAN', unit: 'nr', qty: 2 },
    ],
    note: 'Transformers are the long-lead item',
    scope: 'Design, supply, installation, testing and energisation of the 33/11 kV substation and the two power transformers.',
    specRef: 'Specification, Section 16: HV works', drawings: [`${D104}-E-301`, `${D104}-E-302`] },
  { id: 'P-07', title: 'LV distribution and MCCs', kind: 'subcontract', value: 7_000_000, trades: ['lv'], quoteLevel: 'line', lineCount: 21, lcRelevant: true,
    lines: [
      { item: '7.08', description: 'Distribution transformers 11/0.4 kV, 1,600 kVA', unit: 'nr', qty: 4 },
      { item: '7.12', description: 'Motor control centres, form 4b, with variable speed drive sections', unit: 'nr', qty: 10 },
      { item: '7.18', description: 'LV power and control cables, XLPE/SWA', unit: 'm', qty: 64_000 },
    ],
    scope: 'Supply, installation and testing of LV distribution, motor control centres and cabling.',
    specRef: 'Specification, Section 16: LV works', drawings: [`${D104}-E-303`] },
  { id: 'P-08', title: 'Instrumentation, control and SCADA', kind: 'subcontract', value: 6_100_000, trades: ['ica'], quoteLevel: 'line', lineCount: 16,
    lines: [
      { item: '8.02', description: 'Electromagnetic flowmeters, DN150–DN900', unit: 'nr', qty: 26 },
      { item: '8.05', description: 'Online analysers: DO, ammonium, nitrate, TSS, turbidity', unit: 'nr', qty: 40 },
      { item: '8.09', description: 'PLC control panels with redundant processors', unit: 'nr', qty: 8 },
      { item: '8.14', description: 'SCADA servers, workstations and software, with DNP3 interfaces', unit: 'item', qty: 1 },
    ],
    note: 'Integration with the existing plant control system is outside the package and not covered',
    scope: 'Supply, installation, configuration and commissioning of instruments, PLCs and the plant SCADA, with open DNP3 interfaces.',
    specRef: 'Specification, Section 17: instrumentation and control', drawings: [`${D104}-I-401`, `${D104}-I-402`] },
  { id: 'P-09', title: 'Pipes and valves', kind: 'supply', value: 8_750_000, trades: ['pipes', 'valves'], quoteLevel: 'line', lineCount: 17, lcRelevant: true,
    lines: [
      { item: '9.03', description: 'Ductile iron pipes and fittings, DN200–DN1000', unit: 'm', qty: 4_800 },
      { item: '9.07', description: 'Butterfly and gate valves, DN200–DN1000', unit: 'nr', qty: 72 },
      { item: '9.11', description: 'Stainless steel penstocks', unit: 'nr', qty: 36 },
    ],
    scope: 'Supply of yard pipework, valves and penstocks, delivered to site.',
    specRef: 'Specification, Section 15: pipework and valves', drawings: [`${D104}-C-109`] },
  { id: 'P-10', title: 'Chemical dosing', kind: 'supply', value: 4_400_000, trades: ['chem-dosing'], quoteLevel: 'package', lineCount: 9, selfInstall: true,
    lines: [
      { item: '10.02', description: 'Ferric chloride dosing and storage system', unit: 'item', qty: 1 },
      { item: '10.04', description: 'Polyelectrolyte dosing system', unit: 'item', qty: 1 },
      { item: '10.06', description: 'Sodium hypochlorite dosing and storage system', unit: 'item', qty: 1 },
    ],
    scope: 'Supply of the chemical dosing systems, delivered to site, with commissioning.',
    specRef: 'Specification, Section 18: chemical dosing', drawings: [`${D104}-M-207`] },
  { id: 'P-11', title: 'Steel structures and covers', kind: 'subcontract', value: 5_250_000, trades: ['steel'], quoteLevel: 'line', lineCount: 11,
    lines: [
      { item: '12.02', description: 'Structural steel platforms and walkways, galvanised', unit: 't', qty: 420 },
      { item: '12.05', description: 'GRP covers for tanks and channels', unit: 'm2', qty: 5_600 },
      { item: '12.08', description: 'Handrails, stairs and ladders', unit: 'm', qty: 2_100 },
    ],
    scope: 'Fabrication, supply and erection of steel platforms, walkways, covers and handrails.',
    specRef: 'Specification, Section 05: metalwork', drawings: [`${D104}-S-110`] },
];

// Replies (plan 008a §3.1.3). Late replies: Sadeem, Odrana, Hafar, Sudair, Ula.
const SENT = '2026-02-26T';
const DUE_5 = '2026-03-05T17:00';
const DUE_8 = '2026-03-08T09:00';
const DUE_10 = '2026-03-10T17:00';
/** Extended from the reply date as issued. */
const EXT_8 = { replyBy: DUE_8, extendedFrom: DUE_5 };
const EXT_10 = { replyBy: DUE_10, extendedFrom: DUE_5 };

const R104: RfqRow[] = [
  // P-01 Piling: three compliant quotes
  { pkg: 'P-01', sup: 'rasikh', sentAt: `${SENT}14:10`, replyBy: DUE_5, openedAt: '2026-02-26T15:02', acknowledgedAt: '2026-03-01T08:40',
    quote: { receivedAt: '2026-03-03T11:20', amount: 5_150_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 4, page: 2 } },
  { pkg: 'P-01', sup: 'sadeem', sentAt: `${SENT}14:10`, replyBy: DUE_5, openedAt: '2026-02-26T16:45', acknowledgedAt: '2026-03-01T10:05',
    quote: { receivedAt: '2026-03-07T10:05', amount: 5_000_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 5, page: 3 } },
  { pkg: 'P-01', sup: 'jibal', sentAt: `${SENT}14:10`, replyBy: DUE_5, openedAt: '2026-02-26T14:58', acknowledgedAt: '2026-02-26T17:20',
    quote: { receivedAt: '2026-03-04T15:30', amount: 5_350_000, ccy: 'SAR', validityDays: 90, leadTimeWeeks: 4, page: 2, seededDecisions: { validity: 'confirmed' } } },

  // P-02 Process mechanical: two quotes to level; Gulf Process overdue since 4 Mar, escalated
  { pkg: 'P-02', sup: 'rhein-aqua', sentAt: `${SENT}14:25`, replyBy: DUE_5, openedAt: '2026-02-26T15:40', acknowledgedAt: '2026-02-27T09:15',
    quote: { receivedAt: '2026-03-04T11:30', amount: 4_770_000, ccy: 'EUR', incoterm: 'EXW', origin: 'Duisburg, DE', validityDays: 60, leadTimeWeeks: 34, page: 4 } },
  { pkg: 'P-02', sup: 'hanseong', sentAt: `${SENT}14:25`, replyBy: DUE_5, openedAt: '2026-02-26T19:10', acknowledgedAt: '2026-03-01T07:30',
    quote: { receivedAt: '2026-03-04T16:10', amount: 5_350_000, ccy: 'USD', incoterm: 'FCA', origin: 'Busan, KR', validityDays: 120, leadTimeWeeks: 26, page: 3 } },
  { pkg: 'P-02', sup: 'gulf-process', sentAt: `${SENT}14:25`, replyBy: DUE_5, openedAt: '2026-02-26T16:30', acknowledgedAt: '2026-03-01T09:10' },

  // P-03 DAF and filters: Nordklar to level; Sahara overdue; Tamarisk extended to 10 Mar
  { pkg: 'P-03', sup: 'nordklar', sentAt: `${SENT}14:40`, ...EXT_8, openedAt: '2026-02-26T15:05', acknowledgedAt: '2026-02-27T08:50',
    quote: { receivedAt: '2026-03-05T09:40', amount: 8_980_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 24, exclusions: ['Excludes installation supervision'], page: 5 } },
  { pkg: 'P-03', sup: 'sahara-clearwater', sentAt: `${SENT}14:40`, ...EXT_8, openedAt: '2026-03-01T11:20', acknowledgedAt: '2026-03-02T10:00' },
  { pkg: 'P-03', sup: 'tamarisk', sentAt: `${SENT}14:40`, ...EXT_10, openedAt: '2026-02-26T15:30', acknowledgedAt: '2026-03-01T09:00' },

  // P-04 Sludge: Castellan to level; Gulf Process overdue; Salwa extended to 10 Mar
  { pkg: 'P-04', sup: 'castellan', sentAt: `${SENT}14:55`, ...EXT_8, openedAt: '2026-02-26T15:20', acknowledgedAt: '2026-02-27T10:30',
    quote: { receivedAt: '2026-03-05T14:20', amount: 1_795_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 22, paymentAdvancePct: 30, page: 2 } },
  { pkg: 'P-04', sup: 'gulf-process', sentAt: `${SENT}14:55`, ...EXT_8, openedAt: '2026-02-26T16:32', acknowledgedAt: '2026-03-01T09:12' },
  { pkg: 'P-04', sup: 'salwa', sentAt: `${SENT}14:55`, ...EXT_10, openedAt: '2026-02-26T17:05', acknowledgedAt: '2026-03-01T08:15' },

  // P-05 Odour: three compliant quotes
  { pkg: 'P-05', sup: 'khuzama', sentAt: `${SENT}15:05`, replyBy: DUE_5, openedAt: '2026-02-26T15:30', acknowledgedAt: '2026-02-26T16:10',
    quote: { receivedAt: '2026-03-02T09:00', amount: 3_350_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 18, exclusions: ['Commissioning spares excluded'], page: 2,
      seededDecisions: { 'exclusion-1': 'confirmed' } } },
  { pkg: 'P-05', sup: 'salwa', sentAt: `${SENT}15:05`, replyBy: DUE_5, openedAt: '2026-02-26T17:05', acknowledgedAt: '2026-03-01T08:15',
    quote: { receivedAt: '2026-03-04T12:00', amount: 3_560_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 20, page: 3 } },
  { pkg: 'P-05', sup: 'odrana', sentAt: `${SENT}15:05`, replyBy: DUE_5, openedAt: '2026-02-27T09:40', acknowledgedAt: '2026-03-02T11:00',
    quote: { receivedAt: '2026-03-05T19:30', amount: 3_420_000, ccy: 'AED', validityDays: 120, leadTimeWeeks: 16, page: 2, seededDecisions: { currency: 'confirmed' } } },

  // P-06 Substation: Hijaz to level; Levant overdue since 4 Mar, escalated; Weser declined
  { pkg: 'P-06', sup: 'hijaz-power', sentAt: `${SENT}15:15`, replyBy: DUE_5, openedAt: '2026-02-26T15:40', acknowledgedAt: '2026-02-26T16:20',
    quote: { receivedAt: '2026-03-03T15:00', amount: 13_110_000, ccy: 'SAR', vatInclusive: true, validityDays: 120, leadTimeWeeks: 36, page: 6 } },
  { pkg: 'P-06', sup: 'levant-switchgear', sentAt: `${SENT}15:15`, replyBy: DUE_5, openedAt: '2026-02-27T12:30' },
  { pkg: 'P-06', sup: 'weser', sentAt: `${SENT}15:15`, replyBy: DUE_5, openedAt: '2026-02-26T15:50', declined: { at: '2026-03-02T10:15', reason: 'Transformer factory fully booked' } },

  // P-07 LV and MCCs: three compliant quotes
  { pkg: 'P-07', sup: 'levant-switchgear', sentAt: `${SENT}15:25`, replyBy: DUE_5, openedAt: '2026-02-27T12:32', acknowledgedAt: '2026-03-01T14:00',
    quote: { receivedAt: '2026-03-04T16:20', amount: 1_770_000, ccy: 'USD', validityDays: 120, leadTimeWeeks: 20, page: 3, seededDecisions: { currency: 'confirmed' } } },
  { pkg: 'P-07', sup: 'nafud', sentAt: `${SENT}15:25`, replyBy: DUE_5, openedAt: '2026-02-26T16:00', acknowledgedAt: '2026-02-26T16:40',
    quote: { receivedAt: '2026-03-03T10:40', amount: 7_140_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 18, page: 2 } },
  { pkg: 'P-07', sup: 'hafar-cable', sentAt: `${SENT}15:25`, replyBy: DUE_5, openedAt: '2026-02-26T15:55', acknowledgedAt: '2026-03-01T09:30',
    quote: { receivedAt: '2026-03-08T08:10', amount: 7_790_000, ccy: 'SAR', vatInclusive: true, validityDays: 120, leadTimeWeeks: 14, page: 4, seededDecisions: { vat: 'confirmed' } } },

  // P-08 ICA and SCADA: one compliant quote (Qimma), one decline, one non-compliant: accepted gap
  { pkg: 'P-08', sup: 'qimma', sentAt: `${SENT}15:30`, replyBy: DUE_5, openedAt: '2026-02-26T15:45', acknowledgedAt: '2026-02-26T16:15',
    quote: { receivedAt: '2026-03-04T10:00', amount: 5_880_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 30, page: 3 } },
  { pkg: 'P-08', sup: 'asir-telemetry', sentAt: `${SENT}15:30`, replyBy: DUE_5, openedAt: '2026-02-27T10:10', declined: { at: '2026-03-01T12:00', reason: 'No capacity until Q3' } },
  { pkg: 'P-08', sup: 'ellanby', sentAt: `${SENT}15:30`, replyBy: DUE_5, openedAt: '2026-02-26T18:20', acknowledgedAt: '2026-03-01T08:05',
    quote: { receivedAt: '2026-03-04T13:40', amount: 1_570_000, ccy: 'USD', validityDays: 120, leadTimeWeeks: 28, page: 5,
      deviations: [{ text: 'Proprietary protocol; no DNP3 interface', nonCompliant: true }],
      seededDecisions: { currency: 'confirmed', deviations: 'confirmed' } } },

  // P-09 Pipes and valves: three compliant quotes
  { pkg: 'P-09', sup: 'unaizah-valve', sentAt: `${SENT}15:35`, replyBy: DUE_5, openedAt: '2026-02-26T16:10', acknowledgedAt: '2026-03-01T08:30',
    quote: { receivedAt: '2026-03-03T09:15', amount: 8_600_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 16, page: 2 } },
  { pkg: 'P-09', sup: 'tarout', sentAt: `${SENT}15:35`, replyBy: DUE_5, openedAt: '2026-02-26T17:40', acknowledgedAt: '2026-03-01T10:20',
    quote: { receivedAt: '2026-03-04T10:50', amount: 8_390_000, ccy: 'SAR', validityDays: 90, leadTimeWeeks: 14, page: 3, seededDecisions: { validity: 'confirmed' } } },
  { pkg: 'P-09', sup: 'sudair-steel', sentAt: `${SENT}15:35`, replyBy: DUE_5, openedAt: '2026-02-26T16:30', acknowledgedAt: '2026-03-01T09:45',
    quote: { receivedAt: '2026-03-06T13:00', amount: 10_260_000, ccy: 'SAR', vatInclusive: true, validityDays: 120, leadTimeWeeks: 12, page: 4, seededDecisions: { vat: 'confirmed' } } },

  // P-10 Chemical dosing: three compliant quotes
  { pkg: 'P-10', sup: 'carthage', sentAt: `${SENT}15:40`, replyBy: DUE_5, openedAt: '2026-02-26T16:50', acknowledgedAt: '2026-03-01T11:10',
    quote: { receivedAt: '2026-03-04T11:05', amount: 1_010_000, ccy: 'EUR', validityDays: 120, leadTimeWeeks: 16, page: 2, seededDecisions: { currency: 'confirmed' } } },
  { pkg: 'P-10', sup: 'tamarisk', sentAt: `${SENT}15:40`, replyBy: DUE_5, openedAt: '2026-02-26T15:50', acknowledgedAt: '2026-03-01T09:00',
    quote: { receivedAt: '2026-03-02T15:30', amount: 4_470_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 12, page: 2 } },
  { pkg: 'P-10', sup: 'salwa', sentAt: `${SENT}15:40`, replyBy: DUE_5, openedAt: '2026-02-26T17:06', acknowledgedAt: '2026-03-01T08:16',
    quote: { receivedAt: '2026-03-03T12:20', amount: 4_300_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 14, exclusions: ['Factory tests witnessed by the client excluded'], page: 3,
      seededDecisions: { 'exclusion-1': 'rejected' } } },

  // P-11 Steel structures and covers: three compliant quotes
  { pkg: 'P-11', sup: 'shaqra-steel', sentAt: `${SENT}16:40`, replyBy: DUE_5, openedAt: '2026-02-26T16:55', acknowledgedAt: '2026-03-01T08:50',
    quote: { receivedAt: '2026-03-03T14:40', amount: 5_110_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 10, page: 2 } },
  { pkg: 'P-11', sup: 'ula-steel', sentAt: `${SENT}16:40`, replyBy: DUE_5, openedAt: '2026-02-27T08:30', acknowledgedAt: '2026-03-02T09:20',
    quote: { receivedAt: '2026-03-07T11:10', amount: 5_440_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 12, page: 2 } },
  { pkg: 'P-11', sup: 'qassim-fibreglass', sentAt: `${SENT}16:40`, replyBy: DUE_5, openedAt: '2026-02-26T17:10', acknowledgedAt: '2026-03-01T10:40',
    quote: { receivedAt: '2026-03-04T09:30', amount: 5_070_000, ccy: 'SAR', validityDays: 120, leadTimeWeeks: 10, page: 3 } },
];

const LEVEL_104 = (pkg: string) => P104.find((p) => p.id === pkg)!.quoteLevel;
const T104_RFQS = rfqs(T104, R104, LEVEL_104);

const SHORTLISTED_104 = '2026-02-26T13:30';

export const NAJD_T104: S2Tender = {
  tenant: 'najd',
  tenderId: T104,
  packages: packages('najd', T104, 'SAR', P104),
  // Packages, self-performed work and the one line nobody covers: exactly SAR 175,000,000.
  boq: boq(T104, 'SAR', [
    ['B-01', 'General and preliminaries', 14_000_000, 'self'],
    ['B-02', 'Civil and structural works', 54_200_000, 'self'],
    ['B-03', 'Installation of mechanical and electrical equipment', 10_325_000, 'self'],
    ...P104.map((p, i): [string, string, number, 'supply' | 'subcontract', string] => [`B-${String(i + 4).padStart(2, '0')}`, p.title, p.value, p.kind, p.id]),
    ['B-15', 'Integration with the existing plant control system', 5_425_000, 'not-covered'],
  ]),
  packagingApproved: { at: '2026-02-26T12:30', byId: PROC },
  shortlists: {
    'P-01': { supplierIds: ['rasikh', 'sadeem', 'jibal', 'qasr', 'taweel'], at: SHORTLISTED_104, byId: PROC },
    'P-02': { supplierIds: ['rhein-aqua', 'hanseong', 'gulf-process', 'vistula'], at: SHORTLISTED_104, byId: PROC },
    'P-03': { supplierIds: ['nordklar', 'sahara-clearwater', 'tamarisk'], at: SHORTLISTED_104, byId: PROC },
    'P-04': { supplierIds: ['castellan', 'gulf-process', 'salwa', 'brenner'], at: SHORTLISTED_104, byId: PROC },
    'P-05': { supplierIds: ['khuzama', 'salwa', 'odrana', 'sahara-clearwater'], at: SHORTLISTED_104, byId: PROC },
    'P-06': { supplierIds: ['hijaz-power', 'levant-switchgear', 'weser', 'nafud'], at: SHORTLISTED_104, byId: PROC },
    'P-07': { supplierIds: ['levant-switchgear', 'nafud', 'hafar-cable', 'sarawat'], at: SHORTLISTED_104, byId: PROC },
    'P-08': { supplierIds: ['qimma', 'asir-telemetry', 'ellanby'], at: SHORTLISTED_104, byId: PROC },
    'P-09': { supplierIds: ['unaizah-valve', 'tarout', 'sudair-steel', 'brescia'], at: SHORTLISTED_104, byId: PROC },
    'P-10': { supplierIds: ['carthage', 'tamarisk', 'salwa', 'gulf-process'], at: SHORTLISTED_104, byId: PROC },
    'P-11': { supplierIds: ['shaqra-steel', 'ula-steel', 'qassim-fibreglass', 'harrat'], at: SHORTLISTED_104, byId: PROC },
  },
  ...T104_RFQS,
  clarifications: [
    { id: 'CL-104-01', tenderId: T104, packageId: 'P-04', supplierId: 'castellan', commercial: false, ownerId: BID,
      question: 'Which total dewatering capacity should we price: 120 or 150 m3/h? The scope and the equipment schedule differ.',
      raisedAt: '2026-03-05T15:00', due: '2026-03-10T15:00' },
    { id: 'CL-104-02', tenderId: T104, packageId: 'P-02', supplierId: 'rhein-aqua', commercial: false, ownerId: BID,
      question: 'May we offer screw blowers as an alternative to the turbo blowers, with the energy figures stated separately?',
      raisedAt: '2026-03-04T09:30', due: '2026-03-09T09:30' },
    { id: 'CL-104-03', tenderId: T104, packageId: 'P-04', supplierId: 'castellan', commercial: true, ownerId: PROC,
      question: 'Will you accept a 30% advance payment against an advance payment guarantee from our bank?',
      raisedAt: '2026-03-08T08:40', due: '2026-03-11T08:40' },
    { id: 'CL-104-04', tenderId: T104, packageId: 'P-03', supplierId: 'tamarisk', commercial: false, ownerId: BID,
      question: 'Is the tertiary filter design flow the average daily flow or the peak flow?',
      raisedAt: '2026-03-05T11:10', due: '2026-03-10T11:10' },
    { id: 'CL-104-05', tenderId: T104, packageId: 'P-01', supplierId: 'sadeem', commercial: false, ownerId: BID,
      question: 'Is the geotechnical investigation report available for the new tank area?',
      raisedAt: '2026-03-01T10:00', due: '2026-03-04T10:00',
      answer: { text: 'Yes. The report is added to the RFQ documents as GCIU-104-G-002, with borehole logs BH-01 to BH-14.', at: '2026-03-02T12:30', byId: BID } },
    { id: 'CL-104-06', tenderId: T104, packageId: 'P-09', supplierId: 'unaizah-valve', commercial: false, ownerId: BID,
      question: 'Please confirm the pressure class for the DN600 butterfly valves.',
      raisedAt: '2026-03-02T09:00', due: '2026-03-05T09:00',
      answer: { text: 'PN16 for all DN600 valves, as the valve schedule in Section 15.', at: '2026-03-03T10:10', byId: BID } },
    { id: 'CL-104-07', tenderId: T104, packageId: 'P-06', supplierId: 'hijaz-power', commercial: false, ownerId: BID,
      question: 'Is the transformer vector group Dyn11?',
      raisedAt: '2026-03-01T13:20', due: '2026-03-04T13:20',
      answer: { text: 'Yes, Dyn11, as the single line diagram GCIU-104-E-301.', at: '2026-03-02T09:40', byId: BID } },
  ],
  gaps: [
    { tenderId: T104, packageId: 'P-08', reason: 'Single compliant quote; utility-approved integrator; accepted by the Procurement Lead', at: '2026-03-05T11:30', byId: PROC },
  ],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 45 days of invoice; an advance of up to 10% against an advance payment guarantee; 5% retention, released at completion.',
  documents: [
    { title: 'Instructions to suppliers and commercial terms', ref: 'RFQ' },
    { title: 'Specification sections for the package', ref: 'Tender Vol. 2' },
    { title: 'Bill of quantities: the package lines only', ref: 'Tender Vol. 3' },
    { title: 'Drawings for the package', ref: 'Tender Vol. 4' },
  ],
};

// ===========================================================================
// T-2026-109 Tabuk water transmission pipeline, Phase 1 (SAR 260 M)
// DG1 pursue Wed 4 Mar 11:20. Packaging approved 14:20; shortlists and all 27
// RFQs on Thu 5 Mar, 22 h 45 m after the pursue. Replies due Sun 15 Mar.

const T109 = 'T-2026-109';
const D109 = 'NCWS-TBK';

const P109: PackageInput[] = [
  { id: 'P-01', title: 'Transmission pipes DN1200', kind: 'supply', value: 78_000_000, trades: ['grp', 'pipes'], quoteLevel: 'line', lineCount: 6,
    mandatoryList: true, lcRelevant: true, needByWeeks: 16,
    lines: [
      { item: '2.01', description: 'GRP pipes DN1200, PN16, SN10000, supplied to site (mandatory list)', unit: 'm', qty: 38_500 },
      { item: '2.03', description: 'Fittings and specials DN1200', unit: 'nr', qty: 260 },
    ],
    note: 'National product: mandatory-list item with the 10% price preference',
    scope: 'Supply of the DN1200 transmission pipes and fittings from a national manufacturer, delivered along the pipeline corridor in the stated sequence.',
    specRef: 'Specification, Section 3: pipes and fittings', drawings: [`${D109}-P-101`, `${D109}-P-102`] },
  { id: 'P-02', title: 'Valves', kind: 'supply', value: 15_600_000, trades: ['valves'], quoteLevel: 'line', lineCount: 9, lcRelevant: true,
    lines: [
      { item: '3.01', description: 'Butterfly valves DN1200, electrically actuated (mandatory list)', unit: 'nr', qty: 24 },
      { item: '3.04', description: 'Double-orifice air valves DN200', unit: 'nr', qty: 96 },
      { item: '3.06', description: 'Washout valves DN300', unit: 'nr', qty: 48 },
    ],
    scope: 'Supply of line valves, air valves and washout valves, delivered to site.',
    specRef: 'Specification, Section 4: valves', drawings: [`${D109}-P-103`] },
  { id: 'P-03', title: 'Pump stations, mechanical', kind: 'supply', value: 23_400_000, trades: ['pumps'], quoteLevel: 'line', lineCount: 11, selfInstall: true, needByWeeks: 36,
    lines: [
      { item: '4.01', description: 'Horizontal split-case pumps, 1,100 kW, with motors', unit: 'nr', qty: 8 },
      { item: '4.03', description: 'Pump station pipework, valves and cranes', unit: 'set', qty: 2 },
    ],
    scope: 'Supply of the pumping units, station pipework and cranes for the two booster stations, with installation supervision and commissioning.',
    specRef: 'Specification, Section 6: pump stations', drawings: [`${D109}-M-201`, `${D109}-M-202`] },
  { id: 'P-04', title: 'Surge protection', kind: 'supply', value: 5_200_000, trades: ['surge'], quoteLevel: 'package', lineCount: 4, selfInstall: true,
    lines: [
      { item: '4.08', description: 'Surge vessels, 60 m3, with compressors', unit: 'nr', qty: 6 },
      { item: '4.10', description: 'Surge analysis and protection design', unit: 'item', qty: 1 },
    ],
    scope: 'Surge analysis of the transmission system and supply of the surge vessels, with commissioning.',
    specRef: 'Specification, Section 6: surge protection', drawings: [`${D109}-M-203`] },
  { id: 'P-05', title: 'Cathodic protection', kind: 'subcontract', value: 3_900_000, trades: ['cathodic'], quoteLevel: 'package', lineCount: 5,
    lines: [
      { item: '5.01', description: 'Impressed-current cathodic protection for steel sections and crossings', unit: 'km', qty: 38.5 },
      { item: '5.03', description: 'Test posts', unit: 'nr', qty: 120 },
    ],
    scope: 'Design, supply, installation and commissioning of cathodic protection along the pipeline.',
    specRef: 'Specification, Section 7: cathodic protection', drawings: [`${D109}-E-310`] },
  { id: 'P-06', title: 'SCADA and telemetry', kind: 'subcontract', value: 6_500_000, trades: ['ica'], quoteLevel: 'line', lineCount: 8,
    lines: [
      { item: '6.01', description: 'Remote terminal units at valve chambers and pump stations', unit: 'nr', qty: 34 },
      { item: '6.03', description: 'SCADA master station and software', unit: 'item', qty: 1 },
      { item: '6.05', description: 'Radio and fibre telemetry links', unit: 'item', qty: 1 },
    ],
    scope: 'Supply, installation and commissioning of the pipeline SCADA and telemetry.',
    specRef: 'Specification, Section 9: SCADA and telemetry', drawings: [`${D109}-I-401`] },
  { id: 'P-07', title: 'Electrical works', kind: 'subcontract', value: 13_000_000, trades: ['lv', 'hv'], quoteLevel: 'line', lineCount: 10,
    lines: [
      { item: '7.01', description: '33/6.6 kV pump station substations', unit: 'nr', qty: 2 },
      { item: '7.04', description: 'MV and LV switchgear and cabling', unit: 'set', qty: 2 },
    ],
    scope: 'Supply, installation and testing of the pump station substations, switchgear and cabling.',
    specRef: 'Specification, Section 8: electrical works', drawings: [`${D109}-E-301`, `${D109}-E-302`] },
  { id: 'P-08', title: 'Trenchless crossings', kind: 'subcontract', value: 10_400_000, trades: ['trenchless'], quoteLevel: 'line', lineCount: 4,
    lines: [
      { item: '8.01', description: 'Microtunnelled road crossings, DN1600 sleeve', unit: 'm', qty: 420 },
      { item: '8.03', description: 'Wadi crossing by pipe jacking', unit: 'm', qty: 160 },
    ],
    scope: 'Microtunnelled road crossings and one wadi crossing, including shafts and sleeves.',
    specRef: 'Specification, Section 5: crossings', drawings: [`${D109}-P-110`, `${D109}-P-111`] },
  { id: 'P-09', title: 'Testing and disinfection', kind: 'subcontract', value: 2_600_000, trades: ['testing'], quoteLevel: 'package', lineCount: 3,
    lines: [
      { item: '9.01', description: 'Hydrostatic testing of the transmission main, in sections', unit: 'm', qty: 38_500 },
      { item: '9.02', description: 'Flushing and disinfection, with sampling', unit: 'item', qty: 1 },
    ],
    scope: 'Hydrostatic testing, flushing and disinfection of the pipeline, with laboratory sampling.',
    specRef: 'Specification, Section 10: testing and commissioning', drawings: [`${D109}-P-120`] },
];

const SENT_109 = '2026-03-05T10:05';
const DUE_15 = '2026-03-15T17:00';

/** [package, supplier, opened?, acknowledged?]: sent together, none quoted yet. */
const R109_ROWS: [string, string, string?, string?][] = [
  ['P-01', 'tuwaiq-pipe', '2026-03-05T10:40', '2026-03-05T13:10'],
  ['P-01', 'eastern-composite', '2026-03-05T11:15', '2026-03-08T08:30'],
  ['P-01', 'harrat', '2026-03-05T14:20'],
  ['P-02', 'unaizah-valve', '2026-03-05T10:55', '2026-03-05T11:30'],
  ['P-02', 'brescia', '2026-03-05T12:40'],
  ['P-02', 'tarout', '2026-03-05T16:05', '2026-03-08T09:10'],
  ['P-03', 'dunmore', '2026-03-05T11:20', '2026-03-05T15:00'],
  ['P-03', 'hanseong', '2026-03-05T18:45', '2026-03-08T07:20'],
  ['P-03', 'lusitania'],
  ['P-04', 'dunmore', '2026-03-05T11:22', '2026-03-05T15:02'],
  ['P-04', 'hanseong', '2026-03-05T18:47'],
  ['P-04', 'lusitania'],
  ['P-05', 'rabigh-cp', '2026-03-05T10:30', '2026-03-05T12:00'],
  ['P-05', 'sabkha', '2026-03-05T13:50'],
  ['P-05', 'nuqra', '2026-03-08T08:05'],
  ['P-06', 'qimma', '2026-03-05T10:20', '2026-03-05T10:50'],
  ['P-06', 'asir-telemetry'],
  ['P-06', 'ellanby', '2026-03-05T15:30', '2026-03-08T08:40'],
  ['P-07', 'nafud', '2026-03-05T11:05', '2026-03-05T14:30'],
  ['P-07', 'hijaz-power', '2026-03-05T10:45'],
  ['P-07', 'levant-switchgear'],
  ['P-08', 'jibal', '2026-03-05T10:35', '2026-03-05T11:45'],
  ['P-08', 'qasr', '2026-03-05T15:15'],
  ['P-08', 'rasikh', '2026-03-05T12:10', '2026-03-08T09:30'],
  ['P-09', 'nuqra', '2026-03-08T08:06'],
  ['P-09', 'rabigh-cp', '2026-03-05T10:32', '2026-03-05T12:02'],
  ['P-09', 'carthage'],
];

const R109: RfqRow[] = R109_ROWS.map(([pkg, sup, openedAt, acknowledgedAt]) => ({
  pkg, sup, sentAt: SENT_109, replyBy: DUE_15, ...(openedAt ? { openedAt } : {}), ...(acknowledgedAt ? { acknowledgedAt } : {}),
}));

const SHORTLISTED_109 = '2026-03-05T09:40';

export const NAJD_T109: S2Tender = {
  tenant: 'najd',
  tenderId: T109,
  packages: packages('najd', T109, 'SAR', P109),
  // Packages and self-performed work: exactly SAR 260,000,000, with nothing uncovered.
  boq: boq(T109, 'SAR', [
    ['B-01', 'General and preliminaries', 18_200_000, 'self'],
    ['B-02', 'Pipe laying: excavation, bedding, laying and backfill', 67_600_000, 'self'],
    ['B-03', 'Pump station and chamber civil works', 15_600_000, 'self'],
    ...P109.map((p, i): [string, string, number, 'supply' | 'subcontract', string] => [`B-${String(i + 4).padStart(2, '0')}`, p.title, p.value, p.kind, p.id]),
  ]),
  packagingApproved: { at: '2026-03-04T14:20', byId: PROC },
  shortlists: {
    'P-01': { supplierIds: ['tuwaiq-pipe', 'eastern-composite', 'harrat', 'qassim-fibreglass', 'sudair-steel'], at: SHORTLISTED_109, byId: PROC },
    'P-02': { supplierIds: ['unaizah-valve', 'brescia', 'tarout', 'scheldt'], at: SHORTLISTED_109, byId: PROC },
    'P-03': { supplierIds: ['dunmore', 'hanseong', 'lusitania', 'aldervane'], at: SHORTLISTED_109, byId: PROC },
    'P-04': { supplierIds: ['dunmore', 'hanseong', 'lusitania'], at: SHORTLISTED_109, byId: PROC },
    'P-05': { supplierIds: ['rabigh-cp', 'sabkha', 'nuqra', 'farasan'], at: SHORTLISTED_109, byId: PROC },
    'P-06': { supplierIds: ['qimma', 'asir-telemetry', 'ellanby', 'hatta'], at: SHORTLISTED_109, byId: PROC },
    'P-07': { supplierIds: ['nafud', 'hijaz-power', 'levant-switchgear', 'hafar-cable'], at: SHORTLISTED_109, byId: PROC },
    'P-08': { supplierIds: ['jibal', 'qasr', 'rasikh', 'taweel'], at: SHORTLISTED_109, byId: PROC },
    'P-09': { supplierIds: ['nuqra', 'rabigh-cp', 'carthage', 'tamarisk'], at: SHORTLISTED_109, byId: PROC },
  },
  ...rfqs(T109, R109, (pkg) => P109.find((p) => p.id === pkg)!.quoteLevel),
  clarifications: [
    { id: 'CL-109-01', tenderId: T109, packageId: 'P-01', supplierId: 'tuwaiq-pipe', commercial: false, ownerId: BID,
      question: 'Please confirm the stiffness class for the DN1200 GRP pipe: SN5000 or SN10000? The specification and the BOQ differ.',
      raisedAt: '2026-03-07T16:20', due: '2026-03-10T16:20' },
    { id: 'CL-109-02', tenderId: T109, packageId: 'P-03', supplierId: 'dunmore', commercial: false, ownerId: BID,
      question: 'Is the pump duty point set at the peak day demand or the average day demand?',
      raisedAt: '2026-03-08T08:15', due: '2026-03-11T08:15' },
  ],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress; an advance of up to 10% against an equal advance payment guarantee; 10% retention until initial delivery.',
  documents: [
    { title: 'Instructions to suppliers and commercial terms', ref: 'RFQ' },
    { title: 'Specification sections for the package', ref: 'Tender Vol. 2' },
    { title: 'Bill of quantities: the package lines only', ref: 'Tender Vol. 3' },
    { title: 'Drawings for the package', ref: 'Tender Vol. 4' },
  ],
};

export const NAJD_S2: S2Tender[] = [NAJD_T104, NAJD_T109];
