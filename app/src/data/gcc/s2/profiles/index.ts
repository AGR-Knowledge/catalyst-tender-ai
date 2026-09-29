import { isGccTenantKey } from '../../index';
import { S2_SUPPLIERS } from '../index';
import { generateProfile } from './generate';
import { overrideOf } from './featured';
import type { SupplierProfileSeed } from './types';

/**
 * Supplier profiles (plan 031): one for every supplier in every GCC tenant's
 * master, generated on first read and kept for the session (the generator is
 * deterministic, so a reload reads the same values).
 */

const CACHE = new Map<string, SupplierProfileSeed>();

export function supplierProfileSeed(tenant: string, id: string): SupplierProfileSeed | null {
  if (!isGccTenantKey(tenant)) return null;
  const key = `${tenant}:${id}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const s = S2_SUPPLIERS[tenant].find((x) => x.id === id);
  if (!s) return null;
  const seed = generateProfile(s, tenant, overrideOf(tenant, id));
  CACHE.set(key, seed);
  return seed;
}

export { FEATURED } from './featured';
export { BAND, QUARTERS, TRADE_PACKAGE, WINDOW_FROM, blockOf, currencyOf, demonymOf, kindOf, wonInWindow } from './generate';
export type * from './types';
