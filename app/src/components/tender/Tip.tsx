import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './tender.css';

/**
 * A popover that opens on hover, on keyboard focus and on tap (ui-direction §9:
 * no hover-only information). Esc closes it. It renders into `document.body`
 * with fixed positioning, so cards and grid cells never clip it. It uses the
 * app's `.popover` look.
 */

type Align = 'start' | 'end' | 'center';

interface Opts {
  width?: number;
  align?: Align;
  gap?: number;
  /** `hover` (the default): opens on hover, focus and tap. `click`: a menu that opens and closes on click. */
  mode?: 'hover' | 'click';
  /** Accessible name of a click-mode panel. */
  label?: string;
}

const EDGE = 12;
const CLOSE_DELAY = 120;

export function usePop<T extends HTMLElement>({ width = 320, align = 'start', gap = 8, mode = 'hover', label }: Opts = {}) {
  const ref = useRef<T | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' });
  const timer = useRef<number | undefined>(undefined);
  const id = useId();

  const cancelClose = () => window.clearTimeout(timer.current);
  const show = useCallback(() => { cancelClose(); setOpen(true); }, []);
  const hideSoon = useCallback(() => {
    cancelClose();
    timer.current = window.setTimeout(() => { setOpen(false); setPinned(false); }, CLOSE_DELAY);
  }, []);
  const close = useCallback(() => { cancelClose(); setOpen(false); setPinned(false); }, []);

  const place = useCallback(() => {
    const a = ref.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const w = Math.min(width, window.innerWidth - EDGE * 2);
    const x = align === 'end' ? r.right - w : align === 'center' ? r.left + r.width / 2 - w / 2 : r.left;
    const left = Math.max(EDGE, Math.min(x, window.innerWidth - w - EDGE));
    const h = popRef.current?.offsetHeight ?? 0;
    const below = r.bottom + gap;
    const top = below + h > window.innerHeight - EDGE && r.top - gap - h > EDGE ? r.top - gap - h : below;
    setPos({ position: 'fixed', top, left, width: w, right: 'auto', visibility: 'visible' });
  }, [width, align, gap]);

  useLayoutEffect(() => {
    if (!open) { setPos({ visibility: 'hidden' }); return; }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      // A menu hands focus back to its button.
      if (mode === 'click' && popRef.current?.contains(document.activeElement)) ref.current?.focus();
      close();
    };
    const out = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !popRef.current?.contains(t)) close();
    };
    const move = () => place();
    document.addEventListener('keydown', k, true);
    document.addEventListener('mousedown', out);
    document.addEventListener('touchstart', out);
    window.addEventListener('scroll', move, true);
    window.addEventListener('resize', move);
    return () => {
      document.removeEventListener('keydown', k, true);
      document.removeEventListener('mousedown', out);
      document.removeEventListener('touchstart', out);
      window.removeEventListener('scroll', move, true);
      window.removeEventListener('resize', move);
    };
  }, [open, close, place, mode]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Spread on a menu's button: click opens and closes. */
  const menuProps = {
    ref,
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: (e: { stopPropagation(): void }) => {
      e.stopPropagation();
      if (open) close(); else { setPinned(true); show(); }
    },
  };

  /** Spread on the trigger. A tap or click pins it open; a second tap closes it. */
  const triggerProps = {
    ref,
    'aria-describedby': open ? id : undefined,
    onMouseEnter: show,
    onMouseLeave: () => { if (!pinned) hideSoon(); },
    onFocus: show,
    onBlur: () => { if (!pinned) hideSoon(); },
    onClick: (e: { stopPropagation(): void }) => {
      e.stopPropagation();
      if (pinned) close(); else { setPinned(true); show(); }
    },
  };

  const render = (content: ReactNode, className = '') => (open ? createPortal(
    <div
      id={id} ref={popRef} className={`popover tip-pop ${className}`} style={pos}
      {...(mode === 'click' ? { role: 'dialog', 'aria-label': label } : { role: 'tooltip' })}
      onMouseEnter={cancelClose} onMouseLeave={() => { if (!pinned) hideSoon(); }}
    >
      {content}
    </div>,
    document.body,
  ) : null);

  return { open, close, triggerProps, menuProps, render };
}

/** A focusable span with a popover. Use for values that explain themselves on hover and focus. */
export function Tip({ tip, children, className = '', width, label }: { tip: ReactNode; children: ReactNode; className?: string; width?: number; label?: string }) {
  const p = usePop<HTMLSpanElement>({ width });
  return (
    <>
      <span tabIndex={0} className={`tip-trigger ${className}`} aria-label={label} {...p.triggerProps}>{children}</span>
      {p.render(<div className="tip-body">{tip}</div>)}
    </>
  );
}
