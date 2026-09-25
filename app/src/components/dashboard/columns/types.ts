import type { ColDef } from 'ag-grid-community';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';

/** An AG Grid column definition for our rows. */
export type AgColDef<R = TenderRowVM> = ColDef<R>;

/**
 * One table column, defined once and picked by id per dashboard (dashboards.md
 * §5). Each `*.cols.tsx` exports `COLUMNS: ColumnDef[]`. Renderers use the
 * tender kit; value getters return sortable raw values (amounts in tenant
 * currency, ISO dates, numbers).
 */
export interface ColumnDef<R = TenderRowVM> {
  id: string;
  header: string;
  /** Which table it belongs to: tender rows (the default) or My requests rows. */
  appliesTo?: 'tender' | 'request';
  build(): AgColDef<R>;
}
