import { useMemo, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { dataPort } from '@/domain/gcc/port';
import { stageLabel, stepLabel } from '@/data/gcc/stages';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { StatusPill } from '@/components/tender/StatusPill';
import { Masked } from '@/components/tender/Masked';
import { TenderTracker } from '@/components/dashboard/TenderTracker';
import { column } from '@/components/dashboard/columns';
import { WinCell } from '@/components/dashboard/columns/base.cols';
import '@/components/dashboard/dashboard.css';

/** Words for the parts of a fact key; a unit at the end goes in brackets. */
const WORD: Record<string, string> = { rfqs: 'RFQs', rfq: 'RFQ', dg1: 'DG1', dg2: 'DG2', dg3: 'DG3', m2: 'M2', m3: 'M3', elig: 'eligibility', est: 'estimated', boq: 'BOQ' };
const UNIT: Record<string, string> = { pct: '(%)', wd: '(working days)', m: '(months)' };

/**
 * A fact key without a registered column header, in words: "prepWd" → "Prep
 * (working days)", "rfqsAnsweredOnTime" → "RFQs answered on time". Never the raw key.
 */
function factLabel(key: string): string {
  const parts = key.replace(/\./g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/\s+/).filter(Boolean);
  const last = parts.length > 1 ? UNIT[parts[parts.length - 1]] : undefined;
  const words = (last ? parts.slice(0, -1) : parts).map((w) => WORD[w] ?? w);
  const text = [...words, ...(last ? [last] : [])].join(' ');
  return text ? text[0].toUpperCase() + text.slice(1) : 'Fact';
}

/**
 * `/tenders/:id`: the tender summary, where "Open tender" lands until the
 * Tender Workspace (plan 019). Header, the tracker (always open), the step
 * facts, and Back.
 */
export function TenderSummary() {
  const id = decodeURIComponent(useParams().id ?? '');
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const port = dataPort();
  const person = state.person;

  const row = useMemo(() => port?.rows(tenant, { kind: 'all' }, person, 'all').find((r) => r.id === id) ?? null, [port, tenant, person, id]);
  const tracker = useMemo(() => port?.tracker(tenant, id, person) ?? null, [port, tenant, person, id]);

  const back = (
    <button type="button" className="btn btn-sm" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
      <ChevronLeft size={13} aria-hidden />Back
    </button>
  );

  if (!port) {
    return <div className="view"><Card><EmptyState title="Tender data is not loaded yet." body="The summary fills in once the tender lifecycles are loaded." action={back} /></Card></div>;
  }
  if (!row) {
    return <div className="view"><Card><EmptyState title={`No tender ${id} here.`} body="It may belong to another company, or not be shared with you." action={back} /></Card></div>;
  }

  const facts = Object.entries(row.facts).filter(([k]) => !k.endsWith('.masked'));
  const factText = (k: string, v: string | number | boolean | null) => {
    if (v === null) return row.facts[`${k}.masked`] ? <Masked /> : 'Not stated';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    return typeof v === 'number' ? v.toLocaleString('en-GB') : v;
  };

  return (
    <div className="view ts">
      <div className="db-z1">
        <div className="db-z1-l">
          <p className="db-sub"><span className="mono">{row.id}</span> · {row.shortTitle}</p>
          <p className="db-sub2">{row.issuer}{row.city ? ` · ${row.city}` : ''}{row.country ? `, ${row.country}` : ''}</p>
        </div>
        <div className="ts-head-r">
          {row.value ? <Money value={row.value} /> : <span className="tk-sub">Value not stated</span>}
          <span className="stage-chip">{stageLabel(row.stage)} · {stepLabel(row.stage, row.step)}</span>
          <StatusPill health={row.health} />
          {back}
        </div>
      </div>

      {tracker
        ? <TenderTracker vm={tracker} focusOnOpen={false} />
        : <Card style={{ marginBottom: 'var(--gap)' }}><EmptyState title="No tracker for this tender yet." compact /></Card>}

      <div className="split" style={{ '--cols': '1fr 1fr' } as CSSProperties}>
        <Card>
          <CardHead title="Tender" />
          <div style={{ padding: '6px 22px 14px' }}>
            <KV k="Sector" v={row.sector} />
            <KV k="Team" v={row.teamName ?? 'No team yet'} />
            <KV k="With" v={row.ownerName ? `${row.ownerName}${row.ownerRole ? `, ${row.ownerRole}` : ''}` : 'Nobody yet'} />
            <KV k="Submission" v={row.submission ? <When date={row.submission.date} time={row.submission.time} countdown={row.live} /> : 'No deadline yet'} />
            <KV k="Next gate" v={row.nextGate ? row.nextGate.label : 'None ahead'} />
            <KV k="Source" v={`${row.source.name} · ${row.source.ref}`} />
            <KV k="Fit" v={row.fit === null ? 'Not scored' : String(row.fit)} />
            <KV k="Win" v={<WinCell row={row} />} />
          </div>
        </Card>
        <Card>
          <CardHead title="Where it stands" meta={stepLabel(row.stage, row.step)} />
          <div style={{ padding: '6px 22px 14px' }}>
            {facts.length === 0 && <KV k="Step facts" v="None recorded for this step." />}
            {facts.map(([k, v]) => <KV key={k} k={column(k)?.header ?? factLabel(k)} v={factText(k, v)} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default TenderSummary;
