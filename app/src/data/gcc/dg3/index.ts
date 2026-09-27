import { DG3_EVIDENCE } from './evidence';

export * from './types';
export { DG3_EVIDENCE };

/** The DG3 pack evidence for one tender, or null when it has none. */
export const dg3EvidenceRecord = (tenant: string, tenderId: string) =>
  DG3_EVIDENCE.find((e) => e.tenant === tenant && e.tenderId === tenderId) ?? null;
