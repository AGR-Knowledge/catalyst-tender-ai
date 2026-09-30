import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import {
  ChevronRight, File, FileCheck2, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, Mail, Plus, Search, ScrollText,
} from 'lucide-react';
import { registerGrid } from '@/components/dashboard/grid/agGrid';
import { gridTheme } from '@/components/dashboard/grid/gridTheme';
import { FileViewer, byOf, csvText } from '@/components/tender/FileViewer';
import { LangBadge } from '@/components/tender/LangBadge';
import { Masked } from '@/components/tender/Masked';
import { EmptyState } from '@/components/tender/EmptyState';
import { dateText, DEMO_TODAY } from '@/domain/calendar';
import { csvItemRows, flatFolders, type LibraryFileVM, type LibraryFolderVM, type LibraryVM } from '@/domain/gcc/library';
import { AddFileModal } from './AddFileModal';
import './library.css';

registerGrid();

/**
 * One tender's library (plan 030 Phase 3), shared by the workspace's Library
 * tab and the company-wide Tender library page: a toolbar (search in this
 * tender's files, the counts, Add file), the folder tree with counts, and the
 * open folder's files, one row anatomy for every file. A row, its View button,
 * or Enter on a focused row opens the file viewer on the right; Previous and
 * Next step through the list on screen. The open folder is in the URL
 * (`?folder=`), so a link lands on it. Under 1100 px the tree gives way to the
 * breadcrumb and the folder rows.
 */

const ROW_H = 64;
const DEMO_YEAR = DEMO_TODAY.slice(0, 4);

/** "Sun 8 Mar 07:33", with the year outside the demo year. */
export function whenCell(iso: string | null): string {
  if (!iso) return '';
  const d = dateText(iso.slice(0, 10));
  const day = iso.startsWith(DEMO_YEAR) ? d.replace(/ \d{4}$/, '') : d;
  return iso.length > 10 ? `${day} ${iso.slice(11, 16)}` : day;
}

const ICON = { PDF: FileText, CSV: FileSpreadsheet, Letter: ScrollText, Email: Mail, Form: FileText, Record: FileCheck2, Image: FileImage, File } as const;

/** Rows in a BOQ CSV, read once when its row is on screen. */
function CsvRows({ src }: { src: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => { let live = true; csvText(src).then((t) => { if (live) setN(csvItemRows(t)); }, () => {}); return () => { live = false; }; }, [src]);
  return n === null ? null : <>{n} rows</>;
}

function extentOf(f: LibraryFileVM): ReactNode {
  if (f.extent) return `${f.extent.n} ${f.extent.unit}${f.extent.n === 1 ? '' : 's'}`;
  return f.view.kind === 'csv' ? <CsvRows src={f.view.src} /> : null;
}

/** The first line: icon and name. The second: what it is, and its tags. */
function NameCell({ f }: { f: LibraryFileVM }) {
  const Icon = ICON[f.type] ?? File;
  return (
    <div className="lib-name">
      <Icon size={16} aria-hidden className="lib-ic" />
      <div className="lib-name-m">
        <bdi dir="auto" className="lib-fn">{f.name}</bdi>
        <span className="lib-tags">
          <span className="fv-tag">{f.type}</span>
          {f.lang && <LangBadge lang={f.lang} />}
          {f.scanned && <span className="fv-tag">{f.ocrText ? `Scanned (OCR ${f.ocrText})` : 'Scanned (OCR)'}</span>}
          <span className="lib-ext num">{extentOf(f)}</span>
          {f.tags.map((t) => <span key={t} className="fv-tag fv-tag-plain">{t}</span>)}
          {f.masked && <span className="lib-mk">{f.masked.label ?? 'Figures masked'}</span>}
        </span>
      </div>
    </div>
  );
}

