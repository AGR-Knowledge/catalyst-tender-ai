import type { Money } from '../types';

/**
 * The DG3 evidence for one tender (plan 018, dashboards.md §9): what the
 * Compliance / Legal Lead put in the DG3 pack for the Head of Tendering's final
 * approval. Synthetic, one record per tender waiting at DG3 in the seed. Every
 * check line is derived from it in `domain/gcc/dg3`, never typed.
 *
 * Conventions follow `data/gcc/types.ts`: money in major units, dates as ISO
 * `YYYY-MM-DD`, people as plan 003 ids in the same tenant.
 */

export type Dg3ConditionKind = 'min-margin' | 'other';
export type DeviationPosition = 'accepted' | 'qualified' | 'rejected';
export type RiskRating = 'high' | 'medium' | 'low';

/** A condition the Head of Tendering attached at DG2, as the final price must meet it. */
export interface Dg3Condition { text: string; kind: Dg3ConditionKind; minPct?: number }

/** The initial (bid) guarantee, against what the tender asks for. */
export interface Dg3Bond {
  amount: Money;
  /** The share of the bid price the tender asks for. */
  requiredPct: number;
  /** How many days after bid opening the tender says the guarantee must stay valid. */
  validityDays: number;
  /** The expiry printed on the bank's guarantee. */
  validTo: string;
  /** Bid opening plus `validityDays`. */
  requiredTo: string;
  /** Where the requirement comes from, in words. */
  basis: string;
  page?: number;
  /** How the guarantee came to read as it does, when that matters. */
  note?: string;
}

export interface Dg3Deviation { clause: string; text: string; position: DeviationPosition }

export interface Dg3Risk { text: string; ownerId: string | null; rating: RiskRating }

export interface Dg3Signatory { label: string; personId: string; ready: boolean; note?: string }

export interface Dg3Evidence {
  tenant: string;
  tenderId: string;
  finalPrice: Money;
  marginPct: number;
  dg2Conditions: Dg3Condition[];
  bond: Dg3Bond;
  deviations: Dg3Deviation[];
  risks: Dg3Risk[];
  signatories: Dg3Signatory[];
  /** The tenant source the bid is submitted through (`sources[].id`): its name is read from there. */
  portal: string;
}
