import type { ComponentType } from 'react';
import type { Tone } from '@/data/types';
import type { CanCtx, CanResult, Capability } from '@/data/access';
import type { Person } from '@/data/people';
import type { AuditEvent } from '@/state/store';
import type { TenderRowVM, TrackerVM } from '@/domain/gcc/viewmodels';

/**
 * The Tender Workspace's tab contract (plan 019 Phase 2). Each `*.tab.tsx`
 * next to this file exports `TABS: WorkspaceTabDef[]`; later lanes (007b,
 * 008b, 009b) add tabs as new files with the ids and orders reserved in
 * `index.ts`, and never edit the workspace.
 */

export interface WorkspaceCtx {
  tenant: string;
  tenderId: string;
  row: TenderRowVM;
  tracker: TrackerVM | null;
  /** Who the page is for: the viewed person during View as. */
  viewer: Person;
  viewAs: boolean;
  /** The tenant's demo state (`store.done`). */
  done: Record<string, string>;
  /** The tenant's audit trail: the actions taken in the demo. */
  audit: AuditEvent[];
  /** The demo clock, `YYYY-MM-DDTHH:MM`. */
  now: string;
  /** `can(viewer, cap, { tender, viewAs })` from `access.ts`, for this tender. */
  can(cap: Capability): boolean;
  /**
   * The same check with its refusal sentence, for a disabled button that must
   * say why (ui-direction §13). `extra` adds context, e.g. `{ ownerId }` for
   * an input only its owner answers.
   */
  check(cap: Capability, extra?: Partial<CanCtx>): CanResult;
  /** Switch tab (the URL's `?tab=` follows). */
  openTab(id: string): void;
  /** Whether a tab is registered and shown here. */
  hasTab(id: string): boolean;
}

export interface WorkspaceTabDef {
  /** The `?tab=` value. */
  id: string;
  label: string;
  /** From the reserved table in `index.ts`. */
  order: number;
  /** The plan that owns it. */
  plan: string;
  /** False: the tab is absent. Never an empty tab (spec §2.1). */
  shows(ctx: WorkspaceCtx): boolean;
  /** Held: the panel. Not held: the tab shows a masked state that says who can see it. */
  cap?: Capability;
  badge?(ctx: WorkspaceCtx): { text: string; tone?: Tone } | null;
  Panel: ComponentType<{ ctx: WorkspaceCtx }>;
}
