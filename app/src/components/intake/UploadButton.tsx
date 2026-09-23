import { useEffect, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { canSee } from '@/data/access';
import { useDemo } from '@/state/store';
import { docFor, fieldCount, progressOf, useNow } from '@/domain/intake';

const busy = (uploads: ReturnType<typeof useDemo>['state']['uploads'], now: number) =>
  uploads.map((u) => progressOf(u, now, uploads)).filter((p) => p.phase === 'processing');

/** Header entry point for intake. While documents are being read it shows their progress. */
export function UploadButton() {
  const { state, openModal } = useDemo();
  const now = useNow(busy(state.uploads, Date.now()).length > 0, 400);
  if (!canSee(state.role, 'intake')) return null;
  const running = busy(state.uploads, now);
  const pct = running.length ? running.reduce((a, p) => a + p.pct, 0) / running.length : 0;
  return (
    <button type="button" className={`hd-pill hd-upload ${running.length ? 'busy' : ''}`} onClick={() => openModal({ type: 'upload' })} aria-label={running.length ? `Extracting ${running.length} document${running.length === 1 ? '' : 's'}, ${Math.round(pct * 100)}%` : 'Upload tender'}>
      {running.length ? (
        <span className="ring" style={{ '--p': `${pct * 360}deg` } as React.CSSProperties} aria-hidden />
      ) : <UploadCloud size={14} aria-hidden />}
      <span className="hide-sm">{running.length ? `Extracting ${Math.round(pct * 100)}%` : 'Upload tender'}</span>
    </button>
  );
}

/** Raises a notice when a document finishes, wherever the user is in the app. */
export function IntakeWatcher() {
  const { state, toast } = useDemo();
  const now = useNow(busy(state.uploads, Date.now()).length > 0, 500);
  const seen = useRef<Set<string>>(new Set(state.uploads.filter((u) => progressOf(u, Date.now(), state.uploads).phase !== 'processing').map((u) => u.id)));
  useEffect(() => {
    for (const u of state.uploads) {
      if (seen.current.has(u.id)) continue;
      const p = progressOf(u, now, state.uploads);
      if (p.phase === 'processing') continue;
      seen.current.add(u.id);
      const d = docFor(u);
      if (p.phase === 'ready' && d) toast(`${u.file} extracted: ${fieldCount(d)} fields ready to review`, 'green');
      else if (p.phase === 'duplicate') toast(`${u.file} was already uploaded`, 'ink3');
      else toast(`${u.file} isn't in the demo set. Queued for the Tender Coordinator`, 'orange');
    }
  }, [now, state.uploads, toast]);
  return null;
}
