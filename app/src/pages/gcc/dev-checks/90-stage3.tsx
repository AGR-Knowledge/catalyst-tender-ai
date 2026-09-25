/// <reference types="vite/client" />
import { useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { gccData, isGccTenantKey, GCC_DATA, type GccTenantKey } from '@/data/gcc';
import { COMPETITORS, EVIDENCE, PACK_VERSIONS, SEEDED_INPUTS, WIN_MODELS, type PackSectionId } from '@/data/gcc/s3';
import { SEAT_LABEL, SEATS } from '@/data/people';
import type { S3Facts } from '@/data/gcc/lifecycle';
import { lifecyclesOf } from '@/domain/gcc/lifecycle';
import {
  applyWrites, competitorsFor, compareVersions, freshnessFor, inputsFor, isWriteError, issueBlockers, lensFor, packFor,
  packIssueWrite, packRerunWrite, packVersionsFor, winFor, type Done, type Write,
} from '@/domain/gcc/s3';
import {
  conditionsFor, decisionState, declineLetter, dg2Overlay, dg2RecordFor, dg2Write, NO_BID_REASONS, positionsFor, positionWrite,
  reopenApproveWrite, reopenRequestWrite,
} from '@/domain/gcc/dg2';
import { DISCARD_REASONS } from '@/domain/gcc/dg1';
import { DG1_DISCARD_REASONS } from '@/domain/gcc/dg2';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 009a: the Stage 3 pack and DG2 rules for the active
 * tenant, read through the domain functions only. Najd runs the Script C
 * targets, T-2026-101's preparation state and eight simulated DG2 flows on an
 * in-memory `done`. Nothing is written to the store.
 */

// Plan 009a acceptance values (the only numbers typed here).
const EXPECT: Partial<Record<GccTenantKey, Record<string, string>>> = {
  najd: {
    '097 · Win probability': '58 ± 8',
    '097 · Driver points (Σ)': '+25',
    '097 · Comparables': '14',
    '097 · Base: water hit rate from history': '33% (7 of 21)',
    '097 · Calibration': 'Calibrated on 33 decided bids: bands within ±10 points except under 30%, where the model is over-confident (0 of 13 won)',
    '097 · Competitors (bidders incl. us)': '5 (6)',
    '097 · Uncited claims suppressed': '1 uncited claim suppressed (no source, no claim)',
    '097 · Evidence records': '12 · all synthetic, .example hosts',
    '097 · Margin range': '8.5–11.5%',
    '097 · Margin masked': 'Masked for your role · no digits',
    '097 · Positions': '2 of 5 · quorum needs 3',
    '097 · Majority': '2 for · 0 against',
    '097 · Decision': 'Disabled: Quorum needs 3 of 5 positions: 2 recorded',
    '097 · DG2 SLA': '4 h 10 m left',
    '097 · Freshness': 'Pack generated 07 Mar 14:10. Stale: Addendum 2 received 08 Mar 09:12 changes 2 packages (P-03 Filtration, P-09 Pipes and valves).',
    '097 · Stale sections': '9.6, 9.7, 9.10',
    '097 · Delivery load if both win': '101%',
    '097 · Weighted value (DEC-4)': 'SAR 205,900,000',
    '097 · Facility after bond': 'SAR 88.9 M',
    '097 · Inputs': '6 requested · 0 outstanding · 0 late',
    '097 · Lens (CFO · TD · OD · Sector · HoT)': '9.5 · 9.6 · 9.4 · 9.1 · top',
    '101 · Pack': 'Draft v1 · not issued',
    '101 · Inputs': '6 requested · 2 outstanding · 1 late',
    '101 · Late input': 'Facility headroom and bond capacity (Sultan Al-Anazi)',
    '101 · Sections waiting': '9.5, 9.6',
    '101 · Issue blockers': '2',
    '101 · Issue without a reason': 'Give a reason to issue with 2 inputs outstanding',
    '101 · Issue with a reason': 'Issued with 2 inputs outstanding · 24 h left',
    'Flow 1 · Operations Director records Support': '3 of 5 · quorum met · enabled · stale acknowledgement required',
    'Flow 1 · Approve without the acknowledgement': 'Tick "I have seen that the pack is stale" to decide on this pack',
    'Flow 2 · No-Bid against the majority, no reason': 'Give a reason: this approval differs from the majority of positions (3 for, 0 against)',
    'Flow 2 · No-Bid with a reason': 'against majority · Approval differs from majority · letter drafted · closed',
    'Flow 2 · No-Bid effects': 'Decline letter drafted: the Bid Manager reviews and sends it | Lessons captured | Tender closed: No-Bid',
    'Flow 2 · Letter': 'Courteous · no internal reasons · signed by Omar Siddiqui',
    'Flow 3 · Bid conditions': 'Keep the bid bond within the facility (CFO) · Minimum margin 9% (CFO)',
    'Flow 3 · Bid effects': 'Decision recorded. Planning and Commercial have been asked to start baselines. | Stage moves to Planning',
    'Flow 3 · Overlay': 'S4',
    'Flow 4 · Sector Head declares a conflict': 'Abstain · declaration recorded',
    'Flow 5 · Secretary records the Sector Head': 'Recorded by the secretary in the meeting',
    'Flow 6 · Re-run': 'v2 · fresh · changed 9.6, 9.7, 9.10',
    'Flow 6 · Margin after re-run': '8.0–11.5%',
    'Flow 6 · Re-run not issued yet': 'stale acknowledgement required',
    'Flow 6 · Issue v2': '4 h 10 m left · CFO on v1, Technical Director on v1',
    'Flow 7 · Re-open after a No-Bid': 'back at DG2 · previous No-Bid · approval enabled',
    'Flow 8 · Oppose with no comment': 'Add a comment: it is needed for any position other than Support',
  },
};

const ALWAYS: Record<string, string> = {
  'Determinism': 'Equal JSON on a second call',
  'Date.now and Math.random': 'None',
};

// Raw sources of this plan's folders, for the determinism grep (dev builds only).
const SOURCES = import.meta.glob<string>(['/src/data/gcc/s3/*.ts', '/src/domain/gcc/s3/*.ts', '/src/domain/gcc/dg2/*.ts'], { query: '?raw', import: 'default', eager: true });

const ALL: { canSeeMargin: boolean } = { canSeeMargin: true };
const MASKED: { canSeeMargin: boolean } = { canSeeMargin: false };
const SECTION_ORDER: PackSectionId[] = ['9.1', '9.2', '9.3', '9.4', '9.5', '9.6', '9.7', '9.8', '9.9', '9.10'];

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const errOf = (r: object) => (isWriteError(r) ? r.error : 'no error');
const writesOf = (r: object): Write[] => (isWriteError(r) ? [] : 'writes' in r ? (r as { writes: Write[] }).writes : [r as Write]);
const totals = (t: { requested: number; outstanding: number; late: number }) => `${t.requested} requested · ${t.outstanding} outstanding · ${t.late} late`;
const agree = (ok: boolean, why = '') => (ok ? 'Agrees' : `Differs${why ? `: ${why}` : ''}`);

interface Check { name: string; expected?: string; got: string }

function najdRows(): Record<string, string> {
  const T = 'najd';
  const A = 'T-2026-097';
  const B = 'T-2026-101';
  const d = gccData(T);
  const seed: Done = {};
  const got: Record<string, string> = {};

  // --- T-2026-097 seed (8.1)
  const win = winFor(T, A);
  const comps = competitorsFor(T, A);
  const pack = packFor(T, A, seed, ALL);
  const masked = packFor(T, A, seed, MASKED);
  const pos = positionsFor(T, A, seed);
  const ds = decisionState(T, A, seed);
  const fresh = freshnessFor(T, A, seed);
  if (!win || !comps || !pack || !masked || !fresh) return { 'T-2026-097 pack': 'missing' };

  const sector = d.register.find((t) => t.id === A)?.sector;
  const water = d.history.outcomes.filter((o) => o.sector === sector && (o.result === 'won' || o.result === 'lost'));
  const waterWon = water.filter((o) => o.result === 'won').length;
  const waterRate = Math.round((waterWon / water.length) * 100);
  got['097 · Win probability'] = win.text;
  got['097 · Driver points (Σ)'] = signed(win.sum);
  got['097 · Comparables'] = String(win.comparables);
  got['097 · Base: water hit rate from history'] = `${waterRate}% (${waterWon} of ${water.length})`;
  got['097 · Base agrees with history'] = agree(win.base.pct === waterRate && win.base.label.includes(`${waterWon} of ${water.length}`));
  got['097 · Calibration'] = win.calibration;
  got['097 · Competitors (bidders incl. us)'] = `${comps.competitors.length} (${comps.bidders})`;
  got['097 · "6 prequalified bidders" driver agrees'] = agree(win.drivers.some((x) => x.key === 'competitors' && x.why.startsWith(`${comps.bidders} `)));
  got['097 · Uncited claims suppressed'] = comps.suppressedText ?? '0';
  const badEvidence = EVIDENCE.filter((e) => !e.title.endsWith('(synthetic)') || !new URL(e.url).hostname.endsWith('.example'));
  got['097 · Evidence records'] = `${EVIDENCE.length} · ${badEvidence.length ? `${badEvidence.length} not synthetic or not .example` : 'all synthetic, .example hosts'}`;
  const tihama = COMPETITORS.find((c) => c.id === 'tihama');
  const partnerTenants = (Object.keys(GCC_DATA) as GccTenantKey[]).filter((k) => GCC_DATA[k].partners.some((p) => p.name === tihama?.name));
  got['097 · Tihama on partner lists agrees with the seed'] = agree(JSON.stringify([...(tihama?.alsoPartnerOf ?? [])].sort()) === JSON.stringify(partnerTenants.sort()), partnerTenants.join(', '));
  got['097 · Margin range'] = pack.summary.margin ?? '—';
  const maskedSection = JSON.stringify({ ...masked.sections['9.7'], id: undefined });
  got['097 · Margin masked'] = `${masked.summary.margin} · ${/\d/.test(maskedSection) ? 'digits present' : 'no digits'}`;
  got['097 · Positions'] = pack.summary.positions;
  got['097 · Majority'] = `${pos.majority.for} for · ${pos.majority.against} against`;
  got['097 · Decision'] = ds.enabled ? 'Enabled' : `Disabled: ${ds.disabledReason}`;
  got['097 · DG2 SLA'] = ds.slaText;
  got['097 · Freshness'] = fresh.text;
  got['097 · Stale sections'] = SECTION_ORDER.filter((s) => pack.sections[s].freshness === 'stale').join(', ');
  const port = pack.sections['9.4'].body.portfolio;
  got['097 · Delivery load if both win'] = `${port.ofSafePct}%`;
  got['097 · Weighted value (DEC-4)'] = pack.weightedValue ? money(pack.weightedValue.amount, pack.weightedValue.ccy, { full: true }) : '—';
  got['097 · Facility after bond'] = pack.summary.facilityAfter ?? '—';
  got['097 · Inputs'] = totals(inputsFor(T, A, seed).totals);
  got['097 · Lens (CFO · TD · OD · Sector · HoT)'] = [lensFor('cfo'), lensFor('technical'), lensFor('operations'), lensFor('sector'), lensFor('hot')].join(' · ');

  // Cross-checks against other plans' facts.
  const finance = SEEDED_INPUTS.find((i) => i.tenant === T && i.tenderId === A && i.key === 'finance')?.fields ?? {};
  const amt = (v: unknown) => (v as { amount?: number } | undefined)?.amount;
  const committed = d.facility.committed.reduce((s, c) => s + c.amount.amount, 0);
  const headroom = d.facility.limit.amount - d.facility.utilised.amount - committed;
  got['097 · Finance input equals 004 facility'] = agree(amt(finance.limit) === d.facility.limit.amount && amt(finance.utilised) === d.facility.utilised.amount
    && amt(finance.committed) === committed && amt(finance.headroom) === headroom && finance.asOf === d.facility.asOf);
  const v1 = PACK_VERSIONS.find((p) => p.tenant === T && p.tenderId === A && p.version === 1);
  got['097 · Pack issued equals register packIssuedAt'] = agree(v1?.issuedAt === d.register.find((t) => t.id === A)?.packIssuedAt);
  got['Safe delivery level equals the fit model'] = agree(PACK_VERSIONS.filter((p) => p.tenant === T).every((p) => p.snapshot.portfolio.safePct === d.fit.safeDeliveryPct));
  got['Planning delivery impact equals the pack roll-up'] = agree([A, B].every((tid) => {
    const plan = SEEDED_INPUTS.find((i) => i.tenant === T && i.tenderId === tid && i.key === 'planning')?.fields;
    return PACK_VERSIONS.filter((p) => p.tenant === T).every((p) => p.snapshot.portfolio.ifWon.find((x) => x.tenderId === tid)?.addPct === plan?.deliveryImpact);
  }));
  got['Commercial basis equals the sourcing snapshot'] = agree([A, B].every((tid) => {
    const basis = String(SEEDED_INPUTS.find((i) => i.tenant === T && i.tenderId === tid && i.key === 'commercial')?.fields?.basis ?? '');
    const s = PACK_VERSIONS.find((p) => p.tenant === T && p.tenderId === tid)?.snapshot.sourcing;
    return !!s && basis.includes(`${s.levelled} of ${s.packages} packages`);
  }));

  got['No-Bid reasons carry the DG1 discard codes (007a)'] = agree(JSON.stringify(DG1_DISCARD_REASONS) === JSON.stringify(DISCARD_REASONS.map((r) => ({ code: r.code, label: r.label }))));

  // --- T-2026-101 (8.2)
  const p101 = packFor(T, B, seed, ALL);
  const i101 = inputsFor(T, B, seed);
  if (p101) {
    got['101 · Pack'] = `${p101.issued ? 'Issued' : 'Draft'} v${p101.version} · ${p101.issued ? 'issued' : 'not issued'}`;
    got['101 · Inputs'] = totals(i101.totals);
    got['101 · Late input'] = i101.items.filter((i) => i.state === 'late').map((i) => `${i.label} (${i.ownerName})`).join(', ') || 'none';
    got['101 · Sections waiting'] = SECTION_ORDER.filter((s) => p101.sections[s].freshness === 'waiting').join(', ');
    got['101 · Issue blockers'] = String(issueBlockers(T, B, seed).length);
    got['101 · Issue without a reason'] = errOf(packIssueWrite(T, B, seed, 'najd.bid'));
    const issued = applyWrites(seed, writesOf(packIssueWrite(T, B, seed, 'najd.bid', 'Committee meets tomorrow; Finance confirms headroom by then')));
    got['101 · Issue with a reason'] = `${freshnessFor(T, B, issued)?.issueNote ?? 'no note'} · ${decisionState(T, B, issued).slaText}`;
  }

  // --- Simulated flows (8.3), each on an in-memory done
  const version = ds.packVersion ?? 0;
  const f1 = applyWrites(seed, writesOf(positionWrite(A, 'operations', { stance: 'support', packVersion: version, round: ds.round }, 'najd.member.operations')));
  const s1 = decisionState(T, A, f1);
  got['Flow 1 · Operations Director records Support'] = `${s1.positions.quorum.short} · ${s1.enabled ? 'enabled' : 'disabled'} · ${s1.staleAck ? 'stale acknowledgement required' : 'no acknowledgement'}`;
  got['Flow 1 · Approve without the acknowledgement'] = errOf(dg2Write({ tenderId: A, decision: 'bid' }, 'najd.hot', s1));

  got['Flow 2 · No-Bid against the majority, no reason'] = errOf(dg2Write({ tenderId: A, decision: 'no-bid', reasonCodes: ['capacity-conflict'], staleAcknowledged: true }, 'najd.hot', s1));
  const nb = dg2Write({ tenderId: A, decision: 'no-bid', reasonCodes: ['capacity-conflict'], staleAcknowledged: true, reason: 'Delivery load would pass the safe level if Abha is also won' }, 'najd.hot', s1);
  const f2 = applyWrites(f1, writesOf(nb));
  if (!isWriteError(nb)) {
    const rec = dg2RecordFor(T, A, f2);
    const overlay = dg2Overlay(T, A, f2);
    got['Flow 2 · No-Bid with a reason'] = `${nb.decision.againstMajority ? 'against majority' : 'with majority'} · ${rec?.decision?.differsText ?? 'no text'} · ${rec?.letter ? 'letter drafted' : 'no letter'} · ${overlay?.stage ?? 'none'}`;
    got['Flow 2 · No-Bid effects'] = nb.effects.join(' | ');
    const letter = declineLetter(T, A, 'najd.hot');
    const internal = [...NO_BID_REASONS.map((r) => r.label.toLowerCase()), 'margin', 'probability', 'stale', 'capacity', 'facility'];
    const leaks = letter ? internal.filter((w) => letter.text.toLowerCase().includes(w)) : ['no letter'];
    got['Flow 2 · Letter'] = `${letter?.text.includes('Thank you') && letter.text.includes('future tenders') ? 'Courteous' : 'Not courteous'} · ${leaks.length ? `mentions ${leaks.join(', ')}` : 'no internal reasons'} · signed by ${letter?.text.split('\n').slice(-3)[0]}`;
  } else {
    got['Flow 2 · No-Bid with a reason'] = nb.error;
  }

  const bid = dg2Write({ tenderId: A, decision: 'bid', staleAcknowledged: true }, 'najd.hot', s1);
  const f3 = applyWrites(f1, writesOf(bid));
  got['Flow 3 · Bid conditions'] = conditionsFor(T, A, f3).map((c) => `${c.text}${c.fromSeat ? ` (${SEAT_LABEL[c.fromSeat]})` : ''}`).join(' · ') || errOf(bid);
  got['Flow 3 · Bid effects'] = isWriteError(bid) ? bid.error : bid.effects.join(' | ');
  got['Flow 3 · Overlay'] = dg2Overlay(T, A, f3)?.stage ?? 'none';

  const f4 = applyWrites(seed, writesOf(positionWrite(A, 'sector', { stance: 'support', coi: { text: 'A close relative is a director of Hijr Al-Watan Contracting' }, packVersion: version }, 'najd.member.sector')));
  const sector4 = positionsFor(T, A, f4).seats.find((s) => s.seat === 'sector')?.position;
  got['Flow 4 · Sector Head declares a conflict'] = `${sector4?.stanceLabel ?? 'none'} · ${dg2RecordFor(T, A, f4)?.conflicts.some((c) => c.seat === 'sector') ? 'declaration recorded' : 'no declaration'}`;

  const f5 = applyWrites(seed, writesOf(positionWrite(A, 'sector', { stance: 'support', packVersion: version }, 'najd.member.sector', 'najd.hot')));
  got['Flow 5 · Secretary records the Sector Head'] = positionsFor(T, A, f5).seats.find((s) => s.seat === 'sector')?.position?.secretaryText ?? 'not marked';

  const f6 = applyWrites(seed, writesOf(packRerunWrite(T, A, seed, 'najd.bid')));
  const fr6 = freshnessFor(T, A, f6);
  got['Flow 6 · Re-run'] = `v${fr6?.version} · ${fr6?.stale ? 'stale' : 'fresh'} · changed ${compareVersions(T, A, 1, fr6?.version ?? 1).changed.join(', ')}`;
  got['Flow 6 · Margin after re-run'] = packFor(T, A, f6, ALL)?.summary.margin ?? '—';
  const f6opd = applyWrites(f6, writesOf(positionWrite(A, 'operations', { stance: 'support', packVersion: version }, 'najd.member.operations')));
  got['Flow 6 · Re-run not issued yet'] = decisionState(T, A, f6opd).staleAck ? 'stale acknowledgement required' : 'no acknowledgement';
  const f6b = applyWrites(f6, writesOf(packIssueWrite(T, A, f6, 'najd.bid')));
  const pos6 = positionsFor(T, A, f6b);
  got['Flow 6 · Issue v2'] = `${decisionState(T, A, f6b).slaText} · ${pos6.seats.filter((s) => s.position?.onOlderVersion).map((s) => `${s.label} ${s.position!.versionText}`).join(', ')}`;

  const f7a = applyWrites(f2, writesOf(reopenRequestWrite(T, A, f2, { reason: 'Hijr Al-Watan Contracting withdrew from the tender', trigger: 'competitor-withdrew' }, 'najd.bid')));
  const f7 = applyWrites(f7a, writesOf(reopenApproveWrite(T, A, f7a, 'najd.hot')));
  const s7 = decisionState(T, A, f7);
  got['Flow 7 · Re-open after a No-Bid'] = `${dg2Overlay(T, A, f7) ? 'still decided' : 'back at DG2'} · previous ${dg2RecordFor(T, A, f7)?.previous?.label ?? 'none'} · approval ${s7.enabled ? 'enabled' : `disabled (${s7.disabledReason})`}`;

  got['Flow 8 · Oppose with no comment'] = errOf(positionWrite(A, 'operations', { stance: 'oppose', packVersion: version }, 'najd.member.operations'));
  return got;
}

/** Info rows for any tenant's Stage 3 tenders. */
function tenderRows(tenant: GccTenantKey): Record<string, string> {
  const rows: Record<string, string> = {};
  for (const t of gccData(tenant).register.filter((x) => x.stage === 'S3' || x.stage === 'DG2')) {
    const p = packFor(tenant, t.id, {}, ALL);
    const ds = decisionState(tenant, t.id, {});
    rows[`${t.id} · Pack`] = p
      ? `v${p.version} ${p.issued ? 'issued' : 'draft'} · ${p.summary.recommendation} · win ${p.summary.win ?? '—'} · margin ${p.summary.margin ?? '—'} · ${p.summary.positions} · ${p.summary.sla}`
      : `No 009a pack (register: ${t.stage}${t.packIssuedAt ? `, issued ${t.packIssuedAt}` : ''})`;
    if (p) rows[`${t.id} · Decision`] = ds.enabled ? 'Enabled' : `Disabled: ${ds.disabledReason}`;
  }
  return rows;
}

/** Plan 009a Phase 9: every Stage 3 tender's derivations against plan 017's interim `s3` step facts. */
function agreementRows(tenant: GccTenantKey): Record<string, string> {
  const rows: Record<string, string> = {};
  const same = (theirs: string, mine: string) => (theirs === mine ? 'Agrees' : `Differs: 017 ${theirs} · 009a ${mine}`);
  const full = (m: { amount: number; ccy: Parameters<typeof money>[1] } | null | undefined) => (m ? money(m.amount, m.ccy, { full: true }) : 'none');
  for (const l of lifecyclesOf(tenant).filter((x) => x.facts?.stage === 3)) {
    const f = l.facts as S3Facts;
    const id = l.tenderId;
    const P = `${id} · agrees with 017:`;
    const pv = packVersionsFor(tenant, id, {});
    const pack = packFor(tenant, id, {}, ALL);
    const win = winFor(tenant, id);
    const fresh = freshnessFor(tenant, id, {});
    const inputs = inputsFor(tenant, id, {});
    const pos = positionsFor(tenant, id, {});

    rows[`${P} pack`] = same(`${f.pack}${f.issuedAt ? ` ${f.issuedAt}` : ''}`, `${pv.issued ? 'issued' : 'preparation'}${pv.firstIssuedAt ? ` ${pv.firstIssuedAt}` : ''}`);
    const theirItems = f.inputs.items.map((i) => [i.id, i.what, i.section, i.ownerId, i.requestedById, i.requestedAt, i.due, i.submittedAt ?? '-'].join(' | ')).sort();
    const myItems = inputs.items.map((i) => [i.itemId ?? '-', i.label, i.feeds.replace('§', ''), i.ownerId, i.requestedById, i.requestedAt, i.due, i.submittedAt ?? '-'].join(' | ')).sort();
    const itemsDiffer = theirItems.filter((x) => !myItems.includes(x)).concat(myItems.filter((x) => !theirItems.includes(x)));
    rows[`${P} inputs`] = same(totals(f.inputs), totals(inputs.totals)) === 'Agrees' && !itemsDiffer.length
      ? 'Agrees'
      : `Differs: 017 ${totals(f.inputs)} · 009a ${totals(inputs.totals)}${itemsDiffer.length ? ` · items ${itemsDiffer.join('; ')}` : ''}`;
    rows[`${P} stale`] = same(f.stale ? `since ${f.stale.since}` : 'fresh', fresh?.stale ? `since ${fresh.stale.since}` : 'fresh');
    const theirSeats = SEATS.flatMap((seat) => { const x = f.positions.bySeat[seat]; return x ? [`${seat} ${x.stance} ${x.at}${x.comment ? ` "${x.comment}"` : ''}`] : []; });
    const mySeats = pos.seats.flatMap((x) => (x.position ? [`${x.seat} ${x.position.stance} ${x.position.at}${x.position.comment ? ` "${x.position.comment}"` : ''}`] : []));
    rows[`${P} positions`] = same(`${f.positions.recorded} of ${f.positions.of}: ${theirSeats.join(', ') || 'none'}`, `${pos.recorded} of ${pos.quorum.of}: ${mySeats.join(', ') || 'none'}`);
    rows[`${P} win`] = same(`${f.win.p} ± ${f.win.band}`, win?.text ?? 'no model');
    const m = pack?.sections['9.7'].body;
    rows[`${P} margin range`] = same(`${f.marginRange[0]}–${f.marginRange[1]}`, m && !m.masked ? `${m.low}–${m.high}` : 'none');
    rows[`${P} facility after bond`] = same(full(f.facilityAfter), full(pack?.facilityAfter));
    rows[`${P} weighted value`] = same(full(f.weightedValue), full(pack?.weightedValue));
  }
  return rows;
}

function stableJson(tenant: GccTenantKey): string {
  const ids = gccData(tenant).register.filter((x) => x.stage === 'S3' || x.stage === 'DG2').map((t) => t.id);
  return JSON.stringify(ids.map((id) => [packFor(tenant, id, {}, ALL), packFor(tenant, id, {}, MASKED), decisionState(tenant, id, {}), dg2RecordFor(tenant, id, {})]));
}

export default function Stage3Check() {
  const key = useTenantKey();
  if (!isGccTenantKey(key)) return <CardHead title="Stage 3 and DG2 rules" meta="No GCC seed for this tenant" />;

  const got: Record<string, string> = { ...(key === 'najd' ? najdRows() : {}), ...tenderRows(key), ...agreementRows(key) };
  got['Determinism'] = stableJson(key) === stableJson(key) ? 'Equal JSON on a second call' : 'Differs between calls';
  const offenders = Object.entries(SOURCES).filter(([, src]) => /Date\.now|Math\.random/.test(src)).map(([p]) => p.split('/').pop());
  got['Date.now and Math.random'] = offenders.length ? `Found in ${offenders.join(', ')}` : 'None';

  const exp = { ...ALWAYS, ...(EXPECT[key] ?? {}) };
  const checks: Check[] = Object.entries(got).map(([name, g]) => ({ name, got: g, expected: exp[name] ?? (g.startsWith('Agrees') || g.startsWith('Differs') ? 'Agrees' : undefined) }));
  const targeted = checks.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => c.expected !== c.got).length;
  const models = WIN_MODELS.filter((m) => m.tenant === key).length;

  return (
    <>
      <CardHead title="Stage 3 and DG2 rules (plan 009a)" meta={failing ? `${failing} of ${targeted.length} targets failing` : `All ${targeted.length} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        <KV k="Win models, packs, seeded inputs" v={`${models} · ${PACK_VERSIONS.filter((p) => p.tenant === key).length} · ${SEEDED_INPUTS.filter((i) => i.tenant === key).length}`} />
        <KV k="Sources scanned" v={`${Object.keys(SOURCES).length} files in data/gcc/s3, domain/gcc/s3, domain/gcc/dg2`} />
        <KV k="Agreement with plan 017" v={`${lifecyclesOf(key).filter((l) => l.facts?.stage === 3).length} Stage 3 tenders checked against their step facts`} />
      </div>
      <DataTable
        rows={checks}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Rule', width: '1.6fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '1.6fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '1.6fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
    </>
  );
}
