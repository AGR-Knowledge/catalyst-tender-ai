import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { personById } from '@/data/people';
import { isGccTenantKey } from '@/data/gcc';
import { kpi } from '@/domain/gcc/kpi';
import { eligibilityFor, eligibilityRisks, auditText, DONE_KEY, json } from '@/domain/gcc/s1';
import { openingOf, tenderOf } from '@/domain/gcc/s1/common';
import { requestsFor } from '@/domain/gcc/requests';
import { dataOf } from '@/domain/gcc/s1/common';
import { defaultRenewalDate, renewRight, renewalToast, renewalWrite, vaultFor, vaultReader } from '@/domain/gcc/company';
import { kpiCtxOf } from '@/pages/gcc/s1/vm/tiles';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 010: the credentials vault agrees with SCR-6 and the eligibility lines,
 * and the renewal write refuses what it should and re-checks everything it
 * should. Runs on in-memory `done` maps, never on the live demo, so it changes
 * nothing; the Najd scenario rows pass whichever company is open.
 */

interface Check { name: string; ok: boolean; got: string }

const GCC = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'] as const;
const HERO = 'T-2026-118';
const AT = '2026-03-08T10:05';

const scr6 = (tenant: string, done: Record<string, string>) =>
  kpi('SCR-6')?.compute(kpiCtxOf({ tenant, viewer: vaultReader(tenant), viewAs: false, done }, '30d', 'company'));

