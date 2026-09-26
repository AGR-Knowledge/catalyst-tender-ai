import type { GccTenantKey } from '../index';
import type { GccTender, KeyDateKind } from '../types';

/**
 * Stage 1 facts that plan 004's seed does not hold (plan 007a). Everything here
 * is stored, never derived; each record is keyed by tenant and tender ID, so no
 * tenant file is edited. Names of people are fictional composites.
 */

/** A clarification question drafted for the employer (spec §6.10). */
export interface QueryDraft {
  id: string;
  tenderId: string;
  /** Tenants that raise it, or '*' for every tenant that captured the tender. */
  tenants: GccTenantKey[] | '*';
  topic: string;
  /** Clause as printed, e.g. '§41'. */
  clause: string;
  page: number;
  alsoPage?: number;
  /** As a contractor would send it: polite and specific. */
  text: string;
  source: 'extraction' | 'eligibility' | 'validation';
  /** PQ id, validation id or field label. */
  relatesTo?: string;
}

/** One change an addendum makes (spec §6.8). */
export type AddendumChange =
  | { kind: 'date'; field: KeyDateKind; from: string; to: string }
  /** `topic` names what changed in words, for the package effect ("filter media"). */
  | { kind: 'boq'; item: string; packageId?: string; topic?: string; from: string; to: string }
  | { kind: 'clause'; clause: string; page: number; from: string; to: string };

export interface Addendum {
  id: string;
  tenderId: string;
  tenant: GccTenantKey;
  no: number;
  ref: string;
  /** Tenant-local date-time. */
  receivedAt: string;
  intakeEventId?: string;
  pages: number;
  summary: string;
  changes: AddendumChange[];
  /** Stage 2 packages to re-quote. The IDs and titles are fixed: plan 009a's staleness text uses them. */
  requote?: { packageId: string; title: string; suppliers: number }[];
}

/** A key person on record, matched against key-personnel lines (PQ-13). */
export interface KeyPerson {
  id: string;
  tenant: GccTenantKey;
  /** Group entity the person is employed by, from `company.entities`. Absent = the tenant company. */
  entity?: string;
  name: string;
  role: 'project-manager' | 'process-lead' | 'hse-manager' | 'commissioning-manager' | 'other';
  /** Title as held, for the evidence chip. */
  title: string;
  years: number;
  /** Years in water and wastewater. */
  sectorYears: number;
  saudiNational: boolean;
  availableFrom: string;
  /** Last day on a current assignment. */
  committedTo?: string;
}

/** The bid team's effort if the tender is pursued (spec §6.9). */
export interface EffortEstimate {
  tenant: GccTenantKey;
  tenderId: string;
  teamId: string;
  hoursPerWeek: number;
  from: string;
  to: string;
  note: string;
}

/** Typical preparation time, in working days, from the tenant's own history (SCR-8). */
export interface PrepTypical {
  tenant: GccTenantKey;
  procurement: GccTender['procurement'];
  sector: string;
  workingDays: number;
  /** Past bids the figure is taken from. */
  n: number;
}

/** A length a past project delivered, for experience lines stated in kilometres. */
export interface ProjectLength {
  tenant: GccTenantKey;
  projectId: string;
  kind: 'sewer' | 'water-transmission' | 'marine-offshore';
  km: number;
  /** Largest diameter, where the requirement names one. */
  diameterMm?: number;
}

/** Which kinds of past project count for an experience line stated in kilometres. */
export interface RequirementScope {
  tenant: GccTenantKey;
  tenderId: string;
  reqId: string;
  kinds: ProjectLength['kind'][];
  minDiameterMm?: number;
}

/** Guarantee terms stated in a tender, for the bond check (spec §6.7, §7 item 6). */
export interface BondTerms {
  tenderId: string;
  /** Tenants the terms apply to, or '*' (the hero). */
  tenants: GccTenantKey[] | '*';
  /** Bid bond (initial guarantee) rate in %, when one rate is stated. The hero's comes from its conflict. */
  bidPct?: number;
  bidPage?: number;
  /** Validation item that holds the rate while it is in conflict (the hero: VAL-118-1). */
  bidRateValidationId?: string;
  /**
   * How long the bid bond must stay valid, in calendar days from bid opening,
   * when the tender states it in days rather than as a key date.
   */
  bidValidityDays?: number;
  performancePct: number;
  performancePage?: number;
  /** Advance payment guarantee, as % of contract value, when the tender offers an advance. */
  advancePct?: number;
  advancePage?: number;
  /** Where the tender states these terms, when no single page is given. */
  source?: string;
}
