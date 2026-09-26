import { DEMO_TODAY } from '@/domain/calendar';
import { keyDatesFor } from '@/domain/gcc/s1';
import { authorityCalendar, tenderOf } from '@/domain/gcc/s1/common';
import { Card, CardHead } from '@/components/ui/primitives';
import { useS1 } from '@/pages/gcc/s1/vm/useS1';
import { docOf, sourceDocOf } from '@/pages/gcc/s1/vm/docs';
import { calendarNotes } from '@/pages/gcc/s1/vm/calendarNotes';
import { KeyDateList } from '@/pages/gcc/s1/parts/KeyDateList';
import type { WorkspaceCtx, WorkspaceTabDef } from './types';
import '@/pages/gcc/s1/s1.css';

/**
 * Key dates (order 50, plan 007b): every typed date in the authority's time
 * zone with the working days left, the GCC calendar flags and the reminders
 * (spec §6.7), then the calendar that applies until the last date.
 */
function Dates({ ctx }: { ctx: WorkspaceCtx }) {
  const s1 = useS1();
  const doc = sourceDocOf(docOf(ctx.tenant, ctx.tenderId));
  const rows = keyDatesFor(ctx.tenant, ctx.tenderId);
  const t = tenderOf(ctx.tenant, ctx.tenderId);
  const cal = t ? authorityCalendar(t, ctx.tenant) : null;
  const last = rows.map((r) => r.date).sort().pop() ?? DEMO_TODAY;
  const flagged = rows.filter((r) => r.flags.length).length;
  return (
    <div className="ws-tab">
      <Card>
        <CardHead title="Key dates" meta={<span>{cal ? `${t!.country} calendar · ${rows[0]?.tz ?? ''}` : ''}{flagged ? ` · ${flagged} flagged` : ''}</span>} />
        <p className="s1-lede">Times are the authority's. Working days count its weekend and expected closures, not the calendar of the company.</p>
        <div className="s1-pad"><KeyDateList s1={s1} tenderId={ctx.tenderId} doc={doc} /></div>
      </Card>
      {cal && (
        <Card>
          <CardHead title="Calendar until the last date" />
          <ul className="kd-notes">
            {calendarNotes(cal.cc, DEMO_TODAY, last).map((n) => <li key={n.key}>{n.text}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}

export const TABS: WorkspaceTabDef[] = [{
  id: 'dates', label: 'Key dates', order: 50, plan: '007b',
  shows: (ctx) => keyDatesFor(ctx.tenant, ctx.tenderId).length > 0,
  badge: (ctx) => {
    const n = keyDatesFor(ctx.tenant, ctx.tenderId).filter((r) => r.flags.length).length;
    return n ? { text: `${n} flagged`, tone: 'orange' } : null;
  },
  Panel: Dates,
}];
