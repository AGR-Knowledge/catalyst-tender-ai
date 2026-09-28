import { useEffect, useMemo, useState } from 'react';
import { Ban, Check } from 'lucide-react';
import {
  approvedShortlist, packagesFor, rankedCandidates, recommendedShortlist, sentSupplierIds, shortlistWrite, supplierOf,
  type ShortlistItem, type ShortlistOverride,
} from '@/domain/gcc/s2';
import { Card } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import { FlagLine } from '@/components/tender/FlagLine';
import { PanelHead, Tag, Why, byLine, refusal } from './ui';
import type { DeskCtx } from './vm/desk';
import { plural } from '@/domain/format';

/**
 * Supplier shortlists per package (spec §8.3). The agent recommends four to
 * six suppliers with a reason each; the buyer approves or overrides with a
 * reason. The guardrail: a supplier whose screening is not current is greyed
 * out with the reason and can't be ticked.
 */

export const GUARDRAIL = 'Nothing is sent to a supplier whose screening is not current.';

type PkgState = 'approved' | 'to-approve' | 'none';

function pkgStates(desk: DeskCtx) {
  const { tenant, tenderId, done } = desk;
  return packagesFor(tenant, tenderId, done).map(({ pkg }) => {
    const approved = approvedShortlist(tenant, tenderId, pkg.id, done);
    const rec = recommendedShortlist(tenant, tenderId, pkg.id, done);
    // A package whose candidates are all greyed out can't be shortlisted: nothing could be sent.
    const state: PkgState = approved ? 'approved' : rec.items.some((i) => i.sendable) ? 'to-approve' : 'none';
    return { pkg, approved, rec, state };
  });
}

/** Default ticks: the recommended suppliers that can be sent an RFQ. */
const defaultPick = (items: ShortlistItem[]) => items.filter((i) => i.sendable).map((i) => i.supplierId);

