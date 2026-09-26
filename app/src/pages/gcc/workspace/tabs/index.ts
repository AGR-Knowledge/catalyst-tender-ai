/// <reference types="vite/client" />
import { collect } from '@/domain/gcc/registry';
import type { WorkspaceTabDef } from './types';

export type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Every `*.tab.tsx` exports `TABS: WorkspaceTabDef[]`, collected here and
 * sorted by `order`. A duplicate id throws in dev, as in the other registries.
 *
 * Reserved ids and orders, so parallel lanes don't collide:
 *
 * | id             | Label              | Order | Owner |
 * | -------------- | ------------------ | ----- | ----- |
 * | `overview`     | Overview           | 10    | 019   |
 * | `documents`    | Documents          | 20    | 007b  |
 * | `requirements` | Requirements       | 30    | 007b  |
 * | `eligibility`  | Eligibility & fit  | 40    | 007b  |
 * | `dates`        | Key dates          | 50    | 007b  |
 * | `queries`      | Queries            | 60    | 007b  |
 * | `sourcing`     | Sourcing           | 70    | 008b  |
 * | `inputs`       | Inputs             | 80    | 009b  |
 * | `bid-decision` | Bid / No-Bid       | 90    | 009b  |
 * | `audit`        | Decisions & audit  | 100   | 019   |
 */
export const RESERVED_TABS: { id: string; label: string; order: number; plan: string }[] = [
  { id: 'overview', label: 'Overview', order: 10, plan: '019' },
  { id: 'documents', label: 'Documents', order: 20, plan: '007b' },
  { id: 'requirements', label: 'Requirements', order: 30, plan: '007b' },
  { id: 'eligibility', label: 'Eligibility & fit', order: 40, plan: '007b' },
  { id: 'dates', label: 'Key dates', order: 50, plan: '007b' },
  { id: 'queries', label: 'Queries', order: 60, plan: '007b' },
  { id: 'sourcing', label: 'Sourcing', order: 70, plan: '008b' },
  { id: 'inputs', label: 'Inputs', order: 80, plan: '009b' },
  { id: 'bid-decision', label: 'Bid / No-Bid', order: 90, plan: '009b' },
  { id: 'audit', label: 'Decisions & audit', order: 100, plan: '019' },
];

const REGISTRY = collect<WorkspaceTabDef>(import.meta.glob('./*.tab.tsx', { eager: true }), 'TABS', 'workspace tab', (d) => d.id);

/** Every registered tab, in order. */
export const WORKSPACE_TABS: WorkspaceTabDef[] = [...REGISTRY.values()].sort((a, b) => a.order - b.order);

export const workspaceTab = (id: string): WorkspaceTabDef | undefined => REGISTRY.get(id);
