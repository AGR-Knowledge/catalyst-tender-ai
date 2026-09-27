import { useMemo, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { registerRow, heldByScreening, screeningOf, suppliersOf, type Screening } from '@/domain/gcc/s2';
import { RESCREEN_DAYS, type Supplier } from '@/data/gcc/s2';
import { Card, Kpis } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { EmptyState } from '@/components/tender/EmptyState';
import { S2Grid } from './S2Grid';
import { PanelHead } from './ui';
import './s2.css';
import { plural } from '@/domain/format';

/**
 * Suppliers (`/suppliers`, archetype B): the tenant's supplier master with
 * trades, the clients whose approved lists include each supplier, ICV, the
 * screening status and date (re-screened every 180 days), and performance.
 * Plain on purpose: the demo's point is the guardrail, shown on shortlists.
 */

type Filter = 'all' | Screening['state'];
interface Row { id: string; s: Supplier; sc: Screening; trades: string; avl: string }

const TONE: Record<Screening['state'], 'green' | 'orange' | 'red'> = { current: 'green', due: 'orange', blocked: 'red' };

function ScreeningCell(p: ICellRendererParams<Row>) {
  return p.data ? <StatusPill label={p.data.sc.label} tone={TONE[p.data.sc.state]} /> : null;
}

const COLS: ColDef<Row>[] = [
  { headerName: 'Supplier', valueGetter: (p) => p.data?.s.name, minWidth: 220, flex: 2 },
  { headerName: 'Location', valueGetter: (p) => (p.data ? `${p.data.s.city}, ${p.data.s.country}` : ''), width: 150 },
  { headerName: 'Trades', valueGetter: (p) => p.data?.trades, minWidth: 180, flex: 1 },
  { headerName: 'Approved by', valueGetter: (p) => p.data?.avl || 'None held', minWidth: 160, flex: 1 },
  { headerName: 'ICV', valueGetter: (p) => p.data?.s.icv ?? null, width: 80, type: 'rightAligned', valueFormatter: (p) => (p.value === null ? 'None' : String(p.value)) },
  { headerName: 'Screening', colId: 'screening', valueGetter: (p) => p.data?.sc.label, cellRenderer: ScreeningCell, minWidth: 200, flex: 1 },
  { headerName: 'On time', valueGetter: (p) => p.data?.s.performance.onTimePct, width: 95, type: 'rightAligned', valueFormatter: (p) => `${p.value}%` },
  { headerName: 'NCRs (12 m)', valueGetter: (p) => p.data?.s.performance.ncrs12m, width: 110, type: 'rightAligned' },
  { headerName: 'Replies', valueGetter: (p) => p.data?.s.response.ratePct, width: 95, type: 'rightAligned', valueFormatter: (p) => `${p.value}%` },
];

const TRADE_WORD = (t: string) => t.replace(/-/g, ' ').replace(/^(hv|lv|ica|grp|cipp|cctv|tbm|bms|hvac)$/i, (x) => x.toUpperCase());

export default function Suppliers() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => suppliersOf(tenant).map((s) => ({
    id: s.id, s, sc: screeningOf(s), trades: s.trades.map(TRADE_WORD).join(', '),
    // The issuer's short name where the register gives one ("… (ECWS)").
    avl: s.avl.map((a) => /\(([^)]+)\)$/.exec(a)?.[1] ?? a).join(', '),
  })), [tenant]);
  const held = useMemo(() => heldByScreening(tenant, state.done), [tenant, state.done]);
  const count = (f: Screening['state']) => rows.filter((r) => r.sc.state === f).length;
  const q = text.trim().toLowerCase();
  const shown = rows.filter((r) => (filter === 'all' || r.sc.state === filter) && (!q || `${r.s.name} ${r.s.city} ${r.trades} ${r.avl}`.toLowerCase().includes(q)));
  const selected = rows.find((r) => r.id === sel);

  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: rows.length }, { id: 'current', label: 'Screened', n: count('current') },
    { id: 'due', label: 'Screening due', n: count('due') }, { id: 'blocked', label: 'Blocked', n: count('blocked') },
  ];

  return (
    <div className="view s2-page">
      <Kpis items={[
        { label: 'Suppliers', value: String(rows.length), sub: 'In your supplier master' },
        { label: 'Screened, current', value: String(count('current')), tone: 'green', sub: `Re-screened every ${RESCREEN_DAYS} days` },
        { label: 'Screening due', value: String(count('due')), tone: count('due') ? 'orange' : 'green', sub: 'Re-screen before sending an RFQ' },
        { label: 'Blocked', value: String(count('blocked')), tone: count('blocked') ? 'red' : 'green', sub: 'Sanctions match or anti-bribery flag' },
        { label: 'Held by screening', value: String(held.count), tone: held.blocked ? 'red' : 'ink', sub: held.count ? `On approved shortlists: ${[...new Set(held.rows.map((r) => r.name))].join(', ')}` : 'No shortlisted supplier is held' },
      ]} />
      <Card>
        <PanelHead title="Supplier master" sub={`${shown.length} of ${rows.length}. Select a row for its detail.`}>
          <span className="s2-search">
            <Search size={13} aria-hidden />
            <label className="sr-only" htmlFor="s2-sup-q">Search suppliers</label>
            <input id="s2-sup-q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, city, trade or client" />
          </span>
        </PanelHead>
        <div className="s2-filters s2-pad-x" role="group" aria-label="Screening filter">
          {chips.map((c) => (
            <button key={c.id} type="button" className={`s2-chip ${filter === c.id ? 'on' : ''}`} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.label} <span className="num">{c.n}</span>
            </button>
          ))}
        </div>
        {shown.length === 0
          ? <EmptyState title="No supplier matches." body="Clear the search or the filter." compact />
          : <S2Grid rows={shown} columns={COLS} selectedId={sel} onSelect={setSel} label="Supplier master" height={480} />}
      </Card>
      {selected && (
        <Card>
          <PanelHead title={selected.s.name} sub={`${selected.s.city}, ${selected.s.country}${selected.s.national ? ' · national product' : ''}`}>
            <StatusPill label={selected.sc.label} tone={TONE[selected.sc.state]} />
          </PanelHead>
          <div className="s2-two s2-pad">
            <ul className="s2-list">
              <li>Trades: {selected.trades}</li>
              <li>On the approved lists of: {selected.s.avl.length ? selected.s.avl.join('; ') : 'no client held'}</li>
              <li>ICV score: {selected.s.icv ?? 'none held'} · prequalification {selected.s.prequal}</li>
              <li>{selected.sc.reason ?? `Sanctions and anti-bribery screening current, last checked ${selected.sc.label.replace('Screened ', '')}.`}</li>
            </ul>
            <ul className="s2-list">
              <li>{selected.s.performance.onTimePct}% on time · {plural(selected.s.performance.ncrs12m, 'NCR')} in 12 months</li>
              <li>{selected.s.performance.quotes12m} quotes in 12 months, {selected.s.performance.awards12m} awarded</li>
              <li>Replies to {selected.s.response.ratePct}% of RFQs, in {selected.s.response.avgDays} days on average · load {selected.s.load}</li>
              {held.rows.filter((h) => h.supplierId === selected.id).map((h) => (
                <li key={`${h.tenderId}${h.pkgId}`} className="s2-sl-block">Held on the {h.pkgId} shortlist of {h.tenderId} ({registerRow(tenant, h.tenderId)?.shortTitle ?? ''}): {h.reason}</li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}
