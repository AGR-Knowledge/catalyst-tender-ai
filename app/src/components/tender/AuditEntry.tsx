import type { ReactNode } from 'react';
import { Sparkles, Workflow } from 'lucide-react';
import type { Tone } from '@/data/types';
import { initialsOf } from '@/data/people';
import { whenLabel } from './When';
import './tender.css';

/**
 * One audit line (spec §5.8, ui-direction §6.2): who (name and role), when,
 * what, before → after when there is one, and a detail line. Used by the
 * Decisions & audit tab and, later, the admin audit log (plan 010).
 */

export interface AuditEntryProps {
  actor: { name: string; role?: string | null };
  /** `YYYY-MM-DDTHH:MM`, or a date. */
  at: string;
  action: ReactNode;
  before?: string;
  after?: string;
  detail?: ReactNode;
  /** A chip after the action: the decision, "Override", "Demo". */
  chip?: ReactNode;
  tone?: Tone;
  /** Only the time: the timeline already groups entries by day. */
  timeOnly?: boolean;
  /** An entry made by the platform or an agent rather than a person. */
  system?: boolean;
}

export function AuditEntry({ actor, at, action, before, after, detail, chip, tone, timeOnly = false, system = false }: AuditEntryProps) {
  const time = at.length > 10 ? at.slice(11, 16) : '';
  const when = timeOnly && time ? time : whenLabel(at.slice(0, 10), time || undefined, undefined, true);
  return (
    <div className={`audit-e ${tone ? `tone-${tone}` : ''}`}>
      <span className={`avatar xs ${system ? 'sys' : 'soft'}`} aria-hidden>
        {!system ? initialsOf(actor.name) : /agent/i.test(actor.name) ? <Sparkles size={12} /> : <Workflow size={12} />}
      </span>
      <div className="audit-m">
        <div className="audit-l">
          <span className="audit-a">{action}</span>
          {chip}
        </div>
        <div className="audit-who">
          <span>{actor.name}{actor.role ? `, ${actor.role}` : ''}</span>
          <span className="audit-sep" aria-hidden>·</span>
          <time className="num" dateTime={at}>{when}</time>
        </div>
        {(before !== undefined || after !== undefined) && (
          <div className="audit-ba"><span className="b">{before ?? 'None'}</span><span aria-label="changed to"> → </span><span className="a">{after ?? 'None'}</span></div>
        )}
        {detail && <div className="audit-d">{detail}</div>}
      </div>
    </div>
  );
}
