/// <reference types="vite/client" />
import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { ActionDue, ActionVM, ActionsZoneVM } from '@/domain/gcc/viewmodels';
import { useDemo } from '@/state/store';
import { DEMO_TIME } from '@/domain/calendar';
import { SlaClock } from '@/components/tender/SlaClock';
import { When } from '@/components/tender/When';
import { EmptyState } from '@/components/tender/EmptyState';
import { notDefinedText } from '@/domain/gcc/dashboards/build';

/**
 * Needs your action (dashboards.md §1 Z4, §4): always now, most urgent first,
 * five rows and then "Show all". Each row has one primary button: it opens the
 * exact screen, or does the action in place. An in-place action writes through
 * `mark()` (so it survives a reload and Reset clears it), adds an audit entry
 * and says what happened in a toast; the row then shows its done label until
 * the page is reloaded.
 */

const VISIBLE = 5;

function Due({ due }: { due?: ActionDue }) {
  if (!due) return null;
  if (due.kind === 'sla') return <SlaClock start={due.start} end={due.end} />;
  if (due.kind === 'date') return <When date={due.date} time={due.time} short />;
  return <span className={`ac-due-t ${due.tone ? `t-${due.tone}` : ''}`}>{due.text}</span>;
}

interface Acted { row: ActionVM; auditIndex: number }

export function ActionList({ zone, onRoute }: { zone: ActionsZoneVM; onRoute(to: string): void }) {
  const { mark, logAudit, toast, state } = useDemo();
  const [all, setAll] = useState(false);
  const [acted, setActed] = useState<Record<string, Acted>>({});

  // Rows done in place stay where they were until reload, even though their source no longer lists them.
  const rows = useMemo(() => {
    const live = zone.rows.filter((r) => !acted[r.id]);
    const kept = Object.values(acted).map((a) => a.row);
    return [...live, ...kept].sort((a, b) => a.urgency - b.urgency);
  }, [zone.rows, acted]);

  const shown = all ? rows : rows.slice(0, VISIBLE);

  const doneText = (a: Acted) => {
    const p = a.row.primary;
    if (p.kind !== 'inplace') return '';
    const at = state.audit[a.auditIndex]?.at ?? state.audit[state.audit.length - 1]?.at;
    return p.doneLabel.replace('{time}', at ? at.slice(11, 16) : DEMO_TIME);
  };

  const act = (row: ActionVM) => {
    const p = row.primary;
    if (p.kind === 'route') { onRoute(p.to); return; }
    setActed((s) => ({ ...s, [row.id]: { row, auditIndex: state.audit.length } }));
    mark(p.markKey, undefined, undefined, p.markValue ?? 'yes');
    logAudit({ actorId: state.person.id, action: p.audit.action, target: p.audit.target ?? row.tenderId, detail: p.audit.detail });
    toast(p.toast, 'green');
  };

  return (
    <section className="card al" aria-label={zone.title}>
      <header className="card-head">
        <h3 className="card-title">{zone.title}</h3>
        <span className="card-meta num">{rows.length ? `${rows.length} ${rows.length === 1 ? 'item' : 'items'}` : ''}</span>
      </header>
      {rows.length === 0 ? (
        <EmptyState title="Nothing needs you right now." body={zone.nextText} compact />
      ) : (
        <ol className="al-rows">
          {shown.map((row) => {
            const done = acted[row.id];
            return (
              <li key={row.id} className={`al-row ${done ? 'done' : ''}`}>
                <span className={`ac-type ${row.typeTone ? `tone-${row.typeTone}` : ''}`}>{row.type}</span>
                <div className="al-main">
                  <div className="al-t">
                    {row.tenderId && <span className="mono al-tid">{row.tenderId}</span>}
                    {row.shortTitle && <span className="al-title">{row.shortTitle}</span>}
                  </div>
                  <div className="al-what">{row.what}</div>
                  <div className="al-meta">
                    <Due due={row.due} />
                    {row.waitingOn && <span className="al-wait">Waiting on {row.waitingOn.name}, {row.waitingOn.role}</span>}
                  </div>
                </div>
                <div className="al-act">
                  {done ? (
                    <span className="al-done t-green"><Check size={13} aria-hidden />{doneText(done)}</span>
                  ) : (
                    <>
                      <button
                        type="button" className="btn btn-sm btn-invert" disabled={!!row.disabledReason} onClick={() => act(row)}
                        aria-describedby={row.disabledReason ? `why-${row.id}` : undefined}
                      >{row.primary.label}</button>
                      {row.disabledReason && <span className="al-why" id={`why-${row.id}`}>{row.disabledReason}</span>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {rows.length > VISIBLE && (
        <footer className="card-foot al-foot">
          <button type="button" className="btn-link" onClick={() => setAll(!all)} aria-expanded={all}>
            {all ? 'Show fewer' : `Show all (${rows.length})`}
          </button>
        </footer>
      )}
      {import.meta.env.DEV && zone.missing.length > 0 && (
        <footer className="card-foot al-dev">{zone.missing.map(notDefinedText).join(' · ')}</footer>
      )}
    </section>
  );
}
