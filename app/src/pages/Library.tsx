import { LIBRARY, LIBRARY_STATS } from '@/data/catalog';
import { useDemo } from '@/state/store';
import { int } from '@/domain/format';
import { Card, CardFoot, CardHead, Kpis } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

export function Library() {
  const { openDrawer } = useDemo();
  return (
    <div className="view">
      <Kpis items={[
        { label: 'Artefacts', value: int(LIBRARY_STATS.artefacts), sub: `across ${LIBRARY_STATS.categories} categories` },
        { label: 'Reuse rate', value: `${LIBRARY_STATS.reuseRate}%`, sub: 'of drafted content', tone: 'green' },
        { label: 'Won-bid sourced', value: `${LIBRARY_STATS.wonSourced}%`, sub: 'content from won bids' },
        { label: 'Stale > 18 months', value: String(LIBRARY_STATS.stale), sub: 'flagged for refresh', tone: 'orange' },
      ]} />
      <Card>
        <CardHead title="Most reused artefacts" meta="by reuse count" />
        <DataTable
          rows={LIBRARY.map((a, i) => ({ ...a, i }))}
          rowKey={(a) => a.title}
          onRowClick={(a) => openDrawer({ type: 'artefact', index: a.i })}
          columns={[
            { key: 't', header: 'Artefact', width: '2fr', primary: true, render: (a) => <span className="cell-main">{a.title}</span> },
            { key: 'k', header: 'Kind', width: '.8fr', render: (a) => a.kind },
            { key: 'o', header: 'Origin', width: '1.4fr', priority: 2, render: (a) => <span className="t-ink3">{a.origin}</span> },
            { key: 'r', header: 'Reuses', width: '.6fr', align: 'right', render: (a) => <span className="num t-ink" style={{ fontSize: 13 }}>{a.reuses}</span> },
            { key: 'u', header: 'Last used', width: '.8fr', align: 'right', priority: 3, render: (a) => <span className="num t-ink3">{a.lastUsed}</span> },
          ]}
        />
        <CardFoot>Reused text carries a link back to the bid it came from.</CardFoot>
      </Card>
    </div>
  );
}
