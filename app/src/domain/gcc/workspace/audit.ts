import type { Tone } from '@/data/types';
import { can } from '@/data/access';
import { personById, roleLine, type Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { stageLabel, stepLabel } from '@/data/gcc/stages';
import type { GateRecord } from '@/data/gcc/lifecycle';
import type { AuditEvent } from '@/state/store';
import { DEMO_TODAY, dateText } from '@/domain/calendar';
import { queriesFor, tenderCtx, type DemoDone } from '@/domain/gcc/lifecycle.port';
import { hoursText } from '@/domain/gcc/lifecycle';
import { hoursBetween } from '@/data/gcc/lifecycle/chain';
import { AGAINST_MAJORITY_TEXT } from '@/domain/gcc/dg2/decision';
import { reasonText } from './rail';

/**
 * The tender's timeline for Decisions & audit (spec §4.1, §5.8): stage moves
 * and gate records from the lifecycle, and the actions taken in the demo
 * (the tenant's `AuditEvent`s on this tender), newest first, grouped by day.
 * Masking follows the viewer: a gate note that states margin figures, and the
 * committee majority, stay masked as the port masks them.
 */

export interface TimelineEntryVM {
  key: string;
  at: string;
  actor: { name: string; role: string | null };
  system: boolean;
  action: string;
  chip?: { label: string; tone: Tone };
  /** "Override", "Approval differs from majority". */
  flag?: string;
  before?: string;
  after?: string;
  detail?: string;
  from: 'lifecycle' | 'demo';
}

export interface TimelineDayVM { date: string; label: string; entries: TimelineEntryVM[] }

const DECISION: Record<GateRecord['decision'], { label: string; tone: Tone }> = {
  pursue: { label: 'Pursue', tone: 'green' }, discard: { label: 'Discard', tone: 'red' }, hold: { label: 'Hold', tone: 'orange' },
  bid: { label: 'Bid', tone: 'green' }, 'no-bid': { label: 'No-Bid', tone: 'red' }, approved: { label: 'Approved', tone: 'green' }, rejected: { label: 'Rejected', tone: 'red' },
};
const REC_WORD: Record<string, string> = { pursue: 'Pursue', conditions: 'Pursue with conditions', discard: 'Discard' };
const HAS_FIGURE = /\d+(\.\d+)?\s?%|\b(SAR|AED|QAR|OMR|KWD|USD|EUR)\s?\d/;
const PLATFORM = { name: 'Platform', role: null };

const who = (id: string | null | undefined) => {
  const p = personById(id);
  return p ? { name: p.name, role: roleLine(p) } : id ? { name: id, role: null } : PLATFORM;
};

export function auditTimeline(tenant: string, tenderId: string, done: DemoDone, audit: AuditEvent[], viewer: Person): TimelineDayVM[] {
  const l = queriesFor({ tenant, viewer, done }).one(tenderId);
  const out: TimelineEntryVM[] = [];
  if (l) {
    const ctx = tenderCtx(tenant, l);
    const seeMargin = can(viewer, 'see.margin', ctx).ok;
    const seePositions = can(viewer, 'see.positions', ctx).ok;
    const src = isGccTenantKey(tenant) ? gccData(tenant).sources.find((s) => s.id === l.source.sourceId)?.name : undefined;
    out.push({
      key: 'captured', at: l.capturedAt, actor: { name: 'Intake & Extraction agent', role: null }, system: true, from: 'lifecycle',
      action: `Captured from ${src ?? l.source.sourceId}`, detail: `Reference ${l.source.ref}`,
    });
    // Stage entries (the first log entry of each stage, with the step it opened on), then each step within the stage.
    let prev: { stage: number; at: string } | null = null;
    for (const e of l.log) {
      const owner = personById(e.ownerId);
      if (prev && e.stage === prev.stage) {
        out.push({
          key: `step:${e.stage}:${e.step}:${e.at}`, at: e.at, actor: PLATFORM, system: true, from: 'lifecycle',
          action: stepLabel(e.stage, e.step), detail: owner ? `With ${owner.name}, ${roleLine(owner)}` : undefined,
        });
        continue;
      }
      out.push({
        key: `stage:${e.stage}:${e.at}`, at: e.at, actor: PLATFORM, system: true, from: 'lifecycle',
        action: prev ? `Moved to ${stageLabel(e.stage)}` : `Opened in ${stageLabel(e.stage)}`,
        ...(prev ? { before: stageLabel(prev.stage), after: stageLabel(e.stage) } : {}),
        detail: [stepLabel(e.stage, e.step), owner ? `with ${owner.name}, ${roleLine(owner)}` : null].filter(Boolean).join(' · '),
      });
      prev = { stage: e.stage, at: e.at };
    }
    for (const g of l.gates) {
      const d = DECISION[g.decision];
      const late = hoursBetween(g.openedAt, g.at) - g.slaHours;
      const override = g.gate === 'DG1' && g.recommendation
        && ((g.decision === 'pursue' && g.recommendation === 'discard') || (g.decision === 'discard' && g.recommendation === 'pursue'));
      const maskFigures = !!g.note && g.gate !== 'DG1' && HAS_FIGURE.test(g.note) && !seeMargin;
      const maskPositions = !!g.note && !!g.againstMajority && !seePositions;
      const parts = [
        g.onTime ? `On time (within ${g.slaHours} h)` : `Late by ${hoursText(late)} against ${g.slaHours} h`,
        g.recommendation ? `Recommendation: ${REC_WORD[g.recommendation]}` : null,
        g.reasonCodes.length ? `Reasons: ${g.reasonCodes.map(reasonText).join(', ')}` : null,
        g.note ? (maskFigures ? 'Note: masked for your role (it states margin figures)' : maskPositions ? 'Note: masked for your role (it refers to committee positions)' : `Note: ${g.note}`) : null,
        g.reopened ? `Re-opened later: ${g.reopened}` : null,
      ];
      out.push({
        key: `gate:${g.gate}:${g.at}`, at: g.at, actor: who(g.byId), system: false, from: 'lifecycle',
        action: `${g.gate} decision recorded`, chip: { label: d.label, tone: d.tone },
        ...(override ? { flag: `Override of ${REC_WORD[g.recommendation!]}` } : g.againstMajority && seePositions ? { flag: AGAINST_MAJORITY_TEXT } : {}),
        detail: parts.filter(Boolean).join(' · '),
      });
    }
    if (l.submission) {
      out.push({
        key: 'submitted', at: l.submission.at, actor: who(l.bidManagerId), system: false, from: 'lifecycle',
        action: `Bid submitted on ${l.submission.portal}`, detail: [l.submission.onTime ? 'Before the deadline' : 'After the deadline', l.submission.receipt ? `Receipt ${l.submission.receipt}` : null].filter(Boolean).join(' · '),
      });
    }
    if (l.result && (l.result.result === 'won' || l.result.result === 'lost')) {
      out.push({
        key: 'result', at: l.result.at, actor: PLATFORM, system: true, from: 'lifecycle',
        action: 'Result received', chip: l.result.result === 'won' ? { label: 'Won', tone: 'green' } : { label: 'Lost', tone: 'grey' },
      });
    }
    if (l.closedAt && l.closedAs === 'withdrawn') {
      out.push({ key: 'closed', at: l.closedAt, actor: PLATFORM, system: true, from: 'lifecycle', action: 'Withdrawn', detail: l.closedNote });
    }
  }
  const tctx = l ? tenderCtx(tenant, l) : {};
  const sees = { margin: can(viewer, 'see.margin', tctx).ok, positions: can(viewer, 'see.positions', tctx).ok, quotes: can(viewer, 'see.quotes', tctx).ok };
  const hidden = (e: AuditEvent) => !!e.sensitive && !sees[e.sensitive];
  for (const e of audit.filter((x) => x.target === tenderId)) {
    const detail = e.detail && hidden(e) ? `Details masked for your role (${e.sensitive === 'positions' ? 'committee positions' : e.sensitive})` : e.detail;
    out.push({ key: e.id, at: e.at, actor: who(e.actorId), system: false, from: 'demo', action: e.action, ...(detail ? { detail } : {}) });
  }

  out.sort((a, b) => b.at.localeCompare(a.at) || (a.from === 'demo' ? -1 : 1));
  const days = new Map<string, TimelineEntryVM[]>();
  for (const e of out) {
    const d = e.at.slice(0, 10);
    days.set(d, [...(days.get(d) ?? []), e]);
  }
  return [...days.entries()].map(([date, entries]) => ({ date, label: date === DEMO_TODAY ? `Today · ${dateText(date)}` : dateText(date), entries }));
}

/** The newest entries, across days. */
export const latestOf = (days: TimelineDayVM[], n: number) => days.flatMap((d) => d.entries).slice(0, n);
