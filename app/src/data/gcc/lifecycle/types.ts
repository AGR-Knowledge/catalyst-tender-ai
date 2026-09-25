import type { Ccy } from '../fx';
import type { Money } from '../types';
import type { Seat } from '@/data/people';
import type { StageN } from '../stages';

/**
 * One lifecycle per GCC tender (dashboards.md §12.1): when it entered each
 * stage and step, who had it, every gate decision, its submission and its
 * result. It is the single source for the dashboards: the period filter, the
 * graph, the table and the tracker all read it. Plan 004's history records are
 * folded into it, so a decision is written once.
 *
 * Conventions follow `data/gcc/types.ts`: money in major units, times as
 * tenant-local ISO `YYYY-MM-DDTHH:MM`, people as plan 003 ids.
 */

export type { StageN };

/** An entry into a stage and step. The stage's steps are in `data/gcc/stages.ts`. */
export interface StageEntry { stage: StageN; step: string; at: string; ownerId: string | null }

export type GateKind = 'DG1' | 'DG2' | 'DG3';
export type GateDecision = 'pursue' | 'discard' | 'hold' | 'bid' | 'no-bid' | 'approved' | 'rejected';

export interface GateRecord {
  gate: GateKind;
  decision: GateDecision;
  at: string;
  byId: string;
  /** When the gate opened: M1 for DG1, pack issue for DG2 and DG3. */
  openedAt: string;
  slaHours: number;
  onTime: boolean;
  reasonCodes: string[];
  /** DG2: the approval went against the majority of recorded positions. */
  againstMajority?: boolean;
  /** Trigger of a later re-open, if the decision was re-opened. */
  reopened?: string;
  note?: string;
  /** DG1 only: the agent's recommendation. Pursue on a Discard one, or Discard on a Pursue one, is an override. */
  recommendation?: 'pursue' | 'conditions' | 'discard';
}

export interface Submission { at: string; deadline: string; onTime: boolean; portal: string; receipt?: string }

export interface Result {
  at: string;
  result: 'won' | 'lost' | 'withdrawn' | 'cancelled';
  /** Our place and the number of bidders: [2, 6] is second of six. */
  rank?: [number, number];
  gapToWinnerPct?: number;
  lossReason?: 'price' | 'technical' | 'local-content' | 'pq' | 'other';
  /** Win probability (%) shown at DG2, for calibration (OUT-4). */
  predictedWin?: number;
  value?: Money;
}

/**
 * Dated work inside Stages 4–9. `at` is when it happened; an M2 or a review
 * that is due but not yet done has no `at` (plan 017 deviation: the plan's
 * shape made `at` required, which cannot say "due Tue 10 Mar, not yet held").
 */
export type WorkEvent =
  | { kind: 'replan' | 'reprice'; at: string; turnaroundH: number; trigger: string }
  | { kind: 'm2'; at?: string; due: string }
  | { kind: 'review'; at?: string; due: string }
  | { kind: 'lessons'; at: string }
  | { kind: 'handover'; at: string };

// ---------------------------------------------------------------------------
// Step facts: the current step's numbers, for live tenders only (plan 017 §1.2).
// The stage dashboards (plan 013) read them. Plans 007–009 later replace the
// Stage 1–3 ones with derivations and check that the two agree.

export interface S1Facts {
  stage: 1;
  eligibility: { pass: number; atRisk: number; fail: number };
  documents: 'downloaded' | { fee: Money; purchaseBy: string; requestedById?: string; requestedAt?: string };
  language: 'EN' | 'AR' | 'EN+AR';
  dg1Due?: string;
}

export interface S2Facts {
  stage: 2;
  packages: { total: number; covered: number };
  rfqs: { sent: number; total: number; overdue: number; escalated: number; answeredOnTime: number; dueSoFar: number };
  toLevel: number;
  /** Share of BOQ value with no compliant quote route, in percent. */
  notCoveredPct: number;
  repliesDue: string;
  clarifications: { open: number; stale: number };
  bestFitApproved: number;
}

export type Stance = 'support' | 'conditions' | 'oppose' | 'abstain';
export interface Position { stance: Stance; at: string; comment?: string }

export interface InputItem {
  id: string;
  what: string;
  /** Pack section, e.g. '9.7 Bonds and facility'. */
  section: string;
  ownerId: string;
  requestedById: string;
  requestedAt: string;
  due: string;
  submittedAt?: string;
}

