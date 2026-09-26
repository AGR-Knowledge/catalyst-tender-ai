import { ChevronRight } from 'lucide-react';
import type { DrillVM, FlowZoneVM } from '@/domain/gcc/viewmodels';
import { InfoTip } from './InfoTip';

/**
 * The flow line (dashboards.md §1 Z3, user decision 2026-09-26): the role's
 * funnel for the period on one thin line under the tiles, not a card.
 * "Decision funnel ⓘ  Captured 176 notices › DG1 4 pursued · 7 discarded …".
 * Every number is a link that filters the table to exactly those tenders.
 */
export function FlowStrip({ flow, onDrill }: { flow: FlowZoneVM; onDrill(d: DrillVM): void }) {
  return (
    <section className="fs" aria-label={flow.label}>
      <h3 className="fs-title">
        {flow.label}
        {/* The period is the page's filter; the ⓘ repeats it. */}
        {!flow.missing && <InfoTip info={flow.info} />}
      </h3>
      {/* Not registered yet: the title already reads "Not available yet" (dev builds name the id). */}
      {flow.missing ? null : flow.steps.length === 0 ? (
        <span className="fs-miss">Nothing moved in this period.</span>
      ) : (
        <ol className="fs-steps">
          {flow.steps.map((s, i) => (
            <li key={s.key} className="fs-step">
              {i > 0 && <ChevronRight className="fs-arrow" size={13} aria-hidden />}
              <span className="fs-label">{s.label}</span>
              {s.parts.map((p, j) => {
                const text = <><span className={`num fs-n ${p.tone ? `t-${p.tone}` : ''}`}>{p.count.toLocaleString('en-GB')}</span> <span className="fs-l">{p.label}</span></>;
                return (
                  <span key={p.key} className="fs-part">
                    {j > 0 && <span className="fs-dot" aria-hidden>·</span>}
                    {p.drill
                      ? <button type="button" className="fs-link" onClick={() => onDrill(p.drill!)} aria-label={`${s.label}: ${p.count} ${p.label}. Show these tenders`}>{text}</button>
                      : <span className="fs-static">{text}</span>}
                  </span>
                );
              })}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
