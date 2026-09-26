/// <reference types="vite/client" />
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { DemoProvider, useDemo } from '@/state/store';
import { ThemeProvider } from '@/state/theme';
import { isRoleKey } from '@/data/roles';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Pipeline } from '@/pages/Pipeline';
import { Workflow } from '@/pages/Workflow';
import { Agents } from '@/pages/Agents';
import { Submission } from '@/pages/Submission';
import { Suppliers } from '@/pages/Suppliers';
import { Library } from '@/pages/Library';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';
import { Guard, GuardCap } from '@/pages/Restricted';
import { IntakeList, IntakeReview } from '@/pages/Intake';
import { Boq } from '@/pages/Boq';
import { ComingNext } from '@/pages/gcc/ComingNext';
import { SCREENS } from '@/pages/gcc/screens';
import { LEGACY_TENANT, TENANTS } from '@/data/tenants';
import { useWorld } from '@/domain/tenancy';

/*
 * GCC dashboards, the tender summary and the dev pages load on demand, so AG
 * Grid and Recharts sit in their own chunks and the Indian preview never loads
 * them. The dev pages exist only in development builds.
 */
const DashboardRoute = lazy(() => import('@/pages/gcc/DashboardRoute'));
const StageRoute = lazy(() => import('@/pages/gcc/StageRoute'));
const TenderSummary = lazy(() => import('@/pages/gcc/TenderSummary'));
const GccPending = import.meta.env.DEV ? lazy(() => import('@/pages/gcc/GccPending').then((m) => ({ default: m.GccPending }))) : null;
const KitPreview = import.meta.env.DEV ? lazy(() => import('@/pages/gcc/dev/KitPreview')) : null;

function Loading() {
  return <div className="view" aria-busy="true"><p className="eyebrow">Loading…</p></div>;
}

const lazyEl = (el: ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>;

/** Legacy screens read Indian data, so they never render for a GCC tenant. */
function LegacyOnly({ children }: { children: ReactNode }) {
  const gcc = useWorld() === 'gcc';
  const { toast } = useDemo();
  const told = useRef(false);
  useEffect(() => {
    if (!gcc || told.current) return;
    told.current = true;
    toast(`That screen belongs to the full-lifecycle preview (${TENANTS.find((t) => t.key === LEGACY_TENANT)!.name})`, 'ink3');
  }, [gcc, toast]);
  return gcc ? <Navigate to="/" replace /> : <>{children}</>;
}

/** GCC screens read GCC data, so they never render for the Indian preview. */
function GccOnly({ children }: { children: ReactNode }) {
  return useWorld() === 'gcc' ? <>{children}</> : <NotFound />;
}

/** One path, two worlds (the legacy supplier database and the GCC supplier screen). */
function ByWorld({ legacy, gcc }: { legacy: ReactNode; gcc: ReactNode }) {
  return <>{useWorld() === 'gcc' ? gcc : legacy}</>;
}

/** `/dashboard/:role` is the Indian preview's; a GCC tenant has one dashboard route, `/`. */
function LegacyDashboardRoute() {
  const gcc = useWorld() === 'gcc';
  return gcc ? <Navigate to="/" replace /> : <LegacyDashboard />;
}

function LegacyDashboard() {
  const { role } = useParams();
  const { state, setRole } = useDemo();
  useEffect(() => {
    if (isRoleKey(role) && role !== state.role) setRole(role);
  }, [role, state.role, setRole]);
  if (!isRoleKey(role)) return <Navigate to={`/dashboard/${state.role}`} replace />;
  return <Dashboard role={role} />;
}

function Home() {
  const { state } = useDemo();
  const gcc = useWorld() === 'gcc';
  return gcc ? lazyEl(<DashboardRoute />) : <Navigate to={`/dashboard/${state.role}`} replace />;
}

/** The built GCC screens' pages, loaded on demand (`pages/gcc/screens.ts`). */
const SCREEN_PAGES = Object.fromEntries(
  Object.entries(SCREENS).flatMap(([path, s]) => (s.built && s.page ? [[path, lazy(s.page)]] : [])),
);

/** A GCC working screen: its page behind the screen's capability once built, `ComingNext` until then. */
function GccScreen({ path }: { path: string }) {
  const Page = SCREEN_PAGES[path];
  if (!Page) return <ComingNext path={path} />;
  const cap = SCREENS[path].cap;
  return cap ? <GuardCap cap={cap}>{lazyEl(<Page />)}</GuardCap> : lazyEl(<Page />);
}

/** Paths the Indian preview also uses: the GCC screen replaces them in a GCC tenant. */
const LEGACY_AT: Record<string, ReactNode> = {
  '/suppliers': <LegacyOnly><Guard page="suppliers"><Suppliers /></Guard></LegacyOnly>,
};

/** One route per entry in `SCREENS`, so a new screen is added there and nowhere else. */
const screenRoutes = () => Object.keys(SCREENS).map((path) => {
  const gcc = <GccScreen path={path} />;
  const legacy = LEGACY_AT[path];
  return <Route key={path} path={path.slice(1)} element={legacy ? <ByWorld legacy={legacy} gcc={gcc} /> : <GccOnly>{gcc}</GccOnly>} />;
});

export function App() {
  return (
    <ThemeProvider>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Home />} />
              <Route path="dashboard/:role" element={<LegacyDashboardRoute />} />
              <Route path="pipeline" element={<LegacyOnly><Pipeline /></LegacyOnly>} />
              <Route path="workflow" element={<LegacyOnly><Workflow /></LegacyOnly>} />
              <Route path="agents" element={<LegacyOnly><Guard page="agents"><Agents /></Guard></LegacyOnly>} />
              <Route path="submission" element={<LegacyOnly><Guard page="submission"><Submission /></Guard></LegacyOnly>} />
              <Route path="library" element={<LegacyOnly><Guard page="library"><Library /></Guard></LegacyOnly>} />
              <Route path="intake" element={<LegacyOnly><Guard page="intake"><IntakeList /></Guard></LegacyOnly>} />
              <Route path="intake/:id" element={<LegacyOnly><Guard page="intake"><IntakeReview /></Guard></LegacyOnly>} />
              <Route path="boq" element={<LegacyOnly><Guard page="boq"><Boq /></Guard></LegacyOnly>} />
              <Route path="settings" element={<Settings />} />

              {/* GCC (dashboards.md §8) */}
              <Route path="stages/:n" element={<GccOnly>{lazyEl(<StageRoute />)}</GccOnly>} />
              <Route path="requests" element={<GccOnly>{lazyEl(<DashboardRoute dashboardKey="requests" />)}</GccOnly>} />
              <Route path="tenders/:id" element={<GccOnly>{lazyEl(<TenderSummary />)}</GccOnly>} />
              {screenRoutes()}
              {GccPending && <Route path="dev/checks" element={<GccOnly>{lazyEl(<GccPending />)}</GccOnly>} />}
              {KitPreview && <Route path="dev/kit" element={<GccOnly>{lazyEl(<KitPreview />)}</GccOnly>} />}

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </ThemeProvider>
  );
}
