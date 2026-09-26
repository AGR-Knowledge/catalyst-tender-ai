import { useMemo } from 'react';
import { useTenantKey } from '@/domain/tenancy';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { can } from '@/data/access';
import { firstWithRole, personById, type Person } from '@/data/people';
import { DEMO_NOW } from '@/domain/gcc/clock';
import { dataPort } from '@/domain/gcc/port';
import { queriesFor, tenderCtx } from '@/domain/gcc/lifecycle.port';
import type { KpiCtx } from '@/domain/gcc/kpi/types';
import { ACTION_SOURCES } from '@/domain/gcc/actions/requests.actions';
import {
  applyWrites, isMasked, isWriteError, issueBlockers, MASKED_TEXT, packFor, packIssueWrite, packRerunWrite, packVersionsFor, type Done, type PackViewer,
} from '@/domain/gcc/s3';
import { decisionState, dg2RecordFor, dg2Write, positionsFor, positionWrite } from '@/domain/gcc/dg2';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { CardHead } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { membersFor } from '../dg2/members';

/**
 * Plan 009b: the Stage 3 and DG2 screens' wiring, on Najd's seed whichever
 * tenant is open (as plan 019's panel does), plus one row for the open
 * tenant's own packs. About ten rows; the rules themselves are checked in 90.
 */

interface Check { name: string; ok: boolean; got: string }

const T = 'T-2026-097';
const NONE: Done = {};
const ALL: PackViewer = { canSeeMargin: true, canSeePositions: true };

const who = (id: string) => personById(id)!;
const sightFor = (tenant: string, tenderId: string, p: Person): PackViewer => {
  const l = queriesFor({ tenant, viewer: p, done: NONE }).one(tenderId);
  const c = l ? tenderCtx(tenant, l) : {};
  return { canSeeMargin: can(p, 'see.margin', c).ok, canSeePositions: can(p, 'see.positions', c).ok };
};

/** Script C's writes up to quorum: re-run, issue, the CFO's position again on v2, the CEO's Support. */
function toQuorum(): Done {
  let d = NONE;
  const rr = packRerunWrite('najd', T, d, 'najd.bid');
  if (!isWriteError(rr)) d = applyWrites(d, [rr]);
  const is = packIssueWrite('najd', T, d, 'najd.bid');
  if (!isWriteError(is)) d = applyWrites(d, [is]);
  const v = positionsFor('najd', T, d).issuedVersion ?? 1;
  const cfo = positionWrite(T, 'cfo', { stance: 'conditions', comment: 'Keep the bid bond within the facility', conditions: ['Keep the bid bond within the facility'], marginConditions: ['minimum margin 9%'], packVersion: v }, 'najd.member.cfo');
  const ceo = positionWrite(T, 'ceo', { stance: 'support', packVersion: v }, 'najd.exec');
  for (const w of [cfo, ceo]) if (!isWriteError(w)) d = applyWrites(d, [w]);
  return d;
}

