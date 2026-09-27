import { GRANTS, can, type Capability } from '@/data/access';
import { PERSON_GROUPS, SEAT_LABEL, peopleOf, roleLine, type Person, type PersonGroup } from '@/data/people';
import { TENANTS } from '@/data/tenants';

/**
 * Administration › Users & roles (plan 024 Phase 1, catalogue §D GOV-5): every
 * person in the tenant with their role, tender scope, committee seat and what
 * they can do, in words. The answers come from `data/access.ts` (`can()` and
 * its grants), so this page and every screen agree on who may do what.
 */

export interface AdminUser {
  id: string;
  name: string;
  initials: string;
  /** "Bid Manager", "Chief Financial Officer". */
  title: string;
  /** The line under the name, as the persona switcher shows it: "CFO · Bid Committee". */
  roleLine: string;
  group: PersonGroup;
  scope: { main: string; sub?: string };
  /** "CFO", for committee members. */
  seat?: string;
  /** What they can do, in one plain sentence. */
  canDo: string;
  /** What is masked for them, when anything is: "Margin masked". */
  masked?: string;
  /** Counts against the licensed seats (external people reply through the portal and don't). */
  usesSeat: boolean;
  /** HR owns credentials but is not a demo persona, so View as has nobody to show. */
  switcher: boolean;
}

export interface UserGroup { group: PersonGroup; users: AdminUser[] }

export interface UsersVM {
  groups: UserGroup[];
  total: number;
  /** GOV-5: people holding a licensed seat, the licence, and the split by group. */
  seats: { used: number; licensed: number; byGroup: { group: PersonGroup; n: number }[] };
}

/**
 * The headline abilities, most distinguishing first. An entry applies when the
 * person holds all its capabilities and none is already covered by an earlier
 * entry, so "approves DG2 and DG3" replaces the two single lines.
 */
const ABILITIES: { caps: Capability[]; text: string }[] = [
  { caps: ['dg2.decide', 'dg3.decide'], text: 'approves DG2 and DG3' },
  { caps: ['dg2.decide'], text: 'approves DG2' },
  { caps: ['dg3.decide'], text: 'approves DG3' },
  { caps: ['dg1.decide'], text: 'records DG1 on assigned tenders' },
  { caps: ['dg1.delegate'], text: 'records DG1 as a delegate' },
  { caps: ['dg2.position'], text: 'records a DG2 position' },
  { caps: ['dg3.issue'], text: 'issues the DG3 pack' },
  { caps: ['admin.users'], text: 'runs Administration' },
  { caps: ['view.as'], text: 'views as anyone' },
  { caps: ['pack.issue'], text: 'issues the Bid / No-Bid pack' },
  { caps: ['rfq.send'], text: 'sends RFQs' },
  { caps: ['quote.level'], text: 'levels quotes' },
  { caps: ['supplier.manage'], text: 'manages suppliers' },
  { caps: ['field.validate'], text: 'validates intake fields' },
  { caps: ['booklet.request'], text: 'requests booklet purchases' },
  { caps: ['input.request'], text: 'requests pack inputs' },
  { caps: ['facility.edit'], text: 'updates the bank facility' },
  { caps: ['credential.manage'], text: 'manages credentials' },
  { caps: ['credential.renew'], text: 'renews the credentials they own' },
  { caps: ['input.respond'], text: 'answers pack requests' },
  { caps: ['portal.rfq'], text: 'answers RFQs in the Supplier Portal' },
];

/** At most this many abilities in the line; the rest are in the role. */
const MAX_ABILITIES = 4;

/** Confidential values a role may not see (roles-and-access §9), in words. */
const MASKABLE: { caps: Capability[]; text: string }[] = [
  { caps: ['see.margin'], text: 'margin' },
  { caps: ['see.quotes', 'see.quotes.summary'], text: 'supplier quotes' },
  { caps: ['see.positions'], text: 'committee positions' },
];

function joinAnd(xs: string[]): string {
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Held at all, at list level (no tender in view): what the rail and the headline ask. */
const holds = (p: Person, cap: Capability) => can(p, cap).ok;

export function canDoOf(p: Person): string {
  const used = new Set<Capability>();
  const out: string[] = [];
  for (const a of ABILITIES) {
    if (out.length >= MAX_ABILITIES) break;
    if (a.caps.some((c) => used.has(c)) || !a.caps.every((c) => holds(p, c))) continue;
    a.caps.forEach((c) => used.add(c));
    out.push(a.text);
  }
  return out.length ? sentence(joinAnd(out)) : 'Reads what is shared with them';
}

export function maskedOf(p: Person): string | undefined {
  const hidden = MASKABLE.filter((m) => !m.caps.some((c) => holds(p, c))).map((m) => m.text);
  return hidden.length ? `${sentence(joinAnd(hidden))} masked` : undefined;
}

/** Which tenders the person opens: all of them, only those shared with them, or none. */
export function scopeOf(p: Person): AdminUser['scope'] {
  const grant = GRANTS[p.role]['tender.view'];
  if (grant === 'tenant') {
    // A restricted tender opens only to cleared people who also hold `see.restricted` (access.ts `can`).
    const restricted = holds(p, 'see.restricted') && !!p.cleared;
    return { main: 'All tenders', sub: restricted ? 'Restricted lane included' : 'Restricted lane excluded' };
  }
  if (grant === 'invited') return { main: 'Invited tenders only', sub: 'Opens a tender once its Bid Manager shares it' };
  if (holds(p, 'portal.rfq')) return { main: 'No tenders', sub: 'Only the RFQs sent to them, in the Supplier Portal' };
  if (holds(p, 'company.view')) return { main: 'No tenders', sub: 'Company: the credentials they own' };
  return { main: 'No tenders' };
}

export function adminUser(p: Person): AdminUser {
  return {
    id: p.id, name: p.name, initials: p.initials, title: p.title, roleLine: roleLine(p), group: p.group,
    scope: scopeOf(p), ...(p.seat ? { seat: SEAT_LABEL[p.seat] } : {}),
    canDo: canDoOf(p), ...(maskedOf(p) ? { masked: maskedOf(p) } : {}),
    usesSeat: p.group !== 'External', switcher: p.switcher,
  };
}

/** Everyone in the tenant, grouped in the persona switcher's order. The Catalyst operator is not a tenant user. */
export function usersOf(tenant: string): UsersVM {
  const people = peopleOf(tenant);
  const groups = PERSON_GROUPS
    .map((group) => ({ group, users: people.filter((p) => p.group === group).map(adminUser) }))
    .filter((g) => g.users.length > 0);
  const all = groups.flatMap((g) => g.users);
  const seated = groups.map((g) => ({ group: g.group, n: g.users.filter((u) => u.usesSeat).length })).filter((g) => g.n > 0);
  return {
    groups, total: all.length,
    seats: { used: all.filter((u) => u.usesSeat).length, licensed: TENANTS.find((t) => t.key === tenant)?.seats ?? 0, byGroup: seated },
  };
}
