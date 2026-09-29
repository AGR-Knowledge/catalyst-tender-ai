import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, X } from 'lucide-react';
import { usePresence } from '@/state/presence';
import { dateText, DEMO_TODAY } from '@/domain/calendar';
import { csvHtml } from '@/domain/gcc/library/csv';
import { DATED_WORD, type LibraryFileVM } from '@/domain/gcc/library/types';
import { LangBadge } from './LangBadge';
import { Masked } from './Masked';
import './file-viewer.css';

/**
 * The file viewer (plan 030 Phase 1): a whole file in a panel on the right,
 * over a scrim, as the pdf.js drawer is. The pdf.js drawer (`SourceHost`)
 * stays for citations, a value at its page; this one shows files.
 *
 * - A PDF the demo holds opens in the browser's own viewer at page 1, without
 *   the thumbnail pane (`#page=1&navpanes=0&view=FitH`).
 * - A facsimile (`view.kind === 'html'`) and a BOQ CSV (as a plain table) open
 *   in a sandboxed `srcDoc` iframe: no script runs in either.
 * - A file added in the demo shows its content in the session that added it,
 *   and its details after a reload.
 *
 * Controlled and hostless: the caller holds `file` and the list it came from,
 * and moves through it with `onIndex`. Previous and Next (or ← →) step through
 * `files`; Esc and Close call `onClose`. Focus goes to Close on open, stays
 * inside the panel (the iframe included), and returns to the file's row
 * (`[data-file-row="{id}"]`) on close, or to whatever opened the panel.
 * `extra` adds a control to the header (Read in English on an Arabic booklet).
 *
 * It opens one layer above whatever overlay is open (a sheet, a drawer), and
 * an overlay opened from it (Read in English's sheet, a modal) sits above it
 * and has the keyboard and focus until it closes.
 * Plan 031 imports it: keep the props.
 */

// A held PDF's frame takes focus (the browser's viewer); a sandboxed facsimile's can't, so it sits out of the tab order.
/** Overlays that can sit under or over the viewer. */
const OVERLAYS = '.overlay, .sheet-wrap, .modal-wrap, .pdfv-wrap, .fv-wrap';
const BASE_Z = 51;

/** An overlay opened after this one, so on top of it, and not on its way out. */
const overlayAbove = (wrap: HTMLElement | null): boolean =>
  !!wrap && Array.from(document.querySelectorAll<HTMLElement>(OVERLAYS))
    .some((o) => o !== wrap && !o.hasAttribute('data-closing') && !!(wrap.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING));

/** One above the highest overlay open now. */
const zAbove = (self: HTMLElement | null): number => Array.from(document.querySelectorAll<HTMLElement>(OVERLAYS))
  .filter((o) => o !== self && !o.hasAttribute('data-closing'))
  .reduce((z, o) => Math.max(z, (Number(getComputedStyle(o).zIndex) || 0) + 1), BASE_Z);

const DEMO_YEAR = DEMO_TODAY.slice(0, 4);
/** "Sun 8 Mar 07:33", with the year outside the demo year. */
const whenText = (iso: string) => {
  const d = dateText(iso.slice(0, 10));
  const day = iso.startsWith(DEMO_YEAR) ? d.replace(/ \d{4}$/, '') : d;
  return iso.length > 10 ? `${day} ${iso.slice(11, 16)}` : day;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), iframe:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/** CSV text by URL, for the session: a BOQ is read once. */
const CSV_CACHE = new Map<string, Promise<string>>();
/** Who sent or made it, unless the source or a tag already names them ("From Rhein Aqua Systems…", "Added by …"). */
export const byOf = (f: LibraryFileVM): string | null => (f.by && !f.source.label.includes(f.by) && !f.tags.some((t) => t.includes(f.by!)) ? f.by : null);

export function csvText(src: string): Promise<string> {
  let p = CSV_CACHE.get(src);
  if (!p) {
    p = fetch(src).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
    p.catch(() => CSV_CACHE.delete(src));
    CSV_CACHE.set(src, p);
  }
  return p;
}

