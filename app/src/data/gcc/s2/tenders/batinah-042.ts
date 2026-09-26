import type { RfqLine, S2Tender } from '../types';
import { boq, packages, type PackageInput } from './build';

// ===========================================================================
// Batinah · T-2026-042 Sohar–Buraimi road dualling (OMR 32 M estimate), plan 023
//
// The Arabic tender document ILRA/RD/2026/042. Stage 2 starts in the demo, after DG1 Pursue: no packaging
// approval, shortlists, RFQs or quotes are seeded. The six packages are the BOQ lines of
// scripts/demo-itt/ilra-042/content.mjs (quantities from the document; values from benchmark rates, never shown
// to suppliers). Earthworks, paving, drainage installation, the bridge structures and the lighting cabling are
// self-performed. Packages and self-performed work add up to exactly OMR 32,000,000. The scripted replies for
// P-04 and P-05 are in `s2/replies.ts`.

const T042 = 'T-2026-042';
const D042 = 'ILRA-042';

/** [item, description, unit, quantity]: BOQ lines without rates. */
type Line = [string, string, string, number];
const lines = (rows: Line[]): RfqLine[] => rows.map(([item, description, unit, qty]) => ({ item, description, unit, qty }));

const P042: PackageInput[] = [
  { id: 'P-01', title: 'Asphalt and bitumen supply', kind: 'supply', value: 5_950_000, trades: ['asphalt'], quoteLevel: 'line', lineCount: 9, selfInstall: true, lcRelevant: true,
    lines: lines([
      ['3.06', 'Asphalt base course, 120 mm in two layers, 60/70 bitumen, delivered to the paver', 't', 196_000],
      ['3.08', 'Polymer-modified asphalt wearing course, 50 mm, delivered to the paver', 't', 98_500],
      ['3.10', 'Prime coat and tack coat', 'm2', 1_672_000],
    ]),
    scope: 'Supply of asphalt base and wearing courses from an approved mixing plant, delivered to the paver in the paving sequence, with the bituminous prime and tack coats.',
    specRef: 'Tender document, Section 4, clause 34: pavement layers', drawings: [`${D042}-P-301`, `${D042}-P-302`] },
  { id: 'P-02', title: 'Aggregates (quarry supply)', kind: 'supply', value: 2_650_000, trades: ['earthworks'], quoteLevel: 'line', lineCount: 7, selfInstall: true, lcRelevant: true,
    lines: lines([
      ['3.01', 'Granular subbase, 200 mm, delivered to site', 'm3', 170_000],
      ['3.03', 'Aggregate road base, 150 mm, delivered to site', 'm3', 125_000],
      ['3.05', 'Aggregate for shoulders', 'm3', 38_000],
    ]),
    note: 'Quarry source to be approved by the consultant before supply (clause 35)',
    scope: 'Supply of granular subbase, road base and shoulder aggregate from an approved quarry, tested for grading, abrasion and shape, delivered to site.',
    specRef: 'Tender document, Section 4, clauses 34 and 35: pavement layers and aggregates', drawings: [`${D042}-P-303`, `${D042}-P-304`] },
  { id: 'P-03', title: 'Precast box culverts and drainage pipes', kind: 'supply', value: 2_750_000, trades: ['precast'], quoteLevel: 'line', lineCount: 14, selfInstall: true, lcRelevant: true,
    lines: lines([
      ['4.02', 'Precast box culverts, various sizes', 'm', 1_860],
      ['4.03', 'Precast inlet and outlet units for the culverts', 'nr', 124],
      ['4.05', 'Concrete stormwater pipes, 600–1,200 mm', 'm', 4_200],
    ]),
    note: 'Quantities of 4.02 and 4.05 read from the scanned BOQ summary under a stamp: confirm against the electronic BOQ',
    scope: 'Supply of precast box culverts, inlet and outlet units and reinforced concrete stormwater pipes from an approved factory, designed for standard traffic loads, delivered to site.',
    specRef: 'Tender document, Section 4, clause 36: drainage', drawings: [`${D042}-D-401`, `${D042}-D-402`, `${D042}-D-410`] },
  { id: 'P-04', title: 'Bridge bearings and expansion joints', kind: 'supply', value: 600_000, trades: ['bearings'], quoteLevel: 'line', lineCount: 8, selfInstall: true, avlRequired: true,
    longLeadWeeks: 16, needByWeeks: 30,
    lines: lines([
      ['5.12', 'Pot bearings', 'nr', 48],
      ['5.13', 'Laminated elastomeric bearings', 'nr', 64],
      ['5.14', 'Modular expansion joints', 'm', 120],
    ]),
    note: 'Imported: makers with at least ten years of experience; the maker supervises installation (clause 37)',
    scope: 'Supply of pot and laminated elastomeric bearings and modular expansion joints for the Wadi Al Jizzi bridge and the km 41 overpass, with factory test certificates and installation supervision.',
    specRef: 'Tender document, Section 4, clause 37: bridges', drawings: [`${D042}-B-525`, `${D042}-B-526`, `${D042}-B-527`] },
  { id: 'P-05', title: 'Street lighting: poles and LED luminaires', kind: 'supply', value: 2_050_000, trades: ['lighting'], quoteLevel: 'line', lineCount: 12, selfInstall: true,
    longLeadWeeks: 14, needByWeeks: 60,
    lines: lines([
      ['6.01', 'Galvanised lighting columns, 12 m, double arm', 'nr', 1_020],
      ['6.03', 'LED road luminaires', 'nr', 1_980],
      ['6.05', 'Lighting feeder pillars', 'nr', 38],
    ]),
    scope: 'Supply of galvanised 12 m double-arm lighting columns, LED road luminaires with a rated life of at least 100,000 hours, and feeder pillars, delivered to site, with photometric calculations.',
    specRef: 'Tender document, Section 4, clause 38: lighting', drawings: [`${D042}-E-701`, `${D042}-E-702`, `${D042}-E-716`] },
  { id: 'P-06', title: 'Road markings, signage and safety barriers', kind: 'subcontract', value: 1_600_000, trades: ['barriers', 'signage'], quoteLevel: 'line', lineCount: 18, lcRelevant: true,
    lines: lines([
      ['7.01', 'Reflective thermoplastic road markings', 'm', 310_000],
      ['7.04', 'Direction and warning signs', 'nr', 420],
      ['7.05', 'Overhead sign gantries', 'nr', 6],
      ['7.06', 'W-beam steel safety barriers', 'm', 18_600],
    ]),
    scope: 'Supply and installation of thermoplastic markings and road studs, direction and warning signs, overhead gantries, W-beam safety barriers and crash cushions.',
    specRef: 'Tender document, Section 4, clause 39: markings, signs and safety barriers', drawings: [`${D042}-T-801`, `${D042}-T-806`, `${D042}-T-812`] },
];

