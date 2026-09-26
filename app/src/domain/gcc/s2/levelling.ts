import type { Money } from '@/data/gcc/types';
import {
  ADVANCE_NOTE_ABOVE_PCT, CUSTOMS_DUTY_PCT, EXCLUSION_ALLOWANCES, FREIGHT_PCT, GCC_COUNTRIES, REGION_OF, VAT_PCT,
  type AdjKey, type Quote, type TenderPackage,
} from '@/data/gcc/s2';
import { convert, money, rateNote } from '@/domain/money';
import { dateText } from '@/domain/calendar';
import { K, NOW, readDone, write, type Done, type LevValue, type S2WriteResult } from './done';
import { bidCcy, dateOf, liveS2Tenders, requiredValidityDays, supplierName, supplierOf } from './context';
import { packagesFor } from './packaging';
import { quotesFor } from './rfq';

/**
 * Quote levelling (spec §8.6): every quote restated in the bid currency,
 * excluding VAT and delivered to site, with every adjustment shown and
 * sourced. The agent proposes; the buyer confirms or rejects each one.
 */

export type AdjKind = 'currency' | 'vat' | 'delivery' | 'validity' | 'exclusion' | 'deviations' | 'payment' | 'lead-time';
export type AdjState = 'proposed' | 'confirmed' | 'rejected';

export interface Adjustment {
  key: AdjKey;
  kind: AdjKind;
  label: string;
  from: string;
  to: string;
  /** The change in the bid currency; absent for a restatement or a flag. */
  delta?: Money;
  /** The agent's own figure, before a buyer changed it. */
  proposedDelta?: Money;
  estimated: boolean;
  source: string;
  state: AdjState;
  /** A flag this adjustment raises (validity, compliance, cash flow, schedule). */
  flag?: string;
  note?: string;
}

export interface LevelledVM {
  quoteId: string;
  tenderId: string;
  packageId: string;
  supplierId: string;
  supplierName: string;
  original: Money;
  /** Excluding VAT, delivered to site, in the bid currency. Rejected adjustments are left out. */
  levelled: Money;
  adjustments: Adjustment[];
  compliant: boolean;
  flags: string[];
  state: 'to-level' | 'levelled';
  proposed: number;
}

const full = (m: Money) => money(m.amount, m.ccy, { full: true });
const round = (n: number) => Math.round(n);

/** The country the goods ship from: "Busan, KR" → KR, else the supplier's country. */
const originCountry = (q: Quote, fallback: string) => (q.origin?.match(/\b([A-Z]{2})$/)?.[1] ?? fallback);

const COUNTRY_NAME: Record<string, string> = { SA: 'Saudi Arabia', AE: 'the UAE', OM: 'Oman', BH: 'Bahrain', QA: 'Qatar', KW: 'Kuwait' };

/** The decision on an adjustment: seeded before demo day, else a `lev:` key, else proposed (plan 008a §7.1.1). */
function decisionOf(q: Quote, key: AdjKey, done: Done): { state: AdjState; lev: LevValue | null } {
  const seeded = q.seededDecisions?.[key];
  if (seeded) return { state: seeded, lev: null };
  const lev = readDone<LevValue>(done, K.lev(q.id, key));
  return { state: lev?.state ?? 'proposed', lev };
}

