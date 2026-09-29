import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { X } from 'lucide-react';
import { money } from '@/domain/money';
import { kpi, type KpiCtx } from '@/domain/gcc/kpi';
import { RECORD_PERIOD, RECORD_STATUS, bidRecordFor, type BidRecordVM, type RecordRowVM } from '@/domain/gcc/company/record';
import { dayMonth, plural } from '@/domain/gcc/s1/common';
import { MIN_N } from '@/data/gcc/targets';
import type { DrillVM, TileVM } from '@/domain/gcc/viewmodels';
import { Card, CardHead } from '@/components/ui/primitives';
import { KpiTiles } from '@/components/dashboard/KpiTile';
import { StatusPill } from '@/components/tender/StatusPill';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { Masked } from '@/components/tender/Masked';
import { EmptyState } from '@/components/tender/EmptyState';
import type { S1 } from '../s1/vm/useS1';
import { kpiCtxOf, registryTile, valueTile } from '../s1/vm/tiles';
import { BreakdownCard, DeclineCard, FunnelCard, LossCard, ReadKey, type TablePick } from './record/Cards';
import { FiveYearChart, type YearPart } from './record/FiveYearChart';
import { RecordGrid } from './record/RecordGrid';

/**
 * Company profile › Bid record (plan 032): the company's record as a bidder.
 * Six tiles (Win / loss and Value won are the dashboards' own KPIs at 12
 * months), five years of record, then the last 12 months by sector, client
 * type, country, size and client, why we lost and what we chose not to bid,
 * and the tenders behind every count. A sector chip narrows everything but the
 * five-year record; a click on any count lists its tenders in the table. Every
 * figure comes from `bidRecordFor`.
 */

const HERE = '/company';
const m = (v: { amount: number; ccy: Parameters<typeof money>[1] }) => money(v.amount, v.ccy);
const TABLE_ID = 'co-record-table';
const table = (label: string, ids: string[]): DrillVM | null => (ids.length ? { kind: 'table', label, ids, status: 'all' } : null);

