import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Search } from 'lucide-react';
import { profileFor, type ProjectVM } from '@/domain/gcc/company';
import { usageFor } from '@/domain/gcc/company/overview';
import { dayMonthYear, numberText, plural } from '@/domain/gcc/s1/common';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { Sheet } from '@/components/tender/Sheet';
import { StatusPill } from '@/components/tender/StatusPill';
import { EmptyState } from '@/components/tender/EmptyState';
import { LINE_STATE } from '@/components/tender/EligibilityLine';
import type { S1 } from '../s1/vm/useS1';
import { S1Grid } from '../s1/parts/Grid';

/**
 * Company profile › Projects (plan 027c, from plan 010's capability profile):
 * the similar-projects register the eligibility checks read for experience
 * and O&M lines. Search, chips by country and by role, and a sheet per
 * project with what it counts for and the live tender lines that use it as
 * evidence. The open project is the URL's `project`.
 */

type Uses = ReturnType<typeof usageFor>['evidence'][string];

/** "150,000 m³/day, tertiary" or the measured quantities ("52 m span"). */
function measureText(p: ProjectVM): string | null {
  const parts = [
    p.capacityM3d ? `${numberText(p.capacityM3d)} m³/day${p.tertiary ? ', tertiary treatment' : ''}` : null,
    ...Object.entries(p.measures ?? {}).map(([unit, n]) => `${numberText(n)} ${unit}`),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

function ProjectPanel({ p, company, uses }: { p: ProjectVM; company: string; uses: Uses }) {
  const measure = measureText(p);
  return (
    <div className="s1-sheet co-sheet">
      <div className="s1-sheet-top">
        <span className="s1-act"><StatusPill label={p.role} tone="ink" /><span className="co-kind">{p.country}{p.holder ? ` · ${p.holder}` : ''}</span></span>
      </div>
      <p className="co-why">{p.scope}</p>
      <div className="s1-kv">
        <KV k="Client" v={p.client} />
        <KV k="Country" v={p.country} />
        <KV k="Contract value" v={<Money value={p.value} />} />
        <KV k="Completed" v={<When date={p.completed} />} />
        <KV k="Role" v={p.role} />
        <KV k="Delivered by" v={p.holder ?? company} />
        {measure && <KV k="Capacity or measures" v={measure} />}
        <KV k="Operation and maintenance" v={p.om ? <span className="num">{dayMonthYear(p.om.from)} to {dayMonthYear(p.om.to)}</span> : 'No O&M period on record'} />
        {p.fields && <KV k="Counts for" v={p.fields.join(', ')} />}
      </div>

      <h3 className="s1-h3">Used as evidence on</h3>
      {uses.length ? (
        <ul className="co-bids">
          {uses.map((u) => (
            <li key={`${u.tenderId}:${u.reqId}`} className="co-bid">
              <span className="co-line">
                <StatusPill label={LINE_STATE[u.state].label} tone={LINE_STATE[u.state].tone} icon={LINE_STATE[u.state].icon} />
                <Link to={`/tenders/${encodeURIComponent(u.tenderId)}?tab=eligibility`}><span className="mono">{u.tenderId}</span> {u.shortTitle}</Link>
              </span>
              <span className="co-bid-when"><span className="mono">{u.reqId}</span> · {u.text}</span>
            </li>
          ))}
        </ul>
      ) : <p className="s1-muted">No eligibility line on a live tender you can open uses it now.</p>}
    </div>
  );
}

export function Projects({ s1 }: { s1: S1 }) {
  const { tenant, done, viewer } = s1;
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('');
  const p = useMemo(() => profileFor(tenant), [tenant]);
  const evidence = useMemo(() => usageFor(tenant, done, viewer).evidence, [tenant, done, viewer]);
  const all = p.projects;
  const hasHolders = p.entities.length > 0;

  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => all.filter((x) => (!country || x.country === country) && (!role || x.roleKey === role)
    && (!needle || [x.title, x.client, x.scope, x.country, x.holder].some((v) => v?.toLowerCase().includes(needle)))), [all, country, role, needle]);

  const chips = (key: (x: ProjectVM) => string, label: (x: ProjectVM) => string) => {
    const seen = new Map<string, { label: string; n: number }>();
    for (const x of all) { const k = key(x); seen.set(k, { label: label(x), n: (seen.get(k)?.n ?? 0) + 1 }); }
    return [...seen].map(([value, v]) => ({ value, ...v }));
  };
  const countries = chips((x) => x.country, (x) => x.country);
  const roles = chips((x) => x.roleKey, (x) => x.role);

  const setParam = useCallback((edit: (n: URLSearchParams) => void) => {
    setParams((prev) => { const n = new URLSearchParams(prev); edit(n); return n; }, { replace: true });
  }, [setParams]);
  // The open project is the URL's `project`. A filter that hides it is cleared, so a link always lands on it.
  const openId = params.get('project');
  const index = openId ? rows.findIndex((x) => x.id === openId) : -1;
  useEffect(() => {
    if (!openId || index >= 0 || !all.some((x) => x.id === openId)) return;
    setSearch(''); setCountry(''); setRole('');
  }, [openId, index, all]);

  const columns = useMemo<ColDef<ProjectVM>[]>(() => [
    {
      colId: 'title', headerName: 'Project', flex: 1.6, minWidth: 240, valueGetter: (x) => x.data?.title,
      cellRenderer: (x: ICellRendererParams<ProjectVM>) => x.data && (
        <span className="s1-two"><span className="s1-main" title={x.data.title}>{x.data.title}</span><span className="s1-sub" title={x.data.scope}>{x.data.scope}</span></span>
      ),
    },
    {
      colId: 'client', headerName: 'Client', flex: 1, minWidth: 170, valueGetter: (x) => x.data?.client,
      cellRenderer: (x: ICellRendererParams<ProjectVM>) => x.data && (
        <span className="s1-two"><span className="co-clip" title={x.data.client}>{x.data.client}</span><span className="s1-sub">{x.data.country}</span></span>
      ),
    },
    { colId: 'value', headerName: 'Value', width: 120, valueGetter: (x) => x.data?.value.amount, cellRenderer: (x: ICellRendererParams<ProjectVM>) => x.data && <Money value={x.data.value} /> },
    { colId: 'completed', headerName: 'Completed', width: 140, valueGetter: (x) => x.data?.completed, cellRenderer: (x: ICellRendererParams<ProjectVM>) => x.data && <When date={x.data.completed} /> },
    {
      colId: 'role', headerName: 'Role', width: 160, valueGetter: (x) => x.data?.role,
      cellRenderer: (x: ICellRendererParams<ProjectVM>) => x.data && (
        <span className="s1-two"><span>{x.data.role}</span>{x.data.capacityM3d && <span className="s1-sub">{numberText(x.data.capacityM3d)} m³/day</span>}</span>
      ),
    },
    ...(hasHolders ? [{
      colId: 'holder', headerName: 'Holder', flex: 1, minWidth: 170, valueGetter: (x: { data?: ProjectVM }) => x.data?.holder ?? p.name,
      cellRenderer: (x: ICellRendererParams<ProjectVM>) => x.data && <span className="co-clip" title={x.data.holder ?? p.name}>{x.data.holder ?? p.name}</span>,
    } satisfies ColDef<ProjectVM>] : []),
  ], [hasHolders, p.name]);

  const chipGroup = (label: string, options: { value: string; label: string; n: number }[], value: string, set: (v: string) => void) => (options.length > 1 ? (
    <div className="co-chipset" role="group" aria-label={label}>
      <span className="co-chipset-l">{label}</span>
      <button type="button" className={`co-chip ${value ? '' : 'on'}`} aria-pressed={!value} onClick={() => set('')}>All <span className="num">{all.length}</span></button>
      {options.map((o) => (
        <button key={o.value} type="button" className={`co-chip ${value === o.value ? 'on' : ''}`} aria-pressed={value === o.value} onClick={() => set(value === o.value ? '' : o.value)}>
          {o.label} <span className="num">{o.n}</span>
        </button>
      ))}
    </div>
  ) : null);
  const filtered = !!(needle || country || role);

  return (
    <>
      <Card>
        <CardHead title="Similar projects" meta={<span className="num">{plural(all.length, 'project')} on record</span>} />
        <p className="s1-lede">The register the eligibility checks read for experience and O&amp;M lines. Most recent first. Select a project for what it counts for and where it is used.</p>
        <div className="s1-filters">
          <label className="s1-search">
            <Search size={13} aria-hidden />
            <span className="sr-only">Search projects</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects" />
          </label>
          {chipGroup('Country', countries, country, setCountry)}
          {chipGroup('Role', roles, role, setRole)}
          <span className="s1-count num" aria-live="polite">{rows.length} of {all.length} projects</span>
          {filtered && <button type="button" className="btn btn-sm" onClick={() => { setSearch(''); setCountry(''); setRole(''); }}>Clear</button>}
        </div>
        <div className="co-grid">
          {rows.length
            ? <S1Grid rows={rows} columns={columns} onOpen={(id) => setParam((n) => n.set('project', id))} label="Similar projects" rowHeight={52} />
            : <EmptyState title="No project matches." body="Clear the search or a filter." compact />}
        </div>
        <p className="s1-foot">Projects are added and edited by the Head of Tendering. A new project is read by every eligibility check at once.</p>
      </Card>

      <Sheet
        items={rows.map((x) => ({ id: x.id, title: x.title }))} index={index >= 0 ? index : null}
        onIndex={(i) => setParam((n) => { if (rows[i]) n.set('project', rows[i].id); })} onClose={() => setParam((n) => n.delete('project'))} eyebrow="Similar project"
        returnFocus={(id) => document.querySelector<HTMLElement>(`.co-grid [row-id="${CSS.escape(id)}"] .ag-cell`)}
        render={(id) => { const x = rows.find((r) => r.id === id); return x ? <ProjectPanel p={x} company={p.name} uses={evidence[x.id] ?? []} /> : null; }}
      />
    </>
  );
}
