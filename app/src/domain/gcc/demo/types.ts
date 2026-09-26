import type { Lifecycle } from '@/data/gcc/lifecycle';
import type { DemoDone } from '@/domain/gcc/lifecycle';

/**
 * A demo applier (plan 021): it merges the demo actions of one kind (the
 * `done` keys its plan owns) into a tender's lifecycle, so every dashboard,
 * tracker and table reads what a presenter recorded.
 *
 * Rules every applier keeps:
 * - pure: it never mutates `l`, and returns a new object only when it changes something;
 * - idempotent and order-safe: it reads only its own keys, through the rule module that owns them;
 * - it starts from the lifecycle it is given (the seed, or an earlier applier's result).
 */
export interface Applier {
  id: string;
  apply(tenant: string, l: Lifecycle, done: DemoDone): Lifecycle;
}

/** The rule modules take a mutable `Done` type; they only read it. */
export type Done = Record<string, string>;
export const asDone = (done: DemoDone) => done as Done;

/** Whether any `done` key starts with one of the prefixes. */
export const hasKey = (done: DemoDone, ...prefixes: string[]) => Object.keys(done).some((k) => prefixes.some((p) => k.startsWith(p)));

/** The later of two tenant-local ISO times: a step entered by a demo action never starts before the step it follows. */
export const later = (a: string, b: string) => (a > b ? a : b);
