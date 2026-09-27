import type { Tone } from '@/data/types';
import { firstWithRole, personById, type Person } from '@/data/people';
import type { Credential, CredentialKind } from '@/data/gcc/types';
import { DEMO_TODAY, addDays, calendarDaysBetween, dateText } from '@/domain/calendar';
import { DEMO_NOW } from '../clock';
import { credentialsAtRisk, type CredentialRisk } from '../actions/portfolio.actions';
import { queriesFor } from '../lifecycle.port';
import { requestsFor, type RequestStatus } from '../requests';
import { DONE_KEY, isFlagged, readDone, type Done } from '../s1/done';
import type { RenewedValue } from '../s1/eligibility';
import { capitalise, countWord, dataOf, listText, plural, shortDate } from '../s1/common';

/**
 * The credentials vault (plan 010, spec §6.5, catalogue §D Company ›
 * Credentials): each company credential with its state today and against the
 * live bids that need it, who owns it, whether a renewal was asked for, and
 * the renewal recorded in the demo.
 *
 * The credentials are the company's, so their states are read as the
 * portfolio stands for the Head of Tendering: every live bid, through SCR-6's
 * `credentialsAtRisk` (which reads 007a's eligibility lines). The vault's
 * at-risk count is therefore the dashboard's "Credentials at risk" tile, and
 * a Finance or HR owner, who is invited to few tenders, still sees the
 * certificate they must renew as at risk. The viewer decides only which of
 * those bids are named with their title and link.
 */

export type CredentialState = 'at-risk' | 'expired' | 'expiring' | 'renewed' | 'valid';

/** "Expiring" means within this many days of today (catalogue §D: "expiring in 90 days"). */
export const EXPIRING_DAYS = 90;

export const CREDENTIAL_STATE: Record<CredentialState, { label: string; tone: Tone; icon: string; rank: number }> = {
  'at-risk': { label: 'At risk', tone: 'orange', icon: '!', rank: 0 },
  expired: { label: 'Expired', tone: 'red', icon: '×', rank: 1 },
  expiring: { label: 'Expiring', tone: 'orange', icon: '!', rank: 2 },
  renewed: { label: 'Renewed', tone: 'green', icon: '✓', rank: 3 },
  valid: { label: 'Valid', tone: 'green', icon: '✓', rank: 4 },
};

export const KIND_LABEL: Record<CredentialKind, string> = {
  cr: 'Commercial registration', zakat: 'Zakat', gosi: 'Social insurance', chamber: 'Chamber membership', classification: 'Classification',
  'contractors-authority': 'Contractors authority', 'engineers-council': 'Engineers council', saudization: 'Nationalisation', vat: 'VAT',
  iso: 'ISO', 'lc-baseline': 'Local content', 'bank-reference': 'Bank reference', avl: 'Approved vendor', other: 'Other',
};

/** Where an expiry falls from today: gone, within `EXPIRING_DAYS`, later, or never. */
export type ExpiryWindow = 'expired' | 'soon' | 'later' | 'none';

export function expiryWindow(validTo: string | null): ExpiryWindow {
  if (validTo === null) return 'none';
  if (validTo < DEMO_TODAY) return 'expired';
  return validTo <= addDays(DEMO_TODAY, EXPIRING_DAYS) ? 'soon' : 'later';
}

export interface VaultPerson { id: string; name: string; title: string }

export interface VaultBid {
  tenderId: string;
  /** The short title, or null when the viewer may not open the tender. */
  shortTitle: string | null;
  canOpen: boolean;
  restricted: boolean;
  /** The date the credential must hold to on this bid. */
  checkDate: string;
  checkLabel: CredentialRisk['bids'][number]['checkLabel'];
}

export interface VaultRow {
  id: string;
  cred: Credential;
  /** After any renewal recorded in the demo; null = no expiry. */
  validTo: string | null;
  state: CredentialState;
  /** Calendar days from today to `validTo` (negative once expired). */
  daysLeft: number | null;
  /** Live bids it must hold for and does not, earliest check first (SCR-6). */
  bids: VaultBid[];
  owner: VaultPerson | null;
  /** The group entity holding it, when not the company itself. */
  holder?: string;
  /** The renewal the Head of Tendering asked for, as the owner's My requests reads it. */
  request: { at: string; by: VaultPerson | null; due: string | null; status: RequestStatus } | null;
  /** The renewal recorded in the demo. `from` is the expiry it replaced. */
  renewal: { validTo: string; at: string; by: VaultPerson | null; from: string | null } | null;
  /** One sentence: why the state reads as it does. */
  why: string;
}

export interface Vault {
  rows: VaultRow[];
  counts: { total: number; atRisk: number; expiring: number; expired: number; renewed: number };
  /** SCR-6's rows, which `counts.atRisk` counts. */
  risks: CredentialRisk[];
  /** Who the states are read as: the tenant's Head of Tendering. */
  reader: Person;
}

const personOf = (id: string | null | undefined): VaultPerson | null => {
  const p = personById(id);
  return p ? { id: p.id, name: p.name, title: p.title } : null;
};

/** The person the company's credential states are read as (every live bid): the Head of Tendering. */
export function vaultReader(tenant: string): Person {
  const p = firstWithRole(tenant, 'hot');
  if (!p) throw new Error(`No Head of Tendering in "${tenant}"`);
  return p;
}

/** The expiry after any renewal recorded in the demo. */
export function effectiveValidTo(c: Credential, done: Done): string | null {
  return readDone<RenewedValue>(done, DONE_KEY.renewed(c.id))?.validTo ?? c.validTo;
}

/** "T-2026-118", or "a restricted-lane bid" when the viewer is not cleared to know of it. */
export const bidName = (b: VaultBid) => (b.canOpen || !b.restricted ? b.tenderId : 'a restricted-lane bid');

