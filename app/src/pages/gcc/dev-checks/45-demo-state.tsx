import { useTenantKey } from '@/domain/tenancy';
import { dateText } from '@/domain/calendar';
import { gccData, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { LIFECYCLES } from '@/data/gcc/lifecycle';
import { personById, type Person } from '@/data/people';
import { currentOf, lifecyclesOf, queriesFor, type DemoDone } from '@/domain/gcc/lifecycle';
import { dataPort } from '@/domain/gcc/port';
import { windowOf } from '@/domain/gcc/period';
import { validationAction } from '@/domain/gcc/s1';
import { dg1PackFor, dg1Reopen, dg1Write, type Dg1Input } from '@/domain/gcc/dg1';
import * as S2 from '@/domain/gcc/s2';
import { packIssueWrite, packRerunWrite, packVersionsFor } from '@/domain/gcc/s3';
import { decisionState, dg2Write, positionWrite } from '@/domain/gcc/dg2';
import type { TenderRowVM } from '@/domain/gcc/viewmodels';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 021: demo actions reach every screen. Each row builds an
 * in-memory `done` with the rules' own write helpers (the real store is never
 * written), then reads the merged lifecycles through `queriesFor` and the data
 * port, as the dashboards do. Najd runs demo scripts A–C; every tenant runs the
 * hero's DG1, Reset and determinism rows. Values are typed only in `EXPECT`.
 */

const H = HERO_ID;
const A = 'T-2026-097';
const B = 'T-2026-101';

const EXPECT: Record<string, string> = {
  'Hero DG1 Pursue (this tenant): row': 'Stage 2 · packaging',
  '5.8 Reset: done = {} is the seed': 'seed array · stage counts equal the seed',
  '5.9 Determinism': 'same array for the same done · equal rows for a copy',
  // Najd: scripts A–C
  '5.1 Script A: hero row after DG1 Pursue': 'Stage 2 · packaging · owner Joseph Mathew',
  '5.1 Live stage counts for Faisal Al-Harbi': 'S1 12 → 11 · S2 2 → 3 · port rows agree',
  '5.1 Tracker DG1 chip': 'Pursue · Omar Siddiqui · 8 Mar 10:00 · on time',
  '5.1 DG1 decisions today include the hero': 'yes',
  '5.2 Pursue → Re-open → Pursue': 're-opened: Stage 1 · again: Stage 2 · DG1 records 2 (1 re-opened)',
  '5.3 Discard on a low-fit tender': 'T-2026-126 fit 35 · discarded · S1 12 → 11 · closed 180 → 181',
  '5.4 Script B: step after pkg, shortlist, RFQs sent': 'shortlisting · rfqs-out · quotes-in',
  '5.4 RFQs sent: row fact and 008a count': 'row 8 of 8 · 008a 8 of 8',
  '5.5 Script C: re-run and issue the pack': 'fresh · v2 with the committee · DG2 clock from 7 Mar 14:10',
  '5.5 Two more positions recorded': '4 of 5 · awaiting-approval',
  '5.5 Bid with conditions approved': 'Stage 4 · baseline-drafting · Bid with 3 conditions · DG2 today yes',
  '5.6 No-Bid on T-2026-101': 'closed · no-bid · live rows 1 fewer',
  '5.7 Masking on merged state (Procurement Lead, T-2026-097)': 'win none · positions masked · margin masked · Head of Tendering sees 4',
};

// ---------------------------------------------------------------------------

type Write = { key: string; value: string };
type Result = Write | { writes: Write[] } | { error: string };

/** A write's result on top of `done`; a refused write stops the row with its message. */
function put(done: DemoDone, r: Result | Write[]): DemoDone {
  if (!Array.isArray(r) && 'error' in r) throw new Error(r.error);
  const ws = Array.isArray(r) ? r : 'writes' in r ? r.writes : [r];
  return { ...done, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) };
}

/** The hero's two blocking fields resolved as the Coordinator would (the DG1 pack is locked until then). */
function resolved(tenant: GccTenantKey): DemoDone {
  const t = gccData(tenant).register.find((x) => x.id === H)!;
  return put({}, t.validations.filter((v) => v.blocksDg1).map((v) => validationAction(v, 'pick', { pick: 'value' }, `${tenant}.coord`)));
}

