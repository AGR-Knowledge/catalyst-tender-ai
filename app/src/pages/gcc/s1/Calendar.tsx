import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DEMO_TODAY, addDays, calendarDaysBetween, countdownText } from '@/domain/calendar';
import { dataPort } from '@/domain/gcc/port';
import { keyDatesFor } from '@/domain/gcc/s1';
import { authorityCalendar, dayMonth, profileOf, tenderOf } from '@/domain/gcc/s1/common';
import { Card, CardHead } from '@/components/ui/primitives';
import { When } from '@/components/tender/When';
import { EmptyState } from '@/components/tender/EmptyState';
import { useS1 } from './vm/useS1';
import { calendarNotes } from './vm/calendarNotes';
import '@/components/dashboard/dashboard.css';
import './s1.css';

/**
 * `/calendar` (spec §6.7): the next four weeks across the tenders the viewer
 * can see: every key date in the authority's time zone and every gate's time
 * limit, grouped by week, with the calendar flags. It reads the same key dates
 * as each tender's Key dates tab.
 */

const WEEKS = 4;

interface Entry { key: string; date: string; time?: string; tz: string; label: string; tenderId: string; shortTitle: string; flags: string[]; kind: 'date' | 'gate'; cc: ReturnType<typeof profileOf>['countryCode'] }

export default function Calendar() {
  const s1 = useS1();
  const { tenant, viewer, done } = s1;
  const profile = profileOf(tenant);
  const to = addDays(DEMO_TODAY, WEEKS * 7 - 1);

  const entries = useMemo<Entry[]>(() => {
    const rows = dataPort()?.rows(tenant, { kind: 'all' }, viewer, 'live', done) ?? [];
    const inWindow = (d: string) => d >= DEMO_TODAY && d <= to;
    return rows.flatMap((row) => {
      const t = tenderOf(tenant, row.id);
      const cc = t ? authorityCalendar(t, tenant).cc : profile.countryCode;
      const dates = keyDatesFor(tenant, row.id).filter((k) => k.kind !== 'published' && !k.past && inWindow(k.date)).map<Entry>((k) => ({
        key: `${row.id}:${k.kind}:${k.date}`, date: k.date, time: k.time, tz: k.tz, label: k.label, tenderId: row.id, shortTitle: row.shortTitle,
        flags: k.flags.map((f) => f.text), kind: 'date', cc,
      }));
      // A tender without typed key dates still shows its submission.
      if (!dates.length && row.submission && inWindow(row.submission.date)) {
        dates.push({ key: `${row.id}:submission`, date: row.submission.date, time: row.submission.time, tz: profile.tzLabel, label: 'Submission', tenderId: row.id, shortTitle: row.shortTitle, flags: [], kind: 'date', cc: profile.countryCode });
      }
      const g = row.nextGate;
      if (g?.slaEnd && inWindow(g.slaEnd.slice(0, 10))) {
        dates.push({
          key: `${row.id}:gate:${g.gate}`, date: g.slaEnd.slice(0, 10), time: g.slaEnd.length > 10 ? g.slaEnd.slice(11, 16) : undefined, tz: profile.tzLabel,
          label: `${g.gate} decision due`, tenderId: row.id, shortTitle: row.shortTitle, flags: [], kind: 'gate', cc: profile.countryCode,
        });
      }
      return dates;
    }).sort((a, b) => `${a.date}T${a.time ?? '23:59'}`.localeCompare(`${b.date}T${b.time ?? '23:59'}`));
  }, [tenant, viewer, done, to, profile]);

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const from = addDays(DEMO_TODAY, i * 7);
    return { from, to: addDays(from, 6), items: entries.filter((e) => Math.floor(calendarDaysBetween(DEMO_TODAY, e.date) / 7) === i) };
  });
  const notes = calendarNotes(profile.countryCode, DEMO_TODAY, to);

  return (
    <div className="view s1">
      <div className="s1-cols">
        <div className="s1-stack">
          {weeks.map((w, i) => (
            <Card key={w.from}>
              <CardHead title={i === 0 ? `This week · ${dayMonth(w.from)} – ${dayMonth(w.to)}` : `Week of ${dayMonth(w.from)} – ${dayMonth(w.to)}`} meta={<span className="num">{w.items.length}</span>} />
              {w.items.length ? (
                <ol className="cal">
                  {w.items.map((e) => (
                    <li key={e.key} className={`cal-row ${e.kind === 'gate' ? 'gate' : ''} ${e.flags.length ? 'flagged' : ''}`}>
                      <span className="cal-w"><When date={e.date} time={e.time} tz={e.tz} short /></span>
                      <span className="cal-l">{e.label}</span>
                      <Link className="cal-t" to={`/tenders/${e.tenderId}?tab=${e.kind === 'gate' ? 'overview' : 'dates'}`}><span className="mono">{e.tenderId}</span> {e.shortTitle}</Link>
                      <span className="cal-cd num">{e.date === DEMO_TODAY ? 'Today' : `in ${countdownText(DEMO_TODAY, e.date, e.cc)}`}</span>
                      {e.flags.map((f) => <span key={f} className="kd-flag cal-flag"><span aria-hidden>! </span>{f}</span>)}
                    </li>
                  ))}
                </ol>
              ) : <EmptyState title="Nothing due this week." compact />}
            </Card>
          ))}
        </div>
        <Card>
          <CardHead title="The working calendar" meta={<span>{profile.tzLabel}</span>} />
          <p className="s1-lede">Each date shows in the authority's own time zone. Working days count its weekend and expected closures.</p>
          <ul className="kd-notes">{notes.map((n) => <li key={n.key}>{n.text}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
