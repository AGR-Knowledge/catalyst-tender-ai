import { HERO_ID } from '../hero';
import { HERO_EFFORT_HOURS_PER_WEEK, HERO_EFFORT_WINDOW } from '../tenants/najd';
import type { EffortEstimate } from './types';

/**
 * Bid-team effort if a Stage 1 tender is pursued (spec §6.9, plan 007a step
 * 7.1): each shortlisted or low-fit S1 tender with no team commitment yet.
 * Najd's hero reuses 004's figures; every window runs from demo today to the
 * tender's submission date.
 */
export const EFFORT: EffortEstimate[] = [
  // Najd
  { tenant: 'najd', tenderId: HERO_ID, teamId: 'najd-water', hoursPerWeek: HERO_EFFORT_HOURS_PER_WEEK, ...HERO_EFFORT_WINDOW,
    note: 'Two-file bid: technical proposal, BOQ pricing of 236 lines and 11 packages' },
  { tenant: 'najd', tenderId: 'T-2026-117', teamId: 'najd-networks', hoursPerWeek: 40, from: '2026-03-08', to: '2026-04-14',
    note: 'Re-measured network rehabilitation; one-envelope bid' },
  { tenant: 'najd', tenderId: 'T-2026-119', teamId: 'najd-water', hoursPerWeek: 50, from: '2026-03-08', to: '2026-04-26',
    note: 'Marine works need a specialist estimating partner' },
  { tenant: 'najd', tenderId: 'T-2026-123', teamId: 'najd-water', hoursPerWeek: 15, from: '2026-03-08', to: '2026-04-05', note: 'Service contract pricing' },
  { tenant: 'najd', tenderId: 'T-2026-124', teamId: 'najd-networks', hoursPerWeek: 10, from: '2026-03-08', to: '2026-03-29', note: 'Supply-only price schedule' },
  { tenant: 'najd', tenderId: 'T-2026-125', teamId: 'najd-networks', hoursPerWeek: 20, from: '2026-03-08', to: '2026-04-09', note: 'Metering programme and data services' },
  { tenant: 'najd', tenderId: 'T-2026-126', teamId: 'najd-water', hoursPerWeek: 12, from: '2026-03-08', to: '2026-03-31', note: 'Consultancy proposal' },
  { tenant: 'najd', tenderId: 'T-2026-127', teamId: 'najd-networks', hoursPerWeek: 30, from: '2026-03-08', to: '2026-04-15', note: 'Resurfacing and lighting BOQ' },
  { tenant: 'najd', tenderId: 'T-2026-128', teamId: 'najd-water', hoursPerWeek: 15, from: '2026-03-08', to: '2026-03-29', note: 'Small works; hand-delivered bid' },

  // Corniche
  { tenant: 'corniche', tenderId: HERO_ID, teamId: 'corniche-mep', hoursPerWeek: 55, from: '2026-03-08', to: '2026-05-10', note: 'MEP scope only; process works would need a partner' },
  { tenant: 'corniche', tenderId: 'T-2026-061', teamId: 'corniche-mep', hoursPerWeek: 60, from: '2026-03-08', to: '2026-04-21', note: 'Hospital MEP with medical gases' },
  { tenant: 'corniche', tenderId: 'T-2026-063', teamId: 'corniche-mep', hoursPerWeek: 25, from: '2026-03-08', to: '2026-03-24', note: 'Fit-out bid, due just after Eid' },

  // Dafna
  { tenant: 'dafna', tenderId: HERO_ID, teamId: 'dafna-utilities', hoursPerWeek: 60, from: '2026-03-08', to: '2026-05-10', note: 'Share of a JV bid with the partner as lead' },
  { tenant: 'dafna', tenderId: 'T-2026-033', teamId: 'dafna-utilities', hoursPerWeek: 50, from: '2026-03-08', to: '2026-04-28', note: 'Multi-utility corridor BOQ' },
  { tenant: 'dafna', tenderId: 'T-2026-034', teamId: 'dafna-utilities', hoursPerWeek: 30, from: '2026-03-08', to: '2026-04-14', note: 'Pump station upgrade' },

  // Batinah
  { tenant: 'batinah', tenderId: HERO_ID, teamId: 'batinah-roads', hoursPerWeek: 50, from: '2026-03-08', to: '2026-05-10', note: 'Outside the team\'s sector: process works need a partner' },
  { tenant: 'batinah', tenderId: 'T-2026-042', teamId: 'batinah-roads', hoursPerWeek: 60, from: '2026-03-08', to: '2026-04-26', note: 'Dual carriageway BOQ' },

  // Qurain
  { tenant: 'qurain', tenderId: HERO_ID, teamId: 'qurain-water', hoursPerWeek: 60, from: '2026-03-08', to: '2026-05-10', note: 'Two-file bid through the KSA subsidiary' },
  { tenant: 'qurain', tenderId: 'T-2026-071', teamId: 'qurain-water', hoursPerWeek: 20, from: '2026-03-08', to: '2026-04-05', note: 'Would need an IT partner' },
];
