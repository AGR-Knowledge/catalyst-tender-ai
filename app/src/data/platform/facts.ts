/**
 * Platform facts for the Catalyst Platform Console (plan 011, catalogue §C.8).
 * Synthetic demo figures, labelled as such on screen: none of this is live
 * telemetry and none of it is tenant content. Counts that tenant data already
 * holds (connectors, intake minutes, onboarding) are derived from it in
 * `domain/platform/console.ts`, so the console and the tenant never disagree.
 *
 * Model spend is a share of each tenant's monthly ceiling, never an amount.
 */

export type Tier = 'pooled' | 'silo';

export const TIER_LABEL: Record<Tier, string> = { pooled: 'Pooled', silo: 'Silo' };

/** Guardrail events the platform counts (catalogue GOV-4). */
export type GuardrailKind = 'restricted' | 'unscreened' | 'pii' | 'uncited';

export const GUARDRAIL_KINDS: GuardrailKind[] = ['restricted', 'unscreened', 'pii', 'uncited'];

export const GUARDRAIL_LABEL: Record<GuardrailKind, string> = {
  restricted: 'Restricted-lane routing',
  unscreened: 'RFQ to unscreened supplier blocked',
  pii: 'Personal data redacted',
  uncited: 'Uncited claim suppressed',
};

export interface TenantPlatformFacts {
  tier: Tier;
  /** The release the tenant runs (`RELEASES`). */
  version: string;
  /** Model spend so far this month, in percent of the tenant's monthly ceiling. */
  spendPct: number;
  /** Guardrail activations this month (1–8 Mar), by kind. */
  guardrails: Record<GuardrailKind, number>;
}

/** Per tenant key. The onboarding JV is provisioned but reads no tenders yet. */
export const PLATFORM_FACTS: Record<string, TenantPlatformFacts> = {
  najd: { tier: 'silo', version: '2026.02.3', spendPct: 71, guardrails: { restricted: 1, unscreened: 1, pii: 9, uncited: 2 } },
  corniche: { tier: 'pooled', version: '2026.02.3', spendPct: 48, guardrails: { restricted: 0, unscreened: 0, pii: 5, uncited: 1 } },
  dafna: { tier: 'pooled', version: '2026.02.3', spendPct: 39, guardrails: { restricted: 0, unscreened: 1, pii: 3, uncited: 0 } },
  batinah: { tier: 'pooled', version: '2026.03.0', spendPct: 84, guardrails: { restricted: 0, unscreened: 0, pii: 2, uncited: 1 } },
  qurain: { tier: 'silo', version: '2026.02.3', spendPct: 57, guardrails: { restricted: 0, unscreened: 0, pii: 6, uncited: 1 } },
  'gen-gulf': { tier: 'pooled', version: '2026.02.3', spendPct: 2, guardrails: { restricted: 0, unscreened: 0, pii: 0, uncited: 0 } },
};

/** Spend at or above this share of the ceiling is orange; at 100 the router drops to the economy tier (red). */
export const SPEND_WARN_PCT = 80;

/** One agent's golden-set evaluation for the release in production. */
export interface AgentEval { agent: string; stage: string; golden: number; passed: number }

/** The ten agents (product-foundation), scored on their golden sets for release 2026.02.3. */
export const AGENT_EVALS: AgentEval[] = [
  { agent: 'Intake & Extraction', stage: 'S1', golden: 240, passed: 234 },
  { agent: 'Outreach & Evaluation', stage: 'S2', golden: 180, passed: 172 },
  { agent: 'Win-Probability & Recommendation', stage: 'S3', golden: 120, passed: 113 },
  { agent: 'Scheduling', stage: 'S4', golden: 90, passed: 86 },
  { agent: 'Costing & Margin', stage: 'S5', golden: 150, passed: 145 },
  { agent: 'Drafting & Section Assembly', stage: 'S6', golden: 160, passed: 151 },
  { agent: 'Compliance Verification', stage: 'S7', golden: 200, passed: 195 },
  { agent: 'Document Assembly & e-Submission', stage: 'S8', golden: 80, passed: 80 },
  { agent: 'Delivery Oversight', stage: 'S9', golden: 70, passed: 65 },
  { agent: 'Learning Loop', stage: 'S9', golden: 60, passed: 57 },
];

/** Golden-set pass rate, in percent: at or above `target` is green, at or above `floor` (the release gate) orange, below it red. */
export const EVAL_BAND = { target: 95, floor: 90 };

export interface Release {
  version: string;
  channel: 'stable' | 'canary';
  /** ISO date the release reached this channel. */
  since: string;
  note: string;
}

export const RELEASES: Release[] = [
  { version: '2026.03.0', channel: 'canary', since: '2026-03-05', note: 'Arabic OCR for scanned pages; faster addendum matching' },
  { version: '2026.02.3', channel: 'stable', since: '2026-02-22', note: 'Quote levelling: VAT and delivery-term normalisation fixes' },
];

/** Break-glass limits (roles-and-access §4 P1). */
export const BREAKGLASS_MAX_HOURS = 4;
export const BREAKGLASS_MIN_REASON = 20;
