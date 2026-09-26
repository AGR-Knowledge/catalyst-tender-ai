import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { usePresence } from '@/state/presence';
import './tender.css';

/**
 * The triage sheet (ui-direction §5 C1, §6.2): a 720 px overlay from the
 * right, over a list. ↑ and ↓ (or the buttons) move through the list the
 * caller passes, which is the filtered list; the header says "n of m". Esc
 * closes, focus stays inside, and goes back to the row that opened it. Full
 * screen below 900 px. It uses the drawer's motion tokens.
 */

export interface SheetItem { id: string; title: string }

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function Sheet({ items, index, onIndex, onClose, render, primary, eyebrow = 'Triage' }: {
  items: SheetItem[];
  /** The open item, or null when the sheet is closed. */
  index: number | null;
  onIndex(i: number): void;
  onClose(): void;
  render(id: string): ReactNode;
  /** "Open workspace", with where it goes. */
  primary?: { label: string; onClick(id: string): void };
  eyebrow?: string;
}) {
  const open = index !== null && index >= 0 && index < items.length;
  const { shown, closing } = usePresence(open ? index : null);
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const idx = shown ?? 0;
  const item = items[idx];

  const mounted = shown !== null;

  // Remember where focus was, lock the page, and hand focus back on close.
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      opener.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      // A modal or the document viewer on top of the sheet has the keyboard.
      if (document.querySelector('.modal-wrap:not([data-closing]), .pdfv-wrap')) return;
      const el = e.target as HTMLElement;
      const typing = !!el.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (!typing && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const next = idx + (e.key === 'ArrowDown' ? 1 : -1);
        if (next >= 0 && next < items.length) onIndex(next);
        return;
      }
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!f.length) return;
        const [a, z] = [f[0], f[f.length - 1]];
        if (!ref.current.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, idx, items.length, onIndex, onClose]);

  // The sheet mounts a render after it opens: focus moves in once it is there.
  useEffect(() => {
    if (open && mounted) ref.current?.querySelector<HTMLElement>('.sheet-x')?.focus({ preventScroll: true });
  }, [open, mounted]);

  // Each item starts at the top.
  useEffect(() => { ref.current?.querySelector('.sheet-body')?.scrollTo({ top: 0 }); }, [idx]);

  if (shown === null || !item) return null;

  return createPortal(
    <div className="overlay sheet-wrap" role="presentation" data-closing={closing || undefined}>
      <div className="scrim" onClick={onClose} aria-hidden />
      <div className="drawer sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="drawer-head sheet-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{eyebrow} <span className="num sheet-n">{idx + 1} of {items.length}</span></div>
            <div className="ttl" id="sheet-title">{item.title}</div>
          </div>
          <div className="sheet-nav">
            <button type="button" className="btn btn-icon" onClick={() => onIndex(idx - 1)} disabled={idx <= 0} aria-label="Previous (↑)" title="Previous (↑)"><ChevronUp /></button>
            <button type="button" className="btn btn-icon" onClick={() => onIndex(idx + 1)} disabled={idx >= items.length - 1} aria-label="Next (↓)" title="Next (↓)"><ChevronDown /></button>
            <button type="button" className="btn btn-icon sheet-x" onClick={onClose} aria-label="Close (Esc)" title="Close (Esc)"><X /></button>
          </div>
        </div>
        <div className="drawer-body sheet-body">{render(item.id)}</div>
        {primary && (
          <div className="drawer-foot">
            <button type="button" className="btn btn-lg btn-primary" onClick={() => primary.onClick(item.id)}>{primary.label}</button>
            <span className="f">↑ ↓ to move · Esc to close</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
