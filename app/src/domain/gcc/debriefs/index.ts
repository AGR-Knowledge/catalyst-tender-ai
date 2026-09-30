import type { Lifecycle } from '@/data/gcc/lifecycle';
import type { Person } from '@/data/people';
import type {
  ArchiveFilters, ArchiveVM, DebriefCtx, DebriefInput, DebriefValidation, DebriefVM, DebriefWriteResult, Ending,
} from './types';

/**
 * Debriefs: why a bid was won, lost or stopped, recorded by the Project
 * Director and accepted by the Head of Tendering (wave 11).
 *
 * CONTRACT STUBS (orchestrator, 2026-09-30). Plan 035 replaces every body
 * below and keeps every signature; plans 036 and 037 import only from here
 * (and the types and vocabulary). Until 035 lands, the stubs return "nothing
 * ended" and refuse writes, so the screens render their empty states.
 */

export * from './types';
export * from './keys';
export * from '@/data/gcc/debriefs/vocab';

/** A write refused, in words (the DG3 pattern). */
export interface DebriefWriteError { error: string }
export const isDebriefError = (r: object): r is DebriefWriteError => 'error' in r;

const NOT_BUILT = 'Debriefs are not built yet (plan 035)';

/** How a bid ended, or null: still live, a DG1 discard, or a DG1 hold that lapsed. */
export function endingOf(_l: Lifecycle): Ending | null {
  return null;
}

/** The Debrief tab's view model, or null when the tender has no ending or the viewer may not open it. */
export function debriefFor(_ctx: DebriefCtx, _tenderId: string): DebriefVM | null {
  return null;
}

/** The form's starting value: the last submission after a send-back, else pre-set from the facts (the result's loss reason and place, the employer's debrief date). */
export function draftFor(vm: DebriefVM): DebriefInput {
  return { tenderId: vm.tenderId, main: null, factors: [], lessons: [] };
}

/** Every rule of the form, as sentences the form shows after the first submit. */
export function validateDebrief(_input: DebriefInput, _vm: DebriefVM): DebriefValidation {
  return { ok: false, errors: [NOT_BUILT] };
}

/** The Project Director submits (or re-submits after a send-back). Needs `debrief.record`. */
export function debriefSubmitWrite(_ctx: DebriefCtx, _input: DebriefInput, _person: Person, _at: string, _opts?: { viewAs?: boolean }): DebriefWriteResult | DebriefWriteError {
  return { error: NOT_BUILT };
}

/** The Head of Tendering accepts the latest submission into the archive. Needs `debrief.accept`. */
export function debriefAcceptWrite(_ctx: DebriefCtx, _tenderId: string, _person: Person, _at: string, _opts?: { viewAs?: boolean }): DebriefWriteResult | DebriefWriteError {
  return { error: NOT_BUILT };
}

/** The Head of Tendering sends the latest submission back with a note (required). Needs `debrief.accept`. */
export function debriefBackWrite(_ctx: DebriefCtx, _tenderId: string, _note: string, _person: Person, _at: string, _opts?: { viewAs?: boolean }): DebriefWriteResult | DebriefWriteError {
  return { error: NOT_BUILT };
}

/** The archive for the viewer: every ended bid in the period, narrowed by the filters, with the breakdowns. */
export function archiveFor(_ctx: DebriefCtx, filters: ArchiveFilters): ArchiveVM {
  return {
    filters, sectors: [],
    totals: { endings: 0, won: 0, lost: 0, stopped: 0, accepted: 0, submitted: 0, sentBack: 0, due: 0, overdue: 0 },
    winReasons: [], lossReasons: [], factors: [], rivals: [], stopped: [], stoppedEarlier: [], lessonAreas: [], rows: [],
  };
}
