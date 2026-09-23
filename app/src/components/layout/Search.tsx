import { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { AGENTS, LIBRARY, SUPPLIERS } from '@/data/catalog';
import { canSee, type PageKey } from '@/data/access';
import { useDemo } from '@/state/store';
import { useLive } from '@/domain/live';
import { useClickOutside, useGo } from '@/state/nav';
import { cr } from '@/domain/format';

interface Result { id: string; group: string; title: string; sub: string; run: () => void }

const PAGES: { title: string; sub: string; path: string; page: PageKey }[] = [
  { title: 'Pipeline', sub: 'Tender register', path: '/pipeline', page: 'pipeline' },
  { title: 'Workflow', sub: 'Nine stages, three human gates', path: '/workflow', page: 'workflow' },
  { title: 'Agent console', sub: 'Agent status, routing and guardrails', path: '/agents', page: 'agents' },
  { title: 'Submission desk', sub: 'Packaging and portal submission (M3)', path: '/submission', page: 'submission' },
  { title: 'Supplier database', sub: 'Screened suppliers and scores', path: '/suppliers', page: 'suppliers' },
  { title: 'Artefacts library', sub: 'Reusable past-bid content', path: '/library', page: 'library' },
  { title: 'Settings', sub: 'Sources, gates, users, appearance', path: '/settings', page: 'settings' },
];

export function GlobalSearch() {
  const { state, openDrawer } = useDemo();
  const can = (p: PageKey) => canSee(state.role, p);
  const live = useLive();
  const { goPage } = useGo();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const close = () => { setOpen(false); setMobileOpen(false); };
  useClickOutside(wrap, close, open || mobileOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setMobileOpen(true);
        setOpen(true);
        requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const has = (...s: string[]) => s.join(' ').toLowerCase().includes(term);
    const out: Result[] = [];
    live.tenders.filter((t) => has(t.id, t.name, t.client, t.sector, t.bidManager)).slice(0, 6).forEach((t) =>
      out.push({ id: t.id, group: 'Tenders', title: t.name, sub: `${t.id} · ${t.client}, ${cr(t.value)}, Stage ${t.stage}${t.closed ? ', closed' : ''}`, run: () => openDrawer({ type: 'tender', id: t.id }) }));
    if (can('suppliers')) SUPPLIERS.filter((s) => has(s.name, s.trade)).slice(0, 4).forEach((s) =>
      out.push({ id: 's-' + s.name, group: 'Suppliers', title: s.name, sub: `${s.trade}, score ${s.score.toFixed(1)}, ${s.standing}`, run: () => { goPage('/suppliers'); openDrawer({ type: 'supplier', name: s.name }); } }));
    if (can('library')) LIBRARY.map((a, i) => ({ a, i })).filter(({ a }) => has(a.title, a.kind, a.origin)).slice(0, 4).forEach(({ a, i }) =>
      out.push({ id: 'l-' + i, group: 'Library', title: a.title, sub: `${a.kind} · ${a.origin}`, run: () => { goPage('/library'); openDrawer({ type: 'artefact', index: i }); } }));
    if (can('agents')) AGENTS.map((a, i) => ({ a, i })).filter(({ a }) => has(a.name, a.stage, 'agent')).slice(0, 3).forEach(({ a, i }) =>
      out.push({ id: 'a-' + i, group: 'Agents', title: `${a.name} Agent`, sub: `${a.stage} · ${a.state}`, run: () => { goPage('/agents'); openDrawer({ type: 'agent', index: i }); } }));
    PAGES.filter((p) => can(p.page) && has(p.title, p.sub)).forEach((p) => out.push({ id: 'p-' + p.path, group: 'Pages', title: p.title, sub: p.sub, run: () => goPage(p.path) }));
    return out;
  }, [q, live.tenders, openDrawer, goPage, state.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [q]);

  const pick = (r: Result) => { r.run(); setQ(''); close(); input.current?.blur(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
  };

  let lastGroup = '';
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="pop-anchor search-wrap" ref={wrap}>
      <button type="button" className="btn btn-icon search-trigger" aria-label="Search" onClick={() => { setMobileOpen(true); setOpen(true); requestAnimationFrame(() => input.current?.focus()); }}>
        <SearchIcon />
      </button>
      <div className={`search ${mobileOpen ? 'mobile-open' : ''}`}>
        <SearchIcon aria-hidden />
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search tenders, suppliers, clauses"
          aria-label="Search"
          role="combobox"
          aria-expanded={open && !!q}
          aria-controls="search-results"
        />
        {q ? (
          <button type="button" onClick={() => { setQ(''); input.current?.focus(); }} aria-label="Clear search"><X size={14} className="t-muted" /></button>
        ) : (
          <span className="kbd" aria-hidden>{isMac ? '⌘K' : 'Ctrl K'}</span>
        )}
        {mobileOpen && <button type="button" className="search-trigger" onClick={close} aria-label="Close search"><X size={16} /></button>}
      </div>
      {open && q.trim() && (
        <div className="popover search-pop" id="search-results" role="listbox">
          <div className="search-results">
            {results.length === 0 && <div className="pop-empty">No matches for “{q}”. Try a tender ID, client or supplier.</div>}
            {results.map((r, i) => {
              const head = r.group !== lastGroup ? (lastGroup = r.group) : null;
              return (
                <div key={r.id}>
                  {head && <div className="search-group">{head}</div>}
                  <button type="button" role="option" aria-selected={i === active} className={`pop-item ${i === active ? 'active' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => pick(r)}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="item-title ellipsis" style={{ fontSize: 12.5 }}>{r.title}</span>
                      <span className="item-text ellipsis" style={{ fontSize: 11.5, marginTop: 1 }}>{r.sub}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pop-foot"><span>↑↓ to move, ↵ to open, esc to close</span></div>
        </div>
      )}
    </div>
  );
}
