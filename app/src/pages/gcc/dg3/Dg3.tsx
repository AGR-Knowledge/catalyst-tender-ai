import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { firstWithRole, personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { dg3Effects, dg3RecordFor, dg3State, dg3Tenders, linesFor, stampOf as stamp, type Dg3State } from '@/domain/gcc/dg3';
import { Card, CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { Callout } from '@/components/tender/Callout';
import { EmptyState } from '@/components/tender/EmptyState';
import { SlaClock } from '@/components/tender/SlaClock';
import { StatusPill } from '@/components/tender/StatusPill';
import { When } from '@/components/tender/When';
import { tenderAccess, type TenderAccess } from '../s3/sight';
import { Evidence } from './Evidence';
import { DecisionPanel } from './DecisionPanel';
import { SentBackCard } from './SendBack';
import { Dg3History, Reopen } from './Reopen';
import '../s3/s3.css';
import '../dg2/dg2.css';
import './dg3.css';

/**
 * `/dg3`: every bid waiting for final approval, with its 48 h clock and its
 * readiness. `/dg3?tender=T`: one tender's gate (ui-direction §5 D,
 * dashboards.md §9): the DG3 pack's evidence on the left, failing lines
 * first; the status, the clock and the Head of Tendering's decision on the
 * right, with Send back to Compliance beside it. Compliance re-issues a pack
 * sent back to them here; everyone else reads it.
 */
export default function Dg3() {
  const [params] = useSearchParams();
  const tender = params.get('tender');
  return tender ? <Gate tenderId={tender} /> : <Queue />;
}

const firstName = (id: string | null | undefined) => (personById(id)?.name ?? '').split(' ')[0];

/** The readiness under the status pill: what fails, who has it, or when it was decided. */
function readinessDetail(s: Dg3State): string {
  if (s.decision) return s.slaText;
  if (s.sentBack) return `With ${firstName(s.sentBack.toId)}`;
  return s.evaluation.ready ? 'Evidence complete' : s.evaluation.failing.map((l) => l.short ?? l.label).join(', ');
}

/* ------------------------------------------------------------------ queue */

function Queue() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const { person, done } = state;
  const rows = useMemo<Dg3State[]>(() => dg3Tenders(tenant).flatMap((id) => {
    const a = tenderAccess(tenant, id, person, done, !!state.viewAs);
    if (!a.open || !a.can('dg3.view')) return [];
    const s = dg3State(tenant, id, done);
    return s ? [s] : [];
  }), [tenant, person, done, state.viewAs]);

  const waiting = rows.filter((r) => !r.decision);
  const decided = rows.filter((r) => !!r.decision);
  const table = (list: Dg3State[]) => (
    <DataTable
      rows={list}
      rowKey={(r) => r.tenderId}
      onRowClick={(r) => navigate(`/dg3?tender=${encodeURIComponent(r.tenderId)}`)}
      rowLabel={(r) => `Open DG3 for ${r.tenderId}, ${r.title}`}
      columns={[
        { key: 't', header: 'Tender', width: '2.2fr', primary: true, render: (r) => <span className="cell-main"><span className="mono pk-tid">{r.tenderId}</span>{r.title}</span> },
        { key: 's', header: 'Readiness', width: '1.5fr', render: (r) => <span className="pk-cellstack"><StatusPill label={r.status.label} tone={r.status.tone} icon={r.status.icon} /><span className="pk-dim">{readinessDetail(r)}</span></span> },
        { key: 'c', header: 'DG3 clock', width: '1.2fr', render: (r) => (r.decision ? <span className="pk-dim">{r.slaText}</span> : <span className="pk-clockcell"><SlaClock start={r.openedAt} end={r.slaDue} /></span>) },
        { key: 'b', header: 'Bid Manager', width: '1fr', render: (r) => personById(r.bidManagerId)?.name ?? 'No Bid Manager yet' },
        { key: 'd', header: 'Submission', width: '1.3fr', render: (r) => (r.evaluation.tender.deadline ? <When date={r.evaluation.tender.deadline.date} time={r.evaluation.tender.deadline.time} short /> : <span className="pk-dim">No deadline on record</span>) },
      ]}
    />
  );

  return (
    <div className="view pk-page">
      <Card>
        <CardHead title="Awaiting DG3" meta={`${waiting.length} ${waiting.length === 1 ? 'bid' : 'bids'} · Compliance issues the pack, the Head of Tendering approves submission`} />
        {waiting.length ? table(waiting) : <EmptyState title="No bid is waiting for DG3." body="A bid arrives here when Compliance issues its DG3 pack." />}
      </Card>
      {decided.length > 0 && (
        <Card>
          <CardHead title="Decided" meta={`${decided.length}`} />
          {table(decided)}
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ gate */

function Gate({ tenderId }: { tenderId: string }) {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const { person, done } = state;
  const viewAs = !!state.viewAs;
  const access = useMemo(() => tenderAccess(tenant, tenderId, person, done, viewAs), [tenant, tenderId, person, done, viewAs]);
  const s = useMemo(() => dg3State(tenant, tenderId, done), [tenant, tenderId, done]);

  const back = <button type="button" className="btn btn-sm" onClick={() => navigate('/dg3')}><ChevronLeft size={13} aria-hidden />DG3 queue</button>;
  if (!access.open || !access.can('dg3.view')) {
    return <div className="view"><Card><EmptyState title={`No DG3 for ${tenderId} here.`} body="It may belong to another company, or not be shared with you." action={back} /></Card></div>;
  }
  if (!s) {
    return <div className="view"><Card><EmptyState title={`${tenderId} is not at DG3.`} body="DG3 opens when Compliance issues the DG3 pack." action={back} /></Card></div>;
  }
  return <GateBody s={s} access={access} viewAs={viewAs} />;
}

function GateBody({ s, access, viewAs }: { s: Dg3State; access: TenderAccess; viewAs: boolean }) {
  const { state } = useDemo();
  const { person, done } = state;
  const sight = access.sight;
  const lines = useMemo(() => linesFor(s.evaluation.lines, sight), [s, sight]);
  const record = useMemo(() => dg3RecordFor(s.tenant, s.tenderId, done, sight), [s.tenant, s.tenderId, done, sight]);
  const holds = (cap: Parameters<TenderAccess['check']>[0]) => access.check(cap, { viewAs: false }).ok;
  const d = record?.decision ?? null;
  const comp = firstWithRole(s.tenant, 'comp');
  const clockFrom = s.round === 1 ? `from the pack's issue, ${stamp(s.openedAt)}` : `from round ${s.round}, ${stamp(s.openedAt)}`;
  const meta = `${s.round === 1 ? 'Issued' : `Round ${s.round}, re-issued`} by ${comp?.name ?? 'Compliance'} · ${stamp(s.openedAt)}${s.evaluation.fixed ? ' · guarantee extended by the bank' : ''}`;

  // After a decision or a send-back here, focus moves to what replaces the bar, so Tab carries on from it (plan 025a).
  const [arrive, setArrive] = useState<'record' | 'back' | null>(null);
  const recordHead = useRef<HTMLSpanElement>(null);
  const backHead = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = arrive === 'record' ? recordHead.current : arrive === 'back' ? backHead.current : null;
    if (!el) return;
    // The record sits above the bar it replaces: scroll it into view with the focus.
    el.focus({ preventScroll: false });
    setArrive(null);
  }, [arrive, d, s.sentBack]);

  return (
    <div className="view dg2 dg3">
      <header className="dg2-head">
        <div className="dg2-crumb">
          <Link className="btn-link" to="/dg3"><ChevronLeft size={12} aria-hidden />DG3 queue</Link>
          <span className="pk-dim">·</span>
          <Link className="btn-link" to={`/tenders/${encodeURIComponent(s.tenderId)}`}>Tender workspace</Link>
        </div>
        <div className="dg2-l1">
          <span className="dg2-gate">DG3 · Final bid approval</span>
          <h2 className="dg2-title"><span className="mono pk-tid">{s.tenderId}</span>{s.title}</h2>
          <StatusPill label={s.status.label} tone={s.status.tone} icon={s.status.icon} />
          <span className="dg2-clock">
            {s.decision ? <span className="pk-dim">{s.slaText}</span> : <><SlaClock start={s.openedAt} end={s.slaDue} /><span className="pk-dim"> · {clockFrom}</span></>}
          </span>
        </div>
        {s.breached && <p className="dg2-esc" role="status">The 48 h time limit has passed. {firstWithRole(s.tenant, 'hot')?.name ?? 'The Head of Tendering'} decides as soon as possible.</p>}
      </header>

      <div className="dg2-grid">
        <div className="dg2-left">
          <Evidence lines={lines} meta={meta} />
        </div>
        <aside className="dg2-right" aria-label="The DG3 decision">
          {d && (
            <div className="dg2-record">
              <Callout variant="verdict" word="DG3" title={<span ref={recordHead} tabIndex={-1}>{d.label}, by {d.byName}</span>}>
                {stamp(d.at)} · round {d.round}. Evidence: {d.evidenceText}. Recorded in the audit trail.
                {d.reasons.length > 0 && <><br />Reasons: {d.reasons.join(', ')}</>}
                {d.note && <><br />Note: {d.note}</>}
              </Callout>
              <div className={`dg2-done ${d.decision === 'rejected' ? 'dg3-done-r' : ''}`}>
                {dg3Effects(d.decision, s).map((e) => <p key={e}>{e}</p>)}
              </div>
              <details className="dg3-seen">
                <summary>Evidence as seen at the decision</summary>
                <ul>{d.evidence.map((l) => <li key={l.key} className={`s-${l.state}`}><b>{l.label}:</b> {l.text}</li>)}</ul>
              </details>
            </div>
          )}
          <SentBackCard s={s} check={access.check('dg3.issue')} holds={holds('dg3.issue')} headRef={backHead} />
          <DecisionPanel
            s={s} check={access.check('dg3.decide')} holds={holds('dg3.decide')} issues={holds('dg3.issue')}
            onDecided={() => setArrive('record')} onSentBack={() => setArrive('back')}
          />
          <Reopen s={s} record={record} check={access.check('dg3.decide')} holds={holds('dg3.decide')} />
          {record && <Dg3History record={record} />}
          {viewAs && <p className="dg2-p">Viewing as {person.name}: read only.</p>}
        </aside>
      </div>
    </div>
  );
}
