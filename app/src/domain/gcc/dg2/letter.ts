import { gccData, isGccTenantKey } from '@/data/gcc';
import { personById } from '@/data/people';
import { TENANTS } from '@/data/tenants';
import { DECLINE_LETTER } from '@/data/gcc/s3';
import { lifecycle } from '@/domain/gcc/lifecycle';
import { DEMO_TODAY } from '@/domain/calendar';
import { nowIso, type WriteResult } from '@/domain/gcc/s3/done';
import { letterKey, type LetterValue } from './keys';

/**
 * The No-Bid decline letter to the employer (spec §10): the template filled
 * for one tender, as a draft the Bid Manager reviews and marks sent. Nothing
 * leaves the app.
 */

export const LETTER_DRAFT_LABEL = 'Draft: the Bid Manager reviews and sends';

const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "8 March 2026", the letter date. */
const letterDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${LONG_MONTHS[m - 1]} ${y}`;
};

export interface LetterVM { subject: string; text: string; label: string; signatoryId: string }

/** The employer's reference, as the lifecycle records it (plan 017), so the letter and the tender header agree. */
const referenceOf = (tenant: string, tenderId: string) => lifecycle(tenant, tenderId)?.source.ref ?? tenderId;

export function declineLetter(tenant: string, tenderId: string, byId: string): LetterVM | null {
  if (!isGccTenantKey(tenant)) return null;
  const t = gccData(tenant).register.find((x) => x.id === tenderId);
  if (!t) return null;
  const signatory = personById(t.bidManagerId) ?? personById(byId);
  // The tenant's display name ("Najd Arcline Contracting Co."), not its legal description.
  const company = TENANTS.find((x) => x.key === tenant)?.name ?? tenant;
  const values: Record<string, string> = {
    issuer: t.issuer, reference: referenceOf(tenant, tenderId), title: t.title,
    date: letterDate(DEMO_TODAY), signatory: signatory?.name ?? '', company,
  };
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
  return { subject: fill(DECLINE_LETTER.subject), text: fill(DECLINE_LETTER.body), label: LETTER_DRAFT_LABEL, signatoryId: signatory?.id ?? byId };
}

/** Save the draft, or mark it sent (in the demo only), for the No-Bid of decision round `round`. */
export function letterWrite(tenderId: string, round: number, text: string, sent: boolean, byId: string): WriteResult {
  const value: LetterValue = { text, sent, round, at: nowIso(), byId };
  return {
    key: letterKey(tenderId, round),
    value: JSON.stringify(value),
    audit: { actorId: byId, action: sent ? 'Decline letter marked sent' : 'Decline letter drafted', target: tenderId, detail: sent ? 'Marked sent in the demo; nothing leaves the app' : LETTER_DRAFT_LABEL },
  };
}
