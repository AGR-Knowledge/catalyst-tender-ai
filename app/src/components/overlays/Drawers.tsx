import { AGENTS, EVAL_WATCH, LIBRARY, SUPPLIERS, SUPPLIER_TOTAL } from '@/data/catalog';
import { STAGES } from '@/data/stages';
import { roleOf } from '@/data/roles';
import { COST_LINES, PROJECTS, REDLINES } from '@/data/workspace';
import { useDemo, type DrawerSpec } from '@/state/store';
import { ClosingContext, usePresence } from '@/state/presence';
import { useGo, useNudge } from '@/state/nav';
import { canSee } from '@/data/access';
import { computeLive, useLive, FOCUS_ID, ME_BID_MANAGER, type Live } from '@/domain/live';
import { cr, dayMonth, longDate, pct, pts } from '@/domain/format';
import { DrawerFrame, type OverlayAction, type OverlaySection } from './Frames';
import { goLiveKey, stepKey, useTenants } from '@/domain/tenants';
import { useSwitchTenant } from '@/domain/tenancy';
import { LEGACY_TENANT, statusTone } from '@/data/tenants';

export function DrawerHost() {
  const { state } = useDemo();
  const { shown, closing } = usePresence(state.drawer);
  if (!shown) return null;
  return <ClosingContext.Provider value={closing}><DrawerSwitch key={JSON.stringify(shown)} spec={shown} /></ClosingContext.Provider>;
}

function DrawerSwitch({ spec }: { spec: DrawerSpec }) {
  switch (spec.type) {
    case 'tender': return <TenderDrawer id={spec.id} />;
    case 'agent': return <AgentDrawer index={spec.index} />;
    case 'supplier': return <SupplierDrawer name={spec.name} />;
    case 'package': return <PackageDrawer pkgKey={spec.key} />;
    case 'artefact': return <ArtefactDrawer index={spec.index} />;
    case 'project': return <ProjectDrawer pkey={spec.key} />;
    case 'redline': return <RedlineDrawer rkey={spec.key} />;
    case 'cost': return <CostDrawer ckey={spec.key} />;
    case 'tenant': return <TenantDrawer tkey={spec.key} />;
  }
}

/* ───────── Tender record: the single record every role reads ───────── */

function tenderRows(t: NonNullable<ReturnType<Live['byId']>>, live: Live): OverlaySection['rows'] {
  const d = t.detail;
  const rows: OverlaySection['rows'] = [
    { k: 'Client', v: t.client },
    { k: 'Sector', v: t.sector },
  ];
  if (d) rows.push({ k: 'Scope', v: d.scope });
  const via = d?.portal && d.portal !== 'Not stated' ? ` via ${d.portal}` : '';
  rows.push({ k: 'Submission', v: t.held === 'nodate' ? 'No date given in the document' : `${longDate(t.due)}${t.id === FOCUS_ID ? ', 15:00 IST' : ''}${t.held ? ', already passed' : via}`, tone: t.held ? 'red' : undefined });
  if (d?.bidSecurity) rows.push({ k: 'Bid security', v: d.bidSecurity });
  if (t.id === FOCUS_ID) {
    rows.push(
      { k: 'Packages priced', v: `${live.packages.length} of ${live.packages.length}, ${live.withThree} with ≥3 quotes` },
      { k: 'Price scenario', v: `${live.scenario.name}${live.m2Frozen ? ', frozen at M2' : ', not yet frozen'}`, tone: live.m2Frozen ? 'green' : 'orange' },
      { k: 'Sections complete', v: `${live.sectionsComplete} of ${live.sectionsTotal}` },
      { k: 'Open gaps', v: `${live.gaps.critical} critical, ${live.gaps.major} major, ${live.gaps.minor} minor`, tone: live.gaps.critical ? 'red' : 'ink' },
      { k: 'DG3', v: live.dg3 === 'recorded' ? 'Recorded by the Review Board' : live.dg3 === 'ready' ? 'Pack ready for the Review Board to convene' : 'Blocked by an open mandatory gap', tone: live.dg3 === 'blocked' ? 'red' : live.dg3 === 'ready' ? 'orange' : 'green' },
    );
  }
  d?.rows.forEach(([k, v]) => rows.push({ k, v }));
  if (t.pendingValidations) rows.push({ k: 'Open validations', v: `${t.pendingValidations} with the Tender Coordinator`, tone: 'orange' });
  rows.push({ k: 'Bid manager', v: t.bidManager }, { k: 'Current owner', v: `${t.owner} at Stage ${t.stage}` }, { k: 'Status', v: t.closed ? t.closedReason : t.status, tone: t.closed ? 'muted' : 'ink' });
  return rows;
}

