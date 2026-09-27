import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Check } from 'lucide-react';
import { peopleOf, personById, firstWithRole } from '@/data/people';
import { addHours } from '@/domain/gcc/clock';
import { json } from '@/domain/gcc/s1/done';
import { dataOf, shortWhen } from '@/domain/gcc/s1/common';
import { requestWrite } from '@/domain/gcc/requestKeys';
import {
  DISCARD_REASONS, defaultTeam, dg1Write, proposedMilestones, validateDg1,
  type Dg1Input, type Dg1Milestone, type Dg1Pack, type Dg1State, type Dg1Team,
} from '@/domain/gcc/dg1';
import { Card, CardHead } from '@/components/ui/primitives';
import { Callout } from '@/components/tender/Callout';
import { BOTH_KEPT } from '@/components/tender/OverrideModal';
import { ReasonCodePicker } from '@/components/tender/ReasonCodePicker';
import type { S1 } from '../vm/useS1';

/**
 * The DG1 decision form (spec §7): Pursue with the team, the submission
 * strategy and the proposed milestones; Discard with reason codes; Hold asks a
 * person for information while the SLA runs. `validateDg1` says what is
 * missing; the effects are shown before anything is recorded. The assigned Bid
 * Manager records it, or the Head of Tendering as a delegate with a reason.
 */

type Choice = Dg1Input['decision'];

const TEAM_ROLES: { key: keyof Dg1Team; label: string }[] = [
  { key: 'proc', label: 'Procurement Lead' }, { key: 'plan', label: 'Planning' }, { key: 'comm', label: 'Commercial' },
  { key: 'comp', label: 'Compliance / Legal' }, { key: 'dir', label: 'Project Director designate' },
];
const CHOICES: { id: Choice; label: string; hint: string }[] = [
  { id: 'pursue', label: 'Pursue', hint: 'Moves to Sourcing and starts the RFQ clock' },
  { id: 'discard', label: 'Discard', hint: 'Closes it with reasons; it stays searchable' },
  { id: 'hold', label: 'Hold', hint: 'Ask a person for information; the SLA keeps running' },
];
const RULE_CODES = DISCARD_REASONS.map((r) => ({ id: r.code, label: r.label }));

