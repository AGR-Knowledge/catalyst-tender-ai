import type { S2Tender, TenderPackage } from '../types';

/**
 * The hero's Stage 2 facts that `HERO_PACKAGES` does not hold (spec §8.2).
 * The packages themselves, their lines and their values come from
 * `data/gcc/hero.ts` and are built in `domain/gcc/s2/context.ts`, so the two
 * never disagree. The same facts apply in every tenant; the hero has no RFQs
 * until a DG1 pursue in the demo.
 *
 * Pages are those of the booklet, ECWS/PRJ/2026/0147 (plan 005): liquid line
 * §64.5 p. 22, TSE system §64.6 p. 23, sludge §64.7 and odour §64.8 p. 24,
 * electrical §64.9 and ICA §64.10 p. 25, procurement §64.14 p. 27, equipment
 * §71 p. 31, mandatory list §75 p. 33, drawings list p. 47.
 */

export type HeroPackageExtra = Pick<TenderPackage, 'trades' | 'scope' | 'specRef' | 'drawings' | 'quoteLevel'>
  & Partial<Pick<TenderPackage, 'needByWeeks' | 'avlRequired' | 'lcRelevant' | 'selfInstall'>>;

/** §64.14.1: suppliers come from the Entity's approved lists where they exist. */
const AVL = true;

