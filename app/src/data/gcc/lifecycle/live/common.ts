import { TENANTS, type CountryCode } from '@/data/tenants';
import { GCC_DOC_FILES } from '@/data/extracted/gcc';
import { HERO_FILE, HERO_ID, HERO_REF } from '../../hero';
import type { BidOutcome, Dg1Record, Dg2History, GccTender, Money, TenantSeed } from '../../types';
import type { GccTenantKey } from '../../index';
import { POOLS, acronymOf } from '../pools';
import { hash32 } from '../rng';
import { buildChain, type ChainSpec, type GateSpec } from '../chain';
import type { Lifecycle, S1Facts, S8Facts } from '../types';

/**
 * Helpers for the hand-authored lifecycles (plan 017 Phase 2). They reshape
 * the tenant seed into chain specs; they never invent a number.
 */

export const ccOf = (tenant: string): CountryCode => TENANTS.find((t) => t.key === tenant)!.countryCode;

/** A reference as a URL path segment: "ECWS/PRJ/2026/0147" → "ECWS-PRJ-2026-0147". */
const slug = (ref: string) => ref.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Where a notice came from. Portals get a notice URL on the reserved
 * `.example` domain (dashboards.md §5); mailboxes, scans and uploads get none.
 */
export function sourceOf(tenant: GccTenantKey, sourceId: string, ref: string, documentHref?: string): Lifecycle['source'] {
  const host = POOLS[tenant].hosts[sourceId];
  return { sourceId, ref, ...(host && ref !== 'Restricted' ? { url: `https://${host}/tenders/${slug(ref)}` } : {}), ...(documentHref ? { documentHref } : {}) };
}

/**
 * The reference plan 004 wrote for a tender, if any: its intake event's, or
 * an addendum's base reference ("WCWS/PRJ/2026/0009, Addendum 2" →
 * "WCWS/PRJ/2026/0009").
 */
export function authoredRef(seed: TenantSeed, id: string): string | undefined {
  const events = seed.intakeToday.filter((e) => e.tenderId === id);
  const e = events.find((x) => x.docType !== 'Addendum') ?? events[0];
  return e?.ref.replace(/,\s*Addendum \d+$/, '');
}

/**
 * The employer's reference, in the hero's style ("NCWS/PRJ/2026/0378"): the
 * one plan 004 wrote when there is one, else generated. A generated serial
 * never repeats the TID's number: it is the number plus an offset seeded by
 * the issuer and the year, so it is fixed and unique within that issuer's year.
 */
export const refFor = (issuer: string, id: string, seed?: TenantSeed) => {
  const authored = seed && authoredRef(seed, id);
  if (authored) return authored;
  const [, year, n] = id.split('-');
  const acronym = acronymOf(issuer);
  const serial = Number(n) + 17 + (hash32(`ref:${acronym}:${year}`) % 283);
  return `${acronym}/PRJ/${year}/${String(serial).padStart(4, '0')}`;
};

/** The team that carries a tender: its commitment if it has one, else the team of its sector. */
export function teamFor(seed: TenantSeed, tenderId: string, sector: string): string {
  const committed = seed.teams.find((t) => t.commitments.some((c) => c.tenderId === tenderId));
  if (committed) return committed.id;
  const bySector = seed.teams.find((t) => t.sector === sector || t.sector.includes(sector.split(' ')[0]));
  return (bySector ?? seed.teams[0]).id;
}

/** Bank guarantee headroom (DEC-6): limit − utilised − Σ committed. */
export function headroomOf(seed: TenantSeed): number {
  const f = seed.facility;
  return f.limit.amount - f.utilised.amount - f.committed.reduce((s, c) => s + c.amount.amount, 0);
}

/** Headroom left after this bid's initial guarantee at `pct` of its value (S3 facts). */
export function facilityAfter(seed: TenantSeed, value: number, pct: number): Money {
  return { amount: headroomOf(seed) - Math.round((value * pct) / 100), ccy: seed.facility.limit.ccy };
}

