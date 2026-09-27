import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { personById } from '@/data/people';
import { RFQ_CLOCK_HOURS } from '@/data/gcc/s2';
import { dataOf, shortDate, shortWhen } from '@/domain/gcc/s1/common';
import { dg1Reopen, reasonLabel, type AnyDg1, type Dg1Decision, type Dg1State } from '@/domain/gcc/dg1';
import { Card, CardHead, KV } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import type { S1 } from '../vm/useS1';

/**
 * The DG1 decision on record (spec §7 "Record written"): who, when, the
 * recommendation at that moment, the reasons and note, the team and what the
 * pack showed. A decision recorded in the demo can be re-opened with a reason;
 * one from the seed is history.
 */

const REC_WORD: Record<string, string> = { pursue: 'Pursue', conditions: 'Pursue with conditions', discard: 'Discard' };
const TEAM_LABEL: Record<string, string> = { proc: 'Procurement', plan: 'Planning', comm: 'Commercial', comp: 'Compliance', dir: 'PD designate' };
const isDemo = (d: AnyDg1): d is Dg1Decision => 'snapshot' in d;
const nameOf = (id: string) => personById(id)?.name ?? id;

export function Dg1Record({ s1, state, focusHead = false }: { s1: S1; state: Dg1State; focusHead?: boolean }) {
  const c = state.current!;
  const id = state.tenderId;
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  // Just recorded: the form this replaces had focus, so the record's heading takes it (plan 025b).
  const head = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (focusHead) head.current?.focus({ preventScroll: true }); }, [focusHead]);
  const right = s1.check('dg1.decide', id);
  const reopenRight = right.ok ? right : s1.check('dg1.delegate', id);
  const pursue = c.decision === 'pursue';
  const recWord = isDemo(c) ? c.verdictLabel : REC_WORD[c.recommendation] ?? c.recommendation;
  const override = pursue ? c.recommendation === 'discard' : c.recommendation !== 'discard';
  const partner = isDemo(c) && c.strategy?.kind === 'jv' ? dataOf(s1.tenant).partners.find((p) => p.id === c.strategy!.partnerId)?.name : undefined;

  const reopen = () => {
    const w = dg1Reopen(s1.tenant, id, reason, s1.viewer.id, s1.done, s1.nextAt());
    s1.write(id, w.writes, w.audit, { msg: 'DG1 re-opened. The tender is back in the DG1 queue.' });
    setReason('');
    setAsking(false);
  };

  return (
    <Card>
      <CardHead title={<span ref={head} tabIndex={-1}>DG1 decision</span>} meta={<span>{state.source === 'demo' ? 'Recorded today' : 'Recorded before today'}</span>} />
      <div className="s1-pad dg1f">
        <Callout variant="verdict" word="DG1" title={`${pursue ? 'Pursue' : 'Discard'} · ${nameOf(c.byId)}${isDemo(c) && c.delegate ? ' as delegate' : ''} · ${shortWhen(c.at)}`} compact>
          The recommendation at that moment: {recWord}.{override ? ' This decision went against it; both are kept.' : ''}
        </Callout>
        {state.source === 'demo' && (pursue
          ? <p className="s1-muted">Moved to Stage 2, Sourcing. The team was notified and the RFQ clock started at {shortWhen(c.at)}: every RFQ is due within {RFQ_CLOCK_HOURS} hours.</p>
          : <p className="s1-muted">Closed with its reasons. It stays searchable, and the reasons feed the fit model's learning.</p>)}
        <div className="s1-kv">
          {c.reasonCodes.length > 0 && <KV k="Reasons" v={c.reasonCodes.map(reasonLabel).join(', ')} />}
          {c.note && <KV k="Note" v={c.note} />}
          {isDemo(c) && c.team && <KV k="Bid team" v={Object.entries(c.team).filter(([, v]) => v).map(([k, v]) => `${TEAM_LABEL[k] ?? k}: ${nameOf(v)}`).join(' · ')} />}
          {isDemo(c) && c.strategy && <KV k="Strategy" v={c.strategy.kind === 'jv' ? `JV with ${partner ?? c.strategy.partnerId}${c.strategy.shares ? ` (${c.strategy.shares[0]}/${c.strategy.shares[1]})` : ''}` : 'Prime'} />}
          {isDemo(c) && <KV k="What the pack showed" v={`Fit ${c.snapshot.weighted}; ${c.snapshot.eligibilityText ?? 'no PQ check'}; bond ${c.snapshot.bond}`} />}
          {!isDemo(c) && <KV k="Within 24 h of logging" v={c.withinSla ? 'Yes' : 'No'} />}
        </div>
        {isDemo(c) && c.milestones && c.milestones.length > 0 && (
          <>
            <div className="rec-h">Internal bid calendar (proposed)</div>
            <ul className="dg1-ms read">{c.milestones.map((m) => <li key={m.key}><span>{m.label}</span><span className="num">{shortDate(m.date)}{m.time ? ` ${m.time}` : ''}</span></li>)}</ul>
          </>
        )}
        <p className="s1-note">Recorded in the audit trail. <Link to={`/tenders/${id}?tab=audit`}>Decisions &amp; audit</Link>{pursue ? <> · <Link to={`/tenders/${id}`}>Open the workspace</Link></> : null}</p>

        {state.source === 'demo' ? (
          asking ? (
            <div className="dg1-reopen">
              <label className="rcp-note">
                <span className="rcp-l">Why re-open (required)</span>
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="In a sentence: what changed." autoFocus />
              </label>
              <div className="dg1-actions">
                <button type="button" className="btn btn-primary" onClick={reopen} disabled={!reason.trim()}>Re-open DG1</button>
                <button type="button" className="btn" onClick={() => setAsking(false)}>Cancel</button>
                {!reason.trim() && <span className="s1-sub-i">Give a reason to re-open.</span>}
              </div>
            </div>
          ) : (
            <div className="dg1-actions">
              <button type="button" className="btn btn-sm" onClick={() => setAsking(true)} disabled={!reopenRight.ok} title={reopenRight.ok ? undefined : reopenRight.reason}><RotateCcw size={12} aria-hidden />Re-open with a reason</button>
              {!reopenRight.ok && <span className="s1-sub-i">{reopenRight.reason}.</span>}
              {reopenRight.ok && <span className="s1-sub-i">The decision stays on record.</span>}
            </div>
          )
        ) : (
          <p className="s1-note">A decision from before today is kept as history.</p>
        )}

        {state.previous.length > 0 && (
          <>
            <div className="rec-h">Earlier decisions on this tender</div>
            <ul className="dg1-prev">
              {state.previous.map((p) => <li key={`${p.decision}:${p.at}`}>{p.decision === 'pursue' ? 'Pursue' : 'Discard'} by {nameOf(p.byId)}, {shortWhen(p.at)}</li>)}
              {state.reopens.map((r) => <li key={`re:${r.at}`}>Re-opened by {nameOf(r.byId)}, {shortWhen(r.at)}: {r.reason.replace(/[.\s]+$/, '')}</li>)}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
