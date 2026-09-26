import { eligibilityFor, fitFor } from '@/domain/gcc/s1';
import { Card, CardHead } from '@/components/ui/primitives';
import { useS1 } from '@/pages/gcc/s1/vm/useS1';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import { EligibilityPanel } from '@/pages/gcc/s1/parts/EligibilityPanel';
import { FitBreakdown } from '@/pages/gcc/s1/parts/FitBreakdown';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Eligibility & fit (order 40, plan 007b): the PQ check against the
 * credentials vault with the JV scenario (spec §6.5), then the fit breakdown,
 * collapsed (spec §6.6). Absent for a tender with neither.
 */
function Eligibility({ ctx }: { ctx: WorkspaceCtx }) {
  const s1 = useS1();
  const doc = sourceDocOf(docOf(ctx.tenant, ctx.tenderId));
  const elig = eligibilityFor(ctx.tenant, ctx.tenderId, ctx.done);
  return (
    <div className="ws-tab">
      {elig && (
        <Card>
          <CardHead title="Eligibility against the credentials vault" meta={<span className="num">{elig.lines.length} requirements</span>} />
          <div className="s1-pad">
            <EligibilityPanel s1={s1} tenderId={ctx.tenderId} doc={doc} onQueries={ctx.hasTab('queries') ? () => ctx.openTab('queries') : undefined} />
          </div>
        </Card>
      )}
      <Card>
        <CardHead title="Fit score" meta="Your company's weights" />
        <div className="s1-pad"><FitBreakdown s1={s1} tenderId={ctx.tenderId} open={!elig} /></div>
      </Card>
    </div>
  );
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'eligibility', label: 'Eligibility & fit', order: 40, plan: '007b',
  shows: (ctx) => !!fitFor(ctx.tenant, ctx.tenderId, ctx.done),
  badge: (ctx) => {
    const e = eligibilityFor(ctx.tenant, ctx.tenderId, ctx.done);
    if (!e) return null;
    if (e.counts.fail) return { text: `${e.counts.fail} fail`, tone: 'red' };
    if (e.counts.atRisk) return { text: `${e.counts.atRisk} at risk`, tone: 'orange' };
    return null;
  },
  Panel: Eligibility,
}];
