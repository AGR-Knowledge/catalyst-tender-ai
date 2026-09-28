import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { peopleOf, personById, type Person } from '@/data/people';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { PERIODS, previousOf, windowOf, type PeriodKey } from '@/domain/gcc/period';
import { dataPort } from '@/domain/gcc/port';
import { dashboardSpec } from '@/domain/gcc/dashboards';
import { homeDashboardKey } from '@/domain/gcc/dashboards/home';
import { buildDashboard, dashboardCtx } from '@/domain/gcc/dashboards/build';
import { registryTile as adminTile } from '@/domain/gcc/admin';
import { consoleVM } from '@/domain/platform/console';
import type { TileVM } from '@/domain/gcc/viewmodels';
import { kpiCtxOf, tilesOf } from '../s1/vm/tiles';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 027e: every KPI tile has both text rows, a detail line and a reference
 * line (dashboards.md §3, user decision 2026-09-28), in every period. For the
 * active tenant, on the seed, it builds each role's home dashboard (and Stage 8,
 * which no role has as home, for the Head of Tendering) at all five periods,
 * the registry tiles of the screen strips, and the Platform Console's tiles.
 * The strips' own value tiles are built inside their pages, so the browser
 * script in the plan's acceptance checks reads those.
 */

interface Check { name: string; got: string; ok: boolean }

const EXPECTED = 'all filled';

/** "all 6 tiles filled", or the tiles missing a line. Masked and unregistered tiles have no lines to fill: counted, skipped. */
function verdict(tiles: TileVM[]): Pick<Check, 'got' | 'ok'> {
  const read = tiles.filter((t) => !t.masked && !t.missing);
  const skipped = tiles.length - read.length;
  const noDetail = read.filter((t) => !t.detail).map((t) => t.label);
  const noRef = read.filter((t) => !t.ref?.k || !t.ref.v).map((t) => t.label);
  const skip = skipped ? ` (${skipped} masked or not registered, skipped)` : '';
  if (!noDetail.length && !noRef.length) return { got: `all ${read.length} tiles filled${skip}`, ok: true };
  return { got: [noDetail.length ? `no detail: ${noDetail.join(', ')}` : '', noRef.length ? `no reference: ${noRef.join(', ')}` : ''].filter(Boolean).join(' · ') + skip, ok: false };
}

/** One reader per role that has a home dashboard (the first committee member for the members), and Stage 8 for the Head of Tendering. */
function readers(tenant: GccTenantKey): { key: string; viewer: Person }[] {
  const seen = new Set<string>();
  const out: { key: string; viewer: Person }[] = [];
  for (const p of peopleOf(tenant)) {
    const key = homeDashboardKey(p);
    if (!key || seen.has(p.role)) continue;
    seen.add(p.role);
    out.push({ key, viewer: p });
  }
  const hot = personById(`${tenant}.hot`);
  if (hot) out.push({ key: 'stage.8', viewer: hot });
  return out;
}

/** The registry tiles each screen strip asks for (their pages add value tiles of their own), with the strip's fixed period. */
const STRIPS: { name: string; here: string; period: PeriodKey; ids: string[] }[] = [
  { name: 'Tender radar', here: '/radar', period: 'today', ids: ['INT-1', 'INT-4', 'INT-3'] },
  { name: 'Screening', here: '/screening', period: '30d', ids: ['SCR-1', 'SCR-5'] },
  { name: 'DG1 decisions', here: '/dg1', period: '30d', ids: ['SCR-1'] },
  { name: 'Intake queue', here: '/intake-queue', period: '30d', ids: ['INT-5'] },
];

function checks(tenant: GccTenantKey): Check[] {
  const out: Check[] = [];
  const port = dataPort();
  for (const { key, viewer } of readers(tenant)) {
    const spec = dashboardSpec(key);
    for (const { key: period, label } of PERIODS) {
      const name = `${spec?.key ?? key} · ${viewer.title} · ${label}`;
      if (!spec) { out.push({ name, got: 'not registered', ok: false }); continue; }
      const window = windowOf(period, tenant);
      const vm = buildDashboard(spec, dashboardCtx(spec, { tenant, viewer, viewAs: false, window, prev: previousOf(window), done: {}, now: DEMO_NOW }), port);
      out.push({ name, ...verdict(vm.tiles) });
    }
  }

  // The screen strips' registry tiles, read as the Head of Tendering (who opens every Stage 1 screen).
  const hot = personById(`${tenant}.hot`);
  if (hot) {
    const base = { tenant, viewer: hot, viewAs: false, done: {} };
    for (const s of STRIPS) out.push({ name: `${s.name} strip · registry tiles (${s.ids.join(', ')})`, ...verdict(tilesOf(s.ids, kpiCtxOf(base, s.period, s.here.slice(1)), s.here)) });
    const int4 = adminTile('INT-4', base);
    out.push({ name: 'Administration › Sources strip · INT-4', ...verdict(int4 ? [int4] : []) });
  }

  // The platform world: the Console reads every tenant's counts, so it is the same row in each tenant.
  out.push({ name: 'Platform Console · PLT-1 … PLT-6', ...verdict(consoleVM({ doneBy: {}, added: [] }).tiles) });
  return out;
}

export default function TilesCheck() {
  const key = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(key) ? checks(key) : []), [key]);
  if (!isGccTenantKey(key)) return <CardHead title="Tile lines" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((c) => !c.ok).length;
  return (
    <>
      <CardHead title="Every tile has a detail and a reference line (plan 027e)" meta={failing ? <span className="t-red">{failing} of {rows.length} targets failing</span> : `All ${rows.length} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Read as" v="Each role's home dashboard, at every period, on the seed (no demo actions)" />
      </div>
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Dashboard or strip', width: '1.6fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '.8fr', priority: 2, render: () => EXPECTED },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
