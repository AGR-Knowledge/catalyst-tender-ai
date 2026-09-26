import type { ReactNode } from 'react';
import { Ban, Clock, RefreshCw, Scale } from 'lucide-react';
import './tender.css';

export type CalloutVariant = 'route' | 'block' | 'verdict' | 'stale';

/** Each variant's word and icon, so a callout never rests on colour alone (ui-direction §3.1). */
const META: Record<CalloutVariant, { word: string; Icon: typeof Ban }> = {
  route: { word: 'Waiting', Icon: Clock },
  block: { word: 'Hard block', Icon: Ban },
  verdict: { word: 'Decision', Icon: Scale },
  stale: { word: 'Stale', Icon: RefreshCw },
};

/** The rule sentence every hard block ends with (ui-direction §10, rule 7). */
export const HARD_BLOCK_TEXT = 'This is a hard block, not a warning.';

/**
 * A page-level message (ui-direction §6.2): `route` (orange, a referral or a
 * wait), `block` (red, a hard block), `verdict` (neutral, a decision on
 * record) and `stale` (orange, with its re-run action). The word beside the
 * icon names the variant for screen readers and in greyscale.
 */
export function Callout({ variant, title, children, action, word, compact = false }: {
  variant: CalloutVariant;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Overrides the variant's word, e.g. "DG1" on a verdict. */
  word?: string;
  compact?: boolean;
}) {
  const { word: w, Icon } = META[variant];
  return (
    <div className={`callout v-${variant} ${compact ? 'compact' : ''}`} role="note">
      <span className="co-ic" aria-hidden><Icon size={14} strokeWidth={2} /></span>
      <div className="co-main">
        <div className="co-head">
          <span className="co-word">{word ?? w}</span>
          <span className="co-title">{title}</span>
        </div>
        {(children || variant === 'block') && (
          <div className="co-body">
            {children}
            {variant === 'block' && <>{children ? ' ' : ''}{HARD_BLOCK_TEXT}</>}
          </div>
        )}
      </div>
      {action && <div className="co-act">{action}</div>}
    </div>
  );
}
