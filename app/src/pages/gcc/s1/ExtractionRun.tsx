import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { runAt, type ExtractionRunScript, type RunItem, type RunStep } from '@/domain/gcc/s1/extractionRun';
import { BilingualValue } from '@/components/tender/BilingualValue';
import { ELIGIBILITY_VERDICT } from './parts/EligibilityPanel';
import './extraction-run.css';

/**
 * The upload's extraction run (plan 045): the Intake & Extraction agent reads
 * the document in front of the prospect. Steps on the left (waiting, running,
 * done); on the right, the fields as they are found, grouped by step, each
 * with its page; one bar for the whole run. Every value comes from the step
 * script (`domain/gcc/s1/extractionRun.ts`); this view only compares the
 * clock with each item's time. At the end it calls `onDone`; "Skip to
 * tender" calls `onSkip`.
 */

const TICK_MS = 80;

type StepState = 'done' | 'running' | 'waiting';
const STATE_WORD: Record<StepState, string> = { done: 'done', running: 'in progress', waiting: 'waiting' };

function stateOf(s: RunStep, ms: number): StepState {
  return ms >= s.start + s.ms ? 'done' : ms >= s.start ? 'running' : 'waiting';
}

/** A counter's value at this moment: it reaches its total as the step ends. */
function countAt(s: RunStep, to: number, ms: number): number {
  const share = Math.min(1, Math.max(0, (ms - s.start) / (s.ms * 0.92)));
  return Math.max(1, Math.round(to * share));
}

export function ExtractionRun({ script, onDone, onSkip }: { script: ExtractionRunScript; onDone(): void; onSkip(): void }) {
  const [ms, setMs] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, []);

  // The clock: wall time from the drop, so a busy tab never slows the story down.
  useEffect(() => {
    const t0 = performance.now();
    let ended = false;
    const id = window.setInterval(() => {
      const e = performance.now() - t0;
      setMs(e);
      if (e >= script.totalMs && !ended) { ended = true; window.clearInterval(id); doneRef.current(); }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [script]);

  const { step, share } = runAt(script, ms);
  const revealed = script.steps.reduce((n, s) => n + s.items.filter((i) => i.at <= ms).length, 0);
  const started = script.steps.filter((s) => ms >= s.start).length;

  // The newest field stays in view.
  useEffect(() => {
    const el = panel.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [revealed, started, reduced]);

  const value = (s: RunStep, it: RunItem): ReactNode => {
    if (it.count) return <span className="xr-n">{`${Math.min(it.count.to, countAt(s, it.count.to, ms))} of ${it.count.to}`}</span>;
    // An Arabic record: the English reading with the Arabic it was read from, as the tender's pages show it.
    if (script.arabic && it.ar) return <BilingualValue en={<bdi dir="auto">{it.value}</bdi>} ar={it.ar} />;
    return it.value;
  };

  const word = (it: RunItem): { text: string; tone?: string } | null => {
    if (it.verdict) { const v = ELIGIBILITY_VERDICT[it.verdict]; return { text: v.label, tone: v.tone }; }
    return it.word ? { text: it.word, tone: it.tone } : null;
  };

  return (
    <div className="xr">
      <div
        className="xr-bar" role="progressbar" aria-label="Extraction progress"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)}
      >
        <span style={{ transform: `scaleX(${share})` }} />
      </div>
      <p className="sr-only" aria-live="polite">{step ? step.label : `Opening ${script.tenderId}`}</p>

      <div className="xr-cols">
        <div className="xr-side">
          <ol className="xr-steps" aria-label="Extraction steps">
            {script.steps.map((s) => {
              const st = stateOf(s, ms);
              const found = s.items.filter((i) => i.at <= ms).length;
              const counter = s.items.find((i) => i.count)?.count;
              const detail = st === 'done' ? s.found
                : st === 'running' ? (s.unit === 'pages' && counter ? `${countAt(s, counter.to, ms)} of ${counter.to}` : s.unit === 'found' ? `${found} found` : '')
                : '';
              return (
                <li key={s.id} className={`xr-step is-${st}`}>
                  <span className="xr-ic" aria-hidden>
                    {st === 'done' ? <Check size={10} strokeWidth={3} /> : st === 'running' ? <span className="xr-spin" /> : null}
                  </span>
                  <span className="xr-sl">{s.label}<span className="sr-only">: {STATE_WORD[st]}</span></span>
                  <span className="xr-sd">{detail}</span>
                </li>
              );
            })}
          </ol>
          <button type="button" className="btn-link xr-skip" onClick={onSkip}>Skip to tender</button>
        </div>

        <div className="xr-fields eq-scroll" ref={panel} aria-label="Fields found">
          {script.steps.filter((s) => s.items.length && ms >= s.start).map((s) => {
            const shown = s.items.filter((i) => i.at <= ms);
            const running = stateOf(s, ms) === 'running';
            return (
              <section key={s.id} className="xr-g">
                <h4 className="xr-gh">
                  <span>{s.label}</span>
                  {s.unit === 'found' && <span className="xr-gc">{running ? `${shown.length} found` : s.found}</span>}
                </h4>
                <ul className="xr-rows">
                  {s.id === 'pages' && (
                    <li className="xr-pages" aria-hidden>
                      {Array.from({ length: s.items[0]?.count?.to ?? 0 }, (_, i) => (
                        <i key={i} className={i < countAt(s, s.items[0].count!.to, ms) ? 'on' : ''} />
                      ))}
                    </li>
                  )}
                  {shown.map((it) => {
                    const w = word(it);
                    const full = it.count ? undefined : it.value;
                    return (
                      <li key={it.key} className={`xr-row${it.label ? '' : ' wide'}`}>
                        {it.label && <span className="xr-k">{it.label}</span>}
                        <span className="xr-v" title={full}>{value(s, it)}</span>
                        <span className={`xr-w${w?.tone ? ` t-${w.tone}` : ''}`}>{w?.text ?? ''}</span>
                        <span className="xr-p num">{it.page ? `p. ${it.page}` : ''}</span>
                      </li>
                    );
                  })}
                  {running && shown.length < s.items.length && <li className="xr-ph" aria-hidden><span /></li>}
                </ul>
              </section>
            );
          })}
          {(!step || step.id === 'open') && <p className="xr-open">Opening {script.tenderName}</p>}
        </div>
      </div>
    </div>
  );
}
