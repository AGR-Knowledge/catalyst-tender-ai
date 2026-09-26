import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { dayFlags, isWorkingDay } from '@/domain/calendar';
import { windowOf, PERIODS, type PeriodKey } from '@/domain/gcc/period';
import { GCC_DATA, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { HERO_ID, HERO_REF } from '@/data/gcc/hero';
import { TENANTS } from '@/data/tenants';
import { GENERATION, LIFECYCLES, LIFECYCLE_LOAD_MS, LIFECYCLE_SEEDS, buildLifecycles } from '@/data/gcc/lifecycle';
import { FLOW_TARGETS, LIVE_TARGETS, NAJD_PIPELINE, RESULT_SPLITS, WINDOW_FROM, WINDOW_KEYS } from '@/data/gcc/lifecycle/targets';
import { hash32 } from '@/data/gcc/lifecycle/rng';
import { hoursBetween } from '@/data/gcc/lifecycle/chain';
import { POOLS } from '@/data/gcc/lifecycle/pools';
import { authoredRef } from '@/data/gcc/lifecycle/live/common';
import { personById, type Person } from '@/data/people';
import {
  capturesIn, currentOf, eligibilityOf, gateEventsIn, healthOf, lifecycle, lifecyclesOf, liveOf, openGate, resultsIn, staleOf, submissionsIn, visibleOf,
} from '@/domain/gcc/lifecycle';
import { port } from '@/domain/gcc/lifecycle.port';
import { eligibilityFor } from '@/domain/gcc/s1';
import { freshnessFor } from '@/domain/gcc/s3';
import { column } from '@/components/dashboard/columns';
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
  const dg1 = gateEventsIn(key, w, 'DG1', undefined, {});
  const dg2 = gateEventsIn(key, w, 'DG2', undefined, {});
  const dg3 = gateEventsIn(key, w, 'DG3', undefined, {});
  const subs = submissionsIn(key, w, undefined, {});
  const res = resultsIn(key, w, undefined, undefined, {});
  const ccy = GCC_DATA[key].fit.band.min.ccy;
  const avg = subs.length ? subs.reduce((s, x) => s + x.l.value.amount, 0) / subs.length : null;
  const out: Check[] = [];
  if (t.captured !== undefined) out.push({ name: `${p}Notices captured`, expected: String(t.captured), got: String(capturesIn(key, w, undefined, {}).captured) });
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
  const res = resultsIn(key, w12, undefined, undefined, {});
  const won = res.filter((x) => x.r.result === 'won');
  const lost = res.filter((x) => x.r.result === 'lost');
  const out: Check[] = [];
  for (const [sector, n] of Object.entries(RESULT_SPLITS.wonBySector)) out.push({ name: `12 months · won in ${sector}`, expected: String(n), got: String(won.filter((x) => x.l.sector === sector).length) });
  for (const [reason, n] of Object.entries(RESULT_SPLITS.lossReasons)) out.push({ name: `12 months · lost on ${reason}`, expected: String(n), got: String(lost.filter((x) => x.r.lossReason === reason).length) });
  for (const b of RESULT_SPLITS.calibration) {
    const xs = res.filter((x) => x.r.predictedWin !== undefined && x.r.predictedWin >= b.min && x.r.predictedWin <= b.max);
    out.push({ name: `Calibration ${b.band}: bids · won`, expected: `${b.bids} · ${b.won}`, got: `${xs.length} · ${xs.filter((x) => x.r.result === 'won').length}` });
  }
  const dg2 = gateEventsIn(key, w12, 'DG2', undefined, {});
  out.push({ name: '12 months · DG2 approved against the majority', expected: String(RESULT_SPLITS.dg2.againstMajority), got: String(dg2.filter((x) => x.g.againstMajority).length) });
  out.push({ name: '12 months · DG2 re-opened', expected: String(RESULT_SPLITS.dg2.reopened), got: String(dg2.filter((x) => x.g.reopened).length) });
  const dg1 = gateEventsIn(key, w90, 'DG1', undefined, {});
  const overrides = dg1.filter(({ g }) => (g.decision === 'pursue' && g.recommendation === 'discard') || (g.decision === 'discard' && g.recommendation === 'pursue'));
  out.push({ name: '90 days · DG1 overrides (client relationship)', expected: `${RESULT_SPLITS.dg1.overrides} (${RESULT_SPLITS.dg1.overridesClientRelationship})`, got: `${overrides.length} (${overrides.filter((x) => x.g.reasonCodes.includes('client-relationship')).length})` });
  for (const [code, n] of Object.entries(RESULT_SPLITS.dg1.discardReasons)) {
    out.push({ name: `90 days · discarded: ${code}`, expected: String(n), got: String(dg1.filter((x) => x.g.decision === 'discard' && x.g.reasonCodes[0] === code).length) });
  }
  const h = GCC_DATA[key].history;
  out.push({ name: 'Derived history: DG2 decisions · on time · against majority · re-opened', expected: '54 · 51 · 2 · 2', got: `${h.dg2.length} · ${h.dg2.filter((r) => r.withinSla).length} · ${h.dg2.filter((r) => r.againstMajority).length} · ${h.dg2.filter((r) => r.reopened).length}` });
  return out;
}

