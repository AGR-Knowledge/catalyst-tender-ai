import { Card, CardHead } from '@/components/ui/primitives';
import { Scroll, dmy, type TabProps } from './parts';

/**
 * Performance (plan 031 step 4.5): the last four quarters as a table beside
 * on-time delivery as blue bars (one `.eq-row`), then the latest evaluation.
 * The quarters carry no RFQ counts (B4): the reply rate is the master's own
 * figure, shown in words so it can't be read as a sum of the rows.
 */
export function PerformanceTab({ d }: TabProps) {
  const t = d.totals;
  const e = d.evaluation;
  const pct = (v: number | null) => (v === null ? '—' : `${v}%`);
  return (
    <>
      <div className="eq-row">
        <Card>
          <CardHead title="Quarter by quarter" meta={<span className="tk-sub">{d.quarters[0].key} to {d.quarters[d.quarters.length - 1].key}</span>} />
          <Scroll pad={false}>
            <div className="spf-table-wrap">
              <table className="spf-table">
                <caption className="sr-only">Quotes, awards, deliveries and NCRs by quarter</caption>
                <thead>
                  <tr>
                    <th scope="col">Quarter</th><th scope="col" className="r">Quotes returned</th><th scope="col" className="r">Awards</th>
                    <th scope="col" className="r">Deliveries</th><th scope="col" className="r">On time</th><th scope="col" className="r">NCRs</th>
                  </tr>
                </thead>
                <tbody>
                  {d.quarters.map((q, i) => (
                    <tr key={q.key}>
                      <th scope="row">{q.key}{i === d.quarters.length - 1 && <span className="spf-sub">To {dmy(q.to)}</span>}</th>
                      <td className="r num">{q.quotes}</td>
                      <td className="r num">{q.awards}</td>
                      <td className="r num">{q.deliveries}</td>
                      <td className="r num">{pct(q.onTimePct)}</td>
                      <td className="r num">{q.ncrs}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Four quarters</th>
                    <td className="r num">{t.quotes}</td>
                    <td className="r num">{t.awards}</td>
                    <td className="r num">{t.deliveries}</td>
                    <td className="r num">{pct(t.onTimePct)}</td>
                    <td className="r num">{t.ncrs}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="s1-note spf-pad-x">On time is weighted by deliveries, including call-offs on earlier orders.</p>
          </Scroll>
        </Card>
        <Card>
          <CardHead title="On-time delivery" meta={<span className="tk-sub">Share of deliveries on time, per quarter</span>} />
          <Scroll>
            <div className="spf-chart" role="img" aria-label={`On-time delivery by quarter: ${d.quarters.map((q) => `${q.key} ${pct(q.onTimePct)}`).join(', ')}`}>
              {d.quarters.map((q) => (
                <div key={q.key} className="spf-col">
                  <span className="spf-col-v num">{pct(q.onTimePct)}</span>
                  <span className="spf-col-track"><span className="spf-col-bar" style={{ height: `${q.onTimePct ?? 0}%` }} /></span>
                  <span className="spf-col-k">{q.key}</span>
                </div>
              ))}
            </div>
            <p className="s1-note">Blue bars: one measure, the share of the quarter’s deliveries made by the promised date. A quarter with no delivery shows a dash.</p>
          </Scroll>
        </Card>
      </div>

      <Card>
        <CardHead title="Latest evaluation" meta={<span className="tk-sub">{dmy(e.at)}, by the {e.byRole}</span>} />
        <div className="spf-pad spf-eval">
          <div className="spf-eval-overall">
            <span className="spf-eval-n num">{e.overall.toFixed(1)}</span>
            <span className="tk-sub">of 5, the mean of five scores</span>
          </div>
          <ul className="spf-scores">
            {e.scores.map((x) => (
              <li key={x.key}>
                <span className="spf-score-l">{x.label}</span>
                <span className="spf-score-track" aria-hidden><span style={{ width: `${(x.score / 5) * 100}%` }} /></span>
                <span className="num">{x.score} of 5</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </>
  );
}