function tilesOf(vm: BidRecordVM, ctx: KpiCtx): TileVM[] {
  const t = vm.totals;
  const narrowed = vm.sector ? ` Narrowed to ${vm.sector}.` : '';
  const out: TileVM[] = [];

  out.push(valueTile('record.submitted', 'Bids submitted', String(t.submitted), {
    kind: 'flow', means: 'How many bids we sent in the last 12 months, and their value. Throughput with the same team.',
    counted: `Bids submitted in the period, on time or late, as the decision funnel counts them. Value is each tender’s published or estimated value, in the company currency.${narrowed}`,
    target: 'None (information)', source: 'Tender lifecycles: submissions',
  }, ctx, {
    sub: t.submitted ? `${plural(t.submitted, 'bid')} · ${m(t.valueSubmitted)} in value · ${t.awaiting} awaiting a result` : 'No bids submitted in this period',
    detail: t.submitted ? `${m(t.valueSubmitted)} in value` : 'No bids in this period',
    ref: { k: 'Awaiting result', v: plural(t.awaiting, 'bid') },
    drill: table('Bids submitted', t.ids.submitted),
  }));

  // Win / loss and Value won are the registered KPIs, read as the home dashboard reads them at 12 months. A sector narrows them here only.
  const pf3 = kpi('PF-3');
  const winLoss = !vm.sector ? registryTile('PF-3', ctx, HERE) : pf3 ? valueTile('PF-3', pf3.label, t.n ? `${t.won} won · ${t.lost} lost` : 'No results in this period', {
    kind: 'flow', ...pf3.info, counted: `${pf3.info.counted}${narrowed}`,
  }, ctx, {
    sub: `Win rate ${t.winRatePct ?? 0}% (n = ${t.n})${t.won ? ` · ${m(t.valueWon)} won` : ''}`,
    detail: t.won ? `${t.winRatePct}% · ${m(t.valueWon)} won` : t.n ? `Win rate ${t.winRatePct}%` : 'Nothing won or lost',
    ref: { k: 'Results', v: plural(t.n, 'result') },
  }) : null;
  // Counted over only the tenders shared with the viewer, a company target would judge a part as the whole: no tone then.
  const untoned = (x: TileVM): TileVM => (vm.partial ? { ...x, tone: undefined, status: undefined } : x);
  if (winLoss) out.push({ ...untoned(winLoss), drill: table('Results: won and lost', t.ids.results) });

  const out3 = kpi('OUT-3');
  const valueWon = !vm.sector ? registryTile('OUT-3', ctx, HERE) : out3 ? valueTile('OUT-3', out3.label, t.won ? m(t.valueWon) : 'No contracts won in this period', {
    kind: 'flow', ...out3.info, counted: `Σ contract value of the bids won in the period, in the company currency.${narrowed}`, target: 'None: the order-intake target is for the whole company',
  }, ctx, {
    sub: `${plural(t.won, 'win')}${t.largestWin ? ` · largest ${m(t.largestWin.value)}` : ''}`,
    detail: plural(t.won, 'win'),
    ref: { k: 'Largest', v: t.largestWin ? m(t.largestWin.value) : 'None' },
  }) : null;
  if (valueWon) out.push({ ...untoned(valueWon), drill: table('Contracts won', t.ids.won) });

  const decided = { amount: t.valueWon.amount + t.valueLost.amount, ccy: t.valueWon.ccy };
  out.push(valueTile('record.value-rate', 'Win rate by value', t.valueRatePct === null ? 'No results' : `${t.valueRatePct}%`, {
    kind: 'flow', means: 'Of the value we bid and heard back on, how much we won. A few large wins lift it more than the count; many small wins, less.',
    counted: `Value won ÷ (value won + value of the bids lost), for the results received in the period, in the company currency. Withdrawn and cancelled bids are left out.${narrowed}`,
    target: 'None (information)', source: 'Tender lifecycles: results',
  }, ctx, {
    sub: t.n ? `${m(t.valueWon)} won of ${m(decided)} decided · by count ${t.winRatePct}%` : 'Nothing won or lost in this period',
    detail: t.n ? `${m(t.valueWon)} of ${m(decided)}` : 'Nothing won or lost',
    ref: { k: 'By count', v: t.winRatePct === null ? 'No results' : `${t.winRatePct}%` },
    drill: table('Results: won and lost', t.ids.results),
  }));

  const d = vm.declines;
  out.push(valueTile('record.declined', 'Chose not to bid', String(d.total), {
    kind: 'flow', means: 'Tenders we decided not to pursue, at DG1 or at DG2. Where the company’s strategy and capability bite.',
    counted: `DG1 Discard and DG2 No-Bid decisions recorded in the period, whichever tenders they were on, as the decision funnel counts them.${narrowed}`,
    target: 'None (information)', source: 'Tender lifecycles: gate records',
  }, ctx, {
    sub: `${d.dg1.total} discarded at DG1 · ${d.dg2.total} no-bid at DG2`,
    detail: `${d.dg1.total} discarded at DG1`,
    ref: { k: 'No-bid at DG2', v: String(d.dg2.total) },
    drill: table('Chose not to bid', d.ids),
  }));

  const f = vm.forecast;
  const c = f.calibration;
  const info = {
    kind: 'flow' as const,
    means: `Whether the win probability the agent recommended at DG2 came true. In each band of predictions${c?.bands.length ? ` (${c.bands.map((x) => x.label).join(', ')})` : ''}, the share we won is set against the share predicted.`,
    counted: `The won and lost results of the period with a prediction recorded at DG2, as the calibration table (OUT-4) reads them. A band is judged from ${MIN_N} results.${narrowed}`,
    target: 'Every judged band within the tolerance', source: 'Tender lifecycles: results, with the prediction recorded at DG2',
  };
  if (f.masked) {
    const tile = valueTile('record.forecast', 'Forecast accuracy', 'Masked for your role', info, ctx);
    out.push({ ...tile, masked: { by: vm.maskedBy.predicted } });
  } else if (c) {
    const off = f.judged - f.within;
    out.push(valueTile('record.forecast', 'Forecast accuracy', !c.enough ? 'Not enough results yet' : f.judged ? `${f.within} of ${f.judged} bands` : 'Too few in each band', info, ctx, {
      sub: c.text,
      detail: !c.enough ? `${plural(c.n, 'decided bid')} so far` : f.judged ? (off ? `${plural(off, 'band')} off target` : 'All within the tolerance') : `No band has ${MIN_N} results`,
      ref: { k: 'Calibrated on', v: plural(c.n, 'bid') },
      ...(c.enough && f.judged ? { tone: off ? 'orange' as const : 'green' as const, ...(off ? { status: 'Off target' } : {}) } : {}),
      drill: table('Results with a prediction', t.ids.results),
    }));
  }
  return out;
}