export interface S3Facts {
  stage: 3;
  pack: 'preparation' | 'issued';
  issuedAt?: string;
  inputs: { requested: number; outstanding: number; late: number; items: InputItem[] };
  stale?: { since: string; reason: string };
  /** `recorded` equals the number of `bySeat` entries (checked in dev-checks/40-lifecycle). */
  positions: { recorded: number; of: 5; bySeat: Partial<Record<Seat, Position>> };
  /** Win probability and its band, in percentage points: 58 ± 8. */
  win: { p: number; band: number };
  /** Margin range in percent: [8.5, 11.5]. */
  marginRange: [number, number];
  /** Bank guarantee headroom left after this bid's initial guarantee. */
  facilityAfter: Money;
  /** Value × win probability, once the pack is issued (DEC-4). */
  weightedValue?: Money;
}

export interface S4Facts {
  stage: 4;
  durationPlannedM: number;
  durationRequiredM: number;
  /** Float on the critical path, in days. Negative when the programme does not fit. */
  floatDays: number;
  longLeadAtRisk: number;
  peakManpower: number;
  baselineDue: string;
  m2Due: string;
  /** Another tender whose peak key resources overlap with this one (PLN-4). */
  clashWith?: string;
}

export interface S5Facts {
  stage: 5;
  estPrice: Money;
  baseMarginPct: number;
  minMarginPct: number;
  sourcedPct: number;
  estimatedPct: number;
  financeCheck: 'pending' | 'confirmed';
  priceDue: string;
  m2Due: string;
}

export interface S6Facts {
  stage: 6;
  sections: { locked: number; total: number; late: number };
  simScore: number;
  passMark: number;
  smeOverdue: number;
  redTeamAt?: string;
  reusePct: number;
}

export interface S7Facts {
  stage: 7;
  requirements: { evidenced: number; total: number };
  mandatoryGaps: number;
  redlinesOpen: number;
  risksWithoutOwner: number;
  dg3IssuedAt?: string;
}

export interface S8Facts {
  stage: 8;
  packageReadyPct: number;
  signaturesPending: number;
  bond: { amount: Money; validTo: string; requiredTo: string; issued: boolean };
  openingDate: string;
  expectedAwardBy?: string;
}

export interface S9Facts {
  stage: 9;
  handoverAt?: string;
  debriefAt?: string;
  lessons: boolean;
}

/** Discriminated by `stage`, which always equals the lifecycle's current stage. */
export type StepFacts = S1Facts | S2Facts | S3Facts | S4Facts | S5Facts | S6Facts | S7Facts | S8Facts | S9Facts;

export type ClosedAs = 'discarded' | 'no-bid' | 'rejected' | 'withdrawn' | 'won' | 'lost';

/**
 * Where a lifecycle comes from:
 * - `story`: a row of gcc-demo-data §5.1 or another row of plan 004's register;
 * - `live`: hand-authored by plan 017 (dashboards.md §12.2 and §12.5);
 * - `history`: built from one of plan 004's history records (DG1, DG2 or outcome);
 * - `generated`: made by `generate.ts` to reach the flow targets.
 */
export type LifecycleOrigin = 'story' | 'live' | 'history' | 'generated';

export interface Lifecycle {
  tenderId: string;
  title: string;
  shortTitle: string;
  issuer: string;
  city: string;
  country: string;
  sector: string;
  value: { amount: number; ccy: Ccy; basis: 'published' | 'estimate' | 'not-stated' };
  clientType?: 'government' | 'semi-government' | 'private';
  teamId: string;
  bidManagerId: string | null;
  source: { sourceId: string; ref: string; url?: string; documentHref?: string };
  capturedAt: string;
  submissionDeadline?: { date: string; time: string };
  /** Ordered. The last entry is the current stage and step for live tenders. */
  log: StageEntry[];
  gates: GateRecord[];
  submission?: Submission;
  result?: Result;
  closedAt?: string;
  closedAs?: ClosedAs;
  /** Why it closed, in words ("Employer cancelled the tender"). */
  closedNote?: string;
  events: WorkEvent[];
  /** Live tenders only: the current step's numbers. */
  facts?: StepFacts;
  restricted?: boolean;
  origin: LifecycleOrigin;
}

/** Capture volumes for one day (dashboards.md §12.1): counts, not notices. */
export interface IntakeDay {
  date: string;
  /** New notices captured, per source id. Duplicates and addenda are not here: they are `linked`. */
  bySource: Record<string, number>;
  /** Duplicates and addenda matched to a tender already on the register. */
  linked: number;
  /** New notices given a TID. */
  logged: number;
  /** Logged notices whose screening (eligibility and fit) finished. */
  screened: number;
  /** Intake-to-logged minutes, one per logged notice, so INT-2's p90 over any window is exact. */
  minutes: number[];
  /** Notices on a portal's daily list that were not captured (the 06:00 reconciliation). */
  missed: number;
}
