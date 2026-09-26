import type { Tone } from '@/data/types';
import { TENANTS, type CountryCode } from '@/data/tenants';
import { firstWithRole, roleLine, type Person } from '@/data/people';
import { gccData, isGccTenantKey } from '@/data/gcc';
import { stageOf, type StageN } from '@/data/gcc/stages';
import { MIN_N, type RateBand } from '@/data/gcc/targets';
import type { Lifecycle, StageEntry, WorkEvent } from '@/data/gcc/lifecycle';
import { DEMO_TODAY, dateText, workingDaysBetween } from '@/domain/calendar';
import { convert, money } from '@/domain/money';
import { queriesFor } from '../lifecycle.port';
import { currentOf } from '../lifecycle';
import type { ActionPrimary, DrillVM } from '../viewmodels';
import { isScreenBuilt } from '@/pages/gcc/screens';
import { inWindow } from '../period';
import { minutesBetween } from '../clock';
import type { KpiCtx, KpiResult } from './types';

/**
 * Shared helpers for the stage dashboards (plan 013): the stage KPIs
 * (`stage*.kpi.ts`), the stage flows, action sources, step metrics and
 * columns. Not a registry file: the `*.kpi.ts` glob doesn't collect it.
 *
 * Every lifecycle query goes through `queriesFor`, bound to the viewer (so a
 * restricted tender never reaches a count the viewer's table hides) and to the
 * demo state (so demo actions show once plan 021 applies them).
 */

/** The lifecycle queries for this dashboard's viewer and demo state. */
export const qOf = (ctx: Pick<KpiCtx, 'tenant' | 'viewer' | 'done'>) => queriesFor({ tenant: ctx.tenant, viewer: ctx.viewer, done: ctx.done });

export const stageNow = (l: Lifecycle) => currentOf(l).stage;

/** Live tenders whose current stage is `n`, visible to the viewer. */
export const liveIn = (ctx: KpiCtx, n: number): Lifecycle[] => qOf(ctx).live().filter((l) => stageNow(l) === n);

/** The stage of a stage dashboard's scope, or null on another dashboard. */
export const scopeStage = (ctx: KpiCtx): number | null => (ctx.scope.kind === 'stage' ? ctx.scope.stage : null);

/** The step's position in its stage (−1 when unknown), for "at or past this step". */
export function stepIndex(stage: number, step: string): number {
  return stageOf(stage)?.steps.findIndex((s) => s.key === step) ?? -1;
}

export const atOrPast = (l: Lifecycle, stage: number, step: string) => {
  const cur = currentOf(l);
  return cur.stage > stage || (cur.stage === stage && stepIndex(stage, cur.step) >= stepIndex(stage, step));
};

/* ------------------------------------------------------------------ money */

export const ccyOf = (tenant: string) => (isGccTenantKey(tenant) ? gccData(tenant).fit.band.min.ccy : 'SAR');

/** The tender's value in the tenant currency. */
export const valueOf = (tenant: string, l: Lifecycle) => convert(l.value.amount, l.value.ccy, ccyOf(tenant));

export const moneyText = (tenant: string, amount: number) => money(amount, ccyOf(tenant));

/* ------------------------------------------------------------------ numbers */

