import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, UploadCloud } from 'lucide-react';
import { can, holdersOf } from '@/data/access';
import { firstWithRole, personById } from '@/data/people';
import { HERO_FILE_NAME, HERO_ID } from '@/data/gcc/hero';
import { dataOf, shortWhen } from '@/domain/gcc/s1/common';
import { documentFor } from '@/domain/gcc/documents';
import { extractionRun, type ExtractionRunScript } from '@/domain/gcc/s1/extractionRun';
import { EXIT_MS } from '@/state/presence';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { Callout } from '@/components/tender/Callout';
import { DemoTag } from '@/components/tender/DemoTag';
import { useS1 } from './vm/useS1';
import { uploadWrite } from './vm/uploads';
import { S1Modal } from './parts/Modal';
import { ExtractionRun } from './ExtractionRun';
import './s1.css';

/**
 * Upload a tender document (spec §6.2, plan 007b step 1.3). The demo
 * recognises the files it holds by name (`recogniseUpload`): the hero booklet
 * and the other demo documents open their tender; any other file stops after
 * the page read and waits in the Coordinator's queue; the same name again is
 * a duplicate.
 *
 * A demo document the viewer may open plays the extraction run (plan 045):
 * about 20 seconds of the agent reading it, then the tender's Overview. The
 * upload is recorded when the file is taken; the toast comes at the end.
 * Close or Esc stops the run and records nothing more.
 */

interface Result {
  file: string;
  duplicate: boolean;
  firstAt?: string;
  firstBy?: string;
  docKey?: string;
  tenderId?: string;
}

/** A recognised document playing its extraction run. */
interface Run { script: ExtractionRunScript; toast: string; again: boolean }

/** The tender's heading, once the workspace has rendered and the modal has handed focus back: focus goes there. */
function focusHeading() {
  let tries = 0;
  const go = () => {
    const h = document.querySelector<HTMLElement>('.wsh-title');
    if (h && !document.querySelector('[aria-modal="true"]')) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      return;
    }
    if (++tries < 60) window.setTimeout(go, 50);
  };
  window.setTimeout(go, EXIT_MS + 20);
}

