import { can, navFor, type CanCtx, type Capability } from '@/data/access';
import { SEAT_LABEL, personById, roleLine, type Person } from '@/data/people';
import { useDemo } from '@/state/store';
import { useCan } from '@/domain/permissions';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/** Dev check for plans 003 and 006: the current person, their navigation, `can()` spot checks (R8, R9, stage access) and the audit trail. */

interface Spot { name: string; who?: Person; cap: Capability; ctx: CanCtx; expectOk: boolean; expectReason?: string }

export default function PeopleCheck() {
  const { state } = useDemo();
  const { person, realPerson, viewAs, tenant, audit } = state;
  const check = useCan();
  const nav = navFor(person, !!viewAs);
  // A fake tender owned by this company's Bid Manager (plan 003 acceptance).
  const tender = { bidManagerId: `${tenant}.bid` };
  const bm = personById(tender.bidManagerId);
  const at = (suffix: string) => personById(`${tenant}.${suffix}`);

  const spots: Spot[] = [
    { name: 'bid → dg1.decide', who: at('bid'), cap: 'dg1.decide', ctx: { tender }, expectOk: true },
    { name: 'hot → dg1.decide', who: at('hot'), cap: 'dg1.decide', ctx: { tender }, expectOk: false, expectReason: `Only the assigned Bid Manager, ${bm?.name}, records DG1` },
    { name: 'proc → see.margin', who: at('proc'), cap: 'see.margin', ctx: { tender }, expectOk: false, expectReason: 'Margin is masked for your role' },
    { name: 'hot → dg2.decide', who: at('hot'), cap: 'dg2.decide', ctx: { tender }, expectOk: true },
    { name: 'exec → dg2.decide', who: at('exec'), cap: 'dg2.decide', ctx: { tender }, expectOk: false, expectReason: 'Only the Head of Tendering approves DG2' },
    { name: 'member.cfo → dg2.position', who: at('member.cfo'), cap: 'dg2.position', ctx: { tender }, expectOk: true },
    { name: 'proc → stage.view { stage: 3 }', who: at('proc'), cap: 'stage.view', ctx: { stage: 3 }, expectOk: false, expectReason: 'Stage 3 is outside your role' },
    { name: 'hot → dg3.decide', who: at('hot'), cap: 'dg3.decide', ctx: { tender }, expectOk: true },
  ];
  const rows = spots.map((s) => {
    const got = s.who ? can(s.who, s.cap, s.ctx) : { ok: false, reason: 'No such person in this company' };
    const pass = !!s.who && got.ok === s.expectOk && (!s.expectReason || !!got.reason?.startsWith(s.expectReason));
    return { ...s, got, pass };
  });
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
          { key: 'n', header: `can() with a tender owned by ${bm?.name ?? 'the Bid Manager'}`, width: '1.4fr', primary: true, render: (r) => (<><span className="cell-main mono" style={{ fontSize: 12.5 }}>{r.name}</span><span className="cell-sub">{r.who?.name}</span></>) },
          { key: 'e', header: 'Expected', width: '1fr', priority: 2, render: (r) => (r.expectOk ? 'Allowed' : `Denied${r.expectReason ? `: ${r.expectReason}` : ''}`) },
          { key: 'g', header: 'Got', width: '1.4fr', render: (r) => (r.got.ok ? 'Allowed' : `Denied: ${r.got.reason}`) },
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
