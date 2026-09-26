import type { Supplier, TenderPackage } from '@/data/gcc/s2';
import { RESCREEN_DAYS, SHORTLIST_MAX, SHORTLIST_MAX_SENDABLE } from '@/data/gcc/s2';
import { addDays, dateText, DEMO_TODAY } from '@/domain/calendar';
import { K, NOW, readDone, write, type Done, type S2WriteResult, type ShortlistOverride, type ShortlistValue } from './done';
import { liveS2Tenders, registerRow, s2TenderOf, sentSupplierIds, supplierName, suppliersOf } from './context';
import { packagesFor } from './packaging';

/**
 * Supplier screening and the recommended shortlist per package (spec §8.3).
 * The guardrail: nothing is sent to a supplier whose screening is not current.
 */

// ---------------------------------------------------------------------------
// Screening (ui-direction §7.3: re-screen every 180 days)

export interface Screening {
  state: 'current' | 'due' | 'blocked';
  sendable: boolean;
  /** "Screened 8 Feb 2026" · "Screening due" · "Blocked, sanctions match" · "Blocked, anti-bribery". */
  label: string;
  /** Why the supplier is greyed out; absent when sendable. */
  reason?: string;
  dueSince?: string;
  lastChecked: string;
}

export function screeningOf(s: Supplier, today = DEMO_TODAY): Screening {
  const { sanctions, antiBribery } = s.screening;
  const lastChecked = [sanctions.checkedAt, antiBribery.checkedAt].sort()[1];
  if (sanctions.state === 'match') {
    return { state: 'blocked', sendable: false, label: 'Blocked, sanctions match', reason: 'Sanctions screening match: cannot be sent an RFQ', lastChecked };
  }
  if (antiBribery.state === 'flag') {
    return { state: 'blocked', sendable: false, label: 'Blocked, anti-bribery', reason: 'Anti-bribery flag: cannot be sent an RFQ', lastChecked };
  }
  // A check is due when it says so, or when it is older than the re-screen interval.
  const dueDates = [sanctions, antiBribery]
    .filter((c) => c.state === 'due' || addDays(c.checkedAt, RESCREEN_DAYS) <= today)
    .map((c) => addDays(c.checkedAt, RESCREEN_DAYS))
    .sort();
  if (dueDates.length) {
    const dueSince = dueDates[0];
    return { state: 'due', sendable: false, label: 'Screening due', reason: `Screening due since ${dateText(dueSince)}: re-screen before sending`, dueSince, lastChecked };
  }
  return { state: 'current', sendable: true, label: `Screened ${dateText(lastChecked)}`, lastChecked };
}

// ---------------------------------------------------------------------------
// Ranking

/** Suppliers that offer any of the package's trades; national only for a mandatory-list package. */
export function candidatesFor(tenant: string, pkg: TenderPackage): Supplier[] {
  return suppliersOf(tenant).filter((s) => s.trades.some((t) => pkg.trades.includes(t)) && (!pkg.mandatoryList || s.national));
}

/**
 * Rank score (higher is better), from the signals of spec §8.3: trade match,
 * the issuer's approved-vendor list, ICV, on-time delivery, response rate and
 * current load. National product counts where local content matters.
 */
export function rankScore(s: Supplier, pkg: TenderPackage, issuer: string): number {
  const trade = (s.trades.filter((t) => pkg.trades.includes(t)).length / pkg.trades.length) * 25;
  const avl = s.avl.includes(issuer) ? 20 : 0;
  const icv = (s.icv ?? 0) * 0.2;
  const onTime = (s.performance.onTimePct - 70) * 0.8;
  const response = (s.response.ratePct - 60) * 0.3;
  const load = s.load === 'low' ? 8 : s.load === 'medium' ? 4 : 0;
  const national = s.national && (pkg.lcRelevant || pkg.mandatoryList) ? 5 : 0;
  return Math.round((trade + avl + icv + onTime + response + load + national) * 10) / 10;
}

