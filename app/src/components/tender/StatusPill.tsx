import type { Tone } from '@/data/types';
import type { Health } from '@/domain/gcc/viewmodels';
import './tender.css';

/** The health vocabulary (dashboards.md §5): one set for the table and the tracker. */
export const HEALTH: Record<Health, { label: string; tone: Tone; icon: string; closed: boolean }> = {
  'on-track': { label: 'On track', tone: 'green', icon: '✓', closed: false },
  'at-risk': { label: 'At risk', tone: 'orange', icon: '!', closed: false },
  overdue: { label: 'Overdue', tone: 'red', icon: '!', closed: false },
  blocked: { label: 'Blocked', tone: 'red', icon: '×', closed: false },
  won: { label: 'Won', tone: 'green', icon: '✓', closed: true },
  lost: { label: 'Lost', tone: 'grey', icon: '–', closed: true },
  discarded: { label: 'Discarded', tone: 'grey', icon: '–', closed: true },
  'no-bid': { label: 'No-bid', tone: 'grey', icon: '–', closed: true },
  rejected: { label: 'Rejected', tone: 'grey', icon: '–', closed: true },
  withdrawn: { label: 'Withdrawn', tone: 'grey', icon: '–', closed: true },
};

/** Worst first: the order the Health column sorts in. */
export const HEALTH_ORDER: Health[] = ['blocked', 'overdue', 'at-risk', 'on-track', 'won', 'lost', 'no-bid', 'rejected', 'discarded', 'withdrawn'];

type Props = { health: Health } | { label: string; tone: Tone; icon?: string };

/** A status word with its tone and glyph: never colour alone. */
export function StatusPill(props: Props) {
  const { label, tone, icon } = 'health' in props ? HEALTH[props.health] : props;
  return (
    <span className={`status-pill tone-${tone}`}>
      {icon && <span className="ic" aria-hidden>{icon}</span>}
      {label}
    </span>
  );
}