function checks(tenant: string): Check[] {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, got: string) => out.push({ name, ok, got });

  add('Screens built: /packs and /dg2', isScreenBuilt('/packs') && isScreenBuilt('/dg2'), `/packs ${isScreenBuilt('/packs')} · /dg2 ${isScreenBuilt('/dg2')}`);

  // 1. Stale, then a re-run to v2 that keeps v1.
  const seed = packFor('najd', T, NONE, ALL);
  const rr = packRerunWrite('najd', T, NONE, 'najd.bid');
  const after = isWriteError(rr) ? null : packFor('najd', T, applyWrites(NONE, [rr]), ALL);
  add(`${T}: stale, and Re-run makes v2`, !!seed?.summary.stale && !!after && after.version === 2 && !after.summary.stale && after.sections['9.10'].body.freshness.versions.length === 2,
    `seed v${seed?.version} ${seed?.summary.stale ? 'stale' : 'fresh'} → v${after?.version} ${after?.summary.stale ? 'stale' : 'fresh'}, ${after?.sections['9.10'].body.freshness.versions.length ?? 0} versions`);

  // 2. Issue waits for missing inputs; a reason lets it go.
  const blockers = issueBlockers('najd', 'T-2026-101', NONE);
  const bare = packIssueWrite('najd', 'T-2026-101', NONE, 'najd.bid');
  const why = packIssueWrite('najd', 'T-2026-101', NONE, 'najd.bid', 'Committee meets today');
  add('T-2026-101: issue blocked while inputs are missing', blockers.length === 2 && isWriteError(bare) && !isWriteError(why),
    `${blockers.map((b) => b.label).join(', ')} · without a reason: ${isWriteError(bare) ? bare.error : 'issued'}`);

  // 3. A member's position with a condition; a comment is needed for Oppose.
  const d3 = toQuorum();
  const cfo = positionsFor('najd', T, d3).seats.find((s) => s.seat === 'cfo')?.position;
  const oppose = positionWrite(T, 'technical', { stance: 'oppose', packVersion: 2 }, 'najd.member.technical');
  add('The CFO records Support with conditions, one of them a margin condition', cfo?.stance === 'conditions' && cfo.packVersion === 2 && cfo.marginConditions?.length === 1 && isWriteError(oppose),
    `${cfo?.stanceLabel} on v${cfo?.packVersion}, margin: ${cfo?.marginConditions?.join('; ')} · Oppose without comment: ${isWriteError(oppose) ? 'refused' : 'accepted'}`);

  // 4. The decision bar is disabled below quorum, with the reason; enabled at 3 of 5.
  const below = decisionState('najd', T, NONE);
  const at = decisionState('najd', T, d3);
  add('Decision bar: disabled at 2 of 5, enabled at 3 of 5', !below.enabled && /Quorum needs 3/.test(below.disabledReason ?? '') && at.enabled,
    `${below.disabledReason} → ${at.enabled ? 'enabled' : at.disabledReason}`);

  // 5. Approving against the majority needs a reason.
  let d5 = d3;
  const opp = positionWrite(T, 'operations', { stance: 'oppose', comment: 'Capacity', packVersion: 2 }, 'najd.member.operations');
  const opp2 = positionWrite(T, 'sector', { stance: 'oppose', comment: 'Client risk', packVersion: 2 }, 'najd.member.sector');
  const opp3 = positionWrite(T, 'technical', { stance: 'oppose', comment: 'Design risk', packVersion: 2 }, 'najd.member.technical');
  for (const w of [opp, opp2, opp3]) if (!isWriteError(w)) d5 = applyWrites(d5, [w]);
  const s5 = decisionState('najd', T, d5);
  const noReason = dg2Write({ tenderId: T, decision: 'bid' }, 'najd.hot', s5);
  const withReason = dg2Write({ tenderId: T, decision: 'bid', reason: 'Strategic client' }, 'najd.hot', s5);
  const rec5 = isWriteError(withReason) ? null : dg2RecordFor('najd', T, applyWrites(d5, withReason.writes), ALL);
  add('Bid against the majority needs a reason; the record says so', isWriteError(noReason) && rec5?.decision?.differsText === 'Approval differs from majority',
    `${isWriteError(noReason) ? 'refused without a reason' : 'accepted'} · ${rec5?.decision?.differsText ?? 'no flag'}`);

  // 6. Bid moves the tender to Stage 4 on the port (every dashboard and the tracker read it).
  const bid = dg2Write({ tenderId: T, decision: 'bid' }, 'najd.hot', at);
  const port = dataPort();
  const hot = who('najd.hot');
  const row = !isWriteError(bid) && port ? port.rows('najd', { kind: 'all' }, hot, 'all', applyWrites(d3, bid.writes)).find((r) => r.id === T) : null;
  add('Bid moves the tender to Stage 4', !!row && row.stage === 4, port ? `Stage ${row?.stage ?? '?'} · ${row?.step ?? ''}` : 'Data port not loaded yet');

  // 7. No-Bid drafts the decline letter.
  const nb = dg2Write({ tenderId: T, decision: 'no-bid', reasonCodes: ['win-probability-low'], reason: 'Exposure' }, 'najd.hot', at);
  const rec7 = isWriteError(nb) ? null : dg2RecordFor('najd', T, applyWrites(d3, nb.writes), ALL);
  add('No-Bid drafts the decline letter', !!rec7?.letter && !rec7.letter.sent, rec7?.letter ? `Draft of ${rec7.letter.text.split('\n').length} lines` : 'No letter');

  // 8. The Procurement Lead sees no positions and no margin; the Commercial Manager sees margin only.
  const joseph = who('najd.proc');
  const tarek = who('najd.comm');
  const js = sightFor('najd', T, joseph);
  const ts = sightFor('najd', T, tarek);
  const jp = packFor('najd', T, d3, js);
  const jr = dg2RecordFor('najd', T, d3, js);
  const jm = membersFor('najd', T, d3, joseph, js);
  add('Procurement Lead: no positions, no margin', !js.canSeeMargin && !js.canSeePositions && !!jp && isMasked(jp.sections['9.7'].body) && jp.summary.positions === MASKED_TEXT && !!jr && jr.positions.length === 0 && !!jm.masked && !jm.rows.length,
    `margin ${js.canSeeMargin ? 'shown' : 'masked'} · positions ${js.canSeePositions ? 'shown' : 'masked'} · record rows ${jr?.positions.length ?? '?'}`);
  const tp = packFor('najd', T, d3, ts);
  add('Commercial Manager: margin shown, positions masked', ts.canSeeMargin && !ts.canSeePositions && !!tp && !isMasked(tp.sections['9.7'].body) && tp.summary.positions === MASKED_TEXT,
    `margin ${tp?.summary.margin} · positions ${tp?.summary.positions}`);

  // 9. A pack input in My requests opens its form.
  const fin = who('najd.fin');
  const ctx = { tenant: 'najd', viewer: fin, viewAs: false, done: NONE, now: DEMO_NOW } as unknown as KpiCtx;
  const rows = ACTION_SOURCES.flatMap((s) => s.rows(ctx));
  const r = rows.find((x) => x.tenderId === 'T-2026-101');
  const to = r && r.primary.kind === 'route' ? r.primary.to : '';
  add('My requests: the Finance input opens its form', to === '/tenders/T-2026-101?tab=inputs&input=finance', to || 'No row');

  // 10. This tenant's own packs render for the Head of Tendering and mask for the Procurement Lead.
  if (isGccTenantKey(tenant)) {
    const h = firstWithRole(tenant, 'hot');
    const p = firstWithRole(tenant, 'proc');
    const ids = gccData(tenant).register.filter((t) => packVersionsFor(tenant, t.id, NONE).current).map((t) => t.id);
    const bad = ids.filter((id) => {
      const full = h ? packFor(tenant, id, NONE, sightFor(tenant, id, h)) : null;
      const masked = p ? packFor(tenant, id, NONE, sightFor(tenant, id, p)) : null;
      const m = p ? membersFor(tenant, id, NONE, p, sightFor(tenant, id, p)) : null;
      return !full || JSON.stringify(full).includes('undefined') || (masked && masked.summary.positions !== MASKED_TEXT) || (m && !m.masked);
    });
    add(`This tenant's packs (${tenant}): render, and mask for the Procurement Lead`, !bad.length, ids.length ? `${ids.length} ${ids.length === 1 ? 'pack' : 'packs'}: ${ids.join(', ')}${bad.length ? `; failing ${bad.join(', ')}` : ''}` : 'No packs in the seed');
  }

  return out;
}

export default function Stage3ScreensCheck() {
  const tenant = useTenantKey();
  const rows = useMemo(() => (isGccTenantKey(tenant) ? checks(tenant) : []), [tenant]);
  if (!isGccTenantKey(tenant)) return <CardHead title="Stage 3 screens (plan 009b)" meta="No GCC seed for this tenant" />;
  const failing = rows.filter((r) => !r.ok).length;
  return (
    <>
      <CardHead title="Stage 3 screens (plan 009b)" meta={failing ? `${failing} of ${rows.length} failing` : `All ${rows.length} pass`} />
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
