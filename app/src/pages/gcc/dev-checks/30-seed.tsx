import { useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { DEMO_TODAY } from '@/domain/calendar';
import { gccData, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { HERO_BILLS, HERO_ID, HERO_KEY_DATES, HERO_LINES } from '@/data/gcc/hero';
import { HERO_EFFORT_HOURS_PER_WEEK, HERO_EFFORT_WINDOW } from '@/data/gcc/tenants/najd';
import { CRITERIA, type Credential, type GccTender, type Team, type TenantData } from '@/data/gcc/types';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 004: the GCC seed for the active tenant, with raw numbers
 * computed here from the data. This is throwaway arithmetic, not the KPI code
 * (plans 006 and 007 derive the real values). Deleted with GccPending in plan 006.
 */

// ---------------------------------------------------------------------------
// Throwaway arithmetic

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(`${iso.length === 10 ? `${iso}T00:00` : iso}:00Z`);
const minutes = (from: string, to: string) => Math.round((ms(to) - ms(from)) / 60_000);
/** Days of [from, to] (inclusive) that fall in [a, b] (inclusive). */
const overlapDays = (from: string, to: string, a: string, b: string) =>
  Math.max(0, Math.round((Math.min(ms(to), ms(b)) - Math.max(ms(from), ms(a))) / DAY) + 1);

const nearestRank = (xs: number[], p: number) => {
  const s = [...xs].sort((x, y) => x - y);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
};

const weighted = (d: TenantData, t: GccTender) => CRITERIA.reduce((sum, c) => sum + d.fit.weights[c] * t.fit[c].score, 0) / 10;

const headroom = (d: TenantData) => d.facility.limit.amount - d.facility.utilised.amount - d.facility.committed.reduce((s, c) => s + c.amount.amount, 0);

const people = (t: Team) => t.engineers + t.estimators + t.planners;
function load(t: Team, from: string, to: string, extra: Team['commitments'] = []) {
  const days = overlapDays(from, to, from, to);
  const committed = [...t.commitments, ...extra].reduce((s, c) => s + (c.hoursPerWeek * overlapDays(c.from, c.to, from, to)) / 7, 0);
  return committed / ((people(t) * t.hoursPerWeek * days) / 7);
}
const pct = (x: number) => `${Math.round(x * 100)}%`;

const HERO_OPENING = HERO_KEY_DATES.find((k) => k.kind === 'opening')!.date;
const SHORT: Partial<Record<Credential['kind'], string>> = { zakat: 'Zakat', gosi: 'GOSI', saudization: 'Saudization', 'lc-baseline': 'LC baseline', chamber: 'Chamber', cr: 'CR' };
const shortName = (c: Credential) => SHORT[c.kind] ?? c.label;

const opening = (t: GccTender) => (t.keyDates.find((k) => k.kind === 'opening') ?? t.keyDates.find((k) => k.kind === 'submission'))?.date;

/**
 * Certificate lines only (experience, turnover and the like are not checked
 * here): a credential of the same kind and country, in the field and at the
 * grade asked, valid at opening → pass; valid today but not at opening → at
 * risk; none → fail.
 */
function certificateCheck(d: TenantData, t: GccTender) {
  const open = opening(t) ?? DEMO_TODAY;
  const lines = (t.requirements ?? []).filter((r) => r.validAt && r.kind in SHORT_OR_CERT);
  const result = lines.map((r) => {
    const matches = d.credentials.filter((c) =>
      c.kind === r.kind && (!r.country || c.country === r.country)
      && (!r.threshold?.field || c.field === r.threshold.field)
      && (!r.threshold?.grade || (c.grade !== undefined && c.grade <= r.threshold.grade)));
    if (!matches.length) return { id: r.id, state: 'fail' as const };
    if (matches.some((c) => c.validTo === null || c.validTo >= open)) return { id: r.id, state: 'pass' as const };
    return { id: r.id, state: 'at-risk' as const, credential: matches[0] };
  });
  return result;
}
const SHORT_OR_CERT: Record<string, true> = {
  cr: true, zakat: true, gosi: true, chamber: true, classification: true, 'contractors-authority': true, saudization: true, vat: true, iso: true,
};

const LIVE = new Set(['S1', 'S2', 'S3']);

function compute(key: GccTenantKey) {
  const d = gccData(key);
  const hero = d.register.find((t) => t.id === HERO_ID)!;
  const logged = d.intakeToday.filter((e) => e.loggedAt);
  const mins = logged.map((e) => minutes(e.receivedAt, e.loggedAt!));
  const newToday = d.intakeToday.filter((e) => e.disposition !== 'addendum' && e.disposition !== 'duplicate');
  const bySourceKind = newToday.reduce<Record<string, number>>((acc, e) => {
    const kind = d.sources.find((s) => s.id === e.sourceId)?.kind ?? '?';
    const k = kind === 'client-portal' ? 'portals' : kind === 'portal' ? (e.sourceId.startsWith('etimad') ? 'Etimad' : 'portals') : kind === 'mailbox' ? 'email' : kind === 'scan' ? 'scanned' : kind;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const validations = d.register.flatMap((t) => t.validations);
  const oldest = validations.map((v) => v.raisedAt).sort()[0];
  const expiring = d.credentials.filter((c) => c.validTo && c.validTo >= DEMO_TODAY && c.validTo < HERO_OPENING);
  const won = d.history.outcomes.filter((o) => o.result === 'won').length;
  const decided = d.history.outcomes.filter((o) => o.result !== 'withdrawn').length;
  const dg1 = d.history.dg1;
  const dg1Due = d.register.filter((t) => t.stage === 'S1' && !t.dg1 && t.intake.disposition === 'shortlisted');
  const firstSla = dg1Due.map((t) => ms(t.intake.loggedAt!) + DAY).sort((a, b) => a - b)[0];
  const heroCerts = certificateCheck(d, hero);
  const risks = d.register.filter((t) => LIVE.has(t.stage) && certificateCheck(d, t).some((r) => r.state !== 'pass'));
  const affecting = new Set(d.register.filter((t) => LIVE.has(t.stage)).flatMap((t) => certificateCheck(d, t).flatMap((r) => (r.state === 'at-risk' && r.credential ? [shortName(r.credential)] : []))));
  const overrides = dg1.filter((r) => (r.decision === 'pursue' && r.recommendation === 'discard') || (r.decision === 'discard' && r.recommendation !== 'discard'));
  const windowTo = new Date(ms(DEMO_TODAY) + 27 * DAY).toISOString().slice(0, 10);

  return {
    d, hero,
    heroFit: weighted(d, hero),
    headroom: money(headroom(d), d.facility.limit.ccy),
    p90: mins.length ? nearestRank(mins, 90) : null,
    worst: mins.length ? Math.max(...mins) : null,
    newToday: newToday.length,
    bySourceKind,
    validations: validations.length,
    blocking: validations.filter((v) => v.blocksDg1).length,
    oldest,
    expiring,
    won, decided,
    hit: decided ? `${Math.round((won / decided) * 100)}% (${won} of ${decided})` : '—',
    dg1OnTime: `${dg1.filter((r) => r.withinSla).length} of ${dg1.length}`,
    dg1Mix: `${dg1.filter((r) => r.decision === 'pursue').length} pursue · ${dg1.filter((r) => r.decision === 'discard').length} discard · ${dg1.filter((r) => r.decision === 'hold').length} hold`,
    overrides: `${overrides.length} (${overrides.filter((r) => r.reasonCodes.includes('client-relationship')).length} client relationship)`,
    discardCodes: Object.entries(dg1.filter((r) => r.decision === 'discard').reduce<Record<string, number>>((a, r) => { a[r.reasonCodes[0]] = (a[r.reasonCodes[0]] ?? 0) + 1; return a; }, {}))
      .sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '),
    dg2: `${d.history.dg2.length} decisions · ${d.history.dg2.filter((r) => r.withinSla).length} on time · ${d.history.dg2.filter((r) => r.againstMajority).length} against majority · ${d.history.dg2.filter((r) => r.reopened).length} re-opened`,
    dg1Due: dg1Due.length,
    firstSlaIn: firstSla ? `${Math.floor((firstSla - ms(`${DEMO_TODAY}T10:00`)) / 3_600_000)} h ${Math.round(((firstSla - ms(`${DEMO_TODAY}T10:00`)) % 3_600_000) / 60_000)} m` : '—',
    healthy: `${d.sources.filter((s) => s.state === 'healthy').length} of ${d.sources.length}`,
    docsToBuy: d.register.filter((t) => t.stage === 'S1' && t.documentFee && !t.intake.purchasedAt).length,
    heroCerts: `${heroCerts.filter((r) => r.state === 'pass').length} pass · ${heroCerts.filter((r) => r.state === 'at-risk').length} at risk · ${heroCerts.filter((r) => r.state === 'fail').length} fail`,
    risks: risks.length,
    affecting: [...affecting].join(', ') || 'none',
    teams: d.teams.map((t) => ({ t, now: load(t, DEMO_TODAY, windowTo), april: load(t, '2026-04-01', '2026-04-30') })),
    windowTo,
  };
}

// Plan 004 acceptance values, per tenant.
const EXPECT: Record<GccTenantKey, Record<string, string>> = {
  najd: {
    'Hero weighted fit': '82', 'Facility headroom': 'SAR 96.0 M', 'Intake p90 (min)': '11', 'Intake worst (min)': '14', 'New today': '11',
    'Validations open (block DG1)': '6 (2)', 'Oldest validation raised': '2026-03-08T07:44', 'Credentials expiring before 10 May': 'Zakat, GOSI',
    'Hit rate': '27% (9 of 33)', 'DG1 on time': '44 of 46', 'DG1 due (first SLA)': '2 (6 h 10 m)', 'Sources healthy': '8 of 9', 'Documents to buy': '1',
    'Eligibility risks (live tenders)': '3', 'Credentials at risk on live bids': 'Zakat, GOSI', 'Water team, next 4 weeks': '78%', 'Water team, with the hero': '96%',
    'BOQ total and lines': 'SAR 480.0 M, 236 lines',
  },
  corniche: { 'Hero weighted fit': '63', 'Hit rate': '27% (6 of 22)', 'Buildings MEP tendering team, next 4 weeks': '64%' },
  dafna: { 'Hero weighted fit': '71', 'Hit rate': '28% (5 of 18)', 'Utilities tendering team, next 4 weeks': '72%' },
  batinah: { 'Hero weighted fit': '38', 'Hit rate': '32% (8 of 25)' },
  qurain: { 'Hero weighted fit': '78', 'Facility headroom': 'KWD 3.1 M', 'Hit rate': '27% (8 of 30)', 'Water tendering team, April': '118%', 'Credentials expiring before 10 May': 'none' },
};

interface Check { name: string; expected?: string; got: string }

export default function SeedCheck() {
  const key = useTenantKey();
  if (!isGccTenantKey(key)) {
    return <CardHead title="GCC seed" meta="No GCC seed for this tenant" />;
  }
  const r = compute(key);
  const exp = EXPECT[key];

  const got: Record<string, string> = {
    'Hero weighted fit': String(Math.round(r.heroFit)),
    'Facility headroom': r.headroom,
    'Intake p90 (min)': String(r.p90 ?? '—'),
    'Intake worst (min)': String(r.worst ?? '—'),
    'New today': String(r.newToday),
    'Validations open (block DG1)': `${r.validations} (${r.blocking})`,
    'Oldest validation raised': r.oldest ?? '—',
    'Credentials expiring before 10 May': r.expiring.map(shortName).join(', ') || 'none',
    'Hit rate': r.hit,
    'DG1 on time': r.dg1OnTime,
    'DG1 due (first SLA)': `${r.dg1Due} (${r.firstSlaIn})`,
    'Sources healthy': r.healthy,
    'Documents to buy': String(r.docsToBuy),
    'Eligibility risks (live tenders)': String(r.risks),
    'Credentials at risk on live bids': r.affecting,
  };
  for (const { t, now, april } of r.teams) {
    got[`${t.name}, next 4 weeks`] = pct(now);
    got[`${t.name}, April`] = pct(april);
  }
  if (key === 'najd') {
    const water = r.d.teams.find((t) => t.id === 'najd-water')!;
    got['Water team, next 4 weeks'] = pct(load(water, DEMO_TODAY, r.windowTo));
    got['Water team, with the hero'] = pct(load(water, DEMO_TODAY, r.windowTo, [{ tenderId: HERO_ID, hoursPerWeek: HERO_EFFORT_HOURS_PER_WEEK, ...HERO_EFFORT_WINDOW }]));
    const total = HERO_LINES.reduce((s, l) => s + l.qty * l.rate, 0);
    const lines = HERO_BILLS.reduce((s, b) => s + b.lineCount, 0);
    got['BOQ total and lines'] = `${money(total, 'SAR')}, ${lines} lines`;
  }
  const checks: Check[] = Object.entries(got).map(([name, g]) => ({ name, got: g, expected: exp[name] }));
  const failing = checks.filter((c) => c.expected !== undefined && c.expected !== c.got).length;
  const targeted = checks.filter((c) => c.expected !== undefined).length;

  const stages = r.d.register.reduce<Record<string, number>>((a, t) => { a[t.stage] = (a[t.stage] ?? 0) + 1; return a; }, {});
  const bills = HERO_BILLS.map((b) => ({ b, total: HERO_LINES.filter((l) => l.bill === b.no).reduce((s, l) => s + l.qty * l.rate, 0), lines: HERO_LINES.filter((l) => l.bill === b.no).reduce((s, l) => s + l.lines, 0) }));

  return (
    <>
      <CardHead title="GCC seed: derived from data" meta={failing ? `${failing} of ${targeted} targets failing` : `All ${targeted} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Register by stage" v={Object.entries(stages).map(([s, n]) => `${s} ${n}`).join(' · ')} />
        <KV k="Hero weighted fit, unrounded" v={r.heroFit.toFixed(1)} />
        <KV k="Hero certificate lines" v={r.heroCerts} />
        <KV k="New today by source" v={Object.entries(r.bySourceKind).map(([k, n]) => `${k} ${n}`).join(' · ')} />
        <KV k="DG1, last 90 days" v={r.dg1Mix} />
        <KV k="DG1 overrides" v={r.overrides} />
        <KV k="DG1 discard reasons" v={r.discardCodes} />
        <KV k="DG2, last 12 months" v={r.dg2} />
        <KV k="Capacity window" v={`${DEMO_TODAY} → ${r.windowTo}`} />
      </div>
      <DataTable
        rows={checks}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Derived value', width: '1.8fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '1.1fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '1.1fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.7fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
      {key === 'najd' && (
        <DataTable
          rows={bills}
          rowKey={(x) => String(x.b.no)}
          columns={[
            { key: 'b', header: 'BOQ bill', width: '2.4fr', primary: true, render: (x) => <span className="cell-main">{x.b.no}. {x.b.title}</span> },
            { key: 'l', header: 'Lines', width: '.6fr', align: 'right', render: (x) => (x.lines === x.b.lineCount ? String(x.lines) : `${x.lines} ≠ ${x.b.lineCount}`) },
            { key: 't', header: 'Total', width: '1fr', align: 'right', render: (x) => money(x.total, 'SAR') },
            { key: 's', header: 'Share', width: '.6fr', align: 'right', render: (x) => `${((x.total / 480_000_000) * 100).toFixed(1)}%` },
          ]}
        />
      )}
    </>
  );
}
