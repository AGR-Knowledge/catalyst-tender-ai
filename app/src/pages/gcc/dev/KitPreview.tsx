import { lazy, Suspense, useState, type CSSProperties } from 'react';
import { useTenant } from '@/domain/tenancy';
import { usePeriod, PERIODS, windowOf, previousOf } from '@/domain/gcc/period';
import { convert } from '@/domain/money';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { TenderTracker } from '@/components/dashboard/TenderTracker';
import { InfoTip } from '@/components/dashboard/InfoTip';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { SlaClock } from '@/components/tender/SlaClock';
import { GateChip } from '@/components/tender/GateChip';
import { StatusPill, HEALTH_ORDER } from '@/components/tender/StatusPill';
import { Masked } from '@/components/tender/Masked';
import { DemoTag } from '@/components/tender/DemoTag';
import { EmptyState } from '@/components/tender/EmptyState';
import type { GateChipState } from '@/domain/gcc/gateChips';
import { EXPECTED_WINDOWS, FIXTURE_STEPS_GRAPH, FIXTURE_TILES, FIXTURE_TRACKERS, fixtureDashboard } from './fixtures';

const StageChart = lazy(() => import('@/components/dashboard/chart/StageChart'));

/**
 * `/dev/kit` (development builds only): every dashboard component rendered
 * with the fixtures in `./fixtures.ts`, so the kit can be checked before the
 * registries (015, 013) and the data port (017) fill real dashboards.
 */

const GATE_STATES: GateChipState[] = ['open', 'waiting-on-me', 'breached', 'decided'];
const pad: CSSProperties = { padding: '10px 22px 16px' };
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' };

const span = (from: string, to: string) => `${from} → ${to}`;

