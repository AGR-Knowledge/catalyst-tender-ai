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
import { EXPECTED_WINDOWS, FIXTURE_AUDIT, FIXTURE_OVERRIDDEN, FIXTURE_ROWS, FIXTURE_SOURCES, FIXTURE_STEPS_GRAPH, FIXTURE_TILES, FIXTURE_TRACKERS, fixtureDashboard } from './fixtures';
import { DEMO_TODAY } from '@/domain/calendar';
import { firstWithRole } from '@/data/people';
import { HERO_FILE, HERO_ID, HERO_REF } from '@/data/gcc/hero';
import { recommendationFor, eligibilityFor, type LineState } from '@/domain/gcc/s1';
import { addWorkingDays } from '@/domain/gcc/s1/common';
import { coverageBar } from '@/domain/gcc/s2/coverage';
import { DISCARD_REASONS } from '@/domain/gcc/dg1/decision';
import { Callout } from '@/components/tender/Callout';
import { SourceHost } from '@/components/tender/SourceHost';
import { SourceChip } from '@/components/tender/SourceChip';
import { RecommendationCard } from '@/components/tender/RecommendationCard';
import { ReasonCodePicker, EMPTY_REASON, missingReason, type ReasonValue } from '@/components/tender/ReasonCodePicker';
import { OverrideModal } from '@/components/tender/OverrideModal';
import { Sheet } from '@/components/tender/Sheet';
import { CoverageBar } from '@/components/tender/CoverageBar';
import { ThresholdBar } from '@/components/tender/ThresholdBar';
import { EligibilityLine } from '@/components/tender/EligibilityLine';
import { RequestButton } from '@/components/tender/RequestButton';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { LangBadge } from '@/components/tender/LangBadge';
import { Tabs, tabPanelProps } from '@/components/tender/Tabs';

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

        <KitPart2 />
      </div>
    </>
  );
}

/* ------------------------------------------------------------ kit part 2 (plan 019) */

const HERO_DOC = { url: HERO_FILE, title: `Tender booklet ${HERO_REF}` };
const STATES: LineState[] = ['pass', 'at-risk', 'interpretation', 'fail', 'na'];
const KIT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'eligibility', label: 'Eligibility & fit', badge: { text: '2 at risk', tone: 'orange' as const } },
  { id: 'bid-decision', label: 'Bid / No-Bid', locked: true },
  { id: 'audit', label: 'Decisions & audit', badge: { text: '12' } },
];

