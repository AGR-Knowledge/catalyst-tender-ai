import type { Tone } from '@/data/types';
import type { Source } from '@/data/gcc/types';
import { gccData, isGccTenantKey } from '@/data/gcc';

/**
 * Administration › Sources & integrations (plan 024 Phase 2, catalogue INT-4):
 * the portals, mailboxes and scanned drops the Intake Agent watches, with the
 * state each reported at its last poll. The seed's list, the same one the
 * tender radar reads. Connecting a source is done in the product, not here.
 */

export interface SourceVM {
  id: string;
  name: string;
  kind: Source['kind'];
  kindLabel: string;
  mode: Source['mode'];
  modeLabel: string;
  state: Source['state'];
  stateLabel: string;
  tone: Tone;
  icon: string;
  /** What the connection needs or why it isn't healthy, in words. */
  note: string;
  /** Tenant-local `YYYY-MM-DDTHH:MM` (or a date). */
  lastPoll: string;
}

export interface SourcesVM {
  rows: SourceVM[];
  healthy: number;
  /** "1 degraded, 1 with credentials expiring", or empty when every source is healthy. */
  issues: string;
}

const KIND_LABEL: Record<Source['kind'], string> = {
  portal: 'Public portal', 'client-portal': 'Employer portal', mailbox: 'Mailbox', scan: 'Scanned drop', manual: 'Manual upload',
};

const MODE_LABEL: Record<Source['mode'], string> = { api: 'API', scheduled: 'Scheduled', assisted: 'Assisted' };

/** The same four states as the radar and the Platform Console, never colour alone. */
export const SOURCE_STATE: Record<Source['state'], { label: string; tone: Tone; icon: string }> = {
  healthy: { label: 'Healthy', tone: 'green', icon: '✓' },
  degraded: { label: 'Degraded', tone: 'orange', icon: '!' },
  'credentials-expiring': { label: 'Credentials expiring', tone: 'orange', icon: '!' },
  down: { label: 'Down', tone: 'red', icon: '×' },
};

/** Worst first, as the INT-4 tile names the worst one. */
const RANK: Record<Source['state'], number> = { down: 0, degraded: 1, 'credentials-expiring': 2, healthy: 3 };

/** A source without a note still says what its state means. */
const STATE_NOTE: Record<Source['state'], string> = {
  healthy: 'Working at its last poll',
  degraded: 'Polling, with errors: some notices may arrive late',
  'credentials-expiring': 'The login expires soon: renew it before the portal locks the account',
  down: 'Not polling: notices from this source are not being captured',
};

export function sourcesOf(tenant: string): SourcesVM {
  const list = isGccTenantKey(tenant) ? gccData(tenant).sources : [];
  const rows: SourceVM[] = list
    .map((s) => ({
      id: s.id, name: s.name, kind: s.kind, kindLabel: KIND_LABEL[s.kind], mode: s.mode, modeLabel: MODE_LABEL[s.mode],
      state: s.state, stateLabel: SOURCE_STATE[s.state].label, tone: SOURCE_STATE[s.state].tone, icon: SOURCE_STATE[s.state].icon,
      // A credentials warning always says so in words, whatever else the note says.
      note: s.state === 'credentials-expiring' && s.note && !/expir/i.test(s.note) ? `${s.note}. Credentials expiring` : s.note ?? STATE_NOTE[s.state],
      lastPoll: s.lastPoll,
    }))
    .sort((a, b) => RANK[a.state] - RANK[b.state]);
  const count = (st: Source['state']) => list.filter((s) => s.state === st).length;
  const issues = [
    count('down') && `${count('down')} down`,
    count('degraded') && `${count('degraded')} degraded`,
    count('credentials-expiring') && `${count('credentials-expiring')} with credentials expiring`,
  ].filter(Boolean).join(', ');
  return { rows, healthy: count('healthy'), issues };
}