const pdfAt = (src: string) => `${src}#page=1&navpanes=0&view=FitH`;
const sizeText = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
/** A plain word for an added file's type ("PDF", "Word document"), not its MIME type. */
function kindWord(mime: string, name: string): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return 'Image';
  if (mime === 'text/csv') return 'CSV';
  if (/wordprocessingml|msword/.test(mime)) return 'Word document';
  if (/spreadsheetml|ms-excel/.test(mime)) return 'Excel workbook';
  if (/presentationml|ms-powerpoint/.test(mime)) return 'PowerPoint deck';
  const ext = /\.([a-z0-9]{1,5})$/i.exec(name)?.[1];
  return ext ? `${ext.toUpperCase()} file` : '';
}

function CsvFrame({ file, src }: { file: LibraryFileVM; src: string }) {
  const [state, setState] = useState<{ src: string; html?: string; failed?: boolean }>({ src });
  useEffect(() => {
    let live = true;
    csvText(src).then((t) => { if (live) setState({ src, html: csvHtml(t, file.name) }); }, () => { if (live) setState({ src, failed: true }); });
    return () => { live = false; };
  }, [src, file.name]);
  if (state.src !== src || (!state.html && !state.failed)) return <div className="fv-msg">Opening {file.name}…</div>;
  if (state.failed) return <div className="fv-msg">This file could not be read. It is served from {src}.</div>;
  return <iframe className="fv-frame" title={file.name} srcDoc={state.html} sandbox="" tabIndex={-1} />;
}

