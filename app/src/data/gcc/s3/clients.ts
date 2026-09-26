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
  // Plan 022: Corniche's award from CBHH, delivered in 2022 (project corniche-p3); T-2026-061's client driver cites it.
  { tenant: 'corniche', client: 'Crescent Bay Health Holding', clientShort: 'CBHH', id: 'corniche-cbhh-2020', title: 'Abu Dhabi specialist hospital MEP', year: 2020, result: 'won' },
  // Plan 023: Batinah's decided bids to the Interior Links Roads Authority, by award year, 2017–2024 (the vault's ILRA
  // projects, and one loss); T-2026-042's client driver cites them.
  { tenant: 'batinah', client: 'Interior Links Roads Authority', clientShort: 'the Authority', id: 'batinah-ilra-2017', title: 'Barka–Nakhal road dualling', year: 2017, result: 'won' },
  { tenant: 'batinah', client: 'Interior Links Roads Authority', clientShort: 'the Authority', id: 'batinah-ilra-2019', title: 'Wadi crossing bridges, Saham', year: 2019, result: 'won' },
  { tenant: 'batinah', client: 'Interior Links Roads Authority', clientShort: 'the Authority', id: 'batinah-ilra-2020', title: 'Sohar industrial port access road', year: 2020, result: 'won' },
  { tenant: 'batinah', client: 'Interior Links Roads Authority', clientShort: 'the Authority', id: 'batinah-ilra-2021', title: 'Ibri–Yanqul road dualling', year: 2021, result: 'won' },
  { tenant: 'batinah', client: 'Interior Links Roads Authority', clientShort: 'the Authority', id: 'batinah-ilra-2024', title: 'Liwa interchange and service roads', year: 2024, result: 'lost' },
];
