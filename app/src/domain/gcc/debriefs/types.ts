import type { Tone } from '@/data/types';
import type { Money } from '@/data/gcc/types';
import type { Person } from '@/data/people';
import type { DemoDone } from '@/domain/gcc/lifecycle';
import type {
  BidAgain, DebriefStatus, EmployerDebriefState, Ending, EndingGroup, LessonArea, LossReason, StoppedEarlier, VocabItem,
} from '@/data/gcc/debriefs/vocab';

/**
 * The debrief contract (wave 11, orchestrator 2026-09-30). Plan 035 fills the
 * functions in `index.ts`; plans 036 (the workspace tab) and 037 (the archive
 * and Bid record) read only these types and those functions. 035 may add
 * optional fields here; nobody removes or renames one.
 *
 * Conventions: times are tenant-local ISO `YYYY-MM-DDTHH:MM`, days
 * `YYYY-MM-DD`, people plan 003 ids, money in major units.
 */

export type { BidAgain, DebriefStatus, EmployerDebriefState, Ending, EndingGroup, LessonArea, LossReason, StoppedEarlier, VocabItem };

/** Who is reading, and the demo state they read it with. `now` is the demo clock (`nextAt()` or `DEMO_NOW`). */
export interface DebriefCtx { tenant: string; viewer: Person; done: DemoDone; now: string }

export interface Lesson { area: LessonArea; text: string }

/** What the Project Director records: the form's value. Reason and factor ids come from `data/gcc/debriefs/vocab.ts`. */
export interface DebriefInput {
  tenderId: string;
  /**
   * The main reason: a `WIN_REASONS`, `LOSS_REASONS`, `CANCEL_REASONS` or
   * `WITHDRAW_REASONS` id, by ending. Null for No-Bid and rejected: the
   * gate's reason codes stand, read-only.
   */
  main: string | null;
  /** Lost only: required when `main` differs from the result's loss reason. Both are kept. */
  mainNote?: string;
  /** `FACTORS` ids, 1 to `MAX_FACTORS`. */
  factors: string[];
  /** Won or lost: a rival id, `RIVAL_OTHER` or `RIVAL_UNKNOWN`. Lost: who won (required). Won: our closest rival (optional). */
  rivalId?: string;
  /** Our place and the number of bidders, only when the result doesn't state them and the employer told us. */
  place?: [number, number];
  /** Won, lost and cancelled: the employer's debrief meeting. `said` is required when it was held. */
  employer?: { state: EmployerDebriefState; at?: string; said?: string };
  /** 1 to `MAX_LESSONS`, each a sentence or more. */
  lessons: Lesson[];
  /** Every ending: would we bid for this employer again? */
  bidAgain?: BidAgain;
  /** Stopped endings: were we right to stop when we did? */
  stoppedEarlier?: StoppedEarlier;
  /** Stopped endings, optional: what would have let us bid. */
  wouldLetUsBid?: string;
}

export interface DebriefSubmission extends DebriefInput { at: string; byId: string; round: number }
export interface DebriefSendBack { at: string; byId: string; note: string; round: number }
export interface DebriefAcceptance { at: string; byId: string; round: number }

/** One ended bid's debrief, from the seed (generated or featured) or the demo. */
export interface DebriefRecord {
  tenderId: string;
  ending: Ending;
  endedAt: string;
  /** `DEBRIEF_DUE_DAYS` after the ending. */
  dueBy: string;
  /** The latest submission. */
  submission?: DebriefSubmission;
  /** The latest send-back, when it is later than the latest submission. */
  sentBack?: DebriefSendBack;
  /** The acceptance of the latest submission. */
  accepted?: DebriefAcceptance;
  source: 'generated' | 'featured' | 'demo';
}

/** What we know about the ending, read-only, from the lifecycle (the tab's "What we know" card). */
export interface DebriefFacts {
  value?: Money;
  /** From the result, when it states them. */
  place?: [number, number];
  lossReason?: LossReason;
  /** `S9Facts.debriefAt`: the employer's debrief meeting, held or booked. */
  employerDebriefAt?: string;
  /** No-Bid or rejected: the gate's reason labels. Withdrawn or cancelled: the close note, as one item. */
  gateReasons?: string[];
  gateAt?: string;
  gateById?: string;
  /** A No-Bid's lessons, written at DG2. */
  dg2Lessons?: string;
  /** Which letter Library › 07 Result holds, if any. */
  letter?: 'award' | 'regret' | 'cancellation';
}

