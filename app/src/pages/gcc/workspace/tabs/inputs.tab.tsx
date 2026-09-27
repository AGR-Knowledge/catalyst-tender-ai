import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { firstWithRole } from '@/data/people';
import { INPUT_SPECS, type InputKey, type PackInputKey } from '@/data/gcc/s3';
import { TENANTS } from '@/data/tenants';
import { useDemo } from '@/state/store';
import { DEMO_TODAY } from '@/domain/calendar';
import { addWorkingDays } from '@/domain/gcc/s1/common';
import { requestsFor } from '@/domain/gcc/requests';
import { KICKOFF_INPUTS, kickoffFor } from '@/domain/gcc/s2';
import { inputRequestWrite, inputsFor, isWriteError, nudgeWrite, packVersionsFor, stampText, type InputItem } from '@/domain/gcc/s3';
import { Card, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { StatusPill } from '@/components/tender/StatusPill';
import { InputForm } from '../../s3/InputForm';
import { NudgeButton } from '../../s3/sections/Inputs';
import '../../s3/s3.css';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Inputs (order 80, plan 009b; spec §8.9, catalogue §C.6): what the Bid /
 * No-Bid pack needs from inside the company. Each input with its owner, due
 * time and status, Request and Nudge; the owner's own form opens here from My
 * requests at `?tab=inputs&input={key}`.
 */

const PACK_KEYS: PackInputKey[] = ['commercial', 'planning', 'legal', 'pd', 'finance', 'hr'];
/** Working days a new request gives its owner. */
const REQUEST_LEAD_WD = 2;
const REQUEST_DUE_TIME = '17:00';

type Status = { label: string; tone: 'green' | 'orange' | 'red' | 'cyan'; icon: string };

function Inputs({ ctx }: { ctx: WorkspaceCtx }) {
  const { tenant, tenderId, done, viewer } = ctx;
  const { mark, logAudit, toast, nextAt } = useDemo();
  const [params, setParams] = useSearchParams();
  const want = params.get('input') as InputKey | null;
  const focus = want && want in INPUT_SPECS ? want : null;
  const formRef = useRef<HTMLDivElement>(null);
  const inputs = useMemo(() => inputsFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const issued = useMemo(() => packVersionsFor(tenant, tenderId, done).issued, [tenant, tenderId, done]);

  // Status as My requests shows it (plan 013's `requestsFor`), so the two never disagree; "Accepted" once the pack went out with it.
  const statusOf = (i: InputItem): Status => {
    const r = requestsFor(tenant, i.ownerId, done, viewer).find((x) => x.id === `input:${tenderId}:${i.key}`);
    const s = r?.status ?? (i.state === 'submitted' ? 'submitted' : i.state === 'late' ? 'late' : 'open');
    return s === 'accepted' ? { label: 'Accepted', tone: 'cyan', icon: '✓' }
      : s === 'submitted' ? { label: 'Submitted', tone: 'green', icon: '✓' }
      : s === 'late' ? { label: 'Late', tone: 'red', icon: '!' }
      : { label: 'Requested', tone: 'orange', icon: '•' };
  };

  useEffect(() => {
    if (focus) formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focus]);

  const open = (key: InputKey | null) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (key) n.set('input', key); else n.delete('input');
    return n;
  }, { replace: true });

  const requestCheck = ctx.check('input.request');
  const holdsRequest = ctx.check('input.request', { viewAs: false }).ok;
  const cc = TENANTS.find((t) => t.key === tenant)?.countryCode ?? 'SA';
  const due = `${addWorkingDays(DEMO_TODAY, REQUEST_LEAD_WD, cc)}T${REQUEST_DUE_TIME}`;
  // Stage 2: the kick-off inputs the DG1 Pursue lists, due as its checklist says (plan 008a); Stage 3: the pack's.
  const kickoff = useMemo(() => (ctx.row.stage === 2 ? kickoffFor(tenant, tenderId, done) : null), [ctx.row.stage, tenant, tenderId, done]);
  const wanted: InputKey[] = kickoff ? KICKOFF_INPUTS.map((k): string => k.inputKey).filter((k): k is InputKey => k in INPUT_SPECS) : PACK_KEYS;
  const dueOf = (k: InputKey) => kickoff?.items.find((i) => i.inputKey === k)?.due ?? due;
  const missing = wanted.filter((k) => !inputs.items.some((i) => i.key === k));

  const nudge = (i: InputItem) => {
    const w = nudgeWrite(i.nudgeTarget, viewer.id, `${i.label} from ${i.ownerName}, for ${i.feeds}`);
    mark(w.key, `${i.ownerName} nudged about ${i.label.toLowerCase()}.`, 'green', w.value);
    logAudit({ ...w.audit, target: tenderId });
  };
  const request = (key: InputKey) => {
    const owner = firstWithRole(tenant, INPUT_SPECS[key].ownerRole);
    if (!owner) return;
    const at = dueOf(key);
    const w = inputRequestWrite(tenderId, key, owner.id, at, viewer.id, nextAt());
    if (isWriteError(w)) { toast(w.error, 'red'); return; }
    mark(w.key, `${INPUT_SPECS[key].label} requested from ${owner.name}, due ${stampText(at)}. It is in their My requests.`, 'green', w.value);
    logAudit(w.audit);
  };

  const focused = focus ? inputs.items.find((i) => i.key === focus) : undefined;

  return (
    <div className="ws-tab in-tab">
      {focus && (
        <div ref={formRef} className="in-focus">
          <InputForm
            tenant={tenant} tenderId={tenderId} inputKey={focus}
            respond={ctx.check('input.respond', focused ? { ownerId: focused.ownerId } : {})}
            canSeeFields={ctx.can('see.margin')}
            onClose={() => open(null)}
          />
        </div>
      )}

      <Card>
        <CardHead
          title="Contributor inputs"
          meta={inputs.totals.requested
            ? `${inputs.totals.requested - inputs.totals.outstanding} of ${inputs.totals.requested} in${inputs.totals.late ? ` · ${inputs.totals.late} late` : ''}${issued ? ` · pack v${issued.version} issued ${stampText(issued.issuedAt!)}` : ''}`
            : 'None requested yet'}
        />
        {inputs.items.length === 0 ? (
          <EmptyState
            title="No inputs requested for this tender yet."
            body={kickoff
              ? 'The DG1 Pursue lists what Sourcing needs from inside the company: request each from its owner below.'
              : 'The Bid Manager asks Commercial, Planning, Legal, the Project Director, Finance and HR for what the pack needs.'}
            compact
          />
        ) : (
          <div className="in-list">
            <table className="pk-table">
              <caption className="sr-only">Contributor inputs for the Bid / No-Bid pack</caption>
              <thead>
                <tr><th scope="col">Input</th><th scope="col">For</th><th scope="col">Owner</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {inputs.items.map((i) => {
                  const st = statusOf(i);
                  const mine = i.ownerId === viewer.id;
                  return (
                    <tr key={i.key} className={focus === i.key ? 'is-focus' : ''}>
                      <th scope="row">
                        <button type="button" className="btn-link in-open" onClick={() => open(i.key)} aria-current={focus === i.key ? 'true' : undefined}>{i.label}</button>
                        <div className="pk-dim">Asked by {i.requestedByName}, {stampText(i.requestedAt)}</div>
                      </th>
                      <td className="mono">{i.feeds}</td>
                      <td>{i.ownerName}{mine && <span className="pk-tag">You</span>}</td>
                      <td className="num">{stampText(i.due)}<div className={i.state === 'late' ? 't-red' : 'pk-dim'}>{i.dueText}</div></td>
                      <td><StatusPill label={st.label} tone={st.tone} icon={st.icon} /></td>
                      <td className="r">
                        {mine && i.state !== 'submitted'
                          ? <button type="button" className="btn btn-sm btn-primary" onClick={() => open(i.key)}>Open my form</button>
                          : holdsRequest ? <NudgeButton i={i} check={requestCheck} onNudge={nudge} /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {holdsRequest && missing.length > 0 && (
        <Card>
          <CardHead title="Not requested yet" meta={kickoff ? 'Due as the DG1 kick-off set them' : `Due ${stampText(due)} if requested now`} />
          <div className="in-list">
            <table className="pk-table">
              <caption className="sr-only">Inputs nobody has been asked for</caption>
              <tbody>
                {missing.map((k) => {
                  const owner = firstWithRole(tenant, INPUT_SPECS[k].ownerRole);
                  return (
                    <tr key={k}>
                      <th scope="row">{INPUT_SPECS[k].label}</th>
                      <td className="mono">{INPUT_SPECS[k].feeds}</td>
                      <td>{owner?.name ?? 'Nobody in this role'}</td>
                      {kickoff && <td className="num">{stampText(dueOf(k))}</td>}
                      <td className="r">
                        <span className="pk-acts inline">
                          <button type="button" className="btn btn-sm" onClick={() => request(k)} disabled={!requestCheck.ok || !owner}>Request</button>
                          {!requestCheck.ok && <span className="pk-why">{requestCheck.reason}</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/** A Stage 3 tender, or one with a pack or inputs on record. Never an empty tab. */
function shows(ctx: WorkspaceCtx): boolean {
  if (ctx.row.stage === 3) return true;
  // A tender being sourced: the DG1 Pursue's kick-off inputs are requested here.
  if (ctx.row.stage === 2 && kickoffFor(ctx.tenant, ctx.tenderId, ctx.done)) return true;
  if (packVersionsFor(ctx.tenant, ctx.tenderId, ctx.done).current) return true;
  return inputsFor(ctx.tenant, ctx.tenderId, ctx.done).items.some((i) => (PACK_KEYS as string[]).includes(i.key));
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'inputs', label: 'Inputs', order: 80, plan: '009b', cap: 'pack.view', shows,
  badge: (ctx) => {
    const t = inputsFor(ctx.tenant, ctx.tenderId, ctx.done).totals;
    if (!t.outstanding) return null;
    return { text: t.late ? `${t.late} late` : `${t.outstanding} due`, tone: t.late ? 'red' : 'orange' };
  },
  Panel: Inputs,
}];
