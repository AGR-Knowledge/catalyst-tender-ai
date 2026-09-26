import { can } from '@/data/access';
import { personById, type Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { DG2_QUORUM, DG2_SEATS, NEAR_WD, SLA_AT_RISK_SHARE } from '@/data/gcc/targets';
import type { InputItem, Lifecycle, S3Facts } from '@/data/gcc/lifecycle';
import type { Credential } from '@/data/gcc/types';
import { DEMO_TODAY, dateText } from '@/domain/calendar';
import { money } from '@/domain/money';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { DEMO_NOW, durationText, minutesBetween } from '../clock';
import { currentOf, deadlineWd, openGate, queriesFor, staleOf, tenderCtx, type DemoDone, type OpenGate } from '../lifecycle';
import { countryCodeOf } from '../s1/common';
import { eligibilityFor } from '../s1/eligibility';
import { blockingOpen } from '../s1/validation';
import type { GateChipState } from '../gateChips';
import type { KpiCtx } from '../kpi/types';
import type { ActionDue, ActionPrimary, ActionVM, GateKey, RowScope } from '../viewmodels';
import type { ActionSource } from './types';

/**
 * The portfolio dashboards' "Needs your action" (plan 015 Phase 4,
 * dashboards.md §4, §10.1–10.3, §12.4), and the queries they share with the
 * portfolio KPIs and the sidebar's gate chips, so a tile, a row and a chip
 * never disagree:
 * - `dg1Open`: DG1 due now (SCR-1, DG1 rows, the DG1 chip);
 * - `credentialsAtRisk`: certificates that expire before a live bid opens (SCR-6, Renewal rows);
 * - `inputsOutstanding`: contributor inputs not yet given (DEC-7, Late input rows);
 * - `dg2Open` and `dg3Open`: gates waiting for a decision (DG2 and DG3 rows and chips).
 *
 * Every lifecycle is read through `queriesFor`, so the viewer never counts a
 * tender their table hides, and demo actions (plan 021) show here too.
 *
 * Order (dashboards.md §1 Z4, tuned to §12.4): blocking rows first (a breached
 * gate SLA, or a hard block such as a DG3 approval or a submission due within
 * five working days with something missing); then the viewer's own rows before
 * rows that wait on someone else; then the most urgent row of each type before
 * a second one of the same type, so the five visible rows show each kind of
 * thing that needs the viewer; types in the order of §10.1 (the approvals only
 * the viewer can give first); then time left, then value.
 */

/** Enough context to read the queries: the dashboards pass a `KpiCtx`, the sidebar builds one from the store. */
export type PortfolioCtx = Pick<KpiCtx, 'tenant' | 'viewer' | 'done' | 'now'> & { scope?: RowScope; viewAs?: boolean };

const q = (ctx: PortfolioCtx) => queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done });

/** The dashboard's scope. A stage scope doesn't narrow these: each query already names its stage. */
export const inScope = (l: Lifecycle, scope?: RowScope) => scope?.kind !== 'assigned' || l.bidManagerId === scope.personId;

/** Live tenders in scope. */
export const liveInScope = (ctx: PortfolioCtx) => q(ctx).live().filter((l) => inScope(l, ctx.scope));

const nameOf = (id: string | null | undefined) => personById(id)?.name ?? null;

const DEMO_YEAR = DEMO_TODAY.slice(0, 4);
/** "Sun 15 Mar", with the year only outside the demo year. */
export const dayText = (iso: string) => {
  const d = dateText(iso.slice(0, 10));
  return iso.startsWith(DEMO_YEAR) ? d.replace(/ \d{4}$/, '') : d;
};
/** "15 Mar": the day and month only, for tile sub-lines. */
export const dayMonth = (iso: string) => dayText(iso).replace(/^\w{3} /, '');
/** "today 16:10", "Mon 9 Mar 07:44". */
export const dueText = (iso: string) => `${iso.slice(0, 10) === DEMO_TODAY ? 'today' : dayText(iso)} ${iso.slice(11, 16)}`;

/** The tenant's own currency (the facility's). */
export const tenantCcy = (tenant: string) => gccData(tenant).facility.limit.ccy;

