import type { AuditEvent } from '@/state/store';
import type { GccTenantKey } from '@/data/gcc';

/**
 * Scenario presets (plan 014, spec §16): a presenter starts a demo script from
 * a known state in one click. A preset is a recipe, not a snapshot: it builds
 * its `done` keys with the domain writers that own them, in the order a
 * presenter would click them, on the demo clock. The store resets the tenant,
 * then records the writes and the audit entries in one step (`applyPreset`).
 */

/** One `done` key and its value, as `mark()` takes it. */
export interface Write { key: string; value: string }

/** An audit entry before the store stamps its id and demo time. */
export type AuditDraft = Omit<AuditEvent, 'id' | 'at'>;

export interface PresetPlan {
  writes: Write[];
  /** The presenter's summary entry first, then each writer's own entry, in order. */
  audit: AuditDraft[];
  /** Where the preset lands. */
  to: string;
  /** The toast: what happened and where the presenter now is. */
  message: string;
}

export type PresetResult = PresetPlan | { unavailable: string };

export interface Preset {
  id: string;
  /** "Start: RFQs out". */
  label: string;
  /** One line for the Demo menu. */
  line: string;
  /** Menu order. */
  order: number;
  /** Where it runs; elsewhere `build` returns the reason. */
  tenants: GccTenantKey[] | 'all';
  /** `seedDone` is the tenant's `done` after the reset: the seed, `{}`. */
  build(tenant: GccTenantKey, seedDone: Readonly<Record<string, string>>): PresetResult;
}

export const isPlan = (r: PresetResult): r is PresetPlan => 'writes' in r;
