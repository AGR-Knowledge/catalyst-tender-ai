import type { Tone } from '@/data/types';
import { can, holdersOf } from '@/data/access';
import type { Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Ccy } from '@/data/gcc/fx';
import {
  BAND, blockOf, demonymOf, supplierProfileSeed,
  type CertKind, type ContactSeed, type DocumentSeed, type FinancialYear, type SupplierProfileSeed,
} from '@/data/gcc/s2/profiles';
import { DEMO_TODAY, addDays, calendarDaysBetween } from '@/domain/calendar';
import { convert } from '@/domain/money';
import type { MoneyVM } from '../viewmodels';
import { queriesFor } from '../lifecycle.port';
import {
  approvedShortlist, candidatesFor, liveS2Tenders, packagesFor, recommendedShortlist, rfqsFor, screeningOf, sentBy, supplierOf, tenantOf, type Done,
} from '../s2';
import { countryName } from '../company';
import { LOAD_LABEL, rfqStateOf, supplierMasterFor, supplierProfileFor, tradeLabel, type SupplierProfileVM, type SupplierRowVM } from './profile';
import { HEALTH_TONE, healthOf, type HealthWord } from './health';
import { evaluationOf, quartersOf, totalsOf, type EvaluationVM, type QuarterTotals, type QuarterVM } from './performance';

/**
 * One supplier's full profile (plan 031 step 2.3): the master's row and the
 * sheet's screening, held places and open RFQs (`supplierProfileFor`), the
 * generated profile seed, the health word, where it fits on today's live
 * tenders (the Stage 2 rules), its jobs resolved to the tenders the company
 * won, its certificates against demo day, and what the viewer may see.
 *
 * Supplier financials show to every `supplier.view` holder. Awarded values
 * show only with `see.quotes` or `see.quotes.summary`; otherwise they are
 * null and the page masks them. Every check goes through `can()`.
 */

/** An amount in the supplier's currency, with the company-currency equivalent when they differ. */
export interface PairVM { own: MoneyVM; company: MoneyVM | null }

export interface JobVM {
  id: string;
  tenderId: string;
  /** Null when the viewer may not open the tender. */
  title: string | null;
  client: string | null;
  packageTitle: string;
  kind: 'supply' | 'subcontract';
  awardedAt: string;
  startedAt: string;
  dueAt: string;
  deliveredAt?: string;
  /** Now: share of the time from start to due that has gone, held back by any slip. */
  progressPct: number;
  status: { label: string; tone: Tone };
  /** Null when masked for the viewer. */
  value: MoneyVM | null;
  note?: string;
}

export interface CompletedVM {
  projectId: string;
  title: string;
  client: string;
  packageTitle: string;
  kind: 'supply' | 'subcontract';
  completed: string;
  rating: number;
  onTime: boolean;
  ncrs: number;
  value: MoneyVM | null;
}

export type Standing = 'replied' | 'rfq-sent' | 'overdue' | 'declined' | 'shortlisted' | 'recommended' | 'held' | 'blocked' | 'not-shortlisted';
export const STANDING: Record<Standing, { label: string; tone: Tone }> = {
  replied: { label: 'Replied', tone: 'green' },
  'rfq-sent': { label: 'RFQ sent', tone: 'ink' },
  overdue: { label: 'Reply overdue', tone: 'orange' },
  declined: { label: 'Declined', tone: 'grey' },
  shortlisted: { label: 'On the shortlist', tone: 'ink' },
  recommended: { label: 'Recommended', tone: 'ink' },
  held: { label: 'Held by screening', tone: 'orange' },
  blocked: { label: 'Blocked', tone: 'red' },
  'not-shortlisted': { label: 'Not shortlisted', tone: 'grey' },
};

export interface FitVM {
  tenderId: string;
  /** Null when the viewer may not open the tender. */
  shortTitle: string | null;
  pkgId: string;
  pkgTitle: string;
  standing: Standing;
  label: string;
  tone: Tone;
  /** When its RFQ is due back, while it is open. */
  replyBy?: string;
}

export type CertState = 'valid' | 'soon' | 'expired';
export const CERT_STATE: Record<CertState, { label: string; tone: Tone }> = {
  valid: { label: 'Valid', tone: 'green' }, soon: { label: 'Renew soon', tone: 'orange' }, expired: { label: 'Expired', tone: 'red' },
};
/** "Renew soon" is 60 days or less before the valid-to date. */
export const RENEW_SOON_DAYS = 60;

export interface CertVM { kind: CertKind; name: string; no: string; issuer: string; validTo: string; state: CertState; label: string; tone: Tone; days: number }

