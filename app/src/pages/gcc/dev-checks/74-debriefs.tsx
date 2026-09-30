import { useMemo } from 'react';
import { can } from '@/data/access';
import { firstWithRole, type Person } from '@/data/people';
import { TENANTS } from '@/data/tenants';
import { isGccTenantKey } from '@/data/gcc';
import { GCC_KEYS, LIFECYCLES, type Lifecycle } from '@/data/gcc/lifecycle';
import { S2_SUPPLIERS } from '@/data/gcc/s2';
import { DEBRIEF_SEED, EXAMPLES, RIVALS, isKnownStop } from '@/data/gcc/debriefs';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { lifecycle, tenderCtx } from '@/domain/gcc/lifecycle';
import { trackerFor } from '@/domain/gcc/lifecycle.port';
import { windowOf } from '@/domain/gcc/period';
import { applyWrites, isWriteError, type Done } from '@/domain/gcc/s3/done';
import { positionWrite } from '@/domain/gcc/dg2/positions';
import { decisionState, dg2Write, reasonLabel } from '@/domain/gcc/dg2/decision';
import {
  RIVAL_FIXED, archiveFor, debriefAcceptWrite, debriefBackWrite, debriefFor, debriefSubmitWrite, endingOf, isDebriefError, validateDebrief,
  type DebriefInput, type DebriefWriteResult,
} from '@/domain/gcc/debriefs';
import { hasLessons, isBid } from '@/domain/gcc/debriefs/endings';
import { hasMoney } from '@/domain/gcc/debriefs/form';
import { recordsFor } from '@/domain/gcc/debriefs/records';
import { ACTION_SOURCES } from '@/domain/gcc/actions/debrief.actions';
import { KPIS as STAGE9 } from '@/domain/gcc/kpi/stage9.kpi';
import type { KpiCtx } from '@/domain/gcc/kpi/types';
import { useTenantKey } from '@/domain/tenancy';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 035: debrief records and rules. Runs on the seed and on in-memory
 * `done` maps built with the debrief writers (and the DG2 writer), never on
 * the live demo, so it changes nothing. It reads all five tenants whichever
 * is open: endings, the seed's statuses and times, rivals, coverage, the
 * demo-day pins, the examples, the round trip, what acceptance changes, and access.
 */

interface Check { name: string; ok: boolean; got: string }

const NONE: Done = {};
const list = (xs: string[], n = 3) => (xs.length ? `${xs.slice(0, n).join(', ')}${xs.length > n ? ` +${xs.length - n}` : ''}` : 'none');
const hot = (t: string) => firstWithRole(t, 'hot')!;
const dir = (t: string) => firstWithRole(t, 'dir')!;
const dctx = (tenant: string, viewer: Person, done: Done = NONE) => ({ tenant, viewer, done, now: DEMO_NOW });
const kctx = (tenant: string, viewer: Person, done: Done) => ({
  tenant, viewer, done, now: DEMO_NOW, viewAs: false, window: windowOf('30d', tenant), prev: windowOf('30d', tenant), scope: { kind: 'all' }, dashboard: 'stage.9',
}) as unknown as KpiCtx;
const rowsOf = (id: string, tenant: string, viewer: Person, done: Done) => ACTION_SOURCES.find((s) => s.id === id)!.rows(kctx(tenant, viewer, done));
const kpi = (id: string, tenant: string, done: Done) => STAGE9.find((k) => k.id === id)!.compute(kctx(tenant, hot(tenant), done));

/** Writes applied in turn: each write sees the state the one before left. `after` reads the state after each step. */
function run(done: Done, steps: ((d: Done) => DebriefWriteResult | { error: string })[], after?: (d: Done) => string) {
  let d = done;
  const audit: string[] = [];
  const errors: string[] = [];
  const states: string[] = [];
  for (const step of steps) {
    const r = step(d);
    if (isDebriefError(r)) errors.push(r.error);
    else { d = applyWrites(d, r.writes); audit.push(...r.audit.map((a) => a.action)); }
    if (after) states.push(after(d));
  }
  return { done: d, audit, errors, states };
}

