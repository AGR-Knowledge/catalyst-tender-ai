import { GATES, STAGES } from '@/data/stages';
import type { Stage } from '@/data/types';
import { GATE_SLA_HOURS, HANDOVER_DAYS, RATE_BANDS, TURNAROUND_HOURS } from '@/data/gcc/targets';
import { INTAKE_TARGET_MIN } from '@/domain/gcc/s1/intake';
import { STAGE_BANDS } from '@/domain/gcc/kpi/stages';

/**
 * The user manual's GCC wording (plan 044 review follow-up, user decision
 * 2026-10-06 "Fix for GCC"). `data/stages.ts` stays as the Indian preview has
 * it; in a GCC company this overlay replaces:
 * - the gate owners, as the GCC model has them (dashboards.md §9, R8, R9):
 *   the Bid Manager decides DG1 (the Head of Tendering may record it as a
 *   delegate), the Head of Tendering approves DG2 after the committee's
 *   positions and approves DG3;
 * - the two "Human does" lines that named the old gate owners;
 * - every stage's KPI lines, as targets rather than results. Each target is
 *   the one the GCC KPIs use (the constant it reads, or the catalogue line
 *   cited beside it); a KPI with no target reads "Measured: …".
 */

/** OUT-4 calibration (kpi-and-screen-catalogue §A.5): every band within ±10 points. Mirrors `CALIBRATION_TOLERANCE` in `domain/gcc/company/record.ts`, which isn't exported. */
const CALIBRATION_POINTS = 10;

export function gccGates(head: string): typeof GATES {
  // The owner stays one short line beside the waiting count; the qualification goes on the line below.
  const over: Record<string, { owner: string; after: string }> = {
    DG1: { owner: 'Bid Manager', after: `After Stage 1, recorded against the tender. The ${head} may record it as a delegate` },
    DG2: { owner: head, after: 'After Stage 3, once the committee has recorded its positions on the evidence pack' },
    DG3: { owner: head, after: 'After Stage 7. No submission without this approval' },
  };
  return GATES.map((g) => ({ ...g, ...(over[g.id] ?? {}), sla: `≤ ${GATE_SLA_HOURS[g.id as keyof typeof GATE_SLA_HOURS] ?? ''}h` }));
}

const KPI: Record<number, string[]> = {
  // INT-2, INT-3.
  1: [`Target: intake to logged within ${INTAKE_TARGET_MIN} min (p90)`, 'Target: zero missed tenders on daily reconciliation'],
  // SRC-2, SRC-3.
  2: ['Target: every package with 3 or more levelled quotes, or an accepted gap', `Target: supplier replies on time ${STAGE_BANDS.repliesOnTime.green}% or more`],
  // DEC-2, OUT-4.
  3: [`Target: DG2 decided within ${GATE_SLA_HOURS.DG2} h of the pack`, `Target: calibration within ±${CALIBRATION_POINTS} points per band`],
  // PLN-6, PLN-5.
  4: [`Target: ${RATE_BANDS['PLN-6'].green}% of M2 reconciliations on time`, `Target: re-plan turnaround ${TURNAROUND_HOURS.replan} h or less (p90)`],
  // PRC-2, PRC-5.
  5: [`Target: ${RATE_BANDS['PRC-2'].green}% or more of BOQ value from quotes or rate-library norms`, `Target: re-price turnaround ${TURNAROUND_HOURS.reprice} h or less (p90)`],
  // PRP-6 (information only), PRP-3.
  6: ['Measured: share of drafted text reused from past bids, source cited', 'Target: simulated technical score at or above the pass mark'],
  // CMP-1, CMP-4.
  7: ['Target: zero open mandatory gaps at submission', 'Target: every risk with a named owner'],
  // SUB-2, and the DG3 rule.
  8: ['Target: 100% on-time submission', 'Target: no submission without a DG3 approval'],
  // No GCC target for delivery delays (delivery is outside the demo); RES-2.
  9: ['Measured: delivery delays against the commitments made in the bid', `Target: handover to delivery within ${HANDOVER_DAYS} days of award`],
};

/** "Human does" lines that named the old gate owners, by stage and line. */
const HUMAN: Record<number, Record<number, (head: string) => string>> = {
  3: { 0: (head) => `Committee members record their positions; the ${head} approves at DG2` },
  7: { 1: (head) => `The ${head} approves submission at DG3` },
};

export function gccStages(head: string): Stage[] {
  return STAGES.map((st) => ({
    ...st,
    kpi: KPI[st.n] ?? st.kpi,
    hu: st.hu.map((line, i) => HUMAN[st.n]?.[i]?.(head) ?? line),
  }));
}
