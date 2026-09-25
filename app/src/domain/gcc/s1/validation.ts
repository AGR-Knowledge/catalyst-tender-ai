import type { ValidationItem } from '@/data/gcc/types';
import { firstWithRole } from '@/data/people';
import { DEMO_NOW, durationText, minutesBetween } from '@/domain/gcc/clock';
import { DONE_KEY, json, nowIso, readDone, type AuditDraft, type Done, type DoneWrite, type Stamped } from './done';
import { dataOf } from './common';

/**
 * The intake queue (spec §6.3, plan 007a step 6.2): only the fields the agent
 * would not accept alone, blockers of DG1 first. A conflict shows both values
 * with their pages and the agent does not choose. Sending an item back to the
 * agent keeps it open.
 */

export type ValAction = 'accept' | 'correct' | 'not-stated' | 'pick' | 'send-back';

/** `val:{validationId}`. */
export interface ValValue extends Stamped {
  action: ValAction;
  value?: string;
  pick?: 'value' | 'alt';
  hint?: string;
}

export interface QueueItem {
  item: ValidationItem;
  state: 'open' | 'sent-back' | 'resolved';
  resolution?: ValValue;
  /** The value that stands once resolved. */
  resolvedValue?: string;
  ageMin: number;
  /** "2 h 16 m". */
  ageText: string;
  /** Two values found (`alt`): the agent refuses to choose. */
  conflict: boolean;
  actions: ValAction[];
  sentBackText?: string;
}

export interface QueueGroup { tenderId: string; title: string; shortTitle: string; blocking: number; items: QueueItem[] }

const CONFLICT_ACTIONS: ValAction[] = ['pick', 'correct', 'not-stated', 'send-back'];
const FIELD_ACTIONS: ValAction[] = ['accept', 'correct', 'not-stated', 'send-back'];

/** The standing value of a resolved item. */
function valueOf(item: ValidationItem, v: ValValue): string | undefined {
  switch (v.action) {
    case 'pick': return v.pick === 'alt' ? item.alt?.value : item.value;
    case 'accept': return item.value;
    case 'correct': return v.value;
    case 'not-stated': return 'Not stated';
    default: return undefined;
  }
}

export function queueItem(item: ValidationItem, done: Done): QueueItem {
  const v = readDone<ValValue>(done, DONE_KEY.val(item.id));
  const conflict = Boolean(item.alt);
  const ageMin = minutesBetween(item.raisedAt, DEMO_NOW);
  const common = { item, ageMin, ageText: durationText(ageMin), conflict, actions: conflict ? CONFLICT_ACTIONS : FIELD_ACTIONS };
  if (!v) return { ...common, state: 'open' };
  if (v.action === 'send-back') {
    const text = item.alt
      ? `Sent back to the agent with a hint. It re-read pp. ${item.page} and ${item.alt.page} and still found two values: a person must choose.`
      : `Sent back to the agent with a hint. It re-read p. ${item.page} and could not confirm the value: a person must decide.`;
    return { ...common, state: 'sent-back', resolution: v, sentBackText: text };
  }
  return { ...common, state: 'resolved', resolution: v, resolvedValue: valueOf(item, v) };
}

const isOpen = (q: QueueItem) => q.state !== 'resolved';
const order = (a: QueueItem, b: QueueItem) => Number(b.item.blocksDg1) - Number(a.item.blocksDg1) || a.item.raisedAt.localeCompare(b.item.raisedAt);

/** Every validation item of one tender, with its state. */
export function validationsOf(tenant: string, tenderId: string, done: Done): QueueItem[] {
  const t = dataOf(tenant).register.find((x) => x.id === tenderId);
  return (t?.validations ?? []).map((v) => queueItem(v, done)).sort(order);
}

/** Open items (including sent back), grouped by tender: groups with DG1 blockers first, then oldest. */
export function queueFor(tenant: string, done: Done): QueueGroup[] {
  const groups = dataOf(tenant).register
    .map((t) => ({ tenderId: t.id, title: t.title, shortTitle: t.shortTitle, items: t.validations.map((v) => queueItem(v, done)).filter(isOpen).sort(order) }))
    .filter((g) => g.items.length)
    .map((g) => ({ ...g, blocking: g.items.filter((q) => q.item.blocksDg1).length }));
  return groups.sort((a, b) => Number(b.blocking > 0) - Number(a.blocking > 0) || a.items[0].item.raisedAt.localeCompare(b.items[0].item.raisedAt));
}

