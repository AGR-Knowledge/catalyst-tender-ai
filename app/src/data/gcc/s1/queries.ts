import { HERO_ID } from '../hero';
import type { QueryDraft } from './types';

/**
 * Clarification questions the Intake & Extraction agent drafts for the hero
 * tender (spec §6.10, plan 007a step 8.1), from the flaws seeded in the booklet
 * (gcc-demo-data §4.6). Each cites its clause and page. Six are raised by every
 * tenant; the turnover-years question is Najd's, and the O&M question Dafna's.
 */
export const QUERY_DRAFTS: QueryDraft[] = [
  {
    id: 'Q-118-01', tenderId: HERO_ID, tenants: '*', topic: 'VAT in the prices', clause: '§39', page: 11, source: 'extraction', relatesTo: 'Taxes',
    text: 'Clause 39 (p. 11) states that prices are inclusive of all taxes, fees and expenses, but does not name value added tax. Please confirm whether the unit rates and the bid total should include VAT at 15%, or whether VAT should be shown separately.',
  },
  {
    id: 'Q-118-02', tenderId: HERO_ID, tenants: '*', topic: 'Initial guarantee rate', clause: '§41 and §77', page: 12, alsoPage: 35, source: 'validation', relatesTo: 'VAL-118-1',
    text: 'Clause 41 (p. 12) sets the initial guarantee at 1% of the total bid value, while clause 77 of the special conditions (p. 35) sets it at 2%. Please confirm which rate applies. We understand the special conditions prevail and intend to provide 2% unless advised otherwise.',
  },
  {
    id: 'Q-118-03', tenderId: HERO_ID, tenants: '*', topic: 'Start of the answer period', clause: '§33', page: 10, source: 'extraction', relatesTo: 'Answers to questions',
    text: 'Clause 33 (p. 10) says answers will be issued "within seven (7) days from that date". Please confirm whether the seven days run from the publication date or from the questions deadline of 18 March 2026, and whether the expected Eid al-Fitr closure extends the period.',
  },
  {
    id: 'Q-118-04', tenderId: HERO_ID, tenants: '*', topic: 'Delay penalty cap', clause: '§60', page: 19, source: 'extraction', relatesTo: 'Delay penalties',
    text: 'Clause 60 (p. 19) gives the delay penalty formula, but the cap reads "[ %]". Please state the maximum delay penalty as a percentage of the contract value. We note that clause 62 caps total penalties at 20%.',
  },
  {
    id: 'Q-118-05', tenderId: HERO_ID, tenants: '*', topic: 'Post-qualification annex', clause: '§24', page: 8, source: 'extraction', relatesTo: 'Post-qualification reference',
    text: 'Clause 24 (p. 8) refers to post-qualification criteria "in Annex (8)". The criteria appear in Annex 4 (pp. 38–41). Please confirm that Annex 4 is the applicable annex.',
  },
  {
    id: 'Q-118-06', tenderId: HERO_ID, tenants: '*', topic: 'TSE pipeline length', clause: 'Scope of work and drawings list', page: 23, alsoPage: 47, source: 'validation', relatesTo: 'VAL-118-2',
    text: 'The scope of work (p. 23) describes the TSE transmission pipeline as approximately 16 km, while the drawings list (p. 47) titles it an 18 km line. Please confirm the length to be priced, and whether the BOQ quantities in Bill 10 will be revised.',
  },
  {
    id: 'Q-118-07', tenderId: HERO_ID, tenants: ['najd'], topic: 'Financial years for PQ-11', clause: 'Annex 4, PQ-11', page: 39, source: 'eligibility', relatesTo: 'PQ-11',
    text: 'Annex 4 (p. 39) asks for the average turnover of "the last three (3) financial years". Our FY2025 accounts are due to be audited on 15 April 2026, before bid opening. Please confirm whether bidders should submit FY2022–FY2024 or FY2023–FY2025.',
  },
  {
    id: 'Q-118-08', tenderId: HERO_ID, tenants: ['dafna'], topic: 'O&M experience in a consortium', clause: 'Annex 4, PQ-10', page: 38, source: 'eligibility', relatesTo: 'PQ-10',
    text: 'Annex 4 (p. 38) asks for at least three years of operation and maintenance of a sewage treatment plant of 50,000 m3/day or more. Please confirm whether a consortium may meet this through the O&M experience of one member, and whether that member must be the consortium lead.',
  },
];