/* ---------------------------------------------------------- plan 020 lane B */

const WIN_KEYS = ['winP', 'winBand', 'positionsRecorded', 'quorum', 'weightedValue'];

/** B1 and B2 (Najd): what a viewer sees of T-2026-097's win and positions and T-2025-322's price, through the rows and the tracker. */
function maskingChecks(key: GccTenantKey): Check[] {
  if (key !== 'najd') return [];
  const S3 = 'T-2026-097';
  const S5 = 'T-2025-322';
  const sight = (p: Person) => {
    const rows = port.rows(key, { kind: 'all' }, p, 'live', {});
    const r3 = rows.find((r) => r.id === S3);
    const r5 = rows.find((r) => r.id === S5);
    const t3 = port.tracker(key, S3, p, {})?.now?.status ?? '';
    const t5 = port.tracker(key, S5, p, {})?.now?.status ?? '';
    const shown: string[] = [];
    const hidden: string[] = [];
    const put = (ok: boolean, what: string) => (ok ? shown : hidden).push(what);
    if (r3) {
      put(r3.win !== null, 'win');
      for (const k of WIN_KEYS) put(r3.facts[k] !== null, k);
      put(/win \d+ ± \d+/.test(t3), 'tracker win');
      put(/\d+ of \d+ positions/.test(t3), 'tracker positions');
    }
    if (r5) {
      put(r5.facts.estPrice !== null, 'estPrice');
      put(/Estimated price [A-Z]{3} /.test(t5), 'tracker price');
    }
    return { shown, hidden, visible: `${r3 ? 'T-2026-097' : ''}${r5 ? ' T-2025-322' : ''}`.trim() || 'neither' };
  };
  const out: Check[] = [];
  for (const role of ['coord', 'proc', 'prop', 'plan']) {
    const p = personById(`${key}.${role}`);
    if (!p) continue;
    const s = sight(p);
    out.push({ name: `B1/B2 · ${p.name} (${role}) sees no win, positions or price (rows visible: ${s.visible})`, expected: 'none shown', got: s.shown.length ? `shown: ${s.shown.join(', ')}` : 'none shown' });
  }
  for (const role of ['hot', 'bid']) {
    const p = personById(`${key}.${role}`);
    if (!p) continue;
    const s = sight(p);
    out.push({ name: `B1/B2 · ${p.name} (${role}) sees win, positions and price`, expected: 'all shown', got: s.hidden.length ? `hidden: ${s.hidden.join(', ')}` : s.shown.length ? 'all shown' : 'not visible' });
  }
  return out;
}

/** B3 (Najd): the restricted lane is left out for people not cleared through every query, not only the table rows. */
function visibilityChecks(key: GccTenantKey): Check[] {
  if (key !== 'najd') return [];
  const out: Check[] = [];
  const today = windowOf('today', key);
  const all = capturesIn(key, today, undefined, {}).captured;
  for (const [role, restricted] of [['hot', 0], ['coord', 1]] as const) {
    const p = personById(`${key}.${role}`);
    if (!p) continue;
    const n = LIVE_TARGETS[key][1] - restricted;
    const s1 = [
      liveOf(key, p, {}).filter((l) => currentOf(l).stage === 1).length,
      port.rows(key, { kind: 'stage', stage: 1 }, p, 'live', {}).length,
      visibleOf(key, p).filter((l) => !l.closedAt && currentOf(l).stage === 1).length,
    ].join(' · ');
    out.push({ name: `B3 · Stage 1 now for ${p.name} (liveOf · port rows · visibleOf)`, expected: `${n} · ${n} · ${n}`, got: s1 });
    out.push({ name: `B3 · Captured today for ${p.name}`, expected: String(all - restricted), got: String(capturesIn(key, today, p, {}).captured) });
  }
  return out;
}

