import { useMemo } from 'react';
import { auditTimeline } from '@/domain/gcc/workspace';
import { Card, CardHead } from '@/components/ui/primitives';
import { EmptyState } from '@/components/tender/EmptyState';
import { AuditEntry } from '@/components/tender/AuditEntry';
import { StatusPill } from '@/components/tender/StatusPill';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';

/**
 * Decisions & audit (order 100, always shown): every stage move and gate
 * record from the lifecycle, and every action taken on this tender in the
 * demo, newest first, grouped by day.
 */
function Audit({ ctx }: { ctx: WorkspaceCtx }) {
  const days = useMemo(
    () => auditTimeline(ctx.tenant, ctx.tenderId, ctx.done, ctx.audit, ctx.viewer),
    [ctx.tenant, ctx.tenderId, ctx.done, ctx.audit, ctx.viewer],
  );
  const n = days.reduce((s, d) => s + d.entries.length, 0);
  return (
    <Card>
      <CardHead title="Decisions & audit" meta={<span className="num">{n} {n === 1 ? 'entry' : 'entries'}</span>} />
      <p className="ws-lede">Every decision and action on this tender: who, when and why.</p>
      {days.length === 0 ? <EmptyState title="Nothing recorded on this tender yet." compact /> : (
        <div className="ws-days">
          {days.map((d) => (
            <section key={d.date} className="ws-day" aria-label={d.label}>
              <h4 className="ws-dayh">{d.label}</h4>
              {d.entries.map((e) => (
                <AuditEntry
                  key={e.key} actor={e.actor} at={e.at} action={e.action} system={e.system} before={e.before} after={e.after} detail={e.detail} timeOnly
                  chip={<>{e.chip && <StatusPill label={e.chip.label} tone={e.chip.tone} />}{e.flag && <span className="ws-flag">{e.flag}</span>}</>}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

export const TABS: WorkspaceTabDef[] = [
  { id: 'audit', label: 'Decisions & audit', order: 100, plan: '019', shows: () => true, Panel: Audit },
];
