import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import {
  CRITERIA, MIX_LABEL, mixFor, mixOptions, mixWrite, packageScores, packagesFor,
  type Criterion, type MixOption, type MixOverride, type MixPick,
} from '@/domain/gcc/s2';
import { Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { OverrideModal, type OverrideResult } from '@/components/tender/OverrideModal';
import { RecommendationCard } from '@/components/tender/RecommendationCard';
import { FlagLine } from '@/components/tender/FlagLine';
import type { ReasonCode } from '@/components/tender/ReasonCodePicker';
import { PanelHead, QuoteAmount, Tag, Why, byLine, refusal, whoAt } from './ui';
import type { DeskCtx } from './vm/desk';

/**
 * Best-fit mix (spec §8.7): per-package scores on the tenant's weights, with
 * screening as a pass/fail gate; three mixes across the covered packages
 * (Lowest cost · Balanced, recommended · Lowest risk). The buyer approves a
 * mix, or overrides a package with a reason. The agent never issues a
 * commitment or a purchase order, and the screen says so.
 */

export const CRITERION_LABEL: Record<Criterion, string> = {
  price: 'Price (levelled)', technical: 'Technical compliance', delivery: 'Delivery record', qhse: 'QHSE record', capacity: 'Capacity', leadTime: 'Lead-time fit', icv: 'ICV',
};

/** A label mid-sentence: "delivery record", but "QHSE record" and "ICV" keep their capitals. */
const inline = (label: string) => (/^[A-Z]{2}/.test(label) ? label : label[0].toLowerCase() + label.slice(1));

const OVERRIDE_CODES: ReasonCode[] = [
  { id: 'delivery', label: 'Delivery record' }, { id: 'technical', label: 'Technical compliance' }, { id: 'qhse', label: 'QHSE record' },
  { id: 'lead', label: 'Lead time' }, { id: 'capacity', label: 'Capacity' }, { id: 'client', label: 'Client approval' }, { id: 'icv', label: 'Local content (ICV)' },
];

/** "delivery record", or "delivery record; the Entity knows the supplier". The audit reads "… selected on {reason}". */
const reasonOf = (r: OverrideResult) => [...r.codes.map((c) => inline(OVERRIDE_CODES.find((x) => x.id === c)?.label ?? c)), r.note].filter(Boolean).join('; ');

const OPTIONS: MixOption[] = ['lowest-cost', 'balanced', 'lowest-risk'];

export function BestFitPanel({ desk }: { desk: DeskCtx }) {
  const { tenant, tenderId, done } = desk;
  const opts = useMemo(() => mixOptions(tenant, tenderId, done), [tenant, tenderId, done]);
  const approved = useMemo(() => mixFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const [editing, setEditing] = useState(!approved);
  const [option, setOption] = useState<MixOption>(approved?.option ?? 'balanced');
  const [overrides, setOverrides] = useState<MixOverride[]>(approved?.overrides ?? []);
  const [ovFor, setOvFor] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const noApprove = refusal(desk, 'bestfit.approve');
  const titles = new Map(packagesFor(tenant, tenderId, done).map((p) => [p.pkg.id, p.pkg.title]));

  if (!opts.packages.length) {
    return (
      <Card>
        <PanelHead title="Best-fit mix" sub={opts.disclaimer} />
        <EmptyState title="No package is ready for the best-fit mix yet." body="A package joins once it is covered: three compliant, levelled quotes, or a gap accepted with a reason, and at least one levelled quote to choose." compact />
      </Card>
    );
  }

  const chosen = opts.options.find((o) => o.option === option)!;
  const balanced = opts.options.find((o) => o.option === 'balanced')!;
  const scores = new Map(opts.packages.map((p) => [p, packageScores(tenant, tenderId, p, done)]));
  const pickFor = (p: MixPick) => {
    const o = overrides.find((x) => x.pkgId === p.pkgId);
    const row = o ? scores.get(p.pkgId)?.rows.find((r) => r.supplierId === o.supplierId) : undefined;
    return row ? { ...p, name: row.name, rank: row.rank, weighted: row.weighted, levelled: row.levelled, icv: row.icv, supplierId: row.supplierId, overridden: o!.reason } : p;
  };
  const picks = (approved && !editing ? approved.picks : chosen.picks.map(pickFor));
  const ovPkg = ovFor ? chosen.picks.find((p) => p.pkgId === ovFor) : undefined;
  const ovRows = ovFor ? scores.get(ovFor)?.rows ?? [] : [];

  const approve = () => {
    const n = overrides.length;
    const ok = desk.apply(
      mixWrite(tenant, tenderId, option, overrides, desk.viewer.id, done, desk.nextAt()),
      `${MIX_LABEL[option]} mix approved${n ? `, ${n} ${n === 1 ? 'override' : 'overrides'} recorded` : ''}. ${opts.disclaimer}`, 'quotes',
    );
    if (ok) setEditing(false);
  };

  return (
    <div className="s2-stack">
      <RecommendationCard
        agent="Outreach & Evaluation"
        heading="Best-fit recommendation"
        verdict={`Balanced mix across ${balanced.picks.length} covered ${balanced.picks.length === 1 ? 'package' : 'packages'}`}
        confidence={null}
        reasons={[
          `The highest weighted score in each package, on the company's weights: ${CRITERIA.map((c) => `${inline(CRITERION_LABEL[c])} ${scores.get(opts.packages[0])!.weights[c]}%`).join(', ')}`,
          `ICV share ${balanced.icvShare}% of the levelled cost`,
          balanced.scheduleFit.text,
        ]}
        wouldChange={['Another package covered, or an adjustment confirmed differently', 'Different best-fit weights, set by the Head of Tendering']}
        sources={[]}
        {...(approved && (approved.overrides.length || approved.option !== 'balanced') ? { overriddenBy: {
          name: whoAt(approved.byId, approved.at).name, at: whoAt(approved.byId, approved.at).when,
          choice: `${approved.label}${approved.overrides.length ? ` with ${approved.overrides.length} ${approved.overrides.length === 1 ? 'override' : 'overrides'}` : ''}`,
          reason: approved.overrides.map((o) => `${o.pkgId}: ${o.reason}`).join('; ') || 'A different mix option.',
        } } : {})}
      />

      <Card>
        <PanelHead
          title="Mix options"
          sub={approved && !editing ? `Approved by ${byLine(approved.byId, approved.at)}: ${approved.label} mix. Recorded in the audit trail.` : 'Across the covered packages. Choose one; override a package if you have a reason.'}
        >
          {approved && !editing && !noApprove && <button type="button" className="btn btn-sm" onClick={() => { setEditing(true); setOption(approved.option); setOverrides(approved.overrides); }}>Change the mix</button>}
        </PanelHead>
        <div className="s2-opts" role="radiogroup" aria-label="Mix option">
          {OPTIONS.map((id) => {
            const o = opts.options.find((x) => x.option === id)!;
            const on = (approved && !editing ? approved.option : option) === id;
            return (
              <button key={id} type="button" role="radio" aria-checked={on} disabled={!editing} className={`s2-opt ${on ? 'on' : ''}`} onClick={() => setOption(id)}>
                <span className="s2-opt-h">{o.label}{o.recommended && <Tag tone="cyan">Recommended</Tag>}</span>
                <span className="s2-opt-v"><QuoteAmount desk={desk} value={o.total} levelled /></span>
                <span className="s2-muted">Total levelled cost · ICV share {o.icvShare}%</span>
                <span className={o.scheduleFit.late ? 't-orange' : 's2-muted'}>{o.scheduleFit.text}</span>
                <span className="s2-muted">{o.riskNotes.length ? `${o.riskNotes.length} risk ${o.riskNotes.length === 1 ? 'note' : 'notes'}: ${o.riskNotes.slice(0, 2).join('; ')}${o.riskNotes.length > 2 ? '…' : ''}` : 'No risk notes'}</span>
              </button>
            );
          })}
        </div>

        <div className="s2-tablewrap s2-pad-x">
          <table className="s2-table">
            <caption className="sr-only">The {MIX_LABEL[approved && !editing ? approved.option : option]} mix, package by package</caption>
            <thead><tr><th scope="col">Package</th><th scope="col">Supplier</th><th scope="col" className="r">Rank</th><th scope="col" className="r">Score</th><th scope="col" className="r">Levelled</th><th scope="col" className="r">ICV</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {picks.map((p) => {
                const s = scores.get(p.pkgId);
                const isOpen = open === p.pkgId;
                return [
                  <tr key={p.pkgId}>
                    <th scope="row">
                      <button type="button" className="btn-link s2-exp" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.pkgId)}>
                        {isOpen ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}<span className="mono">{p.pkgId}</span>
                      </button> {titles.get(p.pkgId)}
                    </th>
                    <td>
                      {p.name}{p.overridden && <FlagLine tone="orange" className="s2-over-tag">Override: {p.overridden}</FlagLine>}
                      {editing && p.overridden && (
                        <button type="button" className="btn-link s2-undo" onClick={() => setOverrides(overrides.filter((o) => o.pkgId !== p.pkgId))}>Use the {MIX_LABEL[option].toLowerCase()} pick</button>
                      )}
                    </td>
                    <td className="r num">{p.rank}</td>
                    <td className="r num">{p.weighted.toFixed(1)}</td>
                    <td className="r"><QuoteAmount desk={desk} value={p.levelled} levelled /></td>
                    <td className="r num">{p.icv}</td>
                    <td className="r">
                      {editing && (s?.rows.length ?? 0) > 1 && (
                        <button type="button" className="btn btn-sm" disabled={!!noApprove} onClick={() => setOvFor(p.pkgId)}>Choose another</button>
                      )}
                    </td>
                  </tr>,
                  isOpen && s ? (
                    <tr key={`${p.pkgId}-scores`} className="s2-sub">
                      <td colSpan={7}>
                        <table className="s2-table s2-scores">
                          <caption className="sr-only">Scores in {p.pkgId}</caption>
                          <thead>
                            <tr><th scope="col">Supplier</th>{CRITERIA.map((c) => <th key={c} scope="col" className="r">{CRITERION_LABEL[c]} <span className="s2-muted">{s.weights[c]}</span></th>)}<th scope="col" className="r">Weighted</th></tr>
                          </thead>
                          <tbody>
                            {s.rows.map((r) => (
                              <tr key={r.quoteId}>
                                <th scope="row">{r.rank}. {r.name}{r.notes.length > 0 && <span className="s2-muted"> · {r.notes.join('; ')}</span>}</th>
                                {CRITERIA.map((c) => <td key={c} className="r num">{Math.round(r.scores[c])}</td>)}
                                <td className="r num"><b>{r.weighted.toFixed(1)}</b></td>
                              </tr>
                            ))}
                            {s.gated.map((g) => <tr key={g.quoteId}><th scope="row" className="s2-muted">{g.name}</th><td colSpan={CRITERIA.length + 1} className="s2-sl-block">Stopped by the screening gate: {g.reason}</td></tr>)}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>

        <p className="s2-nopo s2-pad-x"><ShieldCheck size={14} aria-hidden /> {opts.disclaimer} Approving a mix records the choice for the bid; buying happens after award.</p>

        {editing && (
          <div className="s2-actbar">
            <span className="s2-grow" />
            <Why reason={noApprove} />
            <button type="button" className="btn btn-primary" disabled={!!noApprove} onClick={approve}>
              Approve the {MIX_LABEL[option].toLowerCase()} mix{overrides.length ? ` with ${overrides.length} ${overrides.length === 1 ? 'override' : 'overrides'}` : ''}
            </button>
          </div>
        )}
      </Card>

      <OverrideModal
        open={!!ovPkg}
        title={ovPkg ? `${ovPkg.pkgId} ${titles.get(ovPkg.pkgId) ?? ''}` : ''}
        from={{ verdict: ovPkg ? `${ovPkg.name}, rank ${ovPkg.rank} in the ${MIX_LABEL[option].toLowerCase()} mix` : '', agent: 'Outreach & Evaluation' }}
        options={ovRows.filter((r) => r.supplierId !== ovPkg?.supplierId).map((r) => ({ id: r.supplierId, label: `Rank ${r.rank}: ${r.name}`, hint: `Score ${r.weighted.toFixed(1)} · ${CRITERION_LABEL.delivery.toLowerCase()} ${r.scores.delivery} · ICV ${r.icv}` }))}
        preselect={ovRows.find((r) => r.supplierId !== ovPkg?.supplierId)?.supplierId ?? ''}
        reasonRule="code-or-note"
        codes={OVERRIDE_CODES}
        consequence="The recommendation stays on the record beside your choice."
        confirmLabel="Use this supplier"
        onClose={() => setOvFor(null)}
        onConfirm={(r) => {
          if (!ovPkg) return;
          setOverrides([...overrides.filter((o) => o.pkgId !== ovPkg.pkgId), { pkgId: ovPkg.pkgId, supplierId: r.choice, reason: reasonOf(r) }]);
          setOvFor(null);
        }}
      />
    </div>
  );
}