/** The value a validation item stands at: the resolved one, or null while it is open. */
export function resolvedValue(tenant: string, tenderId: string, validationId: string, done: Done): string | null {
  const q = validationsOf(tenant, tenderId, done).find((x) => x.item.id === validationId);
  return q?.state === 'resolved' ? q.resolvedValue ?? null : null;
}

// ---------------------------------------------------------------------------
// Actions (step 6.2.3)

export interface ValidationInput { value?: string; pick?: 'value' | 'alt'; hint?: string; at?: string }

/**
 * The write and audit entry for one queue action. A conflict can be picked,
 * corrected, marked not stated or sent back, never accepted; a correction keeps
 * the extracted value in the audit detail.
 */
export function validationAction(item: ValidationItem, action: ValAction, input: ValidationInput, byId: string): DoneWrite & { audit: AuditDraft } {
  const allowed = item.alt ? CONFLICT_ACTIONS : FIELD_ACTIONS;
  if (!allowed.includes(action)) throw new Error(`"${action}" is not offered for ${item.id}${item.alt ? ': the agent does not choose between two values' : ''}`);
  if (action === 'pick' && !input.pick) throw new Error('Pick needs the value chosen');
  if (action === 'correct' && !input.value) throw new Error('Correct needs the corrected value');

  const at = input.at ?? nowIso();
  const value: ValValue = {
    action, at, byId,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.pick ? { pick: input.pick } : {}),
    ...(input.hint ? { hint: input.hint } : {}),
  };
  const target = `${item.tenderId} · ${item.field}`;
  const extracted = `${item.value} (p. ${item.page})`;
  let audit: AuditDraft;
  switch (action) {
    case 'pick': {
      const [chosen, other] = input.pick === 'alt'
        ? [{ value: item.alt!.value, page: item.alt!.page }, { value: item.value, page: item.page }]
        : [{ value: item.value, page: item.page }, { value: item.alt!.value, page: item.alt!.page }];
      audit = { action: 'Resolved conflict', target, detail: `${item.field} = ${chosen.value} (p. ${chosen.page}); ${other.value} (p. ${other.page}) kept on record` };
      break;
    }
    case 'accept': audit = { action: 'Accepted field', target, detail: `${item.field} = ${extracted}` }; break;
    case 'correct': audit = { action: 'Corrected field', target, detail: `${item.field} = ${input.value}; extracted value ${extracted} kept on record` }; break;
    case 'not-stated': audit = { action: 'Marked not stated', target, detail: `${item.field}; extracted value ${extracted} kept on record` }; break;
    default: audit = { action: 'Sent back to the agent', target, detail: `${item.field}${input.hint ? `, with the hint "${input.hint}"` : ''}: the item stays open` };
  }
  return { key: DONE_KEY.val(item.id), value: json(value), audit };
}

// ---------------------------------------------------------------------------
// The DG1 lock and the queue header (steps 6.2.4, 6.2.5)

export interface BlockingOpen { count: number; coordinatorId?: string; coordinatorName?: string; text: string }

/** Open items that block DG1 on one tender, with the Coordinator's name for the lock text. */
export function blockingOpen(tenant: string, tenderId: string, done: Done): BlockingOpen {
  const count = validationsOf(tenant, tenderId, done).filter((q) => isOpen(q) && q.item.blocksDg1).length;
  const coord = firstWithRole(tenant, 'coord');
  return {
    count, coordinatorId: coord?.id, coordinatorName: coord?.name,
    text: count ? `${count} field${count === 1 ? '' : 's'} still being validated${coord ? ` by ${coord.name}` : ''}` : 'No fields block DG1',
  };
}

export interface QueueStats { open: number; blocking: number; oldestMin: number | null; oldestText: string | null; text: string }

/** INT-5: "6 · 2 block DG1 · oldest 2 h 16 m". */
export function queueStats(tenant: string, done: Done): QueueStats {
  const items = queueFor(tenant, done).flatMap((g) => g.items);
  const blocking = items.filter((q) => q.item.blocksDg1).length;
  const oldestMin = items.length ? Math.max(...items.map((q) => q.ageMin)) : null;
  const oldestText = oldestMin === null ? null : durationText(oldestMin);
  return {
    open: items.length, blocking, oldestMin, oldestText,
    text: items.length ? `${items.length} · ${blocking} block DG1 · oldest ${oldestText}` : 'No fields to check',
  };
}
