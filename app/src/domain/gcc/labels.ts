import type { Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Lifecycle } from '@/data/gcc/lifecycle';
import { GCC_DOC_FILES } from '@/data/extracted/gcc';
import { REISSUED, type Reissue, type ReissueReason } from '@/data/gcc/reissued';
import { ENDINGS, LOSS_LABEL } from '@/data/gcc/debriefs/vocab';
import { endingAt } from '@/domain/gcc/debriefs/endings';
import { dayText } from '@/domain/gcc/debriefs/text';
import { lifecycle, visible, type DemoDone } from './lifecycle';

/**
 * The two tender labels (plan 042), derived, so a tender carries the same
 * labels on every screen:
 * - **OG**: the tender is built on a real document the client supplied, i.e.
 *   its register row's `docKey` maps to a file under `/bids/me/`
 *   (`GCC_DOC_FILES`). No id is listed, so a new real document is picked up.
 * - **Previous**: the tender is a re-issue of an earlier, closed tender
 *   (`data/gcc/reissued.ts`). The link names the earlier tender, how it ended
 *   and when, all read from its lifecycle.
 */

/** Where the real client-supplied documents are served from. */
export const OG_DIR = '/bids/me/';

export function isOg(tenant: string, tenderId: string): boolean {
  if (!isGccTenantKey(tenant)) return false;
  const key = gccData(tenant).register.find((t) => t.id === tenderId)?.docKey;
  return !!key && (GCC_DOC_FILES[key] ?? '').startsWith(OG_DIR);
}

export const REASON_LABEL: Record<ReissueReason, string> = { 're-tender': 'Re-tender', extension: 'Extension', 'new-lot': 'New lot' };

/** The re-issue row of a tender, as authored. */
export const reissueOf = (tenant: string, tenderId: string): Reissue | null =>
  (isGccTenantKey(tenant) ? REISSUED[tenant].find((r) => r.tenderId === tenderId) : undefined) ?? null;

/** How a closed tender ended, in a sentence's words: "cancelled by the employer", "lost on price". */
export function endedHowOf(l: Lifecycle): string {
  const e = endingAt(l);
  if (e?.ending === 'lost') return l.result?.lossReason ? `lost on ${LOSS_LABEL[l.result.lossReason].toLowerCase()}` : 'lost';
  if (e) {
    const label = ENDINGS.find((x) => x.id === e.ending)?.label ?? e.ending;
    // "No-Bid" is the gate's term and keeps its capitals; the other endings read in lower case mid-sentence.
    return e.ending === 'no-bid' ? label : label[0].toLowerCase() + label.slice(1);
  }
  if (l.closedAs === 'discarded') return 'discarded at DG1';
  return l.closedAs ?? 'closed';
}

/** When it ended: the ending's time, else the close. */
const endedAtOf = (l: Lifecycle): string => endingAt(l)?.at ?? l.closedAt ?? '';

export interface PreviousVM {
  tenderId: string;
  previousId: string;
  /** The earlier tender's authority reference. Null when the viewer may not open the earlier tender. */
  previousRef: string | null;
  reason: ReissueReason;
  reasonText: string;
  note: string;
  /** The earlier tender's title. Null when the viewer may not open it. */
  title: string | null;
  /** "cancelled by the employer", "lost on price". Null when the viewer may not open it. */
  endedHow: string | null;
  /** ISO time it ended. Null when the viewer may not open it. */
  endedAt: string | null;
  /** "Wed 25 Feb", or with the year outside the demo year. Null when the viewer may not open it. */
  endedText: string | null;
  /** The viewer may open the earlier tender's workspace (always true without a viewer). */
  canOpen: boolean;
  /** "Re-issued: re-tender; earlier tender T-2026-058, cancelled by the employer Wed 25 Feb". */
  tip: string;
}

/**
 * The link to the earlier tender, or null. With a `viewer`, what they may not
 * open stays hidden: the earlier tender shows as its TID alone, with no title,
 * reference, ending or link, so a restricted record never leaks.
 */
export function previousOf(tenant: string, tenderId: string, viewer?: Person, done?: DemoDone): PreviousVM | null {
  const r = reissueOf(tenant, tenderId);
  if (!r) return null;
  const l = lifecycle(tenant, r.previousId, done);
  if (!l || !l.closedAt) return null;
  const canOpen = !viewer || visible(tenant, l, viewer);
  const reasonText = REASON_LABEL[r.reason];
  const base = { tenderId, previousId: r.previousId, reason: r.reason, reasonText, note: r.note, canOpen };
  if (!canOpen) {
    return { ...base, previousRef: null, title: null, endedHow: null, endedAt: null, endedText: null, tip: `Re-issued: ${reasonText.toLowerCase()}; earlier tender ${r.previousId}` };
  }
  const endedHow = endedHowOf(l);
  const endedAt = endedAtOf(l);
  const endedText = endedAt ? dayText(endedAt) : null;
  return {
    ...base, previousRef: r.previousRef, title: l.title, endedHow, endedAt, endedText,
    tip: `Re-issued: ${reasonText.toLowerCase()}; earlier tender ${r.previousId}, ${endedHow}${endedText ? ` ${endedText}` : ''}`,
  };
}

export interface TenderLabelsVM { og: boolean; previous: PreviousVM | null }

/** Both labels of a tender, for one viewer. */
export const labelsOf = (tenant: string, tenderId: string, viewer?: Person, done?: DemoDone): TenderLabelsVM => ({
  og: isOg(tenant, tenderId),
  previous: previousOf(tenant, tenderId, viewer, done),
});
