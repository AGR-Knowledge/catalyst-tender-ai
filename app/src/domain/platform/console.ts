import type { Tone } from '@/data/types';
import type { Tenant } from '@/data/tenants';
import { gccData, isGccTenantKey } from '@/data/gcc';
import type { Source } from '@/data/gcc/types';
import {
  AGENT_EVALS, EVAL_BAND, GUARDRAIL_KINDS, GUARDRAIL_LABEL, PLATFORM_FACTS, RELEASES, SPEND_WARN_PCT, TIER_LABEL, type GuardrailKind,
} from '@/data/platform/facts';
import { DEMO_TIME, DEMO_TODAY, dateText } from '@/domain/calendar';
import { liveTenants, type LiveTenant } from '@/domain/tenants';
import { capturesIn } from '@/domain/gcc/lifecycle';
import { windowOf } from '@/domain/gcc/period';
import { STAGE_BANDS, nearestRank } from '@/domain/gcc/kpi/stages';
import { INTAKE_TARGET_MIN } from '@/domain/gcc/s1/intake';
import type { InfoVM, TileVM } from '@/domain/gcc/viewmodels';
import { PLATFORM_BUCKET } from '@/state/store';
import { actorName, approverLine, breakGlassOf, stampText, type BreakGlass } from './breakglass';

/**
 * The Platform Console's view models (plan 011, catalogue §C.8, spec §13):
 * PLT-1…6 and the panels. Counts and health only. Tenant data is read for
 * counts that never name a tender (connectors, intake minutes, reconciliation,
 * onboarding steps) and nothing else leaves this module: no tender ID, title,
 * value, supplier, person's bid data or document. Platform figures (tier,
 * release, spend, evals, guardrails) are demo facts from `data/platform`.
 * The dev check (65-platform) scans every string these return.
 */

export interface HealthVM { key: 'connectors' | 'intake' | 'reconciliation' | 'spend'; label: string; value: string; tone: Tone; detail: string }

export interface TenantBreakGlassVM { n: number; status: 'requested' | 'revoked'; text: string; tone: Tone }

export interface TenantRowVM {
  key: string;
  name: string;
  /** "Najd": the name's first word, for short sub-lines. */
  short: string;
  monogram: string;
  accent: string;
  live: boolean;
  /** "Live since September 2025", "Onboarding, 3 of 7 steps". */
  status: string;
  region: string;
  residency: string;
  tier: string;
  version: string;
  canary: boolean;
  seats: number;
  /** The tenant's administrator, who is notified of a break-glass request: "Faisal Al-Harbi, Head of Tendering". */
  admin: string;
  /** Empty while onboarding: nothing is read yet. */
  health: HealthVM[];
  /** The locked "Tender data" cell. `canRequest` is false while onboarding, with `why`. */
  lock: { canRequest: boolean; why?: string };
  /** The newest request for this tenant, if any. */
  breakGlass: TenantBreakGlassVM | null;
}

export interface ReleaseVM { version: string; channel: string; since: string; note: string; tenants: string[] }

export interface GuardrailsVM {
  kinds: { key: GuardrailKind; label: string }[];
  rows: { key: string; name: string; short: string; counts: Record<GuardrailKind, number>; total: number }[];
  totals: Record<GuardrailKind, number>;
}

export interface BreakGlassLogVM {
  id: string;
  tenant: string;
  at: string;
  when: string;
  reason: string;
  scope: string;
  requestedBy: string;
  approver: string;
  status: string;
  tone: Tone;
}

export interface ConsoleVM {
  asOf: string;
  tiles: TileVM[];
  tenants: TenantRowVM[];
  releases: ReleaseVM[];
  guardrails: GuardrailsVM;
  log: BreakGlassLogVM[];
}

export interface ConsoleInput {
  /** The store's `doneBy`: every tenant's demo state, and the platform bucket (onboarding ticks). */
  doneBy: Record<string, Record<string, string>>;
  /** Tenants added during the demo (store `tenants`). */
  added: Tenant[];
}

