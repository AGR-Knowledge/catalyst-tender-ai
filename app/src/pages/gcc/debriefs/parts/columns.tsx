import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ColDef, CsvExportParams, ICellRendererParams } from 'ag-grid-community';
import { holdersOf } from '@/data/access';
import { personById } from '@/data/people';
import { BID_AGAIN, DEBRIEF_STATUSES, LESSON_AREAS, labelOf, type ArchiveRow } from '@/domain/gcc/debriefs';
import { StatusPill } from '@/components/tender/StatusPill';
import { When } from '@/components/tender/When';
import { Masked } from '@/components/tender/Masked';

/**
 * "Every debrief" (plan 037): one list of columns for the grid and the CSV, so
 * the file holds exactly what the table shows, as text. Each column says how
 * it sorts (`sort`), how it reads in the file (`text`) and, where a cell is
 * more than its words, how it draws (`render`). The file adds one column the
 * table leaves out, "Lessons (text)". Rows arrive masked for the viewer
 * (`archiveFor`); a value masked there reads "Masked" in the file.
 */

/** The file's word for a value the viewer may not read. */
export const CSV_MASKED = 'Masked';
/** The one column only the file has. */
export const CSV_LESSONS = { id: 'lessonsText', header: 'Lessons (text)' } as const;

/** A value `archiveFor` withheld from this viewer. */
const isMasked = (v: unknown): boolean => v === 'masked';
const nameOf = (id: string | undefined) => personById(id)?.name ?? '';
const day = (iso: string | undefined) => (iso ? iso.slice(0, 10) : '');
const placeText = (p: ArchiveRow['place']) => (p ? `${p[0]} of ${p[1]}` : '');
const statusLabel = (r: ArchiveRow) => labelOf(DEBRIEF_STATUSES, r.status);

interface DebriefCol {
  id: string;
  header: string;
  /** The words in the file, and in a cell drawn as plain text. */
  text(r: ArchiveRow): string;
  /** What the column sorts by, when not its words. */
  sort?(r: ArchiveRow): string | number;
  render?(r: ArchiveRow): ReactNode;
  width?: number;
  flex?: number;
  minWidth?: number;
  pinned?: 'left';
  defaultSort?: 'desc';
}

const masked = (v: unknown, text: string) => (isMasked(v) ? CSV_MASKED : text);
const sub = (text: string) => <span className="tk-sub">{text}</span>;
const MASK = () => <Masked by={holdersOf('debrief.view')} />;