export function levelQuote(tenant: string, q: Quote, pkg: TenderPackage, done: Done): LevelledVM {
  const ccy = bidCcy(tenant, q.tenderId);
  const supplier = supplierOf(tenant, q.supplierId);
  const adjustments: Adjustment[] = [];
  const add = (a: Omit<Adjustment, 'state'>) => {
    const { state, lev } = decisionOf(q, a.key, done);
    // A buyer may change an estimated amount; the agent's figure is kept.
    const changed = lev?.amount !== undefined && a.delta ? { delta: { amount: lev.amount, ccy }, proposedDelta: a.delta } : {};
    adjustments.push({ ...a, ...changed, state, ...(lev?.note ? { note: lev.note } : {}) });
    return state !== 'rejected' ? (changed.delta ?? a.delta)?.amount ?? 0 : 0;
  };

  const original: Money = { amount: q.amount, ccy: q.ccy };
  let value = round(convert(q.amount, q.ccy, ccy));
  const page = q.page ? `quote p. ${q.page}` : 'the quote';

  // 1. Currency: a restatement at the demo bid rate.
  if (q.ccy !== ccy) {
    add({ key: 'currency', kind: 'currency', label: `Converted from ${q.ccy} to ${ccy} at the demo bid rate`, from: full(original), to: full({ amount: value, ccy }),
      estimated: false, source: rateNote(q.ccy, ccy) });
  }

  // 2. VAT: an inclusive price is shown excluding VAT at the supplier's country rate.
  if (q.vatInclusive) {
    const cc = supplier?.country ?? '';
    const rate = VAT_PCT[cc];
    if (rate) {
      const excl = round(value / (1 + rate / 100));
      value += add({ key: 'vat', kind: 'vat', label: `VAT ${rate}% removed: shown excluding VAT`, from: `${full({ amount: value, ccy })} including VAT`, to: `${full({ amount: excl, ccy })} excluding VAT`,
        delta: { amount: excl - value, ccy }, estimated: false, source: `VAT in ${COUNTRY_NAME[cc] ?? cc} ${rate}%; the price is stated as inclusive of VAT (${page})` });
    } else {
      add({ key: 'vat', kind: 'vat', label: 'Zero-rated or outside scope: no VAT to remove', from: 'Stated as inclusive of VAT', to: 'No change',
        estimated: false, source: rate === 0 ? `${COUNTRY_NAME[cc] ?? cc} has no VAT` : `No VAT rate held for ${cc}: outside scope of the bid country's VAT` });
    }
  }

  // 3. Delivery terms: ex-works and free-carrier prices get freight and duty to reach delivered to site.
  if (q.incoterm !== 'DAP site') {
    const cc = originCountry(q, supplier?.country ?? '');
    const region = REGION_OF[cc];
    const inGcc = GCC_COUNTRIES.includes(cc);
    const freightPct = q.incoterm === 'CIF Dammam' ? FREIGHT_PCT.GCC : FREIGHT_PCT[region ?? 'Europe'];
    const freight = round(value * (freightPct / 100));
    const duty = inGcc ? 0 : round((value + freight) * (CUSTOMS_DUTY_PCT / 100));
    const to = value + freight + duty;
    const what = q.incoterm === 'CIF Dammam' ? 'Inland freight from Dammam port' : `Freight from ${region ?? 'Europe'} (${freightPct}%)`;
    value += add({ key: 'delivery', kind: 'delivery',
      label: `${q.incoterm} ${q.origin ?? cc}: ${what}${duty ? ` and ${CUSTOMS_DUTY_PCT}% customs duty` : ''} added, to reach delivered to site`,
      from: `${full({ amount: value, ccy })} ${q.incoterm}`, to: `${full({ amount: to, ccy })} delivered to site`,
      delta: { amount: freight + duty, ccy }, estimated: true,
      source: [
        `Benchmark freight ${freightPct}% of the ex-works value${region ? ` from ${region}` : ' (origin region not held: Europe rate used)'} [assumption]`,
        duty ? `GCC common customs duty ${CUSTOMS_DUTY_PCT}% on the value with freight` : 'GCC origin: no customs duty',
      ].join('; ') });
  }

  // 4. Validity: short validity is a flag, not money.
  const need = requiredValidityDays(tenant, q.tenderId);
  if (q.validityDays < need.days) {
    const flag = 'Validity short: request extension';
    add({ key: 'validity', kind: 'validity', label: flag, from: `${q.validityDays} days`, to: `${need.days} days required`, estimated: false, source: need.basis, flag });
  }

  // 5. Exclusions: a priced allowance from the benchmarks, marked estimated.
  const pkgValue = round(convert(pkg.value.amount, pkg.value.ccy, ccy));
  q.exclusions.forEach((text, i) => {
    const key = `exclusion-${i + 1}` as AdjKey;
    const allowance = EXCLUSION_ALLOWANCES.find((a) => text.toLowerCase().includes(a.match));
    if (allowance) {
      const amount = round(pkgValue * (allowance.pct / 100));
      value += add({ key, kind: 'exclusion', label: `${allowance.label} excluded: allowance of ${allowance.pct}% of the package value added`, from: `“${text}”`, to: `+ ${full({ amount, ccy })}`,
        delta: { amount, ccy }, estimated: true, source: `Benchmark allowance for ${allowance.label.toLowerCase()}, ${allowance.pct}% of the package value [assumption]; ${page}` });
    } else {
      add({ key, kind: 'exclusion', label: `Exclusion not priced: ${text}. Price it or ask the supplier`, from: `“${text}”`, to: 'No allowance held', estimated: false, source: `No benchmark allowance for this exclusion; ${page}` });
    }
  });

  // 6. Deviations: a non-compliant deviation stops the quote counting towards coverage.
  let compliant = true;
  if (q.deviations.length) {
    const nonCompliant = q.deviations.filter((d) => d.nonCompliant);
    const flagged = nonCompliant.length > 0;
    const flag = 'Non-compliant: does not count towards coverage';
    const { state } = decisionOf(q, 'deviations', done);
    // Confirming agrees with the agent's reading; rejecting reverses it.
    compliant = state === 'rejected' ? flagged : !flagged;
    add({ key: 'deviations', kind: 'deviations',
      label: flagged ? flag : `${q.deviations.length} ${q.deviations.length === 1 ? 'deviation' : 'deviations'} declared: check they are acceptable`,
      from: q.deviations.map((d) => d.text).join('; '), to: flagged ? 'Non-compliant' : 'Compliant, if accepted',
      estimated: false, source: `Deviations schedule, ${page}`, ...(flagged ? { flag } : {}) });
  }

  // 7. Payment terms: a large advance is a cash-flow note.
  if ((q.paymentAdvancePct ?? 0) > ADVANCE_NOTE_ABOVE_PCT) {
    const flag = `Cash-flow note: ${q.paymentAdvancePct}% advance requested; the main contract advances up to ${ADVANCE_NOTE_ABOVE_PCT}%`;
    add({ key: 'payment', kind: 'payment', label: flag, from: `${q.paymentAdvancePct}% advance`, to: `${ADVANCE_NOTE_ABOVE_PCT}% back to back`, estimated: false, source: `Payment terms, ${page}; RFQ payment terms`, flag });
  }

  // 8. Lead time: longer than the programme need is a schedule risk.
  if (q.leadTimeWeeks !== undefined && pkg.needByWeeks !== undefined && q.leadTimeWeeks > pkg.needByWeeks) {
    const flag = `Lead time ${q.leadTimeWeeks} weeks against ${pkg.needByWeeks} needed: schedule risk`;
    add({ key: 'lead-time', kind: 'lead-time', label: flag, from: `${q.leadTimeWeeks} weeks`, to: `${pkg.needByWeeks} weeks needed`, estimated: false, source: `Lead time, ${page}; programme need-by for ${pkg.id}`, flag });
  }

  const proposed = adjustments.filter((a) => a.state === 'proposed').length;
  const flags = adjustments.filter((a) => a.flag && a.state !== 'rejected').map((a) => a.flag!);
  return {
    quoteId: q.id, tenderId: q.tenderId, packageId: q.packageId, supplierId: q.supplierId, supplierName: supplierName(tenant, q.supplierId),
    original, levelled: { amount: value, ccy }, adjustments, compliant, flags: compliant ? flags.filter((f) => !f.startsWith('Non-compliant')) : flags,
    state: proposed ? 'to-level' : 'levelled', proposed,
  };
}