const dg1 = (tenant: GccTenantKey, done: DemoDone, input: Dg1Input, byId = `${tenant}.bid`) =>
  put(done, dg1Write(input, byId, dg1PackFor(tenant, input.tenderId, done)!, done).writes);

const rows = (tenant: string, viewer: Person, done: DemoDone, status: 'live' | 'all' = 'live') => dataPort()!.rows(tenant, { kind: 'all' }, viewer, status, done);
const rowOf = (tenant: string, viewer: Person, done: DemoDone, id: string): TenderRowVM | undefined => rows(tenant, viewer, done, 'all').find((r) => r.id === id);
const counts = (ls: { stage: number }[]) => [1, 2, 3, 4].map((n) => ls.filter((x) => x.stage === n).length);

/** "8 Mar 10:00", as the tracker shows a decision. */
const at = (iso: string) => `${dateText(iso.slice(0, 10)).replace(/^\w+ /, '').replace(/ \d{4}$/, '')} ${iso.slice(11, 16)}`;

interface Check { name: string; got: string; expected?: string }

function attempt(name: string, f: () => string): Check {
  try { return { name, got: f() }; } catch (e) { return { name, got: `refused: ${(e as Error).message}` }; }
}

/** Every tenant: the hero's DG1, Reset and determinism. */
function everyTenant(k: GccTenantKey): Check[] {
  const viewer = personById(`${k}.hot`)!;
  const pursued = dg1(k, resolved(k), { tenderId: H, decision: 'pursue', note: 'Dev check: pursue whatever the recommendation' });
  const seedCounts = (ls: typeof LIFECYCLES[GccTenantKey]) => counts(ls.filter((l) => !l.closedAt).map(currentOf)).join(' · ');
  return [
    attempt('Hero DG1 Pursue (this tenant): row', () => {
      const r = rowOf(k, viewer, pursued, H);
      return r ? `Stage ${r.stage} · ${r.step}` : 'not visible';
    }),
    attempt('5.8 Reset: done = {} is the seed', () => {
      lifecyclesOf(k, undefined, pursued);
      const same = lifecyclesOf(k, undefined, {}) === LIFECYCLES[k];
      const equal = counts(queriesFor({ tenant: k, viewer, done: {} }).live().map(currentOf)).join(' · ') === seedCounts(LIFECYCLES[k]);
      return `${same ? 'seed array' : 'a copy'} · stage counts ${equal ? 'equal' : 'differ from'} the seed`;
    }),
    attempt('5.9 Determinism', () => {
      const once = lifecyclesOf(k, undefined, pursued) === lifecyclesOf(k, undefined, pursued);
      const copy = JSON.stringify(rows(k, viewer, pursued, 'all')) === JSON.stringify(rows(k, viewer, { ...pursued }, 'all'));
      return `${once ? 'same array' : 'a new array'} for the same done · ${copy ? 'equal' : 'different'} rows for a copy`;
    }),
  ];
}

