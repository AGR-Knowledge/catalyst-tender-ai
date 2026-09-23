import { useMemo, useState } from 'react';
import { CalendarDays, Columns3, List, Search as SearchIcon } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useLive, type LiveTender } from '@/domain/live';
import { cr, dayMonth } from '@/domain/format';
import { Card, CardFoot, CardHead, Kpis } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { TenderBoard } from '@/components/pipeline/TenderBoard';
import { TenderCalendar } from '@/components/pipeline/TenderCalendar';

type Filter = 'all' | 'gate' | 'soon' | 'low' | 'closed';
type Sort = 'due' | 'value' | 'stage';
type View = 'board' | 'list' | 'calendar';

const VIEW_KEY = 'ctai.pipeline.view';
const readView = (): View => { try { const v = localStorage.getItem(VIEW_KEY); return v === 'list' || v === 'calendar' ? v : 'board'; } catch { return 'board'; } };

const confTone = (t: LiveTender) => (t.confidence === 'high' ? 't-green' : t.confidence === 'medium' ? 't-orange' : 't-red');

export function Pipeline() {
  const { openDrawer } = useDemo();
  const live = useLive();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('due');
  const [q, setQ] = useState('');
  const [view, setViewState] = useState<View>(readView);
  const setView = (v: View) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const open = (t: LiveTender) => openDrawer({ type: 'tender', id: t.id });

  const closed = live.tenders.filter((t) => t.closed);
  const counts: Record<Filter, number> = {
    all: live.active.length,
    gate: live.active.filter((t) => t.gate).length,
    soon: live.dueSoon.length,
    low: live.active.filter((t) => t.confidence === 'low').length,
    closed: closed.length,
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = filter === 'closed' ? closed : live.active;
    return base
      .filter((t) => {
        if (term && !`${t.id} ${t.name} ${t.client} ${t.owner} ${t.sector}`.toLowerCase().includes(term)) return false;
        if (filter === 'gate') return !!t.gate;
        if (filter === 'soon') return live.dueSoon.includes(t);
        if (filter === 'low') return t.confidence === 'low';
        return true;
      })
      .sort((a, b) => (sort === 'due' ? a.days - b.days : sort === 'value' ? b.value - a.value : b.stage - a.stage));
  }, [q, filter, sort, live.active, live.dueSoon, closed]);

  const earliest = [...live.dueSoon].sort((a, b) => a.days - b.days)[0];
  const filters: [Filter, string][] = [['all', 'All'], ['gate', 'At a gate'], ['soon', 'Due in 14 days'], ['low', 'Low confidence']];
  if (closed.length) filters.push(['closed', 'Closed']);

  return (
    <div className="view">
      <Kpis items={[
        { label: 'Active pursuits', value: String(live.active.length), sub: `${cr(live.totalValue)} total, ${cr(Math.round(live.weightedValue))} weighted` },
        { label: 'At a gate', value: String(counts.gate), sub: `DG1 ${live.gateCounts.DG1}, DG2 ${live.gateCounts.DG2}, DG3 ${live.gateCounts.DG3}`, tone: 'orange' },
        { label: 'Due in 14 days', value: String(counts.soon), sub: earliest ? `earliest ${earliest.id} on ${dayMonth(earliest.due)}` : 'none due' },
        { label: 'Unassigned', value: String(live.unassigned), sub: 'all pursuits have an owner', tone: 'green' },
      ]} />

      <div className="filters">
        {filters.map(([k, label]) => (
          <button type="button" key={k} className={`filter ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)} aria-pressed={filter === k}>
            {label}<span className="c">{counts[k]}</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <div className="seg" role="group" aria-label="View">
          {([['board', 'Board', Columns3], ['list', 'List', List], ['calendar', 'Calendar', CalendarDays]] as const).map(([k, label, Icon]) => (
            <button type="button" key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)} aria-pressed={view === k}><Icon aria-hidden />{label}</button>
          ))}
        </div>
        <label className="search" style={{ width: 220 }}>
          <SearchIcon aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter the register" aria-label="Filter the register" />
        </label>
        {view === 'list' && <label className="sort">
          <span className="sr-only">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by">
            <option value="due">Sort: due date</option>
            <option value="value">Sort: value</option>
            <option value="stage">Sort: stage</option>
          </select>
        </label>}
      </div>

      {view === 'board' && <TenderBoard rows={rows} onOpen={open} />}
      {view === 'calendar' && <Card><TenderCalendar rows={rows} onOpen={open} /></Card>}
      {view === 'list' && (

      <Card>
        <CardHead title="Tender register" meta={`${rows.length} of ${filter === 'closed' ? closed.length : live.active.length} shown`} />
        <DataTable
          rows={rows}
          rowKey={(t) => t.id}
          onRowClick={open}
          rowLabel={(t) => `Open ${t.id} ${t.name}`}
          dim={(t) => t.closed}
          empty={q ? `No tenders match “${q}”.` : 'No tenders in this view.'}
          columns={[
            { key: 'n', header: 'Tender', width: '2fr', primary: true, render: (t) => (<><span className="cell-main ellipsis">{t.name}</span><span className="cell-sub mono">{t.id}{t.gate && !t.closed ? ` · at ${t.gate}` : ''}{t.closed ? ` · ${t.closedReason}` : ''}</span></>) },
            { key: 'c', header: 'Client', width: '1.1fr', priority: 2, render: (t) => t.client },
            { key: 'v', header: 'Value', width: '.75fr', align: 'right', render: (t) => <span className="num t-ink" style={{ fontSize: 13 }}>{cr(t.value)}</span> },
            { key: 's', header: 'Stage', width: '.6fr', align: 'right', render: (t) => `Stage ${t.stage}` },
            { key: 'o', header: 'Owner', width: '.8fr', align: 'right', priority: 3, render: (t) => <span className="t-ink3">{t.owner}</span> },
            { key: 'd', header: 'Due', width: '.6fr', align: 'right', priority: 2, render: (t) => <span className={`num ${t.held ? 't-red' : ''}`}>{t.held === 'nodate' ? 'No date' : t.held ? `${dayMonth(t.due)} ${t.due.slice(2, 4)}` : dayMonth(t.due)}</span> },
            { key: 'w', header: 'Win prob.', width: '.65fr', align: 'right', render: (t) => <span className={`num ${confTone(t)}`}>{t.win != null ? `${t.win}%` : `${t.fit}% fit`}</span> },
          ]}
        />
        <CardFoot>Win % is shaded by how complete the data behind it is. Stage 1 tenders show fit-score until DG2.</CardFoot>
      </Card>
      )}
    </div>
  );
}
