import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { EmptyState } from '@/components/tender/EmptyState';
import { RFQ_STATE } from '@/domain/gcc/suppliers/profile';
import { plural } from '@/domain/gcc/s1/common';
import type { JobVM } from '@/domain/gcc/suppliers/detail';
import { Awarded, Scroll, TenderRef, dmy, type TabProps } from './parts';

/**
 * Projects with us (plan 031 step 4.4): the jobs it is doing for the company
 * now, one card each (an `.eq-row` of up to three), then the jobs delivered in
 * the last 12 months (B1: together they are the master's awards), its work on
 * the company's completed projects, and its quotes with us.
 */

function JobCard({ j, by }: { j: JobVM; by: string }) {
  return (
    <Card className="spf-job">
      <CardHead title={<TenderRef id={j.tenderId} title={j.title} />} meta={<StatusPill label={j.status.label} tone={j.status.tone} />} />
      <Scroll>
        <p className="spf-job-p">{j.packageTitle} <span className="tk-sub">· {j.kind === 'supply' ? 'Supply' : 'Subcontract'}</span></p>
        <div className="spf-progress">
          <span className="spf-progress-l">Progress <span className="num">{j.progressPct}%</span></span>
          <span className="spf-bar" aria-hidden><span style={{ width: `${j.progressPct}%` }} /></span>
        </div>
        <div className="s1-kv">
          <KV k="Client" v={j.client ?? 'Not shared with you'} />
          <KV k="Started" v={dmy(j.startedAt)} />
          <KV k="Due" v={dmy(j.dueAt)} />
          <KV k="Awarded value" v={<Awarded v={j.value} by={by} />} />
        </div>
        {j.note && <p className="s1-note">{j.note}</p>}
      </Scroll>
    </Card>
  );
}

export function ProjectsTab({ d }: TabProps) {
  const s = d.row.s;
  const by = d.valuesMaskedBy;
  const cols = Math.min(3, Math.max(1, d.jobsNow.length));
  return (
    <>
      <section className="spf-sec" aria-labelledby="spf-now">
        <div className="spf-sec-h">
          <h2 id="spf-now">Working for us now</h2>
          <span className="tk-sub">On tenders you won, the soonest due first</span>
        </div>
        {d.jobsNow.length ? (
          <div className="eq-row" style={{ '--eq-cols': cols, '--eq-h': '360px' } as CSSProperties}>
            {d.jobsNow.map((j) => <JobCard key={j.id} j={j} by={by} />)}
          </div>
        ) : (
          <Card><EmptyState title="No job for you in progress." body="Awards on tenders you win show here while the supplier works on them." compact /></Card>
        )}
      </section>

      <Card>
        <CardHead title="Delivered for us" meta={<span className="tk-sub">Finished in the last 12 months, on tenders you won</span>} />
        {d.delivered.length ? (
          <div className="spf-table-wrap">
            <table className="spf-table">
              <caption className="sr-only">Jobs delivered in the last 12 months</caption>
              <thead>
                <tr><th scope="col">Project</th><th scope="col">Client</th><th scope="col">Package</th><th scope="col">Awarded</th><th scope="col">Delivered</th><th scope="col">On time</th><th scope="col" className="r">Value</th></tr>
              </thead>
              <tbody>
                {d.delivered.map((j) => (
                  <tr key={j.id}>
                    <th scope="row"><TenderRef id={j.tenderId} title={j.title} /></th>
                    <td className="spf-wrap">{j.client ?? '—'}</td>
                    <td className="spf-wrap">{j.packageTitle}</td>
                    <td className="num">{dmy(j.awardedAt)}</td>
                    <td className="num">{j.deliveredAt ? dmy(j.deliveredAt) : ''}</td>
                    <td><StatusPill label={j.status.label} tone={j.status.tone} /></td>
                    <td className="r"><Awarded v={j.value} by={by} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nothing delivered in the last 12 months." body={d.jobsNow.length ? 'Its awards of the last 12 months are all still in progress.' : 'It has had no award from you in the last 12 months.'} compact />}
      </Card>

      <Card>
        <CardHead title="Completed with us" meta={<span className="tk-sub">On your completed projects</span>} />
        {d.completed.length ? (
          <div className="spf-table-wrap">
            <table className="spf-table">
              <caption className="sr-only">Its work on the company’s completed projects</caption>
              <thead>
                <tr>
                  <th scope="col">Project</th><th scope="col">Client</th><th scope="col">Package</th><th scope="col">Supply or subcontract</th><th scope="col">Completed</th>
                  <th scope="col" className="r">Our rating</th><th scope="col">On time</th><th scope="col" className="r">NCRs</th><th scope="col" className="r">Value</th>
                </tr>
              </thead>
              <tbody>
                {d.completed.map((c) => (
                  <tr key={c.projectId}>
                    <th scope="row" className="spf-wrap"><Link to={`/company?tab=projects&project=${encodeURIComponent(c.projectId)}`} className="spf-tender">{c.title}</Link></th>
                    <td className="spf-wrap">{c.client}</td>
                    <td className="spf-wrap">{c.packageTitle}</td>
                    <td>{c.kind === 'supply' ? 'Supply' : 'Subcontract'}</td>
                    <td className="num">{dmy(c.completed)}</td>
                    <td className="r num">{c.rating} of 5</td>
                    <td><StatusPill label={c.onTime ? 'On time' : 'Late'} tone={c.onTime ? 'green' : 'orange'} /></td>
                    <td className="r num">{c.ncrs}</td>
                    <td className="r"><Awarded v={c.value} by={by} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No work on your completed projects." body="Its record with you starts with the tenders you won in the last 12 months." compact />}
      </Card>

      <Card>
        <CardHead title="Quoted with us" meta={<span className="tk-sub">RFQs open today, and the last 12 months</span>} />
        <div className="spf-pad">
          <div className="s1-kv">
            <KV k="Quotes and awards, 12 months" v={`${plural(s.performance.quotes12m, 'quote')}, ${s.performance.awards12m} awarded`} />
            <KV k="Replies" v={<>Replies to <span className="num">{s.response.ratePct}%</span> of RFQs, in {plural(s.response.avgDays, 'day')} <span className="spf-sub">The supplier master’s figure for 12 months, not a sum of the quarters</span></>} />
          </div>
        </div>
        {d.sheet.rfqs.length ? (
          <ul className="spf-rows">
            {d.sheet.rfqs.map((r) => (
              <li key={r.id}>
                <span className="spf-row-t">
                  {r.shortTitle !== null
                    ? <Link to={`/tenders/${encodeURIComponent(r.tenderId)}?tab=sourcing`} className="spf-tender"><span className="mono">{r.tenderId}</span> {r.shortTitle}</Link>
                    : <span className="spf-hidden"><Lock size={11} aria-hidden /><span className="mono">{r.tenderId}</span> not shared with you</span>}
                  <span className="spf-row-m"><span className="mono">{r.packageId}</span> {r.packageTitle} · sent {dmy(r.sentAt)} · reply by {dmy(r.replyBy)}</span>
                </span>
                <StatusPill label={RFQ_STATE[r.state].label} tone={RFQ_STATE[r.state].tone} />
              </li>
            ))}
          </ul>
        ) : <p className="s1-muted spf-pad">No open RFQs with you.</p>}
      </Card>
    </>
  );
}
