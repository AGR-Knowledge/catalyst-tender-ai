import {
  BID_AGAIN, EMPLOYER_DEBRIEF, FACTORS, LESSON_AREAS, LOSS_LABEL, MAX_FACTORS, MAX_LESSONS, NO_MONEY_TEXT, STOPPED_EARLIER, labelOf,
  type LossReason,
} from '@/data/gcc/debriefs/vocab';
import { DEMO_NOW } from '@/domain/gcc/clock';
import type { DebriefInput, DebriefSubmission, DebriefValidation, DebriefVM } from './types';

/**
 * The debrief form's rules (plan 035 step 3.2, the Design's "Form rules"):
 * the starting value, and every rule as a sentence the form shows. The
 * writers apply the same rules, so a screen can never submit what they refuse.
 */

/** A currency code, or a figure in millions or billions: what "no money in a lesson" refuses. "12 m" (metres) passes. */
export function hasMoney(text: string): boolean {
  return /\b(SAR|AED|QAR|OMR|KWD|USD)\b/i.test(text) || /\d[\d,.]*\s?(M|bn)\b/.test(text) || /\d[\d,.]*\s?(million|billion)\b/i.test(text);
}

const MIN_LESSON = 20;
const MIN_SAID = 20;
const MIN_NOTE = 10;
const MAX_BIDDERS = 20;

const inputOf = (s: DebriefSubmission): DebriefInput => {
  const { at: _at, byId: _by, round: _round, ...input } = s;
  return input;
};

/**
 * The form's starting value: after a send-back, the last submission; else the
 * result's loss reason for a loss, and the employer's debrief from the Stage 9
 * facts (held when it is at or before the clock, else booked). The rest starts empty.
 */
export function draftFor(vm: DebriefVM): DebriefInput {
  if (vm.status === 'sent-back' && vm.record.submission) return inputOf(vm.record.submission);
  const at = vm.facts.employerDebriefAt;
  const now = vm.now ?? DEMO_NOW;
  return {
    tenderId: vm.tenderId,
    main: vm.ending === 'lost' ? vm.facts.lossReason ?? null : null,
    factors: [],
    lessons: [],
    ...(vm.sections.employer && at ? { employer: { state: at <= now ? 'held' : 'booked', at } } : {}),
  };
}

