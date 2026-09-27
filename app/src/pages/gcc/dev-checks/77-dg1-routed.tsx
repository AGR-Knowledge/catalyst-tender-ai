import { useMemo } from 'react';
import { gccData, type GccTenantKey } from '@/data/gcc';
import { personById } from '@/data/people';
import { stageOf } from '@/data/gcc/stages';
import { plusMin } from '@/data/gcc/lifecycle/chain';
import type { ValidationItem } from '@/data/gcc/types';
import { DEMO_NOW, addHours, slaState } from '@/domain/gcc/clock';
import { previousOf, windowEnd, windowOf } from '@/domain/gcc/period';
import { currentOf, lifecycle, openGate, type DemoDone } from '@/domain/gcc/lifecycle';
import { validationAction } from '@/domain/gcc/s1';
import { shortWhen } from '@/domain/gcc/s1/common';
import { DG1_SLA_HOURS, dg1PackFor, dg1Queue, dg1RecordFor, dg1Reopen, dg1Write, type Dg1Input } from '@/domain/gcc/dg1';
import { dg1PackStatus, waitsForDg1 } from '@/domain/gcc/dg1/record';
import { metric } from '@/domain/gcc/metrics';
import type { KpiCtx } from '@/domain/gcc/kpi/types';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 026: the four tenders intake routed to validation join
 * DG1 decisions once one of their items is resolved, with one DG1 due on the
 * list, the pack, the lifecycle and `openGate`. At seed nothing changes except
 * their pack header, which reads Validating with no clock; every other pack
 * keeps its clock. Also `windowEnd` and the stage graph's last point. It reads
 * fixed tenants, so the panel is the same in every tenant; `done` is in
 * memory. Values are typed only in `EXPECT`.
 */

const TENANTS: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];
const NAME: Record<GccTenantKey, string> = { najd: 'Najd', corniche: 'Corniche', dafna: 'Dafna', batinah: 'Batinah', qurain: 'Qurain' };

/** The four, each with the item resolved first (T-2026-042: the bid bond, its only blocking field). */
const ROUTED = [
  { tenant: 'batinah', id: 'T-2026-042', item: 'VAL-042-1', label: 'Batinah T-2026-042' },
  { tenant: 'batinah', id: 'T-2026-041', item: 'VAL-041-1', label: 'Batinah T-2026-041' },
  { tenant: 'najd', id: 'T-2026-120', item: 'VAL-120-1', label: 'Najd T-2026-120' },
  { tenant: 'qurain', id: 'T-2026-072', item: 'VAL-072-1', label: 'Qurain T-2026-072' },
] as const;