/** A short owner tag for a tile or a row: "Finance", "HR", "Compliance". */
export function ownerTag(id: string | null | undefined): string | null {
  const p = personById(id);
  if (!p) return null;
  const TAG: Partial<Record<Person['role'], string>> = {
    fin: 'Finance', hr: 'HR', comp: 'Compliance', coord: 'Tender Coordinator', comm: 'Commercial', plan: 'Planning', dir: 'Project Director', hot: 'Head of Tendering',
  };
  return TAG[p.role] ?? p.title;
}

/* ---------------------------------------------------------------- queries */

export interface Dg1Open { l: Lifecycle; g: OpenGate }

/** Live Stage 1 tenders waiting for DG1 (SCR-1), soonest SLA first. */
export function dg1Open(ctx: PortfolioCtx): Dg1Open[] {
  return liveInScope(ctx)
    .filter((l) => currentOf(l).stage === 1)
    .flatMap((l) => {
      const g = openGate(l);
      return g?.gate === 'DG1' ? [{ l, g }] : [];
    })
    .sort((a, b) => a.g.slaEnd.localeCompare(b.g.slaEnd));
}

/** DG1s the Head of Tendering oversees (dashboards.md §12.4): breached, due today, or with no Bid Manager. */
export const dg1Oversight = (ctx: PortfolioCtx) =>
  dg1Open(ctx).filter(({ l, g }) => !g.onTime || g.slaEnd.slice(0, 10) === DEMO_TODAY || !l.bidManagerId);

/** DG1s that wait on the Head of Tendering (the DG1 chip): breached, with a quarter of the SLA or less left, or with no Bid Manager. */
const dg1OnHot = (ctx: PortfolioCtx) =>
  dg1Open(ctx).filter(({ l, g }) => !g.onTime || g.leftShare <= SLA_AT_RISK_SHARE || !l.bidManagerId);

export interface Dg2Open { l: Lifecycle; f: S3Facts; g: OpenGate; recorded: number; quorumMet: boolean }

/** Stage 3 tenders whose pack is issued and whose DG2 is not yet decided. */
export function dg2Open(ctx: PortfolioCtx): Dg2Open[] {
  return liveInScope(ctx).flatMap((l) => {
    const g = openGate(l);
    if (g?.gate !== 'DG2' || l.facts?.stage !== 3) return [];
    const recorded = Object.keys(l.facts.positions.bySeat).length;
    return [{ l, f: l.facts, g, recorded, quorumMet: recorded >= DG2_QUORUM }];
  }).sort((a, b) => a.g.slaEnd.localeCompare(b.g.slaEnd));
}

/** Stage 7 tenders with a DG3 pack issued and no decision. */
export function dg3Open(ctx: PortfolioCtx): { l: Lifecycle; g: OpenGate; gaps: number }[] {
  return liveInScope(ctx).flatMap((l) => {
    const g = openGate(l);
    return g?.gate === 'DG3' ? [{ l, g, gaps: l.facts?.stage === 7 ? l.facts.mandatoryGaps : 0 }] : [];
  }).sort((a, b) => a.g.slaEnd.localeCompare(b.g.slaEnd));
}

/** The date a live bid is opened: its key dates for Stages 1–3, else the Stage 8 opening or the submission deadline. */
export function openingOf(tenant: string, l: Lifecycle): string | null {
  const reg = gccData(tenant).register.find((t) => t.id === l.tenderId);
  const kd = reg?.keyDates.find((k) => k.kind === 'opening')?.date;
  if (kd && currentOf(l).stage <= 3) return kd;
  if (l.facts?.stage === 8) return l.facts.openingDate;
  return kd ?? l.submissionDeadline?.date ?? null;
}

export interface CredentialRisk {
  cred: Credential;
  /** The expiry, after any renewal recorded in the demo. */
  validTo: string;
  /** The bids it puts at risk, earliest check date first. */
  bids: { l: Lifecycle; checkDate: string; checkLabel: 'opens' | 'is submitted' | 'stays valid' }[];
  requested: boolean;
}

const CHECK_LABEL: Record<string, CredentialRisk['bids'][number]['checkLabel']> = { opening: 'opens', submission: 'is submitted', validity: 'stays valid' };

