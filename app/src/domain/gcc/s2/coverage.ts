import type { Tone } from '@/data/types';
import type { Money } from '@/data/gcc/types';
import { HERO_ID, HERO_LINES, HERO_NOT_COVERED } from '@/data/gcc/hero';
import { DEFAULT_SUBCONTRACT_CAP_PCT, QUOTES_TO_COVER } from '@/data/gcc/s2';
import { dateText } from '@/domain/calendar';
import { personById } from '@/data/people';
import { K, NOW, readDone, write, type Done, type GapValue, type S2Write } from './done';
import { boqTotal, dateOf, HERO_NOT_COVERED_LINES, lineValue, liveS2Tenders, pct1, s2TenderOf } from './context';
import { packagesFor } from './packaging';
import { levelledFor } from './levelling';
import { quotesFor, rfqsFor } from './rfq';

/**
 * Coverage (spec §8.2, §8.6): the BOQ coverage bar with the subcontracting cap,
 * which packages are covered, what nobody covers, and long-lead risk.
 */

// ---------------------------------------------------------------------------
// The coverage bar

export interface CoverageBar {
  tenderId: string;
  selfPct: number;
  supplyPct: number;
  subcontractPct: number;
  notCoveredPct: number;
  values: { self: Money; supply: Money; subcontract: Money; notCovered: Money; total: Money };
  subcontractCap: { pct: number; cap: number; ok: boolean; text: string; source: string };
}

/**
 * Shares of the BOQ value (one decimal). Supply of equipment and materials is
 * not counted towards the subcontracting cap; only works subcontracted are
 * (gcc-demo-data §4.8, an assumption to confirm).
 */
export function coverageBar(tenant: string, tenderId: string): CoverageBar | null {
  const rec = s2TenderOf(tenant, tenderId);
  if (!rec) return null;
  const total = boqTotal(rec);
  let self = 0, supply = 0, subcontract = 0, notCovered = 0;
  if (tenderId === HERO_ID) {
    const kindOf = new Map(rec.packages.flatMap((p) => (p.lineItems ?? []).map((i) => [i, p.kind] as const)));
    for (const l of HERO_LINES) {
      const v = lineValue(l);
      if (HERO_NOT_COVERED.includes(l.item)) notCovered += v;
      else if (kindOf.get(l.item) === 'supply') supply += v;
      else if (kindOf.get(l.item) === 'subcontract') subcontract += v;
      else self += v;
    }
  } else {
    for (const b of rec.boq) {
      if (b.kind === 'self') self += b.value.amount;
      else if (b.kind === 'supply') supply += b.value.amount;
      else if (b.kind === 'subcontract') subcontract += b.value.amount;
      else notCovered += b.value.amount;
    }
  }
  const t = total.amount;
  const m = (amount: number): Money => ({ amount, ccy: total.ccy });
  const subPct = pct1(subcontract, t);
  const cap = rec.subcontractCap?.pct ?? DEFAULT_SUBCONTRACT_CAP_PCT;
  const ok = subPct <= cap;
  const stated = !!rec.subcontractCap;
  return {
    tenderId,
    selfPct: pct1(self, t), supplyPct: pct1(supply, t), subcontractPct: subPct, notCoveredPct: pct1(notCovered, t),
    values: { self: m(self), supply: m(supply), subcontract: m(subcontract), notCovered: m(notCovered), total },
    subcontractCap: {
      pct: subPct, cap, ok,
      text: `Subcontract works ${Math.round(subPct)}% of the ${cap}% cap${stated ? '' : ' (no limit stated; checked against the default)'}`,
      source: rec.subcontractCap?.source ?? `No subcontracting limit stated in the tender; the ${cap}% default applies`,
    },
  };
}

// ---------------------------------------------------------------------------
// SRC-7 Not covered

export interface NotCovered { tenderId: string; pct: number; value: Money; lines: { item?: string; title: string; value: Money }[]; tone: Tone }

export function notCovered(tenant: string, tenderId: string): NotCovered | null {
  const rec = s2TenderOf(tenant, tenderId);
  const bar = coverageBar(tenant, tenderId);
  if (!rec || !bar) return null;
  const lines = tenderId === HERO_ID
    ? HERO_NOT_COVERED_LINES.map((l) => ({ item: l.item, title: l.description, value: { amount: lineValue(l), ccy: 'SAR' as const } }))
    : rec.boq.filter((b) => b.kind === 'not-covered').map((b) => ({ title: b.title, value: b.value }));
  const pct = bar.notCoveredPct;
  return { tenderId, pct, value: bar.values.notCovered, lines, tone: pct === 0 ? 'green' : pct <= 5 ? 'orange' : 'red' };
}

// ---------------------------------------------------------------------------
// SRC-2 Packages covered

export interface AcceptedGapVM { reason: string; at: string; byId: string; byName: string; source: 'seed' | 'demo' }

export function acceptedGap(tenant: string, tenderId: string, pkgId: string, done: Done): AcceptedGapVM | null {
  const v = readDone<GapValue>(done, K.gap(tenderId, pkgId));
  const g = v ?? s2TenderOf(tenant, tenderId)?.gaps.find((x) => x.packageId === pkgId);
  if (!g) return null;
  return { reason: g.reason, at: g.at, byId: g.byId, byName: personById(g.byId)?.name ?? g.byId, source: v ? 'demo' : 'seed' };
}

