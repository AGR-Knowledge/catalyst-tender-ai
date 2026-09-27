import type { Money } from '../types';
import type { Ccy } from '../fx';
import type { Dg3Evidence } from './types';

/**
 * The DG3 packs waiting for the Head of Tendering (plan 018 step 1.2), one per
 * tenant: the tender each lifecycle seed has at `dg3-issued`. Synthetic, and
 * consistent with that lifecycle row: its currency, its estimate (the final
 * price sits about 1% under it) and its submission deadline (bids are opened
 * at the deadline, and the guarantee must hold for the tender's stated days
 * after that). Each tenant's guarantee rule matches the Stage 8 bonds its own
 * seed carries.
 *
 * Four packs are clean. Qurain's carries the catch: the bank issued the
 * guarantee against the original closing date, so it expires three days
 * before the tender requires. Nothing else in that pack is wrong.
 */

const m = (amount: number, ccy: Ccy): Money => ({ amount, ccy });

export const DG3_EVIDENCE: Dg3Evidence[] = [
  // Najd: T-2025-305 Yanbu STP expansion, SAR 150 M estimate, Etimad, deadline Sun 15 Mar 10:00. Clean (dashboards.md §12.4).
  {
    tenant: 'najd', tenderId: 'T-2025-305',
    finalPrice: m(148_620_000, 'SAR'), marginPct: 10.2,
    dg2Conditions: [{ text: 'Minimum margin 9%', kind: 'min-margin', minPct: 9 }],
    bond: {
      amount: m(2_972_400, 'SAR'), requiredPct: 2, validityDays: 90, validTo: '2026-06-20', requiredTo: '2026-06-13',
      basis: 'Instructions to Bidders: an initial guarantee of 2% of the bid price, valid for 90 days after bid opening',
    },
    deviations: [
      { clause: 'Conditions of Contract cl. 8.7', text: 'Delay damages of 0.1% a day, capped at 10% of the contract price', position: 'accepted' },
      { clause: 'Conditions of Contract cl. 17.6', text: 'Total liability capped at the contract price, with loss of profit and indirect loss excluded', position: 'qualified' },
    ],
    risks: [
      { text: 'Tie-ins to the live plant need shutdowns the employer has not yet scheduled', ownerId: 'najd.dir', rating: 'high' },
      { text: 'Membrane modules on an 18-week lead time against a 20-week window', ownerId: 'najd.proc', rating: 'medium' },
      { text: 'Ductile iron pipe prices may move before award', ownerId: 'najd.comm', rating: 'medium' },
    ],
    signatories: [
      { label: 'Form of Tender and bid letter, under the power of attorney', personId: 'najd.exec', ready: true },
      { label: 'Price schedules and technical forms', personId: 'najd.bid', ready: true },
    ],
    portal: 'etimad',
  },

  // Corniche: T-2026-004 Khalifa City school cluster MEP, AED 64 M estimate, deadline Thu 12 Mar 14:00. Clean.
  {
    tenant: 'corniche', tenderId: 'T-2026-004',
    finalPrice: m(63_150_000, 'AED'), marginPct: 11.6,
    dg2Conditions: [{ text: 'Minimum margin 10%', kind: 'min-margin', minPct: 10 }],
    bond: {
      amount: m(3_157_500, 'AED'), requiredPct: 5, validityDays: 120, validTo: '2026-07-17', requiredTo: '2026-07-10',
      basis: 'Instructions to Tenderers: a tender bond of 5% of the tender price, valid for 120 days after tender opening',
    },
    deviations: [
      { clause: 'Particular Conditions Sub-Clause 8.8', text: 'Delay damages capped at 10% of the Contract Price', position: 'accepted' },
      { clause: 'Particular Conditions Sub-Clause 4.1', text: "Design liability limited to our MEP design; no fitness-for-purpose duty on the architect's design", position: 'qualified' },
    ],
    risks: [
      { text: 'Chillers on a 22-week delivery against the first school’s summer handover', ownerId: 'corniche.proc', rating: 'high' },
      { text: 'Noisy work limited near schools that stay open during construction', ownerId: 'corniche.plan', rating: 'medium' },
      { text: 'Copper cable prices may move before award', ownerId: 'corniche.comm', rating: 'medium' },
    ],
    signatories: [
      { label: 'Form of Tender, under the power of attorney', personId: 'corniche.exec', ready: true },
      { label: 'Priced bill and technical submittals', personId: 'corniche.bid', ready: true },
    ],
    portal: 'abudhabi-portal',
  },

  // Dafna: T-2025-436 Al Rayyan sewer rehabilitation, QAR 95 M estimate, Monaqasat, deadline Thu 12 Mar 12:00. Clean.
  {
    tenant: 'dafna', tenderId: 'T-2025-436',
    finalPrice: m(93_480_000, 'QAR'), marginPct: 9.8,
    dg2Conditions: [{ text: 'Minimum margin 8.5%', kind: 'min-margin', minPct: 8.5 }],
    bond: {
      amount: m(1_869_600, 'QAR'), requiredPct: 2, validityDays: 90, validTo: '2026-06-17', requiredTo: '2026-06-10',
      basis: 'Tender conditions: a tender bond of 2% of the tender price, valid for 90 days after tender opening',
    },
    deviations: [
      { clause: 'General Conditions cl. 47', text: 'Delay damages capped at 10% of the contract value', position: 'accepted' },
      { clause: 'Particular Conditions cl. 20.4', text: 'Ground conditions worse than the baseline report are shared, not ours alone', position: 'qualified' },
    ],
    risks: [
      { text: 'Live sewer flows during lining need over-pumping at 14 manholes', ownerId: 'dafna.dir', rating: 'high' },
      { text: 'Traffic diversion permits on the main road take up to six weeks', ownerId: 'dafna.plan', rating: 'medium' },
      { text: 'Lining resin comes from a single approved source', ownerId: 'dafna.proc', rating: 'medium' },
    ],
    signatories: [
      { label: 'Form of Tender, under the power of attorney', personId: 'dafna.exec', ready: true },
      { label: 'Priced bill and method statements', personId: 'dafna.bid', ready: true },
    ],
    portal: 'monaqasat',
  },

  // Batinah: T-2026-020 Duqm port access road, section 3, OMR 22 M estimate, deadline Thu 12 Mar 12:00. Clean.
  {
    tenant: 'batinah', tenderId: 'T-2026-020',
    finalPrice: m(21_740_000, 'OMR'), marginPct: 8.9,
    dg2Conditions: [{ text: 'Minimum margin 8%', kind: 'min-margin', minPct: 8 }],
    bond: {
      amount: m(434_800, 'OMR'), requiredPct: 2, validityDays: 90, validTo: '2026-06-17', requiredTo: '2026-06-10',
      basis: 'Instructions to Bidders: a bid bond of 2% of the bid price, valid for 90 days after bid opening',
    },
    deviations: [
      { clause: 'Conditions of Contract cl. 47', text: 'Delay damages capped at 10% of the contract price', position: 'accepted' },
      { clause: 'Conditions of Contract cl. 55', text: 'Rock excavation measured separately, not included in the earthworks rate', position: 'qualified' },
    ],
    risks: [
      { text: 'Wadi crossings at chainage 4+200 fall in the rain season', ownerId: 'batinah.dir', rating: 'high' },
      { text: 'Bitumen prices may move before award', ownerId: 'batinah.comm', rating: 'medium' },
      { text: 'Aggregate haul distance from the nearest licensed quarry', ownerId: 'batinah.plan', rating: 'low' },
    ],
    signatories: [
      { label: 'Form of Bid, under the power of attorney', personId: 'batinah.exec', ready: true },
      { label: 'Priced bill and technical schedules', personId: 'batinah.bid', ready: true },
    ],
    portal: 'tender-board',
  },

  // Qurain: T-2025-428 Wafra water injection pipeline, KWD 11 M estimate, the operator's vendor portal, deadline Thu 12 Mar 13:00.
  // The catch: the guarantee holds 90 days from the original closing date (Mon 9 Mar), so it ends 3 days before the tender requires.
  {
    tenant: 'qurain', tenderId: 'T-2025-428',
    finalPrice: m(10_870_000, 'KWD'), marginPct: 11.4,
    dg2Conditions: [{ text: 'Minimum margin 10%', kind: 'min-margin', minPct: 10 }],
    bond: {
      amount: m(217_400, 'KWD'), requiredPct: 2, validityDays: 90, validTo: '2026-06-07', requiredTo: '2026-06-10',
      basis: 'Instructions to Tenderers: an initial bank guarantee of 2% of the tender price, valid for 90 days after tender opening',
      note: 'The bank issued it on Mon 2 Mar against the original closing date, Mon 9 Mar. Addendum 1 moved closing to Thu 12 Mar',
    },
    deviations: [
      { clause: 'General Conditions cl. 24', text: 'Delay damages capped at 10% of the contract value', position: 'accepted' },
      { clause: 'Special Conditions cl. 7.3', text: 'Line pipe price adjusted for steel above a stated index', position: 'qualified' },
    ],
    risks: [
      { text: 'Work permits inside a live oil field slow daily access', ownerId: 'qurain.dir', rating: 'high' },
      { text: 'Line pipe on a 16-week lead time from a single mill', ownerId: 'qurain.proc', rating: 'medium' },
      { text: 'Hydrotest water supply at the Wafra end', ownerId: 'qurain.plan', rating: 'low' },
    ],
    signatories: [
      { label: 'Form of Tender, under the power of attorney', personId: 'qurain.exec', ready: true },
      { label: 'Priced schedules and technical forms', personId: 'qurain.bid', ready: true },
    ],
    portal: 'og-portal',
  },
];