function TenderDrawer({ id }: { id: string }) {
  const { state, closeDrawer, openModal, toast } = useDemo();
  const nudge = useNudge();
  const { goRole, goPage } = useGo();
  const live = useLive();
  const t = live.byId(id);
  if (!t) return null;

  const winLabel = t.win != null ? `${t.win}%${t.band ? ` ±${t.band}` : ''}` : 'Not scored';
  const confTone = t.confidence === 'low' ? 'red' : t.confidence === 'medium' ? 'orange' : 'ink';
  const kpis = t.id === FOCUS_ID
    ? [
        { label: 'Win probability', value: winLabel },
        { label: 'Priced BOQ', value: cr(live.scenario.price) },
        { label: `${live.scenario.name} margin`, value: pct(live.scenario.marginPct, 1) },
        { label: 'Compliance cover', value: pct(live.coverage), tone: live.gapClosed ? ('green' as const) : ('orange' as const) },
      ]
    : t.win == null
      ? [
          { label: 'Fit-score', value: `${t.fit}%`, tone: confTone as 'ink' },
          { label: 'Indicative value', value: cr(t.value) },
          { label: 'Gate', value: t.gate ?? 'None', tone: t.gate ? ('red' as const) : ('ink' as const) },
          { label: 'Days to submit', value: t.held ? (t.held === 'passed' ? 'Passed' : 'No date') : String(t.days), tone: t.held ? ('red' as const) : ('ink' as const) },
        ]
      : [
          { label: 'Win probability', value: winLabel, tone: confTone as 'ink' },
          { label: t.stage >= 5 ? 'Priced BOQ' : 'Indicative value', value: cr(t.value) },
          { label: t.detail?.expectedMargin ? 'Expected margin' : 'Data confidence', value: t.detail?.expectedMargin ?? t.confidence[0].toUpperCase() + t.confidence.slice(1), tone: t.detail?.expectedMargin ? 'ink' : confTone as 'ink' },
          { label: t.detail?.resourceAsk ? 'Resource ask' : 'Days to submit', value: t.detail?.resourceAsk?.split(' for ')[0] ?? String(t.days) },
        ];

  const sections: OverlaySection[] = [{ head: 'Tender record', rows: tenderRows(t, live) }];
  if (t.detail?.events.length) sections.push({ head: 'Agent activity', rows: t.detail.events.map(([when, what]) => ({ k: what, v: when, tone: 'ink3', mono: true })) });

  const ownerRole = STAGES[t.stage - 1].role;
  const me = state.role;
  const actions: OverlayAction[] = [];
  if (!t.closed && t.gate === 'DG1' && me === 'bid' && t.bidManager === ME_BID_MANAGER) {
    actions.push(t.gateReady
      ? { label: 'Take DG1 decision', primary: true, onClick: () => openModal({ type: 'dg1', id: t.id }) }
      : { label: 'Nudge Tender Coordinator', primary: true, onClick: () => nudge('coord', `${t.pendingValidations} fields on ${t.id} to validate`) });
  } else if (!t.closed && t.gate === 'DG2' && t.detail && me === 'exec') {
    actions.push({ label: 'Open DG2 decision', primary: true, onClick: () => openModal({ type: 'dg2', id: t.id }) });
  } else if (t.id === FOCUS_ID && me === 'bid') {
    actions.push({ label: 'Open submission desk', primary: true, onClick: () => goPage('/submission') });
  } else if (t.source && canSee(me, 'intake')) {
    actions.push({ label: 'Open extraction', primary: true, onClick: () => goPage(`/intake/${t.source}`) });
  } else {
    actions.push({ label: 'Open evidence pack', primary: true, onClick: () => toast(`${t.id} evidence pack opened: ${t.detail ? 14 : 9} documents, provenance intact`) });
  }
  if (!t.closed && live.boqOf(t.id) && canSee(me, 'boq')) actions.push({ label: 'Open BOQ', onClick: () => goPage(`/boq?t=${t.id}`) });
  if (t.closed) { /* no owner action on a closed pursuit */ }
  else if (ownerRole === me) actions.push({ label: 'Go to my dashboard', onClick: () => goRole(me) });
  else actions.push({ label: `Notify ${t.owner}`, onClick: () => nudge(ownerRole, `${t.id} at Stage ${t.stage}`, t.owner) });

  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`${t.id} · Stage ${t.stage}${t.gate && !t.closed ? `, at ${t.gate}` : ''}${t.closed ? ', closed' : ''}`}
      title={t.name}
      sub={`${t.client}, ${cr(t.value)}, ${t.held === 'nodate' ? 'no submission date' : t.held ? `bid date ${longDate(t.due)} passed` : `submission ${dayMonth(t.due)} (${t.days} days)`}`}
      kpis={kpis}
      stage={t.stage}
      sections={sections}
      note={t.detail?.note}
      actions={actions}
      foot={ownerRole === me ? 'You own the current stage' : `Current stage owned by ${roleOf(ownerRole).short}`}
    />
  );
}

