/**
 * The debrief's words (wave 11 contract, orchestrator 2026-09-30; plan 035
 * owns this file from here and may only add). Every screen that names an
 * ending, a reason, a factor or a lesson area reads it from here, so the form,
 * the record, the archive, the Bid record and the dashboards say the same
 * thing. UK English, sentence case (ui-direction §10).
 */

export interface VocabItem<K extends string = string> { id: K; label: string }

/** How a bid ended. DG1 discards are not bids and have no ending. */
export type Ending = 'won' | 'lost' | 'cancelled' | 'withdrawn' | 'no-bid' | 'rejected';
/** Won and lost read as themselves; the other four are "Stopped". */
export type EndingGroup = 'won' | 'lost' | 'stopped';

export const ENDINGS: VocabItem<Ending>[] = [
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'cancelled', label: 'Cancelled by the employer' },
  { id: 'withdrawn', label: 'Withdrawn' },
  { id: 'no-bid', label: 'No-Bid at DG2' },
  { id: 'rejected', label: 'Rejected at DG3' },
];

export const ENDING_GROUPS: VocabItem<EndingGroup>[] = [
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'stopped', label: 'Stopped' },
];

export const groupOf = (e: Ending): EndingGroup => (e === 'won' || e === 'lost' ? e : 'stopped');

/** A debrief's state (ui-direction §7.3). "Due" and "Overdue" turn on `DEBRIEF_DUE_DAYS` after the ending. */
export type DebriefStatus = 'due' | 'overdue' | 'submitted' | 'sent-back' | 'accepted';

export const DEBRIEF_STATUSES: VocabItem<DebriefStatus>[] = [
  { id: 'due', label: 'Due' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'sent-back', label: 'Sent back' },
  { id: 'accepted', label: 'Accepted' },
];

/** The five loss reasons of `Result.lossReason`, in one place (the title-case words; `lifecycle.port.ts` keeps its in-sentence forms). */
export type LossReason = 'price' | 'technical' | 'local-content' | 'pq' | 'other';

export const LOSS_REASONS: VocabItem<LossReason>[] = [
  { id: 'price', label: 'Price' },
  { id: 'technical', label: 'Technical' },
  { id: 'local-content', label: 'Local content' },
  { id: 'pq', label: 'Prequalification' },
  { id: 'other', label: 'Other' },
];

export const LOSS_LABEL = Object.fromEntries(LOSS_REASONS.map((r) => [r.id, r.label])) as Record<LossReason, string>;

export const WIN_REASONS: VocabItem[] = [
  { id: 'price', label: 'Lowest compliant price' },
  { id: 'technical', label: 'Best technical score' },
  { id: 'local-content', label: 'Local content score' },
  { id: 'track-record', label: 'Track record with the employer' },
  { id: 'programme', label: 'Shortest programme' },
  { id: 'alternative', label: 'Alternative offer (value engineering)' },
  { id: 'partner', label: 'Partner or supplier strength' },
  { id: 'other', label: 'Other' },
];

export const CANCEL_REASONS: VocabItem[] = [
  { id: 'budget', label: 'Budget or funding withdrawn' },
  { id: 'over-budget', label: 'Every bid was over the budget' },
  { id: 'scope', label: 'Scope changed, to be tendered again' },
  { id: 'postponed', label: 'Project postponed' },
  { id: 'procedure', label: 'Procedure annulled' },
  { id: 'other', label: 'Other' },
];

export const WITHDRAW_REASONS: VocabItem[] = [
  { id: 'partner', label: 'Our partner withdrew' },
  { id: 'quotes', label: 'Supplier quotes could not meet the requirements' },
  { id: 'local-content', label: 'The local content minimum could not be met' },
  { id: 'capacity', label: 'No team capacity' },
  { id: 'risk', label: 'Contract risk too high' },
  { id: 'other', label: 'Other' },
];

