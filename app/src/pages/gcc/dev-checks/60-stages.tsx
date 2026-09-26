import { useMemo, useState } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { personById, type Person } from '@/data/people';
import { can } from '@/data/access';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { PERIODS, previousOf, windowOf, type PeriodKey } from '@/domain/gcc/period';
import { dataPort } from '@/domain/gcc/port';
import type { DemoDone } from '@/domain/gcc/lifecycle.port';
import { dashboardSpec } from '@/domain/gcc/dashboards';
import { buildDashboard, dashboardCtx } from '@/domain/gcc/dashboards/build';
import { homeDashboardKey } from '@/domain/gcc/dashboards/home';
import { requestWrite } from '@/domain/gcc/requestKeys';
import { DONE_KEY } from '@/domain/gcc/s1';
import type { DashboardVM, TenderRowVM } from '@/domain/gcc/viewmodels';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 013: the stage dashboards and My requests as built, for the active
 * tenant. The top table checks Najd against the plan's §7.2 readings (read as
 * the Head of Tendering, who is cleared for the restricted lane, on the seed),
 * plus a few rows on masking, visibility and demo requests. Below it, any of
 * the ten dashboards can be printed at any period.
 */

interface Check { name: string; expected?: string; got: string; match?: 'part' | 'includes' }

// Plan 013 §7.2 for Najd: the only numbers typed here. `part` matches whole " · " parts from the start.
const NAJD: { key: string; period: PeriodKey; tile: string; expected: string; match?: Check['match'] }[] = [
  { key: 'stage.1', period: 'today', tile: 'INT-1', expected: '11 · Etimad 7 · portals 1 · email 2 · scanned 1' },
  { key: 'stage.1', period: 'today', tile: 'INT-2', expected: '11 min · worst 14 min' },
  { key: 'stage.1', period: 'today', tile: 'INT-3', expected: '0 · last reconciled 06:00 · 9 sources' },
  { key: 'stage.1', period: 'today', tile: 'INT-4', expected: '8 of 9 · Etimad: service-account password expires Fri 13 Mar' },
  { key: 'stage.1', period: 'today', tile: 'INT-5', expected: '6 · 2 block DG1 · oldest 2 h 16 m' },
  { key: 'stage.1', period: 'today', tile: 'INT-10', expected: '1 · T-2026-122 · SAR 3,000 · closes Tue 10 Mar' },
  { key: 'stage.2', period: '30d', tile: 'SRC-1', expected: '100%', match: 'part' },
  { key: 'stage.2', period: '30d', tile: 'SRC-2', expected: 'T-2026-104: 7 of 11', match: 'includes' },
  { key: 'stage.2', period: '30d', tile: 'SRC-3', expected: '71%', match: 'part' },
  { key: 'stage.2', period: '30d', tile: 'SRC-4', expected: '4 · 2 escalated' },
  { key: 'stage.2', period: '30d', tile: 'SRC-5', expected: '6 · 0 stale' },
  { key: 'stage.2', period: '30d', tile: 'SRC-6', expected: '5', match: 'part' },
  { key: 'stage.3', period: '30d', tile: 'DEC-1', expected: '1 · 2 of 5 positions · quorum 3 · 4 h 10 m left' },
  { key: 'stage.3', period: '30d', tile: 'DEC-8', expected: '1 · T-2026-097 · Addendum 2 received 08 Mar 09:12' },
  { key: 'stage.5', period: '30d', tile: 'PRC-3', expected: '1 · T-2025-329: 7.8% vs 9.0%' },
  { key: 'stage.5', period: '30d', tile: 'PRC-6', expected: '1', match: 'part' },
  { key: 'stage.6', period: '30d', tile: 'PRP-3', expected: '1 · T-2025-317: 68 vs 70' },
  { key: 'stage.6', period: '30d', tile: 'PRP-1', expected: '3', match: 'part' },
  { key: 'stage.7', period: '30d', tile: 'CMP-5', expected: '1 · T-2025-305 · 30 h left of 48 h' },
  { key: 'stage.7', period: '30d', tile: 'CMP-1', expected: '0', match: 'part' },
  { key: 'stage.8', period: '30d', tile: 'SUB-1', expected: '1 · T-2025-298 · Thu 12 Mar, 10:00 · 4 working days' },
  { key: 'stage.8', period: '30d', tile: 'SUB-5', expected: '3 · SAR 786.0 M · oldest T-2025-284 · 21 days' },
  { key: 'stage.9', period: '30d', tile: 'OUT-1', expected: '1 won · 2 lost', match: 'part' },
  { key: 'stage.9', period: '30d', tile: 'RES-1', expected: '1 · T-2026-079', match: 'part' },
  { key: 'stage.9', period: '30d', tile: 'RES-2', expected: '1 · T-2025-262 · 12 days since award' },
  { key: 'stage.9', period: '30d', tile: 'RES-3', expected: '1 of 3', match: 'part' },
  { key: 'requests', period: '30d', tile: 'REQ-1', expected: '1', match: 'part' },
  { key: 'requests', period: '30d', tile: 'REQ-3', expected: '1 · T-2026-101', match: 'part' },
  { key: 'requests', period: '30d', tile: 'REQ-4', expected: 'T-2026-097 · Facility headroom and bond capacity, Thu 5 Mar', match: 'includes' },
];

