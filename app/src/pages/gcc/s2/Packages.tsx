import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, GitMerge, Scissors, X } from 'lucide-react';
import { HERO_LINES } from '@/data/gcc/hero';
import { personById } from '@/data/people';
import {
  coverageBar, notCovered, packagingFor, packagingWrite, type PackageVM, type PackagingMerge, type PackagingSplit,
} from '@/domain/gcc/s2';
import { lineValue } from '@/domain/gcc/s2/context';
import { useDemo } from '@/state/store';
import { ClosingContext, usePresence } from '@/state/presence';
import { ModalFrame } from '@/components/overlays/Frames';
import { Card } from '@/components/ui/primitives';
import { CoverageBar } from '@/components/tender/CoverageBar';
import { Money } from '@/components/tender/Money';
import { Callout } from '@/components/tender/Callout';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { PageChips, PanelHead, Tag, Why, byLine, refusal } from './ui';
import type { DeskCtx } from './vm/desk';

/**
 * Scope packaging (spec §8.2): the agent's packages from the BOQ, the coverage
 * bar with the subcontracting cap, what nobody covers, and the Procurement
 * Lead's approval, with splits and merges. The Bid Manager is consulted: a
 * comment goes to the tender's audit trail.
 */

const MAKE_OR_BUY: Record<PackageVM['makeOrBuy'], string> = {
  'self-install': 'Buy, installed by us', buy: 'Buy, delivered', subcontract: 'Subcontract',
};

const COMMENT = 'Packaging comment';

