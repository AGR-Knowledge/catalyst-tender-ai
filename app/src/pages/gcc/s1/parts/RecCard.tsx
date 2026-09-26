import { useMemo, type ReactNode } from 'react';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { dataPort } from '@/domain/gcc/port';
import { workspaceRail, type RailVM } from '@/domain/gcc/workspace';
import { RecommendationCard } from '@/components/tender/RecommendationCard';
import type { S1 } from '../vm/useS1';

/**
 * The recommendation of one tender exactly as the workspace rail shows it
 * (plan 019's view model), so the Screening sheet, the DG1 pack and the
 * workspace never disagree. Null when the viewer can't see the tender.
 */
export function useRail(s1: S1, tenderId: string): RailVM | null {
  const { tenant, viewer, viewAs, done } = s1;
  return useMemo(() => {
    const port = dataPort();
    const row = port?.rows(tenant, { kind: 'all' }, viewer, 'all', done).find((r) => r.id === tenderId);
    if (!port || !row) return null;
    return workspaceRail({ tenant, viewer, viewAs, done, now: DEMO_NOW, row, tracker: port.tracker(tenant, tenderId, viewer, done) });
  }, [tenant, viewer, viewAs, done, tenderId]);
}

/** The open recommendation card, or the one a standing decision overrode (both stay visible, spec §5.2). */
export function RecCard({ rail, children, overridden = false }: { rail: RailVM; children?: ReactNode; overridden?: boolean }) {
  const r = overridden ? rail.overridden : rail.recommendation?.kind === 'card' ? rail.recommendation : null;
  if (!r) return null;
  return (
    <RecommendationCard
      heading={r.heading} agent={r.agent} verdict={r.verdict} tone={r.tone}
      confidence={r.confidence} confidenceWhy={r.confidenceWhy} confidenceMasked={r.confidenceMasked}
      reasons={r.reasons} reasonsMasked={r.reasonsMasked} wouldChange={r.wouldChange} wouldChangeMasked={r.wouldChangeMasked} changeLimit={3}
      sources={r.sources} doc={rail.doc}
      {...(rail.overridden && overridden ? { overriddenBy: rail.overridden.overriddenBy } : {})}
    >
      {children}
    </RecommendationCard>
  );
}
