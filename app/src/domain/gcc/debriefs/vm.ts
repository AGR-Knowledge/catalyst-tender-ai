import type { Tone } from '@/data/types';
import { can } from '@/data/access';
import { firstWithRole } from '@/data/people';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { RIVALS, exampleFor, rivalName } from '@/data/gcc/debriefs';
import {
  CANCEL_REASONS, ENDINGS, LOSS_REASONS, RIVAL_FIXED, SEED_GATE_REASONS, WIN_REASONS, WITHDRAW_REASONS, groupOf, labelOf,
  type DebriefStatus, type Ending, type VocabItem,
} from '@/data/gcc/debriefs/vocab';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { activeDecision } from '@/domain/gcc/dg2/keys';
import { reasonLabel as noBidLabel } from '@/domain/gcc/dg2/decision';
import { dg3ReasonLabel } from '@/domain/gcc/dg3/decision';
import { queriesFor, tenderCtx, type DemoDone } from '@/domain/gcc/lifecycle';
import { entryOf, seedLifecycleOf, type DebriefEntry } from './records';
import { dayText, dayTimeText } from './text';
import type { DebriefCtx, DebriefFacts, DebriefRecord, DebriefVM } from './types';

/**
 * The Debrief tab's view model (plan 035 step 3.2) and the words every
 * debrief reader shares: the status line, the main reason's label, the
 * gate's reasons, the rival's name.
 */

/* ---------------------------------------------------------------- words */

export const STATUS_TONE: Record<DebriefStatus, Tone> = { due: 'grey', overdue: 'orange', submitted: 'grey', 'sent-back': 'orange', accepted: 'green' };

/** "Due by Thu 19 Mar", "Overdue since Thu 19 Mar", "Submitted Sun 8 Mar, 10:04", "Sent back …", "Accepted …". */
export function statusTextOf(record: DebriefRecord, status: DebriefStatus): string {
  switch (status) {
    case 'due': return `Due by ${dayText(record.dueBy)}`;
    case 'overdue': return `Overdue since ${dayText(record.dueBy)}`;
    case 'submitted': return `Submitted ${dayTimeText(record.submission!.at)}`;
    case 'sent-back': return `Sent back ${dayTimeText(record.sentBack!.at)}`;
    case 'accepted': return `Accepted ${dayTimeText(record.accepted!.at)}`;
  }
}

/** The main-reason choices by ending; null for No-Bid and rejected, where the gate's reasons stand. */
export function mainChoicesOf(ending: Ending): VocabItem[] | null {
  switch (ending) {
    case 'won': return WIN_REASONS;
    case 'lost': return LOSS_REASONS;
    case 'cancelled': return CANCEL_REASONS;
    case 'withdrawn': return WITHDRAW_REASONS;
    default: return null;
  }
}

export const sectionsOf = (ending: Ending): DebriefVM['sections'] => ({
  competition: ending === 'won' || ending === 'lost',
  employer: ending === 'won' || ending === 'lost' || ending === 'cancelled',
  bidAgain: true,
  stoppedEarlier: ending === 'withdrawn' || ending === 'no-bid' || ending === 'rejected',
});

/** A gate reason code in words: plan 009a's No-Bid list, plan 018's DG3 list, then the seed's own codes. */
export const gateReasonLabel = (code: string) => SEED_GATE_REASONS[code] ?? (code === 'margin-below-minimum' ? dg3ReasonLabel(code) : noBidLabel(code));

/** The decision that ended a No-Bid or a rejection. */
export const endingGateOf = (l: Lifecycle, ending: Ending) =>
  ending === 'no-bid' ? [...l.gates].reverse().find((g) => g.gate === 'DG2' && g.decision === 'no-bid')
    : ending === 'rejected' ? [...l.gates].reverse().find((g) => g.gate === 'DG3' && g.decision === 'rejected') : undefined;

/** The gate's reasons (No-Bid, rejected) in words, or the close note (withdrawn, cancelled) as one item. */
export function gateReasonsOf(l: Lifecycle, ending: Ending): string[] | undefined {
  const g = endingGateOf(l, ending);
  if (g) return g.reasonCodes.length ? g.reasonCodes.map(gateReasonLabel) : g.note ? [g.note] : undefined;
  if ((ending === 'withdrawn' || ending === 'cancelled') && l.closedNote) return [l.closedNote];
  return undefined;
}

