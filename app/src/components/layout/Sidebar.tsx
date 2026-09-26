import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bot, Briefcase, Building2, CalendarDays, FileUp, Calculator, ChevronRight, Columns3, Factory, FileText, HardHat, Inbox, Landmark, LayoutGrid,
  Library, PackageSearch, PanelLeftClose, PanelLeftOpen, Send, Settings as SettingsIcon, ShieldCheck, SlidersHorizontal, Table2, Workflow, X,
} from 'lucide-react';
import type { RoleKey, Tone } from '@/data/types';
import { roleOf } from '@/data/roles';
import { ROLE_NAV, navFor, type GccNavItem, type RoleNavItem } from '@/data/access';
import { stageOf } from '@/data/gcc/stages';
import { homeDashboardKey, stageDashboardKey } from '@/domain/gcc/dashboards/home';
import { useGateChipState } from '@/domain/gcc/gateChips';
import type { GateKey } from '@/domain/gcc/viewmodels';
import { GateChip } from '@/components/tender/GateChip';
import { AGENTS, LIBRARY_STATS, SUPPLIER_TOTAL } from '@/data/catalog';
import { PROJECTS, REDLINES, REPRICE_LOG } from '@/data/workspace';
import { useDemo } from '@/state/store';
import { useLive, type Live } from '@/domain/live';
import { useGo } from '@/state/nav';
import { useWorld } from '@/domain/tenancy';
import { tc } from '@/components/ui/primitives';

interface Item { key: string; label: string; tag?: string; tone?: Tone; path?: string; anchor?: string; icon?: ReactNode }

const I = { size: 16, strokeWidth: 1.6, 'aria-hidden': true } as const;

/** Icon for each page a persona can open. Sections inside a dashboard sit in the tree without one. */
const PAGE_ICON: Record<string, ReactNode> = {
  dash: <LayoutGrid {...I} />, pipeline: <Columns3 {...I} />, workflow: <Workflow {...I} />, settings: <SettingsIcon {...I} />,
  submission: <Send {...I} />, intake: <FileUp {...I} />, boq: <Table2 {...I} />, suppliers: <Factory {...I} />, library: <Library {...I} />, agents: <Bot {...I} />,
};

/** Icon for the persona's own dashboard, which heads the expandable tree of its sections. */
const ROLE_ICON: Record<RoleKey, ReactNode> = {
  coord: <Inbox {...I} />, bid: <Briefcase {...I} />, proc: <PackageSearch {...I} />, exec: <Landmark {...I} />,
  comm: <Calculator {...I} />, prop: <FileText {...I} />, comp: <ShieldCheck {...I} />, dir: <HardHat {...I} />,
  // GCC role keys (plan 003): the legacy tree never renders for them; plan 006 builds the GCC sidebar.
  hot: <LayoutGrid {...I} />, member: <LayoutGrid {...I} />, plan: <LayoutGrid {...I} />, fin: <LayoutGrid {...I} />,
  hr: <LayoutGrid {...I} />, supplier: <LayoutGrid {...I} />, platform: <LayoutGrid {...I} />,
};

const MINI_KEY = 'ctai.sidebar.mini';
const readMini = () => { try { return localStorage.getItem(MINI_KEY) === '1'; } catch { return false; } };