export interface PackageCoverage {
  pkgId: string;
  title: string;
  state: 'covered' | 'gap-accepted' | 'open';
  /** Compliant quotes whose adjustments are all decided. */
  compliantLevelled: number;
  needed: number;
  why: string;
  gap?: AcceptedGapVM;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A package is covered with ≥ 3 compliant, levelled quotes, or an accepted gap. */
export function packageCoverage(tenant: string, tenderId: string, done: Done, now = NOW): { packages: PackageCoverage[]; covered: number; total: number } {
  const levelled = levelledFor(tenant, tenderId, done);
  const rfqs = rfqsFor(tenant, tenderId, done);
  const packages = packagesFor(tenant, tenderId, done).map(({ pkg }): PackageCoverage => {
    const qs = levelled.filter((l) => l.packageId === pkg.id);
    const compliantLevelled = qs.filter((l) => l.compliant && l.state === 'levelled').length;
    const gap = acceptedGap(tenant, tenderId, pkg.id, done);
    if (compliantLevelled >= QUOTES_TO_COVER) {
      return { pkgId: pkg.id, title: pkg.title, state: 'covered', compliantLevelled, needed: QUOTES_TO_COVER, why: `${compliantLevelled} compliant, levelled quotes` };
    }
    if (gap) {
      return { pkgId: pkg.id, title: pkg.title, state: 'gap-accepted', compliantLevelled, needed: QUOTES_TO_COVER, gap,
        why: `Gap accepted by ${gap.byName} on ${dateText(dateOf(gap.at))}: ${gap.reason}` };
    }
    const mine = rfqs.filter((r) => r.packageId === pkg.id);
    const bits = [
      `${compliantLevelled} of ${QUOTES_TO_COVER} compliant, levelled quotes`,
      qs.some((l) => l.state === 'to-level') ? `${plural(qs.filter((l) => l.state === 'to-level').length, 'quote')} to level` : null,
      qs.some((l) => !l.compliant) ? `${plural(qs.filter((l) => !l.compliant).length, 'quote')} non-compliant` : null,
      mine.some((r) => !r.repliedAt && r.replyBy < now) ? `${plural(mine.filter((r) => !r.repliedAt && r.replyBy < now).length, 'reply', 'replies')} overdue` : null,
      mine.some((r) => !r.repliedAt && r.replyBy >= now) ? `${plural(mine.filter((r) => !r.repliedAt && r.replyBy >= now).length, 'reply', 'replies')} not yet due` : null,
      mine.some((r) => r.declined) ? `${plural(mine.filter((r) => r.declined).length, 'decline')}` : null,
      mine.length ? null : 'No RFQs sent',
    ];
    return { pkgId: pkg.id, title: pkg.title, state: 'open', compliantLevelled, needed: QUOTES_TO_COVER, why: bits.filter(Boolean).join('; ') };
  });
  return { packages, covered: packages.filter((p) => p.state !== 'open').length, total: packages.length };
}

/** SRC-2 across the tenant's live tenders. */
export function coverageAcross(tenant: string, done: Done): { covered: number; total: number; byTender: { tenderId: string; covered: number; total: number }[] } {
  const byTender = liveS2Tenders(tenant, done).map((t) => {
    const c = packageCoverage(tenant, t.tenderId, done);
    return { tenderId: t.tenderId, covered: c.covered, total: c.total };
  });
  return { covered: byTender.reduce((s, x) => s + x.covered, 0), total: byTender.reduce((s, x) => s + x.total, 0), byTender };
}

/** Accept a coverage gap: the reason is required. */
export function gapWrite(tenderId: string, pkgId: string, reason: string, byId: string, at = NOW): S2Write<GapValue> | { error: string } {
  if (!reason.trim()) return { error: 'Give a reason for accepting the gap.' };
  return write(K.gap(tenderId, pkgId), { reason: reason.trim(), at, byId }, {
    actorId: byId, action: 'Coverage gap accepted', target: `${tenderId} ${pkgId}`, detail: reason.trim(),
  });
}

// ---------------------------------------------------------------------------
// SRC-9 Long-lead at risk

export interface LongLeadRisk { pkgId: string; title: string; bestWeeks: number; needByWeeks: number; supplierId: string; supplierName: string; text: string }

/** Packages where even the fastest compliant quote is later than the programme needs. */
export function longLeadAtRisk(tenant: string, tenderId: string, done: Done): LongLeadRisk[] {
  const levelled = levelledFor(tenant, tenderId, done);
  const leadOf = new Map(quotesFor(tenant, tenderId, done).map((q) => [q.id, q.leadTimeWeeks]));
  return packagesFor(tenant, tenderId, done).flatMap(({ pkg }) => {
    const needBy = pkg.needByWeeks;
    if (needBy === undefined) return [];
    const best = levelled
      .filter((l) => l.packageId === pkg.id && l.compliant && leadOf.get(l.quoteId) !== undefined)
      .map((l) => ({ l, weeks: leadOf.get(l.quoteId)! }))
      .sort((a, b) => a.weeks - b.weeks)[0];
    if (!best || best.weeks <= needBy) return [];
    return [{ pkgId: pkg.id, title: pkg.title, bestWeeks: best.weeks, needByWeeks: needBy, supplierId: best.l.supplierId, supplierName: best.l.supplierName,
      text: `Fastest compliant quote ${best.weeks} weeks against ${needBy} needed` }];
  });
}
