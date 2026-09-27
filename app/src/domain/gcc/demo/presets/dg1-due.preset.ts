import { HERO_ID } from '@/data/gcc/hero';
import { plural } from '@/domain/gcc/s1/common';
import { dg1PackFor } from '@/domain/gcc/dg1';
import { recipe, resolveHeroBlockers } from './recipe';
import type { Preset } from './types';

/**
 * "Start: DG1 due" (spec §16, script A): the hero's fields that block DG1
 * resolved as the Coordinator would, so its DG1 pack is ready. DG1 itself is
 * left to the presenter, so it runs in every tenant, including those where
 * the agent recommends discard.
 */
export const preset: Preset = {
  id: 'dg1-due',
  label: 'Start: DG1 due',
  line: 'The hero’s blocking fields resolved: its DG1 pack is ready for the decision.',
  order: 2,
  tenants: 'all',
  build(tenant) {
    const r = recipe(tenant);
    const n = resolveHeroBlockers(r);
    const pack = dg1PackFor(tenant, HERO_ID, r.done());
    if (!pack || pack.locked) throw new Error(pack?.locked?.reason ?? `No DG1 pack for ${HERO_ID}`);
    return r.plan(
      this.label,
      `${HERO_ID}: ${plural(n, 'field')} that blocked DG1 resolved by the Coordinator. DG1 is not recorded.`,
      `/dg1?tender=${HERO_ID}`,
      `Start: DG1 due. ${plural(n, 'field')} that blocked DG1 ${n === 1 ? 'is' : 'are'} resolved, so the hero’s DG1 pack is ready. The agent recommends: ${pack.recommendation.recommendation}. Showing DG1.`,
    );
  },
};
