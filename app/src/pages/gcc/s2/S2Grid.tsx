import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClickedEvent, RowSelectionOptions } from 'ag-grid-community';
import { registerGrid } from '@/components/dashboard/grid/agGrid';
import { gridTheme } from '@/components/dashboard/grid/gridTheme';

registerGrid();

/**
 * AG Grid Community for the Stage 2 tables of more than five rows (architecture
 * decision 8): the supplier response matrix and the supplier master. Same theme
 * and modules as the dashboard table. A row click, or Enter on a focused cell,
 * selects the row; the page shows its detail beside or under the grid.
 */

const SELECTION: RowSelectionOptions = { mode: 'singleRow', checkboxes: false, enableClickSelection: true };
const DEFAULT_COL: ColDef = { sortable: true, resizable: true, suppressMovable: true };

export function S2Grid<R extends { id: string }>({ rows, columns, selectedId, onSelect, label, height = 360 }: {
  rows: R[];
  columns: ColDef<R>[];
  selectedId?: string | null;
  onSelect?(id: string | null): void;
  label: string;
  height?: number;
}) {
  const api = useRef<GridApi<R> | null>(null);
  const selected = useRef(selectedId ?? null);
  selected.current = selectedId ?? null;

  const style = useMemo<CSSProperties>(() => ({ height }), [height]);
  const getRowId = useCallback((p: GetRowIdParams<R>) => p.data.id, []);
  const onGridReady = (e: GridReadyEvent<R>) => { api.current = e.api; e.api.sizeColumnsToFit(); };

  // Keep the grid's selection on the page's.
  useEffect(() => {
    const a = api.current;
    if (!a || !onSelect) return;
    a.forEachNode((n) => n.setSelected(n.data?.id === selectedId, false, 'api'));
  }, [selectedId, rows, onSelect]);

  const onRowClicked = (e: RowClickedEvent<R>) => { if (e.data && onSelect) onSelect(selected.current === e.data.id ? null : e.data.id); };
  const onCellKeyDown = (e: CellKeyDownEvent<R>) => {
    const k = (e.event as KeyboardEvent | null)?.key;
    if (!e.data || !onSelect) return;
    if (k === 'Enter') { e.event?.preventDefault(); onSelect(selected.current === e.data.id ? null : e.data.id); }
    if (k === 'Escape' && selected.current) { e.event?.preventDefault(); onSelect(null); }
  };

  return (
    <div className="s2-grid" role="region" aria-label={label}>
      <AgGridReact<R>
        theme={gridTheme}
        containerStyle={style}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={DEFAULT_COL as ColDef<R>}
        getRowId={getRowId}
        rowSelection={onSelect ? SELECTION : undefined}
        onGridReady={onGridReady}
        onRowClicked={onRowClicked}
        onCellKeyDown={onCellKeyDown}
        animateRows={false}
        headerHeight={40}
        rowHeight={40}
        suppressNoRowsOverlay
      />
    </div>
  );
}
