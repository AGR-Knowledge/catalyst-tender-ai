/// <reference types="vite/client" />
import {
  CellStyleModule, ClientSideRowModelModule, ColumnApiModule, ColumnAutoSizeModule, DateFilterModule, ExternalFilterModule,
  ModuleRegistry, NumberFilterModule, RowApiModule, RowSelectionModule, RowStyleModule, ScrollApiModule,
  ValidationModule, type Module,
} from 'ag-grid-community';

/**
 * AG Grid Community modules, registered once (dashboards.md §5). Only what the
 * dashboard table uses; never Enterprise. Sorting and pinned columns are part
 * of the core in v36 (`_SortModule`, internal), so they need no entry. `ValidationModule` explains misuse in
 * the console during development and is left out of builds.
 */
export const GRID_MODULES: Module[] = [
  ClientSideRowModelModule,   // rows held in the browser
  NumberFilterModule,         // column filter on Value
  DateFilterModule,           // column filter on Submission
  ExternalFilterModule,       // our toolbar's chips, search, status and drill-downs
  RowSelectionModule,         // row click selects and opens the tracker
  ColumnAutoSizeModule,       // fit columns to the box
  CellStyleModule,            // cellClass on numeric and pinned columns
  RowStyleModule,             // rowClassRules for closed tenders
  ColumnApiModule,            // applyColumnState (presets), setColumnsVisible (Columns menu)
  RowApiModule,               // getRowNode (selection sync)
  ScrollApiModule,            // ensureNodeVisible (a drill that selects a row)
];

let done = false;

export function registerGrid() {
  if (done) return;
  done = true;
  ModuleRegistry.registerModules(import.meta.env.DEV ? [...GRID_MODULES, ValidationModule] : GRID_MODULES);
}
