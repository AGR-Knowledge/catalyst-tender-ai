import { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams, RowClickedEvent } from 'ag-grid-community';
import { registerGrid } from '@/components/dashboard/grid/agGrid';
import { gridTheme } from '@/components/dashboard/grid/gridTheme';

registerGrid();

/**
 * The bid record's table (plan 032): AG Grid Community with the dashboard
 * theme, like the Stage 1 lists, but at most `maxRows` tall, so a long list
 * (the DG1 discards of a year) scrolls inside the card instead of stretching
 * the page. A row click, or Enter on a cell, opens the tender.
 */

const DEFAULT_COL: ColDef = { sortable: true, resizable: true, suppressMovable: true, suppressHeaderMenuButton: true, cellClass: 's1-cell' };
const HEADER = 40;

export function RecordGrid<R extends { id: string }>({ rows, columns, onOpen, label, rowHeight = 52, maxRows = 10 }: {
  rows: R[];
  columns: ColDef<R>[];
  onOpen(id: string): void;
  label: string;
  rowHeight?: number;
  maxRows?: number;
}) {
  const getRowId = useCallback((p: GetRowIdParams<R>) => p.data.id, []);
  const onRowClicked = useCallback((e: RowClickedEvent<R>) => {
    if ((e.event?.target as HTMLElement | undefined)?.closest('button, a')) return;
    if (e.data) onOpen(e.data.id);
  }, [onOpen]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<R>) => {
    if ((e.event as KeyboardEvent | null | undefined)?.key === 'Enter' && e.data) onOpen(e.data.id);
  }, [onOpen]);
  const defaultColDef = useMemo(() => DEFAULT_COL as ColDef<R>, []);
  // The rows' height plus the header and the grid's own borders; a scroll bar only past `maxRows`.
  const height = HEADER + Math.max(1, Math.min(rows.length, maxRows)) * rowHeight + 2 + (rows.length > maxRows ? 0 : 12);
  return (
    <div className="s1-grid opens co-rg" role="region" aria-label={label} style={{ height }}>
      <AgGridReact<R>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        onRowClicked={onRowClicked}
        onCellKeyDown={onCellKeyDown}
        suppressCellFocus={false}
        suppressNoRowsOverlay
        animateRows={false}
        headerHeight={HEADER}
        rowHeight={rowHeight}
      />
    </div>
  );
}
