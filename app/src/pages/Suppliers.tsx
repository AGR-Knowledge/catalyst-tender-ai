import { useMemo, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { SUPPLIERS, SUPPLIER_TOTAL } from '@/data/catalog';
import type { Supplier } from '@/data/types';
import { useDemo } from '@/state/store';
import { Card, CardFoot, CardHead, Kpis } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

type Standing = 'all' | Supplier['standing'];

export function Suppliers() {
  const { openDrawer } = useDemo();
  const [f, setF] = useState<Standing>('all');
  const [q, setQ] = useState('');
  const watch = SUPPLIERS.filter((s) => s.standing === 'Watch');
  const count = (k: Standing) => (k === 'all' ? SUPPLIERS.length : SUPPLIERS.filter((s) => s.standing === k).length);

  const rows = useMemo(() => SUPPLIERS
    .filter((s) => (f === 'all' || s.standing === f) && (!q || `${s.name} ${s.trade}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.score - a.score), [f, q]);

  const avg = SUPPLIERS.reduce((a, s) => a + s.score, 0) / SUPPLIERS.length;
  const resp = SUPPLIERS.reduce((a, s) => a + s.response, 0) / SUPPLIERS.length;

  return (
    <div className="view">
      <Kpis items={[
        { label: 'Screened suppliers', value: String(SUPPLIER_TOTAL), sub: `${SUPPLIERS.length} most active shown` },
        { label: 'Avg. performance', value: `${avg.toFixed(1)} / 10`, sub: 'on delivered projects' },
        { label: 'Avg. RFQ response', value: `${Math.round(resp)}%`, sub: 'across shown suppliers' },
        { label: 'On watch', value: String(watch.length), sub: 'downgraded on delivery', tone: 'orange' },
      ]} />
      <div className="filters">
        {(['all', 'Preferred', 'Approved', 'Watch'] as Standing[]).map((k) => (
          <button type="button" key={k} className={`filter ${f === k ? 'on' : ''}`} onClick={() => setF(k)} aria-pressed={f === k}>{k === 'all' ? 'All' : k}<span className="c">{count(k)}</span></button>
        ))}
        <span style={{ flex: 1 }} />
        <label className="search" style={{ width: 240 }}>
          <SearchIcon aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or trade" aria-label="Filter suppliers" />
        </label>
      </div>
      <Card>
        <CardHead title="Screened suppliers" meta="Scored on delivered performance and refreshed by the Learning Loop" />
        <DataTable
          rows={rows}
          rowKey={(s) => s.name}
          onRowClick={(s) => openDrawer({ type: 'supplier', name: s.name })}
          columns={[
            { key: 'n', header: 'Supplier', width: '1.4fr', primary: true, render: (s) => <span className="cell-main">{s.name}</span> },
            { key: 't', header: 'Trade', width: '1.3fr', priority: 2, render: (s) => s.trade },
            { key: 's', header: 'Score', width: '.6fr', align: 'right', render: (s) => <span className={`num ${s.score < 7 ? 't-orange' : 't-ink'}`} style={{ fontSize: 13 }}>{s.score.toFixed(1)}</span> },
            { key: 'p', header: 'Projects', width: '.6fr', align: 'right', priority: 3, render: (s) => <span className="num t-ink" style={{ fontSize: 13 }}>{s.projects}</span> },
            { key: 'r', header: 'RFQ response', width: '.7fr', align: 'right', priority: 2, render: (s) => <span className="num">{s.response}%</span> },
            { key: 'c', header: 'Screening', width: '.7fr', align: 'right', priority: 3, render: (s) => <span className="t-green">{s.screening}</span> },
            { key: 'st', header: 'Standing', width: '.7fr', align: 'right', render: (s) => <span className={s.standing === 'Preferred' ? 't-green' : s.standing === 'Watch' ? 't-orange' : 't-ink2'} style={{ fontWeight: 500 }}>{s.standing}</span> },
          ]}
        />
        <CardFoot>{watch.length} inverter suppliers are on Watch after delivery downgrades and rank lower in Stage 2 shortlists.</CardFoot>
      </Card>
    </div>
  );
}
