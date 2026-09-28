import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ExternalLink, Lock } from 'lucide-react';
import { money } from '@/domain/money';
import { eligibilityFor, triageFor, type TriageRow } from '@/domain/gcc/s1';
import { dg1Queue } from '@/domain/gcc/dg1';
import { shortDate } from '@/domain/gcc/s1/common';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { SlaClock } from '@/components/tender/SlaClock';
import { Sheet } from '@/components/tender/Sheet';
import { EmptyState } from '@/components/tender/EmptyState';
import { Callout } from '@/components/tender/Callout';
import { SourceHost } from '@/components/tender/SourceHost';
import { useS1, type S1 } from './vm/useS1';
import { kpiCtxOf, tilesOf, valueTile } from './vm/tiles';
import { docOf, sourceDocOf } from './vm/docs';
import { Strip } from './parts/Strip';
import { S1Grid } from './parts/Grid';
import { FitNum, PairMoney } from './parts/cells';
import { ELIGIBILITY_VERDICT, EligibilityPanel } from './parts/EligibilityPanel';
import { RecCard, useRail } from './parts/RecCard';
import '@/components/dashboard/dashboard.css';
import './s1.css';

/**
 * `/screening` (spec §6.9, catalogue §D): the tenders waiting for DG1, then the
 * low-fit ones a person may still take, with eligibility and fit. When several
 * land together, the triage columns say what pursuing each row and every row
 * above it would use of the bid teams and the bank facility. The rows keep the
 * DG1 queue's order (soonest SLA first) and are never ranked: that is for people.
 */

const HERE = '/screening';

type Row = TriageRow & { id: string };

const pct = (n: number | null) => (n === null ? <span className="tk-sub">No estimate</span> : <span className={`num ${n > 100 ? 't-red s1-over' : ''}`}>{n}%</span>);

function TriageSheet({ s1, row, sla }: { s1: S1; row: Row; sla?: { loggedAt: string; dueAt: string } }) {
  const navigate = useNavigate();
  const rail = useRail(s1, row.tenderId);
  const doc = sourceDocOf(docOf(s1.tenant, row.tenderId));
  const dg1 = s1.check('dg1.view', row.tenderId);
  return (
    <div className="s1-sheet">
      <div className="s1-sheet-top">
        <span className="s1-act">
          <StatusPill label={row.queue === 'dg1' ? (row.held ? 'DG1: on hold' : 'Waiting for DG1') : 'Low fit: not routed to DG1'} tone={row.queue === 'dg1' ? (row.held ? 'orange' : 'cyan') : 'grey'} />
          {sla && <SlaClock start={sla.loggedAt} end={sla.dueAt} />}
        </span>
        {row.queue === 'dg1' && dg1.ok && (
          <button type="button" className="btn btn-sm" onClick={() => navigate(`/tenders/${row.tenderId}?tab=eligibility`)}><ExternalLink size={12} aria-hidden />Open workspace</button>
        )}
      </div>
      <div className="s1-kv">
        <KV k="Fit for this company" v={<FitNum tenant={s1.tenant} fit={row.fit} />} />
        <KV k="Value" v={<PairMoney v={row.value} basis={row.valueBasis} />} />
        <KV k="Bid bond" v={<span className="num">{money(row.bidBond.amount, row.bidBond.ccy)}</span>} />
        <KV k="Bid-team effort" v={row.effort ? `${row.effort.hoursPerWeek} h a week, ${shortDate(row.effort.from)} – ${shortDate(row.effort.to)}${row.teamName ? `, ${row.teamName}` : ''}` : 'No estimate yet'} />
      </div>
      {rail && <RecCard rail={rail} />}
      <h3 className="s1-h3">Eligibility</h3>
      <EligibilityPanel s1={s1} tenderId={row.tenderId} doc={doc} mode="pack" onQueries={() => navigate(`/tenders/${row.tenderId}?tab=queries`)} />
    </div>
  );
}

