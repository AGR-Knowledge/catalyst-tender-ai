import { useCallback, useMemo, type ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams } from 'ag-grid-community';
import { holdersOf } from '@/data/access';
import { useDemo } from '@/state/store';
import { useCan } from '@/domain/permissions';
import { useTenant } from '@/domain/tenancy';
import type { TileVM } from '@/domain/gcc/viewmodels';
import type { AdminBase } from '@/domain/gcc/admin';
import { KpiTiles } from '@/components/dashboard/KpiTile';
import { registerGrid } from '@/components/dashboard/grid/agGrid';
import { gridTheme } from '@/components/dashboard/grid/gridTheme';
import '@/components/dashboard/dashboard.css';
import './admin.css';

registerGrid();

/** What every Administration page reads: the tenant, its demo state, the viewer and the permission check. */
export function useAdmin() {
  const { state } = useDemo();
  const check = useCan();
  const tenant = useTenant();
  const base = useMemo<AdminBase>(
    () => ({ tenant: state.tenant, viewer: state.person, viewAs: !!state.viewAs, done: state.done }),
    [state.tenant, state.person, state.viewAs, state.done],
  );
  return { ...base, profile: tenant, check };
}

/** "Only the Head of Tendering changes these settings": who may, from access.ts. */
export const rightsLine = () => `Only ${holdersOf('admin.users')} changes these settings. Every change is written to the audit log.`;

/** An Administration page's header strip (ui-direction §5 F): the dashboard kit's tiles, state only, no drills. */
export function AdminStrip({ tiles }: { tiles: TileVM[] }) {
  if (!tiles.length) return null;
  return <div className="adm-strip"><KpiTiles tiles={tiles} onDrill={() => undefined} /></div>;
}

/** A rule stated, not implied (ui-direction §10). */
export function Rule({ children }: { children: ReactNode }) {
  return <p className="adm-rule">{children}</p>;
}

/** A disabled action that says why, in words, next to it. */
export function DisabledAction({ label, reason, id }: { label: ReactNode; reason: string; id: string }) {
  return (
    <span className="adm-disabled">
      <button type="button" className="btn btn-sm" disabled aria-describedby={id}>{label}</button>
      <span id={id} className="adm-why">{reason}</span>
    </span>
  );
}

const DEFAULT_COL: ColDef = { sortable: true, resizable: true, suppressMovable: true, suppressHeaderMenuButton: true, cellClass: 'adm-cell' };

/**
 * An Administration list of more than five rows (architecture decision 8): AG
 * Grid Community with the dashboard table's theme, sized to its rows. Enter on
 * a focused cell runs the row's one action, when it has one, so the keyboard
 * reaches it as the mouse does through the row's button.
 */
export function AdminGrid<R extends { id: string }>({ rows, columns, label, onEnter, rowHeight = 52, sortable = true }: {
  rows: R[];
  columns: ColDef<R>[];
  label: string;
  onEnter?(row: R): void;
  rowHeight?: number;
  sortable?: boolean;
}) {
  const getRowId = useCallback((p: GetRowIdParams<R>) => p.data.id, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<R>) => {
    if ((e.event as KeyboardEvent | null | undefined)?.key === 'Enter' && e.data) onEnter?.(e.data);
  }, [onEnter]);
  const defaultColDef = useMemo(() => ({ ...DEFAULT_COL, sortable }) as ColDef<R>, [sortable]);
  return (
    <div className="adm-grid" role="region" aria-label={label}>
      <AgGridReact<R>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        domLayout="autoHeight"
        getRowId={getRowId}
        onCellKeyDown={onCellKeyDown}
        suppressNoRowsOverlay
        animateRows={false}
        headerHeight={40}
        rowHeight={rowHeight}
      />
    </div>
  );
}

/** A two-line grid cell: the main value and a muted line under it. */
export function Cell2({ main, sub }: { main: ReactNode; sub?: ReactNode }) {
  return (
    <span className="adm-c2">
      <span className="adm-main">{main}</span>
      {sub && <span className="adm-sub">{sub}</span>}
    </span>
  );
}