export interface SupplierDetailVM {
  id: string;
  row: SupplierRowVM;
  sheet: SupplierProfileVM;
  seed: SupplierProfileSeed;
  country: string;
  company: {
    legalName: string;
    registration: { label: string; no: string };
    established: number;
    hq: string;
    staff: number;
    ownership: string;
    /** "Saudi share 100%", or null for a foreign-owned firm. */
    localShare: string | null;
    classification: string | null;
    geographies: string[];
    /** Full client names, as the register spells them. */
    avl: string[];
  };
  summary?: string;
  risk?: string;
  block: { kind: 'sanctions' | 'antiBribery'; at: string; label: string } | null;
  /** The profile's currency and the company's. */
  ccy: Ccy;
  companyCcy: Ccy;
  reportedInUsd: boolean;
  health: { word: HealthWord; tone: Tone; fy: FinancialYear };
  accounts: (FinancialYear & { revenueVm: PairVM; netWorthVm: PairVM; revenuePct: number })[];
  interim: { label: string; to: string; revenueToDate: PairVM; orderBook: PairVM; bgCapacity: PairVM };
  rating: SupplierProfileSeed['rating'];
  paymentTerms: string;
  insurance: { cover: string; limit: PairVM; insurer: string; validTo: string };
  capabilities: { trade: string; kind: 'supply' | 'subcontract'; weeks: [number, number]; largestOrder: PairVM }[];
  fits: FitVM[];
  jobsNow: JobVM[];
  delivered: JobVM[];
  completed: CompletedVM[];
  load: { key: SupplierRowVM['s']['load']; label: string; tone: Tone; sentence: string; bandTop: number };
  quarters: QuarterVM[];
  totals: QuarterTotals;
  evaluation: EvaluationVM;
  certificates: CertVM[];
  screening: SupplierProfileSeed['screeningHistory'];
  contacts: ContactSeed[];
  portalUser: { id: string; name: string; title: string } | null;
  documents: DocumentSeed[];
  /** Awarded values visible to the viewer (`see.quotes` or `see.quotes.summary`). */
  valuesVisible: boolean;
  valuesMaskedBy: string;
  /** Its RFQs still waiting for a reply: the oldest reply date already passed, and the soonest still to come. */
  openReplies: { overdueSince: string | null; nextBy: string | null };
}

const pairOf = (amount: number, ccy: Ccy, to: Ccy): PairVM => ({
  own: { amount, ccy },
  company: ccy === to ? null : { amount: convert(amount, ccy, to), ccy: to, original: { amount, ccy } },
});

/** Money in the company's currency, keeping the stated amount when converted. */
const inCompany = (amount: number, ccy: Ccy, to: Ccy): MoneyVM =>
  (ccy === to ? { amount, ccy } : { amount: convert(amount, ccy, to), ccy: to, original: { amount, ccy } });

export const certStateOf = (validTo: string, today = DEMO_TODAY): CertState =>
  (validTo < today ? 'expired' : validTo <= addDays(today, RENEW_SOON_DAYS) ? 'soon' : 'valid');

/** "Load · High: its whole order book; 1 job is for us" (orchestrator, B1). */
export function loadSentence(load: SupplierRowVM['s']['load'], now: number): string {
  const us = now === 0 ? 'no job is for us now' : now === 1 ? '1 job is for us' : `${now} jobs are for us`;
  return `Load · ${LOAD_LABEL[load].label}: its whole order book; ${us}`;
}

const JOB_STATUS = (slip: number): { label: string; tone: Tone } =>
  (slip === 0 ? { label: 'On track', tone: 'green' } : slip <= 3 ? { label: 'Watch', tone: 'orange' } : { label: 'Late', tone: 'red' });

/** The glance the master and the sheet read: health, jobs now and the last evaluation. No money. */
export interface SupplierGlance { health: HealthWord; healthTone: Tone; fy: number; now: number; delivered: number; evaluation: EvaluationVM }

export function supplierGlanceOf(tenant: string, id: string): SupplierGlance | null {
  const seed = supplierProfileSeed(tenant, id);
  if (!seed) return null;
  const latest = seed.accounts[seed.accounts.length - 1];
  const health = healthOf(latest);
  const now = seed.jobs.filter((j) => j.state === 'now').length;
  return {
    health, healthTone: HEALTH_TONE[health], fy: latest.fy, now,
    delivered: seed.jobs.filter((j) => j.state === 'delivered').length,
    evaluation: evaluationOf(seed.evaluation),
  };
}

