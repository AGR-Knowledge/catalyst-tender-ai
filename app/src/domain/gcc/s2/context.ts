import { TENANTS, type CountryCode, type ProfiledTenant } from '@/data/tenants';
import { gccData, isGccTenantKey, type GccTenantKey } from '@/data/gcc';
import type { Ccy } from '@/data/gcc/fx';
import type { GccTender, Money } from '@/data/gcc/types';
import { HERO_ID, HERO_LINES, HERO_NOT_COVERED, HERO_PACKAGES } from '@/data/gcc/hero';
import {
  HERO_S2_PACKAGES, HERO_S2_TERMS, QUOTE_VALIDITY_FLOOR_DAYS, QUOTE_VALIDITY_MARGIN_DAYS, S2_SUPPLIERS, S2_TENDERS,
  type S2Tender, type Supplier, type TenderPackage,
} from '@/data/gcc/s2';
import { addDays, calendarDaysBetween, isWorkingDay } from '@/domain/calendar';
import { dg1RecordFor } from '@/domain/gcc/dg1';
import { K, keysWithPrefix, NOW, readDone, type Done, type RfqSentValue } from './done';

/**
 * Shared lookups for the Stage 2 rules: the tenant, its supplier master, a
 * tender's Stage 2 record (the hero's is built from 004's BOQ here), the DG1
 * pursue that starts sourcing, and working-day arithmetic.
 */

// ---------------------------------------------------------------------------
// Tenant

export interface S2Tenant { key: GccTenantKey; name: string; ccy: Ccy; cc: CountryCode; tzLabel: string; monogram: string; accent: string }

export function tenantOf(tenant: string): S2Tenant {
  if (!isGccTenantKey(tenant)) throw new Error(`Stage 2 rules are for GCC tenants only, not "${tenant}".`);
  const t = TENANTS.find((x) => x.key === tenant) as ProfiledTenant;
  return { key: tenant, name: t.name, ccy: t.currency as Ccy, cc: t.countryCode, tzLabel: t.tzLabel, monogram: t.monogram, accent: t.accent };
}

export const suppliersOf = (tenant: string): Supplier[] => S2_SUPPLIERS[tenantOf(tenant).key];

export const supplierOf = (tenant: string, id: string): Supplier | undefined => suppliersOf(tenant).find((s) => s.id === id);

export const supplierName = (tenant: string, id: string) => supplierOf(tenant, id)?.name ?? id;

// ---------------------------------------------------------------------------
// Tenders

export const registerRow = (tenant: string, tenderId: string): GccTender | undefined =>
  gccData(tenant).register.find((t) => t.id === tenderId);

/** The bid currency: the tender's own (SAR for the hero in every tenant, booklet §28). */
export const bidCcy = (tenant: string, tenderId: string): Ccy => registerRow(tenant, tenderId)?.value.ccy ?? tenantOf(tenant).ccy;

/** A hero BOQ line's value, SAR. */
export const lineValue = (l: { qty: number; rate: number }) => l.qty * l.rate;

export const HERO_BOQ_TOTAL = HERO_LINES.reduce((s, l) => s + lineValue(l), 0);

/** The hero's packages, built from `HERO_PACKAGES` and `HERO_LINES` so value and line count always match the BOQ. */
function heroPackages(tenant: string): TenderPackage[] {
  return HERO_PACKAGES.map((p) => {
    const lines = HERO_LINES.filter((l) => p.lineItems.includes(l.item));
    const x = HERO_S2_PACKAGES[p.id];
    return {
      id: p.id, tenderId: HERO_ID, tenant, title: p.title, kind: p.kind,
      value: { amount: lines.reduce((s, l) => s + lineValue(l), 0), ccy: 'SAR' },
      lineItems: p.lineItems, lineCount: lines.reduce((s, l) => s + l.lines, 0),
      ...(p.longLeadWeeks ? { longLeadWeeks: p.longLeadWeeks } : {}),
      ...(p.mandatoryList ? { mandatoryList: true } : {}),
      ...(p.note ? { note: p.note } : {}),
      ...x,
    };
  });
}

const heroCache = new Map<string, S2Tender>();

/** The hero's Stage 2 record: packages and terms, with no RFQs, quotes or approvals at seed. */
export function heroS2(tenant: string): S2Tender {
  const hit = heroCache.get(tenant);
  if (hit) return hit;
  const rec: S2Tender = {
    tenant, tenderId: HERO_ID, packages: heroPackages(tenant), boq: [], shortlists: {}, rfqs: [], quotes: [], clarifications: [], gaps: [], ...HERO_S2_TERMS,
  };
  heroCache.set(tenant, rec);
  return rec;
}

/** A tender's Stage 2 record: seeded, or the hero's. */
export function s2TenderOf(tenant: string, tenderId: string): S2Tender | undefined {
  if (tenderId === HERO_ID) return heroS2(tenant);
  return S2_TENDERS[tenantOf(tenant).key].find((t) => t.tenderId === tenderId);
}

