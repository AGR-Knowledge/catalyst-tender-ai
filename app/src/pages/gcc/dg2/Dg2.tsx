import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { personById, type Seat } from '@/data/people';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { freshnessFor, packVersionsFor, stampText } from '@/domain/gcc/s3';
import { BID_EFFECTS, decisionState, dg2RecordFor, LETTER_EFFECT, NO_BID_EFFECTS, roundOf } from '@/domain/gcc/dg2';
import { Card, CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { Callout } from '@/components/tender/Callout';
import { EmptyState } from '@/components/tender/EmptyState';
import { MembersPanel } from '@/components/tender/MembersPanel';
import { SlaClock } from '@/components/tender/SlaClock';
import { SourceHost } from '@/components/tender/SourceHost';
import { StatusPill } from '@/components/tender/StatusPill';
import type { Tone } from '@/data/types';
import { PackView } from '../s3/Pack';
import { tenderAccess, type TenderAccess } from '../s3/sight';
import { membersFor } from './members';
import { PositionForm } from './PositionForm';
import { DecisionBar } from './DecisionBar';
import { Conditions } from './Conditions';
import { DeclineLetter } from './DeclineLetter';
import { Reopen } from './Reopen';
import '../s3/s3.css';
import './dg2.css';

/**
 * `/dg2`: the DG2 queue, each tender with its 24 h clock and quorum state.
 * `/dg2?tender=T`: one tender's gate (ui-direction §5 D): the pack on the left,
 * folded at the reader's lens; the members panel, the decision bar and the
 * record on the right. Members record positions; the Head of Tendering
 * approves (dashboards.md §9).
 */
export default function Dg2() {
  const [params] = useSearchParams();
  const tender = params.get('tender');
  return tender ? <Gate tenderId={tender} /> : <Queue />;
}

type GateStatus = { label: string; tone: Tone; icon: string };

function gateStatus(ds: ReturnType<typeof decisionState>, seesPositions: boolean): GateStatus {
  if (ds.decision) return { label: `Decided: ${ds.decision.decision === 'bid' ? 'Bid' : 'No-Bid'}`, tone: ds.decision.decision === 'bid' ? 'green' : 'grey', icon: ds.decision.decision === 'bid' ? '✓' : '–' };
  if (ds.packVersion === null) return { label: 'Pack not issued', tone: 'grey', icon: '○' };
  if (ds.breached) return { label: 'Time limit passed', tone: 'red', icon: '!' };
  if (!seesPositions) return { label: 'With the committee', tone: 'orange', icon: '•' };
  return ds.positions.quorum.met ? { label: 'Ready for approval', tone: 'green', icon: '✓' } : { label: 'Quorum not met', tone: 'orange', icon: '!' };
}

/* ------------------------------------------------------------------ queue */

interface QRow {
  id: string; title: string; status: GateStatus; positions: string; stale: string | null; version: number | null;
  sla: { start?: string; due?: string; text: string; decided: boolean }; bm: string;
}

function Queue() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const { person, done } = state;
  const rows = useMemo<QRow[]>(() => {
    if (!isGccTenantKey(tenant)) return [];
    return gccData(tenant).register.flatMap((t): QRow[] => {
      const pv = packVersionsFor(tenant, t.id, done);
      if (!pv.current) return [];
      const a = tenderAccess(tenant, t.id, person, done, !!state.viewAs);
      if (!a.open || !a.can('dg2.view')) return [];
      const ds = decisionState(tenant, t.id, done);
      const sees = a.sight.canSeePositions;
      const fresh = freshnessFor(tenant, t.id, done);
      return [{
        id: t.id, title: t.title, status: gateStatus(ds, sees),
        positions: sees ? ds.positions.quorum.short : 'With the committee',
        stale: fresh?.stale ? stampText(fresh.stale.since) : null, version: ds.packVersion,
        sla: { start: ds.slaStart, due: ds.slaDue, text: ds.slaText, decided: !!ds.decision },
        bm: personById(t.bidManagerId)?.name ?? 'No Bid Manager yet',
      }];
    });
  }, [tenant, person, done, state.viewAs]);

  const waiting = rows.filter((r) => !r.sla.decided && r.version !== null);
  const other = rows.filter((r) => r.sla.decided || r.version === null);
  const table = (list: QRow[]) => (
    <DataTable
      rows={list}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/dg2?tender=${encodeURIComponent(r.id)}`)}
      rowLabel={(r) => `Open DG2 for ${r.id}, ${r.title}`}
      columns={[
        { key: 't', header: 'Tender', width: '2.2fr', primary: true, render: (r) => <span className="cell-main"><span className="mono pk-tid">{r.id}</span>{r.title}</span> },
        { key: 's', header: 'Status', width: '1.2fr', render: (r) => <StatusPill label={r.status.label} tone={r.status.tone} icon={r.status.icon} /> },
        { key: 'p', header: 'Positions', width: '1.3fr', render: (r) => <span className="num">{r.positions}</span> },
        { key: 'c', header: 'DG2 clock', width: '1.2fr', render: (r) => (r.sla.start && r.sla.due && !r.sla.decided ? <span className="pk-clockcell"><SlaClock start={r.sla.start} end={r.sla.due} /></span> : <span className="pk-dim">{r.sla.text}</span>) },
        { key: 'k', header: 'Pack', width: '1fr', render: (r) => (r.version === null ? <span className="pk-dim">Not issued</span> : <span className="pk-cellstack"><span className="mono">v{r.version}</span>{r.stale && <StatusPill label="Stale" tone="orange" icon="!" />}</span>) },
        { key: 'b', header: 'Bid Manager', width: '1fr', render: (r) => r.bm },
      ]}
    />
  );

  return (
    <div className="view pk-page">
      <Card>
        <CardHead title="Awaiting DG2" meta={`${waiting.length} ${waiting.length === 1 ? 'tender' : 'tenders'} · members record positions, the Head of Tendering approves`} />
        {waiting.length ? table(waiting) : <EmptyState title="No tender is waiting for DG2." body="A tender arrives here when its Bid Manager issues the Bid / No-Bid pack to the committee." />}
      </Card>
      {other.length > 0 && (
        <Card>
          <CardHead title="Decided, or pack not yet issued" meta={`${other.length}`} />
          {table(other)}
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
  const ds = useMemo(() => decisionState(tenant, tenderId, done), [tenant, tenderId, done]);
  const pv = useMemo(() => packVersionsFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const [recording, setRecording] = useState<{ seat: Seat; secretary: boolean } | null>(null);
  const title = isGccTenantKey(tenant) ? gccData(tenant).register.find((t) => t.id === tenderId)?.title ?? tenderId : tenderId;

  const back = <button type="button" className="btn btn-sm" onClick={() => navigate('/dg2')}><ChevronLeft size={13} aria-hidden />DG2 queue</button>;
  if (!access.open || !access.can('dg2.view')) {
    return <div className="view"><Card><EmptyState title={`No DG2 for ${tenderId} here.`} body="It may belong to another company, or not be shared with you." action={back} /></Card></div>;
  }
  if (!pv.current) {
    return <div className="view"><Card><EmptyState title={`${tenderId} has no Bid / No-Bid pack yet.`} body="DG2 opens when the Bid Manager issues the pack to the committee." action={back} /></Card></div>;
  }

  return (
    <SourceHost>
      <GateBody
        tenant={tenant} tenderId={tenderId} title={title} access={access} ds={ds} viewAs={viewAs}
        onRecord={(seat, secretary) => setRecording({ seat, secretary })}
      />
      <PositionForm tenant={tenant} tenderId={tenderId} seat={recording?.seat ?? null} asSecretary={!!recording?.secretary} onClose={() => setRecording(null)} />
    </SourceHost>
  );
}

function GateBody({ tenant, tenderId, title, access, ds, viewAs, onRecord }: {
  tenant: string; tenderId: string; title: string; access: TenderAccess; ds: ReturnType<typeof decisionState>; viewAs: boolean;
  onRecord(seat: Seat, secretary: boolean): void;
}) {
  const { state } = useDemo();
  const { person, done } = state;
  const sight = access.sight;
  const members = useMemo(() => membersFor(tenant, tenderId, done, person, sight), [tenant, tenderId, done, person, sight]);
  const record = useMemo(() => dg2RecordFor(tenant, tenderId, done, sight), [tenant, tenderId, done, sight]);
  const status = gateStatus(ds, sight.canSeePositions);
  const holds = (cap: Parameters<TenderAccess['check']>[0]) => access.check(cap, { viewAs: false }).ok;
  const d = record?.decision ?? null;

  // A member records their own seat; the pack must be with the committee and no decision in force.
  const notYet = ds.packVersion === null ? 'The pack is not with the committee yet' : ds.decision ? 'The decision is recorded: positions are closed until a re-open' : null;
  const ownCheck = person.seat ? access.check('dg2.position', { seat: person.seat }) : { ok: false, reason: 'Only Bid Committee members record a position' };
  const recordCheck = notYet ? { ok: false, reason: notYet } : ownCheck;
  const secCheck = holds('dg2.secretary') ? (notYet ? { ok: false, reason: notYet } : access.check('dg2.secretary')) : undefined;
  const decideCheck = access.check('dg2.decide');
  const closeCheck = holds('pack.issue') ? access.check('pack.issue') : access.check('dg2.decide');
  const letterCheck = access.check('pack.issue');

  return (
    <div className="view dg2">
      <header className="dg2-head">
        <div className="dg2-crumb">
          <Link className="btn-link" to="/dg2"><ChevronLeft size={12} aria-hidden />DG2 queue</Link>
          <span className="pk-dim">·</span>
          <Link className="btn-link" to={`/packs?tender=${encodeURIComponent(tenderId)}`}>Open the full pack</Link>
          <Link className="btn-link" to={`/tenders/${encodeURIComponent(tenderId)}`}>Tender workspace</Link>
        </div>
        <div className="dg2-l1">
          <span className="dg2-gate">DG2 · Bid / No-Bid</span>
          <h2 className="dg2-title"><span className="mono pk-tid">{tenderId}</span>{title}</h2>
          <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
          <span className="dg2-clock">
            {ds.slaStart && ds.slaDue && !ds.decision ? <><SlaClock start={ds.slaStart} end={ds.slaDue} /><span className="pk-dim"> · from the first issue, {stampText(ds.slaStart)}</span></> : <span className="pk-dim">{ds.slaText}</span>}
          </span>
        </div>
        {ds.escalation && <p className="dg2-esc" role="status">{ds.escalation.detail}.</p>}
      </header>

      <div className="dg2-grid">
        <div className="dg2-left">
          <PackView tenant={tenant} tenderId={tenderId} mode="gate" access={access} sight={sight} />
        </div>
        <aside className="dg2-right" aria-label="Committee positions and the decision">
          {d && (
            <div className="dg2-record">
              <Callout variant="verdict" word="DG2" title={`${d.label}, ${d.decision === 'bid' ? 'approved' : 'recorded'} by ${d.byName}`}>
                {stampText(d.at)} · pack v{d.packVersion}{d.majority ? ` · ${d.majority.for} for, ${d.majority.against} against` : ''}. Recorded in the audit trail.
                {d.differsText && <><br /><b>{d.differsText}:</b> {d.reason}</>}
                {/* A reason is asked for only against the majority: showing it would tell someone not cleared how the committee stood. */}
                {!d.differsText && d.reason && sight.canSeePositions && <><br />Reason: {d.reason}</>}
                {d.reasons.length > 0 && <><br />Reasons: {d.reasons.join(', ')}</>}
                {d.staleAcknowledged && <><br />Decided on a stale pack, acknowledged.</>}
              </Callout>
              <div className="dg2-done">
                {(d.decision === 'bid' ? BID_EFFECTS : [...(record?.letter ? [LETTER_EFFECT] : []), ...NO_BID_EFFECTS]).map((e) => <p key={e}>{e}</p>)}
                {d.lessons && d.decision === 'no-bid' && <p className="pk-dim">Lessons: {d.lessons}</p>}
              </div>
            </div>
          )}

          <MembersPanel
            rows={members.rows} headline={members.headline} quorum={members.quorum} majority={members.majority} masked={members.masked}
            onRecord={person.seat ? (seat) => onRecord(seat as Seat, false) : undefined} recordCheck={recordCheck}
            onRecordFor={secCheck ? (seat) => onRecord(seat as Seat, true) : undefined} secretaryCheck={secCheck}
          />
          {record && record.conflicts.length > 0 && <p className="dg2-p">Conflicts declared: {record.conflicts.map((c) => `${c.name} (${stampText(c.at)})`).join('; ')}.</p>}

          {!d && <DecisionBar tenant={tenant} tenderId={tenderId} ds={ds} check={decideCheck} holds={holds('dg2.decide')} />}
          {d?.decision === 'bid' && <Conditions tenant={tenant} tenderId={tenderId} sight={sight} check={closeCheck} holds={holds('pack.issue') || holds('dg2.decide')} />}
          {d?.decision === 'no-bid' && record?.letter && (
            <DeclineLetter tenant={tenant} tenderId={tenderId} round={roundOf(done, tenderId)} letter={record.letter} check={letterCheck} holds={holds('pack.issue')} />
          )}
          <Reopen
            tenant={tenant} tenderId={tenderId} record={record}
            requestCheck={access.check('reopen.request')} approveCheck={access.check('reopen.approve')}
            holdsRequest={holds('reopen.request')} holdsApprove={holds('reopen.approve')}
          />
          {viewAs && <p className="dg2-p">Viewing as {person.name}: read only.</p>}
        </aside>
      </div>
    </div>
  );
}