/** Where the supplier fits on today's live tenders: every package in its trade, with its standing from the shortlist and RFQ rules. */
export function fitsFor(tenant: string, supplierId: string, done: Done, viewer: Person): FitVM[] {
  const q = queriesFor({ tenant, viewer, done });
  const s = supplierOf(tenant, supplierId);
  const sc = s ? screeningOf(s) : null;
  const sendable = !!sc?.sendable;
  const blocked = sc?.state === 'blocked';
  const out: FitVM[] = [];
  for (const rec of liveS2Tenders(tenant, done)) {
    const rfqs = rfqsFor(tenant, rec.tenderId, done);
    const shortTitle = q.one(rec.tenderId)?.shortTitle ?? null;
    for (const { pkg } of packagesFor(tenant, rec.tenderId, done)) {
      if (!candidatesFor(tenant, pkg).some((x) => x.id === supplierId)) continue;
      const rfq = rfqs.find((r) => r.packageId === pkg.id && r.supplierId === supplierId && sentBy(r));
      let standing: Standing;
      let replyBy: string | undefined;
      if (rfq) {
        const st = rfqStateOf(rfq);
        standing = st === 'replied' ? 'replied' : st === 'declined' ? 'declined' : st === 'overdue' ? 'overdue' : 'rfq-sent';
        if (st === 'due' || st === 'overdue') replyBy = rfq.replyBy;
      } else {
        // Not sent: the approved shortlist, else the agent's recommendation. A place that screening holds says so.
        const approved = approvedShortlist(tenant, rec.tenderId, pkg.id, done);
        const onList = approved
          ? approved.supplierIds.includes(supplierId)
          : recommendedShortlist(tenant, rec.tenderId, pkg.id, done).items.some((i) => i.supplierId === supplierId);
        // A blocked supplier can never be shortlisted: its packages say so, not "not shortlisted".
        standing = blocked ? 'blocked' : !onList ? 'not-shortlisted' : !sendable ? 'held' : approved ? 'shortlisted' : 'recommended';
      }
      out.push({ tenderId: rec.tenderId, shortTitle, pkgId: pkg.id, pkgTitle: pkg.title, standing, label: STANDING[standing].label, tone: STANDING[standing].tone, ...(replyBy ? { replyBy } : {}) });
    }
  }
  // What needs the buyer first: open RFQs, then places on shortlists, then the rest.
  const order: Standing[] = ['overdue', 'rfq-sent', 'replied', 'held', 'shortlisted', 'recommended', 'declined', 'blocked', 'not-shortlisted'];
  return out.sort((a, b) => order.indexOf(a.standing) - order.indexOf(b.standing) || a.tenderId.localeCompare(b.tenderId) || a.pkgId.localeCompare(b.pkgId));
}

