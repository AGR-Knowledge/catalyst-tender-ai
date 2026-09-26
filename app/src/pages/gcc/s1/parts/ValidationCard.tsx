import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import type { Tone } from '@/data/types';
import { personById } from '@/data/people';
import { validationAction, type QueueItem, type ValAction } from '@/domain/gcc/s1';
import { queriesFor as queryDraftsFor } from '@/domain/gcc/s1/queries';
import { shortWhen } from '@/domain/gcc/s1/common';
import type { TenderRecord } from '@/domain/gcc/documents';
import { StatusPill } from '@/components/tender/StatusPill';
import { SourceChip } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { Callout } from '@/components/tender/Callout';
import type { S1 } from '../vm/useS1';
import { snippetAt } from '../vm/docs';

/**
 * One field the agent would not accept alone (spec §6.3): the value, how sure
 * the agent is and why not, the page, and Accept · Correct · Mark not stated ·
 * Send back to agent. A conflict shows both values with their pages and the
 * agent does not choose: a person picks one, and the other stays on record.
 * Sending back keeps the item open (the legacy bug closed it).
 */

const STATE: Record<string, { label: string; tone: Tone; icon: string }> = {
  conflict: { label: 'Conflict', tone: 'orange', icon: '!' },
  open: { label: 'Needs check', tone: 'orange', icon: '!' },
  'sent-back': { label: 'Sent back', tone: 'orange', icon: '↺' },
  accept: { label: 'Accepted', tone: 'green', icon: '✓' },
  pick: { label: 'Accepted', tone: 'green', icon: '✓' },
  correct: { label: 'Corrected', tone: 'green', icon: '✓' },
  'not-stated': { label: 'Not stated', tone: 'grey', icon: '–' },
};

const stateOf = (q: QueueItem) => (q.state === 'resolved' ? q.resolution!.action : q.state === 'sent-back' ? 'sent-back' : q.conflict ? 'conflict' : 'open');

