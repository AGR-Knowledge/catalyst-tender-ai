import { useState } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { Copy, FileText } from 'lucide-react';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { stageLabel, stepLabel } from '@/data/gcc/stages';
import { initialsOf } from '@/data/people';
import { GATE_SLA_HOURS, NEAR_WD } from '@/data/gcc/targets';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { DEMO_TODAY, workingDaysBetween } from '@/domain/calendar';
import { addHours, agoText, DEMO_NOW } from '@/domain/gcc/clock';
import { useTenant, useTenantKey } from '@/domain/tenancy';
import { Money } from '@/components/tender/Money';
import { When, whenLabel } from '@/components/tender/When';
import { SlaClock } from '@/components/tender/SlaClock';
import { GateChip } from '@/components/tender/GateChip';
import { StatusPill, HEALTH_ORDER } from '@/components/tender/StatusPill';
import { usePop } from '@/components/tender/Tip';
import type { ColumnDef } from './types';

/**
 * The shared table columns (dashboards.md §5). Stage dashboards add their own
 * in `stages.cols.tsx` (plan 013). Cells render through the tender kit; value
 * getters give AG Grid raw, sortable values.
 */

type P = ICellRendererParams<TenderRowVM>;

/** Cells that hold their own control carry this, so a click on it doesn't also select the row. */
export const CELL_ACTION = 'data-cell-action';

const two = (main: string, sub?: string | null) => (
  <span className="cell-two">
    <span className="tk-main">{main}</span>
    {sub && <span className="tk-sub">{sub}</span>}
  </span>
);

function SourceCell({ row }: { row: TenderRowVM }) {
  const pop = usePop<HTMLButtonElement>({ width: 320, mode: 'click', label: `Source of ${row.id}` });
  const [copied, setCopied] = useState(false);
  const s = row.source;
  const [date, time] = s.capturedAt.split('T');
  const copy = () => {
    if (!s.url) return;
    navigator.clipboard?.writeText(s.url).then(() => setCopied(true), () => setCopied(false));
  };
  return (
    <>
      <button type="button" className="src-btn" {...{ [CELL_ACTION]: '' }} {...pop.menuProps} aria-label={`Source: ${s.name}, ${s.ref}. Show details`}>
        <span className="tk-main">{s.name}</span>
        <span className="tk-sub mono">{s.ref}</span>
      </button>
      {pop.render(
        <div className="src-pop">
          <b>{s.name}</b>
          <div className="kv"><span className="k">Reference</span><span className="v mono">{s.ref}</span></div>
          <div className="kv"><span className="k">Captured</span><span className="v">{whenLabel(date, time)}</span></div>
          {s.url && (
            <div className="src-url">
              <span className="k">Notice address (not a link)</span>
              <div className="row">
                <code className="mono">{s.url}</code>
                <button type="button" className="btn btn-sm" onClick={copy}><Copy size={12} aria-hidden />{copied ? 'Copied' : 'Copy'}</button>
              </div>
            </div>
          )}
          {s.documentHref && (
            <a className="btn btn-sm" href={s.documentHref} target="_blank" rel="noreferrer"><FileText size={12} aria-hidden />Open document</a>
          )}
        </div>,
        'src-popover',
      )}
    </>
  );
}

function DueCell({ row }: { row: TenderRowVM }) {
  const t = useTenant();
  if (!row.submission) return <span className="tk-sub">No deadline yet</span>;
  // Red when the working days left are under the tender's time to prepare (017 may set `facts.prepWd`), else the 5-day rule.
  const prep = typeof row.facts.prepWd === 'number' ? row.facts.prepWd : NEAR_WD;
  const left = workingDaysBetween(DEMO_TODAY, row.submission.date, t.countryCode);
  const tone = row.live && left < prep ? 'red' : undefined;
  return <When date={row.submission.date} time={row.submission.time} countdown={row.live} short tone={tone} />;
}

