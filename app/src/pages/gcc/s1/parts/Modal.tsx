import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalFrame } from '@/components/overlays/Frames';
import { ClosingContext, usePresence } from '@/state/presence';

type Action = { label: string; primary?: boolean; disabled?: boolean; onClick(): void };

/**
 * The app's modal (`ModalFrame`: focus trap, Esc, exit motion) opened from a
 * page's own state, as the kit's `OverrideModal` does. `foot` says, in words,
 * why the primary action is disabled.
 */
export function S1Modal({ open, eyebrow, title, sub, actions, foot, onClose, children, wide }: {
  open: boolean; eyebrow: string; title: string; sub?: string; actions: Action[]; foot?: string; onClose(): void; children: ReactNode; wide?: boolean;
}) {
  const { shown, closing } = usePresence(open ? true : null);
  if (!shown) return null;
  return createPortal(
    <ClosingContext.Provider value={closing}>
      <ModalFrame eyebrow={eyebrow} title={title} sub={sub} onClose={onClose} foot={foot} actions={actions} wide={wide}>
        <div className="modal-body s1-modal">{children}</div>
      </ModalFrame>
    </ClosingContext.Provider>,
    document.body,
  );
}