const at = (hhmm: string) => `2026-03-08T${hhmm}`;
const exampleOf = (tenant: string, id: string): DebriefInput | undefined => (EXAMPLES as Record<string, Record<string, DebriefInput>>)[tenant]?.[id];

/** A No-Bid on Najd T-2026-097 at DG2, in memory (script C): positions to quorum, then the DG2 writer. */
function noBid097(): { done: Done; error?: string } {
  const id = 'T-2026-097';
  let d: Done = NONE;
  let state = decisionState('najd', id, d);
  for (const seat of state.positions.seats.filter((x) => !x.position)) {
    if (state.positions.quorum.met) break;
    const w = positionWrite(id, seat.seat, { stance: 'oppose', comment: 'The Water team is committed until May', packVersion: state.packVersion ?? 1, round: state.round }, seat.personId, undefined, at('10:02'));
    if (isWriteError(w)) return { done: NONE, error: w.error };
    d = applyWrites(d, [w]);
    state = decisionState('najd', id, d);
  }
  const r = dg2Write({ tenderId: id, decision: 'no-bid', reasonCodes: ['capacity-conflict'], staleAcknowledged: true, reason: 'Delivery load would pass the safe level this quarter' }, hot('najd').id, state, at('10:05'));
  return 'error' in r ? { done: NONE, error: r.error } : { done: applyWrites(d, r.writes) };
}

