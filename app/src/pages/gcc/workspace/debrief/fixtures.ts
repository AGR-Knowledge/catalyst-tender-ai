import {
  LOSS_REASONS, RIVAL_FIXED, WIN_REASONS, groupOf, labelOf, ENDINGS,
  type DebriefInput, type DebriefRecord, type DebriefVM, type Ending,
} from '@/domain/gcc/debriefs';

/**
 * Kit preview fixtures for the Debrief tab (plan 036), in Najd's words: a
 * lost tender due (the Project Director's form), the same one sent back, a win
 * accepted, and a No-Bid submitted (the Head of Tendering's sign-off). Dev
 * only: the kit renders them with writers that write nothing. The real tab
 * reads `debriefFor` (plan 035).
 */

const RIVALS = [
  { id: 'hijr', label: 'Hijr Al-Watan Contracting' },
  { id: 'sahab', label: 'Sahab Gulf Water Technologies' },
  ...RIVAL_FIXED,
];

const SECTIONS: Record<Ending, DebriefVM['sections']> = {
  won: { competition: true, employer: true, bidAgain: true, stoppedEarlier: false },
  lost: { competition: true, employer: true, bidAgain: true, stoppedEarlier: false },
  cancelled: { competition: false, employer: true, bidAgain: true, stoppedEarlier: false },
  withdrawn: { competition: false, employer: false, bidAgain: true, stoppedEarlier: true },
  'no-bid': { competition: false, employer: false, bidAgain: true, stoppedEarlier: true },
  rejected: { competition: false, employer: false, bidAgain: true, stoppedEarlier: true },
};

function vmOf(p: {
  tenderId: string; title: string; ending: Ending; endedAt: string; dueBy: string;
  status: DebriefVM['status']; statusText: string; statusTone: DebriefVM['statusTone'];
  facts: DebriefVM['facts']; record?: Partial<DebriefRecord>; example?: DebriefInput;
}): DebriefVM {
  return {
    tenderId: p.tenderId, title: p.title, employer: 'Northern Cities Water Services Company', sector: 'Water and wastewater',
    ending: p.ending, endingLabel: labelOf(ENDINGS, p.ending), group: groupOf(p.ending),
    endedAt: p.endedAt, dueBy: p.dueBy, status: p.status, statusText: p.statusText, statusTone: p.statusTone,
    facts: p.facts,
    record: { tenderId: p.tenderId, ending: p.ending, endedAt: p.endedAt, dueBy: p.dueBy, source: 'demo', ...p.record },
    recorderId: 'najd.dir', approverId: 'najd.hot',
    mainChoices: p.ending === 'no-bid' || p.ending === 'rejected' ? null : p.ending === 'won' ? WIN_REASONS : LOSS_REASONS,
    sections: SECTIONS[p.ending], rivals: RIVALS, ...(p.example ? { example: p.example } : {}),
  };
}

const LOST_EXAMPLE: DebriefInput = {
  tenderId: 'T-2025-270', main: 'price', factors: ['quotes', 'price-level'], rivalId: 'hijr',
  employer: { state: 'booked', at: '2026-03-12T11:00' },
  lessons: [
    { area: 'sourcing', text: 'Our pipe quotes came late and from two mills only; ask a third mill before the RFQs go out.' },
    { area: 'pricing', text: 'The evaluation weighted price heavily: read the weights before we set the margin range.' },
  ],
  bidAgain: 'yes',
};

const LOST_FACTS: DebriefVM['facts'] = { place: [2, 6], lossReason: 'price', employerDebriefAt: '2026-03-12T11:00', letter: 'regret', value: { amount: 205e6, ccy: 'SAR' } };

export const DEBRIEF_FIXTURES: { id: string; label: string; as: 'dir' | 'hot'; vm: DebriefVM }[] = [
  {
    id: 'lost-due', label: 'Lost, due: the Project Director', as: 'dir',
    vm: vmOf({
      tenderId: 'T-2025-270', title: 'Hail water transmission line', ending: 'lost', endedAt: '2026-03-05T12:00', dueBy: '2026-03-19',
      status: 'due', statusText: 'Due by Thu 19 Mar', statusTone: 'orange', facts: LOST_FACTS, example: LOST_EXAMPLE,
    }),
  },
  {
    id: 'lost-back', label: 'Lost, sent back: the Project Director', as: 'dir',
    vm: vmOf({
      tenderId: 'T-2025-270', title: 'Hail water transmission line', ending: 'lost', endedAt: '2026-03-05T12:00', dueBy: '2026-03-19',
      status: 'sent-back', statusText: 'Sent back Sun 8 Mar, 10:12', statusTone: 'orange', facts: LOST_FACTS, example: LOST_EXAMPLE,
      record: {
        submission: { ...LOST_EXAMPLE, at: '2026-03-08T10:04', byId: 'najd.dir', round: 1 },
        sentBack: { at: '2026-03-08T10:12', byId: 'najd.hot', note: 'Say which mill was late and whether the steel price moved between the RFQ and the bid.', round: 1 },
      },
    }),
  },
  {
    id: 'won-accepted', label: 'Won, accepted: the Head of Tendering', as: 'hot',
    vm: vmOf({
      tenderId: 'T-2025-262', title: 'Unaizah STP upgrade', ending: 'won', endedAt: '2026-02-24T11:00', dueBy: '2026-03-10',
      status: 'accepted', statusText: 'Accepted Sun 8 Mar, 10:20', statusTone: 'green',
      facts: { place: [1, 5], letter: 'award' },
      record: {
        submission: {
          tenderId: 'T-2025-262', main: 'track-record', factors: ['relationship', 'programme'], rivalId: 'sahab',
          employer: { state: 'held', at: '2026-03-03T10:00', said: 'Our programme for the second stream was the only one that kept the plant running throughout.' },
          lessons: [{ area: 'technical', text: 'Phasing the works around a live plant won it; lead with the phasing plan on the next upgrade.' }],
          bidAgain: 'yes', at: '2026-03-08T10:04', byId: 'najd.dir', round: 1,
        },
        accepted: { at: '2026-03-08T10:20', byId: 'najd.hot', round: 1 },
      },
    }),
  },
  {
    id: 'nobid-submitted', label: 'No-Bid, submitted: the Head of Tendering', as: 'hot',
    vm: vmOf({
      tenderId: 'T-2026-097', title: 'Madinah WTP expansion', ending: 'no-bid', endedAt: '2026-03-08T10:30', dueBy: '2026-03-22',
      status: 'submitted', statusText: 'Submitted Sun 8 Mar, 10:40', statusTone: 'cyan',
      facts: { gateReasons: ['Win probability too low', 'Team capacity clash'], gateAt: '2026-03-08T10:30', gateById: 'najd.hot' },
      record: {
        submission: {
          tenderId: 'T-2026-097', main: null, factors: ['capacity', 'price-level'],
          lessons: [{ area: 'bid-decision', text: 'The capacity clash with the Hail line was visible at DG1; flag shared key people before we pursue.' }],
          bidAgain: 'conditions', stoppedEarlier: 'dg1', wouldLetUsBid: 'A second process lead, or a submission date after the Hail award.',
          at: '2026-03-08T10:40', byId: 'najd.dir', round: 1,
        },
      },
    }),
  },
];
