import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search as SearchIcon, X } from 'lucide-react';
import { AGENTS, LIBRARY, SUPPLIERS } from '@/data/catalog';
import { canSee, type PageKey } from '@/data/access';
import { useDemo } from '@/state/store';
import { useLive } from '@/domain/live';
import { useClickOutside, useGo } from '@/state/nav';
import { cr, dayMonth } from '@/domain/format';
import { rateLabel } from '@/domain/boq';

interface Result { id: string; group: string; title: string; sub: string; run: () => void }

const PAGES: { title: string; sub: string; path: string; page: PageKey }[] = [
  { title: 'Pipeline', sub: 'Tender register', path: '/pipeline', page: 'pipeline' },
  { title: 'Workflow', sub: 'Nine stages, three human gates', path: '/workflow', page: 'workflow' },
  { title: 'Agent console', sub: 'Agent status, routing and guardrails', path: '/agents', page: 'agents' },
  { title: 'Submission desk', sub: 'Packaging and portal submission (M3)', path: '/submission', page: 'submission' },
  { title: 'Supplier database', sub: 'Screened suppliers and scores', path: '/suppliers', page: 'suppliers' },
  { title: 'Artefacts library', sub: 'Reusable past-bid content', path: '/library', page: 'library' },
  { title: 'BOQ and rates', sub: 'Bills of quantities and rate comparison', path: '/boq', page: 'boq' },
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
  /** Tender the search is narrowed to, picked from the dropdown in the input. */
  const [scope, setScope] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const scoped = scope ? live.byId(scope) ?? null : null;
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const close = () => { setOpen(false); setMobileOpen(false); setPicker(false); };
  useClickOutside(wrap, close, open || mobileOpen || picker);

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
    const has = (...s: string[]) => s.join(' ').toLowerCase().includes(term);
    const out: Result[] = [];
    const openBoq = (id: string) => goPage(`/boq?t=${id}`);

    // Narrowed to one tender: its record, its bill and the places it can be opened.
    if (scoped) {
      const t = scoped;
      const boq = live.boqOf(t.id);
      const acts: Result[] = [
        { id: 'x-rec', group: t.id, title: 'Open the tender record', sub: `${t.client}, ${cr(t.value)}, Stage ${t.stage}`, run: () => openDrawer({ type: 'tender', id: t.id }) },
      ];
      if (boq && can('boq')) acts.push({ id: 'x-boq', group: t.id, title: 'Open the bill of quantities', sub: `${boq.fullLines} lines, ${boq.lines.length} items`, run: () => openBoq(t.id) });
      if (t.source && can('intake')) acts.push({ id: 'x-src', group: t.id, title: 'Open the extraction', sub: 'Fields with page references', run: () => goPage(`/intake/${t.source}`) });
      if (!term) return acts;
      acts.filter((a) => has(a.title, a.sub)).forEach((a) => out.push(a));
      const fields: [string, string][] = [['Status', t.status], ['Due', `${dayMonth(t.due)} ${t.due.slice(0, 4)}`], ['Bid manager', t.bidManager], ['Owner', t.owner], ...(t.detail ? [['Scope', t.detail.scope] as [string, string], ['Portal', t.detail.portal] as [string, string], ...t.detail.rows, ...t.detail.events.map(([w, e]) => [w, e] as [string, string])] : [])];
      if (t.detail?.bidSecurity) fields.push(['Bid security', t.detail.bidSecurity]);
      fields.filter(([k, v]) => has(k, v)).slice(0, 6).forEach(([k, v], i) => out.push({ id: 'f' + i, group: 'In the record', title: v, sub: k, run: () => openDrawer({ type: 'tender', id: t.id }) }));
      boq?.lines.filter((l) => has(l.desc, l.code, l.bill, l.unit)).slice(0, 6).forEach((l) => out.push({ id: 'b' + l.item, group: 'In the BOQ', title: `${l.item} ${l.desc}`, sub: `${cr(l.amount, 1)}${l.lump ? ', lump sum' : `, ${rateLabel(l.rate)} per ${l.unit}`}`, run: () => (can('boq') ? openBoq(t.id) : openDrawer({ type: 'tender', id: t.id })) }));
      return out;
    }

    if (!term) {
      // Nothing typed yet: offer the tenders themselves, soonest deadline first.
      live.active.filter((t) => !t.held).sort((a, b) => a.days - b.days).slice(0, 7).forEach((t) =>
        out.push({ id: t.id, group: 'Live tenders, by deadline', title: t.name, sub: `${t.id}, ${t.client}, due ${dayMonth(t.due)}`, run: () => openDrawer({ type: 'tender', id: t.id }) }));
      return out;
    }
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
  }, [q, live, scoped, openDrawer, goPage, state.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(0), [q, scope]);

  const pick = (r: Result) => { r.run(); setQ(''); close(); input.current?.blur(); };
  const choose = (id: string | null) => { setScope(id); setPicker(false); setQ(''); setOpen(true); requestAnimationFrame(() => input.current?.focus()); };
  const pickList = [...live.active].sort((a, b) => Number(!!a.held) - Number(!!b.held) || a.days - b.days);

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
        <button type="button" className={`search-scope ${scoped ? 'on' : ''}`} onClick={() => { setPicker(!picker); setOpen(false); }} aria-haspopup="listbox" aria-expanded={picker} aria-label={scoped ? `Searching in ${scoped.id}. Change tender` : 'Pick a tender to search in'}>
          {scoped ? scoped.id : 'All'}<ChevronDown size={11} aria-hidden />
        </button>
        <input
          ref={input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setPicker(false); }}
          onKeyDown={onKeyDown}
          placeholder={scoped ? `Search in ${scoped.name}` : 'Search tenders, suppliers, clauses'}
          aria-label="Search"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-results"
        />
        {q || scoped ? (
          <button type="button" onClick={() => { if (q) setQ(''); else setScope(null); input.current?.focus(); }} aria-label={q ? 'Clear search' : 'Search all tenders'}><X size={14} className="t-muted" /></button>
        ) : (
          <span className="kbd" aria-hidden>{isMac ? '⌘K' : 'Ctrl K'}</span>
        )}
        {mobileOpen && <button type="button" className="search-trigger" onClick={close} aria-label="Close search"><X size={16} /></button>}
      </div>
      {picker && (
        <div className="popover search-pop" role="listbox" aria-label="Tenders">
          <div className="search-results">
            <button type="button" role="option" aria-selected={!scoped} className={`pop-item ${!scoped ? 'active' : ''}`} onClick={() => choose(null)}>
              <span style={{ flex: 1 }}><span className="item-title" style={{ fontSize: 12.5 }}>All tenders</span><span className="item-text" style={{ fontSize: 11.5, marginTop: 1 }}>Tenders, suppliers, library and pages</span></span>
            </button>
            <div className="search-group">Search inside one tender</div>
            {pickList.map((t) => (
              <button type="button" role="option" aria-selected={scope === t.id} key={t.id} className={`pop-item ${scope === t.id ? 'active' : ''}`} onClick={() => choose(t.id)}>
                <span className="mono t-ink4" style={{ fontSize: 11.5, width: 74, flex: 'none', marginTop: 1 }}>{t.id}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="item-title ellipsis" style={{ fontSize: 12.5 }}>{t.name}</span>
                  <span className="item-text ellipsis" style={{ fontSize: 11.5, marginTop: 1 }}>{t.client}, {t.held ? 'held at intake' : `due ${dayMonth(t.due)}`}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="pop-foot"><span>{pickList.length} live tenders</span></div>
        </div>
      )}
      {open && !picker && (q.trim() || results.length > 0) && (
        <div className="popover search-pop" id="search-results" role="listbox">
          <div className="search-results">
            {results.length === 0 && <div className="pop-empty">No matches for “{q}”{scoped ? ` in ${scoped.id}` : ''}. {scoped ? 'Try a field, a BOQ item or a date.' : 'Try a tender ID, client or supplier.'}</div>}
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
          <div className="pop-foot"><span>↑↓ to move, ↵ to open, esc to close</span>{!scoped && !q && <button type="button" className="btn-link" style={{ marginLeft: 'auto' }} onClick={() => { setPicker(true); setOpen(false); }}>Search inside a tender</button>}</div>
        </div>
      )}
    </div>
  );
}
