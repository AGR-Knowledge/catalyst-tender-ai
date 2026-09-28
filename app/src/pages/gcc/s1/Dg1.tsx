import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ChevronLeft, Lock } from 'lucide-react';
import type { Tone } from '@/data/types';
import { personById } from '@/data/people';
import { money } from '@/domain/money';
import { DEMO_TODAY, countdownText, dateText } from '@/domain/calendar';
import { addHours } from '@/domain/gcc/clock';
import { blockingOpen, recommendationFor } from '@/domain/gcc/s1';
import { authorityCalendar, capitalise, dataOf, shortDate, shortWhen, tenderOf } from '@/domain/gcc/s1/common';
import { dg1PackFor, dg1Queue, dg1RecordFor, DG1_SLA_HOURS, reasonLabel, type Dg1Pack, type Dg1QueueItem } from '@/domain/gcc/dg1';
import { dg1PackStatus } from '@/domain/gcc/dg1/record';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { SlaClock } from '@/components/tender/SlaClock';
import { EmptyState } from '@/components/tender/EmptyState';
import { Callout } from '@/components/tender/Callout';
import { SourceHost } from '@/components/tender/SourceHost';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { useS1, type S1 } from './vm/useS1';
import { kpiCtxOf, tilesOf, valueTile } from './vm/tiles';
import { docOf, sourceDocOf } from './vm/docs';
import { Strip } from './parts/Strip';
import { S1Grid } from './parts/Grid';
import { FitNum, PairMoney } from './parts/cells';
import { EligibilityPanel } from './parts/EligibilityPanel';
import { Comparables, FitBreakdown } from './parts/FitBreakdown';
import { KeyDateList } from './parts/KeyDateList';
import { RecCard, useRail } from './parts/RecCard';
import { Dg1Form } from './parts/Dg1Form';
import { Dg1Record } from './parts/Dg1Record';
import '@/components/dashboard/dashboard.css';
import './s1.css';

/**
 * `/dg1` (spec §7): the tenders waiting for DG1 with their time limits, and
 * `/dg1?tender=T`, the evidence pack in the spec's order with the decision
 * form beside the recommendation. DG1 can't be recorded while a field that
 * blocks it is open; decisions recorded in the demo can be re-opened.
 */

const HERE = '/dg1';
const REC_TONE: Record<string, Tone> = { pursue: 'green', conditions: 'orange', discard: 'red' };

type QRow = Dg1QueueItem & { id: string; rec: ReturnType<typeof recommendationFor>; blocking: number };
interface DRow { id: string; shortTitle: string; decision: 'pursue' | 'discard'; byId: string; at: string; rec: string; override: boolean; source: 'seed' | 'demo'; reasons: string }

