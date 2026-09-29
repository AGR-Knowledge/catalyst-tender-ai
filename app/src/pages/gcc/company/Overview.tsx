import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { money } from '@/domain/money';
import type { Vault } from '@/domain/gcc/company';
import { overviewFor, type KeyFiguresVM, type OverviewVM, type RecordRowVM } from '@/domain/gcc/company/overview';
import { dayMonth, dayMonthYear, numberText, plural } from '@/domain/gcc/s1/common';
import type { TileVM } from '@/domain/gcc/viewmodels';
import type { KpiCtx } from '@/domain/gcc/kpi';
import { Card, CardHead } from '@/components/ui/primitives';
import { StatusPill } from '@/components/tender/StatusPill';
import { Money } from '@/components/tender/Money';
import { EmptyState } from '@/components/tender/EmptyState';
import { LINE_STATE } from '@/components/tender/EligibilityLine';
import type { S1 } from '../s1/vm/useS1';
import { kpiCtxOf, valueTile } from '../s1/vm/tiles';
import { Strip } from '../s1/parts/Strip';

/**
 * Company profile › Overview (plan 027c): who the company is as a bidder. The
 * identity card with its registrations, six key figures, then two rows of
 * cards that share width and height (plan 032): the project record beside the
 * bid record's last 12 months, and turnover by year beside where the
 * eligibility checks read this profile on the viewer's live tenders. Every
 * figure comes from `overviewFor`, which composes what the other tabs read;
 * each tile opens the tab behind it.
 */

const HERE = '/company';
const tab = (id: string) => `${HERE}?tab=${id}`;
const m = (v: { amount: number; ccy: Parameters<typeof money>[1] }) => money(v.amount, v.ccy);
/** "Water tendering team" → "Water team", as CAP-1 shortens it. */
const teamShort = (name: string) => name.replace(/ tendering team$/i, ' team');

