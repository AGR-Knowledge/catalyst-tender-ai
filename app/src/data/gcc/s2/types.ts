import type { Ccy } from '../fx';
import type { Money } from '../types';

/**
 * Stage 2 sourcing facts (s1-s3-demo-spec §8, gcc-demo-data §4.8, §6). Facts
 * only: coverage, levelling, shortlists, clocks and every KPI derive in
 * `domain/gcc/s2/**`. Times are tenant local, `YYYY-MM-DDTHH:MM`; money is in
 * major units. Every supplier name is fictional.
 */

// ---------------------------------------------------------------------------
// Supplier master (spec §8.3)

/**
 * Trades used to match suppliers to packages. A package lists the trades it
 * needs; a supplier matches when it offers any of them.
 */
export type Trade =
  | 'piling' | 'process-mech' | 'filtration' | 'sludge' | 'odour' | 'hv' | 'lv' | 'ica' | 'valves' | 'pipes' | 'grp'
  | 'pumps' | 'surge' | 'chem-dosing' | 'steel' | 'cathodic' | 'trenchless' | 'testing'
  // Corniche (MEP and district cooling)
  | 'chillers' | 'cooling-towers' | 'hvac' | 'plumbing' | 'fire' | 'bms' | 'insulation'
  // Dafna (sewer rehabilitation)
  | 'cipp' | 'manholes' | 'bypass' | 'cctv'
  // Batinah (roads and structures)
  | 'asphalt' | 'precast' | 'bearings' | 'barriers' | 'lighting' | 'signage' | 'earthworks'
  // Qurain (tunnelling and large pipelines)
  | 'tbm' | 'segments' | 'grouting' | 'ventilation' | 'shafts';

export type ScreeningState = 'clear' | 'match' | 'due';
export type AntiBriberyState = 'clear' | 'flag' | 'due';

export interface Supplier {
  id: string;
  tenant: string;
  /** Always fictional. */
  name: string;
  /** ISO country code. */
  country: string;
  city: string;
  trades: Trade[];
  /** Client names (as the register spells the issuer) whose approved-vendor list includes the supplier. */
  avl: string[];
  /** In-country value or local content score, 0–100. */
  icv?: number;
  prequal: 'approved' | 'pending' | 'none';
  screening: {
    sanctions: { state: ScreeningState; checkedAt: string };
    antiBribery: { state: AntiBriberyState; checkedAt: string };
  };
  performance: { onTimePct: number; ncrs12m: number; quotes12m: number; awards12m: number };
  load: 'low' | 'medium' | 'high';
  response: { ratePct: number; avgDays: number };
  /** A national product (mandatory list and price preference). */
  national: boolean;
  /** The Supplier Portal persona who answers for this supplier. */
  contactPersonId?: string;
}

// ---------------------------------------------------------------------------
// Packages and the BOQ (spec §8.2)

/** A BOQ line as an RFQ carries it: never a rate. */
export interface RfqLine { item: string; description: string; unit: string; qty: number }

export interface TenderPackage {
  id: string;
  tenderId: string;
  tenant: string;
  title: string;
  kind: 'supply' | 'subcontract';
  /** Estimated value from benchmark rates, in the tender's currency. Never shown to suppliers. */
  value: Money;
  /** Trades that can quote it. */
  trades: Trade[];
  /** Hero: BOQ items (from `HERO_PACKAGES`). */
  lineItems?: string[];
  /** Non-hero: representative BOQ lines, and how many BOQ lines the package covers in all. */
  lines?: RfqLine[];
  lineCount?: number;
  /** Supply that the contractor installs (make-or-buy "self-install"). */
  selfInstall?: boolean;
  longLeadWeeks?: number;
  /** Weeks from award by which the programme needs it on site. */
  needByWeeks?: number;
  mandatoryList?: boolean;
  avlRequired?: boolean;
  lcRelevant?: boolean;
  /** Internal note for the buyer. */
  note?: string;
  /** The scope as an RFQ states it to suppliers. */
  scope: string;
  /** Specification pages or sections the RFQ attaches. */
  specRef: string;
  /** Drawing numbers the RFQ attaches. */
  drawings: string[];
  /** Quote at line or package level, as the RFQ fixes it. */
  quoteLevel: 'line' | 'package';
}

