import { Link } from 'react-router-dom';
import type { ICellRendererParams } from 'ag-grid-community';
import type { Tone } from '@/data/types';
import { personById, roleLine } from '@/data/people';
import type { Request, RequestStatus } from '@/domain/gcc/requests';
import { When } from '@/components/tender/When';
import { StatusPill } from '@/components/tender/StatusPill';
import { CELL_ACTION } from './base.cols';
import type { AgColDef, ColumnDef } from './types';

/**
 * The My requests table (plan 013 Phase 5.5, dashboards.md §10.13): Tender ·
 * What's asked · For · Requested by · Due · Status. A row opens its tender
 * from the Tender cell until plan 009 builds the focused input forms. The
 * fixed widths leave What's asked the rest, and fit 1280 px without scrolling.
 */

type P = ICellRendererParams<Request>;

const STATUS: Record<RequestStatus, { label: string; tone: Tone; rank: number }> = {
  late: { label: 'Late', tone: 'red', rank: 0 },
  open: { label: 'Open', tone: 'orange', rank: 1 },
  submitted: { label: 'Submitted', tone: 'green', rank: 2 },
  accepted: { label: 'Accepted', tone: 'green', rank: 3 },
};

const col = (id: string, header: string, build: () => AgColDef<Request>): ColumnDef<Request> => ({ id, header, appliesTo: 'request', build });

export const COLUMNS: ColumnDef<Request>[] = [
  col('req.tender', 'Tender', () => ({
    headerName: 'Tender', pinned: 'left', width: 170,
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
  col('req.what', "What's asked", () => ({ headerName: "What's asked", minWidth: 200, flex: 1, valueGetter: (p) => p.data?.what ?? '' })),
  col('req.section', 'For', () => ({ headerName: 'For', width: 130, valueGetter: (p) => p.data?.section ?? '' })),
  col('req.by', 'Requested by', () => ({
    headerName: 'Requested by', width: 150,
    valueGetter: (p) => personById(p.data?.requestedById)?.name ?? '',
    cellRenderer: (p: P) => {
      const who = personById(p.data?.requestedById);
      return who ? <span className="cell-two"><span className="tk-main">{who.name}</span><span className="tk-sub">{roleLine(who)}</span></span> : <span className="tk-sub">Not recorded</span>;
    },
  })),
  col('req.due', 'Due', () => ({
    headerName: 'Due', width: 178, valueGetter: (p) => p.data?.due ?? null,
    cellRenderer: (p: P) => p.data && <When date={p.data.due.slice(0, 10)} time={p.data.due.slice(11, 16) || undefined} short tone={p.data.status === 'late' ? 'red' : undefined} />,
  })),
  col('req.status', 'Status', () => ({
    headerName: 'Status', width: 108, valueGetter: (p) => (p.data ? STATUS[p.data.status].rank : null),
    cellRenderer: (p: P) => p.data && <StatusPill label={STATUS[p.data.status].label} tone={STATUS[p.data.status].tone} />,
  })),
];
