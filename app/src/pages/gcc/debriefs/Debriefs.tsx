import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { GridApi } from 'ag-grid-community';
import { Download, Info, X } from 'lucide-react';
import { kpi } from '@/domain/gcc/kpi';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { windowOf } from '@/domain/gcc/period';
import { ENDING_GROUPS, archiveFor, type ArchivePeriod, type ArchiveRow, type DebriefCtx, type EndingGroup } from '@/domain/gcc/debriefs';
import { plural } from '@/domain/gcc/s1/common';
import type { DrillVM, TileVM } from '@/domain/gcc/viewmodels';
import { Card, CardHead } from '@/components/ui/primitives';
import { KpiTiles } from '@/components/dashboard/KpiTile';
import { EmptyState } from '@/components/tender/EmptyState';
import { usePop } from '@/components/tender/Tip';
import { useS1 } from '../s1/vm/useS1';
import { kpiCtxOf, registryTile } from '../s1/vm/tiles';
import { RecordGrid } from '../company/record/RecordGrid';
import { LessonsCard, LossCard, RivalsCard, StoppedCard, WinCard, type ArchivePick, type EmptyWhy } from './parts/Cards';
import { FactorCard } from './parts/FactorChart';
import { csvParamsOf, gridColumnsOf } from './parts/columns';
import '@/components/dashboard/dashboard.css';
import '../s1/s1.css';
import '../company/company.css';
import './debriefs.css';

/**
 * `/debriefs`, the Debriefs archive (plan 037): every bid that ended in the
 * period, why, and what we learned, for the Head of Tendering, the CEO, the
 * committee, the Project Director and (for their own tenders) Bid Managers.
 * The period chips set the window for the whole page (12 months unless
 * `?period=` says otherwise, never the dashboards' stored period); the sector
 * and ending chips (`?sector=`, `?ending=`) narrow the cards and the list, not
 * the tiles. Every count lists its debriefs in the table, which downloads as a
 * CSV. Every figure comes from `archiveFor` and the DBR tiles.
 */

const HERE = '/debriefs';
const TABLE_ID = 'db-table';
const TILES = ['DBR-1', 'DBR-2', 'DBR-3', 'DBR-4', 'DBR-5', 'DBR-6'];
const PERIODS: { key: ArchivePeriod; label: string }[] = [
  { key: '30d', label: '30 days' }, { key: '90d', label: '90 days' }, { key: '12m', label: '12 months' },
];
const DEFAULT_PERIOD: ArchivePeriod = '12m';
const periodOf = (v: string | null): ArchivePeriod => (PERIODS.some((p) => p.key === v) ? (v as ArchivePeriod) : DEFAULT_PERIOD);
const groupOf = (v: string | null): EndingGroup | undefined => ENDING_GROUPS.find((g) => g.id === v)?.id;
const idOf = (r: ArchiveRow) => r.tenderId;

/** The period chips: three periods, arrow keys move between them. */
function PeriodChips({ value, onChange }: { value: ArchivePeriod; onChange(p: ArchivePeriod): void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + PERIODS.length) % PERIODS.length;
    onChange(PERIODS[j].key);
    refs.current[j]?.focus();
  };
  return (
    <div className="seg" role="radiogroup" aria-label="Period">
      {PERIODS.map((p, i) => (
        <button
          key={p.key} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={p.key === value}
          tabIndex={p.key === value ? 0 : -1} className={p.key === value ? 'on' : ''}
          onClick={() => onChange(p.key)} onKeyDown={(e) => onKey(e, i)}
        >{p.label}</button>
      ))}
    </div>
  );
}

