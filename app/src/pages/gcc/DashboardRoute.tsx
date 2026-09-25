/// <reference types="vite/client" />
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { can } from '@/data/access';
import { useDemo } from '@/state/store';
import { useTenant } from '@/domain/tenancy';
import { DEMO_TIME, DEMO_TODAY, whenText } from '@/domain/calendar';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { usePeriod } from '@/domain/gcc/period';
import { dataPort } from '@/domain/gcc/port';
import { dashboardSpec, type DashboardSpec } from '@/domain/gcc/dashboards';
import { buildDashboard, dashboardCtx } from '@/domain/gcc/dashboards/build';
import { homeDashboardKey } from '@/domain/gcc/dashboards/home';
import { Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { DashboardPage } from '@/components/dashboard/DashboardPage';

/**
 * A GCC dashboard route: the viewer's home at `/`, a stage at `/stages/:n`, or
 * My requests. It finds the spec, builds the view model from the registries
 * and the data port, and renders the one dashboard layout.
 */
export function DashboardRoute({ dashboardKey }: { dashboardKey?: string }) {
  const { state } = useDemo();
  const person = state.person;
  const key = dashboardKey ?? homeDashboardKey(person);
  if (!key) {
    const where = can(person, 'portal.rfq').ok ? 'The Supplier Portal arrives with plan 008.'
      : can(person, 'platform.console').ok ? 'The Platform Console arrives with plan 011.' : 'This role has no dashboard.';
    return <div className="view"><Card><EmptyState title="This role works in its own shell." body={where} /></Card></div>;
  }
  const spec = dashboardSpec(key);
  if (!spec) {
    return (
      <div className="view">
        <Card>
          <EmptyState
            title="This dashboard is not built yet."
            body={import.meta.env.DEV ? <>No spec is registered for <span className="mono">{key}</span>. Plans 015 and 013 add them.</> : undefined}
            action={import.meta.env.DEV ? <Link className="btn btn-sm" to="/dev/kit">Open the kit preview</Link> : undefined}
          />
        </Card>
      </div>
    );
  }
  return <DashboardView key={`${state.tenant}:${key}`} spec={spec} />;
}

function DashboardView({ spec }: { spec: DashboardSpec }) {
  const { state } = useDemo();
  const tenant = useTenant();
  const period = usePeriod();
  const [metric, setMetric] = useState<string | undefined>();
  const { person, viewAs, done } = state;

  const ctx = useMemo(() => dashboardCtx(spec, {
    tenant: tenant.key, viewer: person, viewAs: !!viewAs, window: period.window, prev: period.prev, done, now: DEMO_NOW,
  }), [spec, tenant.key, person, viewAs, period.window, period.prev, done]);
  const vm = useMemo(() => buildDashboard(spec, ctx, dataPort(), { metric }), [spec, ctx, metric]);

  const subline = `${person.name} · ${tenant.name} · As of ${whenText(DEMO_TODAY, DEMO_TIME, tenant.tzLabel)}`;
  return <DashboardPage vm={vm} period={period} metric={vm.graph?.metric ?? spec.defaultMetric} setMetric={setMetric} subline={subline} />;
}

export default DashboardRoute;