/** BOQ summary rows for the packages, numbered after the self-performed lines. */
const packageBoq = (list: PackageInput[], from: number) =>
  list.map((p, i): [string, string, number, 'supply' | 'subcontract', string] => [`B-${String(i + from).padStart(2, '0')}`, p.title, p.value, p.kind, p.id]);

export const BATINAH_T042: S2Tender = {
  tenant: 'batinah',
  tenderId: T042,
  packages: packages('batinah', T042, 'OMR', P042),
  // Self-performed work and the six packages: exactly OMR 32,000,000.
  boq: boq(T042, 'OMR', [
    ['B-01', 'General and preliminaries, with traffic management for 30 months', 2_900_000, 'self'],
    ['B-02', 'Earthworks: excavation, embankment fill, subgrade and removal of the old pavement', 4_150_000, 'self'],
    ['B-03', 'Laying and compacting the granular and asphalt layers', 1_850_000, 'self'],
    ['B-04', 'Installing the culverts and pipes, and rock protection to the wadi channels', 1_300_000, 'self'],
    ['B-05', 'Bridge structures: bored piles, piers and abutments, the in-situ post-tensioned main span and the precast deck beams', 5_750_000, 'self'],
    ['B-06', 'Lighting feeder cables and ducts, and installing the columns', 450_000, 'self'],
    ...packageBoq(P042, 7),
  ]),
  shortlists: {},
  rfqs: [],
  quotes: [],
  clarifications: [],
  gaps: [],
  paymentTerms: 'Back to back with the main contract: monthly payments against certified progress, within 56 days of certification; an advance of up to 10% against an advance payment guarantee; 5% retention, half released at provisional acceptance.',
  documents: [
    { title: 'Instructions to suppliers and commercial terms', ref: 'RFQ' },
    { title: 'Technical requirements for the package (Arabic, with an English summary)', ref: 'Tender document, Section 4' },
    { title: 'Bill of quantities: the package lines only', ref: 'Detailed BOQ (electronic)' },
    { title: 'Drawings for the package', ref: 'Annex 1' },
  ],
};
