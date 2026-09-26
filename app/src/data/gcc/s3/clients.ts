import type { ClientBid } from './types';

/**
 * Najd's decided bids to WCWS before the lifecycles' window, 2022–2024: two
 * awards from three bids. The win model's client driver on T-2026-097 and its
 * "delivery record with WCWS" win theme cite them. Synthetic projects; the
 * client name is the register's issuer for T-2026-097.
 */

const WCWS = { tenant: 'najd', client: 'Western Cities Water Services Company', clientShort: 'WCWS' } as const;

export const CLIENT_BIDS: ClientBid[] = [
  { ...WCWS, id: 'najd-wcws-2022', title: 'Madinah North WTP clarifier upgrade', year: 2022, result: 'won' },
  { ...WCWS, id: 'najd-wcws-2023', title: 'Yanbu Road water transmission main', year: 2023, result: 'lost' },
  { ...WCWS, id: 'najd-wcws-2024', title: 'Madinah WTP filter rehabilitation', year: 2024, result: 'won' },
];
