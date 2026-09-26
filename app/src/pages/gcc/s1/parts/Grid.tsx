import { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams, RowClassRules, RowClickedEvent } from 'ag-grid-community';
import { registerGrid } from '@/components/dashboard/grid/agGrid';
import { gridTheme } from '@/components/dashboard/grid/gridTheme';

registerGrid();

/**
 * A Stage 1 list of more than five rows (ui-direction §6.1): AG Grid Community
 * with the dashboard table's theme, sized to its rows. A row click, or Enter
 * on a cell, opens the row; sorting is on the headers. Filters sit in the
 * page's own bar above, so the grid only ever receives the filtered rows.
 */

const DEFAULT_COL: ColDef = { sortable: true, resizable: true, suppressMovable: true, suppressHeaderMenuButton: true, cellClass: 's1-cell' };

export function S1Grid<R extends { id: string }>({ rows, columns, onOpen, label, rowClassRules, rowHeight = 48 }: {
  rows: R[];
  columns: ColDef<R>[];
  onOpen?(id: string): void;
  /** Accessible name of the table region. */
  label: string;
  rowClassRules?: RowClassRules<R>;
  rowHeight?: number;
}) {
  const getRowId = useCallback((p: GetRowIdParams<R>) => p.data.id, []);
  const onRowClicked = useCallback((e: RowClickedEvent<R>) => {
    // A button inside a cell does its own thing.
    if ((e.event?.target as HTMLElement | undefined)?.closest('button, a')) return;
    if (e.data) onOpen?.(e.data.id);
  }, [onOpen]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<R>) => {
    if ((e.event as KeyboardEvent | null | undefined)?.key === 'Enter' && e.data) onOpen?.(e.data.id);
  }, [onOpen]);
  const defaultColDef = useMemo(() => DEFAULT_COL as ColDef<R>, []);
  return (
    <div className={`s1-grid ${onOpen ? 'opens' : ''}`} role="region" aria-label={label}>
      <AgGridReact<R>
        theme={gridTheme}
        rowData={rows}
        columnDefs={columns}
        defaultColDef={defaultColDef}
        domLayout="autoHeight"
        getRowId={getRowId}
        rowClassRules={rowClassRules}
        onRowClicked={onRowClicked}
        onCellKeyDown={onCellKeyDown}
        suppressCellFocus={false}
        suppressNoRowsOverlay
        animateRows={false}
        headerHeight={40}
        rowHeight={rowHeight}
      />
    </div>
  );
}
