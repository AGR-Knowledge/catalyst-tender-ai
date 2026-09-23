import type { CSSProperties, ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  /** Grid track, e.g. '1.4fr' or '90px'. */
  width: string;
  align?: 'left' | 'right' | 'center';
  /** 1 = always shown, 2 = hidden on narrow containers, 3 = hidden on medium containers. */
  priority?: 1 | 2 | 3;
  /** The column that heads the stacked card on phones. */
  primary?: boolean;
  /** Suppress the inline label in stacked mode. */
  nolabel?: boolean;
  label?: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  dim?: (row: T) => boolean;
  empty?: ReactNode;
}

const template = <T,>(cols: Column<T>[], max: number) =>
  cols.filter((c) => (c.priority ?? 1) <= max).map((c) => c.width).join(' ');

export function DataTable<T>({ columns, rows, rowKey, onRowClick, rowLabel, dim, empty = 'Nothing matches the current filter.' }: Props<T>) {
  const style = {
    '--gt1': template(columns, 3),
    '--gt2': template(columns, 2),
    '--gt3': template(columns, 1),
  } as CSSProperties;

  const cellClass = (c: Column<T>) =>
    ['dt-cell', c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : '', c.priority && c.priority > 1 ? `dt-p${c.priority}` : '', c.primary ? 'primary' : '', c.nolabel ? 'nolabel' : '', c.className ?? '']
      .filter(Boolean).join(' ');

  return (
    <div className="dt" style={style} role="table">
      <div className="dt-head" role="row">
        {columns.map((c) => (
          <span key={c.key} role="columnheader" className={[c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : '', c.priority && c.priority > 1 ? `dt-p${c.priority}` : ''].join(' ')}>
            {c.header}
          </span>
        ))}
      </div>
      {rows.length === 0 && <div className="dt-empty">{empty}</div>}
      {rows.map((r) => {
        const cells = columns.map((c) => (
          <span key={c.key} role="cell" className={cellClass(c)} data-label={c.label ?? c.header}>
            {c.render(r)}
          </span>
        ));
        const cls = `dt-row ${onRowClick ? 'click' : ''} ${dim?.(r) ? 'dim' : ''}`;
        return onRowClick ? (
          <button key={rowKey(r)} type="button" role="row" className={cls} onClick={() => onRowClick(r)} aria-label={rowLabel?.(r)}>
            {cells}
          </button>
        ) : (
          <div key={rowKey(r)} role="row" className={cls}>{cells}</div>
        );
      })}
    </div>
  );
}
