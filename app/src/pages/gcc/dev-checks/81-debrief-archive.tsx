import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { can, navFor } from '@/data/access';
import { firstWithRole, peopleOf, type Person } from '@/data/people';
import { isGccTenantKey } from '@/data/gcc';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { kpi } from '@/domain/gcc/kpi';
import { queriesFor } from '@/domain/gcc/lifecycle';
import { bidRecordFor } from '@/domain/gcc/company/record';
import { archiveFor, type ArchivePeriod, type ArchiveVM } from '@/domain/gcc/debriefs';
import { SCREENS } from '@/pages/gcc/screens';
import { kpiCtxOf } from '@/pages/gcc/s1/vm/tiles';
import { csvHeadersOf, csvParamsOf, gridColumnsOf } from '@/pages/gcc/debriefs/parts/columns';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 037: the Debriefs archive and the Bid record agree, on the seed (`done`
 * is an empty map in memory, so this changes nothing). The archive's won and
 * lost at 12 months are the Bid record's; its list is DBR-1's endings; every
 * breakdown adds up; the Bid record's top factors are the archive's; the CSV
 * holds the table's columns plus the lessons; a Bid Manager reads only their
 * own tenders; the Tender Coordinator can't open the page and reads the Bid
 * record's debrief lines masked; the sidebar lists Debriefs after Tender
 * library. Run it in each of the five companies.
 */

interface Check { name: string; ok: boolean; got: string }

