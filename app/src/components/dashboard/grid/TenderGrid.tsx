/// <reference types="vite/client" />
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  CellKeyDownEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent, IRowNode, RowClassRules, RowClickedEvent, RowDoubleClickedEvent,
  RowSelectionOptions, SelectionChangedEvent,
} from 'ag-grid-community';
import { ChevronDown, Columns3, Search, X } from 'lucide-react';
import type { FilterKey, Health, SortPreset, TableFilterVM, TableStatus, TenderRowVM } from '@/domain/gcc/viewmodels';
import { stageLabel, stepLabel } from '@/data/gcc/stages';
import { notDefinedText } from '@/domain/gcc/dashboards/build';
import { usePop } from '@/components/tender/Tip';
import { EmptyState } from '@/components/tender/EmptyState';
import { HEALTH, HEALTH_ORDER } from '@/components/tender/StatusPill';
import { column } from '../columns';
import { CELL_ACTION } from '../columns/base.cols';
import { registerGrid } from './agGrid';
import { gridTheme } from './gridTheme';

registerGrid();

/**
 * The dashboard table (dashboards.md §5): AG Grid Community in a fixed box, with
 * our own toolbar. There is always one sort: a preset (Newest, Highest value,
 * Due soonest) or a header the viewer clicked; clearing a header sort returns to
 * the preset. Filters, search, the status switch and drill-down chips use the
 * grid's external filter. A row click selects the row (the page opens the
 * tracker); a double-click opens the tender.
 */

type Row = { id: string };

export interface TenderGridProps<R extends Row = TenderRowVM> {
  /** `requests` rows come from My requests (plan 013): request columns only, no stage, status or health filters. */
  kind?: 'tenders' | 'requests';
  rows: R[];
  columns: string[];
  optional?: string[];
  defaultSort: SortPreset;
  filters: FilterKey[];
  statusDefault: TableStatus;
  selectedId: string | null;
  onSelect(id: string | null): void;
  onOpen(id: string): void;
  externalFilter?: TableFilterVM | null;
  onClearExternal?(): void;
  /** Accessible name for the table region. */
  label?: string;
  /** Rendered first in the toolbar (the page's Table | Graph toggle). */
  lead?: ReactNode;
}

/* ------------------------------------------------------------------- presets */

const PRESET_LABEL: Record<SortPreset, string> = { newest: 'Newest first', value: 'Highest value', due: 'Due soonest' };

type Key = string | number | null;

/** The raw key each preset sorts by. Tender rows and My requests rows (`requestedAt`, `due`). */
function presetKey(preset: SortPreset, row: Row, kind: 'tenders' | 'requests'): Key {
  const r = row as Partial<TenderRowVM> & { requestedAt?: string; due?: string | null };
  if (preset === 'newest') return (kind === 'requests' ? r.requestedAt : r.capturedAt) ?? null;
  if (preset === 'value') return r.value?.amount ?? null;
  if (kind === 'requests') return r.due ?? null;
  return r.submission ? `${r.submission.date}T${r.submission.time ?? '23:59'}` : null;
}

const PRESET_DIR: Record<SortPreset, 'asc' | 'desc'> = { newest: 'desc', value: 'desc', due: 'asc' };
const presetCol = (p: SortPreset) => `__sort_${p}`;
const isPresetCol = (id: string) => id.startsWith('__sort_');

/* -------------------------------------------------------------------- facets */

interface Facet {
  key: Exclude<FilterKey, 'status'>;
  label: string;
  value(r: TenderRowVM): string | null;
  text(v: string): string;
  rank?(v: string): number;
}

const FACETS: Facet[] = [
  { key: 'stage', label: 'Stage', value: (r) => (r.stage ? String(r.stage) : null), text: (v) => stageLabel(Number(v)), rank: Number },
  {
    key: 'step', label: 'Step', value: (r) => (r.step ? `${r.stage}:${r.step}` : null),
    text: (v) => { const [s, k] = v.split(':'); return stepLabel(Number(s), k); },
    rank: (v) => Number(v.split(':')[0]),
  },
  { key: 'sector', label: 'Sector', value: (r) => r.sector || null, text: (v) => v },
  { key: 'country', label: 'Country', value: (r) => r.country || null, text: (v) => v },
  { key: 'owner', label: 'With', value: (r) => (r.stage ? r.ownerName ?? 'Nobody yet' : null), text: (v) => v },
  { key: 'health', label: 'Health', value: (r) => r.health ?? null, text: (v) => HEALTH[v as Health]?.label ?? v, rank: (v) => HEALTH_ORDER.indexOf(v as Health) },
];

