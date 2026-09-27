import { gccData, isGccTenantKey } from '@/data/gcc';
import type { GateRecord, Lifecycle, S7Facts, S8Facts } from '@/data/gcc/lifecycle';
import { hoursBetween } from '@/data/gcc/lifecycle/chain';
import { activeDecision, DG3_SLA_HOURS, dg3EvidenceFor, dg3Prefixes, dg3ReasonText, openedAtOf, reopenOf, roundOf, type Dg3Decision } from '@/domain/gcc/dg3';
import { currentOf } from '@/domain/gcc/lifecycle';
import { asDone, hasKey, later, type Applier } from './types';

/**
 * DG3 recorded in the demo (plan 018 step 2.4), from the decision in force
 * and the re-open history (what `dg3RecordFor` shows):
 * - approved: the gate record, and Stage 8 entered at Assembling, owned by the Bid Manager,
 *   with Stage 8 facts read from the DG3 evidence (`s8FactsOf`), so the Stage 8 tiles count it;
 * - rejected: the gate record, closed as rejected with the generator's wording;
 * - a re-open: the earlier decision stays as a gate record marked `reopened`,
 *   and the tender is back at DG3 pack issued;
 * - send-back and re-issue move no stage, but each round's clock runs from
 *   its opening, so a re-issue moves the Stage 7 facts' `dg3IssuedAt` and the
 *   48 h clock restarts on every dashboard.
 *
 * Demo-grade: it applies to tenders at DG3 in the seed (Stage 7, DG3 pack
 * issued, no DG3 on record).
 */

function gate(d: Dg3Decision, openedAt: string, reopened?: string): GateRecord {
  return {
    gate: 'DG3', decision: d.decision, at: d.at, byId: d.byId, openedAt, slaHours: DG3_SLA_HOURS,
    onTime: hoursBetween(openedAt, d.at) <= DG3_SLA_HOURS, reasonCodes: d.reasonCodes,
    ...(d.note ? { note: d.note } : {}),
    ...(reopened ? { reopened } : {}),
  };
}

/**
 * Stage 8 facts for a tender approved at DG3 (plan 016a 3.1), from the pack the Head of Tendering approved:
 * - bond: the evidence's initial guarantee (after any bank extension on a re-issue), issued;
 * - signaturesPending: the signatories not yet ready;
 * - openingDate: the register's bid opening, else the submission deadline (bids are opened at the deadline);
 * - packageReadyPct: the Stage 7 requirements evidenced ÷ all requirements, in %, rounded.
 */
function s8FactsOf(tenant: string, l: Lifecycle, f: S7Facts, done: ReturnType<typeof asDone>): S8Facts | null {
  const ev = dg3EvidenceFor(tenant, l.tenderId, done)?.evidence;
  if (!ev) return null;
  const reg = isGccTenantKey(tenant) ? gccData(tenant).register.find((t) => t.id === l.tenderId) : undefined;
  const openingDate = reg?.keyDates.find((k) => k.kind === 'opening')?.date ?? l.submissionDeadline?.date;
  if (!openingDate) return null;
  const { evidenced, total } = f.requirements;
  return {
    stage: 8,
    packageReadyPct: total ? Math.round((evidenced / total) * 100) : 100,
    signaturesPending: ev.signatories.filter((x) => !x.ready).length,
    bond: { amount: ev.bond.amount, validTo: ev.bond.validTo, requiredTo: ev.bond.requiredTo, issued: true },
    openingDate,
  };
}

export const applier: Applier = {
  id: 'dg3',
  apply(tenant, l, done) {
    const id = l.tenderId;
    if (!hasKey(done, ...dg3Prefixes(id))) return l;
    const cur = currentOf(l);
    const f = l.facts;
    if (l.closedAt || cur.stage !== 7 || cur.step !== 'dg3-issued' || f?.stage !== 7 || !f.dg3IssuedAt || l.gates.some((g) => g.gate === 'DG3')) return l;

    const d = asDone(done);
    const issuedAt = f.dg3IssuedAt;
    const round = roundOf(d, id);
    const openedAt = openedAtOf(d, id, round, issuedAt);
    const history = reopenOf(d, id)?.history ?? [];
    const gates = [...l.gates, ...history.map((e) => gate(e.decision, openedAtOf(d, id, e.round, issuedAt), e.reason))];
    const active = activeDecision(d, id);

    if (!active) {
      const facts = openedAt === issuedAt ? f : { ...f, dg3IssuedAt: openedAt };
      return gates.length === l.gates.length && facts === f ? l : { ...l, gates, facts };
    }
    const all = [...gates, gate(active, openedAt)];
    const { facts: _s7, ...rest } = l;
    if (active.decision === 'approved') {
      const s8 = s8FactsOf(tenant, l, f, d);
      return { ...rest, gates: all, log: [...l.log, { stage: 8, step: 'assembling', at: later(active.at, cur.at), ownerId: l.bidManagerId }], ...(s8 ? { facts: s8 } : {}) };
    }
    return { ...rest, gates: all, closedAt: active.at, closedAs: 'rejected', closedNote: `Rejected at DG3: ${dg3ReasonText(active.reasonCodes)}` };
  },
};
