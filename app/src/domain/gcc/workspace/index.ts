/**
 * The Tender Workspace's view models (plan 019): the header, the right rail
 * and the audit timeline. Read-only derivations of the data port, the
 * lifecycles, Stage 1 (007a) and Stage 3 (009a); no new facts.
 */
export { workspaceHeader, type WorkspaceHeaderVM, type TrackStepVM } from './header';
export {
  workspaceRail, docFor, termsOf, reasonText, NOTHING_FOR_YOU,
  type RailVM, type RailInput, type RailRecommendationVM, type RailDecisionVM, type RailBlockerVM, type RailSource, type RailDoc,
} from './rail';
export { auditTimeline, latestOf, type TimelineDayVM, type TimelineEntryVM } from './audit';