export function supplierDetailFor(tenant: string, id: string, done: Done, viewer: Person): SupplierDetailVM | null {
  if (!isGccTenantKey(tenant)) return null;
  const master = supplierMasterFor(tenant, done);
  const row = master.rows.find((r) => r.id === id);
  const seed = supplierProfileSeed(tenant, id);
  if (!row || !seed) return null;
  const s = row.s;
  const sheet = supplierProfileFor(tenant, row, done, viewer, master.held.rows);
  // The sheet's held places read screening; a held place is "Held by screening" here too.
  const heldKeys = new Set(sheet.held.map((h) => `${h.tenderId}:${h.pkgId}`));
  const q = queriesFor({ tenant, viewer, done });
  const companyCcy = tenantOf(tenant).ccy;
  const valuesVisible = can(viewer, 'see.quotes').ok || can(viewer, 'see.quotes.summary').ok;
  const latest = seed.accounts[seed.accounts.length - 1];
  const health = healthOf(latest);
  const maxRevenue = Math.max(...seed.accounts.map((a) => a.revenue));
  const block = blockOf(s);
  const demonym = demonymOf(s.country);
  const projects = gccData(tenant).projects;

  const jobOf = (j: SupplierProfileSeed['jobs'][number]): JobVM => {
    const l = q.one(j.tenderId);
    const span = Math.max(1, calendarDaysBetween(j.startedAt, j.dueAt));
    const gone = Math.max(0, calendarDaysBetween(j.startedAt, DEMO_TODAY));
    const held = span / (span + j.slipWeeks * 7);
    const progressPct = j.state === 'delivered' ? 100 : Math.max(3, Math.min(97, Math.round((100 * gone * held) / span)));
    const status = j.state === 'delivered'
      ? (j.slipWeeks === 0 ? { label: 'Delivered on time', tone: 'green' as Tone } : { label: `Delivered ${j.slipWeeks} ${j.slipWeeks === 1 ? 'week' : 'weeks'} late`, tone: 'orange' as Tone })
      : JOB_STATUS(j.slipWeeks);
    return {
      id: j.id, tenderId: j.tenderId, title: l?.shortTitle ?? null, client: l?.issuer ?? null, packageTitle: j.packageTitle, kind: j.kind,
      awardedAt: j.awardedAt, startedAt: j.startedAt, dueAt: j.dueAt, ...(j.deliveredAt ? { deliveredAt: j.deliveredAt } : {}),
      progressPct, status, value: valuesVisible ? inCompany(j.value, j.ccy, companyCcy) : null, ...(j.note ? { note: j.note } : {}),
    };
  };
  const jobsNow = seed.jobs.filter((j) => j.state === 'now').map(jobOf).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const delivered = seed.jobs.filter((j) => j.state === 'delivered').map(jobOf).sort((a, b) => (b.deliveredAt ?? '').localeCompare(a.deliveredAt ?? ''));

  const fits = fitsFor(tenant, id, done, viewer).map((f) => (heldKeys.has(`${f.tenderId}:${f.pkgId}`) && f.standing !== 'held' && f.standing !== 'blocked'
    ? { ...f, standing: 'held' as Standing, label: STANDING.held.label, tone: STANDING.held.tone } : f));
  const quarters = quartersOf(seed.quarters, seed.jobs);
  const dates = (state: 'due' | 'overdue') => sheet.rfqs.filter((r) => r.state === state).map((r) => r.replyBy).sort();

  return {
    id, row, sheet, seed, country: row.country,
    company: {
      legalName: seed.company.legalName, registration: seed.company.registration, established: seed.company.established,
      hq: `${seed.company.city}, ${row.country}`, staff: seed.company.staff, ownership: seed.company.ownership,
      localShare: seed.company.localSharePct !== null && demonym ? `${demonym} share ${seed.company.localSharePct}%` : null,
      classification: seed.company.classification, geographies: seed.company.geographies.map(countryName), avl: s.avl,
    },
    ...(seed.summary ? { summary: seed.summary } : {}),
    ...(seed.risk ? { risk: seed.risk } : {}),
    block: block ? { ...block, label: row.sc.label } : null,
    ccy: seed.ccy, companyCcy, reportedInUsd: seed.reportedInUsd,
    health: { word: health, tone: HEALTH_TONE[health], fy: latest },
    accounts: seed.accounts.map((a) => ({
      ...a, revenueVm: pairOf(a.revenue, seed.ccy, companyCcy), netWorthVm: pairOf(a.netWorth, seed.ccy, companyCcy), revenuePct: Math.round((100 * a.revenue) / maxRevenue),
    })),
    interim: {
      label: seed.interim.label, to: seed.interim.to,
      revenueToDate: pairOf(seed.interim.revenueToDate, seed.ccy, companyCcy), orderBook: pairOf(seed.interim.orderBook, seed.ccy, companyCcy),
      bgCapacity: pairOf(seed.interim.bgCapacity, seed.ccy, companyCcy),
    },
    rating: seed.rating, paymentTerms: seed.paymentTerms,
    insurance: { cover: seed.insurance.cover, limit: pairOf(seed.insurance.limit, seed.ccy, companyCcy), insurer: seed.insurance.insurer, validTo: seed.insurance.validTo },
    capabilities: seed.capabilities.map((c) => ({ trade: tradeLabel(c.trade), kind: c.kind, weeks: c.weeks, largestOrder: pairOf(c.largestOrder, seed.ccy, companyCcy) })),
    fits, jobsNow, delivered,
    completed: seed.completed.flatMap((c) => {
      const p = projects.find((x) => x.id === c.projectId);
      return p ? [{
        projectId: c.projectId, title: p.title, client: p.client, packageTitle: c.packageTitle, kind: c.kind, completed: c.completed,
        rating: c.rating, onTime: c.onTime, ncrs: c.ncrs, value: valuesVisible ? inCompany(c.value, c.ccy, companyCcy) : null,
      }] : [];
    }),
    load: { key: s.load, label: LOAD_LABEL[s.load].label, tone: LOAD_LABEL[s.load].tone, sentence: loadSentence(s.load, jobsNow.length), bandTop: BAND[s.load].top },
    quarters, totals: totalsOf(quarters), evaluation: evaluationOf(seed.evaluation),
    certificates: seed.certificates.map((c) => {
      const state = certStateOf(c.validTo);
      return { ...c, state, label: CERT_STATE[state].label, tone: CERT_STATE[state].tone, days: calendarDaysBetween(DEMO_TODAY, c.validTo) };
    }),
    screening: seed.screeningHistory,
    contacts: seed.contacts,
    portalUser: sheet.contact,
    documents: seed.documents,
    valuesVisible, valuesMaskedBy: holdersOf('see.quotes'),
    openReplies: { overdueSince: dates('overdue')[0] ?? null, nextBy: dates('due')[0] ?? null },
  };
}

