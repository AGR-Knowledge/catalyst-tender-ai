import type { Money } from '@/data/gcc/types';
import type { TenderPackage } from '@/data/gcc/s2';
import { HERO_ID, HERO_LINES } from '@/data/gcc/hero';
import { K, NOW, readDone, write, type Done, type PackagingMerge, type PackagingSplit, type PackagingValue, type S2Write } from './done';
import { boqTotal, lineValue, pct1, registerRow, s2TenderOf } from './context';

/**
 * Procurement packages (spec §8.2). The agent proposes them from the BOQ and
 * the capability profile; the Procurement Lead approves, splits or merges.
 */

export const PACKAGING_PROPOSED_BY = 'Proposed by the Outreach & Evaluation agent from the BOQ and the capability profile';

export type MakeOrBuy = 'self-install' | 'buy' | 'subcontract';

export interface PackageVM {
  pkg: TenderPackage;
  /** BOQ lines the package covers, and its share of the BOQ value (%, one decimal). */
  lines: { count: number; valueShare: number };
  makeOrBuy: MakeOrBuy;
  /** From benchmark rates. Buyer side only: never in an RFQ. */
  estimated: Money;
  longLead?: { weeks: number; text: string };
  /** The client's approved-vendor list requirement, when the tender names one. */
  avl?: string;
  lcRelevant: boolean;
  mandatoryList: boolean;
  approved: boolean;
}

export interface PackagingVM {
  tenderId: string;
  approved: boolean;
  at?: string;
  byId?: string;
  proposedBy: string;
  packages: PackageVM[];
}

const makeOrBuyOf = (p: TenderPackage): MakeOrBuy => (p.kind === 'subcontract' ? 'subcontract' : p.selfInstall ? 'self-install' : 'buy');

const heroValue = (items: string[]) => HERO_LINES.filter((l) => items.includes(l.item)).reduce((s, l) => s + lineValue(l), 0);
const heroLineCount = (items: string[]) => HERO_LINES.filter((l) => items.includes(l.item)).reduce((s, l) => s + l.lines, 0);

function applySplits(pkgs: TenderPackage[], splits: PackagingSplit[] = []): TenderPackage[] {
  return pkgs.flatMap((p) => {
    const split = splits.find((s) => s.from === p.id);
    // Only a package with BOQ items (the hero's) can be split: its parts' values come from the lines.
    if (!split || !p.lineItems) return [p];
    return split.parts.map((part) => ({
      ...p, id: part.id, title: part.title, lineItems: part.lineItems,
      value: { amount: heroValue(part.lineItems), ccy: p.value.ccy }, lineCount: heroLineCount(part.lineItems),
    }));
  });
}

function applyMerges(pkgs: TenderPackage[], merges: PackagingMerge[] = []): TenderPackage[] {
  const gone = new Set(merges.flatMap((m) => m.from));
  return pkgs.filter((p) => !gone.has(p.id)).map((p) => {
    const m = merges.find((x) => x.into === p.id);
    if (!m) return p;
    const all = [p, ...pkgs.filter((x) => m.from.includes(x.id))];
    const max = (xs: (number | undefined)[]) => (xs.some((x) => x !== undefined) ? Math.max(...xs.filter((x): x is number => x !== undefined)) : undefined);
    const min = (xs: (number | undefined)[]) => (xs.some((x) => x !== undefined) ? Math.min(...xs.filter((x): x is number => x !== undefined)) : undefined);
    const longLeadWeeks = max(all.map((x) => x.longLeadWeeks));
    const needByWeeks = min(all.map((x) => x.needByWeeks));
    return {
      ...p,
      title: all.map((x) => x.title).join(' + '),
      kind: all.some((x) => x.kind === 'subcontract') ? 'subcontract' : 'supply',
      value: { amount: all.reduce((s, x) => s + x.value.amount, 0), ccy: p.value.ccy },
      trades: [...new Set(all.flatMap((x) => x.trades))],
      ...(p.lineItems ? { lineItems: all.flatMap((x) => x.lineItems ?? []) } : {}),
      ...(p.lines ? { lines: all.flatMap((x) => x.lines ?? []) } : {}),
      lineCount: all.reduce((s, x) => s + (x.lineCount ?? 0), 0),
      ...(longLeadWeeks !== undefined ? { longLeadWeeks } : {}),
      ...(needByWeeks !== undefined ? { needByWeeks } : {}),
      mandatoryList: all.some((x) => x.mandatoryList),
      avlRequired: all.some((x) => x.avlRequired),
      lcRelevant: all.some((x) => x.lcRelevant),
      scope: all.map((x) => x.scope).join(' '),
      drawings: [...new Set(all.flatMap((x) => x.drawings))],
      quoteLevel: all.some((x) => x.quoteLevel === 'line') ? 'line' : 'package',
    } satisfies TenderPackage;
  });
}

