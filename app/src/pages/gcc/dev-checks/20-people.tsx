import { can, navFor, type CanCtx, type Capability } from '@/data/access';
import { SEAT_LABEL, personById, roleLine, type Person } from '@/data/people';
import { useDemo } from '@/state/store';
import { useCan } from '@/domain/permissions';
import { currentOf, lifecyclesOf } from '@/domain/gcc/lifecycle';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { actionRows } from '@/domain/gcc/dashboards/build';
import type { ActionSource } from '@/domain/gcc/actions';
import type { KpiCtx } from '@/domain/gcc/kpi/types';
import { previousOf, windowOf } from '@/domain/gcc/period';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plans 003, 006 and 020 lane A: the current person, their
 * navigation, `can()` spot checks (R8, R9, stage access, stage owners' tender
 * scope), View as on action rows, the Commercial Manager's Stage 2 label, and
 * the audit trail.
 */

interface Spot { name: string; who?: Person; cap: Capability; ctx: CanCtx; expectOk: boolean; expectReason?: string }
/** A check that isn't a single `can()` call: what was expected, what came back. */
interface Probe { name: string; who?: Person; expected: string; got: string; pass: boolean }

/** A lifecycle's `can()` context, as the data port builds it, with nobody invited. */
const ctxOf = (l: Lifecycle): CanCtx => ({ tender: { bidManagerId: l.bidManagerId ?? undefined, sector: l.sector, invited: [], restricted: !!l.restricted } });

/** A DG1 action source with one in-place row, as plan 015's will be. */
const DG1_SOURCE: ActionSource = {
  id: 'dev.dg1', cap: 'dg1.decide',
  rows: () => [{
    id: 'dev.dg1:T-DEV', source: 'dev.dg1', type: 'DG1 decision', what: 'Record DG1', urgency: 0,
    primary: { kind: 'inplace', label: 'Record DG1', doneLabel: 'Recorded {time}', markKey: 'dev.dg1', audit: { action: 'Dev check' }, toast: 'Dev check' },
  }],
};

