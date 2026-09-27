import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { NAV_GCC, can, type Capability } from '@/data/access';
import { peopleOf, personById } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import {
  AHEAD_DAYS, CRITICAL_WD, DG2_QUORUM, DG2_SEATS, ESTIMATED_SHARE_BAND, GATE_SLA_HOURS, HANDOVER_DAYS, MIN_N, NEAR_WD, RATE_BANDS,
  SLA_AT_RISK_SHARE, SLA_OK_SHARE, TURNAROUND_HOURS,
} from '@/data/gcc/targets';
import { PORTFOLIO_BANDS, TENANT_TARGETS } from '@/data/gcc/portfolio';
import { QUOTES_TO_COVER, REMINDER_DAYS_BEFORE, RESCREEN_DAYS, RFQ_CLOCK_HOURS, RFQ_CLOCK_WARN_HOURS, RFQ_REPLY_WORKING_DAYS } from '@/data/gcc/s2/benchmarks';
import { STAGE_BANDS } from '@/domain/gcc/kpi/stages';
import { INTAKE_TARGET_MIN } from '@/domain/gcc/s1/intake';
import { fitFor } from '@/domain/gcc/s1/fit';
import { kpi } from '@/domain/gcc/kpi';
import {
  BRANDING_KEY, LOGO_MAX_KB, balanceWeights, brandingOf, brandingValue, defaultAccentOf, fitWhatIf, gatesOf, logoProblem, modelOf, targetsOf, usersOf,
} from '@/domain/gcc/admin';
import { SCREENS } from '../screens';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 024: Administration reads the real settings and changes only branding.
 * Runs on the seed (empty demo state), never on the live demo, so it changes
 * nothing and reads the same whatever the presenter has done.
 */

interface Check { name: string; ok: boolean; got: string }

const GCC = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'] as const;
const ADMIN_CAPS: Capability[] = ['admin.users', 'admin.gates', 'admin.sources', 'admin.fit', 'admin.targets', 'admin.branding'];

/** The what-if case named from the seed: Strategic priority raised to 25%, the others rebalanced. */
const RAISE = { criterion: 'strategy' as const, to: 25, tender: 'T-2026-117' };
const HERO = 'T-2026-118';

