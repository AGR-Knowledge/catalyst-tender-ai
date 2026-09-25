import type { Addendum } from './types';

/**
 * Addenda received (spec §6.8, plan 007a step 5.1). Addendum 2 to Najd's
 * Madinah WTP expansion arrived this morning, while the Bid / No-Bid pack sits
 * with the committee. It changes no dates: the submission stays Sun 26 Apr 10:00.
 * Package IDs and titles are fixed: plan 009a's staleness text uses them.
 */
export const ADDENDA: Addendum[] = [
  {
    id: 'ADD-097-2', tenderId: 'T-2026-097', tenant: 'najd', no: 2,
    ref: 'WCWS/PRJ/2026/0009, Addendum 2',
    receivedAt: '2026-03-08T09:12', intakeEventId: 'IN-0308-09', pages: 3,
    summary: 'Changes the filter media and the treated-water main material; raises the delay damages cap',
    changes: [
      { kind: 'boq', item: '3.07', packageId: 'P-03', topic: 'filter media', from: 'Dual media, 1.2 m', to: 'Dual media with a 600 mm GAC capping layer' },
      { kind: 'boq', item: '9.02', packageId: 'P-09', topic: 'pipe material', from: 'Ductile iron DN1200', to: 'GRP DN1200 PN16' },
      { kind: 'boq', item: '9.03', packageId: 'P-09', topic: 'pipe material', from: 'Ductile iron DN1200', to: 'GRP DN1200 PN16' },
      { kind: 'clause', clause: '58.2 Delay damages cap', page: 2, from: '10% of contract value', to: '15% of contract value' },
    ],
    requote: [
      { packageId: 'P-03', title: 'Filtration', suppliers: 3 },
      { packageId: 'P-09', title: 'Pipes and valves', suppliers: 2 },
    ],
  },
];