export const DEBRIEF_COLUMNS: DebriefCol[] = [
  {
    id: 'tender', header: 'Tender', flex: 1.6, minWidth: 250, pinned: 'left',
    text: (r) => `${r.tenderId} · ${r.title}`, sort: (r) => r.title,
    render: (r) => (
      <span className="s1-two">
        <Link className="s1-main co-rt-link" to={`/tenders/${encodeURIComponent(r.tenderId)}?tab=debrief`} title={r.title}>{r.title}</Link>
        <span className="s1-sub mono">{r.tenderId}</span>
      </span>
    ),
  },
  { id: 'employer', header: 'Employer', flex: 1.1, minWidth: 190, text: (r) => r.employer, render: (r) => <span className="co-clip" title={r.employer}>{r.employer}</span> },
  { id: 'sector', header: 'Sector', width: 170, text: (r) => r.sector, render: (r) => <span className="co-clip" title={r.sector}>{r.sector}</span> },
  { id: 'ending', header: 'Ending', width: 190, text: (r) => r.endingLabel },
  {
    id: 'ended', header: 'Ended', width: 130, defaultSort: 'desc', text: (r) => day(r.endedAt), sort: (r) => r.endedAt,
    render: (r) => <When date={day(r.endedAt)} short />,
  },
  {
    id: 'main', header: 'Main reason', flex: 1.2, minWidth: 200, text: (r) => masked(r.mainLabel, r.mainLabel),
    render: (r) => (isMasked(r.mainLabel) ? <MASK /> : r.mainLabel ? <span className="co-clip" title={r.mainLabel}>{r.mainLabel}</span> : sub('Not recorded yet')),
  },
  {
    id: 'factors', header: 'What else', flex: 1.2, minWidth: 200, text: (r) => masked(r.factorLabels, r.factorLabels.join(', ')),
    render: (r) => (isMasked(r.factorLabels) ? <MASK /> : r.factorLabels.length ? <span className="co-clip" title={r.factorLabels.join(', ')}>{r.factorLabels.join(', ')}</span> : sub('Not recorded yet')),
  },
  {
    id: 'rival', header: 'Winner / closest rival', width: 190, text: (r) => masked(r.rival, r.rival ?? ''),
    render: (r) => (isMasked(r.rival) ? <MASK /> : r.rival ? <span className="co-clip" title={r.rival}>{r.rival}</span> : null),
  },
  {
    id: 'place', header: 'Our place', width: 110, text: (r) => masked(r.place, placeText(r.place)), sort: (r) => r.place?.[0] ?? 99,
    render: (r) => (isMasked(r.place) ? <MASK /> : r.place ? <span className="num">{placeText(r.place)}</span> : null),
  },
  {
    id: 'lessons', header: 'Lessons', width: 100, text: (r) => masked(r.lessons, String(r.lessons.length)), sort: (r) => r.lessons.length,
    render: (r) => (isMasked(r.lessons) ? <MASK /> : <span className="num" title={r.lessons[0]?.text}>{r.lessons.length}</span>),
  },
  { id: 'bidAgain', header: 'Bid again', width: 170, text: (r) => masked(r.bidAgain, r.bidAgain ? labelOf(BID_AGAIN, r.bidAgain) : '') },
  {
    id: 'status', header: 'Status', width: 140, text: statusLabel,
    render: (r) => <span title={r.statusText}><StatusPill label={statusLabel(r)} tone={r.statusTone} /></span>,
  },
  {
    id: 'recorded', header: 'Recorded by', width: 180, text: (r) => nameOf(r.recordedById), sort: (r) => r.submittedAt ?? '',
    render: (r) => (r.recordedById ? (
      <span className="s1-two"><span className="co-clip">{nameOf(r.recordedById)}</span>{r.submittedAt && <span className="s1-sub"><When date={day(r.submittedAt)} short /></span>}</span>
    ) : null),
  },
  {
    id: 'accepted', header: 'Accepted', width: 180, text: (r) => day(r.acceptedAt), sort: (r) => r.acceptedAt ?? '',
    render: (r) => (r.acceptedAt ? (
      <span className="s1-two"><When date={day(r.acceptedAt)} short />{r.acceptedById && <span className="s1-sub co-clip">{nameOf(r.acceptedById)}</span>}</span>
    ) : null),
  },
];

/** "Pricing: text | Sourcing and suppliers: text". */
export const lessonsText = (r: ArchiveRow) => (isMasked(r.lessons) ? CSV_MASKED : r.lessons.map((x) => `${labelOf(LESSON_AREAS, x.area)}: ${x.text}`).join(' | '));

/** The grid's columns, and the hidden one the file adds. */
export function gridColumnsOf(): ColDef<ArchiveRow>[] {
  const cols: ColDef<ArchiveRow>[] = DEBRIEF_COLUMNS.map((c) => ({
    colId: c.id, headerName: c.header,
    ...(c.width ? { width: c.width } : {}), ...(c.flex ? { flex: c.flex } : {}), ...(c.minWidth ? { minWidth: c.minWidth } : {}),
    ...(c.pinned ? { pinned: c.pinned } : {}), ...(c.defaultSort ? { sort: c.defaultSort } : {}),
    valueGetter: (p) => (p.data ? (c.sort ?? c.text)(p.data) : ''),
    ...(c.render ? { cellRenderer: (p: ICellRendererParams<ArchiveRow>) => (p.data ? c.render!(p.data) : null) } : {}),
  }));
  return [...cols, { colId: CSV_LESSONS.id, headerName: CSV_LESSONS.header, hide: true, valueGetter: (p) => (p.data ? lessonsText(p.data) : '') }];
}

const TEXT = new Map(DEBRIEF_COLUMNS.map((c) => [c.id, c.text]));

/** The file: the columns as the table shows them, in order, then "Lessons (text)"; words only; dates `YYYY-MM-DD`. */
export function csvParamsOf(tenant: string, period: string): CsvExportParams & { columnKeys: string[] } {
  return {
    fileName: `debriefs-${tenant}-${period}.csv`,
    columnKeys: [...DEBRIEF_COLUMNS.map((c) => c.id), CSV_LESSONS.id],
    processCellCallback: (p) => {
      const r = p.node?.data as ArchiveRow | undefined;
      if (!r) return '';
      const id = p.column.getColId();
      return id === CSV_LESSONS.id ? lessonsText(r) : TEXT.get(id)?.(r) ?? '';
    },
  };
}

/** The file's header row, in order (dev check 81). */
export const csvHeadersOf = () => [...DEBRIEF_COLUMNS.map((c) => c.header), CSV_LESSONS.header];
