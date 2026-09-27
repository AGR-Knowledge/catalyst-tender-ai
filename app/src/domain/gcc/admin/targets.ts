import {
  AHEAD_DAYS, CRITICAL_WD, DG2_QUORUM, DG2_SEATS, ESTIMATED_SHARE_BAND, GATE_SLA_HOURS, HANDOVER_DAYS, MIN_N, NEAR_WD, RATE_BANDS,
  SLA_AT_RISK_SHARE, SLA_OK_SHARE, TURNAROUND_HOURS, type RateBand,
} from '@/data/gcc/targets';
import { PORTFOLIO_BANDS, TENANT_TARGETS } from '@/data/gcc/portfolio';
import {
  QUOTES_TO_COVER, REMINDER_DAYS_BEFORE, RESCREEN_DAYS, RFQ_CLOCK_HOURS, RFQ_CLOCK_WARN_HOURS, RFQ_REPLY_WORKING_DAYS,
} from '@/data/gcc/s2/benchmarks';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { STAGE_BANDS } from '@/domain/gcc/kpi/stages';
import { INTAKE_TARGET_MIN } from '@/domain/gcc/s1/intake';
import { DG1_SLA_HOURS } from '@/domain/gcc/dg1/record';
import { money } from '@/domain/money';

/**
 * Administration › Targets & SLAs (plan 024 Phase 3, catalogue §0.4): every
 * target and time limit the dashboards and rules read, with its value, what
 * uses it and the file it lives in. Values are imported, never retyped, so the
 * list can't drift from the screens. Listed, not edited: in the product each
 * is a tenant setting; in the demo they are the spec's defaults.
 */

export type TargetGroup = 'Gates' | 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stages 4–9' | 'Portfolio';

export const TARGET_GROUPS: TargetGroup[] = ['Gates', 'Stage 1', 'Stage 2', 'Stage 3', 'Stages 4–9', 'Portfolio'];

/** A tile (by KPI id; the page names it from the registry) or a rule in words. */
export type TargetUse = { kpi: string } | { rule: string };

export interface TargetRow {
  id: string;
  group: TargetGroup;
  name: string;
  /** The value with its unit: "24 h", "15 min", "3 of 5", "green at 100% · orange from 90%". */
  text: string;
  /** The numbers behind `text`, as imported (the dev check compares them with the constants). */
  values: number[];
  usedBy: TargetUse[];
  /** Where the value lives, from `src/`. */
  source: string;
  /** The same target read from a second place: the dev check asserts the two agree. */
  alsoIn?: { source: string; value: number };
}

const TARGETS_FILE = 'data/gcc/targets.ts';
const BANDS_FILE = 'domain/gcc/kpi/stages.ts';
const PORTFOLIO_FILE = 'data/gcc/portfolio.ts';
const S2_FILE = 'data/gcc/s2/benchmarks.ts';

const k = (id: string): TargetUse => ({ kpi: id });
const r = (rule: string): TargetUse => ({ rule });
const pct = (share: number) => Math.round(share * 100);
const wd = (n: number) => `${n} working day${n === 1 ? '' : 's'}`;

/** "green at 100% · orange from 90%" for an at-or-above band. */
const atLeast = (b: RateBand) => (b.orange > 0 ? `green at ${b.green}% · orange from ${b.orange}%` : `green only at ${b.green}%`);
/** "green up to 85% · orange up to 100%" for an at-or-under band. */
const atMost = (b: { green: number; orange: number }, of = '') => `green up to ${b.green}%${of} · orange up to ${b.orange}%${of}`;

function band(id: string, group: TargetGroup, name: string, b: RateBand, usedBy: TargetUse[], source = TARGETS_FILE): TargetRow {
  return { id, group, name, text: atLeast(b), values: [b.green, b.orange], usedBy, source };
}

