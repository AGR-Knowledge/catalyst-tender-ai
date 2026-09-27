import { useMemo } from 'react';
import { useDemo } from '@/state/store';
import { useWorld } from '@/domain/tenancy';
import { BRANDING_KEY, brandingOf, type Branding } from './branding';

/**
 * The active company's prospect branding, for the shell (plan 024 step 4.2).
 * GCC companies only. Parsed once per saved value, since the shell renders on
 * every demo action. Imports `branding.ts` alone, so the shell's bundle stays small.
 */
export function useBranding(): Branding | null {
  const { state } = useDemo();
  const gcc = useWorld() === 'gcc';
  const raw = gcc ? state.done[BRANDING_KEY] : undefined;
  return useMemo(() => (raw ? brandingOf({ [BRANDING_KEY]: raw }) : null), [raw]);
}