/* ───────── Agent ───────── */

function AgentDrawer({ index }: { index: number }) {
  const { closeDrawer, toast } = useDemo();
  const live = useLive();
  const a = AGENTS[index];
  if (!a) return null;
  const esc = live.agentEsc[a.name];
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`Agent · ${a.stage}`}
      title={`${a.name} Agent`}
      sub={`${a.state}, ${a.runs.toLocaleString('en-IN')} runs in 24h, eval ${a.eval != null ? a.eval.toFixed(1) + '%' : 'not yet run this cycle'}`}
      kpis={[
        { label: 'Eval score', value: a.eval != null ? `${a.eval.toFixed(1)}%` : 'Pending', tone: a.eval == null ? 'ink3' : a.eval < EVAL_WATCH ? 'orange' : 'green' },
        { label: 'Runs 24h', value: a.runs.toLocaleString('en-IN') },
        { label: 'Model tier', value: a.tier },
        { label: 'Escalations', value: esc, tone: esc === 'None' ? 'ink3' : 'orange' },
      ]}
      sections={[
        { head: 'Remit', rows: [{ k: a.remit }] },
        { head: 'Guardrails', rows: [
          { k: a.guard, v: 'Enforced', tone: 'green' },
          { k: 'Human owner of the decision', v: a.owner },
          { k: 'Cost ceiling', v: 'Per-agent and per-tender' },
        ] },
      ]}
      actions={[
        { label: 'Run evaluation harness', primary: true, onClick: () => toast(`${a.name}: harness queued against 240 golden-set cases`) },
        { label: 'View audit entries', onClick: () => toast(`Audit log filtered to ${a.name} (${(a.runs * 1.4).toFixed(0)} entries)`, 'ink3') },
      ]}
      foot="AI governance view"
    />
  );
}

/* ───────── Supplier ───────── */

function SupplierDrawer({ name }: { name: string }) {
  const { closeDrawer, toast } = useDemo();
  const s = SUPPLIERS.find((x) => x.name === name);
  if (!s) return null;
  const watch = s.standing === 'Watch';
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow="Screened supplier"
      title={s.name}
      sub={s.trade}
      kpis={[
        { label: 'Performance', value: `${s.score.toFixed(1)} / 10`, tone: s.score < 7 ? 'orange' : 'green' },
        { label: 'Projects', value: String(s.projects) },
        { label: 'RFQ response', value: `${s.response}%` },
        { label: 'Standing', value: s.standing, tone: watch ? 'orange' : s.standing === 'Preferred' ? 'green' : 'ink' },
      ]}
      sections={[{ head: 'Scoring inputs', rows: [
        { k: 'Delivered on programme', v: watch ? '2 of 5 late' : 'On or ahead', tone: watch ? 'orange' : 'green' },
        { k: 'Quality non-conformities', v: watch ? '3 open' : '0 open' },
        { k: 'Commercial disputes', v: 'None recorded' },
        { k: 'Sanctions & anti-bribery', v: `${s.screening}, rescreened 01 Mar`, tone: 'green' },
      ] }]}
      actions={[
        { label: 'Add to next RFQ', primary: true, onClick: () => toast(`${s.name} added to the ${FOCUS_ID} shortlist`) },
        { label: 'View delivery history', onClick: () => toast(`Opened ${s.projects} delivered packages for ${s.name}`, 'ink3') },
      ]}
      foot={`${SUPPLIER_TOTAL} suppliers in the database`}
    />
  );
}

/* ───────── RFQ package ───────── */

