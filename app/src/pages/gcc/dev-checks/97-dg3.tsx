import { useMemo } from 'react';
import { can } from '@/data/access';
import { personById } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { DG3_EVIDENCE } from '@/data/gcc/dg3';
import { addDays } from '@/domain/calendar';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { currentOf, lifecycle, openGate, tenderCtx } from '@/domain/gcc/lifecycle';
import { applyWrites, isWriteError, type Done } from '@/domain/gcc/s3/done';
import { requestsFor } from '@/domain/gcc/requests';
import { ACTION_SOURCES } from '@/domain/gcc/actions/portfolio.actions';
import { ACTION_SOURCES as REQUEST_SOURCES } from '@/domain/gcc/actions/requests.actions';
import { KPIS as STAGE7 } from '@/domain/gcc/kpi/stage7.kpi';
import type { KpiCtx } from '@/domain/gcc/kpi/types';
import {
  APPROVE_NEEDS_PASS, DG3_BACK_TOPIC, SENT_BACK_WAIT, dg3Prefixes, dg3RecordFor, dg3ReissueWrite, dg3ReopenWrite, dg3SendBackWrite, dg3State,
  dg3TenderOf, dg3Tenders, dg3Write, evaluateDg3, linesFor, summarise, type Dg3Result,
} from '@/domain/gcc/dg3';
import { useTenantKey } from '@/domain/tenancy';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';

/**
 * Plan 018: DG3, the Head of Tendering's final gate. Runs on in-memory `done`
 * maps built with the rule module's own writers, never on the live demo, so
 * it changes nothing. It reads all five tenants whichever is open: Najd's
 * clean pack, Qurain's guarantee catch and the loop that fixes it.
 */

interface Check { name: string; ok: boolean; got: string }

const GCC = ['najd', 'corniche', 'dafna', 'batinah', 'qurain'] as const;
const NAJD = 'T-2025-305';
const QURAIN = 'T-2025-428';

const who = (id: string) => personById(id)!;
const ctxOf = (tenant: string, viewerId: string, done: Done) => ({ tenant, viewer: who(viewerId), done, now: DEMO_NOW, viewAs: false }) as unknown as KpiCtx;
const cmp5 = (tenant: string, done: Done) => STAGE7.find((k) => k.id === 'CMP-5')!.compute(ctxOf(tenant, `${tenant}.hot`, done)).display;
const dg3Rows = (tenant: string, done: Done, viewerId = `${tenant}.hot`) => ACTION_SOURCES.find((s) => s.id === 'dg3.approve')!.rows(ctxOf(tenant, viewerId, done));
const myRequests = (tenant: string, viewerId: string, done: Done) => REQUEST_SOURCES.find((s) => s.id === 'request.open')!.rows(ctxOf(tenant, viewerId, done));
const commit = (done: Done, r: Dg3Result | { error: string }) => (isWriteError(r) ? done : applyWrites(done, r.writes));
const err = (r: object) => (isWriteError(r) ? r.error : 'accepted');
/** A figure from Najd's pack: its margin, price or guarantee amount. */
const NAJD_FIGURES = /10\.2%|148\.6|2,972,400/;

