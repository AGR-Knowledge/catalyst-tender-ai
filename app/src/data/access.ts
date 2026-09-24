import type { RoleKey } from './types';

/**
 * What each persona sees. The sidebar, the page guards, global search and
 * cross-role actions all read from here, so there is one definition of scope.
 */

export type PageKey = 'pipeline' | 'workflow' | 'agents' | 'submission' | 'suppliers' | 'library' | 'intake' | 'boq' | 'settings';

export interface RoleNavItem {
  key: string;
  label: string;
  /** Section on the persona's own dashboard (element id). */
  anchor?: string;
  /** Shared page. */
  page?: PageKey;
}

export interface RoleNavGroup { label: string; items: RoleNavItem[] }

export const SHARED_PAGES: PageKey[] = ['pipeline', 'workflow', 'settings'];

export const ROLE_NAV: Record<RoleKey, RoleNavGroup[]> = {
  coord: [
    { label: 'Stage 1 · Intake', items: [
      { key: 'queue', label: 'Validation queue', anchor: 'sec-queue' },
      { key: 'confidence', label: 'Extraction confidence', anchor: 'sec-confidence' },
      { key: 'intake', label: 'Intake today', anchor: 'sec-intake' },
      { key: 'uploads', label: 'Uploaded documents', page: 'intake' },
    ] },
  ],
  bid: [
    { label: 'Bid ownership', items: [
      { key: 'today', label: 'Needs you today', anchor: 'sec-today' },
      { key: 'register', label: 'Active bid register', anchor: 'sec-register' },
      { key: 'focus', label: 'T-2026-041 stage progress', anchor: 'sec-focus' },
      { key: 'resources', label: 'Resources and clashes', anchor: 'sec-resources' },
      { key: 'boq', label: 'BOQ and rates', page: 'boq' },
      { key: 'submission', label: 'Submission desk', page: 'submission' },
      { key: 'uploads', label: 'Uploaded documents', page: 'intake' },
    ] },
    { label: 'Reference', items: [
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
      { key: 'library', label: 'Artefacts library', page: 'library' },
    ] },
  ],
  proc: [
    { label: 'Stage 2 · Source', items: [
      { key: 'board', label: 'Package board', anchor: 'sec-board' },
      { key: 'quotes', label: 'Quote comparison', anchor: 'sec-quotes' },
      { key: 'boq', label: 'BOQ and rates', page: 'boq' },
    ] },
    { label: 'Reference', items: [
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
    ] },
  ],
  exec: [
    { label: 'Bid Committee', items: [
      { key: 'decisions', label: 'DG2 decisions', anchor: 'sec-decisions' },
      { key: 'stages', label: 'Pipeline by stage', anchor: 'sec-pipeline' },
      { key: 'margins', label: 'Portfolio margin', anchor: 'sec-margins' },
      { key: 'impact', label: 'Bid effort', anchor: 'sec-impact' },
    ] },
    { label: 'Governance', items: [
      { key: 'agents', label: 'Agent console', page: 'agents' },
    ] },
  ],
  comm: [
    { label: 'Stage 5 · Price', items: [
      { key: 'cost', label: 'Cost build-up', anchor: 'sec-cost' },
      { key: 'scenarios', label: 'Margin scenarios', anchor: 'sec-scenarios' },
      { key: 'reprice', label: 'Re-price log', anchor: 'sec-reprice' },
      { key: 'boq', label: 'BOQ and rates', page: 'boq' },
    ] },
    { label: 'Reference', items: [
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
    ] },
  ],
  prop: [
    { label: 'Stage 6 · Draft', items: [
      { key: 'sections', label: 'Section board', anchor: 'sec-sections' },
      { key: 'scoring', label: 'Evaluator scoring', anchor: 'sec-scoring' },
      { key: 'themes', label: 'Win themes', anchor: 'sec-themes' },
    ] },
    { label: 'Reference', items: [
      { key: 'library', label: 'Artefacts library', page: 'library' },
    ] },
  ],
  comp: [
    { label: 'Stage 7 · Verify', items: [
      { key: 'matrix', label: 'Compliance matrix', anchor: 'sec-matrix' },
      { key: 'gaps', label: 'Gaps & DG3', anchor: 'sec-gaps' },
      { key: 'redlines', label: 'Contract positions', anchor: 'sec-redlines' },
    ] },
    { label: 'Reference', items: [
      { key: 'library', label: 'Artefacts library', page: 'library' },
    ] },
  ],
  dir: [
    { label: 'Stage 9 · Delivery', items: [
      { key: 'projects', label: 'Projects', anchor: 'sec-projects' },
      { key: 'deviations', label: 'Deviations', anchor: 'sec-deviations' },
      { key: 'programme', label: 'Delivery programme', anchor: 'sec-programme' },
      { key: 'learning', label: 'Learning loop', anchor: 'sec-learning' },
    ] },
    { label: 'Governance', items: [
      { key: 'agents', label: 'Agent console', page: 'agents' },
      { key: 'suppliers', label: 'Supplier database', page: 'suppliers' },
    ] },
  ],
};

export function canSee(role: RoleKey, page: PageKey): boolean {
  if (SHARED_PAGES.includes(page)) return true;
  return ROLE_NAV[role].some((g) => g.items.some((i) => i.page === page));
}

export function rolesWith(page: PageKey): RoleKey[] {
  return (Object.keys(ROLE_NAV) as RoleKey[]).filter((r) => canSee(r, page));
}

export const PAGE_LABEL: Record<PageKey, string> = {
  pipeline: 'Pipeline', workflow: 'Workflow', agents: 'Agent console', submission: 'Submission desk',
  suppliers: 'Supplier database', library: 'Artefacts library', intake: 'Uploaded documents', boq: 'BOQ and rates', settings: 'Settings',
};
