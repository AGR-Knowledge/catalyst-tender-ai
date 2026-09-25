import type { Ccy } from './fx';
import type { ExtractedTender, ExtractField } from '../extracted/types';

/**
 * Facts for the Stage 1–3 GCC demo (gcc-demo-data.md). Everything here is
 * stored, never derived: eligibility results, fit scores, KPIs and verdicts
 * are computed in `domain/gcc/**` (plans 006 and 007).
 *
 * Conventions:
 * - Money is in major units (SAR, not millions).
 * - Dates are ISO `YYYY-MM-DD`. Times are tenant local, `YYYY-MM-DDTHH:MM`.
 * - People are ids from plan 003 (`najd.fin`, `najd.member.cfo` …), kept as plain strings.
 */

export interface Money { amount: number; ccy: Ccy }

// ---------------------------------------------------------------------------
// Fit model (spec §6.6, gcc-demo-data §2.1)

export type Criterion = 'scope' | 'size' | 'eligibility' | 'geography' | 'client' | 'terms' | 'team' | 'facility' | 'strategy';

export const CRITERIA: Criterion[] = ['scope', 'size', 'eligibility', 'geography', 'client', 'terms', 'team', 'facility', 'strategy'];

/** Weights sum to 100. Weighted fit = Σ weight × score ÷ 10, with scores 0–10. */
export interface FitModel {
  weights: Record<Criterion, number>;
  pursueAt: number;
  conditionsFrom: number;
  band: { min: Money; max: Money };
  singleLimit: Money;
  /** Tenders above this go to the Bid Committee at DG2. */
  dg2Referral: Money;
  /** Bid-desk load above this is shown as a risk (CAP-1). */
  safeDeliveryPct: number;
}

// ---------------------------------------------------------------------------
// Credential vault (spec §6.5)

export type CredentialKind =
  | 'cr' | 'zakat' | 'gosi' | 'chamber' | 'classification' | 'contractors-authority' | 'engineers-council'
  | 'saudization' | 'vat' | 'iso' | 'lc-baseline' | 'bank-reference' | 'avl' | 'other';

export interface Credential {
  id: string;
  kind: CredentialKind;
  label: string;
  number?: string;
  /** Activity or classification field, e.g. 'Water & sewage works'. */
  field?: string;
  /** Classification grade: 1 is the highest. */
  grade?: number;
  /** A certified score, e.g. the local content baseline percentage. */
  score?: number;
  /** Country whose registration this is (ISO code), where it matters for eligibility. */
  country?: string;
  /** Legal entity holding it, from `company.entities`. Absent = the tenant company itself. */
  holder?: string;
  issuer: string;
  /** Last day valid. null = no expiry. */
  validTo: string | null;
  ownerId: string;
  note?: string;
}

export interface Financials {
  fy: number;
  turnover: Money;
  audited: boolean;
  /** Date the audit is signed, or expected to be signed. */
  auditDate?: string;
  netWorth?: Money;
  currentRatio?: number;
}

export interface SimilarProject {
  id: string;
  title: string;
  client: string;
  country: string;
  capacityM3d?: number;
  tertiary?: boolean;
  value: Money;
  /** Completion date (ISO). */
  completed: string;
  role: 'prime' | 'jv-lead' | 'jv-member' | 'subcontractor';
  scope: string;
  /** Operation and maintenance period, if the company ran the plant. */
  om?: { from: string; to: string };
  /** Legal entity that delivered it, from `company.entities`. Absent = the tenant company itself. */
  holder?: string;
}

export interface Partner {
  id: string;
  name: string;
  country: string;
  note: string;
  credentials: Credential[];
  projects: SimilarProject[];
  financials: Financials[];
}

// ---------------------------------------------------------------------------
// Capacity and facility

/**
 * A tendering team. Available hours per week = (engineers + estimators +
 * planners) × `hoursPerWeek`. CAP-1 = committed hours in the window ÷
 * available hours in the window, with each commitment counted for the days it
 * overlaps the window.
 */
export interface Team {
  id: string;
  name: string;
  sector: string;
  engineers: number;
  estimators: number;
  planners: number;
  /** Hours per person per week. */
  hoursPerWeek: number;
  commitments: { tenderId: string; hoursPerWeek: number; from: string; to: string; note?: string }[];
}

/** Bank guarantee facility. Headroom (DEC-6) = limit − utilised − Σ committed. */
export interface Facility {
  limit: Money;
  /** Bonds already issued on contracts. */
  utilised: Money;
  /** Held for live bids, and for awards that are about to convert. */
  committed: { label: string; tenderId?: string; kind: 'bid bond' | 'performance' | 'advance'; amount: Money }[];
  asOf: string;
  confirmedById: string;
}