const dash = <span className="tk-sub">Not published</span>;

function columnsOf(vm: BidRecordVM): ColDef<RecordRowVM>[] {
  const masked = (by: string) => <Masked by={by} />;
  return [
    {
      colId: 'tender', headerName: 'Tender', flex: 1.6, minWidth: 250, pinned: 'left', valueGetter: (p) => p.data?.title,
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => p.data && (
        <span className="s1-two">
          <Link className="s1-main co-rt-link" to={`/tenders/${encodeURIComponent(p.data.id)}`} title={p.data.title}>{p.data.title}</Link>
          <span className="s1-sub mono">{p.data.id}</span>
        </span>
      ),
    },
    {
      colId: 'client', headerName: 'Client', flex: 1.2, minWidth: 200, valueGetter: (p) => p.data?.client,
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => p.data && (
        <span className="s1-two"><span className="co-clip" title={p.data.client}>{p.data.client}</span><span className="s1-sub">{p.data.clientType}</span></span>
      ),
    },
    { colId: 'sector', headerName: 'Sector', width: 170, valueGetter: (p) => p.data?.sector },
    { colId: 'country', headerName: 'Country', width: 150, valueGetter: (p) => p.data?.country },
    {
      colId: 'value', headerName: 'Value', width: 130, valueGetter: (p) => p.data?.value?.amount ?? -1,
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => p.data && (p.data.value ? <Money value={p.data.value} /> : <span className="tk-sub">Not stated</span>),
    },
    {
      colId: 'submitted', headerName: 'Submitted', width: 130, valueGetter: (p) => p.data?.submitted ?? '',
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => p.data?.submitted ? <When date={p.data.submitted.slice(0, 10)} short /> : null,
    },
    {
      colId: 'decided', headerName: 'Decided', width: 130, sort: 'desc', valueGetter: (p) => p.data?.decided ?? '',
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => p.data?.decided ? <When date={p.data.decided.slice(0, 10)} short /> : null,
    },
    {
      colId: 'result', headerName: 'Result', width: 170, valueGetter: (p) => (p.data ? RECORD_STATUS[p.data.status].label : ''),
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => { if (!p.data) return null; const s = RECORD_STATUS[p.data.status]; return <StatusPill label={s.label} tone={s.tone} icon={s.icon} />; },
    },
    {
      colId: 'place', headerName: 'Our place', width: 120, valueGetter: (p) => p.data?.place?.rank ?? 99,
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => {
        const r = p.data;
        if (!r) return null;
        if (r.place) return <span className="num">{r.place.rank} of {r.place.of}</span>;
        return r.status === 'won' ? <span className="tk-sub">Winner</span> : r.status === 'lost' ? dash : null;
      },
    },
    {
      colId: 'gap', headerName: 'Gap to winner', width: 180, valueGetter: (p) => (typeof p.data?.gap === 'number' ? p.data.gap : -1),
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => {
        const r = p.data;
        if (!r) return null;
        if (r.status === 'won') return <span className="tk-sub">We won</span>;
        if (r.gap === 'masked') return masked(vm.maskedBy.gap);
        if (r.gap === undefined) return null;
        return r.gap === null ? dash : <span className="num">{r.gap}%</span>;
      },
    },
    {
      colId: 'reason', headerName: 'Reason', flex: 1.2, minWidth: 200, valueGetter: (p) => p.data?.reason ?? '',
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => p.data?.reason ? <span className="co-clip" title={p.data.reason}>{p.data.reason}</span> : null,
    },
    {
      colId: 'predicted', headerName: 'Predicted win', width: 180, valueGetter: (p) => (typeof p.data?.predicted === 'number' ? p.data.predicted : -1),
      cellRenderer: (p: ICellRendererParams<RecordRowVM>) => {
        const r = p.data;
        if (!r || r.predicted === undefined) return null;
        if (r.predicted === 'masked') return masked(vm.maskedBy.predicted);
        return r.predicted === null ? <span className="tk-sub">Not recorded</span> : <span className="num">{r.predicted}%</span>;
      },
    },
  ];
}

