import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { clarificationWrite, clarificationsFor } from '@/domain/gcc/s2';
import { Card } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { When } from '@/components/tender/When';
import { PanelHead, Tag, Why, byLine, refusal } from './ui';
import type { DeskCtx } from './vm/desk';

/**
 * The supplier clarification log (spec §8.8): question, package, raised by,
 * owner, due, answer and status. The exit rule is zero stale beyond the SLA.
 * Commercial questions go to a person; technical ones get an agent draft from
 * the tender documents, which the owner approves.
 */
export function ClarificationsPanel({ desk }: { desk: DeskCtx }) {
  const { tenant, tenderId, done } = desk;
  const list = useMemo(() => clarificationsFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const open = list.filter((c) => c.state === 'open');
  const stale = open.filter((c) => c.stale);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const noAnswer = refusal(desk, 'rfq.send');

  return (
    <Card>
      <PanelHead title="Supplier clarifications" sub={`${open.length} open · ${stale.length} stale beyond the SLA. The exit rule is 0 stale.`}>
        {stale.length === 0 ? <Tag tone="green"><Check size={11} aria-hidden /> 0 stale</Tag> : <Tag tone="red">{stale.length} stale</Tag>}
      </PanelHead>
      {list.length === 0 ? (
        <EmptyState title="No supplier questions on this tender yet." body="Questions suppliers ask through their RFQ appear here, with an owner and a due time." compact />
      ) : (
        <ul className="s2-clars">
          {list.map((c) => {
            const text = draft[c.id] ?? '';
            const why = noAnswer ?? (text.trim() ? null : 'Write the answer first.');
            return (
              <li key={c.id} className={`s2-clar ${c.stale ? 'stale' : ''}`}>
                <div className="s2-clar-top">
                  <span className="mono s2-pid">{c.packageId}</span>
                  <b>{c.supplierName}</b>
                  <span className="s2-muted">raised <When date={c.raisedAt.slice(0, 10)} time={c.raisedAt.slice(11, 16)} short /></span>
                  <span className="s2-grow" />
                  {c.state === 'answered' ? <Tag tone="green">Answered</Tag> : c.stale ? <Tag tone="red">Stale: due {c.due.slice(11, 16)} <When date={c.due.slice(0, 10)} short /></Tag> : <Tag tone="orange">Open</Tag>}
                </div>
                <p className="s2-clar-q">{c.question}</p>
                <p className="s2-muted">Owner {c.ownerName} · due <When date={c.due.slice(0, 10)} time={c.due.slice(11, 16)} short /> · {c.route}</p>
                {c.answer ? (
                  <p className="s2-clar-a"><b>Answer</b> ({byLine(c.answer.byId, c.answer.at)}): {c.answer.text}</p>
                ) : (
                  <div className="s2-reason">
                    <label className="s2-label" htmlFor={`clar-${c.id}`}>{c.commercial ? 'Your answer (a commercial question: a person answers)' : 'Your answer'}</label>
                    <textarea id={`clar-${c.id}`} rows={2} value={text} onChange={(e) => setDraft({ ...draft, [c.id]: e.target.value })} disabled={!!noAnswer} />
                    <div className="s2-actbar s2-actbar-l">
                      <button type="button" className="btn btn-sm" disabled={!!why} onClick={() => {
                        if (desk.apply(clarificationWrite(c.id, text, desk.viewer.id, desk.nextAt()), `Answer sent to ${c.supplierName}. Recorded in the audit trail`)) setDraft({ ...draft, [c.id]: '' });
                      }}>Send answer</button>
                      <Why reason={why} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
