import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { firstWithRole, personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { isWriteError } from '@/domain/gcc/s3';
import {
  AGAINST_MAJORITY_TEXT, DECISION_LABEL, dg2Write, NO_BID_REASONS, type DecisionState, type Dg2Choice, type Dg2Input,
} from '@/domain/gcc/dg2';
import { ReasonCodePicker, EMPTY_REASON, type ReasonValue } from '@/components/tender/ReasonCodePicker';
import { ConfirmModal, Effects } from '../s3/Confirm';

/**
 * The decision bar (spec §10, dashboards.md §9): the Head of Tendering only.
 * "Approve Bid" and "Record No-Bid" stay disabled until quorum, saying why.
 * Confirm shows the effects and the record first. Going against the majority
 * needs a reason; a No-Bid needs reason codes and drafts the decline letter.
 */

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function DecisionBar({ tenant, tenderId, ds, check, holds }: {
  tenant: string;
  tenderId: string;
  ds: DecisionState;
  /** `can('dg2.decide')` for this tender. */
  check: CanResult;
  /** The viewer holds `dg2.decide` at all (View as shows the bar disabled). */
  holds: boolean;
}) {
  const { state, mark, logAudit, toast } = useDemo();
  const { person } = state;
  const [choice, setChoice] = useState<Dg2Choice | null>(null);
  const [reason, setReason] = useState('');
  const [codes, setCodes] = useState<ReasonValue>(EMPTY_REASON);
  const [own, setOwn] = useState('');
  const [ownMargin, setOwnMargin] = useState('');
  const [staleAck, setStaleAck] = useState(false);
  const hot = firstWithRole(tenant, 'hot');

  const input: Dg2Input | null = choice ? {
    tenderId, decision: choice,
    ...(reason.trim() ? { reason } : {}),
    ...(choice === 'no-bid' ? { reasonCodes: codes.codes, ...(codes.note.trim() ? { lessons: codes.note } : {}) } : { conditions: lines(own), marginConditions: lines(ownMargin) }),
    staleAcknowledged: staleAck,
  } : null;

  // A dry run with a placeholder reason says whether this approval goes against the majority; the real one, what the record will say.
  const probe = input ? dg2Write({ ...input, reason: 'probe', staleAcknowledged: true, ...(choice === 'no-bid' ? { reasonCodes: codes.codes.length ? codes.codes : ['other'] } : {}) }, person.id, ds) : null;
  const against = !!probe && !isWriteError(probe) && probe.decision.againstMajority;
  const preview = input ? dg2Write(input, person.id, ds) : null;
  const why = preview && isWriteError(preview) ? preview.error : null;

  if (ds.decision) return null;
  if (!holds) {
    return (
      <section className="dg2-bar muted" aria-label="DG2 approval">
        <p className="dg2-bar-t">{hot ? `${hot.name}, ${hot.title}, approves DG2 once the committee has quorum.` : 'The Head of Tendering approves DG2 once the committee has quorum.'}</p>
      </section>
    );
  }

  const open = (c: Dg2Choice) => { setChoice(c); setReason(''); setCodes(EMPTY_REASON); setOwn(''); setOwnMargin(''); setStaleAck(false); };
  const close = () => setChoice(null);
  const confirm = () => {
    if (!input) return;
    const r = dg2Write(input, person.id, ds);
    if (isWriteError(r)) { toast(r.error, 'red'); return; }
    for (const w of r.writes) mark(w.key, undefined, undefined, w.value);
    // The decision entry states the majority: masked like positions.
    r.audit.forEach((a, i) => logAudit(i === 0 ? { ...a, sensitive: 'positions' } : a));
    if (r.decision.decision === 'bid') {
      const told = [firstWithRole(tenant, 'plan'), firstWithRole(tenant, 'comm')].filter(Boolean).map((p) => `${p!.name} (${p!.title})`);
      logAudit({ actorId: person.id, action: 'Planning and Commercial notified', target: tenderId, detail: `${told.join(' and ')}: start the Stage 4 baselines` });
    }
    toast(r.effects[0].replace(/\.?$/, '.'), 'green'); // an effect is a list item; the toast is a sentence
    close();
  };

  const disabled: CanResult = !check.ok ? check : !ds.enabled ? { ok: false, reason: ds.disabledReason } : { ok: true };
  const m = ds.positions.majority;
  const pv = !preview || isWriteError(preview) ? null : preview;
  // Effects and the committee's conditions don't depend on the reason: read them from the dry run until the form is complete.
  const draft = pv ?? (probe && !isWriteError(probe) ? probe : null);

  return (
    <section className="dg2-bar" aria-label="DG2 approval">
      <div className="dg2-bar-h">
        <span className="dg2-bar-t">Your approval</span>
        <span className={`dg2-bar-s ${ds.enabled ? 't-green' : ''}`}>{ds.enabled ? `Quorum met. Majority: ${m.result === 'none' ? 'none' : DECISION_LABEL[m.result]} (${m.for} for, ${m.against} against)` : ds.disabledReason}</span>
      </div>
      {ds.staleAck && ds.enabled && <p className="dg2-stale">{ds.staleAck.reason}. {ds.staleAck.warning}.</p>}
      <div className="dg2-bar-acts">
        <button type="button" className="btn btn-primary" onClick={() => open('bid')} disabled={!disabled.ok} aria-describedby={disabled.ok ? undefined : `dg2-why-${tenderId}`}>
          <Check size={14} aria-hidden />Approve Bid
        </button>
        <button type="button" className="btn btn-danger" onClick={() => open('no-bid')} disabled={!disabled.ok} aria-describedby={disabled.ok ? undefined : `dg2-why-${tenderId}`}>
          <X size={14} aria-hidden />Record No-Bid
        </button>
      </div>
      {!disabled.ok && <p className="dg2-why" id={`dg2-why-${tenderId}`}>{disabled.reason}</p>}
      <p className="dg2-hint">No undo: a decision is changed only by re-opening it, with a reason. Both records are kept.</p>

      <ConfirmModal
        open={!!choice} wide danger={choice === 'no-bid'}
        eyebrow="DG2 · Bid / No-Bid" title={choice === 'bid' ? (draft?.decision.conditions.length ? 'Approve Bid with conditions' : 'Approve Bid') : 'Record No-Bid'}
        sub={`On pack v${ds.packVersion ?? 1}. ${m.for} for, ${m.against} against${m.abstain ? `, ${m.abstain} abstaining` : ''}.`}
        confirmLabel={choice === 'bid' ? 'Approve Bid' : 'Record No-Bid'} disabledReason={why}
        onConfirm={confirm} onClose={close}
      >
        {draft && <Effects items={draft.effects} />}

        {against && (
          <label className="s3-field">
            <span className="s3-l">Reason (required): {AGAINST_MAJORITY_TEXT.toLowerCase()}</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why you decide against the majority of positions." data-autofocus />
          </label>
        )}

        {choice === 'bid' && (
          <>
            {draft && draft.decision.conditions.length > 0 && (
              <div className="s3-field">
                <span className="s3-l">Conditions, each tracked on the bid workspace</span>
                <ul className="dg2-conds">{draft.decision.conditions.map((c) => <li key={c}>{c}{draft.decision.marginConditions?.includes(c) && <span className="mp-mtag">Margin</span>}</li>)}</ul>
              </div>
            )}
            <label className="s3-field">
              <span className="s3-l">Your own conditions (optional, one per line)</span>
              <textarea rows={2} value={own} onChange={(e) => setOwn(e.target.value)} placeholder="For example: confirm the process lead before submission" data-autofocus={against ? undefined : true} />
            </label>
            <label className="s3-field">
              <span className="s3-l">Your conditions that state a margin figure (optional, one per line)</span>
              <textarea rows={1} value={ownMargin} onChange={(e) => setOwnMargin(e.target.value)} placeholder="Masked for people without margin access" />
            </label>
          </>
        )}

        {choice === 'no-bid' && (
          <ReasonCodePicker
            codes={NO_BID_REASONS.map((r) => ({ id: r.code, label: r.label }))} value={codes} required="code" onChange={setCodes}
            noteLabel="Lessons for next time (optional)" autoFocus={!against}
          />
        )}

        {ds.staleAck && (
          <div className="dg2-stale">
            <p>{ds.staleAck.reason}.</p>
            <label className="s3-check"><input type="checkbox" checked={staleAck} onChange={(e) => setStaleAck(e.target.checked)} />{ds.staleAck.label}</label>
          </div>
        )}

        {!pv && <p className="s3-hint">The record preview appears once the form is complete.</p>}
        {pv && (
          <div className="dg2-preview" aria-label="Record preview">
            <div className="s3-effects-h">The record will say</div>
            <p><b>{DECISION_LABEL[pv.decision.decision]}</b>{pv.decision.conditions.length ? ` with ${pv.decision.conditions.length} condition${pv.decision.conditions.length === 1 ? '' : 's'}` : ''}, by {personById(pv.decision.byId)?.name}, on pack v{pv.decision.packVersion}.</p>
            {/* The detail after its first segment, which repeats the name and pack version above. */}
            <p>{(pv.audit[0].detail ?? '').split(' · ').slice(1).join(' · ')}</p>
          </div>
        )}
      </ConfirmModal>
    </section>
  );
}
