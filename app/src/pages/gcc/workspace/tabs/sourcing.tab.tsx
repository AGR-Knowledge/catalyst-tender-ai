import { liveS2Tenders, packageCoverage, rfqClock } from '@/domain/gcc/s2';
import { SourcingDesk } from '../../s2/Sourcing';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Sourcing (order 70, plan 008b; spec §4.1): packages, shortlists, RFQs and
 * the clock, responses, levelled quotes, the best-fit mix and supplier
 * clarifications, for one tender. Shown while the tender is being sourced (a
 * standing DG1 Pursue with a Stage 2 record); absent otherwise.
 */

function Sourcing({ ctx }: { ctx: WorkspaceCtx }) {
  // The workspace's SourceHost opens the page chips.
  return <SourcingDesk tenderId={ctx.tenderId} check={ctx.check} onInputs={ctx.hasTab('inputs') ? () => ctx.openTab('inputs') : undefined} />;
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'sourcing', label: 'Sourcing', order: 70, plan: '008b', cap: 'sourcing.view',
  shows: (ctx) => liveS2Tenders(ctx.tenant, ctx.done).some((t) => t.tenderId === ctx.tenderId),
  badge: (ctx) => {
    const clock = rfqClock(ctx.tenant, ctx.tenderId, ctx.done);
    if (clock && clock.sent < clock.total) return { text: clock.left, tone: clock.tone };
    const c = packageCoverage(ctx.tenant, ctx.tenderId, ctx.done);
    return { text: `${c.covered}/${c.total}`, tone: c.covered === c.total ? 'green' : undefined };
  },
  Panel: Sourcing,
}];