export function targetsOf(tenant: string): TargetRow[] {
  const fit = isGccTenantKey(tenant) ? gccData(tenant).fit : null;
  const goals = isGccTenantKey(tenant) ? TENANT_TARGETS[tenant] : null;
  const seedFile = `data/gcc/tenants/${tenant}.ts`;

  const rows: TargetRow[] = [
    // Gates
    { id: 'gate.dg1', group: 'Gates', name: 'DG1 decision, from the tender being logged', text: `${GATE_SLA_HOURS.DG1} h`, values: [GATE_SLA_HOURS.DG1],
      usedBy: [k('SCR-1'), k('PF-4'), r('DG1 queue clock')], source: TARGETS_FILE, alsoIn: { source: 'domain/gcc/dg1/record.ts', value: DG1_SLA_HOURS } },
    { id: 'gate.dg2', group: 'Gates', name: 'DG2 decision, from the pack being issued', text: `${GATE_SLA_HOURS.DG2} h`, values: [GATE_SLA_HOURS.DG2],
      usedBy: [k('DEC-1'), k('PF-4'), r('DG2 clock on the pack')], source: TARGETS_FILE },
    { id: 'gate.dg3', group: 'Gates', name: 'DG3 decision, from the pack being issued', text: `${GATE_SLA_HOURS.DG3} h`, values: [GATE_SLA_HOURS.DG3],
      usedBy: [k('PF-4'), k('CMP-6')], source: TARGETS_FILE },
    { id: 'gate.quorum', group: 'Gates', name: 'DG2 quorum: positions recorded', text: `${DG2_QUORUM} of ${DG2_SEATS}`, values: [DG2_QUORUM, DG2_SEATS],
      usedBy: [k('DEC-1'), r('The Head of Tendering’s DG2 approval unlocks')], source: TARGETS_FILE },
    band('gate.pf4', 'Gates', 'Decisions on time', RATE_BANDS['PF-4'], [k('PF-4')]),
    band('gate.cmp6', 'Gates', 'DG3 on time', RATE_BANDS['CMP-6'], [k('CMP-6')]),

    // Stage 1
    { id: 's1.intake', group: 'Stage 1', name: 'Intake to logged, p90', text: `${INTAKE_TARGET_MIN} min`, values: [INTAKE_TARGET_MIN],
      usedBy: [k('INT-2'), r('Intake steps')], source: 'domain/gcc/s1/intake.ts' },
    { id: 's1.intakeOrange', group: 'Stage 1', name: 'Intake to logged, orange up to', text: `${STAGE_BANDS.intakeOrangeMin} min`, values: [STAGE_BANDS.intakeOrangeMin],
      usedBy: [k('INT-2')], source: BANDS_FILE },
    { id: 's1.queueOldest', group: 'Stage 1', name: 'Oldest field to check, red after', text: `${STAGE_BANDS.queueOldestRedH} h`, values: [STAGE_BANDS.queueOldestRedH],
      usedBy: [k('INT-5'), r('Intake queue')], source: BANDS_FILE },
    { id: 's1.booklet', group: 'Stage 1', name: 'Booklet purchase closing, orange within', text: wd(STAGE_BANDS.bookletWd), values: [STAGE_BANDS.bookletWd],
      usedBy: [k('INT-10')], source: BANDS_FILE },
    ...(fit ? [
      { id: 's1.pursueAt', group: 'Stage 1' as const, name: 'Fit score: Pursue at', text: `${fit.pursueAt} of 100`, values: [fit.pursueAt],
        usedBy: [r('The fit recommendation'), r('Screening')], source: seedFile },
      { id: 's1.conditionsFrom', group: 'Stage 1' as const, name: 'Fit score: Pursue with conditions from', text: `${fit.conditionsFrom} of 100`, values: [fit.conditionsFrom],
        usedBy: [r('The fit recommendation'), r('Screening')], source: seedFile },
    ] : []),

    // Stage 2
    { id: 's2.rfqClock', group: 'Stage 2', name: 'Every package out after DG1', text: `${RFQ_CLOCK_HOURS} h`, values: [RFQ_CLOCK_HOURS],
      usedBy: [k('SRC-1'), r('Packages & RFQs clock')], source: S2_FILE, alsoIn: { source: TARGETS_FILE, value: TURNAROUND_HOURS.rfqsAfterDg1 } },
    { id: 's2.rfqWarn', group: 'Stage 2', name: 'RFQ clock, orange with', text: `${RFQ_CLOCK_WARN_HOURS} h left`, values: [RFQ_CLOCK_WARN_HOURS],
      usedBy: [r('Packages & RFQs clock')], source: S2_FILE },
    { id: 's2.reply', group: 'Stage 2', name: 'Supplier reply window', text: wd(RFQ_REPLY_WORKING_DAYS), values: [RFQ_REPLY_WORKING_DAYS],
      usedBy: [k('SRC-3'), r('RFQ reply dates')], source: S2_FILE },
    { id: 's2.reminders', group: 'Stage 2', name: 'Reminders start, before the reply date', text: `${REMINDER_DAYS_BEFORE} days`, values: [REMINDER_DAYS_BEFORE],
      usedBy: [r('Package board reminders'), r('RFQ draft')], source: S2_FILE },
    { id: 's2.covered', group: 'Stage 2', name: 'A package is covered with', text: `${QUOTES_TO_COVER} compliant, levelled quotes`, values: [QUOTES_TO_COVER],
      usedBy: [k('SRC-2'), r('Coverage bar')], source: S2_FILE },
    band('s2.coveredBand', 'Stage 2', 'Packages covered', STAGE_BANDS.covered, [k('SRC-2')], BANDS_FILE),
    band('s2.repliesBand', 'Stage 2', 'Replies on time', STAGE_BANDS.repliesOnTime, [k('SRC-3')], BANDS_FILE),
    { id: 's2.rescreen', group: 'Stage 2', name: 'Supplier screening stays current for', text: `${RESCREEN_DAYS} days`, values: [RESCREEN_DAYS],
      usedBy: [r('Shortlist screening guardrail'), r('Suppliers')], source: S2_FILE },

    // Stage 3
    { id: 's3.dg2Orange', group: 'Stage 3', name: 'Awaiting DG2, orange with', text: `${STAGE_BANDS.dg2OrangeH} h left`, values: [STAGE_BANDS.dg2OrangeH],
      usedBy: [k('DEC-1')], source: BANDS_FILE },
    ...(fit ? [{ id: 's3.safeDelivery', group: 'Stage 3' as const, name: 'Safe delivery load', text: `${fit.safeDeliveryPct}% of capacity`, values: [fit.safeDeliveryPct],
      usedBy: [k('DEC-4'), k('DEC-5')], source: seedFile }] : []),
    { id: 's3.capacityIfWon', group: 'Stage 3', name: 'Capacity if won', text: atMost(PORTFOLIO_BANDS.capacityIfWonPct, ' of the safe load'),
      values: [PORTFOLIO_BANDS.capacityIfWonPct.green, PORTFOLIO_BANDS.capacityIfWonPct.orange], usedBy: [k('DEC-5')], source: PORTFOLIO_FILE },
    { id: 's3.facility', group: 'Stage 3', name: 'Bank facility headroom, orange below', text: `${pct(PORTFOLIO_BANDS.facilityWarningShare)}% of the limit`,
      values: [PORTFOLIO_BANDS.facilityWarningShare], usedBy: [k('DEC-6')], source: PORTFOLIO_FILE },

    // Stages 4–9 (their dashboards)
    { id: 's4.replan', group: 'Stages 4–9', name: 'Re-plan turnaround, p90', text: `${TURNAROUND_HOURS.replan} h`, values: [TURNAROUND_HOURS.replan], usedBy: [k('PLN-5')], source: TARGETS_FILE },
    band('s4.pln6', 'Stages 4–9', 'M2 on time', RATE_BANDS['PLN-6'], [k('PLN-6')]),
    { id: 's5.reprice', group: 'Stages 4–9', name: 'Re-price turnaround, p90', text: `${TURNAROUND_HOURS.reprice} h`, values: [TURNAROUND_HOURS.reprice], usedBy: [k('PRC-5')], source: TARGETS_FILE },
    band('s5.prc2', 'Stages 4–9', 'Cost lines sourced', RATE_BANDS['PRC-2'], [k('PRC-2')]),
    { id: 's5.estimated', group: 'Stages 4–9', name: 'Estimated share of cost', text: atMost(ESTIMATED_SHARE_BAND), values: [ESTIMATED_SHARE_BAND.green, ESTIMATED_SHARE_BAND.orange],
      usedBy: [k('PRC-4')], source: TARGETS_FILE },
    band('s6.full', 'Stages 4–9', 'Reviews held and requirements evidenced', STAGE_BANDS.full, [k('PRP-5'), k('CMP-2')], BANDS_FILE),
    { id: 's8.submissions', group: 'Stages 4–9', name: 'Submissions due, looking ahead', text: `${AHEAD_DAYS.submissions} days`, values: [AHEAD_DAYS.submissions], usedBy: [k('SUB-1')], source: TARGETS_FILE },
    { id: 's8.bonds', group: 'Stages 4–9', name: 'Bid bonds, looking ahead', text: `${AHEAD_DAYS.bonds} days`, values: [AHEAD_DAYS.bonds], usedBy: [k('SUB-6')], source: TARGETS_FILE },
    band('s8.sub3', 'Stages 4–9', 'Packages ready', RATE_BANDS['SUB-3'], [k('SUB-3')]),
    { id: 's9.handover', group: 'Stages 4–9', name: 'Handover held, orange after award by', text: `${HANDOVER_DAYS} days`, values: [HANDOVER_DAYS], usedBy: [k('RES-2')], source: TARGETS_FILE },
    band('s9.res3', 'Stages 4–9', 'Lessons captured', RATE_BANDS['RES-3'], [k('RES-3')]),

    // Portfolio, and the rules every dashboard shares
    ...(goals ? [
      { id: 'pf.hitRate', group: 'Portfolio' as const, name: 'Target win rate', text: `${goals.hitRatePct}%`, values: [goals.hitRatePct], usedBy: [k('PF-3'), k('OUT-1')], source: PORTFOLIO_FILE },
      { id: 'pf.orderIntake', group: 'Portfolio' as const, name: 'Order intake, a year', text: money(goals.orderIntakeAnnual.amount, goals.orderIntakeAnnual.ccy),
        values: [goals.orderIntakeAnnual.amount], usedBy: [k('OUT-3')], source: PORTFOLIO_FILE },
    ] : []),
    { id: 'pf.hitRateOrange', group: 'Portfolio', name: 'Win rate, orange from', text: `${pct(PORTFOLIO_BANDS.hitRateOrangeShare)}% of the target`, values: [PORTFOLIO_BANDS.hitRateOrangeShare],
      usedBy: [k('PF-3')], source: PORTFOLIO_FILE },
    { id: 'pf.valueWon', group: 'Portfolio', name: 'Value won against the target', text: atLeast(PORTFOLIO_BANDS.valueWonPct),
      values: [PORTFOLIO_BANDS.valueWonPct.green, PORTFOLIO_BANDS.valueWonPct.orange], usedBy: [k('OUT-3')], source: PORTFOLIO_FILE },
    { id: 'pf.teamLoad', group: 'Portfolio', name: 'Bid-team load', text: atMost(PORTFOLIO_BANDS.teamLoadPct), values: [PORTFOLIO_BANDS.teamLoadPct.green, PORTFOLIO_BANDS.teamLoadPct.orange],
      usedBy: [k('CAP-1'), r('Screening triage')], source: PORTFOLIO_FILE },
    { id: 'pf.near', group: 'Portfolio', name: 'Near: a deadline within', text: wd(NEAR_WD), values: [NEAR_WD],
      usedBy: [r('Tender health: at risk'), k('SUB-1'), k('CMP-1'), k('PRC-1')], source: TARGETS_FILE },
    { id: 'pf.critical', group: 'Portfolio', name: 'Critical: something missing within', text: wd(CRITICAL_WD), values: [CRITICAL_WD], usedBy: [k('PF-6')], source: TARGETS_FILE },
    { id: 'pf.slaOk', group: 'Portfolio', name: 'SLA clock green with more than', text: `${pct(SLA_OK_SHARE)}% of its time left`, values: [SLA_OK_SHARE],
      usedBy: [r('Every SLA clock')], source: TARGETS_FILE },
    { id: 'pf.slaRisk', group: 'Portfolio', name: 'SLA clock at risk with', text: `${pct(SLA_AT_RISK_SHARE)}% of its time left or less`, values: [SLA_AT_RISK_SHARE],
      usedBy: [k('SCR-1'), r('Tender health: at risk')], source: TARGETS_FILE },
    { id: 'pf.minN', group: 'Portfolio', name: 'Small sample: fewer results than', text: `${MIN_N}`, values: [MIN_N],
      usedBy: [k('PF-3'), r('Every rate tile shows its counts instead')], source: TARGETS_FILE },
  ];
  return rows;
}

/** The rows by group, in page order. */
export function targetGroupsOf(tenant: string): { group: TargetGroup; rows: TargetRow[] }[] {
  const rows = targetsOf(tenant);
  return TARGET_GROUPS.map((group) => ({ group, rows: rows.filter((x) => x.group === group) })).filter((g) => g.rows.length > 0);
}
