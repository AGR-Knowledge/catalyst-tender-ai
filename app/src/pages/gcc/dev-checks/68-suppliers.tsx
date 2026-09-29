import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { personById } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { S2_SUPPLIERS } from '@/data/gcc/s2';
import { BAND, FEATURED, WINDOW_FROM, blockOf, supplierProfileSeed, wonInWindow } from '@/data/gcc/s2/profiles';
import { supplierOf } from '@/domain/gcc/s2';
import { supplierDetailFor, supplierGlanceOf, type SupplierDetailVM } from '@/domain/gcc/suppliers/detail';
import { HEALTH_RULE } from '@/domain/gcc/suppliers/health';
import { supplierMasterFor } from '@/domain/gcc/suppliers/profile';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 031: every supplier in the open company has a profile, and the profile
 * agrees with the supplier master it extends: awards, NCRs, quotes, on-time and
 * replies are the master's; jobs with us fit the load band (B1) and sit on won
 * tenders of the last 12 months; nothing starts after a block; the health word
 * and certificate states follow their stated rules on demo day. Reads the seed
 * and an empty `done`, so it changes nothing.
 */

interface Check { name: string; ok: boolean; got: string }

/** The rule restated here, so a change to `healthOf` that breaks it shows. */
const healthWord = (cr: number, nm: number) =>
  (cr >= HEALTH_RULE.strongRatio && nm >= HEALTH_RULE.strongMargin ? 'Strong'
    : cr < HEALTH_RULE.watchRatio || nm < HEALTH_RULE.watchMargin ? 'Watch' : 'Adequate');

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const viewer = personById(`${tenant}.proc`)!;
  const suppliers = S2_SUPPLIERS[tenant as keyof typeof S2_SUPPLIERS] ?? [];
  const rows = suppliers.map((s) => ({ s, d: supplierDetailFor(tenant, s.id, {}, viewer) }));
  const ok = rows.filter((r): r is { s: typeof r.s; d: SupplierDetailVM } => r.d !== null);
  /** Every supplier passes `test`; `got` names the first that fails. */
  const all = (test: (x: (typeof ok)[number]) => boolean, pass: string) => {
    const bad = ok.filter((x) => !test(x));
    return [bad.length === 0, bad.length ? `${bad.length} fail, e.g. ${bad.slice(0, 3).map((x) => x.s.id).join(', ')}` : pass] as const;
  };

  // 1. A profile for every supplier in the master.
  const master = supplierMasterFor(tenant, {}).rows.length;
  add('A profile for every supplier', ok.length === suppliers.length && master === suppliers.length, `${ok.length} profiles · ${suppliers.length} in the seed · ${master} on the master`);

  // 2–6. The tiles read the master's figures (4.7): awards, NCRs, quotes, on time, replies.
  add('Awards in 12 months = awards12m', ...all(({ s, d }) => d.jobsNow.length + d.delivered.length === s.performance.awards12m && d.totals.awards === s.performance.awards12m,
    `${ok.reduce((n, x) => n + x.s.performance.awards12m, 0)} awards across ${ok.length} suppliers`));
  add('Quarters’ NCRs = ncrs12m', ...all(({ s, d }) => d.totals.ncrs === s.performance.ncrs12m, `${ok.reduce((n, x) => n + x.d.totals.ncrs, 0)} NCRs`));
  add('Quarters’ quotes = quotes12m', ...all(({ s, d }) => d.totals.quotes === s.performance.quotes12m, `${ok.reduce((n, x) => n + x.d.totals.quotes, 0)} quotes`));
  add('Weighted on time rounds to onTimePct', ...all(({ s, d }) => d.totals.onTimePct === s.performance.onTimePct && d.quarters.every((q) => q.onTime <= q.deliveries),
    `${ok.reduce((n, x) => n + x.d.totals.deliveries, 0)} deliveries`));
  add('Reply rate and days = the master’s response', ...all(({ s, d }) => {
    const m = supplierOf(tenant, s.id)!.response;
    return d.row.s.response.ratePct === m.ratePct && d.row.s.response.avgDays === m.avgDays && d.sheet.s.response.ratePct === m.ratePct;
  }, 'profile, sheet and master agree'));

  // 7–8. B1: jobs with us within the load band and the awards; the rest delivered.
  add('Jobs now ≤ band top and ≤ awards12m (B1)', ...all(({ s, d }) => {
    const now = d.jobsNow.length;
    return now <= BAND[s.load].top && now <= s.performance.awards12m && now >= Math.min(BAND[s.load].floor, s.performance.awards12m);
  }, (['low', 'medium', 'high'] as const).map((b) => `${b} ${ok.filter((x) => x.s.load === b).reduce((n, x) => n + x.d.jobsNow.length, 0)}`).join(' · ')));
  add('Jobs now + delivered in 12 months = awards12m (B1)', ...all(({ s, d }) => d.jobsNow.length + d.delivered.length === s.performance.awards12m
    && d.delivered.every((j) => !!j.deliveredAt && j.deliveredAt >= WINDOW_FROM && j.deliveredAt <= DEMO_TODAY)
    && d.jobsNow.every((j) => j.startedAt <= DEMO_TODAY && j.dueAt > DEMO_TODAY),
    `${ok.reduce((n, x) => n + x.d.jobsNow.length, 0)} now · ${ok.reduce((n, x) => n + x.d.delivered.length, 0)} delivered`));

  // 9. Every job is on a tender won in the window; every completed job on a project in the register.
  const won = new Set(wonInWindow(tenant).map((l) => l.tenderId));
  const projects = new Set(gccData(tenant).projects.map((p) => p.id));
  add('Jobs on won tenders, completed on register projects', ...all(({ d }) => [...d.jobsNow, ...d.delivered].every((j) => won.has(j.tenderId)) && d.completed.every((c) => projects.has(c.projectId)),
    `${won.size} won tenders · ${projects.size} register projects`));

  // 10. A blocked supplier starts nothing after its block.
  const blocked = ok.filter((x) => blockOf(x.s));
  add('No job on a blocked supplier after its block', ...all(({ s, d }) => {
    const b = blockOf(s);
    return !b || [...d.jobsNow, ...d.delivered].every((j) => j.awardedAt <= b.at && j.startedAt <= b.at);
  }, `${blocked.length} blocked: ${blocked.map((x) => x.s.id).join(', ') || 'none'}`));

  // 11. The health word follows its rule, on the latest year; the master's column reads the same word.
  add('Health word matches the rule', ...all(({ s, d }) => {
    const fy = d.accounts[d.accounts.length - 1];
    return d.health.word === healthWord(fy.currentRatio, fy.netMarginPct) && supplierGlanceOf(tenant, s.id)?.health === d.health.word;
  }, (['Strong', 'Adequate', 'Watch'] as const).map((w) => `${w} ${ok.filter((x) => x.d.health.word === w).length}`).join(' · ')));

  // 12. Certificate states against demo day (renew soon: 60 days or less).
  const soon = addDays(DEMO_TODAY, 60);
  const certs = ok.flatMap((x) => x.d.certificates);
  add('Certificate states against demo day', ...all(({ d }) => d.certificates.every((c) => c.state === (c.validTo < DEMO_TODAY ? 'expired' : c.validTo <= soon ? 'soon' : 'valid')),
    `${certs.length} certificates · ${certs.filter((c) => c.state === 'expired').length} expired · ${certs.filter((c) => c.state === 'soon').length} to renew`));

  // 13. The master's "With us now" column is the profile's.
  add('Master’s With us now = the profile’s jobs now', ...all(({ s, d }) => {
    const g = supplierGlanceOf(tenant, s.id);
    return !!g && g.now === d.jobsNow.length && g.delivered === d.delivered.length;
  }, 'glance and profile agree'));

  // 14. Featured overrides name real suppliers; an unblocked featured supplier holds no expired certificate.
  const featured = Object.keys(FEATURED).filter((k) => k.startsWith(`${tenant}:`) || k.startsWith('*:')).map((k) => k.split(':')[1]);
  const fOk = featured.every((id) => {
    const x = ok.find((r) => r.s.id === id);
    // A `*:` override may name a supplier of another company; a company's own must be one of its suppliers.
    if (!x) return !(`${tenant}:${id}` in FEATURED);
    return !!supplierProfileSeed(tenant, id) && (blockOf(x.s) !== null || x.d.certificates.every((c) => c.state !== 'expired'));
  });
  add('Featured suppliers are real and current', fOk, featured.length ? [...new Set(featured)].join(', ') : 'none featured here');

  return out;
}

export default function SuppliersCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Supplier profiles (plan 031)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Supplier profiles (plan 031)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.ok ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