function PackageDrawer({ pkgKey }: { pkgKey: string }) {
  const { closeDrawer, toast, mark } = useDemo();
  const live = useLive();
  const p = live.packages.find((x) => x.key === pkgKey);
  if (!p) return null;
  const approved = p.column === 'approved';
  const status = approved ? 'Locked to BOQ' : p.key === 'steel' && !live.is('sup') ? 'Escalated to buyer' : p.column === 'normalising' ? 'Normalising' : p.column === 'evaluated' ? 'Awaiting buyer selection' : 'On track';
  const rows: OverlaySection['rows'] = [
    { k: 'Suppliers invited', v: String(p.invited) },
    { k: p.column === 'issued' ? 'Responded' : 'Quotes parsed', v: String(p.responded), tone: p.responded >= 3 ? 'green' : 'orange' },
    { k: 'Nudges sent by agent', v: String(p.nudges) },
  ];
  if (p.issue) rows.push({ k: 'Flagged', v: p.issue, tone: 'orange' });
  if (p.recommendation) rows.push({ k: 'Recommended', v: p.recommendation, tone: 'green' });
  rows.push({ k: 'Status', v: status, tone: approved ? 'green' : status === 'Escalated to buyer' ? 'red' : 'ink' });

  let actions: OverlayAction[];
  if (p.key === 'steel' && !live.is('sup')) {
    actions = [
      { label: 'Escalate to buyer', primary: true, onClick: () => mark('sup', `Structural steel escalated. Bidder responded, coverage now ${live.withThree + 1} of ${live.packages.length}`) },
      { label: 'Extend deadline 48h', onClick: () => toast('Structural steel RFQ extended by 48h and suppliers notified', 'ink3') },
    ];
  } else if (p.key === 'tx' && !approved) {
    actions = [{ label: 'Open comparison', primary: true, onClick: () => { closeDrawer(); document.getElementById('sec-quotes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }];
  } else if (p.column === 'evaluated' && !approved) {
    actions = [
      { label: 'Approve recommendation', primary: true, onClick: () => mark('pkg-' + p.key, `${p.name} recommendation approved and locked to BOQ, reason recorded`) },
      { label: 'Open ranking', onClick: () => toast(`${p.name}: ranking criteria and scores opened`, 'ink3') },
    ];
  } else if (approved) {
    actions = [{ label: 'View audit entry', primary: true, onClick: () => toast(`Opened the ${p.name} selection and reason in the audit trail`, 'ink3') }];
  } else {
    actions = [
      { label: 'Nudge non-responders', primary: true, onClick: () => toast(`${p.name}: reminder issued to all outstanding suppliers`) },
      { label: 'Open RFQ thread', onClick: () => toast(`${p.name} RFQ thread and attachments opened`, 'ink3') },
    ];
  }

  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`Package for ${FOCUS_ID} · Stage 2`}
      title={p.name}
      sub={p.meta}
      sections={[{ head: 'Package status', rows }]}
      note={p.note}
      actions={actions}
      foot="Buyer selection required"
    />
  );
}

/* ───────── Library artefact ───────── */

function ArtefactDrawer({ index }: { index: number }) {
  const { closeDrawer, toast } = useDemo();
  const a = LIBRARY[index];
  if (!a) return null;
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`Artefact · ${a.kind}`}
      title={a.title}
      sub={a.origin}
      kpis={[
        { label: 'Reuses', value: String(a.reuses) },
        { label: 'Kind', value: a.kind },
        { label: 'Last used', value: a.lastUsed.slice(0, 6) },
        { label: 'Status', value: 'Current', tone: 'green' },
      ]}
      sections={[{ head: 'Provenance', rows: [
        { k: 'Origin', v: a.origin },
        { k: 'Last used', v: a.lastUsed },
        { k: 'Citation on reuse', v: 'Automatic', tone: 'green' },
        { k: 'Owner', v: 'Bid Office knowledge team' },
      ] }]}
      actions={[
        { label: `Insert into ${FOCUS_ID}`, primary: true, onClick: () => toast(`${a.title} inserted into the ${FOCUS_ID} draft with its source cited`) },
        { label: 'View reuse history', onClick: () => toast(`${a.title}: ${a.reuses} reuses with outcomes opened`, 'ink3') },
      ]}
      foot="Artefacts library"
    />
  );
}

/* ───────── Delivery project ───────── */