export function UploadGcc({ variant = 'header' }: { variant?: 'header' | 'button' }) {
  const s1 = useS1();
  const { tenant, viewer, viewAs, done } = s1;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const right = can(viewer, 'tender.create', { viewAs });
  const granted = can(viewer, 'tender.create').ok;

  // The documents this demo holds a copy of, for a presenter who has no file to hand. Only tenders the viewer may open are named.
  const { canOpen } = s1;
  const demoFiles = useMemo(() => {
    const reg = dataOf(tenant).register;
    const out: { name: string; title: string }[] = [];
    // A past-dated record (published over a year before demo day: Batinah's Jezzine tender) stays on the register, but isn't offered here.
    const stale = addDays(DEMO_TODAY, -365);
    for (const t of reg) {
      if ((t.keyDates.find((k) => k.kind === 'published')?.date ?? DEMO_TODAY) < stale) continue;
      const d = t.docKey && canOpen(t.id) ? documentFor(tenant, t.id) : null;
      if (!d) continue;
      const names = t.id === HERO_ID ? [HERO_FILE_NAME] : d.record.fileNames;
      out.push({ name: names[names.length - 1], title: `${t.id} · ${d.record.shortName}` });
    }
    return out;
  }, [tenant, canOpen]);

  if (!granted) return null;

  const coord = firstWithRole(tenant, 'coord');

  // A file name may be Arabic: isolated (U+2068 … U+2069, as `<bdi dir="auto">`) so it keeps its order inside an English line.
  const iso = (file: string) => `\u2068${file}\u2069`;

  const take = (file: string) => {
    const at = s1.nextAt();
    const w = uploadWrite(done, tenant, file, at, viewer.id);
    const tid = w.hit?.tenderId ?? w.previous?.tenderId;
    const what = w.duplicate ? 'flagged as a duplicate' : w.hit ? (tid ? `recognised as ${tid}` : 'recognised; not on the register') : 'not recognised; sent to the intake queue';
    s1.mark(w.key, undefined, undefined, w.value);
    s1.logAudit({ actorId: viewer.id, action: 'Uploaded a tender document', ...(tid ? { target: tid } : {}), detail: `${file}: ${what} (demo recognition by file name)` });
    // A tender outside the viewer's role is logged, never named (plan 016b).
    const named = !!tid && canOpen(tid);
    // A demo document this viewer may open: the extraction run, then its Overview. The toast waits for the end.
    const doc = named && w.hit ? documentFor(tenant, tid) : null;
    const script = doc && tid ? extractionRun(tenant, tid, doc.record, {
      file, done, ...(w.previous ? { previous: { at: w.previous.times[0].at, by: personById(w.previous.times[0].byId)?.name } } : {}),
    }) : null;
    if (script) {
      setRun({ script, again: w.duplicate, toast: w.duplicate ? `${iso(file)} was uploaded before: linked to ${tid}, not added again.` : `${iso(file)} recognised as ${tid}.` });
      return;
    }
    s1.toast(w.duplicate ? `${iso(file)} was uploaded before: flagged as a duplicate.` : w.hit ? `${iso(file)} recognised${named ? ` as ${tid}` : tid ? ' and logged to the register' : ''}.` : `${iso(file)} isn't in the demo set. It waits in ${coord?.name ?? 'the Coordinator'}'s queue.`, w.duplicate ? 'ink3' : w.hit ? 'green' : 'orange');
    setResult({
      file, duplicate: w.duplicate, docKey: w.hit?.docKey, ...(tid ? { tenderId: tid } : {}),
      ...(w.previous ? { firstAt: w.previous.times[0].at, firstBy: personById(w.previous.times[0].byId)?.name } : {}),
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) take(f.name);
  };

  const close = () => { setOpen(false); setResult(null); setRun(null); };
  // The run's end, or "Skip to tender": the toast, then the tender's Overview with focus on its heading.
  const finish = (r: Run) => {
    setOpen(false); setRun(null); setResult(null);
    s1.toast(r.toast, r.again ? 'ink3' : 'green');
    navigate(`/tenders/${encodeURIComponent(r.script.tenderId)}`);
    focusHeading();
  };
  const t = result?.tenderId ? dataOf(tenant).register.find((x) => x.id === result.tenderId) : undefined;
  const opens = !!result?.tenderId && canOpen(result.tenderId);

  const trigger = variant === 'header'
    ? (
      <button type="button" className="hd-pill hd-upload" onClick={() => setOpen(true)} disabled={!right.ok} title={right.ok ? 'Upload a tender document' : right.reason} aria-label="Upload tender">
        <UploadCloud size={14} aria-hidden /><span className="hide-sm">Upload tender</span>
      </button>
    )
    : (
      <span className="s1-act">
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)} disabled={!right.ok} aria-describedby={right.ok ? undefined : 'upl-why'}>
          <UploadCloud size={12} aria-hidden />Upload a tender
        </button>
        {!right.ok && <span className="s1-why" id="upl-why">{right.reason}</span>}
      </span>
    );

  return (
    <>
      {trigger}
      <S1Modal
        open={open} onClose={close}
        eyebrow={run ? 'Intake & Extraction agent' : 'Intake'}
        title={run ? iso(run.script.file) : result ? iso(result.file) : 'Upload a tender document'}
        sub={result || run ? undefined : 'The Intake & Extraction agent reads it, checks the register and screens it for your company.'}
        actions={run
          ? [{ label: 'Close', onClick: close }]
          : result
          ? [
            ...(opens ? [{ label: `Open ${result.tenderId}`, primary: true, onClick: () => { close(); navigate(`/tenders/${result.tenderId}?tab=documents`); } }] : []),
            { label: 'Upload another', onClick: () => setResult(null) },
            { label: 'Close', onClick: close },
          ]
          : [{ label: 'Choose a file', primary: true, onClick: () => input.current?.click() }, { label: 'Cancel', onClick: close }]}
      >
        {run ? (
          <ExtractionRun key={run.script.file} script={run.script} onDone={() => finish(run)} onSkip={() => finish(run)} />
        ) : !result ? (
          <>
            <label
              className={`s1-drop ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
            >
              <FileUp size={18} aria-hidden />
              <span>Drop a PDF here, or choose a file</span>
              <input ref={input} type="file" accept=".pdf,.zip,.doc,.docx,.xlsx" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) take(f.name); e.target.value = ''; }} />
            </label>
            <div className="s1-demofiles">
              <div className="s1-demofiles-h"><DemoTag /> Files this demo holds</div>
              {demoFiles.map((f) => (
                <button key={f.name} type="button" className="btn btn-sm" onClick={() => take(f.name)}>{f.title}</button>
              ))}
              <button type="button" className="btn btn-sm" onClick={() => take('scanned-letter-0308.pdf')}>A file the demo does not hold</button>
            </div>
          </>
        ) : result.duplicate ? (
          <Callout variant="route" word="Duplicate" title={`Uploaded before${result.firstAt ? `, ${shortWhen(result.firstAt)}` : ''}${result.firstBy ? ` by ${result.firstBy}` : ''}`}>
            Flagged as a duplicate and not added again{opens ? `: it stays one record, ${result.tenderId}` : ''}.
          </Callout>
        ) : result.docKey && t && !opens ? (
          <Callout variant="route" word="Recognised" title="Logged to the register">
            It is outside your role.
          </Callout>
        ) : result.docKey && t ? (
          <Callout variant="verdict" word="Recognised" title={`${t.id} · ${t.shortTitle}`}>
            Already on the register, captured from {t.sourceDetail}. Linked, not duplicated: both sources are listed in Documents.
          </Callout>
        ) : result.docKey ? (
          <Callout variant="route" word="Recognised" title="Not on this company's register">
            The demo holds this document for another company. It waits in {coord?.name ?? 'the Coordinator'}'s queue to be logged.
          </Callout>
        ) : (
          <Callout variant="route" word="Stopped" title="Stopped after the page read">
            The agent read the pages but cannot place this document in the demo set. It waits in {coord?.name ?? 'the Coordinator'}'s intake queue for a person to classify it.
            {!s1.check('queue.view').ok && ` The queue is for ${holdersOf('queue.view')}.`}
          </Callout>
        )}
      </S1Modal>
    </>
  );
}