const EXPECT: Record<string, string> = {
  'Seed · the DG1 list in each company': 'Najd 2 · Corniche 2 · Dafna 3 · Batinah 0 · Qurain 1',
  'Seed · the DG1 list is intake’s shortlist': 'the same in all five',
  'Seed · none of the four waits for DG1': 'none waits',
  'Seed · the four packs': 'Validating, no clock · all four',
  'Seed · Batinah hero pack (low-fit)': 'Waiting for DG1 · 23 h 19 m left of 24 h',
  'Seed · every other undecided pack reads as before': 'all 20 as before · 19 with a clock',
  'Batinah T-2026-042 · waits for DG1': 'yes',
  'Batinah T-2026-042 · DG1 list': 'listed · due Mon 9 Mar 07:41 (logging + 24 h)',
  'Batinah T-2026-042 · lifecycle': 'Stage 1 · Awaiting DG1 · Imran Sheikh (its Bid Manager)',
  'Batinah T-2026-042 · DG1 gate': 'opens at logging · ends at the list’s due',
  'Batinah T-2026-042 · pack header': 'Waiting for DG1 · 21 h 41 m left of 24 h',
  'Batinah T-2026-041 · waits for DG1': 'yes',
  'Batinah T-2026-041 · DG1 list': 'listed · due Mon 9 Mar 08:52 (logging + 24 h)',
  'Batinah T-2026-041 · lifecycle': 'Stage 1 · Awaiting DG1 · Imran Sheikh (its Bid Manager)',
  'Batinah T-2026-041 · DG1 gate': 'opens at logging · ends at the list’s due',
  'Batinah T-2026-041 · pack header': 'Waiting for DG1 · 22 h 52 m left of 24 h',
  'Najd T-2026-120 · waits for DG1': 'yes',
  'Najd T-2026-120 · DG1 list': 'listed · due Mon 9 Mar 08:13 (logging + 24 h)',
  'Najd T-2026-120 · lifecycle': 'Stage 1 · Awaiting DG1 · Omar Siddiqui (its Bid Manager)',
  'Najd T-2026-120 · DG1 gate': 'opens at logging · ends at the list’s due',
  'Najd T-2026-120 · pack header': 'Waiting for DG1 · 22 h 13 m left of 24 h',
  'Qurain T-2026-072 · waits for DG1': 'yes',
  'Qurain T-2026-072 · DG1 list': 'listed · due Mon 9 Mar 09:01 (logging + 24 h)',
  'Qurain T-2026-072 · lifecycle': 'Stage 1 · Awaiting DG1 · Tariq Mahmood (its Bid Manager)',
  'Qurain T-2026-072 · DG1 gate': 'opens at logging · ends at the list’s due',
  'Qurain T-2026-072 · pack header': 'Waiting for DG1 · 23 h 1 m left of 24 h',
  'T-2026-042 · Hold': 'Stage 1 · Awaiting DG1 · listed, on hold',
  'T-2026-042 · Pursue, then Re-open': 'Stage 1 · Awaiting DG1 · listed, re-opened',
  'T-2026-042 · Pursue': 'Stage 2 · Packaging · DG1 opened Sun 8 Mar 07:41, on time',
  'windowEnd · the 30-day window': '2026-03-08T11:59',
  'windowEnd · a window ending elsewhere': 'keeps its end',
  'Hero pursued live at 10:03 · portfolio graph, Tenders in the period, 30 days': 'Stage 2 · 1 more',
  'Hero pursued live at 10:03 · Stage 2 graph, Tenders in the period, 30 days': 'Packaging · 1 more',
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

/** The Coordinator's resolution: pick the first value of a conflict, else accept. */
const resolve = (tenant: string, v: ValidationItem, at: string) =>
  validationAction(v, v.alt ? 'pick' : 'accept', { ...(v.alt ? { pick: 'value' as const } : {}), at }, `${tenant}.coord`);

const itemOf = (tenant: string, id: string, itemId: string) => gccData(tenant).register.find((t) => t.id === id)!.validations.find((v) => v.id === itemId)!;

function decide(tenant: string, id: string, done: Done, input: Omit<Dg1Input, 'tenderId'>): Done {
  const t = gccData(tenant).register.find((x) => x.id === id)!;
  return put(done, dg1Write({ tenderId: id, ...input }, t.bidManagerId, dg1PackFor(tenant, id, done)!, done).writes);
}

/** The header as the pack prints it: the status, then its clock or its line. */
function header(tenant: string, id: string, done: Done): string {
  const s = dg1PackStatus(tenant, id, done);
  return `${s.label} · ${s.clock ? slaState(s.clock.start, s.clock.end).text : s.note ?? 'no clock'}`;
}

/** "Tenders in the period" over 30 days, as the Head of Tendering's graph reads it. */
function inPeriod(tenant: string, done: Done, id: 'stages.inPeriod' | 'steps.inPeriod', stage?: number): number[] {
  const viewer = personById(`${tenant}.hot`)!;
  const window = windowOf('30d', tenant);
  const ctx: KpiCtx = {
    tenant, viewer, viewAs: false, window, prev: previousOf(window), done, now: DEMO_NOW,
    scope: stage ? { kind: 'stage', stage } : { kind: 'all' }, dashboard: stage ? `stage.${stage}` : 'portfolio.hot',
  };
  const keys = stage ? (stageOf(stage)?.steps ?? []).map((s) => s.key) : ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (metric(id)?.compute(ctx, keys).values ?? []).map((v) => v ?? 0);
}

function compute(): Record<string, string> {
  const got: Record<string, string> = {};

  // At seed: the DG1 lists are intake's shortlist, as before plan 026.
  got['Seed · the DG1 list in each company'] = TENANTS.map((k) => `${NAME[k]} ${dg1Queue(k, {}).length}`).join(' · ');
  const differ = TENANTS.filter((k) => {
    const shortlist = gccData(k).register.filter((t) => {
      if (t.intake.disposition !== 'shortlisted' || !t.intake.loggedAt) return false;
      const s = dg1RecordFor(k, t.id, {});
      return !s.current && (t.stage === 'S1' || !!s.reopen);
    }).map((t) => t.id).sort();
    return JSON.stringify(shortlist) !== JSON.stringify(dg1Queue(k, {}).map((q) => q.tenderId).sort());
  });
  got['Seed · the DG1 list is intake’s shortlist'] = differ.length ? `differs in ${differ.join(', ')}` : 'the same in all five';
  const waiting = ROUTED.filter((r) => waitsForDg1(r.tenant, r.id, {}));
  got['Seed · none of the four waits for DG1'] = waiting.length ? waiting.map((r) => r.id).join(', ') : 'none waits';
  const odd = ROUTED.filter((r) => { const s = dg1PackStatus(r.tenant, r.id, {}); return s.label !== 'Validating' || s.clock; });
  got['Seed · the four packs'] = odd.length ? `${odd.map((r) => `${r.id} ${header(r.tenant, r.id, {})}`).join('; ')}` : 'Validating, no clock · all four';
  got['Seed · Batinah hero pack (low-fit)'] = header('batinah', 'T-2026-118', {});
  // Every other undecided tender with a pack reads as before plan 026: its status, and a clock from logging when it was logged.
  const others = TENANTS.flatMap((k) => gccData(k).register
    .filter((t) => t.intake.disposition !== 'needs-validation' && !dg1RecordFor(k, t.id, {}).current && dg1PackFor(k, t.id, {}))
    .map((t) => {
      const s = dg1RecordFor(k, t.id, {});
      const at = t.intake.loggedAt;
      const before = { label: s.hold ? 'On hold' : s.reopen ? 'Re-opened' : 'Waiting for DG1', clock: at ? { start: at, end: addHours(at, DG1_SLA_HOURS) } : null };
      const now = dg1PackStatus(k, t.id, {});
      return { same: now.label === before.label && JSON.stringify(now.clock) === JSON.stringify(before.clock) && !now.note, clock: !!now.clock, id: `${k}:${t.id}` };
    }));
  const moved = others.filter((o) => !o.same);
  got['Seed · every other undecided pack reads as before'] = moved.length ? `${moved.length} changed: ${moved.map((o) => o.id).join(', ')}` : `all ${others.length} as before · ${others.filter((o) => o.clock).length} with a clock`;

  // One item resolved on each of the four.
  for (const r of ROUTED) {
    const t = gccData(r.tenant).register.find((x) => x.id === r.id)!;
    const done = put({}, [resolve(r.tenant, itemOf(r.tenant, r.id, r.item), plusMin(DEMO_NOW, 2))]);
    const loggedAt = t.intake.loggedAt!;
    got[`${r.label} · waits for DG1`] = waitsForDg1(r.tenant, r.id, done) ? 'yes' : 'no';
    const q = dg1Queue(r.tenant, done).find((x) => x.tenderId === r.id);
    got[`${r.label} · DG1 list`] = q ? `listed · due ${shortWhen(q.dueAt)}${q.dueAt === addHours(loggedAt, DG1_SLA_HOURS) ? ' (logging + 24 h)' : ''}` : 'not listed';
    const l = lifecycle(r.tenant, r.id, done);
    const owner = l ? currentOf(l).ownerId : null;
    got[`${r.label} · lifecycle`] = `${where(r.tenant, r.id, done)} · ${personById(owner)?.name ?? owner}${owner === t.bidManagerId ? ' (its Bid Manager)' : ''}`;
    const g = l ? openGate(l) : null;
    got[`${r.label} · DG1 gate`] = g?.gate !== 'DG1' ? 'no DG1 gate'
      : `${g.openedAt === loggedAt ? 'opens at logging' : `opens ${shortWhen(g.openedAt)}`} · ${q && g.slaEnd === q.dueAt ? 'ends at the list’s due' : `ends ${shortWhen(g.slaEnd)}`}`;
    got[`${r.label} · pack header`] = header(r.tenant, r.id, done);
  }

  // T-2026-042's DG1 paths once validated.
  const t042 = ROUTED[0];
  const v042 = put({}, [resolve('batinah', itemOf('batinah', t042.id, t042.item), plusMin(DEMO_NOW, 2))]);
  const listedAs = (done: Done) => { const q = dg1Queue('batinah', done).find((x) => x.tenderId === t042.id); return q ? `listed${q.held ? ', on hold' : q.reopened ? ', re-opened' : ''}` : 'not listed'; };
  const held = decide('batinah', t042.id, v042, { decision: 'hold', request: { toId: 'batinah.fin', what: 'Dev check', due: plusMin(DEMO_NOW, 240) }, at: plusMin(DEMO_NOW, 20) });
  got['T-2026-042 · Hold'] = `${where('batinah', t042.id, held)} · ${listedAs(held)}`;
  const pursued = decide('batinah', t042.id, v042, { decision: 'pursue', note: 'Dev check: plan 026', at: plusMin(DEMO_NOW, 20) });
  const reopened = put(pursued, dg1Reopen('batinah', t042.id, 'Dev check: plan 026', 'batinah.bid', pursued, plusMin(DEMO_NOW, 25)).writes);
  got['T-2026-042 · Pursue, then Re-open'] = `${where('batinah', t042.id, reopened)} · ${listedAs(reopened)}`;
  const g042 = lifecycle('batinah', t042.id, pursued)?.gates.find((g) => g.gate === 'DG1');
  got['T-2026-042 · Pursue'] = `${where('batinah', t042.id, pursued)} · DG1 opened ${g042 ? shortWhen(g042.openedAt) : '?'}, ${g042?.onTime ? 'on time' : 'late'}`;

  // windowEnd: only a window that ends at the demo clock runs on to the demo's minutes.
  const w30 = windowOf('30d', 'najd');
  got['windowEnd · the 30-day window'] = windowEnd(w30);
  const prev = previousOf(w30);
  got['windowEnd · a window ending elsewhere'] = windowEnd(prev) === prev.to ? 'keeps its end' : windowEnd(prev);

  // Script A: the hero's fields resolved at 10:00 and 10:01, then Pursue at 10:03. Stage 2 counts it at the graph's last point.
  const hero = gccData('najd').register.find((t) => t.id === 'T-2026-118')!;
  const heroV = put({}, hero.validations.filter((v) => v.blocksDg1).map((v, i) => resolve('najd', v, plusMin(DEMO_NOW, i))));
  const heroP = decide('najd', hero.id, heroV, { decision: 'pursue', note: 'Dev check: plan 026', at: plusMin(DEMO_NOW, 3) });
  const more = (a: number[], b: number[], i: number, what: string) => (b[i] - a[i] === 1 ? `${what} · 1 more` : `${what} ${a[i]} → ${b[i]}`);
  got['Hero pursued live at 10:03 · portfolio graph, Tenders in the period, 30 days'] = more(inPeriod('najd', heroV, 'stages.inPeriod'), inPeriod('najd', heroP, 'stages.inPeriod'), 1, 'Stage 2');
  const s2keys = (stageOf(2)?.steps ?? []).map((s) => s.key);
  got['Hero pursued live at 10:03 · Stage 2 graph, Tenders in the period, 30 days'] = more(inPeriod('najd', heroV, 'steps.inPeriod', 2), inPeriod('najd', heroP, 'steps.inPeriod', 2), s2keys.indexOf('packaging'), 'Packaging');
  return got;
}

export default function Dg1RoutedCheck() {
  const got = useMemo(compute, []);
  const rows = Object.entries(EXPECT).map(([name, expected]) => ({ name, expected, got: got[name] ?? 'missing' }));
  const failed = rows.filter((r) => r.got !== r.expected).length;
  return (
    <>
      <CardHead title="Validated tenders join DG1 (plan 026)" meta={failed ? `${failed} of ${rows.length} checks failing` : `All ${rows.length} checks pass`} />
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
