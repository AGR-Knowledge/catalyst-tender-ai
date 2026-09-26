/**
 * DG1: Pursue or Discard (plan 007a Phase 9). The record, the evidence pack and
 * the decision rules; plan 007b builds the gate screen on them.
 */
export { dg1RecordFor, dg1Queue, slaTextOf, DG1_SLA_HOURS, type Dg1State, type Dg1QueueItem, type Dg1HoldValue, type Dg1ReopenValue, type AnyDg1 } from './record';
export { dg1PackFor, isPqFailDiscard, PROCUREMENT_LABEL, type Dg1Pack } from './pack';
export {
  DISCARD_REASONS, reasonLabel, rollupReason, validateDg1, defaultTeam, proposedMilestones, dg1Write, dg1Reopen, stageOverlay,
  type Dg1Decision, type Dg1Input, type Dg1Team, type Dg1Milestone, type Dg1Writes, type ReasonCode, type StageOverlay,
} from './decision';
