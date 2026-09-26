import { NAJD } from '../tenants/najd';
import { CORNICHE } from '../tenants/corniche';
import { QURAIN } from '../tenants/qurain';
import type { PackVersion, RerunEffect } from './types';

/**
 * Bid / No-Bid pack versions as the agent generated them (spec §9), and the
 * authored differences a re-run produces. A re-run in the demo (`pack-rerun:`)
 * creates the next version from the previous one plus these effects; the
 * previous version is kept for comparison.
 *
 * The safe delivery level is each tenant's fit model's, and the guarantee
 * terms are plan 007a's bond terms; the pack keeps only the retention.
 */

const SAR = (amount: number) => ({ amount, ccy: 'SAR' as const });

/** Najd's delivery capacity roll-up, as of Thu 5 Mar: the same figures as plan 015's `DELIVERY_LOAD`. */
const NAJD_PORTFOLIO = {
  asOf: '2026-03-05',
  currentPct: 58,
  ifWon: [{ tenderId: 'T-2026-097', addPct: 9 }, { tenderId: 'T-2026-101', addPct: 4 }],
  safePct: NAJD.fit.safeDeliveryPct,
};

const RETENTION_10 = { retentionPct: 10 };
const AED = (amount: number) => ({ amount, ccy: 'AED' as const });
const KWD = (amount: number) => ({ amount, ccy: 'KWD' as const });

const NAJD_PACKS: PackVersion[] = [
  {
    tenant: 'najd', tenderId: 'T-2026-097', version: 1, generatedAt: '2026-03-07T14:10', issuedAt: '2026-03-07T14:10',
    snapshot: {
      eligibility: {
        met: 16, of: 16,
        credentialIds: ['najd-cr', 'najd-zakat', 'najd-gosi', 'najd-chamber', 'najd-class-water', 'najd-sca', 'najd-saudization', 'najd-vat', 'najd-iso', 'najd-lc'],
      },
      sourcing: { packages: 9, levelled: 7 },
      portfolio: NAJD_PORTFOLIO,
      effort: { toDateWeeks: 14, toGoWeeks: 9, externalCost: SAR(180_000) },
      bonds: RETENTION_10,
      recommendation: {
        recommendation: 'bid-with-conditions',
        rationale: 'Core water treatment work for a repeat client with a good payment record. Local content and a competitive price position put the win probability well above the water hit rate. Bid on condition that the bid bond stays inside the facility and the delivery load is managed if the Abha STP is also won.',
        winThemes: [
          'Local content above the minimum, with Saudi suppliers on the main packages',
          { text: 'Delivery record with WCWS on water treatment', cites: ['najd-wcws-2022', 'najd-wcws-2024'] },
          'Price position in the lower quartile of past awards, on levelled quotes',
        ],
        resourceAsk: 'Keep the Water tendering team on the bid through to submission, and confirm the Project Director designate and the process lead now',
      },
    },
  },
  {
    tenant: 'najd', tenderId: 'T-2026-101', version: 1, generatedAt: '2026-03-08T08:00',
    snapshot: {
      eligibility: {
        met: 14, of: 14,
        credentialIds: ['najd-cr', 'najd-zakat', 'najd-gosi', 'najd-chamber', 'najd-class-water', 'najd-sca', 'najd-saudization', 'najd-vat', 'najd-lc'],
      },
      sourcing: { packages: 8, levelled: 5 },
      portfolio: NAJD_PORTFOLIO,
      effort: { toDateWeeks: 8, toGoWeeks: 12, externalCost: SAR(140_000) },
      bonds: RETENTION_10,
      recommendation: {
        recommendation: 'bid',
        rationale: 'An STP upgrade in the lead sector that builds the treatment-plant record in the south-west. The bond and contract-risk sections wait for the Finance and Legal inputs.',
        winThemes: ['Treatment-plant record with Saudi utilities', 'Live-plant upgrade experience without loss of treatment'],
        resourceAsk: 'Share the process lead with the Madinah WTP bid, and open a site office in Abha if won',
      },
    },
  },
];

