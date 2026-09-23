import { useMemo, useState } from 'react';
import type { Tone } from '@/data/types';
import { useDemo } from '@/state/store';
import { useLive } from '@/domain/live';
import { cr, longDate, pts } from '@/domain/format';
import { programmeFor, scheduleLabel } from '@/domain/programme';
import { Card, CardFoot, CardHead, Mark, SectionTitle, tc } from '@/components/ui/primitives';
import { DataTable } from '@/components/ui/DataTable';
import { Gantt } from '@/components/ui/Gantt';

const slipTone = (slip: number): Tone => (slip >= 21 ? 'red' : slip >= 3 ? 'orange' : slip <= -3 ? 'green' : 'ink3');

/** Progress bar with a tick where the baseline says the project should be today. */
function PlanTrack({ progress, planned, tone }: { progress: number; planned: number; tone: Tone }) {
  return (
    <span className="ptrack" title={`${progress}% complete, baseline ${planned}%`}>
      <span className={`f bg-${tone === 'ink3' ? 'ink' : tone}`} style={{ width: `${progress}%` }} />
      <span className="tick" style={{ left: `${planned}%` }} />
    </span>
  );
}

export function DirDashboard() {
  const { openDrawer, mark, is, toast } = useDemo();
  const live = useLive();
  const [pk, setPk] = useState('jai');
  const project = live.projects.find((p) => p.key === pk) ?? live.projects[0];
  const prog = useMemo(() => programmeFor(project, project.rebaselined), [project]);

  const deviations: { key: string; tone: Tone; mark: string; title: string; body: string; when: string; label?: string; run?: () => void }[] = [];
  if (!is('dev-1')) deviations.push({ key: 'dev-1', tone: 'red', mark: '!', title: 'Jaipur Solar: inverter delivery', body: 'Supplier is 5 weeks behind the mobilisation plan committed at bid. Recommended corrective action: re-sequence civil works.', when: 'Action', label: 'Approve action', run: () => mark('dev-1', 'Re-sequencing approved. Programme re-baselined, supplier scoring updated') });
  deviations.push({ key: 'dev-2', tone: 'orange', mark: '!', title: 'Chennai Metro: labour productivity', body: 'Running 11% below the norm used in the cost model. Margin impact projected at −1.1 pts if sustained. Fed to the learning loop as a productivity data point.', when: 'Review', label: 'Review', run: () => toast('Productivity variance opened and cost model norm flagged for the Governance Forum', 'ink3') });
  deviations.push(is('dev-3')
    ? { key: 'dev-3', tone: 'green', mark: '✓', title: 'Vadodara: obligation reminder sent', body: 'Monthly ESG report to client due in 3 days. Project controls lead acknowledged.', when: 'Sent' }
    : { key: 'dev-3', tone: 'orange', mark: '!', title: 'Vadodara: obligation due', body: 'Monthly ESG report to client due in 3 days. Owner notified twice.', when: '3d', label: 'Remind owner', run: () => mark('dev-3', 'Reminder sent to the Vadodara project controls lead', 'ink3') });
  if (is('dev-1')) deviations.push({ key: 'dev-1d', tone: 'green', mark: '✓', title: 'Jaipur Solar: re-sequencing approved', body: 'Civil works re-sequenced around the late inverter delivery. Programme re-baselined.', when: 'Logged' });
  deviations.push({ key: 'dev-4', tone: 'green', mark: '✓', title: 'Trichy: early completion', body: 'Two milestones delivered ahead of programme. Logged against the delivery record.', when: 'Logged' });

  const solar = `${Math.abs(live.solarVariance).toFixed(1)} pts`;
  const learning = [
    { key: 'loop', title: 'Margin model', body: `Solar BoP margins have run ${solar} below bid across three projects. The Learning Loop Agent has proposed a sector-specific correction${is('loop') ? ' and is now with the Governance Forum.' : ', pending Governance Forum approval.'}`, status: is('loop') ? 'With the Forum' : 'Pending approval', tone: (is('loop') ? 'cyan' : 'orange') as Tone, run: () => (is('loop') ? toast('Solar BoP margin correction proposal and evidence set opened', 'ink3') : mark('loop', 'Solar BoP margin correction sent to the Governance Forum with its evidence set', 'cyan')) },
    { key: 'sup', title: 'Supplier scoring', body: 'Two inverter suppliers have been downgraded on delivered performance. They now rank lower in shortlists generated at Stage 2.', status: 'Applied', tone: 'green' as Tone, run: () => toast('Supplier scoring change applied and visible in Stage 2 shortlists', 'ink3') },
    { key: 'cal', title: 'Win-probability calibration', body: `Across ${live.decidedBids} decided bids, forecasts are within ±${live.calibrationError}% of the actual win rate. The threshold is ±10%.`, status: 'Within threshold', tone: 'green' as Tone, run: () => toast(`Calibration curve: ${live.decidedBids} decided bids, ±${live.calibrationError}% trailing error`, 'ink3') },
  ];

  return (
    <>
      <div className="split" style={{ '--cols': '1.5fr 1fr' } as React.CSSProperties}>
        <Card id="sec-projects">
          <CardHead title="Delivery against bid commitments" meta="tracked from bid handover" />
          <DataTable
            rows={live.projects}
            rowKey={(p) => p.key}
            onRowClick={(p) => openDrawer({ type: 'project', key: p.key })}
            columns={[
              { key: 'n', header: 'Project', width: '1.6fr', primary: true, render: (p) => (<><span className="cell-main">{p.name}</span><span className="cell-sub">{p.sector}{p.atRisk ? ` · ${p.atRisk} milestone${p.atRisk > 1 ? 's' : ''} at risk` : ''}</span></>) },
              { key: 'g', header: 'Progress against plan', width: '1.25fr', render: (p) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ flex: 1 }}><PlanTrack progress={p.progress} planned={p.planned} tone={slipTone(p.slip)} /></span>
                  <span className="num t-ink3" style={{ fontSize: 12, width: 34, textAlign: 'right' }}>{p.progress}%</span>
                </span>
              ) },
              { key: 's', header: 'Schedule', width: '.85fr', align: 'right', render: (p) => <span className={tc(slipTone(p.slip))} style={{ fontSize: 12.5 }}>{scheduleLabel(p.slip)}</span> },
              { key: 'b', header: 'Bid margin', width: '.65fr', align: 'right', priority: 3, render: (p) => <span className="num t-ink" style={{ fontSize: 13 }}>{p.bid.toFixed(1)}%</span> },
              { key: 'c', header: 'Current', width: '.6fr', align: 'right', priority: 3, render: (p) => <span className="num t-ink" style={{ fontSize: 13 }}>{p.current.toFixed(1)}%</span> },
              { key: 'd', header: 'Δ', label: 'Δ pts', width: '.5fr', align: 'right', priority: 2, render: (p) => <span className={`num ${p.delta >= 0 ? 't-green' : p.delta <= -0.5 ? 't-red' : 't-ink3'}`} style={{ fontSize: 13 }}>{pts(p.delta)}</span> },
            ]}
          />
        </Card>

        <Card id="sec-deviations">
          <CardHead title="Agent-detected deviations" meta="for your approval" />
          {deviations.map((x) => (
            <div className="item" key={x.key}>
              <Mark tone={x.tone}>{x.mark}</Mark>
              <span className="item-body">
                <span className="item-title">{x.title}</span>
                <span className="item-text">{x.body}</span>
                {x.label && <span className="item-actions"><button type="button" className="btn btn-invert" style={{ color: 'var(--ink)' }} onClick={x.run}>{x.label}</button></span>}
              </span>
              <span className={`item-when ${tc(x.tone)}`}>{x.when}</span>
            </div>
          ))}
        </Card>
      </div>

      {prog && (
        <Card id="sec-programme" style={{ marginTop: 'var(--gap)' }}>
          <CardHead title="Delivery programme" meta={`${prog.activityCount} activities in ${prog.groups.length} work groups`} />
          <div className="prog-bar">
            <label className="sort prog-pick">
              <span className="sr-only">Project</span>
              <select value={pk} onChange={(e) => setPk(e.target.value)} aria-label="Project">
                {live.projects.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
              </select>
            </label>
            <div className="prog-facts">
              <span><i>Contract</i><b>{cr(project.value)}</b></span>
              <span><i>Progress</i><b>{project.progress}%</b><small>baseline {project.planned}%</small></span>
              <span><i>Schedule</i><b className={tc(slipTone(prog.slipDays))}>{scheduleLabel(prog.slipDays)}</b></span>
              <span><i>Forecast finish</i><b className={tc(prog.slipDays >= 3 ? slipTone(prog.slipDays) : 'ink')}>{longDate(prog.forecast)}</b><small>contract {longDate(prog.finish)}</small></span>
            </div>
          </div>
          <Gantt programme={prog} />
          <CardFoot>
            {prog.lateCount
              ? `${prog.lateCount} ${prog.lateCount === 1 ? 'activity is' : 'activities are'} behind the baseline. Critical path is ${prog.critDays} days.`
              : `Nothing is behind the baseline. Critical path is ${prog.critDays} days.`}
            {project.rebaselined.length > 0 && ' Inverter station erection was re-baselined when the re-sequencing was approved.'}
          </CardFoot>
        </Card>
      )}

      <div id="sec-learning" />
      <SectionTitle title="Feedback from delivery" sub="Stage 9b, fed back into Stage 1" />
      <div className="grid-3">
        {learning.map((l) => (
          <button type="button" key={l.key} className="card learn-card" onClick={l.run}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{l.title}</span>
              <span className={tc(l.tone)} style={{ fontSize: 11.5 }}>{l.status}</span>
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 8, lineHeight: 1.55 }}>{l.body}</span>
          </button>
        ))}
      </div>
    </>
  );
}
