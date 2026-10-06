import { LIFECYCLES, type GccTenantKey } from '@/data/gcc';

/**
 * Re-issued tenders (plan 042, user decision 2026-10-06): the client
 * re-published a tender this company saw before, as a re-tender, an extension
 * or a new lot. The register row is marked "Previous" and linked to the
 * earlier, closed record in the same company's lifecycles.
 *
 * The facts are the pairs, the reason and a short note. `previousRef` is the
 * earlier tender's authority reference, read from its lifecycle, never typed.
 * Its title, how it ended and when are derived in `domain/gcc/labels.ts`.
 *
 * Najd, Corniche and Dafna re-issue a live Stage 1 row. Batinah and Qurain
 * have no eligible Stage 1 row (their only ones are hero tenders and tenders
 * built on real client documents), so they re-issue a live row past Stage 1
 * (orchestrator review, 2026-10-06). Every earlier record is an authored
 * history lifecycle, never a generated one, so its id is stable.
 */

export type ReissueReason = 're-tender' | 'extension' | 'new-lot';

export interface Reissue {
  tenderId: string;
  previousId: string;
  previousRef: string;
  reason: ReissueReason;
  note: string;
}

type Authored = Omit<Reissue, 'previousRef'>;

const AUTHORED: Record<GccTenantKey, Authored[]> = {
  najd: [
    {
      tenderId: 'T-2026-122', previousId: 'T-2026-058', reason: 're-tender',
      note: 'Same employer and the same lift station works. The client postponed the earlier tender and has re-issued the works under a new reference.',
    },
    {
      tenderId: 'T-2026-124', previousId: 'T-2026-066', reason: 'new-lot',
      note: 'The employer cancelled the earlier network extension and has re-issued its pipe supply as a separate, supply-only lot.',
    },
  ],
  corniche: [
    {
      tenderId: 'T-2026-063', previousId: 'T-2025-157', reason: 're-tender',
      note: 'Same employer and the same hotel fit-out scope. The earlier award was not concluded, so the employer has tendered it again.',
    },
  ],
  dafna: [
    {
      tenderId: 'T-2026-034', previousId: 'T-2025-223', reason: 'new-lot',
      note: 'Same employer and the same industrial area drainage scheme. The pump station is now tendered as a lot of its own.',
    },
  ],
  batinah: [
    {
      tenderId: 'T-2026-027', previousId: 'T-2025-184', reason: 'new-lot',
      note: 'Same employer and the same capital area road scheme. After the service roads lot, the employer has issued the interchange as a lot of its own.',
    },
  ],
  qurain: [
    {
      tenderId: 'T-2026-062', previousId: 'T-2025-259', reason: 're-tender',
      note: 'Same employer and the same water transmission works in the north. The earlier award was not concluded, so the employer has tendered the mains again.',
    },
  ],
};

/** The earlier tender's authority reference, from its lifecycle. Empty when the record is missing (dev check 82 fails). */
const refOf = (tenant: GccTenantKey, id: string) => LIFECYCLES[tenant].find((l) => l.tenderId === id)?.source.ref ?? '';

export const REISSUED: Record<GccTenantKey, Reissue[]> = Object.fromEntries(
  (Object.keys(AUTHORED) as GccTenantKey[]).map((k) => [k, AUTHORED[k].map((r) => ({ ...r, previousRef: refOf(k, r.previousId) }))]),
) as Record<GccTenantKey, Reissue[]>;