/** Corniche's and Qurain's Stage 3 tenders (Dafna and Batinah have none). */
const OTHER_PACKS: PackVersion[] = [
  {
    tenant: 'corniche', tenderId: 'T-2026-029', version: 1, generatedAt: '2026-03-06T13:00',
    snapshot: {
      eligibility: { met: 11, of: 11, credentialIds: ['corniche-licence', 'corniche-class-dm', 'corniche-chamber', 'corniche-vat', 'corniche-icv', 'corniche-iso', 'corniche-civil-defence'] },
      sourcing: { packages: 8, levelled: 7 },
      portfolio: { asOf: '2026-03-05', currentPct: 55, ifWon: [{ tenderId: 'T-2026-029', addPct: 7 }], safePct: CORNICHE.fit.safeDeliveryPct },
      effort: { toDateWeeks: 6, toGoWeeks: 7, externalCost: AED(95_000) },
      bonds: RETENTION_10,
      recommendation: {
        recommendation: 'bid',
        rationale: 'University MEP works in the lead sector, for a government-backed developer that pays on time. The programme fits with room to spare. The bond section waits for the Finance input.',
        winThemes: ['Education-sector MEP record in the UAE', 'A programme inside the employer\'s, with the chiller lead time covered'],
        resourceAsk: 'Keep the Buildings MEP estimator on the bid to submission, and plan the October peak with the Al Reem tower team',
      },
    },
  },
  {
    tenant: 'qurain', tenderId: 'T-2026-049', version: 1, generatedAt: '2026-03-08T08:15', issuedAt: '2026-03-08T08:30',
    snapshot: {
      eligibility: { met: 10, of: 10, credentialIds: ['qurain-cr-kw', 'qurain-capt', 'qurain-chamber-kw', 'qurain-iso'] },
      sourcing: { packages: 7, levelled: 6 },
      portfolio: { asOf: '2026-03-05', currentPct: 66, ifWon: [{ tenderId: 'T-2026-049', addPct: 12 }], safePct: QURAIN.fit.safeDeliveryPct },
      effort: { toDateWeeks: 5, toGoWeeks: 8, externalCost: KWD(12_000) },
      bonds: RETENTION_10,
      recommendation: {
        recommendation: 'bid-with-conditions',
        rationale: 'A routine STP rehabilitation in the home market for a reliable payer. The bid bond would use most of the facility headroom and the Water team is over capacity in April, so bid only with both managed.',
        winThemes: ['Home-market STP record with the sanitation agency', 'Rehabilitation in a live plant without loss of treatment'],
        resourceAsk: 'Move one estimator from the Kuwait bids in Stage 2 for April, or agree extended hours with the Water team',
      },
    },
  },
];

export const PACK_VERSIONS: PackVersion[] = [...NAJD_PACKS, ...OTHER_PACKS];

export const RERUN_EFFECTS: RerunEffect[] = [
  { tenant: 'najd', tenderId: 'T-2026-097', fromVersion: 1, section: '9.1', changed: false, change: 'Unchanged' },
  { tenant: 'najd', tenderId: 'T-2026-097', fromVersion: 1, section: '9.2', changed: false, change: 'Unchanged' },
  {
    tenant: 'najd', tenderId: 'T-2026-097', fromVersion: 1, section: '9.6', changed: true,
    change: 'Delay damages cap raised from 10% to 15% (Addendum 2, clause 58.2): risk re-rated high',
    patch: { risk: { clause: '58.2', rating: 'high', risk: 'Delay damages capped at 15% of contract value (raised by Addendum 2)', source: 'Addendum 2, p. 2' } },
  },
  {
    tenant: 'najd', tenderId: 'T-2026-097', fromVersion: 1, section: '9.7', changed: true,
    change: 'Two packages re-quoting (P-03, P-09)',
    patch: { margin: [8, 11.5], marginNote: 'two packages re-quoting (P-03, P-09)' },
  },
  { tenant: 'najd', tenderId: 'T-2026-097', fromVersion: 1, section: '9.10', changed: true, change: 'Regenerated after Addendum 2' },
];
