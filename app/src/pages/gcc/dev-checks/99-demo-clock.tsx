/// <reference types="vite/client" />
import { useMemo, type ReactElement } from 'react';
import { gccData, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { firstWithRole, personById } from '@/data/people';
import { useTenantKey } from '@/domain/tenancy';
import { nextAuditAt, type AuditEvent } from '@/state/store';
import { DEMO_TODAY } from '@/domain/calendar';
import { agoText, countsFrom, DEMO_NOW, slaState } from '@/domain/gcc/clock';
import { DEMO_MINUTES_END, inWindow, previousOf, windowOf } from '@/domain/gcc/period';
import { lifecycle, lifecyclesOf, openGate, queriesFor, type DemoDone } from '@/domain/gcc/lifecycle';
import { dataPort } from '@/domain/gcc/port';
import { dashboardSpec } from '@/domain/gcc/dashboards';
import { buildDashboard, dashboardCtx } from '@/domain/gcc/dashboards/build';
import { validationAction } from '@/domain/gcc/s1';
import { dg1PackFor, dg1Write } from '@/domain/gcc/dg1';
import * as S2 from '@/domain/gcc/s2';
import { packIssueWrite, packRerunWrite } from '@/domain/gcc/s3';
import { decisionState, dg2Write, positionWrite } from '@/domain/gcc/dg2';
import { dg3ReissueWrite, dg3SendBackWrite, dg3State } from '@/domain/gcc/dg3';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { COLUMNS } from '@/components/dashboard/columns/base.cols';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 025a: records on the demo clock. Screens stamp a record with the time
 * its audit entry will carry (`nextAt`, a minute after the last entry from
 * 10:00), while every writer keeps demo now as its default. Readings stay at
 * 10:00; a window ending at the demo clock, "Last activity" and a gate or SLA
 * started live take in the demo's own minutes, up to `DEMO_MINUTES_END`, and
 * nothing seeded falls in that span. Runs on in-memory `done` maps across the
 * five tenants, whichever is open; the live demo is never written.
 */

interface Check { name: string; ok: boolean; got: string }

const GCC: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];
const at = (hhmm: string) => `${DEMO_TODAY}T${hhmm}`;
const hm = (iso: string | undefined) => iso?.slice(11, 16) ?? 'none';

type Write = { key: string; value: string };
type Result = Write | { writes: Write[] } | { error: string };

/** A write's result on top of `done`; a refused write stops the row with its message. */
function put(done: DemoDone, r: Result): DemoDone {
  if ('error' in r) throw new Error(r.error);
  const ws = 'writes' in r ? r.writes : [r];
  return { ...done, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) };
}

/** The `at` a write stamps on its record. */
function stamped(r: Result): string {
  if ('error' in r) throw new Error(r.error);
  const w = 'writes' in r ? r.writes[0] : r;
  return hm((JSON.parse(w.value) as { at?: string }).at);
}

/** The hero's two blocking fields resolved as the Coordinator would, then DG1 Pursue recorded at `when`. */
function pursued(tenant: GccTenantKey, when: string): DemoDone {
  const t = gccData(tenant).register.find((x) => x.id === HERO_ID)!;
  const base = t.validations.filter((v) => v.blocksDg1).reduce<DemoDone>((d, v) => put(d, validationAction(v, 'pick', { pick: 'value' }, `${tenant}.coord`)), {});
  return put(base, { writes: dg1Write({ tenderId: HERO_ID, decision: 'pursue', at: when }, `${tenant}.bid`, dg1PackFor(tenant, HERO_ID, base)!, base).writes });
}

/* ------------------------------------------------------------ seed scan */

// Every GCC seed module, walked for date-times: the register, lifecycles, Stage 2–DG3 records, extractions.
const SEED_MODULES = import.meta.glob<Record<string, unknown>>(['../../../data/gcc/**/*.ts', '../../../data/extracted/gcc/**/*.ts'], { eager: true });

function walk(v: unknown, seen: WeakSet<object>, hit: (s: string) => void) {
  if (typeof v === 'string') { hit(v); return; }
  if (!v || typeof v !== 'object' || seen.has(v)) return;
  seen.add(v);
  for (const x of Array.isArray(v) ? v : Object.values(v)) walk(x, seen, hit);
}

