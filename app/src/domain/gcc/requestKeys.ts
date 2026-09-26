/**
 * Requests from one person to another (s1-s3-demo-spec §5.5, "Nudge and
 * notify"). `RequestButton` (plan 019) writes them through `mark()`; My requests
 * (plan 013) reads them. One place builds and parses the key, so the two agree.
 *
 * Key:   `request:{tenderId}:{toId}:{topic}`, e.g. `request:T-2026-097:najd.fin:bond-headroom`.
 * Value: JSON `RequestValue`. Reset demo clears it with the rest of the tenant's `done`.
 */

type Done = Record<string, string>;

export interface RequestValue {
  /** What is asked, in one line: "Confirm bond headroom for the Bid / No-Bid pack". */
  what: string;
  /** Where the answer goes: "Bid pack · 9.5 Financial exposure". */
  section?: string;
  /** When it is due, `YYYY-MM-DDTHH:MM` tenant local. The caller works it out on the tenant's calendar. */
  due: string;
  /** When it was requested, `YYYY-MM-DDTHH:MM` tenant local (the demo clock). */
  at: string;
  /** Who asked (person id). */
  byId: string;
}

export interface RequestRecord extends RequestValue {
  key: string;
  tenderId: string;
  toId: string;
  topic: string;
}

const PREFIX = 'request:';

export const requestKey = (tenderId: string, toId: string, topic: string) => `${PREFIX}${tenderId}:${toId}:${topic}`;

/** The pair to hand to `mark(key, msg, tone, value)`. */
export const requestWrite = (tenderId: string, toId: string, topic: string, v: RequestValue) =>
  ({ key: requestKey(tenderId, toId, topic), value: JSON.stringify(v) });

function parse(key: string, raw: string): RequestRecord | null {
  const [tenderId, toId, ...rest] = key.slice(PREFIX.length).split(':');
  const topic = rest.join(':');
  if (!tenderId || !toId || !topic) return null;
  try {
    const v = JSON.parse(raw) as Partial<RequestValue>;
    if (typeof v.what !== 'string' || typeof v.due !== 'string' || typeof v.at !== 'string' || typeof v.byId !== 'string') return null;
    return { what: v.what, section: v.section, due: v.due, at: v.at, byId: v.byId, key, tenderId, toId, topic };
  } catch {
    return null;
  }
}

/** Every request in `done`, oldest first. */
export function requestsIn(done: Done): RequestRecord[] {
  return Object.entries(done)
    .filter(([k]) => k.startsWith(PREFIX))
    .map(([k, v]) => parse(k, v))
    .filter((r): r is RequestRecord => r !== null)
    .sort((a, b) => a.at.localeCompare(b.at) || a.key.localeCompare(b.key));
}

/** The requests waiting on one person. */
export const requestsTo = (done: Done, toId: string) => requestsIn(done).filter((r) => r.toId === toId);

/** One request, or null when it hasn't been made. */
export function requestFor(done: Done, tenderId: string, toId: string, topic: string): RequestRecord | null {
  const key = requestKey(tenderId, toId, topic);
  return done[key] ? parse(key, done[key]) : null;
}
