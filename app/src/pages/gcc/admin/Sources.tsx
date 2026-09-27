import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Plug } from 'lucide-react';
import { agoText } from '@/domain/gcc/clock';
import { registryTile, sourcesOf, type SourceVM } from '@/domain/gcc/admin';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { When } from '@/components/tender/When';
import { AdminGrid, AdminStrip, Cell2, DisabledAction, useAdmin } from './AdminKit';

/**
 * `/admin/sources` (plan 024 Phase 2, catalogue INT-4): the portals, mailboxes
 * and scanned drops the Intake Agent watches, worst first, with the state each
 * reported at its last poll. The same seed list the tender radar reads. A
 * source whose login is expiring says so in words. Connecting a source and its
 * credentials are handled in the product.
 */

const CONNECT_REASON = 'Demo: sources are connected in the product';

export default function Sources() {
  const admin = useAdmin();
  const { tenant, profile } = admin;
  const vm = useMemo(() => sourcesOf(tenant), [tenant]);
  const int4 = registryTile('INT-4', admin);

  const columns: ColDef<SourceVM>[] = [
    { headerName: 'Source', field: 'name', flex: 1.4, minWidth: 220, cellRenderer: (p: ICellRendererParams<SourceVM>) => p.data && <Cell2 main={p.data.name} sub={p.data.kindLabel} /> },
    { headerName: 'Mode', field: 'modeLabel', width: 120 },
    {
      headerName: 'State', field: 'stateLabel', width: 190,
      comparator: (_a, _b, na, nb) => vm.rows.indexOf(na.data!) - vm.rows.indexOf(nb.data!),
      cellRenderer: (p: ICellRendererParams<SourceVM>) => p.data && <StatusPill label={p.data.stateLabel} tone={p.data.tone} icon={p.data.icon} />,
    },
    { headerName: 'What it needs', field: 'note', flex: 1.8, minWidth: 240, cellRenderer: (p: ICellRendererParams<SourceVM>) => p.data && <span className="adm-wrap" title={p.data.note}><Cell2 main={<span style={{ fontWeight: 400 }}>{p.data.note}</span>} /></span> },
    {
      headerName: 'Last poll', field: 'lastPoll', width: 190,
      cellRenderer: (p: ICellRendererParams<SourceVM>) => p.data && (
        <Cell2 main={<When date={p.data.lastPoll.slice(0, 10)} time={p.data.lastPoll.length > 10 ? p.data.lastPoll.slice(11, 16) : undefined} short />} sub={p.data.lastPoll.length > 10 ? agoText(p.data.lastPoll) : undefined} />
      ),
    },
  ];

  return (
    <div className="view">
      <AdminStrip tiles={int4 ? [int4] : []} />
      <Card>
        <CardHead title="Sources & integrations" meta={`${vm.rows.length} watched · ${vm.healthy} healthy`}>
          <DisabledAction id="adm-connect-why" label={<><Plug size={12} aria-hidden />Connect a source</>} reason={CONNECT_REASON} />
        </CardHead>
        <AdminGrid<SourceVM> rows={vm.rows} columns={columns} label={`Sources watched for ${profile.name}`} rowHeight={56} />
        <CardFoot>
          Worst first. Portal logins are held masked and never shown here. An assisted source is login-gated: an operator completes access,
          because the platform never solves a CAPTCHA. Missed tenders are caught by the daily reconciliation on the tender radar.
        </CardFoot>
      </Card>
    </div>
  );
}
