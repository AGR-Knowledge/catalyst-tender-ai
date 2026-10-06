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
import { queriesFor } from '@/domain/gcc/lifecycle';
import { companyDocuments } from '@/domain/gcc/actions/portfolio.actions';
import { TENANT_TARGETS } from '@/data/gcc/portfolio';
import { consoleVM } from '@/domain/platform/console';
import type { DashboardVM, DrillVM, TileVM } from '@/domain/gcc/viewmodels';
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
 *
 * Plan 040 adds the Head of Tendering's six tiles: their order, and that
 * Live pipeline, Tenders accepted, Decisions on time and Documentation gaps
 * read the same facts as their sources and their list panels.
 */

interface Check { name: string; got: string; ok: boolean; expected?: string }

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
  return [...out, ...hotChecks(tenant)];
}

/* ------------------------------------------------------------- plan 040 */

const HOT_ORDER = ['PF-1', 'PF-3', 'PF-2', 'PF-7', 'PF-4', 'SCR-6'];

function hotVM(tenant: GccTenantKey, viewer: Person, period: PeriodKey): DashboardVM | null {
  const spec = dashboardSpec('portfolio.hot');
  if (!spec) return null;
  const window = windowOf(period, tenant);
  return buildDashboard(spec, dashboardCtx(spec, { tenant, viewer, viewAs: false, window, prev: previousOf(window), done: {}, now: DEMO_NOW }), dataPort());
}

const panelOf = (d: DrillVM | null | undefined) => (d?.kind === 'list' ? d.panel : null);

/** The Head of Tendering's tiles at 30 days (90 days for Win & Loss's target), checked against their sources and panels. */
function hotChecks(tenant: GccTenantKey): Check[] {
  const hot = personById(`${tenant}.hot`);
  const vm = hot && hotVM(tenant, hot, '30d');
  if (!hot || !vm) return [{ name: '040 · Head of Tendering dashboard', got: 'not built', ok: false }];
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name: `040 · ${name}`, ok, got, expected: 'as named' });
  const tile = (id: string) => vm.tiles.find((t) => t.id === id);
  const q = queriesFor({ tenant, viewer: hot, done: {} });
  const w30 = windowOf('30d', tenant);

  const order = vm.tiles.map((t) => t.id);
  add('Tiles in order: Live pipeline, Win & Loss, Average ticket size, Tenders accepted, Decisions on time, Documentation gaps',
    order.join() === HOT_ORDER.join(), vm.tiles.map((t) => t.label).join(' · '));

  // User review 2026-10-06: Live pipeline is the pursued pipeline again (Stages 2–8, value and count).
  const pf1 = tile('PF-1');
  add('Live pipeline = pursued tenders now (Stages 2–8), with their value', !!pf1 && pf1.label === 'Live pipeline' && /^\d+ live tenders?$/.test(pf1.detail ?? ''), `${pf1?.label}: ${pf1?.display} · ${pf1?.detail}`);

  const cap = q.capturesIn(w30);
  const pf7 = tile('PF-7');
  add('Tenders accepted = notices that passed the AI screening', !!pf7 && pf7.display === cap.passed.toLocaleString('en-GB') && (!(cap.captured + cap.linked) || pf7.detail === `of ${(cap.captured + cap.linked).toLocaleString('en-GB')} captured`),
    `${pf7?.display} · ${pf7?.detail} · ${pf7?.ref?.k} ${pf7?.ref?.v} / passed ${cap.passed} of ${cap.captured + cap.linked}`);

  const pf4 = tile('PF-4');
  const decisions = q.gateEventsIn(w30).length;
  const [on, all] = /^(\d+) of (\d+) on time$/.exec(pf4?.display ?? '')?.slice(1).map(Number) ?? [NaN, NaN];
  const late = pf4?.detail === 'None late' ? 0 : Number(/^(\d+) late$/.exec(pf4?.detail ?? '')?.[1]);
  add('Decisions on time: on time + late = gate decisions in the period', all === decisions && on + late === all, `${pf4?.display} · ${pf4?.detail} / ${decisions} decisions`);
  const latePanel = panelOf(pf4?.drill);
  add('Late decisions panel: one row per late decision, each with how late', !!latePanel && latePanel.rows.length === late && latePanel.rows.every((r) => /late$/.test(r.cells.late?.text ?? '')),
    latePanel ? `${latePanel.rows.length} rows · ${latePanel.rows.map((r) => r.cells.late?.text).join(', ') || 'none'} / tile ${late} late` : 'no list panel');
  add('Late decisions panel: the link under it opens every decision in the table', latePanel?.foot?.drill.kind === 'table' && (latePanel.foot.drill.ids?.length ?? 0) <= decisions && latePanel.foot.label.includes(String(decisions)),
    latePanel?.foot ? `${latePanel.foot.label}` : 'no link');

  const scr6 = tile('SCR-6');
  const docs = companyDocuments({ tenant, viewer: hot, done: {}, now: DEMO_NOW });
  const docPanel = panelOf(scr6?.drill);
  add('Documents panel: every document in the credentials vault', !!docPanel && docPanel.rows.length === docs.length && docs.length > 0, `${docPanel?.rows.length ?? 0} rows / ${docs.length} in the vault`);
  const gapRows = docPanel?.rows.filter((r) => r.cells.status?.text !== 'Valid').length ?? -1;
  add('Documentation gaps = the panel’s Expired and Expiring rows, listed first', String(gapRows) === scr6?.display && (docPanel?.rows.slice(0, gapRows).every((r) => r.cells.status?.text !== 'Valid') ?? false),
    `tile ${scr6?.display} · panel ${gapRows} (${docPanel?.rows.slice(0, Math.max(gapRows, 0)).map((r) => r.cells.status?.text).join(', ')})`);

  const target = TENANT_TARGETS[tenant].hitRatePct;
  const pf3 = hotVM(tenant, hot, '90d')?.tiles.find((t) => t.id === 'PF-3');
  add('Win & Loss (90 days): counts, win rate, and the target from the tenant’s targets', !!pf3 && /^\d+ won · \d+ lost$/.test(pf3.display) && /^\d+% win rate$/.test(pf3.detail ?? '') && pf3.ref?.k === 'Target' && pf3.ref.v.startsWith(`${target}%`),
    `${pf3?.display} · ${pf3?.detail} · ${pf3?.ref?.k} ${pf3?.ref?.v}`);

  // The CEO and the Bid Manager keep the pursued pipeline under its own name.
  const others = (['exec', 'bid'] as const).flatMap((role) => {
    const p = personById(`${tenant}.${role}`);
    const spec = p && dashboardSpec(homeDashboardKey(p) ?? '');
    if (!p || !spec) return [];
    const w = windowOf('30d', tenant);
    const t = buildDashboard(spec, dashboardCtx(spec, { tenant, viewer: p, viewAs: false, window: w, prev: previousOf(w), done: {}, now: DEMO_NOW }), dataPort()).tiles.find((x) => x.id === 'PF-1');
    return [`${p.title}: ${t?.label ?? 'no PF-1'}`];
  });
  add('CEO and Bid Manager: the pursued pipeline is never called “Live pipeline”', others.length === 2 && others.every((x) => !x.endsWith(': Live pipeline')), others.join(' · '));
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
        <KV k="Plan 040 rows" v="The Head of Tendering's six tiles at 30 days (Win & Loss at 90), against their sources and list panels" />
      </div>
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Dashboard or strip', width: '1.6fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '.8fr', priority: 2, render: (c) => c.expected ?? EXPECTED },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