const DONE: Record<string, string> = {};
const PERIODS: ArchivePeriod[] = ['30d', '90d', '12m'];
const list = (xs: string[], n = 3) => (xs.length ? `${xs.slice(0, n).join(', ')}${xs.length > n ? ` +${xs.length - n}` : ''}` : 'none');
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Every breakdown of one archive against its totals and rows; the names of those that don't add up. */
function sumsOff(vm: ArchiveVM): string[] {
  const t = vm.totals;
  const acc = (g: string) => vm.rows.filter((r) => r.group === g && r.status === 'accepted');
  const sum = (xs: { count: number }[]) => xs.reduce((n, x) => n + x.count, 0);
  const rowsOk = (xs: { count: number; tenderIds: string[] }[]) => xs.every((x) => x.count === x.tenderIds.length);
  const off: string[] = [];
  if (t.endings !== t.won + t.lost + t.stopped) off.push(`endings ${t.endings} ≠ ${t.won}+${t.lost}+${t.stopped}`);
  if (t.endings !== t.accepted + t.submitted + t.sentBack + t.due + t.overdue) off.push('statuses');
  if (vm.rows.length !== t.endings) off.push(`rows ${vm.rows.length}`);
  if (sum(vm.winReasons) !== acc('won').length || !rowsOk(vm.winReasons)) off.push('why we win');
  if (sum(vm.lossReasons) !== acc('lost').length || !rowsOk(vm.lossReasons)) off.push('why we lose');
  if (vm.factors.some((f) => f.wins !== f.winIds.length || f.losses !== f.lossIds.length)) off.push('factors');
  if (vm.rivals.reduce((n, r) => n + r.beatUs, 0) > acc('lost').length || vm.rivals.some((r) => r.beatUs !== r.tenderIds.length)) off.push('rivals');
  // Stopped kinds count accepted debriefs, as every breakdown does; each has at most one reason per debrief.
  if (sum(vm.stopped) !== acc('stopped').length || vm.stopped.some((k) => k.count !== k.tenderIds.length || !rowsOk(k.reasons) || sum(k.reasons) > k.count)) off.push('stopped');
  if (sum(vm.stoppedEarlier) > acc('stopped').length || !rowsOk(vm.stoppedEarlier)) off.push('stopped earlier');
  if (sum(vm.lessonAreas) !== [...acc('won'), ...acc('lost'), ...acc('stopped')].reduce((n, r) => n + r.lessons.length, 0)) off.push('lessons');
  return off;
}

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const hot = firstWithRole(tenant, 'hot')!;
  const coord = firstWithRole(tenant, 'coord');
  const ctxOf = (viewer: Person) => ({ tenant, viewer, done: DONE, now: DEMO_NOW });
  const arch = (viewer: Person, period: ArchivePeriod) => archiveFor(ctxOf(viewer), { period });
  const a12 = arch(hot, '12m');
  const rec = bidRecordFor(tenant, DONE, hot);

  // 1. The archive's won and lost at 12 months are the Bid record's (PF-3). Stopped differs by design: the Bid record's declines include DG1 discards.
  add('Won and lost at 12 months: archive = Bid record (PF-3)', a12.totals.won === rec.totals.won && a12.totals.lost === rec.totals.lost,
    `archive ${a12.totals.won} won · ${a12.totals.lost} lost · Bid record ${rec.totals.won} won · ${rec.totals.lost} lost`);

  // 2. The list is DBR-1's endings, at each period.
  const dbr1 = kpi('DBR-1');
  const byPeriod = PERIODS.map((p) => {
    const shown = dbr1 ? Number.parseInt(dbr1.compute(kpiCtxOf({ tenant, viewer: hot, viewAs: false, done: DONE }, p, 'debriefs')).display.replace(/[^\d]/g, ''), 10) : NaN;
    return { p, rows: arch(hot, p).rows.length, shown };
  });
  add('Every debrief lists DBR-1’s endings (30 days, 90 days, 12 months)', !!dbr1 && byPeriod.every((x) => x.rows === x.shown),
    dbr1 ? byPeriod.map((x) => `${x.p}: ${x.rows} rows · DBR-1 ${Number.isNaN(x.shown) ? '?' : x.shown}`).join(' · ') : 'DBR-1 is not registered yet (plan 035)');

  // 3. Every breakdown adds up to its total, at each period.
  const sums = PERIODS.map((p) => ({ p, vm: arch(hot, p) })).map(({ p, vm }) => ({ p, off: sumsOff(vm), n: vm.totals.endings }));
  add('Every breakdown sums to its total', sums.every((x) => !x.off.length),
    sums.map((x) => `${x.p}: ${x.n} endings${x.off.length ? `, off: ${x.off.join(', ')}` : ''}`).join(' · '));

  // 4. The Bid record's top factor on each loss reason is the archive's.
  const factorOff = rec.losses.rows.filter((r) => !same(r.topFactor, a12.lossReasons.find((x) => x.id === r.key)?.topFactor)).map((r) => r.key);
  add('Bid record’s top factor per loss reason = the archive’s', !factorOff.length,
    `${rec.losses.rows.length} reasons · ${rec.losses.rows.map((r) => `${r.key} ${r.topFactor === 'masked' ? 'masked' : r.topFactor ? `${r.topFactor.label} (${r.topFactor.count})` : 'none yet'}`).join(', ')}${factorOff.length ? ` · off: ${list(factorOff)}` : ''}`);

  // 5. The CSV holds the table's columns, in order, then "Lessons (text)".
  const cols = gridColumnsOf();
  const shownCols = cols.filter((c) => !c.hide);
  const csv = csvParamsOf(tenant, '12m');
  const csvOk = same(csvHeadersOf(), [...shownCols.map((c) => c.headerName), 'Lessons (text)'])
    && same(csv.columnKeys, [...shownCols.map((c) => c.colId), ...cols.filter((c) => c.hide).map((c) => c.colId)])
    && csv.fileName === `debriefs-${tenant}-12m.csv`;
  add('CSV columns = the grid’s columns + “Lessons (text)”', csvOk, `${csvHeadersOf().length} columns · ${csv.fileName as string}`);

  // 6. A Bid Manager's list holds only the tenders assigned to them.
  const q = queriesFor({ tenant, viewer: hot, done: DONE });
  const bms = peopleOf(tenant).filter((p) => p.role === 'bid');
  const bmRows = bms.map((bm) => {
    const rows = arch(bm, '12m').rows;
    return { bm, n: rows.length, off: rows.filter((r) => q.one(r.tenderId)?.bidManagerId !== bm.id).map((r) => r.tenderId) };
  });
  add('A Bid Manager’s rows are only their assigned tenders', bmRows.every((x) => !x.off.length),
    bmRows.length ? bmRows.map((x) => `${x.bm.name} ${x.n}${x.off.length ? ` (not theirs: ${list(x.off)})` : ''}`).join(' · ') : 'no Bid Manager in this company');

  // 7. The Tender Coordinator can't open /debriefs, and reads the Bid record's debrief lines masked.
  const cap = SCREENS['/debriefs']?.cap;
  const shut = (['coord', 'proc', 'fin', 'hr'] as const).map((role) => firstWithRole(tenant, role)).filter((p): p is Person => !!p);
  const noneOpen = !!cap && shut.every((p) => !can(p, cap).ok);
  const rc = coord ? bidRecordFor(tenant, DONE, coord) : null;
  const coordMasked = !!rc && rc.losses.rows.every((r) => r.topFactor === 'masked') && rc.rows.every((r) => r.debrief === undefined || r.debrief === 'masked');
  add('The Tender Coordinator can’t open /debriefs; Bid record lines masked', noneOpen && coordMasked,
    `${cap ?? 'no cap'} · closed to ${shut.map((p) => p.role).join(', ')}: ${noneOpen ? 'yes' : 'no'} · coordinator's lines masked: ${coordMasked ? 'yes' : rc ? 'no' : 'no coordinator'}`);

  // 8. The sidebar lists Debriefs straight after Tender library, for every reader.
  const readers = (['hot', 'exec', 'member', 'dir', 'bid'] as const).map((role) => firstWithRole(tenant, role)).filter((p): p is Person => !!p);
  const placed = readers.map((p) => {
    const keys = navFor(p).find((g) => g.key === 'top')?.items.map((it) => it.key) ?? [];
    const i = keys.indexOf('debriefs');
    return { role: p.role, ok: i > 0 && keys[i - 1] === 'library' };
  });
  add('Sidebar: Debriefs sits after Tender library', placed.every((x) => x.ok), placed.map((x) => `${x.role} ${x.ok ? '✓' : '×'}`).join(' · '));

  return out;
}

export default function DebriefArchiveCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Debriefs archive (plan 037)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Debriefs archive (plan 037)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
