import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { facilityFor, type FacilityVM } from '@/domain/gcc/company';
import { dayMonth2 } from '@/domain/gcc/s1/common';
import { Card, CardHead, KV, Meter } from '@/components/ui/primitives';
import { Money } from '@/components/tender/Money';
import { S1Grid } from '../s1/parts/Grid';

/**
 * Company › Bank facility (read only): the bank guarantee facility as Finance
 * last confirmed it. Headroom = limit − utilised − committed (DEC-6), the same
 * figure the DG1 pack and the Bid / No-Bid pack quote.
 */

type Row = FacilityVM['committed'][number] & { id: string };

const KIND: Record<Row['kind'], string> = { 'bid bond': 'Bid bond', performance: 'Performance bond', advance: 'Advance payment guarantee' };

export function Facility({ tenant }: { tenant: string }) {
  const f = useMemo(() => facilityFor(tenant), [tenant]);
  const rows: Row[] = useMemo(() => f.committed.map((c, i) => ({ ...c, id: `${i}` })), [f]);
  const columns = useMemo<ColDef<Row>[]>(() => [
    { colId: 'label', headerName: 'Held for', flex: 1, minWidth: 260, valueGetter: (p) => p.data?.label, cellRenderer: (p: ICellRendererParams<Row>) => p.data && <span className="co-clip" title={p.data.label}>{p.data.label}</span> },
    { colId: 'kind', headerName: 'Kind', width: 200, valueGetter: (p) => (p.data ? KIND[p.data.kind] : '') },
    {
      colId: 'tender', headerName: 'Tender', width: 130, valueGetter: (p) => p.data?.tenderId,
      cellRenderer: (p: ICellRendererParams<Row>) => (p.data?.tenderId ? <span className="mono">{p.data.tenderId}</span> : <span className="tk-sub">Awarded contract</span>),
    },
    { colId: 'amount', headerName: 'Amount', width: 130, valueGetter: (p) => p.data?.amount.amount, cellRenderer: (p: ICellRendererParams<Row>) => p.data && <Money value={p.data.amount} /> },
  ], []);

  return (
    <>
      <Card>
        <CardHead title="Bank guarantee facility" meta={<span className="tk-sub">As of {dayMonth2(f.asOf)}{f.confirmedBy ? `, confirmed by ${f.confirmedBy}` : ''}</span>} />
        <div className="s1-pad co-facility">
          <div className="s1-kv">
            <KV k="Limit" v={<Money value={f.limit} />} />
            <KV k="Utilised on contracts" v={<Money value={f.utilised} />} />
            <KV k="Committed for live bids and awards" v={<Money value={f.committedTotal} />} />
            <KV k="Headroom" v={<Money value={f.headroom} />} />
          </div>
          <div>
            <Meter label="Share of the limit in use" value={<span className="num">{f.usedPct}%</span>} pct={f.usedPct} />
            <p className="s1-note">Headroom is the limit less what is utilised and committed. Each DG1 pack and Bid / No-Bid pack checks its bonds against it. Finance keeps the facility up to date; it is read only here.</p>
          </div>
        </div>
      </Card>
      <Card>
        <CardHead title="Guarantees committed" meta={<span className="num">{rows.length}</span>} />
        <S1Grid rows={rows} columns={columns} label="Guarantees committed against the facility" />
      </Card>
    </>
  );
}