/**
 * SCR-6 (dashboards.md §11.1): company certificates that expire before a live
 * bid is opened. Tenders with extracted requirements use 007a's eligibility
 * lines, so this agrees with Screening (including the date each line is
 * checked on); the others check every certificate of the bid's country
 * against the opening date. Bids already opened are past the check.
 */
export function credentialsAtRisk(ctx: PortfolioCtx): CredentialRisk[] {
  if (!isGccTenantKey(ctx.tenant)) return [];
  const d = gccData(ctx.tenant);
  const byId = new Map<string, CredentialRisk>();
  const renewedTo = (c: Credential) => {
    const raw = ctx.done[`renewed:${c.id}`];
    if (!raw) return c.validTo;
    try { return (JSON.parse(raw) as { validTo?: string }).validTo ?? c.validTo; } catch { return c.validTo; }
  };
  const add = (c: Credential, l: Lifecycle, checkDate: string, kind: string) => {
    const validTo = renewedTo(c);
    if (!validTo || validTo >= checkDate) return;
    const r = byId.get(c.id) ?? { cred: c, validTo, bids: [], requested: !!ctx.done[`renewal-requested:${c.id}`] && ctx.done[`renewal-requested:${c.id}`] !== 'no' };
    if (!r.bids.some((b) => b.l.tenderId === l.tenderId)) r.bids.push({ l, checkDate, checkLabel: CHECK_LABEL[kind] ?? 'opens' });
    byId.set(c.id, r);
  };
  for (const l of liveInScope(ctx)) {
    const opening = openingOf(ctx.tenant, l);
    if (!opening || opening < DEMO_TODAY) continue;
    const reg = d.register.find((t) => t.id === l.tenderId);
    if (reg?.requirements?.length) {
      const e = eligibilityFor(ctx.tenant, l.tenderId, ctx.done);
      for (const line of e?.lines ?? []) {
        for (const r of line.renew ?? []) {
          const c = d.credentials.find((x) => x.id === r.credentialId);
          const kind = reg.requirements.find((x) => x.id === line.reqId)?.validAt ?? 'opening';
          if (c) add(c, l, line.checkedAgainst.date, kind);
        }
      }
    } else {
      for (const c of d.credentials) if (!c.country || c.country === countryCodeOf(l.country)) add(c, l, opening, 'opening');
    }
  }
  return [...byId.values()]
    .map((r) => ({ ...r, bids: r.bids.sort((a, b) => a.checkDate.localeCompare(b.checkDate)) }))
    .sort((a, b) => a.validTo.localeCompare(b.validTo));
}

export interface InputOutstanding { l: Lifecycle; item: InputItem; late: boolean }

/** Contributor inputs for Stage 3 packs not yet given (DEC-7), late ones first. */
export function inputsOutstanding(ctx: PortfolioCtx): InputOutstanding[] {
  return liveInScope(ctx)
    .flatMap((l) => (l.facts?.stage === 3 ? l.facts.inputs.items.filter((i) => !i.submittedAt).map((item) => ({ l, item, late: item.due < ctx.now })) : []))
    .sort((a, b) => Number(b.late) - Number(a.late) || a.item.due.localeCompare(b.item.due));
}

/* ------------------------------------------------------------- the rows */

/** The route to a gate or pack screen once it is built, else the tender (dashboards.md §4: never a dead button). */
function route(path: string, builtLabel: string, tenderId: string): ActionPrimary {
  return isScreenBuilt(path)
    ? { kind: 'route', label: builtLabel, to: `${path}?tender=${encodeURIComponent(tenderId)}` }
    : { kind: 'route', label: 'Open tender', to: `/tenders/${encodeURIComponent(tenderId)}` };
}

const sla = (g: OpenGate): ActionDue => ({ kind: 'sla', start: g.openedAt, end: g.slaEnd });

/** The order of row types (dashboards.md §10.1, then §10.2 and §10.3). */
const TYPE_ORDER = [
  'dg3.approve', 'dg2.approve', 'dg2.position', 'dg1.decide', 'booklet.approve', 'dg1.oversight',
  'pack.issue', 'pack.stale', 'submission.due', 'renewal.request', 'input.nudge',
];

