import type { GccTenantKey } from '../index';
import type { S2Tender, Supplier } from './types';
import { NAJD_SUPPLIERS } from './suppliers/najd';
import { CORNICHE_SUPPLIERS } from './suppliers/corniche';
import { DAFNA_SUPPLIERS } from './suppliers/dafna';
import { BATINAH_SUPPLIERS } from './suppliers/batinah';
import { QURAIN_SUPPLIERS } from './suppliers/qurain';
import { NAJD_S2 } from './tenders/najd';
import { BATINAH_S2, CORNICHE_S2, DAFNA_S2, QURAIN_S2 } from './tenders/others';

/**
 * Stage 2 facts per GCC tenant (plan 008a). The hero's packages are built
 * from `data/gcc/hero.ts` in `domain/gcc/s2/context.ts`; its extra facts are
 * in `tenders/hero.ts`.
 */

export const S2_SUPPLIERS: Record<GccTenantKey, Supplier[]> = {
  najd: NAJD_SUPPLIERS,
  corniche: CORNICHE_SUPPLIERS,
  dafna: DAFNA_SUPPLIERS,
  batinah: BATINAH_SUPPLIERS,
  qurain: QURAIN_SUPPLIERS,
};

/** Seeded Stage 2 tenders (not the hero, which has no RFQs until a pursue in the demo). */
export const S2_TENDERS: Record<GccTenantKey, S2Tender[]> = {
  najd: NAJD_S2,
  corniche: CORNICHE_S2,
  dafna: DAFNA_S2,
  batinah: BATINAH_S2,
  qurain: QURAIN_S2,
};

export { HERO_S2_PACKAGES, HERO_S2_TERMS } from './tenders/hero';
export * from './benchmarks';
export type * from './types';