function ProjectDrawer({ pkey }: { pkey: string }) {
  const { closeDrawer, toast } = useDemo();
  const live = useLive();
  const p = live.projects.find((x) => x.key === pkey) ?? PROJECTS.find((x) => x.key === pkey);
  if (!p) return null;
  const delta = p.current - p.bid;
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`${p.sector} project · Stage 9a`}
      title={p.name}
      sub={`${cr(p.value)} contract, ${p.progress}% complete`}
      kpis={[
        { label: 'Progress', value: `${p.progress}%` },
        { label: 'Bid margin', value: `${p.bid.toFixed(1)}%` },
        { label: 'Current', value: `${p.current.toFixed(1)}%` },
        { label: 'Δ pts', value: pts(delta), tone: delta >= 0 ? 'green' : delta <= -0.5 ? 'red' : 'ink3' },
      ]}
      sections={[{ head: 'Commitments tracked from the bid', rows: [
        { k: 'Milestones tracked', v: String(p.milestones) },
        { k: 'Milestones at risk', v: String(p.atRisk), tone: p.atRisk ? 'orange' : 'green' },
        { k: 'Bid obligations', v: `${p.obligations}, imported from the bid` },
        { k: 'Margin bridge', v: `${p.bid.toFixed(1)}% bid → ${p.current.toFixed(1)}% forecast` },
      ] }]}
      actions={[
        { label: 'Open milestone tracker', primary: true, onClick: () => toast(`${p.name}: ${p.milestones} milestones and ${p.obligations} obligations opened`) },
        { label: 'Margin bridge', onClick: () => toast(`${p.name} margin bridge opened`, 'ink3') },
      ]}
      foot="Delivery oversight"
    />
  );
}

/* ───────── Contract redline ───────── */

function RedlineDrawer({ rkey }: { rkey: string }) {
  const { closeDrawer, toast, mark } = useDemo();
  const live = useLive();
  const r = REDLINES.find((x) => x.key === rkey);
  if (!r) return null;
  const status = live.is('redline-' + r.key) ? 'With client' : r.status;
  const open = status === 'Open';
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`Contract position on ${FOCUS_ID} · Stage 7`}
      title={r.clause}
      sub={`Owner: ${r.owner}. Exposure ${r.exposure}`}
      sections={[{ head: 'Position', rows: [
        { k: 'Client position', v: r.client },
        { k: 'Recommended redline', v: r.redline },
        { k: 'Exposure', v: r.exposure },
        { k: 'Owner', v: r.owner },
        { k: 'Status', v: status, tone: open ? 'red' : status === 'Accepted' ? 'green' : 'orange' },
      ] }]}
      note="Suggested wording is drawn from 6 precedent positions. Legal sends the redline to the client."
      actions={open
        ? [{ label: 'Send redline to client', primary: true, onClick: () => mark('redline-' + r.key, `${r.clause} redline issued to the client, clarification logged`) }, { label: 'View precedent', onClick: () => toast(`${r.clause}: 6 precedent positions opened`, 'ink3') }]
        : [{ label: 'View clause and precedent', primary: true, onClick: () => toast(`Opened clause text, recommended wording and precedent for ${r.clause}`, 'ink3') }]}
      foot="Legal sign-off required"
    />
  );
}

/* ───────── Cost line provenance ───────── */

function CostDrawer({ ckey }: { ckey: string }) {
  const { closeDrawer, toast } = useDemo();
  const live = useLive();
  const l = COST_LINES.find((x) => x.key === ckey);
  if (!l) return null;
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={`Cost line for ${FOCUS_ID} · Stage 5`}
      title={l.label}
      sub={`${cr(l.value, 1)}, or ${pct((l.value / live.cost) * 100, 1)} of total cost`}
      sections={[{ head: 'Provenance', rows: [
        { k: 'Value', v: cr(l.value, 1) },
        { k: 'Classification', v: l.direct ? 'Direct cost' : 'Indirect cost' },
        { k: 'Source', v: l.source },
        { k: 'Linked to source', v: '100% of sub-lines', tone: 'green' },
      ] }]}
      actions={[{ label: 'Open source records', primary: true, onClick: () => toast(`Source quotes and historical norms opened for ${l.label}`, 'ink3') }]}
      foot={`Total cost ${cr(live.cost, 1)}`}
    />
  );
}

/* ───────── Tenant: profile, onboarding and sources ───────── */