/** "How to read this": the colours, the window, what the cards count, and that the tiles ignore the chips. */
function ReadKey({ range }: { range: string }) {
  const pop = usePop<HTMLButtonElement>({ width: 360 });
  const item = (mark: string, text: ReactNode) => <li><span className={`co-mk ${mark}`} aria-hidden />{text}</li>;
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost co-rh-key" {...pop.triggerProps}>
        <Info size={14} strokeWidth={1.7} aria-hidden />How to read this
      </button>
      {pop.render(
        <div className="info-pop co-key-pop">
          <div className="ip-t">How to read the debriefs</div>
          <ul className="sc-key co-key">
            {item('won', 'Green: from bids we won.')}
            {item('lost', 'Grey: from bids we lost. A result, not an alarm.')}
            {item('wd', 'Hatched: bids that stopped, neither won nor lost (cancelled by the employer, withdrawn, No-Bid at DG2, rejected at DG3).')}
            {item('one', 'Blue: a count across endings, such as lessons and answers.')}
          </ul>
          <div className="ip-note">
            The page reads the bids that ended in the period ({range}), by the day they ended.
            The reasons, factors, rivals, answers and lessons count accepted debriefs only; the list shows every ending with its debrief’s status.
            The tiles count the whole company for the period; the chips narrow the cards and the list. Select any count to list its debriefs.
          </div>
        </div>,
      )}
    </>
  );
}

