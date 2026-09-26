import type { Ccy } from '../fx';
import type { Incoterm } from './types';

/**
 * Scripted supplier replies for the demo (orchestrator contract, wave 4).
 *
 * After a demo sends RFQs on a demo tender, "Simulate supplier replies"
 * (plan 008b, a labelled demo control; plan 014's "Advance agent work" calls
 * the same thing) submits these replies through the Supplier Portal write
 * (`supplierQuoteWrite`), so the quotes arrive the way a real one does and
 * levelling has something to level. Nothing here is live data.
 *
 * - 008b adds the hero's replies (T-2026-118, every GCC tenant that pursues it).
 * - 022 adds Corniche's T-2026-061; 023 adds Batinah's T-2026-042.
 *   Append to your own tenant's list only; don't reorder others.
 *
 * Each reply carries the levelling traps the demo shows (spec §8.6): a foreign
 * currency, VAT included or not stated, ex-works delivery, a short validity,
 * an exclusion. `vatInclusive` and `incoterm` feed the levelled quote (008b
 * makes the portal quote read them; the portal default is DAP site, VAT excluded).
 */
export interface ScriptedReply {
  tenderId: string;
  packageId: string;
  supplierId: string;
  /** Minutes after the RFQ was sent that the reply "arrives" (for the time shown). */
  afterMinutes: number;
  level: 'line' | 'package';
  amount: number;
  ccy: Ccy;
  validityDays: number;
  leadTimeWeeks: number;
  deviations: string[];
  exclusions: string[];
  fileName: string;
  vatInclusive?: boolean;
  incoterm?: Incoterm;
  /** A supplier that declines instead, with its reason. */
  declines?: string;
}

export const SCRIPTED_REPLIES: Record<'najd' | 'corniche' | 'dafna' | 'batinah' | 'qurain', ScriptedReply[]> = {
  najd: [],
  corniche: [],
  dafna: [],
  batinah: [],
  qurain: [],
};

/** The scripted replies for one package of one tender in one tenant. */
export const repliesFor = (tenant: string, tenderId: string, packageId: string): ScriptedReply[] =>
  (SCRIPTED_REPLIES[tenant as keyof typeof SCRIPTED_REPLIES] ?? []).filter((r) => r.tenderId === tenderId && r.packageId === packageId);