/** Every target's numbers, taken from the constants again, so a retyped value in the list fails. */
function expected(tenant: string): Record<string, number[]> {
  const fit = isGccTenantKey(tenant) ? gccData(tenant).fit : null;
  const goals = isGccTenantKey(tenant) ? TENANT_TARGETS[tenant] : null;
  const b = (x: { green: number; orange: number }) => [x.green, x.orange];
  return {
    'gate.dg1': [GATE_SLA_HOURS.DG1], 'gate.dg2': [GATE_SLA_HOURS.DG2], 'gate.dg3': [GATE_SLA_HOURS.DG3], 'gate.quorum': [DG2_QUORUM, DG2_SEATS],
    'gate.pf4': b(RATE_BANDS['PF-4']), 'gate.cmp6': b(RATE_BANDS['CMP-6']),
    's1.intake': [INTAKE_TARGET_MIN], 's1.intakeOrange': [STAGE_BANDS.intakeOrangeMin], 's1.queueOldest': [STAGE_BANDS.queueOldestRedH], 's1.booklet': [STAGE_BANDS.bookletWd],
    ...(fit ? { 's1.pursueAt': [fit.pursueAt], 's1.conditionsFrom': [fit.conditionsFrom], 's3.safeDelivery': [fit.safeDeliveryPct] } : {}),
    's2.rfqClock': [RFQ_CLOCK_HOURS], 's2.rfqWarn': [RFQ_CLOCK_WARN_HOURS], 's2.reply': [RFQ_REPLY_WORKING_DAYS], 's2.reminders': [REMINDER_DAYS_BEFORE],
    's2.covered': [QUOTES_TO_COVER], 's2.coveredBand': b(STAGE_BANDS.covered), 's2.repliesBand': b(STAGE_BANDS.repliesOnTime), 's2.rescreen': [RESCREEN_DAYS],
    's3.dg2Orange': [STAGE_BANDS.dg2OrangeH], 's3.capacityIfWon': b(PORTFOLIO_BANDS.capacityIfWonPct), 's3.facility': [PORTFOLIO_BANDS.facilityWarningShare],
    's4.replan': [TURNAROUND_HOURS.replan], 's4.pln6': b(RATE_BANDS['PLN-6']), 's5.reprice': [TURNAROUND_HOURS.reprice], 's5.prc2': b(RATE_BANDS['PRC-2']),
    's5.estimated': b(ESTIMATED_SHARE_BAND), 's6.full': b(STAGE_BANDS.full), 's8.submissions': [AHEAD_DAYS.submissions], 's8.bonds': [AHEAD_DAYS.bonds],
    's8.sub3': b(RATE_BANDS['SUB-3']), 's9.handover': [HANDOVER_DAYS], 's9.res3': b(RATE_BANDS['RES-3']),
    ...(goals ? { 'pf.hitRate': [goals.hitRatePct], 'pf.orderIntake': [goals.orderIntakeAnnual.amount] } : {}),
    'pf.hitRateOrange': [PORTFOLIO_BANDS.hitRateOrangeShare], 'pf.valueWon': b(PORTFOLIO_BANDS.valueWonPct), 'pf.teamLoad': b(PORTFOLIO_BANDS.teamLoadPct),
    'pf.near': [NEAR_WD], 'pf.critical': [CRITICAL_WD], 'pf.slaOk': [SLA_OK_SHARE], 'pf.slaRisk': [SLA_AT_RISK_SHARE], 'pf.minN': [MIN_N],
  };
}

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });
  const hot = personById(`${tenant}.hot`)!;
  const ceo = personById(`${tenant}.exec`)!;

  // 1. Every /admin* screen is built, has a page and the capability its sidebar entry has.
  const admin = NAV_GCC.flatMap((g) => g.items).find((i) => i.key === 'admin')!;
  const navCap = new Map([[admin.path, admin.cap], ...(admin.children ?? []).map((c) => [c.path, c.cap] as const)]);
  const screens = Object.entries(SCREENS).filter(([p]) => p.startsWith('/admin'));
  const bad = screens.filter(([p, s]) => !s.built || !s.page || !s.cap || navCap.get(p) !== s.cap).map(([p]) => p);
  add('Every /admin screen is built and guarded by its sidebar capability', screens.length === 8 && !bad.length, bad.length ? `Not right: ${bad.join(', ')}` : `${screens.length} screens`);

  // 2. The Head of Tendering opens all of them; the CEO only the audit log.
  const hotOk = screens.every(([, s]) => can(hot, s.cap!).ok);
  const ceoOpens = screens.filter(([, s]) => can(ceo, s.cap!).ok).map(([p]) => p);
  add('Head of Tendering opens all; the CEO only /admin/audit', hotOk && ceoOpens.join() === '/admin/audit' && ADMIN_CAPS.every((c) => !can(ceo, c).ok),
    `HoT ${hotOk ? 'all' : 'not all'} · CEO: ${ceoOpens.join(', ') || 'none'}`);

  // 3. Every person once in Users & roles.
  const ids = usersOf(tenant).groups.flatMap((g) => g.users.map((u) => u.id));
  const people = peopleOf(tenant).map((p) => p.id);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  add('Every person appears once in Users & roles', !dup.length && ids.length === people.length && people.every((p) => ids.includes(p)),
    `${ids.length} listed, ${people.length} people${dup.length ? ` · twice: ${dup.join(', ')}` : ''}`);

  // 4. Script F: the Procurement Lead's row says the margin is masked.
  const proc = usersOf(tenant).groups.flatMap((g) => g.users).find((u) => u.id === `${tenant}.proc`);
  add('Procurement Lead: margin masked, in words', !!proc?.masked?.startsWith('Margin'), proc ? `${proc.canDo} · ${proc.masked ?? 'nothing masked'}` : 'No Procurement Lead');

  // 5. No gate without an owner, in any company.
  const owners = GCC.map((t) => `${t} ${gatesOf(t).withoutOwners}`);
  add('Gates without owners: 0 in every company', GCC.every((t) => gatesOf(t).withoutOwners === 0), owners.join(' · '));

  // 6. The what-if with the current model changes nothing and equals fitFor, in all five companies.
  const drift: string[] = [];
  let rows = 0;
  GCC.forEach((t) => {
    const vm = fitWhatIf(t, {}, modelOf(gccData(t)));
    vm?.rows.forEach((r) => {
      rows++;
      const f = fitFor(t, r.tenderId, {});
      if (r.changed || !f || r.next.weighted !== f.weighted || r.next.label !== f.verdictLabel || r.next.capped !== f.capped) drift.push(`${t} ${r.tenderId}`);
    });
  });
  add('What-if with the current model: no change, equal to fitFor (5 companies)', rows > 0 && !drift.length, drift.length ? `Differs: ${drift.slice(0, 4).join(', ')}` : `${rows} live Stage 1 tenders`);

  // 7. Raising one weight moves the named Najd tender, and only it.
  const najd = modelOf(gccData('najd'));
  const raised = { ...najd, weights: balanceWeights({ ...najd.weights, [RAISE.criterion]: RAISE.to }, RAISE.criterion) };
  const moved = fitWhatIf('najd', {}, raised)?.rows.filter((r) => r.changed) ?? [];
  const m0 = moved[0];
  add(`Najd: strategic priority to ${RAISE.to}% moves ${RAISE.tender} to Pursue with conditions`, moved.length === 1 && m0.tenderId === RAISE.tender && m0.now.verdict === 'pursue' && m0.next.verdict === 'conditions',
    moved.map((r) => `${r.tenderId} ${r.now.weighted} → ${r.next.weighted}, ${r.now.label} → ${r.next.label}`).join(' · ') || 'Nothing moved');

  // 8. Raising "Pursue at" above the hero's score moves the hero.
  const heroNow = fitFor('najd', HERO, {});
  const above = heroNow ? Math.floor(heroNow.weighted) + 1 : 0;
  const hero = fitWhatIf('najd', {}, { ...najd, pursueAt: above })?.rows.find((r) => r.tenderId === HERO);
  add(`Najd: Pursue at ${above} moves the hero ${HERO}`, !!hero?.changed && hero.next.verdict === 'conditions', hero ? `${hero.now.label} → ${hero.next.label}` : 'Hero not live at Stage 1');

  // 9. Targets: no duplicate, every value equals its constant, every tile exists, second sources agree.
  const list = targetsOf(tenant);
  const want = expected(tenant);
  const dupT = list.filter((r, i) => list.findIndex((x) => x.id === r.id || x.name === r.name) !== i).map((r) => r.id);
  const wrong = list.filter((r) => JSON.stringify(r.values) !== JSON.stringify(want[r.id])).map((r) => r.id);
  const unknown = list.flatMap((r) => r.usedBy.flatMap((u) => ('kpi' in u && !kpi(u.kpi) ? [`${r.id}:${u.kpi}`] : [])));
  const disagree = list.filter((r) => r.alsoIn && r.alsoIn.value !== r.values[0]).map((r) => `${r.id} vs ${r.alsoIn!.source}`);
  const missing = Object.keys(want).filter((id) => !list.some((r) => r.id === id));
  add('Targets: no duplicate, each value equals its import, tiles exist', !dupT.length && !wrong.length && !unknown.length && !disagree.length && !missing.length,
    [dupT.length && `duplicate ${dupT.join(', ')}`, wrong.length && `wrong ${wrong.join(', ')}`, unknown.length && `unknown tile ${unknown.join(', ')}`,
      disagree.length && `disagree ${disagree.join(', ')}`, missing.length && `missing ${missing.join(', ')}`].filter(Boolean).join(' · ') || `${list.length} targets`);

  // 10. Branding round-trips; the company's own accent isn't stored; Restore defaults reads as none; garbage is ignored.
  const other = (['corniche', 'najd'] as const).find((a) => a !== defaultAccentOf(tenant))!;
  const logo = { dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+', name: 'acme.svg' };
  const back = brandingOf({ [BRANDING_KEY]: brandingValue(tenant, { accent: other, logo, displayName: '  Acme Contracting ' }, '2026-03-08T10:00', hot.id) });
  const own = brandingOf({ [BRANDING_KEY]: brandingValue(tenant, { accent: defaultAccentOf(tenant) ?? undefined }, '2026-03-08T10:00', hot.id) });
  const restored = brandingOf({ [BRANDING_KEY]: brandingValue(tenant, {}, '2026-03-08T10:00', hot.id) });
  const garbage = brandingOf({ [BRANDING_KEY]: '{"accent":"neon","logo":{"dataUrl":"javascript:x","name":"x"}}' });
  add('Branding round-trips; own accent and Restore defaults read as none', back?.accent === other && back.logo?.name === 'acme.svg' && back.displayName === 'Acme Contracting' && back.byId === hot.id && own === null && restored === null && garbage === null,
    `back ${back ? `${back.accent}, ${back.logo?.name}, “${back.displayName}”` : 'null'} · own ${own ? 'stored' : 'none'} · restored ${restored ? 'set' : 'none'} · garbage ${garbage ? 'kept' : 'dropped'}`);

  // 11. The logo limit.
  const big = logoProblem({ name: 'big.png', type: 'image/png', size: LOGO_MAX_KB * 1024 + 1 });
  const edge = logoProblem({ name: 'edge.png', type: 'image/png', size: LOGO_MAX_KB * 1024 });
  const gif = logoProblem({ name: 'a.gif', type: 'image/gif', size: 100 });
  add(`A logo over ${LOGO_MAX_KB} KB is refused, with the reason`, !!big?.includes(`${LOGO_MAX_KB} KB`) && edge === null && !!gif, `${big ?? 'accepted'} · at the limit: ${edge ?? 'accepted'} · GIF: ${gif ? 'refused' : 'accepted'}`);

  return out;
}

export default function AdminCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Administration (plan 024)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Administration (plan 024)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
