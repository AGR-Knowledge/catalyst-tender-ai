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

  // Plan 022: Corniche's T-2026-061, from the two conflicts and the chamber reading.
  {
    id: 'Q-061-01', tenderId: 'T-2026-061', tenants: ['corniche'], topic: 'Tender bond validity', clause: 'ITT 12.2 and Annex C', page: 6, alsoPage: 19, source: 'validation', relatesTo: 'VAL-061-1',
    text: 'Clause 12.2 of the Instructions to Tenderers (p. 6) requires the tender bond to remain valid for 120 days from the Tender Submission Date, while the Form of Tender Bond at Annex C (p. 19) states 150 days. Please confirm the validity required. Unless advised otherwise, we will provide a bond valid for 150 days.',
  },
  {
    id: 'Q-061-02', tenderId: 'T-2026-061', tenants: ['corniche'], topic: 'Chiller plant capacity', clause: 'Scope 4.4.1 and Section 5', page: 11, alsoPage: 14, source: 'validation', relatesTo: 'VAL-061-2',
    text: 'Section 4.4.1 (p. 11) specifies three water-cooled centrifugal chillers of 1,500 TR each, while the equipment schedule in Section 5 (p. 14) lists CH-01 to CH-03 at 1,750 TR each. Please confirm the capacity to be priced, and whether the cooling towers and pumps in Section 5 should be matched to it.',
  },
  {
    id: 'Q-061-03', tenderId: 'T-2026-061', tenants: ['corniche'], topic: 'Chamber of commerce membership', clause: 'Section 6, Q-03', page: 15, source: 'eligibility', relatesTo: 'Q-03',
    text: 'Requirement Q-03 (p. 15) asks for current membership of the Chamber of Commerce and Industry. Please confirm whether membership of the chamber of the emirate where the tenderer is licensed (in our case, Dubai) meets this requirement, or whether Abu Dhabi Chamber membership is required.',
  },

  // Plan 023: Batinah's T-2026-042 (Arabic document), from the two conflicts and the SME reading. The queries are
  // drafted in English with the Arabic clause references; the bid itself must be in Arabic.
  {
    id: 'Q-042-01', tenderId: 'T-2026-042', tenants: ['batinah'], topic: 'Bid bond amount', clause: '§12 and Annex 4', page: 5, alsoPage: 17, source: 'validation', relatesTo: 'VAL-042-1',
    text: 'Clause 12 of the Instructions to Bidders (البند 12, p. 5) requires a bid bond of 1% of the bid value, while the Form of Bid Bond at Annex 4 (الملحق 4, p. 17) states a fixed amount of OMR 300,000. Please confirm which applies. Unless advised otherwise, we will provide the higher of the two, on the Annex 4 form.',
  },
  {
    id: 'Q-042-02', tenderId: 'T-2026-042', tenants: ['batinah'], topic: 'Length of section 2', clause: '§31 and Annex 1', page: 9, alsoPage: 14, source: 'validation', relatesTo: 'VAL-042-2',
    text: 'Clause 31 of the scope of works (البند 31-1, p. 9) gives the length of section 2 as 38 km, from km 24+000 to km 62+000, while drawing ILRA-042-G-001 in the drawings list (الملحق 1, p. 14) is titled 36.5 km. Please confirm the length to be priced, and whether the BOQ quantities for paving, street lighting and road markings will be revised.',
  },
  {
    id: 'Q-042-03', tenderId: 'T-2026-042', tenants: ['batinah'], topic: 'Basis of the SME share', clause: '§26 and Section 5, row 8', page: 8, alsoPage: 13, source: 'eligibility', relatesTo: 'PQ-08',
    text: 'Clause 26 of the conditions of contract (البند 26, p. 8) and row 8 of the qualification requirements (p. 13) require at least 10% of the contract to be subcontracted to registered small and medium enterprises. Please confirm whether the 10% is measured by the value of the subcontracts or by their number, and whether supply orders placed with registered SMEs count towards it.',
  },
];
