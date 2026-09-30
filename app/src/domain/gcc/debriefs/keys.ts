/**
 * The debrief's `done` keys (wave 11 contract). Values are JSON strings, read
 * with `readDone` from `domain/gcc/s3/done.ts`:
 * - `debrief:{TID}`: the latest `DebriefSubmission` (a re-submission overwrites it, with `round` + 1);
 * - `debrief-back:{TID}`: the latest `DebriefSendBack`;
 * - `debrief-ok:{TID}`: the `DebriefAcceptance` of a round.
 *
 * The demo applier (`demo/60-debrief.apply.ts`) imports this file and the
 * vocabulary only, never `./index`: that would loop through `lifecycle.ts`.
 * Settings › Reset demo clears these keys with the rest of the tenant's state.
 */

export const debriefKey = (tenderId: string) => `debrief:${tenderId}`;
export const debriefBackKey = (tenderId: string) => `debrief-back:${tenderId}`;
export const debriefOkKey = (tenderId: string) => `debrief-ok:${tenderId}`;

/** The prefixes, for `hasKey` in the applier. */
export const DEBRIEF_PREFIXES = ['debrief:', 'debrief-back:', 'debrief-ok:'] as const;
