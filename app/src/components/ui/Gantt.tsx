import type { CSSProperties } from 'react';
import { longDate } from '@/domain/format';
import type { Activity, Programme } from '@/domain/programme';

const STATUS_LABEL: Record<Activity['status'], string> = { complete: 'Complete', progress: 'In progress', late: 'Behind baseline', planned: 'Not started' };
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/** Month and quarter ticks across the contract, as fractions of its length. */
function axis(g: Programme) {
  const [ys, ms] = g.start.split('-').map(Number);
  const [yf, mf] = g.finish.split('-').map(Number);
  const startMs = Date.parse(g.start);
  const span = Date.parse(g.finish) - startMs;
  const months: { x: number; label: string; q?: string }[] = [];
  for (let y = ys, m = ms - 1; Date.UTC(y, m, 1) <= Date.UTC(yf, mf - 1, 1); m++) {
    if (m > 11) { m = 0; y++; }
    const ms0 = Date.UTC(y, m, 1);
    if (ms0 < startMs) continue;
    const x = (ms0 - startMs) / span;
    months.push({ x, label: MONTHS[m], q: m % 3 === 0 ? `Q${m / 3 + 1} ${String(y).slice(2)}` : undefined });
  }
  return months;
}

export function Gantt({ programme: g, dense }: { programme: Programme; dense?: boolean }) {
  const ticks = axis(g);
  const showMonths = g.months <= 20 && !dense;
  const todayStyle = { '--x': `${g.today * 100}%` } as CSSProperties;

  const bar = (a: Activity) => {
    const left = `${a.s * 100}%`;
    if (a.milestone) return <span className={`gt-ms ${a.status}`} style={{ left }} />;
    const done = a.status === 'complete' ? 1 : a.status === 'progress' || a.status === 'late' ? Math.max(0, Math.min(1, (g.progress / 100 - a.s) / (a.e - a.s))) : 0;
    return (
      <span className={`gt-bar ${a.status} ${a.crit ? 'crit' : ''}`} style={{ left, width: `${(a.e - a.s) * 100}%` }}>
        {done > 0 && done < 1 && <span className="fill" style={{ width: `${done * 100}%` }} />}
      </span>
    );
  };

  return (
    <div className="gantt-c">
      <div className="gantt" role="table" aria-label="Delivery programme">
        <div className="gt-row gt-head" role="row">
          <span className="gt-id" role="columnheader">ID</span>
          <span className="gt-name" role="columnheader">Activity</span>
          <span className="gt-dur" role="columnheader">Duration</span>
          <span className="gt-st" role="columnheader">Status</span>
          <span className="gt-time gt-axis" role="columnheader" aria-label="Timeline" style={todayStyle}>
            <span className="today-tag">Today</span>
            {ticks.map((t, i) => (
              <span key={i} className={`tick ${t.q ? 'q' : ''}`} style={{ left: `${t.x * 100}%` }}>
                {t.q && t.x < 0.94 && <b>{t.q}</b>}
                {showMonths && <i>{t.label}</i>}
              </span>
            ))}
          </span>
        </div>
        {g.groups.map((grp) => (
          <div key={grp.code} role="rowgroup">
            <div className="gt-row gt-group" role="row">
              <span className="gt-id mono">{grp.code}</span>
              <span className="gt-name">{grp.name}</span>
              <span className="gt-dur mono">{grp.months} mo</span>
              <span className="gt-st" />
              <span className="gt-time" style={todayStyle}>
                <span className="gt-sum" style={{ left: `${grp.s * 100}%`, width: `${Math.max(0.4, (grp.e - grp.s) * 100)}%` }} />
              </span>
            </div>
            {grp.acts.map((a) => (
              <div
                className="gt-row" role="row" key={a.id}
                title={a.milestone ? `${a.name}: ${longDate(a.finish)}` : `${a.name}: ${longDate(a.start)} to ${longDate(a.finish)}, ${a.days} days`}
              >
                <span className="gt-id mono">{a.id}</span>
                <span className="gt-name">{a.name}</span>
                <span className="gt-dur mono">{a.milestone ? '0 d' : `${a.days} d`}</span>
                <span className={`gt-st s-${a.status}`}>{a.milestone && a.status === 'planned' ? longDate(a.finish).slice(0, 6) : STATUS_LABEL[a.status]}</span>
                <span className="gt-time" style={todayStyle}>{bar(a)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="gt-legend" aria-hidden>
        <span><i className="k crit" />Critical path</span>
        <span><i className="k float" />Has float</span>
        <span><i className="k progress" />In progress</span>
        <span><i className="k complete" />Complete</span>
        <span><i className="k late" />Behind baseline</span>
        <span><i className="k ms" />Milestone</span>
        <span><i className="k today" />Today</span>
      </div>
    </div>
  );
}
