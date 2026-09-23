import { WHY_WIN } from '@/data/workspace';
import { BENEFIT, GO_LIVE } from '@/data/impact';
import { TENDERS } from '@/data/tenders';
import { useDemo } from '@/state/store';
import { useLive } from '@/domain/live';
import { int, pts } from '@/domain/format';
import { Card, CardFoot, CardHead, Kpis, Meter, SectionTitle, bg, tc } from '@/components/ui/primitives';
import { BenefitChart, EffortChart } from '@/components/ui/Charts';
import { DataTable } from '@/components/ui/DataTable';

export function ExecDashboard() {
  const { openDrawer, openModal } = useDemo();
  const live = useLive();

  const payback = BENEFIT.findIndex((b) => b.v > 0);
  const decided = TENDERS.filter((t) => t.gate === 'DG2' && live.done['dg2-' + t.id.slice(-3)]);

  return (
    <>
      <div className="split" style={{ '--cols': '1.5fr 1fr' } as React.CSSProperties}>
        <Card id="sec-decisions">
          <CardHead title="Decisions waiting on the Bid Committee" meta="Evidence pack attached to each" />
          {live.dg2Pending.map((t) => {
            const low = t.confidence === 'low';
            const sla = t.detail?.rows.find((r) => r[0] === 'Decision SLA')?.[1]?.replace(' remaining', ' left') ?? 'DG2 · 24h';
            return (
              <div className="item" key={t.id}>
                <span className={`bar-rail ${bg(low ? 'red' : 'orange')}`} />
                <span className="item-body">
                  <span className="item-title" style={{ fontSize: 14, fontWeight: 600 }}>{t.id} · {t.name}</span>
                  <span className="item-text" style={{ color: 'var(--ink-3)' }}>
                    Win-probability {t.win}% (±{t.band}). {low ? `Resource ask ${t.detail?.resourceAsk}. Low-data confidence flagged: only ${parseInt(t.detail?.comparables ?? '0', 10)} comparable bids.` : `Resource ask ${t.detail?.resourceAsk}. Expected margin ${t.detail?.expectedMargin}.`}
                  </span>
                  <span className="item-actions">
                    <button type="button" className="btn btn-primary" onClick={() => openModal({ type: 'dg2', id: t.id })}>Open DG2 decision</button>
                    <button type="button" className="btn" onClick={() => openDrawer({ type: 'tender', id: t.id })}>Evidence pack</button>
                  </span>
                </span>
                <span className={`item-when ${tc(low ? 'red' : 'orange')}`}>{sla}</span>
              </div>
            );
          })}
          {live.dg2Pending.length === 0 && (
            <div className="item"><span className="mark soft-green">✓</span><span className="item-body"><span className="item-title">No DG2 decisions waiting</span><span className="item-text">All evidence packs sent to the committee are decided.</span></span></div>
          )}
          {decided.map((t) => {
            const v = live.done['dg2-' + t.id.slice(-3)];
            return (
              <button type="button" className="item click" key={t.id} onClick={() => openDrawer({ type: 'tender', id: t.id })}>
                <span className={`bar-rail ${bg(v === 'approved' ? 'green' : 'muted')}`} />
                <span className="item-body">
                  <span className="item-title">{t.id} · {t.name}</span>
                  <span className="item-text">{v === 'approved' ? 'Approved at DG2 today. Stages 4 and 5 released.' : 'Declined at DG2 today. Estimating resource released.'}</span>
                </span>
                <span className={`item-when ${v === 'approved' ? 't-green' : 't-muted'}`} style={{ fontFamily: 'var(--font-sans)' }}>{v === 'approved' ? 'Approved' : 'Declined'}</span>
              </button>
            );
          })}
          <button type="button" className="item click" onClick={() => openDrawer({ type: 'tender', id: 'T-2026-049' })}>
            <span className="bar-rail bg-green" />
            <span className="item-body">
              <span className="item-title">T-2026-049 · Refinery Piping Package 4B</span>
              <span className="item-text">Approved at DG2 on 18 Feb. Now in Stage 7, compliance verification.</span>
            </span>
            <span className="item-when t-green" style={{ fontFamily: 'var(--font-sans)' }}>Recorded</span>
          </button>
        </Card>

        <div className="stack-gap">
          <Card id="sec-pipeline">
            <CardHead title="Pipeline by stage" meta={`${live.active.length} active`} />
            <div className="card-body" style={{ paddingBottom: 4 }}>
              {live.buckets.map((b) => (
                <Meter key={b.label} label={b.label} value={b.n} pct={(b.n / live.bucketMax) * 100} tone={b.stages.includes(6) && live.draftVerify > live.DRAFT_CEILING ? 'orange' : 'ink'} />
              ))}
            </div>
            <CardFoot>
              {live.draftVerify > live.DRAFT_CEILING
                ? `Capacity flag: Stages 6-7 are carrying ${live.draftVerify} concurrent bids against a planned ceiling of ${live.DRAFT_CEILING}. SME review time is the bottleneck.`
                : 'Stages 6-7 are within the planned ceiling of three concurrent bids.'}
            </CardFoot>
          </Card>
          <Card>
            <CardHead title="Why we win" meta="trailing 15 decided" />
            <div className="card-body" style={{ paddingBottom: 8 }}>
              {WHY_WIN.map((w) => <Meter key={w.label} label={w.label} value={`${w.pct}%`} pct={w.pct} tone={w.tone} />)}
            </div>
          </Card>
        </div>
      </div>

      <Card id="sec-margins" style={{ marginTop: 'var(--gap)' }}>
        <CardHead title="Portfolio margin: bid vs current" meta="feeds the margin model at Stage 5" />
        <DataTable
          rows={live.projects}
          rowKey={(p) => p.key}
          onRowClick={(p) => openDrawer({ type: 'project', key: p.key })}
          columns={[
            { key: 'p', header: 'Project', width: '1.6fr', primary: true, render: (p) => <span className="cell-main">{p.name}</span> },
            { key: 's', header: 'Sector', width: '1fr', priority: 2, render: (p) => <span className="t-ink3">{p.sector}</span> },
            { key: 'b', header: 'Bid margin', width: '.8fr', align: 'right', render: (p) => <span className="num t-ink">{p.bid.toFixed(1)}%</span> },
            { key: 'c', header: 'Current', width: '.8fr', align: 'right', render: (p) => <span className="num t-ink">{p.current.toFixed(1)}%</span> },
            { key: 'd', header: 'Delta', width: '.6fr', align: 'right', render: (p) => <span className={`num ${p.delta >= 0 ? 't-green' : p.delta <= -0.5 ? 't-red' : 't-ink3'}`}>{pts(p.delta)}</span> },
          ]}
                />
      </Card>

      <div id="sec-impact" />
      <SectionTitle title="Bid effort since go-live" sub={`Measured from activity logs since ${GO_LIVE}, against timesheets for the twelve months before`} />
      <Kpis items={[
        { label: 'Hours per bid', value: `${live.effortNow}h`, sub: `was ${live.effortBefore}h, ${Math.round(((live.effortBefore - live.effortNow) / live.effortBefore) * 100)}% less` },
        { label: 'Hours returned this quarter', value: int(live.hoursReturned), sub: `across ${live.submittedQuarter} bids, about ${Math.round(live.hoursReturned / 40)} working weeks`, subTone: 'green' },
        { label: 'Forecast accuracy', value: `±${live.calibrationError}%`, sub: `on ${live.decidedBids} decided bids, threshold ±10%` },
        { label: 'Platform cost recovered', value: BENEFIT[payback]?.m ?? 'Not yet', sub: `month ${payback + 1} after go-live` },
      ]} />
      <div className="split" style={{ '--cols': '1.6fr 1fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <Card>
          <CardHead title="Where the time went" meta="average hours of bid-office time per bid" />
          <EffortChart rows={live.effort} before={live.effortBefore} now={live.effortNow} />
          <CardFoot>Estimating and SME review are still the longest steps. Both stay with people.</CardFoot>
        </Card>
        <div className="stack-gap">
          <Card>
            <CardHead title="Cumulative net benefit" meta="after platform cost" />
            <div className="card-body"><BenefitChart data={BENEFIT} /></div>
            <CardFoot>Months shaded dark are after the platform paid for itself.</CardFoot>
          </Card>
          <Card>
            <CardHead title="Are the forecasts honest?" meta="win odds at DG2 against outcomes" />
            <div className="calib" role="table" aria-label="Forecast calibration">
              <div className="calib-row head" role="row"><span>Forecast at DG2</span><span>Bids</span><span>Won</span><span>Gap</span></div>
              {live.calibration.map((c) => (
                <div className="calib-row" role="row" key={c.band}>
                  <span>{c.band}</span>
                  <span className="num">{c.bids}</span>
                  <span className="num t-ink">{c.actual}%</span>
                  <span className={Math.abs(c.gap) <= 10 ? 't-ink3' : 't-orange'}>{Math.abs(c.gap) <= 10 ? 'Within 10' : c.gap > 0 ? 'Cautious' : 'Optimistic'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
