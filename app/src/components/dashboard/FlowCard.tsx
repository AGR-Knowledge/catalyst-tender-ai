import { useId, type CSSProperties } from 'react';
import { ChevronRight } from 'lucide-react';
import type { DrillVM, FlowPartVM, FlowStepVM, FlowZoneVM } from '@/domain/gcc/viewmodels';
import { InfoTip } from './InfoTip';

/**
 * The decision funnel as its own card (dashboards.md §1 Z3, user decision
 * 2026-09-28; plan 027d), and the stage flow strips. One column per step, and
 * every column has the same five rows on one grid, so they line up: the step
 * and what it decides, the headline, a bar split by the column's own
 * outcomes, the other parts, and the note. The bar is not a tapered funnel:
 * each column's bar splits its own counts. Every non-zero number with tenders
 * behind it is a link that filters the table to exactly those tenders. The
 * bar only draws the counts; its words are in the rows.
 */

type Outcome = NonNullable<FlowPartVM['outcome']>;

/** The bar's order: the same in every column. */
const ORDER: Outcome[] = ['on', 'previous', 'stopped', 'held'];

/** The key's words. The decision funnel (PF-5) reads Approved / Rejected / Pending (plan 039); the stage strips keep theirs. */
const WORDS: Record<'funnel' | 'strip', Record<Outcome, string>> = {
  funnel: { on: 'Approved', stopped: 'Rejected', held: 'Pending', previous: 'Previous' },
  strip: { on: 'Went on', stopped: 'Stopped', held: 'Waiting', previous: 'Previous' },
};

/** A non-zero segment is at least this share of the bar, so a single "held" stays visible. */
const MIN_SHARE = 4;

/** Segment widths in percent: proportional to the counts, with small non-zero ones raised to `MIN_SHARE`. */
function shares(counts: number[]): number[] {
  const total = counts.reduce((a, c) => a + c, 0);
  if (!total) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const small = raw.map((w) => w > 0 && w < MIN_SHARE);
  const fixed = small.filter(Boolean).length * MIN_SHARE;
  const rest = raw.reduce((a, w, i) => a + (small[i] ? 0 : w), 0);
  return raw.map((w, i) => (small[i] ? MIN_SHARE : rest ? (w * (100 - fixed)) / rest : 0));
}

const n = (v: number) => v.toLocaleString('en-GB');
const partText = (p: FlowPartVM) => `${n(p.count)} ${p.label}`;
const isGate = (s: FlowStepVM) => /^DG[1-3]$/.test(s.label);

function Part({ step, p, main, onDrill }: { step: FlowStepVM; p: FlowPartVM; main?: boolean; onDrill(d: DrillVM): void }) {
  const body = <><span className="num fc-n">{n(p.count)}</span> <span className="fc-l">{p.label}</span></>;
  const cls = `fc-part ${main ? 'main' : ''}`;
  return p.drill && p.count > 0
    ? <button type="button" className={`${cls} fc-hit`} onClick={() => onDrill(p.drill!)} aria-label={`${step.label}: ${p.count} ${p.label}. Show these tenders`}>{body}</button>
    : <span className={cls}>{body}</span>;
}

function Bar({ parts }: { parts: FlowPartVM[] }) {
  const split = ORDER.flatMap((o) => parts.filter((p) => p.outcome === o));
  const w = shares(split.map((p) => p.count));
  return (
    <div className="fc-bar" aria-hidden>
      {split.map((p, i) => (w[i] > 0 ? <span key={p.key} className={`fc-seg o-${p.outcome}`} style={{ flexGrow: w[i] }} /> : null))}
    </div>
  );
}

function Column({ s, first, onDrill }: { s: FlowStepVM; first: boolean; onDrill(d: DrillVM): void }) {
  const [main, ...rest] = s.parts;
  const others = rest.map(partText).join(' · ');
  return (
    <li className="fc-col">
      {!first && <ChevronRight className="fc-arrow" size={12} strokeWidth={2.2} aria-hidden />}
      <div className="fc-r1" title={s.sub ? `${s.label} · ${s.sub}` : s.label}>
        <span className={`fc-label ${isGate(s) ? 'gate' : ''}`}>{s.label}</span>
        {s.sub && <span className="fc-sub">{s.sub}</span>}
      </div>
      <div className="fc-r2" title={main ? partText(main) : undefined}>
        {main && <Part step={s} p={main} main onDrill={onDrill} />}
      </div>
      <Bar parts={s.parts} />
      <div className="fc-r4" title={others || undefined}>
        {rest.map((p, i) => (
          <span key={p.key} className="fc-other">
            {i > 0 && <span className="fc-dot" aria-hidden>·</span>}
            <Part step={s} p={p} onDrill={onDrill} />
          </span>
        ))}
      </div>
      <div className="fc-note" title={s.note}>{s.note}</div>
    </li>
  );
}

/**
 * The decision funnel's columns share the width by how much their longest row
 * says (plan 039), so "104 approved · 72 rejected · 9 pending" fits beside
 * "42 won" at 1280. The stage strips keep equal columns.
 */
function widths(flow: FlowZoneVM): CSSProperties {
  if (flow.id !== 'PF-5') return {};
  const len = (s: FlowStepVM) => Math.max(s.parts.slice(1).map(partText).join(' · ').length, (s.note ?? '').length, `${s.label} ${s.sub ?? ''}`.length);
  const ws = flow.steps.map((s) => Math.min(2, Math.max(1, len(s) / 22)));
  return { gridTemplateColumns: ws.map((w) => `minmax(118px, ${w.toFixed(2)}fr)`).join(' ') };
}

export function FlowCard({ flow, onDrill }: { flow: FlowZoneVM; onDrill(d: DrillVM): void }) {
  const id = useId();
  const used = new Set(flow.steps.flatMap((s) => s.parts.map((p) => p.outcome)));
  const words = WORDS[flow.id === 'PF-5' ? 'funnel' : 'strip'];
  const key = (['on', 'stopped', 'held', 'previous'] as Outcome[]).filter((o) => used.has(o)).map((o) => ({ o, word: words[o] }));
  return (
    <section className="card fc" aria-labelledby={id}>
      <header className="fc-head">
        <h3 className="fc-title" id={id}>
          {flow.label}
          {/* The period is the page's filter; the ⓘ repeats it. */}
          {!flow.missing && <InfoTip info={flow.info} />}
        </h3>
        {key.length > 0 && !flow.missing && (
          <ul className="fc-key" aria-hidden>
            {key.map(({ o, word }) => <li key={o}><i className={`fc-sw o-${o}`} />{word}</li>)}
          </ul>
        )}
      </header>
      {/* Not registered yet: the title already reads "Not available yet" (dev builds name the id). */}
      {flow.missing ? null : flow.steps.length === 0 ? (
        <p className="fc-miss">Nothing moved in this period.</p>
      ) : (
        <div className="fc-scroll">
          {/* Six or more columns (the funnel, Stage 2) set rows 4 and 5 a half-point smaller, so they still fit at 1280. */}
          <ol className={`fc-cols ${flow.steps.length >= 6 ? 'dense' : ''}`} style={{ '--fc-n': flow.steps.length, ...widths(flow) } as CSSProperties}>
            {flow.steps.map((s, i) => <Column key={s.key} s={s} first={i === 0} onDrill={onDrill} />)}
          </ol>
        </div>
      )}
    </section>
  );
}