/** Every rule of the form, as sentences, in the order of its six sections. */
export function validateDebrief(input: DebriefInput, vm: DebriefVM): DebriefValidation {
  const errors: string[] = [];
  const now = vm.now ?? DEMO_NOW;

  // 1 The main reason.
  if (vm.mainChoices) {
    if (!input.main) errors.push('Choose the main reason');
    else if (!vm.mainChoices.some((c) => c.id === input.main)) errors.push('Choose the main reason from the list');
    else if (vm.ending === 'lost' && vm.facts.lossReason && input.main !== vm.facts.lossReason && (input.mainNote?.trim().length ?? 0) < MIN_NOTE) {
      errors.push(`Say why the main reason differs from the result's (${LOSS_LABEL[vm.facts.lossReason as LossReason]}), in a sentence`);
    }
  }

  // 2 What else decided it.
  const factors = input.factors ?? [];
  if (!factors.length || factors.length > MAX_FACTORS) errors.push(`Choose what else decided it: one to ${MAX_FACTORS} factors`);
  else if (new Set(factors).size !== factors.length || factors.some((f) => !FACTORS.some((x) => x.id === f))) errors.push('Choose each factor once, from the list');

  // 3 The competition.
  if (vm.sections.competition) {
    const known = (id: string | undefined) => !!id && vm.rivals.some((r) => r.id === id);
    if (vm.ending === 'lost' && !known(input.rivalId)) errors.push('Say who won: a rival, another bidder, or not known');
    if (vm.ending === 'won' && input.rivalId && !known(input.rivalId)) errors.push('Choose our closest rival from the list, or leave it empty');
    if (input.place) {
      const [p, n] = input.place;
      if (vm.facts.place) errors.push('The result already states our place');
      else if (!Number.isInteger(p) || !Number.isInteger(n) || p < 1 || n < p || n > MAX_BIDDERS) errors.push(`Our place must be 1 or more, and the bidders at least our place and at most ${MAX_BIDDERS}`);
    }
  }

  // 4 The employer's debrief.
  if (vm.sections.employer) {
    const e = input.employer;
    if (!e || !EMPLOYER_DEBRIEF.some((x) => x.id === e.state)) errors.push("Say whether the employer's debrief was held, booked, not offered or not asked for");
    else if (e.state === 'held') {
      if (!e.at) errors.push("Give the date of the employer's debrief");
      else if (e.at > now) errors.push("A debrief that was held can't be dated after today: choose Booked instead");
      if ((e.said?.trim().length ?? 0) < MIN_SAID) errors.push(`Write what the employer told us, in ${MIN_SAID} characters or more`);
    } else if (e.state === 'booked' && !e.at) errors.push("Give the date the employer's debrief is booked for");
  }

  // 5 Lessons.
  const lessons = input.lessons ?? [];
  if (!lessons.length || lessons.length > MAX_LESSONS) errors.push(`Write one to ${MAX_LESSONS} lessons`);
  lessons.forEach((x, i) => {
    const n = lessons.length > 1 ? ` ${i + 1}` : '';
    if (!LESSON_AREAS.some((a) => a.id === x.area)) errors.push(`Choose an area for lesson${n}`);
    if (x.text.trim().length < MIN_LESSON) errors.push(`Write lesson${n} in ${MIN_LESSON} characters or more`);
    else if (hasMoney(x.text)) errors.push(`${NO_MONEY_TEXT} (lesson${n})`);
  });

  // 6 Next time.
  if (!input.bidAgain || !BID_AGAIN.some((b) => b.id === input.bidAgain)) errors.push('Say whether we would bid for this employer again');
  if (vm.sections.stoppedEarlier && (!input.stoppedEarlier || !STOPPED_EARLIER.some((x) => x.id === input.stoppedEarlier))) errors.push('Say whether we should have stopped earlier');

  return { ok: !errors.length, errors };
}

/** The input as it is stored: trimmed, and without the parts that don't apply to this ending. */
export function cleanInput(input: DebriefInput, vm: DebriefVM): DebriefInput {
  const note = input.mainNote?.trim();
  const differs = vm.ending === 'lost' && !!vm.facts.lossReason && input.main !== vm.facts.lossReason;
  const e = input.employer;
  const would = input.wouldLetUsBid?.trim();
  return {
    tenderId: vm.tenderId,
    main: vm.mainChoices ? input.main : null,
    ...(differs && note ? { mainNote: note } : {}),
    factors: [...input.factors],
    ...(vm.sections.competition && input.rivalId ? { rivalId: input.rivalId } : {}),
    ...(vm.sections.competition && input.place && !vm.facts.place ? { place: [input.place[0], input.place[1]] as [number, number] } : {}),
    ...(vm.sections.employer && e ? {
      employer: {
        state: e.state,
        ...(e.at && (e.state === 'held' || e.state === 'booked') ? { at: e.at } : {}),
        ...(e.state === 'held' && e.said?.trim() ? { said: e.said.trim() } : {}),
      },
    } : {}),
    lessons: input.lessons.map((x) => ({ area: x.area, text: x.text.trim() })),
    ...(input.bidAgain ? { bidAgain: input.bidAgain } : {}),
    ...(vm.sections.stoppedEarlier && input.stoppedEarlier ? { stoppedEarlier: input.stoppedEarlier } : {}),
    ...(vm.sections.stoppedEarlier && would ? { wouldLetUsBid: would } : {}),
  };
}

/** Factor ids in words. */
export const factorLabels = (ids: string[]) => ids.map((id) => labelOf(FACTORS, id));
