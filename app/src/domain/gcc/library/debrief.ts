import { firstWithRole } from '@/data/people';
import { dateText, DEMO_TODAY } from '@/domain/calendar';
import { DEMO_NOW } from '@/domain/gcc/clock';
import {
  BID_AGAIN, EMPLOYER_DEBRIEF, FACTORS, LESSON_AREAS, LOSS_LABEL, RIVAL_OTHER, RIVAL_UNKNOWN, STOPPED_EARLIER,
  debriefFor, labelOf, type DebriefInput, type DebriefVM,
} from '@/domain/gcc/debriefs';
import type { FacCell, FacSection } from './facsimile';
import { docDate, fileOf, nameOf, type LibCtx } from './context';
import { facsimileFile } from './documents';
import { fileName } from './names';
import type { LibraryFileVM } from './types';

/**
 * The debrief as words (plan 036): the six sections of a submission in one
 * form, read by the Debrief tab's record, its confirm step ("The record will
 * say") and the Debrief record file in 07 Result, so the three never disagree.
 * The words come from the debrief vocabulary; nothing here adds a rule.
 */

const YEAR = DEMO_TODAY.slice(0, 4);

/** "Thu 5 Mar", with the year outside the demo year. */
export const dayText = (iso: string): string => {
  const d = dateText(iso.slice(0, 10));
  return iso.startsWith(YEAR) ? d.replace(/ \d{4}$/, '') : d;
};

/** "Thu 12 Mar, 11:00", or the day alone for a date. */
export const stampText = (iso: string): string => (iso.length > 10 ? `${dayText(iso)}, ${iso.slice(11, 16)}` : dayText(iso));

export type DebriefLineId = 'main' | 'factors' | 'competition' | 'employer' | 'lessons' | 'next';

export interface DebriefLine { id: DebriefLineId; title: string; text?: string; items?: string[] }

/** The gate whose reasons stand for a No-Bid or a rejection. */
export const gateOf = (vm: DebriefVM): 'DG2' | 'DG3' | null => (vm.ending === 'no-bid' ? 'DG2' : vm.ending === 'rejected' ? 'DG3' : null);

/** The sections that apply to this ending, in order, with what the submission says in each. */
export function debriefLines(vm: DebriefVM, s: DebriefInput): DebriefLine[] {
  const f = vm.facts;
  const out: DebriefLine[] = [];

  if (!vm.mainChoices) {
    out.push({ id: 'main', title: 'The main reason', text: `The ${gateOf(vm) ?? 'gate'} reasons stand`, items: f.gateReasons ?? [] });
  } else {
    const label = labelOf(vm.mainChoices, s.main) || 'Not given';
    const changed = vm.ending === 'lost' && !!f.lossReason && !!s.main && s.main !== f.lossReason;
    out.push({ id: 'main', title: 'The main reason', text: changed ? `${label}. The result said ${LOSS_LABEL[f.lossReason!]}${s.mainNote ? `: ${s.mainNote}` : ''}` : label });
  }

  out.push({ id: 'factors', title: 'What else decided it', text: s.factors.map((x) => labelOf(FACTORS, x)).join(' · ') || 'None given' });

  if (vm.sections.competition) {
    const lost = vm.ending === 'lost';
    const who = s.rivalId === RIVAL_OTHER ? 'another bidder' : s.rivalId && s.rivalId !== RIVAL_UNKNOWN ? labelOf(vm.rivals, s.rivalId) : null;
    const text = s.rivalId === RIVAL_UNKNOWN ? (lost ? 'Who won is not known' : 'Our closest rival is not known')
      : who ? (lost ? `Won by ${who}` : `Our closest rival: ${who}`)
      : lost ? 'Who won is not recorded' : 'No rival named';
    out.push({ id: 'competition', title: 'The competition', text: `${text}${s.place ? ` · our place ${s.place[0]} of ${s.place[1]}, as the employer told us` : ''}` });
  }

  if (vm.sections.employer) {
    const e = s.employer;
    const text = !e ? 'Not recorded'
      : e.state === 'held' ? `Held${e.at ? ` ${dayText(e.at)}` : ''}${e.said ? `: "${e.said}"` : ''}`
      : e.state === 'booked' ? `Booked${e.at ? ` ${stampText(e.at)}` : ''}`
      : labelOf(EMPLOYER_DEBRIEF, e.state);
    out.push({ id: 'employer', title: "The employer's debrief", text });
  }

  out.push({ id: 'lessons', title: 'Lessons', items: s.lessons.map((l) => `${labelOf(LESSON_AREAS, l.area)}: ${l.text}`) });

  const next = [
    ...(s.bidAgain ? [`Bid for this employer again: ${labelOf(BID_AGAIN, s.bidAgain)}`] : []),
    ...(vm.sections.stoppedEarlier && s.stoppedEarlier ? [`Should we have stopped earlier? ${labelOf(STOPPED_EARLIER, s.stoppedEarlier)}`] : []),
    ...(vm.sections.stoppedEarlier && s.wouldLetUsBid ? [`What would have let us bid: ${s.wouldLetUsBid}`] : []),
  ];
  out.push({ id: 'next', title: 'Next time', items: next.length ? next : ['Not given'] });
  return out;
}

