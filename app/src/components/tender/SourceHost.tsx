import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Opens a source document at a page, with the value highlighted (spec §5.3,
 * ui-direction §7.4). Mounted once per page (the Tender Workspace, the kit
 * preview); every `SourceChip` inside reaches it through context. The viewer
 * is a lazy chunk, so pdf.js loads only when a chip is clicked. Esc closes it
 * and focus goes back to the chip that opened it.
 */

const PdfViewer = lazy(() => import('@/components/intake/PdfViewer'));

/** A document the demo holds a copy of. */
export interface SourceDoc { url: string; title: string }

export interface OpenAt {
  doc: SourceDoc;
  page: number;
  /** Text to highlight on the page: the value being checked. */
  terms?: string[];
  /** What is being checked, for the viewer's toolbar. */
  label?: string;
}

interface Api { open(at: OpenAt, from?: HTMLElement | null): void }

const Ctx = createContext<Api | null>(null);

/** The host, or null when none is mounted (the chip then says where the value is instead). */
export const useSourceHost = () => useContext(Ctx);

const NO_TERMS: string[] = [];
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mounted inside the viewer's Suspense boundary, so it runs once the viewer is on screen: focus goes to Close. */
function FocusInto({ root }: { root: RefObject<HTMLDivElement> }) {
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('.pdfv-bar button[aria-label="Close preview"]')?.focus({ preventScroll: true });
  }, [root]);
  return null;
}

export function SourceHost({ children }: { children: ReactNode }) {
  const [at, setAt] = useState<OpenAt | null>(null);
  const from = useRef<HTMLElement | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const open = useCallback((a: OpenAt, el?: HTMLElement | null) => {
    from.current = el ?? (document.activeElement as HTMLElement | null);
    setAt(a);
  }, []);

  const close = useCallback(() => {
    setAt(null);
    const el = from.current;
    from.current = null;
    window.requestAnimationFrame(() => el?.focus({ preventScroll: true }));
  }, []);

  // Tab stays inside the viewer while it is open.
  useEffect(() => {
    if (!at) return;
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !wrap.current) return;
      const f = Array.from(wrap.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!f.length) return;
      const [a, z] = [f[0], f[f.length - 1]];
      if (!wrap.current.contains(document.activeElement)) { e.preventDefault(); a.focus(); return; }
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [at]);

  const api = useMemo<Api>(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {at && createPortal(
        <div className="pdfv-wrap src-host" ref={wrap}>
          <div className="scrim" onClick={close} aria-hidden />
          <Suspense fallback={<div className="pdfv"><div className="pdfv-msg">Opening {at.doc.title}…</div></div>}>
            <PdfViewer url={at.doc.url} title={at.doc.title} page={at.page} terms={at.terms ?? NO_TERMS} label={at.label} onClose={close} />
            <FocusInto root={wrap} />
          </Suspense>
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
