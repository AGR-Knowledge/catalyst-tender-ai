import type { Money } from '@/data/gcc/types';
import { BEST_FIT_WEIGHTS, type BestFitWeights } from '@/data/gcc/s2';
import { money } from '@/domain/money';
import { K, NOW, readDone, write, type Done, type MixOption, type MixOverride, type MixValue, type S2WriteResult } from './done';
import { bidCcy, supplierName, supplierOf, tenantOf } from './context';
import { packagesFor } from './packaging';
import { screeningOf } from './shortlist';
import { quotesFor } from './rfq';
import { levelledFor, type LevelledVM } from './levelling';
import { packageCoverage } from './coverage';

/**
 * Best-fit mix (spec §8.7): per-package scores on the tenant's weights, with
 * screening as a pass/fail gate, and three mixes across the covered packages.
 * The buyer approves one, or overrides a package with a reason.
 */

export const NO_COMMITMENT = 'The agent never issues a commitment or purchase order.';

export type Criterion = keyof BestFitWeights;
export const CRITERIA: Criterion[] = ['price', 'technical', 'delivery', 'qhse', 'capacity', 'leadTime', 'icv'];

export interface ScoreRow {
  quoteId: string;
  supplierId: string;
  name: string;
  levelled: Money;
  /** 0–100 per criterion. */
  scores: Record<Criterion, number>;
  /** Σ weight × score ÷ 100. */
  weighted: number;
  /** Mean of delivery, QHSE, capacity and lead-time fit. */
  risk: number;
  rank: number;
  icv: number;
  leadTimeWeeks?: number;
  notes: string[];
}

