import { useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { gccData, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { HERO_FILE_NAME, HERO_ID } from '@/data/gcc/hero';
import { s1Data } from '@/data/gcc/s1';
import {
  addendaFor, auditText, bidBondFor, eligibilityFor, fitFor, fitScoresFor, keyDatesFor, latestAddendumBadge, pipelineFor, prepRatio, queriesFor,
  queueStats, radarFor, readDone, recogniseUpload, triageFor, validationAction, validationsOf, blockingOpen, eligibilityRisks, facilityHeadroom,
  asCommitment, peakMonth, type Commitment, type Done, type EligibilityResult, type JvScenario,
} from '@/domain/gcc/s1';
import {
  DISCARD_REASONS, dg1PackFor, dg1Queue, dg1RecordFor, dg1Reopen, dg1Write, reasonLabel, stageOverlay, validateDg1, type Dg1Decision,
} from '@/domain/gcc/dg1';
import { shortWhen } from '@/domain/gcc/s1/common';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 007a: the Stage 1 and DG1 rules, with no screens. The
 * hero's five answers run for every tenant, whichever is active; Najd adds
 * its seed readings and the simulated flows, on an in-memory `done` (the real
 * store is never written). Values are typed only in `EXPECT`.
 */

const TENANTS: GccTenantKey[] = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'];
const H = HERO_ID;
const TIHAMA_JV: JvScenario = { partnerId: 'tihama', lead: 'partner', shares: [60, 40] };

// gcc-demo-data §4.7 line groups.
const GROUPS: [string, string[]][] = [
  ['PQ-01, 04, 06, 07, 08 KSA registrations', ['PQ-01', 'PQ-04', 'PQ-06', 'PQ-07', 'PQ-08']],
  ['PQ-02 Zakat', ['PQ-02']],
  ['PQ-03 GOSI', ['PQ-03']],
  ['PQ-05 Classification', ['PQ-05']],
  ['PQ-09 STP experience', ['PQ-09']],
  ['PQ-10 O&M', ['PQ-10']],
  ['PQ-11 Turnover', ['PQ-11']],
  ['PQ-12 to PQ-15', ['PQ-12', 'PQ-13', 'PQ-14', 'PQ-15']],
];

// ---------------------------------------------------------------------------
// Targets. The only place values are typed.

const EXPECT: Record<string, string> = {
  // 10.1 Five answers. §4.7 differences (reported): Corniche PQ-11 is a plain fail (AED 1.10 bn is SAR 1.12 bn),
  // and Qurain PQ-11 is an interpretation line (its FY2025 audit is due 26 Apr, before opening).
  'najd · PQ-01, 04, 06, 07, 08 KSA registrations': 'pass', 'najd · PQ-02 Zakat': 'at-risk', 'najd · PQ-03 GOSI': 'at-risk',
  'najd · PQ-05 Classification': 'pass', 'najd · PQ-09 STP experience': 'pass', 'najd · PQ-10 O&M': 'pass', 'najd · PQ-11 Turnover': 'interpretation',
  'najd · PQ-12 to PQ-15': 'pass',
  'corniche · PQ-01, 04, 06, 07, 08 KSA registrations': 'fail', 'corniche · PQ-02 Zakat': 'fail', 'corniche · PQ-03 GOSI': 'fail',
  'corniche · PQ-05 Classification': 'fail', 'corniche · PQ-09 STP experience': 'fail', 'corniche · PQ-10 O&M': 'fail', 'corniche · PQ-11 Turnover': 'fail',
  'dafna · PQ-01, 04, 06, 07, 08 KSA registrations': 'pass', 'dafna · PQ-02 Zakat': 'pass', 'dafna · PQ-03 GOSI': 'pass',
  'dafna · PQ-05 Classification': 'fail', 'dafna · PQ-09 STP experience': 'fail', 'dafna · PQ-10 O&M': 'fail', 'dafna · PQ-11 Turnover': 'fail',
  'dafna · PQ-12 to PQ-15': 'pass',
  'dafna JV · PQ-05 Classification': 'pass', 'dafna JV · PQ-09 STP experience': 'pass', 'dafna JV · PQ-10 O&M': 'pass', 'dafna JV · PQ-11 Turnover': 'pass',
  'dafna JV · PQ-11 why': 'Pass: lead Tihama Hydro Works Co. SAR 1.10 bn ≥ 60%; combined SAR 1.94 bn',
  'dafna JV · PQ-09 why': 'Pass (partner): Tihama Hydro Works Co., 2 STPs ≥ 100,000 m³/day',
  'batinah · PQ-01, 04, 06, 07, 08 KSA registrations': 'fail', 'batinah · PQ-02 Zakat': 'fail', 'batinah · PQ-03 GOSI': 'fail',
  'batinah · PQ-05 Classification': 'fail', 'batinah · PQ-09 STP experience': 'fail', 'batinah · PQ-10 O&M': 'fail', 'batinah · PQ-11 Turnover': 'fail',
  'qurain · PQ-01, 04, 06, 07, 08 KSA registrations': 'pass', 'qurain · PQ-02 Zakat': 'pass', 'qurain · PQ-03 GOSI': 'pass',
  'qurain · PQ-05 Classification': 'pass', 'qurain · PQ-09 STP experience': 'pass', 'qurain · PQ-10 O&M': 'pass', 'qurain · PQ-11 Turnover': 'interpretation',
  'qurain · PQ-12 to PQ-15': 'pass',
  'najd · roll-up': '13 met · 2 at risk · 1 interpretation · 0 fail → eligible; renew two certificates before 10 May',
  'dafna · roll-up': 'fails 4 lines alone → eligible only with a JV partner (Tihama Hydro Works Co.)',
  'najd · weighted fit': '82', 'corniche · weighted fit': '63', 'dafna · weighted fit': '71', 'batinah · weighted fit': '38', 'qurain · weighted fit': '78',
  'najd · verdict': 'Pursue', 'corniche · verdict': 'Recommend discard', 'dafna · verdict': 'Pursue with conditions (JV needed)',
  'batinah · verdict': 'Recommend discard', 'qurain · verdict': 'Pursue with conditions',
  'najd · capped': 'none', 'corniche · capped': 'pq-fail', 'dafna · capped': 'pq-fail-jv', 'batinah · capped': 'none', 'qurain · capped': 'capacity',
  'corniche · what would change it, first': 'Join a Grade 1 bidder as MEP subcontractor (inside the 30% subcontracting cap)',
  'qurain · what would change it: capacity': 'Water tendering team peaks at 139% in April: release a bid or add estimators',
  'qurain · what would change it: facility':
    'Finance to confirm the facility; headroom KWD 3.1 M against the KWD 785,920 bid bond, then a KWD 1.96 M performance bond and a KWD 3.93 M advance payment guarantee if won',
  'hero · lines not assessed automatically': '0 in every tenant',
  'hero · preparation ratio': 'green in every tenant',
  'hero · upload recognised': 'T-2026-118 in every tenant',
  'queries per tenant': 'najd 7 · corniche 6 · dafna 7 · batinah 6 · qurain 6',

  // 10.2 Najd, seed
  'Agrees with 30-seed (hero fit, certificates at risk)': '82 · 2',
  'Eligibility risks': '3: T-2026-118, T-2026-119, T-2026-109',
  'Hero bid bond': 'SAR 9,600,000 at 2% (higher-until-resolved)',
  'Qurain hero bid bond and facility': 'SAR 9,600,000 at 2% (KWD 785,920) · headroom KWD 3.1 M · performance bond KWD 1.96 M',
  'Facility, as Finance confirmed it': 'facility headroom SAR 96.0 M as of 05 Mar, confirmed by Finance',
  'Key-date flag 1': 'Site visit Tue 17 Mar falls during Ramadan reduced hours: authority office hours are shorter; confirm the slot',
  'Key-date flag 2': 'Answers to questions are due Wed 25 Mar, inside the expected Eid al-Fitr closure (dates depend on moon sighting): expect a delay',
  'Key-date flag 3': 'Initial guarantee must be valid at least 90 days from opening (to 8 Aug 2026): bank lead time 5 working days',
  'Hero key-date flags': '3',
  'DG1 queue': '2 · first T-2026-117, 6 h 10 m left',
  'Hero DG1 due': 'Mon 9 Mar 07:44',
  'Queue stats (INT-5)': '6 · 2 block DG1 · oldest 2 h 16 m',
  'Conflict actions (no accept)': 'pick, correct, not-stated, send-back',
  'Radar: new today': '11',
  'Radar: sources': '8 of 9 healthy',
  'Radar: reconciliation': 'Last reconciliation 06:00. 0 missed across 9 sources.',
  'Hero pipeline': '9 steps · Intake to logged 11 min',
  'T-2026-097 effect 1': 'Eligibility and fit re-checked: no change',
  'T-2026-097 effect 2': 'Addendum 2 changes filter media in Package P-03 and pipe material in Package P-09: re-quote 5 suppliers',
  'T-2026-097 effect 3': 'Bid / No-Bid pack marked stale since Sun 8 Mar 09:12',
  'T-2026-097 badge': 'Addendum 2 applied',
  'Water team, next 4 weeks': '78% → 96% with the hero',
  'Qurain water team, April': '118% → 139% with the hero',
  'DG1 discard codes in history': 'all known',

  // 10.3 Simulated flows
  'Flow 1: pick 2% and 16 km': 'blocking 0 · unlocked · confidence high · bond resolved',
  'Flow 1: audit': 'Resolved conflict: Initial guarantee rate = 2% (p. 35); 1% (p. 12) kept on record',
  'Flow 2: renew GOSI': 'PQ-03 pass · eligibility 9 · fit 84.4',
  'Flow 2: renew Zakat too': 'eligibility 10 · fit 86.4',
  'Flow 3: send back VAL-118-1': 'sent-back · still open',
  'Flow 4: Pursue as najd.bid': 'valid · RFQs due Mon 9 Mar 10:00 · S2 · 6 milestones',
  'Flow 5: Discard, no reason': 'Choose at least one reason for Discard.',
  'Flow 5: Pursue on Recommend discard, no note': 'Add a note: Pursue overrides a Recommend discard.',
  'Flow 6: Hold, request to qurain.fin': 'in queue · held',
  'Flow 7: re-open after Discard': 'in queue · previous 1 · S1',
  'Determinism: same JSON twice': 'yes',
};

// ---------------------------------------------------------------------------
// Derivations, all through 007a's functions

interface Check { section: string; name: string; got: string; expected?: string }

const groupState = (r: EligibilityResult, ids: string[]) => {
  const states = [...new Set(r.lines.filter((l) => ids.includes(l.reqId)).map((l) => l.state))];
  return states.length === 1 ? states[0] : `mixed: ${states.join(', ')}`;
};
const put = (done: Done, w: { key: string; value: string }[]) => ({ ...done, ...Object.fromEntries(w.map((x) => [x.key, x.value])) });
const heroItem = (tenant: string, id: string) => gccData(tenant).register.find((t) => t.id === H)!.validations.find((v) => v.id === id)!;
const resolveBoth = (tenant: string, byId: string): Done =>
  put({}, ['VAL-118-1', 'VAL-118-2'].map((id) => validationAction(heroItem(tenant, id), 'pick', { pick: 'value' }, byId)));
const renewed = (id: string, validTo: string, byId: string) => ({ key: `renewed:${id}`, value: JSON.stringify({ validTo, at: '2026-03-08T10:00', byId }) });

function fiveAnswers(): Check[] {
  const out: Check[] = [];
  const s = 'Five answers';
  for (const k of TENANTS) {
    const r = eligibilityFor(k, H, {})!;
    for (const [g, ids] of GROUPS) out.push({ section: s, name: `${k} · ${g}`, got: groupState(r, ids) });
    const f = fitFor(k, H, {})!;
    out.push({ section: s, name: `${k} · roll-up`, got: r.text });
    out.push({ section: s, name: `${k} · weighted fit`, got: String(Math.round(f.weighted)) });
    out.push({ section: s, name: `${k} · verdict`, got: f.verdictLabel });
    out.push({ section: s, name: `${k} · capped`, got: f.capped ?? 'none' });
    out.push({ section: s, name: `${k} · what would change it, first`, got: f.wouldChange[0] ?? '—' });
    if (k === 'qurain') {
      out.push({ section: s, name: 'qurain · what would change it: capacity', got: f.wouldChange.find((w) => w.includes('peaks at')) ?? '—' });
      out.push({ section: s, name: 'qurain · what would change it: facility', got: f.wouldChange.find((w) => w.startsWith('Finance to confirm')) ?? '—' });
    }
    if (k === 'dafna') {
      const jv = eligibilityFor(k, H, {}, TIHAMA_JV)!;
      for (const [g, ids] of GROUPS) out.push({ section: s, name: `dafna JV · ${g}`, got: groupState(jv, ids) });
      out.push({ section: s, name: 'dafna JV · roll-up', got: jv.text });
      out.push({ section: s, name: 'dafna JV · PQ-11 why', got: jv.lines.find((l) => l.reqId === 'PQ-11')!.why });
      out.push({ section: s, name: 'dafna JV · PQ-09 why', got: jv.lines.find((l) => l.reqId === 'PQ-09')!.why });
    }
  }
  const unassessed = TENANTS.map((k) => eligibilityFor(k, H, {})!.lines.filter((l) => l.why.startsWith('Not assessed automatically')).length);
  out.push({ section: s, name: 'hero · lines not assessed automatically', got: unassessed.every((n) => n === 0) ? '0 in every tenant' : unassessed.join(' · ') });
  const tones = TENANTS.map((k) => prepRatio(k, H)?.tone ?? 'none');
  out.push({ section: s, name: 'hero · preparation ratio', got: tones.every((t) => t === 'green') ? 'green in every tenant' : TENANTS.map((k, i) => `${k} ${tones[i]}`).join(' · ') });
  const up = TENANTS.map((k) => recogniseUpload(HERO_FILE_NAME, k)?.tenderId ?? 'none');
  out.push({ section: s, name: 'hero · upload recognised', got: up.every((x) => x === H) ? `${H} in every tenant` : up.join(' · ') });
  out.push({ section: s, name: 'queries per tenant', got: TENANTS.map((k) => `${k} ${queriesFor(k, H, {}).items.length}`).join(' · ') });
  return out;
}

function najdSeed(): Check[] {
  const s = 'Najd, seed';
  const k = 'najd';
  const out: Check[] = [];
  const f = fitFor(k, H, {})!;
  const certsAtRisk = f.eligibility!.lines.filter((l) => l.state === 'at-risk' && l.renew?.length).length;
  out.push({ section: s, name: 'Agrees with 30-seed (hero fit, certificates at risk)', got: `${Math.round(f.weighted)} · ${certsAtRisk}` });
  const risks = eligibilityRisks(k, {});
  out.push({ section: s, name: 'Eligibility risks', got: `${risks.length}: ${risks.map((r) => r.tenderId).join(', ')}` });
  const b = bidBondFor(k, H, {})!;
  out.push({ section: s, name: 'Hero bid bond', got: `${b.text} (${b.rateBasis})` });
  const q = bidBondFor('qurain', H, {})!;
  out.push({
    section: s, name: 'Qurain hero bid bond and facility',
    got: `${q.text} · headroom ${money(q.headroom.amount, q.headroom.ccy)} · performance bond ${q.performanceIfWon ? money(q.performanceIfWon.amount, q.performanceIfWon.ccy, { dp: 2 }) : '—'}`,
  });
  out.push({ section: s, name: 'Facility, as Finance confirmed it', got: facilityHeadroom(k).text });
  const flags = keyDatesFor(k, H).flatMap((r) => r.flags.map((x) => x.text));
  flags.forEach((text, i) => out.push({ section: s, name: `Key-date flag ${i + 1}`, got: text }));
  out.push({ section: s, name: 'Hero key-date flags', got: String(flags.length) });
  const queue = dg1Queue(k, {});
  out.push({ section: s, name: 'DG1 queue', got: `${queue.length} · first ${queue[0]?.tenderId}, ${queue[0]?.slaText}` });
  out.push({ section: s, name: 'Hero DG1 due', got: shortWhen(queue.find((x) => x.tenderId === H)?.dueAt ?? '') });
  out.push({ section: s, name: 'Queue stats (INT-5)', got: queueStats(k, {}).text });
  out.push({ section: s, name: 'Conflict actions (no accept)', got: validationsOf(k, H, {}).find((x) => x.item.id === 'VAL-118-1')!.actions.join(', ') });
  const radar = radarFor(k, false);
  out.push({ section: s, name: 'Radar: new today', got: String(radar.newToday) });
  out.push({ section: s, name: 'Radar: sources', got: radar.healthText });
  out.push({ section: s, name: 'Radar: reconciliation', got: radar.reconciliation });
  const heroEvent = gccData(k).intakeToday.find((e) => e.tenderId === H)!;
  const p = pipelineFor(k, heroEvent.id)!;
  out.push({ section: s, name: 'Hero pipeline', got: `${p.steps.length} steps · ${p.loggedText}` });
  const add = addendaFor(k, 'T-2026-097')[0];
  (add?.effects ?? []).forEach((e, i) => out.push({ section: s, name: `T-2026-097 effect ${i + 1}`, got: e }));
  out.push({ section: s, name: 'T-2026-097 badge', got: latestAddendumBadge(k, 'T-2026-097') ?? '—' });
  const tri = triageFor(k, {});
  const water = tri.teams.find((t) => t.id === 'najd-water')!;
  const heroRow = tri.rows.find((r) => r.tenderId === H)!;
  out.push({ section: s, name: 'Water team, next 4 weeks', got: `${water.basePct}% → ${heroRow.cumulative.teamLoadPct}% with the hero` });
  const qTeam = gccData('qurain').teams.find((t) => t.id === 'qurain-water')!;
  const qEffort = asCommitment(s1Data('qurain').effort.find((e) => e.tenderId === H)!);
  const april = (extra: Commitment[]) => peakMonth(qTeam, '2026-04-01', '2026-04-30', extra).pct;
  out.push({ section: s, name: 'Qurain water team, April', got: `${april([])}% → ${april([qEffort])}% with the hero` });
  const known = new Set(DISCARD_REASONS.map((r) => r.code));
  const history = TENANTS.flatMap((t) => gccData(t).history.dg1.filter((r) => r.decision === 'discard').flatMap((r) => r.reasonCodes));
  const unknown = [...new Set(history.filter((c) => !known.has(c)))];
  out.push({ section: s, name: 'DG1 discard codes in history', got: unknown.every((c) => reasonLabel(c) !== c) ? 'all known' : `unknown: ${unknown.join(', ')}` });
  return out;
}

function flows(): Check[] {
  const s = 'Simulated flows';
  const out: Check[] = [];
  const k = 'najd';
  // 1
  const d1 = resolveBoth(k, 'najd.coord');
  const pack1 = dg1PackFor(k, H, d1)!;
  out.push({
    section: s, name: 'Flow 1: pick 2% and 16 km',
    got: `blocking ${blockingOpen(k, H, d1).count} · ${pack1.locked ? 'locked' : 'unlocked'} · confidence ${fitFor(k, H, d1)!.confidence} · bond ${bidBondFor(k, H, d1)!.rateBasis}`,
  });
  out.push({ section: s, name: 'Flow 1: audit', got: auditText(validationAction(heroItem(k, 'VAL-118-1'), 'pick', { pick: 'value' }, 'najd.coord').audit) });
  // 2
  const d2 = put({}, [renewed('najd-gosi', '2027-05-31', 'najd.hr')]);
  const e2 = eligibilityFor(k, H, d2)!;
  out.push({ section: s, name: 'Flow 2: renew GOSI', got: `PQ-03 ${e2.lines.find((l) => l.reqId === 'PQ-03')!.state} · eligibility ${fitScoresFor(k, H, d2)!.scores.eligibility} · fit ${fitFor(k, H, d2)!.weighted}` });
  const d2b = put(d2, [renewed('najd-zakat', '2027-04-30', 'najd.fin')]);
  out.push({ section: s, name: 'Flow 2: renew Zakat too', got: `eligibility ${fitScoresFor(k, H, d2b)!.scores.eligibility} · fit ${fitFor(k, H, d2b)!.weighted}` });
  // 3
  const d3 = put({}, [validationAction(heroItem(k, 'VAL-118-1'), 'send-back', { hint: 'Check §77 in the special conditions' }, 'najd.coord')]);
  const q3 = validationsOf(k, H, d3).find((x) => x.item.id === 'VAL-118-1')!;
  out.push({ section: s, name: 'Flow 3: send back VAL-118-1', got: `${q3.state} · ${q3.state === 'resolved' ? 'closed' : 'still open'}` });
  // 4
  const w4 = dg1Write({ tenderId: H, decision: 'pursue' }, 'najd.bid', pack1);
  const d4 = put(d1, w4.writes);
  const dec = readDone<Dg1Decision>(d4, `dg1:${H}`)!;
  const valid4 = validateDg1({ tenderId: H, decision: 'pursue' }, pack1).ok;
  const rfq = w4.effects.find((e) => e.startsWith('RFQ clock'))?.replace('RFQ clock started: all RFQs due by ', '') ?? '—';
  out.push({ section: s, name: 'Flow 4: Pursue as najd.bid', got: `${valid4 ? 'valid' : 'invalid'} · RFQs due ${rfq} · ${stageOverlay(k, H, d4)?.stage ?? '—'} · ${dec.milestones?.length ?? 0} milestones` });
  // 5
  out.push({ section: s, name: 'Flow 5: Discard, no reason', got: validateDg1({ tenderId: H, decision: 'discard' }, pack1).errors.join(' ') });
  const packC = dg1PackFor('corniche', H, resolveBoth('corniche', 'corniche.coord'))!;
  out.push({ section: s, name: 'Flow 5: Pursue on Recommend discard, no note', got: validateDg1({ tenderId: H, decision: 'pursue' }, packC).errors.join(' ') });
  // 6
  const packQ = dg1PackFor('qurain', H, {})!;
  const w6 = dg1Write({ tenderId: H, decision: 'hold', request: { toId: 'qurain.fin', what: 'Confirm the facility headroom for the bid bond and a performance bond if won', due: '2026-03-08T16:00' } }, 'qurain.bid', packQ);
  const q6 = dg1Queue('qurain', put({}, w6.writes)).find((x) => x.tenderId === H);
  out.push({ section: s, name: 'Flow 6: Hold, request to qurain.fin', got: q6 ? `in queue · ${q6.held ? 'held' : 'not held'}` : 'not in queue' });
  // 7
  const d7a = put(d1, dg1Write({ tenderId: H, decision: 'discard', reasonCodes: ['capacity'] }, 'najd.bid', pack1).writes);
  const d7b = put(d7a, dg1Reopen(k, H, 'The Water team released a bid', 'najd.hot', d7a).writes);
  const in7 = dg1Queue(k, d7b).some((x) => x.tenderId === H);
  out.push({ section: s, name: 'Flow 7: re-open after Discard', got: `${in7 ? 'in queue' : 'not in queue'} · previous ${dg1RecordFor(k, H, d7b).previous.length} · ${stageOverlay(k, H, d7b)?.stage ?? '—'}` });
  // Determinism
  const snap = (dd: Done) => JSON.stringify(TENANTS.map((t) => [fitFor(t, H, dd), dg1PackFor(t, H, dd), triageFor(t, dd), radarFor(t, true, dd), dg1Queue(t, dd)]));
  out.push({ section: s, name: 'Determinism: same JSON twice', got: snap({}) === snap({}) && snap(d4) === snap(d4) ? 'yes' : 'no' });
  return out;
}

/** The active tenant's own readings (info). */
function tenantInfo(k: GccTenantKey): Check[] {
  const s = 'This tenant';
  const q = dg1Queue(k, {});
  const tri = triageFor(k, {});
  return [
    { section: s, name: 'Queue stats', got: queueStats(k, {}).text },
    { section: s, name: 'DG1 queue', got: q.map((x) => `${x.tenderId} ${x.slaText}`).join(' · ') || 'empty' },
    { section: s, name: 'Radar', got: `${radarFor(k, false).newToday} new today · ${radarFor(k, false).healthText}` },
    { section: s, name: 'Facility', got: facilityHeadroom(k).text },
    { section: s, name: 'Hero bid bond', got: `${bidBondFor(k, H, {})!.text} · ${bidBondFor(k, H, {})!.rateText}` },
    ...tri.teams.map((t) => ({ section: s, name: `${t.name}: next 4 weeks`, got: `${t.basePct}% → ${t.allPct}% if all pursued (peak ${t.peak.pct}% in ${t.peak.month})` })),
    ...tri.flags.map((f, i) => ({ section: s, name: `Triage flag ${i + 1}`, got: f })),
    { section: s, name: 'Queries', got: queriesFor(k, H, {}).deadline?.text ?? '—' },
  ];
}

export default function Stage1Check() {
  const key = useTenantKey();
  if (!isGccTenantKey(key)) return <CardHead title="Stage 1 and DG1 rules" meta="No GCC seed for this tenant" />;

  // Targets are keyed by name; the active tenant's readings are info only.
  const checks = [
    ...[...fiveAnswers(), ...(key === 'najd' ? [...najdSeed(), ...flows()] : [])].map((c) => ({ ...c, expected: EXPECT[c.name] })),
    ...tenantInfo(key).map((c) => ({ ...c, expected: undefined as string | undefined })),
  ];
  const targeted = checks.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => c.expected !== c.got).length;

  const hero = gccData(key).register.find((t) => t.id === H)!;
  const sub = keyDatesFor(key, H).find((r) => r.kind === 'submission');
  const prep = prepRatio(key, H);
  const najdS1 = key === 'najd' ? gccData('najd').register.filter((t) => t.stage === 'S1') : [];

  return (
    <>
      <CardHead title="Stage 1 and DG1 rules (plan 007a)" meta={failing ? `${failing} of ${targeted.length} targets failing` : `All ${targeted.length} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Hero, this tenant" v={`${hero.shortTitle}: ${eligibilityFor(key, H, {})!.text}`} />
        <KV k="Hero submission" v={sub ? `${sub.daysLeft} days · ${sub.workingDaysLeft} working days (${sub.tz})` : '—'} />
        <KV k="Hero preparation ratio" v={prep ? `${prep.ratio} (${prep.tone}): ${prep.basis}` : '—'} />
        {najdS1.map((t) => {
          const r = prepRatio('najd', t.id);
          return <KV key={t.id} k={`Preparation ratio, ${t.id}`} v={r ? `${r.workingDaysLeft} ÷ ${r.typical} = ${r.ratio} (${r.tone})` : 'No submission ahead'} />;
        })}
      </div>
      <DataTable
        rows={checks}
        rowKey={(c) => `${c.section}|${c.name}`}
        columns={[
          { key: 's', header: 'Section', width: '.8fr', priority: 3, render: (c) => <span className="t-muted">{c.section}</span> },
          { key: 'n', header: 'Derived value', width: '1.5fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '2fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '2fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
