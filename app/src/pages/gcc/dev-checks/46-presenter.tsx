import { gccData, type GccTenantKey } from '@/data/gcc';
import { HERO_ID } from '@/data/gcc/hero';
import { PLATFORM_OPERATOR, personById } from '@/data/people';
import { currentOf, lifecycle, type DemoDone } from '@/domain/gcc/lifecycle';
import { dataPort } from '@/domain/gcc/port';
import { validationAction } from '@/domain/gcc/s1';
import { bidBondFor, facilityHeadroom } from '@/domain/gcc/s1/bond';
import { dg1PackFor, dg1RecordFor, dg1Write } from '@/domain/gcc/dg1';
import { approvedShortlist, packagesFor, rfqClock, rfqsFor } from '@/domain/gcc/s2';
import { pendingReplies, pendingRepliesAll } from '@/domain/gcc/s2/simulate';
import { freshnessFor, inputsFor, packVersionsFor } from '@/domain/gcc/s3';
import { positionsFor } from '@/domain/gcc/dg2/positions';
import { isPlan, presetFor, presets, type PresetPlan } from '@/domain/gcc/demo/presets';
import { stage3Entry, stage3EntryWrite } from '@/domain/gcc/demo/25-stage3-entry.apply';
import { compareHero } from '@/domain/gcc/demo/compare';
import { money } from '@/domain/money';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 014: the presenter controls. Presets are built from the
 * seed for every tenant and read back through the rules and the data port, on
 * an in-memory `done` (the real store is never written). The panel is the
 * same in every tenant. Values are typed only in `EXPECT`.
 */

const TENANTS: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];
const H = HERO_ID;
const C = 'T-2026-097';

const EXPECT: Record<string, string> = {
  'Presets build in the tenants they list': 'morning-intake 5 · dg1-due 5 · rfqs-out 3 (unavailable in corniche, batinah) · dg2-committee 1',
  'Unavailable presets give their reason': 'The agent recommends discarding the hero here, so script B runs in Najd, Dafna or Qurain. · Script C runs in Najd.',
  'Morning intake is the seed': '0 writes in every tenant · 1 audit entry, the presenter’s',
  'DG1 due unlocks the hero’s DG1 pack': 'unlocked in every tenant · DG1 not recorded',
  'RFQs out: packages issued and the clock (Najd, Dafna, Qurain)': 'every shortlisted package issued · clock from the DG1 Pursue · no replies · Stage 2',
  'Advance agent work after RFQs out (Najd)': 'same replies as the package board · none pending after',
  'DG2 committee: T-2026-097': 'v2 issued · fresh · 2 of 5 positions kept · Stage 3',
  'Audit: summary first, then demo-control entries': 'presenter summary first · every other entry marked (demo control) · no tender audit entry by the operator',
  'No preset writes outside its tenant': 'every key names this tenant’s tenders or fields · none in the platform bucket',
  'Compare: the five answers of dev-check 70': 'najd 82 Pursue · corniche 63 Recommend discard · dafna 71 Pursue with conditions (JV needed) · batinah 38 Recommend discard · qurain 78 Pursue with conditions',
  'Advance to Stage 3: T-2026-061 (Corniche)': 'before DG1: Stage 1 refused · after: Stage 3 · pack-in-preparation · pack v1 · 6 inputs · port stage 3 · hero still Stage 1',
  'Advance to Stage 3: T-2026-042 (Batinah)': 'before DG1: Stage 1 refused · after: Stage 3 · pack-in-preparation · pack v1 · 6 inputs · port stage 3 · hero still Stage 1',
};

// ---------------------------------------------------------------------------