export default function PeopleCheck() {
  const { state } = useDemo();
  const { person, realPerson, viewAs, tenant, audit } = state;
  const check = useCan();
  const nav = navFor(person);
  // A fake tender owned by this company's Bid Manager (plan 003 acceptance).
  const tender = { bidManagerId: `${tenant}.bid` };
  const bm = personById(tender.bidManagerId);
  const at = (suffix: string) => personById(`${tenant}.${suffix}`);

  // Real tenders in this company where it has them; a sample tender where it doesn't.
  const live = lifecyclesOf(tenant).filter((l) => !l.closedAt);
  const inStage = (n: number) => live.find((l) => !l.restricted && currentOf(l).stage === n);
  const s4 = inStage(4);
  const s5 = inStage(5);
  const restricted = live.find((l) => l.restricted);
  const sample = (over: NonNullable<CanCtx['tender']> = {}): CanCtx => ({ tender: { ...tender, invited: [], ...over } });

  const spots: Spot[] = [
    { name: 'bid → dg1.decide', who: at('bid'), cap: 'dg1.decide', ctx: { tender }, expectOk: true },
    { name: 'hot → dg1.decide', who: at('hot'), cap: 'dg1.decide', ctx: { tender }, expectOk: false, expectReason: `Only the assigned Bid Manager, ${bm?.name}, records DG1` },
    { name: 'proc → see.margin', who: at('proc'), cap: 'see.margin', ctx: { tender }, expectOk: false, expectReason: 'Margin is masked for your role' },
    { name: 'hot → dg2.decide', who: at('hot'), cap: 'dg2.decide', ctx: { tender }, expectOk: true },
    { name: 'exec → dg2.decide', who: at('exec'), cap: 'dg2.decide', ctx: { tender }, expectOk: false, expectReason: 'Only the Head of Tendering approves DG2' },
    { name: 'member.cfo → dg2.position', who: at('member.cfo'), cap: 'dg2.position', ctx: { tender }, expectOk: true },
    { name: 'proc → stage.view { stage: 3 }', who: at('proc'), cap: 'stage.view', ctx: { stage: 3 }, expectOk: false, expectReason: 'Stage 3 is outside your role' },
    { name: 'hot → dg3.decide', who: at('hot'), cap: 'dg3.decide', ctx: { tender }, expectOk: true },
    // Plan 020 A3: stage owners see every tender in the company, masked; the restricted lane stays closed.
    { name: `plan → tender.view (${s4 ? `${s4.tenderId}, Stage 4` : 'sample tender'}, not invited)`, who: at('plan'), cap: 'tender.view', ctx: s4 ? ctxOf(s4) : sample(), expectOk: true },
    { name: `plan → tender.view (${restricted ? `${restricted.tenderId}, restricted` : 'sample restricted tender'})`, who: at('plan'), cap: 'tender.view', ctx: restricted ? ctxOf(restricted) : sample({ restricted: true }), expectOk: false, expectReason: 'This tender is in the restricted lane' },
    { name: `comm → see.margin (${s5 ? `${s5.tenderId}, Stage 5` : 'sample tender'}, not invited)`, who: at('comm'), cap: 'see.margin', ctx: s5 ? ctxOf(s5) : sample(), expectOk: true },
    { name: `proc → see.margin (${s5 ? `${s5.tenderId}, Stage 5` : 'sample tender'})`, who: at('proc'), cap: 'see.margin', ctx: s5 ? ctxOf(s5) : sample(), expectOk: false, expectReason: 'Margin is masked for your role' },
  ];
  const canRows: Probe[] = spots.map((s) => {
    const got = s.who ? can(s.who, s.cap, s.ctx) : { ok: false, reason: 'No such person in this company' };
    const pass = !!s.who && got.ok === s.expectOk && (!s.expectReason || !!got.reason?.startsWith(s.expectReason));
    return {
      name: s.name, who: s.who, pass,
      expected: s.expectOk ? 'Allowed' : `Denied${s.expectReason ? `: ${s.expectReason}` : ''}`,
      got: got.ok ? 'Allowed' : `Denied: ${got.reason}`,
    };
  });

  // Plan 020 A1: a write capability on an action source doesn't hide its rows during View as.
  const kctx = (viewer: Person, viewAs: boolean): KpiCtx => {
    const window = windowOf('30d', tenant);
    return { tenant, viewer, viewAs, window, prev: previousOf(window), done: {}, now: DEMO_NOW, scope: { kind: 'all' }, dashboard: 'dev' };
  };
  const dg1Rows = (who: Person | undefined, viewAs: boolean) => {
    if (!who) return 'No such person in this company';
    const r = actionRows([DG1_SOURCE], kctx(who, viewAs)).rows;
    return r.length === 0 ? 'No rows' : r.map((x) => (x.disabledReason ? `1 row, disabled (${x.disabledReason})` : '1 row, enabled')).join('; ');
  };
  const probe = (name: string, who: Person | undefined, expected: string, got: string, starts = false): Probe =>
    ({ name, who, expected, got, pass: !!who && (starts ? got.startsWith(expected) : got === expected) });

  // Plan 020 A5: the Commercial Manager keeps Stage 2's levelling under a label; contributors get no Stage 3 label.
  const stagesOf = (who: Person | undefined) => (who ? navFor(who).find((g) => g.key === 'stages')?.items ?? [] : []);
  const navText = (who: Person | undefined) => stagesOf(who)
    .map((it) => `${it.stage}${it.labelOnly ? ' (label)' : ''}${it.children?.length ? `: ${it.children.map((c) => c.key).join(', ')}` : ''}`).join(' · ');

  const probes: Probe[] = [
    probe('View as bid: dg1.decide action rows', at('bid'), '1 row, disabled', dg1Rows(at('bid'), true), true),
    probe('bid, not viewing as: dg1.decide action rows', at('bid'), '1 row, enabled', dg1Rows(at('bid'), false)),
    probe('View as coord: dg1.decide action rows', at('coord'), 'No rows', dg1Rows(at('coord'), true)),
    probe('comm → stages in the sidebar', at('comm'), '2 (label): levelling · 5', navText(at('comm'))),
    probe('plan → stages in the sidebar', at('plan'), '4', navText(at('plan'))),
  ];
  const rows = [...canRows, ...probes];
  const failed = rows.filter((r) => !r.pass).length;
  // The current person, through the same hook pages use: denied during View as.
  const rfq = check('rfq.send');
  const nameOf = (id?: string) => (id ? personById(id)?.name ?? id : '');

  return (
    <>
      <CardHead title="People and permissions" meta={failed ? `${failed} of ${rows.length} checks failing` : `All ${rows.length} checks pass`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Persona" v={`${realPerson.name}, ${roleLine(realPerson)}`} />
        {viewAs && <KV k="Viewing as" v={`${person.name}, ${roleLine(person)}. Read only`} tone="orange" />}
        <KV k="Role" v={person.role} mono />
        <KV k="Seat" v={person.seat ? `${person.seat} (${SEAT_LABEL[person.seat]})` : 'None'} mono={!!person.seat} />
        {nav.map((g) => (
          <KV key={g.key} k={g.label ?? (g.pinned ? 'Navigation, bottom' : 'Navigation')}
            v={g.items.map((it) => (it.children?.length ? `${it.label} (${it.children.map((c) => c.label).join(', ')})` : it.label)).join(', ')} />
        ))}
        <KV k="can('rfq.send')" v={rfq.ok ? 'Allowed' : `Denied: ${rfq.reason}`} tone={rfq.ok ? 'green' : 'muted'} />
        {can(person, 'portal.rfq').ok && <KV k="Next" v="The Supplier Portal arrives with plan 008." tone="muted" />}
        {can(person, 'platform.console').ok && <KV k="Next" v="The Platform Console arrives with plan 011." tone="muted" />}
      </div>

      <DataTable
        rows={rows}
        rowKey={(r) => r.name}
        columns={[
          { key: 'n', header: `can() with a tender owned by ${bm?.name ?? 'the Bid Manager'}, action rows and the sidebar`, width: '1.4fr', primary: true, render: (r) => (<><span className="cell-main mono" style={{ fontSize: 12.5 }}>{r.name}</span><span className="cell-sub">{r.who?.name}</span></>) },
          { key: 'e', header: 'Expected', width: '1fr', priority: 2, render: (r) => r.expected },
          { key: 'g', header: 'Got', width: '1.4fr', render: (r) => r.got },
          { key: 'r', header: 'Result', width: '.5fr', align: 'right', render: (r) => (r.pass ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />

      <DataTable
        rows={audit.slice(-5).reverse()}
        rowKey={(e) => e.id}
        empty="No audit entries yet in this company."
        columns={[
          { key: 't', header: 'Audit, last 5', width: '.6fr', primary: true, render: (e) => <span className="num">{e.at.slice(11)}</span> },
          { key: 'a', header: 'Who', width: '1fr', render: (e) => nameOf(e.actorId) },
          { key: 'x', header: 'Action', width: '1.2fr', render: (e) => (<><span className="cell-main" style={{ fontSize: 13 }}>{e.action}</span>{e.target && <span className="cell-sub">{nameOf(e.target)}</span>}</>) },
          { key: 'd', header: 'Detail', width: '1fr', priority: 2, render: (e) => e.detail ?? '' },
        ]}
      />
    </>
  );
}
