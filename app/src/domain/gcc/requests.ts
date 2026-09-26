import { firstWithRole, type Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { TENANTS } from '@/data/tenants';
import { addDays, isWorkingDay } from '@/domain/calendar';
import { DEMO_NOW } from './clock';
import { queriesFor, type DemoDone } from './lifecycle.port';
import { requestsTo } from './requestKeys';
import { eligibilityRisks, DONE_KEY, isFlagged, readDone, type RenewedValue } from './s1';
import type { RequestRowVM } from './viewmodels';

/**
 * My requests (plan 013 Phase 5, dashboards.md §10.13): everything the bid
 * teams are waiting for from one person, derived, never stored. Three sources:
 * - the contributor inputs of the Stage 3 packs (017's `s3.inputs.items`);
 * - credential renewals the Head of Tendering asked for on their dashboard
 *   (`renewal-requested:{credId}`, 015's in-place action);
 * - requests made during the demo with plan 019's `RequestButton`
 *   (`request:…` keys, read only through `requestsTo`).
 */

export type RequestStatus = 'open' | 'late' | 'submitted' | 'accepted';

export interface Request extends RequestRowVM {
  tenderId: string;
  /** The tender's short title, for the table and the action row. Empty for a company-wide request. */
  shortTitle: string;
  what: string;
  /** Where the answer goes: "9.5 Bonds and facility", "Company credentials". */
  section: string;
  requestedById: string;
  requestedAt: string;
  due: string;
  status: RequestStatus;
  submittedAt?: string;
  /** When the pack that used the input was issued. */
  acceptedAt?: string;
  kind: 'pack-input' | 'renewal' | 'request';
}

/** How many working days before the affected bid's opening a renewal is due. */
const RENEWAL_LEAD_WD = 10;

/** `n` working days before `date`, on the tenant's calendar. */
function workingDaysBefore(date: string, n: number, tenant: string): string {
  const cc = TENANTS.find((t) => t.key === tenant)?.countryCode ?? 'SA';
  let d = date.slice(0, 10);
  for (let left = n; left > 0;) {
    d = addDays(d, -1);
    if (isWorkingDay(d, cc)) left--;
  }
  return d;
}

const openOrLate = (due: string, now: string): RequestStatus => (due < now ? 'late' : 'open');

/** Every request to `personId`, most urgent first: late, then open by due date, then delivered. */
export function requestsFor(tenant: string, personId: string, done: DemoDone, viewer: Person, now = DEMO_NOW): Request[] {
  if (!isGccTenantKey(tenant)) return [];
  const q = queriesFor({ tenant, viewer, done });
  const titleOf = (id: string) => q.one(id)?.shortTitle ?? '';
  const out: Request[] = [];

  // 1. Pack inputs asked of this person.
  for (const l of q.live()) {
    const f = l.facts;
    if (f?.stage !== 3) continue;
    for (const i of f.inputs.items.filter((x) => x.ownerId === personId)) {
      const accepted = !!i.submittedAt && f.pack === 'issued' && !!f.issuedAt && f.issuedAt > i.submittedAt;
      out.push({
        id: `input:${i.id}`, kind: 'pack-input', tenderId: l.tenderId, shortTitle: l.shortTitle,
        what: i.what, section: `Bid pack · ${i.section}`, requestedById: i.requestedById, requestedAt: i.requestedAt, due: i.due,
        status: accepted ? 'accepted' : i.submittedAt ? 'submitted' : openOrLate(i.due, now),
        ...(i.submittedAt ? { submittedAt: i.submittedAt } : {}), ...(accepted ? { acceptedAt: f.issuedAt } : {}),
      });
    }
  }

  // 2. Renewals of credentials this person owns, once the Head of Tendering has asked.
  const hot = firstWithRole(tenant, 'hot');
  const risks = eligibilityRisks(tenant, done as Record<string, string>);
  for (const c of gccData(tenant).credentials.filter((x) => x.ownerId === personId && isFlagged(done as Record<string, string>, DONE_KEY.renewalRequested(x.id)))) {
    // The bid it puts at risk: the earliest opening among live tenders whose eligibility needs it renewed.
    const hit = risks
      .flatMap((r) => r.lines.filter((ln) => ln.renew?.some((x) => x.credentialId === c.id)).map((ln) => ({ tenderId: r.tenderId, date: ln.checkedAgainst.date })))
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const due = `${workingDaysBefore(hit?.date ?? c.validTo ?? now, RENEWAL_LEAD_WD, tenant)}T17:00`;
    const renewed = readDone<RenewedValue>(done as Record<string, string>, DONE_KEY.renewed(c.id));
    const asked = readDone<{ at?: string; byId?: string }>(done as Record<string, string>, DONE_KEY.renewalRequested(c.id));
    out.push({
      id: `renewal:${c.id}`, kind: 'renewal', tenderId: hit?.tenderId ?? '', shortTitle: hit ? titleOf(hit.tenderId) : '',
      // Labels lead with a proper noun ("Zakat certificate (ZATCA)"), so they keep their case.
      what: `Renew the ${c.label}`, section: 'Company credentials',
      requestedById: asked?.byId ?? hot?.id ?? `${tenant}.hot`, requestedAt: asked?.at ?? now, due,
      status: renewed ? 'submitted' : openOrLate(due, now), ...(renewed ? { submittedAt: renewed.at } : {}),
    });
  }

  // 3. Requests made in the demo with the Request button (plan 019).
  for (const r of requestsTo(done as Record<string, string>, personId)) {
    out.push({
      id: r.key, kind: 'request', tenderId: r.tenderId, shortTitle: titleOf(r.tenderId),
      what: r.what, section: r.section ?? '', requestedById: r.byId, requestedAt: r.at, due: r.due, status: openOrLate(r.due, now),
    });
  }

  const rank: Record<RequestStatus, number> = { late: 0, open: 1, submitted: 2, accepted: 3 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}

export const isOutstanding = (r: Request) => r.status === 'open' || r.status === 'late';