function FitCell({ row }: { row: TenderRowVM }) {
  const tenant = useTenantKey();
  if (row.fit === null) return <span className="tk-sub">Not scored</span>;
  const model = isGccTenantKey(tenant) ? gccData(tenant).fit : null;
  const tone = !model ? 'ink' : row.fit >= model.pursueAt ? 'green' : row.fit >= model.conditionsFrom ? 'orange' : 'muted';
  return (
    <span className="fit-cell" title={model ? `Pursue at ${model.pursueAt}, with conditions from ${model.conditionsFrom}` : undefined}>
      <span className={`num t-${tone}`}>{row.fit}</span>
      <span className="fit-bar" aria-hidden>
        <span className={`bg-${tone}`} style={{ width: `${Math.max(0, Math.min(100, row.fit))}%` }} />
        {model && <i style={{ left: `${model.pursueAt}%` }} />}
      </span>
    </span>
  );
}

/** Win is a share (0–1) with a band in points; shown from Stage 3, when the pack builds it. */
const winText = (w: TenderRowVM['win']) => (w ? `${Math.round(w.p <= 1 ? w.p * 100 : w.p)}% ± ${w.band}` : null);

const nullsLast = (v: string | null | undefined) => v ?? '9999';

export const COLUMNS: ColumnDef[] = [
  { id: 'tid', header: 'TID', build: () => ({
    headerName: 'TID', pinned: 'left', width: 112, cellClass: 'tk-mono', valueGetter: (p) => p.data?.id,
  }) },
  { id: 'tender', header: 'Tender', build: () => ({
    headerName: 'Tender', pinned: 'left', minWidth: 280, flex: 2,
    valueGetter: (p) => p.data?.shortTitle,
    cellRenderer: (p: P) => p.data && two(p.data.shortTitle, [p.data.issuer, p.data.city].filter(Boolean).join(' · ')),
  }) },
  { id: 'stage', header: 'Stage', build: () => ({
    headerName: 'Stage', width: 158,
    valueGetter: (p) => (p.data ? p.data.stage * 100 : null),
    cellRenderer: (p: P) => p.data && (
      <span className="cell-two">
        <span className="stage-chip">{stageLabel(p.data.stage)}</span>
        <span className="tk-sub">{stepLabel(p.data.stage, p.data.step)}</span>
      </span>
    ),
  }) },
  { id: 'owner', header: 'With', build: () => ({
    headerName: 'With', width: 190, valueGetter: (p) => p.data?.ownerName ?? '',
    cellRenderer: (p: P) => p.data && (p.data.ownerName ? (
      <span className="owner-cell" title={p.data.ownerRole ?? undefined}>
        <span className="avatar xs soft" aria-hidden>{initialsOf(p.data.ownerName)}</span>
        {two(p.data.ownerName, p.data.ownerRole)}
      </span>
    ) : <span className="tk-sub">Nobody yet</span>),
  }) },
  { id: 'team', header: 'Team', build: () => ({
    headerName: 'Team', width: 190, valueGetter: (p) => p.data?.teamName ?? '',
    cellRenderer: (p: P) => p.data && (p.data.teamName ?? <span className="tk-sub">No team yet</span>),
  }) },
  { id: 'value', header: 'Value', build: () => ({
    headerName: 'Value', width: 136, type: 'rightAligned', filter: 'agNumberColumnFilter',
    valueGetter: (p) => p.data?.value?.amount ?? null,
    cellRenderer: (p: P) => p.data && (p.data.value ? (
      <span className="value-cell">
        <Money value={p.data.value} />
        {p.data.valueBasis === 'estimate' && <span className="tk-sub">estimate</span>}
      </span>
    ) : <span className="tk-sub">Not stated</span>),
  }) },
  { id: 'due', header: 'Submission', build: () => ({
    headerName: 'Submission', width: 206, filter: 'agDateColumnFilter',
    valueGetter: (p) => (p.data?.submission ? `${p.data.submission.date}T${p.data.submission.time ?? '23:59'}` : null),
    comparator: (a: string | null, b: string | null) => nullsLast(a).localeCompare(nullsLast(b)),
    filterParams: {
      comparator: (filter: Date, cell: string | null) => {
        if (!cell) return -1;
        const f = `${filter.getFullYear()}-${String(filter.getMonth() + 1).padStart(2, '0')}-${String(filter.getDate()).padStart(2, '0')}`;
        const d = cell.slice(0, 10);
        return d === f ? 0 : d < f ? -1 : 1;
      },
    },
    cellRenderer: (p: P) => p.data && <DueCell row={p.data} />,
  }) },
  { id: 'nextGate', header: 'Next gate', build: () => ({
    headerName: 'Next gate', width: 200,
    valueGetter: (p) => p.data?.nextGate?.slaEnd ?? (p.data?.nextGate ? `~${p.data.nextGate.gate}` : null),
    comparator: (a: string | null, b: string | null) => nullsLast(a).localeCompare(nullsLast(b)),
    cellRenderer: (p: P) => {
      const g = p.data?.nextGate;
      if (!p.data) return null;
      if (!g) return <span className="tk-sub">{p.data.live ? 'No gate ahead' : 'Closed'}</span>;
      const breached = !!g.slaEnd && g.slaEnd < DEMO_NOW;
      return (
        <span className="gate-cell">
          <GateChip gate={g.gate} state={breached ? 'breached' : 'open'} />
          {g.slaEnd ? <SlaClock start={addHours(g.slaEnd, -GATE_SLA_HOURS[g.gate])} end={g.slaEnd} /> : <span className="tk-sub">{g.label}</span>}
        </span>
      );
    },
  }) },
  { id: 'health', header: 'Health', build: () => ({
    headerName: 'Health', width: 128, valueGetter: (p) => (p.data ? HEALTH_ORDER.indexOf(p.data.health) : null),
    cellRenderer: (p: P) => p.data && <StatusPill health={p.data.health} />,
  }) },
  { id: 'source', header: 'Source', build: () => ({
    headerName: 'Source', width: 200, valueGetter: (p) => p.data?.source.name ?? '',
    cellRenderer: (p: P) => p.data && <SourceCell row={p.data} />,
  }) },
  { id: 'captured', header: 'Captured', build: () => ({
    headerName: 'Captured', width: 150, valueGetter: (p) => p.data?.capturedAt ?? null,
    cellRenderer: (p: P) => p.data && <When date={p.data.capturedAt.slice(0, 10)} short />,
  }) },
  { id: 'country', header: 'Country', build: () => ({ headerName: 'Country', width: 140, valueGetter: (p) => p.data?.country ?? '' }) },
  { id: 'sector', header: 'Sector', build: () => ({ headerName: 'Sector', width: 180, valueGetter: (p) => p.data?.sector ?? '' }) },
  { id: 'fit', header: 'Fit', build: () => ({
    headerName: 'Fit', width: 130, type: 'rightAligned', filter: 'agNumberColumnFilter', valueGetter: (p) => p.data?.fit ?? null,
    cellRenderer: (p: P) => p.data && <FitCell row={p.data} />,
  }) },
  { id: 'win', header: 'Win', build: () => ({
    headerName: 'Win', width: 110, type: 'rightAligned', valueGetter: (p) => p.data?.win?.p ?? null,
    cellRenderer: (p: P) => p.data && (winText(p.data.win)
      ? <span className="num">{winText(p.data.win)}</span>
      : <span className="tk-sub" title="Win probability is estimated in Stage 3, when the Bid / No-Bid pack is built">From Stage 3</span>),
  }) },
  { id: 'lastActivity', header: 'Last activity', build: () => ({
    headerName: 'Last activity', width: 140, valueGetter: (p) => p.data?.lastActivityAt ?? null,
    cellRenderer: (p: P) => p.data && <span title={p.data.lastActivityAt.replace('T', ' ')}>{agoText(p.data.lastActivityAt)}</span>,
  }) },
];

