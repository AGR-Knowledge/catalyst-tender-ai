import { HERO_ID, HERO_REF } from '@/data/gcc/hero';
import type { KeyDateKind } from '@/data/gcc/types';
import { s1Data, type Addendum, type AddendumChange } from '@/data/gcc/s1';
import { dataOf, keyDate, listText, plural, shortDate, shortWhen, tenderOf } from './common';

/**
 * Addenda and duplicates (spec §6.8, plan 007a Phase 5). An addendum links to
 * its parent, shows what changed, re-runs eligibility and fit, re-flags the
 * Stage 2 packages it touches and marks a Stage 3 pack stale. Plan 009a imports
 * `addendaFor`; keep its name and shape stable.
 */

const DATE_LABEL: Partial<Record<KeyDateKind, string>> = {
  purchase: 'Document purchase', participation: 'Participation confirmation', 'site-visit': 'Site visit', 'pre-bid': 'Pre-bid meeting',
  questions: 'Questions deadline', answers: 'Answers to questions', submission: 'Submission', originals: 'Originals delivered', opening: 'Bid opening',
  'validity-end': 'Bid validity ends', 'bond-validity-end': 'Initial guarantee valid to',
};

/** Dates that move the eligibility check (certificates are checked at opening or submission). */
const ELIGIBILITY_DATES = new Set<KeyDateKind>(['opening', 'submission', 'validity-end']);

export interface AddendumVM extends Addendum {
  diff: {
    dates: (Extract<AddendumChange, { kind: 'date' }> & { label: string })[];
    /** Said in words when no date moves: "No date changes: the submission stays Sun 26 Apr 10:00". */
    datesNote?: string;
    boq: Extract<AddendumChange, { kind: 'boq' }>[];
    clauses: Extract<AddendumChange, { kind: 'clause' }>[];
  };
  effects: string[];
  /** The Stage 3 pack was issued before the addendum arrived. */
  packStale: boolean;
}

/** Received addenda of one tender, oldest first, with their diff and effects. */
export function addendaFor(tenant: string, tenderId: string): AddendumVM[] {
  const t = tenderOf(tenant, tenderId);
  return s1Data(tenant).addenda
    .filter((a) => a.tenderId === tenderId)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    .map((a) => {
      const dates = a.changes.flatMap((c) => (c.kind === 'date' ? [{ ...c, label: DATE_LABEL[c.field] ?? c.field }] : []));
      const boq = a.changes.flatMap((c) => (c.kind === 'boq' ? [c] : []));
      const clauses = a.changes.flatMap((c) => (c.kind === 'clause' ? [c] : []));
      const sub = t ? keyDate(t, 'submission') : undefined;
      const datesNote = dates.length || !sub ? undefined : `No date changes: the submission stays ${shortDate(sub.date)}${sub.time ? ` ${sub.time}` : ''}`;

      const effects: string[] = [];
      const moved = dates.filter((d) => ELIGIBILITY_DATES.has(d.field));
      effects.push(moved.length
        ? `Eligibility and fit re-checked against the new ${listText(moved.map((d) => d.label.toLowerCase()))} date`
        : 'Eligibility and fit re-checked: no change');

      const byPackage = new Map<string, string[]>();
      for (const c of boq) {
        if (!c.packageId) continue;
        const topics = byPackage.get(c.packageId) ?? [];
        const topic = c.topic ?? `item ${c.item}`;
        if (!topics.includes(topic)) topics.push(topic);
        byPackage.set(c.packageId, topics);
      }
      const suppliers = (a.requote ?? []).reduce((s, q) => s + q.suppliers, 0);
      if (byPackage.size) {
        const what = [...byPackage].map(([pkg, topics]) => `${listText(topics)} in Package ${pkg}`);
        effects.push(`Addendum ${a.no} changes ${listText(what)}${suppliers ? `: re-quote ${plural(suppliers, 'supplier')}` : ''}`);
      }
      const packStale = Boolean(t?.packIssuedAt && t.packIssuedAt < a.receivedAt);
      if (packStale) effects.push(`Bid / No-Bid pack marked stale since ${shortWhen(a.receivedAt)}`);

      return { ...a, diff: { dates, ...(datesNote ? { datesNote } : {}), boq, clauses }, effects, packStale };
    });
}

/** "Addendum 2 applied", or null when none has been received. */
export function latestAddendumBadge(tenant: string, tenderId: string): string | null {
  const all = addendaFor(tenant, tenderId);
  const last = all[all.length - 1];
  return last ? `Addendum ${last.no} applied` : null;
}

// ---------------------------------------------------------------------------
// Register match for upload and intake (step 5.3)

export interface RegisterMatch {
  kind: 'new' | 'duplicate' | 'addendum';
  tenderId?: string;
  why: string;
  /** Same title as a register row under a new reference: ask whether it is a re-tender. Never merged. */
  askRetender?: string;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const parentRef = (ref: string) => ref.replace(/[,;\s]*addendum\b.*$/i, '').trim();

/** Every reference the tenant's register knows, with its tender. */
function knownRefs(tenant: string): { ref: string; tenderId: string }[] {
  const d = dataOf(tenant);
  const refs: { ref: string; tenderId: string }[] = [];
  const add = (ref: string, tenderId: string) => { if (!refs.some((r) => norm(r.ref) === norm(ref))) refs.push({ ref, tenderId }); };
  if (d.register.some((t) => t.id === HERO_ID)) add(HERO_REF, HERO_ID);
  for (const e of d.intakeToday) if (e.tenderId && e.ref !== 'Restricted') add(e.ref, e.tenderId);
  for (const a of s1Data(tenant).addenda) { add(a.ref, a.tenderId); add(parentRef(a.ref), a.tenderId); }
  return refs;
}

/**
 * Is an incoming document new, a duplicate of a register row, or an addendum
 * to one? Exact references only: a re-tender under a new reference is asked
 * about, never merged on its title (spec §6.8).
 */
export function registerMatch(tenant: string, ref: string, title: string): RegisterMatch {
  const d = dataOf(tenant);
  const refs = knownRefs(tenant);
  const shortOf = (id: string) => d.register.find((t) => t.id === id)?.shortTitle ?? id;

  const exact = refs.find((r) => norm(r.ref) === norm(ref));
  if (exact) {
    return { kind: 'duplicate', tenderId: exact.tenderId, why: `Same reference as ${exact.tenderId} (${shortOf(exact.tenderId)}): one record, with both sources listed in Documents` };
  }
  if (/addendum/i.test(ref)) {
    const parent = refs.find((r) => norm(r.ref) === norm(parentRef(ref)));
    if (parent) return { kind: 'addendum', tenderId: parent.tenderId, why: `Addendum to ${parentRef(ref)}: linked to ${parent.tenderId} (${shortOf(parent.tenderId)})` };
  }
  const sameTitle = d.register.find((t) => norm(t.title) === norm(title) || norm(t.shortTitle) === norm(title));
  return sameTitle
    ? { kind: 'new', askRetender: sameTitle.id, why: `New reference. ${sameTitle.id} has the same title: is this a re-tender? It is not merged automatically.` }
    : { kind: 'new', why: 'New reference: not on the register' };
}
