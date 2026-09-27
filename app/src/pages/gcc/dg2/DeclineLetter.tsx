import { useEffect, useState } from 'react';
import { Check, Mail } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { personById } from '@/data/people';
import { useDemo } from '@/state/store';
import { stampText } from '@/domain/gcc/s3';
import { declineLetter, letterWrite, LETTER_DRAFT_LABEL, type LetterValue } from '@/domain/gcc/dg2';
import './dg2.css';

/**
 * The courteous decline letter a No-Bid drafts (spec §10): the Bid Manager
 * reviews it, saves changes and marks it sent. Nothing leaves the app.
 */
export function DeclineLetter({ tenant, tenderId, round, letter, check, holds }: {
  tenant: string;
  tenderId: string;
  round: number;
  letter: LetterValue;
  /** The Bid Manager reviews and sends. */
  check: CanResult;
  holds: boolean;
}) {
  const { state, mark, logAudit, nextAt } = useDemo();
  const { person } = state;
  const [text, setText] = useState(letter.text);
  useEffect(() => setText(letter.text), [letter.text]);
  const draft = declineLetter(tenant, tenderId, person.id);
  const edited = text.trim() !== letter.text.trim();

  const write = (sent: boolean) => {
    const w = letterWrite(tenderId, round, text, sent, person.id, nextAt());
    mark(w.key, sent ? 'Decline letter marked sent. In the demo nothing leaves the app.' : 'Decline letter saved.', 'green', w.value);
    logAudit(w.audit);
  };

  return (
    <section className="dg2-card" aria-labelledby={`letter-${tenderId}`}>
      <header className="dg2-card-h">
        <h3 id={`letter-${tenderId}`}><Mail size={14} aria-hidden /> Decline letter to the employer</h3>
        <span className="dg2-card-m">{letter.sent ? `Marked sent ${stampText(letter.at)} by ${personById(letter.byId)?.name ?? ''}` : LETTER_DRAFT_LABEL}</span>
      </header>
      {draft && <p className="dg2-subject"><span className="pk-dim">Subject:</span> {draft.subject}</p>}
      {letter.sent || !check.ok ? (
        <pre className="dg2-letter">{letter.text}</pre>
      ) : (
        <>
          <label className="sr-only" htmlFor={`letter-text-${tenderId}`}>Letter text</label>
          <textarea id={`letter-text-${tenderId}`} className="pk-textarea dg2-letter-in" rows={12} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="pk-acts">
            <button type="button" className="btn btn-sm" onClick={() => write(false)} disabled={!edited}>Save changes</button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => write(true)}><Check size={12} aria-hidden />Mark as sent</button>
            <span className="pk-why">The demo sends nothing: marking it sent records who and when.</span>
          </div>
        </>
      )}
      {!letter.sent && holds && !check.ok && <p className="dg2-why">{check.reason}.</p>}
    </section>
  );
}
