import { useMemo } from 'react';
import { CalendarPlus, MessageSquare, Phone } from 'lucide-react';
import type { Person } from '@/data/people';
import { isGccTenantKey } from '@/data/gcc';
import { useDemo } from '@/state/store';
import { contactFor } from '@/domain/gcc/contact';
import './contact-links.css';

/**
 * Calendar, Call and Teams for one colleague (plan 044): real links, nothing
 * stored. Teams and Call open Microsoft Teams in a new tab; Calendar downloads
 * an `.ics` invite for the next free half hour. Never shown on the viewer's
 * own row: with `keepSpace` an invisible copy holds the same width there, so
 * every row's text keeps one width. `compact` shows the icons only, for tight
 * rows; each keeps its words as its accessible name.
 */
export function ContactLinks({ person, subject, compact, keepSpace, className }: {
  person: Person | undefined;
  /** What it is about, used as the chat message and the invite's subject: "Re T-2026-097 DG2: your position (CFO)". */
  subject: string;
  compact?: boolean;
  /** Hold the links' width where they are not shown (the viewer's own row, a row with no person). */
  keepSpace?: boolean;
  className?: string;
}) {
  const { state, toast } = useDemo();
  const viewer = state.person;
  const tenant = state.tenant;
  const vm = useMemo(
    () => (person && person.id !== viewer.id && isGccTenantKey(tenant) ? contactFor(tenant, viewer, person, subject) : null),
    [person, viewer, tenant, subject],
  );
  const cls = `cl ${compact ? 'compact' : ''} ${className ?? ''}`;

  if (!vm || !person) {
    if (!keepSpace) return null;
    return (
      <span className={`${cls} cl-ghost`} aria-hidden>
        <span className="cl-b"><CalendarPlus />{!compact && 'Calendar'}</span>
        <span className="cl-b"><Phone />{!compact && 'Call'}</span>
        <span className="cl-b"><MessageSquare />{!compact && 'Teams'}</span>
      </span>
    );
  }

  const download = () => {
    const blob = new Blob([vm.ics()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = vm.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Invite for ${person.name}, ${vm.slotText}, downloaded. Open it to send from your calendar.`, 'ink3');
  };

  const calTip = `Calendar invite for ${person.name}: 30 minutes, ${vm.slotText} (.ics file)`;
  const callTip = `Teams call with ${person.name}`;
  const chatTip = `Teams chat with ${person.name}`;
  return (
    <span className={cls} role="group" aria-label={`Contact ${person.name}`}>
      <button type="button" className="cl-b" onClick={download} title={calTip} aria-label={compact ? calTip : undefined}>
        <CalendarPlus aria-hidden />{!compact && 'Calendar'}
      </button>
      <a className="cl-b" href={vm.callUrl} target="_blank" rel="noopener noreferrer" title={callTip} aria-label={compact ? callTip : undefined}>
        <Phone aria-hidden />{!compact && 'Call'}
      </a>
      <a className="cl-b" href={vm.chatUrl} target="_blank" rel="noopener noreferrer" title={chatTip} aria-label={compact ? chatTip : undefined}>
        <MessageSquare aria-hidden />{!compact && 'Teams'}
      </a>
    </span>
  );
}
