import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Copy, Send } from 'lucide-react';
import type { CanResult } from '@/data/access';
import { INPUT_SPECS, type InputField, type InputKey } from '@/data/gcc/s3';
import type { Ccy } from '@/data/gcc/fx';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { useDemo } from '@/state/store';
import { money } from '@/domain/money';
import { dayText, inputFields, inputSubmitWrite, inputsFor, isWriteError, myRequests, stampText, validateInput } from '@/domain/gcc/s3';
import { Card, CardHead } from '@/components/ui/primitives';
import { Masked } from '@/components/tender/Masked';
import { holdersOf } from '@/data/access';
import { InputState } from './sections/Inputs';
import './s3.css';

/**
 * The focused contributor form (catalogue §C.6), opened from My requests at
 * `?tab=inputs&input={key}`: the input's fields from `INPUT_SPECS`, checked
 * with `validateInput` and submitted with `inputSubmitWrite`, so the pack
 * section it feeds updates at once. Only the owner submits; others read, and
 * only what the pack would show them.
 */

type Fields = Record<string, unknown>;
type Row = Record<string, unknown>;

const MILLION = 1_000_000;

/** A money amount as the form edits it: millions, one decimal place at most. */
const toMillions = (amount: unknown) => (typeof amount === 'number' ? String(Math.round((amount / MILLION) * 10) / 10) : '');
const numOr = (s: string): number | undefined => (s.trim() === '' ? undefined : Number(s));

/** Blank values for a new form. */
function blank(fields: InputField[], ccy: Ccy): Fields {
  return Object.fromEntries(fields.map((f) => [f.name, f.kind === 'money' ? { amount: undefined, ccy } : f.kind === 'list' ? [] : f.kind === 'range' ? [undefined, undefined] : '']));
}

/** What the form submits: empty rows dropped, blank optional fields left out. */
function clean(fields: InputField[], v: Fields): Fields {
  const out: Fields = {};
  for (const f of fields) {
    let x = v[f.name];
    if (f.kind === 'list') {
      x = (x as unknown[]).filter((it) => (f.item ? Object.values(it as Row).some((c) => c !== '' && c !== undefined) : String(it).trim() !== ''));
    }
    if (f.optional && (x === '' || x === undefined)) continue;
    out[f.name] = x;
  }
  return out;
}

