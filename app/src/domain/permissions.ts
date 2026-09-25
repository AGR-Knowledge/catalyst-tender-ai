import { useCallback } from 'react';
import { can, type CanCtx, type CanResult, type Capability } from '@/data/access';
import { useDemo } from '@/state/store';

/**
 * Permission hooks for GCC screens. Pages ask these, never the role: the
 * answer comes from `can()` in `data/access.ts`, bound to the current person.
 * During View as, the person is the one being viewed and every write is denied.
 */

/** `(cap, ctx?) => { ok, reason }` for the current person. */
export function useCan(): (cap: Capability, ctx?: Omit<CanCtx, 'viewAs'>) => CanResult {
  const { state } = useDemo();
  const { person, viewAs } = state;
  return useCallback((cap, ctx = {}) => can(person, cap, { ...ctx, viewAs: !!viewAs }), [person, viewAs]);
}

export type MaskField = 'margin' | 'quotes' | 'positions' | 'pii';

const MASK_CAP: Record<MaskField, Capability> = {
  margin: 'see.margin', quotes: 'see.quotes', positions: 'see.positions', pii: 'see.pii',
};

/** `(field, ctx?) => boolean`: true when the value is visible, false when it shows as masked for this role. */
export function useMask(): (field: MaskField, ctx?: Omit<CanCtx, 'viewAs'>) => boolean {
  const check = useCan();
  return useCallback((field, ctx) => check(MASK_CAP[field], ctx).ok, [check]);
}