function checks(): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const seedOf = (t: string) => DEBRIEF_SEED[t as keyof typeof DEBRIEF_SEED] ?? [];
  const lcs = (t: string): Lifecycle[] => LIFECYCLES[t as keyof typeof LIFECYCLES] ?? [];

  // 1. Endings: every bid that ended has exactly one record; discards and lapsed holds have none.
  {
    const bad: string[] = [];
    const counts = GCC_KEYS.map((t) => {
      const recs = seedOf(t);
      for (const l of lcs(t)) {
        const e = endingOf(l);
        const ended = isBid(l) && (!!l.result || !!l.closedAt);
        const n = recs.filter((r) => r.tenderId === l.tenderId).length;
        if (ended !== !!e) bad.push(`${t} ${l.tenderId}: ${e ?? 'no ending'}`);
        if (n !== (e ? 1 : 0)) bad.push(`${t} ${l.tenderId}: ${n} records`);
        if (!isBid(l) && (l.closedAs === 'discarded' || l.closedAs === 'withdrawn') && e) bad.push(`${t} ${l.tenderId}: a DG1 close has an ending`);
      }
      return `${t} ${recs.length}`;
    });
    add('Every ended bid has exactly one ending and one record; DG1 discards and lapsed holds have none', !bad.length, bad.length ? list(bad) : counts.join(' · '));
  }

  // 2. Every withdrawn note is classified.
  {
    const bad = GCC_KEYS.flatMap((t) => lcs(t).filter((l) => isBid(l) && l.closedAs === 'withdrawn' && (!l.result || l.result.result === 'withdrawn') && !isKnownStop(l.closedNote ?? ''))
      .map((l) => `${t} ${l.tenderId}: "${l.closedNote ?? ''}"`));
    const n = GCC_KEYS.reduce((s, t) => s + lcs(t).filter((l) => isBid(l) && l.closedAs === 'withdrawn').length, 0);
    add('Every withdrawn note is in STOP_NOTES', !bad.length, bad.length ? list(bad, 2) : `${n} withdrawn bids, all classified`);
  }

  // 3. Won and lost: accepted exactly when the lessons are recorded.
  {
    const bad = GCC_KEYS.flatMap((t) => seedOf(t).filter((r) => r.ending === 'won' || r.ending === 'lost').flatMap((r) => {
      const l = lcs(t).find((x) => x.tenderId === r.tenderId)!;
      return !!r.accepted !== hasLessons(l) ? [`${t} ${r.tenderId}`] : [];
    }));
    const n = GCC_KEYS.reduce((s, t) => s + seedOf(t).filter((r) => (r.ending === 'won' || r.ending === 'lost') && r.accepted).length, 0);
    add('Won and lost debriefs are accepted exactly when Stage 9 has lessons', !bad.length, bad.length ? list(bad) : `${n} accepted, each with its lessons event`);
  }

  // 4. Seed times.
  {
    const bad = GCC_KEYS.flatMap((t) => seedOf(t).flatMap((r) => {
      const s = r.submission;
      const why = [
        s && s.at < r.endedAt && 'submitted before the ending',
        s && s.at > DEMO_NOW && 'submitted after the clock',
        r.accepted && s && r.accepted.at <= s.at && 'accepted before submitted',
        r.accepted && r.accepted.at > DEMO_NOW && 'accepted after the clock',
        r.accepted && !s && 'accepted with no submission',
      ].filter(Boolean);
      return why.length ? [`${t} ${r.tenderId}: ${why.join(', ')}`] : [];
    }));
    add('Seed times: submitted ≥ ended, accepted > submitted, none after Sun 8 Mar 10:00', !bad.length, bad.length ? list(bad, 2) : `${GCC_KEYS.reduce((s, t) => s + seedOf(t).filter((r) => r.submission).length, 0)} submissions in order`);
  }

  // 5. A seeded lost debrief's main reason is the result's.
  {
    const bad = GCC_KEYS.flatMap((t) => seedOf(t).filter((r) => r.ending === 'lost' && r.submission).flatMap((r) => {
      const l = lcs(t).find((x) => x.tenderId === r.tenderId)!;
      return r.submission!.main !== (l.result?.lossReason ?? 'other') ? [`${t} ${r.tenderId}: ${r.submission!.main} ≠ ${l.result?.lossReason}`] : [];
    }));
    add("A seeded loss's main reason is the result's loss reason", !bad.length, bad.length ? list(bad) : 'All agree');
  }

  // 6. Rivals: named from the tenant's list; no rival is a supplier or a tenant.
  {
    const fixed = RIVAL_FIXED.map((r) => r.id);
    const others = new Set([...TENANTS.flatMap((t) => [t.name, t.legal].filter(Boolean) as string[]), ...GCC_KEYS.flatMap((t) => S2_SUPPLIERS[t].map((s) => s.name))].map((x) => x.toLowerCase()));
    const bad: string[] = [];
    for (const t of GCC_KEYS) {
      const rivals = (RIVALS as Record<string, { id: string; name: string }[]>)[t] ?? [];
      for (const r of rivals) if (others.has(r.name.toLowerCase())) bad.push(`${t}: ${r.name} is also a supplier or tenant`);
      for (const r of seedOf(t)) {
        const id = r.submission?.rivalId;
        if (id && !fixed.includes(id) && !rivals.some((x) => x.id === id)) bad.push(`${t} ${r.tenderId}: rival ${id}`);
      }
    }
    add("Every rival named is in the tenant's list; none is a supplier's or a tenant's name", !bad.length,
      bad.length ? list(bad, 2) : GCC_KEYS.map((t) => `${t} ${((RIVALS as Record<string, unknown[]>)[t] ?? []).length}`).join(' · '));
  }

  // 7. Coverage: accepted ÷ endings, 80–95% in each tenant.
  {
    const cov = GCC_KEYS.map((t) => { const r = seedOf(t); const pct = r.length ? Math.round((r.filter((x) => x.accepted).length / r.length) * 100) : 0; return { t, pct }; });
    add('Coverage (accepted ÷ endings) is 80–95% in each tenant', cov.every((c) => c.pct >= 80 && c.pct <= 95), cov.map((c) => `${c.t} ${c.pct}%`).join(' · '));
  }

  // 8. The demo-day pins.
  {
    const pins: [string, string, string, string?][] = [
      ['najd', 'T-2025-270', 'due'], ['najd', 'T-2025-262', 'due', '2026-03-10'], ['najd', 'T-2025-255', 'accepted'], ['najd', 'T-2025-438', 'submitted'],
      ['corniche', 'T-2025-120', 'due'], ['dafna', 'T-2025-333', 'overdue'], ['batinah', 'T-2025-120', 'due'], ['qurain', 'T-2025-352', 'due', '2026-03-08'],
    ];
    const got = pins.map(([t, id, want, by]) => {
      const vm = debriefFor(dctx(t, hot(t)), id);
      const ok = !!vm && vm.status === want && (!by || vm.dueBy === by);
      return { ok, text: `${t} ${id} ${vm ? `${vm.status}${by ? ` by ${vm.dueBy}` : ''}` : 'none'}` };
    });
    add('Demo day: the statuses the Design pins', got.every((g) => g.ok), got.filter((g) => !g.ok).map((g) => g.text).join(' · ') || got.map((g) => g.text.split(' ').slice(1).join(' ')).join(' · '));
  }

  // 9. The examples pass the form's rules, and no lesson anywhere names money.
  {
    const nb = noBid097();
    const bad: string[] = [];
    for (const [t, byId] of Object.entries(EXAMPLES as Record<string, Record<string, unknown>>)) {
      for (const id of Object.keys(byId)) {
        const done = t === 'najd' && id === 'T-2026-097' ? nb.done : NONE;
        const vm = debriefFor(dctx(t, dir(t), done), id);
        const input = exampleOf(t, id)!;
        const v = vm ? validateDebrief(input, vm) : { ok: false, errors: [nb.error ?? 'no debrief'] };
        if (!v.ok) bad.push(`${t} ${id}: ${v.errors[0]}`);
        if (input.lessons.some((x) => hasMoney(x.text))) bad.push(`${t} ${id}: a lesson names money`);
      }
    }
    const money = GCC_KEYS.flatMap((t) => seedOf(t).filter((r) => r.submission?.lessons.some((x) => hasMoney(x.text)) || hasMoney(r.submission?.employer?.said ?? '')).map((r) => `${t} ${r.tenderId}`));
    const n = Object.values(EXAMPLES as Record<string, object>).reduce((s, x) => s + Object.keys(x).length, 0);
    add('Each example passes validateDebrief; no lesson in the seed or the examples names money', !bad.length && !money.length,
      [...bad, ...money.map((m) => `${m}: money in the seed`)].slice(0, 3).join(' · ') || `${n} examples valid · seed clean`);
  }

  // 10. The round trip on Najd T-2025-270: submit, send back, re-submit, accept.
  const T = 'T-2025-270';
  const input = exampleOf('najd', T)!;
  const trip = run(NONE, [
    (d) => debriefSubmitWrite(dctx('najd', dir('najd'), d), input, dir('najd'), at('10:05')),
    (d) => debriefBackWrite(dctx('najd', hot('najd'), d), T, 'Name the rival’s programme advantage too', hot('najd'), at('10:10')),
    (d) => debriefSubmitWrite(dctx('najd', dir('najd'), d), input, dir('najd'), at('10:15')),
    (d) => debriefAcceptWrite(dctx('najd', hot('najd'), d), T, hot('najd'), at('10:20')),
  ], (d) => { const vm = debriefFor(dctx('najd', hot('najd'), d), T); return `${vm?.status}${vm?.record.submission ? ` r${vm.record.submission.round}` : ''}`; });
  {
    const want = ['submitted r1', 'sent-back r1', 'submitted r2', 'accepted r2'];
    const acts = ['Debrief submitted', 'Debrief sent back', 'Debrief re-submitted', 'Debrief accepted'];
    add('Round trip on T-2025-270: rounds 1 and 2, the right statuses, four audit entries',
      !trip.errors.length && trip.states.join() === want.join() && trip.audit.join() === acts.join(),
      trip.errors.length ? trip.errors.join(' · ') : `${trip.states.join(' → ')} · ${trip.audit.length} audit entries`);
  }

  // 11. What acceptance changes.
  {
    const before = lifecycle('najd', T, NONE)!;
    const l = lifecycle('najd', T, trip.done)!;
    const last = l.log[l.log.length - 1];
    const res3 = [kpi('RES-3', 'najd', NONE).display, kpi('RES-3', 'najd', trip.done).display];
    const stillRow = rowsOf('debrief.record', 'najd', dir('najd'), trip.done).some((r) => r.tenderId === T);
    const wasRow = rowsOf('debrief.record', 'najd', dir('najd'), NONE).some((r) => r.tenderId === T);
    add('Acceptance: lessons event, Lessons captured, closed as lost; RES-3 counts it; the Record the debrief row leaves',
      !hasLessons(before) && hasLessons(l) && last.step === 'lessons-captured' && l.closedAs === 'lost' && l.closedNote === 'Lost on price; lessons captured' && res3[0] !== res3[1] && wasRow && !stillRow,
      `${last.stage} · ${last.step} · ${l.closedAs ?? 'live'} · "${l.closedNote ?? ''}" · RES-3 ${res3[0]} → ${res3[1]} · row ${wasRow ? (stillRow ? 'still there' : 'gone') : 'never there'}`);
  }

  // 12. A changed main loss reason moves OUT-6 and the tracker line.
  {
    const tech: DebriefInput = { ...input, main: 'technical', mainNote: 'The employer told us the technical score decided it, not the price' };
    const r = run(NONE, [
      (d) => debriefSubmitWrite(dctx('najd', dir('najd'), d), tech, dir('najd'), at('10:05')),
      (d) => debriefAcceptWrite(dctx('najd', hot('najd'), d), T, hot('najd'), at('10:20')),
    ]);
    const out6 = [kpi('OUT-6', 'najd', NONE).sub, kpi('OUT-6', 'najd', r.done).sub];
    const l = lifecycle('najd', T, r.done)!;
    const line = trackerFor(l, 'najd', hot('najd'), r.done).outcome ?? '';
    const facts = debriefFor(dctx('najd', hot('najd'), r.done), T)?.facts.lossReason;
    add("A changed main reason: OUT-6 and the tracker read Technical; the result's Price stays in the facts",
      !r.errors.length && l.result?.lossReason === 'technical' && out6[0] !== out6[1] && line.includes('technical score') && facts === 'price',
      r.errors.length ? r.errors.join(' · ') : `OUT-6 ${out6[0]} → ${out6[1]} · "${line}" · facts ${facts}`);
  }

  // 13. A live DG2 No-Bid on Najd T-2026-097 gives a due debrief with the gate's reasons.
  {
    const nb = noBid097();
    const vm = debriefFor(dctx('najd', hot('najd'), nb.done), 'T-2026-097');
    const want = reasonLabel('capacity-conflict');
    add('A DG2 No-Bid on T-2026-097 (in memory) gives a due No-Bid debrief with the gate’s reasons',
      !nb.error && vm?.status === 'due' && vm.ending === 'no-bid' && vm.record.source === 'demo' && !!vm.facts.gateReasons?.includes(want),
      nb.error ?? `${vm?.status} · ${vm?.ending} · ${vm?.record.source} · ${vm?.facts.gateReasons?.join(', ') ?? 'no reasons'}`);
  }

  // 14. The archive's totals and breakdowns add up.
  {
    const bad: string[] = [];
    const got = GCC_KEYS.map((t) => {
      const a = archiveFor(dctx(t, hot(t)), { period: '12m' });
      const x = a.totals;
      const sum = (rows: { count: number }[]) => rows.reduce((s, r) => s + r.count, 0);
      const accWon = a.rows.filter((r) => r.status === 'accepted' && r.ending === 'won').length;
      const accLost = a.rows.filter((r) => r.status === 'accepted' && r.ending === 'lost').length;
      const accStopped = a.rows.filter((r) => r.status === 'accepted' && r.group === 'stopped').length;
      if (x.endings !== x.won + x.lost + x.stopped) bad.push(`${t}: endings ≠ won + lost + stopped`);
      if (x.endings !== x.accepted + x.submitted + x.sentBack + x.due + x.overdue) bad.push(`${t}: statuses don't sum`);
      if (sum(a.winReasons) !== accWon || sum(a.lossReasons) !== accLost || sum(a.stopped) !== accStopped) bad.push(`${t}: a breakdown doesn't sum`);
      if (a.rows.length !== x.endings) bad.push(`${t}: rows ≠ endings`);
      return `${t} ${x.endings} = ${x.won}+${x.lost}+${x.stopped}`;
    });
    add('Archive (12 months): endings = won + lost + stopped; every breakdown sums to its total', !bad.length, bad.length ? list(bad) : got.join(' · '));
  }

  // 15. Access: record and accept are separate people; the coordinator can't read; a Bid Manager reads their own.
  {
    const t = 'najd';
    const l = lifecycle(t, T)!;
    const c = tenderCtx(t, l);
    const coord = firstWithRole(t, 'coord')!;
    const bid = firstWithRole(t, 'bid')!;
    const ok = (p: Person, cap: Parameters<typeof can>[1]) => can(p, cap, c).ok;
    const hotRec = debriefSubmitWrite(dctx(t, hot(t)), input, hot(t), at('10:05'));
    const dirRun = run(NONE, [(d) => debriefSubmitWrite(dctx(t, dir(t), d), input, dir(t), at('10:05'))]);
    const dirAcc = debriefAcceptWrite(dctx(t, dir(t), dirRun.done), T, dir(t), at('10:20'));
    const mine = recordsFor(dctx(t, bid));
    const all = recordsFor(dctx(t, hot(t)));
    const foreign = mine.filter((e) => e.l.bidManagerId !== bid.id);
    const theirs = all.filter((e) => e.l.bidManagerId === bid.id).length;
    // Every Najd bid is Omar's in the seed, so the scope is proved on another Bid Manager's tender.
    const other = can(bid, 'debrief.view', { tender: { ...c.tender, bidManagerId: `${t}.someone-else`, invited: [] } }).ok;
    add('Access: dir records not accepts; hot accepts not records; coord has no debrief.view; a Bid Manager reads only assigned',
      ok(dir(t), 'debrief.record') && !ok(dir(t), 'debrief.accept') && ok(hot(t), 'debrief.accept') && !ok(hot(t), 'debrief.record') && !ok(coord, 'debrief.view')
        && isDebriefError(hotRec) && isDebriefError(dirAcc) && !foreign.length && mine.length === theirs && !other,
      `hot submits: ${isDebriefError(hotRec) ? 'refused' : 'allowed'} · dir accepts: ${isDebriefError(dirAcc) ? 'refused' : 'allowed'} · coord ${ok(coord, 'debrief.view') ? 'reads' : 'no view'} · ${bid.name} reads ${mine.length}, all assigned to them${foreign.length ? ` (${list(foreign.map((e) => e.l.tenderId))} not theirs)` : ''} · another Bid Manager's tender: ${other ? 'readable' : 'refused'}`);
  }

  return out;
}

export default function DebriefsCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks() : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Debrief records and rules (plan 035)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Debrief records and rules (plan 035)" meta={failing ? <span className="t-red">{failing} of {rows.length} failing</span> : `All ${rows.length} pass`} />
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
