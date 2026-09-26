import { useRef, type KeyboardEvent } from 'react';
import { Lock } from 'lucide-react';
import type { Tone } from '@/data/types';
import './tender.css';

/**
 * An accessible tab list (ui-direction §9): `role="tablist"`, ← → Home End
 * move and select, one tab stop, `aria-selected`, and an optional badge per
 * tab. The caller renders the panel with `tabPanelProps`.
 */

export interface TabItem {
  id: string;
  label: string;
  badge?: { text: string; tone?: Tone } | null;
  /** The viewer's role can't see this tab's content: a lock beside the label. */
  locked?: boolean;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelId = (prefix: string) => `${prefix}-panel`;

/** Spread on the panel element. */
export const tabPanelProps = (prefix: string, active: string) => ({
  id: panelId(prefix), role: 'tabpanel' as const, 'aria-labelledby': tabId(prefix, active), tabIndex: -1,
});

export function Tabs({ tabs, active, onChange, label, prefix = 'tabs' }: {
  tabs: TabItem[];
  active: string;
  onChange(id: string): void;
  label: string;
  prefix?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === active);
    const to = e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
    if (to < 0) return;
    e.preventDefault();
    onChange(tabs[to].id);
    refs.current[tabs[to].id]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={move}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id} ref={(el) => { refs.current[t.id] = el; }} type="button" role="tab"
            id={tabId(prefix, t.id)} aria-selected={on} aria-controls={on ? panelId(prefix) : undefined} tabIndex={on ? 0 : -1}
            className={`tab ${on ? 'on' : ''}`} onClick={() => onChange(t.id)}
          >
            <span>{t.label}</span>
            {t.locked && <Lock size={11} aria-label="masked for your role" className="tab-lock" />}
            {t.badge && <span className={`tab-badge ${t.badge.tone ? `tone-${t.badge.tone}` : ''}`}>{t.badge.text}</span>}
          </button>
        );
      })}
    </div>
  );
}