/** Najd: demo scripts A–C (s1-s3-demo-spec §17), each on its own in-memory `done`. */
function najd(): Check[] {
  const k: GccTenantKey = 'najd';
  const hot = personById('najd.hot')!;
  const proc = personById('najd.proc')!;
  const today = windowOf('today', k);
  const q = (done: DemoDone) => queriesFor({ tenant: k, viewer: hot, done });
  const base = resolved(k);
  const out: Check[] = [];
  const add = (name: string, f: () => string) => out.push(attempt(name, f));

  // Script A: DG1 Pursue on the hero.
  const dA = dg1(k, base, { tenderId: H, decision: 'pursue' });
  add('5.1 Script A: hero row after DG1 Pursue', () => {
    const r = rowOf(k, hot, dA, H)!;
    return `Stage ${r.stage} · ${r.step} · owner ${r.ownerName ?? 'none'}`;
  });
  add('5.1 Live stage counts for Faisal Al-Harbi', () => {
    const [s1, s2] = counts(q({}).live().map(currentOf));
    const [a1, a2] = counts(q(dA).live().map(currentOf));
    const agree = counts(rows(k, hot, dA)).join() === counts(q(dA).live().map(currentOf)).join();
    return `S1 ${s1} → ${a1} · S2 ${s2} → ${a2} · port rows ${agree ? 'agree' : 'differ'}`;
  });
  add('5.1 Tracker DG1 chip', () => {
    const d = dataPort()!.tracker(k, H, hot, dA)?.nodes.find((n) => n.gate === 'DG1')?.decision;
    return d ? `${d.label} · ${d.byName} · ${at(d.at)} · ${d.onTime ? 'on time' : `late by ${d.lateBy}`}` : 'no decision';
  });
  add('5.1 DG1 decisions today include the hero', () => (q(dA).gateEventsIn(today, 'DG1').some((e) => e.l.tenderId === H) ? 'yes' : 'no'));

  // 5.2: a re-open takes the hero back to Stage 1; Pursue again is a new round (4.1).
  add('5.2 Pursue → Re-open → Pursue', () => {
    const dR = put(dA, dg1Reopen(k, H, 'The client extended the deadline; re-check capacity', 'najd.hot', dA).writes);
    const dP = dg1(k, dR, { tenderId: H, decision: 'pursue' });
    const l = q(dP).one(H)!;
    const dg1s = l.gates.filter((g) => g.gate === 'DG1');
    return `re-opened: Stage ${rowOf(k, hot, dR, H)?.stage} · again: Stage ${rowOf(k, hot, dP, H)?.stage} · DG1 records ${dg1s.length} (${dg1s.filter((g) => g.reopened).length} re-opened)`;
  });

  // 5.3: Discard on the lowest-fit Stage 1 tender whose DG1 pack is open.
  add('5.3 Discard on a low-fit tender', () => {
    const pick = q({}).live()
      .filter((l) => currentOf(l).stage === 1 && l.tenderId !== H && !l.restricted)
      .map((l) => ({ l, pack: dg1PackFor(k, l.tenderId, {}) }))
      .filter((x) => x.pack && !x.pack.locked)
      .sort((a, b) => a.pack!.fit.result.weighted - b.pack!.fit.result.weighted)[0];
    if (!pick) return 'no open DG1 pack';
    const id = pick.l.tenderId;
    const d = dg1(k, {}, { tenderId: id, decision: 'discard', reasonCodes: ['out-of-scope'] });
    const l = lifecyclesOf(k, undefined, d).find((x) => x.tenderId === id)!;
    const [s1] = counts(q({}).live().map(currentOf));
    const [a1] = counts(q(d).live().map(currentOf));
    return `${id} fit ${Math.round(pick.pack!.fit.result.weighted)} · ${l.closedAs ?? 'live'} · S1 ${s1} → ${a1} · closed ${q({}).closed().length} → ${q(d).closed().length}`;
  });

  // Script B: packaging, a shortlist and its RFQs on the pursued hero.
  add('5.4 Script B: step after pkg, shortlist, RFQs sent', () => {
    const d1 = put(dA, S2.packagingWrite(H, 'najd.proc'));
    const pkg = S2.packagesFor(k, H, d1)[0].pkg.id;
    const rec = S2.recommendedShortlist(k, H, pkg, d1).items;
    const d2 = put(d1, S2.shortlistWrite(k, H, pkg, rec.filter((i) => i.screening.state !== 'blocked').map((i) => i.supplierId), [], 'najd.proc', d1));
    const d3 = put(d2, S2.rfqWrite(k, H, pkg, rec.filter((i) => i.sendable).map((i) => i.supplierId), 'najd.proc', d2));
    return [d1, d2, d3].map((d) => rowOf(k, hot, d, H)?.step).join(' · ');
  });
  add('5.4 RFQs sent: row fact and 008a count', () => {
    let d = put(dA, S2.packagingWrite(H, 'najd.proc'));
    for (const { pkg } of S2.packagesFor(k, H, d).slice(0, 2)) {
      const rec = S2.recommendedShortlist(k, H, pkg.id, d).items;
      d = put(d, S2.shortlistWrite(k, H, pkg.id, rec.filter((i) => i.screening.state !== 'blocked').map((i) => i.supplierId), [], 'najd.proc', d));
      d = put(d, S2.rfqWrite(k, H, pkg.id, rec.filter((i) => i.sendable).map((i) => i.supplierId), 'najd.proc', d));
    }
    const r = rowOf(k, hot, d, H)!;
    const c = S2.rfqCounts(k, H, d);
    return `row ${r.facts.rfqsSent} of ${r.facts.rfqsTotal} · 008a ${c.sent} of ${c.total}`;
  });

  // Script C: T-2026-097's pack re-run and issued, two more positions, then Bid with conditions.
  const c1 = put({}, packRerunWrite(k, A, {}, 'najd.bid'));
  const c2 = put(c1, packIssueWrite(k, A, c1, 'najd.bid'));
  add('5.5 Script C: re-run and issue the pack', () => {
    const r = rowOf(k, hot, c2, A)!;
    // The DG2 clock runs from the pack's first issue (009a), so `packIssuedAt` stays at v1's.
    return `${r.facts.pack} · v${packVersionsFor(k, A, c2).issued?.version} with the committee · DG2 clock from ${at(String(r.facts.packIssuedAt))}`;
  });
  let c3: DemoDone = c2;
  add('5.5 Two more positions recorded', () => {
    const s = decisionState(k, A, c2);
    const version = s.packVersion ?? 0;
    c3 = put(c2, positionWrite(A, 'operations', { stance: 'support', packVersion: version, round: s.round }, 'najd.member.operations'));
    c3 = put(c3, positionWrite(A, 'sector', { stance: 'support', packVersion: version, round: s.round }, 'najd.member.sector'));
    const r = rowOf(k, hot, c3, A)!;
    return `${r.facts.positionsRecorded} of ${r.facts.positionsOf} · ${r.step}`;
  });
  add('5.5 Bid with conditions approved', () => {
    const c4 = put(c3, dg2Write({ tenderId: A, decision: 'bid', conditions: ['Confirm the bank facility before submission'] }, 'najd.hot', decisionState(k, A, c3)));
    const r = rowOf(k, hot, c4, A)!;
    const g = q(c4).one(A)!.gates.find((x) => x.gate === 'DG2');
    return `Stage ${r.stage} · ${r.step} · ${g?.note ?? 'no note'} · DG2 today ${q(c4).gateEventsIn(today, 'DG2').some((e) => e.l.tenderId === A) ? 'yes' : 'no'}`;
  });
  add('5.7 Masking on merged state (Procurement Lead, T-2026-097)', () => {
    const r = rowOf(k, proc, c3, A);
    if (!r) return 'not visible to the Procurement Lead';
    const masked = (key: string) => (r.facts[key] === null && r.facts[`${key}.masked`] ? 'masked' : `shown (${r.facts[key]})`);
    return `win ${r.win ? 'shown' : 'none'} · positions ${masked('positionsRecorded')} · margin ${masked('marginMin')} · Head of Tendering sees ${rowOf(k, hot, c3, A)?.facts.positionsRecorded}`;
  });

  // 5.6: No-Bid on T-2026-101, once its pack is issued and the quorum is in.
  add('5.6 No-Bid on T-2026-101', () => {
    let d = put({}, packIssueWrite(k, B, {}, 'najd.bid', 'Committee asked for an early decision on Abha'));
    const s = decisionState(k, B, d);
    for (const seat of ['ceo', 'cfo', 'operations'] as const) {
      d = put(d, positionWrite(B, seat, { stance: 'oppose', comment: 'Delivery load is too high with Jubail and Tabuk', packVersion: s.packVersion ?? 0, round: s.round }, `najd.member.${seat}`));
    }
    d = put(d, dg2Write({ tenderId: B, decision: 'no-bid', reasonCodes: ['capacity-conflict'], staleAcknowledged: true }, 'najd.hot', decisionState(k, B, d)));
    const l = lifecyclesOf(k, undefined, d).find((x) => x.tenderId === B)!;
    const fewer = q({}).live().length - q(d).live().length;
    return `${l.closedAt ? 'closed' : 'live'} · ${l.closedAs ?? '—'} · live rows ${fewer} fewer`;
  });
  return out;
}

export default function DemoStateCheck() {
  const key = useTenantKey();
  if (!isGccTenantKey(key)) return <CardHead title="Demo state on every screen" meta="No GCC seed for this tenant" />;
  if (!dataPort()) return <CardHead title="Demo state on every screen" meta="No data port" />;

  const checks = [...everyTenant(key), ...(key === 'najd' ? najd() : [])].map((c) => ({ ...c, expected: EXPECT[c.name] }));
  const targeted = checks.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => c.expected !== c.got).length;

  return (
    <>
      <CardHead title="Demo state on every screen (plan 021)" meta={failing ? `${failing} of ${targeted.length} targets failing` : `All ${targeted.length} targets met`} />
      <DataTable
        rows={checks}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Derived value', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '2fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