const STATUS_LABEL: Record<TableStatus, string> = { live: 'Live', closed: 'Closed', all: 'All' };

type Sel = Partial<Record<Facet['key'], string[]>>;

/*
 * Grid options that never change live outside the component. AG Grid rebuilds
 * every column when it is handed a new `defaultColDef`, which re-hid the columns
 * ticked in the Columns menu and reset widths on each re-render.
 */
const DEFAULT_COL_DEF: ColDef = { sortable: true, resizable: true, suppressHeaderMenuButton: true, unSortIcon: false };
const ROW_SELECTION: RowSelectionOptions = { mode: 'singleRow', checkboxes: false, enableClickSelection: false };
const CONTAINER_STYLE = { height: '100%', width: '100%' };
const always = () => true;

/* ----------------------------------------------------------------- the grid */

export function TenderGrid<R extends Row = TenderRowVM>(props: TenderGridProps<R>) {
  const {
    kind = 'tenders', rows, columns, optional = [], defaultSort, filters, statusDefault,
    selectedId, onSelect, onOpen, externalFilter, onClearExternal, label, lead,
  } = props;
  const tenders = kind === 'tenders';
  const apiRef = useRef<GridApi<R> | null>(null);
  const [preset, setPreset] = useState<SortPreset>(defaultSort);
  const [headerSort, setHeaderSort] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TableStatus>(statusDefault);
  const [sel, setSel] = useState<Sel>({});
  const [shown, setShown] = useState<string[]>([]);

  // A new dashboard (another stage, another tenant) starts from its own defaults. Keyed by the ids, not the array.
  const colKey = columns.join('|');
  const optKey = optional.join('|');
  useEffect(() => { setPreset(defaultSort); setStatus(statusDefault); setSel({}); setSearch(''); setShown([]); }, [defaultSort, statusDefault, colKey]);

  const presets = (Object.keys(PRESET_LABEL) as SortPreset[]).filter((p) => tenders || p !== 'value');
  const facets = useMemo(() => {
    if (!tenders) return [];
    const list = rows as unknown as TenderRowVM[];
    return FACETS.filter((f) => filters.includes(f.key) && list.some((r) => f.value(r) !== null));
  }, [tenders, filters, rows]);
  const showStatus = tenders && filters.includes('status');

  /* ---------- filtering (one predicate, used by the grid and the counts) */

  const effStatus: TableStatus = externalFilter?.status ?? (showStatus ? status : statusDefault);
  const q = search.trim().toLowerCase();

  const pass = useCallback((r: R, except?: Facet['key']): boolean => {
    if (tenders) {
      const t = r as unknown as TenderRowVM;
      if (effStatus === 'live' && !t.live) return false;
      if (effStatus === 'closed' && t.live) return false;
      if (externalFilter) {
        const x = externalFilter;
        if (x.ids && !x.ids.includes(t.id)) return false;
        if (x.stages && !x.stages.includes(t.stage)) return false;
        if (x.steps && !x.steps.includes(t.step)) return false;
        if (x.health && !x.health.includes(t.health)) return false;
      }
      if (q && ![t.id, t.shortTitle, t.issuer, t.city].some((s) => s?.toLowerCase().includes(q))) return false;
      for (const f of facets) {
        if (f.key === except) continue;
        const want = sel[f.key];
        if (want?.length && !want.includes(f.value(t) ?? '')) return false;
      }
      return true;
    }
    if (externalFilter?.ids && !externalFilter.ids.includes(r.id)) return false;
    if (q && !Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(q))) return false;
    return true;
  }, [tenders, effStatus, externalFilter, q, facets, sel]);

  const passRef = useRef(pass);
  passRef.current = pass;

  const m = useMemo(() => (tenders
    ? rows.filter((r) => { const t = r as unknown as TenderRowVM; return effStatus === 'all' || (effStatus === 'live' ? t.live : !t.live); }).length
    : rows.length), [rows, tenders, effStatus]);
  const n = useMemo(() => rows.filter((r) => pass(r)).length, [rows, pass]);

  useEffect(() => { apiRef.current?.onFilterChanged(); }, [pass]);

  /* ---------- sorting: presets are real sorts on hidden columns, so a drill's `order` can lead */

  const orderRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    orderRef.current = new Map((externalFilter?.order ?? []).map((id, i) => [id, i]));
    apiRef.current?.onSortChanged();
  }, [externalFilter]);

  const applyPreset = useCallback((p: SortPreset) => {
    apiRef.current?.applyColumnState({ state: [{ colId: presetCol(p), sort: PRESET_DIR[p] }], defaultState: { sort: null } });
  }, []);

  const onSortChanged = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const sorted = api.getColumnState().filter((c) => c.sort);
    if (!sorted.length) { applyPreset(preset); return; }   // never unsorted
    const c = sorted[0].colId;
    setHeaderSort(isPresetCol(c) ? null : api.getColumn(c)?.getColDef().headerName ?? c);
  }, [applyPreset, preset]);

  const choosePreset = (p: SortPreset) => { setPreset(p); setHeaderSort(null); applyPreset(p); };

  /* ---------- columns
   * Visibility is always the spec's columns plus the ones ticked in the Columns
   * menu. Widths and flex are given as initial values, so a column the viewer
   * resized keeps its width when the definitions are handed over again.
   */

  const colDefs = useMemo<ColDef<R>[]>(() => {
    const want = [...columns, ...optional.filter((o) => !columns.includes(o))];
    const hide = (id: string) => !columns.includes(id) && !shown.includes(id);
    const defs: ColDef<R>[] = [];
    for (const id of want) {
      const c = column(id);
      if (!c) {
        if (import.meta.env.DEV) console.warn(`Column "${id}" is not registered yet.`);
        defs.push({ colId: id, headerName: notDefinedText(id), valueGetter: () => '', initialWidth: 170, hide: hide(id) });
        continue;
      }
      if ((c.appliesTo ?? 'tender') !== (tenders ? 'tender' : 'request')) continue;
      const { width, flex, ...d } = c.build() as ColDef<R>;
      defs.push({
        ...d, colId: id, headerName: d.headerName ?? c.header, hide: hide(id),
        ...(width !== undefined ? { initialWidth: d.initialWidth ?? width } : {}),
        ...(flex !== undefined ? { initialFlex: d.initialFlex ?? flex ?? undefined } : {}),
      });
    }
    // The presets sort on hidden columns; a drill's `order` puts its tenders first.
    for (const p of presets) {
      defs.push({
        colId: presetCol(p), headerName: PRESET_LABEL[p], hide: true, lockVisible: true, suppressMovable: true,
        valueGetter: (v) => (v.data ? presetKey(p, v.data, kind) : null),
        comparator: (a: Key, b: Key, na: IRowNode<R>, nb: IRowNode<R>, desc: boolean) => {
          const flip = desc ? -1 : 1;
          const ra = orderRef.current.get(na.data?.id ?? '') ?? Infinity;
          const rb = orderRef.current.get(nb.data?.id ?? '') ?? Infinity;
          if (ra !== rb) return (ra < rb ? -1 : 1) * flip;
          // No key sorts last in either direction.
          if (a === null || b === null) return a === b ? 0 : (a === null ? 1 : -1) * flip;
          return (a < b ? -1 : a > b ? 1 : 0);
        },
      });
    }
    return defs;
  }, [colKey, optKey, shown, tenders, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionalCols = useMemo(() => optional.map((id) => ({ id, header: column(id)?.header ?? notDefinedText(id) })), [optKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleCol = (id: string) => setShown((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  /* ---------- selection */

  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const syncSelection = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const node = selectedRef.current ? api.getRowNode(selectedRef.current) : undefined;
    api.forEachNode((nd) => { if (nd.isSelected() && nd !== node) nd.setSelected(false, false, 'api'); });
    if (node && !node.isSelected()) {
      node.setSelected(true, false, 'api');
      api.ensureNodeVisible(node, 'middle');
    }
  }, []);

  useEffect(() => { syncSelection(); }, [selectedId, rows, syncSelection]);

  const onRowClicked = (e: RowClickedEvent<R>) => {
    const t = e.event?.target as HTMLElement | null;
    if (t?.closest(`[${CELL_ACTION}]`)) return;
    if (!e.data) return;
    onSelect(selectedRef.current === e.data.id ? null : e.data.id);
  };
  const onRowDoubleClicked = (e: RowDoubleClickedEvent<R>) => { if (e.data) onOpen(e.data.id); };
  const onSelectionChanged = (e: SelectionChangedEvent<R>) => {
    if (e.source === 'api') return;
    const id = e.api.getSelectedRows()[0]?.id ?? null;
    if (id !== selectedRef.current) onSelect(id);
  };
  const onCellKeyDown = (e: CellKeyDownEvent<R>) => {
    const k = (e.event as KeyboardEvent | null)?.key;
    if (!e.data) return;
    if (k === 'Enter') { e.event?.preventDefault(); onSelect(selectedRef.current === e.data.id ? null : e.data.id); }
    if (k === 'Escape' && selectedRef.current) { e.event?.preventDefault(); onSelect(null); }
  };

  const rowClassRules = useMemo<RowClassRules<R>>(() => ({
    'row-closed': (p) => tenders && !!p.data && !(p.data as unknown as TenderRowVM).live,
  }), [tenders]);

  const getRowId = useCallback((p: GetRowIdParams<R>) => p.data.id, []);
  const doesExternalFilterPass = useCallback((node: IRowNode<R>) => !!node.data && passRef.current(node.data), []);

  const onGridReady = (e: GridReadyEvent<R>) => {
    apiRef.current = e.api;
    applyPreset(preset);
    syncSelection();
  };

  /* ---------- chips */

  const chips: { key: string; text: string; clear(): void }[] = [];
  if (externalFilter) chips.push({ key: 'x', text: externalFilter.label, clear: () => onClearExternal?.() });
  for (const f of facets) {
    for (const v of sel[f.key] ?? []) {
      chips.push({ key: `${f.key}:${v}`, text: `${f.label}: ${f.text(v)}`, clear: () => setSel((s) => ({ ...s, [f.key]: (s[f.key] ?? []).filter((x) => x !== v) })) });
    }
  }
  if (q) chips.push({ key: 'q', text: `Search: “${search.trim()}”`, clear: () => setSearch('') });
  const clearAll = () => { setSel({}); setSearch(''); onClearExternal?.(); };
  const anyFilter = chips.length > 0 || (showStatus && status !== statusDefault);
  const noun = tenders ? 'tenders' : 'requests';

  return (
    <div className="tgrid" role="region" aria-label={label ?? (tenders ? 'Tenders table' : 'Requests table')}>
      <div className="tg-bar">
        {lead}
        <label className="tg-sort">
          <span className="sr-only">Sort</span>
          <select
            value={headerSort ? '__header' : preset}
            onChange={(e) => { if (e.target.value !== '__header') choosePreset(e.target.value as SortPreset); }}
          >
            {headerSort && <option value="__header">Sort: {headerSort}</option>}
            {presets.map((p) => <option key={p} value={p}>Sort: {PRESET_LABEL[p]}</option>)}
          </select>
          <ChevronDown size={13} aria-hidden />
        </label>
        <label className="tg-search">
          <Search size={13} aria-hidden />
          <span className="sr-only">Search {noun}</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tenders ? 'Search TID, title, issuer, city' : 'Search requests'} />
        </label>
        {showStatus && (
          <div className="seg tg-status" role="radiogroup" aria-label="Status">
            {(['live', 'closed', 'all'] as TableStatus[]).map((s) => (
              <button
                key={s} type="button" role="radio" aria-checked={effStatus === s} className={effStatus === s ? 'on' : ''}
                onClick={() => setStatus(s)} disabled={!!externalFilter?.status}
                title={externalFilter?.status ? 'Set by the chip; remove it to change the status' : undefined}
              >{STATUS_LABEL[s]}</button>
            ))}
          </div>
        )}
        {facets.map((f) => (
          <FacetMenu
            key={f.key} facet={f} rows={rows as unknown as TenderRowVM[]} picked={sel[f.key] ?? []}
            count={(v) => rows.filter((r) => pass(r, f.key) && f.value(r as unknown as TenderRowVM) === v).length}
            onChange={(vals) => setSel((s) => ({ ...s, [f.key]: vals }))}
          />
        ))}
        {optionalCols.length > 0 && <ColumnsMenu cols={optionalCols} shown={shown} onToggle={toggleCol} />}
        <span className="tg-count num" aria-live="polite">{n} of {m}</span>
      </div>
      {chips.length > 0 && (
        <div className="tg-chips" aria-label="Active filters">
          {chips.map((c) => (
            <button key={c.key} type="button" className="tg-chip" onClick={c.clear} aria-label={`Remove filter: ${c.text}`}>
              <span>{c.text}</span><X size={12} aria-hidden />
            </button>
          ))}
          <button type="button" className="btn-link tg-clear" onClick={clearAll}>Clear all</button>
        </div>
      )}
      <div className="tg-grid">
        <AgGridReact<R>
          theme={gridTheme}
          containerStyle={CONTAINER_STYLE}
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={DEFAULT_COL_DEF as ColDef<R>}
          maintainColumnOrder
          getRowId={getRowId}
          rowSelection={ROW_SELECTION}
          isExternalFilterPresent={always}
          doesExternalFilterPass={doesExternalFilterPass}
          rowClassRules={rowClassRules}
          onGridReady={onGridReady}
          onSortChanged={onSortChanged}
          onRowClicked={onRowClicked}
          onRowDoubleClicked={onRowDoubleClicked}
          onSelectionChanged={onSelectionChanged}
          onCellKeyDown={onCellKeyDown}
          suppressNoRowsOverlay
          suppressCellFocus={false}
          animateRows={false}
          headerHeight={40}
          rowHeight={40}
        />
        {n === 0 && (
          <div className="tg-empty">
            <EmptyState
              title={anyFilter || m === 0 && rows.length > 0 ? `No ${noun} match these filters.` : tenders ? 'No tenders here yet.' : 'Nothing is asked of you right now.'}
              action={anyFilter ? <button type="button" className="btn btn-sm" onClick={() => { clearAll(); setStatus(statusDefault); }}>Clear all</button> : undefined}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- menus */

function FacetMenu({ facet, rows, picked, count, onChange }: {
  facet: Facet; rows: TenderRowVM[]; picked: string[]; count(v: string): number; onChange(v: string[]): void;
}) {
  const pop = usePop<HTMLButtonElement>({ width: 260, mode: 'click', label: `Filter by ${facet.label}` });
  const values = useMemo(() => {
    const set = [...new Set(rows.map(facet.value).filter((v): v is string => v !== null))];
    return set.sort((a, b) => (facet.rank ? facet.rank(a) - facet.rank(b) : 0) || facet.text(a).localeCompare(facet.text(b)));
  }, [rows, facet]);
  const toggle = (v: string) => onChange(picked.includes(v) ? picked.filter((x) => x !== v) : [...picked, v]);
  return (
    <>
      <button type="button" className={`tg-facet ${picked.length ? 'on' : ''}`} aria-haspopup="dialog" {...pop.menuProps}>
        {facet.label}
        {picked.length > 0 && <span className="badge num">{picked.length}</span>}
        <ChevronDown size={12} aria-hidden />
      </button>
      {pop.render(
        <div className="tg-menu" role="group" aria-label={facet.label}>
          {values.map((v) => {
            const c = count(v);
            return (
              <label key={v} className={`tg-opt ${c === 0 && !picked.includes(v) ? 'dim' : ''}`}>
                <input type="checkbox" checked={picked.includes(v)} onChange={() => toggle(v)} />
                <span className="l">{facet.text(v)}</span>
                <span className="c num">{c}</span>
              </label>
            );
          })}
          {picked.length > 0 && <button type="button" className="btn-link tg-menu-clear" onClick={() => onChange([])}>Clear {facet.label.toLowerCase()}</button>}
        </div>,
      )}
    </>
  );
}

function ColumnsMenu({ cols, shown, onToggle }: { cols: { id: string; header: string }[]; shown: string[]; onToggle(id: string): void }) {
  const pop = usePop<HTMLButtonElement>({ width: 220, mode: 'click', align: 'end', label: 'Columns' });
  return (
    <>
      <button type="button" className="tg-facet" aria-haspopup="dialog" {...pop.menuProps}>
        <Columns3 size={13} aria-hidden />Columns
        {shown.length > 0 && <span className="badge num">+{shown.length}</span>}
      </button>
      {pop.render(
        <div className="tg-menu" role="group" aria-label="Optional columns">
          {cols.map((c) => (
            <label key={c.id} className="tg-opt">
              <input type="checkbox" checked={shown.includes(c.id)} onChange={() => onToggle(c.id)} />
              <span className="l">{c.header}</span>
            </label>
          ))}
        </div>,
      )}
    </>
  );
}
