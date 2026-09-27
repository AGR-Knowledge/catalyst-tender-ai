import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { kpi } from '@/domain/gcc/kpi';
import { targetGroupsOf, type TargetRow, type TargetUse } from '@/domain/gcc/admin';
import { Card, CardFoot, CardHead } from '@/components/ui/primitives';
import { AdminGrid, Cell2, Rule, useAdmin } from './AdminKit';

/**
 * `/admin/targets` (plan 024 Phase 3, catalogue §0.4): every target and time
 * limit the dashboards and rules read, grouped, with its value, the tiles and
 * rules that use it, and the file it lives in. The values are imported from
 * those files, so the list can't disagree with the screens. Listed, not edited.
 */

function Uses({ uses }: { uses: TargetUse[] }) {
  return (
    <span className="adm-chips">
      {uses.map((u) => ('kpi' in u
        ? <span key={u.kpi} className="adm-chip">{kpi(u.kpi)?.label ?? u.kpi}<span className="id">{u.kpi}</span></span>
        : <span key={u.rule} className="adm-chip">{u.rule}</span>))}
    </span>
  );
}

const columns: ColDef<TargetRow>[] = [
  { headerName: 'Target', field: 'name', flex: 1.5, minWidth: 240, cellRenderer: (p: ICellRendererParams<TargetRow>) => p.data && <span className="adm-wrap" title={p.data.name}><Cell2 main={p.data.name} /></span> },
  { headerName: 'Value', field: 'text', flex: 1.2, minWidth: 190, sortable: false, cellRenderer: (p: ICellRendererParams<TargetRow>) => p.data && <span className="adm-wrap" title={p.data.text}><Cell2 main={<span className="num">{p.data.text}</span>} /></span> },
  { headerName: 'Used by', colId: 'usedBy', flex: 2, minWidth: 280, sortable: false, cellRenderer: (p: ICellRendererParams<TargetRow>) => p.data && <span className="adm-chips-cell"><Uses uses={p.data.usedBy} /></span> },
  { headerName: 'Lives in', field: 'source', flex: 1.1, minWidth: 190, cellRenderer: (p: ICellRendererParams<TargetRow>) => p.data && <span className="adm-src" title={`src/${p.data.source}`}>{p.data.source}</span> },
];

export default function Targets() {
  const { tenant, profile } = useAdmin();
  const groups = useMemo(() => targetGroupsOf(tenant), [tenant]);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="view">
      <Card>
        <CardHead title="Targets & SLAs" meta={`${total} settings for ${profile.name}`} />
        <Rule>Each tile’s ⓘ shows the target in force. In the product these are company settings; the demo runs on the specification’s defaults, listed here and not edited.</Rule>
        {groups.map((g) => (
          <div key={g.group}>
            <div className="adm-group">{g.group}<span className="n">{g.rows.length}</span></div>
            <AdminGrid<TargetRow> rows={g.rows} columns={columns} label={`${g.group}: targets and time limits`} rowHeight={60} />
          </div>
        ))}
        <CardFoot>Values are read from the files named, the same ones the dashboards read, so this list and the screens can’t disagree.</CardFoot>
      </Card>
    </div>
  );
}
