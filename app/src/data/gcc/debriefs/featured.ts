import type { GccTenantKey } from '@/data/gcc';
import type { DebriefInput } from '@/domain/gcc/debriefs/types';

/**
 * Hand-written debriefs (plan 035 step 2.3), in each Project Director's
 * voice, for the tenders a presenter is likely to open. They replace the
 * generated record for their tender and keep the seed's rules:
 * - a won or lost one is accepted at its lessons event (`hasLessons`), by the
 *   Head of Tendering, submitted by the Project Director a working day before;
 * - no time after Sun 8 Mar 2026, 10:00; no money in any lesson.
 *
 * Najd T-2025-255 is accepted; Najd T-2025-438 is submitted and waits for
 * Faisal Al-Harbi on demo day. Each tenant has one accepted win.
 */

export interface Featured {
  input: Omit<DebriefInput, 'tenderId'>;
  /** By the tenant's Project Director. */
  submittedAt: string;
  /** By the tenant's Head of Tendering; absent while it waits for sign-off. */
  acceptedAt?: string;
}

export const FEATURED: Record<GccTenantKey, Record<string, Featured>> = {
  najd: {
    // Najran dam rehabilitation: lost on the technical score, 4 of 7. Lessons captured Sun 1 Mar.
    'T-2025-255': {
      submittedAt: '2026-02-26T15:20',
      acceptedAt: '2026-03-01T14:00',
      input: {
        main: 'technical',
        factors: ['technical', 'credentials', 'programme'],
        rivalId: 'istria',
        employer: {
          state: 'held', at: '2026-02-24T11:00',
          said: 'SCWS scored our dam safety methodology below three other bidders. They wanted a named dam specialist and an instrumentation plan for the embankment, and we offered neither.',
        },
        lessons: [
          { area: 'technical', text: 'A dam rehabilitation is not a treatment plant. We bid it with our STP method statement and no dam specialist on the team, and the evaluators noticed. Bring a named specialist in before DG2, or partner with one.' },
          { area: 'process', text: 'The instrumentation and monitoring plan was one page in an appendix; SCWS scored it as a section of its own. Read the evaluation criteria line by line before the proposal outline is fixed.' },
          { area: 'bid-decision', text: 'We pursued at DG1 on value and on the relationship with SCWS. The credentials vault held no dam project; that should have been a DG1 condition, not a surprise at evaluation.' },
        ],
        bidAgain: 'conditions',
      },
    },
    // Yanbu STP rehabilitation: cancelled after opening when the budget was withdrawn. Waiting for the Head of Tendering.
    'T-2025-438': {
      submittedAt: '2026-03-05T11:40',
      input: {
        main: 'budget',
        factors: ['relationship', 'terms'],
        employer: {
          state: 'held', at: '2026-02-24T10:00',
          said: 'The Municipal Projects Office told us the funding moved to the 2027 programme. They expect to re-tender a smaller first phase and asked us to keep our prices on file.',
        },
        lessons: [
          { area: 'bid-decision', text: 'The budget line for Yanbu was shared with two other schemes, which we could have asked about at the pre-bid meeting. Ask whether funding is committed before we build a full bid.' },
          { area: 'process', text: 'We hold a complete priced BOQ and supplier quotes valid until May. Keep them in the Library with their validity dates, so a re-tender starts from them rather than from zero.' },
        ],
        bidAgain: 'yes',
      },
    },
    // Al-Kharj water transmission main and reservoirs: won Tue 3 Feb. Lessons captured Thu 12 Feb.
    'T-2025-290': {
      submittedAt: '2026-02-11T15:10',
      acceptedAt: '2026-02-12T11:30',
      input: {
        main: 'track-record',
        factors: ['relationship', 'programme'],
        rivalId: 'hijr',
        employer: {
          state: 'held', at: '2026-02-08T10:00',
          said: 'Gulf Coast Utilities said our Arar storage tanks contract decided it: the same site team, handed over early. Our price was not the lowest, but it was within their range.',
        },
        lessons: [
          { area: 'relationship', text: 'The Arar storage tanks job for the same employer won us this one: the references came from people who had walked our site. Keep the same site manager on the reservoirs.' },
          { area: 'pricing', text: 'We were not the lowest price and did not need to be. With repeat employers, price the risk honestly rather than chasing the lowest number.' },
          { area: 'process', text: 'The handover meeting was held within a week of award, with the bid programme and the supplier list on the table. Do the same on every win.' },
        ],
        bidAgain: 'yes',
      },
    },
  },
  corniche: {
    // Sharjah airport extension MEP: won Mon 16 Feb. Lessons captured Thu 26 Feb.
    'T-2025-308': {
      submittedAt: '2026-02-25T14:30',
      acceptedAt: '2026-02-26T12:05',
      input: {
        main: 'technical',
        factors: ['technical', 'programme', 'compliance'],
        rivalId: 'brevanne',
        employer: {
          state: 'held', at: '2026-02-19T14:00',
          said: 'Crescent Bay Health said our phasing plan for working beside the live terminal scored highest, and that we raised the fewest technical clarifications of any bidder.',
        },
        lessons: [
          { area: 'technical', text: 'We walked the live terminal twice before writing the phasing plan, and it showed. For MEP work in an operating building, the site walk goes in the bid programme, not as an option.' },
          { area: 'sourcing', text: 'Chiller and switchgear lead times were confirmed in writing by the suppliers before submission, so we could commit to the programme with confidence.' },
          { area: 'compliance', text: 'Our ICV certificate and the suppliers\' ICV letters went in with the prequalification; nothing was chased at evaluation.' },
        ],
        bidAgain: 'yes',
      },
    },
  },
  dafna: {
    // Simaisma pump station: won Wed 21 Jan. Lessons captured Thu 29 Jan.
    'T-2025-276': {
      submittedAt: '2026-01-28T10:40',
      acceptedAt: '2026-01-29T11:50',
      input: {
        main: 'price',
        factors: ['price-level', 'quotes'],
        rivalId: 'trevannon',
        employer: { state: 'not-asked' },
        lessons: [
          { area: 'sourcing', text: 'Three pump suppliers quoted in the first week, so the mechanical package carried no allowances. That is where we beat Trevannon.' },
          { area: 'pricing', text: 'We priced the wet-well excavation from our Al Shamal pumping station records, not from the norms. Keep those production rates in one place for every pump station bid.' },
        ],
        bidAgain: 'yes',
      },
    },
  },
  batinah: {
    // Bahla wadi crossing: won Mon 2 Feb. Lessons captured Tue 10 Feb.
    'T-2025-265': {
      submittedAt: '2026-02-09T11:15',
      acceptedAt: '2026-02-10T14:25',
      input: {
        main: 'alternative',
        factors: ['technical', 'programme', 'price-level'],
        rivalId: 'shinas-bridges',
        employer: {
          state: 'held', at: '2026-02-05T10:30',
          said: 'The Access Roads Office said our precast beam alternative took the works out of the wadi bed before the rainy season, which was their main concern.',
        },
        lessons: [
          { area: 'technical', text: 'The precast alternative took the works out of the wadi bed before the rains. Offer an alternative whenever the booklet allows one, costed, with the compliant base bid beside it.' },
          { area: 'sourcing', text: 'The precast yard in Sohar confirmed its capacity in writing before we priced. That is what made the alternative credible.' },
          { area: 'relationship', text: 'Ask about the employer\'s biggest worry at the site visit. Here it was the wadi flows, and our offer answered it.' },
        ],
        bidAgain: 'yes',
      },
    },
  },
  qurain: {
    // Salmiya storm outfall: won Mon 8 Dec 2025. Lessons captured Thu 18 Dec.
    'T-2025-241': {
      submittedAt: '2025-12-17T13:20',
      acceptedAt: '2025-12-18T15:40',
      input: {
        main: 'programme',
        factors: ['programme', 'technical'],
        rivalId: 'brennock',
        employer: {
          state: 'held', at: '2025-12-11T11:00',
          said: 'The Sanitation Agency said our marine works window, finishing the outfall before the winter storms, decided it. Two bidders had the works running through January.',
        },
        lessons: [
          { area: 'technical', text: 'We programmed the outfall around the winter storm season and said so on page one. The employer\'s biggest risk became our headline.' },
          { area: 'process', text: 'Planning started the day after DG2, not after pricing, so the programme and the price told the same story.' },
        ],
        bidAgain: 'yes',
      },
    },
  },
};
