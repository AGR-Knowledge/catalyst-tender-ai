/**
 * Resource plan behind the T-2026-041 baseline programme (Stage 4), and the
 * clashes it has with other live bids. Over-capacity months, the open clash
 * count and the hire decision are derived in domain/live.ts.
 */

export const RESOURCE_PLAN = {
  tender: 'T-2026-041',
  resource: 'Erection crews',
  /** Crews the company can field without hiring. */
  capacity: 6,
  /** Crews added if the temporary hire is approved. */
  hire: 2,
  hireCost: 1.1,
  /** Programme months if awarded, crews needed in each. */
  months: [
    { m: 'Jun', y: 26, v: 2 }, { m: 'Jul', y: 26, v: 3 }, { m: 'Aug', y: 26, v: 4 }, { m: 'Sep', y: 26, v: 5 },
    { m: 'Oct', y: 26, v: 6 }, { m: 'Nov', y: 26, v: 8 }, { m: 'Dec', y: 26, v: 8 }, { m: 'Jan', y: 27, v: 7 },
    { m: 'Feb', y: 27, v: 6 }, { m: 'Mar', y: 27, v: 5 }, { m: 'Apr', y: 27, v: 3 }, { m: 'May', y: 27, v: 2 },
  ],
};

export interface ClashDef {
  key: string;
  title: string;
  body: string;
  /** Other bid involved, if any. */
  with?: string;
}

/** Clashes other than the crew shortage, which is derived from the histogram. */
export const CLASHES: ClashDef[] = [
  {
    key: 'crane',
    title: '250 t crawler crane, one owned',
    body: 'Transformer erection on T-2026-041 needs it from November. Tower yards on T-2026-038 book it from October to January.',
    with: 'T-2026-038',
  },
];

export const CLEAR_CHECKS = [
  { key: 'test', title: 'Testing and commissioning team', body: 'Available through the programme. No overlap with other live bids.' },
  { key: 'gis', title: 'GIS jointing specialists', body: 'Supplier provides them under the switchgear package.' },
];
