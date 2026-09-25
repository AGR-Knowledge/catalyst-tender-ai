import type { ReactNode } from 'react';
import './tender.css';

/** An honest empty state: why it's empty and what would fill it (ui-direction §6.2). */
export function EmptyState({ title, body, action, compact = false }: { title: string; body?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`} role="status">
      <div className="es-t">{title}</div>
      {body && <div className="es-b">{body}</div>}
      {action && <div className="es-a">{action}</div>}
    </div>
  );
}
