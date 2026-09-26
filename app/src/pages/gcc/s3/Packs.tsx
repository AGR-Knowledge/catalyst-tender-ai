import { useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { personById } from '@/data/people';
import type { Money as MoneyT } from '@/data/gcc/types';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { freshnessFor, inputsFor, MASKED_TEXT, packFor, packVersionsFor, stampText } from '@/domain/gcc/s3';
import { decisionState } from '@/domain/gcc/dg2';
import { Card, CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/tender/EmptyState';
import { Masked } from '@/components/tender/Masked';
import { Money } from '@/components/tender/Money';
import { SlaClock } from '@/components/tender/SlaClock';
import { StatusPill } from '@/components/tender/StatusPill';
import { SourceHost } from '@/components/tender/SourceHost';
import { holdersOf } from '@/data/access';
import { PackView } from './Pack';
import { tenderAccess } from './sight';
import './s3.css';

/**
 * `/packs`: every Bid / No-Bid pack the viewer may open, with its freshness
 * and the inputs it still waits on. `/packs?tender=T` opens one pack.
 */
export default function Packs() {
  const [params] = useSearchParams();
  const tender = params.get('tender');
  return tender ? <OnePack tenderId={tender} /> : <PackList />;
}

function OnePack({ tenderId }: { tenderId: string }) {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const access = useMemo(() => tenderAccess(tenant, tenderId, state.person, state.done, !!state.viewAs), [tenant, tenderId, state.person, state.done, state.viewAs]);
  const back = <button type="button" className="btn btn-sm" onClick={() => navigate('/packs')}><ChevronLeft size={13} aria-hidden />All packs</button>;
  if (!access.open || !access.can('pack.view')) {
    return <div className="view"><Card><EmptyState title={`No pack for ${tenderId} here.`} body="It may belong to another company, or not be shared with you." action={back} /></Card></div>;
  }
  return (
    <SourceHost>
      <div className="view pk-page">
        <div className="pk-crumb">
          <Link className="btn-link" to="/packs"><ChevronLeft size={12} aria-hidden />All packs</Link>
          <Link className="btn-link" to={`/tenders/${encodeURIComponent(tenderId)}`}>Open the tender workspace</Link>
        </div>
        <PackView tenant={tenant} tenderId={tenderId} mode="page" access={access} sight={access.sight} />
      </div>
    </SourceHost>
  );
}

interface PackRow {
  id: string; title: string; version: number; generated: string; issued: boolean; stale: string | null;
  outstanding: number; late: number; requested: number; recommendation: string; win: string | null;
  value: MoneyT;
  sla: { start?: string; due?: string; text: string; decided: boolean }; bm: string;
}

function PackList() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const { person, done } = state;
  const rows = useMemo<PackRow[]>(() => {
    if (!isGccTenantKey(tenant)) return [];
    return gccData(tenant).register.flatMap((t): PackRow[] => {
      const pv = packVersionsFor(tenant, t.id, done);
      if (!pv.current) return [];
      const a = tenderAccess(tenant, t.id, person, done, !!state.viewAs);
      if (!a.open || !a.can('pack.view')) return [];
      const pack = packFor(tenant, t.id, done, a.sight);
      const fresh = freshnessFor(tenant, t.id, done);
      const inputs = inputsFor(tenant, t.id, done);
      const ds = decisionState(tenant, t.id, done);
      if (!pack) return [];
      return [{
        id: t.id, title: t.title, version: pack.version, generated: stampText(pack.generatedAt), issued: pack.issued,
        stale: fresh?.stale ? stampText(fresh.stale.since) : null,
        outstanding: inputs.totals.outstanding, late: inputs.totals.late, requested: inputs.totals.requested,
        recommendation: pack.summary.recommendation, win: pack.summary.win, value: pack.value,
        sla: { start: ds.slaStart, due: ds.slaDue, text: ds.slaText, decided: !!ds.decision },
        bm: personById(t.bidManagerId)?.name ?? 'No Bid Manager yet',
      }];
    });
  }, [tenant, person, done, state.viewAs]);

  return (
    <div className="view pk-page">
      <Card>
        <CardHead title="Bid / No-Bid packs" meta={`${rows.length} ${rows.length === 1 ? 'pack' : 'packs'}`} />
        {rows.length === 0 ? (
          <EmptyState title="No packs to show." body="A pack is generated in Stage 3, after sourcing. Packs shared with you appear here." />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/packs?tender=${encodeURIComponent(r.id)}`)}
            rowLabel={(r) => `Open the pack for ${r.id}, ${r.title}`}
            columns={[
              { key: 't', header: 'Tender', width: '2.2fr', primary: true, render: (r) => <span className="cell-main"><span className="mono pk-tid">{r.id}</span>{r.title}</span> },
              { key: 'v', header: 'Value', width: '.9fr', align: 'right', render: (r) => <Money value={r.value} /> },
              { key: 'r', header: 'Recommendation', width: '1.1fr', render: (r) => r.recommendation },
              { key: 'w', header: 'Win', width: '.8fr', render: (r) => (r.win === null ? <span className="pk-dim">Not scored</span> : r.win === MASKED_TEXT ? <Masked by={holdersOf('see.positions')} /> : <span className="num">{r.win}%</span>) },
              { key: 'p', header: 'Pack', width: '1.3fr', render: (r) => (
                <span className="pk-cellstack">
                  <span className="mono">v{r.version}</span> <span className="pk-dim">{r.generated}</span>
                  {r.stale ? <><StatusPill label="Stale" tone="orange" icon="!" /><span className="pk-dim">since {r.stale}</span></> : <StatusPill label="Current" tone="green" icon="✓" />}
                </span>
              ) },
              { key: 'i', header: 'Inputs', width: '1fr', render: (r) => (r.outstanding
                ? <span className={r.late ? 't-red' : 't-orange'}>{r.outstanding} of {r.requested} outstanding{r.late ? `, ${r.late} late` : ''}</span>
                : <span className="t-green">All {r.requested} in</span>) },
              { key: 's', header: 'DG2', width: '1.1fr', render: (r) => (r.sla.start && r.sla.due && !r.sla.decided ? <span className="pk-clockcell"><SlaClock start={r.sla.start} end={r.sla.due} /></span> : <span className="pk-dim">{r.issued ? r.sla.text : 'Not issued'}</span>) },
              { key: 'b', header: 'Bid Manager', width: '1fr', render: (r) => r.bm },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
