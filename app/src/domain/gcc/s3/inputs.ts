import { gccData, isGccTenantKey } from '@/data/gcc';
import { personById } from '@/data/people';
import { INPUT_KEYS, INPUT_SPECS, SEEDED_INPUTS, type InputField, type InputKey } from '@/data/gcc/s3';
import { durationText, minutesBetween } from '@/domain/gcc/clock';
import { keysWithPrefix, nowIso, readDone, stampText, type Done, type WriteError, type WriteResult } from './done';

/**
 * Contributor inputs (pack §9.9, DEC-7, catalogue §C.6): the seeded requests
 * merged with `input-req:{TID}:{key}` (a new or repeated request) and
 * `input-sub:{TID}:{key}` (the contributor's answer). An input is late when
 * it is past due and not submitted.
 */

export interface InputReqValue { toId: string; due: string; at: string; byId: string }
export interface InputSubValue { fields: Record<string, unknown>; at: string; byId: string }

export type InputState = 'submitted' | 'outstanding' | 'late';

export interface InputItem {
  key: InputKey;
  label: string;
  feeds: string;
  ownerId: string;
  ownerName: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  due: string;
  state: InputState;
  /** "Submitted 05 Mar 15:20", "Late by 17 h", "7 h left". */
  dueText: string;
  submittedAt?: string;
  fields?: Record<string, unknown>;
  /** Plan 017's item id, for seeded inputs. */
  itemId?: string;
  /** What `nudgeWrite` takes: 017's item id when there is one (plan 015's pattern). */
  nudgeTarget: string;
  nudged: boolean;
}

export interface InputsVM {
  tenderId: string;
  items: InputItem[];
  totals: { requested: number; outstanding: number; late: number };
}

const nameOf = (id: string) => personById(id)?.name ?? id;

function dueTextOf(state: InputState, due: string, submittedAt?: string): string {
  if (state === 'submitted') return submittedAt ? `Submitted ${stampText(submittedAt)}` : 'Submitted';
  const left = minutesBetween(nowIso(), due);
  return left < 0 ? `Late by ${durationText(-left)}` : `${durationText(left)} left`;
}

export function inputsFor(tenant: string, tenderId: string, done: Done): InputsVM {
  const seeded = SEEDED_INPUTS.filter((i) => i.tenant === tenant && i.tenderId === tenderId);
  const reqPrefix = `input-req:${tenderId}:`;
  const requested = new Set<InputKey>([
    ...seeded.map((i) => i.key),
    ...keysWithPrefix(done, reqPrefix).map((k) => k.slice(reqPrefix.length) as InputKey).filter((k) => k in INPUT_SPECS),
  ]);

  const items = INPUT_KEYS.filter((k) => requested.has(k)).map((key): InputItem => {
    const spec = INPUT_SPECS[key];
    const seed = seeded.find((i) => i.key === key);
    const req = readDone<InputReqValue>(done, `input-req:${tenderId}:${key}`);
    const sub = readDone<InputSubValue>(done, `input-sub:${tenderId}:${key}`);
    const ownerId = req?.toId ?? seed!.ownerId;
    const due = req?.due ?? seed!.due;
    const submittedAt = sub?.at ?? seed?.submittedAt;
    const fields = sub?.fields ?? seed?.fields;
    const state: InputState = submittedAt ? 'submitted' : minutesBetween(nowIso(), due) < 0 ? 'late' : 'outstanding';
    const requestedById = req?.byId ?? seed!.requestedById;
    const nudgeTarget = seed?.itemId ?? `${tenderId}:${key}`;
    return {
      key, label: spec.label, feeds: spec.feeds,
      ownerId, ownerName: nameOf(ownerId),
      requestedById, requestedByName: nameOf(requestedById),
      requestedAt: req?.at ?? seed!.requestedAt,
      due, state, dueText: dueTextOf(state, due, submittedAt),
      ...(submittedAt ? { submittedAt } : {}),
      ...(fields ? { fields } : {}),
      ...(seed?.itemId ? { itemId: seed.itemId } : {}),
      nudgeTarget,
      nudged: done[`nudged:${nudgeTarget}`] === 'yes',
    };
  });

  return {
    tenderId,
    items,
    totals: {
      requested: items.length,
      outstanding: items.filter((i) => i.state !== 'submitted').length,
      late: items.filter((i) => i.state === 'late').length,
    },
  };
}

/** The submitted fields of one input, or null. */
export function inputFields(tenant: string, tenderId: string, key: InputKey, done: Done): Record<string, unknown> | null {
  const item = inputsFor(tenant, tenderId, done).items.find((i) => i.key === key);
  return item?.state === 'submitted' && item.fields ? item.fields : null;
}

