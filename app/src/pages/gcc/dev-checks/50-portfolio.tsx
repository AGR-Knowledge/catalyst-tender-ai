import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { isGccTenantKey, gccData, type GccTenantKey } from '@/data/gcc';
import { personById, type Person } from '@/data/people';
import { PACK_VERSIONS } from '@/data/gcc/s3';
import { DELIVERY_LOAD } from '@/data/gcc/portfolio';
import { DEMO_NOW, slaState } from '@/domain/gcc/clock';
import { PERIODS, previousOf, windowOf, type PeriodKey } from '@/domain/gcc/period';
import { dataPort } from '@/domain/gcc/port';
import { dashboardSpec } from '@/domain/gcc/dashboards';
import { buildDashboard, buildGraph, dashboardCtx } from '@/domain/gcc/dashboards/build';
import { chipCtx, gateChipState } from '@/domain/gcc/actions/portfolio.actions';
import type { DashboardVM } from '@/domain/gcc/viewmodels';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 015: the portfolio dashboards as built, for the active tenant and on
 * the seed (`done` empty). Najd is checked against dashboards.md §12.3 (the
 * flows by period) and §12.4 (the Head of Tendering's actions, in order), and
 * the plan's tile readings. A few rows check masking, visibility, the gate
 * chips and that the delivery load agrees with 009a's packs. The other tenants
 * print their readings and the §12.5 "every tenant, now" rows.
 */

interface Check { name: string; expected?: string; got: string; match?: 'prefix' | 'includes' }

// dashboards.md §12.3 for Najd, by period (plan 039's table): the only numbers typed here.
// The funnel columns read their parts in order: Captured in · new · previous; AI screening passed · screened out;
// each gate decided · approved · rejected (· pending at DG1); Won won · lost · pending.
interface FlowPins { captured: string; screening: string; dg1: string; dg2: string; dg3: string; won: string; pf2: string; pf3: string; pf4: string }
const NAJD_FLOWS: Partial<Record<PeriodKey, FlowPins>> = {
  all: { captured: '4,070 · 3,700 · 370', screening: '490 · 3,580', dg1: '366 · 206 · 146 · 14', dg2: '206 · 190 · 16', dg3: '190 · 186 · 4', won: '82 · 88 · 16', pf2: 'SAR 263.3 M', pf3: '82 won · 88 lost', pf4: '716 of 762 on time' },
  '30d': { captured: '194 · 176 · 18', screening: '18 · 176', dg1: '12 · 8 · 3 · 1', dg2: '8 · 7 · 1', dg3: '7 · 7 · 0', won: '3 · 3 · 1', pf2: 'SAR 285.0 M', pf3: '3 won · 3 lost', pf4: '25 of 27 on time' },
  '90d': { captured: '572 · 520 · 52', screening: '62 · 510', dg1: '44 · 30 · 12 · 2', dg2: '30 · 28 · 2', dg3: '28 · 27 · 1', won: '14 · 11 · 2', pf2: 'SAR 283.6 M', pf3: '14 won · 11 lost', pf4: '95 of 102 on time' },
  '12m': { captured: '2,080 · 1,890 · 190', screening: '250 · 1,830', dg1: '185 · 104 · 72 · 9', dg2: '104 · 96 · 8', dg3: '96 · 94 · 2', won: '42 · 44 · 8', pf2: 'SAR 260.8 M', pf3: '42 won · 44 lost', pf4: '362 of 385 on time' },
};

// Plan 015's tile targets and dashboards.md §12.4, for Najd at 30 days.
const NAJD_30D: Record<string, string> = {
  // Plan 039: PF-1 left the Head of Tendering's tiles (plan 040); the CEO's reads the same pipeline. More history enters and leaves Stages 2–8 in 30 days.
  'CEO · PF-1': 'SAR 6.83 bn · 27 tenders · 8 in',
  'HoT · PF-2 sub': '7 bids · largest SAR 338.8 M',
  'HoT · PF-3': '3 won · 3 lost · green · Win rate 50% (n = 6)',
  'HoT · PF-4 sub': '25 of 27 · 2 late, latest: DG1 on T-2026-107 (3 h)',
  'HoT · SCR-6': '2 · Zakat 30 Apr · before T-2026-118 opens 10 May',
  'HoT · actions 1–5': 'DG3 approval T-2025-305 | DG2 approval T-2026-097 | Booklet purchase T-2026-122 | Renewal T-2026-118 | Late input T-2026-101',
  // Plan 035: the Head of Tendering's debrief sign-offs (T-2025-438 featured, T-2026-099 generated) join on the portfolio scale.
  'HoT · actions, Show all': '10: + Debrief sign-off T-2025-410 | Renewal T-2026-118 | Debrief sign-off T-2025-438 | Debrief sign-off T-2026-099 | DG1 due T-2026-117',
  'HoT · DG3 row': 'Ready for your approval: evidence complete · 30 h left of 48 h',
  'HoT · DG2 row': '2 of 5 positions · quorum needs 3 · pack stale (Addendum 2, 09:12) · 4 h 10 m left of 24 h',
  'HoT · booklet row': 'SAR 3,000 via Etimad · purchase closes Tue 10 Mar · requested by Aisha Al-Qahtani',
  'HoT · renewal row': 'Zakat certificate (ZATCA) expires Thu 30 Apr, before T-2026-118 opens Sun 10 May · owner Sultan Al-Anazi',
  'HoT · DG1 due row': 'Due today 16:10 · waiting on Omar Siddiqui',
  'HoT · graph, tenders now': '12 · 7 · 2 · 2 · 3 · 4 · 1 · 8 · 2',
  'HoT · table, live rows': '41',
  'Not cleared (Tender Coordinator) · Stage 1 now · live rows': '11 · 40',
  'CEO · DEC-4': 'SAR 298.2 M',
  'CEO · DEC-6': 'SAR 640.0 M',
  'CEO · DEC-5': '101%',
  'CEO · approve buttons': 'The Head of Tendering approves',
  'CEO · own position row': 'DG2 position T-2026-097',
  'BM · SCR-1': '2 · first in 6 h 10 m',
  'BM · SCR-5': '3',
  'BM · DEC-7': '2 · 1 late',
  'BM · PF-6': 'Thu 12 Mar, 10:00 · T-2025-298 · 4 working days',
  'Procurement · DEC-4 masked': 'Masked for your role',
  'Chip DG3 · Head of Tendering': 'waiting-on-me',
  'Chip DG2 · Head of Tendering': 'open',
  'Chip DG2 · Operations Director (no position)': 'waiting-on-me',
  'Chip DG2 · CFO': 'open',
  'Chip DG1 · Bid Manager': 'waiting-on-me',
};

const MATCH: Record<string, Check['match']> = {
  'CEO · PF-1': 'prefix', 'BM · SCR-1': 'prefix', 'BM · DEC-7': 'prefix', 'BM · PF-6': 'prefix',
  'HoT · DG3 row': 'prefix', 'HoT · DG1 due row': 'prefix', 'CEO · approve buttons': 'prefix',
};

const passes = (c: Check) => c.expected !== undefined && (c.match === 'prefix' ? c.got.startsWith(c.expected) : c.match === 'includes' ? c.got.includes(c.expected.split(' · ').pop()!) && c.got.startsWith(c.expected.split(' · ')[0]) : c.got === c.expected);

function build(tenant: string, key: string, viewer: Person, period: PeriodKey): DashboardVM | null {
  const spec = dashboardSpec(key);
  if (!spec) return null;
  const window = windowOf(period, tenant);
  const ctx = dashboardCtx(spec, { tenant, viewer, viewAs: false, window, prev: previousOf(window), done: {}, now: DEMO_NOW });
  return buildDashboard(spec, ctx, dataPort());
}

const tileText = (vm: DashboardVM, id: string) => {
  const t = vm.tiles.find((x) => x.id === id);
  return t ? [t.display, t.sub].filter(Boolean).join(' · ') : 'missing';
};
const flowText = (vm: DashboardVM, key: string) => vm.flow?.steps.find((s) => s.key === key)?.parts.map((p) => p.count.toLocaleString('en-GB')).join(' · ') ?? '0';
const actionText = (vm: DashboardVM) => vm.actions.rows.map((r) => `${r.type} ${r.tenderId ?? ''}`.trim());
const graphText = (vm: DashboardVM) => vm.graph?.points.map((p) => p.display).join(' · ') ?? 'no graph';

function checks(tenant: GccTenantKey): Check[] {
  const p = (role: string) => personById(`${tenant}.${role}`)!;
  const out: Check[] = [];
  const add = (name: string, got: string, expected?: string) => out.push({ name, got, expected, match: MATCH[name] });

  // Readings by period, and the §12.3 targets for Najd.
  for (const { key: k, label } of PERIODS) {
    const vm = build(tenant, 'portfolio.hot', p('hot'), k);
    if (!vm) { add('portfolio.hot', 'not registered'); break; }
    const t = tenant === 'najd' ? NAJD_FLOWS[k] : undefined;
    const pf4 = vm.tiles.find((x) => x.id === 'PF-4')!;
    add(`${label} · funnel: Captured (in · new · previous)`, flowText(vm, 'captured'), t?.captured);
    add(`${label} · funnel: AI screening (passed · screened out)`, flowText(vm, 'screening'), t?.screening);
    add(`${label} · funnel: DG1 (decided · approved · rejected · pending)`, flowText(vm, 'dg1'), t?.dg1);
    add(`${label} · funnel: DG2 (decided · approved · rejected)`, flowText(vm, 'dg2'), t?.dg2);
    add(`${label} · funnel: DG3 (decided · approved · rejected)`, flowText(vm, 'dg3'), t?.dg3);
    add(`${label} · funnel: Won (won · lost · pending)`, flowText(vm, 'won'), t?.won);
    out.push({ name: `${label} · PF-2`, got: vm.tiles.find((x) => x.id === 'PF-2')!.display, expected: t?.pf2, match: 'prefix' });
    out.push({ name: `${label} · PF-3`, got: vm.tiles.find((x) => x.id === 'PF-3')!.display, expected: t?.pf3, match: 'prefix' });
    out.push({ name: `${label} · PF-4`, got: [pf4.display, pf4.sub].filter(Boolean).join(' · '), expected: t?.pf4, match: 'prefix' });
    for (const id of ['PF-0', 'PF-7', 'SCR-6']) add(`${label} · ${id}`, tileText(vm, id));
    add(`${label} · graph: tenders now`, graphText(vm));
  }

  // Now (30 days, the default): the three dashboards.
  const hot = build(tenant, 'portfolio.hot', p('hot'), '30d');
  const exec = build(tenant, 'portfolio.exec', p('exec'), '30d');
  const bid = build(tenant, 'portfolio.bid', p('bid'), '30d');
  if (!hot || !exec || !bid) return out;
  const N = tenant === 'najd' ? NAJD_30D : {};
  const pf3 = hot.tiles.find((x) => x.id === 'PF-3')!;
  add('HoT · PF-2 sub', hot.tiles.find((x) => x.id === 'PF-2')!.sub ?? '', N['HoT · PF-2 sub']);
  add('HoT · PF-3', [pf3.display, pf3.tone ?? 'neutral', pf3.sub?.split(' · ')[0]].join(' · '), N['HoT · PF-3']);
  add('HoT · PF-4 sub', hot.tiles.find((x) => x.id === 'PF-4')!.sub ?? '', N['HoT · PF-4 sub']);
  add('HoT · SCR-6', tileText(hot, 'SCR-6'), N['HoT · SCR-6']);
  // Plan 040: Bid-team load (CAP-1) left the Head of Tendering's tiles, and no portfolio dashboard shows it now.
  const acts = actionText(hot);
  add('HoT · actions 1–5', acts.slice(0, 5).join(' | '), N['HoT · actions 1–5']);
  add('HoT · actions, Show all', `${acts.length}: + ${acts.slice(5).join(' | ')}`, N['HoT · actions, Show all']);
  const row = (src: string) => hot.actions.rows.find((r) => r.source === src);
  const due = (r?: DashboardVM['actions']['rows'][number]) => (r?.due?.kind === 'sla' ? slaLeft(r.due.start, r.due.end) : '');
  add('HoT · DG3 row', [row('dg3.approve')?.what, due(row('dg3.approve'))].filter(Boolean).join(' · '), N['HoT · DG3 row']);
  add('HoT · DG2 row', [row('dg2.approve')?.what, due(row('dg2.approve'))].filter(Boolean).join(' · '), N['HoT · DG2 row']);
  add('HoT · booklet row', row('booklet.approve')?.what ?? 'none', N['HoT · booklet row']);
  add('HoT · renewal row', row('renewal.request')?.what ?? 'none', N['HoT · renewal row']);
  const dg1 = row('dg1.oversight');
  add('HoT · DG1 due row', dg1 ? `${dg1.what} · waiting on ${dg1.waitingOn?.name ?? 'nobody'}` : 'none', N['HoT · DG1 due row']);
  add('HoT · graph, tenders now', graphText(hot), N['HoT · graph, tenders now']);
  add('HoT · table, live rows', String((hot.table.rows as { live?: boolean }[] | null)?.filter((r) => r.live).length ?? 0), N['HoT · table, live rows']);

  // Visibility: a person not cleared for the restricted lane.
  const coord = p('coord');
  const hotSpec = dashboardSpec('portfolio.hot')!;
  const w30 = windowOf('30d', tenant);
  const coordCtx = dashboardCtx(hotSpec, { tenant, viewer: coord, viewAs: false, window: w30, prev: previousOf(w30), done: {}, now: DEMO_NOW });
  const coordGraph = buildGraph(hotSpec, coordCtx, 'stages.count');
  const coordRows = dataPort()?.rows(tenant, { kind: 'all' }, coord, 'live', {}).length ?? 0;
  add('Not cleared (Tender Coordinator) · Stage 1 now · live rows', `${coordGraph?.points[0].display ?? '?'} · ${coordRows}`, N['Not cleared (Tender Coordinator) · Stage 1 now · live rows']);

  // The CEO: their tiles, read-only approvals, their own position row.
  add('CEO · PF-1', tileText(exec, 'PF-1'), N['CEO · PF-1']);
  for (const id of ['PF-3', 'OUT-3']) add(`CEO · ${id}`, tileText(exec, id));
  add('CEO · DEC-4', exec.tiles.find((x) => x.id === 'DEC-4')!.display, N['CEO · DEC-4']);
  add('CEO · DEC-6', exec.tiles.find((x) => x.id === 'DEC-6')!.display, N['CEO · DEC-6']);
  add('CEO · DEC-5', exec.tiles.find((x) => x.id === 'DEC-5')!.display, N['CEO · DEC-5']);
  add('CEO · DEC-5 sub', exec.tiles.find((x) => x.id === 'DEC-5')!.sub ?? '');
  const approvals = exec.actions.rows.filter((r) => ['dg3.approve', 'dg2.approve', 'booklet.approve'].includes(r.source));
  add('CEO · approve buttons', [...new Set(approvals.map((r) => r.disabledReason ?? 'enabled'))].join(' | ') || 'none', N['CEO · approve buttons']);
  const own = exec.actions.rows.find((r) => r.source === 'dg2.position');
  add('CEO · own position row', own ? `${own.type} ${own.tenderId}` : 'none', N['CEO · own position row']);

  // The Bid Manager, scoped to their tenders.
  for (const id of ['PF-1', 'PF-4']) add(`BM · ${id}`, tileText(bid, id));
  add('BM · SCR-1', tileText(bid, 'SCR-1'), N['BM · SCR-1']);
  add('BM · SCR-5', bid.tiles.find((x) => x.id === 'SCR-5')!.display, N['BM · SCR-5']);
  add('BM · SCR-5 sub', bid.tiles.find((x) => x.id === 'SCR-5')!.sub ?? '');
  add('BM · DEC-7', tileText(bid, 'DEC-7'), N['BM · DEC-7']);
  add('BM · PF-6', tileText(bid, 'PF-6'), N['BM · PF-6']);
  add('BM · actions', actionText(bid).join(' | ') || 'none');

  // Masking: Procurement has no `see.positions`.
  const proc = p('proc');
  const procSpec = dashboardSpec('portfolio.exec')!;
  const procCtx = dashboardCtx(procSpec, { tenant, viewer: proc, viewAs: false, window: w30, prev: previousOf(w30), done: {}, now: DEMO_NOW });
  const procVm = buildDashboard(procSpec, procCtx, dataPort());
  add('Procurement · DEC-4 masked', procVm.tiles.find((x) => x.id === 'DEC-4')!.display, N['Procurement · DEC-4 masked']);

  // Gate chips on the seed.
  const chip = (gate: 'DG1' | 'DG2' | 'DG3', id: string) => gateChipState(gate, chipCtx(tenant, personById(id)!, {}));
  add('Chip DG3 · Head of Tendering', chip('DG3', `${tenant}.hot`), N['Chip DG3 · Head of Tendering']);
  add('Chip DG2 · Head of Tendering', chip('DG2', `${tenant}.hot`), N['Chip DG2 · Head of Tendering']);
  add('Chip DG2 · Operations Director (no position)', chip('DG2', `${tenant}.member.operations`), N['Chip DG2 · Operations Director (no position)']);
  add('Chip DG2 · CFO', chip('DG2', `${tenant}.member.cfo`), N['Chip DG2 · CFO']);
  add('Chip DG1 · Bid Manager', chip('DG1', `${tenant}.bid`), N['Chip DG1 · Bid Manager']);

  // Every tenant (dashboards.md §12.5): a DG3 approval waiting, a live funnel and a result in 30 days.
  add('Every tenant · DG3 approval in Needs your action', String(hot.actions.rows.some((r) => r.source === 'dg3.approve')), 'true');
  add('Every tenant · funnel non-empty at 30 days', String((hot.flow?.steps ?? []).some((s) => s.key !== 'captured' && s.key !== 'screening' && s.parts.some((x) => x.count > 0))), 'true');
  add('Every tenant · a result in 30 days', String(hot.flow?.steps.find((s) => s.key === 'won')?.parts.some((x) => x.key !== 'pending' && x.count > 0) ?? false), 'true');
  add('Every tenant · no action source missing', [...hot.missing, ...exec.missing, ...bid.missing].join(', ') || 'none', 'none');

  // DEC-5's delivery load is the same figure 009a's packs read (plan 015 review notes).
  const load = DELIVERY_LOAD[tenant];
  const safe = gccData(tenant).fit.safeDeliveryPct;
  const packs = PACK_VERSIONS.filter((v) => v.tenant === tenant);
  const disagree = packs.filter((v) => {
    const s = v.snapshot.portfolio;
    return s.asOf !== load.asOf || s.currentPct !== load.currentPct || s.safePct !== safe || JSON.stringify(s.ifWon) !== JSON.stringify(load.ifWon);
  }).map((v) => `${v.tenderId} v${v.version}`);
  add('Delivery load agrees with 009a’s packs', packs.length ? (disagree.length ? `Differs: ${disagree.join(', ')}` : `Agrees (${packs.length} packs)`) : 'No packs in this tenant', packs.length ? `Agrees (${packs.length} packs)` : 'No packs in this tenant');

  // Rows are period-independent: the same list at every period.
  const today = build(tenant, 'portfolio.hot', p('hot'), 'all')!;
  add('Needs your action ignores the period', String(JSON.stringify(actionText(today)) === JSON.stringify(acts)), 'true');
  return out;
}

const slaLeft = (start: string, end: string) => slaState(start, end).text;

export default function PortfolioCheck() {
  const key = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(key) ? checks(key) : []), [key]);
  if (!isGccTenantKey(key)) return <CardHead title="Portfolio dashboards" meta="No GCC seed for this tenant" />;
  const targeted = rows.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => !passes(c)).length;
  return (
    <>
      <CardHead title="Portfolio dashboards (plan 015)" meta={failing ? <span className="t-red">{failing} of {targeted.length} targets failing</span> : `All ${targeted.length} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Read as" v="Each tenant's Head of Tendering, CEO and Bid Manager, on the seed (no demo actions)" />
      </div>
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Reading', width: '1.4fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '1.6fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : passes(c) ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}