/** The off-canvas drawer below 1100px never collapses to icons. */
function useWide() {
  const q = '(min-width: 1101px)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = (e: MediaQueryListEvent) => setWide(e.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

type Badge = { tag: string; tone?: Tone } | null;

/** Live badge for each sidebar entry. Derived from state, never typed in. */
function badge(key: string, l: Live): Badge {
  const openRedlines = REDLINES.filter((r) => r.status === 'Open' && !l.is('redline-' + r.key)).length;
  switch (key) {
    case 'queue': return l.validationsOpen.length ? { tag: `${l.validationsOpen.length} open`, tone: 'orange' } : { tag: 'clear', tone: 'green' };
    case 'intake': return { tag: '5' };
    case 'today': { const n = l.myDg1Ready.length + l.blockers.length; return n ? { tag: String(n), tone: l.myDg1Ready.length ? 'red' : 'orange' } : { tag: 'clear', tone: 'green' }; }
    case 'register': return { tag: String(l.mine.length) };
    case 'boq': return { tag: String(l.boqTenders) };
    case 'uploads': return l.uploadsToReview ? { tag: String(l.uploadsToReview), tone: 'orange' } : null;
    case 'resources': return l.clashesOpen ? { tag: String(l.clashesOpen), tone: 'orange' } : { tag: 'clear', tone: 'green' };
    case 'submission': return { tag: 'M3', tone: l.submitted ? 'green' : l.canSubmit ? 'orange' : 'muted' };
    case 'board': return { tag: String(l.awaitingBuyer), tone: l.awaitingBuyer ? 'orange' : 'green' };
    case 'scenarios': return { tag: 'M2', tone: l.m2Frozen ? 'green' : 'orange' };
    case 'reprice': return { tag: String(REPRICE_LOG.length) };
    case 'sections': return { tag: String(l.sections.sme), tone: l.smeOverdue ? 'orange' : 'muted' };
    case 'matrix': return { tag: String(l.openGaps), tone: l.gaps.critical ? 'red' : 'muted' };
    case 'gaps': return { tag: 'DG3', tone: l.dg3 === 'blocked' ? 'red' : l.dg3 === 'ready' ? 'orange' : 'green' };
    case 'redlines': return openRedlines ? { tag: `${openRedlines} open`, tone: 'red' } : { tag: 'clear', tone: 'green' };
    case 'decisions': return l.dg2Pending.length ? { tag: String(l.dg2Pending.length), tone: 'orange' } : { tag: 'clear', tone: 'green' };
    case 'projects': return { tag: String(PROJECTS.length) };
    case 'deviations': return { tag: String(l.atRisk), tone: l.atRisk ? 'orange' : 'green' };
    case 'learning': return l.is('loop') ? { tag: 'Forum', tone: 'cyan' } : { tag: '1', tone: 'orange' };
    case 'agents': return { tag: String(AGENTS.length) };
    case 'suppliers': return { tag: String(SUPPLIER_TOTAL) };
    case 'library': return { tag: `${(LIBRARY_STATS.artefacts / 1000).toFixed(1)}k` };
    default: return null;
  }
}

/* ------------------------------------------------------------------ GCC navigation */

/** Icons for the GCC entries that aren't stages; stages show their number in a circle. */
const GCC_ICON: Record<string, ReactNode> = {
  dashboard: <LayoutGrid {...I} />, calendar: <CalendarDays {...I} />, requests: <Inbox {...I} />,
  company: <Building2 {...I} />, admin: <SlidersHorizontal {...I} />, settings: <SettingsIcon {...I} />,
};

/** Which trees each viewer has folded or unfolded: `{ personId: { itemKey: open } }`. A convenience only. */
const NAV_OPEN_KEY = 'ctai.nav.open';
type OpenPrefs = Record<string, boolean>;
function readOpenAll(): Record<string, OpenPrefs> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(NAV_OPEN_KEY) ?? '{}');
    return v && typeof v === 'object' ? (v as Record<string, OpenPrefs>) : {};
  } catch { return {}; }
}
function writeOpen(personId: string, prefs: OpenPrefs) {
  try { localStorage.setItem(NAV_OPEN_KEY, JSON.stringify({ ...readOpenAll(), [personId]: prefs })); } catch { /* the rail still works */ }
}

const onPath = (path: string, pathname: string) =>
  path === '/' ? pathname === '/' || pathname === '/dashboard' : pathname === path || pathname.startsWith(`${path}/`);

function LiveGateChip({ gate }: { gate: GateKey }) {
  return <GateChip gate={gate} state={useGateChipState(gate)} />;
}

/**
 * The GCC rail (dashboards.md §8.3): Dashboard, Calendar and My requests; the
 * stages the person may open, each header opening its stage dashboard and a
 * chevron unfolding its screens; Company; Administration and Settings pinned
 * at the bottom. Entries come from `navFor`, so access stays in access.ts.
 */
