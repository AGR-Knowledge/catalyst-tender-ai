import { PROCUREMENT_GUARDS, TRANSFORMER_QUOTES, type PackageColumn } from '@/data/workspace';
import type { Tone } from '@/data/types';
import { useDemo } from '@/state/store';
import { useLive, FOCUS_ID } from '@/domain/live';
import { cr } from '@/domain/format';
import { Card, CardFoot, CardHead, tc } from '@/components/ui/primitives';
import { Board, type BoardColumn } from '@/components/ui/Board';
import { DataTable } from '@/components/ui/DataTable';

const COLS: { key: PackageColumn; head: string; tone: Tone }[] = [
  { key: 'issued', head: 'RFQ issued', tone: 'ink3' },
  { key: 'normalising', head: 'Normalising', tone: 'cyan' },
  { key: 'evaluated', head: 'Evaluated', tone: 'ink' },
  { key: 'approved', head: 'Buyer approved', tone: 'green' },
];

export function ProcDashboard() {
  const { openDrawer, mark } = useDemo();
  const live = useLive();

  const columns: BoardColumn[] = COLS.map((c) => {
    const pk = live.packages.filter((p) => p.column === c.key);
    return {
      key: c.key, head: c.head, tone: c.tone, count: pk.length,
      cards: pk.map((p) => ({
        key: p.key, name: p.name, meta: p.meta,
        metaTone: p.key === 'steel' && !live.is('sup') ? 'red' : p.column === 'approved' ? 'green' : undefined,
        onClick: () => openDrawer({ type: 'package', key: p.key }),
      })),
    };
  });

  const chosen = live.txChoice;

  return (
    <>
      <Card id="sec-board">
        <CardHead title={`${FOCUS_ID} · package board`} meta={`${live.packages.length} packages`} />
        <Board columns={columns} maxCards={5} />
      </Card>

      <div className="split" style={{ '--cols': '1.6fr 1fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <Card id="sec-quotes">
          <CardHead title="Normalised quote comparison for transformers" meta={chosen ? 'Selection recorded and locked to BOQ' : 'Parsed to a common schema by the agent'} />
          <DataTable
            rows={TRANSFORMER_QUOTES}
            rowKey={(q) => q.key}
            dim={(q) => !!chosen && chosen !== q.key}
            columns={[
              { key: 's', header: 'Supplier', width: '1.4fr', primary: true, render: (q) => (<><span className="cell-main">{q.supplier}</span><span className={`cell-sub ${tc(q.tone)}`}>{q.note}</span></>) },
              { key: 'p', header: 'Base price', width: '.7fr', align: 'right', render: (q) => <span className="num t-ink" style={{ fontSize: 13 }}>{cr(q.price, 1)}</span> },
              { key: 'f', header: 'Freight', width: '.7fr', align: 'right', render: (q) => <span className={q.freight === 'Excluded' ? 't-orange' : 't-ink3'}>{q.freight}</span> },
              { key: 'v', header: 'Validity', width: '.7fr', align: 'right', priority: 3, render: (q) => q.validity },
              { key: 'l', header: 'Lead time', width: '.6fr', align: 'right', priority: 2, render: (q) => q.lead },
              { key: 'a', header: 'Action', width: '.8fr', align: 'right', nolabel: true, render: (q) => chosen === q.key
                ? <span className="t-green" style={{ fontWeight: 500 }}>✓ Selected</span>
                : <button type="button" className="btn btn-sm btn-invert" disabled={!!chosen} onClick={() => mark('q-tx', `${q.supplier} selected for transformers. Locked to BOQ, reason recorded`, 'green', q.key)}>Select</button> },
            ]}
          />
          <CardFoot>Crompton Greaves excludes freight, so ₹ 1.6 Cr is added for comparison. Your selection is logged with its reason.</CardFoot>
        </Card>
        <Card>
          <CardHead title="Guardrails in force" />
          {PROCUREMENT_GUARDS.map((g) => (
            <div className="item" key={g.title} style={{ padding: '13px 22px' }}>
              <span className="mark round soft-green">✓</span>
              <span className="item-body"><span className="item-title" style={{ fontSize: 13 }}>{g.title}</span><span className="item-text" style={{ fontSize: 12, marginTop: 2 }}>{g.body}</span></span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

