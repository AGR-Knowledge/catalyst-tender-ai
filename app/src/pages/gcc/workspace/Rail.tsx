import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useDemo } from '@/state/store';
import { DEMO_TIME } from '@/domain/calendar';
import { NOTHING_FOR_YOU, type RailDecisionVM, type RailVM } from '@/domain/gcc/workspace';
import type { ActionDue, ActionVM } from '@/domain/gcc/viewmodels';
import { RecommendationCard } from '@/components/tender/RecommendationCard';
import { Callout } from '@/components/tender/Callout';
import { StatusPill } from '@/components/tender/StatusPill';
import { SlaClock } from '@/components/tender/SlaClock';
import { When, whenLabel } from '@/components/tender/When';
import type { WorkspaceCtx } from './tabs';

/**
 * The right rail (ui-direction §5 C2): the recommendation (or the decision on
 * record), my next actions, the next key dates and the open blockers. Each
 * block is left out when it has nothing to say, except next actions, which
 * says so. The recommendation card's action slot stays empty here: the gate
 * screens (007b, 009b) add their buttons.
 */

function Due({ due }: { due?: ActionDue }) {
  if (!due) return null;
  if (due.kind === 'sla') return <SlaClock start={due.start} end={due.end} />;
  if (due.kind === 'date') return <When date={due.date} time={due.time} short />;
  return <span className={`rl-due-t ${due.tone ? `t-${due.tone}` : ''}`}>{due.text}</span>;
}

function Decision({ d }: { d: RailDecisionVM }) {
  const [date, time] = d.at.split('T');
  return (
    <Callout
      variant="verdict" word={d.gate}
      title={<span className="rl-dec-t"><StatusPill label={d.label} tone={d.tone} icon={d.tone === 'green' ? '✓' : d.tone === 'red' ? '×' : '!'} />recorded by {d.byName}</span>}
    >
      <span className="rl-dec-b">
        <span>{d.byRole ? `${d.byRole} · ` : ''}{whenLabel(date, time, undefined, true)} · <span className={d.onTime ? '' : 't-red'}>{d.timing}</span></span>
        {d.flag && <span className="rl-flag">{d.flag}</span>}
        {d.reasons.length > 0 && <span>Reasons: {d.reasons.join(', ')}</span>}
        {d.note && <span>“{d.note}”</span>}
      </span>
    </Callout>
  );
}

function ActionRow({ row, onAct, acted, here }: { row: ActionVM; onAct(r: ActionVM): void; acted?: string; here: string }) {
  // A button that would reopen this same page adds nothing here.
  const self = row.primary.kind === 'route' && decodeURIComponent(row.primary.to.split('?')[0]) === here;
  return (
    <li className={`rl-act ${acted ? 'done' : ''}`}>
      <div className="rl-act-top">
        <span className={`ac-type ${row.typeTone ? `tone-${row.typeTone}` : ''}`}>{row.type}</span>
        <Due due={row.due} />
      </div>
      <div className="rl-what">{row.what}</div>
      {row.waitingOn && <div className="rl-wait">Waiting on {row.waitingOn.name}, {row.waitingOn.role}</div>}
      <div className="rl-act-b">
        {acted ? <span className="t-green rl-done"><Check size={13} aria-hidden />{acted}</span> : self ? null : (
          <>
            <button
              type="button" className="btn btn-sm btn-invert" disabled={!!row.disabledReason} onClick={() => onAct(row)}
              aria-describedby={row.disabledReason ? `rl-why-${row.id}` : undefined}
            >{row.primary.label}</button>
            {row.disabledReason && <span className="rl-why" id={`rl-why-${row.id}`}>{row.disabledReason}</span>}
          </>
        )}
      </div>
    </li>
  );
}

