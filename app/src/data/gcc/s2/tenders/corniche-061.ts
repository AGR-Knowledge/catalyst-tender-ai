import type { RfqLine, S2Tender } from '../types';
import { boq, packages, type PackageInput } from './build';

/**
 * Corniche · T-2026-061, the Abu Dhabi hospital MEP package (AED 185 M estimate), plan 022 and
 * gcc-demo-data §4A. Seven packages from the BOQ summary (Vol. 2, eight work packages), with the
 * self-performed installation: the BOQ roll-up is exactly AED 185,000,000, with nothing uncovered.
 *
 * Nothing is sent before demo day: the tender is at Stage 1 on Sun 8 Mar. After a DG1 Pursue in the
 * demo, the packaging, shortlists (recommended from the supplier master) and RFQs are the demo's, and
 * the replies for P-01 and P-02 arrive through the scripted replies (`s2/replies.ts`).
 *
 * Subcontracted: P-03, P-05 and P-06, AED 40.5 M (21.9%), inside the 35% cap (Sub-Clause 4.4, p. 8).
 */

const T061 = 'T-2026-061';
const D061 = 'CBHH-011';

/** [item, description, unit, quantity]: BOQ lines without rates, as the BOQ summary prints them (pp. 16–17). */
type Line = [string, string, string, number];
const lines = (rows: Line[]): RfqLine[] => rows.map(([item, description, unit, qty]) => ({ item, description, unit, qty }));

const P061: PackageInput[] = [
  { id: 'P-01', title: 'Chillers and cooling towers', kind: 'supply', value: 12_600_000, trades: ['chillers', 'cooling-towers'], quoteLevel: 'line', lineCount: 6,
    selfInstall: true, longLeadWeeks: 30, needByWeeks: 32,
    lines: lines([
      ['1.01', 'Water-cooled centrifugal chillers, with starters and controls', 'nr', 3],
      ['1.03', 'Induced-draft cooling tower cells, with variable speed fans', 'nr', 3],
    ]),
    note: 'Long lead: the chillers set the central plant programme. Capacity in conflict (VAL-061-2): 1,500 TR in the scope, 1,750 TR in the schedule',
    scope: 'Supply of three water-cooled centrifugal chillers (N+1) and three induced-draft cooling tower cells, delivered to site, with installation supervision, factory performance tests and commissioning.',
    specRef: 'Scope of Works 4.4 (p. 11); equipment schedule, CH-01 to 03 and CT-01 to 03 (p. 14)', drawings: [`${D061}-M-101`, `${D061}-M-102`] },
  { id: 'P-02', title: 'Air handling units and fan coil units', kind: 'supply', value: 16_800_000, trades: ['hvac'], quoteLevel: 'line', lineCount: 9, selfInstall: true,
    lines: lines([
      ['2.02', 'Air handling units, 100% fresh air, with heat recovery', 'nr', 14],
      ['2.04', 'Air handling units, mixed air', 'nr', 24],
      ['2.07', 'Fan coil units, ceiling concealed, two-pipe', 'nr', 1_150],
    ]),
    scope: 'Supply of the fresh-air and mixed-air handling units, with their controls, and the fan coil units, delivered to site, with commissioning.',
    specRef: 'Scope of Works 4.4.4 and 4.4.5 (p. 11); equipment schedule, AHU-01 to 38 and FCU (p. 14)', drawings: [`${D061}-M-201`, `${D061}-M-202`] },
  { id: 'P-03', title: 'Medical gas pipeline systems', kind: 'subcontract', value: 9_400_000, trades: ['medical-gas'], quoteLevel: 'package', lineCount: 16, avlRequired: true,
    lines: lines([
      ['3.01', 'Vacuum insulated evaporator, liquid oxygen, 20,000 litres', 'item', 1],
      ['3.03', 'Medical air plant, triplex compressors with dryers', 'nr', 2],
      ['3.05', 'Medical vacuum plant, triplex pumps with bacterial filters', 'nr', 2],
      ['3.08', 'Copper pipework for medical gases, cleaned for oxygen service', 'm', 14_200],
      ['3.11', 'Medical gas terminal units in bed-head units and pendants', 'nr', 1_480],
    ]),
    note: 'Specialist: an installer approved for medical gas pipeline systems (HTM 02-01 or NFPA 99) and on the Employer\'s approved list, named in the technical volume (Q-09)',
    scope: 'Design, supply, installation, testing and certification of the medical gas pipeline systems, by an installer approved for medical gas pipeline systems, working to HTM 02-01 or NFPA 99.',
    specRef: 'Scope of Works 4.8 (p. 13); qualification requirement Q-09 (p. 15)', drawings: [`${D061}-M-301`, `${D061}-M-302`] },
  { id: 'P-04', title: 'LV switchgear, standby generators and UPS', kind: 'supply', value: 18_500_000, trades: ['lv'], quoteLevel: 'line', lineCount: 10, selfInstall: true,
    longLeadWeeks: 24, needByWeeks: 40,
    lines: lines([
      ['4.01', 'Main LV switchboards, 4,000 A, form 4 type 6', 'nr', 6],
      ['4.04', 'Standby diesel generator sets, 2,000 kVA, with fuel system', 'nr', 3],
      ['4.07', 'UPS systems, 400 kVA, modular, 15 minutes\' autonomy', 'nr', 4],
      ['4.09', 'Isolated power supply panels for theatres and critical care', 'nr', 34],
    ]),
    scope: 'Supply of the main LV switchboards, standby generator sets, UPS systems and isolated power supply panels, delivered to site, with factory tests and commissioning.',
    specRef: 'Scope of Works 4.5 (p. 12); equipment schedule, GEN, MSB and UPS (p. 14)', drawings: [`${D061}-E-401`, `${D061}-E-402`] },
  { id: 'P-05', title: 'Fire fighting and fire alarm', kind: 'subcontract', value: 13_200_000, trades: ['fire'], quoteLevel: 'package', lineCount: 20, avlRequired: true,
    lines: lines([
      ['5.02', 'Fire pump set: electric, diesel and jockey pumps', 'set', 1],
      ['5.05', 'Sprinkler heads, quick response, with pipework and valves', 'nr', 9_800],
      ['5.08', 'Wet risers with landing valves and hose reels', 'nr', 48],
      ['5.11', 'Addressable fire alarm system with voice evacuation', 'item', 1],
    ]),
    note: 'Civil Defence approved fire and life safety contractors only (Section 4.7.2)',
    scope: 'Design, supply, installation, testing and Civil Defence approval of the fire fighting, clean agent suppression and fire alarm systems.',
    specRef: 'Scope of Works 4.7 (p. 12); qualification requirement Q-04 (p. 15)', drawings: [`${D061}-F-601`, `${D061}-F-602`] },
  { id: 'P-06', title: 'Plumbing, drainage and water treatment', kind: 'subcontract', value: 17_900_000, trades: ['plumbing'], quoteLevel: 'package', lineCount: 30,
    lines: lines([
      ['6.02', 'Domestic water transfer and booster pump sets', 'set', 4],
      ['6.08', 'Reverse osmosis water treatment plant for renal dialysis', 'item', 1],
      ['6.11', 'Cold and hot water pipework, PPR and copper', 'm', 22_400],
      ['6.19', 'Sanitary fixtures, hospital grade, with thermostatic mixing', 'nr', 1_620],
    ]),
    scope: 'Supply, installation and testing of the water supply, hot water, drainage and the reverse osmosis plant for renal dialysis.',
    specRef: 'Scope of Works 4.6 (p. 12)', drawings: [`${D061}-P-501`, `${D061}-P-502`] },
  { id: 'P-07', title: 'ELV, BMS and nurse call', kind: 'supply', value: 11_600_000, trades: ['bms'], quoteLevel: 'package', lineCount: 14, selfInstall: true,
    lines: lines([
      ['7.02', 'Building management system: controllers, devices and head-end', 'point', 6_400],
      ['7.05', 'Nurse call system with bed-head and bathroom call points', 'nr', 262],
      ['7.08', 'Structured cabling, Cat 6A, with outlets and racks', 'point', 5_900],
    ]),
    note: 'Designed in-house: supply only, installed and commissioned by Corniche',
    scope: 'Supply of the building management system, nurse call and ELV equipment to Corniche\'s design, delivered to site, with software, configuration support and training.',
    specRef: 'Scope of Works 4.9 (p. 13); equipment schedule, BMS and NC (p. 14)', drawings: [`${D061}-X-701`, `${D061}-X-702`] },
];

