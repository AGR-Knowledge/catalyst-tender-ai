import { useMemo } from 'react';
import { profileFor } from '@/domain/gcc/company';
import { Card, CardHead } from '@/components/ui/primitives';
import { Money } from '@/components/tender/Money';
import { When } from '@/components/tender/When';
import { Facility } from './Facility';

/**
 * Company profile › Financials (plan 027c, from plan 010's capability profile
 * and bank facility tabs): the accounts by financial year, the group entities,
 * then the bank guarantee facility. One tab, because Finance reads them
 * together. Read only in the demo.
 */
export function Financials({ tenant }: { tenant: string }) {
  const p = useMemo(() => profileFor(tenant), [tenant]);
  return (
    <>
      <Card>
        <CardHead title="Accounts by financial year" meta={<span className="tk-sub">Financial year ends {p.fyEnd}</span>} />
        <p className="s1-lede">Turnover and financial-ratio lines on a tender are checked against these accounts. Read only in the demo.</p>
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
      {/* The facility, under its own card heading ("Bank guarantee facility"). */}
      <Facility tenant={tenant} />
    </>
  );
}
