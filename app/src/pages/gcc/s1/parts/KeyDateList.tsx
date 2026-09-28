import { useMemo } from 'react';
import { BellRing } from 'lucide-react';
import { personById } from '@/data/people';
import { DEMO_TODAY, countdownText } from '@/domain/calendar';
import { keyDatesFor, remindersFor } from '@/domain/gcc/s1';
import { authorityCalendar, listText, profileOf, shortWhen, tenderOf } from '@/domain/gcc/s1/common';
import { dateArabicOf, ocrPagesOf } from '@/domain/gcc/arabic';
import { When } from '@/components/tender/When';
import { SourceChip } from '@/components/tender/SourceChip';
import { BilingualValue } from '@/components/tender/BilingualValue';
import { FlagLine } from '@/components/tender/FlagLine';
import type { SourceDoc } from '@/components/tender/SourceHost';
import type { S1 } from '../vm/useS1';
import { docOf } from '../vm/docs';

/**
 * A tender's key dates (spec §6.7): each in the authority's time zone, with
 * days and working days left in the authority's calendar (`countdownText`, as
 * the workspace header counts), the page that states it, and the GCC calendar
 * flags: Ramadan hours, the expected Eid closure, the guarantee's validity
 * and the bank's lead time. The full list adds the planned reminders. For an
 * Arabic document it also shows the Arabic each date was read from, and a
 * date on a scanned page says it was read by OCR (plan 012).
 */
export function KeyDateList({ s1, tenderId, doc, compact = false }: { s1: S1; tenderId: string; doc: SourceDoc | null; compact?: boolean }) {
  const { tenant, done } = s1;
  // The full list (the Dates tab) adds the guarantee's validity where the tender gives it in days (plan 016a 2.4).
  const rows = useMemo(() => keyDatesFor(tenant, tenderId, compact ? undefined : done), [tenant, tenderId, compact, done]);
  const record = useMemo(() => docOf(tenant, tenderId)?.record ?? null, [tenant, tenderId]);
  const t = tenderOf(tenant, tenderId);
  if (!t || !rows.length) return null;
  const cal = authorityCalendar(t, tenant);
  const shown = compact ? rows.filter((r) => !r.past) : rows;
  const first = (id: string) => personById(id)?.name.split(' ')[0] ?? id;

  return (
    <>
      {rows[0]?.calendarFallback && !compact && (
        <p className="kd-fallback">There is no demo calendar for {t.country}: working days follow {profileOf(tenant).name}'s own calendar.</p>
      )}
      <ol className={`kd ${compact ? 'compact' : ''}`}>
        {shown.map((r) => {
          const reminders = compact ? [] : remindersFor(r);
          // The Arabic a date was read from shows in the DG1 pack's compact list too (spec §19: every field of an Arabic tender).
          const ar = dateArabicOf(record, r);
          const scanned = !!r.page && ocrPagesOf(record).includes(r.page);
          const note = [r.place && `At ${r.place}`, !compact && r.note].filter(Boolean).join('. ');
          return (
            <li key={`${r.kind}:${r.date}`} className={`kd-row ${r.past ? 'past' : ''} ${r.flags.length ? 'flagged' : ''}`}>
              <span className="kd-l">{r.label}</span>
              <span className="kd-w"><When date={r.date} time={r.time} tz={r.tz} short={compact} /></span>
              <span className="kd-cd num">{r.past ? 'Passed' : r.daysLeft === 0 ? 'Today' : `in ${countdownText(DEMO_TODAY, r.date, cal.cc)}`}</span>
              <span className="kd-src">{r.page && <SourceChip source={{ kind: 'page', page: r.page, label: `p. ${r.page}`, ...(scanned ? { scanned: true, ...(ar ? { arabic: ar } : {}) } : {}) }} doc={doc} />}</span>
              {(note || ar) && <span className="kd-note"><BilingualValue en={note} ar={ar} /></span>}
              {r.flags.map((f) => <FlagLine key={f.key} tone="orange" className="kd-flag">{f.text}</FlagLine>)}
              {reminders.length > 0 && (
                <span className="kd-rem">
                  <BellRing size={11} aria-hidden />
                  {reminders.map((x) => `${x.kind === 'escalation' ? 'Escalation' : 'Reminder'} ${shortWhen(x.at)} to ${listText(x.toIds.map(first))}`).join(' · ')}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
