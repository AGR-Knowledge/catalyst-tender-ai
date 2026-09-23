import { COST_LINES, REPRICE_LOG, SENSITIVITY } from '@/data/workspace';
import { useDemo } from '@/state/store';
import { useLive, FOCUS_ID } from '@/domain/live';
import { cr, crDelta, pct } from '@/domain/format';
import { Card, CardFoot, CardHead, Meter, Track } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

export function CommDashboard() {
  const { state, openDrawer, setScenario, mark, toast } = useDemo();
  const live = useLive();
  const maxLine = Math.max(...COST_LINES.map((l) => l.value));
  const directPct = Math.round((live.direct / live.cost) * 100);
  const bestEv = Math.max(...live.scenarios.map((s) => s.ev));

  return (
    <>
      <div className="split" style={{ '--cols': '1fr 1.25fr' } as React.CSSProperties}>
        <Card id="sec-cost">
          <CardHead title="Cost build-up" meta={`${cr(live.cost, 1)}, ${directPct}% direct and ${100 - directPct}% indirect`} />
          {COST_LINES.map((l) => (
            <button type="button" key={l.key} className="item click" style={{ display: 'block', padding: '11px 22px' }} onClick={() => openDrawer({ type: 'cost', key: l.key })}>
              <span style={{ display: 'flex', fontSize: 13, alignItems: 'baseline', gap: 12 }}>
                <span style={{ flex: 1, color: 'var(--ink-2)' }}>{l.label}</span>
                <span className="num" style={{ fontWeight: 500 }}>{cr(l.value, 1)}</span>
              </span>
              <span style={{ display: 'block', marginTop: 7 }}><Track pct={(l.value / maxLine) * 100} thin /></span>
            </button>
          ))}
          <CardFoot>Select a line to see its source quote or norm.</CardFoot>
        </Card>

        <div className="stack-gap">
          <Card id="sec-scenarios">
            <CardHead title="Margin scenarios" meta={live.m2Frozen ? `${live.scenario.name} frozen at M2` : 'Select one to record it'} />
            <DataTable
              rows={live.scenarios}
              rowKey={(x) => x.key}
              onRowClick={(x) => {
                if (live.m2Frozen) return toast('M2 is frozen. A re-price event is needed to re-open the scenario set', 'orange');
                if (x.key === state.scenario) return;
                setScenario(x.key);
                toast(`${x.name} scenario selected and recorded against ${FOCUS_ID}, no default applied`);
              }}
              dim={(x) => live.m2Frozen && x.key !== state.scenario}
              columns={[
                { key: 'n', header: 'Scenario', width: '1.1fr', primary: true, render: (x) => {
                  const on = x.key === state.scenario;
                  return <span className="cell-main" style={{ fontWeight: on ? 600 : 400, display: 'flex', gap: 9, alignItems: 'center' }}><span style={{ color: on ? 'var(--ink)' : 'var(--ink-7)', fontSize: 11 }}>{on ? '●' : '○'}</span>{x.name}</span>;
                } },
                { key: 'p', header: 'Price', width: '.8fr', align: 'right', render: (x) => <span className="num t-ink" style={{ fontSize: 13, fontWeight: x.key === state.scenario ? 600 : 400 }}>{cr(x.price)}</span> },
                { key: 'm', header: 'Margin', width: '.7fr', align: 'right', render: (x) => <span className="num t-ink" style={{ fontSize: 13, fontWeight: x.key === state.scenario ? 600 : 400 }}>{pct(x.marginPct, 1)}</span> },
                { key: 'w', header: 'Win prob.', width: '.7fr', align: 'right', render: (x) => <span className="num">{x.win}%</span> },
                { key: 'e', header: 'Exp. value', width: '.8fr', align: 'right', priority: 2, render: (x) => <span className={`num ${x.ev === bestEv ? 't-green' : ''}`}>{cr(x.ev, 1)}</span> },
              ]}
            />
            <CardFoot row>
              <span className="grow">Base and stretch have near-identical expected value. Pick one to record it for M2.</span>
              {live.m2Frozen
                ? <button type="button" className="btn btn-success" onClick={() => toast('M2 already frozen; re-price events will re-open it', 'ink3')}>✓ M2 frozen</button>
                : <button type="button" className="btn btn-primary" onClick={() => mark('m2', `Cost model frozen at M2 on the ${live.scenario.name.toLowerCase()} scenario. Schedule reconciled, commercial volume unblocked`)}>Freeze {live.scenario.name.toLowerCase()} at M2</button>}
            </CardFoot>
          </Card>

          <Card>
            <CardHead title="Sensitivity: margin at risk" meta="steel is the dominant exposure" />
            <div className="card-body" style={{ paddingBottom: 8 }}>
              {SENSITIVITY.map((x) => <Meter key={x.label} label={x.label} value={x.value} pct={x.w} tone="orange" />)}
            </div>
          </Card>
        </div>
      </div>

      <Card id="sec-reprice" style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Live re-price log" meta={`${REPRICE_LOG.length} events`} />
        <DataTable
          rows={REPRICE_LOG}
          rowKey={(x) => x.when}
          columns={[
            { key: 'w', header: 'When', width: '.7fr', render: (x) => <span className="num t-ink3">{x.when}</span> },
            { key: 't', header: 'Trigger', width: '2fr', primary: true, render: (x) => <span className="t-ink" style={{ fontSize: 13 }}>{x.trigger}</span> },
            { key: 'i', header: 'Impact', width: '.6fr', align: 'right', render: (x) => <span className={`num ${x.impact > 0 ? 't-red' : 't-green'}`} style={{ fontSize: 13 }}>{crDelta(x.impact)}</span> },
          ]}
        />
      </Card>
    </>
  );
}
