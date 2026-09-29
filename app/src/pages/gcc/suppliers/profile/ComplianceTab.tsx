import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card, CardHead } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { RESCREEN_DAYS } from '@/domain/gcc/suppliers/profile';
import { RENEW_SOON_DAYS } from '@/domain/gcc/suppliers/detail';
import { plural } from '@/domain/gcc/s1/common';
import { Scroll, dmy, type TabProps } from './parts';

const CHECK_WORD = {
  clear: { label: 'Clear', tone: 'green' }, match: { label: 'Match', tone: 'red' }, flag: { label: 'Flagged', tone: 'red' }, due: { label: 'Due', tone: 'orange' },
} as const;

/**
 * Compliance (plan 031 step 4.5). A blocked supplier's block leads the whole
 * page, above the tiles (shown once, so not again here). Then the screening checks with their last three cycles beside the
 * certificates (one `.eq-row`); then the approved-vendor lists and the
 * shortlist places screening holds (the sheet's content).
 */
export function ComplianceTab({ d }: TabProps) {
  const sh = d.sheet;
  const s = d.row.s;
  return (
    <>
      <div className="eq-row">
        <Card>
          <CardHead title="Screening" meta={<span className="tk-sub">The last three cycles</span>} />
          <Scroll pad={false}>
            <div className="spf-table-wrap">
              <table className="spf-table">
                <caption className="sr-only">Sanctions and anti-bribery screening, the last three cycles</caption>
                <thead><tr><th scope="col">Cycle</th><th scope="col">Sanctions</th><th scope="col">Anti-bribery</th></tr></thead>
                <tbody>
                  {d.screening.map((c, i) => (
                    <tr key={`${c.sanctions.at}:${c.antiBribery.at}`}>
                      <th scope="row">{i === 0 ? 'Latest' : i === 1 ? 'Previous' : 'Before that'}</th>
                      <td><span className="spf-check"><StatusPill label={CHECK_WORD[c.sanctions.state].label} tone={CHECK_WORD[c.sanctions.state].tone} /><span className="tk-sub num">{dmy(c.sanctions.at)}</span></span></td>
                      <td><span className="spf-check"><StatusPill label={CHECK_WORD[c.antiBribery.state].label} tone={CHECK_WORD[c.antiBribery.state].tone} /><span className="tk-sub num">{dmy(c.antiBribery.at)}</span></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`s1-note spf-pad-x ${sh.rescreenPassed ? 't-orange' : ''}`}>
              Next re-screen due <b>{dmy(sh.nextRescreen)}</b>{sh.rescreenPassed ? ': it has passed, so no RFQ can be sent until it is re-screened' : ''}. Every {RESCREEN_DAYS} days.
            </p>
          </Scroll>
        </Card>
        <Card>
          <CardHead title="Certificates" meta={<span className="tk-sub">Renew soon is {RENEW_SOON_DAYS} days or less before expiry</span>} />
          <Scroll pad={false}>
            <ul className="spf-rows">
              {d.certificates.map((c) => (
                <li key={c.kind}>
                  <span className="spf-row-t">
                    <span className="spf-row-n">{c.name}</span>
                    <span className="spf-row-m"><span className="mono">{c.no}</span> · {c.issuer} · valid to {dmy(c.validTo)}</span>
                  </span>
                  <StatusPill label={c.label} tone={c.tone} />
                </li>
              ))}
            </ul>
          </Scroll>
        </Card>
      </div>
      <div className="eq-row">
        <Card>
          <CardHead title="Approved-vendor lists" meta={<span className="tk-sub">{plural(s.avl.length, 'client')}</span>} />
          <Scroll>
            {s.avl.length
              ? <ul className="spf-plain">{s.avl.map((a) => <li key={a}>{a}</li>)}</ul>
              : <p className="s1-muted">No client’s approved-vendor list includes it. A package that requires one needs the client’s approval first.</p>}
          </Scroll>
        </Card>
        <Card>
          <CardHead title="Held on approved shortlists" meta={<span className="tk-sub">Places screening holds</span>} />
          <Scroll>
            {sh.held.length ? (
              <ul className="spf-plain">
                {sh.held.map((h) => (
                  <li key={`${h.tenderId}:${h.pkgId}`}>
                    {h.shortTitle !== null
                      ? <Link to={`/tenders/${encodeURIComponent(h.tenderId)}?tab=sourcing`} className="spf-tender"><span className="mono">{h.tenderId}</span> {h.shortTitle} · <span className="mono">{h.pkgId}</span></Link>
                      : <span className="spf-hidden"><Lock size={11} aria-hidden /><span className="mono">{h.tenderId}</span> not shared with you</span>}
                    <span className="spf-sub">{h.reason}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="s1-muted">Not held on any approved shortlist.</p>}
          </Scroll>
        </Card>
      </div>
    </>
  );
}
