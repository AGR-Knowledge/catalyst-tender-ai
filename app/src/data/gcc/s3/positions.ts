import type { SeededPosition } from './types';

/**
 * Committee positions already recorded at demo time (gcc-demo-data §8). The
 * members record them asynchronously before the meeting. On Najd's
 * T-2026-097 the Operations Director and the Sector Head have not recorded
 * theirs yet; on Qurain's T-2026-049, issued this morning, only the Technical
 * Director has.
 */

export const SEEDED_POSITIONS: SeededPosition[] = [
  {
    tenant: 'najd', tenderId: 'T-2026-097', seat: 'cfo', stance: 'conditions',
    comment: 'Keep the bid bond within the facility; see my margin condition',
    conditions: ['Keep the bid bond within the facility'],
    marginConditions: ['minimum margin 9%'],
    at: '2026-03-07T18:40', byId: 'najd.member.cfo',
  },
  { tenant: 'najd', tenderId: 'T-2026-097', seat: 'technical', stance: 'support', at: '2026-03-08T08:15', byId: 'najd.member.technical' },
  { tenant: 'qurain', tenderId: 'T-2026-049', seat: 'technical', stance: 'support', at: '2026-03-08T09:45', byId: 'qurain.member.technical' },
];
