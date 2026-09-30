import type { Lifecycle } from '@/data/gcc/lifecycle';
import type { Person } from '@/data/people';
import { archiveOf } from './archive';
import { endingOfLifecycle } from './endings';
import { draftFor as draft, validateDebrief as validate } from './form';
import { debriefForImpl } from './vm';
import { acceptWrite, backWrite, submitWrite, type DebriefWriteError } from './writers';
import type {
  ArchiveFilters, ArchiveVM, DebriefCtx, DebriefInput, DebriefValidation, DebriefVM, DebriefWriteResult, Ending,
} from './types';

/**
 * Debriefs: why a bid was won, lost or stopped, recorded by the Project
 * Director and accepted by the Head of Tendering (wave 11).
 *
 * The contract's functions (orchestrator, 2026-09-30), filled by plan 035.
 * Plans 036 and 037 import only from here (and the types and vocabulary):
 * - `endings.ts`: how a bid ended, its due date and status;
 * - `records.ts`: the seed (`data/gcc/debriefs`) merged with the demo's keys, scoped to the viewer;
 * - `vm.ts`: the Debrief tab's view model and the shared words;
 * - `form.ts`: the draft and the rules; `writers.ts`: the three writes;
 * - `archive.ts`: the archive and its breakdowns.
 * The demo applier (`demo/60-debrief.apply.ts`) reads the keys directly, never
 * this file, which would loop through `lifecycle.ts`.
 */

export * from './types';
export * from './keys';
export * from '@/data/gcc/debriefs/vocab';

export type { DebriefWriteError };
/** A write refused, in words (the DG3 pattern). */
export const isDebriefError = (r: object): r is DebriefWriteError => 'error' in r;

/** How a bid ended, or null: still live, a DG1 discard, or a DG1 hold that lapsed. */
export function endingOf(l: Lifecycle): Ending | null {
  return endingOfLifecycle(l);
}

/** The Debrief tab's view model, or null when the tender has no ending or the viewer may not open it. */
export function debriefFor(ctx: DebriefCtx, tenderId: string): DebriefVM | null {
  return debriefForImpl(ctx, tenderId);
}

/** The form's starting value: the last submission after a send-back, else pre-set from the facts (the result's loss reason and place, the employer's debrief date). */
export function draftFor(vm: DebriefVM): DebriefInput {
  return draft(vm);
}

/** Every rule of the form, as sentences the form shows after the first submit. */
export function validateDebrief(input: DebriefInput, vm: DebriefVM): DebriefValidation {
  return validate(input, vm);
}

/** The Project Director submits (or re-submits after a send-back). Needs `debrief.record`. */
export function debriefSubmitWrite(ctx: DebriefCtx, input: DebriefInput, person: Person, at: string, opts?: { viewAs?: boolean }): DebriefWriteResult | DebriefWriteError {
  return submitWrite(ctx, input, person, at, opts);
}

/** The Head of Tendering accepts the latest submission into the archive. Needs `debrief.accept`. */
export function debriefAcceptWrite(ctx: DebriefCtx, tenderId: string, person: Person, at: string, opts?: { viewAs?: boolean }): DebriefWriteResult | DebriefWriteError {
  return acceptWrite(ctx, tenderId, person, at, opts);
}

/** The Head of Tendering sends the latest submission back with a note (required). Needs `debrief.accept`. */
export function debriefBackWrite(ctx: DebriefCtx, tenderId: string, note: string, person: Person, at: string, opts?: { viewAs?: boolean }): DebriefWriteResult | DebriefWriteError {
  return backWrite(ctx, tenderId, note, person, at, opts);
}

/** The archive for the viewer: every ended bid in the period, narrowed by the filters, with the breakdowns. */
export function archiveFor(ctx: DebriefCtx, filters: ArchiveFilters): ArchiveVM {
  return archiveOf(ctx, filters);
}
