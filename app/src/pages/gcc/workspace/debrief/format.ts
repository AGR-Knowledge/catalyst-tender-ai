import type { Tone } from '@/data/types';
import type { CanResult } from '@/data/access';
import {
  DEBRIEF_STATUSES, debriefAcceptWrite, debriefBackWrite, debriefSubmitWrite, labelOf, type DebriefStatus, type DebriefVM,
} from '@/domain/gcc/debriefs';

export { dayText, stampText, debriefLines, gateOf, type DebriefLine } from '@/domain/gcc/library/debrief';

/** The glyph beside each status word, so a status never rests on colour alone. */
export const STATUS_ICON: Record<DebriefStatus, string> = { due: '○', overdue: '!', submitted: '•', 'sent-back': '!', accepted: '✓' };

/** The statuses in which the Project Director's form is open. */
export const RECORDABLE: readonly DebriefStatus[] = ['due', 'overdue', 'sent-back'];

/** Who holds what on this tender. `holds…` ignores View as (the form shows, read only); the checks don't. */
export interface DebriefAccess { record: CanResult; holdsRecord: boolean; accept: CanResult; holdsAccept: boolean }

/** The writers, injectable so the kit preview renders the tab without writing anything. */
export interface DebriefWriters { submit: typeof debriefSubmitWrite; accept: typeof debriefAcceptWrite; back: typeof debriefBackWrite }
export const WRITERS: DebriefWriters = { submit: debriefSubmitWrite, accept: debriefAcceptWrite, back: debriefBackWrite };

/** The tab's badge: the status word, only when it asks something of the viewer. */
export function debriefBadge(vm: DebriefVM | null, holds: { record: boolean; accept: boolean }): { text: string; tone: Tone } | null {
  if (!vm) return null;
  if (holds.record && RECORDABLE.includes(vm.status)) return { text: labelOf(DEBRIEF_STATUSES, vm.status), tone: 'orange' };
  if (holds.accept && vm.status === 'submitted') return { text: 'To accept', tone: 'orange' };
  return null;
}