/** Levelled view models for every quote of a tender. */
export function levelledFor(tenant: string, tenderId: string, done: Done): LevelledVM[] {
  const pkgs = packagesFor(tenant, tenderId, done);
  return quotesFor(tenant, tenderId, done).flatMap((q) => {
    const pkg = pkgs.find((p) => p.pkg.id === q.packageId)?.pkg;
    return pkg ? [levelQuote(tenant, q, pkg, done)] : [];
  });
}

/** SRC-6: quotes with an adjustment still to confirm, across live tenders. */
export function toLevel(tenant: string, done: Done): { count: number; quotes: LevelledVM[]; oldest?: string } {
  const quotes = liveS2Tenders(tenant, done).flatMap((t) => levelledFor(tenant, t.tenderId, done)).filter((l) => l.state === 'to-level');
  const received = quotes.map((l) => quotesFor(tenant, l.tenderId, done).find((q) => q.id === l.quoteId)!.receivedAt).sort();
  return { count: quotes.length, quotes, ...(received.length ? { oldest: received[0] } : {}) };
}

/**
 * Confirm or reject an adjustment. A changed amount (bid currency) replaces an
 * estimated figure; the audit keeps the agent's figure. Rejecting the agent's
 * adjustment, or changing its amount, needs a note (CLAUDE.md rule 8).
 */