/** Date-times in the seed (modules, lifecycles, data-port rows and open gates, in every tenant) after 10:00 and up to `DEMO_MINUTES_END`. */
function seedInDemoMinutes(): { scanned: number; inside: string[] } {
  const seen = new WeakSet<object>();
  let scanned = 0;
  const inside: string[] = [];
  const hit = (s: string) => {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s)) return;
    scanned++;
    const t = s.slice(0, 16);
    if (t > DEMO_NOW && t <= DEMO_MINUTES_END) inside.push(s);
  };
  walk(Object.values(SEED_MODULES), seen, hit);
  for (const k of GCC) {
    const ls = lifecyclesOf(k, undefined, {});
    walk(ls, seen, hit);
    walk(ls.map((l) => openGate(l)), seen, hit);
    walk(dataPort()!.rows(k, { kind: 'all' }, personById(`${k}.hot`)!, 'all', {}), seen, hit);
  }
  return { scanned, inside };
}

/* ------------------------------------------------------------ checks */

function checks(): Check[] {
  const out: Check[] = [];
  const add = (name: string, f: () => { ok: boolean; got: string }) => {
    try { out.push({ name, ...f() }); } catch (e) { out.push({ name, ok: false, got: `refused: ${(e as Error).message}` }); }
  };
  const N: GccTenantKey = 'najd';
  const Q: GccTenantKey = 'qurain';
  const A = 'T-2026-097';
  const B = 'T-2026-101';
  const Q428 = 'T-2025-428';

  // 1. The store's clock.
  add("Store nextAt: audit list ending 10:05 → 10:06; empty → 10:00", () => {
    const list: AuditEvent[] = [
      { id: 'x.1', at: at('10:04'), actorId: 'najd.hot', action: 'a' },
      { id: 'x.2', at: at('10:05'), actorId: 'najd.hot', action: 'b' },
    ];
    const got = `${hm(nextAuditAt(list))} · ${hm(nextAuditAt([]))}`;
    return { ok: got === '10:06 · 10:00', got };
  });

  // 2. One writer per stage: a given time is stamped; none keeps demo now.
  const writerRow = (name: string, given: () => Result, none: () => Result, when: string) => add(name, () => {
    const got = `given ${stamped(given())} · default ${stamped(none())}`;
    return { ok: got === `given ${when} · default 10:00`, got };
  });
  writerRow('Stage 2 writer (packaging, hero): given 10:06, default 10:00',
    () => S2.packagingWrite(HERO_ID, 'najd.proc', {}, at('10:06')), () => S2.packagingWrite(HERO_ID, 'najd.proc'), '10:06');
  writerRow('Stage 3 writer (pack re-run, T-2026-097): given 10:07, default 10:00',
    () => packRerunWrite(N, A, {}, 'najd.bid', at('10:07')), () => packRerunWrite(N, A, {}, 'najd.bid'), '10:07');
  writerRow('DG2 writer (CFO position, T-2026-097): given 10:08, default 10:00',
    () => positionWrite(A, 'cfo', { stance: 'support', packVersion: 1 }, 'najd.member.cfo', undefined, at('10:08')),
    () => positionWrite(A, 'cfo', { stance: 'support', packVersion: 1 }, 'najd.member.cfo'), '10:08');
  writerRow('DG3 writer (send-back, Qurain T-2025-428): given 10:11, default 10:00',
    () => dg3SendBackWrite(dg3State(Q, Q428, {}), 'Extend the guarantee', personById('qurain.hot')!, {}, at('10:11')),
    () => dg3SendBackWrite(dg3State(Q, Q428, {}), 'Extend the guarantee', personById('qurain.hot')!), '10:11');

  // 3. A No-Bid logs its decision, then the letter draft: the letter takes the next minute.
  add('DG2 No-Bid at 10:12 (T-2026-101): decision 10:12, letter draft 10:13', () => {
    let d = put({}, packIssueWrite(N, B, {}, 'najd.bid', 'Committee asked for an early decision on Abha', at('10:07')));
    const s = decisionState(N, B, d);
    (['ceo', 'cfo', 'operations'] as const).forEach((seat, i) => {
      d = put(d, positionWrite(B, seat, { stance: 'oppose', comment: 'Delivery load is too high', packVersion: s.packVersion ?? 0, round: s.round }, `najd.member.${seat}`, undefined, at(`10:${String(8 + i).padStart(2, '0')}`)));
    });
    const r = dg2Write({ tenderId: B, decision: 'no-bid', reasonCodes: ['capacity-conflict'], staleAcknowledged: true }, 'najd.hot', decisionState(N, B, d), at('10:12'));
    if ('error' in r) throw new Error(r.error);
    const letter = r.writes[1] ? hm((JSON.parse(r.writes[1].value) as { at: string }).at) : 'no letter';
    const got = `decision ${hm(r.decision.at)} · letter draft ${letter} · positions ${r.decision.positionsSnapshot.filter((p) => p.at).map((p) => hm(p.at)).join(', ')}`;
    return { ok: got.startsWith('decision 10:12 · letter draft 10:13'), got };
  });

  // 4. Nothing seeded falls in the demo's minutes, so the wider windows and the clamps move no seed reading.
  add(`Seed: no date-time after 10:00 up to ${hm(DEMO_MINUTES_END)} on demo day, in any tenant`, () => {
    const { scanned, inside } = seedInDemoMinutes();
    return { ok: scanned > 1000 && inside.length === 0, got: `${inside.length} of ${scanned} date-times${inside.length ? `: ${inside.slice(0, 3).join(', ')}` : ''}` };
  });

  // 5. Only a window ending at the demo clock gets the later end.
  add('Windows: 30 days takes 11:59, not 12:00; yesterday-to-10:00 and other ends keep theirs', () => {
    const w30 = windowOf('30d', N);
    const prev = previousOf(windowOf('today', N));
    const got = [
      `30d 11:59 ${inWindow(at('11:59'), w30) ? 'in' : 'out'}`,
      `30d 12:00 ${inWindow(at('12:00'), w30) ? 'in' : 'out'}`,
      `previous day 10:03 ${inWindow(`${prev.to.slice(0, 10)}T10:03`, prev) ? 'in' : 'out'}`,
      `to 09:00, 09:30 ${inWindow(at('09:30'), { from: at('00:00'), to: at('09:00') }) ? 'in' : 'out'}`,
      `start 30d ${w30.from}`,
    ].join(' · ');
    return { ok: got.startsWith('30d 11:59 in · 30d 12:00 out · previous day 10:03 out · to 09:00, 09:30 out'), got };
  });

  // 6. A DG1 recorded live counts where a 10:00 one did.
  add('DG1 Pursue recorded live at 10:03: in 30 days and in "Decisions on time"', () => {
    const hot = personById('najd.hot')!;
    const d = pursued(N, at('10:03'));
    const w30 = windowOf('30d', N);
    const inside = queriesFor({ tenant: N, viewer: hot, done: d }).gateEventsIn(w30, 'DG1').some((e) => e.l.tenderId === HERO_ID);
    const spec = dashboardSpec('portfolio.hot')!;
    const pf4 = (done: DemoDone) => {
      const vm = buildDashboard(spec, dashboardCtx(spec, { tenant: N, viewer: hot, viewAs: false, window: w30, prev: previousOf(w30), done, now: DEMO_NOW }), dataPort());
      const t = vm.tiles.find((x) => x.id === 'PF-4');
      return /(\d+) of (\d+)/.exec(t?.sub ?? '')?.slice(1).map(Number) ?? [0, 0];
    };
    const [a, b] = pf4({});
    const [c, e] = pf4(d);
    return { ok: inside && e === b + 1, got: `${inside ? 'in' : 'not in'} 30 days · PF-4 ${a} of ${b} → ${c} of ${e}` };
  });

  // 7. Last activity for a tender acted on live.
  add('Last activity: hero acted on live at 10:06 reads "just now", tooltip 2026-03-08 10:06', () => {
    const d = pursued(N, at('10:06'));
    const row = dataPort()!.rows(N, { kind: 'all' }, personById('najd.hot')!, 'all', d).find((r) => r.id === HERO_ID)!;
    const col = COLUMNS.find((c) => c.id === 'lastActivity')!.build();
    const cell = (col.cellRenderer as (p: { data: TenderRowVM }) => ReactElement<{ title: string; children: string }>)({ data: row });
    const got = `"${cell.props.children}" · tooltip ${cell.props.title}`;
    return { ok: got === '"just now" · tooltip 2026-03-08 10:06', got };
  });

  // 8. agoText and countsFrom: only the demo's minutes change.
  add('agoText: 09:50 "10 min ago", 10:06 "just now", 12:30 unchanged, another now unchanged', () => {
    const got = [agoText(at('09:50')), agoText(at('10:06')), agoText(at('12:30')), agoText(at('10:06'), at('09:00'))].join(' · ');
    return { ok: got === '10 min ago · just now · in 2 h 30 m · in 1 h 6 m', got };
  });
  add('countsFrom: a start at 10:07 counts from 10:07; 09:00, 12:30 and another now count from now', () => {
    const got = [countsFrom(at('10:07')), countsFrom(at('09:00')), countsFrom(at('12:30')), countsFrom(at('10:07'), at('09:00'))].map(hm).join(' · ');
    return { ok: got === '10:07 · 10:00 · 10:00 · 09:00', got };
  });

  // 9. A gate re-opened live reads its full time, never more; its start and end keep their true times.
  add('Qurain T-2025-428: send-back 10:11, re-issue 10:12 reads "48 h left of 48 h"', () => {
    const hot = personById('qurain.hot')!;
    const comp = firstWithRole(Q, 'comp')!;
    const d1 = put({}, dg3SendBackWrite(dg3State(Q, Q428, {}), 'Extend the guarantee', hot, {}, at('10:11')));
    const d2 = put(d1, dg3ReissueWrite(dg3State(Q, Q428, d1), { fixed: 'bond-validity' }, comp, {}, at('10:12')));
    const s = dg3State(Q, Q428, d2)!;
    const g = openGate(lifecycle(Q, Q428, d2)!);
    const got = `re-issued ${hm(s.openedAt)} · due ${s.slaDue.replace('T', ' ')} · clock "${slaState(s.openedAt, s.slaDue).text}" · page "${s.slaText}" · gate ${g?.gate} ${g?.leftHours} h left`;
    return { ok: got === 're-issued 10:12 · due 2026-03-10 10:12 · clock "48 h left of 48 h" · page "48 h left" · gate DG3 48 h left', got };
  });
  add('Najd T-2026-101: pack issued live at 10:07 reads "24 h left of 24 h"', () => {
    const d = put({}, packIssueWrite(N, B, {}, 'najd.bid', 'Committee asked for an early decision on Abha', at('10:07')));
    const s = decisionState(N, B, d);
    const g = openGate(lifecycle(N, B, d)!);
    const got = `issued ${hm(s.slaStart)} · due ${s.slaDue?.replace('T', ' ')} · clock "${slaState(s.slaStart!, s.slaDue!).text}" · page "${s.slaText}" · gate ${g?.gate} ${g?.leftHours} h left`;
    return { ok: got === 'issued 10:07 · due 2026-03-09 10:07 · clock "24 h left of 24 h" · page "24 h left" · gate DG2 24 h left', got };
  });

  // 10. RFQs sent live read as the same actions stamped 10:00 did, and the RFQ clock still reads within 24 h of DG1.
  add('Hero RFQs sent live (DG1 10:03, sends from 10:05) read as when stamped 10:00; within 24 h of DG1', () => {
    const run = (live: boolean) => {
      let minute = 3;
      const next = () => (live ? at(`10:${String(minute++).padStart(2, '0')}`) : undefined);
      let d = put(pursued(N, next() ?? DEMO_NOW), S2.packagingWrite(HERO_ID, 'najd.proc', {}, next()));
      for (const { pkg } of S2.packagesFor(N, HERO_ID, d)) {
        const rec = S2.recommendedShortlist(N, HERO_ID, pkg.id, d).items;
        d = put(d, S2.shortlistWrite(N, HERO_ID, pkg.id, rec.filter((i) => i.screening.state !== 'blocked').map((i) => i.supplierId), [], 'najd.proc', d, next()));
        const to = rec.filter((i) => i.sendable).map((i) => i.supplierId);
        if (to.length) d = put(d, S2.rfqWrite(N, HERO_ID, pkg.id, to, 'najd.proc', d, next()));
      }
      const c = S2.rfqCounts(N, HERO_ID, d);
      const clock = S2.rfqClock(N, HERO_ID, d);
      const board = S2.packageBoard(N, HERO_ID, d);
      const portal = S2.supplierRfqs(N, 'najd.supplier', d).filter((r) => r.tenderId === HERO_ID).length;
      return {
        text: `sent ${c.sent} of ${c.total} · board ${board.reduce((n, r) => n + r.rfqs, 0)} RFQs in ${board.length} packages · clock ${clock ? `${clock.sent} of ${clock.total} packages, ${clock.rfqsSent} RFQs` : 'closed'} · Supplier Portal ${portal} RFQs`,
        lag: S2.rfqIssueLag(N, HERO_ID, d),
      };
    };
    const live = run(true);
    const ten = run(false);
    const got = `${live.text} · lag ${live.lag ? `${live.lag.text}${live.lag.within ? ', within 24 h' : ''}` : 'not all issued'}`;
    return { ok: live.text === ten.text && !!live.lag?.within, got: live.text === ten.text ? got : `${got} · at 10:00: ${ten.text}` };
  });

  return out;
}

export default function DemoClockCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks() : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Records on the demo clock (plan 025a)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Records on the demo clock (plan 025a)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