/** B4, B6, B7, B8, B11, B13, B17: references, dates, the facility and the WCWS history, every tenant. */
function dataChecks(key: GccTenantKey): Check[] {
  const out: Check[] = [];
  const lcs = lifecyclesOf(key, undefined, {});
  const seed = LIFECYCLE_SEEDS[key];
  const cc = TENANTS.find((t) => t.key === key)!.countryCode;

  // B4: references.
  const authored = lcs.filter((l) => l.tenderId === HERO_ID || authoredRef(seed, l.tenderId));
  const changed = authored.filter((l) => l.source.ref !== (l.tenderId === HERO_ID ? HERO_REF : authoredRef(seed, l.tenderId)));
  out.push({ name: `B4 · References plan 004 authored, kept (${authored.length})`, expected: 'all kept', got: changed.length ? `changed: ${changed.map((l) => `${l.tenderId} ${l.source.ref}`).join(', ')}` : 'all kept' });
  const reused = lcs.filter((l) => !authored.includes(l)).filter((l) => {
    const m = l.source.ref.match(/\/(\d{4})\/(\d{4})$/);
    return m && Number(m[2]) === Number(l.tenderId.slice(7));
  });
  out.push({ name: 'B4 · Generated references never repeat the TID number', expected: '0', got: reused.length ? `${reused.length}: ${reused.slice(0, 3).map((l) => `${l.tenderId} ${l.source.ref}`).join(', ')}` : '0' });
  if (key === 'najd') {
    out.push({ name: 'B4 · T-2026-097 reference (Addendum 2 base)', expected: 'WCWS/PRJ/2026/0009', got: lifecycle(key, 'T-2026-097', {})?.source.ref ?? '—' });
    // B6: the hero's documents arrived with the intake event, not at the purchase approval.
    const hero = lifecycle(key, HERO_ID, {});
    const ev = seed.intakeToday.find((e) => e.tenderId === HERO_ID && e.docType !== 'Addendum');
    out.push({ name: 'B6 · Hero documents in (intake event)', expected: ev?.receivedAt ?? '—', got: hero?.log.find((e) => e.step === 'documents-in')?.at ?? '—' });
    // B7: T-2026-079 before Founding Day.
    const t079 = lifecycle(key, 'T-2026-079', {});
    const dg3 = t079?.gates.find((g) => g.gate === 'DG3');
    out.push({ name: 'B7 · T-2026-079 submitted · days after DG3', expected: '2026-02-19 · 3', got: t079?.submission && dg3 ? `${t079.submission.at.slice(0, 10)} · ${Math.round(hoursBetween(dg3.at, t079.submission.at) / 24)}` : '—' });
    // B13: the WCWS client history belongs to plan 009a.
    const clients = POOLS[key].authoredClients ?? [];
    const wcws = lcs.filter((l) => clients.includes(l.issuer) && (l.submission || l.result));
    out.push({ name: 'B13 · WCWS lifecycles with a submission or result (009a holds the history)', expected: 'none', got: wcws.map((l) => l.tenderId).join(', ') || 'none' });
  }
  const offDay = lcs.filter((l) => l.submission && !isWorkingDay(l.submission.at.slice(0, 10), cc));
  out.push({ name: 'B7 · Every submission on a working day', expected: 'yes', got: offDay.length ? `no: ${offDay.map((l) => `${l.tenderId} ${l.submission!.at.slice(0, 10)}`).join(', ')}` : 'yes' });
  // B8: no live deadline inside an expected closure.
  const closed = lcs.filter((l) => !l.closedAt && l.submissionDeadline && dayFlags(l.submissionDeadline.date, cc).some((f) => f.key === 'closure-expected' || f.key === 'closure'));
  out.push({ name: 'B8 · Live submission deadlines inside a closure', expected: 'none', got: closed.map((l) => `${l.tenderId} ${l.submissionDeadline!.date}`).join(', ') || 'none' });
  // B11: every issued Stage 8 bid bond is committed on the facility.
  const committed = seed.facility.committed;
  const bondOf = (l: typeof lcs[number]) => (l.facts?.stage === 8 && l.facts.bond.issued ? l.facts.bond : null);
  const bonds = lcs.filter((l) => !l.closedAt && bondOf(l));
  const missing = bonds.filter((l) => !committed.some((c) => c.tenderId === l.tenderId && c.amount.amount === bondOf(l)!.amount.amount));
  out.push({ name: `B11 · Issued Stage 8 bid bonds on the facility (${bonds.length})`, expected: 'all', got: missing.length ? `missing: ${missing.map((l) => l.tenderId).join(', ')}` : 'all' });
  // B17: the stale sentence is 009a's.
  for (const l of lcs.filter((x) => !x.closedAt && x.facts?.stage === 3)) {
    const f = freshnessFor(key, l.tenderId, {});
    const st = staleOf(key, l);
    out.push({ name: `B17 · ${l.tenderId} · stale text`, expected: f ? (f.stale ? `009a: ${f.stale.reason}` : 'fresh') : 'no 009a pack', got: st ? `${st.from}: ${st.text}` : f ? 'fresh' : 'no 009a pack' });
  }
  return out;
}

