import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { gapWrite, longLeadAtRisk, packageCoverage, type PackageCoverage } from '@/domain/gcc/s2';
import { ClosingContext, usePresence } from '@/state/presence';
import { ModalFrame } from '@/components/overlays/Frames';
import { Card } from '@/components/ui/primitives';
import { EMPTY_REASON, ReasonCodePicker, missingReason, type ReasonCode, type ReasonValue } from '@/components/tender/ReasonCodePicker';
import { PanelHead, Tag, Why, refusal } from './ui';
import type { DeskCtx } from './vm/desk';
import { QUOTES_TO_COVER } from '@/data/gcc/s2';

/**
 * Coverage (spec §8.6, SRC-2): a package is covered with three compliant,
 * levelled quotes, or a gap the buyer accepts with a reason. Long-lead risk
 * (SRC-9) sits beside it: a package the fastest compliant quote can't deliver
 * in time.
 */

const GAP_CODES: ReasonCode[] = [
  { id: 'thin', label: 'Fewer than three qualified suppliers in the market' },
  { id: 'declined', label: 'Suppliers declined' },
  { id: 'screening', label: 'Suppliers held by screening' },
  { id: 'enough', label: 'The quotes received are enough to price it' },
  { id: 'benchmark', label: 'Price the balance from benchmark rates' },
];

const reasonText = (v: ReasonValue) => [...v.codes.map((c) => GAP_CODES.find((x) => x.id === c)?.label ?? c), v.note.trim()].filter(Boolean).join('; ');

export function CoverageCard({ desk, onPackage }: { desk: DeskCtx; onPackage?(pkgId: string): void }) {
  const { tenant, tenderId, done } = desk;
  const cov = useMemo(() => packageCoverage(tenant, tenderId, done), [tenant, tenderId, done]);
  const late = useMemo(() => longLeadAtRisk(tenant, tenderId, done), [tenant, tenderId, done]);
  const [gapFor, setGapFor] = useState<PackageCoverage | null>(null);
  const noGap = refusal(desk, 'package.approve');

  return (
    <Card>
      <PanelHead title={`Packages covered: ${cov.covered} of ${cov.total}`} sub={`Covered means ${QUOTES_TO_COVER} compliant, levelled quotes, or a gap accepted with a reason. A non-compliant quote never counts.`} />
      <ul className="s2-cov">
        {cov.packages.map((p) => (
          <li key={p.pkgId} className={`s2-cov-i st-${p.state}`}>
            <span className="mono s2-pid">{p.pkgId}</span>
            {onPackage ? <button type="button" className="btn-link s2-cov-t" onClick={() => onPackage(p.pkgId)}>{p.title}</button> : <span className="s2-cov-t">{p.title}</span>}
            {p.state === 'covered' ? <Tag tone="green"><Check size={11} aria-hidden /> Covered</Tag>
              : p.state === 'gap-accepted' ? <Tag tone="cyan">Gap accepted</Tag> : <Tag tone="orange">{p.compliantLevelled} of {p.needed}</Tag>}
            <span className="s2-cov-w">{p.why}</span>
            {p.state === 'open' && (
              <button type="button" className="btn btn-sm" disabled={!!noGap} title={noGap ?? undefined} onClick={() => setGapFor(p)}>Accept a gap</button>
            )}
          </li>
        ))}
      </ul>
      {late.length > 0 && (
        <div className="s2-pad-x s2-late">
          <h4 className="s2-h4">Long lead at risk</h4>
          <ul className="s2-list">{late.map((l) => <li key={l.pkgId}><span className="mono">{l.pkgId}</span> {l.title}: {l.text} ({l.supplierName})</li>)}</ul>
        </div>
      )}
      {noGap && <div className="s2-pad-x"><Why reason={noGap} /></div>}
      <GapModal pkg={gapFor} onClose={() => setGapFor(null)} onConfirm={(reason) => {
        if (gapFor && desk.apply(gapWrite(tenderId, gapFor.pkgId, reason, desk.viewer.id, undefined, { tenant, done }), `Gap accepted on ${gapFor.pkgId}. Your reason is recorded`)) setGapFor(null);
      }} />
    </Card>
  );
}

function GapModal({ pkg, onClose, onConfirm }: { pkg: PackageCoverage | null; onClose(): void; onConfirm(reason: string): void }) {
  const { shown, closing } = usePresence(pkg ? pkg.pkgId : null);
  const [v, setV] = useState<ReasonValue>(EMPTY_REASON);
  if (!shown || !pkg) return null;
  const missing = missingReason('code-or-note', v);
  const close = () => { setV(EMPTY_REASON); onClose(); };
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <ModalFrame
        eyebrow={`Accept a coverage gap: ${pkg.pkgId}`} title={pkg.title} sub={`Now: ${pkg.why}. The package counts as covered once you accept the gap; the reason stays on the record.`}
        onClose={close} foot={missing ?? undefined}
        actions={[
          { label: 'Accept the gap', primary: true, disabled: !!missing, onClick: () => { onConfirm(reasonText(v)); setV(EMPTY_REASON); } },
          { label: 'Cancel', onClick: close },
        ]}
      >
        <div className="modal-body"><ReasonCodePicker codes={GAP_CODES} value={v} required="code-or-note" onChange={setV} autoFocus /></div>
      </ModalFrame>
    </ClosingContext.Provider>,
    document.body,
  );
}
