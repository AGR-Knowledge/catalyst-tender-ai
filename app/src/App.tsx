/// <reference types="vite/client" />
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
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
import { can } from '@/data/access';
import { isSignedIn } from '@/state/auth';
import { Login } from '@/pages/login/Login';

/*
 * GCC dashboards, the tender summary and the dev pages load on demand, so AG
 * Grid and Recharts sit in their own chunks and the Indian preview never loads
 * them. The dev pages exist only in development builds.
 */
const DashboardRoute = lazy(() => import('@/pages/gcc/DashboardRoute'));
const StageRoute = lazy(() => import('@/pages/gcc/StageRoute'));
const Workspace = lazy(() => import('@/pages/gcc/workspace/Workspace'));
/* A supplier's full profile (plan 031). */
const SupplierProfile = lazy(() => import('@/pages/gcc/suppliers/SupplierProfile'));
const SupplierPortal = lazy(() => import('@/pages/gcc/supplier/SupplierPortal'));
/* The presenter's Compare tenants lens (plan 014): a labelled demo view. */
const Compare = lazy(() => import('@/pages/gcc/demo/Compare'));
const GccPending = import.meta.env.DEV ? lazy(() => import('@/pages/gcc/GccPending').then((m) => ({ default: m.GccPending }))) : null;
const KitPreview = import.meta.env.DEV ? lazy(() => import('@/pages/gcc/dev/KitPreview')) : null;
/* The Catalyst Platform Console (plan 011): its own shell, outside the tenant's. */
const PlatformShell = lazy(() => import('@/pages/platform/PlatformShell'));
const PlatformConsole = lazy(() => import('@/pages/platform/Console'));

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
  // The Catalyst operator has no tenant home: theirs is the Platform Console (plan 011).
  if (can(state.realPerson, 'platform.console').ok) return <Navigate to="/platform" replace />;
  // The supplier persona has no dashboard: it lands in the Supplier Portal (plan 008b).
  if (gcc && can(state.person, 'portal.rfq').ok) return <Navigate to="/supplier-portal" replace />;
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
  '/library': <LegacyOnly><Guard page="library"><Library /></Guard></LegacyOnly>,
};

/** One route per entry in `SCREENS`, so a new screen is added there and nowhere else. */
const screenRoutes = () => Object.keys(SCREENS).map((path) => {
  const gcc = <GccScreen path={path} />;
  const legacy = LEGACY_AT[path];
  return <Route key={path} path={path.slice(1)} element={legacy ? <ByWorld legacy={legacy} gcc={gcc} /> : <GccOnly>{gcc}</GccOnly>} />;
});

/** Every route but `/login` opens only once signed in (plan 038); the way back is kept in `next`. */
function RequireLogin() {
  const { pathname, search, hash } = useLocation();
  if (isSignedIn()) return <Outlet />;
  const back = pathname + search + hash;
  return <Navigate replace to={back === '/' ? '/login' : `/login?next=${encodeURIComponent(back)}`} />;
}

export function App() {
  return (
    <ThemeProvider>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            {/* The sign-in page (plan 038): outside the gate, loaded eagerly so it paints with no loading flash. */}
            <Route path="login" element={<Login />} />
            <Route element={<RequireLogin />}>
              {/* The Supplier Portal preview has its own light shell (plan 008b). */}
              <Route path="supplier-portal" element={<GccOnly>{lazyEl(<SupplierPortal />)}</GccOnly>} />
              <Route element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="dashboard" element={<Home />} />
                <Route path="dashboard/:role" element={<LegacyDashboardRoute />} />
                <Route path="pipeline" element={<LegacyOnly><Pipeline /></LegacyOnly>} />
                <Route path="workflow" element={<Workflow />} />
                <Route path="agents" element={<LegacyOnly><Guard page="agents"><Agents /></Guard></LegacyOnly>} />
                <Route path="submission" element={<LegacyOnly><Guard page="submission"><Submission /></Guard></LegacyOnly>} />
                <Route path="intake" element={<LegacyOnly><Guard page="intake"><IntakeList /></Guard></LegacyOnly>} />
                <Route path="intake/:id" element={<LegacyOnly><Guard page="intake"><IntakeReview /></Guard></LegacyOnly>} />
                <Route path="boq" element={<LegacyOnly><Guard page="boq"><Boq /></Guard></LegacyOnly>} />
                <Route path="settings" element={<Settings />} />

                {/* GCC (dashboards.md §8) */}
                <Route path="stages/:n" element={<GccOnly>{lazyEl(<StageRoute />)}</GccOnly>} />
                <Route path="requests" element={<GccOnly>{lazyEl(<DashboardRoute dashboardKey="requests" />)}</GccOnly>} />
                <Route path="tenders/:id" element={<GccOnly>{lazyEl(<Workspace />)}</GccOnly>} />
                <Route path="suppliers/:id" element={<GccOnly><GuardCap cap="supplier.view">{lazyEl(<SupplierProfile />)}</GuardCap></GccOnly>} />
                <Route path="demo/compare" element={<GccOnly>{lazyEl(<Compare />)}</GccOnly>} />
                {screenRoutes()}
                {GccPending && <Route path="dev/checks" element={<GccOnly>{lazyEl(<GccPending />)}</GccOnly>} />}
                {KitPreview && <Route path="dev/kit" element={<GccOnly>{lazyEl(<KitPreview />)}</GccOnly>} />}

                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Catalyst Platform Console (plan 011): a separate shell, for Catalyst operators only */}
              <Route path="platform" element={lazyEl(<PlatformShell />)}>
                <Route index element={lazyEl(<PlatformConsole />)} />
                <Route path="*" element={<Navigate to="/platform" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </ThemeProvider>
  );
}
