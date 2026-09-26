import type { KeyDate, PqRequirement, SimilarProject, ValidationItem } from '../types';

/**
 * The third demo tender (plan 023; gcc-demo-data §4B): T-2026-042, the Sohar–Buraimi road dualling,
 * in Batinah only. The document is Arabic, 18 pages, three of them scanned
 * (`scripts/demo-itt/ilra-042/`, `public/bids/gcc/ILRA-RD-2026-042-booklet-ar.pdf`). Page numbers
 * follow its page map. The issuer, the Interior Links Roads Authority, is fictional.
 *
 * The register row (`batinah.ts`) and the extraction record (`extracted/gcc/ilra-042.ts`) both
 * read these, so the requirements, dates and conflicts never disagree.
 */

export const T042_ID = 'T-2026-042';
export const T042_DOC_KEY = 'ilra-042';
export const T042_REF = 'ILRA/RD/2026/042';
/** The English reading of the printed Arabic title (p. 1). */
export const T042_TITLE_EN = 'Dualisation of the Sohar–Buraimi road, section 2 (38 km), with two bridges, drainage and street lighting';

// ---------------------------------------------------------------------------
// Key dates (Oman, GST +4). Answers: within 7 days of the questions deadline (clause 5).
// Validity: 90 days from opening (clause 10). Bond: to 28 days after validity (scanned form, p. 17).

export const T042_KEY_DATES: KeyDate[] = [
  { kind: 'published', date: '2026-03-08', page: 1, note: 'Issue date on the cover: 19 Ramadan 1447 H (approx.)' },
  { kind: 'site-visit', date: '2026-03-15', time: '09:00', place: 'Sohar interchange, start of section 2', page: 4, note: 'Clause 6; the site-visit certificate goes in the technical envelope' },
  { kind: 'questions', date: '2026-03-24', page: 4, note: 'Clause 5: in writing, through the e-tendering system' },
  { kind: 'answers', date: '2026-03-31', page: 4, note: 'Clause 5: addenda within 7 days of the questions deadline' },
  { kind: 'submission', date: '2026-04-26', time: '12:00', page: 6, note: 'Clause 14: electronic, two envelopes' },
  { kind: 'originals', date: '2026-04-26', time: '12:00', page: 6, note: 'Clause 14: original bid bond to the tender committee secretariat in Sohar before the deadline' },
  { kind: 'opening', date: '2026-04-26', time: '12:30', page: 6, note: 'Clause 16: technical envelopes only' },
  { kind: 'validity-end', date: '2026-07-25', page: 5, note: '90 days from the opening of the technical envelopes (clause 10)' },
  { kind: 'bond-validity-end', date: '2026-08-22', page: 17, note: 'Scanned bond form: bid validity plus 28 days (read by OCR)' },
];

// ---------------------------------------------------------------------------
// Qualification (Section 5, pp. 12–13). The document numbers its rows 1–9; the ids follow it.
// Target against Batinah's vault: 7 met · 1 at risk (PQ-07) · 1 interpretation (PQ-08) · 0 fail.
// The Omanisation compliance certificate is a supporting document (p. 12), not a numbered row.