function List({ s1 }: { s1: S1 }) {
  const { tenant, viewer, viewAs, done } = s1;
  const navigate = useNavigate();
  const queue = useMemo(() => dg1Queue(tenant, done).filter((q) => s1.canOpen(q.tenderId)), [tenant, done, s1]);
  const rows: QRow[] = useMemo(() => queue.map((q) => ({ ...q, id: q.tenderId, rec: recommendationFor(tenant, q.tenderId, done), blocking: blockingOpen(tenant, q.tenderId, done).count })), [queue, tenant, done]);
  const decided: DRow[] = useMemo(() => dataOf(tenant).register.flatMap((t) => {
    if (!s1.canOpen(t.id)) return [];
    const s = dg1RecordFor(tenant, t.id, done);
    if (!s.current || !s.source) return [];
    const c = s.current;
    const override = c.decision === 'pursue' ? c.recommendation === 'discard' : c.recommendation !== 'discard';
    return [{ id: t.id, shortTitle: t.shortTitle, decision: c.decision === 'pursue' ? 'pursue' as const : 'discard' as const, byId: c.byId, at: c.at, rec: c.recommendation, override, source: s.source, reasons: c.reasonCodes.map(reasonLabel).join(', ') }];
  }).sort((a, b) => b.at.localeCompare(a.at)), [tenant, done, s1]);

  const ctx = kpiCtxOf({ tenant, viewer, viewAs, done }, '30d', 'dg1');
  const held = rows.filter((r) => r.held).length;
  const today = decided.filter((d) => d.source === 'demo').length;
  const todaySplit = today ? `${decided.filter((d) => d.source === 'demo' && d.decision === 'pursue').length} Pursue · ${decided.filter((d) => d.source === 'demo' && d.decision === 'discard').length} Discard` : 'None yet';
  // The decided list is newest first, so the first demo row is the latest decision recorded.
  const latest = decided.find((d) => d.source === 'demo');
  const tiles = [
    ...tilesOf(['SCR-1'], ctx, HERE),
    valueTile('dg1.held', 'On hold', String(held), {
      kind: 'state', means: 'Tenders at DG1 where the decider asked a person for information. The 24-hour limit keeps running',
      counted: 'Tenders in the DG1 queue with an open Hold.', target: 'None (information)', source: 'DG1 records',
    }, ctx, {
      sub: held ? 'Waiting on the person asked' : 'None', detail: held ? 'Waiting on the person asked' : 'None', tone: held ? 'orange' : 'muted',
      // A hold doesn't stop the clock (the ⓘ): the line gives the limit that keeps running.
      ref: { k: 'Cap', v: `${DG1_SLA_HOURS} h to decide` },
    }),
    valueTile('dg1.today', 'Recorded today', String(today), {
      kind: 'state', means: 'Pursue and Discard decisions recorded today, in this demo',
      counted: 'DG1 decisions recorded since the demo started, still standing.', target: 'None (information)', source: 'DG1 records',
    }, ctx, { sub: todaySplit, detail: todaySplit, tone: today ? 'ink' : 'muted', ref: { k: 'Latest', v: latest ? latest.id : 'None' } }),
  ];

  const qCols = useMemo<ColDef<QRow>[]>(() => [
    {
      colId: 'tender', headerName: 'Tender', flex: 1, minWidth: 220, valueGetter: (p) => p.data?.shortTitle,
      cellRenderer: (p: ICellRendererParams<QRow>) => p.data && (
        <span className="s1-two">
          <span className="s1-main">{p.data.restricted && <Lock size={11} aria-label="Restricted lane" />} {p.data.shortTitle}</span>
          <span className="s1-sub"><span className="mono">{p.data.tenderId}</span> · logged {shortWhen(p.data.loggedAt)}</span>
        </span>
      ),
    },
    { colId: 'bm', headerName: 'Bid Manager', width: 150, valueGetter: (p) => personById(p.data?.bidManagerId)?.name ?? '–' },
    {
      colId: 'rec', headerName: 'Recommendation', width: 190,
      cellRenderer: (p: ICellRendererParams<QRow>) => (p.data?.rec ? <StatusPill label={p.data.rec.recommendation} tone={REC_TONE[p.data.rec.verdict] ?? 'ink'} /> : <span className="tk-sub">None</span>),
    },
    {
      colId: 'state', headerName: 'State', width: 190,
      cellRenderer: (p: ICellRendererParams<QRow>) => {
        const r = p.data;
        if (!r) return null;
        if (r.held && r.hold && 'request' in r.hold) return <StatusPill label={`On hold: ${personById(r.hold.request.toId)?.name ?? 'asked'}`} tone="orange" />;
        if (r.blocking) return <StatusPill label={`Locked: ${r.blocking} field${r.blocking === 1 ? '' : 's'} open`} tone="orange" icon="!" />;
        if (r.reopened) return <StatusPill label="Re-opened" tone="cyan" />;
        return <StatusPill label="Ready to decide" tone="green" icon="✓" />;
      },
    },
    { colId: 'sla', headerName: 'DG1 due', width: 212, pinned: 'right', cellRenderer: (p: ICellRendererParams<QRow>) => p.data && <SlaClock start={p.data.loggedAt} end={p.data.dueAt} /> },
  ], []);

  const dCols = useMemo<ColDef<DRow>[]>(() => [
    {
      colId: 'tender', headerName: 'Tender', flex: 1, minWidth: 200, valueGetter: (p) => p.data?.shortTitle,
      cellRenderer: (p: ICellRendererParams<DRow>) => p.data && (
        <span className="s1-two"><span className="s1-main">{p.data.shortTitle}</span><span className="s1-sub"><span className="mono">{p.data.id}</span>{p.data.reasons ? ` · ${p.data.reasons}` : ''}</span></span>
      ),
    },
    {
      colId: 'decision', headerName: 'Decision', width: 170,
      cellRenderer: (p: ICellRendererParams<DRow>) => p.data && (
        <span className="s1-act"><StatusPill label={p.data.decision === 'pursue' ? 'Pursue' : 'Discard'} tone={p.data.decision === 'pursue' ? 'green' : 'grey'} />{p.data.override && <span className="s1-sub-i">override</span>}</span>
      ),
    },
    { colId: 'by', headerName: 'By', width: 150, valueGetter: (p) => personById(p.data?.byId)?.name ?? p.data?.byId },
    { colId: 'at', headerName: 'When', width: 132, valueGetter: (p) => p.data?.at, cellRenderer: (p: ICellRendererParams<DRow>) => p.data && <span className="num">{shortWhen(p.data.at)}</span> },
    { colId: 'src', headerName: 'Recorded', width: 100, valueGetter: (p) => (p.data?.source === 'demo' ? 'Today' : 'Earlier') },
  ], []);

  return (
    <div className="view s1">
      <Strip tiles={tiles} />
      <Card>
        <CardHead title="Waiting for DG1" meta={<span className="num">{DG1_SLA_HOURS} h from logging</span>} />
        <p className="s1-lede">Soonest deadline first. Recorded by the assigned Bid Manager, or by the Head of Tendering as a delegate, with the evidence pack open.</p>
        {rows.length
          ? <S1Grid rows={rows} columns={qCols} onOpen={(id) => navigate(`/dg1?tender=${id}`)} label="Tenders waiting for DG1" />
          : <EmptyState title="Nothing is waiting for DG1." body="Tenders arrive here when intake logs and routes them." compact />}
      </Card>
      <Card>
        <CardHead title="Decisions on record" meta={<span className="num">{decided.length}</span>} />
        {decided.length
          ? <S1Grid rows={decided} columns={dCols} onOpen={(id) => navigate(`/dg1?tender=${id}`)} label="DG1 decisions on record" rowHeight={44} />
          : <EmptyState title="No DG1 decisions on record yet." compact />}
      </Card>
    </div>
  );
}

