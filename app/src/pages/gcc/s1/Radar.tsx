import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ExternalLink, Lock } from 'lucide-react';
import type { Tone } from '@/data/types';
import { can } from '@/data/access';
import type { IntakeDisposition } from '@/data/gcc/types';
import { radarFor, pipelineFor, type Capture, type Connector } from '@/domain/gcc/s1';
import { dataOf, shortDate, shortWhen } from '@/domain/gcc/s1/common';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { LangBadge } from '@/components/tender/LangBadge';
import { Sheet } from '@/components/tender/Sheet';
import { EmptyState } from '@/components/tender/EmptyState';
import { Callout } from '@/components/tender/Callout';
import { useS1 } from './vm/useS1';
import { kpiCtxOf, tilesOf, valueTile } from './vm/tiles';
import { Strip } from './parts/Strip';
import { S1Grid } from './parts/Grid';
import { FilterBar, optionsOf } from './parts/FilterBar';
import { FitNum, PairMoney } from './parts/cells';
import { IntakeSteps } from './IntakeSteps';
import { UploadGcc } from './UploadGcc';
import '@/components/dashboard/dashboard.css';
import './s1.css';

/**
 * `/radar` (spec §6.1, catalogue §C.1): what the Tender Coordinator reads first
 * thing. Did anything come in (today's captures), is anything broken (the
 * connectors), did we miss anything (the reconciliation)? Restricted tenders
 * are a count only for people not cleared; their rows are not sent to them.
 */

const HERE = '/radar';

export const DISPOSITION_TONE: Record<IntakeDisposition, Tone> = {
  shortlisted: 'green', 'low-fit': 'grey', duplicate: 'cyan', addendum: 'cyan', restricted: 'orange', 'needs-validation': 'orange', 'notice-only': 'orange',
};
const STATE_TONE: Record<Connector['state'], Tone> = { healthy: 'green', degraded: 'orange', 'credentials-expiring': 'orange', down: 'red' };
const STATE_ICON: Record<Connector['state'], string> = { healthy: '✓', degraded: '!', 'credentials-expiring': '!', down: '×' };

type CaptureRow = Capture & { id: string };
type ConnectorRow = Connector & { id: string };