/** Every plan 019 component: the hero's real recommendation, coverage and eligibility; fixtures for the rest. */
function KitPart2() {
  const tenant = useTenant();
  const rec = recommendationFor('najd', HERO_ID, {});
  const cov = coverageBar('najd', HERO_ID);
  const lines = eligibilityFor('najd', HERO_ID, {})?.lines ?? [];
  const oneOf = STATES.map((st) => lines.find((l) => l.state === st)).filter((l): l is NonNullable<typeof l> => !!l);
  const [reason, setReason] = useState<ReasonValue>(EMPTY_REASON);
  const [override, setOverride] = useState(false);
  const [lastOverride, setLastOverride] = useState<string | null>(null);
  const [sheet, setSheet] = useState<number | null>(null);
  const [tab, setTab] = useState('overview');
  const fin = firstWithRole(tenant.key, 'fin');
  const due = `${addWorkingDays(DEMO_TODAY, 2, tenant.countryCode)}T12:00`;
  const items = FIXTURE_ROWS.slice(0, 5).map((r) => ({ id: r.id, title: `${r.id} · ${r.shortTitle}` }));

  return (
    <SourceHost>
      <Card>
        <CardHead title="Callout" meta="route · block · verdict · stale" />
        <div style={{ ...pad, display: 'grid', gap: 10 }}>
          <Callout variant="route" title="2 fields still being validated by Aisha Al-Qahtani">Pursue unlocks once the flagged fields are confirmed.</Callout>
          <Callout variant="block" title="PQ-05 fails: classification Grade 2 against Grade 1 required">A partner at Grade 1 would clear it.</Callout>
          <Callout variant="verdict" word="DG1" title="Pursue, recorded by Omar Siddiqui">Sun 8 Mar, 10:42 · within the 24 h time limit</Callout>
          <Callout variant="stale" title="Pack is stale: Addendum 2 changes two packages" action={<button type="button" className="btn btn-sm">Re-run</button>} />
        </div>
      </Card>

      <Card>
        <CardHead title="Source chips" meta="page and addendum open the hero booklet; records open a tip" />
        <div style={pad}>
          <KV k="With the hero booklet" v={<span style={row}>{FIXTURE_SOURCES.map((s) => <SourceChip key={s.label} source={s} doc={HERO_DOC} />)}</span>} />
          <KV k="Without a document" v={<span style={row}><SourceChip source={{ kind: 'page', label: 'p. 14', page: 14 }} /><SourceChip source={{ kind: 'addendum', label: 'add.1 p. 2', page: 2 }} /></span>} />
        </div>
      </Card>

      <Card>
        <CardHead title="Recommendation card" meta={rec ? `recommendationFor('najd', ${HERO_ID}, {})` : 'No recommendation for the hero'} />
        <div style={{ ...pad, display: 'grid', gap: 'var(--gap)', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
          {rec && (
            <RecommendationCard
              agent={rec.agent} verdict={rec.recommendation} tone={rec.verdict === 'pursue' ? 'green' : rec.verdict === 'discard' ? 'red' : 'orange'}
              confidence={`${rec.confidence[0].toUpperCase()}${rec.confidence.slice(1)} confidence`} confidenceWhy={rec.confidenceWhy}
              reasons={rec.reasons} wouldChange={rec.wouldChange} sources={rec.sources} doc={HERO_DOC}
            >
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setOverride(true)}>Override…</button>
              {lastOverride && <span className="tk-sub">{lastOverride}</span>}
            </RecommendationCard>
          )}
          {rec && (
            <RecommendationCard
              agent={rec.agent} verdict={rec.recommendation} tone="orange" confidence="Medium confidence"
              reasons={rec.reasons.slice(0, 2)} wouldChange={[]} wouldChangeMasked={{ by: 'the Head of Tendering and Bid Committee members' }}
              sources={rec.sources.slice(0, 2)} overriddenBy={FIXTURE_OVERRIDDEN}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardHead title="Reason codes and override" meta={missingReason('code-or-note', reason) ?? 'Rule met'} />
        <div style={pad}>
          <ReasonCodePicker codes={DISCARD_REASONS.slice(0, 6).map((r) => ({ id: r.code, label: r.label }))} value={reason} required="code-or-note" onChange={setReason} />
        </div>
      </Card>
      <OverrideModal
        open={override} title="Record DG1 against the recommendation" from={{ verdict: rec?.recommendation ?? 'Pursue', agent: rec?.agent ?? 'Intake & Extraction' }}
        options={[{ id: 'pursue', label: 'Pursue', hint: 'The tender moves to Sourcing' }, { id: 'discard', label: 'Discard', hint: 'The tender closes with your reason' }, { id: 'hold', label: 'Hold', hint: 'Wait for information' }]}
        preselect="discard" reasonRule="code-or-note" codes={DISCARD_REASONS.map((r) => ({ id: r.code, label: r.label }))}
        consequence="Overriding does not by itself pursue the tender."
        onConfirm={(r) => { setOverride(false); setLastOverride(`Kit only: ${r.choice}, ${r.codes.length} codes${r.note ? ', with a note' : ''}`); }}
        onClose={() => setOverride(false)}
      />

      <Card>
        <CardHead title="Sheet" meta="↑ ↓ move · Esc closes · focus returns to the row" />
        <div style={{ ...pad, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {items.map((it, i) => <button key={it.id} type="button" className="btn btn-sm" onClick={() => setSheet(i)}>{it.id}</button>)}
        </div>
      </Card>
      <Sheet
        items={items} index={sheet} onIndex={setSheet} onClose={() => setSheet(null)}
        primary={{ label: 'Open workspace', onClick: (id) => console.info('[kit] open workspace', id) }}
        render={(id) => {
          const r = FIXTURE_ROWS.find((x) => x.id === id)!;
          return <div className="drawer-sec"><KV k="Issuer" v={r.issuer} /><KV k="City" v={r.city} /><KV k="Fit" v={<ThresholdBar value={r.fit} threshold={65} thresholdLabel="pursue at" label="Fit" />} /></div>;
        }}
      />

      <Card>
        <CardHead title="Coverage and threshold bars" meta={cov ? `coverageBar('najd', ${HERO_ID})` : 'No coverage for the hero'} />
        <div style={{ ...pad, display: 'grid', gap: 16 }}>
          {cov && (
            <CoverageBar label="BOQ value by route" segments={[
              { label: 'Self-performed', value: { ...cov.values.self }, tone: 'green' },
              { label: 'Supply', value: { ...cov.values.supply }, tone: 'cyan' },
              { label: 'Subcontract', value: { ...cov.values.subcontract }, tone: 'orange' },
              { label: 'Not covered', value: { ...cov.values.notCovered }, tone: 'red' },
            ]} />
          )}
          <span style={row}>
            <ThresholdBar value={78} threshold={65} thresholdLabel="pursue at" label="Fit" />
            <ThresholdBar value={41} threshold={65} thresholdLabel="pursue at" label="Fit" />
            <ThresholdBar value={58} band={8} threshold={50} unit="%" label="Win probability" tone="ink" />
            <ThresholdBar value={58} masked maskedBy="the Head of Tendering and Bid Committee members" />
          </span>
        </div>
      </Card>

      <Card>
        <CardHead title="Eligibility lines" meta={`One per state from eligibilityFor('najd', ${HERO_ID})`} />
        <div>
          {oneOf.map((l) => <EligibilityLine key={l.reqId} line={l} doc={HERO_DOC} actions={l.state === 'at-risk' ? <button type="button" className="btn btn-sm">Request renewal</button> : undefined} />)}
          {oneOf.length === 0 && <EmptyState title="No eligibility lines for the hero." compact />}
        </div>
      </Card>

      <Card>
        <CardHead title="Request button, audit entry, language badge, tabs" />
        <div style={pad}>
          <KV k="Request" v={fin ? <RequestButton tenderId={HERO_ID} to={fin} topic="kit-check" what="Kit preview check: confirm bond headroom" section="Kit preview" due={due} /> : 'No Finance person in this tenant'} />
          <KV k="Language" v={<span style={row}><LangBadge lang="EN" /><LangBadge lang="AR" /><LangBadge lang="EN+AR" /></span>} />
        </div>
        <div style={{ padding: '0 22px 8px' }}>
          {FIXTURE_AUDIT.map((a) => (
            <AuditEntry key={a.key} actor={a.actor} at={a.at} action={a.action} before={a.before} after={a.after} detail={a.detail} system={a.system}
              chip={a.chip && <StatusPill label={a.chip.label} tone={a.chip.tone} />} />
          ))}
        </div>
        <div style={{ padding: '0 22px 16px' }}>
          <Tabs tabs={KIT_TABS} active={tab} onChange={setTab} label="Kit tabs" prefix="kit" />
          <div {...tabPanelProps('kit', tab)} style={{ padding: '12px 0', fontSize: 13 }}>Panel for <b>{tab}</b>. ← → Home End move between tabs.</div>
        </div>
      </Card>
    </SourceHost>
  );
}