/** The file list. The Tender library page's search reuses it, with the tender in the folder column. */
export function FileGrid({ rows, withFolder, folderHead = 'Folder', onOpen, rowExtra, label, fill }: {
  rows: LibraryFileVM[];
  withFolder: boolean;
  folderHead?: string;
  onOpen(i: number): void;
  rowExtra?(f: LibraryFileVM): ReactNode;
  label: string;
  fill?: boolean;
}) {
  const open = useRef(onOpen);
  open.current = onOpen;
  const index = useMemo(() => new Map(rows.map((r, i) => [r.id, i])), [rows]);
  const columns = useMemo<ColDef<LibraryFileVM>[]>(() => [
    // Name, then what it is: type, language, OCR, pages or rows, and its tags.
    { headerName: 'Name', colId: 'name', flex: 2.4, minWidth: 190, valueGetter: (p) => p.data?.name, cellRenderer: (p: ICellRendererParams<LibraryFileVM>) => (p.data ? <NameCell f={p.data} /> : null) },
    ...(withFolder ? [{ headerName: folderHead, colId: 'folder', flex: 1.1, minWidth: 120, valueGetter: (p: { data?: LibraryFileVM }) => p.data?.path.join(' › '), cellClass: 'lib-wrap' } as ColDef<LibraryFileVM>] : []),
    // Where it came from, and who sent or made it.
    {
      headerName: 'Source', colId: 'source', flex: 1.3, minWidth: 130, valueGetter: (p) => p.data?.source.label,
      cellRenderer: (p: ICellRendererParams<LibraryFileVM>) => (p.data ? <span className="lib-two"><span className="lib-src">{p.data.source.label}</span>{byOf(p.data) && <span className="lib-sub">By {byOf(p.data)}</span>}</span> : null),
    },
    {
      // Date: received, sent or made, as the viewer's header says (plan 033).
      headerName: 'Date', colId: 'at', flex: 0.8, minWidth: 120, valueGetter: (p) => p.data?.receivedAt ?? '',
      cellRenderer: (p: ICellRendererParams<LibraryFileVM>) => {
        const w = p.data?.receivedAt ? whenCell(p.data.receivedAt) : '';
        const m = w.match(/^(.*) (\d{2}:\d{2})$/);
        return <span className="lib-two num"><span>{m ? m[1] : w}</span>{m && <span className="lib-sub">{m[2]}</span>}</span>;
      },
    },
    {
      headerName: '', colId: 'view', width: rowExtra ? 222 : 76, minWidth: rowExtra ? 222 : 76, sortable: false, resizable: false, pinned: 'right',
      cellRenderer: (p: ICellRendererParams<LibraryFileVM>) => {
        const f = p.data;
        if (!f) return null;
        return (
          <span className="lib-acts">
            {rowExtra?.(f)}
            <button type="button" className="btn btn-sm" data-file-row={f.id} aria-label={`View ${f.name}`}
              onClick={(e) => { e.stopPropagation(); open.current(index.get(f.id) ?? 0); }}>View</button>
          </span>
        );
      },
    },
  ], [withFolder, folderHead, rowExtra, index]);

  const style = useMemo<CSSProperties>(() => (fill ? { height: '100%' } : { height: 44 + Math.min(rows.length, 9) * ROW_H + (rows.length > 9 ? ROW_H / 2 : 0) }), [fill, rows.length]);
  const getRowId = useCallback((p: GetRowIdParams<LibraryFileVM>) => p.data.id, []);
  const onRowClicked = (e: RowClickedEvent<LibraryFileVM>) => {
    // A button inside the row (View, Read in English) acts on its own.
    if ((e.event?.target as HTMLElement | null)?.closest('button, a')) return;
    if (e.data) open.current(index.get(e.data.id) ?? 0);
  };
  const onCellKeyDown = (e: CellKeyDownEvent<LibraryFileVM>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || (ev.target as HTMLElement | null)?.closest('button, a')) return;
    ev.preventDefault();
    open.current(index.get(e.data.id) ?? 0);
  };

  return (
    <div className={`lib-grid ${fill ? 'fill' : ''}`} role="region" aria-label={label}>
      <AgGridReact<LibraryFileVM>
        theme={gridTheme} containerStyle={style} rowData={rows} columnDefs={columns} getRowId={getRowId}
        defaultColDef={{ sortable: true, resizable: true, suppressMovable: true }}
        onRowClicked={onRowClicked} onCellKeyDown={onCellKeyDown}
        rowHeight={ROW_H} headerHeight={40} animateRows={false} suppressNoRowsOverlay suppressColumnVirtualisation
        rowClass="lib-row"
      />
    </div>
  );
}

