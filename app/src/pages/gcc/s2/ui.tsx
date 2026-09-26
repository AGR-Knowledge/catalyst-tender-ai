import type { ReactNode } from 'react';
import type { Tone } from '@/data/types';
import type { Money as MoneyT } from '@/data/gcc/types';
import { personById } from '@/data/people';
import { dateText } from '@/domain/calendar';
import { Money } from '@/components/tender/Money';
import { Masked } from '@/components/tender/Masked';
import { SourceChip } from '@/components/tender/SourceChip';
import type { SourceDoc } from '@/components/tender/SourceHost';
import type { DeskCtx } from './vm/desk';

/** Small pieces the Stage 2 panels share (plan 008b). No rules here: formatting and masking only. */

/** A quote amount: the value with `see.quotes`, otherwise "Masked for your role" naming who can see it. */
export function QuoteAmount({ desk, value, full = false, original }: { desk: DeskCtx; value: MoneyT; full?: boolean; original?: MoneyT }) {
  if (!desk.seesQuotes) return <Masked by={desk.quotesBy} />;
  return <Money value={original && original.ccy !== value.ccy ? { ...value, original } : value} full={full} />;
}

/** "Joseph Mathew" and "Sun 8 Mar 2026, 10:00". */
export const whoAt = (byId: string, at: string) => ({ name: personById(byId)?.name ?? byId, when: `${dateText(at.slice(0, 10))}, ${at.slice(11, 16)}` });

/** "Joseph Mathew, Sun 8 Mar 2026, 10:00". */
export function byLine(byId: string, at: string): string {
  const w = whoAt(byId, at);
  return `${w.name}, ${w.when}`;
}

/** The page references in a clause text ("§64.5 (p. 22) and §71 (p. 31)") as chips that open the tender document. */
export function PageChips({ text, doc }: { text: string; doc: SourceDoc | null }) {
  const pages = [...new Set([...text.matchAll(/p\. ?(\d+)/g)].map((m) => Number(m[1])))];
  if (!pages.length) return null;
  return (
    <span className="s2-chips">
      {pages.map((p) => <SourceChip key={p} source={{ kind: 'page', page: p, label: `p. ${p}` }} doc={doc} />)}
    </span>
  );
}

/** A tone word in a pill: never colour alone. */
export function Tag({ tone = 'ink', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span className={`s2-tag tone-${tone}`} title={title}>{children}</span>;
}

/** A disabled action says why, in words beside it (ui-direction §13). */
export function Why({ reason }: { reason?: string | null }) {
  return reason ? <span className="s2-why">{reason}</span> : null;
}

/** A section title inside a card, with optional actions on the right. */
export function PanelHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="s2-ph">
      <div className="s2-ph-t">
        <h3>{title}</h3>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="s2-ph-a">{children}</div>}
    </div>
  );
}

/** The reason sentence for a write the viewer may not make, or null when they may. */
export const refusal = (desk: DeskCtx, cap: Parameters<DeskCtx['check']>[0]) => {
  const r = desk.check(cap);
  return r.ok ? null : r.reason ?? 'Outside your role';
};
