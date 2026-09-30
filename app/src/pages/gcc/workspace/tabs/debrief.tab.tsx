import { lifecycle } from '@/domain/gcc/lifecycle';
import { debriefFor, endingOf } from '@/domain/gcc/debriefs';
import { DebriefPanel } from '../debrief/DebriefPanel';
import { debriefBadge } from '../debrief/format';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Debrief (order 95, plan 036; spec §20.1): on every tender that ended as a
 * bid (won, lost, cancelled by the employer, withdrawn, No-Bid at DG2,
 * rejected at DG3), never on a live one or a DG1 discard. Without
 * `debrief.view` the tab shows masked, saying who can read it. The badge is
 * the status word, only when it asks something of the viewer.
 */

/** The tender has an ending, read on the lifecycle with the demo state (a No-Bid recorded in the demo counts). */
export function hasEnding(ctx: Pick<WorkspaceCtx, 'tenant' | 'tenderId' | 'done'>): boolean {
  const l = lifecycle(ctx.tenant, ctx.tenderId, ctx.done);
  return !!l && endingOf(l) !== null;
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'debrief', label: 'Debrief', order: 95, plan: '036', cap: 'debrief.view',
  shows: hasEnding,
  badge: (ctx) => debriefBadge(
    debriefFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done, now: ctx.now }, ctx.tenderId),
    { record: ctx.check('debrief.record', { viewAs: false }).ok, accept: ctx.check('debrief.accept', { viewAs: false }).ok },
  ),
  Panel: DebriefPanel,
}];
