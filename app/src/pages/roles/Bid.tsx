import type { ReactNode } from 'react';
import type { Tone } from '@/data/types';
import { useDemo } from '@/state/store';
import { useGo, useNudge } from '@/state/nav';
import { useLive, FOCUS_ID } from '@/domain/live';
import { cr, pct } from '@/domain/format';
import { Card, CardFoot, CardHead, Mark, StageTrack, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { Histogram } from '@/components/ui/Charts';
import { CLASHES, CLEAR_CHECKS, RESOURCE_PLAN } from '@/data/resources';

const andList = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

interface Todo { key: string; tone: Tone; mark: string; title: string; body: ReactNode; when: string; action?: { label: string; run: () => void } }

export function BidDashboard() {
  const { openDrawer, openModal, mark, is, toast } = useDemo();
  const { goPage } = useGo();
  const nudge = useNudge();
  const live = useLive();
  const focus = live.byId(FOCUS_ID)!;

  const todos: Todo[] = [];
  live.myDg1.forEach((t) => {
    if (t.gateReady) {
      todos.push({ key: t.id, tone: 'red', mark: '!', title: `DG1: Pursue or Discard for ${t.id}`, body: `${t.name}. Fit-score ${t.fit}%, coordinator validated. Comparable: ${t.detail?.comparables ?? 'none on record'}.`, when: '24h', action: { label: 'Decide', run: () => openModal({ type: 'dg1', id: t.id }) } });
    } else {
      todos.push({ key: t.id, tone: 'orange', mark: '…', title: `DG1 pending validation on ${t.id}`, body: `${t.name}. ${t.pendingValidations} field${t.pendingValidations === 1 ? '' : 's'} with the Tender Coordinator. The DG1 pack completes once they are validated.`, when: 'Queued', action: { label: 'Nudge coordinator', run: () => nudge('coord', `${t.pendingValidations} fields on ${t.id} to validate`) } });
    }
  });
  if (!is('sup')) todos.push({ key: 'sup', tone: 'red', mark: '!', title: 'Supplier escalation', body: `Two structural steel bidders past SLA on ${FOCUS_ID}. The agent nudged at T+48h and T+96h before escalating.`, when: 'Now', action: { label: 'Escalate', run: () => mark('sup', `Escalated to both bidders and the buyer notified. Package coverage now ${live.withThree + 1} of ${live.packages.length}`) } });
  if (!live.gapClosed) todos.push({ key: 'gap', tone: 'red', mark: '!', title: 'DG3 blocked on a mandatory gap', body: `ISO 45001 expires four days before the ${FOCUS_ID} submission. Owned by Compliance / Legal.`, when: 'Now', action: { label: 'Nudge compliance', run: () => nudge('comp', `ISO 45001 gap on ${FOCUS_ID}`) } });
  if (!live.m2Frozen) todos.push({ key: 'm2', tone: 'orange', mark: '!', title: 'Price not yet frozen at M2', body: `${FOCUS_ID} cannot be packaged until the Commercial Manager freezes a scenario.`, when: '1d', action: { label: 'Nudge commercial', run: () => nudge('comm', `M2 freeze on ${FOCUS_ID}`) } });
  if (!is('win')) todos.push({ key: 'win', tone: 'cyan', mark: '~', title: 'Win theme sign-off', body: 'Executive summary draft ready for T-2026-044. Three win themes in place, one flagged as thin.', when: '2d', action: { label: 'Sign off', run: () => mark('win', 'Win themes signed off on T-2026-044 and section locked for review') } });
  if (live.dg3 === 'recorded' && !live.submitted) todos.unshift({ key: 'submit', tone: 'green', mark: '→', title: `${FOCUS_ID} ready to submit`, body: 'DG3 recorded and the price is frozen. Portal submission needs your authority at M3.', when: '4d', action: { label: 'Open submission desk', run: () => goPage('/submission') } });
  todos.push({ key: 'sched', tone: 'green', mark: '✓', title: 'Schedule reconciled', body: 'T-2026-044 baseline matched to the cost model at M2. No action required.', when: 'Done' });

  return (
    <>
      <div className="split">
        <Card id="sec-register">
          <CardHead title="Active bid register" meta={`you are bid manager on ${live.mine.length} of ${live.active.length}`} />
          <DataTable
            rows={[...live.mine].sort((a, b) => a.days - b.days)}
            rowKey={(t) => t.id}
            onRowClick={(t) => openDrawer({ type: 'tender', id: t.id })}
            rowLabel={(t) => `Open ${t.id} ${t.name}`}
            columns={[
              { key: 'n', header: 'Tender', width: '1.9fr', primary: true, render: (t) => (<><span className="cell-main ellipsis">{t.name}</span><span className="cell-sub mono ellipsis">{t.id} · {t.status}</span></>) },
              { key: 'c', header: 'Client', width: '1fr', priority: 2, render: (t) => t.client },
              { key: 'v', header: 'Value', width: '.7fr', align: 'right', render: (t) => <span className="num t-ink" style={{ fontSize: 13 }}>{cr(t.value)}</span> },
              { key: 's', header: 'Stage', width: '.55fr', align: 'right', priority: 2, render: (t) => `Stage ${t.stage}` },
              { key: 'd', header: 'Due', width: '.5fr', align: 'right', render: (t) => <span className={`num ${t.days <= 4 ? 't-red' : t.days <= 11 ? 't-orange' : 't-ink3'}`}>{t.days} d</span> },
            ]}
          />
        </Card>

        <Card id="sec-today">
          <CardHead title="Needs you today" meta={`${todos.filter((t) => t.action).length} open for you as gate owner`} />
          {todos.map((x) => (
            <div className="item" key={x.key}>
              <Mark tone={x.tone}>{x.mark}</Mark>
              <span className="item-body">
                <span className="item-title">{x.title}</span>
                <span className="item-text">{x.body}</span>
                {x.action && <span className="item-actions"><button type="button" className="btn btn-invert" onClick={x.action.run} style={{ color: 'var(--ink)' }}>{x.action.label}</button></span>}
              </span>
              <span className={`item-when ${tc(x.tone)}`}>{x.when}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card id="sec-focus" style={{ marginTop: 'var(--gap)' }}>
        <CardHead title={`${FOCUS_ID} · 400 kV Substation stage progress`}>
          <button type="button" className="btn-link" onClick={() => openDrawer({ type: 'tender', id: FOCUS_ID })}>Open tender record →</button>
        </CardHead>
        <div style={{ padding: '18px 22px 0' }}>
          <StageTrack current={focus.stage} />
        </div>
        <div className="figs">
          <div className="fig"><div className="k">Win probability</div><div className="v">{focus.win}% ±{focus.band}</div></div>
          <div className="fig"><div className="k">Priced BOQ</div><div className="v">{cr(live.scenario.price)}</div></div>
          <div className="fig"><div className="k">{live.scenario.name} margin</div><div className="v">{pct(live.scenario.marginPct, 1)}</div></div>
          <div className="fig"><div className="k">Compliance cover</div><div className={`v ${live.gapClosed ? 't-green' : 't-orange'}`}>{pct(live.coverage)}</div></div>
        </div>
        <CardFoot>
          <span style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>
            {live.submitted
              ? 'Submitted to CPPP. Receipt and package saved to the archive.'
              : `Addendum 3 was issued by the client on 04 Mar. The Intake Agent linked it to the parent tender and re-flagged two priced packages and four compliance clauses for re-verification.${live.gapClosed ? '' : ' DG3 remains blocked on one critical compliance gap.'}`}
          </span>
        </CardFoot>
            </Card>

      <div id="sec-resources" className="split" style={{ '--cols': '1fr 1.15fr', marginTop: 'var(--gap)' } as React.CSSProperties}>
        <Card>
          <CardHead title="Resource histogram" meta={`${RESOURCE_PLAN.resource.toLowerCase()} by month, if awarded`} />
          <div className="card-body">
            <Histogram months={live.crewMonths} owned={RESOURCE_PLAN.capacity} capacity={live.crewCapacity} unit="crews" />
            <div className="hist-key">
              <span><i className="bg-ink" />Own crews</span>
              <span><i style={{ background: live.crewHired ? 'var(--cyan)' : 'var(--orange)' }} />{live.crewHired ? 'Covered by hire' : 'Shortfall'}</span>
            </div>
          </div>
          <CardFoot>
            <span className={live.crewHired ? 't-ink3' : 't-orange'}>
              {live.crewHired
                ? `Temporary hire covers the ${andList(live.crewOver.map((m) => m.m))} peak.`
                : `${andList(live.crewOver.map((m) => m.m))} need ${live.crewShort} more crews than the ${RESOURCE_PLAN.capacity} available.`}
            </span>
          </CardFoot>
        </Card>

        <Card>
          <CardHead title="Clashes found" meta="checked against every live bid" />
          {live.crewHired ? (
            <div className="item clash">
              <span className="bar-rail bg-green" />
              <span className="item-body">
                <span className="item-title">Erection crews, peak covered</span>
                <span className="item-text">{RESOURCE_PLAN.hire} crews hired for {andList(live.crewOver.map((m) => m.m))} at {cr(RESOURCE_PLAN.hireCost)}, drawn from the {cr(live.contingency)} contingency.</span>
              </span>
              <span className="item-when t-green" style={{ fontFamily: 'var(--font-sans)' }}>Resolved</span>
            </div>
          ) : live.crewOver.length > 0 && (
            <div className="item clash">
              <span className="bar-rail bg-orange" />
              <span className="item-body">
                <span className="item-title">Erection crews short by {live.crewShort}</span>
                <span className="item-text">{andList(live.crewOver.map((m) => `${m.m} ${m.y}`))} peak. Hiring {RESOURCE_PLAN.hire} crews for {live.crewOver.length} months costs {cr(RESOURCE_PLAN.hireCost)} and fits inside the {cr(live.contingency)} contingency. Resequencing instead moves charging by about three weeks.</span>
                <span className="item-actions">
                  <button type="button" className="btn btn-primary" onClick={() => mark('clash-crew', `Temporary hire of ${RESOURCE_PLAN.hire} erection crews approved for ${andList(live.crewOver.map((m) => m.m))}`)}>Approve hire</button>
                  <button type="button" className="btn" onClick={() => toast('Resequencing option sent to the Planning Manager for a revised baseline', 'ink3')}>Ask for a resequence</button>
                </span>
              </span>
              <span className="item-when t-orange" style={{ fontFamily: 'var(--font-sans)' }}>Decision needed</span>
            </div>
          )}
          {CLASHES.map((c) => {
            const other = c.with ? live.byId(c.with) : undefined;
            const sent = is('clash-' + c.key);
            return (
              <div className="item clash" key={c.key}>
                <span className={`bar-rail ${sent ? 'bg-cyan' : 'bg-red'}`} />
                <span className="item-body">
                  <span className="item-title">{c.title}</span>
                  <span className="item-text">{c.body}</span>
                  {!sent && other && (
                    <span className="item-actions">
                      <button type="button" className="btn" onClick={() => mark('clash-' + c.key, `Crane clash sent to ${other.bidManager}, bid manager on ${other.id}`, 'ink3')}>Raise with {other.bidManager}</button>
                      <button type="button" className="btn" onClick={() => openDrawer({ type: 'tender', id: other.id })}>Open {other.id}</button>
                    </span>
                  )}
                </span>
                <span className={`item-when ${sent ? 't-cyan' : 't-red'}`} style={{ fontFamily: 'var(--font-sans)' }}>{sent && other ? `With ${other.bidManager}` : 'Hire or resequence'}</span>
              </div>
            );
          })}
          {CLEAR_CHECKS.map((c) => (
            <div className="item clash" key={c.key}>
              <span className="bar-rail bg-green" />
              <span className="item-body"><span className="item-title">{c.title}</span><span className="item-text">{c.body}</span></span>
              <span className="item-when t-green" style={{ fontFamily: 'var(--font-sans)' }}>Clear</span>
            </div>
          ))}
          <CardFoot>Re-checked when the scope or an addendum changes. Last run on 04 Mar, after Addendum 3.</CardFoot>
        </Card>
      </div>
    </>
  );
}