interface Urgency { source: string; blocking: boolean; waiting: boolean; minutesLeft: number; value?: number }

/**
 * The sort key the list orders by (lower first). `repeat` is the row's place
 * among its source's rows, set by `ranked`. The terms are kept in separate
 * decimal ranges so each only breaks ties of the one before.
 */
function urgencyOf(u: Urgency, repeat: number): number {
  const tier = u.blocking ? 0 : 1;
  const waiting = u.waiting && !u.blocking ? 1 : 0;
  const type = Math.max(0, TYPE_ORDER.indexOf(u.source));
  const time = Math.min(9.9e7, Math.max(0, u.minutesLeft + 1e6));
  const value = Math.min(0.99, (u.value ?? 0) / 1e12);
  return tier * 1e13 + waiting * 1e12 + (u.blocking ? 0 : Math.min(repeat, 9)) * 1e11 + type * 1e8 + time - value;
}

/** Rows of one source, most urgent first, with the urgency the list sorts by. */
function ranked(rows: { row: Omit<ActionVM, 'urgency'>; u: Urgency }[]): ActionVM[] {
  const sorted = [...rows].sort((a, b) => urgencyOf(a.u, 0) - urgencyOf(b.u, 0));
  return sorted.map(({ row, u }, i) => ({ ...row, urgency: urgencyOf(u, i) }));
}

const left = (ctx: PortfolioCtx, end: string) => minutesBetween(ctx.now, end);

/** The Head of Tendering, for "Waiting on …". */
const hotOf = (tenant: string) => personById(`${tenant}.hot`);
const waitingOn = (p: Person | undefined | null) => (p ? { name: p.name, role: p.title } : undefined);

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Addendum 2, 09:12": what made the pack stale, and when. */
function staleShort(tenant: string, l: Lifecycle): string | null {
  const s = staleOf(tenant, l);
  if (!s) return null;
  const what = s.text.replace(/^since \d\d:\d\d \(/, '').split(/ received|:|\)/)[0].trim();
  return `${what}, ${s.since.slice(11, 16)}`;
}

/* ---- DG3 approval (Head of Tendering) */

const dg3Approve: ActionSource = {
  id: 'dg3.approve',
  cap: 'tender.view',
  rows(ctx) {
    const hot = hotOf(ctx.tenant);
    return ranked(dg3Open(ctx).map(({ l, g, gaps }) => {
      const mine = can(ctx.viewer, 'dg3.decide').ok;
      const wd = deadlineWd(l, ctx.tenant);
      return {
        u: { source: 'dg3.approve', blocking: !g.onTime || (wd !== null && wd <= NEAR_WD), waiting: !mine, minutesLeft: left(ctx, g.slaEnd), value: l.value.amount },
        row: {
          id: `dg3.approve:${l.tenderId}`, source: 'dg3.approve', type: 'DG3 approval', typeTone: 'orange', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: gaps ? `Evidence incomplete: ${count(gaps, 'mandatory gap')}` : `${mine ? 'Ready for your approval' : 'Ready for approval'}: evidence complete`,
          due: sla(g),
          ...(mine ? {} : { waitingOn: waitingOn(hot), disabledReason: 'The Head of Tendering approves' }),
          primary: route('/dg3', 'Open DG3', l.tenderId),
        },
      };
    }));
  },
};

/* ---- DG2 approval (Head of Tendering) */

const dg2Approve: ActionSource = {
  id: 'dg2.approve',
  cap: 'tender.view',
  rows(ctx) {
    const hot = hotOf(ctx.tenant);
    return ranked(dg2Open(ctx).map(({ l, g, recorded, quorumMet }) => {
      const mine = can(ctx.viewer, 'dg2.decide').ok;
      const stale = staleShort(ctx.tenant, l);
      // Position counts say how the committee stands: only for people who may see positions.
      const sees = can(ctx.viewer, 'see.positions', tenderCtx(ctx.tenant, l)).ok;
      const quorum = !sees ? 'With the committee'
        : quorumMet
          ? `Quorum met: ${mine ? 'ready for your approval' : 'ready for approval'}`
          : `${recorded} of ${DG2_SEATS} positions · quorum needs ${DG2_QUORUM}`;
      return {
        u: { source: 'dg2.approve', blocking: !g.onTime, waiting: !mine, minutesLeft: left(ctx, g.slaEnd), value: l.value.amount },
        row: {
          id: `dg2.approve:${l.tenderId}`, source: 'dg2.approve', type: 'DG2 approval', typeTone: 'orange', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: stale ? `${quorum} · pack stale (${stale})` : quorum,
          due: sla(g),
          ...(mine ? {} : { waitingOn: waitingOn(hot), disabledReason: 'The Head of Tendering approves' }),
          primary: route('/dg2', 'Open DG2', l.tenderId),
        },
      };
    }));
  },
};