/** "Approved by the client; ICV 42; 92% on time; 3 quotes in 12 months, 1 awarded". */
export function reasonFor(s: Supplier, pkg: TenderPackage, issuer: string): string {
  const onAvl = s.avl.includes(issuer);
  const parts = [
    onAvl ? 'Approved by the client' : pkg.avlRequired ? 'Not on the client’s approved list: needs approval' : null,
    s.national && (pkg.mandatoryList || pkg.lcRelevant) ? 'National product' : null,
    s.icv !== undefined ? `ICV ${s.icv}` : null,
    `${s.performance.onTimePct}% on time`,
    `${s.performance.quotes12m} ${s.performance.quotes12m === 1 ? 'quote' : 'quotes'} in 12 months, ${s.performance.awards12m} awarded`,
    s.load === 'high' ? 'High current load' : null,
    s.prequal === 'pending' ? 'Prequalification pending' : s.prequal === 'none' ? 'Not prequalified' : null,
  ];
  return parts.filter(Boolean).join('; ');
}

export interface ShortlistItem {
  supplierId: string;
  name: string;
  country: string;
  rank: number;
  score: number;
  reason: string;
  sendable: boolean;
  /** Why it is greyed out. */
  blockedReason?: string;
  screening: Screening;
  onAvl: boolean;
  icv?: number;
  national: boolean;
}

export interface RecommendedShortlist {
  tenderId: string;
  pkgId: string;
  items: ShortlistItem[];
  proposedBy: string;
  /** The approved shortlist, when there is one. */
  approved: ApprovedShortlist | null;
}

export interface ApprovedShortlist { supplierIds: string[]; overrides: ShortlistOverride[]; at: string; byId: string; source: 'seed' | 'demo' }

const itemOf = (s: Supplier, pkg: TenderPackage, issuer: string): Omit<ShortlistItem, 'rank'> => {
  const screening = screeningOf(s);
  return {
    supplierId: s.id, name: s.name, country: s.country, score: rankScore(s, pkg, issuer), reason: reasonFor(s, pkg, issuer),
    sendable: screening.sendable, ...(screening.reason ? { blockedReason: screening.reason } : {}), screening,
    onAvl: s.avl.includes(issuer), ...(s.icv !== undefined ? { icv: s.icv } : {}), national: s.national,
  };
};

const byScore = (a: { score: number; name: string }, b: { score: number; name: string }) => b.score - a.score || a.name.localeCompare(b.name);

/** Every candidate for a package, ranked, with the greyed ones in place. */
export function rankedCandidates(tenant: string, tenderId: string, pkg: TenderPackage): ShortlistItem[] {
  const issuer = registerRow(tenant, tenderId)?.issuer ?? '';
  return candidatesFor(tenant, pkg).map((s) => itemOf(s, pkg, issuer)).sort(byScore).map((x, i) => ({ ...x, rank: i + 1 }));
}

/** The approved shortlist: a `shortlist:` key in the demo, else the seed. */
export function approvedShortlist(tenant: string, tenderId: string, pkgId: string, done: Done): ApprovedShortlist | null {
  const v = readDone<ShortlistValue>(done, K.shortlist(tenderId, pkgId));
  if (v) return { supplierIds: v.supplierIds, overrides: v.overrides ?? [], at: v.at, byId: v.byId, source: 'demo' };
  const seeded = s2TenderOf(tenant, tenderId)?.shortlists[pkgId];
  return seeded ? { supplierIds: seeded.supplierIds, overrides: [], at: seeded.at, byId: seeded.byId, source: 'seed' } : null;
}

/**
 * The agent's recommended shortlist of 4–6: up to five sendable suppliers,
 * with the best greyed ones shown in rank order so the buyer sees why they are
 * left out.
 */
export function recommendedShortlist(tenant: string, tenderId: string, pkgId: string, done: Done): RecommendedShortlist {
  const pkg = packagesFor(tenant, tenderId, done).find((p) => p.pkg.id === pkgId)?.pkg;
  const approved = approvedShortlist(tenant, tenderId, pkgId, done);
  if (!pkg) return { tenderId, pkgId, items: [], proposedBy: PROPOSED_BY, approved };
  const ranked = rankedCandidates(tenant, tenderId, pkg);
  const sendable = ranked.filter((x) => x.sendable).slice(0, SHORTLIST_MAX_SENDABLE);
  const greyed = ranked.filter((x) => !x.sendable);
  const room = Math.max(SHORTLIST_MAX - sendable.length, greyed.length ? 1 : 0);
  const shown = [...sendable, ...greyed.slice(0, room)].sort(byScore).map((x, i) => ({ ...x, rank: i + 1 }));
  return { tenderId, pkgId, items: shown, proposedBy: PROPOSED_BY, approved };
}

