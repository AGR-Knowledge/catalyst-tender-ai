import type { GccTenantKey } from '@/data/gcc';
import type { DebriefInput } from '@/domain/gcc/debriefs/types';

/**
 * "Fill in an example" (a presenter control in plan 036's Debrief tab): a
 * complete, valid debrief for the tenders the scripts end on, so a presenter
 * can show a submission without typing it. Dev check 74 row 9 runs each
 * through `validateDebrief` and checks it for money.
 *
 * Najd T-2026-097 has no ending in the seed: its example serves the
 * alternative end of script C, a live No-Bid at DG2.
 */

export const EXAMPLES: Partial<Record<GccTenantKey, Record<string, DebriefInput>>> = {
  najd: {
    // Hail water transmission line: lost on price, 2 of 6; the employer's debrief is booked Thu 12 Mar, 11:00.
    'T-2025-270': {
      tenderId: 'T-2025-270',
      main: 'price',
      factors: ['price-level', 'quotes'],
      rivalId: 'al-masar',
      employer: { state: 'booked', at: '2026-03-12T11:00' },
      lessons: [
        { area: 'pricing', text: 'Al-Masar priced the transmission line below our cost build-up again. Before the next NCWS bid, benchmark our pipe-laying rates against their recent awards, not against our own past bids.' },
        { area: 'sourcing', text: 'Our ductile iron pipe quote came from a single mill, two weeks late. Ask two mills for firm prices within a week of DG1.' },
      ],
      bidAgain: 'yes',
    },
    // Unaizah STP upgrade: won Tue 24 Feb.
    'T-2025-262': {
      tenderId: 'T-2025-262',
      main: 'track-record',
      factors: ['relationship', 'technical'],
      rivalId: 'hijr',
      employer: { state: 'held', at: '2026-03-03T10:00', said: 'CCWS said the process guarantee with a named commissioning team decided the award, with our Hafr Al-Batin STP record behind it.' },
      lessons: [
        { area: 'technical', text: 'We offered the process guarantee with named commissioning engineers, and CCWS said it decided the award. Keep the same commissioning team through the handover.' },
        { area: 'relationship', text: 'CCWS knows our work from the Hafr Al-Batin STP expansion. Keep that site\'s close-out record ready as a reference for their next tender.' },
      ],
      bidAgain: 'yes',
    },
    // Madinah WTP expansion, after a live No-Bid at DG2 (script C's other ending).
    'T-2026-097': {
      tenderId: 'T-2026-097',
      main: null,
      factors: ['capacity', 'programme'],
      lessons: [
        { area: 'bid-decision', text: 'The capacity clash with the Al-Rawdah STP bid was already in the DG1 pack. The committee stopped at DG2 on a fact we had at DG1; make capacity a DG1 condition next time.' },
        { area: 'relationship', text: 'WCWS is a repeat employer. Send the decline letter with our reasons, and ask to stay on the bidders list for the next Madinah phase.' },
      ],
      bidAgain: 'yes',
      stoppedEarlier: 'dg1',
      wouldLetUsBid: 'A second water team, or a submission date after the Al-Rawdah STP bid.',
    },
  },
  corniche: {
    // Dubai Marina towers chilled water: lost on local content (ICV), Wed 4 Mar; the employer's debrief is booked Wed 11 Mar, 10:00.
    'T-2025-120': {
      tenderId: 'T-2025-120',
      main: 'local-content',
      factors: ['local-content', 'quotes'],
      rivalId: 'sarab-bs',
      employer: { state: 'booked', at: '2026-03-11T10:00' },
      lessons: [
        { area: 'sourcing', text: 'Our ICV score fell behind Sarab\'s because the chillers and the pre-insulated pipe were quoted from abroad. Shortlist an ICV-certified supplier for every major package at Stage 2.' },
        { area: 'compliance', text: 'Collect the suppliers\' ICV certificates with their quotes, not after pricing, so the ICV plan is evidenced when the bid goes in.' },
      ],
      bidAgain: 'conditions',
    },
  },
};

/** The example for a tender, if any. */
export const exampleFor = (tenant: string, tenderId: string): DebriefInput | undefined =>
  (EXAMPLES as Record<string, Record<string, DebriefInput> | undefined>)[tenant]?.[tenderId];
