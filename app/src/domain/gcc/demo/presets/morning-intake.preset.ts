import { TENANTS } from '@/data/tenants';
import { recipe } from './recipe';
import type { Preset } from './types';

/** "Start: morning intake" (spec §16): the seed, this morning's captures in Stage 1. It writes nothing after the reset. */
export const preset: Preset = {
  id: 'morning-intake',
  label: 'Start: morning intake',
  line: 'The seed: this morning’s captures in Stage 1, nothing decided today.',
  order: 1,
  tenants: 'all',
  build(tenant) {
    const name = TENANTS.find((t) => t.key === tenant)?.name ?? tenant;
    return recipe(tenant).plan(
      this.label,
      `${name} reset to its seed.`,
      '/',
      'Start: morning intake. Back at the seed: this morning’s captures are in Stage 1 and nothing is decided today. Showing the dashboard.',
    );
  },
};
