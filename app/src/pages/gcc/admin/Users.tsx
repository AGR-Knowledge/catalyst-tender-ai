import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Eye, UserPlus } from 'lucide-react';
import { useDemo } from '@/state/store';
import { gatesOf, usersOf, valueTile, type AdminUser } from '@/domain/gcc/admin';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { AdminGrid, AdminStrip, Cell2, DisabledAction, useAdmin } from './AdminKit';

/**
 * `/admin/users` (plan 024 Phase 1, catalogue §D, GOV-5): every person in the
 * company, grouped as in the persona switcher, with their role, tender scope,
 * committee seat and what they can do, from access.ts. View as opens that
 * person's workspace read only (script F). Invitations and role changes are
 * made in the product.
 */

const INVITE_REASON = 'Demo: invitations are sent from the product';

type Row = AdminUser;

/** The detail line keeps two parts of the split by group: the first, then the rest together (dashboards.md §3). */
const seatSplit = (groups: { group: string; n: number }[]) => (groups.length <= 2 ? groups.map((g) => `${g.group} ${g.n}`).join(' · ')
  : `${groups[0].group} ${groups[0].n} · others ${groups.slice(1).reduce((s, g) => s + g.n, 0)}`);

export default function Users() {
  const { tenant, check, profile } = useAdmin();
  const { state, startViewAs } = useDemo();
  const navigate = useNavigate();
  const vm = useMemo(() => usersOf(tenant), [tenant]);
  const committee = useMemo(() => gatesOf(tenant).committee, [tenant]);
  const viewAs = check('view.as');
  const me = state.realPerson.id;

  // A tenant user other than the presenter's own persona; external people have no workspace here.
  const viewable = (u: Row) => viewAs.ok && u.id !== me && u.usesSeat;
  const open = (u: Row) => {
    if (!viewable(u)) return;
    startViewAs(u.id);
    navigate('/');
  };

  // The largest group, which the detail line may fold into "others".
  const largest = vm.seats.byGroup.reduce<{ group: string; n: number } | null>((a, g) => (!a || g.n > a.n ? g : a), null);
  const emptySeats = committee.total - committee.filled;
  const tiles = [
    valueTile('GOV-5', 'Seats in use', `${vm.seats.used} of ${vm.seats.licensed}`, {
      means: 'People holding a licensed seat in this company, against the seats licensed. Licensing and adoption',
      counted: 'Company users by group. Suppliers answer RFQs through the portal and hold no seat.',
      source: 'Users',
    }, { sub: vm.seats.byGroup.map((g) => `${g.group} ${g.n}`).join(' · '), detail: seatSplit(vm.seats.byGroup), ref: { k: 'Largest', v: largest ? `${largest.group} ${largest.n}` : 'None' } }),
    valueTile('seats.committee', 'Committee seats filled', `${committee.filled} of ${committee.total}`, {
      means: 'Bid Committee members named for DG2. Each records a named position on the pack',
      counted: 'Voting seats with a member: CEO, CFO, Technical Director, Operations Director and Sector Head.',
      target: `Quorum: ${committee.quorum} of ${committee.total} positions recorded`, source: 'Users: committee seats',
    }, {
      tone: committee.filled >= committee.quorum ? undefined : 'red',
      detail: emptySeats ? `${emptySeats} voting seat${emptySeats === 1 ? '' : 's'} empty` : 'Every voting seat named',
      ref: { k: 'Target', v: `${committee.quorum} for quorum` },
    }),
  ];

  const columns: ColDef<Row>[] = [
    {
      headerName: 'Person', field: 'name', flex: 1.3, minWidth: 220,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && (
        <span className="adm-person">
          <span className="avatar sm soft" aria-hidden>{p.data.initials}</span>
          <Cell2 main={p.data.name} sub={p.data.title} />
        </span>
      ),
    },
    {
      headerName: 'Scope', field: 'scope.main', flex: 1.1, minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && <Cell2 main={p.data.scope.main} sub={p.data.scope.sub} />,
    },
    {
      headerName: 'Seat', field: 'seat', width: 150,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && (p.data.seat ? <Cell2 main={p.data.seat} sub="Bid Committee" /> : <span className="adm-sub">No seat</span>),
    },
    {
      headerName: 'Can do', field: 'canDo', flex: 2, minWidth: 260,
      cellRenderer: (p: ICellRendererParams<Row>) => p.data && <span className="adm-wrap" title={[p.data.canDo, p.data.masked].filter(Boolean).join('. ')}><Cell2 main={p.data.canDo} sub={p.data.masked} /></span>,
    },
    {
      headerName: '', colId: 'view', width: 120, sortable: false, resizable: false,
      cellRenderer: (p: ICellRendererParams<Row>) => {
        const u = p.data;
        if (!u) return null;
        if (u.id === me) return <span className="adm-you">You</span>;
        if (!u.usesSeat) return <span className="adm-sub">External</span>;
        return (
          <button type="button" className="btn btn-sm" disabled={!viewAs.ok} title={viewAs.ok ? `See the workspace as ${u.name}, read only` : viewAs.reason} onClick={() => open(u)}>
            <Eye size={12} aria-hidden />View as
          </button>
        );
      },
    },
  ];

  return (
    <div className="view">
      <AdminStrip tiles={tiles} />
      <Card>
        <CardHead title="Users & roles" meta={`${vm.total} people in ${profile.name}`}>
          <DisabledAction id="adm-invite-why" label={<><UserPlus size={12} aria-hidden />Invite</>} reason={INVITE_REASON} />
        </CardHead>
        {vm.groups.map((g) => (
          <div key={g.group}>
            <div className="adm-group">{g.group}<span className="n">{g.users.length}</span></div>
            <AdminGrid<Row> rows={g.users} columns={columns} label={`${g.group}: people, roles and View as`} onEnter={open} rowHeight={64} />
          </div>
        ))}
        <CardFoot>
          Each person has one role and a tender scope, set by the {profile.headTitle}. View as opens that person’s workspace read only, with a banner;
          it and every role change are written to the audit log. Select a row and press Enter to view as that person.
        </CardFoot>
      </Card>
    </div>
  );
}
