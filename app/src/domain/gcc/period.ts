import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TENANTS } from '@/data/tenants';
import { DEMO_TIME, DEMO_TODAY, addDays, dateText, rangeText } from '@/domain/calendar';
import { useTenantKey } from '@/domain/tenancy';

/**
 * The period filter's one copy of the rules (dashboards.md §2). Each window is
 * the last N calendar days including today, ending at the demo clock (Sun 8 Mar
 * 2026, 10:00 tenant time). The previous window is the N days before it; for
 * Today it is yesterday, same hours. Nothing else computes dates for periods.
 *
 * Times are tenant-local ISO date-times, `YYYY-MM-DDTHH:MM`, like the rest of
 * the GCC data, so the same window holds in every tenant's time zone.
 */

export type PeriodKey = 'today' | '7d' | '30d' | '90d' | '12m';

export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '12m', label: '12 months', days: 365 },
];

export const DEFAULT_PERIOD: PeriodKey = '30d';

export const isPeriodKey = (v: unknown): v is PeriodKey => PERIODS.some((p) => p.key === v);

export interface PeriodWindow {
  key: PeriodKey;
  /** First minute in the window, inclusive. */
  from: string;
  /** Last minute in the window, inclusive. */
  to: string;
  /** "30 days", or "Previous 30 days" for a previous window. */
  label: string;
  /** "Sat 7 Feb – Sun 8 Mar 2026", or "Sun 8 Mar 2026, 00:00–10:00 AST" for Today. */
  rangeText: string;
  /** Where the window starts, for "since …": "Sat 7 Feb", "Tue 9 Dec 2025", or "00:00" for Today. */
  startText: string;
  /** Days covered: 1 for Today. */
  days: number;
}

const DEMO_YEAR = DEMO_TODAY.slice(0, 4);

/** "Sat 7 Feb", with the year only when it is not the demo year. */
function shortDate(iso: string): string {
  const full = dateText(iso);
  return iso.startsWith(DEMO_YEAR) ? full.replace(/ \d{4}$/, '') : full;
}

const tzOf = (tenant: string) => TENANTS.find((t) => t.key === tenant)?.tzLabel;

const periodOf = (key: PeriodKey) => PERIODS.find((p) => p.key === key)!;

/** The window for a period, ending at the demo clock. */
export function windowOf(key: PeriodKey, tenant: string): PeriodWindow {
  const p = periodOf(key);
  const tz = tzOf(tenant);
  if (key === 'today') {
    return {
      key, from: `${DEMO_TODAY}T00:00`, to: `${DEMO_TODAY}T${DEMO_TIME}`, label: p.label, days: 1,
      rangeText: `${dateText(DEMO_TODAY)}, 00:00–${DEMO_TIME}${tz ? ` ${tz}` : ''}`, startText: '00:00',
    };
  }
  const fromDay = addDays(DEMO_TODAY, -(p.days - 1));
  return {
    key, from: `${fromDay}T00:00`, to: `${DEMO_TODAY}T${DEMO_TIME}`, label: p.label, days: p.days,
    rangeText: rangeText(fromDay, DEMO_TODAY), startText: shortDate(fromDay),
  };
}

/** The window before: the same number of days, or for Today the same hours yesterday. */
export function previousOf(w: PeriodWindow): PeriodWindow {
  const fromDay = w.from.slice(0, 10);
  const label = `Previous ${w.label === 'Today' ? 'day' : w.label}`;
  if (w.key === 'today') {
    const day = addDays(fromDay, -1);
    const hours = w.rangeText.slice(w.rangeText.indexOf(', ') + 2);
    return { ...w, from: `${day}T00:00`, to: `${day}T${w.to.slice(11)}`, label, rangeText: `${dateText(day)}, ${hours}`, startText: `00:00 on ${shortDate(day)}` };
  }
  const toDay = addDays(fromDay, -1);
  const startDay = addDays(toDay, -(w.days - 1));
  return { ...w, from: `${startDay}T00:00`, to: `${toDay}T23:59`, label, rangeText: rangeText(startDay, toDay), startText: shortDate(startDay) };
}

/** A date (`YYYY-MM-DD`, taken as its first minute) or date-time, as minutes-precision ISO. */
const norm = (iso: string) => (iso.length <= 10 ? `${iso}T00:00` : iso.slice(0, 16));

/** True when the moment falls in the window, both ends included. */
export function inWindow(iso: string | null | undefined, w: Pick<PeriodWindow, 'from' | 'to'>): boolean {
  if (!iso) return false;
  const t = norm(iso);
  return t >= w.from && t <= w.to;
}

/* ------------------------------------------------------------------- the hook */

const STORE_KEY = 'ctai.period';

function readStored(): PeriodKey | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return isPeriodKey(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * The period for the current page: `?period=` in the URL, so a drill-down keeps
 * it; else the viewer's last choice (`ctai.period`); else 30 days.
 */
export function usePeriod() {
  const [params, setParams] = useSearchParams();
  const tenant = useTenantKey();
  const raw = params.get('period');
  const key: PeriodKey = isPeriodKey(raw) ? raw : readStored() ?? DEFAULT_PERIOD;
  const window = useMemo(() => windowOf(key, tenant), [key, tenant]);
  const prev = useMemo(() => previousOf(window), [window]);
  const setPeriod = useCallback((k: PeriodKey) => {
    try { localStorage.setItem(STORE_KEY, k); } catch { /* the URL still carries it */ }
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('period', k);
      return next;
    }, { replace: true });
  }, [setParams]);
  return { key, window, prev, setPeriod };
}
