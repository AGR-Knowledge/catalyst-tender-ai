import { useMemo } from 'react';
import { gccData, type GccTenantKey } from '@/data/gcc';
import { personById } from '@/data/people';
import { stageOf } from '@/data/gcc/stages';
import { plusMin } from '@/data/gcc/lifecycle/chain';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { windowOf, previousOf } from '@/domain/gcc/period';
import { dataPort } from '@/domain/gcc/port';
import { currentOf, lifecycle, lifecyclesOf, openGate, type DemoDone } from '@/domain/gcc/lifecycle';
import { validationAction } from '@/domain/gcc/s1';
import { shortWhen } from '@/domain/gcc/s1/common';
import { dg1PackFor, dg1Queue, dg1Write, type Dg1Input } from '@/domain/gcc/dg1';
import { stage3EntryWrite } from '@/domain/gcc/demo/25-stage3-entry.apply';
import { dashboardSpec } from '@/domain/gcc/dashboards';
import { buildDashboard, dashboardCtx } from '@/domain/gcc/dashboards/build';
import { homeDashboardKey } from '@/domain/gcc/dashboards/home';
import type { ValidationItem } from '@/data/gcc/types';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 025b: a tender at Stage 1 · Validating moves on once the
 * Coordinator resolves its last field that blocks DG1: to Awaiting DG1 with
 * its Bid Manager when it waits for DG1, else to Screened. The DG1 gate stays
 * where the seed had it, or opens at logging for a tender routed to
 * validation, which has no DG1 due time in the seed (plan 026). It reads fixed tenants, so the panel is the same in
 * every tenant; `done` is in memory. Values are typed only in `EXPECT`.
 */

const TENANTS: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];

const CASES = [
  { tenant: 'najd', id: 'T-2026-118', label: 'Najd hero' },
  { tenant: 'corniche', id: 'T-2026-061', label: 'Corniche T-2026-061' },
  { tenant: 'batinah', id: 'T-2026-042', label: 'Batinah T-2026-042' },
] as const;

const EXPECT: Record<string, string> = {
  'Seed: no tender moves, in any tenant': 'none moved',
  'Najd hero · seed': 'Stage 1 · Validating · Aisha Al-Qahtani',
  'Najd hero · one blocking field resolved': 'Stage 1 · Validating · Aisha Al-Qahtani',
  'Najd hero · every blocking field resolved': 'Stage 1 · Awaiting DG1 · Omar Siddiqui · at the later resolution',
  'Najd hero · DG1 due': 'Mon 9 Mar 07:44 before and after · the DG1 list agrees',
  'Najd hero · Stage 1 dashboard': 'Awaiting DG1 0 → 1',
  'Najd hero · after DG1 Pursue': 'Stage 2 · Packaging · DG1 opened Sun 8 Mar 07:44, on time',
  'Najd hero · DG1 record as without the move': 'same opening, same on-time result',
  'Corniche T-2026-061 · seed': "Stage 1 · Validating · Joanna D'Souza",
  'Corniche T-2026-061 · only the field that does not block resolved': "Stage 1 · Validating · Joanna D'Souza",
  'Corniche T-2026-061 · every blocking field resolved': 'Stage 1 · Awaiting DG1 · Sameer Qureshi · at the later resolution',
  'Corniche T-2026-061 · DG1 due': 'Mon 9 Mar 07:52 before and after · the DG1 list agrees',
  'Corniche T-2026-061 · Stage 1 dashboard': 'Awaiting DG1 0 → 1',
  'Corniche T-2026-061 · after DG1 Pursue': 'Stage 2 · Packaging · DG1 opened Sun 8 Mar 07:52, on time',
  'Corniche T-2026-061 · DG1 record as without the move': 'same opening, same on-time result',
  'Corniche T-2026-061 · Advance to Stage 3': 'Stage 3 · Pack in preparation',
  'Batinah T-2026-042 · seed': 'Stage 1 · Validating · Shamsa Al-Hinai',
  'Batinah T-2026-042 · only the field that does not block resolved': 'Stage 1 · Validating · Shamsa Al-Hinai',
  'Batinah T-2026-042 · every blocking field resolved': 'Stage 1 · Awaiting DG1 · Imran Sheikh · at the later resolution',
  'Batinah T-2026-042 · DG1 due': 'none → Mon 9 Mar 07:41 · the DG1 list agrees',
  'Batinah T-2026-042 · Stage 1 dashboard': 'Awaiting DG1 0 → 1',
  'Batinah T-2026-042 · after DG1 Pursue': 'Stage 2 · Packaging · DG1 opened Sun 8 Mar 07:41, on time',
  'Batinah T-2026-042 · DG1 record as without the move': 'opened Sun 8 Mar 07:41, not Sun 8 Mar 07:35 · same on-time result',
  'Batinah T-2026-042 · Advance to Stage 3': 'Stage 3 · Pack in preparation',
  'A resolution without a time: the current step’s': 'Awaiting DG1 at the Validating step’s time',
  'A field sent back: still validating': 'Stage 1 · Validating',
  'Hold on a tender with no DG1 due time in the seed': 'Stage 1 · Awaiting DG1 · Hold opened Sun 8 Mar 07:41',
  'Decisions on time, Najd Head of Tendering, 30 days': 'same before and after the move',
};

