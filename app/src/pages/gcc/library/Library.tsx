import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { port } from '@/domain/gcc/lifecycle.port';
import { GCC_STAGES, stageLabel } from '@/data/gcc/stages';
import { HERO_ID } from '@/data/gcc/hero';
import { libraryFor, type LibraryFileVM, type LibraryVM } from '@/domain/gcc/library';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { Card, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { FileViewer } from '@/components/tender/FileViewer';
import { SourceHost } from '@/components/tender/SourceHost';
import { FileGrid, LibraryBrowser, fileMatches } from './LibraryBrowser';
import { useBookletExtra } from './bookletExtra';
import './library.css';

/**
 * Tender library (`/library`, plan 030 Phase 5): every tender the viewer can
 * open, as top-level folders on the left (find by ID or title, filter by
 * stage, file counts), and the selected tender's library on the right, the
 * same browser as the workspace's Library tab. A search across every tender's
 * files lists the matches with their tender and folder. The selection, the
 * open folder and the search live in the URL (`?tender=`, `?folder=`, `?q=`).
 * The two cards share the row's height and scroll inside (the wave 10 rule),
 * with the list narrower than the library it opens.
 *
 * Each count is the tender's library itself (memoised on the demo state; a
 * facsimile is built only when it is viewed), so the list and the library never
 * disagree.
 */

// Live tenders first, newest captured first; then closed ones, latest closed first.
const byRecency = (a: TenderRowVM, b: TenderRowVM) =>
  a.live !== b.live ? (a.live ? -1 : 1)
    : a.live ? b.capturedAt.localeCompare(a.capturedAt) : (b.closedAt ?? '').localeCompare(a.closedAt ?? '');

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

export default function Library() {
  const { state } = useDemo();
  const tenant = useTenantKey();
  const viewer = state.person;
  const done = state.done;
  const readOnly = state.viewAs ? `Viewing as ${viewer.name}. Read only` : undefined;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  // The match open in the viewer.
  const [at, setAt] = useState<number | null>(null);

  const rows = useMemo(() => port.rows(tenant, { kind: 'all' }, viewer, 'all', done).sort(byRecency), [tenant, viewer, done]);
  const libs = useMemo(() => {
    const m = new Map<string, LibraryVM>();
    for (const r of rows) { const l = libraryFor({ tenant, viewer, done }, r.id); if (l) m.set(r.id, l); }
    return m;
  }, [rows, tenant, viewer, done]);
  const total = useMemo(() => [...libs.values()].reduce((n, l) => n + l.count, 0), [libs]);

  // The tender list: find and stage filter stay on this page.
  const [find, setFind] = useState('');
  const [stage, setStage] = useState(0);
  const needle = find.trim().toLowerCase();
  const listed = useMemo(() => rows.filter((r) => (!stage || r.stage === stage)
    && (!needle || `${r.id} ${r.shortTitle} ${r.issuer}`.toLowerCase().includes(needle))), [rows, stage, needle]);

  const asked = params.get('tender');
  // With nothing asked, the hero tender where it is listed: the newest tenders hold only their notice (orchestrator review).
  const selId = asked && libs.has(asked) ? asked : (listed.find((r) => r.id === HERO_ID) ?? listed[0])?.id ?? null;
  const sel = selId ? rows.find((r) => r.id === selId) ?? null : null;
  const lib = selId ? libs.get(selId) ?? null : null;
  const rowExtra = useBookletExtra(tenant, selId);

  // Keep the selected tender in sight in the list (it may sit far down, as the hero does), without moving the page.
  const listBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = listBox.current;
    const item = box?.querySelector<HTMLElement>('.tl-item.sel');
    if (!box || !item) return;
    const b = box.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - (b.height - r.height) / 2;
  }, [selId, listed.length]);

  const select = (id: string, folder?: string) => {
    setParams(() => { const n = new URLSearchParams(); n.set('tender', id); if (folder !== undefined) n.set('folder', folder); return n; });
    setAt(null);
  };

  // The search across every tender's files: each match keeps its tender in its path.
  const q = params.get('q') ?? '';
  const query = useDeferredValue(q.trim().toLowerCase());
  const setQ = (v: string) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set('q', v); else n.delete('q'); return n; }, { replace: true });
  const hits = useMemo<LibraryFileVM[]>(() => {
    if (!query) return [];
    const out: LibraryFileVM[] = [];
    for (const r of rows) {
      for (const f of libs.get(r.id)?.files ?? []) if (fileMatches(f, query)) out.push({ ...f, id: `${r.id}:${f.id}`, path: [r.id, ...f.path] });
    }
    return out;
  }, [query, rows, libs]);
  const hitTenders = useMemo(() => new Set(hits.map((h) => h.path[0])).size, [hits]);
  const tenderOfHit = (f: LibraryFileVM) => f.path[0];

  return (
    <SourceHost>
      <div className="view tl">
        <div className="tl-top">
          <label className="lib-search tl-q">
            <Search size={14} aria-hidden />
            <span className="sr-only">Search every tender's files</span>
            <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setAt(null); }} placeholder="Search every tender's files: an addendum, a booklet, a supplier" />
          </label>
          <span className="lib-count num">{plural(rows.length, 'tender')} · {plural(total, 'file')}</span>
        </div>

        <div className="tl-row">
          <Card className="tl-list-card">
            <CardHead title="Tenders" meta={<span className="num">{listed.length} of {rows.length}</span>} />
            <div className="tl-filters">
              <label className="lib-search">
                <Search size={14} aria-hidden />
                <span className="sr-only">Find a tender by ID or title</span>
                <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder="ID or title" />
              </label>
              <select aria-label="Stage" value={stage} onChange={(e) => setStage(Number(e.target.value))}>
                <option value={0}>All stages</option>
                {GCC_STAGES.map((s) => <option key={s.n} value={s.n}>{stageLabel(s.n)}</option>)}
              </select>
            </div>
            <div className="tl-scroll" ref={listBox}>
              {listed.length ? (
                <ul className="tl-list" aria-label="Tenders">
                  {listed.map((r) => {
                    const on = !q && r.id === selId;
                    return (
                      <li key={r.id}>
                        <button type="button" className={`tl-item ${on ? 'sel' : ''}`} aria-current={on ? 'true' : undefined} onClick={() => select(r.id)}>
                          <span className="tl-id">{r.id}</span>
                          <span className="tl-n num">{plural(libs.get(r.id)?.count ?? 0, 'file')}</span>
                          <span className="tl-t">{r.shortTitle}</span>
                          <span className="tl-s">{stageLabel(r.stage)}{r.live ? '' : ' · Closed'}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : <EmptyState title="No tender matches." body="Find looks at the ID, the title and the issuer." compact />}
            </div>
          </Card>

          <Card className="tl-card-lib">
            {q ? (
              <>
                <CardHead title={`${plural(hits.length, 'file')} ${hits.length === 1 ? 'matches' : 'match'} “${q.trim()}”`} meta={hits.length ? `in ${plural(hitTenders, 'tender')}` : undefined}>
                  <button type="button" className="btn btn-sm" onClick={() => setQ('')}>Clear search</button>
                </CardHead>
                {hits.length
                  ? <FileGrid rows={hits} withFolder folderHead="Found in" onOpen={setAt} fill label="Matching files across your tenders" />
                  : <EmptyState title="No file matches." body="Search looks at file names, sources, people and folders, across every tender you can open." compact />}
                <FileViewer
                  file={at === null ? null : hits[at] ?? null} files={hits} onIndex={setAt} onClose={() => setAt(null)}
                  extra={(f) => (
                    <button type="button" className="btn btn-sm" onClick={() => select(tenderOfHit(f), f.folderId)}>Open its folder</button>
                  )}
                />
              </>
            ) : sel && lib ? (
              <>
                <CardHead title={<><span className="mono tl-hid">{sel.id}</span> {sel.shortTitle}</>} meta={`${stageLabel(sel.stage)}${sel.live ? '' : ' · Closed'}`}>
                  <button type="button" className="btn btn-sm" onClick={() => navigate(`/tenders/${sel.id}?tab=documents`)}>Open tender</button>
                </CardHead>
                <LibraryBrowser key={sel.id} lib={lib} fill rowExtra={rowExtra} readOnly={readOnly} />
              </>
            ) : (
              <EmptyState title="No tender to show." body="The tenders you can open appear on the left." compact />
            )}
          </Card>
        </div>
      </div>
    </SourceHost>
  );
}