function tilesOf(f: KeyFiguresVM, ctx: KpiCtx): TileVM[] {
  const out: TileVM[] = [];
  const t = f.turnover;
  if (t) {
    const state = t.audited ? 'audited' : 'draft';
    out.push(valueTile('company.turnover', 'Turnover, latest year', m(t.value), {
      kind: 'state', means: 'Turnover in the latest financial year on record. Turnover lines on a tender read these accounts, audited or in draft.',
      counted: 'The latest financial year in the company’s accounts. A year reads as a draft until its audit is signed.', target: 'None (information)', source: 'Company accounts',
    }, ctx, {
      sub: `FY${t.fy} ${state} accounts${t.auditDate && !t.audited ? `, audit due ${dayMonth(t.auditDate)}` : ''}${t.previous ? ` · FY${t.previous.fy} ${m(t.previous.value)}` : ''}`,
      detail: `FY${t.fy}, ${state} accounts`,
      // The reference value holds 20 characters, so the year stays in the full sentence: "Previous · SAR 1.52 bn".
      ...(t.previous ? { ref: { k: 'Previous', v: m(t.previous.value) } } : {}),
      drill: { kind: 'route', to: tab('financials'), label: 'Open Financials' },
    }));
  }
  const n = f.netWorth;
  if (n) {
    out.push(valueTile('company.net-worth', 'Net worth', m(n.value), {
      kind: 'state', means: 'Net worth in the latest year the accounts state it. Tenders with a financial-ratio line read it.',
      counted: 'Net worth as stated in the company’s accounts, latest year first.', target: 'None (information)', source: 'Company accounts',
    }, ctx, {
      sub: `FY${n.fy} ${n.audited ? 'audited' : 'draft'} accounts${n.currentRatio !== undefined ? ` · current ratio ${n.currentRatio.toFixed(2)}` : ''}`,
      detail: n.currentRatio !== undefined ? `Current ratio ${n.currentRatio.toFixed(2)}` : `${n.audited ? 'Audited' : 'Draft'} accounts`,
      ref: { k: 'Latest', v: `FY${n.fy}, ${n.audited ? 'audited' : 'draft'}` },
      drill: { kind: 'route', to: tab('financials'), label: 'Open Financials' },
    }));
  }
  const p = f.projects;
  const span = p.firstYear && p.lastYear ? (p.firstYear === p.lastYear ? p.firstYear : `${p.firstYear}–${p.lastYear}`) : null;
  out.push(valueTile('company.projects', 'Similar projects', String(p.count), {
    kind: 'state', means: 'Completed projects on the register. Experience lines on a tender are checked against them.',
    counted: 'Projects in the similar-projects register, whoever in the group delivered them.', target: 'None (information)', source: 'Similar-projects register',
  }, ctx, {
    sub: `${plural(p.count, 'project')} on record${span ? `, completed ${span}` : ''}${p.largest ? ` · largest ${m(p.largest.value)} (${p.largest.title})` : ''}`,
    detail: span ? `Completed ${span}` : 'None on record',
    ...(p.largest ? { ref: { k: 'Largest', v: m(p.largest.value) } } : {}),
    drill: { kind: 'route', to: tab('projects'), label: 'Open Projects' },
  }));
  const c = f.credentials;
  const risk = c.atRisk + c.expired;
  const parts = [c.atRisk ? `${c.atRisk} at risk` : null, c.expired ? `${c.expired} expired` : null, `${c.valid} valid`].filter(Boolean);
  out.push(valueTile('company.credentials', 'Credentials held', String(c.held), {
    kind: 'state', means: 'Certificates, registrations and memberships in the credentials vault. At risk means one expires before a live bid needs it.',
    counted: 'Every credential in the vault, after any renewal recorded. At risk and expired are the vault’s own states.', target: 'None at risk', source: 'Credentials vault',
  }, ctx, {
    sub: `${parts.join(', ')}${c.next ? ` · next expiry ${c.next.text}` : ''}`,
    detail: risk ? parts.join(' · ') : `All ${c.held} valid`,
    // The date only: a credential's name can run past the reference line's 20 characters; the sentence names it.
    ...(c.next ? { ref: { k: 'Next expiry', v: dayMonth(c.next.validTo) } } : {}),
    ...(risk ? { tone: c.expired ? 'red' as const : 'orange' as const, status: c.expired ? 'Renew now' : 'Renew soon' } : {}),
    drill: { kind: 'route', to: c.atRisk ? `${tab('credentials')}&bids=affects` : tab('credentials'), label: 'Open Credentials' },
  }));
  const fa = f.facility;
  out.push(valueTile('company.facility', 'Facility headroom', m(fa.headroom), {
    kind: 'state', means: 'What is left of the bank guarantee facility after the bonds on contracts and those held for live bids. The DG1 pack and the Bid / No-Bid pack quote the same figure.',
    counted: 'Facility limit − utilised on contracts − committed for live bids and awards, as Finance last confirmed it.', target: 'None (information)', source: 'Finance: bank guarantee facility',
  }, ctx, {
    sub: `${m(fa.headroom)} left of ${m(fa.limit)} · ${fa.usedPct}% in use · as of ${dayMonth(fa.asOf)}`,
    detail: `${fa.usedPct}% of the limit in use`,
    ref: { k: 'Cap', v: m(fa.limit) },
    drill: { kind: 'route', to: tab('financials'), label: 'Open Financials' },
  }));
  const l = f.load;
  if (l) {
    out.push(valueTile('company.load', 'Bid-team load', `${l.pct}%`, {
      kind: 'state', means: 'Committed bid-team hours in the next four weeks against the hours available, for the busiest team.',
      counted: 'The busiest team’s committed hours for its live bids over the next four weeks ÷ its people’s hours in the same weeks. The peak is its busiest month over its bids.', target: 'None (information)', source: 'Team rosters and bid effort estimates',
    }, ctx, {
      sub: `${teamShort(l.team)}, ${l.windowLabel} · peak ${l.peak.pct}% in ${l.peak.month}`,
      // The first wording that fits the one-line detail (about 24 characters), as Bid-team load (CAP-1) does on the home.
      detail: [`${teamShort(l.team)}, next ${plural(l.weeks, 'week')}`, `${teamShort(l.team)}, ${plural(l.weeks, 'week')}`].find((x) => x.length <= 24) ?? teamShort(l.team),
      ref: { k: 'Peak', v: `${l.peak.pct}% in ${l.peak.month}` },
      drill: { kind: 'route', to: tab('teams'), label: 'Open Teams and partners' },
    }));
  }
  return out;
}

function IdentityCard({ vm }: { vm: OverviewVM }) {
  const i = vm.identity;
  return (
    <Card className="co-id">
      <div className="co-id-top">
        <span className={`tn-mark co-mark accent-${i.accent}`} aria-hidden>{i.monogram}</span>
        <div className="co-id-name">
          <h2>{i.name}</h2>
          <p>
            {i.hq} · <span className="num">{numberText(i.employees)}</span> employees · financial year ends {i.fyEnd}
          </p>
        </div>
      </div>
      <div className="co-id-tags">
        <div className="co-id-group">
          <span className="co-id-k">Sectors</span>
          <ul className="co-chips" aria-label="Sectors">{i.sectors.map((s) => <li key={s} className="pill">{s}</li>)}</ul>
        </div>
        <div className="co-id-group">
          <span className="co-id-k">Geographies</span>
          <ul className="co-chips" aria-label="Geographies">{i.geographies.map((g) => <li key={g} className="pill">{g}</li>)}</ul>
        </div>
      </div>
      <h3 className="s1-h3 co-pad-x">Registrations</h3>
      {vm.registrations.length ? (
        <ul className="co-regs">
          {vm.registrations.map((r) => (
            <li key={r.id}>
              <Link className="co-reg-t" to={`${tab('credentials')}&cred=${encodeURIComponent(r.id)}`}>{r.label}</Link>
              <span className="co-reg-m">{r.issuer}{r.holder ? ` · ${r.holder}` : ''}</span>
              <StatusPill label={r.pill.label} tone={r.pill.tone} icon={r.pill.icon} />
            </li>
          ))}
        </ul>
      ) : <p className="s1-muted co-pad-x">No registration certificate is in the vault.</p>}
    </Card>
  );
}

