import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalFrame } from '@/components/overlays/Frames';
import { ClosingContext, usePresence } from '@/state/presence';

/**
 * The confirm step for Stage 3 and DG2 actions (issue, decide, re-open, close
 * a condition): what will happen first, then the form, and a confirm button
 * that stays disabled, saying why, until the form is complete.
 */
export function ConfirmModal({ open, eyebrow, title, sub, confirmLabel, disabledReason, danger = false, wide = false, onConfirm, onClose, children }: {
  open: boolean;
  eyebrow: string;
  title: string;
  sub?: string;
  confirmLabel: string;
  /** Why the confirm button is disabled, in words; shown beside it. */
  disabledReason?: string | null;
  danger?: boolean;
  wide?: boolean;
  onConfirm(): void;
  onClose(): void;
  children: ReactNode;
}) {
  const { shown, closing } = usePresence(open ? true : null);
  if (!shown) return null;
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <ModalFrame
        eyebrow={eyebrow} title={title} sub={sub} onClose={onClose} wide={wide}
        foot={disabledReason ?? undefined}
        actions={[
          { label: confirmLabel, primary: !danger, danger, disabled: !!disabledReason, onClick: onConfirm },
          { label: 'Cancel', onClick: onClose },
        ]}
      >
        <div className="modal-body s3-modal">{children}</div>
      </ModalFrame>
    </ClosingContext.Provider>,
    document.body,
  );
}

/** "What happens": the effects of an action, before it is taken. */
export function Effects({ items, title = 'What happens' }: { items: string[]; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="s3-effects">
      <div className="s3-effects-h">{title}</div>
      <ul>{items.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );
}
