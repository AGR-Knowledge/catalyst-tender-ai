import { can } from '@/data/access';
import { firstWithRole, personById, type Person } from '@/data/people';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { LOSS_LABEL, type LossReason } from '@/data/gcc/debriefs/vocab';
import { tenderCtx } from '@/domain/gcc/lifecycle';
import { debriefBackKey, debriefKey, debriefOkKey } from './keys';
import { cleanInput, validateDebrief } from './form';
import { entryOf, type DebriefEntry } from './records';
import { endingLabelOf, mainLabelOf, vmOf } from './vm';
import type { DebriefAcceptance, DebriefCtx, DebriefInput, DebriefSendBack, DebriefSubmission, DebriefWriteResult } from './types';

/**
 * The three debrief writes (plan 035 step 3.3). Each checks `can()` for the
 * person writing, on this tender, and the status it needs; each logs one
 * audit entry targeted at the tender (so it shows in Decisions & audit) and
 * says what happens in sentences, the first of them the toast. Writers never
 * touch the store: the screen passes `writes` to `mark()` and `audit` to
 * `logAudit()`, stamped `at` (the store's `nextAt()`).
 */

export interface DebriefWriteError { error: string }

const MIN_BACK_NOTE = 10;

const nameOf = (id: string | null | undefined) => personById(id)?.name;
const hotName = (tenant: string) => firstWithRole(tenant, 'hot')?.name ?? 'the Head of Tendering';
const pdName = (tenant: string) => firstWithRole(tenant, 'dir')?.name ?? 'the Project Director';

function entryFor(ctx: DebriefCtx, tenderId: string): DebriefEntry | DebriefWriteError {
  const entry = entryOf(ctx, tenderId);
  return entry ?? { error: 'This tender has not ended, so it has no debrief yet' };
}

const isErr = (x: object): x is DebriefWriteError => 'error' in x;

/** "Lost · Price", "No-Bid at DG2 · Capacity conflict": the audit entry's first words. */
const detailOf = (entry: DebriefEntry, sub?: DebriefSubmission) => {
  const main = mainLabelOf({ l: entry.l, record: sub ? { ...entry.record, submission: sub } : entry.record });
  return [endingLabelOf(entry.record.ending), main].filter(Boolean).join(' · ');
};

/** What acceptance does to the lifecycle, in words (the applier `demo/60-debrief.apply.ts` does it). */
function acceptEffects(l: Lifecycle, sub: DebriefSubmission, at: string, lossReason?: LossReason): string[] {
  const r = l.result;
  const out: string[] = [];
  if (r?.result === 'lost') {
    out.push(l.closedAt && l.closedAt <= at ? 'Stage 9 reads Lessons captured' : `${l.tenderId} closes: lessons captured`);
  } else if (r?.result === 'won') {
    const handedOver = l.events.some((e) => e.kind === 'handover' && e.at <= at);
    out.push(handedOver ? `${l.tenderId} closes: handed over and lessons captured` : 'Stage 9 reads Lessons captured; the handover is still to be held');
  } else {
    out.push('It counts in Debriefs accepted and in Why bids stopped');
  }
  if (r?.result === 'lost' && lossReason && sub.main && sub.main !== lossReason) {
    out.push(`The loss reason now reads ${LOSS_LABEL[sub.main as LossReason]} on every screen; the result's ${LOSS_LABEL[lossReason]} stays in the record`);
  }
  if (sub.place && !r?.rank) out.push(`Our place now reads ${sub.place[0]} of ${sub.place[1]} on every screen`);
  return out;
}

