import { Check, Circle, Minus } from 'lucide-react';
import type { GccTender } from '@/data/gcc/types';
import type { Pipeline } from '@/domain/gcc/s1';
import { money } from '@/domain/money';
import { shortWhen } from '@/domain/gcc/s1/common';
import { StatusPill } from '@/components/tender/StatusPill';

/**
 * One document's intake, step by step (spec §6.2): received → classified →
 * sensitivity → language → OCR (scanned only) → fields → register check →
 * screened → logged, each with its time, then intake-to-logged against the
 * 15-minute target. Before the steps, the notice and the booklet purchase:
 * a person approves and pays; the platform never does. Agent timings are
 * simulated, and the list says so.
 */

const ICON = { done: Check, skipped: Minus, waiting: Circle } as const;

export function IntakeSteps({ pipeline, tender, compact = false }: { pipeline: Pipeline; tender?: GccTender; compact?: boolean }) {
  const fee = tender?.documentFee;
  const bought = tender?.intake.purchasedAt;
  return (
    <div className={`isteps ${compact ? 'compact' : ''}`}>
      {tender && (fee || tender.intake.capturedAt !== tender.intake.loggedAt) && (
        <ul className="isteps-pre">
          <li><span className="isteps-t num">{shortWhen(tender.intake.capturedAt)}</span> Notice captured from {tender.sourceDetail}</li>
          {fee && (bought
            ? <li><span className="isteps-t num">{shortWhen(bought)}</span> Booklet bought ({money(fee.amount, fee.ccy, { full: true })}). A person approved and paid; the platform never pays.</li>
            : <li className="t-orange"><span className="isteps-t">Not yet</span> Booklet to buy ({money(fee.amount, fee.ccy, { full: true })}). A person approves and pays; the platform never pays.</li>)}
        </ul>
      )}
      <ol className="isteps-list" aria-label="Intake steps">
        {pipeline.steps.map((s) => {
          const Icon = ICON[s.state];
          return (
            <li key={s.key} className={`is-${s.state}`}>
              <span className="isteps-ic" aria-hidden><Icon size={11} strokeWidth={2.4} /></span>
              <span className="isteps-n num" aria-hidden>{s.no}</span>
              <span className="isteps-l">
                {s.label}
                <span className="sr-only">: {s.state === 'done' ? 'done' : s.state === 'skipped' ? 'not needed' : 'waiting'}</span>
              </span>
              <span className="isteps-t num">{s.time ?? (s.state === 'skipped' ? '' : '–')}</span>
              {s.detail && <span className="isteps-d">{s.detail}</span>}
            </li>
          );
        })}
      </ol>
      <div className="isteps-foot">
        {pipeline.stopped
          ? <StatusPill label={`Stopped: ${pipeline.stopped}`} tone="orange" icon="!" />
          : pipeline.loggedText && (
            <StatusPill label={`${pipeline.loggedText} · target ${pipeline.targetMin} min`} tone={pipeline.withinTarget ? 'green' : 'red'} icon={pipeline.withinTarget ? '✓' : '!'} />
          )}
        <span className="isteps-note">Agent timings are simulated in the demo.</span>
      </div>
    </div>
  );
}
