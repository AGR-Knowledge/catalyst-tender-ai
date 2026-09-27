import { useMemo } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { profileFor, type ProfileVM } from '@/domain/gcc/company';
import { numberText } from '@/domain/gcc/s1/common';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { S1Grid } from '../s1/parts/Grid';

/**
 * Company › Capability profile (catalogue §D, archetype F, read only in the
 * demo): the company's facts, its accounts by financial year, its group
 * entities, the similar-projects register the eligibility check reads, and
 * its sectors and geographies.
 */

type Project = ProfileVM['projects'][number];

export function Profile({ tenant }: { tenant: string }) {
  const p = useMemo(() => profileFor(tenant), [tenant]);

  const columns = useMemo<ColDef<Project>[]>(() => [
    {
      colId: 'title', headerName: 'Project', flex: 1.6, minWidth: 240, valueGetter: (x) => x.data?.title,
      cellRenderer: (x: ICellRendererParams<Project>) => x.data && (
        <span className="s1-two"><span className="s1-main" title={x.data.title}>{x.data.title}</span><span className="s1-sub" title={x.data.scope}>{x.data.scope}</span></span>
      ),
    },
    {
      colId: 'client', headerName: 'Client', flex: 1, minWidth: 170, valueGetter: (x) => x.data?.client,
      cellRenderer: (x: ICellRendererParams<Project>) => x.data && (
        <span className="s1-two"><span className="co-clip" title={x.data.client}>{x.data.client}</span><span className="s1-sub">{x.data.country}</span></span>
      ),
    },
    { colId: 'value', headerName: 'Value', width: 120, valueGetter: (x) => x.data?.value.amount, cellRenderer: (x: ICellRendererParams<Project>) => x.data && <Money value={x.data.value} /> },
    { colId: 'completed', headerName: 'Completed', width: 140, valueGetter: (x) => x.data?.completed, cellRenderer: (x: ICellRendererParams<Project>) => x.data && <When date={x.data.completed} /> },
    {
      colId: 'role', headerName: 'Role', width: 160, valueGetter: (x) => x.data?.role,
      cellRenderer: (x: ICellRendererParams<Project>) => x.data && (
        <span className="s1-two"><span>{x.data.role}</span>{(x.data.holder || x.data.capacityM3d) && <span className="s1-sub">{x.data.holder ?? `${numberText(x.data.capacityM3d!)} m³/day`}</span>}</span>
      ),
    },
  ], []);

  return (
    <>
      <div className="s1-cols co-profile-cols">
        <Card>
          <CardHead title="Company" meta={<span className="tk-sub">Read only in the demo</span>} />
          <div className="s1-pad">
            <div className="s1-kv">
              <KV k="Name" v={p.name} />
              <KV k="Head office" v={p.hq} />
              <KV k="Employees" v={<span className="num">{numberText(p.employees)}</span>} />
              <KV k="Financial year ends" v={p.fyEnd} />
            </div>
            <h3 className="s1-h3">Sectors</h3>
            <ul className="co-chips" aria-label="Sectors">{p.sectors.map((s) => <li key={s} className="pill">{s}</li>)}</ul>
            <h3 className="s1-h3">Geographies</h3>
            <ul className="co-chips" aria-label="Geographies">{p.geographies.map((g) => <li key={g} className="pill">{g}</li>)}</ul>
            <p className="s1-note">Geographies are where the company is registered or has delivered a project on record.</p>
          </div>
        </Card>
        <Card>
          <CardHead title="Accounts by financial year" />
          <div className="co-table-wrap">
            <table className="co-table">
              <thead>
                <tr><th scope="col">Year</th><th scope="col" className="r">Turnover</th><th scope="col" className="r">Net worth</th><th scope="col" className="r">Current ratio</th><th scope="col">Audit</th></tr>
              </thead>
              <tbody>
                {p.financials.map((f) => (
                  <tr key={f.fy}>
                    <th scope="row" className="num">FY{f.fy}</th>
                    <td className="r"><Money value={f.turnover} /></td>
                    <td className="r">{f.netWorth ? <Money value={f.netWorth} /> : <span className="tk-sub">Not stated</span>}</td>
                    <td className="r num">{f.currentRatio !== undefined ? f.currentRatio.toFixed(2) : <span className="tk-sub">Not stated</span>}</td>
                    <td className="co-wrap">{f.audited ? 'Audited' : f.auditDate ? <>Draft; audit due <When date={f.auditDate} short /></> : 'Not audited'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.entities.length > 0 && (
            <>
              <h3 className="s1-h3 co-pad-x">Group entities</h3>
              <ul className="co-list">
                {p.entities.map((e) => (
                  <li key={e.id}>
                    <span className="co-list-t">{e.name}</span>
                    <span className="co-list-m">{e.country}{e.latest ? <> · FY{e.latest.fy} turnover <Money value={e.latest.turnover} /></> : null}</span>
                    <span className="co-list-d">{e.note}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
      <Card>
        <CardHead title="Similar projects" meta={<span className="num">{p.projects.length} on record</span>} />
        <p className="s1-lede">The register eligibility checks read for experience lines. Most recent first.</p>
        <S1Grid rows={p.projects} columns={columns} label="Similar projects" rowHeight={52} />
      </Card>
    </>
  );
}
