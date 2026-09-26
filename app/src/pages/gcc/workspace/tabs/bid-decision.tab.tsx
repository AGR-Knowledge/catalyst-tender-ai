import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { freshnessFor, packVersionsFor, stampText } from '@/domain/gcc/s3';
import { activeDecision, decisionState, dg2RecordFor } from '@/domain/gcc/dg2';
import { Card } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import { SlaClock } from '@/components/tender/SlaClock';
import { StatusPill } from '@/components/tender/StatusPill';
import { PackView } from '../../s3/Pack';
import { sightOf } from '../../s3/sight';
import { Conditions } from '../../dg2/Conditions';
import '../../s3/s3.css';
import '../../dg2/dg2.css';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Bid / No-Bid (order 90, plan 009b; spec §9–§10): where DG2 stands, the
 * decision and its conditions as tracked items once it is made, then the
 * pack itself. The gate (positions and the approval) is on `/dg2?tender=`.
 */
function BidDecision({ ctx }: { ctx: WorkspaceCtx }) {
  const { tenant, tenderId, done } = ctx;
  const sight = useMemo(() => sightOf(ctx.can), [ctx]);
  const access = useMemo(() => ({ check: ctx.check }), [ctx]);
  const ds = useMemo(() => decisionState(tenant, tenderId, done), [tenant, tenderId, done]);
  const record = useMemo(() => dg2RecordFor(tenant, tenderId, done, sight), [tenant, tenderId, done, sight]);
  const d = record?.decision ?? null;
  const holds = (cap: Parameters<WorkspaceCtx['check']>[0]) => ctx.check(cap, { viewAs: false }).ok;
  const issued = ds.packVersion !== null;
  const positions = sight.canSeePositions ? ds.positions.quorum.text : 'With the committee';

  return (
    <div className="ws-tab">
      <Card>
        <div className="dg2-strip">
          <span className="dg2-strip-t">DG2 · Bid / No-Bid</span>
          {d ? <StatusPill label={`Decided: ${d.label}`} tone={d.decision === 'bid' ? 'green' : 'grey'} icon={d.decision === 'bid' ? '✓' : '–'} />
            : issued ? <StatusPill label={positions} tone="orange" icon="•" />
            : <StatusPill label="Pack not issued" tone="grey" icon="○" />}
          {!d && ds.slaStart && ds.slaDue ? <SlaClock start={ds.slaStart} end={ds.slaDue} /> : <span className="pk-dim">{ds.slaText}</span>}
          {holds('dg2.view') && issued && (
            <Link className="btn btn-sm btn-primary" to={`/dg2?tender=${encodeURIComponent(tenderId)}`}><Scale size={13} aria-hidden />Open DG2</Link>
          )}
        </div>
      </Card>

      {d && (
        <Callout variant="verdict" word="DG2" title={`${d.label}, ${d.decision === 'bid' ? 'approved' : 'recorded'} by ${d.byName}`}>
          {stampText(d.at)} · pack v{d.packVersion}. Recorded in the audit trail.{d.differsText ? ` ${d.differsText}.` : ''}
        </Callout>
      )}
      {d?.decision === 'bid' && (
        <Conditions
          tenant={tenant} tenderId={tenderId} sight={sight}
          check={holds('pack.issue') ? ctx.check('pack.issue') : ctx.check('dg2.decide')} holds={holds('pack.issue') || holds('dg2.decide')}
        />
      )}

      <PackView tenant={tenant} tenderId={tenderId} mode="tab" access={access} sight={sight} onOpenInputs={ctx.hasTab('inputs') ? () => ctx.openTab('inputs') : undefined} />
    </div>
  );
}

/** A Stage 3 tender, or one with a pack or a DG2 decision on record. */
function shows(ctx: WorkspaceCtx): boolean {
  return ctx.row.stage === 3 || !!packVersionsFor(ctx.tenant, ctx.tenderId, ctx.done).current || !!activeDecision(ctx.done, ctx.tenderId);
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'bid-decision', label: 'Bid / No-Bid', order: 90, plan: '009b', cap: 'pack.view', shows,
  badge: (ctx) => {
    if (activeDecision(ctx.done, ctx.tenderId)) return null;
    return freshnessFor(ctx.tenant, ctx.tenderId, ctx.done)?.stale ? { text: 'Stale', tone: 'orange' } : null;
  },
  Panel: BidDecision,
}];
