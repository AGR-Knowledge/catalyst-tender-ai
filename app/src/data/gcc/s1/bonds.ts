import type { BondTerms } from './types';

/**
 * Guarantee terms per tender (plan 007a Phase 4). The hero's bid bond rate is
 * in conflict (1% on p. 12, 2% on p. 35) and is read from VAL-118-1; the final
 * guarantee is 5% (§57, p. 18) and the advance payment is up to 10% against an
 * equal guarantee (p. 36). The other rows are the rates the synthetic tenders
 * state, for the same-day triage table; no rate is stated for T-2026-071.
 *
 * The Stage 3 rows carry the terms plan 009a's packs show (plan 020 C9), so the
 * Bid / No-Bid pack reads its bid bond from here. A bond's validity is the
 * tender's stated one; 90 days from opening only when none is stated.
 */
export const BOND_TERMS: BondTerms[] = [
  { tenderId: 'T-2026-118', tenants: '*', bidRateValidationId: 'VAL-118-1', performancePct: 5, performancePage: 18, advancePct: 10, advancePage: 36 },

  // Najd
  { tenderId: 'T-2026-117', tenants: ['najd'], bidPct: 2, bidPage: 3, performancePct: 5, performancePage: 6 },
  { tenderId: 'T-2026-119', tenants: ['najd'], bidPct: 2, bidPage: 4, performancePct: 5 },
  { tenderId: 'T-2026-122', tenants: ['najd'], bidPct: 1, performancePct: 5 },
  { tenderId: 'T-2026-123', tenants: ['najd'], bidPct: 1, performancePct: 5 },
  { tenderId: 'T-2026-124', tenants: ['najd'], bidPct: 1, performancePct: 5 },
  { tenderId: 'T-2026-125', tenants: ['najd'], bidPct: 1, performancePct: 5 },
  { tenderId: 'T-2026-126', tenants: ['najd'], bidPct: 0, performancePct: 5 },
  { tenderId: 'T-2026-127', tenants: ['najd'], bidPct: 1, performancePct: 5 },
  { tenderId: 'T-2026-128', tenants: ['najd'], bidPct: 1, performancePct: 5 },
  // Stage 3 and DG2: KSA government terms
  { tenderId: 'T-2026-097', tenants: ['najd'], bidPct: 2, bidValidityDays: 120, performancePct: 5, advancePct: 10,
    source: 'Instructions to Bidders cl. 17; Conditions of Contract cl. 4.2, 14.2 and 14.3' },
  { tenderId: 'T-2026-101', tenants: ['najd'], bidPct: 2, bidValidityDays: 120, performancePct: 5, advancePct: 10,
    source: 'Instructions to Bidders cl. 16; Conditions of Contract cl. 4.2, 14.2 and 14.3' },

  // Corniche
  { tenderId: 'T-2026-061', tenants: ['corniche'], bidPct: 2, performancePct: 10 },
  { tenderId: 'T-2026-063', tenants: ['corniche'], bidPct: 2, performancePct: 10 },
  { tenderId: 'T-2026-029', tenants: ['corniche'], bidPct: 2, bidValidityDays: 90, performancePct: 10, advancePct: 10,
    source: 'Invitation to tender cl. 12; Conditions of Contract cl. 4.2 and 14.2' },

  // Dafna
  { tenderId: 'T-2026-033', tenants: ['dafna'], bidPct: 2, performancePct: 10 },
  { tenderId: 'T-2026-034', tenants: ['dafna'], bidPct: 2, performancePct: 10 },

  // Batinah
  { tenderId: 'T-2026-042', tenants: ['batinah'], bidPct: 1, performancePct: 10 },

  // Qurain
  { tenderId: 'T-2026-049', tenants: ['qurain'], bidPct: 2, bidValidityDays: 90, performancePct: 10, advancePct: 5,
    source: 'CAPT tender documents: Instructions to Tenderers cl. 9; Conditions of Contract cl. 10 and 14' },
];
