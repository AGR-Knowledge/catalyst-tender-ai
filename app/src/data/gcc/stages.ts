import type { RoleKey } from '@/data/types';
import type { GateKey } from '@/domain/gcc/viewmodels';

/**
 * The nine lifecycle stages as the GCC build names them (dashboards.md §8.1),
 * with the steps inside each (§8.2). The sidebar, the stage dashboards, the
 * graph's x-axis and the tracker all read from here. Step keys are stable ids:
 * the lifecycle data (plan 017) stores them.
 */

export type StageN = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface StageStep { key: string; label: string }

export interface StageDef {
  n: StageN;
  /** Sidebar name: "Sourcing". */
  short: string;
  /** Proposal name: the stage dashboard's sub-title and the stage chip's ⓘ. */
  full: string;
  /** Whose home the stage dashboard is. */
  ownerRole: RoleKey;
  /** How the owner is described: "Procurement Lead". */
  ownerLabel: string;
  /** The gate that closes the stage. */
  gateAfter?: GateKey;
  steps: StageStep[];
}

export const GCC_STAGES: StageDef[] = [
  { n: 1, short: 'Intake', full: 'Tender Identification & Screening', ownerRole: 'coord', ownerLabel: 'Tender Coordinator', gateAfter: 'DG1', steps: [
    { key: 'captured', label: 'Captured' },
    { key: 'documents-in', label: 'Documents in' },
    { key: 'validating', label: 'Validating' },
    { key: 'screened', label: 'Screened' },
    { key: 'awaiting-dg1', label: 'Awaiting DG1' },
  ] },
  { n: 2, short: 'Sourcing', full: 'Subcontractor & Internal Input Orchestration', ownerRole: 'proc', ownerLabel: 'Procurement Lead', steps: [
    { key: 'packaging', label: 'Packaging' },
    { key: 'shortlisting', label: 'Shortlisting' },
    { key: 'rfqs-out', label: 'RFQs out' },
    { key: 'quotes-in', label: 'Quotes in' },
    { key: 'levelling', label: 'Levelling' },
    { key: 'best-fit-approved', label: 'Best-fit approved' },
  ] },
  { n: 3, short: 'Bid decision', full: 'Bid / No-Bid Decisioning', ownerRole: 'member', ownerLabel: 'Bid Committee', gateAfter: 'DG2', steps: [
    { key: 'pack-in-preparation', label: 'Pack in preparation' },
    { key: 'inputs-complete', label: 'Inputs complete' },
    { key: 'pack-issued', label: 'Pack issued' },
    { key: 'positions-in', label: 'Positions in' },
    { key: 'awaiting-approval', label: 'Awaiting approval' },
  ] },
  { n: 4, short: 'Planning', full: 'Project Scheduling & Planning', ownerRole: 'plan', ownerLabel: 'Planning Manager', steps: [
    { key: 'baseline-drafting', label: 'Baseline drafting' },
    { key: 'resource-loading', label: 'Resource loading' },
    { key: 'm2', label: 'M2 reconciliation' },
    { key: 'released', label: 'Released' },
  ] },
  { n: 5, short: 'Pricing', full: 'Financial & Cost Modelling', ownerRole: 'comm', ownerLabel: 'Commercial Manager', steps: [
    { key: 'cost-build-up', label: 'Cost build-up' },
    { key: 'scenarios', label: 'Scenarios' },
    { key: 'finance-check', label: 'Finance check' },
    { key: 'price-approved', label: 'Price approved' },
  ] },
  { n: 6, short: 'Proposal', full: 'Proposal Preparation & Drafting', ownerRole: 'prop', ownerLabel: 'Proposal Manager', steps: [
    { key: 'sections-assigned', label: 'Sections assigned' },
    { key: 'drafting', label: 'Drafting' },
    { key: 'review', label: 'Review' },
    { key: 'locked', label: 'Locked' },
  ] },
  { n: 7, short: 'Compliance', full: 'Compliance & Risk Verification', ownerRole: 'comp', ownerLabel: 'Compliance / Legal Lead', gateAfter: 'DG3', steps: [
    { key: 'matrix', label: 'Matrix' },
    { key: 'gaps-closing', label: 'Gaps closing' },
    { key: 'redlines', label: 'Redlines' },
    { key: 'dg3-issued', label: 'DG3 pack issued' },
  ] },
  { n: 8, short: 'Submission', full: 'Final Compilation & Submission', ownerRole: 'bid', ownerLabel: 'Bid Manager', steps: [
    { key: 'assembling', label: 'Assembling' },
    { key: 'signatures', label: 'Signatures' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'awaiting-result', label: 'Awaiting result' },
  ] },
  { n: 9, short: 'Results', full: 'Post-Award Oversight & Learning', ownerRole: 'dir', ownerLabel: 'Project Director', steps: [
    { key: 'result-received', label: 'Result received' },
    { key: 'handover-or-debrief', label: 'Handover or debrief' },
    { key: 'lessons-captured', label: 'Lessons captured' },
  ] },
];

export const STAGE_NUMBERS = GCC_STAGES.map((s) => s.n);

export const isStageN = (n: unknown): n is StageN => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 9;

/** The stage, or undefined outside 1–9. */
export const stageOf = (n: number): StageDef | undefined => GCC_STAGES.find((s) => s.n === n);

/** "2 · Sourcing": the chip, the breadcrumb and the dashboard title. */
export const stageLabel = (n: number): string => {
  const s = stageOf(n);
  return s ? `${s.n} · ${s.short}` : `Stage ${n}`;
};

/** "2 Sourcing": the sidebar entry and the graph's x-axis. */
export const stageShortLabel = (n: number): string => {
  const s = stageOf(n);
  return s ? `${s.n} ${s.short}` : `Stage ${n}`;
};

/** "RFQs out". An unknown key is shown as it is rather than dropped. */
export const stepLabel = (stage: number, key: string): string =>
  stageOf(stage)?.steps.find((s) => s.key === key)?.label ?? key;

/** The gate after a stage, in lifecycle order: DG1 after 1, DG2 after 3, DG3 after 7. */
export const GATE_AFTER: Record<GateKey, StageN> = { DG1: 1, DG2: 3, DG3: 7 };