export function InputForm({ tenant, tenderId, inputKey, respond, canSeeFields, onClose }: {
  tenant: string;
  tenderId: string;
  inputKey: InputKey;
  /** `can('input.respond', { ownerId })`: only the owner submits. */
  respond: CanResult;
  /** Others read the fields only where the pack would show them (`see.margin`). */
  canSeeFields: boolean;
  onClose(): void;
}) {
  const { state, mark, logAudit } = useDemo();
  const { person, done } = state;
  const spec = INPUT_SPECS[inputKey];
  const item = useMemo(() => inputsFor(tenant, tenderId, done).items.find((i) => i.key === inputKey), [tenant, tenderId, done, inputKey]);
  const ccy: Ccy = isGccTenantKey(tenant) ? gccData(tenant).fit.band.min.ccy : 'SAR';
  const isOwner = !!item && item.ownerId === person.id;
  const submitted = useMemo(() => inputFields(tenant, tenderId, inputKey, done), [tenant, tenderId, inputKey, done]);
  // The owner's last answer to the same input on another tender: Finance's facility rarely changes between bids.
  const last = useMemo(() => {
    if (!isOwner) return null;
    const r = myRequests(tenant, person.id, done).find((x) => x.key === inputKey && x.state === 'submitted' && x.tenderId !== tenderId);
    const f = r ? inputFields(tenant, r.tenderId, inputKey, done) : null;
    return r && f ? { tenderId: r.tenderId, fields: f } : null;
  }, [isOwner, tenant, person.id, done, inputKey, tenderId]);

  const [v, setV] = useState<Fields>(() => submitted ?? blank(spec.fields, ccy));
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => { setV(submitted ?? blank(spec.fields, ccy)); setErrors([]); }, [inputKey, tenderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) {
    return (
      <Card>
        <CardHead title={spec.label} meta={<button type="button" className="btn btn-sm" onClick={onClose}>Close</button>} />
        <p className="in-form pk-empty">This input has not been requested for {tenderId}.</p>
      </Card>
    );
  }

  const set = (name: string, x: unknown) => setV((p) => ({ ...p, [name]: x }));
  const submit = () => {
    const fields = clean(spec.fields, v);
    const errs = validateInput(inputKey, fields);
    setErrors(errs);
    if (errs.length) return;
    const w = inputSubmitWrite(tenderId, inputKey, fields, person.id);
    if (isWriteError(w)) { setErrors([w.error]); return; }
    mark(w.key, `${spec.label} submitted. Pack ${spec.feeds} is updated.`, 'green', w.value);
    logAudit(w.audit);
  };

  const editable = isOwner && respond.ok;
  const readFields = submitted && (isOwner || canSeeFields) ? submitted : null;

  return (
    <Card className="in-card">
      <CardHead
        title={isOwner ? `Your input: ${spec.label}` : spec.label}
        meta={<button type="button" className="btn btn-sm" onClick={onClose}>Close</button>}
      />
      <div className="in-form">
        <div className="in-form-h">
          <span>For the Bid / No-Bid pack, <b className="mono">{spec.feeds}</b></span>
          <span>Asked by {item.requestedByName} · {stampText(item.requestedAt)}</span>
          <span>Due {stampText(item.due)}</span>
          <InputState i={item} />
          <span>{item.dueText}</span>
        </div>

        {editable ? (
          <>
            {last && (
              <div className="pk-acts in-copy">
                <button type="button" className="btn btn-sm" onClick={() => { setV({ ...blank(spec.fields, ccy), ...last.fields }); setErrors([]); }}>
                  <Copy size={12} aria-hidden />Start from your answer on {last.tenderId}
                </button>
                <span className="pk-why">Then change what differs for this bid.</span>
              </div>
            )}
            <div className="in-grid">
              {spec.fields.map((f) => <FieldEditor key={f.name} f={f} value={v[f.name]} onChange={(x) => set(f.name, x)} ccy={ccy} />)}
            </div>
            {errors.length > 0 && <ul className="in-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
            <div className="pk-acts">
              <button type="button" className="btn btn-primary" onClick={submit}><Send size={13} aria-hidden />{submitted ? 'Update my input' : 'Submit input'}</button>
              <span className="pk-why">Recorded with your name and the time. The pack section updates at once.</span>
            </div>
          </>
        ) : (
          <>
            {!isOwner && <p className="pk-note">{item.ownerName} answers this input. {respond.ok ? '' : respond.reason ? `${respond.reason}.` : ''}</p>}
            {isOwner && !respond.ok && <p className="pk-note">{respond.reason}.</p>}
            {readFields ? <FieldsRead fields={spec.fields} value={readFields} />
              : item.state === 'submitted' ? <Masked by={holdersOf('see.margin')} />
              : <p className="pk-empty">Not submitted yet.</p>}
          </>
        )}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- editors */

function FieldEditor({ f, value, onChange, ccy }: { f: InputField; value: unknown; onChange(v: unknown): void; ccy: Ccy }) {
  const id = `in-${f.name}`;
  const label = <span className="s3-l">{f.label}{f.optional ? ' (optional)' : ''}</span>;
  const wide = f.kind === 'list' || f.kind === 'text';
  switch (f.kind) {
    case 'range': {
      const [lo, hi] = (Array.isArray(value) ? value : [undefined, undefined]) as [number | undefined, number | undefined];
      return (
        <div className="s3-field">
          {label}
          <span className="in-range">
            <input id={id} type="number" step="0.1" aria-label={`${f.label}: low`} value={lo ?? ''} onChange={(e) => onChange([numOr(e.target.value), hi])} />
            <span className="in-unit">to</span>
            <input type="number" step="0.1" aria-label={`${f.label}: high`} value={hi ?? ''} onChange={(e) => onChange([lo, numOr(e.target.value)])} />
            <span className="in-unit">%</span>
          </span>
        </div>
      );
    }
    case 'number':
      return <label className="s3-field">{label}<input id={id} type="number" value={typeof value === 'number' ? value : ''} onChange={(e) => onChange(numOr(e.target.value))} /></label>;
    case 'date':
      return <label className="s3-field">{label}<input id={id} type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} /></label>;
    case 'text':
      return <label className={`s3-field ${wide ? 'wide' : ''}`}>{label}<textarea id={id} rows={2} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} /></label>;
    case 'choice':
      return (
        <fieldset className="s3-field">
          <legend className="s3-l">{f.label}</legend>
          <div className="s3-seg" role="radiogroup" aria-label={f.label}>
            {(f.options ?? []).map((o) => <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
          </div>
        </fieldset>
      );
    case 'money': {
      const m = (value && typeof value === 'object' ? value : { ccy }) as { amount?: number; ccy: string };
      return (
        <div className="s3-field">
          {label}
          <span className="in-money">
            <span className="in-unit">{m.ccy}</span>
            <input id={id} type="number" step="0.1" aria-label={`${f.label}, ${m.ccy} millions`} value={toMillions(m.amount)} onChange={(e) => { const n = numOr(e.target.value); onChange({ ccy: m.ccy, amount: n === undefined ? undefined : Math.round(n * MILLION) }); }} />
            <span className="in-unit">M</span>
            {typeof m.amount === 'number' && <span className="in-unit">= {money(m.amount, m.ccy as Ccy)}</span>}
          </span>
        </div>
      );
    }
    case 'list':
      return <ListEditor f={f} value={Array.isArray(value) ? value : []} onChange={onChange} />;
  }
}

function ListEditor({ f, value, onChange }: { f: InputField; value: unknown[]; onChange(v: unknown[]): void }) {
  const rows = value.length ? value : [f.item ? {} : ''];
  const upd = (i: number, x: unknown) => onChange(rows.map((r, j) => (j === i ? x : r)));
  const add = () => onChange([...rows, f.item ? {} : '']);
  const del = (i: number) => onChange(rows.filter((_, j) => j !== i));
  return (
    <div className="s3-field wide">
      <span className="s3-l">{f.label}</span>
      <div className="in-listrows">
        {rows.map((r, i) => (
          <div key={i} className={`in-listrow ${f.item ? '' : 'simple'}`}>
            {f.item ? f.item.map((c) => {
              const cv = (r as Row)[c.name];
              const aria = `${f.label}, item ${i + 1}, ${c.label}`;
              if (c.kind === 'choice') {
                return (
                  <select key={c.name} aria-label={aria} value={typeof cv === 'string' ? cv : ''} onChange={(e) => upd(i, { ...(r as Row), [c.name]: e.target.value })}>
                    <option value="">{c.label}…</option>
                    {(c.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                );
              }
              const type = c.kind === 'number' ? 'number' : c.kind === 'date' ? 'date' : 'text';
              return (
                <input
                  key={c.name} type={type} aria-label={aria} placeholder={c.label}
                  value={cv === undefined || cv === null ? '' : String(cv)}
                  onChange={(e) => upd(i, { ...(r as Row), [c.name]: c.kind === 'number' ? numOr(e.target.value) : e.target.value })}
                />
              );
            }) : (
              <input aria-label={`${f.label}, item ${i + 1}`} value={String(r ?? '')} onChange={(e) => upd(i, e.target.value)} />
            )}
            <button type="button" className="btn btn-sm" onClick={() => del(i)} aria-label={`Remove item ${i + 1}`}><X size={12} aria-hidden /></button>
          </div>
        ))}
      </div>
      <div><button type="button" className="btn btn-sm" onClick={add}><Plus size={12} aria-hidden />Add</button></div>
    </div>
  );
}

/* ---------------------------------------------------------------- read only */

function valueText(kind: InputField['kind'], v: unknown, options?: InputField['options']): string {
  if (v === undefined || v === null || v === '') return 'Not given';
  switch (kind) {
    case 'range': return Array.isArray(v) ? `${v[0]}–${v[1]}%` : String(v);
    case 'money': { const m = v as { amount: number; ccy: Ccy }; return money(m.amount, m.ccy); }
    case 'date': return dayText(String(v));
    case 'choice': return options?.find((o) => o.value === v)?.label ?? String(v);
    case 'number': return typeof v === 'number' ? v.toLocaleString('en-GB') : String(v);
    default: return String(v);
  }
}

export function FieldsRead({ fields, value }: { fields: InputField[]; value: Fields }) {
  return (
    <div className="in-read">
      {fields.map((f) => {
        const v = value[f.name];
        return (
          <div key={f.name} className="pk-row">
            <span className="pk-k">{f.label}</span>
            <span className="pk-v">
              {f.kind === 'list' && Array.isArray(v) ? (
                <ul className="pk-list plain">
                  {v.map((it, i) => (
                    <li key={i}>{f.item ? f.item.map((c) => valueText(c.kind, (it as Row)[c.name], c.options)).join(' · ') : String(it)}</li>
                  ))}
                </ul>
              ) : valueText(f.kind, v, f.options)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
