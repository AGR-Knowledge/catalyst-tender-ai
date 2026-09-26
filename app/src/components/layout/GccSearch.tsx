import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { dataPort } from '@/domain/gcc/port';
import { stageLabel } from '@/data/gcc/stages';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { StatusPill } from '@/components/tender/StatusPill';
import { useClickOutside } from '@/state/nav';
import '@/components/tender/tender.css';

/**
 * ⌘K tender search for GCC tenants (plan 019 Phase 5): a top-bar button that
 * opens a small command list over the tenders the viewer may open (the port's
 * rows, so a restricted tender is findable only by cleared people). It matches
 * the ID, short title, issuer and city; live tenders first; at most eight.
 * Enter opens the Tender Workspace; Esc closes.
 */

const MAX = 8;

/** The matching rows, live first, at most eight. Exported for the dev check. */
export function searchTenders(rows: TenderRowVM[], q: string): TenderRowVM[] {
  const term = q.trim().toLowerCase();
  const hits = term ? rows.filter((r) => [r.id, r.shortTitle, r.issuer, r.city].join(' ').toLowerCase().includes(term)) : rows;
  return [...hits]
    .sort((a, b) => Number(b.live) - Number(a.live) || (term ? Number(!b.id.toLowerCase().startsWith(term)) - Number(!a.id.toLowerCase().startsWith(term)) : 0) || b.lastActivityAt.localeCompare(a.lastActivityAt))
    .slice(0, MAX);
}

export function GccSearch() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const close = (refocus = true) => {
    setOpen(false);
    setQ('');
    if (refocus) btn.current?.focus();
  };
  useClickOutside(wrap, () => close(false), open);

  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  useEffect(() => setActive(0), [q]);

  const rows = useMemo(() => (open ? dataPort()?.rows(tenant, { kind: 'all' }, state.person, 'all', state.done) ?? [] : []), [open, tenant, state.person, state.done]);
  const results = useMemo(() => searchTenders(rows, q), [rows, q]);

  const go = (r: TenderRowVM) => {
    close(false);
    navigate(`/tenders/${encodeURIComponent(r.id)}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };

  return (
    <span className="pop-anchor gs" ref={wrap}>
      <button
        type="button" ref={btn} className="gs-btn" onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog" aria-expanded={open} aria-label={`Search tenders (${isMac ? '⌘K' : 'Ctrl K'})`}
      >
        <SearchIcon size={14} aria-hidden />
        <span className="gs-l">Search tenders</span>
        <span className="kbd gs-k" aria-hidden>{isMac ? '⌘K' : 'Ctrl K'}</span>
      </button>
      {open && (
        <div className="popover gs-pop" role="dialog" aria-label="Search tenders">
          <div className="gs-in">
            <SearchIcon size={14} aria-hidden />
            <input
              ref={input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="Tender ID, title, employer or city" aria-label="Search tenders"
              role="combobox" aria-expanded aria-controls={`${id}-list`} aria-autocomplete="list"
              aria-activedescendant={results[active] ? `${id}-${results[active].id}` : undefined}
            />
            <span className="kbd" aria-hidden>Esc</span>
          </div>
          <div className="gs-group">{q.trim() ? `${results.length === MAX ? `First ${MAX}` : results.length} ${results.length === 1 ? 'match' : 'matches'}` : 'Recent tenders, live first'}</div>
          <ul className="gs-list" id={`${id}-list`} role="listbox" aria-label="Tenders">
            {results.length === 0 && <li className="gs-empty" role="presentation">No tender matches “{q.trim()}” among the tenders you can open.</li>}
            {results.map((r, i) => (
              <li
                key={r.id} id={`${id}-${r.id}`} role="option" aria-selected={i === active}
                className={`gs-opt ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(r)}
              >
                <span className="mono gs-id">{r.id}</span>
                <span className="gs-t">
                  <span className="gs-title">{r.shortTitle}</span>
                  <span className="gs-sub">{[r.issuer, r.city].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="gs-stage">{stageLabel(r.stage)}</span>
                <StatusPill health={r.health} />
              </li>
            ))}
          </ul>
          <div className="gs-foot">↑ ↓ to move · Enter to open · Only tenders you can open are listed</div>
        </div>
      )}
    </span>
  );
}