export function Rail({ vm, ctx }: { vm: RailVM; ctx: WorkspaceCtx }) {
  const navigate = useNavigate();
  const { mark, logAudit, toast, state } = useDemo();
  // Rows done in place keep their done label until reload (the dashboard's action list does the same).
  const [acted, setActed] = useState<Record<string, { row: ActionVM; auditIndex: number }>>({});

  const act = (row: ActionVM) => {
    const p = row.primary;
    if (p.kind === 'route') { navigate(p.to); return; }
    setActed((s) => ({ ...s, [row.id]: { row, auditIndex: state.audit.length } }));
    mark(p.markKey, undefined, undefined, p.markValue ?? 'yes');
    logAudit({ actorId: state.person.id, action: p.audit.action, target: p.audit.target ?? row.tenderId, detail: p.audit.detail });
    toast(p.toast, 'green');
  };
  const doneText = (id: string) => {
    const a = acted[id];
    if (!a || a.row.primary.kind !== 'inplace') return undefined;
    const at = state.audit[a.auditIndex]?.at ?? state.audit[state.audit.length - 1]?.at;
    return a.row.primary.doneLabel.replace('{time}', at ? at.slice(11, 16) : DEMO_TIME);
  };
  const mine = [...vm.actions.filter((r) => !acted[r.id]), ...Object.values(acted).map((a) => a.row)];
  const rec = vm.recommendation;
  const here = `/tenders/${ctx.tenderId}`;
  const forWhom = ctx.viewAs ? `Next actions for ${ctx.viewer.name}` : 'Next actions for you';

  return (
    <div className="rl">
      {rec?.kind === 'card' && (
        <RecommendationCard
          heading={rec.heading} agent={rec.agent} verdict={rec.verdict} tone={rec.tone}
          confidence={rec.confidence} confidenceWhy={rec.confidenceWhy} confidenceMasked={rec.confidenceMasked}
          reasons={rec.reasons} reasonsMasked={rec.reasonsMasked} wouldChange={rec.wouldChange} wouldChangeMasked={rec.wouldChangeMasked} changeLimit={3}
          sources={rec.sources} doc={vm.doc}
        />
      )}
      {rec?.kind === 'decision' && <Decision d={rec} />}

      {vm.blockers.length > 0 && (
        <section className="rl-sec" aria-label="Open blockers">
          <h3 className="rl-h">Open blockers</h3>
          <div className="rl-stack">
            {vm.blockers.map((b) => <Callout key={b.title} variant={b.variant} title={b.title} compact>{b.body}</Callout>)}
          </div>
        </section>
      )}

      <section className="rl-sec" aria-label={forWhom}>
        <h3 className="rl-h">{forWhom}{mine.length > 0 && <span className="rl-n num">{mine.length}</span>}</h3>
        {mine.length === 0 ? <p className="rl-empty">{NOTHING_FOR_YOU}</p> : (
          <ol className="rl-acts">{mine.map((r) => <ActionRow key={r.id} row={r} onAct={act} acted={doneText(r.id)} here={here} />)}</ol>
        )}
        {vm.waiting.length > 0 && (
          <>
            <h4 className="rl-h2">Waiting on others</h4>
            <ol className="rl-acts">{vm.waiting.map((r) => <ActionRow key={r.id} row={r} onAct={act} here={here} />)}</ol>
          </>
        )}
      </section>

      {vm.dates && (
        <section className="rl-sec" aria-label="Key dates">
          <h3 className="rl-h">Key dates</h3>
          <ul className="rl-dates">
            {vm.dates.rows.map((d) => (
              <li key={`${d.kind}:${d.date}`}>
                <span className="rl-dl">{d.label}</span>
                <When date={d.date} time={d.time} tz={d.tz} short />
                <span className="rl-dcd num">{d.daysLeft === 0 ? 'today' : `in ${d.daysLeft} d · ${d.workingDaysLeft} wd`}</span>
                {d.flags.map((f) => <span key={f.key} className="rl-flagline"><span aria-hidden>! </span>{f.text}</span>)}
              </li>
            ))}
          </ul>
          {ctx.hasTab('dates') && (
            <button type="button" className="btn-link rl-more" onClick={() => ctx.openTab('dates')}>All key dates ({vm.dates.ahead})</button>
          )}
        </section>
      )}
    </div>
  );
}