export default function Debriefs() {
  const { tenant, viewer, viewAs, done } = useS1();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const period = periodOf(params.get('period'));
  const want = params.get('sector');
  const group = groupOf(params.get('ending'));
  const range = windowOf(period, tenant).rangeText;

  const ctx: DebriefCtx = useMemo(() => ({ tenant, viewer, done, now: DEMO_NOW }), [tenant, viewer, done]);
  // The period alone (the sector chips, a tile's list), then narrowed by sector (the ending chips' counts), then by ending.
  const whole = useMemo(() => archiveFor(ctx, { period }), [ctx, period]);
  const sector = want && whole.sectors.includes(want) ? want : undefined;
  const bySector = useMemo(() => (sector ? archiveFor(ctx, { period, sector }) : whole), [ctx, period, sector, whole]);
  const vm = useMemo(() => (group ? archiveFor(ctx, { period, sector, group }) : bySector), [ctx, period, sector, group, bySector]);
  const why: EmptyWhy = { endings: vm.totals.endings, group, narrowed: !!(sector || group) };

  // DBR-1 to DBR-6 at the page's period; a tile's list is the company's for the period, whatever the chips.
  const kctx = useMemo(() => kpiCtxOf({ tenant, viewer, viewAs, done }, period, 'debriefs'), [tenant, viewer, viewAs, done, period]);
  const tiles = useMemo(() => TILES.flatMap((id): TileVM[] => {
    const t = registryTile(id, kctx, HERE);
    if (!t) return [];
    let drill: DrillVM | null = null;
    try { drill = t.masked ? null : kpi(id)?.drill?.(kctx) ?? null; } catch { drill = null; }
    return [{ ...t, drill: drill?.kind === 'table' ? drill : t.drill }];
  }), [kctx]);

  // What the table lists: a count's debriefs, or every row the chips leave. New chips start again.
  const [pick, setPick] = useState<ArchivePick | null>(null);
  useEffect(() => { setPick(null); }, [tenant, period, sector, group]);
  const clearRef = useRef<HTMLButtonElement | null>(null);
  const choose = useCallback((p: ArchivePick) => {
    setPick(p);
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      document.getElementById(TABLE_ID)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      clearRef.current?.focus({ preventScroll: true });
    });
  }, []);
  const onDrill = useCallback((d: DrillVM) => {
    // A KPI names its list "From tile: …" for the dashboards' table; the chip here already says "From".
    const words = d.kind === 'table' ? d.label.replace(/^From tile:\s*/, '') : '';
    if (d.kind === 'table') choose({ key: `tile:${d.label}`, label: sector || group ? `${words}, whole company` : words, ids: d.ids ?? [], wide: true });
    else navigate(d.to);
  }, [choose, navigate, sector, group]);

  // A tile's list can hold a debrief outside the period's endings (Awaiting sign-off is a state): read it from 12 months then.
  const wide = useMemo(() => (pick?.wide && period !== '12m' ? archiveFor(ctx, { period: '12m' }) : whole), [pick, period, ctx, whole]);
  const shown = useMemo(() => {
    if (!pick) return vm.rows;
    const ids = new Set(pick.ids);
    return (pick.wide ? wide.rows : vm.rows).filter((r) => ids.has(r.tenderId));
  }, [pick, vm, wide]);

  const columns = useMemo(() => gridColumnsOf(), []);
  const api = useRef<GridApi<ArchiveRow> | null>(null);
  const onReady = useCallback((a: GridApi<ArchiveRow>) => { api.current = a; }, []);
  const download = () => api.current?.exportDataAsCsv(csvParamsOf(tenant, period));

  const setParam = (key: string, value: string | null) => setParams((prev) => {
    const n = new URLSearchParams(prev);
    if (value) n.set(key, value); else n.delete(key);
    return n;
  }, { replace: true });
  const t = bySector.totals;
  const groupCount: Record<EndingGroup, number> = { won: t.won, lost: t.lost, stopped: t.stopped };

  return (
    <div className="view s1 co db">
      <div className="co-rh">
        <PeriodChips value={period} onChange={(p) => setParam('period', p === DEFAULT_PERIOD ? null : p)} />
        <span className="co-rh-period">{range}</span>
        <ReadKey range={range} />
      </div>
      <div className="co-rh db-chips">
        {whole.sectors.length > 1 && (
          <div className="co-chipset" role="group" aria-label="Sector">
            <span className="co-chipset-l">Sector</span>
            <button type="button" className={`co-chip ${sector ? '' : 'on'}`} aria-pressed={!sector} onClick={() => setParam('sector', null)}>All</button>
            {whole.sectors.map((s) => (
              <button key={s} type="button" className={`co-chip ${sector === s ? 'on' : ''}`} aria-pressed={sector === s} onClick={() => setParam('sector', sector === s ? null : s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="co-chipset" role="group" aria-label="Ending">
          <span className="co-chipset-l">Ending</span>
          <button type="button" className={`co-chip ${group ? '' : 'on'}`} aria-pressed={!group} onClick={() => setParam('ending', null)}>All <span className="num">{t.endings}</span></button>
          {ENDING_GROUPS.map((g) => (
            <button key={g.id} type="button" className={`co-chip ${group === g.id ? 'on' : ''}`} aria-pressed={group === g.id} onClick={() => setParam('ending', group === g.id ? null : g.id)}>
              {g.label} <span className="num">{groupCount[g.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {tiles.length > 0 && <div className="s1-strip"><KpiTiles tiles={tiles} onDrill={onDrill} /></div>}

      <div className="eq-row">
        <WinCard vm={vm} why={why} onPick={choose} />
        <LossCard vm={vm} why={why} onPick={choose} />
      </div>
      <div className="eq-row">
        <FactorCard vm={vm} why={why} onPick={choose} />
        <RivalsCard vm={vm} why={why} onPick={choose} />
      </div>
      <div className="eq-row">
        <StoppedCard vm={vm} why={why} onPick={choose} />
        <LessonsCard vm={vm} why={why} onPick={choose} />
      </div>

      <Card className="co-rt" id={TABLE_ID}>
        <CardHead title="Every debrief">
          <button type="button" className="btn btn-sm db-csv" onClick={download} disabled={!shown.length}>
            <Download size={14} strokeWidth={1.8} aria-hidden />Download CSV · {plural(shown.length, 'row')}
          </button>
        </CardHead>
        <div className="s1-filters co-rt-filters">
          {pick ? (
            <span className="co-pick">
              <span>From “{pick.label}”</span>
              <button ref={clearRef} type="button" className="co-pick-x" aria-label={`Clear the filter: ${pick.label}`} onClick={() => setPick(null)}><X size={12} aria-hidden /></button>
            </span>
          ) : <span className="tk-sub">Every bid that ended in the period{sector ? ` · ${sector}` : ''}{group ? ` · ${group === 'stopped' ? 'stopped' : group}` : ''}, with its debrief’s status. Select any count above to list its debriefs.</span>}
        </div>
        {shown.length
          ? <RecordGrid rows={shown} columns={columns} idOf={idOf} onReady={onReady} onOpen={(id) => navigate(`/tenders/${encodeURIComponent(id)}?tab=debrief`)} label="Every debrief" />
          : <EmptyState title={pick ? 'No debrief to list.' : why.narrowed ? 'No bids ended in this selection.' : 'No bids ended in this period.'} body={pick ? 'Clear the filter to see every debrief.' : undefined} compact />}
        <p className="s1-foot">A row opens the tender’s Debrief tab. The file holds the rows as listed, with every lesson in its last column, and reads “Masked” where your role can’t see a value.</p>
      </Card>
    </div>
  );
}
