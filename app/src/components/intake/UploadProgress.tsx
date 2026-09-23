import { Check, FileText } from 'lucide-react';
import type { Upload } from '@/state/store';
import type { Progress } from '@/domain/intake';

const secs = (ms: number) => { const s = Math.ceil(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };
const mb = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** One document in flight: the step it is on, overall progress and time left. */
export function UploadRow({ u, p, children }: { u: Upload; p: Progress; children?: React.ReactNode }) {
  const step = p.steps[Math.min(p.at, p.steps.length - 1)];
  const line =
    p.phase === 'processing' ? `${step.label}. ${step.detail}`
    : p.phase === 'ready' ? `Extracted. ${p.steps.find((s) => s.key === 'fields')?.detail ?? ''}`
    : p.phase === 'duplicate' ? 'Already uploaded. This is the same document as an earlier upload.'
    : 'Not recognised. Queued for the Tender Coordinator to log by hand.';
  return (
    <div className={`up-row ${p.phase}`}>
      <span className="up-ic" aria-hidden>{p.phase === 'ready' ? <Check size={16} /> : <FileText size={16} />}</span>
      <span className="up-main">
        <span className="up-top">
          <b className="up-name">{u.file}</b>
          <span className="up-size">{mb(u.size)}</span>
          {p.phase === 'processing' && <span className="up-left">{secs(p.remainingMs)} left</span>}
        </span>
        <span className="up-line">{line}</span>
        {p.phase === 'processing' && (
          <span className="up-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.pct * 100)} aria-label={`${u.file} progress`}>
            <span style={{ width: `${p.pct * 100}%` }} />
          </span>
        )}
        {children}
      </span>
    </div>
  );
}

/** The full step list, used on the review page while extraction runs. */
export function StepList({ p }: { p: Progress }) {
  return (
    <ol className="up-steps">
      {p.steps.map((s, i) => {
        const state = i < p.at ? 'done' : i === p.at ? 'now' : 'next';
        return (
          <li key={s.key} className={state}>
            <span className="dot" aria-hidden>{state === 'done' ? <Check size={11} strokeWidth={2.4} /> : null}</span>
            <span className="l">{s.label}</span>
            <span className="d">{state === 'next' ? '' : s.detail}</span>
            {state === 'now' && <span className="mini"><span style={{ width: `${p.stepPct * 100}%` }} /></span>}
          </li>
        );
      })}
    </ol>
  );
}