function TreeItem({ f, selected, openIds, onSelect, depth }: { f: LibraryFolderVM; selected: string; openIds: Set<string>; onSelect(id: string, toggle: boolean): void; depth: number }) {
  const hasKids = f.folders.length > 0;
  const isOpen = openIds.has(f.id);
  const isSel = selected === f.id;
  const Icon = isOpen && hasKids ? FolderOpen : Folder;
  return (
    <li>
      <button
        type="button" className={`lib-ti ${isSel ? 'sel' : ''}`} style={{ paddingLeft: 6 + depth * 14 }}
        aria-expanded={hasKids ? isOpen : undefined} aria-current={isSel ? 'true' : undefined}
        onClick={() => onSelect(f.id, true)}
      >
        <ChevronRight size={12} aria-hidden className={`lib-chev ${hasKids ? '' : 'none'} ${isOpen ? 'open' : ''}`} />
        <Icon size={14} aria-hidden className="lib-fi" />
        <span className="lib-tn">{f.name}</span>
        <span className="num lib-tc">{f.count}</span>
      </button>
      {hasKids && isOpen && (
        <ul>{f.folders.map((c) => <TreeItem key={c.id} f={c} selected={selected} openIds={openIds} onSelect={onSelect} depth={depth + 1} />)}</ul>
      )}
    </li>
  );
}

/** Search looks at file names, sources, people and folders (`q` in lower case). */
export const fileMatches = (f: LibraryFileVM, q: string) =>
  [f.name, f.title, f.source.label, f.by ?? '', ...f.tags, ...f.path].some((x) => x.toLowerCase().includes(q));