export function BidRecord({ s1 }: { s1: S1 }) {
  const { tenant, viewer, viewAs, done } = s1;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const want = params.get('sector');
  const vm = useMemo(() => bidRecordFor(tenant, done, viewer, { sector: want }), [tenant, done, viewer, want]);
  const ctx = useMemo(() => kpiCtxOf({ tenant, viewer, viewAs, done }, RECORD_PERIOD, 'company'), [tenant, viewer, viewAs, done]);
  const tiles = useMemo(() => tilesOf(vm, ctx), [vm, ctx]);
  const columns = useMemo(() => columnsOf(vm), [vm]);

  // What the table lists: a count's tenders, or by default the bids. A new sector or company starts again.
  const [pick, setPick] = useState<TablePick | null>(null);
  useEffect(() => { setPick(null); }, [tenant, vm.sector]);
  const clearRef = useRef<HTMLButtonElement | null>(null);
  const choose = useCallback((p: TablePick) => {
    setPick(p);
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      document.getElementById(TABLE_ID)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      clearRef.current?.focus({ preventScroll: true });
    });
  }, []);
  const onDrill = useCallback((d: DrillVM) => { if (d.kind === 'table') choose({ key: d.label, label: d.label, ids: d.ids ?? [] }); }, [choose]);
  const onYear = useCallback((_: unknown, part: YearPart) => {
    const y = vm.years[vm.years.length - 1];
    const label = { won: 'Won', lost: 'Lost', withdrawn: 'Withdrawn or cancelled' }[part];
    if (y.ids) choose({ key: `year:${part}`, label: `${label}, last 12 months${vm.sector ? ', all sectors' : ''}`, ids: y.ids[part] });
  }, [vm, choose]);

  const shown = useMemo(() => {
    const ids = new Set(pick ? pick.ids : vm.bidIds);
    // The five-year bar lists all sectors; so does its pick, even with a sector chosen.
    const rows = pick?.key.startsWith('year:') ? bidRecordFor(tenant, done, viewer).rows : vm.rows;
    return rows.filter((r) => ids.has(r.id));
  }, [pick, vm, tenant, done, viewer]);

  const setSector = (value: string | null) => setParams((prev) => {
    const n = new URLSearchParams(prev);
    if (value) n.set('sector', value); else n.delete('sector');
    return n;
  }, { replace: true });
  const allBids = vm.sectors.reduce((n, x) => n + x.n, 0);
  // Every rolling year ends on the same day: demo day's date.
  const yearEnd = dayMonth(vm.years[vm.years.length - 1].to);

  return (
    <>
      <div className="co-rh">
        <span className="co-rh-period"><b>Last 12 months</b> · {vm.window.rangeText}</span>
        {vm.sectors.length > 1 && (
          <div className="co-chipset" role="group" aria-label="Sector">
            <span className="co-chipset-l">Sector</span>
            <button type="button" className={`co-chip ${vm.sector ? '' : 'on'}`} aria-pressed={!vm.sector} onClick={() => setSector(null)}>All <span className="num">{allBids}</span></button>
            {vm.sectors.map((x) => (
              <button key={x.value} type="button" className={`co-chip ${vm.sector === x.value ? 'on' : ''}`} aria-pressed={vm.sector === x.value} onClick={() => setSector(vm.sector === x.value ? null : x.value)}>
                {x.label} <span className="num">{x.n}</span>
              </button>
            ))}
          </div>
        )}
        <ReadKey window={vm.window.rangeText} />
      </div>
      {vm.partial && <p className="co-rh-note">The last 12 months count only the tenders shared with you. The earlier years are the company’s annual record.</p>}

      <div className="s1-strip"><KpiTiles tiles={tiles} onDrill={onDrill} /></div>

      <div className="eq-row">
        <Card className="co-yr-card">
          <CardHead title="Five-year record" meta={<span className="tk-sub">Rolling years to {yearEnd} · all sectors</span>} />
          <div className="eq-scroll">
            <FiveYearChart years={vm.years} yearEnd={yearEnd} onPick={onYear} />
            <p className="co-bd-more">The last 12 months are the tenders below; the four years before are the company’s annual record, with no tender rows.</p>
          </div>
        </Card>
        <FunnelCard vm={vm.funnel} onPick={choose} />
      </div>

      <div className="eq-row" style={{ '--eq-cols': 3 } as CSSProperties}>
        <BreakdownCard title="By sector" noun="Sector" vm={vm.bySector} onPick={choose} empty="No bids in the last 12 months." />
        <BreakdownCard title="By client type" noun="Client type" vm={vm.byClientType} onPick={choose} empty="No bids in the last 12 months." />
        <BreakdownCard title="By country" noun="Country" vm={vm.byCountry} onPick={choose} empty="No bids in the last 12 months." />
      </div>

      <div className="eq-row">
        <BreakdownCard title="By size of bid" noun="Size" vm={vm.byBand} onPick={choose} empty="No bids in the last 12 months." />
        <BreakdownCard title="Top clients" noun="Client" vm={vm.topClients} onPick={choose} empty="No bids in the last 12 months." />
      </div>

      <div className="eq-row">
        <LossCard vm={vm.losses} maskedBy={vm.maskedBy.gap} onPick={choose} />
        <DeclineCard vm={vm.declines} onPick={choose} />
      </div>

      <Card className="co-rt" id={TABLE_ID}>
        <CardHead title="Tenders, last 12 months" meta={<span className="tk-sub">{plural(shown.length, 'tender')}</span>} />
        <div className="s1-filters co-rt-filters">
          {pick ? (
            <span className="co-pick">
              <span>{pick.label}</span>
              <button ref={clearRef} type="button" className="co-pick-x" aria-label={`Clear the filter: ${pick.label}`} onClick={() => setPick(null)}><X size={12} aria-hidden /></button>
            </span>
          ) : <span className="tk-sub">Bids submitted, or with a result, in the last 12 months{vm.sector ? ` · ${vm.sector}` : ''}. Select any count above to list its tenders.</span>}
        </div>
        {shown.length
          ? <RecordGrid rows={shown} columns={columns} onOpen={(id) => navigate(`/tenders/${encodeURIComponent(id)}`)} label="Tenders behind the bid record" />
          : <EmptyState title="No tender to list." body={pick ? 'Clear the filter to see the bids.' : 'No bid was submitted or decided in the last 12 months.'} compact />}
        <p className="s1-foot">Our place and the gap to the winner show where the employer published them. Values are each tender’s published or estimated value.</p>
      </Card>
    </>
  );
}
