import { AUTO_ACCEPTED, EXTRACTION_CONFIDENCE, INTAKE_TODAY } from '@/data/workspace';
import { useDemo } from '@/state/store';
import { useLive } from '@/domain/live';
import { Card, CardFoot, CardHead, Mark, Meter, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

export function CoordDashboard() {
  const { openModal, openDrawer } = useDemo();
  const live = useLive();
  const open = live.validationsOpen;

  return (
    <>
      <div className="split">
        <Card id="sec-queue">
          <CardHead title="Validation queue" meta={`${open.length} open, below confidence threshold`} />
          {open.map((v) => (
            <div className="item" key={v.key}>
              <Mark soft="orange">?</Mark>
              <span className="item-body">
                <span className="item-title">{v.tender} · {v.field}</span>
                <span className="item-text">{v.detail}</span>
              </span>
              <button type="button" className="btn btn-invert" onClick={() => openModal({ type: 'validation', key: v.key })}>{v.label}</button>
            </div>
          ))}
          {open.length === 0 && (
            <div className="item">
              <Mark soft="green">✓</Mark>
              <span className="item-body"><span className="item-title">Queue clear</span><span className="item-text">All low-confidence fields are validated and saved to their tender records.</span></span>
            </div>
          )}
          <div className="item">
            <Mark soft="green">✓</Mark>
            <span className="item-body"><span className="item-title">{AUTO_ACCEPTED.tender} · {AUTO_ACCEPTED.fields} fields</span><span className="item-text">All above threshold. Auto-accepted with provenance recorded.</span></span>
            <span className="t-green" style={{ fontSize: 12 }}>Clean</span>
          </div>
        </Card>

        <Card id="sec-confidence">
          <CardHead title="Extraction confidence" meta="last 50 tenders" />
          <div className="card-body">
            {EXTRACTION_CONFIDENCE.map((c) => {
              const tone = c.pct < 93 ? 'orange' : 'ink';
              return <Meter key={c.label} label={c.label} value={`${c.pct}%`} pct={c.pct} tone={tone} valueTone={tone} />;
            })}
          </div>
          <CardFoot>Bond and evaluation-criteria fields score lowest and reach you most often. Both are being added to the golden set this quarter.</CardFoot>
        </Card>
      </div>

      <Card id="sec-intake" style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Intake today by source and disposition" meta={`${INTAKE_TODAY.length} since 06:00. Low-fit tenders are held for review.`} />
        <DataTable
          rows={INTAKE_TODAY}
          rowKey={(x) => x.time + x.id}
          onRowClick={(x) => openDrawer({ type: 'tender', id: x.id })}
          columns={[
            { key: 't', header: 'Time', width: '.5fr', render: (x) => <span className="num t-ink3">{x.time}</span> },
            { key: 's', header: 'Source', width: '.9fr', priority: 2, render: (x) => x.source },
            { key: 'n', header: 'Tender', width: '1.7fr', primary: true, render: (x) => (<><span className="cell-main">{x.name}</span><span className="cell-sub mono">{x.id}</span></>) },
            { key: 'c', header: 'Client', width: '1fr', priority: 3, render: (x) => x.client },
            { key: 'f', header: 'Fit', width: '.5fr', align: 'right', render: (x) => <span className="num t-ink" style={{ fontSize: 13 }}>{x.fit}</span> },
            { key: 'd', header: 'Disposition', width: '.95fr', align: 'right', render: (x) => <span className={tc(x.tone)}>{x.disp}</span> },
          ]}
        />
        <CardFoot>Addenda and corrigenda are filed under their parent tender.</CardFoot>
      </Card>
    </>
  );
}
