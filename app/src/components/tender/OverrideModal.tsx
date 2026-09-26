import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalFrame } from '@/components/overlays/Frames';
import { ClosingContext, usePresence } from '@/state/presence';
import { EMPTY_REASON, ReasonCodePicker, missingReason, type ReasonCode, type ReasonRule, type ReasonValue } from './ReasonCodePicker';
import './tender.css';

/**
 * Changing a recommendation (spec §5.2, ui-direction §6.2). The opposite choice
 * is pre-selected, the reason rule comes from the gate, and the confirm button
 * stays disabled, saying why, until the rule is met. The caller records the
 * decision; this modal only collects it.
 */

export const BOTH_KEPT = 'Both are kept, with your name and the time.';

export interface OverrideChoice { id: string; label: string; hint?: string }
export interface OverrideResult { choice: string; codes: string[]; note: string }

export function OverrideModal({
  open, title, from, options, preselect, reasonRule, codes, consequence, confirmLabel = 'Record decision', onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  /** The recommendation being overridden. */
  from: { verdict: string; agent: string };
  options: OverrideChoice[];
  /** The option chosen when the modal opens: the opposite of the recommendation. */
  preselect: string;
  reasonRule: ReasonRule;
  codes?: ReasonCode[];
  /** "Overriding does not by itself pursue the tender." */
  consequence?: string;
  confirmLabel?: string;
  onConfirm(r: OverrideResult): void;
  onClose(): void;
}) {
  const { shown, closing } = usePresence(open ? true : null);
  const [choice, setChoice] = useState(preselect);
  const [reason, setReason] = useState<ReasonValue>(EMPTY_REASON);

  // Each opening starts afresh.
  useEffect(() => {
    if (open) { setChoice(preselect); setReason(EMPTY_REASON); }
  }, [open, preselect]);

  if (!shown) return null;
  const missing = missingReason(reasonRule, reason);

  return createPortal(
    <ClosingContext.Provider value={closing}>
      <ModalFrame
        eyebrow="Override the recommendation"
        title={title}
        sub={`The ${from.agent} agent recommends: ${from.verdict}.`}
        onClose={onClose}
        foot={missing ?? undefined}
        actions={[
          { label: confirmLabel, primary: true, disabled: !!missing, onClick: () => onConfirm({ choice, codes: reason.codes, note: reason.note.trim() }) },
          { label: 'Cancel', onClick: onClose },
        ]}
      >
        <div className="modal-body ovr">
          <div className="ovr-choices" role="radiogroup" aria-label="Your decision">
            {options.map((o, i) => (
              <button
                key={o.id} type="button" role="radio" aria-checked={choice === o.id} className={`ovr-opt ${choice === o.id ? 'on' : ''}`}
                onClick={() => setChoice(o.id)} data-autofocus={i === 0 ? true : undefined}
              >
                <span className="ovr-dot" aria-hidden />
                <span className="ovr-t">{o.label}</span>
                {o.hint && <span className="ovr-h">{o.hint}</span>}
              </button>
            ))}
          </div>
          <ReasonCodePicker codes={codes} value={reason} required={reasonRule} onChange={setReason} />
          <p className="ovr-kept">{BOTH_KEPT}</p>
          {consequence && <p className="ovr-cons">{consequence}</p>}
        </div>
      </ModalFrame>
    </ClosingContext.Provider>,
    document.body,
  );
}
