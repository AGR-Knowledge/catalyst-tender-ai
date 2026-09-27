import { firstWithRole, personById } from '@/data/people';
import { readDone, type Done } from '@/domain/gcc/s3/done';
import { backKey, reissueKey, roundOf, type Dg3Decision, type Dg3LineState, type Dg3ReissueValue, type Dg3SendBackValue } from './keys';
import { dayText, evidenceText } from './evidence';
import { DG3_LABEL, dg3ReasonLabel, dg3State } from './decision';

/**
 * The DG3 record (plan 018 step 2.5): the decision in force with who, when,
 * the evidence as it was seen and why; the decisions re-opened before it;
 * and every event in order (issue, send-backs, re-issues, decisions and
 * re-opens), each with who and when, for the record panel and the audit.
 * Without `see.margin`, the price and margin lines read masked, and so does a
 * decision note (it may state them).
 */

export interface Dg3Viewer { canSeeMargin: boolean }

export interface Dg3DecisionVM {
  decision: Dg3Decision['decision'];
  label: string;
  at: string;
  byId: string;
  byName: string;
  round: number;
  reasons: string[];
  note?: string;
  noteMasked: boolean;
  evidence: { key: string; label: string; state: Dg3LineState; text: string; masked: boolean }[];
  passed: number;
  failed: number;
  info: number;
  /** "7 checks passed, 1 for information". */
  evidenceText: string;
}

export type Dg3EventKind = 'issued' | 'send-back' | 'reissue' | 'decision' | 'reopen';

export interface Dg3EventVM { kind: Dg3EventKind; round: number; at: string; byId: string | null; byName: string; title: string; detail?: string }

export interface Dg3RecordVM {
  tenderId: string;
  decision: Dg3DecisionVM | null;
  /** Decisions taken out of force by a re-open, oldest first, each with the re-open. */
  previous: (Dg3DecisionVM & { reopen: { reason: string; at: string; byName: string } })[];
  events: Dg3EventVM[];
}

export const NOTE_MASKED = 'Note masked for your role (it may state the price or margin)';

const nameOf = (id: string | null | undefined) => personById(id)?.name ?? id ?? '';

function decisionVM(d: Dg3Decision, viewer?: Dg3Viewer): Dg3DecisionVM {
  const hide = !!viewer && !viewer.canSeeMargin;
  const evidence = d.evidenceSnapshot.map((l) => ({
    key: l.key, label: l.label, state: l.state,
    text: hide && l.maskedText ? l.maskedText : l.text,
    masked: hide && !!l.maskedText,
  }));
  const count = (s: Dg3LineState) => evidence.filter((l) => l.state === s).length;
  const passed = count('pass');
  const failed = count('fail');
  const info = count('info');
  return {
    decision: d.decision, label: DG3_LABEL[d.decision], at: d.at, byId: d.byId, byName: nameOf(d.byId), round: d.round,
    reasons: d.reasonCodes.map(dg3ReasonLabel),
    ...(d.note ? { note: hide ? NOTE_MASKED : d.note } : {}),
    noteMasked: hide && !!d.note,
    evidence, passed, failed, info,
    evidenceText: evidenceText({ passed, failed, info }),
  };
}

export function dg3RecordFor(tenant: string, tenderId: string, done: Done, viewer?: Dg3Viewer): Dg3RecordVM | null {
  const s = dg3State(tenant, tenderId, done);
  if (!s) return null;
  const round = roundOf(done, tenderId);
  const comp = firstWithRole(tenant, 'comp');
  const events: Dg3EventVM[] = [{
    kind: 'issued', round: 1, at: s.evaluation.issuedAt, byId: comp?.id ?? null, byName: comp?.name ?? 'Compliance',
    title: 'DG3 pack issued', detail: `The ${s.evaluation.lines.length} evidence lines, for the Head of Tendering`,
  }];
  const decisionEvent = (d: Dg3Decision): Dg3EventVM => {
    const vm = decisionVM(d, viewer);
    return {
      kind: 'decision', round: d.round, at: d.at, byId: d.byId, byName: vm.byName, title: vm.label,
      detail: [vm.reasons.length ? `Reasons: ${vm.reasons.join(', ')}` : '', `Evidence: ${vm.evidenceText}`, vm.note ?? ''].filter(Boolean).join(' · '),
    };
  };

  // Round by round: a send-back, then the decision taken in the round (Reject stays open while it is back), then what ended it.
  for (let r = 1; r <= round; r++) {
    const back = readDone<Dg3SendBackValue>(done, backKey(tenderId, r));
    if (back) events.push({ kind: 'send-back', round: r, at: back.at, byId: back.byId, byName: nameOf(back.byId), title: 'Sent back to Compliance', detail: `To ${nameOf(back.toId)}: ${back.note}` });
    const reopen = s.reopens.find((e) => e.round === r);
    const decided = reopen?.decision ?? (r === round ? s.decision : null);
    if (decided) events.push(decisionEvent(decided));
    const reissue = readDone<Dg3ReissueValue>(done, reissueKey(tenderId, r));
    if (reissue && r < round) {
      events.push({
        kind: 'reissue', round: r, at: reissue.at, byId: reissue.byId, byName: nameOf(reissue.byId), title: 'DG3 pack re-issued',
        detail: [`Round ${r + 1}: the clock restarts`, reissue.fixed ? `The bank extended the initial guarantee to ${dayText(s.evaluation.evidence.bond.validTo)} (demo control)` : ''].filter(Boolean).join(' · '),
      });
    }
    if (reopen) events.push({ kind: 'reopen', round: r, at: reopen.at, byId: reopen.byId, byName: nameOf(reopen.byId), title: 'DG3 re-opened', detail: reopen.reason });
  }

  return {
    tenderId,
    decision: s.decision ? decisionVM(s.decision, viewer) : null,
    previous: s.reopens.map((e) => ({ ...decisionVM(e.decision, viewer), reopen: { reason: e.reason, at: e.at, byName: nameOf(e.byId) } })),
    events,
  };
}
