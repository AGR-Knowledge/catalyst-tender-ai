import type { Person } from '@/data/people';
import type { RoleKey } from '@/data/types';

/**
 * Where each person lands (dashboards.md §8.3): the portfolio for the Head of
 * Tendering, the CEO and the Bid Manager; their own stage for stage owners;
 * My requests for Finance and HR. The supplier and the Catalyst operator have
 * their own shells (plans 008, 011).
 */
const HOME: Record<RoleKey, string | null> = {
  hot: 'portfolio.hot', exec: 'portfolio.exec', bid: 'portfolio.bid',
  coord: 'stage.1', proc: 'stage.2', member: 'stage.3', plan: 'stage.4', comm: 'stage.5',
  prop: 'stage.6', comp: 'stage.7', dir: 'stage.9',
  fin: 'requests', hr: 'requests',
  supplier: null, platform: null,
};

export const homeDashboardKey = (person: Person): string | null => HOME[person.role];

export const stageDashboardKey = (n: number) => `stage.${n}`;

/** The stage of a 'stage.n' key, or null. */
export function stageOfKey(key: string): number | null {
  const m = /^stage\.(\d)$/.exec(key);
  return m ? Number(m[1]) : null;
}