export default function Screening() {
  const s1 = useS1();
  const { tenant, viewer, viewAs, done } = s1;
  const navigate = useNavigate();
  // Only the rows the viewer may open, so the ↓ columns, the teams and the facility add up to what the table shows.
  const triage = useMemo(() => triageFor(tenant, done, s1.canOpen), [tenant, done, s1.canOpen]);
  const queue = useMemo(() => dg1Queue(tenant, done), [tenant, done]);
  const [open, setOpen] = useState<number | null>(null);

  const rows: Row[] = useMemo(() => triage.rows.map((r) => ({ ...r, id: r.tenderId })), [triage]);
  const elig = useMemo(() => new Map(rows.map((r) => [r.tenderId, eligibilityFor(tenant, r.tenderId, done)])), [rows, tenant, done]);
  const slaOf = (id: string) => queue.find((q) => q.tenderId === id);

  const ctx = kpiCtxOf({ tenant, viewer, viewAs, done }, '30d', 'screening');
  const busiest = [...triage.teams].filter((t) => t.rows).sort((a, b) => b.peak.pct - a.peak.pct)[0];
  const tiles = [
    ...tilesOf(['SCR-1', 'SCR-5'], ctx, HERE),
    valueTile('triage.load', 'Load if all pursued', busiest ? `${busiest.peak.pct}%` : '–', {
      kind: 'state', means: "The busiest bid team's peak month if every tender in the triage table were pursued, on top of what it already carries",
      counted: `Committed hours plus each tender's effort estimate, over available hours, month by month. ${triage.windowLabel}.`, target: 'Up to 100% of bid capacity', source: 'Bid-team commitments and effort estimates',
    }, ctx, {
      sub: busiest ? `${busiest.name}, ${busiest.peak.month}` : 'No effort estimates', tone: busiest && busiest.peak.pct > 100 ? 'red' : 'ink',
      detail: busiest ? busiest.name : 'No effort estimates', ...(busiest ? { ref: { k: 'Peak', v: busiest.peak.month } } : {}),
      // Over 100% of bid capacity: "Off track" would read as a schedule.
      ...(busiest && busiest.peak.pct > 100 ? { status: 'Over capacity' } : {}),
    }),
  ];

  const columns = useMemo<ColDef<Row>[]>(() => ([
    {
      colId: 'tender', headerName: 'Tender', flex: 1, minWidth: 196, valueGetter: (p) => p.data?.title,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && (
        <span className="s1-two">
          <span className="s1-main">{p.data.restricted && <Lock size={11} aria-label="Restricted lane" />} {p.data.shortTitle}</span>
          <span className="s1-sub"><span className="mono">{p.data.tenderId}</span> · {p.data.queue === 'dg1' ? (p.data.held ? 'DG1 on hold' : 'DG1 queue') : 'Low fit'}</span>
        </span>
      ),
    },
    { field: 'fit', headerName: 'Fit', width: 58, cellRenderer: (p: ICellRendererParams<Row>) => p.data && <FitNum tenant={tenant} fit={p.data.fit} /> },
    {
      colId: 'elig', headerName: 'Eligibility', width: 140,
      cellRenderer: (p: ICellRendererParams<Row>) => {
        const e = p.data && elig.get(p.data.tenderId);
        if (!e) return <span className="tk-sub">Not checked</span>;
        const v = ELIGIBILITY_VERDICT[e.verdict];
        const risk = e.counts.fail ? `${e.counts.fail} fail` : e.counts.atRisk ? `${e.counts.atRisk} at risk` : null;
        return <span title={e.text}><StatusPill label={e.verdict === 'eligible' && risk ? `Eligible · ${risk}` : v.label.replace('Eligible only with a JV partner', 'Only with a JV')} tone={e.verdict === 'eligible' && risk ? 'orange' : v.tone} icon={v.icon} /></span>;
      },
    },
    { colId: 'value', headerName: 'Value', width: 112, cellRenderer: (p: ICellRendererParams<Row>) => p.data && <PairMoney v={p.data.value} basis={p.data.valueBasis} /> },
    {
      colId: 'effort', headerName: 'Effort', width: 112,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && (p.data.effort
        ? <span className="s1-two"><span className="num">{p.data.effort.hoursPerWeek} h/wk</span><span className="s1-sub">{p.data.teamName}</span></span>
        : <span className="tk-sub">No estimate</span>),
    },
    { colId: 'bond', headerName: 'Bid bond', width: 96, cellRenderer: (p: ICellRendererParams<Row>) => p.data && <span className="num">{money(p.data.bidBond.amount, p.data.bidBond.ccy)}</span> },
    { colId: 'team', headerName: 'Team load ↓', width: 100, cellRenderer: (p: ICellRendererParams<Row>) => p.data && pct(p.data.cumulative.teamLoadPct) },
    { colId: 'facility', headerName: 'Facility ↓', width: 88, cellRenderer: (p: ICellRendererParams<Row>) => p.data && pct(p.data.cumulative.facilityUsePct) },
    {
      colId: 'sla', headerName: 'DG1 due', width: 200, pinned: 'right',
      cellRenderer: (p: ICellRendererParams<Row>) => {
        const q = p.data && slaOf(p.data.tenderId);
        return q ? <SlaClock start={q.loggedAt} end={q.dueAt} /> : <span className="tk-sub">Not routed</span>;
      },
    },
  ] as ColDef<Row>[]).map((c) => ({ ...c, sortable: false })), [tenant, elig, queue]);

  const items = rows.map((r) => ({ id: r.tenderId, title: r.title }));
  const renderRow = (id: string) => {
    const row = rows.find((r) => r.tenderId === id);
    const q = slaOf(id);
    return row ? <TriageSheet s1={s1} row={row} sla={q ? { loggedAt: q.loggedAt, dueAt: q.dueAt } : undefined} /> : null;
  };
  const canPack = (id: string) => rows.find((r) => r.tenderId === id)?.queue === 'dg1' && s1.check('dg1.view', id).ok;

  return (
    <SourceHost>
      <div className="view s1">
        <Strip tiles={tiles} />

        <Card>
          <CardHead title="Waiting for DG1" meta={<span className="num">{triage.windowLabel}</span>} />
          <p className="s1-lede">
            Soonest DG1 deadline first, then the low-fit tenders a person may still take. The two columns marked ↓ add up down the table: what pursuing that row and every row above it would use. The agent states the load; it does not rank the tenders.
          </p>
          {triage.flags.length > 0 && (
            <div className="s1-pad s1-flags">
              {triage.flags.map((f) => <Callout key={f} variant="route" word="Triage" title={f} compact />)}
            </div>
          )}
          {rows.length
            ? <S1Grid rows={rows} columns={columns} onOpen={(id) => setOpen(rows.findIndex((r) => r.tenderId === id))} label="Tenders waiting for DG1" rowClassRules={{ 's1-row-muted': (p) => p.data?.queue === 'low-fit' }} />
            : <EmptyState title="Nothing is waiting for DG1." body="Tenders appear here once intake logs them and routes them to DG1." compact />}
        </Card>

        <div className="s1-cols">
          <Card>
            <CardHead title="Bid teams" meta={<span className="num">{triage.windowLabel}</span>} />
            <ul className="scr-teams">
              {triage.teams.map((t) => (
                <li key={t.id}>
                  <span className="scr-team-n">{t.name}</span>
                  <span className="num">{t.basePct}% committed</span>
                  <span className="num">{t.rows ? <>→ {pct(t.allPct)} with {t.rows === 1 ? 'the one tender' : `all ${t.rows}`} here</> : <span className="tk-sub">No tender here</span>}</span>
                  <span className="s1-sub-i">{t.rows ? <>Peak {t.peak.month}: {pct(t.peak.pct)}</> : ''}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHead title="Bank guarantee facility" />
            <div className="s1-pad">
              <div className="s1-kv">
                <KV k="Headroom" v={<span className="num">{money(triage.facility.headroom.amount, triage.facility.headroom.ccy)}</span>} />
                <KV k="Bid bonds if all pursued" v={<span className="num">{money(triage.facility.allBonds.amount, triage.facility.allBonds.ccy)}</span>} />
                <KV k="Share of the headroom" v={pct(triage.facility.usePct)} />
              </div>
              <p className="s1-note">Bid bonds only. The performance and advance payment guarantees on award are in each tender's DG1 pack.</p>
            </div>
          </Card>
        </div>

        <Sheet
          items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} render={renderRow} eyebrow="Triage"
          primary={{
            label: open !== null && rows[open] && canPack(rows[open].tenderId) ? 'Open the DG1 pack' : 'Open workspace',
            onClick: (id) => navigate(canPack(id) ? `/dg1?tender=${id}` : `/tenders/${id}?tab=eligibility`),
          }}
        />
      </div>
    </SourceHost>
  );
}
