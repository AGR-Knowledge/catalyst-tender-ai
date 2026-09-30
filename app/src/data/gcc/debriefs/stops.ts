import type { StoppedBy } from './vocab';

/**
 * Who stopped a withdrawn bid, and why (plan 035 step 1.1). Every `closedNote`
 * a withdrawn bid carries in the five tenants, from the live rows, plan 004's
 * folded history and the generator's fixed lists (`generate.ts`, `fold.ts`),
 * maps to who stopped it and a `CANCEL_REASONS` (employer) or
 * `WITHDRAW_REASONS` (us) id. The employer's stops read as "Cancelled by the
 * employer"; ours as "Withdrawn".
 *
 * A note missing from this table reads as withdrawn for another reason, and
 * dev check 74 row 2 fails, so a new note is caught the day it is written.
 * A DG1 Hold that lapsed ("Held at DG1; …") is not a bid and needs no entry.
 */

export interface StopNote { by: StoppedBy; reason: string }

export const STOP_NOTES: Record<string, StopNote> = {
  // The employer stopped it.
  'The employer cancelled the tender': { by: 'employer', reason: 'other' },
  'The employer cancelled the tender after opening': { by: 'employer', reason: 'over-budget' },
  'The employer cancelled the tender after opening, to re-tender it': { by: 'employer', reason: 'procedure' },
  'The employer cancelled the tender before the deadline': { by: 'employer', reason: 'budget' },
  'The employer cancelled the tender before submission': { by: 'employer', reason: 'budget' },
  'The employer cancelled the tender to re-scope it': { by: 'employer', reason: 'scope' },
  'The employer cancelled the tender when its budget was withdrawn': { by: 'employer', reason: 'budget' },
  'The employer moved the budget to 2027 and cancelled the tender': { by: 'employer', reason: 'budget' },
  'The employer postponed the tender indefinitely': { by: 'employer', reason: 'postponed' },
  'The client postponed the tender indefinitely': { by: 'employer', reason: 'postponed' },
  'The employer re-scoped the works to re-tender them later': { by: 'employer', reason: 'scope' },
  // We stopped it.
  'Supplier quotes could not meet the local content minimum': { by: 'us', reason: 'local-content' },
  'The JV partner withdrew': { by: 'us', reason: 'partner' },
  'The JV partner withdrew; the bid cannot meet the PQ alone': { by: 'us', reason: 'partner' },
  'Withdrawn in sourcing: no compliant quotes for the main packages': { by: 'us', reason: 'quotes' },
};

/** Who stopped a bid with this note, and why; unknown notes read as ours, for another reason. */
export const stopOf = (note: string | undefined): StopNote => (note && STOP_NOTES[note]) || { by: 'us', reason: 'other' };

/** Whether the note is in the table (dev check 74 row 2). */
export const isKnownStop = (note: string | undefined) => !!note && note in STOP_NOTES;
