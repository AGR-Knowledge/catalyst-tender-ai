import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { spanText, teamsFor } from '@/domain/gcc/company';
import { plural } from '@/domain/gcc/s1/common';
import { Card, CardHead, Meter } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import type { S1 } from '../s1/vm/useS1';

/**
 * Company › Teams and partners (read only): each tendering team with its
 * people, its load over the next four weeks (CAP-1's arithmetic) and the bids
 * it carries; then the JV and design partners the eligibility check can try.
 */
export function Teams({ s1 }: { s1: S1 }) {
  const { tenant, done, viewer } = s1;
  const vm = useMemo(() => teamsFor(tenant, done, viewer), [tenant, done, viewer]);

  return (
    <>
      {/* One team fills the row; two or more share width and height, a long one scrolling inside (plan 032). */}
      <div className="eq-row co-teams" style={{ '--eq-cols': Math.max(1, Math.min(vm.teams.length, 3)) } as CSSProperties}>
        {vm.teams.map((t) => (
          <Card key={t.id}>
            <CardHead title={t.name} meta={<span className="tk-sub">{t.sector}</span>} />
            <div className="s1-pad eq-scroll">
              <p className="s1-muted">
                <span className="num">{t.people}</span> people: {plural(t.engineers, 'engineer')}, {plural(t.estimators, 'estimator')} and {plural(t.planners, 'planner')}, <span className="num">{t.capacityHours}</span> hours a week between them.
              </p>
              <div className="co-meter">
                <Meter label={`Load · ${vm.windowLabel}`} value={<span className="num">{t.loadPct}%</span>} pct={t.loadPct} />
              </div>
              <h3 className="s1-h3">Bids it carries</h3>
              {t.commitments.length ? (
                <ul className="co-list tight">
                  {t.commitments.map((c) => (
                    <li key={c.tenderId}>
                      <span className="co-list-t">
                        {c.shortTitle
                          ? <Link to={`/tenders/${encodeURIComponent(c.tenderId)}`}><span className="mono">{c.tenderId}</span> {c.shortTitle}</Link>
                          : <span className="co-bid-hidden"><Lock size={11} aria-hidden /><span className="mono">{c.tenderId}</span> not shared with you</span>}
                      </span>
                      <span className="co-list-m"><span className="num">{c.hoursPerWeek}</span> hours a week · {spanText(c.from, c.to)}{c.note ? ` · ${c.note}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="s1-muted">No bids assigned now.</p>}
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHead title="JV and design partners" meta={<span className="num">{vm.partners.length}</span>} />
        {vm.partners.length ? (
          <ul className="co-list">
            {vm.partners.map((p) => (
              <li key={p.id}>
                <span className="co-list-t">{p.name}</span>
                <span className="co-list-m">{p.country} · {plural(p.credentials, 'credential')} and {plural(p.projects, 'project')} on file</span>
                <span className="co-list-d">{p.note}</span>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No partners on file." body="A partner added here can be tried in the JV scenario on any tender's eligibility check." compact />}
        <p className="s1-foot">The JV scenario on a tender's eligibility check re-runs the lines with one of these partners.</p>
      </Card>
    </>
  );
}