export const HERO_S2_PACKAGES: Record<string, HeroPackageExtra> = {
  'P-01': { trades: ['piling'], quoteLevel: 'line', needByWeeks: 8,
    scope: 'Bored cast-in-place piles (800 mm, average 18 m), deep-well and wellpoint dewatering, and temporary sheet-pile shoring for the Phase 2 structures, next to the operating Phase 1 plant.',
    specRef: 'Vol. 1 §64.15 (p. 27) and §72 (p. 32)',
    drawings: ['ECWS-0147-G-003', 'ECWS-0147-C-102', 'ECWS-0147-C-104', 'ECWS-0147-C-105', 'ECWS-0147-C-106'] },
  'P-02': { trades: ['process-mech'], quoteLevel: 'line', needByWeeks: 28, avlRequired: AVL, selfInstall: true,
    scope: 'Supply of six 6 mm fine screens with washer-compactors, four vortex grit units, six 750 kW turbo blowers, fine-bubble diffuser grids, six 52 m clarifier scraper mechanisms and the RAS/WAS pumps, delivered to site, with installation supervision and commissioning. Installation is by the contractor.',
    specRef: 'Vol. 1 §64.5 (p. 22) and §71 (p. 31)',
    drawings: ['ECWS-0147-G-005', 'ECWS-0147-C-101', 'ECWS-0147-C-102', 'ECWS-0147-C-104', 'ECWS-0147-C-107'] },
  'P-03': { trades: ['filtration'], quoteLevel: 'line', needByWeeks: 32, avlRequired: AVL, selfInstall: true,
    scope: 'Supply of six cloth disc filters (1,750 m³/h each) with backwash, three UV disinfection channels, the backwash and filtrate pumps, and sodium hypochlorite dosing for the TSE chlorine residual, with installation supervision and commissioning.',
    specRef: 'Vol. 1 §64.5 (p. 22) and §71 (p. 31)',
    drawings: ['ECWS-0147-G-005', 'ECWS-0147-C-105'] },
  'P-04': { trades: ['sludge'], quoteLevel: 'line', needByWeeks: 32, avlRequired: AVL, selfInstall: true,
    scope: 'Supply of four gravity belt thickeners (60 m³/h), four dewatering centrifuges (45 m³/h) with cake pumps, two polymer units and two 200 m³ cake silos with truck loading, with installation supervision and commissioning.',
    specRef: 'Vol. 1 §64.7 (p. 24) and §71 (p. 31)',
    drawings: ['ECWS-0147-G-006', 'ECWS-0147-C-106'] },
  'P-05': { trades: ['odour'], quoteLevel: 'package', needByWeeks: 36,
    scope: 'Design, supply, installation and commissioning of three biotrickling filter units (45,000 m³/h), three carbon polishing units and the GRP extraction ductwork (DN300–DN1200).',
    specRef: 'Vol. 1 §64.8 (p. 24)',
    drawings: ['ECWS-0147-G-006', 'ECWS-0147-M-501'] },
  'P-06': { trades: ['hv'], quoteLevel: 'line', needByWeeks: 40, avlRequired: AVL,
    scope: 'Design, supply, installation, testing and energisation of the 33/11 kV gas-insulated substation, with protection and control, and two 20 MVA ONAN power transformers.',
    specRef: 'Vol. 1 §64.9 (p. 25)',
    drawings: ['ECWS-0147-E-301', 'ECWS-0147-E-302'] },
  'P-07': { trades: ['lv'], quoteLevel: 'line', needByWeeks: 30, lcRelevant: true,
    scope: 'Supply, installation and testing of six 11/0.4 kV distribution transformers, fourteen form 4b motor control centres, LV power and control cables from a national manufacturer (mandatory list), and the standby generators.',
    specRef: 'Vol. 1 §64.9 (p. 25) and §75 (p. 33)',
    drawings: ['ECWS-0147-E-302', 'ECWS-0147-E-303'] },
  'P-08': { trades: ['ica'], quoteLevel: 'line', needByWeeks: 40, avlRequired: AVL,
    scope: 'Supply, installation, configuration and commissioning of flowmeters, online analysers, redundant PLC panels and the fibre-optic network. The link to the Entity’s central control centre is outside this package.',
    specRef: 'Vol. 1 §64.10 (p. 25)',
    drawings: ['ECWS-0147-I-401', 'ECWS-0147-I-402'] },
  'P-09': { trades: ['valves', 'pipes'], quoteLevel: 'line', needByWeeks: 20, lcRelevant: true,
    scope: 'Supply of ductile iron pipes and fittings (DN300–DN1400), electrically actuated butterfly valves from a national manufacturer (mandatory list), and stainless steel penstocks and weir gates, delivered to site.',
    specRef: 'Vol. 1 §64.5 (p. 22) and §75 (p. 33)',
    drawings: ['ECWS-0147-C-109', 'ECWS-0147-M-502'] },
  'P-10': { trades: ['grp'], quoteLevel: 'line', needByWeeks: 16, lcRelevant: true,
    scope: 'Supply of GRP pipes DN1000, PN16, SN10000, from a national manufacturer holding the required baseline certificate (mandatory list), delivered along the pipeline corridor.',
    specRef: 'Vol. 1 §64.6.3 (p. 23) and §75 (p. 33)',
    drawings: ['ECWS-0147-P-201', 'ECWS-0147-P-202', 'ECWS-0147-P-204'] },
  'P-11': { trades: ['pumps', 'surge'], quoteLevel: 'line', needByWeeks: 30, selfInstall: true,
    scope: 'Supply of four duty and one standby TSE pumps (450 kW) with surge vessels for the TSE pump station, delivered to site, with installation supervision and commissioning.',
    specRef: 'Vol. 1 §64.6 (p. 23) and §71 (p. 31)',
    drawings: ['ECWS-0147-C-108'] },
};

/** Commercial terms the hero's RFQs pass on (booklet §80–§81, p. 36; §23, p. 7). */
export const HERO_S2_TERMS: Pick<S2Tender, 'paymentTerms' | 'subcontractCap' | 'documents'> = {
  paymentTerms: 'Back to back with the main contract: an advance of up to 10% against an advance payment guarantee (§80); up to 10% deducted from each invoice until 10% of the value is held, paid at initial delivery (§81).',
  subcontractCap: { pct: 30, source: 'Vol. 1 §23, p. 7: up to 30% of contract value; 30–50% needs the Entity’s approval' },
  documents: [
    { title: 'Vol. 1 Terms and Specifications Booklet: the clauses for the package', ref: 'ECWS/PRJ/2026/0147' },
    { title: 'Vol. 2 Bill of Quantities: the package lines only', ref: 'Vol. 2' },
    { title: 'Vol. 3 Drawings for the package', ref: 'Drawings list, p. 47' },
  ],
};
