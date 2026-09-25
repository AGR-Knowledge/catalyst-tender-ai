import type { TenantData } from './types';
import { LIFECYCLES, LIFECYCLE_SEEDS } from './lifecycle';
import { historyFrom } from './lifecycle/history';

export type GccTenantKey = 'najd' | 'corniche' | 'dafna' | 'batinah' | 'qurain';

export { INTAKE_DAILY, LIFECYCLES, withDemoState } from './lifecycle';
export type { IntakeDay, Lifecycle } from './lifecycle';

/** A tenant file with its history derived from the lifecycles (plan 017 §3.4), so a decision is stored once. */
function withHistory(key: GccTenantKey): TenantData {
  const { historySeed: _authored, ...seed } = LIFECYCLE_SEEDS[key];
  return { ...seed, history: historyFrom(LIFECYCLES[key]) };
}

/** Seed data for the five GCC tenants (gcc-demo-data §2, §5). Facts only; derivations live in `domain/gcc/**`. */
export const GCC_DATA: Record<GccTenantKey, TenantData> = {
  najd: withHistory('najd'),
  corniche: withHistory('corniche'),
  dafna: withHistory('dafna'),
  batinah: withHistory('batinah'),
  qurain: withHistory('qurain'),
};

export const isGccTenantKey = (key: string): key is GccTenantKey => Object.prototype.hasOwnProperty.call(GCC_DATA, key);

/** The seed for a GCC tenant. Throws for any other key, so a legacy tenant never reads GCC data by accident. */
export function gccData(key: string): TenantData {
  if (!isGccTenantKey(key)) throw new Error(`No GCC seed data for tenant "${key}". GCC tenants: ${Object.keys(GCC_DATA).join(', ')}.`);
  return GCC_DATA[key];
}
