import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Minus, Plus, Search, X } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const docs = new Map<string, Promise<PDFDocumentProxy>>();
const load = (url: string) => {
  if (!docs.has(url)) docs.set(url, pdfjs.getDocument({ url }).promise);
  return docs.get(url)!;
};

const flat = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const GAP = 14;

export interface PdfViewerProps {
  url: string;
  title: string;
  page: number;
  /** Text to find on the page, e.g. the extracted value being checked. */
  terms: string[];
  /** Label of the field being checked, shown in the toolbar. */
  label?: string;
  onClose: () => void;
}

/**
 * One page. Draws its canvas and text layer only while near the viewport, and
 * drops the canvas again when scrolled far away, so long documents stay light.
 */
function PageView({ doc, n, w, h, scale, terms, root, onHits }: {
  doc: PDFDocumentProxy; n: number; w: number; h: number; scale: number; terms: string[];
  root: HTMLDivElement | null; onHits: (n: number, count: number, first: HTMLElement | null) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root, rootMargin: '1200px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near || !canvas.current || !layer.current) return;
    let cancelled = false;
    let task: { promise: Promise<void>; cancel: () => void } | null = null;
    (async () => {
      const pg = await doc.getPage(n);
      if (cancelled) return;
      const vp = pg.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = canvas.current!;
      c.width = Math.floor(vp.width * dpr);
      c.height = Math.floor(vp.height * dpr);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      task = pg.render({ canvasContext: ctx, viewport: vp });
      await task.promise.catch(() => undefined);
      if (cancelled) return;
      const tlBox = layer.current!;
      tlBox.replaceChildren();
      tlBox.style.setProperty('--scale-factor', String(scale));
      const tl = new pdfjs.TextLayer({ textContentSource: pg.streamTextContent(), container: tlBox, viewport: vp });
      await tl.render();
      if (cancelled) return;
      const wanted = terms.map(flat).filter((t) => t.length >= 2);
      let count = 0;
      let first: HTMLElement | null = null;
      if (wanted.length) {
        for (const el of tl.textDivs as HTMLElement[]) {
          const t = flat(el.textContent ?? '');
          if (t.replace(/[^a-z0-9]/g, '').length < 2) continue;
          if (wanted.some((x) => t.includes(x) || (t.length >= 5 && x.includes(t)))) { el.classList.add('hit'); count++; first ??= el; }
        }
      }
      onHits(n, count, first);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [near, doc, n, scale, terms, onHits]);

  // Free the bitmap once the page is well out of view.
  useEffect(() => {
    if (near || !canvas.current) return;
    canvas.current.width = 0;
    canvas.current.height = 0;
    layer.current?.replaceChildren();
  }, [near]);

  return (
    <div className="pdfv-page-c" ref={box} data-page={n} style={{ width: w, height: h }}>
      <canvas ref={canvas} style={{ width: w, height: h }} />
      <div className="textLayer" ref={layer} style={{ width: w, height: h }} />
      {!near && <span className="pdfv-ph">{n}</span>}
    </div>
  );
}

/** In-app PDF viewer: every page in one scrolling column, with the checked value marked on its page. */
export default function PdfViewer({ url, title, page: startPage, terms, label, onClose }: PdfViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(startPage);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<number[] | null>(null);
  const [active, setActive] = useState(terms);
  const [focusPage, setFocusPage] = useState(startPage);
  const [hitsOn, setHitsOn] = useState<Record<number, number>>({});
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const jumped = useRef(false);
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => { setActive(terms); setFocusPage(startPage); setFound(null); setQuery(''); setHitsOn({}); jumped.current = false; }, [startPage, terms]);

  // Lock the page behind the viewer so scrolling never leaks through.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await load(url);
        const s = await Promise.all(Array.from({ length: d.numPages }, (_, i) => d.getPage(i + 1).then((p) => { const v = p.getViewport({ scale: 1 }); return { w: v.width, h: v.height }; })));
        if (live) { setDoc(d); setSizes(s); }
      } catch { if (live) setError('The PDF could not be opened.'); }
    })();
    return () => { live = false; };
  }, [url]);

  useEffect(() => {
    if (!body) return;
    const ro = new ResizeObserver(() => setWidth(body.clientWidth));
    ro.observe(body);
    return () => ro.disconnect();
  }, [body]);

  const maxW = Math.max(1, ...sizes.map((s) => s.w));
  const scale = width ? ((width - 32) / maxW) * zoom : 0;

  const scrollToPage = useCallback((n: number, smooth = true) => {
    const el = body?.querySelector<HTMLElement>(`[data-page="${n}"]`);
    if (el && body) body.scrollTo({ top: el.offsetTop - GAP, behavior: smooth ? 'smooth' : 'auto' });
  }, [body]);

  // First open, and after zooming: keep the page in view.
  useLayoutEffect(() => {
    if (!doc || !scale) return;
    scrollToPage(jumped.current ? pageRef.current : focusPage, false);
  }, [doc, scale, focusPage, scrollToPage]);

  // Track which page is in view as the reader scrolls.
  useEffect(() => {
    if (!body || !doc) return;
    const onScroll = () => {
      const mid = body.scrollTop + body.clientHeight * 0.35;
      const els = body.querySelectorAll<HTMLElement>('[data-page]');
      let cur = 1;
      els.forEach((el) => { if (el.offsetTop <= mid) cur = Number(el.dataset.page); });
      setPage(cur);
    };
    body.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => body.removeEventListener('scroll', onScroll);
  }, [body, doc, scale]);

  const onHits = useCallback((n: number, count: number, first: HTMLElement | null) => {
    setHitsOn((h) => (h[n] === count ? h : { ...h, [n]: count }));
    if (n === focusPage && first && !jumped.current && body) {
      jumped.current = true;
      const top = (first.closest('[data-page]') as HTMLElement).offsetTop + first.offsetTop - body.clientHeight * 0.35;
      body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, [focusPage, body]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.target as HTMLElement).closest('input')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(pageRef.current + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(pageRef.current - 1); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });

  const total = doc?.numPages ?? 0;
  // Neighbouring pages glide; longer jumps are instant.
  const go = (n: number) => { if (!total) return; const t = Math.max(1, Math.min(total, n)); jumped.current = true; scrollToPage(t, Math.abs(t - pageRef.current) <= 2); setPage(t); };

  const find = useCallback(async () => {
    const q = flat(query);
    if (!doc || q.length < 2) return;
    const pages: number[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      if (flat(tc.items.map((it) => ('str' in it ? it.str : '')).join(' ')).includes(q)) pages.push(i);
    }
    setFound(pages);
    setHitsOn({});
    setActive([query]);
    if (pages.length) { const t = pages.find((p) => p >= pageRef.current) ?? pages[0]; jumped.current = false; setFocusPage(t); }
  }, [doc, query]);

  const stepFound = (dir: 1 | -1) => {
    if (!found?.length) return;
    const i = found.findIndex((p) => (dir > 0 ? p > page : p >= page));
    const t = dir > 0 ? found[i === -1 ? 0 : i] : found[(i <= 0 ? found.length : i) - 1];
    go(t);
  };

  const hitsHere = hitsOn[focusPage] ?? 0;

  return (
    <div className="pdfv" role="dialog" aria-modal="true" aria-label={`${title}, page ${page} of ${total}`}>
      <div className="pdfv-bar">
        <div className="pdfv-t">
          <b>{title}</b>
          <span>{label ? `Checking: ${label}` : 'Source document'}{label && hitsHere ? `, ${hitsHere} match${hitsHere === 1 ? '' : 'es'} on page ${focusPage}` : ''}</span>
        </div>
        <a className="btn btn-icon" href={url} target="_blank" rel="noreferrer" aria-label="Open in a new tab" title="Open in a new tab"><ExternalLink /></a>
        <a className="btn btn-icon" href={url} download aria-label="Download" title="Download"><Download /></a>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close preview"><X /></button>
      </div>
      <div className="pdfv-tools">
        <button type="button" className="btn btn-icon" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft /></button>
        <label className="pdfv-page">
          <input
            key={page} defaultValue={page} inputMode="numeric" aria-label="Page"
            onKeyDown={(e) => { if (e.key === 'Enter') go(Number((e.target as HTMLInputElement).value.replace(/\D/g, '')) || page); }}
            onBlur={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); if (n && n !== page) go(n); }}
          />
          <span>of {total || '…'}</span>
        </label>
        <button type="button" className="btn btn-icon" onClick={() => go(page + 1)} disabled={!total || page >= total} aria-label="Next page"><ChevronRight /></button>
        <span className="pdfv-sep" />
        <button type="button" className="btn btn-icon" onClick={() => { jumped.current = true; setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1))); }} aria-label="Zoom out"><Minus /></button>
        <button type="button" className="pdfv-zoom" onClick={() => { jumped.current = true; setZoom(1); }} title="Fit to width">{Math.round(zoom * 100)}%</button>
        <button type="button" className="btn btn-icon" onClick={() => { jumped.current = true; setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(1))); }} aria-label="Zoom in"><Plus /></button>
        <form className="pdfv-find" onSubmit={(e) => { e.preventDefault(); void find(); }}>
          <Search size={14} aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find in document" aria-label="Find in document" />
        </form>
      </div>
      {found && (
        <div className="pdfv-found">
          {found.length ? <>Found on {found.length === 1 ? 'page' : 'pages'} {found.slice(0, 12).join(', ')}{found.length > 12 ? '…' : ''}</> : `No match for "${query}"`}
          {found.length > 1 && <span className="pdfv-fnav"><button type="button" className="btn-link" onClick={() => stepFound(-1)}>Previous</button><button type="button" className="btn-link" onClick={() => stepFound(1)}>Next</button></span>}
        </div>
      )}
      <div className="pdfv-body" ref={setBody}>
        {error ? <div className="pdfv-msg">{error}</div> : !doc || !scale ? <div className="pdfv-msg">Opening {title}…</div> : (
          <div className="pdfv-pages">
            {sizes.map((s, i) => (
              <PageView key={i + 1} doc={doc} n={i + 1} w={Math.floor(s.w * scale)} h={Math.floor(s.h * scale)} scale={scale} terms={active} root={body} onHits={onHits} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