function Body({ file }: { file: LibraryFileVM }) {
  const v = file.view;
  // A facsimile is built only when it is viewed, once per file.
  const html = useMemo(() => (v.kind === 'html' ? v.html() : null), [file.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (v.kind === 'url') return <iframe key={file.id} className="fv-frame" title={file.name} src={pdfAt(v.src)} />;
  if (v.kind === 'html') return <iframe key={file.id} className="fv-frame" title={file.name} srcDoc={html ?? ''} sandbox="" tabIndex={-1} />;
  if (v.kind === 'csv') return <CsvFrame key={file.id} file={file} src={v.src} />;
  const src = v.src();
  if (src && v.mime === 'application/pdf') return <iframe key={file.id} className="fv-frame" title={file.name} src={src} />;
  if (src && v.mime.startsWith('image/')) return <div className="fv-img"><img src={src} alt={file.name} /></div>;
  return (
    <div className="fv-card">
      <FileText size={26} aria-hidden className="fv-card-ic" />
      <div className="fv-card-t">{file.name}</div>
      <p>Added by {v.byName}, {whenText(v.at)}. {sizeText(v.bytes)}{kindWord(v.mime, file.name) ? ` · ${kindWord(v.mime, file.name)}` : ''}.</p>
      <p className="fv-card-s">
        {src
          ? 'The browser cannot show this kind of file here. Open it in a new tab to see it.'
          : "The demo keeps the file's name and details, not its content."}
      </p>
    </div>
  );
}

export function FileViewer({ file, files, onIndex, onClose, extra }: {
  file: LibraryFileVM | null;
  files: LibraryFileVM[];
  onIndex(i: number): void;
  onClose(): void;
  /** More in the header for this file. */
  extra?(file: LibraryFileVM): ReactNode;
}) {
  const { shown, closing } = usePresence(file);
  const open = !!file;
  const panel = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState(BASE_Z);
  const opener = useRef<HTMLElement | null>(null);
  const lastId = useRef<string | null>(null);
  if (file) lastId.current = file.id;
  const idx = shown ? files.findIndex((f) => f.id === shown.id) : -1;

  const nav = useRef({ idx, n: files.length, onIndex, onClose });
  nav.current = { idx, n: files.length, onIndex, onClose };

  // Remember the opener, lock the page, and hand focus back on close: to the file's row, else the opener.
  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    opener.current = active && active !== document.body && !panel.current?.contains(active) ? active : opener.current;
    setZ(zAbove(wrap.current));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      const id = lastId.current;
      const row = id ? document.querySelector<HTMLElement>(`[data-file-row="${CSS.escape(id)}"]`) : null;
      const to = row?.isConnected ? row : opener.current?.isConnected ? opener.current : null;
      opener.current = null;
      window.requestAnimationFrame(() => to?.focus({ preventScroll: false }));
    };
  }, [open]);

  // Esc, ← →, and Tab kept inside. Capture phase, so a sheet or drawer underneath doesn't also act on the key.
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      const p = panel.current;
      if (!p || overlayAbove(wrap.current)) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); nav.current.onClose(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const { idx: i, n } = nav.current;
        const next = i + (e.key === 'ArrowRight' ? 1 : -1);
        e.stopPropagation();
        if (i >= 0 && next >= 0 && next < n) { e.preventDefault(); nav.current.onIndex(next); }
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.stopPropagation(); return; }
      if (e.key === 'Tab') {
        e.stopPropagation();
        const f = Array.from(p.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!f.length) return;
        const [a, z] = [f[0], f[f.length - 1]];
        if (!p.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
        else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    // Tab out of the iframe lands outside the panel: bring it back to the first control.
    const f = (e: FocusEvent) => {
      const p = panel.current;
      if (p && e.target instanceof Node && !p.contains(e.target) && !overlayAbove(wrap.current)) p.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', k, true);
    document.addEventListener('focusin', f);
    return () => { document.removeEventListener('keydown', k, true); document.removeEventListener('focusin', f); };
  }, [open]);

  const mounted = !!shown;
  useEffect(() => {
    if (open && mounted) panel.current?.querySelector<HTMLElement>('.fv-x')?.focus({ preventScroll: true });
  }, [open, mounted]);

  if (!shown) return null;
  const f = shown;
  const v = f.view;
  const held = v.kind === 'url' ? pdfAt(v.src) : v.kind === 'csv' ? v.src : v.kind === 'added' ? v.src() : null;
  const by = byOf(f);
  // Received, Sent or Made, by what the file's date is (plan 033); a file that doesn't say reads as received.
  const line = [f.source.label, f.receivedAt ? `${DATED_WORD[f.dated ?? 'received']} ${whenText(f.receivedAt)}` : null, by ? `By ${by}` : null].filter(Boolean).join(' · ');

  return createPortal(
    <div className="fv-wrap" ref={wrap} role="presentation" data-closing={closing || undefined} style={{ zIndex: z }}>
      <div className="scrim" onClick={onClose} aria-hidden />
      <div className="fv" ref={panel} role="dialog" aria-modal="true" aria-labelledby="fv-title" aria-describedby="fv-line">
        <div className="fv-head">
          <div className="fv-h-main">
            <nav className="fv-crumb" aria-label="Folder">
              {f.path.map((p, i) => <span key={`${p}:${i}`}>{i > 0 && <span className="fv-sep" aria-hidden>›</span>}{p}</span>)}
            </nav>
            <div className="fv-title" id="fv-title"><bdi dir="auto">{f.name}</bdi></div>
            <div className="fv-line" id="fv-line">{line}</div>
            <div className="fv-tags">
              <span className="fv-tag">{f.type}</span>
              {f.lang && <LangBadge lang={f.lang} />}
              {f.scanned && <span className="fv-tag">{f.ocrText ? `Scanned (OCR ${f.ocrText})` : 'Scanned (OCR)'}</span>}
              {f.extent && <span className="fv-tag fv-tag-plain">{f.extent.n} {f.extent.unit}{f.extent.n === 1 ? '' : 's'}</span>}
              {f.tags.map((t) => <span key={t} className="fv-tag fv-tag-plain">{t}</span>)}
              {f.masked && <Masked by={f.masked.by} text="Figures masked for your role" />}
            </div>
          </div>
          <div className="fv-tools">
            {extra?.(f)}
            {files.length > 1 && idx >= 0 && <span className="num fv-n">{idx + 1} of {files.length}</span>}
            {files.length > 1 && (
              <>
                <button type="button" className="btn btn-icon" onClick={() => onIndex(idx - 1)} disabled={idx <= 0} aria-label="Previous file (←)" title="Previous file (←)"><ChevronLeft /></button>
                <button type="button" className="btn btn-icon" onClick={() => onIndex(idx + 1)} disabled={idx < 0 || idx >= files.length - 1} aria-label="Next file (→)" title="Next file (→)"><ChevronRight /></button>
              </>
            )}
            {held && (v.kind === 'csv'
              ? <a className="btn btn-icon" href={held} download={f.name} aria-label="Download the CSV" title="Download the CSV"><Download /></a>
              : <a className="btn btn-icon" href={held} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" title="Open in new tab"><ExternalLink /></a>)}
            <button type="button" className="btn btn-icon fv-x" onClick={onClose} aria-label="Close (Esc)" title="Close (Esc)"><X /></button>
          </div>
        </div>
        <div className="fv-body"><Body file={f} /></div>
      </div>
    </div>,
    document.body,
  );
}