export const T042_REQUIREMENTS: PqRequirement[] = [
  { id: 'PQ-01', kind: 'cr', page: 12, validAt: 'opening', country: 'OM', threshold: { field: 'Roads and bridges' },
    text: 'Omani Commercial Registration covering roads and bridges construction' },
  { id: 'PQ-02', kind: 'classification', page: 12, alsoOn: [2], validAt: 'opening', country: 'OM', threshold: { field: 'Roads and bridges' },
    text: 'Tender Board registration: roads and bridges construction, Excellent grade' },
  { id: 'PQ-03', kind: 'chamber', page: 12, validAt: 'opening', country: 'OM',
    text: 'Oman Chamber of Commerce and Industry membership' },
  { id: 'PQ-04', kind: 'iso', page: 12, validAt: 'opening',
    text: 'ISO 9001, ISO 14001 and ISO 45001 certificates' },
  { id: 'PQ-05', kind: 'avl', page: 12, validAt: 'opening', country: 'OM',
    text: 'Approved contractor on the national roads programme' },
  { id: 'PQ-06', kind: 'experience', page: 13, threshold: { count: 2, value: 10_000_000, unit: 'OMR', years: 10, field: 'dual carriageway' },
    text: 'At least two (2) contracts for new dual carriageways or the dualling of existing roads, each of OMR 10,000,000 or more, completed in the last 10 years',
    note: 'As prime contractor or consortium lead' },
  { id: 'PQ-07', kind: 'experience', page: 13, threshold: { count: 1, value: 60, unit: 'm span', years: 10 },
    specialist: { what: 'a bridge of 60 m span or more' },
    text: 'At least one bridge with a span of 60 m or more in the last 10 years, or a named specialist subcontractor who has built one',
    note: 'The document allows a specialist subcontractor named in the bid, with proof of its experience' },
  { id: 'PQ-08', kind: 'other', page: 13, alsoOn: [8],
    reading: 'The document does not say whether the 10% counts the contract value or the number of subcontracts (clause 26, p. 8)',
    text: 'Commitment to subcontract at least 10% of the contract to registered small and medium enterprises (clause 26)' },
  { id: 'PQ-09', kind: 'turnover', page: 13, threshold: { value: 20_000_000, unit: 'OMR', years: 3 },
    text: 'Average annual turnover over the last three (3) financial years of at least OMR 20,000,000, from audited accounts',
    jvRule: 'lead ≥ 60% of threshold; members combined ≥ 100%' },
];

// ---------------------------------------------------------------------------
// The two conflicts (catches 1 and 2). The agent shows both values with their pages and does not choose.

export const t042Conflicts = (raisedAt: string): ValidationItem[] => [
  {
    id: 'VAL-042-1', tenderId: T042_ID, field: 'Bid bond amount', value: '1% of the bid value', page: 5, alt: { value: 'OMR 300,000 (fixed amount)', page: 17 },
    confidence: 0.46, reason: 'Clause 12 states a rate; the scanned bond form states a fixed amount. 1% of the estimate is about OMR 320,000', blocksDg1: true, raisedAt,
  },
  {
    id: 'VAL-042-2', tenderId: T042_ID, field: 'Section length', value: '38 km', page: 9, alt: { value: '36.5 km', page: 14 },
    confidence: 0.63, reason: 'Scope (clause 31) and drawings list (G-001) disagree', blocksDg1: false, raisedAt,
  },
];

/** As raised in Batinah's intake queue. */
export const T042_CONFLICTS: ValidationItem[] = t042Conflicts('2026-03-08T07:41');

// ---------------------------------------------------------------------------
// Two synthetic dual-carriageway projects for Batinah's vault (plan 023 allows up to two): they meet
// PQ-06, and their bridge spans (45 m and 52 m) leave PQ-07 at risk.

export const T042_PROJECTS: SimilarProject[] = [
  { id: 'batinah-p4', title: 'Barka–Nakhal road dualling', client: 'Interior Links Roads Authority', country: 'OM', value: { amount: 14_500_000, ccy: 'OMR' },
    completed: '2019-10-31', role: 'prime', scope: 'Dual carriageway, 21 km, with a wadi bridge of 45 m span', fields: ['dual carriageway'], measures: { 'm span': 45 } },
  { id: 'batinah-p5', title: 'Ibri–Yanqul road dualling', client: 'Interior Links Roads Authority', country: 'OM', value: { amount: 12_800_000, ccy: 'OMR' },
    completed: '2023-05-31', role: 'prime', scope: 'Dual carriageway, 17 km, with a wadi bridge of 52 m main span', fields: ['dual carriageway'], measures: { 'm span': 52 } },
];
