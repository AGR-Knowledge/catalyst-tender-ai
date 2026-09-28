import { useMemo } from 'react';
import { OWNER_RULE, gatesOf, valueTile, type GatePerson } from '@/domain/gcc/admin';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import { Money } from '@/components/tender/Money';
import { AdminStrip, Rule, useAdmin } from './AdminKit';

/**
 * `/admin/committees` (plan 024 Phase 2, dashboards.md §9, catalogue B11): the
 * three gates with who decides, their time limits and who holds them in this
 * company; the Bid Committee's five seats, quorum and referral threshold; and
 * the gates without an owner. Seats, owners and time limits are listed here and
 * changed in the product.
 */

function People({ people, empty }: { people: GatePerson[]; empty: string }) {
  if (!people.length) return <span className="adm-empty">{empty}</span>;
  return (
    <span className="adm-people">
      {people.map((p) => <span key={p.id}>{p.name}<span className="adm-sub" style={{ display: 'block' }}>{p.line}</span></span>)}
    </span>
  );
}

export default function Committees() {
  const { tenant, profile } = useAdmin();
  const vm = useMemo(() => gatesOf(tenant), [tenant]);
  const c = vm.committee;
  const emptySeats = c.total - c.filled;
  const dg2 = vm.gates.find((g) => g.key === 'DG2');

  const tiles = [
    valueTile('gates.owners', 'Gates without owners', String(vm.withoutOwners), {
      means: 'Gates whose deciding role has nobody in this company. Such a gate blocks every tender that reaches it',
      counted: 'DG1, DG2 and DG3, each checked for someone who may record its decision (and, for DG2, a quorum of members; for DG3, someone to issue the pack).',
      target: '0', source: 'Users and the gate rules in access',
    }, {
      tone: vm.withoutOwners ? 'red' : 'green', sub: vm.withoutOwners ? 'Blocking every tender that reaches them' : 'Every gate has an owner',
      detail: vm.withoutOwners ? 'Blocking every tender that reaches them' : 'Every gate has an owner',
      ref: { k: 'Target', v: '0' },
    }),
    valueTile('gates.seats', 'Committee seats filled', `${c.filled} of ${c.total}`, {
      means: 'Bid Committee members named for DG2', counted: 'Voting seats with a member.', source: 'Users: committee seats',
    }, {
      tone: c.filled >= c.quorum ? undefined : 'red',
      detail: emptySeats ? `${emptySeats} voting seat${emptySeats === 1 ? '' : 's'} empty` : 'Every voting seat named',
      ref: { k: 'Target', v: `${c.quorum} for quorum` },
    }),
    valueTile('gates.quorum', 'DG2 quorum', `${c.quorum} of ${c.total}`, {
      means: 'Positions the committee must record before the Head of Tendering may approve DG2',
      counted: 'Named positions recorded on the issued pack.', source: 'Targets & SLAs',
    }, {
      sub: 'positions before approval', detail: 'Positions before approval',
      // The positions are recorded within DG2's time limit, from pack issue.
      ref: { k: 'Cap', v: dg2 ? `${dg2.slaHours} h to decide` : 'None' },
    }),
  ];

  return (
    <div className="view">
      <AdminStrip tiles={tiles} />
      {vm.gates.filter((g) => g.blocked).map((g) => (
        <div key={g.key} style={{ marginBottom: 'var(--gap)' }}>
          <Callout variant="block" title={g.blocked!}>{g.title}. {OWNER_RULE}</Callout>
        </div>
      ))}

      <Card>
        <CardHead title="Gates" meta="Who decides, and how fast" />
        <Rule>{OWNER_RULE}</Rule>
        <table className="adm-table">
          <thead>
            <tr><th scope="col">Gate</th><th scope="col">Who decides</th><th scope="col">Time limit</th><th scope="col">In {profile.name}</th></tr>
          </thead>
          <tbody>
            {vm.gates.map((g) => (
              <tr key={g.key}>
                <th scope="row" style={{ minWidth: 150 }}>{g.title}</th>
                <td style={{ color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 420 }}>{g.rule}</td>
                <td><span className="num">{g.slaHours} h</span><span className="adm-sub" style={{ display: 'block' }}>{g.slaFrom}</span></td>
                <td>
                  <span className="adm-people">
                    <span className="lbl">{g.owners.label}</span>
                    <People people={g.owners.people} empty="Nobody" />
                    {g.roles.map((r) => (
                      <span key={r.label} className="adm-people">
                        <span className="lbl">{r.label}{r.note ? ` · ${r.note}` : ''}</span>
                        {r.label === 'Positions'
                          ? <span>{r.people.length ? `${r.people.length} members, below` : <span className="adm-empty">No members</span>}</span>
                          : <People people={r.people} empty="Nobody" />}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Bid Committee (DG2)" meta={`Quorum ${c.quorum} of ${c.total}`} />
        <table className="adm-table">
          <thead><tr><th scope="col">Seat</th><th scope="col">Member</th></tr></thead>
          <tbody>
            {c.seats.map((s) => (
              <tr key={s.seat}>
                <th scope="row" style={{ width: 220 }}>{s.label}</th>
                <td>{s.person ? <>{s.person.name}<span className="adm-sub" style={{ display: 'block' }}>{s.person.title}</span></> : <span className="adm-empty">Nobody named</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {c.referral && (
          <Rule>Tenders above <Money value={c.referral} /> go to the Bid Committee at DG2. The Head of Tendering approves once {c.quorum} of {c.total} positions are recorded; the CEO records a position like every member.</Rule>
        )}
        <CardFoot>Seats, gate owners and time limits are set when the company is onboarded. A change is written to the audit log and shown to the committee; nobody can give themselves a seat unseen.</CardFoot>
      </Card>
    </div>
  );
}
