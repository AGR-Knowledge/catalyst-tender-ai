import { CATALOGUE, FOCUS_BOQ, LINE_COUNT, RATE_TOLERANCE, TEMPLATES, type BoqClass } from '@/data/boq';
import { TENDERS } from '@/data/tenders';
import type { LiveTender } from './live';

/**
 * Builds each bid's bill of quantities from its sector template. Quantities are
 * fixed from the bid's value on the register as seeded (the client's bill does
 * not move); rates are the line amount over that quantity, so re-pricing a bid
 * moves its rates and nothing else.
 */

export interface BoqLine {
  item: string;
  code: string;
  bill: string;
  desc: string;
  unit: string;
  qty: number;
  /** ₹ per unit. For a lump sum this equals the amount. */
  rate: number;
  /** ₹ crore. */
  amount: number;
  cls: BoqClass;
  why: string;
  lump: boolean;
  /** RFQ package on the Package board, for T-2026-041. */
  pkg?: string;
}

export interface Boq {
  tender: LiveTender;
  lines: BoqLine[];
  total: number;
  /** Lines in the full bill; the table shows them rolled up by catalogue item. */
  fullLines: number;
  split: Record<BoqClass, number>;
  /** Whether rates are the bid's own price, or still estimates from the rate library. */
  basis: 'priced' | 'estimate';
}

const CR = 1e7;

/** A stable 0 to 1 number from a string, so each bid keeps its own rate level. */
function seed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/** Three significant figures, the way quantities are usually carried on a bill. */
const sig3 = (n: number) => { if (n < 1) return 1; const p = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 2); return Math.round(n / p) * p; };

const baseValue = (id: string, fallback: number) => TENDERS.find((t) => t.id === id)?.value ?? fallback;

export function hasBoq(t: LiveTender): boolean {
  return !t.source && !!TEMPLATES[t.sector];
}

export function boqFor(t: LiveTender): Boq | null {
  if (!hasBoq(t)) return null;
  const tpl = t.id === 'T-2026-041' ? FOCUS_BOQ : TEMPLATES[t.sector];
  const base = baseValue(t.id, t.value);
  const counters: Record<string, number> = {};
  const bills = [...new Set(tpl.map((l) => l.bill))];

  const lines = tpl.map((l) => {
    const c = CATALOGUE[l.code];
    // Each bid sits a little above or below the typical rate, and each item a little more.
    const f = 0.93 + seed(t.id) * 0.12 + (seed(t.id + l.code) - 0.5) * 0.08;
    const baseAmount = l.share * base;
    const amount = l.share * t.value;
    const qty = c.lump ? 1 : sig3((baseAmount * CR) / (c.rate * f));
    const b = bills.indexOf(l.bill) + 1;
    counters[l.bill] = (counters[l.bill] ?? 0) + 1;
    return {
      item: `${b}.${counters[l.bill]}`, code: l.code, bill: l.bill, desc: c.desc, unit: c.unit, qty,
      rate: (amount * CR) / qty, amount, cls: l.cls, why: l.why, lump: !!c.lump, pkg: 'pkg' in l ? (l.pkg as string | undefined) : undefined,
    } satisfies BoqLine;
  });

  const split = { self: 0, sub: 0, open: 0 } as Record<BoqClass, number>;
  lines.forEach((l) => { split[l.cls] += l.amount; });
  return {
    tender: t, lines, total: lines.reduce((a, l) => a + l.amount, 0), fullLines: LINE_COUNT[t.sector] ?? lines.length * 12, split,
    basis: t.stage >= 5 ? 'priced' : 'estimate',
  };
}

export interface RatePoint { tender: LiveTender; rate: number }

/** The same catalogue item on every other bid, for rate comparison. */
export function ratesElsewhere(code: string, except: string, all: Boq[]): RatePoint[] {
  return all.flatMap((b) => (b.tender.id === except ? [] : b.lines.filter((l) => l.code === code && !l.lump).map((l) => ({ tender: b.tender, rate: l.rate }))));
}

export function median(ns: number[]): number | null {
  if (!ns.length) return null;
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface LineCompare { median: number | null; delta: number | null; n: number; flag: boolean }

export function compareLine(line: BoqLine, tenderId: string, all: Boq[]): LineCompare {
  if (line.lump) return { median: null, delta: null, n: 0, flag: false };
  const pts = ratesElsewhere(line.code, tenderId, all);
  const m = median(pts.map((p) => p.rate));
  const delta = m ? ((line.rate - m) / m) * 100 : null;
  return { median: m, delta, n: pts.length, flag: delta != null && Math.abs(delta) > RATE_TOLERANCE };
}

/**
 * Two bids side by side on the items they share. The weighted gap is this bid's
 * rates against the other's, weighted by this bid's amounts.
 */
export function compareBids(a: Boq, b: Boq) {
  const rows = a.lines.filter((l) => !l.lump).flatMap((l) => {
    const o = b.lines.find((x) => x.code === l.code && !x.lump);
    return o ? [{ line: l, other: o, delta: ((l.rate - o.rate) / o.rate) * 100 }] : [];
  });
  const w = rows.reduce((s, r) => s + r.line.amount, 0);
  const gap = w ? rows.reduce((s, r) => s + r.delta * r.line.amount, 0) / w : null;
  return { rows, gap, sharedValue: w };
}

/** The bid most like this one to compare with by default: same sector first, then the most shared items. */
export function closestBid(a: Boq, all: Boq[]): Boq | null {
  const others = all.filter((b) => b.tender.id !== a.tender.id);
  const score = (b: Boq) => (b.tender.sector === a.tender.sector ? 100 : 0) + compareBids(a, b).rows.length;
  return others.sort((x, y) => score(y) - score(x) || Math.abs(x.tender.value - a.tender.value) - Math.abs(y.tender.value - a.tender.value))[0] ?? null;
}

/** ₹ per unit, in the units a bill uses: lakh or crore above a lakh. */
export function rateLabel(r: number): string {
  if (r >= 1e7) return `₹ ${(r / 1e7).toFixed(2)} Cr`;
  if (r >= 1e5) return `₹ ${(r / 1e5).toFixed(2)} L`;
  return `₹ ${Math.round(r).toLocaleString('en-IN')}`;
}

export const CLASS_LABEL: Record<BoqClass, string> = { self: 'Self-performed', sub: 'Subcontract', open: 'Not covered' };
