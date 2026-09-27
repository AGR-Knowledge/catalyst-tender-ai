import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, X } from 'lucide-react';
import type { Seat } from '@/data/people';
import { personById, SEAT_LABEL } from '@/data/people';
import type { Stance } from '@/data/gcc/s3';
import { useDemo } from '@/state/store';
import { isWriteError } from '@/domain/gcc/s3';
import { positionWrite, positionsFor, STANCE_LABEL, SECRETARY_TEXT, type PositionInput } from '@/domain/gcc/dg2';
import { ConfirmModal } from '../s3/Confirm';
import '../s3/s3.css';

/**
 * Record a DG2 position (spec §10): Support · Support with conditions · Oppose
 * · Abstain. A comment is needed for anything but Support; conditions are free
 * text, each a tracked item, and one that states a margin figure is marked so
 * it can be masked. A declared conflict of interest records Abstain. The Head
 * of Tendering may record for a member in a live meeting ("recorded by the
 * secretary"). The audit entry states a position, so it is marked `positions`.
 */

const STANCES: Stance[] = ['support', 'conditions', 'oppose', 'abstain'];

interface Cond { text: string; margin: boolean }

export function PositionForm({ tenant, tenderId, seat, asSecretary, onClose }: {
  tenant: string;
  tenderId: string;
  /** The seat being recorded; null closes the form. */
  seat: Seat | null;
  /** The Head of Tendering, recording for the member. */
  asSecretary: boolean;
  onClose(): void;
}) {
  const { state, mark, logAudit, toast, nextAt } = useDemo();
  const { person, done } = state;
  const positions = useMemo(() => positionsFor(tenant, tenderId, done), [tenant, tenderId, done]);
  const sv = positions.seats.find((s) => s.seat === seat);
  const member = personById(sv?.personId);
  const [stance, setStance] = useState<Stance>('support');
  const [comment, setComment] = useState('');
  const [conds, setConds] = useState<Cond[]>([{ text: '', margin: false }]);
  const [coi, setCoi] = useState(false);
  const [coiText, setCoiText] = useState('');

  // Each opening starts from the member's current position, so "Change my position" edits it.
  useEffect(() => {
    if (!seat) return;
    const p = positionsFor(tenant, tenderId, done).seats.find((s) => s.seat === seat)?.position;
    setStance(p?.coi ? 'abstain' : p?.stance ?? 'support');
    setComment(p?.coi ? '' : p?.comment ?? '');
    const margin = p?.marginConditions ?? [];
    const all = (p?.conditions ?? []).map((text) => ({ text, margin: margin.includes(text) }));
    setConds(all.length ? all : [{ text: '', margin: false }]);
    setCoi(!!p?.coi);
    setCoiText(p?.coi?.text ?? '');
    // Only when the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat, tenderId]);

  // A radio group (plan 016b): Tab reaches the chosen position, the arrow keys move and choose, Space or Enter chooses.
  const shown = coi ? 'abstain' : stance;
  const group = useRef<HTMLDivElement>(null);
  // Focus follows the chosen position, including when the saved one loads just after the form opens.
  useEffect(() => {
    const g = group.current;
    if (g && g.contains(document.activeElement)) g.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [shown]);

  if (!seat || !sv) return null;

  const input: PositionInput = {
    stance: coi ? 'abstain' : stance,
    comment,
    ...(stance === 'conditions' && !coi ? {
      conditions: conds.filter((c) => !c.margin).map((c) => c.text),
      marginConditions: conds.filter((c) => c.margin).map((c) => c.text),
    } : {}),
    ...(coi ? { coi: { text: coiText } } : {}),
    packVersion: positions.issuedVersion ?? 1,
    round: positions.round,
  };
  const byId = member?.id ?? sv.personId;
  const recordedById = asSecretary ? person.id : undefined;
  const probe = positionWrite(tenderId, seat, input, byId, recordedById, nextAt());
  const why = isWriteError(probe) ? probe.error : null;

  const save = () => {
    const w = positionWrite(tenderId, seat, input, byId, recordedById, nextAt());
    if (isWriteError(w)) { toast(w.error, 'red'); return; }
    const before = positions.recorded;
    const had = !!sv.position;
    mark(w.key, undefined, undefined, w.value);
    logAudit({ ...w.audit, sensitive: 'positions' });
    const after = before + (had ? 0 : 1);
    const quorumNow = !positions.quorum.met && after >= positions.quorum.needed;
    toast(
      `${asSecretary ? `${sv.name}'s position recorded by the secretary` : 'Your position is recorded'}: ${STANCE_LABEL[input.stance]}.`
      + (quorumNow ? ` Quorum met: ${after} of ${positions.quorum.of}. The Head of Tendering can approve.` : ''),
      'green',
    );
    onClose();
  };

  const need = input.stance !== 'support';
  const onSegKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = STANCES.indexOf(shown);
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1
      : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1
      : e.key === 'Home' ? 0 : e.key === 'End' ? STANCES.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const n = (to + STANCES.length) % STANCES.length;
    setStance(STANCES[n]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[n]?.focus();
  };
  return (
    <ConfirmModal
      open={!!seat} eyebrow={`DG2 position · pack v${positions.issuedVersion ?? 1}`}
      title={asSecretary ? `Record ${sv.name}'s position` : 'Record my position'}
      sub={`${member?.title ?? SEAT_LABEL[seat]}${asSecretary ? `. ${SECRETARY_TEXT}, with your name.` : ''}`}
      confirmLabel="Record position" disabledReason={why} onConfirm={save} onClose={onClose} wide
    >
      <fieldset className="s3-field" disabled={coi}>
        <legend className="s3-l">Position</legend>
        <div className="s3-seg" role="radiogroup" aria-label="Position" onKeyDown={onSegKey} ref={group}>
          {STANCES.map((s) => (
            <button
              key={s} type="button" role="radio" aria-checked={shown === s} tabIndex={shown === s ? 0 : -1}
              onClick={() => setStance(s)} data-autofocus={shown === s ? true : undefined}
            >{STANCE_LABEL[s]}</button>
          ))}
        </div>
      </fieldset>

      {stance === 'conditions' && !coi && (
        <div className="s3-field">
          <span className="s3-l">Conditions (each becomes a tracked item if the bid goes ahead)</span>
          <div className="in-listrows">
            {conds.map((c, i) => (
              <div key={i} className="pf-cond">
                <input aria-label={`Condition ${i + 1}`} value={c.text} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder="For example: keep the bid bond within the facility" />
                <label className="s3-check"><input type="checkbox" checked={c.margin} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, margin: e.target.checked } : x)))} />States a margin figure</label>
                <button type="button" className="btn btn-sm" onClick={() => setConds(conds.length > 1 ? conds.filter((_, j) => j !== i) : [{ text: '', margin: false }])} aria-label={`Remove condition ${i + 1}`}><X size={12} aria-hidden /></button>
              </div>
            ))}
          </div>
          <span className="s3-hint">A condition that states a margin figure is masked for people without margin access.</span>
          <div><button type="button" className="btn btn-sm" onClick={() => setConds([...conds, { text: '', margin: false }])}><Plus size={12} aria-hidden />Add a condition</button></div>
        </div>
      )}

      {!coi && (
        <label className="s3-field">
          <span className="s3-l">Comment {need ? '(required)' : '(optional)'}</span>
          <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={need ? 'Why, in a sentence or two.' : 'Anything the committee should know.'} />
        </label>
      )}

      <label className="s3-check">
        <input type="checkbox" checked={coi} onChange={(e) => setCoi(e.target.checked)} />
        Declare a conflict of interest and abstain
      </label>
      {coi && (
        <label className="s3-field">
          <span className="s3-l">The conflict (required; it is recorded)</span>
          <textarea rows={2} value={coiText} onChange={(e) => setCoiText(e.target.value)} placeholder="For example: a close relative works for a competing bidder." />
        </label>
      )}
      <p className="s3-hint">Recorded with {asSecretary ? `${member?.name ?? 'the member'}'s name, your name as secretary` : 'your name'} and the time, on pack v{positions.issuedVersion ?? 1}. It shows in the audit trail.</p>
    </ConfirmModal>
  );
}