// ---------------------------------------------------------------------------
// Field validation against INPUT_SPECS

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function kindError(kind: InputField['kind'], label: string, v: unknown, options?: InputField['options']): string | null {
  switch (kind) {
    case 'range':
      return Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]) && v[0] <= v[1] ? null : `${label}: give a low and a high value, low first`;
    case 'text':
      return isText(v) ? null : `${label}: add some text`;
    case 'choice':
      return typeof v === 'string' && (options ?? []).some((o) => o.value === v) ? null : `${label}: pick one of the options`;
    case 'money': {
      const m = v as { amount?: unknown; ccy?: unknown } | null;
      return m && typeof m === 'object' && isNum(m.amount) && m.amount >= 0 && typeof m.ccy === 'string' ? null : `${label}: give an amount and a currency`;
    }
    case 'date':
      return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : `${label}: give a date`;
    case 'number':
      return isNum(v) ? null : `${label}: give a number`;
    case 'list':
      return Array.isArray(v) && v.length > 0 ? null : `${label}: add at least one item`;
  }
}

/** Errors in `fields` against the input's spec; empty when valid. */
export function validateInput(key: InputKey, fields: Record<string, unknown>): string[] {
  const spec = INPUT_SPECS[key];
  if (!spec) return [`No input called "${key}"`];
  const errors: string[] = [];
  for (const name of Object.keys(fields)) if (!spec.fields.some((f) => f.name === name)) errors.push(`"${name}" is not a field of ${spec.label}`);
  for (const f of spec.fields) {
    const v = fields[f.name];
    if (v === undefined || v === null || v === '') {
      if (!f.optional) errors.push(`${f.label} is needed`);
      continue;
    }
    const e = kindError(f.kind, f.label, v, f.options);
    if (e) { errors.push(e); continue; }
    if (f.kind === 'list') {
      (v as unknown[]).forEach((item, i) => {
        if (!f.item) {
          if (!isText(item)) errors.push(`${f.label}, item ${i + 1}: add some text`);
          return;
        }
        if (!item || typeof item !== 'object') { errors.push(`${f.label}, item ${i + 1}: fill in every column`); return; }
        for (const col of f.item) {
          const ce = kindError(col.kind, `${f.label}, item ${i + 1}, ${col.label}`, (item as Record<string, unknown>)[col.name], col.options);
          if (ce) errors.push(ce);
        }
      });
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Writers

export function inputRequestWrite(tenderId: string, key: InputKey, toId: string, due: string, byId: string): WriteResult | WriteError {
  const spec = INPUT_SPECS[key];
  if (!spec) return { error: `No input called "${key}"` };
  if (!toId) return { error: 'Choose who the request goes to' };
  if (!due) return { error: 'Set a due date and time' };
  const value: InputReqValue = { toId, due, at: nowIso(), byId };
  return {
    key: `input-req:${tenderId}:${key}`,
    value: JSON.stringify(value),
    audit: { actorId: byId, action: 'Input requested', target: tenderId, detail: `${spec.label} (${spec.feeds}) from ${nameOf(toId)}, due ${stampText(due)}` },
  };
}

export function inputSubmitWrite(tenderId: string, key: InputKey, fields: Record<string, unknown>, byId: string): WriteResult | WriteError {
  const errors = validateInput(key, fields);
  if (errors.length) return { error: errors.join('. ') };
  const spec = INPUT_SPECS[key];
  const value: InputSubValue = { fields, at: nowIso(), byId };
  return {
    key: `input-sub:${tenderId}:${key}`,
    value: JSON.stringify(value),
    audit: { actorId: byId, action: 'Input submitted', target: tenderId, detail: `${spec.label}, for ${spec.feeds}` },
  };
}

/** `nudged:{target}` = 'yes' (plan 015's pattern). */
export function nudgeWrite(target: string, byId: string, detail?: string): WriteResult {
  return { key: `nudged:${target}`, value: 'yes', audit: { actorId: byId, action: 'Nudged', target, ...(detail ? { detail } : {}) } };
}

// ---------------------------------------------------------------------------
// My requests (catalogue §C.6), for one contributor

export interface RequestRow {
  tenderId: string;
  tender: string;
  key: InputKey;
  what: string;
  section: string;
  requestedById: string;
  requestedBy: string;
  due: string;
  dueText: string;
  state: InputState;
  submittedAt?: string;
}

const STATE_ORDER: Record<InputState, number> = { late: 0, outstanding: 1, submitted: 2 };

export function myRequests(tenant: string, personId: string, done: Done): RequestRow[] {
  if (!isGccTenantKey(tenant)) return [];
  const register = gccData(tenant).register;
  const tenderIds = new Set([
    ...SEEDED_INPUTS.filter((i) => i.tenant === tenant).map((i) => i.tenderId),
    ...keysWithPrefix(done, 'input-req:').map((k) => k.split(':')[1]),
  ]);
  return [...tenderIds]
    .flatMap((tid) => inputsFor(tenant, tid, done).items.filter((i) => i.ownerId === personId).map((i): RequestRow => ({
      tenderId: tid,
      tender: register.find((t) => t.id === tid)?.title ?? tid,
      key: i.key, what: i.label, section: i.feeds,
      requestedById: i.requestedById, requestedBy: i.requestedByName,
      due: i.due, dueText: i.dueText, state: i.state,
      ...(i.submittedAt ? { submittedAt: i.submittedAt } : {}),
    })))
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.due.localeCompare(b.due) || a.tenderId.localeCompare(b.tenderId));
}