export function levelWrite(quoteId: string, adjKey: AdjKey, state: 'confirmed' | 'rejected', byId: string, amount?: number, note?: string, adjustment?: Adjustment, at = NOW): S2WriteResult<LevValue> {
  const why = note?.trim();
  const agentAmount = adjustment?.proposedDelta?.amount ?? adjustment?.delta?.amount;
  const changedAmount = amount !== undefined && amount !== agentAmount;
  if (state === 'rejected' && !why) return { error: 'Add a note saying why the agent’s adjustment is rejected.' };
  if (changedAmount && !why) return { error: 'Add a note saying why the amount differs from the agent’s figure.' };
  const record: LevValue = { state, ...(amount !== undefined ? { amount } : {}), ...(why ? { note: why } : {}), at, byId };
  const what = adjustment?.label ?? adjKey;
  const changed = amount !== undefined && changedAmount && adjustment?.delta
    ? ` Amount changed to ${full({ amount, ccy: adjustment.delta.ccy })}; the agent proposed ${full(adjustment.proposedDelta ?? adjustment.delta)}.`
    : '';
  return write(K.lev(quoteId, adjKey), record, {
    actorId: byId, action: state === 'confirmed' ? 'Levelling adjustment confirmed' : 'Levelling adjustment rejected', target: quoteId,
    detail: `${what}.${changed}${why ? ` Note: ${why}` : ''}`,
  });
}

export interface SideBySideRow { field: string; original: string; levelled: string; trace?: string }

/** The original quote against the levelled one, with the adjustment behind each change (spec §8.6 view). */
export function sideBySide(tenant: string, q: Quote, done: Done): { quoteId: string; rows: SideBySideRow[]; vm: LevelledVM } | null {
  const pkg = packagesFor(tenant, q.tenderId, done).find((p) => p.pkg.id === q.packageId)?.pkg;
  if (!pkg) return null;
  const vm = levelQuote(tenant, q, pkg, done);
  const adj = (k: AdjKind) => vm.adjustments.filter((a) => a.kind === k);
  const trace = (k: AdjKind) => adj(k).map((a) => `${a.label} (${a.state})`).join('; ') || undefined;
  const ccy = vm.levelled.ccy;
  const rows: SideBySideRow[] = [
    { field: 'Price', original: full(vm.original), levelled: full(vm.levelled), trace: vm.adjustments.filter((a) => a.delta).map((a) => a.label).join('; ') || undefined },
    { field: 'Currency', original: q.ccy, levelled: ccy, trace: trace('currency') },
    { field: 'VAT', original: q.vatInclusive ? 'Including VAT' : 'Excluding VAT', levelled: 'Excluding VAT', trace: trace('vat') },
    { field: 'Delivery', original: q.incoterm === 'DAP site' ? 'Delivered to site' : `${q.incoterm}${q.origin ? ` ${q.origin}` : ''}`, levelled: 'Delivered to site', trace: trace('delivery') },
    { field: 'Validity', original: `${q.validityDays} days`, levelled: `${q.validityDays} days`, trace: trace('validity') },
    { field: 'Exclusions', original: q.exclusions.join('; ') || 'None', levelled: adj('exclusion').filter((a) => a.delta && a.state !== 'rejected').map((a) => `Allowance ${full(a.delta!)}`).join('; ') || 'None priced', trace: trace('exclusion') },
    { field: 'Deviations', original: q.deviations.map((d) => d.text).join('; ') || 'None', levelled: vm.compliant ? 'Compliant' : 'Non-compliant', trace: trace('deviations') },
    { field: 'Payment', original: q.paymentAdvancePct ? `${q.paymentAdvancePct}% advance` : 'As the RFQ', levelled: 'As the RFQ', trace: trace('payment') },
    { field: 'Lead time', original: q.leadTimeWeeks !== undefined ? `${q.leadTimeWeeks} weeks` : 'Not stated', levelled: q.leadTimeWeeks !== undefined ? `${q.leadTimeWeeks} weeks` : 'Not stated', trace: trace('lead-time') },
    { field: 'Received', original: dateText(dateOf(q.receivedAt)), levelled: '' },
  ];
  return { quoteId: q.id, rows, vm };
}
