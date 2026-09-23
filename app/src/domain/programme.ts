import { TODAY_ISO } from '@/data/tenders';
import { PROGRAMMES, type ActivityDef } from '@/data/programme';
import type { Project } from '@/data/workspace';

export type ActivityStatus = 'complete' | 'progress' | 'late' | 'planned';

export interface Activity extends ActivityDef {
  code: string;
  days: number;
  status: ActivityStatus;
  milestone: boolean;
  /** Start and finish on the calendar (ISO). */
  start: string;
  finish: string;
}
export interface Group { code: string; name: string; s: number; e: number; months: number; acts: Activity[] }

export interface Programme {
  start: string;
  finish: string;
  forecast: string;
  months: number;
  planned: number;
  progress: number;
  /** Positive when behind the baseline, negative when ahead. */
  slipDays: number;
  /** Today as a fraction of the contract length. */
  today: number;
  groups: Group[];
  lateCount: number;
  critDays: number;
  activityCount: number;
}

const DAY = 86_400_000;
const MONTH_DAYS = 30.44;
const toMs = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => toIso(toMs(iso) + Math.round(n) * DAY);

/**
 * Schedule position of one project. Baseline progress (`planned`) is linear in
 * time, so the contract start is back-dated from today; actual progress is the
 * work frontier. An activity that should be finished or started by the baseline
 * frontier but isn't yet is late.
 */
export function slipFor(p: Pick<Project, 'key' | 'progress'>): number {
  const def = PROGRAMMES[p.key];
  if (!def) return 0;
  return Math.round(((def.planned - p.progress) / 100) * def.months * MONTH_DAYS);
}

/** `rebaselined` lists activity ids whose dates were reset by an approved correction. */
export function programmeFor(p: Pick<Project, 'key' | 'progress'>, rebaselined: string[] = []): Programme | null {
  const def = PROGRAMMES[p.key];
  if (!def) return null;
  const span = def.months * MONTH_DAYS;
  const P = def.planned / 100;
  const A = p.progress / 100;
  const startMs = toMs(TODAY_ISO) - P * span * DAY;
  const at = (f: number) => toIso(startMs + f * span * DAY);

  let lateCount = 0;
  let critDays = 0;
  let activityCount = 0;
  const groups: Group[] = def.groups.map((g) => {
    const acts = g.acts.map<Activity>((a) => {
      const milestone = a.s === a.e;
      let status: ActivityStatus;
      if (a.e <= A && !(milestone && A < 1)) status = 'complete';
      else if (a.s <= A && !milestone) status = a.e <= P ? 'late' : 'progress';
      else status = a.s < P ? 'late' : 'planned';
      const id = `${def.prefix}-${a.id}`;
      if (status === 'late' && rebaselined.includes(id)) status = 'progress';
      if (status === 'late') lateCount++;
      const days = Math.round((a.e - a.s) * span);
      activityCount++;
      return { ...a, id, code: g.code, days, status, milestone, start: at(a.s), finish: at(a.e) };
    });
    const s = Math.min(...g.acts.map((a) => a.s));
    const e = Math.max(...g.acts.map((a) => a.e));
    return { code: g.code, name: g.name, s, e, months: Math.max(1, Math.round((e - s) * def.months)), acts };
  });

  // Critical path length: the calendar span covered by critical activities, overlaps counted once.
  const crit = def.groups.flatMap((g) => g.acts).filter((a) => a.crit && a.e > a.s).map((a) => [a.s, a.e]).sort((x, y) => x[0] - y[0]);
  let covered = 0, reach = 0;
  for (const [s0, e0] of crit) { const from = Math.max(s0, reach); if (e0 > from) { covered += e0 - from; reach = e0; } }
  critDays = Math.round(covered * span);

  const slipDays = slipFor(p);
  const finish = at(1);
  return {
    start: at(0), finish, forecast: addDays(finish, slipDays), months: def.months, planned: def.planned, progress: p.progress,
    slipDays, today: P, groups, lateCount, critDays, activityCount,
  };
}

export function scheduleLabel(slip: number): string {
  if (Math.abs(slip) < 3) return 'On plan';
  return slip > 0 ? `${slip} days late` : `${-slip} days ahead`;
}
