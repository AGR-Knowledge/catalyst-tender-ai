import type { PrepTypical } from './types';

/**
 * Typical preparation time per tender type, in working days from capture to
 * submission, taken from each tenant's own past bids (SCR-8, plan 007a step
 * 4.3). `n` is how many past bids the figure comes from.
 */
export const PREP_TYPICAL: PrepTypical[] = [
  // Najd
  { tenant: 'najd', procurement: 'two-file', sector: 'Water and wastewater', workingDays: 28, n: 12 },
  { tenant: 'najd', procurement: 'open', sector: 'Utility networks', workingDays: 18, n: 9 },
  { tenant: 'najd', procurement: 'pq', sector: 'Water and wastewater', workingDays: 15, n: 6 },
  { tenant: 'najd', procurement: 'open', sector: 'Water and wastewater', workingDays: 20, n: 8 },
  { tenant: 'najd', procurement: 'open', sector: 'Roads', workingDays: 16, n: 10 },
  { tenant: 'najd', procurement: 'limited', sector: 'Water and wastewater', workingDays: 18, n: 4 },

  // Corniche
  { tenant: 'corniche', procurement: 'two-file', sector: 'Buildings MEP', workingDays: 25, n: 5 },
  { tenant: 'corniche', procurement: 'open', sector: 'Buildings MEP', workingDays: 17, n: 11 },
  { tenant: 'corniche', procurement: 'open', sector: 'District cooling', workingDays: 20, n: 4 },
  { tenant: 'corniche', procurement: 'limited', sector: 'Fit-out', workingDays: 9, n: 6 },

  // Dafna
  { tenant: 'dafna', procurement: 'two-file', sector: 'Utility networks', workingDays: 26, n: 3 },
  { tenant: 'dafna', procurement: 'open', sector: 'Utility networks', workingDays: 18, n: 8 },
  { tenant: 'dafna', procurement: 'open', sector: 'Pump stations', workingDays: 15, n: 5 },

  // Batinah
  { tenant: 'batinah', procurement: 'two-file', sector: 'Roads', workingDays: 24, n: 4 },
  { tenant: 'batinah', procurement: 'open', sector: 'Roads', workingDays: 16, n: 14 },
  { tenant: 'batinah', procurement: 'open', sector: 'Bridges', workingDays: 18, n: 5 },

  // Qurain
  { tenant: 'qurain', procurement: 'two-file', sector: 'Water', workingDays: 27, n: 6 },
  { tenant: 'qurain', procurement: 'open', sector: 'Water', workingDays: 20, n: 10 },
  { tenant: 'qurain', procurement: 'pq', sector: 'Water', workingDays: 14, n: 4 },
  { tenant: 'qurain', procurement: 'open', sector: 'Infrastructure', workingDays: 18, n: 6 },
];
