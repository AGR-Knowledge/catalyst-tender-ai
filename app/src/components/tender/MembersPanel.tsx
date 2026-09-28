import { useId } from 'react';
import { Lock, PenLine, UserRoundCheck } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { FlagLine } from './FlagLine';
import { Masked } from './Masked';
import { whenLabel } from './When';
import './members-panel.css';

/**
 * Committee positions at DG2 (ui-direction §6.2, spec §10 as changed by
 * dashboards.md §9): each voting seat with its avatar, name, seat, position
 * chip, comment and time. "Record my position" appears on the signed-in
 * member's own row only; the Head of Tendering may record a position stated
 * in a live meeting for a member who hasn't recorded one, marked as recorded
 * by the secretary. Conflicts declared show
 * as such. The page supplies rows already masked for the viewer; without
 * sight of positions the panel says "With the committee" and nothing else.
 */

export type MemberStance = 'support' | 'conditions' | 'oppose' | 'abstain' | 'conflict' | 'none';

export interface MemberCondition { text: string; margin?: boolean; masked?: boolean }

export interface MemberRow {
  seat: string;
  name: string;
  initials: string;
  /** "CEO", "Chief Financial Officer", "Sector Head, Water and wastewater". */
  seatLabel: string;
  stance: MemberStance;
  /** "Support with conditions", "Not yet recorded". */
  stanceLabel: string;
  comment?: string;
  conditions?: MemberCondition[];
  /** `YYYY-MM-DDTHH:MM`, tenant local. */
  at?: string;
  /** "Recorded by the secretary in the meeting · Faisal Al-Harbi". */
  secretary?: string;
  /** Short flags: "Recorded on v1", "Before the re-open". */
  flags?: string[];
  /** The declared conflict of interest, in the member's words. */
  conflict?: string;
  /** The signed-in member's own seat. */
  me?: boolean;
}

const CHIP: Record<MemberStance, { tone: string; icon: string }> = {
  support: { tone: 'green', icon: '✓' },
  conditions: { tone: 'green', icon: '✓' },
  oppose: { tone: 'red', icon: '×' },
  abstain: { tone: 'grey', icon: '–' },
  conflict: { tone: 'orange', icon: '!' },
  none: { tone: 'none', icon: '○' },
};

export function MembersPanel({ rows, headline, quorum, majority, masked, onRecord, recordCheck, onRecordFor, secretaryCheck, title = 'Committee positions' }: {
  rows: MemberRow[];
  /** "2 of 5 positions · quorum needs 3". */
  headline?: string;
  /** For the quorum meter. */
  quorum?: { recorded: number; needed: number; of: number; met: boolean };
  /** "2 for, 0 against, 0 abstaining". */
  majority?: string;
  /** The viewer may not see positions: `by` names who can. */
  masked?: { by: string };
  /** The signed-in member records or changes their own position. */
  onRecord?(seat: string): void;
  recordCheck?: CanResult;
  /** The Head of Tendering records for a member, as secretary. */
  onRecordFor?(seat: string): void;
  secretaryCheck?: CanResult;
  title?: string;
}) {
  const hid = useId();
  const secOk = !secretaryCheck || secretaryCheck.ok;
  if (masked) {
    return (
      <section className="mp" aria-labelledby={hid}>
        <header className="mp-head"><h3 className="mp-t" id={hid}>{title}</h3><span className="mp-state">With the committee</span></header>
        <div className="mp-masked"><Lock size={13} aria-hidden /><span>Positions, counts and the majority are shown to the committee, the Head of Tendering and the tender's Bid Manager only.</span><Masked by={masked.by} /></div>
      </section>
    );
  }
  return (
    <section className="mp" aria-labelledby={hid}>
      <header className="mp-head">
        <h3 className="mp-t" id={hid}>{title}</h3>
        {headline && <span className={`mp-state ${quorum?.met ? 'met' : ''}`}>{headline}</span>}
      </header>
      {quorum && (
        <div className="mp-quorum" role="img" aria-label={`${quorum.recorded} of ${quorum.of} positions recorded; quorum is ${quorum.needed}`}>
          {Array.from({ length: quorum.of }, (_, i) => (
            <span key={i} className={`mp-q ${i < quorum.recorded ? 'on' : ''} ${i === quorum.needed - 1 ? 'tick' : ''}`} />
          ))}
          {majority && <span className="mp-maj">{majority}</span>}
        </div>
      )}
      <ul className="mp-list">
        {rows.map((r) => {
          const chip = CHIP[r.stance];
          return (
            <li key={r.seat} className={`mp-row ${r.me ? 'me' : ''} s-${r.stance}`}>
              <span className={`avatar sm ${r.stance === 'none' ? 'soft' : ''}`} aria-hidden>{r.initials}</span>
              <div className="mp-main">
                <div className="mp-who">
                  <span className="mp-name">{r.name}{r.me && <span className="mp-you"> · you</span>}</span>
                  <span className="mp-seat">{r.seatLabel}</span>
                </div>
                <div className="mp-line">
                  <span className={`mp-chip tone-${chip.tone}`}><span className="ic" aria-hidden>{chip.icon}</span>{r.stanceLabel}</span>
                  {r.at && <span className="mp-at num">{whenLabel(r.at.slice(0, 10), r.at.slice(11, 16), undefined, true)}</span>}
                  {r.flags?.map((f) => <span key={f} className="mp-flag">{f}</span>)}
                </div>
                {r.conflict && <FlagLine as="p" tone="orange" className="mp-coi">Conflict of interest declared: {r.conflict}</FlagLine>}
                {r.comment && !r.conflict && <p className="mp-comment">{r.comment}</p>}
                {r.conditions && r.conditions.length > 0 && (
                  <ul className="mp-conds" aria-label={`Conditions from ${r.name}`}>
                    {r.conditions.map((c) => (
                      <li key={c.text} className={c.masked ? 'masked-c' : ''}>
                        {c.masked ? <><Lock size={11} aria-hidden />{c.text}</> : c.text}
                        {c.margin && !c.masked && <span className="mp-mtag">Margin</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {r.secretary && <p className="mp-sec"><UserRoundCheck size={11} aria-hidden />{r.secretary}</p>}
                {r.me && onRecord && (
                  <div className="mp-act">
                    <button type="button" className={`btn btn-sm ${r.stance === 'none' ? 'btn-primary' : ''}`} onClick={() => onRecord(r.seat)} disabled={!!recordCheck && !recordCheck.ok} aria-describedby={recordCheck && !recordCheck.ok ? `${hid}-why` : undefined}>
                      <PenLine size={12} aria-hidden />{r.stance === 'none' ? 'Record my position' : 'Change my position'}
                    </button>
                    {recordCheck && !recordCheck.ok && <span className="mp-why" id={`${hid}-why`}>{recordCheck.reason}</span>}
                  </div>
                )}
                {!r.me && onRecordFor && secOk && r.stance === 'none' && (
                  <div className="mp-act">
                    <button type="button" className="btn-link" onClick={() => onRecordFor(r.seat)} aria-label={`Record ${r.name}'s position as secretary`}>
                      Record as secretary
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {onRecordFor && !secOk && secretaryCheck?.reason && <p className="mp-foot">Recording as secretary: {secretaryCheck.reason}.</p>}
    </section>
  );
}