function TenantDrawer({ tkey }: { tkey: string }) {
  const { state, closeDrawer, mark, toast } = useDemo();
  const { goPage } = useGo();
  const switchTo = useSwitchTenant();
  const t = useTenants().find((x) => x.key === tkey);
  if (!t) return null;
  const next = t.steps.find((s) => !s.done);
  const ready = !t.live && t.stepsDone === t.steps.length;
  // Only the Indian preview has a register until plan 004 seeds the GCC ones. Read it from its own bucket, whichever tenant is active.
  const tenders = t.key === LEGACY_TENANT
    ? String(computeLive(state.doneBy[LEGACY_TENANT] ?? {}, state.scenario, state.uploadsAll.filter((u) => u.tenant === LEGACY_TENANT)).active.length)
    : '—';
  const actions: OverlayAction[] = t.home
    ? [{ label: 'Open settings', primary: true, onClick: () => goPage('/settings#tenants') }]
    : t.switchable
      ? [{ label: 'Switch to this company · Demo', primary: true, onClick: () => switchTo(t.key) }]
    : t.scheduled
      ? [{ label: `Remind ${t.admin}`, onClick: () => toast(`Go-live checklist sent to ${t.adminEmail}`, 'ink3') }]
      : ready
        ? [{ label: `Book go-live for ${t.goLive === 'to be set' ? 'next month' : t.goLive}`, primary: true, onClick: () => mark(goLiveKey(t.key), `${t.name} go-live booked. First intake runs on the go-live date`, 'green') }]
        : [
            { label: `Mark "${next!.label}" done`, primary: true, onClick: () => mark(stepKey(t.key, next!.key), `${t.name}: ${next!.label.toLowerCase()} complete`, 'green') },
            { label: `Remind ${t.admin}`, onClick: () => toast(`Reminder sent to ${t.adminEmail}: ${next!.label.toLowerCase()}`, 'ink3') },
          ];
  return (
    <DrawerFrame
      onClose={closeDrawer}
      eyebrow={t.home ? 'Tenant, you are working here' : 'Tenant'}
      title={t.name}
      sub={t.legal}
      kpis={[
        { label: 'Status', value: t.live ? 'Live' : t.scheduled ? 'Booked' : 'Onboarding', tone: statusTone(t.live, t.stepsDone) },
        { label: 'Setup', value: `${t.stepsDone} / ${t.steps.length}` },
        { label: 'Seats', value: String(t.seats) },
        { label: 'Tenders', value: tenders },
      ]}
      sections={[{ head: 'Profile', rows: [
        { k: 'Country', v: t.country },
        { k: 'Head office', v: t.hqCity },
        { k: 'Time zone', v: `${t.tzLabel} (${t.timeZone})` },
        { k: 'Bid currency', v: t.currency },
        { k: 'Data residency', v: t.residency },
        { k: 'Single sign-on', v: t.sso, tone: t.sso === 'Not connected' ? 'orange' : undefined },
        { k: 'Tenant admin', v: `${t.admin}, ${t.adminEmail}` },
        { k: 'Created', v: longDate(t.created) },
        { k: t.live ? 'Live since' : 'Planned go-live', v: t.goLive },
      ] }]}
      actions={actions}
      foot={t.home ? 'You are working in this company' : t.switchable ? 'Switching company is a demo control. Each real user belongs to one tenant' : 'Tenders are read only once the tenant is live'}
    >
      <div className="drawer-sec">
        <div className="eyebrow">Onboarding</div>
        <ol className="tn-steps">
          {t.steps.map((s) => (
            <li key={s.key} className={s.done ? 'done' : s === next ? 'next' : ''}>
              <span className="mk" aria-hidden>{s.done ? '✓' : ''}</span>
              <span><b>{s.label}</b><small>{s.detail}</small></span>
            </li>
          ))}
        </ol>
      </div>
      <div className="drawer-sec">
        <div className="eyebrow">Tender sources</div>
        {t.sources.length ? t.sources.map((x) => <KVRow key={x.name} k={x.name} v={x.mode} />) : <div className="t-ink4" style={{ fontSize: 12.5 }}>None connected yet.</div>}
      </div>
    </DrawerFrame>
  );
}

const KVRow = ({ k, v }: { k: string; v: string }) => (
  <div className="kv"><span className="k">{k}</span><span className={`v ${/pending|expiring/i.test(v) ? 't-orange' : ''}`}>{v}</span></div>
);
