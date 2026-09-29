import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { EmptyState } from '@/components/tender/EmptyState';
import { FlagLine } from '@/components/tender/FlagLine';
import { plural } from '@/domain/gcc/s1/common';
import { Pair, Scroll, TenderRef, dmy, type TabProps } from './parts';

/**
 * Overview (plan 031 step 4.2): the company's facts beside where it fits on
 * today's live tenders (one `.eq-row`), then what it supplies per trade.
 */
export function OverviewTab({ d }: TabProps) {
  const c = d.company;
  const s = d.row.s;
  return (
    <>
      <div className="eq-row">
        <Card>
          <CardHead title="Company" meta={<span className="tk-sub">As registered</span>} />
          <Scroll>
            <div className="s1-kv">
              <KV k="Legal name" v={c.legalName} />
              <KV k={c.registration.label} v={<span className="mono">{c.registration.no}</span>} />
              <KV k="Established" v={<span className="num">{c.established}</span>} />
              <KV k="Headquarters" v={c.hq} />
              <KV k="Staff" v={<span className="num">{c.staff.toLocaleString('en-GB')}</span>} />
              <KV k="Ownership" v={c.localShare ? <>{c.ownership}<span className="spf-sub">{c.localShare}</span></> : c.ownership} />
              <KV k="ICV score" v={s.icv !== undefined ? <><span className="num">{s.icv}</span> <span className="tk-sub">of 100</span></> : 'No score held'} />
              <KV k="Classification" v={c.classification ?? 'Not graded'} />
              <KV k="Geographies served" v={c.geographies.join(', ')} />
            </div>
          </Scroll>
        </Card>
        <Card>
          <CardHead title="Where it fits now" meta={<span className="tk-sub">{d.fits.length ? `${plural(d.fits.length, 'package')} in its trades on live tenders` : 'Live tenders'}</span>} />
          <Scroll pad={false}>
            {d.fits.length ? (
              <ul className="spf-rows">
                {d.fits.map((f) => (
                  <li key={`${f.tenderId}:${f.pkgId}`}>
                    <span className="spf-row-t">
                      <TenderRef id={f.tenderId} title={f.shortTitle} tab="sourcing" />
                      <span className="spf-row-m"><span className="mono">{f.pkgId}</span> {f.pkgTitle}{f.replyBy ? ` · reply by ${dmy(f.replyBy)}` : ''}</span>
                    </span>
                    <StatusPill label={f.label} tone={f.tone} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No live package in its trades." body="Packages on tenders being sourced now show here, with its place on each shortlist." compact />}
          </Scroll>
        </Card>
      </div>

      <Card>
        <CardHead title="Capabilities" meta={<span className="tk-sub">Per trade it supplies</span>} />
        {(d.summary || (d.risk && !d.block)) && (
          <div className="spf-pad spf-lede">
            {d.summary && <p className="s1-lede spf-summary">{d.summary}</p>}
            {d.risk && !d.block && <FlagLine tone="orange" as="p">{d.risk}</FlagLine>}
          </div>
        )}
        <div className="spf-table-wrap">
          <table className="spf-table">
            <caption className="sr-only">What {s.name} supplies, per trade</caption>
            <thead>
              <tr><th scope="col">Trade</th><th scope="col">Scope</th><th scope="col" className="r">Largest single order</th><th scope="col" className="r">Typical time</th></tr>
            </thead>
            <tbody>
              {d.capabilities.map((x) => (
                <tr key={x.trade}>
                  <th scope="row">{x.trade}</th>
                  <td>{x.kind === 'supply' ? 'Supply' : 'Subcontract'}</td>
                  <td className="r"><Pair v={x.largestOrder} /></td>
                  <td className="r num">{x.kind === 'supply' ? 'Lead time' : 'Mobilises in'} {x.weeks[0]}–{x.weeks[1]} weeks</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