type Done = Record<string, string>;
type Write = { key: string; value: string };
const put = (done: Done, ws: Write[]): Done => ({ ...done, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) });
const stepLabel = (stage: number, step: string) => stageOf(stage)?.steps.find((s) => s.key === step)?.label ?? step;

function where(tenant: string, id: string, done: DemoDone): string {
  const l = lifecycle(tenant, id, done);
  if (!l) return 'no lifecycle';
  const c = currentOf(l);
  return `Stage ${c.stage} · ${stepLabel(c.stage, c.step)}`;
}

const whereWho = (tenant: string, id: string, done: DemoDone) => {
  const l = lifecycle(tenant, id, done);
  return `${where(tenant, id, done)} · ${l ? personById(currentOf(l).ownerId)?.name ?? currentOf(l).ownerId : '?'}`;
};

/** The Coordinator's resolution: pick the first value of a conflict, else accept. */
const resolve = (tenant: string, v: ValidationItem, at?: string) =>
  validationAction(v, v.alt ? 'pick' : 'accept', { ...(v.alt ? { pick: 'value' as const } : {}), ...(at ? { at } : {}) }, `${tenant}.coord`);

/** The Stage 1 flow's step counts, as the Head of Tendering reads them today. */
function flowCounts(tenant: string, done: DemoDone): Map<string, number> {
  const spec = dashboardSpec('stage.1');
  const viewer = personById(`${tenant}.hot`);
  if (!spec || !viewer) return new Map();
  const window = windowOf('today', tenant);
  const vm = buildDashboard(spec, dashboardCtx(spec, { tenant, viewer, viewAs: false, window, prev: previousOf(window), done, now: DEMO_NOW }), dataPort());
  return new Map((vm.flow?.steps ?? []).map((s) => [s.label, s.parts.reduce((n, p) => n + p.count, 0)]));
}

function tileOf(tenant: string, id: string, done: DemoDone): string {
  const viewer = personById(`${tenant}.hot`);
  const key = viewer ? homeDashboardKey(viewer) : null;
  const spec = key ? dashboardSpec(key) : null;
  if (!viewer || !spec) return 'no home dashboard';
  const window = windowOf('30d', tenant);
  const vm = buildDashboard(spec, dashboardCtx(spec, { tenant, viewer, viewAs: false, window, prev: previousOf(window), done, now: DEMO_NOW }), dataPort());
  const t = vm.tiles.find((x) => x.id === id);
  return t ? [t.display, t.sub].filter(Boolean).join(' · ') : 'missing';
}

const dg1Of = (tenant: string, id: string, done: DemoDone) => lifecycle(tenant, id, done)?.gates.find((g) => g.gate === 'DG1');

function pursue(tenant: string, id: string, done: Done): Done {
  const pack = dg1PackFor(tenant, id, done)!;
  const t = gccData(tenant).register.find((x) => x.id === id)!;
  const input: Dg1Input = { tenderId: id, decision: 'pursue', note: 'Dev check: plan 025b', at: plusMin(DEMO_NOW, 20) };
  return put(done, dg1Write(input, t.bidManagerId ?? `${tenant}.bid`, pack, done).writes);
}

