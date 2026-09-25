/**
 * Stage 1 rules (plan 007a): eligibility, fit, bond, key dates, intake,
 * validation, addenda, triage and queries. Pure functions of the seed and the
 * tenant's `done`; plan 007b builds the screens on them and adds no logic.
 */
export * from './done';
export {
  eligibilityFor, eligibilityScore, eligibilityFactor, eligibilityRisks, fitScoresFor, failKindsText, KEY_ROLES, KEY_ROLES_PAGE,
  type EligibilityLine, type EligibilityResult, type EligibilityCounts, type EligibilityRisk, type Evidence, type JvScenario, type LineAction, type LineState, type RenewedValue,
} from './eligibility';
export { addendaFor, latestAddendumBadge, registerMatch, type AddendumVM, type RegisterMatch } from './addenda';
export { fitFor, recommendationFor, CRITERION_LABEL, VERDICT_LABEL, type FitResult, type FitRow, type ComparableVM, type RecommendationVM, type SourceRef, type Verdict } from './fit';
export { bidBondFor, facilityHeadroom, BANK_LEAD_DAYS, type BidBond, type FacilityHeadroom } from './bond';
export { keyDatesFor, remindersFor, prepRatio, KEY_DATE_LABEL, type KeyDateRow, type KeyDateFlag, type Reminder, type PrepRatio } from './dates';
export {
  queueFor, queueItem, validationsOf, validationAction, blockingOpen, queueStats, resolvedValue,
  type QueueItem, type QueueGroup, type QueueStats, type BlockingOpen, type ValAction, type ValValue, type ValidationInput,
} from './validation';
export {
  pipelineFor, radarFor, recogniseUpload, fieldCounts, INTAKE_TARGET_MIN, ASSISTED_TEXT, DISPOSITION_LABEL,
  type Pipeline, type PipelineStep, type Radar, type Connector, type Capture,
} from './intake';
export { teamLoad, peakMonth, triageFor, asCommitment, CAPACITY_WINDOW_DAYS, type TriageResult, type TriageRow, type TriageTeam, type PeakMonth, type Commitment } from './triage';
export { queriesFor, queryAction, type QueriesVM, type QueryVM, type QueryValue } from './queries';