/* ---- DG2 position (committee members; on the portfolio, the CEO) */

const dg2Position: ActionSource = {
  id: 'dg2.position',
  cap: 'dg2.view',
  rows(ctx) {
    const seat = ctx.viewer.seat;
    if (!seat || !can(ctx.viewer, 'dg2.position', { seat }).ok) return [];
    return ranked(dg2Open(ctx).filter(({ f }) => !f.positions.bySeat[seat]).map(({ l, g }) => {
      const stale = staleShort(ctx.tenant, l);
      return {
        u: { source: 'dg2.position', blocking: !g.onTime, waiting: false, minutesLeft: left(ctx, g.slaEnd), value: l.value.amount },
        row: {
          id: `dg2.position:${l.tenderId}`, source: 'dg2.position', type: 'DG2 position', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: stale ? `Your position is needed · pack stale (${stale})` : 'Your position is needed',
          due: sla(g),
          primary: route('/dg2', 'Open DG2', l.tenderId),
        },
      };
    }));
  },
};

/* ---- Booklet purchase (Head of Tendering) */

const bookletKey = (tenderId: string) => `booklet-approved:${tenderId}`;

const bookletApprove: ActionSource = {
  id: 'booklet.approve',
  cap: 'tender.view',
  rows(ctx) {
    const d = gccData(ctx.tenant);
    const hot = hotOf(ctx.tenant);
    const mine = can(ctx.viewer, 'booklet.approve').ok;
    return ranked(liveInScope(ctx).flatMap((l) => {
      const f = l.facts;
      if (f?.stage !== 1 || f.documents === 'downloaded' || !f.documents.requestedById || ctx.done[bookletKey(l.tenderId)]) return [];
      const doc = f.documents;
      const fee = money(doc.fee.amount, doc.fee.ccy);
      const portal = d.sources.find((s) => s.id === l.source.sourceId)?.name ?? 'the portal';
      const requester = nameOf(doc.requestedById) ?? 'the Tender Coordinator';
      const closes = `${doc.purchaseBy}T23:59`;
      return [{
        u: { source: 'booklet.approve', blocking: false, waiting: !mine, minutesLeft: left(ctx, closes), value: l.value.amount },
        row: {
          id: `booklet.approve:${l.tenderId}`, source: 'booklet.approve', type: 'Booklet purchase', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: `${fee} via ${portal} · purchase closes ${dayText(doc.purchaseBy)} · requested by ${requester}`,
          due: { kind: 'date', date: doc.purchaseBy },
          ...(mine ? {} : { waitingOn: waitingOn(hot), disabledReason: 'The Head of Tendering approves' }),
          primary: {
            kind: 'inplace', label: 'Approve purchase', doneLabel: 'Approved {time}',
            markKey: bookletKey(l.tenderId), markValue: JSON.stringify({ at: ctx.now, byId: ctx.viewer.id }),
            audit: { action: `Approved booklet purchase ${fee} for ${l.tenderId}`, target: l.tenderId, detail: `Requested by ${requester}; bought on ${portal} by ${dayText(doc.purchaseBy)}` },
            toast: `Purchase approved. ${requester} can buy the booklet on ${portal}.`,
          },
        },
      }];
    }));
  },
};

/* ---- DG1 (the Bid Manager decides; the Head of Tendering oversees) */

