import { DEMO_NOW } from '@/domain/gcc/clock';

/**
 * Demo state for Stage 3 and DG2. Values are JSON strings (except `nudged:`,
 * which is 'yes'), read with `readDone`. Every value carries `at` (demo now
 * unless given) and `byId`. Writers never touch the store: they return
 * `{ key, value, audit }` for the page to pass to `mark()` and `logAudit()`.
 */

export type Done = Record<string, string>;

/** What a page passes to `logAudit`. */
export interface AuditDraft { actorId: string; action: string; target?: string; detail?: string }

export interface Write { key: string; value: string }
export interface WriteResult extends Write { audit: AuditDraft }
export interface WriteError { error: string }

export const isWriteError = (r: object): r is WriteError => 'error' in r;

/** Sun 8 Mar 2026, 10:00 tenant-local. */
export const nowIso = () => DEMO_NOW;

/** A parsed value, or null when missing or not JSON. */
export function readDone<T>(done: Done, key: string): T | null {
  const raw = done[key];
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v !== null && typeof v === 'object' ? (v as T) : null;
  } catch {
    return null;
  }
}

export const toWrite = (key: string, value: object): Write => ({ key, value: JSON.stringify(value) });

/** Keys starting with `prefix`, sorted. */
export const keysWithPrefix = (done: Done, prefix: string) => Object.keys(done).filter((k) => k.startsWith(prefix)).sort();

/** A new done map with the writes applied, for dev checks and previews. */
export const applyWrites = (done: Done, writes: Write[]): Done => writes.reduce((d, w) => ({ ...d, [w.key]: w.value }), done);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "07 Mar 14:10", the pack's time stamp. */
export function stampText(iso: string): string {
  const [date, time] = iso.split('T');
  const [, m, d] = date.split('-');
  return `${d} ${MONTHS[Number(m) - 1]}${time ? ` ${time.slice(0, 5)}` : ''}`;
}

/** "05 Mar", a date without the time. */
export const dayText = (iso: string) => stampText(iso.slice(0, 10));

export const pctText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
