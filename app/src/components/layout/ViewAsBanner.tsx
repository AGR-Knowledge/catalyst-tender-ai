import { Eye } from 'lucide-react';
import { useDemo } from '@/state/store';

/** Shown above the page while the Head of Tendering views the workspace as someone else. */
export function ViewAsBanner() {
  const { state, stopViewAs } = useDemo();
  if (!state.viewAs) return null;
  const p = state.person;
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        margin: '0 0 var(--gap)', padding: '10px 14px 10px 16px', borderRadius: 10,
        background: 'var(--orange-soft)', color: 'var(--ink)', boxShadow: 'inset 0 0 0 1px var(--orange)',
        fontSize: 13, lineHeight: 1.4,
      }}
    >
      <Eye size={15} aria-hidden style={{ flex: 'none', color: 'var(--orange)' }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        Viewing as <strong style={{ fontWeight: 600 }}>{p.name}</strong>, {p.title}. Read only. Actions are disabled.
      </span>
      <button type="button" className="btn" onClick={stopViewAs}>Exit view</button>
    </div>
  );
}
