import { queriesFor as queryDraftsFor } from '@/domain/gcc/s1/queries';
import { Card, CardHead } from '@/components/ui/primitives';
import { useS1 } from '@/pages/gcc/s1/vm/useS1';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import { QueryList } from '@/pages/gcc/s1/parts/QueryList';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Queries (order 60, plan 007b): clarification questions to the employer,
 * drafted by the agent from the ambiguities it found (spec §6.10). Absent
 * when there are none.
 */
function Queries({ ctx }: { ctx: WorkspaceCtx }) {
  const s1 = useS1();
  const doc = sourceDocOf(docOf(ctx.tenant, ctx.tenderId));
  const n = queryDraftsFor(ctx.tenant, ctx.tenderId, ctx.done).items.length;
  return (
    <Card>
      <CardHead title="Queries to the employer" meta={<span className="num">{n}</span>} />
      <p className="s1-lede">Each draft cites its clause and page. Approving and marking sent records who did it and when; sending happens on the portal, not from here.</p>
      <div className="s1-pad"><QueryList s1={s1} tenderId={ctx.tenderId} doc={doc} /></div>
    </Card>
  );
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'queries', label: 'Queries', order: 60, plan: '007b',
  shows: (ctx) => queryDraftsFor(ctx.tenant, ctx.tenderId, ctx.done).items.length > 0,
  badge: (ctx) => {
    const d = queryDraftsFor(ctx.tenant, ctx.tenderId, ctx.done).counts.draft;
    return d ? { text: `${d} draft${d === 1 ? '' : 's'}`, tone: 'orange' } : null;
  },
  Panel: Queries,
}];
