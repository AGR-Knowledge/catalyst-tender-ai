import { ChevronRight } from 'lucide-react';
import type { DrillVM, FlowZoneVM } from '@/domain/gcc/viewmodels';
import { InfoTip } from './InfoTip';

/**
 * The flow strip (dashboards.md §1 Z3): the role's funnel for the period.
 * Every number is a link that filters the table to exactly those tenders.
 */
export function FlowStrip({ flow, onDrill }: { flow: FlowZoneVM; onDrill(d: DrillVM): void }) {
  return (
    <section className="card fs" aria-label={flow.label}>
      <header className="card-head">
        <h3 className="card-title fs-title">{flow.label}{!flow.missing && <InfoTip info={flow.info} />}</h3>
        {!flow.missing && flow.info.period && <span className="card-meta">{flow.info.period.split(' · ')[0]}</span>}
      </header>
      {flow.missing ? (
        <div className="fs-miss">{flow.label}</div>
      ) : flow.steps.length === 0 ? (
        <div className="fs-miss">Nothing moved in this period.</div>
      ) : (
        <ol className="fs-steps">
          {flow.steps.map((s, i) => (
            <li key={s.key} className="fs-step">
              {i > 0 && <ChevronRight className="fs-arrow" size={14} aria-hidden />}
              <div className="fs-box">
                <div className="fs-label">{s.label}</div>
                <div className="fs-parts">
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
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