export function ValidationCard({ q, s1, doc, record, showTender = false }: { q: QueueItem; s1: S1; doc: SourceDoc | null; record: TenderRecord | null; showTender?: boolean }) {
  const { item } = q;
  const [mode, setMode] = useState<null | 'correct' | 'send-back'>(null);
  const [text, setText] = useState('');
  const right = s1.check('field.validate', item.tenderId);
  const st = STATE[stateOf(q)];
  const resolved = q.state === 'resolved';

  const act = (action: ValAction, input: { value?: string; pick?: 'value' | 'alt'; hint?: string } = {}) => {
    const w = validationAction(item, action, { ...input, at: s1.nextAt() }, s1.viewer.id);
    const msg = action === 'pick'
      ? `${item.field} set to ${input.pick === 'alt' ? item.alt!.value : item.value}. The other value is kept on record.`
      : action === 'send-back' ? `${item.field} sent back to the agent. It stays in the queue.`
      : action === 'correct' ? `${item.field} corrected. The extracted value is kept on record.`
      : action === 'not-stated' ? `${item.field} marked not stated.` : `${item.field} accepted.`;
    s1.write(item.tenderId, [w], [w.audit], { msg, tone: action === 'send-back' ? 'ink3' : 'green' });
    setMode(null);
    setText('');
  };

  // The two readings of a conflict, in page order.
  const options = item.alt
    ? [{ key: 'value' as const, value: item.value, page: item.page }, { key: 'alt' as const, value: item.alt.value, page: item.alt.page }].sort((a, b) => a.page - b.page)
    : [];
  const by = q.resolution ? personById(q.resolution.byId)?.name ?? q.resolution.byId : null;
  const query = queryDraftsFor(s1.tenant, item.tenderId, s1.done).items.find((x) => x.query.relatesTo === item.id);
  const disabled = !right.ok;
  const whyId = `vq-why-${item.id}`;

  return (
    <article className={`vq ${q.conflict ? 'conflict' : ''} ${resolved ? 'resolved' : ''}`} aria-label={`${item.field}: ${st.label}`}>
      <header className="vq-head">
        <span className="vq-field">{item.field}</span>
        {showTender && <span className="mono vq-tid">{item.tenderId}</span>}
        {item.blocksDg1 && !resolved && <span className="vq-block">Blocks DG1</span>}
        <StatusPill label={st.label} tone={st.tone} icon={st.icon} />
        <span className="vq-age">{resolved && q.resolution ? `${by}, ${shortWhen(q.resolution.at)}` : `raised ${q.ageText} ago`}</span>
      </header>

      {!resolved && (
        <p className="vq-why">
          <span className="num">Confidence {Math.round(item.confidence * 100)}%</span> · {item.reason}
        </p>
      )}

      {q.conflict && !resolved ? (
        <>
          <div className="vq-pair" role="group" aria-label="The two values found">
            {options.map((o, i) => {
              const snip = snippetAt(record, o.page, o.value);
              return (
                <div key={o.key} className="vq-opt">
                  <div className="vq-opt-top">
                    <span className="vq-v num">{o.value}</span>
                    <SourceChip source={{ kind: 'page', page: o.page, label: `p. ${o.page}`, terms: [o.value] }} doc={doc} />
                  </div>
                  {snip && <blockquote className="vq-snip">{snip}</blockquote>}
                  <button type="button" className="btn btn-sm" disabled={disabled} aria-describedby={disabled ? whyId : undefined} onClick={() => act('pick', { pick: o.key })} data-first={i === 0 || undefined}>
                    Use {o.value}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="vq-rule">The agent found two values and will not choose between them. A person decides; the other value is kept on record.</p>
        </>
      ) : !resolved ? (
        <div className="vq-val">
          <span className="vq-v num">{item.value}</span>
          <SourceChip source={{ kind: 'page', page: item.page, label: `p. ${item.page}`, terms: [item.value] }} doc={doc} />
          {snippetAt(record, item.page, item.value) && <blockquote className="vq-snip">{snippetAt(record, item.page, item.value)}</blockquote>}
        </div>
      ) : (
        <div className="vq-done">
          <span>Stands at <b className="num">{q.resolvedValue}</b>{q.resolution?.action === 'correct' ? `, corrected from ${item.value}` : ''}.</span>
          {q.conflict && q.resolution?.action === 'pick' && (
            <span className="vq-kept">{q.resolution.pick === 'alt' ? `${item.value} (p. ${item.page})` : `${item.alt!.value} (p. ${item.alt!.page})`} kept on record.</span>
          )}
        </div>
      )}

      {q.state === 'sent-back' && <Callout variant="route" word="Sent back" title="Still open" compact>{q.sentBackText}{q.resolution?.hint ? ` Hint: “${q.resolution.hint}”.` : ''}</Callout>}

      {!resolved && mode === 'correct' && (
        <form className="vq-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) act('correct', { value: text.trim() }); }}>
          <label className="vq-in"><span>Correct value</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={item.value} /></label>
          <button type="submit" className="btn btn-sm btn-primary" disabled={!text.trim()}>Save correction</button>
          <button type="button" className="btn btn-sm" onClick={() => setMode(null)}>Cancel</button>
          <span className="vq-note">The extracted value {item.value} is kept on record.</span>
        </form>
      )}
      {!resolved && mode === 'send-back' && (
        <form className="vq-form" onSubmit={(e) => { e.preventDefault(); act('send-back', { hint: text.trim() || undefined }); }}>
          <label className="vq-in"><span>Hint for the agent (optional)</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. the special conditions prevail" /></label>
          <button type="submit" className="btn btn-sm btn-primary">Send back</button>
          <button type="button" className="btn btn-sm" onClick={() => setMode(null)}>Cancel</button>
          <span className="vq-note">The item stays in the queue until a person decides.</span>
        </form>
      )}

      {!resolved && !mode && (
        <div className="vq-acts">
          {!q.conflict && <button type="button" className="btn btn-sm btn-primary" disabled={disabled} aria-describedby={disabled ? whyId : undefined} onClick={() => act('accept')}>Accept</button>}
          <button type="button" className="btn btn-sm" disabled={disabled} aria-describedby={disabled ? whyId : undefined} onClick={() => { setMode('correct'); setText(''); }}>Correct</button>
          <button type="button" className="btn btn-sm" disabled={disabled} aria-describedby={disabled ? whyId : undefined} onClick={() => act('not-stated')}>Mark not stated</button>
          <button type="button" className="btn btn-sm" disabled={disabled} aria-describedby={disabled ? whyId : undefined} onClick={() => { setMode('send-back'); setText(''); }}>Send back to agent</button>
          {disabled && <span className="s1-why" id={whyId}>{right.reason}</span>}
        </div>
      )}

      {query && (
        <div className="vq-query">
          <MessageSquareText size={13} aria-hidden />
          <span>Query {query.state === 'draft' ? 'drafted' : query.state === 'approved' ? 'approved' : 'sent'} for the employer: {query.query.topic} ({query.query.clause}).</span>
          <Link to={`/tenders/${item.tenderId}?tab=queries`}>Review in Queries</Link>
        </div>
      )}
    </article>
  );
}
