import { useId } from 'react';
import { Search, X } from 'lucide-react';

/**
 * The list filter (ui-direction §5 B): search, one select per facet with its
 * counts, "n of m", and Clear all. The page filters its rows with the values
 * it holds; the bar only shows and changes them.
 */

export interface Facet { key: string; label: string; options: { value: string; label: string; n: number }[] }

export function FilterBar({ facets, values, onChange, search, onSearch, shown, total, noun, placeholder = 'Search' }: {
  facets: Facet[];
  values: Record<string, string>;
  onChange(key: string, value: string): void;
  search?: string;
  onSearch?(s: string): void;
  shown: number;
  total: number;
  noun: string;
  placeholder?: string;
}) {
  const id = useId();
  const active = Object.values(values).some(Boolean) || !!search;
  return (
    <div className="s1-filters" role="search" aria-label={`Filter ${noun}`}>
      {onSearch && (
        <label className="s1-search">
          <Search size={13} aria-hidden />
          <span className="sr-only">Search {noun}</span>
          <input type="search" value={search ?? ''} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} />
        </label>
      )}
      {facets.filter((f) => f.options.length > 1).map((f) => (
        <label key={f.key} className={`s1-facet ${values[f.key] ? 'on' : ''}`} htmlFor={`${id}-${f.key}`}>
          <span className="s1-facet-l">{f.label}</span>
          <select id={`${id}-${f.key}`} value={values[f.key] ?? ''} onChange={(e) => onChange(f.key, e.target.value)}>
            <option value="">All</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.n})</option>)}
          </select>
        </label>
      ))}
      <span className="s1-count num" aria-live="polite">{shown} of {total} {noun}</span>
      {active && (
        <button type="button" className="btn btn-sm" onClick={() => { facets.forEach((f) => onChange(f.key, '')); onSearch?.(''); }}>
          <X size={12} aria-hidden />Clear all
        </button>
      )}
    </div>
  );
}

/** The options of a facet, with counts, in first-seen order. */
export function optionsOf<R>(rows: R[], value: (r: R) => string | null | undefined, label: (v: string) => string = (v) => v) {
  const counts = new Map<string, number>();
  for (const r of rows) { const v = value(r); if (v) counts.set(v, (counts.get(v) ?? 0) + 1); }
  return [...counts].map(([v, n]) => ({ value: v, label: label(v), n }));
}
