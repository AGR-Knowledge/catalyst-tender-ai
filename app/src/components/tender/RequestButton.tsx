import { Check, Send } from 'lucide-react';
import type { Person } from '@/data/people';
import { useDemo } from '@/state/store';
import { addHours, DEMO_NOW } from '@/domain/gcc/clock';
import { requestFor, requestWrite } from '@/domain/gcc/requestKeys';
import { whenLabel } from './When';
import './tender.css';

/**
 * Replaces toast-only nudges (spec §5.5, ui-direction §6.2): a request to a
 * named person with a due date, which lands in their My requests (plan 013).
 * It writes only through `domain/gcc/requestKeys.ts`, so the two agree; the
 * write goes through `mark()`, survives a reload and Reset clears it. Once
 * made, the button says when and is disabled. View as is read only.
 */

/** "Tue 10 Mar" from `YYYY-MM-DDTHH:MM`. */
const dueDay = (due: string) => whenLabel(due.slice(0, 10), undefined, undefined, true);

export function RequestButton({ tenderId, to, topic, what, section, due, label, disabledReason, size = 'sm' }: {
  tenderId: string;
  to: Person;
  /** Short key for what is asked, unique per tender and person: 'bond-headroom'. */
  topic: string;
  /** In one line: "Confirm bond headroom for the Bid / No-Bid pack". */
  what: string;
  /** Where the answer goes: "Bid pack · 9.5 Financial exposure". */
  section?: string;
  /** `YYYY-MM-DDTHH:MM`, tenant local, worked out by the caller on the tenant calendar. */
  due: string;
  /** Button text; "Request {name}" by default. */
  label?: string;
  /** The caller's `can()` refusal, in words. */
  disabledReason?: string;
  size?: 'sm' | 'md';
}) {
  const { state, mark, logAudit } = useDemo();
  const made = requestFor(state.done, tenderId, to.id, topic);
  const readOnly = state.viewAs ? 'View as is read only.' : undefined;
  const why = readOnly ?? disabledReason;
  const cls = `btn ${size === 'sm' ? 'btn-sm' : ''} req-btn`;

  if (made) {
    return (
      <span className="req-done" role="status">
        <button type="button" className={`${cls} done`} disabled>
          <Check size={12} aria-hidden />Requested {made.at.slice(11, 16)}
        </button>
        <span className="req-meta">due {dueDay(made.due)} · {to.name}</span>
      </span>
    );
  }

  const send = () => {
    // The audit trail runs on the demo clock, a minute after its last entry; the request carries the same time.
    const last = state.audit[state.audit.length - 1];
    const at = last ? addHours(last.at, 1 / 60) : DEMO_NOW;
    const w = requestWrite(tenderId, to.id, topic, { what, ...(section ? { section } : {}), due, at, byId: state.person.id });
    mark(w.key, `Request sent to ${to.name}, due ${dueDay(due)}.`, 'green', w.value);
    logAudit({ actorId: state.person.id, action: 'Request sent', target: tenderId, detail: `To ${to.name} (${to.title}): ${what}. Due ${dueDay(due)}` });
  };

  const whyId = `req-why-${tenderId}-${to.id}-${topic}`.replace(/[^a-zA-Z0-9-]/g, '-');
  return (
    <span className="req-wrap">
      <button type="button" className={cls} onClick={send} disabled={!!why} aria-describedby={why ? whyId : undefined}>
        <Send size={12} aria-hidden />{label ?? `Request ${to.name}`}
      </button>
      {why && <span className="req-why" id={whyId}>{why}</span>}
    </span>
  );
}
