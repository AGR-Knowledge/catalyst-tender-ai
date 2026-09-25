import type { Money } from '../types';
import type { GccTenantKey } from '../index';
import type { RoleKey } from '../../types';
import type { Seat } from '../../people';

/**
 * Facts for Stage 3 and DG2 (s1-s3-demo-spec §9–10, as changed by
 * dashboards.md §9): competitors and their evidence, win models, contributor
 * inputs, pack versions, seeded committee positions and the decline letter.
 * Nothing here is derived; `domain/gcc/s3` and `domain/gcc/dg2` compute the
 * pack, quorum, decision and record from it.
 *
 * Conventions as `data/gcc/types.ts`: money in major units, times tenant-local
 * `YYYY-MM-DDTHH:MM`, people as plan 003 ids.
 */

// ---------------------------------------------------------------------------
// Competitors (pack §9.2). Every claim cites evidence: no source, no claim.

export interface Evidence {
  id: string;
  kind: 'award-notice' | 'opening-report' | 'pq-list' | 'market-intel';
  date: string;
  /** Always ends "(synthetic)". */
  title: string;
  /** `.example` hosts only. */
  url: string;
}

export type PricingPosture = 'aggressive' | 'market' | 'premium';

export interface Competitor {
  id: string;
  name: string;
  country: string;
  profile: string;
  claims: { text: string; evidenceIds: string[] }[];
  pricingPosture: PricingPosture;
  recentWins: { title: string; year: number; value?: Money; evidenceId: string }[];
  usuallyJv?: boolean;
  /** Tenants that also hold this company on their JV partner list. */
  alsoPartnerOf?: GccTenantKey[];
}

// ---------------------------------------------------------------------------
// Win model (pack §9.1)

export type WinDriverKey = 'client' | 'value-band' | 'geography' | 'competitors' | 'capacity' | 'price-position' | 'local-content' | 'jv';

export interface WinModel {
  tenant: GccTenantKey;
  tenderId: string;
  base: { pct: number; label: string };
  drivers: { key: WinDriverKey; label: string; points: number; why: string; source: string }[];
  /** Comparable decided bids behind the model; sets the band. */
  comparables: number;
  /** "What would move it". */
  movers: { text: string; points: number }[];
  /** Competitor ids, plus the tenant's own key for its own bid. */
  bidders?: string[];
}

// ---------------------------------------------------------------------------
// Contributor inputs (catalogue §C.6; pack §9.9; the Stage 2 kick-off inputs of 008a)

export type PackInputKey = 'commercial' | 'planning' | 'legal' | 'pd' | 'finance' | 'hr';
export type KickoffInputKey = 'method-statement' | 'hse-plan' | 'key-cvs' | 'programme' | 'estimate' | 'design-basis';
export type InputKey = PackInputKey | KickoffInputKey;

export type FieldKind = 'range' | 'text' | 'choice' | 'list' | 'money' | 'date' | 'number';

export interface InputField {
  name: string;
  label: string;
  kind: FieldKind;
  /** For `choice`. */
  options?: { value: string; label: string }[];
  /** For a `list` of records: the fields of each item. Absent = a list of strings. */
  item?: { name: string; label: string; kind: Exclude<FieldKind, 'list'>; options?: { value: string; label: string }[] }[];
  /** Absent = required. */
  optional?: boolean;
}

export interface InputSpec {
  key: InputKey;
  label: string;
  ownerRole: RoleKey;
  /** The pack section it feeds, e.g. '§9.7', or 'Stage 2 kick-off'. */
  feeds: string;
  fields: InputField[];
}

export interface SeededInput {
  tenant: GccTenantKey;
  tenderId: string;
  key: InputKey;
  /** Plan 017's interim step-fact item id (`s3.inputs.items[].id`). */
  itemId?: string;
  ownerId: string;
  requestedById: string;
  requestedAt: string;
  due: string;
  submittedAt?: string;
  fields?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Pack versions (spec §9)

export type PackSectionId = '9.1' | '9.2' | '9.3' | '9.4' | '9.5' | '9.6' | '9.7' | '9.8' | '9.9' | '9.10';

export type PackRecommendation = 'bid' | 'bid-with-conditions' | 'no-bid';

/** What a pack freezes when it is generated. */
export interface PackSnapshot {
  /** For tenders with no `requirements`: the S1 roll-up as it stood. */
  eligibility?: { met: number; of: number; credentialIds: string[] };
  /** JV structure, when the bid is not as prime. */
  jv?: { partnerId: string; partnerName: string; lead: 'us' | 'partner'; ourSharePct: number };
  sourcing: { packages: number; levelled: number };
  /** Delivery capacity roll-up (§9.4), as the pack read it. The same figures as plan 015's `DELIVERY_LOAD`. */
  portfolio: { asOf: string; currentPct: number; ifWon: { tenderId: string; addPct: number }[]; safePct: number };
  effort: { toDateWeeks: number; toGoWeeks: number; externalCost: Money };
  /** Guarantee terms from the tender documents (§9.5). */
  bonds: { bidPct: number; bidValidityDays: number; performancePct: number; advancePct: number; retentionPct: number; source: string };
  recommendation: { recommendation: PackRecommendation; rationale: string; winThemes: string[]; resourceAsk: string };
}

export interface PackVersion {
  tenant: GccTenantKey;
  tenderId: string;
  version: number;
  generatedAt: string;
  issuedAt?: string;
  snapshot: PackSnapshot;
}

export type RiskRating = 'high' | 'medium' | 'low';

/** One authored difference a re-run produces. `patch` carries the changed values; `change` is the summary line. */
export interface RerunEffect {
  tenant: GccTenantKey;
  tenderId: string;
  fromVersion: number;
  section: PackSectionId;
  change: string;
  changed: boolean;
  patch?: {
    margin?: [number, number];
    marginNote?: string;
    risk?: { clause: string; rating: RiskRating; risk: string; source: string };
  };
}

// ---------------------------------------------------------------------------
// Committee positions (spec §10, dashboards.md §9)

export type Stance = 'support' | 'conditions' | 'oppose' | 'abstain';

export interface SeededPosition {
  tenant: GccTenantKey;
  tenderId: string;
  seat: Seat;
  stance: Stance;
  comment?: string;
  /** As the member wrote them; the domain splits each on ";". */
  conditions?: string[];
  at: string;
  byId: string;
}

// ---------------------------------------------------------------------------
// Letters

/** `{issuer}`, `{reference}`, `{title}`, `{date}`, `{signatory}`, `{company}`. */
export interface LetterTemplate { subject: string; body: string }