export function Dg1Form({ s1, pack, state, dueAt }: { s1: S1; pack: Dg1Pack; state: Dg1State; dueAt?: string }) {
  const { tenant, viewer, done } = s1;
  const id = pack.tenderId;
  const t = dataOf(tenant).register.find((x) => x.id === id);
  const bm = personById(t?.bidManagerId);
  const decide = s1.check('dg1.decide', id);
  const delegateRight = s1.check('dg1.delegate', id);
  const mode = decide.ok ? 'owner' : delegateRight.ok ? 'delegate' : 'none';
  const people = useMemo(() => peopleOf(tenant).filter((p) => p.group !== 'External' && p.group !== 'Platform'), [tenant]);
  const partners = dataOf(tenant).partners;
  const elig = pack.eligibility?.result;
  const rec = pack.recommendation;
  const bond = pack.bond?.bond;

  const [choice, setChoice] = useState<Choice | null>(null);
  const [team, setTeam] = useState<Dg1Team>(() => defaultTeam(tenant));
  const [kind, setKind] = useState<'prime' | 'jv'>(elig?.verdict === 'eligible-with-jv' ? 'jv' : 'prime');
  const [partnerId, setPartnerId] = useState(elig?.jvPartner?.id ?? partners[0]?.id ?? '');
  const [milestones, setMilestones] = useState<Dg1Milestone[]>(() => proposedMilestones(tenant, id, s1.nextAt()));
  const [codes, setCodes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [hold, setHold] = useState(() => {
    const fin = bond?.facilityTight ? bond.confirmedById : undefined;
    const coord = pack.locked?.nudge?.toId;
    const toId = fin ?? coord ?? firstWithRole(tenant, 'fin')?.id ?? '';
    const what = fin ? 'Confirm the facility headroom for the guarantees on award (performance and advance payment)'
      : coord ? 'Confirm the fields that block DG1' : '';
    return { toId, what, due: addHours(s1.nextAt(), 4) };
  });
  const [review, setReview] = useState(false);
  const [last, setLast] = useState<{ label: string; effects: string[] } | null>(null);

  const overrides = choice === 'pursue' ? rec.verdict === 'discard' : choice === 'discard' ? rec.verdict !== 'discard' : false;
  const input: Dg1Input | null = choice ? {
    tenderId: id, decision: choice,
    ...(choice === 'discard' ? { reasonCodes: codes } : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
    ...(choice === 'pursue' ? {
      team, milestones,
      strategy: kind === 'jv'
        ? { kind: 'jv' as const, partnerId, ...(partnerId === elig?.jvPartner?.id && elig?.jv?.shares ? { shares: elig.jv.shares } : {}) }
        : { kind: 'prime' as const },
    } : {}),
    ...(choice === 'hold' ? { request: hold } : {}),
  } : null;
  const v = input ? validateDg1(input, pack, done) : null;
  const errors = [
    ...(v?.errors ?? []),
    ...(input && mode === 'delegate' && !note.trim() ? [`Add a note: say why you record DG1 as ${bm?.name ?? 'the Bid Manager'}'s delegate.`] : []),
  ];
  const preview = review && input && !errors.length ? dg1Write({ ...input, at: s1.nextAt() }, viewer.id, pack, done) : null;

  const record = () => {
    if (!input || !preview) return;
    const at = s1.nextAt();
    const w = dg1Write({ ...input, at }, viewer.id, pack, done);
    const label = CHOICES.find((c) => c.id === input.decision)!.label;
    const to = input.request ? personById(input.request.toId) : undefined;
    const writes = input.decision === 'hold' && input.request
      ? [...w.writes, requestWrite(id, input.request.toId, 'dg1-hold', { what: input.request.what, section: 'DG1 decision', due: input.request.due, at, byId: viewer.id })]
      : w.writes;
    const msg = input.decision === 'pursue' ? 'DG1 recorded: Pursue. The RFQ clock has started.'
      : input.decision === 'discard' ? 'DG1 recorded: Discard, with its reasons.'
      : `DG1 on hold. ${to?.name ?? 'The person asked'} has the request in My requests.`;
    s1.write(id, writes, w.audit, { msg });
    setLast({ label, effects: w.effects });
    setReview(false);
    setChoice(null);
    setNote('');
    setCodes([]);
    // The recorded decision replaces the form at the top of the column: bring it into view.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }), 30);
  };

  const nudge = pack.locked?.nudge;
  const coordName = personById(nudge?.toId)?.name;
  const sendNudge = () => {
    if (!nudge) return;
    s1.mark(nudge.key, `${coordName ?? 'The Coordinator'} nudged about the fields that block DG1.`, 'green', json({ at: s1.nextAt(), byId: viewer.id }));
    s1.logAudit({ actorId: viewer.id, action: 'Nudged about DG1 blockers', target: id, detail: `Asked ${coordName ?? 'the Coordinator'} to confirm: ${pack.locked!.reason.toLowerCase()}` });
  };

  const lockedOut = !!pack.locked && (choice === 'pursue' || (choice === 'discard' && !pack.locked.discardAllowed));
  const disabled = mode === 'none';
  const holdTarget = personById(hold.toId);

  return (
    <Card>
      <CardHead title="Record DG1" meta={mode === 'delegate' ? <span className="dg1-deleg">As delegate</span> : bm ? <span>Bid Manager: {bm.name}</span> : undefined} />
      <div className="s1-pad dg1f">
        {last && (
          <Callout variant="verdict" word="Recorded" title={`${last.label} recorded in the audit trail`} compact>
            <ul className="dg1-eff">{last.effects.map((e) => <li key={e}>{e}</li>)}</ul>
          </Callout>
        )}

        {state.hold && (
          <Callout variant="route" word="On hold" title={`Asked ${personById('request' in state.hold ? state.hold.request.toId : '')?.name ?? 'a person'}${'request' in state.hold ? `: ${state.hold.request.what}` : ''}`} compact>
            {'request' in state.hold ? `Due ${shortWhen(state.hold.request.due)}. ` : ''}The DG1 time limit keeps running{dueAt ? `: due ${shortWhen(dueAt)}` : ''}.
          </Callout>
        )}

        {pack.locked && (
          <Callout
            variant="route" title={pack.locked.reason} compact
            action={nudge && nudge.toId !== viewer.id && (s1.viewAs || s1.check('dg1.decide', id).ok) && (
              nudge.sent
                ? <span className="dg1-nudged"><Check size={12} aria-hidden />Nudged</span>
                : <button type="button" className="btn btn-sm" onClick={sendNudge} disabled={s1.viewAs} title={s1.viewAs ? `Viewing as ${viewer.name}. Read only` : undefined}><BellRing size={12} aria-hidden />Nudge {coordName?.split(' ')[0]}</button>
            )}
          >
            Pursue unlocks once they are confirmed. <Link to={`/intake-queue?tender=${id}`}>Open the intake queue</Link>
            {pack.locked.discardAllowed ? '. Discard stays open: no open field can change a PQ fail.' : '.'}
          </Callout>
        )}

        {disabled && <p className="dg1-why" role="note">{decide.reason}.</p>}
        {mode === 'delegate' && <p className="dg1-why" role="note">{decide.reason}.</p>}

        <div className="dg1-choices" role="radiogroup" aria-label="Your decision">
          {CHOICES.map((c) => (
            <button
              key={c.id} type="button" role="radio" aria-checked={choice === c.id} disabled={disabled}
              className={`ovr-opt dg1-opt ${choice === c.id ? 'on' : ''}`} onClick={() => { setChoice(c.id); setReview(false); setLast(null); }}
            >
              <span className="ovr-dot" aria-hidden />
              <span className="ovr-t">{c.label}</span>
              <span className="ovr-h">{c.hint}</span>
            </button>
          ))}
        </div>

        {choice && overrides && (
          <Callout variant="route" word="Override" title={`The agent recommends: ${rec.recommendation.replace(/^Recommend d/, 'D')}`} compact>
            Your decision goes against it{choice === 'pursue' ? ': a note is required' : ''}. {BOTH_KEPT}
          </Callout>
        )}

        {choice === 'pursue' && (
          <>
            <fieldset className="dg1-set">
              <legend>Bid team <span className="s1-sub-i">pre-filled from the company's defaults</span></legend>
              <div className="dg1-grid">
                {TEAM_ROLES.map((r) => {
                  const opts = people.filter((p) => p.role === r.key);
                  return (
                    <label key={r.key} className="dg1-field">
                      <span>{r.label}</span>
                      <select value={team[r.key]} onChange={(e) => setTeam({ ...team, [r.key]: e.target.value })}>
                        {!team[r.key] && <option value="">Not assigned</option>}
                        {(opts.length ? opts : people).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="dg1-set">
              <legend>Submission strategy</legend>
              <div className="dg1-row">
                <label className="dg1-radio"><input type="radio" name="dg1-kind" checked={kind === 'prime'} onChange={() => setKind('prime')} />Prime</label>
                <label className="dg1-radio"><input type="radio" name="dg1-kind" checked={kind === 'jv'} onChange={() => setKind('jv')} disabled={!partners.length} />JV</label>
                {kind === 'jv' && (
                  <select aria-label="JV partner" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                    {partners.map((p) => <option key={p.id} value={p.id}>{p.name}{p.id === elig?.jvPartner?.id ? ' (clears the PQ)' : ''}</option>)}
                  </select>
                )}
              </div>
            </fieldset>
            <fieldset className="dg1-set">
              <legend>Internal bid calendar <span className="s1-sub-i">proposed; change any date</span></legend>
              <ul className="dg1-ms">
                {milestones.map((m, i) => (
                  <li key={m.key}>
                    <span>{m.label}</span>
                    <input
                      type="date" aria-label={m.label} value={m.date} disabled={m.key === 'submission'}
                      onChange={(e) => setMilestones(milestones.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
                    />
                    <span className="s1-sub-i num">{m.time ?? ''}</span>
                  </li>
                ))}
              </ul>
            </fieldset>
          </>
        )}

        {choice === 'discard' && (
          <ReasonCodePicker codes={RULE_CODES} value={{ codes, note }} required="code" onChange={(r) => { setCodes(r.codes); setNote(r.note); }} noteLabel={mode === 'delegate' ? 'Note (required: why you record it as delegate)' : undefined} />
        )}

        {choice === 'hold' && (
          <fieldset className="dg1-set">
            <legend>Ask for information</legend>
            <div className="dg1-grid">
              <label className="dg1-field">
                <span>Who</span>
                <select value={hold.toId} onChange={(e) => setHold({ ...hold, toId: e.target.value })}>
                  {people.filter((p) => p.id !== viewer.id).map((p) => <option key={p.id} value={p.id}>{p.name}, {p.title}</option>)}
                </select>
              </label>
              <label className="dg1-field">
                <span>By when</span>
                <input type="datetime-local" value={hold.due} onChange={(e) => setHold({ ...hold, due: e.target.value })} />
              </label>
              <label className="dg1-field wide">
                <span>What</span>
                <input type="text" value={hold.what} onChange={(e) => setHold({ ...hold, what: e.target.value })} placeholder="What you need to decide" />
              </label>
            </div>
            {holdTarget && <p className="s1-note">It goes to {holdTarget.name}'s requests. The DG1 time limit keeps running{dueAt ? ` (due ${shortWhen(dueAt)})` : ''}.</p>}
          </fieldset>
        )}

        {choice && choice !== 'discard' && (
          <label className="rcp-note dg1-note">
            <span className="rcp-l">{mode === 'delegate' ? 'Note (required: why you record it as delegate)' : overrides && choice === 'pursue' ? 'Note (required)' : 'Note (optional)'}</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="In a sentence: why you decided this way." />
          </label>
        )}

        {choice && errors.length > 0 && !lockedOut && review && (
          <ul className="dg1-err" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        )}
        {choice && lockedOut && <p className="dg1-why" role="note">{pack.locked!.reason}. DG1 can be recorded once they are resolved.</p>}

        {preview && (
          <div className="dg1-preview">
            <div className="rec-h">What happens when you confirm</div>
            <ul className="dg1-eff">{preview.effects.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        {choice && (
          <div className="dg1-actions">
            {preview ? (
              <>
                <button type="button" className="btn btn-primary" onClick={record}>Confirm: record {CHOICES.find((c) => c.id === choice)!.label}</button>
                <button type="button" className="btn" onClick={() => setReview(false)}>Back</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setReview(true)} disabled={lockedOut || (review && errors.length > 0)}>Review the record</button>
            )}
            <span className="s1-sub-i">Recorded with your name and the time, {shortWhen(s1.nextAt())}.</span>
          </div>
        )}
      </div>
    </Card>
  );
}
