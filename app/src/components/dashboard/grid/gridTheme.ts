import { themeQuartz } from 'ag-grid-community';

/**
 * The grid's theme, from our tokens (dashboards.md §5). AG Grid passes string
 * values straight into CSS, so `var(--token)` resolves in the page's cascade:
 * light and dark themes and each tenant's brand follow with no JavaScript.
 * (Checked against ag-stack 36.2: colour, length and font strings are not
 * parsed, and `var()` font names are not quoted.)
 */
export const gridTheme = themeQuartz.withParams({
  backgroundColor: 'var(--surface)',
  foregroundColor: 'var(--ink)',
  textColor: 'var(--ink-2)',
  headerBackgroundColor: 'var(--surface-2)',
  headerTextColor: 'var(--ink-3)',
  borderColor: 'var(--line)',
  rowBorder: { color: 'var(--line-2)' },
  rowHoverColor: 'var(--surface-hover)',
  selectedRowBackgroundColor: 'var(--brand-soft)',
  accentColor: 'var(--brand)',
  rangeSelectionBorderColor: 'var(--focus-ring)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 600,
  rowHeight: 40,
  headerHeight: 40,
  wrapperBorderRadius: 0,
  borderRadius: 'var(--radius-sm)',
  wrapperBorder: false,
  cellHorizontalPadding: 12,
  browserColorScheme: 'inherit',
  menuBackgroundColor: 'var(--surface)',
  inputBorder: { color: 'var(--line)' },
});