/** Packaging approval: the `pkg:` key in the demo, else the seed. */
function approvalOf(tenant: string, tenderId: string, done: Done): { at: string; byId: string; value?: PackagingValue } | null {
  const v = readDone<PackagingValue>(done, K.pkg(tenderId));
  if (v?.approved) return { at: v.at, byId: v.byId, value: v };
  return s2TenderOf(tenant, tenderId)?.packagingApproved ?? null;
}

export function packagesFor(tenant: string, tenderId: string, done: Done): PackageVM[] {
  const rec = s2TenderOf(tenant, tenderId);
  if (!rec) return [];
  const approval = approvalOf(tenant, tenderId, done);
  const pkgs = applyMerges(applySplits(rec.packages, approval?.value?.splits), approval?.value?.merges);
  const total = boqTotal(rec).amount;
  const issuer = registerRow(tenant, tenderId)?.issuer;
  return pkgs.map((pkg) => ({
    pkg,
    lines: { count: pkg.lineCount ?? pkg.lines?.length ?? 0, valueShare: pct1(pkg.value.amount, total) },
    makeOrBuy: makeOrBuyOf(pkg),
    estimated: pkg.value,
    ...(pkg.longLeadWeeks ? { longLead: { weeks: pkg.longLeadWeeks, text: `Long lead: typically ${pkg.longLeadWeeks} weeks` } } : {}),
    ...(pkg.avlRequired
      ? { avl: tenderId === HERO_ID ? 'ECWS approved lists apply where they exist (§64.14.1, p. 27)' : `Client approved-vendor list applies: ${issuer ?? 'the client'}` }
      : {}),
    lcRelevant: !!(pkg.lcRelevant || pkg.mandatoryList),
    mandatoryList: !!pkg.mandatoryList,
    approved: !!approval,
  }));
}

export function packagingFor(tenant: string, tenderId: string, done: Done): PackagingVM {
  const approval = approvalOf(tenant, tenderId, done);
  return {
    tenderId, approved: !!approval, ...(approval ? { at: approval.at, byId: approval.byId } : {}),
    proposedBy: PACKAGING_PROPOSED_BY, packages: packagesFor(tenant, tenderId, done),
  };
}

/** Approve the packaging, optionally with splits and merges. */
export function packagingWrite(tenderId: string, byId: string, opts: { splits?: PackagingSplit[]; merges?: PackagingMerge[] } = {}, at = NOW): S2Write<PackagingValue> {
  const record: PackagingValue = { approved: true, ...(opts.splits?.length ? { splits: opts.splits } : {}), ...(opts.merges?.length ? { merges: opts.merges } : {}), at, byId };
  const changes = [
    ...(opts.splits ?? []).map((s) => `split ${s.from} into ${s.parts.map((p) => p.id).join(', ')}`),
    ...(opts.merges ?? []).map((m) => `merged ${m.from.join(', ')} into ${m.into}`),
  ];
  return write(K.pkg(tenderId), record, {
    actorId: byId, action: 'Packaging approved', target: tenderId,
    detail: changes.length ? `Approved with changes: ${changes.join('; ')}.` : 'Approved as proposed by the agent.',
  });
}
