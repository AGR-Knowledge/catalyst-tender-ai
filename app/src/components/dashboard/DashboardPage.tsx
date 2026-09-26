import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import type { DashboardVM, DrillVM, TableFilterVM } from '@/domain/gcc/viewmodels';
import type { PeriodKey, PeriodWindow } from '@/domain/gcc/period';
import { EmptyState } from '@/components/tender/EmptyState';
import { PeriodFilter } from './PeriodFilter';
import { KpiTiles } from './KpiTile';
import { FlowStrip } from './FlowStrip';
import { ActionList } from './ActionList';
import { ViewToggle, useMainView } from './ViewToggle';
import { TenderGrid } from './grid/TenderGrid';
import { TenderTracker } from './TenderTracker';
import './dashboard.css';

/** Recharts loads only when someone opens the Graph. */
const StageChart = lazy(() => import('./chart/StageChart'));

/**
 * One layout for every dashboard (dashboards.md §1): Z1 header and period,
 * Z2 tiles, Z3 flow strip beside Z4 Needs your action, Z5 Table | Graph, and
 * Z6 the tracker for a selected row. It renders the view model; it computes
 * nothing.
 */
export interface DashboardPageProps {
  vm: DashboardVM;
  period: { key: PeriodKey; window: PeriodWindow; setPeriod(k: PeriodKey): void };
  metric: string;
  setMetric(id: string): void;
  /** The sub-line when the spec gives none: person · company · As of … */
  subline: string;
}

export function DashboardPage({ vm, period, metric, setMetric, subline }: DashboardPageProps) {
  const navigate = useNavigate();
  const [view, setView] = useMainView();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<TableFilterVM | null>(null);
  const main = useRef<HTMLElement>(null);
  const hasGraph = !!vm.graph;
  const showGraph = hasGraph && view === 'graph';

  // Another dashboard, or another period: drill-down chips and the selection belong to the old one.
  useEffect(() => { setSelected(null); setFilter(null); }, [vm.key]);
  useEffect(() => { setFilter(null); }, [period.key]);

  const toMain = () => window.setTimeout(() => main.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);

  const drill = (d: DrillVM) => {
    if (d.kind === 'route') { navigate(d.to); return; }
    const { kind: _k, ...f } = d;
    setView('table');
    setFilter(f);
    setSelected(f.select ?? null);
    toMain();
  };

  const onPoint = (key: string) => {
    const p = vm.graph?.points.find((x) => x.key === key);
    if (p?.drill) drill(p.drill);
  };

  const openTender = (id: string) => navigate(`/tenders/${encodeURIComponent(id)}`);
  const tracker = !showGraph && selected ? vm.trackerFor(selected) : null;
  const toggle = hasGraph ? <ViewToggle value={showGraph ? 'graph' : 'table'} onChange={setView} /> : null;
  const rows = vm.table.rows;

  return (
    <div className="view db">
      {/* Z1 */}
      <div className="db-z1">
        <div className="db-z1-l">
          {vm.crumbs.length > 0 && (
            <nav className="db-crumbs" aria-label="Breadcrumb">
              <ol>
                {vm.crumbs.map((c, i) => (
                  <li key={i}>{c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
                ))}
              </ol>
            </nav>
          )}
          {/* On someone else's dashboard the sub-line says whose it is (dashboards.md §1 Z1). */}
          <p className="db-sub">{vm.viewerNote ?? (vm.subtitle || subline)}</p>
          {!vm.isHome && (
            <Link className="db-back btn-link" to={`/?period=${period.key}`}><ChevronLeft size={13} aria-hidden />Back to my dashboard</Link>
          )}
        </div>
        <PeriodFilter value={period.key} window={period.window} onChange={period.setPeriod} />
      </div>

      {/* Z2 */}
      <KpiTiles tiles={vm.tiles} onDrill={drill} />

      {/* Z3 · Z4 */}
      <div className={`db-mid ${vm.flow ? '' : 'no-flow'}`}>
        {vm.flow && <div className="db-flow"><FlowStrip flow={vm.flow} onDrill={drill} /></div>}
        <div className="db-actions"><ActionList zone={vm.actions} onRoute={navigate} /></div>
      </div>

      {/* Z5: the table stays mounted and sets the box's height; the graph lies over it, so toggling never moves the page. */}
      <section className={`card db-main ${showGraph ? 'on-graph' : ''}`} ref={main} aria-label={showGraph ? 'Graph' : 'Table'}>
        <div className="db-table">
          {rows === null ? (
            <div className="db-nodata">
              {toggle && <div className="tg-bar">{toggle}</div>}
              <EmptyState title="Tender data is not loaded yet." body="The table fills in once the tender lifecycles are loaded." />
            </div>
          ) : (
            <TenderGrid
              kind={vm.table.kind} rows={rows} columns={vm.table.columns} optional={vm.table.optional}
              defaultSort={vm.table.defaultSort} filters={vm.table.filters} statusDefault={vm.table.statusDefault}
              selectedId={vm.table.kind === 'tenders' ? selected : null}
              onSelect={(id) => vm.table.kind === 'tenders' && setSelected(id)}
              onOpen={(id) => vm.table.kind === 'tenders' && openTender(id)}
              externalFilter={filter} onClearExternal={() => setFilter(null)}
              lead={toggle}
            />
          )}
        </div>
        {showGraph && vm.graph && (
          <div className="db-graph">
            <Suspense fallback={<div className="db-box-wait">Loading the graph…</div>}>
              <StageChart vm={vm.graph} onPoint={onPoint} metric={metric} setMetric={setMetric} lead={toggle} />
            </Suspense>
          </div>
        )}
      </section>

      {/* Z6 */}
      {tracker && <TenderTracker vm={tracker} onClose={() => setSelected(null)} onOpen={openTender} />}
    </div>
  );
}