function TurnoverCard({ vm, onTab }: { vm: OverviewVM; onTab(id: string): void }) {
  const stated = vm.turnover.filter((t) => t.netWorth || t.currentRatio !== undefined);
  return (
    <Card className="co-turn">
      <CardHead title="Turnover by year" meta={<button type="button" className="btn btn-sm btn-ghost" onClick={() => onTab('financials')}>Financials<ArrowRight size={12} aria-hidden /></button>} />
      <div className="eq-scroll">
      <ul className="co-bars" aria-label="Turnover by financial year">
        {vm.turnover.map((t) => {
          const draft = !t.audited;
          return (
            <li key={t.fy} className={draft ? 'draft' : ''} aria-label={`FY${t.fy}: ${m(t.value)}${draft ? `, draft${t.auditDate ? `, audit due ${dayMonth(t.auditDate)}` : ''}` : ', audited'}`}>
              <span className="co-bar-v num">{m(t.value)}</span>
              <span className="co-bar-col"><span className="co-bar" style={{ height: `${Math.max(4, t.pct)}%` }} /></span>
              <span className="co-bar-y num">FY{t.fy}</span>
              <span className="co-bar-n">{draft ? (t.auditDate ? `Draft, audit due ${dayMonth(t.auditDate)}` : 'Draft') : 'Audited'}</span>
            </li>
          );
        })}
      </ul>
      {stated.length > 0 && (
        <p className="s1-foot">
          {stated.map((t, i) => (
            <span key={t.fy}>
              {i > 0 && ' · '}FY{t.fy}: {t.netWorth && <>net worth <Money value={t.netWorth} /></>}{t.netWorth && t.currentRatio !== undefined && ', '}
              {t.currentRatio !== undefined && <>current ratio <span className="num">{t.currentRatio.toFixed(2)}</span></>}
            </span>
          ))}
          . Other years state turnover only.
        </p>
      )}
      </div>
    </Card>
  );
}

