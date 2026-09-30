import { firstWithRole, personById } from '@/data/people';
import { LOSS_IN_SENTENCE, type LossReason } from '@/data/gcc/debriefs/vocab';
import { DBR3_WAIT_DAYS } from '@/data/gcc/targets';
import { addDays, workingDaysBetween } from '@/domain/calendar';
import { recordsFor, type DebriefEntry } from '../debriefs/records';
import { endingLabelOf, gateReasonsOf } from '../debriefs/vm';
import type { KpiCtx } from '../kpi/types';
import type { ActionPrimary, ActionVM } from '../viewmodels';
import { ccOf, dayText, dayTimeText, daysBetween, minsTo, plural, stageNow, stageOwner, urgency, waitingOn } from '../kpi/stages';
import type { ActionSource } from './types';

/**
 * The debrief rows of Needs your action (plan 035 step 4.2). `debrief.record`
 * replaces Stage 9's old `debrief.hold` and `lessons.record`: one row per
 * debrief the Project Director still owes, so one tender never shows twice.
 * `debrief.accept` is the Head of Tendering's sign-off, on the portfolio
 * scale after the late inputs. Both read `recordsFor`, as DBR-3 and DBR-4 do,
 * so a tile and its rows never disagree.
 */

/** A debrief owed in the 30 days to the clock, or on a tender still live at Stage 9. */
const RECENT_DAYS = 30;

const tender = (e: DebriefEntry) => ({ tenderId: e.l.tenderId, shortTitle: e.l.shortTitle });

const toTab = (label: string, tenderId: string): ActionPrimary => ({ kind: 'route', label, to: `/tenders/${encodeURIComponent(tenderId)}?tab=debrief` });

const entries = (ctx: KpiCtx) => recordsFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done, now: ctx.now });

/** "Debrief with the employer booked Thu 12 Mar, 11:00", "… held Tue 3 Mar", or "Ask the employer for a debrief". */
function employerLine(ctx: KpiCtx, e: DebriefEntry): string {
  const at = e.l.facts?.stage === 9 ? e.l.facts.debriefAt : undefined;
  if (!at) return 'Ask the employer for a debrief';
  return at > ctx.now ? `Debrief with the employer booked ${dayTimeText(at)}` : `Debrief with the employer held ${dayText(at)}`;
}

/** What the Project Director is asked, by ending. */
function recordText(ctx: KpiCtx, e: DebriefEntry): string {
  const { l, record } = e;
  if (record.sentBack) {
    return `Sent back by ${personById(record.sentBack.byId)?.name ?? 'the Head of Tendering'}: "${record.sentBack.note}"`;
  }
  const on = dayText(record.endedAt);
  if (record.ending === 'lost') {
    const r = l.result!;
    const rank = r.rank ? `, ranked ${r.rank[0]} of ${r.rank[1]}` : '';
    return `Lost ${on} on ${LOSS_IN_SENTENCE[(r.lossReason ?? 'other') as LossReason]}${rank}: record why. ${employerLine(ctx, e)}`;
  }
  if (record.ending === 'won') return `Won ${on}: record why we won while the team remembers`;
  const reasons = gateReasonsOf(l, record.ending);
  return `${endingLabelOf(record.ending)} ${on}${reasons?.length ? ` (${reasons.join(', ')})` : ''}: record what we learned`;
}

/** A row that waits on someone else sorts after the viewer's own, as the Stage 9 rows do. */
const waited = (u: number, waiting: boolean) => (waiting && u >= 1e13 ? u + 1e12 : u);

const debriefRecord: ActionSource = {
  id: 'debrief.record', cap: 'debrief.view',
  rows(ctx) {
    const today = ctx.now.slice(0, 10);
    const from = addDays(today, -RECENT_DAYS);
    const pd = stageOwner(ctx.tenant, 9);
    return entries(ctx)
      .filter((e) => (e.status === 'due' || e.status === 'overdue' || e.status === 'sent-back')
        && (e.record.endedAt.slice(0, 10) >= from || (!e.l.closedAt && stageNow(e.l) === 9)))
      .map((e): ActionVM => {
        const late = e.record.dueBy < today;
        const who = waitingOn(ctx.viewer, pd);
        return {
          id: `debrief.record:${e.l.tenderId}`, source: 'debrief.record',
          type: 'Debrief', typeTone: e.status === 'overdue' || e.status === 'sent-back' ? 'orange' : undefined, ...tender(e),
          what: recordText(ctx, e),
          due: late
            ? { kind: 'text', text: `Overdue since ${dayText(e.record.dueBy)}`, tone: 'orange' }
            : { kind: 'date', date: e.record.dueBy },
          waitingOn: who,
          primary: toTab('Record the debrief', e.l.tenderId),
          urgency: waited(urgency(false, minsTo(ctx, e.record.dueBy)), !!who),
        };
      });
  },
};

/** The portfolio scale (plan 015's `urgencyOf`): not blocking, after `input.nudge`, the longest waiting first. */
const TYPE_AFTER_NUDGE = 11;
const acceptUrgency = (minutesLeft: number, repeat: number, waiting: boolean) =>
  1e13 + (waiting ? 1e12 : 0) + Math.min(repeat, 9) * 1e11 + TYPE_AFTER_NUDGE * 1e8 + Math.min(9.9e7, Math.max(0, minutesLeft + 1e6));

const debriefAccept: ActionSource = {
  id: 'debrief.accept', cap: 'debrief.view',
  rows(ctx) {
    const hot = firstWithRole(ctx.tenant, 'hot');
    const who = waitingOn(ctx.viewer, hot);
    return entries(ctx)
      .filter((e) => e.status === 'submitted')
      .sort((a, b) => a.record.submission!.at.localeCompare(b.record.submission!.at) || a.l.tenderId.localeCompare(b.l.tenderId))
      .map((e, i): ActionVM => {
        const s = e.record.submission!;
        const days = daysBetween(s.at, ctx.now);
        const wd = workingDaysBetween(s.at.slice(0, 10), ctx.now.slice(0, 10), ccOf(ctx.tenant, e.l));
        return {
          id: `debrief.accept:${e.l.tenderId}`, source: 'debrief.accept',
          type: 'Debrief sign-off', typeTone: wd > DBR3_WAIT_DAYS ? 'orange' : undefined, ...tender(e),
          what: `${endingLabelOf(e.record.ending)} ${dayText(e.record.endedAt)}: recorded by ${personById(s.byId)?.name ?? 'the Project Director'}, ${dayTimeText(s.at)}`,
          due: { kind: 'text', text: days > 0 ? `Waiting ${plural(days, 'day')}` : 'Submitted today', ...(wd > DBR3_WAIT_DAYS ? { tone: 'orange' as const } : {}) },
          waitingOn: who,
          primary: toTab('Review the debrief', e.l.tenderId),
          urgency: acceptUrgency(minsTo(ctx, s.at), i, !!who),
        };
      });
  },
};

export const ACTION_SOURCES: ActionSource[] = [debriefRecord, debriefAccept];
