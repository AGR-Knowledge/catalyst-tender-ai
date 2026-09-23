import { MATRIX, REDLINES, REQUIREMENTS_TOTAL } from '@/data/workspace';
import { useDemo } from '@/state/store';
import { useNudge } from '@/state/nav';
import { useLive, FOCUS_ID } from '@/domain/live';
import { Card, CardHead, Meter, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

export function CompDashboard() {
  const { openModal, openDrawer, is, toast } = useDemo();
  const nudge = useNudge();
  const live = useLive();

  const matrix = MATRIX.map((m) => m.gapKey && live.gapClosed
    ? { ...m, evidence: 'Renewed certificate issued 06 Mar, filed against ITB 9.4', status: 'Covered' }
    : m);
  const statusTone = (s: string) => (s === 'Covered' ? 'green' : s === 'Critical gap' ? 'red' : 'orange');
  const maxGap = Math.max(live.gaps.critical, live.gaps.major, live.gaps.minor, 1);
  const redlines = REDLINES.map((r) => ({ ...r, status: is('redline-' + r.key) ? 'With client' : r.status }));
  const redTone = (s: string) => (s === 'Open' ? 'red' : s === 'Accepted' ? 'green' : 'orange');

  const gate = {
    blocked: { cls: 'red', tone: 'red', t: 'DG3 is blocked.', b: 'One critical gap is open: the ISO 45001 certificate expires four days before submission. The gate cannot be cleared until it is closed. Flagged at Stage 6.' },
    ready: { cls: 'green', tone: 'green', t: 'DG3 is clear to proceed.', b: 'The renewed ISO 45001 certificate is filed against ITB 9.4. Mandatory coverage is 100% and the Tender Review Board can be convened.' },
    recorded: { cls: 'green', tone: 'green', t: 'DG3 recorded.', b: 'The Tender Review Board has approved the bid. The submission desk is released once the price is frozen at M2.' },
  }[live.dg3];

  return (
    <>
      <div className="split" style={{ '--cols': '1.6fr 1fr' } as React.CSSProperties}>
        <Card id="sec-matrix">
          <CardHead title={`Compliance matrix for ${FOCUS_ID} (extract)`} meta={`${REQUIREMENTS_TOTAL} requirements mapped, ${live.openGaps} open`} />
          <DataTable
            rows={matrix}
            rowKey={(m) => m.ref}
            onRowClick={(m) => (m.gapKey && !live.gapClosed ? openModal({ type: 'gap' }) : toast(`${m.ref} requirement text and evidence opened`, 'ink3'))}
            columns={[
              { key: 'r', header: 'Requirement', width: '1.7fr', primary: true, render: (m) => <span className="t-ink" style={{ fontSize: 13 }}>{m.req}</span> },
              { key: 'f', header: 'Ref.', width: '.6fr', render: (m) => <span className="num t-ink3" style={{ fontSize: 12 }}>{m.ref}</span> },
              { key: 't', header: 'Type', width: '.6fr', priority: 3, render: (m) => m.type },
              { key: 'e', header: 'Evidence in proposal', width: '1.5fr', priority: 2, render: (m) => m.evidence },
              { key: 's', header: 'Status', width: '.7fr', align: 'right', render: (m) => <span className={tc(statusTone(m.status))} style={{ fontWeight: 500 }}>{m.status}</span> },
            ]}
          />
        </Card>

        <Card id="sec-gaps">
          <CardHead title="Gaps by severity" meta={`${live.openGaps} open`} />
          <div className="card-body" style={{ paddingBottom: 8 }}>
            <Meter label="Critical" value={live.gaps.critical} pct={(live.gaps.critical / maxGap) * 100} tone={live.gaps.critical ? 'red' : 'green'} valueTone={live.gaps.critical ? 'red' : 'green'} />
            <Meter label="Major" value={live.gaps.major} pct={(live.gaps.major / maxGap) * 100} tone="orange" valueTone="orange" />
            <Meter label="Minor" value={live.gaps.minor} pct={(live.gaps.minor / maxGap) * 100} tone="ink3" valueTone="ink3" />
          </div>
          <div className={`callout ${gate.cls}`}>
            <div className={`t ${tc(gate.tone as 'red')}`}>{gate.t}</div>
            <div className="b">{gate.b}</div>
            <div className="a">
              {live.dg3 === 'blocked' && <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'gap' })}>Open critical gap</button>}
              {live.dg3 === 'ready' && <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'dg3' })}>Convene Review Board</button>}
              {live.dg3 === 'recorded' && <button type="button" className="btn btn-primary" onClick={() => nudge('bid', `DG3 recorded on ${FOCUS_ID}, submission desk released`)}>Notify Bid Manager</button>}
            </div>
          </div>
        </Card>
      </div>

      <Card id="sec-redlines" style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Escalated contractual positions" meta="Non-standard exposure escalated automatically" />
        <DataTable
          rows={redlines}
          rowKey={(x) => x.key}
          onRowClick={(x) => openDrawer({ type: 'redline', key: x.key })}
          columns={[
            { key: 'c', header: 'Clause', width: '1.2fr', primary: true, render: (x) => <span className="cell-main" style={{ fontSize: 13 }}>{x.clause}</span> },
            { key: 'p', header: 'Client position', width: '1.1fr', priority: 2, render: (x) => x.client },
            { key: 'r', header: 'Recommended redline', width: '1.6fr', priority: 3, render: (x) => x.redline },
            { key: 'e', header: 'Exposure', width: '.8fr', align: 'right', render: (x) => <span className="num t-ink" style={{ fontSize: 13 }}>{x.exposure}</span> },
            { key: 'o', header: 'Owner', width: '.7fr', align: 'right', priority: 3, render: (x) => <span className="t-ink3">{x.owner}</span> },
            { key: 's', header: 'Status', width: '.8fr', align: 'right', render: (x) => <span className={tc(redTone(x.status))} style={{ fontWeight: 500 }}>{x.status}</span> },
          ]}
        />
      </Card>
    </>
  );
}
