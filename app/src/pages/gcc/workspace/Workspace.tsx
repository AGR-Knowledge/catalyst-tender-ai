import { Component, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { can, holdersOf, type CanCtx, type Capability } from '@/data/access';
import { useDemo } from '@/state/store';
import { useTenantKey } from '@/domain/tenancy';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { dataPort } from '@/domain/gcc/port';
import { queriesFor, tenderCtx } from '@/domain/gcc/lifecycle.port';
import { workspaceHeader, workspaceRail } from '@/domain/gcc/workspace';
import { Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { Masked } from '@/components/tender/Masked';
import { SourceHost } from '@/components/tender/SourceHost';
import { Tabs, tabPanelProps, type TabItem } from '@/components/tender/Tabs';
import { WorkspaceHeader } from './WorkspaceHeader';
import { Rail } from './Rail';
import { WORKSPACE_TABS, type WorkspaceCtx, type WorkspaceTabDef } from './tabs';
import '@/components/dashboard/dashboard.css';
import './workspace.css';

/**
 * `/tenders/:id`, the Tender Workspace (spec §4.1, ui-direction §5 C2):
 * everything about one bid. A sticky header and tabs; the tab's content on
 * the left (8/12) and the rail on the right (4/12), under the content below
 * 1280 px. Every "Open tender" in the demo lands here. Data comes only
 * through the port and the bound lifecycle queries, always with `done`, so
 * actions taken in the demo show here too.
 */

const PREFIX = 'ws';

/** A tab's own crash stays in its panel. */
function safe<T>(what: string, fn: () => T, fallback: T): T {
  try { return fn(); } catch (e) { console.error(`${what} failed`, e); return fallback; }
}

/** A tab panel or the rail that throws while rendering shows a quiet card, not a blank page, mid-demo. */
class PanelBoundary extends Component<{ what: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(`${this.props.what} failed`, error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <Card><EmptyState title={`${this.props.what} could not be shown.`} body="The rest of the tender is unaffected." /></Card>;
  }
}

export default function Workspace() {
  const id = decodeURIComponent(useParams().id ?? '');
  const { state } = useDemo();
  const tenant = useTenantKey();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const port = dataPort();
  const { person, done, audit } = state;
  const viewAs = !!state.viewAs;

  const row = useMemo(() => port?.rows(tenant, { kind: 'all' }, person, 'all', done).find((r) => r.id === id) ?? null, [port, tenant, person, done, id]);
  const tracker = useMemo(() => (row ? port?.tracker(tenant, id, person, done) ?? null : null), [port, tenant, person, done, id, row]);
  const canCtx = useMemo<CanCtx>(() => {
    const l = queriesFor({ tenant, viewer: person, done }).one(id);
    return { ...(l ? tenderCtx(tenant, l) : {}), viewAs };
  }, [tenant, person, done, id, viewAs]);

  const openTab = useCallback((tab: string) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (tab === 'overview') n.delete('tab'); else n.set('tab', tab);
      return n;
    }, { replace: true });
  }, [setParams]);

  // The tabs this viewer gets on this tender; a tab that doesn't apply is absent, never empty.
  const base = useMemo(() => (row ? {
    tenant, tenderId: id, row, tracker, viewer: person, viewAs, done, audit, now: DEMO_NOW,
    can: (cap: Capability) => can(person, cap, canCtx).ok,
    check: (cap: Capability, extra?: Partial<CanCtx>) => can(person, cap, { ...canCtx, ...extra }),
    openTab,
  } : null), [row, tenant, id, tracker, person, viewAs, done, audit, canCtx, openTab]);
  const shown = useMemo<WorkspaceTabDef[]>(() => {
    if (!base) return [];
    const probe: WorkspaceCtx = { ...base, hasTab: () => false };
    return WORKSPACE_TABS.filter((t) => safe(`Tab ${t.id} shows`, () => t.shows(probe), false));
  }, [base]);
  const ctx = useMemo<WorkspaceCtx | null>(() => (base ? { ...base, hasTab: (t: string) => shown.some((x) => x.id === t) } : null), [base, shown]);

  const header = useMemo(() => (row ? workspaceHeader({ tenant, viewer: person, done }, row, tracker) : null), [tenant, person, done, row, tracker]);
  const rail = useMemo(() => (row ? workspaceRail({ tenant, viewer: person, viewAs, done, now: DEMO_NOW, row, tracker }) : null), [tenant, person, viewAs, done, row, tracker]);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));
  const backBtn = <button type="button" className="btn btn-sm" onClick={back}><ChevronLeft size={13} aria-hidden />Back</button>;

  if (!port) {
    return <div className="view"><Card><EmptyState title="Tender data is not loaded yet." body="The workspace fills in once the tender lifecycles are loaded." action={backBtn} /></Card></div>;
  }
  if (!row || !ctx || !header || !rail) {
    return <div className="view"><Card><EmptyState title={`No tender ${id} here.`} body="It may belong to another company, or not be shared with you." action={backBtn} /></Card></div>;
  }

  const want = params.get('tab') ?? 'overview';
  const active = shown.find((t) => t.id === want) ?? shown.find((t) => t.id === 'overview') ?? shown[0];
  const items: TabItem[] = shown.map((t) => ({
    id: t.id, label: t.label, locked: !!t.cap && !ctx.can(t.cap),
    badge: t.badge && (!t.cap || ctx.can(t.cap)) ? safe(`Tab ${t.id} badge`, () => t.badge!(ctx), null) : null,
  }));
  const Panel = active?.Panel;
  const locked = active?.cap && !ctx.can(active.cap);

  return (
    <SourceHost>
      <div className="view ws">
        <WorkspaceHeader
          vm={header} onBack={back}
          tabs={active && <Tabs tabs={items} active={active.id} onChange={openTab} label={`${row.id} sections`} prefix={PREFIX} />}
        />
        <div className="ws-grid">
          <div className="ws-main" {...(active ? tabPanelProps(PREFIX, active.id) : {})}>
            {!active || !Panel ? <Card><EmptyState title="Nothing to show on this tender yet." /></Card>
              : locked ? (
                <Card>
                  <EmptyState
                    title={`${active.label} is masked for your role.`}
                    body={<Masked by={holdersOf(active.cap!)} />}
                  />
                </Card>
              ) : <PanelBoundary key={active.id} what={active.label}><Panel ctx={ctx} /></PanelBoundary>}
          </div>
          <aside className="ws-rail" aria-label="Recommendation, next actions, key dates and blockers">
            <PanelBoundary what="The rail"><Rail vm={rail} ctx={ctx} /></PanelBoundary>
          </aside>
        </div>
      </div>
    </SourceHost>
  );
}