function checks(): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });

  // 1. The evidence agrees with the seed: one pack per tenant, its people, currency, guarantee rule, portal and Stage 7 facts.
  const problems: string[] = [];
  for (const ev of DG3_EVIDENCE) {
    const l = lifecycle(ev.tenant, ev.tenderId);
    if (!l || l.facts?.stage !== 7) { problems.push(`${ev.tenderId} is not at DG3 in the seed`); continue; }
    const ids = [...ev.risks.flatMap((r) => (r.ownerId ? [r.ownerId] : [])), ...ev.signatories.map((s) => s.personId)];
    for (const id of ids) if (personById(id)?.tenant !== ev.tenant) problems.push(`${ev.tenderId}: ${id} is not in ${ev.tenant}`);
    if (ev.finalPrice.ccy !== l.value.ccy || ev.bond.amount.ccy !== l.value.ccy) problems.push(`${ev.tenderId}: currency is not ${l.value.ccy}`);
    if (Math.abs(ev.finalPrice.amount / l.value.amount - 1) > 0.02) problems.push(`${ev.tenderId}: price not within 2% of the estimate`);
    const dl = l.submissionDeadline?.date;
    if (!dl || addDays(dl, ev.bond.validityDays) !== ev.bond.requiredTo) problems.push(`${ev.tenderId}: required to ${ev.bond.requiredTo}, the rule gives ${dl ? addDays(dl, ev.bond.validityDays) : 'no deadline'}`);
    if (ev.risks.filter((r) => !r.ownerId).length !== l.facts.risksWithoutOwner || l.facts.mandatoryGaps !== 0) problems.push(`${ev.tenderId}: risks or gaps disagree with the S7 facts`);
    if (!gccData(ev.tenant).sources.some((s) => s.id === ev.portal)) problems.push(`${ev.tenderId}: portal ${ev.portal} is not a source`);
    for (const c of ev.dg2Conditions) if (c.kind === 'min-margin' && !c.text.includes(`${c.minPct}%`)) problems.push(`${ev.tenderId}: "${c.text}" does not state ${c.minPct}%`);
  }
  const perTenant = GCC.map((t) => dg3Tenders(t).length);
  add('Evidence: one pack per tenant; people, currency, guarantee rule, portal and S7 facts agree', !problems.length && perTenant.every((n) => n === 1),
    problems.slice(0, 3).join(' · ') || `${DG3_EVIDENCE.length} packs · per tenant ${perTenant.join('/')}`);

  // 2. Najd's pack is clean: 7 lines pass, the price is for information.
  const n = dg3State('najd', NAJD, {})!;
  add('Najd T-2025-305: ready, 7 lines pass and 1 is for information', !!n && n.evaluation.ready && n.evaluation.passed === 7 && n.evaluation.info === 1 && n.status.key === 'ready',
    n ? `${n.evaluation.summary} · ${n.evaluation.passed} pass, ${n.evaluation.info} info · ${n.slaText}` : 'No DG3 state');

  // 3. Qurain's pack fails the guarantee line only, and Approve is refused.
  const q = dg3State('qurain', QURAIN, {})!;
  const qhot = who('qurain.hot');
  const qApprove = dg3Write({ tenderId: QURAIN, decision: 'approved' }, qhot, q);
  const qg = q.evaluation.failing[0];
  add('Qurain: only the guarantee fails (3 days short); Approve is refused', q.evaluation.failing.length === 1 && qg?.key === 'guarantee' && qg.text.includes('3 days short') && err(qApprove) === APPROVE_NEEDS_PASS,
    `${q.evaluation.summary} · ${qg?.text.split(' · ')[0] ?? ''} · ${err(qApprove)}`);

  // 4. The other three are clean.
  const others = (['corniche', 'dafna', 'batinah'] as const).map((t) => { const s = dg3State(t, dg3Tenders(t)[0], {}); return { t, ready: !!s?.evaluation.ready, text: s?.evaluation.summary ?? 'none' }; });
  add('Corniche, Dafna and Batinah: ready', others.every((o) => o.ready), others.map((o) => `${o.t}: ${o.text}`).join(' · '));

  // 5. The pure rule on a hand-built case: margin below the DG2 minimum.
  const base = DG3_EVIDENCE.find((e) => e.tenderId === NAJD)!;
  const low = { ...base, marginPct: 8.1 };
  const hand = summarise(evaluateDg3(low, { requirements: { evidenced: 10, total: 10 }, mandatoryGaps: 0 }, dg3TenderOf('najd', lifecycle('najd', NAJD)!, low)));
  add('evaluateDg3: margin 8.1% against a 9% minimum fails and blocks', !hand.ready && hand.failing.map((l) => l.key).join() === 'condition-1' && hand.summary === '1 check fails: minimum margin', hand.summary);

  // 6. Refusals: no dg3.decide; Reject with no reason; Other with no note.
  const hotN = who('najd.hot');
  const byComp = dg3Write({ tenderId: NAJD, decision: 'approved' }, who('najd.comp'), n);
  const noReason = dg3Write({ tenderId: NAJD, decision: 'rejected', reasonCodes: [] }, hotN, n);
  const noNote = dg3Write({ tenderId: NAJD, decision: 'rejected', reasonCodes: ['other'] }, hotN, n);
  add('dg3Write refuses without dg3.decide, a Reject without a reason, and Other without a note',
    err(byComp) === 'Only the Head of Tendering approves DG3' && err(noReason) === 'Pick at least one reason to reject' && err(noNote) === 'Write a note: the reason is Other',
    [err(byComp), err(noReason), err(noNote)].join(' · '));

  // 7. Approve: Stage 8 Assembling; CMP-5 1 → 0; the action row leaves; the record says who, when and what was seen.
  const dA = commit({}, dg3Write({ tenderId: NAJD, decision: 'approved' }, hotN, n));
  const lA = lifecycle('najd', NAJD, dA)!;
  const curA = currentOf(lA);
  const gA = lA.gates.find((g) => g.gate === 'DG3');
  const recA = dg3RecordFor('najd', NAJD, dA)?.decision;
  const rowGone = !dg3Rows('najd', dA).some((r) => r.tenderId === NAJD);
  add('Approve: Stage 8 · Assembling, gate on time, CMP-5 1 → 0, the row leaves, the record names Faisal',
    curA.stage === 8 && curA.step === 'assembling' && curA.ownerId === lA.bidManagerId && gA?.decision === 'approved' && gA.onTime && !lA.facts
      && cmp5('najd', {}) === '1' && cmp5('najd', dA) === '0' && rowGone && recA?.byName === hotN.name && recA.evidenceText === '7 checks passed, 1 for information',
    `${curA.stage} · ${curA.step} · CMP-5 ${cmp5('najd', {})} → ${cmp5('najd', dA)} · row ${rowGone ? 'gone' : 'still there'} · ${recA ? `${recA.label} by ${recA.byName}: ${recA.evidenceText}` : 'no record'}`);

  // 8. Reject: closed as rejected with the generator's wording.
  const dR = commit({}, dg3Write({ tenderId: QURAIN, decision: 'rejected', reasonCodes: ['guarantee-not-valid'] }, qhot, q));
  const lR = lifecycle('qurain', QURAIN, dR)!;
  add('Reject: closed as rejected, "Rejected at DG3: guarantee not valid"', lR.closedAs === 'rejected' && lR.closedNote === 'Rejected at DG3: guarantee not valid' && lR.gates.some((g) => g.gate === 'DG3' && g.decision === 'rejected'),
    `${lR.closedAs ?? 'open'} · ${lR.closedNote ?? ''}`);

  // 9. Re-open (Head of Tendering, with a reason): back at DG3, the approval kept as a re-opened record, round 2 on a fresh clock.
  const sA = dg3State('najd', NAJD, dA)!;
  const noWhy = dg3ReopenWrite(sA, ' ', hotN);
  const byBm = dg3ReopenWrite(sA, 'Addendum after approval', who('najd.bid'));
  const dO = commit(dA, dg3ReopenWrite(sA, 'The employer issued an addendum after approval', hotN));
  const lO = lifecycle('najd', NAJD, dO)!;
  const sO = dg3State('najd', NAJD, dO)!;
  const gO = lO.gates.filter((g) => g.gate === 'DG3');
  add('Re-open: needs the Head of Tendering and a reason; back at DG3, approval kept as re-opened, round 2, 48 h left',
    isWriteError(noWhy) && isWriteError(byBm) && currentOf(lO).step === 'dg3-issued' && gO.length === 1 && !!gO[0].reopened && !sO.decision && sO.round === 2 && sO.slaText === '48 h left' && openGate(lO)?.gate === 'DG3' && cmp5('najd', dO) === '1',
    `${err(noWhy)} · ${err(byBm)} · ${currentOf(lO).stage} · ${currentOf(lO).step} · round ${sO.round} · ${sO.slaText} · ${gO.length} DG3 record${gO[0]?.reopened ? ' (re-opened)' : ''}`);

  // 10. Send back: the request lands in the Compliance Lead's My requests; the row says so; the clock keeps running.
  const comp = who('qurain.comp');
  const dB = commit({}, dg3SendBackWrite(q, 'The guarantee ends on 7 Jun; it must hold to 10 Jun. Ask the bank to extend it', qhot));
  const sB = dg3State('qurain', QURAIN, dB)!;
  const reqs = requestsFor('qurain', comp.id, dB, comp).filter((r) => r.tenderId === QURAIN && r.id.endsWith(`:${DG3_BACK_TOPIC}`));
  const rowB = dg3Rows('qurain', dB).find((r) => r.tenderId === QURAIN)?.what;
  const first = comp.name.split(' ')[0];
  const act = myRequests('qurain', comp.id, dB).find((r) => r.tenderId === QURAIN)?.primary;
  const opens = act?.kind === 'route' ? `${act.label} → ${act.to}` : 'no action';
  add(`Send back: in ${first}'s My requests, opening DG3; the row reads "Sent back to Compliance · ${first}"; the clock keeps running`,
    reqs.length === 1 && opens === `Open DG3 → /dg3?tender=${QURAIN}` && sB.status.key === 'sent-back' && rowB === `Sent back to Compliance · ${first}` && sB.openedAt === q.openedAt && sB.approveBlocked === SENT_BACK_WAIT,
    `${reqs.length} request (${opens}) · ${rowB ?? 'no row'} · clock from ${sB.openedAt}`);

  // 11. Re-issue with the bank's extension (Compliance only): Qurain is ready, round 2, and the 48 h clock restarts everywhere.
  const byHot = dg3ReissueWrite(sB, {}, qhot);
  const early = dg3ReissueWrite(q, {}, comp);
  const dI = commit(dB, dg3ReissueWrite(sB, { fixed: 'bond-validity' }, comp));
  const sI = dg3State('qurain', QURAIN, dI)!;
  const lI = lifecycle('qurain', QURAIN, dI)!;
  const gI = openGate(lI);
  const approveI = dg3Write({ tenderId: QURAIN, decision: 'approved' }, qhot, sI);
  const left = requestsFor('qurain', comp.id, dI, comp).filter((r) => r.tenderId === QURAIN && r.id.endsWith(`:${DG3_BACK_TOPIC}`)).length;
  add('Re-issue with the fix: Compliance only, after a send-back; Qurain ready, round 2, clock restarts, the request closes, Approve works',
    isWriteError(byHot) && isWriteError(early) && sI.evaluation.ready && sI.round === 2 && sI.openedAt === DEMO_NOW && sI.slaText === '48 h left'
      && lI.facts?.stage === 7 && lI.facts.dg3IssuedAt === DEMO_NOW && gI?.leftHours === 48 && left === 0 && !isWriteError(approveI),
    `${err(byHot)} · ${err(early)} · ${sI.evaluation.summary} · round ${sI.round} · ${sI.slaText} · dashboard ${gI ? `${gI.leftHours} h left` : 'no gate'} · ${left} request left · approve ${err(approveI)}`);

  // 12. Masking: price, margin and guarantee amount masked without see.margin; pass or fail still shows; the record too.
  const ctxN = tenderCtx('najd', lifecycle('najd', NAJD)!);
  const compN = who('najd.comp');
  const lines = linesFor(n.evaluation.lines, { canSeeMargin: can(compN, 'see.margin', ctxN).ok });
  const cond = lines.find((l) => l.key === 'condition-1');
  const leaks = lines.filter((l) => NAJD_FIGURES.test(l.text)).map((l) => l.key);
  const recMasked = dg3RecordFor('najd', NAJD, dA, { canSeeMargin: false })?.decision?.evidence ?? [];
  const recLeaks = recMasked.filter((l) => NAJD_FIGURES.test(l.text)).map((l) => l.key);
  add('Masking: Compliance reads price, margin and guarantee amount masked; the Bid Manager sees them; pass or fail stays',
    !can(compN, 'see.margin', ctxN).ok && can(who('najd.bid'), 'see.margin', ctxN).ok && ['price', 'condition-1', 'guarantee'].every((k) => !!lines.find((l) => l.key === k)?.maskLabel)
      && cond?.state === 'pass' && !!cond.text.startsWith('Minimum margin condition: met') && !leaks.length && recMasked.length > 0 && !recLeaks.length,
    `${cond?.text ?? 'no condition line'} · leaks: ${[...leaks, ...recLeaks].join(', ') || 'none'}`);

  // 13. The dashboard row and the gate never disagree.
  const rowN = dg3Rows('najd', {}).find((r) => r.tenderId === NAJD)?.what;
  const rowQ = dg3Rows('qurain', {}).find((r) => r.tenderId === QURAIN)?.what;
  const rowBm = dg3Rows('najd', {}, 'najd.bid').find((r) => r.tenderId === NAJD)?.what;
  add('Dashboard row agrees with the gate', rowN === 'Ready for your approval: evidence complete' && rowQ === `1 check fails: ${qg?.short}` && rowQ === q.evaluation.summary && rowBm === 'Ready for approval: evidence complete',
    `${rowN} · ${rowQ} · Bid Manager: ${rowBm}`);

  // 14. Reset: every key DG3 writes is in the tenant's own `done` (dg3…, request:…), so Reset (this company) clears it.
  const keys = [...new Set([...Object.keys(dA), ...Object.keys(dO), ...Object.keys(dR), ...Object.keys(dB), ...Object.keys(dI)])];
  const stray = keys.filter((k) => !k.startsWith('request:') && ![NAJD, QURAIN].some((t) => dg3Prefixes(t).some((p) => k.startsWith(p))));
  add('Reset clears it: every key is dg3…, dg3-back…, dg3-reissue…, dg3-reopen… or request:…', !stray.length && keys.length > 0, stray.join(', ') || keys.join(', '));

  return out;
}

export default function Dg3Check() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks() : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="DG3 approval (plan 018)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="DG3 approval (plan 018)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