const dg1Decide: ActionSource = {
  id: 'dg1.decide',
  cap: 'dg1.view',
  rows(ctx) {
    return ranked(dg1Open(ctx).filter(({ l }) => can(ctx.viewer, 'dg1.decide', tenderCtx(ctx.tenant, l)).ok).map(({ l, g }) => {
      const block = blockingOpen(ctx.tenant, l.tenderId, ctx.done);
      return {
        u: { source: 'dg1.decide', blocking: !g.onTime, waiting: false, minutesLeft: left(ctx, g.slaEnd), value: l.value.amount },
        row: {
          id: `dg1.decide:${l.tenderId}`, source: 'dg1.decide', type: 'DG1 decision', typeTone: g.onTime ? undefined : 'red', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: block.count ? `Pursue or discard · Pursue is locked: ${block.text}` : 'Pursue or discard: the evidence pack is ready',
          due: sla(g),
          primary: route('/dg1', 'Open DG1', l.tenderId),
        },
      };
    }));
  },
  next(ctx) {
    const first = dg1Open(ctx)[0];
    return first ? `Next: DG1 on ${first.l.tenderId}, due ${dueText(first.g.slaEnd)}` : null;
  },
};

const dg1Oversee: ActionSource = {
  id: 'dg1.oversight',
  cap: 'dg1.view',
  rows(ctx) {
    const delegate = can(ctx.viewer, 'dg1.delegate');
    return ranked(dg1Oversight(ctx).filter(({ l }) => l.bidManagerId !== ctx.viewer.id).map(({ l, g }) => {
      const bm = personById(l.bidManagerId);
      const primary = route('/dg1', 'Record as delegate', l.tenderId);
      return {
        u: { source: 'dg1.oversight', blocking: !g.onTime, waiting: !!bm, minutesLeft: left(ctx, g.slaEnd), value: l.value.amount },
        row: {
          id: `dg1.oversight:${l.tenderId}`, source: 'dg1.oversight', type: 'DG1 due', typeTone: g.onTime ? undefined : 'red', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: !bm ? 'No Bid Manager assigned: record it as delegate or assign one'
            : g.onTime ? `Due ${dueText(g.slaEnd)}` : `Overdue by ${durationText(-left(ctx, g.slaEnd))}: you can record it as ${bm.name}'s delegate`,
          due: sla(g),
          ...(bm ? { waitingOn: waitingOn(bm) } : {}),
          ...(delegate.ok ? {} : { disabledReason: `${bm?.name ?? 'The Bid Manager'} records DG1` }),
          primary,
        },
      };
    }));
  },
};

/* ---- Renewal (Head of Tendering; the Bid Manager for their bids) */

const renewalRequest: ActionSource = {
  id: 'renewal.request',
  cap: 'tender.view',
  rows(ctx) {
    return ranked(credentialsAtRisk(ctx).filter((r) => !r.requested).map((r) => {
      const first = r.bids[0];
      const owner = nameOf(r.cred.ownerId) ?? 'its owner';
      const mayAsk = can(ctx.viewer, 'input.request', tenderCtx(ctx.tenant, first.l)).ok;
      return {
        u: { source: 'renewal.request', blocking: false, waiting: false, minutesLeft: left(ctx, `${r.validTo}T23:59`), value: first.l.value.amount },
        row: {
          id: `renewal.request:${r.cred.id}`, source: 'renewal.request', type: 'Renewal', tenderId: first.l.tenderId, shortTitle: first.l.shortTitle,
          what: `${r.cred.label} expires ${dayText(r.validTo)}, before ${first.l.tenderId} ${first.checkLabel} ${dayText(first.checkDate)} · owner ${owner}`,
          due: { kind: 'date', date: r.validTo },
          ...(mayAsk ? {} : { disabledReason: 'The Head of Tendering or the Bid Manager requests renewals' }),
          primary: {
            kind: 'inplace', label: 'Request renewal', doneLabel: 'Requested {time}', markKey: `renewal-requested:${r.cred.id}`,
            // Who asked, and when, so My requests credits the right person.
            markValue: JSON.stringify({ at: ctx.now, byId: ctx.viewer.id }),
            audit: { action: 'Requested credential renewal', target: first.l.tenderId, detail: `${r.cred.label}, expires ${dateText(r.validTo)}; asked of ${owner}` },
            toast: `Renewal requested from ${owner}. It is in their requests.`,
          },
        },
      };
    }));
  },
};