/** The Debrief tab's view model (plan 036). */
export interface DebriefVM {
  tenderId: string;
  title: string;
  employer: string;
  sector: string;
  ending: Ending;
  endingLabel: string;
  group: EndingGroup;
  endedAt: string;
  dueBy: string;
  status: DebriefStatus;
  /** "Due by Thu 19 Mar", "Overdue since Thu 19 Mar", "Submitted Sun 8 Mar, 10:04", "Sent back Sun 8 Mar, 10:12", "Accepted Sun 8 Mar, 10:20". */
  statusText: string;
  statusTone: Tone;
  facts: DebriefFacts;
  record: DebriefRecord;
  /** The tenant's Project Director (records) and Head of Tendering (accepts). */
  recorderId: string | null;
  approverId: string | null;
  /** The main-reason choices for this ending; null for No-Bid and rejected (the gate's reasons stand). */
  mainChoices: VocabItem[] | null;
  /** Which of the form's six sections apply to this ending. 1 (main reason), 2 (factors) and 5 (lessons) always do. */
  sections: { competition: boolean; employer: boolean; bidAgain: boolean; stoppedEarlier: boolean };
  /** The tenant's rivals for the competition picker, then `RIVAL_FIXED`. */
  rivals: VocabItem[];
  /** "Fill in an example" (a demo control), where `data/gcc/debriefs/examples.ts` has one. */
  example?: DebriefInput;
}

export interface DebriefWriteResult {
  writes: { key: string; value: string }[];
  audit: { actorId: string; action: string; target?: string; detail?: string }[];
  /** "What happens when you confirm", one sentence each; the first is the toast. */
  effects: string[];
}

export interface DebriefValidation { ok: boolean; errors: string[] }

// ---------------------------------------------------------------------------
// The archive (plan 037) and the Bid record's debrief lines

export type ArchivePeriod = '30d' | '90d' | '12m';

export interface ArchiveFilters { period: ArchivePeriod; sector?: string; group?: EndingGroup }

/** One row of "Every debrief", and of the CSV. Values are already masked for the viewer. */
export interface ArchiveRow {
  tenderId: string;
  title: string;
  employer: string;
  sector: string;
  ending: Ending;
  endingLabel: string;
  group: EndingGroup;
  endedAt: string;
  /** The main reason's label; No-Bid and rejected show the gate's reasons, joined. Empty until submitted. */
  mainLabel: string;
  factorLabels: string[];
  /** Lost: who won. Won: our closest rival. A name, "Another bidder" or "Not known". */
  rival?: string;
  place?: [number, number];
  lessons: Lesson[];
  bidAgain?: BidAgain;
  status: DebriefStatus;
  statusText: string;
  statusTone: Tone;
  recordedById?: string;
  submittedAt?: string;
  acceptedById?: string;
  acceptedAt?: string;
}

/** A count behind a bar or a list row. `tenderIds` filters the table. */
export interface CountRow { id: string; label: string; count: number; share: number; tenderIds: string[] }

export interface ArchiveVM {
  filters: ArchiveFilters;
  /** The sectors present in the period, for the chip row. */
  sectors: string[];
  totals: { endings: number; won: number; lost: number; stopped: number; accepted: number; submitted: number; sentBack: number; due: number; overdue: number };
  /** Accepted won debriefs by main reason. */
  winReasons: CountRow[];
  /** Accepted lost debriefs by main reason, with our median place where known, and the top factor. */
  lossReasons: (CountRow & { place?: [number, number]; placeN: number; topFactor?: { label: string; count: number } })[];
  /** Factors cited in accepted won and lost debriefs. */
  factors: { id: string; label: string; wins: number; losses: number; winIds: string[]; lossIds: string[] }[];
  /** Rivals named as the winner in accepted lost debriefs. */
  rivals: { id: string; name: string; beatUs: number; sectors: string[]; place?: [number, number]; tenderIds: string[] }[];
  /** Stopped endings by kind, each with its reasons. */
  stopped: { ending: Ending; label: string; count: number; reasons: CountRow[]; tenderIds: string[] }[];
  /** "Should we have stopped earlier?" answers on accepted stopped debriefs. */
  stoppedEarlier: CountRow[];
  /** Lessons in accepted debriefs by area, with the latest two. */
  lessonAreas: { id: LessonArea; label: string; count: number; latest: { tenderId: string; text: string; byId: string; at: string }[]; tenderIds: string[] }[];
  rows: ArchiveRow[];
}