export function ShortlistsPanel({ desk, onAllApproved }: { desk: DeskCtx; onAllApproved?: () => void }) {
  const states = useMemo(() => pkgStates(desk), [desk]);
  const firstOpen = states.find((s) => s.state === 'to-approve')?.pkg.id ?? states[0]?.pkg.id ?? null;
  const [sel, setSel] = useState<string | null>(firstOpen);
  const current = states.find((s) => s.pkg.id === sel) ?? states[0];
  const noApprove = refusal(desk, 'shortlist.approve');
  const open = states.filter((s) => s.state === 'to-approve');

  // Every write moves the selection on to the next package still to approve.
  const next = (after: string) => {
    const i = states.findIndex((s) => s.pkg.id === after);
    const n = [...states.slice(i + 1), ...states.slice(0, i)].find((s) => s.state === 'to-approve' && s.pkg.id !== after);
    if (n) setSel(n.pkg.id); else onAllApproved?.();
  };

  const approveAll = () => {
    const writes = open.map((s, i) => shortlistWrite(desk.tenant, desk.tenderId, s.pkg.id, defaultPick(s.rec.items), [], desk.viewer.id, desk.done, desk.nextAt(i)));
    if (desk.applyAll(writes, `${writes.length} shortlists approved as recommended. Recorded in the audit trail`)) onAllApproved?.();
  };

  if (!current) return null;
  return (
    <div className="s2-md">
      <Card className="s2-md-nav">
        <PanelHead title="Packages" sub={`${states.filter((s) => s.state === 'approved').length} of ${states.length} shortlists approved`} />
        {open.length > 1 && (
          <div className="s2-pad-x">
            <button type="button" className="btn btn-sm" disabled={!!noApprove} onClick={approveAll}>Approve all {open.length} as recommended</button>
            <Why reason={noApprove} />
          </div>
        )}
        <ul className="s2-nav" role="list">
          {states.map((s) => (
            <li key={s.pkg.id}>
              <button type="button" className={`s2-nav-i ${s.pkg.id === current.pkg.id ? 'on' : ''}`} aria-current={s.pkg.id === current.pkg.id} onClick={() => setSel(s.pkg.id)}>
                <span className="mono s2-pid">{s.pkg.id}</span>
                <span className="s2-nav-t">{s.pkg.title}</span>
                {s.state === 'approved' ? <Tag tone="green"><Check size={11} aria-hidden /> {s.approved!.supplierIds.length}</Tag>
                  : s.state === 'none' ? <Tag tone="red">{s.rec.items.length ? 'Held by screening' : 'No supplier'}</Tag> : <Tag tone="orange">To approve</Tag>}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <ShortlistEditor key={current.pkg.id} desk={desk} pkgId={current.pkg.id} onDone={() => next(current.pkg.id)} />
    </div>
  );
}

function ShortlistEditor({ desk, pkgId, onDone }: { desk: DeskCtx; pkgId: string; onDone(): void }) {
  const { tenant, tenderId, done } = desk;
  const pkg = packagesFor(tenant, tenderId, done).find((p) => p.pkg.id === pkgId)!.pkg;
  const rec = recommendedShortlist(tenant, tenderId, pkgId, done);
  const approved = rec.approved;
  const sent = sentSupplierIds(tenant, tenderId, pkgId, done);
  const noApprove = refusal(desk, 'shortlist.approve');
  const [editing, setEditing] = useState(!approved);
  const [picked, setPicked] = useState<string[]>(approved?.supplierIds ?? defaultPick(rec.items));
  const [why, setWhy] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState('');
  useEffect(() => { setEditing(!approved); }, [approved]);

  const shown = new Set(rec.items.map((i) => i.supplierId));
  const others = rankedCandidates(tenant, tenderId, pkg).filter((c) => !shown.has(c.supplierId) && c.screening.state !== 'blocked');
  const added = picked.filter((id) => !shown.has(id));
  const removed = rec.items.filter((i) => i.sendable && !picked.includes(i.supplierId));
  const needs = [...added, ...removed.map((r) => r.supplierId)].filter((id) => !why[id]?.trim());
  const greyed = rec.items.filter((i) => !i.sendable);

  const overrides: ShortlistOverride[] = [
    ...added.map((id) => ({ supplierId: id, action: 'add' as const, reason: why[id] ?? '' })),
    ...removed.map((r) => ({ supplierId: r.supplierId, action: 'remove' as const, reason: why[r.supplierId] ?? '' })),
  ];
  const blockReason = noApprove ?? (!picked.length ? 'Tick at least one supplier.' : needs.length ? `Give a reason for ${needs.length === 1 ? 'the change' : `the ${needs.length} changes`} to the agent's list.` : null);

  const approve = () => {
    const ok = desk.apply(
      shortlistWrite(tenant, tenderId, pkgId, picked, overrides, desk.viewer.id, done, desk.nextAt()),
      `${pkgId} shortlist approved: ${picked.length} suppliers${overrides.length ? `, ${overrides.length} ${overrides.length === 1 ? 'override' : 'overrides'} recorded` : ''}`,
    );
    if (ok) { setWhy({}); onDone(); }
  };

  const row = (i: ShortlistItem, recommended: boolean) => {
    const s = supplierOf(tenant, i.supplierId);
    const on = picked.includes(i.supplierId);
    const needWhy = (recommended && i.sendable && !on) || (!recommended && on);
    return (
      <li key={i.supplierId} className={`s2-sl ${i.sendable ? '' : 'greyed'} ${on ? 'on' : ''}`}>
        <div className="s2-sl-top">
          <input
            type="checkbox" id={`sl-${pkgId}-${i.supplierId}`} checked={on} disabled={!editing || !i.sendable}
            aria-describedby={i.blockedReason ? `sl-why-${i.supplierId}` : undefined}
            onChange={(e) => setPicked(e.target.checked ? [...picked, i.supplierId] : picked.filter((x) => x !== i.supplierId))}
          />
          <label htmlFor={`sl-${pkgId}-${i.supplierId}`} className="s2-sl-name">
            {recommended && <span className="s2-rank num" title="The agent's rank">{i.rank}</span>}
            <b>{i.name}</b> <span className="s2-muted">{s?.city}, {i.country}</span>
          </label>
          {sent.has(i.supplierId) && <Tag tone="ink">RFQ sent</Tag>}
          <Tag tone={i.screening.state === 'current' ? 'green' : i.screening.state === 'due' ? 'orange' : 'red'}>{i.screening.label}</Tag>
        </div>
        {i.blockedReason && (
          <p className="s2-sl-block" id={`sl-why-${i.supplierId}`}><Ban size={12} aria-hidden /> {i.blockedReason}</p>
        )}
        <p className="s2-sl-why">{recommended ? i.reason : `Not recommended by the agent. ${i.reason}`}</p>
        {s && (
          <ul className="s2-signals" aria-label={`Signals for ${i.name}`}>
            <li>{i.onAvl ? 'On the client’s approved list' : 'Not on the client’s list'}</li>
            {i.icv !== undefined && <li>ICV {i.icv}</li>}
            <li>Prequalification {s.prequal === 'approved' ? 'approved' : s.prequal === 'pending' ? 'pending' : 'none'}</li>
            <li>{s.performance.onTimePct}% on time · {plural(s.performance.ncrs12m, 'NCR')} in 12 months</li>
            <li>{s.performance.quotes12m} quotes, {s.performance.awards12m} awarded</li>
            <li>Load {s.load}</li>
            <li>Replies to {s.response.ratePct}% of RFQs, in {s.response.avgDays} days</li>
            {i.national && <li>National product</li>}
          </ul>
        )}
        {editing && needWhy && (
          <label className="s2-reason">
            <span className="s2-label">{recommended ? `Why leave out ${i.name}? (required)` : `Why add ${i.name}? (required)`}</span>
            <input type="text" value={why[i.supplierId] ?? ''} onChange={(e) => setWhy({ ...why, [i.supplierId]: e.target.value })} placeholder="In a sentence: the reason for the override." />
          </label>
        )}
      </li>
    );
  };

  return (
    <Card className="s2-md-main">
      <PanelHead
        title={<><span className="mono s2-pid">{pkg.id}</span> {pkg.title}</>}
        sub={approved && !editing ? `Approved by ${byLine(approved.byId, approved.at)}${approved.source === 'seed' ? ', before today' : ''}.` : rec.proposedBy}
      >
        {approved && !editing && !noApprove && sent.size === 0 && <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Change</button>}
      </PanelHead>

      {greyed.length > 0 && (
        <div className="s2-pad-x">
          <Callout variant={greyed.some((g) => g.screening.state === 'blocked') ? 'block' : 'route'} word={greyed.some((g) => g.screening.state === 'blocked') ? undefined : 'Screening'} compact
            title={`${greyed.length} ${greyed.length === 1 ? 'supplier is' : 'suppliers are'} greyed out by screening.`}>
            {GUARDRAIL}
          </Callout>
        </div>
      )}

      {rec.items.length === 0 ? (
        <div className="s2-pad"><Callout variant="route" compact title="No supplier in your master offers this trade.">Accept a coverage gap for this package in Levelling, or add a supplier to the master.</Callout></div>
      ) : (
        <ul className="s2-sls">
          {rec.items.map((i) => row(i, true))}
          {picked.filter((id) => !shown.has(id)).map((id) => {
            const c = others.find((o) => o.supplierId === id);
            return c ? row(c, false) : null;
          })}
        </ul>
      )}

      {approved && !editing && approved.overrides.length > 0 && (
        <div className="s2-pad-x">
          {approved.overrides.map((o) => (
            <FlagLine key={`${o.action}${o.supplierId}`} as="p" tone="orange" className="s2-over">Override recorded: {o.action === 'add' ? 'added' : 'left out'} {supplierOf(tenant, o.supplierId)?.name ?? o.supplierId}. {o.reason}</FlagLine>
          ))}
        </div>
      )}

      {editing && (
        <div className="s2-actbar">
          {others.filter((o) => !picked.includes(o.supplierId)).length > 0 && (
            <span className="s2-add">
              <label className="sr-only" htmlFor={`add-${pkgId}`}>Add a supplier the agent did not recommend</label>
              <select id={`add-${pkgId}`} value={adding} onChange={(e) => setAdding(e.target.value)}>
                <option value="">Add a supplier…</option>
                {others.filter((o) => !picked.includes(o.supplierId)).map((o) => (
                  <option key={o.supplierId} value={o.supplierId} disabled={!o.sendable}>{o.name}{o.sendable ? '' : ` (${o.screening.label.toLowerCase()})`}</option>
                ))}
              </select>
              <button type="button" className="btn btn-sm" disabled={!adding} onClick={() => { setPicked([...picked, adding]); setAdding(''); }}>Add</button>
            </span>
          )}
          <span className="s2-grow" />
          <Why reason={blockReason} />
          <button type="button" className="btn btn-primary" disabled={!!blockReason} onClick={approve}>Approve shortlist ({picked.length})</button>
        </div>
      )}
    </Card>
  );
}