/** The base of a chain spec for one of plan 004's register rows. */
export function fromRegister(tenant: GccTenantKey, seed: TenantSeed, t: GccTender): Pick<ChainSpec,
  'tenant' | 'cc' | 'id' | 'title' | 'shortTitle' | 'issuer' | 'city' | 'country' | 'sector' | 'value' | 'teamId' | 'bidManagerId' | 'source' | 'restricted' | 'origin' | 'captured' | 'submissionDeadline'> {
  const ref = t.id === HERO_ID ? HERO_REF : refFor(t.issuer, t.id, seed);
  const doc = t.id === HERO_ID ? HERO_FILE : t.docKey ? GCC_DOC_FILES[t.docKey] : undefined;
  const deadline = t.keyDates.find((k) => k.kind === 'submission');
  return {
    tenant, cc: ccOf(tenant), id: t.id, title: t.title, shortTitle: t.shortTitle, issuer: t.issuer, city: t.city, country: t.country, sector: t.sector,
    value: { amount: t.value.amount, ccy: t.value.ccy, basis: t.value.basis },
    teamId: teamFor(seed, t.id, t.sector), bidManagerId: t.bidManagerId,
    source: sourceOf(tenant, t.sourceId, ref, doc), ...(t.restricted ? { restricted: true } : {}), origin: 'story',
    captured: t.intake.capturedAt,
    ...(deadline ? { submissionDeadline: { date: deadline.date, time: deadline.time ?? '10:00' } } : {}),
  };
}

export function registerRow(seed: TenantSeed, id: string): GccTender {
  const t = seed.register.find((r) => r.id === id);
  if (!t) throw new Error(`Lifecycle: no register row ${id} in ${seed.key}`);
  return t;
}

export function dg1Record(seed: TenantSeed, id: string): Dg1Record {
  const r = seed.historySeed.dg1.find((d) => d.tenderId === id);
  if (!r) throw new Error(`Lifecycle: no DG1 record ${id} in ${seed.key}`);
  return r;
}

export function dg2Record(seed: TenantSeed, id: string): Dg2History {
  const r = seed.historySeed.dg2.find((d) => d.tenderId === id);
  if (!r) throw new Error(`Lifecycle: no DG2 record ${id} in ${seed.key}`);
  return r;
}

export function outcomeRecord(seed: TenantSeed, id: string): BidOutcome {
  const r = seed.historySeed.outcomes.find((o) => o.id === id);
  if (!r) throw new Error(`Lifecycle: no outcome ${id} in ${seed.key}`);
  return r;
}

export const dg1Gate = (r: Dg1Record): GateSpec => ({
  at: r.at, decision: r.decision, byId: r.byId, onTime: r.withinSla, reasonCodes: r.reasonCodes, recommendation: r.recommendation, ...(r.note ? { note: r.note } : {}),
});

export const dg2Gate = (r: Dg2History, byId: string): GateSpec => ({
  at: r.at, decision: r.decision, byId, onTime: r.withinSla, ...(r.againstMajority ? { againstMajority: true } : {}), ...(r.reopened ? { reopened: r.reopened } : {}),
});

/** Stage 1 facts with the interim eligibility counts: only for a tender without extracted requirements. */
export const s1 = (pass: number, atRisk: number, failCount: number, language: S1Facts['language'], extra: Partial<S1Facts> = {}): S1Facts => ({
  stage: 1, eligibility: { pass, atRisk, interpretation: 0, fail: failCount }, documents: 'downloaded', language, ...extra,
});

/** Stage 1 facts for a tender with extracted requirements: its eligibility is 007a's `eligibilityFor`, never a copy (plan 020 B12). */
export const s1Derived = (language: S1Facts['language'], extra: Partial<S1Facts> = {}): S1Facts => ({
  stage: 1, documents: 'downloaded', language, ...extra,
});