function GccNav({ mini, onClose }: { mini: boolean; onClose(): void }) {
  const { state } = useDemo();
  const person = state.person;
  const { goPage } = useGo();
  const { pathname } = useLocation();
  const home = homeDashboardKey(person);

  // My requests is hidden where it is already the home (Finance, HR), as a home stage is a plain label.
  const groups = useMemo(() => navFor(person).map((g) => (
    home === 'requests' ? { ...g, items: g.items.filter((it) => it.key !== 'requests') } : g
  )), [person, home]);

  const isHomeStage = (it: GccNavItem) => it.stage !== undefined && stageDashboardKey(it.stage) === home;

  // The entry for this route is the longest path that matches it.
  const entries = groups.flatMap((g) => g.items.flatMap((it) => [
    { it, parent: null as GccNavItem | null }, ...(it.children ?? []).map((c) => ({ it: c, parent: it })),
  ]));
  const hit = entries.filter((e) => onPath(e.it.path, pathname)).sort((a, b) => b.it.path.length - a.it.path.length)[0];
  const current = hit?.it.key ?? (home === 'requests' && pathname === '/requests' ? 'dashboard' : null);
  const currentTree = hit ? (hit.parent?.key ?? (hit.it.children?.length ? hit.it.key : null)) : null;

  const [prefs, setPrefs] = useState<OpenPrefs>(() => readOpenAll()[person.id] ?? {});
  useEffect(() => setPrefs(readOpenAll()[person.id] ?? {}), [person.id]);
  // Arriving on a screen unfolds the group that holds it.
  useEffect(() => {
    if (currentTree) setPrefs((p) => (p[currentTree] ? p : { ...p, [currentTree]: true }));
  }, [currentTree]);

  const setOpen = (key: string, open: boolean) => {
    const next = { ...prefs, [key]: open };
    setPrefs(next);
    writeOpen(person.id, next);
  };

  const go = (it: GccNavItem) => {
    onClose();
    // Re-selecting the page you are on takes you back to its top.
    if (current === it.key) return window.scrollTo({ top: 0, behavior: 'smooth' });
    goPage(it.path);
  };

  const icon = (it: GccNavItem) => (it.stage ? <span className="sb-num">{it.stage}</span> : GCC_ICON[it.key] ?? <span className="sb-ic-gap" />);
  const text = (it: GccNavItem) => (it.stage ? stageOf(it.stage)?.short ?? it.label : it.label);

  const leaf = (it: GccNavItem, child = false) => {
    const on = current === it.key;
    return (
      <button
        type="button" key={it.key} className={`sb-item ${child ? 'child' : ''} ${on ? 'on' : ''}`}
        onClick={() => go(it)} aria-current={on ? 'page' : undefined} title={mini ? it.label : undefined}
      >
        {!child && icon(it)}
        <span className="lbl">{text(it)}</span>
        {it.gate && <LiveGateChip gate={it.gate} />}
      </button>
    );
  };

  // A home stage without screens: its Dashboard item already opens it.
  const plain = (it: GccNavItem) => (
    <div key={it.key} className="sb-item sb-plain" title={mini ? it.label : undefined}>
      {icon(it)}
      <span className="lbl">{text(it)}</span>
    </div>
  );

  const tree = (it: GccNavItem) => {
    const isHome = isHomeStage(it);
    // A home stage, or a stage outside the role that holds one of the person's screens: the header is a label.
    const plainHead = isHome || !!it.labelOnly;
    const on = current === it.key;
    const hasOn = !!it.children?.some((c) => c.key === current);
    const open = !mini && (prefs[it.key] ?? plainHead);
    const name = text(it);
    return (
      <div key={it.key} className={`sb-tree sb-stage ${open ? 'open' : ''} ${hasOn ? 'has-on' : ''}`}>
        <div className={`sb-item sb-tree-head ${on ? 'on' : ''} ${plainHead ? 'sb-plain' : ''}`}>
          {plainHead ? (
            <span className="sb-tree-link" title={mini ? it.label : undefined}>{icon(it)}<span className="lbl">{name}</span></span>
          ) : (
            <button type="button" className="sb-tree-link" onClick={() => go(it)} aria-current={on ? 'page' : undefined} title={mini ? it.label : undefined}>
              {icon(it)}<span className="lbl">{name}</span>
            </button>
          )}
          <button type="button" className="sb-tree-chev" onClick={() => setOpen(it.key, !open)} aria-expanded={open} aria-label={open ? `Fold ${name} screens` : `Show ${name} screens`}>
            <ChevronRight className="chev" size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        {/* A folded tree keeps its links out of the tab order (React 18 has no typed `inert` prop). */}
        <div className="sb-tree-body" ref={(el) => el?.toggleAttribute('inert', !open)}>
          <div className="sb-tree-inner">{it.children!.map((c) => leaf(c, true))}</div>
        </div>
      </div>
    );
  };

  const entry = (it: GccNavItem) => (it.children?.length ? tree(it) : isHomeStage(it) ? plain(it) : leaf(it));
  const bottom = groups.find((g) => g.pinned === 'bottom');

  return (
    <>
      <nav className="sb-nav" key={`${state.tenant}:${person.id}`}>
        {groups.filter((g) => g !== bottom).map((g) => (
          <div className="sb-group" key={g.key}>
            {g.label && <div className="sb-group-label"><span>{g.label}</span></div>}
            {g.items.map(entry)}
          </div>
        ))}
      </nav>
      {bottom && <div className="sb-pinned">{bottom.items.map(entry)}</div>}
    </>
  );
}

