import { useId } from 'react';
import { Check } from 'lucide-react';
import './tender.css';

/**
 * Structured reasons (ui-direction §6.2): a multi-select of reason codes plus
 * a note. The gate decides what is required; the caller disables its button
 * with `missingReason(...)`, which says what is still needed in words.
 */

export interface ReasonCode { id: string; label: string }
export interface ReasonValue { codes: string[]; note: string }
export type ReasonRule = 'none' | 'code' | 'note' | 'code-or-note';

export const EMPTY_REASON: ReasonValue = { codes: [], note: '' };

/** What is still missing under the rule, or null when it is met. */
export function missingReason(rule: ReasonRule, v: ReasonValue): string | null {
  const code = v.codes.length > 0;
  const note = v.note.trim().length > 0;
  switch (rule) {
    case 'none': return null;
    case 'code': return code ? null : 'Pick a reason.';
    case 'note': return note ? null : 'Write a note.';
    case 'code-or-note': return code || note ? null : 'Pick a reason or write a note.';
  }
}

/** "Pick one or more reasons, or write a note (required)". */
function prompt(rule: ReasonRule, hasCodes: boolean): string {
  if (!hasCodes) return rule === 'none' ? 'Note (optional)' : 'Note (required)';
  if (rule === 'code') return 'Reasons (pick at least one)';
  if (rule === 'code-or-note') return 'Reasons (pick at least one, or write a note)';
  return 'Reasons';
}

export function ReasonCodePicker({ codes = [], value, required, onChange, noteLabel, autoFocus = false }: {
  codes?: ReasonCode[];
  value: ReasonValue;
  required: ReasonRule;
  onChange(v: ReasonValue): void;
  noteLabel?: string;
  /** Focus the first control when shown (a modal's first field). */
  autoFocus?: boolean;
}) {
  const id = useId();
  const toggle = (c: string) => onChange({ ...value, codes: value.codes.includes(c) ? value.codes.filter((x) => x !== c) : [...value.codes, c] });
  const noteNeeded = required === 'note' || (required === 'code-or-note' && value.codes.length === 0) || (required !== 'none' && !codes.length);
  return (
    <div className="rcp">
      {codes.length > 0 && (
        <fieldset className="rcp-codes">
          <legend className="rcp-l">{prompt(required, true)}</legend>
          <div className="rcp-list">
            {codes.map((c, i) => {
              const on = value.codes.includes(c.id);
              return (
                <button
                  key={c.id} type="button" className={`rcp-code ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(c.id)}
                  data-autofocus={autoFocus && i === 0 ? true : undefined}
                >
                  <span className="rcp-box" aria-hidden>{on && <Check size={11} strokeWidth={2.4} />}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <label className="rcp-note" htmlFor={`${id}-note`}>
        <span className="rcp-l">{noteLabel ?? (codes.length ? (noteNeeded ? 'Note (required)' : 'Note (optional)') : prompt(required, false))}</span>
        <textarea
          id={`${id}-note`} rows={3} value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="In a sentence: why you decided this way."
          data-autofocus={autoFocus && !codes.length ? true : undefined}
        />
      </label>
    </div>
  );
}