const passes = (c: Check) => {
  if (c.expected === undefined) return false;
  if (c.match === 'part') return c.got === c.expected || c.got.startsWith(`${c.expected} · `);
  if (c.match === 'includes') return c.got.includes(c.expected);
  return c.got === c.expected;
};

const KEYS = ['stage.1', 'stage.2', 'stage.3', 'stage.4', 'stage.5', 'stage.6', 'stage.7', 'stage.8', 'stage.9', 'requests'];

/** The viewer a dashboard is read as here: the Head of Tendering, or Finance for My requests. */
const readerOf = (tenant: string, key: string) => personById(`${tenant}.${key === 'requests' ? 'fin' : 'hot'}`)!;

function build(tenant: string, key: string, viewer: Person, period: PeriodKey, done: DemoDone = {}): DashboardVM | null {
  const spec = dashboardSpec(key);
  if (!spec) return null;
  const window = windowOf(period, tenant);
  const ctx = dashboardCtx(spec, { tenant, viewer, viewAs: false, window, prev: previousOf(window), done, now: DEMO_NOW });
  return buildDashboard(spec, ctx, dataPort());
}

const tileText = (vm: DashboardVM | null, id: string) => {
  const t = vm?.tiles.find((x) => x.id === id);
  return t ? [t.display, t.sub].filter(Boolean).join(' · ') : 'missing';
};
const flowText = (vm: DashboardVM) => vm.flow?.steps.map((s) => `${s.label} ${s.parts.map((p) => p.count.toLocaleString('en-GB')).join('·')}`).join(' → ') ?? 'no flow';
const rowIds = (vm: DashboardVM) => (vm.table.rows ?? []).map((r) => r.id).join(',');

function checks(tenant: GccTenantKey): Check[] {
  const p = (role: string) => personById(`${tenant}.${role}`)!;
  const out: Check[] = [];
  const add = (name: string, got: string, expected?: string, match?: Check['match']) => out.push({ name, got, expected, match });
  const cache = new Map<string, DashboardVM | null>();
  const vmOf = (key: string, period: PeriodKey) => {
    const k = `${key}|${period}`;
    if (!cache.has(k)) cache.set(k, build(tenant, key, readerOf(tenant, key), period));
    return cache.get(k)!;
  };

  // The §7.2 readings (Najd), or the same tiles as information (the other tenants).
  for (const t of NAJD) {
    const vm = vmOf(t.key, t.period);
    const period = PERIODS.find((x) => x.key === t.period)!.label;
    add(`${vm?.title ?? t.key} · ${period} · ${t.tile}`, tileText(vm, t.tile), tenant === 'najd' ? t.expected : undefined, t.match);
  }

  // Every dashboard registered, with no missing tile, flow, action source or metric.
  const missing = KEYS.flatMap((k) => { const vm = vmOf(k, '30d'); return vm ? vm.missing.map((m) => `${k}: ${m}`) : [`${k}: not registered`]; });
  add('Every dashboard · nothing missing', missing.join(', ') || 'none', 'none');

  // Same page, two viewers: the Procurement Lead's home against the Head of Tendering's view of it.
  const proc = p('proc');
  const own = build(tenant, 'stage.2', proc, '30d');
  const hot = vmOf('stage.2', '30d');
  add('Procurement Lead · home', homeDashboardKey(proc) ?? 'none', 'stage.2');
  if (own && hot) {
    const same = JSON.stringify(own.tiles.map((t) => [t.display, t.sub])) === JSON.stringify(hot.tiles.map((t) => [t.display, t.sub]))
      && flowText(own) === flowText(hot) && rowIds(own) === rowIds(hot);
    add('Stage 2 · same tiles, flow and rows for its owner and the Head of Tendering', String(same), 'true');
    add('Stage 2 · action zone, owner | Head of Tendering', `${own.actions.title} | ${hot.actions.title}`, 'Needs your action | Waiting in Sourcing');
  }

  // Masking and visibility.
  add('Procurement Lead · open Stage 5', can(proc, 'stage.view', { stage: 5 }).reason ?? 'allowed', 'Stage 5 is outside your role');
  add('Head of Tendering · Stage 5 PRC-3', tileText(vmOf('stage.5', '30d'), 'PRC-3'));
  const bid = p('bid');
  const s3 = dataPort()?.rows(tenant, { kind: 'stage', stage: 3 }, bid, 'live', {}) as TenderRowVM[] | undefined;
  add('Bid Manager · Stage 3 margin column', s3?.length ? (s3.every((r) => r.facts['marginMin.masked']) ? 'masked' : 'visible') : 'no Stage 3 tenders');
  const coord = build(tenant, 'stage.1', p('coord'), 'today');
  add('Tender Coordinator (not cleared) · Stage 1 Today · INT-1 · live rows', `${tileText(coord, 'INT-1').split(' · ')[0]} · ${coord?.table.rows?.length ?? 0}`);

  // Demo requests reach My requests: plan 019's request key, and a renewal asked for on the Head of Tendering's dashboard.
  const fin = p('fin');
  const r = requestWrite('T-2026-101', fin.id, 'dev-check', { what: 'Confirm bond headroom', section: 'Bid pack · 9.5 Bonds and facility', due: '2026-03-10T17:00', at: '2026-03-08T10:00', byId: p('bid').id });
  const base = vmOf('requests', '30d');
  const withRequest = build(tenant, 'requests', fin, '30d', { [r.key]: r.value });
  const n = (vm: DashboardVM | null) => Number(vm?.tiles.find((t) => t.id === 'REQ-1')?.display ?? NaN);
  add('Finance · a Request button request adds one to REQ-1 and a row', `${n(withRequest) - n(base)} · ${withRequest?.actions.rows.some((x) => x.id === `request.open:${r.key}`)}`, '1 · true');
  const cred = tenant === 'najd' ? 'najd-zakat' : null;
  if (cred) {
    const withRenewal = build(tenant, 'requests', fin, '30d', { [DONE_KEY.renewalRequested(cred)]: 'yes' });
    const row = withRenewal?.actions.rows.find((x) => x.id === `request.open:renewal:${cred}`);
    add('Finance · Zakat renewal requested', row ? `${row.type} ${row.tenderId ?? ''}`.trim() : 'no row', 'Renewal T-2026-118');
  }
  return out;
}