/** BOQ value of a tender: the hero's lines, or the seeded summary. */
export function boqTotal(rec: S2Tender): Money {
  if (rec.tenderId === HERO_ID) return { amount: HERO_BOQ_TOTAL, ccy: 'SAR' };
  return { amount: rec.boq.reduce((s, b) => s + b.value.amount, 0), ccy: rec.boq[0]?.value.ccy ?? 'SAR' };
}

export const HERO_NOT_COVERED_LINES = HERO_LINES.filter((l) => HERO_NOT_COVERED.includes(l.item));

/** `rfq-sent:` batches for a tender, in key order: `{ pkgId, batch, value }`. */
export function sentBatches(tenderId: string, done: Done): { key: string; pkgId: string; batch: number; value: RfqSentValue }[] {
  const prefix = K.rfqSentPrefix(tenderId);
  return keysWithPrefix(done, prefix).flatMap((key) => {
    const [pkgId, n] = key.slice(prefix.length).split(':');
    const value = readDone<RfqSentValue>(done, key);
    return value ? [{ key, pkgId, batch: n ? Number(n) : 1, value }] : [];
  });
}

/** Suppliers already sent an RFQ for a package: seeded, or by an `rfq-sent:` key. */
export function sentSupplierIds(tenant: string, tenderId: string, pkgId: string, done: Done): Set<string> {
  const seeded = (s2TenderOf(tenant, tenderId)?.rfqs ?? []).filter((r) => r.packageId === pkgId).map((r) => r.supplierId);
  const demo = sentBatches(tenderId, done).filter((b) => b.pkgId === pkgId).flatMap((b) => b.value.supplierIds);
  return new Set([...seeded, ...demo]);
}

// ---------------------------------------------------------------------------
// DG1 pursue: the start of Stage 2

export interface Pursue {
  at: string;
  byId: string;
  source: 'demo' | 'seed';
  /** The Procurement owner the DG1 decision named in its team, when it named one. */
  procId?: string;
}

/**
 * The pursue that starts sourcing: plan 007a's standing DG1 decision (the
 * seed's record, or `dg1:{TID}` in the demo). A DG1 re-open clears it.
 */
export function pursueOf(tenant: string, tenderId: string, done: Done): Pursue | null {
  const { current, source } = dg1RecordFor(tenant, tenderId, done);
  if (!current || current.decision !== 'pursue' || !source) return null;
  const procId = 'team' in current ? current.team?.proc : undefined;
  return { at: current.at, byId: current.byId, source, ...(procId ? { procId } : {}) };
}

/**
 * Tenders being sourced now, with a Stage 2 record: Stage 2 in the register,
 * or pursued in the demo, while the pursue stands. A DG1 re-open takes a
 * tender out of Stage 2.
 */
export function liveS2Tenders(tenant: string, done: Done): S2Tender[] {
  const out: S2Tender[] = [];
  for (const row of gccData(tenant).register) {
    const rec = s2TenderOf(tenant, row.id);
    if (!rec) continue;
    const p = pursueOf(tenant, row.id, done);
    if (p && (row.stage === 'S2' || p.source === 'demo')) out.push(rec);
  }
  return out;
}

/** Required quote validity: the tender's bid validity plus the margin, never below the floor. */
export function requiredValidityDays(tenant: string, tenderId: string): { days: number; basis: string } {
  const row = registerRow(tenant, tenderId);
  const opening = row?.keyDates.find((k) => k.kind === 'opening');
  const end = row?.keyDates.find((k) => k.kind === 'validity-end');
  if (!opening || !end) {
    return { days: QUOTE_VALIDITY_FLOOR_DAYS, basis: `Bid validity not stated: at least ${QUOTE_VALIDITY_FLOOR_DAYS} days` };
  }
  const bid = calendarDaysBetween(opening.date, end.date);
  const days = Math.max(QUOTE_VALIDITY_FLOOR_DAYS, bid + QUOTE_VALIDITY_MARGIN_DAYS);
  return { days, basis: `Bid validity ${bid} days${end.page ? ` (p. ${end.page})` : ''} + ${QUOTE_VALIDITY_MARGIN_DAYS}, at least ${QUOTE_VALIDITY_FLOOR_DAYS}` };
}

// ---------------------------------------------------------------------------
// Time

export const dateOf = (iso: string) => iso.slice(0, 10);
export const timeOf = (iso: string) => (iso.length > 10 ? iso.slice(11, 16) : '00:00');

/** `n` working days after the date of `iso`, at `time` (default: the same time of day). */
export function addWorkingDays(iso: string, n: number, cc: CountryCode, time = timeOf(iso)): string {
  let d = dateOf(iso);
  for (let left = n; left > 0;) {
    d = addDays(d, 1);
    if (isWorkingDay(d, cc)) left--;
  }
  return `${d}T${time}`;
}

/** The first working day after the date of `iso`, at `time`. */
export const nextWorkingDay = (iso: string, cc: CountryCode, time: string) => addWorkingDays(iso, 1, cc, time);

export const isPast = (iso: string, now = NOW) => iso <= now;

/** Per cent to one decimal, as a number. */
export const pct1 = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
