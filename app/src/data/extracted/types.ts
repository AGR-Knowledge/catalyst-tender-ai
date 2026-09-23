/**
 * What the Intake & Extraction Agent returns for one tender document.
 * In the prototype these records are pre-extracted from the PDFs in data/bids
 * and served by the mock intake service (src/domain/intake.ts); a real backend
 * would return the same shape.
 */

export type Confidence = 'high' | 'medium' | 'low';

export interface ExtractField {
  label: string;
  value: string;
  /** 1-based page in the source PDF where the value appears. */
  page: number;
  confidence: Confidence;
  /** Why confidence is not high, or anything the reviewer should know. */
  note?: string;
}

export interface ExtractDate {
  label: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** 24h time as printed, e.g. '15:00', if given. */
  time?: string;
  page: number;
  confidence: Confidence;
}

export interface ExtractContact {
  name: string;
  role: string;
  org: string;
  email?: string;
  phone?: string;
  address?: string;
  page: number;
}

export interface ExtractClause {
  /** Clause or section reference as printed, e.g. '2.1.7' or 'Clause 4.2'. */
  ref: string;
  title: string;
  summary: string;
  page: number;
}

export interface ExtractFlag {
  title: string;
  detail: string;
  page: number;
  severity: 'high' | 'medium' | 'low';
}

export interface ExtractedTender {
  /** Stable key, e.g. 'nit'. */
  key: string;
  /** Exact file names that match this record. */
  fileNames: string[];
  /** Document type as the document calls itself, e.g. 'Notice Inviting Bid'. */
  docType: string;
  pages: number;
  language: string;
  /** True when pages are images and need OCR. */
  scanned: boolean;

  /** Full name of the work as printed. */
  title: string;
  /** Short name for cards, at most 42 characters. */
  shortName: string;
  refNo: string | null;
  /** Date the document was issued, ISO. */
  issued: string | null;
  authority: string;
  /** Parent ministry or government body, if stated. */
  parent: string | null;
  country: string;
  location: string;
  /** One of: Power, Transport, Water, Renewables, Oil & gas, Urban infra, Buildings, Industrial. */
  sector: string;
  /** Contract or engagement type, e.g. 'EPC', 'Design consultancy'. */
  mode: string;
  currency: string;
  /** Estimated value as printed, e.g. '₹ 504.26 Cr' or 'US$ 3,000,000'. */
  valueDisplay: string | null;
  /** Estimated value converted to ₹ crore only when the document is in INR; otherwise null. */
  valueCr: number | null;

  /** Headline facts: estimated cost, completion period, bid security, document fee, portal, bid validity... */
  summary: ExtractField[];
  dates: ExtractDate[];
  eligibility: ExtractField[];
  /** Scope of work, one line per item. */
  scope: { text: string; page: number }[];
  evaluation: ExtractField[];
  submission: ExtractField[];
  contacts: ExtractContact[];
  clauses: ExtractClause[];
  /** Points a bid team would want raised at screening. */
  flags: ExtractFlag[];
}
