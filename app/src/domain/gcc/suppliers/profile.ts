import type { Tone } from '@/data/types';
import { personById, type Person } from '@/data/people';
import { RESCREEN_DAYS, type Supplier, type Trade } from '@/data/gcc/s2';
import { DEMO_TODAY, addDays } from '@/domain/calendar';
import { queriesFor } from '../lifecycle.port';
import {
  heldByScreening, isOverdue, liveS2Tenders, rfqsFor, s2TenderOf, screeningOf, sentBy, suppliersOf,
  type Done, type HeldRow, type LiveRfq, type Screening,
} from '../s2';
import { countryName } from '../company';

/**
 * The supplier master (plan 027c, catalogue §D Suppliers): each supplier with
 * its screening, approvals, performance and the RFQs it has open with the
 * company on live tenders. Read only, over plan 008a's rules: `screeningOf`,
 * `heldByScreening`, `liveS2Tenders`, `rfqsFor`. It carries no quoted price,
 * rate or package value: counts, dates and states only.
 */

/** "hv" → "HV", "chem-dosing" → "Chem dosing". */
export function tradeLabel(t: Trade | string): string {
  if (/^(hv|lv|ica|grp|cipp|cctv|tbm|bms|hvac)$/i.test(t)) return t.toUpperCase();
  const w = t.replace(/-/g, ' ');
  return w[0].toUpperCase() + w.slice(1);
}

/** The issuer's short name where the register gives one: "Eastern Cities Water Services (ECWS)" → "ECWS". */
export const avlShort = (client: string) => /\(([^)]+)\)$/.exec(client)?.[1] ?? client;

export const SCREENING_TONE: Record<Screening['state'], Tone> = { current: 'green', due: 'orange', blocked: 'red' };

export const PREQUAL_LABEL: Record<Supplier['prequal'], { label: string; tone: Tone }> = {
  approved: { label: 'Prequalified', tone: 'green' },
  pending: { label: 'Prequalification pending', tone: 'orange' },
  none: { label: 'Not prequalified', tone: 'grey' },
};

export const LOAD_LABEL: Record<Supplier['load'], { label: string; tone: Tone }> = {
  low: { label: 'Low', tone: 'green' }, medium: { label: 'Medium', tone: 'ink' }, high: { label: 'High', tone: 'orange' },
};

/** The four words an RFQ reads in the supplier's sheet. */
export type RfqState = 'replied' | 'due' | 'overdue' | 'declined';
export const RFQ_STATE: Record<RfqState, { label: string; tone: Tone }> = {
  replied: { label: 'Replied', tone: 'green' }, due: { label: 'Due', tone: 'ink' }, overdue: { label: 'Overdue', tone: 'orange' }, declined: { label: 'Declined', tone: 'grey' },
};

export const rfqStateOf = (r: LiveRfq): RfqState => (r.declined ? 'declined' : r.repliedAt ? 'replied' : isOverdue(r) ? 'overdue' : 'due');

export interface SupplierRfqVM {
  id: string;
  tenderId: string;
  /** Null when the viewer may not open the tender. */
  shortTitle: string | null;
  packageId: string;
  packageTitle: string;
  sentAt: string;
  replyBy: string;
  state: RfqState;
}

export interface SupplierRowVM {
  id: string;
  s: Supplier;
  sc: Screening;
  country: string;
  trades: string[];
  /** Short names of the clients whose approved lists include it. */
  avl: string[];
  /** RFQs sent to it on live tenders, sent by now. */
  openRfqs: number;
}

export interface SupplierProfileVM extends SupplierRowVM {
  checks: { key: 'sanctions' | 'antiBribery'; label: string; state: string; tone: Tone; checkedAt: string; dueAt: string }[];
  /** The earlier check's date + `RESCREEN_DAYS`. */
  nextRescreen: string;
  /** The next re-screen date has passed (or a check says it is due). */
  rescreenPassed: boolean;
  held: (HeldRow & { shortTitle: string | null })[];
  rfqs: SupplierRfqVM[];
  contact: { id: string; name: string; title: string } | null;
}

export interface SupplierMasterVM {
  rows: SupplierRowVM[];
  counts: { total: number; current: number; due: number; blocked: number; countries: number; trades: number };
  /** The country with the most suppliers. */
  largestCountry: { name: string; n: number } | null;
  /** Blocked suppliers by the check that blocks them, and the latest such check. */
  blocked: { sanctions: number; antiBribery: number; latest: string | null };
  held: ReturnType<typeof heldByScreening>;
  /** The oldest date a due screening fell due. */
  oldestDue: string | null;
}