export default function Radar() {
  const s1 = useS1();
  const { tenant, viewer, done, viewAs } = s1;
  const navigate = useNavigate();
  const cleared = can(viewer, 'see.restricted').ok && !!viewer.cleared;
  const radar = useMemo(() => radarFor(tenant, cleared, done, viewer), [tenant, cleared, done, viewer]);
  // The lane's size, never its titles: counted over every capture, whoever is looking (INT-9).
  const laneCount = useMemo(() => radarFor(tenant, false, done).restrictedCount, [tenant, done]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const all: CaptureRow[] = useMemo(() => radar.captures.map((c) => ({ ...c, id: c.eventId })), [radar]);
  const rows = useMemo(() => all.filter((c) => {
    const s = search.trim().toLowerCase();
    if (s && ![c.ref, c.title, c.authority, c.tenderId ?? ''].some((x) => x.toLowerCase().includes(s))) return false;
    return (!filters.source || c.sourceName === filters.source) && (!filters.country || c.country === filters.country)
      && (!filters.language || c.language === filters.language) && (!filters.type || c.docType === filters.type)
      && (!filters.disposition || c.disposition === filters.disposition);
  }), [all, filters, search]);

  const ctx = kpiCtxOf({ tenant, viewer, viewAs, done }, 'today', 'radar');
  const linked = all.filter((c) => c.disposition === 'addendum' || c.disposition === 'duplicate');
  const addenda = linked.filter((c) => c.disposition === 'addendum').length;
  const tiles = [
    ...tilesOf(['INT-1', 'INT-4', 'INT-3'], ctx, HERE),
    valueTile('INT-9', 'Restricted lane', String(laneCount), {
      kind: 'state', means: 'Tenders routed to the restricted lane. Their titles and documents are shown only to cleared people',
      counted: 'Captures today marked restricted at the sensitivity check. When unsure, the agent routes to the lane.', target: 'None (information)', source: 'Sensitivity flags',
    }, ctx, { sub: laneCount ? (cleared ? 'Shown in the list, badged' : 'Titles hidden: cleared people only') : 'None today', tone: laneCount ? 'ink' : 'muted' }),
    valueTile('INT-8', 'Linked, not duplicated', String(linked.length), {
      kind: 'flow', means: 'Documents that belong to a tender already on the register: an addendum linked to its parent, or the same tender from a second source',
      counted: 'Addenda linked and duplicates merged today, from the register check.', target: 'None (information)', source: 'Register checks',
    }, ctx, { sub: `${addenda} addend${addenda === 1 ? 'um' : 'a'} linked · ${linked.length - addenda} duplicate${linked.length - addenda === 1 ? '' : 's'} merged` }),
  ];

  const facets = [
    { key: 'source', label: 'Source', options: optionsOf(all, (c) => c.sourceName) },
    { key: 'country', label: 'Country', options: optionsOf(all, (c) => c.country) },
    { key: 'language', label: 'Language', options: optionsOf(all, (c) => c.language) },
    { key: 'type', label: 'Type', options: optionsOf(all, (c) => c.docType) },
    { key: 'disposition', label: 'Disposition', options: optionsOf(all, (c) => c.disposition, (v) => all.find((c) => c.disposition === v)?.dispositionLabel.replace(/ T-\S+$/, ' …') ?? v) },
  ];

  const columns = useMemo<ColDef<CaptureRow>[]>(() => [
    { field: 'time', headerName: 'Time', width: 66, cellClass: 's1-cell num' },
    { field: 'sourceName', headerName: 'Source', width: 118 },
    {
      colId: 'tender', headerName: 'Tender', flex: 1, minWidth: 230, valueGetter: (p) => p.data?.title,
      cellRenderer: (p: ICellRendererParams<CaptureRow>) => p.data && (
        <span className="s1-two">
          <span className="s1-main">{p.data.restricted && <Lock size={11} aria-label="Restricted lane" />} {p.data.title}</span>
          <span className="s1-sub"><span className="mono">{p.data.ref}</span>{p.data.authority ? ` · ${p.data.authority}` : ''}</span>
        </span>
      ),
    },
    { field: 'country', headerName: 'Country', width: 104 },
    { colId: 'value', headerName: 'Value', width: 122, sortable: false, cellRenderer: (p: ICellRendererParams<CaptureRow>) => p.data && <PairMoney v={p.data.value} basis={p.data.valueBasis} /> },
    { field: 'due', headerName: 'Due', width: 96, cellRenderer: (p: ICellRendererParams<CaptureRow>) => (p.data?.due ? <span className="num">{shortDate(p.data.due)}</span> : <span className="tk-sub">–</span>) },
    { field: 'language', headerName: 'Lang.', width: 64, cellRenderer: (p: ICellRendererParams<CaptureRow>) => p.data && <LangBadge lang={p.data.language} /> },
    { field: 'docType', headerName: 'Type', width: 92 },
    { field: 'fit', headerName: 'Fit', width: 58, cellRenderer: (p: ICellRendererParams<CaptureRow>) => p.data && <FitNum tenant={tenant} fit={p.data.fit} /> },
    {
      field: 'dispositionLabel', headerName: 'Disposition', width: 236, pinned: 'right',
      cellRenderer: (p: ICellRendererParams<CaptureRow>) => p.data && <StatusPill label={p.data.dispositionLabel} tone={DISPOSITION_TONE[p.data.disposition]} />,
    },
  ], [tenant]);

  const connectors: ConnectorRow[] = radar.connectors.map((c) => ({ ...c, id: c.id }));
  const connectorCols: ColDef<ConnectorRow>[] = [
    {
      field: 'name', headerName: 'Source', flex: 1, minWidth: 170,
      cellRenderer: (p: ICellRendererParams<ConnectorRow>) => p.data && (
        <span className="s1-two"><span className="s1-main">{p.data.name}</span>{p.data.note && <span className="s1-sub">{p.data.note}</span>}</span>
      ),
    },
    { field: 'stateLabel', headerName: 'Status', width: 166, cellRenderer: (p: ICellRendererParams<ConnectorRow>) => p.data && <StatusPill label={p.data.stateLabel} tone={STATE_TONE[p.data.state]} icon={STATE_ICON[p.data.state]} /> },
    {
      field: 'modeLabel', headerName: 'Mode', width: 104,
      cellRenderer: (p: ICellRendererParams<ConnectorRow>) => p.data && (p.data.assistedText ? <span title={p.data.assistedText}>{p.data.modeLabel}<span aria-hidden>*</span></span> : p.data.modeLabel),
    },
    { field: 'lastPoll', headerName: 'Last poll', width: 90, cellRenderer: (p: ICellRendererParams<ConnectorRow>) => p.data && <span className="num">{p.data.lastPoll.length > 10 ? p.data.lastPoll.slice(11, 16) : p.data.lastPoll}</span> },
    { field: 'newToday', headerName: 'New', width: 66, cellClass: 's1-cell num' },
    { field: 'loginNeeded', headerName: 'Login', width: 80, cellRenderer: (p: ICellRendererParams<ConnectorRow>) => (p.data?.loginNeeded ? 'Needed' : <span className="tk-sub">No</span>) },
  ];
  const assisted = radar.connectors.find((c) => c.assistedText);

  const items = rows.map((c) => ({ id: c.eventId, title: c.title }));
  const register = dataOf(tenant).register;

  const renderCapture = (eventId: string) => {
    const c = all.find((x) => x.eventId === eventId);
    if (!c) return null;
    const p = pipelineFor(tenant, eventId);
    const t = c.tenderId ? register.find((x) => x.id === c.tenderId) : undefined;
    const opens = !!c.tenderId && s1.canOpen(c.tenderId);
    return (
      <div className="s1-sheet">
        <div className="s1-sheet-top">
          <StatusPill label={c.dispositionLabel} tone={DISPOSITION_TONE[c.disposition]} />
          {opens && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate(`/tenders/${c.tenderId}?tab=documents`)}>
              <ExternalLink size={12} aria-hidden />Open {c.tenderId}
            </button>
          )}
        </div>
        <div className="s1-kv">
          <KV k="Reference" v={<span className="mono">{c.ref}</span>} />
          <KV k="Authority" v={c.authority || 'Not stated'} />
          <KV k="Received" v={`${p?.steps[0]?.at ? shortWhen(p.steps[0].at) : c.time} from ${c.sourceName}`} />
          <KV k="Value" v={<PairMoney v={c.value} basis={c.valueBasis} />} />
          <KV k="Submission" v={c.due ? shortDate(c.due) : 'Not stated'} />
          <KV k="Fit for this company" v={<FitNum tenant={tenant} fit={c.fit} />} />
        </div>
        <h3 className="s1-h3">Intake steps</h3>
        {p ? <IntakeSteps pipeline={p} tender={t} /> : <EmptyState title="No intake record for this capture." compact />}
      </div>
    );
  };

  return (
    <div className="view s1">
      <Strip tiles={tiles} />

      <Card>
        <CardHead title="Today's captures" meta={<UploadGcc variant="button" />} />
        <FilterBar facets={facets} values={filters} onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))} search={search} onSearch={setSearch} shown={rows.length} total={all.length} noun="captures" placeholder="Reference, title or authority" />
        {rows.length
          ? <S1Grid rows={rows} columns={columns} onOpen={(id) => setOpen(rows.findIndex((r) => r.eventId === id))} label="Today's captures" rowClassRules={{ 's1-row-muted': (p) => p.data?.disposition === 'low-fit' }} />
          : <EmptyState title={all.length ? 'No captures match these filters.' : 'Nothing captured yet today.'} body={all.length ? undefined : 'Captures appear here as the sources are polled.'} compact />}
      </Card>

      <div className="s1-cols">
        <Card>
          <CardHead title="Sources" meta={<span className="num">{radar.healthText}</span>} />
          <S1Grid rows={connectors} columns={connectorCols} label="Sources and their health" />
          {assisted && <p className="s1-foot"><span aria-hidden>* </span>{assisted.assistedText}</p>}
        </Card>
        <div className="s1-stack">
          <Card>
            <CardHead title="Reconciliation" />
            <div className="s1-pad">
              <Callout variant="verdict" word="Checked" title={radar.reconciliation} compact>
                Each portal's daily listing is compared with the register, so a notice that did not arrive is found the same morning.
              </Callout>
            </div>
          </Card>
          <Card>
            <CardHead title="Restricted lane" meta={<span className="num">{laneCount}</span>} />
            <div className="s1-pad">
              {laneCount === 0 ? <p className="s1-muted">No restricted tenders today.</p>
                : cleared ? <p className="s1-muted">{laneCount === 1 ? 'One tender is' : `${laneCount} tenders are`} in the restricted lane today. You are cleared: {laneCount === 1 ? 'it is' : 'they are'} in the list above with a lock.</p>
                : <p className="s1-muted"><Lock size={12} aria-hidden /> {laneCount === 1 ? 'One tender is' : `${laneCount} tenders are`} in the restricted lane today. Titles and documents are shown to cleared people only.</p>}
            </div>
          </Card>
        </div>
      </div>

      <Sheet items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} render={renderCapture} eyebrow="Capture" />
    </div>
  );
}