const DEMO_FIGURE = 'Demo figure, not live telemetry.';
const MONTH_TEXT = `This month to ${dateText(DEMO_TODAY)}`;
const pct1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '')}%`;
const shortOf = (name: string) => name.split(' ')[0];

/* ------------------------------------------------------------ per tenant */

function connectorHealth(sources: Source[]): HealthVM {
  const healthy = sources.filter((s) => s.state === 'healthy').length;
  const down = sources.filter((s) => s.state === 'down').length;
  const expiring = sources.filter((s) => s.state === 'credentials-expiring').length;
  const degraded = sources.filter((s) => s.state === 'degraded').length;
  const issues = [down && `${down} down`, degraded && `${degraded} degraded`, expiring && `${expiring} with credentials expiring`].filter(Boolean).join(', ');
  // The same rule as the tenant's INT-4: any down red, any degraded or expiring orange.
  const tone: Tone = down ? 'red' : healthy < sources.length ? 'orange' : 'green';
  return { key: 'connectors', label: 'Connectors', value: `${healthy}/${sources.length}`, tone, detail: issues ? `${healthy} of ${sources.length} healthy: ${issues}` : `All ${sources.length} healthy` };
}

/** The tenant's intake-to-logged p90 over 30 days: the same minutes and rule as its INT-2 tile. */
function intakeP90(key: string): number | null {
  return nearestRank(capturesIn(key, windowOf('30d', key)).minutes, 90);
}

const intakeTone = (p90: number): Tone => (p90 <= INTAKE_TARGET_MIN ? 'green' : p90 <= STAGE_BANDS.intakeOrangeMin ? 'orange' : 'red');
const spendTone = (pct: number): Tone => (pct >= 100 ? 'red' : pct >= SPEND_WARN_PCT ? 'orange' : 'green');

function healthOf(t: LiveTenant): HealthVM[] {
  if (!t.live || !isGccTenantKey(t.key)) return [];
  const seed = gccData(t.key);
  const out: HealthVM[] = [connectorHealth(seed.sources)];
  const p90 = intakeP90(t.key);
  if (p90 !== null) out.push({ key: 'intake', label: 'Intake p90', value: `${p90} min`, tone: intakeTone(p90), detail: `Notice to logged, 90th percentile over 30 days; target ${INTAKE_TARGET_MIN} min` });
  const { missed } = seed.reconciliation;
  out.push({ key: 'reconciliation', label: 'Reconciliation', value: `${missed} missed`, tone: missed ? 'red' : 'green', detail: `This morning’s check of ${seed.reconciliation.sources} sources against the portals` });
  const spend = PLATFORM_FACTS[t.key]?.spendPct;
  if (spend !== undefined) out.push({ key: 'spend', label: 'Model spend', value: `${spend}%`, tone: spendTone(spend), detail: `Of the monthly ceiling. ${DEMO_FIGURE}` });
  return out;
}

function breakGlassVM(r: BreakGlass | undefined): TenantBreakGlassVM | null {
  if (!r) return null;
  if (r.status === 'revoked' && r.revoked) {
    return { n: r.n, status: 'revoked', text: `Revoked by ${actorName(r.revoked.byId)}, ${stampText(r.revoked.at)}`, tone: 'grey' };
  }
  return { n: r.n, status: 'requested', text: `Requested ${stampText(r.at)} · awaiting the tenant’s view`, tone: 'orange' };
}

function rowOf(t: LiveTenant, doneBy: ConsoleInput['doneBy']): TenantRowVM {
  const f = PLATFORM_FACTS[t.key];
  const current = RELEASES.find((r) => r.version === f?.version);
  const readable = t.live && isGccTenantKey(t.key);
  return {
    key: t.key, name: t.name, short: shortOf(t.name), monogram: t.monogram, accent: t.accent,
    live: t.live, status: t.status, region: `${t.hqCity}, ${t.country}`, residency: t.residency,
    tier: f ? TIER_LABEL[f.tier] : 'Not set yet', version: f?.version ?? 'Not provisioned yet', canary: current?.channel === 'canary',
    seats: t.seats,
    admin: `${t.admin}, ${t.headTitle}`,
    health: healthOf(t),
    lock: readable ? { canRequest: true } : { canRequest: false, why: 'Onboarding: no tender data is held yet' },
    breakGlass: breakGlassVM(breakGlassOf(doneBy[t.key] ?? {})[0]),
  };
}

/* ------------------------------------------------------------ the tiles */

const info = (label: string, i: Omit<InfoVM, 'label'>): InfoVM => ({ label, ...i });

function tiles(rows: TenantRowVM[], log: BreakGlassLogVM[]): TileVM[] {
  const live = rows.filter((r) => r.live);
  const onboarding = rows.filter((r) => !r.live);
  const regions = new Set(live.map((r) => r.residency)).size;

  // PLT-2: every live tenant's connectors.
  const sources = live.flatMap((r) => (isGccTenantKey(r.key) ? gccData(r.key).sources.map((s) => ({ s, tenant: r.short })) : []));
  const healthy = sources.filter((x) => x.s.state === 'healthy').length;
  const notHealthy = sources.filter((x) => x.s.state !== 'healthy');
  const anyDown = notHealthy.some((x) => x.s.state === 'down');
  const STATE_TEXT: Record<Source['state'], string> = { healthy: 'healthy', degraded: 'degraded', 'credentials-expiring': 'credentials expiring', down: 'down' };

  // PLT-3: the slowest tenant's p90.
  const p90s = live.flatMap((r) => {
    const h = r.health.find((x) => x.key === 'intake');
    const p = isGccTenantKey(r.key) ? intakeP90(r.key) : null;
    return h && p !== null ? [{ r, p }] : [];
  });
  const slowest = p90s.reduce<{ r: TenantRowVM; p: number } | null>((a, b) => (!a || b.p > a.p ? b : a), null);

  // PLT-4: agents at the eval target.
  const rates = AGENT_EVALS.map((a) => ({ a, pct: (a.passed / a.golden) * 100 }));
  const atTarget = rates.filter((x) => x.pct >= EVAL_BAND.target).length;
  const lowest = rates.reduce((a, b) => (b.pct < a.pct ? b : a));
  const evalTone: Tone = lowest.pct >= EVAL_BAND.target ? 'green' : lowest.pct >= EVAL_BAND.floor ? 'orange' : 'red';
  const stable = RELEASES.find((r) => r.channel === 'stable');

  // PLT-5: the highest spend against its ceiling.
  const spends = live.flatMap((r) => {
    const s = PLATFORM_FACTS[r.key]?.spendPct;
    return s === undefined ? [] : [{ r, s }];
  });
  const top = spends.reduce<{ r: TenantRowVM; s: number } | null>((a, b) => (!a || b.s > a.s ? b : a), null);
  const near = spends.filter((x) => x.s >= SPEND_WARN_PCT).length;

  // PLT-6: open break-glass across tenants.
  const open = log.filter((l) => l.tone === 'orange');

  return [
    {
      id: 'PLT-1', label: 'Tenants',
      display: `${live.length} live`,
      sub: `${onboarding.length} onboarding · ${regions} residency ${regions === 1 ? 'region' : 'regions'}`,
      info: info('Tenants', {
        means: 'The EPC companies running on the platform, and those being set up. Each tenant’s data stays in its own residency region',
        counted: 'Live tenants, then tenants still onboarding, and the distinct residency regions of the live ones. The full-lifecycle preview tenant is a demo environment and is not counted.',
        period: 'Now', source: 'Tenant records and onboarding steps',
      }),
      drill: null,
    },
    {
      id: 'PLT-2', label: 'Connectors healthy',
      display: `${healthy} of ${sources.length}`,
      sub: notHealthy.length ? notHealthy.map((x) => `${x.tenant}: ${STATE_TEXT[x.s.state]}`).join(' · ') : 'Every portal and mailbox connection is working',
      tone: anyDown ? 'red' : notHealthy.length ? 'orange' : 'green',
      info: info('Connectors healthy', {
        means: 'Whether the portal, mailbox and scan connections across every live tenant are working. A broken source is how a tender gets missed',
        counted: 'Connections reporting Healthy at their last poll ÷ connections configured, over all live tenants. The same records as each tenant’s own “Sources healthy” tile.',
        period: 'Now, at each connection’s last poll', target: 'All healthy (green); any degraded or expiring orange; any down red', source: 'Connector records',
      }),
      drill: null,
    },
    {
      id: 'PLT-3', label: 'Intake p90',
      display: slowest ? `${slowest.p} min` : 'No notices logged',
      sub: slowest ? `Slowest tenant, ${slowest.r.short} · target ${INTAKE_TARGET_MIN} min` : undefined,
      tone: slowest ? intakeTone(slowest.p) : undefined,
      info: info('Intake p90', {
        means: 'How long notices take from arriving to being logged, for the tenant where it is slowest. Each tenant’s own figure is in the tenant list',
        counted: 'For each live tenant, the 90th percentile (nearest rank) of the minutes from receipt to logged over 30 days: the same minutes and rule as that tenant’s “Intake to logged” tile. The highest is shown.',
        period: 'Last 30 days', target: `${INTAKE_TARGET_MIN} min or less (green); up to ${STAGE_BANDS.intakeOrangeMin} min orange`, source: 'Intake timings (minutes only, no tender detail)',
      }),
      drill: null,
    },
    {
      id: 'PLT-4', label: 'Eval pass rate',
      display: `${atTarget} of ${rates.length}`,
      sub: `agents at ${EVAL_BAND.target}%+ · lowest ${pct1(lowest.pct)}, ${lowest.a.agent}`,
      tone: evalTone,
      info: info('Eval pass rate', {
        means: `How each of the ${AGENT_EVALS.length} agents scores against its golden set: known documents with known right answers. A release ships only if every agent clears the floor`,
        counted: `Golden-set cases passed ÷ cases, per agent, on release ${stable?.version ?? ''}. Agents at or above the target are counted; the lowest is named.`,
        period: `Release ${stable?.version ?? ''} (stable)`, target: `${EVAL_BAND.target}% per agent (green); ${EVAL_BAND.floor}% release floor (orange below target, red below floor)`,
        source: `Evaluation runs. ${DEMO_FIGURE}`,
      }),
      drill: null,
    },
    {
      id: 'PLT-5', label: 'Model spend',
      display: top ? `${top.s}%` : 'No spend yet',
      sub: top ? `Highest: ${top.r.short} · ${near} at ${SPEND_WARN_PCT}%+ of ceiling` : undefined,
      tone: top ? spendTone(top.s) : undefined,
      info: info('Model spend', {
        means: 'Model usage against each tenant’s monthly ceiling. At the ceiling the router moves the tenant to the economy tier rather than stop its work',
        counted: 'Spend so far this month as a share of the tenant’s ceiling; the highest tenant is shown, with how many are at the warning level. Shares only: amounts are not shown.',
        period: MONTH_TEXT, target: `Under ${SPEND_WARN_PCT}% (green); ${SPEND_WARN_PCT}% or more orange; at the ceiling red`, source: `Model router. ${DEMO_FIGURE}`,
      }),
      drill: null,
    },
    {
      id: 'PLT-6', label: 'Open break-glass',
      display: String(open.length),
      sub: open.length ? open.map((l) => `${shortOf(l.tenant)}, ${l.when}`).join(' · ') : 'No access requests open',
      tone: open.length ? 'orange' : undefined,
      info: info('Open break-glass', {
        means: 'Requests by Catalyst to look inside one tenant’s data. Each is time-boxed, read only, needs a second approver, and is shown to that tenant’s Head of Tendering, who can revoke it',
        counted: 'Requests not yet revoked, across all tenants. The same records the tenant sees in its audit log.',
        period: 'Now', target: 'None open; any open is orange', source: 'Break-glass records',
      }),
      drill: null,
    },
  ];
}

/* ------------------------------------------------------------ the console */

export function consoleVM({ doneBy, added }: ConsoleInput): ConsoleVM {
  // The Stage 1–3 estate: GCC tenants, live and onboarding. The Indian preview is a demo environment.
  const estate = liveTenants(doneBy[PLATFORM_BUCKET] ?? {}, added).filter((t) => t.world === 'gcc');
  const rows = estate.map((t) => rowOf(t, doneBy));

  const log: BreakGlassLogVM[] = estate
    .flatMap((t) => breakGlassOf(doneBy[t.key] ?? {}).map((r) => ({ t, r })))
    .map(({ t, r }) => ({
      id: `${t.key}.${r.n}`,
      tenant: t.name,
      at: r.at,
      when: stampText(r.at),
      reason: r.reason,
      scope: `Read only · ${r.hours} h`,
      requestedBy: actorName(r.requestedById),
      approver: approverLine(r.approverId),
      status: r.status === 'revoked' && r.revoked ? `Revoked by ${actorName(r.revoked.byId)}, ${stampText(r.revoked.at)}` : 'Requested · awaiting the tenant’s view',
      tone: (r.status === 'revoked' ? 'grey' : 'orange') as Tone,
    }))
    .sort((a, b) => b.at.localeCompare(a.at) || a.tenant.localeCompare(b.tenant));

  const releases: ReleaseVM[] = RELEASES.map((r) => ({
    version: r.version,
    channel: r.channel === 'canary' ? 'Canary' : 'Stable',
    since: dateText(r.since),
    note: r.note,
    tenants: rows.filter((x) => PLATFORM_FACTS[x.key]?.version === r.version).map((x) => x.name),
  }));

  const guarded = rows.filter((r) => r.live && PLATFORM_FACTS[r.key]);
  const zero = () => Object.fromEntries(GUARDRAIL_KINDS.map((k) => [k, 0])) as Record<GuardrailKind, number>;
  const totals = zero();
  const gRows = guarded.map((r) => {
    const counts = PLATFORM_FACTS[r.key].guardrails;
    GUARDRAIL_KINDS.forEach((k) => { totals[k] += counts[k]; });
    return { key: r.key, name: r.name, short: r.short, counts, total: GUARDRAIL_KINDS.reduce((s, k) => s + counts[k], 0) };
  });

  return {
    asOf: `${dateText(DEMO_TODAY)}, ${DEMO_TIME} (demo clock)`,
    tiles: tiles(rows, log),
    tenants: rows,
    releases,
    guardrails: { kinds: GUARDRAIL_KINDS.map((k) => ({ key: k, label: GUARDRAIL_LABEL[k] })), rows: gRows, totals },
    log,
  };
}

/** Every string in a view model, for the dev check's leak scan. */
export function stringsOf(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(stringsOf);
  if (v && typeof v === 'object') return Object.values(v).flatMap(stringsOf);
  return [];
}