export interface PackageScores {
  pkgId: string;
  weights: BestFitWeights;
  rows: ScoreRow[];
  /** Compliant, levelled quotes stopped by the screening gate before scoring. */
  gated: { quoteId: string; name: string; reason: string }[];
  disclaimer: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function packageScores(tenant: string, tenderId: string, pkgId: string, done: Done): PackageScores {
  const weights = BEST_FIT_WEIGHTS[tenantOf(tenant).key];
  const pkg = packagesFor(tenant, tenderId, done).find((p) => p.pkg.id === pkgId)?.pkg;
  const quotes = new Map(quotesFor(tenant, tenderId, done).map((q) => [q.id, q]));
  const ready = levelledFor(tenant, tenderId, done).filter((l) => l.packageId === pkgId && l.compliant && l.state === 'levelled');
  const gated: PackageScores['gated'] = [];
  const passed: LevelledVM[] = [];
  for (const l of ready) {
    const s = supplierOf(tenant, l.supplierId);
    const sc = s ? screeningOf(s) : null;
    if (!sc?.sendable) gated.push({ quoteId: l.quoteId, name: l.supplierName, reason: sc?.reason ?? 'Not in the supplier master' });
    else passed.push(l);
  }
  const lowest = Math.min(...passed.map((l) => l.levelled.amount));
  const rows = passed.map((l): Omit<ScoreRow, 'rank'> => {
    const s = supplierOf(tenant, l.supplierId)!;
    const q = quotes.get(l.quoteId)!;
    const needBy = pkg?.needByWeeks;
    const lead = q.leadTimeWeeks;
    const scores: Record<Criterion, number> = {
      price: r1((lowest / l.levelled.amount) * 100),
      technical: Math.max(40, 100 - 15 * q.deviations.length),
      delivery: s.performance.onTimePct,
      qhse: Math.max(0, 100 - 20 * s.performance.ncrs12m),
      capacity: s.load === 'low' ? 100 : s.load === 'medium' ? 75 : 45,
      leadTime: lead === undefined || needBy === undefined ? 80 : lead <= needBy ? 100 : Math.max(0, 100 - 12 * (lead - needBy)),
      icv: s.icv ?? 0,
    };
    const weighted = r1(CRITERIA.reduce((sum, c) => sum + weights[c] * scores[c], 0) / 100);
    const risk = r1((scores.delivery + scores.qhse + scores.capacity + scores.leadTime) / 4);
    const notes = [
      ...l.flags,
      s.load === 'high' ? 'High current load' : null,
      s.performance.onTimePct < 85 ? `${s.performance.onTimePct}% on time` : null,
    ].filter((x): x is string => !!x);
    return { quoteId: l.quoteId, supplierId: l.supplierId, name: l.supplierName, levelled: l.levelled, scores, weighted, risk, icv: s.icv ?? 0,
      ...(lead !== undefined ? { leadTimeWeeks: lead } : {}), notes };
  });
  const ranked = rows.sort((a, b) => b.weighted - a.weighted || a.levelled.amount - b.levelled.amount).map((x, i) => ({ ...x, rank: i + 1 }));
  return { pkgId, weights, rows: ranked, gated, disclaimer: NO_COMMITMENT };
}

// ---------------------------------------------------------------------------
// Mix options

export interface MixPick { pkgId: string; quoteId: string; supplierId: string; name: string; levelled: Money; rank: number; weighted: number; icv: number; overridden?: string }

export interface MixOptionVM {
  option: MixOption;
  label: string;
  recommended: boolean;
  picks: MixPick[];
  total: Money;
  /** SRC-10: ICV weighted by levelled cost, %. */
  icvShare: number;
  riskNotes: string[];
  scheduleFit: { late: number; text: string };
}

export interface MixOptionsVM { tenderId: string; packages: string[]; options: MixOptionVM[]; disclaimer: string }

export const MIX_LABEL: Record<MixOption, string> = { 'lowest-cost': 'Lowest cost', balanced: 'Balanced', 'lowest-risk': 'Lowest risk' };

const pickOf = (pkgId: string, r: ScoreRow): MixPick => ({ pkgId, quoteId: r.quoteId, supplierId: r.supplierId, name: r.name, levelled: r.levelled, rank: r.rank, weighted: r.weighted, icv: r.icv });

function summarise(tenant: string, tenderId: string, option: MixOption, picks: MixPick[], scores: Map<string, PackageScores>, done: Done): MixOptionVM {
  const ccy = bidCcy(tenant, tenderId);
  const pkgs = packagesFor(tenant, tenderId, done);
  const total = picks.reduce((s, p) => s + p.levelled.amount, 0);
  const icvShare = total ? r1(picks.reduce((s, p) => s + p.icv * p.levelled.amount, 0) / total) : 0;
  const rowOf = (p: MixPick) => scores.get(p.pkgId)!.rows.find((r) => r.quoteId === p.quoteId)!;
  const late = picks.filter((p) => {
    const need = pkgs.find((x) => x.pkg.id === p.pkgId)?.pkg.needByWeeks;
    const lead = rowOf(p).leadTimeWeeks;
    return need !== undefined && lead !== undefined && lead > need;
  });
  return {
    option, label: MIX_LABEL[option], recommended: option === 'balanced', picks,
    total: { amount: total, ccy }, icvShare,
    riskNotes: picks.flatMap((p) => rowOf(p).notes.map((n) => `${p.pkgId} ${p.name}: ${n}`)),
    scheduleFit: { late: late.length, text: late.length ? `${late.length} ${late.length === 1 ? 'package is' : 'packages are'} later than the programme needs: ${late.map((p) => p.pkgId).join(', ')}` : 'Every package meets the programme' },
  };
}

/** Packages with scored quotes that are covered (or have an accepted gap). */
function mixScores(tenant: string, tenderId: string, done: Done): Map<string, PackageScores> {
  const cov = packageCoverage(tenant, tenderId, done).packages.filter((p) => p.state !== 'open');
  const m = new Map<string, PackageScores>();
  for (const p of cov) {
    const s = packageScores(tenant, tenderId, p.pkgId, done);
    if (s.rows.length) m.set(p.pkgId, s);
  }
  return m;
}

export function mixOptions(tenant: string, tenderId: string, done: Done): MixOptionsVM {
  const scores = mixScores(tenant, tenderId, done);
  const pick = (choose: (rows: ScoreRow[]) => ScoreRow) => [...scores.entries()].map(([pkgId, s]) => pickOf(pkgId, choose(s.rows)));
  const best = <T>(rows: T[], key: (r: T) => number, tie: (r: T) => number) => [...rows].sort((a, b) => key(b) - key(a) || tie(a) - tie(b))[0];
  const options: MixOptionVM[] = [
    summarise(tenant, tenderId, 'lowest-cost', pick((rows) => best(rows, (r) => -r.levelled.amount, (r) => -r.weighted)), scores, done),
    summarise(tenant, tenderId, 'balanced', pick((rows) => rows[0]), scores, done),
    summarise(tenant, tenderId, 'lowest-risk', pick((rows) => best(rows, (r) => r.risk, (r) => -r.weighted)), scores, done),
  ];
  return { tenderId, packages: [...scores.keys()], options, disclaimer: NO_COMMITMENT };
}

export interface ApprovedMix extends MixValue { label: string; picks: MixPick[]; total: Money; icvShare: number }

/** The approved mix, with the option's picks and the overrides applied. */
export function mixFor(tenant: string, tenderId: string, done: Done): ApprovedMix | null {
  const v = readDone<MixValue>(done, K.mix(tenderId));
  if (!v) return null;
  const scores = mixScores(tenant, tenderId, done);
  const base = mixOptions(tenant, tenderId, done).options.find((o) => o.option === v.option);
  if (!base) return null;
  const picks = base.picks.map((p) => {
    const o = v.overrides.find((x) => x.pkgId === p.pkgId);
    const row = o && scores.get(p.pkgId)?.rows.find((r) => r.supplierId === o.supplierId);
    return row ? { ...pickOf(p.pkgId, row), overridden: o!.reason } : p;
  });
  const sum = summarise(tenant, tenderId, v.option, picks, scores, done);
  return { ...v, label: MIX_LABEL[v.option], picks, total: sum.total, icvShare: sum.icvShare };
}

/** Approve a mix. Each override of the option's pick in a package needs a reason. */
export function mixWrite(tenant: string, tenderId: string, option: MixOption, overrides: MixOverride[], byId: string, done: Done, at = NOW): S2WriteResult<MixValue> {
  const opts = mixOptions(tenant, tenderId, done);
  const chosen = opts.options.find((o) => o.option === option);
  if (!chosen || !chosen.picks.length) return { error: 'No covered package has a levelled, compliant quote to choose yet.' };
  const lines: string[] = [];
  for (const o of overrides) {
    if (!o.reason.trim()) return { error: `Give a reason for the override in ${o.pkgId}.` };
    const row = packageScores(tenant, tenderId, o.pkgId, done).rows.find((r) => r.supplierId === o.supplierId);
    if (!row) return { error: `${supplierName(tenant, o.supplierId)} has no levelled, compliant quote in ${o.pkgId}.` };
    if (chosen.picks.some((p) => p.pkgId === o.pkgId && p.supplierId === o.supplierId)) return { error: `${row.name} is already the ${MIX_LABEL[option].toLowerCase()} pick in ${o.pkgId}.` };
    lines.push(`Override recorded for ${o.pkgId}: rank ${row.rank}, ${row.name}, selected on ${o.reason.trim()}.`);
  }
  const record: MixValue = { option, overrides: overrides.map((o) => ({ ...o, reason: o.reason.trim() })), at, byId };
  const ccy = chosen.total.ccy;
  return write(K.mix(tenderId), record, {
    actorId: byId, action: 'Best-fit mix approved', target: tenderId,
    detail: [`${MIX_LABEL[option]} mix approved for ${chosen.picks.length} packages, levelled total ${money(chosen.total.amount, ccy)} before overrides.`, ...lines, NO_COMMITMENT].join(' '),
  });
}
