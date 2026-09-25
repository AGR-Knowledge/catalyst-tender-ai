import { useCallback, useState } from 'react';

export type MainView = 'table' | 'graph';

const KEY = 'ctai.mainview';

/** The viewer's Table | Graph choice, remembered in this browser (dashboards.md §1 Z5). Defaults to Table. */
export function useMainView(): [MainView, (v: MainView) => void] {
  const [v, setV] = useState<MainView>(() => {
    try { return localStorage.getItem(KEY) === 'graph' ? 'graph' : 'table'; } catch { return 'table'; }
  });
  const set = useCallback((next: MainView) => {
    setV(next);
    try { localStorage.setItem(KEY, next); } catch { /* the choice still holds for this visit */ }
  }, []);
  return [v, set];
}

/** `Table | Graph`, as a radio group. */
export function ViewToggle({ value, onChange }: { value: MainView; onChange(v: MainView): void }) {
  return (
    <div className="seg vt" role="radiogroup" aria-label="Main view">
      {(['table', 'graph'] as MainView[]).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {k === 'table' ? 'Table' : 'Graph'}
        </button>
      ))}
    </div>
  );
}