export function LibraryBrowser({ lib, readOnly, rowExtra, head, fill, folderParam = 'folder' }: {
  lib: LibraryVM;
  /** View as: adding is off, with the reason. */
  readOnly?: string;
  /** More in a file's row, e.g. Read in English on an Arabic booklet. */
  rowExtra?(f: LibraryFileVM): ReactNode;
  /** More in the toolbar, e.g. "Open tender" on the Tender library page. */
  head?: ReactNode;
  /** Fill the height it is given (the Tender library page), scrolling inside. */
  fill?: boolean;
  folderParam?: string;
}) {
  const [params, setParams] = useSearchParams();
  const all = useMemo(() => flatFolders(lib.folders), [lib]);
  const byId = useMemo(() => new Map(all.map((f) => [f.id, f])), [all]);
  const asked = params.get(folderParam);
  const selected = asked !== null && (asked === '' || byId.has(asked)) ? asked : lib.folders[0]?.id ?? '';
  const current = selected ? byId.get(selected) ?? null : null;

  // The open branches: the selected folder's ancestors, plus any the person opened.
  const ancestors = useMemo(() => {
    const out = new Set<string>();
    for (let id = selected; id.includes('/'); id = id.slice(0, id.lastIndexOf('/'))) out.add(id.slice(0, id.lastIndexOf('/')));
    return out;
  }, [selected]);
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const openIds = useMemo(() => new Set([...ancestors, ...opened]), [ancestors, opened]);

  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const [at, setAt] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const setFolder = (id: string) => {
    setParams((p) => { const n = new URLSearchParams(p); n.set(folderParam, id); return n; }, { replace: true });
    setAt(null);
  };
  const onSelect = (id: string, toggle: boolean) => {
    const f = byId.get(id);
    if (f?.folders.length && toggle) {
      setOpened((s) => {
        const n = new Set(s);
        if (selected === id && openIds.has(id)) n.delete(id); else n.add(id);
        return n;
      });
    }
    setFolder(id);
  };

  const rows = useMemo(() => (query ? lib.files.filter((f) => fileMatches(f, query)) : current?.files ?? []), [query, lib, current]);
  const subfolders = query ? [] : current ? current.folders : lib.folders;
  const addTo = current?.addable ? current.id : '05';
  const crumbs = current ? current.path.map((name, i) => ({ name, id: current.id.split('/').slice(0, i + 1).join('/') })) : [];

  const addBtn = (
    <span className="lib-add">
      <button type="button" className="btn btn-sm btn-primary" onClick={() => setAdding(true)} disabled={!!readOnly} aria-describedby={readOnly ? 'lib-ro' : undefined}>
        <Plus size={13} aria-hidden />Add file
      </button>
      {readOnly && <span className="lib-why" id="lib-ro">{readOnly}</span>}
    </span>
  );

  return (
    <div className={`lib ${fill ? 'fill' : ''} ${rowExtra ? 'lib-xa' : ''}`}>
      <div className="lib-bar">
        <label className="lib-search">
          <Search size={14} aria-hidden />
          <span className="sr-only">Search this tender's files</span>
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setAt(null); }} placeholder="Search this tender's files" />
        </label>
        <span className="lib-count num">{lib.count} {lib.count === 1 ? 'file' : 'files'} in {lib.folderCount} {lib.folderCount === 1 ? 'folder' : 'folders'}</span>
        {head}
        {addBtn}
      </div>
      <div className="lib-body">
        <nav className="lib-tree" aria-label="Folders">
          <ul>{lib.folders.map((f) => <TreeItem key={f.id} f={f} selected={selected} openIds={openIds} onSelect={onSelect} depth={0} />)}</ul>
        </nav>
        <section className="lib-pane" aria-label={query ? 'Search results' : current ? current.path.join(' › ') : 'All folders'}>
          <div className="lib-pane-h">
            {query ? (
              <span className="lib-crumb"><b>{rows.length} {rows.length === 1 ? 'match' : 'matches'}</b> for “{q.trim()}” in this tender's files</span>
            ) : (
              <nav className="lib-crumb" aria-label="Folder path">
                <button type="button" className="btn-link" onClick={() => setFolder('')}>All folders</button>
                {crumbs.map((c, i) => (
                  <span key={c.id}><span className="lib-sep" aria-hidden>›</span>{i === crumbs.length - 1 ? <b aria-current="page">{c.name}</b> : <button type="button" className="btn-link" onClick={() => setFolder(c.id)}>{c.name}</button>}</span>
                ))}
              </nav>
            )}
            {!query && current && <span className="lib-pane-n num">{current.count} {current.count === 1 ? 'file' : 'files'}</span>}
          </div>

          {subfolders.length > 0 && (
            <ul className="lib-folders" aria-label="Folders here">
              {subfolders.map((f) => (
                <li key={f.id}>
                  <button type="button" className="lib-fr" onClick={() => onSelect(f.id, false)}>
                    <Folder size={15} aria-hidden className="lib-fi" /><span className="lib-tn">{f.name}</span>
                    <span className="num lib-tc">{f.count} {f.count === 1 ? 'file' : 'files'}</span>
                    {f.masked && <span className="lib-mk">Masked</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {current?.masked && !query ? (
            <div className="lib-masked">
              <Masked by={current.masked.by} text={`${current.count} ${current.count === 1 ? 'file' : 'files'} masked for your role`} />
            </div>
          ) : rows.length > 0 ? (
            <FileGrid rows={rows} withFolder={!!query} onOpen={setAt} rowExtra={rowExtra} fill={fill} label={query ? 'Matching files' : `Files in ${current?.name ?? 'this folder'}`} />
          ) : query ? (
            <EmptyState title="No file matches." body="Search looks at file names, sources, people and folders." compact />
          ) : current && !current.folders.length ? (
            <EmptyState title="No files here yet." body={current.addable ? 'Add the files your team prepares, such as the proposal and its parts.' : undefined} compact />
          ) : null}
        </section>
      </div>
      <FileViewer file={at === null ? null : rows[at] ?? null} files={rows} onIndex={setAt} onClose={() => setAt(null)} extra={rowExtra} />
      <AddFileModal open={adding} onClose={() => setAdding(false)} lib={lib} folderId={addTo} />
    </div>
  );
}