type Done = Record<string, string>;
const put = (done: Done, ws: { key: string; value: string }[]): Done => ({ ...done, ...Object.fromEntries(ws.map((w) => [w.key, w.value])) });
const planOf = (id: string, k: GccTenantKey): PresetPlan | null => {
  const p = presets().find((x) => x.id === id);
  const r = p ? presetFor(p, k) : null;
  return r && isPlan(r) ? r : null;
};
const doneOf = (plan: PresetPlan): Done => put({}, plan.writes);
const stageRow = (k: GccTenantKey, id: string, d: DemoDone) => {
  const l = lifecycle(k, id, d);
  return l ? currentOf(l) : null;
};

/** A demo tender pursued at DG1 in the demo: its blocking fields resolved, then Pursue by its Bid Manager. */
function pursued(k: GccTenantKey, id: string): Done {
  const t = gccData(k).register.find((x) => x.id === id)!;
  let d = put({}, t.validations.filter((v) => v.blocksDg1).map((v) => validationAction(v, v.alt ? 'pick' : 'accept', v.alt ? { pick: 'value' } : {}, `${k}.coord`)));
  const pack = dg1PackFor(k, id, d)!;
  const note = pack.recommendation.verdict === 'discard' ? 'Dev check: pursue whatever the recommendation' : undefined;
  const elig = pack.eligibility?.result;
  const strategy = elig?.verdict === 'eligible-with-jv' && elig.jvPartner ? { kind: 'jv' as const, partnerId: elig.jvPartner.id } : { kind: 'prime' as const };
  d = put(d, dg1Write({ tenderId: id, decision: 'pursue', strategy, ...(note ? { note } : {}) }, t.bidManagerId ?? `${k}.bid`, pack, d).writes);
  return d;
}

interface Check { name: string; got: string; expected?: string }

function attempt(name: string, f: () => string): Check {
  try { return { name, got: f() }; } catch (e) { return { name, got: `refused: ${(e as Error).message}` }; }
}