const PROPOSED_BY = 'Recommended by the Outreach & Evaluation agent from the supplier master. The buyer approves or overrides, with a reason';

// ---------------------------------------------------------------------------
// SRC-8 Held by screening

export interface HeldRow { tenderId: string; pkgId: string; supplierId: string; name: string; reason: string; blocked: boolean }

/** Shortlisted suppliers (approved shortlists on live tenders) that cannot be sent an RFQ and have not been. */
export function heldByScreening(tenant: string, done: Done): { rows: HeldRow[]; count: number; blocked: number; suppliers: number } {
  const rows: HeldRow[] = [];
  for (const rec of liveS2Tenders(tenant, done)) {
    for (const { pkg } of packagesFor(tenant, rec.tenderId, done)) {
      const list = approvedShortlist(tenant, rec.tenderId, pkg.id, done);
      if (!list) continue;
      const sent = sentSupplierIds(tenant, rec.tenderId, pkg.id, done);
      for (const id of list.supplierIds) {
        const s = suppliersOf(tenant).find((x) => x.id === id);
        if (!s || sent.has(id)) continue;
        const sc = screeningOf(s);
        if (!sc.sendable) rows.push({ tenderId: rec.tenderId, pkgId: pkg.id, supplierId: id, name: s.name, reason: sc.reason!, blocked: sc.state === 'blocked' });
      }
    }
  }
  return { rows, count: rows.length, blocked: rows.filter((r) => r.blocked).length, suppliers: new Set(rows.map((r) => r.supplierId)).size };
}

// ---------------------------------------------------------------------------
// Write

/**
 * Approve a shortlist. Adding a supplier the agent did not recommend, or
 * removing a sendable one it did, needs an override with a reason. Leaving out
 * a greyed supplier needs none, and a blocked supplier (sanctions match or
 * anti-bribery flag) can never be on an approved shortlist.
 */
export function shortlistWrite(
  tenant: string, tenderId: string, pkgId: string, supplierIds: string[], overrides: ShortlistOverride[], byId: string, done: Done, at = NOW,
): S2WriteResult<ShortlistValue> {
  if (!supplierIds.length) return { error: 'Choose at least one supplier for the shortlist.' };
  const recommended = recommendedShortlist(tenant, tenderId, pkgId, done).items;
  const reasonOf = (id: string, action: 'add' | 'remove') => overrides.find((o) => o.supplierId === id && o.action === action)?.reason.trim();
  for (const id of supplierIds) {
    const s = suppliersOf(tenant).find((x) => x.id === id);
    if (!s) return { error: `${id} is not in the supplier master.` };
    const sc = screeningOf(s);
    if (sc.state === 'blocked') return { error: `${s.name} cannot be shortlisted: ${sc.label.toLowerCase()}.` };
    if (!recommended.some((x) => x.supplierId === id) && !reasonOf(id, 'add')) return { error: `Give a reason for adding ${s.name}: the agent did not recommend it.` };
  }
  for (const x of recommended) {
    if (x.sendable && !supplierIds.includes(x.supplierId) && !reasonOf(x.supplierId, 'remove')) {
      return { error: `Give a reason for removing ${x.name}: the agent recommended it.` };
    }
  }
  const record: ShortlistValue = { supplierIds, overrides: overrides.filter((o) => o.reason.trim()), at, byId };
  const changes = record.overrides.map((o) => `${o.action === 'add' ? 'Added' : 'Removed'} ${supplierName(tenant, o.supplierId)}: ${o.reason}`);
  return write(K.shortlist(tenderId, pkgId), record, {
    actorId: byId, action: 'Shortlist approved', target: `${tenderId} ${pkgId}`,
    detail: [`${supplierIds.length} suppliers: ${supplierIds.map((id) => supplierName(tenant, id)).join(', ')}.`, ...changes.map((c) => `Override recorded. ${c}.`)].join(' '),
  });
}