/** BOQ roll-up for a non-hero tender: self-performed, packaged and not-covered value. */
export interface BoqSummaryLine {
  id: string;
  tenderId: string;
  title: string;
  value: Money;
  kind: 'self' | 'supply' | 'subcontract' | 'not-covered';
  packageId?: string;
}

// ---------------------------------------------------------------------------
// RFQs, quotes, clarifications (spec §8.4–§8.8)

export interface Rfq {
  /** `{TID}-{pkgId}-{supplierId}`, the same shape as RFQs derived from `rfq-sent:` keys. */
  id: string;
  tenderId: string;
  packageId: string;
  supplierId: string;
  sentAt: string;
  replyBy: string;
  /** The reply date before an extension. */
  extendedFrom?: string;
  /** Why the reply date was extended (an addendum, a clarification, the supplier's request). Set with `extendedFrom`. */
  extensionReason?: string;
  openedAt?: string;
  acknowledgedAt?: string;
  declined?: { at: string; reason: string };
  quoteId?: string;
  repliedAt?: string;
  /** A manual escalation. Escalation by rule derives from the reply date. */
  escalatedAt?: string;
  /** Nudges the buyer sent by hand, on top of the agent's scheduled reminders. */
  nudges: number;
}

export type Incoterm = 'DAP site' | 'EXW' | 'FCA' | 'CIF Dammam';

/** Adjustment keys (`lev:{quoteId}:{adjKey}`). Exclusions are numbered from 1 in the quote's order. */
export type AdjKey = 'currency' | 'vat' | 'delivery' | 'validity' | `exclusion-${number}` | 'deviations' | 'payment' | 'lead-time';

export interface Quote {
  id: string;
  rfqId: string;
  supplierId: string;
  packageId: string;
  tenderId: string;
  receivedAt: string;
  level: 'line' | 'package';
  amount: number;
  ccy: Ccy;
  vatInclusive: boolean;
  incoterm: Incoterm;
  /** Where the goods ship from, as the quote states it (e.g. 'Busan, KR'). Defaults to the supplier's country. */
  origin?: string;
  validityDays: number;
  leadTimeWeeks?: number;
  paymentAdvancePct?: number;
  exclusions: string[];
  deviations: { text: string; nonCompliant: boolean }[];
  /** Page of the quote document that states the price. */
  page?: number;
  /** Adjustments the buyer decided before demo day, keyed by `AdjKey`. */
  seededDecisions?: Partial<Record<string, 'confirmed' | 'rejected'>>;
}

export interface Clarification {
  id: string;
  tenderId: string;
  packageId: string;
  supplierId: string;
  question: string;
  raisedAt: string;
  ownerId: string;
  /** Raised + the answer SLA in working days. */
  due: string;
  answer?: { text: string; at: string; byId: string };
  /** A commercial question goes to a person, never to an agent draft. */
  commercial: boolean;
}

export interface AcceptedGap { tenderId: string; packageId: string; reason: string; at: string; byId: string }

/** Best-fit weights per tenant, summing to 100 (spec §8.7). */
export interface BestFitWeights { price: number; technical: number; delivery: number; qhse: number; capacity: number; leadTime: number; icv: number }

// ---------------------------------------------------------------------------
// A tender's Stage 2 record

export interface S2Tender {
  tenant: string;
  tenderId: string;
  packages: TenderPackage[];
  boq: BoqSummaryLine[];
  /** Packaging approved before demo day. */
  packagingApproved?: { at: string; byId: string };
  /** Shortlists approved before demo day, per package. */
  shortlists: Record<string, { supplierIds: string[]; at: string; byId: string }>;
  rfqs: Rfq[];
  quotes: Quote[];
  clarifications: Clarification[];
  gaps: AcceptedGap[];
  /** The main contract's payment terms, which RFQs pass on to suppliers. */
  paymentTerms: string;
  /** Where the tender states the subcontracting limit; absent means none is stated. */
  subcontractCap?: { pct: number; source: string };
  /** The document the RFQ scope comes from, e.g. 'Vol. 1 Booklet'. */
  documents: { title: string; ref: string }[];
}