function Explorer({ tenant }: { tenant: GccTenantKey }) {
  const [key, setKey] = useState('stage.1');
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const vm = useMemo(() => build(tenant, key, readerOf(tenant, key), period), [tenant, key, period]);
  if (!vm) return null;
  const lines: [string, string][] = [
    ...vm.tiles.map((t): [string, string] => [`${t.id} ${t.label}`, `${tileText(vm, t.id)}${t.tone ? ` [${t.tone}]` : ''}${t.masked ? ' [masked]' : ''}${t.smallSample ? ' [small sample]' : ''}`]),
    ['Flow', flowText(vm)],
    ...vm.actions.rows.map((a, i): [string, string] => [`${i ? '' : `${vm.actions.title}: `}${a.type}`, `${a.tenderId ?? ''} ${a.what} → ${a.primary.label}${a.disabledReason ? ` (${a.disabledReason})` : ''}`]),
    ...(vm.actions.rows.length ? [] : [[vm.actions.title, vm.actions.nextText ?? 'Nothing waiting'] as [string, string]]),
    ['Graph', vm.graph ? `${vm.graph.metricLabel}: ${vm.graph.points.map((p) => `${p.label} ${p.display}`).join(' · ')}` : 'no graph'],
    ...(vm.table.rows ?? []).slice(0, 5).map((r, i): [string, string] => {
      const t = r as TenderRowVM & { what?: string; status?: string };
      return [i ? '' : `Table (${vm.table.rows?.length ?? 0} rows)`, vm.table.kind === 'requests' ? `${t.id} · ${t.what} · ${t.status}` : `${t.id} · ${t.shortTitle} · ${t.step}${t.live ? '' : ' · closed'}`];
    }),
  ];
  return (
    <>
      <div style={{ padding: '6px 22px 10px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Dashboard">
          {KEYS.map((k) => <option key={k} value={k}>{k === 'requests' ? 'My requests' : `Stage ${k.slice(6)}`}</option>)}
        </select>
        <div className="seg" role="radiogroup" aria-label="Period">
          {PERIODS.map((x) => (
            <button key={x.key} type="button" role="radio" aria-checked={period === x.key} className={period === x.key ? 'on' : ''} onClick={() => setPeriod(x.key)}>{x.label}</button>
          ))}
        </div>
        <KV k="Read as" v={readerOf(tenant, key).name} />
      </div>
      <DataTable
        rows={lines.map(([k, v], i) => ({ i, k, v }))}
        rowKey={(l) => String(l.i)}
        columns={[
          { key: 'k', header: vm.title, width: '1fr', primary: true, render: (l) => <span className="cell-main">{l.k}</span> },
          { key: 'v', header: vm.subtitle || 'My requests', width: '3fr', render: (l) => l.v },
        ]}
      />
    </>
  );
}

export default function StagesCheck() {
  const key = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(key) ? checks(key) : []), [key]);
  if (!isGccTenantKey(key)) return <CardHead title="Stage dashboards" meta="No GCC seed for this tenant" />;
  const targeted = rows.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => !passes(c)).length;
  return (
    <>
      <CardHead title="Stage dashboards and My requests (plan 013)" meta={failing ? <span className="t-red">{failing} of {targeted.length} targets failing</span> : `All ${targeted.length} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Read as" v="The Head of Tendering (Finance for My requests), on the seed (no demo actions)" />
      </div>
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Reading', width: '1.6fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '1.6fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : passes(c) ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
      <CardHead title="Print a dashboard" meta="Tiles, flow, actions, graph points and the first five table rows" />
      <Explorer tenant={key} />
    </>
  );
}

export { checks as stageChecks, passes as stagePasses };