/* --------------------------------------------------------------------- the rail */

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useDemo();
  const live = useLive();
  const { goRole, goSection, goPage } = useGo();
  const loc = useLocation();
  const role = roleOf(state.role);
  const gcc = useWorld() === 'gcc';
  const wide = useWide();
  const [miniPref, setMiniPref] = useState(readMini);
  const mini = wide && miniPref;
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  useEffect(() => setClosed({}), [state.role]);

  const setMini = (v: boolean) => {
    setMiniPref(v);
    try { localStorage.setItem(MINI_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  // "[" collapses and expands the sidebar, as in most desk tools.
  useEffect(() => {
    if (!wide) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, [contenteditable]')) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      setMini(!miniPref);
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [wide, miniPref]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDashboard = loc.pathname.startsWith('/dashboard');
  const navState = (loc.state as { nav?: string } | null)?.nav;
  const page = loc.pathname.slice(1).split('/')[0];
  const current = onDashboard ? navState ?? 'dash' : page === 'intake' ? 'uploads' : page;

  const toItem = (i: RoleNavItem): Item => ({
    key: i.key, label: i.label, anchor: i.anchor, path: i.page ? `/${i.page}` : undefined, icon: i.page ? PAGE_ICON[i.page] : undefined, ...badge(i.key, live),
  });

  // The persona's dashboard and its sections are one tree, so the dashboard is never listed twice.
  // Pages in the persona's own group (submission desk, uploads, BOQ) sit flat alongside Pipeline and Workflow.
  const [own, ...rest] = ROLE_NAV[state.role];
  const top: Item[] = [
    { key: 'pipeline', label: 'Pipeline', tag: String(live.active.length), path: '/pipeline', icon: PAGE_ICON.pipeline },
    { key: 'workflow', label: 'Workflow', path: '/workflow', icon: PAGE_ICON.workflow },
    ...own.items.filter((i) => i.page).map(toItem),
  ];
  const settings: Item = { key: 'settings', label: 'Settings', path: '/settings', icon: PAGE_ICON.settings };

  const activate = (it: Item) => {
    onClose();
    // Re-selecting the page you are on takes you back to its top.
    if (current === it.key) return window.scrollTo({ top: 0, behavior: 'smooth' });
    if (it.path) return goPage(it.path);
    if (it.anchor) return goSection(it.anchor, it.key);
    goRole(state.role, { nav: 'dash' });
  };

  const renderItem = (it: Item, child = false) => {
    const on = current === it.key;
    return (
      <button
        type="button" key={it.key} className={`sb-item ${child ? 'child' : ''} ${on ? 'on' : ''}`}
        onClick={() => activate(it)} aria-current={on ? 'page' : undefined} title={mini ? it.label : undefined}
      >
        {!child && (it.icon ?? <span className="sb-ic-gap" />)}
        <span className="lbl">{it.label}</span>
        {it.tag && <span className={`tag ${tc(it.tone)}`}>{it.tag}</span>}
      </button>
    );
  };

  const ownItems = own.items.filter((i) => i.anchor).map(toItem);
  const dashOn = current === 'dash';
  const ownOpen = !mini && !closed[own.label];
  const ownHasCurrent = ownItems.some((i) => i.key === current);
  // A folded tree keeps its links out of the tab order (React 18 has no typed `inert` prop).
  const treeBody = useRef<HTMLDivElement>(null);
  useEffect(() => { treeBody.current?.toggleAttribute('inert', !ownOpen); }, [ownOpen, gcc]);
  const toggleOwn = () => setClosed((c) => ({ ...c, [own.label]: !c[own.label] }));
  // The head opens the dashboard; opening it also unfolds the tree.
  const openDash = () => {
    setClosed((c) => ({ ...c, [own.label]: false }));
    activate({ key: 'dash', label: role.view });
  };

  return (
    <>
      {open && <div className="sb-scrim" onClick={onClose} aria-hidden />}
      <aside className={`sidebar ${open ? 'open' : ''} ${mini ? 'mini' : ''} ${gcc ? 'branded' : ''}`} aria-label="Primary navigation">
        <div className="sb-brand">
          <div className="sb-logo" aria-hidden>C</div>
          <div className="sb-brand-tx">
            <div className="sb-name">Catalyst</div>
            <div className="sb-tag">Tender workbench</div>
          </div>
          {wide && (
            <button
              type="button" className="btn btn-icon sb-toggle" onClick={() => setMini(!mini)}
              aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'} title={mini ? 'Expand sidebar  [' : 'Collapse sidebar  ['}
            >
              {mini ? <PanelLeftOpen {...I} /> : <PanelLeftClose {...I} />}
            </button>
          )}
          <button type="button" className="btn btn-icon sb-close" onClick={onClose} aria-label="Close navigation"><X /></button>
        </div>
        {gcc ? <GccNav mini={mini} onClose={onClose} /> : (
        <>
        <nav className="sb-nav" key={state.role}>
          <div className={`sb-tree ${ownOpen ? 'open' : ''} ${ownHasCurrent ? 'has-on' : ''}`}>
            <div className={`sb-item sb-tree-head ${dashOn ? 'on' : ''}`}>
              <button type="button" className="sb-tree-link" onClick={openDash} aria-current={dashOn ? 'page' : undefined} title={mini ? role.view : undefined}>
                {ROLE_ICON[state.role]}
                <span className="lbl">{role.view}</span>
              </button>
              <button type="button" className="sb-tree-chev" onClick={toggleOwn} aria-expanded={ownOpen} aria-label={ownOpen ? `Fold ${role.view} sections` : `Show ${role.view} sections`}>
                <ChevronRight className="chev" size={14} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
            <div className="sb-tree-body" ref={treeBody}>
              <div className="sb-tree-inner">{ownItems.map((it) => renderItem(it, true))}</div>
            </div>
          </div>

          <div className="sb-group">{top.map((it) => renderItem(it))}</div>

          {rest.map((g) => (
            <div className="sb-group" key={g.label}>
              <div className="sb-group-label"><span>{g.label}</span></div>
              {g.items.map(toItem).map((it) => renderItem(it))}
            </div>
          ))}
        </nav>
        <div className="sb-pinned">{renderItem(settings)}</div>
        </>
        )}
        <div className="sb-foot" title={mini ? `${AGENTS.length} agents, orchestrator healthy` : undefined}>
          <span className="dot" aria-hidden />
          <span className="lbl">{AGENTS.length} agents running, all healthy</span>
        </div>
      </aside>
    </>
  );
}