export const pctOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** One decimal, dropped when whole: 5.6, 90. */
export const round1 = (n: number) => Math.round(n * 10) / 10;

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** Nearest-rank percentile (the seed's INT-2 check uses the same rule). */
export function nearestRank(values: number[], p: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}

export const rateTone = (pct: number, band: RateBand): Tone => (pct >= band.green ? 'green' : pct >= band.orange ? 'orange' : 'red');

/**
 * Tone thresholds from the catalogue (§A) that `data/gcc/targets.ts` doesn't
 * carry yet. They are tenant settings in the product: move them there when
 * plan 010 builds Targets & SLAs.
 */
export const STAGE_BANDS = {
  /** INT-2: p90 intake-to-logged minutes; green at or under 15 (007a's `INTAKE_TARGET_MIN`), orange at or under this. */
  intakeOrangeMin: 20,
  /** INT-5: red once the oldest open field is older than this, in hours. */
  queueOldestRedH: 4,
  /** INT-10: orange when a booklet purchase closes within this many working days. */
  bookletWd: 2,
  /** SRC-2 packages covered and SRC-3 replies on time, in percent. */
  covered: { green: 100, orange: 70 } as RateBand,
  repliesOnTime: { green: 80, orange: 60 } as RateBand,
  /** DEC-1: orange when the first DG2 SLA has less than this many hours left. */
  dg2OrangeH: 6,
  /** RES-3 lessons, CMP-2 evidenced: green only at 100%. */
  full: { green: 100, orange: 0 } as RateBand,
} as const;

/** A rate over fewer than `MIN_N` items shows its counts and a neutral tone (dashboards.md §2). */
export const isSmall = (n: number) => n < MIN_N;

/** "1.5 h", "4 h". */
export const hoursShort = (h: number) => `${round1(h).toLocaleString('en-GB')} h`;

/* ------------------------------------------------------------------ dates */

const DEMO_YEAR = DEMO_TODAY.slice(0, 4);

/** "Thu 12 Mar", with the year only outside the demo year. */
export const dayText = (iso: string) => {
  const d = dateText(iso.slice(0, 10));
  return iso.startsWith(DEMO_YEAR) ? d.replace(/ \d{4}$/, '') : d;
};

/** "Thu 12 Mar, 10:00". */
export const dayTimeText = (iso: string) => (iso.length > 10 ? `${dayText(iso)}, ${iso.slice(11, 16)}` : dayText(iso));

/** The tender's country calendar (its own country, else the tenant's). */
export function ccOf(tenant: string, l: Lifecycle): CountryCode {
  return TENANTS.find((t) => t.country === l.country || t.countryCode === l.country)?.countryCode
    ?? TENANTS.find((t) => t.key === tenant)?.countryCode ?? 'SA';
}

/** Working days from today to `date` on the tender's calendar; negative once past. */
export const wdTo = (tenant: string, l: Lifecycle, date: string) => workingDaysBetween(DEMO_TODAY, date.slice(0, 10), ccOf(tenant, l));

/** "4 working days", "due today", "2 working days late". */
export function wdText(wd: number): string {
  if (wd === 0) return 'due today';
  return wd > 0 ? plural(wd, 'working day') : `${plural(-wd, 'working day')} late`;
}

/** Whole calendar days between two moments. */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b.slice(0, 10)}T00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00Z`)) / 86_400_000);

/* ------------------------------------------------------------------ stage log */

/** Every entry into one step of one stage. */
export const entriesInto = (l: Lifecycle, stage: number, step?: string): StageEntry[] =>
  l.log.filter((e) => e.stage === stage && (!step || e.step === step));

/** When the tender first entered a stage, if it did. */
export const firstInto = (l: Lifecycle, stage: number): string | undefined => l.log.find((e) => e.stage === stage)?.at;

/** Each stay in a step: when it began and when it ended (the next entry, the close, or still open). */
export interface Stay { l: Lifecycle; stage: StageN; step: string; from: string; to: string | null }

export function staysOf(l: Lifecycle): Stay[] {
  return l.log.map((e, i) => ({
    l, stage: e.stage, step: e.step, from: e.at,
    to: l.log[i + 1]?.at ?? l.closedAt ?? null,
  }));
}

/* ------------------------------------------------------------------ drills */

/** The table filtered to these tenders, closed ones included. */
export function idsDrill(label: string, ids: string[], extra: Partial<Extract<DrillVM, { kind: 'table' }>> = {}): DrillVM | null {
  return ids.length ? { kind: 'table', label, ids: [...new Set(ids)], status: 'all', ...extra } : null;
}

/** "From tile: Fields to check · 30 days". */
export const tileLabel = (ctx: KpiCtx, what: string) => `From tile: ${what}${ctx.window.key === 'today' ? ' · Today' : ''}`;

/* ------------------------------------------------------------------ people */

/** The person who owns the stage in this tenant (the Bid Committee has no one person). */
export function stageOwner(tenant: string, n: number): Person | undefined {
  const s = stageOf(n);
  return s && s.ownerRole !== 'member' ? firstWithRole(tenant, s.ownerRole) : undefined;
}

/** `waitingOn` for an action row: set only when the viewer isn't the person it waits on. */
export function waitingOn(viewer: Person, who: Person | undefined): { name: string; role: string } | undefined {
  return who && who.id !== viewer.id ? { name: who.name, role: roleLine(who) } : undefined;
}

/**
 * The primary button of a route action (dashboards.md §4): the exact screen once
 * it is built, "Open tender" until then, so there is never a dead button.
 */
export function openScreen(path: string, label: string, tenderId: string): ActionPrimary {
  return isScreenBuilt(path)
    ? { kind: 'route', label, to: `${path}?tender=${encodeURIComponent(tenderId)}` }
    : { kind: 'route', label: 'Open tender', to: `/tenders/${encodeURIComponent(tenderId)}` };
}

/** "Open tender" for Stages 4–9, which have no working screens by design (dashboards.md DB-10). */
export const openTender = (tenderId: string): ActionPrimary => ({ kind: 'route', label: 'Open tender', to: `/tenders/${encodeURIComponent(tenderId)}` });

/**
 * An action row's urgency (dashboards.md §1 Z4), on the same scale as plan
 * 015's portfolio sources so rows from both sort together: hard blocks and
 * breached limits first, then the rest; within each, the least time left
 * first. Lower sorts first.
 */
export function urgency(blocking: boolean, minutesLeft: number): number {
  return (blocking ? 0 : 1e13) + Math.min(9.9e7, Math.max(0, minutesLeft + 1e6));
}

/** Minutes from the demo clock to a date (its end of working day, 17:00) or a date-time. */
export const minsTo = (ctx: Pick<KpiCtx, 'now'>, iso: string) => minutesBetween(ctx.now, iso.length > 10 ? iso : `${iso}T17:00`);

/* ------------------------------------------------------------------ rates */

/**
 * Work events of a kind due in the window, done by their due date or not. Ones
 * due today and not yet held are still in time, so they aren't counted yet.
 */
export function dueInWindow(ctx: KpiCtx, kind: 'm2' | 'review') {
  return qOf(ctx).all().flatMap((l) => l.events
    .filter((e): e is Extract<WorkEvent, { kind: 'm2' | 'review' }> => e.kind === kind && inWindow(e.due, ctx.window))
    .filter((e) => !!e.at || e.due < DEMO_TODAY)
    .map((e) => ({ l, e, onTime: !!e.at && e.at.slice(0, 10) <= e.due })));
}

/** A rate of things done by their date: the counts first with fewer than five (dashboards.md §2). */
export function onTimeRate(list: { onTime: boolean }[], none: string, band: { green: number; orange: number }, what: string): KpiResult {
  if (!list.length) return { display: none };
  const on = list.filter((x) => x.onTime).length;
  const pct = pctOf(on, list.length);
  const small = isSmall(list.length);
  return {
    display: `${pct}%`, sub: `${on} of ${list.length} ${what}`, n: list.length,
    ...(small ? { smallSample: true } : { tone: rateTone(pct, band) }),
  };
}

/** Re-plans or re-prices in the window, with the p90 turnaround against its target. */
export function turnaround(ctx: KpiCtx, kind: 'replan' | 'reprice', target: number, noun: string): KpiResult {
  const list = qOf(ctx).workEventsIn(ctx.window, kind);
  if (!list.length) return { display: `No ${noun}s in this period` };
  const p90 = nearestRank(list.map((x) => x.e.turnaroundH), 90)!;
  return { display: String(list.length), sub: `p90 ${hoursShort(p90)} vs ${hoursShort(target)}`, tone: p90 <= target ? 'green' : 'orange', n: list.length };
}
