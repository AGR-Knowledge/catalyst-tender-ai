import type { GateRecord, Lifecycle } from '@/data/gcc/lifecycle';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { hoursBetween } from '@/data/gcc/lifecycle/chain';
import { discardNote } from '@/data/gcc/lifecycle/fold';
import { firstWithRole } from '@/data/people';
import type { Dg1Record } from '@/data/gcc/types';
import { dg1RecordFor, reasonLabel, rollupReason, roundOfDg1, type AnyDg1, type Dg1Decision, type Dg1HoldValue } from '@/domain/gcc/dg1';
import { currentOf, openGate } from '@/domain/gcc/lifecycle';
import { asDone, later, type Applier } from './types';

/**
 * DG1 recorded in the demo (plan 021 step 2.1), from plan 007a's
 * `dg1RecordFor`:
 * - Pursue: the gate record, and Stage 2 entered at Packaging at the decision
 *   time, owned by the DG1 team's Procurement owner. Stage 2's facts are
 *   `20-stage2`'s.
 * - Discard: the gate record, closed as discarded with the reason in the
 *   tracker's words.
 * - Hold: the gate record only; the tender stays in Stage 1 with its SLA
 *   running (`standingGate` never counts a live Hold).
 * - Re-open: the cleared decisions stay as gate records marked `reopened`, so
 *   the tender is back awaiting DG1 and the tracker shows the earlier round.
 *
 * Demo-grade: it applies to tenders waiting for DG1 in the seed (Stage 1, no
 * DG1 on record), which is every tender scripts A–C decide at DG1.
 */

type Hold = Dg1HoldValue | Dg1Record;

const isDemoDecision = (d: AnyDg1): d is Dg1Decision => 'snapshot' in d;
const isDemoHold = (h: Hold): h is Dg1HoldValue => 'request' in h;

const SLA = GATE_SLA_HOURS.DG1;

/** When the seed's DG1 gate opened: M1 (the DG1 due time less the SLA), else the step the tender waits at. */
const seedOpenedAt = (l: Lifecycle) => openGate(l)?.openedAt ?? l.log.find((e) => e.step === 'awaiting-dg1')?.at ?? currentOf(l).at;

interface Recorded { decision: GateRecord['decision']; at: string; byId: string; reasonCodes: string[]; note?: string; recommendation?: Dg1Decision['recommendation'] }

function gate(d: Recorded, openedAt: string, reopened?: string): GateRecord {
  return {
    gate: 'DG1', decision: d.decision, at: d.at, byId: d.byId, openedAt, slaHours: SLA, onTime: hoursBetween(openedAt, d.at) <= SLA,
    reasonCodes: d.reasonCodes, ...(d.recommendation ? { recommendation: d.recommendation } : {}),
    ...(d.note ? { note: d.note } : {}), ...(reopened ? { reopened } : {}),
  };
}

/** The seed's words for the first reason ("Discarded at DG1: no team capacity before the deadline"), else its label. */
function closingNote(d: Dg1Decision): string {
  const code = d.reasonCodes[0];
  const seed = discardNote(code && rollupReason(code));
  return seed.includes(': ') || !code ? seed : `Discarded at DG1: ${reasonLabel(code)}`;
}

export const applier: Applier = {
  id: 'dg1',
  apply(tenant, l, done) {
    const id = l.tenderId;
    if (!(`dg1:${id}` in done || `dg1-hold:${id}` in done || `dg1-reopen:${id}` in done)) return l;
    if (l.closedAt || currentOf(l).stage !== 1 || l.gates.some((g) => g.gate === 'DG1')) return l;

    const s = dg1RecordFor(tenant, id, asDone(done));
    const opened = seedOpenedAt(l);
    // Round n opens at the re-open that closed round n − 1; round 1 at the seed's M1.
    const openedFor = (round: number) => (round > 1 ? s.reopens[round - 2]?.at : undefined) ?? opened;

    const gates = [...l.gates];
    for (const e of s.reopens) {
      if (e.cleared && isDemoDecision(e.cleared)) gates.push(gate(e.cleared, openedFor(roundOfDg1(e.cleared)), e.reason));
    }
    const c = s.current && s.source === 'demo' && isDemoDecision(s.current) ? s.current : null;
    if (c) gates.push(gate(c, openedFor(roundOfDg1(c))));
    else if (s.hold && isDemoHold(s.hold)) {
      const h = s.hold;
      gates.push(gate({ decision: 'hold', at: h.at, byId: h.byId, reasonCodes: ['information-requested'], note: h.request.what }, openedFor(roundOfDg1(h))));
    }

    if (!c) return gates.length === l.gates.length ? l : { ...l, gates };
    const { facts: _seedFacts, ...rest } = l;
    if (c.decision === 'pursue') {
      const ownerId = c.team?.proc || firstWithRole(tenant, 'proc')?.id || null;
      return { ...rest, gates, log: [...l.log, { stage: 2, step: 'packaging', at: later(c.at, currentOf(l).at), ownerId }] };
    }
    return { ...rest, gates, closedAt: c.at, closedAs: 'discarded', closedNote: closingNote(c) };
  },
};