/** B12: every Stage 1 tender with requirements shows 007a's counts, and keeps no copy of its own. */
function eligibilityChecks(key: GccTenantKey): Check[] {
  const viewer = personById(`${key}.hot`);
  if (!viewer) return [];
  const rows = port.rows(key, { kind: 'stage', stage: 1 }, viewer, 'live', {});
  const out: Check[] = [];
  for (const l of liveOf(key, undefined, {}).filter((x) => x.facts?.stage === 1)) {
    const e = eligibilityFor(key, l.tenderId, {});
    if (!e) continue;
    const r = rows.find((x) => x.id === l.tenderId);
    const f = r?.facts ?? {};
    const derived = eligibilityOf(key, l);
    const copy = l.facts?.stage === 1 && l.facts.eligibility ? ' · stored copy' : '';
    out.push({
      name: `B12 · ${l.tenderId} eligibility = 007a (pass · at risk · interpretation · fail)`,
      expected: `${e.counts.met} · ${e.counts.atRisk} · ${e.counts.interpretation} · ${e.counts.fail}`,
      got: `${f.eligPass} · ${f.eligAtRisk} · ${f.eligInterpretation} · ${f.eligFail}${derived?.from === '007a' ? '' : ' · interim'}${copy}`,
    });
  }
  return out;
}

/** B18: every step-fact key the port emits has a column header. */
function headerChecks(key: GccTenantKey): Check[] {
  const viewer = personById(`${key}.hot`);
  if (!viewer) return [];
  const keys = new Set(port.rows(key, { kind: 'all' }, viewer, 'all', {}).flatMap((r) => Object.keys(r.facts).filter((k) => !k.endsWith('.masked'))));
  const missing = [...keys].filter((k) => !column(k));
  return [{ name: `B18 · Step-fact keys with a column header (${keys.size})`, expected: 'all', got: missing.length ? `missing: ${missing.join(', ')}` : 'all' }];
}

function compute(key: GccTenantKey) {
  const lcs = lifecyclesOf(key, undefined, {});
  const live = liveOf(key, undefined, {});
  const checks: Check[] = [];
  const byStage = (n: number) => live.filter((l) => currentOf(l).stage === n);
  for (let n = 1; n <= 9; n++) checks.push({ name: `Live now · Stage ${n}`, expected: String((LIVE_TARGETS[key] as Record<number, number>)[n]), got: String(byStage(n).length) });
  if (key === 'najd') {
    const pf1 = live.filter((l) => currentOf(l).stage >= 2 && currentOf(l).stage <= 8);
    checks.push({ name: 'PF-1 · Stages 2–8', expected: `${NAJD_PIPELINE.tenders} · ${money(NAJD_PIPELINE.valueM * 1_000_000, 'SAR')}`, got: `${pf1.length} · ${money(pf1.reduce((s, l) => s + l.value.amount, 0), 'SAR')}` });
  }
  for (const k of WINDOW_KEYS) checks.push(...flowChecks(key, k));
  checks.push(...splitChecks(key));
  checks.push(...maskingChecks(key), ...visibilityChecks(key), ...dataChecks(key), ...eligibilityChecks(key), ...headerChecks(key));

  // §12.5 for every tenant.
  const s7 = byStage(7);
  checks.push({ name: 'Stage 7 tender has a DG3 pack waiting', expected: 'yes', got: s7.length && s7.every((l) => openGate(l)?.gate === 'DG3') ? 'yes' : 'no' });
  checks.push({ name: 'A DG1 decision in the last 7 days', expected: 'yes', got: gateEventsIn(key, windowOf('7d', key), 'DG1', undefined, {}).length ? 'yes' : 'no' });
  checks.push({ name: 'A result in the last 30 days', expected: 'yes', got: resultsIn(key, windowOf('30d', key), undefined, undefined, {}).length ? 'yes' : 'no' });

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
          const t = port.tracker(key, id, viewer, {});
          if (!t) return <KV key={id} k={id} v="not visible" />;
          const nodes = t.nodes.map((n) => `${n.label} ${n.status === 'done' ? '✓' : n.status === 'current' ? '●' : n.status === 'stopped' ? '✕' : '○'}${n.decision ? ` ${n.decision.label}${n.decision.onTime ? '' : ` (late by ${n.decision.lateBy})`}` : ''}`).join(' · ');
          return <KV key={id} k={`${id} · ${t.health}`} v={`${nodes}${t.now ? ` — Now: ${t.now.stageLabel} · ${t.now.stepLabel} · ${t.now.status}` : ''}${t.outcome ? ` — ${t.outcome}` : ''}`} />;
        })}
      </div>
      {/* The port's tracker in plan 006's component: the view-model contract, rendered. */}
      {trackerIds.slice(0, 3).map((id) => {
        const t = port.tracker(key, id, viewer, {});
        return t ? <TenderTracker key={`vm-${id}`} vm={t} focusOnOpen={false} /> : null;
      })}
    </>
  );
}