function BarList({ title, rows }: { title: string; rows: RecordRowVM[] }) {
  return (
    <div className="co-rl">
      <h3 className="s1-h3">{title}</h3>
      <ul aria-label={title}>
        {rows.map((r) => (
          <li key={r.key} className={r.count ? '' : 'zero'}>
            <span className="co-rl-l">{r.label}</span>
            <span className="co-rl-bar" aria-hidden><span style={{ width: `${r.count ? Math.max(3, r.pct) : 0}%` }} /></span>
            <span className="co-rl-n num">{r.count}</span>
            <span className="co-rl-v">{r.count ? <Money value={r.value} /> : <span className="tk-sub">None</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecordCard({ vm, onTab }: { vm: OverviewVM; onTab(id: string): void }) {
  const r = vm.record;
  return (
    <Card className="co-rec">
      <CardHead title="Project record" meta={<span className="num">{plural(r.total, 'project')}</span>} />
      {r.total ? (
        <>
          <div className="eq-scroll">
          <div className="co-rec-lists">
            <BarList title="By country" rows={r.byCountry} />
            <BarList title="By role" rows={r.byRole} />
          </div>
          <h3 className="s1-h3 co-pad-x">Most recent</h3>
          <ul className="co-recent">
            {r.recent.map((p) => (
              <li key={p.id}>
                <Link className="co-recent-t" to={`${tab('projects')}&project=${encodeURIComponent(p.id)}`}>{p.title}</Link>
                <span className="co-recent-m">{p.client}</span>
                <span className="co-recent-f"><Money value={p.value} /> · completed {dayMonthYear(p.completed)}</span>
              </li>
            ))}
          </ul>
          </div>
          <div className="co-rec-foot">
            <button type="button" className="btn btn-sm" onClick={() => onTab('projects')}>See all {plural(r.total, 'project')}<ArrowRight size={12} aria-hidden /></button>
          </div>
        </>
      ) : <div className="eq-scroll"><EmptyState title="No projects on record." body="Experience lines on a tender are checked against the similar-projects register." compact /></div>}
    </Card>
  );
}

/** The bid record's last 12 months (plan 032): six figures and the largest win, then the tab. */
function BidCard({ vm, onTab }: { vm: OverviewVM; onTab(id: string): void }) {
  const b = vm.bids;
  const rate = b.winRatePct === null ? 'No results' : b.small ? `${b.winRatePct}% (n = ${b.n})` : `${b.winRatePct}%`;
  const figure = (v: ReactNode, k: string) => <li><span className="co-bs-v num">{v}</span><span className="co-bs-k">{k}</span></li>;
  return (
    <Card className="co-bids">
      <CardHead title="Bid record" meta={<span className="tk-sub">Last 12 months</span>} />
      <div className="eq-scroll">
        {b.submitted || b.n || b.declined ? (
          <>
            <ul className="co-bs" aria-label="Bid record, last 12 months">
              {figure(b.submitted, 'Bids submitted')}
              {figure(b.won, 'Won')}
              {figure(b.lost, 'Lost')}
              {figure(rate, 'Win rate')}
              {figure(<Money value={b.valueWon} />, 'Value won')}
              {figure(b.declined, 'Chose not to bid')}
            </ul>
            {b.largestWin && (
              <div className="co-bs-win">
                <span className="co-bs-k">Largest win</span>
                <Link to={`/tenders/${encodeURIComponent(b.largestWin.id)}`}>{b.largestWin.title}</Link>
                <span className="co-bs-m"><span className="mono">{b.largestWin.id}</span> · <Money value={b.largestWin.value} /></span>
              </div>
            )}
            {b.partial && <p className="co-bs-note">Counts only the tenders shared with you.</p>}
          </>
        ) : <EmptyState title="No bid submitted or decided in the last 12 months." body="Bids, results and the decisions not to bid read here once there are any." compact />}
      </div>
      <div className="co-rec-foot">
        <button type="button" className="btn btn-sm" onClick={() => onTab('record')}>Bid record<ArrowRight size={12} aria-hidden /></button>
      </div>
    </Card>
  );
}

function UsageCard({ vm }: { vm: OverviewVM }) {
  const u = vm.usage;
  return (
    <Card className="co-use">
      <CardHead title="Where this profile is used" meta={<span className="tk-sub">Live tenders you can open</span>} />
      <div className="eq-scroll">
      <p className="s1-lede">The Intake &amp; Extraction agent checks each tender’s requirements against this profile: the credentials, the project record and the accounts. It recommends; the Bid Manager decides at DG1.</p>
      {u.tenders ? (
        <>
          <ul className="co-use-stats">
            <li><span className="num">{u.tenders}</span> {u.tenders === 1 ? 'tender' : 'tenders'} with an eligibility check</li>
            <li><span className="num">{u.meetAll}</span> {u.meetAll === 1 ? 'meets' : 'meet'} every line</li>
            <li><span className="num">{u.gaps}</span> {u.gaps === 1 ? 'has a gap' : 'have a gap'}</li>
            {u.reading > 0 && <li><span className="num">{u.reading}</span> {u.reading === 1 ? 'waits' : 'wait'} on a reading of the tender</li>}
          </ul>
          {u.top.length ? (
            <ul className="co-gaps">
              {u.top.map((g) => (
                <li key={g.tenderId}>
                  <StatusPill label={LINE_STATE[g.state].label} tone={LINE_STATE[g.state].tone} icon={LINE_STATE[g.state].icon} />
                  <Link to={`/tenders/${encodeURIComponent(g.tenderId)}?tab=eligibility`} className="co-gap-t"><span className="mono">{g.tenderId}</span> · {g.shortTitle}</Link>
                  <span className="co-gap-x" title={g.text}>{g.text}{g.more > 0 ? <span className="co-more"> and {plural(g.more, 'more line')}</span> : null}</span>
                </li>
              ))}
            </ul>
          ) : <p className="s1-muted co-pad-x co-pad-b">Every line is met on each of them.</p>}
        </>
      ) : <EmptyState title="No live tender you can open has an eligibility check yet." body="Once a tender’s requirements are read at intake, it is checked against this profile." compact />}
      </div>
    </Card>
  );
}

export function Overview({ s1, vault, onTab }: { s1: S1; vault: Vault; onTab(id: string): void }) {
  const { tenant, viewer, viewAs, done } = s1;
  const vm = useMemo(() => overviewFor(tenant, done, viewer, vault), [tenant, done, viewer, vault]);
  const tiles = useMemo(() => tilesOf(vm.figures, kpiCtxOf({ tenant, viewer, viewAs, done }, '30d', 'company')), [vm, tenant, viewer, viewAs, done]);
  return (
    <>
      <IdentityCard vm={vm} />
      <Strip tiles={tiles} />
      <div className="eq-row">
        <RecordCard vm={vm} onTab={onTab} />
        <BidCard vm={vm} onTab={onTab} />
      </div>
      <div className="eq-row">
        <TurnoverCard vm={vm} onTab={onTab} />
        <UsageCard vm={vm} />
      </div>
    </>
  );
}
