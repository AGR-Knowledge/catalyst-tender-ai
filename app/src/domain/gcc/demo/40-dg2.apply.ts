import type { GateRecord } from '@/data/gcc/lifecycle';
import { GATE_SLA_HOURS } from '@/data/gcc/targets';
import { hoursBetween } from '@/data/gcc/lifecycle/chain';
import { firstWithRole } from '@/data/people';
import { packVersionsFor } from '@/domain/gcc/s3/versions';
import { activeDecision, dg2Overlay, reopenState, type Dg2Decision } from '@/domain/gcc/dg2';
import { currentOf } from '@/domain/gcc/lifecycle';
import { asDone, later, type Applier } from './types';

/**
 * DG2 recorded in the demo (plan 021 step 2.4), from plan 009a's decision in
 * force and its re-open history (what `dg2RecordFor` shows):
 * - Bid (with or without conditions), approved by the Head of Tendering: the
 *   gate record, with the conditions count in its note, and Stage 4 entered at
 *   Baseline drafting, owned by the Planning Manager;
 * - No-Bid: the gate record, closed as no-bid with 009a's reason text;
 * - an approved re-open: the earlier round's decision stays as a gate record
 *   marked `reopened`, and the tender is back in Stage 3 at DG2.
 * The DG2 clock runs from the pack's first issue, as 009a's is.
 *
 * Demo-grade: it applies to tenders at DG2 in the seed (Stage 3, no DG2 on record).
 */

const SLA = GATE_SLA_HOURS.DG2;

const conditionsNote = (n: number) => `Bid with ${n} ${n === 1 ? 'condition' : 'conditions'}`;

function gate(d: Dg2Decision, openedAt: string, reopened?: string): GateRecord {
  return {
    gate: 'DG2', decision: d.decision, at: d.at, byId: d.byId, openedAt, slaHours: SLA, onTime: hoursBetween(openedAt, d.at) <= SLA,
    reasonCodes: d.reasonCodes ?? [],
    ...(d.againstMajority ? { againstMajority: true } : {}),
    ...(d.decision === 'bid' && d.conditions.length ? { note: conditionsNote(d.conditions.length) } : {}),
    ...(reopened ? { reopened } : {}),
  };
}

export const applier: Applier = {
  id: 'dg2',
  apply(tenant, l, done) {
    const id = l.tenderId;
    if (!(`dg2:${id}` in done || `dg2-reopen:${id}` in done)) return l;
    if (l.closedAt || currentOf(l).stage !== 3 || l.gates.some((g) => g.gate === 'DG2')) return l;

    const d = asDone(done);
    const active = activeDecision(d, id);
    const re = reopenState(tenant, id, d);
    const openedAt = packVersionsFor(tenant, id, d).firstIssuedAt ?? (l.facts?.stage === 3 ? l.facts.issuedAt : undefined) ?? currentOf(l).at;

    const gates = [...l.gates, ...re.previous.map((e) => gate(e.decision, openedAt, e.reason)), ...(active ? [gate(active, openedAt)] : [])];
    if (!active) return gates.length === l.gates.length ? l : { ...l, gates };
    const { facts: _s3, ...rest } = l;
    if (active.decision === 'bid') {
      const ownerId = firstWithRole(tenant, 'plan')?.id ?? null;
      return { ...rest, gates, log: [...l.log, { stage: 4, step: 'baseline-drafting', at: later(active.at, currentOf(l).at), ownerId }] };
    }
    const overlay = dg2Overlay(tenant, id, d);
    return { ...rest, gates, closedAt: active.at, closedAs: 'no-bid', closedNote: overlay?.stage === 'closed' ? overlay.reason : 'No-Bid at DG2' };
  },
};
