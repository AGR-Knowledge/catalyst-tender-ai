import type { ReactNode } from 'react';
import './tender.css';

export type FlagTone = 'orange' | 'red' | 'cyan';

/**
 * A flagged sentence (plan 028, pattern 2): a small glyph in the tone colour,
 * then the text, with no rule beside it. "!" for orange and cyan, "✕" for red.
 * The glyph is hidden from screen readers; the sentence itself says what is
 * wrong, so the component adds no "Warning:" of its own.
 */
export function FlagLine({ tone, children, className, as: Tag = 'span' }: {
  tone: FlagTone;
  children: ReactNode;
  className?: string;
  /** `p` where the line stands as its own paragraph. */
  as?: 'span' | 'p' | 'div';
}) {
  return (
    <Tag className={`flag-line tone-${tone}${className ? ` ${className}` : ''}`}>
      <span className="fl-g" aria-hidden>{tone === 'red' ? '✕' : '!'}</span>
      <span className="fl-t">{children}</span>
    </Tag>
  );
}