function checks(): Check[] {
  const out: Check[] = [];
  const add = (name: string, f: () => string) => out.push(attempt(name, f));

  add('Presets build in the tenants they list', () => presets().map((p) => {
    const ks = p.tenants === 'all' ? TENANTS : p.tenants;
    const bad = ks.filter((k) => !isPlan(presetFor(p, k)));
    return `${p.id} ${ks.length - bad.length}${bad.length ? ` (unavailable in ${bad.join(', ')})` : ''}`;
  }).join(' · '));

  add('Unavailable presets give their reason', () => {
    const reason = (id: string, k: GccTenantKey) => { const r = presetFor(presets().find((x) => x.id === id)!, k); return isPlan(r) ? 'built' : r.unavailable; };
    return `${reason('rfqs-out', 'corniche')} · ${reason('dg2-committee', 'dafna')}`;
  });

  add('Morning intake is the seed', () => {
    const plans = TENANTS.map((k) => planOf('morning-intake', k)!);
    const writes = plans.every((p) => p.writes.length === 0);
    const audit = plans.every((p) => p.audit.length === 1 && p.audit[0].actorId === PLATFORM_OPERATOR.id);
    return `${writes ? '0 writes in every tenant' : 'writes found'} · ${audit ? '1 audit entry, the presenter’s' : 'other audit entries'}`;
  });

  add('DG1 due unlocks the hero’s DG1 pack', () => {
    const ds = TENANTS.map((k) => ({ k, d: doneOf(planOf('dg1-due', k)!) }));
    const locked = ds.filter(({ k, d }) => dg1PackFor(k, H, d)?.locked).map((x) => x.k);
    const decided = ds.filter(({ k, d }) => dg1RecordFor(k, H, d).current).map((x) => x.k);
    return `${locked.length ? `locked in ${locked.join(', ')}` : 'unlocked in every tenant'} · ${decided.length ? `DG1 recorded in ${decided.join(', ')}` : 'DG1 not recorded'}`;
  });

  add('RFQs out: packages issued and the clock (Najd, Dafna, Qurain)', () => {
    const rows = (['najd', 'dafna', 'qurain'] as GccTenantKey[]).map((k) => {
      const d = doneOf(planOf('rfqs-out', k)!);
      const clock = rfqClock(k, H, d);
      const pkgs = packagesFor(k, H, d);
      const listed = pkgs.filter(({ pkg }) => approvedShortlist(k, H, pkg.id, d)).length;
      const dg1At = dg1RecordFor(k, H, d).current?.at;
      const replies = rfqsFor(k, H, d).filter((r) => r.repliedAt || r.quoteId || r.declined).length;
      return {
        issued: !!clock && listed > 0 && clock.sent === listed && clock.total === pkgs.length,
        fromDg1: !!clock && clock.startAt === dg1At,
        replies, stage: stageRow(k, H, d)?.stage,
      };
    });
    return [
      rows.every((r) => r.issued) ? 'every shortlisted package issued' : 'packages missing',
      rows.every((r) => r.fromDg1) ? 'clock from the DG1 Pursue' : 'clock not from DG1',
      rows.every((r) => r.replies === 0) ? 'no replies' : 'replies found',
      rows.every((r) => r.stage === 2) ? 'Stage 2' : `stages ${rows.map((r) => r.stage).join(', ')}`,
    ].join(' · ');
  });

  add('Info: RFQs out, packages issued of all', () => (['najd', 'dafna', 'qurain'] as GccTenantKey[]).map((k) => {
    const d = doneOf(planOf('rfqs-out', k)!);
    return `${k} ${rfqClock(k, H, d)?.sent} of ${packagesFor(k, H, d).length}`;
  }).join(' · '));

  add('Advance agent work after RFQs out (Najd)', () => {
    const d = doneOf(planOf('rfqs-out', 'najd')!);
    const all = pendingRepliesAll('najd', d);
    const board = pendingReplies('najd', H, d);
    const same = all.length > 0 && JSON.stringify(all.map((x) => x.write.key)) === JSON.stringify(board.map((x) => x.write.key));
    const after = pendingRepliesAll('najd', put(d, all.map((x) => x.write)));
    return `${same ? 'same replies as the package board' : `${all.length} vs ${board.length} on the board`} · ${after.length ? `${after.length} still pending` : 'none pending after'}`;
  });

  add('DG2 committee: T-2026-097', () => {
    const d = doneOf(planOf('dg2-committee', 'najd')!);
    const pv = packVersionsFor('najd', C, d);
    const pos = positionsFor('najd', C, d);
    const seed = positionsFor('najd', C, {});
    return `v${pv.issued?.version} ${pv.issued && pv.issued === pv.current ? 'issued' : 'not the current version'} · ${freshnessFor('najd', C, d)?.stale ? 'stale' : 'fresh'} · ${pos.recorded} of ${pos.seats.length} positions ${pos.recorded === seed.recorded ? 'kept' : `changed from ${seed.recorded}`} · Stage ${stageRow('najd', C, d)?.stage}`;
  });

  add('Audit: summary first, then demo-control entries', () => {
    const plans = TENANTS.flatMap((k) => presets().map((p) => presetFor(p, k))).filter(isPlan);
    const first = plans.every((p) => p.audit[0]?.actorId === PLATFORM_OPERATOR.id && !p.audit[0].target && p.audit[0].action.endsWith('(demo control)'));
    const rest = plans.every((p) => p.audit.slice(1).every((e) => e.action.endsWith('(demo control)') && !!personById(e.actorId)));
    const operatorOnTender = plans.some((p) => p.audit.some((e) => e.actorId === PLATFORM_OPERATOR.id && e.target));
    return `${first ? 'presenter summary first' : 'summary missing'} · ${rest ? 'every other entry marked (demo control)' : 'unmarked entries'} · ${operatorOnTender ? 'operator on a tender entry' : 'no tender audit entry by the operator'}`;
  });

  add('No preset writes outside its tenant', () => {
    const bad: string[] = [];
    let platform = 0;
    for (const k of TENANTS) {
      const ids = new Set(gccData(k).register.map((t) => t.id));
      const vals = new Set(gccData(k).register.flatMap((t) => t.validations.map((v) => v.id)));
      for (const p of presets()) {
        const r = presetFor(p, k);
        if (!isPlan(r)) continue;
        for (const w of r.writes) {
          if (w.key.startsWith('tn-')) platform++;
          const tids = w.key.match(/T-\d{4}-\d{3}/g) ?? [];
          const val = /^val:(.+)$/.exec(w.key)?.[1];
          if (val ? !vals.has(val) : !tids.length || tids.some((t) => !ids.has(t))) bad.push(`${k}:${w.key}`);
        }
      }
    }
    return `${bad.length ? `outside: ${bad.slice(0, 3).join(', ')}` : 'every key names this tenant’s tenders or fields'} · ${platform ? `${platform} in the platform bucket` : 'none in the platform bucket'}`;
  });

  add('Compare: the five answers of dev-check 70', () => compareHero({ doneBy: {} }).map((c) => `${c.tenant} ${c.fit.score} ${c.recommendation.label}`).join(' · '));

  for (const [k, id, label] of [['corniche', 'T-2026-061', 'Corniche'], ['batinah', 'T-2026-042', 'Batinah']] as const) {
    add(`Advance to Stage 3: ${id} (${label})`, () => {
      const before = stage3Entry(k, id, {});
      const d0 = pursued(k, id);
      const w = stage3EntryWrite(k, id, `${k}.bid`, '2026-03-08T10:05', d0);
      if ('error' in w) throw new Error(w.error);
      const d = put(d0, w.writes);
      const l = lifecycle(k, id, d)!;
      const f = l.facts?.stage === 3 ? l.facts : null;
      const port = dataPort()!.rows(k, { kind: 'all' }, personById(`${k}.hot`)!, 'live', d).find((r) => r.id === id);
      const hero = stageRow(k, H, d)?.stage;
      return [
        `before DG1: Stage ${stageRow(k, id, {})?.stage} ${before && !before.ok ? 'refused' : 'allowed'}`,
        `after: Stage ${currentOf(l).stage} · ${currentOf(l).step}`,
        `pack v${packVersionsFor(k, id, d).current?.version}`,
        `${f?.inputs.requested ?? inputsFor(k, id, d).totals.requested} inputs`,
        `port stage ${port?.stage}`,
        `hero still Stage ${hero}`,
      ].join(' · ');
    });
    // Info: the facility figure the Stage 3 facts carry (the pack's §9.5), beside the plan's reading of it.
    add(`Info: ${id} facility after the bond`, () => {
      const d0 = pursued(k, id);
      const w = stage3EntryWrite(k, id, `${k}.bid`, '2026-03-08T10:05', d0);
      if ('error' in w) throw new Error(w.error);
      const d = put(d0, w.writes);
      const f = lifecycle(k, id, d)!.facts;
      const fa = f?.stage === 3 ? f.facilityAfter : null;
      const hr = facilityHeadroom(k).headroom;
      const bb = bidBondFor(k, id, d)?.amount;
      return `facts ${fa ? money(fa.amount, fa.ccy) : '—'} · headroom − bid bond ${bb ? money(hr.amount - bb.amount, hr.ccy) : '—'}`;
    });
  }
  return out;
}

export default function PresenterCheck() {
  if (!dataPort()) return <CardHead title="Presenter controls (plan 014)" meta="No data port" />;
  const rows = checks().map((c) => ({ ...c, expected: EXPECT[c.name] }));
  const targeted = rows.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => c.expected !== c.got).length;
  return (
    <>
      <CardHead title="Presenter controls (plan 014)" meta={failing ? `${failing} of ${targeted.length} targets failing` : `All ${targeted.length} targets met`} />
      <DataTable
        rows={rows}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Derived value', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '2fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
