import { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClickedEvent } from 'ag-grid-community';
import { registerGrid } from '@/components/dashboard/grid/agGrid';
import { gridTheme } from '@/components/dashboard/grid/gridTheme';

registerGrid();

/**
 * The bid record's table (plan 032): AG Grid Community with the dashboard
 * theme, like the Stage 1 lists, but at most `maxRows` tall, so a long list
 * (the DG1 discards of a year) scrolls inside the card instead of stretching
 * the page. A row click, or Enter on a cell, opens the tender. `onReady`
 * hands the grid's API to a page that exports it (Debriefs › Download CSV, plan 037).
 */

const DEFAULT_COL: ColDef = { sortable: true, resizable: true, suppressMovable: true, suppressHeaderMenuButton: true, cellClass: 's1-cell' };
const HEADER = 40;
/** Rows that carry their tender as `id`; stable, so the grid keeps its rows between renders. */
const ID_OF = (r: unknown) => (r as { id: string }).id;

export function RecordGrid<R>({ rows, columns, onOpen, label, rowHeight = 52, maxRows = 10, idOf = ID_OF, onReady }: {
  rows: R[];
  columns: ColDef<R>[];
  onOpen(id: string): void;
  label: string;
  rowHeight?: number;
  maxRows?: number;
  /** The row's tender id, when the rows don't carry it as `id`. */
  idOf?(r: R): string;
  onReady?(api: GridApi<R>): void;
}) {
  const getRowId = useCallback((p: GetRowIdParams<R>) => idOf(p.data), [idOf]);
  const onRowClicked = useCallback((e: RowClickedEvent<R>) => {
    if ((e.event?.target as HTMLElement | undefined)?.closest('button, a')) return;
    if (e.data) onOpen(idOf(e.data));
  }, [onOpen, idOf]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<R>) => {
    if ((e.event as KeyboardEvent | null | undefined)?.key === 'Enter' && e.data) onOpen(idOf(e.data));
  }, [onOpen, idOf]);
  const defaultColDef = useMemo(() => DEFAULT_COL as ColDef<R>, []);
  const onGridReady = useCallback((e: GridReadyEvent<R>) => onReady?.(e.api), [onReady]);
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
        onGridReady={onGridReady}
        suppressCellFocus={false}
        suppressNoRowsOverlay
        animateRows={false}
        headerHeight={HEADER}
        rowHeight={rowHeight}
      />
    </div>
  );
}