// ---------------------------------------------------------------------------
// Intake (spec §6.1–§6.3)

export interface Source {
  id: string;
  name: string;
  kind: 'portal' | 'client-portal' | 'mailbox' | 'scan' | 'manual';
  mode: 'api' | 'scheduled' | 'assisted';
  state: 'healthy' | 'degraded' | 'credentials-expiring' | 'down';
  note?: string;
  lastPoll: string;
}

export type IntakeDisposition = 'shortlisted' | 'low-fit' | 'duplicate' | 'addendum' | 'restricted' | 'needs-validation' | 'notice-only';

export interface IntakeEvent {
  id: string;
  sourceId: string;
  tenderId?: string;
  ref: string;
  title: string;
  docType: 'Tender' | 'PQ' | 'Addendum' | 'Clarification' | 'Award notice';
  language: 'EN' | 'AR' | 'EN+AR';
  /** When the documents arrived (tenant local). */
  receivedAt: string;
  /** When the TID was assigned or the document linked. Absent while only the notice is held. */
  loggedAt?: string;
  disposition: IntakeDisposition;
}

export type KeyDateKind =
  | 'published' | 'purchase' | 'participation' | 'site-visit' | 'pre-bid' | 'questions' | 'answers'
  | 'submission' | 'originals' | 'opening' | 'validity-end' | 'bond-validity-end';

export interface KeyDate {
  kind: KeyDateKind;
  date: string;
  time?: string;
  place?: string;
  /** Page of the tender document that states it. */
  page?: number;
  note?: string;
}

// ---------------------------------------------------------------------------
// Eligibility requirements (gcc-demo-data §4.5)

export type PqKind = CredentialKind | 'experience' | 'om' | 'turnover' | 'ratios' | 'personnel' | 'lc' | 'consortium';

export interface PqRequirement {
  id: string;
  text: string;
  kind: PqKind;
  page: number;
  /** Other pages that state the same requirement. */
  alsoOn?: number[];
  /** The date a certificate must still be valid on. */
  validAt?: 'opening' | 'submission' | 'validity';
  /** The credential must be issued in this country (ISO code). */
  country?: string;
  threshold?: { value?: number; unit?: string; count?: number; years?: number; grade?: number; field?: string };
  jvRule?: string;
  note?: string;
}

/** A field the agent would not accept alone (spec §6.3). `alt` is the second value of a conflict. */
export interface ValidationItem {
  id: string;
  tenderId: string;
  field: string;
  value: string;
  alt?: { value: string; page: number };
  page: number;
  /** 0–1. */
  confidence: number;
  reason: string;
  /** Pursue is locked while this is open. */
  blocksDg1: boolean;
  raisedAt: string;
}

export interface FitInput {
  /** 0–10. */
  score: number;
  reason: string;
  source: string;
}

// ---------------------------------------------------------------------------
// Register and decisions

/**
 * Where a tender sits. DG1 due is derived: S1 with no DG1 record.
 * Legacy (plan 017): the lifecycle (`data/gcc/lifecycle`) now says where every
 * tender is, at step level, for Stages 1–9. Read its current log entry
 * (`domain/gcc/lifecycle.ts`, `currentOf`); this field stays for plan 004's
 * Stage 1–3 readers and its dev check.
 */
export type GccStage = 'S1' | 'S2' | 'S3' | 'DG2' | 'later' | 'closed';

export interface GccTender {
  id: string;
  title: string;
  shortTitle: string;
  issuer: string;
  /** True only for the real sample documents (gcc-demo-data §9). */
  issuerIsReal: boolean;
  country: string;
  city: string;
  sector: string;
  sourceId: string;
  /** How this tenant received it, in words. */
  sourceDetail: string;
  procurement: 'open' | 'pq' | 'limited' | 'two-file';
  value: { amount: number; ccy: Ccy; basis: 'published' | 'estimate' | 'not-stated'; band?: [number, number] };
  /** Booklet or document fee. Paid when `intake.purchasedAt` is set (INT-10). */
  documentFee?: Money;
  stage: GccStage;
  stageNote: string;
  bidManagerId: string;
  /** People asked for input on this tender (pack contributors, committee). */
  invited: string[];
  keyDates: KeyDate[];
  /** Key of the extraction record: 'ecws-al-rawdah' for the hero, or a `GCC_EXTRACTED` key. */
  docKey?: string;
  hero?: boolean;
  requirements?: PqRequirement[];
  fit: Record<Criterion, FitInput>;
  validations: ValidationItem[];
  /**
   * Intake times. `disposition` is how intake routed it: only `shortlisted`
   * tenders join the DG1 queue; `low-fit` ones wait for a person to decide.
   */
  intake: { capturedAt: string; purchasedAt?: string; loggedAt?: string; disposition?: IntakeDisposition };
  dg1?: Dg1Record;
  /** When the Stage 3 pack was issued to the committee. Plan 009 seeds the pack itself. */
  packIssuedAt?: string;
  /** Restricted lane: the title is shown only to cleared people. */
  restricted?: boolean;
}