/** The main reason's label: No-Bid and rejected read the gate's reasons, joined. Empty until submitted. */
export function mainLabelOf(entry: Pick<DebriefEntry, 'l' | 'record'>): string {
  const { l, record } = entry;
  const s = record.submission;
  if (!s) return '';
  const choices = mainChoicesOf(record.ending);
  return choices ? labelOf(choices, s.main) : (gateReasonsOf(l, record.ending) ?? []).join(', ');
}

/** A rival id as a name: the tenant's rival, "Another bidder" or "Not known". */
export const rivalLabel = (tenant: string, id: string | undefined): string | undefined =>
  id ? rivalName(tenant, id) ?? RIVAL_FIXED.find((r) => r.id === id)?.label : undefined;

export const endingLabelOf = (ending: Ending) => labelOf(ENDINGS, ending);

/* ---------------------------------------------------------------- facts */

/** What we know about the ending, read-only. The result's place and loss reason come from the seed: what the result said. */
export function factsOf(tenant: string, l: Lifecycle, ending: Ending, done: DemoDone, canSeeValue: boolean): DebriefFacts {
  const seed = seedLifecycleOf(tenant, l.tenderId) ?? l;
  const r = seed.result;
  const g = endingGateOf(l, ending);
  const s9 = seed.facts?.stage === 9 ? seed.facts : l.facts?.stage === 9 ? l.facts : undefined;
  const dg2 = ending === 'no-bid' ? activeDecision(done as Record<string, string>, l.tenderId) : null;
  const award = ending === 'won' && canSeeValue ? l.result?.value : undefined;
  return {
    ...(award ? { value: award } : l.value.amount ? { value: { amount: l.value.amount, ccy: l.value.ccy } } : {}),
    ...(r?.rank ? { place: r.rank } : {}),
    ...(ending === 'lost' ? { lossReason: r?.lossReason ?? 'other' } : {}),
    ...(s9?.debriefAt ? { employerDebriefAt: s9.debriefAt } : {}),
    ...(gateReasonsOf(l, ending) ? { gateReasons: gateReasonsOf(l, ending) } : {}),
    ...(g ? { gateAt: g.at, gateById: g.byId } : {}),
    ...(dg2?.lessons ? { dg2Lessons: dg2.lessons } : {}),
    ...(l.result?.result === 'won' ? { letter: 'award' as const } : l.result?.result === 'lost' ? { letter: 'regret' as const } : l.result?.result === 'cancelled' ? { letter: 'cancellation' as const } : {}),
  };
}

/* ------------------------------------------------------------ the tab */

/** The view model for an entry, for any reader (the writers build it for their own rules). */
export function vmOf(ctx: Pick<DebriefCtx, 'tenant' | 'viewer' | 'done' | 'now'>, entry: DebriefEntry): DebriefVM {
  const { l, record, status } = entry;
  const { ending } = record;
  const canSeeValue = can(ctx.viewer, 'see.margin', tenderCtx(ctx.tenant, l)).ok;
  const example = exampleFor(ctx.tenant, l.tenderId);
  return {
    tenderId: l.tenderId, title: l.title, employer: l.issuer, sector: l.sector,
    ending, endingLabel: endingLabelOf(ending), group: groupOf(ending), endedAt: record.endedAt, dueBy: record.dueBy,
    status, statusText: statusTextOf(record, status), statusTone: STATUS_TONE[status],
    facts: factsOf(ctx.tenant, l, ending, ctx.done, canSeeValue),
    record,
    recorderId: firstWithRole(ctx.tenant, 'dir')?.id ?? null,
    approverId: firstWithRole(ctx.tenant, 'hot')?.id ?? null,
    mainChoices: mainChoicesOf(ending),
    sections: sectionsOf(ending),
    rivals: [...((RIVALS as Record<string, { id: string; name: string }[]>)[ctx.tenant] ?? []).map((x) => ({ id: x.id, label: x.name })), ...RIVAL_FIXED],
    ...(example ? { example } : {}),
    now: ctx.now || DEMO_NOW,
  };
}

/** The Debrief tab's view model, or null when the tender has no ending or the viewer may not open the tender. */
export function debriefForImpl(ctx: DebriefCtx, tenderId: string): DebriefVM | null {
  if (!queriesFor(ctx).one(tenderId)) return null;
  const entry = entryOf(ctx, tenderId);
  return entry ? vmOf(ctx, entry) : null;
}