function Section({ n, title, meta, children }: { n: number; title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <CardHead title={<span className="dg1-sec"><span className="dg1-n num" aria-hidden>{n}</span>{title}</span>} meta={meta} />
      <div className="s1-pad">{children}</div>
    </Card>
  );
}

function PackBody({ s1, pack }: { s1: S1; pack: Dg1Pack }) {
  const navigate = useNavigate();
  const { tenant } = s1;
  const id = pack.tenderId;
  const t = tenderOf(tenant, id)!;
  const doc = sourceDocOf(docOf(tenant, id));
  const g = pack.glance;
  const sub = g.keyDates.find((k) => k.kind === 'submission');
  const cal = authorityCalendar(t, tenant);
  const cap = pack.capacity;
  const b = pack.bond;
  const open = pack.open;

  return (
    <div className="s1-stack">
      <Section n={1} title="The tender at a glance">
        <div className="s1-kv">
          <KV k="Authority" v={g.authority} />
          <KV k="Value" v={<PairMoney v={g.value ?? undefined} basis={g.valueBasis} />} />
          <KV k="Procurement" v={g.type} />
          {sub && <KV k="Submission" v={<span className="num">{dateText(sub.date)}{sub.time ? `, ${sub.time} ${sub.tz}` : ''} · {countdownText(DEMO_TODAY, sub.date, cal.cc)}</span>} />}
          {g.prep && (
            <KV k="Time to prepare" v={
              <span className={`num t-${g.prep.tone}`} title={g.prep.basis}>
                {g.prep.workingDaysLeft} working days left · typical {g.prep.typical} ({g.prep.n} past bids) · {g.prep.ratio.toFixed(1)}×
              </span>
            } />
          )}
        </div>
        {g.prep && <p className="s1-note">{g.prep.basis}</p>}
        <h3 className="s1-h3">Key dates</h3>
        <KeyDateList s1={s1} tenderId={id} doc={doc} compact />
      </Section>

      <Section n={2} title="Eligibility">
        <EligibilityPanel s1={s1} tenderId={id} doc={doc} mode="pack" onQueries={() => navigate(`/tenders/${id}?tab=queries`)} />
      </Section>

      <Section n={3} title="Fit">
        <FitBreakdown s1={s1} tenderId={id} />
      </Section>

      <Section n={4} title="Capacity" meta={cap ? <span className="num">{cap.windowLabel}</span> : undefined}>
        {cap ? (
          <>
            <p className="s1-muted"><b>{capitalise(cap.teamName)}</b>: {cap.nowPct}% committed now, {cap.withPct}% with this bid. Busiest month: {cap.peak.month}, {cap.peak.pct}%.</p>
            <div className="dg1-bar">
              <ThresholdBar value={cap.withPct} threshold={100} max={Math.max(120, cap.peak.pct + 10)} unit="%" thresholdLabel="full capacity" tone={cap.withPct > 100 ? 'red' : 'ink'} label="Bid-team load with this bid" />
            </div>
            {cap.clashes.length > 0 ? (
              <ul className="dg1-list">
                {cap.clashes.map((c) => <li key={c.tenderId}>Clash: <b>{c.title}</b> (<span className="mono">{c.tenderId}</span>) is due {shortDate(c.to)}, {c.hoursPerWeek} h a week on the same team.</li>)}
              </ul>
            ) : <p className="s1-note">No other pursuit on this team is due within a week of this one.</p>}
          </>
        ) : <p className="s1-muted">No effort estimate for this tender yet, so its load on a bid team is not shown.</p>}
      </Section>

      <Section n={5} title="Bid bond and the facility">
        {b ? (
          <>
            <div className="s1-kv">
              <KV k="Bid bond" v={<span className="num">{b.bond.text}</span>} />
              <KV k="Rate" v={b.bond.rateText} />
              <KV k="Validity" v={b.bond.validityText} />
              <KV k="Bank lead time" v={`${b.bond.bankLeadDays} working days`} />
              <KV k="Headroom after this bond" v={<span className="num">{money(b.bond.afterBid.amount, b.bond.afterBid.ccy)}</span>} />
              {b.bond.performanceIfWon && <KV k="Performance guarantee if won" v={<span className="num">{money(b.bond.performanceIfWon.amount, b.bond.performanceIfWon.ccy)}</span>} />}
              {b.bond.advanceIfWon && <KV k="Advance payment guarantee if won" v={<span className="num">{money(b.bond.advanceIfWon.amount, b.bond.advanceIfWon.ccy)}</span>} />}
            </div>
            <p className="s1-note">{capitalise(b.facilityText)}.</p>
            {b.bond.facilityTight && (
              <Callout variant="route" word="Facility" title="Finance must confirm the facility" compact>
                After the bid bond, the headroom would not cover the guarantees needed on award (performance and advance payment).
              </Callout>
            )}
          </>
        ) : <p className="s1-muted">The tender states no bid bond.</p>}
      </Section>

      <Section n={6} title="Comparable past bids" meta={<span className="num">{pack.comparables.length}</span>}>
        {pack.comparables.length ? <Comparables items={pack.comparables} heading={false} /> : <p className="s1-muted">No comparable past bids in the company's history.</p>}
      </Section>

      <Section n={7} title="Open validations and queries">
        {open.validations.length ? (
          <ul className="dg1-list">
            {open.validations.map((q) => (
              <li key={q.item.id}>
                <b>{q.item.field}</b>{q.item.blocksDg1 ? <> <StatusPill label="Blocks DG1" tone="orange" icon="!" /></> : null}
                <span className="s1-sub-i"> {q.state === 'sent-back' ? 'sent back to the agent' : q.conflict ? 'two values found' : 'to check'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="s1-muted">No fields left to validate.</p>}
        <p className="s1-note">
          {open.validations.length > 0 && <><Link to={`/intake-queue?tender=${id}`}>Open the intake queue</Link> · </>}
          Queries: {open.queries.counts.draft} draft · {open.queries.counts.approved} approved · {open.queries.counts.sent} sent{open.queries.deadline ? ` · ${open.queries.deadline.text}` : ''}.{' '}
          {open.queries.items.length > 0 && <Link to={`/tenders/${id}?tab=queries`}>Open the queries</Link>}
        </p>
      </Section>
    </div>
  );
}

function Pack({ s1, id }: { s1: S1; id: string }) {
  const { tenant, done } = s1;
  const pack = useMemo(() => dg1PackFor(tenant, id, done), [tenant, id, done]);
  const state = useMemo(() => dg1RecordFor(tenant, id, done), [tenant, id, done]);
  const rail = useRail(s1, id);
  // After Confirm the record replaces the form: it takes keyboard focus (plan 025b).
  const [recorded, setRecorded] = useState(false);
  // After Re-open the form replaces the record: its heading takes focus (plan 026).
  const [reopened, setReopened] = useState(false);
  const t = tenderOf(tenant, id);
  const back =<Link to="/dg1" className="btn btn-sm"><ChevronLeft size={13} aria-hidden />DG1 decisions</Link>;

  if (!t || !s1.canOpen(id)) return <div className="view"><Card><EmptyState title={`No tender ${id} here.`} body="It may belong to another company, or not be shared with you." action={back} /></Card></div>;
  if (!pack) return <div className="view"><Card><EmptyState title={`${id} has no DG1 pack.`} body="The pack is built once intake has read and scored the tender." action={back} /></Card></div>;

  const loggedAt = t.intake.loggedAt;
  const dueAt = loggedAt ? addHours(loggedAt, DG1_SLA_HOURS) : undefined;
  const c = state.current;
  // A tender routed to validation reads Validating, with no clock, until it joins DG1 decisions (plan 026).
  const status = dg1PackStatus(tenant, id, done);
  const bm = personById(t.bidManagerId);

  return (
    <SourceHost>
      <div className="view s1">
        <Card>
          <div className="dg1-head">
            <div className="dg1-head-m">
              <div className="dg1-crumb">{back}<span className="eyebrow">DG1 evidence pack</span></div>
              <h2 className="dg1-title"><span className="mono dg1-tid">{id}</span>{t.title}</h2>
              <div className="s1-sub-i">{t.issuer} · Bid Manager {bm?.name ?? 'not assigned'} · <Link to={`/tenders/${id}`}>Open the workspace</Link></div>
            </div>
            <div className="dg1-head-r">
              <StatusPill label={status.label} tone={status.tone} />
              {status.clock && <SlaClock start={status.clock.start} end={status.clock.end} />}
              {status.note && <span className="s1-sub-i">{status.note}</span>}
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
                <span className="t-muted" style={{ fontSize: 12 }}>Fit</span>
                <FitNum tenant={tenant} fit={pack.fit.result.weighted} />
              </span>
            </div>
          </div>
        </Card>

        <div className="s1-cols dg1-cols">
          <PackBody s1={s1} pack={pack} />
          <div className="s1-stack dg1-side">
            {c ? (
              <>
                <Dg1Record s1={s1} state={state} focusHead={recorded} onReopened={() => setReopened(true)} />
                {rail && <RecCard rail={rail} overridden />}
              </>
            ) : (
              <>
                {rail && <RecCard rail={rail} />}
                {state.reopen && (
                  <Callout variant="route" word="Re-opened" title={`Re-opened by ${personById(state.reopen.byId)?.name ?? state.reopen.byId}, ${shortWhen(state.reopen.at)}`} compact>
                    {state.reopen.reason.replace(/[.\s]+$/, '')}{state.reopen.previous ? `. The earlier ${state.reopen.previous.decision === 'pursue' ? 'Pursue' : 'Discard'} of ${shortWhen(state.reopen.previous.at)} stays on record.` : '.'}
                  </Callout>
                )}
                <Dg1Form key={`${id}:${state.round}`} s1={s1} pack={pack} state={state} dueAt={dueAt} onRecorded={() => setRecorded(true)} focusHead={reopened} />
              </>
            )}
          </div>
        </div>
      </div>
    </SourceHost>
  );
}

export default function Dg1() {
  const s1 = useS1();
  const [params] = useSearchParams();
  const id = params.get('tender');
  return id ? <Pack key={id} s1={s1} id={id} /> : <List s1={s1} />;
}