function whyOf(row: Omit<VaultRow, 'why'>): string {
  const { validTo, state, bids, renewal } = row;
  const first = bids[0];
  const n = bids.length - 1;
  const more = n > 0 ? ` ${capitalise(countWord(n))} more live ${n === 1 ? 'bid needs' : 'bids need'} it after that.` : '';
  const verb = (b: VaultBid) => (b.checkLabel === 'opens' ? `opens on ${shortDate(b.checkDate)}` : b.checkLabel === 'is submitted' ? `is submitted on ${shortDate(b.checkDate)}` : `must stay valid to ${shortDate(b.checkDate)}`);
  if (validTo === null) return 'No expiry date.';
  if (state === 'expired') return `Expired on ${dateText(validTo)}.${first ? ` ${capitalise(bidName(first))} ${verb(first)}.${more}` : ''}`;
  if (state === 'at-risk') {
    const was = renewal ? ` Renewed to ${dateText(validTo)}, still short.` : '';
    return `Expires ${dateText(validTo)}, before ${bidName(first)} ${verb(first)}.${more}${was} Renew before submission.`;
  }
  if (state === 'renewed') return `Renewed to ${dateText(validTo)}${renewal?.from ? `, from ${dateText(renewal.from)}` : ''}. Every live bid is covered.`;
  if (state === 'expiring') return `Expires ${dateText(validTo)}, in ${plural(row.daysLeft ?? 0, 'day')}. No live bid needs it past that date.`;
  return `Valid to ${dateText(validTo)}.`;
}

/**
 * The vault as `viewer` sees it. States: at risk (valid today, expired when a
 * live bid needs it: SCR-6), expired, expiring within 90 days, renewed in the
 * demo, valid. Sorted at risk first, then by expiry.
 */
export function vaultFor(tenant: string, done: Done, viewer: Person): Vault {
  const d = dataOf(tenant);
  const reader = vaultReader(tenant);
  const risks = credentialsAtRisk({ tenant, viewer: reader, done, now: DEMO_NOW });
  const riskOf = new Map(risks.map((r) => [r.cred.id, r]));
  const q = queriesFor({ tenant, viewer, done });
  const entities = new Map((d.company.entities ?? []).map((e) => [e.id, e.name]));
  const asked = new Set(d.credentials.filter((c) => isFlagged(done, DONE_KEY.renewalRequested(c.id))).map((c) => c.ownerId));
  const requestsOf = new Map([...asked].map((id) => [id, requestsFor(tenant, id, done, viewer, DEMO_NOW)]));

  const rows = d.credentials.map((c): VaultRow => {
    const validTo = effectiveValidTo(c, done);
    const risk = riskOf.get(c.id);
    const renewed = readDone<RenewedValue>(done, DONE_KEY.renewed(c.id));
    const win = expiryWindow(validTo);
    const state: CredentialState = win === 'expired' ? 'expired' : risk ? 'at-risk' : renewed ? 'renewed' : win === 'soon' ? 'expiring' : 'valid';
    const bids = (risk?.bids ?? []).map((b): VaultBid => {
      const mine = q.one(b.l.tenderId);
      return { tenderId: b.l.tenderId, shortTitle: mine ? mine.shortTitle : null, canOpen: !!mine, restricted: !!b.l.restricted, checkDate: b.checkDate, checkLabel: b.checkLabel };
    });
    const ask = isFlagged(done, DONE_KEY.renewalRequested(c.id)) ? readDone<{ at?: string; byId?: string }>(done, DONE_KEY.renewalRequested(c.id)) : null;
    const req = ask ? requestsOf.get(c.ownerId)?.find((r) => r.id === `renewal:${c.id}`) : undefined;
    const row: Omit<VaultRow, 'why'> = {
      id: c.id, cred: c, validTo, state,
      daysLeft: validTo === null ? null : calendarDaysBetween(DEMO_TODAY, validTo),
      bids,
      owner: personOf(c.ownerId),
      ...(c.holder && entities.has(c.holder) ? { holder: entities.get(c.holder) } : {}),
      request: ask ? { at: req?.requestedAt ?? ask.at ?? DEMO_NOW, by: personOf(req?.requestedById ?? ask.byId), due: req?.due ?? null, status: req?.status ?? 'open' } : null,
      renewal: renewed ? { validTo: renewed.validTo, at: renewed.at, by: personOf(renewed.byId), from: c.validTo } : null,
    };
    return { ...row, why: whyOf(row) };
  });

  rows.sort((a, b) => CREDENTIAL_STATE[a.state].rank - CREDENTIAL_STATE[b.state].rank
    || (a.validTo ?? '9999').localeCompare(b.validTo ?? '9999') || a.cred.label.localeCompare(b.cred.label));

  return {
    rows,
    counts: {
      total: rows.length,
      atRisk: risks.length,
      expiring: rows.filter((r) => expiryWindow(r.validTo) === 'soon').length,
      expired: rows.filter((r) => r.state === 'expired').length,
      renewed: rows.filter((r) => r.renewal).length,
    },
    risks,
    reader,
  };
}

/** "Zakat 30 Apr, GOSI 7 May": the first few of a list of rows, for a tile's sub-line. */
export function rowsText(rows: VaultRow[], max = 2): string {
  const short = (r: VaultRow) => `${r.cred.label.split(/ certificate|\s*\(|:/)[0].trim()} ${r.validTo ? shortDate(r.validTo).replace(/^\w{3} /, '') : ''}`.trim();
  const shown = rows.slice(0, max).map(short);
  return rows.length > max ? `${shown.join(', ')} and ${rows.length - max} more` : listText(shown);
}