/** "What else decided it": up to three per debrief, for every ending. */
export const FACTORS: VocabItem[] = [
  { id: 'price-level', label: 'Price level' },
  { id: 'technical', label: 'Technical solution' },
  { id: 'programme', label: 'Programme' },
  { id: 'local-content', label: 'Local content' },
  { id: 'credentials', label: 'Prequalification and credentials' },
  { id: 'quotes', label: 'Supplier quotes' },
  { id: 'partner', label: 'Partner or JV' },
  { id: 'relationship', label: 'Relationship with the employer' },
  { id: 'compliance', label: 'Compliance and deviations' },
  { id: 'bid-quality', label: 'Quality of the bid documents' },
  { id: 'capacity', label: 'Team capacity' },
  { id: 'terms', label: 'Commercial terms and risk' },
  { id: 'clarifications', label: 'Clarifications and queries' },
];

export const MAX_FACTORS = 3;
export const MAX_LESSONS = 3;

export type LessonArea = 'pricing' | 'technical' | 'sourcing' | 'compliance' | 'relationship' | 'bid-decision' | 'process';

export const LESSON_AREAS: VocabItem<LessonArea>[] = [
  { id: 'pricing', label: 'Pricing' },
  { id: 'technical', label: 'Technical' },
  { id: 'sourcing', label: 'Sourcing and suppliers' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'relationship', label: 'Employer relationship' },
  { id: 'bid-decision', label: 'Bid decision' },
  { id: 'process', label: 'Bid process' },
];

/** The employer's own debrief meeting (won, lost, cancelled). */
export type EmployerDebriefState = 'held' | 'booked' | 'not-offered' | 'not-asked';

export const EMPLOYER_DEBRIEF: VocabItem<EmployerDebriefState>[] = [
  { id: 'held', label: 'Held' },
  { id: 'booked', label: 'Booked' },
  { id: 'not-offered', label: 'Not offered' },
  { id: 'not-asked', label: 'We did not ask' },
];

export type BidAgain = 'yes' | 'conditions' | 'no';

export const BID_AGAIN: VocabItem<BidAgain>[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'conditions', label: 'Yes, with conditions' },
  { id: 'no', label: 'No' },
];

/** Stopped endings: were we right to stop when we did? */
export type StoppedEarlier = 'dg1' | 'before-sourcing' | 'right-time';

export const STOPPED_EARLIER: VocabItem<StoppedEarlier>[] = [
  { id: 'dg1', label: 'Yes, at DG1' },
  { id: 'before-sourcing', label: 'Yes, before sourcing' },
  { id: 'right-time', label: 'No, it was the right time' },
];

/** The rival picker's two fixed choices beside the tenant's rivals. */
export const RIVAL_OTHER = 'other';
export const RIVAL_UNKNOWN = 'unknown';
export const RIVAL_FIXED: VocabItem[] = [
  { id: RIVAL_OTHER, label: 'Another bidder' },
  { id: RIVAL_UNKNOWN, label: 'Not known' },
];

export const labelOf = (list: VocabItem[], id: string | null | undefined): string => list.find((x) => x.id === id)?.label ?? (id ?? '');

// ---------------------------------------------------------------------------
// Additions (plan 035)

/** A loss reason inside a sentence: "Lost on price", "Lost on the technical score" (the close note and the action rows). */
export const LOSS_IN_SENTENCE: Record<LossReason, string> = {
  price: 'price', technical: 'the technical score', 'local-content': 'local content', pq: 'prequalification', other: 'other grounds',
};

/** A win reason in a tile's one-line detail ("Price 3 · Track record 2"): the list's words are too long for it. */
export const WIN_SHORT: Record<string, string> = {
  price: 'Price', technical: 'Technical', 'local-content': 'Local content', 'track-record': 'Track record', programme: 'Programme',
  alternative: 'Alternative', partner: 'Partner', other: 'Other',
};

/** Who stopped a withdrawn bid: the employer (it reads as cancelled) or us. */
export type StoppedBy = 'employer' | 'us';

/** A lesson that names a price is refused: the Bid record holds the figures. */
export const NO_MONEY_TEXT = 'Keep prices out of lessons: Bid record holds them';

/**
 * Gate reason codes the seed uses that the gate screens' own lists (plan
 * 009a's `NO_BID_REASONS`, plan 018's `DG3_REJECT_REASONS`) don't name.
 */
export const SEED_GATE_REASONS: Record<string, string> = {
  'contract-risk': 'Contract risk', 'price-competition': 'Price competitiveness',
};
