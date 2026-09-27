import { S2_TENDERS } from '@/data/gcc/s2';
import { isGccTenantKey, type GccTenantKey } from '@/data/gcc';

/**
 * Which demo audit entries belong to a tender (plan 016a 2.3). Entries name
 * their target in several ways, and the workspace's Decisions & audit tab and
 * the Stage 2 desk both read them through this one matcher:
 * - the tender itself: `T-2026-104`;
 * - a package or a query: `T-2026-104 P-04`, `T-2026-122 · Bond validity`;
 * - an input: `T-2026-097:planning`;
 * - an RFQ, `{TID}-{pkg}-{supplier}`, and its quote, `Q-{rfq}`;
 * - a clarification, `CL-104-01`, looked up in the Stage 2 seed.
 * The tender id is always followed by a separator, so T-2026-01 never matches T-2026-011.
 */

/** Clarification ids of each tender, per tenant. */
const CLARS = new Map<string, Set<string>>();
const clarKey = (tenant: string, tenderId: string) => `${tenant}|${tenderId}`;
for (const tenant of Object.keys(S2_TENDERS) as GccTenantKey[]) {
  for (const t of S2_TENDERS[tenant]) {
    for (const c of t.clarifications) {
      const k = clarKey(tenant, c.tenderId);
      CLARS.set(k, (CLARS.get(k) ?? new Set()).add(c.id));
    }
  }
}

const clarsOf = (tenderId: string, tenant?: string): Set<string> => {
  if (tenant) return isGccTenantKey(tenant) ? CLARS.get(clarKey(tenant, tenderId)) ?? new Set() : new Set();
  // No tenant: the audit list passed is already the tenant's own, so any tenant's clarifications of this tender will do.
  const all = new Set<string>();
  for (const [k, ids] of CLARS) if (k.endsWith(`|${tenderId}`)) ids.forEach((id) => all.add(id));
  return all;
};

/** A predicate: does this audit target belong to the tender? */
export function tenderTargetMatcher(tenderId: string, tenant?: string): (target: string | undefined) => boolean {
  const clars = clarsOf(tenderId, tenant);
  const prefixes = [`${tenderId} `, `${tenderId}:`, `${tenderId}-`, `Q-${tenderId}-`];
  return (target) => !!target && (target === tenderId || prefixes.some((p) => target.startsWith(p)) || clars.has(target));
}

/** The entries of a list that belong to the tender, in their order. */
export const auditOfTender = <E extends { target?: string }>(audit: E[], tenderId: string, tenant?: string): E[] => {
  const match = tenderTargetMatcher(tenderId, tenant);
  return audit.filter((e) => match(e.target));
};