/* ---- Late input (Head of Tendering; the Bid Manager for their bids) */

const inputNudge: ActionSource = {
  id: 'input.nudge',
  cap: 'tender.view',
  rows(ctx) {
    return ranked(inputsOutstanding(ctx).filter((x) => x.late && ctx.done[`nudged:${x.item.id}`] !== 'yes').map(({ l, item }) => {
      const owner = nameOf(item.ownerId) ?? 'The owner';
      const tag = ownerTag(item.ownerId);
      const mayAsk = can(ctx.viewer, 'input.request', tenderCtx(ctx.tenant, l)).ok;
      return {
        u: { source: 'input.nudge', blocking: false, waiting: false, minutesLeft: left(ctx, item.due), value: l.value.amount },
        row: {
          id: `input.nudge:${item.id}`, source: 'input.nudge', type: 'Late input', typeTone: 'orange', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: `${tag ? `${tag} input` : 'Input'}: ${item.what} · ${owner}`,
          due: { kind: 'sla', start: item.requestedAt, end: item.due },
          ...(mayAsk ? {} : { disabledReason: 'The Head of Tendering or the Bid Manager sends reminders' }),
          primary: {
            kind: 'inplace', label: 'Nudge', doneLabel: 'Reminded {time}', markKey: `nudged:${item.id}`,
            audit: { action: 'Sent a reminder', target: l.tenderId, detail: `${item.what}, to ${owner}` },
            toast: `${owner} has been reminded. The reminder is in the audit log.`,
          },
        },
      };
    }));
  },
};

/* ---- Packs and submissions (Bid Manager) */

const packIssue: ActionSource = {
  id: 'pack.issue',
  cap: 'pack.view',
  rows(ctx) {
    return ranked(liveInScope(ctx).flatMap((l) => {
      const f = l.facts;
      if (f?.stage !== 3 || f.pack !== 'preparation' || !can(ctx.viewer, 'pack.issue', tenderCtx(ctx.tenant, l)).ok) return [];
      const open = f.inputs.items.filter((i) => !i.submittedAt);
      const lastDue = open.map((i) => i.due).sort().pop();
      return [{
        u: { source: 'pack.issue', blocking: false, waiting: false, minutesLeft: lastDue ? left(ctx, lastDue) : 1e6, value: l.value.amount },
        row: {
          id: `pack.issue:${l.tenderId}`, source: 'pack.issue', type: 'Pack', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: open.length
            ? `Issue the Bid / No-Bid pack · ${open.length} of ${f.inputs.requested} inputs outstanding${f.inputs.late ? `, ${f.inputs.late} late` : ''}`
            : 'Issue the Bid / No-Bid pack · every input is in',
          ...(lastDue ? { due: { kind: 'sla', start: f.inputs.items.map((i) => i.requestedAt).sort()[0], end: lastDue } as ActionDue } : {}),
          primary: route('/packs', 'Open pack', l.tenderId),
        },
      }];
    }));
  },
};

const packStale: ActionSource = {
  id: 'pack.stale',
  cap: 'pack.view',
  rows(ctx) {
    return ranked(dg2Open(ctx).filter(({ l }) => can(ctx.viewer, 'pack.issue', tenderCtx(ctx.tenant, l)).ok).flatMap(({ l, g }) => {
      const stale = staleOf(ctx.tenant, l);
      if (!stale) return [];
      return [{
        u: { source: 'pack.stale', blocking: false, waiting: false, minutesLeft: left(ctx, g.slaEnd), value: l.value.amount },
        row: {
          id: `pack.stale:${l.tenderId}`, source: 'pack.stale', type: 'Pack', typeTone: 'orange', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: `Pack stale (${staleShort(ctx.tenant, l)}) · re-run it before the committee decides`,
          due: sla(g),
          primary: route('/packs', 'Open pack', l.tenderId),
        },
      }];
    }));
  },
};

