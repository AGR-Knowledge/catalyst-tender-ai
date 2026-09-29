import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { InfoTip } from '@/components/dashboard/InfoTip';
import { HEALTH_RULE_TEXT } from '@/domain/gcc/suppliers/health';
import { HEALTH_ICON, Pair, Scroll, dmy, type TabProps } from './parts';

/**
 * Financials (plan 031 step 4.3): three financial years, one column each so
 * the seven measures fit half a row, beside the latest interim position (one
 * `.eq-row`), and the health word from one stated rule.
 * Amounts are in the supplier's currency with the company's equivalent;
 * every `supplier.view` holder sees them.
 */
export function FinancialsTab({ d }: TabProps) {
  const h = d.health;
  const years = [...d.accounts].reverse();
  const ccyLine = d.reportedInUsd
    ? `Reported in USD, with the ${d.companyCcy} equivalent at the demo bid rate`
    : d.ccy === d.companyCcy ? `In ${d.ccy}` : `In ${d.ccy}, with the ${d.companyCcy} equivalent at the demo bid rate`;
  return (
    <>
      <div className="spf-health">
        <span className="spf-health-l">Financial health</span>
        <StatusPill label={h.word} tone={h.tone} icon={HEALTH_ICON[h.word]} />
        <span className="tk-sub">FY{h.fy.fy}: current ratio <span className="num">{h.fy.currentRatio.toFixed(2)}</span>, net margin <span className="num">{h.fy.netMarginPct.toFixed(1)}%</span></span>
        <InfoTip info={{
          label: 'How we rate this',
          means: 'How sound the supplier’s finances are, as one word, so a buyer can weigh it before giving it a package.',
          counted: `${HEALTH_RULE_TEXT} Read from its latest financial year.`,
          period: `FY${h.fy.fy} accounts${h.fy.audited ? ', audited' : ', management accounts'}`,
          target: 'Strong or Adequate for a critical package',
          source: 'Supplier accounts',
        }} />
      </div>
      <div className="eq-row">
        <Card>
          <CardHead title="Accounts" meta={<span className="tk-sub">{ccyLine}</span>} />
          <Scroll pad={false}>
            <div className="spf-table-wrap">
              <table className="spf-table spf-accounts">
                <caption className="sr-only">Accounts for the last three financial years, latest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Measure</th>
                    {years.map((a) => (
                      <th key={a.fy} scope="col" className="r">
                        <span className="num">FY{a.fy}</span>
                        <span className="spf-sub">{a.audited ? 'Audited' : a.auditDue ? `Audit due ${dmy(a.auditDue)}` : 'Not audited'}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Revenue</th>
                    {years.map((a) => (
                      <td key={a.fy} className="r">
                        <Pair v={a.revenueVm} />
                        <span className="spf-rev-bar" aria-hidden><span style={{ width: `${a.revenuePct}%` }} /></span>
                      </td>
                    ))}
                  </tr>
                  <tr><th scope="row">Gross margin</th>{years.map((a) => <td key={a.fy} className="r num">{a.grossMarginPct.toFixed(1)}%</td>)}</tr>
                  <tr><th scope="row">Net margin</th>{years.map((a) => <td key={a.fy} className="r num">{a.netMarginPct.toFixed(1)}%</td>)}</tr>
                  <tr><th scope="row">Net worth</th>{years.map((a) => <td key={a.fy} className="r"><Pair v={a.netWorthVm} /></td>)}</tr>
                  <tr><th scope="row">Current ratio</th>{years.map((a) => <td key={a.fy} className="r num">{a.currentRatio.toFixed(2)}</td>)}</tr>
                  <tr><th scope="row">Debt to equity</th>{years.map((a) => <td key={a.fy} className="r num">{a.debtToEquity.toFixed(2)}</td>)}</tr>
                </tbody>
              </table>
            </div>
            <p className="s1-note spf-pad-x">Latest year first. Revenue bars are blue, one measure across the three years; the longest is the largest year.</p>
          </Scroll>
        </Card>
        <Card>
          <CardHead title="Current position" meta={<span className="tk-sub">{d.interim.label}, management accounts</span>} />
          <Scroll>
            <div className="s1-kv">
              <KV k="Revenue to date" v={<Pair v={d.interim.revenueToDate} />} />
              <KV k="Order book" v={<Pair v={d.interim.orderBook} />} />
              <KV k="Bank guarantee capacity" v={<Pair v={d.interim.bgCapacity} />} />
              <KV k="Credit rating (internal)" v={<><span className="num">{d.rating.grade}</span><span className="spf-sub">Set {dmy(d.rating.at)}</span></>} />
              <KV k="Payment terms" v={d.paymentTerms} />
              <KV k="Insurance cover" v={<><Pair v={d.insurance.limit} /><span className="spf-sub">{d.insurance.cover}, {d.insurance.insurer}, to {dmy(d.insurance.validTo)}</span></>} />
            </div>
          </Scroll>
        </Card>
      </div>
    </>
  );
}