function compute(): Record<string, string> {
  const got: Record<string, string> = {};

  // Nothing moves until a field is resolved: an unrelated demo action leaves every lifecycle where the seed has it.
  const moved = TENANTS.flatMap((k) => {
    const other = lifecyclesOf(k, undefined, { 'dev:025b': '1' });
    return lifecyclesOf(k).filter((l, i) => JSON.stringify(currentOf(l)) !== JSON.stringify(currentOf(other[i]))).map((l) => `${k}:${l.tenderId}`);
  });
  got['Seed: no tender moves, in any tenant'] = moved.length ? `${moved.length} moved: ${moved.slice(0, 3).join(', ')}` : 'none moved';

  for (const { tenant, id, label } of CASES) {
    const items = gccData(tenant).register.find((t) => t.id === id)?.validations ?? [];
    const blocking = items.filter((v) => v.blocksDg1);
    const other = items.find((v) => !v.blocksDg1);
    got[`${label} · seed`] = whereWho(tenant, id, {});

    // One field first: a blocking one on the hero (it has two), else the one that does not block.
    const first = blocking.length > 1 ? blocking[0] : other;
    const firstKey = blocking.length > 1 ? `${label} · one blocking field resolved` : `${label} · only the field that does not block resolved`;
    got[firstKey] = first ? whereWho(tenant, id, put({}, [resolve(tenant, first, plusMin(DEMO_NOW, 2))])) : 'no such field';

    // Every blocking field, a few minutes apart: the tender moves at the later one.
    const times = blocking.map((_, i) => plusMin(DEMO_NOW, 2 + i * 3));
    const all = put({}, blocking.map((v, i) => resolve(tenant, v, times[i])));
    const l = lifecycle(tenant, id, all);
    const at = l ? currentOf(l).at : '';
    got[`${label} · every blocking field resolved`] = `${whereWho(tenant, id, all)} · ${at === times[times.length - 1] ? 'at the later resolution' : `at ${at}`}`;

    // The DG1 due time: the gate's end on the dashboards, and the DG1 list's.
    const due = (d: DemoDone) => { const x = lifecycle(tenant, id, d); const g = x ? openGate(x) : null; return g?.gate === 'DG1' ? g.slaEnd : null; };
    const [before, after] = [due({}), due(all)];
    const listed = dg1Queue(tenant, all).find((q) => q.tenderId === id)?.dueAt;
    got[`${label} · DG1 due`] = before === after
      ? `${before ? `${shortWhen(before)} before and after` : 'none before or after'} · ${listed ? (listed === before ? 'the DG1 list agrees' : `the DG1 list says ${shortWhen(listed)}`) : 'not in the DG1 list'}`
      : `${before ? shortWhen(before) : 'none'} → ${after ? shortWhen(after) : 'none'} · ${listed ? (listed === after ? 'the DG1 list agrees' : `the DG1 list says ${shortWhen(listed)}`) : 'not in the DG1 list'}`;

    // The Stage 1 dashboard: the steps whose counts change.
    const [f0, f1] = [flowCounts(tenant, {}), flowCounts(tenant, all)];
    got[`${label} · Stage 1 dashboard`] = [...f1.keys()].filter((k) => f0.get(k) !== f1.get(k)).map((k) => `${k} ${f0.get(k) ?? 0} → ${f1.get(k)}`).join(' · ') || 'no change';

    // DG1 Pursue, then the record against the same Pursue written without the resolutions (the seed's step).
    const pursued = pursue(tenant, id, all);
    const g = dg1Of(tenant, id, pursued);
    got[`${label} · after DG1 Pursue`] = `${where(tenant, id, pursued)} · DG1 opened ${g ? shortWhen(g.openedAt) : '?'}, ${g?.onTime ? 'on time' : 'late'}`;
    const bare = Object.fromEntries(Object.entries(pursued).filter(([k]) => !k.startsWith('val:')));
    const g0 = dg1Of(tenant, id, bare);
    got[`${label} · DG1 record as without the move`] = g && g0 && g.openedAt === g0.openedAt && g.onTime === g0.onTime
      ? 'same opening, same on-time result'
      : g && g0 ? `opened ${shortWhen(g.openedAt)}, not ${shortWhen(g0.openedAt)} · ${g.onTime === g0.onTime ? 'same on-time result' : 'the on-time result differs'}` : 'no record';

    if (tenant !== 'najd') {
      const w = stage3EntryWrite(tenant, id, `${tenant}.bid`, plusMin(DEMO_NOW, 25), pursued);
      got[`${label} · Advance to Stage 3`] = 'error' in w ? `refused: ${w.error}` : where(tenant, id, put(pursued, w.writes));
    }
  }

  // A value without a time (dev checks write '1') uses the current step's time.
  const hero = gccData('najd').register.find((t) => t.id === CASES[0].id)!;
  const ones = put({}, hero.validations.filter((v) => v.blocksDg1).map((v) => ({ key: `val:${v.id}`, value: '1' })));
  const [seedL, oneL] = [lifecycle('najd', hero.id, {}), lifecycle('najd', hero.id, ones)];
  got['A resolution without a time: the current step’s'] = seedL && oneL
    ? `${stepLabel(1, currentOf(oneL).step)} at ${currentOf(oneL).at === currentOf(seedL).at ? `the ${stepLabel(1, currentOf(seedL).step)} step’s time` : currentOf(oneL).at}` : 'no lifecycle';

  // Sending a field back keeps it open, so the tender stays.
  const sent = hero.validations.filter((v) => v.blocksDg1).map((v, i) => (i === 0 ? validationAction(v, 'send-back', { hint: 'Dev check' }, 'najd.coord') : resolve('najd', v)));
  got['A field sent back: still validating'] = where('najd', hero.id, put({}, sent));

  // No DG1 due time in the seed: once validated it waits for DG1 from logging (plan 026), so a Hold keeps it at Awaiting DG1.
  const t042 = gccData('batinah').register.find((t) => t.id === CASES[2].id)!;
  const r042 = put({}, t042.validations.filter((v) => v.blocksDg1).map((v) => resolve('batinah', v, plusMin(DEMO_NOW, 2))));
  const held = put(r042, dg1Write({ tenderId: t042.id, decision: 'hold', request: { toId: 'batinah.fin', what: 'Dev check', due: plusMin(DEMO_NOW, 240) }, at: plusMin(DEMO_NOW, 20) }, t042.bidManagerId, dg1PackFor('batinah', t042.id, r042)!, r042).writes);
  const h = dg1Of('batinah', t042.id, held);
  got['Hold on a tender with no DG1 due time in the seed'] = `${where('batinah', t042.id, held)} · ${h ? `${h.decision === 'hold' ? 'Hold' : h.decision} opened ${shortWhen(h.openedAt)}` : 'no record'}`;

  // PF-4 reads the gate records' on-time results: the same whether or not the hero moved first.
  const heroPursued = pursue('najd', hero.id, put({}, hero.validations.filter((v) => v.blocksDg1).map((v) => resolve('najd', v))));
  const heroBare = Object.fromEntries(Object.entries(heroPursued).filter(([k]) => !k.startsWith('val:')));
  const [pf, pf0] = [tileOf('najd', 'PF-4', heroPursued), tileOf('najd', 'PF-4', heroBare)];
  got['Decisions on time, Najd Head of Tendering, 30 days'] = pf === pf0 ? 'same before and after the move' : `${pf0} → ${pf}`;
  return got;
}

export default function ValidatedCheck() {
  const got = useMemo(compute, []);
  const rows = Object.entries(EXPECT).map(([name, expected]) => ({ name, expected, got: got[name] ?? 'missing' }));
  const failed = rows.filter((r) => r.got !== r.expected).length;
  return (
    <>
      <CardHead title="A tender moves on once validated (plan 025b)" meta={failed ? `${failed} of ${rows.length} checks failing` : `All ${rows.length} checks pass`} />
      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (r) => <span className="cell-main">{r.name}</span> },
          { key: 'e', header: 'Expected', width: '1.4fr', priority: 2, render: (r) => r.expected },
          { key: 'g', header: 'Got', width: '1.4fr', render: (r) => r.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (r) => (r.got === r.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