export { RESCREEN_DAYS };

const CHECK_STATE: Record<string, { label: string; tone: Tone }> = {
  clear: { label: 'Clear', tone: 'green' }, match: { label: 'Match', tone: 'red' }, flag: { label: 'Flagged', tone: 'red' }, due: { label: 'Due', tone: 'orange' },
};

/** Every RFQ to the supplier on the tenant's live tenders, sent by now, soonest reply first. */
export function openRfqsOf(tenant: string, supplierId: string, done: Done): LiveRfq[] {
  return liveS2Tenders(tenant, done)
    .flatMap((t) => rfqsFor(tenant, t.tenderId, done))
    .filter((r) => r.supplierId === supplierId && sentBy(r))
    .sort((a, b) => a.replyBy.localeCompare(b.replyBy) || a.id.localeCompare(b.id));
}

export function supplierMasterFor(tenant: string, done: Done): SupplierMasterVM {
  const rfqs = liveS2Tenders(tenant, done).flatMap((t) => rfqsFor(tenant, t.tenderId, done)).filter((r) => sentBy(r));
  const rows = suppliersOf(tenant).map((s): SupplierRowVM => ({
    id: s.id, s, sc: screeningOf(s), country: countryName(s.country), trades: s.trades.map(tradeLabel), avl: s.avl.map(avlShort),
    openRfqs: rfqs.filter((r) => r.supplierId === s.id).length,
  }));
  const due = rows.filter((r) => r.sc.state === 'due');
  const blocked = rows.filter((r) => r.sc.state === 'blocked');
  const byCountry = new Map<string, number>();
  rows.forEach((r) => byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + 1));
  const [top] = [...byCountry].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // The check that blocks: a sanctions match first, as `screeningOf` reads it.
  const flagDate = (r: SupplierRowVM) => (r.s.screening.sanctions.state === 'match' ? r.s.screening.sanctions.checkedAt : r.s.screening.antiBribery.checkedAt);
  return {
    rows,
    counts: {
      total: rows.length, current: rows.filter((r) => r.sc.state === 'current').length, due: due.length, blocked: blocked.length,
      countries: byCountry.size, trades: new Set(rows.flatMap((r) => r.s.trades)).size,
    },
    largestCountry: top ? { name: top[0], n: top[1] } : null,
    blocked: {
      sanctions: blocked.filter((r) => r.s.screening.sanctions.state === 'match').length,
      antiBribery: blocked.filter((r) => r.s.screening.sanctions.state !== 'match').length,
      latest: blocked.map(flagDate).sort().pop() ?? null,
    },
    held: heldByScreening(tenant, done),
    oldestDue: due.map((r) => r.sc.dueSince).filter((d): d is string => !!d).sort()[0] ?? null,
  };
}

export function supplierProfileFor(tenant: string, row: SupplierRowVM, done: Done, viewer: Person, held: HeldRow[]): SupplierProfileVM {
  const s = row.s;
  const q = queriesFor({ tenant, viewer, done });
  const checks = (['sanctions', 'antiBribery'] as const).map((key) => {
    const c = s.screening[key];
    const st = CHECK_STATE[c.state];
    return { key, label: key === 'sanctions' ? 'Sanctions screening' : 'Anti-bribery screening', state: st.label, tone: st.tone, checkedAt: c.checkedAt, dueAt: addDays(c.checkedAt, RESCREEN_DAYS) };
  });
  const nextRescreen = checks.map((c) => c.dueAt).sort()[0];
  const contact = personById(s.contactPersonId);
  return {
    ...row,
    checks,
    nextRescreen,
    rescreenPassed: nextRescreen <= DEMO_TODAY || row.sc.state === 'due',
    held: held.filter((h) => h.supplierId === s.id).map((h) => ({ ...h, shortTitle: q.one(h.tenderId)?.shortTitle ?? null })),
    rfqs: openRfqsOf(tenant, s.id, done).map((r) => ({
      id: r.id, tenderId: r.tenderId, shortTitle: q.one(r.tenderId)?.shortTitle ?? null,
      packageId: r.packageId, packageTitle: s2TenderOf(tenant, r.tenderId)?.packages.find((p) => p.id === r.packageId)?.title ?? r.packageId,
      sentAt: r.sentAt, replyBy: r.replyBy, state: rfqStateOf(r),
    })),
    contact: contact ? { id: contact.id, name: contact.name, title: contact.title } : null,
  };
}
