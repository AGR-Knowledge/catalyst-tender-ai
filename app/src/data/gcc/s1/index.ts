import type { GccTenantKey } from '../index';
import { QUERY_DRAFTS } from './queries';
import { ADDENDA } from './addenda';
import { KEY_PERSONNEL } from './personnel';
import { EFFORT } from './effort';
import { PREP_TYPICAL } from './prep';
import { PROJECT_LENGTHS, REQUIREMENT_SCOPES } from './measures';
import { BOND_TERMS } from './bonds';

export type * from './types';
export { QUERY_DRAFTS, ADDENDA, KEY_PERSONNEL, EFFORT, PREP_TYPICAL, PROJECT_LENGTHS, REQUIREMENT_SCOPES, BOND_TERMS };

const forTenant = (tenants: GccTenantKey[] | '*', key: string) => tenants === '*' || (tenants as string[]).includes(key);

/** Stage 1 facts for one tenant (plan 007a step 1.3). Records for every tenant (`'*'`) are included. */
export function s1Data(tenant: string) {
  return {
    queries: QUERY_DRAFTS.filter((q) => forTenant(q.tenants, tenant)),
    addenda: ADDENDA.filter((a) => a.tenant === tenant),
    personnel: KEY_PERSONNEL.filter((p) => p.tenant === tenant),
    effort: EFFORT.filter((e) => e.tenant === tenant),
    prep: PREP_TYPICAL.filter((p) => p.tenant === tenant),
    lengths: PROJECT_LENGTHS.filter((l) => l.tenant === tenant),
    scopes: REQUIREMENT_SCOPES.filter((s) => s.tenant === tenant),
    bonds: BOND_TERMS.filter((b) => forTenant(b.tenants, tenant)),
  };
}

export type S1Data = ReturnType<typeof s1Data>;