export default function KitPreview() {
  const tenant = useTenant();
  const period = usePeriod();
  const [metric, setMetric] = useState('kit.count');
  const [stepsMetric, setStepsMetric] = useState(FIXTURE_STEPS_GRAPH.metric);
  const [lastPoint, setLastPoint] = useState<string | null>(null);
  const vm = fixtureDashboard(metric);

  const windows = PERIODS.map((p) => {
    const w = windowOf(p.key, tenant.key);
    const prev = previousOf(w);
    const e = EXPECTED_WINDOWS[p.key];
    // Today is compared to the minute; the others by day.
    const day = (iso: string) => (p.key === 'today' ? iso : iso.slice(0, 10));
    const got = { w: [day(w.from), day(w.to)], p: [day(prev.from), day(prev.to)] };
    const ok = got.w[0] === e.w[0] && got.w[1] === e.w[1] && got.p[0] === e.p[0] && got.p[1] === e.p[1];
    return { key: p.key, label: p.label, w, prev, got, e, ok };
  });
  const failing = windows.filter((w) => !w.ok).length;

  const onStepPoint = (key: string) => {
    setLastPoint(key);
    console.info('[kit] graph point', key);
  };

  return (
    <>
      <div className="view" style={{ paddingBottom: 0 }}>
        <div role="note" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', border: '1px dashed var(--orange)', background: 'var(--orange-soft)', borderRadius: 'var(--radius)', color: 'var(--ink-2)', fontSize: 13 }}>
          <strong>Kit preview · fixture data</strong>
          <span>Hand-written view models with Najd’s names. Not the demo’s data; real dashboards read the registries and the data port.</span>
        </div>
      </div>

      <DashboardPage
        vm={vm}
        period={period}
        metric={metric}
        setMetric={setMetric}
        subline={`Kit preview · ${tenant.name} · fixture data`}
      />

      <div className="view" style={{ display: 'grid', gap: 'var(--gap)', paddingTop: 0 }}>
        <Card>
          <CardHead title="Period windows" meta={failing ? `${failing} of ${windows.length} failing` : `All ${windows.length} match dashboards.md §2`} />
          <DataTable
            rows={windows}
            rowKey={(w) => w.key}
            columns={[
              { key: 'p', header: 'Option', width: '.7fr', primary: true, render: (w) => <span className="cell-main">{w.label}</span> },
              { key: 'w', header: 'Window', width: '1.5fr', render: (w) => <span>{w.w.rangeText}<br /><span className="mono tk-sub" style={{ fontSize: 11.5 }}>{span(w.got.w[0], w.got.w[1])}</span></span> },
              { key: 'v', header: 'Previous', width: '1.5fr', render: (w) => <span>{w.prev.label} · {w.prev.rangeText}<br /><span className="mono tk-sub" style={{ fontSize: 11.5 }}>{span(w.got.p[0], w.got.p[1])}</span></span> },
              { key: 'e', header: 'Expected (§2)', width: '1.3fr', priority: 2, render: (w) => <span className="mono" style={{ fontSize: 11.5 }}>{span(w.e.w[0], w.e.w[1])}<br />{span(w.e.p[0], w.e.p[1])}</span> },
              { key: 's', header: 'Since', width: '.7fr', priority: 3, render: (w) => w.w.startText },
              { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (w) => (w.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
            ]}
          />
        </Card>

        <Card>
          <CardHead title="Graph by step (Stage 2 · Sourcing)" meta={lastPoint ? `Last point clicked: ${lastPoint}` : 'Click a point: its key is logged here and in the console'} />
          <div style={pad}>
            <Suspense fallback={<div className="db-box-wait">Loading the graph…</div>}>
              <StageChart vm={FIXTURE_STEPS_GRAPH} onPoint={onStepPoint} metric={stepsMetric} setMetric={setStepsMetric} />
            </Suspense>
          </div>
        </Card>

        <Card>
          <CardHead title="Trackers" meta="Live · won · discarded at DG1" />
          <div style={{ ...pad, display: 'grid', gap: 'var(--gap)' }}>
            {Object.values(FIXTURE_TRACKERS).map((t) => <TenderTracker key={t.tenderId} vm={t} focusOnOpen={false} onOpen={(id) => console.info('[kit] open tender', id)} />)}
          </div>
        </Card>

        <Card>
          <CardHead title="Tender primitives" />
          <div style={pad}>
            <KV k="Money" v={<span style={row}><Money value={{ amount: 480e6, ccy: 'SAR' }} /><Money value={{ amount: convert(42e6, 'USD', 'SAR'), ccy: 'SAR', original: { amount: 42e6, ccy: 'USD' } }} /><Money value={{ amount: 12_064_000, ccy: 'SAR' }} full /></span>} />
            <KV k="When" v={<span style={row}><When date="2026-05-10" time="10:00" tz={tenant.tzLabel} countdown /><When date="2026-03-10" short /><When date="2026-03-03" tone="red" /></span>} />
            <KV k="SLA clock" v={<span style={row}><SlaClock start="2026-03-08T07:44" end="2026-03-09T07:44" /><SlaClock start="2026-03-07T14:10" end="2026-03-08T14:10" /><SlaClock start="2026-03-07T08:00" end="2026-03-08T08:00" /></span>} />
            <KV k="Gate chip" v={<span style={row}>{GATE_STATES.map((s) => <GateChip key={s} gate="DG2" state={s} />)}</span>} />
            <KV k="Status pill" v={<span style={row}>{HEALTH_ORDER.map((h) => <StatusPill key={h} health={h} />)}<StatusPill label="Needs review" tone="orange" icon="!" /></span>} />
            <KV k="Masked" v={<span style={row}><Masked by="the Head of Tendering, the CEO and Finance / Treasury" /></span>} />
            <KV k="Demo tag" v={<span style={row}>View as <DemoTag /></span>} />
            <KV k="Info" v={<span style={row}>{FIXTURE_TILES[1].label}<InfoTip info={FIXTURE_TILES[1].info} /></span>} />
          </div>
          <EmptyState title="No tenders match these filters." body="An empty state, compact off." />
          <EmptyState title="Nothing waiting on you." body="Next: DG1 on T-2026-118, due Mon 9 Mar 07:44" compact />
        </Card>
      </div>
    </>
  );
}
