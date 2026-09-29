import type { Ccy } from '../../fx';
import type { Trade } from '../types';

/**
 * A supplier's full profile (plan 031): who it is, its accounts, what it has
 * done and is doing for the company, how it has performed, its certificates,
 * contacts and documents. Facts only; the health word, the quarters' totals,
 * progress and every status derive in `domain/gcc/suppliers/**`.
 *
 * The figures the supplier master already holds (`Supplier.performance`,
 * `response`, `load`) are never restated here: the quarters and the jobs are
 * built so that they add up to them. Every name is fictional; money is in
 * major units; dates are `YYYY-MM-DD`.
 */

export type CertKind = 'licence' | 'cr' | 'iso9001' | 'iso14001' | 'iso45001' | 'icv' | 'insurance';
export type DocKind = 'profile' | 'licence' | 'iso' | 'accounts' | 'insurance';
export type ContactRole = 'md' | 'tendering' | 'qa' | 'hse';

export interface CompanyFacts {
  legalName: string;
  /** "Commercial registration" · "Handelsregister" · "Company number" … */
  registration: { label: string; no: string };
  established: number;
  /** City as the master spells it. */
  city: string;
  staff: number;
  /** "Private, family owned", "Subsidiary of a listed group" … */
  ownership: string;
  /** Share held by nationals of the supplier's home country; null for a foreign-owned firm. */
  localSharePct: number | null;
  /** A contractor classification where the home country grades contractors; null for a manufacturer. */
  classification: string | null;
  /** ISO country codes it has delivered in, home first. */
  geographies: string[];
}

export interface Capability {
  trade: Trade;
  /** The largest single order it takes, in the profile's currency. */
  largestOrder: number;
  /** Supply: lead time from order. Subcontract: weeks to mobilise. */
  weeks: [number, number];
  kind: 'supply' | 'subcontract';
}

export interface FinancialYear {
  fy: number;
  revenue: number;
  grossMarginPct: number;
  netMarginPct: number;
  netWorth: number;
  currentRatio: number;
  debtToEquity: number;
  audited: boolean;
  /** When the audit is due, for a year still in management accounts. */
  auditDue?: string;
}

export interface Interim {
  /** "Jan–Feb 2026" */
  label: string;
  to: string;
  revenueToDate: number;
  orderBook: number;
  /** Bank guarantee lines it can draw for performance and advance bonds. */
  bgCapacity: number;
}

export type QuarterKey = 'Q2 2025' | 'Q3 2025' | 'Q4 2025' | 'Q1 2026';

/**
 * One quarter with the company. Awards are not here: they are the jobs
 * awarded in the quarter. Nor are RFQ counts: the master's reply rate can't
 * be rebuilt from whole numbers for most suppliers, so it is shown as the
 * master states it (plan 031, B4).
 */
export interface QuarterSeed {
  key: QuarterKey;
  from: string;
  to: string;
  quotes: number;
  deliveries: number;
  onTime: number;
  ncrs: number;
}

export interface EvaluationSeed {
  at: string;
  /** The evaluator's role title, e.g. "Procurement Lead". */
  byRole: string;
  quality: number;
  schedule: number;
  hse: number;
  commercial: number;
  communication: number;
}

export interface CertificateSeed {
  kind: CertKind;
  name: string;
  no: string;
  issuer: string;
  validTo: string;
}

/** One screening cycle: both checks, as the master records them. The first cycle is the master's own. */
export interface ScreeningCycle {
  sanctions: { state: 'clear' | 'match' | 'due'; at: string };
  antiBribery: { state: 'clear' | 'flag' | 'due'; at: string };
}

export interface ContactSeed {
  role: ContactRole;
  title: string;
  name: string;
  email: string;
  phone: string;
}

export interface DocumentSeed {
  kind: DocKind;
  title: string;
  fileName: string;
  issued: string;
  pages: number;
}

/**
 * An award to the supplier on a tender the company won in the last 12 months
 * (a won lifecycle). `now` jobs are in progress on demo day; `delivered` jobs
 * finished within the 12 months. Together they are the master's `awards12m`.
 */
export interface JobSeed {
  id: string;
  tenderId: string;
  trade: Trade;
  packageTitle: string;
  kind: 'supply' | 'subcontract';
  awardedAt: string;
  startedAt: string;
  dueAt: string;
  state: 'now' | 'delivered';
  deliveredAt?: string;
  /** Now: weeks the forecast finish runs past the due date. Delivered: weeks it was late. 0 is on time. */
  slipWeeks: number;
  value: number;
  ccy: Ccy;
  /** A featured supplier's line about this job. */
  note?: string;
}

/** Its work on one of the company's completed projects (`TenantData.projects`). */
export interface CompletedSeed {
  projectId: string;
  trade: Trade;
  packageTitle: string;
  kind: 'supply' | 'subcontract';
  completed: string;
  /** Our rating, 1–5. */
  rating: number;
  onTime: boolean;
  ncrs: number;
  value: number;
  ccy: Ccy;
}

export interface SupplierProfileSeed {
  supplierId: string;
  tenant: string;
  company: CompanyFacts;
  /** A featured supplier's one-line summary. */
  summary?: string;
  /** A featured supplier's risk note. */
  risk?: string;
  capabilities: Capability[];
  /** The currency its accounts are kept in: its own in the GCC, EUR in the euro area, else USD. */
  ccy: Ccy;
  /** Accounts kept in another currency, reported to us in USD. */
  reportedInUsd: boolean;
  /** Oldest first: three financial years to December. */
  accounts: FinancialYear[];
  interim: Interim;
  /** Our internal credit rating and when it was set. */
  rating: { grade: 'A' | 'B+' | 'B' | 'C'; at: string };
  paymentTerms: string;
  insurance: { cover: string; limit: number; insurer: string; validTo: string };
  quarters: QuarterSeed[];
  evaluation: EvaluationSeed;
  certificates: CertificateSeed[];
  /** Latest first; the first is the master's screening. */
  screeningHistory: ScreeningCycle[];
  contacts: ContactSeed[];
  documents: DocumentSeed[];
  jobs: JobSeed[];
  completed: CompletedSeed[];
}