export function PackagesPanel({ desk, onApproved }: { desk: DeskCtx; onApproved?: () => void }) {
  const { tenant, tenderId, done } = desk;
  const vm = useMemo(() => packagingFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const bar = useMemo(() => coverageBar(tenant, tenderId), [tenant, tenderId]);
  const gaps = useMemo(() => notCovered(tenant, tenderId), [tenant, tenderId]);
  const [merges, setMerges] = useState<PackagingMerge[]>([]);
  const [splits, setSplits] = useState<PackagingSplit[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [splitting, setSplitting] = useState<PackageVM | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const noApprove = refusal(desk, 'package.approve');
  const editing = !vm.approved && !noApprove;
  const touched = new Set([...merges.flatMap((m) => [m.into, ...m.from]), ...splits.map((s) => s.from)]);

  const approve = () => {
    const ok = desk.apply(
      packagingWrite(tenderId, desk.viewer.id, { merges, splits }, undefined, { tenant, done }),
      merges.length || splits.length ? 'Packaging approved with your changes. Recorded in the audit trail' : `Packaging approved: ${vm.packages.length} packages. Recorded in the audit trail`,
    );
    if (ok) { setMerges([]); setSplits([]); setPicked([]); onApproved?.(); }
  };
  const merge = () => {
    const ids = [...picked].sort();
    setMerges([...merges, { into: ids[0], from: ids.slice(1) }]);
    setPicked([]);
  };

  const segments = bar ? [
    { label: 'Subcontract works', value: bar.values.subcontract, tone: 'orange' as const },
    { label: 'Self-performed', value: bar.values.self, tone: 'ink' as const },
    { label: 'Supply (not counted to the cap)', value: bar.values.supply, tone: 'cyan' as const },
    { label: 'Not covered', value: bar.values.notCovered, tone: 'red' as const },
  ] : [];

  return (
    <div className="s2-stack">
      <Card>
        <PanelHead
          title="BOQ coverage"
          sub={bar ? <>{bar.subcontractCap.source} <PageChips text={bar.subcontractCap.source} doc={desk.doc} /></> : undefined}
        />
        {bar && (
          <div className="s2-pad">
            <CoverageBar
              segments={segments} label={`BOQ coverage of ${tenderId}`}
              marker={{ pct: bar.subcontractCap.cap, label: `${bar.subcontractCap.cap}% subcontracting cap. ${bar.subcontractCap.text}${bar.subcontractCap.ok ? ': within the cap' : ': over the cap'}`, tone: bar.subcontractCap.ok ? 'ink' : 'red' }}
            />
            {gaps && gaps.lines.length > 0 && (
              <div className="s2-nc">
                <span className={`s2-nc-h t-${gaps.tone}`}>Not covered: {gaps.pct.toFixed(1)}% of the BOQ value. No self-perform and no supplier matched</span>
                <ul>
                  {gaps.lines.map((l) => (
                    <li key={l.title}>{l.item && <span className="mono">{l.item}</span>} {l.title} <Money value={l.value} /></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <PanelHead
          title={`Procurement packages (${vm.packages.length})`}
          sub={vm.approved && vm.byId && vm.at ? `Approved by ${byLine(vm.byId, vm.at)}. Recorded in the audit trail.` : `${vm.proposedBy}. Estimates are from benchmark rates and are never sent to suppliers.`}
        >
          {vm.approved ? <Tag tone="green"><Check size={12} aria-hidden /> Approved</Tag> : <Tag tone="orange">Awaiting approval</Tag>}
        </PanelHead>

        {editing && (
          <div className="s2-toolbar">
            <button type="button" className="btn btn-sm" disabled={picked.length < 2} onClick={merge}>
              <GitMerge size={13} aria-hidden /> Merge selected{picked.length ? ` (${picked.length})` : ''}
            </button>
            <Why reason={picked.length < 2 ? 'Tick two or more packages to merge them.' : null} />
            {[...merges.map((m) => ({ key: `m:${m.into}`, text: `Merge ${[m.into, ...m.from].join(' + ')}`, drop: () => setMerges(merges.filter((x) => x !== m)) })),
              ...splits.map((s) => ({ key: `s:${s.from}`, text: `Split ${s.from} into ${s.parts.map((p) => p.id).join(' and ')}`, drop: () => setSplits(splits.filter((x) => x !== s)) }))]
              .map((c) => (
                <span key={c.key} className="s2-change">{c.text}
                  <button type="button" className="btn-link" onClick={c.drop} aria-label={`Undo: ${c.text}`}><X size={12} aria-hidden /></button>
                </span>
              ))}
          </div>
        )}

        <ul className="s2-pkgs">
          {vm.packages.map((p) => {
            const isOpen = open === p.pkg.id;
            const canPick = editing && !touched.has(p.pkg.id);
            return (
              <li key={p.pkg.id} className={`s2-pkg ${isOpen ? 'open' : ''}`}>
                <div className="s2-pkg-row">
                  {editing && (
                    <input
                      type="checkbox" aria-label={`Select ${p.pkg.id} to merge`} disabled={!canPick}
                      checked={picked.includes(p.pkg.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.pkg.id] : picked.filter((x) => x !== p.pkg.id))}
                    />
                  )}
                  <button type="button" className="s2-pkg-main" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.pkg.id)}>
                    <span className="mono s2-pid">{p.pkg.id}</span>
                    <span className="s2-pkg-t">{p.pkg.title}</span>
                  </button>
                  <span className="s2-pkg-k">{MAKE_OR_BUY[p.makeOrBuy]}</span>
                  <span className="s2-pkg-l num">{p.lines.count} BOQ lines · {p.lines.valueShare.toFixed(1)}%</span>
                  <span className="s2-pkg-v"><Money value={p.estimated} /></span>
                  {editing && p.pkg.lineItems && p.pkg.lineItems.length > 1 && !touched.has(p.pkg.id) && (
                    <button type="button" className="btn btn-sm" onClick={() => setSplitting(p)}><Scissors size={12} aria-hidden /> Split</button>
                  )}
                </div>
                <div className="s2-pkg-flags">
                  {p.longLead && <Tag tone="orange">{p.longLead.text}</Tag>}
                  {p.pkg.needByWeeks !== undefined && <Tag tone="ink">On site within {p.pkg.needByWeeks} weeks of award</Tag>}
                  {p.avl && <Tag tone="cyan" title={p.avl}>Client approved-vendor list</Tag>}
                  {p.mandatoryList && <Tag tone="cyan">Mandatory list: national product</Tag>}
                  {p.lcRelevant && !p.mandatoryList && <Tag tone="cyan">Local content relevant</Tag>}
                  <Tag tone="ink">{p.pkg.quoteLevel === 'line' ? 'Quote per line' : 'Quote per package'}</Tag>
                </div>
                {isOpen && (
                  <div className="s2-pkg-more">
                    <p>{p.pkg.scope}</p>
                    <p className="s2-muted">Specification: {p.pkg.specRef} <PageChips text={p.pkg.specRef} doc={desk.doc} /></p>
                    {p.avl && <p className="s2-muted">{p.avl} <PageChips text={p.avl} doc={desk.doc} /></p>}
                    <p className="s2-muted">Drawings: <span className="mono">{p.pkg.drawings.join(' · ')}</span></p>
                    {p.pkg.note && <p className="s2-note">Buyer note, not sent: {p.pkg.note}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!vm.approved && (
          <div className="s2-actbar">
            <button type="button" className="btn btn-primary" disabled={!!noApprove} onClick={approve}>
              {merges.length || splits.length ? `Approve with ${merges.length + splits.length} ${merges.length + splits.length === 1 ? 'change' : 'changes'}` : `Approve ${vm.packages.length} packages`}
            </button>
            <Why reason={noApprove} />
          </div>
        )}
      </Card>

      <Comments desk={desk} />

      <SplitModal pkg={splitting} onClose={() => setSplitting(null)} onSplit={(s) => { setSplits([...splits, s]); setSplitting(null); }} />
    </div>
  );
}

/** The Bid Manager's comments on the packaging, from the tender's audit trail. */
function Comments({ desk }: { desk: DeskCtx }) {
  const { logAudit, toast } = useDemo();
  const [text, setText] = useState('');
  const mine = desk.check('package.comment');
  const list = desk.audit.filter((e) => e.action === COMMENT && e.target === desk.tenderId);
  if (!mine.ok && !list.length) return null;
  const send = () => {
    logAudit({ actorId: desk.viewer.id, action: COMMENT, target: desk.tenderId, detail: text.trim() });
    toast('Comment added for the Procurement Lead. Recorded in the audit trail');
    setText('');
  };
  return (
    <Card>
      <PanelHead title="Comments on the packaging" sub="The Bid Manager is consulted on the packages; the Procurement Lead decides." />
      <div className="s2-pad">
        {list.map((e) => <AuditEntry key={e.id} actor={{ name: personById(e.actorId)?.name ?? e.actorId, role: personById(e.actorId)?.title ?? null }} at={e.at} action="Commented" detail={e.detail} />)}
        {mine.ok && (
          <div className="s2-comment">
            <label className="s2-label" htmlFor="s2-comment">Your comment</label>
            <textarea id="s2-comment" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: keep the GIS substation separate from the LV works." />
            <div className="s2-actbar">
              <button type="button" className="btn btn-sm" disabled={!text.trim()} onClick={send}>Add comment</button>
              <Why reason={text.trim() ? null : 'Write the comment first.'} />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Split a package by its BOQ items: the ticked items move to a new package. */
function SplitModal({ pkg, onClose, onSplit }: { pkg: PackageVM | null; onClose(): void; onSplit(s: PackagingSplit): void }) {
  const { shown, closing } = usePresence(pkg ? pkg.pkg.id : null);
  const [moved, setMoved] = useState<string[]>([]);
  const p = pkg?.pkg;
  if (!shown || !p?.lineItems) return null;
  const items = p.lineItems;
  const keep = items.filter((i) => !moved.includes(i));
  const lineOf = (i: string) => HERO_LINES.find((l) => l.item === i);
  const bad = !moved.length ? 'Tick the BOQ items to move to the new package.' : !keep.length ? 'Leave at least one item in the first package.' : null;
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <ModalFrame
        eyebrow={`Split ${p.id}`} title={p.title} sub="The ticked BOQ items become a second package. Values follow the BOQ lines."
        onClose={() => { setMoved([]); onClose(); }} foot={bad ?? undefined}
        actions={[
          { label: 'Split the package', primary: true, disabled: !!bad, onClick: () => {
            onSplit({ from: p.id, parts: [
              { id: `${p.id}a`, title: `${p.title} (part 1)`, lineItems: keep },
              { id: `${p.id}b`, title: `${p.title} (part 2)`, lineItems: moved },
            ] });
            setMoved([]);
          } },
          { label: 'Cancel', onClick: () => { setMoved([]); onClose(); } },
        ]}
      >
        <div className="modal-body">
          <ul className="s2-split">
            {items.map((i) => {
              const l = lineOf(i);
              return (
                <li key={i}>
                  <label>
                    <input type="checkbox" checked={moved.includes(i)} onChange={(e) => setMoved(e.target.checked ? [...moved, i] : moved.filter((x) => x !== i))} />
                    <span className="mono">{i}</span>
                    <span className="s2-split-d">{l?.description ?? i}</span>
                    {l && <Money value={{ amount: lineValue(l), ccy: p.value.ccy }} />}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      </ModalFrame>
    </ClosingContext.Provider>,
    document.body,
  );
}

/** Shown on the desk when a tender has no packages to buy (nothing in its master matches). */
export function NoPackages() {
  return <Callout variant="route" title="No packages proposed for this tender." compact>The agent found no BOQ lines to buy or subcontract.</Callout>;
}
