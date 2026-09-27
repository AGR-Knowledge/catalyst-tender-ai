import { Link } from 'react-router-dom';
import type { ICellRendererParams } from 'ag-grid-community';
import type { Tone } from '@/data/types';
import { personById, roleLine } from '@/data/people';
import type { Request, RequestStatus } from '@/domain/gcc/requests';
import { useTenant } from '@/domain/tenancy';
import { When } from '@/components/tender/When';
import { StatusPill } from '@/components/tender/StatusPill';
import { CELL_ACTION } from './base.cols';
import type { AgColDef, ColumnDef } from './types';

/**
 * The My requests table (plan 013 Phase 5.5, dashboards.md §10.13): Tender ·
 * What's asked · For · Requested by · Due · Status. A row click or Enter
 * opens what the request asks for (its form, credential or gate, the same
 * place as its action); the Tender cell's link opens the tender. The table
 * sits at two thirds of the width: the fixed widths fit it at 1440 px, with
 * What's asked, For and Due on two lines; at 1280 px Status stays pinned on
 * the right and the middle scrolls.
 */

type P = ICellRendererParams<Request>;

const STATUS: Record<RequestStatus, { label: string; tone: Tone; rank: number }> = {
  late: { label: 'Late', tone: 'red', rank: 0 },
  open: { label: 'Open', tone: 'orange', rank: 1 },
  submitted: { label: 'Submitted', tone: 'green', rank: 2 },
  accepted: { label: 'Accepted', tone: 'green', rank: 3 },
};

/** Up to two lines, with the whole text on hover. */
const clamp = (p: ICellRendererParams<Request, string>) => (p.value ? <span className="cell-clamp" title={p.value}>{p.value}</span> : null);

/** The due date over its time, in the tenant's time zone. */
function DueCell({ data: r }: P) {
  const { tzLabel } = useTenant();
  if (!r) return null;
  const time = r.due.slice(11, 16);
  return (
    <span className="cell-two">
      <When date={r.due.slice(0, 10)} short tone={r.status === 'late' ? 'red' : undefined} />
      {time && <span className="tk-sub num">{time} {tzLabel}</span>}
    </span>
  );
}

const col = (id: string, header: string, build: () => AgColDef<Request>): ColumnDef<Request> => ({ id, header, appliesTo: 'request', build });

export const COLUMNS: ColumnDef<Request>[] = [
  col('req.tender', 'Tender', () => ({
    headerName: 'Tender', pinned: 'left', width: 140,
    valueGetter: (p) => p.data?.tenderId ?? '',
    cellRenderer: (p: P) => {
      const r = p.data;
      if (!r) return null;
      if (!r.tenderId) return <span className="cell-two"><span className="tk-main">Company</span><span className="tk-sub">Not tied to one tender</span></span>;
      return (
        <span className="cell-two">
          <Link className="tk-main" to={`/tenders/${encodeURIComponent(r.tenderId)}`} {...{ [CELL_ACTION]: '' }} title="Open tender">
            <span className="tk-mono">{r.tenderId}</span>
          </Link>
          {r.shortTitle && <span className="tk-sub">{r.shortTitle}</span>}
        </span>
      );
    },
  })),
  col('req.what', "What's asked", () => ({ headerName: "What's asked", minWidth: 150, flex: 1, valueGetter: (p) => p.data?.what ?? '', cellRenderer: clamp })),
  col('req.section', 'For', () => ({ headerName: 'For', width: 104, valueGetter: (p) => p.data?.section ?? '', cellRenderer: clamp })),
  col('req.by', 'Requested by', () => ({
    headerName: 'Requested by', width: 136,
    valueGetter: (p) => personById(p.data?.requestedById)?.name ?? '',
    cellRenderer: (p: P) => {
      const who = personById(p.data?.requestedById);
      return who ? <span className="cell-two"><span className="tk-main">{who.name}</span><span className="tk-sub">{roleLine(who)}</span></span> : <span className="tk-sub">Not recorded</span>;
    },
  })),
  col('req.due', 'Due', () => ({
    headerName: 'Due', width: 104, valueGetter: (p) => p.data?.due ?? null,
    cellRenderer: DueCell,
  })),
  col('req.status', 'Status', () => ({
    headerName: 'Status', width: 92, pinned: 'right', valueGetter: (p) => (p.data ? STATUS[p.data.status].rank : null),
    cellRenderer: (p: P) => p.data && <StatusPill label={STATUS[p.data.status].label} tone={STATUS[p.data.status].tone} />,
  })),
];