/** Stage 1 steps between capture and M1 (logged), for rows logged this morning. */
export function intakeSteps(captured: string, docsIn: string, logged: string): Record<string, string> {
  const m = (iso: string, d: number) => {
    const t = Date.parse(`${iso}:00Z`) + d * 60_000;
    return new Date(t).toISOString().slice(0, 16);
  };
  const validating = m(logged, -6) < docsIn ? docsIn : m(logged, -6);
  const screened = m(logged, -2) < validating ? validating : m(logged, -2);
  return { '1:captured': captured, '1:documents-in': docsIn, '1:validating': validating, '1:screened': screened };
}

/* --------------------------------------------------------------- the kit */


/**
 * Builders for one tenant's hand-authored rows: `story` for a plan 004
 * register row, `row` for a new tender, `fromOutcome` for a tender that
 * carries one of plan 004's outcomes into Stage 9.
 */
export function liveKit(tenant: GccTenantKey, seed: TenantSeed, portal: string) {
  const hot = `${tenant}.hot`;
  const bidManager = `${tenant}.bid`;
  const ccy = seed.facility.limit.ccy;
  const M = 1_000_000;
  const money = (m: number): Money => ({ amount: Math.round(m * M), ccy });
  const country = POOLS[tenant].country;

  const story = (id: string, spec: Partial<ChainSpec>): Lifecycle =>
    buildChain({ ...fromRegister(tenant, seed, registerRow(seed, id)), ...spec } as ChainSpec);

  const row = (id: string, title: string, shortTitle: string, issuer: string, city: string, sector: string, valueM: number, sourceId: string,
    spec: Omit<Partial<ChainSpec>, 'id' | 'title'> & { captured: string }): Lifecycle =>
    buildChain({
      tenant, cc: ccOf(tenant), id, title, shortTitle, issuer, city, country, sector,
      value: { amount: money(valueM).amount, ccy, basis: 'estimate' }, teamId: teamFor(seed, id, sector), bidManagerId: bidManager,
      source: sourceOf(tenant, sourceId, refFor(issuer, id, seed)), origin: 'live', ...spec,
    } as ChainSpec);

  const pursue = (at: string): GateSpec => ({ at, decision: 'pursue', byId: bidManager, onTime: true, recommendation: 'pursue' });
  const bid = (at: string): GateSpec => ({ at, decision: 'bid', byId: hot, onTime: true });
  const approved = (at: string): GateSpec => ({ at, decision: 'approved', byId: hot, onTime: true });
  const sub = (at: string, deadline: string) => ({ at, deadline, onTime: at <= deadline, portal });
  const s8 = (p: Omit<S8Facts, 'stage' | 'bond'>, bondM: number, validTo: string, requiredTo: string, issued = true): S8Facts =>
    ({ stage: 8, ...p, bond: { amount: money(bondM), validTo, requiredTo, issued } });

  /** A live Stage 9 tender built from plan 004's outcome record: its title, value, submission and result dates. */
  const fromOutcome = (outcomeId: string, id: string, issuer: string, city: string, sourceId: string,
    spec: Omit<Partial<ChainSpec>, 'id' | 'title'> & { captured: string }): Lifecycle => {
    const o = outcomeRecord(seed, outcomeId);
    const deadline = `${o.submitted}T12:00`;
    return row(id, o.title, o.title, issuer, city, o.sector, o.value.amount / M, sourceId, {
      clientType: o.clientType, origin: 'history',
      submission: sub(`${o.submitted}T11:00`, deadline),
      result: {
        at: `${o.decided}T11:00`, result: o.result === 'won' ? 'won' : 'lost', ...(o.lossReason ? { lossReason: o.lossReason } : {}),
        ...(o.predictedWin !== undefined ? { predictedWin: o.predictedWin } : {}), ...(o.result === 'won' ? { value: o.value } : {}),
      },
      ...spec,
    });
  };

  return { hot, bidManager, money, story, row, pursue, bid, approved, sub, s8, fromOutcome };
}