/** BOQ summary rows for the packages, numbered after the self-performed lines. */
const packageBoq = (list: PackageInput[], from: number) =>
  list.map((p, i): [string, string, number, 'supply' | 'subcontract', string] => [`B-${String(i + from).padStart(2, '0')}`, p.title, p.value, p.kind, p.id]);

export const CORNICHE_T061: S2Tender = {
  tenant: 'corniche',
  tenderId: T061,
  packages: packages('corniche', T061, 'AED', P061),
  boq: boq(T061, 'AED', [
    ['B-01', 'General requirements and preliminaries (WP-0)', 14_000_000, 'self'],
    ['B-02', 'Chilled water installation: pipework, pumps and water treatment (WP-1)', 13_700_000, 'self'],
    ['B-03', 'Ductwork, air distribution and air-side installation (WP-2)', 20_300_000, 'self'],
    ['B-04', 'LV distribution, lighting, small power and earthing (WP-4)', 30_000_000, 'self'],
    ['B-05', 'ELV installation, testing and commissioning (WP-7, Section 4.10)', 7_000_000, 'self'],
    ...packageBoq(P061, 6),
  ]),
  shortlists: {},
  rfqs: [],
  quotes: [],
  clarifications: [],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 60 days of the payment certificate; an advance of up to 10% against an advance payment guarantee; 10% retention, half released at taking-over.',
  subcontractCap: { pct: 35, source: 'Particular Conditions Sub-Clause 4.4 (p. 8)' },
  documents: [
    { title: 'Instructions to suppliers and commercial terms', ref: 'RFQ' },
    { title: 'Scope of works and equipment schedule: the package sections', ref: 'Tender Vol. 1' },
    { title: 'Bill of quantities: the package lines only', ref: 'Tender Vol. 2' },
    { title: 'Drawings for the package', ref: 'Tender Vol. 3' },
  ],
};
