import { PLATFORM_OPERATOR } from '@/data/people';

/**
 * Catalyst's own people in the Platform Console (plan 011). Fictional. The
 * requester is the demo persona `PLATFORM_OPERATOR`; break-glass needs a
 * second approver (roles-and-access §4 P1), who is never the requester.
 * Operators are not tenant users, so they are not in `data/people.ts`'s
 * tenant rosters and never appear in a tenant's persona menu.
 */

export interface Operator {
  id: string;
  name: string;
  initials: string;
  title: string;
}

export const OPERATORS: Operator[] = [
  { id: PLATFORM_OPERATOR.id, name: PLATFORM_OPERATOR.name, initials: PLATFORM_OPERATOR.initials, title: PLATFORM_OPERATOR.title },
  { id: 'platform.security', name: 'Leena Farrow', initials: 'LF', title: 'Platform Security Lead, Catalyst' },
];

export const operatorById = (id: string | null | undefined): Operator | undefined => OPERATORS.find((o) => o.id === id);

/** The colleagues who may approve a request made by `requesterId`: anyone but the requester. */
export const approversFor = (requesterId: string): Operator[] => OPERATORS.filter((o) => o.id !== requesterId);
