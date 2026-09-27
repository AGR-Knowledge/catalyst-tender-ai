import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDemo } from '@/state/store';
import { useTenants } from '@/domain/tenants';
import { compareHero, compareSubject, type CompareColumn, type CompareLine } from '@/domain/gcc/demo/compare';
import { Card, CardFoot, CardHead, tc } from '@/components/ui/primitives';
import { DemoTag } from '@/components/tender/DemoTag';
import { TenantMark } from '@/components/layout/TenantSwitch';
import './compare.css';

/**
 * `/demo/compare` (plan 014 Phase 5, spec §11, script D): the hero tender in
 * the five companies, side by side, each column read with that company's own
 * demo state. A labelled demo view: in the product nobody sees across
 * tenants. A column opens the hero in that company.
 */

const STATE_WORD: Record<CompareLine['state'], string> = { fail: 'Fail', 'at-risk': 'At risk', interpretation: 'Interpretation', pass: 'Pass', na: 'Not applicable' };
const STATE_TONE: Record<CompareLine['state'], string> = { fail: 'red', 'at-risk': 'orange', interpretation: 'orange', pass: 'green', na: 'muted' };

interface Row { key: string; label: string; cell: (c: CompareColumn) => ReactNode }

const ROWS: Row[] = [
  {
    key: 'rec', label: 'Agent recommendation',
    cell: (c) => (
      <>
        <span className={`cmp-verdict ${tc(c.recommendation.tone)}`}>{c.recommendation.label}</span>
        {c.recommendation.why && <span className="cmp-sub">{c.recommendation.why}</span>}
      </>
    ),
  },
  {
    key: 'fit', label: 'Fit score',
    cell: (c) => (
      <>
        <span className="cmp-big"><span className={`num ${tc(c.fit.tone)}`}>{c.fit.score}</span><span className="cmp-of"> of 100</span></span>
        <span className="cmp-sub">{c.fit.band[0].toUpperCase() + c.fit.band.slice(1)}. {c.fit.thresholds}.</span>
        {c.fit.capped && <span className="cmp-sub cmp-cap">{c.fit.capped}.</span>}
      </>
    ),
  },
  {
    key: 'elig', label: 'Eligibility',
    cell: (c) => <span className={tc(c.eligibility.tone)}>{c.eligibility.text[0].toUpperCase() + c.eligibility.text.slice(1)}</span>,
  },
  {
    key: 'lines', label: 'Lines to watch',
    cell: (c) => (c.eligibility.lines.length === 0 ? <span className="t-muted">None: every PQ line passes</span> : (
      <ul className="cmp-lines">
        {c.eligibility.lines.map((l) => (
          <li key={l.reqId}>
            <span className="mono">{l.reqId}</span> <span className={`cmp-state t-${STATE_TONE[l.state]}`}>{STATE_WORD[l.state]}</span>
            <span className="cmp-why" title={l.why}>{l.why}</span>
          </li>
        ))}
        {c.eligibility.more > 0 && <li className="t-muted">and {c.eligibility.more} more</li>}
      </ul>
    )),
  },
  {
    key: 'bond', label: 'Initial guarantee against facility headroom',
    cell: (c) => (!c.guarantee ? <span className="t-muted">No bid bond stated</span> : (
      <>
        <span className="cmp-big num">{c.guarantee.bond}</span>
        <span className="cmp-sub">{c.guarantee.text}</span>
        <span className="cmp-sub">Headroom {c.guarantee.headroom}; {c.guarantee.after} after the bond</span>
        {c.guarantee.tight && <span className="cmp-sub t-orange">Too tight for the guarantees on award: Finance must confirm the facility</span>}
      </>
    )),
  },
  {
    key: 'team', label: 'Team load',
    cell: (c) => (!c.team ? <span className="t-muted">No effort estimate</span> : (
      <>
        <span>{c.team.name}</span>
        <span className={`cmp-sub ${tc(c.team.tone)}`}>{c.team.text}</span>
      </>
    )),
  },
  {
    key: 'dg1', label: 'DG1 decision',
    cell: (c) => (!c.decision ? <span className="t-muted">Not recorded yet</span> : (
      <>
        <span className={`cmp-verdict ${tc(c.decision.tone)}`}>{c.decision.label}</span>
        <span className="cmp-sub">{c.decision.by}, {c.decision.at}</span>
        {c.decision.note && <span className="cmp-sub">{c.decision.note}</span>}
      </>
    )),
  },
];

export default function Compare() {
  const { state, setTenant } = useDemo();
  const navigate = useNavigate();
  const tenants = useTenants();
  const cols = useMemo(() => compareHero({ doneBy: state.doneBy }), [state.doneBy]);
  const subject = compareSubject();

  const openIn = (key: string) => {
    setTenant(key);
    navigate(`/tenders/${encodeURIComponent(subject?.id ?? '')}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="view cmp-page">
      <Card>
        <CardHead title={<><DemoTag title="A presenter view: in the product nobody sees across companies" />Demo view: the same tender in five companies</>} />
        <p className="cmp-intro">
          {subject && <><span className="mono">{subject.id}</span> · {subject.title} · {subject.issuer}. </>}
          Each column is that company’s own reading, with its credentials, fit weights, bank facility and team load. In the product each company sees only its own.
        </p>
        <div className="cmp-scroll" role="region" aria-label="The hero tender in each company" tabIndex={0}>
          <table className="cmp-grid">
            <thead>
              <tr>
                <th scope="col" className="cmp-rowh"><span className="sr-only">Reading</span></th>
                {cols.map((c) => {
                  const t = tenants.find((x) => x.key === c.tenant);
                  if (!t) return <th key={c.tenant} scope="col">{c.tenant}</th>;
                  const here = c.tenant === state.tenant;
                  return (
                    <th key={c.tenant} scope="col" className={here ? 'here' : ''}>
                      <button type="button" className="cmp-co" onClick={() => openIn(c.tenant)} aria-label={`Open ${subject?.id ?? 'the tender'} in ${t.name}`}>
                        <TenantMark t={t} />
                        <span className="cmp-co-t">
                          <span className="cmp-co-n">{t.name}</span>
                          <span className="cmp-co-m">{t.country} · {t.currency}{here ? ' · you are here' : ''}</span>
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="cmp-rowh">{r.label}</th>
                  {cols.map((c) => <td key={c.tenant} className={c.tenant === state.tenant ? 'here' : ''}><div className="cmp-cell">{r.cell(c)}</div></td>)}
                </tr>
              ))}
              <tr className="cmp-open">
                <th scope="row" className="cmp-rowh"><span className="sr-only">Open</span></th>
                {cols.map((c) => (
                  <td key={c.tenant} className={c.tenant === state.tenant ? 'here' : ''}>
                    <button type="button" className="btn btn-sm" onClick={() => openIn(c.tenant)}>
                      Open here <ArrowRight size={12} aria-hidden />
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <CardFoot>Opening a column switches company (a demo control) and opens the tender there. Every value is a recommendation or a reading, not a decision.</CardFoot>
      </Card>
    </div>
  );
}
