import { can, type CanResult } from '@/data/access';
import type { Person } from '@/data/people';
import type { Credential } from '@/data/gcc/types';
import { DEMO_TODAY, addDays, dateText } from '@/domain/calendar';
import { eligibilityFor, eligibilityRisks, type RenewedValue } from '../s1/eligibility';
import { DONE_KEY, json, readDone, type AuditDraft, type Done, type DoneWrite } from '../s1/done';
import { dataOf, dayMonthYear, listText } from '../s1/common';
import { effectiveValidTo } from './vault';

/**
 * Uploading a renewed credential (plan 010, catalogue §C "Credential owner"):
 * the one write on the Company page. It records `renewed:{credId}` with the
 * new expiry, who and when; every reader of that key (eligibility, SCR-6, My
 * requests, the pack's freshness) re-checks from it. Reset demo clears it with
 * the rest of the tenant's `done`.
 */

/** "Zakat certificate" from "Zakat certificate (ZATCA)"; "Commercial Registration" from "Commercial Registration: …". */
export const credentialName = (c: Credential) => c.label.replace(/\s*\(.*\)$/, '').split(':')[0].trim();

/**
 * Who may upload a renewal: the Head of Tendering (`credential.manage`), or the
 * credential's owner (`credential.renew`, own). The refusal is access.ts's:
 * the owner sentence for a role that renews its own credentials, else the
 * manage sentence. View as is read only.
 */
export function renewRight(c: Credential, by: Person, viewAs = false): CanResult {
  const manage = can(by, 'credential.manage', { viewAs });
  if (manage.ok) return manage;
  const own = can(by, 'credential.renew', { ownerId: c.ownerId, viewAs });
  if (own.ok) return own;
  return can(by, 'credential.renew', { viewAs }).ok ? own : manage;
}

/** One year after `iso`, through the calendar: 29 Feb becomes 28 Feb. */
export function oneYearAfter(iso: string): string {
  const [y, m, d] = iso.split('-');
  const next = String(Number(y) + 1);
  return m === '02' && d === '29' ? addDays(`${next}-03-01`, -1) : `${next}-${m}-${d}`;
}

/** The new expiry the form offers: a year after the current one, or a year from today when that has passed. */
export function defaultRenewalDate(c: Credential, done: Done): string {
  const current = effectiveValidTo(c, done);
  const base = current && current >= DEMO_TODAY ? current : DEMO_TODAY;
  return oneYearAfter(base);
}

export type RenewalResult =
  | { ok: true; write: DoneWrite; audit: AuditDraft; value: RenewedValue }
  | { ok: false; reason: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The done write and audit draft for a renewal to `validTo`, or why not.
 * Refuses a person without the right, a credential with no expiry, and a date
 * that isn't later than the current expiry. `tenderId` (the first live bid it
 * affects) becomes the audit entry's target, so the tender's trail shows it.
 */
export function renewalWrite(tenant: string, credId: string, validTo: string, by: Person, done: Done, opts: { at: string; viewAs?: boolean; tenderId?: string }): RenewalResult {
  const c = dataOf(tenant).credentials.find((x) => x.id === credId);
  if (!c) return { ok: false, reason: `No credential "${credId}" in this company's vault` };
  const right = renewRight(c, by, opts.viewAs);
  if (!right.ok) return { ok: false, reason: right.reason ?? 'Outside your role' };
  const current = effectiveValidTo(c, done);
  if (current === null) return { ok: false, reason: `${c.label} has no expiry date, so there is nothing to renew` };
  if (!ISO.test(validTo)) return { ok: false, reason: 'Enter the date the renewed certificate is valid to' };
  if (validTo <= current) return { ok: false, reason: `The new date must be later than the current one, ${dateText(current)}` };
  const value: RenewedValue = { validTo, at: opts.at, byId: by.id };
  return {
    ok: true, value,
    write: { key: DONE_KEY.renewed(c.id), value: json(value) },
    audit: { action: 'Credential renewed', detail: `${c.label}, valid to ${dayMonthYear(validTo)}`, ...(opts.tenderId ? { target: opts.tenderId } : {}) },
  };
}

/**
 * The toast after a renewal, from re-running the eligibility lines that
 * needed it: "Zakat certificate renewed to 30 Apr 2027. T-2026-118's
 * eligibility re-checked: the line now passes."
 */
export function renewalToast(tenant: string, credId: string, before: Done, after: Done): string {
  const c = dataOf(tenant).credentials.find((x) => x.id === credId);
  const r = readDone<RenewedValue>(after, DONE_KEY.renewed(credId));
  if (!c || !r) return 'Renewal recorded.';
  const head = `${credentialName(c)} renewed to ${dayMonthYear(r.validTo)}.`;
  const hits = eligibilityRisks(tenant, before).flatMap((risk) => risk.lines
    .filter((l) => l.renew?.some((x) => x.credentialId === credId))
    .map((l) => ({ tenderId: risk.tenderId, reqId: l.reqId })));
  if (!hits.length) return `${head} No live bid was waiting on it.`;
  const states = hits.map((h) => ({ ...h, state: eligibilityFor(tenant, h.tenderId, after)?.lines.find((l) => l.reqId === h.reqId)?.state }));
  const ids = [...new Set(states.map((s) => s.tenderId))];
  const who = ids.length === 1 ? `${ids[0]}'s eligibility re-checked` : `Eligibility re-checked on ${listText(ids)}`;
  const short = states.filter((s) => s.state !== 'pass');
  if (!short.length) return `${head} ${who}: ${states.length === 1 ? 'the line now passes' : states.length === 2 ? 'both lines now pass' : 'the lines now pass'}.`;
  const still = [...new Set(short.map((s) => s.tenderId))];
  return `${head} ${who}: still short of the date on ${listText(still)}.`;
}
