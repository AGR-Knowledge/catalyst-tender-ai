import type { GccTenantKey } from '../index';
import { COMPETITORS, EVIDENCE } from './competitors';
import { WIN_MODELS } from './win';
import { INPUT_KEYS, INPUT_SPECS, SEEDED_INPUTS } from './inputs';
import { PACK_VERSIONS, RERUN_EFFECTS } from './packs';
import { SEEDED_POSITIONS } from './positions';
import { DECLINE_LETTER } from './letters';
import { CLIENT_BIDS } from './clients';

export * from './types';
export { COMPETITORS, EVIDENCE, WIN_MODELS, INPUT_KEYS, INPUT_SPECS, SEEDED_INPUTS, PACK_VERSIONS, RERUN_EFFECTS, SEEDED_POSITIONS, DECLINE_LETTER, CLIENT_BIDS };

/** Stage 3 facts for one tenant. Competitors and evidence are market-wide, so every tenant sees the same records. */
export function s3Data(tenant: GccTenantKey | string) {
  const mine = <T extends { tenant: string }>(xs: T[]) => xs.filter((x) => x.tenant === tenant);
  return {
    competitors: COMPETITORS,
    evidence: EVIDENCE,
    win: mine(WIN_MODELS),
    clientBids: mine(CLIENT_BIDS),
    inputs: mine(SEEDED_INPUTS),
    packs: mine(PACK_VERSIONS),
    rerun: mine(RERUN_EFFECTS),
    positions: mine(SEEDED_POSITIONS),
  };
}
