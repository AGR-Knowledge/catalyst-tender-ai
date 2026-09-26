import { useTenantKey } from '@/domain/tenancy';
import { money } from '@/domain/money';
import { dateText } from '@/domain/calendar';
import { isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import { HERO_ID, HERO_LINES } from '@/data/gcc/hero';
import { S2_SUPPLIERS } from '@/data/gcc/s2';
import { LIFECYCLES, type S2Facts } from '@/data/gcc/lifecycle';
import * as S2 from '@/domain/gcc/s2';
import { dg1Reopen } from '@/domain/gcc/dg1';
import { CardHead, KV } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Dev check for plan 008a: Stage 2 sourcing rules on the active tenant, with
 * target / got / result. Najd shows the full set: its seed readings
 * (gcc-demo-data §5.3), the hero's packages and shortlists, the levelling
 * trace, six simulated flows on an in-memory `done`, and the Supplier Portal
 * masking. Every tenant also checks each live Stage 2 tender against plan
 * 017's `s2` step facts (10.7). Plan 020 lane D adds the shortlist, levelling,
 * DG1 re-open, kick-off owner, replies-due and extension-reason rows. No page
 * reads this; plan 008b builds the screens.
 */

const T104 = 'T-2026-104';
const T109 = 'T-2026-109';

// Plan 008a acceptance values.
const EXPECT: Record<string, string> = {
  // 10.1 Najd seed
  'T-104 packages · covered': '11 · 7',
  'T-104 RFQs · due so far': '33 · 31',
  'T-104 answered on time': '22 of 31 (71%)',
  'T-104 overdue': '4 (2 escalated)',
  'T-104 to level': '5',
  'T-104 clarifications': '4 open, 0 stale',
  'T-104 not covered': '3.1%',
  'T-109 packages · covered': '9 · 0',
  'T-109 RFQs · due so far': '27 · 0',
  'T-109 sent after DG1': '22 h 45 m',
  'T-109 clarifications': '2 open, 0 stale',
  'T-109 replies due': 'Sun 15 Mar 2026',
  'T-104 replies due': 'Tue 10 Mar 2026 · 4 overdue',
  'SRC-1 RFQs within 24 h of DG1': '100%',
  'SRC-3 Replies on time': '71% (22 of 31)',
  'SRC-4 Overdue RFQs': '4 (2 escalated)',
  'SRC-5 Open clarifications': '6 open, 0 stale',
  'SRC-6 To level': '5',
  'Supplier master': '48 · 41 current · 5 due · 2 blocked',
  // 10.2 Hero
  'Hero coverage bar': '49.7 / 32.3 / 16.0 / 2.0',
  'Hero subcontract cap': 'Subcontract works 16% of the 30% cap ✓',
  'Hero long-lead packages': 'P-02 40, P-03 30, P-06 36',
  'Hero shortlists of 4–6, with reasons': '11 of 11 packages',
  'Tarvessa Trading FZE greyed in': 'P-08, P-09',
  'Hero P-09 approved without Tarvessa, no reason': 'approved',
  'Hero P-09 approved without a sendable supplier, no reason': 'refused',
  'Hero P-02 RFQ draft': '6 lines, no rate field',
  // 10.3 Levelling: adjustment kinds, in rule order
  'Levelling: Rhein Aqua Systems GmbH': 'currency, delivery (est.), validity, lead-time',
  'Levelling: Hanseong Water Machinery': 'currency, delivery (est.)',
  'Levelling: Nordklar Filtration AB': 'exclusion (est.)',
  'Levelling: Castellan Separators Srl': 'currency, payment',
  'Levelling: Hijaz Power Equipment Co.': 'vat',
  // 10.4 Simulated flows
  'Flow 1: confirm every adjustment': 'to level 0 · P-02 open · covered 7',
  'Flow 2: Gulf Process quotes T-104 P-02': 'overdue 3 · P-02 3 quotes, 1 to level',
  'Flow 3: hero pursued at 10:00': 'due Mon 9 Mar 2026, 10:00 AST · 0 of 11',
  'Flow 3: shortlists approved, all sent': '11 of 11 · supplier sees hero P-02',
  'Flow 4: send to a blocked supplier': 'refused',
  'Flow 4: shortlist a blocked supplier': 'refused',
  'Flow 5: accept a gap on T-104 P-06': 'covered 8',
  'Flow 6: Balanced mix with one override': 'audit includes the reason',
  'Flow 7: DG1 re-opened on T-104': 'not live · no pursue · no kick-off',
  'Flow 8: pursue naming a Procurement owner': 'kick-off owned by the named owner',
  'Levelling: reject without a note': 'refused',
  'Levelling: change an amount without a note': 'refused',
  'Levelling: change an amount with a note': 'recorded, agent figure kept',
  // 10.5, 10.6
  'Supplier view T-104 P-02: leaks': 'none',
  'Supplier view: another firm’s RFQ': 'not shown',
  'Supplier view hero P-02: leaks': 'none',
  'Determinism: second run': 'equal',
};

/** Inputs to the simulated flows (not targets). */
const SIMULATION = {
  pursueAt: '2026-03-08T10:00',
  gulfQuote: { level: 'line' as const, amount: 20_800_000, ccy: 'SAR' as const, validityDays: 90, leadTimeWeeks: 30, deviations: [], exclusions: [], fileName: 'GPS-quote-T104-P02.pdf' },
  gapReason: 'Two of three suppliers answered; the third declined and the utility list has no other substation supplier',
  overrideReason: 'delivery record',
  reopenReason: 'Client re-issued the scope; the pursue is reviewed again',
  levelNote: 'Supplier confirmed supervision at a lower day rate',
  /** A Procurement owner other than the tenant's default, to show the kick-off follows the DG1 team. */
  teamProc: 'najd.coord',
};

/** The next reply date still ahead after extensions, per tender that has extended RFQs (plan 020 D3). */
const REPLIES_DUE: Record<string, string> = { 'T-2026-104': 'Tue 10 Mar 2026', 'T-2026-027': 'Thu 12 Mar 2026' };

interface Check { name: string; expected?: string; got: string }

/** One line for a tender's Stage 2 step facts, from 017's record or from the rules. */
const factsLine = (f: Omit<S2Facts, 'stage' | 'bestFitApproved'>) =>
  `packages ${f.packages.total} · ${f.packages.covered} · RFQs ${f.rfqs.sent} of ${f.rfqs.total} · due ${f.rfqs.dueSoFar} · on time ${f.rfqs.answeredOnTime} · ` +
  `overdue ${f.rfqs.overdue} (${f.rfqs.escalated}) · to level ${f.toLevel} · not covered ${f.notCoveredPct}% · replies due ${dateText(f.repliesDue.slice(0, 10))} · ` +
  `clarifications ${f.clarifications.open} open, ${f.clarifications.stale} stale`;

type Write = S2.S2WriteResult<unknown>;
const apply = (done: S2.Done, w: Write) => {
  if (S2.isWriteError(w)) throw new Error(w.error);
  done[w.key] = w.value;
  return w;
};

/** Strings and numbers the Supplier Portal must never carry, for one RFQ. */
function leaksIn(tenant: string, view: S2.SupplierView, tenderId: string, pkgId: string): string[] {
  const json = JSON.stringify(view);
  const own = view.supplier.name;
  const rec = S2.s2TenderOf(tenant, tenderId)!;
  const pkg = rec.packages.find((p) => p.id === pkgId)!;
  const row = S2.registerRow(tenant, tenderId)!;
  const found: string[] = [];
  for (const s of S2_SUPPLIERS[tenant as GccTenantKey]) if (s.name !== own && json.includes(s.name)) found.push(s.name);
  const value = row.value.amount;
  for (const text of [value.toLocaleString('en-GB'), money(value, row.value.ccy), `${row.value.ccy} ${Math.round(value / 1e6)}`, pkg.value.amount.toLocaleString('en-GB'), money(pkg.value.amount, pkg.value.ccy)]) {
    if (json.includes(text)) found.push(text);
  }
  if (/estimat/i.test(json)) found.push('the word "estimate"');
  if (/"rate"|"value"/.test(json)) found.push('a rate or value field');
  const numbers = new Set<number>();
  const walk = (x: unknown) => {
    if (typeof x === 'number') numbers.add(x);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  };
  walk(view);
  const rates = pkg.lineItems ? HERO_LINES.filter((l) => pkg.lineItems!.includes(l.item)).map((l) => l.rate) : [];
  const qtys = new Set(view.lines.map((l) => l.qty));
  for (const r of rates) if (numbers.has(r) && !qtys.has(r)) found.push(`line rate ${r}`);
  return found;
}

function compute(key: GccTenantKey) {
  const seed: S2.Done = {};
  const got: Record<string, string> = {};
  const info: [string, string][] = [];
  /** 10.7: 017's `s2` facts per tender, read from its lifecycle records. */
  const facts: Record<string, string> = {};
  const masters = S2_SUPPLIERS[key].map((s) => S2.screeningOf(s).state);
  got['Supplier master'] = `${masters.length} · ${masters.filter((x) => x === 'current').length} current · ${masters.filter((x) => x === 'due').length} due · ${masters.filter((x) => x === 'blocked').length} blocked`;

  const held = S2.heldByScreening(key, seed);
  const saved = S2.buyerTimeSaved(key, seed);
  const trailing = S2.rfqsWithin24h(key, seed);
  const onTime = S2.repliesOnTime(key, seed);
  const od = S2.overdue(key, seed);
  const clar = S2.openClarifications(key, seed);
  got['SRC-1 RFQs within 24 h of DG1'] = trailing.total ? `${trailing.pct}%` : '—';
  got['SRC-3 Replies on time'] = onTime.pct === null ? '—' : `${onTime.pct}% (${onTime.onTime} of ${onTime.due})`;
  got['SRC-4 Overdue RFQs'] = `${od.count} (${od.escalated} escalated)`;
  got['SRC-5 Open clarifications'] = `${clar.open} open, ${clar.stale} stale`;
  got['SRC-6 To level'] = String(S2.toLevel(key, seed).count);
  info.push(['SRC-8 Held by screening', `${held.count} shortlist places, ${held.suppliers} suppliers, ${held.blocked} blocked: ${held.rows.map((r) => `${r.tenderId.slice(-3)} ${r.pkgId} ${r.name}`).join('; ') || 'none'}`]);
  info.push(['SRC-11 Buyer time saved (estimated)', `${saved.hours} h: ${saved.nudges} nudges, ${saved.parsed} quotes parsed, ${saved.levelled} levelled`]);
  info.push(['Live Stage 2 tenders', S2.liveS2Tenders(key, seed).map((t) => t.tenderId).join(', ') || 'none seeded yet']);

  // Plan 020 D6, D7: every extension states why; the overdue RFQs not yet escalated fall due at their own times.
  const liveRfqs = S2.liveS2Tenders(key, seed).flatMap((t) => S2.rfqsFor(key, t.tenderId, seed));
  const extended = liveRfqs.filter((r) => r.extendedFrom);
  got['Every extended RFQ states why'] = extended.every((r) => r.extensionReason?.trim()) ? 'yes' : `${extended.filter((r) => !r.extensionReason).length} of ${extended.length} without a reason`;
  const waiting = od.rfqs.filter((r) => !S2.isEscalated(key, r));
  info.push(['Overdue, not escalated: reply times', waiting.map((r) => `${r.tenderId.slice(-3)} ${r.packageId} ${r.replyBy.slice(11)}`).join(' · ') || 'none']);
  for (const r of extended) info.push([`Extended ${r.id}`, `${dateText(r.extendedFrom!.slice(0, 10))} → ${dateText(r.replyBy.slice(0, 10))} ${r.replyBy.slice(11)}: ${r.extensionReason ?? '—'}`]);

  for (const t of S2.liveS2Tenders(key, seed)) {
    const cov = S2.packageCoverage(key, t.tenderId, seed);
    const c = S2.rfqCounts(key, t.tenderId, seed);
    const tag = t.tenderId === T104 ? 'T-104' : t.tenderId === T109 ? 'T-109' : t.tenderId;
    const cl = S2.clarificationsFor(key, t.tenderId, seed).filter((x) => x.state === 'open');
    got[`${tag} packages · covered`] = `${cov.total} · ${cov.covered}`;
    got[`${tag} RFQs · due so far`] = `${c.sent} · ${c.dueSoFar}`;
    got[`${tag} clarifications`] = `${cl.length} open, ${cl.filter((x) => x.stale).length} stale`;
    const lag = S2.rfqIssueLag(key, t.tenderId, seed);
    const want = LIFECYCLES[key].find((l) => l.tenderId === t.tenderId)?.facts;
    const openCl = cl.length;
    const mine = factsLine({
      packages: { total: cov.total, covered: cov.covered },
      rfqs: { sent: c.sent, total: c.total, overdue: c.overdue, escalated: c.escalated, answeredOnTime: c.answeredOnTime, dueSoFar: c.dueSoFar },
      toLevel: S2.levelledFor(key, t.tenderId, seed).filter((l) => l.state === 'to-level').length,
      notCoveredPct: S2.notCovered(key, t.tenderId)?.pct ?? 0,
      repliesDue: c.repliesDue ?? '',
      clarifications: { open: openCl, stale: cl.filter((x) => x.stale).length },
    });
    if (REPLIES_DUE[t.tenderId] && tag !== 'T-104') got[`${t.tenderId} replies due`] = c.repliesDue ? dateText(c.repliesDue.slice(0, 10)) : '—';
    const name = `017 s2 facts: ${t.tenderId}`;
    got[name] = mine;
    facts[name] = want?.stage === 2 ? factsLine(want) : 'no Stage 2 facts in plan 017';
    if (tag === 'T-104') {
      got['T-104 answered on time'] = `${c.answeredOnTime} of ${c.dueSoFar} (${Math.round((c.answeredOnTime / c.dueSoFar) * 100)}%)`;
      got['T-104 overdue'] = `${c.overdue} (${c.escalated} escalated)`;
      got['T-104 to level'] = String(S2.levelledFor(key, t.tenderId, seed).filter((l) => l.state === 'to-level').length);
      got['T-104 not covered'] = `${S2.notCovered(key, t.tenderId)!.pct}%`;
      got['T-104 replies due'] = `${c.repliesDue ? dateText(c.repliesDue.slice(0, 10)) : '—'} · ${c.overdue} overdue`;
      info.push(['T-104 RFQs issued after DG1', lag?.text ?? '—']);
      info.push(['T-104 long-lead at risk (SRC-9)', S2.longLeadAtRisk(key, t.tenderId, seed).map((x) => `${x.pkgId}: ${x.text}`).join('; ') || 'none']);
      info.push(['T-104 package board', S2.packageBoard(key, t.tenderId, seed).map((b) => `${b.pkgId} ${b.label}`).join(' · ')]);
    }
    if (tag === 'T-109') {
      got['T-109 sent after DG1'] = lag?.text ?? '—';
      got['T-109 replies due'] = c.repliesDue ? dateText(c.repliesDue.slice(0, 10)) : '—';
    }
  }

  // 10.2 Hero (every tenant)
  const bar = S2.coverageBar(key, HERO_ID)!;
  got['Hero coverage bar'] = [bar.selfPct, bar.supplyPct, bar.subcontractPct, bar.notCoveredPct].map((x) => x.toFixed(1)).join(' / ');
  got['Hero subcontract cap'] = `${bar.subcontractCap.text} ${bar.subcontractCap.ok ? '✓' : '×'}`;
  const heroPkgs = S2.packagesFor(key, HERO_ID, seed);
  got['Hero long-lead packages'] = heroPkgs.filter((p) => p.longLead).map((p) => `${p.pkg.id} ${p.longLead!.weeks}`).join(', ');
  const lists = heroPkgs.map((p) => S2.recommendedShortlist(key, HERO_ID, p.pkg.id, seed));
  const ok = lists.filter((l) => l.items.length >= 4 && l.items.length <= 6 && l.items.every((i) => i.reason));
  got['Hero shortlists of 4–6, with reasons'] = `${ok.length} of ${lists.length} packages`;
  got['Tarvessa Trading FZE greyed in'] = lists.filter((l) => l.items.some((i) => i.supplierId === 'tarvessa' && !i.sendable)).map((l) => l.pkgId).join(', ') || 'none';
  // Plan 020 D1: leaving out a greyed supplier needs no reason; leaving out a sendable one does.
  const p09 = S2.recommendedShortlist(key, HERO_ID, 'P-09', seed).items;
  const p09Sendable = p09.filter((i) => i.sendable).map((i) => i.supplierId);
  got['Hero P-09 approved without Tarvessa, no reason'] = S2.isWriteError(S2.shortlistWrite(key, HERO_ID, 'P-09', p09Sendable, [], `${key}.proc`, seed)) ? 'refused' : 'approved';
  got['Hero P-09 approved without a sendable supplier, no reason'] = S2.isWriteError(S2.shortlistWrite(key, HERO_ID, 'P-09', p09Sendable.slice(1), [], `${key}.proc`, seed)) ? 'refused' : 'approved';
  const draft = S2.rfqDraft(key, HERO_ID, 'P-02', seed)!;
  got['Hero P-02 RFQ draft'] = `${draft.lines.length} lines, ${/"rate"/.test(JSON.stringify(draft)) ? 'a rate field' : 'no rate field'}`;

  // 10.3 Levelling
  const trace = S2.toLevel(key, seed).quotes;
  for (const l of trace) got[`Levelling: ${l.supplierName}`] = l.adjustments.map((a) => `${a.kind}${a.estimated ? ' (est.)' : ''}`).join(', ');
  // Plan 020 D2: rejecting the agent's adjustment, or changing its amount, needs a note.
  const est = trace.flatMap((l) => l.adjustments.filter((a) => a.state === 'proposed' && a.estimated && a.delta).map((a) => ({ l, a })))[0];
  if (est) {
    const { l, a } = est;
    const other = a.delta!.amount - 1000;
    got['Levelling: reject without a note'] = S2.isWriteError(S2.levelWrite(l.quoteId, a.key, 'rejected', `${key}.proc`, undefined, '  ', a)) ? 'refused' : 'recorded';
    got['Levelling: change an amount without a note'] = S2.isWriteError(S2.levelWrite(l.quoteId, a.key, 'confirmed', `${key}.proc`, other, undefined, a)) ? 'refused' : 'recorded';
    const d2: S2.Done = {};
    const w = S2.levelWrite(l.quoteId, a.key, 'confirmed', `${key}.proc`, other, SIMULATION.levelNote, a);
    if (!S2.isWriteError(w)) d2[w.key] = w.value;
    const after = S2.levelledFor(key, l.tenderId, d2).find((x) => x.quoteId === l.quoteId)?.adjustments.find((x) => x.key === a.key);
    got['Levelling: change an amount with a note'] = S2.isWriteError(w) ? 'refused'
      : after?.delta?.amount === other && after.proposedDelta?.amount === a.delta!.amount && after.note === SIMULATION.levelNote ? 'recorded, agent figure kept' : 'not applied';
  }

  // 10.4 Flows, Najd only: one in-memory `done`, each flow on top of the last.
  const flows: Record<string, string> = {};
  let heroView: S2.SupplierView | null = null;
  if (key === 'najd') {
    const d: S2.Done = {};
    try {
      for (const l of S2.toLevel(key, d).quotes) for (const a of l.adjustments.filter((x) => x.state === 'proposed')) apply(d, S2.levelWrite(l.quoteId, a.key, 'confirmed', 'najd.proc'));
      const c1 = S2.packageCoverage(key, T104, d);
      flows['Flow 1: confirm every adjustment'] = `to level ${S2.toLevel(key, d).count} · P-02 ${c1.packages.find((p) => p.pkgId === 'P-02')!.state} · covered ${c1.covered}`;

      apply(d, S2.supplierQuoteWrite(`${T104}-P-02-gulf-process`, SIMULATION.gulfQuote, 'najd.supplier'));
      const p02 = S2.levelledFor(key, T104, d).filter((l) => l.packageId === 'P-02');
      flows['Flow 2: Gulf Process quotes T-104 P-02'] = `overdue ${S2.overdue(key, d).count} · P-02 ${p02.length} quotes, ${p02.filter((l) => l.state === 'to-level').length} to level`;

      d[S2.K.dg1(HERO_ID)] = JSON.stringify({ tenderId: HERO_ID, decision: 'pursue', at: SIMULATION.pursueAt, byId: 'najd.bid' });
      const c0 = S2.rfqClock(key, HERO_ID, d);
      flows['Flow 3: hero pursued at 10:00'] = c0 ? `due ${c0.dueText} · ${c0.sent} of ${c0.total}` : 'no clock';
      for (const { pkg } of S2.packagesFor(key, HERO_ID, d)) {
        const rec = S2.recommendedShortlist(key, HERO_ID, pkg.id, d);
        // A blocked supplier can never be shortlisted; leaving it out needs no reason.
        apply(d, S2.shortlistWrite(key, HERO_ID, pkg.id, rec.items.filter((i) => i.screening.state !== 'blocked').map((i) => i.supplierId), [], 'najd.proc', d));
        apply(d, S2.rfqWrite(key, HERO_ID, pkg.id, rec.items.filter((i) => i.sendable).map((i) => i.supplierId), 'najd.proc', d));
      }
      const c3 = S2.rfqClock(key, HERO_ID, d);
      const heroP02 = `${HERO_ID}-P-02-gulf-process`;
      const sees = S2.supplierRfqs(key, 'najd.supplier', d).some((r) => r.rfqId === heroP02);
      flows['Flow 3: shortlists approved, all sent'] = `${c3?.sent} of ${c3?.total} · ${sees ? 'supplier sees hero P-02' : 'supplier does not see hero P-02'}`;
      heroView = S2.supplierView(key, 'najd.supplier', heroP02, d);

      const refused = S2.rfqWrite(key, HERO_ID, 'P-09', ['tarvessa'], 'najd.proc', d);
      flows['Flow 4: send to a blocked supplier'] = S2.isWriteError(refused) ? 'refused' : 'sent';
      info.push(['Flow 4 message', S2.isWriteError(refused) ? refused.error : '—']);
      const p09Ids = S2.approvedShortlist(key, HERO_ID, 'P-09', d)?.supplierIds ?? [];
      const listed = S2.shortlistWrite(key, HERO_ID, 'P-09', [...p09Ids, 'tarvessa'], [{ supplierId: 'tarvessa', action: 'add', reason: SIMULATION.overrideReason }], 'najd.proc', d);
      flows['Flow 4: shortlist a blocked supplier'] = S2.isWriteError(listed) ? 'refused' : 'approved';
      info.push(['Flow 4 shortlist message', S2.isWriteError(listed) ? listed.error : '—']);

      apply(d, S2.gapWrite(T104, 'P-06', SIMULATION.gapReason, 'najd.proc'));
      flows['Flow 5: accept a gap on T-104 P-06'] = `covered ${S2.packageCoverage(key, T104, d).covered}`;

      const rank2 = S2.packageScores(key, T104, 'P-05', d).rows.find((r) => r.rank === 2)!;
      const mix = apply(d, S2.mixWrite(key, T104, 'balanced', [{ pkgId: 'P-05', supplierId: rank2.supplierId, reason: SIMULATION.overrideReason }], 'najd.proc', d)) as S2.S2Write<unknown>;
      flows['Flow 6: Balanced mix with one override'] = mix.audit.detail?.includes(SIMULATION.overrideReason) ? 'audit includes the reason' : 'reason missing';
      info.push(['Flow 6 audit', mix.audit.detail ?? '']);
      const opts = S2.mixOptions(key, T104, d).options;
      info.push(['T-104 mix options (SRC-10 ICV)', opts.map((o) => `${o.label} ${money(o.total.amount, o.total.ccy)}, ICV ${o.icvShare}%`).join(' · ')]);

      // Plan 020 D4: a DG1 re-open (007a) takes the tender out of Stage 2.
      const r7: S2.Done = {};
      for (const w of dg1Reopen(key, T104, SIMULATION.reopenReason, 'najd.hot', r7, SIMULATION.pursueAt).writes) r7[w.key] = w.value;
      const live7 = S2.liveS2Tenders(key, r7).some((t) => t.tenderId === T104);
      flows['Flow 7: DG1 re-opened on T-104'] = [live7 ? 'live' : 'not live', S2.pursueOf(key, T104, r7) ? 'pursue stands' : 'no pursue', S2.kickoffFor(key, T104, r7) ? 'kick-off' : 'no kick-off'].join(' · ');

      // Plan 020 D9: the kick-off's sourcing items belong to the Procurement owner the DG1 team names.
      const r8: S2.Done = { [S2.K.dg1(HERO_ID)]: JSON.stringify({ tenderId: HERO_ID, decision: 'pursue', at: SIMULATION.pursueAt, byId: 'najd.bid', team: { proc: SIMULATION.teamProc } }) };
      const owners = (S2.kickoffFor(key, HERO_ID, r8)?.items ?? []).filter((i) => !i.inputKey).map((i) => i.ownerId);
      flows['Flow 8: pursue naming a Procurement owner'] = owners.length && owners.every((o) => o === SIMULATION.teamProc) ? 'kick-off owned by the named owner' : `owned by ${owners.join(', ') || 'nobody'}`;
    } catch (e) {
      flows['Flow error'] = e instanceof Error ? e.message : String(e);
    }
    Object.assign(got, flows);

    // 10.5 Masking
    const v = S2.supplierView(key, 'najd.supplier', `${T104}-P-02-gulf-process`, seed);
    got['Supplier view T-104 P-02: leaks'] = v ? leaksIn(key, v, T104, 'P-02').join(', ') || 'none' : 'no view';
    got['Supplier view: another firm’s RFQ'] = S2.supplierView(key, 'najd.supplier', `${T104}-P-02-rhein-aqua`, seed) ? 'shown' : 'not shown';
    got['Supplier view hero P-02: leaks'] = heroView ? leaksIn(key, heroView, HERO_ID, 'P-02').join(', ') || 'none' : 'no view';
  }
  return { got, info, trace, facts };
}

export default function Stage2Check() {
  const key = useTenantKey();
  if (!isGccTenantKey(key)) return <CardHead title="Stage 2 sourcing rules" meta="No GCC seed for this tenant" />;
  let r: ReturnType<typeof compute>;
  try {
    r = compute(key);
  } catch (e) {
    return <CardHead title="Stage 2 sourcing rules" meta={`Error: ${e instanceof Error ? e.message : String(e)}`} />;
  }
  // 10.6 Determinism: the same answers on a second run.
  const same = JSON.stringify(compute(key)) === JSON.stringify(r);
  r.got['Determinism: second run'] = same ? 'equal' : 'different';

  const najd = key === 'najd';
  // The hero's packages are the same in every tenant; its shortlists depend on each tenant's master, so only Najd's are targeted.
  // The levelling-note rules hold wherever a quote has an estimated adjustment to decide.
  const LEVEL_NOTES = ['Levelling: reject without a note', 'Levelling: change an amount without a note', 'Levelling: change an amount with a note'];
  const everyTenant = (name: string) => name.startsWith('Determinism') || LEVEL_NOTES.includes(name)
    || (name.startsWith('Hero') && !name.startsWith('Hero shortlists') && !name.startsWith('Hero P-09 approved'));
  const expected = (name: string) => {
    if (r.facts[name]) return r.facts[name];
    if (name === 'Every extended RFQ states why') return 'yes';
    const tid = name.match(/^(T-\d{4}-\d{3}) replies due$/)?.[1];
    if (tid) return REPLIES_DUE[tid];
    return najd || everyTenant(name) ? EXPECT[name] : undefined;
  };
  const checks: Check[] = Object.entries(r.got).map(([name, got]) => ({ name, got, expected: expected(name) }));
  if (!najd) {
    // Every seeded RFQ goes to a sendable supplier in the package's trade, and the master has at least one screening due.
    const live = S2.liveS2Tenders(key, {});
    const rfqs = live.flatMap((t) => S2.rfqsFor(key, t.tenderId, {}).map((x) => ({ x, pkg: t.packages.find((p) => p.id === x.packageId)! })));
    const fit = rfqs.filter(({ x, pkg }) => {
      const s = S2.supplierOf(key, x.supplierId);
      return s && S2.screeningOf(s).sendable && s.trades.some((tr) => pkg.trades.includes(tr));
    }).length;
    const due = S2_SUPPLIERS[key].filter((s) => S2.screeningOf(s).state === 'due').length;
    checks.push({ name: 'Seeded RFQs to sendable, trade-matched suppliers', expected: 'yes', got: fit === rfqs.length ? 'yes' : `${rfqs.length - fit} of ${rfqs.length} not` });
    checks.push({ name: 'Supplier master has screening due', expected: 'yes', got: due >= 1 ? 'yes' : 'no' });
  }
  const targeted = checks.filter((c) => c.expected !== undefined);
  const failing = targeted.filter((c) => c.expected !== c.got).length;

  return (
    <>
      <CardHead title="Stage 2 sourcing rules (plan 008a)" meta={failing ? `${failing} of ${targeted.length} targets failing` : `All ${targeted.length} targets met`} />
      <div style={{ padding: '6px 22px 14px' }}>
        {r.info.map(([k, v]) => <KV key={k} k={k} v={v} />)}
      </div>
      <DataTable
        rows={checks}
        rowKey={(c) => c.name}
        columns={[
          { key: 'n', header: 'Derived value', width: '1.6fr', primary: true, render: (c) => <span className="cell-main">{c.name}</span> },
          { key: 'e', header: 'Target', width: '1.4fr', priority: 2, render: (c) => c.expected ?? '—' },
          { key: 'g', header: 'Got', width: '1.4fr', render: (c) => c.got },
          { key: 'r', header: 'Result', width: '.6fr', align: 'right', render: (c) => (c.expected === undefined ? <span className="t-muted">Info</span> : c.got === c.expected ? <span className="t-green">✓ Pass</span> : <span className="t-red">× Fail</span>) },
        ]}
      />
      {r.trace.length > 0 && (
        <DataTable
          rows={r.trace.flatMap((l) => [
            { id: `${l.quoteId}-total`, quote: l.supplierName, label: `${money(l.original.amount, l.original.ccy, { full: true })} → ${money(l.levelled.amount, l.levelled.ccy, { full: true })} levelled`, source: l.flags.join('; ') || '—', state: l.state },
            ...l.adjustments.map((a) => ({ id: `${l.quoteId}-${a.key}`, quote: '', label: `${a.label}${a.delta ? ` (${money(a.delta.amount, a.delta.ccy, { full: true })})` : ''}${a.estimated ? ', estimated' : ''}`, source: a.source, state: a.state })),
          ])}
          rowKey={(x) => x.id}
          columns={[
            { key: 'q', header: 'Quote to level', width: '1fr', primary: true, render: (x) => <span className="cell-main">{x.quote}</span> },
            { key: 'l', header: 'Adjustment', width: '2fr', render: (x) => x.label },
            { key: 's', header: 'Source', width: '2fr', priority: 2, render: (x) => x.source },
            { key: 't', header: 'State', width: '.6fr', align: 'right', render: (x) => x.state },
          ]}
        />
      )}
    </>
  );
}