/**
 * An override is Pursue on a Discard recommendation, or Discard on a Pursue
 * recommendation. Hold is never an override.
 */
export interface Dg1Record {
  tenderId: string;
  /** For history records whose tender is no longer in the register. */
  title?: string;
  decision: 'pursue' | 'discard' | 'hold';
  at: string;
  byId: string;
  recommendation: 'pursue' | 'conditions' | 'discard';
  /** Recorded within 24 h of M1. */
  withinSla: boolean;
  reasonCodes: string[];
  note?: string;
}

export interface Dg2History {
  tenderId: string;
  title: string;
  at: string;
  decision: 'bid' | 'no-bid';
  withinSla: boolean;
  /** The Head of Tendering's approval went against the majority of recorded positions (dashboards.md §9). */
  againstMajority: boolean;
  /** Trigger of a later re-open, if any. */
  reopened?: string;
}

export interface BidOutcome {
  id: string;
  title: string;
  sector: string;
  clientType: 'government' | 'semi-government' | 'private';
  value: Money;
  submitted: string;
  decided: string;
  result: 'won' | 'lost' | 'withdrawn';
  lossReason?: 'price' | 'technical' | 'local-content' | 'pq' | 'other';
  /** Win probability (%) shown at DG2, for calibration (OUT-4). */
  predictedWin?: number;
}

/** Another legal entity of the group that bids in its own name, e.g. a KSA subsidiary. */
export interface GroupEntity { id: string; name: string; country: string; note: string; financials: Financials[] }

export interface TenantData {
  key: string;
  company: { hq: string; employees: number; fyEnd: string; financials: Financials[]; entities?: GroupEntity[] };
  fit: FitModel;
  credentials: Credential[];
  projects: SimilarProject[];
  partners: Partner[];
  teams: Team[];
  facility: Facility;
  sources: Source[];
  reconciliation: { at: string; sources: number; missed: number };
  intakeToday: IntakeEvent[];
  register: GccTender[];
  /**
   * Derived from the lifecycles (plan 017), never stored: `dg1` holds the DG1
   * decisions of the last 90 days; `dg2` and `outcomes` those of the last 12
   * months (dashboards.md §2 windows). Won and lost results only.
   */
  history: TenantHistory;
}

export interface TenantHistory { outcomes: BidOutcome[]; dg1: Dg1Record[]; dg2: Dg2History[] }

/**
 * A tenant file as authored: everything except `history`, plus plan 004's
 * history records as input to the lifecycles. `data/gcc/index.ts` folds them
 * into lifecycles and gives `TenantData.history` back, derived, so a decision
 * is written once.
 */
export type TenantSeed = Omit<TenantData, 'history'> & { historySeed: TenantHistory };

// ---------------------------------------------------------------------------
// Hero extraction and BOQ

export type GccFieldGroup = 'identity' | 'commercial' | 'guarantees' | 'time' | 'evaluation' | 'submission' | 'risk';

/** The legacy extraction shape, plus the GCC field groups (spec §6.4) and conflicts. */
export type ExtractedTenderGcc = ExtractedTender & {
  groups: Record<GccFieldGroup, ExtractField[]>;
  conflicts: ValidationItem[];
};

export interface BoqBill { no: number; title: string; lineCount: number }

export interface BoqLine {
  /** Item number as printed, e.g. '2.14'. Aggregate lines use 'N.R'. */
  item: string;
  bill: number;
  description: string;
  unit: string;
  qty: number;
  /** Estimated rate in SAR, from the tenant's benchmark rates. Not in the booklet. */
  rate: number;
  /** Stands for this many BOQ lines. 1 unless it is the "remaining items" aggregate. */
  lines: number;
}

export interface BoqPackage {
  id: string;
  title: string;
  bills: number[];
  /** BOQ items in the package. */
  lineItems: string[];
  kind: 'supply' | 'subcontract';
  longLeadWeeks?: number;
  /** A national product on the mandatory list (price preference and LC). */
  mandatoryList?: boolean;
  note?: string;
}