/**
 * 07 Result › Debrief record: one file per accepted debrief, seeded or
 * recorded in the demo. Made at the acceptance, by the Project Director.
 * Whether a tender has one is read as its Head of Tendering (who reads every
 * debrief), so a viewer without `debrief.view` sees the file listed and its
 * content masked, as other folders mask what a role can't read.
 */
export function debriefFiles(c: LibCtx): LibraryFileVM[] {
  const sees = c.can('debrief.view');
  const reader = sees ? c.viewer : firstWithRole(c.tenant, 'hot');
  const vm = reader ? debriefFor({ tenant: c.tenant, viewer: reader, done: c.done, now: DEMO_NOW }, c.l.tenderId) : null;
  const sub = vm?.record.submission;
  const acc = vm?.record.accepted;
  if (!vm || vm.status !== 'accepted' || !sub || !acc) return [];

  const pd = nameOf(sub.byId);
  const hot = nameOf(acc.byId);
  const f = vm.facts;
  const head: [string, FacCell][] = [
    ['Tender', `${c.l.tenderId} · ${c.l.title}`],
    ['Ending', `${vm.endingLabel}, ${docDate(vm.endedAt) ?? ''}`],
    ...(sees && vm.sections.competition ? [['Our place in the result', f.place ? `${f.place[0]} of ${f.place[1]}` : 'Not published'] as [string, FacCell]] : []),
    ...(sees && f.lossReason ? [['Loss reason in the result', LOSS_LABEL[f.lossReason]] as [string, FacCell]] : []),
  ];
  const body: FacSection[] = sees
    ? debriefLines(vm, sub).map((x, i) => ({
      heading: `${i + 1}. ${x.title}`,
      ...(x.text ? { paragraphs: [x.text] } : {}),
      ...(x.items?.length ? { list: x.items } : {}),
    }))
    : [{ heading: 'The debrief', rows: [['Reasons, competition and lessons', { masked: c.holders('debrief.view') }]] }];
  const signOff: FacSection = {
    heading: 'Sign-off',
    rows: [
      ['Recorded by', `${pd ?? 'The Project Director'}, Project Director, ${docDate(sub.at) ?? ''}${sub.round > 1 ? ` · round ${sub.round}` : ''}`],
      ['Accepted into the archive by', `${hot ?? 'The Head of Tendering'}, Head of Tendering, ${docDate(acc.at) ?? ''}`],
    ],
  };

  return [fileOf('07', 'debrief', {
    kind: 'debrief-record', name: fileName(c.prefix, 'Debrief record'), title: 'Debrief record', type: 'Record',
    source: { channel: 'person', label: `Recorded by ${pd ?? 'the Project Director'}` }, receivedAt: acc.at, dated: 'made', by: pd,
    tags: ['Debrief'],
    ...(sees ? {} : { masked: { by: c.holders('debrief.view'), label: 'Content masked' } }),
    ...facsimileFile(() => ({
      title: `${c.prefix} Debrief record`, issuer: c.company, issuerLines: ['Tendering department'], heading: 'Debrief record',
      ref: `${c.l.tenderId} · Debrief`, date: docDate(acc.at.slice(0, 10)),
      sections: [{ rows: head }, ...body, signOff],
      signature: { name: pd ?? undefined, role: 'Project Director', org: c.company },
      footer: 'Internal record · Synthetic document for demonstration',
    }), 1),
  })];
}
