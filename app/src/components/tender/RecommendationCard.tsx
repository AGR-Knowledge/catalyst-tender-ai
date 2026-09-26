import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import type { Tone } from '@/data/types';
import { Masked } from './Masked';
import { Tip } from './Tip';
import { SourceChips, type SourceChipRef } from './SourceChip';
import type { SourceDoc } from './SourceHost';
import './tender.css';

/**
 * The one way an agent recommendation renders (spec §5.1, ui-direction §6.2):
 * the recommendation in plain words, the confidence, the top three reasons,
 * what would change it, the sources, the agent's name, and always
 * "Recommendation, not a decision." An override never replaces it: the
 * original stays, with who overrode it, when and why underneath.
 */

export const NOT_A_DECISION = 'Recommendation, not a decision.';

const GLYPH: Partial<Record<Tone, string>> = { green: '✓', orange: '!', red: '×', grey: '–', muted: '–', cyan: 'i' };

export interface OverriddenBy { name: string; at: string; reason: string; choice?: string }

export interface RecommendationCardProps {
  /** The agent's name, without "agent": "Intake & Extraction". */
  agent: string;
  /** In plain words: "Pursue with conditions (JV needed)". */
  verdict: string;
  tone?: Tone;
  /** "Medium confidence", "Win 58% ± 8". Null when there is none to show. */
  confidence: string | null;
  confidenceWhy?: string;
  /** The confidence is masked for the viewer; `by` names who can see it. */
  confidenceMasked?: { by?: string };
  reasons: string[];
  /** The reasons are masked for the viewer (they are in a pack the role can't open). */
  reasonsMasked?: { by?: string };
  wouldChange: string[];
  /** What would change it is masked for the viewer (it moves a masked figure). */
  wouldChangeMasked?: { by?: string };
  sources: SourceChipRef[];
  doc?: SourceDoc | null;
  overriddenBy?: OverriddenBy;
  /** The caller's actions (the gate screens add them). */
  children?: ReactNode;
  /** Card heading: "Recommendation" (default), "Bid / No-Bid recommendation". */
  heading?: string;
  /** How many "what would change it" lines show before "more"; all of them when unset. */
  changeLimit?: number;
}

export function RecommendationCard(p: RecommendationCardProps) {
  const tone = p.tone ?? 'ink';
  const reasons = p.reasons.slice(0, 3);
  const change = p.changeLimit ? p.wouldChange.slice(0, p.changeLimit) : p.wouldChange;
  const more = p.wouldChange.length - change.length;
  return (
    <section className={`rec-card tone-${tone}`} aria-label={`${p.heading ?? 'Recommendation'} from the ${p.agent} agent`}>
      <header className="rec-head">
        <span className="rec-eyebrow"><Sparkles size={12} aria-hidden />{p.heading ?? 'Recommendation'}</span>
        <span className="rec-agent">{p.agent} agent</span>
      </header>

      <div className="rec-verdict">
        <span className={`rec-glyph t-${tone}`} aria-hidden>{GLYPH[tone] ?? '•'}</span>
        <span className="rec-v">{p.verdict}</span>
        {p.confidenceMasked ? <Masked by={p.confidenceMasked.by} /> : p.confidence && (
          p.confidenceWhy
            ? <Tip className="rec-conf" width={300} label={`${p.confidence}. ${p.confidenceWhy}`} tip={<><b>{p.confidence}</b><span>{p.confidenceWhy}</span></>}>{p.confidence}</Tip>
            : <span className="rec-conf">{p.confidence}</span>
        )}
      </div>

      {p.overriddenBy && (
        <p className="rec-over">
          <b>Overridden by {p.overriddenBy.name} at {p.overriddenBy.at}{p.overriddenBy.choice ? `, to ${p.overriddenBy.choice}` : ''}:</b> {p.overriddenBy.reason}
        </p>
      )}

      {(p.reasonsMasked || reasons.length > 0) && (
        <div className="rec-sec">
          <div className="rec-h">Why</div>
          {p.reasonsMasked ? <Masked by={p.reasonsMasked.by} /> : <ol className="rec-list">{reasons.map((r) => <li key={r}>{r}</li>)}</ol>}
        </div>
      )}

      {(p.wouldChangeMasked || p.wouldChange.length > 0) && (
        <div className="rec-sec">
          <div className="rec-h">What would change it</div>
          {p.wouldChangeMasked ? <Masked by={p.wouldChangeMasked.by} /> : (
            <ul className="rec-list change">
              {change.map((r) => <li key={r}>{r}</li>)}
              {more > 0 && <li className="rec-more">and {more} more</li>}
            </ul>
          )}
        </div>
      )}

      {p.sources.length > 0 && (
        <div className="rec-src">
          <span className="rec-h">Sources</span>
          <SourceChips sources={p.sources} doc={p.doc} label={`Sources for the ${p.agent} recommendation`} />
        </div>
      )}

      {p.children && <div className="rec-act">{p.children}</div>}

      <footer className="rec-foot">{NOT_A_DECISION}</footer>
    </section>
  );
}