function checks(): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const fin = personById('najd.fin')!;
  const bid = personById('najd.bid')!;
  const hot = personById('najd.hot')!;

  // 1. The strip's at-risk count is SCR-6, in every tenant.
  const counts = GCC.map((t) => ({ t, vault: vaultFor(t, {}, vaultReader(t)).counts.atRisk, tile: scr6(t, {})?.n }));
  add('Vault at-risk count = SCR-6, every tenant', counts.every((c) => c.vault === c.tile), counts.map((c) => `${c.t} ${c.vault}/${c.tile}`).join(' · '));

  // 2. Script A: Zakat and GOSI are at risk against the hero's opening.
  const hero = tenderOf('najd', HERO);
  const opening = hero ? openingOf(hero)?.date : undefined;
  const v0 = vaultFor('najd', {}, fin);
  const risky = ['najd-zakat', 'najd-gosi'].map((id) => v0.rows.find((r) => r.id === id));
  add('Najd: Zakat and GOSI at risk against T-2026-118 opening', risky.every((r) => r?.state === 'at-risk' && r.bids.some((b) => b.tenderId === HERO && b.checkDate === opening)),
    risky.map((r) => `${r?.id} ${r?.state} to ${r?.validTo} · ${r?.bids.map((b) => `${b.tenderId} ${b.checkDate}`).join(', ')}`).join(' | '));

  // 3. The vault agrees with the eligibility lines: every certificate an at-risk line asks to renew is at risk for that bid.
  const misses = GCC.flatMap((t) => {
    const v = vaultFor(t, {}, vaultReader(t));
    return eligibilityRisks(t, {}).flatMap((r) => r.lines.flatMap((l) => (l.renew ?? [])
      .filter((x) => !v.rows.find((row) => row.id === x.credentialId)?.bids.some((b) => b.tenderId === r.tenderId))
      .map((x) => `${t} ${r.tenderId} ${x.credentialId}`)));
  });
  const lines = GCC.reduce((n, t) => n + eligibilityRisks(t, {}).reduce((m, r) => m + r.lines.filter((l) => l.renew?.length).length, 0), 0);
  add('Vault lists every credential an at-risk line renews', !misses.length, misses.length ? misses.join(', ') : `${lines} at-risk certificate lines, all in the vault`);

  // 4. Refuses a date that is not later, and a person without the right (and View as).
  const earlier = renewalWrite('najd', 'najd-zakat', '2026-04-01', fin, {}, { at: AT });
  const same = renewalWrite('najd', 'najd-zakat', '2026-04-30', fin, {}, { at: AT });
  const byBid = renewalWrite('najd', 'najd-zakat', '2027-04-30', bid, {}, { at: AT });
  const viewAs = renewalWrite('najd', 'najd-zakat', '2027-04-30', fin, {}, { at: AT, viewAs: true });
  add('Refuses an earlier or equal date, a non-owner and View as', !earlier.ok && !same.ok && !byBid.ok && !viewAs.ok,
    [earlier, same, byBid, viewAs].map((r) => (r.ok ? 'accepted' : r.reason)).join(' · '));

  // 5. Finance renews its own credential, not HR's; the Head of Tendering renews any.
  const own = renewRight(dataOf('najd').credentials.find((c) => c.id === 'najd-zakat')!, fin);
  const hrs = renewRight(dataOf('najd').credentials.find((c) => c.id === 'najd-gosi')!, fin);
  const hotGosi = renewRight(dataOf('najd').credentials.find((c) => c.id === 'najd-gosi')!, hot);
  add('Finance renews Zakat, not GOSI (HR); Head of Tendering both', own.ok && !hrs.ok && hotGosi.ok, `Zakat ${own.ok ? 'yes' : own.reason} · GOSI ${hrs.ok ? 'yes' : hrs.reason} · HoT GOSI ${hotGosi.ok ? 'yes' : hotGosi.reason}`);

  // 6. The write: default date, done key, audit wording.
  const zakat = dataOf('najd').credentials.find((c) => c.id === 'najd-zakat')!;
  const asked = { [DONE_KEY.renewalRequested('najd-zakat')]: json({ at: '2026-03-08T10:03', byId: hot.id }) };
  const date = defaultRenewalDate(zakat, asked);
  const w = renewalWrite('najd', 'najd-zakat', date, fin, asked, { at: AT, tenderId: HERO });
  add('Write: renewed:{id}, a year on, the audit wording', w.ok && w.write.key === 'renewed:najd-zakat' && date === '2027-04-30'
    && auditText(w.audit) === 'Credential renewed: Zakat certificate (ZATCA), valid to 30 Apr 2027' && w.audit.target === HERO,
  w.ok ? `${w.write.key} = ${w.write.value} · “${auditText(w.audit)}” on ${w.audit.target}` : w.reason);

  // 7. After it: the hero's Zakat line passes, the request reads submitted, and the toast says so.
  const after = w.ok ? { ...asked, [w.write.key]: w.write.value } : asked;
  const line = eligibilityFor('najd', HERO, after)?.lines.find((l) => l.kind === 'zakat');
  const req = requestsFor('najd', fin.id, after, fin).find((r) => r.id === 'renewal:najd-zakat');
  const toast = renewalToast('najd', 'najd-zakat', asked, after);
  add('After: the line passes, the request is submitted', line?.state === 'pass' && req?.status === 'submitted' && toast.includes(`${HERO}`) && /now pass/.test(toast),
    `line ${line?.state} (${line?.why}) · request ${req?.status ?? 'missing'} · “${toast}”`);

  // 8. …and the counts drop by one, on the tile and in the vault.
  const tileAfter = scr6('najd', after)?.n;
  const vAfter = vaultFor('najd', after, fin);
  add('After: SCR-6 and the vault drop by one; Zakat reads renewed', tileAfter === (counts[0].tile ?? 0) - 1 && vAfter.counts.atRisk === tileAfter && vAfter.rows.find((r) => r.id === 'najd-zakat')?.state === 'renewed',
    `SCR-6 ${counts[0].tile} → ${tileAfter} · vault ${vAfter.counts.atRisk} · Zakat ${vAfter.rows.find((r) => r.id === 'najd-zakat')?.state}`);

  return out;
}

export default function CompanyCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks() : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Company and the credentials vault (plan 010)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Company and the credentials vault (plan 010)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
