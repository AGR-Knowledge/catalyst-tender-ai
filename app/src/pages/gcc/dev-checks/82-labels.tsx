import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { peopleOf } from '@/data/people';
import { gccData, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { REISSUED } from '@/data/gcc/reissued';
import { currentOf, lifecycle, visible } from '@/domain/gcc/lifecycle';
import { isOg, previousOf } from '@/domain/gcc/labels';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 042: the OG and Previous labels, on the seed. OG is derived from the
 * document map and lands on exactly the four tenders built on real client
 * documents; every re-issue points at an existing closed tender of the same
 * company with its reference read from it; nobody sees what they may not open.
 * The data rows cover all five companies; the masking row runs for the one
 * selected.
 */

interface Check { name: string; ok: boolean; got: string }

const TENANTS: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];
const OG_EXPECTED = ['najd T-2026-120', 'qurain T-2026-071', 'qurain T-2026-072', 'batinah T-2026-041'];
const HEROES: [GccTenantKey, string][] = [
  ...TENANTS.map((t): [GccTenantKey, string] => [t, 'T-2026-118']),
  ['corniche', 'T-2026-061'],
  ['batinah', 'T-2026-042'],
];
/** Two in Najd, one in each other company. Batinah's and Qurain's are past Stage 1: they have no eligible Stage 1 row (orchestrator review). */
const COUNT_EXPECTED: Record<GccTenantKey, number> = { najd: 2, corniche: 1, dafna: 1, batinah: 1, qurain: 1 };
/** Companies whose re-issue may be past Stage 1. */
const PAST_STAGE_1 = new Set<GccTenantKey>(['batinah', 'qurain']);

const list = (xs: string[], n = 4) => (xs.length ? `${xs.slice(0, n).join(', ')}${xs.length > n ? ` +${xs.length - n}` : ''}` : 'none');
const sorted = (xs: string[]) => [...xs].sort();

function checks(tenant: GccTenantKey): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const pairs = TENANTS.flatMap((t) => REISSUED[t].map((r) => ({ t, r })));

  // 1. OG is exactly the four tenders on real client documents.
  const og = TENANTS.flatMap((t) => gccData(t).register.filter((x) => isOg(t, x.id)).map((x) => `${t} ${x.id}`));
  add('OG lands on exactly the four tenders built on real client documents', JSON.stringify(sorted(og)) === JSON.stringify(sorted(OG_EXPECTED)), list(og));

  // 2. Never on the heroes.
  const heroOg = HEROES.filter(([t, id]) => isOg(t, id)).map(([t, id]) => `${t} ${id}`);
  add('OG is false for the heroes (118 everywhere, 061, 042)', heroOg.length === 0, heroOg.length ? `OG on ${list(heroOg)}` : `${HEROES.length} checked, none OG`);

  // 3. Every re-issue points at an existing closed tender of the same company.
  const badPrev = pairs.filter(({ t, r }) => !lifecycle(t, r.previousId)?.closedAt).map(({ t, r }) => `${t} ${r.tenderId} → ${r.previousId}`);
  add('Every re-issue points at an existing closed tender in the same company', pairs.length > 0 && badPrev.length === 0,
    badPrev.length ? `missing or live: ${list(badPrev)}` : pairs.map(({ t, r }) => `${t} ${r.tenderId} → ${r.previousId}`).join(' · '));

  // 4. The reference is the earlier tender's own.
  const badRef = pairs.filter(({ t, r }) => !r.previousRef || r.previousRef !== lifecycle(t, r.previousId)?.source.ref).map(({ t, r }) => `${t} ${r.tenderId}`);
  add('previousRef is the earlier tender\'s authority reference', badRef.length === 0, badRef.length ? `off: ${list(badRef)}` : pairs.map(({ r }) => r.previousRef).join(' · '));

  // 5. Each re-issued tender is a live register row (Stage 1, except in Batinah and Qurain), neither a hero nor OG, and reads its link; counts per company.
  const badTender = pairs.filter(({ t, r }) => {
    const row = gccData(t).register.find((x) => x.id === r.tenderId);
    const l = lifecycle(t, r.tenderId);
    const p = previousOf(t, r.tenderId);
    return !row || row.hero || HEROES.some(([ht, id]) => ht === t && id === r.tenderId) || isOg(t, r.tenderId)
      || !l || !!l.closedAt || (!PAST_STAGE_1.has(t) && currentOf(l).stage !== 1) || !p?.endedHow || !p.endedText;
  }).map(({ t, r }) => `${t} ${r.tenderId}`);
  const counts = TENANTS.map((t) => `${t} ${REISSUED[t].length}`).join(' · ');
  add('Re-issued tenders are live register rows (Stage 1 outside Batinah and Qurain), not heroes or OG, each with its ending; 2 in Najd, 1 elsewhere',
    badTender.length === 0 && TENANTS.every((t) => REISSUED[t].length === COUNT_EXPECTED[t]), badTender.length ? `off: ${list(badTender)}` : counts);

  // 6. Masking: whoever may not open the earlier tender gets its TID only; whoever may, gets the link.
  const leaks: string[] = [];
  let seen = 0;
  for (const r of REISSUED[tenant]) {
    const prev = lifecycle(tenant, r.previousId);
    if (!prev) continue;
    for (const p of peopleOf(tenant)) {
      const vm = previousOf(tenant, r.tenderId, p);
      if (!vm) { leaks.push(`${p.id} no link`); continue; }
      const may = visible(tenant, prev, p);
      if (may) seen++;
      if (may !== vm.canOpen || (!may && (vm.title !== null || vm.previousRef !== null || vm.endedHow !== null || vm.tip.includes(prev.title)))) leaks.push(`${p.id} ${r.tenderId}`);
    }
  }
  add(`Nobody reads more of an earlier tender than they may open (${tenant})`, leaks.length === 0,
    REISSUED[tenant].length ? (leaks.length ? `leaks: ${list(leaks)}` : `${peopleOf(tenant).length} people × ${REISSUED[tenant].length} re-issues, ${seen} may open the earlier tender`) : 'no re-issue in this company');

  return out;
}

export default function LabelsCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="OG and Previous labels (plan 042)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="OG and Previous labels (plan 042)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