const submissionDue: ActionSource = {
  id: 'submission.due',
  cap: 'tender.view',
  rows(ctx) {
    return ranked(liveInScope(ctx).flatMap((l) => {
      if (!l.submissionDeadline || l.submission || !can(ctx.viewer, 'pack.issue', tenderCtx(ctx.tenant, l)).ok) return [];
      const wd = deadlineWd(l, ctx.tenant);
      if (wd === null || wd < 0 || wd > NEAR_WD) return [];
      const f = l.facts;
      const missing: string[] = [];
      if (f?.stage === 8) {
        if (f.signaturesPending) missing.push(count(f.signaturesPending, 'signature') + ' pending');
        if (f.packageReadyPct < 100) missing.push(`package ${f.packageReadyPct}% ready`);
        if (!f.bond.issued) missing.push('bid bond not issued');
        else if (f.bond.validTo < f.bond.requiredTo) missing.push('bid bond validity too short');
      } else {
        const g = openGate(l);
        missing.push(g ? `waiting for ${g.gate} approval` : `still in ${currentOf(l).stage === 7 ? 'Compliance' : `Stage ${currentOf(l).stage}`}`);
      }
      if (!missing.length) return [];
      const at = `${l.submissionDeadline.date}T${l.submissionDeadline.time}`;
      return [{
        u: { source: 'submission.due', blocking: true, waiting: false, minutesLeft: left(ctx, at), value: l.value.amount },
        row: {
          id: `submission.due:${l.tenderId}`, source: 'submission.due', type: 'Submission', typeTone: 'red', tenderId: l.tenderId, shortTitle: l.shortTitle,
          what: `Due in ${count(wd, 'working day')} · ${missing.join(' · ')}`,
          due: { kind: 'date', date: l.submissionDeadline.date, time: l.submissionDeadline.time },
          primary: { kind: 'route', label: 'Open tender', to: `/tenders/${encodeURIComponent(l.tenderId)}` },
        },
      }];
    }));
  },
};

export const ACTION_SOURCES: ActionSource[] = [
  dg3Approve, dg2Approve, dg2Position, bookletApprove, dg1Decide, dg1Oversee, renewalRequest, inputNudge, packIssue, packStale, submissionDue,
];

/* ------------------------------------------------------------ gate chips */

/**
 * The sidebar chip for a gate (plan 015 Phase 6, dashboards.md §8.3): red when
 * something at the gate that waits on the viewer is past its SLA, orange when
 * something waits on them, outline otherwise. Who waits:
 * - DG1: the assigned Bid Manager, and the Head of Tendering once a DG1 is
 *   breached, has a quarter of its SLA or less left, or has no Bid Manager;
 * - DG2: the Head of Tendering once quorum is met, and members without a position;
 * - DG3: the Head of Tendering.
 */
export function gateChipState(gate: GateKey, ctx: PortfolioCtx): GateChipState {
  const v = ctx.viewer;
  let waits: OpenGate[] = [];
  if (gate === 'DG1') {
    const own = dg1Open(ctx).filter(({ l }) => l.bidManagerId === v.id && can(v, 'dg1.decide', tenderCtx(ctx.tenant, l)).ok);
    const oversee = can(v, 'dg1.delegate').ok ? dg1OnHot(ctx).filter(({ l }) => l.bidManagerId !== v.id) : [];
    waits = [...own, ...oversee].map((x) => x.g);
  } else if (gate === 'DG2') {
    const open = dg2Open(ctx);
    const approve = can(v, 'dg2.decide').ok ? open.filter((x) => x.quorumMet) : [];
    const seat = v.seat;
    const position = seat && can(v, 'dg2.position', { seat }).ok ? open.filter((x) => !x.f.positions.bySeat[seat]) : [];
    waits = [...approve, ...position].map((x) => x.g);
  } else if (can(v, 'dg3.decide').ok) {
    waits = dg3Open(ctx).map((x) => x.g);
  }
  if (!waits.length) return 'open';
  return waits.some((g) => !g.onTime) ? 'breached' : 'waiting-on-me';
}

/** For the sidebar, which has the store but no dashboard context. */
export const chipCtx = (tenant: string, viewer: Person, done: DemoDone): PortfolioCtx =>
  ({ tenant, viewer, done: done as Record<string, string>, now: DEMO_NOW });
