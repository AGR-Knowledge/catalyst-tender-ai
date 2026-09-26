import { useEffect, useMemo, useState } from 'react';
import { Send, Check } from 'lucide-react';
import type { Tone } from '@/data/types';
import { personById } from '@/data/people';
import { queriesFor as queryDraftsFor, queryAction, type QueryVM } from '@/domain/gcc/s1/queries';
import { shortWhen } from '@/domain/gcc/s1/common';
import { StatusPill } from '@/components/tender/StatusPill';
import { SourceChip } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import { Callout } from '@/components/tender/Callout';
import type { S1 } from '../vm/useS1';

/**
 * Queries to the employer (spec §6.10): the agent's drafts, each citing its
 * clause and page; the Bid Manager edits, approves and "sends" them (demo:
 * marked sent via the portal; nothing leaves the app), before the questions
 * deadline, whose countdown shows on top.
 */

const STATE: Record<QueryVM['state'], { label: string; tone: Tone; icon: string }> = {
  draft: { label: 'Draft', tone: 'orange', icon: '•' },
  approved: { label: 'Approved', tone: 'cyan', icon: '✓' },
  sent: { label: 'Sent via the portal (demo)', tone: 'green', icon: '✓' },
};
const FROM: Record<QueryVM['query']['source'], string> = { extraction: 'the extraction', eligibility: 'the eligibility check', validation: 'the intake queue' };

function QueryCard({ q, s1, tenderId, doc }: { q: QueryVM; s1: S1; tenderId: string; doc: SourceDoc | null }) {
  const [text, setText] = useState(q.text);
  useEffect(() => setText(q.text), [q.text]);
  const right = s1.check('query.approve', tenderId);
  const s = STATE[q.state];
  const by = q.byId ? personById(q.byId)?.name ?? q.byId : null;
  const whyId = `qy-why-${q.query.id}`;

  const approve = () => {
    const w = queryAction(q.query, 'approve', text.trim(), s1.viewer.id, s1.nextAt());
    s1.write(tenderId, [w], [w.audit], { msg: `Query approved: ${q.query.topic}. Mark it sent once it is on the portal.` });
  };
  const send = () => {
    const w = queryAction(q.query, 'send', q.text, s1.viewer.id, s1.nextAt());
    s1.write(tenderId, [w], [w.audit], { msg: `Marked sent via the portal (demo): ${q.query.topic}. Nothing leaves the app.` });
  };

  return (
    <article className={`qy s-${q.state}`} aria-label={`${q.query.topic}: ${s.label}`}>
      <header className="qy-head">
        <span className="qy-topic">{q.query.topic}</span>
        <span className="qy-clause">{q.query.clause}</span>
        <SourceChip source={{ kind: 'page', page: q.query.page, label: `p. ${q.query.page}` }} doc={doc} />
        {q.query.alsoPage && <SourceChip source={{ kind: 'page', page: q.query.alsoPage, label: `p. ${q.query.alsoPage}` }} doc={doc} />}
        <StatusPill label={s.label} tone={s.tone} icon={s.icon} />
      </header>
      <p className="qy-from">Drafted by the Intake &amp; Extraction agent from {FROM[q.query.source]}{q.edited ? '; edited before approval' : ''}.</p>
      {q.state === 'draft' && right.ok
        ? (
          <label className="qy-edit">
            <span className="sr-only">Query text</span>
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        )
        : <blockquote className="qy-text">{q.text}</blockquote>}
      <div className="qy-foot">
        {q.state === 'draft' && (
          <button type="button" className="btn btn-sm btn-primary" onClick={approve} disabled={!right.ok || !text.trim()} aria-describedby={right.ok ? undefined : whyId}>
            <Check size={12} aria-hidden />Approve
          </button>
        )}
        {q.state === 'approved' && (
          <button type="button" className="btn btn-sm btn-primary" onClick={send} disabled={!right.ok} aria-describedby={right.ok ? undefined : whyId}>
            <Send size={12} aria-hidden />Mark sent via the portal
          </button>
        )}
        {!right.ok && q.state !== 'sent' && <span className="s1-why" id={whyId}>{right.reason}</span>}
        {by && q.at && <span className="qy-who">{q.state === 'sent' ? 'Marked sent' : 'Approved'} by {by}, {shortWhen(q.at)}{q.state === 'sent' ? '. Nothing leaves the app.' : ''}</span>}
      </div>
    </article>
  );
}

export function QueryList({ s1, tenderId, doc }: { s1: S1; tenderId: string; doc: SourceDoc | null }) {
  const vm = useMemo(() => queryDraftsFor(s1.tenant, tenderId, s1.done), [s1.tenant, tenderId, s1.done]);
  if (!vm.items.length) return null;
  const { draft, approved, sent } = vm.counts;
  return (
    <div className="qyl">
      {vm.deadline && (
        <Callout variant={vm.deadline.past ? 'verdict' : 'route'} word={vm.deadline.past ? 'Closed' : 'Deadline'} title={vm.deadline.text} compact>
          {draft} draft{draft === 1 ? '' : 's'} · {approved} approved · {sent} sent.{!vm.deadline.past && ' A query not sent by then leaves the bid priced on an ambiguous basis.'}
        </Callout>
      )}
      {vm.items.map((q) => <QueryCard key={q.query.id} q={q} s1={s1} tenderId={tenderId} doc={doc} />)}
    </div>
  );
}