/** The Project Director submits, or re-submits after a send-back. Needs `debrief.record` and a status of due, overdue or sent back. */
export function submitWrite(ctx: DebriefCtx, input: DebriefInput, person: Person, at: string, opts: { viewAs?: boolean } = {}): DebriefWriteResult | DebriefWriteError {
  const entry = entryFor(ctx, input.tenderId);
  if (isErr(entry)) return entry;
  const allowed = can(person, 'debrief.record', { ...tenderCtx(ctx.tenant, entry.l), viewAs: opts.viewAs });
  if (!allowed.ok) return { error: allowed.reason ?? `Only the Project Director, ${pdName(ctx.tenant)}, records the debrief` };
  if (entry.status === 'submitted') return { error: `The debrief is already submitted and waits for ${hotName(ctx.tenant)}` };
  if (entry.status === 'accepted') return { error: 'The debrief is already accepted into the archive' };
  const vm = vmOf({ ...ctx, viewer: person }, entry);
  const v = validateDebrief(input, vm);
  if (!v.ok) return { error: v.errors[0] };

  const again = entry.status === 'sent-back';
  const round = (entry.record.submission?.round ?? 0) + 1;
  const sub: DebriefSubmission = { ...cleanInput(input, vm), at, byId: person.id, round };
  const lossReason = vm.facts.lossReason;
  const effects = [
    `Sent to ${hotName(ctx.tenant)} for sign-off`,
    vm.group === 'stopped' ? 'Once accepted, it joins the archive' : 'Once accepted, it joins the archive and Stage 9 reads Lessons captured',
    ...(vm.ending === 'lost' && lossReason && sub.main && sub.main !== lossReason
      ? [`On acceptance the loss reason reads ${LOSS_LABEL[sub.main as LossReason]} on every screen; the result's ${LOSS_LABEL[lossReason]} stays in the record`] : []),
    ...(sub.place ? [`On acceptance our place reads ${sub.place[0]} of ${sub.place[1]} on every screen`] : []),
  ];
  return {
    writes: [{ key: debriefKey(input.tenderId), value: JSON.stringify(sub) }],
    audit: [{
      actorId: person.id, action: again ? 'Debrief re-submitted' : 'Debrief submitted', target: input.tenderId,
      detail: `${detailOf(entry, sub)} · ${person.name}, round ${round}`,
    }],
    effects,
  };
}

/** The Head of Tendering accepts the latest submission into the archive. Needs `debrief.accept` and the status submitted. */
export function acceptWrite(ctx: DebriefCtx, tenderId: string, person: Person, at: string, opts: { viewAs?: boolean } = {}): DebriefWriteResult | DebriefWriteError {
  const entry = entryFor(ctx, tenderId);
  if (isErr(entry)) return entry;
  const allowed = can(person, 'debrief.accept', { ...tenderCtx(ctx.tenant, entry.l), viewAs: opts.viewAs });
  if (!allowed.ok) return { error: allowed.reason ?? `Only the Head of Tendering, ${hotName(ctx.tenant)}, accepts a debrief` };
  const sub = entry.record.submission;
  if (entry.status !== 'submitted' || !sub) {
    return { error: entry.status === 'accepted' ? 'The debrief is already accepted into the archive' : `There is no submitted debrief to accept: it waits for ${pdName(ctx.tenant)}` };
  }
  const ok: DebriefAcceptance = { at, byId: person.id, round: sub.round };
  const vm = vmOf({ ...ctx, viewer: person }, entry);
  return {
    writes: [{ key: debriefOkKey(tenderId), value: JSON.stringify(ok) }],
    audit: [{
      actorId: person.id, action: 'Debrief accepted', target: tenderId,
      detail: `${detailOf(entry)} · recorded by ${nameOf(sub.byId) ?? sub.byId}, round ${sub.round}`,
    }],
    effects: ['Accepted into the archive', ...acceptEffects(entry.l, sub, at, vm.facts.lossReason)],
  };
}

/** The Head of Tendering sends the latest submission back with a note (at least 10 characters). Needs `debrief.accept` and the status submitted. */
export function backWrite(ctx: DebriefCtx, tenderId: string, note: string, person: Person, at: string, opts: { viewAs?: boolean } = {}): DebriefWriteResult | DebriefWriteError {
  const entry = entryFor(ctx, tenderId);
  if (isErr(entry)) return entry;
  const allowed = can(person, 'debrief.accept', { ...tenderCtx(ctx.tenant, entry.l), viewAs: opts.viewAs });
  if (!allowed.ok) return { error: allowed.reason ?? `Only the Head of Tendering, ${hotName(ctx.tenant)}, sends a debrief back` };
  const sub = entry.record.submission;
  if (entry.status !== 'submitted' || !sub) return { error: 'Only a submitted debrief can be sent back' };
  const text = note.trim();
  if (text.length < MIN_BACK_NOTE) return { error: `Write a note of at least ${MIN_BACK_NOTE} characters: what should ${pdName(ctx.tenant)} add or change?` };
  const back: DebriefSendBack = { at, byId: person.id, note: text, round: sub.round };
  const pd = nameOf(sub.byId) ?? pdName(ctx.tenant);
  return {
    writes: [{ key: debriefBackKey(tenderId), value: JSON.stringify(back) }],
    audit: [{ actorId: person.id, action: 'Debrief sent back', target: tenderId, detail: `${detailOf(entry)} · round ${sub.round} · Note: ${text}` }],
    effects: [`Sent back to ${pd} with your note`, 'They correct it and submit it again for sign-off'],
  };
}
