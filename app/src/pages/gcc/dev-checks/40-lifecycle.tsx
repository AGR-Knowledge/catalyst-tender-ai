import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { windowOf, PERIODS, type PeriodKey } from '@/domain/gcc/period';
import { GCC_DATA, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { GENERATION, LIFECYCLES, LIFECYCLE_LOAD_MS, buildLifecycles } from '@/data/gcc/lifecycle';
import { FLOW_TARGETS, LIVE_TARGETS, NAJD_PIPELINE, RESULT_SPLITS, WINDOW_FROM, WINDOW_KEYS } from '@/data/gcc/lifecycle/targets';
import { hash32 } from '@/data/gcc/lifecycle/rng';
import { hoursBetween } from '@/data/gcc/lifecycle/chain';
import { personById } from '@/data/people';
import {
  capturesIn, currentOf, gateEventsIn, healthOf, lifecyclesOf, liveOf, openGate, resultsIn, submissionsIn,
} from '@/domain/gcc/lifecycle';
import { port } from '@/domain/gcc/lifecycle.port';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { TenderTracker } from '@/components/dashboard/TenderTracker';

/**
 * Plan 017: the lifecycles against dashboards.md §12. Every count is taken
 * again through `domain/gcc/lifecycle.ts` and period.ts windows, not the
 * generator's own counter, so a disagreement between the two shows here.
 */

interface Check { name: string; expected?: string; got: string }

const label = (k: PeriodKey) => PERIODS.find((p) => p.key === k)!.label;
const split = (xs: { g: { decision: string } }[], keys: string[]) => `${xs.length} (${keys.map((k) => xs.filter((x) => x.g.decision === k).length).join(' · ')})`;
const onTime = (xs: { g: { onTime: boolean } }[]) => `${xs.filter((x) => x.g.onTime).length} / ${xs.length}`;
const pctOf = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—');

/** Every flow of dashboards.md §12.3 for one window: target and got. */
function flowChecks(key: GccTenantKey, k: PeriodKey): Check[] {
  const t = FLOW_TARGETS[key][k];
  if (!t) return [];
  const w = windowOf(k, key);
  const p = `${label(k)} · `;
  const dg1 = gateEventsIn(key, w, 'DG1');
  const dg2 = gateEventsIn(key, w, 'DG2');
  const dg3 = gateEventsIn(key, w, 'DG3');
  const subs = submissionsIn(key, w);
  const res = resultsIn(key, w);
  const ccy = GCC_DATA[key].fit.band.min.ccy;
  const avg = subs.length ? subs.reduce((s, x) => s + x.l.value.amount, 0) / subs.length : null;
  const out: Check[] = [];
  if (t.captured !== undefined) out.push({ name: `${p}Notices captured`, expected: String(t.captured), got: String(capturesIn(key, w).captured) });
  out.push({ name: `${p}DG1 (pursue · discard · hold)`, expected: `${t.dg1.total} (${t.dg1.by.pursue} · ${t.dg1.by.discard} · ${t.dg1.by.hold})`, got: split(dg1, ['pursue', 'discard', 'hold']) });
  if (t.dg1.onTime !== undefined) out.push({ name: `${p}DG1 on time`, expected: `${t.dg1.onTime} / ${t.dg1.total}`, got: onTime(dg1) });
  out.push({ name: `${p}DG2 (bid · no-bid)`, expected: `${t.dg2.total} (${t.dg2.by.bid} · ${t.dg2.by['no-bid']})`, got: split(dg2, ['bid', 'no-bid']) });
  if (t.dg2.onTime !== undefined) out.push({ name: `${p}DG2 on time`, expected: `${t.dg2.onTime} / ${t.dg2.total}`, got: onTime(dg2) });
  out.push({ name: `${p}DG3 (approved · rejected)`, expected: `${t.dg3.total} (${t.dg3.by.approved} · ${t.dg3.by.rejected})`, got: split(dg3, ['approved', 'rejected']) });
  if (t.dg3.onTime !== undefined) out.push({ name: `${p}DG3 on time`, expected: `${t.dg3.onTime} / ${t.dg3.total}`, got: onTime(dg3) });
  out.push({ name: `${p}Bids submitted`, expected: String(t.submitted), got: String(subs.length) });
  if (t.avgTicketM !== undefined) {
    out.push({
      name: `${p}PF-2 average ticket`, expected: t.avgTicketM === null ? 'No bids submitted' : money(t.avgTicketM * 1_000_000, ccy),
      got: avg === null ? 'No bids submitted' : money(avg, ccy),
    });
  }
  out.push({ name: `${p}Results (won · lost)`, expected: `${t.results.won + t.results.lost} (${t.results.won} · ${t.results.lost})`, got: `${res.length} (${res.filter((x) => x.r.result === 'won').length} · ${res.filter((x) => x.r.result === 'lost').length})` });
  if (t.dg1.onTime !== undefined && t.dg2.onTime !== undefined && t.dg3.onTime !== undefined) {
    const all = [...dg1, ...dg2, ...dg3];
    const n = t.dg1.total + t.dg2.total + t.dg3.total;
    const ok = t.dg1.onTime + t.dg2.onTime + t.dg3.onTime;
    out.push({ name: `${p}PF-4 decisions on time`, expected: n ? `${ok} / ${n} (${pctOf(ok, n)})` : '0 / 0', got: all.length ? `${all.filter((x) => x.g.onTime).length} / ${all.length} (${pctOf(all.filter((x) => x.g.onTime).length, all.length)})` : '0 / 0' });
  }
  return out;
}

function splitChecks(key: GccTenantKey): Check[] {
  if (key !== 'najd') return [];
  const w12 = windowOf('12m', key);
  const w90 = windowOf('90d', key);
  const res = resultsIn(key, w12);
  const won = res.filter((x) => x.r.result === 'won');
  const lost = res.filter((x) => x.r.result === 'lost');
  const out: Check[] = [];
  for (const [sector, n] of Object.entries(RESULT_SPLITS.wonBySector)) out.push({ name: `12 months · won in ${sector}`, expected: String(n), got: String(won.filter((x) => x.l.sector === sector).length) });
  for (const [reason, n] of Object.entries(RESULT_SPLITS.lossReasons)) out.push({ name: `12 months · lost on ${reason}`, expected: String(n), got: String(lost.filter((x) => x.r.lossReason === reason).length) });
  for (const b of RESULT_SPLITS.calibration) {
    const xs = res.filter((x) => x.r.predictedWin !== undefined && x.r.predictedWin >= b.min && x.r.predictedWin <= b.max);
    out.push({ name: `Calibration ${b.band}: bids · won`, expected: `${b.bids} · ${b.won}`, got: `${xs.length} · ${xs.filter((x) => x.r.result === 'won').length}` });
  }
  const dg2 = gateEventsIn(key, w12, 'DG2');
  out.push({ name: '12 months · DG2 approved against the majority', expected: String(RESULT_SPLITS.dg2.againstMajority), got: String(dg2.filter((x) => x.g.againstMajority).length) });
  out.push({ name: '12 months · DG2 re-opened', expected: String(RESULT_SPLITS.dg2.reopened), got: String(dg2.filter((x) => x.g.reopened).length) });
  const dg1 = gateEventsIn(key, w90, 'DG1');
  const overrides = dg1.filter(({ g }) => (g.decision === 'pursue' && g.recommendation === 'discard') || (g.decision === 'discard' && g.recommendation === 'pursue'));
  out.push({ name: '90 days · DG1 overrides (client relationship)', expected: `${RESULT_SPLITS.dg1.overrides} (${RESULT_SPLITS.dg1.overridesClientRelationship})`, got: `${overrides.length} (${overrides.filter((x) => x.g.reasonCodes.includes('client-relationship')).length})` });
  for (const [code, n] of Object.entries(RESULT_SPLITS.dg1.discardReasons)) {
    out.push({ name: `90 days · discarded: ${code}`, expected: String(n), got: String(dg1.filter((x) => x.g.decision === 'discard' && x.g.reasonCodes[0] === code).length) });
  }
  const h = GCC_DATA[key].history;
  out.push({ name: 'Derived history: DG2 decisions · on time · against majority · re-opened', expected: '54 · 51 · 2 · 2', got: `${h.dg2.length} · ${h.dg2.filter((r) => r.withinSla).length} · ${h.dg2.filter((r) => r.againstMajority).length} · ${h.dg2.filter((r) => r.reopened).length}` });
  return out;
}

function compute(key: GccTenantKey) {
  const lcs = lifecyclesOf(key);
  const live = liveOf(key);
  const checks: Check[] = [];
  const byStage = (n: number) => live.filter((l) => currentOf(l).stage === n);
  for (let n = 1; n <= 9; n++) checks.push({ name: `Live now · Stage ${n}`, expected: String((LIVE_TARGETS[key] as Record<number, number>)[n]), got: String(byStage(n).length) });
  if (key === 'najd') {
    const pf1 = live.filter((l) => currentOf(l).stage >= 2 && currentOf(l).stage <= 8);
    checks.push({ name: 'PF-1 · Stages 2–8', expected: `${NAJD_PIPELINE.tenders} · ${money(NAJD_PIPELINE.valueM * 1_000_000, 'SAR')}`, got: `${pf1.length} · ${money(pf1.reduce((s, l) => s + l.value.amount, 0), 'SAR')}` });
    const coord = personById('najd.coord');
    if (coord) checks.push({ name: 'Stage 1 for people not cleared (Tender Coordinator)', expected: '11', got: String(port.rows(key, { kind: 'stage', stage: 1 }, coord, 'live').length) });
  }
  for (const k of WINDOW_KEYS) checks.push(...flowChecks(key, k));
  checks.push(...splitChecks(key));

  // §12.5 for every tenant.
  const s7 = byStage(7);
  checks.push({ name: 'Stage 7 tender has a DG3 pack waiting', expected: 'yes', got: s7.length && s7.every((l) => openGate(l)?.gate === 'DG3') ? 'yes' : 'no' });
  checks.push({ name: 'A DG1 decision in the last 7 days', expected: 'yes', got: gateEventsIn(key, windowOf('7d', key), 'DG1').length ? 'yes' : 'no' });
  checks.push({ name: 'A result in the last 30 days', expected: 'yes', got: resultsIn(key, windowOf('30d', key)).length ? 'yes' : 'no' });

  // SRC-1: RFQs out within 24 h of Pursue.
  const pursued = lcs.filter((l) => l.gates.some((g) => g.gate === 'DG1' && g.decision === 'pursue') && l.log.some((e) => e.step === 'rfqs-out'));
  const quick = (l: typeof lcs[number]) => hoursBetween(l.gates.find((g) => g.gate === 'DG1')!.at, l.log.find((e) => e.step === 'rfqs-out')!.at) <= 24;
  checks.push({ name: 'RFQs out within 24 h of Pursue (≥ 95%)', expected: 'yes', got: pursued.filter(quick).length >= 0.95 * pursued.length ? 'yes' : `no (${pursued.filter(quick).length} of ${pursued.length})` });
  if (key === 'najd') {
    const w90 = windowOf('90d', key);
    const recent = pursued.filter((l) => l.gates.some((g) => g.gate === 'DG1' && g.at >= w90.from));
    checks.push({ name: 'RFQs out within 24 h, Najd last 90 days (100%)', expected: `${recent.length} of ${recent.length}`, got: `${recent.filter(quick).length} of ${recent.length}` });
  }

  // Data rules.
  for (const l of live) {
    if (l.facts?.stage === 3) checks.push({ name: `${l.tenderId} · positions recorded = seats in bySeat`, expected: String(Object.keys(l.facts.positions.bySeat).length), got: String(l.facts.positions.recorded) });
  }
  const hosts = [...new Set(lcs.flatMap((l) => (l.source.url ? [new URL(l.source.url).host] : [])))];
  checks.push({ name: 'Notice URLs on .example hosts only', expected: 'yes', got: hosts.every((h) => h.endsWith('.example')) ? 'yes' : hosts.filter((h) => !h.endsWith('.example')).join(', ') });
  for (const k of WINDOW_KEYS) checks.push({ name: `Window start agrees with period.ts · ${label(k)}`, expected: windowOf(k, key).from, got: WINDOW_FROM[k] });

  // Determinism: the module-load data and two fresh builds hash the same.
  const loaded = hash32(JSON.stringify(LIFECYCLES[key]));
  const a = hash32(JSON.stringify(buildLifecycles(key).lifecycles));
  const b = hash32(JSON.stringify(buildLifecycles(key).lifecycles));
  checks.push({ name: 'Determinism (load · build · build)', expected: loaded.toString(16), got: a === b ? a.toString(16) : `${a.toString(16)} ≠ ${b.toString(16)}` });

  const origins = lcs.reduce<Record<string, number>>((m, l) => ({ ...m, [l.origin]: (m[l.origin] ?? 0) + 1 }), {});
  return { lcs, live, checks, origins };
}

const pass = (c: Check) => c.expected === undefined || c.expected === c.got;

export default function LifecycleCheck() {
  const key = useTenantKey();
  const r = useMemo(() => (isGccTenantKey(key) ? compute(key) : null), [key]);
  if (!isGccTenantKey(key) || !r) return <CardHead title="Lifecycles" meta="No lifecycles for this tenant" />;
  const viewer = personById(`${key}.hot`)!;
  const failing = r.checks.filter((c) => !pass(c)).length;
  const trackerIds = [...new Set([
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => r.live.filter((l) => currentOf(l).stage === n).slice(0, 1).map((l) => l.tenderId)),
    ...(key === 'najd' ? ['T-2026-112', 'T-2025-262'] : []),
  ])];

  return (
    <>
      <CardHead title="Lifecycles: flows, live counts and trackers" meta={failing ? `${failing} of ${r.checks.length} checks failing` : `All ${r.checks.length} checks pass`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Lifecycles" v={`${r.lcs.length} · ${Object.entries(r.origins).map(([o, n]) => `${o} ${n}`).join(' · ')}`} />
        <KV k="Generator" v={`${GENERATION[key].generated} generated${GENERATION[key].notes.length ? ` · ${GENERATION[key].notes.join('; ')}` : ''}`} />
        <KV k="Load time, all GCC tenants" v={`${LIFECYCLE_LOAD_MS.toFixed(1)} ms (target under 50 ms)`} />
      </div>
      <DataTable
        rows={r.checks}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Check', width: '2fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '1.1fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '1.1fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : pass(c) ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
      <DataTable
        rows={r.live}
        rowKey={(l) => l.tenderId}
        columns={[
          { key: 'id', header: 'Live tender', width: '1.6fr', primary: true, render: (l) => <span className="cell-main">{l.tenderId} · {l.shortTitle}</span> },
          { key: 's', header: 'Stage · step', width: '1fr', render: (l) => `${currentOf(l).stage} · ${currentOf(l).step}` },
          { key: 'h', header: 'Health', width: '.7fr', render: (l) => healthOf(l, key).health },
          { key: 'why', header: 'Reason', width: '2fr', priority: 2, render: (l) => healthOf(l, key).reason ?? '—' },
        ]}
      />
      <div style={{ padding: '10px 22px 16px' }}>
        {trackerIds.map((id) => {
          const t = port.tracker(key, id, viewer);
          if (!t) return <KV key={id} k={id} v="not visible" />;
          const nodes = t.nodes.map((n) => `${n.label} ${n.status === 'done' ? '✓' : n.status === 'current' ? '●' : n.status === 'stopped' ? '✕' : '○'}${n.decision ? ` ${n.decision.label}${n.decision.onTime ? '' : ` (late by ${n.decision.lateBy})`}` : ''}`).join(' · ');
          return <KV key={id} k={`${id} · ${t.health}`} v={`${nodes}${t.now ? ` — Now: ${t.now.stageLabel} · ${t.now.stepLabel} · ${t.now.status}` : ''}${t.outcome ? ` — ${t.outcome}` : ''}`} />;
        })}
      </div>
      {/* The port's tracker in plan 006's component: the view-model contract, rendered. */}
      {trackerIds.slice(0, 3).map((id) => {
        const t = port.tracker(key, id, viewer);
        return t ? <TenderTracker key={`vm-${id}`} vm={t} focusOnOpen={false} /> : null;
      })}
    </>
  );
}
